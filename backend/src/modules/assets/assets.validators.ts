import { z } from 'zod';

// Common validators
const uuidSchema = z.string().uuid();
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional();

// Asset Status enum
export const assetStatusSchema = z.enum(['IN_USE', 'AVAILABLE', 'UNDER_MAINTENANCE', 'RETIRED']);
export const operationalStatusSchema = z.enum(['CONNECTED', 'DISCONNECTED']);
export const osTypeSchema = z.enum(['WINDOWS', 'MACOS', 'LINUX']);

// Category Validators
export const categoryCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  color: hexColorSchema,
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  color: hexColorSchema,
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const categoryIdParamSchema = z.object({
  id: uuidSchema,
});

// SubCategory Validators
export const subCategoryCreateSchema = z.object({
  categoryId: uuidSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  criticality: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  description: z.string().max(500).optional(),
});

export const subCategoryUpdateSchema = z.object({
  categoryId: uuidSchema.optional(),
  name: z.string().min(2).max(100).optional(),
  criticality: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export const subCategoryIdParamSchema = z.object({
  id: uuidSchema,
});

// Tag Validators
export const tagCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: hexColorSchema,
  icon: z.string().max(50).optional(),
  description: z.string().max(255).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  compliance: z.boolean().optional(),
});

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: hexColorSchema,
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  priority: z.number().int().min(0).max(100).optional(),
  compliance: z.boolean().optional(),
});

export const tagIdParamSchema = z.object({
  id: uuidSchema,
});

export const tagQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  search: z.string().optional(),
});

export const popularTagsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export const addTagsToAssetSchema = z.object({
  tagIds: z.array(uuidSchema).min(1, 'At least one tag ID is required'),
});

export const assetTagParamSchema = z.object({
  id: uuidSchema,
  tagId: uuidSchema,
});

export const bulkAssignTagsSchema = z.object({
  assetIds: z.array(uuidSchema).min(1, 'At least one asset ID is required'),
  tagIds: z.array(uuidSchema).min(1, 'At least one tag ID is required'),
});

// Asset Validators
export const assetCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  categoryId: uuidSchema.optional(),
  subCategoryId: uuidSchema.optional(),
  status: assetStatusSchema.optional().default('AVAILABLE'),
  ipAddress: z.string().ip().optional().or(z.literal('')),
  macAddress: z.string().max(17).optional(),
  serialNumber: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  osType: z.string().max(50).optional(),
  osVersion: z.string().max(100).optional(),
  tags: z.array(uuidSchema).optional(),
});

export const assetUpdateSchema = z.object({
  // Basic info
  name: z.string().min(1).max(255).optional(),
  categoryId: uuidSchema.optional().nullable(),
  subCategoryId: uuidSchema.optional().nullable(),
  status: assetStatusSchema.optional(),
  ipAddress: z.string().ip().optional().nullable().or(z.literal('')),
  macAddress: z.string().max(17).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  osType: z.string().max(50).optional().nullable(),
  osVersion: z.string().max(100).optional().nullable(),
  hostname: z.string().max(255).optional().nullable(),
  tags: z.array(z.string()).optional(),

  // Owner info
  ownerName: z.string().max(255).optional().nullable(),
  ownerEmail: z.string().email().optional().nullable().or(z.literal('')),
  ownerDepartment: z.string().max(255).optional().nullable(),

  // Procurement info
  vendor: z.string().max(255).optional().nullable(),
  purchaseDate: z.string().optional().nullable(), // ISO date string
  warrantyExpiry: z.string().optional().nullable(), // ISO date string
  purchaseOrderNumber: z.string().max(100).optional().nullable(),
  amcVendor: z.string().max(255).optional().nullable(),
  amcCost: z.string().max(50).optional().nullable(),
  amcExpiryDate: z.string().optional().nullable(), // ISO date string
  endOfLife: z.string().optional().nullable(), // ISO date string
  endOfSupport: z.string().optional().nullable(), // ISO date string

  // Cost info
  purchaseCost: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  currency: z.string().max(10).optional().nullable(),
  currentValue: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional().nullable(),
  salvageValue: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional().nullable(),
  depreciationType: z.string().max(50).optional().nullable(),
  depreciationRate: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional().nullable(),
});

export const assetIdParamSchema = z.object({
  id: uuidSchema,
});

export const assetQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: assetStatusSchema.optional(),
  operationalStatus: operationalStatusSchema.optional(),
  categoryId: uuidSchema.optional(),
  subCategoryId: uuidSchema.optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Bulk Operations
export const bulkDeleteSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one ID is required'),
});

export const bulkUpdateTagsSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one ID is required'),
  addTags: z.array(uuidSchema).optional(),
  removeTags: z.array(uuidSchema).optional(),
});

// Software License Validators
export const softwareLicenseCreateSchema = z.object({
  licenseName: z.string().min(1, 'License name is required').max(255),
  softwareName: z.string().min(1, 'Software name is required').max(255),
  publisher: z.string().max(255).optional(),
  licenseKey: z.string().max(255).optional(),
  purchaseDate: z.string().optional(),
  expiryDate: z.string().optional(),
  licenseCount: z.number().int().min(1, 'License count must be at least 1'),
  vendorName: z.string().min(1, 'Vendor name is required').max(255),
  cost: z.number().min(0).optional(),
  status: z.enum(['ALLOCATED', 'AVAILABLE', 'EXPIRED']),
  notes: z.string().max(1000).optional(),
});

export const softwareLicenseUpdateSchema = z.object({
  licenseName: z.string().min(1).max(255).optional(),
  softwareName: z.string().min(1).max(255).optional(),
  publisher: z.string().max(255).optional().nullable(),
  licenseKey: z.string().max(255).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  licenseCount: z.number().int().min(1).optional(),
  vendorName: z.string().min(1).max(255).optional(),
  cost: z.number().min(0).optional().nullable(),
  status: z.enum(['ALLOCATED', 'AVAILABLE', 'EXPIRED']).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const softwareLicenseIdParamSchema = z.object({
  id: uuidSchema,
});

// OS License Validators
export const osLicenseCreateSchema = z.object({
  licenseName: z.string().min(1, 'License name is required').max(255),
  osType: z.string().min(1, 'OS type is required').max(100),
  status: z.enum(['ALLOCATED', 'AVAILABLE', 'EXPIRED']),
  licenseCount: z.number().int().min(1, 'License count must be at least 1'),
  vendorName: z.string().min(1, 'Vendor name is required').max(255),
  licenseKey: z.string().max(255).optional(),
  purchaseDate: z.string().optional(),
  expiryDate: z.string().optional(),
  publisher: z.string().max(255).optional(),
  cost: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export const osLicenseUpdateSchema = z.object({
  licenseName: z.string().min(1).max(255).optional(),
  osType: z.string().min(1).max(100).optional(),
  status: z.enum(['ALLOCATED', 'AVAILABLE', 'EXPIRED']).optional(),
  licenseCount: z.number().int().min(1).optional(),
  vendorName: z.string().min(1).max(255).optional(),
  licenseKey: z.string().max(255).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  publisher: z.string().max(255).optional().nullable(),
  cost: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const osLicenseIdParamSchema = z.object({
  id: uuidSchema,
});

// SubCategory List Query
export const subCategoryListQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
});

// Lifecycle Query
export const lifecycleQuerySchema = z.object({
  method: z.string().optional(),
});

// Telemetry History Query
export const telemetryHistoryQuerySchema = z.object({
  period: z.enum(['hour', 'day', 'week']).optional().default('day'),
});

// Export types inferred from schemas
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type SubCategoryCreateInput = z.infer<typeof subCategoryCreateSchema>;
export type SubCategoryUpdateInput = z.infer<typeof subCategoryUpdateSchema>;
export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;
export type TagQueryInput = z.infer<typeof tagQuerySchema>;
export type PopularTagsQueryInput = z.infer<typeof popularTagsQuerySchema>;
export type AddTagsToAssetInput = z.infer<typeof addTagsToAssetSchema>;
export type BulkAssignTagsInput = z.infer<typeof bulkAssignTagsSchema>;
export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
export type AssetQueryInput = z.infer<typeof assetQuerySchema>;
export type SoftwareLicenseCreateInput = z.infer<typeof softwareLicenseCreateSchema>;
export type SoftwareLicenseUpdateInput = z.infer<typeof softwareLicenseUpdateSchema>;
export type OSLicenseCreateInput = z.infer<typeof osLicenseCreateSchema>;
export type OSLicenseUpdateInput = z.infer<typeof osLicenseUpdateSchema>;
export type SubCategoryListQueryInput = z.infer<typeof subCategoryListQuerySchema>;
export type LifecycleQueryInput = z.infer<typeof lifecycleQuerySchema>;
