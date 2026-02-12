import request from 'supertest';
import { Application } from 'express';
import { createApp } from '@/app';
import { generateTokenPair } from '@shared/utils/jwt';
import { prisma } from '@/db/client';

// Default test user UUID - use a consistent UUID for tests
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
export const TEST_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000010';

// Create app instance for testing
export function getTestApp(): Application {
  return createApp();
}

// Ensure test user exists in database
export async function ensureTestUser() {
  // Check if organization exists
  const org = await prisma.organization.findUnique({
    where: { id: TEST_ORGANIZATION_ID },
  });

  if (!org) {
    await prisma.organization.create({
      data: {
        id: TEST_ORGANIZATION_ID,
        name: 'Test Organization',
        description: 'Organization for testing',
        isDefault: false,
      },
    });
  }

  // Check if test user exists
  const user = await prisma.user.findUnique({
    where: { id: TEST_USER_ID },
  });

  if (!user) {
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: 'test-user@patchiq.io',
        passwordHash: '$2b$10$dummyHashForTestUserOnly',
        name: 'Test User',
        role: 'ADMIN',
        isActive: true,
        isOnboarded: true,
        organizationId: TEST_ORGANIZATION_ID,
      },
    });
  }
}

// Generate test auth tokens
export function generateTestTokens(userId: string = TEST_USER_ID, role: string = 'ADMIN') {
  return generateTokenPair({
    userId,
    email: `${role}@patchiq.io`,
    role,
    organizationId: TEST_ORGANIZATION_ID,
  });
}

// Helper to make authenticated requests
export function authenticatedRequest(app: Application, token: string) {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

// Helper to create test user data
export function createTestUser(overrides: Partial<TestUserData> = {}): TestUserData {
  return {
    id: 'test-user-id',
    email: 'test@patchiq.io',
    name: 'Test User',
    role: 'ADMIN',
    ...overrides,
  };
}

interface TestUserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Helper to wait for async operations
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to generate random test data
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

export function randomEmail(): string {
  return `test-${randomString()}@patchiq.io`;
}

export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
