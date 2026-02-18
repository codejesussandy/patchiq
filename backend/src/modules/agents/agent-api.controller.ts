import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { minioStorage } from '@shared/services/minio.service';
import { sendSuccess, sendError } from '@shared/utils/response';
import { AgentsService } from './agents.service';

const logger = createLogger('agent-api');

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
      sendSuccess(res, result, statusCode);
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
        logger.info({ agentId }, 'Agent has pending commands');
      }
      sendSuccess(res, response);
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
      sendSuccess(res, commands);
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
      sendSuccess(res, null);
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
      sendSuccess(res, config);
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
      sendSuccess(res, null);
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
      sendSuccess(res, null);
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
        sendError(res, 404, 'NOT_FOUND', 'Agent binary not found');
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
   * POST /api/agent/logs
   * Receive and store agent logs
   */
  receiveAgentLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.headers['x-agent-id'] as string;

      if (!agentId) {
        throw new BadRequestError('X-Agent-Id header is required');
      }

      const { logs, agentVersion, os, architecture, hostname, timestamp } = req.body;

      await this.agentsService.storeAgentLogs(agentId, {
        content: logs,
        agentVersion,
        os,
        architecture,
        hostname,
        uploadedAt: timestamp || new Date().toISOString(),
      });

      logger.info({ agentId }, 'Agent logs received');
      sendSuccess(res, { message: 'Logs received' });
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const agentApiController = new AgentApiController();
