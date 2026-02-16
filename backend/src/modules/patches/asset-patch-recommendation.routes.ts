/**
 * Asset Patch Recommendation Routes
 *
 * API routes for patch recommendations
 */

import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import * as controller from './asset-patch-recommendation.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard statistics
router.get('/dashboard', checkPermission('patches', 'view'), controller.getDashboardStats);

// List all recommendations (with optional filters)
router.get('/', checkPermission('patches', 'view'), controller.listRecommendations);

// Bulk operations (must be before /:id routes)
router.post('/bulk-accept', controller.bulkAcceptRecommendations);
router.post('/bulk-reject', controller.bulkRejectRecommendations);
router.post('/bulk-deploy', controller.bulkDeployRecommendations);

// Get a single recommendation
router.get('/:id', checkPermission('patches', 'view'), controller.getRecommendation);

// Accept a recommendation
router.post('/:id/accept', checkPermission('patches', 'edit'), audit({ action: AuditAction.APPROVE, resource: AuditResource.RECOMMENDATION, getResourceId: (req) => req.params.id }), controller.acceptRecommendation);

// Reject a recommendation
router.post('/:id/reject', checkPermission('patches', 'edit'), audit({ action: AuditAction.REJECT, resource: AuditResource.RECOMMENDATION, getResourceId: (req) => req.params.id }), controller.rejectRecommendation);

// Deploy a recommendation
router.post('/:id/deploy', checkPermission('patches', 'edit'), audit({ action: AuditAction.DEPLOY, resource: AuditResource.RECOMMENDATION, getResourceId: (req) => req.params.id }), controller.deployRecommendation);

export default router;
