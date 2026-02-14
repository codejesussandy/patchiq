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

export const stringIdParamSchema = z.object({
  id: z.string().min(1),
});

export const ldapConfigParamSchema = z.object({
  id: z.string().min(1),
});

// List query schemas for organizations, branches, etc.
export const listOrganizationsQuerySchema = paginationSchema;

export const listBranchesQuerySchema = paginationSchema.extend({
  organizationId: z.string().uuid().optional(),
});

export const listDepartmentsQuerySchema = paginationSchema.extend({
  branchId: z.string().uuid().optional(),
});

export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;
export type ListBranchesQuery = z.infer<typeof listBranchesQuerySchema>;
export type ListDepartmentsQuery = z.infer<typeof listDepartmentsQuerySchema>;

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
  role: z.string().default('USER'),
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
  role: z.string().default('USER'),
  organizationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
});

export const userListQuerySchema = paginationSchema.extend({
  status: z.enum(['Active', 'Suspended', 'Invite Sent', 'Deleted']).optional(),
  role: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  authSource: z.enum(['LOCAL', 'LDAP']).optional(),
  sortBy: z.enum(['name', 'email', 'role', 'status', 'lastLoginAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;

// ============================================
// Role Validators
// ============================================

const modulePermissionsSchema = z.object({
  view: z.boolean(),
  add: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
}).strict();

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
  }).strict().optional().default({}),
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
  }).strict().optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ============================================
// Alert Config Validators
// ============================================

const alertConditionSchema = z.object({
  attribute: z.enum([
    'CPU Usage', 'Memory Usage', 'Disk Usage',
    'Pending Reboot', 'Firewall Status', 'Antivirus Status',
  ]),
  operator: z.enum([
    '>=', '<=', '>', '<', '==', '!=',
    'equals', 'not_equals', 'is', 'is not',
  ]),
  value: z.union([z.number(), z.boolean(), z.string()]),
});

const alertActionSchema = z.object({
  type: z.enum(['notification', 'email', 'webhook']),
  target: z.string().min(1).max(500).optional(),
  message: z.string().max(1000).optional(),
});

const alertRemediationSchema = z.object({
  type: z.enum(['script', 'restart', 'notify']),
  target: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
});

export const alertSeverityEnum = z.enum(['CRITICAL', 'WARNING', 'INFO']);
export const alertTypeEnum = z.enum(['threshold', 'boolean', 'status-change']);

export const createAlertConfigSchema = z.object({
  name: z.string().min(1).max(200),
  type: alertTypeEnum,
  channel: z.string().max(100).optional(),
  recipients: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(1000).optional(),
  module: z.string().max(100).optional(),
  severity: alertSeverityEnum.optional(),
  scope: z.string().max(200).optional(),
  endpoints: z.string().max(500).optional(),
  conditions: z.array(alertConditionSchema).optional(),
  actions: z.array(alertActionSchema).optional(),
  remediations: z.array(alertRemediationSchema).optional(),
});

export const updateAlertConfigSchema = createAlertConfigSchema.partial();

export type CreateAlertConfigInput = z.infer<typeof createAlertConfigSchema>;
export type UpdateAlertConfigInput = z.infer<typeof updateAlertConfigSchema>;

// ============================================
// LDAP Config Validators
// ============================================

export const createLdapConfigSchema = z.object({
  name: z.string().min(1).max(100),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).default(389),
  // Support both old field names (baseDn, bindDn, bindPassword) and new ones (baseDN, username, password)
  baseDn: z.string().min(1).max(255).optional(),
  baseDN: z.string().min(1).max(255).optional(),
  bindDn: z.string().min(1).max(255).optional(),
  username: z.string().min(1).max(255).optional(),
  bindPassword: z.string().min(1).max(255).optional(),
  password: z.string().min(1).max(255).optional(),
  // Additional optional fields from frontend
  fqdn: z.string().max(255).optional(),
  groupBase: z.string().max(255).optional(),
  protocol: z.enum(['LDAP', 'LDAPS']).optional(),
  timeout: z.number().int().min(0).max(300).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  enableAutoSync: z.boolean().optional(),
  autoSyncInterval: z.string().max(50).optional(),
  userFilter: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
}).refine((data) => data.baseDn || data.baseDN, {
  message: "baseDn or baseDN is required",
  path: ["baseDn"],
}).refine((data) => data.bindDn || data.username, {
  message: "bindDn or username is required",
  path: ["bindDn"],
}).refine((data) => data.bindPassword || data.password, {
  message: "bindPassword or password is required",
  path: ["bindPassword"],
});

export const updateLdapConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  host: z.string().min(1).max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  baseDn: z.string().min(1).max(255).optional(),
  baseDN: z.string().min(1).max(255).optional(),
  bindDn: z.string().min(1).max(255).optional(),
  username: z.string().min(1).max(255).optional(),
  bindPassword: z.string().min(1).max(255).optional(),
  password: z.string().min(1).max(255).optional(),
  fqdn: z.string().max(255).optional().nullable(),
  groupBase: z.string().max(255).optional().nullable(),
  protocol: z.enum(['LDAP', 'LDAPS']).optional(),
  timeout: z.number().int().min(0).max(300).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional(),
  enableAutoSync: z.boolean().optional(),
  autoSyncInterval: z.string().max(50).optional().nullable(),
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
  sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
  sessionIdleTimeoutMinutes: z.number().int().min(1).optional(),
  endpointOnlineStatusTimeoutHours: z.number().int().min(1).max(168).optional(),
  endpointScanJobTimeoutHours: z.number().int().min(1).max(72).optional(),
  logLevel: z.enum(['Debug', 'Info', 'Warning', 'Error']).optional(),
}).refine(
  (data) => {
    if (data.sessionIdleTimeoutMinutes !== undefined && data.sessionTimeoutMinutes !== undefined) {
      return data.sessionIdleTimeoutMinutes <= data.sessionTimeoutMinutes;
    }
    return true;
  },
  {
    message: 'sessionIdleTimeoutMinutes must be less than or equal to sessionTimeoutMinutes',
    path: ['sessionIdleTimeoutMinutes'],
  }
);

export type UpdateServerSettingsInput = z.infer<typeof updateServerSettingsSchema>;

// ============================================
// Agent Config Validators
// ============================================

export const updateAgentConfigSchema = z.object({
  allowedBandwidth: z.number().int().min(1).max(10000).optional(),           // 1 Mbps – 10 Gbps
  agentRefreshCycle: z.number().int().min(60).max(86400).optional(),         // 1 min – 24 hours
  systemActionRefreshCycle: z.number().int().min(60).max(86400).optional(),
  endpointVlanRefreshCycle: z.number().int().min(300).max(86400).optional(), // 5 min – 24 hours
  patchScanningRefreshCycle: z.number().int().min(300).max(604800).optional(), // 5 min – 7 days
  softwareRefreshCycle: z.number().int().min(300).max(604800).optional(),
  hardwareRefreshCycle: z.number().int().min(300).max(604800).optional(),
  systemProcessRefreshCycle: z.number().int().min(60).max(86400).optional(),
  systemServiceRefreshCycle: z.number().int().min(60).max(86400).optional(),
  networkRefreshCycle: z.number().int().min(60).max(86400).optional(),
  networkSharesRefreshCycle: z.number().int().min(300).max(604800).optional(),
  riskDetectionRefreshCycle: z.number().int().min(300).max(604800).optional(),
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
}).refine(
  (data) => {
    // R3A: If proxy is enabled, host and port are required
    if (data.enabled === true) {
      return data.host && data.port;
    }
    return true;
  },
  {
    message: 'Host and port are required when proxy is enabled',
    path: ['host'],
  }
).refine(
  (data) => {
    // R3A: If authentication is enabled, username is required
    if (data.enableAuthentication === true) {
      return data.username;
    }
    return true;
  },
  {
    message: 'Username is required when authentication is enabled',
    path: ['username'],
  }
);

export const testProxyServerSchema = z.object({
  // Test endpoint should use saved config, not require all fields
  testUrl: z.string().url().optional(),
});

export type UpdateProxyServerInput = z.infer<typeof updateProxyServerSchema>;
export type TestProxyServerInput = z.infer<typeof testProxyServerSchema>;

// ============================================
// Mail Server Validators
// ============================================

const hostnameRegex = /^[a-zA-Z0-9._-]+$/;

export const updateMailServerSchema = z.object({
  host: z.string().min(1).max(255).trim().regex(hostnameRegex, 'Invalid hostname'),
  port: z.coerce.number().int().min(1).max(65535),
  protocol: z.enum(['NONE', 'SSL', 'TLS']),
  fromAddress: z.string().email('Invalid email format'),
  fromName: z.string().max(100).optional(),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
});

export const testMailServerSchema = z.object({
  testEmail: z.string().email('Invalid email format'),
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
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().min(1).optional(),
});

export const updateEnrollSecretSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  organizationId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateEnrollSecretInput = z.infer<typeof createEnrollSecretSchema>;
export type UpdateEnrollSecretInput = z.infer<typeof updateEnrollSecretSchema>;

// ============================================
// Integration Validators
// ============================================

export const integrationTypeEnum = z.enum(['siem', 'ticketing', 'notification', 'monitoring', 'backup', 'custom']);

export const listIntegrationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: integrationTypeEnum.optional(),
  search: z.string().max(200).optional(),
  enabled: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

export const createIntegrationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  type: integrationTypeEnum,
  enabled: z.boolean().default(false),
  iconUrl: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
});

export const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional(),
  iconUrl: z.string().url().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

export const toggleIntegrationStatusSchema = z.object({
  enabled: z.boolean(),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;
export type ListIntegrationsQuery = z.infer<typeof listIntegrationsQuerySchema>;

// ============================================
// Computer Group Validators
// ============================================

export const createComputerGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  description: z.string().max(500).optional().nullable(),
  endpoints: z.array(z.string().uuid('Each endpoint must be a valid asset UUID')).default([]),
});

export const updateComputerGroupSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  endpoints: z.array(z.string().uuid('Each endpoint must be a valid asset UUID')).optional(),
});

export const computerGroupListQuerySchema = paginationSchema;

export type CreateComputerGroupInput = z.infer<typeof createComputerGroupSchema>;
export type UpdateComputerGroupInput = z.infer<typeof updateComputerGroupSchema>;

// ============================================
// Deployment Policy Validators (R2 — Settings Module)
// ============================================

export const createSettingsDeploymentPolicySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  description: z.string().max(500).optional(),
  type: z.enum(['INSTANT', 'SCHEDULE']).default('INSTANT'),
  supportedModule: z.enum(['All', 'Patch', 'Update', 'Security']).default('All'),
  relatedType: z.enum(['No Relation', 'Critical', 'Important', 'Optional']).default('No Relation'),
});

export const updateSettingsDeploymentPolicySchema = createSettingsDeploymentPolicySchema.partial();

export const deploymentPolicyListQuerySchema = paginationSchema.extend({
  type: z.enum(['INSTANT', 'SCHEDULE']).optional(),
});

export type CreateSettingsDeploymentPolicyInput = z.infer<typeof createSettingsDeploymentPolicySchema>;
export type UpdateSettingsDeploymentPolicyInput = z.infer<typeof updateSettingsDeploymentPolicySchema>;

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

const validOSOptions = ['Windows', 'Ubuntu', 'macOS', 'Red Hat', 'CentOS', 'Debian', 'SUSE', 'Fedora', 'Oracle Linux'] as const;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export const updatePatchPreferenceSchema = z.object({
  enablePatching: z.boolean().optional(),
  corridorOnlyApprovedPatch: z.boolean().optional(),
  patchSyncForOS: z.array(z.enum(validOSOptions)).min(0).optional(),
  patchApprovalPolicy: z.enum(['PreApproved', 'ManuallyApproves', 'TestAndApprove']).optional(),
  enableThirdPartyPatching: z.boolean().optional(),
  patchApprovalScheduleTime: z.string()
    .regex(timeRegex, 'Must be valid time in HH:mm:ss format (00:00:00 - 23:59:59)')
    .optional(),
  scheduleTime: z.string()
    .regex(timeRegex, 'Must be valid time in HH:mm:ss format (00:00:00 - 23:59:59)')
    .optional(),
  zeroTouchDeploymentScheduleTime: z.string()
    .regex(timeRegex, 'Must be valid time in HH:mm:ss format (00:00:00 - 23:59:59)')
    .optional(),
});

export type UpdatePatchPreferenceInput = z.infer<typeof updatePatchPreferenceSchema>;

// ============================================
// Agent Approval Validators
// ============================================

export const updateAgentApprovalSettingsSchema = z.object({
  approvalType: z.enum(['AUTO', 'MANUAL']).optional(),
  autoApprovalBasedOn: z.enum(['ALL', 'CRITERIA']).optional(),
  criteria: z.object({
    osPatterns: z.array(z.string()).optional(),
  }).optional(),
});

export type UpdateAgentApprovalSettingsInput = z.infer<typeof updateAgentApprovalSettingsSchema>;

// ============================================
// Distribution Server Validators
// ============================================

export const queryDistributionServersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'location', 'status', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const createDistributionServerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  description: z.string().max(500).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  url: z.string().url('Must be a valid URL'),
  version: z.string().max(50).optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Maintenance']).default('Active'),
});

export const updateDistributionServerSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  url: z.string().url('Must be a valid URL').optional(),
  version: z.string().max(50).optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Maintenance']).optional(),
});

export type QueryDistributionServersInput = z.infer<typeof queryDistributionServersSchema>;
export type CreateDistributionServerInput = z.infer<typeof createDistributionServerSchema>;
export type UpdateDistributionServerInput = z.infer<typeof updateDistributionServerSchema>;

// ============================================
// Red Hat Nomination Validators
// ============================================

export const createRedHatNominationSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().min(1).max(200),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endpoint: z.number().int().optional(),
});

export const updateRedHatNominationSchema = z.object({
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export type CreateRedHatNominationInput = z.infer<typeof createRedHatNominationSchema>;
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
}).refine(
  (data) => {
    // Only validate weight sum when custom weights are provided (not using defaults)
    if (data.applyDefaultSettings === true) return true;
    const weights = [
      data.vulnerabilityScoreWeight,
      data.vulnerabilitySeverityWeight,
      data.threatsWeight,
      data.endpointVisitsWeight,
    ];
    // Only validate if all four weights are provided
    if (weights.every((w) => w !== undefined)) {
      const sum = weights.reduce((acc, w) => acc + (w as number), 0);
      return Math.abs(sum - 1.0) <= 0.01;
    }
    return true;
  },
  { message: 'Weights must sum to 1.0' }
);

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

// ============================================
// Branding Validators
// ============================================

export const updateBrandingSchema = z.object({
  companyName: z.string().min(1).max(100).trim().refine(val => !/<[^>]*>/.test(val), 'HTML tags not allowed').optional(),
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;

// ============================================
// Remote Desktop Validators
// ============================================

export const updateRemoteDesktopSchema = z.object({
  connectionType: z.enum(['Local', 'Remote']).optional(),
  remoteSessionIndicator: z.boolean().optional(),
  userConsent: z.boolean().optional(),
});

export type UpdateRemoteDesktopInput = z.infer<typeof updateRemoteDesktopSchema>;

// ============================================
// LDAP Group Mapping Validators
// ============================================

export const createGroupMappingSchema = z.object({
  ldapGroupDn: z.string().min(1).max(500),
  roleId: z.string().uuid(),
  priority: z.number().int().min(0).max(1000).optional().default(100),
});

export const updateGroupMappingSchema = z.object({
  ldapGroupDn: z.string().min(1).max(500).optional(),
  roleId: z.string().uuid().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
});

export type CreateGroupMappingInput = z.infer<typeof createGroupMappingSchema>;
export type UpdateGroupMappingInput = z.infer<typeof updateGroupMappingSchema>;

// ============================================
// Bulk User Import Validators (R5)
// ============================================

export const bulkImportSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    role: z.string().default('user'),
    organizationId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    locationId: z.string().uuid().optional(),
    contactNumber: z.string().max(50).optional(),
    sendInvite: z.boolean().default(false),
  })).min(1, 'At least 1 user required').max(500, 'Maximum 500 users per import'),
});

export type BulkImportInput = z.infer<typeof bulkImportSchema>;

// ============================================
// Bulk User Action Validators (R6)
// ============================================

export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least 1 user required').max(100, 'Maximum 100 users per request'),
});

export type BulkUserActionInput = z.infer<typeof bulkUserActionSchema>;
