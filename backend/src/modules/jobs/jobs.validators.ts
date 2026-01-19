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
  scope: z.enum(['Global', 'Group', 'Endpoint']).default('Global'),
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
  scope: z.enum(['Global', 'Group', 'Endpoint']).default('Global'),
  endpoints: z.array(z.string()).optional(),
  scanType: z.enum(['instant', 'scheduled']).default('instant'),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly']).optional(),
});

export const updateVulnerabilityDBSyncSchema = z.object({
  scanJobInterval: z.number().int().min(1).max(999),
  scanJobUnit: z.enum(['Hour', 'Day', 'Week']),
  databaseSyncTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
});

export type CreateVulnerabilityJobInput = z.infer<typeof createVulnerabilityJobSchema>;
export type VulnerabilityJobListQuery = z.infer<typeof vulnerabilityJobListQuerySchema>;
export type UpdateVulnerabilityDBSyncInput = z.infer<typeof updateVulnerabilityDBSyncSchema>;

// ============================================
// Software Catalog Schemas
// ============================================

export const softwareCatalogListQuerySchema = paginationQuerySchema.extend({
  os: z.enum(['Windows', 'Mac', 'Linux']).optional(),
  search: z.string().optional(),
});

export const createSoftwareCatalogSchema = z.object({
  applicationName: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  os: z.enum(['Windows', 'Mac', 'Linux']),
  version: z.string().default('latest'),
  applicationLocationType: z.enum(['Local Directory', 'Network Share', 'URL']).default('URL'),
  installationCommand: z.string().optional(),
  uninstallationCommand: z.string().optional(),
  upgradeCommand: z.string().optional(),
  iconUrl: z.string().url().optional(),
  selfService: z.boolean().default(true),
  architecture: z.enum(['x64', 'x86', 'ARM64']).default('x64'),
  applicationType: z.enum(['MSI', 'EXE', 'APPLICATION', 'ZIP']).default('EXE'),
  applicationFileUrl: z.string().optional(),
});

export const updateSoftwareCatalogSchema = createSoftwareCatalogSchema.partial();

export type CreateSoftwareCatalogInput = z.infer<typeof createSoftwareCatalogSchema>;
export type UpdateSoftwareCatalogInput = z.infer<typeof updateSoftwareCatalogSchema>;
export type SoftwareCatalogListQuery = z.infer<typeof softwareCatalogListQuerySchema>;

// ============================================
// Software Bundle Schemas
// ============================================

export const softwareBundleListQuerySchema = paginationQuerySchema.extend({
  os: z.enum(['Windows', 'Mac', 'Linux']).optional(),
});

export const createSoftwareBundleSchema = z.object({
  bundleName: z.string().min(1).max(255),
  os: z.enum(['Windows', 'Mac', 'Linux']),
  description: z.string().optional(),
  applications: z.array(z.string()).default([]),
});

export const updateSoftwareBundleSchema = createSoftwareBundleSchema.partial();

export type CreateSoftwareBundleInput = z.infer<typeof createSoftwareBundleSchema>;
export type UpdateSoftwareBundleInput = z.infer<typeof updateSoftwareBundleSchema>;
export type SoftwareBundleListQuery = z.infer<typeof softwareBundleListQuerySchema>;

// ============================================
// Software Deployment Schemas
// ============================================

export const softwareDeploymentListQuerySchema = paginationQuerySchema.extend({
  stage: z.enum(['COMPLETED', 'IN_PROGRESS', 'INSTALLED', 'FAILED']).optional(),
});

export const createSoftwareDeploymentSchema = z.object({
  deploymentName: z.string().min(1).max(255),
  description: z.string().optional(),
  deploymentType: z.enum(['install', 'uninstall', 'upgrade']).default('install'),
  selectionType: z.enum(['application', 'bundle']).default('application'),
  selectedItems: z.array(z.string()).min(1),
  scope: z.enum(['all', 'windows', 'mac', 'linux']).default('all'),
  endpoints: z.array(z.string()).optional(),
  deploymentPolicy: z.string().optional(),
  retryCount: z.number().int().min(1).max(10).default(1),
  notifyTo: z.enum(['admin', 'user']).default('admin'),
});

export type CreateSoftwareDeploymentInput = z.infer<typeof createSoftwareDeploymentSchema>;
export type SoftwareDeploymentListQuery = z.infer<typeof softwareDeploymentListQuerySchema>;

// ============================================
// Configuration Catalog Schemas
// ============================================

export const configCatalogListQuerySchema = paginationQuerySchema.extend({
  os: z.enum(['Windows', 'Mac', 'Linux']).optional(),
  search: z.string().optional(),
});

export const createConfigCatalogSchema = z.object({
  name: z.string().min(1).max(255),
  os: z.enum(['Windows', 'Mac', 'Linux']),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  configurationType: z.enum(['command', 'policy', 'script']).default('command'),
  architecture: z.enum(['x64', 'x86', 'ARM64']).default('x64'),
  isRemediation: z.boolean().default(false),
  commandType: z.enum(['powershell', 'cmd', 'bash', 'sh']).default('powershell'),
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
  os: z.enum(['Windows', 'Mac', 'Linux']).optional(),
});

export const createConfigBundleSchema = z.object({
  bundleName: z.string().min(1).max(255),
  os: z.enum(['Windows', 'Mac', 'Linux']),
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
  stage: z.enum(['COMPLETED', 'IN_PROGRESS', 'INSTALLED', 'FAILED']).optional(),
});

export const createConfigDeploymentSchema = z.object({
  deploymentName: z.string().min(1).max(255),
  description: z.string().optional(),
  selectionType: z.enum(['configuration', 'bundle']).default('configuration'),
  selectedItems: z.array(z.string()).min(1),
  scope: z.enum(['all', 'windows', 'mac', 'linux']).default('all'),
  endpoints: z.array(z.string()).optional(),
  deploymentPolicy: z.string().optional(),
  retryCount: z.number().int().min(1).max(10).default(1),
  notifyTo: z.enum(['admin', 'user']).default('admin'),
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
  supportedModule: z.enum(['All', 'Patch', 'Update', 'Security']).default('All'),
  relatedType: z.enum(['No Relation', 'Critical', 'Important', 'Optional']).default('No Relation'),
});

export const updateDeploymentPolicySchema = createDeploymentPolicySchema.partial();

export type CreateDeploymentPolicyInput = z.infer<typeof createDeploymentPolicySchema>;
export type UpdateDeploymentPolicyInput = z.infer<typeof updateDeploymentPolicySchema>;
export type DeploymentPolicyListQuery = z.infer<typeof deploymentPolicyListQuerySchema>;
