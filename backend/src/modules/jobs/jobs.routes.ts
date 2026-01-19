import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { validateBody, validateQuery, validateParams } from '@middleware/validation';
import * as controller from './jobs.controller';
import {
  idParamSchema,
  patchJobListQuerySchema,
  createPatchJobSchema,
  vulnerabilityJobListQuerySchema,
  createVulnerabilityJobSchema,
  updateVulnerabilityDBSyncSchema,
  softwareCatalogListQuerySchema,
  createSoftwareCatalogSchema,
  updateSoftwareCatalogSchema,
  softwareBundleListQuerySchema,
  createSoftwareBundleSchema,
  updateSoftwareBundleSchema,
  softwareDeploymentListQuerySchema,
  createSoftwareDeploymentSchema,
  configCatalogListQuerySchema,
  createConfigCatalogSchema,
  updateConfigCatalogSchema,
  configBundleListQuerySchema,
  createConfigBundleSchema,
  updateConfigBundleSchema,
  configDeploymentListQuerySchema,
  createConfigDeploymentSchema,
  deploymentPolicyListQuerySchema,
  createDeploymentPolicySchema,
  updateDeploymentPolicySchema,
} from './jobs.validators';

const router = Router();

// ============================================
// Patch Jobs Routes - /v1/jobs/patch
// ============================================

router.get(
  '/patch',
  authenticate,
  validateQuery(patchJobListQuerySchema),
  controller.listPatchJobs
);

router.post(
  '/patch',
  authenticate,
  validateBody(createPatchJobSchema),
  controller.createPatchJob
);

router.get(
  '/patch/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.getPatchJob
);

router.delete(
  '/patch/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.deletePatchJob
);

// ============================================
// Vulnerability Jobs Routes - /v1/jobs/vulnerability
// ============================================

router.get(
  '/vulnerability',
  authenticate,
  validateQuery(vulnerabilityJobListQuerySchema),
  controller.listVulnerabilityJobs
);

router.post(
  '/vulnerability',
  authenticate,
  validateBody(createVulnerabilityJobSchema),
  controller.createVulnerabilityJob
);

router.get(
  '/vulnerability/db-sync',
  authenticate,
  controller.getVulnerabilityDBSync
);

router.put(
  '/vulnerability/db-sync',
  authenticate,
  validateBody(updateVulnerabilityDBSyncSchema),
  controller.updateVulnerabilityDBSync
);

router.post(
  '/vulnerability/db-sync/now',
  authenticate,
  controller.triggerVulnerabilityDBSync
);

router.get(
  '/vulnerability/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.getVulnerabilityJob
);

router.delete(
  '/vulnerability/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.deleteVulnerabilityJob
);

// ============================================
// Software Catalog Routes - /v1/jobs/software/catalog
// ============================================

router.get(
  '/software/catalog',
  authenticate,
  validateQuery(softwareCatalogListQuerySchema),
  controller.listSoftwareCatalog
);

router.post(
  '/software/catalog',
  authenticate,
  validateBody(createSoftwareCatalogSchema),
  controller.createSoftwareCatalog
);

router.get(
  '/software/catalog/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.getSoftwareCatalog
);

router.put(
  '/software/catalog/:id',
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateSoftwareCatalogSchema),
  controller.updateSoftwareCatalog
);

router.delete(
  '/software/catalog/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.deleteSoftwareCatalog
);

// ============================================
// Software Bundle Routes - /v1/jobs/software/bundles
// ============================================

router.get(
  '/software/bundles',
  authenticate,
  validateQuery(softwareBundleListQuerySchema),
  controller.listSoftwareBundles
);

router.post(
  '/software/bundles',
  authenticate,
  validateBody(createSoftwareBundleSchema),
  controller.createSoftwareBundle
);

router.get(
  '/software/bundles/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.getSoftwareBundle
);

router.put(
  '/software/bundles/:id',
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateSoftwareBundleSchema),
  controller.updateSoftwareBundle
);

router.delete(
  '/software/bundles/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.deleteSoftwareBundle
);

// ============================================
// Software Deployment Routes - /v1/jobs/software/deployed
// ============================================

router.get(
  '/software/deployed',
  authenticate,
  validateQuery(softwareDeploymentListQuerySchema),
  controller.listSoftwareDeployments
);

router.post(
  '/software/deployed',
  authenticate,
  validateBody(createSoftwareDeploymentSchema),
  controller.createSoftwareDeployment
);

router.get(
  '/software/deployed/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.getSoftwareDeployment
);

router.get(
  '/software/deployed/:id/tasks',
  authenticate,
  validateParams(idParamSchema),
  controller.getSoftwareDeploymentTasks
);

router.delete(
  '/software/deployed/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.deleteSoftwareDeployment
);

// ============================================
// Configuration Catalog Routes - /v1/jobs/config/catalog
// ============================================

router.get(
  '/config/catalog',
  authenticate,
  validateQuery(configCatalogListQuerySchema),
  controller.listConfigCatalog
);

router.post(
  '/config/catalog',
  authenticate,
  validateBody(createConfigCatalogSchema),
  controller.createConfigCatalog
);

router.get(
  '/config/catalog/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.getConfigCatalog
);

router.put(
  '/config/catalog/:id',
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateConfigCatalogSchema),
  controller.updateConfigCatalog
);

router.delete(
  '/config/catalog/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.deleteConfigCatalog
);

// ============================================
// Configuration Bundle Routes - /v1/jobs/config/bundles
// ============================================

router.get(
  '/config/bundles',
  authenticate,
  validateQuery(configBundleListQuerySchema),
  controller.listConfigBundles
);

router.post(
  '/config/bundles',
  authenticate,
  validateBody(createConfigBundleSchema),
  controller.createConfigBundle
);

router.get(
  '/config/bundles/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.getConfigBundle
);

router.put(
  '/config/bundles/:id',
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateConfigBundleSchema),
  controller.updateConfigBundle
);

router.delete(
  '/config/bundles/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.deleteConfigBundle
);

// ============================================
// Configuration Deployment Routes - /v1/jobs/config/deployed
// ============================================

router.get(
  '/config/deployed',
  authenticate,
  validateQuery(configDeploymentListQuerySchema),
  controller.listConfigDeployments
);

router.post(
  '/config/deployed',
  authenticate,
  validateBody(createConfigDeploymentSchema),
  controller.createConfigDeployment
);

router.get(
  '/config/deployed/:id/tasks',
  authenticate,
  validateParams(idParamSchema),
  controller.getConfigDeploymentTasks
);

router.delete(
  '/config/deployed/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.deleteConfigDeployment
);

// ============================================
// Deployment Policies Router - /v1/deployment-policies
// ============================================

const deploymentPoliciesRouter = Router();

deploymentPoliciesRouter.get(
  '/',
  authenticate,
  validateQuery(deploymentPolicyListQuerySchema),
  controller.listDeploymentPolicies
);

deploymentPoliciesRouter.post(
  '/',
  authenticate,
  validateBody(createDeploymentPolicySchema),
  controller.createDeploymentPolicy
);

deploymentPoliciesRouter.get(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.getDeploymentPolicy
);

deploymentPoliciesRouter.put(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateDeploymentPolicySchema),
  controller.updateDeploymentPolicy
);

deploymentPoliciesRouter.delete(
  '/:id',
  authenticate,
  validateParams(idParamSchema),
  controller.deleteDeploymentPolicy
);

export { router as jobsRoutes, deploymentPoliciesRouter as deploymentPoliciesRoutes };
