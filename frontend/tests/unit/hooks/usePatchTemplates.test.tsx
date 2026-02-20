import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/patch-template.service', () => ({
  patchTemplateService: {
    listTemplates: vi.fn().mockResolvedValue([{ id: 'pt1', name: 'Chrome Update' }]),
    getLatestVersion: vi.fn().mockResolvedValue({ version: '1.0.0' }),
    syncOneToHub: vi.fn().mockResolvedValue({}),
  },
}));

import {
  usePatchTemplates,
  patchTemplateKeys,
} from '@/hooks/usePatchTemplates';

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

describe('usePatchTemplates hooks', () => {
  it('usePatchTemplates should return loading initially', () => {
    const { result } = renderHook(() => usePatchTemplates(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('usePatchTemplates should return data on success', async () => {
    const { result } = renderHook(() => usePatchTemplates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'pt1', name: 'Chrome Update' }]);
  });

  describe('query keys', () => {
    it('patchTemplateKeys should generate correct keys', () => {
      expect(patchTemplateKeys.all).toEqual(['patch-templates']);
      expect(patchTemplateKeys.lists()).toEqual(['patch-templates', 'list']);
      expect(patchTemplateKeys.latestVersion('pt1', 'windows', 'x64')).toEqual([
        'patch-templates',
        'latest',
        'pt1',
        'windows',
        'x64',
      ]);
    });
  });
});
