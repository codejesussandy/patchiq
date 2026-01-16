import { http, HttpResponse } from 'msw';
import type {
  Asset,
  AssetLifeCycle,
  Hardware,
  Software,
  AuditLog,
  SoftwareInventory,
  SoftwareLicense,
  OSLicense,
  ExpandedHardware,
} from '../../types/asset.types';
import type { SecurityCompliance } from '../../types/security.types';
import type { NetworkConfiguration } from '../../types/network.types';
import type { PeripheralInventory } from '../../types/peripheral.types';
import type { TelemetryPayload, TelemetryHistory, SystemErrors } from '../../types/telemetry.types';

const API_BASE_URL = '/v1';

// Mock Assets Data
const mockAssets: Asset[] = [
  {
    id: '1',
    name: 'ASUS Laptop 01',
    assetId: 'ASSET0029',
    operationalStatus: 'Connected',
    status: 'In Use',
    operationalStatusSince: 'May 05, 2025 3:45pm',
    operationalStatusDuration: '2 day, 24 hrs, 15 min, 30 sec',
    assetType: 'Laptop',
    assetTag: 'LAP-001',
    serialNumber: 'XPS039542192893',
    branchLocation: 'Bangalore Karnataka India 560078',
    manufacturer: 'Asus',
    model: '32923GSHFA',
    purchaseDate: 'Feb 14, 2022',
    warrantyExpiry: 'Feb 17, 2027',
    owner: {
      name: 'Orgnas',
      email: 'flasetsi@orgnas.com',
      phone: '+91-9812356223',
    },
    osType: 'Windows 11 Pro',
    osVersion: '10.0.22621.2506',
    osBuild: 'LENOVO - 1160',
    architecture: '64-bit',
    ipAddress: '192.168.29.24',
    macAddress: '00:09:0F:FE:00:01',
    hostname: 'XPS039542192893',
    processor: {
      name: 'AMD Ryzen 5 7530U with Radeon Graphics',
      cores: 6,
      speed: '2.0GHz',
    },
    ram: {
      size: '16GB',
      type: 'DDR4',
    },
    storage: {
      type: 'SSD',
      size: '512GB',
    },
    performance: {
      systemUptime: '2 day, 24 hrs, 15 min, 30 sec',
      memoryUtilization: 32.01,
      cpuUtilization: 12,
      diskUtilization: 60.91,
    },
    location: {
      base: {
        address: 'Bangalore Karnataka India 560078',
        latitude: 12.9063,
        longitude: 77.5857,
      },
      installed: {
        address: 'Bangalore Karnataka India 560078',
        latitude: 12.9063,
        longitude: 77.5857,
      },
    },
    procurement: {
      amcCost: '₹5,000',
      amcExpiryDate: 'Sep 23, 2027',
      amcVendor: 'ASUS India',
      endOfLife: 'Jan 31, 2030',
      expiryDate: 'Sep 23, 2027',
      warrantyExpiryDate: 'Feb 17, 2027',
      warrantyYearAndMonth: '3 years 0 months',
    },
    cost: {
      age: '3 years 4 months',
      cost: '₹40,000',
      currency: 'INR',
      currentCost: '₹13,189',
      depreciationType: 'Straight Line',
      invoiceNumber: 'INV-2022-001',
      purchaseDate: 'Feb 14, 2022',
      salvageValue: '₹8,000',
    },
    alias: 'ASUS-LAP-01',
    ipVersion: 'IPv4',
    memorySize: '16GB',
    systemSKU: 'SKU-001',
    diskSize: '512GB',
    mac: '00:09:0F:FE:00:01',
    categoryId: 'cat-1',
    subCategoryId: 'subcat-1',
    // Agent link (NEW)
    agent: {
      agentId: 'agent-001',
      agentName: 'Patchify Agent',
      agentVersion: '2.5.1',
      agentStatus: 'Connected',
      lastHeartbeat: '2025-05-05T15:45:00Z',
      lastHeartbeatRelative: '2 minutes ago',
      registeredAt: '2025-01-15T10:30:00Z',
    },
    // Patch summary (NEW)
    patchSummary: {
      total: 15,
      installed: 10,
      missing: 3,
      failed: 1,
      pending: 1,
      criticalMissing: 1,
      securityMissing: 2,
      lastScanDate: 'Dec 13, 2025 10:30 AM',
      lastScanRelative: '1 day ago',
      compliancePercent: 66.7,
    },
    // Groups (NEW)
    groups: [
      { id: 'grp-1', name: 'Windows Workstations' },
      { id: 'grp-2', name: 'Engineering Department' },
    ],
    // Related patches (NEW)
    relatedPatches: [
      {
        id: '1',
        name: '2025-08 Cumulative Update for Windows 10',
        severity: 'CRITICAL',
        status: 'Missing',
        kbNumber: 'KB5063709',
      },
      {
        id: '5',
        name: '2025-08 .NET 8.0.19 Update',
        severity: 'High',
        status: 'Installed',
        kbNumber: 'KB5063810',
      },
      {
        id: '6',
        name: 'Google Chrome (125.0.6422.113)',
        severity: 'CRITICAL',
        status: 'Pending',
        kbNumber: 'CHR-125',
      },
    ],
    // Recent deployments (NEW)
    recentDeployments: [
      {
        id: 'dep-1',
        patchId: '5',
        patchName: '2025-08 .NET 8.0.19 Update',
        date: 'Dec 12, 2025',
        status: 'Success',
      },
      {
        id: 'dep-2',
        patchId: '9',
        patchName: 'Microsoft Office 2021 Update',
        date: 'Dec 11, 2025',
        status: 'Failed',
      },
    ],
    department: 'Engineering',
    lastSeen: '2 mins ago',
  },
  {
    id: '2',
    name: 'Dell Laptop 02',
    assetId: 'ASSET0030',
    operationalStatus: 'Connected',
    status: 'In Use',
    operationalStatusSince: 'May 05, 2025 3:45pm',
    operationalStatusDuration: '1 day, 12 hrs, 30 min, 15 sec',
    assetType: 'Laptop',
    assetTag: 'LAP-002',
    serialNumber: 'DELL123456789',
    branchLocation: 'Mumbai Maharashtra India 400001',
    manufacturer: 'Dell',
    model: 'XPS 15',
    purchaseDate: 'Mar 10, 2023',
    warrantyExpiry: 'Mar 10, 2026',
    owner: {
      name: 'John Doe',
      email: 'john.doe@company.com',
      phone: '+91-9876543210',
    },
    osType: 'Windows 11 Pro',
    osVersion: '10.0.22621.2506',
    osBuild: 'DELL - 2100',
    architecture: '64-bit',
    ipAddress: '192.168.29.25',
    macAddress: '00:09:0F:FE:00:02',
    hostname: 'DELL-XPS-15',
    processor: {
      name: 'Intel Core i7-12700H',
      cores: 8,
      speed: '2.3GHz',
    },
    ram: {
      size: '32GB',
      type: 'DDR5',
    },
    storage: {
      type: 'NVMe SSD',
      size: '1TB',
    },
    performance: {
      systemUptime: '1 day, 12 hrs, 30 min, 15 sec',
      memoryUtilization: 45.5,
      cpuUtilization: 25,
      diskUtilization: 72.3,
    },
    location: {
      base: {
        address: 'Mumbai Maharashtra India 400001',
        latitude: 19.076,
        longitude: 72.8777,
      },
      installed: {
        address: 'Mumbai Maharashtra India 400001',
        latitude: 19.076,
        longitude: 72.8777,
      },
    },
    procurement: {
      amcCost: '₹7,000',
      amcExpiryDate: 'Mar 10, 2026',
      amcVendor: 'Dell India',
      endOfLife: 'Mar 10, 2029',
      expiryDate: 'Mar 10, 2026',
      warrantyExpiryDate: 'Mar 10, 2026',
      warrantyYearAndMonth: '3 years 0 months',
    },
    cost: {
      age: '2 years 2 months',
      cost: '₹85,000',
      currency: 'INR',
      currentCost: '₹56,667',
      depreciationType: 'Straight Line',
      invoiceNumber: 'INV-2023-045',
      purchaseDate: 'Mar 10, 2023',
      salvageValue: '₹17,000',
    },
    alias: 'DELL-XPS-02',
    ipVersion: 'IPv4',
    memorySize: '32GB',
    systemSKU: 'SKU-002',
    diskSize: '1TB',
    mac: '00:09:0F:FE:00:02',
    categoryId: 'cat-1',
    subCategoryId: 'subcat-2',
    // Agent link (NEW)
    agent: {
      agentId: 'agent-002',
      agentName: 'Patchify Agent',
      agentVersion: '2.5.1',
      agentStatus: 'Connected',
      lastHeartbeat: '2025-05-05T15:40:00Z',
      lastHeartbeatRelative: '5 minutes ago',
      registeredAt: '2025-03-10T09:00:00Z',
    },
    // Patch summary (NEW)
    patchSummary: {
      total: 12,
      installed: 11,
      missing: 1,
      failed: 0,
      pending: 0,
      criticalMissing: 0,
      securityMissing: 1,
      lastScanDate: 'Dec 14, 2025 8:15 AM',
      lastScanRelative: '2 hours ago',
      compliancePercent: 91.7,
    },
    // Groups (NEW)
    groups: [
      { id: 'grp-1', name: 'Windows Workstations' },
      { id: 'grp-3', name: 'Sales Department' },
    ],
    // Related patches (NEW)
    relatedPatches: [
      {
        id: '1',
        name: '2025-08 Cumulative Update for Windows 10',
        severity: 'CRITICAL',
        status: 'Missing',
        kbNumber: 'KB5063709',
      },
      {
        id: '6',
        name: 'Google Chrome (125.0.6422.113)',
        severity: 'CRITICAL',
        status: 'Installed',
        kbNumber: 'CHR-125',
      },
    ],
    // Recent deployments (NEW)
    recentDeployments: [
      {
        id: 'dep-4',
        patchId: '6',
        patchName: 'Google Chrome (125.0.6422.113)',
        date: 'Dec 13, 2025',
        status: 'Success',
      },
      {
        id: 'dep-5',
        patchId: '5',
        patchName: '2025-08 .NET 8.0.19 Update',
        date: 'Dec 12, 2025',
        status: 'Success',
      },
    ],
    department: 'Sales',
    lastSeen: '5 mins ago',
  },
];

// Mock Asset Life Cycle Data
const mockAssetLifeCycle: AssetLifeCycle = {
  purchaseDate: 'Feb 14, 2022',
  purchaseValue: 40000,
  currentDate: 'Jun 20, 2025',
  currentValue: 13189,
  amcExpiryDate: 'Sep 23, 2027',
  warrantyExpiryDate: 'Feb 17, 2027',
  endOfLife: 'Jan 31, 2030',
  endOfLifeValue: 8000,
  depreciationTimeline: [
    { date: 'Feb 14, 2022', value: 40000, label: 'Purchased on' },
    { date: 'Jun 20, 2025', value: 13189, label: 'Today' },
    { date: 'Feb 17, 2027', value: 11000, label: 'Warranty Expiry Date' },
    { date: 'Sep 23, 2027', value: 10000, label: 'AMC Expiry Date' },
    { date: 'Jan 31, 2030', value: 8000, label: 'End Of Life' },
  ],
};

// Mock Hardware Data
const mockHardware: Hardware = {
  bios: {
    name: 'Lenovo',
    installDate: '2024-01-23 00:00:00',
    biosVersion: 'LENOVO - 1160',
    manufacturer: 'LENOVO',
    description: 'R2CET34W(1.16 )',
    secureBootState: 'Not Enabled/Supported',
    serialNumber: 'PF4XVPD7',
  },
  processor: {
    name: 'AMD Ryzen 5 7530U with Radeon Graphics',
    logicalProcessors: 12,
    manufacturer: 'AuthenticAMD',
    numberOfCores: 6,
    processorSpeed: '2.0GHz',
    secureBootState: 'B1965C4C-21B3-11B2-AB5C-AB1173A64E1',
  },
  baseBoard: {
    name: 'Lenovo',
    partNumber: 'NILL',
    productId: '21JRD005J1',
    serialNumber: 'L1HF44R00BE',
    tag: 'Base Board',
    version: 'ThinkPad',
  },
  storage: [
    {
      name: '5 Partition - 3,756 GB',
      drive: 'C: Drive',
      capacity: '256 GB',
      used: '50.24 MB',
      format: 'NTFC',
      type: 'SSD',
      serialNumber: '08F4870A',
    },
    {
      name: 'D: Drive',
      drive: 'D: Drive',
      capacity: '500 GB',
      used: '250 GB',
      format: 'NTFC',
      type: 'SSD',
      serialNumber: '08F4870B',
    },
    {
      name: 'J: New Volume',
      drive: 'J: New Volume',
      capacity: '1.0 TB',
      used: '1.0 TB',
      format: 'NTFC',
      type: 'SSD',
      serialNumber: '08F4870C',
    },
    {
      name: 'H: New Volume',
      drive: 'H: New Volume',
      capacity: '1.0 TB',
      used: '1.0 TB',
      format: 'NTFC',
      type: 'SSD',
      serialNumber: '08F4870A',
    },
    {
      name: 'K: New Volume',
      drive: 'K: New Volume',
      capacity: '1.0 TB',
      used: '1.0 TB',
      format: 'NTFC',
      type: 'SSD',
      serialNumber: '08F4870A',
    },
  ],
  memory: [
    {
      slot: 'Slot 1',
      name: 'Samsung - 2667',
      capacity: '8.00 GB',
      bankLabel: 'PO CHANNEL A',
      locator: 'DIMM 0',
      memoryType: 'Unknown',
      serialNumber: '00000000',
      partNumber: 'M463A1G43DB0-CWE',
    },
    {
      slot: 'Slot 1',
      name: 'Samsung - 2667',
      capacity: '8.00 GB',
      bankLabel: 'PO CHANNEL A',
      locator: 'DIMM 0',
      memoryType: 'Unknown',
      serialNumber: '00000000',
      partNumber: 'M463A1G43DB0-DHA',
    },
  ],
  networkAdapters: [
    {
      id: '1',
      name: '[00000004] Realtek PCIe GbE Family Controller',
      ipAddressV4: '',
      ipAddressV6: '',
      macAddress: '00:09:0F:FE:00:01',
      dhcpServer: '',
    },
    {
      id: '2',
      name: '[00000001] Fortinet Virtual Ethernet Adapter (NDIS 6.30)',
      ipAddressV4: '',
      ipAddressV6: '',
      macAddress: '00:09:0F:FE:00:01',
      dhcpServer: '',
    },
    {
      id: '3',
      name: '[00000004] Realtek PCIe GbE Family Controller',
      ipAddressV4: '',
      ipAddressV6: '',
      macAddress: '00:09:0F:FE:00:01',
      dhcpServer: '',
    },
  ],
  battery: {
    id: 'BAT-001',
    name: 'ASUS Internal Battery',
    health: '95%',
    cycleCount: 127,
    chargeLevel: 78,
    chargingStatus: 'Charging',
    batteryCapacity: '52.5Wh',
    estimatedRuntime: '5 hours 23 minutes',
    temperature: '32°C',
  },
};

// Mock Software Data
const mockSoftware: Software = {
  os: {
    name: 'Microsoft Windows 11 Pro',
    version: '10.0.22621.2506',
  },
  licenseDetails: {
    alias: 'ASUS-LAP-01',
    buildNumber: '22621',
    deviceType: 'Laptop',
    lastBootUpTime: '2025-05-05 03:45:00',
    licenseStatus: 'Licensed',
    osInstalledBy: 'Admin',
    partialProductKey: 'XXXXX',
    productKey: 'XXXXX-XXXXX-XXXXX-XXXXX',
    systemDrive: 'C:',
    version: '10.0.22621.2506',
    virtualMemory: '32 Gbyte',
    bootDevice: 'C:',
    description: 'Windows 11 Pro',
    hostname: 'XPS039542192893',
    licenseDescription: 'OEM License',
    manufacturer: 'Microsoft',
    osInstallDate: '2024-01-15',
    productId: '00326-10000-00000-AA123',
    systemDiscovery: 'Automated',
    windowsDirectory: 'C:\\Windows',
  },
  applications: Array.from({ length: 55 }, (_, i) => ({
    id: `app-${i + 1}`,
    name: 'Adobe Acrobat 64-Bit',
    vendor: 'Adobe',
    version: 'V203.00.204',
    patchStatus: i % 3 === 0 ? 'Not Available' : 'Available',
    lastPatched: 'June 06 2025',
    appInstalledOn: 'June 06 2025',
    icon: '🔴',
  })),
  services: Array.from({ length: 302 }, (_, i) => ({
    id: `service-${i + 1}`,
    name: `<Service Name>`,
    state: i % 5 === 0 ? 'Stopped' : 'Running',
    type: '<Service Type>',
    status: 'OK',
  })),
  systemEnvironment: {
    alias: 'ASUS-LAP-01',
    buildNumber: '22621',
    deviceType: 'Laptop',
    lastBootUpTime: '2025-05-05 03:45:00',
    licenseStatus: 'Licensed',
    osInstalledBy: 'Admin',
    partialProductKey: 'XXXXX',
    productKey: 'XXXXX-XXXXX-XXXXX-XXXXX',
    systemDrive: 'C:',
    version: '10.0.22621.2506',
    virtualMemory: '32 Gbyte',
    bootDevice: 'C:',
    description: 'Windows 11 Pro',
    hostname: 'XPS039542192893',
    licenseDescription: 'OEM License',
    manufacturer: 'Microsoft',
    osInstallDate: '2024-01-15',
    productId: '00326-10000-00000-AA123',
    systemDiscovery: 'Automated',
    windowsDirectory: 'C:\\Windows',
  },
};

// Mock Audit Log Data
const mockAuditLog: AuditLog[] = [
  {
    id: '1',
    timestamp: 'May 05, 2025 3:45pm',
    action: 'Asset Created',
    user: 'Admin User',
    details: 'Asset ASSET0029 created in the system',
  },
  {
    id: '2',
    timestamp: 'May 06, 2025 10:30am',
    action: 'Asset Updated',
    user: 'John Doe',
    details: 'Updated asset details - Changed owner information',
  },
  {
    id: '3',
    timestamp: 'May 07, 2025 2:15pm',
    action: 'Status Changed',
    user: 'System',
    details: 'Operational status changed to Connected',
  },
];

// Mock Software Inventory Data
const mockSoftwareInventory: SoftwareInventory[] = Array.from({ length: 85 }, (_, i) => ({
  id: `sw-${i + 1}`,
  softwareName: i === 0 ? 'Adobe Acrobat Reader' : `Software ${i + 1}`,
  version: '1.1.01',
  softwareType: 'Arch_arm_i64',
  manufacturer: i === 0 ? 'Apple' : `Manufacturer ${i + 1}`,
  totalInstances: Math.floor(Math.random() * 50) + 1,
}));

// Mock Software License Data
const mockSoftwareLicenses: SoftwareLicense[] = Array.from({ length: 85 }, (_, i) => ({
  id: `lic-${i + 1}`,
  licenseName: `License ${i + 1}`,
  softwareName: `Software ${i + 1}`,
  status: 'Allocated',
  licenseCount: 1,
  vendorName: `Vendor ${i + 1}`,
}));

// Mock OS License Data
const mockOSLicenses: OSLicense[] = Array.from({ length: 20 }, (_, i) => ({
  id: `os-lic-${i + 1}`,
  licenseName: `OS License ${i + 1}`,
  osType: i % 4 === 0 ? 'Windows 11 Pro' : i % 4 === 1 ? 'Windows 10' : i % 4 === 2 ? 'MacOS' : 'Linux',
  status: i % 3 === 0 ? 'Expired' : i % 2 === 0 ? 'Available' : 'Allocated',
  licenseCount: Math.floor(Math.random() * 50) + 1,
  vendorName: i % 2 === 0 ? 'Microsoft' : i % 3 === 0 ? 'Apple' : 'Linux Foundation',
  licenseKey: `KEY-${String(i + 1).padStart(4, '0')}-XXXX-XXXX`,
  purchaseDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
  expiryDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
  cost: `₹${Math.floor(Math.random() * 500000) + 50000}`,
}));

// Phase 4: Mock Security Data
const mockSecurity: SecurityCompliance = {
  collectedAt: '2026-01-14T10:30:00Z',
  encryption: {
    driveEncryptionEnabled: true,
    encryptionType: 'BitLocker',
    drives: [
      {
        mountPoint: 'C:',
        encrypted: true,
        encryptionMethod: 'AES-256',
        encryptionPercentage: 100,
        status: 'FullyEncrypted',
        protectionStatus: 'On',
        recoveryKeyBackedUp: true,
      },
      {
        mountPoint: 'D:',
        encrypted: false,
        status: 'NotEncrypted',
        protectionStatus: 'Off',
      },
    ],
    tpmEnabled: true,
    tpmVersion: '2.0',
  },
  firewall: {
    enabled: true,
    productName: 'Windows Defender Firewall',
    profiles: [
      {
        name: 'Domain',
        enabled: true,
        defaultInboundAction: 'Block',
        defaultOutboundAction: 'Allow',
      },
      {
        name: 'Private',
        enabled: true,
        defaultInboundAction: 'Block',
        defaultOutboundAction: 'Allow',
      },
      {
        name: 'Public',
        enabled: true,
        defaultInboundAction: 'Block',
        defaultOutboundAction: 'Block',
      },
    ],
    activeProfile: 'Private',
    loggingEnabled: true,
  },
  antivirus: {
    installed: true,
    products: [
      {
        name: 'Windows Defender',
        vendor: 'Microsoft',
        version: '4.18.2301.6',
        enabled: true,
        realTimeProtection: true,
        definitionVersion: '1.403.1234.0',
        definitionDate: '2026-01-14T06:00:00Z',
        definitionAge: '4 hours ago',
        lastScanDate: '2026-01-14T02:00:00Z',
        lastScanType: 'Quick',
        lastScanResult: 'Clean',
        threatsDetected: 0,
        quarantinedItems: 2,
      },
    ],
    xdrInstalled: true,
    xdrProductName: 'CrowdStrike Falcon',
  },
  userAccounts: {
    localUsers: [
      {
        username: 'Administrator',
        fullName: 'Built-in Administrator',
        isAdmin: true,
        isBuiltIn: true,
        isEnabled: false,
        isLocked: false,
        passwordRequired: true,
        passwordNeverExpires: true,
      },
      {
        username: 'JohnDoe',
        fullName: 'John Doe',
        isAdmin: true,
        isBuiltIn: false,
        isEnabled: true,
        isLocked: false,
        passwordRequired: true,
        passwordLastSet: '2025-12-01T10:00:00Z',
        passwordAge: '44 days',
        lastLogon: '2026-01-14T08:30:00Z',
        groups: ['Administrators', 'Users', 'Remote Desktop Users'],
      },
      {
        username: 'Guest',
        isAdmin: false,
        isBuiltIn: true,
        isEnabled: false,
        isLocked: false,
        passwordRequired: false,
      },
    ],
    localAdminCount: 2,
    localAdminAccounts: ['Administrator', 'JohnDoe'],
    guestAccountEnabled: false,
    autoLoginEnabled: false,
  },
  patchStatus: {
    lastScanDate: '2026-01-14T02:00:00Z',
    lastScanRelative: '8 hours ago',
    pendingUpdates: 5,
    criticalUpdates: 1,
    securityUpdates: 2,
    otherUpdates: 2,
    pendingReboot: false,
    lastUpdateInstalled: '2026-01-10T14:00:00Z',
    windowsUpdateEnabled: true,
    autoUpdateEnabled: true,
    missingPatches: [
      {
        id: 'KB5063709',
        kbNumber: 'KB5063709',
        title: '2026-01 Cumulative Update for Windows 11',
        severity: 'Critical',
        releaseDate: '2026-01-09',
        rebootRequired: true,
      },
      {
        id: 'KB5063715',
        kbNumber: 'KB5063715',
        title: '2026-01 Security Update for .NET Framework',
        severity: 'Important',
        releaseDate: '2026-01-09',
        rebootRequired: false,
      },
    ],
  },
  secureBootEnabled: true,
  uacEnabled: true,
  screenLockEnabled: true,
  screenLockTimeout: 300,
  remoteDesktopEnabled: true,
  sshEnabled: false,
};

// Phase 4: Mock Network Data
const mockNetwork: NetworkConfiguration = {
  collectedAt: '2026-01-14T10:30:00Z',
  identity: {
    hostname: 'XPS039542192893',
    fqdn: 'XPS039542192893.corp.company.com',
    domainName: 'corp.company.com',
    isDomainJoined: true,
    domainRole: 'MemberWorkstation',
  },
  adapters: [
    {
      id: 'eth0',
      name: 'Ethernet',
      description: 'Realtek PCIe GbE Family Controller',
      type: 'Ethernet',
      macAddress: '00:09:0F:FE:00:01',
      status: 'Up',
      speedMbps: 1000,
      mtu: 1500,
      ipConfiguration: {
        ipv4Address: '192.168.29.24',
        ipv4SubnetMask: '255.255.255.0',
        ipv4Gateway: '192.168.29.1',
        dhcpEnabled: true,
        dhcpServer: '192.168.29.1',
        dhcpLeaseObtained: '2026-01-14T00:00:00Z',
        dhcpLeaseExpires: '2026-01-15T00:00:00Z',
        dnsServers: ['8.8.8.8', '8.8.4.4'],
        dnsSuffix: 'corp.company.com',
      },
      driverVersion: '10.57.108.2024',
      driverDate: '2024-08-15',
      manufacturer: 'Realtek',
      isPhysical: true,
      isEnabled: true,
    },
    {
      id: 'wifi0',
      name: 'Wi-Fi',
      description: 'Intel(R) Wi-Fi 6 AX201 160MHz',
      type: 'WiFi',
      macAddress: '00:09:0F:FE:00:02',
      status: 'Down',
      speedMbps: 0,
      isPhysical: true,
      isEnabled: true,
      manufacturer: 'Intel',
    },
    {
      id: 'vpn0',
      name: 'Fortinet SSL VPN',
      description: 'Fortinet Virtual Ethernet Adapter (NDIS 6.30)',
      type: 'VPN',
      macAddress: '00:09:0F:FE:00:03',
      status: 'Disconnected',
      isPhysical: false,
      isEnabled: true,
    },
  ],
  primaryAdapter: 'eth0',
  wifiConnection: {
    ssid: 'CorpWiFi',
    signalStrength: 85,
    rssi: -55,
    channel: 36,
    frequency: 5.18,
    band: '5GHz',
    securityType: 'WPA2-Enterprise',
    authentication: 'EAP',
    encryption: 'CCMP',
    linkSpeed: '866 Mbps',
    protocol: '802.11ac',
    profileName: 'CorpWiFi-Profile',
  },
  publicIpAddress: '203.45.67.89',
  vpnConnected: false,
  proxyConfigured: false,
};

// Phase 4: Mock Peripheral Data
const mockPeripherals: PeripheralInventory = {
  collectedAt: '2026-01-14T10:30:00Z',
  monitors: [
    {
      id: 'mon-1',
      name: 'Dell U2723QE',
      manufacturer: 'Dell',
      model: 'U2723QE',
      serialNumber: 'ABC123DEF456',
      connectionType: 'USB-C',
      resolution: '3840x2160',
      nativeResolution: '3840x2160',
      refreshRate: 60,
      screenSizeInches: 27,
      bitDepth: 10,
      isPrimary: true,
      isBuiltIn: false,
      scalingPercent: 150,
      orientation: 'Landscape',
      yearOfManufacture: 2023,
    },
    {
      id: 'mon-2',
      name: 'Built-in Display',
      manufacturer: 'ASUS',
      connectionType: 'Internal',
      resolution: '1920x1080',
      nativeResolution: '1920x1080',
      refreshRate: 60,
      screenSizeInches: 15.6,
      isPrimary: false,
      isBuiltIn: true,
      scalingPercent: 100,
      orientation: 'Landscape',
    },
  ],
  monitorCount: 2,
  usbDevices: [
    {
      id: 'usb-1',
      name: 'Logitech MX Master 3',
      manufacturer: 'Logitech',
      productId: '4082',
      vendorId: '046D',
      deviceClass: 'HID',
      deviceType: 'Mouse',
      usbVersion: '2.0',
      speed: 'Full',
      isRemovable: true,
      connectedAt: '2026-01-14T08:00:00Z',
    },
    {
      id: 'usb-2',
      name: 'Logitech MX Keys',
      manufacturer: 'Logitech',
      productId: 'C52B',
      vendorId: '046D',
      deviceClass: 'HID',
      deviceType: 'Keyboard',
      usbVersion: '2.0',
      speed: 'Full',
      isRemovable: true,
    },
    {
      id: 'usb-3',
      name: 'Samsung T7 Portable SSD',
      manufacturer: 'Samsung',
      serialNumber: 'S5XXNX0T123456A',
      deviceClass: 'MassStorage',
      deviceType: 'USB Flash Drive',
      usbVersion: '3.2',
      speed: 'Super',
      isRemovable: true,
      connectedAt: '2026-01-14T09:30:00Z',
    },
  ],
  usbDeviceCount: 3,
  dockingStations: [
    {
      id: 'dock-1',
      name: 'Dell WD19TBS Thunderbolt Dock',
      manufacturer: 'Dell',
      model: 'WD19TBS',
      serialNumber: 'DOCKSERIAL123',
      firmwareVersion: '01.00.25',
      connectionType: 'Thunderbolt',
      powerDeliveryWatts: 130,
      connectedDevices: ['Dell U2723QE', 'Ethernet'],
      availablePorts: {
        usb_a: 3,
        usb_c: 2,
        thunderbolt: 1,
        hdmi: 1,
        displayPort: 2,
        ethernet: 1,
        audio: 1,
        sdCard: 1,
      },
    },
  ],
  printers: [
    {
      id: 'printer-1',
      name: 'HP LaserJet Pro MFP M428fdw',
      driverName: 'HP Universal Print Driver',
      connectionType: 'Network',
      ipAddress: '192.168.29.100',
      status: 'Ready',
      isDefault: true,
      isNetwork: true,
      manufacturer: 'HP',
      model: 'LaserJet Pro MFP M428fdw',
      capabilities: ['Print', 'Scan', 'Copy', 'Duplex'],
    },
  ],
  audioDevices: [
    {
      id: 'audio-1',
      name: 'Speakers (Realtek High Definition Audio)',
      type: 'Output',
      deviceType: 'Speaker',
      isDefault: true,
      isEnabled: true,
      connectionType: 'Internal',
      sampleRate: 48000,
      bitDepth: 24,
      channels: 2,
    },
    {
      id: 'audio-2',
      name: 'Jabra Link 380',
      type: 'Both',
      deviceType: 'Headset',
      isDefault: false,
      isEnabled: true,
      manufacturer: 'Jabra',
      connectionType: 'USB',
    },
  ],
  bluetoothDevices: [
    {
      id: 'bt-1',
      name: 'AirPods Pro',
      address: 'AA:BB:CC:DD:EE:FF',
      type: 'Headphones',
      connected: false,
      paired: true,
      batteryLevel: 85,
      manufacturer: 'Apple',
      lastConnected: '2026-01-13T18:00:00Z',
    },
  ],
  bluetoothEnabled: true,
  webcams: [
    {
      name: 'Integrated Webcam',
      manufacturer: 'ASUS',
      resolution: '1920x1080',
      isBuiltIn: true,
    },
  ],
};

// Phase 4: Mock Telemetry Data
const mockTelemetry: TelemetryPayload = {
  timestamp: '2026-01-14T10:30:00Z',
  agentId: 'agent-001',
  intervalSeconds: 60,
  cpu: {
    usagePercent: 23.5,
    perCoreUsage: [45, 12, 28, 15, 33, 8, 22, 18, 41, 10, 25, 20],
    userPercent: 18.2,
    systemPercent: 5.3,
    idlePercent: 76.5,
    processCount: 245,
    threadCount: 3420,
    temperature: 52,
    frequency: 2800,
    throttled: false,
  },
  memory: {
    usagePercent: 64.2,
    totalBytes: 17179869184,
    usedBytes: 11034509312,
    availableBytes: 6145359872,
    freeBytes: 4294967296,
    cachedBytes: 2147483648,
    swapUsagePercent: 12.5,
    swapTotalBytes: 8589934592,
    swapUsedBytes: 1073741824,
    swapFreeBytes: 7516192768,
    commitPercent: 58.3,
  },
  disk: {
    drives: [
      {
        mountPoint: 'C:',
        usagePercent: 60.9,
        usedBytes: 274877906944,
        freeBytes: 176160768000,
        readBytesPerSec: 15728640,
        writeBytesPerSec: 5242880,
        readOpsPerSec: 150,
        writeOpsPerSec: 45,
        queueLength: 0.5,
        busyPercent: 8.2,
        latencyMs: 1.2,
      },
      {
        mountPoint: 'D:',
        usagePercent: 72.3,
        usedBytes: 386547056640,
        freeBytes: 148190871552,
        readBytesPerSec: 1048576,
        writeBytesPerSec: 524288,
        busyPercent: 2.1,
        latencyMs: 0.8,
      },
    ],
    totalReadBytesPerSec: 16777216,
    totalWriteBytesPerSec: 5767168,
  },
  network: {
    interfaces: [
      {
        name: 'Ethernet',
        bytesSentPerSec: 125000,
        bytesReceivedPerSec: 850000,
        packetsSentPerSec: 120,
        packetsReceivedPerSec: 680,
        errorsIn: 0,
        errorsOut: 0,
        droppedIn: 0,
        droppedOut: 0,
        utilizationPercent: 0.8,
      },
    ],
    totalBytesSentPerSec: 125000,
    totalBytesReceivedPerSec: 850000,
    tcpConnectionsEstablished: 42,
    tcpConnectionsActive: 15,
    latencyMs: 8.5,
    internetConnected: true,
  },
  processes: {
    topByCpu: [
      { pid: 1234, name: 'chrome.exe', cpuPercent: 8.5, memoryPercent: 12.3, user: 'JohnDoe' },
      { pid: 5678, name: 'code.exe', cpuPercent: 5.2, memoryPercent: 8.7, user: 'JohnDoe' },
      { pid: 9012, name: 'Teams.exe', cpuPercent: 3.8, memoryPercent: 6.2, user: 'JohnDoe' },
      { pid: 3456, name: 'explorer.exe', cpuPercent: 1.5, memoryPercent: 2.1, user: 'SYSTEM' },
      { pid: 7890, name: 'svchost.exe', cpuPercent: 1.2, memoryPercent: 1.8, user: 'SYSTEM' },
    ],
    topByMemory: [
      { pid: 1234, name: 'chrome.exe', cpuPercent: 8.5, memoryPercent: 12.3, memoryBytes: 2113929216, user: 'JohnDoe' },
      { pid: 5678, name: 'code.exe', cpuPercent: 5.2, memoryPercent: 8.7, memoryBytes: 1494269952, user: 'JohnDoe' },
      { pid: 9012, name: 'Teams.exe', cpuPercent: 3.8, memoryPercent: 6.2, memoryBytes: 1065353216, user: 'JohnDoe' },
      { pid: 2345, name: 'OneDrive.exe', cpuPercent: 0.5, memoryPercent: 4.1, memoryBytes: 704643072, user: 'JohnDoe' },
      { pid: 6789, name: 'SearchIndexer.exe', cpuPercent: 0.8, memoryPercent: 3.5, memoryBytes: 601295872, user: 'SYSTEM' },
    ],
  },
  systemUptime: 259200,
  agentUptime: 172800,
  pendingReboot: false,
  batteryChargePercent: 78,
  batteryCharging: true,
  onACPower: true,
};

// Phase 4: Mock Telemetry History (24 hours of data points)
const generateTelemetryHistory = (): TelemetryHistory => {
  const now = new Date();
  const dataPoints = 24;
  const generatePoints = (baseValue: number, variance: number) => {
    return Array.from({ length: dataPoints }, (_, i) => {
      const timestamp = new Date(now.getTime() - (dataPoints - 1 - i) * 3600000);
      const value = baseValue + (Math.random() - 0.5) * variance * 2;
      return {
        timestamp: timestamp.toISOString(),
        value: Math.max(0, Math.min(100, value)),
      };
    });
  };

  return {
    cpu: generatePoints(25, 15),
    memory: generatePoints(65, 10),
    disk: generatePoints(62, 5),
    networkIn: generatePoints(50, 30),
    networkOut: generatePoints(20, 15),
  };
};

const mockTelemetryHistory: TelemetryHistory = generateTelemetryHistory();

// Phase 4: Mock System Errors
const mockSystemErrors: SystemErrors = {
  applicationCrashCount24h: 2,
  applicationCrashCount7d: 5,
  lastCrash: {
    timestamp: '2026-01-13T14:30:00Z',
    application: 'chrome.exe',
    errorCode: '0xc0000005',
    description: 'Access violation - the application attempted to read from an invalid memory address',
  },
  bsodCount30d: 0,
  systemEventLogErrors24h: 12,
  criticalEventCount24h: 1,
};

// Phase 4: Mock Expanded Hardware
const mockExpandedHardware: ExpandedHardware = {
  collectedAt: '2026-01-14T10:30:00Z',
  systemIdentity: {
    manufacturer: 'ASUS',
    model: 'ZenBook Pro 15',
    serialNumber: 'XPS039542192893',
    uuid: 'B1965C4C-21B3-11B2-AB5C-AB1173A64E1',
    sku: 'UX535LI-H2123T',
    assetTag: 'ASSET0029',
  },
  bios: {
    vendor: 'American Megatrends Inc.',
    version: '308',
    releaseDate: '2024-01-23',
    firmwareType: 'UEFI',
    secureBootEnabled: true,
    secureBootCapable: true,
    tpmVersion: '2.0',
    tpmEnabled: true,
  },
  processor: {
    name: 'AMD Ryzen 5 7530U with Radeon Graphics',
    manufacturer: 'AMD',
    architecture: 'x64',
    coreCount: 6,
    threadCount: 12,
    clockSpeedMHz: 2000,
    maxClockSpeedMHz: 4500,
    socketType: 'FP7',
    cacheL1KB: 384,
    cacheL2KB: 3072,
    cacheL3KB: 16384,
    virtualizationEnabled: true,
  },
  memory: {
    totalPhysicalGB: 16,
    availableGB: 5.7,
    usedGB: 10.3,
    usagePercent: 64.4,
    totalSlots: 2,
    usedSlots: 2,
    maxCapacityGB: 32,
    modules: [
      {
        slot: 'DIMM 0',
        manufacturer: 'Samsung',
        partNumber: 'M463A1G43DB0-CWE',
        serialNumber: '00000000',
        capacityGB: 8,
        type: 'DDR4',
        speedMHz: 2667,
        formFactor: 'SODIMM',
        bankLabel: 'P0 CHANNEL A',
        configured: true,
      },
      {
        slot: 'DIMM 1',
        manufacturer: 'Samsung',
        partNumber: 'M463A1G43DB0-DHA',
        serialNumber: '00000001',
        capacityGB: 8,
        type: 'DDR4',
        speedMHz: 2667,
        formFactor: 'SODIMM',
        bankLabel: 'P0 CHANNEL B',
        configured: true,
      },
    ],
  },
  storage: [
    {
      name: 'Samsung SSD 970 EVO Plus 512GB',
      type: 'NVMe',
      mediaType: 'Fixed',
      interfaceType: 'NVMe',
      serialNumber: 'S5XXNX0T123456A',
      firmwareVersion: '2B2QEXM7',
      capacityGB: 476.94,
      freeSpaceGB: 186.32,
      usedSpaceGB: 290.62,
      usagePercent: 60.9,
      partitions: [
        {
          mountPoint: 'C:',
          label: 'Windows',
          fileSystem: 'NTFS',
          capacityGB: 450,
          freeSpaceGB: 175,
          usagePercent: 61.1,
          bitLockerStatus: 'Encrypted',
        },
        {
          mountPoint: 'System Reserved',
          fileSystem: 'NTFS',
          capacityGB: 0.5,
          usagePercent: 80,
        },
      ],
      smartStatus: {
        healthy: true,
        status: 'OK',
        temperature: 38,
        powerOnHours: 4523,
        reallocatedSectors: 0,
        pendingSectors: 0,
        uncorrectableSectors: 0,
        wearLevelingCount: 97,
        mediaWearoutIndicator: 97,
      },
    },
    {
      name: 'WD Blue 1TB HDD',
      type: 'HDD',
      mediaType: 'Fixed',
      interfaceType: 'SATA',
      serialNumber: 'WD-WX123456789',
      firmwareVersion: '01.01A01',
      capacityGB: 931.51,
      freeSpaceGB: 258.42,
      usedSpaceGB: 673.09,
      usagePercent: 72.3,
      partitions: [
        {
          mountPoint: 'D:',
          label: 'Data',
          fileSystem: 'NTFS',
          capacityGB: 931.51,
          freeSpaceGB: 258.42,
          usagePercent: 72.3,
        },
      ],
      smartStatus: {
        healthy: true,
        status: 'OK',
        temperature: 34,
        powerOnHours: 12456,
        reallocatedSectors: 0,
        pendingSectors: 0,
        uncorrectableSectors: 0,
      },
    },
  ],
  battery: {
    name: 'ASUS Internal Battery',
    manufacturer: 'ASUS',
    chemistry: 'Li-Ion',
    designCapacityWh: 70,
    fullChargeCapacityWh: 66.5,
    healthPercent: 95,
    cycleCount: 127,
    chargeLevel: 78,
    chargingStatus: 'Charging',
    estimatedRuntimeMinutes: 323,
    temperature: 32,
    voltage: 15200,
    serialNumber: 'BAT-001-2024',
  },
  baseBoard: {
    name: 'ASUS ZenBook UX535',
    partNumber: 'UX535LI',
    productId: '21JRD005J1',
    serialNumber: 'L1HF44R00BE',
    tag: 'Base Board',
    version: 'Rev 1.0',
  },
  graphicsCards: [
    {
      name: 'AMD Radeon Graphics',
      manufacturer: 'AMD',
      driverVersion: '31.0.14057.5006',
      driverDate: '2024-05-15',
      videoMemoryMB: 512,
      currentResolution: '1920x1080',
      refreshRate: 60,
    },
    {
      name: 'NVIDIA GeForce GTX 1650 Ti',
      manufacturer: 'NVIDIA',
      driverVersion: '546.33',
      driverDate: '2024-01-10',
      videoMemoryMB: 4096,
      currentResolution: '3840x2160',
      refreshRate: 60,
    },
  ],
};

// MSW Handlers
export const assetHandlers = [
  // Get all assets
  http.get(`${API_BASE_URL}/assets`, () => {
    return HttpResponse.json(mockAssets);
  }),

  // Get single asset
  http.get(`${API_BASE_URL}/assets/:id`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return HttpResponse.json(asset);
  }),

  // Create asset
  http.post(`${API_BASE_URL}/assets`, async ({ request }) => {
    const data = await request.json();
    const newAsset: Asset = {
      ...(data as any),
      id: String(mockAssets.length + 1),
      assetId: `ASSET${String(mockAssets.length + 1).padStart(4, '0')}`,
      operationalStatus: 'Disconnected',
      operationalStatusSince: new Date().toLocaleString(),
      operationalStatusDuration: '0 day, 0 hrs, 0 min, 0 sec',
    };
    mockAssets.push(newAsset);
    return HttpResponse.json(newAsset, { status: 201 });
  }),

  // Update asset
  http.put(`${API_BASE_URL}/assets/:id`, async ({ params, request }) => {
    const data = await request.json();
    const index = mockAssets.findIndex((a) => a.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    mockAssets[index] = { ...mockAssets[index], ...(data as any) };
    return HttpResponse.json(mockAssets[index]);
  }),

  // Delete asset
  http.delete(`${API_BASE_URL}/assets/:id`, ({ params }) => {
    const index = mockAssets.findIndex((a) => a.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    mockAssets.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Bulk create assets
  http.post(`${API_BASE_URL}/assets/bulk`, async ({ request }) => {
    const data = (await request.json()) as any[];
    const newAssets = data.map((item, i) => ({
      ...item,
      id: String(mockAssets.length + i + 1),
      assetId: `ASSET${String(mockAssets.length + i + 1).padStart(4, '0')}`,
    }));
    mockAssets.push(...newAssets);
    return HttpResponse.json(newAssets, { status: 201 });
  }),

  // Get asset lifecycle
  http.get(`${API_BASE_URL}/assets/:id/lifecycle`, () => {
    return HttpResponse.json(mockAssetLifeCycle);
  }),

  // Get asset hardware
  http.get(`${API_BASE_URL}/assets/:id/hardware`, () => {
    return HttpResponse.json(mockHardware);
  }),

  // Get asset software
  http.get(`${API_BASE_URL}/assets/:id/software`, () => {
    return HttpResponse.json(mockSoftware);
  }),

  // Get asset audit log
  http.get(`${API_BASE_URL}/assets/:id/audit-log`, () => {
    return HttpResponse.json(mockAuditLog);
  }),

  // Get asset patches (NEW)
  http.get(`${API_BASE_URL}/assets/:id/patches`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return HttpResponse.json(asset.relatedPatches || []);
  }),

  // Get asset deployments (NEW)
  http.get(`${API_BASE_URL}/assets/:id/deployments`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return HttpResponse.json(asset.recentDeployments || []);
  }),

  // Get asset with full patch details (NEW)
  http.get(`${API_BASE_URL}/assets/:id/full`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    // Return the full asset with all patch-related fields
    return HttpResponse.json(asset);
  }),

  // Upload asset attachment
  http.post(`${API_BASE_URL}/assets/:id/attachments`, () => {
    return HttpResponse.json({ success: true }, { status: 201 });
  }),

  // Get software inventory
  http.get(`${API_BASE_URL}/software-inventory`, () => {
    return HttpResponse.json(mockSoftwareInventory);
  }),

  // Get software inventory item
  http.get(`${API_BASE_URL}/software-inventory/:id`, ({ params }) => {
    const item = mockSoftwareInventory.find((s) => s.id === params.id);
    if (!item) {
      return HttpResponse.json({ error: 'Software not found' }, { status: 404 });
    }
    return HttpResponse.json(item);
  }),

  // Import software inventory
  http.post(`${API_BASE_URL}/software-inventory/import`, () => {
    return HttpResponse.json({ success: true, imported: 100 }, { status: 201 });
  }),

  // Get software licenses
  http.get(`${API_BASE_URL}/software-licenses`, () => {
    return HttpResponse.json(mockSoftwareLicenses);
  }),

  // Get software license
  http.get(`${API_BASE_URL}/software-licenses/:id`, ({ params }) => {
    const license = mockSoftwareLicenses.find((l) => l.id === params.id);
    if (!license) {
      return HttpResponse.json({ error: 'License not found' }, { status: 404 });
    }
    return HttpResponse.json(license);
  }),

  // Create software license
  http.post(`${API_BASE_URL}/software-licenses`, async ({ request }) => {
    const data = await request.json();
    const newLicense: SoftwareLicense = {
      ...(data as any),
      id: `lic-${mockSoftwareLicenses.length + 1}`,
    };
    mockSoftwareLicenses.push(newLicense);
    return HttpResponse.json(newLicense, { status: 201 });
  }),

  // Update software license
  http.put(`${API_BASE_URL}/software-licenses/:id`, async ({ params, request }) => {
    const data = await request.json();
    const index = mockSoftwareLicenses.findIndex((l) => l.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'License not found' }, { status: 404 });
    }
    mockSoftwareLicenses[index] = { ...mockSoftwareLicenses[index], ...(data as any) };
    return HttpResponse.json(mockSoftwareLicenses[index]);
  }),

  // Delete software license
  http.delete(`${API_BASE_URL}/software-licenses/:id`, ({ params }) => {
    const index = mockSoftwareLicenses.findIndex((l) => l.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'License not found' }, { status: 404 });
    }
    mockSoftwareLicenses.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Import software licenses
  http.post(`${API_BASE_URL}/software-licenses/import`, () => {
    return HttpResponse.json({ success: true, imported: 50 }, { status: 201 });
  }),

  // Get OS licenses
  http.get(`${API_BASE_URL}/os-licenses`, () => {
    return HttpResponse.json(mockOSLicenses);
  }),

  // Get OS license
  http.get(`${API_BASE_URL}/os-licenses/:id`, ({ params }) => {
    const license = mockOSLicenses.find((l) => l.id === params.id);
    if (!license) {
      return HttpResponse.json({ error: 'OS License not found' }, { status: 404 });
    }
    return HttpResponse.json(license);
  }),

  // Create OS license
  http.post(`${API_BASE_URL}/os-licenses`, async ({ request }) => {
    const data = await request.json();
    const newLicense: OSLicense = {
      ...(data as any),
      id: `os-lic-${mockOSLicenses.length + 1}`,
    };
    mockOSLicenses.push(newLicense);
    return HttpResponse.json(newLicense, { status: 201 });
  }),

  // Update OS license
  http.put(`${API_BASE_URL}/os-licenses/:id`, async ({ params, request }) => {
    const data = await request.json();
    const index = mockOSLicenses.findIndex((l) => l.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'OS License not found' }, { status: 404 });
    }
    mockOSLicenses[index] = { ...mockOSLicenses[index], ...(data as any) };
    return HttpResponse.json(mockOSLicenses[index]);
  }),

  // Delete OS license
  http.delete(`${API_BASE_URL}/os-licenses/:id`, ({ params }) => {
    const index = mockOSLicenses.findIndex((l) => l.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'OS License not found' }, { status: 404 });
    }
    mockOSLicenses.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Import OS licenses
  http.post(`${API_BASE_URL}/os-licenses/import`, () => {
    return HttpResponse.json({ success: true, imported: 20 }, { status: 201 });
  }),

  // Phase 4: Get asset security
  http.get(`${API_BASE_URL}/assets/:id/security`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return HttpResponse.json(mockSecurity);
  }),

  // Phase 4: Get asset network
  http.get(`${API_BASE_URL}/assets/:id/network`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return HttpResponse.json(mockNetwork);
  }),

  // Phase 4: Get asset peripherals
  http.get(`${API_BASE_URL}/assets/:id/peripherals`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return HttpResponse.json(mockPeripherals);
  }),

  // Phase 4: Get asset telemetry (current)
  http.get(`${API_BASE_URL}/assets/:id/telemetry`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    // Return current telemetry with updated timestamp
    return HttpResponse.json({
      ...mockTelemetry,
      timestamp: new Date().toISOString(),
    });
  }),

  // Phase 4: Get asset telemetry history
  http.get(`${API_BASE_URL}/assets/:id/telemetry/history`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    // Return mock history data
    return HttpResponse.json(mockTelemetryHistory);
  }),

  // Phase 4: Get asset errors
  http.get(`${API_BASE_URL}/assets/:id/errors`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return HttpResponse.json(mockSystemErrors);
  }),

  // Phase 4: Get asset expanded hardware
  http.get(`${API_BASE_URL}/assets/:id/hardware/expanded`, ({ params }) => {
    const asset = mockAssets.find((a) => a.id === params.id);
    if (!asset) {
      return HttpResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return HttpResponse.json({
      ...mockExpandedHardware,
      collectedAt: new Date().toISOString(),
    });
  }),
];
