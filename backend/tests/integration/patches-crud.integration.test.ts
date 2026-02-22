/**
 * Integration tests: Patches CRUD
 * Covers: list, create, get, update, delete, filtering, auth
 */

import { getAgent, getAdminToken, prisma } from './test-setup';

const BASE = '/v1/patches';
const TS = Date.now();

let createdPatchId: string;
let createdPatchDbId: string;

afterAll(async () => {
  // Cleanup test patches
  await prisma.patch.deleteMany({
    where: { patchId: { startsWith: 'INTTEST-' } },
  });
});

// ============================================
// Auth Guard
// ============================================

describe('Patches - Auth', () => {
  it('GET /v1/patches returns 401 without token', async () => {
    const res = await getAgent().get(BASE);
    expect(res.status).toBe(401);
  });

  it('POST /v1/patches returns 401 without token', async () => {
    const res = await getAgent().post(BASE).send({ software: 'Test' });
    expect(res.status).toBe(401);
  });
});

// ============================================
// List Patches
// ============================================

describe('GET /v1/patches', () => {
  it('returns paginated list of patches', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(BASE)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // paginate() returns { success, data, total, page, limit, totalPages }
    // which is wrapped by sendSuccess into { success: true, data: <paginate result> }
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.page).toBe('number');
    expect(typeof res.body.data.limit).toBe('number');
    expect(typeof res.body.data.totalPages).toBe('number');
  });

  it('returns filtered list by severity', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${BASE}?severity=CRITICAL`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const patch of res.body.data.data) {
      expect(patch.severity).toBe('CRITICAL');
    }
  });

  it('supports pagination params', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${BASE}?page=1&limit=5`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeLessThanOrEqual(5);
    expect(res.body.data.limit).toBe(5);
    expect(res.body.data.page).toBe(1);
  });

  it('supports search filter', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${BASE}?search=windows`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  it('returns 400 for invalid limit (exceeds 100)', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${BASE}?limit=200`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ============================================
// Create Patch
// ============================================

describe('POST /v1/patches', () => {
  it('creates a patch with minimal required fields', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        software: `INTTEST-Software-${TS}`,
        title: `INTTEST-Title-${TS}`,
        severity: 'HIGH',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.software).toBe(`INTTEST-Software-${TS}`);
    expect(res.body.data.severity).toBe('HIGH');
    expect(res.body.data.id).toBeDefined();

    createdPatchDbId = res.body.data.id;
    createdPatchId = res.body.data.patchId;
  });

  it('creates a patch with all optional fields', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        software: `INTTEST-Full-${TS}`,
        title: `INTTEST-Full-Title-${TS}`,
        description: 'Integration test patch',
        severity: 'MEDIUM',
        category: 'Security',
        vendor: 'Microsoft',
        product: 'Windows',
        os: 'WINDOWS',
        rebootRequired: true,
        supportUninstallation: true,
        tags: ['test', 'integration'],
        cveNumbers: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.vendor).toBe('Microsoft');
    expect(res.body.data.rebootRequired).toBe(true);
    expect(res.body.data.tags).toContain('test');
  });

  it('returns 400 when software is missing', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No software field' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid severity enum', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ software: 'Test', severity: 'INVALID_SEVERITY' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Get Patch by ID
// ============================================

describe('GET /v1/patches/:id', () => {
  it('returns a patch by valid UUID', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${BASE}/${createdPatchDbId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdPatchDbId);
    expect(res.body.data.software).toBeDefined();
  });

  it('returns 404 for non-existent patch UUID', async () => {
    const token = await getAdminToken();
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await getAgent()
      .get(`${BASE}/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid UUID format', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${BASE}/not-a-uuid`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Update Patch
// ============================================

describe('PUT /v1/patches/:id', () => {
  it('updates patch fields', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .put(`${BASE}/${createdPatchDbId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `INTTEST-Updated-${TS}`,
        severity: 'LOW',
        description: 'Updated description',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe(`INTTEST-Updated-${TS}`);
    expect(res.body.data.severity).toBe('LOW');
  });

  it('returns 404 when updating non-existent patch', async () => {
    const token = await getAdminToken();
    const fakeId = '00000000-0000-0000-0000-000000000002';
    const res = await getAgent()
      .put(`${BASE}/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test' });

    expect(res.status).toBe(404);
  });
});

// ============================================
// Test-Approve View
// ============================================

describe('GET /v1/patches/test-approve', () => {
  it('returns paginated list of patches pending test/approval', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${BASE}/test-approve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('filters by PENDING_TEST status', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${BASE}/test-approve?status=PENDING_TEST`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const patch of res.body.data.data) {
      expect(patch.testStatus).toBe('NOT_TESTED');
    }
  });

  it('filters by PENDING_APPROVAL status', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${BASE}/test-approve?status=PENDING_APPROVAL`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Delete Patch
// ============================================

describe('DELETE /v1/patches/:id', () => {
  it('deletes an existing patch and returns 204', async () => {
    const token = await getAdminToken();

    // Create a disposable patch
    const createRes = await getAgent()
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ software: `INTTEST-Delete-${TS}` });

    expect(createRes.status).toBe(201);
    const deleteId = createRes.body.data.id;

    const deleteRes = await getAgent()
      .delete(`${BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    // Verify it's gone
    const getRes = await getAgent()
      .get(`${BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting non-existent patch', async () => {
    const token = await getAdminToken();
    const fakeId = '00000000-0000-0000-0000-000000000003';
    const res = await getAgent()
      .delete(`${BASE}/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ============================================
// Stream Patch Bundle
// ============================================

describe('GET /v1/patches/:id/bundle/stream', () => {
  // This endpoint is public (no auth required) — agents download installers without credentials.
  it('INTTEST - returns 404 without token for non-existent patch (public endpoint)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await getAgent().get(`${BASE}/${fakeId}/bundle/stream`);
    // Public route: no 401 — returns 404 when no bundle record exists
    expect(res.status).toBe(404);
  });

  it('INTTEST - returns 404 for non-existent patch ID', async () => {
    const token = await getAdminToken();
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await getAgent()
      .get(`${BASE}/${fakeId}/bundle/stream`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('INTTEST - returns 404 when patch exists but has no bundle uploaded', async () => {
    const token = await getAdminToken();

    // Create a patch with no bundle
    const createRes = await getAgent()
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ software: `INTTEST-Bundle-${TS}`, title: `INTTEST-Bundle-Title-${TS}` });

    expect(createRes.status).toBe(201);
    const patchId = createRes.body.data.id;

    const res = await getAgent()
      .get(`${BASE}/${patchId}/bundle/stream`);

    expect(res.status).toBe(404);
    // Public endpoint returns { error: '...' } (not the standard { success, data } envelope)
    expect(res.body.error).toBeDefined();
  });
});
