import { z } from 'zod';

export const vulnerabilityItemSchema = z.object({
  id: z.string(),
  cveNumber: z.string().optional(),
  cveId: z.string().optional(),
  severity: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  publishedDate: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export const vulnerabilityStatsSchema = z.object({
  total: z.number(),
  critical: z.number(),
  high: z.number(),
  medium: z.number(),
  low: z.number(),
});
