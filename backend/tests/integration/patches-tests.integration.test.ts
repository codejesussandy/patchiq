/**
 * Integration tests: Patch Tests & Zero Touch Configs
 * Covers: /v1/patch-tests CRUD, /v1/zero-touch-configs CRUD
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getAgent, getAdminToken, prisma } from './test-setup';

const TESTS_BASE = '/v1/patch-tests';
const ZTC_BASE = '/v1/zero-touch-configs';
const TS = Date.now();

afterAll(async () => {
  await prisma.patchTest.deleteMany({
    where: { name: { startsWith: 'INTTEST-' } },
  });
  await prisma.zeroTouchConfig.deleteMany({
    where: { name: { startsWith: 'INTTEST-' } },
  });
});

// ============================================
// Patch Tests Auth
// ============================================

describe('Patch Tests - Auth', () => {
  it('GET /v1/patch-tests returns 401 without token', async () => {
    const res = await getAgent().get(TESTS_BASE);
    expect(res.status).toBe(401);
  });

  it('POST /v1/patch-tests returns 401 without token', async () => {
    const res = await getAgent().post(TESTS_BASE).send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});

// ============================================
// List Patch Tests
// ============================================

describe('GET /v1/patch-tests', () => {
  it('returns paginated list', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(TESTS_BASE)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // paginate() wraps inside sendSuccess -> data.data is the array
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.page).toBe('number');
  });

  it('supports pagination params', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${TESTS_BASE}?page=1&limit=5`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeLessThanOrEqual(5);
    expect(res.body.data.limit).toBe(5);
  });
});

// ============================================
// Create Patch Test
// ============================================

describe('POST /v1/patch-tests', () => {
  it('creates a patch test with minimal fields', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(TESTS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-PatchTest-${TS}`,
        description: 'Integration test patch test config',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`INTTEST-PatchTest-${TS}`);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('PENDING');
  });

  it('creates a patch test with ALL scope', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(TESTS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-PatchTest-Full-${TS}`,
        applicationType: 'ALL',
        scope: 'ALL_COMPUTERS',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.applicationType).toBe('ALL');
    expect(res.body.data.scope).toBe('ALL_COMPUTERS');
  });

  it('returns 400 when name is missing', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(TESTS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name given' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when applicationType is INCLUDE but no applications given', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(TESTS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-Invalid-AppType-${TS}`,
        applicationType: 'INCLUDE',
        applications: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when scope is SCOPE but no computers given', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(TESTS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-Invalid-Scope-${TS}`,
        scope: 'SCOPE',
        computers: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Get Patch Test by ID
// ============================================

describe('GET /v1/patch-tests/:id', () => {
  let testId: string;

  beforeAll(async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(TESTS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `INTTEST-GetTest-${TS}` });
    expect(res.status).toBe(201);
    testId = res.body.data.id;
  });

  it('returns a patch test by ID', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${TESTS_BASE}/${testId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testId);
    expect(res.body.data.name).toBe(`INTTEST-GetTest-${TS}`);
  });

  it('returns 404 for non-existent patch test', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${TESTS_BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid UUID', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${TESTS_BASE}/not-a-uuid`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

// ============================================
// Approve Patch Test
// ============================================

describe('PUT /v1/patch-tests/:id/approve', () => {
  let testId: string;

  beforeAll(async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(TESTS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `INTTEST-ApproveTest-${TS}` });
    expect(res.status).toBe(201);
    testId = res.body.data.id;
  });

  it('approves a patch test', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .put(`${TESTS_BASE}/${testId}/approve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('returns 404 for non-existent patch test', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .put(`${TESTS_BASE}/00000000-0000-0000-0000-000000000099/approve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ============================================
// Delete Patch Test
// ============================================

describe('DELETE /v1/patch-tests/:id', () => {
  it('deletes a patch test and returns 204', async () => {
    const token = await getAdminToken();
    const createRes = await getAgent()
      .post(TESTS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `INTTEST-DeleteTest-${TS}` });
    expect(createRes.status).toBe(201);
    const deleteId = createRes.body.data.id;

    const deleteRes = await getAgent()
      .delete(`${TESTS_BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    const getRes = await getAgent()
      .get(`${TESTS_BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 for non-existent patch test', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .delete(`${TESTS_BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ============================================
// Zero Touch Config Auth
// ============================================

describe('Zero Touch Configs - Auth', () => {
  it('GET /v1/zero-touch-configs returns 401 without token', async () => {
    const res = await getAgent().get(ZTC_BASE);
    expect(res.status).toBe(401);
  });

  it('POST /v1/zero-touch-configs returns 401 without token', async () => {
    const res = await getAgent().post(ZTC_BASE).send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});

// ============================================
// List Zero Touch Configs
// ============================================

describe('GET /v1/zero-touch-configs', () => {
  it('returns paginated list', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(ZTC_BASE)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('supports status filter', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${ZTC_BASE}?status=ACTIVE`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    for (const config of res.body.data.data as any[]) {
      expect(config.status).toBe('ACTIVE');
    }
  });
});

// ============================================
// Create Zero Touch Config
// ============================================

describe('POST /v1/zero-touch-configs', () => {
  it('creates a zero touch config with required fields', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(ZTC_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-ZTC-${TS}`,
        description: 'Integration test zero touch config',
        autoDeploymentRules: {
          severity: ['CRITICAL', 'HIGH'],
          approvalRequired: true,
          schedule: 'IMMEDIATE',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`INTTEST-ZTC-${TS}`);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('creates config with INCLUDE application type', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(ZTC_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-ZTC-INCLUDE-${TS}`,
        applicationType: 'INCLUDE',
        applications: ['Chrome', 'Firefox'],
        autoDeploymentRules: {
          severity: ['MEDIUM'],
          approvalRequired: false,
          schedule: 'WEEKLY',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.applicationType).toBe('INCLUDE');
  });

  it('returns 400 when name is missing', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(ZTC_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        autoDeploymentRules: {
          severity: ['CRITICAL'],
          approvalRequired: true,
          schedule: 'DAILY',
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when autoDeploymentRules is missing', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(ZTC_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `INTTEST-ZTC-NoRules-${TS}` });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when autoDeploymentRules.severity is empty array', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(ZTC_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-ZTC-EmptySev-${TS}`,
        autoDeploymentRules: {
          severity: [],
          approvalRequired: true,
          schedule: 'DAILY',
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Get Zero Touch Config by ID
// ============================================

describe('GET /v1/zero-touch-configs/:id', () => {
  let configId: string;

  beforeAll(async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(ZTC_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-ZTC-Get-${TS}`,
        autoDeploymentRules: {
          severity: ['HIGH'],
          approvalRequired: true,
          schedule: 'DAILY',
        },
      });
    expect(res.status).toBe(201);
    configId = res.body.data.id;
  });

  it('returns a zero touch config by ID', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${ZTC_BASE}/${configId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(configId);
    expect(res.body.data.name).toBe(`INTTEST-ZTC-Get-${TS}`);
  });

  it('returns 404 for non-existent config', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${ZTC_BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Update Zero Touch Config
// ============================================

describe('PUT /v1/zero-touch-configs/:id', () => {
  let configId: string;

  beforeAll(async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(ZTC_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-ZTC-Update-${TS}`,
        autoDeploymentRules: {
          severity: ['HIGH'],
          approvalRequired: true,
          schedule: 'DAILY',
        },
      });
    expect(res.status).toBe(201);
    configId = res.body.data.id;
  });

  it('updates config name and status', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .put(`${ZTC_BASE}/${configId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-ZTC-Updated-${TS}`,
        status: 'INACTIVE',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`INTTEST-ZTC-Updated-${TS}`);
    expect(res.body.data.status).toBe('INACTIVE');
  });

  it('returns 404 for non-existent config', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .put(`${ZTC_BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'test' });

    expect(res.status).toBe(404);
  });
});

// ============================================
// Delete Zero Touch Config
// ============================================

describe('DELETE /v1/zero-touch-configs/:id', () => {
  it('deletes a zero touch config and returns 204', async () => {
    const token = await getAdminToken();
    const createRes = await getAgent()
      .post(ZTC_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `INTTEST-ZTC-Delete-${TS}`,
        autoDeploymentRules: {
          severity: ['LOW'],
          approvalRequired: false,
          schedule: 'MONTHLY',
        },
      });
    expect(createRes.status).toBe(201);
    const deleteId = createRes.body.data.id;

    const deleteRes = await getAgent()
      .delete(`${ZTC_BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    const getRes = await getAgent()
      .get(`${ZTC_BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting non-existent config', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .delete(`${ZTC_BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
