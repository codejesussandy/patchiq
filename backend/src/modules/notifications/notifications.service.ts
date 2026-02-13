import { NotFoundError } from '@shared/errors';
import { prisma } from '@/db/client';
import type { ListNotificationsQuery, NotificationHistoryQuery } from './notifications.validators';

export type NotificationCategory = 'AGENT' | 'DEPLOYMENT' | 'VULNERABILITY' | 'ALERT' | 'SYSTEM';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  category?: NotificationCategory;
  link?: string;
  metadata?: Record<string, unknown>;
  dedupKey?: string;
}

// ============================================
// Duplicate Prevention (in-memory TTL map)
// ============================================

const recentNotifications = new Map<string, number>();
const DEDUP_TTL_MS = 60_000; // 1 minute

function isDuplicate(key: string): boolean {
  const now = Date.now();
  // Cleanup expired entries when map grows large
  if (recentNotifications.size > 500) {
    for (const [k, exp] of recentNotifications) {
      if (exp < now) recentNotifications.delete(k);
    }
  }
  const expiry = recentNotifications.get(key);
  if (expiry && expiry > now) return true;
  recentNotifications.set(key, now + DEDUP_TTL_MS);
  return false;
}

// ============================================
// SSE + Email hooks (lazy-loaded to avoid circular deps)
// ============================================

let sseManager: { send: (userId: string, data: Record<string, unknown>) => void; broadcast: (data: Record<string, unknown>, userIds?: string[]) => void } | null = null;
let maybeSendEmail: ((userId: string, notification: { title: string; message: string; type: string; category: string; link?: string }) => Promise<void>) | null = null;

export function setSseManager(mgr: typeof sseManager) {
  sseManager = mgr;
}

export function setEmailSender(fn: typeof maybeSendEmail) {
  maybeSendEmail = fn;
}

// ============================================
// Notifications Service
// ============================================

export class NotificationsService {
  /**
   * Get default email preference for a given category when no preference record exists.
   * Defaults: VULNERABILITY and ALERT have email=true, others have email=false.
   */
  private getDefaultEmailEnabled(category: NotificationCategory): boolean {
    return category === 'VULNERABILITY' || category === 'ALERT';
  }

  async getNotifications(userId: string, params: ListNotificationsQuery) {
    const where: Record<string, unknown> = { userId };

    if (params.type) where.type = params.type;
    if (params.category) where.category = params.category;
    if (params.read !== undefined) where.read = params.read;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: (params.page - 1) * params.limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        category: true,
        read: true,
        link: true,
        createdAt: true,
      },
    });

    return notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async clearAll(userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { userId },
    });
  }

  /**
   * Create a notification for a specific user.
   * Used internally by other services.
   */
  async create(input: CreateNotificationInput): Promise<void> {
    // Dedup check
    if (input.dedupKey && isDuplicate(input.dedupKey)) {
      return;
    }

    const category = input.category || 'SYSTEM';

    // Check in-app preference
    const pref = await prisma.notificationPreference.findUnique({ where: { userId: input.userId } });
    const inAppKey = `${category}InApp` as keyof typeof pref;
    const emailKey = `${category}Email` as keyof typeof pref;
    const inAppEnabled = pref ? (pref[inAppKey] as boolean) !== false : true;
    const emailEnabled = pref ? (pref[emailKey] as boolean) !== false : this.getDefaultEmailEnabled(category);

    if (inAppEnabled) {
      const notification = await prisma.notification.create({
        data: {
          userId: input.userId,
          title: input.title,
          message: input.message,
          type: input.type || 'INFO',
          category,
          link: input.link,
          metadata: input.metadata as object | undefined,
        },
      });

      // Push via SSE
      if (sseManager) {
        sseManager.send(input.userId, {
          type: 'notification',
          notification: {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            category: notification.category,
            read: false,
            link: notification.link,
            createdAt: notification.createdAt.toISOString(),
          },
        });
      }
    }

    // Send email (fire-and-forget) — only if user has email enabled for this category
    if (emailEnabled && maybeSendEmail) {
      maybeSendEmail(input.userId, {
        title: input.title,
        message: input.message,
        type: input.type || 'INFO',
        category,
        link: input.link,
      }).catch(() => {});
    }
  }

  /**
   * Broadcast a notification to all admin users.
   * Used for system-wide events (alerts, new agents, etc.).
   */
  async broadcast(input: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
    // Dedup check
    if (input.dedupKey && isDuplicate(input.dedupKey)) {
      return;
    }

    // Get all users with admin role
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (!adminRole) return;

    const admins = await prisma.user.findMany({
      where: { role: { id: adminRole.id }, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (admins.length === 0) return;

    const category = input.category || 'SYSTEM';

    // Get all admin preferences to filter in-app notifications
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: { in: admins.map((a) => a.id) } },
    });
    const prefMap = new Map(preferences.map((p) => [p.userId, p]));

    // Filter admins based on in-app preference
    const inAppKey = `${category}InApp` as keyof (typeof preferences)[0];
    const adminsWithInApp = admins.filter((admin) => {
      const pref = prefMap.get(admin.id);
      return pref ? (pref[inAppKey] as boolean) !== false : true;
    });

    if (adminsWithInApp.length > 0) {
      await prisma.notification.createMany({
        data: adminsWithInApp.map((admin) => ({
          userId: admin.id,
          title: input.title,
          message: input.message,
          type: input.type || 'INFO',
          category,
          link: input.link,
          metadata: input.metadata as object | undefined,
        })),
      });

      // Push via SSE to admins with in-app enabled
      const adminIds = adminsWithInApp.map((a) => a.id);
      if (sseManager) {
        sseManager.broadcast(
          {
            type: 'notification',
            notification: {
              title: input.title,
              message: input.message,
              type: input.type || 'INFO',
              category,
              link: input.link,
            },
          },
          adminIds,
        );
      }
    }

    // Send email to each admin who has email enabled (fire-and-forget)
    if (maybeSendEmail) {
      const emailKey = `${category}Email` as keyof (typeof preferences)[0];
      const defaultEmailEnabled = this.getDefaultEmailEnabled(category);

      for (const admin of admins) {
        const pref = prefMap.get(admin.id);
        const emailEnabled = pref ? (pref[emailKey] as boolean) !== false : defaultEmailEnabled;

        if (emailEnabled) {
          maybeSendEmail(admin.id, {
            title: input.title,
            message: input.message,
            type: input.type || 'INFO',
            category,
            link: input.link,
          }).catch(() => {});
        }
      }
    }
  }

  // ============================================
  // History + Bulk Operations
  // ============================================

  async getHistory(userId: string, params: NotificationHistoryQuery) {
    const where: Record<string, unknown> = { userId };

    if (params.type) where.type = params.type;
    if (params.category) where.category = params.category;
    if (params.read !== undefined) where.read = params.read;

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { message: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.dateFrom || params.dateTo) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (params.dateFrom) dateFilter.gte = new Date(params.dateFrom);
      if (params.dateTo) dateFilter.lte = new Date(params.dateTo);
      where.createdAt = dateFilter;
    }

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' },
        take: params.limit,
        skip: (params.page - 1) * params.limit,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          category: true,
          read: true,
          link: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: data.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async bulkMarkAsRead(userId: string, ids: string[]): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { read: true },
    });
  }

  async bulkDelete(userId: string, ids: string[]): Promise<void> {
    await prisma.notification.deleteMany({
      where: { id: { in: ids }, userId },
    });
  }

  // ============================================
  // Preferences
  // ============================================

  async getPreferences(userId: string) {
    const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) {
      return {
        agentInApp: existing.agentInApp,
        agentEmail: existing.agentEmail,
        deploymentInApp: existing.deploymentInApp,
        deploymentEmail: existing.deploymentEmail,
        vulnerabilityInApp: existing.vulnerabilityInApp,
        vulnerabilityEmail: existing.vulnerabilityEmail,
        alertInApp: existing.alertInApp,
        alertEmail: existing.alertEmail,
        systemInApp: existing.systemInApp,
        systemEmail: existing.systemEmail,
      };
    }
    // Return defaults
    return {
      agentInApp: true,
      agentEmail: false,
      deploymentInApp: true,
      deploymentEmail: false,
      vulnerabilityInApp: true,
      vulnerabilityEmail: true,
      alertInApp: true,
      alertEmail: true,
      systemInApp: true,
      systemEmail: false,
    };
  }

  async updatePreferences(userId: string, input: Record<string, boolean>): Promise<void> {
    await prisma.notificationPreference.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
    });
  }
}

export const notificationsService = new NotificationsService();
