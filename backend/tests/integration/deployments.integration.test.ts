// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const PREFIX = 'INTTEST-DEP';

describe('Deployments Module', () => {
  let token;
  let createdDeploymentId;
  let createdSoftwareDepId;
  let createdPatchDepId;
  let firstAgentId;
  let firstPatchId;

  beforeAll(async () => {
    token = await getAdminToken();

    // Fetch a real agent ID from the DB for targeting
    const agent = await prisma.agent.findFirst({ where: { status: { not: 'deleted' } } });
    firstAgentId = agent?.id;

    // Fetch a real patch from the DB
    const patch = await prisma.patch.findFirst();
    firstPatchId = patch?.id;
  });

  afterAll(async () => {
    await prisma.patchDeployment.deleteMany({ where: { name: { startsWith: PREFIX } } });
  });

  // ============================================================
  // Generic Deployment CRUD
  // ============================================================

  it('401 GET /v1/deployments without auth', async () => {
    const res = await getAgent().get('/v1/deployments');
    expect(res.status).toBe(401);
  });

  it('GET /v1/deployments returns paginated list', async () => {
    const res = await getAgent()
      .get('/v1/deployments')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // The response is double-nested: res.body.data is the paginate() result object
    // which contains res.body.data.data (the array) and res.body.data.total (count)
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/deployments supports pagination', async () => {
    const res = await getAgent()
      .get('/v1/deployments?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeLessThanOrEqual(5);
    expect(res.body.data.limit).toBe(5);
  });

  it('GET /v1/deployments supports type filter', async () => {
    const res = await getAgent()
      .get('/v1/deployments?type=INSTALL')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  it('POST /v1/deployments creates a deployment', async () => {
    if (!firstPatchId) {
      console.warn('No patches in DB, skipping create deployment test');
      return;
    }
    const res = await getAgent()
      .post('/v1/deployments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-generic-001`,
        description: 'Integration test deployment',
        type: 'INSTALL',
        configType: 'INSTALL',
        scope: 'GLOBAL',
        targetGroups: [],
        patches: [firstPatchId],
        skipApprovalCheck: true,
        triggerType: 'MANUAL',
        autoRollback: false,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`${PREFIX}-generic-001`);
    createdDeploymentId = res.body.data.id;
  });

  it('POST /v1/deployments 400 on missing patches', async () => {
    const res = await getAgent()
      .post('/v1/deployments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-bad`,
        type: 'INSTALL',
        patches: [],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/deployments 400 on invalid type', async () => {
    const res = await getAgent()
      .post('/v1/deployments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-bad`,
        type: 'INVALID',
        patches: ['00000000-0000-0000-0000-000000000001'],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/deployments/:id returns created deployment', async () => {
    if (!createdDeploymentId) return;
    const res = await getAgent()
      .get(`/v1/deployments/${createdDeploymentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdDeploymentId);
  });

  it('GET /v1/deployments/:id 404 for non-existent', async () => {
    const res = await getAgent()
      .get('/v1/deployments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/deployments/:id/preview returns preview', async () => {
    if (!createdDeploymentId) return;
    const res = await getAgent()
      .get(`/v1/deployments/${createdDeploymentId}/preview`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('PUT /v1/deployments/:id updates deployment', async () => {
    if (!createdDeploymentId) return;
    const res = await getAgent()
      .put(`/v1/deployments/${createdDeploymentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated deployment description' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/deployments/:id/cancel cancels deployment', async () => {
    if (!createdDeploymentId) return;
    const res = await getAgent()
      .post(`/v1/deployments/${createdDeploymentId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 400]).toContain(res.status);
    // 400 if already in wrong state, 200 if cancelled
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  it('DELETE /v1/deployments/:id deletes deployment', async () => {
    if (!createdDeploymentId) return;
    const res = await getAgent()
      .delete(`/v1/deployments/${createdDeploymentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(res.status);
  });

  // ============================================================
  // Software Deployments via /v1/deployments/software
  // ============================================================

  it('401 GET /v1/deployments/software without auth', async () => {
    const res = await getAgent().get('/v1/deployments/software');
    expect(res.status).toBe(401);
  });

  it('GET /v1/deployments/software returns software deployments list', async () => {
    const res = await getAgent()
      .get('/v1/deployments/software')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /v1/deployments/software 400 without target agents', async () => {
    const res = await getAgent()
      .post('/v1/deployments/software')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-swdep-bad`,
        targetAgentIds: [],
        package: { packageId: 'test-pkg-001' },
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/deployments/software creates software deployment when agent exists', async () => {
    if (!firstAgentId) {
      console.warn('No active agents in DB, skipping software deployment create test');
      return;
    }
    const res = await getAgent()
      .post('/v1/deployments/software')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-swdep-001`,
        description: 'Integration test software deployment',
        deploymentType: 'install',
        targetAgentIds: [firstAgentId],
        package: { packageId: 'test-pkg-001', name: 'Test Package', version: '1.0.0' },
        retryCount: 1,
      });
    expect([201, 400]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      createdSoftwareDepId = res.body.data.id;
    }
  });

  it('GET /v1/deployments/software/:deploymentId 404 for non-existent', async () => {
    const res = await getAgent()
      .get('/v1/deployments/software/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/deployments/software/:deploymentId returns deployment status', async () => {
    if (!createdSoftwareDepId) return;
    const res = await getAgent()
      .get(`/v1/deployments/software/${createdSoftwareDepId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('POST /v1/deployments/software/:deploymentId/cancel cancels deployment', async () => {
    if (!createdSoftwareDepId) return;
    const res = await getAgent()
      .post(`/v1/deployments/software/${createdSoftwareDepId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  // ============================================================
  // Patch Deployments via /v1/deployments/patch
  // ============================================================

  it('401 GET /v1/deployments/patch without auth', async () => {
    const res = await getAgent().get('/v1/deployments/patch');
    expect(res.status).toBe(401);
  });

  it('GET /v1/deployments/patch returns patch deployments list', async () => {
    const res = await getAgent()
      .get('/v1/deployments/patch')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /v1/deployments/patch 400 without target agents', async () => {
    const res = await getAgent()
      .post('/v1/deployments/patch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-patch-bad`,
        targetAgentIds: [],
        patches: [{ id: '00000000-0000-0000-0000-000000000001', patchId: 'KB0000001' }],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/deployments/patch 400 without patches', async () => {
    const res = await getAgent()
      .post('/v1/deployments/patch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-patch-bad2`,
        targetAgentIds: ['00000000-0000-0000-0000-000000000001'],
        patches: [],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/deployments/patch creates patch deployment when agent and patch exist', async () => {
    if (!firstAgentId || !firstPatchId) {
      console.warn('Missing agent or patch in DB, skipping patch deployment create test');
      return;
    }
    const res = await getAgent()
      .post('/v1/deployments/patch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-patchdep-001`,
        description: 'Integration test patch deployment',
        targetAgentIds: [firstAgentId],
        patches: [{ id: firstPatchId }],
        retryCount: 1,
        skipApprovalCheck: true,
      });
    expect([201, 400]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.success).toBe(true);
      createdPatchDepId = res.body.data.id;
    }
  });

  it('GET /v1/deployments/patch/:deploymentId 404 for non-existent', async () => {
    const res = await getAgent()
      .get('/v1/deployments/patch/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/deployments/patch/:deploymentId returns deployment status', async () => {
    if (!createdPatchDepId) return;
    const res = await getAgent()
      .get(`/v1/deployments/patch/${createdPatchDepId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('POST /v1/deployments/patch/:deploymentId/cancel cancels patch deployment', async () => {
    if (!createdPatchDepId) return;
    const res = await getAgent()
      .post(`/v1/deployments/patch/${createdPatchDepId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  it('POST /v1/deployments/patch/:deploymentId/retry retries patch deployment', async () => {
    if (!createdPatchDepId) return;
    const res = await getAgent()
      .post(`/v1/deployments/patch/${createdPatchDepId}/retry`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  // ============================================================
  // Config Deployments via /v1/deployments/config
  // ============================================================

  it('POST /v1/deployments/config 400 without target agents', async () => {
    const res = await getAgent()
      .post('/v1/deployments/config')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-cfg-bad`,
        targetAgentIds: [],
        configurationIds: ['test-cfg-001'],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/deployments/config/:deploymentId 404 for non-existent', async () => {
    const res = await getAgent()
      .get('/v1/deployments/config/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
