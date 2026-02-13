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

// GET /v1/vulnerabilities/stats - Get vulnerability statistics
router.get('/stats', checkPermission('vulnerabilities', 'view'), validateQuery(statsQuerySchema), controller.getStats);

// GET /v1/vulnerabilities/types - Get vulnerability type counts
router.get('/types', checkPermission('vulnerabilities', 'view'), controller.getTypes);

// GET /v1/vulnerabilities/endpoints - Get endpoint vulnerabilities
router.get('/endpoints', checkPermission('vulnerabilities', 'view'), controller.getEndpointVulnerabilities);

// GET /v1/vulnerabilities/network - Get network vulnerabilities
router.get('/network', checkPermission('vulnerabilities', 'view'), controller.getNetworkVulnerabilities);

// ============================================
// CVE Suggestions for Patch Creation
// ============================================

// GET /v1/vulnerabilities/cve-suggest - Suggest CVEs for a software name
router.get('/cve-suggest', checkPermission('vulnerabilities', 'view'), validateQuery(cveSuggestQuerySchema), controller.suggestCvesForSoftware);

// ============================================
// CPE Correlation & Unmatched Software
// ============================================

// GET /v1/vulnerabilities/cpe-stats - Get CPE mapping statistics
router.get('/cpe-stats', checkPermission('vulnerabilities', 'view'), controller.getCpeStats);

// GET /v1/vulnerabilities/unmatched-software - List software that couldn't be mapped to CPE
router.get('/unmatched-software', checkPermission('vulnerabilities', 'view'), validateQuery(unmatchedSoftwareQuerySchema), controller.listUnmatchedSoftware);

// PUT /v1/vulnerabilities/unmatched-software/:id/resolve - Mark as resolved
router.put('/unmatched-software/:id/resolve', checkPermission('vulnerabilities', 'edit'), audit({ action: AuditAction.RESOLVE, resource: AuditResource.VULNERABILITY, getResourceId: (req) => req.params.id }), controller.resolveUnmatchedSoftware);

// ============================================
// Zero-day Vulnerabilities
// ============================================

// GET /v1/vulnerabilities/zero-day - List zero-day vulnerabilities
router.get('/zero-day', checkPermission('vulnerabilities', 'view'), validateQuery(listZeroDayQuerySchema), controller.listZeroDayVulnerabilities);

// ============================================
// Exceptions
// ============================================

// GET /v1/vulnerabilities/exceptions - List all exceptions
router.get('/exceptions', checkPermission('vulnerabilities', 'view'), controller.listExceptions);

// POST /v1/vulnerabilities/exceptions - Create exception(s)
router.post('/exceptions', checkPermission('vulnerabilities', 'add'), validateBody(createExceptionBodySchema), audit({ action: AuditAction.CREATE, resource: AuditResource.VULNERABILITY_EXCEPTION }), controller.createExceptions);

// PUT /v1/vulnerabilities/exceptions/:id - Update exception
router.put(
  '/exceptions/:id',
  checkPermission('vulnerabilities', 'edit'),
  validateParams(exceptionParamsSchema),
  validateBody(updateExceptionBodySchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.VULNERABILITY_EXCEPTION, getResourceId: (req) => req.params.id }),
  controller.updateException
);

// DELETE /v1/vulnerabilities/exceptions/:id - Delete exception
router.delete('/exceptions/:id', checkPermission('vulnerabilities', 'delete'), validateParams(exceptionParamsSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.VULNERABILITY_EXCEPTION, getResourceId: (req) => req.params.id }), controller.deleteException);

// ============================================
// Scanning
// ============================================

// POST /v1/vulnerabilities/scan - Trigger vulnerability scan
router.post('/scan', checkPermission('vulnerabilities', 'edit'), validateBody(scanVulnerabilitiesBodySchema), audit({ action: AuditAction.SCAN, resource: AuditResource.VULNERABILITY }), controller.triggerScan);

// ============================================
// CVE-specific Routes
// ============================================

// GET /v1/vulnerabilities/:cve/endpoints - Get affected endpoints for a CVE
router.get(
  '/:cve/endpoints',
  checkPermission('vulnerabilities', 'view'),
  validateParams(cveParamsSchema),
  validateQuery(affectedQuerySchema),
  controller.getAffectedEndpoints
);

// GET /v1/vulnerabilities/:cve/software - Get affected software for a CVE
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

// GET /v1/vulnerabilities - List vulnerabilities (non-zero-day)
router.get('/', checkPermission('vulnerabilities', 'view'), validateQuery(listVulnerabilitiesQuerySchema), controller.listVulnerabilities);

// GET /v1/vulnerabilities/:id - Get vulnerability by ID
router.get('/:id', checkPermission('vulnerabilities', 'view'), validateParams(vulnerabilityParamsSchema), controller.getVulnerabilityById);

export default router;
