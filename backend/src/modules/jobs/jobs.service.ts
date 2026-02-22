import type { Prisma } from '@prisma/client';
import { NotFoundError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { formatDate } from '@shared/utils/date';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import { withTransaction } from '@shared/utils/transaction';
import { prisma } from '@/db/client';

const logger = createLogger('jobs');
import type {
  CreatePatchJobInput,
  PatchJobListQuery,
  CreateVulnerabilityJobInput,
  VulnerabilityJobListQuery,
  UpdateVulnerabilityDBSyncInput,
  CreateSoftwareDeploymentInput,
  SoftwareDeploymentListQuery,
  CreateConfigCatalogInput,
  UpdateConfigCatalogInput,
  ConfigCatalogListQuery,
  CreateConfigBundleInput,
  UpdateConfigBundleInput,
  ConfigBundleListQuery,
  CreateConfigDeploymentInput,
  ConfigDeploymentListQuery,
  CreateDeploymentPolicyInput,
  UpdateDeploymentPolicyInput,
  DeploymentPolicyListQuery,
} from './jobs.validators';

// ============================================
// Helper Functions
// ============================================

async function generatePolicyId(prefix: string, model: string): Promise<string> {
  // Find the max existing numeric suffix to avoid collisions when records have been deleted
  let existingIds: string[] = [];

  switch (model) {
    case 'patchJob':
      existingIds = (await prisma.patchJob.findMany({ select: { policyId: true } })).map((r) => r.policyId);
      break;
    case 'vulnerabilityJob':
      existingIds = (await prisma.vulnerabilityJob.findMany({ select: { jobId: true } })).map((r) => r.jobId);
      break;
    case 'softwareDeployment':
      existingIds = (await prisma.softwareDeployment.findMany({ select: { deploymentId: true } })).map((r) => r.deploymentId);
      break;
    case 'configCatalog':
      existingIds = (await prisma.configCatalog.findMany({ select: { configurationId: true } })).map((r) => r.configurationId);
      break;
    case 'configBundle':
      existingIds = (await prisma.configBundle.findMany({ select: { bundleId: true } })).map((r) => r.bundleId);
      break;
    case 'configDeployment':
      existingIds = (await prisma.configDeployment.findMany({ select: { deploymentId: true } })).map((r) => r.deploymentId);
      break;
    case 'deploymentPolicy':
      existingIds = (await prisma.deploymentPolicy.findMany({ select: { policyId: true } })).map((r) => r.policyId);
      break;
  }

  const prefixPattern = new RegExp(`^${prefix}-(\\d+)$`);
  let maxNum = 0;
  for (const id of existingIds) {
    const match = id.match(prefixPattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

// ============================================
// Patch Jobs Service
// ============================================

export async function listPatchJobs(params: PatchJobListQuery) {
  const where: Prisma.PatchJobWhereInput = {};

  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;

  const [jobs, total] = await Promise.all([
    prisma.patchJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.patchJob.count({ where }),
  ]);

  return paginate(
    jobs.map((job) => ({
      id: job.id,
      policyId: job.policyId,
      name: job.name,
      description: job.description,
      type: job.type,
      configType: job.configType,
      scope: job.scope,
      endpoints: job.endpoints,
      patches: job.patches,
      deploymentPolicy: job.deploymentPolicy,
      retryCount: job.retryCount,
      batchSize: job.batchSize,
      notifyTo: job.notifyTo,
      status: job.status,
      createdBy: job.createdBy,
      createdOn: formatDate(job.createdAt),
    })),
    total,
    { page: params.page, limit: params.limit }
  );
}

export async function getPatchJobById(id: string) {
  const job = await prisma.patchJob.findFirst({
    where: { OR: [{ id }, { policyId: id }] },
  });

  if (!job) {
    throw new NotFoundError('Patch job not found');
  }

  return {
    id: job.id,
    policyId: job.policyId,
    name: job.name,
    description: job.description,
    type: job.type,
    configType: job.configType,
    scope: job.scope,
    endpoints: job.endpoints,
    patches: job.patches,
    deploymentPolicy: job.deploymentPolicy,
    retryCount: job.retryCount,
    batchSize: job.batchSize,
    notifyTo: job.notifyTo,
    status: job.status,
    createdBy: job.createdBy,
    createdOn: formatDate(job.createdAt),
  };
}

export async function createPatchJob(data: CreatePatchJobInput, userId: string) {
  const policyId = await generatePolicyId('POLICY', 'patchJob');

  const job = await prisma.patchJob.create({
    data: {
      policyId,
      name: data.name,
      description: data.description,
      type: data.type,
      configType: data.configType,
      scope: data.scope,
      endpoints: data.endpoints || [],
      patches: data.patches,
      deploymentPolicy: data.deploymentPolicy,
      retryCount: data.retryCount,
      batchSize: data.batchSize,
      notifyTo: data.notifyTo || [],
      status: data.type === 'INSTANT' ? 'RUNNING' : 'SCHEDULED',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      createdBy: userId,
    },
  });

  return {
    id: job.id,
    policyId: job.policyId,
    name: job.name,
    description: job.description,
    type: job.type,
    status: job.status,
    createdBy: job.createdBy,
    createdOn: formatDate(job.createdAt),
  };
}

export async function deletePatchJob(id: string) {
  const job = await prisma.patchJob.findFirst({
    where: { OR: [{ id }, { policyId: id }] },
  });

  if (!job) {
    throw new NotFoundError('Patch job not found');
  }

  await prisma.patchJob.delete({ where: { id: job.id } });

  return { message: 'Patch job deleted successfully' };
}

// ============================================
// Vulnerability Jobs Service
// ============================================

export async function listVulnerabilityJobs(params: VulnerabilityJobListQuery) {
  const where: Prisma.VulnerabilityJobWhereInput = {};

  if (params.status) where.status = params.status;

  const [jobs, total] = await Promise.all([
    prisma.vulnerabilityJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.vulnerabilityJob.count({ where }),
  ]);

  return paginate(
    jobs.map((job) => ({
      id: job.id,
      jobId: job.jobId,
      name: job.name,
      description: job.description,
      scope: job.scope,
      endpoints: job.endpoints,
      scanType: job.scanType,
      scheduleDate: job.scheduleDate,
      scheduleTime: job.scheduleTime,
      recurrence: job.recurrence,
      status: job.status,
      scheduledTime: job.scheduledTime,
      lastRun: job.lastRun?.toISOString() || null,
      nextRun: job.nextRun?.toISOString() || null,
      result: job.result,
      createdBy: job.createdBy,
      createdOn: formatDate(job.createdAt),
    })),
    total,
    { page: params.page, limit: params.limit }
  );
}

export async function getVulnerabilityJobById(id: string) {
  const job = await prisma.vulnerabilityJob.findFirst({
    where: { OR: [{ id }, { jobId: id }] },
  });

  if (!job) {
    throw new NotFoundError('Vulnerability job not found');
  }

  return {
    id: job.id,
    jobId: job.jobId,
    name: job.name,
    description: job.description,
    scope: job.scope,
    endpoints: job.endpoints,
    scanType: job.scanType,
    scheduleDate: job.scheduleDate,
    scheduleTime: job.scheduleTime,
    recurrence: job.recurrence,
    status: job.status,
    scheduledTime: job.scheduledTime,
    lastRun: job.lastRun?.toISOString() || null,
    nextRun: job.nextRun?.toISOString() || null,
    result: job.result,
    createdBy: job.createdBy,
    createdOn: formatDate(job.createdAt),
  };
}

export async function createVulnerabilityJob(data: CreateVulnerabilityJobInput, userId: string) {
  const jobId = await generatePolicyId('VULN-JOB', 'vulnerabilityJob');

  let nextRun: Date | null = null;
  if (data.scanType === 'SCHEDULED' && data.scheduleDate && data.scheduleTime) {
    nextRun = new Date(`${data.scheduleDate}T${data.scheduleTime}`);
  }

  const job = await prisma.vulnerabilityJob.create({
    data: {
      jobId,
      name: data.name,
      description: data.description,
      scope: data.scope,
      endpoints: data.endpoints || [],
      scanType: data.scanType,
      scheduleDate: data.scheduleDate,
      scheduleTime: data.scheduleTime,
      recurrence: data.recurrence,
      status: data.scanType === 'INSTANT' ? 'RUNNING' : 'SCHEDULED',
      scheduledTime: data.scheduleTime,
      nextRun,
      createdBy: userId,
    },
  });

  // For instant scans, trigger the actual vulnerability scan and track completion
  if (data.scanType === 'INSTANT') {
    logger.info({ jobId, scope: data.scope }, 'Triggering vulnerability scan');
    executeAndTrackScan(job.id, data.scope, data.endpoints, userId).catch((err) => {
      logger.error({ err, jobId }, 'Vulnerability job background execution failed');
    });
  }

  return {
    id: job.id,
    jobId: job.jobId,
    name: job.name,
    status: job.status,
    nextRun: job.nextRun?.toISOString() || null,
    createdBy: job.createdBy,
    createdOn: formatDate(job.createdAt),
  };
}

/**
 * Calculate the next run date for recurring vulnerability jobs.
 */
export function calculateNextRun(recurrence: string | null, baseDate: Date = new Date()): Date | null {
  if (!recurrence || recurrence === 'once') return null;

  const next = new Date(baseDate);
  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      return next;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      return next;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      return next;
    default:
      return null;
  }
}

/**
 * Execute a vulnerability scan and update the VulnerabilityJob status when done.
 * Runs in the background (non-blocking).
 */
export async function executeAndTrackScan(
  vulnerabilityJobId: string,
  scope: string,
  endpoints: string[] | undefined,
  userId: string
) {
  try {
    // Dynamic import to avoid circular dependency
    const { vulnerabilitiesService } = await import('@modules/vulnerabilities/vulnerabilities.service');

    // Map VulnerabilityJob scope to scan scope
    const scanScope: 'ALL' | 'SELECTED' = scope === 'GLOBAL' ? 'ALL' : 'SELECTED';
    const endpointIds = scope !== 'GLOBAL' ? endpoints : undefined;

    const scanResult = await vulnerabilitiesService.triggerScan(
      { scope: scanScope, endpointIds },
      userId
    );

    // Poll the scan Job until it completes (max 30 minutes — scans can take 7-20 min with large CVE databases)
    const scanJobId = scanResult.jobId;
    const maxWaitMs = 30 * 60 * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const scanJob = await prisma.job.findUnique({ where: { id: scanJobId } });
      if (!scanJob || scanJob.status === 'COMPLETED') {
        // Look up recurrence for next run calculation
        const vulnJob = await prisma.vulnerabilityJob.findUnique({ where: { id: vulnerabilityJobId } });
        const nextRun = vulnJob ? calculateNextRun(vulnJob.recurrence || null) : null;
        await prisma.vulnerabilityJob.update({
          where: { id: vulnerabilityJobId },
          data: {
            status: nextRun ? 'SCHEDULED' : 'COMPLETED',
            lastRun: new Date(),
            nextRun,
            ...(scanJob?.result != null ? { result: scanJob.result } : {}),
          },
        });
        return;
      }
      if (scanJob.status === 'FAILED') {
        await prisma.vulnerabilityJob.update({
          where: { id: vulnerabilityJobId },
          data: {
            status: 'FAILED',
            lastRun: new Date(),
            ...(scanJob.result != null ? { result: scanJob.result } : {}),
          },
        });
        return;
      }
    }

    // Timed out waiting
    await prisma.vulnerabilityJob.update({
      where: { id: vulnerabilityJobId },
      data: { status: 'FAILED', lastRun: new Date() },
    });
  } catch (error) {
    // Mark as failed on any error
    await prisma.vulnerabilityJob.update({
      where: { id: vulnerabilityJobId },
      data: { status: 'FAILED', lastRun: new Date() },
    }).catch(() => {}); // Ignore update errors during error handling
    throw error;
  }
}

export async function deleteVulnerabilityJob(id: string) {
  const job = await prisma.vulnerabilityJob.findFirst({
    where: { OR: [{ id }, { jobId: id }] },
  });

  if (!job) {
    throw new NotFoundError('Vulnerability job not found');
  }

  await prisma.vulnerabilityJob.delete({ where: { id: job.id } });

  return { message: 'Vulnerability job deleted successfully' };
}

// ============================================
// Vulnerability DB Sync Service
// ============================================

export async function getVulnerabilityDBSync() {
  const sync = await prisma.vulnerabilityDBSync.findFirst();

  if (!sync) {
    return {
      scanJobInterval: 24,
      scanJobUnit: 'Hour',
      databaseSyncTime: '02:00:00',
      lastSync: null,
      totalCVE: 0,
    };
  }

  return {
    scanJobInterval: sync.scanJobInterval,
    scanJobUnit: sync.scanJobUnit,
    databaseSyncTime: sync.databaseSyncTime,
    lastSync: sync.lastSync?.toISOString() || null,
    totalCVE: sync.totalCVE,
  };
}

export async function updateVulnerabilityDBSync(data: UpdateVulnerabilityDBSyncInput) {
  const existing = await prisma.vulnerabilityDBSync.findFirst();

  if (existing) {
    const updated = await prisma.vulnerabilityDBSync.update({
      where: { id: existing.id },
      data: {
        scanJobInterval: data.scanJobInterval,
        scanJobUnit: data.scanJobUnit,
        databaseSyncTime: data.databaseSyncTime,
      },
    });

    return {
      message: 'DB sync config updated successfully',
      scanJobInterval: updated.scanJobInterval,
      scanJobUnit: updated.scanJobUnit,
      databaseSyncTime: updated.databaseSyncTime,
      lastSync: updated.lastSync?.toISOString() || null,
      totalCVE: updated.totalCVE,
    };
  }

  const created = await prisma.vulnerabilityDBSync.create({
    data: {
      scanJobInterval: data.scanJobInterval,
      scanJobUnit: data.scanJobUnit,
      databaseSyncTime: data.databaseSyncTime,
    },
  });

  return {
    message: 'DB sync config created successfully',
    scanJobInterval: created.scanJobInterval,
    scanJobUnit: created.scanJobUnit,
    databaseSyncTime: created.databaseSyncTime,
    lastSync: created.lastSync?.toISOString() || null,
    totalCVE: created.totalCVE,
  };
}

export async function triggerVulnerabilityDBSync() {
  const { queueCveSyncJob } = await import('@modules/vulnerabilities/cve-sync.worker');
  const result = await queueCveSyncJob({ incremental: true });

  return {
    message: result.alreadyRunning ? 'CVE sync already in progress' : 'CVE database sync queued',
    jobId: result.jobId,
  };
}

// ============================================
// Software Deployment Service
// ============================================

export async function listSoftwareDeployments(params: SoftwareDeploymentListQuery) {
  const where: Prisma.SoftwareDeploymentWhereInput = {};

  if (params.status) where.status = params.status;

  const [deployments, total] = await Promise.all([
    prisma.softwareDeployment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.softwareDeployment.count({ where }),
  ]);

  return paginate(
    deployments.map((dep) => ({
      id: dep.id,
      deploymentId: dep.deploymentId,
      deploymentName: dep.deploymentName,
      description: dep.description,
      deploymentType: dep.deploymentType,
      selectionType: dep.selectionType,
      selectedItems: dep.selectedItems,
      scope: dep.scope,
      endpoints: dep.endpoints,
      deploymentPolicy: dep.deploymentPolicy,
      retryCount: dep.retryCount,
      notifyTo: dep.notifyTo,
      status: dep.status,
      pending: dep.pending,
      succeeded: dep.succeeded,
      failed: dep.failed,
      createdBy: dep.createdBy,
      createdOn: formatDate(dep.createdAt),
    })),
    total,
    { page: params.page, limit: params.limit }
  );
}

export async function getSoftwareDeploymentById(id: string) {
  const dep = await prisma.softwareDeployment.findFirst({
    where: { OR: [{ id }, { deploymentId: id }] },
  });

  if (!dep) {
    throw new NotFoundError('Deployment not found');
  }

  return {
    id: dep.id,
    deploymentId: dep.deploymentId,
    deploymentName: dep.deploymentName,
    description: dep.description,
    deploymentType: dep.deploymentType,
    selectionType: dep.selectionType,
    selectedItems: dep.selectedItems,
    scope: dep.scope,
    endpoints: dep.endpoints,
    deploymentPolicy: dep.deploymentPolicy,
    retryCount: dep.retryCount,
    notifyTo: dep.notifyTo,
    status: dep.status,
    pending: dep.pending,
    succeeded: dep.succeeded,
    failed: dep.failed,
    createdBy: dep.createdBy,
    createdOn: formatDate(dep.createdAt),
  };
}

export async function createSoftwareDeployment(data: CreateSoftwareDeploymentInput, userId: string) {
  const dep = await withTransaction('createSoftwareDeployment', async (tx) => {
    const deploymentId = await generatePolicyId('ADR', 'softwareDeployment');

    return tx.softwareDeployment.create({
      data: {
        deploymentId,
        deploymentName: data.deploymentName,
        description: data.description,
        deploymentType: data.deploymentType,
        selectionType: data.selectionType,
        selectedItems: data.selectedItems,
        scope: data.scope,
        endpoints: data.endpoints || [],
        deploymentPolicy: data.deploymentPolicy,
        retryCount: data.retryCount,
        notifyTo: data.notifyTo,
        status: 'IN_PROGRESS',
        pending: data.selectedItems.length,
        createdBy: userId,
      },
    });
  });

  return {
    id: dep.id,
    deploymentId: dep.deploymentId,
    deploymentName: dep.deploymentName,
    status: dep.status,
    pending: dep.pending,
    succeeded: dep.succeeded,
    failed: dep.failed,
    createdBy: dep.createdBy,
    createdOn: formatDate(dep.createdAt),
  };
}

export async function getSoftwareDeploymentTasks(id: string) {
  const dep = await prisma.softwareDeployment.findFirst({
    where: { OR: [{ id }, { deploymentId: id }] },
  });

  if (!dep) {
    throw new NotFoundError('Deployment not found');
  }

  const tasks = await prisma.softwareDeploymentTask.findMany({
    where: { deploymentId: dep.id },
    orderBy: { createdAt: 'desc' },
  });

  return {
    data: tasks.map((task) => ({
      id: task.id,
      deploymentId: dep.deploymentId,
      endpoint: {
        name: task.agentName,
        os: task.agentOs,
        status: 'Online',
      },
      name: task.packageName,
      status: task.status,
      createdBy: task.createdBy,
      lastUpdated: formatDate(task.updatedAt),
      createdOn: formatDate(task.createdAt),
    })),
    total: tasks.length,
  };
}

export async function deleteSoftwareDeployment(id: string) {
  const existing = await prisma.softwareDeployment.findFirst({
    where: { OR: [{ id }, { deploymentId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Deployment not found');
  }

  await prisma.softwareDeployment.delete({ where: { id: existing.id } });

  return { message: 'Deployment deleted successfully' };
}

// ============================================
// Configuration Catalog Service
// ============================================

export async function listConfigCatalog(params: ConfigCatalogListQuery) {
  const where: Prisma.ConfigCatalogWhereInput = {};

  if (params.os) where.os = params.os;
  if (params.search) {
    where.name = { contains: params.search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.configCatalog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.configCatalog.count({ where }),
  ]);

  return paginate(
    items.map((item) => ({
      id: item.id,
      configurationId: item.configurationId,
      name: item.name,
      os: item.os,
      description: item.description,
      tags: item.tags,
      configurationType: item.configurationType,
      architecture: item.architecture,
      isRemediation: item.isRemediation,
      commandType: item.commandType,
      command: item.command,
      createdBy: item.createdBy,
      createdOn: formatDate(item.createdAt),
    })),
    total,
    { page: params.page, limit: params.limit }
  );
}

export async function getConfigCatalogById(id: string) {
  const item = await prisma.configCatalog.findFirst({
    where: { OR: [{ id }, { configurationId: id }] },
  });

  if (!item) {
    throw new NotFoundError('Configuration not found');
  }

  return {
    id: item.id,
    configurationId: item.configurationId,
    name: item.name,
    os: item.os,
    description: item.description,
    tags: item.tags,
    configurationType: item.configurationType,
    architecture: item.architecture,
    isRemediation: item.isRemediation,
    commandType: item.commandType,
    command: item.command,
    createdBy: item.createdBy,
    createdOn: formatDate(item.createdAt),
  };
}

export async function createConfigCatalog(data: CreateConfigCatalogInput, userId: string) {
  const configurationId = await generatePolicyId('CFG', 'configCatalog');

  const item = await prisma.configCatalog.create({
    data: {
      configurationId,
      name: data.name,
      os: data.os,
      description: data.description,
      tags: data.tags || [],
      configurationType: data.configurationType,
      architecture: data.architecture,
      isRemediation: data.isRemediation,
      commandType: data.commandType,
      command: data.command,
      createdBy: userId,
    },
  });

  return {
    id: item.id,
    configurationId: item.configurationId,
    name: item.name,
    os: item.os,
    createdBy: item.createdBy,
    createdOn: formatDate(item.createdAt),
  };
}

export async function updateConfigCatalog(id: string, data: UpdateConfigCatalogInput) {
  const existing = await prisma.configCatalog.findFirst({
    where: { OR: [{ id }, { configurationId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Configuration not found');
  }

  const updated = await prisma.configCatalog.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      os: data.os,
      description: data.description,
      tags: data.tags,
      configurationType: data.configurationType,
      architecture: data.architecture,
      isRemediation: data.isRemediation,
      commandType: data.commandType,
      command: data.command,
    },
  });

  return {
    id: updated.id,
    configurationId: updated.configurationId,
    name: updated.name,
    os: updated.os,
    createdBy: updated.createdBy,
    createdOn: formatDate(updated.createdAt),
  };
}

export async function deleteConfigCatalog(id: string) {
  const existing = await prisma.configCatalog.findFirst({
    where: { OR: [{ id }, { configurationId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Configuration not found');
  }

  await prisma.configCatalog.delete({ where: { id: existing.id } });

  return { message: 'Configuration deleted successfully' };
}

// ============================================
// Configuration Bundle Service
// ============================================

export async function listConfigBundles(params: ConfigBundleListQuery) {
  const where: Prisma.ConfigBundleWhereInput = {};

  if (params.os) where.os = params.os;

  const [bundles, total] = await Promise.all([
    prisma.configBundle.findMany({
      where,
      include: { items: { include: { config: true } } },
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.configBundle.count({ where }),
  ]);

  return paginate(
    bundles.map((bundle) => ({
      id: bundle.id,
      bundleId: bundle.bundleId,
      bundleName: bundle.bundleName,
      os: bundle.os,
      description: bundle.description,
      configurations: bundle.items.map((item) => item.configId),
      createdBy: bundle.createdBy,
      createdOn: formatDate(bundle.createdAt),
    })),
    total,
    { page: params.page, limit: params.limit }
  );
}

export async function getConfigBundleById(id: string) {
  const bundle = await prisma.configBundle.findFirst({
    where: { OR: [{ id }, { bundleId: id }] },
    include: { items: { include: { config: true } } },
  });

  if (!bundle) {
    throw new NotFoundError('Bundle not found');
  }

  return {
    id: bundle.id,
    bundleId: bundle.bundleId,
    bundleName: bundle.bundleName,
    os: bundle.os,
    description: bundle.description,
    configurations: bundle.items.map((item) => item.configId),
    createdBy: bundle.createdBy,
    createdOn: formatDate(bundle.createdAt),
  };
}

export async function createConfigBundle(data: CreateConfigBundleInput, userId: string) {
  const bundleId = await generatePolicyId('CBND', 'configBundle');

  const bundle = await prisma.configBundle.create({
    data: {
      bundleId,
      bundleName: data.bundleName,
      os: data.os,
      description: data.description,
      createdBy: userId,
      items: {
        create: data.configurations.map((configId) => ({ configId })),
      },
    },
    include: { items: true },
  });

  return {
    id: bundle.id,
    bundleId: bundle.bundleId,
    bundleName: bundle.bundleName,
    os: bundle.os,
    configurations: bundle.items.map((item) => item.configId),
    createdBy: bundle.createdBy,
    createdOn: formatDate(bundle.createdAt),
  };
}

export async function updateConfigBundle(id: string, data: UpdateConfigBundleInput) {
  const existing = await prisma.configBundle.findFirst({
    where: { OR: [{ id }, { bundleId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Bundle not found');
  }

  // Delete existing items and recreate
  await prisma.configBundleItem.deleteMany({ where: { bundleId: existing.id } });

  const updated = await prisma.configBundle.update({
    where: { id: existing.id },
    data: {
      bundleName: data.bundleName,
      os: data.os,
      description: data.description,
      items: data.configurations
        ? { create: data.configurations.map((configId) => ({ configId })) }
        : undefined,
    },
    include: { items: true },
  });

  return {
    id: updated.id,
    bundleId: updated.bundleId,
    bundleName: updated.bundleName,
    os: updated.os,
    configurations: updated.items.map((item) => item.configId),
    createdBy: updated.createdBy,
    createdOn: formatDate(updated.createdAt),
  };
}

export async function deleteConfigBundle(id: string) {
  const existing = await prisma.configBundle.findFirst({
    where: { OR: [{ id }, { bundleId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Bundle not found');
  }

  await prisma.configBundle.delete({ where: { id: existing.id } });

  return { message: 'Bundle deleted successfully' };
}

// ============================================
// Configuration Deployment Service
// ============================================

export async function listConfigDeployments(params: ConfigDeploymentListQuery) {
  const where: Prisma.ConfigDeploymentWhereInput = {};

  if (params.status) where.status = params.status;

  const [deployments, total] = await Promise.all([
    prisma.configDeployment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.configDeployment.count({ where }),
  ]);

  return paginate(
    deployments.map((dep) => ({
      id: dep.id,
      deploymentId: dep.deploymentId,
      deploymentName: dep.deploymentName,
      description: dep.description,
      selectionType: dep.selectionType,
      selectedItems: dep.selectedItems,
      scope: dep.scope,
      endpoints: dep.endpoints,
      deploymentPolicy: dep.deploymentPolicy,
      retryCount: dep.retryCount,
      notifyTo: dep.notifyTo,
      status: dep.status,
      pending: dep.pending,
      succeeded: dep.succeeded,
      failed: dep.failed,
      createdBy: dep.createdBy,
      createdOn: formatDate(dep.createdAt),
    })),
    total,
    { page: params.page, limit: params.limit }
  );
}

export async function createConfigDeployment(data: CreateConfigDeploymentInput, userId: string) {
  // If targetAgentIds are provided, use the deployment executor for real agent execution
  const targetAgentIds = data.endpoints || [];
  if (targetAgentIds.length > 0 && (data.selectedItems?.length > 0)) {
    try {
      const { deploymentExecutorService } = await import('@modules/deployments/deployment-executor.service');
      const result = await deploymentExecutorService.createConfigDeployment({
        name: data.deploymentName,
        description: data.description,
        targetAgentIds,
        configurationIds: data.selectionType === 'CONFIGURATION' ? data.selectedItems : undefined,
        bundleIds: data.selectionType === 'BUNDLE' ? data.selectedItems : undefined,
        selectionType: data.selectionType as 'CONFIGURATION' | 'BUNDLE',
        retryCount: data.retryCount,
        createdBy: userId,
      });
      return {
        id: result.deploymentId,
        deploymentId: result.deploymentId,
        deploymentName: data.deploymentName,
        status: 'IN_PROGRESS',
        pending: result.tasksCreated,
        succeeded: 0,
        failed: 0,
        createdBy: userId,
        createdOn: formatDate(new Date()),
      };
    } catch (err) {
      logger.error({ err }, 'Config deployment executor failed, falling back to record-only');
    }
  }

  // Fallback: create record without agent execution
  const dep = await withTransaction('createConfigDeployment', async (tx) => {
    const deploymentId = await generatePolicyId('CDR', 'configDeployment');

    return tx.configDeployment.create({
      data: {
        deploymentId,
        deploymentName: data.deploymentName,
        description: data.description,
        selectionType: data.selectionType,
        selectedItems: data.selectedItems,
        scope: data.scope,
        endpoints: data.endpoints || [],
        deploymentPolicy: data.deploymentPolicy,
        retryCount: data.retryCount,
        notifyTo: data.notifyTo,
        status: 'IN_PROGRESS',
        pending: data.selectedItems.length,
        createdBy: userId,
      },
    });
  });

  return {
    id: dep.id,
    deploymentId: dep.deploymentId,
    deploymentName: dep.deploymentName,
    status: dep.status,
    pending: dep.pending,
    succeeded: dep.succeeded,
    failed: dep.failed,
    createdBy: dep.createdBy,
    createdOn: formatDate(dep.createdAt),
  };
}

export async function getConfigDeploymentTasks(id: string) {
  const dep = await prisma.configDeployment.findFirst({
    where: { OR: [{ id }, { deploymentId: id }] },
  });

  if (!dep) {
    throw new NotFoundError('Deployment not found');
  }

  const tasks = await prisma.configDeploymentTask.findMany({
    where: { deploymentId: dep.id },
    orderBy: { createdAt: 'desc' },
  });

  return {
    data: tasks.map((task) => ({
      id: task.id,
      deploymentId: dep.deploymentId,
      endpoint: {
        name: task.agentName,
        os: task.agentOs,
        status: 'Online',
      },
      name: task.configName,
      status: task.status,
      createdBy: task.createdBy,
      lastUpdated: formatDate(task.updatedAt),
      createdOn: formatDate(task.createdAt),
    })),
    total: tasks.length,
  };
}

export async function deleteConfigDeployment(id: string) {
  const existing = await prisma.configDeployment.findFirst({
    where: { OR: [{ id }, { deploymentId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Deployment not found');
  }

  await prisma.configDeployment.delete({ where: { id: existing.id } });

  return { message: 'Deployment deleted successfully' };
}

// ============================================
// Deployment Policy Service
// ============================================

export async function listDeploymentPolicies(params: DeploymentPolicyListQuery) {
  const where: Prisma.DeploymentPolicyWhereInput = {};

  if (params.type) where.type = params.type;

  const [policies, total] = await Promise.all([
    prisma.deploymentPolicy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.deploymentPolicy.count({ where }),
  ]);

  return paginate(
    policies.map((policy) => ({
      id: policy.id,
      policyId: policy.policyId,
      name: policy.name,
      description: policy.description,
      type: policy.type,
      supportedModule: policy.supportedModule,
      relatedType: policy.relatedType,
      createdBy: policy.createdBy,
      createdOn: formatDate(policy.createdAt),
    })),
    total,
    { page: params.page, limit: params.limit }
  );
}

export async function getDeploymentPolicyById(id: string) {
  const policy = await prisma.deploymentPolicy.findFirst({
    where: { OR: [{ id }, { policyId: id }] },
  });

  if (!policy) {
    throw new NotFoundError('Policy not found');
  }

  return {
    id: policy.id,
    policyId: policy.policyId,
    name: policy.name,
    description: policy.description,
    type: policy.type,
    supportedModule: policy.supportedModule,
    relatedType: policy.relatedType,
    createdBy: policy.createdBy,
    createdOn: formatDate(policy.createdAt),
  };
}

export async function createDeploymentPolicy(data: CreateDeploymentPolicyInput, userId: string) {
  const policyId = await generatePolicyId('DPOL', 'deploymentPolicy');

  const policy = await prisma.deploymentPolicy.create({
    data: {
      policyId,
      name: data.name,
      description: data.description,
      type: data.type,
      supportedModule: data.supportedModule,
      relatedType: data.relatedType,
      createdBy: userId,
    },
  });

  return {
    id: policy.id,
    policyId: policy.policyId,
    name: policy.name,
    description: policy.description,
    type: policy.type,
    supportedModule: policy.supportedModule,
    relatedType: policy.relatedType,
    createdBy: policy.createdBy,
    createdOn: formatDate(policy.createdAt),
  };
}

export async function updateDeploymentPolicy(id: string, data: UpdateDeploymentPolicyInput) {
  const existing = await prisma.deploymentPolicy.findFirst({
    where: { OR: [{ id }, { policyId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Policy not found');
  }

  const updated = await prisma.deploymentPolicy.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      description: data.description,
      type: data.type,
      supportedModule: data.supportedModule,
      relatedType: data.relatedType,
    },
  });

  return {
    id: updated.id,
    policyId: updated.policyId,
    name: updated.name,
    description: updated.description,
    type: updated.type,
    supportedModule: updated.supportedModule,
    relatedType: updated.relatedType,
    createdBy: updated.createdBy,
    createdOn: formatDate(updated.createdAt),
  };
}

export async function deleteDeploymentPolicy(id: string) {
  const existing = await prisma.deploymentPolicy.findFirst({
    where: { OR: [{ id }, { policyId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Policy not found');
  }

  await prisma.deploymentPolicy.delete({ where: { id: existing.id } });

  return { message: 'Policy deleted successfully' };
}
