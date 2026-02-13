import { prisma } from '@/db/client';
import { BadRequestError, NotFoundError } from '@shared/errors';
import type { ListAlertsQuery } from './alerts.validators';

export class AlertsService {
  async listAlerts(query: ListAlertsQuery) {
    const where: Record<string, unknown> = {};

    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;
    if (query.module) where.module = query.module;
    if (query.assetId) where.assetId = query.assetId;
    if (query.alertConfigId) where.alertConfigId = query.alertConfigId;

    if (query.search) {
      where.OR = [
        { alert: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
      if (query.dateTo) dateFilter.lte = new Date(query.dateTo);
      where.createdAt = dateFilter;
    }

    const [data, total] = await Promise.all([
      prisma.assetAlert.findMany({
        where,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
        include: {
          asset: { select: { id: true, name: true, hostname: true } },
          acknowledger: { select: { id: true, email: true, name: true } },
          resolver: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.assetAlert.count({ where }),
    ]);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getAlert(id: string) {
    const alert = await prisma.assetAlert.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, name: true, hostname: true, ipAddress: true, os: true } },
        acknowledger: { select: { id: true, email: true, name: true } },
        resolver: { select: { id: true, email: true, name: true } },
      },
    });

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    return alert;
  }

  async acknowledgeAlert(id: string, userId: string, note?: string) {
    const alert = await prisma.assetAlert.findUnique({ where: { id } });

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    if (alert.status === 'Resolved') {
      throw new BadRequestError('Cannot acknowledge a resolved alert');
    }

    if (alert.status === 'Acknowledged') {
      throw new BadRequestError('Alert is already acknowledged');
    }

    return prisma.assetAlert.update({
      where: { id },
      data: {
        status: 'Acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        acknowledgNote: note || null,
      },
    });
  }

  async resolveAlert(id: string, userId: string, resolution: string) {
    const alert = await prisma.assetAlert.findUnique({ where: { id } });

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    if (alert.status === 'Resolved') {
      throw new BadRequestError('Alert is already resolved');
    }

    return prisma.assetAlert.update({
      where: { id },
      data: {
        status: 'Resolved',
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolutionNote: resolution,
      },
    });
  }

  async bulkAcknowledge(ids: string[], userId: string) {
    // Filter out already-acknowledged or resolved alerts
    const alerts = await prisma.assetAlert.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });

    const toAcknowledge = alerts
      .filter((a) => a.status === 'Open')
      .map((a) => a.id);

    if (toAcknowledge.length === 0) {
      return { acknowledged: 0, skipped: ids.length };
    }

    await prisma.assetAlert.updateMany({
      where: { id: { in: toAcknowledge } },
      data: {
        status: 'Acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });

    return {
      acknowledged: toAcknowledge.length,
      skipped: ids.length - toAcknowledge.length,
    };
  }

  async bulkDelete(ids: string[]) {
    // Only allow deleting resolved alerts
    const alerts = await prisma.assetAlert.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });

    const nonResolved = alerts.filter((a) => a.status !== 'Resolved');
    if (nonResolved.length > 0) {
      throw new BadRequestError('Cannot delete non-resolved alerts');
    }

    const resolvedIds = alerts.map((a) => a.id);
    if (resolvedIds.length === 0) {
      return { deleted: 0 };
    }

    await prisma.assetAlert.deleteMany({
      where: { id: { in: resolvedIds } },
    });

    return { deleted: resolvedIds.length };
  }
}

export const alertsService = new AlertsService();
