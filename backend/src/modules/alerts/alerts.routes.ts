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
router.get('/', checkPermission('assets', 'view'), validateQuery(listAlertsQuerySchema), alertsController.listAlerts);
router.put('/bulk-acknowledge', checkPermission('assets', 'edit'), validateBody(bulkAcknowledgeSchema), audit({ action: AuditAction.ACKNOWLEDGE, resource: AuditResource.ALERT }), alertsController.bulkAcknowledge);
router.delete('/bulk', checkPermission('assets', 'delete'), validateBody(bulkDeleteSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ALERT }), alertsController.bulkDelete);

// Parameterized routes
router.get('/:id', checkPermission('assets', 'view'), validateParams(alertIdParamSchema), alertsController.getAlert);
router.put('/:id/acknowledge', checkPermission('assets', 'edit'), validateParams(alertIdParamSchema), validateBody(acknowledgeAlertSchema), audit({ action: AuditAction.ACKNOWLEDGE, resource: AuditResource.ALERT, getResourceId: (req) => req.params.id }), alertsController.acknowledgeAlert);
router.put('/:id/resolve', checkPermission('assets', 'edit'), validateParams(alertIdParamSchema), validateBody(resolveAlertSchema), audit({ action: AuditAction.RESOLVE, resource: AuditResource.ALERT, getResourceId: (req) => req.params.id }), alertsController.resolveAlert);

export { router as alertRoutes };
