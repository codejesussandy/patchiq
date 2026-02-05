// ============================================
// Re-export models and enums from @patchiq/shared-types
// NOTE: API types (ErrorResponse, ApiResponse, PaginatedResponse, etc.)
// are intentionally NOT re-exported — they have different shapes in the
// backend (see common.ts and api.types.ts).
// ============================================

// --- Enums ---
export type {
  // User & Auth
  UserRole,
  // Agent
  AgentStatus,
  AgentCommandType,
  AgentCommandStatus,
  OSFamily,
  // Asset
  AssetType,
  AssetStatus,
  OperationalStatus,
  // Vulnerability
  VulnerabilitySeverity,
  VulnerabilityStatus,
  ExceptionType,
  ExceptionScope,
  // Patch
  PatchSeverity,
  PatchOS,
  PatchStatus,
  PatchDownloadStatus,
  TestStatus,
  ApprovalStatus,
  // Deployment
  DeploymentType,
  DeploymentConfigType,
  DeploymentScope,
  DeploymentStatus,
  DeploymentStage,
  DeploymentTaskStatus,
  // Discovery
  ScanScheduleType,
  ScanStatus,
  DiscoveredDeviceStatus,
  CredentialType,
  SNMPVersion,
  // Job
  JobType,
  JobStatus,
  VulnerabilityScanType,
  VulnerabilityJobStatus,
  Recurrence,
  // Software Deployment
  ApplicationLocationType,
  ApplicationType,
  SoftwareDeploymentType,
  SelectionType,
  NotifyTo,
  // Configuration
  ConfigurationType,
  CommandType,
  Architecture,
  // Report
  ReportType,
  ReportFormat,
  ReportStatus,
  ReportFrequency,
  // Patch Test & Zero Touch
  ApplicationFilterType,
  ScopeFilterType,
  // License
  LicenseStatus,
  // Policy
  PolicyType,
  SupportedModule,
  RelatedType,
  // Patch Source
  PatchSourceCategory,
  PatchSourceAuthType,
  DownloadJobStatus,
} from '@patchiq/shared-types';

// --- Models ---
export type {
  // User & Auth
  User,
  RefreshToken,
  PasswordResetToken,
  // Organization
  Organization,
  Branch,
  Department,
  Location,
  // Roles
  Role,
  // Agent & Asset
  Agent,
  AgentCommand,
  AgentTelemetry,
  AgentTagRelation,
  AgentGroup,
  AgentGroupMembership,
  AgentDownload,
  AgentVersion,
  Asset,
  AssetHardware,
  AssetSoftware,
  AssetSoftwareInventory,
  AssetSecurity,
  // Tags
  Tag,
  AssetTag,
  // Vulnerability
  Vulnerability,
  VulnerabilityReference,
  VulnerabilitySoftware,
  AssetVulnerability,
  VulnerabilityException,
  ExceptionEndpoint,
  // Patch
  Patch,
  PatchDeployment,
  PatchDeploymentTask,
  PatchAffectedProduct,
  PatchFileDetail,
  PatchSource,
  PatchDownloadJob,
  PatchVulnerability,
  PatchEndpoint,
  PatchTest,
  ZeroTouchConfig,
  // Discovery
  IPRange,
  DeviceCredential,
  DiscoveryScan,
  DiscoveredDevice,
  // Job
  Job,
  // Report
  Report,
  ScheduledReport,
  // Settings
  Setting,
  AlertConfig,
  LdapConfig,
  // Audit
  AuditLog,
  // Categories & Licenses
  Category,
  SubCategory,
  SoftwareLicense,
  OSLicense,
  // Jobs Module
  PatchJob,
  VulnerabilityJob,
  VulnerabilityDBSync,
  SoftwareCatalog,
  SoftwareBundle,
  SoftwareBundleItem,
  SoftwareDeployment,
  SoftwareDeploymentTask,
  ConfigCatalog,
  ConfigBundle,
  ConfigBundleItem,
  ConfigDeployment,
  ConfigDeploymentTask,
  DeploymentPolicy,
} from '@patchiq/shared-types';

// ============================================
// Backend-internal types (different shapes from shared)
// ============================================
export * from './common';
export * from './api.types';
