// @ts-nocheck
/**
 * Integration tests for /v1/dashboard endpoints
 */
import { getAgent, getAdminToken } from './test-setup';

describe('Dashboard API - /v1/dashboard', () => {
  let adminToken;
  let agent;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();
  });

  describe('GET /v1/dashboard', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns complete dashboard data', async () => {
      const res = await agent
        .get('/v1/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /v1/dashboard/stats', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/dashboard/stats');
      expect(res.status).toBe(401);
    });

    it('returns statistics summary', async () => {
      const res = await agent
        .get('/v1/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /v1/dashboard/compliance', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/dashboard/compliance');
      expect(res.status).toBe(401);
    });

    it('returns patch compliance data', async () => {
      const res = await agent
        .get('/v1/dashboard/compliance')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /v1/dashboard/top-vulnerabilities', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/dashboard/top-vulnerabilities');
      expect(res.status).toBe(401);
    });

    it('returns top vulnerabilities', async () => {
      const res = await agent
        .get('/v1/dashboard/top-vulnerabilities')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data) || res.body.data !== undefined).toBe(true);
    });

    it('accepts limit query param', async () => {
      const res = await agent
        .get('/v1/dashboard/top-vulnerabilities?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/dashboard/charts/patches', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/dashboard/charts/patches');
      expect(res.status).toBe(401);
    });

    it('returns patch distribution chart data', async () => {
      const res = await agent
        .get('/v1/dashboard/charts/patches')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /v1/dashboard/charts/assets', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/dashboard/charts/assets');
      expect(res.status).toBe(401);
    });

    it('returns asset status chart data', async () => {
      const res = await agent
        .get('/v1/dashboard/charts/assets')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /v1/dashboard/charts/vulnerabilities', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/dashboard/charts/vulnerabilities');
      expect(res.status).toBe(401);
    });

    it('returns vulnerability trends chart data', async () => {
      const res = await agent
        .get('/v1/dashboard/charts/vulnerabilities')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /v1/dashboard/agents', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/dashboard/agents');
      expect(res.status).toBe(401);
    });

    it('returns agent connectivity data', async () => {
      const res = await agent
        .get('/v1/dashboard/agents')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /v1/dashboard/recent-activity', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/dashboard/recent-activity');
      expect(res.status).toBe(401);
    });

    it('returns recent activity feed', async () => {
      const res = await agent
        .get('/v1/dashboard/recent-activity')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data) || res.body.data !== undefined).toBe(true);
    });

    it('accepts limit query param', async () => {
      const res = await agent
        .get('/v1/dashboard/recent-activity?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /v1/dashboard/refresh', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.post('/v1/dashboard/refresh');
      expect(res.status).toBe(401);
    });

    it('refreshes dashboard data', async () => {
      const res = await agent
        .post('/v1/dashboard/refresh')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
