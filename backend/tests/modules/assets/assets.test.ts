import request from 'supertest';
import { Application } from 'express';
import { createApp } from '@/app';
import { prisma } from '@/db/client';
import { generateTestTokens, randomString, randomUUID } from '../../utils/testHelpers';

describe('Assets Module', () => {
  let app: Application;
  let accessToken: string;

  beforeAll(() => {
    app = createApp();
    const tokens = generateTestTokens();
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Categories API', () => {
    let createdCategoryId: string;

    describe('POST /v1/categories', () => {
      it('should create a new category', async () => {
        const res = await request(app)
          .post('/v1/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Test Category ${randomString()}`,
            color: '#FF5733',
            description: 'A test category',
            isDefault: false,
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toContain('Test Category');
        expect(res.body.color).toBe('#FF5733');
        createdCategoryId = res.body.id;
      });

      it('should reject duplicate category names', async () => {
        const name = `Duplicate Category ${randomString()}`;

        await request(app)
          .post('/v1/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name });

        const res = await request(app)
          .post('/v1/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name });

        expect(res.status).toBe(409);
      });

      it('should validate required fields', async () => {
        const res = await request(app)
          .post('/v1/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({});

        expect(res.status).toBe(400);
      });
    });

    describe('GET /v1/categories', () => {
      it('should list all categories', async () => {
        const res = await request(app)
          .get('/v1/categories')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('GET /v1/categories/:id', () => {
      it('should get a specific category', async () => {
        if (!createdCategoryId) return;

        const res = await request(app)
          .get(`/v1/categories/${createdCategoryId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdCategoryId);
      });

      it('should return 404 for non-existent category', async () => {
        const res = await request(app)
          .get(`/v1/categories/${randomUUID()}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('PUT /v1/categories/:id', () => {
      it('should update a category', async () => {
        if (!createdCategoryId) return;

        const res = await request(app)
          .put(`/v1/categories/${createdCategoryId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Updated Category ${randomString()}`,
            color: '#00FF00',
          });

        expect(res.status).toBe(200);
        expect(res.body.color).toBe('#00FF00');
      });
    });

    describe('DELETE /v1/categories/:id', () => {
      it('should delete a category', async () => {
        const createRes = await request(app)
          .post('/v1/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: `Delete Category ${randomString()}` });

        const res = await request(app)
          .delete(`/v1/categories/${createRes.body.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(204);
      });
    });
  });

  describe('Tags API', () => {
    let createdTagId: string;

    describe('POST /v1/tags', () => {
      it('should create a new tag', async () => {
        const res = await request(app)
          .post('/v1/tags')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Test Tag ${randomString()}`,
            color: '#FF5733',
            description: 'A test tag',
            priority: 5,
            compliance: true,
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toContain('Test Tag');
        expect(res.body.compliance).toBe(true);
        createdTagId = res.body.id;
      });

      it('should reject duplicate tag names', async () => {
        const name = `Duplicate Tag ${randomString()}`;

        await request(app)
          .post('/v1/tags')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name });

        const res = await request(app)
          .post('/v1/tags')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name });

        expect(res.status).toBe(409);
      });
    });

    describe('GET /v1/tags', () => {
      it('should list all tags', async () => {
        const res = await request(app)
          .get('/v1/tags')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('GET /v1/tags/:id', () => {
      it('should get a specific tag', async () => {
        if (!createdTagId) return;

        const res = await request(app)
          .get(`/v1/tags/${createdTagId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdTagId);
      });
    });

    describe('PUT /v1/tags/:id', () => {
      it('should update a tag', async () => {
        if (!createdTagId) return;

        const res = await request(app)
          .put(`/v1/tags/${createdTagId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Updated Tag ${randomString()}`,
            priority: 10,
          });

        expect(res.status).toBe(200);
        expect(res.body.priority).toBe(10);
      });
    });

    describe('DELETE /v1/tags/:id', () => {
      it('should delete a tag', async () => {
        const createRes = await request(app)
          .post('/v1/tags')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: `Delete Tag ${randomString()}` });

        const res = await request(app)
          .delete(`/v1/tags/${createRes.body.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(204);
      });
    });
  });

  describe('Assets API', () => {
    let createdAssetId: string;

    describe('POST /v1/assets', () => {
      it('should create a new asset', async () => {
        const res = await request(app)
          .post('/v1/assets')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Test Asset ${randomString()}`,
            status: 'Available',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            serialNumber: randomString(15),
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('assetId');
        expect(res.body.name).toContain('Test Asset');
        createdAssetId = res.body.id;
      });

      it('should reject duplicate serial numbers', async () => {
        const serialNumber = randomString(15);

        await request(app)
          .post('/v1/assets')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Asset 1',
            serialNumber,
          });

        const res = await request(app)
          .post('/v1/assets')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Asset 2',
            serialNumber,
          });

        expect(res.status).toBe(409);
      });
    });

    describe('GET /v1/assets', () => {
      it('should list all assets with pagination', async () => {
        const res = await request(app)
          .get('/v1/assets')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ page: 1, limit: 10 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page');
        expect(res.body).toHaveProperty('limit');
        expect(res.body).toHaveProperty('totalPages');
      });

      it('should filter assets by status', async () => {
        const res = await request(app)
          .get('/v1/assets')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ status: 'Available' });

        expect(res.status).toBe(200);
        if (res.body.data.length > 0) {
          expect(res.body.data[0].status).toBe('Available');
        }
      });

      it('should search assets by name', async () => {
        const res = await request(app)
          .get('/v1/assets')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ search: 'Test Asset' });

        expect(res.status).toBe(200);
      });
    });

    describe('GET /v1/assets/:id', () => {
      it('should get a specific asset', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdAssetId);
      });

      it('should return 404 for non-existent asset', async () => {
        const res = await request(app)
          .get(`/v1/assets/${randomUUID()}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(404);
      });
    });

    describe('GET /v1/assets/:id/full', () => {
      it('should get asset with all detail tabs', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/full`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdAssetId);
        // These may be null for new assets without data
        expect(res.body).toHaveProperty('lifecycle');
        expect(res.body).toHaveProperty('hardware');
        expect(res.body).toHaveProperty('software');
      });
    });

    describe('PUT /v1/assets/:id', () => {
      it('should update an asset', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .put(`/v1/assets/${createdAssetId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Updated Asset ${randomString()}`,
            status: 'In Use',
          });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('In Use');
      });
    });

    describe('DELETE /v1/assets/:id', () => {
      it('should delete an asset', async () => {
        const createRes = await request(app)
          .post('/v1/assets')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Delete Asset ${randomString()}`,
            serialNumber: randomString(15),
          });

        const res = await request(app)
          .delete(`/v1/assets/${createRes.body.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(204);
      });
    });

    describe('Asset Detail Tabs', () => {
      it('should get asset lifecycle', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/lifecycle`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('currentDate');
        expect(res.body).toHaveProperty('depreciationTimeline');
      });

      it('should get asset hardware', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/hardware`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
      });

      it('should get asset software', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/software`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('applications');
        expect(res.body).toHaveProperty('services');
      });

      it('should get asset security', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/security`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
      });

      it('should get asset network', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/network`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('adapters');
      });

      it('should get asset peripherals', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/peripherals`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('monitors');
        expect(res.body).toHaveProperty('usbDevices');
      });

      it('should get asset telemetry', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/telemetry`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('timestamp');
      });

      it('should get asset telemetry history', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/telemetry/history`)
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ period: 'day' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('cpu');
        expect(res.body).toHaveProperty('memory');
        expect(res.body).toHaveProperty('disk');
      });

      it('should get asset errors', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/errors`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
      });

      it('should get asset audit log', async () => {
        if (!createdAssetId) return;

        const res = await request(app)
          .get(`/v1/assets/${createdAssetId}/audit-log`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });
  });

  describe('Software Licenses API', () => {
    let createdLicenseId: string;

    describe('POST /v1/software-licenses', () => {
      it('should create a new software license', async () => {
        const res = await request(app)
          .post('/v1/software-licenses')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            licenseName: `Test License ${randomString()}`,
            softwareName: 'Test Software',
            licenseCount: 10,
            vendorName: 'Test Vendor',
            status: 'Available',
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.licenseName).toContain('Test License');
        createdLicenseId = res.body.id;
      });
    });

    describe('GET /v1/software-licenses', () => {
      it('should list all software licenses', async () => {
        const res = await request(app)
          .get('/v1/software-licenses')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('PUT /v1/software-licenses/:id', () => {
      it('should update a software license', async () => {
        if (!createdLicenseId) return;

        const res = await request(app)
          .put(`/v1/software-licenses/${createdLicenseId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            licenseCount: 20,
            status: 'Allocated',
          });

        expect(res.status).toBe(200);
        expect(res.body.licenseCount).toBe(20);
      });
    });

    describe('DELETE /v1/software-licenses/:id', () => {
      it('should delete a software license', async () => {
        const createRes = await request(app)
          .post('/v1/software-licenses')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            licenseName: `Delete License ${randomString()}`,
            softwareName: 'Test Software',
            licenseCount: 5,
            vendorName: 'Test Vendor',
            status: 'Available',
          });

        const res = await request(app)
          .delete(`/v1/software-licenses/${createRes.body.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(204);
      });
    });
  });

  describe('OS Licenses API', () => {
    let createdOSLicenseId: string;

    describe('POST /v1/os-licenses', () => {
      it('should create a new OS license', async () => {
        const res = await request(app)
          .post('/v1/os-licenses')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            licenseName: `Test OS License ${randomString()}`,
            osType: 'Windows 11 Pro',
            status: 'Available',
            licenseCount: 50,
            vendorName: 'Microsoft',
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.osType).toBe('Windows 11 Pro');
        createdOSLicenseId = res.body.id;
      });
    });

    describe('GET /v1/os-licenses', () => {
      it('should list all OS licenses', async () => {
        const res = await request(app)
          .get('/v1/os-licenses')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('PUT /v1/os-licenses/:id', () => {
      it('should update an OS license', async () => {
        if (!createdOSLicenseId) return;

        const res = await request(app)
          .put(`/v1/os-licenses/${createdOSLicenseId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            licenseCount: 100,
            status: 'Allocated',
          });

        expect(res.status).toBe(200);
        expect(res.body.licenseCount).toBe(100);
      });
    });

    describe('DELETE /v1/os-licenses/:id', () => {
      it('should delete an OS license', async () => {
        const createRes = await request(app)
          .post('/v1/os-licenses')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            licenseName: `Delete OS License ${randomString()}`,
            osType: 'MacOS',
            status: 'Available',
            licenseCount: 10,
            vendorName: 'Apple',
          });

        const res = await request(app)
          .delete(`/v1/os-licenses/${createRes.body.id}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(204);
      });
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all routes', async () => {
      const routes = [
        ['GET', '/v1/categories'],
        ['GET', '/v1/tags'],
        ['GET', '/v1/assets'],
        ['GET', '/v1/software-licenses'],
        ['GET', '/v1/os-licenses'],
      ];

      for (const [method, path] of routes) {
        const res = await (request(app) as any)[method.toLowerCase()](path);
        expect(res.status).toBe(401);
      }
    });
  });
});
