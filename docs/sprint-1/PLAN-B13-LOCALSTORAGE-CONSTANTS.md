# Implementation Plan: B.13 — Centralize localStorage Keys

> **Sprint:** 1 | **Track:** B (Frontend) | **Owner:** Dev 2
> **Priority:** P2 (Could Have) | **Effort:** 1-2 hours
> **Status:** 🔄 IN PLANNING
> **Date:** 2026-02-13

---

## 1. Executive Summary

**Problem:** Storage keys like `'accessToken'`, `'refreshToken'`, and `'column-config-{table}'` are hardcoded as string literals throughout the codebase. This causes bugs like B.2 (`'token'` vs `'accessToken'`) and makes refactoring difficult.

**Goal:** Create a centralized constants file for all localStorage keys, replace all hardcoded strings with constants, and establish a single source of truth.

**Success Criteria:**
- Zero hardcoded localStorage key strings in codebase
- All keys defined in central constants file
- Type-safe access to storage keys
- No regressions in auth, settings, or data persistence

---

## 2. Discovery Phase

### 2.1 Locate All localStorage Usage

**Search Strategy:**
```bash
# Find all localStorage.getItem calls
grep -r "localStorage.getItem" frontend/src --include="*.ts" --include="*.tsx"

# Find all localStorage.setItem calls
grep -r "localStorage.setItem" frontend/src --include="*.ts" --include="*.tsx"

# Find all localStorage.removeItem calls
grep -r "localStorage.removeItem" frontend/src --include="*.ts" --include="*.tsx"

# Find all localStorage.clear calls
grep -r "localStorage.clear" frontend/src --include="*.ts" --include="*.tsx"
```

**Expected Locations:**
Based on PRD context:
1. `api.service.ts:21` — `localStorage.getItem('accessToken')`
2. `AuthContext.tsx:17` — `localStorage.getItem('accessToken')`
3. `fetchWithAuth.ts` — `localStorage.getItem('accessToken')` (just added in B.11)
4. Column settings components — Dynamic keys like `'column-config-{table}'`
5. User preferences — Theme, language, etc.

**Documentation:**
Create a table of all localStorage usage:

| File | Line | Operation | Key | Purpose | Category |
|------|------|-----------|-----|---------|----------|
| TBD | TBD | getItem | TBD | TBD | TBD |

### 2.2 Categorize Storage Keys

Group keys by purpose:
- **Auth:** `accessToken`, `refreshToken`
- **User Preferences:** Theme, language, layout
- **Table Settings:** Column visibility, sort order, filters
- **UI State:** Sidebar collapsed, panel sizes
- **Feature Flags:** Onboarding completed, tour dismissed

---

## 3. Technical Analysis

### 3.1 Current State

**Scattered hardcoded keys:**
```typescript
// api.service.ts
localStorage.getItem('accessToken')

// AuthContext.tsx
localStorage.setItem('accessToken', token)
localStorage.removeItem('accessToken')

// ColumnSettingsDrawer.tsx (example)
localStorage.getItem(`column-config-${tableName}`)
```

**Problems:**
- Typos can cause subtle bugs
- Hard to find all usages when refactoring
- No type safety
- Magic strings everywhere

### 3.2 Proposed Solution

**Create centralized constants:**
```typescript
// frontend/src/constants/storage.constants.ts

/**
 * Centralized localStorage key constants.
 * DO NOT hardcode storage keys - always import from here.
 */
export const STORAGE_KEYS = {
  // Authentication
  AUTH: {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
  },

  // User preferences
  USER: {
    THEME: 'user-theme',
    LANGUAGE: 'user-language',
    TIMEZONE: 'user-timezone',
  },

  // Table configurations (dynamic keys)
  TABLE: {
    COLUMN_CONFIG: (tableName: string) => `column-config-${tableName}`,
    SORT_ORDER: (tableName: string) => `sort-order-${tableName}`,
    FILTERS: (tableName: string) => `filters-${tableName}`,
  },

  // UI state
  UI: {
    SIDEBAR_COLLAPSED: 'sidebar-collapsed',
    ACTIVE_TAB: 'active-tab',
  },

  // Feature flags
  FEATURES: {
    ONBOARDING_COMPLETED: 'onboarding-completed',
    TOUR_DISMISSED: 'tour-dismissed',
  },
} as const;

// Type-safe helper (optional, nice-to-have)
export type StorageKey =
  | typeof STORAGE_KEYS.AUTH[keyof typeof STORAGE_KEYS.AUTH]
  | typeof STORAGE_KEYS.USER[keyof typeof STORAGE_KEYS.USER]
  | typeof STORAGE_KEYS.UI[keyof typeof STORAGE_KEYS.UI]
  | typeof STORAGE_KEYS.FEATURES[keyof typeof STORAGE_KEYS.FEATURES]
  | string; // Allow dynamic keys like table configs
```

**Usage after refactor:**
```typescript
// Before
localStorage.getItem('accessToken')

// After
import { STORAGE_KEYS } from '@/constants/storage.constants';
localStorage.getItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN)
```

---

## 4. Refactor Strategy

### 4.1 Phase 1: Discovery (Agent Task)

**Agent:** Explore agent
**Duration:** 15-30 minutes

**Task:**
1. Search entire frontend for all localStorage usage
2. Document each location with key used and purpose
3. Categorize keys by type (auth, user prefs, table config, etc.)
4. Identify any duplicate or inconsistent key names

**Deliverable:** Comprehensive table of all localStorage usage

### 4.2 Phase 2: Create Constants File

**File:** `frontend/src/constants/storage.constants.ts`

**Structure:**
```typescript
export const STORAGE_KEYS = {
  AUTH: { ... },      // Authentication keys
  USER: { ... },      // User preferences
  TABLE: { ... },     // Table configurations (with functions for dynamic keys)
  UI: { ... },        // UI state
  FEATURES: { ... },  // Feature flags
} as const;
```

**Key Design Decisions:**
- Use nested objects for organization
- Use functions for dynamic keys (e.g., table-specific configs)
- Use `as const` for type safety
- Export both object and type

### 4.3 Phase 3: Refactor Each Location (Agent Task)

**Agent:** Implementation agent
**Duration:** 30-45 minutes

**For each localStorage usage:**

1. **Import constants:**
   ```typescript
   import { STORAGE_KEYS } from '@/constants/storage.constants';
   ```

2. **Replace hardcoded key:**
   ```typescript
   // Before
   localStorage.getItem('accessToken')

   // After
   localStorage.getItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN)
   ```

3. **Handle dynamic keys:**
   ```typescript
   // Before
   localStorage.getItem(`column-config-${tableName}`)

   // After
   localStorage.getItem(STORAGE_KEYS.TABLE.COLUMN_CONFIG(tableName))
   ```

**Priority order:**
1. Auth keys (critical for security)
2. User preferences (affects UX)
3. Table configurations (less critical)
4. UI state (least critical)

### 4.4 Phase 4: Optional Type-Safe Wrapper (Nice-to-Have)

**File:** `frontend/src/utils/storage.ts`

```typescript
import { STORAGE_KEYS } from '@/constants/storage.constants';

/**
 * Type-safe localStorage wrapper with automatic JSON parsing
 */
export const storage = {
  // Get with type safety and JSON parsing
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return localStorage.getItem(key) as T | null;
    }
  },

  // Set with automatic JSON stringification
  set<T>(key: string, value: T): void {
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  // Remove
  remove(key: string): void {
    localStorage.removeItem(key);
  },

  // Clear all
  clear(): void {
    localStorage.clear();
  },

  // Check if key exists
  has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  },
};

// Convenience exports for auth
export const authStorage = {
  getToken: () => storage.get<string>(STORAGE_KEYS.AUTH.ACCESS_TOKEN),
  setToken: (token: string) => storage.set(STORAGE_KEYS.AUTH.ACCESS_TOKEN, token),
  removeToken: () => storage.remove(STORAGE_KEYS.AUTH.ACCESS_TOKEN),
  getRefreshToken: () => storage.get<string>(STORAGE_KEYS.AUTH.REFRESH_TOKEN),
  setRefreshToken: (token: string) => storage.set(STORAGE_KEYS.AUTH.REFRESH_TOKEN, token),
  removeRefreshToken: () => storage.remove(STORAGE_KEYS.AUTH.REFRESH_TOKEN),
  clearAuth: () => {
    storage.remove(STORAGE_KEYS.AUTH.ACCESS_TOKEN);
    storage.remove(STORAGE_KEYS.AUTH.REFRESH_TOKEN);
  },
};
```

**Note:** This is P1 (nice-to-have). For P0, just do the constants refactor.

### 4.5 Phase 5: Testing (Agent Task)

**Agent:** QA agent
**Duration:** 15-30 minutes

**Test each refactored location:**

1. **Auth Flow:**
   - Login works (token stored)
   - Logout works (token removed)
   - Token persists across page reloads
   - Protected routes work

2. **User Preferences:**
   - Theme changes persist
   - Language changes persist
   - Settings save correctly

3. **Table Configurations:**
   - Column visibility persists
   - Sort order persists
   - Filters persist

4. **No Regressions:**
   - All localStorage reads/writes work
   - No console errors
   - TypeScript compiles

**Deliverable:** QA report with test results

---

## 5. Implementation Steps

### Step 1: Run Discovery Agent
**Duration:** 15-30 minutes
**Agent:** Explore agent

```bash
# Agent searches for:
- All localStorage.getItem calls
- All localStorage.setItem calls
- All localStorage.removeItem calls
- Context around each (what key, what purpose)
```

**Output:** Discovery findings table

### Step 2: Review Findings & Design Constants
**Duration:** 10-15 minutes (Manual)

- Review discovery table
- Organize keys into categories
- Design constants structure
- Decide on naming conventions

### Step 3: Create Constants File
**Duration:** 10-15 minutes
**Agent:** Implementation agent (or manual)

- Create `frontend/src/constants/storage.constants.ts`
- Define all keys in organized structure
- Add JSDoc documentation
- Export constants

### Step 4: Refactor All Locations
**Duration:** 30-45 minutes
**Agent:** Implementation agent

- Replace hardcoded strings with constants
- Update imports
- Handle dynamic keys (table configs)
- Preserve all functionality

### Step 5: QA Validation
**Duration:** 15-30 minutes
**Agent:** QA agent

- TypeScript compilation
- ESLint validation
- Functional test plan execution
- Regression check

### Step 6: Commit & Update PRD
**Duration:** 10 minutes (Manual)

- Git commit with detailed message
- Update PRD-TRACK-B.md to mark B.13 complete
- Document what was changed

---

## 6. Acceptance Criteria

### Must-Have (P0)

- [ ] **AC1:** Constants file exists
  - `frontend/src/constants/storage.constants.ts` created
  - All keys defined in organized structure

- [ ] **AC2:** Zero hardcoded localStorage keys
  - All `localStorage.getItem('...')` use constants
  - All `localStorage.setItem('...', ...)` use constants
  - All `localStorage.removeItem('...')` use constants

- [ ] **AC3:** Auth flow works
  - Login stores token correctly
  - Logout removes token correctly
  - Token persists across reloads
  - Protected routes work

- [ ] **AC4:** Type safety maintained
  - TypeScript compilation succeeds
  - ESLint passes
  - Imports correctly typed

### Nice-to-Have (P1)

- [ ] **AC5:** Type-safe storage wrapper exists
  - `storage.ts` with get/set/remove helpers
  - Automatic JSON parsing/stringification
  - Convenience exports for common operations

- [ ] **AC6:** Documentation added
  - JSDoc comments on all constants
  - Usage examples in comments
  - Migration guide for future keys

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking auth flow | Low | Critical | Test login/logout thoroughly before committing |
| Missing a localStorage usage | Medium | Medium | Comprehensive grep search, multiple patterns |
| Dynamic key issues (table configs) | Low | Medium | Test column settings on multiple tables |
| TypeScript errors from refactor | Low | Low | Incremental refactor, validate after each file |
| Import path issues | Low | Low | Use path alias `@/constants` consistently |

---

## 8. Rollback Plan

If issues found after merge:

1. **Immediate:** Revert commit with `git revert {commit-hash}`
2. **Identify:** Check which localStorage keys are broken
3. **Fix:** Update constants or revert specific files
4. **Test:** More thorough functional testing before re-merging

---

## 9. Success Metrics

**Quantitative:**
- Number of localStorage usages refactored: Target 20-30
- Hardcoded strings remaining: 0
- TypeScript errors introduced: 0

**Qualitative:**
- Code maintainability: Single source of truth for keys
- Bug prevention: Typos caught at compile time
- Developer experience: Clear where to find/add keys

---

## 10. Dependencies

**Depends On:**
- ✅ B.2 (Auth localStorage key fix) — COMPLETE
- ✅ B.11 (fetchWithAuth uses accessToken) — COMPLETE

**Blocks:**
- None (B.13 is independent)

---

## 11. Team Coordination

**Dev 1 (Track A):** No coordination needed — pure frontend work

**Dev 2 (Track B):** Owner of this task

**Timeline:**
- Discovery: 30 min
- Review: 15 min
- Create constants: 15 min
- Refactor: 45 min
- QA: 30 min
- Commit: 10 min
- **Total: 1.5-2 hours**

---

## 12. Execution Plan with Teammates

### Agent 1: Discovery Agent (Explore)
**Task:** Find all localStorage usage and document it
**Duration:** 15-30 minutes
**Deliverable:** Discovery findings table with categorization

### Agent 2: Implementation Agent (General-purpose)
**Task:**
1. Create constants file with organized structure
2. Refactor all localStorage calls to use constants
3. Update imports and handle dynamic keys
**Duration:** 45-60 minutes
**Deliverable:** Refactored code, ready for QA

### Agent 3: QA Agent (General-purpose)
**Task:** Validate implementation against acceptance criteria
**Duration:** 15-30 minutes
**Deliverable:** QA report with PASS/FAIL status

---

## 13. File Structure

**New Files:**
```
frontend/src/
  constants/
    storage.constants.ts  (NEW)  - All localStorage keys
  utils/
    storage.ts            (NEW, optional)  - Type-safe wrapper
```

**Modified Files:**
```
frontend/src/
  services/
    api.service.ts        - Replace 'accessToken' with constant
  contexts/
    AuthContext.tsx       - Replace auth keys with constants
  utils/
    fetchWithAuth.ts      - Replace 'accessToken' with constant
  components/
    ColumnSettingsDrawer.tsx  - Replace dynamic keys
    [Other components...]
```

---

## 14. Key Design Decisions

### Decision 1: Nested Object vs Flat Object

**Chosen:** Nested object with categories
```typescript
STORAGE_KEYS.AUTH.ACCESS_TOKEN
```

**Why:**
- Better organization as keys grow
- Easy to see what category a key belongs to
- TypeScript autocomplete works better

**Alternative (rejected):**
```typescript
STORAGE_KEYS.ACCESS_TOKEN  // Flat, less organized
```

### Decision 2: Function for Dynamic Keys

**Chosen:** Function that returns string
```typescript
TABLE: {
  COLUMN_CONFIG: (tableName: string) => `column-config-${tableName}`
}
```

**Why:**
- Type-safe
- Prevents typos in template literals
- Easy to change prefix later

**Alternative (rejected):**
```typescript
TABLE_COLUMN_CONFIG: 'column-config-'  // Manual concatenation
```

### Decision 3: as const for Type Safety

**Chosen:** Use `as const` on export
```typescript
export const STORAGE_KEYS = { ... } as const;
```

**Why:**
- TypeScript can infer literal types
- Better autocomplete
- Compile-time checking

---

## 15. Migration Strategy

**For adding new keys in future:**
1. Add to `storage.constants.ts` first
2. Use the constant in code
3. Never hardcode strings

**Example:**
```typescript
// 1. Add to constants
export const STORAGE_KEYS = {
  // ...
  FEATURES: {
    NEW_FEATURE_FLAG: 'feature-new-thing',
  },
};

// 2. Use in code
if (localStorage.getItem(STORAGE_KEYS.FEATURES.NEW_FEATURE_FLAG)) {
  // ...
}
```

---

## 16. Next Steps

1. ✅ Plan document created (this file)
2. ⏳ Spawn Discovery Agent → Find all localStorage usage
3. ⏳ Review findings → Organize into categories
4. ⏳ Spawn Implementation Agent → Create constants + refactor
5. ⏳ Spawn QA Agent → Validate implementation
6. ⏳ Manual review → Final checks
7. ⏳ Commit & update PRD → Mark B.13 complete

---

**Plan Status:** ✅ READY FOR EXECUTION
**Estimated Completion:** 1.5-2 hours from start
**Confidence Level:** High (clear scope, well-understood problem, low risk)
