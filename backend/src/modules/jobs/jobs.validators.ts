import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// Patch Jobs Schemas
// ============================================

export const patchJobListQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  type: z.enum(['SCHEDULE', 'INSTANT']).optional(),
});

export const createPatchJobSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['SCHEDULE', 'INSTANT']).default('SCHEDULE'),
  configType: z.enum(['INSTALL', 'ROLLBACK']).default('INSTALL'),
  scope: z.enum(['GLOBAL', 'GROUP', 'ENDPOINT']).default('GLOBAL'),
  endpoints: z.array(z.string()).optional(),
  patches: z.array(z.string()).default([]),
  deploymentPolicy: z.string().optional(),
  retryCount: z.number().int().min(1).max(10).default(1),
  batchSize: z.number().int().positive().optional(),
  notifyTo: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type CreatePatchJobInput = z.infer<typeof createPatchJobSchema>;
export type PatchJobListQuery = z.infer<typeof patchJobListQuerySchema>;

// ============================================
// Vulnerability Jobs Schemas
// ============================================

export const vulnerabilityJobListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['RUNNING', 'COMPLETED', 'FAILED', 'SCHEDULED']).optional(),
});

export const createVulnerabilityJobSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  scope: z.enum(['GLOBAL', 'GROUP', 'ENDPOINT']).default('GLOBAL'),
  endpoints: z.array(z.string()).optional(),
  scanType: z.enum(['INSTANT', 'SCHEDULED']).default('INSTANT'),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  recurrence: z.enum(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
});

export const updateVulnerabilityDBSyncSchema = z.object({
  scanJobInterval: z.number().int().min(1).max(999),
  scanJobUnit: z.enum(['HOUR', 'DAY', 'WEEK']),
  databaseSyncTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
});

export type CreateVulnerabilityJobInput = z.infer<typeof createVulnerabilityJobSchema>;
export type VulnerabilityJobListQuery = z.infer<typeof vulnerabilityJobListQuerySchema>;
export type UpdateVulnerabilityDBSyncInput = z.infer<typeof updateVulnerabilityDBSyncSchema>;

// ============================================
// Software Deployment Schemas
// ============================================

export const softwareDeploymentListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['COMPLETED', 'IN_PROGRESS', 'INSTALLED', 'FAILED']).optional(),
});

export const createSoftwareDeploymentSchema = z.object({
  deploymentName: z.string().min(1).max(255),
  description: z.string().optional(),
  deploymentType: z.enum(['INSTALL', 'UNINSTALL', 'UPGRADE']).default('INSTALL'),
  selectionType: z.enum(['APPLICATION', 'BUNDLE']).default('APPLICATION'),
  selectedItems: z.array(z.string()).min(1),
  scope: z.enum(['ALL', 'WINDOWS', 'MAC', 'LINUX']).default('ALL'),
  endpoints: z.array(z.string()).optional(),
  deploymentPolicy: z.string().optional(),
  retryCount: z.number().int().min(1).max(10).default(1),
  notifyTo: z.enum(['ADMIN', 'USER']).default('ADMIN'),
});

export type CreateSoftwareDeploymentInput = z.infer<typeof createSoftwareDeploymentSchema>;
export type SoftwareDeploymentListQuery = z.infer<typeof softwareDeploymentListQuerySchema>;

// ============================================
// Configuration Catalog Schemas
// ============================================

export const configCatalogListQuerySchema = paginationQuerySchema.extend({
  os: z.enum(['WINDOWS', 'MAC', 'LINUX']).optional(),
  search: z.string().optional(),
});

export const createConfigCatalogSchema = z.object({
  name: z.string().min(1).max(255),
  os: z.enum(['WINDOWS', 'MAC', 'LINUX']),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  configurationType: z.enum(['COMMAND', 'POLICY', 'SCRIPT']).default('COMMAND'),
  architecture: z.enum(['X64', 'X86', 'ARM64']).default('X64'),
  isRemediation: z.boolean().default(false),
  commandType: z.enum(['POWERSHELL', 'CMD', 'BASH', 'SH']).default('POWERSHELL'),
  command: z.string().min(1),
});

export const updateConfigCatalogSchema = createConfigCatalogSchema.partial();

export type CreateConfigCatalogInput = z.infer<typeof createConfigCatalogSchema>;
export type UpdateConfigCatalogInput = z.infer<typeof updateConfigCatalogSchema>;
export type ConfigCatalogListQuery = z.infer<typeof configCatalogListQuerySchema>;

// ============================================
// Configuration Bundle Schemas
// ============================================

export const configBundleListQuerySchema = paginationQuerySchema.extend({
  os: z.enum(['WINDOWS', 'MAC', 'LINUX']).optional(),
});

export const createConfigBundleSchema = z.object({
  bundleName: z.string().min(1).max(255),
  os: z.enum(['WINDOWS', 'MAC', 'LINUX']),
  description: z.string().optional(),
  configurations: z.array(z.string()).default([]),
});

export const updateConfigBundleSchema = createConfigBundleSchema.partial();

export type CreateConfigBundleInput = z.infer<typeof createConfigBundleSchema>;
export type UpdateConfigBundleInput = z.infer<typeof updateConfigBundleSchema>;
export type ConfigBundleListQuery = z.infer<typeof configBundleListQuerySchema>;

// ============================================
// Configuration Deployment Schemas
// ============================================

export const configDeploymentListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['COMPLETED', 'IN_PROGRESS', 'INSTALLED', 'FAILED']).optional(),
});

export const createConfigDeploymentSchema = z.object({
  deploymentName: z.string().min(1).max(255),
  description: z.string().optional(),
  selectionType: z.enum(['CONFIGURATION', 'BUNDLE']).default('CONFIGURATION'),
  selectedItems: z.array(z.string()).min(1),
  scope: z.enum(['ALL', 'WINDOWS', 'MAC', 'LINUX']).default('ALL'),
  endpoints: z.array(z.string()).optional(),
  deploymentPolicy: z.string().optional(),
  retryCount: z.number().int().min(1).max(10).default(1),
  notifyTo: z.enum(['ADMIN', 'USER']).default('ADMIN'),
});

export type CreateConfigDeploymentInput = z.infer<typeof createConfigDeploymentSchema>;
export type ConfigDeploymentListQuery = z.infer<typeof configDeploymentListQuerySchema>;

// ============================================
// Deployment Policy Schemas
// ============================================

export const deploymentPolicyListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['SCHEDULE', 'INSTANT']).optional(),
});

export const createDeploymentPolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['SCHEDULE', 'INSTANT']).default('INSTANT'),
  supportedModule: z.enum(['ALL', 'PATCH', 'UPDATE', 'SECURITY']).default('ALL'),
  relatedType: z.enum(['NO_RELATION', 'CRITICAL', 'IMPORTANT', 'OPTIONAL']).default('NO_RELATION'),
});

export const updateDeploymentPolicySchema = createDeploymentPolicySchema.partial();

export type CreateDeploymentPolicyInput = z.infer<typeof createDeploymentPolicySchema>;
export type UpdateDeploymentPolicyInput = z.infer<typeof updateDeploymentPolicySchema>;
export type DeploymentPolicyListQuery = z.infer<typeof deploymentPolicyListQuerySchema>;
