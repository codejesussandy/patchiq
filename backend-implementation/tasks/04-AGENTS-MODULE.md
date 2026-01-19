# Task 04: Agents Module

## Overview
Implement agent management including registration, heartbeat, commands, and agent downloads.

**Priority:** P0 - Core Feature
**Dependencies:** Tasks 01, 02, 03
**Estimated Complexity:** Medium-High
**Parallel:** Yes (with Tasks 05-07)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| API Spec | `backend-debt/agents-api.yaml` | OpenAPI specification |
| Implementation Guide | `backend-debt/AGENTS-IMPLEMENTATION.md` | TDD scenarios, data models |
| Registration Protocol | `../agent-dev/contracts/protocols/agent-registration.md` | Agent registration flow |
| Heartbeat Protocol | `../agent-dev/contracts/protocols/agent-heartbeat.md` | Heartbeat handling |
| Frontend Service | `frontend/src/services/agent.service.ts` | API calls |
| MSW Handlers | `frontend/src/mocks/handlers/agent.handlers.ts` | Expected responses |

---

## Endpoints to Implement

```
# Frontend-facing APIs (v1)
GET    /v1/agents                    - List all agents
GET    /v1/agents/:id                - Get agent details
DELETE /v1/agents/:id                - Delete agent
GET    /v1/agents/:id/commands       - Get agent command history
GET    /v1/agents/downloads          - List available agent downloads
GET    /v1/agent-versions            - List all agent versions
GET    /v1/agent-versions/:id/download - Download agent binary

# Agent-facing APIs (internal)
POST   /api/agent/register           - Agent registration
POST   /api/agent/heartbeat          - Agent heartbeat
GET    /api/agent/commands           - Get pending commands
POST   /api/agent/commands/:id/result - Report command result
GET    /api/agent/config             - Get agent configuration
POST   /api/agent/inventory          - Submit inventory data
POST   /api/agent/telemetry          - Submit telemetry data
POST   /api/agent/token/refresh      - Refresh agent token
```

---

## Module Structure

```
src/modules/agents/
├── agents.controller.ts        # Frontend API handlers
├── agents.service.ts           # Business logic
├── agents.routes.ts            # Route definitions
├── agents.validators.ts        # Zod schemas
├── agents.types.ts             # TypeScript types
├── agent-api.controller.ts     # Agent-facing API handlers
├── agent-api.routes.ts         # Agent routes (/api/agent/*)
└── __tests__/
    ├── agents.controller.test.ts
    ├── agents.service.test.ts
    └── agents.integration.test.ts
```

---

## Implementation

### Route Definitions

**src/modules/agents/agents.routes.ts:**
```typescript
import { Router } from 'express';
import { AgentsController } from './agents.controller';
import { authenticate } from '@middleware/auth';
import { validate } from '@middleware/validation';
import { z } from 'zod';

const router = Router();
const controller = new AgentsController();

// Query schema for list endpoint
const listAgentsQuery = z.object({
  status: z.enum(['Connected', 'Disconnected', 'Pending', 'Error']).optional(),
  os: z.enum(['Windows', 'MacOS', 'Linux']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});

// All routes require authentication
router.use(authenticate);

router.get(
  '/',
  validate({ query: listAgentsQuery }),
  controller.listAgents
);

router.get('/downloads', controller.getAgentDownloads);

router.get('/:id', controller.getAgent);

router.delete('/:id', controller.deleteAgent);

router.get('/:id/commands', controller.getAgentCommands);

export const agentsRoutes = router;
```

**src/modules/agents/agent-api.routes.ts:**
```typescript
import { Router } from 'express';
import { AgentApiController } from './agent-api.controller';
import { validate } from '@middleware/validation';
import {
  registerAgentSchema,
  heartbeatSchema,
  commandResultSchema,
  inventorySchema,
  telemetrySchema,
} from './agents.validators';

const router = Router();
const controller = new AgentApiController();

// Registration (no auth required - uses enrollment secret)
router.post(
  '/register',
  validate({ body: registerAgentSchema }),
  controller.register
);

// These routes require agent token
router.post(
  '/heartbeat',
  validate({ body: heartbeatSchema }),
  controller.heartbeat
);

router.get('/commands', controller.getCommands);

router.post(
  '/commands/:id/result',
  validate({ body: commandResultSchema }),
  controller.reportCommandResult
);

router.get('/config', controller.getConfig);

router.post(
  '/inventory',
  validate({ body: inventorySchema }),
  controller.submitInventory
);

router.post(
  '/telemetry',
  validate({ body: telemetrySchema }),
  controller.submitTelemetry
);

router.post('/token/refresh', controller.refreshToken);

export const agentApiRoutes = router;
```

### Validators

**src/modules/agents/agents.validators.ts:**
```typescript
import { z } from 'zod';

export const registerAgentSchema = z.object({
  machineId: z.string().min(1),
  hostname: z.string().min(1),
  os: z.enum(['Windows', 'MacOS', 'Linux']),
  osVersion: z.string(),
  osBuild: z.string().optional(),
  architecture: z.string(),
  agentVersion: z.string(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  macAddress: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
});

export const heartbeatSchema = z.object({
  timestamp: z.string().datetime(),
  status: z.enum(['healthy', 'degraded', 'error']),
  uptime: z.number(),
  agentUptime: z.number(),
  cpuUsage: z.number().min(0).max(100),
  memoryUsage: z.number().min(0).max(100),
  diskUsage: z.number().min(0).max(100),
  pendingReboot: z.boolean(),
  ipAddress: z.string().optional(),
  lastError: z.string().nullable().optional(),
});

export const commandResultSchema = z.object({
  status: z.enum(['completed', 'failed']),
  result: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const inventorySchema = z.object({
  collectedAt: z.string().datetime(),
  hardware: z.object({}).passthrough().optional(),
  software: z.object({}).passthrough().optional(),
  network: z.object({}).passthrough().optional(),
  security: z.object({}).passthrough().optional(),
  peripherals: z.object({}).passthrough().optional(),
});

export const telemetrySchema = z.object({
  collectedAt: z.string().datetime(),
  cpu: z.object({}).passthrough().optional(),
  memory: z.object({}).passthrough().optional(),
  disk: z.object({}).passthrough().optional(),
  network: z.object({}).passthrough().optional(),
});

// Type exports
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type CommandResultInput = z.infer<typeof commandResultSchema>;
```

### Frontend Controller

**src/modules/agents/agents.controller.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AgentsService } from './agents.service';
import { getRelativeTime } from '@shared/utils/date';

export class AgentsController {
  private agentsService = new AgentsService();

  listAgents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, os, search, page, limit } = req.query as any;

      const result = await this.agentsService.listAgents({
        status,
        os,
        search,
        page,
        limit,
      });

      // Add relative time to each agent
      const agents = result.data.map((agent) => ({
        ...agent,
        lastHeartbeatRelative: agent.lastHeartbeat
          ? getRelativeTime(agent.lastHeartbeat)
          : null,
      }));

      res.json(agents);
    } catch (error) {
      next(error);
    }
  };

  getAgent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const agent = await this.agentsService.getAgentById(id);

      res.json({
        ...agent,
        lastHeartbeatRelative: agent.lastHeartbeat
          ? getRelativeTime(agent.lastHeartbeat)
          : null,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteAgent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.agentsService.deleteAgent(id);

      res.json({
        success: true,
        message: 'Agent deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getAgentCommands = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const commands = await this.agentsService.getAgentCommands(id);

      res.json(commands);
    } catch (error) {
      next(error);
    }
  };

  getAgentDownloads = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const downloads = await this.agentsService.getAgentDownloads();
      res.json(downloads);
    } catch (error) {
      next(error);
    }
  };
}
```

### Agent API Controller

**src/modules/agents/agent-api.controller.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AgentsService } from './agents.service';
import type { RegisterAgentInput, HeartbeatInput, CommandResultInput } from './agents.validators';

export class AgentApiController {
  private agentsService = new AgentsService();

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: RegisterAgentInput = req.body;
      const agentVersion = req.headers['x-agent-version'] as string;

      const result = await this.agentsService.registerAgent({
        ...input,
        agentVersion: agentVersion || input.agentVersion,
      });

      // Check if re-registration
      const isReRegister = result.isReRegistration;
      res.status(isReRegister ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  };

  heartbeat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = req.headers['x-agent-id'] as string;
      const input: HeartbeatInput = req.body;

      const result = await this.agentsService.processHeartbeat(agentId, input);

      res.json({
        acknowledged: true,
        serverTime: new Date().toISOString(),
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  getCommands = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = req.headers['x-agent-id'] as string;
      const commands = await this.agentsService.getPendingCommands(agentId);

      res.json(commands);
    } catch (error) {
      next(error);
    }
  };

  reportCommandResult = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input: CommandResultInput = req.body;

      await this.agentsService.updateCommandResult(id, input);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = req.headers['x-agent-id'] as string;
      const config = await this.agentsService.getAgentConfig(agentId);

      res.json(config);
    } catch (error) {
      next(error);
    }
  };

  submitInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = req.headers['x-agent-id'] as string;
      const inventory = req.body;

      await this.agentsService.processInventory(agentId, inventory);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  submitTelemetry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = req.headers['x-agent-id'] as string;
      const telemetry = req.body;

      await this.agentsService.processTelemetry(agentId, telemetry);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.headers.authorization?.replace('Bearer ', '');
      const result = await this.agentsService.refreshAgentToken(refreshToken!);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
```

### Service

**src/modules/agents/agents.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { NotFoundError, BadRequestError } from '@shared/errors/httpErrors';
import { generateTokenPair } from '@shared/utils/jwt';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import type { RegisterAgentInput, HeartbeatInput, CommandResultInput } from './agents.validators';

export class AgentsService {
  /**
   * Register a new agent or re-register existing one
   */
  async registerAgent(input: RegisterAgentInput) {
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
        config: await this.getDefaultConfig(),
        isReRegistration: true,
        message: 'Agent re-registered successfully',
      };
    }

    // Create new agent and asset
    const [agent, asset] = await prisma.$transaction(async (tx) => {
      // Create asset first
      const asset = await tx.asset.create({
        data: {
          name: input.hostname,
          status: 'In Use',
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
  async processHeartbeat(agentId: string, input: HeartbeatInput) {
    // Update agent status
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: input.status === 'error' ? 'Error' : 'Connected',
        lastHeartbeat: new Date(),
        ipAddress: input.ipAddress,
      },
    });

    // Check for pending actions
    const pendingCommands = await prisma.agentCommand.count({
      where: { agentId, status: 'pending' },
    });

    return {
      commandsPending: pendingCommands > 0,
      configUpdated: false, // TODO: implement config versioning
      inventoryRequested: false, // TODO: implement on-demand inventory
    };
  }

  /**
   * List agents with filtering
   */
  async listAgents(params: {
    status?: string;
    os?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};

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
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          tags: true,
          groups: { include: { group: true } },
        },
        ...getPaginationParams(params),
      }),
      prisma.agent.count({ where }),
    ]);

    // Transform to match frontend expectations
    const transformedAgents = agents.map((agent) => ({
      id: agent.id,
      machineId: agent.machineId,
      name: agent.name,
      status: agent.status,
      os: agent.os,
      osVersion: agent.osVersion,
      agentVersion: agent.agentVersion,
      lastHeartbeat: agent.lastHeartbeat?.toISOString(),
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
      capabilities: agent.capabilities,
    }));

    return paginate(transformedAgents, total, params);
  }

  /**
   * Get agent by ID
   */
  async getAgentById(id: string) {
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
      lastHeartbeat: agent.lastHeartbeat?.toISOString(),
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
      capabilities: agent.capabilities,
    };
  }

  /**
   * Delete agent
   */
  async deleteAgent(id: string) {
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
  async getAgentCommands(agentId: string) {
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
      executedAt: cmd.executedAt?.toISOString(),
      result: cmd.result,
    }));
  }

  /**
   * Get pending commands for agent
   */
  async getPendingCommands(agentId: string) {
    const commands = await prisma.agentCommand.findMany({
      where: { agentId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });

    return commands.map((cmd) => ({
      id: cmd.id,
      type: cmd.type,
      createdAt: cmd.createdAt.toISOString(),
    }));
  }

  /**
   * Update command result
   */
  async updateCommandResult(commandId: string, input: CommandResultInput) {
    await prisma.agentCommand.update({
      where: { id: commandId },
      data: {
        status: input.status,
        result: input.result || input.errorMessage,
        executedAt: new Date(),
      },
    });
  }

  /**
   * Get agent downloads
   */
  async getAgentDownloads() {
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
   * Get default agent config
   */
  private async getDefaultConfig() {
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
  async getAgentConfig(agentId: string) {
    // TODO: Implement agent-specific configuration
    return this.getDefaultConfig();
  }

  /**
   * Process inventory submission from agent
   */
  async processInventory(agentId: string, inventory: any) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { asset: true },
    });

    if (!agent || !agent.assetId) {
      throw new NotFoundError('Agent or linked asset not found');
    }

    // Update asset with inventory data
    // This is a simplified version - full implementation would
    // parse and store all hardware/software/security data
    await prisma.asset.update({
      where: { id: agent.assetId },
      data: {
        lastSeen: new Date(),
      },
    });

    // TODO: Store detailed inventory in related tables
    // - AssetHardware, AssetSoftware, AssetSecurity, etc.
  }

  /**
   * Process telemetry submission from agent
   */
  async processTelemetry(agentId: string, telemetry: any) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || !agent.assetId) {
      throw new NotFoundError('Agent or linked asset not found');
    }

    // Store telemetry data
    await prisma.assetTelemetry.create({
      data: {
        assetId: agent.assetId,
        cpuUsage: telemetry.cpu?.usage,
        memoryUsage: telemetry.memory?.usage,
        diskUsage: telemetry.disk?.usage,
        collectedAt: new Date(telemetry.collectedAt),
      },
    });
  }

  /**
   * Refresh agent token
   */
  async refreshAgentToken(refreshToken: string) {
    // Similar to user token refresh
    // Verify token, check validity, generate new pair
    // This is a simplified version
    throw new Error('Not implemented');
  }
}
```

---

## TDD Test Scenarios

### Integration Tests

```typescript
// src/modules/agents/__tests__/agents.integration.test.ts
import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/db/client';

const app = createApp();

describe('Agents Integration Tests', () => {
  let authToken: string;
  let testAgentId: string;

  beforeAll(async () => {
    // Login to get auth token
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });
    authToken = loginRes.body.accessToken;

    // Create test agent
    const agent = await prisma.agent.create({
      data: {
        machineId: 'TEST-MACHINE-001',
        name: 'Test Agent',
        os: 'Windows',
        osVersion: '11 Pro',
        status: 'Connected',
        hostname: 'test-host',
      },
    });
    testAgentId = agent.id;
  });

  afterAll(async () => {
    await prisma.agent.deleteMany({ where: { machineId: 'TEST-MACHINE-001' } });
    await prisma.$disconnect();
  });

  describe('GET /v1/agents', () => {
    it('should return list of agents', async () => {
      const response = await request(app)
        .get('/v1/agents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/v1/agents?status=Connected')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.forEach((agent: any) => {
        expect(agent.status).toBe('Connected');
      });
    });

    it('should return 401 without auth', async () => {
      const response = await request(app).get('/v1/agents');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v1/agents/:id', () => {
    it('should return agent by ID', async () => {
      const response = await request(app)
        .get(`/v1/agents/${testAgentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testAgentId);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/v1/agents/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /v1/agents/:id', () => {
    it('should delete agent', async () => {
      const agent = await prisma.agent.create({
        data: {
          machineId: 'DELETE-TEST-001',
          name: 'Delete Test',
          os: 'MacOS',
          status: 'Disconnected',
        },
      });

      const response = await request(app)
        .delete(`/v1/agents/${agent.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deleted
      const deleted = await prisma.agent.findUnique({
        where: { id: agent.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('POST /api/agent/register', () => {
    it('should register new agent', async () => {
      const response = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '1.0.0')
        .send({
          machineId: 'NEW-AGENT-001',
          hostname: 'new-host',
          os: 'MacOS',
          osVersion: '14.5',
          architecture: 'arm64',
          agentVersion: '1.0.0',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('agentId');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('config');

      // Cleanup
      await prisma.agent.delete({
        where: { machineId: 'NEW-AGENT-001' },
      });
    });

    it('should re-register existing agent', async () => {
      const response = await request(app)
        .post('/api/agent/register')
        .send({
          machineId: 'TEST-MACHINE-001',
          hostname: 'updated-host',
          os: 'Windows',
          osVersion: '11 Pro',
          architecture: 'x64',
          agentVersion: '2.0.0',
        });

      expect(response.status).toBe(200);
      expect(response.body.isReRegistration).toBe(true);
    });
  });

  describe('POST /api/agent/heartbeat', () => {
    it('should process heartbeat', async () => {
      const response = await request(app)
        .post('/api/agent/heartbeat')
        .set('X-Agent-Id', testAgentId)
        .send({
          timestamp: new Date().toISOString(),
          status: 'healthy',
          uptime: 86400,
          agentUptime: 3600,
          cpuUsage: 15.5,
          memoryUsage: 45.2,
          diskUsage: 60.0,
          pendingReboot: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.acknowledged).toBe(true);
    });
  });
});
```

---

## Verification Checklist

- [ ] GET /v1/agents returns list with pagination
- [ ] GET /v1/agents filters by status, os, search
- [ ] GET /v1/agents/:id returns full agent details
- [ ] GET /v1/agents/:id returns 404 for non-existent
- [ ] DELETE /v1/agents/:id removes agent
- [ ] GET /v1/agents/:id/commands returns command history
- [ ] GET /v1/agents/downloads returns download list
- [ ] POST /api/agent/register creates agent and asset
- [ ] POST /api/agent/register handles re-registration
- [ ] POST /api/agent/heartbeat updates status
- [ ] Heartbeat returns pending command count
- [ ] lastHeartbeatRelative is calculated correctly
- [ ] Agent-asset linking works correctly

---

## Next Task
After completing this task, proceed to:
- **Task 05: Assets Module**
- **Task 06: Patches Module**
