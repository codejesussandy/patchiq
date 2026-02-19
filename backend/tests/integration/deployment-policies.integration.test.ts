// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const PREFIX = 'INTTEST-DPOL';

describe('Deployment Policies', () => {
  let token;
  let createdPolicyId;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  afterAll(async () => {
    await prisma.deploymentPolicy.deleteMany({ where: { name: { startsWith: PREFIX } } });
  });

  it('401 GET /v1/deployment-policies without auth', async () => {
    const res = await getAgent().get('/v1/deployment-policies');
    expect(res.status).toBe(401);
  });

  it('GET /v1/deployment-policies returns paginated list with seed policies', async () => {
    const res = await getAgent()
      .get('/v1/deployment-policies')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Response is { success, data: { data: [...], total, page, limit, totalPages } }
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(res.body.data.total).toBeGreaterThanOrEqual(5);
  });

  it('GET /v1/deployment-policies supports pagination', async () => {
    const res = await getAgent()
      .get('/v1/deployment-policies?page=1&limit=3')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeLessThanOrEqual(3);
    expect(res.body.data.limit).toBe(3);
  });

  it('GET /v1/deployment-policies supports type filter', async () => {
    const res = await getAgent()
      .get('/v1/deployment-policies?type=INSTANT')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    res.body.data.data.forEach((policy) => {
      expect(policy.type).toBe('INSTANT');
    });
  });

  it('POST /v1/deployment-policies creates a deployment policy', async () => {
    const res = await getAgent()
      .post('/v1/deployment-policies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-policy-001`,
        description: 'Integration test deployment policy',
        type: 'INSTANT',
        supportedModule: 'ALL',
        relatedType: 'NO_RELATION',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`${PREFIX}-policy-001`);
    expect(res.body.data.type).toBe('INSTANT');
    createdPolicyId = res.body.data.id;
  });

  it('POST /v1/deployment-policies 400 on missing name', async () => {
    const res = await getAgent()
      .post('/v1/deployment-policies')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'INSTANT' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/deployment-policies 400 on invalid type', async () => {
    const res = await getAgent()
      .post('/v1/deployment-policies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-bad`, type: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/deployment-policies/:id returns created policy', async () => {
    const res = await getAgent()
      .get(`/v1/deployment-policies/${createdPolicyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdPolicyId);
    expect(res.body.data.name).toBe(`${PREFIX}-policy-001`);
  });

  it('GET /v1/deployment-policies/:id 404 for non-existent', async () => {
    const res = await getAgent()
      .get('/v1/deployment-policies/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /v1/deployment-policies/:id updates policy', async () => {
    const res = await getAgent()
      .put(`/v1/deployment-policies/${createdPolicyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated description', type: 'SCHEDULE' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.description).toBe('Updated description');
    expect(res.body.data.type).toBe('SCHEDULE');
  });

  it('PUT /v1/deployment-policies/:id 400 on invalid supportedModule', async () => {
    const res = await getAgent()
      .put(`/v1/deployment-policies/${createdPolicyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ supportedModule: 'INVALID_MODULE' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/deployment-policies/:id returns seed policy by policyId DPOL-0001', async () => {
    const res = await getAgent()
      .get('/v1/deployment-policies/DPOL-0001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('DELETE /v1/deployment-policies/:id deletes policy', async () => {
    const res = await getAgent()
      .delete(`/v1/deployment-policies/${createdPolicyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /v1/deployment-policies/:id 404 after deletion', async () => {
    const res = await getAgent()
      .get(`/v1/deployment-policies/${createdPolicyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
