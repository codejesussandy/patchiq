import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';

describe('API Version', () => {
  const app = getTestApp();

  describe('GET /v1', () => {
    it('should return API info', async () => {
      const response = await request(app).get('/v1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'PatchIQ API');
      expect(response.body).toHaveProperty('version', 'v1');
      expect(response.body).toHaveProperty('documentation');
    });
  });
});
