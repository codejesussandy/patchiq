import { Router } from 'express';
import { authenticate, requireUser } from '@middleware/auth';
import { validateQuery } from '@middleware/validation';
import * as controller from './dashboard.controller';
import {
  chartQuerySchema,
  recentActivityQuerySchema,
  topVulnerabilitiesQuerySchema,
} from './dashboard.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireUser);

// ============================================
// Dashboard Overview
// ============================================

// GET /v1/dashboard - Get complete dashboard data
router.get('/', controller.getDashboard);

// POST /v1/dashboard/refresh - Refresh dashboard data
router.post('/refresh', controller.refreshDashboard);

// ============================================
// Statistics
// ============================================

// GET /v1/dashboard/stats - Get statistics summary
router.get('/stats', controller.getStats);

// GET /v1/dashboard/compliance - Get patch compliance data
router.get('/compliance', controller.getPatchCompliance);

// GET /v1/dashboard/top-vulnerabilities - Get top vulnerabilities
router.get(
  '/top-vulnerabilities',
  validateQuery(topVulnerabilitiesQuerySchema),
  controller.getTopVulnerabilities
);

// ============================================
// Charts
// ============================================

// GET /v1/dashboard/charts/patches - Patch distribution chart
router.get('/charts/patches', validateQuery(chartQuerySchema), controller.getPatchChart);

// GET /v1/dashboard/charts/assets - Asset status chart
router.get('/charts/assets', controller.getAssetChart);

// GET /v1/dashboard/charts/vulnerabilities - Vulnerability trends chart
router.get('/charts/vulnerabilities', controller.getVulnerabilityChart);

// ============================================
// Agents & Activity
// ============================================

// GET /v1/dashboard/agents - Agent connectivity data
router.get('/agents', controller.getAgentConnectivity);

// GET /v1/dashboard/recent-activity - Recent activity feed
router.get(
  '/recent-activity',
  validateQuery(recentActivityQuerySchema),
  controller.getRecentActivity
);

export default router;
