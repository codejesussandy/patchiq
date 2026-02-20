import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
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
  createPatchTestSchema,
  patchTestIdParamSchema,
  patchTestListQuerySchema,
  createZeroTouchConfigSchema,
  updateZeroTouchConfigSchema,
  zeroTouchConfigIdParamSchema,
  zeroTouchConfigListQuerySchema,
  scanEndpointsSchema,
  addAffectedProductSchema,
} from './patches.validator';

const router = Router();

// ============================================
// Patches CRUD
// ============================================

// GET /v1/patches - List all patches with filtering and pagination
router.get(
  '/',
  authenticate,
  checkPermission('patches', 'view'),
  validateQuery(patchListQuerySchema),
  controller.listPatches
);

// GET /v1/patches/test-approve - List patches pending test/approval
router.get(
  '/test-approve',
  authenticate,
  checkPermission('patches', 'view'),
  validateQuery(testApproveQuerySchema),
  controller.getPatchesPendingTestApproval
);

// POST /v1/patches/discover - Run Hub-scoped patch discovery
router.post(
  '/discover',
  authenticate,
  checkPermission('patches', 'add'),
  audit({ action: AuditAction.SCAN, resource: AuditResource.PATCH }),
  controller.discoverPatches
);

// POST /v1/patches - Create a new patch
router.post(
  '/',
  authenticate,
  checkPermission('patches', 'add'),
  validateBody(createPatchSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.PATCH }),
  controller.createPatch
);

// GET /v1/patches/:id - Get patch by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getPatch
);

// PUT /v1/patches/:id - Update patch
router.put(
  '/:id',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  validateBody(updatePatchSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.updatePatch
);

// DELETE /v1/patches/:id - Delete patch
router.delete(
  '/:id',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.deletePatch
);

// ============================================
// Patch Related Data
// ============================================

// GET /v1/patches/:id/affected-softwares - Get affected products
router.get(
  '/:id/affected-softwares',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getAffectedProducts
);

// POST /v1/patches/:id/affected-softwares - Add affected product
router.post(
  '/:id/affected-softwares',
  authenticate,
  checkPermission('patches', 'add'),
  validateParams(patchIdParamSchema),
  validateBody(addAffectedProductSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.addAffectedProduct
);

// DELETE /v1/patches/:id/affected-softwares/:productId - Remove affected product
router.delete(
  '/:id/affected-softwares/:productId',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.removeAffectedProduct
);

// GET /v1/patches/:id/bundle/stream - Stream patch bundle (installer) from MinIO
router.get(
  '/:id/bundle/stream',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.streamPatchBundle
);

// GET /v1/patches/:id/vulnerabilities - Get related vulnerabilities
router.get(
  '/:id/vulnerabilities',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getVulnerabilities
);

// POST /v1/patches/:id/scan-endpoints - Scan endpoints for patch applicability
router.post(
  '/:id/scan-endpoints',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  validateBody(scanEndpointsSchema),
  audit({ action: AuditAction.SCAN, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.scanEndpoints
);

// GET /v1/patches/:id/endpoints - Get endpoints affected by this patch
router.get(
  '/:id/endpoints',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getEndpoints
);

// GET /v1/patches/:id/recommendations - Get asset recommendations for this patch
router.get(
  '/:id/recommendations',
  authenticate,
  checkPermission('patches', 'view'),
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
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getSupersededPatches
);

// GET /v1/patches/:id/superseding - Get patches that supersede this patch
router.get(
  '/:id/superseding',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchIdParamSchema),
  controller.getSupersedingPatches
);

// POST /v1/patches/:id/supersede/:targetId - Mark targetId as superseded by this patch
router.post(
  '/:id/supersede/:targetId',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.supersedePatch
);

// DELETE /v1/patches/:id/supersede/:targetId - Remove supersedence relationship
router.delete(
  '/:id/supersede/:targetId',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.removeSupersedence
);

// ============================================
// Test & Approve Workflow
// ============================================

// POST /v1/patches/:id/test - Mark patch as tested
router.post(
  '/:id/test',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  validateBody(testPatchSchema),
  audit({ action: AuditAction.TEST, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.testPatch
);

// POST /v1/patches/:id/approve - Approve patch for deployment
router.post(
  '/:id/approve',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  audit({ action: AuditAction.APPROVE, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.approvePatch
);

// POST /v1/patches/:id/reject - Reject patch
router.post(
  '/:id/reject',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchIdParamSchema),
  validateBody(rejectPatchSchema),
  audit({ action: AuditAction.REJECT, resource: AuditResource.PATCH, getResourceId: (req) => req.params.id }),
  controller.rejectPatch
);

// ============================================
// Patch Tests Routes
// ============================================

const patchTestsRouter = Router();

// GET /v1/patch-tests - List patch tests
patchTestsRouter.get(
  '/',
  authenticate,
  checkPermission('patches', 'view'),
  validateQuery(patchTestListQuerySchema),
  controller.listPatchTests
);

// POST /v1/patch-tests - Create patch test
patchTestsRouter.post(
  '/',
  authenticate,
  checkPermission('patches', 'add'),
  validateBody(createPatchTestSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.PATCH_TEST }),
  controller.createPatchTest
);

// GET /v1/patch-tests/:id - Get patch test by ID
patchTestsRouter.get(
  '/:id',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(patchTestIdParamSchema),
  controller.getPatchTest
);

// PUT /v1/patch-tests/:id/approve - Approve patch test
patchTestsRouter.put(
  '/:id/approve',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(patchTestIdParamSchema),
  audit({ action: AuditAction.APPROVE, resource: AuditResource.PATCH_TEST, getResourceId: (req) => req.params.id }),
  controller.approvePatchTest
);

// DELETE /v1/patch-tests/:id - Delete patch test
patchTestsRouter.delete(
  '/:id',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(patchTestIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.PATCH_TEST, getResourceId: (req) => req.params.id }),
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
  checkPermission('patches', 'view'),
  validateQuery(zeroTouchConfigListQuerySchema),
  controller.listZeroTouchConfigs
);

// POST /v1/zero-touch-configs - Create zero touch config
zeroTouchConfigsRouter.post(
  '/',
  authenticate,
  checkPermission('patches', 'add'),
  validateBody(createZeroTouchConfigSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.ZERO_TOUCH_CONFIG }),
  controller.createZeroTouchConfig
);

// GET /v1/zero-touch-configs/:id - Get zero touch config by ID
zeroTouchConfigsRouter.get(
  '/:id',
  authenticate,
  checkPermission('patches', 'view'),
  validateParams(zeroTouchConfigIdParamSchema),
  controller.getZeroTouchConfig
);

// PUT /v1/zero-touch-configs/:id - Update zero touch config
zeroTouchConfigsRouter.put(
  '/:id',
  authenticate,
  checkPermission('patches', 'edit'),
  validateParams(zeroTouchConfigIdParamSchema),
  validateBody(updateZeroTouchConfigSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.ZERO_TOUCH_CONFIG, getResourceId: (req) => req.params.id }),
  controller.updateZeroTouchConfig
);

// DELETE /v1/zero-touch-configs/:id - Delete zero touch config
zeroTouchConfigsRouter.delete(
  '/:id',
  authenticate,
  checkPermission('patches', 'delete'),
  validateParams(zeroTouchConfigIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.ZERO_TOUCH_CONFIG, getResourceId: (req) => req.params.id }),
  controller.deleteZeroTouchConfig
);

export { router as patchRoutes, patchTestsRouter as patchTestRoutes, zeroTouchConfigsRouter as zeroTouchConfigRoutes };
