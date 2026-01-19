import { z } from 'zod';

// ============================================
// Common Validators
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

// ============================================
// Organization Validators
// ============================================

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional().default(false),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// ============================================
// Branch Validators
// ============================================

export const createBranchSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  organizationId: z.string().uuid(),
  isDefault: z.boolean().optional().default(false),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  manager: z.string().uuid().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  manager: z.string().uuid().optional().nullable(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

// ============================================
// Department Validators
// ============================================

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  branchId: z.string().uuid(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

// ============================================
// Location Validators
// ============================================

export const createLocationSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ============================================
// User Validators
// ============================================

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128).optional(),
  role: z.string().default('user'),
  organizationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  contactNumber: z.string().max(50).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.string().optional(),
  organizationId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  contactNumber: z.string().max(50).optional().nullable(),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  role: z.string().default('user'),
  organizationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
});

export const userListQuerySchema = paginationSchema.extend({
  status: z.enum(['Active', 'Suspended', 'Invite Sent']).optional(),
  role: z.string().optional(),
  organizationId: z.string().uuid().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

// ============================================
// Role Validators
// ============================================

const modulePermissionsSchema = z.object({
  view: z.boolean().default(false),
  add: z.boolean().default(false),
  edit: z.boolean().default(false),
  delete: z.boolean().default(false),
});

export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.object({
    agents: modulePermissionsSchema.optional(),
    assets: modulePermissionsSchema.optional(),
    patches: modulePermissionsSchema.optional(),
    vulnerabilities: modulePermissionsSchema.optional(),
    jobs: modulePermissionsSchema.optional(),
    discovery: modulePermissionsSchema.optional(),
    reports: modulePermissionsSchema.optional(),
    dashboard: modulePermissionsSchema.optional(),
    settings: modulePermissionsSchema.optional(),
  }).optional().default({}),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  permissions: z.object({
    agents: modulePermissionsSchema.optional(),
    assets: modulePermissionsSchema.optional(),
    patches: modulePermissionsSchema.optional(),
    vulnerabilities: modulePermissionsSchema.optional(),
    jobs: modulePermissionsSchema.optional(),
    discovery: modulePermissionsSchema.optional(),
    reports: modulePermissionsSchema.optional(),
    dashboard: modulePermissionsSchema.optional(),
    settings: modulePermissionsSchema.optional(),
  }).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ============================================
// Alert Config Validators
// ============================================

export const updateAlertConfigSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

export type UpdateAlertConfigInput = z.infer<typeof updateAlertConfigSchema>;

// ============================================
// LDAP Config Validators
// ============================================

export const createLdapConfigSchema = z.object({
  name: z.string().min(1).max(100),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).default(389),
  baseDn: z.string().min(1).max(255),
  bindDn: z.string().min(1).max(255),
  bindPassword: z.string().min(1).max(255),
  userFilter: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const updateLdapConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  host: z.string().min(1).max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  baseDn: z.string().min(1).max(255).optional(),
  bindDn: z.string().min(1).max(255).optional(),
  bindPassword: z.string().min(1).max(255).optional(),
  userFilter: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateLdapConfigInput = z.infer<typeof createLdapConfigSchema>;
export type UpdateLdapConfigInput = z.infer<typeof updateLdapConfigSchema>;

// ============================================
// Server Settings Validators
// ============================================

export const updateServerSettingsSchema = z.object({
  sessionTimeout: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().min(1).max(1440).optional(),
  sessionIdleTimeoutMinutes: z.number().int().min(1).max(1440).optional(),
  endpointOnlineStatusTimeoutHours: z.number().int().min(1).max(168).optional(),
  endpointScanJobTimeoutHours: z.number().int().min(1).max(168).optional(),
  logLevel: z.enum(['Debug', 'Info', 'Warning', 'Error']).optional(),
});

export type UpdateServerSettingsInput = z.infer<typeof updateServerSettingsSchema>;

// ============================================
// Agent Config Validators
// ============================================

export const updateAgentConfigSchema = z.object({
  allowedBandwidth: z.number().int().min(1).optional(),
  agentRefreshCycle: z.number().int().min(10).optional(),
  systemActionRefreshCycle: z.number().int().min(10).optional(),
  endpointVlanRefreshCycle: z.number().int().min(10).optional(),
  patchScanningRefreshCycle: z.number().int().min(10).optional(),
  ssdmRefreshCycle: z.number().int().min(10).optional(),
  processRefreshCycle: z.number().int().min(10).optional(),
  networkRefreshCycle: z.number().int().min(10).optional(),
  certificateRefreshCycle: z.number().int().min(10).optional(),
  startupItemsRefreshCycle: z.number().int().min(10).optional(),
  usersRefreshCycle: z.number().int().min(10).optional(),
  systemResourcesRefreshCycle: z.number().int().min(10).optional(),
  systemServicesRefreshCycle: z.number().int().min(10).optional(),
  fimEventsRefreshCycle: z.number().int().min(10).optional(),
  softwareMeterRefreshCycle: z.number().int().min(10).optional(),
});

export type UpdateAgentConfigInput = z.infer<typeof updateAgentConfigSchema>;

// ============================================
// Proxy Server Validators
// ============================================

export const updateProxyServerSchema = z.object({
  enabled: z.boolean().optional(),
  host: z.string().max(255).optional().nullable(),
  port: z.number().int().min(1).max(65535).optional().nullable(),
  protocol: z.enum(['HTTP', 'HTTPS', 'SOCKS5']).optional().nullable(),
  enableAuthentication: z.boolean().optional(),
  username: z.string().max(100).optional().nullable(),
  password: z.string().max(255).optional().nullable(),
});

export const testProxyServerSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(['HTTP', 'HTTPS', 'SOCKS5']),
  enableAuthentication: z.boolean().optional(),
  username: z.string().max(100).optional(),
  password: z.string().max(255).optional(),
});

export type UpdateProxyServerInput = z.infer<typeof updateProxyServerSchema>;
export type TestProxyServerInput = z.infer<typeof testProxyServerSchema>;

// ============================================
// Mail Server Validators
// ============================================

export const updateMailServerSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(true),
  username: z.string().max(255).optional().nullable(),
  password: z.string().max(255).optional().nullable(),
  fromAddress: z.string().email().optional().nullable(),
  fromName: z.string().max(100).optional().nullable(),
});

export const testMailServerSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(true),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  testEmail: z.string().email(),
});

export type UpdateMailServerInput = z.infer<typeof updateMailServerSchema>;
export type TestMailServerInput = z.infer<typeof testMailServerSchema>;

// ============================================
// Audit Log Validators
// ============================================

export const auditLogQuerySchema = paginationSchema.extend({
  action: z.string().optional(),
  resource: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;

// ============================================
// License Validators
// ============================================

export const updateLicenseSchema = z.object({
  licenseCode: z.string().min(1),
});

export type UpdateLicenseInput = z.infer<typeof updateLicenseSchema>;

// ============================================
// Enroll Secret Validators
// ============================================

export const createEnrollSecretSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export const updateEnrollSecretSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  organizationId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
});

export type CreateEnrollSecretInput = z.infer<typeof createEnrollSecretSchema>;
export type UpdateEnrollSecretInput = z.infer<typeof updateEnrollSecretSchema>;

// ============================================
// Integration Validators
// ============================================

export const createIntegrationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  type: z.string().min(1).max(100),
  enabled: z.boolean().default(false),
  iconUrl: z.string().url().optional(),
  recipients: z.array(z.string()).optional().default([]),
  config: z.record(z.unknown()).optional(),
});

export const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional(),
  iconUrl: z.string().url().optional().nullable(),
  recipients: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

export const toggleIntegrationStatusSchema = z.object({
  enabled: z.boolean(),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;

// ============================================
// Computer Group Validators
// ============================================

export const createComputerGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  criteria: z.record(z.unknown()).optional(),
});

export const updateComputerGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  criteria: z.record(z.unknown()).optional().nullable(),
});

export type CreateComputerGroupInput = z.infer<typeof createComputerGroupSchema>;
export type UpdateComputerGroupInput = z.infer<typeof updateComputerGroupSchema>;

// ============================================
// Vulnerability Preference Validators
// ============================================

export const updateVulnerabilityPreferenceSchema = z.object({
  scanJobInterval: z.number().int().min(1).optional(),
  scanJobUnit: z.enum(['Hour', 'Day', 'Week']).optional(),
  databaseSyncTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
});

export type UpdateVulnerabilityPreferenceInput = z.infer<typeof updateVulnerabilityPreferenceSchema>;

// ============================================
// Patch Preference Validators
// ============================================

export const updatePatchPreferenceSchema = z.object({
  enablePatching: z.boolean().optional(),
  corridorOnlyApprovedPatch: z.boolean().optional(),
  patchSyncForOS: z.array(z.string()).optional(),
  patchApprovalPolicy: z.enum(['PreApproved', 'ManuallyApproves', 'TestAndApprove']).optional(),
  enableThirdPartyPatching: z.boolean().optional(),
  patchApprovalScheduleTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  zeroTouchDeploymentScheduleTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
});

export type UpdatePatchPreferenceInput = z.infer<typeof updatePatchPreferenceSchema>;

// ============================================
// Agent Approval Validators
// ============================================

export const updateAgentApprovalSettingsSchema = z.object({
  approvalType: z.enum(['auto', 'manual']).optional(),
  autoApprovalBasedOn: z.enum(['all', 'criteria']).optional(),
});

export type UpdateAgentApprovalSettingsInput = z.infer<typeof updateAgentApprovalSettingsSchema>;

// ============================================
// Distribution Server Validators
// ============================================

export const createDistributionServerSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  location: z.string().max(255).optional(),
  url: z.string().url(),
  version: z.string().max(50).optional(),
});

export const updateDistributionServerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  url: z.string().url().optional(),
  version: z.string().max(50).optional().nullable(),
});

export type CreateDistributionServerInput = z.infer<typeof createDistributionServerSchema>;
export type UpdateDistributionServerInput = z.infer<typeof updateDistributionServerSchema>;

// ============================================
// Red Hat Nomination Validators
// ============================================

export const updateRedHatNominationSchema = z.object({
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export type UpdateRedHatNominationInput = z.infer<typeof updateRedHatNominationSchema>;

// ============================================
// Risk Score Validators
// ============================================

export const updateRiskScoreSettingsSchema = z.object({
  applyDefaultSettings: z.boolean().optional(),
  vulnerabilityScoreWeight: z.number().min(0).max(1).optional(),
  vulnerabilitySeverityWeight: z.number().min(0).max(1).optional(),
  threatsWeight: z.number().min(0).max(1).optional(),
  endpointVisitsWeight: z.number().min(0).max(1).optional(),
});

export type UpdateRiskScoreSettingsInput = z.infer<typeof updateRiskScoreSettingsSchema>;

// ============================================
// Password Policy Validators
// ============================================

export const updatePasswordPolicySchema = z.object({
  minCharacterCount: z.number().int().min(1).max(128).optional(),
  minNumbers: z.boolean().optional(),
  minLowerCaseCharacters: z.boolean().optional(),
  minUpperCaseCharacters: z.boolean().optional(),
  minSpecialCharacters: z.boolean().optional(),
});

export type UpdatePasswordPolicyInput = z.infer<typeof updatePasswordPolicySchema>;
