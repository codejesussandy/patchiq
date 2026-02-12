import { z } from 'zod';

/**
 * Generic API success response schema wrapper.
 * Validates the standard envelope: { success: true, data: T }
 */
export function apiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  });
}

/**
 * Paginated response schema.
 * Validates: { success: true, data: T[], total, page, limit, totalPages }
 */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  });
}

/**
 * Error response schema.
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .array(z.object({ field: z.string(), message: z.string() }))
      .optional(),
  }),
});

/**
 * Helper to validate a response body against a Zod schema with clear error messages.
 */
export function validateContract<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
  endpoint: string
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Contract violation on ${endpoint}:\n${issues}\n\nReceived body:\n${JSON.stringify(body, null, 2).slice(0, 1000)}`
    );
  }
  return result.data;
}
