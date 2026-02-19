// @ts-nocheck
/**
 * Integration tests for /v1/alerts endpoints
 */
import { getAgent, getAdminToken, prisma } from './test-setup';

describe('Alerts API - /v1/alerts', () => {
  let adminToken;
  let agent;
  let createdAlertId;
  let secondAlertId;
  let testAssetId;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();

    // Create a test asset to attach alerts to
    const testAsset = await prisma.asset.create({
      data: {
        name: 'INTTEST-Alert-Asset',
        type: 'SERVER',
        status: 'ACTIVE',
        os: 'LINUX',
      },
    });
    testAssetId = testAsset.id;

    // Create test alerts via prisma (model is assetAlert)
    const alert1 = await prisma.assetAlert.create({
      data: {
        assetId: testAssetId,
        alert: 'INTTEST-Alert-1',
        message: 'Integration test alert 1',
        severity: 'WARNING',
        status: 'Open',
        module: 'INTTEST',
        attribute: 'cpu',
        value: '90',
      },
    });
    createdAlertId = alert1.id;

    const alert2 = await prisma.assetAlert.create({
      data: {
        assetId: testAssetId,
        alert: 'INTTEST-Alert-2',
        message: 'Integration test alert 2',
        severity: 'CRITICAL',
        status: 'Open',
        module: 'INTTEST',
        attribute: 'disk',
        value: '95',
      },
    });
    secondAlertId = alert2.id;
  });

  afterAll(async () => {
    await prisma.assetAlert.deleteMany({
      where: { module: 'INTTEST' },
    }).catch(() => {});
    if (testAssetId) {
      await prisma.asset.deleteMany({ where: { id: testAssetId } }).catch(() => {});
    }
  });

  describe('GET /v1/alerts', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/alerts');
      expect(res.status).toBe(401);
    });

    it('returns paginated list of alerts', async () => {
      const res = await agent
        .get('/v1/alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    it('filters by severity', async () => {
      const res = await agent
        .get('/v1/alerts?severity=CRITICAL')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('filters by status', async () => {
      const res = await agent
        .get('/v1/alerts?status=Open')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects invalid severity', async () => {
      const res = await agent
        .get('/v1/alerts?severity=UNKNOWN')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('supports search param', async () => {
      const res = await agent
        .get('/v1/alerts?search=INTTEST')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/alerts/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get(`/v1/alerts/${createdAlertId}`);
      expect(res.status).toBe(401);
    });

    it('returns 400 for non-UUID id', async () => {
      const res = await agent
        .get('/v1/alerts/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for non-existent alert', async () => {
      const res = await agent
        .get('/v1/alerts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns alert by ID', async () => {
      const res = await agent
        .get(`/v1/alerts/${createdAlertId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdAlertId);
    });
  });

  describe('PUT /v1/alerts/:id/acknowledge', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.put(`/v1/alerts/${createdAlertId}/acknowledge`).send({});
      expect(res.status).toBe(401);
    });

    it('returns 400 for non-UUID id', async () => {
      const res = await agent
        .put('/v1/alerts/not-a-uuid/acknowledge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for non-existent alert', async () => {
      const res = await agent
        .put('/v1/alerts/00000000-0000-0000-0000-000000000000/acknowledge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('acknowledges an alert', async () => {
      const res = await agent
        .put(`/v1/alerts/${createdAlertId}/acknowledge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Acknowledged by integration test' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Acknowledged');
    });
  });

  describe('PUT /v1/alerts/:id/resolve', () => {
    it('returns 400 for missing resolution field', async () => {
      const res = await agent
        .put(`/v1/alerts/${createdAlertId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for non-existent alert', async () => {
      const res = await agent
        .put('/v1/alerts/00000000-0000-0000-0000-000000000000/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'Fixed' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('resolves an alert', async () => {
      const res = await agent
        .put(`/v1/alerts/${createdAlertId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'Resolved by integration test' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Resolved');
    });
  });

  describe('PUT /v1/alerts/bulk-acknowledge', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.put('/v1/alerts/bulk-acknowledge').send({ ids: [secondAlertId] });
      expect(res.status).toBe(401);
    });

    it('returns 400 for missing ids', async () => {
      const res = await agent
        .put('/v1/alerts/bulk-acknowledge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('bulk acknowledges alerts', async () => {
      const res = await agent
        .put('/v1/alerts/bulk-acknowledge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [secondAlertId] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /v1/alerts/bulk', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.delete('/v1/alerts/bulk').send({ ids: [secondAlertId] });
      expect(res.status).toBe(401);
    });

    it('returns 400 for missing ids', async () => {
      const res = await agent
        .delete('/v1/alerts/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('bulk deletes alerts (only resolved)', async () => {
      // Must resolve the alert first before bulk deleting
      await agent
        .put(`/v1/alerts/${secondAlertId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'Resolved for bulk delete test' });

      const res = await agent
        .delete('/v1/alerts/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [secondAlertId] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      secondAlertId = null;
    });
  });
});
