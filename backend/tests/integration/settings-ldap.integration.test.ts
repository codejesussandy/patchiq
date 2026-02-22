// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

// ============================================
// LDAP Configurations
// ============================================
describe('Settings - LDAP Configurations', () => {
  let createdLdapId = null;
  let createdMappingId = null;
  let roleId = null;

  beforeAll(async () => {
    const role = await prisma.role.findFirst({ where: { isSystem: true } });
    if (role) {
      roleId = role.id;
    }
  });

  afterAll(async () => {
    await prisma.ldapGroupMapping.deleteMany({
      where: { ldapConfig: { name: { startsWith: 'INTTEST-' } } },
    });
    await prisma.ldapConfig.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/ldap-configs returns list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/ldap-configs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/settings/ldap-configs returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/ldap-configs');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/ldap-configs creates an LDAP config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/ldap-configs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'INTTEST-LDAP-1',
        host: 'ldap.example.com',
        port: 389,
        baseDN: 'dc=example,dc=com',
        username: 'cn=admin,dc=example,dc=com',
        password: 'secret',
        protocol: 'LDAP',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-LDAP-1');
    createdLdapId = res.body.data.id;
  });

  it('POST /v1/settings/ldap-configs returns 400 with missing required fields', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/ldap-configs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Bad-LDAP' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/settings/ldap-configs returns 401 without token', async () => {
    const res = await getAgent()
      .post('/v1/settings/ldap-configs')
      .send({ name: 'INTTEST-LDAP-Unauth', host: 'ldap.example.com', port: 389 });
    expect(res.status).toBe(401);
  });

  it('GET /v1/settings/ldap-configs/:id returns LDAP config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/ldap-configs/${createdLdapId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdLdapId);
  });

  it('GET /v1/settings/ldap-configs/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/ldap-configs/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('GET /v1/settings/ldap-configs/:id returns 401 without token', async () => {
    const res = await getAgent().get(`/v1/settings/ldap-configs/${FAKE_UUID}`);
    expect(res.status).toBe(401);
  });

  it('PUT /v1/settings/ldap-configs/:id updates LDAP config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/ldap-configs/${createdLdapId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-LDAP-Updated', port: 636, protocol: 'LDAPS' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-LDAP-Updated');
  });

  it('PUT /v1/settings/ldap-configs/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/ldap-configs/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-LDAP-NonExistent' });
    expect(res.status).toBe(404);
  });

  it('PUT /v1/settings/ldap-configs/:id returns 401 without token', async () => {
    const res = await getAgent()
      .put(`/v1/settings/ldap-configs/${FAKE_UUID}`)
      .send({ name: 'INTTEST-LDAP-Unauth' });
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/ldap-configs/:id/test returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/ldap-configs/${FAKE_UUID}/test`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('POST /v1/settings/ldap-configs/:id/test returns 401 without token', async () => {
    const res = await getAgent().post(`/v1/settings/ldap-configs/${FAKE_UUID}/test`);
    expect(res.status).toBe(401);
  });

  // ============================================
  // LDAP Group Mappings
  // ============================================

  it('GET /v1/settings/ldap-configs/:id/group-mappings returns list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/ldap-configs/${createdLdapId}/group-mappings`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/settings/ldap-configs/:id/group-mappings returns 401 without token', async () => {
    const res = await getAgent().get(`/v1/settings/ldap-configs/${createdLdapId}/group-mappings`);
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/ldap-configs/:id/group-mappings creates a mapping', async () => {
    expect(roleId).toBeDefined();
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/ldap-configs/${createdLdapId}/group-mappings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ldapGroupDn: 'cn=admins,dc=example,dc=com',
        roleId,
        priority: 100,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdMappingId = res.body.data.id;
  });

  it('POST /v1/settings/ldap-configs/:id/group-mappings returns 400 with missing fields', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/ldap-configs/${createdLdapId}/group-mappings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priority: 50 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/settings/ldap-configs/:id/group-mappings returns 401 without token', async () => {
    const res = await getAgent()
      .post(`/v1/settings/ldap-configs/${createdLdapId}/group-mappings`)
      .send({ ldapGroupDn: 'cn=test,dc=example,dc=com', roleId: FAKE_UUID });
    expect(res.status).toBe(401);
  });

  it('PUT /v1/settings/ldap-configs/:id/group-mappings/:mapId updates a mapping', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/ldap-configs/${createdLdapId}/group-mappings/${createdMappingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priority: 200 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/ldap-configs/:id/group-mappings/:mapId returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/ldap-configs/${createdLdapId}/group-mappings/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priority: 50 });
    expect(res.status).toBe(404);
  });

  it('DELETE /v1/settings/ldap-configs/:id/group-mappings/:mapId deletes a mapping', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/ldap-configs/${createdLdapId}/group-mappings/${createdMappingId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    createdMappingId = null;
  });

  it('DELETE /v1/settings/ldap-configs/:id/group-mappings/:mapId returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/ldap-configs/${createdLdapId}/group-mappings/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  // ============================================
  // LDAP Sync
  // ============================================

  it('POST /v1/settings/ldap-configs/:id/sync returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/ldap-configs/${FAKE_UUID}/sync`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('POST /v1/settings/ldap-configs/:id/sync triggers sync for existing config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/ldap-configs/${createdLdapId}/sync`)
      .set('Authorization', `Bearer ${token}`);
    // Should be 200/202 on success or 400/500 if LDAP is not reachable — either way not 404/401
    expect([200, 202, 400, 500]).toContain(res.status);
  });

  // ============================================
  // Cleanup: Delete LDAP config
  // ============================================

  it('DELETE /v1/settings/ldap-configs/:id deletes LDAP config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/ldap-configs/${createdLdapId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdLdapId = null;
  });

  it('DELETE /v1/settings/ldap-configs/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/ldap-configs/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('DELETE /v1/settings/ldap-configs/:id returns 401 without token', async () => {
    const res = await getAgent().delete(`/v1/settings/ldap-configs/${FAKE_UUID}`);
    expect(res.status).toBe(401);
  });
});
