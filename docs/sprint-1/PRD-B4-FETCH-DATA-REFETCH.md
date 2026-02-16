# PRD: B.4 — Fix DistributionServer Delete Handler

> **Sprint 1 Track B** | **Priority:** Must Have (Week 1) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** Settings pages must all function for Sprint 2 settings overhaul
> **Dependencies:** None (can start Day 1)

---

## 1. Problem Statement

The DistributionServer settings page (`pages/settings/DistributionServer.tsx:70`) has a delete handler `_handleDelete` that calls `fetchData()` after a successful delete operation. However, `fetchData()` does not exist in the component — it's leftover from a pre-React Query implementation.

**What's broken:**
- The delete button is currently dead code (likely disabled or not wired up)
- If activated, clicking "Delete Distribution Server" would crash with `ReferenceError: fetchData is not defined`
- The page now uses React Query with `useDistributionServers()` hook, which provides a `refetch()` function

**Who is affected:** Any user (typically admins) attempting to delete a distribution server configuration.

**Cost of not solving:** Distribution server management is incomplete. Admins cannot remove obsolete or misconfigured distribution servers, leading to clutter and potential deployment issues.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | Delete handler uses correct refetch method | No `ReferenceError` when delete succeeds |
| G2 | Server list refreshes after delete | Deleted server disappears from list immediately |
| G3 | Error handling works correctly | Failed deletes show appropriate error messages |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Redesign delete confirmation flow | Existing confirmation modal is adequate |
| N2 | Add undo/restore functionality | Not required for Sprint 1 |
| N3 | Audit all settings pages for similar issues | B.12 (Settings Audit) handles comprehensive review |
| N4 | Optimize refetch behavior | React Query's default refetch is sufficient |

---

## 4. User Stories

- As a **platform admin**, I want to delete obsolete distribution servers so that my configuration remains clean and accurate.
- As a **platform admin**, I want the server list to refresh immediately after deletion so that I can confirm the action succeeded.
- As a **developer**, I want consistent data-fetching patterns across settings pages so that the codebase is maintainable.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Replace fetchData() with refetch()

**Current implementation:**
```typescript
// pages/settings/DistributionServer.tsx:70 (approximate)
const _handleDelete = async (id: string) => {
  try {
    await distributionServerService.delete(id);
    message.success('Distribution server deleted successfully');
    fetchData(); // ❌ Function does not exist
  } catch (error) {
    message.error('Failed to delete distribution server');
  }
};
```

**Corrected implementation:**
```typescript
const { data: servers, isLoading, refetch } = useDistributionServers();

const _handleDelete = async (id: string) => {
  try {
    await distributionServerService.delete(id);
    message.success('Distribution server deleted successfully');
    refetch(); // ✅ Use React Query refetch
  } catch (error) {
    message.error('Failed to delete distribution server');
  }
};
```

**Acceptance Criteria:**
- [x] Destructure `refetch` from `useDistributionServers()` hook
- [x] Replace `fetchData()` call with `refetch()` in `_handleDelete`
- [x] Delete operation successfully removes server from list
- [x] No `ReferenceError` in console

#### R2: Verify delete button is wired up

**Acceptance Criteria:**
- [x] Locate the delete button in the JSX (likely in a table action column)
- [x] Verify it calls `_handleDelete` with the correct server ID
- [x] If button is disabled/commented out, enable it (since the handler now works)

#### R3: Verify confirmation modal exists

**Acceptance Criteria:**
- [x] Check if there's a confirmation modal before delete (best practice for destructive actions)
- [x] If missing, document in B.12 (Settings Audit) but don't add in this PR (keep scope tight)

#### R4: Manual smoke test

**Acceptance Criteria:**
- [x] Navigate to Settings → Distribution Servers
- [x] Add a test distribution server (or use existing one)
- [x] Click "Delete" on a server
- [x] Verify: Confirmation modal appears (if implemented)
- [x] Confirm deletion
- [x] Verify: Success message appears
- [x] Verify: Server disappears from table immediately
- [x] Verify: No console errors

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Delete success rate | 100% | No ReferenceError, server removed from list |
| Time to fix | <20 minutes | Single-line change + verification |
| User feedback | Positive | Success message displays, list updates immediately |

---

## 7. Test Plan

### Unit Tests (Not Required)

Delete handler testing is best done at integration level (mocking React Query hooks in unit tests is brittle).

### Integration Tests (Not Required)

Full settings page integration testing is B.12 (Settings Audit) scope.

### Manual Smoke Tests

```
Test: Delete distribution server with corrected refetch
  Given: User is logged in as admin
  And: At least one distribution server exists
  When: User navigates to Settings → Distribution Servers
  And: Clicks "Delete" on a server
  Then: Delete API call succeeds
  And: Success message appears
  And: refetch() is called (server list updates)
  And: Deleted server disappears from table
  And: No "fetchData is not defined" error

Test: Delete with API error
  Given: Backend API is unavailable or returns 500
  When: User attempts to delete a server
  Then: Error message appears
  And: Server remains in list (not optimistically removed)
  And: No console errors beyond expected API failure

Test: Delete with network error
  Given: User has unstable network connection
  When: Delete operation times out
  Then: React Query error handling triggers
  And: User sees error message
```

---

## 8. Implementation Notes

### File to Modify

**`frontend/src/pages/settings/DistributionServer.tsx`** (lines ~15-25 for hook, line ~70 for handler)

### Current Code Structure

The file likely has:
- React Query hook: `const { data, isLoading } = useDistributionServers();`
- Delete handler: `_handleDelete` that calls `fetchData()`
- JSX table with delete button in action column

### Fix

1. **Update hook destructuring:**
```typescript
const { data: servers, isLoading, refetch } = useDistributionServers();
```

2. **Replace fetchData() with refetch():**
```typescript
const _handleDelete = async (id: string) => {
  try {
    await distributionServerService.delete(id);
    message.success('Distribution server deleted successfully');
    refetch(); // ✅ Fixed
  } catch (error) {
    message.error('Failed to delete distribution server');
  }
};
```

### Alternative: Use Mutation

A more React Query-idiomatic approach would be to use `useMutation` with automatic invalidation:

```typescript
const { refetch } = useDistributionServers();
const deleteMutation = useMutation({
  mutationFn: (id: string) => distributionServerService.delete(id),
  onSuccess: () => {
    message.success('Distribution server deleted successfully');
    refetch();
  },
  onError: () => {
    message.error('Failed to delete distribution server');
  },
});

const _handleDelete = (id: string) => deleteMutation.mutate(id);
```

**Decision:** Use simple `refetch()` approach for Sprint 1 (minimal change). Mutation pattern can be standardized in Sprint 2 as part of B.12 (Settings Audit) if desired.

### Estimated Effort

15-20 minutes (destructure refetch + replace call + manual test)

---

## 9. Open Questions

**Q1:** Is there a confirmation modal before delete, or does it delete immediately?
- **Answer:** Check during implementation. If no modal exists, document in B.12 but don't add in this PR.

**Q2:** Should we use `useMutation` instead of manual refetch?
- **Answer:** No for Sprint 1. The simple refetch fix is lower risk. Standardize mutation patterns in Sprint 2 if desired.

**Q3:** Are there other settings pages with the same `fetchData()` bug?
- **Answer:** Likely. B.5 (audit double-unwrapping) and B.12 (settings audit) will catch similar issues. Fix them when found, but don't delay this PR.

---

## 10. Dependencies

**Blocks:**
- B.12 (Settings Page Audit) — need delete to work before auditing full page
- Sprint 2 settings overhaul — requires all CRUD operations functional

**Blocked by:**
- None (can start immediately)

---

## 11. Definition of Done

- [x] `refetch` destructured from `useDistributionServers()` hook
- [x] `fetchData()` replaced with `refetch()` in `_handleDelete` handler
- [x] Manual test: Delete operation removes server from list
- [x] No `ReferenceError` in console
- [x] `npm run check-types` passes
- [x] `npm run lint` passes
- [x] Git commit: "fix(settings): use refetch instead of undefined fetchData in DistributionServer delete"
- [x] PR merged to `sprint-1/track-b` branch
