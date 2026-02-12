# Sprint 2: Backend Pipeline Recommendations

> **Purpose:** Catalogue every backend pipeline that needs hardening, prioritized by impact.
> **Approach:** One pipeline at a time. Finish completely, then move to next.
> **Created:** 2026-02-13

---

## Pipeline Overview

| # | Pipeline | Severity | Summary |
|---|----------|----------|---------|
| **P1** | Patch-Vulnerability Correlation | Critical | Core product value — currently broken. PRD written. |
| **P2** | Settings & Configuration | Critical | 7 entire endpoint groups missing. RBAC not enforced. |
| **P3** | Deployment Execution | High | Job→deployment execution disconnected. No scheduler. |
| **P4** | Agent Communication | High | Heartbeat flooding, no rate limits, incomplete rollback tracking. |
| **P5** | Reports & Notifications | Medium | Sync file I/O, silent email failures, memory leak in dedup. |
| **P6** | Hub & Package Management | Medium | No upload size limits, sync tar extraction, no bundle validation. |
| **P7** | Security Hardening | High | LDAP MITM risk, path traversal, missing input sanitization. |
| **P8** | Observability & Reliability | Medium | Empty catch blocks, no circuit breakers, no error IDs. |

---

## P1: Patch-Vulnerability Correlation `NOW — IN PROGRESS`

**PRD:** `docs/sprint-2/PRD-PATCH-VULNERABILITY-CORRELATION.md`

Already scoped. 8 requirements (R1-R8), 55+ test cases, 5 test applications.

---

## P2: Settings & Configuration

**Problem:** 7 frontend settings pages hit endpoints that don't exist. RBAC is defined in the database but never enforced at runtime.

### Missing Backend Endpoint Groups

| Feature | Frontend Expects | Backend Status |
|---------|-----------------|----------------|
| Enroll Secrets | CRUD + export | No routes |
| Distribution Servers | CRUD + download + export | No routes |
| Password Policies | Dedicated endpoint | Piggybacks on alert configs (hack) |
| Patch Preferences | Get + update + sync | No routes |
| Integrations/Marketplace | CRUD + toggle | No routes |
| Red Hat Nominations | List + update + export | No routes |
| Agent Approval Settings | Get + update | No routes |

### Missing Alert Sub-Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /settings/alerts/:id/clone` | Clone alert config |
| `POST /settings/alerts/:id/disable` | Toggle alert |
| `GET /settings/alerts/:id/affected-users` | Show impacted users |
| `GET /settings/alerts/:id/audit` | Audit trail |

### RBAC Gap (Security)

- `Role` table stores permissions JSON — frontend has `PermissionsGrid.tsx`
- `requireRole()` middleware exists but only checks role name, not granular permissions
- **No `requirePermission(module, action)` middleware** — any authenticated user can access any endpoint
- JWT includes `role` but permissions are never validated at request time

### Other Issues

- License validation stubbed (`settings.service.ts:842`) — returns fake license
- Organization branch asset count hardcoded to `0` (`organizations.service.ts:422`)
- LDAP config accepts extra frontend fields that are never stored
- 5+ endpoints missing Zod validation (computer groups, deployment policies, patch management)

### Scope Estimate

- ~7 new CRUD endpoint groups (validators already exist for most)
- 1 RBAC middleware + integrate into all routes
- ~4 alert sub-endpoints
- License validation, asset count fix, missing validators

---

## P3: Deployment Execution

**Problem:** The deployment engine works, but the job management UI is disconnected from it. Scheduled jobs never execute.

### Critical Issues

| Issue | Location | Impact |
|-------|----------|--------|
| **Jobs don't execute deployments** | `jobs.service.ts:564-598` | Software deployments from jobs UI create records but never dispatch agent commands |
| **Patch jobs never deploy** | `jobs.service.ts:135-168` | Patch jobs created with RUNNING status but no execution triggered |
| **No deployment scheduler** | Missing worker | Scheduled deployments (`scheduledAt` field) are dead code |
| **Config deployment failures silenced** | `jobs.service.ts:976-987` | Falls back to record-only on failure, no user notification |

### Missing Pieces

| Item | Details |
|------|---------|
| Patch bundle download endpoint | `deployment-executor.service.ts:386` references `/patches/:patchId/bundle/stream` — route doesn't exist |
| Deployment policy enforcement | Policies are UI metadata only, not used during execution |
| Rollback completion tracking | Rollback commands created but status stays `ROLLBACK_IN_PROGRESS` forever |
| Scheduled job worker | BullMQ worker to check and execute jobs at `scheduledAt` time |

### What Works (Don't Touch)

- Core deployment execution engine (software/patch/config) — fully functional
- Agent command dispatch and result processing
- Auto-retry and rollback for patches
- Vulnerability resolution on successful patch deployment
- Hub bundle operations (upload, extract, validate, stream)

### Scope Estimate

- Wire `deploymentExecutorService` into jobs creation endpoints
- New BullMQ worker for scheduled deployments
- Patch bundle download route
- Rollback completion handler in `processCommandResult()`
- Deployment policy enforcement (or remove if not needed)

---

## P4: Agent Communication

**Problem:** Agent endpoints lack rate limiting and validation. Some command types may not be handled by the Go agent.

### Issues

| Issue | Location | Risk |
|-------|----------|------|
| No heartbeat rate limiting | `agents.service.ts` | Malicious agent floods DB |
| No agent version format validation | `registerAgent()` | Bad version strings break comparisons |
| Uncapped tags per agent | Lines 367-386 | Database bloat |
| Command type mismatch | `ROLLBACK_EXECUTE` vs agent Go code | Commands may fail silently on agent |
| Inventory processing has no size limits | Lines 778-1175 | Large inventory payloads overwhelm backend |

### Scope Estimate

- Rate limiting middleware for agent endpoints
- Agent version validation
- Tag limits
- Audit Go agent command handler compatibility
- Inventory payload size validation

---

## P5: Reports & Notifications

**Problem:** Reports use synchronous file I/O. Notifications have memory leaks and silent failures.

### Issues

| Issue | Location | Risk |
|-------|----------|------|
| `fs.writeFileSync` in report generation | `reports.service.ts:742-773` | Blocks event loop on large reports |
| `fs.mkdirSync` for report dirs | `reports.service.ts:837-949` | Blocks event loop |
| No cleanup on failed reports | `reports.service.ts:576-633` | Disk space waste |
| Hardcoded `take: 10000` row limit | `reports.service.ts:665-731` | Memory exhaustion |
| In-memory dedup map (notifications) | `notifications.service.ts:22-37` | Memory leak — never cleaned by TTL |
| Silent email failures | `notifications.service.ts:187-195` | `.catch(() => {})` — invisible failures |
| SSE connection drop not detected | `notifications.service.ts:169` | Messages lost |

### Scope Estimate

- Convert to async file operations
- Add report size limits and cleanup
- Move notification dedup to Redis
- Add email failure tracking/retry
- SSE connection health checks

---

## P6: Hub & Package Management

**Problem:** Hub accepts bundles without size validation. Tar extraction is synchronous.

### Issues

| Issue | Location | Risk |
|-------|----------|------|
| Synchronous tar extraction | `hub.service.ts:168-178` | Blocks event loop on large bundles |
| No bundle size validation | `hub.service.ts` | Zip bomb risk |
| No upload size limits (MinIO) | `minio.service.ts` | Disk exhaustion |
| Lazy init race condition (MinIO) | `minio.service.ts:75-94` | Concurrent init attempts |
| Manifest validation is shallow | `hub.service.ts:189-197` | Missing Zod schema |
| `fs.rmSync` for temp cleanup | `hub.service.ts:284-287` | Sync I/O |

### Scope Estimate

- Async tar extraction
- Bundle and upload size limits
- MinIO init locking
- Zod manifest validation
- Async temp cleanup

---

## P7: Security Hardening

**Problem:** Multiple security issues across the backend.

### Issues

| Issue | Location | Severity |
|-------|----------|----------|
| **LDAP `rejectUnauthorized: false`** | `ldap.service.ts:37` | Critical — MITM in production |
| **Missing input sanitization for file paths** | Multiple services | High — path traversal |
| **CIDR parsing without validation** | `discovery.service.ts:732-748` | Medium — undefined behavior |
| **Credentials not cleared from memory** | `discovery.service.ts:476-486` | Medium |
| **Stack traces in staging** | `error.ts:71` | Low — info disclosure |
| **Software catalog no API rate limiting** | `software-catalog-populator.service.ts` | Medium — IP bans |

### Scope Estimate

- Make TLS verification configurable (default: strict)
- Input sanitization utility for file paths
- CIDR validation
- Secure credential handling
- Stack trace control by environment
- External API rate limiting wrapper

---

## P8: Observability & Reliability

**Problem:** Errors are silently swallowed. No circuit breakers. No error tracking IDs.

### Issues

| Issue | Count | Impact |
|-------|-------|--------|
| Empty catch blocks (`catch(() => {})`) | ~20 files | Debugging impossible |
| No error correlation IDs | All errors | Can't trace user reports to logs |
| No circuit breaker for external APIs | NVD, EPSS, OpenRouter, etc. | Cascade failures |
| No request timeout standardization | Multiple services | Inconsistent behavior |
| Alert config cache (30s TTL, no invalidation) | `alert-evaluation.service.ts:22-44` | Stale configs |
| Job polling without backoff | `jobs.service.ts:347-381` | Unnecessary DB load |
| Timezone-unaware scheduling | `jobs.service.ts:305-322` | Jobs run at wrong times |

### Scope Estimate

- Replace empty catches with structured logging
- Error ID generation middleware
- Circuit breaker utility for external APIs
- Centralized timeout configuration
- Cache invalidation on config changes
- Exponential backoff for polling
- Timezone-aware scheduling

---

## Recommended Pipeline Order

```
P1: Patch-Vulnerability Correlation  ← NOW (core product value)
    ↓
P2: Settings & Configuration         ← RBAC is a security gap
    ↓
P3: Deployment Execution             ← Jobs UI is broken without this
    ↓
P7: Security Hardening               ← Should be done before any production use
    ↓
P4: Agent Communication              ← Rate limiting + validation
    ↓
P5: Reports & Notifications          ← Async I/O + reliability
    ↓
P6: Hub & Package Management         ← Size limits + validation
    ↓
P8: Observability & Reliability      ← Cross-cutting polish
```

**Rationale:**
- P1 first — it's the core product value and already has a PRD
- P2 second — RBAC is a security gap, and 7 settings pages are completely broken
- P3 third — jobs UI creates phantom deployments (records without execution)
- P7 before production — LDAP MITM and path traversal are real risks
- P4-P8 are progressive hardening for production readiness

---

## Sprint 1 Deferred Items (Mapped to Pipelines)

| Item | Pipeline |
|------|----------|
| A.10 Infrastructure hardening | P6 (Hub) + P7 (Security) |
| A.11 LDAP authentication | P2 (Settings) |
| A.12 Role-based permissions | P2 (Settings) |
| A.13 Dashboard data completion | P4 (Agent) — needs agent collectors |
| A.14 License server validation | P2 (Settings) |
| A.15 Organization branch asset count | P2 (Settings) |
| B.13 E2E test coverage | Per-pipeline (each pipeline adds its own tests) |
| B.14 Performance optimization | P8 (Observability) |

---

*Update this document as pipelines complete. Write a focused PRD for each pipeline before starting it.*
