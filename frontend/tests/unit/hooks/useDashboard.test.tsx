import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/dashboard.service', () => ({
  dashboardService: {
    getDashboardData: vi.fn().mockResolvedValue({ totalAssets: 100, totalPatches: 50 }),
    getStats: vi.fn().mockResolvedValue({ patchCompliance: 85 }),
    getTopVulnerabilities: vi.fn().mockResolvedValue([]),
    refreshDashboard: vi.fn().mockResolvedValue({}),
  },
}));

import {
  useDashboardData,
  useDashboardStats,
  useTopVulnerabilities,
  dashboardKeys,
} from '@/hooks/useDashboard';

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

describe('useDashboard hooks', () => {
  it('useDashboardData should return loading initially', () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useDashboardData should return data on success', async () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ totalAssets: 100, totalPatches: 50 });
  });

  it('useDashboardStats should return loading initially', () => {
    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useTopVulnerabilities should return loading initially', () => {
    const { result } = renderHook(() => useTopVulnerabilities(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('dashboardKeys should generate correct keys', () => {
      expect(dashboardKeys.all).toEqual(['dashboard']);
      expect(dashboardKeys.data()).toEqual(['dashboard', 'data']);
      expect(dashboardKeys.stats()).toEqual(['dashboard', 'stats']);
      expect(dashboardKeys.topVulnerabilities()).toEqual(['dashboard', 'top-vulnerabilities']);
    });
  });
});
