import { z } from 'zod';

export const dashboardStatsSchema = z.object({
  totalEndpoints: z.number(),
  totalAgents: z.number(),
  totalVulnerabilities: z.number(),
});

export const dashboardDataSchema = z.object({
  stats: dashboardStatsSchema,
  // Allow additional properties — just validate the core shape
}).passthrough();
