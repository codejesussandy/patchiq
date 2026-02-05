# Sprint 1 - Task 2A: Wire Backend to Shared Types

## Overview
Configure the backend to import types from `@patchiq/shared-types` workspace package. Create re-exports in the backend's internal `@shared/types` so existing imports continue working. Add moduleNameMapper for Jest.

**Runs in PARALLEL with Task 2B and Task 2C.**

## Prerequisites
- Stage 1 (Foundation) is complete
- Branch `sprint-1/foundation` exists with Turborepo + pnpm workspace set up
- `@patchiq/shared-types` package builds successfully (`shared/dist/` exists)
- You are working from the `sprint-1/foundation` branch

## Context: Current Backend State
- Path aliases defined in `backend/tsconfig.json`:
  ```
  "@shared/*" -> "src/shared/*"    (INTERNAL shared dir, NOT the workspace package)
  "@modules/*" -> "src/modules/*"
  "@config/*" -> "src/config/*"
  "@middleware/*" -> "src/middleware/*"
  "@db/*" -> "src/db/*"
  ```
- Internal shared types at `backend/src/shared/types/`:
  - `common.ts` - PaginationParams, FilterParams, etc.
  - `api.types.ts` - ApiResponse, ApiError types
  - `express.d.ts` - Express Request augmentation (req.user, req.agentId)
  - `index.ts` - barrel exports
- The workspace package `@patchiq/shared-types` exports models, enums, and API types
- Jest uses `moduleNameMapper` to resolve path aliases (in `backend/jest.config.js`)

## Steps

### Step 1: Create working branch

```bash
git checkout sprint-1/foundation
git checkout -b sprint-1/backend-wiring
```

### Step 2: Update jest.config.js

Add `@patchiq/shared-types` to the `moduleNameMapper` in `backend/jest.config.js`.

In the `sharedConfig` object, add this entry to `moduleNameMapper` (add it as the FIRST entry, before the existing path aliases):

```javascript
'^@patchiq/shared-types$': '<rootDir>/../shared/dist/index.js',
'^@patchiq/shared-types/(.*)$': '<rootDir>/../shared/dist/$1',
```

The full `moduleNameMapper` should look like:
```javascript
moduleNameMapper: {
  '^@patchiq/shared-types$': '<rootDir>/../shared/dist/index.js',
  '^@patchiq/shared-types/(.*)$': '<rootDir>/../shared/dist/$1',
  '^@scalar/express-api-reference$': '<rootDir>/tests/mocks/scalarMock.js',
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  '^@config/(.*)$': '<rootDir>/src/config/$1',
  '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
  '^@db/(.*)$': '<rootDir>/src/db/$1'
},
```

### Step 3: Update backend/src/shared/types/index.ts

Read the current file first to understand what's exported. Then add re-exports from the shared package so that both import paths work:

```typescript
// Re-export shared platform types
// This allows existing `import { X } from '@shared/types'` to continue working
// while also making shared types available via `import { X } from '@patchiq/shared-types'`
export type * from '@patchiq/shared-types';

// Backend-internal types (not in shared package)
export * from './common';
export * from './api.types';
```

**IMPORTANT**: Read the current `backend/src/shared/types/index.ts` first. If it already exports types that would conflict with `@patchiq/shared-types` (same type name, different definition), you need to handle the conflict:
- If the shared package version is more complete/correct, remove the backend-local definition and use the re-export
- If the backend version has backend-specific fields, keep it and don't re-export the conflicting type from shared

### Step 4: Check for type name conflicts

Read these files and compare exported type names:
- `shared/src/models.ts` - all model types
- `shared/src/enums.ts` - all enum types
- `shared/src/api.ts` - API types like ApiResponse, PaginatedResponse
- `backend/src/shared/types/common.ts` - PaginationParams, FilterParams, etc.
- `backend/src/shared/types/api.types.ts` - ApiResponse, etc.

If `ApiResponse` is defined in both `shared/src/api.ts` AND `backend/src/shared/types/api.types.ts`, check if they're compatible. If compatible, remove the backend one and use the shared re-export. If different, rename the backend one (e.g., `BackendApiResponse`) or keep the backend one and skip re-exporting the conflicting type.

### Step 5: Add a test import

Create or update a test file to verify the import works. Create `backend/tests/unit/shared-types.test.ts`:

```typescript
import type { Agent, Asset, Patch, Vulnerability } from '@patchiq/shared-types';

describe('shared types', () => {
  it('should be importable from @patchiq/shared-types', () => {
    // Type-only test - if this file compiles, the imports work
    const agentShape: Partial<Agent> = {};
    const assetShape: Partial<Asset> = {};
    const patchShape: Partial<Patch> = {};
    const vulnShape: Partial<Vulnerability> = {};

    expect(agentShape).toBeDefined();
    expect(assetShape).toBeDefined();
    expect(patchShape).toBeDefined();
    expect(vulnShape).toBeDefined();
  });
});
```

**Note**: The exact type names depend on what's exported from `shared/src/models.ts`. Read that file first and use actual exported type names.

### Step 6: Verify TypeScript compilation

```bash
cd /home/patchiq/patchiq/backend
pnpm run check
```

This runs `tsc --noEmit`. Fix any type errors that appear. Common issues:
- Duplicate type definitions (resolved in Step 4)
- Missing types in shared package (add them or keep backend-local ones)

### Step 7: Verify Jest works

```bash
cd /home/patchiq/patchiq/backend
pnpm test -- tests/unit/shared-types.test.ts
```

If Jest can't resolve `@patchiq/shared-types`, verify:
1. The moduleNameMapper in jest.config.js points to `<rootDir>/../shared/dist/index.js`
2. The shared package has been built (`shared/dist/index.js` exists)
3. The path is correct (remember working directory is `backend/`, so `../shared/` is correct)

### Step 8: Verify full build

```bash
cd /home/patchiq/patchiq
pnpm turbo build
```

All three packages should build successfully.

### Step 9: Commit

```bash
git add -A
git commit -m "feat(backend): wire up @patchiq/shared-types workspace package"
```

## Files Modified
- `backend/jest.config.js` - Added moduleNameMapper for @patchiq/shared-types
- `backend/src/shared/types/index.ts` - Added re-exports from shared package
- `backend/src/shared/types/common.ts` - Possibly removed duplicate types
- `backend/src/shared/types/api.types.ts` - Possibly removed duplicate types
- `backend/tests/unit/shared-types.test.ts` - New test file

## Verification Checklist
- [ ] `cd backend && pnpm run check` passes (TypeScript compilation)
- [ ] `cd backend && pnpm test -- tests/unit/shared-types.test.ts` passes
- [ ] Backend code can use `import type { X } from '@patchiq/shared-types'`
- [ ] Existing `import { X } from '@shared/types'` still works (re-exports)
- [ ] `pnpm turbo build` succeeds from root

## DO NOT
- Do NOT change backend path aliases (`@shared/*` stays pointing at `src/shared/*`)
- Do NOT modify any module service/controller files (only types infrastructure)
- Do NOT change docker-compose.yml or Makefile
- Do NOT modify frontend files
- Do NOT delete backend-internal types that are backend-specific (express.d.ts, TokenPayload, etc.)
