import { prisma } from '@/db/client';
import { Prisma } from '@prisma/client';
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
          macAddress: input.macAddress,
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

    // Update basic fields
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: {
        name: data.name || agent.name,
      },
      include: {
        tags: true,
        groups: { include: { group: true } },
      },
    });

    // Handle tags update if provided
    if (data.tags !== undefined) {
      // Remove existing tag associations
      await prisma.agentTagRelation.deleteMany({
        where: { agentId: id },
      });

      // Add new tag associations
      if (data.tags.length > 0) {
        const tagRecords = await prisma.tag.findMany({
          where: { id: { in: data.tags } },
        });

        await prisma.agentTagRelation.createMany({
          data: tagRecords.map((tag) => ({
            agentId: id,
            tag: tag.name,
          })),
        });
      }
    }

    // Fetch updated agent with tags
    const finalAgent = await prisma.agent.findUnique({
      where: { id },
      include: {
        tags: true,
        groups: { include: { group: true } },
      },
    });

    return {
      id: finalAgent!.id,
      machineId: finalAgent!.machineId,
      name: finalAgent!.name,
      status: finalAgent!.status,
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

    // Extract hardware data from agent's nested structure
    const hw = inventory.hardware as Record<string, unknown> | undefined;
    const systemIdentity = hw?.systemIdentity as Record<string, unknown> | undefined;
    const processor = hw?.processor as Record<string, unknown> | undefined;
    const memory = hw?.memory as Record<string, unknown> | undefined;
    const bios = hw?.bios as Record<string, unknown> | undefined;
    const graphicsAdapters = hw?.graphicsAdapters as Array<Record<string, unknown>> | undefined;
    const storageDrives = hw?.storageDrives as Array<Record<string, unknown>> | undefined;
    const battery = hw?.battery as Record<string, unknown> | undefined;

    // Extract software data
    const sw = inventory.software as Record<string, unknown> | undefined;
    const operatingSystem = sw?.operatingSystem as Record<string, unknown> | undefined;

    // Extract network data for hostname and MAC address
    const net = inventory.network as Record<string, unknown> | undefined;
    const networkIdentity = net?.identity as Record<string, unknown> | undefined;
    const networkAdapters = net?.adapters as Array<Record<string, unknown>> | undefined;

    // Update asset with inventory data (manufacturer, model, serial from hardware)
    const assetUpdateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (systemIdentity) {
      if (systemIdentity.manufacturer) assetUpdateData.manufacturer = systemIdentity.manufacturer;
      if (systemIdentity.model) assetUpdateData.model = systemIdentity.model;
      if (systemIdentity.serialNumber) assetUpdateData.serialNumber = systemIdentity.serialNumber;
    }

    // Update OS info from software.operatingSystem if provided
    if (operatingSystem) {
      if (operatingSystem.name) assetUpdateData.os = operatingSystem.name;
      if (operatingSystem.version) assetUpdateData.osVersion = operatingSystem.version;
    }

    // Extract MAC address from network adapters (prefer default/first physical adapter)
    let macAddressFromNetwork: string | undefined;
    if (networkAdapters && Array.isArray(networkAdapters)) {
      // Find default adapter first, then fall back to first physical adapter
      const defaultAdapter = networkAdapters.find(a => a.isDefault === true);
      const physicalAdapter = networkAdapters.find(a =>
        a.type === 'Ethernet' || a.type === 'WiFi'
      );
      const adapterWithMac = defaultAdapter || physicalAdapter || networkAdapters[0];
      if (adapterWithMac?.macAddress) {
        macAddressFromNetwork = adapterWithMac.macAddress as string;
      }
    }

    // Update asset with MAC address if found
    if (macAddressFromNetwork) {
      assetUpdateData.macAddress = macAddressFromNetwork;
    }

    // Update asset with hostname from network identity
    if (networkIdentity?.hostname) {
      assetUpdateData.name = networkIdentity.hostname as string;
    }

    await prisma.asset.update({
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
      await prisma.agent.update({
        where: { id: agentId },
        data: agentUpdateData,
      });
    }

    // Store hardware data if provided - map from agent's nested structure
    if (hw) {
      // Calculate RAM in bytes from GB
      const ramTotalGB = memory?.totalPhysicalGB as number | undefined;
      const ramTotalBytes = ramTotalGB ? BigInt(Math.floor(ramTotalGB * 1024 * 1024 * 1024)) : undefined;

      // Calculate disk totals from storage drives
      // Agent sends: capacityGB, freeSpaceGB (not sizeGB, freeGB)
      let diskTotalBytes: bigint | undefined;
      let diskFreeBytes: bigint | undefined;
      let diskType: string | undefined;
      if (storageDrives && Array.isArray(storageDrives)) {
        let totalSize = 0;
        let totalFree = 0;
        for (const drive of storageDrives) {
          // Support both field naming conventions
          const capacity = (drive.capacityGB ?? drive.sizeGB) as number | undefined;
          const freeSpace = (drive.freeSpaceGB ?? drive.freeGB) as number | undefined;
          if (capacity) totalSize += capacity;
          if (freeSpace) totalFree += freeSpace;
          if (!diskType && drive.type) diskType = drive.type as string;
        }
        if (totalSize > 0) diskTotalBytes = BigInt(Math.floor(totalSize * 1024 * 1024 * 1024));
        if (totalFree > 0) diskFreeBytes = BigInt(Math.floor(totalFree * 1024 * 1024 * 1024));
      }

      // Get GPU model and memory from first graphics adapter
      const gpuModel = graphicsAdapters?.[0]?.name as string | undefined;
      const gpuMemoryMB = graphicsAdapters?.[0]?.memoryMB as number | undefined;

      // Get BIOS info
      const biosVendor = bios?.vendor as string | undefined;
      const biosVersion = bios?.version as string | undefined;

      // Get System SKU from system identity (fallback to assetTag if sku not available)
      const systemSKU = (systemIdentity?.sku ?? systemIdentity?.assetTag) as string | undefined;

      // Extract additional hardware summary fields for querying
      const cpuManufacturer = processor?.manufacturer as string | undefined;
      const cpuThreads = processor?.threadCount as number | undefined;
      const cpuSpeedMHz = processor?.clockSpeedMHz as number | undefined;
      const ramSlots = memory?.usedSlots as number | undefined;
      const ramType = memory?.type as string | undefined;
      const manufacturer = systemIdentity?.manufacturer as string | undefined;
      const model = systemIdentity?.model as string | undefined;
      const serialNumber = systemIdentity?.serialNumber as string | undefined;

      await prisma.assetHardware.upsert({
        where: { assetId: agent.assetId },
        create: {
          assetId: agent.assetId,
          // CPU summary fields
          cpu: processor?.name as string | undefined,
          cpuCores: processor?.coreCount as number | undefined,
          cpuManufacturer,
          cpuThreads,
          cpuSpeedMHz,
          // RAM summary fields
          ramTotal: ramTotalBytes,
          ramSlots,
          ramType,
          // Disk summary fields
          diskTotal: diskTotalBytes,
          diskFree: diskFreeBytes,
          diskType,
          // GPU summary fields
          gpuModel,
          gpuMemoryMB,
          // BIOS summary fields
          biosVendor,
          biosVersion,
          // System summary fields
          systemSKU,
          manufacturer,
          model,
          serialNumber,
          // Full payload for detailed views
          rawPayload: hw as Prisma.InputJsonValue,
          collectedAt: new Date(),
        },
        update: {
          // CPU summary fields
          cpu: processor?.name as string | undefined,
          cpuCores: processor?.coreCount as number | undefined,
          cpuManufacturer,
          cpuThreads,
          cpuSpeedMHz,
          // RAM summary fields
          ramTotal: ramTotalBytes,
          ramSlots,
          ramType,
          // Disk summary fields
          diskTotal: diskTotalBytes,
          diskFree: diskFreeBytes,
          diskType,
          // GPU summary fields
          gpuModel,
          gpuMemoryMB,
          // BIOS summary fields
          biosVendor,
          biosVersion,
          // System summary fields
          systemSKU,
          manufacturer,
          model,
          serialNumber,
          // Full payload for detailed views
          rawPayload: hw as Prisma.InputJsonValue,
          collectedAt: new Date(),
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

    // Store software data if provided
    if (inventory.software) {
      // First, delete existing software entries for this asset
      await prisma.assetSoftware.deleteMany({
        where: { assetId: agent.assetId },
      });

      // Extract applications from software object
      const softwareData = inventory.software as Record<string, unknown>;
      const applications = (softwareData.applications as Array<Record<string, unknown>>) || [];
      const services = (softwareData.services as Array<Record<string, unknown>>) || [];

      // Insert new software entries
      if (applications.length > 0) {
        await prisma.assetSoftware.createMany({
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

      // Store full software inventory in AssetSoftwareInventory
      await prisma.assetSoftwareInventory.upsert({
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
    const network = telemetry.network as Record<string, unknown> | undefined;
    const telemetryAny = telemetry as Record<string, unknown>;
    const system = telemetryAny.system as Record<string, unknown> | undefined;

    // Extract additional telemetry fields
    const networkInBps = network?.bytesReceivedPerSec as number | undefined;
    const networkOutBps = network?.bytesSentPerSec as number | undefined;
    const processCount = cpu?.processCount as number | undefined;
    const pendingReboot = system?.pendingReboot as boolean | undefined;
    const uptime = (system?.uptime ?? telemetryAny.uptime) as number | undefined;

    // Store telemetry data with rawPayload
    await prisma.agentTelemetry.create({
      data: {
        agentId,
        // Summary fields for quick queries
        cpuUsage: cpu?.usage as number | undefined,
        memoryUsage: memory?.usage as number | undefined,
        diskUsage: disk?.usage as number | undefined,
        uptime,
        networkInBps: networkInBps ? BigInt(Math.floor(networkInBps)) : undefined,
        networkOutBps: networkOutBps ? BigInt(Math.floor(networkOutBps)) : undefined,
        processCount,
        pendingReboot,
        // Full payload for detailed views
        rawPayload: telemetryAny as Prisma.InputJsonValue,
        timestamp: new Date(telemetry.collectedAt),
      },
    });
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
}

export const agentsService = new AgentsService();
