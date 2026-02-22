import { Router } from 'express';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateQuery, validateParams, validateBody } from '@middleware/validation';
import { alertsController } from './alerts.controller';
import {
  listAlertsQuerySchema,
  alertIdParamSchema,
  acknowledgeAlertSchema,
  resolveAlertSchema,
  bulkAcknowledgeSchema,
  bulkDeleteSchema,
} from './alerts.validators';

const router = Router();

// Static/bulk routes BEFORE parameterized routes

/**
 * @openapi
 * /v1/alerts:
 *   get:
 *     summary: List all alerts
 *     tags: [Alerts]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, acknowledged, resolved]
 *         description: Filter by alert status
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity
 *     responses:
 *       200:
 *         description: Alerts list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/', checkPermission('assets', 'view'), validateQuery(listAlertsQuerySchema), alertsController.listAlerts);

/**
 * @openapi
 * /v1/alerts/bulk-acknowledge:
 *   put:
 *     summary: Bulk acknowledge multiple alerts
 *     tags: [Alerts]
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
 *                 description: List of alert IDs to acknowledge
 *               comment:
 *                 type: string
 *                 description: Optional acknowledgement comment
 *     responses:
 *       200:
 *         description: Alerts acknowledged successfully
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
router.put('/bulk-acknowledge', checkPermission('assets', 'edit'), validateBody(bulkAcknowledgeSchema), audit({ action: AuditAction.ACKNOWLEDGE, resource: AuditResource.ALERT }), alertsController.bulkAcknowledge);

/**
 * @openapi
 * /v1/alerts/bulk:
 *   delete:
 *     summary: Bulk delete multiple alerts
 *     tags: [Alerts]
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
 *                 description: List of alert IDs to delete
 *     responses:
 *       200:
 *         description: Alerts deleted successfully
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
router.delete('/bulk', checkPermission('assets', 'delete'), validateBody(bulkDeleteSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ALERT }), alertsController.bulkDelete);

// Parameterized routes

/**
 * @openapi
 * /v1/alerts/{id}:
 *   get:
 *     summary: Get a specific alert by ID
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert details
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
router.get('/:id', checkPermission('assets', 'view'), validateParams(alertIdParamSchema), alertsController.getAlert);

/**
 * @openapi
 * /v1/alerts/{id}/acknowledge:
 *   put:
 *     summary: Acknowledge a specific alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *                 description: Optional acknowledgement comment
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully
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
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.put('/:id/acknowledge', checkPermission('assets', 'edit'), validateParams(alertIdParamSchema), validateBody(acknowledgeAlertSchema), audit({ action: AuditAction.ACKNOWLEDGE, resource: AuditResource.ALERT, getResourceId: (req) => req.params.id }), alertsController.acknowledgeAlert);

/**
 * @openapi
 * /v1/alerts/{id}/resolve:
 *   put:
 *     summary: Resolve a specific alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: string
 *                 description: Optional resolution notes
 *     responses:
 *       200:
 *         description: Alert resolved successfully
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
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.put('/:id/resolve', checkPermission('assets', 'edit'), validateParams(alertIdParamSchema), validateBody(resolveAlertSchema), audit({ action: AuditAction.RESOLVE, resource: AuditResource.ALERT, getResourceId: (req) => req.params.id }), alertsController.resolveAlert);

export { router as alertRoutes };
