/**
 * Deployment Routes
 * API routes for software and patch deployments
 */

import { Router } from 'express';
import { deploymentController } from './deployment.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Software Deployments
router.post('/software', deploymentController.createSoftwareDeployment.bind(deploymentController));
router.get('/software', deploymentController.listSoftwareDeployments.bind(deploymentController));
router.get('/software/:deploymentId', deploymentController.getSoftwareDeploymentStatus.bind(deploymentController));
router.post('/software/:deploymentId/cancel', deploymentController.cancelSoftwareDeployment.bind(deploymentController));

// Rollback endpoints
router.post('/software/:deploymentId/tasks/:taskId/rollback', deploymentController.triggerRollback.bind(deploymentController));

// Patch Deployments
router.post('/patch', deploymentController.createPatchDeployment.bind(deploymentController));

export default router;
