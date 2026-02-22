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

/**
 * @openapi
 * /v1/patch-repository/sources:
 *   get:
 *     summary: List all patch sources
 *     tags: [Patch Repository]
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
 *         name: enabled
 *         schema:
 *           type: boolean
 *         description: Filter by enabled status
 *     responses:
 *       200:
 *         description: Patch sources list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/sources', checkPermission('patch-repository', 'view'), validateQuery(listPatchSourcesQuerySchema), controller.listPatchSources);

/**
 * @openapi
 * /v1/patch-repository/sources:
 *   post:
 *     summary: Create a new patch source
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, url, type]
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               type:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               config:
 *                 type: object
 *     responses:
 *       201:
 *         description: Patch source created successfully
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
router.post('/sources', checkPermission('patch-repository', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.PATCH_SOURCE }), controller.createPatchSource);

/**
 * @openapi
 * /v1/patch-repository/sources/{id}:
 *   get:
 *     summary: Get a specific patch source
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch source ID
 *     responses:
 *       200:
 *         description: Patch source details
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
router.get('/sources/:id', checkPermission('patch-repository', 'view'), controller.getPatchSource);

/**
 * @openapi
 * /v1/patch-repository/sources/{id}:
 *   put:
 *     summary: Update a patch source
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch source ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               enabled:
 *                 type: boolean
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Patch source updated successfully
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
router.put('/sources/:id', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH_SOURCE, getResourceId: (req) => req.params.id }), controller.updatePatchSource);

/**
 * @openapi
 * /v1/patch-repository/sources/{id}:
 *   delete:
 *     summary: Delete a patch source
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch source ID
 *     responses:
 *       204:
 *         description: Patch source deleted successfully
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/sources/:id', checkPermission('patch-repository', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH_SOURCE, getResourceId: (req) => req.params.id }), controller.deletePatchSource);

/**
 * @openapi
 * /v1/patch-repository/sources/{id}/toggle:
 *   patch:
 *     summary: Toggle a patch source enabled or disabled
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch source ID
 *     responses:
 *       200:
 *         description: Patch source toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.patch('/sources/:id/toggle', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.TOGGLE, resource: AuditResource.PATCH_SOURCE, getResourceId: (req) => req.params.id }), controller.togglePatchSource);

// ============================================
// Download Job Routes
// ============================================

/**
 * @openapi
 * /v1/patch-repository/downloads:
 *   get:
 *     summary: List download jobs
 *     tags: [Patch Repository]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed, cancelled]
 *         description: Filter by job status
 *     responses:
 *       200:
 *         description: Download jobs list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/downloads', checkPermission('patch-repository', 'view'), validateQuery(listDownloadJobsQuerySchema), controller.listDownloadJobs);

/**
 * @openapi
 * /v1/patch-repository/downloads:
 *   post:
 *     summary: Create a download job
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patchId]
 *             properties:
 *               patchId:
 *                 type: string
 *               sourceId:
 *                 type: string
 *               priority:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Download job created successfully
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
router.post('/downloads', checkPermission('patch-repository', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.DOWNLOAD_JOB }), controller.createDownloadJob);

/**
 * @openapi
 * /v1/patch-repository/downloads/bulk:
 *   post:
 *     summary: Bulk create download jobs
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patchIds]
 *             properties:
 *               patchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               sourceId:
 *                 type: string
 *               priority:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Bulk download jobs created successfully
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
router.post('/downloads/bulk', checkPermission('patch-repository', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.DOWNLOAD_JOB }), controller.createBulkDownloadJobs);

/**
 * @openapi
 * /v1/patch-repository/downloads/{jobId}:
 *   get:
 *     summary: Get a specific download job
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Download job ID
 *     responses:
 *       200:
 *         description: Download job details
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
router.get('/downloads/:jobId', checkPermission('patch-repository', 'view'), controller.getDownloadJob);

/**
 * @openapi
 * /v1/patch-repository/downloads/{jobId}/retry:
 *   post:
 *     summary: Retry a failed download job
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Download job ID
 *     responses:
 *       200:
 *         description: Download job queued for retry
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
router.post('/downloads/:jobId/retry', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.RETRY, resource: AuditResource.DOWNLOAD_JOB, getResourceId: (req) => req.params.jobId }), controller.retryDownloadJob);

/**
 * @openapi
 * /v1/patch-repository/downloads/{jobId}/cancel:
 *   post:
 *     summary: Cancel a download job
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Download job ID
 *     responses:
 *       200:
 *         description: Download job cancelled
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
router.post('/downloads/:jobId/cancel', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.CANCEL, resource: AuditResource.DOWNLOAD_JOB, getResourceId: (req) => req.params.jobId }), controller.cancelDownloadJob);

// ============================================
// Patch File Download Routes
// ============================================

/**
 * @openapi
 * /v1/patch-repository/patches/{patchId}/download:
 *   get:
 *     summary: Get a presigned download URL for a specific patch
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch ID
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
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/patches/:patchId/download', checkPermission('patch-repository', 'view'), controller.getPatchDownloadUrl);

/**
 * @openapi
 * /v1/patch-repository/patches/agent-downloads:
 *   post:
 *     summary: Get download URLs for multiple patches (for agents)
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patchIds]
 *             properties:
 *               patchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of patch IDs to get download URLs for
 *     responses:
 *       200:
 *         description: Presigned download URLs for the requested patches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 downloads:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       patchId:
 *                         type: string
 *                       url:
 *                         type: string
 *                         format: uri
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/patches/agent-downloads', checkPermission('patch-repository', 'view'), controller.getAgentPatchDownloads);

// ============================================
// Repository Stats & Sync Routes
// ============================================

/**
 * @openapi
 * /v1/patch-repository/stats:
 *   get:
 *     summary: Get patch repository statistics
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Repository statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/stats', checkPermission('patch-repository', 'view'), controller.getRepositoryStats);

/**
 * @openapi
 * /v1/patch-repository/sync:
 *   post:
 *     summary: Trigger sync for all enabled patch sources
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/sync', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.SYNC, resource: AuditResource.PATCH_REPOSITORY }), controller.triggerSync);

/**
 * @openapi
 * /v1/patch-repository/sync/{sourceId}:
 *   get:
 *     summary: Get sync status for a specific source
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch source ID
 *     responses:
 *       200:
 *         description: Sync status for the source
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
router.get('/sync/:sourceId', checkPermission('patch-repository', 'view'), controller.getSyncStatus);

// ============================================
// Utility Routes
// ============================================

/**
 * @openapi
 * /v1/patch-repository/validate-url:
 *   post:
 *     summary: Validate if a URL is whitelisted for patch downloads
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL to validate
 *     responses:
 *       200:
 *         description: URL validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 reason:
 *                   type: string
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/validate-url', checkPermission('patch-repository', 'view'), controller.validateUrl);

// ============================================
// Queue Management Routes
// ============================================

/**
 * @openapi
 * /v1/patch-repository/queue/stats:
 *   get:
 *     summary: Get download queue statistics
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Download queue statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pending:
 *                   type: integer
 *                 running:
 *                   type: integer
 *                 completed:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *                 paused:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/queue/stats', checkPermission('patch-repository', 'view'), controller.getDownloadQueueStats);

/**
 * @openapi
 * /v1/patch-repository/queue/pause:
 *   post:
 *     summary: Pause the download queue
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Download queue paused
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/queue/pause', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.PAUSE, resource: AuditResource.DOWNLOAD_QUEUE }), controller.pauseDownloadQueue);

/**
 * @openapi
 * /v1/patch-repository/queue/resume:
 *   post:
 *     summary: Resume the download queue
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Download queue resumed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/queue/resume', checkPermission('patch-repository', 'edit'), audit({ action: AuditAction.RESUME, resource: AuditResource.DOWNLOAD_QUEUE }), controller.resumeDownloadQueue);

/**
 * @openapi
 * /v1/patch-repository/queue/clean:
 *   post:
 *     summary: Clean old jobs from the download queue
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: olderThan
 *         schema:
 *           type: integer
 *         description: Remove jobs older than this many milliseconds
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, failed, cancelled]
 *         description: Only remove jobs with this status
 *     responses:
 *       200:
 *         description: Queue cleaned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 removed:
 *                   type: integer
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/queue/clean', checkPermission('patch-repository', 'edit'), validateQuery(cleanQueueQuerySchema), audit({ action: AuditAction.CLEAN, resource: AuditResource.DOWNLOAD_QUEUE }), controller.cleanDownloadQueue);

/**
 * @openapi
 * /v1/patch-repository/queue/start-pending:
 *   post:
 *     summary: Start downloading all pending jobs in the queue
 *     tags: [Patch Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of pending jobs to start
 *     responses:
 *       200:
 *         description: Pending downloads started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 started:
 *                   type: integer
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/queue/start-pending', checkPermission('patch-repository', 'edit'), validateQuery(startPendingQuerySchema), audit({ action: AuditAction.EXECUTE, resource: AuditResource.DOWNLOAD_QUEUE }), controller.startPendingDownloads);

export default router;
