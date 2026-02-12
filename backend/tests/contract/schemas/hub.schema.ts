import { z } from 'zod';

export const packageItemSchema = z.object({
  id: z.string(),
  packageId: z.string(),
  name: z.string(),
  displayName: z.string(),
  version: z.string(),
  platform: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
