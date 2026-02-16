# PRD: LDAP & Directory Services (Pipeline 2B)

**Status**: NOT STARTED
**Author**: Claude Code
**Created**: 2026-02-13
**Priority**: P0 (Critical — Blocks 2C: Org & User Management)
**Depends on**: Pipeline 2A (RBAC & Permissions Engine) — COMPLETED
**Blocks**: Pipeline 2C (Organization & User Management)
**Resolves**: Sprint 1 Deferred Item A.11 (LDAP authentication)

---

## 1. Problem Statement

PatchIQ has a `LdapConfig` model, a `testConnection()` function in `ldap.service.ts`, and CRUD routes for managing LDAP server configurations — but **no actual LDAP authentication or user synchronization exists**. The current state:

- **No LDAP login flow**: The login endpoint (`POST /v1/auth/login`) only supports email + bcrypt password verification. There is no code path that binds against an LDAP server to authenticate a user. Enterprises with Active Directory or OpenLDAP cannot use their existing credentials.
- **No user sync**: When a new employee joins and is added to Active Directory, they must be manually created in PatchIQ. There is no mechanism to import users from LDAP or keep them in sync. When an employee is terminated in AD, their PatchIQ account remains active.
- **No group-to-role mapping**: LDAP groups (e.g., `CN=IT-Admins,OU=Groups,DC=corp,DC=example,DC=com`) cannot be mapped to PatchIQ roles. Even if LDAP auth existed, users would get the default `user` role regardless of their AD group membership.
- **Password policy is write-only**: A Zod validator (`updatePasswordPolicySchema`) and settings key exist, but the password policy is never enforced at runtime — `POST /v1/auth/register`, `PUT /v1/auth/change-password`, and `POST /v1/auth/reset-password` all accept any password.
- **No test infrastructure**: There is no OpenLDAP container in `docker-compose.yml`. The `MOCK_LDAP=true` environment variable exists but the test connection simply skips real LDAP calls. There is no way to validate the LDAP integration locally.

Without LDAP support, PatchIQ cannot be adopted by any enterprise that mandates single-sign-on through their directory service — which is effectively every enterprise customer. This pipeline is also a dependency for Pipeline 2C (Org & User Management), since LDAP-synced users must be placed into the organization hierarchy.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Enterprise users can log in with LDAP credentials | `POST /v1/auth/login` with `{ email, password, authType: "ldap" }` binds against configured LDAP server, creates/links local user, and returns JWT — validated against real OpenLDAP |
| G2 | LDAP user sync keeps PatchIQ in sync with the directory | On-demand sync imports all LDAP users matching the filter, creates new local accounts, deactivates removed users — validated with 20+ test users |
| G3 | LDAP group membership determines PatchIQ role | Group-to-role mapping config maps `CN=IT-Admins` → `admin` role; user's LDAP groups determine their PatchIQ role at login and sync time |
| G4 | Password policy is enforced at runtime | Registration, password change, and password reset all enforce the configured policy (min length, uppercase, numbers, special chars) — validated with 10+ policy scenarios |
| G5 | Local development has a working OpenLDAP container | `docker compose up` starts an OpenLDAP server pre-seeded with test users and groups; developers can test LDAP features without external infrastructure |
| G6 | Validation script proves everything works end-to-end | Automated script with 40+ scenarios passes against real OpenLDAP, covering auth, sync, group mapping, password policy, and edge cases |

---

## 3. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| N1 | SAML / OAuth / OIDC SSO | Separate authentication protocols — LDAP is the starting point; SSO is a future pipeline |
| N2 | Multi-domain LDAP (multiple forests) | Over-engineering for v1; single LDAP config per login is sufficient. Multiple `LdapConfig` records already supported for different servers, but a user authenticates against one |
| N3 | LDAP write-back (changing AD passwords from PatchIQ) | Too risky for v1 — read-only LDAP integration. Users change passwords in AD directly |
| N4 | Frontend LDAP configuration UI | Backend only — Dev 2 handles the frontend. Backend provides complete API |
| N5 | Kerberos / NTLM authentication | Windows-specific protocols that require domain-joined infrastructure; LDAP simple bind is the standard starting point |
| N6 | Real-time LDAP change detection (persistent search / syncrepl) | Polling-based sync via BullMQ is simpler and sufficient for v1. Real-time sync adds significant complexity |
| N7 | LDAP referral chasing | Complex AD topology feature; basic bind + search is sufficient |
| N8 | Certificate-based LDAP authentication | mTLS for LDAP is an edge case; username/password bind + STARTTLS/LDAPS is the standard |

---

## 4. User Stories

### US-1: LDAP Login
> As an **enterprise employee**, I want to log into PatchIQ using my Active Directory credentials (same username and password as my corporate email) so that I don't need to remember a separate password for PatchIQ.

### US-2: First-Time LDAP Login (Auto-Provisioning)
> As an **enterprise employee logging in for the first time**, I want PatchIQ to automatically create my account when I authenticate via LDAP so that an admin doesn't have to manually create my account before I can use the system.

### US-3: LDAP Group-Based Role Assignment
> As a **PatchIQ admin**, I want to map LDAP groups (like `CN=IT-Admins`) to PatchIQ roles (like `admin`) so that users automatically get the correct permissions based on their Active Directory group membership.

### US-4: On-Demand LDAP Sync
> As a **PatchIQ admin**, I want to trigger an LDAP sync that imports all users from the directory and updates their roles based on group membership so that I can quickly onboard a batch of new employees.

### US-5: Scheduled LDAP Sync
> As a **PatchIQ admin**, I want LDAP sync to run automatically on a schedule (e.g., every 6 hours) so that new employees get access and terminated employees lose access without manual intervention.

### US-6: Deactivation of Removed LDAP Users
> As a **security-conscious admin**, I want users who have been removed from the LDAP directory to be automatically deactivated in PatchIQ during sync so that former employees cannot access the system.

### US-7: LDAP Connection Test
> As a **PatchIQ admin configuring LDAP for the first time**, I want to test the LDAP connection before saving the configuration so that I can verify the host, port, bind DN, and credentials are correct without affecting existing users.

### US-8: Password Policy Enforcement
> As a **PatchIQ admin**, I want to configure password requirements (minimum length, uppercase, numbers, special characters) and have them enforced whenever a local user creates or changes their password so that our security standards are met.

### US-9: Mixed Authentication
> As a **PatchIQ admin**, I want both LDAP and local authentication to work simultaneously so that I can have some users authenticate via LDAP (enterprise employees) and others via local password (service accounts, external contractors).

### US-10: LDAP Sync Audit Trail
> As a **PatchIQ admin**, I want to see a log of what happened during each LDAP sync (users created, updated, deactivated, errors) so that I can troubleshoot sync issues and verify the sync is working correctly.

---

## 5. Requirements

### R1: LDAP Authentication Flow (P0 — Must Have)

Add an LDAP authentication path to the existing login endpoint. When `authType: "ldap"` is specified (or when the user's account is marked as LDAP-sourced), authenticate against the configured LDAP server instead of checking the local password hash.

**Schema Changes:**

```prisma
model User {
  // ADD these fields:
  authSource    String  @default("LOCAL") @map("auth_source")  // "LOCAL" | "LDAP"
  ldapDn        String? @map("ldap_dn")                        // Full DN from LDAP (e.g., "cn=john,ou=users,dc=corp,dc=example,dc=com")
  ldapConfigId  String? @map("ldap_config_id")                 // Which LdapConfig was used
  ldapConfig    LdapConfig? @relation(fields: [ldapConfigId], references: [id], onDelete: SetNull)

  // ... existing fields unchanged
}

model LdapConfig {
  // ADD:
  users         User[]                    // Reverse relation
  groupMappings LdapGroupMapping[]        // Group → Role mappings
  syncJobs      LdapSyncJob[]             // Sync history

  // ADD these fields:
  userSearchBase  String?  @map("user_search_base")   // Override baseDn for user searches (e.g., "ou=People,dc=corp,dc=example,dc=com")
  groupSearchBase String?  @map("group_search_base")  // Base DN for group searches (e.g., "ou=Groups,dc=corp,dc=example,dc=com")
  groupFilter     String?  @map("group_filter")        // Filter for groups (e.g., "(objectClass=groupOfNames)")
  emailAttribute  String   @default("mail") @map("email_attribute")   // LDAP attribute for email
  nameAttribute   String   @default("cn") @map("name_attribute")      // LDAP attribute for display name
  usernameAttribute String @default("uid") @map("username_attribute") // LDAP attribute for login username (uid, sAMAccountName, etc.)
  groupMemberAttribute String @default("member") @map("group_member_attribute") // Attribute listing group members

  // ... existing fields unchanged
}
```

**New Models:**

```prisma
model LdapGroupMapping {
  id           String     @id @default(uuid())
  ldapConfigId String     @map("ldap_config_id")
  ldapConfig   LdapConfig @relation(fields: [ldapConfigId], references: [id], onDelete: Cascade)
  ldapGroupDn  String     @map("ldap_group_dn")  // Full DN of LDAP group (e.g., "cn=IT-Admins,ou=Groups,dc=corp,dc=example,dc=com")
  roleId       String     @map("role_id")
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  priority     Int        @default(0)             // Higher priority mapping wins when user is in multiple groups
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@unique([ldapConfigId, ldapGroupDn])
  @@index([ldapConfigId])
  @@map("ldap_group_mappings")
}

model LdapSyncJob {
  id           String     @id @default(uuid())
  ldapConfigId String     @map("ldap_config_id")
  ldapConfig   LdapConfig @relation(fields: [ldapConfigId], references: [id], onDelete: Cascade)
  status       String     @default("PENDING")     // PENDING | RUNNING | COMPLETED | FAILED
  triggerType  String     @default("MANUAL") @map("trigger_type")  // MANUAL | SCHEDULED

  // Results
  usersFound      Int @default(0) @map("users_found")
  usersCreated    Int @default(0) @map("users_created")
  usersUpdated    Int @default(0) @map("users_updated")
  usersDeactivated Int @default(0) @map("users_deactivated")
  usersReactivated Int @default(0) @map("users_reactivated")
  errors          Int @default(0)

  // Detail log (JSON array of { action, email, detail })
  syncLog     Json?     @map("sync_log")
  errorLog    Json?     @map("error_log")

  startedAt   DateTime? @map("started_at")
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([ldapConfigId, status])
  @@index([createdAt])
  @@map("ldap_sync_jobs")
}
```

**Also add reverse relation to Role model:**

```prisma
model Role {
  // ADD:
  groupMappings LdapGroupMapping[]
  // ... existing fields unchanged
}
```

**Authentication Flow:**

```
POST /v1/auth/login { email, password, authType?: "ldap" | "local" }
    ↓
1. Look up user by email (case-insensitive)
    ↓
2. Determine auth path:
   a. If authType === "ldap" → always use LDAP auth
   b. If user exists and user.authSource === "LDAP" → use LDAP auth
   c. If user exists and user.authSource === "LOCAL" → use local auth (bcrypt)
   d. If user does NOT exist and authType === "ldap" → use LDAP auth (auto-provision on success)
   e. If user does NOT exist and authType is not specified → use local auth (will fail: "Invalid email or password")
    ↓
3. LDAP auth path:
   a. Find active LdapConfig (isActive === true). If multiple, try each in order (by id) until one succeeds.
   b. Build user search filter: (&(emailAttribute=email)(objectClass=person))
      - OR if usernameAttribute is being used: (&(usernameAttribute=email)(objectClass=person))
   c. Bind as service account (bindDn/bindPassword from LdapConfig)
   d. Search for user with filter in userSearchBase (or baseDn)
   e. If user NOT found in LDAP → throw UnauthorizedError("Invalid email or password")
   f. Attempt to bind as the found user (userDn + provided password)
      - If bind fails → throw UnauthorizedError("Invalid email or password")
      - If bind succeeds → user is authenticated
   g. Extract user attributes: email, name (from nameAttribute), groups (from memberOf attribute)
   h. Resolve role:
      - Check LdapGroupMappings for this LdapConfig
      - Find which mapped LDAP groups the user belongs to (by checking memberOf against ldapGroupDn)
      - If user is in multiple mapped groups → use the mapping with highest priority
      - If user is in no mapped groups → assign default "user" system role
   i. Find or create local User:
      - If user exists (by email) → update: name, roleId (from group mapping), ldapDn, ldapConfigId, authSource="LDAP"
      - If user does not exist → create: email, name, roleId, ldapDn, ldapConfigId, authSource="LDAP", passwordHash="" (empty — never used for LDAP users)
   j. Generate JWT (same as local auth: userId, email, role, roleId, organizationId)
   k. Return LoginResponse with accessToken, refreshToken, user (including roleInfo with permissions)
    ↓
4. Local auth path: (unchanged — existing bcrypt logic)
```

**LDAP Users Cannot Use Local Password:**

- LDAP users (`authSource === "LDAP"`) have `passwordHash = ""` (empty string)
- `POST /v1/auth/change-password` must reject LDAP users with 400: "LDAP users must change their password in the directory service"
- `POST /v1/auth/forgot-password` must reject LDAP users with 400: "Password reset is not available for LDAP-authenticated users. Contact your directory administrator."
- If an admin manually resets an LDAP user's password via `POST /v1/settings/users/:id/reset-password`, it should be rejected with 400: "Cannot reset password for LDAP-authenticated users"

**LDAP Failover:**

- If LDAP server is unreachable during login, return 503: "LDAP server is unreachable. Please try again later or contact your administrator."
- Do NOT fall back to local password for LDAP users — this would be a security bypass
- If the user has `authSource === "LOCAL"`, LDAP status does not matter — local auth always works

**Acceptance Criteria:**

- [ ] User with valid LDAP credentials can log in via `POST /v1/auth/login { email, password, authType: "ldap" }`
- [ ] Login response is identical format to local login (accessToken, refreshToken, user with roleInfo.permissions)
- [ ] First-time LDAP user is auto-provisioned in local DB with `authSource: "LDAP"`, correct role from group mapping
- [ ] Subsequent LDAP logins update user's name and role if group membership changed in LDAP
- [ ] LDAP user's `ldapDn` is stored and updated on each login
- [ ] Invalid LDAP credentials return 401 with same error message as local auth ("Invalid email or password") — no information leakage
- [ ] User not found in LDAP returns 401 ("Invalid email or password")
- [ ] LDAP user cannot change password locally (400 with clear message)
- [ ] LDAP user cannot use forgot-password flow (400 with clear message)
- [ ] Admin cannot reset LDAP user's password (400 with clear message)
- [ ] LDAP server unreachable returns 503 with clear message
- [ ] LDAP user cannot fall back to local password auth (security guarantee)
- [ ] Local users (`authSource: "LOCAL"`) are completely unaffected by LDAP config
- [ ] Login without `authType` for existing LDAP user automatically uses LDAP auth
- [ ] Login without `authType` for existing local user automatically uses local auth
- [ ] Multiple `LdapConfig` records: system tries each active config until one authenticates the user
- [ ] `User.authSource` field added with migration, defaults to "LOCAL" for existing users
- [ ] `User.ldapDn` field added, nullable
- [ ] `User.ldapConfigId` field added with FK to `LdapConfig`, nullable, ON DELETE SET NULL
- [ ] Login audit log includes `authSource: "ldap"` or `authSource: "local"` for traceability
- [ ] JWT payload unchanged (userId, email, role, roleId, organizationId) — LDAP is transparent to downstream middleware

**Test Cases (R1):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T1.1 | LDAP login — valid credentials | `{ email: "john@corp.example.com", password: "ldap-pass", authType: "ldap" }` | 200, accessToken, user.authSource === "ldap" |
| T1.2 | LDAP login — wrong password | `{ email: "john@corp.example.com", password: "wrong", authType: "ldap" }` | 401 "Invalid email or password" |
| T1.3 | LDAP login — user not in LDAP | `{ email: "nonexistent@corp.example.com", password: "any", authType: "ldap" }` | 401 "Invalid email or password" |
| T1.4 | LDAP login — first time (auto-provision) | User not in PatchIQ DB, valid LDAP creds | 200, user created in DB with authSource="LDAP" |
| T1.5 | LDAP login — subsequent login updates name | User's LDAP cn changed from "John" to "John Smith" | 200, local user.name updated |
| T1.6 | LDAP login — role updated from group mapping | User added to `IT-Admins` group since last login | 200, user.roleId updated to admin role |
| T1.7 | LDAP login — removed from all mapped groups | User removed from all mapped groups | 200, user.roleId reverts to default "user" role |
| T1.8 | LDAP login — no active LdapConfig | All LdapConfigs have `isActive: false` | 400 "No active LDAP configuration found" |
| T1.9 | LDAP login — server unreachable | LDAP host is down | 503 "LDAP server is unreachable" |
| T1.10 | LDAP login — invalid bind credentials (service account) | LdapConfig has wrong bindPassword | 503 "LDAP service account authentication failed" |
| T1.11 | Local login — existing local user | `{ email: "admin@patchiq.io", password: "admin123" }` (no authType) | 200, existing local flow unchanged |
| T1.12 | Local login — LDAP user cannot use local auth | LDAP user tries login without authType | LDAP auth used automatically (authSource check) |
| T1.13 | LDAP user — change password blocked | LDAP user calls `PUT /v1/auth/change-password` | 400 "LDAP users must change their password in the directory service" |
| T1.14 | LDAP user — forgot password blocked | LDAP user calls `POST /v1/auth/forgot-password` | 400 "Password reset is not available for LDAP-authenticated users" |
| T1.15 | LDAP user — admin reset blocked | Admin calls `POST /v1/settings/users/:id/reset-password` for LDAP user | 400 "Cannot reset password for LDAP-authenticated users" |
| T1.16 | Mixed auth — LDAP and local coexist | Login as local user, then as LDAP user, both succeed | Both 200, each with correct authSource |
| T1.17 | LDAP login — disabled user in PatchIQ | LDAP auth succeeds but local user has `isActive: false` | 403 "Account is disabled" |
| T1.18 | LDAP login — JWT payload matches local auth | Decode JWT from LDAP login | Has userId, email, role, roleId (same structure as local) |
| T1.19 | Migration — existing users get authSource="LOCAL" | Run migration on DB with existing users | All existing users have `authSource: "LOCAL"`, `ldapDn: null` |
| T1.20 | LDAP login — case-insensitive email | LDAP has `mail: John@Corp.Example.com`, login with `john@corp.example.com` | 200, case-insensitive match |

---

### R2: LDAP User Sync (P0 — Must Have)

Implement on-demand and scheduled LDAP user synchronization. Sync reads all users from the LDAP directory, creates or updates local PatchIQ accounts, and deactivates users no longer present in LDAP.

**New Routes:**

```
POST /v1/settings/ldap-configs/:id/sync          — Trigger on-demand sync for a specific LDAP config
GET  /v1/settings/ldap-configs/:id/sync-jobs      — List sync history for a specific LDAP config
GET  /v1/settings/ldap-configs/:id/sync-jobs/:jobId — Get details of a specific sync job
```

**Sync Algorithm:**

```
SYNC(ldapConfigId):
  1. Create LdapSyncJob record (status: RUNNING, triggerType: MANUAL or SCHEDULED)
  2. Bind to LDAP as service account
  3. Search for all users matching userFilter in userSearchBase:
     - Default filter: (objectClass=person) or (objectClass=inetOrgPerson)
     - Extract: dn, email (emailAttribute), name (nameAttribute), memberOf
  4. For each LDAP user found:
     a. Normalize email to lowercase
     b. Skip if email is empty or null
     c. Look up local user by email:
        - EXISTS (authSource=LDAP, same ldapConfigId):
            → Update: name, ldapDn, role (from group mapping), ensure isActive=true
            → Log: "updated"
        - EXISTS (authSource=LDAP, different ldapConfigId):
            → Skip (user belongs to different LDAP config)
            → Log: "skipped — belongs to different LDAP config"
        - EXISTS (authSource=LOCAL):
            → Skip (do not overwrite local user)
            → Log: "skipped — local user"
        - DOES NOT EXIST:
            → Create user: email, name, authSource=LDAP, ldapDn, ldapConfigId, roleId (from group mapping or default "user"), passwordHash=""
            → Log: "created"
     d. Resolve role from group mapping (same logic as R1 login)
  5. Detect removed users:
     - Find all local users where authSource=LDAP AND ldapConfigId=this config
     - For each, check if their ldapDn was found in the LDAP search results
     - If NOT found in LDAP → deactivate (set isActive=false)
     - Log: "deactivated — no longer in LDAP directory"
  6. Detect reactivated users:
     - If a previously deactivated user (isActive=false, authSource=LDAP) IS found in LDAP → reactivate (set isActive=true)
     - Log: "reactivated — found in LDAP directory again"
  7. Update LdapSyncJob with results (usersFound, usersCreated, usersUpdated, usersDeactivated, usersReactivated, errors, syncLog)
  8. Set LdapSyncJob status to COMPLETED (or FAILED if errors > threshold)
```

**Scheduled Sync (BullMQ):**

- New BullMQ worker: `ldap-sync.worker.ts` in `backend/src/modules/settings/`
- Queue name: `ldap-sync`
- Repeatable job: configured via `LdapConfig.syncSchedule` (cron expression stored in a new field or derived from a "sync interval" setting)
- On server startup: register repeatable jobs for all active LdapConfigs that have a sync schedule
- On LdapConfig update: remove old repeatable job, add new one with updated schedule
- On LdapConfig delete: remove repeatable job
- Default schedule: none (admin must explicitly enable scheduled sync)

**New LdapConfig Fields for Sync:**

```prisma
model LdapConfig {
  // ADD:
  syncEnabled    Boolean  @default(false) @map("sync_enabled")      // Enable/disable scheduled sync
  syncInterval   Int      @default(360) @map("sync_interval")       // Sync interval in minutes (default: 6 hours)
  lastSyncAt     DateTime? @map("last_sync_at")                      // Last successful sync timestamp
  lastSyncStatus String?  @map("last_sync_status")                   // "success" | "partial" | "failed"
}
```

**Sync Conflict Resolution:**

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| LDAP user exists locally with same email but `authSource=LOCAL` | **Skip** — do not overwrite | Local accounts take precedence; admin must manually convert if desired |
| LDAP user exists locally with same email and `authSource=LDAP` but different `ldapConfigId` | **Skip** — belongs to other LDAP server | User is managed by a different LDAP integration |
| User removed from LDAP but has active sessions | **Deactivate** — tokens still work until expiry | Session invalidation is a separate concern (token expiry handles it within JWT TTL) |
| User in multiple mapped LDAP groups | **Highest priority mapping wins** | Priority field on `LdapGroupMapping` determines which role to assign |
| LDAP search returns > 1000 users | **Paginate** — use LDAP paged results control | Prevents timeout and memory issues with large directories |
| LDAP entry has no email attribute | **Skip and log warning** | Email is required for PatchIQ account; cannot create user without it |

**Acceptance Criteria:**

- [ ] `POST /v1/settings/ldap-configs/:id/sync` triggers sync and returns the sync job ID immediately (async)
- [ ] Sync job runs asynchronously — API returns 202 Accepted with job ID
- [ ] `GET /v1/settings/ldap-configs/:id/sync-jobs` returns list of sync jobs with results
- [ ] `GET /v1/settings/ldap-configs/:id/sync-jobs/:jobId` returns detailed sync log
- [ ] Sync creates new PatchIQ users for LDAP users not yet in the system
- [ ] Sync updates existing LDAP users' name and role based on current LDAP attributes
- [ ] Sync deactivates PatchIQ users who are no longer in the LDAP directory
- [ ] Sync reactivates previously deactivated users who reappear in LDAP
- [ ] Sync does NOT overwrite local users (authSource="LOCAL")
- [ ] Sync correctly resolves roles from LdapGroupMappings
- [ ] Sync handles > 100 LDAP users without timeout (paginated LDAP search)
- [ ] Sync handles LDAP entries with missing email attribute (skip + log warning)
- [ ] Sync handles LDAP connection failure gracefully (job marked as FAILED with error log)
- [ ] Sync is idempotent — running it twice produces the same result
- [ ] Scheduled sync via BullMQ runs at configured interval
- [ ] Updating LdapConfig sync schedule updates the BullMQ repeatable job
- [ ] Deleting LdapConfig removes the BullMQ repeatable job
- [ ] Sync job audit trail: LdapSyncJob record with counts and log
- [ ] All sync routes gated by `checkPermission('settings', 'edit')`

**Test Cases (R2):**

| ID | Test | Setup | Expected |
|----|------|-------|----------|
| T2.1 | Sync — import new users | LDAP has 5 users, PatchIQ has 0 LDAP users | 5 users created, usersCreated=5 |
| T2.2 | Sync — no changes | LDAP has 5 users, PatchIQ has same 5 | usersUpdated=5 (names/roles refreshed), usersCreated=0 |
| T2.3 | Sync — user removed from LDAP | PatchIQ has 5 LDAP users, 1 removed from LDAP | usersDeactivated=1, deactivated user isActive=false |
| T2.4 | Sync — user reactivated in LDAP | Previously deactivated user reappears in LDAP | usersReactivated=1, isActive=true |
| T2.5 | Sync — new + removed in same sync | 2 new users in LDAP, 1 removed | usersCreated=2, usersDeactivated=1 |
| T2.6 | Sync — local user with same email | LDAP has `admin@patchiq.io`, local admin exists with authSource=LOCAL | Admin NOT overwritten, logged as "skipped — local user" |
| T2.7 | Sync — user from different LDAP config | User X has ldapConfigId=A, sync runs for config B with user X in LDAP | User X NOT modified, logged as "skipped — belongs to different LDAP config" |
| T2.8 | Sync — role update from group change | User moved from `IT-Users` group to `IT-Admins` group | User's roleId updated to admin |
| T2.9 | Sync — LDAP entry missing email | One LDAP entry has no `mail` attribute | Entry skipped, warning logged, other users synced normally |
| T2.10 | Sync — LDAP connection failure | LDAP server is down | Job status=FAILED, errorLog contains connection error |
| T2.11 | Sync — idempotent | Run sync twice on same LDAP data | Same results both times, no duplicates |
| T2.12 | Sync — large directory (50+ users) | LDAP has 50 users | All 50 imported correctly, paginated search used |
| T2.13 | Sync job list | Trigger 3 syncs | `GET /sync-jobs` returns 3 jobs in reverse chronological order |
| T2.14 | Sync job detail | Trigger sync with 5 creates, 1 deactivation | `GET /sync-jobs/:id` returns syncLog with 6 entries |
| T2.15 | Sync — concurrent prevention | Trigger sync while another is RUNNING | 409 "A sync is already in progress for this LDAP configuration" |

---

### R3: LDAP Group → Role Mapping (P0 — Must Have)

Enable admins to configure mappings between LDAP groups and PatchIQ roles. These mappings are used during login (R1) and sync (R2) to automatically assign roles.

**New Routes:**

```
GET    /v1/settings/ldap-configs/:id/group-mappings          — List group mappings for an LDAP config
POST   /v1/settings/ldap-configs/:id/group-mappings          — Create a group mapping
PUT    /v1/settings/ldap-configs/:id/group-mappings/:mapId   — Update a group mapping
DELETE /v1/settings/ldap-configs/:id/group-mappings/:mapId   — Delete a group mapping
POST   /v1/settings/ldap-configs/:id/discover-groups         — Search LDAP for available groups (helper endpoint)
```

**Discover Groups Endpoint:**

Connects to the LDAP server, searches for groups using `groupSearchBase` and `groupFilter`, and returns a list of available groups for the admin to map:

```json
// POST /v1/settings/ldap-configs/:id/discover-groups
// Response:
{
  "success": true,
  "data": [
    { "dn": "cn=IT-Admins,ou=Groups,dc=corp,dc=example,dc=com", "cn": "IT-Admins", "memberCount": 5 },
    { "dn": "cn=IT-Users,ou=Groups,dc=corp,dc=example,dc=com", "cn": "IT-Users", "memberCount": 23 },
    { "dn": "cn=Security-Team,ou=Groups,dc=corp,dc=example,dc=com", "cn": "Security-Team", "memberCount": 3 }
  ]
}
```

**Group Mapping CRUD:**

```json
// POST /v1/settings/ldap-configs/:id/group-mappings
{
  "ldapGroupDn": "cn=IT-Admins,ou=Groups,dc=corp,dc=example,dc=com",
  "roleId": "uuid-of-admin-role",
  "priority": 100
}

// Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "ldapGroupDn": "cn=IT-Admins,ou=Groups,dc=corp,dc=example,dc=com",
    "roleId": "uuid-of-admin-role",
    "roleName": "admin",
    "priority": 100,
    "createdAt": "..."
  }
}
```

**Priority Resolution:**

When a user belongs to multiple mapped groups:
1. Sort matching mappings by `priority` descending
2. The highest priority mapping wins
3. If two mappings have the same priority, the one with the role that has more permissions wins (alphabetical tiebreak as last resort)
4. If no mappings match, assign the default `user` system role

**Validation Rules:**

- `ldapGroupDn` must be a non-empty string (1-1000 chars)
- `roleId` must reference an existing Role
- `priority` must be 0-1000 (integer)
- Cannot create duplicate mapping: same `ldapConfigId` + `ldapGroupDn` = unique constraint violation → 409
- Cannot map to a non-existent role → 400 "Role not found"
- Deleting a role that has group mappings: cascade delete the mappings (Prisma `onDelete: Cascade` on `LdapGroupMapping.roleId`)

**Acceptance Criteria:**

- [ ] Admin can create a group mapping linking an LDAP group DN to a PatchIQ role
- [ ] Admin can list all group mappings for an LDAP config
- [ ] Admin can update a group mapping (change roleId or priority)
- [ ] Admin can delete a group mapping
- [ ] Discover-groups endpoint searches LDAP and returns available groups with member counts
- [ ] Duplicate group mapping (same LDAP config + group DN) returns 409
- [ ] Mapping to non-existent role returns 400
- [ ] Priority correctly resolves when user is in multiple mapped groups
- [ ] Default "user" role assigned when user matches no group mappings
- [ ] Deleting a PatchIQ role cascades to delete associated group mappings
- [ ] All group mapping routes gated by `checkPermission('settings', ...)`
- [ ] Group mapping used during LDAP login (R1)
- [ ] Group mapping used during LDAP sync (R2)

**Test Cases (R3):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T3.1 | Create group mapping | `{ ldapGroupDn: "cn=IT-Admins,...", roleId: adminRoleId, priority: 100 }` | 201 Created |
| T3.2 | List group mappings | `GET /ldap-configs/:id/group-mappings` | Array of mappings with role names |
| T3.3 | Update mapping priority | `PUT /group-mappings/:id { priority: 50 }` | 200, priority updated |
| T3.4 | Update mapping role | `PUT /group-mappings/:id { roleId: newRoleId }` | 200, roleId updated |
| T3.5 | Delete group mapping | `DELETE /group-mappings/:id` | 200, mapping removed |
| T3.6 | Duplicate mapping | Create same ldapGroupDn + ldapConfigId twice | 409 "Group mapping already exists" |
| T3.7 | Map to non-existent role | `{ roleId: "non-existent-uuid" }` | 400 "Role not found" |
| T3.8 | Priority resolution — user in 2 groups | User in IT-Admins (priority=100→admin) and IT-Users (priority=50→user) | User gets admin role (higher priority) |
| T3.9 | Priority resolution — no matching groups | User in a group with no mapping | User gets default "user" role |
| T3.10 | Discover groups | `POST /ldap-configs/:id/discover-groups` | Returns LDAP groups with member counts |
| T3.11 | Discover groups — LDAP down | LDAP server unreachable | 503 with error message |
| T3.12 | Delete role cascades to mappings | Delete PatchIQ role that has 2 group mappings | Role deleted, 2 group mappings also deleted |
| T3.13 | Empty group filter | LdapConfig has no groupFilter | Uses default `(objectClass=groupOfNames)` |
| T3.14 | Mapping with special chars in DN | `cn=IT-Admins (Prod),ou=Groups,dc=corp,dc=example,dc=com` | Created successfully |

---

### R4: Password Policy Enforcement (P0 — Must Have)

Wire the existing `updatePasswordPolicySchema` validator to actual runtime enforcement. Passwords must be validated against the configured policy on registration, password change, and password reset.

**Existing Infrastructure:**

- `updatePasswordPolicySchema` Zod validator exists in `settings.validators.ts`
- Password policy stored as a `Setting` record with key `passwordPolicy`
- Routes for reading/writing the policy already exist in settings

**New Route (if not existing):**

```
GET  /v1/settings/password-policy   — Get current password policy
PUT  /v1/settings/password-policy   — Update password policy
```

**Default Password Policy:**

```json
{
  "minCharacterCount": 8,
  "minNumbers": true,
  "minLowerCaseCharacters": true,
  "minUpperCaseCharacters": true,
  "minSpecialCharacters": true
}
```

**Enforcement Points:**

| Endpoint | Enforcement | Notes |
|----------|-------------|-------|
| `POST /v1/auth/register` | Validate `password` against policy | New user registration |
| `PUT /v1/auth/change-password` | Validate `newPassword` against policy | User changes own password |
| `POST /v1/auth/reset-password` | Validate `newPassword` against policy | Password reset via token |
| `POST /v1/settings/users` (admin creates user) | Validate `password` against policy | Admin creating users |
| `POST /v1/settings/users/:id/reset-password` (admin resets) | Validate `newPassword` against policy if provided | Admin resetting user password |

**LDAP Users Exempt:** Password policy only applies to `authSource === "LOCAL"` users. LDAP users' passwords are managed by the directory service.

**Validation Function:**

```typescript
// backend/src/shared/utils/password-policy.ts

interface PasswordPolicy {
  minCharacterCount: number;
  minNumbers: boolean;
  minLowerCaseCharacters: boolean;
  minUpperCaseCharacters: boolean;
  minSpecialCharacters: boolean;
}

interface PolicyViolation {
  field: string;
  message: string;
}

async function validatePassword(password: string): Promise<PolicyViolation[]>
```

**Violation Messages:**

| Rule | Violation Message |
|------|-------------------|
| `minCharacterCount: 8` | "Password must be at least 8 characters" |
| `minNumbers: true` | "Password must contain at least one number" |
| `minLowerCaseCharacters: true` | "Password must contain at least one lowercase letter" |
| `minUpperCaseCharacters: true` | "Password must contain at least one uppercase letter" |
| `minSpecialCharacters: true` | "Password must contain at least one special character (!@#$%^&*...)" |

**Error Response Format:**

```json
{
  "success": false,
  "error": {
    "message": "Password does not meet security requirements",
    "code": "PASSWORD_POLICY_VIOLATION",
    "details": [
      { "field": "password", "message": "Password must be at least 8 characters" },
      { "field": "password", "message": "Password must contain at least one special character" }
    ]
  }
}
```

**Acceptance Criteria:**

- [ ] `GET /v1/settings/password-policy` returns current policy
- [ ] `PUT /v1/settings/password-policy` updates policy (admin only, settings permission)
- [ ] Registration with password violating policy returns 400 with all violations listed
- [ ] Password change with weak new password returns 400 with violations
- [ ] Password reset with weak password returns 400 with violations
- [ ] Admin creating user with weak password returns 400 with violations
- [ ] Password meeting all policy requirements is accepted
- [ ] Each violation has a specific, actionable message
- [ ] Multiple violations returned at once (not fail-fast — show all problems)
- [ ] LDAP users exempt from password policy (they don't set local passwords)
- [ ] Default policy (8 chars, numbers, upper, lower, special) applied on fresh install
- [ ] Changing policy does NOT retroactively invalidate existing passwords
- [ ] Policy changes take effect immediately for new password operations

**Test Cases (R4):**

| ID | Test | Password | Policy | Expected |
|----|------|----------|--------|----------|
| T4.1 | Valid password — all rules met | `"SecureP@ss1"` | All enabled, min 8 | 200 |
| T4.2 | Too short | `"Ab1!"` | minCharacterCount: 8 | 400 "must be at least 8 characters" |
| T4.3 | No numbers | `"SecurePass!"` | minNumbers: true | 400 "must contain at least one number" |
| T4.4 | No lowercase | `"SECURE1!"` | minLowerCaseCharacters: true | 400 "must contain at least one lowercase letter" |
| T4.5 | No uppercase | `"secure1!"` | minUpperCaseCharacters: true | 400 "must contain at least one uppercase letter" |
| T4.6 | No special chars | `"SecurePass1"` | minSpecialCharacters: true | 400 "must contain at least one special character" |
| T4.7 | Multiple violations | `"abc"` | All enabled, min 8 | 400 with 3+ violation messages |
| T4.8 | Policy disabled (all false) | `"a"` | min 1, all booleans false | 200 (only length enforced) |
| T4.9 | Register with weak password | `POST /v1/auth/register { password: "123" }` | Default policy | 400 with violations |
| T4.10 | Change password with weak new password | `PUT /v1/auth/change-password { newPassword: "weak" }` | Default policy | 400 with violations |
| T4.11 | Reset password with weak password | `POST /v1/auth/reset-password { newPassword: "weak" }` | Default policy | 400 with violations |
| T4.12 | Admin create user with weak password | `POST /v1/settings/users { password: "weak" }` | Default policy | 400 with violations |
| T4.13 | LDAP user — no policy check | LDAP user created during sync | No passwordHash, no policy check needed |
| T4.14 | Policy update takes effect immediately | Update policy to min 12, then register with 10-char password | 400 with "must be at least 12 characters" |
| T4.15 | Get current policy | `GET /v1/settings/password-policy` | Returns current policy object |
| T4.16 | Update policy | `PUT /v1/settings/password-policy { minCharacterCount: 12 }` | 200, policy updated |
| T4.17 | Policy validation — invalid minCharacterCount | `PUT { minCharacterCount: 0 }` | 400 Zod error (min 1) |
| T4.18 | Policy validation — minCharacterCount too high | `PUT { minCharacterCount: 200 }` | 400 Zod error (max 128) |

---

### R5: OpenLDAP Test Container (P0 — Must Have)

Add an OpenLDAP container to `docker-compose.yml` with pre-seeded users and groups for local development and testing.

**Docker Compose Addition:**

```yaml
# OpenLDAP - Directory service for LDAP testing
openldap:
  image: osixia/openldap:1.5.0
  container_name: patchiq_openldap
  environment:
    LDAP_ORGANISATION: "Corp Example"
    LDAP_DOMAIN: "corp.example.com"
    LDAP_BASE_DN: "dc=corp,dc=example,dc=com"
    LDAP_ADMIN_PASSWORD: "admin-ldap-password"
    LDAP_CONFIG_PASSWORD: "config-password"
    LDAP_READONLY_USER: "true"
    LDAP_READONLY_USER_USERNAME: "readonly"
    LDAP_READONLY_USER_PASSWORD: "readonly-password"
    LDAP_TLS: "false"
  ports:
    - "${LDAP_PORT:-3389}:389"
    - "${LDAPS_PORT:-6360}:636"
  volumes:
    - ldap_data:/var/lib/ldap
    - ldap_config:/etc/ldap/slapd.d
    - ./docker/openldap/seed:/container/service/slapd/assets/config/bootstrap/ldif/custom:ro
  command: "--copy-service"
  healthcheck:
    test: ["CMD", "ldapsearch", "-x", "-H", "ldap://localhost", "-b", "dc=corp,dc=example,dc=com", "-D", "cn=admin,dc=corp,dc=example,dc=com", "-w", "admin-ldap-password", "(objectClass=organization)"]
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - patchiq_network
```

**Seed Data (LDIF Files):**

Location: `docker/openldap/seed/`

**Organizational Units:**

```ldif
# 01-ous.ldif
dn: ou=People,dc=corp,dc=example,dc=com
objectClass: organizationalUnit
ou: People

dn: ou=Groups,dc=corp,dc=example,dc=com
objectClass: organizationalUnit
ou: Groups

dn: ou=Service Accounts,dc=corp,dc=example,dc=com
objectClass: organizationalUnit
ou: Service Accounts
```

**Users (20 test users):**

```ldif
# 02-users.ldif

# IT Administrator
dn: cn=john.admin,ou=People,dc=corp,dc=example,dc=com
objectClass: inetOrgPerson
cn: John Admin
sn: Admin
givenName: John
mail: john.admin@corp.example.com
uid: john.admin
userPassword: LdapPass123!

# Patch Manager
dn: cn=jane.patches,ou=People,dc=corp,dc=example,dc=com
objectClass: inetOrgPerson
cn: Jane Patches
sn: Patches
givenName: Jane
mail: jane.patches@corp.example.com
uid: jane.patches
userPassword: LdapPass123!

# Security Analyst
dn: cn=bob.security,ou=People,dc=corp,dc=example,dc=com
objectClass: inetOrgPerson
cn: Bob Security
sn: Security
givenName: Bob
mail: bob.security@corp.example.com
uid: bob.security
userPassword: LdapPass123!

# Regular user (no special group)
dn: cn=alice.user,ou=People,dc=corp,dc=example,dc=com
objectClass: inetOrgPerson
cn: Alice User
sn: User
givenName: Alice
mail: alice.user@corp.example.com
uid: alice.user
userPassword: LdapPass123!

# ... (16 more users across different groups — see full list below)
```

**Full Test User Matrix (20 users):**

| # | CN | Email | Groups | Expected Role |
|---|-----|-------|--------|---------------|
| 1 | john.admin | john.admin@corp.example.com | IT-Admins | admin |
| 2 | sarah.admin | sarah.admin@corp.example.com | IT-Admins | admin |
| 3 | jane.patches | jane.patches@corp.example.com | Patch-Managers | custom: patch-manager |
| 4 | tom.patches | tom.patches@corp.example.com | Patch-Managers | custom: patch-manager |
| 5 | bob.security | bob.security@corp.example.com | Security-Team | custom: security-viewer |
| 6 | eve.security | eve.security@corp.example.com | Security-Team | custom: security-viewer |
| 7 | alice.user | alice.user@corp.example.com | IT-Users | user (default) |
| 8 | charlie.user | charlie.user@corp.example.com | IT-Users | user (default) |
| 9 | diana.user | diana.user@corp.example.com | IT-Users | user (default) |
| 10 | frank.user | frank.user@corp.example.com | IT-Users | user (default) |
| 11 | grace.user | grace.user@corp.example.com | IT-Users | user (default) |
| 12 | hank.multi | hank.multi@corp.example.com | IT-Admins + Patch-Managers | admin (higher priority) |
| 13 | iris.multi | iris.multi@corp.example.com | Patch-Managers + Security-Team | patch-manager (higher priority) |
| 14 | jack.nogroup | jack.nogroup@corp.example.com | (none) | user (default — no group mapping) |
| 15 | kate.disabled | kate.disabled@corp.example.com | IT-Users | user (used for deactivation test) |
| 16 | leo.noemail | (no mail attribute) | IT-Users | (skipped during sync — no email) |
| 17 | mike.special | mike.special+tag@corp.example.com | IT-Users | user (special chars in email) |
| 18 | nina.unicode | nina.unicode@corp.example.com | IT-Users | user (cn has Unicode: "Nina Ünïcödë") |
| 19 | oscar.longdn | oscar.longdn@corp.example.com | IT-Users | user (deeply nested OU for long DN test) |
| 20 | pam.svc | pam.svc@corp.example.com | Service Accounts | (separate OU — should not be synced if userSearchBase is "ou=People") |

**Groups (5 groups):**

```ldif
# 03-groups.ldif

dn: cn=IT-Admins,ou=Groups,dc=corp,dc=example,dc=com
objectClass: groupOfNames
cn: IT-Admins
member: cn=john.admin,ou=People,dc=corp,dc=example,dc=com
member: cn=sarah.admin,ou=People,dc=corp,dc=example,dc=com
member: cn=hank.multi,ou=People,dc=corp,dc=example,dc=com

dn: cn=Patch-Managers,ou=Groups,dc=corp,dc=example,dc=com
objectClass: groupOfNames
cn: Patch-Managers
member: cn=jane.patches,ou=People,dc=corp,dc=example,dc=com
member: cn=tom.patches,ou=People,dc=corp,dc=example,dc=com
member: cn=hank.multi,ou=People,dc=corp,dc=example,dc=com
member: cn=iris.multi,ou=People,dc=corp,dc=example,dc=com

dn: cn=Security-Team,ou=Groups,dc=corp,dc=example,dc=com
objectClass: groupOfNames
cn: Security-Team
member: cn=bob.security,ou=People,dc=corp,dc=example,dc=com
member: cn=eve.security,ou=People,dc=corp,dc=example,dc=com
member: cn=iris.multi,ou=People,dc=corp,dc=example,dc=com

dn: cn=IT-Users,ou=Groups,dc=corp,dc=example,dc=com
objectClass: groupOfNames
cn: IT-Users
member: cn=alice.user,ou=People,dc=corp,dc=example,dc=com
member: cn=charlie.user,ou=People,dc=corp,dc=example,dc=com
member: cn=diana.user,ou=People,dc=corp,dc=example,dc=com
member: cn=frank.user,ou=People,dc=corp,dc=example,dc=com
member: cn=grace.user,ou=People,dc=corp,dc=example,dc=com
member: cn=kate.disabled,ou=People,dc=corp,dc=example,dc=com
member: cn=mike.special,ou=People,dc=corp,dc=example,dc=com
member: cn=nina.unicode,ou=People,dc=corp,dc=example,dc=com
member: cn=oscar.longdn,ou=People,dc=corp,dc=example,dc=com

dn: cn=Service-Accounts,ou=Groups,dc=corp,dc=example,dc=com
objectClass: groupOfNames
cn: Service-Accounts
member: cn=pam.svc,ou=People,dc=corp,dc=example,dc=com
```

**Default LdapConfig for Test:**

The seed script should create a default LdapConfig pointing to the OpenLDAP container:

```json
{
  "name": "Dev OpenLDAP",
  "host": "openldap",           // Docker service name (or "localhost" for host-network)
  "port": 389,
  "baseDn": "dc=corp,dc=example,dc=com",
  "bindDn": "cn=admin,dc=corp,dc=example,dc=com",
  "bindPassword": "admin-ldap-password",
  "userSearchBase": "ou=People,dc=corp,dc=example,dc=com",
  "groupSearchBase": "ou=Groups,dc=corp,dc=example,dc=com",
  "userFilter": "(objectClass=inetOrgPerson)",
  "groupFilter": "(objectClass=groupOfNames)",
  "emailAttribute": "mail",
  "nameAttribute": "cn",
  "usernameAttribute": "uid",
  "groupMemberAttribute": "member",
  "isActive": true,
  "syncEnabled": false
}
```

**Environment Variables:**

```
LDAP_HOST=openldap           # Docker: service name. Host dev: localhost
LDAP_PORT=389                # Internal port
LDAP_EXTERNAL_PORT=3389      # Host-mapped port for external access
LDAP_ADMIN_DN=cn=admin,dc=corp,dc=example,dc=com
LDAP_ADMIN_PASSWORD=admin-ldap-password
LDAP_BASE_DN=dc=corp,dc=example,dc=com
```

**Acceptance Criteria:**

- [ ] `docker compose up openldap` starts OpenLDAP with seeded data
- [ ] OpenLDAP healthcheck passes within 30 seconds
- [ ] 20 test users are present in LDAP (19 in `ou=People`, 1 in `ou=Service Accounts`)
- [ ] 5 groups are present in LDAP with correct member assignments
- [ ] LDAP bind as admin succeeds: `ldapsearch -x -H ldap://localhost:3389 -b "dc=corp,dc=example,dc=com" -D "cn=admin,dc=corp,dc=example,dc=com" -w "admin-ldap-password"`
- [ ] LDAP bind as test user succeeds: password `LdapPass123!`
- [ ] Backend can connect to OpenLDAP container via Docker network (host: `openldap`, port: 389)
- [ ] Seed script creates default LdapConfig pointing to OpenLDAP container
- [ ] `docker compose down -v` cleanly removes LDAP volumes
- [ ] OpenLDAP container adds < 100MB to Docker image size

**Test Cases (R5):**

| ID | Test | Action | Expected |
|----|------|--------|----------|
| T5.1 | Container starts | `docker compose up openldap` | Container healthy, port 3389 accessible |
| T5.2 | Admin bind | `ldapsearch -x -H ldap://localhost:3389 -D "cn=admin,..." -w "admin-ldap-password"` | Returns base DN entry |
| T5.3 | User search | Search for all `inetOrgPerson` entries | Returns 20 users |
| T5.4 | Group search | Search for all `groupOfNames` entries | Returns 5 groups |
| T5.5 | User bind | Bind as `cn=john.admin,...` with `LdapPass123!` | Bind succeeds |
| T5.6 | User bind — wrong password | Bind as `cn=john.admin,...` with `wrong` | Bind fails (error 49: invalid credentials) |
| T5.7 | Group membership | Search `memberOf` for `john.admin` | Contains `cn=IT-Admins,...` |
| T5.8 | Backend test connection | `POST /v1/settings/ldap-configs/:id/test` | Success response with user count |
| T5.9 | Volume persistence | Stop and start container | Data persists |
| T5.10 | Clean reset | `docker compose down -v && docker compose up openldap` | Fresh data from seed LDIFs |

---

### R6: Validation Script (P0 — Must Have)

Create an end-to-end validation script that proves the entire LDAP pipeline works against the real OpenLDAP container. The script tests authentication, sync, group mapping, password policy, and edge cases.

**Location**: `backend/scripts/validate-ldap.ts`

**Prerequisites:**

- Backend running (`make dev-backend` or `make dev`)
- OpenLDAP container running (`docker compose up openldap`)
- Database seeded (`make db-seed`)

**Script Flow:**

```
1. Preflight:
   a. Verify backend is reachable (health check)
   b. Verify OpenLDAP is reachable (LDAP bind test)
2. Setup:
   a. Login as admin
   b. Create/verify LdapConfig pointing to OpenLDAP
   c. Create test PatchIQ roles (ldap-test-patch-manager, ldap-test-security-viewer)
   d. Create group mappings (IT-Admins → admin, Patch-Managers → ldap-test-patch-manager, Security-Team → ldap-test-security-viewer)
3. Phase 1 — LDAP Authentication (V1-V12):
   Test login with various LDAP users, verify auto-provisioning, role assignment, error cases
4. Phase 2 — LDAP Sync (V13-V22):
   Trigger sync, verify user creation, role updates, deactivation, idempotency
5. Phase 3 — Group Mapping (V23-V28):
   Verify group discovery, CRUD, priority resolution
6. Phase 4 — Password Policy (V29-V36):
   Test policy enforcement on registration, change, reset
7. Phase 5 — Edge Cases (V37-V43):
   Mixed auth, LDAP down, concurrent operations
8. Cleanup:
   Delete test users, roles, group mappings
9. Report:
   Print pass/fail summary
```

**Validation Scenarios (43 total):**

| # | Phase | Scenario | Action | Expected |
|---|-------|----------|--------|----------|
| **Phase 1: LDAP Authentication** | | | | |
| V1 | Auth | LDAP login — IT admin | Login as `john.admin@corp.example.com` with `LdapPass123!` | 200, user created with admin role |
| V2 | Auth | LDAP login — role from group mapping | Login as `jane.patches@corp.example.com` | 200, user gets patch-manager role |
| V3 | Auth | LDAP login — wrong password | Login as `john.admin@corp.example.com` with `wrong-password` | 401 "Invalid email or password" |
| V4 | Auth | LDAP login — non-existent LDAP user | Login as `fake@corp.example.com` | 401 "Invalid email or password" |
| V5 | Auth | LDAP login — auto-provision first time | Login as `alice.user@corp.example.com` (not in PatchIQ DB yet) | 200, user created in DB with authSource=LDAP |
| V6 | Auth | LDAP login — subsequent login (no re-provision) | Login as `alice.user@corp.example.com` again | 200, no duplicate user, same user ID |
| V7 | Auth | LDAP login — JWT has correct fields | Decode JWT from LDAP login | Has userId, email, role, roleId |
| V8 | Auth | LDAP login — roleInfo in response | Check login response body | `user.roleInfo.permissions` is populated |
| V9 | Auth | LDAP login — multi-group user (priority) | Login as `hank.multi@corp.example.com` (in IT-Admins + Patch-Managers) | Gets admin role (higher priority mapping) |
| V10 | Auth | LDAP login — no mapped group | Login as `jack.nogroup@corp.example.com` (no group) | Gets default "user" role |
| V11 | Auth | LDAP login — disabled PatchIQ user | Deactivate `john.admin` in PatchIQ, then try LDAP login | 403 "Account is disabled" |
| V12 | Auth | LDAP user cannot change password locally | LDAP user calls `PUT /v1/auth/change-password` | 400 "LDAP users must change their password in the directory service" |
| **Phase 2: LDAP Sync** | | | | |
| V13 | Sync | Trigger on-demand sync | `POST /v1/settings/ldap-configs/:id/sync` | 202 Accepted, job ID returned |
| V14 | Sync | Sync imports all LDAP users | After sync, check user count | 19 users found (20 in LDAP, 1 without email skipped) |
| V15 | Sync | Sync assigns correct roles | After sync, check user roles | IT-Admins members have admin role, Patch-Managers have patch-manager, etc. |
| V16 | Sync | Sync does not overwrite local admin | After sync, check `admin@patchiq.io` | Still authSource=LOCAL, unchanged |
| V17 | Sync | Sync — user without email skipped | Check for user `leo.noemail` | Not created in PatchIQ, warning in syncLog |
| V18 | Sync | Sync job status is COMPLETED | `GET /sync-jobs/:jobId` | status=COMPLETED, usersFound=19 |
| V19 | Sync | Sync job has syncLog | `GET /sync-jobs/:jobId` | syncLog has entries for each user action |
| V20 | Sync | Sync is idempotent | Run sync twice | Second sync: usersCreated=0, usersUpdated=19 (or however many) |
| V21 | Sync | Sync deactivation | Remove a test user from LDAP (simulate by changing ldapDn), run sync | User deactivated in PatchIQ |
| V22 | Sync | Sync job list | `GET /ldap-configs/:id/sync-jobs` | Returns list of jobs, latest first |
| **Phase 3: Group Mapping** | | | | |
| V23 | Groups | Discover LDAP groups | `POST /ldap-configs/:id/discover-groups` | Returns 5 groups with member counts |
| V24 | Groups | Create group mapping | `POST /group-mappings { ldapGroupDn: ..., roleId: ... }` | 201 Created |
| V25 | Groups | List group mappings | `GET /group-mappings` | Returns all mappings |
| V26 | Groups | Update group mapping priority | `PUT /group-mappings/:id { priority: 200 }` | 200, priority updated |
| V27 | Groups | Delete group mapping | `DELETE /group-mappings/:id` | 200, mapping removed |
| V28 | Groups | Duplicate mapping rejected | Create same mapping twice | 409 |
| **Phase 4: Password Policy** | | | | |
| V29 | Policy | Get default policy | `GET /v1/settings/password-policy` | Returns policy with all fields |
| V30 | Policy | Register with weak password | `POST /v1/auth/register { password: "abc" }` | 400 with violation messages |
| V31 | Policy | Register with strong password | `POST /v1/auth/register { password: "SecureP@ss1" }` | 200/201 |
| V32 | Policy | Change password — weak new password | `PUT /v1/auth/change-password { newPassword: "123" }` | 400 with violations |
| V33 | Policy | Change password — strong new password | `PUT /v1/auth/change-password { newPassword: "NewSecureP@ss2" }` | 200 |
| V34 | Policy | Update policy to stricter | `PUT /v1/settings/password-policy { minCharacterCount: 16 }` | 200 |
| V35 | Policy | Register fails with stricter policy | `POST /v1/auth/register { password: "ShortP@1" }` (8 chars, policy requires 16) | 400 "must be at least 16 characters" |
| V36 | Policy | LDAP user exempt from policy | LDAP user created without local password | No policy violation |
| **Phase 5: Edge Cases** | | | | |
| V37 | Edge | Local login still works | Login as `admin@patchiq.io` with `admin123` | 200, authSource=LOCAL |
| V38 | Edge | LDAP and local coexist | Login as local admin, then as LDAP user, in sequence | Both succeed |
| V39 | Edge | LDAP user RBAC enforced | LDAP user with "user" role tries `GET /v1/settings/roles` | 403 (RBAC works for LDAP users too) |
| V40 | Edge | LDAP user with admin role — full access | LDAP user `john.admin` (admin role) tries `GET /v1/settings/roles` | 200 |
| V41 | Edge | LdapConfig connection test | `POST /v1/settings/ldap-configs/:id/test` | Success with user count |
| V42 | Edge | LdapConfig — invalid host test | Create config with host `nonexistent.invalid`, test it | Failure message: "Connection refused" or "Host not found" |
| V43 | Edge | LDAP login — special characters in email | Login as `mike.special+tag@corp.example.com` | 200, email handled correctly |

**Script Output Format (matching validate-rbac.ts pattern):**

```
LDAP & Directory Services Validation Script
==================================
Backend is reachable.
OpenLDAP is reachable (20 users found).
Admin login successful.

Setting up test data...
  Created role: ldap-test-patch-manager (uuid)
  Created role: ldap-test-security-viewer (uuid)
  Created LdapConfig: Dev OpenLDAP (uuid)
  Created group mapping: IT-Admins → admin (uuid)
  Created group mapping: Patch-Managers → ldap-test-patch-manager (uuid)
  Created group mapping: Security-Team → ldap-test-security-viewer (uuid)

Phase 1: LDAP Authentication
  [PASS] V1: LDAP login — IT admin -- 200
  [PASS] V2: LDAP login — role from group mapping -- 200
  ...

Phase 2: LDAP Sync
  [PASS] V13: Trigger on-demand sync -- 202
  ...

Phase 3: Group Mapping
  [PASS] V23: Discover LDAP groups -- 200 (5 groups)
  ...

Phase 4: Password Policy
  [PASS] V29: Get default policy -- 200
  ...

Phase 5: Edge Cases
  [PASS] V37: Local login still works -- 200
  ...

Cleaning up...
  Deleted 19 LDAP test users
  Deleted 2 test roles
  Deleted 3 group mappings

==================================
Results: 43/43 PASS, 0 FAIL

All 43 LDAP scenarios validated successfully!
```

**Acceptance Criteria:**

- [ ] Script runs with: `DATABASE_URL="..." npx tsx backend/scripts/validate-ldap.ts`
- [ ] All 43 validation scenarios pass against real OpenLDAP
- [ ] Script creates and cleans up its own test data — no residue after clean run
- [ ] Script uses real HTTP requests to `http://localhost:3000` (not service-layer calls)
- [ ] Each scenario has a named, descriptive label in the output
- [ ] Failed scenarios show expected vs actual
- [ ] Script exits with code 0 on all-pass, code 1 on any failure
- [ ] Script prints summary: `43/43 PASS` or `41/43 PASS, 2 FAIL`
- [ ] Script handles backend not running: prints clear error and exits 1
- [ ] Script handles OpenLDAP not running: prints clear error and exits 1
- [ ] Test data uses unique prefix (`ldap-test-*`) to avoid collisions
- [ ] Cleanup runs even if assertions fail (try/finally)
- [ ] Script completes in under 60 seconds

**Test Cases (R6):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T6.1 | Full script pass | Run against properly configured system | 43/43 PASS, exit 0 |
| T6.2 | Script idempotency | Run script twice | Both runs pass, no leftover data |
| T6.3 | Backend not running | Stop backend, run script | Clear error message, exit 1 |
| T6.4 | OpenLDAP not running | Stop OpenLDAP, run script | Clear error message, exit 1 |
| T6.5 | Cleanup on failure | Script fails mid-run | Test data still cleaned up |
| T6.6 | No data residue | Run script, check DB | No `ldap-test-*` roles or LDAP test users remain |

---

### Nice-to-Have (P1)

**R7: LDAP User Search Endpoint**

```
POST /v1/settings/ldap-configs/:id/search-users { filter?: string, limit?: number }
```

Search for users in the LDAP directory without importing them. Useful for admin preview before triggering a full sync.

**R8: LDAP Sync Dry-Run**

```
POST /v1/settings/ldap-configs/:id/sync?dryRun=true
```

Shows what would happen during sync without actually making changes. Returns a preview of users that would be created, updated, or deactivated.

**R9: LDAP User Attribute Mapping**

Allow admins to configure which LDAP attributes map to which PatchIQ user fields beyond the defaults:

```json
{
  "attributeMappings": {
    "firstName": "givenName",
    "lastName": "sn",
    "contactNumber": "telephoneNumber",
    "department": "departmentNumber"
  }
}
```

### Future Considerations (P2)

**R10: LDAP Referral Support**

Multi-domain Active Directory environments with referrals between domain controllers.

**R11: LDAP over StartTLS / LDAPS**

Full TLS support with certificate validation, custom CA certificates, and STARTTLS upgrade.

**R12: Real-Time LDAP Sync (Persistent Search / SyncRepl)**

Replace polling with real-time change notification from the LDAP server.

**R13: SAML 2.0 / OIDC Integration**

Build on the LDAP foundation to add federated SSO. The `authSource` field in the User model supports future values like `"SAML"`, `"OIDC"`.

---

## 6. Success Metrics

| Metric | Target | Measurement | When |
|--------|--------|-------------|------|
| **LDAP login works** | Login with LDAP creds returns valid JWT | Validation script V1 passes | After R1 |
| **Auto-provisioning** | First-time LDAP user created in DB | Validation script V5 passes | After R1 |
| **Sync imports users** | 19/20 LDAP users imported (1 has no email) | Validation script V14 passes | After R2 |
| **Sync deactivates removed users** | Users not in LDAP are deactivated | Validation script V21 passes | After R2 |
| **Group mapping resolves roles** | Users get correct role from LDAP group membership | Validation script V15 passes | After R3 |
| **Priority resolution** | Multi-group user gets highest priority mapping | Validation script V9 passes | After R3 |
| **Password policy enforced** | Weak passwords rejected with specific violations | Validation script V30 passes | After R4 |
| **OpenLDAP container works** | 20 users, 5 groups, bind succeeds | Container healthcheck passes | After R5 |
| **Full validation** | 43/43 scenarios pass | Validation script final report | After R6 |
| **RBAC works for LDAP users** | LDAP user with "user" role denied settings | Validation script V39 passes | After R1 + R3 |
| **Local auth unaffected** | Local admin login still works after LDAP integration | Validation script V37 passes | After R1 |
| **No security bypass** | LDAP user cannot use local password auth | Validation script V12 passes | After R1 |
| **Zero data loss** | Sync does not overwrite local users | Validation script V16 passes | After R2 |
| **Type safety** | Zero `as any` in LDAP-related code | Grep for `as any` in new files | After all R's |

---

## 7. Open Questions

| # | Question | Owner | Blocking? | Recommendation |
|---|----------|-------|-----------|----------------|
| Q1 | Should LDAP login accept `uid` (e.g., `john.admin`) as well as email, or email only? | Engineering | Yes — before R1 | **Email only for v1.** The `email` field is PatchIQ's primary identifier. Users can be looked up in LDAP by any configured attribute (`usernameAttribute`), but the login API always accepts email. This is simpler and matches the existing auth flow. |
| Q2 | What happens when a user exists locally (authSource=LOCAL) and an admin enables LDAP that contains a user with the same email? | Engineering | Yes — before R1 + R2 | **Local user takes precedence.** The LDAP sync skips local users. If the admin wants to convert, they must manually change `authSource` to `LDAP` or delete+recreate the user. |
| Q3 | Should the OpenLDAP container be included in the default `docker compose up` or only started on demand? | Engineering | No | **Include in `docker compose up` by default** with a profile or optional flag. The image is small (~50MB) and having it always available improves developer experience. Use `profiles: ["ldap"]` in docker-compose if size is a concern. |
| Q4 | Should password policy be retrieved from DB on every password operation, or cached? | Engineering | No | **Retrieve from DB each time.** Password operations are infrequent (not hot path). Caching adds complexity for negligible benefit. |
| Q5 | How should scheduled LDAP sync interact with server restart? Should repeatable jobs be re-registered on startup? | Engineering | No | **Yes, re-register on startup.** On backend boot, scan all active LdapConfigs with `syncEnabled=true` and register their BullMQ repeatable jobs. This is the standard BullMQ pattern. |
| Q6 | Should the `ldapts` library be replaced with a more actively maintained library? | Engineering | No | **Keep `ldapts` for v1.** It's already integrated, well-typed, and supports all needed operations (bind, search, paged results). Evaluate alternatives in a future pipeline if issues arise. |
| Q7 | Should the encrypted bind credentials (`bindDnEnc`, `bindPasswordEnc`) be decrypted at runtime or should we store them encrypted and decrypt only when connecting? | Engineering | No | **Decrypt only when connecting.** Store encrypted in DB (existing `encrypt`/`decrypt` utils), decrypt in `ldap.service.ts` just before bind. Never expose decrypted credentials in API responses. |
| Q8 | Should LDAP sync run in the same process as the API or in a separate worker? | Engineering | No | **Same process via BullMQ worker for v1.** Sync is not CPU-intensive (mostly I/O). Separating into a dedicated worker process adds operational complexity for minimal benefit at current scale. |

---

## 8. Timeline Considerations

**Dependencies:**

- Pipeline 2A (RBAC) must be complete — **DONE** (2026-02-13)
- OpenLDAP container must be ready before R1 can be validated → R5 should be done first or in parallel with R1
- `ldapts` npm package is already installed

**Suggested Implementation Order:**

```
R5 (OpenLDAP Container)     ← Must be first or parallel — provides test infrastructure
    ↓
R1 (LDAP Auth Flow)         ← Core feature — depends on R5 for testing
    ↓
R3 (Group → Role Mapping)   ← Can start in parallel with R1 (schema + CRUD separate from auth logic)
    ↓
R2 (User Sync)              ← Depends on R1 (auth flow) + R3 (group mapping) for role resolution
    ↓
R4 (Password Policy)        ← Independent — can run in parallel with R2
    ↓
R6 (Validation Script)      ← Must be last — validates everything
```

**Parallelizable Work:**

- R5 (Docker) + R1 (Auth) schema changes can start simultaneously
- R3 (Group Mapping CRUD) is independent of R1 auth logic — different routes and models
- R4 (Password Policy) has zero dependencies on LDAP — pure utility work, can be done in parallel with anything
- R6 validation script writing can start once R1 is mostly done (individual test functions can be written speculatively)

**Risk Factors:**

- R1 is the riskiest change — modifying the auth flow affects every user. Must preserve backward compatibility with local auth.
- R5 (OpenLDAP container) may require debugging LDIF seed data syntax — LDIF is whitespace-sensitive.
- BullMQ scheduled sync (R2) requires careful startup/shutdown lifecycle management to avoid orphaned jobs.
- The `ldapts` library may have quirks with certain LDAP server responses — test with real OpenLDAP, not mocks.

---

## Appendix A: Schema Changes Summary

### New Fields on Existing Models

**User model:**

```prisma
authSource    String      @default("LOCAL") @map("auth_source")     // "LOCAL" | "LDAP"
ldapDn        String?     @map("ldap_dn")
ldapConfigId  String?     @map("ldap_config_id")
ldapConfig    LdapConfig? @relation(fields: [ldapConfigId], references: [id], onDelete: SetNull)
```

**LdapConfig model:**

```prisma
userSearchBase       String?  @map("user_search_base")
groupSearchBase      String?  @map("group_search_base")
groupFilter          String?  @map("group_filter")
emailAttribute       String   @default("mail") @map("email_attribute")
nameAttribute        String   @default("cn") @map("name_attribute")
usernameAttribute    String   @default("uid") @map("username_attribute")
groupMemberAttribute String   @default("member") @map("group_member_attribute")
syncEnabled          Boolean  @default(false) @map("sync_enabled")
syncInterval         Int      @default(360) @map("sync_interval")
lastSyncAt           DateTime? @map("last_sync_at")
lastSyncStatus       String?   @map("last_sync_status")
users                User[]
groupMappings        LdapGroupMapping[]
syncJobs             LdapSyncJob[]
```

**Role model:**

```prisma
groupMappings LdapGroupMapping[]
```

### New Models

- `LdapGroupMapping` — Maps LDAP group DNs to PatchIQ roles
- `LdapSyncJob` — Tracks sync job history and results

### Migration Strategy

1. Add nullable `authSource`, `ldapDn`, `ldapConfigId` columns to `users` table
2. Backfill: Set `authSource = 'LOCAL'` for all existing users
3. Make `authSource` non-nullable with default `'LOCAL'`
4. Add new columns to `ldap_configs` table (all nullable or with defaults)
5. Create `ldap_group_mappings` table
6. Create `ldap_sync_jobs` table
7. Add FK constraints

---

## Appendix B: Files to Create / Modify

| File | Changes | Risk |
|------|---------|------|
| `backend/src/db/prisma/schema.prisma` | Add User fields (authSource, ldapDn, ldapConfigId), LdapConfig fields, new models | High — schema change |
| `backend/src/db/prisma/migrations/XXXX_ldap_auth/` | New migration with schema changes | High — data migration |
| `backend/src/db/prisma/seed.ts` | Add default LdapConfig, group mappings (for dev environment only) | Medium |
| `backend/src/modules/auth/auth.service.ts` | Add LDAP auth path, block password change for LDAP users | High — core security |
| `backend/src/modules/auth/auth.types.ts` | Add authType to login input, authSource to user types | Low |
| `backend/src/shared/services/ldap.service.ts` | Add authenticateUser(), searchGroups(), getUserGroups(), sync logic | High — core LDAP |
| `backend/src/shared/utils/password-policy.ts` | **NEW FILE**: validatePassword() function | Medium |
| `backend/src/modules/settings/settings.service.ts` | Add sync, group mapping CRUD, password policy enforcement | Medium |
| `backend/src/modules/settings/settings.controller.ts` | Add sync, group mapping, discover-groups, password policy endpoints | Medium |
| `backend/src/modules/settings/settings.routes.ts` | Add sync, group mapping, password policy routes | Low |
| `backend/src/modules/settings/settings.validators.ts` | Add sync, group mapping Zod schemas, update LdapConfig schema | Medium |
| `backend/src/modules/settings/ldap-sync.worker.ts` | **NEW FILE**: BullMQ worker for scheduled sync | Medium |
| `docker-compose.yml` | Add openldap service | Low |
| `docker/openldap/seed/01-ous.ldif` | **NEW FILE**: OU structure | Low |
| `docker/openldap/seed/02-users.ldif` | **NEW FILE**: 20 test users | Low |
| `docker/openldap/seed/03-groups.ldif` | **NEW FILE**: 5 groups | Low |
| `.env.example` | Add LDAP environment variables | Low |
| `backend/scripts/validate-ldap.ts` | **NEW FILE**: Validation script (43 scenarios) | Medium |
| `shared/types/api.ts` | Add LDAP-related types if needed | Low |
| `backend/src/shared/types/api.types.ts` | Add LDAP-related types | Low |

**Total files**: ~20 (6 new, ~14 modified)

---

## Appendix C: Complete Test Case Summary

| Requirement | Test Cases | Categories |
|-------------|-----------|------------|
| R1: LDAP Auth Flow | T1.1–T1.20 (20 tests) | Login, auto-provision, role mapping, password blocking, failover, migration |
| R2: LDAP User Sync | T2.1–T2.15 (15 tests) | Import, update, deactivate, reactivate, conflict, idempotency, jobs |
| R3: Group → Role Mapping | T3.1–T3.14 (14 tests) | CRUD, discovery, priority, cascade, validation |
| R4: Password Policy | T4.1–T4.18 (18 tests) | All rules, multiple violations, enforcement points, policy updates |
| R5: OpenLDAP Container | T5.1–T5.10 (10 tests) | Container, bind, search, persistence, reset |
| R6: Validation Script | T6.1–T6.6 (6 tests) | Execution, idempotency, error handling, cleanup |
| **TOTAL** | **83 test cases** | |

| Validation Script | V1–V43 (43 scenarios) | Auth, sync, groups, password policy, edge cases |

---

## Appendix D: LDAP Authentication Flowchart

```
POST /v1/auth/login { email, password, authType? }
                    ↓
            ┌───────────────────┐
            │ Find user by email │
            └──────┬────────────┘
                   ↓
      ┌────────────┴─────────────┐
      │   Determine auth path     │
      ├───────────────────────────┤
      │ authType="ldap"         → │ LDAP path
      │ user.authSource="LDAP"  → │ LDAP path
      │ user.authSource="LOCAL" → │ Local path (existing)
      │ user not found          → │ authType="ldap" ? LDAP : Local (fail)
      └────────────┬─────────────┘
                   ↓ (LDAP path)
      ┌────────────────────────────┐
      │ Find active LdapConfig     │
      │ (isActive=true)            │
      └────────────┬───────────────┘
                   ↓
      ┌────────────────────────────┐
      │ Bind as service account     │
      │ (bindDn + bindPassword)     │
      │ → Fails? 503 "unreachable" │
      └────────────┬───────────────┘
                   ↓
      ┌────────────────────────────┐
      │ Search for user in LDAP     │
      │ filter: (mail=<email>)      │
      │ → Not found? 401            │
      └────────────┬───────────────┘
                   ↓
      ┌────────────────────────────┐
      │ Bind as user                │
      │ (userDn + password)         │
      │ → Fails? 401 "Invalid..."  │
      └────────────┬───────────────┘
                   ↓
      ┌────────────────────────────┐
      │ Extract: email, name,       │
      │          memberOf groups     │
      └────────────┬───────────────┘
                   ↓
      ┌────────────────────────────┐
      │ Resolve role from           │
      │ LdapGroupMappings           │
      │ → Highest priority wins     │
      │ → No match? Default "user"  │
      └────────────┬───────────────┘
                   ↓
      ┌────────────────────────────┐
      │ Find or create local User   │
      │ → Exists? Update name/role  │
      │ → New? Create with          │
      │   authSource=LDAP           │
      │   passwordHash=""           │
      └────────────┬───────────────┘
                   ↓
      ┌────────────────────────────┐
      │ Check isActive              │
      │ → false? 403 "disabled"     │
      └────────────┬───────────────┘
                   ↓
      ┌────────────────────────────┐
      │ Generate JWT + refresh      │
      │ Return LoginResponse        │
      └────────────────────────────┘
```

---

## Appendix E: Default LdapConfig for Development

This LdapConfig is created by the seed script when `MOCK_LDAP` is not set to `true`:

```json
{
  "name": "Dev OpenLDAP",
  "host": "localhost",
  "port": 3389,
  "baseDn": "dc=corp,dc=example,dc=com",
  "bindDnEnc": "<encrypted: cn=admin,dc=corp,dc=example,dc=com>",
  "bindPasswordEnc": "<encrypted: admin-ldap-password>",
  "userSearchBase": "ou=People,dc=corp,dc=example,dc=com",
  "groupSearchBase": "ou=Groups,dc=corp,dc=example,dc=com",
  "userFilter": "(objectClass=inetOrgPerson)",
  "groupFilter": "(objectClass=groupOfNames)",
  "emailAttribute": "mail",
  "nameAttribute": "cn",
  "usernameAttribute": "uid",
  "groupMemberAttribute": "member",
  "isActive": true,
  "syncEnabled": false,
  "syncInterval": 360
}
```

**Group Mappings (seeded for development):**

| LDAP Group DN | PatchIQ Role | Priority |
|---------------|-------------|----------|
| `cn=IT-Admins,ou=Groups,dc=corp,dc=example,dc=com` | admin (system) | 100 |
| `cn=Patch-Managers,ou=Groups,dc=corp,dc=example,dc=com` | patch-manager (custom, seeded) | 80 |
| `cn=Security-Team,ou=Groups,dc=corp,dc=example,dc=com` | security-viewer (custom, seeded) | 60 |
| `cn=IT-Users,ou=Groups,dc=corp,dc=example,dc=com` | user (system) | 40 |
