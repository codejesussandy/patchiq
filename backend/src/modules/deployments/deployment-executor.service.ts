/**
 * Deployment Executor Service
 *
 * This is the critical bridge between deployments and agent commands.
 * When a deployment is created, this service:
 * 1. Creates SoftwareDeployment/PatchDeployment record
 * 2. Creates SoftwareDeploymentTask/PatchDeploymentTask for each target agent
 * 3. Creates AgentCommand for each task
 * 4. Links tasks to commands for status tracking
 */

import { prisma } from '@/db/client';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, BadRequestError } from '@shared/errors';
import {
  CreateSoftwareDeploymentOptions,
  CreatePatchDeploymentOptions,
  CreateConfigDeploymentOptions,
  DeploymentCreationResult,
  TaskStatusUpdate,
  COMMAND_TYPES,
  SoftwareInstallPayload,
  ScriptBundlePayload,
  ScriptManifest,
} from './deployment-executor.types';
import { hubService } from '@modules/hub/hub.service';
import { env } from '@/config/env';
import { notificationsService } from '@/modules/notifications/notifications.service';

class DeploymentExecutorService {
  /**
   * Create a software deployment with tasks and commands
   */
  async createSoftwareDeployment(
    options: CreateSoftwareDeploymentOptions
  ): Promise<DeploymentCreationResult> {
    const {
      name,
      description,
      deploymentType,
      targetAgentIds,
      package: packageInfo,
      retryCount: retryCountInput = 1,
      createdBy,
    } = options;

    // Ensure retryCount is a number
    const retryCount = typeof retryCountInput === 'string'
      ? parseInt(retryCountInput, 10) || 1
      : retryCountInput;

    if (targetAgentIds.length === 0) {
      throw new BadRequestError('At least one target agent is required');
    }

    // Verify all target agents exist and get their info (including assetId for tracking)
    const agents = await prisma.agent.findMany({
      where: { id: { in: targetAgentIds } },
      select: { id: true, name: true, hostname: true, os: true, assetId: true },
    });

    if (agents.length === 0) {
      throw new NotFoundError('No valid agents found');
    }

    const foundAgentIds = new Set(agents.map(a => a.id));
    const missingAgents = targetAgentIds.filter(id => !foundAgentIds.has(id));

    const deploymentId = `SD-${uuidv4().slice(0, 8).toUpperCase()}`;
    const errors: string[] = [];

    if (missingAgents.length > 0) {
      errors.push(`Agents not found: ${missingAgents.join(', ')}`);
    }

    // Check if this is a Hub package by looking for packageId in the payload
    const pkgPayload = packageInfo as SoftwareInstallPayload & { packageId?: string };
    let hubPackage: {
      bundleUrl?: string;
      bundleChecksum?: string;
      manifest?: ScriptManifest;
      scriptsIncluded?: boolean;
      scriptInstall?: string;
      scriptUninstall?: string;
      scriptUpdate?: string;
      scriptRollback?: string;
      requiresRoot?: boolean;
    } | null = null;

    // Try to fetch Hub package info if packageId is provided
    if (pkgPayload.packageId) {
      try {
        const pkg = await prisma.softwarePackage.findUnique({
          where: { packageId: pkgPayload.packageId },
        });

        if (pkg && (pkg.bundleObjectKey || pkg.scriptsIncluded)) {
          // This is a Hub package with scripts
          if (pkg.bundleObjectKey) {
            // Get bundle download info
            const bundleInfo = await hubService.getBundleDownloadInfo(pkg.packageId);

            // Use backend proxy URL instead of MinIO presigned URL
            // This ensures agents outside Docker can download bundles
            const backendUrl = env.BACKEND_PUBLIC_URL.replace(/\/$/, ''); // Remove trailing slash
            const proxyBundleUrl = `${backendUrl}/v1/bundles/${pkg.packageId}/download`;

            hubPackage = {
              bundleUrl: proxyBundleUrl,
              bundleChecksum: bundleInfo.bundleChecksum,
              manifest: bundleInfo.manifest,
              scriptsIncluded: true,
              requiresRoot: pkg.requiresRoot,
            };
          } else if (pkg.scriptInstall || pkg.scriptUninstall) {
            // Inline scripts mode
            hubPackage = {
              scriptsIncluded: true,
              scriptInstall: pkg.scriptInstall || undefined,
              scriptUninstall: pkg.scriptUninstall || undefined,
              scriptUpdate: pkg.scriptUpdate || undefined,
              scriptRollback: pkg.scriptRollback || undefined,
              requiresRoot: pkg.requiresRoot,
            };
          }
        }
      } catch (err) {
        // Package not found in Hub, fall back to legacy mode
        console.log(`Package ${pkgPayload.packageId} not found in Hub, using legacy mode`);
      }
    }

    // Determine command type and payload based on package type
    let commandType: string;
    let commandPayload: Prisma.InputJsonValue;

    if (hubPackage?.scriptsIncluded) {
      // Hub-centric mode: use script bundle commands
      // Map deployment type to operation type
      let operationType: 'install' | 'update' | 'rollback' | 'uninstall' = 'install';
      if (deploymentType === 'uninstall') {
        operationType = 'uninstall';
      } else if (deploymentType === 'upgrade') {
        operationType = 'update';
      } else if (deploymentType === 'rollback') {
        operationType = 'rollback';
      }

      // Map deployment type to command type
      if (deploymentType === 'uninstall') {
        commandType = COMMAND_TYPES.HUB_UNINSTALL;
      } else if (deploymentType === 'upgrade') {
        commandType = COMMAND_TYPES.HUB_UPDATE;
      } else if (deploymentType === 'rollback') {
        commandType = COMMAND_TYPES.HUB_ROLLBACK;
      } else {
        commandType = COMMAND_TYPES.HUB_INSTALL;
      }

      const bundlePayload: ScriptBundlePayload = {
        operationType,
        packageId: pkgPayload.packageId || pkgPayload.name,
        packageName: pkgPayload.name,
        version: pkgPayload.version || 'latest',
        bundleUrl: hubPackage.bundleUrl,
        bundleChecksum: hubPackage.bundleChecksum,
        manifest: hubPackage.manifest,
        script: operationType === 'install' ? hubPackage.scriptInstall
          : operationType === 'uninstall' ? hubPackage.scriptUninstall
          : operationType === 'rollback' ? hubPackage.scriptRollback
          : hubPackage.scriptUpdate,
        requiresRoot: hubPackage.requiresRoot || false,
      };

      commandPayload = bundlePayload as unknown as Prisma.InputJsonValue;
    } else {
      // Legacy mode: use package manager commands
      commandType = deploymentType === 'uninstall'
        ? COMMAND_TYPES.SOFTWARE_UNINSTALL
        : COMMAND_TYPES.SOFTWARE_INSTALL;
      commandPayload = packageInfo as unknown as Prisma.InputJsonValue;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the deployment record
      const deployment = await tx.softwareDeployment.create({
        data: {
          deploymentId,
          deploymentName: name,
          description,
          deploymentType,
          selectionType: 'application',
          selectedItems: [(packageInfo as SoftwareInstallPayload).name],
          scope: 'custom',
          endpoints: targetAgentIds,
          retryCount,
          notifyTo: 'admin',
          stage: 'IN_PROGRESS',
          pending: agents.length,
          succeeded: 0,
          failed: 0,
          createdBy,
        },
      });

      // 2. Create tasks and commands for each agent
      let commandsCreated = 0;

      for (const agent of agents) {
        // Create the agent command
        const command = await tx.agentCommand.create({
          data: {
            agentId: agent.id,
            type: commandType,
            payload: commandPayload,
            status: 'pending',
            scheduledAt: new Date(),
          },
        });

        // Create the task linked to the command (with asset tracking)
        await tx.softwareDeploymentTask.create({
          data: {
            deploymentId: deployment.id,
            endpointId: agent.id,
            assetId: agent.assetId || undefined, // Link to asset for tracking
            endpointName: agent.hostname || agent.name || agent.id,
            endpointOs: agent.os || 'Unknown',
            itemName: (packageInfo as SoftwareInstallPayload).name,
            status: 'PENDING',
            commandId: command.id,
            createdBy,
          },
        });

        commandsCreated++;
      }

      return {
        deploymentId: deployment.deploymentId,
        tasksCreated: agents.length,
        commandsCreated,
      };
    });

    return {
      ...result,
      status: errors.length > 0 ? 'partial' : 'created',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Create a patch deployment with tasks and commands
   * Uses hub_patch_install for patches with bundles, falls back to patch_install for legacy patches
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

    // Verify all target agents exist and get their asset IDs
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

    // Filter out agents without assets (can't create patch deployment tasks for them)
    const agentsWithAssets = agents.filter(a => a.assetId);
    if (agentsWithAssets.length === 0) {
      throw new BadRequestError('No agents have linked assets for patch deployment');
    }

    // Get patch IDs from the payload (handle both {id} and {patchId} formats)
    const patchIds = patches.map(p => (p as any).id || (p as any).patchId).filter(Boolean);

    // Fetch patches with their bundles to determine command type
    const patchesWithBundles = await prisma.patch.findMany({
      where: { id: { in: patchIds } },
      include: {
        bundle: true,
      },
    });

    const deploymentId = `PD-${uuidv4().slice(0, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the patch deployment record
      const deployment = await tx.patchDeployment.create({
        data: {
          deploymentId,
          name,
          description,
          type: 'INSTANT',
          configType: 'INSTALL',
          scope: 'Endpoint',
          status: 'PENDING',
          stage: 'IN_PROGRESS',
          pending: agentsWithAssets.length,
          succeeded: 0,
          failed: 0,
          retryCount,
          autoRollback,
          triggerType,
          createdBy,
        },
      });

      // 2. Create tasks and commands for each agent
      let commandsCreated = 0;

      for (const agent of agentsWithAssets) {
        // Build payload for each patch, using hub_patch_install for patches with bundles
        const patchPayloads = [];
        let useHubCommand = false;

        for (const patch of patchesWithBundles) {
          if (patch.bundle && (patch.bundle.bundleObjectKey || patch.bundle.scriptsIncluded)) {
            // This patch has a bundle - use hub-centric approach
            useHubCommand = true;

            // Build bundle download URL using backend proxy
            const backendUrl = env.BACKEND_PUBLIC_URL.replace(/\/$/, '');
            const bundleUrl = patch.bundle.bundleObjectKey
              ? `${backendUrl}/v1/patches/${patch.id}/bundle/stream`
              : undefined;

            patchPayloads.push({
              operationType: 'install',
              packageId: patch.id,
              packageName: patch.software || patch.patchId,
              version: patch.kbNumber || patch.patchId || '1.0.0',
              bundleUrl,
              bundleChecksum: patch.bundle.bundleChecksum,
              manifest: patch.bundle.manifestJson as unknown as ScriptManifest | undefined,
              script: patch.bundle.scriptInstall || undefined,
              requiresRoot: true, // Patches typically require elevation
              patchId: patch.patchId,
              kbNumber: patch.kbNumber,
            });
          } else {
            // Legacy patch without bundle
            patchPayloads.push({
              patchId: patch.patchId || patch.id,
              kbNumber: patch.kbNumber,
              packageName: patch.software,
              rebootRequired: patch.rebootRequired,
            });
          }
        }

        // Determine command type based on whether any patch has a bundle
        const commandType = useHubCommand
          ? COMMAND_TYPES.HUB_PATCH_INSTALL
          : COMMAND_TYPES.PATCH_INSTALL;

        // Create the agent command
        const command = await tx.agentCommand.create({
          data: {
            agentId: agent.id,
            type: commandType,
            payload: useHubCommand
              ? (patchPayloads.length === 1 ? patchPayloads[0] : { patches: patchPayloads }) as unknown as Prisma.InputJsonValue
              : { patches: patchPayloads } as unknown as Prisma.InputJsonValue,
            status: 'pending',
            scheduledAt: new Date(),
          },
        });

        // Create the task linked to the command
        await tx.patchDeploymentTask.create({
          data: {
            deploymentId: deployment.id,
            assetId: agent.assetId!,
            status: 'pending',
            commandId: command.id,
          },
        });

        commandsCreated++;
      }

      return {
        deploymentId: deployment.deploymentId!,
        tasksCreated: agentsWithAssets.length,
        commandsCreated,
      };
    });

    return {
      ...result,
      status: errors.length > 0 ? 'partial' : 'created',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Process a task status update from an agent command result
   * Called when agents report command completion
   */
  async processCommandResult(update: TaskStatusUpdate): Promise<void> {
    const { commandId, status, result, errorMessage, output } = update;

    // Map command status to task status
    const taskStatus = status === 'completed' ? 'SUCCESS'
      : status === 'failed' ? 'FAILED'
      : 'IN_PROGRESS';

    // Update the command status
    await prisma.agentCommand.update({
      where: { id: commandId },
      data: {
        status,
        result: result as Prisma.InputJsonValue | undefined,
        errorMessage,
        executedAt: status === 'in_progress' ? new Date() : undefined,
        completedAt: ['completed', 'failed'].includes(status) ? new Date() : undefined,
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
      await this.updatePatchDeploymentTask(patchTask.id, taskStatus.toLowerCase(), errorMessage, output);

      // If task failed, trigger auto-retry or rollback logic
      if (status === 'failed') {
        this.processTaskFailure(patchTask.id).catch((err) => {
          console.error(`[Task Failure] ${patchTask.id}:`, err);
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

    await prisma.$transaction(async (tx) => {
      // Update the task
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

      // Recalculate deployment counts
      if (previousStatus !== status) {
        const countUpdates: Record<string, number> = {};

        // Decrement previous status count
        if (previousStatus === 'PENDING') countUpdates.pending = -1;
        else if (previousStatus === 'SUCCESS') countUpdates.succeeded = -1;
        else if (previousStatus === 'FAILED') countUpdates.failed = -1;

        // Increment new status count
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

        // Check if deployment is complete
        const deployment = await tx.softwareDeployment.findUnique({
          where: { id: task.deploymentId },
        });

        if (deployment && deployment.pending === 0) {
          const finalStage = deployment.failed > 0 ? 'FAILED' : 'COMPLETED';
          await tx.softwareDeployment.update({
            where: { id: task.deploymentId },
            data: {
              stage: finalStage,
            },
          });

          // Notify the deployment creator
          if (deployment.createdBy) {
            const isSuccess = finalStage === 'COMPLETED';
            notificationsService.create({
              userId: deployment.createdBy,
              title: isSuccess ? 'Deployment Complete' : 'Deployment Failed',
              message: `Software deployment "${deployment.deploymentName}" ${isSuccess ? 'completed successfully' : 'has failed'}`,
              type: isSuccess ? 'success' : 'error',
              category: 'deployment',
              link: '/patches/deployed/deployed',
            }).catch(() => {});
          }
        }
      }
    });
  }

  /**
   * Update a patch deployment task status and recalculate deployment counts
   * Also resolves AssetVulnerability records when patches are successfully deployed
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
          include: {
            patches: true, // Include patches to get CVE numbers
          },
        },
      },
    });

    if (!task) return;

    const previousStatus = task.status;

    await prisma.$transaction(async (tx) => {
      // Update the task
      await tx.patchDeploymentTask.update({
        where: { id: taskId },
        data: {
          status,
          errorMessage,
          output,
          startedAt: status === 'in_progress' && !task.startedAt ? new Date() : task.startedAt,
          completedAt: ['completed', 'failed'].includes(status) ? new Date() : null,
        },
      });

      // If patch deployment completed successfully, resolve asset vulnerabilities
      if (status === 'completed' && task.assetId && task.deployment.patches) {
        await this.resolveAssetVulnerabilitiesForPatches(tx, task.assetId, task.deployment.patches);
      }

      // Recalculate deployment counts
      if (previousStatus !== status) {
        const countUpdates: Record<string, number> = {};

        // Decrement previous status count
        if (previousStatus === 'pending') countUpdates.pending = -1;
        else if (previousStatus === 'completed') countUpdates.succeeded = -1;
        else if (previousStatus === 'failed') countUpdates.failed = -1;

        // Increment new status count
        if (status === 'pending') countUpdates.pending = (countUpdates.pending || 0) + 1;
        else if (status === 'completed') countUpdates.succeeded = (countUpdates.succeeded || 0) + 1;
        else if (status === 'failed') countUpdates.failed = (countUpdates.failed || 0) + 1;

        await tx.patchDeployment.update({
          where: { id: task.deploymentId },
          data: {
            pending: { increment: countUpdates.pending || 0 },
            succeeded: { increment: countUpdates.succeeded || 0 },
            failed: { increment: countUpdates.failed || 0 },
          },
        });

        // Check if deployment is complete
        // Skip completion check for failed tasks — processTaskFailure() may schedule a retry
        const deployment = await tx.patchDeployment.findUnique({
          where: { id: task.deploymentId },
        });

        if (deployment && deployment.pending === 0 && status !== 'failed') {
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

    await prisma.$transaction(async (tx) => {
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
          const finalStage = deployment.failed > 0 ? 'FAILED' : 'COMPLETED';
          await tx.configDeployment.update({
            where: { id: task.deploymentId },
            data: { stage: finalStage },
          });

          if (deployment.createdBy) {
            const isSuccess = finalStage === 'COMPLETED';
            notificationsService.create({
              userId: deployment.createdBy,
              title: isSuccess ? 'Config Deployment Complete' : 'Config Deployment Failed',
              message: `Configuration deployment "${deployment.deploymentName}" ${isSuccess ? 'completed successfully' : 'has failed'}`,
              type: isSuccess ? 'success' : 'error',
              category: 'deployment',
              link: '/patches/deployed/config-deployed',
            }).catch(() => {});
          }
        }
      }
    });
  }

  /**
   * Get deployment status with task details
   */
  async getSoftwareDeploymentStatus(deploymentId: string) {
    const deployment = await prisma.softwareDeployment.findUnique({
      where: { deploymentId },
      include: {
        tasks: {
          include: {
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
      throw new NotFoundError('Deployment not found');
    }

    return {
      id: deployment.id,
      deploymentId: deployment.deploymentId,
      name: deployment.deploymentName,
      description: deployment.description,
      type: deployment.deploymentType,
      stage: deployment.stage,
      pending: deployment.pending,
      succeeded: deployment.succeeded,
      failed: deployment.failed,
      total: deployment.tasks.length,
      progress: deployment.tasks.length > 0
        ? Math.round(((deployment.succeeded + deployment.failed) / deployment.tasks.length) * 100)
        : 0,
      createdAt: deployment.createdAt,
      tasks: deployment.tasks.map(task => ({
        id: task.id,
        // Return both field name formats for frontend compatibility
        endpointId: task.endpointId,
        endpointName: task.endpointName,
        endpointOs: task.endpointOs,
        itemName: task.itemName,
        // Frontend-expected field names (aliases)
        agentId: task.endpointId,
        agentName: task.endpointName,
        agentOs: task.endpointOs,
        packageName: task.itemName,
        // Normalize status to lowercase for frontend compatibility
        status: task.status.toLowerCase(),
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        errorMessage: task.errorMessage,
        output: task.output,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        command: task.command,
      })),
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
      stage: deployment.stage,
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
        // Return both field name formats for frontend compatibility
        assetId: task.assetId,
        endpointId: task.assetId,
        assetName: task.asset?.hostname || task.assetId,
        endpointName: task.asset?.hostname || task.assetId,
        assetOs: task.asset?.os || 'Unknown',
        endpointOs: task.asset?.os || 'Unknown',
        agentId: task.agentId,
        agentName: task.asset?.hostname || task.agentId || task.assetId,
        agentOs: task.asset?.os || 'Unknown',
        // Normalize status to lowercase for frontend compatibility
        status: (task.status || 'pending').toLowerCase(),
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
          select: { patchId: true, title: true, severity: true },
        },
      },
    });

    return deployments.map(d => ({
      id: d.id,
      deploymentId: d.deploymentId,
      name: d.name,
      description: d.description,
      type: d.configType,
      stage: d.stage,
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
          where: { status: 'pending' },
          include: { command: true },
        },
      },
    });

    if (!deployment) {
      throw new NotFoundError('Patch deployment not found');
    }

    await prisma.$transaction(async (tx) => {
      for (const task of deployment.tasks) {
        if (task.commandId) {
          await tx.agentCommand.update({
            where: { id: task.commandId },
            data: { status: 'cancelled' },
          });
        }

        await tx.patchDeploymentTask.update({
          where: { id: task.id },
          data: { status: 'cancelled' },
        });
      }

      await tx.patchDeployment.update({
        where: { id: deployment.id },
        data: {
          stage: 'CANCELLED',
          status: 'CANCELLED',
          pending: 0,
        },
      });
    });
  }

  /**
   * Create a configuration deployment with tasks and commands.
   * Resolves configs from configurationIds or bundleIds, creates script_inline commands.
   */
  async createConfigDeployment(
    options: CreateConfigDeploymentOptions
  ): Promise<DeploymentCreationResult> {
    const {
      name,
      description,
      targetAgentIds,
      configurationIds,
      bundleIds,
      selectionType = 'configuration',
      retryCount = 1,
      createdBy,
    } = options;

    if (targetAgentIds.length === 0) {
      throw new BadRequestError('At least one target agent is required');
    }

    // Resolve configuration items
    let configItems: { id: string; name: string; command: string; commandType: string; os: string }[] = [];

    if (selectionType === 'bundle' && bundleIds && bundleIds.length > 0) {
      // Resolve bundles to individual configs
      const bundles = await prisma.configBundle.findMany({
        where: { id: { in: bundleIds } },
        include: { items: { include: { config: true } } },
      });
      for (const bundle of bundles) {
        for (const item of bundle.items) {
          configItems.push({
            id: item.config.id,
            name: item.config.name,
            command: item.config.command,
            commandType: item.config.commandType,
            os: item.config.os,
          });
        }
      }
    } else if (configurationIds && configurationIds.length > 0) {
      const configs = await prisma.configCatalog.findMany({
        where: { id: { in: configurationIds } },
      });
      configItems = configs.map(c => ({
        id: c.id,
        name: c.name,
        command: c.command,
        commandType: c.commandType,
        os: c.os,
      }));
    }

    if (configItems.length === 0) {
      throw new BadRequestError('No configurations found for the given IDs');
    }

    // Verify agents exist
    const agents = await prisma.agent.findMany({
      where: { id: { in: targetAgentIds } },
      select: { id: true, name: true, hostname: true, os: true },
    });

    if (agents.length === 0) {
      throw new NotFoundError('No valid agents found');
    }

    const deploymentId = `CD-${uuidv4().slice(0, 8).toUpperCase()}`;
    const errors: string[] = [];

    const foundAgentIds = new Set(agents.map(a => a.id));
    const missingAgents = targetAgentIds.filter(id => !foundAgentIds.has(id));
    if (missingAgents.length > 0) {
      errors.push(`Agents not found: ${missingAgents.join(', ')}`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create deployment record
      const deployment = await tx.configDeployment.create({
        data: {
          deploymentId,
          deploymentName: name,
          description,
          selectionType,
          selectedItems: configItems.map(c => c.id),
          scope: 'custom',
          endpoints: targetAgentIds,
          retryCount,
          notifyTo: 'admin',
          stage: 'IN_PROGRESS',
          pending: agents.length * configItems.length,
          succeeded: 0,
          failed: 0,
          createdBy,
        },
      });

      // 2. Create tasks and commands for each agent × config combination
      let commandsCreated = 0;

      for (const agent of agents) {
        for (const config of configItems) {
          // Build inline script based on command type
          let script = config.command;
          if (config.commandType === 'powershell') {
            script = config.command; // Agent handles PowerShell detection
          }

          const command = await tx.agentCommand.create({
            data: {
              agentId: agent.id,
              type: COMMAND_TYPES.SCRIPT_INLINE,
              payload: {
                script,
                scriptType: config.commandType, // powershell, cmd, bash, sh
                configName: config.name,
                configId: config.id,
                requiresRoot: config.commandType === 'bash' || config.commandType === 'sh',
              } as unknown as Prisma.InputJsonValue,
              status: 'pending',
              scheduledAt: new Date(),
            },
          });

          await tx.configDeploymentTask.create({
            data: {
              deploymentId: deployment.id,
              endpointId: agent.id,
              endpointName: agent.hostname || agent.name || agent.id,
              endpointOs: agent.os || 'Unknown',
              itemName: config.name,
              status: 'PENDING',
              commandId: command.id,
              createdBy,
            },
          });

          commandsCreated++;
        }
      }

      return {
        deploymentId: deployment.deploymentId,
        tasksCreated: agents.length * configItems.length,
        commandsCreated,
      };
    });

    return {
      ...result,
      status: errors.length > 0 ? 'partial' : 'created',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get config deployment status with task details
   */
  async getConfigDeploymentStatus(deploymentId: string) {
    const deployment = await prisma.configDeployment.findFirst({
      where: { OR: [{ deploymentId }, { id: deploymentId }] },
      include: {
        tasks: {
          include: {
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
      throw new NotFoundError('Config deployment not found');
    }

    return {
      id: deployment.id,
      deploymentId: deployment.deploymentId,
      name: deployment.deploymentName,
      description: deployment.description,
      stage: deployment.stage,
      pending: deployment.pending,
      succeeded: deployment.succeeded,
      failed: deployment.failed,
      total: deployment.tasks.length,
      progress: deployment.tasks.length > 0
        ? Math.round(((deployment.succeeded + deployment.failed) / deployment.tasks.length) * 100)
        : 0,
      createdBy: deployment.createdBy,
      createdAt: deployment.createdAt,
      tasks: deployment.tasks.map(task => ({
        id: task.id,
        endpointId: task.endpointId,
        endpointName: task.endpointName,
        endpointOs: task.endpointOs,
        itemName: task.itemName,
        agentId: task.endpointId,
        agentName: task.endpointName,
        agentOs: task.endpointOs,
        configName: task.itemName,
        status: task.status.toLowerCase(),
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        errorMessage: task.errorMessage,
        output: task.output,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        command: task.command,
      })),
    };
  }

  /**
   * Cancel a deployment (cancel all pending tasks)
   */
  async cancelSoftwareDeployment(deploymentId: string): Promise<void> {
    const deployment = await prisma.softwareDeployment.findUnique({
      where: { deploymentId },
      include: {
        tasks: {
          where: { status: 'PENDING' },
          include: { command: true },
        },
      },
    });

    if (!deployment) {
      throw new NotFoundError('Deployment not found');
    }

    await prisma.$transaction(async (tx) => {
      // Cancel all pending commands
      for (const task of deployment.tasks) {
        if (task.commandId) {
          await tx.agentCommand.update({
            where: { id: task.commandId },
            data: { status: 'cancelled' },
          });
        }

        await tx.softwareDeploymentTask.update({
          where: { id: task.id },
          data: { status: 'CANCELLED' },
        });
      }

      // Update deployment
      await tx.softwareDeployment.update({
        where: { id: deployment.id },
        data: {
          stage: 'CANCELLED',
          pending: 0,
        },
      });
    });
  }

  /**
   * Resolve asset vulnerabilities when patches are successfully deployed
   * Marks AssetVulnerability records as "Patched" for CVEs covered by the patches
   */
  private async resolveAssetVulnerabilitiesForPatches(
    tx: Prisma.TransactionClient,
    assetId: string,
    patches: { cveNumbers: string[] }[]
  ): Promise<void> {
    // Collect all CVE numbers from the deployed patches
    const allCves: string[] = [];
    for (const patch of patches) {
      if (patch.cveNumbers && patch.cveNumbers.length > 0) {
        allCves.push(...patch.cveNumbers);
      }
    }

    if (allCves.length === 0) {
      return; // No CVEs to resolve
    }

    // Find vulnerabilities matching the CVEs
    const vulnerabilities = await tx.vulnerability.findMany({
      where: { cveId: { in: allCves } },
      select: { id: true, cveId: true },
    });

    if (vulnerabilities.length === 0) {
      return; // No matching vulnerabilities in database
    }

    const vulnerabilityIds = vulnerabilities.map(v => v.id);

    // Update AssetVulnerability records to "Patched"
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
      console.log(`[Patch Deploy] Resolved ${result.count} vulnerabilities for asset ${assetId}: ${cveList}`);
    }
  }

  /**
   * Finalize a patch deployment when all tasks are done (no pending tasks remain).
   */
  private async finalizePatchDeployment(tx: any, deployment: any): Promise<void> {
    const finalStage = deployment.failed > 0 ? 'FAILED' : 'COMPLETED';
    await tx.patchDeployment.update({
      where: { id: deployment.id },
      data: {
        stage: finalStage,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    if (deployment.createdBy) {
      const isSuccess = finalStage === 'COMPLETED';
      notificationsService.create({
        userId: deployment.createdBy,
        title: isSuccess ? 'Patch Deployment Complete' : 'Patch Deployment Failed',
        message: `Patch deployment "${deployment.name}" ${isSuccess ? 'completed successfully' : 'has failed'}`,
        type: isSuccess ? 'success' : 'error',
        category: 'deployment',
        link: '/patches/deployed/deployed',
      }).catch(() => {});
    }
  }

  /**
   * Check if a patch deployment is complete and finalize it.
   * Called by processTaskFailure after a final failure (no more retries).
   */
  async checkPatchDeploymentCompletion(deploymentId: string): Promise<void> {
    const deployment = await prisma.patchDeployment.findUnique({
      where: { id: deploymentId },
    });

    if (deployment && deployment.pending === 0 && deployment.stage !== 'COMPLETED' && deployment.stage !== 'FAILED') {
      await prisma.$transaction(async (tx) => {
        // Re-fetch inside transaction
        const dep = await tx.patchDeployment.findUnique({ where: { id: deploymentId } });
        if (dep && dep.pending === 0) {
          await this.finalizePatchDeployment(tx, dep);
        }
      });
    }
  }

  /**
   * Process a failed patch deployment task.
   * If retries remain, schedule a new attempt. If all retries exhausted, auto-rollback if configured.
   */
  async processTaskFailure(taskId: string): Promise<{ action: 'retry' | 'rollback' | 'final_failure' }> {
    const task = await prisma.patchDeploymentTask.findUnique({
      where: { id: taskId },
      include: {
        deployment: { include: { patches: true } },
      },
    });

    if (!task || task.status !== 'failed') {
      return { action: 'final_failure' };
    }

    const deployment = task.deployment;
    const retryCount = deployment.retryCount || 0;
    const retryDelay = deployment.retryDelay || 60; // seconds

    // 1. Retry if attempts remain
    if (task.retryAttempt < retryCount) {
      // Find the original command to replicate
      const originalCommand = task.commandId
        ? await prisma.agentCommand.findUnique({ where: { id: task.commandId } })
        : null;

      if (originalCommand) {
        // Create a new retry command
        const retryCommand = await prisma.agentCommand.create({
          data: {
            agentId: originalCommand.agentId,
            type: originalCommand.type,
            payload: originalCommand.payload as Prisma.InputJsonValue,
            status: 'pending',
            scheduledAt: new Date(Date.now() + retryDelay * 1000),
          },
        });

        // Update task: back to pending with incremented retry attempt
        await prisma.patchDeploymentTask.update({
          where: { id: taskId },
          data: {
            status: 'pending',
            retryAttempt: { increment: 1 },
            commandId: retryCommand.id,
            errorMessage: null,
            completedAt: null,
          },
        });

        // Adjust deployment counts: failed-- pending++
        await prisma.patchDeployment.update({
          where: { id: deployment.id },
          data: {
            failed: { decrement: 1 },
            pending: { increment: 1 },
          },
        });

        console.log(`[Auto-Retry] Task ${taskId} retry ${task.retryAttempt + 1}/${retryCount}, next command ${retryCommand.id} in ${retryDelay}s`);
        return { action: 'retry' };
      }
    }

    // 2. Auto-rollback if configured and rollback available
    if (deployment.autoRollback && task.rollbackAvailable) {
      const originalCommand = task.commandId
        ? await prisma.agentCommand.findUnique({ where: { id: task.commandId } })
        : null;

      if (originalCommand) {
        const rollbackCommand = await prisma.agentCommand.create({
          data: {
            agentId: originalCommand.agentId,
            type: COMMAND_TYPES.HUB_PATCH_ROLLBACK,
            payload: {
              rollbackId: `RB-${task.commandId}`,
              patchId: deployment.patches?.[0]?.patchId || undefined,
            } as unknown as Prisma.InputJsonValue,
            status: 'pending',
            scheduledAt: new Date(),
          },
        });

        await prisma.patchDeploymentTask.update({
          where: { id: taskId },
          data: { status: 'rolled_back' },
        });

        console.log(`[Auto-Rollback] Task ${taskId} rollback initiated, command ${rollbackCommand.id}`);
        // Check if deployment is now complete
        await this.checkPatchDeploymentCompletion(deployment.id);
        return { action: 'rollback' };
      }
    }

    // 3. Final failure — notify and check completion
    if (deployment.createdBy) {
      notificationsService.create({
        userId: deployment.createdBy,
        title: 'Patch Task Failed',
        message: `Task for "${deployment.patches?.[0]?.title || 'unknown'}" in deployment "${deployment.name}" has permanently failed after ${task.retryAttempt} retries`,
        type: 'error',
        category: 'deployment',
        link: '/patches/deployed/deployed',
      }).catch(() => {});
    }

    console.log(`[Task Failure] Task ${taskId} permanently failed after ${task.retryAttempt} retries`);
    await this.checkPatchDeploymentCompletion(deployment.id);
    return { action: 'final_failure' };
  }

  /**
   * Trigger a rollback for a completed task
   * Creates a rollback command for the agent
   */
  async triggerRollback(
    deploymentId: string,
    taskId: string,
    options: { force?: boolean } = {}
  ): Promise<{ commandId: string; status: string }> {
    // Find the deployment and task
    const deployment = await prisma.softwareDeployment.findUnique({
      where: { deploymentId },
    });

    if (!deployment) {
      throw new NotFoundError('Deployment not found');
    }

    const task = await prisma.softwareDeploymentTask.findFirst({
      where: {
        id: taskId,
        deploymentId: deployment.id,
      },
      include: { command: true },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (!['SUCCESS', 'FAILED'].includes(task.status)) {
      throw new BadRequestError('Can only rollback completed or failed tasks');
    }

    if (!task.endpointId) {
      throw new BadRequestError('Task has no associated endpoint');
    }

    // Create a rollback command for the agent
    // The agent tracks rollback info locally, so we just send the rollback_execute command
    // The rollback ID is generated based on the original command ID
    const rollbackCommand = await prisma.agentCommand.create({
      data: {
        agentId: task.endpointId,
        type: COMMAND_TYPES.ROLLBACK_EXECUTE || 'rollback_execute',
        payload: {
          rollbackId: `RB-${task.commandId}`, // Convention: rollback ID based on original command
          force: options.force || false,
        } as unknown as Prisma.InputJsonValue,
        status: 'pending',
        scheduledAt: new Date(),
      },
    });

    // Update task to indicate rollback is in progress
    await prisma.softwareDeploymentTask.update({
      where: { id: task.id },
      data: {
        status: 'ROLLBACK_IN_PROGRESS',
      },
    });

    return {
      commandId: rollbackCommand.id,
      status: 'rollback_initiated',
    };
  }
}

export const deploymentExecutorService = new DeploymentExecutorService();
