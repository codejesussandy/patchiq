# PRD: Patch & Deployment Settings (Pipeline 2F)

**Status**: NOT STARTED
**Author**: Claude Code
**Created**: 2026-02-13
**Priority**: P0 (Settings Hardening)
**Depends on**: Pipeline 2A (RBAC & Permissions) — COMPLETED
**Parallel with**: Pipelines 2D, 2E, 2G
**Resolves**: Roadmap items R1–R5 for Pipeline 2F

---

## 1. Problem Statement

PatchIQ's Patch & Deployment Settings domain has **four sub-features in various states of brokenness**: Computer Groups have routes but no input validation; Deployment Policies are duplicated across two modules with conflicting implementations; Patch Preferences have a complete frontend UI but zero backend implementation; Distribution Server has no database model, no routes, and no backend logic at all.

The current state by sub-feature:

- **Computer Groups**: Routes and service exist, but POST/PUT routes are **missing `validateBody()` middleware** — any JSON payload is accepted without validation. The Zod validator schema defines a `criteria` field that doesn't match the `endpoints` field the service actually uses. Shared types use `criteria`/`memberCount` while the DB uses `endpoints`/`endpointCount`. No unique constraint on group names allows duplicates. `createdBy` is never populated. No pagination on list endpoint.

- **Deployment Policies**: **Duplicated across two modules** — `/v1/deployment-policies` (jobs module, proper BaseCrudService with pagination) and `/v1/settings/deployment-policies` (settings module, basic implementation, no validation, no pagination). The two implementations use different `policyId` formats (`DPOL-###` vs `POL-####`). Enum values are inconsistent: validators expect `ALL`/`PATCH`/`UPDATE`/`SECURITY` (uppercase) but seed data and DB store `All`/`Patch`/`Security` (mixed case). Frontend uses the settings endpoint.

- **Patch Preferences**: Frontend page, types, hooks, and service are **100% complete** — but the backend has **zero implementation**. No routes, no controller methods, no service methods. The Zod validator exists but is unused. The frontend will get 404 errors on every API call. No seed data provides defaults.

- **Distribution Server**: **No Prisma model exists** — there is literally no database table to store distribution servers. Frontend page, types, hooks, and service are all complete but call endpoints that don't exist. Zod validators exist but are dead code. The frontend page references an undefined `fetchData()` function that will crash at runtime.

Without these fixes, admins cannot configure patch sync schedules, organize endpoints into groups for targeted deployments, define deployment timing policies, or set up distribution servers for patch delivery — all core patch management capabilities.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Every Computer Group CRUD operation validated with Zod before reaching the service layer | POST/PUT with invalid data returns 400 with descriptive Zod error; valid data succeeds |
| G2 | Single authoritative Deployment Policy implementation with consistent data | Only one route set exists; policyId format is consistent; enum values match between validator, service, and seed data |
| G3 | Patch Preferences fully operational end-to-end | `GET /v1/settings/patch-preferences` returns current settings; `PUT` updates them; `POST .../sync` triggers sync; defaults seeded on fresh DB |
| G4 | Distribution Server CRUD fully operational with Prisma model | Prisma model exists; migration applied; full CRUD endpoints working; validators wired; seed data present |
| G5 | End-to-end validation script proves all 4 sub-features work with realistic data | `validate-pipeline-2f.ts` passes 60+ scenarios against real database with zero failures |

---

## 3. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| N1 | Frontend UI changes (fix "Job" → "Policy" labels, fix duplicate Undo/Reset buttons) | Frontend is Dev 2's scope; we document the bugs for them |
| N2 | Distribution server connectivity testing (ping/health-check remote servers) | Separate operational concern for Pipeline 3 (Deployment Execution) |
| N3 | Patch sync job execution (actually syncing patches from vendor feeds) | Pipeline 2F only ensures the *settings* are stored and validated; actual sync execution is Pipeline 3+ |
| N4 | Computer Group dynamic membership (auto-populate based on OS, department, etc.) | Over-engineering for v1; manual endpoint assignment is sufficient |
| N5 | Deployment Policy schedule execution engine (cron-like scheduler) | Pipeline 3 concern; 2F just stores the policy configuration |
| N6 | Multi-tenant distribution server isolation | No multi-tenancy in v1 |

---

## 4. User Stories

### US-1: Computer Group Validation
> As a **PatchIQ admin**, I want the system to reject invalid computer group data (empty names, non-existent endpoints, duplicate group names) so that I don't end up with corrupted groups that break targeted deployments.

### US-2: Computer Group Endpoint Assignment
> As a **PatchIQ admin**, I want to assign real asset endpoints to a computer group and see the accurate count so that I can target patch deployments to specific sets of machines.

### US-3: Deployment Policy Configuration
> As a **PatchIQ admin**, I want to create deployment policies with validated timing types (INSTANT or SCHEDULE), module scopes (All, Patch, Security), and priority classifications so that I can define how and when patches are deployed.

### US-4: Deployment Policy Single Source of Truth
> As a **PatchIQ admin**, I want deployment policies accessible from a single consistent API endpoint so that I don't encounter conflicting data between different parts of the system.

### US-5: Patch Preferences Management
> As a **PatchIQ admin**, I want to configure patch sync schedules, OS targets, approval policies (PreApproved, ManuallyApproves, TestAndApprove), and third-party patching toggles so that the platform syncs and approves patches according to my organization's policies.

### US-6: Patch Sync Trigger
> As a **PatchIQ admin**, I want to trigger an immediate patch sync from the preferences page so that I can force a refresh without waiting for the next scheduled sync window.

### US-7: Distribution Server Registration
> As a **PatchIQ admin**, I want to register distribution servers (name, URL, location, version) so that agents can download patches from geographically appropriate servers instead of the central hub.

### US-8: Distribution Server Validation
> As a **PatchIQ admin**, I want the system to reject distribution servers with invalid URLs or duplicate names so that the server registry stays clean and agents don't get pointed at broken download endpoints.

### US-9: Settings Persistence
> As a **PatchIQ admin**, I want all Patch & Deployment settings to persist across backend restarts and be immediately available after a fresh `db-seed` so that I don't lose configuration or start with a broken state.

### US-10: RBAC Enforcement on All Settings
> As a **PatchIQ admin**, I want all Patch & Deployment settings endpoints protected by RBAC so that only users with `settings` permissions can view or modify them.

---

## 5. Requirements

### R1: Computer Group Validation & Hardening (P0 — Must Have)

Wire Zod validation to Computer Group routes and fix all data inconsistencies.

**5.1.1 Fix Validator Schema**

Replace the current `criteria`-based validator with an `endpoints`-based one that matches what the service and DB actually use:

```typescript
export const createComputerGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  description: z.string().max(500).optional().nullable(),
  endpoints: z.array(z.string().uuid('Each endpoint must be a valid asset UUID')).default([]),
});

export const updateComputerGroupSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  endpoints: z.array(z.string().uuid('Each endpoint must be a valid asset UUID')).optional(),
});
```

**5.1.2 Wire Validators to Routes**

```typescript
router.post('/computer-groups', checkPermission('settings', 'add'),
  validateBody(createComputerGroupSchema), settingsController.createComputerGroup);
router.put('/computer-groups/:id', checkPermission('settings', 'edit'),
  validateParams(idParamSchema), validateBody(updateComputerGroupSchema),
  settingsController.updateComputerGroup);
```

**5.1.3 Service Layer Hardening**

- **Unique name enforcement**: Before create/update, check for existing group with same name (case-insensitive). Return `409: "Computer group with name 'X' already exists"`.
- **Endpoint validation**: Before create/update, verify every endpoint UUID exists in the `assets` table. Return `400: "Endpoints not found: [uuid1, uuid2]"` for any invalid UUIDs.
- **`createdBy` population**: Set `createdBy` to `req.user.id` on create.
- **`endpointCount` accuracy**: Always derive from `endpoints.length`, never accept as input.
- **Pagination**: Add pagination support to `listComputerGroups()` using the standard `paginationSchema` (page, limit, search, sortBy, sortOrder). Search should match against `name` and `description`.

**5.1.4 Fix Shared Types**

Update `shared/types/api.ts` `ComputerGroupResponse` to match actual DB model:

```typescript
export interface ComputerGroupResponse {
  id: string;
  name: string;
  description: string | null;
  endpoints: string[];
  endpointCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Acceptance Criteria (R1):**

- [ ] `POST /v1/settings/computer-groups` with empty body returns 400 with Zod error listing required `name` field
- [ ] `POST` with `name: ""` (empty string) returns 400 "String must contain at least 1 character(s)"
- [ ] `POST` with `name` exceeding 100 chars returns 400 with max length error
- [ ] `POST` with `endpoints: ["not-a-uuid"]` returns 400 "Each endpoint must be a valid asset UUID"
- [ ] `POST` with `endpoints: ["valid-uuid-but-not-in-db"]` returns 400 "Endpoints not found: [uuid]"
- [ ] `POST` with valid data (name + valid asset UUIDs in endpoints) returns 201 with correct `endpointCount`
- [ ] `POST` with duplicate name (case-insensitive) returns 409 "Computer group with name 'X' already exists"
- [ ] `PUT /v1/settings/computer-groups/:id` with invalid `endpoints` array returns 400
- [ ] `PUT` with valid partial update (only `name`) returns 200, other fields unchanged
- [ ] `PUT` with updated `endpoints` recalculates `endpointCount` correctly
- [ ] `PUT` on non-existent ID returns 404 "Computer group not found"
- [ ] `DELETE /v1/settings/computer-groups/:id` on non-existent ID returns 404
- [ ] `DELETE` on existing group returns 204
- [ ] `GET /v1/settings/computer-groups` returns paginated results with `data`, `meta` (page, limit, total, totalPages)
- [ ] `GET` with `?search=windows` filters by name/description (case-insensitive)
- [ ] `GET` with `?sortBy=name&sortOrder=asc` returns alphabetically sorted results
- [ ] `createdBy` is populated with the creating user's UUID on `POST`
- [ ] `ComputerGroupResponse` shared type matches actual API response shape
- [ ] Extra fields in POST body (e.g., `{ name: "test", foo: "bar" }`) are stripped (Zod `.strict()` or ignored)
- [ ] `GET /v1/settings/computer-groups/available-endpoints` returns assets with `id`, `name`, `ipAddress`, `status`

**Test Cases (R1):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T1.1 | Create valid group | `{ name: "Windows Servers", endpoints: [] }` | 201, `endpointCount: 0` |
| T1.2 | Create group with endpoints | `{ name: "Dev Machines", endpoints: [assetId1, assetId2] }` | 201, `endpointCount: 2`, `createdBy` set |
| T1.3 | Create with invalid endpoint UUID | `{ name: "Bad", endpoints: ["not-uuid"] }` | 400 Zod: "Each endpoint must be a valid asset UUID" |
| T1.4 | Create with non-existent asset UUID | `{ name: "Bad", endpoints: ["550e8400-..."] }` | 400: "Endpoints not found: [550e8400-...]" |
| T1.5 | Create duplicate name | `{ name: "Windows Servers" }` (already exists) | 409: "Computer group with name 'Windows Servers' already exists" |
| T1.6 | Create duplicate name (case-insensitive) | `{ name: "windows servers" }` (when "Windows Servers" exists) | 409 |
| T1.7 | Create empty name | `{ name: "" }` | 400: "String must contain at least 1 character(s)" |
| T1.8 | Create name too long | `{ name: "a".repeat(101) }` | 400: max length error |
| T1.9 | Create with description | `{ name: "Test", description: "A test group" }` | 201, description saved |
| T1.10 | Create with null description | `{ name: "Test", description: null }` | 201, description is null |
| T1.11 | Update name only | `PUT { name: "Renamed" }` | 200, name changed, endpoints unchanged |
| T1.12 | Update endpoints | `PUT { endpoints: [assetId3] }` | 200, `endpointCount: 1` |
| T1.13 | Update to empty endpoints | `PUT { endpoints: [] }` | 200, `endpointCount: 0` |
| T1.14 | Update non-existent group | `PUT /computer-groups/bad-id` | 404 |
| T1.15 | Delete existing group | `DELETE /computer-groups/:id` | 204 |
| T1.16 | Delete non-existent group | `DELETE /computer-groups/bad-id` | 404 |
| T1.17 | List with pagination | `GET ?page=1&limit=5` | 200, max 5 results, meta has totalPages |
| T1.18 | List with search | `GET ?search=linux` | 200, only groups matching "linux" in name/description |
| T1.19 | List with sort | `GET ?sortBy=name&sortOrder=desc` | 200, reverse-alpha order |
| T1.20 | Available endpoints | `GET /available-endpoints` | 200, list of assets with id, name, ipAddress, status |
| T1.21 | RBAC: user denied create | User role, `POST /computer-groups` | 403 |
| T1.22 | RBAC: admin allowed | Admin role, `POST /computer-groups` | 201 |
| T1.23 | Create with extra fields | `{ name: "Test", unknownField: "value" }` | 201 (extra fields stripped) |

---

### R2: Deployment Policy Consolidation & Validation (P0 — Must Have)

Consolidate the duplicate Deployment Policy implementations into a single source of truth and fix all data inconsistencies.

**5.2.1 Consolidate to Settings Module**

The frontend uses `/v1/settings/deployment-policies`. The jobs module has a better implementation (BaseCrudService, pagination) but routes to `/v1/deployment-policies`. The consolidation strategy:

1. **Adopt the jobs module's `DeploymentPolicyCrudService`** as the authoritative service — it has proper BaseCrudService extension, pagination, dual-identifier lookup, and response transformation.
2. **Rewire the settings routes** to use the `DeploymentPolicyCrudService` instead of the basic settings service implementation.
3. **Keep the jobs module routes** at `/v1/deployment-policies` as-is (they already work correctly).
4. **Settings routes** at `/v1/settings/deployment-policies` should delegate to the same service.
5. **Remove the duplicate service methods** from `settings.service.ts`.

**5.2.2 Fix Enum Value Consistency**

Standardize on the **mixed-case values that match the DB and seed data**:

| Field | Valid Values | Storage Format |
|-------|-------------|----------------|
| `type` | `INSTANT`, `SCHEDULE` | Uppercase (already consistent) |
| `supportedModule` | `All`, `Patch`, `Update`, `Security` | Title Case (match seed data) |
| `relatedType` | `No Relation`, `Critical`, `Important`, `Optional` | Title Case (match seed data) |

Update the jobs module validator:

```typescript
export const createDeploymentPolicySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(['INSTANT', 'SCHEDULE']).default('INSTANT'),
  supportedModule: z.enum(['All', 'Patch', 'Update', 'Security']).default('All'),
  relatedType: z.enum(['No Relation', 'Critical', 'Important', 'Optional']).default('No Relation'),
});
```

**5.2.3 Standardize PolicyId Format**

Use the format `DPOL-XXXX` (4-digit zero-padded) consistently. Remove the `POL-####` generator from the settings service.

**5.2.4 Wire Validation to Settings Routes**

Add `validateBody()` and `validateQuery()` middleware to settings deployment policy routes:

```typescript
router.post('/deployment-policies', checkPermission('settings', 'add'),
  validateBody(createDeploymentPolicySchema), ...);
router.put('/deployment-policies/:id', checkPermission('settings', 'edit'),
  validateParams(idParamSchema), validateBody(updateDeploymentPolicySchema), ...);
router.get('/deployment-policies', checkPermission('settings', 'view'),
  validateQuery(deploymentPolicyListQuerySchema), ...);
```

**5.2.5 Additional Hardening**

- **Unique name enforcement**: Return `409: "Deployment policy with name 'X' already exists"` on duplicate.
- **Deletion safety**: If a deployment policy is referenced by any active deployment/job, return `400: "Cannot delete policy in use by N active deployment(s)"`. (Check `Deployment` or `Job` tables for references — if no FK exists currently, add the check once the relation is established in Pipeline 3. For now, allow deletion with a warning in response headers.)

**Acceptance Criteria (R2):**

- [ ] `POST /v1/settings/deployment-policies` with valid data returns 201 with auto-generated `policyId` in `DPOL-XXXX` format
- [ ] `POST` with empty body returns 400 with Zod error for required `name` field
- [ ] `POST` with `type: "INVALID"` returns 400 Zod enum error listing valid values
- [ ] `POST` with `supportedModule: "ALL"` (wrong case) returns 400 — must be `"All"`
- [ ] `POST` with `relatedType: "NO_RELATION"` (wrong format) returns 400 — must be `"No Relation"`
- [ ] `POST` with duplicate name returns 409
- [ ] `PUT /v1/settings/deployment-policies/:id` with partial update returns 200
- [ ] `PUT` with `type: "SCHEDULE"` updates correctly
- [ ] `PUT` on non-existent ID returns 404
- [ ] `DELETE /v1/settings/deployment-policies/:id` returns 204
- [ ] `DELETE` on non-existent ID returns 404
- [ ] `GET /v1/settings/deployment-policies` returns paginated results with `data` and `meta`
- [ ] `GET` with `?type=INSTANT` filters by type
- [ ] `GET /v1/settings/deployment-policies/:id` supports lookup by both UUID and policyId (e.g., `DPOL-0001`)
- [ ] `/v1/deployment-policies` (jobs module) and `/v1/settings/deployment-policies` return identical data for the same policy
- [ ] Settings and jobs routes share the same underlying service (no data drift)
- [ ] Seed data policies have `DPOL-XXXX` format policyIds
- [ ] All 5 seed policies load without validation errors
- [ ] `policyId` auto-increments correctly: if `DPOL-0005` exists, next is `DPOL-0006`

**Test Cases (R2):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T2.1 | Create valid policy | `{ name: "Weekend Window", type: "SCHEDULE", supportedModule: "Patch" }` | 201, policyId: `DPOL-0006` (after 5 seed) |
| T2.2 | Create with defaults | `{ name: "Simple" }` | 201, type: `INSTANT`, supportedModule: `All`, relatedType: `No Relation` |
| T2.3 | Create empty name | `{ name: "" }` | 400: "Name is required" |
| T2.4 | Create invalid type | `{ name: "Bad", type: "WEEKLY" }` | 400: enum error listing `INSTANT, SCHEDULE` |
| T2.5 | Create wrong case supportedModule | `{ name: "Bad", supportedModule: "ALL" }` | 400: enum error listing `All, Patch, Update, Security` |
| T2.6 | Create wrong case relatedType | `{ name: "Bad", relatedType: "NO_RELATION" }` | 400: enum error listing `No Relation, Critical, Important, Optional` |
| T2.7 | Create duplicate name | `{ name: "Immediate Critical" }` (seed exists) | 409 |
| T2.8 | Update type | `PUT { type: "SCHEDULE" }` | 200, type updated |
| T2.9 | Update name | `PUT { name: "Renamed Policy" }` | 200 |
| T2.10 | Update non-existent | `PUT /deployment-policies/bad-id` | 404 |
| T2.11 | Delete policy | `DELETE /deployment-policies/:id` | 204 |
| T2.12 | Delete non-existent | `DELETE /deployment-policies/bad-id` | 404 |
| T2.13 | List paginated | `GET ?page=1&limit=3` | 200, 3 results, meta.total >= 5 |
| T2.14 | List filter by type | `GET ?type=INSTANT` | 200, only INSTANT policies |
| T2.15 | Get by policyId | `GET /deployment-policies/DPOL-0001` | 200, "Immediate Critical" |
| T2.16 | Get by UUID | `GET /deployment-policies/:uuid` | 200, same policy |
| T2.17 | Cross-endpoint consistency | Create via settings route, read via jobs route | Same data returned |
| T2.18 | PolicyId auto-increment | Create two policies in sequence | `DPOL-0006`, `DPOL-0007` |
| T2.19 | RBAC: user denied | User role, `POST /settings/deployment-policies` | 403 |
| T2.20 | RBAC: admin allowed | Admin role, `DELETE /settings/deployment-policies/:id` | 204 |

---

### R3: Patch Preferences Backend Implementation (P0 — Must Have)

Implement the complete backend for Patch Preferences to match the existing frontend contract.

**5.3.1 Storage Strategy**

Use the existing `Setting` model (generic key-value store) with category `patch-preferences`. This follows the same pattern already used by Vulnerability Preferences (`vulnerability-db-sync` category).

Store as a **single JSON record** for atomicity:

```typescript
// Single setting record:
{
  key: 'patch-preferences',
  value: {
    enablePatching: true,
    corridorOnlyApprovedPatch: false,
    patchSyncForOS: ['Windows', 'Ubuntu', 'macOS', 'Red Hat', 'CentOS', 'Debian'],
    patchApprovalPolicy: 'ManuallyApproves',
    enableThirdPartyPatching: false,
    patchApprovalScheduleTime: '02:00:00',
    scheduleTime: '03:00:00',
    zeroTouchDeploymentScheduleTime: '04:00:00',
    lastSyncedAt: null,
  },
  category: 'patch-preferences'
}
```

**5.3.2 Default Values**

Seed the database with sensible defaults on `db-seed`:

```typescript
const defaultPatchPreferences = {
  enablePatching: true,
  corridorOnlyApprovedPatch: false,
  patchSyncForOS: ['Windows'],
  patchApprovalPolicy: 'ManuallyApproves' as const,
  enableThirdPartyPatching: false,
  patchApprovalScheduleTime: '02:00:00',
  scheduleTime: '03:00:00',
  zeroTouchDeploymentScheduleTime: '04:00:00',
  lastSyncedAt: null,
};
```

**5.3.3 Routes**

```typescript
// GET  /v1/settings/patch-preferences           → view
// PUT  /v1/settings/patch-preferences           → edit
// POST /v1/settings/patch-preferences/sync      → edit (trigger sync)
```

All protected by `checkPermission('settings', 'view'|'edit')`.

**5.3.4 Service Methods**

```typescript
async getPatchPreference(): Promise<PatchPreferenceResponse> {
  // Fetch from Setting table by key 'patch-preferences'
  // If not found, return defaults (auto-seed on first access)
  // Transform: add synthetic `id` (the Setting record UUID), `createdAt`
}

async updatePatchPreference(input: UpdatePatchPreferenceInput): Promise<PatchPreferenceResponse> {
  // Upsert Setting record with key 'patch-preferences'
  // Merge input with existing values (PATCH semantics — only update provided fields)
  // Validate time format (HH:mm:ss) — already handled by Zod
  // Return updated preferences
}

async syncPatchNow(): Promise<{ message: string; syncedAt: string }> {
  // Update lastSyncedAt to current timestamp
  // In Pipeline 3, this will also trigger actual patch sync job via BullMQ
  // For now, just update the timestamp and return success
}
```

**5.3.5 Enhanced Validation**

Update the existing Zod schema with tighter constraints:

```typescript
const validOSOptions = ['Windows', 'Ubuntu', 'macOS', 'Red Hat', 'CentOS', 'Debian', 'SUSE', 'Fedora', 'Oracle Linux'] as const;

export const updatePatchPreferenceSchema = z.object({
  enablePatching: z.boolean().optional(),
  corridorOnlyApprovedPatch: z.boolean().optional(),
  patchSyncForOS: z.array(z.enum(validOSOptions)).min(0).optional(),
  patchApprovalPolicy: z.enum(['PreApproved', 'ManuallyApproves', 'TestAndApprove']).optional(),
  enableThirdPartyPatching: z.boolean().optional(),
  patchApprovalScheduleTime: z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Must be valid time in HH:mm:ss format (00:00:00 - 23:59:59)')
    .optional(),
  scheduleTime: z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Must be valid time in HH:mm:ss format (00:00:00 - 23:59:59)')
    .optional(),
  zeroTouchDeploymentScheduleTime: z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Must be valid time in HH:mm:ss format (00:00:00 - 23:59:59)')
    .optional(),
});
```

**Acceptance Criteria (R3):**

- [ ] `GET /v1/settings/patch-preferences` returns current preferences (or defaults on fresh DB)
- [ ] Response shape matches `PatchPreferenceResponse` shared type exactly: `{ id, enablePatching, corridorOnlyApprovedPatch, patchSyncForOS, patchApprovalPolicy, enableThirdPartyPatching, patchApprovalScheduleTime, scheduleTime, zeroTouchDeploymentScheduleTime, lastSyncedAt, createdAt }`
- [ ] `GET` on fresh database returns sensible defaults (not 404, not empty, not error)
- [ ] `PUT /v1/settings/patch-preferences` with `{ enablePatching: false }` updates only that field, preserves all others
- [ ] `PUT` with `{ patchApprovalPolicy: "TestAndApprove" }` updates policy correctly
- [ ] `PUT` with `{ patchSyncForOS: ["Windows", "Ubuntu", "macOS"] }` updates OS list
- [ ] `PUT` with `{ patchSyncForOS: ["InvalidOS"] }` returns 400 Zod enum error
- [ ] `PUT` with `{ scheduleTime: "25:00:00" }` returns 400 (invalid time — 25 > 23)
- [ ] `PUT` with `{ scheduleTime: "02:60:00" }` returns 400 (invalid minutes — 60 > 59)
- [ ] `PUT` with `{ scheduleTime: "02:00" }` returns 400 (wrong format — missing seconds)
- [ ] `PUT` with `{ patchApprovalPolicy: "AutoApprove" }` returns 400 Zod enum error
- [ ] `PUT` with all fields returns 200 with all fields updated
- [ ] `PUT` is idempotent — setting same values twice produces same result
- [ ] `POST /v1/settings/patch-preferences/sync` returns `{ message: "Patch sync triggered", syncedAt: "ISO timestamp" }`
- [ ] After sync, `GET` shows updated `lastSyncedAt` timestamp
- [ ] Multiple syncs update `lastSyncedAt` to most recent timestamp
- [ ] `GET` after backend restart returns persisted preferences (not defaults)
- [ ] Seed script creates default patch preferences
- [ ] Seed script is idempotent — running twice doesn't duplicate or overwrite user changes
- [ ] RBAC: user role gets 403 on `PUT` and `POST /sync`
- [ ] RBAC: user role with `settings: { view: true }` can `GET` patch preferences
- [ ] RBAC: admin can perform all operations

**Test Cases (R3):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T3.1 | Get defaults (fresh DB) | `GET /patch-preferences` | 200, defaults with `enablePatching: true` |
| T3.2 | Update single field | `PUT { enablePatching: false }` | 200, only `enablePatching` changed |
| T3.3 | Update approval policy | `PUT { patchApprovalPolicy: "PreApproved" }` | 200, policy updated |
| T3.4 | Update OS list | `PUT { patchSyncForOS: ["Windows", "macOS"] }` | 200, OS list updated |
| T3.5 | Update to empty OS list | `PUT { patchSyncForOS: [] }` | 200, empty array saved |
| T3.6 | Invalid OS value | `PUT { patchSyncForOS: ["BeOS"] }` | 400: enum error |
| T3.7 | Invalid time format - no seconds | `PUT { scheduleTime: "02:00" }` | 400: regex error |
| T3.8 | Invalid time - hour 25 | `PUT { scheduleTime: "25:00:00" }` | 400: "Must be valid time" |
| T3.9 | Invalid time - minute 60 | `PUT { scheduleTime: "02:60:00" }` | 400 |
| T3.10 | Valid edge time - midnight | `PUT { scheduleTime: "00:00:00" }` | 200 |
| T3.11 | Valid edge time - end of day | `PUT { scheduleTime: "23:59:59" }` | 200 |
| T3.12 | Invalid approval policy | `PUT { patchApprovalPolicy: "AutoApprove" }` | 400: enum error |
| T3.13 | Update all fields | `PUT { enablePatching: true, corridorOnlyApprovedPatch: true, patchSyncForOS: ["Ubuntu"], patchApprovalPolicy: "TestAndApprove", enableThirdPartyPatching: true, patchApprovalScheduleTime: "01:00:00", scheduleTime: "02:00:00", zeroTouchDeploymentScheduleTime: "03:00:00" }` | 200, all updated |
| T3.14 | Sync now | `POST /patch-preferences/sync` | 200, `{ message, syncedAt }` |
| T3.15 | Sync updates lastSyncedAt | `POST sync`, then `GET` | `lastSyncedAt` is recent ISO timestamp |
| T3.16 | Idempotent PUT | Same PUT twice | Both return 200, same result |
| T3.17 | Persistence across restart | `PUT`, restart backend, `GET` | Updated values persisted |
| T3.18 | RBAC: user denied PUT | User role | 403 |
| T3.19 | RBAC: user allowed GET | User role with settings.view | 200 |
| T3.20 | RBAC: user denied sync | User role | 403 |
| T3.21 | Empty body PUT | `PUT {}` | 200, no changes (all fields optional) |
| T3.22 | Extra fields ignored | `PUT { enablePatching: true, unknownField: "x" }` | 200, extra field stripped |
| T3.23 | Enable third-party toggle | `PUT { enableThirdPartyPatching: true }` then GET | `enableThirdPartyPatching: true` |

---

### R4: Distribution Server Full Implementation (P0 — Must Have)

Build the complete Distribution Server feature from the database layer up.

**5.4.1 Prisma Schema**

```prisma
model DistributionServer {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  location    String?
  url         String
  version     String?
  status      String   @default("Active")  // Active | Inactive | Maintenance
  createdBy   String?  @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@map("distribution_servers")
}
```

**5.4.2 Migration**

Create migration `YYYYMMDD_add_distribution_servers` that creates the `distribution_servers` table.

**5.4.3 Validators**

Update existing validators in `settings.validators.ts` (they already exist but need enhancement):

```typescript
export const createDistributionServerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  description: z.string().max(500).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  url: z.string().url('Must be a valid URL'),
  version: z.string().max(50).optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Maintenance']).default('Active'),
});

export const updateDistributionServerSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  url: z.string().url('Must be a valid URL').optional(),
  version: z.string().max(50).optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Maintenance']).optional(),
});
```

**5.4.4 Routes**

```typescript
router.get('/distribution-servers', checkPermission('settings', 'view'),
  validateQuery(paginationSchema), settingsController.listDistributionServers);
router.get('/distribution-servers/:id', checkPermission('settings', 'view'),
  validateParams(idParamSchema), settingsController.getDistributionServer);
router.post('/distribution-servers', checkPermission('settings', 'add'),
  validateBody(createDistributionServerSchema), settingsController.createDistributionServer);
router.put('/distribution-servers/:id', checkPermission('settings', 'edit'),
  validateParams(idParamSchema), validateBody(updateDistributionServerSchema),
  settingsController.updateDistributionServer);
router.delete('/distribution-servers/:id', checkPermission('settings', 'delete'),
  validateParams(idParamSchema), settingsController.deleteDistributionServer);
```

**5.4.5 Service Methods**

```typescript
async listDistributionServers(query: PaginationInput) {
  // Paginated list with search (name, location, url), sort, filter by status
}

async getDistributionServer(id: string) {
  // Find by UUID. Return 404 if not found.
}

async createDistributionServer(data: CreateDistributionServerInput, userId?: string) {
  // Check unique name (case-insensitive) → 409 if duplicate
  // Set createdBy to userId
  // Validate URL format (already done by Zod, but double-check)
  // Create and return
}

async updateDistributionServer(id: string, data: UpdateDistributionServerInput) {
  // Find existing → 404 if not found
  // If name changed, check unique → 409 if duplicate
  // Update and return
}

async deleteDistributionServer(id: string) {
  // Find existing → 404 if not found
  // Delete and return 204
}
```

**5.4.6 Seed Data**

```typescript
const distributionServers = [
  {
    name: 'Primary Hub',
    description: 'Main distribution server in US-East datacenter',
    location: 'US-East',
    url: 'https://patch-hub-east.internal.company.com',
    version: '2.1.0',
    status: 'Active',
  },
  {
    name: 'EU Relay',
    description: 'European distribution point for EU-based agents',
    location: 'EU-West (Frankfurt)',
    url: 'https://patch-relay-eu.internal.company.com',
    version: '2.1.0',
    status: 'Active',
  },
  {
    name: 'APAC Relay',
    description: 'Asia-Pacific distribution point',
    location: 'AP-Southeast (Singapore)',
    url: 'https://patch-relay-apac.internal.company.com',
    version: '2.0.5',
    status: 'Active',
  },
  {
    name: 'Staging Server',
    description: 'Pre-production testing server for patch validation',
    location: 'US-West',
    url: 'https://patch-staging.internal.company.com',
    version: '2.2.0-beta',
    status: 'Maintenance',
  },
  {
    name: 'Legacy Relay',
    description: 'Deprecated server pending decommission',
    location: 'US-Central',
    url: 'https://patch-legacy.internal.company.com',
    version: '1.9.3',
    status: 'Inactive',
  },
];
```

**5.4.7 Fix Shared Types**

Update `DistributionServerResponse` in `shared/types/api.ts`:

```typescript
export interface DistributionServerResponse {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  url: string;
  version: string | null;
  status: 'Active' | 'Inactive' | 'Maintenance';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Acceptance Criteria (R4):**

- [ ] `npx prisma migrate deploy` creates `distribution_servers` table without error
- [ ] Table has columns: `id` (UUID PK), `name` (unique), `description`, `location`, `url`, `version`, `status`, `created_by`, `created_at`, `updated_at`
- [ ] `POST /v1/settings/distribution-servers` with valid data returns 201
- [ ] `POST` with empty body returns 400 with Zod error for required `name` and `url`
- [ ] `POST` with `url: "not-a-url"` returns 400 "Must be a valid URL"
- [ ] `POST` with `url: "ftp://server.com"` returns 400 (only http/https valid — Zod `.url()` allows this; if needed, add regex for http/https only)
- [ ] `POST` with duplicate name returns 409 "Distribution server with name 'X' already exists"
- [ ] `POST` with duplicate name (case-insensitive) returns 409
- [ ] `POST` with valid data sets `createdBy` to requesting user's UUID
- [ ] `POST` without explicit `status` defaults to `Active`
- [ ] `POST` with `status: "Unknown"` returns 400 Zod enum error
- [ ] `GET /v1/settings/distribution-servers` returns paginated list
- [ ] `GET` with `?search=relay` matches name, location, or description
- [ ] `GET` with `?sortBy=name&sortOrder=asc` sorts correctly
- [ ] `GET /v1/settings/distribution-servers/:id` returns single server
- [ ] `GET` on non-existent ID returns 404
- [ ] `PUT /v1/settings/distribution-servers/:id` with partial update returns 200
- [ ] `PUT` with `status: "Maintenance"` updates status
- [ ] `PUT` with name change to existing name returns 409
- [ ] `PUT` on non-existent ID returns 404
- [ ] `DELETE /v1/settings/distribution-servers/:id` returns 204
- [ ] `DELETE` on non-existent ID returns 404
- [ ] Seed script creates 5 distribution servers
- [ ] Seed script is idempotent (running twice doesn't create duplicates)
- [ ] `DistributionServerResponse` shared type matches actual API response
- [ ] RBAC: user role denied all CUD operations (403)
- [ ] RBAC: user role with `settings: { view: true }` can GET
- [ ] RBAC: admin can perform all operations

**Test Cases (R4):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T4.1 | Create valid server | `{ name: "Test Server", url: "https://test.com" }` | 201, `status: "Active"`, `createdBy` set |
| T4.2 | Create with all fields | `{ name: "Full", description: "Desc", location: "US", url: "https://full.com", version: "1.0", status: "Active" }` | 201 |
| T4.3 | Create empty name | `{ name: "", url: "https://x.com" }` | 400: "Name is required" |
| T4.4 | Create no URL | `{ name: "No URL" }` | 400: required `url` |
| T4.5 | Create invalid URL | `{ name: "Bad", url: "not-a-url" }` | 400: "Must be a valid URL" |
| T4.6 | Create duplicate name | `{ name: "Primary Hub" }` (seed exists) | 409 |
| T4.7 | Create duplicate case-insensitive | `{ name: "primary hub", url: "https://x.com" }` | 409 |
| T4.8 | Create with status | `{ name: "Maint", url: "https://x.com", status: "Maintenance" }` | 201, `status: "Maintenance"` |
| T4.9 | Create invalid status | `{ name: "Bad", url: "https://x.com", status: "Down" }` | 400: enum error |
| T4.10 | List paginated | `GET ?page=1&limit=3` | 200, 3 results, meta.total >= 5 |
| T4.11 | List search | `GET ?search=relay` | 200, matches "EU Relay" and "APAC Relay" |
| T4.12 | List sort | `GET ?sortBy=name&sortOrder=asc` | 200, alphabetical |
| T4.13 | Get by ID | `GET /:existingId` | 200, full server object |
| T4.14 | Get non-existent | `GET /nonexistent-uuid` | 404 |
| T4.15 | Update status | `PUT { status: "Inactive" }` | 200, status changed |
| T4.16 | Update name | `PUT { name: "Renamed Server" }` | 200 |
| T4.17 | Update name to duplicate | `PUT { name: "EU Relay" }` (on different server) | 409 |
| T4.18 | Update non-existent | `PUT /bad-id { name: "X" }` | 404 |
| T4.19 | Delete server | `DELETE /:id` | 204 |
| T4.20 | Delete non-existent | `DELETE /bad-id` | 404 |
| T4.21 | RBAC: user denied create | User role | 403 |
| T4.22 | RBAC: admin allowed | Admin role | 201 |
| T4.23 | Name max length | `{ name: "a".repeat(256), url: "https://x.com" }` | 400: max length |
| T4.24 | Description max length | `{ name: "T", url: "https://x.com", description: "a".repeat(501) }` | 400 |
| T4.25 | Version max length | `{ name: "T", url: "https://x.com", version: "a".repeat(51) }` | 400 |

---

### R5: End-to-End Validation Script (P0 — Must Have)

Create a comprehensive validation script that proves all 4 sub-features work end-to-end with realistic data, covering happy paths, error cases, edge cases, and cross-feature interactions.

**Location**: `backend/scripts/validate-pipeline-2f.ts`

**Script Flow:**

```
1. Preflight: Verify backend is running (health check at localhost:3000)
2. Setup: Login as admin, capture auth token
3. Phase 1 — Computer Groups: CRUD + validation + edge cases
4. Phase 2 — Deployment Policies: CRUD + validation + consolidation check
5. Phase 3 — Patch Preferences: GET defaults + PUT updates + sync trigger
6. Phase 4 — Distribution Servers: CRUD + validation + edge cases
7. Phase 5 — Cross-Feature: Realistic admin workflow scenarios
8. Phase 6 — RBAC: Verify non-admin users are denied
9. Cleanup: Delete all test data (try/finally)
10. Report: Print pass/fail summary
```

**Validation Scenarios (65+ total):**

| # | Phase | Scenario | Action | Expected |
|---|-------|----------|--------|----------|
| **Phase 1: Computer Groups** | | | | |
| V1 | CG | List computer groups (seeded) | `GET /settings/computer-groups` | 200, includes seed groups |
| V2 | CG | Create group with valid endpoints | `POST { name: "2F-Test-Group", endpoints: [assetId] }` | 201, endpointCount: 1 |
| V3 | CG | Get created group | `GET /settings/computer-groups/:id` | 200, name matches |
| V4 | CG | Create group - empty name rejected | `POST { name: "" }` | 400 |
| V5 | CG | Create group - duplicate name rejected | `POST { name: "2F-Test-Group" }` | 409 |
| V6 | CG | Create group - invalid endpoint UUID | `POST { name: "Bad", endpoints: ["xxx"] }` | 400 |
| V7 | CG | Create group - non-existent asset UUID | `POST { name: "Bad", endpoints: ["valid-format-uuid"] }` | 400 |
| V8 | CG | Update group name | `PUT { name: "2F-Test-Renamed" }` | 200 |
| V9 | CG | Update group endpoints | `PUT { endpoints: [] }` | 200, endpointCount: 0 |
| V10 | CG | Search groups | `GET ?search=2F-Test` | 200, finds test group |
| V11 | CG | Paginate groups | `GET ?page=1&limit=2` | 200, meta present |
| V12 | CG | Delete group | `DELETE /computer-groups/:id` | 204 |
| V13 | CG | Delete non-existent | `DELETE /computer-groups/bad-uuid` | 404 |
| V14 | CG | Available endpoints | `GET /computer-groups/available-endpoints` | 200, array of assets |
| **Phase 2: Deployment Policies** | | | | |
| V15 | DP | List policies (seeded) | `GET /settings/deployment-policies` | 200, >= 5 policies |
| V16 | DP | Create policy | `POST { name: "2F-Test-Policy", type: "SCHEDULE", supportedModule: "Patch" }` | 201 |
| V17 | DP | Verify policyId format | Check created policy | `DPOL-XXXX` format |
| V18 | DP | Get by UUID | `GET /settings/deployment-policies/:uuid` | 200 |
| V19 | DP | Get by policyId | `GET /deployment-policies/DPOL-XXXX` (jobs route) | 200, same data |
| V20 | DP | Cross-endpoint consistency | Compare settings vs jobs response | Identical data |
| V21 | DP | Create - invalid type rejected | `POST { name: "X", type: "WEEKLY" }` | 400 |
| V22 | DP | Create - wrong case supportedModule | `POST { name: "X", supportedModule: "ALL" }` | 400 |
| V23 | DP | Create - duplicate name rejected | `POST { name: "2F-Test-Policy" }` | 409 |
| V24 | DP | Update policy type | `PUT { type: "INSTANT" }` | 200 |
| V25 | DP | Filter by type | `GET ?type=SCHEDULE` | 200, only SCHEDULE policies |
| V26 | DP | Delete policy | `DELETE /settings/deployment-policies/:id` | 204 |
| **Phase 3: Patch Preferences** | | | | |
| V27 | PP | Get defaults | `GET /settings/patch-preferences` | 200, default values present |
| V28 | PP | Verify default shape | Check response fields | All fields present per PatchPreferenceResponse |
| V29 | PP | Update enablePatching | `PUT { enablePatching: false }` | 200, only that field changed |
| V30 | PP | Update approval policy | `PUT { patchApprovalPolicy: "TestAndApprove" }` | 200 |
| V31 | PP | Update OS list | `PUT { patchSyncForOS: ["Windows", "Ubuntu", "macOS"] }` | 200 |
| V32 | PP | Invalid OS rejected | `PUT { patchSyncForOS: ["BeOS"] }` | 400 |
| V33 | PP | Invalid time format | `PUT { scheduleTime: "25:00:00" }` | 400 |
| V34 | PP | Valid edge time (midnight) | `PUT { scheduleTime: "00:00:00" }` | 200 |
| V35 | PP | Valid edge time (23:59:59) | `PUT { scheduleTime: "23:59:59" }` | 200 |
| V36 | PP | Invalid approval policy | `PUT { patchApprovalPolicy: "AutoApprove" }` | 400 |
| V37 | PP | Sync now | `POST /settings/patch-preferences/sync` | 200, syncedAt present |
| V38 | PP | Verify lastSyncedAt updated | `GET` after sync | lastSyncedAt is recent |
| V39 | PP | Third-party toggle | `PUT { enableThirdPartyPatching: true }`, then GET | true persisted |
| V40 | PP | Corridor approved toggle | `PUT { corridorOnlyApprovedPatch: true }`, then GET | true persisted |
| V41 | PP | Update all fields | PUT with all 8 fields | 200, all updated |
| V42 | PP | Restore defaults | PUT with default values | 200, back to defaults |
| **Phase 4: Distribution Servers** | | | | |
| V43 | DS | List servers (seeded) | `GET /settings/distribution-servers` | 200, >= 5 servers |
| V44 | DS | Create server | `POST { name: "2F-Test-Server", url: "https://test-dist.example.com" }` | 201 |
| V45 | DS | Verify defaults | Check created server | `status: "Active"`, `createdBy` set |
| V46 | DS | Get by ID | `GET /settings/distribution-servers/:id` | 200 |
| V47 | DS | Create with all fields | `POST { name: "2F-Full", url: "https://full.com", description: "Full test", location: "US-East", version: "3.0", status: "Maintenance" }` | 201 |
| V48 | DS | Create - invalid URL | `POST { name: "Bad", url: "not-a-url" }` | 400 |
| V49 | DS | Create - duplicate name | `POST { name: "2F-Test-Server" }` | 409 |
| V50 | DS | Create - empty name | `POST { name: "", url: "https://x.com" }` | 400 |
| V51 | DS | Update status | `PUT { status: "Inactive" }` | 200 |
| V52 | DS | Update URL | `PUT { url: "https://updated.example.com" }` | 200 |
| V53 | DS | Invalid status update | `PUT { status: "Down" }` | 400 |
| V54 | DS | Search by location | `GET ?search=US-East` | 200, matches |
| V55 | DS | Paginate | `GET ?page=1&limit=2` | 200, meta present |
| V56 | DS | Delete server | `DELETE /settings/distribution-servers/:id` | 204 |
| V57 | DS | Delete non-existent | `DELETE /settings/distribution-servers/bad-uuid` | 404 |
| **Phase 5: Cross-Feature Workflow** | | | | |
| V58 | XF | Realistic admin workflow: Create group → Create policy → Assign preferences | Sequence of operations | All succeed |
| V59 | XF | Create group with all seeded assets | `POST { endpoints: [all asset IDs from available-endpoints] }` | 201, count matches |
| V60 | XF | Configure full patch management: enable patching + set OS + set schedule + set policy | `PUT patch-preferences with realistic values` | 200, all applied |
| V61 | XF | Create distribution server for each major region | Create US, EU, APAC servers | All 201 |
| V62 | XF | Verify all features persist after sequential creates | GET all endpoints | Data consistent |
| **Phase 6: RBAC Enforcement** | | | | |
| V63 | RBAC | User denied: create computer group | User role, `POST /settings/computer-groups` | 403 |
| V64 | RBAC | User denied: update deployment policy | User role, `PUT /settings/deployment-policies/:id` | 403 |
| V65 | RBAC | User denied: update patch preferences | User role, `PUT /settings/patch-preferences` | 403 |
| V66 | RBAC | User denied: create distribution server | User role, `POST /settings/distribution-servers` | 403 |
| V67 | RBAC | User denied: delete distribution server | User role, `DELETE /settings/distribution-servers/:id` | 403 |
| V68 | RBAC | User denied: trigger patch sync | User role, `POST /settings/patch-preferences/sync` | 403 |

**Acceptance Criteria (R5):**

- [ ] Script runs with: `npx tsx backend/scripts/validate-pipeline-2f.ts`
- [ ] All 68 validation scenarios pass
- [ ] Script creates and cleans up its own test data — no residue after clean run
- [ ] Script uses real HTTP requests to `http://localhost:3000` (not service-layer calls)
- [ ] Each scenario has a named, descriptive label (e.g., `[PASS] V5: CG — Duplicate name rejected — 409`)
- [ ] Failed scenarios show expected vs actual status code and response body snippet
- [ ] Script exits with code 0 on all-pass, code 1 on any failure
- [ ] Script prints summary: `68/68 PASS` or `65/68 PASS, 3 FAIL`
- [ ] Script works on both fresh-seeded and already-populated databases
- [ ] Script handles backend not running: prints clear error and exits 1
- [ ] Test entities use unique prefix (`2f-test-*`) to avoid collisions
- [ ] Cleanup runs even if assertions fail (try/finally pattern)
- [ ] Script completes in under 60 seconds
- [ ] Script reuses admin auth token (single login, not one per scenario)

**Test Cases (R5):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T5.1 | Full script pass | Run on properly configured system | 68/68 PASS, exit 0 |
| T5.2 | Script idempotency | Run twice consecutively | Both runs pass |
| T5.3 | Clean database | Run on fresh DB after `make db-seed` | All pass |
| T5.4 | Backend not running | Stop backend, run script | Clear error, exit 1 |
| T5.5 | No data residue | Run script, check DB for `2f-test-*` | Zero test entities remain |
| T5.6 | Timing under limit | Time the script | < 60 seconds |

---

### Nice-to-Have (P1)

**R6: Computer Group Membership Endpoint**
- `GET /v1/settings/computer-groups/:id/endpoints` — returns full asset details for endpoints in the group (not just UUIDs)
- Useful for the frontend to show endpoint names/IPs in the group detail view

**R7: Deployment Policy Usage Report**
- `GET /v1/settings/deployment-policies/:id/usage` — returns count of deployments/jobs using this policy
- Helps admin understand policy impact before modifying/deleting

**R8: Patch Preference Change History**
- Log every preference change to `AuditLog` with before/after diff
- Resource: `"patch-preferences"`, Action: `UPDATE`

**R9: Distribution Server Health Check**
- `POST /v1/settings/distribution-servers/:id/test` — pings the URL and reports connectivity status
- Returns `{ reachable: boolean, latencyMs: number, error?: string }`

### Future Considerations (P2)

**R10: Dynamic Computer Groups**
- Groups defined by rules (e.g., "all Windows assets in Engineering department")
- Membership auto-updates when assets change
- Requires query-based group definitions stored as JSON

**R11: Distribution Server Load Balancing**
- Agent auto-selects nearest/fastest server
- Health-check heartbeat from each server
- Automatic failover if primary is down

**R12: Patch Preference Profiles**
- Multiple named preference profiles (e.g., "Production", "Staging", "Development")
- Assign profiles to Computer Groups
- Different patch policies for different environments

---

## 6. Success Metrics

| Metric | Target | Measurement | When |
|--------|--------|-------------|------|
| **Validation pass rate** | 68/68 scenarios pass | `validate-pipeline-2f.ts` output | After R5 |
| **Computer Group validation** | 0 invalid groups creatable | Attempt invalid creates via API | After R1 |
| **Deployment Policy consistency** | Settings and jobs routes return identical data | Cross-endpoint comparison in validation script | After R2 |
| **Patch Preferences operational** | GET returns data, PUT persists changes, sync updates timestamp | API calls in validation script | After R3 |
| **Distribution Server CRUD** | Full CRUD with proper validation | 25 test cases pass | After R4 |
| **RBAC enforcement** | 6/6 RBAC scenarios pass (user denied) | Validation script Phase 6 | After all |
| **Seed data quality** | Fresh `db-seed` populates all 4 sub-features | Check after seed | After all |
| **Zero type mismatches** | Shared types match actual API responses | TypeScript compilation + runtime validation | After all |
| **No 500 errors** | All validation errors return 400/404/409, never 500 | Validation script | After all |

---

## 7. Open Questions

| # | Question | Owner | Blocking? | Recommendation |
|---|----------|-------|-----------|----------------|
| Q1 | Should the settings deployment policy routes (`/v1/settings/deployment-policies`) be the primary, or should the jobs route (`/v1/deployment-policies`) be primary? | Engineering | Yes — decide before R2 | **Both stay, share same service.** Frontend uses settings; jobs module has it for internal deployment workflows. Document this dual-access pattern. |
| Q2 | Should Distribution Server `url` validation allow only `https://` or also `http://`? | Engineering | No | **Allow both** for now (internal networks may use HTTP). Add a warning in response if HTTP is used: `"Warning: Distribution server uses unencrypted HTTP"`. |
| Q3 | Should `patchSyncForOS` use a strict enum or free-form strings? | Engineering | Yes — decide before R3 | **Strict enum** (`Windows`, `Ubuntu`, `macOS`, `Red Hat`, `CentOS`, `Debian`, `SUSE`, `Fedora`, `Oracle Linux`). Prevents typos and makes the frontend predictable. |
| Q4 | Should the `POST /settings/patch-preferences/sync` actually trigger a BullMQ job? | Engineering | No | **Not in 2F.** Just update `lastSyncedAt`. Pipeline 3 will wire it to the actual sync job. Document this as a stub. |
| Q5 | What happens to endpoints in a Computer Group when those assets are deleted from the system? | Engineering | No | **Dangling references are acceptable in v1.** The `getAvailableEndpoints` endpoint shows current assets; group membership is an ID list. Frontend can indicate "X of Y endpoints still active" using a set intersection. |
| Q6 | Should deployment policies have a `schedule` field (cron expression or specific datetime) for `SCHEDULE` type? | Engineering | No | **Deferred to Pipeline 3.** Pipeline 2F only stores the policy type. Schedule execution details belong in the deployment engine. |

---

## 8. Timeline Considerations

**Dependencies:**
- Pipeline 2A (RBAC) must be complete — it is (validated 2026-02-13)
- No external dependencies — all code changes are within the backend repo
- Distribution Server requires a Prisma migration (R4) — must be created first

**Suggested Implementation Order:**

```
R4 (Distribution Server schema + migration)   ← Must be first (DB change)
    ↓
R1 (Computer Groups hardening)  ← Can start after R4 migration
R2 (Deployment Policy consolidation)  ← Can run in PARALLEL with R1
R3 (Patch Preferences backend)  ← Can run in PARALLEL with R1/R2
    ↓
R5 (Validation Script)  ← Must be LAST (validates everything)
```

**Parallelizable Work:**
- R1 (Computer Groups), R2 (Deployment Policies), R3 (Patch Preferences) are independent of each other
- R4 migration must complete before R4 service implementation, but R1/R2/R3 can proceed immediately
- R5 validation script can be started (skeleton + Phase 6 RBAC tests) while R1-R4 are in progress

**Estimated Scope:**

| Requirement | Files Modified | Files Created | Complexity |
|-------------|---------------|--------------|------------|
| R1: Computer Groups | 4 (validators, routes, service, shared types) | 0 | Medium |
| R2: Deployment Policies | 5 (settings routes/service, jobs validators, seed, shared types) | 0 | Medium-High |
| R3: Patch Preferences | 4 (routes, controller, service, seed) | 0 | Medium |
| R4: Distribution Server | 5 (schema, routes, controller, service, seed) | 1 (migration) | Medium |
| R5: Validation Script | 0 | 1 (validate-pipeline-2f.ts) | Medium |
| **Total** | ~15 modified | ~2 new | |

**Risk Factors:**
- R2 (Deployment Policy consolidation) is the riskiest — touching two modules' shared data and potentially breaking the jobs module's existing E2E tests
- R4 (Distribution Server migration) — new table, but low risk since no existing data
- R3 (Patch Preferences) — new service methods but well-defined contract from frontend types

---

## Appendix A: Files to Modify

| File | Changes | Risk |
|------|---------|------|
| `backend/src/db/prisma/schema.prisma` | Add `DistributionServer` model | Medium — schema change |
| `backend/src/db/prisma/migrations/YYYYMMDD_add_distribution_servers/` | **NEW**: Create distribution_servers table | Low — new table |
| `backend/src/db/prisma/seed.ts` | Add distribution servers seed, patch preferences seed, fix deployment policy policyId format | Medium |
| `backend/src/modules/settings/settings.routes.ts` | Wire validators to CG/DP routes, add patch preference + distribution server routes | Medium |
| `backend/src/modules/settings/settings.controller.ts` | Add patch preference + distribution server controller methods | Medium |
| `backend/src/modules/settings/settings.service.ts` | Harden CG, remove DP duplicate, add patch prefs + dist server service methods | High |
| `backend/src/modules/settings/settings.validators.ts` | Fix CG validator (criteria→endpoints), enhance DP validator, tighten patch prefs, enhance dist server | Medium |
| `backend/src/modules/jobs/jobs.validators.ts` | Fix enum case (ALL→All, etc.) | Low |
| `backend/src/modules/jobs/deployment-policy-crud.service.ts` | Fix policyId format to DPOL-XXXX | Low |
| `shared/types/api.ts` | Fix `ComputerGroupResponse`, `DistributionServerResponse` | Low |
| `backend/src/shared/types/api.types.ts` | Mirror shared types updates | Low |
| `backend/scripts/validate-pipeline-2f.ts` | **NEW**: Validation script (68 scenarios) | Medium |

**Total files**: ~12 modified, ~2 new

---

## Appendix B: Current vs Target State Summary

| Sub-Feature | Current State | Target State |
|-------------|--------------|--------------|
| **Computer Groups** | Routes exist, no validation wired, type mismatch (criteria vs endpoints), no pagination, no unique name | Full Zod validation, endpoint UUID verification, unique names, pagination, createdBy populated |
| **Deployment Policies** | Dual implementation (jobs + settings), enum case mismatch, different policyId formats, no validation on settings routes | Single shared service, consistent enums, unified DPOL-XXXX format, validation on all routes |
| **Patch Preferences** | Frontend complete, backend zero | Full GET/PUT/sync endpoints, Setting-based storage, defaults seeded, strict time and enum validation |
| **Distribution Server** | No Prisma model, no backend at all, frontend complete | Full Prisma model, migration, CRUD endpoints, unique names, status tracking, 5 seed servers |

---

## Appendix C: Complete Test Case Summary

| Requirement | Test Cases | Categories |
|-------------|-----------|------------|
| R1: Computer Groups | T1.1–T1.23 (23 tests) | Validation, CRUD, pagination, search, RBAC, edge cases |
| R2: Deployment Policies | T2.1–T2.20 (20 tests) | Validation, consolidation, enums, policyId, cross-endpoint |
| R3: Patch Preferences | T3.1–T3.23 (23 tests) | Defaults, updates, time validation, OS enum, sync, RBAC |
| R4: Distribution Server | T4.1–T4.25 (25 tests) | Schema, CRUD, URL validation, unique name, status, RBAC |
| R5: Validation Script | T5.1–T5.6 (6 tests) | Script execution, idempotency, cleanup, timing |
| **TOTAL** | **97 test cases** | |

| Validation Script | V1–V68 (68 scenarios) | CG, DP, PP, DS, cross-feature, RBAC |
