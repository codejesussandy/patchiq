import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/vulnerability.service', () => ({
  vulnerabilityService: {
    getVulnerabilities: vi.fn().mockResolvedValue({ data: [{ id: 'v1', cve: 'CVE-2024-001' }], total: 1 }),
    getZeroDayVulnerabilities: vi.fn().mockResolvedValue([]),
    getExceptions: vi.fn().mockResolvedValue([]),
    getVulnerabilityStats: vi.fn().mockResolvedValue({}),
    getVulnerabilityTypes: vi.fn().mockResolvedValue([]),
    getEndpointVulnerabilities: vi.fn().mockResolvedValue([]),
    getNetworkVulnerabilities: vi.fn().mockResolvedValue([]),
    getDBSyncConfig: vi.fn().mockResolvedValue({}),
    getSyncStatus: vi.fn().mockResolvedValue({}),
  },
}));

import {
  useVulnerabilities,
  useExceptions,
  useVulnerabilityStats,
  useVulnerabilityTypes,
  useDBSyncConfig,
  vulnerabilityKeys,
} from '@/hooks/useVulnerabilities';

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

describe('useVulnerabilities hooks', () => {
  it('useVulnerabilities should return loading initially', () => {
    const { result } = renderHook(() => useVulnerabilities(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useVulnerabilities should return data on success', async () => {
    const { result } = renderHook(() => useVulnerabilities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ data: [{ id: 'v1', cve: 'CVE-2024-001' }], total: 1 });
  });

  it('useExceptions should return loading initially', () => {
    const { result } = renderHook(() => useExceptions(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useVulnerabilityStats should return loading initially', () => {
    const { result } = renderHook(() => useVulnerabilityStats(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useVulnerabilityTypes should return loading initially', () => {
    const { result } = renderHook(() => useVulnerabilityTypes(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useDBSyncConfig should return loading initially', () => {
    const { result } = renderHook(() => useDBSyncConfig(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('vulnerabilityKeys should generate correct keys', () => {
      expect(vulnerabilityKeys.all).toEqual(['vulnerabilities']);
      expect(vulnerabilityKeys.lists()).toEqual(['vulnerabilities', 'list']);
      expect(vulnerabilityKeys.exceptions()).toEqual(['vulnerabilities', 'exceptions']);
      expect(vulnerabilityKeys.detail('v1')).toEqual(['vulnerabilities', 'detail', 'v1']);
    });
  });
});
