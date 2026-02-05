# Sprint 1 - Stage 3: Integration Verification

## Overview
Merge all Stage 2 branches, resolve any conflicts, and verify the entire system works end-to-end. Fix any integration issues that arose from parallel development.

**Must wait for ALL Stage 2 tasks (2A, 2B, 2C) to complete.**

## Prerequisites
- All Stage 2 branches exist and are individually passing their verification checklists:
  - `sprint-1/backend-wiring` (Task 2A)
  - `sprint-1/frontend-wiring` (Task 2B)
  - `sprint-1/infra-cleanup` (Task 2C)

## Steps

### Step 1: Create integration branch and merge

```bash
git checkout sprint-1/foundation
git checkout -b sprint-1/integration

# Merge each Stage 2 branch
git merge sprint-1/backend-wiring --no-edit
git merge sprint-1/frontend-wiring --no-edit
git merge sprint-1/infra-cleanup --no-edit
```

If there are merge conflicts:
- `package.json` conflicts: Ensure both `@patchiq/shared-types` dependency AND pnpm scripts are present
- `.gitignore` conflicts: Include all entries from both branches
- Other conflicts: Resolve by keeping changes from both branches (they should be in different files)

### Step 2: Fresh install

```bash
cd /home/patchiq/patchiq
rm -rf node_modules backend/node_modules frontend/node_modules shared/node_modules shared/dist
pnpm install
```

### Step 3: Build shared types first

```bash
pnpm --filter @patchiq/shared-types build
```

Verify `shared/dist/` contains:
- `index.js` + `index.d.ts`
- `api.js` + `api.d.ts`
- `enums.js` + `enums.d.ts`
- `models.js` + `models.d.ts`

### Step 4: Full Turborepo build

```bash
pnpm turbo build
```

Expected: Builds in order: shared -> (backend, frontend in parallel)

**If backend build fails:**
- Check `backend/src/shared/types/index.ts` re-exports don't conflict with internal types
- Check jest.config.js moduleNameMapper is correct
- Run `cd backend && pnpm run check` for specific errors

**If frontend build fails:**
- Check `frontend/tsconfig.app.json` doesn't reference `../shared` anymore
- Check `frontend/vite.config.ts` doesn't have `@shared` alias
- Check that migrated type imports use `@patchiq/shared-types` package name
- Run `cd frontend && pnpm run check` for specific errors

### Step 5: Type checking

```bash
pnpm turbo check
```

This runs `tsc --noEmit` on all packages. Fix any type errors.

### Step 6: Lint checking

```bash
cd /home/patchiq/patchiq/frontend && pnpm run lint
cd /home/patchiq/patchiq/backend && pnpm run lint
```

Fix any lint errors introduced by the changes.

### Step 7: Backend tests

```bash
cd /home/patchiq/patchiq/backend
pnpm test
```

If tests fail:
- Check jest.config.js moduleNameMapper for @patchiq/shared-types
- Ensure shared/dist/ exists (jest resolves from there)
- Check that re-exports in backend/src/shared/types/index.ts don't break existing imports

### Step 8: Verify Docker builds

```bash
cd /home/patchiq/patchiq
docker compose build backend frontend
```

Both containers should build with pnpm.

### Step 9: Test make setup

```bash
# Simulate fresh checkout
rm -rf node_modules backend/node_modules frontend/node_modules shared/node_modules shared/dist

make setup
```

Should succeed and leave the repo in a buildable state.

### Step 10: Test make dev workflow (local mode)

```bash
# Start infrastructure
docker compose up -d postgres redis minio

# Wait for health
sleep 5
docker compose ps  # Verify postgres, redis, minio are healthy

# Run Turborepo dev (Ctrl+C to stop)
pnpm turbo dev
# Verify:
#   - Backend starts on localhost:5002 (check http://localhost:5002/health)
#   - Frontend starts on localhost:5173 (or whatever Vite reports)
#   - Frontend can proxy to backend (open browser, check network tab)

# Stop
docker compose down
```

### Step 11: Test make dev-docker workflow (full Docker mode)

```bash
make dev-docker

# Wait for services
sleep 15

# Verify
curl -s http://localhost:5001/health  # Backend via nginx
curl -s http://localhost:5001/        # Frontend via nginx

make stop
```

### Step 12: Final commit and PR

```bash
git add -A
git commit -m "feat: complete Sprint 1 - Turborepo monorepo with shared types

- Initialize pnpm workspace with Turborepo orchestration
- Fix @patchiq/shared-types package to build and produce declarations
- Wire backend to consume shared types via re-exports
- Wire frontend to consume shared types, migrate entity types
- Update Makefile for pnpm/turbo workflow with 'make setup'
- Update Dockerfiles for pnpm
- Add healthchecks to backend/frontend containers
- Fix .env defaults (PUBLIC_PORT=5001, PUBLIC_HOST=localhost)"
```

Create PR:
```bash
git push -u origin sprint-1/integration
gh pr create --base full-dev-local --title "Sprint 1: Monorepo Foundation with Turborepo + Shared Types" --body "..."
```

## Final Verification Checklist

### Workspace
- [ ] `pnpm install` from root succeeds
- [ ] `pnpm turbo build` builds shared → backend → frontend in order
- [ ] `pnpm turbo check` passes all type checks
- [ ] `pnpm turbo dev` starts both backend and frontend

### Shared Types
- [ ] `shared/dist/` contains compiled JS + declaration files
- [ ] Backend: `import type { X } from '@patchiq/shared-types'` works
- [ ] Frontend: `import type { X } from '@patchiq/shared-types'` works
- [ ] Backend: Existing `import { X } from '@shared/types'` still works via re-exports
- [ ] No duplicate type definitions between frontend/src/types/ and shared package

### Infrastructure
- [ ] `make setup` works on clean checkout
- [ ] `make dev` starts infra + Turborepo dev
- [ ] `make dev-docker` starts full Docker stack with nginx
- [ ] `.env` has correct defaults (PUBLIC_PORT=5001)
- [ ] Docker builds succeed with pnpm
- [ ] Backend healthcheck works in Docker
- [ ] Frontend healthcheck works in Docker

### Tests
- [ ] `cd backend && pnpm test` passes
- [ ] Frontend builds without errors
- [ ] No TypeScript errors in any package

## Known Issues to Document
If any of these remain after this sprint, add them to a `docs/sprints/SPRINT-1-KNOWN-ISSUES.md`:
- Type mismatches between shared package and actual API responses
- Frontend type files that couldn't be migrated (with TODO comments)
- Any test failures unrelated to the sprint changes
