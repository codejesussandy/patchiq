/**
 * Hub Routes
 * API routes for the software package repository (Hub)
 */

import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '@/middleware/auth';
import { audit, AuditAction, AuditResource } from '@/middleware/audit';
import { checkPermission } from '@/middleware/rbac';
import { validateQuery, validateParams } from '@/middleware/validation';
import { hubController } from './hub.controller';
import { listPackagesQuerySchema, listBundlesQuerySchema, executionPayloadParamsSchema } from './hub.validators';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
});

// Note: Public bundle download endpoint is defined in app.ts (before auth middleware)

// All routes require authentication
router.use(authenticate);

// ============================================
// Statistics
// ============================================

/**
 * @openapi
 * /v1/hub/stats:
 *   get:
 *     summary: Get hub statistics
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hub statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/stats', checkPermission('hub', 'view'), hubController.getStats.bind(hubController));

// ============================================
// Package Routes
// ============================================

/**
 * @openapi
 * /v1/hub/packages/grouped:
 *   get:
 *     summary: List packages grouped by name and platform
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter by platform
 *     responses:
 *       200:
 *         description: Grouped packages list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/packages/grouped', checkPermission('hub', 'view'), validateQuery(listPackagesQuerySchema), hubController.listPackagesGrouped.bind(hubController));

/**
 * @openapi
 * /v1/hub/packages:
 *   get:
 *     summary: List all packages
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter by platform
 *     responses:
 *       200:
 *         description: Packages list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/packages', checkPermission('hub', 'view'), validateQuery(listPackagesQuerySchema), hubController.listPackages.bind(hubController));

/**
 * @openapi
 * /v1/hub/packages:
 *   post:
 *     summary: Create a package (legacy)
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, platform, version]
 *             properties:
 *               name:
 *                 type: string
 *               platform:
 *                 type: string
 *               version:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Package created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/packages', checkPermission('hub', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.HUB_PACKAGE }), hubController.createPackage.bind(hubController));

/**
 * @openapi
 * /v1/hub/packages/with-scripts:
 *   post:
 *     summary: Create a package with inline scripts (Hub-centric approach)
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, platform, version, scripts]
 *             properties:
 *               name:
 *                 type: string
 *               platform:
 *                 type: string
 *               version:
 *                 type: string
 *               description:
 *                 type: string
 *               scripts:
 *                 type: object
 *                 description: Map of operation type to script content
 *     responses:
 *       201:
 *         description: Package with scripts created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/packages/with-scripts', checkPermission('hub', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.HUB_PACKAGE }), hubController.createPackageWithScripts.bind(hubController));

/**
 * @openapi
 * /v1/hub/packages/upload-bundle:
 *   post:
 *     summary: Upload a package bundle (.tar.gz with scripts and manifest)
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The .tar.gz bundle file (max 500MB)
 *     responses:
 *       201:
 *         description: Package bundle uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post(
  '/packages/upload-bundle',
  checkPermission('hub', 'add'),
  upload.single('file'),
  audit({ action: AuditAction.UPLOAD, resource: AuditResource.HUB_PACKAGE }),
  hubController.uploadPackageBundle.bind(hubController)
);

/**
 * @openapi
 * /v1/hub/packages/{packageId}:
 *   get:
 *     summary: Get a package by ID
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package details
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
router.get('/packages/:packageId', checkPermission('hub', 'view'), hubController.getPackage.bind(hubController));

/**
 * @openapi
 * /v1/hub/packages/{packageId}:
 *   put:
 *     summary: Update a package
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
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
 *               version:
 *                 type: string
 *     responses:
 *       200:
 *         description: Package updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.put('/packages/:packageId', checkPermission('hub', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.HUB_PACKAGE, getResourceId: (req) => req.params.packageId }), hubController.updatePackage.bind(hubController));

/**
 * @openapi
 * /v1/hub/packages/{packageId}:
 *   delete:
 *     summary: Delete a package
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       204:
 *         description: Package deleted successfully
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/packages/:packageId', checkPermission('hub', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.HUB_PACKAGE, getResourceId: (req) => req.params.packageId }), hubController.deletePackage.bind(hubController));

/**
 * @openapi
 * /v1/hub/packages/{packageId}/upload:
 *   post:
 *     summary: Upload a file for a package (legacy single file upload)
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The package file to upload (max 500MB)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.post(
  '/packages/:packageId/upload',
  checkPermission('hub', 'edit'),
  upload.single('file'),
  audit({ action: AuditAction.UPLOAD, resource: AuditResource.HUB_PACKAGE, getResourceId: (req) => req.params.packageId }),
  hubController.uploadPackageFile.bind(hubController)
);

/**
 * @openapi
 * /v1/hub/packages/{packageId}/download-url:
 *   get:
 *     summary: Get a presigned download URL for a package file (legacy)
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Presigned download URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/packages/:packageId/download-url', checkPermission('hub', 'view'), hubController.getPackageDownloadUrl.bind(hubController));

/**
 * @openapi
 * /v1/hub/packages/{packageId}/bundle:
 *   get:
 *     summary: Get bundle download info for a package (Hub-centric approach)
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Bundle download information
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
router.get('/packages/:packageId/bundle', checkPermission('hub', 'view'), hubController.getBundleDownloadInfo.bind(hubController));

// Note: Bundle download route is defined above (before auth middleware) for agent access

/**
 * @openapi
 * /v1/hub/packages/{packageId}/execution-payload/{operationType}:
 *   get:
 *     summary: Get execution payload for agent (script or bundle info based on package type)
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *       - in: path
 *         name: operationType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [install, uninstall, update, detect]
 *         description: The type of operation to get the execution payload for
 *     responses:
 *       200:
 *         description: Execution payload for the agent
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
router.get('/packages/:packageId/execution-payload/:operationType', checkPermission('hub', 'view'), validateParams(executionPayloadParamsSchema), hubController.getExecutionPayload.bind(hubController));

// ============================================
// Bundle Routes
// ============================================

/**
 * @openapi
 * /v1/hub/bundles:
 *   get:
 *     summary: List all bundles
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Bundles list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/bundles', checkPermission('hub', 'view'), validateQuery(listBundlesQuerySchema), hubController.listBundles.bind(hubController));

/**
 * @openapi
 * /v1/hub/bundles:
 *   post:
 *     summary: Create a bundle
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, packageIds]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               packageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Bundle created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/bundles', checkPermission('hub', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.HUB_BUNDLE }), hubController.createBundle.bind(hubController));

/**
 * @openapi
 * /v1/hub/bundles/{bundleId}:
 *   get:
 *     summary: Get a bundle by ID
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bundleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bundle ID
 *     responses:
 *       200:
 *         description: Bundle details
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
router.get('/bundles/:bundleId', checkPermission('hub', 'view'), hubController.getBundle.bind(hubController));

/**
 * @openapi
 * /v1/hub/bundles/{bundleId}:
 *   delete:
 *     summary: Delete a bundle
 *     tags: [Hub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bundleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bundle ID
 *     responses:
 *       204:
 *         description: Bundle deleted successfully
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/bundles/:bundleId', checkPermission('hub', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.HUB_BUNDLE, getResourceId: (req) => req.params.bundleId }), hubController.deleteBundle.bind(hubController));

export default router;
