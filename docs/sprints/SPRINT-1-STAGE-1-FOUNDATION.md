# Sprint 1 - Stage 1: Foundation Setup

## Overview
Initialize pnpm workspace with Turborepo at root level, convert existing npm packages to pnpm, and fix the shared types package so it builds and produces consumable output.

**This task MUST complete before Stage 2 tasks can start.**

## Prerequisites
- Node.js 20+ installed
- pnpm installed (`npm install -g pnpm@9`)
- Working directory: `/home/patchiq/patchiq` (repo root)
- Current branch: `full-dev-local-v2`

## Context: Current State
- No root `package.json` exists
- `backend/` uses npm with `package-lock.json`
- `frontend/` uses npm with `package-lock.json`
- `shared/` has a `package.json` named `@patchiq/shared-types` but:
  - `tsconfig.json` rootDir is `./types` and source files are in `types/` subdirectory
  - Has never been built (no `dist/` directory)
  - Nobody imports from it
- Backend TypeScript version: `^5.3.3`
- Frontend TypeScript version: `~5.9.3`
- Shared TypeScript version: `^5.3.3`

## Steps

### Step 1: Create root package.json

Create `/home/patchiq/patchiq/package.json`:

```json
{
  "name": "patchiq",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "check": "turbo check",
    "test": "turbo test",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

### Step 2: Create pnpm workspace config

Create `/home/patchiq/patchiq/pnpm-workspace.yaml`:

```yaml
packages:
  - "backend"
  - "frontend"
  - "shared"
```

**Note**: We keep current directory names (backend/, frontend/, shared/) - NOT apps/ + packages/. The restructure to apps/packages is a separate sprint to reduce risk.

### Step 3: Create Turborepo config

Create `/home/patchiq/patchiq/turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "clean": {
      "cache": false
    }
  }
}
```

Key: `"dependsOn": ["^build"]` means before backend/frontend can build/dev/lint, the shared package builds first automatically.

### Step 4: Create .npmrc

Create `/home/patchiq/patchiq/.npmrc`:

```
shamefully-hoist=true
```

This is needed because some packages (Prisma, Ant Design) rely on hoisted dependencies.

### Step 5: Convert backend from npm to pnpm

```bash
cd /home/patchiq/patchiq/backend
pnpm import          # converts package-lock.json to pnpm-lock.yaml
rm package-lock.json
```

Verify `backend/pnpm-lock.yaml` was created. Do NOT run `pnpm install` yet.

### Step 6: Convert frontend from npm to pnpm

```bash
cd /home/patchiq/patchiq/frontend
pnpm import          # converts package-lock.json to pnpm-lock.yaml
rm package-lock.json
```

Verify `frontend/pnpm-lock.yaml` was created.

### Step 7: Fix shared types package structure

The shared package currently has source files in `types/` with tsconfig rootDir pointing there. Restructure to use `src/` convention:

```bash
cd /home/patchiq/patchiq/shared
mkdir -p src
# Move type files from types/ to src/
mv types/index.ts src/index.ts
mv types/api.ts src/api.ts
mv types/enums.ts src/enums.ts
mv types/models.ts src/models.ts
```

### Step 8: Update shared/tsconfig.json

Replace `/home/patchiq/patchiq/shared/tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Changes from current:
- `rootDir`: `./types` -> `./src`
- `include`: `types/**/*` -> `src/**/*`
- `target`: `ES2020` -> `ES2022` (match backend)
- `module`: stays `ESNext`
- `moduleResolution`: stays `bundler`

### Step 9: Update shared/package.json

Replace `/home/patchiq/patchiq/shared/package.json` with:

```json
{
  "name": "@patchiq/shared-types",
  "version": "1.0.0",
  "description": "Shared TypeScript types for PatchIQ platform",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "check": "tsc --noEmit"
  },
  "license": "PROPRIETARY",
  "devDependencies": {
    "typescript": "~5.9.3"
  },
  "files": [
    "dist"
  ]
}
```

Changes from current:
- Added `"private": true` (workspace package, not published)
- Added `"exports"` field for modern resolution
- Added `"dev"` and `"clean"` and `"check"` scripts
- Updated TypeScript version to match frontend (`~5.9.3`)
- Removed `"types"` from files array (dist has .d.ts files)

### Step 10: Add workspace dependencies

Add `@patchiq/shared-types` as a dependency to both apps.

In `backend/package.json`, add to `"dependencies"`:
```json
"@patchiq/shared-types": "workspace:*"
```

In `frontend/package.json`, add to `"dependencies"`:
```json
"@patchiq/shared-types": "workspace:*"
```

### Step 11: Add Turborepo scripts to backend

In `backend/package.json`, add/update scripts:
```json
"check": "tsc --noEmit",
"clean": "rm -rf dist"
```

The `"build"`, `"dev"`, `"lint"`, `"test"` scripts already exist and work.

### Step 12: Add Turborepo scripts to frontend

In `frontend/package.json`, add/update scripts:
```json
"check": "tsc --noEmit",
"clean": "rm -rf dist"
```

The `"build"`, `"dev"`, `"lint"` scripts already exist.

### Step 13: Delete old node_modules and install fresh

```bash
cd /home/patchiq/patchiq
rm -rf backend/node_modules frontend/node_modules shared/node_modules
pnpm install
```

This installs all workspace dependencies and links `@patchiq/shared-types` to the shared package.

### Step 14: Build shared types package

```bash
cd /home/patchiq/patchiq
pnpm --filter @patchiq/shared-types build
```

Verify:
- `shared/dist/index.js` exists
- `shared/dist/index.d.ts` exists
- `shared/dist/api.js` and `shared/dist/api.d.ts` exist
- `shared/dist/enums.js` and `shared/dist/enums.d.ts` exist
- `shared/dist/models.js` and `shared/dist/models.d.ts` exist

### Step 15: Verify Turborepo orchestration

```bash
cd /home/patchiq/patchiq
pnpm turbo build
```

Expected: Turborepo builds shared first, then backend and frontend in parallel. All should succeed.

If frontend build fails with TypeScript errors (likely due to `@shared` alias pointing to `../shared` which has been restructured), that's expected and will be fixed in Stage 2 Task 2B. The important thing is that the shared package and backend build.

### Step 16: Add .gitignore entries

Add to root `.gitignore`:
```
# Turborepo
.turbo/

# pnpm
node_modules/
```

Add to `shared/.gitignore` (create if doesn't exist):
```
dist/
node_modules/
```

### Step 17: Commit checkpoint

Create a git branch and commit:
```bash
git checkout -b sprint-1/foundation
git add -A
git commit -m "feat: initialize pnpm workspace with Turborepo and fix shared types package"
```

## Verification Checklist
- [ ] Root `package.json`, `turbo.json`, `pnpm-workspace.yaml` exist
- [ ] `pnpm install` from root succeeds
- [ ] `shared/dist/` contains compiled JS + declaration files
- [ ] `pnpm turbo build --filter=@patchiq/shared-types` succeeds
- [ ] `node_modules/@patchiq/shared-types` is symlinked to `shared/`
- [ ] Backend can resolve `@patchiq/shared-types` in node_modules

## DO NOT
- Do NOT move directories to `apps/` or `packages/` (that's a future sprint)
- Do NOT change any imports in backend or frontend source files (Stage 2 handles that)
- Do NOT modify docker-compose.yml or Makefile (Stage 2C handles that)
- Do NOT modify vite.config.ts or backend tsconfig (Stage 2A/2B handle that)
- Do NOT delete any existing type files in frontend/src/types/
