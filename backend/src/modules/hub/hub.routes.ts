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
router.get('/stats', checkPermission('hub', 'view'), hubController.getStats.bind(hubController));

// ============================================
// Package Routes
// ============================================

// List packages (grouped by name + platform)
router.get('/packages/grouped', checkPermission('hub', 'view'), validateQuery(listPackagesQuerySchema), hubController.listPackagesGrouped.bind(hubController));

// List packages
router.get('/packages', checkPermission('hub', 'view'), validateQuery(listPackagesQuerySchema), hubController.listPackages.bind(hubController));

// Create package (legacy)
router.post('/packages', checkPermission('hub', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.HUB_PACKAGE }), hubController.createPackage.bind(hubController));

// Create package with inline scripts (new Hub-centric approach)
router.post('/packages/with-scripts', checkPermission('hub', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.HUB_PACKAGE }), hubController.createPackageWithScripts.bind(hubController));

// Upload package bundle (.tar.gz with scripts and manifest)
router.post(
  '/packages/upload-bundle',
  checkPermission('hub', 'add'),
  upload.single('file'),
  audit({ action: AuditAction.UPLOAD, resource: AuditResource.HUB_PACKAGE }),
  hubController.uploadPackageBundle.bind(hubController)
);

// Get package by ID
router.get('/packages/:packageId', checkPermission('hub', 'view'), hubController.getPackage.bind(hubController));

// Update package
router.put('/packages/:packageId', checkPermission('hub', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.HUB_PACKAGE, getResourceId: (req) => req.params.packageId }), hubController.updatePackage.bind(hubController));

// Delete package
router.delete('/packages/:packageId', checkPermission('hub', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.HUB_PACKAGE, getResourceId: (req) => req.params.packageId }), hubController.deletePackage.bind(hubController));

// Upload file for package (legacy - single file upload)
router.post(
  '/packages/:packageId/upload',
  checkPermission('hub', 'edit'),
  upload.single('file'),
  audit({ action: AuditAction.UPLOAD, resource: AuditResource.HUB_PACKAGE, getResourceId: (req) => req.params.packageId }),
  hubController.uploadPackageFile.bind(hubController)
);

// Get download URL (legacy - single file)
router.get('/packages/:packageId/download-url', checkPermission('hub', 'view'), hubController.getPackageDownloadUrl.bind(hubController));

// Get bundle download info (new Hub-centric approach)
router.get('/packages/:packageId/bundle', checkPermission('hub', 'view'), hubController.getBundleDownloadInfo.bind(hubController));

// Note: Bundle download route is defined above (before auth middleware) for agent access

// Get execution payload for agent (returns script or bundle info based on package type)
router.get('/packages/:packageId/execution-payload/:operationType', checkPermission('hub', 'view'), validateParams(executionPayloadParamsSchema), hubController.getExecutionPayload.bind(hubController));

// ============================================
// Bundle Routes
// ============================================

// List bundles
router.get('/bundles', checkPermission('hub', 'view'), validateQuery(listBundlesQuerySchema), hubController.listBundles.bind(hubController));

// Create bundle
router.post('/bundles', checkPermission('hub', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.HUB_BUNDLE }), hubController.createBundle.bind(hubController));

// Get bundle by ID
router.get('/bundles/:bundleId', checkPermission('hub', 'view'), hubController.getBundle.bind(hubController));

// Delete bundle
router.delete('/bundles/:bundleId', checkPermission('hub', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.HUB_BUNDLE, getResourceId: (req) => req.params.bundleId }), hubController.deleteBundle.bind(hubController));

export default router;
