import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateQuery, validateParams, validateBody } from '@middleware/validation';
import * as controller from './vulnerabilities.controller';
import {
  listVulnerabilitiesQuerySchema,
  listZeroDayQuerySchema,
  vulnerabilityParamsSchema,
  cveParamsSchema,
  affectedQuerySchema,
  createExceptionBodySchema,
  updateExceptionBodySchema,
  exceptionParamsSchema,
  scanVulnerabilitiesBodySchema,
  statsQuerySchema,
  unmatchedSoftwareQuerySchema,
  cveSuggestQuerySchema,
} from './vulnerabilities.validators';

const router = Router();

// All routes require authentication + RBAC permission checks
router.use(authenticate);

// ============================================
// Statistics & Types (must be before :id routes)
// ============================================

/**
 * @openapi
 * /v1/vulnerabilities/stats:
 *   get:
 *     summary: Get vulnerability statistics
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *         description: Filter by severity level
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics range
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics range
 *     responses:
 *       200:
 *         description: Vulnerability statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/stats', checkPermission('vulnerabilities', 'view'), validateQuery(statsQuerySchema), controller.getStats);

/**
 * @openapi
 * /v1/vulnerabilities/types:
 *   get:
 *     summary: Get vulnerability type counts
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vulnerability type counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/types', checkPermission('vulnerabilities', 'view'), controller.getTypes);

/**
 * @openapi
 * /v1/vulnerabilities/endpoints:
 *   get:
 *     summary: Get endpoint vulnerabilities
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of endpoint vulnerabilities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/endpoints', checkPermission('vulnerabilities', 'view'), controller.getEndpointVulnerabilities);

/**
 * @openapi
 * /v1/vulnerabilities/network:
 *   get:
 *     summary: Get network vulnerabilities
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of network vulnerabilities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/network', checkPermission('vulnerabilities', 'view'), controller.getNetworkVulnerabilities);

// ============================================
// CVE Suggestions for Patch Creation
// ============================================

/**
 * @openapi
 * /v1/vulnerabilities/cve-suggest:
 *   get:
 *     summary: Suggest CVEs for a software name
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: software
 *         required: true
 *         schema:
 *           type: string
 *         description: Software name to search CVEs for
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *         description: Software version
 *     responses:
 *       200:
 *         description: Suggested CVEs for the given software
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/cve-suggest', checkPermission('vulnerabilities', 'view'), validateQuery(cveSuggestQuerySchema), controller.suggestCvesForSoftware);

// ============================================
// CPE Correlation & Unmatched Software
// ============================================

/**
 * @openapi
 * /v1/vulnerabilities/cpe-stats:
 *   get:
 *     summary: Get CPE mapping statistics
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CPE mapping statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/cpe-stats', checkPermission('vulnerabilities', 'view'), controller.getCpeStats);

/**
 * @openapi
 * /v1/vulnerabilities/unmatched-software:
 *   get:
 *     summary: List software that could not be mapped to a CPE
 *     tags:
 *       - Vulnerabilities
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
 *         description: Paginated list of unmatched software
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/unmatched-software', checkPermission('vulnerabilities', 'view'), validateQuery(unmatchedSoftwareQuerySchema), controller.listUnmatchedSoftware);

/**
 * @openapi
 * /v1/vulnerabilities/unmatched-software/{id}/resolve:
 *   put:
 *     summary: Mark an unmatched software entry as resolved
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unmatched software entry ID
 *     responses:
 *       200:
 *         description: Entry marked as resolved
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
router.put('/unmatched-software/:id/resolve', checkPermission('vulnerabilities', 'edit'), audit({ action: AuditAction.RESOLVE, resource: AuditResource.VULNERABILITY, getResourceId: (req) => req.params.id }), controller.resolveUnmatchedSoftware);

// ============================================
// Zero-day Vulnerabilities
// ============================================

/**
 * @openapi
 * /v1/vulnerabilities/zero-day:
 *   get:
 *     summary: List zero-day vulnerabilities
 *     tags:
 *       - Vulnerabilities
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
 *         name: severity
 *         schema:
 *           type: string
 *         description: Filter by severity
 *     responses:
 *       200:
 *         description: Paginated list of zero-day vulnerabilities
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/zero-day', checkPermission('vulnerabilities', 'view'), validateQuery(listZeroDayQuerySchema), controller.listZeroDayVulnerabilities);

// ============================================
// Exceptions
// ============================================

/**
 * @openapi
 * /v1/vulnerabilities/exceptions:
 *   get:
 *     summary: List all vulnerability exceptions
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vulnerability exceptions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/exceptions', checkPermission('vulnerabilities', 'view'), controller.listExceptions);

/**
 * @openapi
 * /v1/vulnerabilities/exceptions:
 *   post:
 *     summary: Create one or more vulnerability exceptions
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cveId:
 *                 type: string
 *               reason:
 *                 type: string
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Exception(s) created successfully
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
router.post('/exceptions', checkPermission('vulnerabilities', 'add'), validateBody(createExceptionBodySchema), audit({ action: AuditAction.CREATE, resource: AuditResource.VULNERABILITY_EXCEPTION }), controller.createExceptions);

/**
 * @openapi
 * /v1/vulnerabilities/exceptions/{id}:
 *   put:
 *     summary: Update a vulnerability exception
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exception ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Exception updated successfully
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
  '/exceptions/:id',
  checkPermission('vulnerabilities', 'edit'),
  validateParams(exceptionParamsSchema),
  validateBody(updateExceptionBodySchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.VULNERABILITY_EXCEPTION, getResourceId: (req) => req.params.id }),
  controller.updateException
);

/**
 * @openapi
 * /v1/vulnerabilities/exceptions/{id}:
 *   delete:
 *     summary: Delete a vulnerability exception
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exception ID
 *     responses:
 *       200:
 *         description: Exception deleted successfully
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
router.delete('/exceptions/:id', checkPermission('vulnerabilities', 'delete'), validateParams(exceptionParamsSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.VULNERABILITY_EXCEPTION, getResourceId: (req) => req.params.id }), controller.deleteException);

// ============================================
// Scanning
// ============================================

/**
 * @openapi
 * /v1/vulnerabilities/scan:
 *   post:
 *     summary: Trigger a vulnerability scan
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Asset IDs to scan; omit for all assets
 *     responses:
 *       200:
 *         description: Scan triggered successfully
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
router.post('/scan', checkPermission('vulnerabilities', 'edit'), validateBody(scanVulnerabilitiesBodySchema), audit({ action: AuditAction.SCAN, resource: AuditResource.VULNERABILITY }), controller.triggerScan);

// ============================================
// CVE-specific Routes
// ============================================

/**
 * @openapi
 * /v1/vulnerabilities/{cve}/endpoints:
 *   get:
 *     summary: Get affected endpoints for a CVE
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cve
 *         required: true
 *         schema:
 *           type: string
 *         description: CVE identifier (e.g. CVE-2024-1234)
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
 *     responses:
 *       200:
 *         description: Paginated list of affected endpoints
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/:cve/endpoints',
  checkPermission('vulnerabilities', 'view'),
  validateParams(cveParamsSchema),
  validateQuery(affectedQuerySchema),
  controller.getAffectedEndpoints
);

/**
 * @openapi
 * /v1/vulnerabilities/{cve}/software:
 *   get:
 *     summary: Get affected software for a CVE
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cve
 *         required: true
 *         schema:
 *           type: string
 *         description: CVE identifier (e.g. CVE-2024-1234)
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
 *     responses:
 *       200:
 *         description: Paginated list of affected software
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.get(
  '/:cve/software',
  checkPermission('vulnerabilities', 'view'),
  validateParams(cveParamsSchema),
  validateQuery(affectedQuerySchema),
  controller.getAffectedSoftware
);

// ============================================
// Core Vulnerability Routes
// ============================================

/**
 * @openapi
 * /v1/vulnerabilities:
 *   get:
 *     summary: List vulnerabilities (non-zero-day)
 *     tags:
 *       - Vulnerabilities
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
 *         name: severity
 *         schema:
 *           type: string
 *         description: Filter by severity
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Paginated list of vulnerabilities
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/', checkPermission('vulnerabilities', 'view'), validateQuery(listVulnerabilitiesQuerySchema), controller.listVulnerabilities);

/**
 * @openapi
 * /v1/vulnerabilities/{id}:
 *   get:
 *     summary: Get a vulnerability by ID
 *     tags:
 *       - Vulnerabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vulnerability ID
 *     responses:
 *       200:
 *         description: Vulnerability details
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
router.get('/:id', checkPermission('vulnerabilities', 'view'), validateParams(vulnerabilityParamsSchema), controller.getVulnerabilityById);

export default router;
