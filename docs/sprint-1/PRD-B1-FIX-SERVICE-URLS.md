# PRD: B.1 — Fix Broken Service URLs

> **Sprint 1 Track B** | **Priority:** Must Have (Week 2) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** All frontend pages must load without 404 errors
> **Dependencies:** **BLOCKED BY A.1** (Dev 1 must create missing backend routes first)

---

## 1. Problem Statement

Eight frontend service methods call API endpoints that either don't exist or use incorrect URLs. This was discovered during the codebase audit:

| Service file | Current (broken) URL | Issue |
|--------------|---------------------|-------|
| `patch.service.ts:88` | `POST /patches/:id/scan-endpoints` | 404 — route doesn't exist |
| `patch.service.ts:98` | `GET /patches/:id/endpoints` | 404 — route doesn't exist |
| `patch.service.ts:103` | `GET /endpoints/:id` | 404 — route doesn't exist |
| `tag.service.ts:51` | `POST /tags/bulk-assign` | 404 — backend has `/assets/bulk-tags` instead |
| `tag.service.ts:55` | `POST /tags/bulk-remove` | 404 — route doesn't exist |
| `tag.service.ts:60` | `GET /tags/search` | 404 — route doesn't exist |
| `category.service.ts:66` | `GET /categories/:id/assets` | 404 — route doesn't exist |
| `category.service.ts:72` | `GET /subcategories/:id/assets` | 404 — route doesn't exist |

**What's broken:**
- Every one of these service calls results in a page crash or silent failure
- Patches page: "Scan Endpoints" and "View Endpoints" buttons don't work
- Assets page: Bulk tag operations fail
- Tag search autocomplete shows no results
- Category/subcategory filtering doesn't work

**Who is affected:** Any user attempting to use these features (endpoint scanning, bulk tagging, category filtering).

**Cost of not solving:** 8 user-facing features are completely broken. Users encounter crashes or no-op buttons throughout the platform.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | All 8 service URLs align with backend routes | Zero 404 errors from these endpoints |
| G2 | Features work end-to-end | Bulk tagging, endpoint scanning, category filtering all function |
| G3 | No regressions in other service calls | Existing working endpoints continue functioning |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Change backend route structure | Dev 1 (A.1) owns backend route decisions, Dev 2 adapts frontend |
| N2 | Refactor service layer architecture | This is a URL alignment fix, not a service redesign |
| N3 | Add new features beyond fixing broken ones | Just make existing buttons work, don't add functionality |

---

## 4. User Stories

- As a **security analyst**, I want to scan a patch for affected endpoints so that I can identify which assets need the patch.
- As an **asset admin**, I want to bulk-assign tags to multiple assets so that I can organize my asset inventory efficiently.
- As an **asset admin**, I want to search for tags via autocomplete so that I can quickly find and apply existing tags.
- As an **asset admin**, I want to filter assets by category or subcategory so that I can view devices by type (servers, workstations, etc.).

---

## 5. Requirements

### Must-Have (P0)

#### R1: Fix patch service endpoint URLs

**File:** `frontend/src/services/patch.service.ts`

**Current (broken):**
```typescript
// Line 88
async scanPatchEndpoints(patchId: string): Promise<void> {
  return await api.post(`/patches/${patchId}/scan-endpoints`); // ❌ 404
}

// Line 98
async getPatchEndpoints(patchId: string): Promise<Endpoint[]> {
  const response = await api.get(`/patches/${patchId}/endpoints`); // ❌ 404
  return response.data;
}

// Line 103
async getEndpointById(endpointId: string): Promise<Endpoint> {
  const response = await api.get(`/endpoints/${endpointId}`); // ❌ 404
  return response.data;
}
```

**After A.1 ships, Dev 1 will provide:**
- `POST /v1/patches/:id/scan-endpoints` (new route)
- `GET /v1/patches/:id/endpoints` (new route)
- `GET /v1/endpoints/:id` OR `GET /v1/assets/:id/full` (new route or alias)

**Fixed URLs (after confirming with Dev 1):**
```typescript
// Keep URLs as-is if A.1 creates these routes, OR update to:
async getEndpointById(endpointId: string): Promise<Endpoint> {
  // If Dev 1 decides endpoints === assets, change to:
  const response = await api.get(`/assets/${endpointId}/full`);
  return response.data;
}
```

**Acceptance Criteria:**
- [x] Coordinate with Dev 1 to confirm final route structure
- [x] Update service URLs to match A.1 implementation
- [x] Patch detail page "Scan Endpoints" button works (no 404)
- [x] Patch detail page "View Endpoints" loads endpoint list

#### R2: Fix tag service endpoint URLs

**File:** `frontend/src/services/tag.service.ts`

**Current (broken):**
```typescript
// Line 51
async bulkAssignTags(assetIds: string[], tags: string[]): Promise<void> {
  return await api.post('/tags/bulk-assign', { assetIds, tags }); // ❌ Wrong URL
}

// Line 55
async bulkRemoveTags(assetIds: string[], tags: string[]): Promise<void> {
  return await api.post('/tags/bulk-remove', { assetIds, tags }); // ❌ 404
}

// Line 60
async searchTags(query: string): Promise<string[]> {
  const response = await api.get('/tags/search', { params: { q: query } }); // ❌ 404
  return response.data;
}
```

**Backend already has:** `POST /v1/assets/bulk-tags` (existing route at `assets.routes.ts:70`)

**Fixed URLs:**
```typescript
// Option 1: Change frontend to match backend
async bulkAssignTags(assetIds: string[], tags: string[]): Promise<void> {
  return await api.post('/assets/bulk-tags', { assetIds, tags }); // ✅ Matches backend
}

// Option 2: Dev 1 adds `/tags/bulk-assign` as an alias in A.1 (coordinate)
```

**After A.1 ships:**
- `POST /v1/tags/bulk-remove` (new route)
- `GET /v1/tags/search` (new route)

**Acceptance Criteria:**
- [x] `bulkAssignTags` uses correct URL (`/assets/bulk-tags` OR `/tags/bulk-assign` if Dev 1 adds it)
- [x] `bulkRemoveTags` works after A.1 ships `/tags/bulk-remove`
- [x] `searchTags` works after A.1 ships `/tags/search`
- [x] Assets page bulk tag operations succeed
- [x] Tag autocomplete search shows results

#### R3: Fix category service endpoint URLs

**File:** `frontend/src/services/category.service.ts`

**Current (broken):**
```typescript
// Line 66
async getAssetsByCategory(categoryId: string): Promise<Asset[]> {
  const response = await api.get(`/categories/${categoryId}/assets`); // ❌ 404
  return response.data;
}

// Line 72
async getAssetsBySubcategory(subcategoryId: string): Promise<Asset[]> {
  const response = await api.get(`/subcategories/${subcategoryId}/assets`); // ❌ 404
  return response.data;
}
```

**After A.1 ships:**
- `GET /v1/categories/:id/assets` (new route)
- `GET /v1/subcategories/:id/assets` (new route)

**Acceptance Criteria:**
- [x] URLs updated after A.1 ships
- [x] Assets page category filter works
- [x] Assets page subcategory filter works
- [x] Filtered lists display correct assets

#### R4: Update affected UI components

After fixing service URLs, verify these components work:

**Components to test:**
- `pages/patches/PatchDetails.tsx` — "Scan Endpoints", "View Endpoints" buttons
- `pages/assets/AllAssets.tsx` — Bulk tag assign/remove, category/subcategory filters
- `components/TagSelect.tsx` or similar — Tag autocomplete search

**Acceptance Criteria:**
- [x] All buttons/dropdowns trigger correct API calls
- [x] No console errors (404, undefined, etc.)
- [x] Features complete end-to-end workflows

#### R5: Manual smoke tests

**Acceptance Criteria:**
- [x] Navigate to Patch Detail page → Click "Scan Endpoints" → No 404 error
- [x] Navigate to Patch Detail page → Click "View Endpoints" → List displays
- [x] Navigate to Assets page → Select multiple assets → Bulk assign tag → Success
- [x] Navigate to Assets page → Select multiple assets → Bulk remove tag → Success
- [x] Navigate to Assets page → Type in tag search → Autocomplete shows tags
- [x] Navigate to Assets page → Filter by category → Assets filtered correctly
- [x] Navigate to Assets page → Filter by subcategory → Assets filtered correctly

---

### Nice-to-Have (P1)

#### R6: Add request logging for these endpoints

```typescript
// In api.service.ts request interceptor
console.log(`[API] ${method.toUpperCase()} ${url}`);
```

**Acceptance Criteria:**
- [ ] Console logs show all API calls during smoke testing
- [ ] Helps verify correct URLs are being called

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| 404 error rate | 0% for these 8 endpoints | Backend logs show no 404s for fixed routes |
| Feature adoption | Users start using bulk tagging, endpoint scanning | Track API call counts for these endpoints |
| User complaints | 0 tickets about broken buttons | Support ticket volume for these features drops to zero |

---

## 7. Test Plan

### Manual Smoke Tests

See R5 acceptance criteria above (7 tests covering all 8 endpoints).

### Integration Tests (Optional, P2)

```typescript
// frontend/tests/integration/services.test.ts

test('bulkAssignTags calls correct URL', async () => {
  const mockApi = jest.spyOn(api, 'post');
  await tagService.bulkAssignTags(['asset1'], ['prod']);
  expect(mockApi).toHaveBeenCalledWith('/assets/bulk-tags', { assetIds: ['asset1'], tags: ['prod'] });
});

test('searchTags calls correct URL', async () => {
  const mockApi = jest.spyOn(api, 'get');
  await tagService.searchTags('prod');
  expect(mockApi).toHaveBeenCalledWith('/tags/search', { params: { q: 'prod' } });
});

// ... similar tests for other 6 endpoints
```

---

## 8. Implementation Notes

### Coordination with Dev 1 (Track A)

**Before starting B.1, Dev 2 must:**
1. Wait for Dev 1 to merge A.1 to `main` (notification via Slack/DM: "A.1 merged — 8 new API routes ready")
2. Rebase `sprint-1/track-b` onto `main`
3. Review `backend/src/modules/patches/patches.routes.ts` and `assets.routes.ts` to see final route structure
4. Update frontend service files to match

**URL mismatch on `bulk-tags`:**
- Backend has: `POST /assets/bulk-tags`
- Frontend calls: `POST /tags/bulk-assign`
- **Decision:** Change frontend to match backend (simpler) OR ask Dev 1 to add `/tags/bulk-assign` as an alias in A.1

### File Changes

| File | Lines to Change | Change Type |
|------|----------------|-------------|
| `patch.service.ts` | 88, 98, 103 | Update URLs (may stay same if A.1 creates matching routes) |
| `tag.service.ts` | 51, 55, 60 | Update URLs (line 51 changes to `/assets/bulk-tags`, 55 & 60 wait for A.1) |
| `category.service.ts` | 66, 72 | Update URLs (after A.1 ships) |

**Estimated changes:** ~8 lines (just URL strings)

### Testing Strategy

1. **Dev 1 ships A.1 → Dev 2 rebases**
2. **Dev 2 reviews new routes** in backend code
3. **Dev 2 updates frontend URLs** (1-2 hours)
4. **Dev 2 runs manual smoke tests** (30 minutes, 7 test scenarios)
5. **Dev 2 merges to track-b** after all tests pass

### Estimated Effort

1-2 hours (waiting for A.1 is the blocker, actual code changes are minimal)

---

## 9. Open Questions

**Q1:** Will Dev 1 create all 8 routes exactly as the frontend expects, or will some URLs differ?
- **Answer:** Coordinate during A.1 implementation. Dev 1 documents final route structure in A.1 PR.

**Q2:** Should `/tags/bulk-assign` be added as an alias to `/assets/bulk-tags`, or should frontend change?
- **Answer:** Prefer changing frontend to match backend (1-line fix). Aliases add complexity.

**Q3:** What if some routes are delayed beyond Week 2?
- **Answer:** Dev 2 prioritizes unblocked fixes first. Track delayed routes as separate mini-PRs.

**Q4:** Are there TypeScript type mismatches between frontend service methods and new backend responses?
- **Answer:** Unlikely (both use shared types). If found, update `shared/types/` and regenerate.

---

## 10. Dependencies

**Blocks:**
- Sprint 1 exit criteria ("Zero 404/501 errors from any frontend page")
- All downstream features using these service methods

**Blocked by:**
- **A.1** (Dev 1 must create 8 missing backend routes)
  - Status: Check ROADMAP.md — if A.1 is `COMPLETED`, B.1 can start immediately

---

## 11. Definition of Done

- [x] Dev 1 has merged A.1 to `main` (backend routes exist)
- [x] Dev 2 has rebased `sprint-1/track-b` onto `main`
- [x] All 8 service URLs updated to match backend routes
- [x] Manual smoke tests pass (all 7 scenarios in R5)
- [x] Zero 404 errors in console or network tab
- [x] `npm run check-types` passes
- [x] `npm run lint` passes
- [x] Git commit: "fix(services): align frontend service URLs with backend routes (A.1)"
- [x] PR merged to `sprint-1/track-b` branch
