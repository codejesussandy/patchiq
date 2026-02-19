import { prisma } from '@db/client';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import type { AuditLogResponse, AuditLogFilterOptions, PaginatedResponse } from './settings.types';
import type { AuditLogQueryInput } from './settings.validators';

// ============================================
// Audit Logs
// ============================================

export function transformAuditLog(log: {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  user: { email: string } | null;
}): AuditLogResponse {
  return {
    id: log.id,
    userId: log.userId,
    userEmail: log.user?.email ?? null,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    details: log.details as Record<string, unknown> | null,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    timestamp: log.timestamp.toISOString(),
  };
}

export async function listAuditLogs(params: AuditLogQueryInput): Promise<PaginatedResponse<AuditLogResponse>> {
  const where: Record<string, unknown> = {};

  if (params.action) {
    where.action = params.action;
  }
  if (params.resource) {
    where.resource = params.resource;
  }
  if (params.userId) {
    where.userId = params.userId;
  }
  if (params.startDate || params.endDate) {
    where.timestamp = {};
    if (params.startDate) {
      (where.timestamp as Record<string, unknown>).gte = new Date(params.startDate);
    }
    if (params.endDate) {
      (where.timestamp as Record<string, unknown>).lte = new Date(params.endDate);
    }
  }
  if (params.search) {
    where.OR = [
      { action: { contains: params.search, mode: 'insensitive' } },
      { resource: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { email: true } },
      },
      orderBy: { timestamp: 'desc' },
      ...getPaginationParams(params),
    }),
    prisma.auditLog.count({ where }),
  ]);

  const data = logs.map((l) => transformAuditLog(l));
  return paginate(data, total, params);
}

export async function getAuditLogFilters(): Promise<AuditLogFilterOptions> {
  const [actions, resources, users] = await Promise.all([
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
    }),
    prisma.auditLog.findMany({
      select: { resource: true },
      distinct: ['resource'],
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    }),
  ]);

  return {
    actions: actions.map(a => a.action),
    resources: resources.map(r => r.resource),
    users,
  };
}
