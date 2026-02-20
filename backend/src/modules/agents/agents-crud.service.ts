import { prisma } from '@/db/client';
import { NotFoundError, ConflictError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { calculateAgentStatus } from '@shared/utils/agent-status';
import { getRelativeTime } from '@shared/utils/date';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { withTransaction } from '@shared/utils/transaction';
import { getTypedServerSettings } from '@modules/settings/server-settings';
import type {
  AgentResponse,
  AgentDownloadResponse,
  AgentVersionResponse,
  AgentConfig,
  ListAgentsParams,
} from './agents.types';
import type {
  CreateAgentVersionInput,
  UpdateAgentVersionInput,
} from './agents.validators';

const logger = createLogger('agents-crud');

export class AgentsCrudService {
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

    const offlineThresholdSeconds = serverSettings.endpointOnlineStatusTimeoutHours * 3600;

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
      await tx.agent.update({
        where: { id },
        data: {
          name: data.name || agent.name,
        },
      });

      if (data.tags !== undefined) {
        await tx.agentTagRelation.deleteMany({
          where: { agentId: id },
        });

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

      return tx.agent.findUnique({
        where: { id },
        include: {
          tags: true,
          groups: { include: { group: true } },
        },
      });
    });

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
   * Get agent configuration
   */
  async getAgentConfig(agentId: string): Promise<AgentConfig> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Delegate to registration service for config logic
    const { agentsRegistrationService } = await import('./agents-registration.service');
    return agentsRegistrationService.getDefaultConfig();
  }

  /**
   * Get agent downloads - dynamically built from the latest AgentVersion per platform
   */
  async getAgentDownloads(): Promise<AgentDownloadResponse[]> {
    // Get the latest version per platform (prefer amd64 for broadest compatibility)
    const versions = await prisma.agentVersion.findMany({
      where: { isDeprecated: false, filePath: { not: null } },
      orderBy: [{ version: 'desc' }, { lastUpdatedAt: 'desc' }],
    });

    const platformMap: Record<string, { label: string; archPriority: string[] }> = {
      Windows: { label: 'Windows 11', archPriority: ['amd64', 'arm64'] },
      Linux: { label: 'Linux', archPriority: ['amd64', 'arm64'] },
      Mac: { label: 'MacOS', archPriority: ['arm64', 'amd64'] },
    };

    const downloads: AgentDownloadResponse[] = [];

    for (const [platform, config] of Object.entries(platformMap)) {
      const platformVersions = versions.filter((v) => v.platform === platform);
      // Pick the best architecture for this platform
      let best = null;
      for (const arch of config.archPriority) {
        best = platformVersions.find((v) => v.architecture === arch) || null;
        if (best) break;
      }
      if (!best) best = platformVersions[0] || null;

      if (best) {
        downloads.push({
          os: config.label,
          version: best.version,
          releaseDate: best.lastUpdatedAt.toLocaleDateString('en-GB'),
          downloadUrl: `/v1/agent-versions/${best.id}/download`,
        });
      }
    }

    return downloads;
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
   * Get latest agent version for platform
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
   * Create a new agent version
   */
  async createAgentVersion(input: CreateAgentVersionInput): Promise<AgentVersionResponse> {
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
    let version = await prisma.agentVersion.findFirst({
      where: { platform, architecture, isRecommended: true, isDeprecated: false },
    });

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
  transformAgentVersion(v: {
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

export const agentsCrudService = new AgentsCrudService();
