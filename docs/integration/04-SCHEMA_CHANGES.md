# Schema Changes - Phase 3 Implementation

This document describes all schema changes made to resolve the type mismatches identified in Phase 2.

**Migration Name:** `20260122_expand_user_asset_hardware_models`
**Status:** Created (NOT applied)
**Based On:** MISMATCH_DECISIONS.md

---

## Summary of Changes

| Model | Fields Added | Rationale |
|-------|--------------|-----------|
| User | 4 fields | firstName/lastName split, timezone, avatar |
| Asset | 24 fields | Owner, procurement, cost information |
| AssetHardware | 13 fields | Additional summaries + rawPayload JSON |
| AssetSoftware | 1 field | Category classification |
| AssetSoftwareInventory | 7 fields | NEW model for complete software inventory |
| AgentTelemetry | 5 fields | Network/process metrics + rawPayload JSON |

---

## 1. User Model Changes

**Decision:** Option A - Expand Schema (from MISMATCH_DECISIONS.md)

### Fields Added

| Field | Type | Default | Rationale |
|-------|------|---------|-----------|
| `firstName` | String? | null | Split from `name`, used in Users.tsx:391 |
| `lastName` | String? | null | Split from `name`, used in Users.tsx:391 |
| `timezone` | String? | 'UTC' | Used in CSV import (Users.tsx:343) and forms |
| `avatar` | String? | null | User profile image URL |

### Existing Field Changes

| Field | Change | Rationale |
|-------|--------|-----------|
| `name` | Renamed to `display_name` in DB | Backwards compatibility |

### Frontend Usage Evidence

```typescript
// settings/Users.tsx:391
{user.firstName} ${user.lastName}

// settings/Users.tsx:643-653
<Form.Item name="firstName">
<Form.Item name="lastName">

// settings/Users.tsx:738
<Select placeholder="Select Timezone">
```

---

## 2. Asset Model Changes

**Decision:** Option A + C Hybrid (from MISMATCH_DECISIONS.md)
- Option A: Store owner, procurement, cost fields in database
- Option C: Compute operationalStatus, performance from Agent/Telemetry

### Owner Information Fields

| Field | Type | Rationale |
|-------|------|-----------|
| `ownerId` | String? | Optional FK to User |
| `ownerName` | String? | Denormalized for display (AssetDetails.tsx:1999) |
| `ownerEmail` | String? | Denormalized for display (AssetDetails.tsx:2002) |
| `ownerPhone` | String? | Denormalized for display (AssetDetails.tsx:2005) |
| `ownerDepartment` | String? | Owner's department |

### Procurement Fields

| Field | Type | Rationale |
|-------|------|-----------|
| `vendor` | String? | Asset vendor |
| `purchaseOrderNumber` | String? | PO tracking |
| `amcCost` | String? | Annual Maintenance Contract cost (AssetDetails.tsx:2214) |
| `amcExpiryDate` | DateTime? | AMC expiration (AssetDetails.tsx:2218) |
| `amcVendor` | String? | AMC vendor (AssetDetails.tsx:2222) |
| `endOfLife` | DateTime? | End of life date (AssetDetails.tsx:2226) |
| `endOfSupport` | DateTime? | End of support date |

### Cost Fields

| Field | Type | Rationale |
|-------|------|-----------|
| `purchaseCost` | Decimal(12,2)? | Original cost (AssetDetails.tsx:2252) |
| `currentValue` | Decimal(12,2)? | Current value (AssetDetails.tsx:2260) |
| `salvageValue` | Decimal(12,2)? | Salvage value (AssetDetails.tsx:2276) |
| `currency` | String? | Default: USD (AssetDetails.tsx:2256) |
| `depreciationType` | String? | Depreciation method (AssetDetails.tsx:2264) |
| `depreciationRate` | Decimal(5,2)? | Annual depreciation rate |
| `invoiceNumber` | String? | Invoice reference (AssetDetails.tsx:2268) |

### Location Fields

| Field | Type | Rationale |
|-------|------|-----------|
| `hostname` | String? | Hostname from agent |
| `baseLocationId` | String? | Base/registered location |
| `installedLocationId` | String? | Current installed location |

### Index Added

```sql
CREATE INDEX "assets_owner_id_idx" ON "assets"("owner_id");
```

---

## 3. AssetHardware Model Changes

**Decision:** Option C - JSON + Summary Pattern (from MISMATCH_DECISIONS.md)

### Summary Fields Added (for querying)

| Field | Type | Rationale |
|-------|------|-----------|
| `cpuManufacturer` | String? | Intel, AMD, Apple |
| `cpuThreads` | Int? | Thread count |
| `cpuSpeedMHz` | Int? | Clock speed |
| `ramSlots` | Int? | Used memory slots |
| `ramType` | String? | DDR4, DDR5 |
| `diskType` | String? | SSD, HDD, NVMe |
| `gpuMemoryMB` | Int? | GPU memory |
| `biosVendor` | String? | BIOS manufacturer |
| `manufacturer` | String? | System manufacturer |
| `model` | String? | System model |
| `serialNumber` | String? | System serial |

### JSON Payload Field

| Field | Type | Rationale |
|-------|------|-----------|
| `rawPayload` | Json? | Complete agent Hardware struct (50+ fields) |
| `collectedAt` | DateTime? | When agent collected data |

### How It Works

1. **For List Views:** Use summary fields (cpu, cpuCores, ramTotal, etc.)
2. **For Detail Views:** Return rawPayload directly to frontend
3. **Fallback:** If no rawPayload, construct response from summary fields

```typescript
// In assets.transformer.ts
if (dbRecord.rawPayload) {
  return dbRecord.rawPayload as HardwareResponse;
}
// Fall back to summary fields...
```

---

## 4. AssetSoftware Model Changes

### Fields Added

| Field | Type | Rationale |
|-------|------|-----------|
| `category` | String? | Application category classification |

---

## 5. AssetSoftwareInventory Model (NEW)

**Rationale:** Frontend expects complete software inventory including OS info, services, and license details that don't fit the per-application AssetSoftware model.

### Fields

| Field | Type | Rationale |
|-------|------|-----------|
| `id` | String (PK) | Primary key |
| `assetId` | String (unique) | One inventory per asset |
| `osName` | String? | Operating system name |
| `osVersion` | String? | OS version |
| `osBuild` | String? | OS build number |
| `totalApps` | Int? | Application count |
| `totalServices` | Int? | Service count |
| `rawPayload` | Json? | Complete SoftwareInventory struct |
| `collectedAt` | DateTime? | Collection timestamp |

---

## 6. AgentTelemetry Model Changes

**Decision:** Expand summary fields + add rawPayload for full metrics

### Summary Fields Added

| Field | Type | Rationale |
|-------|------|-----------|
| `networkInBps` | BigInt? | Network bytes in/sec |
| `networkOutBps` | BigInt? | Network bytes out/sec |
| `processCount` | Int? | Running process count |
| `pendingReboot` | Boolean? | System needs reboot |

### JSON Payload Field

| Field | Type | Rationale |
|-------|------|-----------|
| `rawPayload` | Json? | Complete Telemetry struct (30+ metrics) |

---

## Files Changed

### Prisma Schema
- `backend/src/db/prisma/schema.prisma`

### Migration
- `backend/src/db/prisma/migrations/20260122_expand_user_asset_hardware_models/migration.sql`

### Shared Types
- `shared/types/models.ts`
  - Updated: User, Asset, AssetHardware, AssetSoftware, AgentTelemetry
  - Added: AssetSoftwareInventory

### Transformation Layer
- `backend/src/modules/assets/assets.transformer.ts` (NEW)
  - `transformHardwareForAPI()` - Hardware DB → API
  - `transformAssetForAPI()` - Asset DB → API (with computed fields)
  - `transformTelemetryForAPI()` - Telemetry DB → API
  - Helper functions for formatting

---

## Migration Instructions

### To Apply Migration

```bash
cd backend
npx prisma migrate dev --schema=src/db/prisma/schema.prisma
```

### To Apply Without Running (Production)

```bash
cd backend
npx prisma migrate deploy --schema=src/db/prisma/schema.prisma
```

### To Generate Prisma Client

```bash
cd backend
npx prisma generate --schema=src/db/prisma/schema.prisma
```

---

## Rollback Instructions

The migration SQL includes commented rollback instructions at the bottom. To rollback:

1. Create a new migration with the rollback SQL
2. Or manually execute the DROP/ALTER statements from the migration file

**Key Rollback Steps:**
```sql
-- User: Remove new fields, rename display_name back to name
ALTER TABLE "users" DROP COLUMN "first_name";
ALTER TABLE "users" DROP COLUMN "last_name";
ALTER TABLE "users" DROP COLUMN "timezone";
ALTER TABLE "users" DROP COLUMN "avatar";
ALTER TABLE "users" RENAME COLUMN "display_name" TO "name";

-- Asset: Drop all new columns
-- AssetHardware: Drop all new columns
-- AssetSoftware: Drop category column
-- Drop AssetSoftwareInventory table
-- AgentTelemetry: Drop all new columns
```

See full rollback SQL in the migration file.

---

## Verification Checklist

After applying migration:

- [ ] `npx prisma validate` passes
- [ ] `npx prisma generate` completes
- [ ] Backend compiles without type errors
- [ ] Existing API endpoints still work
- [ ] New fields are nullable (no data migration needed)

---

## Next Steps (Phase 4)

1. **Backend Services:** Update services to use new fields and transformers
2. **Agent Processing:** Store rawPayload when processing hardware/telemetry reports
3. **API Endpoints:** Use transformation functions in controllers
4. **Frontend:** Update MSW handlers to use real API (currently uses mocks)

---

## References

- [MISMATCH_DECISIONS.md](./MISMATCH_DECISIONS.md) - Field-by-field decisions
- [DATA_FLOW_MAP.md](./DATA_FLOW_MAP.md) - Agent → Backend → Frontend flow
- [assets.transformer.ts](./backend/src/modules/assets/assets.transformer.ts) - Transformation implementations
