# PatchIQ Codebase Overhaul Roadmap

> **Goal:** Make development faster, safer, and easy to split among developers.
> **Format:** Now / Next / Later with MoSCoW prioritization
> **Last Updated:** 2026-02-12 (All 4 phases completed)

---

## Completed

### Phase 1: Type Safety & Shared Contracts `MUST HAVE` — COMPLETED

**PRD:** `docs/PRD-PHASE1-TYPE-SAFETY.md`

| # | Item | Status |
|---|------|--------|
| 1.1 | Fix deployment pipeline field mismatches | `COMPLETED` |
| 1.2 | Clean Prisma schema | `COMPLETED` |
| 1.3 | Standardize API response envelope | `COMPLETED` |
| 1.4 | Single source of truth for types | `COMPLETED` |
| 1.5 | Standardize enums | `COMPLETED` |
| 1.6 | Eliminate all `as any` / `@ts-ignore` | `COMPLETED` |
| 1.7 | Type generation script | `COMPLETED` |

### Phase 2: Backend Discipline `MUST HAVE` — COMPLETED

**PRD:** `docs/PRD-PHASE2-BACKEND-DISCIPLINE.md`

| # | Item | Status |
|---|------|--------|
| 2.1 | Structured logging (pino) | `COMPLETED` |
| 2.2 | Prisma transaction wrappers | `COMPLETED` |
| 2.3 | Complete Zod validation coverage | `COMPLETED` |
| 2.4 | Generic CRUD base service | `COMPLETED` |
| 2.5 | Request/response audit logging | `COMPLETED` |
| 2.6 | Service architecture guidelines | `COMPLETED` |

### Phase 3: Frontend Architecture `SHOULD HAVE` — COMPLETED

**PRD:** `docs/PRD-PHASE3-FRONTEND-ARCHITECTURE.md`

| # | Item | Status |
|---|------|--------|
| 3.1 | Add TanStack React Query | `COMPLETED` |
| 3.2 | Shared `<DataTable>` component | `COMPLETED` |
| 3.3 | Consolidate Job pages | `COMPLETED` |
| 3.4 | Break up bloated components | `COMPLETED` |
| 3.5 | Standardize form/modal patterns | `COMPLETED` |
| 3.6 | Custom hooks library | `COMPLETED` |

---

### Phase 4: Developer Experience `SHOULD HAVE` — COMPLETED

**Why:** 117 `console.*` calls remain in backend, 32 in frontend. No pre-commit hooks — developers can push code that fails CI. Zero import ordering enforcement. All 17 backend modules lack README documentation. No runtime verification that frontend/backend API contracts match.

**PRD:** `docs/PRD-PHASE4-DEVELOPER-EXPERIENCE.md`
**Implementation order:** R1 → R2 → R4 → R3 (R4 parallelizable with R1/R2)

| # | Item | Priority | Scope | Status |
|---|------|----------|-------|--------|
| 4.1 | **Strict ESLint config** | P0 | Backend + Frontend | `COMPLETED` |
|     | `no-console: error`, `eslint-plugin-import` for import ordering, `no-floating-promises`, `no-misused-promises`, explicit return types on backend services. Clean up 117 backend + 32 frontend console violations. | | | |
| 4.2 | **Pre-commit hooks** | P0 | Root config | `COMPLETED` |
|     | husky + lint-staged. Runs typecheck (`tsc --noEmit`) + lint on staged files. Blocks commits with type/lint errors. Auto-fixes import ordering. | | | |
| 4.3 | **API contract tests** | P1 | Test infrastructure | `COMPLETED` |
|     | Zod response schemas for 15+ critical endpoints. Contract tests make real API calls and validate response shapes. Catches field mismatches in CI before they reach staging. | | | |
| 4.4 | **Module documentation** | P1 | 17 backend modules | `COMPLETED` |
|     | Each module gets a `README.md`: responsibility, endpoint table (method/path/auth), data flow, key files, inter-module dependencies. Standard template. | | | |

**Dependency:** Phase 3 (COMPLETED). R3 (contract tests) needed stable frontend types from Phase 3.
**Exit Criteria:** `npm run lint` passes with zero errors on both sides. Pre-commit hooks block bad commits. All 17 modules have README.md. Contract tests cover ≥15 critical endpoints and run in CI.

---

## Later — Quality & Completeness

Strategic direction. Scope and timing flexible.

### Deferred Items `COULD HAVE`

| # | Item | Notes |
|---|------|-------|
| L.1 | **Component storybook** | Visual component catalog for frontend team |
| L.2 | **E2E test coverage** | Playwright tests for critical user flows (login → deploy → verify) |
| L.3 | **Performance optimization** | Code splitting, lazy routes, bundle analysis |
| L.4 | **Complete backend TODOs (11)** | Email sending, NVD sync, discovery scanning, license validation |
| L.5 | **HTTPS/TLS configuration** | Required before any production deployment |
| L.6 | **Data retention policies** | Audit log purging, deployment task cleanup |

---

### Won't Have (This Cycle) `WON'T HAVE`

| Item | Reason |
|------|--------|
| UI redesign | Current Ant Design UI is functional; cleanup is about code, not visuals |
| New features | No new features until foundation is solid |
| Go agent refactoring | Agent is well-structured; not a bottleneck |
| Database migration to different DB | PostgreSQL is the right choice |
| Microservices split | Monolith is appropriate at current scale |

---

## Dependency Map

```
Phase 1: Type Safety (DONE) ──► Phase 2: Backend Discipline (DONE) ──► Phase 3: Frontend Architecture (DONE)
                                                                                  │
                                                                        ┌─────────┴─────────┐
                                                                        ▼                   ▼
                                                                Phase 4.1: ESLint    Phase 4.4: Module Docs
                                                                        │              (parallel, independent)
                                                                        ▼
                                                                Phase 4.2: Pre-commit
                                                                        │
                                                                        ▼
                                                                Phase 4.3: Contract Tests
```

**Critical Path:** ~~Phase 1 → Phase 2 → Phase 3 → Phase 4~~ ALL COMPLETE
**Parallel Track:** R4 (module docs) ran alongside R1/R2

---

## Capacity Allocation

| Category | Allocation | Notes |
|----------|------------|-------|
| Developer experience (Phase 4) | 50% | Primary focus — ESLint, hooks, contract tests |
| New feature development | 40% | All three foundation phases complete; feature velocity increasing |
| Quality & completeness (Later) | 10% | Opportunistic picks from Later backlog |

---

## Review Cadence

- **Weekly:** Status update on current phase items
- **Phase completion:** Review exit criteria, decide if phase is truly done
- **Roadmap review:** After each phase, reassess Next and Later priorities

---

*This roadmap is a living document. Update status fields as work progresses.*
