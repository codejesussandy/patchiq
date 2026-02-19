import { prisma } from '@/db/client';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { generateTokenPair } from '@shared/utils/jwt';
import { withTransaction } from '@shared/utils/transaction';
import { notificationsService } from '@/modules/notifications/notifications.service';
import { settingsService } from '@modules/settings/settings.service';
import { evaluateAlertsForAsset } from '@/modules/alerts/alert-evaluation.service';
import type {
  AgentConfig,
  HeartbeatResponse,
  RegisterAgentResponse,
} from './agents.types';
import type {
  RegisterAgentInput,
  HeartbeatInput,
} from './agents.validators';

const logger = createLogger('agents-registration');

export class AgentsRegistrationService {
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
    const [agent, asset] = await withTransaction('registerAgent', async (tx) => {
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

    // Update agent status
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: newStatus,
        lastHeartbeat: new Date(),
        ipAddress: input.ipAddress || agent.ipAddress,
        ...(agentVersion ? { agentVersion } : {}),
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

    // Evaluate alerts from heartbeat metrics
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
   * Refresh agent token
   */
  async refreshAgentToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
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

    const agent = await prisma.agent.findUnique({
      where: { id: decoded.userId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const tokens = generateTokenPair({
      userId: agent.id,
      email: agent.machineId,
      role: 'agent',
    });

    return tokens;
  }

  /**
   * Get default agent config
   */
  async getDefaultConfig(): Promise<AgentConfig> {
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
}

export const agentsRegistrationService = new AgentsRegistrationService();
