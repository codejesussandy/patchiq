// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

// ============================================
// Alert Configurations
// ============================================
describe('Settings - Alert Configurations', () => {
  let createdAlertId = null;

  afterAll(async () => {
    // AlertConfig stores name in JSON config field; clean up by type prefix in config (best effort)
    // We track createdAlertId and null it on delete; extra cleanup if tests failed mid-run
    const all = await prisma.alertConfig.findMany();
    const testIds = all
      .filter((a: any) => {
        const cfg = (a.config || {}) as Record<string, unknown>;
        return typeof cfg.name === 'string' && cfg.name.startsWith('INTTEST-');
      })
      .map((a: any) => a.id);
    if (testIds.length > 0) {
      await prisma.alertConfig.deleteMany({ where: { id: { in: testIds } } });
    }
  });

  it('GET /v1/settings/alerts returns list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/alerts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/settings/alerts returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/alerts');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/alerts creates an alert config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'INTTEST-Alert-1',
        type: 'threshold',
        enabled: true,
        severity: 'WARNING',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Alert-1');
    createdAlertId = res.body.data.id;
  });

  it('POST /v1/settings/alerts returns 400 with missing name', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'threshold' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/settings/alerts returns 400 with invalid type', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/alerts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Bad-Alert', type: 'invalid_type' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/settings/alerts returns 401 without token', async () => {
    const res = await getAgent()
      .post('/v1/settings/alerts')
      .send({ name: 'INTTEST-Alert-Unauth', type: 'threshold' });
    expect(res.status).toBe(401);
  });

  it('GET /v1/settings/alerts/:id returns alert config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/alerts/${createdAlertId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdAlertId);
  });

  it('GET /v1/settings/alerts/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/alerts/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('GET /v1/settings/alerts/:id returns 401 without token', async () => {
    const res = await getAgent().get(`/v1/settings/alerts/${FAKE_UUID}`);
    expect(res.status).toBe(401);
  });

  it('PUT /v1/settings/alerts/:id updates alert config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/alerts/${createdAlertId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Alert-Updated', severity: 'CRITICAL' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Alert-Updated');
  });

  it('PUT /v1/settings/alerts/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/alerts/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Alert-NonExistent' });
    expect(res.status).toBe(404);
  });

  it('PUT /v1/settings/alerts/:id returns 401 without token', async () => {
    const res = await getAgent()
      .put(`/v1/settings/alerts/${FAKE_UUID}`)
      .send({ name: 'INTTEST-Alert-Unauth' });
    expect(res.status).toBe(401);
  });

  it('DELETE /v1/settings/alerts/:id deletes alert config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/alerts/${createdAlertId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    createdAlertId = null;
  });

  it('DELETE /v1/settings/alerts/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/alerts/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('DELETE /v1/settings/alerts/:id returns 401 without token', async () => {
    const res = await getAgent().delete(`/v1/settings/alerts/${FAKE_UUID}`);
    expect(res.status).toBe(401);
  });
});
