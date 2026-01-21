# Hardware Data Pipeline Diagnosis

## Summary

**ROOT CAUSE IDENTIFIED**: The `transformHardwareForAPI` function returns `rawPayload` directly without transforming field names, but the subsequent `getAssetHardware` function expects transformed field names. This causes all hardware data to show "N/A".

## Step 1: Agent Collection

### Go Struct (models/hardware.go)

```go
type Hardware struct {
    CollectedAt      string           `json:"collectedAt"`
    SystemIdentity   SystemIdentity   `json:"systemIdentity"`
    BIOS             BIOS             `json:"bios"`
    Processor        Processor        `json:"processor"`
    Memory           Memory           `json:"memory"`
    StorageDrives    []StorageDrive   `json:"storageDrives"`     // ← NOTE: "storageDrives"
    Battery          *Battery         `json:"battery,omitempty"`
    GraphicsAdapters []GraphicsAdapter `json:"graphicsAdapters"` // ← NOTE: "graphicsAdapters"
}
```

### JSON Output When Serialized

```json
{
  "collectedAt": "2024-01-22T10:00:00Z",
  "systemIdentity": {
    "manufacturer": "Apple Inc.",
    "model": "MacBook Pro",
    "serialNumber": "ABC123",
    "uuid": "xxx-xxx-xxx"
  },
  "bios": {
    "vendor": "Apple Inc.",
    "version": "429.140.8.0.0",
    "firmwareType": "UEFI",
    "secureBootEnabled": false
  },
  "processor": {
    "name": "Apple M1 Pro",
    "manufacturer": "Apple",
    "architecture": "arm64",
    "coreCount": 10,
    "threadCount": 10,
    "clockSpeedMHz": 0
  },
  "memory": {
    "totalPhysicalGB": 16.0,
    "usedSlots": 2,
    "modules": [
      { "slot": "Slot 1", "capacityGB": 8.0, "type": "DDR4", "speedMHz": 3200 }
    ]
  },
  "storageDrives": [
    {
      "name": "Macintosh HD",
      "type": "SSD",
      "capacityGB": 460.43,
      "freeSpaceGB": 234.56,
      "fileSystem": "APFS"
    }
  ],
  "graphicsAdapters": [
    { "name": "Apple M1 Pro", "manufacturer": "Apple", "memoryMB": 0 }
  ]
}
```

## Step 2: Agent → Backend HTTP

### Endpoint
`POST /api/agent/inventory`

### Headers
- `Content-Type: application/json`
- `X-Agent-Id: <agent-uuid>`
- `Authorization: Bearer <token>`

### Payload Structure

```json
{
  "collectedAt": "2024-01-22T10:00:00Z",
  "hardware": { /* Hardware struct above */ },
  "software": { /* Software data */ },
  "network": { /* Network data */ },
  "security": { /* Security data */ }
}
```

### Transformations Before Sending
None - the Go agent sends the structs directly via JSON marshaling.

## Step 3: Backend Processing

### Service Method
`agents.service.ts:processInventory()` (line 450)

### Extracts Fields

| Field | Path in Payload |
|-------|-----------------|
| cpuModel | `inventory.hardware.processor.name` |
| cpuCores | `inventory.hardware.processor.coreCount` |
| ramTotalGB | `inventory.hardware.memory.totalPhysicalGB` |
| biosVendor | `inventory.hardware.bios.vendor` |
| manufacturer | `inventory.hardware.systemIdentity.manufacturer` |

### Stores rawPayload
**YES** - Line 618: `rawPayload: hw as Prisma.InputJsonValue`

The backend correctly:
1. Extracts summary fields for indexed queries
2. Stores the full hardware payload in `rawPayload`

## Step 4: Database Storage

### AssetHardware Record

| Column | Populated | Source |
|--------|-----------|--------|
| cpu | YES | `processor.name` |
| cpuCores | YES | `processor.coreCount` |
| ramTotal | YES | `memory.totalPhysicalGB` (converted to bytes) |
| rawPayload | YES | Full hardware JSON from agent |
| collectedAt | YES | Current timestamp |

## Step 5: API Response

### Endpoint
`GET /v1/assets/:id/hardware`

### Flow
1. `assets.service.ts:getAssetHardware()` fetches `AssetHardware`
2. Calls `transformHardwareForAPI(hw)`
3. **PROBLEM**: `transformHardwareForAPI` returns `rawPayload` directly:

```typescript
// assets.transformer.ts line 169
if (dbRecord.rawPayload) {
  return dbRecord.rawPayload as unknown as HardwareResponse;
}
```

4. **PROBLEM**: Then `getAssetHardware` tries to access fields that don't exist:

```typescript
// assets.service.ts line 938-966
storage: transformed.storage?.map(...)  // ❌ rawPayload has "storageDrives" not "storage"
memory: transformed.memory?.modules?.map(m => ({
  slot: m.slot,
  capacity: m.capacity,  // ❌ rawPayload has "capacityGB" not "capacity"
}))
```

### Actual Response Structure (due to bugs)

```json
{
  "bios": { "name": "Apple Inc.", "biosVersion": "429.140.8.0.0" },
  "processor": { "name": "Apple M1 Pro", "numberOfCores": 10 },
  "storage": [],      // ← EMPTY because transformed.storage is undefined
  "memory": [],       // ← EMPTY because mapping fails
  "networkAdapters": []
}
```

## Step 6: Frontend Display

### Expects (types/asset.types.ts `Hardware` type)

```typescript
Hardware = {
  bios: {
    name: string;         // ← Expects this
    installDate: string;  // ← Backend doesn't provide
    biosVersion: string;
    manufacturer: string;
    description: string;  // ← Backend doesn't provide
    secureBootState: string; // ← Backend doesn't provide
    serialNumber: string; // ← Backend doesn't provide
  };
  processor: {
    name: string;
    logicalProcessors: number;
    manufacturer: string;
    numberOfCores: number;
    processorSpeed: string;
    secureBootState: string; // ← Backend doesn't provide
  };
  storage: Array<{
    name: string;
    drive: string;      // ← Backend provides "name" not "drive"
    capacity: string;
    used: string;
    format: string;     // ← Backend doesn't provide
    type: string;
    serialNumber: string; // ← Backend doesn't provide
  }>;
  memory: Array<{
    slot: string;
    name: string;       // ← Backend doesn't provide
    capacity: string;
    bankLabel: string;  // ← Backend doesn't provide
    locator: string;    // ← Backend doesn't provide
    memoryType: string;
    serialNumber: string; // ← Backend doesn't provide
    partNumber: string;  // ← Backend doesn't provide
  }>;
};
```

### Renders "N/A" because

1. `storage` array is empty (undefined → [])
2. `memory` array is empty or has wrong field names
3. Frontend uses `hardware.storage[].drive` but backend sends `hardware.storage[].name`
4. Frontend uses `hardware.memory[].capacity` (string) but agent sends `capacityGB` (number)

## ROOT CAUSE

**Three interconnected issues:**

### Issue 1: Transformer doesn't transform
`transformHardwareForAPI()` casts `rawPayload` directly without transforming field names:
- rawPayload has `storageDrives` → HardwareResponse expects `storage`
- rawPayload has `graphicsAdapters` → HardwareResponse expects `graphicsCards`

### Issue 2: getAssetHardware assumes wrong field names
After the cast, `getAssetHardware` tries to access `transformed.storage` which is `undefined`.

### Issue 3: Memory module format mismatch
- Agent sends: `{ capacityGB: 8.0, type: "DDR4" }`
- Frontend expects: `{ capacity: "8 GB", memoryType: "DDR4" }`

## The Fix Applied

Updated `assets.service.ts:getAssetHardware()` to handle BOTH the transformed field names AND the raw agent field names:

### Key Changes

1. **Access raw payload directly** to get agent field names:
```typescript
const raw = transformed as any;
const storageDrives = raw.storageDrives || transformed.storage || [];
const memoryModules = raw.memory?.modules || [];
const graphicsAdapters = raw.graphicsAdapters || transformed.graphicsCards || [];
```

2. **Map storage fields correctly**:
```typescript
storage: storageDrives.map((s) => ({
  name: s.name,
  drive: s.mountPoint || s.deviceId || s.name,  // ← NEW: Frontend expects "drive"
  capacity: s.capacityGB ? `${Math.round(s.capacityGB)} GB` : undefined,
  used: s.capacityGB && s.freeSpaceGB !== undefined
    ? `${Math.round(s.capacityGB - s.freeSpaceGB)} GB`
    : undefined,
  format: s.fileSystem || undefined,  // ← NEW: Map fileSystem to format
  type: s.type,
  serialNumber: s.serialNumber,
}))
```

3. **Handle memory module format conversion**:
```typescript
memory: memoryModules.map((m) => ({
  slot: m.slot,
  name: m.manufacturer || 'Memory Module',
  // Handle both string "capacity" and number "capacityGB"
  capacity: typeof m.capacity === 'string'
    ? m.capacity
    : (m.capacityGB ? `${Math.round(m.capacityGB)} GB` : undefined),
  bankLabel: m.bankLabel,
  locator: m.slot,
  memoryType: m.type || m.memoryType,
  serialNumber: m.serialNumber,
  partNumber: m.partNumber,
}))
```

4. **Added missing BIOS fields**:
```typescript
bios: {
  name: biosInfo.vendor,
  biosVersion: biosInfo.version,
  manufacturer: biosInfo.vendor,
  installDate: biosInfo.releaseDate,  // ← NEW
  description: biosInfo.firmwareType,  // ← NEW
  secureBootState: biosInfo.secureBootEnabled ? 'Enabled' : 'Disabled',  // ← NEW
  serialNumber: systemIdentity?.serialNumber,  // ← NEW
}
```

5. **Added baseBoard from systemIdentity**:
```typescript
baseBoard: {
  name: systemIdentity.model,
  partNumber: systemIdentity.sku,
  productId: systemIdentity.uuid,
  serialNumber: systemIdentity.serialNumber,
  tag: systemIdentity.assetTag,
}
```

6. **Added battery info mapping**:
```typescript
battery: batteryInfo ? {
  id: 'battery-0',
  name: batteryInfo.name || 'Battery',
  health: `${Math.round(batteryInfo.healthPercent)}%`,
  cycleCount: batteryInfo.cycleCount,
  chargeLevel: batteryInfo.chargeLevel,
  chargingStatus: batteryInfo.chargingStatus,
  batteryCapacity: batteryInfo.designCapacityWh ? `${batteryInfo.designCapacityWh} Wh` : undefined,
  estimatedRuntime: batteryInfo.estimatedRuntimeMinutes ? `${batteryInfo.estimatedRuntimeMinutes} min` : undefined,
  temperature: batteryInfo.temperature ? `${batteryInfo.temperature}°C` : undefined,
} : undefined
```

7. **Added graphics cards mapping**:
```typescript
graphicsCards: graphicsAdapters.map((g) => ({
  name: g.name,
  manufacturer: g.manufacturer,
  driverVersion: g.driverVersion,
  videoMemoryMB: g.memoryMB,
  currentResolution: g.resolution,
}))
```

### Files Changed

1. `backend/src/modules/assets/assets.service.ts` - Updated `getAssetHardware()` function
2. `backend/src/modules/assets/assets.types.ts` - Added `GraphicsCardInfo` interface and expanded `BatteryInfo`

## Verification Checklist

- [x] Documented Go agent hardware struct completely
- [x] Documented JSON structure agent sends to backend
- [x] Found backend endpoint that receives hardware data (`/api/agent/inventory`)
- [x] Backend stores rawPayload correctly (verified in agents.service.ts)
- [x] Identified ROOT CAUSE: Field name mismatch in transformer
- [x] Applied fix to `getAssetHardware()` to handle both formats
- [x] Verified hardware data displays in frontend

## Final Verification (2026-01-22)

### Database State Verified
```
Total assets: 1
Total agents: 1
Total AssetHardware records: 1
AssetHardware records with rawPayload: 1

rawPayload keys: [bios, memory, battery, processor, collectedAt, storageDrives, systemIdentity, graphicsAdapters]
```

### API Response Verified
```json
GET /v1/assets/71e29481-89cd-4eda-adc9-1f04354d2e44/hardware

{
  "bios": { "name": "Apple Inc.", "biosVersion": "15.1", "manufacturer": "Apple Inc.", "description": "UEFI", "secureBootState": "Disabled", "serialNumber": "G1CVJW3R6K" },
  "processor": { "name": "Apple M4", "manufacturer": "Apple", "numberOfCores": 10, "logicalProcessors": 10, "processorSpeed": "4000 MHz" },
  "baseBoard": { "name": "MacBook Air", "productId": "C54BEEFB-3001-59B3-AD95-213FFD910011", "serialNumber": "G1CVJW3R6K" },
  "storage": [{ "name": "Macintosh HD", "drive": "/", "capacity": "460 GB", "used": "101 GB", "format": "APFS", "type": "SSD" }],
  "memory": [{ "slot": "Onboard", "name": "Memory Module", "capacity": "16 GB", "locator": "Onboard", "memoryType": "LPDDR5" }],
  "battery": { "id": "battery-0", "name": "Battery", "health": "100%", "cycleCount": 41, "chargeLevel": 56, "chargingStatus": "Discharging", "batteryCapacity": "58 Wh" },
  "graphicsCards": [{ "name": "Apple M4 GPU", "manufacturer": "Apple" }]
}
```

### Frontend Display Verified
Screenshot saved: `.playwright-mcp/hardware-data-working.png`

All hardware data is displaying correctly:
- BIOS Information: Version 15.1, Manufacturer Apple Inc., UEFI, Secure Boot Disabled
- Processor: Apple M4, 10 cores, 10 threads, 4000 MHz
- Baseboard: MacBook Air, Serial G1CVJW3R6K
- Storage: 1 Partition - 460 GB SSD (APFS), 101 GB used
- Memory: 1 Slot - 16 GB LPDDR5 (Onboard)

## CONCLUSION

**STATUS: WORKING**

The hardware data pipeline is fully functional. Data flows correctly from:
1. Database (rawPayload with agent hardware data)
2. Backend API (transforms and returns correctly formatted response)
3. Frontend display (renders all hardware sections with actual data)
