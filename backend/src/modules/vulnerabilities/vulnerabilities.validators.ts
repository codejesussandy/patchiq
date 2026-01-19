import { z } from 'zod';

// Query params for listing vulnerabilities
export const listVulnerabilitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().optional(),
  severity: z.string().optional(), // Can be comma-separated: "CRITICAL,HIGH"
  exploitable: z.coerce.boolean().optional(),
  epssMin: z.coerce.number().min(0).max(100).optional(),
  epssMax: z.coerce.number().min(0).max(100).optional(),
  riskScoreMin: z.coerce.number().min(0).max(100).optional(),
  riskScoreMax: z.coerce.number().min(0).max(100).optional(),
  cvss3Min: z.coerce.number().min(0).max(10).optional(),
  cvss3Max: z.coerce.number().min(0).max(10).optional(),
  publishedFrom: z.string().datetime().optional(),
  publishedTo: z.string().datetime().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListVulnerabilitiesQuery = z.infer<typeof listVulnerabilitiesQuerySchema>;

// Query params for zero-day vulnerabilities
export const listZeroDayQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().optional(),
  severity: z.string().optional(),
});

export type ListZeroDayQuery = z.infer<typeof listZeroDayQuerySchema>;

// Params for single vulnerability
export const vulnerabilityParamsSchema = z.object({
  id: z.string().min(1),
});

export type VulnerabilityParams = z.infer<typeof vulnerabilityParamsSchema>;

// Params for CVE-based routes
export const cveParamsSchema = z.object({
  cve: z.string().regex(/^CVE-\d{4}-\d{4,}$/, 'Invalid CVE format'),
});

export type CveParams = z.infer<typeof cveParamsSchema>;

// Query params for affected endpoints/software
export const affectedQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AffectedQuery = z.infer<typeof affectedQuerySchema>;

// Create exception request body
export const createExceptionBodySchema = z.object({
  vulnerabilityIds: z.array(z.string()).min(1, 'At least one vulnerability ID is required'),
  exceptionType: z.enum(['Acceptable Risk', 'Not Applicable']),
  reasonForExclusion: z.string().optional(),
  scope: z.enum(['Global', 'Group', 'Endpoint']).default('Global'),
  endpoints: z.array(z.string()).optional(),
  source: z.enum(['vulnerabilities', 'zeroDay']).default('vulnerabilities'),
});

export type CreateExceptionBody = z.infer<typeof createExceptionBodySchema>;

// Update exception request body
export const updateExceptionBodySchema = z.object({
  exceptionType: z.enum(['Acceptable Risk', 'Not Applicable']).optional(),
  reasonForExclusion: z.string().optional(),
  scope: z.enum(['Global', 'Group', 'Endpoint']).optional(),
  endpoints: z.array(z.string()).optional(),
});

export type UpdateExceptionBody = z.infer<typeof updateExceptionBodySchema>;

// Exception params
export const exceptionParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ExceptionParams = z.infer<typeof exceptionParamsSchema>;

// Scan request body
export const scanVulnerabilitiesBodySchema = z.object({
  scope: z.enum(['all', 'selected']).default('all'),
  endpointIds: z.array(z.string()).optional(),
});

export type ScanVulnerabilitiesBody = z.infer<typeof scanVulnerabilitiesBodySchema>;
