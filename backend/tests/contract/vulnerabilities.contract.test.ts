import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { validateContract } from './schemas/response-helpers';
import { vulnerabilityItemSchema, vulnerabilityStatsSchema } from './schemas/vulnerabilities.schema';

const app = getTestApp();

describe('Contract: Vulnerabilities', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });
    accessToken = res.body.data?.accessToken || res.body.accessToken;
  });

  // 13. GET /v1/vulnerabilities — list
  it('should return valid vulnerabilities list', async () => {
    const res = await request(app)
      .get('/v1/vulnerabilities')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const dataArray = Array.isArray(body.data) ? body.data : body.data?.data || [];
    expect(Array.isArray(dataArray)).toBe(true);

    if (dataArray.length > 0) {
      validateContract(vulnerabilityItemSchema, dataArray[0], 'GET /v1/vulnerabilities [item]');
    }
  });

  // 14. GET /v1/vulnerabilities/stats
  it('should return valid vulnerability stats', async () => {
    const res = await request(app)
      .get('/v1/vulnerabilities/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const stats = body.data || body;
    validateContract(vulnerabilityStatsSchema, stats, 'GET /v1/vulnerabilities/stats');
  });
});
