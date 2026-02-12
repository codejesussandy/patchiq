import { Router } from 'express';
import { authenticate, requireUser } from '@middleware/auth';
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

// All routes require authentication
router.use(authenticate);
router.use(requireUser);

// ============================================
// Statistics & Types (must be before :id routes)
// ============================================

// GET /v1/vulnerabilities/stats - Get vulnerability statistics
router.get('/stats', validateQuery(statsQuerySchema), controller.getStats);

// GET /v1/vulnerabilities/types - Get vulnerability type counts
router.get('/types', controller.getTypes);

// GET /v1/vulnerabilities/endpoints - Get endpoint vulnerabilities
router.get('/endpoints', controller.getEndpointVulnerabilities);

// GET /v1/vulnerabilities/network - Get network vulnerabilities
router.get('/network', controller.getNetworkVulnerabilities);

// ============================================
// CVE Suggestions for Patch Creation
// ============================================

// GET /v1/vulnerabilities/cve-suggest - Suggest CVEs for a software name
router.get('/cve-suggest', validateQuery(cveSuggestQuerySchema), controller.suggestCvesForSoftware);

// ============================================
// CPE Correlation & Unmatched Software
// ============================================

// GET /v1/vulnerabilities/cpe-stats - Get CPE mapping statistics
router.get('/cpe-stats', controller.getCpeStats);

// GET /v1/vulnerabilities/unmatched-software - List software that couldn't be mapped to CPE
router.get('/unmatched-software', validateQuery(unmatchedSoftwareQuerySchema), controller.listUnmatchedSoftware);

// PUT /v1/vulnerabilities/unmatched-software/:id/resolve - Mark as resolved
router.put('/unmatched-software/:id/resolve', controller.resolveUnmatchedSoftware);

// ============================================
// Zero-day Vulnerabilities
// ============================================

// GET /v1/vulnerabilities/zero-day - List zero-day vulnerabilities
router.get('/zero-day', validateQuery(listZeroDayQuerySchema), controller.listZeroDayVulnerabilities);

// ============================================
// Exceptions
// ============================================

// GET /v1/vulnerabilities/exceptions - List all exceptions
router.get('/exceptions', controller.listExceptions);

// POST /v1/vulnerabilities/exceptions - Create exception(s)
router.post('/exceptions', validateBody(createExceptionBodySchema), controller.createExceptions);

// PUT /v1/vulnerabilities/exceptions/:id - Update exception
router.put(
  '/exceptions/:id',
  validateParams(exceptionParamsSchema),
  validateBody(updateExceptionBodySchema),
  controller.updateException
);

// DELETE /v1/vulnerabilities/exceptions/:id - Delete exception
router.delete('/exceptions/:id', validateParams(exceptionParamsSchema), controller.deleteException);

// ============================================
// Scanning
// ============================================

// POST /v1/vulnerabilities/scan - Trigger vulnerability scan
router.post('/scan', validateBody(scanVulnerabilitiesBodySchema), controller.triggerScan);

// ============================================
// CVE-specific Routes
// ============================================

// GET /v1/vulnerabilities/:cve/endpoints - Get affected endpoints for a CVE
router.get(
  '/:cve/endpoints',
  validateParams(cveParamsSchema),
  validateQuery(affectedQuerySchema),
  controller.getAffectedEndpoints
);

// GET /v1/vulnerabilities/:cve/software - Get affected software for a CVE
router.get(
  '/:cve/software',
  validateParams(cveParamsSchema),
  validateQuery(affectedQuerySchema),
  controller.getAffectedSoftware
);

// ============================================
// Core Vulnerability Routes
// ============================================

// GET /v1/vulnerabilities - List vulnerabilities (non-zero-day)
router.get('/', validateQuery(listVulnerabilitiesQuerySchema), controller.listVulnerabilities);

// GET /v1/vulnerabilities/:id - Get vulnerability by ID
router.get('/:id', validateParams(vulnerabilityParamsSchema), controller.getVulnerabilityById);

export default router;
