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

/**
 * @openapi
 * /v1/dashboard:
 *   get:
 *     summary: Get complete dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full dashboard payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', checkPermission('dashboard', 'view'), controller.getDashboard);

/**
 * @openapi
 * /v1/dashboard/refresh:
 *   post:
 *     summary: Refresh and recompute dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refreshed dashboard payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', checkPermission('dashboard', 'edit'), audit({ action: AuditAction.REFRESH, resource: AuditResource.DASHBOARD }), controller.refreshDashboard);

// ============================================
// Statistics
// ============================================

/**
 * @openapi
 * /v1/dashboard/stats:
 *   get:
 *     summary: Get high-level statistics summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics summary object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAssets:
 *                   type: integer
 *                 totalVulnerabilities:
 *                   type: integer
 *                 patchCompliance:
 *                   type: number
 *                 activeAgents:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', checkPermission('dashboard', 'view'), controller.getStats);

/**
 * @openapi
 * /v1/dashboard/compliance:
 *   get:
 *     summary: Get patch compliance data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patch compliance breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 compliant:
 *                   type: integer
 *                 nonCompliant:
 *                   type: integer
 *                 percentage:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/compliance', checkPermission('dashboard', 'view'), controller.getPatchCompliance);

/**
 * @openapi
 * /v1/dashboard/top-vulnerabilities:
 *   get:
 *     summary: Get the top vulnerabilities by severity or count
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, high, medium, low]
 *     responses:
 *       200:
 *         description: List of top vulnerabilities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/top-vulnerabilities',
  checkPermission('dashboard', 'view'),
  validateQuery(topVulnerabilitiesQuerySchema),
  controller.getTopVulnerabilities
);

// ============================================
// Charts
// ============================================

/**
 * @openapi
 * /v1/dashboard/charts/patches:
 *   get:
 *     summary: Get patch distribution chart data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patch chart data series
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/charts/patches', checkPermission('dashboard', 'view'), validateQuery(chartQuerySchema), controller.getPatchChart);

/**
 * @openapi
 * /v1/dashboard/charts/assets:
 *   get:
 *     summary: Get asset status chart data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset status chart data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/charts/assets', checkPermission('dashboard', 'view'), controller.getAssetChart);

/**
 * @openapi
 * /v1/dashboard/charts/vulnerabilities:
 *   get:
 *     summary: Get vulnerability trends chart data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vulnerability trend chart data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/charts/vulnerabilities', checkPermission('dashboard', 'view'), controller.getVulnerabilityChart);

// ============================================
// Agents & Activity
// ============================================

/**
 * @openapi
 * /v1/dashboard/agents:
 *   get:
 *     summary: Get agent connectivity and health data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agent connectivity summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 online:
 *                   type: integer
 *                 offline:
 *                   type: integer
 *                 agents:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/agents', checkPermission('dashboard', 'view'), controller.getAgentConnectivity);

/**
 * @openapi
 * /v1/dashboard/recent-activity:
 *   get:
 *     summary: Get the recent activity feed
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated recent activity entries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/recent-activity',
  checkPermission('dashboard', 'view'),
  validateQuery(recentActivityQuerySchema),
  controller.getRecentActivity
);

export default router;
