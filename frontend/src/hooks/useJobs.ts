import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsService } from '../services/jobs.service';
import type {
  CreateConfigCatalogInput,
  CreateConfigBundleInput,
  CreateConfigDeploymentInput,
  CreateDeploymentPolicyInput,
  CreateVulnerabilityJobInput,
} from '../services/jobs.service';
import { softwareJobsService } from '../services/softwareJobs.service';
import type { CreateSoftwareDeploymentInput } from '../services/softwareJobs.service';

// ============================================
// Query Keys
// ============================================

export const jobKeys = {
  configCatalog: () => ['config-catalog'] as const,
  configCatalogItem: (id: string) => ['config-catalog', 'detail', id] as const,
  configBundles: () => ['config-bundles'] as const,
  configBundle: (id: string) => ['config-bundles', 'detail', id] as const,
  configDeployments: () => ['config-deployments'] as const,
  configDeploymentTasks: (id: string) => ['config-deployments', 'tasks', id] as const,
  patchJobs: () => ['patch-jobs'] as const,
  patchJob: (id: string) => ['patch-jobs', 'detail', id] as const,
  deploymentPolicies: () => ['deployment-policies'] as const,
  deploymentPolicy: (id: string) => ['deployment-policies', 'detail', id] as const,
  vulnerabilityJobs: () => ['vulnerability-jobs'] as const,
  vulnerabilityJob: (id: string) => ['vulnerability-jobs', 'detail', id] as const,
  softwareDeployments: () => ['software-deployments'] as const,
  softwareDeployment: (id: string) => ['software-deployments', 'detail', id] as const,
  softwareDeploymentTasks: (id: string) => ['software-deployments', 'tasks', id] as const,
  softwarePackages: () => ['software-packages'] as const,
  softwareBundles: () => ['software-bundles'] as const,
  softwareAgents: () => ['software-agents'] as const,
};

// ============================================
// Config Catalog Queries
// ============================================

export function useConfigCatalog() {
  return useQuery({
    queryKey: jobKeys.configCatalog(),
    queryFn: () => jobsService.getConfigCatalog(),
  });
}

export function useConfigCatalogItem(id: string) {
  return useQuery({
    queryKey: jobKeys.configCatalogItem(id),
    queryFn: () => jobsService.getConfigCatalogItem(id),
    enabled: !!id,
  });
}

// ============================================
// Config Bundle Queries
// ============================================

export function useConfigBundles() {
  return useQuery({
    queryKey: jobKeys.configBundles(),
    queryFn: () => jobsService.getConfigBundles(),
  });
}

export function useConfigBundle(id: string) {
  return useQuery({
    queryKey: jobKeys.configBundle(id),
    queryFn: () => jobsService.getConfigBundle(id),
    enabled: !!id,
  });
}

// ============================================
// Config Deployment Queries
// ============================================

export function useConfigDeployments() {
  return useQuery({
    queryKey: jobKeys.configDeployments(),
    queryFn: () => jobsService.getConfigDeployments(),
  });
}

export function useConfigDeploymentTasks(id: string) {
  return useQuery({
    queryKey: jobKeys.configDeploymentTasks(id),
    queryFn: () => jobsService.getConfigDeploymentTasks(id),
    enabled: !!id,
  });
}

// ============================================
// Patch Job Queries
// ============================================

export function usePatchJobs() {
  return useQuery({
    queryKey: jobKeys.patchJobs(),
    queryFn: () => jobsService.getPatchJobs(),
  });
}

export function usePatchJob(id: string) {
  return useQuery({
    queryKey: jobKeys.patchJob(id),
    queryFn: () => jobsService.getPatchJob(id),
    enabled: !!id,
  });
}

// ============================================
// Deployment Policy Queries
// ============================================

export function useDeploymentPolicies() {
  return useQuery({
    queryKey: jobKeys.deploymentPolicies(),
    queryFn: () => jobsService.getDeploymentPolicies(),
  });
}

export function useDeploymentPolicy(id: string) {
  return useQuery({
    queryKey: jobKeys.deploymentPolicy(id),
    queryFn: () => jobsService.getDeploymentPolicy(id),
    enabled: !!id,
  });
}

// ============================================
// Vulnerability Job Queries
// ============================================

export function useVulnerabilityJobs() {
  return useQuery({
    queryKey: jobKeys.vulnerabilityJobs(),
    queryFn: () => jobsService.getVulnerabilityJobs(),
  });
}

export function useVulnerabilityJob(id: string) {
  return useQuery({
    queryKey: jobKeys.vulnerabilityJob(id),
    queryFn: () => jobsService.getVulnerabilityJob(id),
    enabled: !!id,
  });
}

// ============================================
// Software Deployment Queries
// ============================================

export function useSoftwareDeployments() {
  return useQuery({
    queryKey: jobKeys.softwareDeployments(),
    queryFn: () => softwareJobsService.listDeployments(),
  });
}

export function useSoftwareDeployment(id: string) {
  return useQuery({
    queryKey: jobKeys.softwareDeployment(id),
    queryFn: () => softwareJobsService.getDeployment(id),
    enabled: !!id,
  });
}

export function useSoftwareDeploymentTasks(id: string) {
  return useQuery({
    queryKey: jobKeys.softwareDeploymentTasks(id),
    queryFn: () => softwareJobsService.getDeployment(id).then(d => d.tasks),
    enabled: !!id,
  });
}

export function useSoftwarePackages() {
  return useQuery({
    queryKey: jobKeys.softwarePackages(),
    queryFn: () => softwareJobsService.listPackages(),
  });
}

export function useSoftwareBundles() {
  return useQuery({
    queryKey: jobKeys.softwareBundles(),
    queryFn: () => softwareJobsService.listBundles(),
  });
}

export function useSoftwareAgents() {
  return useQuery({
    queryKey: jobKeys.softwareAgents(),
    queryFn: () => softwareJobsService.listAgents(),
  });
}

// ============================================
// Config Catalog Mutations
// ============================================

export function useCreateConfigCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConfigCatalogInput) => jobsService.createConfigCatalog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.configCatalog() });
    },
  });
}

export function useUpdateConfigCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateConfigCatalogInput> }) =>
      jobsService.updateConfigCatalog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.configCatalog() });
    },
  });
}

export function useDeleteConfigCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsService.deleteConfigCatalog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.configCatalog() });
    },
  });
}

// ============================================
// Config Bundle Mutations
// ============================================

export function useCreateConfigBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConfigBundleInput) => jobsService.createConfigBundle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.configBundles() });
    },
  });
}

export function useUpdateConfigBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateConfigBundleInput> }) =>
      jobsService.updateConfigBundle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.configBundles() });
    },
  });
}

export function useDeleteConfigBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsService.deleteConfigBundle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.configBundles() });
    },
  });
}

// ============================================
// Config Deployment Mutations
// ============================================

export function useCreateConfigDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConfigDeploymentInput) => jobsService.createConfigDeployment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.configDeployments() });
    },
  });
}

export function useDeleteConfigDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsService.deleteConfigDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.configDeployments() });
    },
  });
}

// ============================================
// Patch Job Mutations
// ============================================

export function useDeletePatchJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsService.deletePatchJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.patchJobs() });
    },
  });
}

// ============================================
// Deployment Policy Mutations
// ============================================

export function useCreateDeploymentPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeploymentPolicyInput) => jobsService.createDeploymentPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deploymentPolicies() });
    },
  });
}

export function useUpdateDeploymentPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDeploymentPolicyInput> }) =>
      jobsService.updateDeploymentPolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deploymentPolicies() });
    },
  });
}

export function useDeleteDeploymentPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsService.deleteDeploymentPolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deploymentPolicies() });
    },
  });
}

// ============================================
// Vulnerability Job Mutations
// ============================================

export function useCreateVulnerabilityJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVulnerabilityJobInput) => jobsService.createVulnerabilityJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.vulnerabilityJobs() });
    },
  });
}

export function useDeleteVulnerabilityJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsService.deleteVulnerabilityJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.vulnerabilityJobs() });
    },
  });
}

// ============================================
// Software Deployment Mutations
// ============================================

export function useCreateSoftwareDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSoftwareDeploymentInput) => softwareJobsService.createDeployment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.softwareDeployments() });
    },
  });
}

export function useCancelSoftwareDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softwareJobsService.cancelDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.softwareDeployments() });
    },
  });
}

export function useTriggerRollback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deploymentId, taskId, options }: { deploymentId: string; taskId: string; options?: { force?: boolean } }) =>
      softwareJobsService.triggerRollback(deploymentId, taskId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.softwareDeployments() });
    },
  });
}
