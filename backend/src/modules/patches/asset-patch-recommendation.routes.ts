/**
 * Asset Patch Recommendation Routes
 *
 * API routes for patch recommendations
 */

import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import * as controller from './asset-patch-recommendation.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard statistics
router.get('/dashboard', controller.getDashboardStats);

// List all recommendations (with optional filters)
router.get('/', controller.listRecommendations);

// Bulk operations (must be before /:id routes)
router.post('/bulk-accept', controller.bulkAcceptRecommendations);
router.post('/bulk-reject', controller.bulkRejectRecommendations);
router.post('/bulk-deploy', controller.bulkDeployRecommendations);

// Get a single recommendation
router.get('/:id', controller.getRecommendation);

// Accept a recommendation
router.post('/:id/accept', controller.acceptRecommendation);

// Reject a recommendation
router.post('/:id/reject', controller.rejectRecommendation);

// Deploy a recommendation
router.post('/:id/deploy', controller.deployRecommendation);

export default router;
