import dotenv from 'dotenv';
import { prisma } from '@db/client';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Seed data for E2E tests
export const TEST_ADMIN_CREDENTIALS = {
  email: 'admin@patchiq.io',
  password: 'admin123',
};

export const TEST_USER_CREDENTIALS = {
  email: 'user@patchiq.io',
  password: 'user123',
};

// Mock console in tests unless DEBUG is set
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(async () => {
  if (!process.env.DEBUG) {
    console.log = jest.fn();
    console.error = jest.fn();
  }

  // Ensure database is ready
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;

  await prisma.$disconnect();
});

// Extend global Jest timeout for E2E tests
jest.setTimeout(60000);
