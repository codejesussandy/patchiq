# PatchIQ Data Flow Map

This document traces the complete data flow from Agent collectors through Backend to Frontend for Hardware, Software, and Telemetry data.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATA FLOW                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐              │
│   │   Go Agent       │      │   Backend API    │      │   Frontend       │              │
│   │   (Collector)    │ ──>  │   (NestJS)       │ ──>  │   (React)        │              │
│   └──────────────────┘      └──────────────────┘      └──────────────────┘              │
│          │                         │                         │                          │
│          ▼                         ▼                         ▼                          │
│   agent/internal/        backend/src/db/prisma/     frontend/src/types/                 │
│   models/*.go            schema.prisma              asset.types.ts                      │
│   collectors/*.go                                   telemetry.types.ts                  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Hardware Data Flow

### Source: Agent Collector
**File:** `agent/internal/collectors/hardware.go`
**Model:** `agent/internal/models/hardware.go`

```go
// What the agent COLLECTS and SENDS to backend
type Hardware struct {
    CollectedAt      string           `json:"collectedAt"`
    SystemIdentity   SystemIdentity   `json:"systemIdentity"`
    BIOS             BIOS             `json:"bios"`
    Processor        Processor        `json:"processor"`
    Memory           Memory           `json:"memory"`
    StorageDrives    []StorageDrive   `json:"storageDrives"`
    Battery          *Battery         `json:"battery,omitempty"`
    GraphicsAdapters []GraphicsAdapter `json:"graphicsAdapters"`
}

type SystemIdentity struct {
    Manufacturer string  // Collected via system_profiler/wmic/sysfs
    Model        string
    SerialNumber string
    UUID         string
    SKU          string
    AssetTag     string
}

type Processor struct {
    Name          string  // "AMD Ryzen 5 7530U"
    Manufacturer  string  // "Intel", "AMD", "Apple"
    Architecture  string  // "x64", "arm64"
    CoreCount     int
    ThreadCount   int
    ClockSpeedMHz int
    MaxSpeedMHz   int
    L2CacheKB     int
    L3CacheKB     int
}

type Memory struct {
    TotalPhysicalGB float64
    TotalSlots      int
    UsedSlots       int
    MaxCapacityGB   float64
    Modules         []MemoryModule  // Per-slot details
}

type StorageDrive struct {
    Name        string
    DeviceID    string
    Type        string       // "HDD", "SSD", "NVMe"
    MediaType   string
    Interface   string       // "SATA", "NVMe", "USB"
    CapacityGB  float64
    FreeSpaceGB float64
    FileSystem  string
    MountPoint  string
    SmartStatus *SmartStatus
}
```

### Storage: Prisma Schema (Current)
**File:** `backend/src/db/prisma/schema.prisma:315-329`

```prisma
// What the database CURRENTLY stores (MINIMAL!)
model AssetHardware {
    id         String  @id @default(uuid())
    assetId    String  @unique
    cpu        String?           // Just the name
    cpuCores   Int?              // Just core count
    ramTotal   BigInt?           // Just total bytes
    diskTotal  BigInt?           // Just total bytes
    diskFree   BigInt?           // Just free bytes
    gpuModel   String?           // Just GPU name
    biosVersion String?          // Just version
    systemSKU  String?           // Just SKU
}
```

### Consumer: Frontend Types
**File:** `frontend/src/types/asset.types.ts:336-344` (Hardware)
**File:** `frontend/src/types/asset.types.ts:519-529` (ExpandedHardware)

```typescript
// What the frontend EXPECTS (matches agent output!)
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

// Also: simpler Hardware type for basic view
export type Hardware = {
    bios: BIOS;
    processor: ProcessorDetails;
    baseBoard: BaseBoard;
    storage: Drive[];
    memory: MemorySlot[];
    networkAdapters: NetworkAdapter[];
    battery?: Battery;
};
```

### Mismatch Analysis

| Layer | SystemIdentity | Processor | Memory | Storage |
|-------|---------------|-----------|--------|---------|
| Agent Sends | Full object with 6 fields | Full object with 9 fields | Object + modules array | Array of drives with SMART |
| Prisma Stores | systemSKU only | cpu + cpuCores | ramTotal only | diskTotal + diskFree only |
| Frontend Expects | Full SystemIdentity object | Full Processor object | Full Memory with modules | Full drives with SMART |

**GAP:** Prisma stores ~10% of what agent sends. Frontend expects 100%.

---

## 2. Software Data Flow

### Source: Agent Collector
**Expected File:** `agent/internal/collectors/software.go` (to be implemented)

```go
// Expected structure based on frontend types
type SoftwareInventory struct {
    CollectedAt   string
    OS            OSInfo
    Applications  []Application
    Services      []Service
    LicenseInfo   LicenseDetails
}
```

### Storage: Prisma Schema (Current)
**File:** `backend/src/db/prisma/schema.prisma:331-344`

```prisma
model AssetSoftware {
    id           String    @id @default(uuid())
    assetId      String
    name         String
    version      String?
    vendor       String?
    installDate  DateTime?
    installPath  String?
    isSystem     Boolean   @default(false)
}
```

### Consumer: Frontend Types
**File:** `frontend/src/types/asset.types.ts:574-604`

```typescript
export type Software = {
    os: {
        name: string;
        version: string;
    };
    licenseDetails: {
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
        // ... 8 more fields
    };
    applications: Application[];
    services: Service[];
    systemEnvironment: SystemEnvironment;
};
```

### Mismatch Analysis

| Layer | OS Info | License | Applications | Services |
|-------|---------|---------|--------------|----------|
| Agent Sends | TBD | TBD | TBD | TBD |
| Prisma Stores | None | None | Basic (6 fields) | None |
| Frontend Expects | name + version | 19 fields | 7 fields per app | 5 fields per service |

---

## 3. Telemetry Data Flow

### Source: Agent Collector
**Expected File:** `agent/internal/collectors/telemetry.go`

```go
// Expected structure for heartbeat telemetry
type Telemetry struct {
    Timestamp       string
    AgentId         string
    IntervalSeconds int
    CPU             CPUMetrics
    Memory          MemoryMetrics
    Disk            DiskMetrics
    Network         NetworkMetrics
    Processes       ProcessMetrics
    SystemUptime    int
    AgentUptime     int
    PendingReboot   bool
    Battery         *BatteryMetrics
}
```

### Storage: Prisma Schema (Current)
**File:** `backend/src/db/prisma/schema.prisma:207-219`

```prisma
model AgentTelemetry {
    id          String   @id @default(uuid())
    agentId     String
    cpuUsage    Float?   // Just percentage
    memoryUsage Float?   // Just percentage
    diskUsage   Float?   // Just percentage
    uptime      Int?
    timestamp   DateTime @default(now())
}
```

### Consumer: Frontend Types
**File:** `frontend/src/types/telemetry.types.ts`

```typescript
export type TelemetryPayload = {
    timestamp: string;
    agentId: string;
    intervalSeconds: number;
    cpu: CPUTelemetry;           // 10+ fields
    memory: MemoryTelemetry;     // 12+ fields
    disk: DiskTelemetry;         // Per-drive metrics
    network: NetworkTelemetry;   // Per-interface metrics
    processes: ProcessTelemetry; // Top processes by CPU/memory
    systemUptime: number;
    agentUptime: number;
    pendingReboot: boolean;
    batteryChargePercent?: number;
    batteryCharging?: boolean;
    onACPower?: boolean;
};
```

### Mismatch Analysis

| Metric | Prisma Fields | Frontend Fields | Gap |
|--------|---------------|-----------------|-----|
| CPU | cpuUsage | usagePercent, perCoreUsage[], userPercent, systemPercent, temperature, frequency, throttled | 7 fields missing |
| Memory | memoryUsage | usagePercent, totalBytes, usedBytes, availableBytes, swapUsagePercent, commitPercent | 6+ fields missing |
| Disk | diskUsage | Per-drive: usagePercent, readBytesPerSec, writeBytesPerSec, latencyMs, etc. | All per-drive metrics missing |
| Network | None | Per-interface metrics, connection counts, latency | Entire category missing |
| Processes | None | topByCpu[], topByMemory[] | Entire category missing |

---

## 4. Asset Base Data Flow

### Source: Multiple Sources

- **Manual Entry:** User creates asset via UI form
- **Agent Registration:** Agent registers and creates/links asset
- **Discovery:** Network discovery finds device

### Storage: Prisma Schema
**File:** `backend/src/db/prisma/schema.prisma:279-313`

```prisma
model Asset {
    id             String       @id @default(uuid())
    name           String
    type           String       @default("Endpoint")
    status         String       @default("In Use")
    serialNumber   String?      @unique
    assetTag       String?      @unique
    os             String?
    osVersion      String?
    ipAddress      String?
    macAddress     String?
    manufacturer   String?
    model          String?
    purchaseDate   DateTime?
    warrantyExpiry DateTime?
    organizationId String?
    locationId     String?

    // Relations
    agent          Agent?
    hardware       AssetHardware?
    software       AssetSoftware[]
    security       AssetSecurity?
}
```

### Consumer: Frontend Types
**File:** `frontend/src/types/asset.types.ts:182-244`

```typescript
export type Asset = {
    // Basic (matches Prisma)
    id: string;
    name: string;
    serialNumber: string;
    assetTag: string;
    // ...

    // NOT in Prisma - computed/aggregated
    assetId: string;                    // Display ID like "ASSET0029"
    operationalStatus: OperationalStatus; // From Agent.status
    operationalStatusSince: string;     // Computed from Agent
    operationalStatusDuration: string;  // Computed from Agent

    // NOT in Prisma - nested objects
    owner: Owner;           // Should be User relation or denormalized
    processor: Processor;   // Should come from AssetHardware
    ram: RAM;               // Should come from AssetHardware
    storage: Storage;       // Should come from AssetHardware
    performance: Performance; // Should come from Telemetry
    location: {
        base: Location;     // Should be relation
        installed: Location; // Should be relation
    };
    procurement: Procurement; // NOT in Prisma at all
    cost: Cost;              // NOT in Prisma at all

    // Relations that DO exist in Prisma
    agent?: AgentLink;
    patchSummary?: PatchSummary;  // Computed from patches
    groups?: AssetGroup[];         // From relations
};
```

### Mismatch Analysis

| Category | Prisma Has | Frontend Expects | Resolution |
|----------|------------|------------------|------------|
| Display ID | id (UUID) | assetId (ASSET0029) | Add `assetTag` usage or display pattern |
| Operational Status | None (on Agent) | operationalStatus + duration | Aggregate from Agent relation |
| Owner | None | Owner { name, email, phone } | Add User relation or fields |
| Hardware Summary | Via relation | Nested processor, ram, storage | API transforms AssetHardware |
| Performance | Via relation | Nested performance object | API transforms AgentTelemetry |
| Location | locationId | Nested base + installed | Add second location or extend |
| Procurement | None | 7 fields | Add to Asset or new model |
| Cost | None | 8 fields | Add to Asset or new model |

---

## 5. Recommended Data Transformations

### Hardware API Response
Backend should transform:

```typescript
// Input: AssetHardware (Prisma) + raw agent JSON
// Output: ExpandedHardware (frontend type)

async getAssetHardware(assetId: string): Promise<ExpandedHardware> {
    // 1. Get stored hardware from Prisma
    const stored = await this.prisma.assetHardware.findUnique({...});

    // 2. Get latest raw hardware JSON from agent (if available)
    const agentHardware = await this.getLatestAgentHardwarePayload(assetId);

    // 3. Merge: prefer agent data, fall back to stored
    return {
        collectedAt: agentHardware?.collectedAt || new Date().toISOString(),
        systemIdentity: agentHardware?.systemIdentity || {
            manufacturer: stored?.manufacturer,
            serialNumber: stored?.serialNumber,
            // ...
        },
        processor: agentHardware?.processor || {
            name: stored?.cpu,
            coreCount: stored?.cpuCores,
            // ...defaults for missing fields
        },
        // ... etc
    };
}
```

### Asset Detail API Response
Backend should transform:

```typescript
// Input: Asset + Agent + AssetHardware + AgentTelemetry
// Output: AssetDetailResponse (matches frontend Asset type)

async getAssetDetail(id: string): Promise<AssetDetailResponse> {
    const asset = await this.prisma.asset.findUnique({
        include: {
            agent: true,
            hardware: true,
            location: true,
        }
    });

    const telemetry = await this.getLatestTelemetry(asset.agent?.id);

    return {
        ...asset,
        assetId: asset.assetTag || `ASSET${asset.id.slice(0,4)}`,
        operationalStatus: asset.agent?.status === 'Connected' ? 'Connected' : 'Disconnected',
        operationalStatusSince: asset.agent?.lastHeartbeat,
        operationalStatusDuration: this.calculateDuration(asset.agent?.lastHeartbeat),
        processor: {
            name: asset.hardware?.cpu,
            cores: asset.hardware?.cpuCores,
            speed: 'Unknown', // Not stored
        },
        ram: {
            size: this.formatBytes(asset.hardware?.ramTotal),
            type: 'Unknown', // Not stored
        },
        performance: {
            cpuUtilization: telemetry?.cpuUsage,
            memoryUtilization: telemetry?.memoryUsage,
            diskUtilization: telemetry?.diskUsage,
            systemUptime: this.formatUptime(telemetry?.uptime),
        },
        // ... etc
    };
}
```

---

## 6. Summary: What Needs to Change

### Option A: Expand Prisma Schema
Store more of what agent sends:

| Model | Current Fields | Add Fields |
|-------|---------------|------------|
| AssetHardware | 8 fields | +15 fields for full processor, memory, storage |
| AgentTelemetry | 5 fields | +20 fields for full metrics |
| Asset | 14 fields | +15 fields for owner, procurement, cost |

### Option B: Store Raw JSON + Transform
Keep minimal schema, store raw payloads:

```prisma
model AssetHardware {
    id         String  @id
    assetId    String  @unique
    // Summary fields for querying
    cpu        String?
    ramTotal   BigInt?
    // Raw agent payload for full data
    rawPayload Json?   // Store entire agent Hardware struct
}
```

### Option C: Hybrid Approach (Recommended)
1. Store frequently-queried fields in columns
2. Store full payload as JSON for detail views
3. API layer transforms for frontend consumption
