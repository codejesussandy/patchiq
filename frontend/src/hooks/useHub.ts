import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubService } from '../services/hub.service';
import type { CreatePackageInput, UpdatePackageInput, PackageListFilters, CreateBundleInput } from '../types/hub.types';

export const hubKeys = {
  all: ['hub'] as const,
  stats: () => [...hubKeys.all, 'stats'] as const,
  packages: (filters?: PackageListFilters) => [...hubKeys.all, 'packages', filters] as const,
  packagesGrouped: (filters?: PackageListFilters) => [...hubKeys.all, 'packages-grouped', filters] as const,
  package: (id: string) => [...hubKeys.all, 'packages', 'detail', id] as const,
  downloadUrl: (id: string) => [...hubKeys.all, 'packages', 'download-url', id] as const,
  bundleDownload: (id: string) => [...hubKeys.all, 'packages', 'bundle', id] as const,
  bundles: (platform?: string) => [...hubKeys.all, 'bundles', platform] as const,
  bundle: (id: string) => [...hubKeys.all, 'bundles', 'detail', id] as const,
};

// ============================================
// Queries
// ============================================

export function useHubStats() {
  return useQuery({ queryKey: hubKeys.stats(), queryFn: () => hubService.getStats() });
}

export function useHubPackages(filters?: PackageListFilters) {
  return useQuery({ queryKey: hubKeys.packages(filters), queryFn: () => hubService.listPackages(filters) });
}

export function useHubPackagesGrouped(filters?: PackageListFilters) {
  return useQuery({ queryKey: hubKeys.packagesGrouped(filters), queryFn: () => hubService.listPackagesGrouped(filters) });
}

export function useHubPackage(id: string) {
  return useQuery({ queryKey: hubKeys.package(id), queryFn: () => hubService.getPackage(id), enabled: !!id });
}

export function usePackageDownloadUrl(id: string) {
  return useQuery({ queryKey: hubKeys.downloadUrl(id), queryFn: () => hubService.getDownloadUrl(id), enabled: !!id });
}

export function useBundleDownloadInfo(id: string) {
  return useQuery({ queryKey: hubKeys.bundleDownload(id), queryFn: () => hubService.getBundleDownloadInfo(id), enabled: !!id });
}

export function useHubBundles(platform?: string) {
  return useQuery({ queryKey: hubKeys.bundles(platform), queryFn: () => hubService.listBundles(platform) });
}

export function useHubBundle(id: string) {
  return useQuery({ queryKey: hubKeys.bundle(id), queryFn: () => hubService.getBundle(id), enabled: !!id });
}

// ============================================
// Mutations
// ============================================

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: CreatePackageInput) => hubService.createPackage(data), onSuccess: () => { qc.invalidateQueries({ queryKey: hubKeys.all }); } });
}

export function useUpdatePackage() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdatePackageInput }) => hubService.updatePackage(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: hubKeys.all }); } });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => hubService.deletePackage(id), onSuccess: () => { qc.invalidateQueries({ queryKey: hubKeys.all }); } });
}

export function useUploadPackageFile() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ packageId, file }: { packageId: string; file: File }) => hubService.uploadPackageFile(packageId, file), onSuccess: () => { qc.invalidateQueries({ queryKey: hubKeys.all }); } });
}

export function useUploadPackageBundle() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (file: File) => hubService.uploadPackageBundle(file), onSuccess: () => { qc.invalidateQueries({ queryKey: hubKeys.all }); } });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: CreateBundleInput) => hubService.createBundle(data), onSuccess: () => { qc.invalidateQueries({ queryKey: hubKeys.all }); } });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => hubService.deleteBundle(id), onSuccess: () => { qc.invalidateQueries({ queryKey: hubKeys.all }); } });
}
