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

// GET /v1/deployments/software - List software deployments
router.get(
  '/software',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.listSoftwareDeployments.bind(deploymentController)
);

// POST /v1/deployments/software - Create software deployment
router.post(
  '/software',
  authenticate,
  checkPermission('deployments', 'add'),
  audit({ action: AuditAction.DEPLOY, resource: AuditResource.DEPLOYMENT }),
  deploymentController.createSoftwareDeployment.bind(deploymentController)
);

// GET /v1/deployments/software/:deploymentId - Get software deployment status
router.get(
  '/software/:deploymentId',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.getSoftwareDeploymentStatus.bind(deploymentController)
);

// POST /v1/deployments/software/:deploymentId/cancel - Cancel software deployment
router.post(
  '/software/:deploymentId/cancel',
  authenticate,
  checkPermission('deployments', 'edit'),
  audit({ action: AuditAction.CANCEL, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.deploymentId }),
  deploymentController.cancelSoftwareDeployment.bind(deploymentController)
);

// POST /v1/deployments/software/:deploymentId/tasks/:taskId/rollback - Trigger rollback
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

// POST /v1/deployments/patch - Create patch deployment from UI
router.post(
  '/patch',
  authenticate,
  checkPermission('deployments', 'add'),
  validateBody(createPatchDeploymentFromUISchema),
  audit({ action: AuditAction.DEPLOY, resource: AuditResource.DEPLOYMENT }),
  patchesController.createPatchDeploymentFromUI
);

// GET /v1/deployments/patch - List patch deployments (via deployment executor)
router.get(
  '/patch',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.listPatchDeployments.bind(deploymentController)
);

// GET /v1/deployments/patch/:deploymentId - Get patch deployment status
router.get(
  '/patch/:deploymentId',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.getPatchDeploymentStatus.bind(deploymentController)
);

// POST /v1/deployments/patch/:deploymentId/cancel - Cancel patch deployment
router.post(
  '/patch/:deploymentId/cancel',
  authenticate,
  checkPermission('deployments', 'edit'),
  audit({ action: AuditAction.CANCEL, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.deploymentId }),
  deploymentController.cancelPatchDeployment.bind(deploymentController)
);

// POST /v1/deployments/patch/:deploymentId/retry - Retry a failed patch deployment
router.post(
  '/patch/:deploymentId/retry',
  authenticate,
  checkPermission('deployments', 'edit'),
  audit({ action: AuditAction.RETRY, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.deploymentId }),
  deploymentController.retryPatchDeployment.bind(deploymentController)
);

// POST /v1/deployments/config - Create config deployment
router.post(
  '/config',
  authenticate,
  checkPermission('deployments', 'add'),
  audit({ action: AuditAction.DEPLOY, resource: AuditResource.DEPLOYMENT }),
  deploymentController.createConfigDeployment.bind(deploymentController)
);

// GET /v1/deployments/config/:deploymentId - Get config deployment status
router.get(
  '/config/:deploymentId',
  authenticate,
  checkPermission('deployments', 'view'),
  deploymentController.getConfigDeploymentStatus.bind(deploymentController)
);

// ============================================
// Generic Deployment CRUD Routes
// ============================================

// GET /v1/deployments - List deployments
router.get(
  '/',
  authenticate,
  checkPermission('deployments', 'view'),
  validateQuery(deploymentListQuerySchema),
  patchesController.listDeployments
);

// POST /v1/deployments - Create deployment
router.post(
  '/',
  authenticate,
  checkPermission('deployments', 'add'),
  validateBody(createDeploymentSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT }),
  patchesController.createDeployment
);

// GET /v1/deployments/:id - Get deployment by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('deployments', 'view'),
  validateParams(deploymentCrudIdParamSchema),
  patchesController.getDeployment
);

// PUT /v1/deployments/:id - Update deployment
router.put(
  '/:id',
  authenticate,
  checkPermission('deployments', 'edit'),
  validateParams(deploymentCrudIdParamSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  patchesController.updateDeployment
);

// POST /v1/deployments/:id/cancel - Cancel deployment
router.post(
  '/:id/cancel',
  authenticate,
  checkPermission('deployments', 'edit'),
  validateParams(deploymentCrudIdParamSchema),
  audit({ action: AuditAction.CANCEL, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  patchesController.cancelDeployment
);

// DELETE /v1/deployments/:id - Delete deployment
router.delete(
  '/:id',
  authenticate,
  checkPermission('deployments', 'delete'),
  validateParams(deploymentCrudIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  patchesController.deleteDeployment
);

// GET /v1/deployments/:id/preview - Get deployment preview
router.get(
  '/:id/preview',
  authenticate,
  checkPermission('deployments', 'view'),
  validateParams(deploymentCrudIdParamSchema),
  patchesController.getDeploymentPreview
);

// POST /v1/deployments/:id/execute - Execute deployment
router.post(
  '/:id/execute',
  authenticate,
  checkPermission('deployments', 'edit'),
  validateParams(deploymentCrudIdParamSchema),
  audit({ action: AuditAction.EXECUTE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  patchesController.executeDeployment
);

export default router;
