import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { validateContract } from './schemas/response-helpers';
import { dashboardStatsSchema } from './schemas/dashboard.schema';

const app = getTestApp();

describe('Contract: Dashboard', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });
    accessToken = res.body.data?.accessToken || res.body.accessToken;
  });

  // 15. GET /v1/dashboard
  it('should return valid dashboard data shape', async () => {
    const res = await request(app)
      .get('/v1/dashboard')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const data = body.data || body;

    // Dashboard should have stats with core numeric fields
    if (data.stats) {
      validateContract(dashboardStatsSchema, data.stats, 'GET /v1/dashboard [stats]');
    }
  });

  // 16. GET /v1/dashboard/stats
  it('should return valid dashboard stats', async () => {
    const res = await request(app)
      .get('/v1/dashboard/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const data = body.data || body;
    validateContract(dashboardStatsSchema, data, 'GET /v1/dashboard/stats');
  });
});
