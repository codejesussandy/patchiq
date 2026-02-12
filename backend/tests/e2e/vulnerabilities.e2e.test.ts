import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { prisma } from '@db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = getTestApp();

describe('E2E: Vulnerability Management', () => {
  let adminToken: string;
  let testUserId: string;
  let testVulnerabilityId: string;
  let testExceptionId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'vuln-test-admin@patchiq.io' },
      update: {},
      create: {
        email: 'vuln-test-admin@patchiq.io',
        name: 'Vuln Test Admin',
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
      .send({ email: 'vuln-test-admin@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;

    // Ensure we have at least one vulnerability for testing
    const vuln = await prisma.vulnerability.create({
      data: {
        cveId: `CVE-E2E-${Date.now()}`,
        title: 'E2E Test Vulnerability',
        description: 'A test vulnerability for E2E testing',
        severity: 'HIGH',
        cvss3BaseScore: 8.5,
        epss: 45.5,
        exploitable: true,
        publishedDate: new Date(),
        riskScore: 85,
        isZeroDay: false,
      },
    });
    testVulnerabilityId = vuln.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.vulnerabilityException.deleteMany({
      where: { vulnerability: { cveId: { startsWith: 'CVE-E2E' } } },
    });
    await prisma.vulnerability.deleteMany({
      where: { cveId: { startsWith: 'CVE-E2E' } },
    });
    // Cleanup test user
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('Vulnerabilities List', () => {
    it('should list all vulnerabilities', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter vulnerabilities by severity', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities?severity=HIGH')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');

      // All returned vulnerabilities should be HIGH severity
      res.body.data.forEach((vuln: any) => {
        expect(vuln.severity).toBe('HIGH');
      });
    });

    it('should search vulnerabilities by CVE', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities?search=CVE-E2E')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('Zero-Day Vulnerabilities', () => {
    let zeroDayVulnId: string;

    beforeAll(async () => {
      const vuln = await prisma.vulnerability.create({
        data: {
          cveId: `CVE-E2E-ZERODAY-${Date.now()}`,
          title: 'E2E Zero-Day Vulnerability',
          description: 'A zero-day vulnerability for testing',
          severity: 'CRITICAL',
          cvss3BaseScore: 9.8,
          epss: 95.0,
          exploitable: true,
          publishedDate: new Date(),
          riskScore: 95,
          isZeroDay: true,
        },
      });
      zeroDayVulnId = vuln.id;
    });

    it('should list zero-day vulnerabilities', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/zero-day')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('should filter zero-day vulnerabilities by severity', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/zero-day?severity=CRITICAL')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    afterAll(async () => {
      await prisma.vulnerability.delete({ where: { id: zeroDayVulnId } }).catch(() => {});
    });
  });

  describe('Vulnerability Details', () => {
    it('should get vulnerability by ID', async () => {
      const res = await request(app)
        .get(`/v1/vulnerabilities/${testVulnerabilityId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testVulnerabilityId);
      expect(res.body).toHaveProperty('cve');
      expect(res.body).toHaveProperty('severity');
      expect(res.body).toHaveProperty('cvss3BaseScore');
    });

    it('should return 404 for non-existent vulnerability', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Vulnerability Exceptions', () => {
    it('should list all exceptions', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/exceptions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('should create an exception', async () => {
      const res = await request(app)
        .post('/v1/vulnerabilities/exceptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vulnerabilityIds: [testVulnerabilityId],
          exceptionType: 'ACCEPTABLE_RISK',  // Valid enum value
          reasonForExclusion: 'Mitigating controls in place',
          scope: 'GLOBAL',  // Valid enum value
          source: 'VULNERABILITIES',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      testExceptionId = res.body.data[0].id;
    });

    it('should update an exception', async () => {
      if (!testExceptionId) return;

      const res = await request(app)
        .put(`/v1/vulnerabilities/exceptions/${testExceptionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reasonForExclusion: 'Updated reason: Additional controls implemented',
        });

      expect(res.status).toBe(200);
      expect(res.body.reasonForExclusion).toContain('Updated reason');
    });

    it('should delete exception and restore vulnerability', async () => {
      if (!testExceptionId) return;

      const res = await request(app)
        .delete(`/v1/vulnerabilities/exceptions/${testExceptionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 200 or 204 are both valid for successful DELETE
      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Vulnerability Statistics', () => {
    it('should get vulnerability statistics', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('critical');
      expect(res.body.data).toHaveProperty('high');
      expect(res.body.data).toHaveProperty('medium');
      expect(res.body.data).toHaveProperty('low');
    });

    it('should get vulnerability types', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Endpoint Vulnerabilities', () => {
    it('should get endpoint vulnerabilities', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/endpoints')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('severityStats');
    });
  });

  describe('Network Vulnerabilities', () => {
    it('should get network vulnerabilities', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/network')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });
});

describe('E2E: Vulnerability Error Handling', () => {
  let adminToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'vuln-error-test@patchiq.io' },
      update: {},
      create: {
        email: 'vuln-error-test@patchiq.io',
        name: 'Vuln Error Test',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;

    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'vuln-error-test@patchiq.io', password: 'admin123' });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/v1/vulnerabilities');

    expect(res.status).toBe(401);
  });

  it('should return 400/422 for invalid exception data', async () => {
    const res = await request(app)
      .post('/v1/vulnerabilities/exceptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // Missing required fields
        exceptionType: 'Risk Accepted',
      });

    // Backend returns 400 for validation errors
    expect([400, 422]).toContain(res.status);
  });
});
