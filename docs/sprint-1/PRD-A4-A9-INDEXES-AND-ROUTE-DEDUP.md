# PRD: A.4 + A.9 — Database Indexes & Deployment Route Deduplication

> **Sprint 1 Track A** | **Priority:** Should Have (Week 3-4) | **Owner:** Dev 1
> **Status:** COMPLETED
> **Combined:** Two low-complexity items bundled into one implementation pass.

---

## 1. Problem Statement

**A.4 — Missing FK indexes on User model:**
The `User` model has three FK fields — `organizationId`, `departmentId`, `locationId` — with no database indexes. Admin queries that filter/join on these fields (user list by org, department member counts, location-based filtering) perform sequential scans. With `User.email` already having a `@unique` implicit index, login performance is fine — but admin/filtering queries degrade as user count grows.

**A.9 — Duplicate deployment route mounts:**
Deployment routes are defined in **two places**:
1. `patches.routes.ts` lines 232–389 (158 lines, 18 routes under a `deploymentsRouter`)
2. `deployments/deployment.routes.ts` lines 18–42 (25 lines, 11 routes)

Both are mounted in `app.ts`:
- Line 188: `app.use('/v1/patches', patchRoutes)` → exports `deploymentsRouter` separately
- Line 191: `app.use('/v1/deployments', deploymentRoutes)`

The `patches.routes.ts` version is the **superset** — it has all routes from `deployment.routes.ts` plus CRUD routes (`GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /:id/preview`, `POST /:id/execute`). Both mount at `/v1/deployments`. This creates duplicate Express handlers for overlapping paths, making debugging confusing and risking subtle route-ordering bugs.

All frontend service calls use `/deployments/...` (confirmed in `patch.service.ts` and `softwareJobs.service.ts`). No frontend code calls `/patches/deployments/...`.

**Cost of not solving:** A.4 causes slow admin queries at scale. A.9 causes developer confusion, potential route-shadowing bugs, and wasted code.

---

## 2. Goals

| # | Goal | Measure |
|---|------|---------|
| G1 | FK queries on User use index scans | `EXPLAIN ANALYZE` on `WHERE organizationId = ?` shows Index Scan, not Seq Scan |
| G2 | Single canonical location for deployment routes | `deploymentsRouter` defined in exactly one file, mounted once in `app.ts` |
| G3 | Zero frontend regression | All deployment-related pages load and function identically |
| G4 | Clean migration history | Prisma migration applies cleanly on fresh and existing databases |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Adding indexes on all FK fields across the schema | Scope limited to `User` model — other models can be audited separately |
| N2 | Refactoring deployment controller/service logic | Only moving route definitions; controller and service stay as-is |
| N3 | Changing deployment API URLs | Frontend already uses correct `/v1/deployments/...` paths |
| N4 | Adding composite indexes or query optimization | Simple single-column indexes are sufficient for the FK lookup pattern |

---

## 4. User Stories

- As a **platform admin**, I want user-list pages filtered by organization/department/location to load quickly so that I can manage large teams without waiting.
- As a **backend developer**, I want deployment routes defined in one place so that I know where to add or modify endpoints without discovering duplicates.
- As a **frontend developer**, I want deployment API paths to remain unchanged so that my service calls continue working after the backend cleanup.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Add `@@index` directives to User model

**What:** Add three indexes to `schema.prisma` User model:
```prisma
@@index([organizationId])
@@index([departmentId])
@@index([locationId])
```

**Files:** `backend/src/db/prisma/schema.prisma`

**Acceptance Criteria:**
- [x] `@@index([organizationId])` added to User model
- [x] `@@index([departmentId])` added to User model
- [x] `@@index([locationId])` added to User model
- [x] `npx prisma migrate dev --name add-user-fk-indexes` generates a clean migration
- [ ] Migration applies successfully on a fresh database (`make db-reset`)
- [ ] `EXPLAIN ANALYZE SELECT * FROM users WHERE organization_id = 'xxx'` shows Index Scan (not Seq Scan) when table has >100 rows

#### R2: Consolidate deployment routes into `deployments/` module

**What:** Move all deployment route definitions from `patches.routes.ts` into `deployments/deployment.routes.ts`, then remove the duplicate from `patches.routes.ts`.

**Current state:**
- `patches.routes.ts` lines 228–389: defines `deploymentsRouter` with 18 routes, exported and mounted at `/v1/deployments`
- `deployment.routes.ts` lines 18–42: defines 11 routes (subset), mounted at `/v1/deployments`
- `app.ts` mounts both at line 188 (via patches export) and line 191

**Target state:**
- `deployment.routes.ts`: single file with ALL deployment routes (the superset from `patches.routes.ts`)
- `patches.routes.ts`: no deployment routes, no `deploymentsRouter` export
- `app.ts` line 191: single mount of `deploymentRoutes` at `/v1/deployments`

**Files:**
- `backend/src/modules/deployments/deployment.routes.ts` — expand to include all routes
- `backend/src/modules/patches/patches.routes.ts` — remove lines 228–389, remove `deploymentsRouter` export
- `backend/src/modules/patches/index.ts` — remove `deploymentsRouter` re-export if present
- `backend/src/app.ts` — remove the patches-sourced deployment mount, keep only `deploymentRoutes`

**Acceptance Criteria:**
- [x] `deployment.routes.ts` contains all 18 deployment routes (software, patch, config, CRUD)
- [x] `patches.routes.ts` contains zero deployment routes
- [x] `deploymentsRouter` is not exported from `patches` module
- [x] `app.ts` has exactly one mount for `/v1/deployments`
- [x] All validators referenced in moved routes are imported correctly in `deployment.routes.ts` (some may need to be moved from `patches.validators.ts` to `deployment.validators.ts`)
- [x] All controller methods referenced exist and are correctly bound
- [x] No TypeScript compilation errors (`make check-types`)

### Nice-to-Have (P1)

#### R3: Move shared validators

If deployment-related Zod schemas (e.g., `createDeploymentSchema`, `deploymentListQuerySchema`, `deploymentIdParamSchema`, `createPatchDeploymentFromUISchema`) are defined in `patches.validators.ts`, move them to `deployment.validators.ts`.

- [x] All deployment-related validators live in `deployments/deployment.validators.ts`
- [x] No circular imports between patches and deployments modules

---

## 6. Test Plan

### A.4 — Database Indexes

#### Unit Tests (new file: `backend/tests/unit/user-indexes.test.ts`)

```
Test: User FK indexes exist in schema
  Given: The Prisma schema is loaded
  When: Introspecting the users table
  Then: Indexes exist on organization_id, department_id, location_id columns

Test: User query by organizationId uses index
  Given: 100+ seeded users with varied organizationId values
  When: Querying users filtered by organizationId
  Then: Query executes in <50ms (not sequential scan)
```

#### Migration Test

```
Test: Migration applies cleanly on existing database
  Given: Database at current migration state
  When: Running `npx prisma migrate dev`
  Then: Migration applies without errors
  And: Existing data is preserved
  And: No table locks beyond the index creation

Test: Migration applies cleanly on fresh database
  Given: Empty database
  When: Running `npx prisma migrate reset`
  Then: All migrations including the new one apply successfully
```

### A.9 — Route Deduplication

#### Unit Tests (new file: `backend/tests/unit/deployment-routes.test.ts`)

```
Test: No duplicate route mounts in app.ts
  Given: The Express app is initialized
  When: Listing all registered routes matching /v1/deployments
  Then: Each path+method combination appears exactly once

Test: All deployment endpoints respond
  Given: The server is running with auth
  When: Sending requests to each deployment endpoint:
    - GET    /v1/deployments
    - POST   /v1/deployments
    - GET    /v1/deployments/:id
    - PUT    /v1/deployments/:id
    - DELETE /v1/deployments/:id
    - GET    /v1/deployments/:id/preview
    - POST   /v1/deployments/:id/execute
    - POST   /v1/deployments/:id/cancel
    - GET    /v1/deployments/software
    - POST   /v1/deployments/software
    - GET    /v1/deployments/software/:id
    - POST   /v1/deployments/software/:id/cancel
    - POST   /v1/deployments/software/:id/tasks/:taskId/rollback
    - POST   /v1/deployments/patch
    - GET    /v1/deployments/patch
    - GET    /v1/deployments/patch/:id
    - POST   /v1/deployments/patch/:id/cancel
    - POST   /v1/deployments/patch/:id/retry
    - POST   /v1/deployments/config
    - GET    /v1/deployments/config/:id
  Then: None return 404
  And: Unauthenticated requests return 401

Test: patches.routes.ts has no deployment routes
  Given: The patches router is loaded
  When: Listing registered routes
  Then: No routes contain /software, /patch (deployment), /config, or deployment CRUD paths
```

#### Regression Checklist

- [ ] `GET /v1/deployments` returns paginated deployment list
- [ ] `POST /v1/deployments/software` creates a software deployment
- [ ] `POST /v1/deployments/patch` creates a patch deployment
- [ ] `POST /v1/deployments/config` creates a config deployment
- [ ] `POST /v1/deployments/patch/:id/retry` retries a failed deployment
- [ ] `GET /v1/deployments/:id/preview` returns deployment preview
- [ ] `POST /v1/deployments/:id/execute` triggers deployment execution
- [ ] Frontend deployment pages load without errors
- [ ] Frontend can create, view, cancel deployments
- [ ] `make check-all` passes (types + lint + build)

---

## 7. Implementation Notes

### A.4 Estimated Impact
- **1 file** modified (`schema.prisma`)
- **~5 lines** added
- **1 migration** generated
- **Zero** service/controller/frontend changes
- **Time:** ~30 minutes

### A.9 Estimated Impact
- **4 files** modified (deployment.routes.ts, patches.routes.ts, patches/index.ts, app.ts)
- **~160 lines removed** from patches.routes.ts
- **~120 lines added** to deployment.routes.ts (routes that don't already exist there)
- **Zero** controller/service/frontend changes (all URLs stay the same)
- **Time:** ~2 hours

### Risk
- **A.4:** Near-zero risk. Index creation on a small table is instant. No locking concern.
- **A.9:** Low risk. All frontend calls use `/v1/deployments/...` which continues to work. The only risk is missing a validator import when moving routes — caught by `make check-types`.

---

## 8. Open Questions

None — both items are straightforward with clear scope.
