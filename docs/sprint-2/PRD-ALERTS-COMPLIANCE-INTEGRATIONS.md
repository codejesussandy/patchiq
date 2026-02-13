# PRD: Alerts, Compliance & Integrations (Pipeline 2G)

**Status**: `IN PROGRESS`
**Author**: Claude Code
**Created**: 2026-02-13
**Priority**: P0 (Settings & Configuration Overhaul)
**Depends on**: Pipeline 2A (RBAC — COMPLETED)
**Parallel with**: Pipelines 2D, 2E, 2F
**Resolves**: Sprint 1 Deferred Item A.14 (License validation)

---

## 1. Problem Statement

PatchIQ has several compliance and operational features that are either **stubbed, incomplete, or untested**:

1. **Alert configuration accepts malformed data** — The `conditions`, `actions`, and `remediations` fields accept `z.array(z.record(z.unknown()))`, meaning any JSON is accepted. Severity and status are plain strings with no enum enforcement. There are no endpoints to query/manage asset alerts across all assets, no manual acknowledgment flow, and zero test coverage.

2. **Audit logging covers ~5% of mutations** — Only auth login/logout/password operations use the `audit()` middleware. The remaining ~95% of API mutations (patches, deployments, assets, settings, discovery, agents, hub, jobs, vulnerabilities, reports) have **zero audit trail**. Compliance requires every state-changing operation to be recorded.

3. **License validation is a fake stub** — `updatePlatformLicense()` accepts any license code string, stores hardcoded "Enterprise" license data, and returns success. There is no format validation, no checksum verification, no expiry enforcement, and no endpoint count checking. The TODO comment in the code says "Validate license code with license server."

4. **Marketplace/Integrations don't exist** — Zod validator schemas (`createIntegrationSchema`, `updateIntegrationSchema`, `toggleIntegrationStatusSchema`) are defined in `settings.validators.ts` but are **never used**. There are no database models, no routes, no service methods, and no CRUD endpoints.

5. **Notification preferences work but lack edge-case hardening** — The notification system is functionally complete but needs consistency verification (category naming, default behavior, preference enforcement edge cases).

6. **Vulnerability preferences are hardened from Pipeline 1** — These need verification that they survive the Pipeline 2A RBAC changes and still function correctly.

Without these fixes, PatchIQ cannot pass a compliance audit, cannot enforce license terms, has no integration extensibility, and has alert configurations that silently accept invalid data.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Alert configurations reject malformed data at the API boundary | 15+ Zod validation scenarios pass — invalid condition operators, missing fields, wrong types all rejected with descriptive errors |
| G2 | Every state-changing API operation is recorded in the audit log | Audit middleware applied to all mutating routes across 15+ modules — verified by validation script |
| G3 | License activation validates format and enforces constraints | Invalid codes rejected (wrong format, expired, exceeded endpoints), valid codes activate — 10+ scenarios tested |
| G4 | Integrations have full CRUD with proper data model | Database model exists, 5 REST endpoints operational, RBAC-protected, Zod-validated — verified by API testing |
| G5 | Notification preferences are consistent and enforced | All 5 categories x 2 channels properly gate notifications — 10+ preference enforcement scenarios pass |
| G6 | Vulnerability preferences survive RBAC changes | CVE sync, scan, exception management all work correctly with RBAC middleware — 5+ scenarios pass |
| G7 | End-to-end validation script proves everything works | 60+ scenarios pass against real database with real HTTP requests, including edge cases and cross-feature interactions |

---

## 3. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| N1 | External license server integration (SaaS validation) | No license server exists yet; implement local validation with proper format first, design for remote validation later |
| N2 | Webhook delivery for integrations (outbound HTTP calls) | Pipeline 2G establishes the data model; webhook execution is Pipeline 3+ scope |
| N3 | Alert escalation rules (auto-escalate after X minutes) | Over-engineering for v1; basic alert CRUD + acknowledgment is sufficient |
| N4 | Complex alert condition trees (OR logic, nested groups) | Current AND-only logic works; complex conditions are a separate enhancement |
| N5 | Audit log retention policies (auto-purge after N days) | Write-side completeness is the priority; retention is an ops concern for later |
| N6 | Real-time audit log streaming (live tail via SSE) | Audit logs are queryable via existing list endpoint; real-time streaming is nice-to-have |
| N7 | Frontend UI for any of these features | Backend-only scope; Dev 2 plugs in frontend after backend is solid |
| N8 | Marketplace app store (browsing, installing third-party plugins) | Integrations here are admin-configured connections (SIEM, ticketing, etc.), not a plugin marketplace |

---

## 4. User Stories

### US-1: Alert Data Integrity
> As a **PatchIQ admin**, I want the system to reject alert configurations with invalid conditions (wrong operators, missing thresholds, malformed structure) so that I don't create alerts that silently fail to evaluate.

### US-2: Alert Management
> As a **PatchIQ admin**, I want to see all active alerts across all assets in one place, acknowledge them, and resolve them with a reason so that I can track alert lifecycle and demonstrate incident response.

### US-3: Compliance Audit Trail
> As a **compliance officer**, I want every configuration change, user action, and system mutation logged with who, what, when, and from where so that I can produce audit reports for SOC 2 / ISO 27001 reviews.

### US-4: Audit Log Investigation
> As a **PatchIQ admin**, I want to filter audit logs by user, action, resource, and date range so that I can investigate specific incidents (e.g., "who changed the deployment policy last Tuesday?").

### US-5: License Activation
> As a **PatchIQ admin**, I want to activate my license with a valid license code and see my entitlements (endpoint count, expiry date, license type) so that I know my platform is properly licensed.

### US-6: License Enforcement
> As a **PatchIQ admin**, I want the system to reject invalid license codes with a clear error message (wrong format, expired, wrong product) so that I don't accidentally apply a bad license.

### US-7: Integration Configuration
> As a **PatchIQ admin**, I want to configure integrations (SIEM, ticketing systems, notification channels) with connection details so that PatchIQ can connect to my existing infrastructure.

### US-8: Integration Toggle
> As a **PatchIQ admin**, I want to enable/disable integrations without deleting their configuration so that I can temporarily pause an integration during maintenance.

### US-9: Notification Preference Control
> As a **PatchIQ user**, I want my notification preferences to be respected — if I disable email notifications for deployments, I should never receive deployment emails, even if an admin triggers a broadcast.

### US-10: Vulnerability Preference Continuity
> As a **PatchIQ admin**, I want vulnerability preferences (CVE sync schedule, scan scope, exception management) to continue working correctly after the RBAC system was added so that Pipeline 1 features aren't broken by Pipeline 2A.

---

## 5. Requirements

### R1: Alert Configuration Hardening (P0 — Must Have)

Strengthen alert config validation, add asset alert management endpoints, and standardize enums.

#### 1A: Strict Condition Validation

Replace the loose `z.array(z.record(z.unknown()))` validators with a strict schema:

```typescript
const alertConditionSchema = z.object({
  attribute: z.enum([
    'CPU Usage', 'Memory Usage', 'Disk Usage',
    'Pending Reboot', 'Firewall Status', 'Antivirus Status',
  ]),
  operator: z.enum([
    '>=', '<=', '>', '<', '==', '!=',
    'equals', 'not_equals', 'is', 'is not',
  ]),
  value: z.union([z.number(), z.boolean(), z.string()]),
});

const alertActionSchema = z.object({
  type: z.enum(['notification', 'email', 'webhook']),
  target: z.string().min(1).max(500).optional(),
  message: z.string().max(1000).optional(),
});

const alertRemediationSchema = z.object({
  type: z.enum(['script', 'restart', 'notify']),
  target: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
});
```

Update `createAlertConfigSchema` and `updateAlertConfigSchema` to use these strict sub-schemas.

#### 1B: Severity & Status Enums

Enforce severity and status values:

```typescript
const alertSeverityEnum = z.enum(['CRITICAL', 'WARNING', 'INFO']);
const alertStatusEnum = z.enum(['Open', 'Acknowledged', 'Resolved']);
```

Apply to:
- `createAlertConfigSchema.severity` (replace `z.string().max(50)`)
- AssetAlert creation (enforce severity from config)
- AssetAlert status updates

#### 1C: Alert Type Enumeration

Whitelist allowed alert types:

```typescript
const alertTypeEnum = z.enum([
  'threshold',     // Numeric comparison (CPU > 90%)
  'boolean',       // Boolean state (Firewall disabled)
  'status-change', // Transition detection (was online, now offline)
]);
```

#### 1D: Asset Alert Management Endpoints

Add new endpoints for cross-asset alert management:

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/v1/alerts` | `assets:view` | List all asset alerts (paginated, filterable) |
| GET | `/v1/alerts/:id` | `assets:view` | Get single alert with full details |
| PUT | `/v1/alerts/:id/acknowledge` | `assets:edit` | Acknowledge alert (set status, record who/when) |
| PUT | `/v1/alerts/:id/resolve` | `assets:edit` | Resolve alert manually (with resolution note) |
| PUT | `/v1/alerts/bulk-acknowledge` | `assets:edit` | Acknowledge multiple alerts at once |
| DELETE | `/v1/alerts/bulk` | `assets:delete` | Delete multiple resolved alerts (cleanup) |

**Query Parameters for `GET /v1/alerts`:**

```typescript
const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO']).optional(),
  status: z.enum(['Open', 'Acknowledged', 'Resolved']).optional(),
  module: z.string().max(100).optional(),
  assetId: z.string().uuid().optional(),
  alertConfigId: z.string().uuid().optional(),
  search: z.string().max(200).optional(), // search in alert name/message
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'severity', 'status', 'module']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

**Acknowledge Request Body:**

```typescript
const acknowledgeAlertSchema = z.object({
  note: z.string().max(500).optional(), // Optional acknowledgment note
});
```

**Resolve Request Body:**

```typescript
const resolveAlertSchema = z.object({
  resolution: z.string().min(1).max(1000), // Required resolution description
});
```

#### 1E: Alert Evaluation Logging

Add structured logging to `alert-evaluation.service.ts`:
- Log when evaluation starts (asset ID, config count)
- Log when condition matches (config name, attribute, actual vs threshold)
- Log when alert is created or auto-resolved
- Replace `.catch(() => {})` with `.catch(err => logger.error({ err, assetId }, 'Alert evaluation failed'))`

**Acceptance Criteria:**

- [ ] `conditions` field rejects objects without required `attribute`, `operator`, `value` keys — returns Zod error listing missing fields
- [ ] `conditions[].attribute` rejects unknown attributes (e.g., `"GPU Temperature"`) — returns `"Invalid enum value"` error
- [ ] `conditions[].operator` rejects unknown operators (e.g., `"LIKE"`, `"BETWEEN"`) — returns `"Invalid enum value"` error
- [ ] `conditions[].value` accepts number (90), boolean (true/false), and string values
- [ ] `conditions[].value` rejects null and undefined
- [ ] `actions` field rejects objects without `type` key
- [ ] `actions[].type` rejects unknown types (e.g., `"sms"`, `"slack"`)
- [ ] `severity` field only accepts `CRITICAL`, `WARNING`, `INFO` — rejects `"Low"`, `"high"`, `"MEDIUM"`, etc.
- [ ] `type` field only accepts `threshold`, `boolean`, `status-change` — rejects `"custom"`, `"freeform"`, etc.
- [ ] `GET /v1/alerts` returns paginated list of all asset alerts across all assets
- [ ] `GET /v1/alerts?severity=CRITICAL&status=Open` filters correctly
- [ ] `GET /v1/alerts?assetId=<uuid>` returns only that asset's alerts
- [ ] `GET /v1/alerts?search=CPU` matches alerts with "CPU" in name or message
- [ ] `PUT /v1/alerts/:id/acknowledge` changes status to `Acknowledged`, records `acknowledgedAt` timestamp and `acknowledgedBy` user ID
- [ ] `PUT /v1/alerts/:id/acknowledge` on an already-acknowledged alert returns 400 "Alert is already acknowledged"
- [ ] `PUT /v1/alerts/:id/acknowledge` on a resolved alert returns 400 "Cannot acknowledge a resolved alert"
- [ ] `PUT /v1/alerts/:id/resolve` changes status to `Resolved`, records `resolvedAt` timestamp and resolution note
- [ ] `PUT /v1/alerts/:id/resolve` requires non-empty `resolution` body field
- [ ] `PUT /v1/alerts/:id/resolve` on an already-resolved alert returns 400 "Alert is already resolved"
- [ ] `PUT /v1/alerts/bulk-acknowledge` with `{ ids: [...] }` acknowledges multiple alerts, skips already-acknowledged
- [ ] `DELETE /v1/alerts/bulk` with `{ ids: [...] }` only deletes alerts with status `Resolved` — returns 400 if any are Open/Acknowledged
- [ ] Alert evaluation errors are logged with asset ID and error details (not silently swallowed)
- [ ] Existing alert configs with loose conditions still evaluate correctly (backward compatibility for in-memory evaluation)
- [ ] New alert configs with strict conditions pass validation and evaluate correctly
- [ ] All alert endpoints are RBAC-protected with correct permissions
- [ ] Alert acknowledge/resolve creates audit log entry

**Test Cases (R1):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| **Condition Validation** | | | |
| T1.1 | Valid threshold condition | `[{ "attribute": "CPU Usage", "operator": ">=", "value": 90 }]` | 201 Created |
| T1.2 | Valid boolean condition | `[{ "attribute": "Firewall Status", "operator": "==", "value": false }]` | 201 Created |
| T1.3 | Valid multi-condition | `[{ "attribute": "CPU Usage", "operator": ">=", "value": 80 }, { "attribute": "Memory Usage", "operator": ">=", "value": 85 }]` | 201 Created |
| T1.4 | Missing attribute key | `[{ "operator": ">=", "value": 90 }]` | 400 Zod: "Required at conditions[0].attribute" |
| T1.5 | Missing operator key | `[{ "attribute": "CPU Usage", "value": 90 }]` | 400 Zod: "Required at conditions[0].operator" |
| T1.6 | Missing value key | `[{ "attribute": "CPU Usage", "operator": ">=" }]` | 400 Zod: "Required at conditions[0].value" |
| T1.7 | Unknown attribute | `[{ "attribute": "GPU Temp", "operator": ">=", "value": 80 }]` | 400 "Invalid enum value" |
| T1.8 | Unknown operator | `[{ "attribute": "CPU Usage", "operator": "LIKE", "value": 90 }]` | 400 "Invalid enum value" |
| T1.9 | Null value | `[{ "attribute": "CPU Usage", "operator": ">=", "value": null }]` | 400 validation error |
| T1.10 | Empty conditions array | `[]` | 201 Created (valid — no conditions = never triggers) |
| **Action Validation** | | | |
| T1.11 | Valid notification action | `[{ "type": "notification", "message": "CPU alert" }]` | 201 Created |
| T1.12 | Valid email action | `[{ "type": "email", "target": "admin@co.com" }]` | 201 Created |
| T1.13 | Unknown action type | `[{ "type": "sms", "target": "+1234" }]` | 400 "Invalid enum value" |
| T1.14 | Missing action type | `[{ "target": "admin@co.com" }]` | 400 Zod: "Required at actions[0].type" |
| **Severity & Type Enums** | | | |
| T1.15 | Valid severity CRITICAL | `severity: "CRITICAL"` | 201 Created |
| T1.16 | Invalid severity "Low" | `severity: "Low"` | 400 "Invalid enum value" |
| T1.17 | Invalid severity "MEDIUM" | `severity: "MEDIUM"` | 400 "Invalid enum value" |
| T1.18 | Valid type threshold | `type: "threshold"` | 201 Created |
| T1.19 | Invalid type custom | `type: "custom"` | 400 "Invalid enum value" |
| **Alert Management** | | | |
| T1.20 | List all alerts | `GET /v1/alerts` | 200 with paginated results |
| T1.21 | Filter by severity | `GET /v1/alerts?severity=CRITICAL` | 200 with only CRITICAL alerts |
| T1.22 | Filter by status | `GET /v1/alerts?status=Open` | 200 with only Open alerts |
| T1.23 | Search by text | `GET /v1/alerts?search=CPU` | 200 with alerts matching "CPU" |
| T1.24 | Acknowledge alert | `PUT /v1/alerts/:id/acknowledge` | 200, status changed, timestamp recorded |
| T1.25 | Double acknowledge | `PUT /v1/alerts/:id/acknowledge` (already ack'd) | 400 "already acknowledged" |
| T1.26 | Resolve alert | `PUT /v1/alerts/:id/resolve { resolution: "Fixed" }` | 200, status changed, resolution saved |
| T1.27 | Resolve without note | `PUT /v1/alerts/:id/resolve {}` | 400 "resolution is required" |
| T1.28 | Resolve already resolved | `PUT /v1/alerts/:id/resolve` (already resolved) | 400 "already resolved" |
| T1.29 | Bulk acknowledge | `PUT /v1/alerts/bulk-acknowledge { ids: [id1, id2] }` | 200, both acknowledged |
| T1.30 | Bulk delete resolved only | `DELETE /v1/alerts/bulk { ids: [resolvedId, openId] }` | 400 "Cannot delete non-resolved alerts" |
| T1.31 | Bulk delete all resolved | `DELETE /v1/alerts/bulk { ids: [resolvedId1, resolvedId2] }` | 200, both deleted |
| T1.32 | RBAC: user cannot acknowledge | User role, `PUT /v1/alerts/:id/acknowledge` | 403 |
| T1.33 | Non-existent alert ID | `PUT /v1/alerts/fake-uuid/acknowledge` | 404 |

---

### R2: Audit Log Completeness (P0 — Must Have)

Apply the `audit()` middleware to every mutating route across all modules. Every POST, PUT, PATCH, and DELETE endpoint must create an `AuditLog` record.

#### 2A: Audit Middleware Application

Apply `audit({ action, resource, getDetails? })` middleware to all mutating routes using the existing `audit()` middleware from `backend/src/middleware/audit.ts`.

**Module → Audit Coverage Map:**

| Module | Mutating Routes | Current Coverage | Target |
|--------|----------------|-----------------|--------|
| Auth | 5 (login, logout, password reset, change, onboarding) | 5/5 (100%) | Maintain |
| Settings | ~30 (org, branch, dept, location, user, role, alert, LDAP, server, mail, proxy, license, vuln pref, risk, remote desktop, agent config) | 0/30 (0%) | 30/30 |
| Assets | ~15 (CRUD, categories, subcategories, tags, licenses, bulk ops) | 2/15 (13%) | 15/15 |
| Patches | ~10 (CRUD, affected products, scan, discover, approve/reject) | 0/10 (0%) | 10/10 |
| Vulnerabilities | ~8 (exceptions CRUD, sync, scan) | 0/8 (0%) | 8/8 |
| Jobs | ~10 (patch jobs, vuln jobs, config catalog, bundles, policies) | 0/10 (0%) | 10/10 |
| Deployments | ~8 (software, patch, config deploy, cancel, rollback, retry) | 0/8 (0%) | 8/8 |
| Discovery | ~8 (IP ranges CRUD, scan, credentials CRUD) | 0/8 (0%) | 8/8 |
| Agents | ~5 (update, delete, collect, command) | 0/5 (0%) | 5/5 |
| Hub | ~8 (package CRUD, upload, scripts, bundles) | 0/8 (0%) | 8/8 |
| Reports | ~3 (generate, delete, export) | 0/3 (0%) | 3/3 |
| Notifications | ~5 (mark read, delete, clear, preferences) | 0/5 (0%) | 5/5 |
| Patch Repository | ~4 (CRUD) | 0/4 (0%) | 4/4 |
| Patch Templates | ~4 (CRUD) | 0/4 (0%) | 4/4 |
| AI | ~2 (config, chat actions) | 0/2 (0%) | 2/2 |
| **Alerts** (R1 new) | ~5 (acknowledge, resolve, bulk ops) | 0/5 (0%) | 5/5 |
| **Integrations** (R5 new) | ~5 (CRUD, toggle) | 0/5 (0%) | 5/5 |
| **TOTAL** | ~135 | ~7/135 (5%) | **135/135 (100%)** |

#### 2B: Audit Detail Enrichment

For critical operations, capture before/after state using the `diffObjects()` helper:

| Operation Type | Detail Fields to Capture |
|---------------|------------------------|
| CREATE | Full created record (sanitized — no passwords/tokens) |
| UPDATE | Before/after diff (only changed fields) |
| DELETE | ID and name of deleted record |
| STATUS_CHANGE | Old status → New status, reason |
| DEPLOY | Deployment name, target assets, package version |
| SCAN | Scan type, scope, asset count |
| SYNC | Sync type (incremental/full), source, CVE count |
| APPROVE/REJECT | Item ID, approver, reason |

#### 2C: Sensitive Field Redaction

Ensure audit logs never contain:
- Passwords (plain or hashed)
- JWT tokens (access or refresh)
- API keys / secrets
- License codes (show last 4 chars only: `****-****-XXXX`)
- SMTP passwords
- LDAP bind passwords

Use the existing `redactSensitiveFields()` helper in `audit-logger.ts`, extending it for new field names.

**Acceptance Criteria:**

- [ ] Every `POST` endpoint (except auth exclusions) creates an audit log with action `CREATE` and the correct resource type
- [ ] Every `PUT`/`PATCH` endpoint creates an audit log with action `UPDATE` and before/after diff
- [ ] Every `DELETE` endpoint creates an audit log with action `DELETE` and the deleted resource ID
- [ ] Special actions use correct action types: `DEPLOY` for deployments, `SCAN` for vulnerability scans, `SYNC` for CVE sync, `APPROVE`/`REJECT` for approvals
- [ ] `GET /v1/settings/audit` returns audit logs with correct filtering by action, resource, userId, date range
- [ ] `GET /v1/settings/audit?resource=PATCH&action=CREATE&startDate=2026-02-13` returns only patch creation events from today
- [ ] Audit log entries contain: `userId`, `action`, `resource`, `resourceId`, `details` (JSON), `ipAddress`, `userAgent`, `timestamp`
- [ ] Passwords, tokens, API keys, and license codes are NEVER stored in audit log details
- [ ] License code in audit log shows `"****-****-XXXX"` (last 4 chars only)
- [ ] SMTP password in audit log shows `"[REDACTED]"`
- [ ] Creating a user → audit log shows `action: "CREATE", resource: "USER", details: { email, name, roleId }` (no password)
- [ ] Updating a role's permissions → audit log shows `action: "UPDATE", resource: "ROLE", details: { before: {...}, after: {...} }`
- [ ] Deleting an asset → audit log shows `action: "DELETE", resource: "ASSET", details: { id, hostname }`
- [ ] Triggering a CVE sync → audit log shows `action: "SYNC", resource: "VULNERABILITY", details: { type: "incremental" }`
- [ ] Triggering a vulnerability scan → audit log shows `action: "SCAN", resource: "VULNERABILITY", details: { scope: "ALL" }`
- [ ] Acknowledging an alert → audit log shows `action: "UPDATE", resource: "ALERT", details: { status: "Acknowledged", note: "..." }`
- [ ] Audit log `GET` endpoint is RBAC-protected with `settings:view`
- [ ] Failed mutations (4xx responses) do NOT create audit logs (only successful operations)

**Test Cases (R2):**

| ID | Test | Action | Expected Audit Log |
|----|------|--------|-------------------|
| **Settings Module** | | | |
| T2.1 | Create organization | `POST /v1/settings/organizations` | `action: CREATE, resource: SETTINGS, resourceId: orgId` |
| T2.2 | Update organization | `PUT /v1/settings/organizations/:id` | `action: UPDATE, resource: SETTINGS, details: { before, after }` |
| T2.3 | Delete organization | `DELETE /v1/settings/organizations/:id` | `action: DELETE, resource: SETTINGS, resourceId: orgId` |
| T2.4 | Create user | `POST /v1/settings/users` | `action: CREATE, resource: USER, details: { email, name }` (no password) |
| T2.5 | Update user role | `PUT /v1/settings/users/:id` | `action: UPDATE, resource: USER, details: { roleId: { before, after } }` |
| T2.6 | Delete user | `DELETE /v1/settings/users/:id` | `action: DELETE, resource: USER` |
| T2.7 | Create role | `POST /v1/settings/roles` | `action: CREATE, resource: ROLE` |
| T2.8 | Update role permissions | `PUT /v1/settings/roles/:id` | `action: UPDATE, resource: ROLE, details: { permissions diff }` |
| T2.9 | Delete role | `DELETE /v1/settings/roles/:id` | `action: DELETE, resource: ROLE` |
| T2.10 | Update mail server | `PUT /v1/settings/mail` | `action: UPDATE, resource: SETTINGS, details: { host, port }` (password REDACTED) |
| T2.11 | Update license | `PUT /v1/settings/platform-license` | `action: UPDATE, resource: SETTINGS, details: { licenseCode: "****-XXXX" }` |
| **Assets Module** | | | |
| T2.12 | Create asset | `POST /v1/assets` | `action: CREATE, resource: ASSET` |
| T2.13 | Update asset | `PUT /v1/assets/:id` | `action: UPDATE, resource: ASSET` |
| T2.14 | Delete asset | `DELETE /v1/assets/:id` | `action: DELETE, resource: ASSET` |
| T2.15 | Bulk delete assets | `POST /v1/assets/bulk` | `action: DELETE, resource: ASSET, details: { count: N }` |
| **Patches Module** | | | |
| T2.16 | Create patch | `POST /v1/patches` | `action: CREATE, resource: PATCH` |
| T2.17 | Update patch | `PUT /v1/patches/:id` | `action: UPDATE, resource: PATCH` |
| T2.18 | Delete patch | `DELETE /v1/patches/:id` | `action: DELETE, resource: PATCH` |
| **Deployments Module** | | | |
| T2.19 | Create deployment | `POST /v1/deployments/software` | `action: DEPLOY, resource: DEPLOYMENT` |
| T2.20 | Cancel deployment | `POST /v1/deployments/software/:id/cancel` | `action: UPDATE, resource: DEPLOYMENT, details: { status: "CANCELLED" }` |
| **Vulnerabilities Module** | | | |
| T2.21 | Trigger CVE sync | `POST /v1/vulnerabilities/sync` | `action: SYNC, resource: VULNERABILITY` |
| T2.22 | Create exception | `POST /v1/vulnerabilities/exceptions` | `action: CREATE, resource: VULNERABILITY` |
| **Discovery Module** | | | |
| T2.23 | Create IP range | `POST /v1/discovery/ip-ranges` | `action: CREATE, resource: DISCOVERY` |
| T2.24 | Trigger scan | `POST /v1/discovery/ip-ranges/:id/scan` | `action: SCAN, resource: DISCOVERY` |
| **Agents Module** | | | |
| T2.25 | Delete agent | `DELETE /v1/agents/:id` | `action: DELETE, resource: AGENT` |
| T2.26 | Trigger collection | `POST /v1/agents/:id/collect` | `action: UPDATE, resource: AGENT` |
| **Hub Module** | | | |
| T2.27 | Create package | `POST /v1/hub/packages` | `action: CREATE, resource: HUB` |
| T2.28 | Delete package | `DELETE /v1/hub/packages/:id` | `action: DELETE, resource: HUB` |
| **Cross-Cutting** | | | |
| T2.29 | Failed mutation — no audit | `POST /v1/assets` with invalid body (400) | No audit log created for this request |
| T2.30 | Redaction — password | Create user with password | Audit log details contain NO password field |
| T2.31 | Redaction — token | Login event | Audit log details do not contain the JWT token value |
| T2.32 | Audit query — by resource | `GET /v1/settings/audit?resource=ASSET` | Returns only ASSET audit entries |
| T2.33 | Audit query — by date range | `GET /v1/settings/audit?startDate=...&endDate=...` | Returns entries within range only |
| T2.34 | Audit query — by user | `GET /v1/settings/audit?userId=<uuid>` | Returns only that user's actions |
| T2.35 | RBAC: user denied audit | User role, `GET /v1/settings/audit` | 403 Forbidden |

---

### R3: License Validation (P0 — Must Have)

Replace the fake license stub with a proper local validation engine. Design for future remote validation but implement local-first.

#### 3A: License Code Format

Define a standardized license code format:

```
Format: PIQE-XXXX-XXXX-XXXX-XXXX
        ^^^^ ^^^^ ^^^^ ^^^^ ^^^^
        |    |    |    |    └── Checksum (4 hex chars)
        |    |    |    └────── Random segment 3
        |    |    └─────────── Random segment 2
        |    └──────────────── Random segment 1
        └───────────────────── Product prefix (PIQE=Enterprise, PIQP=Professional, PIQT=Trial)
```

**Validation Rules:**
- Must match regex: `^PIQ[EPT]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$`
- Last 4 characters are a CRC-16 checksum of the first 19 characters
- Product prefix determines license type: `PIQE` = Enterprise, `PIQP` = Professional, `PIQT` = Trial

#### 3B: License Data Model

Extend the `Setting` table approach (keep using `category: 'license'` for compatibility) but add computed fields:

| Setting Key | Type | Description | Source |
|-------------|------|-------------|--------|
| `license.licenseTo` | string | Licensee name | Embedded in code or manually set |
| `license.licenseType` | enum | `Trial`, `Professional`, `Enterprise` | Derived from product prefix |
| `license.activationCode` | string | The license code itself | User input |
| `license.productCode` | string | `PATCHIQ` | Constant |
| `license.productVersion` | string | `1.0.0` | From package.json |
| `license.issueDate` | date | When license was activated | Activation timestamp |
| `license.expiresOn` | date | Expiry date | Trial: +30 days, Pro: +365 days, Enterprise: +365 days |
| `license.numberOfEndpoints` | number | Max allowed endpoints | Trial: 25, Pro: 100, Enterprise: 10000 |
| `license.usedEndpoints` | number | Currently registered agent count | Computed from Agent table |
| `license.remainingDays` | number | Days until expiry | Computed |
| `license.remainingEndpoints` | number | Remaining endpoint slots | Computed |
| `license.status` | enum | `ACTIVE`, `EXPIRED`, `EXCEEDED`, `TRIAL` | Computed |

#### 3C: License Enforcement Points

| Enforcement | Trigger | Behavior |
|-------------|---------|----------|
| Agent registration | New agent tries to register | If `usedEndpoints >= numberOfEndpoints`: reject registration with 403 "License endpoint limit reached" |
| License expiry | Any API request (lightweight check) | If `expiresOn < now`: add `X-License-Status: EXPIRED` header to responses (warn, don't block) |
| License activation | `PUT /v1/settings/platform-license` | Validate format, checksum, store, return license info |
| License status | `GET /v1/settings/platform-license` | Return computed license data with real endpoint count |

#### 3D: License Helper Functions

```typescript
// backend/src/modules/settings/license.service.ts

function validateLicenseFormat(code: string): { valid: boolean; error?: string }
function computeChecksum(codeWithoutChecksum: string): string
function getLicenseType(code: string): 'Trial' | 'Professional' | 'Enterprise'
function getLicenseEndpointLimit(type: string): number
function getLicenseExpiryDays(type: string): number
function computeLicenseStatus(license: LicenseData): 'ACTIVE' | 'EXPIRED' | 'EXCEEDED' | 'TRIAL'
```

**Acceptance Criteria:**

- [ ] Valid license code `PIQE-XXXX-XXXX-XXXX-<valid-checksum>` activates successfully — returns 200 with license data
- [ ] Invalid format (wrong prefix, wrong length, lowercase) rejected with 400 "Invalid license code format"
- [ ] Invalid checksum (last 4 chars don't match CRC-16) rejected with 400 "Invalid license code: checksum mismatch"
- [ ] Empty string rejected with 400
- [ ] `PIQT-*` license sets type to `Trial`, 25 endpoints, 30-day expiry
- [ ] `PIQP-*` license sets type to `Professional`, 100 endpoints, 365-day expiry
- [ ] `PIQE-*` license sets type to `Enterprise`, 10000 endpoints, 365-day expiry
- [ ] `GET /v1/settings/platform-license` returns `usedEndpoints` as real count from Agent table (not hardcoded 0)
- [ ] `GET /v1/settings/platform-license` returns computed `remainingDays` (not stored, calculated each time)
- [ ] `GET /v1/settings/platform-license` returns computed `remainingEndpoints` (numberOfEndpoints - usedEndpoints)
- [ ] `GET /v1/settings/platform-license` returns `status: "EXPIRED"` when expiresOn is in the past
- [ ] `GET /v1/settings/platform-license` returns `status: "EXCEEDED"` when usedEndpoints > numberOfEndpoints
- [ ] `GET /v1/settings/platform-license` returns `status: "TRIAL"` when licenseType is Trial
- [ ] `GET /v1/settings/platform-license` returns `status: "ACTIVE"` when license is valid and within limits
- [ ] Re-activating with a different valid code overwrites the previous license
- [ ] Activating license creates audit log entry (license code redacted to last 4 chars)
- [ ] License endpoint is RBAC-protected with `settings:view` (GET) and `settings:edit` (PUT)
- [ ] When no license is activated, returns default Trial license data
- [ ] License data persists across server restarts (stored in Setting table)

**Test Cases (R3):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| **Format Validation** | | | |
| T3.1 | Valid enterprise code | `PIQE-AB12-CD34-EF56-<valid>` | 200, type=Enterprise |
| T3.2 | Valid professional code | `PIQP-AB12-CD34-EF56-<valid>` | 200, type=Professional |
| T3.3 | Valid trial code | `PIQT-AB12-CD34-EF56-<valid>` | 200, type=Trial |
| T3.4 | Wrong prefix | `PIQA-AB12-CD34-EF56-GH78` | 400 "Invalid license code format" |
| T3.5 | Too short | `PIQE-AB12` | 400 "Invalid license code format" |
| T3.6 | Too long | `PIQE-AB12-CD34-EF56-GH78-IJ90` | 400 "Invalid license code format" |
| T3.7 | Lowercase | `piqe-ab12-cd34-ef56-gh78` | 400 "Invalid license code format" |
| T3.8 | Missing dashes | `PIQEAB12CD34EF56GH78` | 400 "Invalid license code format" |
| T3.9 | Invalid characters | `PIQE-AB!@-CD#$-EF%^-GH&*` | 400 "Invalid license code format" |
| T3.10 | Empty string | `""` | 400 |
| T3.11 | Bad checksum | `PIQE-AB12-CD34-EF56-0000` (wrong checksum) | 400 "checksum mismatch" |
| **License Type Behavior** | | | |
| T3.12 | Trial limits | Activate `PIQT-*` | `numberOfEndpoints: 25, expiresOn: +30 days` |
| T3.13 | Professional limits | Activate `PIQP-*` | `numberOfEndpoints: 100, expiresOn: +365 days` |
| T3.14 | Enterprise limits | Activate `PIQE-*` | `numberOfEndpoints: 10000, expiresOn: +365 days` |
| **Computed Fields** | | | |
| T3.15 | Used endpoints count | 3 agents registered | `usedEndpoints: 3` |
| T3.16 | Remaining endpoints | 25 limit, 3 used | `remainingEndpoints: 22` |
| T3.17 | Remaining days | Activated today, 30-day trial | `remainingDays: 30` (or 29 depending on time) |
| T3.18 | Expired status | License with past expiresOn | `status: "EXPIRED"` |
| T3.19 | Exceeded status | More agents than license allows | `status: "EXCEEDED"` |
| T3.20 | Active status | Valid license within limits | `status: "ACTIVE"` |
| T3.21 | Default (no license) | No license activated | `status: "TRIAL", licenseType: "Trial"` |
| **Edge Cases** | | | |
| T3.22 | Re-activate | Activate code A, then activate code B | License B is active, license A overwritten |
| T3.23 | RBAC: user denied | User role, `PUT /v1/settings/platform-license` | 403 |
| T3.24 | RBAC: user can view | User role, `GET /v1/settings/platform-license` | Depends on settings permission |
| T3.25 | Audit log on activate | Activate valid license | Audit log with `action: UPDATE, resource: SETTINGS, details: { licenseCode: "****-<last4>" }` |

---

### R4: Vulnerability Preference Verification (P0 — Must Have)

Verify that all Pipeline 1 vulnerability features continue to work correctly after Pipeline 2A RBAC changes.

**Scope:** This is a verification requirement, not a build requirement. The features exist — we need to prove they still work.

**Features to Verify:**

| Feature | Endpoint | Permission | Verification |
|---------|----------|------------|-------------|
| CVE sync status | `GET /v1/vulnerabilities/sync/status` | `vulnerabilities:view` | Returns sync status |
| Incremental CVE sync | `POST /v1/vulnerabilities/sync` | `vulnerabilities:edit` | Queues sync job |
| Full CVE sync | `POST /v1/vulnerabilities/sync/full` | `vulnerabilities:edit` | Queues full sync |
| Vulnerability list | `GET /v1/vulnerabilities` | `vulnerabilities:view` | Returns paginated CVEs |
| Zero-day list | `GET /v1/vulnerabilities/zero-day` | `vulnerabilities:view` | Returns zero-day CVEs |
| Vulnerability stats | `GET /v1/vulnerabilities/stats` | `vulnerabilities:view` | Returns aggregated counts |
| Exception create | `POST /v1/vulnerabilities/exceptions` | `vulnerabilities:add` | Creates exception |
| Exception update | `PUT /v1/vulnerabilities/exceptions/:id` | `vulnerabilities:edit` | Updates exception |
| Exception delete | `DELETE /v1/vulnerabilities/exceptions/:id` | `vulnerabilities:delete` | Soft-deletes exception |
| Scan trigger | `POST /v1/vulnerabilities/scan` | `vulnerabilities:edit` | Queues vulnerability scan |
| DB sync config | `GET /v1/settings/vulnerability-db` | `settings:view` | Returns sync schedule |
| DB sync update | `PUT /v1/settings/vulnerability-db` | `settings:edit` | Updates sync schedule |

**Acceptance Criteria:**

- [ ] Admin can view, trigger sync, create/manage exceptions — all return 200
- [ ] User role can view vulnerabilities but cannot trigger sync or manage exceptions — 403 on write operations
- [ ] Custom role with `vulnerabilities: { view: true, add: false, edit: false, delete: false }` can only GET — all POST/PUT/DELETE return 403
- [ ] CVE data from Pipeline 1 is still queryable (3,444+ CVEs if previously synced)
- [ ] Vulnerability stats endpoint returns correct severity distribution
- [ ] Exception CRUD still works: create, read, update, soft-delete
- [ ] Vulnerability DB sync settings (`GET /v1/settings/vulnerability-db`) returns schedule config
- [ ] Zero-day dynamic classification still works (CISA KEV + EPSS criteria)

**Test Cases (R4):**

| ID | Test | User | Action | Expected |
|----|------|------|--------|----------|
| T4.1 | Admin view vulnerabilities | Admin | `GET /v1/vulnerabilities` | 200 with CVE list |
| T4.2 | Admin view zero-days | Admin | `GET /v1/vulnerabilities/zero-day` | 200 |
| T4.3 | Admin view stats | Admin | `GET /v1/vulnerabilities/stats` | 200 with severity counts |
| T4.4 | Admin trigger sync | Admin | `POST /v1/vulnerabilities/sync` | 200/202 |
| T4.5 | Admin create exception | Admin | `POST /v1/vulnerabilities/exceptions` | 201 |
| T4.6 | User denied sync | User | `POST /v1/vulnerabilities/sync` | 403 |
| T4.7 | User denied exception create | User | `POST /v1/vulnerabilities/exceptions` | 403 |
| T4.8 | User allowed view | User | `GET /v1/vulnerabilities` | 200 |
| T4.9 | Vuln DB sync settings view | Admin | `GET /v1/settings/vulnerability-db` | 200 |
| T4.10 | Vuln DB sync settings denied | User | `PUT /v1/settings/vulnerability-db` | 403 |

---

### R5: Marketplace / Integrations CRUD (P0 — Must Have)

Build the complete integrations feature from scratch — database model, service, controller, routes, validators.

#### 5A: Database Model

Add an `Integration` model to the Prisma schema:

```prisma
model Integration {
  id          String   @id @default(uuid())
  name        String
  description String?
  type        String                    // siem, ticketing, notification, monitoring, backup
  enabled     Boolean  @default(false)
  iconUrl     String?  @map("icon_url")
  config      Json?                     // Connection details (encrypted sensitive fields)
  status      String   @default("disconnected")  // connected, disconnected, error
  lastChecked DateTime? @map("last_checked")
  createdBy   String?  @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([name])
  @@index([type])
  @@index([enabled])
  @@map("integrations")
}
```

#### 5B: Integration Types

```typescript
const integrationTypeEnum = z.enum([
  'siem',           // Splunk, ELK, QRadar
  'ticketing',      // Jira, ServiceNow, Zendesk
  'notification',   // Slack, Teams, PagerDuty
  'monitoring',     // Nagios, Zabbix, Datadog
  'backup',         // Veeam, Acronis
  'custom',         // User-defined
]);
```

#### 5C: REST Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/v1/settings/integrations` | `settings:view` | List all integrations (paginated) |
| GET | `/v1/settings/integrations/:id` | `settings:view` | Get single integration |
| POST | `/v1/settings/integrations` | `settings:add` | Create new integration |
| PUT | `/v1/settings/integrations/:id` | `settings:edit` | Update integration |
| DELETE | `/v1/settings/integrations/:id` | `settings:delete` | Delete integration |
| PUT | `/v1/settings/integrations/:id/toggle` | `settings:edit` | Enable/disable integration |
| POST | `/v1/settings/integrations/:id/test` | `settings:edit` | Test connection (returns status) |

#### 5D: Validators

Use the existing schemas in `settings.validators.ts` (already defined but unused), enhanced with type enum:

```typescript
const createIntegrationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  type: integrationTypeEnum,
  enabled: z.boolean().default(false),
  iconUrl: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
});

const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional(),
  iconUrl: z.string().url().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

const toggleIntegrationStatusSchema = z.object({
  enabled: z.boolean(),
});
```

#### 5E: Service Implementation

Create `IntegrationCrudService` extending `BaseCrudService`:

```typescript
class IntegrationCrudService extends BaseCrudService<Integration> {
  protected transform(record: Integration): IntegrationResponse { ... }

  async testConnection(id: string): Promise<{ status: string; message: string }> {
    // For v1: validate config shape, return "Config validated"
    // Future: actually test connection to external service
  }
}
```

**Acceptance Criteria:**

- [ ] `POST /v1/settings/integrations` creates integration with valid data — returns 201 with created record
- [ ] `POST /v1/settings/integrations` with duplicate name — returns 409 "Integration with name 'X' already exists"
- [ ] `POST /v1/settings/integrations` with invalid type — returns 400 "Invalid enum value"
- [ ] `POST /v1/settings/integrations` with missing name — returns 400 Zod error
- [ ] `GET /v1/settings/integrations` returns paginated list of all integrations
- [ ] `GET /v1/settings/integrations/:id` returns single integration with full details
- [ ] `GET /v1/settings/integrations/:id` with non-existent ID — returns 404
- [ ] `PUT /v1/settings/integrations/:id` updates fields — returns 200 with updated record
- [ ] `PUT /v1/settings/integrations/:id` with duplicate name — returns 409
- [ ] `DELETE /v1/settings/integrations/:id` deletes integration — returns 200
- [ ] `DELETE /v1/settings/integrations/:id` with non-existent ID — returns 404
- [ ] `PUT /v1/settings/integrations/:id/toggle { enabled: true }` enables integration
- [ ] `PUT /v1/settings/integrations/:id/toggle { enabled: false }` disables integration without deleting config
- [ ] `POST /v1/settings/integrations/:id/test` returns connection test result with status and message
- [ ] All integration endpoints are RBAC-protected with `settings:*` permissions
- [ ] User role cannot access integration endpoints — 403
- [ ] Integration CRUD operations create audit log entries
- [ ] Integration config with sensitive fields (passwords, API keys) is stored but redacted in audit logs
- [ ] Prisma migration creates `integrations` table with correct columns and indexes
- [ ] Unique constraint on `name` prevents duplicates at DB level

**Test Cases (R5):**

| ID | Test | Input | Expected |
|----|------|-------|----------|
| **CRUD Operations** | | | |
| T5.1 | Create SIEM integration | `{ name: "Splunk SIEM", type: "siem", enabled: false, config: { host: "splunk.local", port: 8089 } }` | 201 |
| T5.2 | Create ticketing integration | `{ name: "Jira", type: "ticketing", config: { url: "https://jira.co", apiKey: "abc" } }` | 201 |
| T5.3 | Create with missing name | `{ type: "siem" }` | 400 "Required at name" |
| T5.4 | Create with invalid type | `{ name: "Foo", type: "blockchain" }` | 400 "Invalid enum value" |
| T5.5 | Create duplicate name | Create "Splunk SIEM" twice | 409 "already exists" |
| T5.6 | Get all integrations | `GET /v1/settings/integrations` | 200 with list |
| T5.7 | Get single integration | `GET /v1/settings/integrations/:id` | 200 with full details |
| T5.8 | Get non-existent | `GET /v1/settings/integrations/fake-id` | 404 |
| T5.9 | Update name | `PUT { name: "Splunk SIEM v2" }` | 200, name updated |
| T5.10 | Update config | `PUT { config: { host: "new-host", port: 9090 } }` | 200, config updated |
| T5.11 | Delete integration | `DELETE /v1/settings/integrations/:id` | 200 |
| T5.12 | Delete non-existent | `DELETE /v1/settings/integrations/fake-id` | 404 |
| **Toggle & Test** | | | |
| T5.13 | Enable integration | `PUT /:id/toggle { enabled: true }` | 200, `enabled: true` |
| T5.14 | Disable integration | `PUT /:id/toggle { enabled: false }` | 200, `enabled: false`, config preserved |
| T5.15 | Test connection | `POST /:id/test` | 200, `{ status: "validated", message: "..." }` |
| T5.16 | Test non-existent | `POST /fake-id/test` | 404 |
| **RBAC** | | | |
| T5.17 | Admin CRUD | Admin user, all operations | All succeed |
| T5.18 | User denied create | User role, `POST /v1/settings/integrations` | 403 |
| T5.19 | User denied view | User role, `GET /v1/settings/integrations` | 403 (settings denied) |
| T5.20 | User denied delete | User role, `DELETE /v1/settings/integrations/:id` | 403 |
| **Audit** | | | |
| T5.21 | Create audit | Create integration | Audit log: `action: CREATE, resource: SETTINGS` |
| T5.22 | Update audit | Update integration | Audit log: `action: UPDATE, resource: SETTINGS` |
| T5.23 | Delete audit | Delete integration | Audit log: `action: DELETE, resource: SETTINGS` |
| T5.24 | Toggle audit | Toggle integration | Audit log: `action: UPDATE, resource: SETTINGS, details: { enabled: before/after }` |

---

### R6: Notification Preference Consistency (P1 — Should Have)

Verify and harden notification preferences to ensure they are consistently enforced.

#### 6A: Preference Enforcement Verification

Verify that notification creation respects user preferences:

| Category | In-App Default | Email Default | Test Scenario |
|----------|---------------|---------------|---------------|
| AGENT | true | false | New agent registration → in-app notification appears, no email sent |
| DEPLOYMENT | true | false | Deployment complete → in-app notification, no email |
| VULNERABILITY | true | true | CVE sync complete → in-app + email |
| ALERT | true | true | Alert triggered → in-app + email |
| SYSTEM | true | false | System event → in-app only |

#### 6B: Preference Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| User has no NotificationPreference record | Defaults apply (see 6A table) |
| User disables ALL in-app | No in-app notifications; notification count stays 0 |
| User disables ALL email | No email notifications; in-app still works |
| User disables both for a category | Neither in-app nor email for that category |
| Broadcast notification when user disabled in-app for category | Notification NOT created for that user (skip, don't create + hide) |
| Email notification when SMTP not configured | Email silently fails (fire-and-forget), in-app still delivered |
| SSE not connected when notification created | Notification stored in DB, delivered when user next polls |

#### 6C: Preference Validator Hardening

Ensure the preference update validator in `notifications.validators.ts` rejects invalid field names:

```typescript
const updatePreferencesSchema = z.object({
  agentInApp: z.boolean().optional(),
  agentEmail: z.boolean().optional(),
  deploymentInApp: z.boolean().optional(),
  deploymentEmail: z.boolean().optional(),
  vulnerabilityInApp: z.boolean().optional(),
  vulnerabilityEmail: z.boolean().optional(),
  alertInApp: z.boolean().optional(),
  alertEmail: z.boolean().optional(),
  systemInApp: z.boolean().optional(),
  systemEmail: z.boolean().optional(),
}).strict(); // Reject unknown keys like "smsNotification"
```

**Acceptance Criteria:**

- [ ] User with `agentInApp: false` does NOT receive in-app notifications for AGENT category
- [ ] User with `agentEmail: false` does NOT receive email for AGENT category
- [ ] User with `alertEmail: true` receives email when alert triggers (if SMTP configured)
- [ ] User with no NotificationPreference record receives defaults (agent: in-app only, alert: in-app + email, etc.)
- [ ] Updating preferences with unknown keys (e.g., `{ smsNotification: true }`) rejected by strict validation
- [ ] Updating preferences with wrong types (e.g., `{ agentInApp: "yes" }`) rejected with Zod error
- [ ] `GET /v1/notifications/preferences` returns current preferences (or defaults if none set)
- [ ] `PUT /v1/notifications/preferences` upserts preferences — creates record if none exists
- [ ] Notification preferences are per-user — User A's preferences don't affect User B
- [ ] All notification preference endpoints are RBAC-protected with `notifications:view/edit`
- [ ] Broadcast notifications respect per-user preferences (users who disabled the category don't get it)

**Test Cases (R6):**

| ID | Test | Setup | Expected |
|----|------|-------|----------|
| T6.1 | Default preferences | New user, no preference record | `GET` returns all defaults |
| T6.2 | Update single preference | `PUT { agentEmail: true }` | Preference saved, others unchanged |
| T6.3 | Update multiple | `PUT { agentEmail: true, deploymentInApp: false }` | Both saved |
| T6.4 | Unknown key rejected | `PUT { smsNotification: true }` | 400 "Unrecognized key" |
| T6.5 | Wrong type rejected | `PUT { agentInApp: "yes" }` | 400 "Expected boolean" |
| T6.6 | Preference isolation | User A sets `agentInApp: false`, User B unchanged | User B still gets agent notifications |
| T6.7 | RBAC: user can view own | User role, `GET /v1/notifications/preferences` | 200 |
| T6.8 | RBAC: user can edit own | User role, `PUT /v1/notifications/preferences` | 200 |

---

### R7: End-to-End Validation Script (P0 — Must Have)

Create a comprehensive validation script that proves all Pipeline 2G features work together, including cross-feature interactions and edge cases.

**Location**: `backend/scripts/validate-pipeline-2g.ts`

**Script Architecture:**

```
1. Preflight
   - Verify backend is running (health check)
   - Login as admin, get JWT token
   - Record starting audit log count

2. Phase 1: Alert Config Hardening (R1)
   - Test condition validation (valid/invalid)
   - Test severity/type enum enforcement
   - Create valid alert config
   - Verify alert evaluation (if agents exist)
   - Test alert management endpoints (list, acknowledge, resolve)
   - Test bulk operations

3. Phase 2: Audit Log Completeness (R2)
   - Perform mutations across 8+ modules
   - Query audit logs to verify each mutation was recorded
   - Verify sensitive field redaction
   - Verify failed mutations don't create audit logs

4. Phase 3: License Validation (R3)
   - Test format validation (valid/invalid codes)
   - Test checksum verification
   - Test license type behavior (Trial/Pro/Enterprise)
   - Verify computed fields (used endpoints, remaining days)
   - Verify re-activation overwrites

5. Phase 4: Vulnerability Preference Verification (R4)
   - Verify all vulnerability endpoints work with RBAC
   - Test admin vs user access patterns
   - Verify stats, exceptions, sync status

6. Phase 5: Integrations CRUD (R5)
   - Full CRUD lifecycle (create, read, update, delete)
   - Test duplicate name prevention
   - Test toggle enable/disable
   - Test connection test endpoint
   - Test RBAC enforcement

7. Phase 6: Notification Preferences (R6)
   - Verify default preferences
   - Test preference update
   - Test strict validation (unknown keys rejected)

8. Phase 7: Cross-Feature Interactions
   - Create integration → verify audit log created
   - Activate license → verify audit log created with redacted code
   - Acknowledge alert → verify audit log created
   - Update notification preferences → verify audit log created
   - Create alert config → verify audit log created
   - Verify RBAC on all new endpoints (user denied, admin allowed)

9. Cleanup
   - Delete test data (integrations, alert configs, test alerts)
   - Print summary

10. Report
    - Print pass/fail for each scenario
    - Print summary: "X/Y PASS"
    - Exit 0 on all-pass, exit 1 on any failure
```

**Validation Scenarios (minimum 60):**

| # | Phase | Scenario | Expected |
|---|-------|----------|----------|
| **Alert Config Hardening (R1)** | | | |
| V1 | R1 | Valid threshold alert config created | 201 |
| V2 | R1 | Valid boolean alert config created | 201 |
| V3 | R1 | Missing condition attribute rejected | 400 |
| V4 | R1 | Unknown condition attribute rejected | 400 |
| V5 | R1 | Unknown condition operator rejected | 400 |
| V6 | R1 | Invalid severity rejected | 400 |
| V7 | R1 | Invalid type rejected | 400 |
| V8 | R1 | Unknown action type rejected | 400 |
| V9 | R1 | List all alerts returns results | 200 |
| V10 | R1 | Filter alerts by severity works | 200, filtered |
| V11 | R1 | Filter alerts by status works | 200, filtered |
| V12 | R1 | Acknowledge alert changes status | 200 |
| V13 | R1 | Double acknowledge rejected | 400 |
| V14 | R1 | Resolve alert with note | 200 |
| V15 | R1 | Resolve without note rejected | 400 |
| V16 | R1 | Bulk acknowledge works | 200 |
| V17 | R1 | Bulk delete only resolved alerts | 200 or 400 |
| V18 | R1 | Non-existent alert returns 404 | 404 |
| **Audit Log Completeness (R2)** | | | |
| V19 | R2 | Settings org create → audit logged | Audit log found |
| V20 | R2 | Settings org update → audit logged | Audit log with diff |
| V21 | R2 | Settings org delete → audit logged | Audit log found |
| V22 | R2 | Role create → audit logged | Audit log found |
| V23 | R2 | Role update → audit logged | Audit log with diff |
| V24 | R2 | Alert config create → audit logged | Audit log found |
| V25 | R2 | Integration create → audit logged | Audit log found |
| V26 | R2 | License activate → audit logged with redaction | Audit log found, code redacted |
| V27 | R2 | Failed mutation → no audit log | No audit entry |
| V28 | R2 | Audit query by resource filter works | Filtered results |
| V29 | R2 | Audit query by date range works | Filtered results |
| V30 | R2 | Audit query by action filter works | Filtered results |
| V31 | R2 | Password redacted from user create audit | No password in details |
| **License Validation (R3)** | | | |
| V32 | R3 | Valid enterprise license activates | 200, type=Enterprise |
| V33 | R3 | Valid trial license activates | 200, type=Trial |
| V34 | R3 | Invalid format rejected | 400 |
| V35 | R3 | Invalid checksum rejected | 400 |
| V36 | R3 | Empty code rejected | 400 |
| V37 | R3 | Wrong prefix rejected | 400 |
| V38 | R3 | Get license returns computed fields | `usedEndpoints`, `remainingDays`, `status` present |
| V39 | R3 | Re-activation overwrites previous | New license data returned |
| V40 | R3 | Default license is Trial | `licenseType: "Trial"` |
| **Vulnerability Preference Verification (R4)** | | | |
| V41 | R4 | Admin views vulnerabilities | 200 |
| V42 | R4 | Admin views stats | 200 |
| V43 | R4 | Admin views sync status | 200 |
| V44 | R4 | User denied sync trigger | 403 |
| V45 | R4 | User allowed vulnerability view | 200 |
| V46 | R4 | Vuln DB sync settings accessible | 200 |
| V47 | R4 | User denied vuln DB settings edit | 403 |
| **Integrations CRUD (R5)** | | | |
| V48 | R5 | Create SIEM integration | 201 |
| V49 | R5 | Create ticketing integration | 201 |
| V50 | R5 | Create with duplicate name rejected | 409 |
| V51 | R5 | Create with invalid type rejected | 400 |
| V52 | R5 | Create with missing name rejected | 400 |
| V53 | R5 | Get all integrations | 200, list includes created |
| V54 | R5 | Get single integration | 200, full details |
| V55 | R5 | Update integration name | 200, name updated |
| V56 | R5 | Toggle enable | 200, enabled=true |
| V57 | R5 | Toggle disable preserves config | 200, enabled=false, config intact |
| V58 | R5 | Test connection | 200, status returned |
| V59 | R5 | Delete integration | 200 |
| V60 | R5 | Delete non-existent | 404 |
| **Notification Preferences (R6)** | | | |
| V61 | R6 | Get default preferences | 200, defaults returned |
| V62 | R6 | Update single preference | 200, saved |
| V63 | R6 | Unknown key rejected | 400 |
| V64 | R6 | Wrong type rejected | 400 |
| **Cross-Feature & RBAC (R1-R6)** | | | |
| V65 | Cross | User role denied alert acknowledge | 403 |
| V66 | Cross | User role denied integration create | 403 |
| V67 | Cross | User role denied license activate | 403 |
| V68 | Cross | User role denied audit log view | 403 |
| V69 | Cross | Admin can do all of the above | 200 |
| V70 | Cross | Integration create → audit log exists | Verified |
| V71 | Cross | Alert acknowledge → audit log exists | Verified |
| V72 | Cross | License activate → audit log with redacted code | Verified |

**Script Technical Requirements:**

- Uses `fetch()` for HTTP requests (Node.js 18+ built-in)
- Runs with: `npx tsx backend/scripts/validate-pipeline-2g.ts`
- Self-contained: creates all test data, cleans up after
- Test data uses unique prefix `p2g-test-*` to avoid collisions
- Cleanup runs in `finally` block even on failure
- Each scenario has a descriptive label in output
- Failed scenarios show expected vs actual
- Exit code 0 on all-pass, 1 on any failure
- Completes in under 60 seconds
- Works on both fresh and seeded databases

**Acceptance Criteria:**

- [ ] Script runs successfully: `npx tsx backend/scripts/validate-pipeline-2g.ts`
- [ ] All 72 validation scenarios pass
- [ ] Script creates and cleans up its own test data — no residue
- [ ] Uses real HTTP requests (not service-layer calls)
- [ ] Each scenario labeled clearly in output (e.g., `[PASS] V1: Valid threshold alert config created`)
- [ ] Failed scenarios show expected vs actual
- [ ] Exit code 0 on all-pass, 1 on any failure
- [ ] Summary printed: `72/72 PASS` or `70/72 PASS, 2 FAIL`
- [ ] Handles backend not running gracefully (clear error, exit 1)
- [ ] Completes in under 60 seconds
- [ ] Cleanup runs even on failure (try/finally)
- [ ] Test data uses `p2g-test-*` prefix for isolation
- [ ] Script is idempotent (can be run multiple times)

---

## 6. Success Metrics

| Metric | Target | Measurement | When |
|--------|--------|-------------|------|
| **Alert validation strictness** | 15+ invalid condition formats rejected | R1 test cases | After R1 |
| **Audit log coverage** | 100% of mutating endpoints audited (~135 routes) | Route audit script + validation | After R2 |
| **License validation accuracy** | 10+ invalid codes rejected, 3 valid types accepted | R3 test cases | After R3 |
| **Integration CRUD completeness** | 7 endpoints operational, all RBAC-protected | R5 test cases | After R5 |
| **Vulnerability preference continuity** | All P1 features work with RBAC | R4 test cases | After R4 |
| **Notification preference enforcement** | All 10 toggles (5 categories x 2 channels) enforced | R6 test cases | After R6 |
| **Validation script pass rate** | 72/72 scenarios pass | `validate-pipeline-2g.ts` output | After R7 |
| **Sensitive data in audit logs** | 0 instances of passwords/tokens/codes in audit details | Manual review + automated grep | After R2 |
| **Backward compatibility** | All existing tests still pass after changes | `npm test` | After all |
| **Zero regressions in P1/P2A** | Pipeline 1 + Pipeline 2A validation scripts still pass | Re-run validate-pipeline.ts + validate-rbac.ts | After all |

---

## 7. Open Questions

| # | Question | Owner | Blocking? | Recommendation |
|---|----------|-------|-----------|----------------|
| Q1 | Should alert `acknowledgedBy` and `resolvedBy` be added to the AssetAlert schema, or stored only in audit logs? | Engineering | Yes (before R1) | **Add to schema.** Having `acknowledgedBy` FK on AssetAlert is faster for queries than joining audit logs. |
| Q2 | Should we add a Prisma migration for AssetAlert schema changes (acknowledgedAt, acknowledgedBy, resolutionNote), or keep them as JSON in a `metadata` field? | Engineering | Yes (before R1) | **Add proper columns.** Queryable fields are better than JSON for filtering/sorting. |
| Q3 | For license validation, should we use a real CRC-16 algorithm or a simpler hash (e.g., first 4 chars of SHA-256)? | Engineering | No | **SHA-256 prefix.** Simpler to implement, sufficient for format validation. CRC-16 is not a security measure — the format check just prevents typos. |
| Q4 | Should the Integration model support multiple instances of the same type (e.g., two Jira integrations for different projects)? | Product | No | **Yes, allow it.** Unique constraint is on `name`, not `type`. Two Jira integrations with different names is valid. |
| Q5 | Should audit middleware be applied at the route level (per-route) or as a global post-response hook? | Engineering | Yes (before R2) | **Route level.** Global hook would catch all mutations but can't capture resource-specific details. Route-level `audit()` middleware knows the resource type and can extract meaningful `getDetails()`. |
| Q6 | Should `GET /v1/alerts` be a new top-level route or nested under `/v1/assets/alerts`? | Engineering | No | **Top-level `/v1/alerts`.** Cross-asset alert management is a first-class concern, not an asset sub-resource. |
| Q7 | For the audit middleware, should we audit SSE notifications (fire events) or just REST mutations? | Engineering | No | **REST mutations only.** SSE is a delivery channel, not a state change. Auditing every SSE push would create excessive log volume. |
| Q8 | Should the validation script generate its own license codes (with valid checksums) for testing, or use hardcoded test codes? | Engineering | No | **Generate dynamically.** The script should use the same checksum algorithm to create valid test codes. This also tests the checksum implementation. |

---

## 8. Timeline Considerations

**Dependencies:**
- Pipeline 2A (RBAC) must be complete — **it is** (validated 2026-02-13)
- No external dependencies
- R1 and R5 require Prisma migrations (AssetAlert changes + Integration model)

**Suggested Implementation Order:**

```
R5 (Integration model + migration) ─┐
R1 (Alert schema changes + migration) ─┤── Can share one migration
                                        ↓
R2 (Audit middleware) ──────────── Largest task (~15 route files)
                                        ↓
R3 (License validation) ────────── Independent, can parallel with R2
                                        ↓
R4 (Vulnerability verification) ── Quick verification, minimal code
R6 (Notification hardening) ────── Quick verification + minor fixes
                                        ↓
R7 (Validation script) ────────── Must be last (validates everything)
```

**Parallelizable Work:**
- R1 (alert hardening) and R5 (integrations) can be built in parallel
- R3 (license) can be built in parallel with R2 (audit)
- R4 (vuln verification) and R6 (notification hardening) can run in parallel with anything
- R7 must come last

**Risk Factors:**
- R2 is the largest task (touching 15+ route files with audit middleware). Each route needs the correct `resource` and `getDetails()` callback.
- R1 requires changes to an existing Prisma model (AssetAlert), which needs a careful migration
- R5 adds a new Prisma model, requiring a new migration
- R3 introduces a new license format — must generate valid test codes in the validation script

---

## Appendix A: AssetAlert Schema Changes

Add these columns to the `AssetAlert` model:

```prisma
model AssetAlert {
  // ... existing fields ...

  // NEW: Acknowledgment tracking
  acknowledgedAt DateTime? @map("acknowledged_at")
  acknowledgedBy String?   @map("acknowledged_by")
  acknowledger   User?     @relation("alertAcknowledger", fields: [acknowledgedBy], references: [id])
  acknowledgNote String?   @map("acknowledge_note")

  // NEW: Resolution tracking
  resolvedBy     String?   @map("resolved_by")
  resolver       User?     @relation("alertResolver", fields: [resolvedBy], references: [id])
  resolutionNote String?   @map("resolution_note")

  // ... existing indexes + new ones ...
  @@index([status, severity])  // For filtering by status + severity combo
}
```

---

## Appendix B: Audit Action & Resource Constants (Extended)

```typescript
// Extend existing AuditAction enum
const AuditAction = {
  // Existing
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  DEPLOY: 'DEPLOY',
  SCAN: 'SCAN',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',

  // NEW
  SYNC: 'SYNC',
  ACTIVATE: 'ACTIVATE',
  TOGGLE: 'TOGGLE',
  ACKNOWLEDGE: 'ACKNOWLEDGE',
  RESOLVE: 'RESOLVE',
  TEST: 'TEST',
} as const;

// Extend existing AuditResource enum
const AuditResource = {
  // Existing
  USER: 'USER',
  AGENT: 'AGENT',
  ASSET: 'ASSET',
  PATCH: 'PATCH',
  VULNERABILITY: 'VULNERABILITY',
  JOB: 'JOB',
  REPORT: 'REPORT',
  SETTINGS: 'SETTINGS',
  DISCOVERY: 'DISCOVERY',
  TAG: 'TAG',

  // NEW
  ROLE: 'ROLE',
  ALERT: 'ALERT',
  ALERT_CONFIG: 'ALERT_CONFIG',
  INTEGRATION: 'INTEGRATION',
  LICENSE: 'LICENSE',
  DEPLOYMENT: 'DEPLOYMENT',
  HUB: 'HUB',
  NOTIFICATION: 'NOTIFICATION',
} as const;
```

---

## Appendix C: License Checksum Algorithm

```typescript
/**
 * Generate CRC-16/CCITT checksum for license code validation.
 * Uses the first 19 characters of the license code (prefix + 3 segments).
 * Returns 4 uppercase hex characters.
 *
 * Example:
 *   Input: "PIQE-AB12-CD34-EF56"
 *   Output: "A3F1" (4 hex chars)
 *   Full code: "PIQE-AB12-CD34-EF56-A3F1"
 */
function computeChecksum(codePrefix: string): string {
  // Use first 4 chars of SHA-256 hash, uppercased
  const hash = crypto.createHash('sha256').update(codePrefix).digest('hex');
  return hash.substring(0, 4).toUpperCase();
}

function validateLicenseCode(code: string): { valid: boolean; error?: string } {
  // 1. Format check
  const formatRegex = /^PIQ[EPT]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!formatRegex.test(code)) {
    return { valid: false, error: 'Invalid license code format' };
  }

  // 2. Checksum check
  const prefix = code.substring(0, 19); // "PIQE-AB12-CD34-EF56"
  const providedChecksum = code.substring(20); // "A3F1"
  const expectedChecksum = computeChecksum(prefix);

  if (providedChecksum !== expectedChecksum) {
    return { valid: false, error: 'Invalid license code: checksum mismatch' };
  }

  return { valid: true };
}
```

---

## Appendix D: Files to Create/Modify

| File | Action | Risk | Description |
|------|--------|------|-------------|
| **New Files** | | | |
| `backend/src/modules/alerts/alerts.routes.ts` | CREATE | Medium | New top-level alert management routes |
| `backend/src/modules/alerts/alerts.controller.ts` | CREATE | Medium | Alert management controller |
| `backend/src/modules/alerts/alerts.service.ts` | CREATE | Medium | Alert query/acknowledge/resolve service |
| `backend/src/modules/alerts/alerts.validators.ts` | CREATE | Medium | Alert query/action validators |
| `backend/src/modules/settings/license.service.ts` | CREATE | Medium | License validation logic |
| `backend/src/modules/settings/integration-crud.service.ts` | CREATE | Medium | Integration CRUD service |
| `backend/scripts/validate-pipeline-2g.ts` | CREATE | Medium | Validation script (72 scenarios) |
| `backend/src/db/prisma/migrations/XXXX_pipeline_2g/` | CREATE | High | Migration for AssetAlert + Integration |
| **Modified Files** | | | |
| `backend/src/db/prisma/schema.prisma` | MODIFY | High | Add Integration model, modify AssetAlert |
| `backend/src/modules/settings/settings.validators.ts` | MODIFY | Medium | Strengthen alert config validators, add integration type enum |
| `backend/src/modules/settings/settings.routes.ts` | MODIFY | Medium | Add integration routes, add audit middleware |
| `backend/src/modules/settings/settings.controller.ts` | MODIFY | Medium | Add integration controller methods |
| `backend/src/modules/settings/settings.service.ts` | MODIFY | Medium | Replace license stub, add integration service calls |
| `backend/src/modules/alerts/alert-evaluation.service.ts` | MODIFY | Low | Add logging, replace silent catch |
| `backend/src/middleware/audit.ts` | MODIFY | Low | Extend action/resource constants |
| `backend/src/app.ts` | MODIFY | Low | Mount new alert routes |
| `backend/src/modules/assets/assets.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/patches/patches.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/vulnerabilities/vulnerabilities.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/jobs/jobs.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/deployments/deployment.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/discovery/discovery.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/agents/agents.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/hub/hub.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/reports/reports.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/notifications/notifications.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/patch-repository/patch-repository.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/patch-templates/patch-templates.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/ai/ai.routes.ts` | MODIFY | Low | Add audit middleware to mutations |
| `backend/src/modules/notifications/notifications.validators.ts` | MODIFY | Low | Add `.strict()` to preference schema |

**Total: ~8 new files, ~22 modified files**

---

## Appendix E: Complete Test Case Summary

| Requirement | Test Cases | Categories |
|-------------|-----------|------------|
| R1: Alert Config Hardening | T1.1–T1.33 (33 tests) | Condition validation, action validation, enums, management, RBAC |
| R2: Audit Log Completeness | T2.1–T2.35 (35 tests) | Per-module auditing, redaction, query filters, RBAC |
| R3: License Validation | T3.1–T3.25 (25 tests) | Format, checksum, types, computed fields, edge cases |
| R4: Vulnerability Verification | T4.1–T4.10 (10 tests) | RBAC enforcement, feature continuity |
| R5: Integrations CRUD | T5.1–T5.24 (24 tests) | CRUD, toggle, test, RBAC, audit |
| R6: Notification Preferences | T6.1–T6.8 (8 tests) | Defaults, updates, validation, isolation |
| R7: Validation Script | V1–V72 (72 scenarios) | End-to-end, cross-feature, RBAC, edge cases |
| **TOTAL** | **135 unit/integration tests + 72 validation scenarios** | |

---

*This PRD was authored based on thorough codebase exploration of the existing alerts, audit, license, notification, vulnerability, and integration code. All referenced files, line numbers, and current behaviors were verified against the actual source code as of 2026-02-13.*
