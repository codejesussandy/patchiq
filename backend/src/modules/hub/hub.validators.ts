import { z } from 'zod';

// ============================================
// Package Query Schemas
// ============================================

export const listPackagesQuerySchema = z.object({
  platform: z.string().optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listBundlesQuerySchema = z.object({
  platform: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const executionPayloadParamsSchema = z.object({
  packageId: z.string().uuid(),
  operationType: z.enum(['install', 'update', 'rollback', 'uninstall']),
});

// ============================================
// Type Exports
// ============================================

export type ListPackagesQuery = z.infer<typeof listPackagesQuerySchema>;
export type ListBundlesQuery = z.infer<typeof listBundlesQuerySchema>;
