import type { OperationalStatus, AssetStatus, AgentStatus, LicenseStatus } from '@shared/types';

// Re-export shared enums
export type { OperationalStatus, AssetStatus, AgentStatus, LicenseStatus };

// Re-export shared API types that match
export type {
  AssetPatchStatus,
  DepreciationPoint,
  AssetLifeCycle,
  BiosInfo,
  ProcessorInfo,
  BaseBoardInfo,
  StorageInfo,
  MemoryInfo,
  NetworkAdapterInfo,
  BatteryInfo,
  GraphicsCardInfo,
  AssetHardwareResponse,
  SoftwareLicenseInfo as ApplicationLicense,
  ApplicationInfo,
  ServiceInfo,
  StartupProgramInfo,
  AssetSoftwareResponse,
  AssetAuditLog as AuditLog,
  SoftwareInventoryResponse as SoftwareInventory,
  SoftwareLicenseResponse,
  SoftwareLicenseCreateInput,
  SoftwareLicenseUpdateInput,
  OSLicenseResponse,
  OSLicenseCreateInput,
  OSLicenseUpdateInput,
  CategoryResponse,
  CategoryCreateInput,
  CategoryUpdateInput,
  SubCategoryResponse,
  SubCategoryCreateInput,
  SubCategoryUpdateInput,
  TagResponse,
  TagCreateInput,
  TagUpdateInput,
  PatchSummary,
  AssetRelatedPatch,
  AssetDeploymentResponse,
  AgentStatusInfo as AgentLink,
} from '@shared/types';

// UI-specific display labels for asset types (not the same as shared AssetType enum)
export type AssetTypeDisplay = 'Computer' | 'Server' | 'Mobile' | 'Printer' | 'Laptop' | 'Tablet' | 'Desktop' | 'Virtual Machine';
// UI-specific OS display strings (not the same as shared OSFamily enum)
export type OSTypeDisplay = 'Windows 11 Pro' | 'Windows 10' | 'MacOS' | 'Linux' | 'Android' | 'iOS';

// Asset group membership
export type AssetGroup = {
  id: string;
  name: string;
};

// Deployment history for an asset (UI version - differs from shared AssetDeploymentResponse)
export type AssetDeployment = {
  id: string;
  patchId: string;
  patchName: string;
  date: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
};

// UI-specific Category type (has extra fields not in shared)
export type Category = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  assetCount: number;
  owner?: string;
  manager?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  budget?: string;
  tags?: string[];
  status?: 'Active' | 'Inactive';
  maintenanceSchedule?: string;
  slaTarget?: string;
  complianceRequired?: boolean;
  complianceTags?: string[];
  subCategories?: SubCategory[];
};

export type SubCategory = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  assetCount: number;
  criticality?: 'Critical' | 'High' | 'Medium' | 'Low';
  businessUnit?: string;
  department?: string;
  owner?: string;
  manager?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  status?: 'Active' | 'Inactive';
  uptime?: string;
  maintenanceWindow?: string;
  tags?: string[];
  customMetadata?: Record<string, unknown>;
};

// UI-specific Tag type (has extra fields not in shared)
export type Tag = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  owner?: string;
  manager?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  status?: 'Active' | 'Inactive';
  assetCount: number;
  usageCount?: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt?: string;
  budget?: string;
  complianceRequired?: boolean;
  complianceTags?: string[];
  metadata?: Record<string, unknown>;
};

export type AssetTag = {
  assetId: string;
  tagId: string;
  assignedAt: string;
  assignedBy?: string;
};

export type Owner = {
  name: string;
  email: string;
  phone: string;
};

export type Location = {
  address: string;
  latitude: number;
  longitude: number;
};

export type Performance = {
  systemUptime: string;
  memoryUtilization: number;
  cpuUtilization: number;
  diskUtilization: number;
};

export type Processor = {
  name: string;
  cores: number;
  speed: string;
};

export type RAM = {
  size: string;
  type: string;
};

export type Storage = {
  type: string;
  size: string;
};

export type Procurement = {
  vendor?: string | null;
  purchaseOrderNumber?: string | null;
  amcCost?: string | null;
  amcExpiryDate?: string | null;
  amcVendor?: string | null;
  endOfLife?: string | null;
  endOfSupport?: string | null;
  expiryDate?: string | null;
  warrantyExpiryDate?: string | null;
  warrantyYearAndMonth?: string | null;
};

export type Cost = {
  age?: string | null;
  cost?: string | null;
  currency?: string | null;
  currentCost?: string | null;
  depreciationType?: string | null;
  invoiceNumber?: string | null;
  purchaseDate?: string | null;
  salvageValue?: string | null;
};

export type Asset = {
  id: string;
  name: string;
  assetId: string;
  operationalStatus: OperationalStatus;
  status: AssetStatus;
  operationalStatusSince: string;
  operationalStatusDuration: string;
  assetType: AssetTypeDisplay;
  assetTag: string;
  serialNumber: string;
  branchLocation: string;
  manufacturer: string;
  model: string;
  purchaseDate: string;
  warrantyExpiry: string;
  owner: Owner;
  osType: OSTypeDisplay;
  osVersion: string;
  osBuild: string;
  architecture: string;
  ipAddress: string;
  macAddress: string;
  hostname: string;
  processor: Processor;
  ram: RAM;
  storage: Storage;
  performance: Performance;
  location: {
    base: Location;
    installed: Location;
  };
  procurement: Procurement;
  cost: Cost;
  categoryId?: string;
  categoryName?: string;
  subCategoryId?: string;
  subCategoryName?: string;
  tagIds?: string[];
  alias?: string;
  ipVersion?: string;
  memorySize?: string;
  systemSKU?: string;
  diskSize?: string;
  mac?: string;

  // Agent link
  agent?: {
    id: string;
    status: string;
    version?: string;
    lastHeartbeat?: string;
    lastHeartbeatRelative?: string;
    heartbeatInterval?: number;
  };

  // Patch compliance
  patchSummary?: {
    total: number;
    installed: number;
    missing: number;
    failed: number;
    pending: number;
    criticalMissing?: number;
    securityMissing?: number;
    lastScanDate: string;
    lastScanRelative?: string;
    compliancePercent?: number;
  };

  // Groups for deployment targeting
  groups?: AssetGroup[];

  // Related patches for this asset
  relatedPatches?: {
    id: string;
    name: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSPECIFIED';
    status: 'INSTALLED' | 'MISSING' | 'PENDING' | 'FAILED';
    kbNumber?: string;
    publishedAt?: string;
  }[];

  // Recent deployment history
  recentDeployments?: AssetDeployment[];

  // Additional fields
  department?: string;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
};

// Hardware types (UI-specific expanded types)
export type BIOS = {
  name: string;
  installDate: string;
  biosVersion: string;
  manufacturer: string;
  description: string;
  secureBootState: string;
  serialNumber: string;
};

export type ProcessorDetails = {
  name: string;
  logicalProcessors: number;
  manufacturer: string;
  numberOfCores: number;
  processorSpeed: string;
  secureBootState: string;
};

export type BaseBoard = {
  name: string;
  partNumber: string;
  productId: string;
  serialNumber: string;
  tag: string;
  version: string;
};

export type Drive = {
  name: string;
  drive: string;
  capacity: string;
  used: string;
  format: string;
  type: string;
  serialNumber: string;
  mountPoint?: string;
};

export type MemorySlot = {
  slot: string;
  name: string;
  capacity: string;
  bankLabel: string;
  locator: string;
  memoryType: string;
  serialNumber: string;
  partNumber: string;
};

export type NetworkAdapter = {
  id: string;
  name: string;
  ipAddressV4?: string;
  ipAddressV6?: string;
  macAddress: string;
  dhcpServer?: string;
};

export type Battery = {
  id: string;
  name: string;
  health: string;
  cycleCount: number;
  chargeLevel: number;
  chargingStatus: 'Charging' | 'Discharging' | 'Not charging' | 'Unknown';
  batteryCapacity?: string;
  estimatedRuntime?: string;
  temperature?: string;
};

export type Hardware = {
  bios: BIOS;
  processor: ProcessorDetails;
  baseBoard: BaseBoard;
  storage: Drive[];
  memory: MemorySlot[];
  networkAdapters: NetworkAdapter[];
  battery?: Battery;
};

// Enhanced Hardware Types (Phase 4)
export type SmartStatusLevel = 'OK' | 'Warning' | 'Critical' | 'Unknown';

export type SmartStatus = {
  healthy: boolean;
  status: SmartStatusLevel;
  temperature?: number;
  powerOnHours?: number;
  reallocatedSectors?: number;
  pendingSectors?: number;
  uncorrectableSectors?: number;
  wearLevelingCount?: number;
  mediaWearoutIndicator?: number;
};

export type FileSystemType =
  | 'NTFS'
  | 'FAT32'
  | 'exFAT'
  | 'ext4'
  | 'APFS'
  | 'HFS+'
  | 'XFS'
  | 'BTRFS'
  | 'Unknown';

export type EncryptionPartitionStatus =
  | 'Encrypted'
  | 'Decrypted'
  | 'EncryptionInProgress'
  | 'DecryptionInProgress'
  | 'NotEncryptable'
  | 'Unknown';

export type Partition = {
  mountPoint: string;
  label?: string;
  fileSystem?: FileSystemType;
  capacityGB?: number;
  freeSpaceGB?: number;
  usagePercent?: number;
  bitLockerStatus?: EncryptionPartitionStatus;
  fileVaultStatus?: EncryptionPartitionStatus;
  luksStatus?: 'Encrypted' | 'Decrypted' | 'Unknown';
};

export type StorageDriveType = 'HDD' | 'SSD' | 'NVMe' | 'USB' | 'Network' | 'Unknown';
export type StorageMediaType = 'Fixed' | 'Removable' | 'External';
export type StorageInterfaceType = 'SATA' | 'NVMe' | 'USB' | 'SCSI' | 'IDE' | 'Unknown';

export type ExpandedStorageDrive = {
  name: string;
  type: StorageDriveType;
  mediaType?: StorageMediaType;
  interfaceType?: StorageInterfaceType;
  serialNumber?: string;
  firmwareVersion?: string;
  capacityGB: number;
  freeSpaceGB?: number;
  usedSpaceGB?: number;
  usagePercent?: number;
  partitions?: Partition[];
  smartStatus?: SmartStatus;
};

export type MemoryModuleType = 'DDR3' | 'DDR4' | 'DDR5' | 'LPDDR4' | 'LPDDR5' | 'Unknown';
export type MemoryFormFactor = 'DIMM' | 'SODIMM' | 'Onboard' | 'Unknown';

export type ExpandedMemoryModule = {
  slot: string;
  manufacturer?: string;
  partNumber?: string;
  serialNumber?: string;
  capacityGB: number;
  type?: MemoryModuleType;
  speedMHz?: number;
  formFactor?: MemoryFormFactor;
  bankLabel?: string;
  configured?: boolean;
};

export type ExpandedMemory = {
  totalPhysicalGB: number;
  availableGB?: number;
  usedGB?: number;
  usagePercent?: number;
  totalSlots?: number;
  usedSlots?: number;
  modules: ExpandedMemoryModule[];
  maxCapacityGB?: number;
};

export type ProcessorArchitecture = 'x64' | 'x86' | 'arm64' | 'arm';

export type ExpandedProcessor = {
  name: string;
  manufacturer: string;
  architecture: ProcessorArchitecture;
  coreCount: number;
  threadCount: number;
  clockSpeedMHz: number;
  maxClockSpeedMHz?: number;
  socketType?: string;
  cacheL1KB?: number;
  cacheL2KB?: number;
  cacheL3KB?: number;
  virtualizationEnabled?: boolean;
};

export type GraphicsCard = {
  name: string;
  manufacturer?: string;
  driverVersion?: string;
  driverDate?: string;
  videoMemoryMB?: number;
  currentResolution?: string;
  refreshRate?: number;
};

export type FirmwareType = 'BIOS' | 'UEFI';

export type ExpandedBIOS = {
  vendor: string;
  version: string;
  releaseDate?: string;
  firmwareType?: FirmwareType;
  secureBootEnabled?: boolean;
  secureBootCapable?: boolean;
  tpmVersion?: string;
  tpmEnabled?: boolean;
};

export type SystemIdentity = {
  manufacturer: string;
  model: string;
  serialNumber: string;
  uuid: string;
  sku?: string;
  assetTag?: string;
};

export type BatteryChemistry = 'Li-Ion' | 'Li-Poly' | 'NiMH' | 'NiCd' | 'Unknown';
export type BatteryChargingStatus = 'Charging' | 'Discharging' | 'Full' | 'NotCharging' | 'Unknown';

export type ExpandedBattery = {
  name?: string;
  manufacturer?: string;
  chemistry?: BatteryChemistry;
  designCapacityWh?: number;
  fullChargeCapacityWh?: number;
  healthPercent?: number;
  cycleCount?: number;
  chargeLevel?: number;
  chargingStatus?: BatteryChargingStatus;
  estimatedRuntimeMinutes?: number;
  temperature?: number;
  voltage?: number;
  serialNumber?: string;
};

export type ExpandedHardware = {
  collectedAt: string;
  systemIdentity?: SystemIdentity;
  bios?: ExpandedBIOS;
  processor?: ExpandedProcessor;
  memory?: ExpandedMemory;
  storage?: ExpandedStorageDrive[];
  battery?: ExpandedBattery;
  baseBoard?: BaseBoard;
  graphicsCards?: GraphicsCard[];
};

// Software types (UI-specific - use different field names than shared)
export type Application = {
  id: string;
  name: string;
  vendor?: string;
  version?: string;
  patchStatus?: 'Available' | 'Not Available';
  lastPatched?: string;
  appInstalledOn?: string;
  installSource?: string;
  isSystemApp?: boolean;
  isManaged?: boolean;
  icon?: string;
  license?: {
    type?: string;
    status?: string;
    key?: string;
    expirationDate?: string;
    daysRemaining?: number;
    licensedTo?: string;
    productId?: string;
    channel?: string;
  };
};

export type Service = {
  id: string;
  name: string;
  displayName?: string;
  state?: 'Running' | 'Stopped';
  startupType?: string;
  type?: string;
  status?: string;
};

export type StartupProgram = {
  id: string;
  name: string;
  command?: string;
  location?: string;
  enabled: boolean;
  vendor?: string;
};

export type SystemEnvironment = {
  alias?: string;
  buildNumber: string;
  deviceType: string;
  lastBootUpTime: string;
  licenseStatus: string;
  osInstalledBy: string;
  partialProductKey: string;
  productKey: string;
  systemDrive: string;
  version: string;
  virtualMemory: string;
  hostname?: string;
  licenseDescription?: string;
  manufacturer?: string;
  osInstallDate?: string;
  productId?: string;
  systemDiscovery?: string;
  windowsDirectory?: string;
  bootDevice?: string;
  description?: string;
};

export type Software = {
  os: {
    name: string;
    version?: string;
    buildNumber?: string;
    architecture?: string;
    installDate?: string;
    licenseStatus?: string;
  };
  licenseDetails?: {
    alias?: string;
    buildNumber?: string;
    deviceType?: string;
    lastBootUpTime?: string;
    licenseStatus?: string;
    osInstalledBy?: string;
    partialProductKey?: string;
    productKey?: string;
    systemDrive?: string;
    version?: string;
    virtualMemory?: string;
    bootDevice?: string;
    description?: string;
    hostname?: string;
    licenseDescription?: string;
    manufacturer?: string;
    osInstallDate?: string;
    productId?: string;
    systemDiscovery?: string;
    windowsDirectory?: string;
  };
  applications: Application[];
  services: Service[];
  startupPrograms: StartupProgram[];
};

// Software License types (UI-specific shape)
export type SoftwareLicense = {
  id: string;
  licenseName: string;
  softwareName: string;
  status: LicenseStatus;
  licenseCount: number;
  vendorName: string;
  licenseKey?: string;
  purchaseDate?: string;
  expiryDate?: string;
  publisher?: string;
  cost?: string;
  notes?: string;
};

export type OSLicense = {
  id: string;
  licenseName: string;
  osType: string;
  status: LicenseStatus;
  licenseCount: number;
  vendorName: string;
  licenseKey?: string;
  purchaseDate?: string;
  expiryDate?: string;
  publisher?: string;
  cost?: string;
  notes?: string;
};

// Add Asset Form Data (UI-only)
export type AddAssetFormData = {
  // Step 1 - Define Asset
  assetName: string;
  category: string;
  os: string;
  assetTags: string[];
  make: string;
  model: string;
  serialNumber: string;
  uuid: string;
  ownerTechnician: string;
  ownerTags: string[];
  endUserRequesters: string[];
  customerName: string;
  assignDevice: boolean;
  department?: string;
  managedBy?: string;
  usedBy?: string;
  baseLocation: string;
  installedLocation: string;
  installedDate: string;

  // Step 2 - OS Properties
  osType: string;
  osName: string;
  osVersion: string;
  osInstallDate: string;
  osInstallBy: string;
  buildNumber: string;
  productId: string;
  productKey: string;
  virtualNumber: string;

  // Step 3 - Additional Properties
  // Common Properties
  status: string;
  criticality: string;
  serviceStatus: string;
  operationalStatus: string;
  businessFunction: string;
  description: string;
  usageType: string;
  changeStateReason: string;
  retireReason: string;
  hostName: string;
  alias: string;

  // Cost Properties
  invoiceNo: string;
  partNo: string;
  cost: string;
  purchaseDate: string;
  depreciationType: string;
  salvageValue: string;
  salvageValuePercentage: string;

  // Procurement Properties
  warrantyYears: number;
  warrantyMonths: number;
  warrantyExpiryDate: string;
  expiryDate: string;
  purchaseVendor: string;
  amcVendor: string;
  amcCost: string;
  amcExpiryDate: string;
  leaseEndDate: string;
  disposalDate: string;
  reason: string;
  endOfLife: string;
  endOfSale: string;
  endOfSupport: string;
  endOfExtendedSupport: string;
  lastRenewalCost: string;
  nextSupportRenewalCost: string;
};
