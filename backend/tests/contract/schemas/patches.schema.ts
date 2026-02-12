import { z } from 'zod';

export const patchItemSchema = z.object({
  id: z.string(),
  patchId: z.string().optional(),
  software: z.string(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  severity: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  os: z.string().nullable().optional(),
  testStatus: z.string().nullable().optional(),
  approvalStatus: z.string().nullable().optional(),
  rebootRequired: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const patchDetailSchema = patchItemSchema.extend({
  vendor: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
  kbNumber: z.string().nullable().optional(),
  bulletinId: z.string().nullable().optional(),
  referenceUrl: z.string().nullable().optional(),
});
