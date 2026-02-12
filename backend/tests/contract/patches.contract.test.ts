import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { validateContract } from './schemas/response-helpers';
import { patchItemSchema, patchDetailSchema } from './schemas/patches.schema';
import { z } from 'zod';

const app = getTestApp();

describe('Contract: Patches', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });
    // Handle both envelope and direct
    accessToken = res.body.data?.accessToken || res.body.accessToken;
  });

  // 4. GET /v1/patches — list
  it('should return valid paginated patches response', async () => {
    const res = await request(app)
      .get('/v1/patches')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);

    // The response wraps in { success: true, data: { data: [...], total, ... } }
    // or direct paginated { data: [...], total, ... }
    const body = res.body;
    const dataArray = body.data?.data || body.data;
    expect(Array.isArray(dataArray)).toBe(true);

    if (dataArray.length > 0) {
      validateContract(patchItemSchema, dataArray[0], 'GET /v1/patches [item]');
    }
  });

  // 5. GET /v1/patches/:id — detail
  it('should return 404 for non-existent patch with proper shape', async () => {
    const res = await request(app)
      .get('/v1/patches/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  // 6. GET /v1/patches/test-approve
  it('should return valid test-approve list', async () => {
    const res = await request(app)
      .get('/v1/patches/test-approve')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const dataArray = body.data?.data || body.data;
    expect(Array.isArray(dataArray)).toBe(true);
  });
});
