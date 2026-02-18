import request from 'supertest';
import { getTestApp, generateTestTokensAsync, authenticatedRequest, randomString } from '../utils/testHelpers';
import { prisma } from '@db/client';

describe('Agents Module', () => {
  const app = getTestApp();
  let auth: ReturnType<typeof authenticatedRequest>;

  let testAgentId: string;
  let testAgentMachineId: string;

  beforeAll(async () => {
    // Generate tokens with proper roleId for RBAC
    const tokens = await generateTestTokensAsync('test-admin-id', 'admin');
    auth = authenticatedRequest(app, tokens.accessToken);

    // Create a test agent for tests
    testAgentMachineId = `TEST-MACHINE-${randomString(8)}`;
    const agent = await prisma.agent.create({
      data: {
        machineId: testAgentMachineId,
        name: 'Test Agent',
        os: 'Windows',
        osVersion: '11 Pro',
        status: 'CONNECTED',
        hostname: 'test-host',
        ipAddress: '192.168.1.100',
        agentVersion: '2.1.0',
        capabilities: ['scan', 'deploy', 'reboot'],
      },
    });
    testAgentId = agent.id;

    // Create some test agent downloads
    await prisma.agentDownload.createMany({
      data: [
        {
          os: 'Windows 11',
          version: '2.1.0',
          releaseDate: new Date('2024-12-25'),
          downloadUrl: '/downloads/windows-agent.exe',
        },
        {
          os: 'MacOS',
          version: '2.1.0',
          releaseDate: new Date('2024-12-25'),
          downloadUrl: '/downloads/macos-agent.dmg',
        },
      ],
      skipDuplicates: true,
    });

    // Create some test agent versions
    await prisma.agentVersion.createMany({
      data: [
        {
          platform: 'Windows',
          architecture: 'x64',
          version: '5.0.12',
          lastUpdatedAt: new Date(),
        },
        {
          platform: 'MacOS',
          architecture: 'arm64',
          version: '5.0.12',
          lastUpdatedAt: new Date(),
        },
      ],
      skipDuplicates: true,
    });

    // Create a test command
    await prisma.agentCommand.create({
      data: {
        agentId: testAgentId,
        type: 'scan',
        status: 'COMPLETED',
        result: 'Scan completed: 45 patches available',
        executedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.agentCommand.deleteMany({ where: { agentId: testAgentId } });
    await prisma.agent.deleteMany({ where: { machineId: { startsWith: 'TEST-MACHINE-' } } });
    await prisma.agentDownload.deleteMany({});
    await prisma.agentVersion.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /v1/agents', () => {
    it('should return list of agents', async () => {
      const response = await auth.get('/v1/agents');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await auth.get('/v1/agents?status=Connected');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((agent: { status: string }) => {
        expect(agent.status).toBe('CONNECTED');
      });
    });

    it('should filter by OS', async () => {
      const response = await auth.get('/v1/agents?os=Windows');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((agent: { os: string }) => {
        expect(agent.os).toBe('Windows');
      });
    });

    it('should search by name', async () => {
      const response = await auth.get('/v1/agents?search=Test');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/v1/agents');

      expect(response.status).toBe(401);
    });

    it('should support pagination', async () => {
      const response = await auth.get('/v1/agents?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /v1/agents/:id', () => {
    it('should return agent by ID', async () => {
      const response = await auth.get(`/v1/agents/${testAgentId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testAgentId);
      expect(response.body.machineId).toBe(testAgentMachineId);
      expect(response.body.name).toBe('Test Agent');
      expect(response.body.status).toBe('CONNECTED');
      expect(response.body.os).toBe('Windows');
      expect(response.body).toHaveProperty('lastHeartbeatRelative');
      expect(response.body).toHaveProperty('registeredAt');
      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(Array.isArray(response.body.groups)).toBe(true);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await auth.get('/v1/agents/non-existent-id');

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get(`/v1/agents/${testAgentId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v1/agents/:id/commands', () => {
    it('should return agent commands', async () => {
      const response = await auth.get(`/v1/agents/${testAgentId}/commands`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await auth.get('/v1/agents/non-existent-id/commands');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /v1/agents/downloads', () => {
    it('should return available downloads', async () => {
      const response = await auth.get('/v1/agents/downloads');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('os');
        expect(response.body[0]).toHaveProperty('version');
        expect(response.body[0]).toHaveProperty('releaseDate');
        expect(response.body[0]).toHaveProperty('downloadUrl');
      }
    });
  });

  describe('GET /v1/agent-versions', () => {
    it('should return agent versions', async () => {
      const response = await auth.get('/v1/agent-versions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('platform');
        expect(response.body[0]).toHaveProperty('architecture');
        expect(response.body[0]).toHaveProperty('version');
      }
    });
  });

  describe('DELETE /v1/agents/:id', () => {
    it('should delete agent', async () => {
      // Create an agent to delete
      const deleteAgentMachineId = `DELETE-TEST-${randomString(8)}`;
      const agent = await prisma.agent.create({
        data: {
          machineId: deleteAgentMachineId,
          name: 'Delete Test',
          os: 'MacOS',
          status: 'DISCONNECTED',
        },
      });

      const response = await auth.delete(`/v1/agents/${agent.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deleted
      const deleted = await prisma.agent.findUnique({
        where: { id: agent.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await auth.delete('/v1/agents/non-existent-id');

      expect(response.status).toBe(404);
    });
  });
});

describe('Agent API (Agent-facing)', () => {
  const app = getTestApp();
  let testAgentId: string;
  let testAgentMachineId: string;

  beforeAll(async () => {
    testAgentMachineId = `AGENT-API-TEST-${randomString(8)}`;
  });

  afterAll(async () => {
    // Clean up test data
    if (testAgentId) {
      await prisma.agentCommand.deleteMany({ where: { agentId: testAgentId } });
      await prisma.agentTelemetry.deleteMany({ where: { agentId: testAgentId } });
    }
    await prisma.agent.deleteMany({ where: { machineId: { startsWith: 'AGENT-API-TEST-' } } });
    await prisma.asset.deleteMany({ where: { name: { startsWith: 'agent-api-test-' } } });
    await prisma.$disconnect();
  });

  describe('POST /api/agent/register', () => {
    it('should register new agent', async () => {
      const response = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '1.0.0')
        .send({
          machineId: testAgentMachineId,
          hostname: 'agent-api-test-host',
          os: 'MacOS',
          osVersion: '14.5',
          architecture: 'arm64',
          agentVersion: '1.0.0',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('agentId');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('config');
      expect(response.body.isReRegistration).toBe(false);

      testAgentId = response.body.agentId;
    });

    it('should re-register existing agent', async () => {
      const response = await request(app)
        .post('/api/agent/register')
        .send({
          machineId: testAgentMachineId,
          hostname: 'updated-host',
          os: 'MacOS',
          osVersion: '14.6',
          architecture: 'arm64',
          agentVersion: '2.0.0',
        });

      expect(response.status).toBe(200);
      expect(response.body.isReRegistration).toBe(true);
      expect(response.body.agentId).toBe(testAgentId);
    });

    it('should return 400 for invalid registration data', async () => {
      const response = await request(app)
        .post('/api/agent/register')
        .send({
          machineId: '', // Invalid - empty string
          hostname: 'test',
          os: 'InvalidOS', // Invalid enum
        });

      expect(response.status).toBe(400);
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
      expect(response.body).toHaveProperty('serverTime');
      expect(response.body).toHaveProperty('commandsPending');
    });

    it('should return 400 without X-Agent-Id header', async () => {
      const response = await request(app)
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

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/agent/commands', () => {
    it('should return pending commands', async () => {
      // Create a pending command
      await prisma.agentCommand.create({
        data: {
          agentId: testAgentId,
          type: 'scan',
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .get('/api/agent/commands')
        .set('X-Agent-Id', testAgentId);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 400 without X-Agent-Id header', async () => {
      const response = await request(app).get('/api/agent/commands');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/agent/config', () => {
    it('should return agent configuration', async () => {
      const response = await request(app)
        .get('/api/agent/config')
        .set('X-Agent-Id', testAgentId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('heartbeatIntervalSeconds');
      expect(response.body).toHaveProperty('inventoryScheduleCron');
      expect(response.body).toHaveProperty('telemetryIntervalSeconds');
    });
  });

  describe('POST /api/agent/telemetry', () => {
    it('should accept telemetry data', async () => {
      const response = await request(app)
        .post('/api/agent/telemetry')
        .set('X-Agent-Id', testAgentId)
        .send({
          collectedAt: new Date().toISOString(),
          cpu: { usage: 25.5 },
          memory: { usage: 60.0 },
          disk: { usage: 45.0 },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
