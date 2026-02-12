# Sprint 1: Fix & Ship Roadmap

> **Goal:** Fix every broken feature, implement missing backend services, and bring the platform to a fully functional state.
> **Format:** Now / Next / Later with MoSCoW prioritization
> **Developers:** 2 (Track A + Track B, domain-separated)
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
| A.1 | **Create missing API routes** | 8 frontend service calls hit endpoints that don't exist. Every one of these is a user-facing crash. | See table below | `PENDING` |
| A.2 | **Email service (Nodemailer)** | Password reset, user invitations, and report delivery are all no-ops. Users can't recover accounts. | `backend/src/shared/services/email.service.ts` (new), wire into `auth.service.ts:220`, `users.service.ts:307,398`, `reports.controller.ts:166` | `PENDING` |
| A.3 | **CVE sync background job** | `syncVulnerabilityDatabase()` updates a timestamp but never queues work. Vulnerability data goes stale. | `jobs.service.ts:489`, `settings.service.ts:786`, new BullMQ worker | `PENDING` |
| A.4 | **Add missing database indexes** | `User.email` has no index — sequential scan on every login. Org FK fields also missing indexes. | `schema.prisma` — User model | `PENDING` |

#### A.1 — Missing Routes Detail

| Frontend calls | Expected backend route | What to implement |
|---|---|---|
| `POST /patches/:id/scan-endpoints` | `patches.routes.ts` | Add route + controller + service method for endpoint scanning |
| `GET /patches/:id/endpoints` | `patches.routes.ts` | Add route to list endpoints affected by a patch |
| `GET /endpoints/:id` | `assets.routes.ts` | Add route (or alias to existing `/assets/:id/full`) |
| `POST /tags/bulk-assign` | `assets.routes.ts` | Rename existing `/assets/bulk-tags` OR add new `/tags/bulk-assign` route |
| `POST /tags/bulk-remove` | `assets.routes.ts` | Same — add `/tags/bulk-remove` or redirect |
| `GET /tags/search` | `assets.routes.ts` | Add tag search endpoint with query param |
| `GET /categories/:id/assets` | `assets.routes.ts` | Add route to list assets by category |
| `GET /subcategories/:id/assets` | `assets.routes.ts` | Add route to list assets by subcategory |

**Acceptance Criteria:**
- All 8 endpoints return real data (not mocks)
- Each endpoint has Zod validation
- Each endpoint follows the standard `{ success, data, meta?, error? }` envelope
- Frontend pages that call these endpoints load without errors

---

### Next — Should Have (Week 3-4)

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| A.5 | **Network discovery scanning** | `triggerScan()` creates a record but never scans. Discovery is the #1 advertised feature that doesn't work. | `discovery.service.ts:224`, new BullMQ worker for ping sweep / port scan | `PENDING` |
| A.6 | **Asset file upload & CSV import** | 4 endpoints return 501. Bulk onboarding requires manual data entry. | `assets.controller.ts:447,484,542,600`, MinIO integration for attachments, CSV parser for imports | `PENDING` |
| A.7 | **Credential testing** | `testCredential()` always returns success. Users get false confidence before deployments fail. | `discovery.service.ts:484` — implement actual SSH/WinRM/SNMP test | `PENDING` |
| A.8 | **Wrap raw SQL in error handling** | 4 raw queries in dashboard.service.ts throw unhandled errors on schema changes. | `dashboard.service.ts:360,569,636,698` — add try/catch, fallback to empty data | `PENDING` |
| A.9 | **Clean up deployment route duplication** | Deployment routes exist in both patches module and deployments module. Only patches version is mounted. | Delete `deployments/deployment.routes.ts` or consolidate into single source | `PENDING` |

**Acceptance Criteria:**
- Network scan discovers at least local-network devices via ICMP + common ports
- CSV import handles software inventory, software licenses, OS licenses (with validation errors)
- Credential test actually connects to target host and reports pass/fail
- Dashboard doesn't crash on schema changes — degrades gracefully

---

### Later — Could Have (Week 5+)

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| A.10 | **Infrastructure hardening** | Outdated MinIO (3yr old), hardcoded agent URL, port mismatches | `docker-compose.yml:88` (MinIO), `agent/cmd/agent/main.go:44`, `docker-compose.yml:57` (Postgres port) | `PENDING` |
| A.11 | **LDAP authentication** | LdapConfig model exists in schema with encrypted fields, but auth.service.ts has no LDAP flow. | `auth.service.ts` — add LDAP bind + search auth strategy | `PENDING` |
| A.12 | **Role-based permissions** | Role table exists but `User.role` is a plain String. No runtime permission checking. | `schema.prisma` Role model, new middleware for permission checks | `PENDING` |
| A.13 | **Dashboard data completion** | `getExpiredCertificates()` and `getMaliciousProcessesByPlatform()` return empty arrays. | `dashboard.service.ts:548,563` — needs cert/process collection in agent first | `PENDING` |
| A.14 | **License server validation** | `updatePlatformLicense()` simulates valid without server check. | `settings.service.ts:849` | `PENDING` |
| A.15 | **Organization branch asset count** | Hardcoded to `0` instead of computed. | `settings.service.ts:422` | `PENDING` |

---

## Track B: Frontend & Integration (Dev 2)

### Now — Must Have (Week 1-2)

These are user-facing crashes and auth failures.

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| B.1 | **Fix broken service URLs** | 8 frontend services call wrong/missing endpoints. Every one is a page crash or silent failure. | See table below | `PENDING` |
| B.2 | **Fix patch-template sync auth** | Uses `localStorage.getItem('token')` but auth stores as `accessToken`. Every streaming sync gets a 401. | `patch-template.service.ts:74` — change `'token'` to `'accessToken'` | `PENDING` |
| B.3 | **Fix EnrollSecret Modal import** | Page crashes on render — uses `<Modal>` without importing it. | `pages/settings/EnrollSecret.tsx:310` — add `Modal` to antd imports | `PENDING` |
| B.4 | **Fix DistributionServer delete** | `_handleDelete` calls `fetchData()` which doesn't exist. Will crash when activated. | `pages/settings/DistributionServer.tsx:70` — change to `refetch()` from React Query | `PENDING` |
| B.5 | **Standardize response envelope unwrapping** | 3+ different unwrapping patterns across services. Causes inconsistent data shapes in components. | `services/api.service.ts` interceptor — unwrap `{ success, data }` envelope once, consistently | `PENDING` |

#### B.1 — Frontend URL Fixes `[BLOCKED-BY A.1]`

Once Dev 1 ships the backend routes (A.1), Dev 2 updates the frontend to match:

| Service file | Current (broken) | Fix to |
|---|---|---|
| `patch.service.ts:88` | `POST /patches/:id/scan-endpoints` | Keep URL (A.1 creates route) |
| `patch.service.ts:98` | `GET /patches/:id/endpoints` | Keep URL (A.1 creates route) |
| `patch.service.ts:103` | `GET /endpoints/:id` | Change to `GET /assets/:id/full` OR keep (A.1 creates route) |
| `tag.service.ts` | `POST /tags/bulk-assign` | Update to match whatever A.1 implements |
| `tag.service.ts` | `POST /tags/bulk-remove` | Update to match whatever A.1 implements |
| `tag.service.ts:59` | `GET /tags/search` | Keep URL (A.1 creates route) |
| `category.service.ts:64` | `GET /categories/:id/assets` | Keep URL (A.1 creates route) |
| `category.service.ts:69` | `GET /subcategories/:id/assets` | Keep URL (A.1 creates route) |

**Note:** B.2, B.3, B.4, B.5 have **zero backend dependencies** — Dev 2 can start immediately.

**Acceptance Criteria:**
- Zero console errors on any page load
- Patch template sync completes successfully (no 401)
- EnrollSecret settings page renders
- All service responses are unwrapped consistently — components never need `response.data.data || response.data || []`

---

### Next — Should Have (Week 3-4)

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| B.6 | **AI Chat Panel — real integration** | Currently returns hardcoded "coming soon" string. Panel UI is complete, just needs a backend. | `components/chat/AIChatPanel.tsx:102-112`, new `ai.service.ts`, backend endpoint TBD | `PENDING` |
| B.7 | **Patch supersedence UI** | Backend has full CRUD (`/patches/:id/supersede/...`) but no frontend exposes it. | New component in `pages/patches/`, new service methods in `patch.service.ts` | `PENDING` |
| B.8 | **Add sample seed data for demo** | Fresh install shows completely empty dashboards. No patches, vulnerabilities, or assets. | `seed.ts` — add 5-10 sample patches, 5 CVEs (Log4Shell, etc.), 3-5 assets | `PENDING` |
| B.9 | **Agent version seed file paths** | Seed creates 5 agent versions but `filePath: null`. Agent downloads fail until binaries uploaded manually. | `seed.ts:379` — either populate with real paths or add setup instructions | `PENDING` |

**Acceptance Criteria:**
- AI panel sends user messages to a real backend endpoint and displays real responses (even if responses are basic)
- Patch supersedence relationships are visible and manageable from the patch detail page
- Fresh `make dev-fresh` install shows populated dashboard with demo data

---

### Later — Could Have (Week 5+)

| # | Item | Why | Files | Status |
|---|------|-----|-------|--------|
| B.10 | **Asset import UI** | Backend asset import (A.6) needs a frontend upload wizard with progress, validation, error display. `[BLOCKED-BY A.6]` | New component in `pages/assets/` | `PENDING` |
| B.11 | **Network discovery results UI** | If A.5 ships real scanning, the discovery results page may need updates to display found devices. `[BLOCKED-BY A.5]` | `pages/discovery/` | `PENDING` |
| B.12 | **Settings page completion** | Verify all settings sub-pages work end-to-end after backend fixes. LDAP config UI, role management UI if A.11/A.12 ship. | `pages/settings/` | `PENDING` |
| B.13 | **E2E test coverage** | Playwright tests for critical user flows: login, deploy patch, scan vulnerabilities. | `frontend/tests/` | `PENDING` |
| B.14 | **Performance optimization** | Code splitting, lazy routes, bundle analysis. Currently all routes loaded eagerly in App.tsx (~710 lines). | `App.tsx`, Vite config | `PENDING` |

---

## Dependency Map

```
TRACK A (Backend)                          TRACK B (Frontend)
=================                          ==================

A.1 Missing API routes ──────────────────► B.1 Fix frontend URLs
    (Dev 1 creates routes)                     (Dev 2 updates service calls)

A.2 Email service                          B.2 Fix auth localStorage key ◄── NO DEPS
    (independent)                          B.3 Fix Modal import          ◄── NO DEPS
                                           B.4 Fix fetchData → refetch   ◄── NO DEPS
A.3 CVE sync job                           B.5 Envelope unwrapping       ◄── NO DEPS
    (independent)

A.4 DB indexes
    (independent)                          B.6 AI Chat Panel ◄── needs backend endpoint (TBD)

A.5 Network scanning ────────────────────► B.11 Discovery results UI
A.6 Asset file upload ───────────────────► B.10 Asset import UI wizard
A.11 LDAP auth ──────────────────────────► B.12 LDAP settings UI
A.12 Role permissions ───────────────────► B.12 Role management UI
```

**Critical path:** A.1 → B.1 (backend routes must ship before frontend can fix URLs)

**Parallel from day 1:**
- Dev 1 starts A.1 (missing routes) + A.2 (email) + A.4 (indexes)
- Dev 2 starts B.2 + B.3 + B.4 + B.5 (all zero-dependency frontend fixes)

---

## Week-by-Week Plan

### Week 1

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| **A.1** — Create 8 missing API routes | **B.2** — Fix localStorage key (1hr) |
| **A.4** — Add database indexes + migration | **B.3** — Fix Modal import (30min) |
| | **B.4** — Fix fetchData ref (30min) |
| | **B.5** — Standardize envelope unwrapping |

### Week 2

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| **A.2** — Email service (Nodemailer) | **B.1** — Fix all frontend service URLs (after A.1 ships) |
| **A.3** — CVE sync background job | **B.8** — Add sample seed data |
| | **B.9** — Fix agent version seed paths |

### Week 3

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| **A.5** — Network discovery scanning | **B.6** — AI Chat Panel integration |
| **A.8** — Wrap raw SQL in error handling | **B.7** — Patch supersedence UI |

### Week 4

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| **A.6** — Asset file upload + CSV import | **B.6** — AI Chat Panel (continued) |
| **A.7** — Credential testing | **B.10** — Asset import UI (if A.6 ready) |
| **A.9** — Clean up deployment route duplication | |

### Week 5+ (Later items as capacity allows)

| Dev 1 (Track A) | Dev 2 (Track B) |
|---|---|
| A.10 — Infra hardening | B.11 — Discovery results UI |
| A.11 — LDAP auth | B.12 — Settings completion |
| A.12 — Role permissions | B.13 — E2E tests |
| A.13-A.15 — Dashboard, license, org count | B.14 — Performance |

---

## Exit Criteria (Sprint 1 Complete)

### Must pass before Sprint 1 is "done":
- [ ] Zero 404/501 errors from any frontend page (all API routes exist and return real data)
- [ ] Password reset flow works end-to-end (email sent, link works, password changed)
- [ ] User invitation sends real email with onboarding link
- [ ] CVE database syncs on schedule via background job
- [ ] `make dev-fresh` produces a populated dashboard with demo data
- [ ] `make check-all` passes (types + lint + build)

### Should pass:
- [ ] Network discovery scan finds local devices
- [ ] CSV import works for software inventory
- [ ] AI chat panel communicates with a real backend
- [ ] Patch supersedence visible in UI

---

## Capacity Allocation

| Category | Allocation | Notes |
|----------|------------|-------|
| Bug fixes (Now) | 50% | Broken endpoints, auth, imports — Week 1-2 |
| Feature completion (Next) | 35% | Email, CVE sync, discovery, AI panel — Week 3-4 |
| Hardening (Later) | 15% | Infra, LDAP, roles, E2E — Week 5+ |

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
| **Integration checkpoint** | End of Week 1, End of Week 2 | Both devs merge to main. Run full `make check-all` + manual smoke test together. Fix any integration issues before moving on. |

### Merge Rules

1. **Never merge a broken build** — `make check-all` must pass (types + lint + build)
2. **Item-level granularity** — merge after completing one roadmap item (e.g., A.1), not after a batch
3. **Rebase, don't merge commit** — keeps history linear and easy to bisect
4. **A.1 is the first critical merge** — Dev 2 cannot start B.1 until A.1 lands on main. Dev 1 should prioritize A.1 day 1.
5. **Conflict resolution** — if both devs touch `shared/types/`, Dev 1 (backend) defines the type, Dev 2 (frontend) adapts

### Communication Protocol

- **Slack/DM when merging to main** — so the other dev knows to rebase
- **Slack/DM when a blocker is hit** — especially cross-track dependencies
- **No silent pushes** — every main merge gets a one-line message: "A.1 merged — 8 new API routes ready"

---

## Issue Inventory (Full Reference)

Total issues found: **30**

| Priority | Count | Items |
|----------|-------|-------|
| Critical (broken now) | 10 | A.1 (8 routes), B.2 (auth key), B.3 (Modal import) |
| High (non-functional features) | 5 | A.2 (email), A.3 (CVE sync), A.5 (discovery), B.6 (AI panel), reports email |
| Medium (degraded experience) | 9 | A.6-A.9, B.1, B.4, B.5, B.7, route duplication |
| Low (config/schema/polish) | 6 | A.10-A.15 |

---

*This roadmap is a living document. Update status fields as work progresses.*
