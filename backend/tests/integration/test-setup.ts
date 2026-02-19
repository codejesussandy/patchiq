/**
 * Integration Test Setup
 *
 * Provides a configured supertest agent connected to the real Express app
 * and a real PostgreSQL test database. Uses .env.test configuration.
 *
 * Usage in test files:
 *   import { getAgent, getAdminToken, prisma } from './test-setup';
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import supertest from 'supertest';
import { createApp } from '../../src/app';
import { PrismaClient } from '@prisma/client';

const app = createApp();
const agent = supertest(app);
const prisma = new PrismaClient();

let adminToken: string | null = null;
let userToken: string | null = null;

async function loginAs(email: string, password: string) {
  const res = await agent
    .post('/v1/auth/login')
    .send({ email, password });

  if (res.status !== 200 || !res.body.success) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  };
}

async function getAdminToken() {
  if (!adminToken) {
    const tokens = await loginAs('admin@patchiq.io', 'admin123');
    adminToken = tokens.accessToken;
  }
  return adminToken;
}

async function getUserToken() {
  if (!userToken) {
    const tokens = await loginAs('demo@patchiq.io', 'demo123');
    userToken = tokens.accessToken;
  }
  return userToken;
}

function getAgent() {
  return agent;
}

function resetTokenCache() {
  adminToken = null;
  userToken = null;
}

// Global teardown: disconnect Prisma after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

export { getAgent, getAdminToken, getUserToken, loginAs, resetTokenCache, prisma, app };
