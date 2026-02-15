# PRD: Organization & User Management (Pipeline 2C)

**Status**: NOT STARTED
**Author**: Claude Code
**Created**: 2026-02-14
**Priority**: P0 (Critical — Org hierarchy is foundational for multi-tenant asset management)
**Depends on**: Pipeline 2A (RBAC & Permissions Engine) — COMPLETED, Pipeline 2B (LDAP & Directory Services) — COMPLETED
**Blocks**: Pipeline 3 (Deployment Execution — needs org-scoped agent targeting)
**Resolves**: Sprint 1 Deferred Item A.15 (Branch asset count hardcoded to 0)

---

## 1. Problem Statement

PatchIQ has an Organization → Branch → Department hierarchy and User/Location models, but the implementation has critical gaps that make it unusable for real enterprise deployments. The current state:

- **Branch asset count is hardcoded to 0**: The `transformBranch()` method in `organizations.service.ts:422` returns `assets: 0` with a `// TODO: Compute from assets` comment. Branches never show how many endpoints they manage, rendering the branch overview useless for capacity planning and compliance reporting.
- **No cascading delete safety**: Deleting an organization with branches fails with a generic "Cannot delete organization with branches" error, but there is no option to cascade (reassign children) or see what would be affected. Similarly, deleting a branch with departments, or a department with users, produces unhelpful errors with no remediation guidance. There is no "impact preview" before deletion.
- **No user lifecycle management**: Users have `isActive` and `isOnboarded` flags but no formal state machine. There is no suspend → reactivate audit trail beyond manual audit log entries. There is no bulk status change. The `suspendUser` and `activateUser` methods exist in `users.service.ts` but have **no routes** — they are dead code.
- **No bulk user import**: CSV import for user onboarding doesn't exist. Every user must be created one-by-one through the API or invited via email. For enterprises onboarding 50+ users during initial deployment, this is unacceptable.
- **User invite flow has no onboarding endpoint**: The `inviteUser` method generates an invite token and sends an email with an onboarding link (`/onboarding?token=...`), but there is no `POST /v1/auth/onboard` endpoint to complete the onboarding flow (set password, accept terms). The invite email points to a dead end.
- **No org hierarchy summary endpoint**: The frontend must make 4 separate API calls (orgs, branches, departments, locations) to render an org tree. There is no single endpoint that returns the full hierarchy for dashboard or tree views.
- **Location is disconnected from the hierarchy**: Locations have no relationship to branches or organizations — they are global. A location "New York Office" can be assigned to users in any org, which makes no sense in a multi-org deployment.
- **Department lacks user/asset counts**: Unlike branches (which at least have a user count), departments return no aggregate data — no user count, no asset count. The department list is just names.
- **No org-scoped filtering across modules**: Users can see all assets, patches, and vulnerabilities regardless of their organization. There is no org-based data scoping.
- **LDAP-synced users have no org assignment**: Pipeline 2B creates LDAP users with `organizationId: null`. There is no mechanism to auto-assign LDAP users to an organization based on their LDAP OU or group.

Without proper org/user management, PatchIQ cannot support multi-branch enterprises where different branches manage different sets of endpoints and have different patch policies. This pipeline is the structural foundation for org-scoped deployment targeting in Pipeline 3.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Branch asset count reflects real data | `GET /v1/settings/branches` returns accurate `assets` count from real `Asset.organizationId` joins — verified against seeded data |
| G2 | Org hierarchy operations are safe and predictable | Delete operations show impact preview, cascade or block with clear remediation — 15+ cascade/block scenarios pass |
| G3 | User lifecycle is a proper state machine with audit trail | Every state transition (invite → onboard → active → suspend → reactivate → delete) is logged and enforced — 20+ lifecycle scenarios pass |
| G4 | Bulk user import works via CSV | CSV upload with 50+ users completes in under 10s, validates all rows, reports errors per-row, skips duplicates — 10+ import scenarios pass |
| G5 | User onboarding flow completes end-to-end | Invited user can set password and complete onboarding via `POST /v1/auth/onboard` — token validated, password policy enforced |
| G6 | Org hierarchy tree endpoint exists | `GET /v1/settings/org-tree` returns full hierarchy (orgs → branches → departments) with counts in a single call — verified against seeded data |
| G7 | Validation script proves everything works end-to-end | Automated script with 75+ scenarios passes against real database with real HTTP requests, covering all R1-R7 features |

---

## 3. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| N1 | Frontend org management UI | Backend-only scope; Dev 2 handles frontend. Backend provides complete API |
| N2 | Row-level security (user can only see their org's assets) | Important but separate concern — requires pervasive query filtering across every module. Tracked as future cross-cutting work |
| N3 | Org-scoped RBAC (different permissions per org) | Over-engineering for v1; flat RBAC from Pipeline 2A is sufficient. Per-org permissions would require a major RBAC overhaul |
| N4 | Location → Branch FK relationship | Would be a schema change affecting existing data. Keep locations global for v1; org scoping can come later |
| N5 | User self-service profile editing | Separate concern — users editing their own name/contact/timezone. Pipeline 2C focuses on admin-managed operations |
| N6 | LDAP OU → Org auto-mapping | Nice-to-have but complex — LDAP OU structure rarely maps 1:1 to business org structure. Manual assignment is sufficient for v1 |
| N7 | Multi-tenant data isolation | Full tenant isolation (separate schemas/databases per org) is enterprise-grade work beyond Sprint 2 scope |
| N8 | Org transfer (move user/asset between orgs) | Edge case for v1; admin can update user's orgId directly. Formal transfer workflow is future work |

---

## 4. User Stories

### US-1: Branch Asset Visibility
> As a **PatchIQ admin**, I want to see how many endpoints (assets) each branch manages so that I can understand our deployment footprint and plan patch rollouts by branch.

### US-2: Safe Org Deletion with Impact Preview
> As a **PatchIQ admin**, I want to see what would be affected before deleting an organization (branches, departments, users, assets) so that I can make an informed decision and avoid accidental data loss.

### US-3: User Lifecycle State Machine
> As a **PatchIQ admin**, I want to invite users, have them complete onboarding, suspend them when they leave, reactivate them when they return, and see a full audit trail of every state change so that I can manage access with confidence.

### US-4: Bulk User Import
> As a **PatchIQ admin onboarding a new branch**, I want to upload a CSV file with 50 employees and have them automatically created with the correct roles, departments, and locations so that I don't have to create each user manually.

### US-5: User Onboarding Completion
> As a **newly invited user**, I want to click the invitation link, set my password, and start using PatchIQ immediately so that I don't need to contact an admin to complete my setup.

### US-6: Org Hierarchy Overview
> As a **PatchIQ admin**, I want to see the full org hierarchy (orgs → branches → departments) with user and asset counts in a single view so that I can quickly understand the organizational structure.

### US-7: Suspend/Reactivate User
> As a **PatchIQ admin**, I want to suspend a user's access immediately (revoking all active sessions) and reactivate them later, with both actions logged in the audit trail, so that I can manage temporary access changes.

### US-8: Department User Count
> As a **PatchIQ admin**, I want to see how many users belong to each department so that I can identify understaffed or overstaffed teams.

### US-9: Bulk User Status Change
> As a **PatchIQ admin managing a branch closure**, I want to suspend all users in a specific department or branch in one operation so that I don't have to suspend them individually.

### US-10: LDAP User Org Assignment
> As a **PatchIQ admin**, I want to assign LDAP-synced users to an organization after they are imported so that they appear in the correct branch hierarchy.

---

## 5. Requirements

### R1: Fix Branch Asset Count & Add Aggregate Counts (P0 — Must Have)

Replace the hardcoded `assets: 0` in branch responses with real computed counts. Add user and asset counts to departments.

**Current Problem (line 422 of `organizations.service.ts`):**

```typescript
// CURRENT — hardcoded
assets: 0, // TODO: Compute from assets
```

**Fix Strategy:**

Assets are linked to organizations via `Asset.organizationId`. To compute branch-level asset count, count assets belonging to the branch's parent organization. For branch-specific granularity when multiple branches share an org, count via department membership.

#### 1A: Branch Asset Count

```typescript
// Replace hardcoded 0 with real count
const assetCount = await prisma.asset.count({
  where: { organizationId: branch.organizationId },
});
```

For branch-specific counts in a multi-branch org, count via department user ownership:

```typescript
const departmentIds = branch.departments.map(d => d.id);
const usersInBranch = await prisma.user.findMany({
  where: { departmentId: { in: departmentIds }, deletedAt: null },
  select: { id: true },
});
// Then count assets owned by these users, or use org-level as approximation
```

#### 1B: Department User & Asset Counts

Add `userCount` to department responses.

#### 1C: Organization Summary Counts

Add `branchCount`, `userCount`, and `assetCount` to organization responses.

**API Changes:**

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/v1/settings/organizations` | Add `branchCount`, `userCount`, `assetCount` to each org |
| `GET` | `/v1/settings/organizations/:id` | Same |
| `GET` | `/v1/settings/branches` | Replace `assets: 0` with real count |
| `GET` | `/v1/settings/branches/:id` | Same |
| `GET` | `/v1/settings/departments` | Add `userCount` |
| `GET` | `/v1/settings/departments/:id` | Same |

**Acceptance Criteria:**

- [ ] `GET /v1/settings/branches` returns `assets` field with real count (not hardcoded 0)
- [ ] Branch asset count matches `SELECT count(*) FROM assets WHERE organization_id = branch.organization_id`
- [ ] `GET /v1/settings/organizations` returns `branchCount`, `userCount`, `assetCount` fields
- [ ] `GET /v1/settings/departments` returns `userCount` field
- [ ] Org with 0 branches/users/assets returns 0 (not null or undefined)
- [ ] Counts are performant — no N+1 queries (use `groupBy` or `_count`)
- [ ] Soft-deleted users (`deletedAt IS NOT NULL`) are excluded from user counts

**Test Cases (R1):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| **Branch Asset Count** | | | |
| T1.1 | Branch with org assets | Branch in org with 5 assets | `assets: 5` |
| T1.2 | Branch with zero assets | Branch in org with 0 assets | `assets: 0` |
| T1.3 | Multiple branches same org | 2 branches, org has 10 assets | Both show `assets: 10` (org-level count) |
| T1.4 | List branches performance | 50 branches | No N+1 queries, completes in <500ms |
| **Organization Summary** | | | |
| T1.5 | Org with full hierarchy | Org with 3 branches, 5 depts, 20 users, 50 assets | All counts accurate |
| T1.6 | Empty org | Newly created org | `branchCount: 0, userCount: 0, assetCount: 0` |
| T1.7 | Org excludes soft-deleted users | Org with 10 users, 2 soft-deleted | `userCount: 8` |
| **Department User Count** | | | |
| T1.8 | Department with users | Department with 5 active users | `userCount: 5` |
| T1.9 | Department with no users | Empty department | `userCount: 0` |
| T1.10 | Department excludes deleted users | 3 users, 1 soft-deleted | `userCount: 2` |

---

### R2: Org Hierarchy Tree Endpoint (P0 — Must Have)

Add a single endpoint that returns the full organizational hierarchy with nested children and aggregate counts.

**New Endpoint:**

| Method | Path | Description | RBAC |
|--------|------|-------------|------|
| `GET` | `/v1/settings/org-tree` | Full hierarchy tree | `settings:view` |

**Response Shape:**

```typescript
interface OrgTreeResponse {
  organizations: Array<{
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    branchCount: number;
    userCount: number;
    assetCount: number;
    branches: Array<{
      id: string;
      name: string;
      description: string | null;
      isDefault: boolean;
      userCount: number;
      assetCount: number;
      departments: Array<{
        id: string;
        name: string;
        description: string | null;
        userCount: number;
      }>;
    }>;
  }>;
  locations: Array<{
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    userCount: number;
    assetCount: number;
  }>;
  summary: {
    totalOrganizations: number;
    totalBranches: number;
    totalDepartments: number;
    totalLocations: number;
    totalUsers: number;
    totalAssets: number;
  };
}
```

**Implementation:**

```typescript
async getOrgTree(): Promise<OrgTreeResponse> {
  const orgs = await prisma.organization.findMany({
    include: {
      branches: {
        include: {
          departments: {
            include: {
              _count: { select: { users: { where: { deletedAt: null } } } },
            },
          },
        },
      },
      _count: {
        select: {
          users: { where: { deletedAt: null } },
          assets: true,
        },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  // ... transform with counts
}
```

**Acceptance Criteria:**

- [ ] `GET /v1/settings/org-tree` returns complete hierarchy in a single response
- [ ] Each org includes nested branches, each branch includes nested departments
- [ ] All levels include user and asset counts
- [ ] Locations are returned as a separate flat array with counts
- [ ] Summary object has correct totals
- [ ] Response is consistent with individual CRUD endpoints (same counts)
- [ ] RBAC-protected: requires `settings:view` permission
- [ ] Performance: completes in <1s for 10 orgs, 50 branches, 200 departments

**Test Cases (R2):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T2.1 | Empty system | No orgs | `{ organizations: [], locations: [], summary: { ... all 0 } }` |
| T2.2 | Single org with hierarchy | 1 org, 2 branches, 3 depts, 5 users | Correct nested structure with counts |
| T2.3 | Multiple orgs | 3 orgs, varying branches/depts | All orgs with correct children |
| T2.4 | Summary totals | Known data set | `summary.totalUsers` matches `SELECT count(*) FROM users WHERE deleted_at IS NULL` |
| T2.5 | Locations with counts | 3 locations, 10 users, 20 assets | Each location shows correct user/asset count |
| T2.6 | RBAC enforcement | User role (no settings:view) | 403 |
| T2.7 | Admin access | Admin role | 200, full tree |
| T2.8 | Performance | 10 orgs, 50 branches, 200 depts | < 1 second response time |

---

### R3: Safe Deletion with Impact Preview (P0 — Must Have)

Add "impact preview" endpoints that show what would be affected by a delete operation. Enhance delete operations with optional cascade mode.

#### 3A: Delete Impact Preview Endpoints

| Method | Path | Description | RBAC |
|--------|------|-------------|------|
| `GET` | `/v1/settings/organizations/:id/delete-impact` | Preview what deleting this org would affect | `settings:view` |
| `GET` | `/v1/settings/branches/:id/delete-impact` | Preview what deleting this branch would affect | `settings:view` |
| `GET` | `/v1/settings/departments/:id/delete-impact` | Preview what deleting this dept would affect | `settings:view` |
| `GET` | `/v1/settings/locations/:id/delete-impact` | Preview what deleting this location would affect | `settings:view` |

**Response Shape:**

```typescript
interface DeleteImpactResponse {
  canDelete: boolean;
  blockedReason?: string; // e.g., "Cannot delete default organization"
  impact: {
    branches: number;       // Only for org delete
    departments: number;    // For org and branch delete
    users: number;          // Users that would be affected
    assets: number;         // Assets that would be affected
    enrollSecrets: number;  // EnrollSecrets tied to org/dept
  };
  affectedItems: {
    branches?: Array<{ id: string; name: string }>;
    departments?: Array<{ id: string; name: string }>;
    users?: Array<{ id: string; email: string; name: string | null }>;
  };
}
```

#### 3B: Enhanced Delete with Cascade/Reassign Options

Update delete endpoints to accept optional `cascade` and `reassignTo` parameters:

```typescript
// DELETE /v1/settings/organizations/:id?cascade=true
// DELETE /v1/settings/organizations/:id?reassignTo=<other-org-id>
```

- **No params (default)**: Block if children exist (current behavior, but with better error messages including counts)
- **`cascade=true`**: Delete all children (branches → departments). Reassign affected users to default org/dept. Soft-delete only.
- **`reassignTo=<id>`**: Move all children to the specified target before deleting

**Acceptance Criteria:**

- [ ] `GET /v1/settings/organizations/:id/delete-impact` returns accurate impact counts
- [ ] `GET /v1/settings/branches/:id/delete-impact` returns accurate impact counts
- [ ] `GET /v1/settings/departments/:id/delete-impact` returns accurate impact counts
- [ ] `GET /v1/settings/locations/:id/delete-impact` returns accurate impact counts
- [ ] Impact preview for default org returns `canDelete: false` with reason
- [ ] Delete with `cascade=true` removes all children and reassigns users to default org
- [ ] Delete with `reassignTo` moves children before deleting
- [ ] Cascaded delete creates audit log entries for every affected entity
- [ ] Cannot cascade-delete the default organization (even with `cascade=true`)
- [ ] Error messages include counts: "Cannot delete branch with 3 departments and 15 users"

**Test Cases (R3):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| **Impact Preview** | | | |
| T3.1 | Empty org impact | Org with 0 branches | `canDelete: true, impact: { branches: 0, ... }` |
| T3.2 | Org with children impact | Org with 2 branches, 4 depts, 10 users | Accurate counts for all |
| T3.3 | Default org impact | Default org | `canDelete: false, blockedReason: "Cannot delete default organization"` |
| T3.4 | Branch with departments | Branch with 3 departments, 8 users | Accurate counts |
| T3.5 | Empty branch impact | Branch with 0 departments | `canDelete: true` |
| T3.6 | Default branch impact | Default branch | `canDelete: false` |
| T3.7 | Department with users | Dept with 5 users | `impact: { users: 5 }` |
| T3.8 | Empty department impact | Dept with 0 users | `canDelete: true` |
| T3.9 | Location with users/assets | Location with 3 users, 10 assets | Accurate counts |
| T3.10 | Non-existent org | Invalid UUID | 404 |
| **Cascade Delete** | | | |
| T3.11 | Org cascade delete | Org with 2 branches, 4 depts, 10 users, `cascade=true` | All deleted, users reassigned to default org |
| T3.12 | Branch cascade delete | Branch with 3 depts, 8 users, `cascade=true` | Depts deleted, users dept set to null |
| T3.13 | Default org cascade blocked | Default org, `cascade=true` | 400: "Cannot delete default organization" |
| T3.14 | Cascade audit trail | Org cascade affecting 10 users | 10+ audit log entries created (one per affected entity) |
| **Reassign Delete** | | | |
| T3.15 | Org reassign delete | Org A with 2 branches, `reassignTo=OrgB` | Branches moved to Org B, Org A deleted |
| T3.16 | Reassign to non-existent | `reassignTo=invalid-uuid` | 400: "Target organization not found" |
| T3.17 | Reassign to self | `reassignTo=same-org-id` | 400: "Cannot reassign to self" |
| T3.18 | Better error messages | Delete org with children (no cascade) | "Cannot delete organization with 2 branches, 4 departments, and 10 users. Use cascade=true or reassign first." |

---

### R4: User Lifecycle State Machine (P0 — Must Have)

Formalize the user lifecycle as a state machine with proper routes for every transition, enforced constraints, and full audit trail.

#### State Machine

```
                    ┌─────────────────────────────────────┐
                    │                                     │
  CREATE ──→ INVITED ──→ ONBOARDED ──→ ACTIVE ──→ SUSPENDED ──→ DELETED
                │              │           │          │
                │              │           │          ▼
                │              │           │      REACTIVATED → ACTIVE
                │              │           │
                │              └───────────┘
                │         (skip if password provided at creation)
                └──────── EXPIRED (invite token expired, can re-invite)
```

**States** (derived from existing fields):

| State | `isActive` | `isOnboarded` | `deletedAt` | Description |
|-------|-----------|--------------|-------------|-------------|
| Invited | `true` | `false` | `null` | User created, invitation sent, awaiting onboarding |
| Active | `true` | `true` | `null` | Fully onboarded, can log in |
| Suspended | `false` | `true` | `null` | Temporarily blocked, cannot log in |
| Deleted | `false` | `*` | `<timestamp>` | Soft-deleted, cannot log in, excluded from lists |

#### 4A: Expose Suspend/Activate Routes

The `suspendUser` and `activateUser` methods exist in `users.service.ts` but are not wired to routes. Wire them up:

| Method | Path | Description | RBAC |
|--------|------|-------------|------|
| `POST` | `/v1/settings/users/:id/suspend` | Suspend a user | `settings:edit` |
| `POST` | `/v1/settings/users/:id/activate` | Reactivate a suspended user | `settings:edit` |
| `POST` | `/v1/settings/users/:id/reset-password` | Admin-initiated password reset | `settings:edit` |
| `GET` | `/v1/settings/users/:id/audit-log` | User's audit trail | `settings:view` |

#### 4B: Onboarding Endpoint

Add `POST /v1/auth/onboard` to complete user onboarding:

```typescript
// POST /v1/auth/onboard
const onboardSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});
```

**Flow:**
1. Validate invite token (from `PasswordResetToken` table)
2. Check token not expired
3. Validate password against password policy
4. Hash password, update user record
5. Set `isOnboarded = true`
6. Delete used token
7. Return JWT (user is logged in after onboarding)

#### 4C: User Status Filter Enhancement

Enhance `GET /v1/settings/users` to support additional status filters:

```typescript
export const userListQuerySchema = paginationSchema.extend({
  status: z.enum(['Active', 'Suspended', 'Invite Sent', 'Deleted']).optional(),
  role: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  authSource: z.enum(['LOCAL', 'LDAP']).optional(),
  sortBy: z.enum(['name', 'email', 'role', 'status', 'lastLoginAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
```

**Acceptance Criteria:**

- [ ] `POST /v1/settings/users/:id/suspend` suspends user and revokes all refresh tokens
- [ ] `POST /v1/settings/users/:id/activate` reactivates suspended user
- [ ] Suspending an already-suspended user returns 400 "User is already suspended"
- [ ] Activating an already-active user returns 400 "User is already active"
- [ ] Cannot suspend yourself (400 "Cannot suspend your own account")
- [ ] Cannot delete yourself (400 "Cannot delete your own account")
- [ ] `POST /v1/auth/onboard` sets password and marks user as onboarded
- [ ] Onboarding with expired token returns 400 "Invite token expired"
- [ ] Onboarding with already-used token returns 400 "Token already used"
- [ ] Onboarding enforces password policy
- [ ] Onboarding returns JWT (user is logged in)
- [ ] `GET /v1/settings/users/:id/audit-log` returns paginated audit history
- [ ] User list supports filter by `departmentId`, `locationId`, `authSource`
- [ ] User list supports sorting by `name`, `email`, `role`, `status`, `lastLoginAt`, `createdAt`
- [ ] Every lifecycle transition creates an audit log entry
- [ ] Suspended user cannot log in (login returns 403 "Account suspended")
- [ ] LDAP users cannot be password-reset (400 "Contact your directory administrator")

**Test Cases (R4):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| **Suspend/Activate** | | | |
| T4.1 | Suspend active user | `POST /v1/settings/users/:id/suspend` | 200, user.isActive = false, tokens revoked |
| T4.2 | Suspend already suspended | Same user again | 400 "User is already suspended" |
| T4.3 | Activate suspended user | `POST /v1/settings/users/:id/activate` | 200, user.isActive = true |
| T4.4 | Activate already active | Same user again | 400 "User is already active" |
| T4.5 | Suspend self | Admin suspends themselves | 400 "Cannot suspend your own account" |
| T4.6 | Delete self | Admin deletes themselves | 400 "Cannot delete your own account" |
| T4.7 | Suspended user login | Login with suspended user creds | 403 "Account suspended" |
| T4.8 | Suspend audit trail | Suspend user, check audit | Audit entry: `{ action: "SUSPEND", resource: "user", ... }` |
| T4.9 | Activate audit trail | Activate user, check audit | Audit entry: `{ action: "ACTIVATE", resource: "user", ... }` |
| **Onboarding** | | | |
| T4.10 | Complete onboarding | Valid token + valid password | 200, JWT returned, `isOnboarded: true` |
| T4.11 | Onboard with expired token | Token expired 2 hours ago | 400 "Invite token expired" |
| T4.12 | Onboard with used token | Token already consumed | 400 "Token already used" |
| T4.13 | Onboard with weak password | Token valid, password "123" | 400 "Password does not meet security requirements" |
| T4.14 | Onboard sets name | `{ firstName: "John", lastName: "Doe" }` | User name updated |
| T4.15 | Onboard already onboarded | User already isOnboarded=true | 400 "User already onboarded" |
| **User List Filters** | | | |
| T4.16 | Filter by departmentId | `?departmentId=<uuid>` | Only users in that department |
| T4.17 | Filter by locationId | `?locationId=<uuid>` | Only users at that location |
| T4.18 | Filter by authSource | `?authSource=LDAP` | Only LDAP users |
| T4.19 | Sort by lastLoginAt | `?sortBy=lastLoginAt&sortOrder=desc` | Most recent login first |
| T4.20 | Combined filters | `?status=Active&role=admin&organizationId=<uuid>` | Intersection of all filters |
| **Audit Log** | | | |
| T4.21 | User audit log | Create user, update, suspend, activate | 4 audit entries in chronological order |
| T4.22 | Audit log pagination | User with 50+ audit entries | Paginated response with correct total |

---

### R5: Bulk User Import via CSV (P1 — Should Have)

Add a CSV upload endpoint for bulk user creation.

**New Endpoints:**

| Method | Path | Description | RBAC |
|--------|------|-------------|------|
| `POST` | `/v1/settings/users/import` | Upload CSV for bulk user import | `settings:add` |
| `GET` | `/v1/settings/users/import/template` | Download CSV template | `settings:view` |

**CSV Format:**

```csv
email,name,role,organizationId,departmentId,locationId,contactNumber,sendInvite
john@example.com,John Doe,user,<org-uuid>,<dept-uuid>,<loc-uuid>,+1234567890,true
jane@example.com,Jane Smith,admin,,,,+0987654321,false
```

**Import Logic:**

1. Parse CSV (max 500 rows per import)
2. Validate each row:
   - Email format valid and unique (not already in system)
   - Role exists
   - OrgId/DeptId/LocationId exist (if provided)
   - No duplicate emails within the CSV
3. Create all valid users in a single transaction
4. Return per-row results (success/failure with reason)
5. Optionally send invite emails for rows with `sendInvite=true`

**Response Shape:**

```typescript
interface BulkImportResponse {
  totalRows: number;
  successful: number;
  failed: number;
  results: Array<{
    row: number;
    email: string;
    status: 'created' | 'invited' | 'failed';
    error?: string;  // e.g., "Email already exists", "Role 'manager' not found"
    userId?: string;
  }>;
}
```

**Validation Schema:**

```typescript
export const bulkImportSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    role: z.string().default('user'),
    organizationId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    locationId: z.string().uuid().optional(),
    contactNumber: z.string().max(50).optional(),
    sendInvite: z.boolean().default(false),
  })).min(1).max(500),
});
```

**Acceptance Criteria:**

- [ ] `POST /v1/settings/users/import` accepts JSON array (parsed client-side from CSV)
- [ ] Max 500 users per import request
- [ ] Each row validated independently — valid rows succeed, invalid rows fail
- [ ] Duplicate emails within the CSV are rejected (second occurrence fails)
- [ ] Duplicate emails with existing users are rejected
- [ ] Invalid roleId, orgId, deptId, locationId are rejected with clear error per row
- [ ] Successful rows create users in a single transaction
- [ ] Response includes per-row status with error details
- [ ] Rows with `sendInvite=true` send invitation emails
- [ ] Audit log entries created for each successfully imported user
- [ ] `GET /v1/settings/users/import/template` returns CSV template content
- [ ] Import with 100 users completes in under 10s
- [ ] RBAC: requires `settings:add` permission

**Test Cases (R5):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T5.1 | Import 5 valid users | 5 rows, all valid | 5 created, 0 failed |
| T5.2 | Import with 1 invalid email | 5 rows, row 3 has "not-an-email" | 4 created, 1 failed, error on row 3 |
| T5.3 | Import with duplicate email | 5 rows, rows 2 and 4 share same email | 4 created, 1 failed (row 4) |
| T5.4 | Import with existing email | 5 rows, row 1 has admin@patchiq.io | 4 created, 1 failed |
| T5.5 | Import with invalid role | Row has `role: "nonexistent"` | That row fails, others succeed |
| T5.6 | Import with invalid orgId | Row has `organizationId: "bad-uuid"` | That row fails |
| T5.7 | Import 0 users | Empty array | 400 "At least 1 user required" |
| T5.8 | Import 501 users | 501 rows | 400 "Maximum 500 users per import" |
| T5.9 | Import with sendInvite | 3 rows with `sendInvite: true` | Users created + invite emails sent |
| T5.10 | Import audit trail | 5 users imported | 5 audit entries |
| T5.11 | CSV template download | `GET /v1/settings/users/import/template` | CSV with header row |
| T5.12 | RBAC enforcement | User role (no settings:add) | 403 |
| T5.13 | Performance | 100 users | Completes in <10s |

---

### R6: Bulk User Status Change (P1 — Should Have)

Add endpoints for bulk suspend/activate/delete operations on users.

**New Endpoints:**

| Method | Path | Description | RBAC |
|--------|------|-------------|------|
| `POST` | `/v1/settings/users/bulk-suspend` | Suspend multiple users | `settings:edit` |
| `POST` | `/v1/settings/users/bulk-activate` | Activate multiple users | `settings:edit` |
| `POST` | `/v1/settings/users/bulk-delete` | Soft-delete multiple users | `settings:delete` |

**Request Body:**

```typescript
const bulkUserActionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
});
```

**Response:**

```typescript
interface BulkActionResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: Array<{
    userId: string;
    email: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
}
```

**Acceptance Criteria:**

- [ ] `POST /v1/settings/users/bulk-suspend` suspends up to 100 users
- [ ] `POST /v1/settings/users/bulk-activate` activates up to 100 users
- [ ] `POST /v1/settings/users/bulk-delete` soft-deletes up to 100 users
- [ ] Cannot bulk-suspend yourself (self is skipped with `status: "skipped"`)
- [ ] Already-suspended users are skipped (not error)
- [ ] Already-active users are skipped for activate
- [ ] Each action creates per-user audit log entries
- [ ] Response includes per-user status
- [ ] All operations use a single transaction (all-or-nothing)
- [ ] Max 100 users per request

**Test Cases (R6):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T6.1 | Bulk suspend 5 users | 5 active user IDs | 5 suspended |
| T6.2 | Bulk suspend includes self | 5 IDs, one is caller | 4 suspended, 1 skipped |
| T6.3 | Bulk suspend with already-suspended | 5 IDs, 2 already suspended | 3 suspended, 2 skipped |
| T6.4 | Bulk activate | 5 suspended user IDs | 5 activated |
| T6.5 | Bulk delete | 5 user IDs | 5 soft-deleted, tokens revoked |
| T6.6 | Bulk suspend empty | `userIds: []` | 400 validation error |
| T6.7 | Bulk suspend 101 users | 101 IDs | 400 "Maximum 100 users per request" |
| T6.8 | Bulk suspend non-existent | Mix of valid and invalid IDs | Valid ones processed, invalid skipped |
| T6.9 | Bulk audit trail | Bulk suspend 10 users | 10 audit entries |
| T6.10 | RBAC enforcement | User role calls bulk-suspend | 403 |

---

### R7: End-to-End Validation Script (P0 — Must Have)

Create `backend/scripts/validate-pipeline-2c.ts` — an automated validation script that proves every feature works via real HTTP requests against a real database.

**Script Location:** `backend/scripts/validate-pipeline-2c.ts`
**Run Command:** `npx tsx backend/scripts/validate-pipeline-2c.ts`

**Execution Flow:**

```
1. Setup
   - Log in as admin (admin@patchiq.io / admin123)
   - Store JWT for all subsequent requests

2. Phase 1: Org Hierarchy CRUD (V1–V15)
   - Create test org "P2C-Test-Org"
   - Create branch under test org
   - Create department under test branch
   - Create location
   - Verify list endpoints return created items
   - Verify counts (branchCount, userCount, assetCount)
   - Test duplicate name rejection
   - Test org tree endpoint

3. Phase 2: Aggregate Counts (V16–V22)
   - Create users in test department
   - Verify branch shows correct user count
   - Verify department shows correct user count
   - Verify org shows correct user/branch counts
   - Verify org tree counts match individual endpoints
   - Verify soft-deleted users excluded from counts

4. Phase 3: Delete Impact & Cascade (V23–V35)
   - Get delete impact for org with children
   - Verify impact counts match reality
   - Attempt delete without cascade (blocked)
   - Delete with cascade=true
   - Verify children deleted/reassigned
   - Verify audit trail for cascade
   - Test reassignTo flow

5. Phase 4: User Lifecycle (V36–V52)
   - Create user via API
   - Invite user
   - Complete onboarding
   - Suspend user
   - Verify suspended user cannot log in
   - Activate user
   - Verify user can log in again
   - Admin password reset
   - Verify audit log for each transition
   - Test self-suspend blocked
   - Test self-delete blocked
   - Test LDAP user password reset blocked

6. Phase 5: Bulk Import (V53–V62)
   - Import 10 valid users
   - Import with mixed valid/invalid rows
   - Import with duplicate emails
   - Import with invalid references
   - Verify per-row results
   - Download CSV template

7. Phase 6: Bulk Status Changes (V63–V70)
   - Bulk suspend 5 users
   - Bulk activate 5 users
   - Bulk delete 3 users
   - Verify self-exclusion
   - Verify audit trail

8. Phase 7: Edge Cases & RBAC (V71–V78)
   - Create user with 'user' role, test RBAC denials
   - Test all endpoints with missing auth
   - Test with invalid UUIDs
   - Test empty strings and boundary values
   - Test concurrent operations (create same user twice simultaneously)

9. Cleanup
   - Delete all test data (prefix: "p2c-test-*")
   - Print summary
```

**Validation Scenarios (78 total):**

| # | Phase | Scenario | Expected |
|---|-------|----------|----------|
| **Phase 1: Org Hierarchy CRUD** | | | |
| V1 | R1 | Create test organization | 201, org created |
| V2 | R1 | Create duplicate org name | 409 "Organization name already exists" |
| V3 | R1 | Create branch in test org | 201, branch created |
| V4 | R1 | Create duplicate branch in same org | 409 |
| V5 | R1 | Create branch with non-existent orgId | 404 |
| V6 | R1 | Create department in test branch | 201, department created |
| V7 | R1 | Create duplicate department in same branch | 409 |
| V8 | R1 | Create department with non-existent branchId | 404 |
| V9 | R1 | Create location | 201, location created |
| V10 | R1 | Create duplicate location name | 409 |
| V11 | R1 | List organizations includes test org | 200, test org in list |
| V12 | R1 | List branches filtered by orgId | 200, only test org's branches |
| V13 | R1 | List departments filtered by branchId | 200, only test branch's departments |
| V14 | R2 | Get org tree | 200, test org with nested branches/departments |
| V15 | R2 | Org tree summary totals | Summary counts match individual counts |
| **Phase 2: Aggregate Counts** | | | |
| V16 | R1 | Org shows branchCount | `branchCount: 1` |
| V17 | R1 | Create 3 users in test department | 201 for each |
| V18 | R1 | Branch shows userCount | `users: 3` |
| V19 | R1 | Branch shows assetCount (real) | `assets: <real count>` (not hardcoded 0) |
| V20 | R1 | Department shows userCount | `userCount: 3` |
| V21 | R1 | Org shows userCount | `userCount: 3` |
| V22 | R1 | Soft-delete user, recheck count | Count decremented by 1 |
| **Phase 3: Delete Impact & Cascade** | | | |
| V23 | R3 | Impact preview: org with children | `canDelete: true, impact: { branches: 1, departments: 1, users: 3 }` |
| V24 | R3 | Impact preview: default org | `canDelete: false` |
| V25 | R3 | Impact preview: empty branch | `canDelete: true, impact: { departments: 0 }` |
| V26 | R3 | Impact preview: branch with departments | Accurate counts returned |
| V27 | R3 | Impact preview: department with users | `impact: { users: N }` |
| V28 | R3 | Impact preview: non-existent id | 404 |
| V29 | R3 | Delete org without cascade (blocked) | 400 with count-based message |
| V30 | R3 | Create new org+branch+dept+users for cascade test | 201 |
| V31 | R3 | Delete org with cascade=true | 200, all children removed |
| V32 | R3 | Verify cascade reassigned users | Users moved to default org |
| V33 | R3 | Verify cascade audit trail | Audit entries for each affected entity |
| V34 | R3 | Create org for reassign test | 201 |
| V35 | R3 | Delete with reassignTo | Branches moved, org deleted |
| **Phase 4: User Lifecycle** | | | |
| V36 | R4 | Create user with password | 201, isOnboarded: true |
| V37 | R4 | Invite user (no password) | 201, isOnboarded: false |
| V38 | R4 | Onboard invited user | 200, JWT returned, isOnboarded: true |
| V39 | R4 | Onboard with expired token | 400 |
| V40 | R4 | Onboard with weak password | 400, password policy error |
| V41 | R4 | Onboard already-onboarded user | 400 |
| V42 | R4 | Suspend active user | 200, isActive: false |
| V43 | R4 | Suspended user login attempt | 403 "Account suspended" |
| V44 | R4 | Suspend already-suspended | 400 |
| V45 | R4 | Activate suspended user | 200, isActive: true |
| V46 | R4 | Activate already-active | 400 |
| V47 | R4 | Self-suspend blocked | 400 "Cannot suspend your own account" |
| V48 | R4 | Self-delete blocked | 400 "Cannot delete your own account" |
| V49 | R4 | User audit log | GET audit entries, verify all transitions logged |
| V50 | R4 | Admin password reset | 200, reset email sent |
| V51 | R4 | Filter users by departmentId | 200, filtered results |
| V52 | R4 | Filter users by authSource | 200, filtered results |
| **Phase 5: Bulk Import** | | | |
| V53 | R5 | Import 5 valid users | `successful: 5, failed: 0` |
| V54 | R5 | Import with 1 invalid email | `successful: 4, failed: 1` with error on invalid row |
| V55 | R5 | Import with duplicate email (within CSV) | Second occurrence fails |
| V56 | R5 | Import with existing email | That row fails |
| V57 | R5 | Import with invalid role | That row fails |
| V58 | R5 | Import with invalid orgId | That row fails |
| V59 | R5 | Import 0 users | 400 |
| V60 | R5 | Import with sendInvite | Users created, invites sent |
| V61 | R5 | CSV template download | 200, CSV content returned |
| V62 | R5 | Import audit trail | Audit entry per imported user |
| **Phase 6: Bulk Status Changes** | | | |
| V63 | R6 | Bulk suspend 5 users | `successful: 5` |
| V64 | R6 | Bulk suspend includes self | Self skipped |
| V65 | R6 | Bulk suspend already-suspended | Skipped (not error) |
| V66 | R6 | Bulk activate 5 users | `successful: 5` |
| V67 | R6 | Bulk delete 3 users | 3 soft-deleted |
| V68 | R6 | Bulk action with empty array | 400 |
| V69 | R6 | Bulk action with 101 users | 400 |
| V70 | R6 | Bulk action audit trail | Per-user audit entries |
| **Phase 7: Edge Cases & RBAC** | | | |
| V71 | Cross | User role denied org create | 403 |
| V72 | Cross | User role denied user suspend | 403 |
| V73 | Cross | User role denied bulk import | 403 |
| V74 | Cross | User role allowed org list (if settings:view) | 200 |
| V75 | Cross | Invalid UUID parameter | 400 or 404 |
| V76 | Cross | Empty name validation | 400 |
| V77 | Cross | Name exceeds 100 chars | 400 |
| V78 | Cross | Concurrent user create (same email) | One succeeds, one fails with 409 |

**Script Technical Requirements:**

- Uses `fetch()` for HTTP requests (Node.js 18+ built-in)
- Runs with: `npx tsx backend/scripts/validate-pipeline-2c.ts`
- Self-contained: creates all test data, cleans up after
- Test data uses unique prefix `p2c-test-*` to avoid collisions
- Cleanup runs in `finally` block even on failure
- Each scenario has a descriptive label in output
- Failed scenarios show expected vs actual
- Exit code 0 on all-pass, 1 on any failure
- Completes in under 60 seconds
- Works on both fresh and seeded databases

**Acceptance Criteria:**

- [ ] Script runs successfully: `npx tsx backend/scripts/validate-pipeline-2c.ts`
- [ ] All 78 validation scenarios pass
- [ ] Script creates and cleans up its own test data — no residue
- [ ] Uses real HTTP requests (not service-layer calls)
- [ ] Each scenario labeled clearly: `[PASS] V1: Create test organization`
- [ ] Failed scenarios show expected vs actual
- [ ] Exit code 0 on all-pass, 1 on any failure
- [ ] Summary printed: `78/78 PASS` or `76/78 PASS, 2 FAIL`
- [ ] Handles backend not running gracefully (clear error, exit 1)
- [ ] Completes in under 60 seconds
- [ ] Cleanup runs even on failure (try/finally)
- [ ] Test data uses `p2c-test-*` prefix for isolation
- [ ] Script is idempotent (can be run multiple times)

---

## 6. Success Metrics

| Metric | Target | Measurement | When |
|--------|--------|-------------|------|
| **Branch asset count accuracy** | 100% match with DB count | `transformBranch.assets` vs `SELECT count(*) FROM assets WHERE organization_id = ?` | After R1 |
| **Org tree consistency** | Tree counts == individual endpoint counts | Validation script V14–V15 | After R2 |
| **Delete safety** | 0 orphaned records after cascade | `SELECT count(*) FROM users WHERE organization_id NOT IN (SELECT id FROM organizations)` | After R3 |
| **Lifecycle audit completeness** | 100% of state transitions logged | Every suspend/activate/delete/onboard has audit entry | After R4 |
| **Bulk import throughput** | 100 users in <10s | Validation script V53 timing | After R5 |
| **Validation script pass rate** | 78/78 scenarios pass | `validate-pipeline-2c.ts` output | After R7 |
| **Zero regressions** | Pipeline 1 + 2A + 2B validation scripts still pass | Re-run existing validation scripts | After all |
| **Backward compatibility** | Existing tests pass | `npm test` | After all |

---

## 7. Open Questions

| # | Question | Owner | Blocking? | Recommendation |
|---|----------|-------|-----------|----------------|
| Q1 | Should branch asset count be at the org level (all assets in the org) or branch-specific (assets owned by users in that branch's departments)? | Product | Yes — before R1 | **Org-level for now.** Assets don't have a direct `branchId`, and computing via dept membership is unreliable (some assets have no owner). Use org-level count and note it in the API response. |
| Q2 | Should cascade-delete actually remove records or soft-delete everything? | Engineering | Yes — before R3 | **Soft-delete users, hard-delete hierarchy.** Users get `deletedAt` set, but empty branches/departments are hard-deleted since they have no data worth preserving. |
| Q3 | Should the onboarding endpoint (`POST /v1/auth/onboard`) require the user to accept terms of service? | Product | No | **No for v1.** Terms acceptance can be a separate feature. Keep onboarding simple: token + password. |
| Q4 | Should bulk import use CSV file upload (multipart) or JSON array (parsed client-side)? | Engineering | No | **JSON array.** Frontend parses the CSV and sends structured JSON. This simplifies the backend (no file upload handling) and lets the frontend show a preview before submitting. |
| Q5 | Should we add a `branchId` FK to the `Asset` model for accurate per-branch asset counting? | Engineering | No | **Not in this pipeline.** It would be a schema migration with data backfill. Use the org-level approximation for now. Track as future work. |
| Q6 | Should suspended users' existing sessions be force-terminated (invalidate access tokens) or just block new logins? | Engineering | Yes — before R4 | **Block new logins + revoke refresh tokens.** Access tokens are short-lived (JWT, can't be revoked), so just revoking refresh tokens and blocking login is sufficient. Existing sessions expire naturally. |
| Q7 | For bulk import, should we allow importing users with pre-set passwords or always use invite flow? | Product | No | **Support both.** If password is provided in the import, create as onboarded. If not, create as invited (with optional sendInvite flag). |

---

## 8. Timeline Considerations

**Dependencies:**
- Pipeline 2A (RBAC) — COMPLETED (all routes already have permission middleware)
- Pipeline 2B (LDAP) — COMPLETED (LDAP user org assignment tested)
- No external dependencies

**Suggested Implementation Order:**

```
R1 (Aggregate counts) ──── Quick fix, unblocks R2
         ↓
R2 (Org tree endpoint) ── Depends on R1 counts being correct
         ↓
R3 (Delete impact/cascade) ── Can start in parallel with R2
         ↓
R4 (User lifecycle) ──── Largest task (routes, onboarding, audit)
         ↓
R5 (Bulk import) ──────── Independent, can parallel with R4
R6 (Bulk status change) ── Independent, can parallel with R4/R5
         ↓
R7 (Validation script) ── Must be last (validates everything)
```

**Parallelizable Work:**
- R1 and R3 can start simultaneously (R1 is a quick fix, R3 is a new feature)
- R5 (bulk import) and R6 (bulk status) are independent of each other and of R3
- R4 (lifecycle) can start once R1 is done (it extends user endpoints)
- R7 must come last

**Risk Factors:**
- R3 (cascade delete) is the most complex task — must handle foreign key constraints correctly, ensure no orphaned records, and create proper audit trails
- R4 (onboarding endpoint) adds a new auth flow — must be security-reviewed (token validation, password hashing, JWT issuance)
- R5 (bulk import) must handle large payloads efficiently — a 500-user import in a single transaction could time out
- R1 branch asset count depends on how assets are currently linked to orgs — if assets have no `organizationId`, the count query will be more complex

---

## Appendix A: Files to Create/Modify

| File | Action | Risk | Description |
|------|--------|------|-------------|
| **New Files** | | | |
| `backend/scripts/validate-pipeline-2c.ts` | CREATE | Medium | 78-scenario validation script |
| **Modified Files** | | | |
| `backend/src/modules/settings/organizations.service.ts` | MODIFY | Medium | Add aggregate counts, delete impact, cascade delete, org tree |
| `backend/src/modules/settings/users.service.ts` | MODIFY | Medium | Add bulk import, bulk status change, lifecycle guards |
| `backend/src/modules/settings/settings.routes.ts` | MODIFY | Medium | Add new routes: suspend, activate, onboard, import, bulk actions, org-tree, delete-impact |
| `backend/src/modules/settings/settings.controller.ts` | MODIFY | Medium | Add controller methods for new routes |
| `backend/src/modules/settings/settings.validators.ts` | MODIFY | Low | Add validators: onboardSchema, bulkImportSchema, bulkActionSchema, enhanced userListQuerySchema |
| `backend/src/modules/settings/settings.types.ts` | MODIFY | Low | Add response types: OrgTreeResponse, DeleteImpactResponse, BulkImportResponse, BulkActionResponse |
| `backend/src/modules/auth/auth.routes.ts` | MODIFY | Medium | Add `POST /v1/auth/onboard` route |
| `backend/src/modules/auth/auth.controller.ts` | MODIFY | Medium | Add `onboard` controller method |
| `backend/src/modules/auth/auth.service.ts` | MODIFY | Medium | Add `completeOnboarding()` method |

**Total: ~1 new file, ~9 modified files**

---

## Appendix B: Complete Test Case Summary

| Requirement | Test Cases | Categories |
|-------------|-----------|------------|
| R1: Aggregate Counts | T1.1–T1.10 (10 tests) | Branch assets, org summary, department users |
| R2: Org Tree | T2.1–T2.8 (8 tests) | Empty, hierarchy, summary, RBAC, performance |
| R3: Delete Impact & Cascade | T3.1–T3.18 (18 tests) | Impact preview, cascade, reassign, audit |
| R4: User Lifecycle | T4.1–T4.22 (22 tests) | Suspend, activate, onboard, filters, audit |
| R5: Bulk Import | T5.1–T5.13 (13 tests) | Valid, invalid, duplicates, template, RBAC |
| R6: Bulk Status Change | T6.1–T6.10 (10 tests) | Suspend, activate, delete, self-exclusion |
| R7: Validation Script | V1–V78 (78 scenarios) | End-to-end, cross-feature, edge cases |
| **TOTAL** | **81 unit/integration tests + 78 validation scenarios** | |

---

## Appendix C: Seed Data for Testing

The validation script creates its own test data with the `p2c-test-*` prefix:

| Entity | Name | Details |
|--------|------|---------|
| Organization | p2c-test-org | Test organization |
| Branch | p2c-test-branch | Under p2c-test-org |
| Department | p2c-test-dept | Under p2c-test-branch |
| Location | p2c-test-location | City: "Test City", Country: "Testland" |
| Users | p2c-test-user-001 through p2c-test-user-020 | Various states (active, invited, suspended) |
| Import Users | p2c-import-001 through p2c-import-010 | For bulk import testing |
| Cascade Org | p2c-cascade-org | Org created for cascade delete testing |
| Reassign Org | p2c-reassign-org | Org created for reassign testing |

All test data is cleaned up in the `finally` block, ensuring no residue even on script failure.

---

*This PRD was authored based on thorough codebase exploration of the existing organization, branch, department, location, and user management code. All referenced files, line numbers, and current behaviors were verified against the actual source code as of 2026-02-14.*
