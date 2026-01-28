// ============================================
// Settings Module Type Definitions
// ============================================

// ============================================
// Organization Structure Types
// ============================================

export interface OrganizationResponse {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchResponse {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  organizationName?: string;
  isDefault: boolean;
  status: 'Default' | 'Active' | 'Inactive';
  users: number;
  assets: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  manager?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentResponse {
  id: string;
  name: string;
  description: string | null;
  branchId: string;
  branchName?: string;
  organizationName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationResponse {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// User Management Types
// ============================================

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  contactNumber: string | null;
  role: string;
  status: 'Active' | 'Suspended' | 'Invite Sent' | 'Deleted';
  organization: string | null;
  department: string | null;
  location: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserDetailResponse extends UserListItem {
  isOnboarded: boolean;
  organizationId: string | null;
  departmentId: string | null;
  locationId: string | null;
  loginAllowed: boolean;
  endpointAssignmentAllowed: boolean;
}

export interface UserAuditLogEntry {
  id: string;
  action: string;
  performedBy: string | null;
  timestamp: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
}

// ============================================
// Roles & Permissions Types
// ============================================

export interface ModulePermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface RolePermissions {
  agents?: ModulePermissions;
  assets?: ModulePermissions;
  patches?: ModulePermissions;
  vulnerabilities?: ModulePermissions;
  jobs?: ModulePermissions;
  discovery?: ModulePermissions;
  reports?: ModulePermissions;
  dashboard?: ModulePermissions;
  settings?: ModulePermissions;
}

export interface RoleResponse {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: RolePermissions;
  users: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Alert Configuration Types
// ============================================

export interface AlertConfigResponse {
  id: string;
  name: string;
  type: string;
  channel: string;
  recipients: string;
  enabled: boolean;
  description: string;
  module: string;
  severity: string;
  scope: string;
  endpoints: string;
  conditions: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  remediations: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// LDAP Configuration Types
// ============================================

export interface LdapConfigResponse {
  id: string;
  name: string;
  host: string;
  port: number;
  baseDn: string;
  userFilter: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Server Settings Types
// ============================================

export interface ServerSettingsResponse {
  sessionTimeout: boolean;
  sessionTimeoutMinutes: number;
  sessionIdleTimeoutMinutes: number;
  endpointOnlineStatusTimeoutHours: number;
  endpointScanJobTimeoutHours: number;
  logLevel: 'Debug' | 'Info' | 'Warning' | 'Error';
}

export interface AgentConfigResponse {
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
}

export interface ProxyServerResponse {
  enabled: boolean;
  host: string | null;
  port: number | null;
  protocol: 'HTTP' | 'HTTPS' | 'SOCKS5' | null;
  enableAuthentication: boolean;
  username: string | null;
}

export interface MailServerResponse {
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  fromAddress: string | null;
  fromName: string | null;
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLogResponse {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export interface AuditLogFilterOptions {
  actions: string[];
  resources: string[];
  users: Array<{ id: string; email: string }>;
}

// ============================================
// License Types
// ============================================

export interface PlatformLicenseResponse {
  licenseTo: string;
  licenseType: string;
  poNumber: string | null;
  invoiceNumber: string | null;
  email: string;
  partner: string | null;
  productCode: string;
  productVersion: string;
  issueDate: string;
  expiresOn: string;
  numberOfEndpoints: number;
  usedEndpoints: number;
  activationCode: string;
  remainingDays: number;
  remainingEndpoints: number;
}

// ============================================
// Enroll Secrets Types
// ============================================

export interface EnrollSecretResponse {
  id: string;
  name: string;
  secret: string;
  organization: string;
  department: string;
  createdOn: string;
}

// ============================================
// Integration Types
// ============================================

export interface IntegrationResponse {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: boolean;
  enabled: boolean;
  iconUrl: string | null;
  recipients: string[];
  config: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Computer Group Types
// ============================================

export interface ComputerGroupResponse {
  id: string;
  name: string;
  description: string | null;
  criteria: Record<string, unknown> | null;
  memberCount: number;
  createdAt: string;
}

// ============================================
// Deployment Policy Types
// ============================================

export interface DeploymentPolicyResponse {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  type: 'SCHEDULE' | 'INSTANT';
  supportedModule: string;
  relatedType: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Vulnerability Preference Types
// ============================================

export interface VulnerabilityPreferenceResponse {
  id: string;
  lastSyncAt: string | null;
  scanJobInterval: number;
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;
  totalCveCount: number;
  createdAt: string;
}

// ============================================
// Patch Preference Types
// ============================================

export interface PatchPreferenceResponse {
  id: string;
  enablePatching: boolean;
  corridorOnlyApprovedPatch: boolean;
  patchSyncForOS: string[];
  patchApprovalPolicy: 'PreApproved' | 'ManuallyApproves' | 'TestAndApprove';
  enableThirdPartyPatching: boolean;
  patchApprovalScheduleTime: string;
  scheduleTime: string;
  zeroTouchDeploymentScheduleTime: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

// ============================================
// Branding Types
// ============================================

export interface BrandingResponse {
  logoUrl: string | null;
  companyName: string | null;
}

// ============================================
// Agent Approval Types
// ============================================

export interface AgentApprovalSettingsResponse {
  approvalType: 'auto' | 'manual';
  autoApprovalBasedOn: 'all' | 'criteria';
}

export interface AgentApprovalResponse {
  id: string;
  uuid: string;
  hostName: string | null;
  ipAddresses: string;
  createdOn: string;
  performedBy: string | null;
  status: 'Approved' | 'Pending' | 'Rejected';
}

// ============================================
// Distribution Server Types
// ============================================

export interface DistributionServerResponse {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  url: string;
  version: string | null;
  createdOn: string;
}

// ============================================
// Red Hat Nomination Types
// ============================================

export interface RedHatNominationResponse {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  endpoint: number;
  scheduledTime: string | null;
  lastSyncTime: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

// ============================================
// Vendor Logo Types
// ============================================

export interface VendorLogoResponse {
  id: string;
  name: string;
  type: 'integration' | 'vendor' | 'os';
  logoUrl: string;
  createdAt: string;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MessageResponse {
  message: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}
