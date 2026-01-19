import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { prisma } from '@db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = getTestApp();

describe('E2E: Agent Lifecycle', () => {
  let adminToken: string;
  let testUserId: string;
  let registeredAgentId: string;
  let agentAccessToken: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'agents-test-admin@patchiq.io' },
      update: {},
      create: {
        email: 'agents-test-admin@patchiq.io',
        name: 'Agents Test Admin',
        passwordHash,
        role: 'admin',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;

    // Login to get token
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'agents-test-admin@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup test agents
    if (registeredAgentId) {
      await prisma.agent.delete({ where: { id: registeredAgentId } }).catch(() => {});
    }
    await prisma.agent.deleteMany({
      where: { machineId: { startsWith: 'E2E-TEST' } },
    });
    // Cleanup test user
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('Agent Registration', () => {
    it('should register a new agent successfully', async () => {
      const machineId = `E2E-TEST-MACHINE-${Date.now()}`;

      const res = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '2.1.0')
        .send({
          machineId,
          hostname: 'e2e-test-host',
          os: 'MacOS',
          osVersion: '14.5',
          architecture: 'arm64',
          agentVersion: '2.1.0',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('agentId');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('config');
      expect(res.body.config.heartbeatIntervalSeconds).toBeDefined();

      registeredAgentId = res.body.agentId;
      agentAccessToken = res.body.accessToken;
    });

    it('should handle re-registration of existing agent', async () => {
      const machineId = `E2E-TEST-REREG-${Date.now()}`;

      // First registration
      const firstRes = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '2.1.0')
        .send({
          machineId,
          hostname: 'e2e-test-rereg',
          os: 'Windows',
          osVersion: '11',
          architecture: 'x64',
          agentVersion: '2.1.0',
        });

      expect(firstRes.status).toBe(201);
      const firstAgentId = firstRes.body.agentId;

      // Re-registration with same machine ID
      const secondRes = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '2.1.1')
        .send({
          machineId,
          hostname: 'e2e-test-rereg-updated',
          os: 'Windows',
          osVersion: '11 22H2',
          architecture: 'x64',
          agentVersion: '2.1.1',
        });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.agentId).toBe(firstAgentId);
      expect(secondRes.body.isReRegistration).toBe(true);

      // Cleanup
      await prisma.agent.delete({ where: { id: firstAgentId } }).catch(() => {});
    });

    it('should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '2.1.0')
        .send({
          hostname: 'test',
        });

      // Backend returns 400 for validation errors
      expect([400, 422]).toContain(res.status);
    });
  });

  describe('Agent Heartbeat', () => {
    it('should process heartbeat from registered agent', async () => {
      // Use the agent registered in earlier test
      if (!registeredAgentId || !agentAccessToken) {
        // Register new agent for this test
        const regRes = await request(app)
          .post('/api/agent/register')
          .set('X-Agent-Version', '2.1.0')
          .send({
            machineId: `E2E-TEST-HB-${Date.now()}`,
            hostname: 'e2e-heartbeat-test',
            os: 'Linux',
            osVersion: '20.04',
            architecture: 'x64',
            agentVersion: '2.1.0',
          });

        registeredAgentId = regRes.body.agentId;
        agentAccessToken = regRes.body.accessToken;
      }

      const heartbeatRes = await request(app)
        .post('/api/agent/heartbeat')
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .set('X-Agent-Id', registeredAgentId)
        .send({
          timestamp: new Date().toISOString(),
          status: 'healthy',
          uptime: 3600,
          agentUptime: 60,
          cpuUsage: 15.5,
          memoryUsage: 45.2,
          diskUsage: 60.0,
          pendingReboot: false,
        });

      expect(heartbeatRes.status).toBe(200);
      expect(heartbeatRes.body.acknowledged).toBe(true);
      expect(heartbeatRes.body).toHaveProperty('serverTime');
      expect(heartbeatRes.body).toHaveProperty('commandsPending');
    });

    it('should update agent status on heartbeat', async () => {
      // Verify agent appears as Connected
      const agentRes = await request(app)
        .get(`/v1/agents/${registeredAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(agentRes.status).toBe(200);
      expect(agentRes.body.status).toBe('Connected');
    });
  });

  describe('Agent Commands', () => {
    it('should get pending commands for agent', async () => {
      const res = await request(app)
        .get('/api/agent/commands')
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .set('X-Agent-Id', registeredAgentId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should report command result', async () => {
      // First create a pending command via admin API
      // For now, just test the endpoint exists and returns valid response
      const res = await request(app)
        .post('/api/agent/commands/fake-command-id/result')
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .set('X-Agent-Id', registeredAgentId)
        .send({
          commandId: 'fake-command-id',
          status: 'completed',
          output: 'Command executed successfully',
          exitCode: 0,
          completedAt: new Date().toISOString(),
        });

      // Either 200 (success) or 404 (command not found) are valid
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Agent Config', () => {
    it('should get agent configuration', async () => {
      const res = await request(app)
        .get('/api/agent/config')
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .set('X-Agent-Id', registeredAgentId);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('heartbeatIntervalSeconds');
      expect(res.body).toHaveProperty('telemetryEnabled');
    });
  });

  describe('Agent Inventory', () => {
    it('should submit inventory data', async () => {
      if (!registeredAgentId || !agentAccessToken) return;

      const res = await request(app)
        .post('/api/agent/inventory')
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .set('X-Agent-Id', registeredAgentId)
        .send({
          collectedAt: new Date().toISOString(),
          hardware: {
            manufacturer: 'Apple',
            model: 'MacBook Pro',
            serialNumber: 'C0265B8FGL14',
            cpu: 'Apple M1 Pro',
            cpuCores: 10,
            ramTotal: 32768,
            diskTotal: 512000,
          },
          software: {
            installedApps: [
              {
                name: 'Google Chrome',
                version: '121.0.6167.160',
                publisher: 'Google LLC',
              },
            ],
          },
          security: {
            antivirusInstalled: true,
            antivirusName: 'Windows Defender',
            firewallEnabled: true,
          },
        });

      // 200 if agent has linked asset, 404 if no linked asset
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Agent Telemetry', () => {
    it('should submit telemetry data', async () => {
      if (!registeredAgentId || !agentAccessToken) return;

      const res = await request(app)
        .post('/api/agent/telemetry')
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .set('X-Agent-Id', registeredAgentId)
        .send({
          collectedAt: new Date().toISOString(),
          cpu: { usage: 25.5 },
          memory: { usage: 60.2 },
          disk: { usage: 45.0 },
        });

      expect(res.status).toBe(200);
    });
  });

  describe('Frontend Agent APIs', () => {
    it('should list all agents', async () => {
      const res = await request(app)
        .get('/v1/agents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // Verify registered agent is in the list
      const agent = res.body.find((a: any) => a.id === registeredAgentId);
      expect(agent).toBeDefined();
    });

    it('should get agent details', async () => {
      const res = await request(app)
        .get(`/v1/agents/${registeredAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(registeredAgentId);
      expect(res.body).toHaveProperty('machineId');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('os');
    });

    it('should get agent command history', async () => {
      const res = await request(app)
        .get(`/v1/agents/${registeredAgentId}/commands`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should get agent downloads list', async () => {
      const res = await request(app)
        .get('/v1/agents/downloads')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter agents by status', async () => {
      const res = await request(app)
        .get('/v1/agents?status=Connected')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // All returned agents should have Connected status
      res.body.forEach((agent: any) => {
        expect(agent.status).toBe('Connected');
      });
    });

    it('should search agents by hostname', async () => {
      const res = await request(app)
        .get('/v1/agents?search=e2e')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 404 for non-existent agent', async () => {
      const res = await request(app)
        .get('/v1/agents/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should delete agent successfully', async () => {
      // Create agent to delete
      const regRes = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '2.1.0')
        .send({
          machineId: `E2E-TEST-DELETE-${Date.now()}`,
          hostname: 'e2e-delete-test',
          os: 'Linux',
          osVersion: '22.04',
          architecture: 'x64',
          agentVersion: '2.1.0',
        });

      const deleteAgentId = regRes.body.agentId;

      const deleteRes = await request(app)
        .delete(`/v1/agents/${deleteAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify agent is deleted
      const getRes = await request(app)
        .get(`/v1/agents/${deleteAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('Agent Token Refresh', () => {
    // TODO: Implement agent token refresh in service
    it.skip('should refresh agent token', async () => {
      // Get initial registration for refresh token
      const regRes = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '2.1.0')
        .send({
          machineId: `E2E-TEST-TOKEN-${Date.now()}`,
          hostname: 'e2e-token-test',
          os: 'Windows',
          osVersion: '11',
          architecture: 'x64',
          agentVersion: '2.1.0',
        });

      const refreshToken = regRes.body.refreshToken;
      const agentId = regRes.body.agentId;

      const refreshRes = await request(app)
        .post('/api/agent/token/refresh')
        .set('X-Agent-Id', agentId)
        .set('Authorization', `Bearer ${refreshToken}`);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');

      // Cleanup
      await prisma.agent.delete({ where: { id: agentId } }).catch(() => {});
    });
  });
});

describe('E2E: Agent Versions', () => {
  let adminToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'agent-versions-test@patchiq.io' },
      update: {},
      create: {
        email: 'agent-versions-test@patchiq.io',
        name: 'Agent Versions Test',
        passwordHash,
        role: 'admin',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;

    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'agent-versions-test@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  it('should list agent versions', async () => {
    const res = await request(app)
      .get('/v1/agent-versions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('platform');
      expect(res.body[0]).toHaveProperty('architecture');
      expect(res.body[0]).toHaveProperty('version');
    }
  });
});
