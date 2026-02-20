/**
 * Integration tests: RBAC (Role-Based Access Control)
 * Verifies that non-admin users cannot access admin-restricted endpoints.
 * Uses demo@patchiq.io (role: 'user') to test permission boundaries.
 */

import { getAgent, getUserToken, getAdminToken } from './test-setup';

describe('RBAC - Non-admin user access restrictions', () => {
  let userToken: string | null;
  let adminToken: string | null;

  beforeAll(async () => {
    userToken = await getUserToken();
    adminToken = await getAdminToken();
  });

  it('admin can access DELETE /v1/agents/:id (baseline)', async () => {
    const res = await getAgent()
      .delete('/v1/agents/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    // 404 expected (agent doesn't exist), but NOT 403
    expect(res.status).not.toBe(403);
  });

  it('non-admin gets 403 on DELETE /v1/agents/:id', async () => {
    const res = await getAgent()
      .delete('/v1/agents/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('non-admin gets 403 on POST /v1/settings/users/invite', async () => {
    const res = await getAgent()
      .post('/v1/settings/users/invite')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'test@example.com', roleId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('non-admin gets 403 on PUT /v1/settings/server', async () => {
    const res = await getAgent()
      .put('/v1/settings/server')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ serverName: 'test' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('non-admin gets 403 on DELETE /v1/patches/:id', async () => {
    const res = await getAgent()
      .delete('/v1/patches/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('non-admin gets 403 on POST /v1/discovery/ip-ranges', async () => {
    const res = await getAgent()
      .post('/v1/discovery/ip-ranges')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'INTTEST-range', startIp: '10.0.0.1', endIp: '10.0.0.255' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
