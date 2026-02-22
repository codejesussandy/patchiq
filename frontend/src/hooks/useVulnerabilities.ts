import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vulnerabilityService } from '../services/vulnerability.service';
import type { ExceptionItem } from '../services/vulnerability.service';

// ============================================
// Query Keys
// ============================================

export const vulnerabilityKeys = {
  all: ['vulnerabilities'] as const,
  lists: () => [...vulnerabilityKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...vulnerabilityKeys.lists(), params] as const,
  zeroDay: (params?: Record<string, unknown>) => [...vulnerabilityKeys.all, 'zero-day', params] as const,
  detail: (id: string) => [...vulnerabilityKeys.all, 'detail', id] as const,
  exceptions: () => [...vulnerabilityKeys.all, 'exceptions'] as const,
  stats: (params?: Record<string, unknown>) => [...vulnerabilityKeys.all, 'stats', params] as const,
  types: () => [...vulnerabilityKeys.all, 'types'] as const,
  endpointVulns: () => [...vulnerabilityKeys.all, 'endpoints'] as const,
  networkVulns: () => [...vulnerabilityKeys.all, 'network'] as const,
  affectedEndpoints: (cve: string) => [...vulnerabilityKeys.all, 'affected-endpoints', cve] as const,
  affectedSoftware: (cve: string) => [...vulnerabilityKeys.all, 'affected-software', cve] as const,
  dbSyncConfig: () => [...vulnerabilityKeys.all, 'db-sync-config'] as const,
  syncStatus: () => [...vulnerabilityKeys.all, 'sync-status'] as const,
  cveSuggestions: (software: string, vendor?: string) => [...vulnerabilityKeys.all, 'cve-suggest', software, vendor] as const,
};

// ============================================
// Queries
// ============================================

export function useVulnerabilities(params?: { severity?: string; search?: string; affectsAssets?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: vulnerabilityKeys.list(params as Record<string, unknown>),
    queryFn: () => vulnerabilityService.getVulnerabilities(params),
    staleTime: 30_000,
    // Keep previous data while fetching new page for better UX
    placeholderData: (previousData) => previousData,
  });
}

export function useZeroDayVulnerabilities(params?: { severity?: string; search?: string }) {
  return useQuery({
    queryKey: vulnerabilityKeys.zeroDay(params as Record<string, unknown>),
    queryFn: () => vulnerabilityService.getZeroDayVulnerabilities(params),
  });
}

export function useVulnerabilityDetail(id: string) {
  return useQuery({
    queryKey: vulnerabilityKeys.detail(id),
    queryFn: () => vulnerabilityService.getVulnerabilityById(id),
    enabled: !!id,
  });
}

export function useExceptions() {
  return useQuery({
    queryKey: vulnerabilityKeys.exceptions(),
    queryFn: () => vulnerabilityService.getExceptions(),
  });
}

export function useVulnerabilityStats(params?: { affectsAssets?: boolean }) {
  return useQuery({
    queryKey: vulnerabilityKeys.stats(params as Record<string, unknown>),
    queryFn: () => vulnerabilityService.getVulnerabilityStats(params),
    staleTime: 60_000,
  });
}

export function useVulnerabilityTypes() {
  return useQuery({
    queryKey: vulnerabilityKeys.types(),
    queryFn: () => vulnerabilityService.getVulnerabilityTypes(),
  });
}

export function useEndpointVulnerabilities() {
  return useQuery({
    queryKey: vulnerabilityKeys.endpointVulns(),
    queryFn: () => vulnerabilityService.getEndpointVulnerabilities(),
  });
}

export function useNetworkVulnerabilities() {
  return useQuery({
    queryKey: vulnerabilityKeys.networkVulns(),
    queryFn: () => vulnerabilityService.getNetworkVulnerabilities(),
  });
}

export function useAffectedEndpoints(cve: string) {
  return useQuery({
    queryKey: vulnerabilityKeys.affectedEndpoints(cve),
    queryFn: () => vulnerabilityService.getAffectedEndpoints(cve),
    enabled: !!cve,
  });
}

export function useAffectedSoftware(cve: string) {
  return useQuery({
    queryKey: vulnerabilityKeys.affectedSoftware(cve),
    queryFn: () => vulnerabilityService.getAffectedSoftware(cve),
    enabled: !!cve,
  });
}

export function useDBSyncConfig() {
  return useQuery({
    queryKey: vulnerabilityKeys.dbSyncConfig(),
    queryFn: () => vulnerabilityService.getDBSyncConfig(),
  });
}

export function useSyncStatus(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: vulnerabilityKeys.syncStatus(),
    queryFn: () => vulnerabilityService.getSyncStatus(),
    refetchInterval: options?.refetchInterval,
  });
}

export function useCveSuggestions(software: string, vendor?: string) {
  return useQuery({
    queryKey: vulnerabilityKeys.cveSuggestions(software, vendor),
    queryFn: () => vulnerabilityService.suggestCvesForSoftware(software, vendor),
    enabled: !!software,
  });
}

// ============================================
// Mutations
// ============================================

export function useCreateException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      vulnerabilityIds: string[];
      exceptionType: string;
      reasonForExclusion: string;
      scope?: string;
      endpoints?: string[];
      source: 'zeroDay' | 'vulnerabilities';
    }) => vulnerabilityService.createException(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.all });
    },
  });
}

export function useUpdateException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExceptionItem> }) =>
      vulnerabilityService.updateException(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.exceptions() });
    },
  });
}

export function useDeleteException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vulnerabilityService.deleteException(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.all });
    },
  });
}

export function useTriggerScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scope, endpointIds }: { scope?: 'ALL' | 'SELECTED'; endpointIds?: string[] } = {}) =>
      vulnerabilityService.triggerScan(scope, endpointIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.all });
    },
  });
}

export function useUpdateDBSyncConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { scanJobInterval: number; scanJobUnit: string; databaseSyncTime: string }) =>
      vulnerabilityService.updateDBSyncConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.dbSyncConfig() });
    },
  });
}

export function useTriggerDBSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => vulnerabilityService.triggerDBSync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vulnerabilityKeys.syncStatus() });
    },
  });
}
