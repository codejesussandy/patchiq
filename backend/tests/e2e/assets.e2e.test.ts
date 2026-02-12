import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { prisma } from '@db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = getTestApp();

describe('E2E: Asset Management', () => {
  let adminToken: string;
  let testUserId: string;
  let testAssetId: string;
  let testCategoryId: string;
  let testSubCategoryId: string;
  let testTagId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'assets-test-admin@patchiq.io' },
      update: {},
      create: {
        email: 'assets-test-admin@patchiq.io',
        name: 'Assets Test Admin',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;

    // Login to get token
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'assets-test-admin@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testAssetId) {
      await prisma.asset.delete({ where: { id: testAssetId } }).catch(() => {});
    }
    if (testTagId) {
      await prisma.tag.delete({ where: { id: testTagId } }).catch(() => {});
    }
    if (testSubCategoryId) {
      await prisma.subCategory.delete({ where: { id: testSubCategoryId } }).catch(() => {});
    }
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    // Cleanup any E2E test assets
    await prisma.asset.deleteMany({
      where: { name: { startsWith: 'E2E-Test' } },
    });
    // Cleanup test user
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('Categories', () => {
    it('should list all categories', async () => {
      const res = await request(app)
        .get('/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should create a new category', async () => {
      const res = await request(app)
        .post('/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Category',
          description: 'Test category for E2E tests',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E-Test Category');

      testCategoryId = res.body.id;
    });

    it('should get category by ID', async () => {
      if (!testCategoryId) return;

      const res = await request(app)
        .get(`/v1/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testCategoryId);
    });

    it('should update a category', async () => {
      if (!testCategoryId) return;

      const res = await request(app)
        .put(`/v1/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Category Updated',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('E2E-Test Category Updated');
    });
  });

  describe('SubCategories', () => {
    it('should list all subcategories', async () => {
      const res = await request(app)
        .get('/v1/subcategories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should create a new subcategory', async () => {
      if (!testCategoryId) return;

      const res = await request(app)
        .post('/v1/subcategories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test SubCategory',
          description: 'Test subcategory',
          categoryId: testCategoryId,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E-Test SubCategory');

      testSubCategoryId = res.body.id;
    });

    it('should get subcategory by ID', async () => {
      if (!testSubCategoryId) return;

      const res = await request(app)
        .get(`/v1/subcategories/${testSubCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testSubCategoryId);
    });
  });

  describe('Tags', () => {
    it('should list all tags', async () => {
      const res = await request(app)
        .get('/v1/tags')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Tags returns paginated response
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a new tag', async () => {
      const res = await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'e2e-test-tag',
          color: '#FF5733',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('e2e-test-tag');

      testTagId = res.body.id;
    });

    it('should get tag by ID', async () => {
      if (!testTagId) return;

      const res = await request(app)
        .get(`/v1/tags/${testTagId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testTagId);
    });

    it('should update a tag', async () => {
      if (!testTagId) return;

      const res = await request(app)
        .put(`/v1/tags/${testTagId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'e2e-test-tag-updated',
          color: '#33FF57',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('e2e-test-tag-updated');
    });

    it('should get popular tags', async () => {
      const res = await request(app)
        .get('/v1/tags/popular?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Assets CRUD', () => {
    it('should list all assets', async () => {
      const res = await request(app)
        .get('/v1/assets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Assets returns paginated response
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a new asset', async () => {
      const res = await request(app)
        .post('/v1/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Laptop',
          assetType: 'Laptop',
          manufacturer: 'Dell',
          model: 'XPS 15',
          serialNumber: 'E2E-TEST-SN-001',
          // Only include IDs if they exist
          ...(testCategoryId && { categoryId: testCategoryId }),
          ...(testSubCategoryId && { subCategoryId: testSubCategoryId }),
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E-Test Laptop');

      testAssetId = res.body.id;
    });

    it('should get asset by ID', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testAssetId);
      expect(res.body.name).toBe('E2E-Test Laptop');
    });

    it('should get full asset details', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/full`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testAssetId);
    });

    it('should update an asset', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .put(`/v1/assets/${testAssetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Laptop Updated',
          model: 'XPS 17',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('E2E-Test Laptop Updated');
      expect(res.body.model).toBe('XPS 17');
    });

    it('should filter assets by search', async () => {
      const res = await request(app)
        .get('/v1/assets?search=E2E-Test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Assets returns paginated response
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Asset Tags Management', () => {
    it('should add tags to asset', async () => {
      if (!testAssetId || !testTagId) return;

      const res = await request(app)
        .post(`/v1/assets/${testAssetId}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tagIds: [testTagId],
        });

      expect(res.status).toBe(200);
    });

    it('should remove tag from asset', async () => {
      if (!testAssetId || !testTagId) return;

      const res = await request(app)
        .delete(`/v1/assets/${testAssetId}/tags/${testTagId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });

    it('should bulk assign tags to multiple assets', async () => {
      if (!testAssetId || !testTagId) return;

      const res = await request(app)
        .post('/v1/assets/bulk-tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assetIds: [testAssetId],
          tagIds: [testTagId],
          action: 'add',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('Asset Detail Tabs', () => {
    it('should get asset lifecycle data', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/lifecycle`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset hardware data', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/hardware`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset hardware expanded data', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/hardware/expanded`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset software data', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/software`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset security data', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/security`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset network data', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/network`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset peripherals data', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/peripherals`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset telemetry data', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/telemetry`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset telemetry history', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/telemetry/history?period=day`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset errors data', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/errors`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset audit log', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/audit-log`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should get asset patches', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/patches`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get asset deployments', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .get(`/v1/assets/${testAssetId}/deployments`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Software Inventory', () => {
    it('should list software inventory', async () => {
      const res = await request(app)
        .get('/v1/software-inventory')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Software Licenses', () => {
    let testLicenseId: string;

    it('should list software licenses', async () => {
      const res = await request(app)
        .get('/v1/software-licenses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should create a software license', async () => {
      const res = await request(app)
        .post('/v1/software-licenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licenseName: 'E2E Test License',
          softwareName: 'Test Software',
          vendorName: 'Test Vendor',
          licenseCount: 10,
          status: 'AVAILABLE',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      testLicenseId = res.body.id;
    });

    it('should get software license by ID', async () => {
      if (!testLicenseId) return;

      const res = await request(app)
        .get(`/v1/software-licenses/${testLicenseId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testLicenseId);
    });

    it('should update software license', async () => {
      if (!testLicenseId) return;

      const res = await request(app)
        .put(`/v1/software-licenses/${testLicenseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licenseCount: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.licenseCount).toBe(20);
    });

    it('should delete software license', async () => {
      if (!testLicenseId) return;

      const res = await request(app)
        .delete(`/v1/software-licenses/${testLicenseId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });
  });

  describe('OS Licenses', () => {
    let testOsLicenseId: string;

    it('should list OS licenses', async () => {
      const res = await request(app)
        .get('/v1/os-licenses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should create an OS license', async () => {
      const res = await request(app)
        .post('/v1/os-licenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          licenseName: 'E2E Windows License',
          osType: 'Windows 11 Pro',
          vendorName: 'Microsoft',
          licenseCount: 50,
          status: 'AVAILABLE',
          licenseKey: 'E2E-TEST-KEY-XXXX-XXXX',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      testOsLicenseId = res.body.id;
    });

    it('should get OS license by ID', async () => {
      if (!testOsLicenseId) return;

      const res = await request(app)
        .get(`/v1/os-licenses/${testOsLicenseId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testOsLicenseId);
    });

    it('should delete OS license', async () => {
      if (!testOsLicenseId) return;

      const res = await request(app)
        .delete(`/v1/os-licenses/${testOsLicenseId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Asset Cleanup', () => {
    it('should delete an asset', async () => {
      if (!testAssetId) return;

      const res = await request(app)
        .delete(`/v1/assets/${testAssetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);

      // Verify deletion
      const getRes = await request(app)
        .get(`/v1/assets/${testAssetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(404);
    });

    it('should delete tag', async () => {
      if (!testTagId) return;

      const res = await request(app)
        .delete(`/v1/tags/${testTagId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });

    it('should delete subcategory', async () => {
      if (!testSubCategoryId) return;

      const res = await request(app)
        .delete(`/v1/subcategories/${testSubCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });

    it('should delete category', async () => {
      if (!testCategoryId) return;

      const res = await request(app)
        .delete(`/v1/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });
  });
});

describe('E2E: Asset Error Handling', () => {
  let adminToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'assets-error-test@patchiq.io' },
      update: {},
      create: {
        email: 'assets-error-test@patchiq.io',
        name: 'Assets Error Test',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;

    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'assets-error-test@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  it('should return 404 for non-existent asset', async () => {
    const res = await request(app)
      .get('/v1/assets/non-existent-id')
      .set('Authorization', `Bearer ${adminToken}`);

    // Returns 400 if invalid UUID format, 404 if valid UUID but not found
    expect([400, 404]).toContain(res.status);
  });

  it('should return 400/422 for invalid asset data', async () => {
    const res = await request(app)
      .post('/v1/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // Missing required fields
        description: 'Invalid asset',
      });

    // Backend returns 400 for validation errors
    expect([400, 422]).toContain(res.status);
  });

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/v1/assets');

    expect(res.status).toBe(401);
  });
});
