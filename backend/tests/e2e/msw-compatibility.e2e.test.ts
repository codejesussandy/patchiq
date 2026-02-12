import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { prisma } from '@db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = getTestApp();

/**
 * MSW Handler Compatibility Tests
 *
 * These tests verify that the backend API returns responses that match
 * the shape expected by the frontend MSW handlers. This ensures that
 * the frontend can switch from MSW to real API seamlessly.
 */
describe('E2E: MSW Handler Compatibility', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'msw-test-admin@patchiq.io' },
      update: {},
      create: {
        email: 'msw-test-admin@patchiq.io',
        name: 'MSW Test Admin',
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
      .send({ email: 'msw-test-admin@patchiq.io', password: 'admin123' });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('Auth Handlers Compatibility', () => {
    it('should match MSW login response shape', async () => {
      // Create test user or use existing
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'test@patchiq.io', password: 'test123' });

      // Match the MSW response shape
      if (res.status === 200) {
        expect(res.body).toEqual(
          expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            user: expect.objectContaining({
              id: expect.any(String),
              email: expect.any(String),
            }),
          })
        );
      } else {
        // Error response should also match MSW shape
        expect(res.body).toHaveProperty('error');
      }
    });

    it('should match MSW user/me response shape', async () => {
      const res = await request(app)
        .get('/v1/user/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          role: expect.any(String),
        })
      );
    });
  });

  describe('Agents Handlers Compatibility', () => {
    it('should match MSW agents list response shape', async () => {
      const res = await request(app)
        .get('/v1/agents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      if (res.body.length > 0) {
        expect(res.body[0]).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            machineId: expect.any(String),
            status: expect.stringMatching(/Connected|Disconnected|Pending|Error/),
          })
        );
      }
    });

    it('should match MSW agent detail response shape', async () => {
      const listRes = await request(app)
        .get('/v1/agents')
        .set('Authorization', `Bearer ${authToken}`);

      if (listRes.body.length > 0) {
        const agentId = listRes.body[0].id;
        const res = await request(app)
          .get(`/v1/agents/${agentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            machineId: expect.any(String),
            status: expect.stringMatching(/Connected|Disconnected|Pending|Error/),
            os: expect.any(String),
          })
        );
      }
    });
  });

  describe('Assets Handlers Compatibility', () => {
    it('should match MSW assets list response shape', async () => {
      const res = await request(app)
        .get('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Backend returns paginated response with flat pagination props
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('total');
    });
  });

  describe('Patches Handlers Compatibility', () => {
    it('should match MSW patches list response shape', async () => {
      const res = await request(app)
        .get('/v1/patches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Backend returns paginated response with flat pagination props
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('total');
    });
  });

  describe('Vulnerabilities Handlers Compatibility', () => {
    it('should match MSW vulnerabilities list response shape', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          total: expect.any(Number),
        })
      );

      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            cve: expect.any(String),
            severity: expect.stringMatching(/CRITICAL|HIGH|MEDIUM|LOW/),
          })
        );
      }
    });

    it('should match MSW zero-day response shape', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/zero-day')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          total: expect.any(Number),
        })
      );
    });

    it('should match MSW vulnerability stats response shape', async () => {
      const res = await request(app)
        .get('/v1/vulnerabilities/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            total: expect.any(Number),
            critical: expect.any(Number),
            high: expect.any(Number),
            medium: expect.any(Number),
            low: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('Dashboard Handlers Compatibility', () => {
    it('should match MSW dashboard response shape', async () => {
      const res = await request(app)
        .get('/v1/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('stats');
    });
  });

  describe('Reports Handlers Compatibility', () => {
    it('should match MSW reports list response shape', async () => {
      const res = await request(app)
        .get('/v1/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Backend returns paginated response or object with data array
      if (res.body.data) {
        expect(Array.isArray(res.body.data)).toBe(true);
      } else {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  describe('Settings Handlers Compatibility', () => {
    it('should match MSW organization settings response shape', async () => {
      const res = await request(app)
        .get('/v1/settings/organizations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Organizations list returns paginated response or array
      if (res.body.data) {
        expect(Array.isArray(res.body.data)).toBe(true);
      } else {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  describe('Error Response Compatibility', () => {
    it('should match MSW 404 error response shape', async () => {
      const res = await request(app)
        .get('/v1/agents/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should match MSW 401 error response shape', async () => {
      const res = await request(app).get('/v1/user/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should match MSW validation error response shape', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'invalid-email' });

      // Backend returns 400 for validation errors
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});

describe('E2E: API Contract Verification', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test admin user
    const passwordHash = await hashPassword('admin123');
    const user = await prisma.user.upsert({
      where: { email: 'contract-test-admin@patchiq.io' },
      update: {},
      create: {
        email: 'contract-test-admin@patchiq.io',
        name: 'Contract Test Admin',
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
      .send({ email: 'contract-test-admin@patchiq.io', password: 'admin123' });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.tag.deleteMany({ where: { name: { startsWith: 'msw-test-tag' } } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('Content-Type Headers', () => {
    it('should return JSON content type for all API responses', async () => {
      const endpoints = [
        '/v1/agents',
        '/v1/assets',
        '/v1/patches',
        '/v1/vulnerabilities',
        '/v1/dashboard',
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return correct status codes for CRUD operations', async () => {
      // Create - should return 201
      const createRes = await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `msw-test-tag-${Date.now()}`, color: '#000000' });

      expect(createRes.status).toBe(201);
      const tagId = createRes.body.id;

      // Read - should return 200
      const readRes = await request(app)
        .get(`/v1/tags/${tagId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(readRes.status).toBe(200);

      // Update - should return 200
      const updateRes = await request(app)
        .put(`/v1/tags/${tagId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `msw-test-tag-updated-${Date.now()}` });

      expect(updateRes.status).toBe(200);

      // Delete - should return 200 or 204
      const deleteRes = await request(app)
        .delete(`/v1/tags/${tagId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 204]).toContain(deleteRes.status);

      // Read after delete - should return 404
      const notFoundRes = await request(app)
        .get(`/v1/tags/${tagId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(notFoundRes.status).toBe(404);
    });
  });

  describe('Pagination', () => {
    it('should support pagination parameters', async () => {
      const res = await request(app)
        .get('/v1/assets?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Filtering', () => {
    it('should support filter parameters', async () => {
      const res = await request(app)
        .get('/v1/agents?status=Connected')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should support search parameters', async () => {
      const res = await request(app)
        .get('/v1/assets?search=laptop')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });
});
