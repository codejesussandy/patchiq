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

// Create package
router.post('/packages', hubController.createPackage.bind(hubController));

// Get package by ID
router.get('/packages/:packageId', hubController.getPackage.bind(hubController));

// Update package
router.put('/packages/:packageId', hubController.updatePackage.bind(hubController));

// Delete package
router.delete('/packages/:packageId', hubController.deletePackage.bind(hubController));

// Upload file for package
router.post(
  '/packages/:packageId/upload',
  upload.single('file'),
  hubController.uploadPackageFile.bind(hubController)
);

// Get download URL
router.get('/packages/:packageId/download-url', hubController.getPackageDownloadUrl.bind(hubController));

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
