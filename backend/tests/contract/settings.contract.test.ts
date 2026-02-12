import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { validateContract } from './schemas/response-helpers';
import { organizationSchema } from './schemas/settings.schema';

const app = getTestApp();

describe('Contract: Settings', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });
    accessToken = res.body.data?.accessToken || res.body.accessToken;
  });

  // 17. GET /v1/settings/organizations
  it('should return valid organizations list', async () => {
    const res = await request(app)
      .get('/v1/settings/organizations')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const dataArray = Array.isArray(body.data) ? body.data : body.data?.data || [];
    expect(Array.isArray(dataArray)).toBe(true);

    if (dataArray.length > 0) {
      validateContract(organizationSchema, dataArray[0], 'GET /v1/settings/organizations [item]');
    }
  });

  // 18. GET /v1/settings/users
  it('should return valid users list', async () => {
    const res = await request(app)
      .get('/v1/settings/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const dataArray = Array.isArray(body.data) ? body.data : body.data?.data || [];
    expect(Array.isArray(dataArray)).toBe(true);
  });
});
