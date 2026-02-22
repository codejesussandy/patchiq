import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/client';

// ============================================
// ID Generators
// ============================================

export async function generatePatchId(os: string): Promise<string> {
  const osPrefix = os.charAt(0).toUpperCase();
  const count = await prisma.patch.count();
  return `ZPH-${osPrefix}-${(count + 1).toString().padStart(4, '0')}`;
}

export async function generateDeploymentId(): Promise<string> {
  const count = await prisma.patchDeployment.count();
  return `DEP-${(count + 1).toString().padStart(4, '0')}`;
}

// ============================================
// Transform Functions
// ============================================

export function transformPatch(patch: Prisma.PatchGetPayload<object> & { bundle?: Prisma.PatchBundleGetPayload<object> | null }) {
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
    publishedAt: patch.publishedAt?.toISOString() || null,
    size: patch.size ? Number(patch.size) : null,
    sizeFormatted: patch.sizeFormatted,
    downloadUrl: patch.downloadUrl,
    referenceUrl: patch.referenceUrl,
    rebootRequired: patch.rebootRequired,
    supportUninstallation: patch.supportUninstallation,
    supportsRollback: patch.supportsRollback || false,
    patchType: patch.patchType || 'UPDATE',
    languagesSupported: patch.languagesSupported || [],
    tags: patch.tags || [],
    cveNumbers: patch.cveNumbers || [],
    source: patch.source,
    status: patch.status,
    downloadStatus: patch.downloadStatus,
    supersedes: patch.supersedes || [],
    supersededBy: patch.supersededBy || [],
    supersededAt: patch.supersededAt?.toISOString() || null,
    isSuperseded: !!patch.supersededAt,
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
    bundle: patch.bundle ? {
      id: patch.bundle.id,
      hasBundle: !!patch.bundle.bundleObjectKey,
      hasScripts: patch.bundle.scriptsIncluded,
      downloadStatus: patch.bundle.downloadStatus,
      bundleChecksum: patch.bundle.bundleChecksum,
    } : null,
  };
}

export type DeploymentWithIncludes = Prisma.PatchDeploymentGetPayload<object> & {
  patches?: Array<Prisma.PatchGetPayload<object> & { bundle?: Prisma.PatchBundleGetPayload<object> | null }>;
  tasks?: Array<Prisma.PatchDeploymentTaskGetPayload<object> & { asset?: Prisma.AssetGetPayload<object> | null }>;
};

export function transformDeployment(deployment: DeploymentWithIncludes) {
  return {
    id: deployment.id,
    name: deployment.name,
    deploymentId: deployment.deploymentId,
    description: deployment.description,
    type: deployment.type,
    configType: deployment.configType,
    scope: deployment.scope,
    status: deployment.status,
    pending: deployment.pending,
    succeeded: deployment.succeeded,
    failed: deployment.failed,
    targetGroupIds: deployment.targetGroupIds || [],
    targetAgentIds: deployment.targetAgentIds || [],
    scheduledAt: deployment.scheduledAt?.toISOString() || null,
    startedAt: deployment.startedAt?.toISOString() || null,
    completedAt: deployment.completedAt?.toISOString() || null,
    triggerType: deployment.triggerType || null,
    skipApprovalCheck: deployment.skipApprovalCheck || false,
    approvalOverrideBy: deployment.approvalOverrideBy || null,
    autoRollback: deployment.autoRollback || false,
    createdBy: deployment.createdBy,
    createdAt: deployment.createdAt.toISOString(),
    updatedAt: deployment.updatedAt.toISOString(),
    patches: deployment.patches?.map(transformPatch) || [],
    tasks: deployment.tasks?.map((task) => ({
      id: task.id,
      endpoint: {
        id: task.asset?.id || task.assetId,
        name: task.asset?.name || 'Unknown',
        os: task.asset?.os || 'Unknown',
        status: task.asset?.status || 'Unknown',
      },
      name: 'Patch',
      status: task.status,
      createdBy: deployment.createdBy || 'System',
      lastUpdated: task.updatedAt?.toISOString() || task.createdAt?.toISOString(),
      createdOn: task.createdAt?.toISOString(),
    })) || [],
  };
}

export function transformPatchTest(test: Prisma.PatchTestGetPayload<object>) {
  return {
    id: test.id,
    name: test.name,
    description: test.description,
    applicationType: test.applicationType,
    applications: test.applications || [],
    platform: (test as Record<string, unknown>).platform as string || 'ALL',
    scope: test.scope,
    computers: test.computers || [],
    groups: test.groups || [],
    status: test.status,
    createdBy: test.createdBy,
    createdAt: test.createdAt.toISOString(),
    updatedAt: test.updatedAt.toISOString(),
  };
}

export function transformZeroTouchConfig(config: Prisma.ZeroTouchConfigGetPayload<object>) {
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
    lastTriggeredAt: config.lastTriggeredAt?.toISOString() || null,
    deploymentsCreated: config.deploymentsCreated || 0,
    createdBy: config.createdBy,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}
