import crypto from 'crypto';
import archiver from 'archiver';
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@shared/services/logger';
import { minioStorage } from '@shared/services/minio.service';
import { sendSuccess, sendError, typedQuery } from '@shared/utils';
import { env } from '@config/env';
import { AgentsService } from './agents.service';

const logger = createLogger('agents-controller');
import type { ListAgentsQuery, AgentErrorsQuery } from './agents.validators';
import { bulkUpdateSchema, agentErrorsQuerySchema } from './agents.validators';

// Bucket for agent binaries
const AGENTS_BUCKET = 'agents';

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
      const query = typedQuery<ListAgentsQuery>(req);

      const result = await this.agentsService.listAgents({
        status: query.status,
        os: query.os,
        search: query.search,
        page: query.page,
        limit: query.limit,
      });

      sendSuccess(res, result.data);
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
      sendSuccess(res, agent);
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
      sendSuccess(res, agent);
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
      sendSuccess(res, { message: 'Agent deleted successfully' });
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
      sendSuccess(res, commands);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/agents/:id/collect
   * Trigger on-demand data collection
   */
  triggerCollection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { type } = req.body; // 'inventory', 'telemetry', or 'all'

      const result = await this.agentsService.triggerCollection(id, type || 'all');
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agents/:id/telemetry/latest
   * Get latest telemetry for an agent
   */
  getLatestTelemetry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const telemetry = await this.agentsService.getLatestTelemetry(id);
      sendSuccess(res, telemetry);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agents/:id/telemetry/stream
   * Server-Sent Events for real-time telemetry updates
   */
  streamTelemetry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Verify agent exists
      await this.agentsService.getAgentById(id);

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', agentId: id })}\n\n`);

      // Poll for new telemetry every 5 seconds
      let lastTelemetryId: string | null = null;
      const interval = setInterval(async () => {
        try {
          const telemetry = await this.agentsService.getLatestTelemetry(id);
          if (telemetry && telemetry.id !== lastTelemetryId) {
            lastTelemetryId = telemetry.id;
            res.write(`data: ${JSON.stringify({ type: 'telemetry', data: telemetry })}\n\n`);
          }
        } catch {
          // Agent might have been deleted
          clearInterval(interval);
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Agent not found' })}\n\n`);
          res.end();
        }
      }, 5000);

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agents/errors
   * Get failed agent commands for error dashboard
   */
  getErrors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = typedQuery<AgentErrorsQuery>(req);
      const result = await this.agentsService.getAgentErrors(query);
      sendSuccess(res, { data: result.data, total: result.total, page: result.page, limit: result.limit });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agents/:id/logs
   * Get agent logs stored in metadata
   */
  getAgentLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const logs = await this.agentsService.getAgentLogs(id);
      sendSuccess(res, logs);
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
      sendSuccess(res, downloads);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agent-versions
   * Get all agent versions with optional filters
   */
  getAgentVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, deprecated } = req.query;

      // If filters provided, use filtered method
      if (platform || deprecated) {
        const versions = await this.agentsService.listAgentVersionsFiltered({
          platform: platform as string | undefined,
          deprecated: deprecated as string | undefined,
        });
        sendSuccess(res, versions);
      } else {
        const versions = await this.agentsService.getAgentVersions();
        sendSuccess(res, versions);
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agent-versions/latest
   * Get latest agent version for platform/architecture
   */
  getLatest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { platform, architecture } = req.query;

      if (!platform || !architecture) {
        sendError(res, 400, 'BAD_REQUEST', 'platform and architecture query params are required');
        return;
      }

      const version = await this.agentsService.getLatestAgentVersionForPlatform(
        platform as string,
        architecture as string
      );
      sendSuccess(res, version);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/agent-versions
   * Create a new agent version
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const version = await this.agentsService.createAgentVersion(req.body);
      sendSuccess(res, version, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agent-versions/:id
   * Get agent version details
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Fetch version from database
      const version = await this.agentsService.getAgentVersionById(id);

      // Transform to response format
      const response = {
        id: version.id,
        platform: version.platform,
        architecture: version.architecture,
        version: version.version,
        filePath: version.filePath,
        fileSize: version.fileSize ? Number(version.fileSize) : null,
        checksum: version.checksum,
        releaseNotes: version.releaseNotes || null,
        isRecommended: version.isRecommended ?? false,
        isDeprecated: version.isDeprecated ?? false,
        downloadCount: version.downloadCount ?? 0,
        lastUpdatedAt: version.lastUpdatedAt.toISOString(),
        createdAt: version.createdAt.toISOString(),
      };

      sendSuccess(res, response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /v1/agent-versions/:id
   * Update agent version
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const version = await this.agentsService.updateAgentVersion(id, req.body);
      sendSuccess(res, version);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /v1/agent-versions/:id
   * Delete agent version
   */
  deleteVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.agentsService.deleteAgentVersion(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/agent-versions/:id/download
   * Download agent as a ZIP package with pre-configured settings
   */
  downloadAgentVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const version = await this.agentsService.getAgentVersionById(id);

      // Increment download count
      this.agentsService.incrementDownloadCount(id).catch(() => {
        // Swallow errors for download count tracking
      });

      // Check if we have a file path in the database (uploaded to MinIO)
      if (!version.filePath) {
        sendError(res, 404, 'NOT_FOUND', `No binary available for ${version.platform}/${version.architecture} v${version.version}. Please contact administrator.`);
        return;
      }

      // Initialize MinIO
      await minioStorage.initialize();

      // Check if this is an MSI installer - serve directly without ZIP wrapper
      const isMsi = version.filePath.endsWith('.msi');
      if (isMsi) {
        const msiFilename = `patchiq-agent-${version.platform.toLowerCase()}-${version.architecture}-v${version.version}.msi`;
        res.setHeader('Content-Type', 'application/x-msi');
        res.setHeader('Content-Disposition', `attachment; filename="${msiFilename}"`);

        try {
          const msiStream = await minioStorage.downloadStream(version.filePath, AGENTS_BUCKET);
          msiStream.pipe(res);
        } catch (streamError) {
          logger.error({ err: streamError }, 'MinIO stream error for MSI installer');
          if (!res.headersSent) {
            sendError(res, 500, 'STREAM_ERROR', 'Failed to fetch MSI installer');
          }
        }
        return;
      }

      // Determine server URL from request headers so the agent config
      // gets the actual address the user used to reach this server.
      // This ensures agents on remote machines connect to the right host.
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${env.PORT}`;
      const serverUrl = `${protocol}://${host}/api`;

      // Generate filenames
      const isWindows = version.platform === 'Windows';
      const ext = isWindows ? '.exe' : '';
      const agentFilename = `patchiq-agent${ext}`;
      const zipFilename = `patchiq-agent-${version.platform.toLowerCase()}-${version.architecture}-v${version.version}.zip`;

      // Create config file content
      const config = {
        serverUrl,
        webUiPort: 4504,
        enableWebUi: true,
        heartbeatIntervalSeconds: 60,
        inventoryIntervalSeconds: 21600,
        telemetryIntervalSeconds: 60,
        collectHardware: true,
        collectSoftware: true,
        collectNetwork: true,
        collectSecurity: true,
        collectPeripherals: true,
        collectTelemetry: true,
        logLevel: 'info',
      };

      // Create README content
      const readmeContent = isWindows
        ? `PatchIQ Agent v${version.version}
================================

Quick Start:
1. Extract this ZIP file to any folder
2. Double-click "start-agent.bat" to run the agent

The agent will automatically:
- Register with the PatchIQ server
- Collect system inventory and telemetry
- Start a local dashboard at http://localhost:4504

Server: ${serverUrl}

Need help? Contact your administrator.
`
        : `PatchIQ Agent v${version.version}
================================

Quick Start:
1. Extract this archive
2. Run: ./start-agent.sh

The agent will automatically:
- Register with the PatchIQ server
- Collect system inventory and telemetry
- Start a local dashboard at http://localhost:4504

Server: ${serverUrl}

Need help? Contact your administrator.
`;

      // Create start script content - pass config file path
      const startScript = isWindows
        ? `@echo off
echo Starting PatchIQ Agent...
cd /d "%~dp0"
patchiq-agent.exe -config config.json
pause
`
        : `#!/bin/bash
cd "$(dirname "$0")"
chmod +x patchiq-agent 2>/dev/null
echo "Starting PatchIQ Agent..."
./patchiq-agent -config config.json
`;

      // Set response headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 6 } });

      archive.on('error', (err: Error) => {
        logger.error({ err }, 'Archive error');
        if (!res.headersSent) {
          sendError(res, 500, 'ARCHIVE_ERROR', 'Failed to create archive');
        }
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add config file
      archive.append(JSON.stringify(config, null, 2), { name: 'config.json' });

      // Add README
      archive.append(readmeContent, { name: 'README.txt' });

      // Add start script
      const scriptName = isWindows ? 'start-agent.bat' : 'start-agent.sh';
      archive.append(startScript, { name: scriptName, mode: isWindows ? undefined : 0o755 });

      // Add agent binary from MinIO
      try {
        const agentStream = await minioStorage.downloadStream(version.filePath, AGENTS_BUCKET);
        archive.append(agentStream, { name: agentFilename, mode: isWindows ? undefined : 0o755 });
      } catch (streamError) {
        logger.error({ err: streamError }, 'MinIO stream error for agent binary');
        archive.abort();
        if (!res.headersSent) {
          sendError(res, 500, 'STREAM_ERROR', 'Failed to fetch agent binary');
        }
        return;
      }

      // Finalize the archive
      await archive.finalize();
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/agent-versions/:id/upload
   * Upload agent binary for a specific version
   * Expects multipart/form-data with a 'file' field
   */
  triggerAgentUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { versionId } = req.body;

      // Look up the agent to determine platform/architecture
      const agent = await this.agentsService.getAgentById(id);

      // Find the target version by versionId, or find latest for agent's platform
      const targetVersion = versionId
        ? await this.agentsService.getAgentVersionById(versionId)
        : await this.agentsService.getLatestAgentVersion(agent.os || 'Windows');

      if (!targetVersion || !targetVersion.filePath) {
        sendError(res, 404, 'NOT_FOUND', 'No agent binary available for this platform');
        return;
      }

      // Build a backend-proxied download URL so the agent doesn't need
      // to deal with MinIO presigned URL signature issues through nginx
      const baseUrl = env.BACKEND_PUBLIC_URL || `http://localhost:${env.PORT}`;
      const downloadUrl = `${baseUrl}/api/agent/update/binary/${targetVersion.id}`;

      const result = await this.agentsService.triggerAgentUpdate(id, {
        downloadUrl,
        checksum: targetVersion.checksum || '',
        version: targetVersion.version,
      });

      sendSuccess(res, {
        message: `Agent update to v${targetVersion.version} queued`,
        ...result,
        targetVersion: targetVersion.version,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/agents/bulk-update
   * Trigger update for all connected agents
   */
  bulkUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = bulkUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', parsed.error.message);
        return;
      }
      const { versionId } = parsed.data;
      const result = await this.agentsService.bulkUpdateAgents(versionId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  uploadAgentBinary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const version = await this.agentsService.getAgentVersionById(id);

      // Read the raw body as buffer
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const buffer = Buffer.concat(chunks);

      if (buffer.length === 0) {
        sendError(res, 400, 'BAD_REQUEST', 'No file data received');
        return;
      }

      // Generate object key path
      const isWindows = version.platform === 'Windows';
      const ext = isWindows ? '.exe' : '';
      const platformDir = version.platform.toLowerCase();
      const objectKey = `${platformDir}/${version.architecture}/${version.version}/patchiq-agent${ext}`;

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      // Initialize and upload to MinIO
      await minioStorage.initialize();

      // Ensure agents bucket exists
      await minioStorage.ensureBucket(AGENTS_BUCKET);

      await minioStorage.uploadBuffer(objectKey, buffer, {
        bucket: AGENTS_BUCKET,
        contentType: 'application/octet-stream',
        metadata: {
          'x-platform': version.platform,
          'x-architecture': version.architecture,
          'x-version': version.version,
          'x-checksum-sha256': checksum,
        },
      });

      // Update database record
      await this.agentsService.updateAgentVersionFile(id, objectKey, buffer.length, checksum);

      sendSuccess(res, {
        message: `Agent binary uploaded for ${version.platform}/${version.architecture} v${version.version}`,
        objectKey,
        size: buffer.length,
        checksum,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const agentsController = new AgentsController();
