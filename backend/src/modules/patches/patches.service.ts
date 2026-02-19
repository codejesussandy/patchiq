// Barrel re-export — preserves all existing import paths
export {
  listPatches,
  getPatchById,
  getPatchBundleByPatchId,
  createPatch,
  updatePatch,
  deletePatch,
  supersedePatch,
  removeSupersedence,
  getSupersededPatches,
  getSupersedingPatches,
  getAffectedProducts,
  addAffectedProduct,
  removeAffectedProduct,
} from './patches-crud.service';

export {
  getPatchesPendingTestApproval,
  testPatch,
  approvePatch,
  rejectPatch,
} from './patches-approval.service';

export {
  listDeployments,
  getDeploymentById,
  createDeployment,
  deleteDeployment,
  updateDeployment,
  cancelDeployment,
  getDeploymentPreview,
  executeDeployment,
  createPatchDeploymentFromUI,
} from './patches-deployments.service';

export {
  listPatchTests,
  getPatchTestById,
  createPatchTest,
  approvePatchTest,
  deletePatchTest,
} from './patches-tests.service';

export {
  listZeroTouchConfigs,
  getZeroTouchConfigById,
  createZeroTouchConfig,
  updateZeroTouchConfig,
  deleteZeroTouchConfig,
  evaluateZeroTouchRules,
} from './patches-zero-touch.service';

export {
  autoCorrelateCves,
  generateRecommendationsForPatchCves,
  checkPatchApplicabilityForAsset,
  getVulnerabilities,
  getEndpoints,
  scanEndpoints,
} from './patches-cve.service';

export {
  autoGeneratePatchBundle,
  autoQueueDownload,
} from './patches-bundle.service';
