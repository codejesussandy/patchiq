import { prisma } from '@/db/client';
import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError, ForbiddenError } from '@shared/errors';
import { cveDatabase } from '@shared/services/cve-database.service';
import { createLogger } from '@shared/services/logger';
import { calculateAgentStatus } from '@shared/utils/agent-status';
import { getRelativeTime } from '@shared/utils/date';
import { generateTokenPair } from '@shared/utils/jwt';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { withTransaction } from '@shared/utils/transaction';
import { evaluateAlertsForAsset, evaluateSecurityAlertsForAsset } from '@/modules/alerts/alert-evaluation.service';
import { notificationsService } from '@/modules/notifications/notifications.service';
import { settingsService } from '@modules/settings/settings.service';
import { getTypedServerSettings } from '@modules/settings/server-settings';
import type {
  AgentResponse,
  AgentDownloadResponse,
  AgentVersionResponse,
  CommandResponse,
  ListAgentsParams,
  RegisterAgentResponse,
  HeartbeatResponse,
  AgentConfig,
  PendingCommand,
} from './agents.types';
import type {
  RegisterAgentInput,
  HeartbeatInput,
  CommandResultInput,
  InventoryInput,
  CreateAgentVersionInput,
  UpdateAgentVersionInput,
  } from './agents.validators';

const logger = createLogger('agents');

export class AgentsService {
  /**
   * Register a new agent or re-register existing one
   */
  async registerAgent(input: RegisterAgentInput): Promise<RegisterAgentResponse> {
    // Step 1: Validate enrollment secret
    const enrollResult = await settingsService.validateEnrollSecret(input.enrollSecret);

    // Check if agent already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { machineId: input.machineId },
    });

    if (existingAgent) {
      // Re-registration - validate enrollment secret but don't increment usage
      // (Re-registration is allowed with the same secret without consuming additional uses)

      const agent = await withTransaction('reRegisterAgent', async (tx) => {
        const agentUpdateData: Record<string, unknown> = {
          hostname: input.hostname,
          os: input.os,
          osVersion: input.osVersion,
          architecture: input.architecture,
          agentVersion: input.agentVersion,
          ipAddress: input.ipAddress,
          macAddress: input.macAddress,
          serialNumber: input.serialNumber,
          status: 'CONNECTED',
          lastHeartbeat: new Date(),
        };

        // If agent has no linked asset, create one now
        if (!existingAgent.assetId) {
          const asset = await tx.asset.create({
            data: {
              name: input.hostname,
              status: 'IN_USE',
              os: input.os,
              osVersion: input.osVersion,
              manufacturer: input.manufacturer,
              model: input.model,
              serialNumber: input.serialNumber,
              ipAddress: input.ipAddress,
              macAddress: input.macAddress,
            },
          });
          agentUpdateData.assetId = asset.id;
        }

        return tx.agent.update({
          where: { id: existingAgent.id },
          data: agentUpdateData,
        });
      });

      // Generate new tokens
      const tokens = generateTokenPair({
        userId: agent.id,
        email: agent.machineId,
        role: 'agent',
      });

      return {
        agentId: agent.id,
        assetId: agent.assetId,
        ...tokens,
        tokenExpiresIn: 3600,
        config: await this.getDefaultConfig(),
        isReRegistration: true,
        status: existingAgent.status as 'CONNECTED' | 'PENDING_APPROVAL' | 'REJECTED' | 'ERROR' | 'DISCONNECTED',
        message: 'Agent re-registered successfully',
      };
    }

    // Determine initial status based on agent approval settings
    let initialStatus = 'CONNECTED';
    try {
      const approvalSettings = await settingsService.getAgentApprovalSettings();
      if (approvalSettings.approvalType === 'MANUAL') {
        initialStatus = 'PENDING_APPROVAL';
      } else if (approvalSettings.approvalType === 'AUTO') {
        if (approvalSettings.autoApprovalBasedOn === 'CRITERIA') {
          const criteria = approvalSettings.criteria as { osPatterns?: string[] };
          const osPatterns = criteria?.osPatterns || [];
          if (osPatterns.length > 0) {
            const agentOs = (input.os || '').toLowerCase();
            const agentOsVersion = (input.osVersion || '').toLowerCase();
            const matchesCriteria = osPatterns.some(pattern => {
              const p = pattern.toLowerCase();
              return agentOs.includes(p) || agentOsVersion.includes(p);
            });
            if (!matchesCriteria) {
              initialStatus = 'PENDING_APPROVAL';
            }
          }
        }
        // If autoApprovalBasedOn === 'ALL', keep CONNECTED (auto-approve all)
      }
    } catch (err) {
      // Default to auto-approve if settings not found
    }

    // Create new agent and asset in a transaction
    // IMPORTANT: Increment enrollment secret usage INSIDE the transaction to ensure atomicity
    const [agent, asset] = await withTransaction('registerAgent', async (tx) => {

      // Create asset first
      const asset = await tx.asset.create({
        data: {
          name: input.hostname,
          status: 'IN_USE',
          os: input.os,
          osVersion: input.osVersion,
          manufacturer: input.manufacturer,
          model: input.model,
          serialNumber: input.serialNumber,
          ipAddress: input.ipAddress,
          macAddress: input.macAddress,
        },
      });

      // Create agent linked to asset
      const agent = await tx.agent.create({
        data: {
          machineId: input.machineId,
          name: input.hostname,
          os: input.os,
          osVersion: input.osVersion,
          architecture: input.architecture,
          agentVersion: input.agentVersion,
          hostname: input.hostname,
          ipAddress: input.ipAddress,
          macAddress: input.macAddress,
          serialNumber: input.serialNumber,
          assetId: asset.id,
          status: initialStatus,
          lastHeartbeat: new Date(),
          capabilities: ['scan', 'deploy', 'reboot', 'update'],
        },
      });

      // Increment enrollment secret usage count INSIDE transaction for atomicity
      // This ensures the secret validation and increment happen atomically
      if (enrollResult) {
        await tx.enrollSecret.update({
          where: { id: enrollResult.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return [agent, asset];
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: agent.id,
      email: agent.machineId,
      role: 'agent',
    });

    // Notify admins about new agent registration
    notificationsService.broadcast({
      title: `New Agent: ${input.hostname || input.machineId}`,
      message: `A new agent has registered from ${input.ipAddress || 'unknown IP'}`,
      type: 'INFO',
      category: 'AGENT',
      link: '/discovery/agents',
    }).catch(() => {});

    return {
      agentId: agent.id,
      assetId: asset.id,
      ...tokens,
      tokenExpiresIn: 3600,
      config: await this.getDefaultConfig(),
      isReRegistration: false,
      status: initialStatus as 'CONNECTED' | 'PENDING_APPROVAL' | 'REJECTED' | 'ERROR' | 'DISCONNECTED',
    };
  }

  /**
   * Process agent heartbeat
   */
  async processHeartbeat(agentId: string, input: HeartbeatInput, agentVersion?: string): Promise<Omit<HeartbeatResponse, 'acknowledged' | 'serverTime'>> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Reject heartbeats from agents that have been rejected
    if (agent.status === 'REJECTED') {
      throw new ForbiddenError('Agent has been rejected. Contact your administrator.');
    }

    // Check if inventory was requested before we update
    const inventoryWasRequested = agent.inventoryRequested ?? false;

    // Detect status change to Error
    const newStatus = input.status === 'error' ? 'ERROR' : 'CONNECTED';
    const statusChangedToError = newStatus === 'ERROR' && agent.status !== 'ERROR';

    // Update agent status (and clear inventoryRequested flag if set)
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: newStatus,
        lastHeartbeat: new Date(),
        ipAddress: input.ipAddress || agent.ipAddress,
        ...(agentVersion ? { agentVersion } : {}),
        // Clear the flag after we've noted it
        inventoryRequested: false,
      },
    });

    // Notify admins if agent just entered error state
    if (statusChangedToError) {
      notificationsService.broadcast({
        title: `Agent Error: ${agent.hostname || agent.name || agentId}`,
        message: `Agent is reporting error status`,
        type: 'ERROR',
        category: 'AGENT',
        dedupKey: `agent-error-${agentId}`,
        link: '/discovery/agents',
      }).catch(() => {});
    }

    // Evaluate alerts from heartbeat metrics (telemetry records are created by processTelemetry)
    if (agent.assetId) {
      evaluateAlertsForAsset(agent.assetId, {
        cpuUsage: input.cpuUsage,
        memoryUsage: input.memoryUsage,
        diskUsage: input.diskUsage,
      }).catch(() => {});
    }

    // Check for pending actions
    const pendingCommands = await prisma.agentCommand.count({
      where: { agentId, status: 'PENDING' },
    });

    return {
      commandsPending: pendingCommands > 0,
      configUpdated: false,
      inventoryRequested: inventoryWasRequested,
    };
  }

  /**
   * List agents with filtering
   */
  async listAgents(params: ListAgentsParams) {
    const where: Record<string, unknown> = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.os) {
      where.os = params.os;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { hostname: { contains: params.search, mode: 'insensitive' } },
        { machineId: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [agents, total, serverSettings] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          tags: true,
          groups: { include: { group: true } },
        },
        orderBy: { lastHeartbeat: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.agent.count({ where }),
      getTypedServerSettings(),
    ]);

    // R1B: Use configured endpoint online status timeout
    const offlineThresholdSeconds = serverSettings.endpointOnlineStatusTimeoutHours * 3600;

    // Transform to match frontend expectations
    const transformedAgents: AgentResponse[] = agents.map((agent) => ({
      id: agent.id,
      machineId: agent.machineId,
      name: agent.name,
      status: calculateAgentStatus(agent, offlineThresholdSeconds),
      os: agent.os,
      osVersion: agent.osVersion,
      agentVersion: agent.agentVersion,
      lastHeartbeat: agent.lastHeartbeat?.toISOString() ?? null,
      lastHeartbeatRelative: agent.lastHeartbeat
        ? getRelativeTime(agent.lastHeartbeat)
        : null,
      registeredAt: agent.registeredAt.toISOString(),
      ipAddress: agent.ipAddress,
      macAddress: agent.macAddress,
      hostname: agent.hostname,
      serialNumber: agent.serialNumber,
      assetId: agent.assetId,
      tags: agent.tags.map((t) => t.tag),
      groups: agent.groups.map((g) => ({
        id: g.group.id,
        name: g.group.name,
      })),
      capabilities: agent.capabilities as string[],
    }));

    return paginate(transformedAgents, total, params);
  }

  /**
   * Get agent by ID
   */
  async getAgentById(id: string): Promise<AgentResponse> {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        tags: true,
        groups: { include: { group: true } },
        asset: true,
      },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // R1B: Use configured endpoint online status timeout
    const serverSettings = await getTypedServerSettings();
    const offlineThresholdSeconds = serverSettings.endpointOnlineStatusTimeoutHours * 3600;

    return {
      id: agent.id,
      machineId: agent.machineId,
      name: agent.name,
      status: calculateAgentStatus(agent, offlineThresholdSeconds),
      os: agent.os,
      osVersion: agent.osVersion,
      agentVersion: agent.agentVersion,
      lastHeartbeat: agent.lastHeartbeat?.toISOString() ?? null,
      lastHeartbeatRelative: agent.lastHeartbeat
        ? getRelativeTime(agent.lastHeartbeat)
        : null,
      registeredAt: agent.registeredAt.toISOString(),
      ipAddress: agent.ipAddress,
      macAddress: agent.macAddress,
      hostname: agent.hostname,
      serialNumber: agent.serialNumber,
      assetId: agent.assetId,
      tags: agent.tags.map((t) => t.tag),
      groups: agent.groups.map((g) => ({
        id: g.group.id,
        name: g.group.name,
      })),
      capabilities: agent.capabilities as string[],
    };
  }

  /**
   * Update agent
   */
  async updateAgent(id: string, data: { name?: string; tags?: string[] }): Promise<AgentResponse> {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        tags: true,
        groups: { include: { group: true } },
      },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const finalAgent = await withTransaction('updateAgent', async (tx) => {
      // Update basic fields
      await tx.agent.update({
        where: { id },
        data: {
          name: data.name || agent.name,
        },
      });

      // Handle tags update if provided
      if (data.tags !== undefined) {
        // Remove existing tag associations
        await tx.agentTagRelation.deleteMany({
          where: { agentId: id },
        });

        // Add new tag associations
        if (data.tags.length > 0) {
          const tagRecords = await tx.tag.findMany({
            where: { id: { in: data.tags } },
          });

          await tx.agentTagRelation.createMany({
            data: tagRecords.map((tag) => ({
              agentId: id,
              tag: tag.name,
            })),
          });
        }
      }

      // Fetch updated agent with tags
      return tx.agent.findUnique({
        where: { id },
        include: {
          tags: true,
          groups: { include: { group: true } },
        },
      });
    });

    // R1B: Use configured endpoint online status timeout
    const updateServerSettings = await getTypedServerSettings();
    const updateOfflineThresholdSeconds = updateServerSettings.endpointOnlineStatusTimeoutHours * 3600;

    return {
      id: finalAgent!.id,
      machineId: finalAgent!.machineId,
      name: finalAgent!.name,
      status: calculateAgentStatus(finalAgent!, updateOfflineThresholdSeconds),
      os: finalAgent!.os,
      osVersion: finalAgent!.osVersion,
      agentVersion: finalAgent!.agentVersion,
      lastHeartbeat: finalAgent!.lastHeartbeat?.toISOString() ?? null,
      lastHeartbeatRelative: finalAgent!.lastHeartbeat
        ? getRelativeTime(finalAgent!.lastHeartbeat)
        : null,
      registeredAt: finalAgent!.registeredAt.toISOString(),
      ipAddress: finalAgent!.ipAddress,
      macAddress: finalAgent!.macAddress,
      hostname: finalAgent!.hostname,
      serialNumber: finalAgent!.serialNumber,
      assetId: finalAgent!.assetId,
      tags: finalAgent!.tags.map((t) => t.tag),
      groups: finalAgent!.groups.map((g) => ({
        id: g.group.id,
        name: g.group.name,
      })),
      capabilities: finalAgent!.capabilities as string[],
    };
  }

  /**
   * Delete agent
   */
  async deleteAgent(id: string): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    await prisma.agent.delete({
      where: { id },
    });
  }

  /**
   * Get agent commands
   */
  async getAgentCommands(agentId: string): Promise<CommandResponse[]> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const commands = await prisma.agentCommand.findMany({
      where: { agentId, NOT: { type: 'log_upload' } },
      orderBy: { createdAt: 'desc' },
    });

    return commands.map((cmd) => ({
      id: cmd.id,
      agentId: cmd.agentId,
      type: cmd.type,
      status: cmd.status,
      createdAt: cmd.createdAt.toISOString(),
      executedAt: cmd.executedAt?.toISOString() ?? null,
      result: cmd.result,
    }));
  }

  /**
   * Get failed agent commands and heartbeat errors (error dashboard)
   *
   * Note: The Agent model does not have an `errorMessage` field. Heartbeat errors are
   * reflected as agents with status='ERROR'. These are included as synthetic error entries
   * with type='heartbeat_error' alongside failed AgentCommand records.
   */
  async getAgentErrors(filters: {
    agentId?: string;
    commandType?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    // Exclude log_upload type from failed command errors (they are always COMPLETED)
    const where: Record<string, unknown> = {
      status: 'FAILED',
      NOT: { type: 'log_upload' },
    };

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters.commandType) {
      where.type = filters.commandType;
    }

    if (filters.from || filters.to) {
      const createdAt: Record<string, unknown> = {};
      if (filters.from) createdAt.gte = new Date(filters.from);
      if (filters.to) createdAt.lte = new Date(filters.to);
      where.createdAt = createdAt;
    }

    const skip = (filters.page - 1) * filters.limit;

    const [commandData, commandTotal] = await Promise.all([
      prisma.agentCommand.findMany({
        where,
        include: {
          agent: {
            select: { hostname: true, os: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.agentCommand.count({ where }),
    ]);

    // Also fetch agents currently in ERROR status as heartbeat error entries
    const heartbeatWhere: Record<string, unknown> = { status: 'ERROR' };
    if (filters.agentId) {
      heartbeatWhere.id = filters.agentId;
    }
    if (filters.from || filters.to) {
      const updatedAt: Record<string, unknown> = {};
      if (filters.from) updatedAt.gte = new Date(filters.from);
      if (filters.to) updatedAt.lte = new Date(filters.to);
      heartbeatWhere.updatedAt = updatedAt;
    }

    // Only include heartbeat errors when not filtering by commandType or filtering for heartbeat_error
    const includeHeartbeatErrors = !filters.commandType || filters.commandType === 'heartbeat_error';
    const errorAgents = includeHeartbeatErrors
      ? await prisma.agent.findMany({
          where: heartbeatWhere,
          select: { id: true, hostname: true, os: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        })
      : [];

    // Build synthetic heartbeat error entries to match the AgentCommand shape
    const heartbeatErrors = errorAgents.map((agent) => ({
      id: `heartbeat-${agent.id}`,
      agentId: agent.id,
      type: 'heartbeat_error',
      status: 'FAILED',
      result: null,
      errorMessage: 'Agent is reporting error status via heartbeat',
      payload: null,
      scheduledAt: null,
      executedAt: agent.updatedAt,
      completedAt: null,
      createdAt: agent.updatedAt,
      agent: { hostname: agent.hostname, os: agent.os },
    }));

    const data = [...commandData, ...heartbeatErrors];
    const total = commandTotal + heartbeatErrors.length;

    return { data, total, page: filters.page, limit: filters.limit };
  }

  /**
   * Get pending commands for agent
   */
  async getPendingCommands(agentId: string): Promise<PendingCommand[]> {
    const commands = await prisma.agentCommand.findMany({
      where: { agentId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    // Mark fetched commands as 'delivered' so they aren't re-served on next heartbeat
    if (commands.length > 0) {
      await prisma.agentCommand.updateMany({
        where: { id: { in: commands.map((c) => c.id) } },
        data: { status: 'DELIVERED' },
      });
    }

    return commands.map((cmd) => ({
      id: cmd.id,
      type: cmd.type,
      payload: cmd.payload,
      createdAt: cmd.createdAt.toISOString(),
    }));
  }

  /**
   * Update command result
   * This also syncs the result to any associated deployment tasks
   */
  async updateCommandResult(commandId: string, input: CommandResultInput): Promise<void> {
    const command = await prisma.agentCommand.findUnique({
      where: { id: commandId },
    });

    if (!command) {
      throw new NotFoundError('Command not found');
    }

    // Update the command
    await prisma.agentCommand.update({
      where: { id: commandId },
      data: {
        status: input.status,
        result: input.result as Prisma.InputJsonValue | undefined,
        errorMessage: input.errorMessage || undefined,
        executedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Sync result to deployment tasks
    // Import dynamically to avoid circular dependency
    const { deploymentExecutorService } = await import('@modules/deployments');
    await deploymentExecutorService.processCommandResult({
      commandId,
      status: input.status as 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
      result: input.result as Record<string, unknown> | undefined,
      errorMessage: input.errorMessage,
      output: input.output || (typeof input.result === 'string' ? input.result : undefined),
    });
  }

  /**
   * Queue an inventory refresh command for the agent
   * The agent will execute this on its next heartbeat
   */
  async queueInventoryRefresh(agentId: string): Promise<{ id: string; status: string }> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Create a pending command for inventory collection
    const command = await prisma.agentCommand.create({
      data: {
        agentId,
        type: 'inventory_full',
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });

    return {
      id: command.id,
      status: 'QUEUED',
    };
  }

  /**
   * Trigger on-demand collection for an agent
   * Sets the inventoryRequested flag so agent collects on next heartbeat
   */
  async triggerCollection(agentId: string, type: string = 'all'): Promise<{ commandId: string; status: string; type: string }> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Determine command type based on request
    let commandType = 'inventory_full';
    if (type === 'hardware') commandType = 'inventory_hardware';
    else if (type === 'software') commandType = 'inventory_software';
    else if (type === 'security') commandType = 'inventory_security';
    else if (type === 'telemetry') commandType = 'telemetry_collect';

    // Create a pending command - agent will pick this up on next heartbeat
    const command = await prisma.agentCommand.create({
      data: {
        agentId,
        type: commandType,
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });

    // Also update agent to flag inventory requested (immediate flag for next heartbeat)
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        inventoryRequested: true,
      },
    });

    return {
      commandId: command.id,
      status: 'QUEUED',
      type: commandType,
    };
  }

  /**
   * Trigger agent self-update by queuing an agent_update command
   */
  async triggerAgentUpdate(agentId: string, input: {
    downloadUrl: string;
    checksum: string;
    version: string;
  }): Promise<{ commandId: string; status: string }> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');

    const command = await prisma.agentCommand.create({
      data: {
        agentId,
        type: 'agent_update',
        payload: {
          downloadUrl: input.downloadUrl,
          checksum: input.checksum,
          version: input.version,
        },
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });

    return { commandId: command.id, status: 'QUEUED' };
  }

  /**
   * Bulk update all connected agents to the latest (or specific) version
   */
  async bulkUpdateAgents(versionId?: string): Promise<{ agentsQueued: number; warnings?: string[] }> {
    const { env } = await import('@config/env');
    const baseUrl = env.BACKEND_PUBLIC_URL || `http://localhost:${env.PORT}`;

    // Fetch all connected agents
    const agents = await prisma.agent.findMany({
      where: { status: 'CONNECTED' },
      select: { id: true, os: true, architecture: true },
    });

    if (agents.length === 0) {
      return { agentsQueued: 0 };
    }

    // Group agents by platform/architecture
    const groups = new Map<string, { os: string; architecture: string; agentIds: string[] }>();
    for (const agent of agents) {
      const key = `${agent.os}|${agent.architecture}`;
      if (!groups.has(key)) {
        groups.set(key, { os: agent.os || '', architecture: agent.architecture || '', agentIds: [] });
      }
      groups.get(key)!.agentIds.push(agent.id);
    }

    const commands: Array<{ agentId: string; type: string; payload: Record<string, unknown> }> = [];
    const warnings: string[] = [];

    for (const group of groups.values()) {
      const platform = (group.os || '').toLowerCase();
      const arch = group.architecture || 'unknown';

      let targetVersion;
      if (versionId) {
        try {
          targetVersion = await this.getAgentVersionById(versionId);
        } catch {
          warnings.push(`No agent version found with id '${versionId}' for platform '${platform}/${arch}' — skipped ${group.agentIds.length} agent(s)`);
          continue;
        }
      } else {
        targetVersion = await prisma.agentVersion.findFirst({
          where: {
            platform,
            architecture: group.architecture || undefined,
            isDeprecated: false,
            filePath: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!targetVersion || !targetVersion.filePath) {
        warnings.push(`No binary available for platform '${platform}/${arch}' — skipped ${group.agentIds.length} agent(s)`);
        continue;
      }

      const downloadUrl = `${baseUrl}/api/agent/update/binary/${targetVersion.id}`;
      const checksum = targetVersion.checksum || '';
      const version = targetVersion.version;

      for (const agentId of group.agentIds) {
        commands.push({
          agentId,
          type: 'agent_update',
          payload: { downloadUrl, checksum, version },
        });
      }
    }

    if (commands.length === 0) {
      return { agentsQueued: 0, ...(warnings.length > 0 ? { warnings } : {}) };
    }

    await this.createBatchCommands(commands);

    return { agentsQueued: commands.length, ...(warnings.length > 0 ? { warnings } : {}) };
  }

  /**
   * Update agent metadata by merging new fields into existing metadata JSON
   */
  /**
   * Store agent log snapshot. Uses a dedicated AgentCommand with type 'log_upload'
   * to avoid corrupting the capabilities JSON array field.
   */
  async storeAgentLogs(agentId: string, logData: Record<string, unknown>): Promise<void> {
    // Upsert: delete any previous log_upload command, then create a new one.
    // This keeps only the latest log snapshot per agent.
    await prisma.agentCommand.deleteMany({
      where: { agentId, type: 'log_upload' },
    });
    await prisma.agentCommand.create({
      data: {
        agentId,
        type: 'log_upload',
        status: 'COMPLETED',
        result: JSON.stringify(logData),
        executedAt: new Date(),
      },
    });
  }

  /**
   * Get agent logs (latest log_upload command result)
   */
  async getAgentLogs(agentId: string): Promise<unknown> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');

    const logCommand = await prisma.agentCommand.findFirst({
      where: { agentId, type: 'log_upload' },
      orderBy: { executedAt: 'desc' },
    });
    if (!logCommand?.result) return null;
    try {
      return JSON.parse(logCommand.result as string);
    } catch {
      return logCommand.result;
    }
  }

  /**
   * Get latest telemetry for an agent
   */
  async getLatestTelemetry(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const telemetry = await prisma.agentTelemetry.findFirst({
      where: { agentId },
      orderBy: { timestamp: 'desc' },
    });

    if (!telemetry) {
      return null;
    }

    return {
      id: telemetry.id,
      agentId: telemetry.agentId,
      cpuUsage: telemetry.cpuUsage,
      memoryUsage: telemetry.memoryUsage,
      diskUsage: telemetry.diskUsage,
      uptime: telemetry.uptime,
      networkInBps: telemetry.networkInBps ? Number(telemetry.networkInBps) : null,
      networkOutBps: telemetry.networkOutBps ? Number(telemetry.networkOutBps) : null,
      processCount: telemetry.processCount,
      pendingReboot: telemetry.pendingReboot,
      rawPayload: telemetry.rawPayload,
      timestamp: telemetry.timestamp.toISOString(),
    };
  }

  /**
   * Get agent downloads
   */
  async getAgentDownloads(): Promise<AgentDownloadResponse[]> {
    const downloads = await prisma.agentDownload.findMany({
      orderBy: { releaseDate: 'desc' },
    });

    return downloads.map((d) => ({
      os: d.os,
      version: d.version,
      releaseDate: d.releaseDate.toLocaleDateString('en-GB'),
      downloadUrl: d.downloadUrl,
    }));
  }

  /**
   * Get agent versions
   */
  async getAgentVersions(): Promise<AgentVersionResponse[]> {
    const versions = await prisma.agentVersion.findMany({
      orderBy: { lastUpdatedAt: 'desc' },
    });

    return versions.map((v) => this.transformAgentVersion(v));
  }

  /**
   * Get agent version by ID
   */
  async getLatestAgentVersion(platform: string) {
    return prisma.agentVersion.findFirst({
      where: { platform, filePath: { not: null } },
      orderBy: { lastUpdatedAt: 'desc' },
    });
  }

  async getAgentVersionById(id: string) {
    const version = await prisma.agentVersion.findUnique({
      where: { id },
    });

    if (!version) {
      throw new NotFoundError('Agent version not found');
    }

    return version;
  }

  /**
   * Update agent version file path and size after binary upload
   */
  async updateAgentVersionFile(id: string, filePath: string, fileSize: number, checksum?: string) {
    const version = await prisma.agentVersion.findUnique({ where: { id } });
    if (!version) {
      throw new NotFoundError('Agent version not found');
    }

    return prisma.agentVersion.update({
      where: { id },
      data: {
        filePath,
        fileSize: BigInt(fileSize),
        checksum: checksum || null,
        lastUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Get default agent config
   */
  private async getDefaultConfig(): Promise<AgentConfig> {
    // Read from settings table (same as settings service)
    const { settingsService } = await import('@modules/settings');
    const config = await settingsService.getAgentConfig();
    const refreshCycle = (config.agentRefreshCycle as number) || 300;

    return {
      heartbeatIntervalSeconds: refreshCycle,
      agentRefreshCycle: refreshCycle,
      inventoryScheduleCron: '0 */6 * * *',
      telemetryIntervalSeconds: 60,
      telemetryEnabled: true,
      patchScanScheduleCron: '0 2 * * *',
      logLevel: 'info',
    } as AgentConfig;
  }

  /**
   * Get agent configuration
   */
  async getAgentConfig(agentId: string): Promise<AgentConfig> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    return this.getDefaultConfig();
  }

  /**
   * Process inventory submission from agent
   */
  async processInventory(agentId: string, inventory: InventoryInput): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { asset: true },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Extract hardware data from agent's nested structure
    const hw = inventory.hardware as Record<string, unknown> | undefined;
    const systemIdentity = hw?.systemIdentity as Record<string, unknown> | undefined;
    const processor = hw?.processor as Record<string, unknown> | undefined;
    const memory = hw?.memory as Record<string, unknown> | undefined;
    const bios = hw?.bios as Record<string, unknown> | undefined;
    const graphicsAdapters = hw?.graphicsAdapters as Array<Record<string, unknown>> | undefined;
    const storageDrives = hw?.storageDrives as Array<Record<string, unknown>> | undefined;
    const _battery = hw?.battery as Record<string, unknown> | undefined;

    // Extract software data
    const sw = inventory.software as Record<string, unknown> | undefined;
    const operatingSystem = sw?.operatingSystem as Record<string, unknown> | undefined;

    // Extract network data for hostname and MAC address
    const net = inventory.network as Record<string, unknown> | undefined;
    const networkIdentity = net?.identity as Record<string, unknown> | undefined;
    const networkAdapters = net?.adapters as Array<Record<string, unknown>> | undefined;

    // Extract MAC address from network adapters (prefer default/first physical adapter)
    let macAddressFromNetwork: string | undefined;
    if (networkAdapters && Array.isArray(networkAdapters)) {
      const defaultAdapter = networkAdapters.find(a => a.isDefault === true);
      const physicalAdapter = networkAdapters.find(a =>
        a.type === 'Ethernet' || a.type === 'WiFi'
      );
      const adapterWithMac = defaultAdapter || physicalAdapter || networkAdapters[0];
      if (adapterWithMac?.macAddress) {
        macAddressFromNetwork = adapterWithMac.macAddress as string;
      }
    }

    // Extract software sub-data for use inside transaction
    const softwareData = inventory.software as Record<string, unknown> | undefined;
    const applications = softwareData ? ((softwareData.applications as Array<Record<string, unknown>>) || []) : [];
    const services = softwareData ? ((softwareData.services as Array<Record<string, unknown>>) || []) : [];

    // Security data
    const sec = inventory.security as Record<string, unknown> | undefined;

    // Peripheral data
    const peripherals = inventory.peripherals as Record<string, unknown> | undefined;

    // Wrap all DB operations in a transaction
    await withTransaction('processInventory', async (tx) => {
      // If agent has no linked asset, create one now from inventory data
      if (!agent.assetId) {
        const hwInit = inventory.hardware as Record<string, unknown> | undefined;
        const sysId = hwInit?.systemIdentity as Record<string, unknown> | undefined;
        const swInit = inventory.software as Record<string, unknown> | undefined;
        const osInit = swInit?.operatingSystem as Record<string, unknown> | undefined;

        const asset = await tx.asset.create({
          data: {
            name: agent.hostname || agentId,
            status: 'IN_USE',
            os: agent.os || (osInit?.name as string) || undefined,
            osVersion: agent.osVersion || (osInit?.version as string) || undefined,
            manufacturer: (sysId?.manufacturer as string) || undefined,
            model: (sysId?.model as string) || undefined,
            serialNumber: agent.serialNumber || (sysId?.serialNumber as string) || undefined,
            ipAddress: agent.ipAddress || undefined,
            macAddress: agent.macAddress || undefined,
          },
        });

        await tx.agent.update({
          where: { id: agent.id },
          data: { assetId: asset.id },
        });

        agent.assetId = asset.id;
      }

      // Update asset with inventory data (manufacturer, model, serial from hardware)
      const assetUpdateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (systemIdentity) {
        if (systemIdentity.manufacturer) assetUpdateData.manufacturer = systemIdentity.manufacturer;
        if (systemIdentity.model) assetUpdateData.model = systemIdentity.model;
        if (systemIdentity.serialNumber) assetUpdateData.serialNumber = systemIdentity.serialNumber;
      }

      if (operatingSystem) {
        if (operatingSystem.name) assetUpdateData.os = operatingSystem.name;
        if (operatingSystem.version) assetUpdateData.osVersion = operatingSystem.version;
      }

      if (macAddressFromNetwork) {
        assetUpdateData.macAddress = macAddressFromNetwork;
      }

      if (networkIdentity?.hostname) {
        assetUpdateData.name = networkIdentity.hostname as string;
      }

      await tx.asset.update({
        where: { id: agent.assetId },
        data: assetUpdateData,
      });

      // Update agent with hostname and macAddress from network data
      const agentUpdateData: Record<string, unknown> = {};
      if (networkIdentity?.hostname) {
        agentUpdateData.hostname = networkIdentity.hostname as string;
        agentUpdateData.name = networkIdentity.hostname as string;
      }
      if (macAddressFromNetwork) {
        agentUpdateData.macAddress = macAddressFromNetwork;
      }
      if (Object.keys(agentUpdateData).length > 0) {
        await tx.agent.update({
          where: { id: agentId },
          data: agentUpdateData,
        });
      }

      // Store hardware data if provided
      if (hw) {
        const ramTotalGB = memory?.totalPhysicalGB as number | undefined;
        const ramTotalBytes = ramTotalGB ? BigInt(Math.floor(ramTotalGB * 1024 * 1024 * 1024)) : undefined;

        let diskTotalBytes: bigint | undefined;
        let diskFreeBytes: bigint | undefined;
        let diskType: string | undefined;
        if (storageDrives && Array.isArray(storageDrives)) {
          let totalSize = 0;
          let totalFree = 0;
          for (const drive of storageDrives) {
            const capacity = (drive.capacityGB ?? drive.sizeGB) as number | undefined;
            const freeSpace = (drive.freeSpaceGB ?? drive.freeGB) as number | undefined;
            if (capacity) totalSize += capacity;
            if (freeSpace) totalFree += freeSpace;
            if (!diskType && drive.type) diskType = drive.type as string;
          }
          if (totalSize > 0) diskTotalBytes = BigInt(Math.floor(totalSize * 1024 * 1024 * 1024));
          if (totalFree > 0) diskFreeBytes = BigInt(Math.floor(totalFree * 1024 * 1024 * 1024));
        }

        const gpuModel = graphicsAdapters?.[0]?.name as string | undefined;
        const gpuMemoryMB = graphicsAdapters?.[0]?.memoryMB as number | undefined;
        const biosVendor = bios?.vendor as string | undefined;
        const biosVersion = bios?.version as string | undefined;
        const systemSKU = (systemIdentity?.sku ?? systemIdentity?.assetTag) as string | undefined;
        const cpuManufacturer = processor?.manufacturer as string | undefined;
        const cpuThreads = processor?.threadCount as number | undefined;
        const cpuSpeedMHz = processor?.clockSpeedMHz as number | undefined;
        const ramSlots = memory?.usedSlots as number | undefined;
        const ramType = memory?.type as string | undefined;
        const manufacturer = systemIdentity?.manufacturer as string | undefined;
        const model = systemIdentity?.model as string | undefined;
        const serialNumber = systemIdentity?.serialNumber as string | undefined;

        const combinedPayload = {
          ...hw,
          networkAdapters: networkAdapters || [],
        };

        await tx.assetHardware.upsert({
          where: { assetId: agent.assetId },
          create: {
            assetId: agent.assetId,
            cpu: processor?.name as string | undefined,
            cpuCores: processor?.coreCount as number | undefined,
            cpuManufacturer,
            cpuThreads,
            cpuSpeedMHz,
            ramTotal: ramTotalBytes,
            ramSlots,
            ramType,
            diskTotal: diskTotalBytes,
            diskFree: diskFreeBytes,
            diskType,
            gpuModel,
            gpuMemoryMB,
            biosVendor,
            biosVersion,
            systemSKU,
            manufacturer,
            model,
            serialNumber,
            rawPayload: combinedPayload as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
          update: {
            cpu: processor?.name as string | undefined,
            cpuCores: processor?.coreCount as number | undefined,
            cpuManufacturer,
            cpuThreads,
            cpuSpeedMHz,
            ramTotal: ramTotalBytes,
            ramSlots,
            ramType,
            diskTotal: diskTotalBytes,
            diskFree: diskFreeBytes,
            diskType,
            gpuModel,
            gpuMemoryMB,
            biosVendor,
            biosVersion,
            systemSKU,
            manufacturer,
            model,
            serialNumber,
            rawPayload: combinedPayload as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
        });
      }

      // Store security data if provided
      if (sec) {
        await tx.assetSecurity.upsert({
          where: { assetId: agent.assetId },
          create: {
            assetId: agent.assetId,
            antivirusInstalled: sec.antivirusInstalled as boolean | undefined,
            antivirusName: sec.antivirusName as string | undefined,
            firewallEnabled: sec.firewallEnabled as boolean | undefined,
            encryptionEnabled: sec.encryptionEnabled as boolean | undefined,
          },
          update: {
            antivirusInstalled: sec.antivirusInstalled as boolean | undefined,
            antivirusName: sec.antivirusName as string | undefined,
            firewallEnabled: sec.firewallEnabled as boolean | undefined,
            encryptionEnabled: sec.encryptionEnabled as boolean | undefined,
          },
        });
      }

      // Store software data if provided
      if (inventory.software) {
        await tx.assetSoftware.deleteMany({
          where: { assetId: agent.assetId },
        });

        if (applications.length > 0) {
          await tx.assetSoftware.createMany({
            data: applications.map((app) => ({
              assetId: agent.assetId!,
              name: (app.name as string) || 'Unknown',
              version: app.version as string | undefined,
              vendor: app.vendor as string | undefined,
              installPath: app.path as string | undefined,
              isSystem: app.installSource === 'Pre-installed',
              category: app.category as string | undefined,
            })),
          });
        }

        await tx.assetSoftwareInventory.upsert({
          where: { assetId: agent.assetId },
          create: {
            assetId: agent.assetId,
            osName: operatingSystem?.name as string | undefined,
            osVersion: operatingSystem?.version as string | undefined,
            osBuild: operatingSystem?.build as string | undefined,
            totalApps: applications.length,
            totalServices: services.length,
            rawPayload: softwareData as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
          update: {
            osName: operatingSystem?.name as string | undefined,
            osVersion: operatingSystem?.version as string | undefined,
            osBuild: operatingSystem?.build as string | undefined,
            totalApps: applications.length,
            totalServices: services.length,
            rawPayload: softwareData as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
        });
      }

      // Store peripheral data if provided
      if (peripherals) {
        const monitors = (peripherals.monitors as Array<unknown>) || [];
        const usbDevices = (peripherals.usbDevices as Array<unknown>) || [];
        const printers = (peripherals.printers as Array<unknown>) || [];
        const audioDevices = (peripherals.audioDevices as Array<unknown>) || [];
        const bluetoothDevices = (peripherals.bluetoothDevices as Array<unknown>) || [];

        await tx.assetPeripherals.upsert({
          where: { assetId: agent.assetId },
          create: {
            assetId: agent.assetId,
            monitorCount: monitors.length,
            usbDeviceCount: usbDevices.length,
            printerCount: printers.length,
            audioDeviceCount: audioDevices.length,
            bluetoothDeviceCount: bluetoothDevices.length,
            rawPayload: peripherals as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
          update: {
            monitorCount: monitors.length,
            usbDeviceCount: usbDevices.length,
            printerCount: printers.length,
            audioDeviceCount: audioDevices.length,
            bluetoothDeviceCount: bluetoothDevices.length,
            rawPayload: peripherals as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
        });
      }
    }, { timeout: 30000 });

    // Fire-and-forget operations OUTSIDE the transaction
    if (sec && agent.assetId) {
      evaluateSecurityAlertsForAsset(agent.assetId, {
        firewallEnabled: sec.firewallEnabled as boolean | undefined,
        antivirusInstalled: sec.antivirusInstalled as boolean | undefined,
      }).catch(() => {});
    }

    if (inventory.software && agent.assetId) {
      cveDatabase.checkAssetVulnerabilities(agent.assetId).catch((err) => {
        logger.error({ err, assetId: agent.assetId }, 'Vulnerability check failed');
      });

      import('@modules/patches/patches.service').then(({ checkPatchApplicabilityForAsset }) => {
        checkPatchApplicabilityForAsset(agent.assetId!).catch((err) => {
          logger.error({ err, assetId: agent.assetId }, 'Patch applicability check failed');
        });
      }).catch(() => {});
    }
  }

  /**
   * Process telemetry submission from agent
   */
  async processTelemetry(agentId: string, telemetry: Record<string, unknown>): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const cpu = telemetry.cpu as Record<string, unknown> | undefined;
    const memory = telemetry.memory as Record<string, unknown> | undefined;
    const disk = telemetry.disk as Record<string, unknown> | undefined;
    const network = telemetry.network as Record<string, unknown> | undefined;
    const processes = telemetry.processes as Record<string, unknown> | undefined;
    const systemUptime = telemetry.systemUptime as { uptimeSeconds?: number; uptimeHuman?: string; bootTime?: string } | undefined;
    const telemetryAny = telemetry as Record<string, unknown>;

    // Extract additional telemetry fields
    const networkInBps = network?.bytesReceivedPerSec as number | undefined;
    const networkOutBps = network?.bytesSentPerSec as number | undefined;
    const processCount = processes?.totalCount as number ?? cpu?.processCount as number | undefined;
    const pendingReboot = telemetryAny.pendingReboot as boolean | undefined;
    // Get uptime from systemUptime object (preferred) or fallback to legacy uptime field
    const uptime = systemUptime?.uptimeSeconds ?? telemetryAny.uptime as number | undefined;

    // Store telemetry data with rawPayload
    await prisma.agentTelemetry.create({
      data: {
        agentId,
        // Summary fields for quick queries (support both old 'usage' and new 'usagePercent' formats)
        cpuUsage: (cpu?.usagePercent ?? cpu?.usage) as number | undefined,
        memoryUsage: (memory?.usagePercent ?? memory?.usage) as number | undefined,
        diskUsage: (disk?.usagePercent ?? disk?.usage) as number | undefined,
        uptime,
        networkInBps: networkInBps ? BigInt(Math.floor(networkInBps)) : undefined,
        networkOutBps: networkOutBps ? BigInt(Math.floor(networkOutBps)) : undefined,
        processCount,
        pendingReboot,
        // Full payload for detailed views - store the complete telemetry from agent
        rawPayload: telemetry as Prisma.InputJsonValue,
        timestamp: new Date(telemetry.collectedAt as string | number | Date),
      },
    });

    // Fire-and-forget alert evaluation
    if (agent.assetId) {
      evaluateAlertsForAsset(agent.assetId, {
        cpuUsage: (cpu?.usagePercent ?? cpu?.usage) as number | undefined,
        memoryUsage: (memory?.usagePercent ?? memory?.usage) as number | undefined,
        diskUsage: (disk?.usagePercent ?? disk?.usage) as number | undefined,
        pendingReboot,
      }).catch(() => {});
    }
  }

  /**
   * Create a command for an agent
   * This is the core method used by deployment executors to queue commands
   */
  async createCommand(
    agentId: string,
    type: string,
    payload?: Record<string, unknown>,
    scheduledAt?: Date
  ): Promise<{ id: string; type: string; status: string }> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const command = await prisma.agentCommand.create({
      data: {
        agentId,
        type,
        payload: (payload || {}) as Prisma.InputJsonValue,
        status: 'PENDING',
        scheduledAt: scheduledAt || new Date(),
      },
    });

    return {
      id: command.id,
      type: command.type,
      status: command.status,
    };
  }

  /**
   * Create multiple commands for multiple agents (batch operation)
   * Returns map of agentId -> commandId for linking to deployment tasks
   */
  async createBatchCommands(
    commands: Array<{
      agentId: string;
      type: string;
      payload?: Record<string, unknown>;
    }>
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // Verify all agents exist
    const agentIds = [...new Set(commands.map(c => c.agentId))];
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true },
    });

    const existingAgentIds = new Set(agents.map(a => a.id));
    const missingAgents = agentIds.filter(id => !existingAgentIds.has(id));

    if (missingAgents.length > 0) {
      throw new NotFoundError(`Agents not found: ${missingAgents.join(', ')}`);
    }

    // Create commands in a transaction
    await withTransaction('createBatchCommands', async (tx) => {
      for (const cmd of commands) {
        const command = await tx.agentCommand.create({
          data: {
            agentId: cmd.agentId,
            type: cmd.type,
            payload: (cmd.payload || {}) as Prisma.InputJsonValue,
            status: 'PENDING',
            scheduledAt: new Date(),
          },
        });
        results.set(cmd.agentId, command.id);
      }
    });

    return results;
  }

  /**
   * Refresh agent token
   */
  async refreshAgentToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify the refresh token
    const { verifyToken } = await import('@shared/utils/jwt');

    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch {
      throw new NotFoundError('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh' || decoded.role !== 'agent') {
      throw new NotFoundError('Invalid token type');
    }

    // Find the agent (userId in token is actually agentId for agents)
    const agent = await prisma.agent.findUnique({
      where: { id: decoded.userId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Generate new tokens
    const tokens = generateTokenPair({
      userId: agent.id,
      email: agent.machineId,
      role: 'agent',
    });

    return tokens;
  }

  /**
   * Create a new agent version
   */
  async createAgentVersion(input: CreateAgentVersionInput): Promise<AgentVersionResponse> {
    // Check for duplicate
    const existing = await prisma.agentVersion.findUnique({
      where: {
        platform_architecture_version: {
          platform: input.platform,
          architecture: input.architecture,
          version: input.version
        }
      },
    });

    if (existing) {
      throw new ConflictError('Version already exists for this platform and architecture');
    }

    // If setting as recommended, clear others for same platform+arch
    if (input.isRecommended) {
      await prisma.agentVersion.updateMany({
        where: {
          platform: input.platform,
          architecture: input.architecture,
          isRecommended: true
        },
        data: { isRecommended: false },
      });
    }

    const version = await prisma.agentVersion.create({
      data: {
        platform: input.platform,
        architecture: input.architecture,
        version: input.version,
        releaseNotes: input.releaseNotes || null,
        isRecommended: input.isRecommended || false,
        lastUpdatedAt: new Date(),
      },
    });

    return this.transformAgentVersion(version);
  }

  /**
   * Update an existing agent version
   */
  async updateAgentVersion(id: string, input: UpdateAgentVersionInput): Promise<AgentVersionResponse> {
    const existing = await prisma.agentVersion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Agent version not found');
    }

    // If setting as recommended, clear others
    if (input.isRecommended) {
      await prisma.agentVersion.updateMany({
        where: {
          platform: existing.platform,
          architecture: existing.architecture,
          isRecommended: true,
          NOT: { id }
        },
        data: { isRecommended: false },
      });
    }

    const updated = await prisma.agentVersion.update({
      where: { id },
      data: {
        ...(input.releaseNotes !== undefined ? { releaseNotes: input.releaseNotes } : {}),
        ...(input.isRecommended !== undefined ? { isRecommended: input.isRecommended } : {}),
        ...(input.isDeprecated !== undefined ? { isDeprecated: input.isDeprecated } : {}),
        lastUpdatedAt: new Date(),
      },
    });

    return this.transformAgentVersion(updated);
  }

  /**
   * Delete an agent version
   */
  async deleteAgentVersion(id: string) {
    const existing = await prisma.agentVersion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Agent version not found');
    }

    // If file exists in MinIO, try to delete it
    if (existing.filePath) {
      try {
        const { minioStorage } = await import('@shared/services/minio.service');
        await minioStorage.initialize();
        await minioStorage.deleteObject(existing.filePath, 'agents');
      } catch (e) {
        logger.warn({ id, filePath: existing.filePath }, 'Failed to delete agent binary from MinIO');
      }
    }

    await prisma.agentVersion.delete({ where: { id } });
    return { message: 'Agent version deleted' };
  }

  /**
   * Get latest agent version for platform/architecture
   */
  async getLatestAgentVersionForPlatform(platform: string, architecture: string): Promise<AgentVersionResponse> {
    // First try recommended
    let version = await prisma.agentVersion.findFirst({
      where: { platform, architecture, isRecommended: true, isDeprecated: false },
    });

    // Fallback to latest non-deprecated by creation date
    if (!version) {
      version = await prisma.agentVersion.findFirst({
        where: { platform, architecture, isDeprecated: false },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!version) {
      throw new NotFoundError('No agent version found');
    }

    return this.transformAgentVersion(version);
  }

  /**
   * List agent versions with filters
   */
  async listAgentVersionsFiltered(params: { platform?: string; deprecated?: string }) {
    const where: Record<string, unknown> = {};
    if (params.platform) where.platform = params.platform;
    if (params.deprecated === 'false') where.isDeprecated = false;
    if (params.deprecated === 'true') where.isDeprecated = true;

    const versions = await prisma.agentVersion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return versions.map(v => this.transformAgentVersion(v));
  }

  /**
   * Increment download count for a version
   */
  async incrementDownloadCount(id: string) {
    await prisma.agentVersion.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
  }

  /**
   * Transform AgentVersion model to response type
   */
  private transformAgentVersion(v: {
    id: string;
    platform: string;
    architecture: string;
    version: string;
    filePath: string | null;
    fileSize: bigint | null;
    checksum: string | null;
    releaseNotes: string | null;
    isRecommended: boolean;
    isDeprecated: boolean;
    downloadCount: number;
    lastUpdatedAt: Date;
    createdAt: Date;
  }): AgentVersionResponse {
    return {
      id: v.id,
      platform: v.platform,
      architecture: v.architecture,
      version: v.version,
      filePath: v.filePath,
      fileSize: v.fileSize ? Number(v.fileSize) : null,
      checksum: v.checksum,
      releaseNotes: v.releaseNotes || null,
      isRecommended: v.isRecommended ?? false,
      isDeprecated: v.isDeprecated ?? false,
      downloadCount: v.downloadCount ?? 0,
      lastUpdatedAt: v.lastUpdatedAt.toISOString(),
      createdAt: v.createdAt.toISOString(),
    };
  }
}

export const agentsService = new AgentsService();
