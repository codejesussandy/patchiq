export { notificationsRoutes } from './notifications.routes';
export { NotificationsService, notificationsService, setSseManager, setEmailSender } from './notifications.service';
export type { NotificationCategory } from './notifications.service';
export { NotificationsController, notificationsController } from './notifications.controller';
export {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  notificationHistoryQuerySchema,
  bulkNotificationSchema,
  notificationPreferencesSchema,
  type ListNotificationsQuery,
  type NotificationHistoryQuery,
  type BulkNotificationInput,
  type NotificationPreferencesInput,
} from './notifications.validators';
