// Asset Types
export type AssetStatus = 'In Use' | 'Available' | 'Under Maintenance' | 'Retired';
export type OperationalStatus = 'Connected' | 'Disconnected';
export type OsType = 'Windows' | 'MacOS' | 'Linux';

export interface AgentStatus {
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
  agent?: AgentStatus | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  hostname?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  osType?: string | null;
  osVersion?: string | null;
  // Computed hardware fields
  memorySize?: string | null;
  diskSize?: string | null;
  systemSKU?: string | null;
  tags?: TagResponse[];
  createdAt: string;
  updatedAt: string;
  // Cost and Procurement
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
  // Basic info
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

  // Owner info
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerDepartment?: string | null;

  // Procurement info
  vendor?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  purchaseOrderNumber?: string | null;
  amcVendor?: string | null;
  amcCost?: string | null;
  amcExpiryDate?: string | null;
  endOfLife?: string | null;
  endOfSupport?: string | null;

  // Cost info
  purchaseCost?: number | null;
  invoiceNumber?: string | null;
  currency?: string | null;
}

export interface AssetFilters {
  status?: AssetStatus;
  operationalStatus?: OperationalStatus;
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
}

// Category Types
export interface CategoryResponse {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  isDefault: boolean;
  createdAt: string;
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

// SubCategory Types
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
  criticality?: 'Critical' | 'High' | 'Medium' | 'Low';
  description?: string;
}

export interface SubCategoryUpdateInput {
  categoryId?: string;
  name?: string;
  criticality?: 'Critical' | 'High' | 'Medium' | 'Low';
  description?: string;
}

// Tag Types
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

export interface TagWithCountResponse extends TagResponse {
  assetCount: number;
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

// Asset Detail Types
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
  // Extended depreciation fields
  depreciationMethod?: string | null;    // "Straight Line", "Double Declining Balance", etc.
  totalDepreciation?: number | null;     // Total depreciation to date
  annualDepreciation?: number | null;    // Current year's depreciation expense
  yearsElapsed?: number | null;          // Years since purchase
  yearsRemaining?: number | null;        // Years until end of life
  usefulLifeYears?: number | null;       // Total useful life in years
  currency?: string;                     // Currency code (INR, USD, etc.)
  hasFinancialData?: boolean;            // True if asset has real financial data
}

export interface DepreciationPoint {
  date: string;
  value: number;
  label: string;
  year?: number;                         // Year number (1, 2, 3...)
}

export interface AssetHardware {
  bios?: BiosInfo;
  processor?: ProcessorInfo;
  baseBoard?: BaseBoardInfo;
  storage: StorageInfo[];
  memory: MemoryInfo[];
  networkAdapters: NetworkAdapterInfo[];
  battery?: BatteryInfo;
  graphicsCards?: GraphicsCardInfo[];
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
  chargingStatus?: 'Charging' | 'Discharging' | 'Not charging' | 'Unknown' | string;
  batteryCapacity?: string;
  estimatedRuntime?: string;
  temperature?: string;
}

export interface AssetSoftware {
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

export interface SoftwareLicenseInfo {
  type?: string; // Perpetual, Subscription, Trial, Freeware, OpenSource, OEM, Volume, Unknown
  status?: string; // Licensed, Expired, Trial, GracePeriod, Unlicensed, Unknown
  key?: string; // Masked license key (last 5 chars visible)
  expirationDate?: string; // ISO8601 for subscription/trial
  daysRemaining?: number; // Days until expiration
  licensedTo?: string; // User/organization name
  productId?: string; // Vendor product ID
  channel?: string; // Retail, Volume, OEM, NFR
}

export interface ApplicationInfo {
  id: string;
  name: string;
  vendor?: string;
  version?: string;
  patchStatus?: 'Available' | 'Not Available';
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

export interface AssetSecurity {
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

export interface AssetNetwork {
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

export interface AssetPeripherals {
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

export interface MonitorInfo {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  connectionType?: string;
  resolution?: string;
  refreshRate?: number;
  screenSizeInches?: number;
  isPrimary?: boolean;
  isBuiltIn?: boolean;
}

export interface UsbDeviceInfo {
  id: string;
  name: string;
  manufacturer?: string;
  deviceType?: string;
  deviceClass?: string;
  usbVersion?: string;
  speed?: string;
  isRemovable?: boolean;
}

export interface PrinterInfo {
  id: string;
  name: string;
  driverName?: string;
  connectionType?: string;
  ipAddress?: string;
  status?: string;
  isDefault?: boolean;
  isNetwork?: boolean;
}

export interface AudioDeviceInfo {
  id: string;
  name: string;
  type?: 'Input' | 'Output' | 'Both';
  deviceType?: string;
  isDefault?: boolean;
  isEnabled?: boolean;
  connectionType?: string;
}

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  address?: string;
  type?: string;
  connected?: boolean;
  paired?: boolean;
  batteryLevel?: number;
}

export interface AssetTelemetry {
  timestamp: string;
  cpu?: {
    usagePercent: number;
    userPercent?: number;
    systemPercent?: number;
    idlePercent?: number;
    loadAverage?: number[];
    temperature?: number;
    processCount?: number;
    threadCount?: number;
  };
  // Note: usedBytes = totalBytes - freeBytes (matches Proxmox/system monitors, includes buffers/cache)
  // applicationUsedBytes = totalBytes - availableBytes (memory not readily available for new apps)
  memory?: {
    usagePercent: number;
    totalBytes?: number;
    usedBytes?: number;              // Total - Free (what Proxmox shows)
    availableBytes?: number;         // Memory available for apps (MemAvailable)
    freeBytes?: number;              // Completely unused memory (MemFree)
    buffersBytes?: number;           // Kernel buffers
    cachedBytes?: number;            // Page cache
    applicationUsedBytes?: number;   // Total - Available (app memory usage)
    usedHuman?: string;
    availableHuman?: string;
  };
  disk?: {
    drives?: DriveTelemetry[];
  };
  network?: {
    bytesSentPerSec?: number;
    bytesReceivedPerSec?: number;
    totalBytesSentPerSec?: number;
    totalBytesReceivedPerSec?: number;
    internetConnected?: boolean;
  };
  processes?: {
    totalCount?: number;
    runningCount?: number;
    topByCpu?: Array<{ pid: number; name: string; cpuPercent: number }>;
    topByMemory?: Array<{ pid: number; name: string; memoryPercent: number }>;
  };
  systemUptime?: {
    uptimeSeconds: number;
    uptimeHuman: string;
    bootTime?: string;
  };
  thermal?: Record<string, unknown>;
  power?: Record<string, unknown>;
  agentUtilization?: Record<string, unknown>;
  pendingReboot?: boolean;
  batteryChargePercent?: number;
  batteryCharging?: boolean;
}

export interface DriveTelemetry {
  mountPoint: string;
  usagePercent: number;
  usedBytes?: number;
  freeBytes?: number;
}

export interface TelemetryHistory {
  cpu: TelemetryDataPoint[];
  memory: TelemetryDataPoint[];
  disk: TelemetryDataPoint[];
  networkIn: TelemetryDataPoint[];
  networkOut: TelemetryDataPoint[];
}

export interface TelemetryDataPoint {
  timestamp: string;
  value: number;
}

export interface SystemErrors {
  applicationCrashCount24h?: number;
  applicationCrashCount7d?: number;
  lastCrash?: {
    timestamp: string;
    application: string;
    errorCode?: string;
    description?: string;
  };
  bsodCount30d?: number;
  systemEventLogErrors24h?: number;
  criticalEventCount24h?: number;
}

export interface AssetAuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details?: string;
}

// Asset Alert Types
export interface AssetAlertResponse {
  id: string;
  alert: string;
  severity: string;
  module: string;
  attribute: string;
  value: string;
  message: string;
  status: string;
  createdOn: string;
  resolvedAt?: string | null;
}

// Software Inventory Types
export interface SoftwareInventoryResponse {
  id: string;
  softwareName: string;
  version?: string | null;
  softwareType?: string | null;
  manufacturer?: string | null;
  totalInstances: number;
  createdAt: string;
}

// Software License Types
export interface SoftwareLicenseResponse {
  id: string;
  licenseName: string;
  softwareName: string;
  publisher?: string | null;
  licenseKey?: string | null;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  licenseCount: number;
  vendorName: string;
  cost?: number | null;
  status: string;
  notes?: string | null;
  createdAt: string;
}

export interface SoftwareLicenseCreateInput {
  licenseName: string;
  softwareName: string;
  publisher?: string;
  licenseKey?: string;
  purchaseDate?: string;
  expiryDate?: string;
  licenseCount: number;
  vendorName: string;
  cost?: number;
  status: 'Allocated' | 'Available' | 'Expired';
  notes?: string;
}

export interface SoftwareLicenseUpdateInput {
  licenseName?: string;
  softwareName?: string;
  publisher?: string;
  licenseKey?: string;
  purchaseDate?: string;
  expiryDate?: string;
  licenseCount?: number;
  vendorName?: string;
  cost?: number;
  status?: 'Allocated' | 'Available' | 'Expired';
  notes?: string;
}

// OS License Types
export interface OSLicenseResponse {
  id: string;
  licenseName: string;
  osType: string;
  status: string;
  licenseCount: number;
  vendorName: string;
  licenseKey?: string | null;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  publisher?: string | null;
  cost?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface OSLicenseCreateInput {
  licenseName: string;
  osType: string;
  status: 'Allocated' | 'Available' | 'Expired';
  licenseCount: number;
  vendorName: string;
  licenseKey?: string;
  purchaseDate?: string;
  expiryDate?: string;
  publisher?: string;
  cost?: string;
  notes?: string;
}

export interface OSLicenseUpdateInput {
  licenseName?: string;
  osType?: string;
  status?: 'Allocated' | 'Available' | 'Expired';
  licenseCount?: number;
  vendorName?: string;
  licenseKey?: string;
  purchaseDate?: string;
  expiryDate?: string;
  publisher?: string;
  cost?: string;
  notes?: string;
}
