import request from 'supertest';
import { Application } from 'express';
import { getTestApp, generateTestTokens, authenticatedRequest, TEST_USER_ID, ensureTestUser } from '../utils/testHelpers';
import { prisma } from '@/db/client';

describe('Vulnerabilities API', () => {
  let app: Application;
  let authToken: string;

  beforeAll(async () => {
    app = getTestApp();
    await ensureTestUser();
    const tokens = generateTestTokens(TEST_USER_ID, 'admin');
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /v1/vulnerabilities', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/v1/vulnerabilities');
      expect(response.status).toBe(401);
    });

    it('should return paginated vulnerabilities', async () => {
      const response = await authenticatedRequest(app, authToken).get('/v1/vulnerabilities');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by severity', async () => {
      const response = await authenticatedRequest(app, authToken).get(
        '/v1/vulnerabilities?severity=CRITICAL'
      );
      expect(response.status).toBe(200);
      response.body.data.forEach((vuln: { severity: string }) => {
        expect(vuln.severity).toBe('CRITICAL');
      });
    });

    it('should accept pagination parameters', async () => {
      const response = await authenticatedRequest(app, authToken).get(
        '/v1/vulnerabilities?page=1&limit=10'
      );
      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it('should filter by CVSS score range', async () => {
      const response = await authenticatedRequest(app, authToken).get(
        '/v1/vulnerabilities?cvss3Min=7.0&cvss3Max=9.0'
      );
      expect(response.status).toBe(200);
      response.body.data.forEach((vuln: { cvss3BaseScore: number }) => {
        expect(vuln.cvss3BaseScore).toBeGreaterThanOrEqual(7.0);
        expect(vuln.cvss3BaseScore).toBeLessThanOrEqual(9.0);
      });
    });

    it('should filter by exploitable flag', async () => {
      const response = await authenticatedRequest(app, authToken).get(
        '/v1/vulnerabilities?exploitable=true'
      );
      expect(response.status).toBe(200);
      response.body.data.forEach((vuln: { exploitable: boolean }) => {
        expect(vuln.exploitable).toBe(true);
      });
    });
  });

  describe('GET /v1/vulnerabilities/zero-day', () => {
    it('should return only zero-day vulnerabilities', async () => {
      const response = await authenticatedRequest(app, authToken).get(
        '/v1/vulnerabilities/zero-day'
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      response.body.data.forEach((vuln: { isZeroDay: boolean }) => {
        expect(vuln.isZeroDay).toBe(true);
      });
    });

    it('should filter zero-day by severity', async () => {
      const response = await authenticatedRequest(app, authToken).get(
        '/v1/vulnerabilities/zero-day?severity=CRITICAL'
      );
      expect(response.status).toBe(200);
      response.body.data.forEach((vuln: { severity: string; isZeroDay: boolean }) => {
        expect(vuln.severity).toBe('CRITICAL');
        expect(vuln.isZeroDay).toBe(true);
      });
    });
  });

  describe('GET /v1/vulnerabilities/stats', () => {
    it('should return vulnerability statistics', async () => {
      const response = await authenticatedRequest(app, authToken).get('/v1/vulnerabilities/stats');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('critical');
      expect(response.body.data).toHaveProperty('high');
      expect(response.body.data).toHaveProperty('medium');
      expect(response.body.data).toHaveProperty('low');
      expect(response.body.data).toHaveProperty('zeroDayCount');
      expect(response.body.data).toHaveProperty('exceptionsCount');
      expect(response.body.data).toHaveProperty('publishedStats');
      expect(Array.isArray(response.body.data.publishedStats)).toBe(true);
    });
  });

  describe('GET /v1/vulnerabilities/types', () => {
    it('should return vulnerability type counts', async () => {
      const response = await authenticatedRequest(app, authToken).get('/v1/vulnerabilities/types');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should have zero-day, known, and exploitable types
      const typeIds = response.body.data.map((t: { id: string }) => t.id);
      expect(typeIds).toContain('zero-day');
      expect(typeIds).toContain('known');
      expect(typeIds).toContain('exploitable');
    });
  });

  describe('GET /v1/vulnerabilities/endpoints', () => {
    it('should return endpoint vulnerabilities with severity stats', async () => {
      const response = await authenticatedRequest(app, authToken).get(
        '/v1/vulnerabilities/endpoints'
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('severityStats');
      expect(response.body.severityStats).toHaveProperty('critical');
      expect(response.body.severityStats).toHaveProperty('high');
      expect(response.body.severityStats).toHaveProperty('medium');
      expect(response.body.severityStats).toHaveProperty('low');
    });
  });

  describe('GET /v1/vulnerabilities/network', () => {
    it('should return network vulnerabilities with severity stats', async () => {
      const response = await authenticatedRequest(app, authToken).get(
        '/v1/vulnerabilities/network'
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('severityStats');
    });
  });

  describe('GET /v1/vulnerabilities/:id', () => {
    it('should return 404 for non-existent vulnerability', async () => {
      const response = await authenticatedRequest(app, authToken).get(
        '/v1/vulnerabilities/non-existent-id'
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Exceptions Management', () => {
    describe('GET /v1/vulnerabilities/exceptions', () => {
      it('should return list of exceptions', async () => {
        const response = await authenticatedRequest(app, authToken).get(
          '/v1/vulnerabilities/exceptions'
        );
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('POST /v1/vulnerabilities/exceptions', () => {
      it('should return 400 for empty vulnerability IDs', async () => {
        const response = await request(app)
          .post('/v1/vulnerabilities/exceptions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vulnerabilityIds: [],
            exceptionType: 'Acceptable Risk',
            reasonForExclusion: 'Test reason',
          });
        expect(response.status).toBe(400);
      });

      it('should return 400 for invalid exception type', async () => {
        const response = await request(app)
          .post('/v1/vulnerabilities/exceptions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            vulnerabilityIds: ['test-vuln-id'],
            exceptionType: 'Invalid Type',
            reasonForExclusion: 'Test reason',
          });
        expect(response.status).toBe(400);
      });
    });

    describe('PUT /v1/vulnerabilities/exceptions/:id', () => {
      it('should return 404 for non-existent exception', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .put(`/v1/vulnerabilities/exceptions/${fakeUUID}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            exceptionType: 'Not Applicable',
          });
        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /v1/vulnerabilities/exceptions/:id', () => {
      it('should return 404 for non-existent exception', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const response = await authenticatedRequest(app, authToken).delete(
          `/v1/vulnerabilities/exceptions/${fakeUUID}`
        );
        expect(response.status).toBe(404);
      });
    });
  });

  describe('POST /v1/vulnerabilities/scan', () => {
    it('should initiate a vulnerability scan', async () => {
      const response = await request(app)
        .post('/v1/vulnerabilities/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scope: 'all' });
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'initiated');
      expect(response.body).toHaveProperty('message');
    });

    it('should accept selected endpoint scan', async () => {
      const response = await request(app)
        .post('/v1/vulnerabilities/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scope: 'selected',
          endpointIds: ['endpoint-1', 'endpoint-2'],
        });
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId');
    });
  });

  describe('CVE-specific routes', () => {
    describe('GET /v1/vulnerabilities/:cve/endpoints', () => {
      it('should return 400 for invalid CVE format', async () => {
        const response = await authenticatedRequest(app, authToken).get(
          '/v1/vulnerabilities/invalid-cve/endpoints'
        );
        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent CVE', async () => {
        const response = await authenticatedRequest(app, authToken).get(
          '/v1/vulnerabilities/CVE-9999-99999/endpoints'
        );
        expect(response.status).toBe(404);
      });
    });

    describe('GET /v1/vulnerabilities/:cve/software', () => {
      it('should return 400 for invalid CVE format', async () => {
        const response = await authenticatedRequest(app, authToken).get(
          '/v1/vulnerabilities/invalid-cve/software'
        );
        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent CVE', async () => {
        const response = await authenticatedRequest(app, authToken).get(
          '/v1/vulnerabilities/CVE-9999-99999/software'
        );
        expect(response.status).toBe(404);
      });
    });
  });
});
