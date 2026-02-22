/**
 * Patch Deployment Creation & Management
 */
import { prisma } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { toJsonInput, typedJson } from '@shared/utils';
import { createLogger } from '@shared/services/logger';
import { withTransaction } from '@shared/utils/transaction';
import { env } from '@/config/env';
import {
  CreatePatchDeploymentOptions,
  DeploymentCreationResult,
  COMMAND_TYPES,
  ScriptManifest,
} from './deployment-executor.types';

const logger = createLogger('deployment-executor-patch');

export class DeploymentExecutorPatchService {
  /**
   * Create a patch deployment with tasks and commands
   */
  async createPatchDeployment(
    options: CreatePatchDeploymentOptions
  ): Promise<DeploymentCreationResult> {
    const {
      name,
      description,
      targetAgentIds,
      patches,
      retryCount = 1,
      autoRollback = false,
      triggerType,
      createdBy,
    } = options;

    if (targetAgentIds.length === 0) {
      throw new BadRequestError('At least one target agent is required');
    }

    if (patches.length === 0) {
      throw new BadRequestError('At least one patch is required');
    }

    const agents = await prisma.agent.findMany({
      where: { id: { in: targetAgentIds } },
      select: { id: true, name: true, hostname: true, os: true, assetId: true },
    });

    if (agents.length === 0) {
      throw new NotFoundError('No valid agents found');
    }

    const foundAgentIds = new Set(agents.map(a => a.id));
    const missingAgents = targetAgentIds.filter(id => !foundAgentIds.has(id));
    const errors: string[] = [];

    if (missingAgents.length > 0) {
      errors.push(`Agents not found: ${missingAgents.join(', ')}`);
    }

    const agentsWithAssets = agents.filter(a => a.assetId);
    if (agentsWithAssets.length === 0) {
      throw new BadRequestError('No agents have linked assets for patch deployment');
    }

    const patchIds = patches.map(p => {
      const patch = p as Record<string, string>;
      return patch.id || patch.patchId;
    }).filter(Boolean);

    const patchesWithBundles = await prisma.patch.findMany({
      where: { id: { in: patchIds } },
      include: { bundle: true },
    });

    // Verify patches are deployable — check that hub patches have actual files in MinIO
    const unreadyPatches = patchesWithBundles.filter(p => {
      if (!p.bundle) return false; // native patches don't need bundles
      if (p.bundle.scriptsIncluded && !p.bundle.bundleObjectKey) return false; // inline scripts are OK
      if (p.bundle.bundleObjectKey && p.bundle.downloadStatus !== 'COMPLETED') return true;
      return false;
    });

    if (unreadyPatches.length > 0) {
      const names = unreadyPatches.map(p => `${p.patchId} (${p.bundle?.downloadStatus || 'NO_BUNDLE'})`).join(', ');
      logger.warn({ unreadyPatches: names }, 'Some patches have pending/failed downloads');
      errors.push(`Patches not ready for deployment (download incomplete): ${names}`);
    }

    const deploymentId = `PD-${uuidv4().slice(0, 8).toUpperCase()}`;

    const result = await withTransaction('createPatchDeployment', async (tx) => {
      const deployment = await tx.patchDeployment.create({
        data: {
          deploymentId,
          name,
          description,
          type: 'INSTANT',
          configType: 'INSTALL',
          scope: 'ENDPOINT',
          status: 'IN_PROGRESS',
          pending: agentsWithAssets.length,
          succeeded: 0,
          failed: 0,
          retryCount,
          autoRollback,
          triggerType,
          createdBy,
          patches: {
            connect: patchesWithBundles.map(p => ({ id: p.id })),
          },
        },
      });

      // Verify all patches have bundles (MinIO file or inline scripts)
      const patchesWithoutBundles = patchesWithBundles.filter(
        p => !p.bundle || (!p.bundle.bundleObjectKey && !p.bundle.scriptsIncluded)
      );

      if (patchesWithoutBundles.length > 0) {
        const names = patchesWithoutBundles.map(p => p.patchId || p.id).join(', ');
        throw new BadRequestError(`Patches require a bundle for deployment (upload installer to MinIO first): ${names}`);
      }

      let commandsCreated = 0;

      for (const agent of agentsWithAssets) {
        const taskCommandIds: string[] = [];

        for (const patch of patchesWithBundles) {
          const backendUrl = env.BACKEND_PUBLIC_URL.replace(/\/$/, '');
          const bundleUrl = patch.bundle!.bundleObjectKey
            ? `${backendUrl}/v1/patches/${patch.id}/bundle/stream`
            : undefined;

          const payload = {
            operationType: 'install',
            packageId: patch.id,
            packageName: patch.software || patch.patchId,
            version: patch.kbNumber || patch.patchId || '1.0.0',
            bundleUrl,
            bundleChecksum: patch.bundle!.bundleChecksum,
            manifest: typedJson<ScriptManifest>(patch.bundle!.manifestJson) ?? undefined,
            script: patch.bundle!.scriptInstall || undefined,
            requiresRoot: true,
            patchId: patch.patchId,
            kbNumber: patch.kbNumber,
          };

          const command = await tx.agentCommand.create({
            data: {
              agentId: agent.id,
              type: COMMAND_TYPES.HUB_PATCH_INSTALL,
              payload: toJsonInput(payload),
              status: 'PENDING',
              scheduledAt: new Date(),
            },
          });

          taskCommandIds.push(command.id);
          commandsCreated++;
        }

        // Create one task per agent, linked to first command
        const task = await tx.patchDeploymentTask.create({
          data: {
            deploymentId: deployment.id,
            assetId: agent.assetId!,
            status: 'PENDING',
            commandId: taskCommandIds[0] || null,
          },
        });

        for (const patch of patchesWithBundles) {
          await tx.assetPatchRecommendation.updateMany({
            where: {
              assetId: agent.assetId!,
              patchId: patch.id,
              status: { in: ['RECOMMENDED', 'ACCEPTED'] },
            },
            data: {
              status: 'DEPLOYED',
              deployedAt: new Date(),
              deploymentTaskId: task.id,
            },
          });
        }
      }

      return {
        deploymentId: deployment.deploymentId!,
        tasksCreated: agentsWithAssets.length,
        commandsCreated,
      };
    });

    return {
      ...result,
      status: errors.length > 0 ? 'PARTIAL' : 'CREATED',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get patch deployment status with task details
   */
  async getPatchDeploymentStatus(deploymentId: string) {
    const deployment = await prisma.patchDeployment.findFirst({
      where: { OR: [{ deploymentId }, { id: deploymentId }] },
      include: {
        patches: {
          select: { id: true, patchId: true, title: true, software: true, severity: true },
        },
        tasks: {
          include: {
            asset: {
              select: { id: true, hostname: true, os: true },
            },
            command: {
              select: {
                id: true,
                status: true,
                executedAt: true,
                completedAt: true,
                result: true,
                errorMessage: true,
              },
            },
          },
        },
      },
    });

    if (!deployment) {
      throw new NotFoundError('Patch deployment not found');
    }

    return {
      id: deployment.id,
      deploymentId: deployment.deploymentId,
      name: deployment.name,
      description: deployment.description,
      type: deployment.configType,
      status: deployment.status,
      pending: deployment.pending,
      succeeded: deployment.succeeded,
      failed: deployment.failed,
      total: deployment.tasks.length,
      progress: deployment.tasks.length > 0
        ? Math.round(((deployment.succeeded + deployment.failed) / deployment.tasks.length) * 100)
        : 0,
      retryCount: deployment.retryCount,
      autoRollback: deployment.autoRollback,
      triggerType: deployment.triggerType,
      createdBy: deployment.createdBy,
      createdAt: deployment.createdAt,
      completedAt: deployment.completedAt,
      patches: deployment.patches,
      tasks: deployment.tasks.map(task => ({
        id: task.id,
        assetId: task.assetId,
        assetName: task.asset?.hostname || task.assetId,
        agentId: task.agentId,
        agentName: task.asset?.hostname || task.agentId || task.assetId,
        agentOs: task.asset?.os || 'Unknown',
        status: task.status || 'PENDING',
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        errorMessage: task.errorMessage,
        output: task.output,
        retryAttempt: task.retryAttempt,
        rollbackAvailable: task.rollbackAvailable,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        command: task.command,
      })),
    };
  }

  /**
   * List all patch deployments
   */
  async listPatchDeployments() {
    const deployments = await prisma.patchDeployment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: {
          select: { tasks: true },
        },
        patches: {
          select: { patchId: true, title: true, severity: true, software: true },
        },
      },
    });

    return deployments.map(d => ({
      id: d.id,
      deploymentId: d.deploymentId,
      name: d.name,
      description: d.description,
      type: d.configType,
      status: d.status,
      pending: d.pending,
      succeeded: d.succeeded,
      failed: d.failed,
      total: d._count.tasks,
      progress: d._count.tasks > 0
        ? Math.round(((d.succeeded + d.failed) / d._count.tasks) * 100)
        : 0,
      triggerType: d.triggerType,
      createdBy: d.createdBy,
      createdAt: d.createdAt,
      completedAt: d.completedAt,
      patches: d.patches,
    }));
  }

  /**
   * Cancel a patch deployment (cancel all pending tasks)
   */
  async cancelPatchDeployment(deploymentId: string): Promise<void> {
    const deployment = await prisma.patchDeployment.findFirst({
      where: { OR: [{ deploymentId }, { id: deploymentId }] },
      include: {
        tasks: {
          where: { status: 'PENDING' },
          include: { command: true },
        },
      },
    });

    if (!deployment) {
      throw new NotFoundError('Patch deployment not found');
    }

    await withTransaction('retryPatchDeployment', async (tx) => {
      for (const task of deployment.tasks) {
        if (task.commandId) {
          await tx.agentCommand.update({
            where: { id: task.commandId },
            data: { status: 'CANCELLED' },
          });
        }

        await tx.patchDeploymentTask.update({
          where: { id: task.id },
          data: { status: 'CANCELLED' },
        });
      }

      await tx.patchDeployment.update({
        where: { id: deployment.id },
        data: {
          status: 'CANCELLED',
          pending: 0,
        },
      });
    });
  }

  /**
   * Retry a failed/cancelled patch deployment
   */
  async retryPatchDeployment(deploymentId: string): Promise<DeploymentCreationResult> {
    const deployment = await prisma.patchDeployment.findFirst({
      where: { OR: [{ deploymentId }, { id: deploymentId }] },
      include: {
        patches: { select: { id: true } },
        tasks: {
          select: {
            assetId: true,
            command: { select: { payload: true } },
          },
        },
      },
    });

    if (!deployment) {
      throw new NotFoundError('Patch deployment not found');
    }

    const assetIds = [...new Set(deployment.tasks.map(t => t.assetId))];
    const agents = await prisma.agent.findMany({
      where: { assetId: { in: assetIds } },
      select: { id: true },
    });

    if (agents.length === 0) {
      throw new BadRequestError('No connected agents found for original deployment targets');
    }

    let patchIds: string[] = deployment.patches.map(p => p.id);

    if (patchIds.length === 0) {
      for (const task of deployment.tasks) {
        const payload = typedJson<Record<string, unknown>>(task.command?.payload ?? null);
        if (!payload) continue;
        if (payload?.patchId) {
          const patch = await prisma.patch.findFirst({ where: { patchId: String(payload.patchId) }, select: { id: true } });
          if (patch) patchIds.push(patch.id);
        } else if (Array.isArray(payload.patches)) {
          for (const p of payload.patches as Record<string, unknown>[]) {
            if (p.patchId) {
              const patch = await prisma.patch.findFirst({ where: { patchId: String(p.patchId) }, select: { id: true } });
              if (patch) patchIds.push(patch.id);
            }
          }
        }
      }
      patchIds = [...new Set(patchIds)];
    }

    if (patchIds.length === 0) {
      throw new BadRequestError('Could not determine patches from original deployment');
    }

    return this.createPatchDeployment({
      name: `${deployment.name} (retry)`,
      description: deployment.description || undefined,
      targetAgentIds: agents.map(a => a.id),
      patches: patchIds.map(id => ({ id })),
      retryCount: deployment.retryCount,
      autoRollback: deployment.autoRollback,
      triggerType: 'manual',
      createdBy: deployment.createdBy || undefined,
    });
  }
}

export const deploymentExecutorPatchService = new DeploymentExecutorPatchService();
