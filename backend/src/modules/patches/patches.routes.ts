import { Router } from 'express';
import { deploymentController } from '@modules/deployments';
import { authenticate } from '@middleware/auth';
import { validateBody, validateQuery, validateParams } from '@middleware/validation';
import * as controller from './patches.controller';
import {
  createPatchSchema,
  updatePatchSchema,
  patchListQuerySchema,
  patchIdParamSchema,
  testPatchSchema,
  rejectPatchSchema,
  testApproveQuerySchema,
  createDeploymentSchema,
  deploymentIdParamSchema,
  deploymentListQuerySchema,
  createPatchTestSchema,
  patchTestIdParamSchema,
  patchTestListQuerySchema,
  createZeroTouchConfigSchema,
  updateZeroTouchConfigSchema,
  zeroTouchConfigIdParamSchema,
  zeroTouchConfigListQuerySchema,
  scanEndpointsSchema,
  createPatchDeploymentFromUISchema,
} from './patches.validator';

const router = Router();

// ============================================
// Patches CRUD
// ============================================

// GET /v1/patches - List all patches with filtering and pagination
router.get(
  '/',
  authenticate,
  validateQuery(patchListQuerySchema),
  controller.listPatches
);

// GET /v1/patches/test-approve - List patches pending test/approval
router.get(
  '/test-approve',
  authenticate,
  validateQuery(testApproveQuerySchema),
  controller.getPatchesPendingTestApproval
);

// POST /v1/patches/discover - Run Hub-scoped patch discovery
router.post(
  '/discover',
  authenticate,
  controller.discoverPatches
);

// POST /v1/patches - Create a new patch
router.post(
  '/',
  authenticate,
  validateBody(createPatchSchema),
  controller.createPatch
);

// GET /v1/patches/:id - Get patch by ID
router.get(
  '/:id',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.getPatch
);

// PUT /v1/patches/:id - Update patch
router.put(
  '/:id',
  authenticate,
  validateParams(patchIdParamSchema),
  validateBody(updatePatchSchema),
  controller.updatePatch
);

// DELETE /v1/patches/:id - Delete patch
router.delete(
  '/:id',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.deletePatch
);

// ============================================
// Patch Related Data
// ============================================

// GET /v1/patches/:id/affected-softwares - Get affected products
router.get(
  '/:id/affected-softwares',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.getAffectedProducts
);

// POST /v1/patches/:id/affected-softwares - Add affected product
router.post(
  '/:id/affected-softwares',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.addAffectedProduct
);

// DELETE /v1/patches/:id/affected-softwares/:productId - Remove affected product
router.delete(
  '/:id/affected-softwares/:productId',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.removeAffectedProduct
);

// GET /v1/patches/:id/bundle/stream - Stream patch bundle (installer) from MinIO
router.get(
  '/:id/bundle/stream',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.streamPatchBundle
);

// GET /v1/patches/:id/vulnerabilities - Get related vulnerabilities
router.get(
  '/:id/vulnerabilities',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.getVulnerabilities
);

// POST /v1/patches/:id/scan-endpoints - Scan endpoints for patch applicability
router.post(
  '/:id/scan-endpoints',
  authenticate,
  validateParams(patchIdParamSchema),
  validateBody(scanEndpointsSchema),
  controller.scanEndpoints
);

// GET /v1/patches/:id/endpoints - Get endpoints affected by this patch
router.get(
  '/:id/endpoints',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.getEndpoints
);

// GET /v1/patches/:id/recommendations - Get asset recommendations for this patch
router.get(
  '/:id/recommendations',
  authenticate,
  validateParams(patchIdParamSchema),
  async (req, res) => {
    const { listPatchRecommendations } = await import('./asset-patch-recommendation.controller');
    return listPatchRecommendations(req, res);
  }
);

// ============================================
// Supersedence Management
// ============================================

// GET /v1/patches/:id/superseded - Get patches superseded by this patch
router.get(
  '/:id/superseded',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.getSupersededPatches
);

// GET /v1/patches/:id/superseding - Get patches that supersede this patch
router.get(
  '/:id/superseding',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.getSupersedingPatches
);

// POST /v1/patches/:id/supersede/:targetId - Mark targetId as superseded by this patch
router.post(
  '/:id/supersede/:targetId',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.supersedePatch
);

// DELETE /v1/patches/:id/supersede/:targetId - Remove supersedence relationship
router.delete(
  '/:id/supersede/:targetId',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.removeSupersedence
);

// ============================================
// Test & Approve Workflow
// ============================================

// POST /v1/patches/:id/test - Mark patch as tested
router.post(
  '/:id/test',
  authenticate,
  validateParams(patchIdParamSchema),
  validateBody(testPatchSchema),
  controller.testPatch
);

// POST /v1/patches/:id/approve - Approve patch for deployment
router.post(
  '/:id/approve',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.approvePatch
);

// POST /v1/patches/:id/reject - Reject patch
router.post(
  '/:id/reject',
  authenticate,
  validateParams(patchIdParamSchema),
  validateBody(rejectPatchSchema),
  controller.rejectPatch
);

// ============================================
// Deployments Routes
// ============================================

const deploymentsRouter = Router();

// ============================================
// Software Deployment Routes (MUST be before /:id routes)
// ============================================

// GET /v1/deployments/software - List software deployments
deploymentsRouter.get(
  '/software',
  authenticate,
  deploymentController.listSoftwareDeployments.bind(deploymentController)
);

// POST /v1/deployments/software - Create software deployment
deploymentsRouter.post(
  '/software',
  authenticate,
  deploymentController.createSoftwareDeployment.bind(deploymentController)
);

// GET /v1/deployments/software/:deploymentId - Get software deployment status
deploymentsRouter.get(
  '/software/:deploymentId',
  authenticate,
  deploymentController.getSoftwareDeploymentStatus.bind(deploymentController)
);

// POST /v1/deployments/software/:deploymentId/cancel - Cancel software deployment
deploymentsRouter.post(
  '/software/:deploymentId/cancel',
  authenticate,
  deploymentController.cancelSoftwareDeployment.bind(deploymentController)
);

// POST /v1/deployments/software/:deploymentId/tasks/:taskId/rollback - Trigger rollback
deploymentsRouter.post(
  '/software/:deploymentId/tasks/:taskId/rollback',
  authenticate,
  deploymentController.triggerRollback.bind(deploymentController)
);

// ============================================
// Patch Deployment Routes
// ============================================

// POST /v1/deployments/patch - Create patch deployment from UI
deploymentsRouter.post(
  '/patch',
  authenticate,
  validateBody(createPatchDeploymentFromUISchema),
  controller.createPatchDeploymentFromUI
);

// GET /v1/deployments/patch - List patch deployments (via deployment executor)
deploymentsRouter.get(
  '/patch',
  authenticate,
  deploymentController.listPatchDeployments.bind(deploymentController)
);

// GET /v1/deployments/patch/:deploymentId - Get patch deployment status
deploymentsRouter.get(
  '/patch/:deploymentId',
  authenticate,
  deploymentController.getPatchDeploymentStatus.bind(deploymentController)
);

// POST /v1/deployments/patch/:deploymentId/cancel - Cancel patch deployment
deploymentsRouter.post(
  '/patch/:deploymentId/cancel',
  authenticate,
  deploymentController.cancelPatchDeployment.bind(deploymentController)
);

// POST /v1/deployments/patch/:deploymentId/retry - Retry a failed patch deployment
deploymentsRouter.post(
  '/patch/:deploymentId/retry',
  authenticate,
  deploymentController.retryPatchDeployment.bind(deploymentController)
);

// POST /v1/deployments/config - Create config deployment
deploymentsRouter.post(
  '/config',
  authenticate,
  deploymentController.createConfigDeployment.bind(deploymentController)
);

// GET /v1/deployments/config/:deploymentId - Get config deployment status
deploymentsRouter.get(
  '/config/:deploymentId',
  authenticate,
  deploymentController.getConfigDeploymentStatus.bind(deploymentController)
);

// GET /v1/deployments - List deployments
deploymentsRouter.get(
  '/',
  authenticate,
  validateQuery(deploymentListQuerySchema),
  controller.listDeployments
);

// POST /v1/deployments - Create deployment
deploymentsRouter.post(
  '/',
  authenticate,
  validateBody(createDeploymentSchema),
  controller.createDeployment
);

// GET /v1/deployments/:id - Get deployment by ID
deploymentsRouter.get(
  '/:id',
  authenticate,
  validateParams(deploymentIdParamSchema),
  controller.getDeployment
);

// PUT /v1/deployments/:id - Update deployment
deploymentsRouter.put(
  '/:id',
  authenticate,
  validateParams(deploymentIdParamSchema),
  controller.updateDeployment
);

// POST /v1/deployments/:id/cancel - Cancel deployment
deploymentsRouter.post(
  '/:id/cancel',
  authenticate,
  validateParams(deploymentIdParamSchema),
  controller.cancelDeployment
);

// DELETE /v1/deployments/:id - Delete deployment
deploymentsRouter.delete(
  '/:id',
  authenticate,
  validateParams(deploymentIdParamSchema),
  controller.deleteDeployment
);

// GET /v1/deployments/:id/preview - Get deployment preview
deploymentsRouter.get(
  '/:id/preview',
  authenticate,
  validateParams(deploymentIdParamSchema),
  controller.getDeploymentPreview
);

// POST /v1/deployments/:id/execute - Execute deployment
deploymentsRouter.post(
  '/:id/execute',
  authenticate,
  validateParams(deploymentIdParamSchema),
  controller.executeDeployment
);

// ============================================
// Patch Tests Routes
// ============================================

const patchTestsRouter = Router();

// GET /v1/patch-tests - List patch tests
patchTestsRouter.get(
  '/',
  authenticate,
  validateQuery(patchTestListQuerySchema),
  controller.listPatchTests
);

// POST /v1/patch-tests - Create patch test
patchTestsRouter.post(
  '/',
  authenticate,
  validateBody(createPatchTestSchema),
  controller.createPatchTest
);

// GET /v1/patch-tests/:id - Get patch test by ID
patchTestsRouter.get(
  '/:id',
  authenticate,
  validateParams(patchTestIdParamSchema),
  controller.getPatchTest
);

// PUT /v1/patch-tests/:id/approve - Approve patch test
patchTestsRouter.put(
  '/:id/approve',
  authenticate,
  validateParams(patchTestIdParamSchema),
  controller.approvePatchTest
);

// DELETE /v1/patch-tests/:id - Delete patch test
patchTestsRouter.delete(
  '/:id',
  authenticate,
  validateParams(patchTestIdParamSchema),
  controller.deletePatchTest
);

// ============================================
// Zero Touch Configs Routes
// ============================================

const zeroTouchConfigsRouter = Router();

// GET /v1/zero-touch-configs - List zero touch configs
zeroTouchConfigsRouter.get(
  '/',
  authenticate,
  validateQuery(zeroTouchConfigListQuerySchema),
  controller.listZeroTouchConfigs
);

// POST /v1/zero-touch-configs - Create zero touch config
zeroTouchConfigsRouter.post(
  '/',
  authenticate,
  validateBody(createZeroTouchConfigSchema),
  controller.createZeroTouchConfig
);

// GET /v1/zero-touch-configs/:id - Get zero touch config by ID
zeroTouchConfigsRouter.get(
  '/:id',
  authenticate,
  validateParams(zeroTouchConfigIdParamSchema),
  controller.getZeroTouchConfig
);

// PUT /v1/zero-touch-configs/:id - Update zero touch config
zeroTouchConfigsRouter.put(
  '/:id',
  authenticate,
  validateParams(zeroTouchConfigIdParamSchema),
  validateBody(updateZeroTouchConfigSchema),
  controller.updateZeroTouchConfig
);

// DELETE /v1/zero-touch-configs/:id - Delete zero touch config
zeroTouchConfigsRouter.delete(
  '/:id',
  authenticate,
  validateParams(zeroTouchConfigIdParamSchema),
  controller.deleteZeroTouchConfig
);

export { router as patchRoutes, deploymentsRouter as deploymentRoutes, patchTestsRouter as patchTestRoutes, zeroTouchConfigsRouter as zeroTouchConfigRoutes };
