import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '@middleware/auth';
import { validateQuery, validateParams, validateBody } from '@middleware/validation';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  notificationHistoryQuerySchema,
  bulkNotificationSchema,
  notificationPreferencesSchema,
} from './notifications.validators';

const router = Router();

// SSE stream — also mounted early in app.ts to bypass assets router global auth
// This route still works for direct tests but the app.ts route handles the real traffic
router.get('/stream', notificationsController.sseStream);

router.use(authenticate);

// Static routes BEFORE parameterized routes
router.get('/', validateQuery(listNotificationsQuerySchema), notificationsController.listNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.put('/mark-all-read', notificationsController.markAllAsRead);

// History + Bulk
router.get('/history', validateQuery(notificationHistoryQuerySchema), notificationsController.getHistory);
router.put('/bulk-read', validateBody(bulkNotificationSchema), notificationsController.bulkMarkAsRead);
router.delete('/bulk', validateBody(bulkNotificationSchema), notificationsController.bulkDelete);

// Preferences
router.get('/preferences', notificationsController.getPreferences);
router.put('/preferences', validateBody(notificationPreferencesSchema), notificationsController.updatePreferences);

// Parameterized routes
router.put('/:id/read', validateParams(notificationIdParamSchema), notificationsController.markAsRead);
router.delete('/:id', validateParams(notificationIdParamSchema), notificationsController.deleteNotification);

// Delete all (clear) - uses DELETE on root
router.delete('/', notificationsController.clearAll);

export { router as notificationsRoutes };
