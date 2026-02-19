// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const PREFIX = 'INTTEST-TAG';
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

describe('Tags', () => {
  let token;
  let createdTagId;
  let assetId;

  beforeAll(async () => {
    token = await getAdminToken();

    // Create an asset for tag operations
    const res = await getAgent()
      .post('/v1/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Asset` });
    assetId = res.body.data.id;
  });

  afterAll(async () => {
    await prisma.asset.deleteMany({ where: { name: { startsWith: PREFIX } } });
    await prisma.tag.deleteMany({ where: { name: { startsWith: PREFIX } } });
  });

  // ---- List tags ----
  it('GET /v1/tags returns tag list', async () => {
    const res = await getAgent()
      .get('/v1/tags')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Tags list may be paginated or plain array — check either way
    const data = res.body.data;
    const tags = Array.isArray(data) ? data : data.data;
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0); // seed has 6 tags
  });

  it('GET /v1/tags 401 without auth', async () => {
    const res = await getAgent().get('/v1/tags');
    expect(res.status).toBe(401);
  });

  // ---- Create tag ----
  it('POST /v1/tags creates a tag', async () => {
    const res = await getAgent()
      .post('/v1/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `${PREFIX}-MyTag`,
        color: '#FF5733',
        description: 'Integration test tag',
        priority: 10,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe(`${PREFIX}-MyTag`);
    createdTagId = res.body.data.id;
  });

  it('POST /v1/tags 400 on missing name', async () => {
    const res = await getAgent()
      .post('/v1/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ color: '#FF5733' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/tags 400 on invalid color format', async () => {
    const res = await getAgent()
      .post('/v1/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-BadColor`, color: 'notacolor' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Get tag by ID ----
  it('GET /v1/tags/:id returns the tag', async () => {
    const res = await getAgent()
      .get(`/v1/tags/${createdTagId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdTagId);
    expect(res.body.data.name).toBe(`${PREFIX}-MyTag`);
  });

  it('GET /v1/tags/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .get(`/v1/tags/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Update tag ----
  it('PUT /v1/tags/:id updates the tag', async () => {
    const res = await getAgent()
      .put(`/v1/tags/${createdTagId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-MyTag-Updated`, priority: 20 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(`${PREFIX}-MyTag-Updated`);
    expect(res.body.data.priority).toBe(20);
  });

  it('PUT /v1/tags/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .put(`/v1/tags/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `${PREFIX}-Ghost` });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Popular tags ----
  it('GET /v1/tags/popular returns popular tags', async () => {
    const res = await getAgent()
      .get('/v1/tags/popular')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/tags/popular with limit param', async () => {
    const res = await getAgent()
      .get('/v1/tags/popular?limit=3')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
  });

  // ---- Tag search ----
  it('GET /v1/tags/search returns matching tags', async () => {
    const res = await getAgent()
      .get('/v1/tags/search?q=Production')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Seed has a "Production" tag
    const names = res.body.data.map((t) => t.name);
    expect(names.some((n) => n.toLowerCase().includes('production'))).toBe(true);
  });

  it('GET /v1/tags/search 400 when q is missing', async () => {
    const res = await getAgent()
      .get('/v1/tags/search')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Add tags to asset ----
  it('POST /v1/assets/:id/tags adds tags to asset', async () => {
    const res = await getAgent()
      .post(`/v1/assets/${assetId}/tags`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagIds: [createdTagId] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/assets/:id/tags 400 with empty tagIds', async () => {
    const res = await getAgent()
      .post(`/v1/assets/${assetId}/tags`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/assets/:id/tags 404 for unknown asset', async () => {
    const res = await getAgent()
      .post(`/v1/assets/${UNKNOWN_ID}/tags`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagIds: [createdTagId] });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Bulk assign tags ----
  it('POST /v1/tags/bulk-assign assigns tags to multiple assets', async () => {
    const res = await getAgent()
      .post('/v1/tags/bulk-assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ assetIds: [assetId], tagIds: [createdTagId] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/assets/bulk-tags also assigns tags (alias route)', async () => {
    const res = await getAgent()
      .post('/v1/assets/bulk-tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ assetIds: [assetId], tagIds: [createdTagId] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/tags/bulk-assign 400 with empty assetIds', async () => {
    const res = await getAgent()
      .post('/v1/tags/bulk-assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ assetIds: [], tagIds: [createdTagId] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Remove tag from asset ----
  it('DELETE /v1/assets/:id/tags/:tagId removes tag from asset', async () => {
    // Ensure tag is assigned first
    await getAgent()
      .post(`/v1/assets/${assetId}/tags`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagIds: [createdTagId] });

    const res = await getAgent()
      .delete(`/v1/assets/${assetId}/tags/${createdTagId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ---- Bulk remove tags ----
  it('POST /v1/tags/bulk-remove removes tags from multiple assets', async () => {
    // Assign first
    await getAgent()
      .post('/v1/tags/bulk-assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ assetIds: [assetId], tagIds: [createdTagId] });

    const res = await getAgent()
      .post('/v1/tags/bulk-remove')
      .set('Authorization', `Bearer ${token}`)
      .send({ assetIds: [assetId], tagIds: [createdTagId] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/tags/bulk-remove 400 with empty tagIds', async () => {
    const res = await getAgent()
      .post('/v1/tags/bulk-remove')
      .set('Authorization', `Bearer ${token}`)
      .send({ assetIds: [assetId], tagIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Delete tag ----
  it('DELETE /v1/tags/:id deletes the tag', async () => {
    const res = await getAgent()
      .delete(`/v1/tags/${createdTagId}`)
      .set('Authorization', `Bearer ${token}`);
    // May return 200 or 204
    expect([200, 204]).toContain(res.status);

    // Verify it's gone
    const getRes = await getAgent()
      .get(`/v1/tags/${createdTagId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /v1/tags/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .delete(`/v1/tags/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
