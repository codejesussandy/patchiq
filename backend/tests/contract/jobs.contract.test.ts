import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';

const app = getTestApp();

describe('Contract: Jobs', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });
    accessToken = res.body.data?.accessToken || res.body.accessToken;
  });

  // 11. GET /v1/jobs/patch — patch jobs list
  it('should return valid patch jobs list', async () => {
    const res = await request(app)
      .get('/v1/jobs/patch')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const dataArray = Array.isArray(body.data) ? body.data : body.data?.data || [];
    expect(Array.isArray(dataArray)).toBe(true);
  });

  // 12. GET /v1/jobs/software/catalog
  it('should return valid software catalog', async () => {
    const res = await request(app)
      .get('/v1/jobs/software/catalog')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const dataArray = Array.isArray(body.data) ? body.data : body.data?.data || [];
    expect(Array.isArray(dataArray)).toBe(true);
  });
});
