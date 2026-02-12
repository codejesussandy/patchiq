import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validateQuery } from '../../middleware/validation';
import * as controller from './patch-repository.controller';
import {
  listPatchSourcesQuerySchema,
  listDownloadJobsQuerySchema,
  cleanQueueQuerySchema,
  startPendingQuerySchema,
} from './patch-repository.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// Patch Source Routes
// ============================================

// List all patch sources
router.get('/sources', validateQuery(listPatchSourcesQuerySchema), controller.listPatchSources);

// Create a new patch source
router.post('/sources', controller.createPatchSource);

// Get a specific patch source
router.get('/sources/:id', controller.getPatchSource);

// Update a patch source
router.put('/sources/:id', controller.updatePatchSource);

// Delete a patch source
router.delete('/sources/:id', controller.deletePatchSource);

// Toggle patch source enabled/disabled
router.patch('/sources/:id/toggle', controller.togglePatchSource);

// ============================================
// Download Job Routes
// ============================================

// List download jobs
router.get('/downloads', validateQuery(listDownloadJobsQuerySchema), controller.listDownloadJobs);

// Create a download job
router.post('/downloads', controller.createDownloadJob);

// Bulk create download jobs
router.post('/downloads/bulk', controller.createBulkDownloadJobs);

// Get a specific download job
router.get('/downloads/:jobId', controller.getDownloadJob);

// Retry a failed download job
router.post('/downloads/:jobId/retry', controller.retryDownloadJob);

// Cancel a download job
router.post('/downloads/:jobId/cancel', controller.cancelDownloadJob);

// ============================================
// Patch File Download Routes
// ============================================

// Get presigned download URL for a patch
router.get('/patches/:patchId/download', controller.getPatchDownloadUrl);

// Get download URLs for multiple patches (for agents)
router.post('/patches/agent-downloads', controller.getAgentPatchDownloads);

// ============================================
// Repository Stats & Sync Routes
// ============================================

// Get repository statistics
router.get('/stats', controller.getRepositoryStats);

// Trigger sync for patch sources
router.post('/sync', controller.triggerSync);

// Get sync status for a source
router.get('/sync/:sourceId', controller.getSyncStatus);

// ============================================
// Utility Routes
// ============================================

// Validate if a URL is whitelisted
router.post('/validate-url', controller.validateUrl);

// ============================================
// Queue Management Routes
// ============================================

// Get download queue statistics
router.get('/queue/stats', controller.getDownloadQueueStats);

// Pause the download queue
router.post('/queue/pause', controller.pauseDownloadQueue);

// Resume the download queue
router.post('/queue/resume', controller.resumeDownloadQueue);

// Clean old jobs from the queue
router.post('/queue/clean', validateQuery(cleanQueueQuerySchema), controller.cleanDownloadQueue);

// Start downloading all pending jobs
router.post('/queue/start-pending', validateQuery(startPendingQuerySchema), controller.startPendingDownloads);

export default router;
