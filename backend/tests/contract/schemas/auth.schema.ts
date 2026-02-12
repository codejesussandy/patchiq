import { z } from 'zod';

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
    role: z.string(),
    isOnboarded: z.boolean(),
  }),
});

export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  contactNumber: z.string().nullable(),
  role: z.string(),
  organizationId: z.string().nullable(),
  departmentId: z.string().nullable(),
  locationId: z.string().nullable(),
  isOnboarded: z.boolean(),
  createdAt: z.string(),
});
