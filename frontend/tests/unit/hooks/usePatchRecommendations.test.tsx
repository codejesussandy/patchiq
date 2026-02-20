import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/patch-recommendation.service', () => ({
  patchRecommendationService: {
    listRecommendations: vi.fn().mockResolvedValue({ data: [{ id: 'pr1', patchId: 'p1' }], total: 1 }),
    getRecommendation: vi.fn().mockResolvedValue({ id: 'pr1' }),
    getDashboardStats: vi.fn().mockResolvedValue({ total: 10, accepted: 5 }),
    getAssetRecommendations: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getPatchRecommendations: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    acceptRecommendation: vi.fn().mockResolvedValue({}),
    rejectRecommendation: vi.fn().mockResolvedValue({}),
  },
}));

import {
  usePatchRecommendations,
  usePatchRecommendationDashboardStats,
  patchRecommendationKeys,
} from '@/hooks/usePatchRecommendations';

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

describe('usePatchRecommendations hooks', () => {
  it('usePatchRecommendations should return loading initially', () => {
    const { result } = renderHook(() => usePatchRecommendations(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('usePatchRecommendations should return data on success', async () => {
    const { result } = renderHook(() => usePatchRecommendations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ data: [{ id: 'pr1', patchId: 'p1' }], total: 1 });
  });

  it('usePatchRecommendationDashboardStats should return loading initially', () => {
    const { result } = renderHook(() => usePatchRecommendationDashboardStats(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('patchRecommendationKeys should generate correct keys', () => {
      expect(patchRecommendationKeys.all).toEqual(['patch-recommendations']);
      expect(patchRecommendationKeys.detail('pr1')).toEqual(['patch-recommendations', 'detail', 'pr1']);
      expect(patchRecommendationKeys.dashboardStats()).toEqual(['patch-recommendations', 'dashboard']);
    });
  });
});
