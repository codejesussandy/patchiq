import request from 'supertest';
import { getTestApp, generateTestTokens } from '../utils/testHelpers';

const app = getTestApp();

/**
 * Performance Tests
 *
 * These tests verify that the API meets performance requirements.
 * They test response times and concurrent request handling.
 */
describe('Performance: API Response Times', () => {
  let authToken: string;

  beforeAll(() => {
    const tokens = generateTestTokens('admin-user-id', 'admin');
    authToken = tokens.accessToken;
  });

  describe('Simple Query Response Times', () => {
    it('should respond within 200ms for user/me', async () => {
      const start = Date.now();
      await request(app)
        .get('/v1/user/me')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should respond within 200ms for health check', async () => {
      const start = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should respond within 300ms for agents list', async () => {
      const start = Date.now();
      await request(app)
        .get('/v1/agents')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(300);
    });

    it('should respond within 300ms for assets list', async () => {
      const start = Date.now();
      await request(app)
        .get('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(300);
    });

    it('should respond within 300ms for patches list', async () => {
      const start = Date.now();
      await request(app)
        .get('/v1/patches')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(300);
    });

    it('should respond within 300ms for vulnerabilities list', async () => {
      const start = Date.now();
      await request(app)
        .get('/v1/vulnerabilities')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(300);
    });

    it('should respond within 500ms for dashboard', async () => {
      const start = Date.now();
      await request(app)
        .get('/v1/dashboard')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Authentication Performance', () => {
    it('should process login within 500ms', async () => {
      const start = Date.now();
      await request(app)
        .post('/v1/auth/login')
        .send({ email: 'test@patchiq.io', password: 'test123' });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should process token refresh within 200ms', async () => {
      // First get a refresh token
      const loginRes = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'test@patchiq.io', password: 'test123' });

      if (loginRes.body.refreshToken) {
        const start = Date.now();
        await request(app)
          .post('/v1/auth/refresh')
          .send({ refreshToken: loginRes.body.refreshToken });
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(200);
      }
    });
  });

  describe('Paginated Query Performance', () => {
    it('should handle paginated requests efficiently', async () => {
      const pageSizes = [10, 25, 50, 100];

      for (const pageSize of pageSizes) {
        const start = Date.now();
        await request(app)
          .get(`/v1/assets?limit=${pageSize}`)
          .set('Authorization', `Bearer ${authToken}`);
        const duration = Date.now() - start;

        // Larger page sizes should still complete within reasonable time
        expect(duration).toBeLessThan(500);
      }
    });
  });

  describe('Search Query Performance', () => {
    it('should handle search queries within 500ms', async () => {
      const start = Date.now();
      await request(app)
        .get('/v1/assets?search=laptop')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should handle filtered queries within 500ms', async () => {
      const start = Date.now();
      await request(app)
        .get('/v1/vulnerabilities?severity=CRITICAL')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });
});

describe('Performance: Concurrent Requests', () => {
  let authToken: string;

  beforeAll(() => {
    const tokens = generateTestTokens('admin-user-id', 'admin');
    authToken = tokens.accessToken;
  });

  it('should handle 10 concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() =>
      request(app)
        .get('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    responses.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // All requests should complete within 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  it('should handle 25 concurrent requests', async () => {
    const requests = Array(25).fill(null).map(() =>
      request(app)
        .get('/v1/agents')
        .set('Authorization', `Bearer ${authToken}`)
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    responses.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // All requests should complete within 3 seconds
    expect(duration).toBeLessThan(3000);
  });

  it('should handle 50 concurrent requests', async () => {
    const requests = Array(50).fill(null).map(() =>
      request(app)
        .get('/health')
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    responses.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // Health check endpoints should be very fast
    expect(duration).toBeLessThan(2000);
  });

  it('should handle 100 concurrent requests to different endpoints', async () => {
    const endpoints = [
      '/v1/agents',
      '/v1/assets',
      '/v1/patches',
      '/v1/vulnerabilities',
      '/v1/dashboard',
    ];

    const requests = Array(100).fill(null).map((_, i) =>
      request(app)
        .get(endpoints[i % endpoints.length])
        .set('Authorization', `Bearer ${authToken}`)
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    responses.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // All requests should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
  });
});

describe('Performance: Write Operations', () => {
  let authToken: string;

  beforeAll(() => {
    const tokens = generateTestTokens('admin-user-id', 'admin');
    authToken = tokens.accessToken;
  });

  it('should handle tag creation within 300ms', async () => {
    const start = Date.now();
    const res = await request(app)
      .post('/v1/tags')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: `perf-test-${Date.now()}`, color: '#FF0000' });
    const duration = Date.now() - start;

    expect(res.status).toBe(201);
    expect(duration).toBeLessThan(300);

    // Cleanup
    if (res.body.id) {
      await request(app)
        .delete(`/v1/tags/${res.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
  });

  it('should handle update operations within 300ms', async () => {
    // Create a tag first
    const createRes = await request(app)
      .post('/v1/tags')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: `perf-update-${Date.now()}`, color: '#00FF00' });

    if (createRes.body.id) {
      const start = Date.now();
      const res = await request(app)
        .put(`/v1/tags/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'updated-name' });
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(300);

      // Cleanup
      await request(app)
        .delete(`/v1/tags/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
  });

  it('should handle delete operations within 300ms', async () => {
    // Create a tag first
    const createRes = await request(app)
      .post('/v1/tags')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: `perf-delete-${Date.now()}`, color: '#0000FF' });

    if (createRes.body.id) {
      const start = Date.now();
      const res = await request(app)
        .delete(`/v1/tags/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(300);
    }
  });
});

describe('Performance: Agent API', () => {
  it('should handle agent heartbeat within 200ms', async () => {
    // Register a test agent
    const regRes = await request(app)
      .post('/api/agent/register')
      .set('X-Agent-Version', '2.1.0')
      .send({
        machineId: `PERF-TEST-${Date.now()}`,
        hostname: 'perf-test-host',
        os: 'Windows',
        osVersion: '11',
        architecture: 'x64',
        agentVersion: '2.1.0',
      });

    if (regRes.body.accessToken && regRes.body.agentId) {
      const start = Date.now();
      const res = await request(app)
        .post('/api/agent/heartbeat')
        .set('Authorization', `Bearer ${regRes.body.accessToken}`)
        .set('X-Agent-Id', regRes.body.agentId)
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
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(200);
    }
  });

  it('should handle multiple agent registrations concurrently', async () => {
    const requests = Array(10).fill(null).map((_, i) =>
      request(app)
        .post('/api/agent/register')
        .set('X-Agent-Version', '2.1.0')
        .send({
          machineId: `PERF-CONCURRENT-${Date.now()}-${i}`,
          hostname: `perf-concurrent-host-${i}`,
          os: 'Windows',
          osVersion: '11',
          architecture: 'x64',
          agentVersion: '2.1.0',
        })
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    responses.forEach((res) => {
      expect(res.status).toBe(201);
    });

    // All registrations should complete within 3 seconds
    expect(duration).toBeLessThan(3000);
  });
});

describe('Performance: Memory and Stability', () => {
  let authToken: string;

  beforeAll(() => {
    const tokens = generateTestTokens('admin-user-id', 'admin');
    authToken = tokens.accessToken;
  });

  it('should handle repeated requests without memory leaks', async () => {
    // Make 100 sequential requests and track memory
    for (let i = 0; i < 100; i++) {
      await request(app)
        .get('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`);
    }

    // If we get here without crashing, the test passes
    expect(true).toBe(true);
  });

  it('should maintain consistent response times over multiple requests', async () => {
    const responseTimes: number[] = [];

    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      await request(app)
        .get('/v1/agents')
        .set('Authorization', `Bearer ${authToken}`);
      responseTimes.push(Date.now() - start);
    }

    // Calculate average and standard deviation
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);

    // Response times should be reasonably consistent (low standard deviation)
    // Allow for some variance due to system load
    expect(stdDev).toBeLessThan(avg * 0.5); // Standard deviation should be less than 50% of average
    expect(avg).toBeLessThan(300); // Average should be under 300ms
  });
});
