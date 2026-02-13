# Sprint 2: Backend Pipeline Hardening

> **Goal:** Strengthen the backend one pipeline at a time until every pipeline is stable, functional, and scalable. Each pipeline is a self-contained unit of work with its own PRD, tests, and acceptance criteria.
> **Scope:** Backend only (this repo). Frontend is handled by Dev 2 in a separate repo.
> **Format:** Now / Next / Later — one pipeline at a time
> **Approach:** Focus on one pipeline, finish it completely, validate, then move to the next. No parallel pipelines — depth over breadth.
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

### Pipeline 2: (TBD) `NEXT`

*To be planned after Pipeline 1 is completed and validated.*

Candidate pipelines (to be prioritized):
- Settings & Configuration (LDAP, roles/permissions, license validation)
- Deployment Execution (Hub → Agent patch deployment, rollback, verification)
- Reporting & Analytics (scheduled reports, export, email delivery)
- AI/MCP Integration (chat intelligence, natural language queries)
- Agent Communication (heartbeat, command queue, software inventory sync)

---

### Pipeline 3+: (TBD) `LATER`

*Additional pipelines will be added as Pipeline 1 and 2 complete.*

---

## Deferred from Sprint 1 (Could Have)

These items were not critical for Sprint 1 and remain in the backlog. They may be addressed as part of a relevant pipeline or as standalone work.

| # | Item | Notes | Candidate Pipeline |
|---|------|-------|--------------------|
| A.10 | Infrastructure hardening | Outdated MinIO, hardcoded agent URL, port mismatches | Deployment Execution |
| A.11 | LDAP authentication | LdapConfig model exists, no auth flow | Settings & Configuration |
| A.12 | Role-based permissions | Role table exists, no runtime checking | Settings & Configuration |
| A.13 | Dashboard data completion | Empty cert/process data, needs agent collection | Agent Communication |
| A.14 | License server validation | Simulated validation | Settings & Configuration |
| A.15 | Organization branch asset count | Hardcoded to 0 | Settings & Configuration |
| B.13 | E2E test coverage | Playwright tests for critical user flows | Any (cross-cutting) |
| B.14 | Performance optimization | Code splitting, lazy routes | Any (cross-cutting) |

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
