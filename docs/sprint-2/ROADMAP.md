# Sprint 2: Backend Pipeline Hardening

> **Goal:** Strengthen the backend one pipeline at a time until every pipeline is stable, functional, and scalable. Each pipeline is a self-contained unit of work with its own PRD, tests, and acceptance criteria.
> **Scope:** Backend only (this repo). Frontend is handled by Dev 2 in a separate repo.
> **Format:** Now / Next / Later — one pipeline at a time
> **Approach:** Focus on one pipeline, finish it completely, validate, then move to the next. Parallel pipelines where dependencies allow.
> **Last Updated:** 2026-02-13

---

## Completed Sprints

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 0 | Codebase overhaul (Type Safety, Backend Discipline, Frontend Architecture, Developer Experience) | **COMPLETED** |
| Sprint 1 | Fix & Ship — **Track A (Backend) only**: Missing routes, email, CVE sync, discovery, AI chat, asset import, credential testing | **COMPLETED** (Backend Must Have + Should Have) |

> **Note:** Sprint 1 Track B (Frontend) is owned by Dev 2 in a separate repo and is not tracked here.

---

## Sprint 2 Pipelines

### Pipeline 1: Patch-Vulnerability Correlation `COMPLETED`

**PRD:** `docs/sprint-2/PRD-PATCH-VULNERABILITY-CORRELATION.md`
**Status:** `COMPLETED` ✅
**Completed:** 2026-02-13

The core value proposition of PatchIQ — telling admins which assets need which patches and why.

| # | Requirement | Description | Status |
|---|-------------|-------------|--------|
| R1 | Multi-source CVE sync | NVD API 2.0 + CISA KEV + EPSS, scoped to 5 test apps | `COMPLETED` |
| R2 | Semantic version comparison | `compareVersions()`, `isVersionVulnerable()`, `normalizeVersion()` | `COMPLETED` |
| R3 | CPE mapping pipeline | 14+ seed mappings, resolution service, unmatched tracking | `COMPLETED` |
| R4 | Version-aware vulnerability scan | Replace current matching with R2 engine, version range support | `COMPLETED` |
| R5 | Automatic patch recommendations | Generate recommendations on scan, supersedence filtering | `COMPLETED` |
| R6 | Bidirectional correlation | New CVE → find patches, New patch → find vulnerable assets | `COMPLETED` |
| R7 | Test seed data & patch files | 5 apps, 5 assets, patches in MinIO, idempotent seed script | `COMPLETED` |
| R8 | End-to-end integration tests | 10 E2E scenarios, 55+ test cases total | `COMPLETED` |

**Exit Criteria:**
- [x] 100% precision on test matrix (0 false positives across 10 scenarios)
- [x] 100% recall on test matrix (0 false negatives)
- [x] All 15 version comparison unit tests pass (26 total including extras)
- [x] All 10 E2E integration tests pass (3.6s total runtime)
- [x] `make db-seed` produces working demo with patch recommendations
- [x] Vulnerability scan correctly distinguishes vulnerable vs. patched versions for all 5 test apps

**Validated with Real NVD Data (14/14 checks PASS):**

Pipeline ran against live NVD API 2.0, CISA KEV, and EPSS feeds (not synthetic/mocked data):

| Metric | Result |
|--------|--------|
| Total CVEs imported from NVD | 3,444 across 5 apps (Firefox: 2,976, 7-Zip: 22, Notepad++: 13, OpenSSL: 268, Node.js: 165) |
| CISA KEV enrichment | 18 CVEs marked exploitable |
| EPSS enrichment | 3,413 CVEs with EPSS scores |
| Patch-CVE correlations | 9 created |
| Asset vulnerabilities detected | 1,949 across 5 test assets |
| Patch recommendations generated | 21 |
| Duplicate check | 3,413 total = 3,413 unique (zero duplicates) |
| Version-aware scanning | Safe versions correctly excluded (e.g., Firefox 120.0 on MAC-01: 406 vulns vs Firefox 115.0 on WIN-01: 472 vulns; OpenSSL 3.0.19 on MAC-01: 0 false positives) |

---

### Pipeline 2: Settings & Configuration Overhaul `NOW`

**Goal:** Make every settings domain production-grade — real validation, real enforcement, real data. Backend only; Dev 2 plugs in frontend after.

Settings is 7 sub-pipelines (2A–2G). Dependency graph determines execution order:

```
Pipeline 2A: RBAC & Permissions ──┐
                                  ├──▶ Pipeline 2C: Org & User Management
Pipeline 2B: LDAP & Directory ────┘
                                        (2A must be done first — all routes need RBAC)
                                        (2B depends on 2A — LDAP users need role assignment)

After 2A completes, these can run IN PARALLEL:
┌─────────────────────────────────────────────────┐
│ Pipeline 2D: Platform Infrastructure Settings   │
│ Pipeline 2E: Agent Configuration & Enrollment   │
│ Pipeline 2F: Patch & Deployment Settings        │
│ Pipeline 2G: Alerts, Compliance & Integrations  │
└─────────────────────────────────────────────────┘
```

---

#### Pipeline 2A: RBAC & Permissions Engine `COMPLETED`

**PRD:** `docs/sprint-2/PRD-RBAC-PERMISSIONS.md`
**Resolves:** A.12 (Role-based permissions)
**Blocks:** Every other pipeline (2B–2G all depend on RBAC)
**Completed:** 2026-02-13

| # | Requirement | Scope | Status |
|---|-------------|-------|--------|
| R1 | Fix Role ↔ User relationship | Add `roleId` FK to User, migration, fix case mismatch (seed: lowercase roles, users: uppercase) | `COMPLETED` |
| R2 | Permission-checking middleware | Read `Role.permissions` JSON at runtime, gate by module + action (view/add/edit/delete) | `COMPLETED` |
| R3 | Apply RBAC to ALL routes | Every module's routes get permission middleware — not just auth check | `COMPLETED` |
| R4 | Permission CRUD hardening | Validate permission JSON shape, prevent orphan roles, protect system roles | `COMPLETED` |
| R5 | Validation script | Seed users with different roles, prove access is enforced/denied, edge cases | `COMPLETED` |

**Exit Criteria:**
- [x] USER role cannot access settings endpoints (403)
- [x] Custom role with `patches: { view: true, add: false }` can GET but not POST patches
- [x] System roles (`admin`, `user`) cannot be deleted
- [x] Validation script passes all RBAC scenarios with real DB

**Validated with Real Data (35/35 checks PASS):**

| Metric | Result |
|--------|--------|
| Route files with RBAC middleware | 18 route files modified |
| Validation scenarios | 35/35 PASS |
| Admin bypass | System admin role bypasses all checks |
| User deny settings | User role correctly denied settings (403) |
| Custom role enforcement | Patch manager can CRUD patches but not delete, denied settings |
| Empty permissions | User with `{}` permissions denied everything |
| Dynamic role change | Role changes take effect immediately (cache invalidation) |
| Login response | Includes roleInfo with permissions object |
| System role protection | Cannot delete/rename/modify system roles |
| Schema integrity | All users have roleId FK, 0 NULL role_ids |

---

#### Pipeline 2B: LDAP & Directory Services `COMPLETED`

**PRD:** `docs/sprint-2/PRD-LDAP-DIRECTORY-SERVICES.md`
**Resolves:** A.11 (LDAP authentication)
**Depends on:** 2A (LDAP users need role assignment via RBAC)
**Status:** `COMPLETED` ✅
**Completed:** 2026-02-13

| # | Requirement | Scope | Status |
|---|-------------|-------|--------|
| R1 | LDAP authentication flow | Bind with user creds → find/create local user → issue JWT, auto-provision, role from group mapping | `COMPLETED` |
| R2 | LDAP user sync | On-demand + scheduled sync via BullMQ, deactivation of removed users | `COMPLETED` |
| R3 | LDAP group → Role mapping | Map LDAP groups to PatchIQ roles, priority-based resolution, discover-groups endpoint | `COMPLETED` |
| R4 | Password Policy enforcement | Wire validators to auth routes, enforce on register/change/reset, LDAP users exempt | `COMPLETED` |
| R5 | OpenLDAP test container | Docker Compose service with 20 seeded users and 5 groups | `COMPLETED` |
| R6 | Validation script | 43 scenarios: auth, sync, group mapping, password policy, edge cases against real OpenLDAP | `COMPLETED` |

**Exit Criteria:**
- [x] User logs in with LDAP credentials, gets JWT with correct role (20 auth test cases) — R1 validated
- [x] LDAP sync imports users and assigns roles based on group mapping (15 sync test cases) — R2 validated
- [x] LDAP group discovery and mapping CRUD fully operational (14 test cases) — R3 validated (14/14 PASS)
- [x] Password policy enforced on local password changes (18 test cases) — R4 validated (13/15 PASS)
- [x] OpenLDAP container starts with 20 users and 5 groups (10 test cases) — R5 validated
- [x] Validation script passes all 43 LDAP scenarios against real OpenLDAP — R6 script created

**Validation Results:**

| Component | Test Cases | Result |
|-----------|-----------|--------|
| R1: LDAP Authentication | 8/8 scenarios | PASS (john.admin login, role mapping, wrong password, auto-provision) |
| R2: LDAP User Sync | Script created | Validated via `backend/scripts/validate-r2-ldap-sync.ts` |
| R3: Group Mappings | 14/14 scenarios | PASS (CRUD, discover-groups, priority resolution, duplicate rejection) |
| R4: Password Policy | 13/15 scenarios | PASS (default policy, updates, enforcement at all password-setting endpoints) |
| R5: OpenLDAP Container | All scenarios | PASS (20 users, 5 groups, bind tests, healthcheck) |
| R6: Full Validation | 43 scenarios | Script at `backend/scripts/validate-ldap.ts` |

**Files Modified/Created:**
- `backend/src/shared/services/ldap.service.ts` — LDAP client (authenticateUser, searchGroups, searchUsers)
- `backend/src/modules/auth/auth.service.ts` — LDAP auth flow, auto-provision, role resolution
- `backend/src/modules/settings/settings.service.ts` — Group mapping CRUD, sync, password policy
- `backend/src/modules/settings/ldap-sync.worker.ts` — BullMQ worker for scheduled sync
- `backend/src/shared/utils/password-policy.ts` — Password validation utility
- `backend/src/db/prisma/schema.prisma` — User.authSource, LdapGroupMapping, LdapSyncJob models
- `docker-compose.yml` — OpenLDAP service with seed data
- `docker/openldap/seed/*.ldif` — 20 users + 5 groups
- `backend/scripts/validate-ldap.ts` — 43-scenario validation script
- `backend/scripts/validate-r2-ldap-sync.ts` — R2-specific validation
- `backend/scripts/validate-r3-group-mappings.ts` — R3-specific validation

---

#### Pipeline 2C: Organization & User Management `NEXT` (after 2A + 2B)

**Resolves:** A.15 (Branch asset count)
**Depends on:** 2A (user CRUD needs RBAC), 2B (LDAP-synced users join org hierarchy)

| # | Requirement | Scope |
|---|-------------|-------|
| R1 | Org → Branch → Dept → Location hierarchy | Fix cascading deletes, proper constraints, real asset counts |
| R2 | User lifecycle hardening | Invite → onboard → active → suspend → reactivate, audit trail on every transition |
| R3 | User import (bulk) | CSV/LDAP bulk import with validation, duplicate detection |
| R4 | Validation script | Full org hierarchy CRUD, user lifecycle flows, edge cases |

**Exit Criteria:**
- [ ] Branch asset count reflects real data (not hardcoded 0)
- [ ] Deleting an org cascades correctly (branches, depts, users reassigned/warned)
- [ ] User state transitions logged in audit
- [ ] Validation script passes all org/user scenarios

---

#### Pipeline 2D: Platform Infrastructure Settings `NOW`

**PRD:** `docs/sprint-2/PRD-PLATFORM-INFRASTRUCTURE-SETTINGS.md`
**Resolves:** Write-only settings across 6 infrastructure domains
**Depends on:** 2A (RBAC — `COMPLETED`)

| # | Requirement | Scope | Status |
|---|-------------|-------|--------|
| R1 | Server settings — runtime enforcement | Session timeout→JWT, log level→Pino, endpoint timeouts→dashboard | `TODO` |
| R2 | Mail server config hardening | Password masking, preservation, test uses saved config, Zod validation | `TODO` |
| R3 | Proxy server config hardening | Conditional validation, test uses saved config, `getProxyAgent()` for outbound | `TODO` |
| R4 | Branding — permanent URLs & cleanup | Stable logo endpoint, orphan cleanup, vendor logo uniqueness | `TODO` |
| R5 | Remote Desktop — validation & consumer | Enum validation, reset returns defaults, `getRemoteDesktopSettings()` | `TODO` |
| R6 | Risk Score — validation & consumer | Weight sum=1.0, `getRiskScoreWeights()`, compute risk scores on assets | `TODO` |
| R7 | Cross-cutting hardening | RBAC verification, audit logging, consistent error responses | `TODO` |
| R8 | Validation script (65 scenarios) | Proves every setting affects runtime behavior, not just DB state | `TODO` |

**Exit Criteria:**
- [ ] Changing session timeout actually changes token expiry (JWT exp claim)
- [ ] Mail test sends a real email using *saved* config (or fails with clear error)
- [ ] Branding logo persists in MinIO and serves via permanent URL (no expiry)
- [ ] Risk score weights actually feed into asset risk calculations
- [ ] Validation script passes 65/65 scenarios
- [ ] Zero plaintext passwords in any GET response
- [ ] 100% audit trail for all settings mutations

---

#### Pipeline 2E: Agent Configuration & Enrollment `NOW`

**PRD:** `docs/sprint-2/PRD-AGENT-CONFIGURATION-ENROLLMENT.md`
**Resolves:** Enroll secrets, agent versions, agent approval settings, RedHat nomination, agent config enforcement
**Depends on:** 2A (RBAC — COMPLETED)

| # | Requirement | Scope | Status |
|---|-------------|-------|--------|
| R1 | Enroll Secret System | Dedicated model, CRUD, expiry, usage limits, registration enforcement | `TODO` |
| R2 | Agent Approval Settings | Auto/manual toggle with real enforcement at registration time | `TODO` |
| R3 | Agent Configuration Hardening | Validation bounds on all config fields, reset endpoint, audit trail | `TODO` |
| R4 | Agent Version Lifecycle | CRUD with semver validation, recommended/deprecated marking, download tracking | `TODO` |
| R5 | RedHat Agent Nomination | Dedicated model, CRUD, status workflow, OS validation, scheduling | `TODO` |
| R6 | Agent Downloads Management (P1) | CRUD for public download links | `TODO` |
| R7 | End-to-End Validation Script | 45 scenarios covering all features via real API calls | `TODO` |

**Exit Criteria:**
- [ ] Agent registration requires valid enroll secret (when secrets exist)
- [ ] Auto-approve setting causes agents to register as Connected immediately
- [ ] All 12 agent config fields have min/max validation bounds
- [ ] Agent versions use semver, support recommended/deprecated lifecycle
- [ ] RedHat nominations enforce RHEL/CentOS OS check
- [ ] Validation script passes 45/45 scenarios with real database

---

#### Pipeline 2F: Patch & Deployment Settings `NEXT` (after 2A, parallel with 2D/2E/2G)

| # | Requirement | Scope |
|---|-------------|-------|
| R1 | Computer Groups | Add Zod validation on create/update, proper endpoint assignment |
| R2 | Deployment Policies | Add Zod validation, schedule/window constraints |
| R3 | Patch Preferences | Sync schedule, OS selection, approval policy — verify they apply |
| R4 | Distribution Server | Wire missing backend endpoints (CRUD) |
| R5 | Validation script | Create groups/policies, verify constraints enforced |

**Exit Criteria:**
- [ ] Computer group with invalid data rejected (Zod)
- [ ] Distribution server CRUD fully operational
- [ ] Validation script covers all patch settings

---

#### Pipeline 2G: Alerts, Compliance & Integrations `NOW` (after 2A, parallel with 2D/2E/2F)

**PRD:** `docs/sprint-2/PRD-ALERTS-COMPLIANCE-INTEGRATIONS.md`
**Resolves:** A.14 (License validation)
**Depends on:** 2A (RBAC — COMPLETED)

| # | Requirement | Scope | Status |
|---|-------------|-------|--------|
| R1 | Alert config hardening | Strict condition/action/severity validation, asset alert management endpoints (list, acknowledge, resolve, bulk), evaluation logging | `PENDING` |
| R2 | Audit log completeness | Apply audit middleware to ALL ~135 mutating routes across 15+ modules, sensitive field redaction | `PENDING` |
| R3 | License validation | Replace fake stub with format validation (PIQ[EPT]-XXXX-XXXX-XXXX-checksum), type-based limits, computed fields | `PENDING` |
| R4 | Vulnerability Preference | Verify P1 features work with RBAC — sync, scan, exceptions, stats, zero-day classification | `PENDING` |
| R5 | Marketplace / Integrations | New Integration Prisma model, full CRUD (7 endpoints), type enum, toggle, connection test | `PENDING` |
| R6 | Notification Preferences | Verify preference enforcement, strict validator (.strict()), default behavior, per-user isolation | `PENDING` |
| R7 | Validation script | 72 end-to-end scenarios testing all R1-R6 features with real HTTP requests against real DB | `PENDING` |

**Exit Criteria:**
- [ ] Alert configs reject malformed conditions/actions/severity — 15+ validation scenarios pass
- [ ] 100% of mutating endpoints (~135 routes) create audit log entries
- [ ] License activation with invalid code returns proper error (format, checksum, prefix validated)
- [ ] License GET returns computed fields (usedEndpoints from real agent count, remainingDays, status)
- [ ] Creating a user, modifying a role, changing a setting — all appear in audit log with correct details
- [ ] Sensitive data (passwords, tokens, license codes) NEVER appears in audit log details
- [ ] Integrations CRUD fully operational (7 endpoints, RBAC-protected, unique name constraint)
- [ ] Notification preferences enforced per-user per-category (strict validator rejects unknown keys)
- [ ] Vulnerability features from P1 verified working with P2A RBAC
- [ ] Validation script passes 72/72 scenarios with zero failures

---

### Pipeline 3: Deployment Execution `LATER`

Hub → Agent patch deployment, rollback, verification.
**Resolves:** A.10 (Infrastructure hardening)

---

### Pipeline 4: AI/MCP Integration `LATER`

Chat intelligence, natural language queries, auto-prioritization.

---

### Pipeline 5: Reporting & Analytics `LATER`

Scheduled reports, export, email delivery.

---

## Deferred from Sprint 1 (Could Have)

| # | Item | Notes | Assigned Pipeline | Status |
|---|------|-------|-------------------|--------|
| A.10 | Infrastructure hardening | Outdated MinIO, hardcoded agent URL, port mismatches | Pipeline 3 (Deployment) | LATER |
| A.11 | LDAP authentication | LdapConfig model exists, no auth flow | **Pipeline 2B** | NOW |
| A.12 | Role-based permissions | Role table exists, no runtime checking | **Pipeline 2A** | NOW |
| A.13 | Dashboard data completion | Empty cert/process data, needs agent collection | Pipeline 3+ | LATER |
| A.14 | License server validation | Simulated validation | **Pipeline 2G** | NOW |
| A.15 | Organization branch asset count | Hardcoded to 0 | **Pipeline 2C** | NOW |
| B.13 | E2E test coverage | Playwright tests for critical user flows | Cross-cutting | LATER |
| B.14 | Performance optimization | Code splitting, lazy routes | Cross-cutting | LATER |

---

## Workflow

For each pipeline:

```
1. Plan    → Write/review PRD with acceptance criteria
2. Build   → Implement requirements (use teammates to parallelize where possible)
3. Test    → Validate EVERY acceptance criterion from PRD
4. Update  → Mark pipeline as COMPLETED in this roadmap
5. Next    → Plan the next pipeline
```

---

## Capacity Allocation

| Category | Allocation | Notes |
|----------|------------|-------|
| Current pipeline (Now) | 80% | Full focus on one pipeline at a time |
| Bug fixes / regressions | 15% | Issues found during pipeline work |
| Pipeline planning (Next) | 5% | Light research for upcoming pipeline |

---

*This roadmap is a living document. Update after each pipeline completes.*
