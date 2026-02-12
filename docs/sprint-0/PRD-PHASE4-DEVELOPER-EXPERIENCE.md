# PRD: Phase 4 — Developer Experience

> **Owner:** Engineering Team
> **Status:** Draft — Pending Approval
> **Last Updated:** 2026-02-12
> **Roadmap Reference:** Phase 4 (Next / Should Have)
> **Dependency:** Phase 2 (Backend Discipline) — COMPLETED, Phase 3 (Frontend Architecture) — COMPLETED

---

## 1. Problem Statement

PatchIQ has completed three phases of codebase overhaul — type safety, backend discipline, and frontend architecture. The code is now well-structured, but nothing prevents regressions. A developer can push code with `console.log`, skip validation, or ignore established patterns because there are no automated guardrails. This causes:

- **No pre-commit enforcement** — No husky or lint-staged configuration exists. Developers can commit code with lint errors, type errors, or formatting inconsistencies. The only safety net is CI, which runs after the commit lands on a branch.
- **Incomplete lint rules** — Backend warns on `console.log` but doesn't block it. Frontend has zero `no-console` rule. Neither side enforces import ordering. The `no-explicit-any` rule is enforced, but other quality rules (explicit return types on services, unused imports) are missing.
- **Zero module documentation** — All 17 backend modules lack README files. A new developer has to read 1,000+ lines of service code to understand what a module does, its endpoints, and its data flow. Onboarding is slow.
- **No API contract tests** — Frontend services assume backend response shapes based on TypeScript types, but nothing verifies these assumptions at runtime. A backend field rename silently breaks the frontend until a human notices.

**Cost of not solving:** Every phase of discipline we've built (structured logging, Zod validation, React Query, shared components) can erode silently. Without automated enforcement, the codebase trends back toward the state we spent three phases fixing. Without documentation, new developers repeat mistakes and misunderstand module boundaries. Without contract tests, type mismatches between frontend and backend — the exact problem Phase 1 solved — will recur.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Automated quality gates block bad code before it reaches CI | Pre-commit hooks reject commits with type errors or lint violations |
| G2 | Zero `console.log` in production code (backend + frontend) | `grep -rn "console\." backend/src/ frontend/src/ \| grep -v node_modules \| grep -v test \| grep -v seed \| grep -v scripts \| wc -l` returns 0 |
| G3 | Consistent import ordering across entire codebase | ESLint auto-fixes import ordering; no manual organization needed |
| G4 | Every backend module self-documented | All 17 modules have a README.md with endpoints, data flow, and dependencies |
| G5 | Frontend-backend field mismatches caught automatically | Contract tests verify critical API response shapes in CI |

---

## 3. Non-Goals

| Non-Goal | Reason |
|----------|--------|
| Unit test coverage targets | Test infrastructure exists (Jest at 80% threshold); writing more unit tests is ongoing work, not a phase deliverable |
| E2E test expansion | Listed as Later (L.2) in the roadmap — Playwright infrastructure exists but expanding coverage is separate |
| Performance optimization | Listed as Later (L.3) — code splitting, lazy routes, bundle analysis are separate concerns |
| New features | Developer experience before features — this phase is about guardrails |
| Storybook / component catalog | Listed as Later (L.1) — useful but lower priority than enforcement |
| Backend code formatting (Prettier) | Backend already has Prettier configured; frontend formatting is handled by ESLint |

---

## 4. User Stories

**As a developer committing code**, I want pre-commit hooks to catch lint errors and type issues before my commit lands so that I don't push broken code that fails in CI 5 minutes later.

**As a developer adding a `console.log` for debugging**, I want ESLint to error on `console.log` in production code so that I'm reminded to remove it before committing — and forced to use the structured logger instead.

**As a developer opening a file from a module I haven't worked on**, I want to read a README that explains the module's responsibility, endpoints, and data flow so that I can understand it in 5 minutes without reading 1,000+ lines of service code.

**As a developer reviewing a PR**, I want all imports to follow a consistent ordering (node builtins → third-party → internal → relative) so that I can quickly scan dependencies without being distracted by random import orderings.

**As a developer modifying a backend response shape**, I want contract tests to fail in CI if my change breaks the frontend's expectations so that I catch the mismatch before it reaches staging.

**As a new developer joining the project**, I want to run `make check` and get fast feedback on whether my code meets all project standards so that I can self-correct without waiting for code review.

---

## 5. Requirements

### Must Have (P0)

#### R1: Strict ESLint configuration (Backend + Frontend)

**Description:** Upgrade ESLint rules on both backend and frontend to enforce the patterns established in Phases 1-3. Current state is permissive — rules warn but don't block, and several important rules are missing entirely.

**Current state:**

| Rule | Backend | Frontend |
|------|---------|----------|
| `no-explicit-any` | `error` | `error` |
| `no-console` | `warn` (allows warn/error) | Not configured |
| `no-unused-vars` | `error` (ignores `_` prefix) | Not configured (TS handles) |
| Import ordering | Not configured | Not configured |
| Explicit return types | Not configured | Not applicable |
| Unused imports | Not configured | `noUnusedLocals` in tsconfig |

**Backend changes (`backend/.eslintrc.js`):**

1. **`no-console`: `'error'`** — Block all `console.*` in production code. Pino logger (Phase 2) is the only logging mechanism. Allow in test files and seed scripts via overrides.
2. **`eslint-plugin-import` with ordering** — Enforce import groups: (1) node builtins, (2) external packages, (3) internal aliases (`@modules`, `@shared`, `@config`), (4) relative imports. Alphabetical within groups.
3. **`@typescript-eslint/explicit-function-return-type`** — Require explicit return types on exported service functions. Controllers can use inference since Express types are well-defined.
4. **`@typescript-eslint/no-floating-promises`: `'error'`** — Prevent unhandled promise rejections from forgotten `await`.
5. **`@typescript-eslint/no-misused-promises`: `'error'`** — Catch passing async functions where sync callbacks are expected.

**Frontend changes (`frontend/eslint.config.js`):**

1. **`no-console`: `'error'`** — Block all `console.*` in production code. Allow `console.warn`/`console.error` only in development utilities if needed.
2. **`eslint-plugin-import` with ordering** — Same ordering convention as backend: (1) react/react-dom, (2) external packages, (3) internal aliases (`@/`), (4) relative imports.
3. **`@typescript-eslint/no-unused-vars`** — Explicit rule (not just tsconfig) with `_` prefix ignore pattern.

**Cleanup required before enabling strict rules:**

| Rule | Backend Violations | Frontend Violations | Action |
|------|-------------------|--------------------|---------|
| `no-console` (error) | ~117 instances | ~32 instances | Replace with pino logger (backend) or remove (frontend) |
| Import ordering | ~428 files | ~251 files | Auto-fix with `eslint --fix` |
| Explicit return types | Estimated ~200 service functions | N/A | Add return types incrementally |
| `no-floating-promises` | Unknown — audit needed | N/A | Fix any violations found |

**Approach:**
1. Install `eslint-plugin-import` (backend + frontend)
2. Clean up all `console.*` violations — replace with pino (backend) or remove (frontend)
3. Run `eslint --fix` for auto-fixable rules (import ordering, unused imports)
4. Manually fix remaining violations (explicit return types, floating promises)
5. Enable all rules as `error` — no warnings, only errors

**Acceptance Criteria:**
- [ ] `eslint-plugin-import` installed and configured in both backend and frontend
- [ ] Import ordering enforced: node builtins → external → internal aliases → relative
- [ ] `no-console` set to `error` in both backend and frontend ESLint configs
- [ ] Zero `console.*` calls in `backend/src/` (excluding `db/prisma/seeds/` and `db/prisma/scripts/`)
- [ ] Zero `console.*` calls in `frontend/src/`
- [ ] `@typescript-eslint/explicit-function-return-type` enabled for backend service files
- [ ] `@typescript-eslint/no-floating-promises` enabled for backend
- [ ] `@typescript-eslint/no-misused-promises` enabled for backend
- [ ] `npm run lint` passes with zero errors on both backend and frontend
- [ ] Auto-fix covers import ordering — `npm run lint:fix` sorts imports automatically
- [ ] ESLint overrides configured: test files and seed scripts can use `console.*`

---

#### R2: Pre-commit hooks with husky + lint-staged

**Description:** Install and configure pre-commit hooks that run type checking and linting on staged files. Block commits that violate project standards. This is the enforcement mechanism for R1.

**Current state:** No pre-commit hooks. No `.husky/` directory. No `lint-staged` configuration. Developers rely on CI (which runs after push) and manual discipline.

**Approach:**
1. Install `husky` and `lint-staged` at the root monorepo level
2. Configure `lint-staged` to run appropriate checks per file type
3. Configure a `pre-commit` hook that triggers `lint-staged`

**Configuration:**

```jsonc
// Root package.json (lint-staged config)
{
  "lint-staged": {
    "backend/src/**/*.ts": [
      "eslint --fix --max-warnings=0",
      "bash -c 'cd backend && npx tsc --noEmit'"
    ],
    "frontend/src/**/*.{ts,tsx}": [
      "eslint --fix --max-warnings=0",
      "bash -c 'cd frontend && npx tsc --noEmit'"
    ],
    "shared/types/**/*.ts": [
      "bash -c 'cd backend && npx tsc --noEmit'",
      "bash -c 'cd frontend && npx tsc --noEmit'"
    ]
  }
}
```

**Hook behavior:**
- **Staged `.ts` files in backend/** → ESLint fix + backend typecheck
- **Staged `.ts/.tsx` files in frontend/** → ESLint fix + frontend typecheck
- **Staged files in shared/types/** → Both backend and frontend typecheck (since both consume shared types)
- **Any lint error or type error** → Commit blocked with clear error message
- **Auto-fixable issues** (import ordering, formatting) → Fixed automatically and staged

**Performance considerations:**
- Typecheck on every commit may be slow (~5-10s for full `tsc --noEmit`). If this becomes a bottleneck, switch to incremental typecheck using `tsc --noEmit --incremental` with `tsconfig.tsbuildinfo`.
- `lint-staged` only processes staged files for linting, but typecheck must run on the full project (a single file change can break types elsewhere).

**Acceptance Criteria:**
- [ ] `husky` installed and `.husky/pre-commit` hook created
- [ ] `lint-staged` configured in root `package.json`
- [ ] Commits with lint errors are blocked with a clear error message
- [ ] Commits with type errors are blocked with a clear error message
- [ ] Auto-fixable issues (import ordering) are fixed and re-staged automatically
- [ ] `--no-verify` bypass available for emergency commits (documented as escape hatch, not standard practice)
- [ ] Hook runs in <15 seconds for typical commits (1-5 files)
- [ ] `make setup` or `npm install` at root automatically installs husky hooks (via `prepare` script)
- [ ] CI pipeline (`type-safety.yml`) updated to match the same lint rules — CI and pre-commit are in sync

---

### Should Have (P1)

#### R3: API contract tests

**Description:** Automated tests that verify frontend service calls match actual backend response shapes. These tests run in CI and catch field mismatches before they reach staging.

**Current state:** Frontend services define expected response types in `frontend/src/types/`. Backend defines actual response shapes via Prisma models + transformers. The shared types in `/shared/types/` provide compile-time alignment, but nothing verifies runtime behavior. If a backend transformer omits a field or returns a different format, the frontend receives unexpected data silently.

**Dependency:** Requires stable frontend types (Phase 3 COMPLETED) and stable backend API contracts (Phase 2 COMPLETED).

**Approach:**
1. Create a contract test suite in `backend/tests/contract/`
2. For each critical endpoint, make a real API call to the running backend and validate the response shape against the shared type definitions
3. Use Zod schemas (already defined for request validation) to also validate response shapes
4. Run as part of `npm run test:e2e` or as a separate `npm run test:contract` script

**Contract test pattern:**

```typescript
// backend/tests/contract/patches.contract.test.ts
import { patchResponseSchema } from '@shared/validators/responses';

describe('Patches API Contract', () => {
  it('GET /api/patches returns PaginatedResponse<PatchResponse>', async () => {
    const response = await request(app).get('/api/patches').expect(200);

    // Validate response matches the shared type contract
    const result = paginatedResponseSchema(patchResponseSchema).safeParse(response.body);
    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('Contract violation:', result.error.issues);
    }
  });

  it('GET /api/patches/:id returns ApiResponse<PatchResponse>', async () => {
    const response = await request(app).get(`/api/patches/${testPatchId}`).expect(200);

    const result = apiResponseSchema(patchResponseSchema).safeParse(response.body);
    expect(result.success).toBe(true);
  });
});
```

**Critical endpoints to cover (prioritized by frontend usage):**

| Module | Endpoints | Priority | Notes |
|--------|-----------|----------|-------|
| patches | GET /api/patches, GET /api/patches/:id | P0 | Most-used list + detail views |
| assets | GET /api/assets, GET /api/assets/:id | P0 | Complex response with nested relations |
| agents | GET /api/agents, GET /api/agents/:id | P0 | Dashboard depends on agent status |
| jobs | GET /api/jobs, POST /api/jobs | P0 | Complex create flow |
| vulnerabilities | GET /api/vulnerabilities | P0 | Critical security data |
| dashboard | GET /api/dashboard/* | P1 | Multiple stat endpoints |
| settings | GET /api/settings/* | P1 | Various config endpoints |
| hub | GET /api/hub/packages | P1 | Package listing |
| auth | POST /api/auth/login, GET /api/auth/me | P0 | Authentication flow |
| reports | GET /api/reports | P1 | Report listing |

**Response validation schemas:**
Create Zod schemas for response shapes in `shared/types/` (or `backend/tests/contract/schemas/`). These reuse the existing model types but validate at runtime:

```typescript
// shared/validators/responses.ts
export const patchResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE']),
  status: z.enum(['AVAILABLE', 'TESTING', 'APPROVED', 'DEPLOYED', 'REJECTED']),
  // ... all fields the frontend depends on
});

export function apiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: z.object({}).passthrough().optional(),
    error: z.string().optional(),
  });
}

export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return apiResponseSchema(z.array(itemSchema)).extend({
    meta: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
  });
}
```

**Acceptance Criteria:**
- [ ] Contract test directory created at `backend/tests/contract/`
- [ ] Response Zod schemas created for all P0 endpoints (patches, assets, agents, jobs, vulnerabilities, auth)
- [ ] Each contract test makes a real API call and validates response shape against Zod schema
- [ ] Contract tests run in CI via `npm run test:contract` (or as part of e2e suite)
- [ ] A backend field rename or removal fails the contract test with a clear error message showing the mismatch
- [ ] At least 15 critical endpoints covered (all P0 modules)
- [ ] Contract test failures block PR merge in CI
- [ ] Response schemas are co-located with or derived from shared types (single source of truth maintained)

---

#### R4: Module documentation

**Description:** Each of the 17 backend modules gets a brief README.md documenting its responsibility, endpoints, data flow, and dependencies. A new developer can understand any module in 5 minutes.

**Current state:** Zero README files across all 17 modules. The only documentation is `backend/src/CONVENTIONS.md` (service architecture guidelines from Phase 2). A new developer must read service code to understand module boundaries.

**README template:**

```markdown
# Module: {module-name}

## Responsibility
{1-2 sentences: what this module owns}

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/{resource} | List with pagination | Required |
| GET | /api/{resource}/:id | Get by ID | Required |
| POST | /api/{resource} | Create | Admin |
| PUT | /api/{resource}/:id | Update | Admin |
| DELETE | /api/{resource}/:id | Delete | Admin |

## Data Flow
{Brief description of how data moves through this module}

```
Request → Controller → Validator → Service → Prisma → Response
```

## Key Files
- `{module}.controller.ts` — Route handlers
- `{module}.service.ts` — Business logic
- `{module}.validators.ts` — Zod schemas

## Dependencies
- **Depends on:** {other modules this one imports from}
- **Depended on by:** {modules that import from this one}

## Notes
{Any non-obvious behavior, edge cases, or gotchas}
```

**Modules to document (all 17):**

| Module | Complexity | Key Notes |
|--------|-----------|-----------|
| auth | Medium | JWT + session management, LDAP integration |
| agents | High | Registration, heartbeat, inventory processing, command dispatch |
| assets | High | Categories, subcategories, tags, software inventory, telemetry |
| patches | High | Patch lifecycle, supersedence, recommendations, correlation |
| vulnerabilities | Medium | CVE sync, risk scoring, exception management |
| jobs | High | Catalog/bundle/deployed pattern, cross-module (patch/software/config/vuln) |
| deployments | High | Hub-centric execution, agent task dispatch, retry logic |
| discovery | Medium | IP range scanning, credential management, agent discovery |
| dashboard | Low | Aggregation queries, statistics endpoints |
| reports | Medium | Report generation, scheduling, export |
| settings | High | Users, roles, orgs, policies, preferences — many sub-entities |
| hub | Medium | MinIO package storage, bundle management |
| patch-templates | Medium | Vendor-specific patch templates, catalog sync |
| patch-repository | Medium | Patch download management, whitelist sources |
| notifications | Low | SSE notifications, preference management |
| alerts | Low | Alert rule evaluation, threshold-based triggers |
| software-catalog | Low | Software catalog population from vendor sources |

**Acceptance Criteria:**
- [ ] All 17 modules have a `README.md` file
- [ ] Each README follows the standard template
- [ ] Endpoints section lists all routes with method, path, description, and auth requirement
- [ ] Dependencies section accurately maps inter-module relationships
- [ ] Data flow section describes the request lifecycle for the module's primary operation
- [ ] README is accurate — reviewed against actual code, not generated blindly
- [ ] `backend/src/CONVENTIONS.md` updated to reference module READMEs

---

### Future Considerations (P2)

#### F1: Shared Prettier configuration

Both backend and frontend should share a root `.prettierrc` and a `prettier --check` step in pre-commit hooks. Backend already has Prettier configured; frontend relies on ESLint for formatting. Unifying this ensures consistent formatting across the monorepo.

#### F2: Commit message linting (commitlint)

Enforce conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`) via a `commit-msg` hook. Enables automatic changelog generation and semantic versioning in the future. Requires team agreement on commit convention first.

#### F3: Dependency audit in CI

Add `npm audit` or `snyk` to the CI pipeline to catch known vulnerabilities in dependencies. Currently no automated dependency security scanning exists.

#### F4: Code coverage enforcement in CI

The backend Jest config has 80% coverage thresholds defined but they're not enforced in CI. Add `npm run test:coverage` to the CI pipeline with the existing thresholds.

---

## 6. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| `console.*` in production code | 0 | `grep -rn "console\." backend/src/ frontend/src/ \| grep -v node_modules \| grep -v test \| grep -v seed \| grep -v scripts \| wc -l` |
| ESLint errors on `npm run lint` | 0 on both backend and frontend | `cd backend && npm run lint && cd ../frontend && npm run lint` |
| Commits blocked by pre-commit | >0 in first week (proves hooks work) | Git hook logs |
| Import ordering violations | 0 (auto-fixed) | `npm run lint` passes without import ordering issues |
| Module READMEs | 17/17 modules documented | `ls backend/src/modules/*/README.md \| wc -l` |
| Contract test coverage | ≥15 critical endpoints | Count test cases in `backend/tests/contract/` |
| Contract test pass rate | 100% in CI | CI pipeline results |
| New developer onboarding time | <1 day to first meaningful PR | Qualitative (new dev feedback) |

---

## 7. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| Q1 | Should typecheck run on every commit or only on push? Full `tsc --noEmit` takes 5-10s and may slow commits. | Engineering | Yes — affects R2 hook configuration. Recommendation: run on commit with `--incremental` flag. |
| Q2 | Should contract tests use a real database (like e2e tests) or mock Prisma? | Engineering | No — start with real database (reuse e2e test setup); mocking defeats the purpose of contract validation. |
| Q3 | Should module READMEs include example API requests/responses or just endpoint listings? | Engineering | No — start with endpoint listings; add examples if team finds them useful. |
| Q4 | Should `eslint-plugin-import` be replaced with the newer `eslint-plugin-import-x` for ESM/flat config compatibility? | Engineering | No — evaluate during implementation; either works. Frontend uses flat config so `import-x` may be better. |
| Q5 | Should we add `eslint-plugin-react` rules (e.g., `react/no-unstable-nested-components`) to the frontend config? | Engineering | No — can be added incrementally; not part of core DX goals. |

---

## 8. Implementation Order

```
R1 (Strict ESLint) → R2 (Pre-commit hooks) → R4 (Module docs) → R3 (Contract tests)
```

**Rationale:**
1. **Strict ESLint first** — All console.log cleanup, import ordering, and rule enforcement happens here. This is the foundation that pre-commit hooks enforce. Without clean lint, hooks would block every commit.
2. **Pre-commit hooks second** — Once lint rules pass cleanly, install hooks to maintain the standard. This is a thin configuration layer that depends on R1 being complete.
3. **Module documentation third** — Independent of R1/R2, but placed here because it's lower effort and high impact for onboarding. Can be parallelized with R2 if desired.
4. **Contract tests last** — Most complex requirement. Needs response Zod schemas authored, test infrastructure set up, and CI pipeline updated. Benefits from all other requirements being stable.

**Parallelization opportunity:** R4 (module docs) is fully independent. It can be done in parallel with R1 or R2 by a different developer.

---

## 9. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Pre-commit hooks slow down developer workflow | Medium | Medium | Use `--incremental` typecheck. Profile hook execution time. If >15s, switch typecheck to push-only hook. |
| Strict ESLint breaks existing code that was silently wrong | Low | Medium | Fix all violations before enabling rules as errors. Never enable a rule with existing violations. |
| Console.log cleanup misses legitimate logging needs | Medium | Low | Backend has pino logger infrastructure. Frontend should use a minimal `logger.ts` wrapper if needed (not `console`). |
| Contract tests become maintenance burden | Medium | Medium | Generate response schemas from shared types where possible. Keep test count focused on high-traffic endpoints only. |
| Module documentation becomes stale | Medium | High | Add "last reviewed" date to each README. Include README review as part of module-touching PRs. Consider a CI check that warns if a module's README is >90 days old. |
| Import ordering auto-fix causes merge conflicts | Low | Medium | Run `eslint --fix` in one batch commit. All developers pull before continuing work. |

---

*This PRD should be reviewed and approved before implementation begins.*
