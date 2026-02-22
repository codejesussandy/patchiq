import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patchService } from '../services/patch.service';
import type { Patch, Deployment, PatchTest, ZeroTouchConfig } from '../types/patch.types';

// ============================================
// Query Keys
// ============================================

export const patchKeys = {
  all: ['patches'] as const,
  lists: () => [...patchKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...patchKeys.lists(), params] as const,
  details: () => [...patchKeys.all, 'detail'] as const,
  detail: (id: string) => [...patchKeys.details(), id] as const,
  affectedSoftwares: (patchId: string) => [...patchKeys.all, 'affected-softwares', patchId] as const,
  vulnerabilities: (patchId: string) => [...patchKeys.all, 'vulnerabilities', patchId] as const,
  endpoints: (patchId: string) => [...patchKeys.all, 'endpoints', patchId] as const,
  endpointDetails: (endpointId: string) => ['endpoints', 'detail', endpointId] as const,
  assetWithPatches: (assetId: string) => ['assets', 'with-patches', assetId] as const,
  deployments: () => ['deployments'] as const,
  deployment: (id: string) => ['deployments', 'detail', id] as const,
  patchDeployments: (params?: Record<string, unknown>) => ['patch-deployments', params] as const,
  patchDeploymentStatus: (id: string) => ['patch-deployments', 'status', id] as const,
  deploymentTasks: (id: string) => ['deployments', 'tasks', id] as const,
  deploymentPreview: (id: string) => ['deployments', 'preview', id] as const,
  patchTests: () => ['patch-tests'] as const,
  patchTest: (id: string) => ['patch-tests', 'detail', id] as const,
  zeroTouchConfigs: () => ['zero-touch-configs'] as const,
  zeroTouchConfig: (id: string) => ['zero-touch-configs', 'detail', id] as const,
};

// ============================================
// Patch Queries
// ============================================

export function usePatches(params?: { search?: string; limit?: number; includeSuperseded?: boolean; severity?: string[]; os?: string[]; category?: string[] }) {
  return useQuery({
    queryKey: patchKeys.list(params),
    queryFn: () => patchService.getPatches(params),
  });
}

export function usePatch(id: string) {
  return useQuery({
    queryKey: patchKeys.detail(id),
    queryFn: () => patchService.getPatch(id),
    enabled: !!id,
  });
}

export function useAffectedSoftwares(patchId: string) {
  return useQuery({
    queryKey: patchKeys.affectedSoftwares(patchId),
    queryFn: () => patchService.getAffectedSoftwares(patchId),
    enabled: !!patchId,
  });
}

export function usePatchVulnerabilities(patchId: string) {
  return useQuery({
    queryKey: patchKeys.vulnerabilities(patchId),
    queryFn: () => patchService.getVulnerabilities(patchId),
    enabled: !!patchId,
  });
}

export function usePatchEndpoints(patchId: string) {
  return useQuery({
    queryKey: patchKeys.endpoints(patchId),
    queryFn: () => patchService.getEndpoints(patchId),
    enabled: !!patchId,
  });
}

export function useEndpointDetails(endpointId: string) {
  return useQuery({
    queryKey: patchKeys.endpointDetails(endpointId),
    queryFn: () => patchService.getEndpointDetails(endpointId),
    enabled: !!endpointId,
  });
}

export function useAssetWithPatches(assetId: string) {
  return useQuery({
    queryKey: patchKeys.assetWithPatches(assetId),
    queryFn: () => patchService.getAssetWithPatches(assetId),
    enabled: !!assetId,
  });
}

// ============================================
// Deployment Queries
// ============================================

export function useDeployments() {
  return useQuery({
    queryKey: patchKeys.deployments(),
    queryFn: () => patchService.getDeployments(),
  });
}

export function useDeployment(id: string) {
  return useQuery({
    queryKey: patchKeys.deployment(id),
    queryFn: () => patchService.getDeployment(id),
    enabled: !!id,
  });
}

export function usePatchDeployments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: patchKeys.patchDeployments(params as Record<string, unknown>),
    queryFn: () => patchService.listPatchDeployments(params),
    // Keep previous data while fetching new page for better UX
    placeholderData: (previousData) => previousData,
  });
}

export function usePatchDeploymentStatus(deploymentId: string) {
  return useQuery({
    queryKey: patchKeys.patchDeploymentStatus(deploymentId),
    queryFn: () => patchService.getPatchDeploymentStatus(deploymentId),
    enabled: !!deploymentId,
  });
}

export function useDeploymentTasks(id: string) {
  return useQuery({
    queryKey: patchKeys.deploymentTasks(id),
    queryFn: () => patchService.getDeploymentTasks(id),
    enabled: !!id,
  });
}

export function useDeploymentPreview(id: string) {
  return useQuery({
    queryKey: patchKeys.deploymentPreview(id),
    queryFn: () => patchService.previewDeployment(id),
    enabled: !!id,
  });
}

// ============================================
// Patch Test Queries
// ============================================

export function usePatchTests() {
  return useQuery({
    queryKey: patchKeys.patchTests(),
    queryFn: () => patchService.getPatchTests(),
  });
}

export function usePatchTest(id: string) {
  return useQuery({
    queryKey: patchKeys.patchTest(id),
    queryFn: () => patchService.getPatchTest(id),
    enabled: !!id,
  });
}

// ============================================
// Zero Touch Queries
// ============================================

export function useZeroTouchConfigs() {
  return useQuery({
    queryKey: patchKeys.zeroTouchConfigs(),
    queryFn: () => patchService.getZeroTouchConfigs(),
  });
}

export function useZeroTouchConfig(id: string) {
  return useQuery({
    queryKey: patchKeys.zeroTouchConfig(id),
    queryFn: () => patchService.getZeroTouchConfig(id),
    enabled: !!id,
  });
}

// ============================================
// Patch Mutations
// ============================================

export function useCreatePatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Patch>) => patchService.createPatch(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.all });
    },
  });
}

export function useUpdatePatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Patch> }) =>
      patchService.updatePatch(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.all });
    },
  });
}

export function useDeletePatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patchService.deletePatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.all });
    },
  });
}

export function useDiscoverPatches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => patchService.discoverPatches(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.all });
    },
  });
}

export function useAddAffectedProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patchId, data }: { patchId: string; data: { softwareName: string; version?: string; vendor?: string; platform?: string } }) =>
      patchService.addAffectedProduct(patchId, data),
    onSuccess: (_data, { patchId }) => {
      queryClient.invalidateQueries({ queryKey: patchKeys.affectedSoftwares(patchId) });
    },
  });
}

export function useRemoveAffectedProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patchId, productId }: { patchId: string; productId: string }) =>
      patchService.removeAffectedProduct(patchId, productId),
    onSuccess: (_data, { patchId }) => {
      queryClient.invalidateQueries({ queryKey: patchKeys.affectedSoftwares(patchId) });
    },
  });
}

export function useScanEndpoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patchId, data }: { patchId: string; data: { scope: string; endpointIds: string[] } }) =>
      patchService.scanEndpoints(patchId, data),
    onSuccess: (_data, { patchId }) => {
      queryClient.invalidateQueries({ queryKey: patchKeys.endpoints(patchId) });
    },
  });
}

// ============================================
// Deployment Mutations
// ============================================

export function useCreateDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deployment: Partial<Deployment>) => patchService.createDeployment(deployment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.deployments() });
      queryClient.invalidateQueries({ queryKey: patchKeys.patchDeployments() });
    },
  });
}

export function useCancelPatchDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deploymentId: string) => patchService.cancelPatchDeployment(deploymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.patchDeployments() });
    },
  });
}

export function useRetryPatchDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deploymentId: string) => patchService.retryPatchDeployment(deploymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.patchDeployments() });
    },
  });
}

export function useDeleteDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patchService.deleteDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.deployments() });
      queryClient.invalidateQueries({ queryKey: patchKeys.patchDeployments() });
    },
  });
}

export function useExecuteDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patchService.executeDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.deployments() });
    },
  });
}

// ============================================
// Patch Test Mutations
// ============================================

export function useCreatePatchTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (test: Partial<PatchTest>) => patchService.createPatchTest(test),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.patchTests() });
    },
  });
}

export function useApprovePatchTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patchService.approvePatchTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.patchTests() });
    },
  });
}

export function useDeletePatchTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patchService.deletePatchTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.patchTests() });
    },
  });
}

// ============================================
// Zero Touch Mutations
// ============================================

export function useCreateZeroTouchConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<ZeroTouchConfig>) => patchService.createZeroTouchConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.zeroTouchConfigs() });
    },
  });
}

export function useUpdateZeroTouchConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: Partial<ZeroTouchConfig> }) =>
      patchService.updateZeroTouchConfig(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.zeroTouchConfigs() });
    },
  });
}

export function useDeleteZeroTouchConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patchService.deleteZeroTouchConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patchKeys.zeroTouchConfigs() });
    },
  });
}
