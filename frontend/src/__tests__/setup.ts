import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { startServer, resetServer, closeServer } from './mocks/server';
import { setupLocalStorageMock } from './utils/test-utils';

// Setup MSW server
beforeAll(() => {
  startServer();
  setupLocalStorageMock();
});

// Reset handlers and cleanup after each test
afterEach(() => {
  resetServer();
  cleanup();
  localStorage.clear();
});

// Close server after all tests
afterAll(() => {
  closeServer();
});

// Mock window.matchMedia (required for Ant Design components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
} as any;

// Mock ResizeObserver (required for Ant Design Table/Virtual components)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock scrollTo
global.scrollTo = vi.fn();

// Mock getComputedStyle (for pseudo-elements)
const mockGetComputedStyle = vi.fn().mockImplementation(() => ({
  getPropertyValue: vi.fn().mockReturnValue(''),
  getPropertyPriority: vi.fn().mockReturnValue(''),
  removeProperty: vi.fn(),
  setProperty: vi.fn(),
}));
window.getComputedStyle = mockGetComputedStyle as any;

// Extend Vitest matchers with jest-dom
expect.extend({});
