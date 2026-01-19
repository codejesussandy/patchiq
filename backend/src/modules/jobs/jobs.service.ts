import { prisma } from '@/db/client';
import { NotFoundError } from '@shared/errors';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import { formatDate } from '@shared/utils/date';
import type { Prisma } from '@prisma/client';
import type {
  CreatePatchJobInput,
  PatchJobListQuery,
  CreateVulnerabilityJobInput,
  VulnerabilityJobListQuery,
  UpdateVulnerabilityDBSyncInput,
  CreateSoftwareCatalogInput,
  UpdateSoftwareCatalogInput,
  SoftwareCatalogListQuery,
  CreateSoftwareBundleInput,
  UpdateSoftwareBundleInput,
  SoftwareBundleListQuery,
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
  let count = 0;
  switch (model) {
    case 'patchJob':
      count = await prisma.patchJob.count();
      break;
    case 'vulnerabilityJob':
      count = await prisma.vulnerabilityJob.count();
      break;
    case 'softwareCatalog':
      count = await prisma.softwareCatalog.count();
      break;
    case 'softwareBundle':
      count = await prisma.softwareBundle.count();
      break;
    case 'softwareDeployment':
      count = await prisma.softwareDeployment.count();
      break;
    case 'configCatalog':
      count = await prisma.configCatalog.count();
      break;
    case 'configBundle':
      count = await prisma.configBundle.count();
      break;
    case 'configDeployment':
      count = await prisma.configDeployment.count();
      break;
    case 'deploymentPolicy':
      count = await prisma.deploymentPolicy.count();
      break;
  }
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
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
    createdBy: job.createdBy,
    createdOn: formatDate(job.createdAt),
  };
}

export async function createVulnerabilityJob(data: CreateVulnerabilityJobInput, userId: string) {
  const jobId = await generatePolicyId('VULN-JOB', 'vulnerabilityJob');

  let nextRun: Date | null = null;
  if (data.scanType === 'scheduled' && data.scheduleDate && data.scheduleTime) {
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
      status: data.scanType === 'instant' ? 'RUNNING' : 'SCHEDULED',
      scheduledTime: data.scheduleTime,
      nextRun,
      createdBy: userId,
    },
  });

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
  const sync = await prisma.vulnerabilityDBSync.findFirst();

  if (sync) {
    await prisma.vulnerabilityDBSync.update({
      where: { id: sync.id },
      data: { lastSync: new Date() },
    });
  }

  // TODO: Queue actual NIST NVD sync job
  return {
    message: 'Database sync initiated',
    jobId: `sync-${Date.now()}`,
  };
}

// ============================================
// Software Catalog Service
// ============================================

export async function listSoftwareCatalog(params: SoftwareCatalogListQuery) {
  const where: Prisma.SoftwareCatalogWhereInput = {};

  if (params.os) where.os = params.os;
  if (params.search) {
    where.applicationName = { contains: params.search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.softwareCatalog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.softwareCatalog.count({ where }),
  ]);

  return paginate(
    items.map((item) => ({
      id: item.id,
      deploymentId: item.deploymentId,
      applicationName: item.applicationName,
      description: item.description,
      tags: item.tags,
      os: item.os,
      version: item.version,
      applicationLocationType: item.applicationLocationType,
      installationCommand: item.installationCommand,
      uninstallationCommand: item.uninstallationCommand,
      upgradeCommand: item.upgradeCommand,
      iconUrl: item.iconUrl,
      selfService: item.selfService,
      architecture: item.architecture,
      applicationType: item.applicationType,
      applicationFileUrl: item.applicationFileUrl,
      createdBy: item.createdBy,
      createdOn: formatDate(item.createdAt),
    })),
    total,
    { page: params.page, limit: params.limit }
  );
}

export async function getSoftwareCatalogById(id: string) {
  const item = await prisma.softwareCatalog.findFirst({
    where: { OR: [{ id }, { deploymentId: id }] },
  });

  if (!item) {
    throw new NotFoundError('Software not found');
  }

  return {
    id: item.id,
    deploymentId: item.deploymentId,
    applicationName: item.applicationName,
    description: item.description,
    tags: item.tags,
    os: item.os,
    version: item.version,
    applicationLocationType: item.applicationLocationType,
    installationCommand: item.installationCommand,
    uninstallationCommand: item.uninstallationCommand,
    upgradeCommand: item.upgradeCommand,
    iconUrl: item.iconUrl,
    selfService: item.selfService,
    architecture: item.architecture,
    applicationType: item.applicationType,
    applicationFileUrl: item.applicationFileUrl,
    createdBy: item.createdBy,
    createdOn: formatDate(item.createdAt),
  };
}

export async function createSoftwareCatalog(data: CreateSoftwareCatalogInput, userId: string) {
  const deploymentId = await generatePolicyId('SWP', 'softwareCatalog');

  const item = await prisma.softwareCatalog.create({
    data: {
      deploymentId,
      applicationName: data.applicationName,
      description: data.description,
      tags: data.tags || [],
      os: data.os,
      version: data.version,
      applicationLocationType: data.applicationLocationType,
      installationCommand: data.installationCommand,
      uninstallationCommand: data.uninstallationCommand,
      upgradeCommand: data.upgradeCommand,
      iconUrl: data.iconUrl,
      selfService: data.selfService,
      architecture: data.architecture,
      applicationType: data.applicationType,
      applicationFileUrl: data.applicationFileUrl,
      createdBy: userId,
    },
  });

  return {
    id: item.id,
    deploymentId: item.deploymentId,
    applicationName: item.applicationName,
    os: item.os,
    createdBy: item.createdBy,
    createdOn: formatDate(item.createdAt),
  };
}

export async function updateSoftwareCatalog(id: string, data: UpdateSoftwareCatalogInput) {
  const existing = await prisma.softwareCatalog.findFirst({
    where: { OR: [{ id }, { deploymentId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Software not found');
  }

  const updated = await prisma.softwareCatalog.update({
    where: { id: existing.id },
    data: {
      applicationName: data.applicationName,
      description: data.description,
      tags: data.tags,
      os: data.os,
      version: data.version,
      applicationLocationType: data.applicationLocationType,
      installationCommand: data.installationCommand,
      uninstallationCommand: data.uninstallationCommand,
      upgradeCommand: data.upgradeCommand,
      iconUrl: data.iconUrl,
      selfService: data.selfService,
      architecture: data.architecture,
      applicationType: data.applicationType,
      applicationFileUrl: data.applicationFileUrl,
    },
  });

  return {
    id: updated.id,
    deploymentId: updated.deploymentId,
    applicationName: updated.applicationName,
    os: updated.os,
    createdBy: updated.createdBy,
    createdOn: formatDate(updated.createdAt),
  };
}

export async function deleteSoftwareCatalog(id: string) {
  const existing = await prisma.softwareCatalog.findFirst({
    where: { OR: [{ id }, { deploymentId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Software not found');
  }

  await prisma.softwareCatalog.delete({ where: { id: existing.id } });

  return { message: 'Software deleted successfully' };
}

// ============================================
// Software Bundle Service
// ============================================

export async function listSoftwareBundles(params: SoftwareBundleListQuery) {
  const where: Prisma.SoftwareBundleWhereInput = {};

  if (params.os) where.os = params.os;

  const [bundles, total] = await Promise.all([
    prisma.softwareBundle.findMany({
      where,
      include: { items: { include: { software: true } } },
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.softwareBundle.count({ where }),
  ]);

  return paginate(
    bundles.map((bundle) => ({
      id: bundle.id,
      bundleId: bundle.bundleId,
      bundleName: bundle.bundleName,
      os: bundle.os,
      description: bundle.description,
      applications: bundle.items.map((item) => item.softwareId),
      createdBy: bundle.createdBy,
      createdOn: formatDate(bundle.createdAt),
    })),
    total,
    { page: params.page, limit: params.limit }
  );
}

export async function getSoftwareBundleById(id: string) {
  const bundle = await prisma.softwareBundle.findFirst({
    where: { OR: [{ id }, { bundleId: id }] },
    include: { items: { include: { software: true } } },
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
    applications: bundle.items.map((item) => item.softwareId),
    createdBy: bundle.createdBy,
    createdOn: formatDate(bundle.createdAt),
  };
}

export async function createSoftwareBundle(data: CreateSoftwareBundleInput, userId: string) {
  const bundleId = await generatePolicyId('BND', 'softwareBundle');

  const bundle = await prisma.softwareBundle.create({
    data: {
      bundleId,
      bundleName: data.bundleName,
      os: data.os,
      description: data.description,
      createdBy: userId,
      items: {
        create: data.applications.map((softwareId) => ({ softwareId })),
      },
    },
    include: { items: true },
  });

  return {
    id: bundle.id,
    bundleId: bundle.bundleId,
    bundleName: bundle.bundleName,
    os: bundle.os,
    applications: bundle.items.map((item) => item.softwareId),
    createdBy: bundle.createdBy,
    createdOn: formatDate(bundle.createdAt),
  };
}

export async function updateSoftwareBundle(id: string, data: UpdateSoftwareBundleInput) {
  const existing = await prisma.softwareBundle.findFirst({
    where: { OR: [{ id }, { bundleId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Bundle not found');
  }

  // Delete existing items and recreate
  await prisma.softwareBundleItem.deleteMany({ where: { bundleId: existing.id } });

  const updated = await prisma.softwareBundle.update({
    where: { id: existing.id },
    data: {
      bundleName: data.bundleName,
      os: data.os,
      description: data.description,
      items: data.applications
        ? { create: data.applications.map((softwareId) => ({ softwareId })) }
        : undefined,
    },
    include: { items: true },
  });

  return {
    id: updated.id,
    bundleId: updated.bundleId,
    bundleName: updated.bundleName,
    os: updated.os,
    applications: updated.items.map((item) => item.softwareId),
    createdBy: updated.createdBy,
    createdOn: formatDate(updated.createdAt),
  };
}

export async function deleteSoftwareBundle(id: string) {
  const existing = await prisma.softwareBundle.findFirst({
    where: { OR: [{ id }, { bundleId: id }] },
  });

  if (!existing) {
    throw new NotFoundError('Bundle not found');
  }

  await prisma.softwareBundle.delete({ where: { id: existing.id } });

  return { message: 'Bundle deleted successfully' };
}

// ============================================
// Software Deployment Service
// ============================================

export async function listSoftwareDeployments(params: SoftwareDeploymentListQuery) {
  const where: Prisma.SoftwareDeploymentWhereInput = {};

  if (params.stage) where.stage = params.stage;

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
      stage: dep.stage,
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
    stage: dep.stage,
    pending: dep.pending,
    succeeded: dep.succeeded,
    failed: dep.failed,
    createdBy: dep.createdBy,
    createdOn: formatDate(dep.createdAt),
  };
}

export async function createSoftwareDeployment(data: CreateSoftwareDeploymentInput, userId: string) {
  const deploymentId = await generatePolicyId('ADR', 'softwareDeployment');

  const dep = await prisma.softwareDeployment.create({
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
      stage: 'IN_PROGRESS',
      pending: data.selectedItems.length,
      createdBy: userId,
    },
  });

  return {
    id: dep.id,
    deploymentId: dep.deploymentId,
    deploymentName: dep.deploymentName,
    stage: dep.stage,
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
        name: task.endpointName,
        os: task.endpointOs,
        status: 'Online',
      },
      name: task.itemName,
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

  if (params.stage) where.stage = params.stage;

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
      stage: dep.stage,
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
  const deploymentId = await generatePolicyId('CDR', 'configDeployment');

  const dep = await prisma.configDeployment.create({
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
      stage: 'IN_PROGRESS',
      pending: data.selectedItems.length,
      createdBy: userId,
    },
  });

  return {
    id: dep.id,
    deploymentId: dep.deploymentId,
    deploymentName: dep.deploymentName,
    stage: dep.stage,
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
        name: task.endpointName,
        os: task.endpointOs,
        status: 'Online',
      },
      name: task.itemName,
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
