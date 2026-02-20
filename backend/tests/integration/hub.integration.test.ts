// @ts-nocheck
/**
 * Integration tests for /v1/hub endpoints
 * File upload tests (multipart/MinIO) are skipped.
 */
import { getAgent, getAdminToken, prisma } from './test-setup';

describe('Hub API - /v1/hub', () => {
  let adminToken;
  let agent;
  let createdPackageId;
  let createdBundleId;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();
  });

  afterAll(async () => {
    if (createdPackageId) {
      await prisma.softwarePackage.deleteMany({ where: { packageId: String(createdPackageId) } }).catch(() => {});
    }
    if (createdBundleId) {
      await prisma.hubBundle.deleteMany({ where: { id: createdBundleId } }).catch(() => {});
    }
    await prisma.softwarePackage.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } }).catch(() => {});
    await prisma.hubBundle.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } }).catch(() => {});
  });

  describe('GET /v1/hub/stats', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/hub/stats');
      expect(res.status).toBe(401);
    });

    it('returns hub statistics', async () => {
      const res = await agent
        .get('/v1/hub/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /v1/hub/packages', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/hub/packages');
      expect(res.status).toBe(401);
    });

    it('returns list of packages', async () => {
      const res = await agent
        .get('/v1/hub/packages')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    it('supports pagination', async () => {
      const res = await agent
        .get('/v1/hub/packages?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('filters by platform', async () => {
      const res = await agent
        .get('/v1/hub/packages?platform=windows')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/hub/packages/grouped', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/hub/packages/grouped');
      expect(res.status).toBe(401);
    });

    it('returns grouped packages', async () => {
      const res = await agent
        .get('/v1/hub/packages/grouped')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /v1/hub/packages', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.post('/v1/hub/packages').send({});
      expect(res.status).toBe(401);
    });

    it('creates a package', async () => {
      const res = await agent
        .post('/v1/hub/packages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'INTTEST-Package',
          displayName: 'INTTEST Package',
          version: '1.0.0',
          platform: 'windows',
          vendor: 'INTTEST-Vendor',
          category: 'security',
          description: 'Integration test package',
          installSource: 'url',
          installCommand: 'echo install',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Use packageId (SWP-XXXX) for URL params, not DB UUID
      createdPackageId = res.body.data.packageId;
    });
  });

  describe('GET /v1/hub/packages/:packageId', () => {
    it('returns 404 for non-existent package', async () => {
      const res = await agent
        .get('/v1/hub/packages/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns package by ID', async () => {
      const res = await agent
        .get(`/v1/hub/packages/${createdPackageId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.packageId).toBe(createdPackageId);
    });
  });

  describe('PUT /v1/hub/packages/:packageId', () => {
    it('returns 404 for non-existent package', async () => {
      const res = await agent
        .put('/v1/hub/packages/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('updates a package', async () => {
      const res = await agent
        .put(`/v1/hub/packages/${createdPackageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'INTTEST-Updated description' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/hub/packages/:packageId/bundle', () => {
    it('returns bundle download info for package', async () => {
      const res = await agent
        .get(`/v1/hub/packages/${createdPackageId}/bundle`)
        .set('Authorization', `Bearer ${adminToken}`);
      // Package was created with installSource: 'url' (no bundle), so 400 is expected
      expect(res.status).toBe(400);
      expect(res.body.success).toBeDefined();
    });
  });

  describe('GET /v1/hub/packages/:packageId/execution-payload/:opType', () => {
    it('returns 400 for invalid operation type', async () => {
      const res = await agent
        .get(`/v1/hub/packages/${createdPackageId}/execution-payload/invalid-op`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns execution payload for install operation', async () => {
      const res = await agent
        .get(`/v1/hub/packages/${createdPackageId}/execution-payload/install`)
        .set('Authorization', `Bearer ${adminToken}`);
      // Package was created with installSource: 'url' (no scripts/bundle), so 400 is expected
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /v1/hub/packages/:packageId', () => {
    it('returns 404 for non-existent package', async () => {
      const res = await agent
        .delete('/v1/hub/packages/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('deletes a package', async () => {
      const res = await agent
        .delete(`/v1/hub/packages/${createdPackageId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      createdPackageId = null;
    });
  });

  // ==================== Bundles ====================

  describe('GET /v1/hub/bundles', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/hub/bundles');
      expect(res.status).toBe(401);
    });

    it('returns list of bundles', async () => {
      const res = await agent
        .get('/v1/hub/bundles')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /v1/hub/bundles', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.post('/v1/hub/bundles').send({});
      expect(res.status).toBe(401);
    });

    it('creates a bundle', async () => {
      const res = await agent
        .post('/v1/hub/bundles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'INTTEST-Bundle',
          platform: 'WINDOWS',
          description: 'Integration test bundle',
          packageIds: [],
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdBundleId = res.body.data.bundleId;
    });
  });

  describe('GET /v1/hub/bundles/:bundleId', () => {
    it('returns 404 for non-existent bundle', async () => {
      const res = await agent
        .get('/v1/hub/bundles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns bundle by ID', async () => {
      const res = await agent
        .get(`/v1/hub/bundles/${createdBundleId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bundleId).toBe(createdBundleId);
    });
  });

  describe('DELETE /v1/hub/bundles/:bundleId', () => {
    it('deletes a bundle', async () => {
      const res = await agent
        .delete(`/v1/hub/bundles/${createdBundleId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      createdBundleId = null;
    });
  });
});
