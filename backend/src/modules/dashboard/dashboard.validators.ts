import { z } from 'zod';

// Chart query params
export const chartQuerySchema = z.object({
  groupBy: z.enum(['severity', 'os', 'status']).optional(),
  dateRange: z.enum(['week', 'month', 'quarter', 'year']).optional(),
});

export type ChartQuery = z.infer<typeof chartQuerySchema>;

// Recent activity query params
export const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type RecentActivityQuery = z.infer<typeof recentActivityQuerySchema>;

// Top vulnerabilities query params
export const topVulnerabilitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type TopVulnerabilitiesQuery = z.infer<typeof topVulnerabilitiesQuerySchema>;

// Dashboard refresh body (optional filters)
export const dashboardRefreshBodySchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
});

export type DashboardRefreshBody = z.infer<typeof dashboardRefreshBodySchema>;
