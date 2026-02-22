import { prisma } from '@/db/client';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '@shared/errors';
import { withTransaction } from '@shared/utils/transaction';
import type {
  CommandResponse,
  PendingCommand,
} from './agents.types';
import type { CommandResultInput } from './agents.validators';

export class AgentsCommandsService {
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
   */
  async getAgentErrors(filters: {
    agentId?: string;
    commandType?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
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

    const includeHeartbeatErrors = !filters.commandType || filters.commandType === 'heartbeat_error';
    const errorAgents = includeHeartbeatErrors
      ? await prisma.agent.findMany({
          where: heartbeatWhere,
          select: { id: true, hostname: true, os: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        })
      : [];

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

    // Store both result message and output in the result JSON field
    const resultData = input.output
      ? { message: input.result, output: input.output }
      : input.result;

    await prisma.agentCommand.update({
      where: { id: commandId },
      data: {
        status: input.status,
        result: resultData as Prisma.InputJsonValue | undefined,
        errorMessage: input.errorMessage || undefined,
        executedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Sync result to deployment tasks
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
   */
  async queueInventoryRefresh(agentId: string): Promise<{ id: string; status: string }> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

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
   */
  async triggerCollection(agentId: string, type: string = 'all'): Promise<{ commandId: string; status: string; type: string }> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    let commandType = 'inventory_full';
    if (type === 'hardware') commandType = 'inventory_hardware';
    else if (type === 'software') commandType = 'inventory_software';
    else if (type === 'security') commandType = 'inventory_security';
    else if (type === 'telemetry') commandType = 'telemetry_collect';

    const command = await prisma.agentCommand.create({
      data: {
        agentId,
        type: commandType,
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });

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
    // Import here to access version lookup and batch commands
    const { agentsCrudService } = await import('./agents-crud.service');

    const { env } = await import('@config/env');
    const baseUrl = env.BACKEND_PUBLIC_URL || `http://localhost:${env.PORT}`;

    const agents = await prisma.agent.findMany({
      where: { status: 'CONNECTED' },
      select: { id: true, os: true, architecture: true },
    });

    if (agents.length === 0) {
      return { agentsQueued: 0 };
    }

    const groups = new Map<string, { os: string; architecture: string; agentIds: string[] }>();
    for (const agent of agents) {
      const key = `${agent.os}|${agent.architecture}`;
      if (!groups.has(key)) {
        groups.set(key, { os: agent.os || '', architecture: agent.architecture || '', agentIds: [] });
      }
      groups.get(key)!.agentIds.push(agent.id);
    }

    const commands: Array<{ agentId: string; type: string; payload?: Record<string, unknown> }> = [];
    const warnings: string[] = [];

    for (const group of groups.values()) {
      const platform = (group.os || '').toLowerCase();
      const arch = group.architecture || 'unknown';

      let targetVersion;
      if (versionId) {
        try {
          targetVersion = await agentsCrudService.getAgentVersionById(versionId);
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
   * Store agent log snapshot
   */
  async storeAgentLogs(agentId: string, logData: Record<string, unknown>): Promise<void> {
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
   * Create a command for an agent
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
   */
  async createBatchCommands(
    commands: Array<{
      agentId: string;
      type: string;
      payload?: Record<string, unknown>;
    }>
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

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
}

export const agentsCommandsService = new AgentsCommandsService();
