import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { validateContract } from './schemas/response-helpers';
import { agentItemSchema } from './schemas/agents.schema';

const app = getTestApp();

describe('Contract: Agents', () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });
    accessToken = res.body.data?.accessToken || res.body.accessToken;
  });

  // 9. GET /v1/agents — list
  it('should return valid agents list response', async () => {
    const res = await request(app)
      .get('/v1/agents')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const body = res.body;
    const dataArray = Array.isArray(body.data) ? body.data : body.data?.data || [];
    expect(Array.isArray(dataArray)).toBe(true);

    if (dataArray.length > 0) {
      validateContract(agentItemSchema, dataArray[0], 'GET /v1/agents [item]');
    }
  });

  // 10. GET /v1/agents/:id — 404
  it('should return 404 for non-existent agent', async () => {
    const res = await request(app)
      .get('/v1/agents/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});
