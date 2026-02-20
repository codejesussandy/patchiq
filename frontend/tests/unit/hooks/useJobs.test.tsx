import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/jobs.service', () => ({
  jobsService: {
    getConfigCatalog: vi.fn().mockResolvedValue([]),
    getConfigBundles: vi.fn().mockResolvedValue([]),
    getConfigDeployments: vi.fn().mockResolvedValue([]),
    getPatchJobs: vi.fn().mockResolvedValue([{ id: 'j1', status: 'running' }]),
    getDeploymentPolicies: vi.fn().mockResolvedValue([]),
    getVulnerabilityJobs: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/softwareJobs.service', () => ({
  softwareJobsService: {
    listDeployments: vi.fn().mockResolvedValue([]),
    listPackages: vi.fn().mockResolvedValue([]),
    listBundles: vi.fn().mockResolvedValue([]),
    listAgents: vi.fn().mockResolvedValue([]),
  },
}));

import {
  useConfigCatalog,
  useConfigBundles,
  useConfigDeployments,
  usePatchJobs,
  useDeploymentPolicies,
  useVulnerabilityJobs,
  useSoftwareDeployments,
  useSoftwarePackages,
  jobKeys,
} from '@/hooks/useJobs';

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

describe('useJobs hooks', () => {
  it('useConfigCatalog should return loading initially', () => {
    const { result } = renderHook(() => useConfigCatalog(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useConfigBundles should return loading initially', () => {
    const { result } = renderHook(() => useConfigBundles(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useConfigDeployments should return loading initially', () => {
    const { result } = renderHook(() => useConfigDeployments(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('usePatchJobs should return data on success', async () => {
    const { result } = renderHook(() => usePatchJobs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'j1', status: 'running' }]);
  });

  it('useDeploymentPolicies should return loading initially', () => {
    const { result } = renderHook(() => useDeploymentPolicies(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useVulnerabilityJobs should return loading initially', () => {
    const { result } = renderHook(() => useVulnerabilityJobs(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useSoftwareDeployments should return loading initially', () => {
    const { result } = renderHook(() => useSoftwareDeployments(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useSoftwarePackages should return loading initially', () => {
    const { result } = renderHook(() => useSoftwarePackages(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('jobKeys should generate correct keys', () => {
      expect(jobKeys.configCatalog()).toEqual(['config-catalog']);
      expect(jobKeys.configBundles()).toEqual(['config-bundles']);
      expect(jobKeys.patchJobs()).toEqual(['patch-jobs']);
      expect(jobKeys.softwareDeployments()).toEqual(['software-deployments']);
    });
  });
});
