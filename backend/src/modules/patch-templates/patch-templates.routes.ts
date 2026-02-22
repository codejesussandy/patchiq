import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateQuery } from '@middleware/validation';
import { PatchTemplatesController } from './patch-templates.controller';
import { getLatestVersionQuerySchema } from './patch-templates.validators';

const router = Router();
const controller = new PatchTemplatesController();

/**
 * @openapi
 * /v1/patch-templates:
 *   get:
 *     summary: List all patch templates
 *     tags: [Patch Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patch templates list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, checkPermission('patch-templates', 'view'), controller.listTemplates);

/**
 * @openapi
 * /v1/patch-templates/{id}/latest:
 *   get:
 *     summary: Get the latest version of a patch template
 *     tags: [Patch Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch template ID
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter latest version by platform
 *       - in: query
 *         name: arch
 *         schema:
 *           type: string
 *         description: Filter latest version by architecture
 *     responses:
 *       200:
 *         description: Latest version of the patch template
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
router.get('/:id/latest', authenticate, checkPermission('patch-templates', 'view'), validateQuery(getLatestVersionQuerySchema), controller.getLatestVersion);

/**
 * @openapi
 * /v1/patch-templates/sync:
 *   post:
 *     summary: Sync all patch templates to the Hub
 *     tags: [Patch Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 synced:
 *                   type: integer
 *                   description: Number of templates synced
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/sync', authenticate, checkPermission('patch-templates', 'edit'), audit({ action: AuditAction.SYNC, resource: AuditResource.PATCH_TEMPLATE }), controller.syncToHub);

/**
 * @openapi
 * /v1/patch-templates/{id}/sync:
 *   post:
 *     summary: Sync a specific patch template to the Hub
 *     tags: [Patch Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch template ID
 *     responses:
 *       200:
 *         description: Template synced to Hub successfully
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
router.post('/:id/sync', authenticate, checkPermission('patch-templates', 'edit'), audit({ action: AuditAction.SYNC, resource: AuditResource.PATCH_TEMPLATE, getResourceId: (req) => req.params.id }), controller.syncOneToHub);

export { router as patchTemplateRoutes };
