import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/patch.service', () => ({
  patchService: {
    getPatches: vi.fn().mockResolvedValue([{ id: 'p1', name: 'KB001' }]),
    getPatch: vi.fn().mockResolvedValue({ id: 'p1' }),
    getDeployments: vi.fn().mockResolvedValue([]),
    listPatchDeployments: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getPatchTests: vi.fn().mockResolvedValue([]),
    getZeroTouchConfigs: vi.fn().mockResolvedValue([]),
    createPatch: vi.fn().mockResolvedValue({ id: 'p2' }),
    deletePatch: vi.fn().mockResolvedValue({}),
  },
}));

import {
  usePatches,
  useDeployments,
  usePatchTests,
  useZeroTouchConfigs,
  patchKeys,
} from '@/hooks/usePatches';

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

describe('usePatches hooks', () => {
  it('usePatches should return loading initially', () => {
    const { result } = renderHook(() => usePatches(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('usePatches should return data on success', async () => {
    const { result } = renderHook(() => usePatches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'p1', name: 'KB001' }]);
  });

  it('useDeployments should return loading initially', () => {
    const { result } = renderHook(() => useDeployments(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('usePatchTests should return loading initially', () => {
    const { result } = renderHook(() => usePatchTests(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('useZeroTouchConfigs should return loading initially', () => {
    const { result } = renderHook(() => useZeroTouchConfigs(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('patchKeys should generate correct keys', () => {
      expect(patchKeys.all).toEqual(['patches']);
      expect(patchKeys.lists()).toEqual(['patches', 'list']);
      expect(patchKeys.detail('p1')).toEqual(['patches', 'detail', 'p1']);
      expect(patchKeys.deployments()).toEqual(['deployments']);
      expect(patchKeys.patchTests()).toEqual(['patch-tests']);
    });
  });
});
