import { Request, Response, NextFunction } from 'express';
import archiver from 'archiver';
import crypto from 'crypto';
import { AgentsService } from './agents.service';
import { minioStorage } from '@shared/services/minio.service';
import { env } from '@config/env';
import type { ListAgentsQuery } from './agents.validators';

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
   * POST /v1/agents/:id/collect
   * Trigger on-demand data collection
   */
  triggerCollection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { type } = req.body; // 'inventory', 'telemetry', or 'all'

      const result = await this.agentsService.triggerCollection(id, type || 'all');
      res.json(result);
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
      res.json(telemetry);
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
   * Download agent as a ZIP package with pre-configured settings
   */
  downloadAgentVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const version = await this.agentsService.getAgentVersionById(id);

      // Check if we have a file path in the database (uploaded to MinIO)
      if (!version.filePath) {
        res.status(404).json({
          error: 'Agent binary not found',
          message: `No binary available for ${version.platform}/${version.architecture} v${version.version}. Please contact administrator.`,
        });
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
          console.error('MinIO stream error:', streamError);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to fetch MSI installer' });
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
        webUiPort: 8080,
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
- Start a local dashboard at http://localhost:8080

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
- Start a local dashboard at http://localhost:8080

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
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to create archive' });
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
        console.error('MinIO stream error:', streamError);
        archive.abort();
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to fetch agent binary' });
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
        res.status(400).json({ error: 'No file data received' });
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
      const minioClient = (minioStorage as any).client;
      if (minioClient) {
        const exists = await minioClient.bucketExists(AGENTS_BUCKET);
        if (!exists) {
          await minioClient.makeBucket(AGENTS_BUCKET, 'us-east-1');
        }
      }

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

      res.json({
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
