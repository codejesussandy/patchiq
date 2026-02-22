import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody, validateQuery, validateParams } from '@middleware/validation';
import * as controller from './patches.controller';
import {
  createPatchSchema,
  updatePatchSchema,
  patchListQuerySchema,
  patchIdParamSchema,
  testPatchSchema,
  rejectPatchSchema,
  testApproveQuerySchema,
  createPatchTestSchema,
  patchTestIdParamSchema,
  patchTestListQuerySchema,
  createZeroTouchConfigSchema,
  updateZeroTouchConfigSchema,
  zeroTouchConfigIdParamSchema,
  zeroTouchConfigListQuerySchema,
  scanEndpointsSchema,
  addAffectedProductSchema,
} from './patches.validator';

const router = Router();

// ============================================
// Patches CRUD
// ============================================

/**
 * @openapi
 * /v1/patches:
 *   get:
 *     summary: List all patches with filtering and pagination
 *     tags:
 *       - Patches
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of patches
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
  checkPermission('patches', 'view'),
  validateQuery(patchListQuerySchema),
  controller.listPatches
);

/**
 * @openapi
 * /v1/patches/test-approve:
 *   get:
 *     summary: List patches pending test or approval
 *     tags:
 *       - Patches
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
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [test, approve]
 *     responses:
 *       200:
 *         description: Paginated list of patches pending test/approval
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
  '/test-approve',
  authenticate,
  checkPermission('patches', 'view'),
  validateQuery(testApproveQuerySchema),
  controller.getPatchesPendingTestApproval
);

/**
 * @openapi
 * /v1/patches/discover:
 *   post:
 *     summary: Run Hub-scoped patch discovery
 *     tags:
 *       - Patches
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patch discovery initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/discover',
  authenticate,
  checkPermission('patches', 'add'),
  audit({ action: AuditAction.SCAN, resource: AuditResource.PATCH }),
  controller.discoverPatches
);

/**
 * @openapi
 * /v1/patches:
 *   post:
 *     summary: Create a new patch
 *     tags:
 *       - Patches
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
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *               version:
 *                 type: string
 *     responses:
 *       200:
 *         description: Patch created successfully
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
  checkPermission('patches', 'add'),
  validateBody(createPatchSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.PATCH }),
  controller.createPatch
);

/**
 * @openapi
 * /v1/patches/{id}:
 *   get:
 *     summary: Get patch by ID
 *     tags:
 *       - Patches
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
 *         description: Patch details
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getPatch
);

/**
 * @openapi
 * /v1/patches/{id}:
 *   put:
 *     summary: Update patch
 *     tags:
 *       - Patches
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
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *     responses:
 *       200:
 *         description: Patch updated successfully
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  validateBody(updatePatchSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.updatePatch
);

/**
 * @openapi
 * /v1/patches/{id}:
 *   delete:
 *     summary: Delete patch
 *     tags:
 *       - Patches
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
 *         description: Patch deleted successfully
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.deletePatch
);

// ============================================
// Patch Related Data
// ============================================

/**
 * @openapi
 * /v1/patches/{id}/affected-softwares:
 *   get:
 *     summary: Get affected software products for a patch
 *     tags:
 *       - Patches
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
 *         description: List of affected software products
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/affected-softwares',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getAffectedProducts
);

/**
 * @openapi
 * /v1/patches/{id}/affected-softwares:
 *   post:
 *     summary: Add an affected software product to a patch
 *     tags:
 *       - Patches
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
 *               productId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Affected product added successfully
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/affected-softwares',
  authenticate,
  checkPermission('patches', 'add'),
  validateParams(patchIdParamSchema),
  validateBody(addAffectedProductSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.addAffectedProduct
);

/**
 * @openapi
 * /v1/patches/{id}/affected-softwares/{productId}:
 *   delete:
 *     summary: Remove an affected software product from a patch
 *     tags:
 *       - Patches
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Affected product removed successfully
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
 *         description: Patch or product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id/affected-softwares/:productId',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.removeAffectedProduct
);

/**
 * @openapi
 * /v1/patches/{id}/bundle/stream:
 *   get:
 *     summary: Stream patch bundle (installer) from MinIO
 *     tags:
 *       - Patches
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
 *         description: Patch bundle binary stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Patch or bundle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/bundle/stream',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.streamPatchBundle
);

/**
 * @openapi
 * /v1/patches/{id}/vulnerabilities:
 *   get:
 *     summary: Get vulnerabilities related to a patch
 *     tags:
 *       - Patches
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
 *         description: List of related vulnerabilities
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/vulnerabilities',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getVulnerabilities
);

/**
 * @openapi
 * /v1/patches/{id}/scan-endpoints:
 *   post:
 *     summary: Scan endpoints for patch applicability
 *     tags:
 *       - Patches
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
 *               endpointIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Endpoint scan initiated successfully
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/scan-endpoints',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  validateBody(scanEndpointsSchema),
  audit({ action: AuditAction.SCAN, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.scanEndpoints
);

/**
 * @openapi
 * /v1/patches/{id}/endpoints:
 *   get:
 *     summary: Get endpoints affected by this patch
 *     tags:
 *       - Patches
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
 *         description: List of affected endpoints
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/endpoints',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getEndpoints
);

/**
 * @openapi
 * /v1/patches/{id}/recommendations:
 *   get:
 *     summary: Get asset recommendations for this patch
 *     tags:
 *       - Patches
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
 *         description: Paginated list of recommendations for this patch
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
 *       404:
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/recommendations',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  async (req, res) => {
    const { listPatchRecommendations } = await import('./asset-patch-recommendation.controller');
    return listPatchRecommendations(req, res);
  }
);

// ============================================
// Supersedence Management
// ============================================

/**
 * @openapi
 * /v1/patches/{id}/superseded:
 *   get:
 *     summary: Get patches superseded by this patch
 *     tags:
 *       - Patches
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
 *         description: List of patches superseded by this patch
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/superseded',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getSupersededPatches
);

/**
 * @openapi
 * /v1/patches/{id}/superseding:
 *   get:
 *     summary: Get patches that supersede this patch
 *     tags:
 *       - Patches
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
 *         description: List of patches that supersede this patch
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/superseding',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getSupersedingPatches
);

/**
 * @openapi
 * /v1/patches/{id}/supersede/{targetId}:
 *   post:
 *     summary: Mark targetId as superseded by this patch
 *     tags:
 *       - Patches
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supersedence relationship created successfully
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/supersede/:targetId',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.supersedePatch
);

/**
 * @openapi
 * /v1/patches/{id}/supersede/{targetId}:
 *   delete:
 *     summary: Remove supersedence relationship between two patches
 *     tags:
 *       - Patches
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supersedence relationship removed successfully
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
 *         description: Patch or relationship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id/supersede/:targetId',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.removeSupersedence
);

// ============================================
// Test & Approve Workflow
// ============================================

/**
 * @openapi
 * /v1/patches/{id}/test:
 *   post:
 *     summary: Mark patch as tested
 *     tags:
 *       - Patches
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
 *               notes:
 *                 type: string
 *               result:
 *                 type: string
 *     responses:
 *       200:
 *         description: Patch marked as tested successfully
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/test',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  validateBody(testPatchSchema),
  audit({ action: AuditAction.TEST, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.testPatch
);

/**
 * @openapi
 * /v1/patches/{id}/approve:
 *   post:
 *     summary: Approve patch for deployment
 *     tags:
 *       - Patches
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
 *         description: Patch approved successfully
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/approve',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.APPROVE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.approvePatch
);

/**
 * @openapi
 * /v1/patches/{id}/reject:
 *   post:
 *     summary: Reject patch
 *     tags:
 *       - Patches
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Patch rejected successfully
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
 *         description: Patch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/reject',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  validateBody(rejectPatchSchema),
  audit({ action: AuditAction.REJECT, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.rejectPatch
);

// ============================================
// Patch Tests Routes
// ============================================

const patchTestsRouter = Router();

/**
 * @openapi
 * /v1/patch-tests:
 *   get:
 *     summary: List patch tests
 *     tags:
 *       - Patch Tests
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
 *         name: patchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of patch tests
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
patchTestsRouter.get(
  '/',
  authenticate,
  checkPermission('patches', 'view'),
  validateQuery(patchTestListQuerySchema),
  controller.listPatchTests
);

/**
 * @openapi
 * /v1/patch-tests:
 *   post:
 *     summary: Create a patch test
 *     tags:
 *       - Patch Tests
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
 *               endpointId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Patch test created successfully
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
patchTestsRouter.post(
  '/',
  authenticate,
  checkPermission('patches', 'add'),
  validateBody(createPatchTestSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.PATCH_TEST }),
  controller.createPatchTest
);

/**
 * @openapi
 * /v1/patch-tests/{id}:
 *   get:
 *     summary: Get patch test by ID
 *     tags:
 *       - Patch Tests
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
 *         description: Patch test details
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
 *         description: Patch test not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
patchTestsRouter.get(
  '/:id',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchTestIdParamSchema),
  controller.getPatchTest
);

/**
 * @openapi
 * /v1/patch-tests/{id}/approve:
 *   put:
 *     summary: Approve a patch test
 *     tags:
 *       - Patch Tests
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
 *         description: Patch test approved successfully
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
 *         description: Patch test not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
patchTestsRouter.put(
  '/:id/approve',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchTestIdParamSchema),
  audit({ action: AuditAction.APPROVE, resource: AuditResource.PATCH_TEST, getResourceId: (req) => req.params.id }),
  controller.approvePatchTest
);

/**
 * @openapi
 * /v1/patch-tests/{id}:
 *   delete:
 *     summary: Delete a patch test
 *     tags:
 *       - Patch Tests
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
 *         description: Patch test deleted successfully
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
 *         description: Patch test not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
patchTestsRouter.delete(
  '/:id',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(patchTestIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH_TEST, getResourceId: (req) => req.params.id }),
  controller.deletePatchTest
);

// ============================================
// Zero Touch Configs Routes
// ============================================

const zeroTouchConfigsRouter = Router();

/**
 * @openapi
 * /v1/zero-touch-configs:
 *   get:
 *     summary: List zero touch configs
 *     tags:
 *       - Zero Touch
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
 *     responses:
 *       200:
 *         description: Paginated list of zero touch configs
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
zeroTouchConfigsRouter.get(
  '/',
  authenticate,
  checkPermission('patches', 'view'),
  validateQuery(zeroTouchConfigListQuerySchema),
  controller.listZeroTouchConfigs
);

/**
 * @openapi
 * /v1/zero-touch-configs:
 *   post:
 *     summary: Create a zero touch config
 *     tags:
 *       - Zero Touch
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
 *               enabled:
 *                 type: boolean
 *               schedule:
 *                 type: string
 *               criteria:
 *                 type: object
 *     responses:
 *       200:
 *         description: Zero touch config created successfully
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
zeroTouchConfigsRouter.post(
  '/',
  authenticate,
  checkPermission('patches', 'add'),
  validateBody(createZeroTouchConfigSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.ZERO_TOUCH_CONFIG }),
  controller.createZeroTouchConfig
);

/**
 * @openapi
 * /v1/zero-touch-configs/{id}:
 *   get:
 *     summary: Get zero touch config by ID
 *     tags:
 *       - Zero Touch
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
 *         description: Zero touch config details
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
 *         description: Config not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
zeroTouchConfigsRouter.get(
  '/:id',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(zeroTouchConfigIdParamSchema),
  controller.getZeroTouchConfig
);

/**
 * @openapi
 * /v1/zero-touch-configs/{id}:
 *   put:
 *     summary: Update zero touch config
 *     tags:
 *       - Zero Touch
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
 *               enabled:
 *                 type: boolean
 *               schedule:
 *                 type: string
 *               criteria:
 *                 type: object
 *     responses:
 *       200:
 *         description: Zero touch config updated successfully
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
 *         description: Config not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
zeroTouchConfigsRouter.put(
  '/:id',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(zeroTouchConfigIdParamSchema),
  validateBody(updateZeroTouchConfigSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.ZERO_TOUCH_CONFIG, getResourceId: (req) => req.params.id }),
  controller.updateZeroTouchConfig
);

/**
 * @openapi
 * /v1/zero-touch-configs/{id}:
 *   delete:
 *     summary: Delete zero touch config
 *     tags:
 *       - Zero Touch
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
 *         description: Zero touch config deleted successfully
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
 *         description: Config not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
zeroTouchConfigsRouter.delete(
  '/:id',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(zeroTouchConfigIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.ZERO_TOUCH_CONFIG, getResourceId: (req) => req.params.id }),
  controller.deleteZeroTouchConfig
);

export { router as patchRoutes, patchTestsRouter as patchTestRoutes, zeroTouchConfigsRouter as zeroTouchConfigRoutes };
