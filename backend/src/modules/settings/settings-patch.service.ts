import { prisma } from '@db/client';
import { NotFoundError, BadRequestError, ConflictError } from '@shared/errors';

// ============================================
// Patch Preferences
// ============================================

const defaultPatchPreferences = {
  enablePatching: true,
  corridorOnlyApprovedPatch: false,
  patchSyncForOS: ['Windows'] as string[],
  patchApprovalPolicy: 'ManuallyApproves' as const,
  enableThirdPartyPatching: false,
  patchApprovalScheduleTime: '02:00:00',
  scheduleTime: '03:00:00',
  zeroTouchDeploymentScheduleTime: '04:00:00',
  lastSyncedAt: null as string | null,
};

export async function getPatchPreferences() {
  const setting = await prisma.setting.findFirst({ where: { key: 'patch-preferences', category: 'patch-preferences' } });
  if (!setting) {
    const created = await prisma.setting.create({
      data: { key: 'patch-preferences', value: JSON.parse(JSON.stringify(defaultPatchPreferences)), category: 'patch-preferences' },
    });
    return { id: created.id, ...defaultPatchPreferences, createdAt: created.createdAt.toISOString() };
  }
  const v = setting.value as Record<string, unknown>;
  return {
    id: setting.id,
    enablePatching: v.enablePatching ?? defaultPatchPreferences.enablePatching,
    corridorOnlyApprovedPatch: v.corridorOnlyApprovedPatch ?? defaultPatchPreferences.corridorOnlyApprovedPatch,
    patchSyncForOS: (v.patchSyncForOS as string[]) ?? defaultPatchPreferences.patchSyncForOS,
    patchApprovalPolicy: (v.patchApprovalPolicy as string) ?? defaultPatchPreferences.patchApprovalPolicy,
    enableThirdPartyPatching: v.enableThirdPartyPatching ?? defaultPatchPreferences.enableThirdPartyPatching,
    patchApprovalScheduleTime: (v.patchApprovalScheduleTime as string) ?? defaultPatchPreferences.patchApprovalScheduleTime,
    scheduleTime: (v.scheduleTime as string) ?? defaultPatchPreferences.scheduleTime,
    zeroTouchDeploymentScheduleTime: (v.zeroTouchDeploymentScheduleTime as string) ?? defaultPatchPreferences.zeroTouchDeploymentScheduleTime,
    lastSyncedAt: (v.lastSyncedAt as string | null) ?? null,
    createdAt: setting.createdAt.toISOString(),
  };
}

export async function updatePatchPreferences(input: Record<string, unknown>) {
  const setting = await prisma.setting.findFirst({ where: { key: 'patch-preferences', category: 'patch-preferences' } });
  const currentValue = setting ? (setting.value as Record<string, unknown>) : { ...defaultPatchPreferences };
  const merged = { ...currentValue, ...input };
  if (setting) {
    const updated = await prisma.setting.update({ where: { id: setting.id }, data: { value: JSON.parse(JSON.stringify(merged)) } });
    return { id: updated.id, ...(updated.value as Record<string, unknown>), createdAt: updated.createdAt.toISOString() };
  }
  const created = await prisma.setting.create({
    data: { key: 'patch-preferences', value: JSON.parse(JSON.stringify(merged)), category: 'patch-preferences' },
  });
  return { id: created.id, ...(created.value as Record<string, unknown>), createdAt: created.createdAt.toISOString() };
}

export async function syncPatchNow() {
  const syncedAt = new Date().toISOString();
  await updatePatchPreferences({ lastSyncedAt: syncedAt });
  return { message: 'Patch sync triggered', syncedAt };
}

// ============================================
// Patch Management Settings
// ============================================

export async function getPatchManagementSettings(): Promise<Record<string, unknown>> {
  const settings = await prisma.setting.findMany({
    where: { category: 'patch-management' },
  });

  const defaults: Record<string, unknown> = {
    requireApprovalForDeployment: false,
    requireTestBeforeApproval: true,
    autoApproveFromVendors: [],
    autoApproveSeverities: [],
  };

  const result = { ...defaults };
  for (const setting of settings) {
    const key = setting.key.replace('patch-management.', '');
    result[key] = setting.value;
  }

  return result;
}

export async function updatePatchManagementSettings(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const updates = Object.entries(input).filter(([, value]) => value !== undefined);

  for (const [key, value] of updates) {
    await prisma.setting.upsert({
      where: { key: `patch-management.${key}` },
      update: { value: JSON.parse(JSON.stringify(value)) },
      create: { key: `patch-management.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'patch-management' },
    });
  }

  return getPatchManagementSettings();
}

// ============================================
// Deployment Policies
// ============================================

export async function listDeploymentPolicies(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string; type?: string }) {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  if (params.type) where.type = params.type;
  const orderBy: Record<string, string> = {};
  if (params.sortBy) { orderBy[params.sortBy] = params.sortOrder || 'asc'; } else { orderBy.createdAt = 'desc'; }
  const [data, total] = await Promise.all([
    prisma.deploymentPolicy.findMany({ where, orderBy, skip, take: limit }),
    prisma.deploymentPolicy.count({ where }),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getDeploymentPolicy(id: string) {
  const policy = await prisma.deploymentPolicy.findFirst({ where: { OR: [{ id }, { policyId: id }] } });
  if (!policy) throw new NotFoundError('Deployment policy not found');
  return policy;
}

export async function createDeploymentPolicy(data: { name: string; description?: string; type?: string; supportedModule?: string; relatedType?: string }, userId?: string) {
  const existing = await prisma.deploymentPolicy.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' } } });
  if (existing) throw new ConflictError(`Deployment policy with name '${data.name}' already exists`);

  const lastPolicy = await prisma.deploymentPolicy.findFirst({ where: { policyId: { startsWith: 'DPOL-' } }, orderBy: { policyId: 'desc' } });
  let nextNum = 1;
  if (lastPolicy) { const m = lastPolicy.policyId.match(/DPOL-(\d+)/); if (m) nextNum = parseInt(m[1], 10) + 1; }
  const policyId = `DPOL-${String(nextNum).padStart(4, '0')}`;

  return prisma.deploymentPolicy.create({
    data: { policyId, name: data.name, description: data.description, type: data.type || 'INSTANT', supportedModule: data.supportedModule || 'All', relatedType: data.relatedType || 'No Relation', createdBy: userId || null },
  });
}

export async function updateDeploymentPolicy(id: string, data: { name?: string; description?: string; type?: string; supportedModule?: string; relatedType?: string }) {
  const policy = await prisma.deploymentPolicy.findFirst({ where: { OR: [{ id }, { policyId: id }] } });
  if (!policy) throw new NotFoundError('Deployment policy not found');
  if (data.name) {
    const dup = await prisma.deploymentPolicy.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: policy.id } } });
    if (dup) throw new ConflictError(`Deployment policy with name '${data.name}' already exists`);
  }
  return prisma.deploymentPolicy.update({ where: { id: policy.id }, data });
}

export async function deleteDeploymentPolicy(id: string) {
  const policy = await prisma.deploymentPolicy.findFirst({ where: { OR: [{ id }, { policyId: id }] } });
  if (!policy) throw new NotFoundError('Deployment policy not found');
  await prisma.deploymentPolicy.delete({ where: { id: policy.id } });
}

// ============================================
// Distribution Servers
// ============================================

export async function listDistributionServers(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
      { location: { contains: params.search, mode: 'insensitive' } },
      { url: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  const orderBy: Record<string, string> = {};
  if (params.sortBy) { orderBy[params.sortBy] = params.sortOrder || 'asc'; } else { orderBy.createdAt = 'desc'; }
  const [data, total] = await Promise.all([
    prisma.distributionServer.findMany({ where, orderBy, skip, take: limit }),
    prisma.distributionServer.count({ where }),
  ]);
  return { data: data.map(s => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getDistributionServer(id: string) {
  const server = await prisma.distributionServer.findUnique({ where: { id } });
  if (!server) throw new NotFoundError('Distribution server not found');
  return { ...server, createdAt: server.createdAt.toISOString(), updatedAt: server.updatedAt.toISOString() };
}

export async function createDistributionServer(data: { name: string; description?: string | null; location?: string | null; url: string; version?: string | null; status?: string }, userId?: string) {
  const existing = await prisma.distributionServer.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' } } });
  if (existing) throw new ConflictError(`Distribution server with name '${data.name}' already exists`);
  const server = await prisma.distributionServer.create({ data: { name: data.name, description: data.description || null, location: data.location || null, url: data.url, version: data.version || null, status: data.status || 'Active', createdBy: userId || null } });
  return { ...server, createdAt: server.createdAt.toISOString(), updatedAt: server.updatedAt.toISOString() };
}

export async function updateDistributionServer(id: string, data: { name?: string; description?: string | null; location?: string | null; url?: string; version?: string | null; status?: string }) {
  const server = await prisma.distributionServer.findUnique({ where: { id } });
  if (!server) throw new NotFoundError('Distribution server not found');
  if (data.name && data.name.toLowerCase() !== server.name.toLowerCase()) {
    const existing = await prisma.distributionServer.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } } });
    if (existing) throw new ConflictError(`Distribution server with name '${data.name}' already exists`);
  }
  const updated = await prisma.distributionServer.update({ where: { id }, data });
  return { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
}

export async function deleteDistributionServer(id: string) {
  const server = await prisma.distributionServer.findUnique({ where: { id } });
  if (!server) throw new NotFoundError('Distribution server not found');
  await prisma.distributionServer.delete({ where: { id } });
}

// ============================================
// Computer Groups
// ============================================

export async function listComputerGroups(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) {
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  const orderBy: Record<string, string> = {};
  if (params.sortBy) { orderBy[params.sortBy] = params.sortOrder || 'asc'; } else { orderBy.createdAt = 'desc'; }
  const [data, total] = await Promise.all([
    prisma.computerGroup.findMany({ where, orderBy, skip, take: limit }),
    prisma.computerGroup.count({ where }),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getComputerGroup(id: string) {
  const group = await prisma.computerGroup.findUnique({ where: { id } });
  if (!group) throw new NotFoundError('Computer group not found');
  return group;
}

export async function createComputerGroup(data: { name: string; description?: string | null; endpoints?: string[] }, userId?: string) {
  const existing = await prisma.computerGroup.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
  });
  if (existing) throw new ConflictError(`Computer group with name '${data.name}' already exists`);

  const endpoints = data.endpoints || [];
  if (endpoints.length > 0) {
    const assets = await prisma.asset.findMany({ where: { id: { in: endpoints } }, select: { id: true } });
    const foundIds = new Set(assets.map(a => a.id));
    const missing = endpoints.filter(ep => !foundIds.has(ep));
    if (missing.length > 0) throw new BadRequestError(`Endpoints not found: [${missing.join(', ')}]`);
  }

  return prisma.computerGroup.create({
    data: { name: data.name, description: data.description ?? null, endpoints, endpointCount: endpoints.length, createdBy: userId || null },
  });
}

export async function updateComputerGroup(id: string, data: { name?: string; description?: string | null; endpoints?: string[] }) {
  const group = await prisma.computerGroup.findUnique({ where: { id } });
  if (!group) throw new NotFoundError('Computer group not found');

  if (data.name) {
    const existing = await prisma.computerGroup.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } },
    });
    if (existing) throw new ConflictError(`Computer group with name '${data.name}' already exists`);
  }

  if (data.endpoints && data.endpoints.length > 0) {
    const assets = await prisma.asset.findMany({ where: { id: { in: data.endpoints } }, select: { id: true } });
    const foundIds = new Set(assets.map(a => a.id));
    const missing = data.endpoints.filter(ep => !foundIds.has(ep));
    if (missing.length > 0) throw new BadRequestError(`Endpoints not found: [${missing.join(', ')}]`);
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.endpoints !== undefined) { updateData.endpoints = data.endpoints; updateData.endpointCount = data.endpoints.length; }
  return prisma.computerGroup.update({ where: { id }, data: updateData });
}

export async function deleteComputerGroup(id: string) {
  const group = await prisma.computerGroup.findUnique({ where: { id } });
  if (!group) throw new NotFoundError('Computer group not found');
  await prisma.computerGroup.delete({ where: { id } });
}

export async function getAvailableEndpoints() {
  const assets = await prisma.asset.findMany({
    select: { id: true, hostname: true, ipAddress: true, status: true },
    orderBy: { hostname: 'asc' },
  });
  return assets.map((a) => ({ id: a.id, name: a.hostname, ipAddress: a.ipAddress, status: a.status === 'In Use' ? 'Online' : 'Offline' }));
}
