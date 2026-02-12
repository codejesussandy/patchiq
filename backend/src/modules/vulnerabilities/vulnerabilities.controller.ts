import { RequestHandler } from 'express';
import { sendSuccess, typedQuery } from '@shared/utils';
import { prisma } from '@/db/client';
import { vulnerabilitiesService } from './vulnerabilities.service';
import type {
  ListVulnerabilitiesQuery,
  ListZeroDayQuery,
  AffectedQuery,
  CreateExceptionBody,
  UpdateExceptionBody,
  ScanVulnerabilitiesBody,
  StatsQuery,
  UnmatchedSoftwareQuery,
  CveSuggestQuery,
} from './vulnerabilities.validators';

/**
 * List vulnerabilities (non-zero-day)
 * GET /v1/vulnerabilities
 */
export const listVulnerabilities: RequestHandler = async (req, res, next) => {
  try {
    const query = typedQuery<ListVulnerabilitiesQuery>(req);
    const result = await vulnerabilitiesService.listVulnerabilities(query);
    sendSuccess(res, result);
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
    const query = typedQuery<ListZeroDayQuery>(req);
    const result = await vulnerabilitiesService.listZeroDayVulnerabilities(query);
    sendSuccess(res, result);
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
    sendSuccess(res, result);
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
    const query = typedQuery<AffectedQuery>(req);
    const result = await vulnerabilitiesService.getAffectedEndpoints(req.params.cve, query);
    sendSuccess(res, result);
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
    const query = typedQuery<AffectedQuery>(req);
    const result = await vulnerabilitiesService.getAffectedSoftware(req.params.cve, query);
    sendSuccess(res, result);
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
    const { affectsAssets } = typedQuery<StatsQuery>(req);
    const result = await vulnerabilitiesService.getStats(affectsAssets ?? false);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Suggest CVEs for a given software name
 * GET /v1/vulnerabilities/cve-suggest?software=Chrome&vendor=Google
 */
export const suggestCvesForSoftware: RequestHandler = async (req, res, next) => {
  try {
    const { software, vendor } = typedQuery<CveSuggestQuery>(req);
    const result = await vulnerabilitiesService.suggestCvesForSoftware({
      software,
      vendor,
    });
    sendSuccess(res, result);
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
    sendSuccess(res, result);
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
    sendSuccess(res, result);
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
    sendSuccess(res, result);
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
    sendSuccess(res, result);
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
    sendSuccess(res, result, 201);
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
    sendSuccess(res, result);
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
    sendSuccess(res, result);
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
    sendSuccess(res, result, 202);
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
    const { limit, offset, resolved } = typedQuery<UnmatchedSoftwareQuery>(req);

    const [data, total] = await Promise.all([
      prisma.unmatchedSoftware.findMany({
        where: { resolved },
        orderBy: { occurrences: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.unmatchedSoftware.count({ where: { resolved } }),
    ]);

    sendSuccess(res, { data, total, limit, offset });
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

    sendSuccess(res, updated);
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

    sendSuccess(res, {
      totalMappings,
      totalUnmatched,
      unresolvedUnmatched,
      softwareWithCpe,
      softwareWithoutCpe,
      matchRate,
    });
  } catch (error) {
    next(error);
  }
};
