import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { validateContract } from './schemas/response-helpers';
import { assetItemSchema } from './schemas/assets.schema';
import { z } from 'zod';

const app = getTestApp();

describe('Contract: Assets', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });
    accessToken = res.body.data?.accessToken || res.body.accessToken;
  });

  // 7. GET /v1/assets — list
  it('should return valid assets list response', async () => {
    const res = await request(app)
      .get('/v1/assets')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    // data could be array directly or nested
    const dataArray = Array.isArray(body.data) ? body.data : body.data?.data || [];
    expect(Array.isArray(dataArray)).toBe(true);

    if (dataArray.length > 0) {
      validateContract(assetItemSchema, dataArray[0], 'GET /v1/assets [item]');
    }
  });

  // 8. GET /v1/categories
  it('should return valid categories list', async () => {
    const res = await request(app)
      .get('/v1/categories')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const dataArray = Array.isArray(body.data) ? body.data : body.data?.data || [];
    expect(Array.isArray(dataArray)).toBe(true);

    if (dataArray.length > 0) {
      const categorySchema = z.object({
        id: z.string(),
        name: z.string(),
        isDefault: z.boolean(),
        createdAt: z.string(),
      });
      validateContract(categorySchema, dataArray[0], 'GET /v1/categories [item]');
    }
  });
});
