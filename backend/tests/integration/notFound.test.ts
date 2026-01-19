import request from 'supertest';
import { getTestApp, generateTestTokens, TEST_USER_ID, ensureTestUser } from '../utils/testHelpers';

describe('Not Found Handler', () => {
  const app = getTestApp();
  let authToken: string;

  beforeAll(async () => {
    await ensureTestUser();
    const tokens = generateTestTokens(TEST_USER_ID, 'admin');
    authToken = tokens.accessToken;
  });

  describe('Unknown Routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'NotFound');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for unknown API routes', async () => {
      // Use authentication since /v1/* routes require auth before checking route existence
      const response = await request(app)
        .get('/v1/unknown-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'NotFound');
    });

    it('should return 404 for all HTTP methods on unknown routes', async () => {
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;

      for (const method of methods) {
        const response = await request(app)[method]('/non-existent-path');
        expect(response.status).toBe(404);
      }
    });
  });
});
