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

/**
 * @openapi
 * /v1/notifications/stream:
 *   get:
 *     summary: Subscribe to real-time notifications via Server-Sent Events
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Bearer token passed as query parameter (no Authorization header required)
 *     responses:
 *       200:
 *         description: SSE stream established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/stream', validateQuery(sseTokenQuerySchema), notificationsController.sseStream);

router.use(authenticate);

// Static routes BEFORE parameterized routes

/**
 * @openapi
 * /v1/notifications:
 *   get:
 *     summary: List notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *         description: Filter to unread notifications only
 *     responses:
 *       200:
 *         description: Notifications list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/', checkPermission('notifications', 'view'), validateQuery(listNotificationsQuerySchema), notificationsController.listNotifications);

/**
 * @openapi
 * /v1/notifications/unread-count:
 *   get:
 *     summary: Get the count of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/unread-count', checkPermission('notifications', 'view'), notificationsController.getUnreadCount);

/**
 * @openapi
 * /v1/notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.put('/mark-all-read', checkPermission('notifications', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.NOTIFICATION }), notificationsController.markAllAsRead);

// History + Bulk

/**
 * @openapi
 * /v1/notifications/history:
 *   get:
 *     summary: Get notification history
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter history from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter history to this date
 *     responses:
 *       200:
 *         description: Notification history
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/history', checkPermission('notifications', 'view'), validateQuery(notificationHistoryQuerySchema), notificationsController.getHistory);

/**
 * @openapi
 * /v1/notifications/bulk-read:
 *   put:
 *     summary: Mark multiple notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of notification IDs to mark as read
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.put('/bulk-read', checkPermission('notifications', 'edit'), validateBody(bulkNotificationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.NOTIFICATION }), notificationsController.bulkMarkAsRead);

/**
 * @openapi
 * /v1/notifications/bulk:
 *   delete:
 *     summary: Delete multiple notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of notification IDs to delete
 *     responses:
 *       200:
 *         description: Notifications deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/bulk', checkPermission('notifications', 'delete'), validateBody(bulkNotificationSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.NOTIFICATION }), notificationsController.bulkDelete);

// Preferences

/**
 * @openapi
 * /v1/notifications/preferences:
 *   get:
 *     summary: Get notification preferences for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/preferences', checkPermission('notifications', 'view'), notificationsController.getPreferences);

/**
 * @openapi
 * /v1/notifications/preferences:
 *   put:
 *     summary: Update notification preferences for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Notification preference settings
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.put('/preferences', checkPermission('notifications', 'edit'), validateBody(notificationPreferencesSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.NOTIFICATION_PREFERENCES }), notificationsController.updatePreferences);

// Parameterized routes

/**
 * @openapi
 * /v1/notifications/{id}/read:
 *   put:
 *     summary: Mark a specific notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.put('/:id/read', checkPermission('notifications', 'edit'), validateParams(notificationIdParamSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.NOTIFICATION, getResourceId: (req) => req.params.id }), notificationsController.markAsRead);

/**
 * @openapi
 * /v1/notifications/{id}:
 *   delete:
 *     summary: Delete a specific notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       204:
 *         description: Notification deleted
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/:id', checkPermission('notifications', 'delete'), validateParams(notificationIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.NOTIFICATION, getResourceId: (req) => req.params.id }), notificationsController.deleteNotification);

// Delete all (clear) - uses DELETE on root

/**
 * @openapi
 * /v1/notifications:
 *   delete:
 *     summary: Delete all notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: All notifications cleared
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/', checkPermission('notifications', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.NOTIFICATION }), notificationsController.clearAll);

export { router as notificationsRoutes };
