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
// Param Schemas
// ============================================

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
