// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

// The list endpoints return: { success: true, data: { success, data: [...], total, page, limit, totalPages } }
// Single-item endpoints return: { success: true, data: { id, ... } }

const PREFIX = 'INTTEST-CRUD';

describe('Assets CRUD', () => {
  let token;
  let createdAssetId;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  afterAll(async () => {
    await prisma.asset.deleteMany({ where: { name: { startsWith: PREFIX } } });
  });

  // ---- Auth guard ----
  it('401 without auth token', async () => {
    const res = await getAgent().get('/v1/assets');
    expect(res.status).toBe(401);
  });

  // ---- List assets ----
  it('GET /v1/assets returns paginated list', async () => {
    const res = await getAgent()
      .get('/v1/assets')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // paginate() result is nested in data
    const inner = res.body.data;
    expect(Array.isArray(inner.data)).toBe(true);
    expect(typeof inner.total).toBe('number');
    expect(typeof inner.page).toBe('number');
    expect(typeof inner.limit).toBe('number');
    expect(typeof inner.totalPages).toBe('number');
  });

  it('GET /v1/assets supports pagination params', async () => {
    const res = await getAgent()
      .get('/v1/assets?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const inner = res.body.data;
    expect(inner.data.length).toBeLessThanOrEqual(2);
    expect(inner.limit).toBe(2);
    expect(inner.page).toBe(1);
  });

  it('GET /v1/assets supports search param', async () => {
    const res = await getAgent()
      .get('/v1/assets?search=asset')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  it('GET /v1/assets filters by status', async () => {
    const res = await getAgent()
      .get('/v1/assets?status=AVAILABLE')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const assets = res.body.data.data;
    for (const a of assets) {
      expect(a.status).toBe('AVAILABLE');
    }
  });

  // ---- Create asset ----
  it('POST /v1/assets creates an asset', async () => {
    const res = await getAgent()
      .post('/v1/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-Asset-1`,
        status: 'AVAILABLE',
        manufacturer: 'TestCorp',
        model: 'Model-X',
        osType: 'WINDOWS',
        osVersion: '11',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe(`${PREFIX}-Asset-1`);
    expect(res.body.data.status).toBe('AVAILABLE');
    createdAssetId = res.body.data.id;
  });

  it('POST /v1/assets 400 on missing name', async () => {
    const res = await getAgent()
      .post('/v1/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'AVAILABLE' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/assets 400 on invalid status', async () => {
    const res = await getAgent()
      .post('/v1/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Bad`, status: 'INVALID_STATUS' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Get by ID ----
  it('GET /v1/assets/:id returns the asset', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${createdAssetId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdAssetId);
    expect(res.body.data.name).toBe(`${PREFIX}-Asset-1`);
  });

  it('GET /v1/assets/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .get('/v1/assets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Full detail ----
  it('GET /v1/assets/:id/full returns full asset detail', async () => {
    const res = await getAgent()
      .get(`/v1/assets/${createdAssetId}/full`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdAssetId);
  });

  it('GET /v1/assets/:id/full 404 for unknown ID', async () => {
    const res = await getAgent()
      .get('/v1/assets/00000000-0000-0000-0000-000000000000/full')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Update asset ----
  it('PUT /v1/assets/:id updates the asset', async () => {
    const res = await getAgent()
      .put(`/v1/assets/${createdAssetId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Asset-1-Updated`, status: 'IN_USE' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`${PREFIX}-Asset-1-Updated`);
    expect(res.body.data.status).toBe('IN_USE');
  });

  it('PUT /v1/assets/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .put('/v1/assets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Ghost` });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Bulk delete ----
  it('POST /v1/assets/bulk bulk deletes assets', async () => {
    const createRes = await getAgent()
      .post('/v1/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Bulk-Del` });
    expect(createRes.status).toBe(201);
    const bulkId = createRes.body.data.id;

    const res = await getAgent()
      .post('/v1/assets/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [bulkId] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await getAgent()
      .get(`/v1/assets/${bulkId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('POST /v1/assets/bulk 400 with empty ids array', async () => {
    const res = await getAgent()
      .post('/v1/assets/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Delete asset ----
  it('DELETE /v1/assets/:id deletes the asset', async () => {
    const res = await getAgent()
      .delete(`/v1/assets/${createdAssetId}`)
      .set('Authorization', `Bearer ${token}`);
    // DELETE returns 204 No Content
    expect(res.status).toBe(204);

    const getRes = await getAgent()
      .get(`/v1/assets/${createdAssetId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /v1/assets/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .delete('/v1/assets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
