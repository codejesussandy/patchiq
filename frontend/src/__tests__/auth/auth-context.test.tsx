import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { server } from '../msw/server';
import { http, HttpResponse } from 'msw';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <AntApp>
            <MemoryRouter>
              <AuthProvider>{children}</AuthProvider>
            </MemoryRouter>
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    );
  };
}

// Prevent jsdom from blowing up on window.location.href assignments (from 401 interceptor)
const originalLocation = window.location;
beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...originalLocation, href: originalLocation.href },
  });
});

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes as unauthenticated when no token in localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('initializes as authenticated when valid token exists and /user/me succeeds', async () => {
    localStorage.setItem('accessToken', 'mock-access-token');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('admin@patchiq.io');
  });

  it('initializes as unauthenticated when token exists but /user/me returns 401', async () => {
    localStorage.setItem('accessToken', 'invalid-token');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('login() stores tokens in localStorage and sets user state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('admin@patchiq.io', 'admin123');
    });

    expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout() clears tokens from localStorage and sets user to null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Login first, then logout
    await act(async () => {
      await result.current.login('admin@patchiq.io', 'admin123');
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('login() with bad credentials throws and does not store tokens', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.login('bad@email.com', 'wrong');
      })
    ).rejects.toThrow();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
