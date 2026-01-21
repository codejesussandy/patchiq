# Backend Integration Documentation

## Overview

This document describes the backend integration completed for Phase 3/3.5, including migration application, transformer implementation, and service wiring.

## Migration Applied

**Migration Name:** `20260121200659_expand_user_asset_hardware_models`

The migration added:

### User Model
- `firstName`, `lastName` - Split from `name` field
- `contactNumber` - Phone number
- `timezone` - User timezone preference

### Asset Model
- Owner fields: `ownerId`, `ownerName`, `ownerEmail`, `ownerPhone`, `ownerDepartment`
- Procurement fields: `vendor`, `purchaseOrderNumber`, `amcCost`, `amcExpiryDate`, `amcVendor`, `endOfLife`, `endOfSupport`
- Cost fields: `purchaseCost`, `currentValue`, `salvageValue`, `currency`, `depreciationType`, `depreciationRate`, `invoiceNumber`
- Location fields: `baseLocationId`, `installedLocationId`

### AssetHardware Model
- Summary fields: `cpu`, `cpuCores`, `cpuManufacturer`, `cpuThreads`, `cpuSpeedMHz`
- RAM fields: `ramTotal`, `ramSlots`, `ramType`
- Disk fields: `diskTotal`, `diskFree`, `diskType`
- GPU fields: `gpuModel`, `gpuMemoryMB`
- BIOS fields: `biosVendor`, `biosVersion`
- System fields: `systemSKU`, `manufacturer`, `model`, `serialNumber`
- **`rawPayload`** - Full JSON payload from agent for detailed views
- `collectedAt` - Timestamp of data collection

### AssetSoftwareInventory Model (New)
- Summary fields: `osName`, `osVersion`, `osBuild`, `totalApps`, `totalServices`
- **`rawPayload`** - Full JSON payload from agent
- `collectedAt` - Timestamp of data collection

### AgentTelemetry Model
- Network fields: `networkInBps`, `networkOutBps`
- System fields: `processCount`, `pendingReboot`
- **`rawPayload`** - Full JSON payload from agent

## Services Modified

### 1. `assets.service.ts`

Added import for transformers:
```typescript
import {
  transformHardwareForAPI,
  transformTelemetryForAPI,
} from './assets.transformer';
```

**Modified Functions:**

- `getAssetHardware()` - Now uses transformer to return `rawPayload` if available, otherwise constructs response from summary fields
- `getAssetTelemetry()` - Now uses transformer to return enriched telemetry data including network stats
- `getAssetTelemetryHistory()` - Now includes `networkIn` and `networkOut` data points

### 2. `agents.service.ts`

Added Prisma import for type casting:
```typescript
import { Prisma } from '@prisma/client';
```

**Modified Functions:**

- `processInventory()` - Now stores:
  - Full hardware payload in `rawPayload` field
  - Additional summary fields: `cpuManufacturer`, `cpuThreads`, `cpuSpeedMHz`, `ramSlots`, `ramType`, `diskType`, `gpuMemoryMB`, `biosVendor`
  - Software inventory in new `AssetSoftwareInventory` model with `rawPayload`

- `processTelemetry()` - Now stores:
  - Network bandwidth: `networkInBps`, `networkOutBps`
  - System info: `processCount`, `pendingReboot`
  - Full telemetry payload in `rawPayload` field

## Transformer Implementation

The transformer in `assets.transformer.ts` provides:

### `transformHardwareForAPI(hardware)`
- Returns expanded hardware object from `rawPayload` if available
- Includes: BIOS info, processor details, storage drives, memory modules
- Falls back to summary fields if no rawPayload

### `transformTelemetryForAPI(telemetry)`
- Returns enriched telemetry from `rawPayload` if available
- Includes: CPU usage/process count, memory usage, disk drives, network bandwidth
- Falls back to summary fields if no rawPayload

## API Response Format

### GET /v1/assets (List)
```json
{
  "data": [{
    "id": "uuid",
    "assetId": "SHORT_ID",
    "name": "hostname",
    "status": "In Use",
    "operationalStatus": "Connected",
    "osType": "Windows",
    "osVersion": "11",
    "memorySize": "16 GB",
    "diskSize": "512 GB",
    "systemSKU": "SKU123",
    "tags": []
  }],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### GET /v1/assets/:id/hardware
```json
{
  "bios": {
    "name": "BIOS Name",
    "biosVersion": "1.0.0",
    "manufacturer": "Vendor"
  },
  "processor": {
    "name": "Intel Core i7",
    "manufacturer": "Intel",
    "numberOfCores": 8,
    "logicalProcessors": 16,
    "processorSpeed": "3200 MHz"
  },
  "storage": [{
    "name": "Drive 1",
    "capacity": "512 GB",
    "used": "256 GB",
    "type": "SSD"
  }],
  "memory": [{
    "slot": "Slot 1",
    "capacity": "16 GB",
    "memoryType": "DDR4"
  }],
  "networkAdapters": []
}
```

### GET /v1/assets/:id/telemetry
```json
{
  "timestamp": "2026-01-21T20:17:39.000Z",
  "cpu": {
    "usagePercent": 18.13,
    "processCount": 150
  },
  "memory": {
    "usagePercent": 45.5
  },
  "disk": {
    "drives": [{
      "mountPoint": "C:",
      "usagePercent": 50.2
    }]
  },
  "network": {
    "totalBytesSentPerSec": 1024000,
    "totalBytesReceivedPerSec": 2048000
  },
  "systemUptime": 86400,
  "pendingReboot": false
}
```

## Data Flow

```
Agent → POST /v1/agents/inventory → processInventory()
                                  → stores rawPayload in AssetHardware
                                  → stores rawPayload in AssetSoftwareInventory
                                  → stores summary fields for querying

Agent → POST /v1/agents/telemetry → processTelemetry()
                                  → stores rawPayload in AgentTelemetry
                                  → stores summary fields for querying

Frontend → GET /v1/assets/:id/hardware → getAssetHardware()
                                       → transformHardwareForAPI()
                                       → returns rawPayload or summary

Frontend → GET /v1/assets/:id/telemetry → getAssetTelemetry()
                                        → transformTelemetryForAPI()
                                        → returns rawPayload or summary
```

## Testing

### Authentication
```bash
# Login to get token
curl -X POST "http://localhost:3000/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@patchiq.io","password":"admin123"}'
```

### Test Endpoints
```bash
# List assets
curl "http://localhost:3000/v1/assets" \
  -H "Authorization: Bearer <token>"

# Get asset details
curl "http://localhost:3000/v1/assets/<id>" \
  -H "Authorization: Bearer <token>"

# Get asset hardware
curl "http://localhost:3000/v1/assets/<id>/hardware" \
  -H "Authorization: Bearer <token>"

# Get asset telemetry
curl "http://localhost:3000/v1/assets/<id>/telemetry" \
  -H "Authorization: Bearer <token>"
```

## Verification Checklist

- [x] Migration applied successfully
- [x] Prisma client regenerated (types match schema)
- [x] Transformer functions implemented
- [x] Assets service uses transformer
- [x] Agents service stores rawPayload
- [x] Backend starts without errors
- [x] API endpoints return transformed data
- [x] Type checking passes (tsc --noEmit)

## Notes

- All `rawPayload` fields are stored as JSON (Prisma `Json?` type)
- Summary fields are maintained for efficient querying/filtering
- Transformers handle null/undefined gracefully
- Decimal fields are converted to strings for JSON serialization
- Existing API URLs unchanged - only response format enhanced
