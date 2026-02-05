# Sprint 1 - Task 2B: Wire Frontend to Shared Types

## Overview
Configure the frontend to import types from `@patchiq/shared-types` workspace package. Remove the stale `@shared` Vite alias. Migrate frontend type files to use shared types where possible, keeping view-only types local.

**Runs in PARALLEL with Task 2A and Task 2C.**

## Prerequisites
- Stage 1 (Foundation) is complete
- Branch `sprint-1/foundation` exists with Turborepo + pnpm workspace set up
- `@patchiq/shared-types` package builds successfully (`shared/dist/` exists)
- You are working from the `sprint-1/foundation` branch

## Context: Current Frontend State

**vite.config.ts** (line 9-12):
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@shared': path.resolve(__dirname, '../shared'),  // <-- STALE, points to old structure
  },
},
```

**tsconfig.app.json** (line 21-24, 34):
```json
"paths": {
  "@/*": ["src/*"],
  "@shared/*": ["../shared/*"]   // <-- STALE, not used in actual code
},
"include": ["src", "../shared"]  // <-- includes old shared dir
```

**Frontend type files** (`frontend/src/types/` - 16 files):
These are locally defined types that duplicate what's in the shared package. Some are direct replacements, others are frontend-only view types.

**Current imports in frontend code**: Frontend does NOT actually import from `@shared/*` anywhere. All type imports use relative paths like `../types/patch.types`.

## Steps

### Step 1: Create working branch

```bash
git checkout sprint-1/foundation
git checkout -b sprint-1/frontend-wiring
```

### Step 2: Update vite.config.ts

Remove the `@shared` alias. The `@patchiq/shared-types` package resolves through node_modules automatically (pnpm workspace link).

Replace the resolve.alias section in `frontend/vite.config.ts`:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

Also update the proxy target for local dev (currently points to `http://backend:5002` which only works in Docker). Add a fallback:

```typescript
proxy: {
  '/v1': {
    target: process.env.VITE_BACKEND_URL || 'http://localhost:5002',
    changeOrigin: true,
  },
},
```

### Step 3: Update tsconfig.app.json

Remove the `@shared/*` path and `../shared` include:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

Changes:
- Removed `"@shared/*": ["../shared/*"]` from paths
- Removed `"../shared"` from include array

### Step 4: Analyze which types to migrate vs keep local

Read each file in `frontend/src/types/` and compare with `shared/src/models.ts`, `shared/src/enums.ts`, `shared/src/api.ts`.

**Types to REPLACE with shared imports** (entity/API types that match shared package):
- `patch.types.ts` - Patch model types
- `vulnerability.types.ts` - Vulnerability model types
- `agent.types.ts` - Agent model types
- `asset.types.ts` - Asset, AssetHardware, AssetSoftware types (entity parts)
- `discovery.types.ts` - Discovery model types
- `jobs.types.ts` - Job model types
- `reports.types.ts` - Report model types
- `user.types.ts` - User model type
- `auth.types.ts` - Request/response types (LoginRequest, etc.)

**Types to KEEP LOCAL** (frontend-only view/UI types):
- `dashboard.types.ts` - Dashboard aggregate shapes
- `hub.types.ts` - Hub UI state types
- `network.types.ts` - Network topology visualization
- `peripheral.types.ts` - Peripheral display types
- `security.types.ts` - Security compliance display
- `settings.types.ts` - Settings form types
- `telemetry.types.ts` - Telemetry chart types

### Step 5: Migrate type files (one at a time)

For each type file being replaced, follow this process:

1. **Read the frontend type file** (e.g., `frontend/src/types/patch.types.ts`)
2. **Read the shared equivalent** (e.g., `shared/src/models.ts` - find Patch types)
3. **Compare**: Are the shared types a superset? Do they match the frontend's needs?
4. **Find all imports** of the frontend type file:
   ```bash
   grep -rn "from.*types/patch.types" frontend/src/ --include="*.ts" --include="*.tsx"
   ```
5. **Replace imports**: Change `import type { Patch } from '../types/patch.types'` to `import type { Patch } from '@patchiq/shared-types'`
6. **Handle mismatches**: If the frontend type has extra fields not in shared, either:
   - Add the missing fields to the shared package (if they're API contract fields)
   - Create a local extension: `type FrontendPatch = SharedPatch & { localField: string }`
   - Keep the local type if it's substantially different (mark with TODO comment)
7. **Delete the frontend type file** if all its exports are now from shared
8. **Run type check**: `cd frontend && pnpm run check`

### Step 6: Handle type mismatches carefully

**CRITICAL**: The shared types are derived from the Prisma schema and may not perfectly match what the frontend expects from the API. Common mismatches:

- **Date types**: Prisma uses `Date`, API returns `string` (ISO format). The shared types should use `string` for API contracts. Check `shared/src/models.ts`.
- **Optional vs required**: Database fields may be required but API responses may omit them.
- **Enum casing**: Prisma enums are UPPERCASE, frontend may expect lowercase.

If you find significant mismatches, **do NOT force-fit the types**. Instead:
1. Keep the frontend local type
2. Add a `// TODO: Align with @patchiq/shared-types when API contracts are finalized` comment
3. Document the mismatch in the commit message

### Step 7: Update barrel exports

If any type files were deleted, update any barrel `index.ts` files in the types directory (if one exists).

If there's no `frontend/src/types/index.ts`, that's fine - frontend uses direct file imports.

### Step 8: Verify TypeScript compilation

```bash
cd /home/patchiq/patchiq/frontend
pnpm run check
```

Fix any type errors. Common issues:
- Missing type exports from shared package
- Type incompatibilities (field name or type differences)
- Unused imports after migration

### Step 9: Verify build

```bash
cd /home/patchiq/patchiq/frontend
pnpm run build
```

This runs `tsc -b && vite build`. Both must pass.

### Step 10: Verify from root

```bash
cd /home/patchiq/patchiq
pnpm turbo build
```

### Step 11: Commit

```bash
git add -A
git commit -m "feat(frontend): wire up @patchiq/shared-types, migrate entity types from local definitions"
```

## Files Modified
- `frontend/vite.config.ts` - Removed @shared alias, updated proxy target
- `frontend/tsconfig.app.json` - Removed @shared paths and ../shared include
- `frontend/src/types/*.ts` - Deleted files replaced by shared, kept frontend-only files
- `frontend/src/**/*.ts(x)` - Updated import paths from local types to @patchiq/shared-types

## Verification Checklist
- [ ] `cd frontend && pnpm run check` passes
- [ ] `cd frontend && pnpm run build` passes
- [ ] No `@shared` alias references remain in vite.config.ts or tsconfig.app.json
- [ ] Frontend can `import type { Patch } from '@patchiq/shared-types'`
- [ ] Local-only type files (dashboard, hub, network, etc.) still exist and work
- [ ] `pnpm turbo build` succeeds from root
- [ ] No runtime errors when loading the frontend in browser (manual check if possible)

## DO NOT
- Do NOT modify backend files
- Do NOT modify docker-compose.yml or Makefile
- Do NOT modify the shared package itself (if types are missing, document it as a TODO)
- Do NOT change any component logic or service code (only import paths)
- Do NOT remove types that have frontend-specific fields not in the shared package
- Do NOT force type compatibility - if it doesn't match, keep the local type with a TODO comment
