import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/settings.service', () => ({
  settingsService: {
    getBranches: vi.fn().mockResolvedValue([{ id: 'b1', name: 'Main' }]),
    getUsers: vi.fn().mockResolvedValue([]),
    getRoles: vi.fn().mockResolvedValue([]),
    getPolicies: vi.fn().mockResolvedValue([]),
    getOrganizations: vi.fn().mockResolvedValue([]),
    getLocations: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([]),
    getBrandingSettings: vi.fn().mockResolvedValue({}),
    getMailServerConfig: vi.fn().mockResolvedValue({}),
    getProxyServerConfig: vi.fn().mockResolvedValue({}),
    getLDAPServerConfigs: vi.fn().mockResolvedValue([]),
    getRiskScore: vi.fn().mockResolvedValue({}),
    getRemoteDesktopSettings: vi.fn().mockResolvedValue({}),
    getServerSettings: vi.fn().mockResolvedValue({}),
    getIntegrations: vi.fn().mockResolvedValue([]),
    getAgentApprovalSettings: vi.fn().mockResolvedValue({}),
    getVulnerabilityPreference: vi.fn().mockResolvedValue({}),
    getAgentConfiguration: vi.fn().mockResolvedValue({}),
    getAgentApprovals: vi.fn().mockResolvedValue([]),
    getEnrollSecrets: vi.fn().mockResolvedValue([]),
    getComputerGroups: vi.fn().mockResolvedValue([]),
    getPatchPreference: vi.fn().mockResolvedValue({}),
    getAuditLogs: vi.fn().mockResolvedValue([]),
    getPlatformLicense: vi.fn().mockResolvedValue({}),
    getDistributionServers: vi.fn().mockResolvedValue([]),
    getDeploymentPolicies: vi.fn().mockResolvedValue([]),
    getRedHatAgentNominations: vi.fn().mockResolvedValue([]),
  },
}));

import {
  useBranches,
  useUsers,
  useRoles,
  useAlertPolicies,
  useOrganizations,
  useLocations,
  useDepartments,
  useMailServerConfig,
  useIntegrations,
  useComputerGroups,
  usePatchPreference,
  useAuditLogs,
  usePlatformLicense,
  settingsKeys,
} from '@/hooks/useSettings';

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

describe('useSettings hooks', () => {
  it('useBranches should return loading initially', () => {
    const { result } = renderHook(() => useBranches(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useBranches should return data on success', async () => {
    const { result } = renderHook(() => useBranches(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'b1', name: 'Main' }]);
  });

  it('useUsers should return loading initially', () => {
    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useRoles should return loading initially', () => {
    const { result } = renderHook(() => useRoles(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useAlertPolicies should return loading initially', () => {
    const { result } = renderHook(() => useAlertPolicies(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useOrganizations should return loading initially', () => {
    const { result } = renderHook(() => useOrganizations(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useLocations should return loading initially', () => {
    const { result } = renderHook(() => useLocations(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useDepartments should return loading initially', () => {
    const { result } = renderHook(() => useDepartments(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useMailServerConfig should return loading initially', () => {
    const { result } = renderHook(() => useMailServerConfig(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useIntegrations should return loading initially', () => {
    const { result } = renderHook(() => useIntegrations(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useComputerGroups should return loading initially', () => {
    const { result } = renderHook(() => useComputerGroups(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('usePatchPreference should return loading initially', () => {
    const { result } = renderHook(() => usePatchPreference(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useAuditLogs should return loading initially', () => {
    const { result } = renderHook(() => useAuditLogs(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('usePlatformLicense should return loading initially', () => {
    const { result } = renderHook(() => usePlatformLicense(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('settingsKeys should generate correct keys', () => {
      expect(settingsKeys.branches()).toEqual(['settings', 'branches']);
      expect(settingsKeys.users()).toEqual(['settings', 'users']);
      expect(settingsKeys.roles()).toEqual(['settings', 'roles']);
      expect(settingsKeys.policies()).toEqual(['settings', 'policies']);
      expect(settingsKeys.mailServer()).toEqual(['settings', 'mail-server']);
      expect(settingsKeys.computerGroups()).toEqual(['settings', 'computer-groups']);
    });
  });
});
