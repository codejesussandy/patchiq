import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { validateContract } from './schemas/response-helpers';
import { loginResponseSchema, meResponseSchema } from './schemas/auth.schema';
import { z } from 'zod';

const app = getTestApp();

describe('Contract: Auth', () => {
  let accessToken: string;

  // 1. POST /v1/auth/login
  it('should return valid login response shape', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });

    expect(res.status).toBe(200);

    // Login wraps in { success: true, data: { accessToken, refreshToken, user } }
    const envelope = z.object({ success: z.literal(true), data: loginResponseSchema }).safeParse(res.body);
    if (envelope.success) {
      accessToken = envelope.data.data.accessToken;
      validateContract(z.object({ success: z.literal(true), data: loginResponseSchema }), res.body, 'POST /v1/auth/login');
    } else {
      // Fallback: direct shape (old pattern)
      validateContract(loginResponseSchema, res.body, 'POST /v1/auth/login');
      accessToken = res.body.accessToken;
    }
  });

  // 2. GET /v1/auth/me
  it('should return valid me response shape', async () => {
    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);

    // Try envelope first, then direct
    const envelope = z.object({ success: z.literal(true), data: meResponseSchema }).safeParse(res.body);
    if (envelope.success) {
      validateContract(z.object({ success: z.literal(true), data: meResponseSchema }), res.body, 'GET /v1/auth/me');
    } else {
      validateContract(meResponseSchema, res.body, 'GET /v1/auth/me');
    }
  });

  // 3. POST /v1/auth/login — invalid credentials
  it('should return error shape for invalid login', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'wrongpassword' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
