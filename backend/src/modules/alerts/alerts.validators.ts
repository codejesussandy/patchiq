import { z } from 'zod';

// ============================================
// Alert List Query Schema
// ============================================

export const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO', 'CLEAR']).optional(),
  status: z.enum(['Open', 'Acknowledged', 'Resolved']).optional(),
  module: z.string().optional(),
  assetId: z.string().uuid().optional(),
  alertConfigId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'severity', 'status', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;

// ============================================
// Alert ID Param Schema
// ============================================

export const alertIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ============================================
// Acknowledge Alert Schema
// ============================================

export const acknowledgeAlertSchema = z.object({
  note: z.string().max(500).optional(),
});

export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;

// ============================================
// Resolve Alert Schema
// ============================================

export const resolveAlertSchema = z.object({
  resolution: z.string().min(1).max(1000),
});

export type ResolveAlertInput = z.infer<typeof resolveAlertSchema>;

// ============================================
// Bulk Operations Schemas
// ============================================

export const bulkAcknowledgeSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type BulkAcknowledgeInput = z.infer<typeof bulkAcknowledgeSchema>;

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
