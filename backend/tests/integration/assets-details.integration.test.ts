// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const PREFIX = 'INTTEST-DET';

describe('Asset Sub-Resources', () => {
  let token;
  let assetId;

  beforeAll(async () => {
    token = await getAdminToken();

    // Create a fresh asset to test sub-resource endpoints against
    const res = await getAgent()
      .post('/v1/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Asset`, status: 'AVAILABLE' });
    expect(res.status).toBe(201);
    assetId = res.body.data.id;
  });

  afterAll(async () => {
    await prisma.asset.deleteMany({ where: { name: { startsWith: PREFIX } } });
  });

  const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

  // ---- Hardware ----
  it('GET /v1/assets/:id/hardware returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/hardware`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/hardware 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/hardware`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Software ----
  it('GET /v1/assets/:id/software returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/software`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/software 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/software`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Security ----
  it('GET /v1/assets/:id/security returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/security`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/security 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/security`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Network ----
  it('GET /v1/assets/:id/network returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/network`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/network 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/network`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Peripherals ----
  it('GET /v1/assets/:id/peripherals returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/peripherals`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/peripherals 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/peripherals`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Telemetry ----
  it('GET /v1/assets/:id/telemetry returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/telemetry`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/telemetry 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/telemetry`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Telemetry History ----
  it('GET /v1/assets/:id/telemetry/history returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/telemetry/history`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/telemetry/history with period param returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/telemetry/history?period=week`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /v1/assets/:id/telemetry/history 400 on invalid period', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/telemetry/history?period=year`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Lifecycle ----
  it('GET /v1/assets/:id/lifecycle returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/lifecycle`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/lifecycle 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/lifecycle`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Errors ----
  it('GET /v1/assets/:id/errors returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/errors`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/errors 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/errors`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Audit Log ----
  it('GET /v1/assets/:id/audit-log returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/audit-log`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/assets/:id/audit-log 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/audit-log`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Alerts ----
  it('GET /v1/assets/:id/alerts returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/alerts`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/alerts 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/alerts`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Patches ----
  it('GET /v1/assets/:id/patches returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/patches`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/patches 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/patches`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Vulnerabilities ----
  it('GET /v1/assets/:id/vulnerabilities returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/vulnerabilities`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/vulnerabilities 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/vulnerabilities`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Deployments ----
  it('GET /v1/assets/:id/deployments returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/deployments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/assets/:id/deployments 404 for unknown asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${UNKNOWN_ID}/deployments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Patch Recommendations ----
  it('GET /v1/assets/:id/patch-recommendations returns 200', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${assetId}/patch-recommendations`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('401 on sub-resource without token', async () => {
    const res = await getAgent().get(`/v1/assets/${assetId}/hardware`);
    expect(res.status).toBe(401);
  });
});
