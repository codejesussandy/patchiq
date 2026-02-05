# Sprint 1: Monorepo Foundation

## Goal
Set up Turborepo + pnpm workspace, fix the dead shared types package, and wire both backend and frontend to consume it. Fix env vars and update Makefile/Docker for the new setup.

## Execution Plan

```
Stage 1 (Serial - 1 agent)          Stage 2 (Parallel - 3 agents)         Stage 3 (Serial - 1 agent)
========================            ============================           ========================

SPRINT-1-STAGE-1-FOUNDATION  ──┬──> SPRINT-1-TASK-2A-BACKEND-WIRING  ──┐
                                │                                        │
                                ├──> SPRINT-1-TASK-2B-FRONTEND-WIRING ──┼──> SPRINT-1-STAGE-3-VERIFY
                                │                                        │
                                └──> SPRINT-1-TASK-2C-INFRA-CLEANUP  ──┘
```

## Stage 1: Foundation (1 agent, serial)
**Doc**: `SPRINT-1-STAGE-1-FOUNDATION.md`
**Estimated time**: 30-45 minutes
**What**: Initialize root pnpm workspace, Turborepo config, convert npm to pnpm, fix shared types package to build.
**Must complete before Stage 2 can start.**

## Stage 2: Parallel Wiring (3 agents simultaneously)

### Task 2A: Backend Wiring
**Doc**: `SPRINT-1-TASK-2A-BACKEND-WIRING.md`
**Agent focus**: Wire backend to consume `@patchiq/shared-types` package
**Files touched**: `backend/tsconfig.json`, `backend/jest.config.js`, `backend/src/shared/types/`

### Task 2B: Frontend Wiring
**Doc**: `SPRINT-1-TASK-2B-FRONTEND-WIRING.md`
**Agent focus**: Wire frontend to consume `@patchiq/shared-types`, migrate type files
**Files touched**: `frontend/vite.config.ts`, `frontend/tsconfig.app.json`, `frontend/src/types/`

### Task 2C: Infrastructure Cleanup
**Doc**: `SPRINT-1-TASK-2C-INFRA-CLEANUP.md`
**Agent focus**: Fix env vars, update Makefile for pnpm/turbo, update Docker files
**Files touched**: `.env`, `Makefile`, `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile.dev`

## Stage 3: Verification (1 agent, serial)
**Doc**: `SPRINT-1-STAGE-3-VERIFY.md`
**What**: Run `pnpm turbo build`, `pnpm turbo check`, test `make dev` workflow end-to-end. Fix any integration issues.
**Must wait for all Stage 2 tasks to complete.**

## Branch Strategy
- Stage 1: Work on `sprint-1/foundation` branch off `full-dev-local-v2`
- Stage 2A/2B/2C: Each works on their own branch off `sprint-1/foundation`
- Stage 3: Merge all Stage 2 branches, verify, create PR to `full-dev-local`

## Success Criteria
- [ ] `pnpm install` from root installs all workspace dependencies
- [ ] `pnpm turbo build` builds shared → backend → frontend in correct order
- [ ] `pnpm turbo check` passes type checks on all packages
- [ ] Backend can `import type { Patch } from '@patchiq/shared-types'`
- [ ] Frontend can `import type { Patch } from '@patchiq/shared-types'`
- [ ] `make dev` starts infrastructure + apps with hot reload
- [ ] `make dev-docker` starts everything in Docker with nginx
- [ ] No duplicate type definitions between frontend and shared package
