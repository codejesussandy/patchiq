# PRD: Phase 1 — Type Safety & Shared Contracts

> **Owner:** Engineering Team
> **Status:** Approved — Ready for Implementation
> **Last Updated:** 2026-02-12
> **Roadmap Reference:** Phase 1 (Now / Must Have)

---

## 1. Problem Statement

PatchIQ's frontend, backend, and shared directories maintain independent type definitions that have drifted apart over time. This causes:

- **Blank deployment detail pages** — backend returns `endpointId`, frontend expects `agentId`. The `convertTask()` function fails silently.
- **Wrong status displays** — backend stores `PENDING`, frontend compares against `pending`. Equality check fails, tasks show incorrect state.
- **Hidden runtime bugs** — 83 instances of `as any` / `as unknown as` / `@ts-ignore` suppress TypeScript errors that would catch real bugs at compile time.
- **Developer confusion** — deprecated models (`PatchFileDetail`, `PatchEndpoint`, `SoftwareCatalog`) still in schema. 3 location fields and 4 date fields on single models. New developers don't know which to use.
- **Slow development** — every feature touching deployments requires debugging field name guesswork. Hours wasted per feature.

**Cost of not solving:** Every new feature built on the current type system inherits these problems. The debt compounds — the longer we wait, the more code depends on wrong assumptions.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Zero runtime type mismatch errors | No field-mapping bugs in production for 30 days after completion |
| G2 | Zero `as any` in backend | `grep -r "as any\|as unknown\|@ts-ignore" backend/src/ \| wc -l` returns 0 |
| G3 | Single source of truth for all types | All frontend types import from shared; no independent type definitions |
| G4 | Any developer can trace a type to the schema | Every API type has a clear path: Prisma model → shared type → frontend type |
| G5 | Consistent API response format | Every endpoint returns the same envelope shape |

---

## 3. Non-Goals

| Non-Goal | Reason |
|----------|--------|
| New feature development | This is purely cleanup; features come after |
| Frontend UI changes | Types change, but no visual changes to pages |
| Frontend component refactoring | That's Phase 3 |
| Go agent type changes | Agent communicates via JSON; contract is at the HTTP boundary |
| Test coverage improvements | That's Phase 4; we fix types first |
| Performance optimization | Not related to type safety |

---

## 4. User Stories

**As a backend developer**, I want every API response to follow the same shape so that I don't have to check how each endpoint formats its output.

**As a frontend developer**, I want to import types from one shared package so that I know the types match what the API actually returns.

**As a developer picking up a deployment task**, I want field names in the frontend to match field names in the API response so that I don't waste hours debugging why data isn't rendering.

**As a new team member**, I want the Prisma schema to only contain active models so that I don't accidentally use a deprecated table.

**As a developer writing a new service**, I want TypeScript to catch my type errors at compile time so that `as any` casts aren't needed to make the code compile.

---

## 5. Requirements

### Must Have (P0)

#### R1: Fix deployment pipeline field mismatches

**Description:** Align field names between backend API responses and frontend expectations for the deployment system.

**Specific mismatches to fix:**

| Backend Returns | Frontend Expects | Location |
|----------------|-----------------|----------|
| `endpointId` | `agentId` | Deployment task responses |
| `endpointName` | `agentName` | Deployment task responses |
| `endpointOs` | `agentOs` | Deployment task responses |
| `itemName` | `packageName` | Deployment task responses |
| `deploymentType` | `type` | Deployment creation request |
| `PENDING` / `IN_PROGRESS` / `SUCCESS` / `FAILED` | `pending` / `in_progress` / `completed` / `failed` | All status fields |

**Decision:** Backend is the source of truth. Frontend adapts to backend field names. Status enums use UPPERCASE (matching Prisma enums) — frontend maps at the service layer.

**Acceptance Criteria:**
- [ ] All deployment task API responses use consistent field names
- [ ] Frontend deployment detail pages render task list correctly
- [ ] Status badges show correct colors for all states
- [ ] `convertTask()` function removed or simplified (no field remapping needed)
- [ ] No silent failures when deployment tasks load

---

#### R2: Clean Prisma schema

**Description:** Remove deprecated models and normalize redundant fields.

**Models to remove:**
- `PatchFileDetail` (replaced by `PatchBundle`)
- `PatchEndpoint` (replaced by Agent/Asset relations)
- `SoftwareCatalog` (replaced by `SoftwarePackage` in Hub)

**Fields to normalize:**
- Asset location: consolidate `baseLocationId`, `installedLocationId`, `locationId` → single `locationId` with a `locationType` enum if needed
- Patch dates: consolidate `publishedAt`, `releaseDate`, `releasedOn`, `downloadedOn` → `publishedAt` (vendor publish date) + `downloadedAt` (when we acquired it)
- Deployment naming: standardize `stage` vs `status` → always `status`

**Acceptance Criteria:**
- [ ] Deprecated models removed from schema.prisma
- [ ] Migration created and tested (`make db-migrate`)
- [ ] All references to removed models updated in backend services
- [ ] All references to removed models updated in frontend types
- [ ] Seed data updated to match new schema
- [ ] Redundant fields consolidated with migration for existing data

---

#### R3: Standardize API response envelope

**Description:** Every API endpoint returns responses in a consistent format.

**Standard envelope:**
```typescript
// Success (single item)
{
  success: true,
  data: T
}

// Success (list with pagination)
{
  success: true,
  data: T[],
  meta: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}

// Error
{
  success: false,
  error: {
    code: string,       // e.g., "VALIDATION_ERROR", "NOT_FOUND"
    message: string,    // Human-readable
    details?: unknown   // Zod errors, field-specific info
  }
}
```

**Acceptance Criteria:**
- [ ] Response helper functions created: `sendSuccess(res, data)`, `sendPaginated(res, data, meta)`, `sendError(res, error)`
- [ ] All 100+ endpoints migrated to use response helpers
- [ ] Frontend `api.service.ts` interceptor updated to unwrap envelope
- [ ] Error handler middleware returns standard envelope
- [ ] No endpoint returns raw `res.json(data)` without envelope

---

#### R4: Single source of truth for types

**Description:** Establish `/shared/types/` as the canonical type definitions imported by both frontend and backend.

**Approach:**
1. Prisma schema defines database models
2. `/shared/types/` defines API-level types (request/response shapes) derived from Prisma
3. Backend imports from shared for controller type annotations
4. Frontend imports from shared for service return types
5. No independent type definitions in `frontend/src/types/` or `backend/src/shared/types/`

**Acceptance Criteria:**
- [ ] All API request/response types defined in `/shared/types/`
- [ ] Backend controllers use shared types for request/response annotations
- [ ] Frontend services use shared types for return types
- [ ] `frontend/src/types/` either removed or only contains UI-specific types (form state, component props)
- [ ] `backend/src/shared/types/` either removed or only contains internal types (not API-facing)
- [ ] Both `tsconfig.json` files configure path alias to shared types

---

#### R5: Standardize enums

**Description:** One set of enum definitions used across the entire stack.

**Approach:**
- Enums defined in `/shared/types/enums.ts`
- Match Prisma enum names and values (UPPERCASE)
- Frontend uses these directly — no mapping layer
- Display formatting (e.g., `IN_PROGRESS` → "In Progress") handled by UI utility functions, not by redefining enums

**Key enums to standardize:**
- `DeploymentStatus`: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `CANCELLED`
- `PatchSeverity`: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
- `AgentStatus`: `ONLINE`, `OFFLINE`, `PENDING`, `DISABLED`
- `ApprovalStatus`: `PENDING`, `APPROVED`, `REJECTED`
- All other enums currently defined independently in frontend and backend

**Acceptance Criteria:**
- [ ] Single enum file in `/shared/types/enums.ts`
- [ ] Backend imports enums from shared
- [ ] Frontend imports enums from shared
- [ ] No enum redefinitions in frontend or backend code
- [ ] UI display helper: `formatEnum('IN_PROGRESS')` → `"In Progress"`

---

#### R6: Eliminate all `as any` / `@ts-ignore` in backend

**Description:** Fix the underlying type issues that require 83 type assertion workarounds.

**Common patterns to fix:**
- `req.query as unknown as Type` → proper Zod-validated typed request
- `res.json as Function` → correct Express response typing
- `as any` on Prisma query results → proper `include`/`select` typing
- `@ts-ignore` on third-party library calls → proper type declarations or `.d.ts` augmentations

**Acceptance Criteria:**
- [ ] Zero instances of `as any` in `backend/src/`
- [ ] Zero instances of `as unknown as` in `backend/src/`
- [ ] Zero instances of `@ts-ignore` in `backend/src/`
- [ ] `npm run typecheck` passes with `strict: true` in tsconfig
- [ ] No new type assertions introduced (enforced by ESLint rule in Phase 4)

---

### Should Have (P1)

#### R7: Type generation script

**Description:** Automated script that generates frontend-consumable types from the Prisma schema.

```bash
npm run generate:types
# Reads schema.prisma
# Generates /shared/types/models.ts (Prisma model types)
# Generates /shared/types/enums.ts (Prisma enums)
# Optionally generates API types from controller annotations
```

**Acceptance Criteria:**
- [ ] Script exists and runs without errors
- [ ] Generated types match current Prisma schema
- [ ] Script is idempotent (running twice produces same output)
- [ ] Documented in project README

---

#### R8: CI check for type safety

**Description:** CI pipeline fails if type assertions are introduced.

**Acceptance Criteria:**
- [ ] ESLint rule `@typescript-eslint/no-explicit-any` set to `error`
- [ ] CI runs `npm run typecheck` for both frontend and backend
- [ ] CI runs `npm run lint` with no-any rule
- [ ] PR cannot merge if checks fail

---

## 6. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Runtime type mismatch errors | 0 | Manual testing of all deployment flows |
| `as any` count in backend | 0 | `grep -r "as any" backend/src/ \| wc -l` |
| Independent type definitions | 0 | Frontend types import from shared only |
| Deployment detail page rendering | 100% success | Navigate to every deployment detail page |
| API response format consistency | 100% of endpoints | Audit all controller return statements |
| Type generation freshness | Always in sync | CI check that generated types match schema |

---

## 7. Open Questions — RESOLVED

| # | Question | Decision | Date |
|---|----------|----------|------|
| Q1 | Type generation approach? | **Prisma native types + hand-maintained API types in shared.** Simpler than a generator, stays in sync automatically. | 2026-02-12 |
| Q2 | Rename DB columns or alias at API layer? | **API layer only.** Prisma `@map` handles DB translation. No risky column renames. | 2026-02-12 |
| Q3 | Enum casing convention? | **UPPERCASE everywhere.** Matches Prisma and DB enums. Frontend adds display formatting as UI concern. | 2026-02-12 |
| Q4 | External API consumers? | **Yes — future MCP server for AI assistant.** Response envelope and consistent contracts are critical. Go agent is also a consumer. | 2026-02-12 |
| Q5 | Data in deprecated models? | **TBD** — investigate during R2 implementation. Not blocking. | — |

---

## 8. Implementation Order

Within Phase 1, the recommended sequence:

```
R2 (Clean schema) → R5 (Standardize enums) → R4 (Shared types) → R1 (Fix mismatches) → R3 (Response envelope) → R6 (Kill as any) → R7 (Generation script) → R8 (CI checks)
```

**Rationale:**
1. **Schema first** — the schema is the foundation everything else builds on
2. **Enums next** — they're referenced everywhere and need to be consistent before types
3. **Shared types** — depends on clean schema and enums
4. **Fix mismatches** — now that types are shared, fixing mismatches is straightforward
5. **Response envelope** — standardize how data flows through the API
6. **Kill `as any`** — with proper types in place, these can be resolved
7. **Generation script** — automates keeping types in sync going forward
8. **CI checks** — prevents regression

---

*This PRD should be reviewed and approved before implementation begins. Open questions marked as blocking must be resolved first.*
