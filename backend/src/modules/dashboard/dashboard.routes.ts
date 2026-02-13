import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateQuery } from '@middleware/validation';
import * as controller from './dashboard.controller';
import {
  chartQuerySchema,
  recentActivityQuerySchema,
  topVulnerabilitiesQuerySchema,
} from './dashboard.validators';

const router = Router();

// All routes require authentication + RBAC permission checks
router.use(authenticate);

// ============================================
// Dashboard Overview
// ============================================

// GET /v1/dashboard - Get complete dashboard data
router.get('/', checkPermission('dashboard', 'view'), controller.getDashboard);

// POST /v1/dashboard/refresh - Refresh dashboard data
router.post('/refresh', checkPermission('dashboard', 'edit'), audit({ action: AuditAction.REFRESH, resource: AuditResource.DASHBOARD }), controller.refreshDashboard);

// ============================================
// Statistics
// ============================================

// GET /v1/dashboard/stats - Get statistics summary
router.get('/stats', checkPermission('dashboard', 'view'), controller.getStats);

// GET /v1/dashboard/compliance - Get patch compliance data
router.get('/compliance', checkPermission('dashboard', 'view'), controller.getPatchCompliance);

// GET /v1/dashboard/top-vulnerabilities - Get top vulnerabilities
router.get(
  '/top-vulnerabilities',
  checkPermission('dashboard', 'view'),
  validateQuery(topVulnerabilitiesQuerySchema),
  controller.getTopVulnerabilities
);

// ============================================
// Charts
// ============================================

// GET /v1/dashboard/charts/patches - Patch distribution chart
router.get('/charts/patches', checkPermission('dashboard', 'view'), validateQuery(chartQuerySchema), controller.getPatchChart);

// GET /v1/dashboard/charts/assets - Asset status chart
router.get('/charts/assets', checkPermission('dashboard', 'view'), controller.getAssetChart);

// GET /v1/dashboard/charts/vulnerabilities - Vulnerability trends chart
router.get('/charts/vulnerabilities', checkPermission('dashboard', 'view'), controller.getVulnerabilityChart);

// ============================================
// Agents & Activity
// ============================================

// GET /v1/dashboard/agents - Agent connectivity data
router.get('/agents', checkPermission('dashboard', 'view'), controller.getAgentConnectivity);

// GET /v1/dashboard/recent-activity - Recent activity feed
router.get(
  '/recent-activity',
  checkPermission('dashboard', 'view'),
  validateQuery(recentActivityQuerySchema),
  controller.getRecentActivity
);

export default router;
