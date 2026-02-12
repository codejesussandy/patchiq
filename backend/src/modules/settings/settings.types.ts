// Re-export shared API types
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
  PaginatedResponse,
  MessageResponse,
} from '@shared/types';

// Re-export with local alias
export type { AgentConfigSettingsResponse as AgentConfigResponse } from '@shared/types';

// Keep internal type (different shape from shared SuccessResponse)
export interface SuccessResponse {
  success: boolean;
  message: string;
}
