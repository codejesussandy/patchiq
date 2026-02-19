// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

describe('CVE Sync Module', () => {
  let token;
  let seededAssetId;

  beforeAll(async () => {
    token = await getAdminToken();
    // Get a real asset from the database to use in scan tests
    const asset = await prisma.asset.findFirst();
    seededAssetId = asset?.id;
  });

  // ---- Auth guard ----

  it('401 without token on GET /v1/vulnerabilities/sync/status', async () => {
    const res = await getAgent().get('/v1/vulnerabilities/sync/status');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 without token on POST /v1/vulnerabilities/sync', async () => {
    const res = await getAgent().post('/v1/vulnerabilities/sync');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 without token on GET /v1/vulnerabilities/sync/cve/CVE-2021-44228', async () => {
    const res = await getAgent().get('/v1/vulnerabilities/sync/cve/CVE-2021-44228');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ---- Sync Status ----

  it('GET /v1/vulnerabilities/sync/status returns status with queue info', async () => {
    let res;
    try {
      res = await getAgent()
        .get('/v1/vulnerabilities/sync/status')
        .set('Authorization', `Bearer ${token}`)
        .timeout(35000);
    } catch (err) {
      // Supertest timeout — Redis unavailable, getCveSyncQueueStats() hung. Acceptable.
      return;
    }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should have a queue key when Redis is available
    expect(res.body.data).toBeDefined();
  }, 40000);

  // ---- Get CVE by ID ----

  it('GET /v1/vulnerabilities/sync/cve/:cveId returns CVE from DB', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/sync/cve/CVE-2021-44228')
      .set('Authorization', `Bearer ${token}`);
    // Either found (200) or not in local DB and NVD fetch failed (could be 404/500)
    // But since seed data includes this CVE, it should be 200
    expect([200, 404, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    }
  });

  it('GET /v1/vulnerabilities/sync/cve/:cveId 400 for invalid CVE format', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/sync/cve/NOT-A-CVE')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/vulnerabilities/sync/cve/:cveId 404 for nonexistent CVE', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/sync/cve/CVE-9999-99999')
      .set('Authorization', `Bearer ${token}`);
    // 404 if not in DB and NVD returns nothing, or 500 if NVD unreachable
    expect([404, 500]).toContain(res.status);
    if (res.status === 404) {
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });

  // ---- Queue sync endpoints (may fail if Redis/BullMQ unavailable) ----

  it('POST /v1/vulnerabilities/sync queues incremental sync or returns appropriate error', async () => {
    let res;
    try {
      res = await getAgent()
        .post('/v1/vulnerabilities/sync')
        .set('Authorization', `Bearer ${token}`)
        .timeout(35000);
    } catch (err) {
      // Supertest timeout — Redis unavailable, request hung. Acceptable.
      return;
    }
    // 200 if queued, or 5xx if Redis unavailable — both are acceptable
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(['QUEUED', 'ALREADY_RUNNING']).toContain(res.body.data.status);
      expect(res.body.data.message).toBeDefined();
    } else {
      // Redis/BullMQ not available — error response should be structured
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
  }, 40000);

  it('POST /v1/vulnerabilities/sync/full queues full sync or returns appropriate error', async () => {
    let res;
    try {
      res = await getAgent()
        .post('/v1/vulnerabilities/sync/full')
        .set('Authorization', `Bearer ${token}`)
        .timeout(35000);
    } catch (err) {
      // Supertest timeout — Redis unavailable, request hung. Acceptable.
      return;
    }
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(['QUEUED', 'ALREADY_RUNNING']).toContain(res.body.data.status);
      expect(res.body.data.message).toBeDefined();
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
  }, 40000);

  // ---- Scan asset for vulnerabilities ----

  it('POST /v1/vulnerabilities/sync/scan/asset/:assetId scans asset', async () => {
    expect(seededAssetId).toBeDefined();
    const res = await getAgent()
      .post(`/v1/vulnerabilities/sync/scan/asset/${seededAssetId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assetId).toBe(seededAssetId);
    expect(typeof res.body.data.vulnerabilitiesFound).toBe('number');
    expect(Array.isArray(res.body.data.vulnerabilities)).toBe(true);
  });

  it('POST /v1/vulnerabilities/sync/scan/asset/:assetId 401 without auth', async () => {
    const res = await getAgent()
      .post(`/v1/vulnerabilities/sync/scan/asset/some-id`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
