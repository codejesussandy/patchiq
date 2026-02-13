import { Router } from 'express';
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
    fileSize: 10 * 1024 * 1024, // 10MB max file size for logos
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
} from './settings.validators';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// ============================================
// Organizations
// ============================================
router.get('/organizations', validateQuery(listOrganizationsQuerySchema), settingsController.listOrganizations.bind(settingsController));
router.get('/organizations/:id', validateParams(idParamSchema), settingsController.getOrganization.bind(settingsController));
router.post('/organizations', validateBody(createOrganizationSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ORGANIZATION }), settingsController.createOrganization.bind(settingsController));
router.put('/organizations/:id', validateParams(idParamSchema), validateBody(updateOrganizationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ORGANIZATION, getResourceId: (req) => req.params.id }), settingsController.updateOrganization.bind(settingsController));
router.delete('/organizations/:id', validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ORGANIZATION, getResourceId: (req) => req.params.id }), settingsController.deleteOrganization.bind(settingsController));

// ============================================
// Branches
// ============================================
router.get('/branches', validateQuery(listBranchesQuerySchema), settingsController.listBranches.bind(settingsController));
router.get('/branches/:id', validateParams(idParamSchema), settingsController.getBranch.bind(settingsController));
router.post('/branches', validateBody(createBranchSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.BRANCH }), settingsController.createBranch.bind(settingsController));
router.put('/branches/:id', validateParams(idParamSchema), validateBody(updateBranchSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.BRANCH, getResourceId: (req) => req.params.id }), settingsController.updateBranch.bind(settingsController));
router.delete('/branches/:id', validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.BRANCH, getResourceId: (req) => req.params.id }), settingsController.deleteBranch.bind(settingsController));

// ============================================
// Departments
// ============================================
router.get('/departments', validateQuery(listDepartmentsQuerySchema), settingsController.listDepartments.bind(settingsController));
router.get('/departments/:id', validateParams(idParamSchema), settingsController.getDepartment.bind(settingsController));
router.post('/departments', validateBody(createDepartmentSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.DEPARTMENT }), settingsController.createDepartment.bind(settingsController));
router.put('/departments/:id', validateParams(idParamSchema), validateBody(updateDepartmentSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.DEPARTMENT, getResourceId: (req) => req.params.id }), settingsController.updateDepartment.bind(settingsController));
router.delete('/departments/:id', validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.DEPARTMENT, getResourceId: (req) => req.params.id }), settingsController.deleteDepartment.bind(settingsController));

// ============================================
// Locations
// ============================================
router.get('/locations', validateQuery(listOrganizationsQuerySchema), settingsController.listLocations.bind(settingsController));
router.get('/locations/:id', validateParams(idParamSchema), settingsController.getLocation.bind(settingsController));
router.post('/locations', validateBody(createLocationSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.LOCATION }), settingsController.createLocation.bind(settingsController));
router.put('/locations/:id', validateParams(idParamSchema), validateBody(updateLocationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.LOCATION, getResourceId: (req) => req.params.id }), settingsController.updateLocation.bind(settingsController));
router.delete('/locations/:id', validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.LOCATION, getResourceId: (req) => req.params.id }), settingsController.deleteLocation.bind(settingsController));

// ============================================
// Users
// ============================================
router.get('/users', validateQuery(userListQuerySchema), settingsController.listUsers.bind(settingsController));
router.get('/users/:id', validateParams(idParamSchema), settingsController.getUser.bind(settingsController));
router.post('/users', validateBody(createUserSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.USER }), settingsController.createUser.bind(settingsController));
router.put('/users/:id', validateParams(idParamSchema), validateBody(updateUserSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.updateUser.bind(settingsController));
router.delete('/users/:id', validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.deleteUser.bind(settingsController));
router.post('/users/invite', validateBody(inviteUserSchema), audit({ action: AuditAction.INVITE, resource: AuditResource.USER }), settingsController.inviteUser.bind(settingsController));
router.post('/users/:id/suspend', validateParams(idParamSchema), audit({ action: AuditAction.SUSPEND, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.suspendUser.bind(settingsController));
router.post('/users/:id/activate', validateParams(idParamSchema), audit({ action: AuditAction.ACTIVATE, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.activateUser.bind(settingsController));
router.post('/users/:id/reset-password', validateParams(idParamSchema), audit({ action: AuditAction.PASSWORD_RESET_REQUEST, resource: AuditResource.USER, getResourceId: (req) => req.params.id }), settingsController.resetPassword.bind(settingsController));
router.get('/users/:id/audit-log', validateParams(idParamSchema), settingsController.getUserAuditLog.bind(settingsController));

// ============================================
// Roles
// ============================================
router.get('/roles', settingsController.listRoles.bind(settingsController));
router.get('/roles/:id', validateParams(idParamSchema), settingsController.getRole.bind(settingsController));
router.post('/roles', validateBody(createRoleSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ROLE }), settingsController.createRole.bind(settingsController));
router.put('/roles/:id', validateParams(idParamSchema), validateBody(updateRoleSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ROLE, getResourceId: (req) => req.params.id }), settingsController.updateRole.bind(settingsController));
router.delete('/roles/:id', validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ROLE, getResourceId: (req) => req.params.id }), settingsController.deleteRole.bind(settingsController));

// ============================================
// Alert Configurations
// ============================================
router.get('/alerts', settingsController.listAlertConfigs.bind(settingsController));
router.post('/alerts', validateBody(createAlertConfigSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ALERT_CONFIG }), settingsController.createAlertConfig.bind(settingsController));
router.get('/alerts/:id', validateParams(idParamSchema), settingsController.getAlertConfig.bind(settingsController));
router.put('/alerts/:id', validateParams(idParamSchema), validateBody(updateAlertConfigSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ALERT_CONFIG, getResourceId: (req) => req.params.id }), settingsController.updateAlertConfig.bind(settingsController));
router.delete('/alerts/:id', validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ALERT_CONFIG, getResourceId: (req) => req.params.id }), settingsController.deleteAlertConfig.bind(settingsController));

// ============================================
// LDAP Configurations
// ============================================
router.get('/ldap-configs', settingsController.listLdapConfigs.bind(settingsController));
router.get('/ldap-configs/:id', validateParams(ldapConfigParamSchema), settingsController.getLdapConfig.bind(settingsController));
router.post('/ldap-configs', validateBody(createLdapConfigSchema), settingsController.createLdapConfig.bind(settingsController));
router.put('/ldap-configs/:id', validateParams(ldapConfigParamSchema), validateBody(updateLdapConfigSchema), settingsController.updateLdapConfig.bind(settingsController));
router.delete('/ldap-configs/:id', validateParams(ldapConfigParamSchema), settingsController.deleteLdapConfig.bind(settingsController));
router.post('/ldap-configs/:id/test', validateParams(ldapConfigParamSchema), settingsController.testLdapConfig.bind(settingsController));

// ============================================
// LDAP Group Mappings
// ============================================
router.get('/ldap-configs/:id/group-mappings', validateParams(ldapConfigParamSchema), settingsController.listGroupMappings.bind(settingsController));
router.post('/ldap-configs/:id/group-mappings', validateParams(ldapConfigParamSchema), validateBody(createGroupMappingSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.GROUP_MAPPING, getResourceId: (req) => req.params.id }), settingsController.createGroupMapping.bind(settingsController));
router.put('/ldap-configs/:id/group-mappings/:mapId', audit({ action: AuditAction.UPDATE, resource: AuditResource.GROUP_MAPPING, getResourceId: (req) => req.params.mapId }), settingsController.updateGroupMapping.bind(settingsController));
router.delete('/ldap-configs/:id/group-mappings/:mapId', audit({ action: AuditAction.DELETE, resource: AuditResource.GROUP_MAPPING, getResourceId: (req) => req.params.mapId }), settingsController.deleteGroupMapping.bind(settingsController));
router.post('/ldap-configs/:id/discover-groups', validateParams(ldapConfigParamSchema), settingsController.discoverGroups.bind(settingsController));

// ============================================
// LDAP Sync
// ============================================
router.post('/ldap-configs/:id/sync', validateParams(ldapConfigParamSchema), settingsController.triggerSync.bind(settingsController));
router.get('/ldap-configs/:id/sync-jobs', validateParams(ldapConfigParamSchema), settingsController.listSyncJobs.bind(settingsController));
router.get('/ldap-configs/:id/sync-jobs/:jobId', settingsController.getSyncJob.bind(settingsController));

// ============================================
// Password Policy
// ============================================
router.get('/password-policy', settingsController.getPasswordPolicy.bind(settingsController));
router.put('/password-policy', audit({ action: AuditAction.UPDATE, resource: AuditResource.PASSWORD_POLICY }), settingsController.updatePasswordPolicy.bind(settingsController));

// ============================================
// Server Settings (singleton)
// ============================================
router.get('/server', checkPermission('settings', 'view'), settingsController.getServerSettings.bind(settingsController));
router.put('/server', checkPermission('settings', 'edit'), validateBody(updateServerSettingsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.SERVER_SETTINGS }), settingsController.updateServerSettings.bind(settingsController));

// ============================================
// Agent Configuration (singleton)
// ============================================
router.get('/agent-configuration', checkPermission('settings', 'view'), settingsController.getAgentConfig.bind(settingsController));
router.put('/agent-configuration', checkPermission('settings', 'edit'), validateBody(updateAgentConfigSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.AGENT_CONFIG }), settingsController.updateAgentConfig.bind(settingsController));
router.post('/agent-configuration/reset', checkPermission('settings', 'edit'), audit({ action: AuditAction.DELETE, resource: AuditResource.AGENT_CONFIG }), settingsController.resetAgentConfig.bind(settingsController));

// ============================================
// Agent Approvals — Pipeline 2E R2
// ============================================
router.get('/agent-approvals', checkPermission('settings', 'view'), validateQuery(listOrganizationsQuerySchema), settingsController.listAgentApprovals.bind(settingsController));
router.post('/agent-approvals/:id/approve', checkPermission('settings', 'edit'), validateParams(idParamSchema), audit({ action: AuditAction.APPROVE, resource: AuditResource.AGENT_APPROVAL, getResourceId: (req) => req.params.id }), settingsController.approveAgent.bind(settingsController));
router.post('/agent-approvals/:id/reject', checkPermission('settings', 'edit'), validateParams(idParamSchema), audit({ action: AuditAction.REJECT, resource: AuditResource.AGENT_APPROVAL, getResourceId: (req) => req.params.id }), settingsController.rejectAgent.bind(settingsController));

// ============================================
// Agent Approval Settings (singleton) — Pipeline 2E R2
// ============================================
router.get('/agent-approval-settings', checkPermission('settings', 'view'), settingsController.getAgentApprovalSettings.bind(settingsController));
router.put('/agent-approval-settings', checkPermission('settings', 'edit'), validateBody(updateAgentApprovalSettingsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.AGENT_APPROVAL_SETTINGS }), settingsController.updateAgentApprovalSettings.bind(settingsController));

// ============================================
// Enroll Secrets — Pipeline 2E R1
// ============================================
router.get('/enroll-secrets', checkPermission('settings', 'view'), settingsController.listEnrollSecrets.bind(settingsController));
router.get('/enroll-secrets/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getEnrollSecret.bind(settingsController));
router.post('/enroll-secrets', checkPermission('settings', 'add'), validateBody(createEnrollSecretSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ENROLL_SECRET }), settingsController.createEnrollSecret.bind(settingsController));
router.put('/enroll-secrets/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateEnrollSecretSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ENROLL_SECRET, getResourceId: (req) => req.params.id }), settingsController.updateEnrollSecret.bind(settingsController));
router.delete('/enroll-secrets/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ENROLL_SECRET, getResourceId: (req) => req.params.id }), settingsController.deleteEnrollSecret.bind(settingsController));

// ============================================
// RedHat Nominations — Pipeline 2E R5
// ============================================
router.get('/redhat-nominations', checkPermission('settings', 'view'), settingsController.listRedHatNominations.bind(settingsController));
router.get('/redhat-nominations/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getRedHatNomination.bind(settingsController));
router.post('/redhat-nominations', checkPermission('settings', 'add'), validateBody(createRedHatNominationSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.REDHAT_NOMINATION }), settingsController.createRedHatNomination.bind(settingsController));
router.put('/redhat-nominations/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateRedHatNominationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.REDHAT_NOMINATION, getResourceId: (req) => req.params.id }), settingsController.updateRedHatNomination.bind(settingsController));
router.delete('/redhat-nominations/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.REDHAT_NOMINATION, getResourceId: (req) => req.params.id }), settingsController.deleteRedHatNomination.bind(settingsController));

// ============================================
// Proxy Server (singleton)
// ============================================
router.get('/proxy-server', checkPermission('settings', 'view'), settingsController.getProxyServer.bind(settingsController));
router.put('/proxy-server', checkPermission('settings', 'edit'), validateBody(updateProxyServerSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.PROXY_SERVER }), settingsController.updateProxyServer.bind(settingsController));
router.post('/proxy-server/test', checkPermission('settings', 'edit'), validateBody(testProxyServerSchema), audit({ action: AuditAction.TEST, resource: AuditResource.PROXY_SERVER }), settingsController.testProxyServer.bind(settingsController));

// ============================================
// Mail Server (singleton)
// ============================================
router.get('/mail-server', checkPermission('settings', 'view'), settingsController.getMailServer.bind(settingsController));
router.put('/mail-server', checkPermission('settings', 'edit'), validateBody(updateMailServerSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.MAIL_SERVER }), settingsController.updateMailServer.bind(settingsController));
router.post('/mail-server/test', checkPermission('settings', 'edit'), validateBody(testMailServerSchema), audit({ action: AuditAction.TEST, resource: AuditResource.MAIL_SERVER }), settingsController.testMailServer.bind(settingsController));

// ============================================
// Audit Logs
// ============================================
router.get('/audit', validateQuery(auditLogQuerySchema), settingsController.listAuditLogs.bind(settingsController));
router.get('/audit/filter-options', settingsController.getAuditLogFilters.bind(settingsController));

// ============================================
// Vulnerability Preference (singleton)
// ============================================
router.get('/vulnerability-preference', settingsController.getVulnerabilityPreference.bind(settingsController));
router.put('/vulnerability-preference', validateBody(updateVulnerabilityPreferenceSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.VULNERABILITY_PREFERENCE }), settingsController.updateVulnerabilityPreference.bind(settingsController));
router.post('/vulnerability-preference/sync', audit({ action: AuditAction.SYNC, resource: AuditResource.VULNERABILITY_PREFERENCE }), settingsController.syncVulnerabilityDatabase.bind(settingsController));

// ============================================
// Platform License (singleton)
// ============================================
router.get('/platform-license', settingsController.getPlatformLicense.bind(settingsController));
router.put('/platform-license', validateBody(updateLicenseSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.PLATFORM_LICENSE }), settingsController.updatePlatformLicense.bind(settingsController));

// ============================================
// Computer Groups (R1 — hardened)
// ============================================
router.get('/computer-groups', checkPermission('settings', 'view'), validateQuery(computerGroupListQuerySchema), settingsController.listComputerGroups.bind(settingsController));
router.get('/computer-groups/available-endpoints', checkPermission('settings', 'view'), settingsController.getAvailableEndpoints.bind(settingsController));
router.get('/computer-groups/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getComputerGroup.bind(settingsController));
router.post('/computer-groups', checkPermission('settings', 'add'), validateBody(createComputerGroupSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.COMPUTER_GROUP }), settingsController.createComputerGroup.bind(settingsController));
router.put('/computer-groups/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateComputerGroupSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.COMPUTER_GROUP, getResourceId: (req) => req.params.id }), settingsController.updateComputerGroup.bind(settingsController));
router.delete('/computer-groups/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.COMPUTER_GROUP, getResourceId: (req) => req.params.id }), settingsController.deleteComputerGroup.bind(settingsController));

// ============================================
// Deployment Policies (R2 — consolidated DPOL-XXXX)
// ============================================
router.get('/deployment-policies', checkPermission('settings', 'view'), validateQuery(deploymentPolicyListQuerySchema), settingsController.listDeploymentPolicies.bind(settingsController));
router.get('/deployment-policies/:id', checkPermission('settings', 'view'), validateParams(stringIdParamSchema), settingsController.getDeploymentPolicy.bind(settingsController));
router.post('/deployment-policies', checkPermission('settings', 'add'), validateBody(createSettingsDeploymentPolicySchema), audit({ action: AuditAction.CREATE, resource: AuditResource.DEPLOYMENT_POLICY }), settingsController.createDeploymentPolicy.bind(settingsController));
router.put('/deployment-policies/:id', checkPermission('settings', 'edit'), validateParams(stringIdParamSchema), validateBody(updateSettingsDeploymentPolicySchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.DEPLOYMENT_POLICY, getResourceId: (req) => req.params.id }), settingsController.updateDeploymentPolicy.bind(settingsController));
router.delete('/deployment-policies/:id', checkPermission('settings', 'delete'), validateParams(stringIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.DEPLOYMENT_POLICY, getResourceId: (req) => req.params.id }), settingsController.deleteDeploymentPolicy.bind(settingsController));

// ============================================
// Distribution Servers
// ============================================
router.get('/distribution-servers', validateQuery(queryDistributionServersSchema), settingsController.listDistributionServers.bind(settingsController));
router.get('/distribution-servers/:id', validateParams(idParamSchema), settingsController.getDistributionServer.bind(settingsController));
router.post('/distribution-servers', checkPermission('settings', 'add'), validateBody(createDistributionServerSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.DISTRIBUTION_SERVER }), settingsController.createDistributionServer.bind(settingsController));
router.put('/distribution-servers/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateDistributionServerSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.DISTRIBUTION_SERVER, getResourceId: (req) => req.params.id }), settingsController.updateDistributionServer.bind(settingsController));
router.delete('/distribution-servers/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.DISTRIBUTION_SERVER, getResourceId: (req) => req.params.id }), settingsController.deleteDistributionServer.bind(settingsController));

// ============================================
// Branding
// ============================================
router.get('/branding', checkPermission('settings', 'view'), settingsController.getBranding.bind(settingsController));
router.post('/branding', checkPermission('settings', 'edit'), upload.single('logo'), audit({ action: AuditAction.UPDATE, resource: AuditResource.BRANDING }), settingsController.updateBranding.bind(settingsController));
router.get('/branding/logo', settingsController.getBrandingLogo.bind(settingsController));

// ============================================
// Vendor Logos
// ============================================
router.get('/vendor-logos', checkPermission('settings', 'view'), settingsController.listVendorLogos.bind(settingsController));
router.get('/vendor-logos/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getVendorLogo.bind(settingsController));
router.post('/vendor-logos', checkPermission('settings', 'add'), upload.single('logo'), audit({ action: AuditAction.CREATE, resource: AuditResource.VENDOR_LOGO }), settingsController.createVendorLogo.bind(settingsController));
router.put('/vendor-logos/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), upload.single('logo'), audit({ action: AuditAction.UPDATE, resource: AuditResource.VENDOR_LOGO, getResourceId: (req) => req.params.id }), settingsController.updateVendorLogo.bind(settingsController));
router.delete('/vendor-logos/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.VENDOR_LOGO, getResourceId: (req) => req.params.id }), settingsController.deleteVendorLogo.bind(settingsController));

// ============================================
// Risk Score Settings
// ============================================
router.get('/risk-score', checkPermission('settings', 'view'), settingsController.getRiskScoreSettings.bind(settingsController));
router.put('/risk-score', checkPermission('settings', 'edit'), validateBody(updateRiskScoreSettingsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.RISK_SCORE }), settingsController.updateRiskScoreSettings.bind(settingsController));

// ============================================
// Remote Desktop Settings
// ============================================
router.get('/remote-desktop', checkPermission('settings', 'view'), settingsController.getRemoteDesktopSettings.bind(settingsController));
router.put('/remote-desktop', checkPermission('settings', 'edit'), validateBody(updateRemoteDesktopSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.REMOTE_DESKTOP }), settingsController.updateRemoteDesktopSettings.bind(settingsController));
router.post('/remote-desktop/reset', checkPermission('settings', 'edit'), audit({ action: AuditAction.DELETE, resource: AuditResource.REMOTE_DESKTOP }), settingsController.resetRemoteDesktopSettings.bind(settingsController));

// ============================================
// Patch Management Settings (singleton)
// ============================================
router.get('/patch-management', settingsController.getPatchManagementSettings.bind(settingsController));
router.put('/patch-management', audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH_MANAGEMENT }), settingsController.updatePatchManagementSettings.bind(settingsController));

// ============================================
// Patch Preferences (R3 — singleton)
// ============================================
router.get('/patch-preferences', checkPermission('settings', 'view'), settingsController.getPatchPreferences.bind(settingsController));
router.put('/patch-preferences', checkPermission('settings', 'edit'), validateBody(updatePatchPreferenceSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.PATCH_MANAGEMENT }), settingsController.updatePatchPreferences.bind(settingsController));
router.post('/patch-preferences/sync', checkPermission('settings', 'edit'), audit({ action: AuditAction.SYNC, resource: AuditResource.PATCH_MANAGEMENT }), settingsController.syncPatchNow.bind(settingsController));

// ============================================
// Integrations (R5 — Marketplace CRUD)
// ============================================
router.get('/integrations', checkPermission('settings', 'view'), validateQuery(listIntegrationsQuerySchema), settingsController.listIntegrations.bind(settingsController));
router.get('/integrations/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getIntegration.bind(settingsController));
router.post('/integrations', checkPermission('settings', 'add'), validateBody(createIntegrationSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.INTEGRATION }), settingsController.createIntegration.bind(settingsController));
router.put('/integrations/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateIntegrationSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.INTEGRATION, getResourceId: (req) => req.params.id }), settingsController.updateIntegration.bind(settingsController));
router.delete('/integrations/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.INTEGRATION, getResourceId: (req) => req.params.id }), settingsController.deleteIntegration.bind(settingsController));
router.put('/integrations/:id/toggle', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(toggleIntegrationStatusSchema), audit({ action: AuditAction.TOGGLE, resource: AuditResource.INTEGRATION, getResourceId: (req) => req.params.id }), settingsController.toggleIntegration.bind(settingsController));
router.post('/integrations/:id/test', checkPermission('settings', 'edit'), validateParams(idParamSchema), audit({ action: AuditAction.TEST, resource: AuditResource.INTEGRATION, getResourceId: (req) => req.params.id }), settingsController.testIntegration.bind(settingsController));

export { router as settingsRoutes };
