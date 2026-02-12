import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { prisma } from '@db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = getTestApp();

describe('E2E: Complete User Journey', () => {
  let authToken: string;
  let refreshToken: string;
  let testUserId: string;
  let testAgentId: string;
  let agentAccessToken: string;
  let testAssetId: string;
  let testPatchId: string;
  let testDeploymentId: string;

  const testUserEmail = 'e2e-workflow@patchiq.io';
  const testUserPassword = 'E2EWorkflow123!';

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword(testUserPassword);
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'E2E Workflow User',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup all test data
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.agent.deleteMany({ where: { machineId: { startsWith: 'E2E-WORKFLOW' } } });
    await prisma.asset.deleteMany({ where: { name: { startsWith: 'E2E-Workflow' } } });
    await prisma.patch.deleteMany({ where: { patchId: { startsWith: 'E2E-WORKFLOW' } } });
    await prisma.patchDeployment.deleteMany({ where: { name: { startsWith: 'E2E-Workflow' } } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('Phase 1: Authentication', () => {
    it('should login successfully', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');

      authToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should access protected resources', async () => {
      const res = await request(app)
        .get('/v1/user/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testUserEmail);
    });
  });

  describe('Phase 2: Dashboard Overview', () => {
    it('should view dashboard statistics', async () => {
      const res = await request(app)
        .get('/v1/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('stats');
    });

    it('should view dashboard stats', async () => {
      const res = await request(app)
        .get('/v1/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Phase 3: Agent Registration & Management', () => {
    it('should register a new agent', async () => {
      const res = await request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '2.1.0')
        .send({
          machineId: `E2E-WORKFLOW-${Date.now()}`,
          hostname: 'e2e-workflow-host',
          os: 'Windows',
          osVersion: '11',
          architecture: 'x64',
          agentVersion: '2.1.0',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('agentId');
      expect(res.body).toHaveProperty('accessToken');

      testAgentId = res.body.agentId;
      agentAccessToken = res.body.accessToken;
      testAssetId = res.body.assetId;
    });

    it('should send agent heartbeat', async () => {
      const res = await request(app)
        .post('/api/agent/heartbeat')
        .set('Authorization', `Bearer ${agentAccessToken}`)
        .set('X-Agent-Id', testAgentId)
        .send({
          timestamp: new Date().toISOString(),
          status: 'healthy',
          uptime: 3600,
          agentUptime: 60,
          cpuUsage: 20,
          memoryUsage: 50,
          diskUsage: 60,
          pendingReboot: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.acknowledged).toBe(true);
    });

    it('should see agent in list', async () => {
      const res = await request(app)
        .get('/v1/agents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const agent = res.body.find((a: any) => a.id === testAgentId);
      expect(agent).toBeDefined();
      expect(agent.status).toBe('CONNECTED');
    });
  });

  describe('Phase 4: Asset Management', () => {
    it('should view assets list', async () => {
      const res = await request(app)
        .get('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Assets returns paginated response with data array
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should view asset details', async () => {
      // First, get an asset ID
      const listRes = await request(app)
        .get('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`);

      if (listRes.body.data && listRes.body.data.length > 0) {
        const assetId = listRes.body.data[0].id;
        const res = await request(app)
          .get(`/v1/assets/${assetId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
      }
    });
  });

  describe('Phase 5: Vulnerability Assessment', () => {
    it('should view vulnerabilities', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('should filter critical vulnerabilities', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities?severity=CRITICAL')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should view vulnerability statistics', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('Phase 6: Patch Management Workflow', () => {
    it('should view patches list', async () => {
      const res = await request(app)
        .get('/v1/patches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should create a patch', async () => {
      const res = await request(app)
        .post('/v1/patches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          software: `E2E-WORKFLOW-Software-${Date.now()}`,
          title: 'E2E Workflow Security Update',
          description: 'Test patch for E2E workflow',
          severity: 'High',
          publishedAt: new Date().toISOString(),
          rebootRequired: true,
          os: 'Windows',
          category: 'Security',
        });

      expect(res.status).toBe(201);
      testPatchId = res.body.id;
    });

    it('should test the patch', async () => {
      // Skip if patch wasn't created
      if (!testPatchId) {
        console.warn('Skipping patch test - patch not created');
        return;
      }

      const res = await request(app)
        .post(`/v1/patches/${testPatchId}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'passed',
          notes: 'Tested successfully in E2E workflow',
        });

      expect(res.status).toBe(200);
    });

    it('should approve the patch', async () => {
      // Skip if patch wasn't created
      if (!testPatchId) {
        console.warn('Skipping patch approval - patch not created');
        return;
      }

      const res = await request(app)
        .post(`/v1/patches/${testPatchId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.approvalStatus).toBe('APPROVED');
    });

    it('should create a deployment', async () => {
      // Skip if patch wasn't created
      if (!testPatchId) {
        console.warn('Skipping deployment creation - patch not created');
        return;
      }

      const res = await request(app)
        .post('/v1/deployments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E-Workflow Deployment',
          type: 'INSTALL',
          scope: 'ENDPOINT',
          patches: [testPatchId],
        });

      expect(res.status).toBe(201);
      testDeploymentId = res.body.id;
    });

    it('should view deployment status', async () => {
      // Skip if deployment wasn't created
      if (!testDeploymentId) {
        console.warn('Skipping deployment status - deployment not created');
        return;
      }

      const res = await request(app)
        .get(`/v1/deployments/${testDeploymentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Phase 7: Reporting', () => {
    it('should generate a report', async () => {
      const res = await request(app)
        .post('/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Workflow Report',
          type: 'Vulnerability',
          format: 'CSV',
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        });

      expect(res.status).toBe(201);
    });

    it('should view reports list', async () => {
      const res = await request(app)
        .get('/v1/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Phase 8: Settings', () => {
    it('should view organizations list', async () => {
      const res = await request(app)
        .get('/v1/settings/organizations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should view user list', async () => {
      const res = await request(app)
        .get('/v1/settings/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Phase 9: Discovery', () => {
    it('should view discovered devices', async () => {
      const res = await request(app)
        .get('/v1/discovery/devices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Phase 10: Session Management', () => {
    it('should refresh token', async () => {
      if (!refreshToken) return;

      const res = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      authToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should logout successfully', async () => {
      if (!authToken) return;

      const res = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject requests after logout', async () => {
      if (!refreshToken) return;

      const res = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
    });
  });
});

describe('E2E: Security Workflow - Zero Day Response', () => {
  let adminToken: string;

  beforeAll(async () => {
    // Login as admin
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });

    if (loginRes.status === 200) {
      adminToken = loginRes.body.accessToken;
    } else {
      // Create admin if doesn't exist
      const passwordHash = await hashPassword('admin123');
      await prisma.user.upsert({
        where: { email: 'admin@patchiq.io' },
        update: {},
        create: {
          email: 'admin@patchiq.io',
          name: 'Admin',
          passwordHash,
          role: 'ADMIN',
          isActive: true,
          isOnboarded: true,
        },
      });

      const retryRes = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'admin@patchiq.io', password: 'admin123' });

      adminToken = retryRes.body.accessToken;
    }
  });

  it('should complete full zero-day response workflow', async () => {
    // 1. Detect zero-day vulnerabilities
    const zeroDayRes = await request(app)
      .get('/v1/vulnerabilities/zero-day')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(zeroDayRes.status).toBe(200);

    // 2. View affected endpoints
    const endpointsRes = await request(app)
      .get('/v1/vulnerabilities/endpoints')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(endpointsRes.status).toBe(200);

    // 3. Check for available patches
    const patchesRes = await request(app)
      .get('/v1/patches')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(patchesRes.status).toBe(200);

    // 4. View dashboard for overview
    const dashboardRes = await request(app)
      .get('/v1/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashboardRes.status).toBe(200);

    // 5. Generate security report
    const reportRes = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Zero-Day Response Report',
        type: 'Vulnerability',
        format: 'PDF',
      });

    expect(reportRes.status).toBe(201);
  });
});

describe('E2E: Compliance Workflow', () => {
  let adminToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });

    if (loginRes.status === 200) {
      adminToken = loginRes.body.accessToken;
    }
  });

  it('should complete compliance assessment workflow', async () => {
    // Skip if login failed
    if (!adminToken) {
      console.warn('Skipping compliance workflow - admin login failed');
      return;
    }

    // 1. Get overall patch compliance
    const dashboardRes = await request(app)
      .get('/v1/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashboardRes.status).toBe(200);

    // 2. View assets with missing patches
    const assetsRes = await request(app)
      .get('/v1/assets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(assetsRes.status).toBe(200);

    // 3. View vulnerability statistics
    const vulnStatsRes = await request(app)
      .get('/v1/vulnerabilities/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(vulnStatsRes.status).toBe(200);

    // 4. Generate compliance report
    const reportRes = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Compliance Assessment Report',
        type: 'Compliance',
        format: 'PDF',
      });

    expect(reportRes.status).toBe(201);
  });
});
