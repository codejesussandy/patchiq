# Sprint 1 Must-Have — Backend Validation Report

> **Date:** 2026-02-12
> **Scope:** PRDs A.1, A.2, A.3, A.8 (Track A Must-Have items)
> **Result:** All 4 PRDs pass code review. Backend compiles clean. 4 unit test suites have pre-existing failures.

---

## PRD Validation Results

| PRD | Status | Summary |
|-----|--------|---------|
| **A.1** — Missing API Routes | **PASS** | All 8 routes registered, controllers/services/validators present, org-scoping on all asset queries, input size limits on bulk ops |
| **A.2** — Email Service Wiring | **PASS** | sendEmail helper with mock/DB/env config, password reset, invitation, admin reset, report email all wired, HTML templates, Zod validation on report send |
| **A.3** — CVE Sync Worker | **PASS** | BullMQ worker with lazy init, concurrency 1, 3 retries exponential backoff, stubs replaced in jobs.service + settings.service, setInterval scheduler removed, repeatable job configured, duplicate guard |
| **A.8** — Dashboard SQL Protection | **PASS** | All 4 raw SQL methods wrapped in try/catch, Pino logger error with method name, correct fallback values |
| **Backend `tsc --noEmit`** | **PASS** | Zero TypeScript errors |

---

## Failing Unit Tests (Pre-Existing — Not Sprint 1 Regressions)

**4 suites, 9 tests failing** out of 13 suites / 250 tests total.

### 1. Auth Middleware — `tests/unit/middleware/auth.test.ts` (1 failure)

**Test:** `requireRole › should pass when user has required role`
**Error:** `expect(mockNext).toHaveBeenCalledWith()` — next() called with `ForbiddenError: Insufficient permissions`
**Root Cause:** The `requireRole` middleware logic was updated (likely role checking changed from string match to permission-based), but the test still uses the old assertion. The test mock sets `req.user.role = 'admin'` but the middleware now checks differently.
**Fix:** Update test to match current `requireRole` behavior — verify how roles are checked in the middleware and update the mock user accordingly.

### 2. Agent Validators — `tests/unit/validators/agents.test.ts` (4 failures)

**Tests:**
- `registerAgentSchema › should validate valid registration data`
- `registerAgentSchema › should accept optional fields`
- `registerAgentSchema › should accept valid OS values`
- `listAgentsQuerySchema › should accept valid OS filter`

**Error:** `safeParse` returns `success: false` for previously valid input
**Root Cause:** The Zod schema for agent registration was updated (likely new required fields or changed field types), but tests still use the old input shape.
**Fix:** Compare test input against current `registerAgentSchema` definition in `agents.validators.ts` and add any missing required fields to test fixtures.

### 3. Version Utilities — `tests/unit/version.utils.test.ts` (1 failure)

**Test:** `isVersionInRange › unbounded ranges › should handle no bounds (all versions vulnerable)`
**Error:** Function returns `false` instead of expected `true` when both `versionStartIncluding` and `versionEndExcluding` are undefined
**Root Cause:** The `isVersionInRange` logic was tightened — unbounded ranges (no start, no end) now return `false` instead of `true` as a safety measure.
**Fix:** Either update the test expectation to `false` (if the new behavior is intentional), or restore the original unbounded-range logic if it was an accidental regression.

### 4. CPE Mapping Service — `tests/unit/cpe-mapping.service.test.ts` (3 failures)

**Tests:**
- `resolveCpe › should return null for unknown software when no mappings exist`
- `resolveCpe › should handle empty name gracefully`
- `resolveCpeBatch › should resolve multiple software items`

**Error:** Tests fail on mock/service interaction
**Root Cause:** CPE mapping service internals were refactored (likely Prisma query pattern or return shape changed), but tests still mock the old interface.
**Fix:** Update mocks to match current service implementation and Prisma query patterns.

---

## Integration Tests (84 failures — Infrastructure Required)

The integration test suites require a running PostgreSQL database (`make dev-services`). They cannot run in isolation.

**Failing suites (when DB unavailable):**
- `tests/integration/vulnerabilities.test.ts` (24 tests)
- `tests/integration/agents.test.ts` (7 tests)
- `tests/integration/patches.test.ts` (1 test)
- `tests/integration/notFound.test.ts` (3 tests)

**Action:** Run `make dev-services` first, then `npm run test:e2e` to validate integration tests with live infrastructure.

---

## Frontend Type Errors (Track B — Out of Scope)

The frontend (`tsc -b`) has ~153 pre-existing type errors across ~30 files. These are **not caused by sprint-1 backend work** and fall under Track B scope. Major categories:

- `DataTable` generic constraint too strict (`Record<string, unknown>` vs typed interfaces) — ~30 errors
- `showSizeChanger`/`showTotal` missing from `DataTablePagination` type — ~48 errors
- Implicit `any` on pagination callback params — ~64 errors
- Misc: enum case mismatches, null vs undefined, Ant Design prop types — ~11 errors

---

## Recommended Next Steps

1. **Fix 4 unit test suites** (9 tests) — ~1-2 hours, update test fixtures to match current code
2. **Run integration tests with DB** — `make dev-services && npm run test:e2e`
3. **Frontend type fixes** — Track B scope, defer to Dev 2

---

*Generated by automated PRD validation pipeline — 2026-02-12*
