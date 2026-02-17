import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp } from 'antd';
import { AuthProvider } from '../../contexts/AuthContext';

// Create a custom render function that includes all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with necessary providers:
 * - QueryClientProvider (React Query)
 * - BrowserRouter (React Router)
 * - AuthProvider (Authentication)
 * - App (Ant Design)
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = '/',
    queryClient,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Create a new QueryClient for each test to ensure isolation
  const testQueryClient =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Don't retry failed queries in tests
          gcTime: 0, // Disable garbage collection
          staleTime: Infinity, // Keep data fresh during tests (don't auto-refetch)
          refetchOnMount: false, // Don't refetch when component mounts
          refetchOnWindowFocus: false, // Don't refetch on window focus
          refetchOnReconnect: false, // Don't refetch on reconnect
        },
        mutations: {
          retry: false, // Don't retry failed mutations in tests
        },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });

  // Set initial route if provided
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={testQueryClient}>
          <AntApp>
            <AuthProvider>{children}</AuthProvider>
          </AntApp>
        </QueryClientProvider>
      </BrowserRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
    user: userEvent.setup(),
  };
}

/**
 * Minimal render without auth provider (for testing auth flows)
 */
export function renderWithoutAuth(
  ui: ReactElement,
  {
    initialRoute = '/',
    queryClient,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const testQueryClient =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: Infinity,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        },
        mutations: { retry: false },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });

  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={testQueryClient}>
          <AntApp>{children}</AntApp>
        </QueryClientProvider>
      </BrowserRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
    user: userEvent.setup(),
  };
}

/**
 * Wait for async operations to complete
 * Useful for waiting for React Query to finish fetching
 */
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Create a mock user for authenticated tests
 */
export const createMockUser = () => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'ADMIN',
  permissions: ['*'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * Custom matchers and assertions
 */
export const customMatchers = {
  /**
   * Check if element contains a specific class
   */
  toHaveClass(element: Element, className: string) {
    return element.classList.contains(className);
  },

  /**
   * Check if API was called with specific parameters
   */
  toHaveBeenCalledWithParams(
    mockFn: jest.Mock,
    params: Record<string, unknown>
  ) {
    const calls = mockFn.mock.calls;
    return calls.some((call) => {
      const callParams = call[0];
      return Object.entries(params).every(
        ([key, value]) => callParams[key] === value
      );
    });
  },
};

/**
 * Mock localStorage for tests
 */
export const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

/**
 * Setup localStorage mock before tests
 */
export const setupLocalStorageMock = () => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
