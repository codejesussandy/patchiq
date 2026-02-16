import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateQuery } from '@middleware/validation';
import { PatchTemplatesController } from './patch-templates.controller';
import { getLatestVersionQuerySchema } from './patch-templates.validators';

const router = Router();
const controller = new PatchTemplatesController();

router.get('/', authenticate, checkPermission('patch-templates', 'view'), controller.listTemplates);
router.get('/:id/latest', authenticate, checkPermission('patch-templates', 'view'), validateQuery(getLatestVersionQuerySchema), controller.getLatestVersion);
router.post('/sync', authenticate, checkPermission('patch-templates', 'edit'), audit({ action: AuditAction.SYNC, resource: AuditResource.PATCH_TEMPLATE }), controller.syncToHub);
router.post('/:id/sync', authenticate, checkPermission('patch-templates', 'edit'), audit({ action: AuditAction.SYNC, resource: AuditResource.PATCH_TEMPLATE, getResourceId: (req) => req.params.id }), controller.syncOneToHub);

export { router as patchTemplateRoutes };
