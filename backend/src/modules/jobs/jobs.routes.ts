import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody, validateQuery, validateParams } from '@middleware/validation';
import * as controller from './jobs.controller';
import {
  idParamSchema,
  idOrPolicyIdParamSchema,
  patchJobListQuerySchema,
  createPatchJobSchema,
  vulnerabilityJobListQuerySchema,
  createVulnerabilityJobSchema,
  updateVulnerabilityDBSyncSchema,
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
  checkPermission('jobs', 'view'),
  validateQuery(patchJobListQuerySchema),
  controller.listPatchJobs
);

router.post(
  '/patch',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createPatchJobSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.JOB }),
  controller.createPatchJob
);

router.get(
  '/patch/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getPatchJob
);

router.delete(
  '/patch/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.deletePatchJob
);

// ============================================
// Vulnerability Jobs Routes - /v1/jobs/vulnerability
// ============================================

router.get(
  '/vulnerability',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(vulnerabilityJobListQuerySchema),
  controller.listVulnerabilityJobs
);

router.post(
  '/vulnerability',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createVulnerabilityJobSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.JOB }),
  controller.createVulnerabilityJob
);

router.get(
  '/vulnerability/db-sync',
  authenticate,
  checkPermission('jobs', 'view'),
  controller.getVulnerabilityDBSync
);

router.put(
  '/vulnerability/db-sync',
  authenticate,
  checkPermission('jobs', 'edit'),
  validateBody(updateVulnerabilityDBSyncSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.JOB }),
  controller.updateVulnerabilityDBSync
);

router.post(
  '/vulnerability/db-sync/now',
  authenticate,
  checkPermission('jobs', 'edit'),
  audit({ action: AuditAction.SYNC, resource: AuditResource.JOB }),
  controller.triggerVulnerabilityDBSync
);

router.get(
  '/vulnerability/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getVulnerabilityJob
);

router.delete(
  '/vulnerability/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.deleteVulnerabilityJob
);

// ============================================
// Software Deployment Routes - /v1/jobs/software/deployed
// ============================================

router.get(
  '/software/deployed',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(softwareDeploymentListQuerySchema),
  controller.listSoftwareDeployments
);

router.post(
  '/software/deployed',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createSoftwareDeploymentSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT }),
  controller.createSoftwareDeployment
);

router.get(
  '/software/deployed/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getSoftwareDeployment
);

router.get(
  '/software/deployed/:id/tasks',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getSoftwareDeploymentTasks
);

router.delete(
  '/software/deployed/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  controller.deleteSoftwareDeployment
);

// ============================================
// Configuration Catalog Routes - /v1/jobs/config/catalog
// ============================================

router.get(
  '/config/catalog',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(configCatalogListQuerySchema),
  controller.listConfigCatalog
);

router.post(
  '/config/catalog',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createConfigCatalogSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.JOB }),
  controller.createConfigCatalog
);

router.get(
  '/config/catalog/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getConfigCatalog
);

router.put(
  '/config/catalog/:id',
  authenticate,
  checkPermission('jobs', 'edit'),
  validateParams(idParamSchema),
  validateBody(updateConfigCatalogSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.updateConfigCatalog
);

router.delete(
  '/config/catalog/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.deleteConfigCatalog
);

// ============================================
// Configuration Bundle Routes - /v1/jobs/config/bundles
// ============================================

router.get(
  '/config/bundles',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(configBundleListQuerySchema),
  controller.listConfigBundles
);

router.post(
  '/config/bundles',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createConfigBundleSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.JOB }),
  controller.createConfigBundle
);

router.get(
  '/config/bundles/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getConfigBundle
);

router.put(
  '/config/bundles/:id',
  authenticate,
  checkPermission('jobs', 'edit'),
  validateParams(idParamSchema),
  validateBody(updateConfigBundleSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.updateConfigBundle
);

router.delete(
  '/config/bundles/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.JOB, getResourceId: (req) => req.params.id }),
  controller.deleteConfigBundle
);

// ============================================
// Configuration Deployment Routes - /v1/jobs/config/deployed
// ============================================

router.get(
  '/config/deployed',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(configDeploymentListQuerySchema),
  controller.listConfigDeployments
);

router.post(
  '/config/deployed',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createConfigDeploymentSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT }),
  controller.createConfigDeployment
);

router.get(
  '/config/deployed/:id/tasks',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idParamSchema),
  controller.getConfigDeploymentTasks
);

router.delete(
  '/config/deployed/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT, getResourceId: (req) => req.params.id }),
  controller.deleteConfigDeployment
);

// ============================================
// Deployment Policies Router - /v1/deployment-policies
// ============================================

const deploymentPoliciesRouter = Router();

deploymentPoliciesRouter.get(
  '/',
  authenticate,
  checkPermission('jobs', 'view'),
  validateQuery(deploymentPolicyListQuerySchema),
  controller.listDeploymentPolicies
);

deploymentPoliciesRouter.post(
  '/',
  authenticate,
  checkPermission('jobs', 'add'),
  validateBody(createDeploymentPolicySchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT_POLICY }),
  controller.createDeploymentPolicy
);

deploymentPoliciesRouter.get(
  '/:id',
  authenticate,
  checkPermission('jobs', 'view'),
  validateParams(idOrPolicyIdParamSchema),
  controller.getDeploymentPolicy
);

deploymentPoliciesRouter.put(
  '/:id',
  authenticate,
  checkPermission('jobs', 'edit'),
  validateParams(idOrPolicyIdParamSchema),
  validateBody(updateDeploymentPolicySchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.DEPLOYMENT_POLICY, getResourceId: (req) => req.params.id }),
  controller.updateDeploymentPolicy
);

deploymentPoliciesRouter.delete(
  '/:id',
  authenticate,
  checkPermission('jobs', 'delete'),
  validateParams(idOrPolicyIdParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT_POLICY, getResourceId: (req) => req.params.id }),
  controller.deleteDeploymentPolicy
);

export { router as jobsRoutes, deploymentPoliciesRouter as deploymentPoliciesRoutes };
