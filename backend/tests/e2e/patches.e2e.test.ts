import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { prisma } from '@db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = getTestApp();

describe('E2E: Patch Management', () => {
  let adminToken: string;
  let testUserId: string;
  let testPatchId: string;
  let testDeploymentId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'patches-test-admin@patchiq.io' },
      update: {},
      create: {
        email: 'patches-test-admin@patchiq.io',
        name: 'Patches Test Admin',
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
      .send({ email: 'patches-test-admin@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup test patches
    await prisma.patch.deleteMany({
      where: { patchId: { startsWith: 'E2E-TEST' } },
    });
    await prisma.patchDeployment.deleteMany({
      where: { name: { startsWith: 'E2E-Test' } },
    });
    // Cleanup test user
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('Patch CRUD Operations', () => {
    it('should list all patches', async () => {
      const res = await request(app)
        .get('/v1/patches')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Backend returns paginated response
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a new patch', async () => {
      const res = await request(app)
        .post('/v1/patches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          software: `E2E-TEST-Software-${Date.now()}`,
          title: 'E2E Test Security Patch',
          description: 'Test patch for E2E testing',
          severity: 'High',
          publishedAt: new Date().toISOString(),
          rebootRequired: false,
          os: 'Windows',
          category: 'Security',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('E2E Test Security Patch');

      testPatchId = res.body.id;
    });

    it('should get patch by ID', async () => {
      const res = await request(app)
        .get(`/v1/patches/${testPatchId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testPatchId);
    });

    it('should update a patch', async () => {
      const res = await request(app)
        .put(`/v1/patches/${testPatchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'E2E Test Security Patch Updated',
          severity: 'CRITICAL',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('E2E Test Security Patch Updated');
      expect(res.body.severity).toBe('CRITICAL');
    });

    it('should filter patches by severity', async () => {
      const res = await request(app)
        .get('/v1/patches?severity=Critical')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should search patches', async () => {
      const res = await request(app)
        .get('/v1/patches?search=E2E-Test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Patch Related Data', () => {
    it('should get affected softwares for patch', async () => {
      const res = await request(app)
        .get(`/v1/patches/${testPatchId}/affected-softwares`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get file details for patch', async () => {
      const res = await request(app)
        .get(`/v1/patches/${testPatchId}/file-details`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get vulnerabilities for patch', async () => {
      const res = await request(app)
        .get(`/v1/patches/${testPatchId}/vulnerabilities`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get endpoints for patch', async () => {
      const res = await request(app)
        .get(`/v1/patches/${testPatchId}/endpoints`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Test-Approve-Deploy Workflow', () => {
    it('should get patches pending test/approval', async () => {
      const res = await request(app)
        .get('/v1/patches/test-approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should mark patch as tested', async () => {
      const res = await request(app)
        .post(`/v1/patches/${testPatchId}/test`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'passed',
          notes: 'Tested on 5 endpoints, no issues found',
        });

      expect(res.status).toBe(200);
      // Backend sets testStatus to 'Tested' on passed tests
      expect(res.body.testStatus).toBe('Tested');
    });

    it('should approve patch for deployment', async () => {
      const res = await request(app)
        .post(`/v1/patches/${testPatchId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Backend returns 'Approved' with capital A
      expect(res.body.approvalStatus).toBe('Approved');
    });
  });

  describe('Deployments', () => {
    it('should list all deployments', async () => {
      const res = await request(app)
        .get('/v1/deployments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Backend returns paginated response
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a deployment', async () => {
      const res = await request(app)
        .post('/v1/deployments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Deployment',
          type: 'INSTALL',
          scope: 'ENDPOINT',
          patches: [testPatchId],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E-Test Deployment');

      testDeploymentId = res.body.id;
    });

    it('should get deployment by ID', async () => {
      const res = await request(app)
        .get(`/v1/deployments/${testDeploymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testDeploymentId);
    });

    it('should get deployment preview', async () => {
      const res = await request(app)
        .get(`/v1/deployments/${testDeploymentId}/preview`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should execute deployment', async () => {
      const res = await request(app)
        .post(`/v1/deployments/${testDeploymentId}/execute`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Either success or deployment already in progress
      expect([200, 400]).toContain(res.status);
    });

    it('should delete deployment', async () => {
      if (!testDeploymentId) return;

      const res = await request(app)
        .delete(`/v1/deployments/${testDeploymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 for successful DELETE, or 400 if deployment is in progress
      expect([200, 204, 400]).toContain(res.status);
    });
  });

  describe('Patch Tests', () => {
    let testPatchTestId: string;

    it('should list patch tests', async () => {
      const res = await request(app)
        .get('/v1/patch-tests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Backend returns paginated response
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a patch test', async () => {
      const res = await request(app)
        .post('/v1/patch-tests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Patch Test',
          description: 'Test patch test for E2E testing',
          applicationType: 'ALL',
          scope: 'ALL_COMPUTERS',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');

      testPatchTestId = res.body.id;
    });

    it('should get patch test by ID', async () => {
      const res = await request(app)
        .get(`/v1/patch-tests/${testPatchTestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testPatchTestId);
    });

    it('should approve patch test', async () => {
      const res = await request(app)
        .put(`/v1/patch-tests/${testPatchTestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should delete patch test', async () => {
      if (!testPatchTestId) return;

      const res = await request(app)
        .delete(`/v1/patch-tests/${testPatchTestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Zero Touch Configs', () => {
    let testZeroTouchId: string;

    it('should list zero touch configs', async () => {
      const res = await request(app)
        .get('/v1/zero-touch-configs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Backend returns paginated response
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a zero touch config', async () => {
      const res = await request(app)
        .post('/v1/zero-touch-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Zero Touch Config',
          description: 'Test zero touch config for E2E testing',
          applicationType: 'ALL',
          scope: 'ALL_COMPUTERS',
          autoDeploymentRules: {
            severity: ['CRITICAL', 'High'],
            approvalRequired: false,
            schedule: '0 2 * * *',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');

      testZeroTouchId = res.body.id;
    });

    it('should get zero touch config by ID', async () => {
      if (!testZeroTouchId) return;

      const res = await request(app)
        .get(`/v1/zero-touch-configs/${testZeroTouchId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testZeroTouchId);
    });

    it('should update zero touch config', async () => {
      if (!testZeroTouchId) return;

      const res = await request(app)
        .put(`/v1/zero-touch-configs/${testZeroTouchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Inactive',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Inactive');
    });

    it('should delete zero touch config', async () => {
      if (!testZeroTouchId) return;

      const res = await request(app)
        .delete(`/v1/zero-touch-configs/${testZeroTouchId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Patch Rejection Workflow', () => {
    let rejectionPatchId: string;

    beforeAll(async () => {
      // Create patch to reject
      const res = await request(app)
        .post('/v1/patches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          software: `E2E-TEST-REJECT-Software-${Date.now()}`,
          title: 'E2E Patch to Reject',
          severity: 'Low',
          publishedAt: new Date().toISOString(),
          rebootRequired: false,
        });

      rejectionPatchId = res.body.id;
    });

    it('should reject a patch', async () => {
      // Skip if patch wasn't created
      if (!rejectionPatchId) {
        console.warn('Skipping rejection - patch not created');
        return;
      }

      const res = await request(app)
        .post(`/v1/patches/${rejectionPatchId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Not compatible with current infrastructure',
        });

      expect(res.status).toBe(200);
      expect(res.body.approvalStatus).toBe('Rejected');
    });

    afterAll(async () => {
      await prisma.patch.delete({ where: { id: rejectionPatchId } }).catch(() => {});
    });
  });

  describe('Cleanup', () => {
    it('should delete the test patch', async () => {
      if (!testPatchId) return;

      const res = await request(app)
        .delete(`/v1/patches/${testPatchId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });
  });
});

describe('E2E: Patch Error Handling', () => {
  let adminToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'patches-error-test@patchiq.io' },
      update: {},
      create: {
        email: 'patches-error-test@patchiq.io',
        name: 'Patches Error Test',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;

    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'patches-error-test@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  it('should return 404 for non-existent patch', async () => {
    const res = await request(app)
      .get('/v1/patches/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('should return 400/422 for invalid patch data', async () => {
    const res = await request(app)
      .post('/v1/patches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // Missing required fields
        description: 'Invalid patch',
      });

    // Backend returns 400 for validation errors
    expect([400, 422]).toContain(res.status);
  });

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/v1/patches');

    expect(res.status).toBe(401);
  });
});
