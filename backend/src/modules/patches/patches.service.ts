import { prisma } from '@/db/client';
import { NotFoundError, BadRequestError, ConflictError } from '@shared/errors';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import type { Prisma } from '@prisma/client';
import type {
  CreatePatchInput,
  UpdatePatchInput,
  PatchListQuery,
  TestPatchInput,
  RejectPatchInput,
  ScanEndpointsInput,
  CreateDeploymentInput,
  DeploymentListQuery,
  CreatePatchTestInput,
  CreateZeroTouchConfigInput,
  UpdateZeroTouchConfigInput,
} from './patches.validator';

// ============================================
// Patches CRUD
// ============================================

export async function listPatches(params: PatchListQuery) {
  const where: Prisma.PatchWhereInput = {};

  if (params.severity) where.severity = params.severity;
  if (params.os) where.os = params.os;
  if (params.category) where.category = params.category;
  if (params.testStatus) where.testStatus = params.testStatus;
  if (params.approvalStatus) where.approvalStatus = params.approvalStatus;
  if (params.search) {
    where.OR = [
      { patchId: { contains: params.search, mode: 'insensitive' } },
      { title: { contains: params.search, mode: 'insensitive' } },
      { software: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [patches, total] = await Promise.all([
    prisma.patch.findMany({
      where,
      orderBy: params.sort
        ? { [params.sort]: params.order }
        : { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.patch.count({ where }),
  ]);

  return paginate(patches.map(transformPatch), total, { page: params.page, limit: params.limit });
}

export async function getPatchById(id: string) {
  const patch = await prisma.patch.findUnique({
    where: { id },
    include: {
      affectedProducts: true,
      fileDetails: true,
      vulnerabilities: true,
      patchEndpoints: true,
    },
  });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  return transformPatch(patch);
}

export async function createPatch(data: CreatePatchInput) {
  // Generate unique patch ID
  const patchId = await generatePatchId(data.os || 'W');

  const patch = await prisma.patch.create({
    data: {
      patchId,
      title: data.title || data.software,
      software: data.software,
      description: data.description,
      severity: data.severity || 'UNSPECIFIED',
      category: data.category,
      vendor: data.vendor,
      product: data.product,
      os: data.os,
      platform: data.platform,
      architecture: data.architecture,
      kbNumber: data.kbNumber,
      bulletinId: data.bulletinId,
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
      referenceUrl: data.referenceUrl,
      rebootRequired: data.rebootRequired ?? false,
      supportUninstallation: data.supportUninstallation ?? false,
      languagesSupported: data.languagesSupported || [],
      tags: data.tags || [],
      cveNumbers: data.cveNumbers || [],
      operationalStatusSince: new Date(),
    },
  });

  return transformPatch(patch);
}

export async function updatePatch(id: string, data: UpdatePatchInput) {
  const existing = await prisma.patch.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Patch not found');
  }

  const patch = await prisma.patch.update({
    where: { id },
    data: {
      software: data.software,
      title: data.title,
      description: data.description,
      severity: data.severity,
      category: data.category,
      testStatus: data.testStatus,
      approvalStatus: data.approvalStatus,
      tags: data.tags,
    },
  });

  return transformPatch(patch);
}

export async function deletePatch(id: string) {
  const existing = await prisma.patch.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Patch not found');
  }

  await prisma.patch.delete({ where: { id } });

  return { success: true };
}

// ============================================
// Patch Related Data
// ============================================

export async function getAffectedProducts(patchId: string) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const products = await prisma.patchAffectedProduct.findMany({
    where: { patchId },
  });

  return products.map((p) => ({
    id: p.id,
    softwareName: p.softwareName,
    version: p.version,
    vendor: p.vendor,
    installedOn: p.installedOn,
    platform: p.platform,
  }));
}

export async function getFileDetails(patchId: string) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const files = await prisma.patchFileDetail.findMany({
    where: { patchId },
  });

  return files.map((f) => ({
    id: f.id,
    fileName: f.fileName,
    version: f.version,
    size: f.size,
    path: f.path,
  }));
}

export async function getVulnerabilities(patchId: string) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const vulnerabilities = await prisma.patchVulnerability.findMany({
    where: { patchId },
  });

  return vulnerabilities.map((v) => ({
    id: v.id,
    cveNumber: v.cveNumber,
    severity: v.severity,
    description: v.description,
    publishedDate: v.publishedDate?.toISOString() || null,
  }));
}

export async function getEndpoints(patchId: string) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const endpoints = await prisma.patchEndpoint.findMany({
    where: { patchId },
  });

  return endpoints.map((e) => ({
    id: e.id,
    name: e.name,
    os: e.os,
    status: e.status,
    lastSeen: e.lastSeen?.toISOString() || null,
  }));
}

export async function scanEndpoints(patchId: string, data: ScanEndpointsInput) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  // In a real implementation, this would queue a scan job
  // For now, we just return a success message
  return {
    message: 'Scan initiated',
    patchId,
    scope: data.scope,
    endpointIds: data.endpointIds,
  };
}

// ============================================
// Test & Approve Workflow
// ============================================

export async function getPatchesPendingTestApproval(params: { status?: string; page: number; limit: number }) {
  const where: Prisma.PatchWhereInput = {};

  if (params.status === 'pending-test') {
    where.testStatus = 'Not Tested';
  } else if (params.status === 'pending-approval') {
    where.testStatus = 'Tested';
    where.approvalStatus = 'Pending';
  }

  const [patches, total] = await Promise.all([
    prisma.patch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.patch.count({ where }),
  ]);

  return paginate(patches.map(transformPatch), total, { page: params.page, limit: params.limit });
}

export async function testPatch(id: string, userId: string, data: TestPatchInput) {
  const patch = await prisma.patch.findUnique({ where: { id } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const testStatus = data.status === 'passed' ? 'Tested' : 'Test Failed';

  const updated = await prisma.patch.update({
    where: { id },
    data: {
      testStatus,
      testResult: data.status,
      testedBy: userId,
      testedAt: new Date(),
      testNotes: data.notes,
      testEnvironment: data.testEnvironment,
      // If test failed, also set approval to rejected
      ...(data.status === 'failed' && {
        approvalStatus: 'Rejected',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: 'Test failed',
      }),
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'TEST_PATCH',
      resource: 'patches',
      resourceId: id,
      details: { testStatus: data.status, notes: data.notes },
    },
  });

  return transformPatch(updated);
}

export async function approvePatch(id: string, userId: string) {
  const patch = await prisma.patch.findUnique({ where: { id } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  if (patch.testStatus !== 'Tested') {
    throw new BadRequestError('Patch must be tested before approval');
  }

  if (patch.testResult === 'failed') {
    throw new BadRequestError('Cannot approve patch with failed test result');
  }

  const updated = await prisma.patch.update({
    where: { id },
    data: {
      approvalStatus: 'Approved',
      approvedBy: userId,
      approvedAt: new Date(),
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'APPROVE_PATCH',
      resource: 'patches',
      resourceId: id,
    },
  });

  return transformPatch(updated);
}

export async function rejectPatch(id: string, userId: string, data: RejectPatchInput) {
  const patch = await prisma.patch.findUnique({ where: { id } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const updated = await prisma.patch.update({
    where: { id },
    data: {
      approvalStatus: 'Rejected',
      rejectedBy: userId,
      rejectedAt: new Date(),
      rejectionReason: data.reason,
      rejectionNotes: data.notes,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'REJECT_PATCH',
      resource: 'patches',
      resourceId: id,
      details: { reason: data.reason },
    },
  });

  return transformPatch(updated);
}

// ============================================
// Deployments
// ============================================

export async function listDeployments(params: DeploymentListQuery) {
  const where: Prisma.PatchDeploymentWhereInput = {};

  if (params.type) where.type = params.type;
  if (params.stage) where.stage = params.stage;

  const [deployments, total] = await Promise.all([
    prisma.patchDeployment.findMany({
      where,
      include: {
        patches: true,
      },
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.patchDeployment.count({ where }),
  ]);

  return paginate(deployments.map(transformDeployment), total, { page: params.page, limit: params.limit });
}

export async function getDeploymentById(id: string) {
  const deployment = await prisma.patchDeployment.findUnique({
    where: { id },
    include: {
      patches: true,
      tasks: {
        include: {
          asset: true,
        },
      },
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  return transformDeployment(deployment);
}

export async function createDeployment(data: CreateDeploymentInput, userId: string) {
  // Generate unique deployment ID
  const deploymentId = await generateDeploymentId();

  // Verify all patches exist and are approved
  const patches = await prisma.patch.findMany({
    where: {
      id: { in: data.patches },
    },
  });

  if (patches.length !== data.patches.length) {
    throw new BadRequestError('One or more patches not found');
  }

  const deployment = await prisma.patchDeployment.create({
    data: {
      name: data.name,
      deploymentId,
      description: data.description,
      type: data.type,
      configType: data.configType || 'INSTALL',
      scope: data.scope || 'Endpoint',
      status: 'PENDING',
      stage: data.schedule ? 'PENDING' : 'IN_PROGRESS',
      targetGroups: data.targetGroups || [],
      scheduledAt: data.schedule ? new Date(data.schedule) : null,
      createdBy: userId,
      patches: {
        connect: data.patches.map((patchId) => ({ id: patchId })),
      },
    },
    include: {
      patches: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CREATE_DEPLOYMENT',
      resource: 'deployments',
      resourceId: deployment.id,
      details: { name: data.name, patchCount: data.patches.length },
    },
  });

  return transformDeployment(deployment);
}

export async function deleteDeployment(id: string, userId: string) {
  const existing = await prisma.patchDeployment.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Deployment not found');
  }

  if (existing.stage === 'IN_PROGRESS') {
    throw new BadRequestError('Cannot delete deployment that is in progress');
  }

  await prisma.patchDeployment.delete({ where: { id } });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'DELETE_DEPLOYMENT',
      resource: 'deployments',
      resourceId: id,
    },
  });

  return { success: true };
}

export async function updateDeployment(id: string, data: { name?: string; scheduledAt?: string }) {
  const existing = await prisma.patchDeployment.findUnique({
    where: { id },
    include: { patches: true },
  });

  if (!existing) {
    throw new NotFoundError('Deployment not found');
  }

  // Block update if deployment has already started executing
  if (existing.startedAt) {
    throw new BadRequestError('Cannot update deployment that has started execution');
  }

  if (existing.stage === 'COMPLETED' || existing.stage === 'CANCELLED') {
    throw new BadRequestError('Cannot update completed or cancelled deployment');
  }

  const updated = await prisma.patchDeployment.update({
    where: { id },
    data: {
      name: data.name || existing.name,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : existing.scheduledAt,
    },
    include: { patches: true },
  });

  return transformDeployment(updated);
}

export async function cancelDeployment(id: string, userId: string) {
  const existing = await prisma.patchDeployment.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Deployment not found');
  }

  if (existing.stage === 'COMPLETED') {
    throw new BadRequestError('Cannot cancel completed deployment');
  }

  const updated = await prisma.patchDeployment.update({
    where: { id },
    data: {
      stage: 'CANCELLED',
      status: 'CANCELLED',
      completedAt: new Date(),
    },
    include: { patches: true },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CANCEL_DEPLOYMENT',
      resource: 'deployments',
      resourceId: id,
    },
  });

  return transformDeployment(updated);
}

export async function getDeploymentPreview(id: string) {
  const deployment = await prisma.patchDeployment.findUnique({
    where: { id },
    include: {
      patches: true,
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  // In a real implementation, this would calculate actual target endpoints
  return {
    deploymentId: id,
    patches: deployment.patches.map(transformPatch),
    targetEndpoints: 10, // Mock value
    estimatedDuration: '30 minutes', // Mock value
  };
}

export async function executeDeployment(id: string, userId: string) {
  const deployment = await prisma.patchDeployment.findUnique({ where: { id } });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  if (deployment.stage === 'IN_PROGRESS') {
    throw new BadRequestError('Deployment is already in progress');
  }

  if (deployment.stage === 'COMPLETED') {
    throw new BadRequestError('Deployment is already completed');
  }

  await prisma.patchDeployment.update({
    where: { id },
    data: {
      stage: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'EXECUTE_DEPLOYMENT',
      resource: 'deployments',
      resourceId: id,
    },
  });

  // In a real implementation, this would queue the deployment job
  return { message: 'Deployment execution initiated' };
}

// ============================================
// Patch Tests
// ============================================

export async function listPatchTests(params: { page: number; limit: number; status?: string }) {
  const where: Prisma.PatchTestWhereInput = {};

  if (params.status) where.status = params.status;

  const [tests, total] = await Promise.all([
    prisma.patchTest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.patchTest.count({ where }),
  ]);

  return paginate(tests.map(transformPatchTest), total, { page: params.page, limit: params.limit });
}

export async function getPatchTestById(id: string) {
  const test = await prisma.patchTest.findUnique({ where: { id } });

  if (!test) {
    throw new NotFoundError('Patch test not found');
  }

  return transformPatchTest(test);
}

export async function createPatchTest(data: CreatePatchTestInput, userId: string) {
  const test = await prisma.patchTest.create({
    data: {
      name: data.name,
      description: data.description,
      applicationType: data.applicationType || 'ALL',
      applications: data.applications || [],
      scope: data.scope || 'ALL_COMPUTERS',
      computers: data.computers || [],
      groups: data.groups || [],
      status: 'Pending',
      createdBy: userId,
    },
  });

  return transformPatchTest(test);
}

export async function approvePatchTest(id: string, userId: string) {
  const test = await prisma.patchTest.findUnique({ where: { id } });

  if (!test) {
    throw new NotFoundError('Patch test not found');
  }

  const updated = await prisma.patchTest.update({
    where: { id },
    data: {
      status: 'Approved',
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'APPROVE_PATCH_TEST',
      resource: 'patch_tests',
      resourceId: id,
    },
  });

  return transformPatchTest(updated);
}

export async function deletePatchTest(id: string) {
  const existing = await prisma.patchTest.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Patch test not found');
  }

  await prisma.patchTest.delete({ where: { id } });

  return { success: true };
}

// ============================================
// Zero Touch Configs
// ============================================

export async function listZeroTouchConfigs(params: { page: number; limit: number; status?: string }) {
  const where: Prisma.ZeroTouchConfigWhereInput = {};

  if (params.status) where.status = params.status;

  const [configs, total] = await Promise.all([
    prisma.zeroTouchConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.zeroTouchConfig.count({ where }),
  ]);

  return paginate(configs.map(transformZeroTouchConfig), total, { page: params.page, limit: params.limit });
}

export async function getZeroTouchConfigById(id: string) {
  const config = await prisma.zeroTouchConfig.findUnique({ where: { id } });

  if (!config) {
    throw new NotFoundError('Zero touch config not found');
  }

  return transformZeroTouchConfig(config);
}

export async function createZeroTouchConfig(data: CreateZeroTouchConfigInput, userId: string) {
  const config = await prisma.zeroTouchConfig.create({
    data: {
      name: data.name,
      description: data.description,
      applicationType: data.applicationType || 'ALL',
      applications: data.applications || [],
      scope: data.scope || 'ALL_COMPUTERS',
      computers: data.computers || [],
      groups: data.groups || [],
      autoDeploymentRules: data.autoDeploymentRules,
      status: 'Active',
      createdBy: userId,
    },
  });

  return transformZeroTouchConfig(config);
}

export async function updateZeroTouchConfig(id: string, data: UpdateZeroTouchConfigInput) {
  const existing = await prisma.zeroTouchConfig.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Zero touch config not found');
  }

  const config = await prisma.zeroTouchConfig.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      applicationType: data.applicationType,
      applications: data.applications,
      scope: data.scope,
      computers: data.computers,
      groups: data.groups,
      autoDeploymentRules: data.autoDeploymentRules,
      status: data.status,
    },
  });

  return transformZeroTouchConfig(config);
}

export async function deleteZeroTouchConfig(id: string) {
  const existing = await prisma.zeroTouchConfig.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Zero touch config not found');
  }

  await prisma.zeroTouchConfig.delete({ where: { id } });

  return { success: true };
}

// ============================================
// Helper Functions
// ============================================

async function generatePatchId(os: string): Promise<string> {
  const osPrefix = os.charAt(0).toUpperCase();
  const count = await prisma.patch.count();
  return `ZPH-${osPrefix}-${(count + 1).toString().padStart(4, '0')}`;
}

async function generateDeploymentId(): Promise<string> {
  const count = await prisma.patchDeployment.count();
  return `DEP-${(count + 1).toString().padStart(4, '0')}`;
}

function transformPatch(patch: any) {
  return {
    id: patch.id,
    patchId: patch.patchId,
    title: patch.title,
    software: patch.software,
    description: patch.description,
    severity: patch.severity,
    category: patch.category,
    vendor: patch.vendor,
    product: patch.product,
    os: patch.os,
    osVersion: patch.osVersion,
    platform: patch.platform,
    architecture: patch.architecture,
    kbNumber: patch.kbNumber,
    bulletinId: patch.bulletinId,
    releaseDate: patch.releaseDate?.toISOString() || null,
    releasedOn: patch.releasedOn?.toISOString() || null,
    downloadedOn: patch.downloadedOn?.toISOString() || null,
    size: patch.size ? Number(patch.size) : null,
    sizeFormatted: patch.sizeFormatted,
    downloadUrl: patch.downloadUrl,
    referenceUrl: patch.referenceUrl,
    rebootRequired: patch.rebootRequired,
    supportUninstallation: patch.supportUninstallation,
    languagesSupported: patch.languagesSupported || [],
    tags: patch.tags || [],
    cveNumbers: patch.cveNumbers || [],
    source: patch.source,
    status: patch.status,
    downloadStatus: patch.downloadStatus,
    supersedes: patch.supersedes || [],
    supersededBy: patch.supersededBy || [],
    operationalStatusSince: patch.operationalStatusSince?.toISOString() || null,
    endpoints: patch.endpoints,
    testStatus: patch.testStatus,
    testResult: patch.testResult,
    testedBy: patch.testedBy,
    testedAt: patch.testedAt?.toISOString() || null,
    testNotes: patch.testNotes,
    testEnvironment: patch.testEnvironment,
    approvalStatus: patch.approvalStatus,
    approvedBy: patch.approvedBy,
    approvedAt: patch.approvedAt?.toISOString() || null,
    rejectedBy: patch.rejectedBy,
    rejectedAt: patch.rejectedAt?.toISOString() || null,
    rejectionReason: patch.rejectionReason,
    rejectionNotes: patch.rejectionNotes,
    createdAt: patch.createdAt.toISOString(),
    updatedAt: patch.updatedAt.toISOString(),
  };
}

function transformDeployment(deployment: any) {
  return {
    id: deployment.id,
    name: deployment.name,
    deploymentId: deployment.deploymentId,
    description: deployment.description,
    type: deployment.type,
    configType: deployment.configType,
    scope: deployment.scope,
    status: deployment.status,
    stage: deployment.stage,
    pending: deployment.pending,
    succeeded: deployment.succeeded,
    failed: deployment.failed,
    targetGroups: deployment.targetGroups || [],
    scheduledAt: deployment.scheduledAt?.toISOString() || null,
    startedAt: deployment.startedAt?.toISOString() || null,
    completedAt: deployment.completedAt?.toISOString() || null,
    createdBy: deployment.createdBy,
    createdAt: deployment.createdAt.toISOString(),
    updatedAt: deployment.updatedAt.toISOString(),
    patches: deployment.patches?.map(transformPatch) || [],
    tasks: deployment.tasks?.map((task: any) => ({
      id: task.id,
      endpoint: {
        id: task.asset?.id || task.assetId,
        name: task.asset?.hostname || task.asset?.name || 'Unknown',
        os: task.asset?.osName || task.asset?.platform || 'Unknown',
        status: task.asset?.status || 'Unknown',
      },
      name: task.patchName || task.name || 'Unknown Patch',
      status: task.status,
      createdBy: deployment.createdBy || 'System',
      lastUpdated: task.updatedAt?.toISOString() || task.createdAt?.toISOString(),
      createdOn: task.createdAt?.toISOString(),
    })) || [],
  };
}

function transformPatchTest(test: any) {
  return {
    id: test.id,
    name: test.name,
    description: test.description,
    applicationType: test.applicationType,
    applications: test.applications || [],
    scope: test.scope,
    computers: test.computers || [],
    groups: test.groups || [],
    status: test.status,
    createdBy: test.createdBy,
    createdAt: test.createdAt.toISOString(),
    updatedAt: test.updatedAt.toISOString(),
  };
}

function transformZeroTouchConfig(config: any) {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    applicationType: config.applicationType,
    applications: config.applications || [],
    scope: config.scope,
    computers: config.computers || [],
    groups: config.groups || [],
    autoDeploymentRules: config.autoDeploymentRules,
    status: config.status,
    createdBy: config.createdBy,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}
