/**
 * Shared Enums - Generated from Prisma Schema
 * Source of Truth: backend/src/db/prisma/schema.prisma
 *
 * These enums match the string values used in the Prisma schema.
 * When Prisma schema changes, regenerate these enums.
 */

// ============================================
// User & Authentication Enums
// ============================================

export type UserRole = 'admin' | 'user' | 'manager';

// ============================================
// Agent Enums
// ============================================

export type AgentStatus = 'Pending' | 'Connected' | 'Disconnected' | 'Error';

export type AgentCommandType = 'scan' | 'update' | 'deploy' | 'reboot' | 'collect_inventory' | 'collect_telemetry';

export type AgentCommandStatus = 'pending' | 'sent' | 'completed' | 'failed';

export type OSFamily = 'Windows' | 'MacOS' | 'Linux';

// ============================================
// Asset Enums
// ============================================

export type AssetType = 'Endpoint' | 'Server' | 'Mobile' | 'Virtual Machine' | 'Workstation';

export type AssetStatus = 'In Use' | 'Available' | 'Under Maintenance' | 'Retired';

export type OperationalStatus = 'Connected' | 'Disconnected';

// ============================================
// Vulnerability Enums
// ============================================

export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type VulnerabilityStatus = 'Open' | 'Resolved' | 'Mitigated' | 'Accepted';

export type ExceptionType = 'False Positive' | 'Risk Accepted' | 'Compensating Control' | 'Pending Fix';

export type ExceptionScope = 'Global' | 'Specific Endpoints';

// ============================================
// Patch Enums
// ============================================

export type PatchSeverity = 'CRITICAL' | 'High' | 'Medium' | 'Low' | 'UNSPECIFIED';

export type PatchOS = 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux';

export type PatchStatus = 'Draft' | 'Active' | 'Superseded' | 'Retired';

export type PatchDownloadStatus = 'None' | 'Pending' | 'Downloading' | 'Completed' | 'Failed';

export type TestStatus = 'Not Tested' | 'Tested' | 'Test Failed';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

// ============================================
// Deployment Enums
// ============================================

export type DeploymentType = 'INSTANT' | 'SCHEDULE';

export type DeploymentConfigType = 'INSTALL' | 'ROLLBACK';

export type DeploymentScope = 'Global' | 'Group' | 'Endpoint';

export type DeploymentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type DeploymentStage = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INSTALLED' | 'FAILED';

export type DeploymentTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// ============================================
// Discovery Enums
// ============================================

export type ScanScheduleType = 'once' | 'daily' | 'weekly';

export type ScanStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type DiscoveredDeviceStatus = 'discovered' | 'enrolled' | 'ignored';

export type CredentialType = 'SSH' | 'Windows' | 'SNMP' | 'WinRM';

export type SNMPVersion = 'v2c' | 'v3';

// ============================================
// Job Enums
// ============================================

export type JobType = 'SCHEDULE' | 'INSTANT';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type VulnerabilityScanType = 'instant' | 'scheduled';

export type VulnerabilityJobStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';

export type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly';

// ============================================
// Software Deployment Enums
// ============================================

export type ApplicationLocationType = 'Local Directory' | 'Network Share' | 'URL';

export type ApplicationType = 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP';

export type SoftwareDeploymentType = 'install' | 'uninstall' | 'upgrade';

export type SelectionType = 'application' | 'bundle';

export type NotifyTo = 'admin' | 'user';

// ============================================
// Configuration Enums
// ============================================

export type ConfigurationType = 'command' | 'policy' | 'script';

export type CommandType = 'powershell' | 'cmd' | 'bash' | 'sh';

export type Architecture = 'x64' | 'x86' | 'ARM64';

// ============================================
// Report Enums
// ============================================

export type ReportType = 'vulnerability' | 'patch' | 'compliance' | 'asset' | 'endpoint' | 'hardware';

export type ReportFormat = 'CSV' | 'PDF' | 'XLSX' | 'JSON';

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

// ============================================
// Patch Test & Zero Touch Enums
// ============================================

export type ApplicationFilterType = 'ALL' | 'INCLUDE' | 'EXCLUDE';

export type ScopeFilterType = 'ALL_COMPUTERS' | 'SCOPE' | 'SPECIFIC_GROUPS';

// ============================================
// License Enums
// ============================================

export type LicenseStatus = 'Allocated' | 'Available' | 'Expired';

// ============================================
// Policy Enums
// ============================================

export type PolicyType = 'SCHEDULE' | 'INSTANT';

export type SupportedModule = 'All' | 'Patch' | 'Update' | 'Security';

export type RelatedType = 'No Relation' | 'Critical' | 'Important' | 'Optional';

// ============================================
// Patch Source Enums
// ============================================

export type PatchSourceCategory = 'os' | 'firmware' | 'enterprise' | 'runtime' | 'security' | 'browser' | 'utility';

export type PatchSourceAuthType = 'basic' | 'bearer' | 'api_key';

export type DownloadJobStatus = 'pending' | 'queued' | 'downloading' | 'verifying' | 'completed' | 'failed' | 'cancelled';
