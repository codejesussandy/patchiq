# PRD: B.2 — Fix Patch Template Sync Auth

> **Sprint 1 Track B** | **Priority:** Must Have (Week 1) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** Patch template streaming sync must work for CVE correlation
> **Dependencies:** None (can start Day 1)

---

## 1. Problem Statement

The patch template sync feature uses streaming fetch to download large template files from the backend. However, the auth token lookup in `patch-template.service.ts:74` uses `localStorage.getItem('token')`, but the actual auth implementation stores tokens under the key `'accessToken'`.

**What's broken:**
- Every patch template sync attempt gets a 401 Unauthorized error
- Users cannot download or update patch templates from the template catalog
- The streaming progress UI works correctly but the request fails before any data transfers
- The bug was introduced when auth was refactored but this legacy fetch call wasn't updated

**Who is affected:** Any user attempting to sync patch templates (typically admins setting up the patch catalog).

**Cost of not solving:** Patch templates cannot be downloaded, blocking the entire template-based patch deployment workflow. Sprint 2's patch-CVE correlation feature depends on having templates available.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | Patch template sync authenticates correctly | Streaming fetch includes valid Bearer token, no 401 errors |
| G2 | Sync completes successfully | Template file downloads to completion with progress updates |
| G3 | No regressions in other auth flows | Login, API calls via axios continue to work unchanged |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Refactor streaming implementation | The streaming logic itself works — only the auth token key is wrong |
| N2 | Migrate to axios for streaming | `fetch` with ReadableStream is appropriate for this use case |
| N3 | Centralize all localStorage keys | B.13 handles this separately as a broader refactor |
| N4 | Add retry logic for failed syncs | Not required for Sprint 1 — user can manually retry |

---

## 4. User Stories

- As a **platform admin**, I want to sync patch templates from the catalog so that I can deploy standardized patches to my infrastructure.
- As a **platform admin**, I want to see real-time progress as templates download so that I know the sync is working and can estimate completion time.
- As a **developer**, I want consistent auth patterns across the codebase so that token management is predictable.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Fix localStorage key in streaming fetch

**Current implementation:**
```typescript
// patch-template.service.ts:74
const token = localStorage.getItem('token');
```

**Corrected implementation:**
```typescript
const token = localStorage.getItem('accessToken');
```

**Acceptance Criteria:**
- [x] Change `'token'` to `'accessToken'` in `patch-template.service.ts:71`
- [x] Streaming fetch includes `Authorization: Bearer <token>` header
- [x] Backend receives valid token and allows template download
- [x] No 401 errors during sync

#### R2: Verify no other files use incorrect token key

**Acceptance Criteria:**
- [x] Grep entire frontend codebase for `localStorage.getItem('token')` (without 'access' prefix)
- [x] Verify no other files have the same bug
- [x] If found, fix them in this PR (keeping scope tight)

#### R3: Manual smoke test

**Acceptance Criteria:**
- [x] Navigate to Patch Templates page
- [x] Click "Sync from Catalog" on a template
- [x] Verify: Progress bar advances from 0% to 100%
- [x] Verify: No 401 errors in Network tab
- [x] Verify: Template file successfully downloaded (check MinIO or backend logs)

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Sync success rate | 100% (up from 0%) | No 401 errors in backend logs for `/patch-templates/:id/sync` |
| Time to fix | <30 minutes | Single-line change + verification |
| Regressions introduced | 0 | Login and other API calls continue working |

---

## 7. Test Plan

### Unit Tests (Not Required)

This is a one-line localStorage key fix. Unit tests would mock localStorage, which provides little value. Manual testing is sufficient.

### Integration Tests (Not Required)

Patch template streaming is an end-to-end flow involving fetch, backend API, MinIO. Full integration tests are B.13 (E2E coverage) scope.

### Manual Smoke Tests

```
Test: Patch template sync with correct auth token
  Given: User is logged in (valid accessToken in localStorage)
  When: User clicks "Sync Template" on any patch template
  Then: Streaming fetch begins with Authorization header
  And: Progress bar updates from 0% to 100%
  And: No 401 errors appear in console or network tab
  And: Template file successfully downloads

Test: Patch template sync without auth token
  Given: User is NOT logged in (no accessToken in localStorage)
  When: User navigates to patch templates page
  Then: Should be redirected to login (existing auth protection)
  And: Should not reach the sync flow

Test: Other auth flows still work
  Given: The token key fix has been applied
  When: User logs in via the login page
  Then: Token stored as 'accessToken'
  And: Subsequent API calls via axios succeed
  And: No 401 errors on normal API requests
```

---

## 8. Implementation Notes

### File to Modify

**`frontend/src/services/patch-template.service.ts`** (line 71, currently line 74 per ROADMAP)

Current code (approximate):
```typescript
async syncTemplate(templateId: string): Promise<void> {
  const token = localStorage.getItem('token'); // ❌ Wrong key
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/patch-templates/${templateId}/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // ... streaming ReadableStream logic
}
```

Fixed code:
```typescript
async syncTemplate(templateId: string): Promise<void> {
  const token = localStorage.getItem('accessToken'); // ✅ Correct key
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/patch-templates/${templateId}/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // ... streaming ReadableStream logic unchanged
}
```

### Search Pattern

To find other instances of the incorrect key:
```bash
cd frontend
grep -rn "localStorage.getItem('token')" src/
grep -rn 'localStorage.getItem("token")' src/
```

Expected results: 1-2 occurrences (patch-template.service.ts + possibly one other legacy file)

### Verification Command

After fix:
```bash
cd frontend
npm run check-types  # Should pass
npm run lint         # Should pass
```

### Estimated Effort

15-30 minutes (1-line change + grep search + manual test)

---

## 9. Open Questions

**Q1:** Are there other files using the incorrect `'token'` key?
- **Answer:** Run grep search during implementation. If found, fix in same commit.

**Q2:** Should we add a fallback to check both keys for backwards compatibility?
- **Answer:** No. The `'token'` key was never correct in production. Users who hit the 401 bug simply couldn't sync — no data is stored under the old key that we need to migrate.

**Q3:** Should this be part of B.13 (centralize localStorage keys)?
- **Answer:** No. This is a critical bugfix (Must Have Week 1). B.13 is a broader refactor (Could Have). Fix the bug now, refactor later.

---

## 10. Dependencies

**Blocks:**
- Sprint 2 patch-CVE correlation (needs working template sync to have template data)

**Blocked by:**
- None (can start immediately)

---

## 11. Definition of Done

- [x] `localStorage.getItem('token')` changed to `localStorage.getItem('accessToken')`
- [x] Grep search confirms no other incorrect usages
- [x] Manual test: Template sync completes successfully with no 401 errors
- [x] `npm run check-types` passes
- [x] `npm run lint` passes
- [x] Git commit with clear message: "fix(patch-template): use correct localStorage key for auth token"
- [x] PR merged to `sprint-1/track-b` branch
