# PatchIQ Type Mapping Document

## Overview

This document maps Prisma models to their TypeScript representations and identifies all discrepancies between the current frontend types and the Prisma schema (source of truth).

**Source of Truth:** `backend/src/db/prisma/schema.prisma`
**Generated Shared Types:** `shared/types/`
**Last Updated:** 2026-01-21

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Type Generation Strategy](#type-generation-strategy)
3. [Model Mapping Table](#model-mapping-table)
4. [Critical Mismatches](#critical-mismatches)
5. [Frontend Files Requiring Updates](#frontend-files-requiring-updates)
6. [Regeneration Instructions](#regeneration-instructions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Source of Truth                          │
│              backend/src/db/prisma/schema.prisma               │
│                    (63 models, 1362 lines)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Shared Types Package                         │
│                    shared/types/                                 │
│  ├── enums.ts     (All enum/union types)                        │
│  ├── models.ts    (Database model interfaces)                   │
│  ├── api.ts       (API request/response types)                  │
│  └── index.ts     (Barrel export)                               │
└──────────────┬─────────────────────────────┬────────────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────┐    ┌──────────────────────────────────┐
│       Frontend           │    │           Backend                 │
│  Uses: shared/types      │    │  Uses: @prisma/client (direct)   │
│  Path: frontend/src      │    │  Uses: shared/types (API types)  │
└──────────────────────────┘    └──────────────────────────────────┘
```

---

## Type Generation Strategy

### Current Setup
- **Backend:** Uses `@prisma/client` directly (already generated via `prisma generate`)
- **Frontend:** Uses manually maintained types in `frontend/src/types/`
- **Shared:** NEW - `shared/types/` package with Prisma-aligned interfaces

### Recommended Strategy: Option B - Shared Types Package

We've created a `/shared/types` package that:
1. Mirrors Prisma model structures exactly
2. Uses `string` for Date fields (JSON serialization)
3. Uses `string` for BigInt fields (JSON compatibility)
4. Excludes sensitive fields (passwordHash, tokenHash, etc.)
5. Provides API request/response types

---

## Model Mapping Table

### User & Authentication Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `User` | `shared/types/models.ts:User` | `frontend/src/types/user.types.ts:User` | ⚠️ MISMATCH |
| `RefreshToken` | `shared/types/models.ts:RefreshToken` | N/A (internal) | ✅ OK |
| `PasswordResetToken` | `shared/types/models.ts:PasswordResetToken` | N/A (internal) | ✅ OK |

### Organization Structure Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `Organization` | `shared/types/models.ts:Organization` | N/A | ✅ OK |
| `Branch` | `shared/types/models.ts:Branch` | `frontend/src/types/settings.types.ts:Branch` | ⚠️ MISMATCH |
| `Department` | `shared/types/models.ts:Department` | N/A | ✅ OK |
| `Location` | `shared/types/models.ts:Location` | `frontend/src/types/asset.types.ts:Location` | ⚠️ MISMATCH |

### Agent Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `Agent` | `shared/types/models.ts:Agent` | `frontend/src/types/agent.types.ts:Agent` | ⚠️ MINOR |
| `AgentCommand` | `shared/types/models.ts:AgentCommand` | `frontend/src/types/agent.types.ts:Command` | ⚠️ MISMATCH |
| `AgentTelemetry` | `shared/types/models.ts:AgentTelemetry` | `frontend/src/types/telemetry.types.ts` | ⚠️ MISMATCH |
| `AgentGroup` | `shared/types/models.ts:AgentGroup` | N/A | ✅ OK |
| `AgentDownload` | `shared/types/models.ts:AgentDownload` | `frontend/src/types/agent.types.ts:AgentDownload` | ⚠️ MINOR |
| `AgentVersion` | `shared/types/models.ts:AgentVersion` | `frontend/src/types/agent.types.ts:AgentVersion` | ✅ OK |

### Asset Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `Asset` | `shared/types/models.ts:Asset` | `frontend/src/types/asset.types.ts:Asset` | ❌ MAJOR |
| `AssetHardware` | `shared/types/models.ts:AssetHardware` | `frontend/src/types/asset.types.ts:Hardware` | ❌ MAJOR |
| `AssetSoftware` | `shared/types/models.ts:AssetSoftware` | `frontend/src/types/asset.types.ts:Software` | ❌ MAJOR |
| `AssetSecurity` | `shared/types/models.ts:AssetSecurity` | `frontend/src/types/asset.types.ts:AssetSecurity` | ⚠️ MISMATCH |

### Tag Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `Tag` | `shared/types/models.ts:Tag` | `frontend/src/types/asset.types.ts:Tag` | ⚠️ MISMATCH |
| `AssetTag` | `shared/types/models.ts:AssetTag` | `frontend/src/types/asset.types.ts:AssetTag` | ⚠️ MISMATCH |
| `Category` | `shared/types/models.ts:Category` | `frontend/src/types/asset.types.ts:Category` | ⚠️ MISMATCH |
| `SubCategory` | `shared/types/models.ts:SubCategory` | `frontend/src/types/asset.types.ts:SubCategory` | ⚠️ MISMATCH |

### Vulnerability Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `Vulnerability` | `shared/types/models.ts:Vulnerability` | `frontend/src/types/vulnerability.types.ts:Vulnerability` | ⚠️ MISMATCH |
| `VulnerabilityException` | `shared/types/models.ts:VulnerabilityException` | `frontend/src/types/vulnerability.types.ts:VulnerabilityException` | ⚠️ MINOR |
| `AssetVulnerability` | `shared/types/models.ts:AssetVulnerability` | N/A | ✅ OK |

### Patch Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `Patch` | `shared/types/models.ts:Patch` | `frontend/src/types/patch.types.ts:Patch` | ⚠️ MISMATCH |
| `PatchDeployment` | `shared/types/models.ts:PatchDeployment` | `frontend/src/types/patch.types.ts:Deployment` | ⚠️ MISMATCH |
| `PatchTest` | `shared/types/models.ts:PatchTest` | `frontend/src/types/patch.types.ts:PatchTest` | ✅ OK |
| `ZeroTouchConfig` | `shared/types/models.ts:ZeroTouchConfig` | `frontend/src/types/patch.types.ts:ZeroTouchConfig` | ✅ OK |

### Discovery Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `IPRange` | `shared/types/models.ts:IPRange` | `frontend/src/types/discovery.types.ts:IPRange` | ⚠️ MINOR |
| `DeviceCredential` | `shared/types/models.ts:DeviceCredential` | `frontend/src/types/discovery.types.ts:DeviceCredential` | ⚠️ MINOR |
| `DiscoveredDevice` | `shared/types/models.ts:DiscoveredDevice` | N/A | ✅ OK |
| `DiscoveryScan` | `shared/types/models.ts:DiscoveryScan` | N/A | ✅ OK |

### Job Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `PatchJob` | `shared/types/models.ts:PatchJob` | `frontend/src/types/jobs.types.ts:PatchJob` | ⚠️ MINOR |
| `VulnerabilityJob` | `shared/types/models.ts:VulnerabilityJob` | `frontend/src/types/jobs.types.ts:VulnerabilityJob` | ⚠️ MINOR |
| `SoftwareCatalog` | `shared/types/models.ts:SoftwareCatalog` | `frontend/src/types/jobs.types.ts:SoftwareCatalogItem` | ⚠️ MINOR |
| `SoftwareDeployment` | `shared/types/models.ts:SoftwareDeployment` | `frontend/src/types/jobs.types.ts:SoftwareDeployment` | ⚠️ MINOR |
| `ConfigCatalog` | `shared/types/models.ts:ConfigCatalog` | `frontend/src/types/jobs.types.ts:ConfigCatalogItem` | ⚠️ MINOR |
| `ConfigDeployment` | `shared/types/models.ts:ConfigDeployment` | `frontend/src/types/jobs.types.ts:ConfigDeployment` | ⚠️ MINOR |
| `DeploymentPolicy` | `shared/types/models.ts:DeploymentPolicy` | `frontend/src/types/jobs.types.ts:DeploymentPolicy` | ✅ OK |

### Settings Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `Role` | `shared/types/models.ts:Role` | `frontend/src/types/settings.types.ts:Role` | ⚠️ MISMATCH |
| `LdapConfig` | `shared/types/models.ts:LdapConfig` | `frontend/src/types/settings.types.ts:LDAPServerConfig` | ⚠️ MISMATCH |
| `Setting` | `shared/types/models.ts:Setting` | N/A | ✅ OK |
| `AlertConfig` | `shared/types/models.ts:AlertConfig` | N/A | ✅ OK |

### License Models

| Prisma Model | Shared Type | Frontend Type | Status |
|--------------|-------------|---------------|--------|
| `SoftwareLicense` | `shared/types/models.ts:SoftwareLicense` | `frontend/src/types/asset.types.ts:SoftwareLicense` | ⚠️ MINOR |
| `OSLicense` | `shared/types/models.ts:OSLicense` | `frontend/src/types/asset.types.ts:OSLicense` | ⚠️ MINOR |

---

## Critical Mismatches

### 1. User Model - CRITICAL ❌

**File:** `frontend/src/types/user.types.ts:2-43`

| Field | Prisma Schema | Frontend Type | Issue |
|-------|---------------|---------------|-------|
| `name` | `String?` (single field) | `firstName`, `lastName` (split) | Frontend expects split name |
| `contactNumber` | `String?` | `phone` | Different field name |
| `username` | NOT IN PRISMA | `String?` | Frontend has extra field |
| `avatar` | NOT IN PRISMA | `String?` | Frontend has extra field |
| `gender` | NOT IN PRISMA | `'Male' \| 'Female' \| 'Others'` | Frontend has extra field |
| `timezone` | NOT IN PRISMA | `String?` | Frontend has extra field |
| `branch` | NOT IN PRISMA | `String?` | Frontend has extra field |
| `orgUnit` | NOT IN PRISMA | `String?` | Frontend has extra field |
| `dashboard` | NOT IN PRISMA | `String?` | Frontend has extra field |
| `status` | NOT IN PRISMA | `'Active' \| 'Invite Sent' \| ...` | Frontend has extra field |
| `lastLogin` | `lastLoginAt: DateTime?` | `String?` | Different field name |

**Required Action:** Update frontend User type to match Prisma OR update Prisma schema to include missing fields.

---

### 2. Asset Model - CRITICAL ❌

**File:** `frontend/src/types/asset.types.ts:182-244`

| Field | Prisma Schema | Frontend Type | Issue |
|-------|---------------|---------------|-------|
| `id` | `String` | `String` | ✅ Match |
| `name` | `String` | `String` | ✅ Match |
| `assetId` | NOT IN PRISMA | `String` | Frontend expects separate assetId |
| `operationalStatus` | NOT IN PRISMA | `'Connected' \| 'Disconnected'` | Frontend computed from Agent |
| `operationalStatusSince` | NOT IN PRISMA | `String` | Frontend computed |
| `operationalStatusDuration` | NOT IN PRISMA | `String` | Frontend computed |
| `assetType` | `type: String` | Different enum values | Type values differ |
| `branchLocation` | NOT IN PRISMA | `String` | Frontend has extra field |
| `owner` | NOT IN PRISMA | `Owner` (nested object) | Frontend has nested type |
| `processor` | NOT IN PRISMA | `Processor` (nested object) | Should come from AssetHardware |
| `ram` | NOT IN PRISMA | `RAM` (nested object) | Should come from AssetHardware |
| `storage` | NOT IN PRISMA | `Storage` (nested object) | Should come from AssetHardware |
| `performance` | NOT IN PRISMA | `Performance` (nested object) | Should come from telemetry |
| `location` | `locationId: String?` | Nested `{base, installed}` | Frontend has nested type |
| `procurement` | NOT IN PRISMA | `Procurement` (nested object) | Frontend has extra |
| `cost` | NOT IN PRISMA | `Cost` (nested object) | Frontend has extra |

**Required Action:**
1. Frontend Asset type should be a composite/view type that combines:
   - `Asset` model (core fields)
   - `AssetHardware` model (hardware fields)
   - `Agent` status (operational status)
   - Computed fields (duration, etc.)
2. Create `AssetDetailResponse` type for API responses

---

### 3. Hardware Types - CRITICAL ❌

**File:** `frontend/src/types/asset.types.ts:265-344` and `519-529`

The frontend has extensive hardware types (`BIOS`, `ProcessorDetails`, `BaseBoard`, `Drive`, `MemorySlot`, etc.) that don't directly map to the simple `AssetHardware` Prisma model.

**Prisma AssetHardware:**
```prisma
model AssetHardware {
  id         String  @id @default(uuid())
  assetId    String  @unique
  cpu        String?
  cpuCores   Int?
  ramTotal   BigInt?
  diskTotal  BigInt?
  diskFree   BigInt?
  gpuModel   String?
  biosVersion String?
  systemSKU  String?
}
```

**Frontend Hardware Type:** Complex nested structure with 15+ sub-types.

**Required Action:**
1. Either expand Prisma `AssetHardware` model with JSON fields for detailed hardware
2. Or create new Prisma models for detailed hardware data
3. Frontend types should be marked as "UI/Display types" separate from API types

---

### 4. Location Model - MISMATCH ⚠️

**File:** `frontend/src/types/asset.types.ts:132-136`

| Prisma | Frontend |
|--------|----------|
| `name`, `address`, `city`, `country`, `timezone` | `address`, `latitude`, `longitude` |

Frontend expects GPS coordinates, Prisma has address components.

---

### 5. Tag Model - MISMATCH ⚠️

**File:** `frontend/src/types/asset.types.ts:98-117`

Frontend has many extra fields not in Prisma:
- `assetCount` - Should be computed
- `usageCount` - Should be computed
- `lastUsed` - Should be computed
- `owner`, `manager`, `budget` - Not in Prisma
- `complianceRequired`, `complianceTags` - Not in Prisma

---

### 6. Vulnerability Model - MISMATCH ⚠️

**File:** `frontend/src/types/vulnerability.types.ts:4-25`

| Field | Prisma | Frontend |
|-------|--------|----------|
| `cveId` | `String` | `cve` (different name) |
| `cvss3BaseScore` | `Float?` | `cvss3BaseScore` ✅ |
| `endpoints` | NOT IN PRISMA | `number` (should be computed) |
| `affectedSoftwares` | NOT IN PRISMA | `number` (should be computed) |
| Many CVSS details | Present | Missing |

---

### 7. Branch Model - MISMATCH ⚠️

**File:** `frontend/src/types/settings.types.ts:2-18`

Frontend has many extra fields not in Prisma:
- `status`, `users`, `assets`, `address`, `city`, `state`, `country`, `postalCode`
- `phone`, `email`, `manager`

Prisma only has: `id`, `name`, `description`, `organizationId`, `isDefault`, timestamps.

---

## Frontend Files Requiring Updates

### High Priority (API-Breaking Changes)

| File | Line(s) | Issue | Action |
|------|---------|-------|--------|
| `frontend/src/types/user.types.ts` | 1-43 | User type completely different | Rewrite to match Prisma + computed fields |
| `frontend/src/types/asset.types.ts` | 182-244 | Asset type has many extra nested fields | Split into `Asset` (API) and `AssetView` (UI) |
| `frontend/src/types/asset.types.ts` | 265-529 | Hardware types don't match Prisma | Mark as UI-only types |

### Medium Priority (Field Naming)

| File | Line(s) | Issue | Action |
|------|---------|-------|--------|
| `frontend/src/types/vulnerability.types.ts` | 8 | `cve` should be `cveId` | Rename field |
| `frontend/src/types/vulnerability.types.ts` | 17-18 | `endpoints`, `affectedSoftwares` are computed | Add to response type, not model |
| `frontend/src/types/asset.types.ts` | 98-117 | Tag has computed fields mixed with model | Split computed fields |
| `frontend/src/types/settings.types.ts` | 2-18 | Branch has extra fields | Align with Prisma |
| `frontend/src/types/discovery.types.ts` | 37-46 | DeviceCredential minor differences | Align field names |

### Low Priority (Extra Fields for UI)

| File | Line(s) | Issue | Action |
|------|---------|-------|--------|
| `frontend/src/types/agent.types.ts` | 21 | `lastHeartbeatRelative` is computed | Keep as response extension |
| `frontend/src/types/jobs.types.ts` | Various | `createdOn` vs `createdAt` naming | Standardize to `createdAt` |
| `frontend/src/types/patch.types.ts` | 28-33 | Extra optional fields | OK as extension |

---

## Regeneration Instructions

### When to Regenerate

Regenerate shared types when:
1. Prisma schema changes (new models, field changes)
2. API response structure changes
3. New enums are added

### How to Regenerate

```bash
# Step 1: Update Prisma schema
cd backend
vim src/db/prisma/schema.prisma

# Step 2: Generate Prisma client (backend)
npm run db:generate

# Step 3: Update shared types manually
# (Currently manual - future: use prisma-json-types-generator)
cd ../shared
# Update types/models.ts to match schema changes
# Update types/enums.ts if new enums added

# Step 4: Build shared types
npm run build

# Step 5: Update frontend imports (Phase 2)
cd ../frontend
# Replace local types with shared types imports
```

### Future Automation

Consider implementing:
1. `prisma-json-types-generator` for automatic type generation
2. CI/CD check to verify types match schema
3. Script to diff Prisma schema vs shared types

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total Prisma Models | 63 |
| Models with Frontend Types | 42 |
| Critical Mismatches (❌) | 3 |
| Moderate Mismatches (⚠️) | 25 |
| Matching (✅) | 14 |
| Internal Only (no frontend type needed) | 21 |

---

## Next Steps (Phase 2)

1. **Update Frontend Type Files:**
   - Create `frontend/src/types/api/` directory for API-aligned types
   - Keep `frontend/src/types/ui/` for UI-specific extensions
   - Gradually migrate components to use shared types

2. **Update MSW Handlers:**
   - Ensure mock data matches shared types
   - Add type assertions to handlers

3. **Backend Response Validation:**
   - Add response type validation in backend
   - Ensure API responses match shared types

4. **Documentation:**
   - Update API documentation to reference shared types
   - Add JSDoc comments linking to Prisma schema
