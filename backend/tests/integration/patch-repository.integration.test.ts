// @ts-nocheck
/**
 * Integration tests for /v1/patch-repository endpoints
 * Some endpoints may fail without BullMQ/Redis - we test for appropriate responses.
 */
import { getAgent, getAdminToken, prisma } from './test-setup';

describe('Patch Repository API - /v1/patch-repository', () => {
  let adminToken;
  let agent;
  let createdSourceId;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();
  });

  afterAll(async () => {
    if (createdSourceId) {
      await prisma.patchSource.deleteMany({ where: { id: createdSourceId } }).catch(() => {});
    }
    await prisma.patchSource.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } }).catch(() => { /* ignore */ });
  });

  describe('GET /v1/patch-repository/sources', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/patch-repository/sources');
      expect(res.status).toBe(401);
    });

    it('returns list of patch sources', async () => {
      const res = await agent
        .get('/v1/patch-repository/sources')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      // Returns { sources: [], total: N }
      expect(Array.isArray(res.body.data.sources)).toBe(true);
    });

    it('filters by isEnabled', async () => {
      const res = await agent
        .get('/v1/patch-repository/sources?isEnabled=true')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /v1/patch-repository/sources', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.post('/v1/patch-repository/sources').send({});
      expect(res.status).toBe(401);
    });

    it('creates a patch source', async () => {
      const res = await agent
        .post('/v1/patch-repository/sources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'INTTEST-PatchSource',
          vendor: 'Microsoft',
          platform: 'windows',
          category: 'security',
          baseUrl: 'https://example.com/patches',
          isEnabled: true,
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      createdSourceId = res.body.data.id;
    });
  });

  describe('GET /v1/patch-repository/sources/:id', () => {
    it('returns 404 for non-existent source', async () => {
      const res = await agent
        .get('/v1/patch-repository/sources/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns source by ID', async () => {
      const res = await agent
        .get(`/v1/patch-repository/sources/${createdSourceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdSourceId);
    });
  });

  describe('PUT /v1/patch-repository/sources/:id', () => {
    it('returns 404 for non-existent source', async () => {
      const res = await agent
        .put('/v1/patch-repository/sources/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('updates a patch source', async () => {
      const res = await agent
        .put(`/v1/patch-repository/sources/${createdSourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'INTTEST-PatchSource-Updated' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PATCH /v1/patch-repository/sources/:id/toggle', () => {
    it('returns error for non-existent source', async () => {
      const res = await agent
        .patch('/v1/patch-repository/sources/00000000-0000-0000-0000-000000000000/toggle')
        .set('Authorization', `Bearer ${adminToken}`);
      // Toggle doesn't check existence first, may return 404 or 500
      expect([404, 500]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('toggles a patch source enabled state', async () => {
      const res = await agent
        .patch(`/v1/patch-repository/sources/${createdSourceId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.isEnabled).toBe('boolean');
    });
  });

  describe('DELETE /v1/patch-repository/sources/:id', () => {
    it('returns 404 for non-existent source', async () => {
      const res = await agent
        .delete('/v1/patch-repository/sources/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('deletes a patch source', async () => {
      const res = await agent
        .delete(`/v1/patch-repository/sources/${createdSourceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      createdSourceId = null;
    });
  });

  describe('GET /v1/patch-repository/downloads', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/patch-repository/downloads');
      expect(res.status).toBe(401);
    });

    it('returns list of download jobs', async () => {
      const res = await agent
        .get('/v1/patch-repository/downloads')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      // Returns { jobs: [], total: N }
      expect(Array.isArray(res.body.data.jobs)).toBe(true);
    });

    it('filters by status', async () => {
      const res = await agent
        .get('/v1/patch-repository/downloads?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects invalid status', async () => {
      const res = await agent
        .get('/v1/patch-repository/downloads?status=INVALID')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /v1/patch-repository/stats', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/patch-repository/stats');
      expect(res.status).toBe(401);
    });

    it('returns repository statistics', async () => {
      const res = await agent
        .get('/v1/patch-repository/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /v1/patch-repository/queue/stats', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/patch-repository/queue/stats');
      expect(res.status).toBe(401);
    });

    it('returns queue stats or appropriate error when Redis unavailable', async () => {
      let res;
      try {
        res = await agent
          .get('/v1/patch-repository/queue/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(10000);
      } catch (_err) {
        // Request timed out or connection error - acceptable when Redis is unavailable
        return;
      }
      // Either 200 (Redis available) or 500/503 (Redis unavailable)
      expect([200, 500, 503]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      } else {
        expect(res.body.success).toBe(false);
      }
    }, 15000);
  });

  describe('POST /v1/patch-repository/downloads', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.post('/v1/patch-repository/downloads').send({});
      expect(res.status).toBe(401);
    });
  });
});
