/**
 * Asset Patch Recommendation Controller
 *
 * API endpoints for managing patch recommendations
 */

import type { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { BadRequestError } from '@shared/errors';
import { sendSuccess, sendPaginated } from '@shared/utils';
import { assetPatchRecommendationService } from './asset-patch-recommendation.service';
import { validateListRecommendationsQuery, validateRejectRequest, validateBulkAcceptRequest, validateBulkRejectRequest, validateBulkDeployRequest } from './asset-patch-recommendation.validator';

type RecommendationWithRelations = Prisma.AssetPatchRecommendationGetPayload<{
  include: {
    asset: { include: { agent: true } };
    vulnerability: { include: { references: true } };
    patch: { include: { bundle: true } };
    deploymentTask: true;
  };
}>;

/**
 * List recommendations for an asset
 * GET /api/assets/:assetId/patch-recommendations
 */
export async function listAssetRecommendations(req: Request, res: Response) {
  const { assetId } = req.params;
  const validation = validateListRecommendationsQuery(req.query);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const result = await assetPatchRecommendationService.listRecommendations({
    ...validation.data,
    assetId,
  });

  const page = validation.data.page || 1;
  const limit = validation.data.limit || 50;
  sendPaginated(res, result.data, { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) });
}

/**
 * List recommendations for a patch
 * GET /api/patches/:patchId/recommendations
 */
export async function listPatchRecommendations(req: Request, res: Response) {
  const { patchId } = req.params;
  const validation = validateListRecommendationsQuery(req.query);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const result = await assetPatchRecommendationService.listRecommendations({
    ...validation.data,
    patchId,
  });

  const page = validation.data.page || 1;
  const limit = validation.data.limit || 50;
  sendPaginated(res, result.data, { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) });
}

/**
 * Get a single recommendation
 * GET /api/patch-recommendations/:id
 */
export async function getRecommendation(req: Request, res: Response) {
  const { id } = req.params;

  const recommendation = await assetPatchRecommendationService.getRecommendation(id);

  if (!recommendation) {
    throw new BadRequestError('Recommendation not found');
  }

  sendSuccess(res, recommendation);
}

/**
 * Accept a recommendation
 * POST /api/patch-recommendations/:id/accept
 */
export async function acceptRecommendation(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;

  const recommendation = await assetPatchRecommendationService.acceptRecommendation(
    id,
    reason
  );

  sendSuccess(res, recommendation);
}

/**
 * Reject a recommendation
 * POST /api/patch-recommendations/:id/reject
 */
export async function rejectRecommendation(req: Request, res: Response) {
  const { id } = req.params;
  const validation = validateRejectRequest(req.body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const recommendation = await assetPatchRecommendationService.rejectRecommendation(
    id,
    validation.data.reason
  );

  sendSuccess(res, recommendation);
}

/**
 * Deploy a recommendation
 * POST /api/patch-recommendations/:id/deploy
 *
 * This endpoint creates or links to a deployment task for the recommendation.
 * The actual deployment is handled by the deployment executor service.
 */
export async function deployRecommendation(req: Request, res: Response) {
  const { id } = req.params;

  // Get the recommendation with all relations
  const recommendation = await assetPatchRecommendationService.getRecommendation(id) as RecommendationWithRelations | null;

  if (!recommendation) {
    throw new BadRequestError('Recommendation not found');
  }

  // Import deployment services dynamically to avoid circular dependencies
  const { deploymentExecutorService } = await import('@modules/deployments/deployment-executor.service');

  // Get agent ID for deployment
  const agentId = recommendation.asset?.agent?.id;
  if (!agentId) {
    throw new BadRequestError('Asset does not have an associated agent');
  }

  // Create a patch deployment for this specific asset and patch
  const deployment = await deploymentExecutorService.createPatchDeployment({
    name: `Deploy ${recommendation.patch.title} to ${recommendation.asset.name}`,
    patches: [{ id: recommendation.patchId }],
    targetAgentIds: [agentId],
    triggerType: 'manual',
  });

  sendSuccess(res, { recommendation, deployment });
}

/**
 * Bulk accept recommendations
 * POST /api/patch-recommendations/bulk-accept
 */
export async function bulkAcceptRecommendations(req: Request, res: Response) {
  const validation = validateBulkAcceptRequest(req.body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const result = await assetPatchRecommendationService.bulkAcceptRecommendations(
    validation.data.ids,
    validation.data.reason
  );

  sendSuccess(res, result);
}

/**
 * Bulk reject recommendations
 * POST /api/patch-recommendations/bulk-reject
 */
export async function bulkRejectRecommendations(req: Request, res: Response) {
  const validation = validateBulkRejectRequest(req.body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const result = await assetPatchRecommendationService.bulkRejectRecommendations(
    validation.data.ids,
    validation.data.reason
  );

  sendSuccess(res, result);
}

/**
 * Bulk deploy recommendations
 * POST /api/patch-recommendations/bulk-deploy
 */
export async function bulkDeployRecommendations(req: Request, res: Response) {
  const validation = validateBulkDeployRequest(req.body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const result = await assetPatchRecommendationService.bulkDeployRecommendations(
    validation.data.ids
  );

  sendSuccess(res, result);
}

/**
 * Get dashboard statistics
 * GET /api/patch-recommendations/dashboard
 */
export async function getDashboardStats(req: Request, res: Response) {
  // Get organization from user context (assuming auth middleware sets this)
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    throw new BadRequestError('Organization not found');
  }

  const stats = await assetPatchRecommendationService.getDashboardStats(organizationId);

  sendSuccess(res, stats);
}

/**
 * List all recommendations (with optional filters)
 * GET /api/patch-recommendations
 */
export async function listRecommendations(req: Request, res: Response) {
  const validation = validateListRecommendationsQuery(req.query);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const result = await assetPatchRecommendationService.listRecommendations(
    validation.data
  );

  const page = validation.data.page || 1;
  const limit = validation.data.limit || 50;
  sendPaginated(res, result.data, { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) });
}
