// Re-export shared API types
export type {
  OrganizationResponse,
  BranchResponse,
  DepartmentResponse,
  LocationResponse,
  OrgTreeNode,
  OrgTreeResponse,
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
  DeleteImpactResponse,
  PaginatedResponse,
  MessageResponse,
  BulkImportResponse,
  BulkActionResponse,
} from '@shared/types';

// Re-export with local alias
export type { AgentConfigSettingsResponse as AgentConfigResponse } from '@shared/types';

// Keep internal type (different shape from shared SuccessResponse)
export interface SuccessResponse {
  success: boolean;
  message: string;
}
