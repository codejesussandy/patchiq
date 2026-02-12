/**
 * Shared Enums - Single Source of Truth
 * Source: backend/src/db/prisma/schema.prisma
 *
 * Convention: ALL enum values use UPPERCASE_SNAKE_CASE.
 * Frontend display formatting is handled by formatEnum() utility.
 * Both backend and frontend import from this file — no redefinitions allowed.
 */

// ============================================
// User & Authentication Enums
// ============================================

export type UserRole = 'ADMIN' | 'USER' | 'MANAGER';

// ============================================
// Agent Enums
// ============================================

export type AgentStatus = 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export type AgentCommandType = 'SCAN' | 'UPDATE' | 'DEPLOY' | 'REBOOT' | 'COLLECT_INVENTORY' | 'COLLECT_TELEMETRY';

export type AgentCommandStatus = 'PENDING' | 'SENT' | 'COMPLETED' | 'FAILED';

export type OSFamily = 'WINDOWS' | 'MACOS' | 'LINUX';

// ============================================
// Asset Enums
// ============================================

export type AssetType = 'ENDPOINT' | 'SERVER' | 'MOBILE' | 'VIRTUAL_MACHINE' | 'WORKSTATION';

export type AssetStatus = 'IN_USE' | 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'RETIRED';

export type OperationalStatus = 'CONNECTED' | 'DISCONNECTED';

// ============================================
// Vulnerability Enums
// ============================================

export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type VulnerabilityStatus = 'OPEN' | 'RESOLVED' | 'MITIGATED' | 'ACCEPTED';

export type ExceptionType = 'FALSE_POSITIVE' | 'RISK_ACCEPTED' | 'COMPENSATING_CONTROL' | 'PENDING_FIX';

export type ExceptionScope = 'GLOBAL' | 'SPECIFIC_ENDPOINTS';

// ============================================
// Patch Enums
// ============================================

export type PatchSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSPECIFIED';

export type PatchOS = 'WINDOWS' | 'MACOS' | 'UBUNTU' | 'LINUX';

export type PatchStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'RETIRED';

export type PatchDownloadStatus = 'NONE' | 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';

export type TestStatus = 'NOT_TESTED' | 'TESTED' | 'TEST_FAILED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ============================================
// Deployment Enums
// ============================================

export type DeploymentType = 'INSTANT' | 'SCHEDULE';

export type DeploymentConfigType = 'INSTALL' | 'ROLLBACK';

export type DeploymentScope = 'GLOBAL' | 'GROUP' | 'ENDPOINT';

export type DeploymentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type DeploymentTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

// ============================================
// Discovery Enums
// ============================================

export type ScanScheduleType = 'ONCE' | 'DAILY' | 'WEEKLY';

export type ScanStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type DiscoveredDeviceStatus = 'DISCOVERED' | 'ENROLLED' | 'IGNORED';

export type CredentialType = 'SSH' | 'WINDOWS' | 'SNMP' | 'WINRM';

export type SNMPVersion = 'V2C' | 'V3';

// ============================================
// Job Enums
// ============================================

export type JobType = 'SCHEDULE' | 'INSTANT';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type VulnerabilityScanType = 'INSTANT' | 'SCHEDULED';

export type VulnerabilityJobStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';

export type Recurrence = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

// ============================================
// Software Deployment Enums
// ============================================

export type ApplicationLocationType = 'LOCAL_DIRECTORY' | 'NETWORK_SHARE' | 'URL';

export type ApplicationType = 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP';

export type SoftwareDeploymentType = 'INSTALL' | 'UNINSTALL' | 'UPGRADE' | 'ROLLBACK';

export type SelectionType = 'APPLICATION' | 'BUNDLE';

export type NotifyTo = 'ADMIN' | 'USER';

// ============================================
// Configuration Enums
// ============================================

export type ConfigurationType = 'COMMAND' | 'POLICY' | 'SCRIPT';

export type CommandType = 'POWERSHELL' | 'CMD' | 'BASH' | 'SH';

export type Architecture = 'X64' | 'X86' | 'ARM64';

// ============================================
// Report Enums
// ============================================

export type ReportType = 'VULNERABILITY' | 'PATCH' | 'COMPLIANCE' | 'ASSET' | 'ENDPOINT' | 'HARDWARE' | 'AUDIT' | 'CUSTOM';

export type ReportFormat = 'CSV' | 'PDF' | 'XLSX' | 'JSON';

export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

// ============================================
// Patch Test & Zero Touch Enums
// ============================================

export type ApplicationFilterType = 'ALL' | 'INCLUDE' | 'EXCLUDE';

export type ScopeFilterType = 'ALL_COMPUTERS' | 'SCOPE' | 'SPECIFIC_GROUPS';

// ============================================
// License Enums
// ============================================

export type LicenseStatus = 'ALLOCATED' | 'AVAILABLE' | 'EXPIRED';

// ============================================
// Policy Enums
// ============================================

export type PolicyType = 'SCHEDULE' | 'INSTANT';

export type SupportedModule = 'ALL' | 'PATCH' | 'UPDATE' | 'SECURITY';

export type RelatedType = 'NO_RELATION' | 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL';

// ============================================
// Patch Source Enums
// ============================================

export type PatchSourceCategory = 'OS' | 'FIRMWARE' | 'ENTERPRISE' | 'RUNTIME' | 'SECURITY' | 'BROWSER' | 'UTILITY';

export type PatchSourceAuthType = 'BASIC' | 'BEARER' | 'API_KEY';

export type DownloadJobStatus = 'PENDING' | 'QUEUED' | 'DOWNLOADING' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// ============================================
// Enum Display Utility
// ============================================

/**
 * Convert an UPPERCASE_SNAKE_CASE enum value to human-readable Title Case.
 * Examples:
 *   formatEnum('IN_PROGRESS') → 'In Progress'
 *   formatEnum('CRITICAL') → 'Critical'
 *   formatEnum('NOT_TESTED') → 'Not Tested'
 *   formatEnum('UNDER_MAINTENANCE') → 'Under Maintenance'
 */
export function formatEnum(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
