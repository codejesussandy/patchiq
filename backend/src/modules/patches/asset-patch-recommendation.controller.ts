/**
 * Asset Patch Recommendation Controller
 *
 * API endpoints for managing patch recommendations
 */

import { Request, Response } from 'express';
import { assetPatchRecommendationService } from './asset-patch-recommendation.service';
import { validateListRecommendationsQuery, validateRejectRequest } from './asset-patch-recommendation.validator';
import { BadRequestError } from '@shared/errors';

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

  res.json({
    success: true,
    data: result.data,
    pagination: {
      page: validation.data.page || 1,
      limit: validation.data.limit || 50,
      total: result.total,
      totalPages: Math.ceil(result.total / (validation.data.limit || 50)),
    },
  });
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

  res.json({
    success: true,
    data: result.data,
    pagination: {
      page: validation.data.page || 1,
      limit: validation.data.limit || 50,
      total: result.total,
      totalPages: Math.ceil(result.total / (validation.data.limit || 50)),
    },
  });
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

  res.json({
    success: true,
    data: recommendation,
  });
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

  res.json({
    success: true,
    data: recommendation,
    message: 'Recommendation accepted',
  });
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

  res.json({
    success: true,
    data: recommendation,
    message: 'Recommendation rejected',
  });
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
  const recommendation = await assetPatchRecommendationService.getRecommendation(id);

  if (!recommendation) {
    throw new BadRequestError('Recommendation not found');
  }

  // Type assertion for relations (asset, patch, asset.agent are included by getRecommendation)
  const rec = recommendation as any;

  // Import deployment services dynamically to avoid circular dependencies
  const { deploymentExecutorService } = await import('@modules/deployments/deployment-executor.service');

  // Get agent ID for deployment
  const agentId = rec.asset?.agent?.id;
  if (!agentId) {
    throw new BadRequestError('Asset does not have an associated agent');
  }

  // Create a patch deployment for this specific asset and patch
  const deployment = await deploymentExecutorService.createPatchDeployment({
    name: `Deploy ${rec.patch.title} to ${rec.asset.name}`,
    patches: [{ id: recommendation.patchId }],
    targetAgentIds: [agentId],
    triggerType: 'manual',
  });

  res.json({
    success: true,
    data: {
      recommendation,
      deployment,
    },
    message: 'Deployment initiated',
  });
}

/**
 * Get dashboard statistics
 * GET /api/patch-recommendations/dashboard
 */
export async function getDashboardStats(req: Request, res: Response) {
  // Get organization from user context (assuming auth middleware sets this)
  const organizationId = (req as any).user?.organizationId;

  if (!organizationId) {
    throw new BadRequestError('Organization not found');
  }

  const stats = await assetPatchRecommendationService.getDashboardStats(organizationId);

  res.json({
    success: true,
    data: stats,
  });
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

  res.json({
    success: true,
    data: result.data,
    pagination: {
      page: validation.data.page || 1,
      limit: validation.data.limit || 50,
      total: result.total,
      totalPages: Math.ceil(result.total / (validation.data.limit || 50)),
    },
  });
}
