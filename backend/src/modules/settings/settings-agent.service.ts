import crypto from 'crypto';
import { prisma } from '@db/client';
import { NotFoundError, BadRequestError, UnauthorizedError } from '@shared/errors';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import type { AgentApprovalResponse, PaginatedResponse } from './settings.types';

// ============================================
// Agent Config
// ============================================

export async function getAgentConfig(): Promise<Record<string, unknown>> {
  const settings = await prisma.setting.findMany({
    where: { category: 'agent' },
  });

  const defaults: Record<string, unknown> = {
    allowedBandwidth: 100,
    agentRefreshCycle: 300,
    systemActionRefreshCycle: 300,
    endpointVlanRefreshCycle: 600,
    patchScanningRefreshCycle: 3600,
    softwareRefreshCycle: 3600,
    hardwareRefreshCycle: 3600,
    systemProcessRefreshCycle: 600,
    systemServiceRefreshCycle: 600,
    networkRefreshCycle: 600,
    networkSharesRefreshCycle: 3600,
    riskDetectionRefreshCycle: 7200,
  };

  const result = { ...defaults };
  for (const setting of settings) {
    const key = setting.key.replace('agent.', '');
    result[key] = setting.value;
  }

  return result;
}

export async function updateAgentConfig(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const updates = Object.entries(input).filter(([_key, value]) => value !== undefined);

  for (const [key, value] of updates) {
    await prisma.setting.upsert({
      where: { key: `agent.${key}` },
      update: { value: JSON.parse(JSON.stringify(value)) },
      create: { key: `agent.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'agent' },
    });
  }

  // Queue config_update command for all connected agents so they pick up the new settings
  const connectedAgents = await prisma.agent.findMany({
    where: { status: { in: ['CONNECTED', 'Online'] } },
    select: { id: true },
  });

  if (connectedAgents.length > 0) {
    await prisma.agentCommand.createMany({
      data: connectedAgents.map((agent) => ({
        agentId: agent.id,
        type: 'config_update',
        payload: {},
        status: 'PENDING',
      })),
    });
  }

  return getAgentConfig();
}

export async function resetAgentConfig(): Promise<Record<string, unknown>> {
  await prisma.setting.deleteMany({ where: { category: 'agent' } });
  return getAgentConfig();
}

// ============================================
// Agent Approvals
// ============================================

export async function listAgentApprovals(params: { page: number; limit: number; search?: string }): Promise<PaginatedResponse<AgentApprovalResponse>> {
  const where: Record<string, unknown> = {
    status: 'PENDING_APPROVAL',
  };

  if (params.search) {
    where.OR = [
      { hostname: { contains: params.search, mode: 'insensitive' } },
      { name: { contains: params.search, mode: 'insensitive' } },
      { machineId: { contains: params.search, mode: 'insensitive' } },
      { ipAddress: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const paginationParams = { page: params.page, limit: params.limit };

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams(paginationParams),
    }),
    prisma.agent.count({ where }),
  ]);

  const data: AgentApprovalResponse[] = agents.map((agent) => ({
    id: agent.id,
    uuid: agent.machineId,
    hostName: agent.hostname,
    ipAddresses: agent.ipAddress || '',
    createdOn: agent.createdAt.toISOString(),
    performedBy: null,
    status: agent.status as 'Approved' | 'Pending' | 'Rejected',
  }));

  return paginate(data, total, paginationParams);
}

export async function approveAgent(id: string) {
  const agent = await prisma.agent.findUnique({
    where: { id },
  });

  if (!agent) {
    throw new NotFoundError('Agent not found');
  }

  if (agent.status !== 'PENDING_APPROVAL') {
    throw new BadRequestError(`Agent is already ${agent.status.toLowerCase()}`);
  }

  const updated = await prisma.agent.update({
    where: { id },
    data: { status: 'CONNECTED' },
  });

  return {
    id: updated.id,
    machineId: updated.machineId,
    hostname: updated.hostname,
    status: updated.status,
    message: 'Agent approved successfully',
  };
}

export async function rejectAgent(id: string) {
  const agent = await prisma.agent.findUnique({
    where: { id },
  });

  if (!agent) {
    throw new NotFoundError('Agent not found');
  }

  if (agent.status === 'REJECTED') {
    throw new BadRequestError('Agent is already rejected');
  }

  const updated = await prisma.agent.update({
    where: { id },
    data: { status: 'REJECTED' },
  });

  return {
    id: updated.id,
    machineId: updated.machineId,
    hostname: updated.hostname,
    status: updated.status,
    message: 'Agent rejected successfully',
  };
}

// ============================================
// Agent Approval Settings
// ============================================

export async function getAgentApprovalSettings() {
  const setting = await prisma.setting.findUnique({ where: { key: 'agent-approval-settings' } });
  if (!setting) {
    return { approvalType: 'MANUAL', autoApprovalBasedOn: 'ALL', criteria: {} };
  }
  const val = setting.value as Record<string, unknown>;
  const result = { approvalType: (val.approvalType as string) || 'MANUAL', autoApprovalBasedOn: (val.autoApprovalBasedOn as string) || 'ALL', criteria: val.criteria || {} };
  return result;
}

export async function updateAgentApprovalSettings(data: Record<string, unknown>) {
  const current = await getAgentApprovalSettings();
  const merged = { ...current, ...data };
  await prisma.setting.upsert({
    where: { key: 'agent-approval-settings' },
    update: { value: merged },
    create: { key: 'agent-approval-settings', value: merged, category: 'agent' },
  });
  return merged;
}

// ============================================
// Enroll Secrets
// ============================================

export async function createEnrollSecret(data: { name: string; organizationId?: string; departmentId?: string; expiresAt?: string | null; maxUses?: number | null }, userId: string) {
  const secret = crypto.randomBytes(32).toString('hex');
  const record = await prisma.enrollSecret.create({
    data: {
      name: data.name, secret,
      organizationId: data.organizationId || null,
      departmentId: data.departmentId || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      maxUses: data.maxUses ?? null, createdBy: userId,
    },
    include: { organization: true, department: true },
  });
  return {
    id: record.id, name: record.name, secret: record.secret,
    organizationId: record.organizationId, organization: record.organization?.name || null,
    departmentId: record.departmentId, department: record.department?.name || null,
    expiresAt: record.expiresAt?.toISOString() || null,
    maxUses: record.maxUses, usedCount: record.usedCount, isActive: record.isActive,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listEnrollSecrets() {
  const records = await prisma.enrollSecret.findMany({
    include: { organization: true, department: true },
    orderBy: { createdAt: 'desc' },
  });
  return records.map(r => ({
    id: r.id, name: r.name, secret: r.secret.substring(0, 8) + '...',
    organizationId: r.organizationId, organization: r.organization?.name || null,
    departmentId: r.departmentId, department: r.department?.name || null,
    expiresAt: r.expiresAt?.toISOString() || null,
    maxUses: r.maxUses, usedCount: r.usedCount, isActive: r.isActive,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getEnrollSecret(id: string) {
  const r = await prisma.enrollSecret.findUnique({ where: { id }, include: { organization: true, department: true } });
  if (!r) throw new NotFoundError('Enrollment secret not found');
  return {
    id: r.id, name: r.name, secret: r.secret.substring(0, 8) + '...',
    organizationId: r.organizationId, organization: r.organization?.name || null,
    departmentId: r.departmentId, department: r.department?.name || null,
    expiresAt: r.expiresAt?.toISOString() || null,
    maxUses: r.maxUses, usedCount: r.usedCount, isActive: r.isActive,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  };
}

export async function updateEnrollSecret(id: string, data: Record<string, unknown>) {
  const existing = await prisma.enrollSecret.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Enrollment secret not found');
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;
  if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
  if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt as string) : null;
  if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  const r = await prisma.enrollSecret.update({ where: { id }, data: updateData, include: { organization: true, department: true } });
  return {
    id: r.id, name: r.name, secret: r.secret.substring(0, 8) + '...',
    organizationId: r.organizationId, organization: r.organization?.name || null,
    departmentId: r.departmentId, department: r.department?.name || null,
    expiresAt: r.expiresAt?.toISOString() || null,
    maxUses: r.maxUses, usedCount: r.usedCount, isActive: r.isActive,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  };
}

export async function deleteEnrollSecret(id: string) {
  const existing = await prisma.enrollSecret.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Enrollment secret not found');
  await prisma.enrollSecret.delete({ where: { id } });
  return { message: 'Enrollment secret deleted' };
}

export async function validateEnrollSecret(secretValue: string | undefined): Promise<{ id: string; organizationId: string | null; departmentId: string | null; maxUses: number | null; usedCount: number } | null> {
  const activeCount = await prisma.enrollSecret.count({ where: { isActive: true } });

  if (activeCount === 0) {
    if (!secretValue) {
      return null;
    }
    return null;
  }
  if (!secretValue) {
    throw new UnauthorizedError('Enrollment secret required');
  }
  const secret = await prisma.enrollSecret.findUnique({ where: { secret: secretValue } });
  if (!secret) throw new UnauthorizedError('Invalid enrollment secret');
  if (!secret.isActive) throw new UnauthorizedError('Enrollment secret is inactive');
  if (secret.expiresAt && secret.expiresAt < new Date()) throw new UnauthorizedError('Enrollment secret has expired');
  if (secret.maxUses !== null && secret.usedCount >= secret.maxUses) throw new UnauthorizedError('Enrollment secret usage limit reached');
  return { id: secret.id, organizationId: secret.organizationId, departmentId: secret.departmentId, maxUses: secret.maxUses, usedCount: secret.usedCount };
}

export async function incrementEnrollSecretUsage(secretId: string): Promise<void> {
  await prisma.enrollSecret.update({ where: { id: secretId }, data: { usedCount: { increment: 1 } } });
}
