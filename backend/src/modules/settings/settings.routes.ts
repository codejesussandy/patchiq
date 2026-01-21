import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate } from '@middleware/auth';
import { validateBody, validateParams } from '@middleware/validation';
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
  idParamSchema,
} from './settings.validators';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// ============================================
// Organizations
// ============================================
router.get('/organizations', settingsController.listOrganizations.bind(settingsController));
router.get('/organizations/:id', validateParams(idParamSchema), settingsController.getOrganization.bind(settingsController));
router.post('/organizations', validateBody(createOrganizationSchema), settingsController.createOrganization.bind(settingsController));
router.put('/organizations/:id', validateParams(idParamSchema), validateBody(updateOrganizationSchema), settingsController.updateOrganization.bind(settingsController));
router.delete('/organizations/:id', validateParams(idParamSchema), settingsController.deleteOrganization.bind(settingsController));

// ============================================
// Branches
// ============================================
router.get('/branches', settingsController.listBranches.bind(settingsController));
router.get('/branches/:id', validateParams(idParamSchema), settingsController.getBranch.bind(settingsController));
router.post('/branches', validateBody(createBranchSchema), settingsController.createBranch.bind(settingsController));
router.put('/branches/:id', validateParams(idParamSchema), validateBody(updateBranchSchema), settingsController.updateBranch.bind(settingsController));
router.delete('/branches/:id', validateParams(idParamSchema), settingsController.deleteBranch.bind(settingsController));

// ============================================
// Departments
// ============================================
router.get('/departments', settingsController.listDepartments.bind(settingsController));
router.get('/departments/:id', validateParams(idParamSchema), settingsController.getDepartment.bind(settingsController));
router.post('/departments', validateBody(createDepartmentSchema), settingsController.createDepartment.bind(settingsController));
router.put('/departments/:id', validateParams(idParamSchema), validateBody(updateDepartmentSchema), settingsController.updateDepartment.bind(settingsController));
router.delete('/departments/:id', validateParams(idParamSchema), settingsController.deleteDepartment.bind(settingsController));

// ============================================
// Locations
// ============================================
router.get('/locations', settingsController.listLocations.bind(settingsController));
router.get('/locations/:id', validateParams(idParamSchema), settingsController.getLocation.bind(settingsController));
router.post('/locations', validateBody(createLocationSchema), settingsController.createLocation.bind(settingsController));
router.put('/locations/:id', validateParams(idParamSchema), validateBody(updateLocationSchema), settingsController.updateLocation.bind(settingsController));
router.delete('/locations/:id', validateParams(idParamSchema), settingsController.deleteLocation.bind(settingsController));

// ============================================
// Users
// ============================================
router.get('/users', settingsController.listUsers.bind(settingsController));
router.get('/users/:id', validateParams(idParamSchema), settingsController.getUser.bind(settingsController));
router.post('/users', validateBody(createUserSchema), settingsController.createUser.bind(settingsController));
router.put('/users/:id', validateParams(idParamSchema), validateBody(updateUserSchema), settingsController.updateUser.bind(settingsController));
router.delete('/users/:id', validateParams(idParamSchema), settingsController.deleteUser.bind(settingsController));
router.post('/users/invite', validateBody(inviteUserSchema), settingsController.inviteUser.bind(settingsController));
router.post('/users/:id/suspend', validateParams(idParamSchema), settingsController.suspendUser.bind(settingsController));
router.post('/users/:id/activate', validateParams(idParamSchema), settingsController.activateUser.bind(settingsController));
router.post('/users/:id/reset-password', validateParams(idParamSchema), settingsController.resetPassword.bind(settingsController));
router.get('/users/:id/audit-log', validateParams(idParamSchema), settingsController.getUserAuditLog.bind(settingsController));

// ============================================
// Roles
// ============================================
router.get('/roles', settingsController.listRoles.bind(settingsController));
router.get('/roles/:id', validateParams(idParamSchema), settingsController.getRole.bind(settingsController));
router.post('/roles', validateBody(createRoleSchema), settingsController.createRole.bind(settingsController));
router.put('/roles/:id', validateParams(idParamSchema), validateBody(updateRoleSchema), settingsController.updateRole.bind(settingsController));
router.delete('/roles/:id', validateParams(idParamSchema), settingsController.deleteRole.bind(settingsController));

// ============================================
// Alert Configurations
// ============================================
router.get('/alerts', settingsController.listAlertConfigs.bind(settingsController));
router.get('/alerts/:type', settingsController.getAlertConfig.bind(settingsController));
router.put('/alerts/:type', validateBody(updateAlertConfigSchema), settingsController.updateAlertConfig.bind(settingsController));

// ============================================
// LDAP Configurations
// ============================================
router.get('/ldap-configs', settingsController.listLdapConfigs.bind(settingsController));
router.get('/ldap-configs/:id', validateParams(idParamSchema), settingsController.getLdapConfig.bind(settingsController));
router.post('/ldap-configs', validateBody(createLdapConfigSchema), settingsController.createLdapConfig.bind(settingsController));
router.put('/ldap-configs/:id', validateParams(idParamSchema), validateBody(updateLdapConfigSchema), settingsController.updateLdapConfig.bind(settingsController));
router.delete('/ldap-configs/:id', validateParams(idParamSchema), settingsController.deleteLdapConfig.bind(settingsController));
router.post('/ldap-configs/:id/test', validateParams(idParamSchema), settingsController.testLdapConfig.bind(settingsController));

// ============================================
// Server Settings (singleton)
// ============================================
router.get('/server', settingsController.getServerSettings.bind(settingsController));
router.put('/server', validateBody(updateServerSettingsSchema), settingsController.updateServerSettings.bind(settingsController));

// ============================================
// Agent Configuration (singleton)
// ============================================
router.get('/agent-configuration', settingsController.getAgentConfig.bind(settingsController));
router.put('/agent-configuration', validateBody(updateAgentConfigSchema), settingsController.updateAgentConfig.bind(settingsController));

// ============================================
// Agent Approvals
// ============================================
router.get('/agent-approvals', settingsController.listAgentApprovals.bind(settingsController));
router.post('/agent-approvals/:id/approve', validateParams(idParamSchema), settingsController.approveAgent.bind(settingsController));
router.post('/agent-approvals/:id/reject', validateParams(idParamSchema), settingsController.rejectAgent.bind(settingsController));

// ============================================
// Proxy Server (singleton)
// ============================================
router.get('/proxy-server', settingsController.getProxyServer.bind(settingsController));
router.put('/proxy-server', validateBody(updateProxyServerSchema), settingsController.updateProxyServer.bind(settingsController));
router.post('/proxy-server/test', validateBody(testProxyServerSchema), settingsController.testProxyServer.bind(settingsController));

// ============================================
// Mail Server (singleton)
// ============================================
router.get('/mail-server', settingsController.getMailServer.bind(settingsController));
router.put('/mail-server', validateBody(updateMailServerSchema), settingsController.updateMailServer.bind(settingsController));
router.post('/mail-server/test', validateBody(testMailServerSchema), settingsController.testMailServer.bind(settingsController));

// ============================================
// Audit Logs
// ============================================
router.get('/audit', settingsController.listAuditLogs.bind(settingsController));
router.get('/audit/filter-options', settingsController.getAuditLogFilters.bind(settingsController));

// ============================================
// Vulnerability Preference (singleton)
// ============================================
router.get('/vulnerability-preference', settingsController.getVulnerabilityPreference.bind(settingsController));
router.put('/vulnerability-preference', validateBody(updateVulnerabilityPreferenceSchema), settingsController.updateVulnerabilityPreference.bind(settingsController));
router.post('/vulnerability-preference/sync', settingsController.syncVulnerabilityDatabase.bind(settingsController));

// ============================================
// Platform License (singleton)
// ============================================
router.get('/platform-license', settingsController.getPlatformLicense.bind(settingsController));
router.put('/platform-license', validateBody(updateLicenseSchema), settingsController.updatePlatformLicense.bind(settingsController));

export { router as settingsRoutes };
