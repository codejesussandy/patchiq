# Implementation Plan: B.11 — Refactor Raw Fetch to Use Axios Instance

> **Sprint:** 1 | **Track:** B (Frontend) | **Owner:** Dev 2
> **Priority:** P1 (Should Have) | **Effort:** 2-3 hours
> **Status:** 🔄 IN PLANNING
> **Date:** 2026-02-12

---

## 1. Executive Summary

**Problem:** Raw `fetch()` calls bypass the axios interceptor, losing automatic auth token refresh, error handling, and response normalization. This creates inconsistent API client behavior and duplicates logic.

**Goal:** Refactor all raw `fetch()` calls to either use axios or apply interceptors manually, while preserving streaming functionality where needed.

**Success Criteria:**
- Zero raw `fetch()` calls that bypass auth/error handling
- Streaming responses continue to work (patch template sync)
- All API calls benefit from axios interceptors
- No regressions in existing functionality

---

## 2. Discovery Phase

### 2.1 Locate All Raw Fetch Usage

**Search Strategy:**
```bash
# Find all fetch() calls in frontend
grep -r "fetch(" frontend/src --include="*.ts" --include="*.tsx"

# Exclude node_modules, build artifacts
grep -r "fetch(" frontend/src --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=dist
```

**Expected Locations:**
Based on PRD and B.2 context:
1. `patch-template.service.ts:70-101` — Streaming patch template sync
2. Potentially `useNotificationSSE.ts` — SSE connection
3. Potentially agent-related streaming endpoints

**Documentation:**
Create a table of all fetch() usage:

| File | Line | Purpose | Streaming? | Auth? | Error Handling? |
|------|------|---------|------------|-------|-----------------|
| TBD | TBD | TBD | TBD | TBD | TBD |

### 2.2 Analyze Why Fetch Was Used

For each location, determine:
- **Why fetch?** (streaming, SSE, special headers, legacy code)
- **Can axios handle it?** (axios supports streaming with `responseType: 'stream'`)
- **What interceptors are needed?** (auth, error handling, logging)

---

## 3. Technical Analysis

### 3.1 Current Axios Setup

**File:** `frontend/src/services/api.service.ts`

**Response Interceptor (Lines 23-54):**
- Automatically unwraps `{ success: true, data: T }` envelope
- Handles paginated responses
- Throws structured errors with backend messages

**Request Interceptor (Lines 16-21):**
- Adds `Authorization: Bearer {token}` header from localStorage
- Uses key `'accessToken'` (fixed in B.2)

**Key Insight:** The response interceptor unwraps data automatically, so all service methods should use `response.data` (not `response.data.data`).

### 3.2 Streaming with Axios

**Option 1: Axios Streaming Response**
```typescript
const response = await api.post('/endpoint', data, {
  responseType: 'stream',
  onDownloadProgress: (progressEvent) => {
    // Handle streaming chunks
  }
});
```

**Option 2: Native Fetch with Manual Auth**
```typescript
// Extract token using same pattern as axios
const token = localStorage.getItem('accessToken');
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/endpoint`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});
```

**Option 3: Shared Auth Helper**
```typescript
// api.service.ts - export helper
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  return fetch(`${baseURL}${url}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
};
```

**Recommendation:** Use Option 3 (shared helper) for streaming endpoints to:
- Centralize auth logic
- Avoid hardcoded base URLs
- Keep streaming functionality
- Enable future enhancements (token refresh, logging)

---

## 4. Refactor Strategy

### 4.1 Phase 1: Discovery (Agent Task)

**Agent:** General-purpose (Explore agent)
**Duration:** 15-30 minutes

**Task:**
1. Search entire frontend codebase for raw `fetch()` calls
2. Document each location with context (purpose, auth status, streaming)
3. Categorize by refactor approach needed
4. Create findings table

**Deliverable:** Discovery report with all fetch() locations and recommendations

### 4.2 Phase 2: Create Streaming Helper (if needed)

**File:** `frontend/src/services/api.service.ts`

**Add:**
```typescript
/**
 * Fetch helper with automatic auth header injection.
 * Use for streaming responses or SSE connections where axios is not suitable.
 *
 * @param url - Relative URL path (e.g., '/v1/patch-templates/sync')
 * @param options - Standard fetch options (method, headers, body)
 * @returns Native fetch Response object
 */
export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = localStorage.getItem('accessToken');
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  if (!token) {
    throw new Error('No authentication token found');
  }

  return fetch(`${baseURL}${url}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
};
```

**Export:**
```typescript
export { api as default, fetchWithAuth };
```

### 4.3 Phase 3: Refactor Each Location (Agent Task)

**Agent:** General-purpose (Implementation agent)
**Duration:** 1-2 hours

**For each fetch() location:**

1. **If non-streaming:**
   - Replace with axios (`api.post()`, `api.get()`, etc.)
   - Remove manual auth header construction
   - Remove manual error handling (axios interceptor handles it)
   - Update response handling to use `response.data` (unwrapped)

2. **If streaming/SSE:**
   - Replace with `fetchWithAuth()` helper
   - Keep existing streaming response reader
   - Remove hardcoded base URL (use helper's base URL)
   - Verify auth header is applied

**Example Refactor (patch-template.service.ts):**

**Before:**
```typescript
const response = await fetch('/v1/patch-templates/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`, // Wrong key!
  },
  body: JSON.stringify({ templateIds }),
});
```

**After:**
```typescript
import { fetchWithAuth } from './api.service';

const response = await fetchWithAuth('/v1/patch-templates/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ templateIds }),
});
```

**Benefits:**
- ✅ Correct auth token key (`'accessToken'`)
- ✅ Centralized auth logic
- ✅ No hardcoded base URL
- ✅ Streaming preserved
- ✅ Consistent with axios pattern

### 4.4 Phase 4: Testing (Agent Task)

**Agent:** General-purpose (QA agent)
**Duration:** 30 minutes

**Test each refactored location:**

1. **Unit Test Validation:**
   - Check TypeScript compilation passes
   - Check ESLint passes
   - Verify imports are correct

2. **Functional Test Plan:**
   - Test streaming endpoints manually (if applicable)
   - Verify auth headers are sent
   - Check error handling works
   - Confirm no regressions in UI

3. **Integration Test:**
   - Test patch template sync (if that's the main streaming endpoint)
   - Verify progress events still fire
   - Check UI updates correctly

**Deliverable:** QA report with test results and any issues found

---

## 5. Implementation Steps

### Step 1: Run Discovery Agent
**Duration:** 15-30 minutes
**Agent:** Explore agent (general-purpose with search/analysis)

```bash
# Agent searches for:
- All fetch() calls in frontend/src
- Context around each (purpose, auth status)
- Categorization (streaming vs non-streaming)
```

**Output:** Discovery findings table

### Step 2: Review Findings & Decide Strategy
**Duration:** 5-10 minutes (Manual)

- Review discovery table
- Confirm refactor approach for each location
- Update plan if needed

### Step 3: Create Streaming Helper (if needed)
**Duration:** 15 minutes
**Agent:** Implementation agent (general-purpose)

- Add `fetchWithAuth()` to `api.service.ts`
- Export it alongside default axios instance
- Add JSDoc documentation

### Step 4: Refactor Each Location
**Duration:** 1-2 hours
**Agent:** Implementation agent (general-purpose)

- Replace raw fetch with axios or fetchWithAuth
- Update imports
- Remove redundant auth/error handling
- Update response handling

### Step 5: QA Validation
**Duration:** 30 minutes
**Agent:** QA agent (general-purpose)

- TypeScript compilation
- ESLint validation
- Functional test plan execution
- Regression check

### Step 6: Commit & Update PRD
**Duration:** 10 minutes (Manual)

- Git commit with detailed message
- Update PRD-TRACK-B.md to mark B.11 complete
- Document what was changed

---

## 6. Acceptance Criteria

### Must-Have (P0)

- [ ] **AC1:** Zero raw `fetch()` calls bypass auth interceptor
  - All fetch calls either use axios or `fetchWithAuth()` helper
  - Auth token automatically included in all requests

- [ ] **AC2:** Streaming functionality preserved
  - Patch template sync streams progress events
  - SSE connections (if any) continue working
  - No regression in streaming UX

- [ ] **AC3:** Base URL consistency
  - No hardcoded `http://localhost:3000` or absolute URLs
  - All use `import.meta.env.VITE_API_BASE_URL` or axios baseURL

- [ ] **AC4:** Type safety maintained
  - TypeScript compilation succeeds with 0 new errors
  - ESLint passes with no new violations
  - Imports are correctly typed

### Nice-to-Have (P1)

- [ ] **AC5:** Shared streaming helper exists
  - `fetchWithAuth()` exported from `api.service.ts`
  - Reusable for future streaming needs
  - Well-documented with JSDoc

- [ ] **AC6:** Error handling improved
  - Streaming errors caught and displayed
  - Token expiration handled gracefully
  - Network errors show user-friendly messages

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking streaming functionality | Medium | High | Test patch template sync thoroughly before committing |
| Token expiration during stream | Low | Medium | Document limitation, consider refresh in future |
| Base URL env var not set | Low | Low | Default to localhost:3000 in helper |
| Undiscovered fetch() calls | Medium | Low | Comprehensive grep search in discovery phase |

---

## 8. Rollback Plan

If issues found after merge:

1. **Immediate:** Revert commit with `git revert {commit-hash}`
2. **Identify:** Run discovery again to find what was missed
3. **Fix:** Update plan and re-implement
4. **Test:** More thorough QA before re-merging

---

## 9. Success Metrics

**Quantitative:**
- Number of fetch() calls refactored: Target 3-5
- TypeScript errors introduced: 0
- Streaming endpoints still working: 100%

**Qualitative:**
- Code consistency: All API calls use axios pattern
- Maintainability: Auth logic centralized
- Developer experience: Clear pattern for future streaming needs

---

## 10. Dependencies

**Depends On:**
- ✅ B.2 (Auth localStorage key fix) — COMPLETE
- ✅ B.5 (Double-unwrap audit) — COMPLETE (pattern established)

**Blocks:**
- None (B.11 is independent)

---

## 11. Team Coordination

**Dev 1 (Track A):** No coordination needed — pure frontend work

**Dev 2 (Track B):** Owner of this task

**Timeline:**
- Discovery: 30 min
- Review: 10 min
- Implementation: 1-2 hours
- QA: 30 min
- Commit: 10 min
- **Total: 2-3 hours**

---

## 12. Execution Plan with Teammates

### Agent 1: Discovery Agent (Explore)
**Task:** Find all raw fetch() calls and document them
**Duration:** 15-30 minutes
**Deliverable:** Discovery findings table

### Agent 2: Implementation Agent (General-purpose)
**Task:**
1. Create `fetchWithAuth()` helper (if needed)
2. Refactor each fetch() location
3. Update imports and response handling
**Duration:** 1-2 hours
**Deliverable:** Refactored code, ready for QA

### Agent 3: QA Agent (General-purpose)
**Task:** Validate implementation against acceptance criteria
**Duration:** 30 minutes
**Deliverable:** QA report with PASS/FAIL status

---

## 13. Next Steps

1. ✅ Plan document created (this file)
2. ⏳ Spawn Discovery Agent → Find all fetch() calls
3. ⏳ Review findings → Confirm refactor strategy
4. ⏳ Spawn Implementation Agent → Refactor code
5. ⏳ Spawn QA Agent → Validate implementation
6. ⏳ Manual review → Final checks
7. ⏳ Commit & update PRD → Mark B.11 complete

---

**Plan Status:** ✅ READY FOR EXECUTION
**Estimated Completion:** 2-3 hours from start
**Confidence Level:** High (clear scope, well-understood problem, proven patterns)
