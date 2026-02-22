// @ts-nocheck
/**
 * Integration tests for /v1/zero-touch-configs endpoints
 */
import { getAgent, getAdminToken, prisma } from './test-setup';

const BASE = '/v1/zero-touch-configs';
const NULL_UUID = '00000000-0000-0000-0000-000000000000';
const TS = Date.now();

function testName(suffix: string) {
  return `INTTEST-${suffix}-${TS}`;
}

async function cleanTestData() {
  await prisma.zeroTouchConfig.deleteMany({
    where: { name: { startsWith: 'INTTEST-' } },
  }).catch(() => {});
}

let adminToken: string;
let agent: ReturnType<typeof getAgent>;
let createdConfigId: string;

beforeAll(async () => {
  agent = getAgent();
  adminToken = await getAdminToken();
});

afterAll(async () => {
  await cleanTestData();
});

// ============================================
// Auth Guard
// ============================================

describe('Zero Touch Configs - Auth', () => {
  it('GET /v1/zero-touch-configs returns 401 without token', async () => {
    const res = await agent.get(BASE);
    expect(res.status).toBe(401);
  });

  it('POST /v1/zero-touch-configs returns 401 without token', async () => {
    const res = await agent.post(BASE).send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('GET /v1/zero-touch-configs/:id returns 401 without token', async () => {
    const res = await agent.get(`${BASE}/${NULL_UUID}`);
    expect(res.status).toBe(401);
  });

  it('PUT /v1/zero-touch-configs/:id returns 401 without token', async () => {
    const res = await agent.put(`${BASE}/${NULL_UUID}`).send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('DELETE /v1/zero-touch-configs/:id returns 401 without token', async () => {
    const res = await agent.delete(`${BASE}/${NULL_UUID}`);
    expect(res.status).toBe(401);
  });
});

// ============================================
// List Zero Touch Configs
// ============================================

describe('GET /v1/zero-touch-configs', () => {
  it('returns paginated list of configs', async () => {
    const res = await agent
      .get(BASE)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('supports pagination params', async () => {
    const res = await agent
      .get(`${BASE}?page=1&limit=5`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 for limit exceeding 100', async () => {
    const res = await agent
      .get(`${BASE}?limit=200`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

// ============================================
// Create Zero Touch Config
// ============================================

describe('POST /v1/zero-touch-configs', () => {
  it('creates a zero touch config with required fields', async () => {
    const res = await agent
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testName('ZTC-Create'),
        autoDeploymentRules: {
          severity: ['CRITICAL', 'HIGH'],
          approvalRequired: false,
          schedule: '0 2 * * *',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();

    createdConfigId = res.body.data.id;
  });

  it('creates a zero touch config with all optional fields', async () => {
    const res = await agent
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testName('ZTC-Full'),
        description: 'Full integration test config',
        applicationType: 'ALL',
        applications: [],
        scope: 'ALL_COMPUTERS',
        computers: [],
        groups: [],
        autoDeploymentRules: {
          severity: ['MEDIUM'],
          approvalRequired: true,
          schedule: '0 3 * * 0',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.description).toBe('Full integration test config');
  });

  it('returns 400 when name is missing', async () => {
    const res = await agent
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        autoDeploymentRules: {
          severity: ['CRITICAL'],
          approvalRequired: false,
          schedule: '0 2 * * *',
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when autoDeploymentRules is missing', async () => {
    const res = await agent
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testName('ZTC-NoRules'),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when autoDeploymentRules.severity is empty', async () => {
    const res = await agent
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testName('ZTC-EmptySeverity'),
        autoDeploymentRules: {
          severity: [],
          approvalRequired: false,
          schedule: '0 2 * * *',
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
  it('returns config by valid UUID', async () => {
    const res = await agent
      .get(`${BASE}/${createdConfigId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdConfigId);
  });

  it('returns 404 for non-existent config UUID', async () => {
    const res = await agent
      .get(`${BASE}/${NULL_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid UUID format', async () => {
    const res = await agent
      .get(`${BASE}/not-a-uuid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Update Zero Touch Config
// ============================================

describe('PUT /v1/zero-touch-configs/:id', () => {
  it('updates config fields', async () => {
    const res = await agent
      .put(`${BASE}/${createdConfigId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testName('ZTC-Updated'),
        description: 'Updated description',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(testName('ZTC-Updated'));
  });

  it('returns 404 when updating non-existent config', async () => {
    const res = await agent
      .put(`${BASE}/${NULL_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: testName('ZTC-Ghost') });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid UUID format', async () => {
    const res = await agent
      .put(`${BASE}/not-a-uuid`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: testName('ZTC-BadId') });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Delete Zero Touch Config
// ============================================

describe('DELETE /v1/zero-touch-configs/:id', () => {
  it('deletes an existing config', async () => {
    // Create a disposable config
    const createRes = await agent
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testName('ZTC-ToDelete'),
        autoDeploymentRules: {
          severity: ['LOW'],
          approvalRequired: false,
          schedule: '0 4 * * *',
        },
      });

    expect(createRes.status).toBe(201);
    const deleteId = createRes.body.data.id;

    const deleteRes = await agent
      .delete(`${BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 204]).toContain(deleteRes.status);

    // Verify it's gone
    const getRes = await agent
      .get(`${BASE}/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when deleting non-existent config', async () => {
    const res = await agent
      .delete(`${BASE}/${NULL_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid UUID format', async () => {
    const res = await agent
      .delete(`${BASE}/not-a-uuid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
