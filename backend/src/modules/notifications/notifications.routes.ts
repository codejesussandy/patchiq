import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '@middleware/auth';
import { validateQuery, validateParams } from '@middleware/validation';
import { listNotificationsQuerySchema, notificationIdParamSchema } from './notifications.validators';

const router = Router();

router.use(authenticate);

// Static routes BEFORE parameterized routes
router.get('/', validateQuery(listNotificationsQuerySchema), notificationsController.listNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.put('/mark-all-read', notificationsController.markAllAsRead);

// Parameterized routes
router.put('/:id/read', validateParams(notificationIdParamSchema), notificationsController.markAsRead);
router.delete('/:id', validateParams(notificationIdParamSchema), notificationsController.deleteNotification);

// Delete all (clear) - uses DELETE on root
router.delete('/', notificationsController.clearAll);

export { router as notificationsRoutes };
