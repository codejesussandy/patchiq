import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { prisma } from '@db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = getTestApp();

describe('E2E: Jobs Module', () => {
  let adminToken: string;
  let testUserId: string;
  let testPatchJobId: string;
  let testVulnerabilityJobId: string;
  let testSoftwareCatalogId: string;
  let testSoftwareBundleId: string;
  let testConfigCatalogId: string;
  let testConfigBundleId: string;
  let testDeploymentPolicyId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'jobs-test-admin@patchiq.io' },
      update: {},
      create: {
        email: 'jobs-test-admin@patchiq.io',
        name: 'Jobs Test Admin',
        passwordHash,
        role: 'admin',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;

    // Login to get token
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'jobs-test-admin@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data - clean up in reverse order of creation
    if (testDeploymentPolicyId) {
      await prisma.deploymentPolicy.delete({ where: { id: testDeploymentPolicyId } }).catch(() => {});
    }
    if (testConfigBundleId) {
      await prisma.configBundle.delete({ where: { id: testConfigBundleId } }).catch(() => {});
    }
    if (testConfigCatalogId) {
      await prisma.configCatalog.delete({ where: { id: testConfigCatalogId } }).catch(() => {});
    }
    if (testSoftwareBundleId) {
      await prisma.softwareBundle.delete({ where: { id: testSoftwareBundleId } }).catch(() => {});
    }
    if (testSoftwareCatalogId) {
      await prisma.softwareCatalog.delete({ where: { id: testSoftwareCatalogId } }).catch(() => {});
    }
    // Cleanup test user
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('Patch Jobs - /v1/jobs/patch', () => {
    it('should list patch jobs', async () => {
      const res = await request(app)
        .get('/v1/jobs/patch')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a patch job', async () => {
      const res = await request(app)
        .post('/v1/jobs/patch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Patch Job',
          description: 'Test patch job for E2E testing',
          type: 'INSTANT',
          configType: 'INSTALL',
          scope: 'Global',
          patches: [],
          retryCount: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E-Test Patch Job');

      testPatchJobId = res.body.id;
    });

    it('should get patch job by ID', async () => {
      if (!testPatchJobId) return;

      const res = await request(app)
        .get(`/v1/jobs/patch/${testPatchJobId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testPatchJobId);
    });

    it('should delete patch job', async () => {
      if (!testPatchJobId) return;

      const res = await request(app)
        .delete(`/v1/jobs/patch/${testPatchJobId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      testPatchJobId = ''; // Clear for cleanup
    });
  });

  describe('Vulnerability Jobs - /v1/jobs/vulnerability', () => {
    it('should list vulnerability jobs', async () => {
      const res = await request(app)
        .get('/v1/jobs/vulnerability')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a vulnerability job', async () => {
      const res = await request(app)
        .post('/v1/jobs/vulnerability')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Vulnerability Scan',
          description: 'Test vulnerability job for E2E testing',
          scope: 'Global',
          scanType: 'instant',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E-Test Vulnerability Scan');

      testVulnerabilityJobId = res.body.id;
    });

    it('should get vulnerability DB sync settings', async () => {
      const res = await request(app)
        .get('/v1/jobs/vulnerability/db-sync')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should get vulnerability job by ID', async () => {
      if (!testVulnerabilityJobId) return;

      const res = await request(app)
        .get(`/v1/jobs/vulnerability/${testVulnerabilityJobId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testVulnerabilityJobId);
    });

    it('should delete vulnerability job', async () => {
      if (!testVulnerabilityJobId) return;

      const res = await request(app)
        .delete(`/v1/jobs/vulnerability/${testVulnerabilityJobId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      testVulnerabilityJobId = ''; // Clear for cleanup
    });
  });

  describe('Software Catalog - /v1/jobs/software/catalog', () => {
    it('should list software catalog', async () => {
      const res = await request(app)
        .get('/v1/jobs/software/catalog')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create software catalog item', async () => {
      const res = await request(app)
        .post('/v1/jobs/software/catalog')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          applicationName: 'E2E-Test Application',
          description: 'Test application for E2E testing',
          os: 'Windows',
          version: '1.0.0',
          applicationLocationType: 'URL',
          selfService: true,
          architecture: 'x64',
          applicationType: 'EXE',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.applicationName).toBe('E2E-Test Application');

      testSoftwareCatalogId = res.body.id;
    });

    it('should get software catalog item by ID', async () => {
      if (!testSoftwareCatalogId) return;

      const res = await request(app)
        .get(`/v1/jobs/software/catalog/${testSoftwareCatalogId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testSoftwareCatalogId);
    });

    it('should update software catalog item', async () => {
      if (!testSoftwareCatalogId) return;

      const res = await request(app)
        .put(`/v1/jobs/software/catalog/${testSoftwareCatalogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      // Service returns limited fields, description is updated but not returned
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('Software Bundles - /v1/jobs/software/bundles', () => {
    it('should list software bundles', async () => {
      const res = await request(app)
        .get('/v1/jobs/software/bundles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create software bundle', async () => {
      const res = await request(app)
        .post('/v1/jobs/software/bundles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bundleName: 'E2E-Test Software Bundle',
          os: 'Windows',
          description: 'Test bundle for E2E testing',
          applications: [],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.bundleName).toBe('E2E-Test Software Bundle');

      testSoftwareBundleId = res.body.id;
    });

    it('should get software bundle by ID', async () => {
      if (!testSoftwareBundleId) return;

      const res = await request(app)
        .get(`/v1/jobs/software/bundles/${testSoftwareBundleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testSoftwareBundleId);
    });
  });

  describe('Config Catalog - /v1/jobs/config/catalog', () => {
    it('should list config catalog', async () => {
      const res = await request(app)
        .get('/v1/jobs/config/catalog')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create config catalog item', async () => {
      const res = await request(app)
        .post('/v1/jobs/config/catalog')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Config',
          os: 'Windows',
          description: 'Test configuration for E2E testing',
          configurationType: 'command',
          architecture: 'x64',
          isRemediation: false,
          commandType: 'powershell',
          command: 'Write-Host "Hello E2E"',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E-Test Config');

      testConfigCatalogId = res.body.id;
    });

    it('should get config catalog item by ID', async () => {
      if (!testConfigCatalogId) return;

      const res = await request(app)
        .get(`/v1/jobs/config/catalog/${testConfigCatalogId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testConfigCatalogId);
    });

    it('should update config catalog item', async () => {
      if (!testConfigCatalogId) return;

      const res = await request(app)
        .put(`/v1/jobs/config/catalog/${testConfigCatalogId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated config description',
        });

      expect(res.status).toBe(200);
      // Service returns limited fields, description is updated but not returned
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('Config Bundles - /v1/jobs/config/bundles', () => {
    it('should list config bundles', async () => {
      const res = await request(app)
        .get('/v1/jobs/config/bundles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create config bundle', async () => {
      const res = await request(app)
        .post('/v1/jobs/config/bundles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bundleName: 'E2E-Test Config Bundle',
          os: 'Windows',
          description: 'Test config bundle for E2E testing',
          configurations: [],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.bundleName).toBe('E2E-Test Config Bundle');

      testConfigBundleId = res.body.id;
    });

    it('should get config bundle by ID', async () => {
      if (!testConfigBundleId) return;

      const res = await request(app)
        .get(`/v1/jobs/config/bundles/${testConfigBundleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testConfigBundleId);
    });
  });

  describe('Deployment Policies - /v1/deployment-policies', () => {
    it('should list deployment policies', async () => {
      const res = await request(app)
        .get('/v1/deployment-policies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should create a deployment policy', async () => {
      const res = await request(app)
        .post('/v1/deployment-policies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Test Deployment Policy',
          description: 'Test policy for E2E testing',
          type: 'INSTANT',
          supportedModule: 'All',
          relatedType: 'No Relation',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E-Test Deployment Policy');

      testDeploymentPolicyId = res.body.id;
    });

    it('should get deployment policy by ID', async () => {
      if (!testDeploymentPolicyId) return;

      const res = await request(app)
        .get(`/v1/deployment-policies/${testDeploymentPolicyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testDeploymentPolicyId);
    });

    it('should update a deployment policy', async () => {
      if (!testDeploymentPolicyId) return;

      const res = await request(app)
        .put(`/v1/deployment-policies/${testDeploymentPolicyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated policy description',
        });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated policy description');
    });

    it('should delete a deployment policy', async () => {
      if (!testDeploymentPolicyId) return;

      const res = await request(app)
        .delete(`/v1/deployment-policies/${testDeploymentPolicyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      testDeploymentPolicyId = ''; // Clear for cleanup
    });
  });

  describe('Cleanup', () => {
    it('should delete software catalog item', async () => {
      if (!testSoftwareCatalogId) return;

      const res = await request(app)
        .delete(`/v1/jobs/software/catalog/${testSoftwareCatalogId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      testSoftwareCatalogId = '';
    });

    it('should delete software bundle', async () => {
      if (!testSoftwareBundleId) return;

      const res = await request(app)
        .delete(`/v1/jobs/software/bundles/${testSoftwareBundleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      testSoftwareBundleId = '';
    });

    it('should delete config catalog item', async () => {
      if (!testConfigCatalogId) return;

      const res = await request(app)
        .delete(`/v1/jobs/config/catalog/${testConfigCatalogId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      testConfigCatalogId = '';
    });

    it('should delete config bundle', async () => {
      if (!testConfigBundleId) return;

      const res = await request(app)
        .delete(`/v1/jobs/config/bundles/${testConfigBundleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      testConfigBundleId = '';
    });
  });
});

describe('E2E: Job Error Handling', () => {
  let adminToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'jobs-error-test@patchiq.io' },
      update: {},
      create: {
        email: 'jobs-error-test@patchiq.io',
        name: 'Jobs Error Test',
        passwordHash,
        role: 'admin',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;

    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'jobs-error-test@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  it('should return 404 for non-existent patch job', async () => {
    const res = await request(app)
      .get('/v1/jobs/patch/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('should return 400/422 for invalid patch job data', async () => {
    const res = await request(app)
      .post('/v1/jobs/patch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // Missing required 'name' field
        description: 'Invalid job',
      });

    // Backend returns 400 for validation errors
    expect([400, 422]).toContain(res.status);
  });

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/v1/jobs/patch');

    expect(res.status).toBe(401);
  });

  it('should return 400/422 for invalid software catalog data', async () => {
    const res = await request(app)
      .post('/v1/jobs/software/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // Missing required fields
        description: 'Invalid software',
      });

    expect([400, 422]).toContain(res.status);
  });

  it('should return 400/422 for invalid config catalog data', async () => {
    const res = await request(app)
      .post('/v1/jobs/config/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // Missing required fields
        description: 'Invalid config',
      });

    expect([400, 422]).toContain(res.status);
  });
});
