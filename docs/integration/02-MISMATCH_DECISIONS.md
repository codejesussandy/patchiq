# Critical Type Mismatch Decisions

This document provides field-by-field analysis of the 3 critical mismatches, with evidence of actual component usage and recommended resolutions.

---

## 1. User Model Mismatch

### Current State

**Prisma User Model** (`backend/src/db/prisma/schema.prisma:17-44`):
```prisma
model User {
    id            String    @id @default(uuid())
    email         String    @unique
    passwordHash  String
    name          String?              // SINGLE field
    contactNumber String?              // Not "phone"
    role          String    @default("user")
    isActive      Boolean   @default(true)
    isOnboarded   Boolean   @default(false)
    lastLoginAt   DateTime?            // Not "lastLogin"
    deletedAt     DateTime?
    createdAt     DateTime
    updatedAt     DateTime
    organizationId String?
    departmentId   String?
    locationId     String?
}
```

**Frontend User Type** (`frontend/src/types/user.types.ts:2-43`):
```typescript
export type User = {
    id: string;
    email: string;
    username?: string;          // NOT IN PRISMA
    firstName: string;          // Prisma has "name" (single)
    lastName: string;           // Prisma has "name" (single)
    role: string;
    avatar?: string;            // NOT IN PRISMA
    phone?: string;             // Prisma: "contactNumber"
    gender?: 'Male' | 'Female' | 'Others';  // NOT IN PRISMA
    timezone?: string;          // NOT IN PRISMA
    branch?: string;            // NOT IN PRISMA
    orgUnit?: string;           // NOT IN PRISMA
    dashboard?: string;         // NOT IN PRISMA
    status?: string;            // NOT IN PRISMA (has isActive)
    lastLogin?: string;         // Prisma: lastLoginAt
    // ... more fields
};
```

### Frontend Usage Analysis

| Field | Used in Component? | File:Line | How Used |
|-------|-------------------|-----------|----------|
| `firstName` | **YES** | `settings/Users.tsx:391` | Rendered in name column: `{user.firstName} ${user.lastName}` |
| `lastName` | **YES** | `settings/Users.tsx:391` | Rendered in name column |
| `firstName` | **YES** | `settings/Users.tsx:410-414` | Table column sorter |
| `firstName` | **YES** | `settings/Users.tsx:501` | Search filter |
| `firstName` | **YES** | `settings/Users.tsx:643` | Form field `name="firstName"` |
| `lastName` | **YES** | `settings/Users.tsx:653` | Form field `name="lastName"` |
| `firstName` | **YES** | `components/AvatarWithInitials.tsx:44` | Generate initials |
| `avatar` | **YES** | `settings/Users.tsx:215` | Assigned from upload |
| `avatar` | **NO** | - | Never rendered (only stored) |
| `timezone` | **YES** | `settings/Users.tsx:343,738` | CSV import + form field |
| `phone` | **YES** | `settings/Users.tsx:437-439` | Table column rendering |
| `gender` | **NO** | - | Typed but never rendered |
| `branch` | **NO** | - | Typed but never rendered in Users.tsx |
| `orgUnit` | **NO** | - | Typed but never rendered |
| `dashboard` | **NO** | - | Typed but never rendered |
| `username` | **YES** | `settings/Users.tsx:300` | CSV import header |
| `status` | **NO** | - | Not rendered in Users table |

### Decision: **Option A - Expand Prisma Schema**

**Reasoning:**
1. `firstName` and `lastName` are actively rendered in the Users management page
2. `timezone` is used in CSV import and forms
3. `phone` is rendered in table (maps to Prisma `contactNumber`)
4. While `gender`, `branch`, `orgUnit`, `dashboard` are typed, they are NOT currently rendered - but the form structure suggests they will be used

**Action Items:**

- [ ] **schema.prisma:17-44** - Modify User model:
  ```prisma
  model User {
      id            String    @id @default(uuid())
      email         String    @unique
      passwordHash  String
      firstName     String?   @map("first_name")    // Split name
      lastName      String?   @map("last_name")     // Split name
      name          String?   @map("display_name")  // Keep for backwards compat
      contactNumber String?   @map("contact_number")
      phone         String?   // Alias for frontend
      timezone      String?   // ADD
      avatar        String?   // ADD (URL or path)
      role          String    @default("user")
      isActive      Boolean   @default(true)
      // ...rest unchanged
  }
  ```

- [ ] **Remove dead code** - Consider removing from `user.types.ts`:
  - `gender` - Not rendered anywhere
  - `branch` - Not rendered (use organization/department relations)
  - `orgUnit` - Not rendered
  - `dashboard` - Not rendered

---

## 2. Asset Model Mismatch

### Current State

**Prisma Asset Model** (`backend/src/db/prisma/schema.prisma:279-313`):
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
    // Relations to separate models
    hardware       AssetHardware?
    software       AssetSoftware[]
    security       AssetSecurity?
}
```

**Frontend Asset Type** (`frontend/src/types/asset.types.ts:182-244`):
```typescript
export type Asset = {
    id: string;
    name: string;
    assetId: string;                      // NOT IN PRISMA
    operationalStatus: OperationalStatus;  // NOT IN PRISMA (from Agent)
    operationalStatusSince: string;        // NOT IN PRISMA (computed)
    operationalStatusDuration: string;     // NOT IN PRISMA (computed)
    owner: Owner;                          // NOT IN PRISMA (nested object)
    processor: Processor;                  // NOT IN PRISMA (from hardware)
    ram: RAM;                              // NOT IN PRISMA (from hardware)
    storage: Storage;                      // NOT IN PRISMA (from hardware)
    performance: Performance;              // NOT IN PRISMA (from telemetry)
    location: { base: Location; installed: Location };  // Different structure
    procurement: Procurement;              // NOT IN PRISMA at all (7 fields)
    cost: Cost;                            // NOT IN PRISMA at all (8 fields)
    // ...more fields
};
```

### Frontend Usage Analysis

| Field | Used in Component? | File:Line | How Used |
|-------|-------------------|-----------|----------|
| `id` | **YES** | `AllAssets.tsx:148-149` | Row navigation |
| `name` | **YES** | `AllAssets.tsx:318` | Search filter, display |
| `assetId` | **YES** | `AllAssets.tsx:46,319` | Column display "ASSET0029" |
| `operationalStatus` | **YES** | `AllAssets.tsx:372-382` | Tag color (Connected/Disconnected) |
| `operationalStatusSince` | **YES** | `AllAssets.tsx:52` | Column display |
| `operationalStatusDuration` | **YES** | `AllAssets.tsx:53` | Column display |
| `hostname` | **YES** | `AllAssets.tsx:362-368` | Network identity column |
| `ipAddress` | **YES** | `AllAssets.tsx:362-368` | Network identity column |
| `categoryId` | **YES** | `AllAssets.tsx:404` | Category assignment |
| `owner.name` | **YES** | `AssetDetails.tsx:1999` | Owner section display |
| `owner.email` | **YES** | `AssetDetails.tsx:2002` | Owner section display |
| `owner.phone` | **YES** | `AssetDetails.tsx:2005` | Owner section display |
| `procurement.amcCost` | **YES** | `AssetDetails.tsx:2214` | Procurement section |
| `procurement.amcExpiryDate` | **YES** | `AssetDetails.tsx:2218` | Procurement section |
| `procurement.amcVendor` | **YES** | `AssetDetails.tsx:2222` | Procurement section |
| `procurement.endOfLife` | **YES** | `AssetDetails.tsx:2226` | Procurement section |
| `procurement.expiryDate` | **YES** | `AssetDetails.tsx:2230` | Procurement section |
| `procurement.warrantyExpiryDate` | **YES** | `AssetDetails.tsx:2234` | Procurement section |
| `procurement.warrantyYearAndMonth` | **YES** | `AssetDetails.tsx:2238` | Procurement section |
| `cost.age` | **YES** | `AssetDetails.tsx:2248` | Cost section |
| `cost.cost` | **YES** | `AssetDetails.tsx:2252` | Cost section |
| `cost.currency` | **YES** | `AssetDetails.tsx:2256` | Cost section |
| `cost.currentCost` | **YES** | `AssetDetails.tsx:2260` | Cost section |
| `cost.depreciationType` | **YES** | `AssetDetails.tsx:2264` | Cost section |
| `cost.invoiceNumber` | **YES** | `AssetDetails.tsx:2268` | Cost section |
| `cost.purchaseDate` | **YES** | `AssetDetails.tsx:2272` | Cost section |
| `cost.salvageValue` | **YES** | `AssetDetails.tsx:2276` | Cost section |

### Decision: **Option A + Option C (Hybrid)**

**Reasoning:**
1. `owner`, `procurement`, `cost` fields are actively rendered in AssetDetails.tsx
2. These are business/financial data that SHOULD be stored in the database
3. `operationalStatus*` fields are computed from Agent - use Option C (API transform)
4. `processor`, `ram`, `storage`, `performance` come from other tables - use Option C (API aggregate)

**Action Items:**

#### Part 1: Expand Prisma Schema (Option A)

- [ ] **schema.prisma:279-313** - Add missing fields to Asset:
  ```prisma
  model Asset {
      // ... existing fields ...

      // Owner information (denormalized for display)
      ownerName      String?   @map("owner_name")
      ownerEmail     String?   @map("owner_email")
      ownerPhone     String?   @map("owner_phone")
      ownerId        String?   @map("owner_id")  // Optional User FK

      // Procurement fields
      amcCost        String?   @map("amc_cost")
      amcExpiryDate  DateTime? @map("amc_expiry_date")
      amcVendor      String?   @map("amc_vendor")
      endOfLife      DateTime? @map("end_of_life")
      endOfSupport   DateTime? @map("end_of_support")

      // Cost fields
      purchaseCost       Decimal?  @map("purchase_cost") @db.Decimal(12,2)
      currentValue       Decimal?  @map("current_value") @db.Decimal(12,2)
      salvageValue       Decimal?  @map("salvage_value") @db.Decimal(12,2)
      currency           String?   @default("USD")
      depreciationType   String?   @map("depreciation_type")
      invoiceNumber      String?   @map("invoice_number")

      // Base and installed locations
      baseLocationId     String?   @map("base_location_id")
      installedLocationId String?  @map("installed_location_id")
  }
  ```

#### Part 2: API Transformation Layer (Option C)

- [ ] **backend/src/modules/assets/assets.service.ts** - Create AssetDetailResponse:
  ```typescript
  async getAssetDetail(id: string): Promise<AssetDetailResponse> {
      const asset = await this.prisma.asset.findUnique({
          include: { agent: true, hardware: true, location: true }
      });
      const telemetry = await this.getLatestTelemetry(asset.agent?.id);

      return {
          ...asset,
          assetId: asset.assetTag || `ASSET-${asset.id.slice(0,8)}`,
          operationalStatus: asset.agent?.status === 'Connected' ? 'Connected' : 'Disconnected',
          operationalStatusSince: asset.agent?.lastHeartbeat?.toISOString(),
          operationalStatusDuration: this.formatDuration(asset.agent?.lastHeartbeat),
          owner: {
              name: asset.ownerName,
              email: asset.ownerEmail,
              phone: asset.ownerPhone,
          },
          processor: {
              name: asset.hardware?.cpu,
              cores: asset.hardware?.cpuCores,
              speed: 'N/A',  // Not stored
          },
          ram: {
              size: this.formatBytes(asset.hardware?.ramTotal),
              type: 'Unknown',  // Not stored
          },
          storage: {
              size: this.formatBytes(asset.hardware?.diskTotal),
              type: 'Unknown',  // Not stored
          },
          performance: {
              cpuUtilization: telemetry?.cpuUsage || 0,
              memoryUtilization: telemetry?.memoryUsage || 0,
              diskUtilization: telemetry?.diskUsage || 0,
              systemUptime: this.formatUptime(telemetry?.uptime),
          },
          procurement: {
              amcCost: asset.amcCost,
              amcExpiryDate: asset.amcExpiryDate?.toISOString(),
              amcVendor: asset.amcVendor,
              endOfLife: asset.endOfLife?.toISOString(),
              expiryDate: asset.warrantyExpiry?.toISOString(),
              warrantyExpiryDate: asset.warrantyExpiry?.toISOString(),
              warrantyYearAndMonth: this.calculateWarrantyRemaining(asset.warrantyExpiry),
          },
          cost: {
              age: this.calculateAge(asset.purchaseDate),
              cost: asset.purchaseCost?.toString(),
              currency: asset.currency,
              currentCost: asset.currentValue?.toString(),
              depreciationType: asset.depreciationType,
              invoiceNumber: asset.invoiceNumber,
              purchaseDate: asset.purchaseDate?.toISOString(),
              salvageValue: asset.salvageValue?.toString(),
          },
      };
  }
  ```

---

## 3. Hardware Types Mismatch

### Current State

**Prisma AssetHardware Model** (`backend/src/db/prisma/schema.prisma:315-329`):
```prisma
model AssetHardware {
    id         String  @id @default(uuid())
    assetId    String  @unique
    cpu        String?           // Just name
    cpuCores   Int?              // Just count
    ramTotal   BigInt?           // Just bytes
    diskTotal  BigInt?           // Just bytes
    diskFree   BigInt?           // Just bytes
    gpuModel   String?           // Just name
    biosVersion String?          // Just version
    systemSKU  String?           // Just SKU
}
// Total: 8 data fields
```

**Agent Hardware Model** (`agent/internal/models/hardware.go`):
```go
type Hardware struct {
    CollectedAt      string
    SystemIdentity   SystemIdentity   // 6 fields
    BIOS             BIOS             // 6 fields
    Processor        Processor        // 9 fields
    Memory           Memory           // 4 fields + modules array
    StorageDrives    []StorageDrive   // Array, each with 10 fields + SMART
    Battery          *Battery         // 8 fields
    GraphicsAdapters []GraphicsAdapter // Array, each with 5 fields
}
// Total: ~50+ fields
```

**Frontend ExpandedHardware Type** (`frontend/src/types/asset.types.ts:519-529`):
```typescript
export type ExpandedHardware = {
    collectedAt: string;
    systemIdentity?: SystemIdentity;    // 6 fields
    bios?: ExpandedBIOS;                // 8 fields
    processor?: ExpandedProcessor;       // 11 fields
    memory?: ExpandedMemory;            // 8 fields + modules array
    storage?: ExpandedStorageDrive[];   // Array with partitions, SMART
    battery?: ExpandedBattery;          // 14 fields
    baseBoard?: BaseBoard;              // 6 fields
    graphicsCards?: GraphicsCard[];     // Array with 7 fields each
};
// Total: ~60+ fields (closely matches agent!)
```

### Frontend Usage Analysis

The Hardware tab in AssetDetails.tsx renders extensive hardware information. Based on the MSW mock at `asset.handlers.ts:353-486` and `1158-1343`:

| Category | Fields Rendered | Source |
|----------|----------------|--------|
| BIOS | name, installDate, biosVersion, manufacturer, description, secureBootState, serialNumber | `mockHardware.bios` |
| Processor | name, logicalProcessors, manufacturer, numberOfCores, processorSpeed, secureBootState | `mockHardware.processor` |
| BaseBoard | name, partNumber, productId, serialNumber, tag, version | `mockHardware.baseBoard` |
| Storage | Per-drive: name, drive, capacity, used, format, type, serialNumber | `mockHardware.storage[]` |
| Memory | Per-slot: slot, name, capacity, bankLabel, locator, memoryType, serialNumber, partNumber | `mockHardware.memory[]` |
| Network | Per-adapter: id, name, ipAddressV4, ipAddressV6, macAddress, dhcpServer | `mockHardware.networkAdapters[]` |
| Battery | name, health, cycleCount, chargeLevel, chargingStatus, batteryCapacity, estimatedRuntime, temperature | `mockHardware.battery` |

### Decision: **Option C - Store Raw JSON + Provide Indexed Summary**

**Reasoning:**
1. Agent sends 50+ fields of detailed hardware data
2. Prisma stores only 8 summary fields (enough for list views/queries)
3. Frontend expects full detailed data (matching agent output)
4. Storing all fields as columns would create a very wide table
5. Hardware data changes infrequently and is collected as a unit

**Action Items:**

- [ ] **schema.prisma:315-329** - Modify AssetHardware:
  ```prisma
  model AssetHardware {
      id              String   @id @default(uuid())
      assetId         String   @unique
      asset           Asset    @relation(...)

      // Summary fields for querying/display in lists
      cpu             String?
      cpuCores        Int?
      cpuManufacturer String?  @map("cpu_manufacturer")  // ADD
      ramTotal        BigInt?
      ramSlots        Int?     @map("ram_slots")         // ADD
      diskTotal       BigInt?
      diskFree        BigInt?
      gpuModel        String?
      biosVendor      String?  @map("bios_vendor")       // ADD
      biosVersion     String?
      systemSKU       String?
      manufacturer    String?  // ADD (system manufacturer)
      model           String?  // ADD (system model)
      serialNumber    String?  // ADD (system serial)

      // Full hardware payload from agent
      rawPayload      Json?    @map("raw_payload")       // ADD - stores full Hardware struct
      collectedAt     DateTime? @map("collected_at")     // ADD

      @@map("asset_hardware")
  }
  ```

- [ ] **backend/src/modules/assets/assets.service.ts** - Hardware endpoint:
  ```typescript
  async getAssetHardware(assetId: string): Promise<ExpandedHardware> {
      const hw = await this.prisma.assetHardware.findUnique({
          where: { assetId }
      });

      if (!hw) return null;

      // If we have raw payload from agent, return it directly
      if (hw.rawPayload) {
          return hw.rawPayload as ExpandedHardware;
      }

      // Fall back to constructing from summary fields
      return {
          collectedAt: hw.collectedAt?.toISOString() || new Date().toISOString(),
          systemIdentity: {
              manufacturer: hw.manufacturer || 'Unknown',
              model: hw.model || 'Unknown',
              serialNumber: hw.serialNumber || 'Unknown',
              uuid: '',
              sku: hw.systemSKU,
          },
          processor: {
              name: hw.cpu || 'Unknown',
              manufacturer: hw.cpuManufacturer || 'Unknown',
              architecture: 'x64',
              coreCount: hw.cpuCores || 0,
              threadCount: hw.cpuCores || 0,
              clockSpeedMHz: 0,
          },
          memory: {
              totalPhysicalGB: Number(hw.ramTotal || 0) / (1024**3),
              usedSlots: hw.ramSlots || 0,
              modules: [],
          },
          storage: [{
              name: 'Primary Storage',
              type: 'Unknown',
              capacityGB: Number(hw.diskTotal || 0) / (1024**3),
              freeSpaceGB: Number(hw.diskFree || 0) / (1024**3),
          }],
          bios: {
              vendor: hw.biosVendor || 'Unknown',
              version: hw.biosVersion || 'Unknown',
          },
          graphicsCards: hw.gpuModel ? [{
              name: hw.gpuModel,
          }] : [],
      };
  }
  ```

- [ ] **backend/src/modules/agents/agents.service.ts** - Store raw hardware:
  ```typescript
  async processHardwareReport(agentId: string, hardware: Hardware) {
      const agent = await this.prisma.agent.findUnique({
          where: { id: agentId },
          include: { asset: true }
      });

      if (!agent?.assetId) return;

      await this.prisma.assetHardware.upsert({
          where: { assetId: agent.assetId },
          create: {
              assetId: agent.assetId,
              // Summary fields for queries
              cpu: hardware.processor?.name,
              cpuCores: hardware.processor?.coreCount,
              cpuManufacturer: hardware.processor?.manufacturer,
              ramTotal: BigInt(hardware.memory?.totalPhysicalGB * 1024**3 || 0),
              ramSlots: hardware.memory?.usedSlots,
              diskTotal: BigInt(hardware.storageDrives?.reduce((t, d) => t + d.capacityGB, 0) * 1024**3 || 0),
              diskFree: BigInt(hardware.storageDrives?.reduce((t, d) => t + d.freeSpaceGB, 0) * 1024**3 || 0),
              gpuModel: hardware.graphicsAdapters?.[0]?.name,
              biosVendor: hardware.bios?.vendor,
              biosVersion: hardware.bios?.version,
              manufacturer: hardware.systemIdentity?.manufacturer,
              model: hardware.systemIdentity?.model,
              serialNumber: hardware.systemIdentity?.serialNumber,
              systemSKU: hardware.systemIdentity?.sku,
              // Full payload
              rawPayload: hardware,
              collectedAt: new Date(),
          },
          update: {
              // Same fields...
              rawPayload: hardware,
              collectedAt: new Date(),
          },
      });
  }
  ```

---

## Summary of Decisions

| Mismatch | Decision | Rationale |
|----------|----------|-----------|
| **User Model** | Option A: Expand Schema | `firstName`, `lastName`, `timezone` are actively rendered |
| **Asset Model** | Option A + C: Hybrid | Procurement/cost are business data (store); operational status is computed (transform) |
| **Hardware Types** | Option C: Raw JSON + Summary | Agent sends rich data, store full payload + indexed summaries |

## Dead Code to Remove

These fields exist in frontend types but are **never rendered in any component**:

### User Type
- `gender` - Typed but not rendered
- `branch` - Typed but not rendered (use organization relations)
- `orgUnit` - Typed but not rendered
- `dashboard` - Typed but not rendered

### Asset Type
- None identified - all typed fields appear to be used

### Tag Type
- `owner`, `manager`, `budget`, `complianceRequired`, `complianceTags` - Typed but likely not rendered (need to verify)

---

## Schema Changes Summary

### schema.prisma modifications needed:

```prisma
// User model changes
model User {
    // CHANGE: Split name into firstName/lastName
    firstName     String?   @map("first_name")
    lastName      String?   @map("last_name")
    name          String?   @map("display_name")  // Keep for compat
    // ADD:
    timezone      String?
    avatar        String?
}

// Asset model changes
model Asset {
    // ADD: Owner fields
    ownerName      String?
    ownerEmail     String?
    ownerPhone     String?
    ownerId        String?
    // ADD: Procurement fields
    amcCost        String?
    amcExpiryDate  DateTime?
    amcVendor      String?
    endOfLife      DateTime?
    endOfSupport   DateTime?
    // ADD: Cost fields
    purchaseCost       Decimal?  @db.Decimal(12,2)
    currentValue       Decimal?  @db.Decimal(12,2)
    salvageValue       Decimal?  @db.Decimal(12,2)
    currency           String?
    depreciationType   String?
    invoiceNumber      String?
    // ADD: Dual location
    baseLocationId     String?
    installedLocationId String?
}

// AssetHardware model changes
model AssetHardware {
    // ADD: More summary fields
    cpuManufacturer String?
    ramSlots        Int?
    biosVendor      String?
    manufacturer    String?
    model           String?
    serialNumber    String?
    // ADD: Raw payload storage
    rawPayload      Json?
    collectedAt     DateTime?
}
```

---

## Verification Checklist

After implementation, verify:

- [ ] Users page displays `firstName lastName` correctly
- [ ] Users CSV import handles `timezone` field
- [ ] Asset list shows `operationalStatus` with correct color
- [ ] Asset details shows Owner section with name/email/phone
- [ ] Asset details shows Procurement section with all 7 fields
- [ ] Asset details shows Cost section with all 8 fields
- [ ] Hardware tab shows full BIOS, Processor, Memory, Storage details
- [ ] Agent hardware reports are stored and retrievable
- [ ] Dead code fields removed without breaking components
