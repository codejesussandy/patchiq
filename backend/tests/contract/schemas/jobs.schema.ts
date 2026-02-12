import { z } from 'zod';

export const jobItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
