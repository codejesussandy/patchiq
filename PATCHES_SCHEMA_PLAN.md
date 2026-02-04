# Patches Feature Data Schema - Complete Design

## Overview

This document defines a **self-contained Patches schema** with clear input/output interfaces, enabling independent development while maintaining integration points with Vulnerabilities, Agents, and Hub modules.

---

## Current State Summary

| Metric | Value |
|--------|-------|
| Patches in DB | 114 |
| All Approved | Yes |
| Deployments Created | 0 |
| Agent-Asset Links | 5/5 valid |
| Patch Commands Executed | 4 (1 success, 3 failed) |

### Current Issues (Pre-Implementation)
1. **Date field duplication**: `releaseDate`, `releasedOn`, `downloadedOn` - unclear which is authoritative
2. **Ambiguous targeting**: `targetGroups` stores both group IDs and endpoint IDs
3. **No bundle support**: Patches don't follow Hub pattern (no scripts, no MinIO bundles)
4. **Frontend mismatch**: Sends `patchIds` instead of `patches`, wrong field names
5. **Underutilized models**: `PatchEndpoint`, `PatchFileDetail` redundant

---

## Phase 1: Schema Changes (COMPLETED)

### New Model: PatchBundle
```
PatchBundle
├── Identity
│   ├── id: UUID (PK)
│   └── patchId: String (FK, unique - 1:1 with Patch)
│
├── MinIO Storage
│   ├── minioBucket: String ("patches")
│   ├── bundleObjectKey: String? ("windows/microsoft/KB5034441/bundle.tar.gz")
│   ├── bundleChecksum: String? (SHA256)
│   └── bundleSize: BigInt?
│
├── Manifest
│   ├── manifestJson: Json? (parsed manifest.json)
│   └── scriptsIncluded: Boolean
│
├── Inline Scripts (fallback)
│   ├── scriptInstall: String?
│   ├── scriptRollback: String?
│   ├── scriptVerify: String?
│   └── scriptUninstall: String?
│
├── Download Tracking
│   ├── sourceUrl: String? (vendor download URL)
│   ├── downloadStatus: String (pending, downloading, completed, failed)
│   ├── downloadedAt: DateTime?
│   └── downloadError: String?
│
└── Execution
    ├── requiresRoot: Boolean
    └── timeoutSeconds: Int (default 3600)
```

### Updated Models

#### Patch (additions)
- `publishedAt`: DateTime? - Single authoritative date
- `patchType`: String - UPDATE, HOTFIX, SERVICE_PACK, DRIVER
- `supportsRollback`: Boolean
- `bundle`: PatchBundle? (1:1 relation)

#### PatchDeployment (additions)
- `targetGroupIds`: String[] - When scope=Group
- `targetAgentIds`: String[] - When scope=Endpoint
- `retryCount`: Int (default 1)
- `retryDelay`: Int (seconds, default 300)

#### PatchDeploymentTask (additions)
- `agentId`: String? - Target agent ID
- `exitCode`: Int?
- `previousVersion`: String? - Version before patch
- `installedVersion`: String? - Version after patch
- `rollbackAvailable`: Boolean
- `verifiedAt`: DateTime?
- `verifyResult`: String? (passed, failed)
- `createdAt`, `updatedAt`: DateTime

### Migration Applied
- File: `migrations/20260204_add_patch_bundle_and_enhancements/migration.sql`

---

## Phase 2: Backend Services (COMPLETED)

### Task 6: Create patch-bundle.service.ts ✅
Created `/backend/src/modules/patches/patch-bundle.service.ts`:
- `uploadPatchBundle()` - Upload bundle to MinIO, parse manifest, create Patch + PatchBundle
- `uploadBundleForPatch()` - Upload bundle for existing patch
- `getBundleDownloadInfo()` - Get presigned URL and manifest for agent
- `getExecutionPayload()` - Build payload for agent command
- `getBundleStream()` - Proxy download for agents
- `createPatchWithScripts()` - Create patch with inline scripts
- `getBundleInfo()` / `deleteBundle()` - Bundle management

### Task 7: Add bundle routes and controller methods ✅
Added endpoints to `/backend/src/modules/patches/patches.routes.ts`:
- `POST /v1/patches/upload-bundle` - Upload bundle and create patch
- `POST /v1/patches/with-scripts` - Create patch with inline scripts
- `POST /v1/patches/:id/bundle` - Upload bundle for existing patch
- `GET /v1/patches/:id/bundle` - Get bundle info
- `GET /v1/patches/:id/bundle/download` - Get presigned URL for download
- `GET /v1/patches/:id/bundle/stream` - Stream bundle (proxy)
- `GET /v1/patches/:id/execution-payload` - Get execution payload
- `DELETE /v1/patches/:id/bundle` - Delete bundle

### Task 8: Add bundle validation schemas ✅
Added to `/backend/src/modules/patches/patches.validator.ts`:
- `patchManifestSchema` - Validate manifest.json structure
- `createPatchWithScriptsSchema` - Validate inline script creation
- `bundleOperationQuerySchema` - Validate operation type parameter

### Task 9: Update patches.service.ts for PatchBundle ✅
Updated `/backend/src/modules/patches/patches.service.ts`:
- Include bundle relation in `listPatches()` and `getPatchById()`
- Updated `transformPatch()` to include bundle info and new fields
- Updated `createPatchDeploymentFromUI()` to use bundle-based payloads

### Task 10: Update deployment-executor for hub_patch_install ✅
Updated `/backend/src/modules/deployments/deployment-executor.service.ts`:
- Added `HUB_PATCH_INSTALL` command type
- `createPatchDeployment()` uses `hub_patch_install` when patch has bundle
- Falls back to `patch_install` for legacy patches
- Includes bundleUrl, bundleChecksum, manifest in payload

---

## Phase 3: Frontend Fixes (COMPLETED)

### Task 11: Fix AllPatches.tsx deployment payload ✅
Updated `/frontend/src/pages/patches/AllPatches.tsx`:
- Changed `patchIds: string[]` to `patches: [{id, patchId, kbNumber}]`
- Changed scope-based targeting to direct `targetAgentIds: string[]`
- Added deployment name and description fields
- Added retry count option
- Removed unimplemented schedule/options features

### Task 12: Add agent selector component ✅
Replaced scope picker (all/groups/custom) with direct agent multi-select:
- Shows all registered agents with status indicator
- Filters by connected/disconnected status
- Shows agent hostname, name, and OS
- Disables offline agents in selection
- Shows count of online agents

### Task 13: Wire deployment modal correctly ✅
- Integrated `agentService.getAgents()` to fetch available agents
- Modal now sends correct payload to `POST /v1/deployments/patch`
- Better error handling with specific error messages

---

## Phase 4: Agent Updates (COMPLETED)

### Task 14: Add hub_patch_install command handling ✅
Updated `/agent/internal/backend/backend.go`:
- Added `hub_patch_install` and `hub_patch_rollback` to command case statement (line 661)
- Added operation type mapping for patch commands (lines 670-677)
- Reuses existing ScriptExecutor infrastructure for bundle download, extraction, and execution

### Task 15: Add hub_patch_rollback support ✅
- Added `hub_patch_rollback` command type
- Maps to "rollback" operation type
- Uses existing rollback tracking from ScriptExecutor

### Task 16: Update backend COMMAND_TYPES ✅
Updated `/backend/src/modules/deployments/deployment-executor.types.ts`:
- Added `HUB_PATCH_INSTALL: 'hub_patch_install'`
- Added `HUB_PATCH_ROLLBACK: 'hub_patch_rollback'`

### Task 17: Update createPatchDeployment for hub-centric approach ✅
Updated `/backend/src/modules/deployments/deployment-executor.service.ts`:
- Fetches patches with bundles to determine command type
- Uses `hub_patch_install` for patches with bundles (bundleObjectKey or scriptsIncluded)
- Falls back to legacy `patch_install` for patches without bundles
- Builds bundle download URL using backend proxy
- Includes manifest, checksum, and script in payload

---

## Phase 5: Migration & Cleanup (COMPLETED)

### Task 18: Create migration script for PatchFileDetail → PatchBundle ✅
Created `/backend/src/db/prisma/scripts/migrate-patch-file-details.ts`:
- Migrates data from deprecated PatchFileDetail to new PatchBundle model
- Handles MinIO storage fields, checksums, download status
- Run with: `npx ts-node -r tsconfig-paths/register src/db/prisma/scripts/migrate-patch-file-details.ts`

### Task 19: Mark deprecated models in schema ✅
Updated `/backend/src/db/prisma/schema.prisma`:
- Added `@deprecated` comments to `PatchFileDetail` model
- Added `@deprecated` comments to `PatchEndpoint` model
- Added deprecation notes to relations in Patch model
- Existing deprecation comments on date fields already present

### Task 20: Update patches.service.ts for bundle support ✅
Updated `/backend/src/modules/patches/patches.service.ts`:
- `listPatches()` now includes bundle relation
- `getPatchById()` now includes bundle relation
- `transformPatch()` includes bundle info, supportsRollback, patchType
- Added deprecation comments to deprecated relation includes

---

## Input Interfaces (What Patches NEEDS)

### From Agents Module
```typescript
interface AgentTarget {
  agentId: string;
  assetId: string | null;
  hostname: string;
  os: "Windows" | "Linux" | "macOS";
  osVersion: string;
  status: "Online" | "Offline";
}

// Query agents by criteria
function getAgentsByScope(scope: string, ids: string[]): AgentTarget[]
```

### From Assets Module
```typescript
interface AssetInfo {
  assetId: string;
  os: string;
  osVersion: string;
  installedSoftware: { name: string; version: string }[];
}
```

### From Vulnerabilities Module (Optional)
```typescript
interface CVEInfo {
  cveId: string;
  severity: string;
  affectedProducts: { vendor: string; product: string; version: string }[];
}
```

### From MinIO/Hub
```typescript
interface StorageService {
  uploadBundle(objectKey: string, buffer: Buffer): Promise<void>;
  downloadStream(objectKey: string): Promise<ReadableStream>;
  getPresignedUrl(objectKey: string, expirySeconds: number): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
}
```

---

## Output Interfaces (What Patches PROVIDES)

### To Deployment Executor
```typescript
interface PatchInstallPayload {
  patchId: string;
  kbNumber?: string;

  // Hub-centric (preferred)
  bundleUrl?: string;
  bundleChecksum?: string;
  manifest?: PatchManifest;

  // Inline script (fallback)
  script?: string;

  // Execution options
  requiresRoot: boolean;
  rebootRequired: boolean;
  timeoutSeconds: number;
  environment?: Record<string, string>;
}

interface PatchManifest {
  id: string;
  name: string;
  version: string;
  platform: string;
  scripts: {
    install: string;
    rollback?: string;
    verify?: string;
  };
}
```

### To Agent (Command Payload)
```typescript
// AgentCommand.type = "hub_patch_install"
interface AgentPatchCommand {
  operationType: "install" | "rollback" | "verify";
  patchId: string;
  kbNumber?: string;
  bundleUrl?: string;
  bundleChecksum?: string;
  manifest?: PatchManifest;
  script?: string;
  requiresRoot: boolean;
  rebootRequired: boolean;
  environment?: Record<string, string>;
}
```

### To Dashboard/Reports
```typescript
interface PatchComplianceMetrics {
  totalPatches: number;
  byStatus: { status: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  approvalPipeline: {
    pending: number;
    approved: number;
    rejected: number;
  };
  deploymentMetrics: {
    deploymentsCreated: number;
    tasksTotal: number;
    tasksSucceeded: number;
    tasksFailed: number;
    tasksPending: number;
  };
}
```

### To Frontend (API Responses)
```typescript
// POST /v1/deployments/patch
interface CreatePatchDeploymentInput {
  name: string;
  description?: string;
  patches: { id: string }[];
  targetAgentIds: string[];
  retryCount?: number;
}

interface CreatePatchDeploymentResponse {
  deploymentId: string;
  tasksCreated: number;
  commandsCreated: number;
  status: "created" | "partial";
}
```

---

## Data Flow

### Patch Creation with Bundle
```
Admin uploads bundle
         │
         ▼
POST /v1/patches/upload-bundle
  - Validates manifest.json
  - Stores in MinIO
  - Creates Patch + PatchBundle
         │
         ▼
Patch.status = "Draft"
Patch.approvalStatus = "Pending"
```

### Deployment Flow
```
POST /v1/deployments/patch
         │
         ▼
Create PatchDeployment
  - status: PENDING
  - Link patches (many-to-many)
         │
         ▼ (for each targetAgentId)
Create PatchDeploymentTask
  - agentId, assetId
  - status: pending
         │
         ▼
Create AgentCommand
  - type: "hub_patch_install"
  - payload: PatchInstallPayload
  - status: pending
         │
         ▼
Link task.commandId = command.id
```

### Execution Flow
```
Agent polls → Receives command → Downloads bundle
         │
         ▼
Agent executes:
  1. Verify checksum
  2. Extract bundle
  3. Run install script
  4. Report result
         │
         ▼
Backend updates:
  - AgentCommand.status
  - PatchDeploymentTask.status
  - PatchDeployment counts
```

---

## Bundle Manifest Format

```json
{
  "id": "KB5034441",
  "name": "Windows 11 Security Update",
  "version": "1.0.0",
  "vendor": "Microsoft",
  "platform": "windows",
  "architecture": "x64",
  "requiresRoot": true,
  "requiresReboot": true,
  "scripts": {
    "install": "scripts/install.ps1",
    "rollback": "scripts/rollback.ps1",
    "verify": "scripts/verify.ps1"
  },
  "files": [
    {
      "name": "windows11-kb5034441-x64.msu",
      "checksum": "sha256:abc123...",
      "size": 524288000
    }
  ],
  "environment": {
    "PATCH_KB": "KB5034441",
    "ALLOW_REBOOT": "false"
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `/backend/src/db/prisma/schema.prisma` | ✅ DONE - Added PatchBundle, updated models |
| `/backend/src/modules/patches/patch-bundle.service.ts` | NEW - Bundle management |
| `/backend/src/modules/patches/patch-bundle.types.ts` | NEW - Bundle types |
| `/backend/src/modules/patches/patches.service.ts` | Update for PatchBundle |
| `/backend/src/modules/patches/patches.controller.ts` | Add bundle endpoints |
| `/backend/src/modules/patches/patches.routes.ts` | Add bundle routes |
| `/backend/src/modules/patches/patches.validator.ts` | Add bundle schemas |
| `/backend/src/modules/deployments/deployment-executor.service.ts` | hub_patch_install support |
| `/frontend/src/pages/patches/AllPatches.tsx` | Fix deployment payload |
| `/frontend/src/services/patch.service.ts` | Update API calls |

---

## Verification Checklist

1. **Schema**: ✅ `npx prisma migrate dev` successful
2. **Bundle Upload**: POST bundle, verify in MinIO
3. **Deployment Creation**: Create deployment, verify tasks/commands created
4. **Agent Execution**: Agent receives command, downloads bundle, executes
5. **Status Flow**: Verify status propagates from agent → task → deployment

---

## Progress Tracker

### Phase 1: Schema Changes
- [x] Add PatchBundle model to schema
- [x] Update Patch model with new fields
- [x] Update PatchDeployment with explicit targeting
- [x] Update PatchDeploymentTask with rollback tracking
- [x] Generate and run Prisma migration

### Phase 2: Backend Services
- [x] Create patch-bundle.service.ts
- [x] Add bundle routes and controller methods
- [x] Add bundle validation schemas
- [x] Update patches.service.ts for PatchBundle
- [x] Update deployment-executor for hub_patch_install

### Phase 3: Frontend Fixes
- [x] Fix AllPatches.tsx payload
- [x] Add agent selector component
- [x] Wire deployment modal correctly

### Phase 4: Agent Updates
- [x] Ensure hub_patch_install command handled
- [x] Verify bundle download and script execution
- [x] Add rollback support

### Phase 5: Migration & Cleanup
- [x] Migrate PatchFileDetail data to PatchBundle (script created)
- [x] Remove deprecated models/fields (marked with @deprecated)
- [x] Update service to use bundle
