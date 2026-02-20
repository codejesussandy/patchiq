import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/asset.service', () => ({
  assetService: {
    getAssets: vi.fn().mockResolvedValue([{ id: '1', hostname: 'server-01' }]),
    getAssetsPaginated: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getAsset: vi.fn().mockResolvedValue({ id: '1' }),
    getSoftwareInventory: vi.fn().mockResolvedValue([]),
    getSoftwareLicenses: vi.fn().mockResolvedValue([]),
    getOSLicenses: vi.fn().mockResolvedValue([]),
    createAsset: vi.fn().mockResolvedValue({ id: '2' }),
    updateAsset: vi.fn().mockResolvedValue({}),
    deleteAsset: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/category.service', () => ({
  categoryService: {
    getCategories: vi.fn().mockResolvedValue([]),
    getCategory: vi.fn().mockResolvedValue({}),
    getSubCategories: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/tag.service', () => ({
  tagService: {
    getTags: vi.fn().mockResolvedValue([]),
    getTag: vi.fn().mockResolvedValue({}),
  },
}));

import {
  useAssets,
  useAssetsList,
  useSoftwareInventory,
  useSoftwareLicenses,
  useCategories,
  useTags,
  assetKeys,
  categoryKeys,
  tagKeys,
} from '@/hooks/useAssets';

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

describe('useAssets hooks', () => {
  it('should return loading state initially', () => {
    const { result } = renderHook(() => useAssets(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should return data on success', async () => {
    const { result } = renderHook(() => useAssets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: '1', hostname: 'server-01' }]);
  });

  it('should handle error state', async () => {
    const { assetService } = await import('@/services/asset.service');
    vi.mocked(assetService.getAssets).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAssets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('useAssetsList should accept params', () => {
    const { result } = renderHook(
      () => useAssetsList({ page: 1, pageSize: 10 }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('useSoftwareInventory should return loading initially', () => {
    const { result } = renderHook(() => useSoftwareInventory(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('useSoftwareLicenses should return loading initially', () => {
    const { result } = renderHook(() => useSoftwareLicenses(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('useCategories should return loading initially', () => {
    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('useTags should return loading initially', () => {
    const { result } = renderHook(() => useTags(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('assetKeys should generate correct keys', () => {
      expect(assetKeys.all).toEqual(['assets']);
      expect(assetKeys.lists()).toEqual(['assets', 'list']);
      expect(assetKeys.detail('1')).toEqual(['assets', 'detail', '1']);
      expect(assetKeys.softwareInventory()).toEqual(['software-inventory']);
      expect(assetKeys.softwareLicenses()).toEqual(['software-licenses']);
    });

    it('categoryKeys should generate correct keys', () => {
      expect(categoryKeys.all).toEqual(['categories']);
      expect(categoryKeys.lists()).toEqual(['categories', 'list']);
    });

    it('tagKeys should generate correct keys', () => {
      expect(tagKeys.all).toEqual(['tags']);
      expect(tagKeys.lists()).toEqual(['tags', 'list']);
    });
  });
});
