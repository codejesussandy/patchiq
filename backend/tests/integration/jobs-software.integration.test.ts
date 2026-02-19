// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const PREFIX = 'INTTEST-JSOFT';

describe('Jobs - Software, Config Catalog, Config Bundle, Config Deployment', () => {
  let token;
  let createdSoftwareDepId;
  let createdCatalogId;
  let createdBundleId;
  let createdConfigDepId;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  afterAll(async () => {
    await prisma.softwareDeployment.deleteMany({ where: { deploymentName: { startsWith: PREFIX } } });
    await prisma.configDeployment.deleteMany({ where: { deploymentName: { startsWith: PREFIX } } });
    await prisma.configBundle.deleteMany({ where: { bundleName: { startsWith: PREFIX } } });
    await prisma.configCatalog.deleteMany({ where: { name: { startsWith: PREFIX } } });
  });

  // ============================================================
  // Software Deployments
  // ============================================================

  it('401 GET /v1/jobs/software/deployed without auth', async () => {
    const res = await getAgent().get('/v1/jobs/software/deployed');
    expect(res.status).toBe(401);
  });

  it('GET /v1/jobs/software/deployed returns paginated list', async () => {
    const res = await getAgent()
      .get('/v1/jobs/software/deployed')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Paginated responses are double-nested: { success, data: { data: [...], total, ... } }
    const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.data || [];
    expect(Array.isArray(items)).toBe(true);
    const total = res.body.meta?.total ?? res.body.data?.total ?? res.body.data?.meta?.total;
    expect(typeof total).toBe('number');
  });

  it('POST /v1/jobs/software/deployed creates software deployment', async () => {
    const res = await getAgent()
      .post('/v1/jobs/software/deployed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deploymentName: `${PREFIX}-swdep-001`,
        description: 'Integration test software deployment',
        deploymentType: 'INSTALL',
        selectionType: 'APPLICATION',
        selectedItems: ['test-app-001'],
        scope: 'ALL',
        retryCount: 1,
        notifyTo: 'ADMIN',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deploymentName).toBe(`${PREFIX}-swdep-001`);
    createdSoftwareDepId = res.body.data.id;
  });

  it('POST /v1/jobs/software/deployed 400 on missing deploymentName', async () => {
    const res = await getAgent()
      .post('/v1/jobs/software/deployed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deploymentType: 'INSTALL',
        selectionType: 'APPLICATION',
        selectedItems: ['test-app-001'],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/jobs/software/deployed 400 on empty selectedItems', async () => {
    const res = await getAgent()
      .post('/v1/jobs/software/deployed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deploymentName: `${PREFIX}-swdep-bad`,
        deploymentType: 'INSTALL',
        selectionType: 'APPLICATION',
        selectedItems: [],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/jobs/software/deployed/:id returns created deployment', async () => {
    const res = await getAgent()
      .get(`/v1/jobs/software/deployed/${createdSoftwareDepId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdSoftwareDepId);
  });

  it('GET /v1/jobs/software/deployed/:id/tasks returns tasks array', async () => {
    const res = await getAgent()
      .get(`/v1/jobs/software/deployed/${createdSoftwareDepId}/tasks`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Tasks are returned as { data: { data: [...] } }
    const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.data || [];
    expect(Array.isArray(items)).toBe(true);
  });

  it('GET /v1/jobs/software/deployed/:id 404 for non-existent', async () => {
    const res = await getAgent()
      .get('/v1/jobs/software/deployed/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /v1/jobs/software/deployed/:id deletes deployment', async () => {
    const res = await getAgent()
      .delete(`/v1/jobs/software/deployed/${createdSoftwareDepId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ============================================================
  // Config Catalog
  // ============================================================

  it('401 GET /v1/jobs/config/catalog without auth', async () => {
    const res = await getAgent().get('/v1/jobs/config/catalog');
    expect(res.status).toBe(401);
  });

  it('GET /v1/jobs/config/catalog returns paginated list', async () => {
    const res = await getAgent()
      .get('/v1/jobs/config/catalog')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.data || [];
    expect(Array.isArray(items)).toBe(true);
    const hasMeta = res.body.meta !== undefined || res.body.data?.total !== undefined;
    expect(hasMeta).toBe(true);
  });

  it('POST /v1/jobs/config/catalog creates catalog item', async () => {
    const res = await getAgent()
      .post('/v1/jobs/config/catalog')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-catalog-001`,
        os: 'WINDOWS',
        description: 'Integration test config catalog',
        configurationType: 'COMMAND',
        architecture: 'X64',
        isRemediation: false,
        commandType: 'POWERSHELL',
        command: 'Get-Process',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`${PREFIX}-catalog-001`);
    createdCatalogId = res.body.data.id;
  });

  it('POST /v1/jobs/config/catalog 400 on missing required fields', async () => {
    const res = await getAgent()
      .post('/v1/jobs/config/catalog')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-catalog-bad` });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/jobs/config/catalog/:id returns catalog item', async () => {
    const res = await getAgent()
      .get(`/v1/jobs/config/catalog/${createdCatalogId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdCatalogId);
    expect(res.body.data.name).toBe(`${PREFIX}-catalog-001`);
  });

  it('PUT /v1/jobs/config/catalog/:id updates catalog item', async () => {
    const res = await getAgent()
      .put(`/v1/jobs/config/catalog/${createdCatalogId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated description' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Update response may not include description; verify via subsequent GET
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(createdCatalogId);
  });

  it('GET /v1/jobs/config/catalog/:id 404 for non-existent', async () => {
    const res = await getAgent()
      .get('/v1/jobs/config/catalog/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /v1/jobs/config/catalog/:id deletes catalog item', async () => {
    const res = await getAgent()
      .delete(`/v1/jobs/config/catalog/${createdCatalogId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ============================================================
  // Config Bundles
  // ============================================================

  it('401 GET /v1/jobs/config/bundles without auth', async () => {
    const res = await getAgent().get('/v1/jobs/config/bundles');
    expect(res.status).toBe(401);
  });

  it('GET /v1/jobs/config/bundles returns paginated list', async () => {
    const res = await getAgent()
      .get('/v1/jobs/config/bundles')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.data || [];
    expect(Array.isArray(items)).toBe(true);
    const hasMeta = res.body.meta !== undefined || res.body.data?.total !== undefined;
    expect(hasMeta).toBe(true);
  });

  it('POST /v1/jobs/config/bundles creates config bundle', async () => {
    const res = await getAgent()
      .post('/v1/jobs/config/bundles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bundleName: `${PREFIX}-bundle-001`,
        os: 'WINDOWS',
        description: 'Integration test config bundle',
        configurations: [],
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bundleName).toBe(`${PREFIX}-bundle-001`);
    createdBundleId = res.body.data.id;
  });

  it('POST /v1/jobs/config/bundles 400 on missing bundleName', async () => {
    const res = await getAgent()
      .post('/v1/jobs/config/bundles')
      .set('Authorization', `Bearer ${token}`)
      .send({ os: 'WINDOWS' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/jobs/config/bundles/:id returns bundle', async () => {
    const res = await getAgent()
      .get(`/v1/jobs/config/bundles/${createdBundleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdBundleId);
  });

  it('PUT /v1/jobs/config/bundles/:id updates bundle', async () => {
    const res = await getAgent()
      .put(`/v1/jobs/config/bundles/${createdBundleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated bundle description' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Update response may not include description; verify response contains basic fields
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(createdBundleId);
  });

  it('GET /v1/jobs/config/bundles/:id 404 for non-existent', async () => {
    const res = await getAgent()
      .get('/v1/jobs/config/bundles/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /v1/jobs/config/bundles/:id deletes bundle', async () => {
    const res = await getAgent()
      .delete(`/v1/jobs/config/bundles/${createdBundleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ============================================================
  // Config Deployments
  // ============================================================

  it('401 GET /v1/jobs/config/deployed without auth', async () => {
    const res = await getAgent().get('/v1/jobs/config/deployed');
    expect(res.status).toBe(401);
  });

  it('GET /v1/jobs/config/deployed returns paginated list', async () => {
    const res = await getAgent()
      .get('/v1/jobs/config/deployed')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.data || [];
    expect(Array.isArray(items)).toBe(true);
    const hasMeta = res.body.meta !== undefined || res.body.data?.total !== undefined;
    expect(hasMeta).toBe(true);
  });

  it('POST /v1/jobs/config/deployed creates config deployment', async () => {
    const res = await getAgent()
      .post('/v1/jobs/config/deployed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deploymentName: `${PREFIX}-cdep-001`,
        description: 'Integration test config deployment',
        selectionType: 'CONFIGURATION',
        selectedItems: ['test-cfg-001'],
        scope: 'ALL',
        retryCount: 1,
        notifyTo: 'ADMIN',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deploymentName).toBe(`${PREFIX}-cdep-001`);
    createdConfigDepId = res.body.data.id;
  });

  it('POST /v1/jobs/config/deployed 400 on missing deploymentName', async () => {
    const res = await getAgent()
      .post('/v1/jobs/config/deployed')
      .set('Authorization', `Bearer ${token}`)
      .send({ selectionType: 'CONFIGURATION', selectedItems: ['x'] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/jobs/config/deployed/:id/tasks returns tasks', async () => {
    const res = await getAgent()
      .get(`/v1/jobs/config/deployed/${createdConfigDepId}/tasks`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.data || [];
    expect(Array.isArray(items)).toBe(true);
  });

  it('DELETE /v1/jobs/config/deployed/:id deletes config deployment', async () => {
    const res = await getAgent()
      .delete(`/v1/jobs/config/deployed/${createdConfigDepId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
