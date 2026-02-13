import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateQuery, validateParams, validateBody } from '@middleware/validation';
import { notificationsController } from './notifications.controller';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  notificationHistoryQuerySchema,
  bulkNotificationSchema,
  notificationPreferencesSchema,
  sseTokenQuerySchema,
} from './notifications.validators';

const router = Router();

// SSE stream — also mounted early in app.ts to bypass assets router global auth
// This route still works for direct tests but the app.ts route handles the real traffic
router.get('/stream', validateQuery(sseTokenQuerySchema), notificationsController.sseStream);

router.use(authenticate);

// Static routes BEFORE parameterized routes
router.get('/', checkPermission('notifications', 'view'), validateQuery(listNotificationsQuerySchema), notificationsController.listNotifications);
router.get('/unread-count', checkPermission('notifications', 'view'), notificationsController.getUnreadCount);
router.put('/mark-all-read', checkPermission('notifications', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.NOTIFICATION }), notificationsController.markAllAsRead);

// History + Bulk
router.get('/history', checkPermission('notifications', 'view'), validateQuery(notificationHistoryQuerySchema), notificationsController.getHistory);
router.put('/bulk-read', checkPermission('notifications', 'edit'), validateBody(bulkNotificationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.NOTIFICATION }), notificationsController.bulkMarkAsRead);
router.delete('/bulk', checkPermission('notifications', 'delete'), validateBody(bulkNotificationSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.NOTIFICATION }), notificationsController.bulkDelete);

// Preferences
router.get('/preferences', checkPermission('notifications', 'view'), notificationsController.getPreferences);
router.put('/preferences', checkPermission('notifications', 'edit'), validateBody(notificationPreferencesSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.NOTIFICATION_PREFERENCES }), notificationsController.updatePreferences);

// Parameterized routes
router.put('/:id/read', checkPermission('notifications', 'edit'), validateParams(notificationIdParamSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.NOTIFICATION, getResourceId: (req) => req.params.id }), notificationsController.markAsRead);
router.delete('/:id', checkPermission('notifications', 'delete'), validateParams(notificationIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.NOTIFICATION, getResourceId: (req) => req.params.id }), notificationsController.deleteNotification);

// Delete all (clear) - uses DELETE on root
router.delete('/', checkPermission('notifications', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.NOTIFICATION }), notificationsController.clearAll);

export { router as notificationsRoutes };
