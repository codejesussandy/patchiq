# PRD A.1 — Create Missing API Routes

> **Sprint:** 1 | **Track:** A (Backend & Platform) | **Priority:** Must Have (P0)
> **Owner:** Dev 1 | **Status:** `PENDING`
> **Estimated Effort:** 3-4 days | **Target:** Week 1

---

## 1. Problem Statement

8 frontend service calls hit backend endpoints that don't exist. Each missing route causes a **user-facing crash** (unhandled 404) or silent data failure when the corresponding page or action is triggered. These span three critical domains: patch endpoint scanning, tag bulk operations, and category-based asset listing.

**Who is affected:** Every user navigating to patch details (endpoint tab), using bulk tag operations, or browsing assets by category/subcategory.

**Cost of not solving:** The platform is visually broken on multiple pages. Users see error screens, blank data panels, and failed bulk actions. This is the single highest-impact item in Sprint 1 and the **critical path blocker** for B.1 (frontend URL fixes).

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Eliminate all 404 errors from frontend service calls | 0 unhandled 404s on any page that calls these 8 endpoints |
| G2 | Return real data (not mocks/stubs) from every new endpoint | Manual verification: each endpoint returns Prisma-backed data |
| G3 | Maintain type safety and validation consistency | Every endpoint has Zod validation; `make check-all` passes |
| G4 | Unblock B.1 (frontend URL alignment) | Dev 2 can start B.1 immediately after A.1 merges to main |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| NG1 | Real-time background scanning via BullMQ | `scanEndpoints` writes results synchronously for now. Background job is a Sprint 2 concern (A.3 CVE sync). |
| NG2 | Pagination on new list endpoints | Category/subcategory asset lists and tag search return full result sets. Pagination can be added when datasets grow. |
| NG3 | Frontend URL changes | That is B.1 (Track B). Backend creates the routes; frontend adapts later. |
| NG4 | New shared types in `/shared/types/` | Reuse existing Prisma models and transform at the API layer. No new type definitions needed. |
| NG5 | Performance optimization (indexes, caching) | A.4 handles missing indexes separately. These routes use standard Prisma queries. |

---

## 4. User Stories

| # | Story | Priority |
|---|-------|----------|
| US1 | As a patch admin, I want to scan endpoints against a specific patch so that I can see which assets are vulnerable/applicable. | P0 |
| US2 | As a patch admin, I want to view the list of endpoints affected by a patch so that I can plan deployments. | P0 |
| US3 | As a patch admin, I want to view endpoint details from the patch context so that I can assess individual asset risk. | P0 |
| US4 | As an asset admin, I want to bulk-assign tags to multiple assets so that I can organize inventory efficiently. | P0 |
| US5 | As an asset admin, I want to bulk-remove tags from multiple assets so that I can correct tagging mistakes. | P0 |
| US6 | As an asset admin, I want to search tags by name so that I can quickly find and apply the right tag. | P0 |
| US7 | As an asset admin, I want to list all assets in a category so that I can review assets grouped by type. | P0 |
| US8 | As an asset admin, I want to list all assets in a subcategory so that I can drill down into specific asset groups. | P0 |

---

## 5. Requirements

### 5.1 Route Inventory — What Exists vs. What's Missing

| # | Endpoint | Route | Controller | Service | Validator |
|---|----------|-------|------------|---------|-----------|
| R1 | `POST /v1/patches/:id/scan-endpoints` | MISSING | MISSING | EXISTS but **needs controller transform** (`patches.service.ts:522`) | EXISTS (`patches.validator.ts:128`) |
| R2 | `GET /v1/patches/:id/endpoints` | MISSING | MISSING | EXISTS but **needs rewrite** (`patches.service.ts:495`) | Param schema exists |
| R3 | `GET /v1/endpoints/:id` | MISSING | MISSING | Reuse `getAssetFull` (`assets.controller.ts:234`) | Param schema exists |
| R4 | `POST /v1/tags/bulk-assign` | WRONG URL (`/assets/bulk-tags`) | EXISTS (`assets.controller.ts:190`) | EXISTS (`assets.service.ts:413`) | EXISTS (`assets.validators.ts`) |
| R5 | `POST /v1/tags/bulk-remove` | MISSING | MISSING | MISSING | MISSING |
| R6 | `GET /v1/tags/search` | MISSING | MISSING | MISSING | MISSING |
| R7 | `GET /v1/categories/:id/assets` | MISSING | MISSING | MISSING | Param schema exists |
| R8 | `GET /v1/subcategories/:id/assets` | MISSING | MISSING | MISSING | Param schema exists |

### 5.2 Detailed Requirements

---

#### R1: `POST /v1/patches/:id/scan-endpoints` — Scan Endpoints Against Patch

**Frontend caller:** `patch.service.ts:88` — `scanEndpoints(patchId, { scope, endpointIds })`

**Request:**
```typescript
POST /v1/patches/:id/scan-endpoints
Body: {
  scope: 'ALL_END_POINTS' | 'SPECIFIC_GROUPS',
  endpointIds?: string[]  // Required when scope = 'SPECIFIC_GROUPS'
}
```

**Response:** `{ success: true, data: { scannedCount: number, missingCount: number, notApplicableCount: number } }`

**Implementation:**
- Route in `patches.routes.ts` after line 131 (after vulnerabilities route)
- New controller method `scanEndpoints` — extracts params + body, calls service, **transforms response fields**, returns via `sendSuccess()`
- Service method already exists at `patches.service.ts:522` — matches assets against patch CVEs + affected products, creates `AssetVulnerability` records for missing patches
- Validator already exists at `patches.validator.ts:128` — `scanEndpointsSchema`

**What to build:** Route + Controller with field transform. Service + Validator already exist.

> **IMPORTANT — Service Response Mismatch (found during verification):**
> The existing service returns `{ message, patchId, scope, assetsScanned, missing, notApplicable }`.
> The controller **must transform** these fields for the frontend:
> ```typescript
> export async function scanEndpoints(req: Request, res: Response, next: NextFunction) {
>   try {
>     const { id } = req.params;
>     const result = await patchesService.scanEndpoints(id, req.body);
>     // Transform service response to frontend-expected shape
>     sendSuccess(res, {
>       scannedCount: result.assetsScanned,
>       missingCount: result.missing,
>       notApplicableCount: result.notApplicable,
>     });
>   } catch (error) {
>     next(error);
>   }
> }
> ```

**Acceptance Criteria:**
- [x] `POST /v1/patches/:id/scan-endpoints` with scope `ALL_END_POINTS` scans all non-retired assets
- [x] `POST /v1/patches/:id/scan-endpoints` with scope `SPECIFIC_GROUPS` + `endpointIds` scans only specified assets
- [x] Returns `{ success: true, data: { scannedCount, missingCount, notApplicableCount } }`
- [x] Returns 404 if patch ID doesn't exist
- [x] Returns 400 if body fails Zod validation (missing scope, invalid enum value)
- [x] Only scans assets within the authenticated user's organization
- [x] Follows standard `{ success, data }` envelope

---

#### R2: `GET /v1/patches/:id/endpoints` — List Endpoints Affected by Patch

**Frontend caller:** `patch.service.ts:97` — `getEndpoints(patchId)` expects `Endpoint[]`

**Expected response shape** (from `frontend/src/types/patch.types.ts:92-98`):
```typescript
type Endpoint = {
  id: string;
  name: string;
  os: string;
  status: string;
  lastSeen: string;
}
```

**Request:** `GET /v1/patches/:id/endpoints`

**Response:** `{ success: true, data: Endpoint[] }`

**Implementation:**
- Route in `patches.routes.ts` after the scan-endpoints route
- New controller method `getEndpoints` — extracts patch ID, calls service, returns result
- Service method exists at `patches.service.ts:495` but **must be rewritten** (see below)

**What to build:** Route + Controller + **Service rewrite**.

> **IMPORTANT — Service Logic Bug (found during verification):**
> The existing `getEndpoints()` at `patches.service.ts:495` queries `PatchDeploymentTask` records
> (deployment history) and returns **task IDs** (`t.id`), not **asset IDs** (`t.asset.id`).
> The frontend uses the returned `id` to drill down to `GET /endpoints/:id`, which expects an
> asset ID. This breaks navigation entirely.
>
> **Required fix — rewrite service to query affected assets:**
> ```typescript
> export async function getEndpoints(patchId: string) {
>   const patch = await prisma.patch.findUnique({
>     where: { id: patchId },
>     select: { id: true, cveNumbers: true },
>   });
>   if (!patch) throw new NotFoundError('Patch not found');
>
>   // Find assets with vulnerabilities matching this patch's CVEs
>   const assets = await prisma.asset.findMany({
>     where: {
>       organizationId: undefined, // Set from req.user in controller
>       vulnerabilities: {
>         some: {
>           vulnerability: { cveId: { in: patch.cveNumbers } },
>         },
>       },
>     },
>     select: { id: true, name: true, os: true, status: true, updatedAt: true },
>   });
>
>   return assets.map((a) => ({
>     id: a.id,            // Asset ID — correct for /endpoints/:id drill-down
>     name: a.name,
>     os: a.os || 'Unknown',
>     status: a.status,
>     lastSeen: a.updatedAt.toISOString(),
>   }));
> }
> ```
>
> If the patch has no `cveNumbers`, fall back to matching via `affectedProducts` against
> `asset.software` records. If neither yields results, return empty array.

**Acceptance Criteria:**
- [x] `GET /v1/patches/:id/endpoints` returns array of `{ id, name, os, status, lastSeen }`
- [x] The `id` field is the **asset ID** (not a deployment task ID) — used for `/endpoints/:id` drill-down
- [x] Returns empty array `[]` if no endpoints affected (not 404)
- [x] Returns 404 if patch ID doesn't exist
- [x] Each endpoint object contains real asset data from Prisma
- [x] Only returns assets within the authenticated user's organization
- [x] Follows standard `{ success, data }` envelope

---

#### R3: `GET /v1/endpoints/:id` — Get Endpoint Details

**Frontend caller:** `patch.service.ts:102` — `getEndpointDetails(endpointId)` expects `EndpointDetails`

**Expected response shape** (from `frontend/src/types/patch.types.ts:109-146`):
```typescript
type EndpointDetails = {
  id: string;
  name: string;
  os: string;
  osVersion: string;
  status: 'Online' | 'Offline';
  lastSeen: string;
  ipAddress?: string;
  hostname?: string;
  // ... (full asset detail with patch summary)
}
```

**Request:** `GET /v1/endpoints/:id`

**Response:** `{ success: true, data: EndpointDetails }`

**Implementation:**
- This is a **top-level route** (not nested under `/patches`). Must be mounted in `app.ts` at `/v1/endpoints/:id`.
- Options:
  - **Option A (Recommended):** Add route directly in `assets.routes.ts` as `router.get('/endpoints/:id', ...)` since assets module is mounted at `/v1` (no prefix).
  - **Option B:** Create a thin `endpoints.routes.ts` and mount in `app.ts`.
- Controller delegates to existing `getAssetFull()` which returns the full asset with all relations.
- Transform the `getAssetFull` response to match `EndpointDetails` shape (add `patchSummary`, `relatedPatches`, `recentDeployments`).

**What to build:** Route + Controller wrapper + Transform function. Reuses existing `getAssetFull` service.

**Acceptance Criteria:**
- [x] `GET /v1/endpoints/:id` returns full endpoint detail with patch summary
- [x] Returns 404 if asset/endpoint ID doesn't exist
- [x] Response shape matches `EndpointDetails` type (includes `patchSummary`, `relatedPatches`, `recentDeployments`)
- [x] Only returns asset if it belongs to the authenticated user's organization
- [x] Follows standard `{ success, data }` envelope

---

#### R4: `POST /v1/tags/bulk-assign` — Bulk Assign Tags to Assets

**Frontend caller:** `tag.service.ts:50` — `bulkAssignTags(assetIds, tagIds)`

**Request:**
```typescript
POST /v1/tags/bulk-assign
Body: { assetIds: string[], tagIds: string[] }
```

**Response:** `{ success: true, data: { message, assignedCount } }`

**Current state:** Backend already has this at `POST /v1/assets/bulk-tags` (`assets.routes.ts:70`). Controller (`assets.controller.ts:190`) and service (`assets.service.ts:413`) both exist.

**Implementation:**
- Add **alias route** in `assets.routes.ts`: `router.post('/tags/bulk-assign', validateBody(bulkAssignTagsSchema), controller.bulkAssignTags)`
- Keep existing `/assets/bulk-tags` route as well (don't break anything that may use it)
- No new service/controller/validator needed — reuse everything

**What to build:** One new route line. Everything else exists.

**Acceptance Criteria:**
- [x] `POST /v1/tags/bulk-assign` with `{ assetIds, tagIds }` creates `AssetTag` records
- [x] Returns `{ success: true, data: { message, assignedCount } }`
- [x] Returns 400 if body is invalid (empty arrays, non-UUID strings)
- [x] Existing `/assets/bulk-tags` route still works (backward compatible)
- [x] Idempotent — re-assigning existing tags doesn't error
- [x] Only assigns tags to assets within the authenticated user's organization

---

#### R5: `POST /v1/tags/bulk-remove` — Bulk Remove Tags from Assets

**Frontend caller:** `tag.service.ts:54` — `bulkRemoveTags(assetIds, tagIds)`

**Request:**
```typescript
POST /v1/tags/bulk-remove
Body: { assetIds: string[], tagIds: string[] }
```

**Response:** `{ success: true, data: { message, removedCount } }`

**Implementation:**
- Route in `assets.routes.ts` after the bulk-assign route
- New controller method `bulkRemoveTags`
- New service method: `prisma.assetTag.deleteMany({ where: { assetId: { in: assetIds }, tagId: { in: tagIds } } })`
- New validator schema `bulkRemoveTagsSchema` (same shape as `bulkAssignTagsSchema`)

**What to build:** Route + Controller + Service + Validator (all new).

**Prisma model:** `AssetTag` — composite key `[assetId, tagId]`

**Acceptance Criteria:**
- [x] `POST /v1/tags/bulk-remove` with `{ assetIds, tagIds }` deletes matching `AssetTag` records
- [x] Returns `{ success: true, data: { message, removedCount } }` with count of deleted relations
- [x] Returns 400 if body is invalid
- [x] Idempotent — removing non-existent tag associations returns `removedCount: 0` (no error)
- [x] Does NOT delete the Tag or Asset records themselves — only the junction table entries
- [x] Only removes tags from assets within the authenticated user's organization
- [x] Follows standard `{ success, data }` envelope

---

#### R6: `GET /v1/tags/search` — Search Tags by Name

**Frontend caller:** `tag.service.ts:59` — `searchTags(query)` expects `Tag[]`

**Request:** `GET /v1/tags/search?q=<query>`

**Response:** `{ success: true, data: Tag[] }`

**Implementation:**
- Route in `assets.routes.ts` — **must be before** `/tags/:id` to avoid `search` being parsed as an ID param. Current order already has `/tags/popular` before `/tags/:id`, so add `/tags/search` in the same position.
- New controller method `searchTags`
- New service method: `prisma.tag.findMany({ where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } })`
- New validator schema for query: `z.object({ q: z.string().min(1) })`

**What to build:** Route + Controller + Service + Validator (all new).

**Prisma model:** `Tag` — fields: `id, name, description, color, icon, priority, compliance`

**Acceptance Criteria:**
- [x] `GET /v1/tags/search?q=sec` returns all tags whose `name` or `description` contains "sec" (case-insensitive)
- [x] Returns empty array `[]` if no matches (not 404)
- [x] Returns 400 if `q` query param is missing or empty
- [x] Results ordered by `name` ascending
- [x] Each tag object includes `id, name, description, color, icon, priority, compliance`
- [x] Handles special characters and unicode in query safely (Prisma parameterized, no SQL injection)
- [x] Follows standard `{ success, data }` envelope

---

#### R7: `GET /v1/categories/:id/assets` — List Assets by Category

**Frontend caller:** `category.service.ts:65` — `getAssetsByCategory(categoryId)`

**Request:** `GET /v1/categories/:id/assets`

**Response:** `{ success: true, data: Asset[] }`

**Implementation:**
- Route in `assets.routes.ts` after existing category CRUD routes (after line 48)
- New controller method `getAssetsByCategory`
- New service method: validate category exists, then `prisma.asset.findMany({ where: { categoryId: id }, include: { tags: { include: { tag: true } }, category: true, subCategory: true } })`
- Reuse existing `categoryIdParamSchema` for param validation

**What to build:** Route + Controller + Service. Validator (param) already exists.

**Prisma models:** `Category` → `Asset` (via `Asset.categoryId` FK)

**Acceptance Criteria:**
- [x] `GET /v1/categories/:id/assets` returns all assets belonging to that category
- [x] Returns empty array `[]` if category exists but has no assets
- [x] Returns 404 if category ID doesn't exist
- [x] Each asset object includes basic fields: `id, name, type, status, os, ipAddress, serialNumber`
- [x] Each asset includes its tags (resolved, not just IDs)
- [x] Only returns assets within the authenticated user's organization
- [x] Follows standard `{ success, data }` envelope

---

#### R8: `GET /v1/subcategories/:id/assets` — List Assets by Subcategory

**Frontend caller:** `category.service.ts:71` — `getAssetsBySubCategory(subCategoryId)`

**Request:** `GET /v1/subcategories/:id/assets`

**Response:** `{ success: true, data: Asset[] }`

**Implementation:**
- Route in `assets.routes.ts` after existing subcategory CRUD routes (after line 57)
- New controller method `getAssetsBySubCategory`
- New service method: validate subcategory exists, then `prisma.asset.findMany({ where: { subCategoryId: id }, include: { tags: { include: { tag: true } }, category: true, subCategory: true } })`
- Reuse existing `subCategoryIdParamSchema` for param validation

**What to build:** Route + Controller + Service. Validator (param) already exists.

**Prisma models:** `SubCategory` → `Asset` (via `Asset.subCategoryId` FK)

**Acceptance Criteria:**
- [x] `GET /v1/subcategories/:id/assets` returns all assets belonging to that subcategory
- [x] Returns empty array `[]` if subcategory exists but has no assets
- [x] Returns 404 if subcategory ID doesn't exist
- [x] Each asset object includes basic fields + resolved tags
- [x] Only returns assets within the authenticated user's organization
- [x] Follows standard `{ success, data }` envelope

---

### 5.3 Organization Scoping (Cross-Cutting Requirement)

> **Added after verification audit — applies to ALL 8 endpoints.**

**Problem:** The Prisma schema shows `Asset.organizationId` FK. JWT tokens include `organizationId`. Without explicit org filtering, users in Org A could scan/view/tag assets belonging to Org B.

**Requirement:** Every Prisma query that touches `Asset`, `AssetTag`, or org-scoped data **must** include an `organizationId` filter derived from `req.user.organizationId`.

**Pattern to follow:**
```typescript
// In controller — extract org ID from authenticated user
const orgId = (req as AuthenticatedRequest).user.organizationId;

// Pass to service
const result = await service.getAssetsByCategory(categoryId, orgId);

// In service — filter by org
const assets = await prisma.asset.findMany({
  where: {
    categoryId,
    organizationId: orgId,  // <-- REQUIRED on every asset query
  },
});
```

**Endpoints affected:**

| Endpoint | Where to add org filter |
|----------|------------------------|
| R1 `scanEndpoints` | `patches.service.ts` — add `organizationId` to `assetWhere` filter |
| R2 `getEndpoints` | New service — add `organizationId` to asset query |
| R3 `getEndpointDetails` | Controller — pass org ID to `getAssetFull`, verify asset belongs to org |
| R4 `bulkAssignTags` | Service — validate all `assetIds` belong to user's org before assigning |
| R5 `bulkRemoveTags` | Service — filter `AssetTag` delete by org-owned assets only |
| R6 `searchTags` | Tags are global (not org-scoped) — no filter needed |
| R7 `getAssetsByCategory` | Service — add `organizationId` to asset query |
| R8 `getAssetsBySubCategory` | Service — add `organizationId` to asset query |

**Acceptance Criteria:**
- [x] User in Org A cannot see Org B's assets via any of the 8 endpoints
- [x] Bulk operations (R4, R5) silently skip or reject asset IDs from other orgs
- [x] `scanEndpoints` only scans assets belonging to the user's organization
- [x] `getEndpoints` only returns endpoints belonging to the user's organization
- [x] Category/subcategory asset lists only return assets from the user's organization

### 5.4 Input Size Limits (Cross-Cutting Requirement)

> **Added after verification audit — prevents DoS via oversized requests.**

**Problem:** Bulk operations (R1, R4, R5) accept unbounded arrays. A malicious or buggy client could send 100,000+ IDs, causing Prisma query timeouts and memory exhaustion.

**Requirement:** Add `.max()` constraints to all Zod array validators:

```typescript
// Update existing bulkAssignTagsSchema
export const bulkAssignTagsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(1000),  // <-- ADD .max(1000)
  tagIds: z.array(z.string().uuid()).min(1).max(100),     // <-- ADD .max(100)
});

// New bulkRemoveTagsSchema — same limits
export const bulkRemoveTagsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(1000),
  tagIds: z.array(z.string().uuid()).min(1).max(100),
});

// Update scanEndpointsSchema
export const scanEndpointsSchema = z.object({
  scope: z.enum(['ALL_END_POINTS', 'SPECIFIC_GROUPS']),
  endpointIds: z.array(z.string()).optional().default([]).pipe(z.array(z.string()).max(5000)),
});
```

**Acceptance Criteria:**
- [x] `bulkAssignTags` rejects requests with > 1000 assetIds (400 error)
- [x] `bulkRemoveTags` rejects requests with > 1000 assetIds (400 error)
- [x] `scanEndpoints` rejects requests with > 5000 endpointIds (400 error)
- [x] Error message clearly states the limit: "assetIds must contain at most 1000 items"

---

## 6. Implementation Plan

### Files to Modify

| File | Changes |
|------|---------|
| `backend/src/modules/patches/patches.routes.ts` | Add 2 routes (R1, R2) |
| `backend/src/modules/patches/patches.controller.ts` | Add 2 controller methods (`scanEndpoints` with field transform, `getEndpoints`) |
| `backend/src/modules/patches/patches.service.ts` | **Rewrite** `getEndpoints()` to query assets via `AssetVulnerability`, not `PatchDeploymentTask` |
| `backend/src/modules/patches/patches.validator.ts` | Update `scanEndpointsSchema` — add `.max(5000)` to `endpointIds` |
| `backend/src/modules/assets/assets.routes.ts` | Add 6 routes (R3, R4, R5, R6, R7, R8) |
| `backend/src/modules/assets/assets.controller.ts` | Add 5 controller methods (`getEndpointDetails`, `bulkRemoveTags`, `searchTags`, `getAssetsByCategory`, `getAssetsBySubCategory`) |
| `backend/src/modules/assets/assets.service.ts` | Add 4 service methods (`bulkRemoveTags`, `searchTags`, `getAssetsByCategory`, `getAssetsBySubCategory`), add org-scoping to `bulkAssignTags` |
| `backend/src/modules/assets/assets.validators.ts` | Add 2 schemas (`bulkRemoveTagsSchema`, `tagSearchQuerySchema`), update `bulkAssignTagsSchema` with `.max()` limits |

### Implementation Order

**Day 1 — Patches Module (R1 + R2):**
1. **Rewrite** `getEndpoints()` service to query `AssetVulnerability` → `Asset` (not `PatchDeploymentTask`)
2. Add controller methods: `scanEndpoints` (with field transform) and `getEndpoints`
3. Add org-scoping filter to `scanEndpoints` service (`assetWhere.organizationId`)
4. Update `scanEndpointsSchema` with `.max(5000)` on `endpointIds`
5. Add routes in `patches.routes.ts`
6. Test both endpoints manually

**Day 2 — Tags (R4 + R5 + R6):**
1. Add alias route for `/tags/bulk-assign` (R4 — one line)
2. Update `bulkAssignTagsSchema` with `.max(1000)` / `.max(100)` limits
3. Add org-scoping validation to existing `bulkAssignTags` service
4. Implement `bulkRemoveTags` — validator (with `.max()`) + service (with org filter) + controller + route (R5)
5. Implement `searchTags` — validator + service + controller + route (R6)
6. Test all three tag endpoints

**Day 3 — Categories + Endpoint Detail (R7 + R8 + R3):**
1. Implement `getAssetsByCategory` — service (with org filter) + controller + route (R7)
2. Implement `getAssetsBySubCategory` — service (with org filter) + controller + route (R8)
3. Implement `getEndpointDetails` — controller wrapper (with org check) + route in assets module (R3)
4. Test all endpoints end-to-end, including cross-org access denial

**Day 4 — Validation + Merge:**
1. Run `make check-all` (types + lint + build)
2. Verify each endpoint with curl/Postman
3. Merge A.1 to main, notify Dev 2 for B.1

---

## 7. Technical Constraints

### Patterns to Follow

Every new endpoint must follow these established patterns:

**Controller pattern** (`patches.controller.ts` style):
```typescript
export async function methodName(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await service.method(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
```

**Response helpers** (`shared/utils/response.ts`):
- `sendSuccess(res, data, statusCode?)` → `{ success: true, data }`
- `sendPaginated(res, data, meta)` → `{ success: true, data, meta }`
- `sendError(res, statusCode, code, message)` → `{ success: false, error: { code, message } }`

**Error handling:**
- `throw new NotFoundError('...')` → 404
- `throw new BadRequestError('...')` → 400
- All errors caught by `next(error)` → global error middleware

**Validation:** Zod schemas applied via middleware:
```typescript
router.post('/path', authenticate, validateBody(schema), validateParams(paramSchema), controller.method);
```

**Route mounting:** Assets module is mounted at `/v1` (no prefix) in `app.ts:185`. Patches module at `/v1/patches`. This means:
- `/tags/search` = route in `assets.routes.ts` as `/tags/search`
- `/endpoints/:id` = route in `assets.routes.ts` as `/endpoints/:id`
- `/categories/:id/assets` = route in `assets.routes.ts` as `/categories/:id/assets`

### Route Order Caution

In `assets.routes.ts`, static paths must come **before** parameterized paths:
- `/tags/search` must be before `/tags/:id`
- `/tags/popular` is already before `/tags/:id` — follow same pattern

---

## 8. Test Plan

### 8.1 Manual Smoke Tests (per endpoint)

Each endpoint should be tested with curl against a running dev server with seed data.

#### R1: POST /v1/patches/:id/scan-endpoints
```bash
# Happy path — scan all endpoints
curl -X POST http://localhost:3000/v1/patches/<PATCH_ID>/scan-endpoints \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"scope": "ALL_END_POINTS"}'
# Expected: 200 { success: true, data: { scannedCount: N, missingCount: N, notApplicableCount: N } }

# Happy path — scan specific endpoints
curl -X POST http://localhost:3000/v1/patches/<PATCH_ID>/scan-endpoints \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"scope": "SPECIFIC_GROUPS", "endpointIds": ["<ASSET_ID>"]}'
# Expected: 200 { success: true, data: { scannedCount: 1, ... } }

# Error — invalid patch ID
curl -X POST http://localhost:3000/v1/patches/nonexistent-id/scan-endpoints \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"scope": "ALL_END_POINTS"}'
# Expected: 404

# Error — invalid body
curl -X POST http://localhost:3000/v1/patches/<PATCH_ID>/scan-endpoints \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"scope": "INVALID"}'
# Expected: 400

# Error — no auth
curl -X POST http://localhost:3000/v1/patches/<PATCH_ID>/scan-endpoints \
  -H "Content-Type: application/json" \
  -d '{"scope": "ALL_END_POINTS"}'
# Expected: 401

# Org scoping — scan with token from Org A, patch belongs to Org B
curl -X POST http://localhost:3000/v1/patches/<ORG_B_PATCH>/scan-endpoints \
  -H "Authorization: Bearer <ORG_A_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"scope": "ALL_END_POINTS"}'
# Expected: scannedCount: 0 (only scans assets within user's org)

# Input size limit — too many endpointIds
curl -X POST http://localhost:3000/v1/patches/<PATCH_ID>/scan-endpoints \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"scope": "SPECIFIC_GROUPS", "endpointIds": ["id1", "id2", ... (5001 IDs)]}'
# Expected: 400 "endpointIds must contain at most 5000 items"
```

#### R2: GET /v1/patches/:id/endpoints
```bash
# Happy path — verify returned IDs are ASSET IDs (not task IDs)
curl http://localhost:3000/v1/patches/<PATCH_ID>/endpoints \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 { success: true, data: [{ id, name, os, status, lastSeen }, ...] }
# VERIFY: each "id" can be used with GET /v1/endpoints/:id

# No affected endpoints
curl http://localhost:3000/v1/patches/<PATCH_WITH_NO_ENDPOINTS>/endpoints \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 { success: true, data: [] }

# Invalid patch
curl http://localhost:3000/v1/patches/nonexistent/endpoints \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 404

# Org scoping — only returns assets from user's org
curl http://localhost:3000/v1/patches/<PATCH_ID>/endpoints \
  -H "Authorization: Bearer <ORG_A_TOKEN>"
# Expected: Only Org A assets in response (Org B assets filtered out)
```

#### R3: GET /v1/endpoints/:id
```bash
# Happy path
curl http://localhost:3000/v1/endpoints/<ASSET_ID> \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 { success: true, data: { id, name, os, osVersion, status, patchSummary, ... } }

# Invalid ID
curl http://localhost:3000/v1/endpoints/nonexistent \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 404

# Org scoping — asset belongs to Org B, token from Org A
curl http://localhost:3000/v1/endpoints/<ORG_B_ASSET_ID> \
  -H "Authorization: Bearer <ORG_A_TOKEN>"
# Expected: 404 (asset not visible to this org)
```

#### R4: POST /v1/tags/bulk-assign
```bash
# Happy path
curl -X POST http://localhost:3000/v1/tags/bulk-assign \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"assetIds": ["<ASSET_ID>"], "tagIds": ["<TAG_ID>"]}'
# Expected: 200 { success: true, data: { message: "...", assignedCount: N } }

# Idempotent re-assign
# (same request again)
# Expected: 200 (no error, assignedCount may be 0)

# Invalid body
curl -X POST http://localhost:3000/v1/tags/bulk-assign \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"assetIds": [], "tagIds": []}'
# Expected: 400

# Input size limit — too many assetIds
curl -X POST http://localhost:3000/v1/tags/bulk-assign \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"assetIds": ["id1", ... (1001 IDs)], "tagIds": ["<TAG_ID>"]}'
# Expected: 400 "assetIds must contain at most 1000 items"

# Org scoping — assetIds include asset from another org
curl -X POST http://localhost:3000/v1/tags/bulk-assign \
  -H "Authorization: Bearer <ORG_A_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"assetIds": ["<ORG_A_ASSET>", "<ORG_B_ASSET>"], "tagIds": ["<TAG_ID>"]}'
# Expected: 200, only Org A asset gets the tag (Org B asset silently skipped)
```

#### R5: POST /v1/tags/bulk-remove
```bash
# Happy path
curl -X POST http://localhost:3000/v1/tags/bulk-remove \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"assetIds": ["<ASSET_ID>"], "tagIds": ["<TAG_ID>"]}'
# Expected: 200 { success: true, data: { message: "...", removedCount: N } }

# Idempotent remove (already removed)
# Expected: 200 { success: true, data: { removedCount: 0 } }

# Invalid body
curl -X POST http://localhost:3000/v1/tags/bulk-remove \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400

# Input size limit
curl -X POST http://localhost:3000/v1/tags/bulk-remove \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"assetIds": ["id1", ... (1001 IDs)], "tagIds": ["<TAG_ID>"]}'
# Expected: 400 "assetIds must contain at most 1000 items"

# Org scoping — only removes from org-owned assets
curl -X POST http://localhost:3000/v1/tags/bulk-remove \
  -H "Authorization: Bearer <ORG_A_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"assetIds": ["<ORG_A_ASSET>", "<ORG_B_ASSET>"], "tagIds": ["<TAG_ID>"]}'
# Expected: 200, only Org A asset-tag removed (Org B silently skipped)
```

#### R6: GET /v1/tags/search
```bash
# Happy path
curl "http://localhost:3000/v1/tags/search?q=sec" \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 { success: true, data: [{ id, name, description, color, ... }, ...] }

# No results
curl "http://localhost:3000/v1/tags/search?q=zzzznonexistent" \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 { success: true, data: [] }

# Missing query param
curl "http://localhost:3000/v1/tags/search" \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 400

# Empty query param
curl "http://localhost:3000/v1/tags/search?q=" \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 400 (validator requires min 1 char)

# Unicode search
curl "http://localhost:3000/v1/tags/search?q=%C3%B1o%C3%B1o" \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 (case-insensitive match, no crash)

# Special characters (Prisma parameterized — no SQL injection)
curl "http://localhost:3000/v1/tags/search?q=tag%5Bname%5D" \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 (literal string match, no regex parsing)
```

#### R7: GET /v1/categories/:id/assets
```bash
# Happy path
curl http://localhost:3000/v1/categories/<CATEGORY_ID>/assets \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 { success: true, data: [{ id, name, type, status, ... }, ...] }

# Empty category
curl http://localhost:3000/v1/categories/<EMPTY_CATEGORY_ID>/assets \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 { success: true, data: [] }

# Invalid category
curl http://localhost:3000/v1/categories/nonexistent/assets \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 404

# Org scoping — only returns assets from user's org
curl http://localhost:3000/v1/categories/<SHARED_CATEGORY_ID>/assets \
  -H "Authorization: Bearer <ORG_A_TOKEN>"
# Expected: 200, only Org A assets in response
```

#### R8: GET /v1/subcategories/:id/assets
```bash
# Happy path
curl http://localhost:3000/v1/subcategories/<SUBCATEGORY_ID>/assets \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 { success: true, data: [{ id, name, type, status, ... }, ...] }

# Empty subcategory
curl http://localhost:3000/v1/subcategories/<EMPTY_SUBCATEGORY_ID>/assets \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 200 { success: true, data: [] }

# Invalid subcategory
curl http://localhost:3000/v1/subcategories/nonexistent/assets \
  -H "Authorization: Bearer <TOKEN>"
# Expected: 404

# Org scoping — only returns assets from user's org
curl http://localhost:3000/v1/subcategories/<SHARED_SUBCATEGORY_ID>/assets \
  -H "Authorization: Bearer <ORG_A_TOKEN>"
# Expected: 200, only Org A assets in response
```

### 8.2 Integration Tests (automated)

Write integration tests in `backend/src/modules/patches/__tests__/` and `backend/src/modules/assets/__tests__/`:

```
backend/src/modules/patches/__tests__/scan-endpoints.test.ts
backend/src/modules/patches/__tests__/patch-endpoints.test.ts
backend/src/modules/assets/__tests__/endpoint-details.test.ts
backend/src/modules/assets/__tests__/tag-bulk-operations.test.ts
backend/src/modules/assets/__tests__/tag-search.test.ts
backend/src/modules/assets/__tests__/category-assets.test.ts
backend/src/modules/assets/__tests__/org-scoping.test.ts          # Cross-org access tests for R1-R8
```

**Test matrix per endpoint:**

| Test Case | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|-----------|----|----|----|----|----|----|----|----|
| Returns 200 on valid request | x | x | x | x | x | x | x | x |
| Returns correct response shape | x | x | x | x | x | x | x | x |
| Returns real data (not empty when data exists) | x | x | x | x | x | x | x | x |
| Returns empty array when no data | | x | | | | x | x | x |
| Returns 404 for non-existent resource | x | x | x | | | | x | x |
| Returns 400 for invalid body/params | x | | | x | x | x | | |
| Returns 401 without auth token | x | x | x | x | x | x | x | x |
| Idempotent (safe to repeat) | | | | x | x | | | |
| **Org scoping — cross-org access blocked** | **x** | **x** | **x** | **x** | **x** | | **x** | **x** |
| **Input size limit enforced** | **x** | | | **x** | **x** | | | |
| **R2 returns asset IDs (not task IDs)** | | **x** | | | | | | |
| Unicode/special chars handled | | | | | | x | | |
| Follows `{ success, data }` envelope | x | x | x | x | x | x | x | x |

### 8.3 Build Validation

```bash
make check-all  # Must pass: types + lint + build
```

---

## 9. Success Metrics

| Metric | Target | How to measure |
|--------|--------|---------------|
| Frontend 404 errors from these 8 calls | 0 | Browser console on all affected pages |
| All 8 endpoints return real data | 100% | Manual curl tests with seed data |
| Zod validation on every endpoint | 8/8 | Code review — every route has `validateBody` / `validateParams` / `validateQuery` |
| Standard envelope compliance | 8/8 | Integration tests assert `{ success, data }` shape |
| Org scoping on asset-touching endpoints | 7/7 | Integration tests verify cross-org access blocked (R6 exempt — tags are global) |
| Input size limits on bulk endpoints | 3/3 | Integration tests verify 400 on oversized arrays (R1, R4, R5) |
| `make check-all` passes | Pass | CI / manual run |
| B.1 unblocked | Yes | Dev 2 confirms all needed routes exist |

---

## 10. Open Questions

| # | Question | Owner | Blocking? | Resolution |
|---|----------|-------|-----------|------------|
| Q1 | For R3 (`/endpoints/:id`), should the response match the full `EndpointDetails` type (with `patchSummary`, `relatedPatches`, `recentDeployments`) or a simpler asset view? | Dev 1 + Dev 2 | No | Start with `getAssetFull` response, Dev 2 adapts in B.1 |
| Q2 | Should R4 keep both `/assets/bulk-tags` AND `/tags/bulk-assign`, or deprecate one? | Dev 1 | No | Keep both for now, deprecate `/assets/bulk-tags` in Sprint 2 |
| Q3 | Should R6 tag search have a `limit` parameter? | Dev 1 | No | Ship without, add if tag count grows |
| Q4 | R2 `getEndpoints` — should the rewritten service also check `affectedProducts` in addition to CVE matching? | Dev 1 | No | Yes, fall back to `affectedProducts` → `asset.software` if `cveNumbers` is empty |
| Q5 | Are tags org-scoped or global? | Dev 1 | No | Global (no `organizationId` on `Tag` model). R6 search returns all tags. |

---

## 11. Dependencies

| This item | Blocks | Blocked by |
|-----------|--------|------------|
| **A.1** | **B.1** (frontend URL fixes) | Nothing — start Day 1 |
| **A.1** | Sprint 1 exit criteria (zero 404s) | Nothing |

**A.1 must merge to main before Dev 2 can start B.1.** Prioritize accordingly.

---

---

## 12. Verification Audit Log

> Changes applied after 4-agent verification audit (2026-02-12):

| Finding | Severity | Resolution |
|---------|----------|------------|
| R1 `scanEndpoints` service returns `{ assetsScanned, missing, notApplicable }` but PRD expected `{ scannedCount, missingCount, installedCount }` | CRITICAL | Added controller transform pattern in R1. Updated response shape. |
| R2 `getEndpoints` service queries `PatchDeploymentTask` (task IDs) instead of `Asset` (asset IDs) | CRITICAL | Documented service rewrite in R2. New implementation queries `AssetVulnerability` → `Asset`. |
| Zero org-scoping tests — users could access other org's data | CRITICAL | Added section 5.3 (Organization Scoping). Added org-scoping acceptance criteria to R1-R5, R7, R8. Added 7 org-scoping smoke tests. |
| No input size limits on bulk operations | MEDIUM | Added section 5.4 (Input Size Limits). Updated validators with `.max()`. Added size limit smoke tests. |
| No unicode/special char tests for R6 search | LOW | Added unicode + special char smoke tests to R6. |
| Empty string vs missing query param not tested for R6 | LOW | Added empty string test to R6. |
| Implementation plan didn't reflect service rewrite work | LOW | Updated Day 1 plan and files-to-modify table. |

*Last updated: 2026-02-12 (post-verification audit)*
