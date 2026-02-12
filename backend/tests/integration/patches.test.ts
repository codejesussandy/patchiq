import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { generateTestTokens, TEST_USER_ID, ensureTestUser } from '../utils/testHelpers';
import type { Application } from 'express';

describe('Patches API', () => {
  let app: Application;
  let authToken: string;

  beforeAll(async () => {
    app = createApp();
    await ensureTestUser();
    const tokens = generateTestTokens(TEST_USER_ID, 'admin');
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Patches CRUD', () => {
    let testPatchId: string;

    describe('POST /v1/patches', () => {
      it('should create a new patch with valid data', async () => {
        const patchData = {
          software: '2025-08 Cumulative Update for Windows 10',
          platform: 'Windows',
          severity: 'CRITICAL',
          category: 'Security Updates',
          bulletinId: 'MS25-001',
          kbNumber: 'KB5041571',
          publishedAt: '2025-08-13',
          architecture: '64 BIT',
          referenceUrl: 'https://support.microsoft.com/kb/5041571',
          languagesSupported: ['English'],
          tags: ['Security'],
          rebootRequired: true,
          supportUninstallation: false,
        };

        const response = await request(app)
          .post('/v1/patches')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patchData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.software).toBe(patchData.software);
        expect(response.body.patchId).toMatch(/ZPH-W-\d+/);
        testPatchId = response.body.id;
      });

      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/v1/patches')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should return 401 for unauthenticated requests', async () => {
        await request(app)
          .post('/v1/patches')
          .send({ software: 'Test' })
          .expect(401);
      });
    });

    describe('GET /v1/patches', () => {
      it('should return all patches', async () => {
        const response = await request(app)
          .get('/v1/patches')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('limit');
      });

      it('should filter patches by severity', async () => {
        const response = await request(app)
          .get('/v1/patches?severity=CRITICAL')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.every((p: any) => p.severity === 'CRITICAL')).toBe(true);
      });

      it('should search patches by software name', async () => {
        const response = await request(app)
          .get('/v1/patches?search=Windows')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.every((p: any) =>
          p.software?.toLowerCase().includes('windows') ||
          p.title?.toLowerCase().includes('windows') ||
          p.patchId?.toLowerCase().includes('windows')
        )).toBe(true);
      });

      it('should paginate results', async () => {
        const response = await request(app)
          .get('/v1/patches?page=1&limit=5')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.length).toBeLessThanOrEqual(5);
        expect(response.body.limit).toBe(5);
      });
    });

    describe('GET /v1/patches/:id', () => {
      it('should return patch by ID', async () => {
        const response = await request(app)
          .get(`/v1/patches/${testPatchId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.id).toBe(testPatchId);
      });

      it('should return 404 for non-existent patch', async () => {
        await request(app)
          .get('/v1/patches/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('PUT /v1/patches/:id', () => {
      it('should update patch successfully', async () => {
        const updateData = {
          severity: 'High',
          tags: ['Updated', 'Security'],
        };

        const response = await request(app)
          .put(`/v1/patches/${testPatchId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.severity).toBe('High');
        expect(response.body.tags).toContain('Updated');
      });

      it('should return 404 for non-existent patch', async () => {
        await request(app)
          .put('/v1/patches/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ severity: 'Low' })
          .expect(404);
      });
    });

    describe('DELETE /v1/patches/:id', () => {
      it('should return 404 for non-existent patch', async () => {
        await request(app)
          .delete('/v1/patches/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });

      it('should delete patch successfully', async () => {
        await request(app)
          .delete(`/v1/patches/${testPatchId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);

        // Verify deletion
        await request(app)
          .get(`/v1/patches/${testPatchId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });
  });

  describe('Test & Approve Workflow', () => {
    let testPatchId: string;

    beforeEach(async () => {
      // Create a test patch
      const patch = await prisma.patch.create({
        data: {
          patchId: `ZPH-T-${Date.now()}`,
          title: 'Test Patch for Workflow',
          software: 'Test Software',
          severity: 'CRITICAL',
          testStatus: 'Not Tested',
          approvalStatus: 'Pending',
        },
      });
      testPatchId = patch.id;
    });

    afterEach(async () => {
      await prisma.patch.deleteMany({
        where: { patchId: { startsWith: 'ZPH-T-' } },
      });
    });

    describe('POST /v1/patches/:id/test', () => {
      it('should mark patch as tested with pass', async () => {
        const response = await request(app)
          .post(`/v1/patches/${testPatchId}/test`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'passed',
            notes: 'Tested on 5 machines, no issues',
            testEnvironment: 'Windows 10 22H2',
          })
          .expect(200);

        expect(response.body.testStatus).toBe('Tested');
        expect(response.body.testResult).toBe('passed');
        expect(response.body.testedBy).toBeTruthy();
        expect(response.body.testedAt).toBeTruthy();
      });

      it('should mark patch as tested with fail', async () => {
        const response = await request(app)
          .post(`/v1/patches/${testPatchId}/test`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'FAILED',
            notes: 'Causes BSOD on certain configurations',
            testEnvironment: 'Windows Server 2019',
          })
          .expect(200);

        expect(response.body.testStatus).toBe('TEST_FAILED');
        expect(response.body.testResult).toBe('FAILED');
        // When test fails, approval should be automatically rejected
        expect(response.body.approvalStatus).toBe('REJECTED');
      });
    });

    describe('POST /v1/patches/:id/approve', () => {
      it('should approve a tested patch', async () => {
        // First mark the patch as tested
        await prisma.patch.update({
          where: { id: testPatchId },
          data: {
            testStatus: 'TESTED',
            testResult: 'PASSED',
          },
        });

        const response = await request(app)
          .post(`/v1/patches/${testPatchId}/approve`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.approvalStatus).toBe('APPROVED');
        expect(response.body.approvedBy).toBeTruthy();
        expect(response.body.approvedAt).toBeTruthy();
      });

      it('should reject approving untested patch', async () => {
        await request(app)
          .post(`/v1/patches/${testPatchId}/approve`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should reject approving failed test patch', async () => {
        // Mark the patch as failed
        await prisma.patch.update({
          where: { id: testPatchId },
          data: {
            testStatus: 'TESTED',
            testResult: 'FAILED',
          },
        });

        await request(app)
          .post(`/v1/patches/${testPatchId}/approve`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('POST /v1/patches/:id/reject', () => {
      it('should reject a patch with reason', async () => {
        const response = await request(app)
          .post(`/v1/patches/${testPatchId}/reject`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            reason: 'Known compatibility issues with our software',
            notes: 'Will re-evaluate after vendor fix',
          })
          .expect(200);

        expect(response.body.approvalStatus).toBe('REJECTED');
        expect(response.body.rejectionReason).toBe('Known compatibility issues with our software');
        expect(response.body.rejectedBy).toBeTruthy();
        expect(response.body.rejectedAt).toBeTruthy();
      });

      it('should require rejection reason', async () => {
        await request(app)
          .post(`/v1/patches/${testPatchId}/reject`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);
      });
    });
  });

  describe('Deployments', () => {
    let testPatchId: string;
    let testDeploymentId: string;

    beforeAll(async () => {
      // Create a test patch
      const patch = await prisma.patch.create({
        data: {
          patchId: `ZPH-D-${Date.now()}`,
          title: 'Test Patch for Deployment',
          software: 'Test Software',
          severity: 'CRITICAL',
          testStatus: 'TESTED',
          testResult: 'PASSED',
          approvalStatus: 'Approved',
        },
      });
      testPatchId = patch.id;
    });

    afterAll(async () => {
      await prisma.patchDeployment.deleteMany({
        where: { deploymentId: { startsWith: 'DEP-' } },
      });
      await prisma.patch.deleteMany({
        where: { patchId: { startsWith: 'ZPH-D-' } },
      });
    });

    describe('POST /v1/deployments', () => {
      it('should create deployment with patches', async () => {
        const deploymentData = {
          name: 'Critical Security Patches - Test',
          description: 'Deploy critical security patches',
          type: 'INSTALL',
          patches: [testPatchId],
        };

        const response = await request(app)
          .post('/v1/deployments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(deploymentData)
          .expect(201);

        expect(response.body.name).toBe(deploymentData.name);
        expect(response.body.deploymentId).toMatch(/DEP-\d+/);
        expect(response.body.status).toBe('IN_PROGRESS');
        testDeploymentId = response.body.id;
      });

      it('should auto-generate deployment ID', async () => {
        const deploymentData = {
          name: 'Test Deployment',
          type: 'INSTALL',
          patches: [testPatchId],
        };

        const response = await request(app)
          .post('/v1/deployments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(deploymentData)
          .expect(201);

        expect(response.body.deploymentId).toBeTruthy();
      });
    });

    describe('GET /v1/deployments', () => {
      it('should list deployments', async () => {
        const response = await request(app)
          .get('/v1/deployments')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
      });
    });

    describe('GET /v1/deployments/:id', () => {
      it('should return deployment by ID', async () => {
        const response = await request(app)
          .get(`/v1/deployments/${testDeploymentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.id).toBe(testDeploymentId);
      });
    });

    describe('GET /v1/deployments/:id/preview', () => {
      it('should return deployment preview', async () => {
        const response = await request(app)
          .get(`/v1/deployments/${testDeploymentId}/preview`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.deploymentId).toBe(testDeploymentId);
        expect(response.body).toHaveProperty('targetEndpoints');
        expect(response.body).toHaveProperty('estimatedDuration');
      });
    });
  });

  describe('Patch Tests', () => {
    let testPatchTestId: string;

    describe('POST /v1/patch-tests', () => {
      it('should create patch test configuration', async () => {
        const testData = {
          name: 'Engineering Dept Test',
          description: 'Test patches on engineering computers',
          applicationType: 'ALL',
          scope: 'SPECIFIC_GROUPS',
          groups: ['Engineering'],
        };

        const response = await request(app)
          .post('/v1/patch-tests')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testData)
          .expect(201);

        expect(response.body.name).toBe(testData.name);
        expect(response.body.status).toBe('Pending');
        testPatchTestId = response.body.id;
      });
    });

    describe('GET /v1/patch-tests', () => {
      it('should list patch tests', async () => {
        const response = await request(app)
          .get('/v1/patch-tests')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
      });
    });

    describe('PUT /v1/patch-tests/:id/approve', () => {
      it('should approve patch test', async () => {
        const response = await request(app)
          .put(`/v1/patch-tests/${testPatchTestId}/approve`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.status).toBe('APPROVED');
      });
    });

    describe('DELETE /v1/patch-tests/:id', () => {
      it('should delete patch test', async () => {
        await request(app)
          .delete(`/v1/patch-tests/${testPatchTestId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);
      });
    });
  });

  describe('Zero Touch Configs', () => {
    let testConfigId: string;

    describe('POST /v1/zero-touch-configs', () => {
      it('should create zero-touch configuration', async () => {
        const configData = {
          name: 'Auto-Deploy Critical Patches',
          description: 'Automatically deploy critical security patches',
          applicationType: 'ALL',
          scope: 'ALL_COMPUTERS',
          autoDeploymentRules: {
            severity: ['CRITICAL', 'High'],
            approvalRequired: false,
            schedule: 'Immediate',
          },
        };

        const response = await request(app)
          .post('/v1/zero-touch-configs')
          .set('Authorization', `Bearer ${authToken}`)
          .send(configData)
          .expect(201);

        expect(response.body.name).toBe(configData.name);
        expect(response.body.status).toBe('Active');
        testConfigId = response.body.id;
      });

      it('should validate auto-deployment rules', async () => {
        const invalidConfig = {
          name: 'Test',
          autoDeploymentRules: {
            // Missing required severity field
            schedule: 'Immediate',
            approvalRequired: false,
          },
        };

        await request(app)
          .post('/v1/zero-touch-configs')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidConfig)
          .expect(400);
      });
    });

    describe('GET /v1/zero-touch-configs', () => {
      it('should list zero touch configs', async () => {
        const response = await request(app)
          .get('/v1/zero-touch-configs')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
      });
    });

    describe('PUT /v1/zero-touch-configs/:id', () => {
      it('should update zero touch config', async () => {
        const response = await request(app)
          .put(`/v1/zero-touch-configs/${testConfigId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'Inactive',
          })
          .expect(200);

        expect(response.body.status).toBe('Inactive');
      });
    });

    describe('DELETE /v1/zero-touch-configs/:id', () => {
      it('should delete zero touch config', async () => {
        await request(app)
          .delete(`/v1/zero-touch-configs/${testConfigId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(204);
      });
    });
  });
});
