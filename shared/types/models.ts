/**
 * Shared Models - Generated from Prisma Schema
 * Source of Truth: backend/src/db/prisma/schema.prisma
 *
 * These types represent the database models.
 * Frontend should use these for API responses.
 * Backend uses @prisma/client directly.
 *
 * NOTE: Dates are represented as ISO 8601 strings for JSON serialization.
 * BigInt fields are represented as strings (for JSON compatibility).
 */

// Enum types are re-exported from enums.ts
// These are used for type annotations in the models below
export type {
  UserRole,
  AgentStatus,
  AgentCommandStatus,
  AssetType,
  AssetStatus,
  VulnerabilitySeverity,
  PatchSeverity,
  TestStatus,
  ApprovalStatus,
  DeploymentType,
  DeploymentScope,
  DeploymentStatus,
  ScanStatus,
  DiscoveredDeviceStatus,
  CredentialType,
  SNMPVersion,
  JobStatus,
  VulnerabilityJobStatus,
  Recurrence,
  ApplicationLocationType,
  ApplicationType,
  SoftwareDeploymentType,
  SelectionType,
  NotifyTo,
  ConfigurationType,
  CommandType,
  Architecture,
  ReportFormat,
  ReportStatus,
  ReportFrequency,
  ApplicationFilterType,
  ScopeFilterType,
  LicenseStatus,
  PolicyType,
  SupportedModule,
  RelatedType,
  PatchSourceCategory,
  PatchSourceAuthType,
  DownloadJobStatus,
} from './enums';

// ============================================
// User & Authentication Models
// ============================================

export interface User {
  id: string;
  email: string;
  passwordHash?: never; // Never exposed in API responses
  name: string | null;           // Display name (kept for backwards compatibility)
  firstName: string | null;      // NEW: Split name for frontend
  lastName: string | null;       // NEW: Split name for frontend
  contactNumber: string | null;
  timezone: string | null;       // NEW: User timezone preference (default: UTC)
  avatar: string | null;         // NEW: Avatar URL or path
  role: string;
  isActive: boolean;
  isOnboarded: boolean;
  lastLoginAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organizationId: string | null;
  departmentId: string | null;
  locationId: string | null;
}

export interface RefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface PasswordResetToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

// ============================================
// Organization Structure Models
// ============================================

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
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
// Roles & Permissions Models
// ============================================

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Agent & Asset Models
// ============================================

export interface Agent {
  id: string;
  machineId: string;
  name: string | null;
  hostname: string | null;
  status: string;
  os: string | null;
  osVersion: string | null;
  architecture: string | null;
  agentVersion: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  serialNumber: string | null;
  lastHeartbeat: string | null;
  registeredAt: string;
  tokenHash?: never; // Never exposed
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
  assetId: string | null;
}

export interface AgentCommand {
  id: string;
  agentId: string;
  type: string;
  payload: Record<string, unknown> | null;
  status: string;
  result: Record<string, unknown> | null;
  scheduledAt: string | null;
  executedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AgentTelemetry {
  id: string;
  agentId: string;

  // Summary fields for quick queries and dashboards
  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
  uptime: number | null;
  networkInBps: string | null;     // NEW: Network bytes in per second (BigInt as string)
  networkOutBps: string | null;    // NEW: Network bytes out per second (BigInt as string)
  processCount: number | null;     // NEW: Running process count
  pendingReboot: boolean | null;   // NEW: System needs reboot

  // NEW: Full telemetry payload from agent
  rawPayload: Record<string, unknown> | null;  // Complete Telemetry struct
  timestamp: string;
}

export interface AgentTagRelation {
  agentId: string;
  tag: string;
}

export interface AgentGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentGroupMembership {
  agentId: string;
  groupId: string;
}

export interface AgentDownload {
  id: string;
  os: string;
  version: string;
  releaseDate: string;
  downloadUrl: string;
  createdAt: string;
}

export interface AgentVersion {
  id: string;
  platform: string;
  architecture: string;
  version: string;
  filePath: string | null;
  fileSize: string | null; // BigInt as string
  checksum: string | null;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  serialNumber: string | null;
  assetTag: string | null;
  os: string | null;
  osVersion: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  manufacturer: string | null;
  model: string | null;
  hostname: string | null;         // NEW: Hostname from agent
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  createdAt: string;
  updatedAt: string;

  // NEW: Owner information (denormalized for display)
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerDepartment: string | null;

  // NEW: Procurement fields
  vendor: string | null;
  purchaseOrderNumber: string | null;
  amcCost: string | null;          // Annual Maintenance Contract cost
  amcExpiryDate: string | null;
  amcVendor: string | null;
  endOfLife: string | null;
  endOfSupport: string | null;

  // NEW: Cost fields
  purchaseCost: string | null;     // Decimal as string
  currentValue: string | null;     // Decimal as string
  salvageValue: string | null;     // Decimal as string
  currency: string | null;         // Default: USD
  depreciationType: string | null;
  depreciationRate: string | null; // Decimal as string
  invoiceNumber: string | null;

  // Relations
  organizationId: string | null;
  locationId: string | null;

  // Optional relations (populated when included)
  softwareInventory?: AssetSoftwareInventory;
}

export interface AssetHardware {
  id: string;
  assetId: string;

  // Summary fields for querying/display in lists
  cpu: string | null;
  cpuCores: number | null;
  cpuManufacturer: string | null;  // NEW: Intel, AMD, Apple
  cpuThreads: number | null;       // NEW: Thread count
  cpuSpeedMHz: number | null;      // NEW: Clock speed
  ramTotal: string | null;         // BigInt as string
  ramSlots: number | null;         // NEW: Used memory slots
  ramType: string | null;          // NEW: DDR4, DDR5
  diskTotal: string | null;        // BigInt as string
  diskFree: string | null;         // BigInt as string
  diskType: string | null;         // NEW: SSD, HDD, NVMe
  gpuModel: string | null;
  gpuMemoryMB: number | null;      // NEW: GPU memory
  biosVendor: string | null;       // NEW: BIOS manufacturer
  biosVersion: string | null;
  systemSKU: string | null;
  manufacturer: string | null;     // NEW: System manufacturer
  model: string | null;            // NEW: System model
  serialNumber: string | null;     // NEW: System serial

  // NEW: Full hardware payload from agent (JSON + Summary pattern)
  rawPayload: Record<string, unknown> | null;  // Complete agent Hardware struct
  collectedAt: string | null;      // When agent collected this data
}

export interface AssetSoftware {
  id: string;
  assetId: string;
  name: string;
  version: string | null;
  vendor: string | null;
  installDate: string | null;
  installPath: string | null;
  isSystem: boolean;
  category: string | null;         // NEW: Application category
}

// NEW: Complete software inventory from agent
export interface AssetSoftwareInventory {
  id: string;
  assetId: string;
  asset?: Asset;  // Relation to Asset

  // Summary fields for quick queries
  osName: string | null;
  osVersion: string | null;
  osBuild: string | null;
  totalApps: number | null;
  totalServices: number | null;

  // Full software inventory payload from agent
  rawPayload: Record<string, unknown> | null;  // Complete SoftwareInventory struct
  collectedAt: string | null;
}

export interface AssetSecurity {
  id: string;
  assetId: string;
  antivirusInstalled: boolean | null;
  antivirusName: string | null;
  antivirusUpdated: string | null;
  firewallEnabled: boolean | null;
  encryptionEnabled: boolean | null;
  lastSecurityScan: string | null;
  complianceScore: number | null;
}

// ============================================
// Tag Models
// ============================================

export interface Tag {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  priority: number;
  compliance: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetTag {
  assetId: string;
  tagId: string;
}

// ============================================
// Vulnerability Models
// ============================================

export interface Vulnerability {
  id: string;
  cveId: string;
  title: string;
  description: string | null;
  severity: string;
  cvss3BaseScore: number | null;
  cvss2BaseScore: number | null;
  cvss3AttackVector: string | null;
  cvss3AttackComplexity: string | null;
  cvss3PrivilegesRequired: string | null;
  cvss3Scope: string | null;
  cvss3Confidentiality: string | null;
  cvss3Integrity: string | null;
  cvss3Availability: string | null;
  cvss3ImpactScore: number | null;
  cvss3VectorString: string | null;
  cvss2Severity: string | null;
  epss: number | null;
  riskScore: number | null;
  exploitable: boolean;
  isZeroDay: boolean;
  publishedDate: string | null;
  lastModified: string | null;
  patchAvailable: boolean;
  fixRecommendation: string | null;
  mitreTactic: string | null;
  mitreTechnique: string | null;
  mitreSubTechnique: string | null;
  mitreDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VulnerabilityReference {
  id: string;
  vulnerabilityId: string;
  url: string;
  source: string | null;
}

export interface VulnerabilitySoftware {
  id: string;
  vulnerabilityId: string;
  name: string;
  version: string | null;
  releaseVersion: string | null;
  fixedVersion: string | null;
  vendor: string | null;
}

export interface AssetVulnerability {
  id: string;
  assetId: string;
  vulnerabilityId: string;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
}

export interface VulnerabilityException {
  id: string;
  vulnerabilityId: string;
  cve: string;
  exceptionType: string;
  reasonForExclusion: string | null;
  scope: string;
  source: string;
  createdBy: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface ExceptionEndpoint {
  id: string;
  exceptionId: string;
  endpointId: string;
}

// ============================================
// Patch Models
// ============================================

export interface Patch {
  id: string;
  patchId: string;
  title: string;
  software: string | null;
  description: string | null;
  severity: string;
  category: string | null;
  vendor: string | null;
  product: string | null;
  os: string | null;
  osVersion: string | null;
  platform: string | null;
  architecture: string | null;
  kbNumber: string | null;
  bulletinId: string | null;
  publishedAt: string | null;
  size: string | null; // BigInt as string
  sizeFormatted: string | null;
  downloadUrl: string | null;
  referenceUrl: string | null;
  rebootRequired: boolean;
  supportUninstallation: boolean;
  languagesSupported: string[];
  tags: string[];
  cveNumbers: string[];
  source: string | null;
  status: string | null;
  downloadStatus: string | null;
  supersedes: string[];
  supersededBy: string[];
  operationalStatusSince: string | null;
  endpoints: number;
  testStatus: string;
  testResult: string | null;
  testedBy: string | null;
  testedAt: string | null;
  testNotes: string | null;
  testEnvironment: string | null;
  approvalStatus: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  rejectionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatchDeployment {
  id: string;
  name: string;
  deploymentId: string | null;
  description: string | null;
  type: string;
  configType: string;
  scope: string;
  status: string;
  pending: number;
  succeeded: number;
  failed: number;
  targetGroupIds: string[];
  targetAgentIds: string[];
  retryCount: number;
  retryDelay: number;
  autoRollback: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatchDeploymentTask {
  id: string;
  deploymentId: string;
  assetId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface PatchAffectedProduct {
  id: string;
  patchId: string;
  softwareName: string;
  version: string | null;
  vendor: string | null;
  installedOn: number;
  platform: string | null;
}

// PatchFileDetail removed — replaced by PatchBundle

export interface PatchSource {
  id: string;
  name: string;
  vendor: string;
  category: string;
  platform: string | null;
  baseUrl: string;
  urlPatterns: string[];
  priority: number;
  isEnabled: boolean;
  requiresAuth: boolean;
  authType: string | null;
  authConfig: Record<string, unknown> | null;
  syncSchedule: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatchDownloadJob {
  id: string;
  jobId: string;
  sourceId: string | null;
  patchId: string | null;
  sourceUrl: string;
  targetPath: string;
  fileName: string;
  expectedSize: string | null; // BigInt as string
  expectedChecksum: string | null;
  checksumType: string | null;
  status: string;
  progress: number;
  downloadedBytes: string | null; // BigInt as string
  actualChecksum: string | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatchVulnerability {
  id: string;
  patchId: string;
  cveNumber: string;
  severity: string | null;
  description: string | null;
  publishedDate: string | null;
}

// PatchEndpoint removed — replaced by Agent/Asset relations via PatchDeploymentTask

export interface PatchTest {
  id: string;
  name: string;
  description: string | null;
  applicationType: string;
  applications: string[];
  scope: string;
  computers: string[];
  groups: string[];
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ZeroTouchConfig {
  id: string;
  name: string;
  description: string | null;
  applicationType: string;
  applications: string[];
  scope: string;
  computers: string[];
  groups: string[];
  autoDeploymentRules: Record<string, unknown>;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Discovery Models
// ============================================

export interface IPRange {
  id: string;
  name: string;
  range: string;
  description: string | null;
  credentialId: string | null;
  scanScheduleType: string | null;
  scanScheduleTime: string | null;
  scanScheduleDay: number | null;
  lastScanned: string | null;
  deviceCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceCredential {
  id: string;
  name: string;
  type: string;
  username: string | null;
  passwordEnc?: never; // Never exposed
  domain: string | null;
  snmpCommunity: string | null;
  snmpVersion: string | null;
  port: number | null;
  description: string | null;
  lastUsed: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryScan {
  id: string;
  ipRangeId: string;
  status: string;
  devicesFound: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface DiscoveredDevice {
  id: string;
  ipRangeId: string;
  ipAddress: string;
  hostname: string | null;
  macAddress: string | null;
  deviceType: string | null;
  os: string | null;
  vendor: string | null;
  openPorts: number[];
  status: string;
  assetId: string | null;
  discoveredAt: string;
  lastSeenAt: string;
}

// ============================================
// Job Models
// ============================================

export interface Job {
  id: string;
  type: string;
  name: string;
  status: string;
  priority: number;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  progress: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Report Models
// ============================================

export interface Report {
  id: string;
  name: string;
  type: string;
  format: string;
  status: string;
  parameters: Record<string, unknown> | null;
  filePath: string | null;
  fileSize: string | null; // BigInt as string
  generatedAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  format: string;
  frequency: string;
  parameters: Record<string, unknown> | null;
  recipients: string[];
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Settings Models
// ============================================

export interface Setting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertConfig {
  id: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LdapConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  baseDn: string;
  bindDnEnc: string;
  bindPasswordEnc?: never; // Never exposed
  userFilter: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Audit Log Model
// ============================================

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

// ============================================
// Asset Categories & Licenses Models
// ============================================

export interface Category {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  criticality: string | null;
  description: string | null;
  createdAt: string;
}

export interface SoftwareLicense {
  id: string;
  licenseName: string;
  softwareName: string;
  publisher: string | null;
  licenseKey: string | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  licenseCount: number;
  vendorName: string;
  cost: string | null; // Decimal as string
  status: string;
  notes: string | null;
  createdAt: string;
}

export interface OSLicense {
  id: string;
  licenseName: string;
  osType: string;
  status: string;
  licenseCount: number;
  vendorName: string;
  licenseKey: string | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  publisher: string | null;
  cost: string | null;
  notes: string | null;
  createdAt: string;
}

// ============================================
// Jobs Module Models
// ============================================

export interface PatchJob {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  type: string;
  configType: string;
  scope: string;
  endpoints: string[];
  patches: string[];
  deploymentPolicy: string | null;
  retryCount: number;
  batchSize: number | null;
  notifyTo: string[];
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VulnerabilityJob {
  id: string;
  jobId: string;
  name: string;
  description: string | null;
  scope: string;
  endpoints: string[];
  scanType: string;
  scheduleDate: string | null;
  scheduleTime: string | null;
  recurrence: string | null;
  status: string;
  scheduledTime: string | null;
  lastRun: string | null;
  nextRun: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VulnerabilityDBSync {
  id: string;
  scanJobInterval: number;
  scanJobUnit: string;
  databaseSyncTime: string;
  lastSync: string | null;
  totalCVE: number;
  createdAt: string;
  updatedAt: string;
}

// SoftwareCatalog, SoftwareBundle, SoftwareBundleItem removed
// Replaced by SoftwarePackage + HubBundle + HubBundleItem in Hub module

export interface SoftwareDeployment {
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string | null;
  deploymentType: string;
  selectionType: string;
  selectedItems: string[];
  scope: string;
  endpoints: string[];
  deploymentPolicy: string | null;
  retryCount: number;
  notifyTo: string;
  status: string;
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SoftwareDeploymentTask {
  id: string;
  deploymentId: string;
  agentId: string | null;
  agentName: string;
  agentOs: string;
  packageName: string;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigCatalog {
  id: string;
  configurationId: string;
  name: string;
  os: string;
  description: string | null;
  tags: string[];
  configurationType: string;
  architecture: string;
  isRemediation: boolean;
  commandType: string;
  command: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigBundle {
  id: string;
  bundleId: string;
  bundleName: string;
  os: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigBundleItem {
  id: string;
  bundleId: string;
  configId: string;
}

export interface ConfigDeployment {
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string | null;
  selectionType: string;
  selectedItems: string[];
  scope: string;
  endpoints: string[];
  deploymentPolicy: string | null;
  retryCount: number;
  notifyTo: string;
  status: string;
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigDeploymentTask {
  id: string;
  deploymentId: string;
  agentId: string | null;
  agentName: string;
  agentOs: string;
  configName: string;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentPolicy {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  type: string;
  supportedModule: string;
  relatedType: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
