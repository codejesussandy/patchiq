export type OperationalStatus = 'Connected' | 'Disconnected';
export type AssetStatus = 'In Use' | 'Available' | 'Under Maintenance' | 'Retired';
export type AssetType = 'Computer' | 'Server' | 'Mobile' | 'Printer' | 'Laptop' | 'Tablet' | 'Desktop' | 'Virtual Machine';
export type OSType = 'Windows 11 Pro' | 'Windows 10' | 'MacOS' | 'Linux' | 'Android' | 'iOS';
export type AgentStatus = 'Connected' | 'Disconnected' | 'Pending' | 'Error';
export type AssetPatchStatus = 'Installed' | 'Missing' | 'Pending' | 'Failed';

// Agent link for assets
export type AgentLink = {
  id: string;
  status: string;
  version?: string;
  lastHeartbeat?: string;
  lastHeartbeatRelative?: string;
  heartbeatInterval?: number;
};

// Patch summary for assets
export type PatchSummary = {
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

// Asset group membership
export type AssetGroup = {
  id: string;
  name: string;
};

// Related patch for an asset
export type AssetRelatedPatch = {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'High' | 'Medium' | 'Low' | 'UNSPECIFIED';
  status: AssetPatchStatus;
  kbNumber?: string;
  releaseDate?: string;
};

// Deployment history for an asset
export type AssetDeployment = {
  id: string;
  patchId: string;
  patchName: string;
  date: string;
  status: 'Success' | 'Failed' | 'Pending';
};

// Category Types
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
  customMetadata?: Record<string, any>;
};

// Tag Types
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
  metadata?: Record<string, any>;
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
  assetType: AssetType;
  assetTag: string;
  serialNumber: string;
  branchLocation: string;
  manufacturer: string;
  model: string;
  purchaseDate: string;
  warrantyExpiry: string;
  owner: Owner;
  osType: OSType;
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
  subCategoryId?: string;
  tagIds?: string[];
  alias?: string;
  ipVersion?: string;
  memorySize?: string;
  systemSKU?: string;
  diskSize?: string;
  mac?: string;

  // Agent link (NEW)
  agent?: AgentLink;

  // Patch compliance (NEW)
  patchSummary?: PatchSummary;

  // Groups for deployment targeting (NEW)
  groups?: AssetGroup[];

  // Related patches for this asset (NEW)
  relatedPatches?: AssetRelatedPatch[];

  // Recent deployment history (NEW)
  recentDeployments?: AssetDeployment[];

  // Additional fields (NEW)
  department?: string;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
};

// Asset Life Cycle
export type DepreciationPoint = {
  date: string;
  value: number;
  label: string;
  year?: number;                         // Year number (1, 2, 3...)
};

export type AssetLifeCycle = {
  purchaseDate: string;
  purchaseValue: number;
  currentDate: string;
  currentValue: number;
  amcExpiryDate: string;
  warrantyExpiryDate: string;
  endOfLife: string;
  endOfLifeValue: number;
  depreciationTimeline: DepreciationPoint[];
  // Extended depreciation fields
  depreciationMethod?: string;           // "Straight Line", "Double Declining Balance", etc.
  totalDepreciation?: number;            // Total depreciation to date
  annualDepreciation?: number;           // Current year's depreciation expense
  yearsElapsed?: number;                 // Years since purchase
  yearsRemaining?: number;               // Years until end of life
  usefulLifeYears?: number;              // Total useful life in years
  currency?: string;                     // Currency code (INR, USD, etc.)
};

// Hardware
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
// Based on contracts/schemas/hardware.schema.json

// SMART Status Types
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

// Partition Types
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

// Expanded Storage Drive Types
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

// Expanded Memory Module Types
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

// Expanded Memory Summary
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

// Expanded Processor Types
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

// Graphics Card Types
export type GraphicsCard = {
  name: string;
  manufacturer?: string;
  driverVersion?: string;
  driverDate?: string;
  videoMemoryMB?: number;
  currentResolution?: string;
  refreshRate?: number;
};

// Expanded BIOS Types
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

// System Identity Types
export type SystemIdentity = {
  manufacturer: string;
  model: string;
  serialNumber: string;
  uuid: string;
  sku?: string;
  assetTag?: string;
};

// Expanded Battery Types
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

// Complete Expanded Hardware Inventory Type
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

// Software
export type Application = {
  id: string;
  name: string;
  vendor?: string;
  version?: string;
  patchStatus?: 'Available' | 'Not Available';
  lastPatched?: string;
  appInstalledOn?: string;
  installSource?: string;
  icon?: string;
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

// Audit Log
export type AuditLog = {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
};

// Software Inventory
export type SoftwareInventory = {
  id: string;
  softwareName: string;
  version: string;
  softwareType: string;
  manufacturer: string;
  totalInstances: number;
};

// Software License
export type SoftwareLicense = {
  id: string;
  licenseName: string;
  softwareName: string;
  status: 'Allocated' | 'Available' | 'Expired';
  licenseCount: number;
  vendorName: string;
  licenseKey?: string;
  purchaseDate?: string;
  expiryDate?: string;
  publisher?: string;
  cost?: string;
  notes?: string;
};

// OS License
export type OSLicense = {
  id: string;
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
};

// Add Asset Form Data
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
