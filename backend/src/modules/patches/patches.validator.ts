import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

const severitySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNSPECIFIED']);
const osSchema = z.enum(['WINDOWS', 'MACOS', 'UBUNTU', 'LINUX']);
const _testStatusSchema = z.enum(['NOT_TESTED', 'TESTED', 'TEST_FAILED']);
const testResultSchema = z.enum(['PASSED', 'FAILED']);
const _approvalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
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
  downloadUrl: z.union([z.string().url(), z.literal('')]).optional(),
  referenceUrl: z.union([z.string().url(), z.literal('')]).optional(),
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
  downloadUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  referenceUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
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
  severity: z.string().transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)).optional(),
  os: z.string().transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)).optional(),
  category: z.string().transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)).optional(),
  testStatus: z.string().optional(),
  approvalStatus: z.string().optional(),
  search: z.string().optional(),
  includeSuperseded: z.coerce.boolean().optional().default(false), // Filter out superseded patches by default
});

export const patchIdParamSchema = z.object({
  id: z.string().uuid('Invalid patch ID'),
});

export const addAffectedProductSchema = z.object({
  softwareName: z.string().min(1, 'softwareName is required'),
  version: z.string().optional(),
  vendor: z.string().optional(),
  platform: z.string().optional(),
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
  status: z.enum(['PENDING_TEST', 'PENDING_APPROVAL']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ============================================
// Scan Endpoints Schema
// ============================================

export const scanEndpointsSchema = z.object({
  scope: z.enum(['ALL_END_POINTS', 'SPECIFIC_GROUPS']),
  endpointIds: z.array(z.string()).max(5000).optional().default([]),
});

// ============================================
// Patch Test Schemas
// ============================================

export const createPatchTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  description: z.string().optional(),
  platform: z.enum(['ALL', 'WINDOWS', 'MACOS', 'UBUNTU', 'LINUX']).optional().default('ALL'),
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
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).optional(),
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
// Type Exports
// ============================================

export type CreatePatchInput = z.infer<typeof createPatchSchema>;
export type UpdatePatchInput = z.infer<typeof updatePatchSchema>;
export type PatchListQuery = z.infer<typeof patchListQuerySchema>;
export type TestPatchInput = z.infer<typeof testPatchSchema>;
export type RejectPatchInput = z.infer<typeof rejectPatchSchema>;
export type ScanEndpointsInput = z.infer<typeof scanEndpointsSchema>;
export type CreatePatchTestInput = z.infer<typeof createPatchTestSchema>;
export type CreateZeroTouchConfigInput = z.infer<typeof createZeroTouchConfigSchema>;
export type UpdateZeroTouchConfigInput = z.infer<typeof updateZeroTouchConfigSchema>;
