import { z } from 'zod';

export const reportItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  format: z.string(),
  status: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const reportTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string(),
  availableColumns: z.array(z.string()),
  defaultColumns: z.array(z.string()),
});
