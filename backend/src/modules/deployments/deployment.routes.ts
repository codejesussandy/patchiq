/**
 * Deployment Routes
 * API routes for software and patch deployments
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { validateBody, validateParams } from '@/middleware/validation';
import { deploymentController } from './deployment.controller';
import {
  createSoftwareDeploymentSchema,
  createPatchDeploymentBodySchema,
  createConfigDeploymentSchema,
  deploymentIdParamSchema,
  rollbackParamsSchema,
} from './deployment.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Software Deployments
router.post('/software', validateBody(createSoftwareDeploymentSchema), deploymentController.createSoftwareDeployment.bind(deploymentController));
router.get('/software', deploymentController.listSoftwareDeployments.bind(deploymentController));
router.get('/software/:deploymentId', validateParams(deploymentIdParamSchema), deploymentController.getSoftwareDeploymentStatus.bind(deploymentController));
router.post('/software/:deploymentId/cancel', validateParams(deploymentIdParamSchema), deploymentController.cancelSoftwareDeployment.bind(deploymentController));

// Rollback endpoints
router.post('/software/:deploymentId/tasks/:taskId/rollback', validateParams(rollbackParamsSchema), deploymentController.triggerRollback.bind(deploymentController));

// Config Deployments
router.post('/config', validateBody(createConfigDeploymentSchema), deploymentController.createConfigDeployment.bind(deploymentController));
router.get('/config/:deploymentId', validateParams(deploymentIdParamSchema), deploymentController.getConfigDeploymentStatus.bind(deploymentController));

// Patch Deployments
router.post('/patch', validateBody(createPatchDeploymentBodySchema), deploymentController.createPatchDeployment.bind(deploymentController));
router.get('/patch', deploymentController.listPatchDeployments.bind(deploymentController));
router.get('/patch/:deploymentId', validateParams(deploymentIdParamSchema), deploymentController.getPatchDeploymentStatus.bind(deploymentController));
router.post('/patch/:deploymentId/cancel', validateParams(deploymentIdParamSchema), deploymentController.cancelPatchDeployment.bind(deploymentController));

export default router;
