/**
 * Software & Config Deployment Creation
 */
import { prisma } from '@/db/client';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { toJsonInput } from '@shared/utils';
import { createLogger } from '@shared/services/logger';
import { withTransaction } from '@shared/utils/transaction';
import { hubService } from '@modules/hub/hub.service';
import { env } from '@/config/env';
import { notificationsService } from '@/modules/notifications/notifications.service';
import {
  CreateSoftwareDeploymentOptions,
  CreateConfigDeploymentOptions,
  DeploymentCreationResult,
  COMMAND_TYPES,
  SoftwareInstallPayload,
  ScriptBundlePayload,
  ScriptManifest,
} from './deployment-executor.types';
import { getDefaultSourceForOS } from './deployment-executor-helpers';

const logger = createLogger('deployment-executor-software');

export class DeploymentExecutorSoftwareService {
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

    const retryCount = typeof retryCountInput === 'string'
      ? parseInt(retryCountInput, 10) || 1
      : retryCountInput;

    if (targetAgentIds.length === 0) {
      throw new BadRequestError('At least one target agent is required');
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

    const deploymentId = `SD-${uuidv4().slice(0, 8).toUpperCase()}`;
    const errors: string[] = [];

    if (missingAgents.length > 0) {
      errors.push(`Agents not found: ${missingAgents.join(', ')}`);
    }

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
    let hubInstallCommand: string | null = null;

    if (pkgPayload.packageId) {
      try {
        const pkg = await prisma.softwarePackage.findUnique({
          where: { packageId: pkgPayload.packageId },
        });

        if (pkg) {
          hubInstallCommand = pkg.installCommand;
        }

        if (pkg && (pkg.bundleObjectKey || pkg.scriptsIncluded)) {
          if (pkg.bundleObjectKey) {
            const bundleInfo = await hubService.getBundleDownloadInfo(pkg.packageId);
            const backendUrl = env.BACKEND_PUBLIC_URL.replace(/\/$/, '');
            const proxyBundleUrl = `${backendUrl}/v1/bundles/${pkg.packageId}/download`;

            hubPackage = {
              bundleUrl: proxyBundleUrl,
              bundleChecksum: bundleInfo.bundleChecksum,
              manifest: bundleInfo.manifest,
              scriptsIncluded: true,
              requiresRoot: pkg.requiresRoot,
            };
          } else if (pkg.scriptInstall || pkg.scriptUninstall) {
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
        logger.info({ packageId: pkgPayload.packageId }, 'Package not found in Hub, using legacy mode');
      }
    }

    let commandType: string;
    let commandPayload: Prisma.InputJsonValue;

    if (hubPackage?.scriptsIncluded) {
      let operationType: 'install' | 'update' | 'rollback' | 'uninstall' = 'install';
      if (deploymentType === 'UNINSTALL') operationType = 'uninstall';
      else if (deploymentType === 'UPGRADE') operationType = 'update';
      else if (deploymentType === 'ROLLBACK') operationType = 'rollback';

      if (deploymentType === 'UNINSTALL') commandType = COMMAND_TYPES.HUB_UNINSTALL;
      else if (deploymentType === 'UPGRADE') commandType = COMMAND_TYPES.HUB_UPDATE;
      else if (deploymentType === 'ROLLBACK') commandType = COMMAND_TYPES.HUB_ROLLBACK;
      else commandType = COMMAND_TYPES.HUB_INSTALL;

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

      commandPayload = toJsonInput(bundlePayload);
    } else {
      const pkg = packageInfo as SoftwareInstallPayload & { packageId?: string };
      if ((pkg.source as string) === 'bundle' || !pkg.source) {
        // Will be resolved per-agent below based on agent OS
      }
      commandType = deploymentType === 'UNINSTALL'
        ? COMMAND_TYPES.SOFTWARE_UNINSTALL
        : COMMAND_TYPES.SOFTWARE_INSTALL;
      commandPayload = toJsonInput(packageInfo);
    }

    const result = await withTransaction('createSoftwareDeployment', async (tx) => {
      const deployment = await tx.softwareDeployment.create({
        data: {
          deploymentId,
          deploymentName: name,
          description,
          deploymentType,
          selectionType: 'APPLICATION',
          selectedItems: [(packageInfo as SoftwareInstallPayload).name],
          scope: 'custom',
          endpoints: targetAgentIds,
          retryCount,
          notifyTo: 'admin',
          status: 'IN_PROGRESS',
          pending: agents.length,
          succeeded: 0,
          failed: 0,
          createdBy,
        },
      });

      let commandsCreated = 0;

      for (const agent of agents) {
        let agentPayload = commandPayload;
        const pkgInfo = packageInfo as SoftwareInstallPayload;
        if (!hubPackage?.scriptsIncluded && ((pkgInfo.source as string) === 'bundle' || !pkgInfo.source)) {
          const osSource = getDefaultSourceForOS(agent.os || 'Unknown');
          const pkgName = hubInstallCommand || pkgInfo.name;
          agentPayload = toJsonInput({ name: pkgName, source: osSource });
        }

        const command = await tx.agentCommand.create({
          data: {
            agentId: agent.id,
            type: commandType,
            payload: agentPayload,
            status: 'PENDING',
            scheduledAt: new Date(),
          },
        });

        await tx.softwareDeploymentTask.create({
          data: {
            deploymentId: deployment.id,
            agentId: agent.id,
            assetId: agent.assetId || undefined,
            agentName: agent.hostname || agent.name || agent.id,
            agentOs: agent.os || 'Unknown',
            packageName: (packageInfo as SoftwareInstallPayload).name,
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
      status: errors.length > 0 ? 'PARTIAL' : 'CREATED',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Create a configuration deployment with tasks and commands
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
      selectionType = 'CONFIGURATION',
      retryCount = 1,
      createdBy,
    } = options;

    if (targetAgentIds.length === 0) {
      throw new BadRequestError('At least one target agent is required');
    }

    let configItems: { id: string; name: string; command: string; commandType: string; os: string }[] = [];

    if (selectionType === 'BUNDLE' && bundleIds && bundleIds.length > 0) {
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

    const result = await withTransaction('createConfigDeployment', async (tx) => {
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
          status: 'IN_PROGRESS',
          pending: agents.length * configItems.length,
          succeeded: 0,
          failed: 0,
          createdBy,
        },
      });

      let commandsCreated = 0;

      for (const agent of agents) {
        for (const config of configItems) {
          let script = config.command;
          if (config.commandType === 'powershell') {
            script = config.command;
          }

          const command = await tx.agentCommand.create({
            data: {
              agentId: agent.id,
              type: COMMAND_TYPES.SCRIPT_INLINE,
              payload: toJsonInput({
                script,
                scriptType: config.commandType,
                configName: config.name,
                configId: config.id,
                requiresRoot: config.commandType === 'bash' || config.commandType === 'sh',
              }),
              status: 'PENDING',
              scheduledAt: new Date(),
            },
          });

          await tx.configDeploymentTask.create({
            data: {
              deploymentId: deployment.id,
              agentId: agent.id,
              agentName: agent.hostname || agent.name || agent.id,
              agentOs: agent.os || 'Unknown',
              configName: config.name,
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
      status: errors.length > 0 ? 'PARTIAL' : 'CREATED',
      errors: errors.length > 0 ? errors : undefined,
    };
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
      status: deployment.status,
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
        agentId: task.agentId,
        agentName: task.agentName,
        agentOs: task.agentOs,
        packageName: task.packageName,
        status: task.status,
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
   * Cancel a software deployment (cancel all pending tasks)
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

    await withTransaction('cancelDeployment', async (tx) => {
      for (const task of deployment.tasks) {
        if (task.commandId) {
          await tx.agentCommand.update({
            where: { id: task.commandId },
            data: { status: 'CANCELLED' },
          });
        }

        await tx.softwareDeploymentTask.update({
          where: { id: task.id },
          data: { status: 'CANCELLED' },
        });
      }

      await tx.softwareDeployment.update({
        where: { id: deployment.id },
        data: {
          status: 'CANCELLED',
          pending: 0,
        },
      });
    });
  }

  /**
   * Trigger a rollback for a completed task
   */
  async triggerRollback(
    deploymentId: string,
    taskId: string,
    options: { force?: boolean } = {}
  ): Promise<{ commandId: string; status: string }> {
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

    if (!task.agentId) {
      throw new BadRequestError('Task has no associated agent');
    }

    const rollbackCommand = await prisma.agentCommand.create({
      data: {
        agentId: task.agentId,
        type: COMMAND_TYPES.ROLLBACK_EXECUTE || 'rollback_execute',
        payload: toJsonInput({
          rollbackId: `RB-${task.commandId}`,
          force: options.force || false,
        }),
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });

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
      status: deployment.status,
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
        agentId: task.agentId,
        agentName: task.agentName,
        agentOs: task.agentOs,
        configName: task.configName,
        status: task.status,
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
}

export const deploymentExecutorSoftwareService = new DeploymentExecutorSoftwareService();
