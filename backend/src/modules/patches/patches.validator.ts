import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

const severitySchema = z.enum(['CRITICAL', 'High', 'Medium', 'Low', 'UNSPECIFIED']);
const osSchema = z.enum(['Windows', 'MacOS', 'Ubuntu', 'Linux']);
const testStatusSchema = z.enum(['Not Tested', 'Tested', 'Test Failed']);
const testResultSchema = z.enum(['passed', 'failed']);
const approvalStatusSchema = z.enum(['Pending', 'Approved', 'Rejected']);
const deploymentTypeSchema = z.enum(['INSTALL', 'ROLLBACK']);
const deploymentStageSchema = z.enum(['IN_PROGRESS', 'COMPLETED', 'FAILED', 'INSTALLED', 'PENDING']);
const applicationTypeSchema = z.enum(['ALL', 'INCLUDE', 'EXCLUDE']);
const scopeTypeSchema = z.enum(['ALL_COMPUTERS', 'SCOPE', 'SPECIFIC_GROUPS']);

// ============================================
// Patch Prerequisites Schema
// ============================================

const prerequisitesSchema = z.object({
  minOsVersion: z.string().optional(),
  maxOsVersion: z.string().optional(),
  osEditions: z.array(z.string()).optional(),
  architectures: z.array(z.string()).optional(),
  requiredFeatures: z.array(z.string()).optional(),
  excludedFeatures: z.array(z.string()).optional(),
  description: z.string().optional(),
}).optional();

// ============================================
// Patch Schemas
// ============================================

export const createPatchSchema = z.object({
  software: z.string().min(1, 'Software name is required'),
  title: z.string().optional(),
  description: z.string().optional(),
  severity: severitySchema.optional().default('UNSPECIFIED'),
  category: z.string().optional(),
  vendor: z.string().optional(),
  product: z.string().optional(),
  os: osSchema.optional(),
  platform: z.string().optional(),
  architecture: z.string().optional(),
  kbNumber: z.string().optional(),
  bulletinId: z.string().optional(),
  releaseDate: z.string().optional(),
  downloadUrl: z.string().url().optional().or(z.literal('')),
  referenceUrl: z.string().url().optional().or(z.literal('')),
  rebootRequired: z.boolean().optional().default(false),
  supportUninstallation: z.boolean().optional().default(false),
  languagesSupported: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  cveNumbers: z.array(z.string()).optional().default([]),
  prerequisites: prerequisitesSchema,
});

export const updatePatchSchema = z.object({
  software: z.string().min(1).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  severity: severitySchema.optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  product: z.string().optional(),
  os: osSchema.optional(),
  platform: z.string().optional(),
  architecture: z.string().optional(),
  kbNumber: z.string().optional(),
  bulletinId: z.string().optional(),
  releaseDate: z.string().optional(),
  downloadUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  referenceUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  rebootRequired: z.boolean().optional(),
  supportUninstallation: z.boolean().optional(),
  languagesSupported: z.array(z.string()).optional(),
  testStatus: z.string().optional(),
  approvalStatus: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cveNumbers: z.array(z.string()).optional(),
  prerequisites: prerequisitesSchema,
});

export const patchListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  severity: z.string().optional(),
  os: z.string().optional(),
  category: z.string().optional(),
  testStatus: z.string().optional(),
  approvalStatus: z.string().optional(),
  search: z.string().optional(),
  includeSuperseded: z.coerce.boolean().optional().default(false), // Filter out superseded patches by default
});

export const patchIdParamSchema = z.object({
  id: z.string().uuid('Invalid patch ID'),
});

// ============================================
// Test/Approval Workflow Schemas
// ============================================

export const testPatchSchema = z.object({
  status: testResultSchema,
  notes: z.string().optional(),
  testEnvironment: z.string().optional(),
});

export const rejectPatchSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
  notes: z.string().optional(),
});

export const testApproveQuerySchema = z.object({
  status: z.enum(['pending-test', 'pending-approval']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ============================================
// Scan Endpoints Schema
// ============================================

export const scanEndpointsSchema = z.object({
  scope: z.enum(['All End Points', 'Specific Groups']),
  endpointIds: z.array(z.string()).optional().default([]),
});

// ============================================
// Deployment Schemas
// ============================================

export const createDeploymentSchema = z.object({
  name: z.string().min(1, 'Deployment name is required'),
  description: z.string().optional(),
  type: deploymentTypeSchema,
  configType: z.enum(['INSTALL', 'ROLLBACK']).optional().default('INSTALL'),
  scope: z.enum(['Global', 'Group', 'Endpoint']).optional().default('Endpoint'),
  schedule: z.string().optional(),
  targetGroups: z.array(z.string()).optional().default([]),
  patches: z.array(z.string().uuid()).min(1, 'At least one patch is required'),
  skipApprovalCheck: z.boolean().optional().default(false),
  triggerType: z.enum(['manual', 'scheduled', 'zero-touch', 'policy']).optional().default('manual'),
  autoRollback: z.boolean().optional().default(false),
});

export const deploymentIdParamSchema = z.object({
  id: z.string().uuid('Invalid deployment ID'),
});

export const deploymentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: deploymentTypeSchema.optional(),
  stage: deploymentStageSchema.optional(),
});

// ============================================
// Patch Test Schemas
// ============================================

export const createPatchTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  description: z.string().optional(),
  applicationType: applicationTypeSchema.optional().default('ALL'),
  applications: z.array(z.string()).optional().default([]),
  scope: scopeTypeSchema.optional().default('ALL_COMPUTERS'),
  computers: z.array(z.string()).optional().default([]),
  groups: z.array(z.string()).optional().default([]),
}).refine((data) => {
  // If applicationType is INCLUDE or EXCLUDE, applications must not be empty
  if (data.applicationType !== 'ALL' && data.applications.length === 0) {
    return false;
  }
  return true;
}, {
  message: 'Applications are required when applicationType is INCLUDE or EXCLUDE',
  path: ['applications'],
}).refine((data) => {
  // If scope is SCOPE, computers must not be empty
  if (data.scope === 'SCOPE' && data.computers.length === 0) {
    return false;
  }
  return true;
}, {
  message: 'Computers are required when scope is SCOPE',
  path: ['computers'],
}).refine((data) => {
  // If scope is SPECIFIC_GROUPS, groups must not be empty
  if (data.scope === 'SPECIFIC_GROUPS' && data.groups.length === 0) {
    return false;
  }
  return true;
}, {
  message: 'Groups are required when scope is SPECIFIC_GROUPS',
  path: ['groups'],
});

export const patchTestIdParamSchema = z.object({
  id: z.string().uuid('Invalid patch test ID'),
});

export const patchTestListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.string().optional(),
});

// ============================================
// Zero Touch Config Schemas
// ============================================

export const autoDeploymentRulesSchema = z.object({
  severity: z.array(z.string()).min(1, 'At least one severity level is required'),
  approvalRequired: z.boolean(),
  schedule: z.string().min(1, 'Schedule is required'),
});

export const createZeroTouchConfigSchema = z.object({
  name: z.string().min(1, 'Config name is required'),
  description: z.string().optional(),
  applicationType: applicationTypeSchema.optional().default('ALL'),
  applications: z.array(z.string()).optional().default([]),
  scope: scopeTypeSchema.optional().default('ALL_COMPUTERS'),
  computers: z.array(z.string()).optional().default([]),
  groups: z.array(z.string()).optional().default([]),
  autoDeploymentRules: autoDeploymentRulesSchema,
});

export const updateZeroTouchConfigSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  applicationType: applicationTypeSchema.optional(),
  applications: z.array(z.string()).optional(),
  scope: scopeTypeSchema.optional(),
  computers: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  autoDeploymentRules: autoDeploymentRulesSchema.optional(),
  status: z.enum(['Active', 'Inactive', 'Draft']).optional(),
});

export const zeroTouchConfigIdParamSchema = z.object({
  id: z.string().uuid('Invalid zero touch config ID'),
});

export const zeroTouchConfigListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.string().optional(),
});

// ============================================
// Patch Deployment from UI Schema
// ============================================

export const createPatchDeploymentFromUISchema = z.object({
  name: z.string().min(1, 'Deployment name is required'),
  description: z.string().optional(),
  targetAgentIds: z.array(z.string()).min(1, 'At least one target agent is required'),
  patches: z.array(z.object({
    id: z.string(),
    patchId: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    severity: z.string().optional(),
    type: z.string().optional(),
  })).min(1, 'At least one patch is required'),
  retryCount: z.number().int().positive().optional().default(1),
  skipApprovalCheck: z.boolean().optional().default(false),
  autoRollback: z.boolean().optional().default(false),
});

// ============================================
// Type Exports
// ============================================

export type CreatePatchInput = z.infer<typeof createPatchSchema>;
export type UpdatePatchInput = z.infer<typeof updatePatchSchema>;
export type PatchListQuery = z.infer<typeof patchListQuerySchema>;
export type TestPatchInput = z.infer<typeof testPatchSchema>;
export type RejectPatchInput = z.infer<typeof rejectPatchSchema>;
export type ScanEndpointsInput = z.infer<typeof scanEndpointsSchema>;
export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
export type DeploymentListQuery = z.infer<typeof deploymentListQuerySchema>;
export type CreatePatchTestInput = z.infer<typeof createPatchTestSchema>;
export type CreateZeroTouchConfigInput = z.infer<typeof createZeroTouchConfigSchema>;
export type UpdateZeroTouchConfigInput = z.infer<typeof updateZeroTouchConfigSchema>;
export type CreatePatchDeploymentFromUIInput = z.infer<typeof createPatchDeploymentFromUISchema>;
