# PRD: Pipeline 2D — Platform Infrastructure Settings

**Status:** `DRAFT`
**Author:** Dev 1 (Backend)
**Created:** 2026-02-13
**Priority:** P0 — Required for production-grade settings
**Depends on:** Pipeline 2A (RBAC — `COMPLETED`)
**Parallel with:** Pipelines 2E, 2F, 2G

---

## 1. Problem Statement

PatchIQ's settings module has 6 infrastructure domains (Server, Mail, Proxy, Branding, Remote Desktop, Risk Score) that are **functionally write-only**. An admin can save settings via the API, and the saved values come back on GET — but most settings have **zero runtime effect**:

- **Session timeout** is configurable (default 60 min) but the JWT middleware ignores it — tokens use a hardcoded `expiresIn` from env vars regardless of what the admin sets.
- **Log level** is configurable (Debug/Info/Warning/Error) but Pino's runtime level never changes — the saved value is cosmetic.
- **Mail server** test endpoint works, but there's no validation that the saved config matches what `emailService` actually uses at send-time. A stale config in the DB could silently differ from what's in memory.
- **Proxy server** test endpoint works but only against `httpbin.org` — it doesn't verify that the proxy is actually used for outbound requests (CVE sync, patch downloads).
- **Branding** logo upload works but presigned URLs expire after 7 days. No background refresh, no permanent public URL, no cleanup of orphaned MinIO objects.
- **Risk Score** weights are saved but never consumed — no service reads them to compute actual risk scores.
- **Remote Desktop** settings persist but no consumer service reads them.

**Impact:** Admins configure settings expecting them to work. When they don't take effect, it erodes trust in the platform and creates support burden. For security-critical settings like session timeout and log level, "write-only" is a compliance risk.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Every saved setting provably affects runtime behavior | Validation script changes a setting, then observes the behavioral difference (not just DB state) |
| G2 | Mail and proxy test endpoints test the *saved* config, not just the *submitted* config | Test endpoint loads from DB, sends real test, returns actionable error on failure |
| G3 | Branding logos are permanently accessible | Logo URLs do not expire; orphaned objects are cleaned up on replacement |
| G4 | Input validation catches all invalid/dangerous inputs | Zod schemas reject out-of-range values, XSS in text fields, invalid URLs, oversized uploads |
| G5 | Full RBAC enforcement on every endpoint | All 6 domains require `checkPermission('settings', action)` — verified by validation script |

---

## 3. Non-Goals

| # | Non-Goal | Rationale |
|---|----------|-----------|
| N1 | Frontend UI for any settings domain | Frontend is Dev 2's scope. This PRD is API-only. |
| N2 | HA/clustering for settings (distributed cache sync) | Single-instance deployment for now. Revisit in Pipeline 3+. |
| N3 | Settings versioning / rollback | Nice-to-have but not required for production-grade. Future consideration. |
| N4 | Real license server integration | Deferred to Pipeline 2G (License validation). |
| N5 | Webhook/notification on settings change | Could-have, not must-have. Future consideration. |

---

## 4. User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-1 | As a **system admin**, I want to set the session timeout so that idle users are automatically logged out after the configured period. | P0 |
| US-2 | As a **system admin**, I want to change the log level at runtime so that I can enable debug logging to troubleshoot issues without restarting the server. | P0 |
| US-3 | As a **system admin**, I want to configure the mail server and send a test email so that I know email notifications will work before enabling them. | P0 |
| US-4 | As a **system admin**, I want to configure a proxy server and test connectivity so that outbound requests (CVE sync, patch downloads) route through the proxy. | P0 |
| US-5 | As a **system admin**, I want to upload a company logo so that the platform displays our branding without the logo link expiring. | P0 |
| US-6 | As a **system admin**, I want to manage vendor logos for integrations so that the UI can display recognizable vendor icons. | P1 |
| US-7 | As a **system admin**, I want to configure risk score weights so that the vulnerability risk calculation reflects our organization's priorities. | P0 |
| US-8 | As a **system admin**, I want to configure remote desktop settings so that the agent's remote access behavior matches our security policy. | P1 |
| US-9 | As a **regular user**, I want to be denied access to settings endpoints so that only authorized admins can modify platform configuration. | P0 |

---

## 5. Requirements

### R1: Server Settings — Runtime Enforcement (P0 — Must Have)

**Location:** `backend/src/modules/settings/settings.service.ts`, `backend/src/middleware/auth.ts`
**Purpose:** Make server settings actually control runtime behavior instead of being write-only.

#### R1A: Session Timeout Enforcement

**Current state:** `sessionTimeoutMinutes` (default 60) and `sessionIdleTimeoutMinutes` (default 15) are stored in the `setting` table but the JWT `expiresIn` is hardcoded in `auth.service.ts`.

**Required behavior:**
1. When generating a JWT (login, refresh), read `sessionTimeoutMinutes` from the `setting` table (category=`server`).
2. Use this value as the JWT `expiresIn` (in minutes). If no setting exists, fall back to the env var `JWT_EXPIRES_IN` (default `60m`).
3. `sessionIdleTimeoutMinutes` is informational for the frontend (frontend should auto-logout on idle). The backend does not enforce idle timeout directly — it relies on JWT expiry.
4. `sessionTimeout` (boolean) acts as an enable/disable toggle. When `false`, use a long expiry (24h). When `true`, use `sessionTimeoutMinutes`.

**Validation constraints:**
- `sessionTimeoutMinutes`: integer, min 5, max 1440 (24 hours)
- `sessionIdleTimeoutMinutes`: integer, min 1, max `sessionTimeoutMinutes`
- `sessionTimeout`: boolean

**Acceptance Criteria:**
- [ ] Setting `sessionTimeoutMinutes=10` causes new JWTs to expire in 10 minutes
- [ ] Existing tokens are NOT retroactively invalidated (they expire at their original time)
- [ ] Setting `sessionTimeout=false` causes new JWTs to use 24-hour expiry
- [ ] `sessionIdleTimeoutMinutes` cannot exceed `sessionTimeoutMinutes`
- [ ] Invalid values (0, -1, 99999) are rejected with 400

#### R1B: Endpoint Timeout Enforcement

**Current state:** `endpointOnlineStatusTimeoutHours` and `endpointScanJobTimeoutHours` are stored but no service reads them.

**Required behavior:**
1. Expose a `getServerSettings()` function that other services can call to read current values.
2. The dashboard service should use `endpointOnlineStatusTimeoutHours` when determining whether an agent is "online" vs "offline" (compare `agent.lastHeartbeat` against `now - timeoutHours`).
3. The scan job service should use `endpointScanJobTimeoutHours` to timeout stale scan jobs.

**Validation constraints:**
- `endpointOnlineStatusTimeoutHours`: integer, min 1, max 168 (7 days)
- `endpointScanJobTimeoutHours`: integer, min 1, max 72 (3 days)

**Acceptance Criteria:**
- [ ] `getServerSettings()` returns current values from DB (not hardcoded)
- [ ] Dashboard agent online/offline calculation uses the configured timeout
- [ ] Setting `endpointOnlineStatusTimeoutHours=2` marks agents with no heartbeat in 2 hours as offline

#### R1C: Runtime Log Level Change

**Current state:** `logLevel` is stored as a string (`Debug`/`Info`/`Warning`/`Error`) but Pino's level is never updated at runtime.

**Required behavior:**
1. On `PUT /settings/server`, after saving, call `logger.level = newLevel.toLowerCase()` on the root Pino logger.
2. Map stored values to Pino levels: `Debug→debug`, `Info→info`, `Warning→warn`, `Error→error`.
3. Changes take effect immediately for all subsequent log calls (Pino supports runtime level changes on the root logger — child loggers inherit).

**Validation constraints:**
- `logLevel`: enum `['Debug', 'Info', 'Warning', 'Error']`

**Acceptance Criteria:**
- [ ] Setting `logLevel=Debug` causes debug-level messages to appear in server output
- [ ] Setting `logLevel=Error` suppresses info/warn messages
- [ ] Change is immediate — no server restart required
- [ ] Invalid level values are rejected with 400

#### R1 Test Cases

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T1.1 | Session timeout affects JWT | `PUT /server` with `sessionTimeoutMinutes: 10`, then `POST /auth/login` | New JWT `exp` claim is ~10 min from now |
| T1.2 | Session timeout disabled | `PUT /server` with `sessionTimeout: false`, then login | JWT `exp` is ~24h from now |
| T1.3 | Idle timeout ≤ session timeout | `PUT /server` with `sessionIdleTimeoutMinutes: 120, sessionTimeoutMinutes: 60` | 400 error: idle timeout cannot exceed session timeout |
| T1.4 | Log level change runtime | `PUT /server` with `logLevel: 'Debug'`, then make API call | Server logs include debug-level entries |
| T1.5 | Min/max boundary — session | `PUT /server` with `sessionTimeoutMinutes: 0` | 400 error |
| T1.6 | Min/max boundary — session | `PUT /server` with `sessionTimeoutMinutes: 1441` | 400 error |
| T1.7 | Endpoint timeout consumed | `PUT /server` with `endpointOnlineStatusTimeoutHours: 1`, agent heartbeat 2h ago | Dashboard shows agent offline |
| T1.8 | GET returns current values | `GET /server` after PUT | Returns saved values, not hardcoded defaults |
| T1.9 | RBAC enforcement | User role → `GET /settings/server` | 403 Forbidden |
| T1.10 | RBAC enforcement | Admin role → `PUT /settings/server` | 200 OK |

---

### R2: Mail Server — Config Hardening & Real Test (P0 — Must Have)

**Location:** `backend/src/modules/settings/settings.service.ts`, `backend/src/shared/services/email.service.ts`
**Purpose:** Ensure mail config is validated, encrypted, and the test endpoint sends a real email through the *saved* configuration.

#### R2A: Config Persistence & Security

**Current state:** Mail config is stored in the `setting` table (category=`mail`). Password is encrypted. Protocol mapping (NONE/SSL/TLS → boolean `secure`) works.

**Required hardening:**
1. `GET /mail-server` must NEVER return the password — return `"********"` or `null` for the password field.
2. `PUT /mail-server` with password `"********"` or empty string should preserve the existing encrypted password (don't overwrite with literal asterisks).
3. Validate `host` is a valid hostname or IP (not empty, no whitespace, no script tags).
4. Validate `port` is a valid SMTP port (1–65535).
5. Validate `fromAddress` is a valid email format.

**Validation constraints (Zod):**
- `host`: string, min 1, max 255, trimmed, regex: `/^[a-zA-Z0-9._-]+$/`
- `port`: integer, min 1, max 65535
- `protocol`: enum `['NONE', 'SSL', 'TLS']`
- `fromAddress`: string, email format
- `fromName`: string, max 100, optional
- `username`: string, max 255, optional
- `password`: string, max 255, optional (sentinel `"********"` means "keep existing")

**Acceptance Criteria:**
- [ ] `GET /mail-server` never returns plaintext password
- [ ] `PUT /mail-server` with `password: "********"` preserves existing password
- [ ] `PUT /mail-server` with empty host is rejected (400)
- [ ] `PUT /mail-server` with port 0 or 70000 is rejected (400)
- [ ] `PUT /mail-server` with invalid email for `fromAddress` is rejected (400)
- [ ] `PUT /mail-server` with `host: "<script>alert(1)</script>"` is rejected (400)

#### R2B: Test Endpoint — Real Email Delivery

**Current state:** `POST /mail-server/test` accepts a config payload and tests SMTP connectivity. It uses the *submitted* config, not necessarily the *saved* config.

**Required behavior:**
1. `POST /mail-server/test` with `{ testEmail: "recipient@example.com" }` should:
   a. Load the **saved** mail config from DB.
   b. Send a real test email to the provided recipient address.
   c. Return `{ success: true, message: "Test email sent successfully" }` on success.
   d. Return `{ success: false, error: { message: "Connection refused", details: "..." } }` on failure with actionable error messages.
2. If no mail config is saved, return 400: "Mail server not configured. Save configuration first."
3. The test email body should include: timestamp, server hostname, "This is a test email from PatchIQ."

**Validation constraints:**
- `testEmail`: string, valid email format, required

**Acceptance Criteria:**
- [ ] Test endpoint uses saved config, not submitted config
- [ ] Test with valid SMTP config sends a real email (verifiable in mailbox)
- [ ] Test with invalid host returns error: "Could not connect to mail server"
- [ ] Test with wrong credentials returns error: "Authentication failed"
- [ ] Test with no saved config returns 400
- [ ] `testEmail` with invalid format is rejected (400)

#### R2 Test Cases

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T2.1 | Password masking | `GET /mail-server` | Password field is `null` or `"********"` |
| T2.2 | Password preservation | Save config with password "secret", then `PUT` with password "********" | DB still has encrypted "secret" |
| T2.3 | Invalid host | `PUT /mail-server` with host `""` | 400 |
| T2.4 | XSS in host | `PUT /mail-server` with host `<script>alert(1)</script>` | 400 |
| T2.5 | Port boundary low | `PUT /mail-server` with port `0` | 400 |
| T2.6 | Port boundary high | `PUT /mail-server` with port `65536` | 400 |
| T2.7 | Invalid from address | `PUT /mail-server` with fromAddress `not-an-email` | 400 |
| T2.8 | Test uses saved config | Save config A, submit test with no config body | Uses saved config A |
| T2.9 | Test with no saved config | No mail config in DB, `POST /mail-server/test` | 400: "Mail server not configured" |
| T2.10 | RBAC — user denied | User role → `PUT /settings/mail-server` | 403 |

---

### R3: Proxy Server — Config Hardening & Runtime Usage (P0 — Must Have)

**Location:** `backend/src/modules/settings/settings.service.ts`, `backend/src/shared/services/proxy.service.ts`
**Purpose:** Ensure proxy config is validated, encrypted, and actually used for outbound HTTP requests when enabled.

#### R3A: Config Persistence & Security

**Current state:** Proxy config stored in `setting` table (category=`proxy`). Password encrypted. Test endpoint tests against `httpbin.org`.

**Required hardening:**
1. `GET /proxy-server` must NEVER return the password — same sentinel pattern as mail.
2. `PUT /proxy-server` with password sentinel preserves existing.
3. Validate `host` is a valid hostname or IP.
4. Validate `port` is in range 1–65535.
5. When `enabled=false`, proxy is disabled globally. When `true`, all outbound HTTP requests (CVE sync, patch downloads, EPSS fetch) should route through the proxy.

**Validation constraints (Zod):**
- `enabled`: boolean, required
- `host`: string, required when `enabled=true`, hostname/IP format
- `port`: integer, 1–65535, required when `enabled=true`
- `protocol`: enum `['HTTP', 'HTTPS', 'SOCKS5']`
- `enableAuthentication`: boolean
- `username`: string, required when `enableAuthentication=true`
- `password`: string, sentinel pattern

**Acceptance Criteria:**
- [ ] `GET /proxy-server` never returns plaintext password
- [ ] `PUT /proxy-server` with `enabled: true` but no host/port is rejected (400)
- [ ] `PUT /proxy-server` with `enableAuthentication: true` but no username is rejected (400)
- [ ] Password sentinel preservation works correctly
- [ ] Disabling proxy (`enabled: false`) is always allowed regardless of host/port

#### R3B: Test Endpoint — Real Connectivity Test

**Current state:** Test endpoint checks connectivity against `httpbin.org` through the proxy.

**Required behavior:**
1. `POST /proxy-server/test` loads **saved** config from DB and tests connectivity.
2. Returns external IP (the proxy's IP) on success.
3. Returns actionable error on failure: "Connection refused", "Authentication failed", "Timeout after 10s".
4. If proxy is disabled, return 400: "Proxy is disabled. Enable it first."

**Acceptance Criteria:**
- [ ] Test uses saved config from DB
- [ ] Test with valid proxy returns external IP
- [ ] Test with invalid host returns clear error
- [ ] Test with proxy disabled returns 400
- [ ] Test with wrong credentials returns "Authentication failed"

#### R3C: Proxy Integration with Outbound Services

**Purpose:** When proxy is enabled, outbound HTTP requests actually use it.

**Required behavior:**
1. Create a `getProxyAgent()` utility that reads proxy config from DB and returns an appropriate HTTP agent (or `undefined` if proxy disabled).
2. CVE sync service (`cve-sync.service.ts`) uses `getProxyAgent()` for NVD API calls.
3. EPSS fetch uses `getProxyAgent()`.
4. Patch download jobs use `getProxyAgent()`.
5. If proxy is enabled but unreachable, requests fail with a clear error (not silent fallback to direct).

**Acceptance Criteria:**
- [ ] `getProxyAgent()` returns correct agent type for HTTP/HTTPS/SOCKS5
- [ ] `getProxyAgent()` returns `undefined` when proxy disabled
- [ ] CVE sync with proxy enabled routes through proxy (verifiable via proxy logs or test)
- [ ] Proxy unreachable → outbound request fails with proxy-related error message

#### R3 Test Cases

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T3.1 | Password masking | `GET /proxy-server` | Password is masked |
| T3.2 | Enable without host | `PUT /proxy-server` with `enabled: true, host: null` | 400 |
| T3.3 | Auth without username | `PUT /proxy-server` with `enableAuthentication: true, username: null` | 400 |
| T3.4 | Disable allows empty host | `PUT /proxy-server` with `enabled: false` | 200 OK |
| T3.5 | Test uses saved config | Save valid proxy config, `POST /proxy-server/test` | Returns external IP |
| T3.6 | Test with proxy disabled | Proxy disabled in DB, `POST /proxy-server/test` | 400: "Proxy is disabled" |
| T3.7 | getProxyAgent disabled | Proxy disabled | Returns `undefined` |
| T3.8 | getProxyAgent HTTP | Proxy enabled, protocol HTTP | Returns `HttpProxyAgent` |
| T3.9 | getProxyAgent SOCKS5 | Proxy enabled, protocol SOCKS5 | Returns `SocksProxyAgent` |
| T3.10 | RBAC — user denied | User role → `PUT /settings/proxy-server` | 403 |

---

### R4: Branding — Permanent URLs & Cleanup (P0 — Must Have)

**Location:** `backend/src/modules/settings/settings.service.ts`, MinIO configuration
**Purpose:** Branding logos must be permanently accessible and orphaned objects cleaned up.

#### R4A: Permanent Logo URLs

**Current state:** Logo uploaded to MinIO, presigned URL with 7-day expiry stored in DB. After 7 days, the URL breaks.

**Required behavior:**
1. Store the MinIO object key (e.g., `branding/logo-{uuid}.png`) in the DB, NOT the presigned URL.
2. Create a public endpoint `GET /settings/branding/logo` that:
   a. Reads the object key from DB.
   b. Generates a fresh presigned URL (1-hour expiry) and redirects (302) to it.
   c. Returns 404 if no logo is configured.
3. Alternatively, set the branding bucket/prefix to public-read policy in MinIO so the URL never expires.
4. `GET /branding` response includes a stable `logoUrl` pointing to the public endpoint (e.g., `/v1/settings/branding/logo`), not a presigned URL.

**Acceptance Criteria:**
- [ ] `GET /settings/branding/logo` returns the logo image (via redirect or stream)
- [ ] Logo URL in `GET /branding` response does not expire
- [ ] Logo URL works after 7+ days (no presigned URL expiry)
- [ ] 404 when no logo uploaded

#### R4B: Orphan Cleanup on Replacement

**Current state:** Uploading a new logo creates a new MinIO object but the old one remains.

**Required behavior:**
1. On `POST /branding` (logo upload), if a previous logo exists:
   a. Delete the old MinIO object.
   b. Upload the new one.
   c. Update the DB with the new object key.
2. Use a transaction: if upload fails, don't delete the old object.

**Validation constraints:**
- File size: max 5MB (reduced from 10MB — logos don't need to be 10MB)
- File types: PNG, JPG, JPEG, GIF, SVG
- `companyName`: string, min 1, max 100, trimmed, no HTML tags

**Acceptance Criteria:**
- [ ] Uploading a new logo deletes the old MinIO object
- [ ] If new upload fails, old logo is preserved
- [ ] Company name with HTML tags is rejected (400)
- [ ] File over 5MB is rejected (413 or 400)
- [ ] Non-image file type is rejected (400)

#### R4C: Vendor Logos Hardening

**Current state:** Vendor logos have full CRUD with MinIO upload. Working correctly.

**Required hardening:**
1. Apply same permanent URL pattern (stable endpoint, not presigned).
2. Validate `name` uniqueness (case-insensitive).
3. Validate `type` enum: `integration`, `vendor`, `os`.
4. Delete MinIO object when vendor logo is deleted (already implemented — verify).

**Acceptance Criteria:**
- [ ] Duplicate vendor logo name (case-insensitive) is rejected (409)
- [ ] Invalid type is rejected (400)
- [ ] Deleting a vendor logo removes the MinIO object
- [ ] Vendor logo URLs do not expire

#### R4 Test Cases

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T4.1 | Logo persists | Upload logo, wait, `GET /settings/branding/logo` | Returns image |
| T4.2 | Logo replacement cleanup | Upload logo A, then upload logo B | MinIO has only B, not A |
| T4.3 | No logo 404 | No logo configured, `GET /settings/branding/logo` | 404 |
| T4.4 | Oversized file | Upload 6MB PNG | 400 or 413 |
| T4.5 | Invalid file type | Upload `.exe` file | 400 |
| T4.6 | Company name XSS | `companyName: "<script>alert(1)</script>"` | 400 |
| T4.7 | Company name empty | `companyName: ""` | 400 |
| T4.8 | Vendor logo duplicate name | Create "Microsoft", then create "microsoft" | 409 |
| T4.9 | Vendor logo invalid type | `type: "invalid"` | 400 |
| T4.10 | Vendor logo delete cleanup | Delete vendor logo | MinIO object removed |
| T4.11 | RBAC — user denied | User role → `POST /settings/branding` | 403 |

---

### R5: Remote Desktop Settings — Validation & Consumer (P1 — Should Have)

**Location:** `backend/src/modules/settings/settings.service.ts`
**Purpose:** Ensure remote desktop settings are properly validated and consumable by other services.

**Current state:** Fully implemented with GET/PUT/reset. Connection type (Local/Remote), session indicator, user consent flags. Working correctly.

**Required hardening:**
1. Validate `connectionType` enum: `['Local', 'Remote']` only.
2. Validate boolean fields are actual booleans (not strings "true"/"false").
3. Expose `getRemoteDesktopSettings()` function for other services.
4. `POST /remote-desktop/reset` should return the default values after reset.

**Validation constraints:**
- `connectionType`: enum `['Local', 'Remote']`
- `remoteSessionIndicator`: boolean
- `userConsent`: boolean

**Acceptance Criteria:**
- [ ] Invalid `connectionType` value is rejected (400)
- [ ] `connectionType: "INVALID"` rejected
- [ ] Reset returns default values in response
- [ ] `getRemoteDesktopSettings()` callable from other services
- [ ] RBAC enforced on all endpoints

#### R5 Test Cases

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T5.1 | Valid update | `PUT /remote-desktop` with `connectionType: "Remote"` | 200, saved |
| T5.2 | Invalid connection type | `connectionType: "VNC"` | 400 |
| T5.3 | Reset restores defaults | `POST /remote-desktop/reset` | 200, returns `{ connectionType: "Local", ... }` |
| T5.4 | String boolean rejected | `userConsent: "true"` (string) | 400 |
| T5.5 | RBAC — user denied | User role → `PUT /settings/remote-desktop` | 403 |

---

### R6: Risk Score Settings — Validation & Consumer (P0 — Must Have)

**Location:** `backend/src/modules/settings/settings.service.ts`, vulnerability/dashboard services
**Purpose:** Risk score weights must be validated (sum to 1.0) and actually used in risk calculations.

**Current state:** Weights are saved (0-1 range each) but no service reads them to compute risk scores. The dashboard/vulnerability modules have hardcoded or absent risk scoring.

#### R6A: Weight Validation

**Required hardening:**
1. All 4 weights must be between 0.0 and 1.0 (inclusive).
2. All 4 weights must sum to exactly 1.0 (with tolerance ±0.01 for floating-point).
3. `applyDefaultSettings` toggle: when `true`, use equal weights (0.25 each) regardless of saved custom weights.

**Validation constraints:**
- `applyDefaultSettings`: boolean
- `vulnerabilityScoreWeight`: number, 0.0–1.0, 2 decimal places max
- `vulnerabilitySeverityWeight`: number, 0.0–1.0, 2 decimal places max
- `threatsWeight`: number, 0.0–1.0, 2 decimal places max
- `endpointVisitsWeight`: number, 0.0–1.0, 2 decimal places max
- Sum constraint: weights must sum to 1.0 ± 0.01

**Acceptance Criteria:**
- [ ] Weights that don't sum to 1.0 are rejected (400) with message: "Weights must sum to 1.0"
- [ ] Individual weight > 1.0 is rejected (400)
- [ ] Individual weight < 0.0 is rejected (400)
- [ ] `applyDefaultSettings: true` returns equal weights
- [ ] Sum validation tolerates floating-point: 0.3 + 0.3 + 0.3 + 0.1 = 1.0 (accepted)

#### R6B: Risk Score Consumer

**Required behavior:**
1. Expose `getRiskScoreWeights()` function.
2. When vulnerability scan runs, compute a composite risk score for each asset:
   ```
   riskScore = (vulnScore * w1) + (severityScore * w2) + (threatScore * w3) + (endpointVisitsScore * w4)
   ```
   Where:
   - `vulnScore` = EPSS score (0-1) or CVSS base score / 10
   - `severityScore` = max severity of open vulns (CRITICAL=1.0, HIGH=0.75, MEDIUM=0.5, LOW=0.25, NONE=0)
   - `threatScore` = 1.0 if any vuln is in CISA KEV, else 0.0
   - `endpointVisitsScore` = placeholder 0.5 (agent telemetry not yet available)
3. Store computed `riskScore` on the asset record.
4. Dashboard can sort/filter assets by risk score.

**Acceptance Criteria:**
- [ ] `getRiskScoreWeights()` returns current weights from DB
- [ ] Vulnerability scan computes and stores risk scores on assets
- [ ] Changing weights and re-scanning produces different risk scores
- [ ] `applyDefaultSettings: true` uses equal weights in calculation
- [ ] Assets with CISA KEV vulns score higher (all else being equal)

#### R6 Test Cases

| ID | Test | Input | Expected |
|----|------|-------|----------|
| T6.1 | Weights sum check | `PUT /risk-score` with weights summing to 0.8 | 400: "Weights must sum to 1.0" |
| T6.2 | Weight > 1.0 | `vulnerabilityScoreWeight: 1.5` | 400 |
| T6.3 | Weight < 0.0 | `threatsWeight: -0.1` | 400 |
| T6.4 | Valid custom weights | `0.4 + 0.3 + 0.2 + 0.1 = 1.0` | 200, saved |
| T6.5 | Float tolerance | `0.33 + 0.33 + 0.33 + 0.01 = 1.0` | 200, accepted |
| T6.6 | Default settings toggle | `applyDefaultSettings: true` | Returns 0.25 for each |
| T6.7 | Risk score computed | Scan assets after setting weights | Asset records have non-null riskScore |
| T6.8 | Weight change affects score | Change weights, re-scan | Risk scores differ from previous scan |
| T6.9 | KEV boost | Asset with CISA KEV vuln, `threatsWeight: 0.5` | Higher risk score than asset without KEV |
| T6.10 | RBAC — user denied | User role → `PUT /settings/risk-score` | 403 |

---

### R7: Cross-Cutting Hardening (P0 — Must Have)

**Purpose:** Fixes that apply across all 6 settings domains.

#### R7A: RBAC Verification

All settings endpoints already have `checkPermission('settings', action)` from Pipeline 2A. Verify this is consistent:

| Method | Permission Action |
|--------|-------------------|
| `GET` | `view` |
| `POST` | `add` |
| `PUT` | `edit` |
| `DELETE` | `delete` |

**Acceptance Criteria:**
- [ ] Every settings endpoint has RBAC middleware
- [ ] User role (no settings permission) gets 403 on all settings endpoints
- [ ] Admin role gets 200 on all settings endpoints
- [ ] Custom role with `settings: { view: true, edit: false }` can GET but not PUT

#### R7B: Audit Logging

**Required behavior:**
1. Every settings mutation (PUT, POST, DELETE) must create an audit log entry.
2. Audit log includes: `action`, `resource`, `resourceId`, `details` (what changed), `userId`, `ipAddress`, `timestamp`.
3. For sensitive fields (passwords), log "Password updated" not the actual value.

**Acceptance Criteria:**
- [ ] `PUT /server` creates audit log: `action: "UPDATE", resource: "server-settings"`
- [ ] `PUT /mail-server` with password change logs "Password updated" (not the password)
- [ ] `POST /branding` (logo upload) creates audit log with file name
- [ ] `DELETE /vendor-logos/:id` creates audit log with vendor logo name
- [ ] Audit logs queryable via `GET /settings/audit`

#### R7C: Consistent Error Responses

All settings endpoints must return the standard error envelope:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "VALIDATION_ERROR",
    "details": { "field": "port", "constraint": "Must be between 1 and 65535" }
  }
}
```

**Acceptance Criteria:**
- [ ] Validation errors include field name and constraint description
- [ ] 404 errors include resource type and ID
- [ ] 403 errors include required permission
- [ ] No stack traces in production error responses

---

### R8: End-to-End Validation Script (P0 — Must Have)

**Location:** `backend/scripts/validate-platform-settings.ts`
**Purpose:** Prove that every setting in this pipeline is NOT write-only. Every assertion tests behavioral impact, not just DB state.

#### Script Structure

```
Phase 1: Preflight
  - Health check backend API
  - Verify admin login works
  - Verify user login works (for RBAC tests)

Phase 2: Server Settings (V1–V12)
  - Session timeout enforcement
  - Log level runtime change
  - Endpoint timeout consumption
  - Validation boundaries
  - RBAC denial

Phase 3: Mail Server (V13–V22)
  - Config save with encryption
  - Password masking on GET
  - Password preservation on partial update
  - Test endpoint with saved config
  - Validation boundaries
  - RBAC denial

Phase 4: Proxy Server (V23–V32)
  - Config save with encryption
  - Conditional validation (enabled requires host/port)
  - Test endpoint with saved config
  - Password masking
  - RBAC denial

Phase 5: Branding (V33–V42)
  - Logo upload and retrieval
  - Logo replacement with orphan cleanup
  - Permanent URL (no expiry)
  - Company name validation (XSS prevention)
  - File type/size validation
  - Vendor logo CRUD
  - RBAC denial

Phase 6: Remote Desktop (V43–V47)
  - Valid update
  - Invalid enum rejection
  - Reset to defaults
  - RBAC denial

Phase 7: Risk Score (V48–V58)
  - Weight sum validation
  - Individual weight boundaries
  - Default settings toggle
  - Float tolerance
  - Risk score computation after scan
  - RBAC denial

Phase 8: Cross-Cutting (V59–V65)
  - Audit log creation for settings mutations
  - Sensitive field masking in audit logs
  - Consistent error response format
  - RBAC with custom role (partial permissions)

Phase 9: Cleanup
  - Reset all settings to defaults
  - Delete test data
  - Report summary
```

#### Validation Scenarios

| ID | Category | Test | Validates |
|----|----------|------|-----------|
| V1 | Server | Set session timeout to 10 min, login, verify JWT exp | R1A — timeout enforcement |
| V2 | Server | Disable session timeout, login, verify JWT exp ~24h | R1A — disable toggle |
| V3 | Server | Set idle > session timeout | R1A — constraint validation |
| V4 | Server | Set session timeout to 0 | R1A — boundary rejection |
| V5 | Server | Set session timeout to 1441 | R1A — boundary rejection |
| V6 | Server | Set log level to Debug, verify log output | R1C — runtime log level |
| V7 | Server | Set log level to Error, verify info suppressed | R1C — runtime log level |
| V8 | Server | Invalid log level "TRACE" | R1C — enum validation |
| V9 | Server | Set endpoint timeout, check dashboard | R1B — timeout consumption |
| V10 | Server | GET returns saved values | R1 — persistence |
| V11 | Server | User role → GET /server | R7A — RBAC denial (403) |
| V12 | Server | Admin → PUT /server | R7A — RBAC allow (200) |
| V13 | Mail | Save mail config, GET returns masked password | R2A — password masking |
| V14 | Mail | PUT with "********" password, verify original preserved | R2A — password preservation |
| V15 | Mail | PUT with empty host | R2A — validation (400) |
| V16 | Mail | PUT with port 0 | R2A — validation (400) |
| V17 | Mail | PUT with port 65536 | R2A — validation (400) |
| V18 | Mail | PUT with XSS in host | R2A — XSS prevention (400) |
| V19 | Mail | PUT with invalid fromAddress | R2A — email validation (400) |
| V20 | Mail | Test endpoint with no saved config | R2B — 400 error |
| V21 | Mail | Test endpoint with valid saved config (mock mode) | R2B — uses saved config |
| V22 | Mail | User role → PUT /mail-server | R7A — RBAC denial (403) |
| V23 | Proxy | Save proxy config, GET returns masked password | R3A — password masking |
| V24 | Proxy | Enable proxy without host | R3A — conditional validation (400) |
| V25 | Proxy | Enable auth without username | R3A — conditional validation (400) |
| V26 | Proxy | Disable proxy with no host/port | R3A — allowed (200) |
| V27 | Proxy | PUT with "********" password preserves original | R3A — password preservation |
| V28 | Proxy | Test with proxy disabled | R3B — 400 error |
| V29 | Proxy | Test with proxy enabled (mock/real) | R3B — uses saved config |
| V30 | Proxy | getProxyAgent returns undefined when disabled | R3C — agent factory |
| V31 | Proxy | getProxyAgent returns HttpProxyAgent for HTTP | R3C — agent factory |
| V32 | Proxy | User role → PUT /proxy-server | R7A — RBAC denial (403) |
| V33 | Branding | Upload logo, GET /branding/logo returns image | R4A — permanent URL |
| V34 | Branding | Upload logo, verify URL doesn't use presigned | R4A — no expiry |
| V35 | Branding | Upload new logo, verify old MinIO object deleted | R4B — orphan cleanup |
| V36 | Branding | GET /branding/logo with no logo | R4A — 404 |
| V37 | Branding | Upload 6MB file | R4B — size rejection |
| V38 | Branding | Upload .exe file | R4B — type rejection |
| V39 | Branding | Company name with HTML tags | R4B — XSS prevention |
| V40 | Branding | Create vendor logo, duplicate name | R4C — uniqueness (409) |
| V41 | Branding | Delete vendor logo, verify MinIO cleanup | R4C — orphan cleanup |
| V42 | Branding | User role → POST /branding | R7A — RBAC denial (403) |
| V43 | Remote Desktop | Valid update with "Remote" | R5 — persistence |
| V44 | Remote Desktop | Invalid connectionType "VNC" | R5 — enum validation (400) |
| V45 | Remote Desktop | Reset to defaults | R5 — reset returns defaults |
| V46 | Remote Desktop | String boolean "true" | R5 — type validation (400) |
| V47 | Remote Desktop | User role → PUT /remote-desktop | R7A — RBAC denial (403) |
| V48 | Risk Score | Weights sum to 0.8 | R6A — sum validation (400) |
| V49 | Risk Score | Weight > 1.0 | R6A — boundary (400) |
| V50 | Risk Score | Weight < 0.0 | R6A — boundary (400) |
| V51 | Risk Score | Valid custom weights (0.4+0.3+0.2+0.1) | R6A — acceptance (200) |
| V52 | Risk Score | Float tolerance (0.33+0.33+0.33+0.01) | R6A — tolerance (200) |
| V53 | Risk Score | applyDefaultSettings toggle | R6A — defaults (200) |
| V54 | Risk Score | Risk score computed after scan | R6B — consumer integration |
| V55 | Risk Score | Weight change produces different scores | R6B — weights applied |
| V56 | Risk Score | KEV vuln boosts threat score | R6B — threat scoring |
| V57 | Risk Score | No vulns → risk score 0 | R6B — baseline |
| V58 | Risk Score | User role → PUT /risk-score | R7A — RBAC denial (403) |
| V59 | Audit | PUT /server creates audit entry | R7B — audit logging |
| V60 | Audit | PUT /mail-server logs "Password updated" | R7B — sensitive masking |
| V61 | Audit | POST /branding logs file upload | R7B — audit logging |
| V62 | Audit | DELETE /vendor-logos logs deletion | R7B — audit logging |
| V63 | Audit | Validation error returns field details | R7C — error format |
| V64 | Audit | 404 returns resource info | R7C — error format |
| V65 | RBAC | Custom role: settings view=true, edit=false | R7A — partial RBAC |

**Script requirements:**
- Executable via `npx tsx backend/scripts/validate-platform-settings.ts`
- Creates own test data (users, roles)
- Cleans up all test data on completion
- Outputs summary: `PASS: X/65 | FAIL: Y/65`
- Exit code 0 if all pass, 1 if any fail
- Each scenario prints: `[PASS] V1: Set session timeout to 10 min` or `[FAIL] V12: Expected 403, got 200`

---

## 6. Success Metrics

| Metric | Target | Measurement | When |
|--------|--------|-------------|------|
| Settings enforcement rate | 100% — every setting affects runtime behavior | Validation script proves behavioral impact for each domain | After R1–R6 |
| Validation script pass rate | 65/65 scenarios pass | `validate-platform-settings.ts` output | After R8 |
| Password exposure | 0 instances of plaintext passwords in API responses | Grep API responses in validation script | After R2, R3 |
| Input validation coverage | 100% — every writable field has Zod validation | Audit of validators vs. fields | After R7 |
| Audit trail completeness | 100% — every settings mutation logged | Check audit log count after script runs | After R7B |
| RBAC enforcement | 100% — user role denied on all settings endpoints | RBAC scenarios in validation script | After R7A |

---

## 7. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| Q1 | Should mail test send to a real mailbox or use a mock in CI? | Engineering | No — mock mode exists for dev, real for manual testing |
| Q2 | Should proxy integration be tested in CI (requires a real proxy)? | Engineering | No — unit test the `getProxyAgent()` factory, integration test optional |
| Q3 | Should risk score weights validate to exactly 3 decimal places? | Product | No — 2 decimal places sufficient for MVP |
| Q4 | Should branding logo use MinIO public bucket policy or a redirect endpoint? | Engineering | No — redirect endpoint is simpler and doesn't require MinIO policy changes |
| Q5 | Should orphaned vendor logos be cleaned up on a schedule (cron) or only on replacement? | Engineering | No — on-replacement is sufficient for now |

---

## 8. Timeline Considerations

**Dependencies:**
- Pipeline 2A (RBAC) must be `COMPLETED` before starting. **Status: COMPLETED.**
- No dependency on 2B (LDAP) or 2C (Org Management).
- Can run in parallel with 2E, 2F, 2G.

**Execution order within pipeline:**
```
R7A (RBAC verification)     ← First — confirms 2A works for settings
    ↓
R1 (Server settings)       ← Foundation — getServerSettings() used by others
R2 (Mail server)           ← Independent, can parallel with R1
R3 (Proxy server)          ← Independent, can parallel with R1/R2
    ↓
R4 (Branding)              ← Independent
R5 (Remote Desktop)        ← Independent
R6 (Risk Score)            ← Depends on vulnerability data from Pipeline 1
    ↓
R7B, R7C (Audit + Errors)  ← Cross-cutting, after main features
    ↓
R8 (Validation script)     ← Last — tests everything
```

**Estimated scope:** 6 requirements + validation script across 6 settings domains.

---

## Appendix A: Settings Domain → DB Storage Map

| Domain | Storage | Table/Category | Key Pattern |
|--------|---------|----------------|-------------|
| Server | Key-value | `setting` / `server` | `server.sessionTimeoutMinutes`, etc. |
| Mail | Key-value | `setting` / `mail` | `mail.host`, `mail.port`, etc. |
| Proxy | Key-value | `setting` / `proxy` | `proxy.enabled`, `proxy.host`, etc. |
| Branding | Key-value | `setting` / `branding` | `branding.companyName`, `branding.logoObjectKey` |
| Remote Desktop | Key-value | `setting` / `remote-desktop` | `remote-desktop.connectionType`, etc. |
| Risk Score | Key-value | `setting` / `risk-score` | `risk-score.vulnerabilityScoreWeight`, etc. |
| Vendor Logos | Dedicated table | `vendorLogo` | Row per logo |

## Appendix B: Current Endpoints (Pre-Hardening)

| Method | Endpoint | Current Status |
|--------|----------|----------------|
| `GET` | `/v1/settings/server` | Working (returns defaults) |
| `PUT` | `/v1/settings/server` | Working (saves, no enforcement) |
| `GET` | `/v1/settings/mail-server` | Working (leaks password) |
| `PUT` | `/v1/settings/mail-server` | Working (no password preservation) |
| `POST` | `/v1/settings/mail-server/test` | Working (uses submitted config) |
| `GET` | `/v1/settings/proxy-server` | Working (leaks password) |
| `PUT` | `/v1/settings/proxy-server` | Working (no conditional validation) |
| `POST` | `/v1/settings/proxy-server/test` | Working (uses submitted config) |
| `GET` | `/v1/settings/branding` | Working (presigned URL expires) |
| `POST` | `/v1/settings/branding` | Working (no orphan cleanup) |
| `GET` | `/v1/settings/branding/logo` | Does not exist |
| `GET` | `/v1/settings/vendor-logos` | Working |
| `POST` | `/v1/settings/vendor-logos` | Working |
| `GET` | `/v1/settings/vendor-logos/:id` | Working |
| `PUT` | `/v1/settings/vendor-logos/:id` | Working |
| `DELETE` | `/v1/settings/vendor-logos/:id` | Working |
| `GET` | `/v1/settings/remote-desktop` | Working |
| `PUT` | `/v1/settings/remote-desktop` | Working |
| `POST` | `/v1/settings/remote-desktop/reset` | Working |
| `GET` | `/v1/settings/risk-score` | Working (no sum validation) |
| `PUT` | `/v1/settings/risk-score` | Working (no consumer) |

## Appendix C: API Response Examples

### Server Settings GET Response
```json
{
  "success": true,
  "data": {
    "sessionTimeout": true,
    "sessionTimeoutMinutes": 60,
    "sessionIdleTimeoutMinutes": 15,
    "endpointOnlineStatusTimeoutHours": 1,
    "endpointScanJobTimeoutHours": 1,
    "logLevel": "Info"
  }
}
```

### Mail Server GET Response (Hardened)
```json
{
  "success": true,
  "data": {
    "host": "smtp.company.com",
    "port": 587,
    "protocol": "TLS",
    "fromAddress": "noreply@company.com",
    "fromName": "PatchIQ",
    "enableAuthentication": true,
    "username": "smtp-user",
    "password": null
  }
}
```

### Risk Score Validation Error Response
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "constraint": "Weights must sum to 1.0",
      "actual": 0.8,
      "fields": ["vulnerabilityScoreWeight", "vulnerabilitySeverityWeight", "threatsWeight", "endpointVisitsWeight"]
    }
  }
}
```

### Audit Log Entry for Settings Change
```json
{
  "id": "uuid",
  "userId": "admin-uuid",
  "userEmail": "admin@patchiq.io",
  "action": "UPDATE",
  "resource": "server-settings",
  "resourceId": null,
  "details": "Updated server settings: sessionTimeoutMinutes changed from 60 to 10",
  "ipAddress": "127.0.0.1",
  "timestamp": "2026-02-13T12:00:00Z"
}
```

---

*This PRD is the single source of truth for Pipeline 2D. All 65 validation scenarios must pass before marking as COMPLETED.*
