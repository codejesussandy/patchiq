import { Request, Response, NextFunction, RequestHandler } from 'express';
import { vulnerabilitiesService } from './vulnerabilities.service';
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
export const getStats: RequestHandler = async (_req, res, next) => {
  try {
    const result = await vulnerabilitiesService.getStats();
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
