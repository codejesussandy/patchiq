/**
 * Shared API Types
 * Request/response/query types for PatchIQ API communication.
 *
 * Model types (Prisma-derived) are in models.ts.
 * Enum types are in enums.ts.
 * This file contains API-layer types: inputs, responses that differ from
 * models, query params, and domain-specific sub-types.
 */

import type {
  PatchSeverity,
  PatchOS,
  TestStatus,
  ApprovalStatus,
  DeploymentConfigType,
  DeploymentScope,
  AssetStatus,
  OperationalStatus,
  LicenseStatus,
  AgentStatus as AgentStatusEnum,
  VulnerabilitySeverity,
  ExceptionType,
  ExceptionScope,
  SoftwareDeploymentType,
  ReportType,
  ReportFormat,
  ReportStatus,
  ReportFrequency,
  ApplicationFilterType,
  ScopeFilterType,
  PolicyType,
  PatchSourceCategory,
  PatchSourceAuthType,
  DownloadJobStatus,
  ScanScheduleType,
  CredentialType,
  SNMPVersion,
  ScanStatus,
  DiscoveredDeviceStatus,
} from './enums';

// ============================================
// Generic API Response Types
// ============================================

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// Filter & Query Types
// ============================================

export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export interface SortParams {
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface QueryParams extends FilterParams, SortParams, Partial<PaginationParams> {}

// ============================================
// Bulk Operation Types
// ============================================

export interface BulkOperationRequest {
  ids: string[];
}

export interface BulkOperationResponse {
  success: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

// ============================================
// Common Response Types
// ============================================

export interface MessageResponse {
  message: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  services?: {
    database: 'up' | 'down';
    cache?: 'up' | 'down';
  };
}

export interface IdParam {
  id: string;
}

// ============================================
// Auth API Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserRoleInfo {
  id: string;
  name: string;
  permissions: RolePermissions;
}

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleInfo: UserRoleInfo;
  isOnboarded: boolean;
  organizationId?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
  authSource?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponseData {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface OnboardingRequest {
  name: string;
  contactNumber: string;
  password: string;
  confirmPassword: string;
}

export interface OnboardingResponseData {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    contactNumber: string | null;
    isOnboarded: boolean;
  };
}

export interface UserMeResponse {
  id: string;
  email: string;
  name: string | null;
  contactNumber: string | null;
  role: string;
  roleInfo: UserRoleInfo;
  organizationId: string | null;
  departmentId: string | null;
  locationId: string | null;
  isOnboarded: boolean;
  createdAt: string;
}

// ============================================
// Agent API Types
// ============================================

export interface AgentRegistrationRequest {
  machineId: string;
  hostname?: string;
  os?: string;
  osVersion?: string;
  architecture?: string;
  agentVersion?: string;
  ipAddress?: string;
  macAddress?: string;
  serialNumber?: string;
  capabilities?: string[];
}

export interface AgentConfig {
  heartbeatIntervalSeconds: number;
  inventoryScheduleCron: string;
  telemetryIntervalSeconds: number;
  telemetryEnabled: boolean;
  patchScanScheduleCron: string;
  logLevel: string;
}

export interface AgentRegistrationResponse {
  agentId: string;
  assetId: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresIn: number;
  config: AgentConfig;
  isReRegistration: boolean;
  status: AgentStatusEnum;
  message?: string;
}

export interface HeartbeatResponse {
  acknowledged: boolean;
  serverTime: string;
  commandsPending: boolean;
  configUpdated: boolean;
  inventoryRequested: boolean;
}

export interface PendingCommand {
  id: string;
  type: string;
  payload?: unknown;
  createdAt: string;
}

export interface AgentGroup {
  id: string;
  name: string;
}

export interface AgentResponse {
  id: string;
  machineId: string;
  name: string | null;
  status: string;
  os: string | null;
  osVersion: string | null;
  agentVersion: string | null;
  lastHeartbeat: string | null;
  lastHeartbeatRelative?: string | null;
  registeredAt: string;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
  serialNumber: string | null;
  assetId: string | null;
  tags: string[];
  groups: AgentGroup[];
  capabilities: string[];
}

export interface AgentDownloadResponse {
  os: string;
  version: string;
  releaseDate: string;
  downloadUrl: string;
}

export interface AgentVersionResponse {
  id: string;
  platform: string;
  architecture: string;
  version: string;
  filePath: string | null;
  fileSize: number | null;
  checksum: string | null;
  releaseNotes: string | null;
  isRecommended: boolean;
  isDeprecated: boolean;
  downloadCount: number;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface CommandResponse {
  id: string;
  agentId: string;
  type: string;
  status: string;
  createdAt: string;
  executedAt: string | null;
  result: unknown;
}

export interface AgentListParams extends PaginationParams {
  status?: string;
  os?: string;
  search?: string;
}

// ============================================
// Asset API Types
// ============================================

export interface AgentStatusInfo {
  id: string;
  status: string;
  version: string;
  lastHeartbeat?: string | null;
  lastHeartbeatRelative?: string | null;
  heartbeatInterval: number;
}

export interface AssetCostInfo {
  cost?: string | null;
  currency?: string | null;
  currentCost?: string | null;
  depreciationType?: string | null;
  invoiceNumber?: string | null;
  purchaseDate?: string | null;
  salvageValue?: string | null;
  age?: string | null;
}

export interface AssetProcurementInfo {
  vendor?: string | null;
  purchaseOrderNumber?: string | null;
  amcCost?: string | null;
  amcExpiryDate?: string | null;
  amcVendor?: string | null;
  warrantyExpiryDate?: string | null;
  warrantyYearAndMonth?: string | null;
  endOfLife?: string | null;
  endOfSupport?: string | null;
}

export interface AssetResponse {
  id: string;
  assetId: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string | null;
  subCategoryId?: string | null;
  subCategoryName?: string | null;
  status: AssetStatus;
  operationalStatus: OperationalStatus;
  operationalStatusSince?: string | null;
  agentId?: string | null;
  agent?: AgentStatusInfo | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  hostname?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  osType?: string | null;
  osVersion?: string | null;
  memorySize?: string | null;
  diskSize?: string | null;
  systemSKU?: string | null;
  tags?: TagResponse[];
  createdAt: string;
  updatedAt: string;
  cost?: AssetCostInfo;
  procurement?: AssetProcurementInfo;
}

export interface AssetCreateInput {
  name: string;
  categoryId?: string;
  subCategoryId?: string;
  status?: AssetStatus;
  ipAddress?: string;
  macAddress?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  osType?: string;
  osVersion?: string;
  tags?: string[];
}

export interface AssetUpdateInput {
  name?: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  status?: AssetStatus;
  ipAddress?: string | null;
  macAddress?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  osType?: string | null;
  osVersion?: string | null;
  hostname?: string | null;
  tags?: string[];
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerDepartment?: string | null;
  vendor?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  purchaseOrderNumber?: string | null;
  amcVendor?: string | null;
  amcCost?: string | null;
  amcExpiryDate?: string | null;
  endOfLife?: string | null;
  endOfSupport?: string | null;
  purchaseCost?: number | null;
  invoiceNumber?: string | null;
  currency?: string | null;
  currentValue?: number | null;
  salvageValue?: number | null;
  depreciationType?: string | null;
  depreciationRate?: number | null;
}

export interface AssetFilters {
  status?: AssetStatus;
  operationalStatus?: OperationalStatus;
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
}

export interface AssetListParams extends PaginationParams {
  status?: string;
  operationalStatus?: string;
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
}

// Category/SubCategory API types
export interface CategoryResponse {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  isDefault: boolean;
  createdAt: string;
  subCategories?: SubCategoryResponse[];
}

export interface CategoryCreateInput {
  name: string;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

export interface CategoryUpdateInput {
  name?: string;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

export interface SubCategoryResponse {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  criticality?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface SubCategoryCreateInput {
  categoryId: string;
  name: string;
  criticality?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description?: string;
}

export interface SubCategoryUpdateInput {
  categoryId?: string;
  name?: string;
  criticality?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description?: string;
}

// Tag API types
export interface TagResponse {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  priority: number;
  compliance: boolean;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagCreateInput {
  name: string;
  color?: string;
  icon?: string;
  description?: string;
  priority?: number;
  compliance?: boolean;
}

export interface TagUpdateInput {
  name?: string;
  color?: string;
  icon?: string;
  description?: string;
  priority?: number;
  compliance?: boolean;
}

// Asset Hardware sub-types (API response shapes)
export interface BiosInfo {
  name?: string;
  installDate?: string;
  biosVersion?: string;
  manufacturer?: string;
  description?: string;
  secureBootState?: string;
  serialNumber?: string;
}

export interface ProcessorInfo {
  name?: string;
  logicalProcessors?: number;
  manufacturer?: string;
  numberOfCores?: number;
  processorSpeed?: string;
  secureBootState?: string;
}

export interface BaseBoardInfo {
  name?: string;
  partNumber?: string;
  productId?: string;
  serialNumber?: string;
  tag?: string;
  version?: string;
}

export interface StorageInfo {
  name: string;
  drive?: string;
  capacity?: string;
  used?: string;
  format?: string;
  type?: string;
  serialNumber?: string;
}

export interface MemoryInfo {
  slot: string;
  name?: string;
  capacity?: string;
  bankLabel?: string;
  locator?: string;
  memoryType?: string;
  serialNumber?: string;
  partNumber?: string;
}

export interface NetworkAdapterInfo {
  id: string;
  name: string;
  ipAddressV4?: string;
  ipAddressV6?: string;
  macAddress?: string;
  dhcpServer?: string;
}

export interface BatteryInfo {
  id?: string;
  name?: string;
  health?: string;
  cycleCount?: number;
  chargeLevel?: number;
  chargingStatus?: string;
  batteryCapacity?: string;
  estimatedRuntime?: string;
  temperature?: string;
}

export interface GraphicsCardInfo {
  name: string;
  manufacturer?: string;
  driverVersion?: string;
  driverDate?: string;
  videoMemoryMB?: number;
  currentResolution?: string;
  refreshRate?: number;
}

export interface AssetHardwareResponse {
  bios?: BiosInfo;
  processor?: ProcessorInfo;
  baseBoard?: BaseBoardInfo;
  storage: StorageInfo[];
  memory: MemoryInfo[];
  networkAdapters: NetworkAdapterInfo[];
  battery?: BatteryInfo;
  graphicsCards?: GraphicsCardInfo[];
}

// Asset Software sub-types
export interface SoftwareLicenseInfo {
  type?: string;
  status?: string;
  key?: string;
  expirationDate?: string;
  daysRemaining?: number;
  licensedTo?: string;
  productId?: string;
  channel?: string;
}

export interface ApplicationInfo {
  id: string;
  name: string;
  vendor?: string;
  version?: string;
  patchStatus?: 'AVAILABLE' | 'NOT_AVAILABLE';
  lastPatched?: string;
  appInstalledOn?: string;
  installSource?: string;
  isSystemApp?: boolean;
  license?: SoftwareLicenseInfo;
}

export interface ServiceInfo {
  id: string;
  name: string;
  displayName?: string;
  state?: 'Running' | 'Stopped';
  startupType?: string;
  type?: string;
  status?: string;
}

export interface StartupProgramInfo {
  id: string;
  name: string;
  command?: string;
  location?: string;
  enabled: boolean;
  vendor?: string;
}

export interface AssetSoftwareResponse {
  os?: {
    name: string;
    version?: string;
    buildNumber?: string;
    architecture?: string;
    installDate?: string;
    licenseStatus?: string;
  };
  licenseDetails?: Record<string, string>;
  applications: ApplicationInfo[];
  services: ServiceInfo[];
  startupPrograms: StartupProgramInfo[];
}

// Asset Security sub-types
export interface AntivirusProduct {
  name: string;
  vendor?: string;
  version?: string;
  enabled?: boolean;
  realTimeProtection?: boolean;
  definitionVersion?: string;
  definitionDate?: string;
  lastScanDate?: string;
  lastScanType?: string;
  lastScanResult?: string;
  threatsDetected?: number;
}

export interface AssetSecurityResponse {
  collectedAt?: string;
  encryption?: {
    driveEncryptionEnabled: boolean;
    encryptionType?: string;
    tpmEnabled?: boolean;
    tpmVersion?: string;
  };
  firewall?: {
    enabled: boolean;
    productName?: string;
    activeProfile?: string;
    loggingEnabled?: boolean;
  };
  antivirus?: {
    installed: boolean;
    products?: AntivirusProduct[];
    xdrInstalled?: boolean;
    xdrProductName?: string;
  };
  patchStatus?: {
    lastScanDate?: string;
    pendingUpdates?: number;
    criticalUpdates?: number;
    securityUpdates?: number;
    pendingReboot?: boolean;
  };
  secureBootEnabled?: boolean;
  uacEnabled?: boolean;
  screenLockEnabled?: boolean;
  remoteDesktopEnabled?: boolean;
}

// Asset Network sub-types
export interface NetworkAdapterDetail {
  id: string;
  name: string;
  description?: string;
  type?: string;
  macAddress?: string;
  status?: string;
  speedMbps?: number;
  ipConfiguration?: {
    ipv4Address?: string;
    ipv4SubnetMask?: string;
    ipv4Gateway?: string;
    dhcpEnabled?: boolean;
    dhcpServer?: string;
    dnsServers?: string[];
  };
  isPhysical?: boolean;
  isEnabled?: boolean;
}

export interface AssetNetworkResponse {
  collectedAt?: string;
  identity?: {
    hostname?: string;
    fqdn?: string;
    domainName?: string;
    isDomainJoined?: boolean;
  };
  adapters: NetworkAdapterDetail[];
  primaryAdapter?: string;
  publicIpAddress?: string;
  vpnConnected?: boolean;
  proxyConfigured?: boolean;
}

// Asset Peripheral sub-types
export interface MonitorInfo { id: string; name: string; manufacturer?: string; model?: string; serialNumber?: string; connectionType?: string; resolution?: string; refreshRate?: number; screenSizeInches?: number; isPrimary?: boolean; isBuiltIn?: boolean; }
export interface UsbDeviceInfo { id: string; name: string; manufacturer?: string; deviceType?: string; deviceClass?: string; usbVersion?: string; speed?: string; isRemovable?: boolean; }
export interface PrinterInfo { id: string; name: string; driverName?: string; connectionType?: string; ipAddress?: string; status?: string; isDefault?: boolean; isNetwork?: boolean; }
export interface AudioDeviceInfo { id: string; name: string; type?: 'Input' | 'Output' | 'Both'; deviceType?: string; isDefault?: boolean; isEnabled?: boolean; connectionType?: string; }
export interface BluetoothDeviceInfo { id: string; name: string; address?: string; type?: string; connected?: boolean; paired?: boolean; batteryLevel?: number; }

export interface AssetPeripheralsResponse {
  collectedAt?: string;
  monitors?: MonitorInfo[];
  monitorCount?: number;
  usbDevices?: UsbDeviceInfo[];
  usbDeviceCount?: number;
  printers?: PrinterInfo[];
  audioDevices?: AudioDeviceInfo[];
  bluetoothDevices?: BluetoothDeviceInfo[];
  bluetoothEnabled?: boolean;
}

// Asset Telemetry sub-types
export interface DriveTelemetry { mountPoint: string; usagePercent: number; usedBytes?: number; freeBytes?: number; }
export interface TelemetryDataPoint { timestamp: string; value: number; }
export interface TelemetryHistory { cpu: TelemetryDataPoint[]; memory: TelemetryDataPoint[]; disk: TelemetryDataPoint[]; networkIn: TelemetryDataPoint[]; networkOut: TelemetryDataPoint[]; }
export interface SystemErrors { applicationCrashCount24h?: number; applicationCrashCount7d?: number; lastCrash?: { timestamp: string; application: string; errorCode?: string; description?: string; }; bsodCount30d?: number; systemEventLogErrors24h?: number; criticalEventCount24h?: number; }

export interface AssetTelemetryResponse {
  timestamp: string;
  cpu?: { usagePercent: number; userPercent?: number; systemPercent?: number; idlePercent?: number; loadAverage?: number[]; temperature?: number; processCount?: number; threadCount?: number; };
  memory?: { usagePercent: number; totalBytes?: number; usedBytes?: number; availableBytes?: number; freeBytes?: number; buffersBytes?: number; cachedBytes?: number; applicationUsedBytes?: number; usedHuman?: string; availableHuman?: string; };
  disk?: { drives?: DriveTelemetry[]; };
  network?: { bytesSentPerSec?: number; bytesReceivedPerSec?: number; totalBytesSentPerSec?: number; totalBytesReceivedPerSec?: number; internetConnected?: boolean; };
  processes?: { totalCount?: number; runningCount?: number; topByCpu?: Array<{ pid: number; name: string; cpuPercent: number }>; topByMemory?: Array<{ pid: number; name: string; memoryPercent: number }>; };
  systemUptime?: { uptimeSeconds: number; uptimeHuman: string; bootTime?: string; };
  thermal?: Record<string, unknown>;
  power?: Record<string, unknown>;
  agentUtilization?: Record<string, unknown>;
  pendingReboot?: boolean;
  batteryChargePercent?: number;
  batteryCharging?: boolean;
}

// Asset Lifecycle
export interface DepreciationPoint {
  date: string;
  value: number;
  label: string;
  year?: number;
}

export interface AssetLifeCycle {
  purchaseDate?: string | null;
  purchaseValue?: number | null;
  currentDate: string;
  currentValue?: number | null;
  amcExpiryDate?: string | null;
  warrantyExpiryDate?: string | null;
  endOfLife?: string | null;
  endOfLifeValue?: number | null;
  depreciationTimeline: DepreciationPoint[];
  depreciationMethod?: string | null;
  totalDepreciation?: number | null;
  annualDepreciation?: number | null;
  yearsElapsed?: number | null;
  yearsRemaining?: number | null;
  usefulLifeYears?: number | null;
  currency?: string;
  hasFinancialData?: boolean;
}

// Asset Patches/Deployments
export type AssetPatchStatus = 'INSTALLED' | 'MISSING' | 'PENDING' | 'FAILED';

export interface PatchSummary {
  total: number;
  installed: number;
  missing: number;
  failed: number;
  pending: number;
  criticalMissing?: number;
  securityMissing?: number;
  lastScanDate: string | null;
  lastScanRelative?: string;
  compliancePercent?: number;
}

export interface AssetRelatedPatch {
  id: string;
  patchId: string;
  name: string;
  severity: PatchSeverity;
  status: AssetPatchStatus;
  kbNumber?: string;
  publishedAt?: string;
  deploymentId?: string;
  deploymentName?: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface AssetDeploymentResponse {
  id: string;
  deploymentId: string;
  deploymentName: string;
  patchId?: string;
  patchName?: string;
  softwareName?: string;
  type: 'PATCH' | 'SOFTWARE';
  date: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
  errorMessage?: string;
}

export interface AssetPatchesResponse {
  data: AssetRelatedPatch[];
  summary: PatchSummary;
}

export interface AssetDeploymentsResponse {
  data: AssetDeploymentResponse[];
}

export interface AssetAuditLog { id: string; timestamp: string; action: string; user: string; details?: string; }
export interface AssetAlertResponse { id: string; alert: string; severity: string; module: string; attribute: string; value: string; message: string; status: string; createdOn: string; resolvedAt?: string | null; }

// License API types
export interface SoftwareInventoryResponse { id: string; softwareName: string; version?: string | null; softwareType?: string | null; manufacturer?: string | null; totalInstances: number; createdAt: string; }
export interface SoftwareLicenseResponse { id: string; licenseName: string; softwareName: string; publisher?: string | null; licenseKey?: string | null; purchaseDate?: string | null; expiryDate?: string | null; licenseCount: number; vendorName: string; cost?: number | null; status: string; notes?: string | null; createdAt: string; }
export interface SoftwareLicenseCreateInput { licenseName: string; softwareName: string; publisher?: string; licenseKey?: string; purchaseDate?: string; expiryDate?: string; licenseCount: number; vendorName: string; cost?: number; status: LicenseStatus; notes?: string; }
export interface SoftwareLicenseUpdateInput { licenseName?: string; softwareName?: string; publisher?: string; licenseKey?: string; purchaseDate?: string; expiryDate?: string; licenseCount?: number; vendorName?: string; cost?: number; status?: LicenseStatus; notes?: string; }
export interface OSLicenseResponse { id: string; licenseName: string; osType: string; status: string; licenseCount: number; vendorName: string; licenseKey?: string | null; purchaseDate?: string | null; expiryDate?: string | null; publisher?: string | null; cost?: string | null; notes?: string | null; createdAt: string; }
export interface OSLicenseCreateInput { licenseName: string; osType: string; status: LicenseStatus; licenseCount: number; vendorName: string; licenseKey?: string; purchaseDate?: string; expiryDate?: string; publisher?: string; cost?: string; notes?: string; }
export interface OSLicenseUpdateInput { licenseName?: string; osType?: string; status?: LicenseStatus; licenseCount?: number; vendorName?: string; licenseKey?: string; purchaseDate?: string; expiryDate?: string; publisher?: string; cost?: string; notes?: string; }

// ============================================
// Patch API Types
// ============================================

export interface CreatePatchInput {
  software: string;
  title?: string;
  description?: string;
  severity?: PatchSeverity;
  category?: string;
  vendor?: string;
  product?: string;
  os?: PatchOS;
  platform?: string;
  architecture?: string;
  kbNumber?: string;
  bulletinId?: string;
  releaseDate?: string;
  referenceUrl?: string;
  rebootRequired?: boolean;
  supportUninstallation?: boolean;
  languagesSupported?: string[];
  tags?: string[];
  cveNumbers?: string[];
}

export interface UpdatePatchInput {
  software?: string;
  title?: string;
  description?: string;
  severity?: PatchSeverity;
  category?: string;
  testStatus?: TestStatus;
  approvalStatus?: ApprovalStatus;
  tags?: string[];
}

export interface PatchListParams extends PaginationParams {
  severity?: string;
  os?: string;
  category?: string;
  testStatus?: string;
  approvalStatus?: string;
  search?: string;
}

export interface TestPatchInput {
  status: 'PASSED' | 'FAILED';
  notes?: string;
  testEnvironment?: string;
}

export interface RejectPatchInput {
  reason: string;
  notes?: string;
}

export interface AffectedProduct {
  id: string;
  softwareName: string;
  version?: string | null;
  vendor?: string | null;
  installedOn: number;
  platform?: string | null;
}

export interface PatchVulnerabilityInfo {
  id: string;
  cveNumber: string;
  severity?: string | null;
  description?: string | null;
  publishedDate?: string | null;
}

export interface ScanEndpointsInput {
  scope: 'All End Points' | 'Specific Groups';
  endpointIds?: string[];
}

// Patch Deployment types
export interface CreatePatchDeploymentInput {
  name: string;
  description?: string;
  type: DeploymentConfigType;
  configType?: DeploymentConfigType;
  scope?: DeploymentScope;
  schedule?: string;
  targetGroups?: string[];
  patches: string[];
}

export interface DeploymentPreview {
  deploymentId: string;
  patches: unknown[];
  targetEndpoints: number;
  estimatedDuration: string;
}

// Patch Test types
export interface CreatePatchTestInput {
  name: string;
  description?: string;
  applicationType?: ApplicationFilterType;
  applications?: string[];
  scope?: ScopeFilterType;
  computers?: string[];
  groups?: string[];
}

// Zero-Touch Config types
export interface AutoDeploymentRules {
  severity: string[];
  approvalRequired: boolean;
  schedule: string;
}

export interface CreateZeroTouchConfigInput {
  name: string;
  description?: string;
  applicationType?: ApplicationFilterType;
  applications?: string[];
  scope?: ScopeFilterType;
  computers?: string[];
  groups?: string[];
  autoDeploymentRules: AutoDeploymentRules;
}

export interface UpdateZeroTouchConfigInput {
  name?: string;
  description?: string;
  applicationType?: ApplicationFilterType;
  applications?: string[];
  scope?: ScopeFilterType;
  computers?: string[];
  groups?: string[];
  autoDeploymentRules?: AutoDeploymentRules;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
}

// ============================================
// Job API Types
// ============================================

export interface JobListQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  scope?: string;
  search?: string;
}

export interface SoftwareCatalogQuery {
  page?: number;
  limit?: number;
  os?: string;
  search?: string;
}

export interface ConfigCatalogQuery {
  page?: number;
  limit?: number;
  os?: string;
  search?: string;
}

export interface DeploymentQuery {
  page?: number;
  limit?: number;
  stage?: string;
}

// Job response types (extend models with API-specific shapes)
export interface DeploymentTaskResponse {
  id: string;
  deploymentId: string;
  endpoint: {
    name: string;
    os: string;
    status: string;
  };
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
  createdBy: string | null;
  lastUpdated: string;
  createdOn: string;
}

// ============================================
// Deployment Executor API Types
// ============================================

export interface SoftwareInstallPayload {
  name: string;
  version?: string;
  source: 'apt' | 'brew' | 'dnf' | 'yum' | 'snap' | 'flatpak' | 'pkg' | 'dmg' | 'msi' | 'exe' | 'deb' | 'rpm' | 'url';
  packageUrl?: string;
  checksum?: string;
  checksumType?: 'md5' | 'sha256';
  installArgs?: string;
  silentInstall?: boolean;
  preInstallScript?: string;
  postInstallScript?: string;
}

export interface SoftwareUninstallPayload {
  name: string;
  version?: string;
  source?: string;
  uninstallCommand?: string;
}

export interface PatchInstallPayload {
  patchId: string;
  kbNumber?: string;
  packageName?: string;
  downloadUrl?: string;
  checksum?: string;
  checksumType?: 'md5' | 'sha256';
  rebootRequired?: boolean;
  forceReboot?: boolean;
}

export interface CreateSoftwareDeploymentOptions {
  name: string;
  description?: string;
  deploymentType: SoftwareDeploymentType;
  targetAgentIds: string[];
  package: SoftwareInstallPayload | SoftwareUninstallPayload;
  retryCount?: number;
  createdBy?: string;
}

export interface CreateConfigDeploymentOptions {
  name: string;
  description?: string;
  targetAgentIds: string[];
  configurationIds?: string[];
  bundleIds?: string[];
  selectionType?: 'CONFIGURATION' | 'BUNDLE';
  retryCount?: number;
  createdBy?: string;
}

export interface CreatePatchDeploymentOptions {
  name: string;
  description?: string;
  targetAgentIds: string[];
  patches: (PatchInstallPayload | { id: string })[];
  retryCount?: number;
  autoRollback?: boolean;
  triggerType?: string;
  createdBy?: string;
}

export interface DeploymentCreationResult {
  deploymentId: string;
  tasksCreated: number;
  commandsCreated: number;
  status: 'CREATED' | 'PARTIAL' | 'FAILED';
  errors?: string[];
}

export interface TaskStatusUpdate {
  commandId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  result?: Record<string, unknown>;
  errorMessage?: string;
  output?: string;
}

// Script bundle types
export interface ScriptManifest {
  id: string;
  name: string;
  displayName: string;
  version: string;
  vendor?: string;
  category?: string;
  platform: 'windows' | 'macos' | 'linux' | 'cross-platform';
  architecture?: string;
  description?: string;
  requiresRoot?: boolean;
  requiresReboot?: boolean;
  scripts: {
    install?: string;
    update?: string;
    rollback?: string;
    uninstall?: string;
  };
  environment?: Record<string, string>;
  dependencies?: string[];
  conflicts?: string[];
}

export interface ScriptBundlePayload {
  operationType: 'install' | 'update' | 'rollback' | 'uninstall';
  packageId: string;
  packageName: string;
  version: string;
  bundleUrl?: string;
  bundleChecksum?: string;
  manifest?: ScriptManifest;
  script?: string;
  requiresRoot: boolean;
  timeout?: number;
  environment?: Record<string, string>;
}

// ============================================
// Discovery API Types
// ============================================

export interface ScanSchedule {
  type: ScanScheduleType;
  time?: string;
  dayOfWeek?: number;
}

export interface CredentialBasicInfo {
  id: string;
  name: string;
  type: string;
}

export interface IPRangeResponse {
  id: string;
  name: string;
  range: string;
  description: string | null;
  lastScanned: string | null;
  deviceCount: number;
  credentialId: string | null;
  credential: CredentialBasicInfo | null;
  scanSchedule: ScanSchedule | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface ListIPRangesParams {
  page: number;
  limit: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface DeviceCredentialResponse {
  id: string;
  name: string;
  type: CredentialType;
  username: string | null;
  domain: string | null;
  snmpCommunity: string | null;
  snmpVersion: SNMPVersion | null;
  port: number | null;
  description: string | null;
  lastUsed: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface DeviceCredentialDetailResponse extends DeviceCredentialResponse {
  password?: string;
}

export interface ListCredentialsParams {
  page: number;
  limit: number;
  search?: string;
  type?: CredentialType;
}

export interface TestCredentialResponse {
  success: boolean;
  message: string;
  errorCode?: 'AUTH_FAILED' | 'HOST_UNREACHABLE' | 'TIMEOUT' | 'UNKNOWN';
  latencyMs?: number;
}

export interface ScanResponse {
  id: string;
  ipRangeId: string;
  status: ScanStatus;
  devicesFound: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface TriggerScanResponse {
  jobId: string;
  status: string;
  message: string;
}

export interface DiscoveredDeviceResponse {
  id: string;
  ipRangeId: string;
  ipAddress: string;
  hostname: string | null;
  macAddress: string | null;
  deviceType: string | null;
  os: string | null;
  vendor: string | null;
  openPorts: number[];
  status: DiscoveredDeviceStatus;
  assetId: string | null;
  discoveredAt: string;
  lastSeenAt: string;
}

export interface ListDiscoveredDevicesParams {
  page: number;
  limit: number;
  ipRangeId?: string;
  status?: DiscoveredDeviceStatus;
  search?: string;
}

export interface EnrollDeviceResponse {
  assetId: string;
  message: string;
}

// ============================================
// Hub / Software Package API Types
// ============================================

export interface CreatePackageInput {
  name: string;
  displayName: string;
  version: string;
  vendor?: string;
  category?: string;
  platform: 'windows' | 'macos' | 'linux' | 'cross-platform';
  architecture?: 'x64' | 'arm64' | 'universal';
  installSource: string;
  installCommand?: string;
  installArgs?: string;
  silentInstall?: boolean;
  requiresReboot?: boolean;
  downloadUrl?: string;
  description?: string;
  releaseNotes?: string;
  iconUrl?: string;
  tags?: string[];
  preInstallScript?: string;
  postInstallScript?: string;
  uninstallCommand?: string;
  supportsRollback?: boolean;
  rollbackCommand?: string;
}

export interface UpdatePackageInput {
  name?: string;
  displayName?: string;
  version?: string;
  vendor?: string;
  category?: string;
  platform?: 'windows' | 'macos' | 'linux' | 'cross-platform';
  architecture?: 'x64' | 'arm64' | 'universal';
  installSource?: string;
  installCommand?: string;
  installArgs?: string;
  silentInstall?: boolean;
  requiresReboot?: boolean;
  downloadUrl?: string;
  description?: string;
  releaseNotes?: string;
  iconUrl?: string;
  tags?: string[];
  preInstallScript?: string;
  postInstallScript?: string;
  uninstallCommand?: string;
  supportsRollback?: boolean;
  rollbackCommand?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface PackageListFilters {
  platform?: string;
  category?: string;
  vendor?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PackageResponse {
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
  silentInstall: boolean;
  requiresReboot: boolean;
  requiresRoot: boolean;
  fileName: string | null;
  fileSize: string | null;
  fileSizeBytes: number | null;
  hasFile: boolean;
  hasBundle: boolean;
  scriptsIncluded: boolean;
  downloadUrl: string | null;
  description: string | null;
  tags: string[];
  supportsRollback: boolean;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PackageDownloadUrl {
  packageId: string;
  fileName: string;
  presignedUrl: string;
  expiresAt: string;
  checksum: string | null;
  checksumType: string | null;
}

export interface CreateBundleInput {
  name: string;
  description?: string;
  platform: string;
  packageIds: string[];
}

export interface BundleResponse {
  id: string;
  bundleId: string;
  name: string;
  description: string | null;
  platform: string;
  packages: Array<{
    id: string;
    packageId: string;
    name: string;
    displayName: string;
    version: string;
    order: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedPackageResponse {
  name: string;
  displayName: string;
  vendor: string | null;
  category: string | null;
  platform: string;
  tags: string[];
  description: string | null;
  latestVersion: string;
  latestPackageId: string;
  totalVersions: number;
  hasFile: boolean;
  isActive: boolean;
  versions: PackageVersionSummary[];
}

export interface PackageVersionSummary {
  id: string;
  packageId: string;
  version: string;
  hasFile: boolean;
  hasBundle: boolean;
  isActive: boolean;
  isVerified: boolean;
  installSource: string;
  fileSize: string | null;
  createdAt: string;
}

export interface BundleDownloadResponse {
  packageId: string;
  bundleUrl: string;
  bundleChecksum: string;
  bundleSize: number;
  manifest: ScriptManifest;
  expiresAt: string;
}

// ============================================
// Report API Types
// ============================================

export interface ReportFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  severity?: string[];
  status?: string[];
  category?: string[];
  [key: string]: unknown;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: ReportFrequency;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
}

export interface ReportResponse {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  filters?: ReportFilters;
  columns?: string[];
  schedule?: ReportSchedule;
  fileUrl?: string;
  generatedAt?: string;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  availableColumns: string[];
  defaultColumns: string[];
  availableFilters: string[];
}

export interface CreateReportStep1 {
  type: ReportType;
  name: string;
  description?: string;
}

export interface CreateReportStep2 {
  reportId: string;
  filters?: ReportFilters;
  columns?: string[];
}

export interface CreateReportStep3 {
  reportId: string;
  format: ReportFormat;
  schedule?: ReportSchedule;
}

export interface ReportPreview {
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

// ============================================
// Settings API Types
// ============================================

export interface OrganizationResponse {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  branchCount?: number;
  userCount?: number;
  assetCount?: number;
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
  userCount?: number;
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

export interface OrgTreeNode {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  branchCount: number;
  userCount: number;
  assetCount: number;
  branches: Array<{
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    userCount: number;
    assetCount: number;
    departments: Array<{
      id: string;
      name: string;
      description: string | null;
      userCount: number;
    }>;
  }>;
}

export interface OrgTreeResponse {
  organizations: OrgTreeNode[];
  locations: Array<{
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    userCount: number;
    assetCount: number;
  }>;
  summary: {
    totalOrganizations: number;
    totalBranches: number;
    totalDepartments: number;
    totalLocations: number;
    totalUsers: number;
    totalAssets: number;
  };
}

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
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
  deployments?: ModulePermissions;
  discovery?: ModulePermissions;
  reports?: ModulePermissions;
  dashboard?: ModulePermissions;
  settings?: ModulePermissions;
  hub?: ModulePermissions;
  'patch-repository'?: ModulePermissions;
  'patch-templates'?: ModulePermissions;
  ai?: ModulePermissions;
  notifications?: ModulePermissions;
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

export interface ServerSettingsResponse {
  sessionTimeout: boolean;
  sessionTimeoutMinutes: number;
  sessionIdleTimeoutMinutes: number;
  endpointOnlineStatusTimeoutHours: number;
  endpointScanJobTimeoutHours: number;
  logLevel: 'Debug' | 'Info' | 'Warning' | 'Error';
}

export interface AgentConfigSettingsResponse {
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

export interface EnrollSecretResponse {
  id: string;
  name: string;
  secret: string;
  organization: string;
  department: string;
  createdOn: string;
}

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

export interface ComputerGroupResponse {
  id: string;
  name: string;
  description: string | null;
  endpoints: string[];
  endpointCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentPolicyResponse {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  type: PolicyType;
  supportedModule: string;
  relatedType: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VulnerabilityPreferenceResponse {
  id: string;
  lastSyncAt: string | null;
  scanJobInterval: number;
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;
  totalCveCount: number;
  createdAt: string;
}

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

export interface BrandingResponse {
  logoUrl: string | null;
  companyName: string | null;
}

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

export interface DistributionServerResponse {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  url: string;
  version: string | null;
  status: 'Active' | 'Inactive' | 'Maintenance';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RedHatNominationResponse {
  id: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  endpoint: number;
  scheduledTime: string | null;
  lastSyncTime: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface VendorLogoResponse {
  id: string;
  name: string;
  type: 'integration' | 'vendor' | 'os';
  logoUrl: string;
  createdAt: string;
}

export interface DeleteImpactResponse {
  canDelete: boolean;
  blockedReason?: string;
  impact: {
    branches?: number;
    departments?: number;
    users: number;
    assets: number;
    enrollSecrets?: number;
  };
  affectedItems: {
    branches?: Array<{ id: string; name: string }>;
    departments?: Array<{ id: string; name: string }>;
    users?: Array<{ id: string; email: string; name: string | null }>;
  };
}

// R5: Bulk User Import
export interface BulkImportResponse {
  totalRows: number;
  successful: number;
  failed: number;
  results: Array<{
    row: number;
    email: string;
    status: 'created' | 'invited' | 'failed';
    error?: string;
    userId?: string;
  }>;
}

// R6: Bulk User Status Change
export interface BulkActionResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: Array<{
    userId: string;
    email: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
}

// ============================================
// Dashboard API Types
// ============================================

export interface DashboardStats {
  totalEndpoints: number;
  dataLossEndpoints: number;
  windowsEndpoints: number;
  linuxEndpoints: number;
  macEndpoints: number;
  totalAgents: number;
  totalVulnerabilities: number;
  unmitigatedVulnerabilities: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  exploitableVulnerabilities: ExploitabilityBreakdown;
  nonExploitableVulnerabilities: ExploitabilityBreakdown;
}

export interface ExploitabilityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface SankeyLink {
  source: 'Critical' | 'High' | 'Medium' | 'Low';
  target: string;
  value: number;
}

export interface DistributionItem {
  name: string;
  value: number;
  color?: string;
}

export interface VulnerabilityByDate {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface VulnerabilityByDateTable {
  dateRange: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface TopVulnerability {
  cve: string;
  score: number;
  affectedEndpoints: number;
  severity: VulnerabilitySeverity;
  description: string;
}

export interface TopVulnerabilities {
  byCVSS: TopVulnerability[];
  byEPSS: TopVulnerability[];
}

export interface PatchCompliance {
  compliant: number;
  nonCompliant: number;
  pending: number;
}

export interface RecentActivity {
  patchesDeployed: number;
  patchesFailed: number;
  endpointsScanned: number;
  lastScanTime: string;
}

export interface AlertSeverityByPlatform {
  platform: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface DayWiseVulnerability {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  count: number;
}

export interface AlertSeverityByModule {
  module: string;
  critical: number;
  high: number;
  medium: number;
}

export interface DashboardData {
  stats: DashboardStats;
  vulnerabilityClassification: SankeyLink[];
  endpointDistribution: DistributionItem[];
  vulnerabilityByPublishedDate: VulnerabilityByDate[];
  vulnerabilityByDiscoveredDate: VulnerabilityByDate[];
  vulnerabilityByPublishedDateTable: VulnerabilityByDateTable[];
  topVulnerabilities: TopVulnerabilities;
  patchCompliance: PatchCompliance;
  recentActivity: RecentActivity;
  expiredCertificates: DistributionItem[];
  maliciousProcessesByPlatform: DistributionItem[];
  totalSoftwareByPlatform: DistributionItem[];
  riskScoreByEndpoints: DistributionItem[];
  alertCountBySeverity: { severity: string; count: number }[];
  alertSeverityCountByPlatform: AlertSeverityByPlatform[];
  dayWiseVulnerabilityDetection: DayWiseVulnerability[];
  alertSeverityCountByModule: AlertSeverityByModule[];
}

export interface ChartData {
  labels: string[];
  data: number[];
  colors: string[];
}

export interface ChartQueryParams {
  groupBy?: 'severity' | 'os' | 'status';
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
}

// ============================================
// Vulnerability API Types
// ============================================

export interface VulnerabilityListParams extends PaginationParams {
  severity?: string;
  isZeroDay?: boolean;
  search?: string;
}

export interface VulnerabilityStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  exploitable: number;
  zeroDay: number;
}

export interface CreateExceptionRequest {
  vulnerabilityId: string;
  cve: string;
  exceptionType: ExceptionType;
  reasonForExclusion?: string;
  scope: ExceptionScope;
  source: string;
  endpointIds?: string[];
}

// ============================================
// Patch Repository API Types
// ============================================

export interface CreatePatchSourceInput {
  name: string;
  vendor: string;
  category: PatchSourceCategory;
  platform?: string;
  baseUrl: string;
  urlPatterns?: string[];
  priority?: number;
  isEnabled?: boolean;
  requiresAuth?: boolean;
  authType?: PatchSourceAuthType;
  authConfig?: Record<string, unknown>;
  syncSchedule?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePatchSourceInput {
  name?: string;
  category?: PatchSourceCategory;
  platform?: string;
  baseUrl?: string;
  urlPatterns?: string[];
  priority?: number;
  isEnabled?: boolean;
  requiresAuth?: boolean;
  authType?: PatchSourceAuthType;
  authConfig?: Record<string, unknown>;
  syncSchedule?: string;
  metadata?: Record<string, unknown>;
}

export interface PatchSourceWithStats {
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
  syncSchedule: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  downloadCount?: number;
  lastDownloadAt?: string | null;
  totalSize?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadJobProgress {
  jobId: string;
  status: DownloadJobStatus;
  progress: number;
  downloadedBytes: string | null;
  totalBytes: string | null;
  error?: string;
}

export interface PatchDownloadUrlResponse {
  patchId: string;
  fileName: string;
  presignedUrl: string;
  expiresAt: string;
  size: string | null;
  checksum: string | null;
}

export interface RepositoryStats {
  totalPatches: number;
  totalSize: string;
  patchesByPlatform: Record<string, number>;
  patchesByVendor: Record<string, number>;
  downloadsPending: number;
  downloadsInProgress: number;
  downloadsFailed: number;
  lastSyncAt: string | null;
}

export interface SyncOptions {
  sourceIds?: string[];
  vendors?: string[];
  platforms?: string[];
  force?: boolean;
  dryRun?: boolean;
}

export interface SyncResult {
  sourceId: string;
  vendor: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  patchesFound: number;
  patchesDownloaded: number;
  patchesFailed: number;
  errors: string[];
  duration: number;
}

export interface AgentPatchDownloadRequest {
  agentId: string;
  patchIds: string[];
}

export interface AgentPatchDownloadResponse {
  patchId: string;
  fileName: string;
  downloadUrl: string;
  checksum: string;
  checksumType: string;
  size: string;
  expiresAt: string;
}
