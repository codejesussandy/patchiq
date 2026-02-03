import { prisma } from '@/db/client';
import { NotFoundError } from '@shared/errors';
import type { ListNotificationsQuery } from './notifications.validators';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationsService {
  async getNotifications(userId: string, params: ListNotificationsQuery) {
    const where: Record<string, unknown> = { userId };

    if (params.type) {
      where.type = params.type;
    }

    if (params.read !== undefined) {
      where.read = params.read;
    }

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
    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type || 'info',
        link: input.link,
        metadata: input.metadata as object | undefined,
      },
    });
  }

  /**
   * Broadcast a notification to all admin users.
   * Used for system-wide events (alerts, new agents, etc.).
   */
  async broadcast(input: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: 'admin', isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: input.title,
        message: input.message,
        type: input.type || 'info',
        link: input.link,
        metadata: input.metadata as object | undefined,
      })),
    });
  }
}

export const notificationsService = new NotificationsService();
