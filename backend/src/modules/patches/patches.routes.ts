import { Router } from 'express';
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
  scanEndpointsSchema,
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

// GET /v1/patches/:id/file-details - Get file details
router.get(
  '/:id/file-details',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.getFileDetails
);

// GET /v1/patches/:id/vulnerabilities - Get related vulnerabilities
router.get(
  '/:id/vulnerabilities',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.getVulnerabilities
);

// GET /v1/patches/:id/endpoints - Get affected endpoints
router.get(
  '/:id/endpoints',
  authenticate,
  validateParams(patchIdParamSchema),
  controller.getEndpoints
);

// POST /v1/patches/:id/scan-endpoints - Scan endpoints for patch
router.post(
  '/:id/scan-endpoints',
  authenticate,
  validateParams(patchIdParamSchema),
  validateBody(scanEndpointsSchema),
  controller.scanEndpoints
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
