import { z } from 'zod';

const notificationCategoryEnum = z.enum(['agent', 'deployment', 'vulnerability', 'alert', 'system']);

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['info', 'success', 'warning', 'error']).optional(),
  category: notificationCategoryEnum.optional(),
  read: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const notificationHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['info', 'success', 'warning', 'error']).optional(),
  category: notificationCategoryEnum.optional(),
  read: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'type', 'category']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const bulkNotificationSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const notificationPreferencesSchema = z.object({
  agentInApp: z.boolean().optional(),
  agentEmail: z.boolean().optional(),
  deploymentInApp: z.boolean().optional(),
  deploymentEmail: z.boolean().optional(),
  vulnerabilityInApp: z.boolean().optional(),
  vulnerabilityEmail: z.boolean().optional(),
  alertInApp: z.boolean().optional(),
  alertEmail: z.boolean().optional(),
  systemInApp: z.boolean().optional(),
  systemEmail: z.boolean().optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type NotificationHistoryQuery = z.infer<typeof notificationHistoryQuerySchema>;
export type BulkNotificationInput = z.infer<typeof bulkNotificationSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
