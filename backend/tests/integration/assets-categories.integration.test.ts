// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const PREFIX = 'INTTEST-CAT';
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

describe('Categories and SubCategories', () => {
  let token;
  let categoryId;
  let subCategoryId;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  afterAll(async () => {
    await prisma.asset.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.subCategory.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.category.deleteMany({ where: { name: { startsWith: PREFIX } } });
  });

  // ---- Categories ----
  it('GET /v1/categories returns list', async () => {
    const res = await getAgent()
      .get('/v1/categories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/categories 401 without auth', async () => {
    const res = await getAgent().get('/v1/categories');
    expect(res.status).toBe(401);
  });

  it('POST /v1/categories creates a category', async () => {
    const res = await getAgent()
      .post('/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-Servers`,
        color: '#3498DB',
        description: 'Integration test server category',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe(`${PREFIX}-Servers`);
    categoryId = res.body.data.id;
  });

  it('POST /v1/categories 400 on missing name', async () => {
    const res = await getAgent()
      .post('/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ color: '#3498DB' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/categories 400 on short name', async () => {
    const res = await getAgent()
      .post('/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A' }); // min 2 chars
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/categories/:id returns the category', async () => {
    const res = await getAgent()
      .get(`/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(categoryId);
    expect(res.body.data.name).toBe(`${PREFIX}-Servers`);
  });

  it('GET /v1/categories/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .get(`/v1/categories/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /v1/categories/:id updates the category', async () => {
    const res = await getAgent()
      .put(`/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Servers-Updated`, color: '#1ABC9C' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`${PREFIX}-Servers-Updated`);
  });

  it('PUT /v1/categories/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .put(`/v1/categories/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Ghost` });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Get assets by category ----
  it('GET /v1/categories/:id/assets returns assets in category', async () => {
    const res = await getAgent()
      .get(`/v1/categories/${categoryId}/assets`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/categories/:id/assets 404 for unknown category', async () => {
    const res = await getAgent()
      .get(`/v1/categories/${UNKNOWN_ID}/assets`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- SubCategories ----
  it('GET /v1/subcategories returns list', async () => {
    const res = await getAgent()
      .get('/v1/subcategories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/subcategories filters by categoryId', async () => {
    const res = await getAgent()
      .get(`/v1/subcategories?categoryId=${categoryId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /v1/subcategories creates a subcategory', async () => {
    const res = await getAgent()
      .post('/v1/subcategories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-WebServers`,
        categoryId,
        criticality: 'HIGH',
        description: 'Test subcategory',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe(`${PREFIX}-WebServers`);
    subCategoryId = res.body.data.id;
  });

  it('POST /v1/subcategories 400 on missing categoryId', async () => {
    const res = await getAgent()
      .post('/v1/subcategories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-NoCat` });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/subcategories 400 on invalid criticality', async () => {
    const res = await getAgent()
      .post('/v1/subcategories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-BadCrit`, categoryId, criticality: 'EXTREME' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/subcategories/:id returns the subcategory', async () => {
    const res = await getAgent()
      .get(`/v1/subcategories/${subCategoryId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(subCategoryId);
    expect(res.body.data.name).toBe(`${PREFIX}-WebServers`);
  });

  it('GET /v1/subcategories/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .get(`/v1/subcategories/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /v1/subcategories/:id updates the subcategory', async () => {
    const res = await getAgent()
      .put(`/v1/subcategories/${subCategoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-WebServers-Updated`, criticality: 'CRITICAL' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`${PREFIX}-WebServers-Updated`);
    expect(res.body.data.criticality).toBe('CRITICAL');
  });

  it('PUT /v1/subcategories/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .put(`/v1/subcategories/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Ghost` });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Get assets by subcategory ----
  it('GET /v1/subcategories/:id/assets returns assets in subcategory', async () => {
    const res = await getAgent()
      .get(`/v1/subcategories/${subCategoryId}/assets`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/subcategories/:id/assets 404 for unknown subcategory', async () => {
    const res = await getAgent()
      .get(`/v1/subcategories/${UNKNOWN_ID}/assets`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Delete subcategory then category ----
  it('DELETE /v1/subcategories/:id deletes the subcategory', async () => {
    const res = await getAgent()
      .delete(`/v1/subcategories/${subCategoryId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const getRes = await getAgent()
      .get(`/v1/subcategories/${subCategoryId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /v1/subcategories/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .delete(`/v1/subcategories/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /v1/categories/:id deletes the category', async () => {
    const res = await getAgent()
      .delete(`/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const getRes = await getAgent()
      .get(`/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /v1/categories/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .delete(`/v1/categories/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
