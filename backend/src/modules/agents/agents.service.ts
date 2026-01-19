import { prisma } from '@/db/client';
import { NotFoundError } from '@shared/errors';
import { generateTokenPair } from '@shared/utils/jwt';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { getRelativeTime } from '@shared/utils/date';
import type {
  RegisterAgentInput,
  HeartbeatInput,
  CommandResultInput,
  InventoryInput,
  TelemetryInput,
} from './agents.validators';
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

export class AgentsService {
  /**
   * Register a new agent or re-register existing one
   */
  async registerAgent(input: RegisterAgentInput): Promise<RegisterAgentResponse> {
    // Check if agent already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { machineId: input.machineId },
    });

    if (existingAgent) {
      // Re-registration - update agent info
      const agent = await prisma.agent.update({
        where: { id: existingAgent.id },
        data: {
          hostname: input.hostname,
          os: input.os,
          osVersion: input.osVersion,
          architecture: input.architecture,
          agentVersion: input.agentVersion,
          ipAddress: input.ipAddress,
          serialNumber: input.serialNumber,
          status: 'Connected',
          lastHeartbeat: new Date(),
        },
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
        message: 'Agent re-registered successfully',
      };
    }

    // Create new agent and asset in a transaction
    const [agent, asset] = await prisma.$transaction(async (tx) => {
      // Create asset first
      const asset = await tx.asset.create({
        data: {
          name: input.hostname,
          status: 'In Use',
          os: input.os,
          osVersion: input.osVersion,
          manufacturer: input.manufacturer,
          model: input.model,
          serialNumber: input.serialNumber,
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
          serialNumber: input.serialNumber,
          assetId: asset.id,
          status: 'Connected',
          lastHeartbeat: new Date(),
          capabilities: ['scan', 'deploy', 'reboot', 'update'],
        },
      });

      return [agent, asset];
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: agent.id,
      email: agent.machineId,
      role: 'agent',
    });

    return {
      agentId: agent.id,
      assetId: asset.id,
      ...tokens,
      tokenExpiresIn: 3600,
      config: await this.getDefaultConfig(),
      isReRegistration: false,
    };
  }

  /**
   * Process agent heartbeat
   */
  async processHeartbeat(agentId: string, input: HeartbeatInput): Promise<Omit<HeartbeatResponse, 'acknowledged' | 'serverTime'>> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Update agent status
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: input.status === 'error' ? 'Error' : 'Connected',
        lastHeartbeat: new Date(),
        ipAddress: input.ipAddress || agent.ipAddress,
      },
    });

    // Store telemetry data if we have an assetId
    if (agent.assetId) {
      await prisma.agentTelemetry.create({
        data: {
          agentId,
          cpuUsage: input.cpuUsage,
          memoryUsage: input.memoryUsage,
          diskUsage: input.diskUsage,
          uptime: input.uptime,
        },
      });
    }

    // Check for pending actions
    const pendingCommands = await prisma.agentCommand.count({
      where: { agentId, status: 'pending' },
    });

    return {
      commandsPending: pendingCommands > 0,
      configUpdated: false,
      inventoryRequested: false,
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

    const [agents, total] = await Promise.all([
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
    ]);

    // Transform to match frontend expectations
    const transformedAgents: AgentResponse[] = agents.map((agent) => ({
      id: agent.id,
      machineId: agent.machineId,
      name: agent.name,
      status: agent.status,
      os: agent.os,
      osVersion: agent.osVersion,
      agentVersion: agent.agentVersion,
      lastHeartbeat: agent.lastHeartbeat?.toISOString() ?? null,
      lastHeartbeatRelative: agent.lastHeartbeat
        ? getRelativeTime(agent.lastHeartbeat)
        : null,
      registeredAt: agent.registeredAt.toISOString(),
      ipAddress: agent.ipAddress,
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

    return {
      id: agent.id,
      machineId: agent.machineId,
      name: agent.name,
      status: agent.status,
      os: agent.os,
      osVersion: agent.osVersion,
      agentVersion: agent.agentVersion,
      lastHeartbeat: agent.lastHeartbeat?.toISOString() ?? null,
      lastHeartbeatRelative: agent.lastHeartbeat
        ? getRelativeTime(agent.lastHeartbeat)
        : null,
      registeredAt: agent.registeredAt.toISOString(),
      ipAddress: agent.ipAddress,
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
      where: { agentId },
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
   * Get pending commands for agent
   */
  async getPendingCommands(agentId: string): Promise<PendingCommand[]> {
    const commands = await prisma.agentCommand.findMany({
      where: { agentId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });

    return commands.map((cmd) => ({
      id: cmd.id,
      type: cmd.type,
      payload: cmd.payload,
      createdAt: cmd.createdAt.toISOString(),
    }));
  }

  /**
   * Update command result
   */
  async updateCommandResult(commandId: string, input: CommandResultInput): Promise<void> {
    const command = await prisma.agentCommand.findUnique({
      where: { id: commandId },
    });

    if (!command) {
      throw new NotFoundError('Command not found');
    }

    await prisma.agentCommand.update({
      where: { id: commandId },
      data: {
        status: input.status,
        result: input.result || input.errorMessage,
        executedAt: new Date(),
        completedAt: new Date(),
      },
    });
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

    return versions.map((v) => ({
      id: v.id,
      platform: v.platform,
      architecture: v.architecture,
      version: v.version,
      lastUpdatedAt: v.lastUpdatedAt.toISOString(),
    }));
  }

  /**
   * Get agent version by ID
   */
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
   * Get default agent config
   */
  private async getDefaultConfig(): Promise<AgentConfig> {
    return {
      heartbeatIntervalSeconds: 60,
      inventoryScheduleCron: '0 */6 * * *',
      telemetryIntervalSeconds: 60,
      telemetryEnabled: true,
      patchScanScheduleCron: '0 2 * * *',
      logLevel: 'info',
    };
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

    if (!agent || !agent.assetId) {
      throw new NotFoundError('Agent or linked asset not found');
    }

    // Update asset with inventory data
    await prisma.asset.update({
      where: { id: agent.assetId },
      data: {
        updatedAt: new Date(),
      },
    });

    // Store hardware data if provided
    if (inventory.hardware) {
      const hw = inventory.hardware as Record<string, unknown>;
      await prisma.assetHardware.upsert({
        where: { assetId: agent.assetId },
        create: {
          assetId: agent.assetId,
          cpu: hw.cpu as string | undefined,
          cpuCores: hw.cpuCores as number | undefined,
          ramTotal: hw.ramTotal as bigint | undefined,
          diskTotal: hw.diskTotal as bigint | undefined,
          diskFree: hw.diskFree as bigint | undefined,
          gpuModel: hw.gpuModel as string | undefined,
          biosVersion: hw.biosVersion as string | undefined,
        },
        update: {
          cpu: hw.cpu as string | undefined,
          cpuCores: hw.cpuCores as number | undefined,
          ramTotal: hw.ramTotal as bigint | undefined,
          diskTotal: hw.diskTotal as bigint | undefined,
          diskFree: hw.diskFree as bigint | undefined,
          gpuModel: hw.gpuModel as string | undefined,
          biosVersion: hw.biosVersion as string | undefined,
        },
      });
    }

    // Store security data if provided
    if (inventory.security) {
      const sec = inventory.security as Record<string, unknown>;
      await prisma.assetSecurity.upsert({
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
  }

  /**
   * Process telemetry submission from agent
   */
  async processTelemetry(agentId: string, telemetry: TelemetryInput): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const cpu = telemetry.cpu as Record<string, unknown> | undefined;
    const memory = telemetry.memory as Record<string, unknown> | undefined;
    const disk = telemetry.disk as Record<string, unknown> | undefined;

    // Store telemetry data
    await prisma.agentTelemetry.create({
      data: {
        agentId,
        cpuUsage: cpu?.usage as number | undefined,
        memoryUsage: memory?.usage as number | undefined,
        diskUsage: disk?.usage as number | undefined,
        timestamp: new Date(telemetry.collectedAt),
      },
    });
  }

  /**
   * Refresh agent token
   */
  async refreshAgentToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // TODO: Implement proper token refresh with validation
    // For now, this is a placeholder
    throw new NotFoundError('Token refresh not implemented');
  }
}

export const agentsService = new AgentsService();
