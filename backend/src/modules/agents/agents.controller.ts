import { Request, Response, NextFunction } from 'express';
import { AgentsService } from './agents.service';
import type { ListAgentsQuery } from './agents.validators';

export class AgentsController {
  private agentsService: AgentsService;

  constructor() {
    this.agentsService = new AgentsService();
  }

  /**
   * GET /v1/agents
   * List all agents with filtering
   */
  listAgents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ListAgentsQuery;

      const result = await this.agentsService.listAgents({
        status: query.status,
        os: query.os,
        search: query.search,
        page: query.page,
        limit: query.limit,
      });

      // Return array directly to match MSW handler behavior
      res.json(result.data);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agents/:id
   * Get agent details by ID
   */
  getAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const agent = await this.agentsService.getAgentById(id);
      res.json(agent);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /v1/agents/:id
   * Update an agent
   */
  updateAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, tags } = req.body;
      const agent = await this.agentsService.updateAgent(id, { name, tags });
      res.json(agent);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /v1/agents/:id
   * Delete an agent
   */
  deleteAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.agentsService.deleteAgent(id);
      res.json({ success: true, message: 'Agent deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agents/:id/commands
   * Get agent command history
   */
  getAgentCommands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const commands = await this.agentsService.getAgentCommands(id);
      res.json(commands);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agents/downloads
   * Get available agent downloads
   */
  getAgentDownloads = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const downloads = await this.agentsService.getAgentDownloads();
      res.json(downloads);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agent-versions
   * Get all agent versions
   */
  getAgentVersions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versions = await this.agentsService.getAgentVersions();
      res.json(versions);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agent-versions/:id/download
   * Download agent binary
   */
  downloadAgentVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const version = await this.agentsService.getAgentVersionById(id);

      // For now, return a mock binary response
      // In production, this would serve the actual file
      const binaryContent = Buffer.alloc(1024);
      for (let i = 0; i < binaryContent.length; i++) {
        binaryContent[i] = Math.floor(Math.random() * 256);
      }

      const filename = `agent-${version.platform.toLowerCase()}-${version.architecture}-v${version.version}`;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(binaryContent);
    } catch (error) {
      next(error);
    }
  };
}

export const agentsController = new AgentsController();
