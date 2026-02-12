export { patchRoutes, patchTestRoutes, zeroTouchConfigRoutes } from './patches.routes';
export { default as assetPatchRecommendationRoutes } from './asset-patch-recommendation.routes';
export * as patchesService from './patches.service';
export { assetPatchRecommendationService } from './asset-patch-recommendation.service';
export * from './patches.types';

// Export validators (schemas only, not the inferred types to avoid conflicts)
export {
  createPatchSchema,
  updatePatchSchema,
  patchListQuerySchema,
  patchIdParamSchema,
  testPatchSchema,
  rejectPatchSchema,
  testApproveQuerySchema,
  scanEndpointsSchema,
  createPatchTestSchema,
  patchTestIdParamSchema,
  patchTestListQuerySchema,
  autoDeploymentRulesSchema,
  createZeroTouchConfigSchema,
  updateZeroTouchConfigSchema,
  zeroTouchConfigIdParamSchema,
  zeroTouchConfigListQuerySchema,
} from './patches.validator';
