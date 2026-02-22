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

/**
 * @openapi
 * /v1/patch-recommendations/dashboard:
 *   get:
 *     summary: Get patch recommendation dashboard statistics
 *     tags:
 *       - Patch Recommendations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics for patch recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 pending:
 *                   type: integer
 *                 accepted:
 *                   type: integer
 *                 rejected:
 *                   type: integer
 *                 deployed:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/dashboard', checkPermission('patches', 'view'), controller.getDashboardStats);

/**
 * @openapi
 * /v1/patch-recommendations:
 *   get:
 *     summary: List all patch recommendations with optional filters
 *     tags:
 *       - Patch Recommendations
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
 *           enum: [pending, accepted, rejected, deployed]
 *       - in: query
 *         name: patchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of patch recommendations
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
router.get('/', checkPermission('patches', 'view'), controller.listRecommendations);

/**
 * @openapi
 * /v1/patch-recommendations/bulk-accept:
 *   post:
 *     summary: Bulk accept patch recommendations
 *     tags:
 *       - Patch Recommendations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Recommendations accepted successfully
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
router.post('/bulk-accept', controller.bulkAcceptRecommendations);

/**
 * @openapi
 * /v1/patch-recommendations/bulk-reject:
 *   post:
 *     summary: Bulk reject patch recommendations
 *     tags:
 *       - Patch Recommendations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recommendations rejected successfully
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
router.post('/bulk-reject', controller.bulkRejectRecommendations);

/**
 * @openapi
 * /v1/patch-recommendations/bulk-deploy:
 *   post:
 *     summary: Bulk deploy patch recommendations
 *     tags:
 *       - Patch Recommendations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Recommendations queued for deployment successfully
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
router.post('/bulk-deploy', controller.bulkDeployRecommendations);

/**
 * @openapi
 * /v1/patch-recommendations/{id}:
 *   get:
 *     summary: Get a single patch recommendation
 *     tags:
 *       - Patch Recommendations
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
 *         description: Patch recommendation details
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
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', checkPermission('patches', 'view'), controller.getRecommendation);

/**
 * @openapi
 * /v1/patch-recommendations/{id}/accept:
 *   post:
 *     summary: Accept a patch recommendation
 *     tags:
 *       - Patch Recommendations
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
 *         description: Recommendation accepted successfully
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
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/accept', checkPermission('patches', 'edit'), audit({ action: AuditAction.APPROVE, resource: AuditResource.RECOMMENDATION, getResourceId: (req) => req.params.id }), controller.acceptRecommendation);

/**
 * @openapi
 * /v1/patch-recommendations/{id}/reject:
 *   post:
 *     summary: Reject a patch recommendation
 *     tags:
 *       - Patch Recommendations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recommendation rejected successfully
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
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/reject', checkPermission('patches', 'edit'), audit({ action: AuditAction.REJECT, resource: AuditResource.RECOMMENDATION, getResourceId: (req) => req.params.id }), controller.rejectRecommendation);

/**
 * @openapi
 * /v1/patch-recommendations/{id}/deploy:
 *   post:
 *     summary: Deploy a patch recommendation
 *     tags:
 *       - Patch Recommendations
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
 *         description: Recommendation queued for deployment successfully
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
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/deploy', checkPermission('patches', 'edit'), audit({ action: AuditAction.DEPLOY, resource: AuditResource.RECOMMENDATION, getResourceId: (req) => req.params.id }), controller.deployRecommendation);

export default router;
