import { z } from 'zod';

// ============================================
// Software Deployment Body Schemas
// ============================================

export const createSoftwareDeploymentSchema = z.object({
  name: z.string().min(1, 'Deployment name is required'),
  description: z.string().optional(),
  deploymentType: z.enum(['install', 'update', 'rollback', 'uninstall']).optional(),
  type: z.enum(['install', 'update', 'rollback', 'uninstall']).optional(),
  targetAgentIds: z.array(z.string()).min(1, 'At least one target agent is required'),
  package: z.object({
    packageId: z.string(),
    name: z.string().optional(),
    version: z.string().optional(),
  }),
  retryCount: z.number().int().min(0).max(10).optional(),
});

// ============================================
// Patch Deployment Body Schema
// ============================================

export const createPatchDeploymentBodySchema = z.object({
  name: z.string().min(1, 'Deployment name is required'),
  description: z.string().optional(),
  targetAgentIds: z.array(z.string()).min(1, 'At least one target agent is required'),
  patches: z.array(z.object({
    id: z.string(),
    patchId: z.string().optional(),
    name: z.string().optional(),
  })).min(1, 'At least one patch is required'),
  retryCount: z.number().int().min(0).max(10).optional(),
});

// ============================================
// Config Deployment Body Schema
// ============================================

export const createConfigDeploymentSchema = z.object({
  name: z.string().min(1, 'Deployment name is required'),
  description: z.string().optional(),
  targetAgentIds: z.array(z.string()).min(1, 'At least one target agent is required'),
  configurationIds: z.array(z.string()).optional(),
  bundleIds: z.array(z.string()).optional(),
  selectionType: z.enum(['configurations', 'bundles']).optional(),
  retryCount: z.number().int().min(0).max(10).optional(),
});

// ============================================
// Generic Deployment CRUD Schemas (moved from patches.validator)
// ============================================

const deploymentTypeSchema = z.enum(['INSTALL', 'ROLLBACK']);
const deploymentStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETED', 'FAILED', 'INSTALLED', 'PENDING']);

export const createDeploymentSchema = z.object({
  name: z.string().min(1, 'Deployment name is required'),
  description: z.string().optional(),
  type: deploymentTypeSchema,
  configType: z.enum(['INSTALL', 'ROLLBACK']).optional().default('INSTALL'),
  scope: z.enum(['GLOBAL', 'GROUP', 'ENDPOINT']).optional().default('ENDPOINT'),
  schedule: z.string().optional(),
  targetGroups: z.array(z.string()).optional().default([]),
  patches: z.array(z.string().uuid()).min(1, 'At least one patch is required'),
  skipApprovalCheck: z.boolean().optional().default(false),
  triggerType: z.enum(['MANUAL', 'SCHEDULED', 'ZERO_TOUCH', 'POLICY']).optional().default('MANUAL'),
  autoRollback: z.boolean().optional().default(false),
});

export const deploymentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: deploymentTypeSchema.optional(),
  status: deploymentStatusSchema.optional(),
});

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
// Param Schemas
// ============================================

/** Validates `:id` param on generic CRUD routes (/:id) */
export const deploymentCrudIdParamSchema = z.object({
  id: z.string().uuid('Invalid deployment ID'),
});

/** Validates `:deploymentId` param on sub-type routes (/software/:deploymentId, /patch/:deploymentId, /config/:deploymentId) */
export const deploymentIdParamSchema = z.object({
  deploymentId: z.string().uuid(),
});

export const rollbackParamsSchema = z.object({
  deploymentId: z.string().uuid(),
  taskId: z.string().uuid(),
});

// ============================================
// Type Exports
// ============================================

export type CreateSoftwareDeploymentBody = z.infer<typeof createSoftwareDeploymentSchema>;
export type CreatePatchDeploymentBody = z.infer<typeof createPatchDeploymentBodySchema>;
export type CreateConfigDeploymentBody = z.infer<typeof createConfigDeploymentSchema>;
export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
export type DeploymentListQuery = z.infer<typeof deploymentListQuerySchema>;
export type CreatePatchDeploymentFromUIInput = z.infer<typeof createPatchDeploymentFromUISchema>;
