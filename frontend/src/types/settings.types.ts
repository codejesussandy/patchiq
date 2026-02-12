import type { ApprovalStatus } from '@shared/types';

// Re-export shared API types for settings
export type {
  OrganizationResponse,
  BranchResponse,
  DepartmentResponse,
  LocationResponse,
  UserListItem,
  UserDetailResponse,
  UserAuditLogEntry,
  ModulePermissions,
  RolePermissions,
  RoleResponse,
  AlertConfigResponse,
  LdapConfigResponse,
  ServerSettingsResponse,
  AgentConfigSettingsResponse,
  ProxyServerResponse,
  MailServerResponse,
  AuditLogResponse,
  AuditLogFilterOptions,
  PlatformLicenseResponse,
  EnrollSecretResponse,
  IntegrationResponse,
  ComputerGroupResponse,
  DeploymentPolicyResponse,
  VulnerabilityPreferenceResponse,
  PatchPreferenceResponse,
  BrandingResponse,
  AgentApprovalSettingsResponse,
  AgentApprovalResponse,
  DistributionServerResponse,
  RedHatNominationResponse,
  VendorLogoResponse,
} from '@shared/types';

// Re-export User types for convenience
export type { User, UserFormData, InviteUserFormData } from './user.types';

// UI-specific Branch type (extra form fields)
export type Branch = {
  id: string;
  name: string;
  status: 'Default' | 'Active' | 'Inactive';
  users: number;
  assets: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  manager: string;
  isDefault: boolean;
  description?: string;
};

export type BranchFormData = Omit<Branch, 'id' | 'users' | 'assets' | 'status'>;

// UI-specific Role type
export type Role = {
  id: string;
  name: string;
  description: string;
  users: number;
  branch: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt?: string;
  capabilities?: string[];
};

export type Permission = {
  module: string;
  actions: string[];
};

export type RoleFormData = {
  name: string;
  description: string;
  branch?: string;
  permissions?: Permission[];
  template?: string;
  capabilities?: string[];
};

// Policy Types (UI-specific)
export type Policy = {
  id: string;
  name: string;
  type: string;
  orgUnit: string;
  users: number;
  description: string;
  configuration: PolicyConfiguration;
  affectedRoles: string[];
  effectiveDate?: string;
  status: 'Active' | 'Inactive' | 'Draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PolicyConfiguration = {
  resetDuration?: string;
  changeEveryDays?: number;
  lastNPasswordHistory?: number;
  minCharacterCount?: number;
  maxCharacterCount?: number;
  minLowerCaseCharacters?: number;
  minUpperCaseCharacters?: number;
  minNumbers?: number;
  minSpecialCharacters?: number;
  [key: string]: unknown;
};

export type PolicyFormData = {
  name: string;
  type: string;
  branch: string;
  roles: string[];
  description: string;
  configuration: PolicyConfiguration;
};

// UI-specific Deployment Policy type
export type DeploymentPolicy = {
  id: string;
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  supportedModule: string;
  relatedType: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
};

export type DeploymentPolicyFormData = {
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  supportedModule: string;
  relatedType: string;
};

// Mail Server Configuration Types (UI-specific)
export type MailServerConfig = {
  smtpHost: string;
  smtpPort: number;
  protocol: 'NONE' | 'SSL' | 'TLS';
  email: string;
  enableAuthentication: boolean;
  username?: string;
  password?: string;
  testEmail?: string;
};

// Proxy Server Configuration Types (UI-specific)
export type ProxyServerConfig = {
  enabled: boolean;
  host?: string;
  port?: number;
  protocol?: 'HTTP' | 'HTTPS' | 'SOCKS5';
  username?: string;
  password?: string;
  noProxyList?: string[];
};

// Vendor Logo Types (UI-specific)
export type VendorLogo = {
  id: string;
  name: string;
  type: 'integration' | 'vendor' | 'os';
  logoUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt?: string;
};

export type VendorLogoFormData = {
  name: string;
  type: 'integration' | 'vendor' | 'os';
  logo: File;
};

// LDAP Server Configuration Types (UI-specific)
export type LDAPServerConfig = {
  id: string;
  name: string;
  host: string;
  port?: number;
  fqdn?: string;
  baseDN?: string;
  username?: string;
  password?: string;
  groupBase?: string;
  protocol?: 'LDAP' | 'LDAPS';
  timeout?: number;
  isDefault?: boolean;
  enabled?: boolean;
  enableAutoSync?: boolean;
  autoSyncInterval?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
};

export type LDAPServerFormData = Omit<LDAPServerConfig, 'id' | 'createdAt' | 'updatedAt'>;

// Risk Score Types (UI-specific)
export type RiskScore = {
  id: string;
  applyDefaultSettings: boolean;
  vulnerabilityScoreWeight: number;
  vulnerabilitySeverityWeight: number;
  threatsWeight: number;
  endpointVisitsWeight: number;
  createdAt: string;
  updatedAt?: string;
};

export type RiskScoreFormData = Omit<RiskScore, 'id' | 'createdAt' | 'updatedAt'>;

// Remote Desktop Settings Types (UI-specific)
export type RemoteDesktopSettings = {
  id: string;
  connectionType: 'Local' | 'Remote';
  remoteSessionIndicator: boolean;
  userConsent: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type RemoteDesktopSettingsFormData = Omit<RemoteDesktopSettings, 'id' | 'createdAt' | 'updatedAt'>;

// Server Settings Types (UI-specific)
export type ServerSettings = {
  id: string;
  sessionTimeout: boolean;
  sessionTimeoutMinutes: number;
  sessionIdleTimeoutMinutes: number;
  endpointOnlineStatusTimeoutHours: number;
  endpointScanJobTimeoutHours: number;
  logLevel: 'Debug' | 'Info' | 'Warning' | 'Error';
  createdAt: string;
  updatedAt?: string;
};

export type ServerSettingsFormData = Omit<ServerSettings, 'id' | 'createdAt' | 'updatedAt'>;

// Marketplace/Integration Types (UI-specific)
export type Integration = {
  id: string;
  name: string;
  description: string;
  type: string;
  status: boolean;
  createdBy: string;
  createdAt: string;
  icon?: string;
  enabled?: boolean;
  recipients?: string[];
};

export type IntegrationFormData = {
  name: string;
  description: string;
  type: string;
  enabled?: boolean;
  recipients?: string[];
};

// Agent Approval Settings Types (UI-specific)
export type AgentApprovalSettings = {
  id?: string;
  approvalType: 'auto' | 'manual';
  autoApprovalBasedOn: 'all' | 'criteria';
  createdAt?: string;
  updatedAt?: string;
};

export type AgentApprovalSettingsFormData = Omit<
  AgentApprovalSettings,
  'id' | 'createdAt' | 'updatedAt'
>;

// Vulnerability Preference Types (UI-specific)
export type VulnerabilityPreference = {
  id: string;
  lastSyncAt: string;
  scanJobInterval: number;
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;
  totalCveCount?: number;
  createdAt: string;
  updatedAt?: string;
};

export type VulnerabilityPreferenceFormData = {
  scanJobInterval: number;
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;
};

// Agent Configuration Types (UI-specific)
export type AgentConfiguration = {
  id: string;
  allowedBandwidth: number;
  agentRefreshCycle: number;
  systemActionRefreshCycle: number;
  endpointVlanRefreshCycle: number;
  patchScanningRefreshCycle: number;
  ssdmRefreshCycle: number;
  processRefreshCycle: number;
  networkRefreshCycle: number;
  certificateRefreshCycle: number;
  startupItemsRefreshCycle: number;
  usersRefreshCycle: number;
  systemResourcesRefreshCycle: number;
  systemServicesRefreshCycle: number;
  fimEventsRefreshCycle: number;
  softwareMeterRefreshCycle: number;
  createdAt: string;
  updatedAt?: string;
};

export type AgentConfigurationFormData = Omit<AgentConfiguration, 'id' | 'createdAt' | 'updatedAt'>;

// Agent Approval Types — alias for shared ApprovalStatus
export type AgentApprovalStatus = ApprovalStatus;

export type AgentApproval = {
  id: string;
  uuid: string;
  hostName: string;
  ipAddresses: string[];
  createdOn: string;
  performedBy: string;
  status: AgentApprovalStatus;
};

// Enroll Secret Types (UI-specific)
export type EnrollSecret = {
  id: string;
  name: string;
  secret: string;
  organization: string;
  department: string;
  createdOn: string;
};

export type EnrollSecretFormData = Omit<EnrollSecret, 'id' | 'createdOn'>;

// Red Hat Agent Nomination Types (UI-specific)
export type RedHatAgentNomination = {
  id: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  endpoint: number;
  scheduledTime?: string;
  lastSyncTime: string;
  updatedBy: string;
  updatedAt: string;
};

// Computer Group Types (UI-specific)
export type ComputerGroup = {
  id: string;
  name: string;
  description: string;
  endpoints: string[];
  endpointCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
};

export type ComputerGroupFormData = {
  name: string;
  description: string;
  endpoints: string[];
};

// Endpoint option for dropdown (UI-specific)
export type EndpointOption = {
  id: string;
  name: string;
  ipAddress?: string;
  status?: 'Online' | 'Offline';
};

// Patch Preferences Types (UI-specific)
export type PatchPreference = {
  id: string;
  enablePatching: boolean;
  corridorOnlyApprovedPatch: boolean;
  patchSyncForOS: string[];
  patchApprovalPolicy: 'PreApproved' | 'ManuallyApproves' | 'TestAndApprove';
  enableThirdPartyPatching: boolean;
  patchApprovalScheduleTime: string;
  scheduleTime: string;
  zeroTouchDeploymentScheduleTime: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt?: string;
};

export type PatchPreferenceFormData = {
  enablePatching: boolean;
  corridorOnlyApprovedPatch: boolean;
  patchSyncForOS: string[];
  patchApprovalPolicy: 'PreApproved' | 'ManuallyApproves' | 'TestAndApprove';
  enableThirdPartyPatching: boolean;
  patchApprovalScheduleTime: string;
  scheduleTime: string;
  zeroTouchDeploymentScheduleTime: string;
};

// Distribution Server Types (UI-specific)
export type DistributionServer = {
  id: string;
  name: string;
  description: string;
  location: string;
  url: string;
  version: string;
  createdOn: string;
};

export type DistributionServerFormData = Omit<DistributionServer, 'id' | 'createdOn'>;
