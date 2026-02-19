// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

describe('Settings - Users List', () => {
  it('GET /v1/settings/users returns paginated list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/settings/users returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/users');
    expect(res.status).toBe(401);
  });

  it('GET /v1/settings/users filters by status', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get('/v1/settings/users?status=Active')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Settings - Users CRUD', () => {
  let createdUserId = null;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'inttest-' } } });
  });

  it('POST /v1/settings/users creates a user', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'inttest-newuser@example.com',
        name: 'INTTEST User',
        password: 'Password123!',
        role: 'user',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('inttest-newuser@example.com');
    createdUserId = res.body.data.id;
  });

  it('POST /v1/settings/users returns 400 with invalid email', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-an-email', name: 'Bad User' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/settings/users returns 400 with missing name', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'inttest-noname@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/users/:id returns user', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/users/${createdUserId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdUserId);
    expect(res.body.data.email).toBe('inttest-newuser@example.com');
  });

  it('GET /v1/settings/users/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/users/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /v1/settings/users/:id updates user', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/users/${createdUserId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST Updated Name');
  });

  it('GET /v1/settings/users/:id/audit-log returns logs', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/users/${createdUserId}/audit-log`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/settings/users/:id/suspend suspends user', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/users/${createdUserId}/suspend`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // verify the user is actually suspended (isActive = false)
    const user = await prisma.user.findUnique({ where: { id: createdUserId } });
    expect(user.isActive).toBe(false);
  });

  it('POST /v1/settings/users/:id/activate activates user', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/users/${createdUserId}/activate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const user = await prisma.user.findUnique({ where: { id: createdUserId } });
    expect(user.isActive).toBe(true);
  });

  it('POST /v1/settings/users/:id/reset-password sends reset', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /v1/settings/users/:id deletes user', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/users/${createdUserId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdUserId = null;
  });
});

describe('Settings - Users Invite', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'inttest-invite' } } });
  });

  it('POST /v1/settings/users/invite sends invite', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/users/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'inttest-invite@example.com',
        name: 'INTTEST Invite',
        role: 'user',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/settings/users/invite returns 400 with invalid email', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/users/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-valid', role: 'user' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Settings - Users Bulk Actions', () => {
  let user1Id = null;
  let user2Id = null;

  beforeAll(async () => {
    const adminToken = await getAdminToken();
    const agent = getAgent();

    const r1 = await agent
      .post('/v1/settings/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'inttest-bulk1@example.com', name: 'INTTEST Bulk1', role: 'user' });
    user1Id = r1.body.data.id;

    const r2 = await agent
      .post('/v1/settings/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'inttest-bulk2@example.com', name: 'INTTEST Bulk2', role: 'user' });
    user2Id = r2.body.data.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'inttest-bulk' } } });
  });

  it('POST /v1/settings/users/bulk-suspend suspends multiple users', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/users/bulk-suspend')
      .set('Authorization', `Bearer ${token}`)
      .send({ userIds: [user1Id, user2Id] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/settings/users/bulk-activate activates multiple users', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/users/bulk-activate')
      .set('Authorization', `Bearer ${token}`)
      .send({ userIds: [user1Id, user2Id] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/settings/users/bulk-delete deletes multiple users', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/users/bulk-delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ userIds: [user1Id, user2Id] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    user1Id = null;
    user2Id = null;
  });

  it('POST /v1/settings/users/bulk-suspend returns 400 with empty array', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/users/bulk-suspend')
      .set('Authorization', `Bearer ${token}`)
      .send({ userIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Settings - Roles CRUD', () => {
  let createdRoleId = null;

  beforeAll(async () => {
    await prisma.role.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  afterAll(async () => {
    await prisma.role.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/roles returns roles list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/roles').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/settings/roles returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/roles');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/roles creates a role', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'INTTEST-Role-1',
        description: 'Integration test role',
        permissions: {
          assets: { view: true, add: false, edit: false, delete: false },
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Role-1');
    createdRoleId = res.body.data.id;
  });

  it('POST /v1/settings/roles returns 400 with missing name', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/roles/:id returns role', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdRoleId);
    expect(res.body.data.name).toBe('INTTEST-Role-1');
  });

  it('GET /v1/settings/roles/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/roles/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /v1/settings/roles/:id updates role', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Role-Updated', description: 'Updated desc' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Role-Updated');
  });

  it('PUT /v1/settings/roles/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/roles/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Ghost-Role' });
    expect(res.status).toBe(404);
  });

  it('DELETE /v1/settings/roles/:id deletes role', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/roles/${createdRoleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdRoleId = null;
  });

  it('DELETE /v1/settings/roles/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/roles/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
