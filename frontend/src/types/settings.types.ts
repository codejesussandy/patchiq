// Branch Location Types
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

// Re-export User types for convenience
export type { User, UserFormData, InviteUserFormData } from './user.types';

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
  actions: string[]; // ['view', 'create', 'edit', 'delete']
};

export type RoleFormData = {
  name: string;
  description: string;
  branch?: string;
  permissions?: Permission[];
  template?: string;
  capabilities?: string[];
};

// Policy Types
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
  // Password Policy
  resetDuration?: string;
  changeEveryDays?: number;
  lastNPasswordHistory?: number;
  minCharacterCount?: number;
  maxCharacterCount?: number;
  minLowerCaseCharacters?: number;
  minUpperCaseCharacters?: number;
  minNumbers?: number;
  minSpecialCharacters?: number;

  // Other policy types can have different configurations
  [key: string]: any;
};

export type PolicyFormData = {
  name: string;
  type: string;
  branch: string;
  roles: string[];
  description: string;
  configuration: PolicyConfiguration;
};

// Deployment Policy Types
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

// Mail Server Configuration Types
export type MailServerConfig = {
  smtpHost: string;
  smtpPort: number;
  protocol: 'NONE' | 'SSL' | 'TLS';
  email: string;
  enableAuthentication: boolean;
  username?: string;
  password?: string;
};

// Proxy Server Configuration Types
export type ProxyServerConfig = {
  enabled: boolean;
  host?: string;
  port?: number;
  protocol?: 'HTTP' | 'HTTPS' | 'SOCKS5';
  username?: string;
  password?: string;
  noProxyList?: string[];
};

// Vendor Logo Types
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

// LDAP Server Configuration Types
export type LDAPServerConfig = {
  id: string;
  name: string;
  host: string;
  port?: number;
  fqdn: string;
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

// Risk Score Types
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

// Remote Desktop Settings Types
export type RemoteDesktopSettings = {
  id: string;
  connectionType: 'Local' | 'Remote';
  remoteSessionIndicator: boolean;
  userConsent: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type RemoteDesktopSettingsFormData = Omit<RemoteDesktopSettings, 'id' | 'createdAt' | 'updatedAt'>;

// Server Settings Types
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

// Marketplace/Integration Types
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

// Agent Approval Settings Types
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

// Vulnerability Preference Types
export type VulnerabilityPreference = {
  id: string;
  lastSyncAt: string; // ISO timestamp
  scanJobInterval: number; // e.g., 2
  scanJobUnit: 'Hour' | 'Day' | 'Week'; // e.g., "Hour"
  databaseSyncTime: string; // Time in HH:mm:ss format, e.g., "01:00:00"
  totalCveCount?: number; // Read-only field from backend
  createdAt: string;
  updatedAt?: string;
};

export type VulnerabilityPreferenceFormData = {
  scanJobInterval: number;
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;
};

// Agent Configuration Types
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

// Agent Approval Types
export type AgentApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export type AgentApproval = {
  id: string;
  uuid: string;
  hostName: string;
  ipAddresses: string[];
  createdOn: string; // ISO 8601 format
  performedBy: string;
  status: AgentApprovalStatus;
};

// Enroll Secret Types
export type EnrollSecret = {
  id: string;
  name: string;
  secret: string;
  organization: string;
  department: string;
  createdOn: string; // ISO 8601 format
};

export type EnrollSecretFormData = Omit<EnrollSecret, 'id' | 'createdOn'>;

// Red Hat Agent Nomination Types
export type RedHatAgentNomination = {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  endpoint: number;
  scheduledTime?: string; // Time in HH:mm format
  lastSyncTime: string; // ISO 8601 format
  updatedBy: string;
  updatedAt: string; // ISO 8601 format
};
