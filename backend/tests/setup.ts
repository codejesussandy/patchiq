import dotenv from 'dotenv';
import { prisma } from '../src/db/client';
import { ensureTestUser } from './utils/testHelpers';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console.log in tests to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(async () => {
  // Suppress logs during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = jest.fn();
    console.error = jest.fn();
  }

  // Ensure test user exists for integration tests
  try {
    await ensureTestUser();
  } catch (error) {
    // Ignore errors if database is not available (unit tests)
  }
});

afterAll(async () => {
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;

  // Disconnect from database
  try {
    await prisma.$disconnect();
  } catch (error) {
    // Ignore errors if already disconnected
  }
});

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
