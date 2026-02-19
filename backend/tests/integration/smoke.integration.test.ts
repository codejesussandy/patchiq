import { getAgent, getAdminToken } from './test-setup';

describe('Smoke Test', () => {
  it('health endpoint returns ok', async () => {
    const agent = getAgent();
    const res = await agent.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('admin can login and get token', async () => {
    const token = await getAdminToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  it('GET /v1/user/me with admin token', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get('/v1/user/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@patchiq.io');
  });
});
