/**
 * Auth helpers for integration tests
 */

import supertest from 'supertest';

export async function loginAsAdmin(agent: supertest.Agent | supertest.SuperTest<supertest.Test>) {
  const res = await agent
    .post('/v1/auth/login')
    .send({ email: 'admin@patchiq.io', password: 'admin123' });

  if (res.status !== 200) {
    throw new Error(`Admin login failed: ${res.status}`);
  }
  return res.body.data;
}

export async function loginAsUser(
  agent: supertest.Agent | supertest.SuperTest<supertest.Test>,
  email: string,
  password: string,
) {
  const res = await agent
    .post('/v1/auth/login')
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }
  return res.body.data;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
