import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/hub.service', () => ({
  hubService: {
    getStats: vi.fn().mockResolvedValue({ totalPackages: 25, totalBundles: 5 }),
    listPackages: vi.fn().mockResolvedValue([]),
    listPackagesGrouped: vi.fn().mockResolvedValue([]),
    getPackage: vi.fn().mockResolvedValue({}),
    listBundles: vi.fn().mockResolvedValue([]),
    getBundle: vi.fn().mockResolvedValue({}),
  },
}));

import {
  useHubStats,
  useHubPackages,
  useHubBundles,
  hubKeys,
} from '@/hooks/useHub';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('useHub hooks', () => {
  it('useHubStats should return loading initially', () => {
    const { result } = renderHook(() => useHubStats(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useHubStats should return data on success', async () => {
    const { result } = renderHook(() => useHubStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ totalPackages: 25, totalBundles: 5 });
  });

  it('useHubPackages should return loading initially', () => {
    const { result } = renderHook(() => useHubPackages(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useHubBundles should return loading initially', () => {
    const { result } = renderHook(() => useHubBundles(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('hubKeys should generate correct keys', () => {
      expect(hubKeys.all).toEqual(['hub']);
      expect(hubKeys.stats()).toEqual(['hub', 'stats']);
      expect(hubKeys.package('p1')).toEqual(['hub', 'packages', 'detail', 'p1']);
      expect(hubKeys.bundle('b1')).toEqual(['hub', 'bundles', 'detail', 'b1']);
    });
  });
});
