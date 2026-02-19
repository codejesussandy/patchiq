import type { Prisma } from '@prisma/client';
import type { PatchInstallPayload } from '@modules/deployments';
import { deploymentExecutorService } from '@modules/deployments';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import { prisma } from '@/db/client';

import { generateDeploymentId, transformPatch, transformDeployment } from './patches.helpers';
import type {
  CreateDeploymentInput,
  DeploymentListQuery,
  CreatePatchDeploymentFromUIInput,
} from '@modules/deployments/deployment.validators';

const logger = createLogger('patches');

// ============================================
// Deployments
// ============================================

export async function listDeployments(params: DeploymentListQuery) {
  const where: Prisma.PatchDeploymentWhereInput = {};

  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;

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
  const deploymentId = await generateDeploymentId();

  const patches = await prisma.patch.findMany({
    where: {
      id: { in: data.patches },
    },
  });

  if (patches.length !== data.patches.length) {
    throw new BadRequestError('One or more patches not found');
  }

  const approvalSetting = await prisma.setting.findUnique({
    where: { key: 'patch-management.requireApprovalForDeployment' },
  });
  const requireApproval = approvalSetting?.value === true;

  if (requireApproval && !data.skipApprovalCheck) {
    const unapprovedPatches = patches.filter(p => p.approvalStatus !== 'APPROVED');
    if (unapprovedPatches.length > 0) {
      const names = unapprovedPatches.map(p => `${p.patchId || p.id} (${p.approvalStatus})`).join(', ');
      throw new BadRequestError(
        `Cannot deploy unapproved patches when approval enforcement is enabled. Unapproved: ${names}`,
        { unapprovedPatchIds: unapprovedPatches.map(p => p.id) },
      );
    }
  }

  if (requireApproval && data.skipApprovalCheck) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'APPROVAL_OVERRIDE',
        resource: 'deployments',
        details: { patchIds: data.patches, reason: 'skipApprovalCheck flag was set' },
      },
    });
  }

  const deployment = await prisma.patchDeployment.create({
    data: {
      name: data.name,
      deploymentId,
      description: data.description,
      type: data.type,
      configType: data.configType || 'INSTALL',
      scope: data.scope || 'ENDPOINT',
      status: data.schedule ? 'PENDING' : 'IN_PROGRESS',
      targetGroupIds: data.targetGroups || [],
      scheduledAt: data.schedule ? new Date(data.schedule) : null,
      triggerType: data.triggerType || 'manual',
      skipApprovalCheck: data.skipApprovalCheck || false,
      approvalOverrideBy: data.skipApprovalCheck ? userId : null,
      createdBy: userId,
      patches: {
        connect: data.patches.map((patchId) => ({ id: patchId })),
      },
    },
    include: {
      patches: true,
    },
  });

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

  if (existing.status === 'IN_PROGRESS') {
    throw new BadRequestError('Cannot delete deployment that is in progress');
  }

  await prisma.patchDeployment.delete({ where: { id } });

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

  if (existing.startedAt) {
    throw new BadRequestError('Cannot update deployment that has started execution');
  }

  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
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

  if (existing.status === 'COMPLETED') {
    throw new BadRequestError('Cannot cancel completed deployment');
  }

  const updated = await prisma.patchDeployment.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
    include: { patches: true },
  });

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
      tasks: true,
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  let targetEndpoints = 0;

  if (deployment.tasks.length > 0) {
    targetEndpoints = deployment.tasks.length;
  } else if (deployment.scope === 'GLOBAL') {
    targetEndpoints = await prisma.asset.count({
      where: { status: { not: 'RETIRED' } },
    });
  } else if (deployment.scope === 'GROUP' && deployment.targetGroupIds.length > 0) {
    const groups = await prisma.computerGroup.findMany({
      where: { id: { in: deployment.targetGroupIds } },
      select: { endpoints: true },
    });
    const uniqueEndpoints = new Set(groups.flatMap((g) => g.endpoints));
    targetEndpoints = uniqueEndpoints.size;
  } else if (deployment.scope === 'ENDPOINT' && deployment.targetAgentIds.length > 0) {
    const validEndpoints = await prisma.asset.count({
      where: { id: { in: deployment.targetAgentIds } },
    });
    targetEndpoints = validEndpoints;
  }

  const patchCount = deployment.patches.length;
  const totalOperations = patchCount * targetEndpoints;

  const tasksByStatus = deployment.tasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    deploymentId: id,
    patches: deployment.patches.map(transformPatch),
    targetEndpoints,
    totalOperations,
    taskBreakdown: {
      pending: tasksByStatus['PENDING'] || 0,
      inProgress: tasksByStatus['IN_PROGRESS'] || 0,
      completed: tasksByStatus['COMPLETED'] || 0,
      failed: tasksByStatus['FAILED'] || 0,
    },
  };
}

export async function executeDeployment(id: string, userId: string) {
  const deployment = await prisma.patchDeployment.findUnique({
    where: { id },
    include: {
      patches: true,
      tasks: true,
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  if (deployment.status === 'IN_PROGRESS') {
    throw new BadRequestError('Deployment is already in progress');
  }

  if (deployment.status === 'COMPLETED') {
    throw new BadRequestError('Deployment is already completed');
  }

  if (userId !== 'system') {
    const approvalSetting = await prisma.setting.findUnique({
      where: { key: 'patch-management.requireApprovalForDeployment' },
    });
    const requireApproval = approvalSetting?.value === true;

    if (requireApproval && !deployment.skipApprovalCheck) {
      const unapprovedPatches = deployment.patches.filter(p => p.approvalStatus !== 'APPROVED');
      if (unapprovedPatches.length > 0) {
        const names = unapprovedPatches.map(p => `${p.patchId || p.id} (${p.approvalStatus})`).join(', ');
        throw new BadRequestError(
          `Cannot execute deployment with unapproved patches. Unapproved: ${names}`,
          { unapprovedPatchIds: unapprovedPatches.map(p => p.id) },
        );
      }
    }
  }

  const supersededWarnings: string[] = [];
  for (const p of deployment.patches) {
    if (p.supersededBy && p.supersededBy.length > 0) {
      supersededWarnings.push(
        `Patch ${p.patchId || p.id} has been superseded by: ${p.supersededBy.join(', ')}`,
      );
    }
  }
  if (supersededWarnings.length > 0) {
    logger.warn({ supersededWarnings }, 'Executing deployment with superseded patches');
  }

  if (deployment.tasks.length > 0) {
    await prisma.patchDeployment.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  } else {
    let agentIds: string[] = [];

    if (deployment.scope === 'GLOBAL') {
      const agents = await prisma.agent.findMany({
        where: { assetId: { not: null } },
        select: { id: true },
      });
      agentIds = agents.map(a => a.id);
    } else if (deployment.scope === 'GROUP' && deployment.targetGroupIds.length > 0) {
      const groups = await prisma.computerGroup.findMany({
        where: { id: { in: deployment.targetGroupIds } },
        select: { endpoints: true },
      });
      const endpointIds = [...new Set(groups.flatMap(g => g.endpoints))];
      const agents = await prisma.agent.findMany({
        where: { assetId: { in: endpointIds } },
        select: { id: true },
      });
      agentIds = agents.map(a => a.id);
    } else if (deployment.scope === 'ENDPOINT' && deployment.targetAgentIds.length > 0) {
      const agents = await prisma.agent.findMany({
        where: { id: { in: deployment.targetAgentIds } },
        select: { id: true },
      });
      agentIds = agents.map(a => a.id);
    }

    if (agentIds.length === 0) {
      throw new BadRequestError('No target agents found for the deployment scope');
    }

    const patchPayloads: PatchInstallPayload[] = deployment.patches.map(p => ({
      patchId: p.patchId || p.id,
      kbNumber: p.kbNumber || undefined,
      packageName: p.software || undefined,
      downloadUrl: p.downloadUrl || undefined,
      rebootRequired: p.rebootRequired ?? false,
    }));

    await deploymentExecutorService.createPatchDeployment({
      name: deployment.name,
      description: deployment.description || undefined,
      targetAgentIds: agentIds,
      patches: patchPayloads,
      createdBy: userId,
    });

    await prisma.patchDeployment.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        pending: agentIds.length,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'EXECUTE_DEPLOYMENT',
      resource: 'deployments',
      resourceId: id,
    },
  });

  return { message: 'Deployment execution initiated' };
}

// ============================================
// Patch Deployment from UI
// ============================================

export async function createPatchDeploymentFromUI(data: CreatePatchDeploymentFromUIInput, userId: string) {
  const patchIds = data.patches.map(p => p.id);
  const patches = await prisma.patch.findMany({
    where: { id: { in: patchIds } },
  });

  if (patches.length === 0) {
    throw new BadRequestError('No valid patches found');
  }

  const approvalSetting = await prisma.setting.findUnique({
    where: { key: 'patch-management.requireApprovalForDeployment' },
  });
  const requireApproval = approvalSetting?.value === true;

  if (requireApproval && !data.skipApprovalCheck) {
    const unapprovedPatches = patches.filter(p => p.approvalStatus !== 'APPROVED');
    if (unapprovedPatches.length > 0) {
      const names = unapprovedPatches.map(p => `${p.patchId || p.id} (${p.approvalStatus})`).join(', ');
      throw new BadRequestError(
        `Cannot deploy unapproved patches when approval enforcement is enabled. Unapproved: ${names}`,
        { unapprovedPatchIds: unapprovedPatches.map(p => p.id) },
      );
    }
  }

  if (requireApproval && data.skipApprovalCheck) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'APPROVAL_OVERRIDE',
        resource: 'deployments',
        details: { patchIds: data.patches.map(p => p.id), reason: 'skipApprovalCheck flag was set on UI deployment' },
      },
    });
  }

  const warnings: string[] = [];
  for (const p of patches) {
    if (p.supersededBy && p.supersededBy.length > 0) {
      warnings.push(
        `Patch ${p.patchId || p.id} has been superseded by: ${p.supersededBy.join(', ')}. Consider deploying the newer patch instead.`,
      );
    }
  }

  const result = await deploymentExecutorService.createPatchDeployment({
    name: data.name,
    description: data.description,
    targetAgentIds: data.targetAgentIds,
    patches: patches.map(p => ({ id: p.id })),
    retryCount: data.retryCount,
    autoRollback: data.autoRollback,
    createdBy: userId,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CREATE_PATCH_DEPLOYMENT',
      resource: 'deployments',
      resourceId: result.deploymentId,
      details: { name: data.name, patchCount: patches.length, agentCount: data.targetAgentIds.length },
    },
  });

  return { ...result, warnings };
}
