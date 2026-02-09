/**
 * Asset Patch Recommendation Validators
 *
 * Zod schemas for request validation
 */

import { z } from 'zod';

/**
 * Query parameters for listing recommendations
 */
const listRecommendationsQuerySchema = z.object({
  status: z.string().optional(),
  severity: z
    .union([z.string(), z.array(z.string())])
    .transform(val => (Array.isArray(val) ? val : val ? [val] : []))
    .optional(),
  sortBy: z.enum(['riskScore', 'severity', 'recommendedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 50)),
});

export function validateListRecommendationsQuery(query: unknown) {
  return listRecommendationsQuerySchema.safeParse(query);
}

/**
 * Request body for rejecting a recommendation
 */
const rejectRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export function validateRejectRequest(body: unknown) {
  return rejectRequestSchema.safeParse(body);
}
