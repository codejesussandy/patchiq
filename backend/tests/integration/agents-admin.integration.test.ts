// @ts-nocheck
/**
 * Integration tests for /v1/agents admin endpoints
 */
import { getAgent, getAdminToken, prisma } from './test-setup';

describe('Agents Admin API - /v1/agents', () => {
  let adminToken;
  let agent;
  let createdAgentId;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();

    // Create a test agent directly via prisma for update/delete tests
    // Use upsert to handle leftover data from previous runs (machineId is unique)
    const created = await prisma.agent.upsert({
      where: { machineId: 'INTTEST-ADMIN-001' },
      update: {
        hostname: 'INTTEST-ADMIN-HOST',
        status: 'DISCONNECTED',
        os: 'LINUX',
        osVersion: '22.04',
        architecture: 'amd64',
        agentVersion: '1.0.0',
        name: 'INTTEST-Admin-Agent',
      },
      create: {
        machineId: 'INTTEST-ADMIN-001',
        hostname: 'INTTEST-ADMIN-HOST',
        status: 'DISCONNECTED',
        os: 'LINUX',
        osVersion: '22.04',
        architecture: 'amd64',
        agentVersion: '1.0.0',
        name: 'INTTEST-Admin-Agent',
      },
    });
    createdAgentId = created.id;
  });

  afterAll(async () => {
    // Cleanup test agent if still exists
    await prisma.agent.deleteMany({ where: { machineId: 'INTTEST-ADMIN-001' } });
  });

  describe('GET /v1/agents - list agents', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.get('/v1/agents');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns paginated list of agents', async () => {
      const res = await agent
        .get('/v1/agents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters agents by status DISCONNECTED', async () => {
      const res = await agent
        .get('/v1/agents?status=DISCONNECTED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('filters agents by os LINUX', async () => {
      const res = await agent
        .get('/v1/agents?os=LINUX')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('supports search query param', async () => {
      const res = await agent
        .get('/v1/agents?search=INTTEST')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('supports page and limit params', async () => {
      const res = await agent
        .get('/v1/agents?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('rejects invalid status enum', async () => {
      const res = await agent
        .get('/v1/agents?status=INVALID')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /v1/agents/:id - get agent by ID', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.get(`/v1/agents/${createdAgentId}`);
      expect(res.status).toBe(401);
    });

    it('returns agent details for valid ID', async () => {
      const res = await agent
        .get(`/v1/agents/${createdAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdAgentId);
      expect(res.body.data.hostname).toBe('INTTEST-ADMIN-HOST');
    });

    it('returns 404 for non-existent agent', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await agent
        .get(`/v1/agents/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /v1/agents/:id - update agent', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent
        .put(`/v1/agents/${createdAgentId}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('updates agent name', async () => {
      const res = await agent
        .put(`/v1/agents/${createdAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'INTTEST-Updated-Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('INTTEST-Updated-Name');
    });

    it('updates agent tags', async () => {
      const res = await agent
        .put(`/v1/agents/${createdAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tags: ['inttest', 'linux'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/agents/:id/commands - command history', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.get(`/v1/agents/${createdAgentId}/commands`);
      expect(res.status).toBe(401);
    });

    it('returns command list for agent', async () => {
      const res = await agent
        .get(`/v1/agents/${createdAgentId}/commands`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /v1/agents/:id/collect - trigger collection', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent
        .post(`/v1/agents/${createdAgentId}/collect`)
        .send({ type: 'all' });
      expect(res.status).toBe(401);
    });

    it('triggers inventory collection for agent', async () => {
      const res = await agent
        .post(`/v1/agents/${createdAgentId}/collect`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'inventory' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/agents/:id/telemetry/latest - latest telemetry', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.get(`/v1/agents/${createdAgentId}/telemetry/latest`);
      expect(res.status).toBe(401);
    });

    it('returns latest telemetry (or null) for agent', async () => {
      const res = await agent
        .get(`/v1/agents/${createdAgentId}/telemetry/latest`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // data may be null if no telemetry submitted yet
    });
  });

  describe('GET /v1/agents/downloads - agent downloads', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.get('/v1/agents/downloads');
      expect(res.status).toBe(401);
    });

    it('returns download list', async () => {
      const res = await agent
        .get('/v1/agents/downloads')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /v1/agents/errors - agent errors', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.get('/v1/agents/errors');
      expect(res.status).toBe(401);
    });

    it('returns error list with pagination metadata', async () => {
      const res = await agent
        .get('/v1/agents/errors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('limit');
    });

    it('filters errors by agentId', async () => {
      const res = await agent
        .get(`/v1/agents/errors?agentId=${createdAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /v1/agents/bulk-update - bulk update', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.post('/v1/agents/bulk-update').send({});
      expect(res.status).toBe(401);
    });

    it('initiates bulk update with no versionId (uses latest)', async () => {
      const res = await agent
        .post('/v1/agents/bulk-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /v1/agents/:id - delete agent', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.delete(`/v1/agents/${createdAgentId}`);
      expect(res.status).toBe(401);
    });

    it('deletes the agent successfully', async () => {
      const res = await agent
        .delete(`/v1/agents/${createdAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/deleted/i);
    });

    it('returns 404 when deleting already-deleted agent', async () => {
      const res = await agent
        .delete(`/v1/agents/${createdAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
