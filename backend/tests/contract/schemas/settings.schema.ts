import { z } from 'zod';

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const serverSettingsSchema = z.object({
  sessionTimeout: z.boolean(),
  sessionTimeoutMinutes: z.number(),
  sessionIdleTimeoutMinutes: z.number(),
  logLevel: z.string(),
});
