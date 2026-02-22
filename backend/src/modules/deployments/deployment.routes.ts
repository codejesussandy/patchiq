/**
 * Deployment Routes
 * API routes for software, patch, and config deployments
 */

import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody, validateQuery, validateParams } from '@middleware/validation';
import { deploymentController } from './deployment.controller';
import * as patchesController from '@modules/patches/patches.controller';
import {
  createDeploymentSchema,
  deploymentCrudIdParamSchema,
  deploymentListQuerySchema,
  createPatchDeploymentFromUISchema,
} from './deployment.validators';

const router = Router();

// ============================================
// Software Deployment Routes (MUST be before /:id routes)
// ============================================

/**
 * @openapi
 * /v1/deployments/software:
 *   get:
 *     summary: List software deployments
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of software deployments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/software',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.listSoftwareDeployments.bind(deploymentController)
);

/**
 * @openapi
 * /v1/deployments/software:
 *   post:
 *     summary: Create a software deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               softwareId:
 *                 type: string
 *               endpointIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Software deployment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/software',
  authenticate,
  checkPermission('deployments', 'add'),
  audit({ action: AuditAction.DEPLOY, resource: AuditResource.DEPLOYMENT }),
  deploymentController.createSoftwareDeployment.bind(deploymentController)
);

/**
 * @openapi
 * /v1/deployments/software/{deploymentId}:
 *   get:
 *     summary: Get software deployment status
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Software deployment status and details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/software/:deploymentId',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.getSoftwareDeploymentStatus.bind(deploymentController)
);

/**
 * @openapi
 * /v1/deployments/software/{deploymentId}/cancel:
 *   post:
 *     summary: Cancel a software deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Software deployment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/software/:deploymentId/cancel',
  authenticate,
  checkPermission('deployments', 'edit'),
  audit({ action: AuditAction.CANCEL, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.deploymentId }),
  deploymentController.cancelSoftwareDeployment.bind(deploymentController)
);

/**
 * @openapi
 * /v1/deployments/software/{deploymentId}/tasks/{taskId}/rollback:
 *   post:
 *     summary: Trigger rollback for a specific task in a software deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rollback triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment or task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/software/:deploymentId/tasks/:taskId/rollback',
  authenticate,
  checkPermission('deployments', 'edit'),
  audit({ action: AuditAction.ROLLBACK, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.deploymentId }),
  deploymentController.triggerRollback.bind(deploymentController)
);

// ============================================
// Patch Deployment Routes
// ============================================

/**
 * @openapi
 * /v1/deployments/patch:
 *   post:
 *     summary: Create a patch deployment from UI
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patchId:
 *                 type: string
 *               endpointIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Patch deployment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/patch',
  authenticate,
  checkPermission('deployments', 'add'),
  validateBody(createPatchDeploymentFromUISchema),
  audit({ action: AuditAction.DEPLOY, resource: AuditResource.DEPLOYMENT }),
  patchesController.createPatchDeploymentFromUI
);

/**
 * @openapi
 * /v1/deployments/patch:
 *   get:
 *     summary: List patch deployments
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of patch deployments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/patch',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.listPatchDeployments.bind(deploymentController)
);

/**
 * @openapi
 * /v1/deployments/patch/{deploymentId}:
 *   get:
 *     summary: Get patch deployment status
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patch deployment status and details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/patch/:deploymentId',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.getPatchDeploymentStatus.bind(deploymentController)
);

/**
 * @openapi
 * /v1/deployments/patch/{deploymentId}/cancel:
 *   post:
 *     summary: Cancel a patch deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patch deployment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/patch/:deploymentId/cancel',
  authenticate,
  checkPermission('deployments', 'edit'),
  audit({ action: AuditAction.CANCEL, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.deploymentId }),
  deploymentController.cancelPatchDeployment.bind(deploymentController)
);

/**
 * @openapi
 * /v1/deployments/patch/{deploymentId}/retry:
 *   post:
 *     summary: Retry a failed patch deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patch deployment retry initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/patch/:deploymentId/retry',
  authenticate,
  checkPermission('deployments', 'edit'),
  audit({ action: AuditAction.RETRY, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.deploymentId }),
  deploymentController.retryPatchDeployment.bind(deploymentController)
);

/**
 * @openapi
 * /v1/deployments/config:
 *   post:
 *     summary: Create a config deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               configId:
 *                 type: string
 *               endpointIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Config deployment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/config',
  authenticate,
  checkPermission('deployments', 'add'),
  audit({ action: AuditAction.DEPLOY, resource: AuditResource.DEPLOYMENT }),
  deploymentController.createConfigDeployment.bind(deploymentController)
);

/**
 * @openapi
 * /v1/deployments/config/{deploymentId}:
 *   get:
 *     summary: Get config deployment status
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Config deployment status and details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/config/:deploymentId',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.getConfigDeploymentStatus.bind(deploymentController)
);

// ============================================
// Generic Deployment CRUD Routes
// ============================================

/**
 * @openapi
 * /v1/deployments:
 *   get:
 *     summary: List deployments
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of deployments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  authenticate,
  checkPermission('deployments', 'view'),
  validateQuery(deploymentListQuerySchema),
  patchesController.listDeployments
);

/**
 * @openapi
 * /v1/deployments:
 *   post:
 *     summary: Create a deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               targetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Deployment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  authenticate,
  checkPermission('deployments', 'add'),
  validateBody(createDeploymentSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT }),
  patchesController.createDeployment
);

/**
 * @openapi
 * /v1/deployments/{id}:
 *   get:
 *     summary: Get deployment by ID
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deployment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  authenticate,
  checkPermission('deployments', 'view'),
  validateParams(deploymentCrudIdParamSchema),
  patchesController.getDeployment
);

/**
 * @openapi
 * /v1/deployments/{id}:
 *   put:
 *     summary: Update a deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Deployment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  authenticate,
  checkPermission('deployments', 'edit'),
  validateParams(deploymentCrudIdParamSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  patchesController.updateDeployment
);

/**
 * @openapi
 * /v1/deployments/{id}/cancel:
 *   post:
 *     summary: Cancel a deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deployment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/cancel',
  authenticate,
  checkPermission('deployments', 'edit'),
  validateParams(deploymentCrudIdParamSchema),
  audit({ action: AuditAction.CANCEL, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  patchesController.cancelDeployment
);

/**
 * @openapi
 * /v1/deployments/{id}:
 *   delete:
 *     summary: Delete a deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deployment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id',
  authenticate,
  checkPermission('deployments', 'delete'),
  validateParams(deploymentCrudIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  patchesController.deleteDeployment
);

/**
 * @openapi
 * /v1/deployments/{id}/preview:
 *   get:
 *     summary: Get deployment preview
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deployment preview details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/preview',
  authenticate,
  checkPermission('deployments', 'view'),
  validateParams(deploymentCrudIdParamSchema),
  patchesController.getDeploymentPreview
);

/**
 * @openapi
 * /v1/deployments/{id}/execute:
 *   post:
 *     summary: Execute a deployment
 *     tags:
 *       - Deployments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deployment execution initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Deployment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/execute',
  authenticate,
  checkPermission('deployments', 'edit'),
  validateParams(deploymentCrudIdParamSchema),
  audit({ action: AuditAction.EXECUTE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  patchesController.executeDeployment
);

export default router;
