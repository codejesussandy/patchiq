import { z } from 'zod';

// Common validators
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  search: z.string().optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

// Common field validators
export const nameSchema = z.string().min(1).max(255);
export const descriptionSchema = z.string().max(2000).optional();
export const urlSchema = z.string().url().optional();
export const phoneSchema = z.string().regex(/^\+?[\d\s\-()]+$/).optional();

// Status enums
export const statusSchema = z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'DELETED']);
export const severitySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
export const osSchema = z.enum(['WINDOWS', 'MACOS', 'LINUX']);

// Create validators with pagination
export function withPagination<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.merge(paginationSchema).merge(searchSchema);
}
