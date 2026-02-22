import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody, validateQuery, validateParams } from '@middleware/validation';
import * as controller from './jobs.controller';
import {
  idParamSchema,
  idOrPolicyIdParamSchema,
  patchJobListQuerySchema,
  createPatchJobSchema,
  vulnerabilityJobListQuerySchema,
  createVulnerabilityJobSchema,
  updateVulnerabilityDBSyncSchema,
  softwareDeploymentListQuerySchema,
  createSoftwareDeploymentSchema,
  configCatalogListQuerySchema,
  createConfigCatalogSchema,
  updateConfigCatalogSchema,
  configBundleListQuerySchema,
  createConfigBundleSchema,
  updateConfigBundleSchema,
  configDeploymentListQuerySchema,
  createConfigDeploymentSchema,
  deploymentPolicyListQuerySchema,
  createDeploymentPolicySchema,
  updateDeploymentPolicySchema,
} from './jobs.validators';

const router = Router();

// ============================================
// Patch Jobs Routes - /v1/jobs/patch
// ============================================

/**
 * @openapi
 * /v1/jobs/patch:
 *   get:
 *     summary: List patch jobs
 *     tags:
 *       - Jobs
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
 *         description: Filter by job status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Paginated list of patch jobs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/patch',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(patchJobListQuerySchema),
  controller.listPatchJobs
);

/**
 * @openapi
 * /v1/jobs/patch:
 *   post:
 *     summary: Create a new patch job
 *     tags:
 *       - Jobs
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
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               cveIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Patch job created successfully
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
  '/patch',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createPatchJobSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.JOB }),
  controller.createPatchJob
);

/**
 * @openapi
 * /v1/jobs/patch/{id}:
 *   get:
 *     summary: Get a patch job by ID
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch job ID
 *     responses:
 *       200:
 *         description: Patch job details
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
router.get(
  '/patch/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getPatchJob
);

/**
 * @openapi
 * /v1/jobs/patch/{id}:
 *   delete:
 *     summary: Delete a patch job
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patch job ID
 *     responses:
 *       200:
 *         description: Patch job deleted successfully
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
router.delete(
  '/patch/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.deletePatchJob
);

// ============================================
// Vulnerability Jobs Routes - /v1/jobs/vulnerability
// ============================================

/**
 * @openapi
 * /v1/jobs/vulnerability:
 *   get:
 *     summary: List vulnerability jobs
 *     tags:
 *       - Jobs
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
 *         description: Filter by job status
 *     responses:
 *       200:
 *         description: Paginated list of vulnerability jobs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/vulnerability',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(vulnerabilityJobListQuerySchema),
  controller.listVulnerabilityJobs
);

/**
 * @openapi
 * /v1/jobs/vulnerability:
 *   post:
 *     summary: Create a new vulnerability job
 *     tags:
 *       - Jobs
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
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Vulnerability job created successfully
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
  '/vulnerability',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createVulnerabilityJobSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.JOB }),
  controller.createVulnerabilityJob
);

/**
 * @openapi
 * /v1/jobs/vulnerability/db-sync:
 *   get:
 *     summary: Get vulnerability database sync configuration
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vulnerability DB sync configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/vulnerability/db-sync',
  authenticate,
  checkPermission('jobs', 'view'),
  controller.getVulnerabilityDBSync
);

/**
 * @openapi
 * /v1/jobs/vulnerability/db-sync:
 *   put:
 *     summary: Update vulnerability database sync configuration
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               schedule:
 *                 type: string
 *                 description: Cron expression for sync schedule
 *     responses:
 *       200:
 *         description: Sync configuration updated successfully
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
router.put(
  '/vulnerability/db-sync',
  authenticate,
  checkPermission('jobs', 'edit'),
  validateBody(updateVulnerabilityDBSyncSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.JOB }),
  controller.updateVulnerabilityDBSync
);

/**
 * @openapi
 * /v1/jobs/vulnerability/db-sync/now:
 *   post:
 *     summary: Trigger an immediate vulnerability database sync
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vulnerability DB sync triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.post(
  '/vulnerability/db-sync/now',
  authenticate,
  checkPermission('jobs', 'edit'),
  audit({ action: AuditAction.SYNC, resource: AuditResource.JOB }),
  controller.triggerVulnerabilityDBSync
);

/**
 * @openapi
 * /v1/jobs/vulnerability/{id}:
 *   get:
 *     summary: Get a vulnerability job by ID
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vulnerability job ID
 *     responses:
 *       200:
 *         description: Vulnerability job details
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
router.get(
  '/vulnerability/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getVulnerabilityJob
);

/**
 * @openapi
 * /v1/jobs/vulnerability/{id}:
 *   delete:
 *     summary: Delete a vulnerability job
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vulnerability job ID
 *     responses:
 *       200:
 *         description: Vulnerability job deleted successfully
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
router.delete(
  '/vulnerability/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.deleteVulnerabilityJob
);

// ============================================
// Software Deployment Routes - /v1/jobs/software/deployed
// ============================================

/**
 * @openapi
 * /v1/jobs/software/deployed:
 *   get:
 *     summary: List software deployment jobs
 *     tags:
 *       - Jobs
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
 *         description: Filter by deployment status
 *     responses:
 *       200:
 *         description: Paginated list of software deployments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/software/deployed',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(softwareDeploymentListQuerySchema),
  controller.listSoftwareDeployments
);

/**
 * @openapi
 * /v1/jobs/software/deployed:
 *   post:
 *     summary: Create a new software deployment job
 *     tags:
 *       - Jobs
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
 *               softwareId:
 *                 type: string
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Software deployment job created successfully
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
  '/software/deployed',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createSoftwareDeploymentSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT }),
  controller.createSoftwareDeployment
);

/**
 * @openapi
 * /v1/jobs/software/deployed/{id}:
 *   get:
 *     summary: Get a software deployment job by ID
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Software deployment job ID
 *     responses:
 *       200:
 *         description: Software deployment job details
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
router.get(
  '/software/deployed/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getSoftwareDeployment
);

/**
 * @openapi
 * /v1/jobs/software/deployed/{id}/tasks:
 *   get:
 *     summary: Get tasks for a software deployment job
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Software deployment job ID
 *     responses:
 *       200:
 *         description: List of tasks for the deployment job
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
router.get(
  '/software/deployed/:id/tasks',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getSoftwareDeploymentTasks
);

/**
 * @openapi
 * /v1/jobs/software/deployed/{id}:
 *   delete:
 *     summary: Delete a software deployment job
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Software deployment job ID
 *     responses:
 *       200:
 *         description: Software deployment job deleted successfully
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
router.delete(
  '/software/deployed/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  controller.deleteSoftwareDeployment
);

// ============================================
// Configuration Catalog Routes - /v1/jobs/config/catalog
// ============================================

/**
 * @openapi
 * /v1/jobs/config/catalog:
 *   get:
 *     summary: List configuration catalog entries
 *     tags:
 *       - Jobs
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
 *         description: Paginated list of configuration catalog entries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/config/catalog',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(configCatalogListQuerySchema),
  controller.listConfigCatalog
);

/**
 * @openapi
 * /v1/jobs/config/catalog:
 *   post:
 *     summary: Create a new configuration catalog entry
 *     tags:
 *       - Jobs
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
 *               content:
 *                 type: object
 *     responses:
 *       201:
 *         description: Configuration catalog entry created successfully
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
  '/config/catalog',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createConfigCatalogSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.JOB }),
  controller.createConfigCatalog
);

/**
 * @openapi
 * /v1/jobs/config/catalog/{id}:
 *   get:
 *     summary: Get a configuration catalog entry by ID
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration catalog entry ID
 *     responses:
 *       200:
 *         description: Configuration catalog entry details
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
router.get(
  '/config/catalog/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getConfigCatalog
);

/**
 * @openapi
 * /v1/jobs/config/catalog/{id}:
 *   put:
 *     summary: Update a configuration catalog entry
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration catalog entry ID
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
 *               content:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration catalog entry updated successfully
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
router.put(
  '/config/catalog/:id',
  authenticate,
  checkPermission('jobs', 'edit'),
  validateParams(idParamSchema),
  validateBody(updateConfigCatalogSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.updateConfigCatalog
);

/**
 * @openapi
 * /v1/jobs/config/catalog/{id}:
 *   delete:
 *     summary: Delete a configuration catalog entry
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration catalog entry ID
 *     responses:
 *       200:
 *         description: Configuration catalog entry deleted successfully
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
router.delete(
  '/config/catalog/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.deleteConfigCatalog
);

// ============================================
// Configuration Bundle Routes - /v1/jobs/config/bundles
// ============================================

/**
 * @openapi
 * /v1/jobs/config/bundles:
 *   get:
 *     summary: List configuration bundles
 *     tags:
 *       - Jobs
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
 *         description: Paginated list of configuration bundles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/config/bundles',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(configBundleListQuerySchema),
  controller.listConfigBundles
);

/**
 * @openapi
 * /v1/jobs/config/bundles:
 *   post:
 *     summary: Create a new configuration bundle
 *     tags:
 *       - Jobs
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
 *               catalogIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Configuration bundle created successfully
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
  '/config/bundles',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createConfigBundleSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.JOB }),
  controller.createConfigBundle
);

/**
 * @openapi
 * /v1/jobs/config/bundles/{id}:
 *   get:
 *     summary: Get a configuration bundle by ID
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration bundle ID
 *     responses:
 *       200:
 *         description: Configuration bundle details
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
router.get(
  '/config/bundles/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getConfigBundle
);

/**
 * @openapi
 * /v1/jobs/config/bundles/{id}:
 *   put:
 *     summary: Update a configuration bundle
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration bundle ID
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
 *               catalogIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Configuration bundle updated successfully
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
router.put(
  '/config/bundles/:id',
  authenticate,
  checkPermission('jobs', 'edit'),
  validateParams(idParamSchema),
  validateBody(updateConfigBundleSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.updateConfigBundle
);

/**
 * @openapi
 * /v1/jobs/config/bundles/{id}:
 *   delete:
 *     summary: Delete a configuration bundle
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration bundle ID
 *     responses:
 *       200:
 *         description: Configuration bundle deleted successfully
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
router.delete(
  '/config/bundles/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.deleteConfigBundle
);

// ============================================
// Configuration Deployment Routes - /v1/jobs/config/deployed
// ============================================

/**
 * @openapi
 * /v1/jobs/config/deployed:
 *   get:
 *     summary: List configuration deployment jobs
 *     tags:
 *       - Jobs
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
 *         description: Filter by deployment status
 *     responses:
 *       200:
 *         description: Paginated list of configuration deployments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/config/deployed',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(configDeploymentListQuerySchema),
  controller.listConfigDeployments
);

/**
 * @openapi
 * /v1/jobs/config/deployed:
 *   post:
 *     summary: Create a new configuration deployment job
 *     tags:
 *       - Jobs
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
 *               bundleId:
 *                 type: string
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Configuration deployment job created successfully
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
  '/config/deployed',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createConfigDeploymentSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT }),
  controller.createConfigDeployment
);

/**
 * @openapi
 * /v1/jobs/config/deployed/{id}/tasks:
 *   get:
 *     summary: Get tasks for a configuration deployment job
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration deployment job ID
 *     responses:
 *       200:
 *         description: List of tasks for the configuration deployment
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
router.get(
  '/config/deployed/:id/tasks',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getConfigDeploymentTasks
);

/**
 * @openapi
 * /v1/jobs/config/deployed/{id}:
 *   delete:
 *     summary: Delete a configuration deployment job
 *     tags:
 *       - Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration deployment job ID
 *     responses:
 *       200:
 *         description: Configuration deployment job deleted successfully
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
router.delete(
  '/config/deployed/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  controller.deleteConfigDeployment
);

// ============================================
// Deployment Policies Router - /v1/deployment-policies
// ============================================

const deploymentPoliciesRouter = Router();

/**
 * @openapi
 * /v1/deployment-policies:
 *   get:
 *     summary: List deployment policies
 *     tags:
 *       - Deployment Policies
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
 *         description: Paginated list of deployment policies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
deploymentPoliciesRouter.get(
  '/',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(deploymentPolicyListQuerySchema),
  controller.listDeploymentPolicies
);

/**
 * @openapi
 * /v1/deployment-policies:
 *   post:
 *     summary: Create a new deployment policy
 *     tags:
 *       - Deployment Policies
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
 *               rules:
 *                 type: object
 *     responses:
 *       201:
 *         description: Deployment policy created successfully
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
deploymentPoliciesRouter.post(
  '/',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createDeploymentPolicySchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT_POLICY }),
  controller.createDeploymentPolicy
);

/**
 * @openapi
 * /v1/deployment-policies/{id}:
 *   get:
 *     summary: Get a deployment policy by ID
 *     tags:
 *       - Deployment Policies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deployment policy ID
 *     responses:
 *       200:
 *         description: Deployment policy details
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
deploymentPoliciesRouter.get(
  '/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idOrPolicyIdParamSchema),
  controller.getDeploymentPolicy
);

/**
 * @openapi
 * /v1/deployment-policies/{id}:
 *   put:
 *     summary: Update a deployment policy
 *     tags:
 *       - Deployment Policies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deployment policy ID
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
 *               rules:
 *                 type: object
 *     responses:
 *       200:
 *         description: Deployment policy updated successfully
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
deploymentPoliciesRouter.put(
  '/:id',
  authenticate,
  checkPermission('jobs', 'edit'),
  validateParams(idOrPolicyIdParamSchema),
  validateBody(updateDeploymentPolicySchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.DEPLOYMENT_POLICY, getResourceId: (req) => req.params.id }),
  controller.updateDeploymentPolicy
);

/**
 * @openapi
 * /v1/deployment-policies/{id}:
 *   delete:
 *     summary: Delete a deployment policy
 *     tags:
 *       - Deployment Policies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deployment policy ID
 *     responses:
 *       200:
 *         description: Deployment policy deleted successfully
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
deploymentPoliciesRouter.delete(
  '/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idOrPolicyIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT_POLICY, getResourceId: (req) => req.params.id }),
  controller.deleteDeploymentPolicy
);

export { router as jobsRoutes, deploymentPoliciesRouter as deploymentPoliciesRoutes };
