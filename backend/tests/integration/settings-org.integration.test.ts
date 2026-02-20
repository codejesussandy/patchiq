// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

describe('Settings - Org Tree', () => {
  it('GET /v1/settings/org-tree returns tree', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/org-tree').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // org-tree returns an array directly (not paginated)
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/settings/org-tree returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/org-tree');
    expect(res.status).toBe(401);
  });
});

describe('Settings - Organizations CRUD', () => {
  let createdOrgId = null;

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/organizations returns paginated list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/organizations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // The service returns PaginatedResponse wrapped in sendSuccess data field
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/settings/organizations returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/organizations');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/organizations creates an organization', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Org-1', description: 'Integration test org' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Org-1');
    createdOrgId = res.body.data.id;
  });

  it('POST /v1/settings/organizations returns 400 with missing name', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/organizations/:id returns org', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdOrgId);
  });

  it('GET /v1/settings/organizations/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/organizations/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /v1/settings/organizations/:id updates org', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Org-Updated' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Org-Updated');
  });

  it('GET /v1/settings/organizations/:id/delete-impact returns impact', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/organizations/${createdOrgId}/delete-impact`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /v1/settings/organizations/:id deletes org', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdOrgId = null;
  });

  it('DELETE /v1/settings/organizations/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/organizations/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('Settings - Branches CRUD', () => {
  let createdBranchId = null;
  let defaultOrgId = null;

  beforeAll(async () => {
    const org = await prisma.organization.findFirst({ where: { isDefault: true } });
    expect(org).not.toBeNull();
    defaultOrgId = org.id;
  });

  afterAll(async () => {
    await prisma.branch.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/branches returns paginated list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/branches').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/settings/branches returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/branches');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/branches creates a branch', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/branches')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Branch-1', organizationId: defaultOrgId });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Branch-1');
    createdBranchId = res.body.data.id;
  });

  it('POST /v1/settings/branches returns 400 with missing organizationId', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/branches')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Branch-NoOrg' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/branches/:id returns branch', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/branches/${createdBranchId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdBranchId);
  });

  it('GET /v1/settings/branches/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/branches/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /v1/settings/branches/:id updates branch', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/branches/${createdBranchId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Branch-Updated', city: 'Mumbai' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Branch-Updated');
  });

  it('GET /v1/settings/branches/:id/delete-impact returns impact', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/branches/${createdBranchId}/delete-impact`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /v1/settings/branches/:id deletes branch', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/branches/${createdBranchId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdBranchId = null;
  });
});

describe('Settings - Departments CRUD', () => {
  let createdDeptId = null;
  let defaultBranchId = null;

  beforeAll(async () => {
    const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
    expect(branch).not.toBeNull();
    defaultBranchId = branch.id;
  });

  afterAll(async () => {
    await prisma.department.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/departments returns paginated list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/departments').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/settings/departments returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/departments');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/departments creates a department', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Dept-1', branchId: defaultBranchId });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Dept-1');
    createdDeptId = res.body.data.id;
  });

  it('POST /v1/settings/departments returns 400 with missing branchId', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Dept-NoBranch' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/departments/:id returns department', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/departments/${createdDeptId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdDeptId);
  });

  it('GET /v1/settings/departments/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/departments/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /v1/settings/departments/:id updates department', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/departments/${createdDeptId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Dept-Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('INTTEST-Dept-Updated');
  });

  it('GET /v1/settings/departments/:id/delete-impact returns impact', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/departments/${createdDeptId}/delete-impact`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /v1/settings/departments/:id deletes department', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/departments/${createdDeptId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdDeptId = null;
  });
});

describe('Settings - Locations CRUD', () => {
  let createdLocationId = null;

  afterAll(async () => {
    await prisma.location.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/locations returns paginated list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/locations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/settings/locations returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/locations');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/locations creates a location', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/locations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Location-1', city: 'Bangalore', country: 'India', timezone: 'Asia/Kolkata' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Location-1');
    createdLocationId = res.body.data.id;
  });

  it('POST /v1/settings/locations returns 400 with missing name', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/locations')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Mumbai' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/locations/:id returns location', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/locations/${createdLocationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdLocationId);
  });

  it('GET /v1/settings/locations/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/locations/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /v1/settings/locations/:id updates location', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/locations/${createdLocationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Location-Updated', country: 'India' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('INTTEST-Location-Updated');
  });

  it('GET /v1/settings/locations/:id/delete-impact returns impact', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/locations/${createdLocationId}/delete-impact`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /v1/settings/locations/:id deletes location', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/locations/${createdLocationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdLocationId = null;
  });
});
