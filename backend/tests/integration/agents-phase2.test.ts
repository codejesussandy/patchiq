import request from 'supertest';
import { getTestApp, generateTestTokensAsync, authenticatedRequest, randomString } from '../utils/testHelpers';
import { generateTokenPair } from '@shared/utils/jwt';
import { prisma } from '@db/client';

describe('Agents Phase 2 - Smoke & Functional Tests', () => {
  const app = getTestApp();
  let auth: ReturnType<typeof authenticatedRequest>;
  let testAgentId: string;
  let testAgentMachineId: string;
  let agentAccessToken: string; // JWT for agent-facing endpoints

  beforeAll(async () => {
    const tokens = await generateTestTokensAsync('test-admin-id', 'admin');
    auth = authenticatedRequest(app, tokens.accessToken);

    // Create a test agent
    testAgentMachineId = `PHASE2-TEST-${randomString(8)}`;
    const agent = await prisma.agent.create({
      data: {
        machineId: testAgentMachineId,
        name: 'Phase2 Test Agent',
        os: 'Linux',
        osVersion: 'Ubuntu 22.04',
        architecture: 'x64',
        status: 'CONNECTED',
        hostname: 'phase2-test-host',
        ipAddress: '10.0.0.42',
        agentVersion: '2.1.0',
        capabilities: ['scan', 'deploy'],
      },
    });
    testAgentId = agent.id;

    // Generate agent JWT (agent tokens use userId=agentId)
    const agentTokens = generateTokenPair({
      userId: testAgentId,
      email: 'agent@patchiq.io',
      role: 'agent',
    });
    agentAccessToken = agentTokens.accessToken;

    // Create some FAILED commands for error dashboard testing
    await prisma.agentCommand.createMany({
      data: [
        {
          agentId: testAgentId,
          type: 'patch_install',
          status: 'FAILED',
          errorMessage: 'Package dependency conflict: libssl-dev',
          executedAt: new Date(),
        },
        {
          agentId: testAgentId,
          type: 'inventory_full',
          status: 'FAILED',
          errorMessage: 'Permission denied: /etc/hardware.conf',
          executedAt: new Date(),
        },
        {
          agentId: testAgentId,
          type: 'agent_update',
          status: 'COMPLETED',
          result: 'Updated to 2.2.0',
          executedAt: new Date(),
        },
      ],
    });

    // Create agent versions for bulk update testing
    await prisma.agentVersion.createMany({
      data: [
        {
          platform: 'Linux',
          architecture: 'x64',
          version: '2.2.0',
          lastUpdatedAt: new Date(),
        },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.agentCommand.deleteMany({ where: { agentId: testAgentId } });
    await prisma.agent.deleteMany({ where: { machineId: { startsWith: 'PHASE2-TEST-' } } });
    await prisma.agent.deleteMany({ where: { machineId: { startsWith: 'REG-TEST-' } } });
    await prisma.agentVersion.deleteMany({ where: { version: '2.2.0', platform: 'Linux' } });
    await prisma.$disconnect();
  });

  /** Helper for agent-authenticated requests */
  function agentRequest() {
    return {
      get: (url: string) =>
        request(app).get(url)
          .set('Authorization', `Bearer ${agentAccessToken}`)
          .set('X-Agent-Id', testAgentId),
      post: (url: string) =>
        request(app).post(url)
          .set('Authorization', `Bearer ${agentAccessToken}`)
          .set('X-Agent-Id', testAgentId),
    };
  }

  // =========================================================================
  // Existing Admin Endpoints - Smoke Tests
  // =========================================================================

  describe('GET /v1/agents (smoke)', () => {
    it('should return 200 with agents data', async () => {
      const res = await auth.get('/v1/agents');
      expect(res.status).toBe(200);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/v1/agents');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /v1/agents/:id (smoke)', () => {
    it('should return agent details', async () => {
      const res = await auth.get(`/v1/agents/${testAgentId}`);
      expect(res.status).toBe(200);
      const agent = res.body.data || res.body;
      expect(agent.id).toBe(testAgentId);
      expect(agent.name).toBe('Phase2 Test Agent');
    });

    it('should return 404 for non-existent agent', async () => {
      const res = await auth.get('/v1/agents/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/agents/:id/commands (smoke)', () => {
    it('should return commands for the agent', async () => {
      const res = await auth.get(`/v1/agents/${testAgentId}/commands`);
      expect(res.status).toBe(200);
      const commands = Array.isArray(res.body) ? res.body : (res.body.data || []);
      expect(commands.length).toBeGreaterThanOrEqual(3);
    });
  });

  // =========================================================================
  // Agent API Endpoints - Functional Tests (require agent JWT)
  // =========================================================================

  describe('POST /api/agent/register', () => {
    let registeredAgentId: string;

    afterAll(async () => {
      if (registeredAgentId) {
        await prisma.agentCommand.deleteMany({ where: { agentId: registeredAgentId } });
        await prisma.agent.deleteMany({ where: { id: registeredAgentId } });
      }
    });

    it('should register a new agent and return tokens + config', async () => {
      const machineId = `REG-TEST-${randomString(8)}`;
      const res = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '2.1.0')
        .send({
          machineId,
          hostname: 'reg-test-host',
          os: 'LINUX',
          osVersion: 'Ubuntu 22.04',
          architecture: 'x64',
          agentVersion: '2.1.0',
        });

      expect(res.status).toBe(201);
      const body = res.body.data || res.body;
      expect(body).toHaveProperty('agentId');
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('config');
      expect(body.isReRegistration).toBe(false);
      registeredAgentId = body.agentId;
    });

    it('should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/agent/register')
        .send({ hostname: 'test' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/agent/heartbeat', () => {
    it('should accept heartbeat and return ack', async () => {
      const res = await agentRequest()
        .post('/api/agent/heartbeat')
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

      expect(res.status).toBe(200);
      const hb = res.body.data || res.body;
      expect(hb.acknowledged).toBe(true);
      expect(hb).toHaveProperty('serverTime');
      expect(hb).toHaveProperty('commandsPending');
    });

    it('should reject heartbeat without auth', async () => {
      const res = await request(app)
        .post('/api/agent/heartbeat')
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

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/agent/config', () => {
    it('should return agent configuration', async () => {
      const res = await agentRequest().get('/api/agent/config');

      expect(res.status).toBe(200);
      const cfg = res.body.data || res.body;
      expect(cfg).toHaveProperty('heartbeatIntervalSeconds');
    });
  });

  describe('POST /api/agent/telemetry', () => {
    it('should accept telemetry data', async () => {
      const res = await agentRequest()
        .post('/api/agent/telemetry')
        .send({
          collectedAt: new Date().toISOString(),
          cpu: { usage: 25.5 },
          memory: { usage: 60.0 },
          disk: { usage: 45.0 },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // Phase 2 New Endpoints
  // =========================================================================

  describe('GET /v1/agents/errors (Phase 2)', () => {
    it('should return error list with failed commands', async () => {
      const res = await auth.get('/v1/agents/errors');
      expect(res.status).toBe(200);
      // Response is enveloped: { success, data: { data: [...], total, page, limit } }
      const inner = res.body.data || res.body;
      expect(inner).toHaveProperty('data');
      expect(inner).toHaveProperty('total');
      expect(Array.isArray(inner.data)).toBe(true);
      expect(inner.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter errors by agentId', async () => {
      const res = await auth.get(`/v1/agents/errors?agentId=${testAgentId}`);
      expect(res.status).toBe(200);
      const inner = res.body.data || res.body;
      expect(inner.data.length).toBeGreaterThanOrEqual(2);
      for (const err of inner.data) {
        expect(err.agentId).toBe(testAgentId);
      }
    });

    it('should filter errors by commandType', async () => {
      const res = await auth.get('/v1/agents/errors?commandType=patch_install');
      expect(res.status).toBe(200);
      const inner = res.body.data || res.body;
      expect(inner.data.length).toBeGreaterThanOrEqual(1);
      for (const err of inner.data) {
        expect(err.type).toBe('patch_install');
      }
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/v1/agents/errors');
      expect(res.status).toBe(401);
    });

    it('should support pagination params', async () => {
      const res = await auth.get('/v1/agents/errors?page=1&limit=1');
      expect(res.status).toBe(200);
      const inner = res.body.data || res.body;
      expect(inner.data.length).toBeLessThanOrEqual(1);
      expect(inner).toHaveProperty('page');
      expect(inner).toHaveProperty('limit');
    });
  });

  describe('POST /v1/agents/bulk-update (Phase 2)', () => {
    it('should trigger bulk update for connected agents', async () => {
      const res = await auth.post('/v1/agents/bulk-update').send({});
      expect(res.status).toBe(200);
      const body = res.body.data || res.body;
      expect(body).toHaveProperty('agentsQueued');
      expect(typeof body.agentsQueued).toBe('number');
    });

    it('should accept optional versionId', async () => {
      const res = await auth.post('/v1/agents/bulk-update').send({
        versionId: '00000000-0000-0000-0000-000000000000',
      });
      expect([200, 400, 404]).toContain(res.status);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/v1/agents/bulk-update').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('Agent Logs - Full Round-Trip (Phase 2)', () => {
    const sampleLogs = '2026-02-18 10:00:00 INFO Agent started v2.1.0\n2026-02-18 10:00:01 WARN High CPU usage detected\n2026-02-18 10:00:02 ERROR Failed to connect to update server';

    it('should return null/empty logs before any upload', async () => {
      const res = await auth.get(`/v1/agents/${testAgentId}/logs`);
      expect(res.status).toBe(200);
      const logs = res.body.data !== undefined ? res.body.data : res.body;
      // No logs uploaded yet — should be null or empty
      expect([null, undefined, '']).toContain(logs);
    });

    it('should accept log upload from agent with full metadata', async () => {
      const res = await agentRequest()
        .post('/api/agent/logs')
        .send({
          logs: sampleLogs,
          agentVersion: '2.1.0',
          os: 'Linux',
          architecture: 'x64',
          hostname: 'phase2-test-host',
          timestamp: new Date().toISOString(),
        });

      expect([200, 201]).toContain(res.status);
    });

    it('should return uploaded logs via admin endpoint', async () => {
      const res = await auth.get(`/v1/agents/${testAgentId}/logs`);
      expect(res.status).toBe(200);
      const logs = res.body.data !== undefined ? res.body.data : res.body;
      // Should contain the log content we uploaded
      expect(logs).not.toBeNull();
      expect(logs.content).toContain('Agent started v2.1.0');
      expect(logs.content).toContain('ERROR Failed to connect');
      expect(logs.agentVersion).toBe('2.1.0');
      expect(logs.os).toBe('Linux');
      expect(logs.hostname).toBe('phase2-test-host');
    });

    it('should overwrite logs on subsequent upload', async () => {
      const newLogs = '2026-02-18 11:00:00 INFO Agent restarted\n2026-02-18 11:00:01 INFO All systems nominal';
      await agentRequest()
        .post('/api/agent/logs')
        .send({
          logs: newLogs,
          agentVersion: '2.2.0',
          os: 'Linux',
        });

      const res = await auth.get(`/v1/agents/${testAgentId}/logs`);
      expect(res.status).toBe(200);
      const logs = res.body.data !== undefined ? res.body.data : res.body;
      expect(logs.content).toContain('Agent restarted');
      expect(logs.content).not.toContain('Failed to connect'); // old logs replaced
      expect(logs.agentVersion).toBe('2.2.0');
    });

    it('should return 401 for admin endpoint without auth', async () => {
      const res = await request(app).get(`/v1/agents/${testAgentId}/logs`);
      expect(res.status).toBe(401);
    });

    it('should return 401 for agent endpoint without auth', async () => {
      const res = await request(app)
        .post('/api/agent/logs')
        .send({ logs: 'test' });
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // DELETE endpoint (verify still works)
  // =========================================================================

  describe('DELETE /v1/agents/:id (smoke)', () => {
    it('should delete an agent', async () => {
      const deleteAgent = await prisma.agent.create({
        data: {
          machineId: `PHASE2-DEL-${randomString(8)}`,
          name: 'Delete Me',
          os: 'Linux',
          status: 'DISCONNECTED',
        },
      });

      const res = await auth.delete(`/v1/agents/${deleteAgent.id}`);
      expect(res.status).toBe(200);

      const deleted = await prisma.agent.findUnique({ where: { id: deleteAgent.id } });
      expect(deleted).toBeNull();
    });
  });
});
