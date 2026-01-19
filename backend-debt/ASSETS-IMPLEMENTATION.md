# Assets Management Implementation Guide

## API Contract
**Spec**: `backend-debt/assets-api.yaml`

## Endpoints Overview
```
# Assets - Core CRUD
GET    /v1/assets                  - List all assets
GET    /v1/assets/:id              - Get asset details
POST   /v1/assets                  - Create asset
PUT    /v1/assets/:id              - Update asset
DELETE /v1/assets/:id              - Delete asset
POST   /v1/assets/bulk             - Bulk operations (delete)
POST   /v1/assets/upload           - Upload assets from file

# Assets - Detail Tabs
GET    /v1/assets/:id/full         - Get complete asset with all tab data
GET    /v1/assets/:id/lifecycle    - Get asset lifecycle history
GET    /v1/assets/:id/hardware     - Get hardware details
GET    /v1/assets/:id/hardware/expanded - Get expanded hardware info
GET    /v1/assets/:id/software     - Get installed software
GET    /v1/assets/:id/audit-log    - Get audit log entries
GET    /v1/assets/:id/patches      - Get patches for asset
GET    /v1/assets/:id/deployments  - Get deployment history
GET    /v1/assets/:id/security     - Get security compliance data
GET    /v1/assets/:id/network      - Get network configuration
GET    /v1/assets/:id/peripherals  - Get peripheral inventory
GET    /v1/assets/:id/telemetry    - Get current telemetry data
GET    /v1/assets/:id/telemetry/history - Get telemetry history
GET    /v1/assets/:id/errors       - Get system errors
POST   /v1/assets/:id/attachments  - Upload attachment

# Categories
GET    /v1/categories              - List categories
POST   /v1/categories              - Create category
PUT    /v1/categories/:id          - Update category
DELETE /v1/categories/:id          - Delete category

# Sub-Categories
GET    /v1/subcategories           - List sub-categories
POST   /v1/subcategories           - Create sub-category
PUT    /v1/subcategories/:id       - Update sub-category
DELETE /v1/subcategories/:id       - Delete sub-category

# Tags
GET    /v1/tags                    - List tags
POST   /v1/tags                    - Create tag
PUT    /v1/tags/:id                - Update tag
DELETE /v1/tags/:id                - Delete tag

# Software Inventory
GET    /v1/software-inventory      - List software inventory
GET    /v1/software-inventory/:id  - Get software details
POST   /v1/software-inventory/import - Import software inventory

# Software Licenses
GET    /v1/software-licenses       - List software licenses
GET    /v1/software-licenses/:id   - Get license details
POST   /v1/software-licenses       - Create software license
PUT    /v1/software-licenses/:id   - Update software license
DELETE /v1/software-licenses/:id   - Delete software license
POST   /v1/software-licenses/import - Import licenses

# OS Licenses
GET    /v1/os-licenses             - List OS licenses
GET    /v1/os-licenses/:id         - Get OS license details
POST   /v1/os-licenses             - Create OS license
PUT    /v1/os-licenses/:id         - Update OS license
DELETE /v1/os-licenses/:id         - Delete OS license
POST   /v1/os-licenses/import      - Import OS licenses
```

## Reference Implementation
- **All Assets**: `frontend/src/pages/assets/AllAssets.tsx`
- **Asset Details**: `frontend/src/pages/assets/components/AssetDetails.tsx`
- **Software Inventory**: `frontend/src/pages/assets/SoftwareInventory.tsx`
- **Software Licenses**: `frontend/src/pages/assets/SoftwareLicense.tsx`
- **OS Licenses**: `frontend/src/pages/assets/OSLicenses.tsx`
- **Services**: `frontend/src/services/asset.service.ts`, `category.service.ts`, `tag.service.ts`
- **Mocks**: `frontend/src/mocks/handlers/asset.handlers.ts`
- **Types**: `frontend/src/types/asset.types.ts`

---

## Data Models

### Asset
```typescript
{
  id: string;                     // UUID
  assetId: string;                // Display ID (e.g., "AST-001")
  name: string;                   // Hostname/device name
  categoryId?: string;            // FK to categories
  subCategoryId?: string;         // FK to sub-categories
  status: 'In Use' | 'Available' | 'Under Maintenance' | 'Retired';
  operationalStatus: 'Connected' | 'Disconnected';
  operationalStatusSince?: string;
  operationalStatusDuration?: string;
  agentId?: string;               // FK to agents
  ipAddress?: string;
  macAddress?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  osType: 'Windows' | 'MacOS' | 'Linux';
  osVersion?: string;
  tags?: string[];                // Array of tag IDs
  createdAt: string;
  updatedAt: string;
}
```

### Category
```typescript
{
  id: string;
  name: string;
  color?: string;                 // Hex color for UI
  description?: string;
  isDefault?: boolean;
  createdAt: string;
}
```

### SubCategory
```typescript
{
  id: string;
  categoryId: string;             // FK to categories
  name: string;
  criticality?: 'Critical' | 'High' | 'Medium' | 'Low';
  description?: string;
  createdAt: string;
}
```

### Tag
```typescript
{
  id: string;
  name: string;
  color: string;                  // Hex color
  createdAt: string;
}
```

### SoftwareInventory
```typescript
{
  id: string;
  softwareName: string;
  version: string;
  softwareType: string;           // Application, System, etc.
  manufacturer: string;
  totalInstances: number;         // Count across assets
}
```

### SoftwareLicense
```typescript
{
  id: string;
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
  createdAt: string;
}
```

### OSLicense
```typescript
{
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
}
```

### AssetLifeCycle
```typescript
{
  purchaseDate: string;
  purchaseValue: number;
  currentDate: string;
  currentValue: number;
  amcExpiryDate: string;
  warrantyExpiryDate: string;
  endOfLife: string;
  endOfLifeValue: number;
  depreciationTimeline: {
    date: string;
    value: number;
    label: string;
  }[];
}
```

### Hardware
```typescript
{
  bios: {
    name: string;
    installDate: string;
    biosVersion: string;
    manufacturer: string;
    description: string;
    secureBootState: string;
    serialNumber: string;
  };
  processor: {
    name: string;
    logicalProcessors: number;
    manufacturer: string;
    numberOfCores: number;
    processorSpeed: string;
    secureBootState: string;
  };
  baseBoard: {
    name: string;
    partNumber: string;
    productId: string;
    serialNumber: string;
    tag: string;
    version: string;
  };
  storage: {
    name: string;
    drive: string;
    capacity: string;
    used: string;
    format: string;
    type: string;
    serialNumber: string;
  }[];
  memory: {
    slot: string;
    name: string;
    capacity: string;
    bankLabel: string;
    locator: string;
    memoryType: string;
    serialNumber: string;
    partNumber: string;
  }[];
  networkAdapters: {
    id: string;
    name: string;
    ipAddressV4?: string;
    ipAddressV6?: string;
    macAddress: string;
    dhcpServer?: string;
  }[];
  battery?: {
    id: string;
    name: string;
    health: string;
    cycleCount: number;
    chargeLevel: number;
    chargingStatus: 'Charging' | 'Discharging' | 'Not charging' | 'Unknown';
  };
}
```

### ExpandedHardware
```typescript
{
  collectedAt: string;
  systemIdentity?: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    uuid: string;
    sku?: string;
    assetTag?: string;
  };
  bios?: {
    vendor: string;
    version: string;
    releaseDate?: string;
    firmwareType?: 'BIOS' | 'UEFI';
    secureBootEnabled?: boolean;
    tpmVersion?: string;
    tpmEnabled?: boolean;
  };
  processor?: {
    name: string;
    manufacturer: string;
    architecture: 'x64' | 'x86' | 'arm64' | 'arm';
    coreCount: number;
    threadCount: number;
    clockSpeedMHz: number;
    maxClockSpeedMHz?: number;
    virtualizationEnabled?: boolean;
  };
  memory?: {
    totalPhysicalGB: number;
    availableGB?: number;
    usedGB?: number;
    usagePercent?: number;
    totalSlots?: number;
    usedSlots?: number;
    modules: {
      slot: string;
      manufacturer?: string;
      partNumber?: string;
      serialNumber?: string;
      capacityGB: number;
      type?: 'DDR3' | 'DDR4' | 'DDR5';
      speedMHz?: number;
    }[];
  };
  storage?: {
    name: string;
    type: 'HDD' | 'SSD' | 'NVMe' | 'USB';
    capacityGB: number;
    freeSpaceGB?: number;
    usagePercent?: number;
    smartStatus?: {
      healthy: boolean;
      status: 'OK' | 'Warning' | 'Critical';
      temperature?: number;
    };
    partitions?: {
      mountPoint: string;
      label?: string;
      fileSystem?: string;
      capacityGB?: number;
      freeSpaceGB?: number;
    }[];
  }[];
  graphicsCards?: {
    name: string;
    manufacturer?: string;
    driverVersion?: string;
    videoMemoryMB?: number;
  }[];
  battery?: {
    healthPercent?: number;
    cycleCount?: number;
    chargeLevel?: number;
    chargingStatus?: 'Charging' | 'Discharging' | 'Full';
    estimatedRuntimeMinutes?: number;
  };
}
```

### Software (Asset Tab)
```typescript
{
  os: {
    name: string;
    version: string;
  };
  licenseDetails: {
    buildNumber: string;
    deviceType: string;
    lastBootUpTime: string;
    licenseStatus: string;
    osInstalledBy: string;
    productKey: string;
    systemDrive: string;
    version: string;
    virtualMemory: string;
  };
  applications: {
    id: string;
    name: string;
    vendor: string;
    version: string;
    patchStatus: 'Available' | 'Not Available';
    lastPatched: string;
    appInstalledOn: string;
  }[];
  services: {
    id: string;
    name: string;
    state: 'Running' | 'Stopped';
    type: string;
    status: 'OK' | 'Error' | 'Warning';
  }[];
}
```

### AuditLog (Asset Tab)
```typescript
{
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}
```

### SecurityCompliance
```typescript
{
  firewallEnabled: boolean;
  antivirusStatus: 'Active' | 'Inactive' | 'Not Installed';
  antivirusName?: string;
  lastScanDate?: string;
  encryptionStatus: 'Enabled' | 'Disabled' | 'Partial';
  complianceScore: number;
  vulnerabilities?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
```

### NetworkConfiguration
```typescript
{
  interfaces: {
    name: string;
    ipAddress: string;
    subnetMask: string;
    gateway: string;
    dns: string[];
    macAddress: string;
    type: 'Ethernet' | 'WiFi' | 'Loopback';
    status: 'Connected' | 'Disconnected';
  }[];
}
```

### PeripheralInventory
```typescript
{
  devices: {
    type: 'Monitor' | 'USB' | 'Printer' | 'Keyboard' | 'Mouse';
    name: string;
    manufacturer?: string;
    connectionType?: string;
    serialNumber?: string;
  }[];
}
```

### TelemetryPayload
```typescript
{
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: string;
  lastBootTime: string;
  networkBytesIn?: number;
  networkBytesOut?: number;
  processCount?: number;
  temperature?: number;
}
```

### TelemetryHistory
```typescript
{
  dataPoints: {
    timestamp: string;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  }[];
  period: 'hour' | 'day' | 'week';
}
```

### SystemErrors
```typescript
{
  errors: {
    id: string;
    timestamp: string;
    level: 'Error' | 'Warning' | 'Critical';
    source: string;
    message: string;
    eventId?: number;
  }[];
}
```

---

## TDD Scenarios

### GET /v1/assets

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| search | string | Search by name, assetId |
| categoryId | string | Filter by category |
| subCategoryId | string | Filter by sub-category |
| status | string | Filter by status |
| operationalStatus | string | Filter by operational status |

**Success (200)**
```json
{
  "data": [
    {
      "id": "uuid",
      "assetId": "AST-001",
      "name": "DESKTOP-7CC6ETJ",
      "categoryId": "cat_uuid",
      "status": "In Use",
      "operationalStatus": "Connected",
      "operationalStatusSince": "2024-01-01T00:00:00Z",
      "operationalStatusDuration": "30 days",
      "osType": "Windows"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### GET /v1/assets/:id

**Success (200)** - Full asset with related data
```json
{
  "id": "uuid",
  "assetId": "AST-001",
  "name": "DESKTOP-7CC6ETJ",
  "categoryId": "cat_uuid",
  "subCategoryId": "subcat_uuid",
  "status": "In Use",
  "operationalStatus": "Connected",
  "ipAddress": "192.168.1.100",
  "macAddress": "00:1B:44:11:3A:B7",
  "osType": "Windows",
  "osVersion": "Windows 11 Pro",

  // Network Tab Data
  "network": {
    "interfaces": [
      {
        "name": "Ethernet0",
        "ipAddress": "192.168.1.100",
        "subnetMask": "255.255.255.0",
        "gateway": "192.168.1.1",
        "dns": ["8.8.8.8", "8.8.4.4"],
        "macAddress": "00:1B:44:11:3A:B7",
        "type": "Ethernet",
        "status": "Connected"
      }
    ]
  },

  // Security Tab Data
  "security": {
    "firewallEnabled": true,
    "antivirusStatus": "Active",
    "antivirusName": "Windows Defender",
    "lastScanDate": "2024-01-15T10:00:00Z",
    "encryptionStatus": "Enabled",
    "complianceScore": 85
  },

  // Telemetry Tab Data
  "telemetry": {
    "cpuUsage": 45,
    "memoryUsage": 60,
    "diskUsage": 70,
    "uptime": "15 days",
    "lastBootTime": "2024-01-01T00:00:00Z"
  },

  // Patches Tab Data
  "patchStatus": {
    "installed": 120,
    "pending": 5,
    "failed": 2
  },

  // Peripherals Tab Data
  "peripherals": [
    {
      "type": "Monitor",
      "name": "Dell U2722D",
      "manufacturer": "Dell",
      "connectionType": "DisplayPort"
    },
    {
      "type": "USB",
      "name": "Logitech Mouse",
      "manufacturer": "Logitech"
    }
  ]
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Not found | 404 | `{ "error": "Asset not found" }` |
| Invalid ID | 400 | `{ "error": "Invalid asset ID" }` |

---

### POST /v1/assets

**Request**
```json
{
  "name": "NEW-WORKSTATION",
  "categoryId": "cat_uuid",
  "subCategoryId": "subcat_uuid",
  "status": "Available",
  "ipAddress": "192.168.1.101",
  "osType": "Windows",
  "tags": ["tag_uuid1", "tag_uuid2"]
}
```

**Success (201)**
```json
{
  "id": "new_uuid",
  "assetId": "AST-002",
  "name": "NEW-WORKSTATION",
  ...
}
```

**Validations**
- name: required, min 1 char
- osType: required, enum value
- categoryId: optional, must exist if provided
- status: optional, defaults to 'Available'

---

### POST /v1/assets/upload

**Request**: `multipart/form-data`
- file: CSV/Excel file (max 6MB)
- Allowed formats: `.csv`, `.xls`, `.xlsx`

**CSV Format**
```csv
name,ipAddress,osType,categoryId,status
DESKTOP-001,192.168.1.100,Windows,cat_uuid,In Use
LAPTOP-002,192.168.1.101,MacOS,cat_uuid,Available
```

**Success (200)**
```json
{
  "imported": 10,
  "failed": 2,
  "errors": [
    { "row": 5, "error": "Invalid IP address" }
  ]
}
```

---

### Categories CRUD

**GET /v1/categories** - List all
```json
[
  {
    "id": "uuid",
    "name": "Workstations",
    "color": "#1890ff",
    "isDefault": false
  }
]
```

**POST /v1/categories**
```json
Request: { "name": "Servers", "color": "#52c41a" }
Response: { "id": "uuid", "name": "Servers", "color": "#52c41a" }
```

**Validations**
- name: required, unique, min 2 chars
- color: optional, valid hex

---

### Tags CRUD

**GET /v1/tags**
```json
[
  { "id": "uuid", "name": "Production", "color": "#f5222d" },
  { "id": "uuid", "name": "Development", "color": "#1890ff" }
]
```

**POST /v1/tags**
```json
Request: { "name": "Testing", "color": "#faad14" }
Response: { "id": "uuid", "name": "Testing", "color": "#faad14" }
```

---

### Software Inventory

**GET /v1/assets/software-inventory**

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Search by name |
| osFilter | string | Filter by OS |
| categoryFilter | string | Filter by type |

**Response**
```json
[
  {
    "id": "uuid",
    "softwareName": "Google Chrome",
    "version": "120.0.6099.130",
    "softwareType": "Application",
    "manufacturer": "Google LLC",
    "totalInstances": 45
  }
]
```

---

### Software Licenses CRUD

**POST /v1/assets/software-licenses**
```json
Request: {
  "licenseName": "Microsoft 365",
  "softwareName": "Microsoft Office",
  "publisher": "Microsoft",
  "licenseKey": "XXXXX-XXXXX-XXXXX",
  "purchaseDate": "2024-01-01",
  "expiryDate": "2025-01-01",
  "licenseCount": 100,
  "vendorName": "Microsoft",
  "cost": 15000,
  "status": "Available"
}
```

**Validations**
- licenseName: required
- softwareName: required
- licenseCount: required, min 1
- vendorName: required
- status: required, enum

---

## Database Schema

```sql
-- Assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES categories(id),
  sub_category_id UUID REFERENCES sub_categories(id),
  status VARCHAR(50) DEFAULT 'Available',
  operational_status VARCHAR(50) DEFAULT 'Disconnected',
  operational_status_since TIMESTAMP,
  agent_id UUID REFERENCES agents(id),
  ip_address VARCHAR(45),
  mac_address VARCHAR(17),
  serial_number VARCHAR(100),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  os_type VARCHAR(50) NOT NULL,
  os_version VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_name ON assets(name);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7),
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sub-Categories
CREATE TABLE sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  criticality VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Asset Tags (many-to-many)
CREATE TABLE asset_tags (
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, tag_id)
);

-- Software Inventory
CREATE TABLE software_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_name VARCHAR(255) NOT NULL,
  version VARCHAR(100),
  software_type VARCHAR(50),
  manufacturer VARCHAR(255),
  total_instances INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Software Licenses
CREATE TABLE software_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_name VARCHAR(255) NOT NULL,
  software_name VARCHAR(255) NOT NULL,
  publisher VARCHAR(255),
  license_key VARCHAR(255),
  purchase_date DATE,
  expiry_date DATE,
  license_count INTEGER NOT NULL DEFAULT 1,
  vendor_name VARCHAR(255) NOT NULL,
  cost DECIMAL(10,2),
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## UI Features to Support

### Column Visibility
- Assets table supports configurable columns
- Store user preferences in localStorage (frontend) or user settings (backend)

### Filters
- Category filter (from URL param or modal)
- Status filter (In Use, Available, etc.)
- Operational Status filter (Connected, Disconnected)
- Search across assetId, name

### Bulk Operations
- Bulk delete (POST /v1/assets/bulk-delete with array of IDs)
- Export to CSV (client-side or server-side)

### File Upload
- Max size: 6MB
- Formats: PNG, JPEG, PDF, XLS, XLSX, CSV
- Validate rows, return detailed errors

---

---

## Additional TDD Scenarios

### GET /v1/assets/:id/full
Returns complete asset with all tab data in a single request.

**Success (200)**
```json
{
  "id": "uuid",
  "assetId": "AST-001",
  "name": "DESKTOP-7CC6ETJ",
  // ... all asset fields ...
  "lifecycle": { ... },
  "hardware": { ... },
  "software": { ... },
  "security": { ... },
  "network": { ... },
  "peripherals": { ... },
  "telemetry": { ... },
  "auditLog": [ ... ],
  "patches": [ ... ],
  "deployments": [ ... ]
}
```

---

### GET /v1/assets/:id/lifecycle
Returns asset lifecycle and depreciation data.

**Success (200)**
```json
{
  "purchaseDate": "2022-02-14",
  "purchaseValue": 40000,
  "currentDate": "2025-06-15",
  "currentValue": 13189,
  "amcExpiryDate": "2027-09-23",
  "warrantyExpiryDate": "2027-02-17",
  "endOfLife": "2030-01-31",
  "endOfLifeValue": 8000,
  "depreciationTimeline": [
    { "date": "2022-02-14", "value": 40000, "label": "Purchase" },
    { "date": "2023-02-14", "value": 32000, "label": "Year 1" },
    { "date": "2024-02-14", "value": 24000, "label": "Year 2" },
    { "date": "2025-02-14", "value": 16000, "label": "Year 3" }
  ]
}
```

---

### GET /v1/assets/:id/hardware
Returns hardware inventory for the asset.

**Success (200)**
```json
{
  "bios": {
    "name": "American Megatrends Inc.",
    "biosVersion": "1.2.3",
    "manufacturer": "AMI",
    "secureBootState": "Enabled"
  },
  "processor": {
    "name": "AMD Ryzen 5 7530U",
    "numberOfCores": 6,
    "logicalProcessors": 12,
    "processorSpeed": "2.0GHz"
  },
  "storage": [ ... ],
  "memory": [ ... ],
  "networkAdapters": [ ... ],
  "battery": { ... }
}
```

---

### GET /v1/assets/:id/hardware/expanded
Returns detailed hardware with SMART status, partitions, etc.

**Success (200)**
```json
{
  "collectedAt": "2025-01-15T10:00:00Z",
  "systemIdentity": { ... },
  "bios": { ... },
  "processor": { ... },
  "memory": {
    "totalPhysicalGB": 16,
    "usagePercent": 45,
    "modules": [ ... ]
  },
  "storage": [
    {
      "name": "NVMe Samsung 970 EVO",
      "type": "NVMe",
      "capacityGB": 512,
      "smartStatus": { "healthy": true, "status": "OK" },
      "partitions": [ ... ]
    }
  ],
  "graphicsCards": [ ... ]
}
```

---

### GET /v1/assets/:id/software
Returns installed software for the asset.

**Success (200)**
```json
{
  "os": { "name": "Windows 11 Pro", "version": "22H2" },
  "licenseDetails": { ... },
  "applications": [
    {
      "id": "app-1",
      "name": "Google Chrome",
      "vendor": "Google LLC",
      "version": "120.0.6099.130",
      "patchStatus": "Available",
      "lastPatched": "2024-01-10"
    }
  ],
  "services": [ ... ]
}
```

---

### GET /v1/assets/:id/security
Returns security compliance data.

**Success (200)**
```json
{
  "firewallEnabled": true,
  "antivirusStatus": "Active",
  "antivirusName": "Windows Defender",
  "lastScanDate": "2024-01-15T10:00:00Z",
  "encryptionStatus": "Enabled",
  "complianceScore": 85,
  "vulnerabilities": {
    "critical": 0,
    "high": 2,
    "medium": 5,
    "low": 3
  }
}
```

---

### GET /v1/assets/:id/network
Returns network configuration.

**Success (200)**
```json
{
  "interfaces": [
    {
      "name": "Ethernet0",
      "ipAddress": "192.168.1.100",
      "subnetMask": "255.255.255.0",
      "gateway": "192.168.1.1",
      "dns": ["8.8.8.8", "8.8.4.4"],
      "macAddress": "00:1B:44:11:3A:B7",
      "type": "Ethernet",
      "status": "Connected"
    }
  ]
}
```

---

### GET /v1/assets/:id/peripherals
Returns connected peripherals.

**Success (200)**
```json
{
  "devices": [
    {
      "type": "Monitor",
      "name": "Dell U2722D",
      "manufacturer": "Dell",
      "connectionType": "DisplayPort"
    },
    {
      "type": "USB",
      "name": "Logitech Mouse",
      "manufacturer": "Logitech"
    }
  ]
}
```

---

### GET /v1/assets/:id/telemetry
Returns current telemetry data.

**Success (200)**
```json
{
  "cpuUsage": 45,
  "memoryUsage": 60,
  "diskUsage": 70,
  "uptime": "15 days",
  "lastBootTime": "2024-01-01T00:00:00Z",
  "processCount": 120,
  "networkBytesIn": 1234567890,
  "networkBytesOut": 987654321
}
```

---

### GET /v1/assets/:id/telemetry/history
Returns telemetry history over time.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| period | string | 'hour', 'day', 'week' (default: 'day') |

**Success (200)**
```json
{
  "dataPoints": [
    { "timestamp": "2024-01-15T10:00:00Z", "cpuUsage": 45, "memoryUsage": 60, "diskUsage": 70 },
    { "timestamp": "2024-01-15T11:00:00Z", "cpuUsage": 55, "memoryUsage": 58, "diskUsage": 70 }
  ],
  "period": "day"
}
```

---

### GET /v1/assets/:id/errors
Returns system errors and warnings.

**Success (200)**
```json
{
  "errors": [
    {
      "id": "err-1",
      "timestamp": "2024-01-15T10:30:00Z",
      "level": "Error",
      "source": "Application",
      "message": "Application crashed unexpectedly",
      "eventId": 1001
    }
  ]
}
```

---

### GET /v1/assets/:id/audit-log
Returns audit log entries for the asset.

**Success (200)**
```json
[
  {
    "id": "log-1",
    "timestamp": "2024-01-15T10:00:00Z",
    "action": "Status Changed",
    "user": "admin@example.com",
    "details": "Status changed from Available to In Use"
  }
]
```

---

### GET /v1/assets/:id/patches
Returns patches associated with the asset.

**Success (200)**
```json
{
  "data": [
    {
      "id": "patch-1",
      "name": "2025-08 Cumulative Update for Windows 10",
      "severity": "CRITICAL",
      "status": "Missing",
      "kbNumber": "KB5063709"
    }
  ],
  "summary": {
    "total": 15,
    "installed": 10,
    "missing": 3,
    "failed": 1,
    "pending": 1
  }
}
```

---

### GET /v1/assets/:id/deployments
Returns deployment history for the asset.

**Success (200)**
```json
{
  "data": [
    {
      "id": "dep-1",
      "patchId": "patch-5",
      "patchName": "2025-08 .NET 8.0.19 Update",
      "date": "2025-12-12",
      "status": "Success"
    }
  ]
}
```

---

### OS Licenses CRUD

**GET /v1/os-licenses**
```json
[
  {
    "id": "uuid",
    "licenseName": "Windows 11 Pro",
    "osType": "Windows",
    "status": "Allocated",
    "licenseCount": 100,
    "vendorName": "Microsoft",
    "licenseKey": "XXXXX-XXXXX-XXXXX",
    "expiryDate": "2025-12-31"
  }
]
```

**POST /v1/os-licenses**
```json
Request: {
  "licenseName": "Windows 11 Pro",
  "osType": "Windows",
  "licenseCount": 100,
  "vendorName": "Microsoft",
  "status": "Available"
}

Response (201): { "id": "uuid", ... }
```

**PUT /v1/os-licenses/:id** - Update existing license
**DELETE /v1/os-licenses/:id** - Delete license

---

## Implementation Order

1. Categories CRUD
2. Sub-Categories CRUD
3. Tags CRUD
4. Assets CRUD (basic)
5. Asset-Tag relationship
6. Asset filtering/search
7. Asset detail tabs (lifecycle, hardware, software, security, network, peripherals, telemetry)
8. Hardware expanded endpoint
9. Telemetry history
10. System errors
11. Audit log
12. Software Inventory
13. Software Licenses CRUD
14. OS Licenses CRUD
15. File upload/import
16. Asset patches and deployments integration
