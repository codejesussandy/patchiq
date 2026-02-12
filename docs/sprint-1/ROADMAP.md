# Sprint 1: Fix & Ship Roadmap

> **Goal:** Fix every broken feature, implement missing backend services, and bring the platform to a fully functional state — ready for Sprint 2 feature refinement.
> **Format:** Now / Next / Later with MoSCoW prioritization
> **Developers:** 2 (Track A + Track B, domain-separated)
> **Duration:** 4 weeks (compressed)
> **Last Updated:** 2026-02-12

---

## Developer Split

| Track | Owner | Domain | Boundary |
|-------|-------|--------|----------|
| **Track A** | Dev 1 | **Backend & Platform** | Backend services, database, Prisma, infrastructure, Go agent, Docker/nginx |
| **Track B** | Dev 2 | **Frontend & Integration** | React pages, service layer, hooks, components, API alignment, UX |

**Rule:** Each developer owns their track end-to-end. Cross-track dependencies are marked with `[BLOCKED-BY A.x]` or `[BLOCKED-BY B.x]`. The blocked item cannot start until the dependency is shipped.

---

## Track A: Backend & Platform (Dev 1)

### Now — Must Have (Week 1-2)

These are critical — the platform is broken without them.

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| A.1 | **Create missing API routes** | 8 frontend service calls hit endpoints that don't exist. Every one is a user-facing crash. | See table below | `COMPLETED` |
| A.2 | **Wire email service into workflows** | `email.service.ts` exists (Nodemailer) but password reset, invitations, and reports have `// TODO` stubs — all no-ops. Users can't recover accounts. | Wire `email.service.ts` into `auth.service.ts:220`, `users.service.ts:307,398`, `reports.controller.ts:166` | `COMPLETED` |
| A.3 | **CVE sync background job** | `syncVulnerabilityDatabase()` updates a timestamp but never queues work. Vulnerability data goes stale. **Sprint 2 prerequisite (patch-CVE correlation).** | `jobs.service.ts:489`, `settings.service.ts:786`, new BullMQ worker | `COMPLETED` |
| A.8 | **Wrap raw SQL in error handling** | 4 raw `$queryRaw` queries in dashboard.service.ts throw unhandled errors on any schema change. Dashboard crashes for all users. | `dashboard.service.ts:360,569,636,698` — add try/catch, fallback to empty data | `COMPLETED` |

#### A.1 — Missing Routes Detail

| Frontend calls | Expected backend route | What to implement |
|---|---|---|
| `POST /patches/:id/scan-endpoints` | `patches.routes.ts` | Add route + controller + service method for endpoint scanning |
| `GET /patches/:id/endpoints` | `patches.routes.ts` | Add route to list endpoints affected by a patch |
| `GET /endpoints/:id` | `assets.routes.ts` | Add route (or alias to existing `/assets/:id/full`) |
| `POST /tags/bulk-assign` | `assets.routes.ts` | Backend has `POST /assets/bulk-tags` — either rename to `/tags/bulk-assign` OR add redirect |
| `POST /tags/bulk-remove` | `assets.routes.ts` | Add `/tags/bulk-remove` route (no existing equivalent) |
| `GET /tags/search` | `assets.routes.ts` | Add tag search endpoint with query param |
| `GET /categories/:id/assets` | `assets.routes.ts` | Add route to list assets by category |
| `GET /subcategories/:id/assets` | `assets.routes.ts` | Add route to list assets by subcategory |

> **Note on #4:** Backend already has `POST /assets/bulk-tags` at `assets.routes.ts:70`. Frontend calls `POST /tags/bulk-assign`. Resolve the URL mismatch — prefer keeping the backend URL and fixing the frontend in B.1.

**Acceptance Criteria:**
- All 8 endpoints return real data (not mocks)
- Each endpoint has Zod validation
- Each endpoint follows the standard `{ success, data, meta?, error? }` envelope
- Frontend pages that call these endpoints load without errors

---

### Next — Should Have (Week 3-4)

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| A.4 | **Add missing database indexes** | `organizationId`, `departmentId`, `locationId` FK fields on User model have no indexes — sequential scans on admin queries. | `schema.prisma` — User model `@@index` | `COMPLETED` |
| A.5 | **Network discovery scanning** | `triggerScan()` creates a record but never scans. Discovery is the #1 advertised feature that doesn't work. | `discovery.service.ts:224`, new BullMQ worker for ping sweep / port scan | `COMPLETED` |
| A.6 | **Asset file upload & CSV import** | 4 endpoints return 501. Bulk onboarding requires manual data entry. | `assets.controller.ts:447,484,542,600`, MinIO integration for attachments, CSV parser for imports | `COMPLETED` |
| A.7 | **Credential testing** | `testCredential()` always returns `{ success: true }`. Users get false confidence before deployments fail. | `discovery.service.ts:484` — implement actual SSH/WinRM/SNMP test | `COMPLETED` |
| A.9 | **Consolidate deployment route duplication** | Deployment routes exist in both `patches.routes.ts` (lines 214-372) AND `deployments/deployment.routes.ts` (lines 18-42). **Both are mounted** in `app.ts` (lines 188, 191) creating duplicate endpoints at `/v1/patches/...` and `/v1/deployments/...`. | Consolidate into single module, remove duplicate mount | `COMPLETED` |
| A.16 | **AI chat backend endpoint** | No backend exists for the AI chat panel. **Sprint 2 prerequisite (AI/MCP access).** Basic endpoint that accepts messages and returns responses — even simple rule-based responses are fine for Sprint 1. | New `ai` module or route in existing module, `POST /ai/chat` | `COMPLETED` |

> **A.4 note:** `User.email` already has `@unique` (implicit index) — login performance is fine. The missing indexes are only on FK fields used in admin/filtering queries.

**Acceptance Criteria:**
- Network scan discovers at least local-network devices via ICMP + common ports
- CSV import handles software inventory, software licenses, OS licenses (with validation errors)
- Credential test actually connects to target host and reports pass/fail
- Dashboard doesn't crash on schema changes — degrades gracefully
- AI chat endpoint accepts POST with message body, returns structured response
- No duplicate deployment routes

---

### Later — Could Have (Week 5+)

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| A.10 | **Infrastructure hardening** | Outdated MinIO (3yr old), hardcoded agent URL, port mismatches | `docker-compose.yml:88` (MinIO), `agent/cmd/agent/main.go:44`, `docker-compose.yml:57` (Postgres port) | `PENDING` |
| A.11 | **LDAP authentication** | LdapConfig model exists in schema with encrypted fields, but auth.service.ts has no LDAP flow. **Sprint 2 prerequisite (settings).** | `auth.service.ts` — add LDAP bind + search auth strategy | `PENDING` |
| A.12 | **Role-based permissions** | Role table exists but `User.role` is a plain String. No runtime permission checking. **Sprint 2 prerequisite (settings).** | `schema.prisma` Role model, new middleware for permission checks | `PENDING` |
| A.13 | **Dashboard data completion** | `getExpiredCertificates()` and `getMaliciousProcessesByPlatform()` return empty arrays. | `dashboard.service.ts:548,563` — needs cert/process collection in agent first | `PENDING` |
| A.14 | **License server validation** | `updatePlatformLicense()` simulates valid without server check. | `settings.service.ts:849` | `PENDING` |
| A.15 | **Organization branch asset count** | Hardcoded to `0` instead of computed. | `settings.service.ts:422` | `PENDING` |

---

## Track B: Frontend & Integration (Dev 2)

### Now — Must Have (Week 1-2)

These are user-facing crashes, auth failures, and Sprint 2 prerequisites.

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| B.2 | **Fix patch-template sync auth** | Uses `localStorage.getItem('token')` but auth stores as `accessToken`. Every streaming sync gets a 401. | `patch-template.service.ts:74` — change `'token'` to `'accessToken'` | `PENDING` |
| B.3 | **Fix EnrollSecret Modal import** | Page crashes on render — uses `<Modal>` without importing it. | `pages/settings/EnrollSecret.tsx:310` — add `Modal` to antd imports | `PENDING` |
| B.4 | **Fix DistributionServer delete** | `_handleDelete` calls `fetchData()` which doesn't exist (currently dead code, will crash when activated). | `pages/settings/DistributionServer.tsx:70` — change to `refetch()` from React Query | `PENDING` |
| B.5 | **Audit and fix double-unwrapping in services** | `api.service.ts` interceptor already unwraps the `{ success, data }` envelope correctly. But some services defensively double-unwrap (`response.data.data \|\| []`). Audit all 18 service files, remove redundant unwrapping. | Audit all files in `services/`, fix any that access `response.data.data` | `PENDING` |
| B.8 | **Add sample seed data for demo** | Fresh install shows completely empty dashboards. **Sprint 2 prerequisite (patch-CVE correlation needs data to work with).** | `seed.ts` — add 5-10 sample patches, 5 CVEs (Log4Shell, etc.), 3-5 assets | `PENDING` |
| B.9 | **Agent version seed file paths** | Seed creates 5 agent versions but `filePath: null`. Agent downloads fail until binaries uploaded manually. | `seed.ts:379` — either populate with real paths or add setup instructions | `PENDING` |
| B.1 | **Fix broken service URLs** `[BLOCKED-BY A.1]` | 8 frontend services call wrong/missing endpoints. Every one is a page crash or silent failure. | See table below | `PENDING` |

#### B.1 — Frontend URL Fixes `[BLOCKED-BY A.1]`

Once Dev 1 ships the backend routes (A.1), Dev 2 updates the frontend to match:

| Service file | Current (broken) | Fix to |
|---|---|---|
| `patch.service.ts:88` | `POST /patches/:id/scan-endpoints` | Keep URL (A.1 creates route) |
| `patch.service.ts:98` | `GET /patches/:id/endpoints` | Keep URL (A.1 creates route) |
| `patch.service.ts:103` | `GET /endpoints/:id` | Change to `GET /assets/:id/full` OR keep (A.1 creates route) |
| `tag.service.ts:51` | `POST /tags/bulk-assign` | Change to `POST /assets/bulk-tags` (existing backend route) |
| `tag.service.ts:55` | `POST /tags/bulk-remove` | Update to match whatever A.1 implements |
| `tag.service.ts:60` | `GET /tags/search` | Keep URL (A.1 creates route) |
| `category.service.ts:66` | `GET /categories/:id/assets` | Keep URL (A.1 creates route) |
| `category.service.ts:72` | `GET /subcategories/:id/assets` | Keep URL (A.1 creates route) |

**Note:** B.2, B.3, B.4, B.5, B.8, B.9 have **zero backend dependencies** — Dev 2 can start immediately on Day 1.

**Acceptance Criteria:**
- Zero console errors on any page load
- Patch template sync completes successfully (no 401)
- EnrollSecret settings page renders
- Service files don't double-unwrap responses — single consistent pattern everywhere
- `make dev-fresh` produces populated dashboard with demo data

---

### Next — Should Have (Week 3-4)

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| B.6 | **AI Chat Panel — real integration** `[BLOCKED-BY A.16]` | Currently returns hardcoded "coming soon" string after mock delay. Panel UI is complete, just needs a backend. **Sprint 2 prerequisite (AI/MCP access).** | `components/chat/AIChatPanel.tsx:102-112`, new `ai.service.ts` | `PENDING` |
| B.7 | **Patch supersedence management UI** | Backend has full CRUD (`/patches/:id/supersede/...`). Frontend shows supersedence as read-only tags (`PatchDetails.tsx:215-226`) but has no UI to create/delete relationships. | New management component in `pages/patches/`, service methods in `patch.service.ts` | `PENDING` |
| B.12 | **Settings page audit & completion** | Verify all settings sub-pages work end-to-end after backend fixes. **Sprint 2 prerequisite (entire settings refinement).** | `pages/settings/` — audit every sub-page, fix broken ones | `PENDING` |
| B.10 | **Asset import UI** `[BLOCKED-BY A.6]` | Backend asset import (A.6) needs a frontend upload wizard with progress, validation, error display. | New component in `pages/assets/` | `PENDING` |
| B.11 | **Network discovery results UI** `[BLOCKED-BY A.5]` | Discovery results page may need updates to display found devices after A.5 ships real scanning. | `pages/discovery/` | `PENDING` |

**Acceptance Criteria:**
- AI panel sends user messages to a real backend endpoint and displays real responses
- Patch supersedence relationships are manageable (create/delete) from the patch detail page
- All settings sub-pages load and function (no crashes, forms submit, data persists)
- Asset import wizard shows progress and validation errors

---

### Later — Could Have (Week 5+)

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| B.13 | **E2E test coverage** | Playwright tests for critical user flows: login, deploy patch, scan vulnerabilities. | `frontend/tests/` | `PENDING` |
| B.14 | **Performance optimization** | Code splitting, lazy routes, bundle analysis. Currently all routes loaded eagerly in App.tsx (~710 lines). | `App.tsx`, Vite config | `PENDING` |

---

## Dependency Map

```
TRACK A (Backend)                          TRACK B (Frontend)
=================                          ==================

A.1 Missing API routes ──────────────────► B.1 Fix frontend URLs
    (Dev 1 creates routes)                     (Dev 2 updates service calls)

A.2 Wire email service                    B.2 Fix auth localStorage key ◄── NO DEPS
    (independent)                         B.3 Fix Modal import          ◄── NO DEPS
                                          B.4 Fix fetchData → refetch   ◄── NO DEPS
A.3 CVE sync job                          B.5 Audit double-unwrapping   ◄── NO DEPS
    (independent)                         B.8 Seed data                 ◄── NO DEPS
                                          B.9 Agent version paths       ◄── NO DEPS
A.8 Dashboard SQL protection
    (independent)

A.16 AI chat backend ──────────────────► B.6 AI Chat Panel integration
     (Dev 1 creates endpoint)                (Dev 2 wires frontend)

A.5 Network scanning ──────────────────► B.11 Discovery results UI
A.6 Asset file upload ─────────────────► B.10 Asset import UI wizard
A.11 LDAP auth ────────────────────────► B.12 LDAP settings UI (Sprint 2)
A.12 Role permissions ─────────────────► B.12 Role management UI (Sprint 2)
```

**Critical path:** A.1 → B.1 (backend routes must ship before frontend can fix URLs)

**Second critical path:** A.16 → B.6 (AI backend must exist before frontend can integrate)

**Parallel from Day 1:**
- Dev 1 starts A.1 (missing routes) + A.8 (dashboard SQL protection)
- Dev 2 starts B.2 + B.3 + B.4 + B.5 + B.8 + B.9 (all zero-dependency)

---

## Week-by-Week Plan (Compressed)

### Week 1 — Fix Crashes + Seed Data

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| **A.1** — Create 8 missing API routes (primary focus) | **B.2** — Fix localStorage key (1hr) |
| **A.8** — Wrap 4 raw SQL queries in try/catch (half day) | **B.3** — Fix Modal import (30min) |
| | **B.4** — Fix fetchData ref (30min) |
| | **B.5** — Audit 18 service files, remove double-unwrapping (1-2 days) |
| | **B.8** — Add sample seed data: patches, CVEs, assets (2-3 days) |
| | **B.9** — Fix agent version seed paths (half day) |

> **Dev 2 has 6 items.** B.2+B.3+B.4 are done by lunch on Day 1. B.5 fills Day 1-2. B.8+B.9 fill the rest of the week. Zero idle time.

### Week 2 — Email + CVE + Frontend URLs

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| **A.2** — Wire email service into auth + users + reports (2-3 days) | **B.1** — Fix all 8 frontend service URLs (1-2 days, after A.1 lands) |
| **A.3** — CVE sync BullMQ worker (2-3 days) | **B.7** — Patch supersedence management UI (2-3 days) |
| **A.9** — Consolidate deployment routes, remove duplicate mount (1 day) | |

> **A.1 must land early Week 2 (or end of Week 1) to unblock B.1.** Dev 2 starts B.1 immediately, then B.7 while Dev 1 works on email + CVE.

### Week 3 — Discovery + AI Chat + Settings

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| **A.16** — AI chat backend endpoint (1-2 days) | **B.12** — Settings page audit — test every sub-page (2 days) |
| **A.5** — Network discovery scanning (3-4 days) | **B.6** — AI Chat Panel real integration (2-3 days, after A.16) |
| **A.4** — Add FK indexes + migration (half day) | |

> **A.16 is Dev 1's first task of Week 3** to unblock B.6 ASAP. Dev 2 starts with B.12 (settings audit) while waiting.

### Week 4 — File Upload + Import UI + Polish

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| **A.6** — Asset file upload + CSV import (full week) | **B.11** — Discovery results UI (2 days, after A.5) |
| **A.7** — Credential testing (2-3 days) | **B.10** — Asset import UI wizard (3 days, after A.6 lands) |
| | **B.14** — Lazy routes + code splitting (if time) |

> **If A.6 finishes mid-week,** Dev 2 picks up B.10 immediately. Otherwise B.14 (lazy routes) fills the gap.

### Stretch (if ahead of schedule)

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| A.10 — Infra hardening | B.13 — E2E test coverage |
| A.13-A.15 — Dashboard, license, org count | B.14 — Performance (if not done in W4) |

> A.11 (LDAP) and A.12 (roles) are **deferred to Sprint 2** where they'll be properly refined alongside the full settings overhaul.

---

## Sprint 2 Preview (What This Enables)

Sprint 1's goal is to make everything *work*. Sprint 2 refines individual features:

| Sprint 2 Theme | Sprint 1 Prerequisite | Status |
|---|---|---|
| **Patch-CVE Correlation** | A.3 (CVE sync working) + B.8 (seed data for testing) | Tracked |
| **Entire Settings Overhaul** | B.12 (settings audit) + A.2 (email wired in) + A.11/A.12 (LDAP + roles, deferred) | Tracked |
| **AI/MCP Agent Access** | A.16 (AI chat backend) + B.6 (frontend integration) | Tracked |

> Sprint 2 cannot start these themes unless the corresponding Sprint 1 items ship. Prioritize accordingly.

---

## Exit Criteria (Sprint 1 Complete)

### Must pass before Sprint 1 is "done":
- [ ] Zero 404/501 errors from any frontend page (all 8 API routes exist and return real data)
- [ ] Password reset flow works end-to-end (email sent, link works, password changed)
- [ ] User invitation sends real email with onboarding link
- [ ] CVE database syncs on schedule via BullMQ background job
- [ ] Dashboard doesn't crash — raw SQL queries degrade gracefully
- [ ] `make dev-fresh` produces a populated dashboard with demo data
- [ ] `make check-all` passes (types + lint + build)

### Should pass:
- [ ] Network discovery scan finds local devices
- [ ] CSV import works for software inventory
- [ ] AI chat panel communicates with a real backend endpoint
- [ ] Patch supersedence manageable from UI (create/delete relationships)
- [ ] All settings sub-pages load and function correctly
- [ ] No duplicate deployment route mounts

---

## Capacity Allocation

| Category | Allocation | Notes |
|----------|------------|-------|
| Bug fixes (Now) | 45% | Broken endpoints, auth, imports, SQL protection — Week 1-2 |
| Feature completion (Next) | 40% | Email, CVE sync, discovery, AI endpoint, settings audit — Week 2-4 |
| Sprint 2 prep (Next) | 10% | Seed data, AI backend, settings audit — woven into Weeks 1-3 |
| Stretch (Later) | 5% | Infra hardening, E2E tests — only if ahead |

---

## Branching & Merge Strategy

### Branch Structure

```
main
 ├── sprint-1/track-a    (Dev 1 — backend & platform)
 └── sprint-1/track-b    (Dev 2 — frontend & integration)
```

### Merge Cadence

| Event | Frequency | What happens |
|-------|-----------|--------------|
| **Dev merges to own track branch** | Daily (end of day) | Each dev commits and pushes to their track branch. Small, atomic commits. |
| **Track A → main** | Every completed item (A.1, A.2, etc.) | Dev 1 merges to main after each item passes `make check-all`. Dev 2 rebases track-b onto main to pick up new backend routes. |
| **Track B → main** | Every completed item (B.1, B.2, etc.) | Dev 2 merges to main after each item passes `make check-all`. |
| **Cross-track sync** | After every main merge | The other dev rebases their track branch onto main within 24hrs to avoid drift. |
| **Integration checkpoint** | End of Week 2, End of Week 4 | Both devs merge to main. Run full `make check-all` + manual smoke test together. Fix any integration issues before moving on. |

### Merge Rules

1. **Never merge a broken build** — `make check-all` must pass (types + lint + build)
2. **Item-level granularity** — merge after completing one roadmap item (e.g., A.1), not after a batch
3. **Rebase, don't merge commit** — keeps history linear and easy to bisect
4. **A.1 is the first critical merge** — Dev 2 cannot start B.1 until A.1 lands on main. Dev 1 should prioritize A.1 day 1.
5. **A.16 is the second critical merge** — Dev 2 cannot start B.6 until A.16 lands. Dev 1 should start A.16 first in Week 3.
6. **Conflict resolution** — if both devs touch `shared/types/`, Dev 1 (backend) defines the type, Dev 2 (frontend) adapts

### Communication Protocol

- **Slack/DM when merging to main** — so the other dev knows to rebase
- **Slack/DM when a blocker is hit** — especially cross-track dependencies
- **No silent pushes** — every main merge gets a one-line message: "A.1 merged — 8 new API routes ready"

---

## Issue Inventory (Full Reference)

Total issues found: **31** (was 30, added A.16)

| Priority | Count | Items |
|----------|-------|-------|
| Critical (broken now) | 10 | A.1 (8 routes), B.2 (auth key), B.3 (Modal import), A.8 (dashboard crash) |
| High (non-functional features) | 6 | A.2 (email), A.3 (CVE sync), A.5 (discovery), A.16 (AI backend), B.6 (AI panel), reports email |
| Medium (degraded experience) | 9 | A.6-A.7, A.9, B.1, B.4, B.5, B.7, B.12, route duplication |
| Low (config/schema/polish) | 6 | A.4, A.10-A.15 |

---

## Corrections Log (from codebase audit 2026-02-12)

Changes made to the original roadmap based on validation against the actual codebase:

| Item | Original Claim | Correction |
|---|---|---|
| **A.2** | "email.service.ts (new)" | Service already exists (170 lines). Task is **wiring** into auth/users/reports, not creating from scratch. |
| **A.4** | "`User.email` has no index — sequential scan on every login" | `User.email` has `@unique` (implicit index). Login is fine. Missing indexes are on FK fields (`organizationId`, `departmentId`, `locationId`). **Demoted to Should Have.** |
| **A.8** | Should Have (Week 3) | **Promoted to Must Have (Week 1).** Dashboard crash on schema change affects all users — higher blast radius than missing FK indexes. |
| **A.9** | "Only patches version is mounted" | **Both are mounted** in `app.ts` (lines 188, 191). Creates duplicate endpoints, not dead code. |
| **A.16** | *(did not exist)* | **Added.** B.6 (AI Chat) had no backend dependency tracked. Sprint 2 AI/MCP theme requires this. |
| **B.5** | "3+ different unwrapping patterns" | `api.service.ts` interceptor already handles uniform unwrapping. Issue is some services **double-unwrap** defensively. Reduced scope to audit + fix. |
| **B.7** | "No frontend exposes it" | Frontend **does show** supersedence as read-only tags (`PatchDetails.tsx:215-226`). What's missing is **management UI** (create/delete). |
| **B.8/B.9** | Should Have (Week 3-4) | **Promoted to Must Have (Week 1).** Dev 2 needs work while waiting for A.1, and seed data is a Sprint 2 prerequisite. |
| **B.12** | Could Have (Week 5+) | **Promoted to Should Have (Week 3).** Sprint 2 settings theme requires a working baseline. |

---

*This roadmap is a living document. Update status fields as work progresses.*
