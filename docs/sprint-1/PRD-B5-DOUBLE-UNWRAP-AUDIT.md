# PRD: B.5 — Audit and Fix Double-Unwrapping in Services

> **Sprint 1 Track B** | **Priority:** Must Have (Week 1-2) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** Consistent data patterns required for AI/MCP integration
> **Dependencies:** None (can start Day 1)

---

## 1. Problem Statement

The backend returns responses in a standard envelope: `{ success: boolean, data: T, meta?: object, error?: string }`. The `api.service.ts` Axios interceptor (lines 15-25) correctly unwraps this envelope, returning `response.data.data` to service callers.

However, some frontend service files defensively double-unwrap by accessing `response.data.data || []` or `response.data.data?.items || []`, treating the already-unwrapped response as if it still has the envelope. This suggests:
1. The interceptor was added after some services were written
2. Some services were copy-pasted without understanding the interceptor
3. Inconsistent patterns make the codebase harder to maintain

**What's broken:**
- Defensive double-unwrapping usually works by accident (returns `undefined` then falls back to `[]`)
- Creates cognitive overhead: developers don't know if data is wrapped or unwrapped
- Makes future refactoring error-prone
- Violates the Single Responsibility Principle: interceptor handles unwrapping, services should trust it

**Who is affected:** Developers maintaining or extending service layer code.

**Cost of not solving:** Confusing code patterns lead to bugs when new services are added. Sprint 2 AI/MCP integration requires clean, predictable service layer patterns.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | All service methods use consistent unwrapping pattern | 100% of service files access `response.data` (not `response.data.data`) |
| G2 | No functional regressions | All pages load and function identically after audit |
| G3 | Documentation of correct pattern | Add comment in api.service.ts explaining interceptor behavior |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Remove the interceptor unwrapping | The interceptor pattern is correct and used throughout Phase 3 refactor |
| N2 | Change backend response format | Backend envelope is standard and working correctly |
| N3 | Add TypeScript types to enforce pattern | Type system can't prevent `response.data.data` access — manual audit required |
| N4 | Refactor all service files | Only fix incorrect unwrapping patterns, don't rewrite entire files |

---

## 4. User Stories

- As a **frontend developer**, I want consistent data access patterns so that I can write service methods without confusion.
- As a **code reviewer**, I want a single source of truth for response unwrapping so that I can catch bugs in PRs.
- As a **new team member**, I want clear documentation of the interceptor behavior so that I don't introduce double-unwrapping bugs.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Audit all 18 service files

**Files to audit:**
```
frontend/src/services/
├── agent.service.ts
├── alert.service.ts
├── api.service.ts (interceptor definition — document, don't change)
├── asset.service.ts
├── auth.service.ts
├── category.service.ts
├── cve.service.ts
├── dashboard.service.ts
├── deployment.service.ts
├── discovery.service.ts
├── job.service.ts
├── notification.service.ts
├── patch-template.service.ts
├── patch.service.ts
├── report.service.ts
├── settings.service.ts
├── software.service.ts
├── tag.service.ts
└── user.service.ts
```

**Acceptance Criteria:**
- [x] Grep each file for `response.data.data` patterns
- [x] Categorize findings:
  - **Paginated responses**: Backend returns `{ data: { items: [], total: 0 } }` — after interceptor unwrapping, service sees `{ items: [], total: 0 }`. Accessing `response.data.items` is correct (NOT double-unwrap).
  - **Single entity responses**: Backend returns `{ data: User }` — after unwrapping, service sees `User`. Accessing `response.data` is correct.
  - **Double-unwrap bugs**: Service accesses `response.data.data` when it should access `response.data`

#### R2: Fix double-unwrapping bugs

**Pattern to fix:**
```typescript
// ❌ WRONG: Double-unwraps
async getAssets(): Promise<Asset[]> {
  const response = await api.get('/assets');
  return response.data.data || []; // Accesses .data.data
}

// ✅ CORRECT: Trusts interceptor
async getAssets(): Promise<Asset[]> {
  const response = await api.get('/assets');
  return response.data; // Interceptor already unwrapped
}
```

**Paginated pattern (correct — not double-unwrap):**
```typescript
// ✅ CORRECT: Paginated responses have nested structure
async getAssets(params: PaginationParams): Promise<PaginatedResponse<Asset>> {
  const response = await api.get('/assets', { params });
  return response.data; // Returns { items: Asset[], total: number }
}

// ✅ ALSO CORRECT: Extracting items directly
async getAssets(params: PaginationParams): Promise<Asset[]> {
  const response = await api.get('/assets', { params });
  return response.data.items; // Paginated data has .items property
}
```

**Acceptance Criteria:**
- [x] For each identified double-unwrap: change `response.data.data` to `response.data`
- [x] For paginated endpoints: verify `response.data.items` is correct (backend returns `{ items, total }`)
- [x] For single-entity endpoints: verify `response.data` returns the entity directly

#### R3: Document interceptor behavior

Add a comment in `api.service.ts` above the response interceptor:

```typescript
/**
 * Response interceptor: Unwraps the standard { success, data } envelope.
 *
 * Backend responses follow this format:
 *   { success: true, data: T, meta?: object }
 *
 * This interceptor extracts `response.data.data` and returns it, so service
 * methods receive `T` directly (not the full envelope).
 *
 * Service methods should access `response.data` (NOT `response.data.data`).
 *
 * Example:
 *   Backend: { success: true, data: { id: 1, name: "Asset" } }
 *   Interceptor returns: { id: 1, name: "Asset" }
 *   Service method: `const asset = response.data;`
 */
api.interceptors.response.use(
  (response) => {
    if (response.data && 'data' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  // ... error handler
);
```

**Acceptance Criteria:**
- [x] Add multi-line comment documenting unwrapping behavior
- [x] Include example showing correct service pattern
- [x] Explain paginated vs single-entity responses

#### R4: Create audit report

Generate a markdown file documenting findings:

**`docs/sprint-1/SERVICE-UNWRAP-AUDIT.md`**

Structure:
```markdown
# Service Unwrapping Audit (B.5)

## Summary
- Total service files audited: 18
- Files with double-unwrap bugs: X
- Files with correct patterns: Y
- Paginated endpoints verified: Z

## Findings

### Files with Double-Unwrap Bugs (Fixed)
- `service-name.service.ts:123` — Changed `response.data.data` to `response.data`

### Files with Correct Patterns (No changes)
- `service-name.service.ts` — All methods access `response.data` correctly

### Paginated Endpoints (Verified Correct)
- `asset.service.ts:45` — `response.data.items` is correct (paginated response)

## Correct Patterns Reference
[Include examples from R2]
```

**Acceptance Criteria:**
- [x] Audit report lists all 18 files
- [x] Categorizes findings into bugs vs correct patterns
- [x] Includes line numbers for all changes made

---

### Nice-to-Have (P1)

#### R5: Add ESLint rule to prevent double-unwrapping

**Acceptance Criteria:**
- [ ] Research if eslint-plugin-no-double-unwrap exists
- [ ] If not, document pattern in team style guide (defer custom rule to Sprint 2)

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Consistency | 100% of services use correct pattern | No `response.data.data` in non-paginated contexts |
| Regressions | 0 | All pages load and function after changes |
| Documentation | 1 clear comment in api.service.ts | Explains interceptor to future developers |
| Audit coverage | 18/18 files reviewed | Every service file checked |

---

## 7. Test Plan

### Automated Tests

**TypeScript compilation:**
```bash
cd frontend && npm run check-types
```
Expected: 0 errors (changes are runtime behavior, types don't change)

**Linting:**
```bash
cd frontend && npm run lint
```
Expected: No new warnings

### Manual Smoke Tests

```
Test: Pages load after unwrapping fixes
  Given: All double-unwrap bugs have been fixed
  When: User navigates to each major page (dashboard, assets, patches, deployments, settings)
  Then: All pages render without errors
  And: Data loads correctly in tables
  And: No console errors about undefined data

Test: Paginated tables work correctly
  Given: Asset, Patch, Deployment list pages use paginated responses
  When: User loads any list page
  Then: Table displays correct number of items
  And: Pagination controls show correct total
  And: Page navigation works

Test: Detail pages load single entities
  Given: Asset Detail, Patch Detail pages load single entities
  When: User navigates to a detail page
  Then: Entity data displays correctly
  And: No undefined properties

Test: Create/Update operations return correct data
  Given: Create Asset, Update Patch forms submit data
  When: User submits a form
  Then: Success message appears
  And: Returned entity data is correct (not undefined)
```

### Regression Testing Checklist

After changes, manually test these critical flows:
- [ ] Dashboard loads with metrics
- [ ] Assets list shows all assets with pagination
- [ ] Asset detail page shows full asset info
- [ ] Create new asset → success → asset appears in list
- [ ] Patches list shows all patches with pagination
- [ ] Deployments list shows all deployments
- [ ] Settings pages load and save correctly

---

## 8. Implementation Notes

### Audit Process

**Step 1: Automated search**
```bash
cd frontend/src/services
grep -n "response\.data\.data" *.ts | tee /tmp/double-unwrap-findings.txt
```

**Step 2: Manual review**
For each finding, determine:
1. Is this a paginated response where `.data.items` is correct?
2. Is this a genuine double-unwrap bug?
3. What does the backend endpoint actually return?

**Step 3: Fix pattern**
```typescript
// Before (bug)
return response.data.data || [];

// After (fixed)
return response.data;
```

**Step 4: Verify backend contract**
Check the backend route:
```typescript
// Backend: modules/assets/assets.controller.ts
async getAssets(req, res) {
  const assets = await assetsService.getAll();
  return res.json({ success: true, data: assets }); // Wrapped
}
```

After interceptor: `response.data = assets` (unwrapped)

### Example Fixes

**Example 1: Simple entity (bug)**
```typescript
// BEFORE: asset.service.ts:67
async getAssetById(id: string): Promise<Asset> {
  const response = await api.get(`/assets/${id}`);
  return response.data.data; // ❌ Bug
}

// AFTER:
async getAssetById(id: string): Promise<Asset> {
  const response = await api.get(`/assets/${id}`);
  return response.data; // ✅ Fixed
}
```

**Example 2: Paginated response (correct, no change)**
```typescript
// asset.service.ts:45
async getAssets(params: PaginationParams): Promise<PaginatedResponse<Asset>> {
  const response = await api.get('/assets', { params });
  return response.data; // ✅ Correct (returns { items: [], total: 0 })
}
```

**Example 3: Extracting items from paginated response (correct, no change)**
```typescript
// asset.service.ts:52
async getAllAssets(): Promise<Asset[]> {
  const response = await api.get('/assets');
  return response.data.items || []; // ✅ Correct (paginated has .items)
}
```

### Expected Findings

Based on the codebase audit summary, likely findings:
- 3-5 service files with genuine double-unwrap bugs
- 10-12 service files with correct patterns (no changes)
- 3-5 paginated endpoints with `response.data.items` (correct, verify and document)

### Estimated Effort

4-6 hours
- 1 hour: Automated grep + initial categorization
- 2 hours: Manual review of each finding, verify backend contracts
- 1 hour: Apply fixes
- 1 hour: Manual smoke testing across all pages
- 1 hour: Write audit report

---

## 9. Open Questions

**Q1:** What if a service intentionally double-unwraps for backwards compatibility?
- **Answer:** Unlikely. The interceptor was added in Phase 3, and all services should have been updated. If found, remove the backwards compat code (no users are on pre-Phase 3 versions).

**Q2:** What if the backend doesn't always use the envelope?
- **Answer:** Audit backend responses. All should use `{ success, data }`. If any endpoint doesn't, fix the backend (Track A work) or add a special case in the interceptor.

**Q3:** Should we add TypeScript types to prevent `response.data.data` access?
- **Answer:** Difficult without complex generics. Manual audit + documentation is more practical for Sprint 1. Consider stricter types in Sprint 2.

---

## 10. Dependencies

**Blocks:**
- Sprint 2 AI/MCP integration (requires clean service patterns)
- B.12 (Settings Audit) benefits from consistent patterns

**Blocked by:**
- None (can start immediately)

---

## 11. Definition of Done

- [x] All 18 service files audited
- [x] All double-unwrap bugs fixed (change `.data.data` to `.data`)
- [x] Paginated responses verified correct (`.data.items` is valid for paginated endpoints)
- [x] Comment added to api.service.ts documenting interceptor behavior
- [x] Audit report created: `docs/sprint-1/SERVICE-UNWRAP-AUDIT.md`
- [x] Manual smoke tests pass (dashboard, assets, patches, deployments, settings)
- [x] `npm run check-types` passes
- [x] `npm run lint` passes
- [x] Git commit: "refactor(services): fix double-unwrapping patterns, add interceptor documentation"
- [x] PR merged to `sprint-1/track-b` branch
