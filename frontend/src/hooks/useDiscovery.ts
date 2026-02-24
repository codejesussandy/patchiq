import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryService } from '../services/discovery.service';
import type { AgentFormData, IPRangeFormData, DeviceCredentialFormData } from '../types/discovery.types';

export const discoveryKeys = {
  agents: () => ['discovery', 'agents'] as const,
  agent: (id: string) => ['discovery', 'agents', id] as const,
  ipRanges: () => ['discovery', 'ip-ranges'] as const,
  ipRange: (id: string) => ['discovery', 'ip-ranges', id] as const,
  credentials: () => ['discovery', 'credentials'] as const,
  credential: (id: string) => ['discovery', 'credentials', id] as const,
  devices: () => ['discovery', 'devices'] as const,
  scanStatus: (id: string) => ['discovery', 'scan', id] as const,
};

// ============================================
// Agent Queries
// ============================================

export function useDiscoveryAgents() {
  return useQuery({ queryKey: discoveryKeys.agents(), queryFn: () => discoveryService.getAgents() });
}

export function useDiscoveryAgent(id: string) {
  return useQuery({ queryKey: discoveryKeys.agent(id), queryFn: () => discoveryService.getAgent(id), enabled: !!id });
}

export function useCreateDiscoveryAgent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: AgentFormData) => discoveryService.createAgent(data), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.agents() }); } });
}

export function useUpdateDiscoveryAgent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<AgentFormData> }) => discoveryService.updateAgent(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.agents() }); } });
}

export function useDeleteDiscoveryAgent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => discoveryService.deleteAgent(id), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.agents() }); } });
}

// ============================================
// IP Range Queries
// ============================================

export function useIPRanges() {
  return useQuery({ queryKey: discoveryKeys.ipRanges(), queryFn: () => discoveryService.getIPRanges() });
}

export function useIPRange(id: string) {
  return useQuery({ queryKey: discoveryKeys.ipRange(id), queryFn: () => discoveryService.getIPRange(id), enabled: !!id });
}

export function useCreateIPRange() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: IPRangeFormData) => discoveryService.createIPRange(data), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.ipRanges() }); } });
}

export function useUpdateIPRange() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<IPRangeFormData> }) => discoveryService.updateIPRange(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.ipRanges() }); } });
}

export function useDeleteIPRange() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => discoveryService.deleteIPRange(id), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.ipRanges() }); } });
}

export function useScanIPRange() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => discoveryService.scanIPRange(id), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.ipRanges() }); } });
}

// ============================================
// Credential Queries
// ============================================

export function useCredentials() {
  return useQuery({ queryKey: discoveryKeys.credentials(), queryFn: () => discoveryService.getCredentials() });
}

export function useCredential(id: string) {
  return useQuery({ queryKey: discoveryKeys.credential(id), queryFn: () => discoveryService.getCredential(id), enabled: !!id });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: DeviceCredentialFormData) => discoveryService.createCredential(data), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.credentials() }); } });
}

export function useUpdateCredential() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<DeviceCredentialFormData> }) => discoveryService.updateCredential(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.credentials() }); } });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => discoveryService.deleteCredential(id), onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.credentials() }); } });
}

export function useTestCredential() {
  return useMutation({ mutationFn: (id: string) => discoveryService.testCredential(id) });
}

// ============================================
// Discovered Device Queries
// ============================================

export function useDiscoveredDevices(params?: { status?: string; search?: string }) {
  return useQuery({ queryKey: [...discoveryKeys.devices(), params], queryFn: () => discoveryService.getDiscoveredDevices(params) });
}

export function useEnrollDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: { name?: string; type?: string } }) => discoveryService.enrollDevice(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.devices() }); },
  });
}

// ============================================
// Scan Status Queries
// ============================================

export function useScanStatus(scanId: string | null) {
  return useQuery({
    queryKey: discoveryKeys.scanStatus(scanId || ''),
    queryFn: () => discoveryService.getScanStatus(scanId!),
    enabled: !!scanId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING' || status === 'IN_PROGRESS') return 2000;
      return false;
    },
  });
}

export function useCancelScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scanId: string) => discoveryService.cancelScan(scanId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: discoveryKeys.ipRanges() }); },
  });
}
