# PRD: RBAC & Permissions Engine (Pipeline 2A)

**Status**: COMPLETED (2026-02-13)
**Author**: Claude Code
**Created**: 2026-02-13
**Priority**: P0 (Critical Blocking Pipeline)
**Blocks**: Pipeline 2B, 2C, 2D, 2E, 2F, 2G
**Resolves**: Sprint 1 Deferred Item A.12 (Role-based permissions)

---

## 1. Problem Statement

PatchIQ has a `Role` table with a `permissions` JSON column and two seeded system roles (`admin`, `user`), but **no runtime permission enforcement exists anywhere in the backend**. Every authenticated user — regardless of role — has identical access to every endpoint in the system.

The current state:

- **No permission middleware**: The `authenticate` middleware verifies JWT tokens but never reads `Role.permissions`. The `requireRole()` helper exists in `auth.ts` but is **unused on any route**.
- **Broken User ↔ Role relationship**: `User.role` is a plain string (`"ADMIN"`, `"USER"`) with no foreign key to the `Role` table. Role names in the `roles` table are lowercase (`admin`, `user`), but user records store uppercase (`ADMIN`, `USER`) — so they can't be joined.
- **No module-level gating**: All 20+ route modules (agents, assets, patches, vulnerabilities, jobs, discovery, settings, etc.) accept any authenticated request. A `USER` can delete roles, modify settings, and access admin-only features.
- **Custom roles are inert**: Admins can create custom roles with granular permissions via the settings UI, but those permissions are never checked at runtime — they're write-only data.

Without RBAC enforcement, PatchIQ cannot be deployed in any multi-user environment. This pipeline is the **critical blocker** for all other Pipeline 2 sub-pipelines, since every settings domain (LDAP, org management, agent config, etc.) requires permission-gated access.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Runtime permission enforcement on every authenticated route | 100% of module routes check `Role.permissions` before executing — verified by route audit script |
| G2 | Proper User ↔ Role FK relationship with consistent casing | `User.roleId` FK exists, migration backfills all existing data, `SELECT count(*) FROM users WHERE role_id IS NULL` = 0 |
| G3 | Granular module × action permission matrix | Custom role with `patches: { view: true, add: false }` can GET but not POST patches — validated via 20+ automated scenarios |
| G4 | System role protection | System roles (`admin`, `user`) cannot be deleted, renamed, or have permissions modified — 5 protection scenarios pass |
| G5 | Validation script proving RBAC works end-to-end | Automated script with 25+ scenarios passes against real database with zero failures |

---

## 3. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| N1 | Frontend permission rendering (hide/show UI elements) | Backend-only scope; Dev 2 consumes permission data from login response |
| N2 | Row-level security (user can only see their org's assets) | Separate concern — Pipeline 2C handles org scoping |
| N3 | API key / service account permissions | Not needed until Pipeline 3 (deployment execution) |
| N4 | Permission inheritance (role hierarchies) | Over-engineering for v1; flat permission model is sufficient |
| N5 | Field-level permissions (user can see `asset.name` but not `asset.ipAddress`) | Too granular; module × action (view/add/edit/delete) is the right level |
| N6 | Rate limiting by role | Separate cross-cutting concern, not RBAC |
| N7 | Audit logging for permission checks (403 events) | Nice-to-have, deferred to Pipeline 2G (Audit log completeness) |

---

## 4. User Stories

### US-1: Permission-Gated Access
> As a **PatchIQ admin**, I want non-admin users to be blocked from accessing settings, role management, and other admin-only features so that I can safely add users without worrying about unauthorized changes.

### US-2: Custom Role Creation
> As a **PatchIQ admin**, I want to create custom roles with fine-grained permissions (e.g., "Patch Manager" who can view/add/edit patches but cannot access settings or delete anything) so that I can implement least-privilege access for my team.

### US-3: Role Assignment
> As a **PatchIQ admin**, I want to assign any role (system or custom) to a user and have that role's permissions enforced immediately on their next API request so that role changes take effect without requiring the user to re-login.

### US-4: System Role Protection
> As a **PatchIQ admin**, I want system roles (`admin`, `user`) to be protected from deletion or name changes so that the platform always has a baseline set of roles.

### US-5: Permission Feedback
> As a **non-admin user**, I want to receive a clear 403 response with a meaningful error message when I try to access a feature I don't have permission for so that I understand why access was denied.

### US-6: Login Permission Payload
> As a **frontend developer (Dev 2)**, I want the login response to include the user's resolved permissions object so that I can render the UI based on what the user is allowed to do without making a separate API call.

### US-7: Role Change Immediate Effect
> As a **PatchIQ admin**, I want a user's permissions to update within 60 seconds of their role being changed, without requiring the user to log out and back in, so that access revocations are timely.

### US-8: Deny-by-Default Security
> As a **security-conscious admin**, I want any permission not explicitly granted to default to denied so that new modules added in the future are automatically locked down until explicitly enabled per role.

---

## 5. Requirements

### R1: Fix User ↔ Role Relationship (P0 — Must Have)

Replace the `User.role` string field with a proper `roleId` foreign key to the `Role` table. Fix the case mismatch between Role names and User role strings.

**Schema Changes:**

```prisma
model User {
  // REMOVE: role String @default("USER")
  // ADD:
  roleId String @map("role_id")
  role   Role   @relation(fields: [roleId], references: [id])

  // ... rest unchanged
}

model Role {
  // ADD:
  users User[]

  // ... rest unchanged
}
```

**Migration Strategy:**

1. Add nullable `roleId` column to `users` table
2. Backfill: For each user, find the matching `Role` by name (case-insensitive)
   - `User.role = "ADMIN"` → find `Role.name = "admin"` → set `User.roleId`
   - `User.role = "USER"` → find `Role.name = "user"` → set `User.roleId`
   - Any user with a role string that doesn't match any `Role.name` → assign to `user` system role (safe fallback)
3. Make `roleId` non-nullable after backfill
4. Drop old `role` string column
5. Add `onDelete: Restrict` on the FK (prevent deleting roles with assigned users)

**Seed Script Updates:**

- Roles seeded first (with deterministic UUIDs for test stability), then users reference Role IDs
- Role names remain lowercase: `admin`, `user`
- Remove uppercase `role: "ADMIN"` from user creation — use `roleId` instead
- Seed order enforced: roles → organizations → users (dependency chain)

**JWT Token Update:**

- Token payload must include `roleId` (UUID) instead of the old `role` string
- Also include `roleName` (string) for backward compatibility and logging
- Auth middleware resolves `Role.permissions` from `roleId` at request time (not baked into token — permissions can change without re-login)

**Acceptance Criteria:**

- [x] Migration adds `role_id` FK column to `users` table with type UUID
- [x] Migration backfills ALL existing users — `SELECT count(*) FROM users WHERE role_id IS NULL` = 0 after migration
- [x] Users with `role="ADMIN"` are backfilled to the admin role's UUID
- [x] Users with `role="USER"` are backfilled to the user role's UUID
- [x] Users with unexpected role strings (e.g., `"MANAGER"`) are safely backfilled to the `user` system role
- [x] Old `role` string column is dropped from the `users` table after backfill
- [x] `User.roleId` column has `NOT NULL` constraint after backfill step
- [x] FK constraint `users.role_id → roles.id` exists with `ON DELETE RESTRICT`
- [x] Attempting to delete a role that has assigned users raises a Prisma foreign key constraint error (caught and returned as 400)
- [x] `Role` model has `users User[]` reverse relation in Prisma schema
- [x] `prisma generate` succeeds with zero type errors across entire backend
- [x] `npx prisma migrate deploy` applies cleanly on both empty and seeded databases
- [x] Seed script creates roles before users — no FK violation during seeding
- [x] Seed script is idempotent — running `make db-seed` twice produces no duplicates
- [x] Login response JWT payload includes `roleId` (UUID string)
- [x] Login response JWT payload includes `roleName` (string, e.g., `"admin"`)
- [x] `req.user` populated by `authenticate` middleware includes `roleId` field
- [x] Existing login flow (`POST /v1/auth/login`) works with correct credentials after migration
- [x] Existing register flow (`POST /v1/auth/register`) creates user with default `user` role FK
- [x] Token refresh (`POST /v1/auth/refresh`) works correctly after migration
- [x] `GET /v1/auth/me` returns user profile with role information

**Test Cases (R1):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T1.1 | Migration backfill - admin user | Pre-existing user with `role="ADMIN"` | `roleId` set to admin Role UUID, old `role` column dropped |
| T1.2 | Migration backfill - standard user | Pre-existing user with `role="USER"` | `roleId` set to user Role UUID |
| T1.3 | Migration backfill - unknown role string | Pre-existing user with `role="MANAGER"` (no matching Role) | `roleId` set to `user` system role (safe fallback) |
| T1.4 | Migration backfill - case variations | Users with `role="Admin"`, `role="admin"`, `role="ADMIN"` | All correctly mapped to admin Role UUID |
| T1.5 | Migration on empty database | No users exist | Migration completes without error |
| T1.6 | Migration idempotency | Run migration twice | Second run is a no-op (already applied) |
| T1.7 | FK constraint - delete role with users | `DELETE` role that has 2 assigned users | 400 error: "Cannot delete role with 2 assigned user(s). Reassign them first." |
| T1.8 | FK constraint - delete role with zero users | `DELETE` custom role with no users | 200 OK — role deleted |
| T1.9 | FK constraint - create user with non-existent roleId | `POST /v1/settings/users` with `roleId: "non-existent-uuid"` | 400 error: FK constraint (or "Role not found") |
| T1.10 | FK constraint - create user with valid roleId | `POST /v1/settings/users` with valid roleId | 201 — user created, linked to role |
| T1.11 | Default role assignment | `POST /v1/auth/register` with no role specified | User created with `user` system role |
| T1.12 | Login JWT payload | `POST /v1/auth/login` with `admin@patchiq.io` | Token decoded contains `roleId` (UUID) and `roleName: "admin"` |
| T1.13 | Login JWT payload - custom role | User assigned to custom `patch-manager` role, logs in | Token has `roleId` for patch-manager and `roleName: "patch-manager"` |
| T1.14 | Token refresh after migration | Login, then `POST /v1/auth/refresh` with refresh token | New access token has `roleId` field |
| T1.15 | Seed script order | `make db-seed` on empty DB | Roles seeded before users — no FK violations |
| T1.16 | Seed script idempotency | `make db-seed` twice | No duplicate roles, no duplicate users, no errors |
| T1.17 | Role relation query | `prisma.user.findFirst({ include: { role: true } })` | Returns user with nested `role` object (id, name, permissions) |
| T1.18 | Reverse relation query | `prisma.role.findFirst({ include: { users: true } })` | Returns role with array of assigned users |
| T1.19 | User update - change role | `PUT /v1/settings/users/:id { roleId: newRoleId }` | User's roleId updated, subsequent requests use new permissions |
| T1.20 | Concurrent user creation | Create 10 users simultaneously with same roleId | All succeed, no race conditions |

---

### R2: Permission-Checking Middleware (P0 — Must Have)

Create a new `checkPermission(module, action)` middleware that reads `Role.permissions` JSON at runtime and gates access by module + action.

**Location**: `backend/src/middleware/rbac.ts`

**Middleware Signature:**

```typescript
type PermissionModule =
  | 'agents' | 'assets' | 'patches' | 'vulnerabilities'
  | 'jobs' | 'discovery' | 'reports' | 'dashboard'
  | 'settings' | 'deployments' | 'notifications'
  | 'hub' | 'patch-repository' | 'patch-templates'
  | 'ai';

type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

function checkPermission(module: PermissionModule, action: PermissionAction): RequestHandler;
```

**Runtime Flow:**

```
Request arrives → authenticate (JWT) → checkPermission(module, action)
    ↓
1. Extract roleId from req.user
2. Fetch Role by roleId (with caching — see below)
3. Read permissions JSON: role.permissions[module]?.[action]
4. If true → next()
5. If false or undefined → 403 ForbiddenError with message:
   "You do not have permission to {action} {module}"
```

**Permission Resolution Rules (STRICT — deny by default):**

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| `permissions.patches.view === true` | Access **granted** | Explicit grant |
| `permissions.patches.view === false` | Access **denied** (403) | Explicit deny |
| `permissions.patches` is undefined | Access **denied** (403) | Module not in permissions → deny by default |
| `permissions` is `{}` (empty object) | Access **denied** for all modules (403) | No permissions granted |
| `permissions` is `null` or malformed | Access **denied** (403) + log warning | Defensive: treat corruption as denied |
| Role has `name === "admin"` AND `isSystem === true` | Access **granted** for ALL modules/actions | Admin bypass (only for the system admin role) |
| Role named "admin" but `isSystem === false` | **No bypass** — check permissions normally | Prevents custom role named "admin" from getting bypass |
| `roleId` not found in DB (deleted role) | Access **denied** (403) with "Role not found" | Prevent stale tokens from accessing anything |
| Action is not one of `view/add/edit/delete` | Middleware rejects at build time (TypeScript) | Type safety prevents invalid actions |

**Role Cache Strategy:**

- Cache `Role` records in memory (`Map<string, { role: Role, cachedAt: number }>`) with 60-second TTL
- On cache miss: fetch from DB, store in cache
- On cache hit with TTL expired: fetch from DB, update cache
- Invalidate specific role on update/delete (emit from role service via a simple event emitter or function call)
- `clearRoleCache()` exported for testing
- Cache key: `roleId` (UUID string)
- Cache is per-process (not shared across workers) — acceptable for single-process backend

**Acceptance Criteria:**

- [x] `checkPermission('patches', 'view')` middleware grants access when `role.permissions.patches.view === true`
- [x] `checkPermission('patches', 'add')` middleware returns 403 when `role.permissions.patches.add === false`
- [x] `checkPermission('patches', 'edit')` middleware returns 403 when `role.permissions.patches` exists but has no `edit` key
- [x] Missing module key in permissions JSON defaults to **denied** (not granted)
- [x] Empty permissions `{}` denies access to every module
- [x] `null` permissions value treated as denied (defensive)
- [x] Malformed permissions JSON (e.g., `permissions = "invalid"`) treated as denied + warning logged
- [x] Admin system role (`name === "admin"` AND `isSystem === true`) bypasses ALL permission checks
- [x] Custom role named "admin" with `isSystem === false` does NOT get admin bypass
- [x] 403 response body follows standard envelope: `{ success: false, error: { message: "You do not have permission to {action} {module}", code: "FORBIDDEN" } }`
- [x] 403 response does NOT leak role details (no role name, no permissions dump in error)
- [x] Role data is cached in memory with 60-second TTL
- [x] Cache is invalidated when role is updated via settings API
- [x] Cache is invalidated when role is deleted via settings API
- [x] `clearRoleCache()` function is exported for use in tests
- [x] Middleware correctly chains after `authenticate` — if `authenticate` rejects (401), `checkPermission` is never called
- [x] Middleware does not modify `req.user` (read-only)
- [x] Concurrent requests from users with the same role share cached role data (no duplicate DB queries)
- [x] When role is fetched from DB and not found (deleted between token issue and request), return 403 not 500
- [x] PermissionModule and PermissionAction types exported from `middleware/rbac.ts` for use in route files
- [x] No `any` types used in middleware implementation

**Test Cases (R2):**

| ID | Test | Setup | Request | Expected |
|----|------|-------|---------|----------|
| T2.1 | Admin bypass — all modules | User with system admin role | `DELETE /v1/settings/roles/:id` | 200 OK |
| T2.2 | Admin bypass — even unrecognized module | User with system admin role, theoretical `checkPermission('unknown', 'view')` | N/A (compile-time check) | TypeScript error — invalid module |
| T2.3 | Explicit grant — view | Custom role `{ patches: { view: true, add: false, edit: false, delete: false } }` | `GET /v1/patches` | 200 OK |
| T2.4 | Explicit deny — add | Same role as T2.3 | `POST /v1/patches` | 403 Forbidden |
| T2.5 | Explicit deny — edit | Same role as T2.3 | `PUT /v1/patches/:id` | 403 Forbidden |
| T2.6 | Explicit deny — delete | Same role as T2.3 | `DELETE /v1/patches/:id` | 403 Forbidden |
| T2.7 | Missing module key | Custom role `{ patches: { view: true } }` — no `settings` key | `GET /v1/settings/roles` | 403 Forbidden |
| T2.8 | Empty permissions | Custom role `{ permissions: {} }` | `GET /v1/agents` | 403 Forbidden |
| T2.9 | Empty permissions — all four actions | Custom role `{ permissions: {} }` | `GET, POST, PUT, DELETE /v1/assets` | All 403 |
| T2.10 | Error message format — view denied | Role without dashboard permission | `GET /v1/dashboard/stats` | `{ success: false, error: { message: "You do not have permission to view dashboard" } }` |
| T2.11 | Error message format — add denied | Role without patches add | `POST /v1/patches` | `"You do not have permission to add patches"` |
| T2.12 | Error message format — edit denied | Role without assets edit | `PUT /v1/assets/:id` | `"You do not have permission to edit assets"` |
| T2.13 | Error message format — delete denied | Role without jobs delete | `DELETE /v1/jobs/:id` | `"You do not have permission to delete jobs"` |
| T2.14 | No auth header | No JWT + route with checkPermission | Any RBAC-protected route | 401 Unauthorized (auth catches first) |
| T2.15 | Invalid/expired JWT | Expired token + route with checkPermission | Any RBAC-protected route | 401 Unauthorized (auth catches first) |
| T2.16 | Deleted role (stale token) | Valid JWT with roleId of a now-deleted role | `GET /v1/assets` | 403 "Role not found" |
| T2.17 | Cache hit | Same user makes 10 requests in 5 seconds | All 10 requests | Only 1 DB query for role, 9 cache hits |
| T2.18 | Cache expiry | Request, wait 61 seconds, another request | Second request | Fresh DB query (cache expired) |
| T2.19 | Cache invalidation on update | Admin updates role permissions, user makes request | User's next request | Uses updated permissions (not stale cache) |
| T2.20 | Cache invalidation on delete | Admin deletes role, user with that role makes request | User's request | 403 "Role not found" |
| T2.21 | Concurrent requests — same role | 50 simultaneous requests from users with role X | All requests | Max 1 DB query, all get correct permissions |
| T2.22 | Fake admin role | Custom role named "admin" with `isSystem: false` | `DELETE /v1/settings/roles/:id` | 403 Forbidden (no bypass) |
| T2.23 | Partial module permissions | Role `{ patches: { view: true, add: true }, assets: { view: true } }` | `DELETE /v1/patches/:id` | 403 (patches.delete not set → denied) |
| T2.24 | Null permissions field | Role with `permissions: null` in DB (data corruption) | `GET /v1/agents` | 403 + warning logged (not 500) |
| T2.25 | Mixed grant/deny across modules | Role `{ patches: { view: true, add: true, edit: true, delete: false }, settings: { view: false } }` | `GET /v1/patches` then `GET /v1/settings` | 200, 403 respectively |
| T2.26 | Middleware ordering | Route: `authenticate, checkPermission, controller` | Unauthenticated request | 401 (not 403 — auth runs first) |

---

### R3: Apply RBAC to ALL Routes (P0 — Must Have)

Apply `checkPermission(module, action)` middleware to every authenticated route in the application. Map HTTP methods to permission actions.

**HTTP Method → Permission Action Mapping:**

| HTTP Method | Permission Action | Notes |
|-------------|-------------------|-------|
| `GET` (list/detail) | `view` | Includes search, filter, export, download |
| `POST` (create) | `add` | Includes import, upload, trigger actions |
| `PUT` / `PATCH` (update) | `edit` | Includes status changes, bulk update, approve/reject |
| `DELETE` | `delete` | Includes bulk delete, purge |

**Special Case Mappings:**

Some routes don't follow the standard CRUD pattern. These require explicit action mapping:

| Route | HTTP Method | Permission Action | Reason |
|-------|-------------|-------------------|--------|
| `POST /v1/vulnerabilities/sync` | POST | `edit` | Triggers a sync operation, not creating a new vulnerability |
| `POST /v1/reports/generate` | POST | `add` | Creates a new report |
| `POST /v1/reports/:id/export` | POST | `view` | Exports existing data (read operation) |
| `POST /v1/discovery/scan` | POST | `add` | Initiates a new scan |
| `POST /v1/agents/:id/command` | POST | `edit` | Sends command to existing agent |
| `PUT /v1/settings/users/:id/suspend` | PUT | `edit` | Status change on existing user |
| `PUT /v1/settings/users/:id/activate` | PUT | `edit` | Status change on existing user |

**Module → Route Mapping (Comprehensive):**

| Module Key | Routes | Current Auth | RBAC to Add |
|------------|--------|-------------|-------------|
| `agents` | `/v1/agents/*` | `authenticate` | `checkPermission('agents', ...)` |
| `assets` | `/v1/assets/*` (includes `/categories/*`, `/subcategories/*`, `/tags/*`, `/licenses/*`) | `authenticate` | `checkPermission('assets', ...)` |
| `patches` | `/v1/patches/*`, `/v1/patch-recommendations/*`, `/v1/patch-tests/*`, `/v1/zero-touch-configs/*` | `authenticate` | `checkPermission('patches', ...)` |
| `vulnerabilities` | `/v1/vulnerabilities/*` (includes `/sync/*`) | `authenticate` | `checkPermission('vulnerabilities', ...)` |
| `jobs` | `/v1/jobs/*` | `authenticate` | `checkPermission('jobs', ...)` |
| `deployments` | `/v1/deployments/*`, `/v1/deployment-policies/*` | `authenticate` | `checkPermission('deployments', ...)` |
| `discovery` | `/v1/discovery/*` | `authenticate` | `checkPermission('discovery', ...)` |
| `reports` | `/v1/reports/*` | `authenticate` | `checkPermission('reports', ...)` |
| `dashboard` | `/v1/dashboard/*` | `authenticate` | `checkPermission('dashboard', ...)` |
| `settings` | `/v1/settings/*` (orgs, users, roles, branches, departments, locations, all config sub-routes) | `authenticate` | `checkPermission('settings', ...)` |
| `hub` | `/v1/hub/*` | `authenticate` | `checkPermission('hub', ...)` |
| `patch-repository` | `/v1/patch-repository/*` | `authenticate` | `checkPermission('patch-repository', ...)` |
| `patch-templates` | `/v1/patch-templates/*` | `authenticate` | `checkPermission('patch-templates', ...)` |
| `ai` | `/v1/ai/*` | `authenticate` | `checkPermission('ai', ...)` |
| `notifications` | `/v1/notifications/*` (except SSE stream) | `authenticate` | `checkPermission('notifications', ...)` |

**Routes EXCLUDED from RBAC (remain public or use separate auth):**

| Route | Reason | Verification |
|-------|--------|-------------|
| `POST /v1/auth/login` | Must be public (pre-authentication) | No `authenticate` middleware |
| `POST /v1/auth/register` | Must be public | No `authenticate` middleware |
| `POST /v1/auth/refresh` | Uses refresh token, not role | Has `authenticate` but no RBAC |
| `POST /v1/auth/forgot-password` | Must be public | No `authenticate` middleware |
| `POST /v1/auth/reset-password` | Uses reset token | No `authenticate` middleware |
| `GET /v1/auth/me` | Returns current user's own profile | Has `authenticate` but no RBAC — any logged-in user |
| `PUT /v1/auth/me` | Updates current user's own profile | Has `authenticate` but no RBAC |
| `PUT /v1/auth/change-password` | Changes own password | Has `authenticate` but no RBAC |
| `/api/agent/*` | Agent-to-backend API (agent token auth) | Separate auth system entirely |
| `GET /v1/bundles/:id/download` | Public download endpoint | No `authenticate` middleware |
| `GET /v1/patches/:id/bundle/stream` | Public stream endpoint | No `authenticate` middleware |
| `GET /v1/notifications/stream` | SSE stream (query-param token) | Separate auth mechanism |

**Implementation Approach:**

Apply middleware at the route-file level, not in `app.ts`. Each module's routes file adds `checkPermission` per route:

```typescript
// Example: backend/src/modules/patches/patches.routes.ts
import { checkPermission } from '@middleware/rbac';

router.get('/', authenticate, checkPermission('patches', 'view'), controller.list);
router.get('/:id', authenticate, checkPermission('patches', 'view'), controller.get);
router.post('/', authenticate, checkPermission('patches', 'add'), controller.create);
router.put('/:id', authenticate, checkPermission('patches', 'edit'), controller.update);
router.delete('/:id', authenticate, checkPermission('patches', 'delete'), controller.delete);
```

**Route Audit Procedure:**

After implementation, run a verification that:
1. Lists every registered Express route (using `express-list-endpoints` or custom script)
2. Checks that non-excluded routes have `checkPermission` in their middleware chain
3. Flags any route missing RBAC middleware

**Acceptance Criteria:**

- [x] Every authenticated route (except exclusions above) has `checkPermission` middleware applied
- [x] HTTP GET → `view`, POST → `add`, PUT/PATCH → `edit`, DELETE → `delete` mapping applied consistently
- [x] Special-case routes (sync, export, command) have correct action mapping documented and applied
- [x] `USER` role with default permissions CANNOT access `settings` endpoints — returns 403
- [x] `USER` role with default permissions CAN `GET` dashboard, assets, patches, vulnerabilities, agents, jobs, deployments, discovery, reports, hub, patch-repository, patch-templates, ai (view only)
- [x] `USER` role with default permissions CANNOT `POST/PUT/DELETE` on any module except notifications
- [x] Custom role with `patches: { view: true, add: true, edit: false, delete: false }` can `GET` and `POST` patches but gets 403 on `PUT` and `DELETE`
- [x] Agent API routes (`/api/agent/*`) are NOT affected by RBAC — agent heartbeat, registration, inventory still work
- [x] Auth routes (`/v1/auth/*`) are NOT affected by RBAC — login, register, refresh, password reset all work without permission check
- [x] `GET /v1/auth/me` works for any authenticated user regardless of permissions
- [x] Public routes (bundle download, patch stream) work without any token
- [x] SSE notification stream works with query-param token auth
- [x] Route audit script confirms 0 unprotected routes (excluding documented exclusions)
- [x] No HTTP 500 errors introduced — all RBAC denials return clean 403
- [x] Existing unit tests still pass after adding middleware (no broken route signatures)
- [x] Each route file imports `checkPermission` from `@middleware/rbac`

**Test Cases (R3) — Per-Module Verification:**

| ID | Test | User Role | Route | Method | Expected |
|----|------|-----------|-------|--------|----------|
| **Agents Module** | | | | | |
| T3.1 | Admin list agents | admin | `GET /v1/agents` | GET | 200 |
| T3.2 | User view agents | user (default) | `GET /v1/agents` | GET | 200 |
| T3.3 | User create agent | user (default) | `POST /v1/agents` | POST | 403 |
| T3.4 | User update agent | user (default) | `PUT /v1/agents/:id` | PUT | 403 |
| T3.5 | User delete agent | user (default) | `DELETE /v1/agents/:id` | DELETE | 403 |
| **Assets Module** | | | | | |
| T3.6 | User view assets | user (default) | `GET /v1/assets` | GET | 200 |
| T3.7 | User create asset | user (default) | `POST /v1/assets` | POST | 403 |
| T3.8 | User view asset categories | user (default) | `GET /v1/assets/categories` | GET | 200 |
| T3.9 | User create asset category | user (default) | `POST /v1/assets/categories` | POST | 403 |
| **Patches Module** | | | | | |
| T3.10 | Patch manager view | `{ patches: { view:T, add:T, edit:T, delete:F } }` | `GET /v1/patches` | GET | 200 |
| T3.11 | Patch manager create | Same role | `POST /v1/patches` | POST | 200/201 |
| T3.12 | Patch manager update | Same role | `PUT /v1/patches/:id` | PUT | 200 |
| T3.13 | Patch manager delete DENIED | Same role | `DELETE /v1/patches/:id` | DELETE | 403 |
| T3.14 | Patch manager view recommendations | Same role | `GET /v1/patch-recommendations` | GET | 200 |
| T3.15 | Patch manager view patch-tests | Same role | `GET /v1/patch-tests` | GET | 200 |
| **Vulnerabilities Module** | | | | | |
| T3.16 | User view vulnerabilities | user (default) | `GET /v1/vulnerabilities` | GET | 200 |
| T3.17 | User trigger CVE sync | user (default) | `POST /v1/vulnerabilities/sync` | POST | 403 |
| T3.18 | Admin trigger CVE sync | admin | `POST /v1/vulnerabilities/sync` | POST | 200 |
| T3.19 | User delete vulnerability | user (default) | `DELETE /v1/vulnerabilities/:id` | DELETE | 403 |
| **Jobs Module** | | | | | |
| T3.20 | User view jobs | user (default) | `GET /v1/jobs` | GET | 200 |
| T3.21 | User create job | user (default) | `POST /v1/jobs` | POST | 403 |
| **Deployments Module** | | | | | |
| T3.22 | User view deployments | user (default) | `GET /v1/deployments` | GET | 200 |
| T3.23 | User create deployment | user (default) | `POST /v1/deployments` | POST | 403 |
| T3.24 | User view deployment policies | user (default) | `GET /v1/deployment-policies` | GET | 200 |
| T3.25 | User create deployment policy | user (default) | `POST /v1/deployment-policies` | POST | 403 |
| **Discovery Module** | | | | | |
| T3.26 | User view discoveries | user (default) | `GET /v1/discovery` | GET | 200 |
| T3.27 | User trigger scan | user (default) | `POST /v1/discovery/scan` | POST | 403 |
| **Reports Module** | | | | | |
| T3.28 | User view reports | user (default) | `GET /v1/reports` | GET | 200 |
| T3.29 | User generate report | user (default) | `POST /v1/reports/generate` | POST | 403 |
| **Dashboard Module** | | | | | |
| T3.30 | User view dashboard | user (default) | `GET /v1/dashboard/stats` | GET | 200 |
| **Settings Module** | | | | | |
| T3.31 | User denied settings - roles | user (default) | `GET /v1/settings/roles` | GET | 403 |
| T3.32 | User denied settings - users | user (default) | `GET /v1/settings/users` | GET | 403 |
| T3.33 | User denied settings - orgs | user (default) | `GET /v1/settings/organizations` | GET | 403 |
| T3.34 | User denied settings - config | user (default) | `GET /v1/settings/mail` | GET | 403 |
| T3.35 | Admin allowed settings - all | admin | `GET /v1/settings/roles` | GET | 200 |
| **Hub Module** | | | | | |
| T3.36 | User view hub | user (default) | `GET /v1/hub` | GET | 200 |
| T3.37 | User create hub package | user (default) | `POST /v1/hub` | POST | 403 |
| **AI Module** | | | | | |
| T3.38 | User use AI chat | user (default) | `GET /v1/ai/chat` | GET | 200 |
| T3.39 | User modify AI config | user (default) | `PUT /v1/ai/config` | PUT | 403 |
| **Excluded Routes** | | | | | |
| T3.40 | Login - no auth needed | unauthenticated | `POST /v1/auth/login` | POST | 200 (valid creds) |
| T3.41 | Register - no auth needed | unauthenticated | `POST /v1/auth/register` | POST | 200/201 |
| T3.42 | Profile - any auth user | user with empty permissions `{}` | `GET /v1/auth/me` | GET | 200 |
| T3.43 | Change password - any auth user | user with empty permissions `{}` | `PUT /v1/auth/change-password` | PUT | 200 |
| T3.44 | Agent heartbeat unaffected | agent token (not user JWT) | `POST /api/agent/heartbeat` | POST | 200 |
| T3.45 | Agent inventory unaffected | agent token | `POST /api/agent/inventory` | POST | 200 |
| T3.46 | Bundle download - public | unauthenticated | `GET /v1/bundles/:id/download` | GET | 200 |
| **Cross-Cutting** | | | | | |
| T3.47 | Empty permissions user denied ALL | `{ permissions: {} }` | `GET /v1/agents` | GET | 403 |
| T3.48 | Empty permissions user denied ALL | `{ permissions: {} }` | `GET /v1/assets` | GET | 403 |
| T3.49 | Empty permissions user denied ALL | `{ permissions: {} }` | `GET /v1/dashboard/stats` | GET | 403 |
| T3.50 | Route audit script | — | Run route audit | 0 unprotected routes (excluding documented exclusions) |

---

### R4: Permission CRUD Hardening (P0 — Must Have)

Harden the existing role CRUD in the settings module: validate permission JSON shape, protect system roles, and prevent orphan states.

**4A: Permission JSON Validation**

Enhance the Zod validator in `settings.validators.ts` to enforce the exact shape of the permissions object:

```typescript
const modulePermissionSchema = z.object({
  view: z.boolean(),
  add: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
});

const rolePermissionsSchema = z.object({
  agents: modulePermissionSchema.optional(),
  assets: modulePermissionSchema.optional(),
  patches: modulePermissionSchema.optional(),
  vulnerabilities: modulePermissionSchema.optional(),
  jobs: modulePermissionSchema.optional(),
  deployments: modulePermissionSchema.optional(),
  discovery: modulePermissionSchema.optional(),
  reports: modulePermissionSchema.optional(),
  dashboard: modulePermissionSchema.optional(),
  settings: modulePermissionSchema.optional(),
  hub: modulePermissionSchema.optional(),
  'patch-repository': modulePermissionSchema.optional(),
  'patch-templates': modulePermissionSchema.optional(),
  ai: modulePermissionSchema.optional(),
  notifications: modulePermissionSchema.optional(),
}).strict(); // Reject unknown module keys
```

**4B: System Role Protection**

| Action | System Role (`isSystem: true`) | Custom Role |
|--------|-------------------------------|-------------|
| Read (GET) | Allowed | Allowed |
| Update permissions | **Blocked (400)**: "Cannot modify system role permissions" | Allowed |
| Update name | **Blocked (400)**: "Cannot rename system role" | Allowed |
| Update description | Allowed (informational only) | Allowed |
| Delete | **Blocked (400)**: "Cannot delete system role" | Allowed (if no users assigned) |

**4C: Orphan Prevention**

- Cannot delete a role that has users assigned → return `400: "Cannot delete role with N assigned user(s). Reassign them first."`
- Cannot create a role with a duplicate name → return `409: "Role with name 'X' already exists"`
- When updating a role's permissions, validate against the strict Zod schema before saving
- When deleting a role, check user count BEFORE attempting delete (not relying on FK error)

**4D: Default Role for New Users**

- New users created without an explicit `roleId` get the `user` system role by default
- The `user` system role must always exist — cannot be deleted (enforced by `isSystem: true`)
- Register endpoint (`POST /v1/auth/register`) always assigns `user` role

**4E: Update Shared Types**

Update the `RolePermissions` interface in `shared/types/api.ts` to include all module keys:

```typescript
export interface RolePermissions {
  agents?: ModulePermissions;
  assets?: ModulePermissions;
  patches?: ModulePermissions;
  vulnerabilities?: ModulePermissions;
  jobs?: ModulePermissions;
  deployments?: ModulePermissions;
  discovery?: ModulePermissions;
  reports?: ModulePermissions;
  dashboard?: ModulePermissions;
  settings?: ModulePermissions;
  hub?: ModulePermissions;
  'patch-repository'?: ModulePermissions;
  'patch-templates'?: ModulePermissions;
  ai?: ModulePermissions;
  notifications?: ModulePermissions;
}
```

**4F: Login Response Enhancement**

Include resolved permissions in the login response so the frontend can render UI accordingly:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "user": {
      "id": "uuid",
      "email": "admin@patchiq.io",
      "name": "Admin User",
      "role": {
        "id": "uuid",
        "name": "admin",
        "permissions": {
          "agents": { "view": true, "add": true, "edit": true, "delete": true },
          "assets": { "view": true, "add": true, "edit": true, "delete": true },
          "...": "..."
        }
      }
    }
  }
}
```

**4G: Role Name Constraints**

- Role names must be 1-100 characters
- Role names must be lowercase alphanumeric + hyphens only (regex: `^[a-z0-9][a-z0-9-]*[a-z0-9]$` or single char `^[a-z0-9]$`)
- No leading/trailing hyphens, no consecutive hyphens
- Role names are case-insensitive for uniqueness (stored lowercase)

**Acceptance Criteria:**

- [x] Invalid permissions JSON with wrong type (e.g., `{ "patches": { "view": "yes" } }`) rejected with Zod error listing the exact field
- [x] Permissions JSON with missing action key (e.g., `{ "patches": { "view": true } }` — missing add/edit/delete) rejected with Zod error
- [x] Unknown module key in permissions (e.g., `{ "foobar": { "view": true, "add": true, "edit": true, "delete": true } }`) rejected by `strict()` mode
- [x] Extra keys inside module permissions (e.g., `{ "patches": { "view": true, "add": true, "edit": true, "delete": true, "export": true } }`) rejected
- [x] Empty permissions `{}` is valid (means deny all — legitimate for a locked-down role)
- [x] System role `admin` cannot be deleted → 400 "Cannot delete system role"
- [x] System role `user` cannot be deleted → 400 "Cannot delete system role"
- [x] System role `admin` name cannot be changed → 400 "Cannot rename system role"
- [x] System role `admin` permissions cannot be modified → 400 "Cannot modify system role permissions"
- [x] System role description CAN be updated → 200 OK with updated description
- [x] Deleting custom role with 3 assigned users → 400 "Cannot delete role with 3 assigned user(s). Reassign them first."
- [x] Deleting custom role with 0 users → 200 OK (role deleted)
- [x] Duplicate role name on create → 409 "Role with name 'patch-manager' already exists"
- [x] Duplicate role name (case-insensitive) → 409 (e.g., creating "Admin" when "admin" exists)
- [x] Role name validation: `"my-role"` → accepted, `"My Role"` → rejected (uppercase + space), `"-bad"` → rejected (leading hyphen), `""` → rejected (empty)
- [x] Login response (`POST /v1/auth/login`) includes `data.user.role` object with `id`, `name`, `permissions`
- [x] `GET /v1/auth/me` response includes `role` object with permissions
- [x] New user via register gets `user` system role by default
- [x] New user via admin create without roleId gets `user` system role by default
- [x] `RolePermissions` shared type in `shared/types/api.ts` includes all 15 module keys
- [x] `RolePermissions` shared type matches the Zod schema exactly (same module keys)
- [x] Creating role with all valid module permissions → 201 OK
- [x] Updating custom role permissions → 200 OK, subsequent requests use new permissions

**Test Cases (R4):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| **Permission JSON Validation** | | | |
| T4.1 | Valid full permissions | `{ "patches": { "view": true, "add": false, "edit": false, "delete": false } }` | 201 Created |
| T4.2 | Valid multi-module | `{ "patches": { "view": true, "add": true, "edit": true, "delete": false }, "assets": { "view": true, "add": false, "edit": false, "delete": false } }` | 201 Created |
| T4.3 | Valid empty permissions | `{ "permissions": {} }` | 201 Created |
| T4.4 | Invalid boolean type | `{ "patches": { "view": "yes", "add": false, "edit": false, "delete": false } }` | 400 Zod: "Expected boolean, received string at patches.view" |
| T4.5 | Missing action key | `{ "patches": { "view": true } }` | 400 Zod: "Required at patches.add" |
| T4.6 | Extra action key | `{ "patches": { "view": true, "add": true, "edit": true, "delete": true, "export": true } }` | 400 Zod: "Unrecognized key: export" |
| T4.7 | Unknown module key | `{ "foobar": { "view": true, "add": true, "edit": true, "delete": true } }` | 400 Zod: "Unrecognized key: foobar" |
| T4.8 | Nested invalid structure | `{ "patches": true }` (not an object) | 400 Zod error |
| T4.9 | Null permissions | `{ "permissions": null }` | 400 Zod error |
| T4.10 | Array instead of object | `{ "permissions": [] }` | 400 Zod error |
| T4.11 | Number instead of boolean | `{ "patches": { "view": 1, "add": 0, "edit": 0, "delete": 0 } }` | 400 Zod error |
| T4.12 | All 15 module keys valid | Full permissions object with all 15 modules | 201 Created |
| **System Role Protection** | | | |
| T4.13 | Delete admin system role | `DELETE /v1/settings/roles/:adminRoleId` | 400 "Cannot delete system role" |
| T4.14 | Delete user system role | `DELETE /v1/settings/roles/:userRoleId` | 400 "Cannot delete system role" |
| T4.15 | Rename admin role | `PUT /v1/settings/roles/:adminRoleId { name: "superadmin" }` | 400 "Cannot rename system role" |
| T4.16 | Rename user role | `PUT /v1/settings/roles/:userRoleId { name: "basic" }` | 400 "Cannot rename system role" |
| T4.17 | Modify admin permissions | `PUT /v1/settings/roles/:adminRoleId { permissions: { agents: { view: false, ... } } }` | 400 "Cannot modify system role permissions" |
| T4.18 | Modify user permissions | `PUT /v1/settings/roles/:userRoleId { permissions: {...} }` | 400 "Cannot modify system role permissions" |
| T4.19 | Update admin description | `PUT /v1/settings/roles/:adminRoleId { description: "Updated desc" }` | 200 OK |
| T4.20 | Update user description | `PUT /v1/settings/roles/:userRoleId { description: "Updated desc" }` | 200 OK |
| **Orphan Prevention** | | | |
| T4.21 | Delete role with 1 user | Custom role with 1 assigned user | 400 "Cannot delete role with 1 assigned user(s). Reassign them first." |
| T4.22 | Delete role with 5 users | Custom role with 5 assigned users | 400 "Cannot delete role with 5 assigned user(s). Reassign them first." |
| T4.23 | Delete role after reassigning users | Reassign all users to another role, then delete | 200 OK |
| T4.24 | Duplicate name - exact match | Create role "viewer", then create another "viewer" | 409 "Role with name 'viewer' already exists" |
| T4.25 | Duplicate name - case insensitive | Create role "viewer", then create "Viewer" | 409 (or 400 from name validation: uppercase not allowed) |
| **Role Name Validation** | | | |
| T4.26 | Valid name - simple | `"viewer"` | 201 Created |
| T4.27 | Valid name - hyphenated | `"patch-manager"` | 201 Created |
| T4.28 | Valid name - with numbers | `"level2-admin"` | 201 Created |
| T4.29 | Invalid name - spaces | `"patch manager"` | 400 validation error |
| T4.30 | Invalid name - uppercase | `"PatchManager"` | 400 validation error |
| T4.31 | Invalid name - leading hyphen | `"-viewer"` | 400 validation error |
| T4.32 | Invalid name - trailing hyphen | `"viewer-"` | 400 validation error |
| T4.33 | Invalid name - special chars | `"admin@role"` | 400 validation error |
| T4.34 | Invalid name - empty string | `""` | 400 validation error |
| T4.35 | Invalid name - too long | 101 characters | 400 validation error |
| T4.36 | Valid name - single char | `"a"` | 201 Created |
| **Login Response** | | | |
| T4.37 | Admin login response | `POST /v1/auth/login` with admin creds | `data.user.role = { id, name: "admin", permissions: { agents: { view: true, ... }, ... } }` |
| T4.38 | User login response | `POST /v1/auth/login` with demo creds | `data.user.role = { id, name: "user", permissions: { agents: { view: true, add: false, ... }, ... } }` |
| T4.39 | Custom role login response | Login as user with custom `patch-manager` role | `data.user.role = { id, name: "patch-manager", permissions: { patches: {...}, ... } }` |
| T4.40 | Me endpoint response | `GET /v1/auth/me` as admin | Response includes `role` with permissions |
| **Default Role Assignment** | | | |
| T4.41 | Register without role | `POST /v1/auth/register { email, password }` | User gets `user` system role |
| T4.42 | Admin creates user without role | `POST /v1/settings/users { email, ... }` (no roleId) | User gets `user` system role |
| T4.43 | Admin creates user with custom role | `POST /v1/settings/users { email, roleId: customRoleId }` | User gets custom role |

---

### R5: Validation Script (P0 — Must Have)

Create an automated validation script that proves RBAC works end-to-end against a real database. The script creates test data, makes real API requests, and asserts expected outcomes.

**Location**: `backend/scripts/validate-rbac.ts`

**Script Flow:**

```
1. Preflight: Verify backend is running (health check)
2. Setup: Login as admin, create test roles + test users
3. Execute: Login as each test user, make API requests, collect responses
4. Assert: Verify 200 vs 403 responses match expected outcomes
5. Cleanup: Delete test users, then test roles (in correct order)
6. Report: Print pass/fail summary with scenario details
```

**Test Roles to Seed:**

| Role Name | Permissions | Purpose |
|-----------|-------------|---------|
| `admin` (system, pre-existing) | Full access | Baseline: everything allowed |
| `user` (system, pre-existing) | View-only on core modules, no settings | Baseline: read-only user |
| `rbac-test-patch-manager` | `patches: { view:T, add:T, edit:T, delete:F }, assets: { view:T, add:F, edit:F, delete:F }, dashboard: { view:T, add:F, edit:F, delete:F }, vulnerabilities: { view:T, add:F, edit:F, delete:F }` | Custom role: domain-specific write access |
| `rbac-test-viewer` | `dashboard: { view:T, add:F, edit:F, delete:F }, assets: { view:T, add:F, edit:F, delete:F }, vulnerabilities: { view:T, add:F, edit:F, delete:F }` | Custom role: pure read-only on subset |
| `rbac-test-empty` | `{}` (empty permissions) | Edge case: no access to anything |
| `rbac-test-settings-editor` | `settings: { view:T, add:T, edit:T, delete:F }` | Custom role: settings write without delete |

**Test Users to Seed:**

| Email | Role | Purpose |
|-------|------|---------|
| `rbac-admin@test.io` | admin (system) | Full access control |
| `rbac-user@test.io` | user (system) | Default user permissions |
| `rbac-patchmgr@test.io` | rbac-test-patch-manager | Domain-specific write |
| `rbac-viewer@test.io` | rbac-test-viewer | Read-only subset |
| `rbac-empty@test.io` | rbac-test-empty | Zero permissions |
| `rbac-settings@test.io` | rbac-test-settings-editor | Settings without delete |

**Validation Scenarios (25 total):**

| # | Category | Scenario | User | Action | Expected |
|---|----------|----------|------|--------|----------|
| **Admin Baseline** | | | | | |
| V1 | Access | Admin can list settings | rbac-admin | `GET /v1/settings/roles` | 200 |
| V2 | Access | Admin can create role | rbac-admin | `POST /v1/settings/roles` | 201 |
| V3 | Access | Admin can delete custom role | rbac-admin | `DELETE /v1/settings/roles/:testRoleId` | 200 |
| V4 | Protection | Admin cannot delete system role | rbac-admin | `DELETE /v1/settings/roles/:adminRoleId` | 400 "Cannot delete system role" |
| V5 | Protection | Admin cannot rename system role | rbac-admin | `PUT /v1/settings/roles/:adminRoleId { name: "x" }` | 400 "Cannot rename system role" |
| **Default User** | | | | | |
| V6 | Deny | User denied settings | rbac-user | `GET /v1/settings/roles` | 403 |
| V7 | Deny | User denied settings write | rbac-user | `POST /v1/settings/users` | 403 |
| V8 | Allow | User allowed dashboard view | rbac-user | `GET /v1/dashboard/stats` | 200 |
| V9 | Allow | User allowed asset view | rbac-user | `GET /v1/assets` | 200 |
| V10 | Deny | User denied asset create | rbac-user | `POST /v1/assets` | 403 |
| V11 | Allow | User allowed vulnerability view | rbac-user | `GET /v1/vulnerabilities` | 200 |
| V12 | Deny | User denied vulnerability delete | rbac-user | `DELETE /v1/vulnerabilities/:id` | 403 |
| **Patch Manager (Custom)** | | | | | |
| V13 | Allow | Patch mgr can list patches | rbac-patchmgr | `GET /v1/patches` | 200 |
| V14 | Allow | Patch mgr can create patch | rbac-patchmgr | `POST /v1/patches` | 200/201 |
| V15 | Deny | Patch mgr cannot delete patch | rbac-patchmgr | `DELETE /v1/patches/:id` | 403 |
| V16 | Deny | Patch mgr denied settings | rbac-patchmgr | `GET /v1/settings/roles` | 403 |
| V17 | Allow | Patch mgr can view assets (view only) | rbac-patchmgr | `GET /v1/assets` | 200 |
| V18 | Deny | Patch mgr cannot create asset | rbac-patchmgr | `POST /v1/assets` | 403 |
| **Viewer (Custom)** | | | | | |
| V19 | Allow | Viewer can view dashboard | rbac-viewer | `GET /v1/dashboard/stats` | 200 |
| V20 | Deny | Viewer denied patch create | rbac-viewer | `POST /v1/patches` | 403 |
| V21 | Deny | Viewer denied any write | rbac-viewer | `PUT /v1/assets/:id` | 403 |
| **Empty Permissions** | | | | | |
| V22 | Deny | Empty role denied everything | rbac-empty | `GET /v1/dashboard/stats` | 403 |
| V23 | Deny | Empty role denied everything | rbac-empty | `GET /v1/assets` | 403 |
| V24 | Deny | Empty role denied everything | rbac-empty | `GET /v1/agents` | 403 |
| **Settings Editor (Custom)** | | | | | |
| V25 | Allow | Settings editor can view settings | rbac-settings | `GET /v1/settings/roles` | 200 |
| V26 | Allow | Settings editor can create role | rbac-settings | `POST /v1/settings/roles` | 201 |
| V27 | Deny | Settings editor cannot delete role | rbac-settings | `DELETE /v1/settings/roles/:id` | 403 |
| **Validation JSON Shape** | | | | | |
| V28 | Reject | Invalid permissions JSON | rbac-admin | `POST /v1/settings/roles { permissions: { bad: "data" } }` | 400 |
| V29 | Reject | Missing action keys | rbac-admin | `POST /v1/settings/roles { permissions: { patches: { view: true } } }` | 400 |
| **Dynamic Role Change** | | | | | |
| V30 | Dynamic | Change viewer → patch-manager, immediate effect | rbac-admin updates rbac-viewer's role | Viewer retries `POST /v1/patches` | 200 (new permissions active) |
| V31 | Dynamic | Change patch-manager → empty, immediate deny | rbac-admin updates rbac-patchmgr's role | Patchmgr retries `GET /v1/patches` | 403 |
| **Login & Profile** | | | | | |
| V32 | Response | Login includes permissions | rbac-patchmgr | `POST /v1/auth/login` | `data.user.role.permissions.patches.view === true` |
| V33 | Response | Me endpoint includes permissions | rbac-viewer | `GET /v1/auth/me` | `data.role.permissions.dashboard.view === true` |
| **Auth Routes Unaffected** | | | | | |
| V34 | Exclude | Login remains public | unauthenticated | `POST /v1/auth/login` (valid creds) | 200 |
| V35 | Exclude | Profile works for empty role | rbac-empty | `GET /v1/auth/me` | 200 (auth/me excluded from RBAC) |

**Acceptance Criteria:**

- [x] Script runs with: `npx tsx backend/scripts/validate-rbac.ts`
- [x] All 35 validation scenarios pass
- [x] Script creates and cleans up its own test data — no residue after clean run
- [x] Script uses real HTTP requests to `http://localhost:3000` (not service-layer calls)
- [x] Each scenario has a named, descriptive label in the output (e.g., `[PASS] V6: User denied settings — 403`)
- [x] Failed scenarios show expected vs actual (e.g., `[FAIL] V6: Expected 403, got 200`)
- [x] Script exits with code 0 on all-pass, code 1 on any failure
- [x] Script prints summary: `35/35 PASS` or `33/35 PASS, 2 FAIL`
- [x] Script works on both fresh and seeded databases (self-contained setup)
- [x] Script handles backend not running: prints clear error and exits 1 (not a crash)
- [x] Script handles port already in use or connection refused gracefully
- [x] Test roles/users use unique prefix (`rbac-test-*`) to avoid collisions with real data
- [x] Cleanup runs even if assertions fail (try/finally pattern)
- [x] Script completes in under 30 seconds

**Test Cases (R5):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T5.1 | Full script pass | `npx tsx backend/scripts/validate-rbac.ts` on properly configured system | 35/35 PASS, exit 0 |
| T5.2 | Script idempotency | Run script twice consecutively | Both runs pass, no leftover test data |
| T5.3 | Clean database | Run on fresh DB after `make db-seed` | All pass |
| T5.4 | Exit code on success | All scenarios pass | Exit code 0 |
| T5.5 | Exit code on failure | Artificially remove RBAC from one route | Exit code 1, failure details printed |
| T5.6 | Backend not running | Stop backend, run script | Clear error: "Cannot connect to backend at localhost:3000", exit 1 |
| T5.7 | Cleanup on failure | Script fails mid-run | Test users and roles still cleaned up |
| T5.8 | No data residue | Run script, then check DB | No `rbac-test-*` roles or `rbac-*@test.io` users remain |
| T5.9 | Parallel safety | Run script while another user is using the system | No interference — test data uses unique prefixes |
| T5.10 | Timing under limit | Time the script | Completes in < 30 seconds |

---

### Nice-to-Have (P1)

**R6: Permission Change Audit Trail**
- Log all role permission changes to `AuditLog` with before/after JSON diff
- Log all user role assignment changes
- Resource: `"role"`, Actions: `CREATE`, `UPDATE`, `DELETE`, `ASSIGN`

**R7: Bulk Role Assignment**
- `PUT /v1/settings/roles/:id/assign` with body `{ userIds: ["uuid1", "uuid2"] }`
- Reassign multiple users to a role in one operation
- Useful when migrating from one role structure to another

**R8: Permission Effective View**
- `GET /v1/settings/users/:id/effective-permissions`
- Returns the resolved permissions for a user (their role's permissions)
- Useful for debugging "why can't this user see X?"

### Future Considerations (P2)

**R9: Role Hierarchy / Inheritance**
- Allow roles to inherit permissions from a parent role
- e.g., "Senior Patch Manager" inherits from "Patch Manager" + adds delete permission
- Design the Role schema to support `parentRoleId` later without breaking changes

**R10: Temporary Permission Elevation**
- Time-boxed permission grants: "Give user X admin access for 2 hours"
- Useful for break-glass scenarios
- Would require a `PermissionOverride` table with `expiresAt`

**R11: API Key Permissions**
- Service accounts / API keys with their own permission scope
- Subset of user permissions (never more than the creating user's role)
- Required for Pipeline 3 (deployment automation)

---

## 6. Success Metrics

| Metric | Target | Measurement | When |
|--------|--------|-------------|------|
| **Route coverage** | 100% of authenticated routes have RBAC middleware | Route audit script counts routes with vs. without `checkPermission` | After R3 |
| **Validation pass rate** | 35/35 scenarios pass | `validate-rbac.ts` output | After R5 |
| **Zero permission bypass** | 0 routes accessible without proper permission | Route audit + manual spot-check | After R3 |
| **Schema integrity** | All users have valid `roleId` FK | `SELECT count(*) FROM users WHERE role_id IS NULL` = 0 | After R1 |
| **FK constraint working** | Cannot delete role with users | Attempt delete, verify 400 response | After R1 |
| **Permission latency** | < 5ms overhead per request (with cache) | Measure middleware execution time with `performance.now()` | After R2 |
| **Cache effectiveness** | < 1 DB query per 60 seconds per role under steady load | Log cache hit/miss ratio during validation script | After R2 |
| **Backward compatibility** | Login + register + refresh + profile flows work | All existing auth tests pass unchanged | After R1 |
| **Type safety** | Zero `as any` in RBAC middleware | Grep for `as any` in `middleware/rbac.ts` | After R2 |
| **System role protection** | 5/5 protection scenarios pass | Validation script | After R4 |
| **JSON validation strictness** | Invalid permissions rejected with descriptive Zod error | 12 validation test cases pass | After R4 |

---

## 7. Open Questions

| # | Question | Owner | Blocking? | Recommendation |
|---|----------|-------|-----------|----------------|
| Q1 | Should we normalize the `RolePermissions` key names to match route module names exactly (e.g., `patch-repository` vs `patchRepository`)? | Engineering | Yes — decide before R2 implementation | **Use kebab-case** matching route paths. Already used in shared types. |
| Q2 | Should the `admin` role bypass be based on `Role.isSystem && Role.name === 'admin'` or a separate `isAdmin` flag? | Engineering | No | `isSystem && name === 'admin'` is sufficient. Adding `isAdmin` adds schema complexity for no benefit in v1. |
| Q3 | Should permissions be resolved from DB on every request, or is 60-second cache acceptable? Risk: role change takes up to 60s to propagate. | Engineering | No | **60s cache is acceptable.** Role changes are infrequent. Document the propagation delay for admins. For cache invalidation on role update, clear immediately. |
| Q4 | Do we need a `super-admin` role that cannot have permissions modified even by other admins? | Product | No | Out of scope for v1. Current `isSystem` protection on `admin` role is sufficient. |
| Q5 | Should the `/v1/auth/me` (own profile) route require any specific permission, or just authentication? | Engineering | No | **Just authentication.** Every logged-in user should see their own profile. |
| Q6 | How should RBAC interact with the Agent API (`/api/agent/*`)? Agents use their own token system. | Engineering | No | **Excluded entirely.** Agent API uses agent tokens, not user JWTs. Document this exclusion. |
| Q7 | Should the old `requireRole()` and `requireAdmin` helpers in `auth.ts` be removed or kept? | Engineering | No | **Remove them.** They are unused and will be superseded by `checkPermission()`. Removing them prevents confusion. |
| Q8 | For the migration backfill, what happens to users with custom role strings (not ADMIN or USER)? | Engineering | Yes — decide before R1 | **Fallback to `user` system role.** Log a warning for any non-standard role strings found during backfill. |

---

## 8. Timeline Considerations

**Dependencies:**
- No external dependencies — all code changes are within the backend repo
- Pipeline 1 must be complete (it is: validated 2026-02-13)
- Database migration must run before any other code changes

**Suggested Implementation Order:**

```
R1 (Schema + Migration)          ← Must be first (everything depends on roleId FK)
    ↓
R2 (Middleware)                  ← Can start after R1 merges
    ↓
R4 (CRUD Hardening)             ← Can run in PARALLEL with R3
    ↓
R3 (Apply to All Routes)        ← Depends on R2, biggest task (~17 route files)
    ↓
R5 (Validation Script)          ← Must be last (validates everything)
```

**Parallelizable Work:**
- R1 (schema) can be done by one developer while another reviews the module → route mapping for R3
- R4 (validators + system role protection) can be done in parallel with R3 (applying middleware to routes)
- R2 unit tests can be written in parallel with R3 integration

**Estimated Scope for R3:**
- 17 route files to modify (one per module)
- ~80-100 individual route definitions to add `checkPermission` middleware to
- Each route file change is mechanical but must be reviewed for correct action mapping

**Risk Factors:**
- R1 migration on a database with existing data — must test on a copy of production-like data first
- R3 is the largest task (touching 17 route files) — highest risk of missing a route or wrong action mapping
- R5 validation script depends on the backend running — needs `make dev` or `make dev-backend` active
- Cache invalidation timing: if cache TTL is too long, permission changes feel "laggy" to admins

---

## Appendix A: Default System Role Permissions

### `admin` Role (Full Access)

```json
{
  "agents": { "view": true, "add": true, "edit": true, "delete": true },
  "assets": { "view": true, "add": true, "edit": true, "delete": true },
  "patches": { "view": true, "add": true, "edit": true, "delete": true },
  "vulnerabilities": { "view": true, "add": true, "edit": true, "delete": true },
  "jobs": { "view": true, "add": true, "edit": true, "delete": true },
  "deployments": { "view": true, "add": true, "edit": true, "delete": true },
  "discovery": { "view": true, "add": true, "edit": true, "delete": true },
  "reports": { "view": true, "add": true, "edit": true, "delete": true },
  "dashboard": { "view": true, "add": true, "edit": true, "delete": true },
  "settings": { "view": true, "add": true, "edit": true, "delete": true },
  "hub": { "view": true, "add": true, "edit": true, "delete": true },
  "patch-repository": { "view": true, "add": true, "edit": true, "delete": true },
  "patch-templates": { "view": true, "add": true, "edit": true, "delete": true },
  "ai": { "view": true, "add": true, "edit": true, "delete": true },
  "notifications": { "view": true, "add": true, "edit": true, "delete": true }
}
```

### `user` Role (Read-Only Core)

```json
{
  "agents": { "view": true, "add": false, "edit": false, "delete": false },
  "assets": { "view": true, "add": false, "edit": false, "delete": false },
  "patches": { "view": true, "add": false, "edit": false, "delete": false },
  "vulnerabilities": { "view": true, "add": false, "edit": false, "delete": false },
  "jobs": { "view": true, "add": false, "edit": false, "delete": false },
  "deployments": { "view": true, "add": false, "edit": false, "delete": false },
  "discovery": { "view": true, "add": false, "edit": false, "delete": false },
  "reports": { "view": true, "add": false, "edit": false, "delete": false },
  "dashboard": { "view": true, "add": false, "edit": false, "delete": false },
  "hub": { "view": true, "add": false, "edit": false, "delete": false },
  "patch-repository": { "view": true, "add": false, "edit": false, "delete": false },
  "patch-templates": { "view": true, "add": false, "edit": false, "delete": false },
  "ai": { "view": true, "add": false, "edit": false, "delete": false },
  "notifications": { "view": true, "add": true, "edit": true, "delete": true }
}
```

> **Note**: `user` role has full `notifications` access (users manage their own notification preferences). No `settings` key means settings access is **denied** by default.

---

## Appendix B: Permission Resolution Flowchart

```
Request: PUT /v1/patches/abc-123
         ↓
    ┌─────────────┐
    │ authenticate │ → Extracts JWT, sets req.user = { id, email, roleId, roleName }
    └──────┬──────┘
           ↓
    ┌──────────────────────────────┐
    │ checkPermission('patches',   │
    │                 'edit')       │
    └──────┬───────────────────────┘
           ↓
    ┌─────────────────────┐
    │ Fetch Role by roleId │ → Cache hit? Use cached. Miss? Query DB + cache.
    └──────┬──────────────┘
           ↓
    ┌──────────────────────────────────────────────┐
    │ Is role.name === 'admin' && role.isSystem?    │
    │   YES → next() (admin bypass)                 │
    │   NO  → continue checking                     │
    └──────┬───────────────────────────────────────┘
           ↓
    ┌──────────────────────────────────────────────┐
    │ role.permissions['patches']?.edit === true?    │
    │   YES → next() (access granted)               │
    │   NO  → 403 ForbiddenError                    │
    │         "You do not have permission            │
    │          to edit patches"                      │
    └──────────────────────────────────────────────┘
```

---

## Appendix C: Files to Modify

| File | Changes | Risk |
|------|---------|------|
| `backend/src/db/prisma/schema.prisma` | Add `roleId` FK to User, add `users` relation to Role, remove `role` string | High — schema change |
| `backend/src/db/prisma/migrations/XXXX_add_role_fk/` | New migration with backfill SQL | High — data migration |
| `backend/src/db/prisma/seed.ts` | Update role + user seeding to use FK | Medium |
| `backend/src/middleware/auth.ts` | Update `req.user` to include `roleId`, remove `requireRole`/`requireAdmin` | Medium |
| `backend/src/middleware/rbac.ts` | **NEW FILE**: `checkPermission()` middleware + cache | High — core security |
| `backend/src/modules/settings/users.service.ts` | Role CRUD hardening, system role protection, user count check | Medium |
| `backend/src/modules/settings/settings.validators.ts` | Strict permissions Zod schema, role name validation | Medium |
| `backend/src/modules/auth/auth.service.ts` | Include `roleId` + `roleName` in JWT, return permissions on login | Medium |
| `backend/src/modules/auth/auth.controller.ts` | Update login/me responses to include role object | Low |
| `shared/types/api.ts` | Update `RolePermissions` with all 15 module keys | Low |
| `backend/src/shared/types/api.types.ts` | Mirror shared types update | Low |
| `backend/src/modules/agents/agents.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/assets/assets.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/patches/patches.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/vulnerabilities/vulnerabilities.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/jobs/jobs.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/deployments/deployments.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/discovery/discovery.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/reports/reports.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/dashboard/dashboard.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/settings/settings.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/hub/hub.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/patch-repository/patch-repository.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/patch-templates/patch-templates.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/notifications/notifications.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/src/modules/ai/ai.routes.ts` | Add `checkPermission` to all routes | Low (mechanical) |
| `backend/scripts/validate-rbac.ts` | **NEW FILE**: Validation script (35 scenarios) | Medium |

**Total files modified**: ~27 (2 new, 25 modified)

---

## Appendix D: Complete Test Case Summary

| Requirement | Test Cases | Categories |
|-------------|-----------|------------|
| R1: Schema & Migration | T1.1–T1.20 (20 tests) | Backfill, FK constraints, JWT, seed, relations, edge cases |
| R2: Permission Middleware | T2.1–T2.26 (26 tests) | Grants, denials, caching, error formats, edge cases, concurrency |
| R3: Route Coverage | T3.1–T3.50 (50 tests) | Per-module RBAC, excluded routes, cross-cutting, audit |
| R4: CRUD Hardening | T4.1–T4.43 (43 tests) | JSON validation, system protection, orphan prevention, names, login response |
| R5: Validation Script | T5.1–T5.10 (10 tests) | Script execution, idempotency, error handling, cleanup |
| **TOTAL** | **149 test cases** | |

| Validation Script | V1–V35 (35 scenarios) | Admin, user, custom roles, empty, dynamic, auth exclusions |
