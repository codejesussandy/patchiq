import { z } from 'zod';

// ============================================
// Patch Source Query Schemas
// ============================================

export const listPatchSourcesQuerySchema = z.object({
  vendor: z.string().optional(),
  category: z.string().optional(),
  platform: z.string().optional(),
  isEnabled: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// ============================================
// Download Job Query Schemas
// ============================================

export const listDownloadJobsQuerySchema = z.object({
  status: z.enum(['PENDING', 'DOWNLOADING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  sourceId: z.string().optional(),
  patchId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createDownloadJobQuerySchema = z.object({
  startImmediately: z.enum(['true', 'false']).optional(),
});

// ============================================
// Queue Management Query Schemas
// ============================================

export const cleanQueueQuerySchema = z.object({
  olderThanDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const startPendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

// ============================================
// Type Exports
// ============================================

export type ListPatchSourcesQuery = z.infer<typeof listPatchSourcesQuerySchema>;
export type ListDownloadJobsQuery = z.infer<typeof listDownloadJobsQuerySchema>;
export type CleanQueueQuery = z.infer<typeof cleanQueueQuerySchema>;
export type StartPendingQuery = z.infer<typeof startPendingQuerySchema>;
