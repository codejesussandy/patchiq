// @ts-nocheck
/**
 * Integration tests for /api/agent/* endpoints (agent-to-server communication)
 */
import { getAgent, prisma } from './test-setup';

const MACHINE_ID = 'INTTEST-API-MACHINE-001';

describe('Agent API - /api/agent', () => {
  let agent;
  let agentId;
  let agentToken;

  beforeAll(async () => {
    agent = getAgent();
    // Clean up any leftover test agent from previous runs
    await prisma.agent.deleteMany({ where: { machineId: MACHINE_ID } });
  });

  afterAll(async () => {
    await prisma.agent.deleteMany({ where: { machineId: MACHINE_ID } });
  });

  describe('POST /api/agent/register - agent registration', () => {
    it('registers a new agent and returns token', async () => {
      const res = await agent
        .post('/api/agent/register')
        .send({
          machineId: MACHINE_ID,
          hostname: 'INTTEST-API-HOST',
          os: 'LINUX',
          osVersion: '22.04',
          architecture: 'amd64',
          agentVersion: '1.0.0',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('agentId');
      expect(res.body.data.isReRegistration).toBe(false);

      agentId = res.body.data.agentId;
      agentToken = res.body.data.accessToken;
    });

    it('re-registers an existing agent and returns 200', async () => {
      const res = await agent
        .post('/api/agent/register')
        .send({
          machineId: MACHINE_ID,
          hostname: 'INTTEST-API-HOST',
          os: 'LINUX',
          osVersion: '22.04',
          architecture: 'amd64',
          agentVersion: '1.0.0',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isReRegistration).toBe(true);
      expect(res.body.data.agentId).toBe(agentId);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await agent
        .post('/api/agent/register')
        .send({ machineId: 'INTTEST-INCOMPLETE' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid OS enum', async () => {
      const res = await agent
        .post('/api/agent/register')
        .send({
          machineId: 'INTTEST-BADOS-001',
          hostname: 'bad-host',
          os: 'FREEBSD',
          osVersion: '14.0',
          architecture: 'amd64',
          agentVersion: '1.0.0',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/agent/heartbeat - agent heartbeat', () => {
    it('returns 401 without agent token', async () => {
      const res = await agent
        .post('/api/agent/heartbeat')
        .set('X-Agent-Id', agentId)
        .send({
          timestamp: new Date().toISOString(),
          status: 'healthy',
          uptime: 3600,
          agentUptime: 1800,
          cpuUsage: 15.5,
          memoryUsage: 45.2,
          diskUsage: 60.0,
          pendingReboot: false,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when X-Agent-Id mismatches token', async () => {
      const res = await agent
        .post('/api/agent/heartbeat')
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', '00000000-0000-0000-0000-000000000000')
        .send({
          timestamp: new Date().toISOString(),
          status: 'healthy',
          uptime: 3600,
          agentUptime: 1800,
          cpuUsage: 15.5,
          memoryUsage: 45.2,
          diskUsage: 60.0,
          pendingReboot: false,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('processes heartbeat successfully', async () => {
      const res = await agent
        .post('/api/agent/heartbeat')
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId)
        .send({
          timestamp: new Date().toISOString(),
          status: 'healthy',
          uptime: 3600,
          agentUptime: 1800,
          cpuUsage: 15.5,
          memoryUsage: 45.2,
          diskUsage: 60.0,
          pendingReboot: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.acknowledged).toBe(true);
      expect(res.body.data).toHaveProperty('serverTime');
    });

    it('returns 400 for invalid heartbeat body', async () => {
      const res = await agent
        .post('/api/agent/heartbeat')
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId)
        .send({ status: 'unknown' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/agent/commands - get pending commands', () => {
    it('returns 401 without agent token', async () => {
      const res = await agent
        .get('/api/agent/commands')
        .set('X-Agent-Id', agentId);

      expect(res.status).toBe(401);
    });

    it('returns pending commands list', async () => {
      const res = await agent
        .get('/api/agent/commands')
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/agent/config - get agent config', () => {
    it('returns 401 without agent token', async () => {
      const res = await agent
        .get('/api/agent/config')
        .set('X-Agent-Id', agentId);

      expect(res.status).toBe(401);
    });

    it('returns agent configuration', async () => {
      const res = await agent
        .get('/api/agent/config')
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /api/agent/inventory - submit inventory', () => {
    it('returns 401 without agent token', async () => {
      const res = await agent
        .post('/api/agent/inventory')
        .set('X-Agent-Id', agentId)
        .send({ collectedAt: new Date().toISOString() });

      expect(res.status).toBe(401);
    });

    it('accepts inventory submission successfully', async () => {
      const res = await agent
        .post('/api/agent/inventory')
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId)
        .send({
          collectedAt: new Date().toISOString(),
          hardware: { cpu: 'Intel i7', cores: 8, ram: 16384 },
          software: { installedApps: [] },
          network: { interfaces: [] },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 for missing collectedAt', async () => {
      const res = await agent
        .post('/api/agent/inventory')
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId)
        .send({ hardware: {} });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/agent/telemetry - submit telemetry', () => {
    it('returns 401 without agent token', async () => {
      const res = await agent
        .post('/api/agent/telemetry')
        .set('X-Agent-Id', agentId)
        .send({ collectedAt: new Date().toISOString() });

      expect(res.status).toBe(401);
    });

    it('accepts telemetry submission successfully', async () => {
      const res = await agent
        .post('/api/agent/telemetry')
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId)
        .send({
          collectedAt: new Date().toISOString(),
          cpu: { usage: 12.5, cores: 8 },
          memory: { used: 4096, total: 16384 },
          disk: { used: 100000, total: 500000 },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/agent/commands/:id/result - report command result', () => {
    let commandId;

    beforeAll(async () => {
      // Create a pending command for our test agent via prisma
      const command = await prisma.agentCommand.create({
        data: {
          agentId,
          type: 'COLLECT_INVENTORY',
          status: 'PENDING',
        },
      });
      commandId = command.id;
    });

    it('returns 401 without agent token', async () => {
      const res = await agent
        .post(`/api/agent/commands/${commandId}/result`)
        .set('X-Agent-Id', agentId)
        .send({ status: 'COMPLETED', result: 'done' });

      expect(res.status).toBe(401);
    });

    it('reports command result successfully', async () => {
      const res = await agent
        .post(`/api/agent/commands/${commandId}/result`)
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId)
        .send({ status: 'COMPLETED', result: 'Inventory collected successfully' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 for invalid result status', async () => {
      const res = await agent
        .post(`/api/agent/commands/${commandId}/result`)
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/agent/logs - receive agent logs', () => {
    it('returns 401 without agent token', async () => {
      const res = await agent
        .post('/api/agent/logs')
        .set('X-Agent-Id', agentId)
        .send({ logs: 'some logs', timestamp: new Date().toISOString() });

      expect(res.status).toBe(401);
    });

    it('stores agent logs successfully', async () => {
      const res = await agent
        .post('/api/agent/logs')
        .set('Authorization', `Bearer ${agentToken}`)
        .set('X-Agent-Id', agentId)
        .send({
          logs: 'INFO: Agent started successfully\nINFO: Heartbeat sent',
          agentVersion: '1.0.0',
          os: 'LINUX',
          architecture: 'amd64',
          hostname: 'INTTEST-API-HOST',
          timestamp: new Date().toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/logs received/i);
    });
  });
});
