# PRD: Pipeline 2C — Organization & User Management

**Pipeline:** Sprint 2 — Backend Pipeline Hardening
**Sub-Pipeline:** 2C
**Status:** Draft
**Owner:** Backend Team
**Created:** 2026-02-13
**Dependencies:** Pipeline 2A (RBAC — COMPLETED), Pipeline 2B (LDAP — COMPLETED)
**Resolves:** A.15 (Branch asset count hardcoded to 0)

---

## Problem Statement

PatchIQ's organization hierarchy and user management system exists but is incomplete and has critical bugs that prevent production use in multi-branch enterprise environments. System administrators cannot accurately see asset distribution across branches (counts hardcoded to 0), cannot manage the full user lifecycle (invite → onboard → suspend → reactivate), and cannot bulk-import users from CSV or LDAP. LDAP-synced users join the system but are not properly assigned to the organizational hierarchy, making role-based asset filtering impossible.

**Who experiences this:**
- System administrators managing multi-location enterprises (daily)
- IT managers trying to track assets by branch (every reporting cycle)
- HR/IT teams onboarding 10+ employees at once (monthly/quarterly)
- Security teams needing to suspend/reactivate users (weekly)

**Cost of not solving:**
- **Data integrity**: Branch asset counts are lies (hardcoded 0) → cannot trust reporting
- **Manual overhead**: Admins invite users one-by-one instead of bulk import → hours wasted
- **Security risk**: No audit trail for user lifecycle transitions → compliance violations
- **LDAP integration broken**: Synced users have no branch/dept assignment → broken org structure

**Evidence:**
- A.15 from Sprint 1 deferred items: "Branch asset count hardcoded to 0"
- Existing schema has Organization → Branch → Department → Location hierarchy but no cascade rules
- User lifecycle states (isActive, isOnboarded, deletedAt) exist but no workflow enforcement
- LDAP sync (Pipeline 2B) creates users but doesn't assign them to org hierarchy

---

## Goals

### User Goals

1. **Accurate branch reporting** — Branch asset counts reflect real data (not 0) so admins can see actual distribution across 10+ branches within 5 seconds
2. **Streamlined user onboarding** — Bulk import 50+ users from CSV/LDAP in under 2 minutes with duplicate detection and validation warnings
3. **Complete user lifecycle control** — Invite → send email → user completes onboarding → suspend when needed → reactivate → full audit trail for compliance

### Business Goals

4. **Production-ready org hierarchy** — Fix cascading deletes, constraints, and asset count queries so enterprise customers can deploy without data integrity bugs
5. **LDAP integration completion** — LDAP-synced users automatically join correct branch/dept based on LDAP attributes or mapping rules

---

## Non-Goals

1. **Frontend UI for org/user management** — Dev 2 builds the frontend separately; this PRD covers backend API only *(Reason: Backend/frontend split per Sprint 2 approach)*
2. **SSO/SAML authentication** — LDAP auth covered in Pipeline 2B; SSO is a future initiative *(Reason: LDAP satisfies enterprise auth requirements for now)*
3. **Granular user permissions beyond RBAC** — Pipeline 2A covers role-based permissions; per-user permission overrides are overkill *(Reason: Role-based model is sufficient)*
4. **User profile customization (bio, social links, etc.)** — PatchIQ is enterprise patch management, not a social platform *(Reason: Not core to the product)*
5. **Multi-tenancy isolation** — Single organization per deployment for v1; multi-tenancy is a future architecture initiative *(Reason: Current customer base doesn't need it)*

---

## User Stories

### Org Hierarchy Management

**Priority 1: Core Hierarchy**

- **US-1.1**: As a system admin, I want to create a new branch under an organization so that I can model our company's regional structure (e.g., "North America HQ", "Europe Office")
- **US-1.2**: As a system admin, I want to see the actual count of assets assigned to each branch so that I can identify which locations need more attention (not hardcoded 0)
- **US-1.3**: As a system admin, I want to delete a branch and be warned if it has assets or users assigned so that I don't accidentally orphan data
- **US-1.4**: As a system admin, I want to create departments under a branch (e.g., "IT Dept" under "North America HQ") so that I can organize users and assets by business function
- **US-1.5**: As a system admin, I want to assign users to a specific department and location so that asset visibility is scoped correctly

**Priority 2: Edge Cases**

- **US-1.6**: As a system admin, I want to move a department from one branch to another without losing users or data so that I can reorganize as the company restructures
- **US-1.7**: As a system admin, I want to merge two departments into one so that I can consolidate after an acquisition
- **US-1.8**: As a system admin, I want to see which locations have no users assigned so that I can clean up stale data

### User Lifecycle Management

**Priority 1: Core Lifecycle**

- **US-2.1**: As a system admin, I want to invite a new user by email and have them receive an onboarding link so that they can set their password and complete their profile
- **US-2.2**: As a new user, I want to complete my onboarding by setting my password and accepting terms so that I can start using PatchIQ
- **US-2.3**: As a system admin, I want to suspend a user account (not delete) so that they cannot log in when they leave the company temporarily (e.g., leave of absence)
- **US-2.4**: As a system admin, I want to reactivate a suspended user so that they regain access when they return
- **US-2.5**: As a system admin, I want to permanently delete a user and see a warning if they own assets/jobs so that I can decide whether to proceed

**Priority 2: Audit & Compliance**

- **US-2.6**: As a compliance officer, I want to see an audit log of all user lifecycle transitions (invited → onboarded → suspended → reactivated → deleted) so that I can prove user access controls for SOC 2 audits
- **US-2.7**: As a system admin, I want to see when a user last logged in so that I can identify inactive accounts for cleanup
- **US-2.8**: As a system admin, I want to bulk suspend users by uploading a CSV of email addresses so that I can quickly offboard departing employees

### Bulk User Import

**Priority 1: CSV Import**

- **US-3.1**: As a system admin, I want to upload a CSV with 100+ users (email, name, role, branch, dept) and have them all invited in one operation so that I don't spend hours clicking "Add User" repeatedly
- **US-3.2**: As a system admin, I want to see validation warnings for duplicate emails, invalid roles, or missing branches before the import runs so that I can fix the CSV and retry
- **US-3.3**: As a system admin, I want to download a CSV template with the correct column headers so that I know the expected format

**Priority 2: LDAP Import**

- **US-3.4**: As a system admin, I want to map LDAP group DNs to branches/departments so that LDAP-synced users are automatically assigned to the correct part of the org hierarchy
- **US-3.5**: As a system admin, I want to see which LDAP users were assigned to which branch/dept after a sync so that I can verify the mapping rules worked correctly

### LDAP Integration

**Priority 1: LDAP User Assignment**

- **US-4.1**: As a system admin, I want LDAP-synced users to be assigned to a default branch/dept when first created so that they don't end up organizationless
- **US-4.2**: As a system admin, I want to define mapping rules (e.g., "If LDAP group = 'IT-USA', assign to 'North America HQ / IT Dept'") so that users land in the right place automatically
- **US-4.3**: As a system admin, I want to see unassigned LDAP users (no branch/dept) so that I can manually fix them or update mapping rules

---

## Requirements

### R1: Organization Hierarchy Hardening (P0 — Must Have)

**Problem:** Current schema has Org → Branch → Dept → Location but lacks cascade rules, constraints, and real asset count queries. Admins see hardcoded 0 for branch asset counts (A.15).

**Solution:**

1. **Fix cascade delete behavior** — Add proper `onDelete` constraints:
   - Deleting Organization → CASCADE to branches → CASCADE to departments
   - Deleting Branch → CASCADE to departments
   - Deleting Organization/Branch/Dept with assigned users → PREVENT with clear error
   - Deleting Organization/Branch/Dept with assigned assets → PREVENT with clear error

2. **Real asset count queries** — Replace hardcoded 0 with:
   - Count assets WHERE `asset.organizationId = branch.organizationId` AND `asset.location.branch = branch.id` (requires asset-to-branch mapping via location or direct FK)
   - If schema doesn't support direct branch-to-asset link, add `branchId` FK to Asset model

3. **Unique name constraints** — Enforce:
   - Organization name globally unique
   - Branch name unique within organization (current: `@@unique([organizationId, name])`)
   - Department name unique within branch (current: `@@unique([branchId, name])`)
   - Location name globally unique (current: `@unique`)

4. **Default organization/branch** — Ensure at least one default exists:
   - Seed script creates "Default Organization" with `isDefault=true`
   - Seed script creates "Main Branch" with `isDefault=true`
   - New users without org/branch assignment get default

5. **Endpoints to harden:**
   - `POST /v1/settings/organizations` — Validate name uniqueness, prevent duplicate defaults
   - `DELETE /v1/settings/organizations/:id` — Check for assigned users/assets, return 409 if found
   - `POST /v1/settings/branches` — Validate organizationId exists, name unique within org
   - `DELETE /v1/settings/branches/:id` — Check for departments/users/assets, return 409
   - `POST /v1/settings/departments` — Validate branchId exists, name unique within branch
   - `DELETE /v1/settings/departments/:id` — Check for assigned users, return 409
   - `GET /v1/settings/branches` — Include `assetCount` and `userCount` in response
   - `GET /v1/settings/organizations` — Include `branchCount`, `userCount`, `assetCount`

**Acceptance Criteria:**

- [AC-R1.1] GET `/branches` returns real asset counts (not 0) for branches with assigned assets
- [AC-R1.2] DELETE `/organizations/:id` with assigned users returns 409 "Organization has 15 users; reassign them first"
- [AC-R1.3] DELETE `/organizations/:id` with assigned assets returns 409 "Organization has 42 assets; reassign them first"
- [AC-R1.4] DELETE `/organizations/:id` with no users/assets cascades to branches and departments
- [AC-R1.5] POST `/organizations` with duplicate name returns 400 "Organization name already exists"
- [AC-R1.6] POST `/branches` with invalid organizationId returns 400 "Organization not found"
- [AC-R1.7] Seed script creates "Default Organization" and "Main Branch" with isDefault=true
- [AC-R1.8] New users without org/branch assignment get defaults on creation

---

### R2: User Lifecycle State Management (P0 — Must Have)

**Problem:** User lifecycle states (isActive, isOnboarded, deletedAt) exist but no workflow enforcement. No invite flow, no suspend/reactivate actions, no audit trail.

**Solution:**

1. **User states and transitions:**
   - `INVITED` — User created via `POST /users`, `isOnboarded=false`, passwordHash=null, invite token sent
   - `ONBOARDED` — User completed onboarding (`POST /auth/complete-onboarding`), `isOnboarded=true`, passwordHash set
   - `ACTIVE` — `isActive=true`, can log in
   - `SUSPENDED` — `isActive=false`, cannot log in (401 on login attempt)
   - `DELETED` — `deletedAt` set (soft delete), user hidden from lists, cannot log in

2. **New endpoints:**
   - `POST /v1/settings/users/invite` — Create user, send invite email, return invite link
   - `POST /v1/settings/users/:id/suspend` — Set `isActive=false`, log audit event
   - `POST /v1/settings/users/:id/reactivate` — Set `isActive=true`, log audit event
   - `DELETE /v1/settings/users/:id` — Soft delete (set `deletedAt`), check for owned assets/jobs first
   - `POST /v1/settings/users/:id/restore` — Clear `deletedAt` (undo soft delete)

3. **Invite flow:**
   - Admin calls `POST /users/invite { email, firstName, lastName, roleId, organizationId, branchId, departmentId, locationId }`
   - Backend creates User with `isOnboarded=false`, `passwordHash=null`
   - Backend generates invite token (JWT with 7-day expiry, type='invite')
   - Backend sends email with invite link: `https://patchiq.example.com/onboard?token=<JWT>`
   - User clicks link, calls `POST /auth/complete-onboarding { token, password, acceptedTerms }`
   - Backend validates token, sets password, marks `isOnboarded=true`

4. **Audit logging:**
   - Every state transition creates `AuditLog` entry:
     - `action: 'user_invited' / 'user_onboarded' / 'user_suspended' / 'user_reactivated' / 'user_deleted' / 'user_restored'`
     - `resource: 'user'`, `resourceId: userId`
     - `details: { from: 'INVITED', to: 'ONBOARDED' }` (state transitions)

5. **Validation:**
   - Cannot suspend already suspended user (409)
   - Cannot reactivate already active user (409)
   - Cannot delete user who owns assets or jobs (409 with warning)
   - Invite email must be unique (400 if email exists)

**Acceptance Criteria:**

- [AC-R2.1] POST `/users/invite` creates user with `isOnboarded=false`, sends email with invite link
- [AC-R2.2] POST `/auth/complete-onboarding` with valid token sets password, marks `isOnboarded=true`
- [AC-R2.3] POST `/users/:id/suspend` sets `isActive=false`, creates audit log entry
- [AC-R2.4] POST `/users/:id/reactivate` sets `isActive=true`, creates audit log entry
- [AC-R2.5] DELETE `/users/:id` soft-deletes (sets `deletedAt`), hides from GET `/users` list
- [AC-R2.6] DELETE `/users/:id` who owns assets returns 409 "User owns 5 assets; reassign first"
- [AC-R2.7] POST `/users/:id/restore` clears `deletedAt`, user reappears in lists
- [AC-R2.8] Login attempt for suspended user returns 401 "Account suspended"
- [AC-R2.9] Login attempt for deleted user returns 401 "Invalid credentials"
- [AC-R2.10] All lifecycle transitions logged in audit with from/to states

---

### R3: Bulk User Import (P0 — Must Have)

**Problem:** Admins invite users one-by-one. No CSV import, no LDAP group-to-org mapping.

**Solution:**

1. **CSV Import endpoint:**
   - `POST /v1/settings/users/import` with `multipart/form-data` (CSV file upload)
   - CSV columns: `email`, `firstName`, `lastName`, `role`, `organization`, `branch`, `department`, `location` (all text, mapped by name)
   - Backend validates each row:
     - Email format valid, not duplicate in DB or CSV
     - Role exists (lookup by name)
     - Organization/branch/dept/location exist (lookup by name)
   - Backend returns:
     - `{ success: true, imported: 95, skipped: 5, errors: [ { row: 12, email: 'duplicate@example.com', reason: 'Email already exists' } ] }`
   - Users created with `isOnboarded=false`, invite emails sent

2. **CSV Template endpoint:**
   - `GET /v1/settings/users/import/template` returns CSV with headers and 2 example rows

3. **LDAP group-to-org mapping:**
   - New model: `LdapOrgMapping` (ldapGroupDn → organizationId, branchId, departmentId, locationId)
   - Endpoint: `POST /v1/settings/ldap-configs/:id/org-mappings` (create mapping)
   - Endpoint: `GET /v1/settings/ldap-configs/:id/org-mappings` (list mappings)
   - When LDAP sync creates user (Pipeline 2B), lookup user's LDAP groups → find matching `LdapOrgMapping` → assign org/branch/dept/location
   - If no mapping found, assign to default org/branch

4. **Duplicate detection:**
   - CSV import checks email uniqueness before creating users
   - Returns list of duplicate rows so admin can fix CSV and retry

**Acceptance Criteria:**

- [AC-R3.1] POST `/users/import` with 100-row CSV imports all 100 users in under 30 seconds
- [AC-R3.2] POST `/users/import` with duplicate emails in CSV returns 400 with error list (row numbers + reasons)
- [AC-R3.3] POST `/users/import` with invalid role name returns error for that row, imports valid rows
- [AC-R3.4] GET `/users/import/template` returns CSV with correct headers and example data
- [AC-R3.5] POST `/ldap-configs/:id/org-mappings` creates mapping (ldapGroupDn → org/branch/dept/location)
- [AC-R3.6] LDAP sync assigns user to org/branch/dept based on their LDAP groups via `LdapOrgMapping`
- [AC-R3.7] LDAP sync with no matching mapping assigns user to default org/branch
- [AC-R3.8] CSV import sends invite emails to all imported users

---

### R4: Validation Script (P0 — Must Have)

**Problem:** No automated way to verify all org/user management features work end-to-end.

**Solution:**

Create `backend/scripts/validate-org-user-management.ts` with 50+ test scenarios covering:

**Phase 1: Org Hierarchy (15 scenarios)**
- V1: Create organization
- V2: Create branch under org
- V3: Create department under branch
- V4: Create location
- V5: Get organization list with branchCount/userCount/assetCount
- V6: Get branch list with assetCount/userCount
- V7: Prevent delete org with users (409)
- V8: Prevent delete org with assets (409)
- V9: Prevent delete branch with departments (409)
- V10: Cascade delete org with no users/assets/branches
- V11: Duplicate org name rejected (400)
- V12: Invalid organizationId when creating branch (400)
- V13: Unique branch names within org
- V14: Default org/branch assignment for new users
- V15: Move department to different branch

**Phase 2: User Lifecycle (20 scenarios)**
- V16: Invite user (creates user with isOnboarded=false)
- V17: Complete onboarding (sets password, isOnboarded=true)
- V18: Invite with duplicate email rejected (400)
- V19: Onboarding with invalid token rejected (401)
- V20: Onboarding with expired token rejected (401)
- V21: Suspend user (isActive=false)
- V22: Login as suspended user rejected (401)
- V23: Reactivate user (isActive=true)
- V24: Login as reactivated user succeeds (200)
- V25: Soft delete user (sets deletedAt)
- V26: Deleted user hidden from GET /users list
- V27: Restore deleted user (clears deletedAt)
- V28: Prevent delete user with owned assets (409)
- V29: Prevent suspend already suspended user (409)
- V30: Prevent reactivate already active user (409)
- V31: Audit log for user_invited action
- V32: Audit log for user_onboarded action
- V33: Audit log for user_suspended action
- V34: Audit log for user_reactivated action
- V35: Audit log for user_deleted action

**Phase 3: Bulk Import (10 scenarios)**
- V36: CSV import with 50 valid rows
- V37: CSV import with duplicate emails (error list returned)
- V38: CSV import with invalid role (error for that row, others imported)
- V39: CSV import with missing org/branch (error)
- V40: CSV template download (correct headers)
- V41: LDAP org mapping creation
- V42: LDAP sync assigns user to org/branch via mapping
- V43: LDAP sync with no mapping uses default org/branch
- V44: CSV import sends invite emails to all users
- V45: CSV import with 0 valid rows returns error (no users created)

**Phase 4: Edge Cases (10 scenarios)**
- V46: Create user with all optional fields (branch, dept, location)
- V47: Create user with minimal fields (email, role only) → gets defaults
- V48: Update user org/branch/dept assignment
- V49: List users filtered by organization
- V50: List users filtered by branch
- V51: List users filtered by isActive=false (suspended users)
- V52: List users filtered by isOnboarded=false (pending invites)
- V53: Concurrent user creation (no race conditions)
- V54: LDAP user assigned to correct org/branch on first login
- V55: Local user and LDAP user coexist in same org/branch

**Script Output:**
```
Organization & User Management Validation Script
=================================================
Backend is reachable at http://localhost:3000

Phase 1: Org Hierarchy
  [PASS] V1: Create organization -- 201
  [PASS] V2: Create branch under org -- 201
  ...

Phase 2: User Lifecycle
  [PASS] V16: Invite user -- 201, email sent
  [PASS] V17: Complete onboarding -- 200, isOnboarded=true
  ...

Phase 3: Bulk Import
  [PASS] V36: CSV import with 50 valid rows -- 200, imported=50
  ...

Phase 4: Edge Cases
  [PASS] V46: Create user with all optional fields -- 201
  ...

Cleaning up...
  Deleted 65 test users
  Deleted 3 test organizations
  Deleted 5 test branches
  Deleted 2 test departments

=================================================
Results: 55/55 PASS, 0 FAIL

All organization & user management scenarios validated successfully!
```

**Acceptance Criteria:**

- [AC-R4.1] Script runs with `npx tsx backend/scripts/validate-org-user-management.ts`
- [AC-R4.2] All 55 scenarios pass against real backend + database
- [AC-R4.3] Script creates and cleans up test data (no residue after run)
- [AC-R4.4] Script uses real HTTP requests (not service-layer calls)
- [AC-R4.5] Failed scenarios show expected vs actual
- [AC-R4.6] Script exits with code 0 on all-pass, code 1 on any failure
- [AC-R4.7] Script handles backend not running (clear error message)

---

## Success Metrics

### Leading Indicators (measure within 2 weeks of deployment)

1. **Org hierarchy accuracy** — Branch asset counts match reality (0% showing hardcoded 0) within 24 hours of deployment
2. **User lifecycle adoption** — 80% of new users created via invite flow (vs. direct POST /users) within first week
3. **Bulk import usage** — At least 1 CSV import with 10+ users within first 2 weeks (proves feature is discovered and valuable)
4. **Audit trail completeness** — 100% of user lifecycle transitions logged in audit (invite/onboard/suspend/reactivate/delete)

### Lagging Indicators (measure over 1-2 months)

5. **Admin time savings** — Bulk import reduces onboarding time from 5 min/user to 30 sec/user (10x improvement, validated via stopwatch test)
6. **LDAP integration success** — 95% of LDAP-synced users assigned to correct org/branch (via mapping rules) without manual intervention
7. **Data integrity** — Zero orphaned users (no org/branch assignment) after 1 month of production use
8. **Compliance readiness** — Full audit trail for user access controls (100% of lifecycle transitions logged, passes SOC 2 review)

---

## Open Questions

1. **[Engineering]** Should we add a `branchId` FK directly to the Asset model, or compute branch assignment via `asset.location.branch`? Current schema doesn't have direct asset-to-branch link.
   - **Decision:** Add `branchId` FK to Asset for performance (avoid join through Location)

2. **[Product]** What happens to a user's owned assets when the user is soft-deleted? Transfer to another user, or just prevent deletion?
   - **Decision:** Prevent deletion (409) if user owns assets. Force admin to reassign first.

3. **[Engineering]** Should CSV import be synchronous (wait for all 100 users) or async (return job ID, poll for status)?
   - **Decision:** Synchronous for v1 (simpler, acceptable for <500 rows). Async is Future Consideration (P2).

4. **[Product]** Should invite emails include the user's initial password, or force them to set it via onboarding link?
   - **Decision:** Onboarding link (more secure, prevents password in email)

5. **[Engineering]** Should LDAP org mapping be done via LdapOrgMapping model or via JSON config in LdapConfig.orgMappingRules?
   - **Decision:** Separate model (LdapOrgMapping) for better queryability and CRUD operations

6. **[Product]** What fields are required vs. optional in CSV import? Can a user have no branch/dept/location?
   - **Decision:** Email + role required. Org/branch/dept/location optional → defaults assigned if missing.

---

## Timeline Considerations

**No hard deadlines.** This is part of Sprint 2's sequential pipeline approach. Pipeline 2C depends on 2A (RBAC — COMPLETED) and 2B (LDAP — COMPLETED), so all dependencies are met.

**Estimated effort:** 2-3 days (1 day implementation, 1 day validation script, 0.5 day bug fixes)

**Phasing:**
- **Phase 1 (P0):** R1 + R2 (org hierarchy + user lifecycle) — core functionality
- **Phase 2 (P0):** R3 (bulk import) — productivity unlock
- **Phase 3 (P0):** R4 (validation script) — quality gate

Can parallelize R3 (bulk import) with R1+R2 if resources available.

---

## Appendix A: Database Schema Changes

**New Model: LdapOrgMapping**

```prisma
model LdapOrgMapping {
  id             String       @id @default(uuid())
  ldapConfigId   String       @map("ldap_config_id")
  ldapConfig     LdapConfig   @relation(fields: [ldapConfigId], references: [id], onDelete: Cascade)
  ldapGroupDn    String       @map("ldap_group_dn") // e.g., "cn=IT-USA,ou=Groups,dc=corp,dc=example,dc=com"
  organizationId String?      @map("organization_id")
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  branchId       String?      @map("branch_id")
  branch         Branch?      @relation(fields: [branchId], references: [id], onDelete: SetNull)
  departmentId   String?      @map("department_id")
  department     Department?  @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  locationId     String?      @map("location_id")
  location       Location?    @relation(fields: [locationId], references: [id], onDelete: SetNull)
  priority       Int          @default(0) // Higher priority wins if user in multiple LDAP groups
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  @@unique([ldapConfigId, ldapGroupDn])
  @@map("ldap_org_mappings")
}
```

**Schema Changes to Existing Models:**

```prisma
// Organization model
model Organization {
  // ... existing fields ...
  ldapOrgMappings LdapOrgMapping[]
}

// Branch model
model Branch {
  // ... existing fields ...
  assets          Asset[] // NEW: Direct FK for branch asset counts
  ldapOrgMappings LdapOrgMapping[]

  // onDelete behavior changes:
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade) // WAS: Restrict
}

// Department model
model Department {
  // ... existing fields ...
  ldapOrgMappings LdapOrgMapping[]

  // onDelete behavior changes:
  branch Branch @relation(fields: [branchId], references: [id], onDelete: Cascade) // WAS: Restrict
}

// Location model
model Location {
  // ... existing fields ...
  ldapOrgMappings LdapOrgMapping[]
}

// Asset model
model Asset {
  // ... existing fields ...
  branchId String? @map("branch_id") // NEW: Direct branch assignment
  branch   Branch? @relation(fields: [branchId], references: [id], onDelete: SetNull) // NEW

  @@index([branchId]) // NEW: For branch asset count queries
}

// LdapConfig model
model LdapConfig {
  // ... existing fields ...
  ldapOrgMappings LdapOrgMapping[]
}
```

**Migration Strategy:**

1. Create `LdapOrgMapping` table
2. Add `branchId` FK to `assets` table (nullable, no backfill yet)
3. Backfill `asset.branchId` from `asset.location.branch` (if location has branch data)
4. Update `onDelete` constraints for Branch and Department (Restrict → Cascade)
5. Seed default organization + branch with `isDefault=true`

---

## Appendix B: Files to Create / Modify

| File | Changes | Risk |
|------|---------|------|
| `backend/src/db/prisma/schema.prisma` | Add LdapOrgMapping model, add Asset.branchId FK, fix cascade rules | High — schema change |
| `backend/src/db/prisma/migrations/XXXX_org_user_management/` | New migration for schema changes | High — data migration |
| `backend/src/db/prisma/seed.ts` | Create default org/branch, add LdapOrgMapping seeds | Medium |
| `backend/src/modules/settings/organizations.service.ts` | Add asset count queries, fix cascade delete checks | Medium |
| `backend/src/modules/settings/users.service.ts` | Add invite/suspend/reactivate/restore methods, audit logging | High — core user logic |
| `backend/src/modules/settings/users.controller.ts` | Add invite/suspend/reactivate/restore/import endpoints | Medium |
| `backend/src/modules/settings/users.routes.ts` | Add new user lifecycle routes | Low |
| `backend/src/modules/settings/users.validators.ts` | Add invite, suspend, import Zod schemas | Medium |
| `backend/src/modules/settings/ldap-org-mapping.service.ts` | **NEW FILE**: CRUD for LDAP org mappings | Medium |
| `backend/src/modules/settings/ldap-org-mapping.controller.ts` | **NEW FILE**: LDAP org mapping endpoints | Medium |
| `backend/src/modules/settings/ldap-org-mapping.routes.ts` | **NEW FILE**: LDAP org mapping routes | Low |
| `backend/src/modules/settings/ldap-org-mapping.validators.ts` | **NEW FILE**: Zod schemas for LDAP org mappings | Low |
| `backend/src/modules/auth/auth.service.ts` | Update complete-onboarding to use invite token validation | Medium |
| `backend/src/modules/settings/ldap-sync.worker.ts` | Update LDAP sync to assign org/branch via LdapOrgMapping | Medium — LDAP integration |
| `backend/src/shared/services/email.service.ts` | Add sendInviteEmail() template | Low |
| `backend/scripts/validate-org-user-management.ts` | **NEW FILE**: 55-scenario validation script | Medium |
| `shared/types/api.ts` | Add org/user management types if needed | Low |

**Total files**: ~18 (4 new, ~14 modified)

---

## Appendix C: Complete Test Case Summary

| Requirement | Test Cases | Categories |
|-------------|-----------|------------|
| R1: Org Hierarchy | V1–V15 (15 tests) | CRUD, cascade deletes, asset counts, constraints, defaults |
| R2: User Lifecycle | V16–V35 (20 tests) | Invite, onboard, suspend, reactivate, delete, audit, login blocking |
| R3: Bulk Import | V36–V45 (10 tests) | CSV import, LDAP org mapping, duplicate detection, email sending |
| R4: Edge Cases | V46–V55 (10 tests) | Optional fields, filtering, concurrency, LDAP integration |
| **TOTAL** | **55 test cases** | |

---

## Appendix D: User Lifecycle State Diagram

```
         +----------+
         | INVITED  |  <-- POST /users/invite (admin creates user)
         +----------+
              |
              | POST /auth/complete-onboarding (user sets password)
              v
         +------------+
         | ONBOARDED  |  <-- isOnboarded=true, can now login
         +------------+
              |
              | (user logs in successfully)
              v
         +--------+
         | ACTIVE |  <-- isActive=true, normal operations
         +--------+
              |
              +----------------+----------------+
              |                |                |
              v                v                v
      +-----------+      +---------+      +----------+
      | SUSPENDED |      | DELETED |      | ACTIVE   | (stays active)
      +-----------+      +---------+      +----------+
              |                |
              | POST /users/:id/reactivate
              v
         +--------+
         | ACTIVE |
         +--------+

State Rules:
- INVITED → can complete onboarding
- INVITED → cannot login (no password yet)
- ONBOARDED → can login if isActive=true
- ACTIVE → can be suspended or deleted
- SUSPENDED → cannot login (401), can be reactivated
- DELETED → soft delete (deletedAt set), hidden from lists, cannot login, can be restored
```

---

## Appendix E: CSV Import Format

**CSV Headers (exact order):**
```
email,firstName,lastName,role,organization,branch,department,location
```

**Example CSV:**
```csv
email,firstName,lastName,role,organization,branch,department,location
john.doe@example.com,John,Doe,admin,Acme Corp,North America HQ,IT Department,New York Office
jane.smith@example.com,Jane,Smith,user,Acme Corp,Europe Office,Sales Department,London Office
bob.jones@example.com,Bob,Jones,patch-manager,Acme Corp,North America HQ,IT Department,San Francisco Office
```

**Field Rules:**
- `email` — Required, must be valid email format, unique
- `firstName`, `lastName` — Required
- `role` — Required, must match existing role name (case-insensitive)
- `organization` — Optional, matches by name, uses default if empty
- `branch` — Optional, matches by name within organization, uses default if empty
- `department` — Optional, matches by name within branch, uses default if empty
- `location` — Optional, matches by name, uses default if empty

**Validation:**
- Row-level validation (one bad row doesn't fail entire import)
- Returns list of errors: `[ { row: 5, email: 'duplicate@example.com', reason: 'Email already exists' } ]`
- Successful rows are imported, failed rows are skipped

---

*This PRD is a living document. Update as requirements evolve during implementation.*
