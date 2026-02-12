import { RequestHandler } from 'express';
import { sendSuccess, typedQuery } from '@shared/utils';
import { dashboardService } from './dashboard.service';
import type { ChartQuery, RecentActivityQuery, TopVulnerabilitiesQuery } from './dashboard.validators';

/**
 * Get complete dashboard data
 * GET /v1/dashboard
 */
export const getDashboard: RequestHandler = async (_req, res, next) => {
  try {
    const result = await dashboardService.getDashboardData();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard statistics
 * GET /v1/dashboard/stats
 */
export const getStats: RequestHandler = async (_req, res, next) => {
  try {
    const result = await dashboardService.getStats();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get patch distribution chart data
 * GET /v1/dashboard/charts/patches
 */
export const getPatchChart: RequestHandler = async (req, res, next) => {
  try {
    const query = typedQuery<ChartQuery>(req);
    const result = await dashboardService.getPatchChartData(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get asset status chart data
 * GET /v1/dashboard/charts/assets
 */
export const getAssetChart: RequestHandler = async (_req, res, next) => {
  try {
    const result = await dashboardService.getAssetChartData();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get vulnerability trends chart data
 * GET /v1/dashboard/charts/vulnerabilities
 */
export const getVulnerabilityChart: RequestHandler = async (_req, res, next) => {
  try {
    const result = await dashboardService.getVulnerabilityChartData();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get agent connectivity data
 * GET /v1/dashboard/agents
 */
export const getAgentConnectivity: RequestHandler = async (_req, res, next) => {
  try {
    const result = await dashboardService.getAgentConnectivity();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activity feed
 * GET /v1/dashboard/recent-activity
 */
export const getRecentActivity: RequestHandler = async (req, res, next) => {
  try {
    const query = typedQuery<RecentActivityQuery>(req);
    const result = await dashboardService.getRecentActivityFeed(query.limit || 20);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get top vulnerabilities
 * GET /v1/dashboard/top-vulnerabilities
 */
export const getTopVulnerabilities: RequestHandler = async (req, res, next) => {
  try {
    const query = typedQuery<TopVulnerabilitiesQuery>(req);
    const result = await dashboardService.getTopVulnerabilities(query.limit || 10);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get patch compliance data
 * GET /v1/dashboard/compliance
 */
export const getPatchCompliance: RequestHandler = async (_req, res, next) => {
  try {
    const result = await dashboardService.getPatchCompliance();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh dashboard data
 * POST /v1/dashboard/refresh
 */
export const refreshDashboard: RequestHandler = async (_req, res, next) => {
  try {
    // For now, just return fresh dashboard data
    // In production, this could invalidate caches
    const result = await dashboardService.getDashboardData();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};
