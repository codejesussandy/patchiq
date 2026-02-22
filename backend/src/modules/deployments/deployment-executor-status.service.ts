/**
 * Deployment Task Status Processing
 * Handles command results, task updates, verification, retries, and rollbacks
 */
import { prisma } from '@/db/client';
import { Prisma } from '@prisma/client';
import { toJsonInput, typedJson } from '@shared/utils';
import { createLogger } from '@shared/services/logger';
import { withTransaction } from '@shared/utils/transaction';
import { notificationsService } from '@/modules/notifications/notifications.service';
import {
  TaskStatusUpdate,
  COMMAND_TYPES,
  ScriptManifest,
} from './deployment-executor.types';

const logger = createLogger('deployment-executor-status');

export class DeploymentExecutorStatusService {
  /**
   * Process a task status update from an agent command result
   */
  async processCommandResult(update: TaskStatusUpdate): Promise<void> {
    const { commandId, result } = update;
    let { status, errorMessage, output } = update;

    const taskStatus = status === 'COMPLETED' ? 'SUCCESS'
      : status === 'FAILED' ? 'FAILED'
      : 'IN_PROGRESS';

    // Store both result message and output in the result JSON field
    const resultData = output
      ? { message: result, output }
      : result;

    await prisma.agentCommand.update({
      where: { id: commandId },
      data: {
        status,
        result: resultData as Prisma.InputJsonValue | undefined,
        errorMessage,
        executedAt: status === 'IN_PROGRESS' ? new Date() : undefined,
        completedAt: ['COMPLETED', 'FAILED'].includes(status) ? new Date() : undefined,
      },
    });

    // Find and update associated software deployment task
    const softwareTask = await prisma.softwareDeploymentTask.findUnique({
      where: { commandId },
      include: { deployment: true },
    });

    if (softwareTask) {
      await this.updateSoftwareDeploymentTask(softwareTask.id, taskStatus, errorMessage, output);
      return;
    }

    // Find and update associated patch deployment task
    const patchTask = await prisma.patchDeploymentTask.findUnique({
      where: { commandId },
      include: { deployment: true },
    });

    if (patchTask) {
      await this.updatePatchDeploymentTask(patchTask.id, status, errorMessage, output);

      if (status === 'FAILED') {
        this.processTaskFailure(patchTask.id).catch((err) => {
          logger.error({ err, taskId: patchTask.id }, 'Task failure processing error');
        });
      }
      return;
    }

    // Find and update associated config deployment task
    const configTask = await prisma.configDeploymentTask.findUnique({
      where: { commandId },
      include: { deployment: true },
    });

    if (configTask) {
      await this.updateConfigDeploymentTask(configTask.id, taskStatus, errorMessage, output);
      return;
    }

    // Handle post-install verification command results
    const command = await prisma.agentCommand.findUnique({
      where: { id: commandId },
    });

    if (command?.type === COMMAND_TYPES.HUB_PATCH_VERIFY) {
      await this.processVerifyCommandResult(command, status, errorMessage);
    }
  }

  /**
   * Update a software deployment task status and recalculate deployment counts
   */
  private async updateSoftwareDeploymentTask(
    taskId: string,
    status: string,
    errorMessage?: string,
    output?: string
  ): Promise<void> {
    const task = await prisma.softwareDeploymentTask.findUnique({
      where: { id: taskId },
      include: { deployment: true },
    });

    if (!task) return;

    const previousStatus = task.status;

    await withTransaction('updateSoftwareDeploymentTask', async (tx) => {
      await tx.softwareDeploymentTask.update({
        where: { id: taskId },
        data: {
          status,
          errorMessage,
          output,
          startedAt: status === 'IN_PROGRESS' && !task.startedAt ? new Date() : task.startedAt,
          completedAt: ['SUCCESS', 'FAILED'].includes(status) ? new Date() : null,
        },
      });

      if (previousStatus !== status) {
        const countUpdates: Record<string, number> = {};

        if (previousStatus === 'PENDING') countUpdates.pending = -1;
        else if (previousStatus === 'SUCCESS') countUpdates.succeeded = -1;
        else if (previousStatus === 'FAILED') countUpdates.failed = -1;

        if (status === 'PENDING') countUpdates.pending = (countUpdates.pending || 0) + 1;
        else if (status === 'SUCCESS') countUpdates.succeeded = (countUpdates.succeeded || 0) + 1;
        else if (status === 'FAILED') countUpdates.failed = (countUpdates.failed || 0) + 1;

        await tx.softwareDeployment.update({
          where: { id: task.deploymentId },
          data: {
            pending: { increment: countUpdates.pending || 0 },
            succeeded: { increment: countUpdates.succeeded || 0 },
            failed: { increment: countUpdates.failed || 0 },
          },
        });

        const deployment = await tx.softwareDeployment.findUnique({
          where: { id: task.deploymentId },
        });

        if (deployment && deployment.pending === 0) {
          const finalStatus = deployment.failed > 0 ? 'FAILED' : 'COMPLETED';
          await tx.softwareDeployment.update({
            where: { id: task.deploymentId },
            data: { status: finalStatus },
          });

          if (deployment.createdBy) {
            const isSuccess = finalStatus === 'COMPLETED';
            notificationsService.create({
              userId: deployment.createdBy,
              title: isSuccess ? 'Deployment Complete' : 'Deployment Failed',
              message: `Software deployment "${deployment.deploymentName}" ${isSuccess ? 'completed successfully' : 'has failed'}`,
              type: isSuccess ? 'SUCCESS' : 'ERROR',
              category: 'DEPLOYMENT',
              link: '/patches/deployed/deployed',
            }).catch(() => {});
          }
        }
      }
    });
  }

  /**
   * Update a patch deployment task status and recalculate deployment counts
   */
  private async updatePatchDeploymentTask(
    taskId: string,
    status: string,
    errorMessage?: string,
    output?: string
  ): Promise<void> {
    const task = await prisma.patchDeploymentTask.findUnique({
      where: { id: taskId },
      include: {
        deployment: {
          include: { patches: true },
        },
      },
    });

    if (!task) return;

    const previousStatus = task.status;

    await withTransaction('updatePatchDeploymentTask', async (tx) => {
      await tx.patchDeploymentTask.update({
        where: { id: taskId },
        data: {
          status,
          errorMessage,
          output,
          startedAt: status === 'IN_PROGRESS' && !task.startedAt ? new Date() : task.startedAt,
          completedAt: ['COMPLETED', 'FAILED'].includes(status) ? new Date() : null,
        },
      });

      if (status === 'COMPLETED') {
        const hasVerifyScript = await this.schedulePostInstallVerification(tx, task);
        if (!hasVerifyScript) {
          await tx.assetPatchRecommendation.updateMany({
            where: { deploymentTaskId: taskId },
            data: {
              status: 'VERIFIED',
              verifiedAt: new Date(),
            },
          });
        }
      } else if (status === 'FAILED') {
        await tx.assetPatchRecommendation.updateMany({
          where: { deploymentTaskId: taskId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: errorMessage || 'Deployment failed',
          },
        });
      }

      if (status === 'COMPLETED' && task.assetId && task.deployment.patches) {
        await this.resolveAssetVulnerabilitiesForPatches(tx, task.assetId, task.deployment.patches);
      }

      if (previousStatus !== status) {
        const countUpdates: Record<string, number> = {};

        if (previousStatus === 'PENDING') countUpdates.pending = -1;
        else if (previousStatus === 'COMPLETED') countUpdates.succeeded = -1;
        else if (previousStatus === 'FAILED') countUpdates.failed = -1;

        if (status === 'PENDING') countUpdates.pending = (countUpdates.pending || 0) + 1;
        else if (status === 'COMPLETED') countUpdates.succeeded = (countUpdates.succeeded || 0) + 1;
        else if (status === 'FAILED') countUpdates.failed = (countUpdates.failed || 0) + 1;

        await tx.patchDeployment.update({
          where: { id: task.deploymentId },
          data: {
            pending: { increment: countUpdates.pending || 0 },
            succeeded: { increment: countUpdates.succeeded || 0 },
            failed: { increment: countUpdates.failed || 0 },
          },
        });

        const deployment = await tx.patchDeployment.findUnique({
          where: { id: task.deploymentId },
        });

        if (deployment && deployment.pending === 0 && status !== 'FAILED') {
          await this.finalizePatchDeployment(tx, deployment);
        }
      }
    });
  }

  /**
   * Update a config deployment task status and recalculate deployment counts
   */
  private async updateConfigDeploymentTask(
    taskId: string,
    status: string,
    errorMessage?: string,
    output?: string
  ): Promise<void> {
    const task = await prisma.configDeploymentTask.findUnique({
      where: { id: taskId },
      include: { deployment: true },
    });

    if (!task) return;

    const previousStatus = task.status;

    await withTransaction('updateConfigDeploymentTask', async (tx) => {
      await tx.configDeploymentTask.update({
        where: { id: taskId },
        data: {
          status,
          errorMessage,
          output,
          startedAt: status === 'IN_PROGRESS' && !task.startedAt ? new Date() : task.startedAt,
          completedAt: ['SUCCESS', 'FAILED'].includes(status) ? new Date() : null,
        },
      });

      if (previousStatus !== status) {
        const countUpdates: Record<string, number> = {};

        if (previousStatus === 'PENDING') countUpdates.pending = -1;
        else if (previousStatus === 'SUCCESS') countUpdates.succeeded = -1;
        else if (previousStatus === 'FAILED') countUpdates.failed = -1;

        if (status === 'PENDING') countUpdates.pending = (countUpdates.pending || 0) + 1;
        else if (status === 'SUCCESS') countUpdates.succeeded = (countUpdates.succeeded || 0) + 1;
        else if (status === 'FAILED') countUpdates.failed = (countUpdates.failed || 0) + 1;

        await tx.configDeployment.update({
          where: { id: task.deploymentId },
          data: {
            pending: { increment: countUpdates.pending || 0 },
            succeeded: { increment: countUpdates.succeeded || 0 },
            failed: { increment: countUpdates.failed || 0 },
          },
        });

        const deployment = await tx.configDeployment.findUnique({
          where: { id: task.deploymentId },
        });

        if (deployment && deployment.pending === 0) {
          const finalStatus = deployment.failed > 0 ? 'FAILED' : 'COMPLETED';
          await tx.configDeployment.update({
            where: { id: task.deploymentId },
            data: { status: finalStatus },
          });

          if (deployment.createdBy) {
            const isSuccess = finalStatus === 'COMPLETED';
            notificationsService.create({
              userId: deployment.createdBy,
              title: isSuccess ? 'Config Deployment Complete' : 'Config Deployment Failed',
              message: `Configuration deployment "${deployment.deploymentName}" ${isSuccess ? 'completed successfully' : 'has failed'}`,
              type: isSuccess ? 'SUCCESS' : 'ERROR',
              category: 'DEPLOYMENT',
              link: '/patches/deployed/config-deployed',
            }).catch(() => {});
          }
        }
      }
    });
  }

  /**
   * Schedule a post-install verification command if patches have verify scripts
   */
  private async schedulePostInstallVerification(
    tx: Prisma.TransactionClient,
    task: { id: string; assetId: string; deployment: { patches: { id: string }[] }; commandId: string | null }
  ): Promise<boolean> {
    if (!task.commandId) return false;

    const originalCommand = await tx.agentCommand.findUnique({
      where: { id: task.commandId },
      select: { agentId: true },
    });

    if (!originalCommand) return false;

    const patchIds = task.deployment.patches.map((p) => p.id);
    if (patchIds.length === 0) return false;

    const patchesWithVerify = await tx.patch.findMany({
      where: {
        id: { in: patchIds },
        bundle: { scriptVerify: { not: null } },
      },
      include: {
        bundle: { select: { scriptVerify: true } },
      },
    });

    if (patchesWithVerify.length === 0) return false;

    const verifyScripts = patchesWithVerify
      .filter(p => p.bundle?.scriptVerify)
      .map(p => `# Verify: ${p.patchId || p.id}\n${p.bundle!.scriptVerify}`);

    const combinedScript = verifyScripts.join('\n\n');

    await tx.agentCommand.create({
      data: {
        agentId: originalCommand.agentId,
        type: COMMAND_TYPES.HUB_PATCH_VERIFY,
        payload: toJsonInput({
          operationType: 'verify',
          script: combinedScript,
          requiresRoot: true,
          verifyTaskId: task.id,
          patchIds,
        }),
        status: 'PENDING',
        scheduledAt: new Date(Date.now() + 10_000),
      },
    });

    logger.info({ taskId: task.id, patchCount: patchesWithVerify.length }, 'Scheduled patch verification');
    return true;
  }

  /**
   * Process the result of a post-install verification command
   */
  private async processVerifyCommandResult(
    command: { id: string; payload: Prisma.JsonValue | null },
    status: string,
    errorMessage?: string
  ): Promise<void> {
    const payload = typedJson<Record<string, string>>(command.payload);
    const taskId = payload?.verifyTaskId;

    if (!taskId) {
      logger.warn({ commandId: command.id }, 'Verify command has no verifyTaskId in payload');
      return;
    }

    if (status === 'COMPLETED') {
      await prisma.assetPatchRecommendation.updateMany({
        where: { deploymentTaskId: taskId, status: 'DEPLOYED' },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });
      logger.info({ taskId }, 'Patch verification passed, recommendations marked verified');
    } else if (status === 'FAILED') {
      await prisma.assetPatchRecommendation.updateMany({
        where: { deploymentTaskId: taskId, status: 'DEPLOYED' },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: `Verification failed: ${errorMessage || 'verify script returned non-zero exit code'}`,
        },
      });
      logger.info({ taskId }, 'Patch verification failed, recommendations marked failed');
    }
  }

  /**
   * Resolve asset vulnerabilities when patches are successfully deployed
   */
  private async resolveAssetVulnerabilitiesForPatches(
    tx: Prisma.TransactionClient,
    assetId: string,
    patches: { cveNumbers: string[] }[]
  ): Promise<void> {
    const allCves: string[] = [];
    for (const patch of patches) {
      if (patch.cveNumbers && patch.cveNumbers.length > 0) {
        allCves.push(...patch.cveNumbers);
      }
    }

    if (allCves.length === 0) return;

    const vulnerabilities = await tx.vulnerability.findMany({
      where: { cveId: { in: allCves } },
      select: { id: true, cveId: true },
    });

    if (vulnerabilities.length === 0) return;

    const vulnerabilityIds = vulnerabilities.map(v => v.id);

    const result = await tx.assetVulnerability.updateMany({
      where: {
        assetId,
        vulnerabilityId: { in: vulnerabilityIds },
        status: 'Open',
      },
      data: {
        status: 'Patched',
        resolvedAt: new Date(),
      },
    });

    if (result.count > 0) {
      const cveList = vulnerabilities.map(v => v.cveId).join(', ');
      logger.info({ assetId, resolvedCount: result.count, cveList }, 'Resolved vulnerabilities for asset');
    }
  }

  /**
   * Finalize a patch deployment when all tasks are done
   */
  private async finalizePatchDeployment(tx: Prisma.TransactionClient, deployment: { id: string; name: string; failed: number; createdBy: string | null }): Promise<void> {
    const finalStatus = deployment.failed > 0 ? 'FAILED' : 'COMPLETED';
    await tx.patchDeployment.update({
      where: { id: deployment.id },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });

    if (deployment.createdBy) {
      const isSuccess = finalStatus === 'COMPLETED';
      notificationsService.create({
        userId: deployment.createdBy,
        title: isSuccess ? 'Patch Deployment Complete' : 'Patch Deployment Failed',
        message: `Patch deployment "${deployment.name}" ${isSuccess ? 'completed successfully' : 'has failed'}`,
        type: isSuccess ? 'SUCCESS' : 'ERROR',
        category: 'DEPLOYMENT',
        link: '/patches/deployed/deployed',
      }).catch(() => {});
    }
  }

  /**
   * Check if a patch deployment is complete and finalize it
   */
  async checkPatchDeploymentCompletion(deploymentId: string): Promise<void> {
    const deployment = await prisma.patchDeployment.findUnique({
      where: { id: deploymentId },
    });

    if (deployment && deployment.pending === 0 && deployment.status !== 'COMPLETED' && deployment.status !== 'FAILED') {
      await withTransaction('finalizePatchDeployment', async (tx) => {
        const dep = await tx.patchDeployment.findUnique({ where: { id: deploymentId } });
        if (dep && dep.pending === 0) {
          await this.finalizePatchDeployment(tx, dep);
        }
      });
    }
  }

  /**
   * Process a failed patch deployment task (retry or rollback)
   */
  async processTaskFailure(taskId: string): Promise<{ action: 'retry' | 'rollback' | 'final_failure' }> {
    const task = await prisma.patchDeploymentTask.findUnique({
      where: { id: taskId },
      include: {
        deployment: { include: { patches: true } },
      },
    });

    if (!task || task.status !== 'FAILED') {
      return { action: 'final_failure' };
    }

    const deployment = task.deployment;
    const retryCount = deployment.retryCount || 0;
    const retryDelay = deployment.retryDelay || 60;

    // 1. Retry if attempts remain
    if (task.retryAttempt < retryCount) {
      const originalCommand = task.commandId
        ? await prisma.agentCommand.findUnique({ where: { id: task.commandId } })
        : null;

      if (originalCommand) {
        const retryCommand = await prisma.agentCommand.create({
          data: {
            agentId: originalCommand.agentId,
            type: originalCommand.type,
            payload: originalCommand.payload as Prisma.InputJsonValue,
            status: 'PENDING',
            scheduledAt: new Date(Date.now() + retryDelay * 1000),
          },
        });

        await prisma.patchDeploymentTask.update({
          where: { id: taskId },
          data: {
            status: 'PENDING',
            retryAttempt: { increment: 1 },
            commandId: retryCommand.id,
            errorMessage: null,
            completedAt: null,
          },
        });

        await prisma.patchDeployment.update({
          where: { id: deployment.id },
          data: {
            failed: { decrement: 1 },
            pending: { increment: 1 },
          },
        });

        logger.info({ taskId, attempt: task.retryAttempt + 1, maxRetries: retryCount, commandId: retryCommand.id, retryDelaySec: retryDelay }, 'Auto-retry scheduled');
        return { action: 'retry' };
      }
    }

    // 2. Auto-rollback if configured
    if (deployment.autoRollback && task.rollbackAvailable) {
      const originalCommand = task.commandId
        ? await prisma.agentCommand.findUnique({ where: { id: task.commandId } })
        : null;

      if (originalCommand) {
        const rollbackCommand = await prisma.agentCommand.create({
          data: {
            agentId: originalCommand.agentId,
            type: COMMAND_TYPES.HUB_PATCH_ROLLBACK,
            payload: toJsonInput({
              rollbackId: `RB-${task.commandId}`,
              patchId: deployment.patches?.[0]?.patchId || undefined,
            }),
            status: 'PENDING',
            scheduledAt: new Date(),
          },
        });

        await prisma.patchDeploymentTask.update({
          where: { id: taskId },
          data: { status: 'rolled_back' },
        });

        logger.info({ taskId, commandId: rollbackCommand.id }, 'Auto-rollback initiated');
        await this.checkPatchDeploymentCompletion(deployment.id);
        return { action: 'rollback' };
      }
    }

    // 3. Final failure
    if (deployment.createdBy) {
      notificationsService.create({
        userId: deployment.createdBy,
        title: 'Patch Task Failed',
        message: `Task for "${deployment.patches?.[0]?.title || 'unknown'}" in deployment "${deployment.name}" has permanently failed after ${task.retryAttempt} retries`,
        type: 'ERROR',
        category: 'DEPLOYMENT',
        link: '/patches/deployed/deployed',
      }).catch(() => {});
    }

    logger.info({ taskId, retries: task.retryAttempt }, 'Task permanently failed after retries');
    await this.checkPatchDeploymentCompletion(deployment.id);
    return { action: 'final_failure' };
  }
}

export const deploymentExecutorStatusService = new DeploymentExecutorStatusService();
