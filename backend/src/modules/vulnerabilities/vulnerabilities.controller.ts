import { Request, Response, NextFunction, RequestHandler } from 'express';
import { vulnerabilitiesService } from './vulnerabilities.service';
import { prisma } from '@/db/client';
import type {
  ListVulnerabilitiesQuery,
  ListZeroDayQuery,
  AffectedQuery,
  CreateExceptionBody,
  UpdateExceptionBody,
  ScanVulnerabilitiesBody,
} from './vulnerabilities.validators';

/**
 * List vulnerabilities (non-zero-day)
 * GET /v1/vulnerabilities
 */
export const listVulnerabilities: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as ListVulnerabilitiesQuery;
    const result = await vulnerabilitiesService.listVulnerabilities(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * List zero-day vulnerabilities
 * GET /v1/vulnerabilities/zero-day
 */
export const listZeroDayVulnerabilities: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as ListZeroDayQuery;
    const result = await vulnerabilitiesService.listZeroDayVulnerabilities(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get vulnerability by ID
 * GET /v1/vulnerabilities/:id
 */
export const getVulnerabilityById: RequestHandler = async (req, res, next) => {
  try {
    const result = await vulnerabilitiesService.getVulnerabilityById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get affected endpoints for a CVE
 * GET /v1/vulnerabilities/:cve/endpoints
 */
export const getAffectedEndpoints: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as AffectedQuery;
    const result = await vulnerabilitiesService.getAffectedEndpoints(req.params.cve, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get affected software for a CVE
 * GET /v1/vulnerabilities/:cve/software
 */
export const getAffectedSoftware: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as AffectedQuery;
    const result = await vulnerabilitiesService.getAffectedSoftware(req.params.cve, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get vulnerability statistics
 * GET /v1/vulnerabilities/stats
 */
export const getStats: RequestHandler = async (req, res, next) => {
  try {
    // Support affectsAssets filter to only count CVEs affecting your assets
    const affectsAssets = req.query.affectsAssets === 'true';
    const result = await vulnerabilitiesService.getStats(affectsAssets);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vulnerability types
 * GET /v1/vulnerabilities/types
 */
export const getTypes: RequestHandler = async (_req, res, next) => {
  try {
    const result = await vulnerabilitiesService.getTypes();
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get endpoint vulnerabilities
 * GET /v1/vulnerabilities/endpoints
 */
export const getEndpointVulnerabilities: RequestHandler = async (_req, res, next) => {
  try {
    const result = await vulnerabilitiesService.getEndpointVulnerabilities();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get network vulnerabilities
 * GET /v1/vulnerabilities/network
 */
export const getNetworkVulnerabilities: RequestHandler = async (_req, res, next) => {
  try {
    const result = await vulnerabilitiesService.getNetworkVulnerabilities();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * List all exceptions
 * GET /v1/vulnerabilities/exceptions
 */
export const listExceptions: RequestHandler = async (_req, res, next) => {
  try {
    const result = await vulnerabilitiesService.getExceptions();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Create exception(s)
 * POST /v1/vulnerabilities/exceptions
 */
export const createExceptions: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const body = req.body as CreateExceptionBody;
    const result = await vulnerabilitiesService.createExceptions(body, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an exception
 * PUT /v1/vulnerabilities/exceptions/:id
 */
export const updateException: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const body = req.body as UpdateExceptionBody;
    const result = await vulnerabilitiesService.updateException(req.params.id, body, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an exception
 * DELETE /v1/vulnerabilities/exceptions/:id
 */
export const deleteException: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const result = await vulnerabilitiesService.deleteException(req.params.id, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger vulnerability scan
 * POST /v1/vulnerabilities/scan
 */
export const triggerScan: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const body = req.body as ScanVulnerabilitiesBody;
    const result = await vulnerabilitiesService.triggerScan(body, userId);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
};

// ============================================
// Unmatched Software (CPE Correlation)
// ============================================

/**
 * List unmatched software (software that couldn't be mapped to CPE)
 * GET /v1/vulnerabilities/unmatched-software
 */
export const listUnmatchedSoftware: RequestHandler = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const resolved = req.query.resolved === 'true';

    const [data, total] = await Promise.all([
      prisma.unmatchedSoftware.findMany({
        where: { resolved },
        orderBy: { occurrences: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.unmatchedSoftware.count({ where: { resolved } }),
    ]);

    res.json({ data, total, limit, offset });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark unmatched software as resolved (after creating a CPE mapping)
 * PUT /v1/vulnerabilities/unmatched-software/:id/resolve
 */
export const resolveUnmatchedSoftware: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await prisma.unmatchedSoftware.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        notes: req.body.notes,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Get CPE mapping statistics
 * GET /v1/vulnerabilities/cpe-stats
 */
export const getCpeStats: RequestHandler = async (_req, res, next) => {
  try {
    const [
      totalMappings,
      totalUnmatched,
      unresolvedUnmatched,
      softwareWithCpe,
      softwareWithoutCpe,
    ] = await Promise.all([
      prisma.cpeMapping.count({ where: { isActive: true } }),
      prisma.unmatchedSoftware.count(),
      prisma.unmatchedSoftware.count({ where: { resolved: false } }),
      prisma.assetSoftware.count({ where: { cpeVendor: { not: null } } }),
      prisma.assetSoftware.count({ where: { cpeVendor: null } }),
    ]);

    const totalSoftware = softwareWithCpe + softwareWithoutCpe;
    const matchRate = totalSoftware > 0
      ? Math.round((softwareWithCpe / totalSoftware) * 100)
      : 0;

    res.json({
      data: {
        totalMappings,
        totalUnmatched,
        unresolvedUnmatched,
        softwareWithCpe,
        softwareWithoutCpe,
        matchRate,
      },
    });
  } catch (error) {
    next(error);
  }
};
