# PRD: Agent Configuration & Enrollment (Pipeline 2E)

**Status**: DRAFT
**Author**: Claude Code
**Created**: 2026-02-13
**Priority**: P0 (Core Agent Management)
**Depends on**: Pipeline 2A (RBAC — COMPLETED)
**Parallel with**: Pipelines 2D, 2F, 2G
**Resolves**: Roadmap items — Enroll secrets, agent versions, agent approval settings, RedHat nomination, agent config enforcement

---

## 1. Problem Statement

PatchIQ has a **fully working agent communication stack** (registration, heartbeat, inventory, telemetry, commands) but the **management and enrollment layer is incomplete or unenforced**. The current gaps:

- **No enrollment secrets**: Any machine can register an agent by POSTing to `/api/agent/register` with a `machineId` — there is zero pre-authorization. In production, this means a rogue device on the network could register itself and receive commands. The `EnrollSecretResponse` type and Zod validators exist (`createEnrollSecretSchema`, `updateEnrollSecretSchema`) but there is no dedicated model, no CRUD endpoints, and no enforcement at registration time.

- **Agent approval settings are decorative**: The `updateAgentApprovalSettingsSchema` validator defines `approvalType: 'AUTO' | 'MANUAL'` and `autoApprovalBasedOn: 'ALL' | 'CRITERIA'`, but the registration flow always creates agents with `status='Pending'` regardless of the setting. The auto-approve path is never taken.

- **Agent config is write-only**: Global agent configuration (refresh cycles, bandwidth limits) can be stored via `PUT /v1/settings/agent-configuration`, and agents can fetch via `GET /api/agent/config`, but there is no validation that stored values are within sane bounds (e.g., a `0` refresh cycle would cause infinite polling). No audit trail on config changes.

- **Agent version management is incomplete**: The `AgentVersion` model and routes (`GET /v1/agent-versions`, `POST /:id/upload`, `GET /:id/download`) exist and work, but there's no version validation (semver), no release notes, no deprecation workflow, and no way to mark a version as "latest" or "recommended".

- **RedHat agent nomination is a phantom**: The Zod validator (`updateRedHatNominationSchema`) and response type (`RedHatNominationResponse`) exist, but there are no routes, no service methods, and no database model — the entire feature is a type stub.

- **Agent groups lack policy enforcement**: `AgentGroup` and `AgentGroupMembership` Prisma models exist, but groups have no associated configuration overrides, no deployment policies, and no way to scope agent settings by group.

Without proper enrollment controls, admins cannot securely onboard agents at scale. Without enforced configuration, the agent fleet behaves unpredictably.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Secure agent enrollment with pre-shared secrets | 100% of agent registrations require a valid, non-expired enroll secret — unauthenticated registrations rejected (401) |
| G2 | Configurable auto/manual agent approval with real enforcement | Auto-approve setting causes agents to register with `status='Connected'` immediately; manual requires admin action |
| G3 | Agent configuration with validation and enforcement | All config fields have Zod-enforced min/max bounds; agents receive current config via `/api/agent/config`; config changes logged to audit |
| G4 | Production-grade agent version lifecycle | CRUD for versions with semver validation, latest/recommended marking, deprecation, and download tracking |
| G5 | Working RedHat agent nomination system | Full CRUD + scheduling for RedHat nomination with status workflow (PENDING → APPROVED → REJECTED) |
| G6 | End-to-end validation via API | Automated validation script with 40+ scenarios covering enrollment, config, versions, approval, nominations — all via HTTP API calls against real database |

---

## 3. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| N1 | Agent binary compilation or CI/CD pipeline | Infrastructure concern, not settings. Binary is built separately and uploaded. |
| N2 | Agent group-scoped configuration overrides | Deferred — groups exist at schema level but per-group config is a Pipeline 3+ concern |
| N3 | Agent auto-deployment from network discovery | Requires agent installer distribution — separate initiative |
| N4 | Agent-side config hot-reload verification | Requires agent binary changes; backend proves config delivery via API |
| N5 | Frontend UI for agent enrollment | Backend-only scope; Dev 2 consumes API after this pipeline |
| N6 | Agent mTLS or certificate-based enrollment | Over-engineering for v1; shared secret + approval flow is sufficient |
| N7 | Agent binary signing or integrity verification | Deferred to Pipeline 3 (deployment execution) |

---

## 4. User Stories

### US-1: Secure Agent Onboarding
> As a **PatchIQ admin**, I want to create enrollment secrets that agents must present during registration so that only authorized machines can join my fleet.

### US-2: Enrollment Secret Management
> As a **PatchIQ admin**, I want to create, view, rotate, and revoke enrollment secrets with optional expiration dates and usage limits so that I can control the enrollment window and scope.

### US-3: Auto vs Manual Approval
> As a **PatchIQ admin**, I want to choose between automatic and manual agent approval so that in trusted networks agents connect immediately, while in untrusted environments I review each agent before granting access.

### US-4: Agent Configuration Enforcement
> As a **PatchIQ admin**, I want to set global agent configuration (refresh cycles, bandwidth limits) and know that agents actually receive these settings so that I can control fleet resource consumption.

### US-5: Agent Version Lifecycle
> As a **PatchIQ admin**, I want to upload new agent versions, mark them as recommended, deprecate old versions, and track which agents are running which version so that I can manage fleet updates.

### US-6: RedHat Agent Nomination
> As a **PatchIQ admin**, I want to nominate specific agents for RedHat content access and schedule sync times so that RHEL/CentOS endpoints receive vendor patches.

### US-7: Enrollment Secret Expiry
> As a **security-conscious admin**, I want enrollment secrets to automatically become invalid after their expiry date or usage limit so that stale secrets cannot be used to register rogue agents.

### US-8: Config Change Audit
> As a **compliance officer**, I want every agent configuration change to be logged in the audit trail so that I can verify who changed what and when.

---

## 5. Requirements

### R1: Enroll Secret System (P0 — Must Have)

Create a proper enrollment secret system with a dedicated Prisma model, full CRUD, expiry enforcement, and registration-time validation.

**Schema Changes:**

```prisma
model EnrollSecret {
  id             String    @id @default(uuid())
  name           String
  secret         String    @unique              // Cryptographically random token
  organizationId String?   @map("organization_id")
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  departmentId   String?   @map("department_id")
  department     Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  expiresAt      DateTime? @map("expires_at")   // Null = never expires
  maxUses        Int?      @map("max_uses")     // Null = unlimited
  usedCount      Int       @default(0) @map("used_count")
  isActive       Boolean   @default(true) @map("is_active")
  createdBy      String    @map("created_by")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@map("enroll_secrets")
}
```

**API Endpoints (Settings Module):**

| Method | Path | Action | RBAC |
|--------|------|--------|------|
| `GET` | `/v1/settings/enroll-secrets` | List all secrets (mask secret value after creation) | `settings:view` |
| `POST` | `/v1/settings/enroll-secrets` | Create new secret | `settings:add` |
| `GET` | `/v1/settings/enroll-secrets/:id` | Get secret details | `settings:view` |
| `PUT` | `/v1/settings/enroll-secrets/:id` | Update secret (name, org, dept, expiry, maxUses, isActive) | `settings:edit` |
| `DELETE` | `/v1/settings/enroll-secrets/:id` | Delete secret | `settings:delete` |

**Secret Generation:**
- Use `crypto.randomBytes(32).toString('hex')` for a 64-char hex token
- Secret is returned in full **only** on creation response (POST)
- All subsequent GET/LIST responses show only the first 8 chars + `...` mask (e.g., `a1b2c3d4...`)
- Store the full secret in the database (needed for registration validation)

**Registration Enforcement:**

Modify `POST /api/agent/register` to require an `enrollSecret` field:

```typescript
// agent-api.controller.ts — register handler
// BEFORE: any machineId registers freely
// AFTER:
1. Validate enrollSecret is present in request body
2. Find EnrollSecret by secret value WHERE isActive = true
3. Check expiry: if expiresAt is set AND expiresAt < now() → 401 "Enrollment secret has expired"
4. Check usage: if maxUses is set AND usedCount >= maxUses → 401 "Enrollment secret usage limit reached"
5. Increment usedCount
6. Proceed with registration (set agent.enrollSecretId for tracking)
7. If auto-approve is enabled: set agent.status = 'Connected' immediately
8. If manual approve: set agent.status = 'Pending' (existing behavior)
```

**Backward Compatibility:**
- When no enroll secrets exist in the database (fresh install), allow registration without secret (log a warning: "No enroll secrets configured — agent registration is open")
- Once at least one active enroll secret exists, ALL registrations require a valid secret

**Zod Validators (enhance existing):**

```typescript
export const createEnrollSecretSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().min(1).max(100000).optional().nullable(),
});

export const updateEnrollSecretSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  organizationId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().min(1).max(100000).optional().nullable(),
  isActive: z.boolean().optional(),
});
```

**Acceptance Criteria:**

- [ ] `EnrollSecret` Prisma model created with migration
- [ ] `POST /v1/settings/enroll-secrets` creates secret, returns full token in response (64-char hex)
- [ ] `GET /v1/settings/enroll-secrets` lists all secrets with masked tokens (first 8 chars + `...`)
- [ ] `GET /v1/settings/enroll-secrets/:id` returns single secret with masked token
- [ ] `PUT /v1/settings/enroll-secrets/:id` updates name, org, dept, expiry, maxUses, isActive
- [ ] `DELETE /v1/settings/enroll-secrets/:id` removes secret
- [ ] Agent registration (`POST /api/agent/register`) requires `enrollSecret` field when any active secret exists
- [ ] Registration with valid, non-expired, under-limit secret succeeds (200/201)
- [ ] Registration with expired secret returns 401 "Enrollment secret has expired"
- [ ] Registration with over-limit secret returns 401 "Enrollment secret usage limit reached"
- [ ] Registration with invalid/unknown secret returns 401 "Invalid enrollment secret"
- [ ] Registration with revoked secret (`isActive=false`) returns 401 "Enrollment secret is inactive"
- [ ] Registration without secret when NO secrets exist in DB succeeds (backward compat) with logged warning
- [ ] Registration without secret when active secrets exist returns 401 "Enrollment secret required"
- [ ] `usedCount` increments on each successful registration
- [ ] Secret generation uses `crypto.randomBytes(32)` (not Math.random or UUID)
- [ ] Secret is unique (DB constraint)
- [ ] Deleting an org/dept with linked enroll secrets sets `organizationId`/`departmentId` to null (onDelete: SetNull)
- [ ] All enroll secret endpoints require RBAC `settings` permission
- [ ] Creating secret with expired `expiresAt` (date in the past) is allowed (admin may want to pre-create then activate)
- [ ] Setting `maxUses` lower than current `usedCount` is allowed but immediately makes the secret invalid for new registrations

**Test Cases (R1):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| **CRUD** | | | |
| T1.1 | Create enroll secret — basic | `POST { name: "Office Fleet" }` | 201, response contains `secret` (64-char hex), `isActive: true`, `usedCount: 0` |
| T1.2 | Create enroll secret — full | `POST { name: "NYC Office", organizationId: uuid, departmentId: uuid, expiresAt: "2026-12-31T23:59:59Z", maxUses: 50 }` | 201 with all fields set |
| T1.3 | Create with invalid org | `POST { name: "Test", organizationId: "not-a-uuid" }` | 400 Zod error |
| T1.4 | Create with maxUses=0 | `POST { name: "Test", maxUses: 0 }` | 400 Zod error (min 1) |
| T1.5 | Create with maxUses=-1 | `POST { name: "Test", maxUses: -1 }` | 400 Zod error |
| T1.6 | Create with empty name | `POST { name: "" }` | 400 Zod error (min 1 char) |
| T1.7 | Create with name > 100 chars | `POST { name: "a".repeat(101) }` | 400 Zod error (max 100) |
| T1.8 | List secrets | `GET /v1/settings/enroll-secrets` (3 secrets exist) | 200, array of 3, all with masked secrets |
| T1.9 | List secrets — masking | `GET` after creating secret `a1b2c3d4e5f6...` | Response shows `"secret": "a1b2c3d4..."` (first 8 + `...`) |
| T1.10 | Get single secret | `GET /v1/settings/enroll-secrets/:id` | 200, masked secret, includes org/dept names |
| T1.11 | Get non-existent | `GET /v1/settings/enroll-secrets/fake-uuid` | 404 |
| T1.12 | Update name | `PUT { name: "Updated Name" }` | 200, name updated |
| T1.13 | Update isActive=false | `PUT { isActive: false }` | 200, secret deactivated |
| T1.14 | Update maxUses | `PUT { maxUses: 100 }` | 200, maxUses updated |
| T1.15 | Update expiresAt | `PUT { expiresAt: "2027-01-01T00:00:00Z" }` | 200, expiresAt updated |
| T1.16 | Update non-existent | `PUT /v1/settings/enroll-secrets/fake-uuid` | 404 |
| T1.17 | Delete secret | `DELETE /v1/settings/enroll-secrets/:id` | 200 (or 204) |
| T1.18 | Delete non-existent | `DELETE /v1/settings/enroll-secrets/fake-uuid` | 404 |
| T1.19 | Delete then list | Delete 1 of 3, then `GET` list | 200, array of 2 |
| **Registration Enforcement** | | | |
| T1.20 | Register with valid secret | `POST /api/agent/register { machineId: "m1", enrollSecret: "valid-secret", ... }` | 201/200 |
| T1.21 | Register with invalid secret | `POST /api/agent/register { machineId: "m2", enrollSecret: "wrong-secret", ... }` | 401 "Invalid enrollment secret" |
| T1.22 | Register without secret (secrets exist) | `POST /api/agent/register { machineId: "m3", ... }` (no enrollSecret field) | 401 "Enrollment secret required" |
| T1.23 | Register without secret (no secrets exist) | Delete all secrets, then `POST /api/agent/register { machineId: "m4", ... }` | 201/200 (backward compat, warning logged) |
| T1.24 | Register with expired secret | Create secret with `expiresAt` in past, register | 401 "Enrollment secret has expired" |
| T1.25 | Register at usage limit | Create secret with `maxUses: 1`, register once (OK), register again | 2nd: 401 "Enrollment secret usage limit reached" |
| T1.26 | Register with inactive secret | Create secret, deactivate (`isActive: false`), register | 401 "Enrollment secret is inactive" |
| T1.27 | usedCount increments | Create secret, register 3 agents | `usedCount` = 3 |
| T1.28 | Re-register same machineId | Register machineId "m1" twice with same secret | 200 (re-register), `usedCount` increments only on first registration |
| **RBAC** | | | |
| T1.29 | User role denied list | Login as `user` role, `GET /v1/settings/enroll-secrets` | 403 |
| T1.30 | User role denied create | Login as `user` role, `POST /v1/settings/enroll-secrets` | 403 |
| T1.31 | Admin allowed all | Login as admin, CRUD operations | All succeed |

---

### R2: Agent Approval Settings with Real Enforcement (P0 — Must Have)

Make the auto-approve/manual-approve toggle actually work at agent registration time.

**Current State:**
- `updateAgentApprovalSettingsSchema` defines `approvalType: 'AUTO' | 'MANUAL'` and `autoApprovalBasedOn: 'ALL' | 'CRITERIA'`
- Settings are stored in the `Setting` table but never read during registration
- All agents register as `status='Pending'` regardless

**Required Changes:**

1. **Settings CRUD** — Dedicated endpoints (may already be partially routed):

| Method | Path | Action | RBAC |
|--------|------|--------|------|
| `GET` | `/v1/settings/agent-approval-settings` | Get current approval policy | `settings:view` |
| `PUT` | `/v1/settings/agent-approval-settings` | Update approval policy | `settings:edit` |

2. **Registration Integration:**

```
Agent registers → validate enroll secret (R1) → check approval settings:
  - approvalType = 'AUTO' + autoApprovalBasedOn = 'ALL':
      Set agent.status = 'Connected' immediately
  - approvalType = 'AUTO' + autoApprovalBasedOn = 'CRITERIA':
      If agent matches criteria (org/dept from enroll secret, OS pattern, etc.):
        Set agent.status = 'Connected'
      Else:
        Set agent.status = 'Pending'
  - approvalType = 'MANUAL':
      Set agent.status = 'Pending' (existing behavior)
```

3. **Approval/Reject Hardening (existing endpoints):**

| Method | Path | Action | RBAC |
|--------|------|--------|------|
| `GET` | `/v1/settings/agent-approvals` | List pending agents | `settings:view` |
| `POST` | `/v1/settings/agent-approvals/:id/approve` | Approve → set status 'Connected' | `settings:edit` |
| `POST` | `/v1/settings/agent-approvals/:id/reject` | Reject → set status 'Rejected' | `settings:edit` |

4. **Validation:**

```typescript
export const updateAgentApprovalSettingsSchema = z.object({
  approvalType: z.enum(['AUTO', 'MANUAL']),
  autoApprovalBasedOn: z.enum(['ALL', 'CRITERIA']).optional(),
  criteria: z.object({
    osPatterns: z.array(z.string().min(1).max(200)).max(20).optional(),
    ipRanges: z.array(z.string().min(7).max(45)).max(20).optional(),
    enrollSecretIds: z.array(z.string().uuid()).max(50).optional(),
  }).optional(),
});
```

**Acceptance Criteria:**

- [ ] `GET /v1/settings/agent-approval-settings` returns current policy (`approvalType`, `autoApprovalBasedOn`, optional criteria)
- [ ] `PUT /v1/settings/agent-approval-settings` updates policy with Zod validation
- [ ] Setting `approvalType: 'AUTO', autoApprovalBasedOn: 'ALL'` causes next agent registration to get `status='Connected'`
- [ ] Setting `approvalType: 'MANUAL'` causes next agent registration to get `status='Pending'`
- [ ] `GET /v1/settings/agent-approvals` returns only agents with `status='Pending'`
- [ ] `POST /v1/settings/agent-approvals/:id/approve` changes status from `Pending` to `Connected`
- [ ] `POST /v1/settings/agent-approvals/:id/reject` changes status to `Rejected`
- [ ] Approving a non-pending agent returns 400 "Agent is not in Pending status"
- [ ] Rejecting a non-pending agent returns 400 "Agent is not in Pending status"
- [ ] Approving/rejecting a non-existent agent returns 404
- [ ] Rejected agents CANNOT send heartbeats — heartbeat endpoint returns 403 for rejected agents
- [ ] Config change logged to audit trail: `{ resource: "agent-approval-settings", action: "UPDATE", before: {...}, after: {...} }`
- [ ] Default approval type on fresh install is `MANUAL` (secure default)

**Test Cases (R2):**

| ID | Test | Setup | Request | Expected |
|----|------|-------|---------|----------|
| T2.1 | Get default settings | Fresh install | `GET /v1/settings/agent-approval-settings` | `{ approvalType: 'MANUAL' }` |
| T2.2 | Set auto-approve all | Admin | `PUT { approvalType: 'AUTO', autoApprovalBasedOn: 'ALL' }` | 200 |
| T2.3 | Register with auto-approve | Auto=ALL enabled, register agent | `POST /api/agent/register` | 201, agent status = 'Connected' |
| T2.4 | Set manual-approve | Admin | `PUT { approvalType: 'MANUAL' }` | 200 |
| T2.5 | Register with manual-approve | Manual enabled, register agent | `POST /api/agent/register` | 201, agent status = 'Pending' |
| T2.6 | Approve pending agent | Agent in Pending | `POST /v1/settings/agent-approvals/:id/approve` | 200, status = 'Connected' |
| T2.7 | Reject pending agent | Agent in Pending | `POST /v1/settings/agent-approvals/:id/reject` | 200, status = 'Rejected' |
| T2.8 | Approve already connected | Agent already Connected | `POST /v1/settings/agent-approvals/:id/approve` | 400 "Agent is not in Pending status" |
| T2.9 | Approve non-existent | | `POST /v1/settings/agent-approvals/fake-uuid/approve` | 404 |
| T2.10 | List pending agents | 2 pending, 1 connected, 1 rejected | `GET /v1/settings/agent-approvals` | 200, array of 2 |
| T2.11 | Rejected agent heartbeat | Agent rejected | `POST /api/agent/heartbeat` (with rejected agent's token) | 403 |
| T2.12 | Invalid approval type | | `PUT { approvalType: 'INVALID' }` | 400 Zod error |
| T2.13 | Set auto with criteria | Admin | `PUT { approvalType: 'AUTO', autoApprovalBasedOn: 'CRITERIA', criteria: { osPatterns: ['Windows*'] } }` | 200 |
| T2.14 | Register matches criteria | Criteria: osPatterns=["Windows*"], register Windows agent | Register | 201, status='Connected' |
| T2.15 | Register doesn't match criteria | Criteria: osPatterns=["Windows*"], register Linux agent | Register | 201, status='Pending' |

---

### R3: Agent Configuration Hardening (P0 — Must Have)

Harden the existing agent configuration system with proper validation bounds, complete CRUD, and config delivery verification.

**Current Config Fields (from `settings.service.ts`):**

| Key | Current Default | Description |
|-----|----------------|-------------|
| `allowedBandwidth` | 100 | Bandwidth limit (Mbps) for agent operations |
| `agentRefreshCycle` | 300 | Main heartbeat interval (seconds) |
| `systemActionRefreshCycle` | 300 | System action polling interval (seconds) |
| `endpointVlanRefreshCycle` | 600 | VLAN scan interval (seconds) |
| `patchScanningRefreshCycle` | 3600 | Patch scan interval (seconds) |
| `softwareRefreshCycle` | 3600 | Software inventory interval (seconds) |
| `hardwareRefreshCycle` | 3600 | Hardware inventory interval (seconds) |
| `systemProcessRefreshCycle` | 600 | Process list interval (seconds) |
| `systemServiceRefreshCycle` | 600 | Service list interval (seconds) |
| `networkRefreshCycle` | 600 | Network info interval (seconds) |
| `networkSharesRefreshCycle` | 3600 | Network shares interval (seconds) |
| `riskDetectionRefreshCycle` | 7200 | Risk detection interval (seconds) |

**Required Changes:**

1. **Add Zod bounds to ALL config fields:**

```typescript
export const updateAgentConfigSchema = z.object({
  allowedBandwidth: z.number().int().min(1).max(10000).optional(),         // 1 Mbps – 10 Gbps
  agentRefreshCycle: z.number().int().min(60).max(86400).optional(),       // 1 min – 24 hours
  systemActionRefreshCycle: z.number().int().min(60).max(86400).optional(),
  endpointVlanRefreshCycle: z.number().int().min(300).max(86400).optional(), // 5 min – 24 hours
  patchScanningRefreshCycle: z.number().int().min(300).max(604800).optional(), // 5 min – 7 days
  softwareRefreshCycle: z.number().int().min(300).max(604800).optional(),
  hardwareRefreshCycle: z.number().int().min(300).max(604800).optional(),
  systemProcessRefreshCycle: z.number().int().min(60).max(86400).optional(),
  systemServiceRefreshCycle: z.number().int().min(60).max(86400).optional(),
  networkRefreshCycle: z.number().int().min(60).max(86400).optional(),
  networkSharesRefreshCycle: z.number().int().min(300).max(604800).optional(),
  riskDetectionRefreshCycle: z.number().int().min(300).max(604800).optional(),
});
```

2. **Config delivery endpoint verification**: Ensure `GET /api/agent/config` returns the stored config values (not hardcoded defaults). When no config is stored, return sensible defaults matching the table above.

3. **Config reset endpoint**: Add ability to reset to defaults.

| Method | Path | Action | RBAC |
|--------|------|--------|------|
| `GET` | `/v1/settings/agent-configuration` | Get current config | `settings:view` |
| `PUT` | `/v1/settings/agent-configuration` | Update config (partial) | `settings:edit` |
| `POST` | `/v1/settings/agent-configuration/reset` | Reset to defaults | `settings:edit` |

4. **Audit trail**: Log config changes with before/after diff.

**Acceptance Criteria:**

- [ ] `GET /v1/settings/agent-configuration` returns all config fields with current values
- [ ] `PUT /v1/settings/agent-configuration` accepts partial updates (only changed fields)
- [ ] `PUT` with `agentRefreshCycle: 30` returns 400 Zod error (min 60)
- [ ] `PUT` with `agentRefreshCycle: 100000` returns 400 Zod error (max 86400)
- [ ] `PUT` with `allowedBandwidth: 0` returns 400 Zod error (min 1)
- [ ] `PUT` with `allowedBandwidth: 500` succeeds (200)
- [ ] `POST /v1/settings/agent-configuration/reset` resets all fields to defaults
- [ ] After PUT: `GET /api/agent/config` (agent endpoint) returns updated values
- [ ] After reset: `GET /api/agent/config` returns default values
- [ ] String values rejected for numeric fields (Zod)
- [ ] Float values rejected for integer fields (Zod)
- [ ] Negative values rejected for all fields (Zod)
- [ ] Config change logged to audit: `{ resource: "agent-configuration", action: "UPDATE", before: {...}, after: {...} }`
- [ ] Config reset logged to audit: `{ resource: "agent-configuration", action: "RESET" }`
- [ ] All config endpoints require RBAC `settings:view/edit` permission
- [ ] Agent config endpoint (`GET /api/agent/config`) uses agent token auth — not affected by RBAC

**Test Cases (R3):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T3.1 | Get default config | Fresh install, `GET /v1/settings/agent-configuration` | 200, all defaults returned |
| T3.2 | Update single field | `PUT { agentRefreshCycle: 120 }` | 200, only that field changed |
| T3.3 | Update multiple fields | `PUT { agentRefreshCycle: 120, allowedBandwidth: 500 }` | 200, both changed |
| T3.4 | Below minimum — agentRefreshCycle | `PUT { agentRefreshCycle: 30 }` | 400 "Number must be >= 60" |
| T3.5 | Above maximum — agentRefreshCycle | `PUT { agentRefreshCycle: 100000 }` | 400 "Number must be <= 86400" |
| T3.6 | Below minimum — allowedBandwidth | `PUT { allowedBandwidth: 0 }` | 400 "Number must be >= 1" |
| T3.7 | String instead of number | `PUT { agentRefreshCycle: "fast" }` | 400 Zod type error |
| T3.8 | Float instead of int | `PUT { agentRefreshCycle: 120.5 }` | 400 Zod int error |
| T3.9 | Negative value | `PUT { patchScanningRefreshCycle: -1 }` | 400 Zod error |
| T3.10 | Reset to defaults | `POST /v1/settings/agent-configuration/reset`, then GET | All values match defaults |
| T3.11 | Agent receives updated config | PUT bandwidth=500, then `GET /api/agent/config` (agent auth) | Response includes `allowedBandwidth: 500` |
| T3.12 | Agent receives reset config | Reset, then `GET /api/agent/config` | Response includes all defaults |
| T3.13 | RBAC — user denied | User role, `PUT /v1/settings/agent-configuration` | 403 |
| T3.14 | Unknown field rejected | `PUT { unknownField: 123 }` | 400 or ignored (strict mode rejects) |
| T3.15 | Empty body | `PUT {}` | 200, no changes (valid no-op) |

---

### R4: Agent Version Lifecycle (P0 — Must Have)

Harden the existing agent version management with proper CRUD, semver validation, latest/recommended marking, and deprecation.

**Current State:**
- `AgentVersion` model exists: `id, platform, architecture, version, filePath, fileSize, checksum, lastUpdatedAt, createdAt`
- Routes: `GET /v1/agent-versions` (list), `GET /:id/download` (download ZIP), `POST /:id/upload` (upload binary)
- All working but no: create endpoint, version validation, recommended flag, deprecation, release notes

**Schema Changes:**

```prisma
model AgentVersion {
  id            String    @id @default(uuid())
  platform      String                        // windows, linux, darwin
  architecture  String                        // amd64, arm64
  version       String                        // semver: "1.2.3"
  filePath      String?   @map("file_path")   // MinIO path
  fileSize      BigInt?   @map("file_size")
  checksum      String?                       // SHA256
  releaseNotes  String?   @map("release_notes")
  isRecommended Boolean   @default(false) @map("is_recommended")
  isDeprecated  Boolean   @default(false) @map("is_deprecated")
  downloadCount Int       @default(0) @map("download_count")
  lastUpdatedAt DateTime  @map("last_updated_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  @@unique([platform, architecture, version])
  @@map("agent_versions")
}
```

**New/Modified Endpoints:**

| Method | Path | Action | RBAC |
|--------|------|--------|------|
| `GET` | `/v1/agent-versions` | List all versions (with filters: platform, deprecated) | `agents:view` |
| `POST` | `/v1/agent-versions` | Create version record (metadata only, no binary yet) | `agents:add` |
| `GET` | `/v1/agent-versions/:id` | Get version details | `agents:view` |
| `PUT` | `/v1/agent-versions/:id` | Update version (releaseNotes, isRecommended, isDeprecated) | `agents:edit` |
| `DELETE` | `/v1/agent-versions/:id` | Delete version (and MinIO file) | `agents:delete` |
| `POST` | `/v1/agent-versions/:id/upload` | Upload binary file (existing) | `agents:add` |
| `GET` | `/v1/agent-versions/:id/download` | Download as ZIP (existing) | `agents:view` |
| `GET` | `/v1/agent-versions/latest` | Get latest recommended version for platform+arch | `agents:view` |

**Version Validation:**

```typescript
export const createAgentVersionSchema = z.object({
  platform: z.enum(['windows', 'linux', 'darwin']),
  architecture: z.enum(['amd64', 'arm64']),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format: X.Y.Z'),
  releaseNotes: z.string().max(5000).optional(),
  isRecommended: z.boolean().optional().default(false),
});

export const updateAgentVersionSchema = z.object({
  releaseNotes: z.string().max(5000).optional(),
  isRecommended: z.boolean().optional(),
  isDeprecated: z.boolean().optional(),
});
```

**Recommended Version Logic:**
- Setting `isRecommended: true` on a version automatically sets `isRecommended: false` on all other versions with the same `platform + architecture`
- Only one version per platform+arch can be recommended at a time
- `GET /v1/agent-versions/latest?platform=windows&architecture=amd64` returns the recommended version (or latest non-deprecated if none recommended)

**Download Tracking:**
- `downloadCount` increments on each `GET /:id/download` request

**Acceptance Criteria:**

- [ ] `POST /v1/agent-versions` creates version record with valid semver
- [ ] `POST` with invalid version format (e.g., `"1.2"`, `"v1.2.3"`, `"abc"`) returns 400
- [ ] `POST` with duplicate platform+arch+version returns 409 "Version already exists"
- [ ] `PUT /v1/agent-versions/:id` updates releaseNotes, isRecommended, isDeprecated
- [ ] Setting `isRecommended: true` clears isRecommended on other versions for same platform+arch
- [ ] `DELETE /v1/agent-versions/:id` deletes record AND removes file from MinIO (if exists)
- [ ] `GET /v1/agent-versions?platform=windows` filters by platform
- [ ] `GET /v1/agent-versions?deprecated=false` excludes deprecated versions
- [ ] `GET /v1/agent-versions/latest?platform=linux&architecture=amd64` returns recommended version
- [ ] `GET /v1/agent-versions/latest` without params returns 400 "platform and architecture required"
- [ ] Download increments `downloadCount`
- [ ] Deprecated versions are not returned by `/latest` endpoint
- [ ] Version without uploaded binary: download returns 404 "Binary not uploaded"
- [ ] All agent-version endpoints require RBAC `agents` permission with correct action

**Test Cases (R4):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T4.1 | Create version — valid | `POST { platform: "windows", architecture: "amd64", version: "1.0.0" }` | 201 |
| T4.2 | Create version — with notes | `POST { ..., releaseNotes: "Bug fixes and improvements" }` | 201, releaseNotes stored |
| T4.3 | Create version — invalid semver | `POST { version: "1.0" }` | 400 "Version must be in semver format" |
| T4.4 | Create version — v-prefix | `POST { version: "v1.0.0" }` | 400 (no v-prefix allowed) |
| T4.5 | Create version — duplicate | Same platform+arch+version twice | 409 "Version already exists" |
| T4.6 | Create version — invalid platform | `POST { platform: "android" }` | 400 Zod error |
| T4.7 | Update releaseNotes | `PUT { releaseNotes: "Updated notes" }` | 200 |
| T4.8 | Set recommended | `PUT { isRecommended: true }` on v1.0.0 | 200, v1.0.0 is recommended |
| T4.9 | Set new recommended — clears old | Set recommended on v1.1.0 (same platform+arch as v1.0.0) | v1.0.0 `isRecommended: false`, v1.1.0 `isRecommended: true` |
| T4.10 | Deprecate version | `PUT { isDeprecated: true }` on v1.0.0 | 200, v1.0.0 deprecated |
| T4.11 | Delete version | `DELETE /v1/agent-versions/:id` | 200, record removed |
| T4.12 | Delete non-existent | `DELETE /v1/agent-versions/fake-uuid` | 404 |
| T4.13 | Filter by platform | `GET /v1/agent-versions?platform=linux` | Only Linux versions returned |
| T4.14 | Filter deprecated | `GET /v1/agent-versions?deprecated=false` | Deprecated versions excluded |
| T4.15 | Get latest — recommended exists | `GET /v1/agent-versions/latest?platform=windows&architecture=amd64` | Recommended version returned |
| T4.16 | Get latest — no recommended | No recommended for linux/arm64 | Latest non-deprecated version returned |
| T4.17 | Get latest — no params | `GET /v1/agent-versions/latest` | 400 "platform and architecture required" |
| T4.18 | Get latest — no versions exist | `GET /v1/agent-versions/latest?platform=darwin&architecture=arm64` | 404 "No agent version found" |
| T4.19 | Download count tracking | Download version 3 times | `downloadCount` = 3 |
| T4.20 | Download without binary | Create version (no upload), download | 404 "Binary not uploaded" |
| T4.21 | RBAC — user view | User role | `GET /v1/agent-versions` | 200 (agents:view granted to user) |
| T4.22 | RBAC — user denied create | User role | `POST /v1/agent-versions` | 403 |

---

### R5: RedHat Agent Nomination (P0 — Must Have)

Implement the full RedHat agent nomination system — dedicated table, CRUD endpoints, status workflow, and sync scheduling.

**Purpose**: In RHEL/CentOS environments, specific agents need to be nominated to act as content sources for RedHat patches. This feature manages which agents are nominated, their approval status, and the scheduled sync time for pulling RedHat content.

**Schema Changes:**

```prisma
model RedHatNomination {
  id            String    @id @default(uuid())
  agentId       String    @map("agent_id")
  agent         Agent     @relation(fields: [agentId], references: [id], onDelete: Cascade)
  name          String                          // Friendly name for this nomination
  status        String    @default("PENDING")   // PENDING, APPROVED, REJECTED
  endpoint      Int       @default(0)           // Number of endpoints this nomination serves
  scheduledTime String?   @map("scheduled_time") // HH:MM format for sync schedule
  lastSyncTime  DateTime? @map("last_sync_time")
  updatedBy     String?   @map("updated_by")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@unique([agentId])
  @@map("redhat_nominations")
}
```

**API Endpoints:**

| Method | Path | Action | RBAC |
|--------|------|--------|------|
| `GET` | `/v1/settings/redhat-nominations` | List all nominations | `settings:view` |
| `POST` | `/v1/settings/redhat-nominations` | Create nomination | `settings:add` |
| `GET` | `/v1/settings/redhat-nominations/:id` | Get nomination details | `settings:view` |
| `PUT` | `/v1/settings/redhat-nominations/:id` | Update nomination (status, scheduledTime, endpoint count) | `settings:edit` |
| `DELETE` | `/v1/settings/redhat-nominations/:id` | Delete nomination | `settings:delete` |

**Validation:**

```typescript
export const createRedHatNominationSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().min(1).max(100),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format').optional().nullable(),
  endpoint: z.number().int().min(0).max(100000).optional().default(0),
});

export const updateRedHatNominationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format').optional().nullable(),
  endpoint: z.number().int().min(0).max(100000).optional(),
});
```

**Acceptance Criteria:**

- [ ] `RedHatNomination` Prisma model created with migration
- [ ] `POST /v1/settings/redhat-nominations` creates nomination for a valid agent
- [ ] `POST` with non-existent agentId returns 404 "Agent not found"
- [ ] `POST` with duplicate agentId returns 409 "Agent already nominated"
- [ ] `GET /v1/settings/redhat-nominations` lists all nominations with agent details (hostname, OS, status)
- [ ] `PUT` can transition status: PENDING → APPROVED, PENDING → REJECTED, REJECTED → PENDING (re-nomination)
- [ ] `PUT` with invalid scheduledTime (e.g., `"25:00"`, `"abc"`) returns 400
- [ ] `DELETE` removes nomination
- [ ] Deleting an agent cascades and removes its nomination
- [ ] All endpoints require RBAC `settings` permission
- [ ] Only agents with OS containing "Red Hat" or "CentOS" or "RHEL" can be nominated — others return 400 "Agent OS must be Red Hat Enterprise Linux or CentOS"

**Test Cases (R5):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T5.1 | Create nomination | `POST { agentId: rhel-agent-uuid, name: "RHEL Content Source 1" }` | 201, status='PENDING' |
| T5.2 | Create with schedule | `POST { agentId: uuid, name: "Source 1", scheduledTime: "02:30" }` | 201, scheduledTime='02:30' |
| T5.3 | Create duplicate | Same agentId twice | 409 "Agent already nominated" |
| T5.4 | Create for non-RHEL agent | Agent with OS='Windows 11' | 400 "Agent OS must be Red Hat Enterprise Linux or CentOS" |
| T5.5 | Create for non-existent agent | `POST { agentId: "fake-uuid" }` | 404 "Agent not found" |
| T5.6 | List nominations | 3 nominations exist | 200, array of 3 with agent details |
| T5.7 | Update status — approve | `PUT { status: "APPROVED" }` | 200 |
| T5.8 | Update status — reject | `PUT { status: "REJECTED" }` | 200 |
| T5.9 | Update schedule | `PUT { scheduledTime: "04:00" }` | 200 |
| T5.10 | Invalid schedule time | `PUT { scheduledTime: "25:00" }` | 400 |
| T5.11 | Invalid schedule format | `PUT { scheduledTime: "2:30" }` (single-digit hour) | 400 |
| T5.12 | Delete nomination | `DELETE /v1/settings/redhat-nominations/:id` | 200 |
| T5.13 | Agent deletion cascades | Delete the nominated agent | Nomination record also deleted |
| T5.14 | Non-existent nomination | `GET /v1/settings/redhat-nominations/fake-uuid` | 404 |
| T5.15 | RBAC — user denied | User role, `POST /v1/settings/redhat-nominations` | 403 |

---

### R6: Agent Downloads Management (P1 — Nice-to-Have)

Harden the existing `AgentDownload` model for public download link management.

**Current State:**
- `AgentDownload` model exists with `id, os, version, releaseDate, downloadUrl`
- No routes exist — the model is unused

**API Endpoints:**

| Method | Path | Action | RBAC |
|--------|------|--------|------|
| `GET` | `/v1/settings/agent-downloads` | List download links | `settings:view` |
| `POST` | `/v1/settings/agent-downloads` | Create download link | `settings:add` |
| `PUT` | `/v1/settings/agent-downloads/:id` | Update download link | `settings:edit` |
| `DELETE` | `/v1/settings/agent-downloads/:id` | Delete download link | `settings:delete` |

**Acceptance Criteria:**

- [ ] Full CRUD for `AgentDownload` records
- [ ] Duplicate OS+version rejected (409)
- [ ] Download URL validated as valid URL format
- [ ] All endpoints require RBAC `settings` permission

**Test Cases (R6):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T6.1 | Create download | `POST { os: "Windows", version: "1.0.0", releaseDate: "2026-01-15", downloadUrl: "https://..." }` | 201 |
| T6.2 | Duplicate os+version | Same os+version twice | 409 |
| T6.3 | List downloads | 3 records exist | 200, array of 3 |
| T6.4 | Update URL | `PUT { downloadUrl: "https://new-url..." }` | 200 |
| T6.5 | Delete download | `DELETE /:id` | 200 |
| T6.6 | Invalid URL | `POST { downloadUrl: "not-a-url" }` | 400 |

---

### R7: End-to-End Validation Script (P0 — Must Have)

Create an automated validation script that proves all Pipeline 2E features work end-to-end via real HTTP API calls against a running backend with a real database.

**Location**: `backend/scripts/validate-agent-config.ts`

**Script Flow:**

```
1. Preflight: Verify backend is running (health check on :3000)
2. Login: Authenticate as admin
3. Phase 1 — Enroll Secrets: CRUD + registration enforcement
4. Phase 2 — Approval Settings: Auto/manual toggle + registration behavior
5. Phase 3 — Agent Config: Validation, delivery, reset
6. Phase 4 — Agent Versions: CRUD + semver + recommended + download
7. Phase 5 — RedHat Nominations: CRUD + status workflow + OS check
8. Phase 6 — Edge Cases: Expired secrets, rejected agents, concurrent operations
9. Phase 7 — Full Enrollment Flow: Create secret → register agent → approve/auto-approve → heartbeat → config delivery → version check
10. Cleanup: Delete all test data (agents, secrets, versions, nominations)
11. Report: Print pass/fail summary
```

**Test Data Prefix:** All test data uses `agent-cfg-test-*` prefix to avoid collisions.

**Validation Scenarios (45 total):**

| # | Category | Scenario | Expected |
|---|----------|----------|----------|
| **Enroll Secret CRUD** | | | |
| V1 | Create | Create enroll secret with name and expiry | 201, secret returned (64-char) |
| V2 | Create | Create second secret for different org | 201 |
| V3 | List | List secrets | 200, array of 2, secrets masked |
| V4 | Get | Get secret by ID | 200, secret masked |
| V5 | Update | Deactivate secret | 200, `isActive: false` |
| V6 | Delete | Delete secret | 200 |
| **Enrollment Enforcement** | | | |
| V7 | Register | Register with valid secret | 201 |
| V8 | Register | Register with invalid secret | 401 |
| V9 | Register | Register without secret (secrets exist) | 401 |
| V10 | Register | Register with expired secret | 401 |
| V11 | Register | Register with over-limit secret (maxUses=1, used=1) | 401 |
| V12 | Register | Register with inactive secret | 401 |
| V13 | Tracking | Verify usedCount incremented | usedCount matches registrations |
| **Approval Settings** | | | |
| V14 | Get | Get default approval settings | 200, `MANUAL` |
| V15 | Set | Set auto-approve ALL | 200 |
| V16 | Register | Register with auto-approve → status='Connected' | 201 |
| V17 | Set | Set manual-approve | 200 |
| V18 | Register | Register with manual-approve → status='Pending' | 201 |
| V19 | Approve | Approve pending agent | 200, status='Connected' |
| V20 | Reject | Reject pending agent | 200, status='Rejected' |
| V21 | Reject | Rejected agent heartbeat denied | 403 |
| **Agent Config** | | | |
| V22 | Get | Get default config | 200, all defaults |
| V23 | Update | Update agentRefreshCycle to 120 | 200 |
| V24 | Validate | Set agentRefreshCycle to 30 (below min) | 400 |
| V25 | Validate | Set allowedBandwidth to 0 (below min) | 400 |
| V26 | Validate | Set agentRefreshCycle to string | 400 |
| V27 | Delivery | Agent fetches config → sees updated values | 200, updated values |
| V28 | Reset | Reset config to defaults | 200, all defaults |
| V29 | Delivery | Agent fetches config after reset → sees defaults | 200, defaults |
| **Agent Versions** | | | |
| V30 | Create | Create version 1.0.0 for windows/amd64 | 201 |
| V31 | Create | Create version 1.1.0 for windows/amd64 | 201 |
| V32 | Validate | Create version with invalid semver "1.0" | 400 |
| V33 | Duplicate | Create duplicate platform+arch+version | 409 |
| V34 | Recommend | Set 1.1.0 as recommended | 200, 1.0.0 no longer recommended |
| V35 | Latest | Get latest for windows/amd64 | Returns 1.1.0 |
| V36 | Deprecate | Deprecate 1.0.0 | 200 |
| V37 | Filter | List non-deprecated versions | 1.0.0 excluded |
| V38 | Delete | Delete version | 200 |
| **RedHat Nominations** | | | |
| V39 | Create | Nominate RHEL agent | 201 |
| V40 | Duplicate | Re-nominate same agent | 409 |
| V41 | OS Check | Nominate Windows agent | 400 |
| V42 | Approve | Approve nomination | 200 |
| V43 | Schedule | Set sync time "03:00" | 200 |
| V44 | Delete | Delete nomination | 200 |
| **Full Enrollment Flow** | | | |
| V45 | E2E | Create secret → set auto-approve → register agent → heartbeat succeeds → fetch config → check version | All steps succeed sequentially |

**Acceptance Criteria:**

- [ ] Script runs with: `npx tsx backend/scripts/validate-agent-config.ts`
- [ ] All 45 validation scenarios pass
- [ ] Script creates and cleans up its own test data — no residue after run
- [ ] Uses real HTTP requests to `http://localhost:3000` (not service-layer calls)
- [ ] Each scenario has a labeled output: `[PASS] V7: Register with valid secret — 201`
- [ ] Failed scenarios show expected vs actual
- [ ] Script exits with code 0 on all-pass, code 1 on any failure
- [ ] Script prints summary: `45/45 PASS`
- [ ] Handles backend not running gracefully
- [ ] Cleanup runs even if assertions fail (try/finally)
- [ ] Script completes in under 60 seconds
- [ ] Test data uses unique `agent-cfg-test-*` prefix

**Test Cases (R7):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T7.1 | Full script pass | `npx tsx backend/scripts/validate-agent-config.ts` | 45/45 PASS, exit 0 |
| T7.2 | Script idempotency | Run twice consecutively | Both pass, no leftovers |
| T7.3 | Clean database | Run on fresh DB after seed | All pass |
| T7.4 | Exit code on failure | Remove RBAC from one route | Exit 1, failure details |
| T7.5 | Backend not running | Stop backend, run script | Clear error, exit 1 |
| T7.6 | Cleanup on failure | Script fails mid-run | Test data still cleaned up |
| T7.7 | No residue | Run script, check DB | No `agent-cfg-test-*` records remain |

---

### Future Considerations (P2)

**R8: Per-Agent Config Overrides**
- Allow overriding global config per agent or per agent group
- `AgentConfigOverride` table with `agentId`/`groupId` + config field + value
- Agent `/api/agent/config` returns merged (global + override) config

**R9: Enrollment Secret Rotation Workflow**
- Automated rotation: create new secret → deactivate old → notify admins
- Grace period: old secret valid for N hours after new one created

**R10: Agent Attestation**
- Agent presents hardware/TPM attestation during enrollment
- Platform integrity verification before approval

**R11: Agent Group Policy Engine**
- Associate deployment policies, config overrides, and approval rules with agent groups
- Agents inherit settings from their group membership

---

## 6. Success Metrics

| Metric | Target | Measurement | When |
|--------|--------|-------------|------|
| **Enrollment security** | 0 unauthenticated registrations when secrets exist | Validation script V7-V12 | After R1 |
| **Approval enforcement** | Auto-approve and manual-approve both provably work | Validation script V14-V21 | After R2 |
| **Config delivery accuracy** | 100% of config changes visible to agents within 1 request | Validation script V22-V29 | After R3 |
| **Config validation coverage** | 12/12 config fields have min/max bounds enforced | Zod schema + validation script V24-V26 | After R3 |
| **Version CRUD completeness** | All 6 endpoints return correct responses | Validation script V30-V38 | After R4 |
| **RedHat nomination completeness** | Full CRUD + status + OS check | Validation script V39-V44 | After R5 |
| **Validation pass rate** | 45/45 scenarios pass | `validate-agent-config.ts` output | After R7 |
| **Zero regressions** | Existing agent registration, heartbeat, and inventory still work | Existing tests + validation V45 | After all |
| **RBAC compliance** | All new endpoints have `checkPermission` middleware | Route audit | After all |
| **Schema integrity** | Migration applies cleanly, seed runs without errors | `make db-reset` + `make db-seed` | After R1, R5 |

---

## 7. Open Questions

| # | Question | Owner | Blocking? | Recommendation |
|---|----------|-------|-----------|----------------|
| Q1 | Should enroll secrets be hashed in the database (like passwords) or stored in plaintext (needed for validation)? | Engineering | Yes | **Store plaintext.** Unlike passwords, the enrollment secret must be compared on every registration. Hashing would require bcrypt on every agent register call. The secret is not a user credential — it's a shared token. If the DB is compromised, the attacker has bigger problems. |
| Q2 | Should we enforce that at least one active enroll secret must exist before disabling open registration? | Engineering | No | **No.** The backward-compat rule (allow open registration when no secrets exist) handles fresh installs. Once an admin creates their first secret, they've opted into enrollment enforcement. |
| Q3 | For agent approval criteria (AUTO + CRITERIA), should we support IP range matching or just OS pattern matching? | Engineering | No | **Support both.** OS patterns are useful for "auto-approve all Windows agents", IP ranges for "auto-approve agents from 10.0.0.0/24". Keep implementation simple with glob matching for OS and CIDR parsing for IPs. |
| Q4 | Should deprecated agent versions be deletable, or should they be preserved for audit? | Engineering | No | **Deletable.** Deprecation is a soft state (version still in DB, just not recommended). Hard delete removes the record and MinIO file entirely. Admins choose which they need. |
| Q5 | For RedHat nominations, should we validate the agent OS at nomination time or just warn? | Engineering | No | **Validate and reject.** Nominating a Windows agent for RedHat content is always wrong. Return 400 instead of letting admins create invalid nominations. |
| Q6 | Should the `GET /api/agent/config` endpoint require the agent to be in `Connected` status, or should pending agents also get config? | Engineering | No | **Allow pending agents to get config.** The agent needs config to know its heartbeat interval even while waiting for approval. The config endpoint doesn't grant any elevated access. |

---

## 8. Timeline Considerations

**Dependencies:**
- Pipeline 2A (RBAC) must be complete → **COMPLETED** (2026-02-13)
- No external service dependencies — all backend-internal
- Existing `Agent`, `AgentVersion`, `AgentGroup`, `Setting` models as foundation

**Suggested Implementation Order:**

```
R1 (Enroll Secrets)           ← Must be first (registration changes affect everything)
    ↓
R2 (Approval Settings)       ← Depends on R1 (registration flow changes)
    ↓
R3 (Agent Config)             ← Independent, can run IN PARALLEL with R1+R2
    ↓
R4 (Agent Versions)           ← Independent, can run IN PARALLEL with R1+R2+R3
    ↓
R5 (RedHat Nominations)      ← Independent, can run IN PARALLEL with R4
    ↓
R7 (Validation Script)       ← Must be last (validates everything)
```

**Parallelizable Work:**
- R3 (config hardening) + R4 (version lifecycle) + R5 (RedHat) are all independent
- R1 + R2 are sequential (R2 depends on R1's registration changes)
- R6 (downloads) can be done at any time — it's P1

**Risk Factors:**
- R1 modifies the agent registration flow — must ensure backward compatibility with existing agents
- R2 changes agent status assignment at registration — must not break existing agents that are already `Connected`
- R4 schema changes to `AgentVersion` (adding columns) require migration — test on seeded DB
- R5 creates a new model — straightforward migration but needs new route file

---

## Appendix A: Default Agent Configuration Values

| Key | Default | Min | Max | Unit |
|-----|---------|-----|-----|------|
| `allowedBandwidth` | 100 | 1 | 10000 | Mbps |
| `agentRefreshCycle` | 300 | 60 | 86400 | seconds |
| `systemActionRefreshCycle` | 300 | 60 | 86400 | seconds |
| `endpointVlanRefreshCycle` | 600 | 300 | 86400 | seconds |
| `patchScanningRefreshCycle` | 3600 | 300 | 604800 | seconds |
| `softwareRefreshCycle` | 3600 | 300 | 604800 | seconds |
| `hardwareRefreshCycle` | 3600 | 300 | 604800 | seconds |
| `systemProcessRefreshCycle` | 600 | 60 | 86400 | seconds |
| `systemServiceRefreshCycle` | 600 | 60 | 86400 | seconds |
| `networkRefreshCycle` | 600 | 60 | 86400 | seconds |
| `networkSharesRefreshCycle` | 3600 | 300 | 604800 | seconds |
| `riskDetectionRefreshCycle` | 7200 | 300 | 604800 | seconds |

---

## Appendix B: Agent Registration Flow (After Pipeline 2E)

```
Agent starts → POST /api/agent/register
    ↓
┌─────────────────────────────────────────────┐
│ 1. Validate request body (machineId, etc.)  │
└──────┬──────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────┐
│ 2. Check: Any active EnrollSecret exists?   │
│    NO  → Allow registration (backward compat│
│           + log warning)                    │
│    YES → Validate enrollSecret field:       │
│          - Missing? → 401 "required"        │
│          - Not found? → 401 "invalid"       │
│          - Inactive? → 401 "inactive"       │
│          - Expired? → 401 "expired"         │
│          - Over limit? → 401 "limit reached"│
│          - Valid → increment usedCount       │
└──────┬──────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────┐
│ 3. Check approval settings:                 │
│    MANUAL → agent.status = 'Pending'        │
│    AUTO + ALL → agent.status = 'Connected'  │
│    AUTO + CRITERIA → match OS/IP/secret:    │
│      Match → 'Connected'                    │
│      No match → 'Pending'                   │
└──────┬──────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────┐
│ 4. Create/update Agent record               │
│    - Link to Asset                          │
│    - Generate JWT tokens                    │
│    - Return { accessToken, refreshToken,    │
│              agentId, status }              │
└─────────────────────────────────────────────┘
```

---

## Appendix C: Files to Create/Modify

| File | Changes | Risk |
|------|---------|------|
| `backend/src/db/prisma/schema.prisma` | Add `EnrollSecret` + `RedHatNomination` models, modify `AgentVersion` (add columns) | High — schema change |
| `backend/src/db/prisma/migrations/XXXX_agent_enrollment/` | New migration for all schema changes | High — data migration |
| `backend/src/db/prisma/seed.ts` | Seed default enroll secret, default agent config, sample versions | Medium |
| `backend/src/modules/settings/settings.routes.ts` | Add routes for enroll-secrets, redhat-nominations, agent-approval-settings, agent-config/reset | Medium |
| `backend/src/modules/settings/settings.service.ts` | Add service methods for all new CRUD operations | High — core logic |
| `backend/src/modules/settings/settings.validators.ts` | Enhance Zod schemas for all new endpoints with proper bounds | Medium |
| `backend/src/modules/agents/agent-api.controller.ts` | Modify registration to validate enroll secret + check approval settings | High — registration flow |
| `backend/src/modules/agents/agents.service.ts` | Add enroll secret validation logic, approval setting check | High — core agent flow |
| `backend/src/modules/agents/agents.routes.ts` | Add version CRUD endpoints (create, update, delete, latest) | Medium |
| `backend/src/modules/agents/agents.controller.ts` | Add controller methods for new version endpoints | Medium |
| `backend/src/modules/agents/agents.validators.ts` | Add version Zod schemas | Low |
| `backend/src/modules/agents/agent-versions.routes.ts` | Add create, update, delete, latest endpoints | Medium |
| `backend/src/shared/types/api.types.ts` | Add/update response types for enroll secrets, nominations, versions | Low |
| `shared/types/api.ts` | Mirror shared types | Low |
| `backend/scripts/validate-agent-config.ts` | **NEW FILE**: Validation script (45 scenarios) | Medium |

**Total files**: ~15 (1 new, 14 modified)

---

## Appendix D: Complete Test Case Summary

| Requirement | Test Cases | Categories |
|-------------|-----------|------------|
| R1: Enroll Secrets | T1.1–T1.31 (31 tests) | CRUD, registration enforcement, expiry, limits, RBAC, backward compat |
| R2: Approval Settings | T2.1–T2.15 (15 tests) | Settings CRUD, auto/manual enforcement, approve/reject, criteria, rejected agent |
| R3: Agent Config | T3.1–T3.15 (15 tests) | Get, update, validate bounds, reset, delivery, RBAC |
| R4: Agent Versions | T4.1–T4.22 (22 tests) | CRUD, semver validation, recommended, deprecated, download, latest, RBAC |
| R5: RedHat Nominations | T5.1–T5.15 (15 tests) | CRUD, status workflow, OS check, cascade, RBAC |
| R6: Agent Downloads (P1) | T6.1–T6.6 (6 tests) | CRUD, duplicate, URL validation |
| R7: Validation Script | T7.1–T7.7 (7 tests) | Script execution, idempotency, cleanup |
| **TOTAL** | **111 test cases** | |

| Validation Script | V1–V45 (45 scenarios) | Enroll, approval, config, versions, nominations, edge cases, E2E flow |
