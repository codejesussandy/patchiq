// @ts-nocheck
/**
 * Integration tests for /v1/agent-versions CRUD endpoints
 */
import { getAgent, getAdminToken, prisma } from './test-setup';

describe('Agent Versions API - /v1/agent-versions', () => {
  let adminToken;
  let agent;
  let createdVersionId;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();
    // Clean up any leftover test versions
    await prisma.agentVersion.deleteMany({
      where: { version: { startsWith: '99.' } },
    });
  });

  afterAll(async () => {
    await prisma.agentVersion.deleteMany({
      where: { version: { startsWith: '99.' } },
    });
  });

  describe('GET /v1/agent-versions - list versions', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.get('/v1/agent-versions');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns list of agent versions', async () => {
      const res = await agent
        .get('/v1/agent-versions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters by platform', async () => {
      const res = await agent
        .get('/v1/agent-versions?platform=linux')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('filters by deprecated flag', async () => {
      const res = await agent
        .get('/v1/agent-versions?deprecated=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/agent-versions/latest - get latest version', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.get('/v1/agent-versions/latest?platform=linux&architecture=amd64');
      expect(res.status).toBe(401);
    });

    it('returns 400 when platform or architecture missing', async () => {
      const res = await agent
        .get('/v1/agent-versions/latest')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns latest version for linux/amd64', async () => {
      const res = await agent
        .get('/v1/agent-versions/latest?platform=linux&architecture=amd64')
        .set('Authorization', `Bearer ${adminToken}`);

      // No seed data for agent versions in the test DB, so 404 is expected
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /v1/agent-versions - create version', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent
        .post('/v1/agent-versions')
        .send({
          platform: 'linux',
          architecture: 'amd64',
          version: '99.0.1',
        });

      expect(res.status).toBe(401);
    });

    it('creates a new agent version', async () => {
      const res = await agent
        .post('/v1/agent-versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          platform: 'linux',
          architecture: 'amd64',
          version: '99.0.1',
          releaseNotes: 'Integration test version',
          isRecommended: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.platform).toBe('linux');
      expect(res.body.data.architecture).toBe('amd64');
      expect(res.body.data.version).toBe('99.0.1');

      createdVersionId = res.body.data.id;
    });

    it('returns 400 for invalid version format (not semver)', async () => {
      const res = await agent
        .post('/v1/agent-versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          platform: 'linux',
          architecture: 'amd64',
          version: 'not-semver',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid platform', async () => {
      const res = await agent
        .post('/v1/agent-versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          platform: 'freebsd',
          architecture: 'amd64',
          version: '99.0.2',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid architecture', async () => {
      const res = await agent
        .post('/v1/agent-versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          platform: 'linux',
          architecture: 'x86',
          version: '99.0.3',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /v1/agent-versions/:id - get version by ID', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.get(`/v1/agent-versions/${createdVersionId}`);
      expect(res.status).toBe(401);
    });

    it('returns version details for valid ID', async () => {
      const res = await agent
        .get(`/v1/agent-versions/${createdVersionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdVersionId);
      expect(res.body.data.version).toBe('99.0.1');
      expect(res.body.data).toHaveProperty('platform');
      expect(res.body.data).toHaveProperty('architecture');
      expect(res.body.data).toHaveProperty('isRecommended');
      expect(res.body.data).toHaveProperty('isDeprecated');
      expect(res.body.data).toHaveProperty('downloadCount');
    });

    it('returns 404 for non-existent version', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await agent
        .get(`/v1/agent-versions/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /v1/agent-versions/:id - update version', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent
        .put(`/v1/agent-versions/${createdVersionId}`)
        .send({ isRecommended: true });

      expect(res.status).toBe(401);
    });

    it('updates releaseNotes successfully', async () => {
      const res = await agent
        .put(`/v1/agent-versions/${createdVersionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ releaseNotes: 'Updated release notes for integration test' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('marks version as recommended', async () => {
      const res = await agent
        .put(`/v1/agent-versions/${createdVersionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isRecommended: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('marks version as deprecated', async () => {
      const res = await agent
        .put(`/v1/agent-versions/${createdVersionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isDeprecated: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /v1/agent-versions/:id - delete version', () => {
    it('returns 401 without auth token', async () => {
      const res = await agent.delete(`/v1/agent-versions/${createdVersionId}`);
      expect(res.status).toBe(401);
    });

    it('deletes the version successfully', async () => {
      const res = await agent
        .delete(`/v1/agent-versions/${createdVersionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when deleting already-deleted version', async () => {
      const res = await agent
        .delete(`/v1/agent-versions/${createdVersionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
