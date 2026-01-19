import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = createApp();

describe('Tags API Integration Tests', () => {
  const testEmail = 'tags-test@example.com';
  const testPassword = 'Password123';
  let accessToken: string;
  let testTagId: string;
  let testAssetId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.assetTag.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.asset.deleteMany({ where: { name: { startsWith: 'Test Asset' } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // Create test user
    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: await hashPassword(testPassword),
        name: 'Tags Test User',
        role: 'admin',
        isActive: true,
        isOnboarded: true,
      },
    });

    // Get access token
    const loginResponse = await request(app)
      .post('/v1/auth/login')
      .send({ email: testEmail, password: testPassword });
    accessToken = loginResponse.body.accessToken;

    // Create a test asset
    const asset = await prisma.asset.create({
      data: {
        name: 'Test Asset for Tags',
        type: 'Endpoint',
        status: 'In Use',
      },
    });
    testAssetId = asset.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.assetTag.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.asset.deleteMany({ where: { id: testAssetId } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  describe('POST /v1/tags', () => {
    it('should create a new tag', async () => {
      const response = await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Production',
          color: '#ff0000',
          description: 'Production environment tag',
          priority: 10,
          compliance: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Production');
      expect(response.body.color).toBe('#ff0000');
      expect(response.body.description).toBe('Production environment tag');
      expect(response.body.priority).toBe(10);
      expect(response.body.compliance).toBe(true);
      expect(response.body.assetCount).toBe(0);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      testTagId = response.body.id;
    });

    it('should reject duplicate tag name', async () => {
      const response = await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Production' });

      expect(response.status).toBe(409);
    });

    it('should reject duplicate tag name case-insensitively', async () => {
      const response = await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'PRODUCTION' });

      expect(response.status).toBe(409);
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ color: '#000000' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid color format', async () => {
      const response = await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Invalid Color Tag', color: 'red' });

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/v1/tags')
        .send({ name: 'Unauthenticated Tag' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v1/tags', () => {
    beforeAll(async () => {
      // Create additional test tags
      await prisma.tag.createMany({
        data: [
          { name: 'Development', color: '#00ff00', priority: 5 },
          { name: 'Staging', color: '#0000ff', priority: 7 },
          { name: 'Testing', color: '#ffff00', priority: 3 },
        ],
        skipDuplicates: true,
      });
    });

    it('should return all tags with pagination', async () => {
      const response = await request(app)
        .get('/v1/tags')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should return tags with asset counts', async () => {
      const response = await request(app)
        .get('/v1/tags')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((tag: any) => {
        expect(tag).toHaveProperty('assetCount');
        expect(typeof tag.assetCount).toBe('number');
      });
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/v1/tags?search=Prod')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.some((tag: any) => tag.name.includes('Production'))).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/v1/tags?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/v1/tags');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v1/tags/:id', () => {
    it('should return tag by ID', async () => {
      const response = await request(app)
        .get(`/v1/tags/${testTagId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testTagId);
      expect(response.body.name).toBe('Production');
      expect(response.body).toHaveProperty('assetCount');
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .get('/v1/tags/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/v1/tags/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /v1/tags/:id', () => {
    it('should update tag', async () => {
      const response = await request(app)
        .put(`/v1/tags/${testTagId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Production Updated',
          color: '#ff00ff',
          description: 'Updated description',
          priority: 15,
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Production Updated');
      expect(response.body.color).toBe('#ff00ff');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.priority).toBe(15);
    });

    it('should reject duplicate name on update', async () => {
      const response = await request(app)
        .put(`/v1/tags/${testTagId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Development' });

      expect(response.status).toBe(409);
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .put('/v1/tags/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Update Non-existent' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /v1/tags/popular', () => {
    beforeAll(async () => {
      // Add some tags to the test asset to create popularity
      const tags = await prisma.tag.findMany({ take: 3 });
      await prisma.assetTag.createMany({
        data: tags.map((tag) => ({ assetId: testAssetId, tagId: tag.id })),
        skipDuplicates: true,
      });
    });

    it('should return popular tags', async () => {
      const response = await request(app)
        .get('/v1/tags/popular')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/v1/tags/popular?limit=2')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });
  });

  describe('POST /v1/assets/:id/tags', () => {
    let newTagId: string;

    beforeAll(async () => {
      // Create a tag to add
      const tag = await prisma.tag.create({
        data: { name: 'New Tag for Asset', color: '#123456' },
      });
      newTagId = tag.id;
    });

    it('should add tags to asset', async () => {
      const response = await request(app)
        .post(`/v1/assets/${testAssetId}/tags`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tagIds: [newTagId] });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((tag: any) => tag.id === newTagId)).toBe(true);
    });

    it('should ignore duplicate tags', async () => {
      const response = await request(app)
        .post(`/v1/assets/${testAssetId}/tags`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tagIds: [newTagId] });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await request(app)
        .post('/v1/assets/00000000-0000-0000-0000-000000000000/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tagIds: [newTagId] });

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .post(`/v1/assets/${testAssetId}/tags`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tagIds: ['00000000-0000-0000-0000-000000000000'] });

      expect(response.status).toBe(404);
    });

    it('should return 400 for empty tagIds array', async () => {
      const response = await request(app)
        .post(`/v1/assets/${testAssetId}/tags`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tagIds: [] });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /v1/assets/:id/tags/:tagId', () => {
    let tagToRemoveId: string;

    beforeAll(async () => {
      // Create and add a tag to remove
      const tag = await prisma.tag.create({
        data: { name: 'Tag to Remove', color: '#654321' },
      });
      tagToRemoveId = tag.id;
      await prisma.assetTag.create({
        data: { assetId: testAssetId, tagId: tagToRemoveId },
      });
    });

    it('should remove tag from asset', async () => {
      const response = await request(app)
        .delete(`/v1/assets/${testAssetId}/tags/${tagToRemoveId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Tag removed from asset');
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await request(app)
        .delete(`/v1/assets/00000000-0000-0000-0000-000000000000/tags/${tagToRemoveId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for tag not associated with asset', async () => {
      const response = await request(app)
        .delete(`/v1/assets/${testAssetId}/tags/${tagToRemoveId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /v1/assets/bulk-tags', () => {
    let bulkAssetIds: string[];
    let bulkTagIds: string[];

    beforeAll(async () => {
      // Create assets for bulk operations
      const assets = await Promise.all([
        prisma.asset.create({ data: { name: 'Test Asset Bulk 1', type: 'Endpoint', status: 'In Use' } }),
        prisma.asset.create({ data: { name: 'Test Asset Bulk 2', type: 'Endpoint', status: 'In Use' } }),
      ]);
      bulkAssetIds = assets.map((a) => a.id);

      // Create tags for bulk operations
      const tags = await Promise.all([
        prisma.tag.create({ data: { name: 'Bulk Tag 1', color: '#111111' } }),
        prisma.tag.create({ data: { name: 'Bulk Tag 2', color: '#222222' } }),
      ]);
      bulkTagIds = tags.map((t) => t.id);
    });

    afterAll(async () => {
      await prisma.assetTag.deleteMany({ where: { assetId: { in: bulkAssetIds } } });
      await prisma.asset.deleteMany({ where: { id: { in: bulkAssetIds } } });
      await prisma.tag.deleteMany({ where: { id: { in: bulkTagIds } } });
    });

    it('should bulk assign tags to multiple assets', async () => {
      const response = await request(app)
        .post('/v1/assets/bulk-tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          assetIds: bulkAssetIds,
          tagIds: bulkTagIds,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Tags assigned');
      expect(response.body).toHaveProperty('assignedCount');
      expect(response.body.assignedCount).toBe(4); // 2 assets * 2 tags
    });

    it('should skip duplicates on bulk assign', async () => {
      const response = await request(app)
        .post('/v1/assets/bulk-tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          assetIds: bulkAssetIds,
          tagIds: bulkTagIds,
        });

      expect(response.status).toBe(200);
      expect(response.body.assignedCount).toBe(0); // All already exist
    });

    it('should return 404 for non-existent assets', async () => {
      const response = await request(app)
        .post('/v1/assets/bulk-tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          assetIds: ['00000000-0000-0000-0000-000000000000'],
          tagIds: bulkTagIds,
        });

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent tags', async () => {
      const response = await request(app)
        .post('/v1/assets/bulk-tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          assetIds: bulkAssetIds,
          tagIds: ['00000000-0000-0000-0000-000000000000'],
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 for empty assetIds', async () => {
      const response = await request(app)
        .post('/v1/assets/bulk-tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          assetIds: [],
          tagIds: bulkTagIds,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for empty tagIds', async () => {
      const response = await request(app)
        .post('/v1/assets/bulk-tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          assetIds: bulkAssetIds,
          tagIds: [],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /v1/tags/:id', () => {
    let tagToDeleteId: string;

    beforeEach(async () => {
      // Create a tag to delete
      const tag = await prisma.tag.create({
        data: { name: `Delete Tag ${Date.now()}`, color: '#999999' },
      });
      tagToDeleteId = tag.id;
    });

    it('should delete tag', async () => {
      const response = await request(app)
        .delete(`/v1/tags/${tagToDeleteId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      // Verify tag is deleted
      const getResponse = await request(app)
        .get(`/v1/tags/${tagToDeleteId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getResponse.status).toBe(404);
    });

    it('should delete tag and its asset associations', async () => {
      // Add tag to asset
      await prisma.assetTag.create({
        data: { assetId: testAssetId, tagId: tagToDeleteId },
      });

      const response = await request(app)
        .delete(`/v1/tags/${tagToDeleteId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      // Verify association is also deleted
      const associations = await prisma.assetTag.findMany({
        where: { tagId: tagToDeleteId },
      });
      expect(associations.length).toBe(0);
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .delete('/v1/tags/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
