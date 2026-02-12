# PRD: A.8 — Wrap Raw SQL in Error Handling

> **Status:** PENDING
> **Track:** A (Backend & Platform)
> **Priority:** Must Have (Week 1)
> **Estimated Effort:** Half day

---

## 1. Problem Statement

The dashboard service (`dashboard.service.ts`) contains 4 raw `$queryRaw` calls that execute SQL directly against PostgreSQL. These queries have **zero error handling** — any schema change, missing table, or data type mismatch causes an unhandled exception that crashes the dashboard API endpoint for **all users**.

The dashboard is the landing page every user sees after login. A single crash here makes the entire platform appear broken.

**Affected queries:**

| # | Method | Line | Tables Joined | What It Computes |
|---|--------|------|---------------|------------------|
| 1 | `getVulnerabilityByDiscoveredDate()` | 360 | `asset_vulnerabilities`, `vulnerabilities` | Vulnerability counts bucketed by age (< 30d, 30-60d, etc.) |
| 2 | `getTotalSoftwareByPlatform()` | 569 | `assets`, `asset_software` | Software count grouped by OS |
| 3 | `getAlertSeverityCountByPlatform()` | 636 | `asset_vulnerabilities`, `assets`, `vulnerabilities` | Severity breakdown per OS platform |
| 4 | `getAlertSeverityCountByModule()` | 698 | `vulnerability_software`, `vulnerabilities` | Severity breakdown per software module |

---

## 2. Goals

1. **Dashboard never crashes** — all 4 raw SQL methods degrade gracefully to empty/default data on failure
2. **Errors are logged** — every caught SQL error is logged with structured context (method name, error message) via the Pino logger
3. **Zero user-facing impact** — frontend dashboard renders normally with empty charts instead of a 500 error page
4. **No behavioral change on success** — when queries succeed, the response is identical to today

---

## 3. Non-Goals

- **Rewriting raw SQL as Prisma queries** — out of scope; these use PostgreSQL-specific `FILTER (WHERE ...)` syntax that Prisma doesn't support
- **Adding retry logic** — schema issues are persistent, retrying won't help
- **Adding monitoring/alerting** — logging is sufficient for Sprint 1; alerting is Sprint 2+
- **Fixing the dashboard data itself** — `getExpiredCertificates()` and `getMaliciousProcessesByPlatform()` return empty arrays by design (A.13)

---

## 4. User Stories

- **As any PatchIQ user**, I want the dashboard to always load, even if some data sources are unavailable, so that I can still navigate to other parts of the platform.
- **As a platform administrator**, I want SQL errors logged with context so that I can diagnose which dashboard widget failed and why.

---

## 5. Requirements

### Must-Have (P0)

**R1: Try/catch wrapper on all 4 raw SQL methods**

Each of the 4 methods listed above must be wrapped in a try/catch block that:
- Catches any error thrown by `prisma.$queryRaw`
- Logs the error using the module's Pino logger (`logger.error({ err, method }, 'Raw SQL query failed')`)
- Returns the appropriate empty/default value for that method's return type

**R1 — Fallback return values:**

| Method | Return Type | Fallback Value |
|--------|------------|----------------|
| `getVulnerabilityByDiscoveredDate()` | `VulnerabilityByDate[]` | The 4 range buckets with all counts = 0 |
| `getTotalSoftwareByPlatform()` | `DistributionItem[]` | `[]` (empty array) |
| `getAlertSeverityCountByPlatform()` | `AlertSeverityByPlatform[]` | `[]` (empty array) |
| `getAlertSeverityCountByModule()` | `AlertSeverityByModule[]` | `[]` (empty array) |

**R2: Structured error logging**

Each catch block must log with:
- `err` — the caught error object (Pino serializes this automatically)
- `method` — string name of the method that failed
- Log level: `error`

### Nice-to-Have (P1)

**R3: Helper function to reduce boilerplate**

If the try/catch pattern is repetitive, extract a generic helper:
```typescript
async function safeQueryRaw<T>(fn: () => Promise<T>, fallback: T, method: string): Promise<T>
```
This is optional — inline try/catch is perfectly acceptable for 4 call sites.

---

## 6. Acceptance Criteria

### Functional

- [ ] **AC-1:** When `asset_vulnerabilities` table doesn't exist (or query fails), `getVulnerabilityByDiscoveredDate()` returns 4 buckets with all zeros — dashboard renders empty chart
- [ ] **AC-2:** When `asset_software` table doesn't exist (or query fails), `getTotalSoftwareByPlatform()` returns `[]` — dashboard renders empty chart
- [ ] **AC-3:** When the 3-table join in `getAlertSeverityCountByPlatform()` fails, it returns `[]` — dashboard renders empty chart
- [ ] **AC-4:** When the join in `getAlertSeverityCountByModule()` fails, it returns `[]` — dashboard renders empty chart
- [ ] **AC-5:** When all queries succeed (normal case), dashboard response is **identical** to the current behavior — no regression
- [ ] **AC-6:** Each failure is logged at `error` level with the method name and error details

### Non-Functional

- [ ] **AC-7:** No new dependencies added
- [ ] **AC-8:** `make check-all` passes (types + lint + build)
- [ ] **AC-9:** No `as any` or `@ts-ignore` used

---

## 7. Test Plan

### Unit Tests

Create `backend/src/modules/dashboard/__tests__/dashboard-sql-protection.test.ts`:

**Test 1: `getVulnerabilityByDiscoveredDate` returns fallback on SQL error**
- Mock `prisma.$queryRaw` to throw an error
- Call the method
- Assert it returns 4 range buckets with all counts = 0
- Assert logger.error was called with method name

**Test 2: `getTotalSoftwareByPlatform` returns empty array on SQL error**
- Mock `prisma.$queryRaw` to throw an error
- Call the method
- Assert it returns `[]`
- Assert logger.error was called

**Test 3: `getAlertSeverityCountByPlatform` returns empty array on SQL error**
- Mock `prisma.$queryRaw` to throw an error
- Call the method
- Assert it returns `[]`
- Assert logger.error was called

**Test 4: `getAlertSeverityCountByModule` returns empty array on SQL error**
- Mock `prisma.$queryRaw` to throw an error
- Call the method
- Assert it returns `[]`
- Assert logger.error was called

**Test 5: Methods return real data when queries succeed (no regression)**
- Mock `prisma.$queryRaw` to return valid data
- Call each method
- Assert the output matches expected transformation (bigint → number, etc.)

**Test 6: Error log includes method name and error object**
- Mock `prisma.$queryRaw` to throw `new Error('relation "asset_vulnerabilities" does not exist')`
- Call any protected method
- Assert `logger.error` was called with `{ err: <Error>, method: '<methodName>' }`

---

## 8. Implementation Notes

- Import `createLogger` from `@shared/services/logger` and create a module-scoped logger: `const logger = createLogger('dashboard')`
- The `getVulnerabilityByDiscoveredDate` fallback is NOT just `[]` — it must return the 4 labeled range buckets with zero counts so the frontend chart renders empty buckets correctly
- `bigint` → `Number()` conversion already exists in the current code; the fallback bypasses this since it uses plain numbers

---

## 9. Open Questions

None — this is a straightforward defensive coding task with clear boundaries.

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Dashboard 500 errors caused by raw SQL | 0 (down from any-schema-change-crashes-all) |
| Regression in happy-path dashboard response | None — byte-identical output |
| `make check-all` | Passes |
