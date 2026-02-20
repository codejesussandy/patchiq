import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/discovery.service', () => ({
  discoveryService: {
    getAgents: vi.fn().mockResolvedValue([{ id: 'd1', name: 'Discovery Agent 1' }]),
    getAgent: vi.fn().mockResolvedValue({ id: 'd1' }),
    getIPRanges: vi.fn().mockResolvedValue([]),
    getIPRange: vi.fn().mockResolvedValue({}),
    getCredentials: vi.fn().mockResolvedValue([]),
    getCredential: vi.fn().mockResolvedValue({}),
  },
}));

import {
  useDiscoveryAgents,
  useIPRanges,
  useCredentials,
  discoveryKeys,
} from '@/hooks/useDiscovery';

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

describe('useDiscovery hooks', () => {
  it('useDiscoveryAgents should return loading initially', () => {
    const { result } = renderHook(() => useDiscoveryAgents(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useDiscoveryAgents should return data on success', async () => {
    const { result } = renderHook(() => useDiscoveryAgents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'd1', name: 'Discovery Agent 1' }]);
  });

  it('useIPRanges should return loading initially', () => {
    const { result } = renderHook(() => useIPRanges(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useCredentials should return loading initially', () => {
    const { result } = renderHook(() => useCredentials(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('discoveryKeys should generate correct keys', () => {
      expect(discoveryKeys.agents()).toEqual(['discovery', 'agents']);
      expect(discoveryKeys.agent('d1')).toEqual(['discovery', 'agents', 'd1']);
      expect(discoveryKeys.ipRanges()).toEqual(['discovery', 'ip-ranges']);
      expect(discoveryKeys.credentials()).toEqual(['discovery', 'credentials']);
    });
  });
});
