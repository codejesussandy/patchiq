import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody, validateParams, validateQuery } from '@middleware/validation';
import { settingsController } from './settings.controller';

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size for logos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, GIF, and SVG are allowed.'));
    }
  },
});
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  createBranchSchema,
  updateBranchSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createLocationSchema,
  updateLocationSchema,
  createUserSchema,
  updateUserSchema,
  inviteUserSchema,
  createRoleSchema,
  updateRoleSchema,
  createAlertConfigSchema,
  updateAlertConfigSchema,
  createLdapConfigSchema,
  updateLdapConfigSchema,
  updateServerSettingsSchema,
  updateAgentConfigSchema,
  updateProxyServerSchema,
  testProxyServerSchema,
  updateMailServerSchema,
  testMailServerSchema,
  updateLicenseSchema,
  updateVulnerabilityPreferenceSchema,
  updateRiskScoreSettingsSchema,
  updateRemoteDesktopSchema,
  queryDistributionServersSchema,
  createDistributionServerSchema,
  updateDistributionServerSchema,
  idParamSchema,
  stringIdParamSchema,
  ldapConfigParamSchema,
  listOrganizationsQuerySchema,
  listBranchesQuerySchema,
  listDepartmentsQuerySchema,
  userListQuerySchema,
  auditLogQuerySchema,
  createGroupMappingSchema,
  updateGroupMappingSchema,
  createEnrollSecretSchema,
  updateEnrollSecretSchema,
  updateAgentApprovalSettingsSchema,
  createRedHatNominationSchema,
  updateRedHatNominationSchema,
  createComputerGroupSchema,
  updateComputerGroupSchema,
  computerGroupListQuerySchema,
  updatePatchPreferenceSchema,
  createSettingsDeploymentPolicySchema,
  updateSettingsDeploymentPolicySchema,
  deploymentPolicyListQuerySchema,
  createIntegrationSchema,
  updateIntegrationSchema,
  toggleIntegrationStatusSchema,
  listIntegrationsQuerySchema,
  bulkImportSchema,
  bulkUserActionSchema,
} from './settings.validators';

const router = Router();

// Multer error handler middleware — converts multer errors to 400 responses
function handleMulterError(err: Error, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 5MB limit' } });
      return;
    }
    res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message: err.message } });
    return;
  }
  if (err.message?.includes('Invalid file type')) {
    res.status(400).json({ success: false, error: { code: 'INVALID_FILE_TYPE', message: err.message } });
    return;
  }
  next(err);
}

// All settings routes require authentication
router.use(authenticate);

// ============================================
// Organizations
// ============================================
/**
 * @openapi
 * /v1/settings/org-tree:
 *   get:
 *     summary: Get organization tree
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization tree retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/org-tree', checkPermission('settings', 'view'), settingsController.getOrgTree.bind(settingsController));
/**
 * @openapi
 * /v1/settings/organizations/{id}/delete-impact:
 *   get:
 *     summary: Get delete impact for an organization
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Delete impact retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */
router.get('/organizations/:id/delete-impact', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getOrganizationDeleteImpact.bind(settingsController));
/**
 * @openapi
 * /v1/settings/organizations:
 *   get:
 *     summary: List organizations
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: List of organizations
 *       401:
 *         description: Unauthorized
 */
router.get('/organizations', checkPermission('settings', 'view'), validateQuery(listOrganizationsQuerySchema), settingsController.listOrganizations.bind(settingsController));
/**
 * @openapi
 * /v1/settings/organizations/{id}:
 *   get:
 *     summary: Get an organization by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */
router.get('/organizations/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getOrganization.bind(settingsController));
/**
 * @openapi
 * /v1/settings/organizations:
 *   post:
 *     summary: Create an organization
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/organizations', checkPermission('settings', 'add'), validateBody(createOrganizationSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ORGANIZATION }), settingsController.createOrganization.bind(settingsController));
/**
 * @openapi
 * /v1/settings/organizations/{id}:
 *   put:
 *     summary: Update an organization
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */
router.put('/organizations/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateOrganizationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ORGANIZATION, getResourceId: (req) => req.params.id }), settingsController.updateOrganization.bind(settingsController));
/**
 * @openapi
 * /v1/settings/organizations/{id}:
 *   delete:
 *     summary: Delete an organization
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */
router.delete('/organizations/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ORGANIZATION, getResourceId: (req) => req.params.id }), settingsController.deleteOrganization.bind(settingsController));

// ============================================
// Branches
// ============================================
/**
 * @openapi
 * /v1/settings/branches/{id}/delete-impact:
 *   get:
 *     summary: Get delete impact for a branch
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Delete impact retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 */
router.get('/branches/:id/delete-impact', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getBranchDeleteImpact.bind(settingsController));
/**
 * @openapi
 * /v1/settings/branches:
 *   get:
 *     summary: List branches
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of branches
 *       401:
 *         description: Unauthorized
 */
router.get('/branches', checkPermission('settings', 'view'), validateQuery(listBranchesQuerySchema), settingsController.listBranches.bind(settingsController));
/**
 * @openapi
 * /v1/settings/branches/{id}:
 *   get:
 *     summary: Get a branch by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 */
router.get('/branches/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getBranch.bind(settingsController));
/**
 * @openapi
 * /v1/settings/branches:
 *   post:
 *     summary: Create a branch
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               organizationId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Branch created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/branches', checkPermission('settings', 'add'), validateBody(createBranchSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.BRANCH }), settingsController.createBranch.bind(settingsController));
/**
 * @openapi
 * /v1/settings/branches/{id}:
 *   put:
 *     summary: Update a branch
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Branch updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 */
router.put('/branches/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateBranchSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.BRANCH, getResourceId: (req) => req.params.id }), settingsController.updateBranch.bind(settingsController));
/**
 * @openapi
 * /v1/settings/branches/{id}:
 *   delete:
 *     summary: Delete a branch
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 */
router.delete('/branches/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.BRANCH, getResourceId: (req) => req.params.id }), settingsController.deleteBranch.bind(settingsController));

// ============================================
// Departments
// ============================================
/**
 * @openapi
 * /v1/settings/departments/{id}/delete-impact:
 *   get:
 *     summary: Get delete impact for a department
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Delete impact retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Department not found
 */
router.get('/departments/:id/delete-impact', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getDepartmentDeleteImpact.bind(settingsController));
/**
 * @openapi
 * /v1/settings/departments:
 *   get:
 *     summary: List departments
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of departments
 *       401:
 *         description: Unauthorized
 */
router.get('/departments', checkPermission('settings', 'view'), validateQuery(listDepartmentsQuerySchema), settingsController.listDepartments.bind(settingsController));
/**
 * @openapi
 * /v1/settings/departments/{id}:
 *   get:
 *     summary: Get a department by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Department not found
 */
router.get('/departments/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getDepartment.bind(settingsController));
/**
 * @openapi
 * /v1/settings/departments:
 *   post:
 *     summary: Create a department
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               organizationId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Department created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/departments', checkPermission('settings', 'add'), validateBody(createDepartmentSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.DEPARTMENT }), settingsController.createDepartment.bind(settingsController));
/**
 * @openapi
 * /v1/settings/departments/{id}:
 *   put:
 *     summary: Update a department
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Department not found
 */
router.put('/departments/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateDepartmentSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.DEPARTMENT, getResourceId: (req) => req.params.id }), settingsController.updateDepartment.bind(settingsController));
/**
 * @openapi
 * /v1/settings/departments/{id}:
 *   delete:
 *     summary: Delete a department
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Department not found
 */
router.delete('/departments/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.DEPARTMENT, getResourceId: (req) => req.params.id }), settingsController.deleteDepartment.bind(settingsController));

// ============================================
// Locations
// ============================================
/**
 * @openapi
 * /v1/settings/locations/{id}/delete-impact:
 *   get:
 *     summary: Get delete impact for a location
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Delete impact retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Location not found
 */
router.get('/locations/:id/delete-impact', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getLocationDeleteImpact.bind(settingsController));
/**
 * @openapi
 * /v1/settings/locations:
 *   get:
 *     summary: List locations
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of locations
 *       401:
 *         description: Unauthorized
 */
router.get('/locations', checkPermission('settings', 'view'), validateQuery(listOrganizationsQuerySchema), settingsController.listLocations.bind(settingsController));
/**
 * @openapi
 * /v1/settings/locations/{id}:
 *   get:
 *     summary: Get a location by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Location retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Location not found
 */
router.get('/locations/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getLocation.bind(settingsController));
/**
 * @openapi
 * /v1/settings/locations:
 *   post:
 *     summary: Create a location
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               organizationId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Location created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/locations', checkPermission('settings', 'add'), validateBody(createLocationSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.LOCATION }), settingsController.createLocation.bind(settingsController));
/**
 * @openapi
 * /v1/settings/locations/{id}:
 *   put:
 *     summary: Update a location
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Location not found
 */
router.put('/locations/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateLocationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.LOCATION, getResourceId: (req) => req.params.id }), settingsController.updateLocation.bind(settingsController));
/**
 * @openapi
 * /v1/settings/locations/{id}:
 *   delete:
 *     summary: Delete a location
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Location deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Location not found
 */
router.delete('/locations/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.LOCATION, getResourceId: (req) => req.params.id }), settingsController.deleteLocation.bind(settingsController));

// ============================================
// Users
// ============================================
/**
 * @openapi
 * /v1/settings/users:
 *   get:
 *     summary: List users
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 */
router.get('/users', checkPermission('settings', 'view'), validateQuery(userListQuerySchema), settingsController.listUsers.bind(settingsController));
// R5: Bulk import routes (must come BEFORE /users/:id to avoid :id capturing "import")
/**
 * @openapi
 * /v1/settings/users/import:
 *   post:
 *     summary: Bulk import users
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Users imported successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/users/import', checkPermission('settings', 'add'), validateBody(bulkImportSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.USER }), settingsController.bulkImportUsers.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/import/template:
 *   get:
 *     summary: Get import template for bulk user import
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Import template file
 *       401:
 *         description: Unauthorized
 */
router.get('/users/import/template', checkPermission('settings', 'view'), settingsController.getImportTemplate.bind(settingsController));
// R6: Bulk action routes (must come BEFORE /users/:id)
/**
 * @openapi
 * /v1/settings/users/bulk-suspend:
 *   post:
 *     summary: Bulk suspend users
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Users suspended successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/users/bulk-suspend', checkPermission('settings', 'edit'), validateBody(bulkUserActionSchema), audit({ action: AuditAction.SUSPEND, resource: AuditResource.USER }), settingsController.bulkSuspendUsers.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/bulk-activate:
 *   post:
 *     summary: Bulk activate users
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Users activated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/users/bulk-activate', checkPermission('settings', 'edit'), validateBody(bulkUserActionSchema), audit({ action: AuditAction.ACTIVATE, resource: AuditResource.USER }), settingsController.bulkActivateUsers.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/bulk-delete:
 *   post:
 *     summary: Bulk delete users
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Users deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/users/bulk-delete', checkPermission('settings', 'delete'), validateBody(bulkUserActionSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.USER }), settingsController.bulkDeleteUsers.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/users/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getUser.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users:
 *   post:
 *     summary: Create a user
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               roleId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/users', checkPermission('settings', 'add'), validateBody(createUserSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.USER }), settingsController.createUser.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               roleId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put('/users/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateUserSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.updateUser.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.deleteUser.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/invite:
 *   post:
 *     summary: Invite a user
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               roleId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: User invited successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/users/invite', checkPermission('settings', 'add'), validateBody(inviteUserSchema), audit({ action: AuditAction.INVITE, resource: AuditResource.USER }), settingsController.inviteUser.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/{id}/suspend:
 *   post:
 *     summary: Suspend a user
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User suspended successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post('/users/:id/suspend', checkPermission('settings', 'edit'), validateParams(idParamSchema), audit({ action: AuditAction.SUSPEND, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.suspendUser.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/{id}/activate:
 *   post:
 *     summary: Activate a user
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User activated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post('/users/:id/activate', checkPermission('settings', 'edit'), validateParams(idParamSchema), audit({ action: AuditAction.ACTIVATE, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.activateUser.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/{id}/reset-password:
 *   post:
 *     summary: Reset a user's password
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Password reset initiated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post('/users/:id/reset-password', checkPermission('settings', 'edit'), validateParams(idParamSchema), audit({ action: AuditAction.PASSWORD_RESET_REQUEST, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.resetPassword.bind(settingsController));
/**
 * @openapi
 * /v1/settings/users/{id}/audit-log:
 *   get:
 *     summary: Get audit log for a user
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User audit log retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/users/:id/audit-log', checkPermission('settings', 'view'), validateParams(idParamSchema), validateQuery(auditLogQuerySchema), settingsController.getUserAuditLog.bind(settingsController));

// ============================================
// Roles
// ============================================
/**
 * @openapi
 * /v1/settings/roles:
 *   get:
 *     summary: List roles
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *       401:
 *         description: Unauthorized
 */
router.get('/roles', checkPermission('settings', 'view'), settingsController.listRoles.bind(settingsController));
/**
 * @openapi
 * /v1/settings/roles/{id}:
 *   get:
 *     summary: Get a role by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Role not found
 */
router.get('/roles/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getRole.bind(settingsController));
/**
 * @openapi
 * /v1/settings/roles:
 *   post:
 *     summary: Create a role
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/roles', checkPermission('settings', 'add'), validateBody(createRoleSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ROLE }), settingsController.createRole.bind(settingsController));
/**
 * @openapi
 * /v1/settings/roles/{id}:
 *   put:
 *     summary: Update a role
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Role not found
 */
router.put('/roles/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateRoleSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ROLE, getResourceId: (req) => req.params.id }), settingsController.updateRole.bind(settingsController));
/**
 * @openapi
 * /v1/settings/roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Role not found
 */
router.delete('/roles/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ROLE, getResourceId: (req) => req.params.id }), settingsController.deleteRole.bind(settingsController));

// ============================================
// Alert Configurations
// ============================================
/**
 * @openapi
 * /v1/settings/alerts:
 *   get:
 *     summary: List alert configurations
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of alert configurations
 *       401:
 *         description: Unauthorized
 */
router.get('/alerts', checkPermission('settings', 'view'), settingsController.listAlertConfigs.bind(settingsController));
/**
 * @openapi
 * /v1/settings/alerts:
 *   post:
 *     summary: Create an alert configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Alert configuration created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/alerts', checkPermission('settings', 'add'), validateBody(createAlertConfigSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ALERT_CONFIG }), settingsController.createAlertConfig.bind(settingsController));
/**
 * @openapi
 * /v1/settings/alerts/{id}:
 *   get:
 *     summary: Get an alert configuration by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Alert configuration ID
 *     responses:
 *       200:
 *         description: Alert configuration retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert configuration not found
 */
router.get('/alerts/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getAlertConfig.bind(settingsController));
/**
 * @openapi
 * /v1/settings/alerts/{id}:
 *   put:
 *     summary: Update an alert configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Alert configuration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Alert configuration updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert configuration not found
 */
router.put('/alerts/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateAlertConfigSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ALERT_CONFIG, getResourceId: (req) => req.params.id }), settingsController.updateAlertConfig.bind(settingsController));
/**
 * @openapi
 * /v1/settings/alerts/{id}:
 *   delete:
 *     summary: Delete an alert configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Alert configuration ID
 *     responses:
 *       200:
 *         description: Alert configuration deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert configuration not found
 */
router.delete('/alerts/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ALERT_CONFIG, getResourceId: (req) => req.params.id }), settingsController.deleteAlertConfig.bind(settingsController));

// ============================================
// LDAP Configurations
// ============================================
/**
 * @openapi
 * /v1/settings/ldap-configs:
 *   get:
 *     summary: List LDAP configurations
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of LDAP configurations
 *       401:
 *         description: Unauthorized
 */
router.get('/ldap-configs', checkPermission('settings', 'view'), settingsController.listLdapConfigs.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}:
 *   get:
 *     summary: Get an LDAP configuration by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *     responses:
 *       200:
 *         description: LDAP configuration retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: LDAP configuration not found
 */
router.get('/ldap-configs/:id', checkPermission('settings', 'view'), validateParams(ldapConfigParamSchema), settingsController.getLdapConfig.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs:
 *   post:
 *     summary: Create an LDAP configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               bindDn:
 *                 type: string
 *     responses:
 *       201:
 *         description: LDAP configuration created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/ldap-configs', checkPermission('settings', 'add'), validateBody(createLdapConfigSchema), settingsController.createLdapConfig.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}:
 *   put:
 *     summary: Update an LDAP configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: LDAP configuration updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: LDAP configuration not found
 */
router.put('/ldap-configs/:id', checkPermission('settings', 'edit'), validateParams(ldapConfigParamSchema), validateBody(updateLdapConfigSchema), settingsController.updateLdapConfig.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}:
 *   delete:
 *     summary: Delete an LDAP configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *     responses:
 *       200:
 *         description: LDAP configuration deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: LDAP configuration not found
 */
router.delete('/ldap-configs/:id', checkPermission('settings', 'delete'), validateParams(ldapConfigParamSchema), settingsController.deleteLdapConfig.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}/test:
 *   post:
 *     summary: Test an LDAP configuration connection
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *     responses:
 *       200:
 *         description: LDAP connection test result
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: LDAP configuration not found
 */
router.post('/ldap-configs/:id/test', checkPermission('settings', 'edit'), validateParams(ldapConfigParamSchema), settingsController.testLdapConfig.bind(settingsController));

// ============================================
// LDAP Group Mappings
// ============================================
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}/group-mappings:
 *   get:
 *     summary: List group mappings for an LDAP configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *     responses:
 *       200:
 *         description: List of group mappings
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: LDAP configuration not found
 */
router.get('/ldap-configs/:id/group-mappings', checkPermission('settings', 'view'), validateParams(ldapConfigParamSchema), settingsController.listGroupMappings.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}/group-mappings:
 *   post:
 *     summary: Create a group mapping for an LDAP configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ldapGroup:
 *                 type: string
 *               roleId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Group mapping created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/ldap-configs/:id/group-mappings', checkPermission('settings', 'add'), validateParams(ldapConfigParamSchema), validateBody(createGroupMappingSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.GROUP_MAPPING, getResourceId: (req) => req.params.id }), settingsController.createGroupMapping.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}/group-mappings/{mapId}:
 *   put:
 *     summary: Update a group mapping
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *       - in: path
 *         name: mapId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group mapping ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Group mapping updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group mapping not found
 */
router.put('/ldap-configs/:id/group-mappings/:mapId', checkPermission('settings', 'edit'), validateBody(updateGroupMappingSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.GROUP_MAPPING, getResourceId: (req) => req.params.mapId }), settingsController.updateGroupMapping.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}/group-mappings/{mapId}:
 *   delete:
 *     summary: Delete a group mapping
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *       - in: path
 *         name: mapId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group mapping ID
 *     responses:
 *       200:
 *         description: Group mapping deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group mapping not found
 */
router.delete('/ldap-configs/:id/group-mappings/:mapId', checkPermission('settings', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.GROUP_MAPPING, getResourceId: (req) => req.params.mapId }), settingsController.deleteGroupMapping.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}/discover-groups:
 *   post:
 *     summary: Discover LDAP groups for a configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *     responses:
 *       200:
 *         description: Discovered LDAP groups
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: LDAP configuration not found
 */
router.post('/ldap-configs/:id/discover-groups', checkPermission('settings', 'view'), validateParams(ldapConfigParamSchema), settingsController.discoverGroups.bind(settingsController));

// ============================================
// LDAP Sync
// ============================================
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}/sync:
 *   post:
 *     summary: Trigger an LDAP sync
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *     responses:
 *       200:
 *         description: LDAP sync triggered successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: LDAP configuration not found
 */
router.post('/ldap-configs/:id/sync', checkPermission('settings', 'edit'), validateParams(ldapConfigParamSchema), settingsController.triggerSync.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}/sync-jobs:
 *   get:
 *     summary: List sync jobs for an LDAP configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *     responses:
 *       200:
 *         description: List of sync jobs
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: LDAP configuration not found
 */
router.get('/ldap-configs/:id/sync-jobs', checkPermission('settings', 'view'), validateParams(ldapConfigParamSchema), settingsController.listSyncJobs.bind(settingsController));
/**
 * @openapi
 * /v1/settings/ldap-configs/{id}/sync-jobs/{jobId}:
 *   get:
 *     summary: Get a specific LDAP sync job
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: LDAP configuration ID
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sync job ID
 *     responses:
 *       200:
 *         description: Sync job retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sync job not found
 */
router.get('/ldap-configs/:id/sync-jobs/:jobId', checkPermission('settings', 'view'), settingsController.getSyncJob.bind(settingsController));

// ============================================
// Password Policy
// ============================================
/**
 * @openapi
 * /v1/settings/password-policy:
 *   get:
 *     summary: Get password policy
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password policy retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/password-policy', checkPermission('settings', 'view'), settingsController.getPasswordPolicy.bind(settingsController));
/**
 * @openapi
 * /v1/settings/password-policy:
 *   put:
 *     summary: Update password policy
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               minLength:
 *                 type: integer
 *               requireUppercase:
 *                 type: boolean
 *               requireNumbers:
 *                 type: boolean
 *               requireSpecialChars:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Password policy updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/password-policy', checkPermission('settings', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.PASSWORD_POLICY }), settingsController.updatePasswordPolicy.bind(settingsController));

// ============================================
// Server Settings (singleton)
// ============================================
/**
 * @openapi
 * /v1/settings/server:
 *   get:
 *     summary: Get server settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Server settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/server', checkPermission('settings', 'view'), settingsController.getServerSettings.bind(settingsController));
/**
 * @openapi
 * /v1/settings/server:
 *   put:
 *     summary: Update server settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Server settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/server', checkPermission('settings', 'edit'), validateBody(updateServerSettingsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.SERVER_SETTINGS }), settingsController.updateServerSettings.bind(settingsController));

// ============================================
// Agent Configuration (singleton)
// ============================================
/**
 * @openapi
 * /v1/settings/agent-configuration:
 *   get:
 *     summary: Get agent configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agent configuration retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/agent-configuration', checkPermission('settings', 'view'), settingsController.getAgentConfig.bind(settingsController));
/**
 * @openapi
 * /v1/settings/agent-configuration:
 *   put:
 *     summary: Update agent configuration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Agent configuration updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/agent-configuration', checkPermission('settings', 'edit'), validateBody(updateAgentConfigSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.AGENT_CONFIG }), settingsController.updateAgentConfig.bind(settingsController));
/**
 * @openapi
 * /v1/settings/agent-configuration/reset:
 *   post:
 *     summary: Reset agent configuration to defaults
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agent configuration reset successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/agent-configuration/reset', checkPermission('settings', 'edit'), audit({ action: AuditAction.DELETE, resource: AuditResource.AGENT_CONFIG }), settingsController.resetAgentConfig.bind(settingsController));

// ============================================
// Agent Approvals — Pipeline 2E R2
// ============================================
/**
 * @openapi
 * /v1/settings/agent-approvals:
 *   get:
 *     summary: List pending agent approvals
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of agent approvals
 *       401:
 *         description: Unauthorized
 */
router.get('/agent-approvals', checkPermission('settings', 'view'), validateQuery(listOrganizationsQuerySchema), settingsController.listAgentApprovals.bind(settingsController));
/**
 * @openapi
 * /v1/settings/agent-approvals/{id}/approve:
 *   post:
 *     summary: Approve an agent
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Agent approval ID
 *     responses:
 *       200:
 *         description: Agent approved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent approval not found
 */
router.post('/agent-approvals/:id/approve', checkPermission('settings', 'edit'), validateParams(idParamSchema), audit({ action: AuditAction.APPROVE, resource: AuditResource.AGENT_APPROVAL, getResourceId: (req) => req.params.id }), settingsController.approveAgent.bind(settingsController));
/**
 * @openapi
 * /v1/settings/agent-approvals/{id}/reject:
 *   post:
 *     summary: Reject an agent
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Agent approval ID
 *     responses:
 *       200:
 *         description: Agent rejected successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent approval not found
 */
router.post('/agent-approvals/:id/reject', checkPermission('settings', 'edit'), validateParams(idParamSchema), audit({ action: AuditAction.REJECT, resource: AuditResource.AGENT_APPROVAL, getResourceId: (req) => req.params.id }), settingsController.rejectAgent.bind(settingsController));

// ============================================
// Agent Approval Settings (singleton) — Pipeline 2E R2
// ============================================
/**
 * @openapi
 * /v1/settings/agent-approval-settings:
 *   get:
 *     summary: Get agent approval settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agent approval settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/agent-approval-settings', checkPermission('settings', 'view'), settingsController.getAgentApprovalSettings.bind(settingsController));
/**
 * @openapi
 * /v1/settings/agent-approval-settings:
 *   put:
 *     summary: Update agent approval settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Agent approval settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/agent-approval-settings', checkPermission('settings', 'edit'), validateBody(updateAgentApprovalSettingsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.AGENT_APPROVAL_SETTINGS }), settingsController.updateAgentApprovalSettings.bind(settingsController));

// ============================================
// Enroll Secrets — Pipeline 2E R1
// ============================================
/**
 * @openapi
 * /v1/settings/enroll-secrets:
 *   get:
 *     summary: List enroll secrets
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of enroll secrets
 *       401:
 *         description: Unauthorized
 */
router.get('/enroll-secrets', checkPermission('settings', 'view'), settingsController.listEnrollSecrets.bind(settingsController));
/**
 * @openapi
 * /v1/settings/enroll-secrets/{id}:
 *   get:
 *     summary: Get an enroll secret by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Enroll secret ID
 *     responses:
 *       200:
 *         description: Enroll secret retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Enroll secret not found
 */
router.get('/enroll-secrets/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getEnrollSecret.bind(settingsController));
/**
 * @openapi
 * /v1/settings/enroll-secrets:
 *   post:
 *     summary: Create an enroll secret
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Enroll secret created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/enroll-secrets', checkPermission('settings', 'add'), validateBody(createEnrollSecretSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ENROLL_SECRET }), settingsController.createEnrollSecret.bind(settingsController));
/**
 * @openapi
 * /v1/settings/enroll-secrets/{id}:
 *   put:
 *     summary: Update an enroll secret
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Enroll secret ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Enroll secret updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Enroll secret not found
 */
router.put('/enroll-secrets/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateEnrollSecretSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ENROLL_SECRET, getResourceId: (req) => req.params.id }), settingsController.updateEnrollSecret.bind(settingsController));
/**
 * @openapi
 * /v1/settings/enroll-secrets/{id}:
 *   delete:
 *     summary: Delete an enroll secret
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Enroll secret ID
 *     responses:
 *       200:
 *         description: Enroll secret deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Enroll secret not found
 */
router.delete('/enroll-secrets/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ENROLL_SECRET, getResourceId: (req) => req.params.id }), settingsController.deleteEnrollSecret.bind(settingsController));

// ============================================
// RedHat Nominations — Pipeline 2E R5
// ============================================
/**
 * @openapi
 * /v1/settings/redhat-nominations:
 *   get:
 *     summary: List RedHat nominations
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of RedHat nominations
 *       401:
 *         description: Unauthorized
 */
router.get('/redhat-nominations', checkPermission('settings', 'view'), settingsController.listRedHatNominations.bind(settingsController));
/**
 * @openapi
 * /v1/settings/redhat-nominations/{id}:
 *   get:
 *     summary: Get a RedHat nomination by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Nomination ID
 *     responses:
 *       200:
 *         description: RedHat nomination retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Nomination not found
 */
router.get('/redhat-nominations/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getRedHatNomination.bind(settingsController));
/**
 * @openapi
 * /v1/settings/redhat-nominations:
 *   post:
 *     summary: Create a RedHat nomination
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: RedHat nomination created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/redhat-nominations', checkPermission('settings', 'add'), validateBody(createRedHatNominationSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.REDHAT_NOMINATION }), settingsController.createRedHatNomination.bind(settingsController));
/**
 * @openapi
 * /v1/settings/redhat-nominations/{id}:
 *   put:
 *     summary: Update a RedHat nomination
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Nomination ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: RedHat nomination updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Nomination not found
 */
router.put('/redhat-nominations/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateRedHatNominationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.REDHAT_NOMINATION, getResourceId: (req) => req.params.id }), settingsController.updateRedHatNomination.bind(settingsController));
/**
 * @openapi
 * /v1/settings/redhat-nominations/{id}:
 *   delete:
 *     summary: Delete a RedHat nomination
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Nomination ID
 *     responses:
 *       200:
 *         description: RedHat nomination deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Nomination not found
 */
router.delete('/redhat-nominations/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.REDHAT_NOMINATION, getResourceId: (req) => req.params.id }), settingsController.deleteRedHatNomination.bind(settingsController));

// ============================================
// Proxy Server (singleton)
// ============================================
/**
 * @openapi
 * /v1/settings/proxy-server:
 *   get:
 *     summary: Get proxy server settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Proxy server settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/proxy-server', checkPermission('settings', 'view'), settingsController.getProxyServer.bind(settingsController));
/**
 * @openapi
 * /v1/settings/proxy-server:
 *   put:
 *     summary: Update proxy server settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Proxy server settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/proxy-server', checkPermission('settings', 'edit'), validateBody(updateProxyServerSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.PROXY_SERVER }), settingsController.updateProxyServer.bind(settingsController));
/**
 * @openapi
 * /v1/settings/proxy-server/test:
 *   post:
 *     summary: Test proxy server connection
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Proxy server test result
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/proxy-server/test', checkPermission('settings', 'edit'), validateBody(testProxyServerSchema), audit({ action: AuditAction.TEST, resource: AuditResource.PROXY_SERVER }), settingsController.testProxyServer.bind(settingsController));

// ============================================
// Mail Server (singleton)
// ============================================
/**
 * @openapi
 * /v1/settings/mail-server:
 *   get:
 *     summary: Get mail server settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mail server settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/mail-server', checkPermission('settings', 'view'), settingsController.getMailServer.bind(settingsController));
/**
 * @openapi
 * /v1/settings/mail-server:
 *   put:
 *     summary: Update mail server settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Mail server settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/mail-server', checkPermission('settings', 'edit'), validateBody(updateMailServerSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.MAIL_SERVER }), settingsController.updateMailServer.bind(settingsController));
/**
 * @openapi
 * /v1/settings/mail-server/test:
 *   post:
 *     summary: Test mail server connection
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Mail server test result
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/mail-server/test', checkPermission('settings', 'edit'), validateBody(testMailServerSchema), audit({ action: AuditAction.TEST, resource: AuditResource.MAIL_SERVER }), settingsController.testMailServer.bind(settingsController));

// ============================================
// Audit Logs
// ============================================
/**
 * @openapi
 * /v1/settings/audit:
 *   get:
 *     summary: List audit logs
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of audit logs
 *       401:
 *         description: Unauthorized
 */
router.get('/audit', checkPermission('settings', 'view'), validateQuery(auditLogQuerySchema), settingsController.listAuditLogs.bind(settingsController));
/**
 * @openapi
 * /v1/settings/audit/filter-options:
 *   get:
 *     summary: Get audit log filter options
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit log filter options retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/audit/filter-options', checkPermission('settings', 'view'), settingsController.getAuditLogFilters.bind(settingsController));

// ============================================
// Vulnerability Preference (singleton)
// ============================================
/**
 * @openapi
 * /v1/settings/vulnerability-preference:
 *   get:
 *     summary: Get vulnerability preference settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vulnerability preference retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/vulnerability-preference', checkPermission('settings', 'view'), settingsController.getVulnerabilityPreference.bind(settingsController));
/**
 * @openapi
 * /v1/settings/vulnerability-preference:
 *   put:
 *     summary: Update vulnerability preference settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Vulnerability preference updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/vulnerability-preference', checkPermission('settings', 'edit'), validateBody(updateVulnerabilityPreferenceSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.VULNERABILITY_PREFERENCE }), settingsController.updateVulnerabilityPreference.bind(settingsController));
/**
 * @openapi
 * /v1/settings/vulnerability-preference/sync:
 *   post:
 *     summary: Sync vulnerability database
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vulnerability database sync initiated
 *       401:
 *         description: Unauthorized
 */
router.post('/vulnerability-preference/sync', checkPermission('settings', 'edit'), audit({ action: AuditAction.SYNC, resource: AuditResource.VULNERABILITY_PREFERENCE }), settingsController.syncVulnerabilityDatabase.bind(settingsController));

// ============================================
// Platform License (singleton)
// ============================================
/**
 * @openapi
 * /v1/settings/platform-license:
 *   get:
 *     summary: Get platform license
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform license retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/platform-license', checkPermission('settings', 'view'), settingsController.getPlatformLicense.bind(settingsController));
/**
 * @openapi
 * /v1/settings/platform-license:
 *   put:
 *     summary: Update platform license
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               licenseKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Platform license updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/platform-license', checkPermission('settings', 'edit'), validateBody(updateLicenseSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.PLATFORM_LICENSE }), settingsController.updatePlatformLicense.bind(settingsController));

// ============================================
// Computer Groups (R1 — hardened)
// ============================================
/**
 * @openapi
 * /v1/settings/computer-groups:
 *   get:
 *     summary: List computer groups
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of computer groups
 *       401:
 *         description: Unauthorized
 */
router.get('/computer-groups', checkPermission('settings', 'view'), validateQuery(computerGroupListQuerySchema), settingsController.listComputerGroups.bind(settingsController));
/**
 * @openapi
 * /v1/settings/computer-groups/available-endpoints:
 *   get:
 *     summary: Get endpoints available for computer group assignment
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available endpoints retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/computer-groups/available-endpoints', checkPermission('settings', 'view'), settingsController.getAvailableEndpoints.bind(settingsController));
/**
 * @openapi
 * /v1/settings/computer-groups/{id}:
 *   get:
 *     summary: Get a computer group by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Computer group ID
 *     responses:
 *       200:
 *         description: Computer group retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Computer group not found
 */
router.get('/computer-groups/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getComputerGroup.bind(settingsController));
/**
 * @openapi
 * /v1/settings/computer-groups:
 *   post:
 *     summary: Create a computer group
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Computer group created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/computer-groups', checkPermission('settings', 'add'), validateBody(createComputerGroupSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.COMPUTER_GROUP }), settingsController.createComputerGroup.bind(settingsController));
/**
 * @openapi
 * /v1/settings/computer-groups/{id}:
 *   put:
 *     summary: Update a computer group
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Computer group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Computer group updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Computer group not found
 */
router.put('/computer-groups/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateComputerGroupSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.COMPUTER_GROUP, getResourceId: (req) => req.params.id }), settingsController.updateComputerGroup.bind(settingsController));
/**
 * @openapi
 * /v1/settings/computer-groups/{id}:
 *   delete:
 *     summary: Delete a computer group
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Computer group ID
 *     responses:
 *       200:
 *         description: Computer group deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Computer group not found
 */
router.delete('/computer-groups/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.COMPUTER_GROUP, getResourceId: (req) => req.params.id }), settingsController.deleteComputerGroup.bind(settingsController));

// ============================================
// Deployment Policies (R2 — consolidated DPOL-XXXX)
// ============================================
/**
 * @openapi
 * /v1/settings/deployment-policies:
 *   get:
 *     summary: List deployment policies
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of deployment policies
 *       401:
 *         description: Unauthorized
 */
router.get('/deployment-policies', checkPermission('settings', 'view'), validateQuery(deploymentPolicyListQuerySchema), settingsController.listDeploymentPolicies.bind(settingsController));
/**
 * @openapi
 * /v1/settings/deployment-policies/{id}:
 *   get:
 *     summary: Get a deployment policy by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deployment policy ID
 *     responses:
 *       200:
 *         description: Deployment policy retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Deployment policy not found
 */
router.get('/deployment-policies/:id', checkPermission('settings', 'view'), validateParams(stringIdParamSchema), settingsController.getDeploymentPolicy.bind(settingsController));
/**
 * @openapi
 * /v1/settings/deployment-policies:
 *   post:
 *     summary: Create a deployment policy
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Deployment policy created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/deployment-policies', checkPermission('settings', 'add'), validateBody(createSettingsDeploymentPolicySchema), audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT_POLICY }), settingsController.createDeploymentPolicy.bind(settingsController));
/**
 * @openapi
 * /v1/settings/deployment-policies/{id}:
 *   put:
 *     summary: Update a deployment policy
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deployment policy ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Deployment policy updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Deployment policy not found
 */
router.put('/deployment-policies/:id', checkPermission('settings', 'edit'), validateParams(stringIdParamSchema), validateBody(updateSettingsDeploymentPolicySchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.DEPLOYMENT_POLICY, getResourceId: (req) => req.params.id }), settingsController.updateDeploymentPolicy.bind(settingsController));
/**
 * @openapi
 * /v1/settings/deployment-policies/{id}:
 *   delete:
 *     summary: Delete a deployment policy
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Deployment policy ID
 *     responses:
 *       200:
 *         description: Deployment policy deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Deployment policy not found
 */
router.delete('/deployment-policies/:id', checkPermission('settings', 'delete'), validateParams(stringIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT_POLICY, getResourceId: (req) => req.params.id }), settingsController.deleteDeploymentPolicy.bind(settingsController));

// ============================================
// Distribution Servers
// ============================================
/**
 * @openapi
 * /v1/settings/distribution-servers:
 *   get:
 *     summary: List distribution servers
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of distribution servers
 *       401:
 *         description: Unauthorized
 */
router.get('/distribution-servers', checkPermission('settings', 'view'), validateQuery(queryDistributionServersSchema), settingsController.listDistributionServers.bind(settingsController));
/**
 * @openapi
 * /v1/settings/distribution-servers/{id}:
 *   get:
 *     summary: Get a distribution server by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Distribution server ID
 *     responses:
 *       200:
 *         description: Distribution server retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Distribution server not found
 */
router.get('/distribution-servers/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getDistributionServer.bind(settingsController));
/**
 * @openapi
 * /v1/settings/distribution-servers:
 *   post:
 *     summary: Create a distribution server
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Distribution server created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/distribution-servers', checkPermission('settings', 'add'), validateBody(createDistributionServerSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.DISTRIBUTION_SERVER }), settingsController.createDistributionServer.bind(settingsController));
/**
 * @openapi
 * /v1/settings/distribution-servers/{id}:
 *   put:
 *     summary: Update a distribution server
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Distribution server ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Distribution server updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Distribution server not found
 */
router.put('/distribution-servers/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateDistributionServerSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.DISTRIBUTION_SERVER, getResourceId: (req) => req.params.id }), settingsController.updateDistributionServer.bind(settingsController));
/**
 * @openapi
 * /v1/settings/distribution-servers/{id}:
 *   delete:
 *     summary: Delete a distribution server
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Distribution server ID
 *     responses:
 *       200:
 *         description: Distribution server deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Distribution server not found
 */
router.delete('/distribution-servers/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.DISTRIBUTION_SERVER, getResourceId: (req) => req.params.id }), settingsController.deleteDistributionServer.bind(settingsController));

// ============================================
// Branding
// ============================================
/**
 * @openapi
 * /v1/settings/branding:
 *   get:
 *     summary: Get branding settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Branding settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/branding', checkPermission('settings', 'view'), settingsController.getBranding.bind(settingsController));
/**
 * @openapi
 * /v1/settings/branding:
 *   post:
 *     summary: Update branding (upload logo)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo image file (PNG, JPG, GIF, or SVG, max 5MB)
 *     responses:
 *       200:
 *         description: Branding updated successfully
 *       400:
 *         description: Invalid file type or file too large
 *       401:
 *         description: Unauthorized
 */
router.post('/branding', checkPermission('settings', 'edit'), upload.single('logo'), handleMulterError, audit({ action: AuditAction.UPDATE, resource: AuditResource.BRANDING }), settingsController.updateBranding.bind(settingsController));
/**
 * @openapi
 * /v1/settings/branding/logo:
 *   get:
 *     summary: Get branding logo image
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Logo image
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Logo not found
 */
router.get('/branding/logo', settingsController.getBrandingLogo.bind(settingsController));

// ============================================
// Vendor Logos
// ============================================
/**
 * @openapi
 * /v1/settings/vendor-logos:
 *   get:
 *     summary: List vendor logos
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vendor logos
 *       401:
 *         description: Unauthorized
 */
router.get('/vendor-logos', checkPermission('settings', 'view'), settingsController.listVendorLogos.bind(settingsController));
/**
 * @openapi
 * /v1/settings/vendor-logos/{id}:
 *   get:
 *     summary: Get a vendor logo by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vendor logo ID
 *     responses:
 *       200:
 *         description: Vendor logo retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vendor logo not found
 */
router.get('/vendor-logos/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getVendorLogo.bind(settingsController));
/**
 * @openapi
 * /v1/settings/vendor-logos:
 *   post:
 *     summary: Upload a vendor logo
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo image file (PNG, JPG, GIF, or SVG, max 5MB)
 *     responses:
 *       201:
 *         description: Vendor logo created successfully
 *       400:
 *         description: Invalid file type or file too large
 *       401:
 *         description: Unauthorized
 */
router.post('/vendor-logos', checkPermission('settings', 'add'), upload.single('logo'), handleMulterError, audit({ action: AuditAction.CREATE, resource: AuditResource.VENDOR_LOGO }), settingsController.createVendorLogo.bind(settingsController));
/**
 * @openapi
 * /v1/settings/vendor-logos/{id}:
 *   put:
 *     summary: Update a vendor logo
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vendor logo ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo image file (PNG, JPG, GIF, or SVG, max 5MB)
 *     responses:
 *       200:
 *         description: Vendor logo updated successfully
 *       400:
 *         description: Invalid file type or file too large
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vendor logo not found
 */
router.put('/vendor-logos/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), upload.single('logo'), handleMulterError, audit({ action: AuditAction.UPDATE, resource: AuditResource.VENDOR_LOGO, getResourceId: (req) => req.params.id }), settingsController.updateVendorLogo.bind(settingsController));
/**
 * @openapi
 * /v1/settings/vendor-logos/{id}:
 *   delete:
 *     summary: Delete a vendor logo
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vendor logo ID
 *     responses:
 *       200:
 *         description: Vendor logo deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vendor logo not found
 */
router.delete('/vendor-logos/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.VENDOR_LOGO, getResourceId: (req) => req.params.id }), settingsController.deleteVendorLogo.bind(settingsController));

// ============================================
// Risk Score Settings
// ============================================
/**
 * @openapi
 * /v1/settings/risk-score:
 *   get:
 *     summary: Get risk score settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk score settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/risk-score', checkPermission('settings', 'view'), settingsController.getRiskScoreSettings.bind(settingsController));
/**
 * @openapi
 * /v1/settings/risk-score:
 *   put:
 *     summary: Update risk score settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Risk score settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/risk-score', checkPermission('settings', 'edit'), validateBody(updateRiskScoreSettingsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.RISK_SCORE }), settingsController.updateRiskScoreSettings.bind(settingsController));

// ============================================
// Remote Desktop Settings
// ============================================
/**
 * @openapi
 * /v1/settings/remote-desktop:
 *   get:
 *     summary: Get remote desktop settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Remote desktop settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/remote-desktop', checkPermission('settings', 'view'), settingsController.getRemoteDesktopSettings.bind(settingsController));
/**
 * @openapi
 * /v1/settings/remote-desktop:
 *   put:
 *     summary: Update remote desktop settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Remote desktop settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/remote-desktop', checkPermission('settings', 'edit'), validateBody(updateRemoteDesktopSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.REMOTE_DESKTOP }), settingsController.updateRemoteDesktopSettings.bind(settingsController));
/**
 * @openapi
 * /v1/settings/remote-desktop/reset:
 *   post:
 *     summary: Reset remote desktop settings to defaults
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Remote desktop settings reset successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/remote-desktop/reset', checkPermission('settings', 'edit'), audit({ action: AuditAction.DELETE, resource: AuditResource.REMOTE_DESKTOP }), settingsController.resetRemoteDesktopSettings.bind(settingsController));

// ============================================
// Patch Management Settings (singleton)
// ============================================
/**
 * @openapi
 * /v1/settings/patch-management:
 *   get:
 *     summary: Get patch management settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patch management settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/patch-management', checkPermission('settings', 'view'), settingsController.getPatchManagementSettings.bind(settingsController));
/**
 * @openapi
 * /v1/settings/patch-management:
 *   put:
 *     summary: Update patch management settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Patch management settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/patch-management', checkPermission('settings', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH_MANAGEMENT }), settingsController.updatePatchManagementSettings.bind(settingsController));

// ============================================
// Patch Preferences (R3 — singleton)
// ============================================
/**
 * @openapi
 * /v1/settings/patch-preferences:
 *   get:
 *     summary: Get patch preferences
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patch preferences retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/patch-preferences', checkPermission('settings', 'view'), settingsController.getPatchPreferences.bind(settingsController));
/**
 * @openapi
 * /v1/settings/patch-preferences:
 *   put:
 *     summary: Update patch preferences
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Patch preferences updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/patch-preferences', checkPermission('settings', 'edit'), validateBody(updatePatchPreferenceSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH_MANAGEMENT }), settingsController.updatePatchPreferences.bind(settingsController));
/**
 * @openapi
 * /v1/settings/patch-preferences/sync:
 *   post:
 *     summary: Trigger immediate patch sync
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patch sync initiated
 *       401:
 *         description: Unauthorized
 */
router.post('/patch-preferences/sync', checkPermission('settings', 'edit'), audit({ action: AuditAction.SYNC, resource: AuditResource.PATCH_MANAGEMENT }), settingsController.syncPatchNow.bind(settingsController));

// ============================================
// Integrations (R5 — Marketplace CRUD)
// ============================================
/**
 * @openapi
 * /v1/settings/integrations:
 *   get:
 *     summary: List integrations
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of integrations
 *       401:
 *         description: Unauthorized
 */
router.get('/integrations', checkPermission('settings', 'view'), validateQuery(listIntegrationsQuerySchema), settingsController.listIntegrations.bind(settingsController));
/**
 * @openapi
 * /v1/settings/integrations/{id}:
 *   get:
 *     summary: Get an integration by ID
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Integration ID
 *     responses:
 *       200:
 *         description: Integration retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Integration not found
 */
router.get('/integrations/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getIntegration.bind(settingsController));
/**
 * @openapi
 * /v1/settings/integrations:
 *   post:
 *     summary: Create an integration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Integration created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/integrations', checkPermission('settings', 'add'), validateBody(createIntegrationSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.INTEGRATION }), settingsController.createIntegration.bind(settingsController));
/**
 * @openapi
 * /v1/settings/integrations/{id}:
 *   put:
 *     summary: Update an integration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Integration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Integration updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Integration not found
 */
router.put('/integrations/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateIntegrationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.INTEGRATION, getResourceId: (req) => req.params.id }), settingsController.updateIntegration.bind(settingsController));
/**
 * @openapi
 * /v1/settings/integrations/{id}:
 *   delete:
 *     summary: Delete an integration
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Integration ID
 *     responses:
 *       200:
 *         description: Integration deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Integration not found
 */
router.delete('/integrations/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.INTEGRATION, getResourceId: (req) => req.params.id }), settingsController.deleteIntegration.bind(settingsController));
/**
 * @openapi
 * /v1/settings/integrations/{id}/toggle:
 *   put:
 *     summary: Toggle integration enabled/disabled status
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Integration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Integration status toggled successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Integration not found
 */
router.put('/integrations/:id/toggle', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(toggleIntegrationStatusSchema), audit({ action: AuditAction.TOGGLE, resource: AuditResource.INTEGRATION, getResourceId: (req) => req.params.id }), settingsController.toggleIntegration.bind(settingsController));
/**
 * @openapi
 * /v1/settings/integrations/{id}/test:
 *   post:
 *     summary: Test an integration connection
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Integration ID
 *     responses:
 *       200:
 *         description: Integration test result
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Integration not found
 */
router.post('/integrations/:id/test', checkPermission('settings', 'edit'), validateParams(idParamSchema), audit({ action: AuditAction.TEST, resource: AuditResource.INTEGRATION, getResourceId: (req) => req.params.id }), settingsController.testIntegration.bind(settingsController));

export { router as settingsRoutes };
