import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '../services/asset.service';
import { categoryService } from '../services/category.service';
import { tagService } from '../services/tag.service';
import type { AddAssetFormData, Asset, SoftwareLicense, OSLicense } from '../types/asset.types';
import type { Category, SubCategory, Tag } from '../types/asset.types';

// ============================================
// Query Keys
// ============================================

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  lifecycle: (id: string, method?: string) => [...assetKeys.all, 'lifecycle', id, method] as const,
  hardware: (id: string) => [...assetKeys.all, 'hardware', id] as const,
  expandedHardware: (id: string) => [...assetKeys.all, 'expanded-hardware', id] as const,
  software: (id: string) => [...assetKeys.all, 'software', id] as const,
  auditLog: (id: string) => [...assetKeys.all, 'audit-log', id] as const,
  patches: (id: string) => [...assetKeys.all, 'patches', id] as const,
  deployments: (id: string) => [...assetKeys.all, 'deployments', id] as const,
  vulnerabilities: (id: string) => [...assetKeys.all, 'vulnerabilities', id] as const,
  alerts: (id: string) => [...assetKeys.all, 'alerts', id] as const,
  security: (id: string) => [...assetKeys.all, 'security', id] as const,
  network: (id: string) => [...assetKeys.all, 'network', id] as const,
  peripherals: (id: string) => [...assetKeys.all, 'peripherals', id] as const,
  telemetry: (id: string) => [...assetKeys.all, 'telemetry', id] as const,
  telemetryHistory: (id: string, hours?: number) => [...assetKeys.all, 'telemetry-history', id, hours] as const,
  errors: (id: string) => [...assetKeys.all, 'errors', id] as const,
  full: (id: string) => [...assetKeys.all, 'full', id] as const,
  softwareInventory: () => ['software-inventory'] as const,
  softwareInventoryItem: (id: string) => ['software-inventory', id] as const,
  softwareLicenses: () => ['software-licenses'] as const,
  softwareLicense: (id: string) => ['software-licenses', id] as const,
  osLicenses: () => ['os-licenses'] as const,
  osLicense: (id: string) => ['os-licenses', id] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
  assets: (id: string) => [...categoryKeys.all, 'assets', id] as const,
  subCategories: (categoryId?: string) => ['subcategories', categoryId] as const,
  subCategory: (id: string) => ['subcategories', 'detail', id] as const,
  subCategoryAssets: (id: string) => ['subcategories', 'assets', id] as const,
};

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  detail: (id: string) => [...tagKeys.all, 'detail', id] as const,
  assets: (tagId: string) => [...tagKeys.all, 'assets', tagId] as const,
  assetTags: (assetId: string) => [...tagKeys.all, 'asset-tags', assetId] as const,
  search: (query: string) => [...tagKeys.all, 'search', query] as const,
  popular: (limit?: number) => [...tagKeys.all, 'popular', limit] as const,
};

// ============================================
// Asset Queries
// ============================================

export function useAssets() {
  return useQuery({
    queryKey: assetKeys.lists(),
    queryFn: () => assetService.getAssets(),
  });
}

/** Server-side paginated asset list query */
export function useAssetsList(params: {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: string;
  search?: string;
  status?: string;
  operationalStatus?: string;
  categoryId?: string;
  subCategoryId?: string;
  os?: string;
}) {
  return useQuery({
    queryKey: [...assetKeys.lists(), params],
    queryFn: () =>
      assetService.getAssetsPaginated({
        page: params.page,
        limit: params.pageSize,
        sort: params.sort,
        order: params.order,
        search: params.search || undefined,
        status: params.status || undefined,
        operationalStatus: params.operationalStatus || undefined,
        categoryId: params.categoryId || undefined,
        subCategoryId: params.subCategoryId || undefined,
        os: params.os || undefined,
      }),
    placeholderData: (prev) => prev,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => assetService.getAsset(id),
    enabled: !!id,
  });
}

export function useAssetLifeCycle(id: string, method?: string) {
  return useQuery({
    queryKey: assetKeys.lifecycle(id, method),
    queryFn: () => assetService.getAssetLifeCycle(id, method),
    enabled: !!id,
  });
}

export function useAssetHardware(id: string) {
  return useQuery({
    queryKey: assetKeys.hardware(id),
    queryFn: () => assetService.getAssetHardware(id),
    enabled: !!id,
  });
}

export function useAssetExpandedHardware(id: string) {
  return useQuery({
    queryKey: assetKeys.expandedHardware(id),
    queryFn: () => assetService.getAssetExpandedHardware(id),
    enabled: !!id,
  });
}

export function useAssetSoftware(id: string) {
  return useQuery({
    queryKey: assetKeys.software(id),
    queryFn: () => assetService.getAssetSoftware(id),
    enabled: !!id,
  });
}

export function useAssetAuditLog(id: string) {
  return useQuery({
    queryKey: assetKeys.auditLog(id),
    queryFn: () => assetService.getAssetAuditLog(id),
    enabled: !!id,
  });
}

export function useAssetPatches(id: string) {
  return useQuery({
    queryKey: assetKeys.patches(id),
    queryFn: () => assetService.getAssetPatches(id),
    enabled: !!id,
  });
}

export function useAssetDeployments(id: string) {
  return useQuery({
    queryKey: assetKeys.deployments(id),
    queryFn: () => assetService.getAssetDeployments(id),
    enabled: !!id,
  });
}

export function useAssetVulnerabilities(id: string) {
  return useQuery({
    queryKey: assetKeys.vulnerabilities(id),
    queryFn: () => assetService.getAssetVulnerabilities(id),
    enabled: !!id,
  });
}

export function useAssetAlerts(id: string) {
  return useQuery({
    queryKey: assetKeys.alerts(id),
    queryFn: () => assetService.getAssetAlerts(id),
    enabled: !!id,
  });
}

export function useAssetSecurity(id: string) {
  return useQuery({
    queryKey: assetKeys.security(id),
    queryFn: () => assetService.getAssetSecurity(id),
    enabled: !!id,
  });
}

export function useAssetNetwork(id: string) {
  return useQuery({
    queryKey: assetKeys.network(id),
    queryFn: () => assetService.getAssetNetwork(id),
    enabled: !!id,
  });
}

export function useAssetPeripherals(id: string) {
  return useQuery({
    queryKey: assetKeys.peripherals(id),
    queryFn: () => assetService.getAssetPeripherals(id),
    enabled: !!id,
  });
}

export function useAssetTelemetry(id: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: assetKeys.telemetry(id),
    queryFn: () => assetService.getAssetTelemetry(id),
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  });
}

export function useAssetTelemetryHistory(id: string, hours: number = 24) {
  return useQuery({
    queryKey: assetKeys.telemetryHistory(id, hours),
    queryFn: () => assetService.getAssetTelemetryHistory(id, hours),
    enabled: !!id,
  });
}

export function useAssetErrors(id: string) {
  return useQuery({
    queryKey: assetKeys.errors(id),
    queryFn: () => assetService.getAssetErrors(id),
    enabled: !!id,
  });
}

export function useAssetFull(id: string) {
  return useQuery({
    queryKey: assetKeys.full(id),
    queryFn: () => assetService.getAssetWithPatchDetails(id),
    enabled: !!id,
  });
}

// ============================================
// Software Inventory Queries
// ============================================

export function useSoftwareInventory() {
  return useQuery({
    queryKey: assetKeys.softwareInventory(),
    queryFn: () => assetService.getSoftwareInventory(),
  });
}

export function useSoftwareInventoryItem(id: string) {
  return useQuery({
    queryKey: assetKeys.softwareInventoryItem(id),
    queryFn: () => assetService.getSoftwareInventoryItem(id),
    enabled: !!id,
  });
}

// ============================================
// Software License Queries
// ============================================

export function useSoftwareLicenses() {
  return useQuery({
    queryKey: assetKeys.softwareLicenses(),
    queryFn: () => assetService.getSoftwareLicenses(),
  });
}

export function useSoftwareLicense(id: string) {
  return useQuery({
    queryKey: assetKeys.softwareLicense(id),
    queryFn: () => assetService.getSoftwareLicense(id),
    enabled: !!id,
  });
}

// ============================================
// OS License Queries
// ============================================

export function useOSLicenses() {
  return useQuery({
    queryKey: assetKeys.osLicenses(),
    queryFn: () => assetService.getOSLicenses(),
  });
}

export function useOSLicense(id: string) {
  return useQuery({
    queryKey: assetKeys.osLicense(id),
    queryFn: () => assetService.getOSLicense(id),
    enabled: !!id,
  });
}

// ============================================
// Category Queries
// ============================================

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: () => categoryService.getCategories(),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => categoryService.getCategory(id),
    enabled: !!id,
  });
}

export function useCategoryAssets(categoryId: string) {
  return useQuery({
    queryKey: categoryKeys.assets(categoryId),
    queryFn: () => categoryService.getAssetsByCategory(categoryId),
    enabled: !!categoryId,
  });
}

export function useSubCategories(categoryId?: string) {
  return useQuery({
    queryKey: categoryKeys.subCategories(categoryId),
    queryFn: () => categoryService.getSubCategories(categoryId),
  });
}

export function useSubCategoryAssets(subCategoryId: string) {
  return useQuery({
    queryKey: categoryKeys.subCategoryAssets(subCategoryId),
    queryFn: () => categoryService.getAssetsBySubCategory(subCategoryId),
    enabled: !!subCategoryId,
  });
}

// ============================================
// Tag Queries
// ============================================

export function useTags() {
  return useQuery({
    queryKey: tagKeys.lists(),
    queryFn: () => tagService.getTags(),
  });
}

export function useTag(id: string) {
  return useQuery({
    queryKey: tagKeys.detail(id),
    queryFn: () => tagService.getTag(id),
    enabled: !!id,
  });
}

export function useTagAssets(tagId: string) {
  return useQuery({
    queryKey: tagKeys.assets(tagId),
    queryFn: () => tagService.getTagAssets(tagId),
    enabled: !!tagId,
  });
}

export function useAssetTags(assetId: string) {
  return useQuery({
    queryKey: tagKeys.assetTags(assetId),
    queryFn: () => tagService.getAssetTags(assetId),
    enabled: !!assetId,
  });
}

export function useSearchTags(query: string) {
  return useQuery({
    queryKey: tagKeys.search(query),
    queryFn: () => tagService.searchTags(query),
    enabled: !!query,
  });
}

export function usePopularTags(limit?: number) {
  return useQuery({
    queryKey: tagKeys.popular(limit),
    queryFn: () => tagService.getPopularTags(limit),
  });
}

// ============================================
// Asset Mutations
// ============================================

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddAssetFormData) => assetService.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset> }) =>
      assetService.updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useBulkCreateAssets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddAssetFormData[]) => assetService.bulkCreateAssets(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useRefreshAssetInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.refreshAssetInventory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useUploadAssetAttachment() {
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      assetService.uploadAssetAttachment(id, file),
  });
}

export function useImportSoftwareInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => assetService.importSoftwareInventory(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.softwareInventory() });
    },
  });
}

// ============================================
// Software License Mutations
// ============================================

export function useCreateSoftwareLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SoftwareLicense>) => assetService.createSoftwareLicense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.softwareLicenses() });
    },
  });
}

export function useUpdateSoftwareLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SoftwareLicense> }) =>
      assetService.updateSoftwareLicense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.softwareLicenses() });
    },
  });
}

export function useDeleteSoftwareLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.deleteSoftwareLicense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.softwareLicenses() });
    },
  });
}

export function useImportSoftwareLicenses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => assetService.importSoftwareLicenses(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.softwareLicenses() });
    },
  });
}

// ============================================
// OS License Mutations
// ============================================

export function useCreateOSLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OSLicense>) => assetService.createOSLicense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.osLicenses() });
    },
  });
}

export function useUpdateOSLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OSLicense> }) =>
      assetService.updateOSLicense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.osLicenses() });
    },
  });
}

export function useDeleteOSLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.deleteOSLicense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.osLicenses() });
    },
  });
}

export function useImportOSLicenses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => assetService.importOSLicenses(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.osLicenses() });
    },
  });
}

// ============================================
// Category Mutations
// ============================================

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Category, 'id'>) => categoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useCreateSubCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SubCategory, 'id'>) => categoryService.createSubCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateSubCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubCategory> }) =>
      categoryService.updateSubCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteSubCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryService.deleteSubCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

// ============================================
// Tag Mutations
// ============================================

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Tag, 'id' | 'assetCount' | 'createdAt'>) => tagService.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tag> }) =>
      tagService.updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagService.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

export function useAssignTagsToAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, tagIds }: { assetId: string; tagIds: string[] }) =>
      tagService.assignTagsToAsset(assetId, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useRemoveTagFromAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, tagId }: { assetId: string; tagId: string }) =>
      tagService.removeTagFromAsset(assetId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useBulkAssignTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetIds, tagIds }: { assetIds: string[]; tagIds: string[] }) =>
      tagService.bulkAssignTags(assetIds, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useBulkRemoveTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetIds, tagIds }: { assetIds: string[]; tagIds: string[] }) =>
      tagService.bulkRemoveTags(assetIds, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}
