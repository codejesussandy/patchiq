import { z } from 'zod';

// ============================================
// Latest Version Query Schema
// ============================================

export const getLatestVersionQuerySchema = z.object({
  os: z.enum(['Windows', 'macOS', 'Linux']).default('Windows'),
  arch: z.enum(['x64', 'x86', 'arm64']).default('x64'),
});

// ============================================
// Type Exports
// ============================================

export type GetLatestVersionQuery = z.infer<typeof getLatestVersionQuerySchema>;
