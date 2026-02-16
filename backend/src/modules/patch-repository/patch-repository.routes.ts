import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { audit, AuditAction, AuditResource } from '../../middleware/audit';
import { checkPermission } from '../../middleware/rbac';
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
router.get('/sources', checkPermission('patch-repository', 'view'), validateQuery(listPatchSourcesQuerySchema), controller.listPatchSources);

// Create a new patch source
router.post('/sources', checkPermission('patch-repository', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.PATCH_SOURCE }), controller.createPatchSource);

// Get a specific patch source
router.get('/sources/:id', checkPermission('patch-repository', 'view'), controller.getPatchSource);

// Update a patch source
router.put('/sources/:id', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH_SOURCE, getResourceId: (req) => req.params.id }), controller.updatePatchSource);

// Delete a patch source
router.delete('/sources/:id', checkPermission('patch-repository', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH_SOURCE, getResourceId: (req) => req.params.id }), controller.deletePatchSource);

// Toggle patch source enabled/disabled
router.patch('/sources/:id/toggle', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.TOGGLE, resource: AuditResource.PATCH_SOURCE, getResourceId: (req) => req.params.id }), controller.togglePatchSource);

// ============================================
// Download Job Routes
// ============================================

// List download jobs
router.get('/downloads', checkPermission('patch-repository', 'view'), validateQuery(listDownloadJobsQuerySchema), controller.listDownloadJobs);

// Create a download job
router.post('/downloads', checkPermission('patch-repository', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.DOWNLOAD_JOB }), controller.createDownloadJob);

// Bulk create download jobs
router.post('/downloads/bulk', checkPermission('patch-repository', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.DOWNLOAD_JOB }), controller.createBulkDownloadJobs);

// Get a specific download job
router.get('/downloads/:jobId', checkPermission('patch-repository', 'view'), controller.getDownloadJob);

// Retry a failed download job
router.post('/downloads/:jobId/retry', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.RETRY, resource: AuditResource.DOWNLOAD_JOB, getResourceId: (req) => req.params.jobId }), controller.retryDownloadJob);

// Cancel a download job
router.post('/downloads/:jobId/cancel', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.CANCEL, resource: AuditResource.DOWNLOAD_JOB, getResourceId: (req) => req.params.jobId }), controller.cancelDownloadJob);

// ============================================
// Patch File Download Routes
// ============================================

// Get presigned download URL for a patch
router.get('/patches/:patchId/download', checkPermission('patch-repository', 'view'), controller.getPatchDownloadUrl);

// Get download URLs for multiple patches (for agents)
router.post('/patches/agent-downloads', checkPermission('patch-repository', 'view'), controller.getAgentPatchDownloads);

// ============================================
// Repository Stats & Sync Routes
// ============================================

// Get repository statistics
router.get('/stats', checkPermission('patch-repository', 'view'), controller.getRepositoryStats);

// Trigger sync for patch sources
router.post('/sync', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.SYNC, resource: AuditResource.PATCH_REPOSITORY }), controller.triggerSync);

// Get sync status for a source
router.get('/sync/:sourceId', checkPermission('patch-repository', 'view'), controller.getSyncStatus);

// ============================================
// Utility Routes
// ============================================

// Validate if a URL is whitelisted
router.post('/validate-url', checkPermission('patch-repository', 'view'), controller.validateUrl);

// ============================================
// Queue Management Routes
// ============================================

// Get download queue statistics
router.get('/queue/stats', checkPermission('patch-repository', 'view'), controller.getDownloadQueueStats);

// Pause the download queue
router.post('/queue/pause', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.PAUSE, resource: AuditResource.DOWNLOAD_QUEUE }), controller.pauseDownloadQueue);

// Resume the download queue
router.post('/queue/resume', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.RESUME, resource: AuditResource.DOWNLOAD_QUEUE }), controller.resumeDownloadQueue);

// Clean old jobs from the queue
router.post('/queue/clean', checkPermission('patch-repository', 'edit'), validateQuery(cleanQueueQuerySchema), audit({ action: AuditAction.CLEAN, resource: AuditResource.DOWNLOAD_QUEUE }), controller.cleanDownloadQueue);

// Start downloading all pending jobs
router.post('/queue/start-pending', checkPermission('patch-repository', 'edit'), validateQuery(startPendingQuerySchema), audit({ action: AuditAction.EXECUTE, resource: AuditResource.DOWNLOAD_QUEUE }), controller.startPendingDownloads);

export default router;
