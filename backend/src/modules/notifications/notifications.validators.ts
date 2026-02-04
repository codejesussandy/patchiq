import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['info', 'success', 'warning', 'error']).optional(),
  read: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
