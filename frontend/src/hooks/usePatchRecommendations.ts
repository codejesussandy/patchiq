import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patchRecommendationService } from '../services/patch-recommendation.service';
import type { ListRecommendationsParams } from '../types/patch-recommendation.types';

export const patchRecommendationKeys = {
  all: ['patch-recommendations'] as const,
  lists: (params?: ListRecommendationsParams) => [...patchRecommendationKeys.all, 'list', params] as const,
  detail: (id: string) => [...patchRecommendationKeys.all, 'detail', id] as const,
  dashboardStats: () => [...patchRecommendationKeys.all, 'dashboard'] as const,
  asset: (assetId: string, params?: ListRecommendationsParams) => [...patchRecommendationKeys.all, 'asset', assetId, params] as const,
  patch: (patchId: string, params?: ListRecommendationsParams) => [...patchRecommendationKeys.all, 'patch', patchId, params] as const,
};

export function usePatchRecommendations(params?: ListRecommendationsParams) {
  return useQuery({
    queryKey: patchRecommendationKeys.lists(params),
    queryFn: () => patchRecommendationService.listRecommendations(params),
  });
}

export function usePatchRecommendation(id: string) {
  return useQuery({
    queryKey: patchRecommendationKeys.detail(id),
    queryFn: () => patchRecommendationService.getRecommendation(id),
    enabled: !!id,
  });
}

export function usePatchRecommendationDashboardStats() {
  return useQuery({
    queryKey: patchRecommendationKeys.dashboardStats(),
    queryFn: () => patchRecommendationService.getDashboardStats(),
  });
}

export function useAssetRecommendations(assetId: string, params?: ListRecommendationsParams) {
  return useQuery({
    queryKey: patchRecommendationKeys.asset(assetId, params),
    queryFn: () => patchRecommendationService.getAssetRecommendations(assetId, params),
    enabled: !!assetId,
  });
}

export function usePatchRecommendationsForPatch(patchId: string, params?: ListRecommendationsParams) {
  return useQuery({
    queryKey: patchRecommendationKeys.patch(patchId, params),
    queryFn: () => patchRecommendationService.getPatchRecommendations(patchId, params),
    enabled: !!patchId,
  });
}

export function useAcceptRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      patchRecommendationService.acceptRecommendation(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patchRecommendationKeys.all });
    },
  });
}

export function useRejectRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      patchRecommendationService.rejectRecommendation(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patchRecommendationKeys.all });
    },
  });
}

export function useDeployRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patchRecommendationService.deployRecommendation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patchRecommendationKeys.all });
    },
  });
}

export function useBulkAcceptRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) =>
      patchRecommendationService.bulkAccept(ids, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patchRecommendationKeys.all });
    },
  });
}

export function useBulkRejectRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason: string }) =>
      patchRecommendationService.bulkReject(ids, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patchRecommendationKeys.all });
    },
  });
}

export function useBulkDeployRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => patchRecommendationService.bulkDeploy(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patchRecommendationKeys.all });
    },
  });
}
