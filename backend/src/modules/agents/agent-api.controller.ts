import { Request, Response, NextFunction } from 'express';
import { AgentsService } from './agents.service';
import { BadRequestError } from '@shared/errors';
import { minioStorage } from '@shared/services/minio.service';

const AGENTS_BUCKET = 'agents';
import type {
  RegisterAgentInput,
  HeartbeatInput,
  CommandResultInput,
  InventoryInput,
  TelemetryInput,
} from './agents.validators';

export class AgentApiController {
  private agentsService: AgentsService;

  constructor() {
    this.agentsService = new AgentsService();
  }

  /**
   * POST /api/agent/register
   * Register a new agent
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: RegisterAgentInput = req.body;
      const agentVersion = req.headers['x-agent-version'] as string;

      const result = await this.agentsService.registerAgent({
        ...input,
        agentVersion: agentVersion || input.agentVersion,
      });

      // Return 200 for re-registration, 201 for new registration
      const statusCode = result.isReRegistration ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/agent/heartbeat
   * Process agent heartbeat
   */
  heartbeat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.headers['x-agent-id'] as string;

      if (!agentId) {
        throw new BadRequestError('X-Agent-Id header is required');
      }

      const input: HeartbeatInput = req.body;
      const agentVersion = req.headers['x-agent-version'] as string | undefined;
      const result = await this.agentsService.processHeartbeat(agentId, input, agentVersion);

      const response = {
        acknowledged: true,
        serverTime: new Date().toISOString(),
        ...result,
      };
      if (result.commandsPending) {
        console.log(`[HEARTBEAT] Agent ${agentId} has pending commands`);
      }
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/agent/commands
   * Get pending commands for agent
   */
  getCommands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.headers['x-agent-id'] as string;

      if (!agentId) {
        throw new BadRequestError('X-Agent-Id header is required');
      }

      const commands = await this.agentsService.getPendingCommands(agentId);
      res.json(commands);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/agent/commands/:id/result
   * Report command execution result
   */
  reportCommandResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const input: CommandResultInput = req.body;

      await this.agentsService.updateCommandResult(id, input);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/agent/config
   * Get agent configuration
   */
  getConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.headers['x-agent-id'] as string;

      if (!agentId) {
        throw new BadRequestError('X-Agent-Id header is required');
      }

      const config = await this.agentsService.getAgentConfig(agentId);
      res.json(config);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/agent/inventory
   * Submit inventory data
   */
  submitInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.headers['x-agent-id'] as string;

      if (!agentId) {
        throw new BadRequestError('X-Agent-Id header is required');
      }

      const inventory: InventoryInput = req.body;
      await this.agentsService.processInventory(agentId, inventory);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/agent/telemetry
   * Submit telemetry data
   */
  submitTelemetry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.headers['x-agent-id'] as string;

      if (!agentId) {
        throw new BadRequestError('X-Agent-Id header is required');
      }

      const telemetry: TelemetryInput = req.body;
      await this.agentsService.processTelemetry(agentId, telemetry);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/agent/update/binary/:versionId
   * Stream agent binary from MinIO — used by agent self-update
   */
  downloadUpdateBinary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { versionId } = req.params;
      const version = await this.agentsService.getAgentVersionById(versionId);

      if (!version.filePath) {
        res.status(404).json({ error: 'Agent binary not found' });
        return;
      }

      await minioStorage.initialize();
      const isExe = version.filePath.endsWith('.exe');
      const filename = `patchiq-agent${isExe ? '.exe' : ''}`;

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const stream = await minioStorage.downloadStream(version.filePath, AGENTS_BUCKET);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/agent/token/refresh
   * Refresh agent token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.headers.authorization?.replace('Bearer ', '');

      if (!refreshToken) {
        throw new BadRequestError('Authorization header is required');
      }

      const result = await this.agentsService.refreshAgentToken(refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const agentApiController = new AgentApiController();
