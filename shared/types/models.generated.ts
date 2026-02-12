/**
 * Auto-generated from Prisma schema — DO NOT EDIT MANUALLY
 * Source: backend/src/db/prisma/schema.prisma
 *
 * Dates are ISO 8601 strings (JSON serialization).
 * BigInt fields are strings (JSON compatibility).
 * Json fields are typed as `unknown`.
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  contactNumber: string | null;
  timezone: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
  isOnboarded: boolean;
  lastLoginAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organizationId: string | null;
  organization?: Organization | null;
  departmentId: string | null;
  department?: Department | null;
  locationId: string | null;
  location?: Location | null;
  refreshTokens?: RefreshToken[];
  passwordResetTokens?: PasswordResetToken[];
  auditLogs?: AuditLog[];
  notifications?: Notification[];
  notificationPreference?: NotificationPreference | null;
}

export interface RefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  user?: User;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface PasswordResetToken {
  id: string;
  tokenHash: string;
  userId: string;
  user?: User;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  users?: User[];
  branches?: Branch[];
  assets?: Asset[];
}

export interface Branch {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  organization?: Organization;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  departments?: Department[];
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  branchId: string;
  branch?: Branch;
  createdAt: string;
  updatedAt: string;
  users?: User[];
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
  users?: User[];
  assets?: Asset[];
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: unknown;
  createdAt: string;
  updatedAt: string;
}

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
  tokenHash: string | null;
  capabilities: unknown;
  inventoryRequested: boolean;
  createdAt: string;
  updatedAt: string;
  assetId: string | null;
  asset?: Asset | null;
  commands?: AgentCommand[];
  telemetry?: AgentTelemetry[];
  tags?: AgentTagRelation[];
  groups?: AgentGroupMembership[];
}

export interface AgentCommand {
  id: string;
  agentId: string;
  agent?: Agent;
  type: string;
  payload: unknown | null;
  status: string;
  result: unknown | null;
  errorMessage: string | null;
  scheduledAt: string | null;
  executedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  softwareTask?: SoftwareDeploymentTask | null;
  patchTask?: PatchDeploymentTask | null;
  configTask?: ConfigDeploymentTask | null;
}

export interface AgentTelemetry {
  id: string;
  agentId: string;
  agent?: Agent;
  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
  uptime: number | null;
  networkInBps: string | null;
  networkOutBps: string | null;
  processCount: number | null;
  pendingReboot: boolean | null;
  rawPayload: unknown | null;
  timestamp: string;
}

export interface AgentTagRelation {
  agentId: string;
  agent?: Agent;
  tag: string;
}

export interface AgentGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members?: AgentGroupMembership[];
}

export interface AgentGroupMembership {
  agentId: string;
  agent?: Agent;
  groupId: string;
  group?: AgentGroup;
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
  fileSize: string | null;
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
  osEdition: string | null;
  architecture: string | null;
  installedFeatures: string[];
  ipAddress: string | null;
  macAddress: string | null;
  manufacturer: string | null;
  model: string | null;
  hostname: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerDepartment: string | null;
  vendor: string | null;
  purchaseOrderNumber: string | null;
  amcCost: string | null;
  amcExpiryDate: string | null;
  amcVendor: string | null;
  endOfLife: string | null;
  endOfSupport: string | null;
  purchaseCost: string | null;
  currentValue: string | null;
  salvageValue: string | null;
  currency: string | null;
  depreciationType: string | null;
  depreciationRate: string | null;
  invoiceNumber: string | null;
  categoryId: string | null;
  category?: Category | null;
  subCategoryId: string | null;
  subCategory?: SubCategory | null;
  organizationId: string | null;
  organization?: Organization | null;
  locationId: string | null;
  location?: Location | null;
  agent?: Agent | null;
  hardware?: AssetHardware | null;
  software?: AssetSoftware[];
  softwareInventory?: AssetSoftwareInventory | null;
  security?: AssetSecurity | null;
  peripherals?: AssetPeripherals | null;
  tags?: AssetTag[];
  vulnerabilities?: AssetVulnerability[];
  patchTasks?: PatchDeploymentTask[];
  softwareTasks?: SoftwareDeploymentTask[];
  alerts?: AssetAlert[];
  patchRecommendations?: AssetPatchRecommendation[];
}

export interface AssetHardware {
  id: string;
  assetId: string;
  asset?: Asset;
  cpu: string | null;
  cpuCores: number | null;
  cpuManufacturer: string | null;
  cpuThreads: number | null;
  cpuSpeedMHz: number | null;
  ramTotal: string | null;
  ramSlots: number | null;
  ramType: string | null;
  diskTotal: string | null;
  diskFree: string | null;
  diskType: string | null;
  gpuModel: string | null;
  gpuMemoryMB: number | null;
  biosVendor: string | null;
  biosVersion: string | null;
  systemSKU: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  rawPayload: unknown | null;
  collectedAt: string | null;
}

export interface AssetSoftware {
  id: string;
  assetId: string;
  asset?: Asset;
  name: string;
  version: string | null;
  vendor: string | null;
  installDate: string | null;
  installPath: string | null;
  isSystem: boolean;
  category: string | null;
  normalizedVersion: string | null;
  cpeVendor: string | null;
  cpeProduct: string | null;
  cpeMappingId: string | null;
  matchConfidence: number | null;
}

export interface AssetSoftwareInventory {
  id: string;
  assetId: string;
  asset?: Asset;
  osName: string | null;
  osVersion: string | null;
  osBuild: string | null;
  totalApps: number | null;
  totalServices: number | null;
  rawPayload: unknown | null;
  collectedAt: string | null;
}

export interface AssetSecurity {
  id: string;
  assetId: string;
  asset?: Asset;
  antivirusInstalled: boolean | null;
  antivirusName: string | null;
  antivirusUpdated: string | null;
  firewallEnabled: boolean | null;
  encryptionEnabled: boolean | null;
  lastSecurityScan: string | null;
  complianceScore: number | null;
}

export interface AssetPeripherals {
  id: string;
  assetId: string;
  asset?: Asset;
  monitorCount: number;
  usbDeviceCount: number;
  printerCount: number;
  audioDeviceCount: number;
  bluetoothDeviceCount: number;
  rawPayload: unknown | null;
  collectedAt: string;
}

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
  assets?: AssetTag[];
}

export interface AssetTag {
  assetId: string;
  asset?: Asset;
  tagId: string;
  tag?: Tag;
}

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
  affectedAssets?: AssetVulnerability[];
  exceptions?: VulnerabilityException[];
  references?: VulnerabilityReference[];
  affectedSoftware?: VulnerabilitySoftware[];
  assetPatchRecommendations?: AssetPatchRecommendation[];
}

export interface VulnerabilityReference {
  id: string;
  vulnerabilityId: string;
  vulnerability?: Vulnerability;
  url: string;
  source: string | null;
}

export interface VulnerabilitySoftware {
  id: string;
  vulnerabilityId: string;
  vulnerability?: Vulnerability;
  name: string;
  version: string | null;
  releaseVersion: string | null;
  fixedVersion: string | null;
  vendor: string | null;
  cpeUri: string | null;
  cpeVendor: string | null;
  cpeProduct: string | null;
  versionStart: string | null;
  versionEnd: string | null;
  versionStartType: string | null;
  versionEndType: string | null;
}

export interface AssetVulnerability {
  id: string;
  assetId: string;
  asset?: Asset;
  vulnerabilityId: string;
  vulnerability?: Vulnerability;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
}

export interface VulnerabilityException {
  id: string;
  vulnerabilityId: string;
  vulnerability?: Vulnerability;
  cve: string;
  exceptionType: string;
  reasonForExclusion: string | null;
  scope: string;
  source: string;
  createdBy: string | null;
  createdAt: string;
  deletedAt: string | null;
  endpoints?: ExceptionEndpoint[];
}

export interface ExceptionEndpoint {
  id: string;
  exceptionId: string;
  exception?: VulnerabilityException;
  endpointId: string;
}

export interface CpeMapping {
  id: string;
  agentName: string;
  agentVendor: string | null;
  platform: string | null;
  packageManager: string | null;
  cpeVendor: string;
  cpeProduct: string;
  confidence: number;
  source: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnmatchedSoftware {
  id: string;
  name: string;
  vendor: string;
  platform: string | null;
  occurrences: number;
  lastSeen: string;
  resolved: boolean;
  resolvedAt: string | null;
  notes: string | null;
}

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
  size: string | null;
  sizeFormatted: string | null;
  downloadUrl: string | null;
  referenceUrl: string | null;
  rebootRequired: boolean;
  supportUninstallation: boolean;
  supportsRollback: boolean;
  patchType: string;
  languagesSupported: string[];
  tags: string[];
  cveNumbers: string[];
  source: string | null;
  status: string | null;
  downloadStatus: string | null;
  supersedes: string[];
  supersededBy: string[];
  supersededAt: string | null;
  operationalStatusSince: string | null;
  endpoints: number;
  prerequisites: unknown | null;
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
  bundle?: PatchBundle | null;
  deployments?: PatchDeployment[];
  affectedProducts?: PatchAffectedProduct[];
  vulnerabilities?: PatchVulnerability[];
  assetPatchRecommendations?: AssetPatchRecommendation[];
}

export interface PatchBundle {
  id: string;
  patchId: string;
  patch?: Patch;
  minioBucket: string;
  bundleObjectKey: string | null;
  bundleChecksum: string | null;
  bundleSize: string | null;
  manifestJson: unknown | null;
  scriptsIncluded: boolean;
  scriptInstall: string | null;
  scriptRollback: string | null;
  scriptVerify: string | null;
  scriptUninstall: string | null;
  sourceUrl: string | null;
  downloadStatus: string;
  downloadedAt: string | null;
  downloadError: string | null;
  retryCount: number;
  fileName: string | null;
  fileSize: string | null;
  fileChecksum: string | null;
  checksumType: string | null;
  requiresRoot: boolean;
  timeoutSeconds: number;
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
  triggerType: string | null;
  skipApprovalCheck: boolean;
  approvalOverrideBy: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  patches?: Patch[];
  tasks?: PatchDeploymentTask[];
}

export interface PatchDeploymentTask {
  id: string;
  deploymentId: string;
  deployment?: PatchDeployment;
  agentId: string | null;
  assetId: string;
  asset?: Asset;
  status: string;
  commandId: string | null;
  command?: AgentCommand | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  output: string | null;
  exitCode: number | null;
  previousVersion: string | null;
  installedVersion: string | null;
  rollbackAvailable: boolean;
  retryAttempt: number;
  verifiedAt: string | null;
  verifyResult: string | null;
  createdAt: string;
  updatedAt: string;
  patchRecommendation?: AssetPatchRecommendation | null;
}

export interface AssetPatchRecommendation {
  id: string;
  assetId: string;
  asset?: Asset;
  vulnerabilityId: string;
  vulnerability?: Vulnerability;
  patchId: string;
  patch?: Patch;
  status: string;
  severity: string;
  cvssScore: number | null;
  epssScore: number | null;
  riskScore: number | null;
  reason: string | null;
  affectedSoftware: string | null;
  deploymentTaskId: string | null;
  deploymentTask?: PatchDeploymentTask | null;
  recommendedAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  deployedAt: string | null;
  verifiedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatchAffectedProduct {
  id: string;
  patchId: string;
  patch?: Patch;
  softwareName: string;
  version: string | null;
  vendor: string | null;
  installedOn: number;
  platform: string | null;
}

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
  authConfig: unknown | null;
  syncSchedule: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
  downloadJobs?: PatchDownloadJob[];
}

export interface PatchDownloadJob {
  id: string;
  jobId: string;
  sourceId: string | null;
  source?: PatchSource | null;
  patchId: string | null;
  sourceUrl: string;
  targetPath: string;
  fileName: string;
  expectedSize: string | null;
  expectedChecksum: string | null;
  checksumType: string | null;
  status: string;
  progress: number;
  downloadedBytes: string | null;
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
  patch?: Patch;
  cveNumber: string;
  severity: string | null;
  description: string | null;
  publishedDate: string | null;
  correlationSource: string;
}

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
  autoDeploymentRules: unknown;
  status: string;
  createdBy: string | null;
  lastTriggeredAt: string | null;
  deploymentsCreated: number;
  createdAt: string;
  updatedAt: string;
}

export interface IPRange {
  id: string;
  name: string;
  range: string;
  description: string | null;
  credentialId: string | null;
  credential?: DeviceCredential | null;
  scanScheduleType: string | null;
  scanScheduleTime: string | null;
  scanScheduleDay: number | null;
  lastScanned: string | null;
  deviceCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  scans?: DiscoveryScan[];
  discoveredDevices?: DiscoveredDevice[];
}

export interface DeviceCredential {
  id: string;
  name: string;
  type: string;
  username: string | null;
  passwordEnc: string | null;
  domain: string | null;
  snmpCommunity: string | null;
  snmpVersion: string | null;
  port: number | null;
  description: string | null;
  lastUsed: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  ipRanges?: IPRange[];
}

export interface DiscoveryScan {
  id: string;
  ipRangeId: string;
  ipRange?: IPRange;
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
  ipRange?: IPRange;
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

export interface Job {
  id: string;
  type: string;
  name: string;
  status: string;
  priority: number;
  payload: unknown | null;
  result: unknown | null;
  progress: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  name: string;
  type: string;
  format: string;
  status: string;
  parameters: unknown | null;
  filePath: string | null;
  fileSize: string | null;
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
  parameters: unknown | null;
  recipients: string[];
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  id: string;
  key: string;
  value: unknown;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertConfig {
  id: string;
  type: string;
  enabled: boolean;
  config: unknown;
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
  bindPasswordEnc: string;
  userFilter: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  user?: User | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: unknown | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export interface Category {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  subCategories?: SubCategory[];
  assets?: Asset[];
}

export interface SubCategory {
  id: string;
  categoryId: string;
  category?: Category;
  name: string;
  criticality: string | null;
  description: string | null;
  createdAt: string;
  assets?: Asset[];
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
  cost: string | null;
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
  result: unknown | null;
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

export interface SoftwarePackage {
  id: string;
  packageId: string;
  name: string;
  displayName: string;
  version: string;
  vendor: string | null;
  category: string | null;
  platform: string;
  architecture: string | null;
  installSource: string;
  installCommand: string | null;
  installArgs: string | null;
  silentInstall: boolean;
  requiresReboot: boolean;
  requiresRoot: boolean;
  minioObjectKey: string | null;
  minioBucket: string | null;
  fileName: string | null;
  fileSize: string | null;
  checksum: string | null;
  checksumType: string | null;
  bundleObjectKey: string | null;
  bundleChecksum: string | null;
  bundleSize: string | null;
  manifestJson: unknown | null;
  scriptsIncluded: boolean;
  scriptInstall: string | null;
  scriptUpdate: string | null;
  scriptRollback: string | null;
  scriptUninstall: string | null;
  downloadUrl: string | null;
  description: string | null;
  releaseNotes: string | null;
  iconUrl: string | null;
  tags: string[];
  preInstallScript: string | null;
  postInstallScript: string | null;
  uninstallCommand: string | null;
  supportsRollback: boolean;
  rollbackCommand: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  bundleItems?: HubBundleItem[];
}

export interface HubBundle {
  id: string;
  bundleId: string;
  name: string;
  description: string | null;
  platform: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  items?: HubBundleItem[];
}

export interface HubBundleItem {
  id: string;
  bundleId: string;
  bundle?: HubBundle;
  packageId: string;
  package?: SoftwarePackage;
  order: number;
}

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
  tasks?: SoftwareDeploymentTask[];
}

export interface SoftwareDeploymentTask {
  id: string;
  deploymentId: string;
  deployment?: SoftwareDeployment;
  agentId: string | null;
  assetId: string | null;
  asset?: Asset | null;
  agentName: string;
  agentOs: string;
  packageName: string;
  status: string;
  commandId: string | null;
  command?: AgentCommand | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  output: string | null;
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
  bundleItems?: ConfigBundleItem[];
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
  items?: ConfigBundleItem[];
}

export interface ConfigBundleItem {
  id: string;
  bundleId: string;
  bundle?: ConfigBundle;
  configId: string;
  config?: ConfigCatalog;
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
  tasks?: ConfigDeploymentTask[];
}

export interface ConfigDeploymentTask {
  id: string;
  deploymentId: string;
  deployment?: ConfigDeployment;
  agentId: string | null;
  agentName: string;
  agentOs: string;
  configName: string;
  status: string;
  commandId: string | null;
  command?: AgentCommand | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  output: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComputerGroup {
  id: string;
  name: string;
  description: string | null;
  endpoints: string[];
  endpointCount: number;
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

export interface AssetAlert {
  id: string;
  assetId: string;
  asset?: Asset;
  alertConfigId: string | null;
  alert: string;
  severity: string;
  module: string;
  attribute: string;
  value: string;
  message: string;
  status: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  user?: User;
  title: string;
  message: string;
  type: string;
  category: string;
  read: boolean;
  link: string | null;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  user?: User;
  agentInApp: boolean;
  agentEmail: boolean;
  deploymentInApp: boolean;
  deploymentEmail: boolean;
  vulnerabilityInApp: boolean;
  vulnerabilityEmail: boolean;
  alertInApp: boolean;
  alertEmail: boolean;
  systemInApp: boolean;
  systemEmail: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorLogo {
  id: string;
  name: string;
  type: string;
  logoUrl: string;
  fileName: string;
  objectKey: string | null;
  createdAt: string;
  updatedAt: string;
}
