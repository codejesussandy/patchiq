/**
 * Hub Routes
 * API routes for the software package repository (Hub)
 */

import { Router } from 'express';
import multer from 'multer';
import { hubController } from './hub.controller';
import { authenticate } from '@/middleware/auth';

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
router.get('/stats', hubController.getStats.bind(hubController));

// ============================================
// Package Routes
// ============================================

// List packages
router.get('/packages', hubController.listPackages.bind(hubController));

// Create package (legacy)
router.post('/packages', hubController.createPackage.bind(hubController));

// Create package with inline scripts (new Hub-centric approach)
router.post('/packages/with-scripts', hubController.createPackageWithScripts.bind(hubController));

// Upload package bundle (.tar.gz with scripts and manifest)
router.post(
  '/packages/upload-bundle',
  upload.single('file'),
  hubController.uploadPackageBundle.bind(hubController)
);

// Get package by ID
router.get('/packages/:packageId', hubController.getPackage.bind(hubController));

// Update package
router.put('/packages/:packageId', hubController.updatePackage.bind(hubController));

// Delete package
router.delete('/packages/:packageId', hubController.deletePackage.bind(hubController));

// Upload file for package (legacy - single file upload)
router.post(
  '/packages/:packageId/upload',
  upload.single('file'),
  hubController.uploadPackageFile.bind(hubController)
);

// Get download URL (legacy - single file)
router.get('/packages/:packageId/download-url', hubController.getPackageDownloadUrl.bind(hubController));

// Get bundle download info (new Hub-centric approach)
router.get('/packages/:packageId/bundle', hubController.getBundleDownloadInfo.bind(hubController));

// Note: Bundle download route is defined above (before auth middleware) for agent access

// Get execution payload for agent (returns script or bundle info based on package type)
router.get('/packages/:packageId/execution-payload/:operationType', hubController.getExecutionPayload.bind(hubController));

// ============================================
// Bundle Routes
// ============================================

// List bundles
router.get('/bundles', hubController.listBundles.bind(hubController));

// Create bundle
router.post('/bundles', hubController.createBundle.bind(hubController));

// Get bundle by ID
router.get('/bundles/:bundleId', hubController.getBundle.bind(hubController));

// Delete bundle
router.delete('/bundles/:bundleId', hubController.deleteBundle.bind(hubController));

export default router;
