import type { Prisma } from '@prisma/client';
import { deploymentExecutorService } from '@modules/deployments';
import { NotFoundError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { typedJson } from '@shared/utils';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import { prisma } from '@/db/client';

import { generateDeploymentId, transformZeroTouchConfig } from './patches.helpers';
import type {
  CreateZeroTouchConfigInput,
  UpdateZeroTouchConfigInput,
} from './patches.validator';

const logger = createLogger('patches');

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
      status: 'ACTIVE',
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
// Zero-Touch Rule Evaluation
// ============================================

/**
 * Evaluate active ZeroTouchConfigs against a newly approved patch.
 * If rules match, auto-create a deployment targeting the configured scope.
 */
export async function evaluateZeroTouchRules(patchId: string): Promise<void> {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });
  if (!patch) return;

  const configs = await prisma.zeroTouchConfig.findMany({
    where: { status: 'ACTIVE' },
  });

  if (configs.length === 0) return;

  for (const config of configs) {
    try {
      const rules = typedJson<{ severity?: string[]; categories?: string[]; approvalRequired?: boolean }>(config.autoDeploymentRules);
      if (!rules) continue;

      // 1. Severity match
      const severities: string[] = rules?.severity || [];
      if (severities.length > 0) {
        const patchSeverity = (patch.severity || '').toLowerCase();
        const matches = severities.some((s: string) => s.toLowerCase() === patchSeverity);
        if (!matches) continue;
      }

      // 2. Application filter
      const appType = (config.applicationType || 'ALL').toUpperCase();
      const apps: string[] = (config.applications as string[]) || [];
      const patchSoftware = (patch.software || '').toLowerCase();

      if (appType === 'INCLUDE') {
        const inList = apps.some((a: string) => a.toLowerCase() === patchSoftware);
        if (!inList) continue;
      } else if (appType === 'EXCLUDE') {
        const inList = apps.some((a: string) => a.toLowerCase() === patchSoftware);
        if (inList) continue;
      }

      // 3. Resolve scope to agent IDs
      let agentIds: string[] = [];
      const scope = (config.scope || '').toUpperCase().replace(/\s+/g, '_');

      if (scope === 'ALL_COMPUTERS') {
        const agents = await prisma.agent.findMany({
          where: { status: { notIn: ['INACTIVE', 'DISCONNECTED'] }, assetId: { not: null } },
          select: { id: true },
        });
        agentIds = agents.map((a) => a.id);
      } else if (scope === 'SPECIFIC_GROUPS') {
        const groupIds: string[] = (config.groups as string[]) || [];
        if (groupIds.length > 0) {
          const memberships = await prisma.agentGroupMembership.findMany({
            where: { groupId: { in: groupIds } },
            select: { agentId: true },
          });
          agentIds = [...new Set(memberships.map((m) => m.agentId))];
        }
      } else {
        const computerIds: string[] = (config.computers as string[]) || [];
        if (computerIds.length > 0) {
          const agents = await prisma.agent.findMany({
            where: {
              OR: [
                { id: { in: computerIds } },
                { assetId: { in: computerIds } },
              ],
            },
            select: { id: true },
          });
          agentIds = agents.map((a) => a.id);
        }
      }

      if (agentIds.length === 0) {
        logger.info({ configName: config.name }, 'Zero-touch config matched but no agents in scope');
        continue;
      }

      // 4. Create deployment
      const approvalRequired = rules.approvalRequired ?? true;

      if (approvalRequired) {
        const depId = await generateDeploymentId();
        await prisma.patchDeployment.create({
          data: {
            deploymentId: depId,
            name: `[Zero-Touch] ${patch.title || patch.patchId}`,
            description: `Auto-created by zero-touch rule "${config.name}"`,
            type: 'INSTANT',
            configType: 'INSTALL',
            scope: 'ENDPOINT',
            status: 'PENDING',
            pending: agentIds.length,
            succeeded: 0,
            failed: 0,
            triggerType: 'zero-touch',
            createdBy: 'system',
            patches: { connect: [{ id: patch.id }] },
          },
        });
        logger.info({ deploymentId: depId, configName: config.name, agentCount: agentIds.length }, 'Zero-touch created PENDING deployment');
      } else {
        const result = await deploymentExecutorService.createPatchDeployment({
          name: `[Zero-Touch] ${patch.title || patch.patchId}`,
          description: `Auto-created by zero-touch rule "${config.name}"`,
          targetAgentIds: agentIds,
          patches: [{ id: patch.id }],
          triggerType: 'zero-touch',
          createdBy: 'system',
        });
        logger.info({ deploymentId: result.deploymentId, configName: config.name, commandsCreated: result.commandsCreated }, 'Zero-touch executed deployment');
      }

      // 5. Update config stats
      await prisma.zeroTouchConfig.update({
        where: { id: config.id },
        data: {
          lastTriggeredAt: new Date(),
          deploymentsCreated: { increment: 1 },
        },
      });
    } catch (err) {
      logger.error({ err, configName: config.name }, 'Zero-touch config evaluation error');
    }
  }
}
