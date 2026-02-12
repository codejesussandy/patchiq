import type { Prisma } from '@prisma/client';
import type { Request } from 'express';

/**
 * Type-safe accessor for Zod-validated query parameters.
 * Use after validate(schema, 'query') middleware has parsed req.query.
 */
export function typedQuery<T>(req: Request): T {
  const q: unknown = req.query;
  return q as T;
}

/**
 * Type-safe accessor for Prisma JSON fields.
 * Prisma JSON fields are typed as Prisma.JsonValue; this narrows to the expected shape.
 */
export function typedJson<T>(value: Prisma.JsonValue | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  const v: unknown = value;
  return v as T;
}

/**
 * Convert a value to Prisma.InputJsonValue for writing to JSON columns.
 */
export function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
