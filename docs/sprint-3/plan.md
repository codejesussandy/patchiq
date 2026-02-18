# PatchIQ v0.1.0 Stabilization Plan — Sprint 3

**Branch**: `dev-0.1.0`
**Goal**: Turn PatchIQ into a stable v0.1.0 baseline with a zero-touch dev pipeline for agent development across Windows, macOS, and Linux.

**Dev Setup**: Backend on `ssh.skenzer.com` (Linux), MacBook for dev + macOS testing, Windows laptop for Windows testing.

---

## Phase 1: Fix Critical Integration Bugs

### 1.1 Single Point Configuration
**Problem**: Services have hardcoded fallback URLs/ports scattered across the codebase. `.env` should be the only file you touch to configure everything.

**Known hardcoded values to eliminate**:
- `agent/cmd/agent/main.go:78` — `http://dev.skenzeriq.com:5173/api` (port 5173 is Vite dev, should be `PUBLIC_PORT`)
- `backend/src/app.ts` — `localhost:5002` fallback for host header
- `frontend/vite.config.ts:39` — `http://localhost:3000` proxy target
- `frontend/vite.config.ts:31-34` — HMR host hardcoded to `localhost`

**Action**: Audit every service (frontend, backend, agent, nginx, docker-compose) and ensure all URLs, ports, and hosts derive from `.env` variables. Zero hardcoded values.

**Files**:
- `.env.example` (source of truth — already good)
- `agent/cmd/agent/main.go`
- `backend/src/app.ts`
- `frontend/vite.config.ts`
- `docker-compose.yml` (verify all vars flow through)
- `nginx.conf` (verify)

### 1.2 Fix Agent ldflags Bug
**Problem**: `agent/cmd/agent/main.go:76` — `defaultServerURL` is a **local variable** inside `main()`. The Makefile's `-X main.defaultServerURL=$(PATCHIQ_SERVER_URL)` ldflags silently does nothing because ldflags can only set **package-level** variables.

**Fix**:
- Add package-level var `var defaultServerURL = ""` next to `version`/`buildDate` (line 28)
- Update `main()` to check: env var → ldflags value → localhost fallback
- Fix help text (line 80) — references port 5173, should match `PUBLIC_PORT`

**Files**: `agent/cmd/agent/main.go`, `Makefile`

### 1.3 Normalize Versions to 0.1.0
**Current mess**:
- `agent/cmd/agent/main.go:29` → `1.2.0`
- `Makefile` (Windows build) → `1.1.0`
- `frontend/package.json` → `0.0.0`
- `backend/package.json` → `1.0.0`
- `shared/package.json` → `1.0.0`

**Fix**: Set all to `0.1.0`. Use a single `VERSION` variable in Makefile that propagates everywhere.

**Files**: `agent/cmd/agent/main.go`, `Makefile`, `frontend/package.json`, `backend/package.json`, `shared/package.json`

---

## Phase 2: Dev Pipeline — Zero-Touch Build-Deploy-Update Cycle

### 2.1 `make agent-dev-push` Target
One command that:
1. Builds agent binary for current platform (~5s)
2. Uploads binary to running backend via `POST /v1/agent-versions/:id/upload`
3. Triggers bulk update command to all connected agents

**Files**: `Makefile`

### 2.2 Bulk Update Endpoint
**What exists**: `createBatchCommands()` in `agents.service.ts` (batch command creation with transactions), `triggerAgentUpdate()` for single agent, full self-update mechanism in agent binary.

**What's missing**: REST endpoint to trigger update on ALL online agents.

**Add**: `POST /v1/agents/bulk-update` — creates `agent_update` command for all agents with status `CONNECTED`. Uses existing `createBatchCommands()` service method.

**Files**:
- `backend/src/modules/agents/agents.controller.ts`
- `backend/src/modules/agents/agents.service.ts`
- `backend/src/modules/agents/agents.routes.ts`
- `backend/src/modules/agents/agents.validators.ts`

### 2.3 Reduce Heartbeat Interval for Dev
Default heartbeat is 300s (5 min) — too slow for dev iteration. Add a dev-mode config or make it easily adjustable.

**What exists**: `agentRefreshCycle` setting in DB (agent config endpoint returns it). Agent reads it from `/api/agent/config`.

**Action**: Set default to 30s for dev via seed data or `.env` override. Agent already respects this value.

**Files**: `backend/src/db/prisma/seed.ts` or agent config settings

### 2.4 Agent Error Dashboard
**What exists**: Agents report errors via heartbeat (`errorMessage` field) and command results (`POST /api/agent/commands/:id/result`). Telemetry submitted to `/api/agent/telemetry`.

**What's missing**: Queryable error aggregation endpoint + frontend UI.

**Add**:
- Backend endpoint: `GET /v1/agents/errors` — aggregated errors across all agents, filterable by agent, time range, severity
- Backend: mark agents "unreachable" after N missed heartbeats (configurable)
- Frontend: error tab under Agents page showing recent errors with filtering

**Files**:
- `backend/src/modules/agents/agents.controller.ts`
- `backend/src/modules/agents/agents.service.ts`
- `backend/src/modules/agents/agents.routes.ts`
- `frontend/src/pages/discovery/Agents.tsx`
- `frontend/src/services/agent.service.ts`
- `frontend/src/hooks/useAgents.ts`

### 2.5 Agent Config Settings UI
**What exists**: Backend has full agent config CRUD (`getAgentConfig()`, `updateAgentConfig()`, `resetAgentConfig()`). Settings stored in DB. No frontend page.

**Add**: Settings page to view/edit agent refresh cycles, telemetry intervals, scan schedules.

**Files**:
- `frontend/src/pages/settings/AgentManagement.tsx` (placeholder exists — implement it)
- `frontend/src/services/settings.service.ts`
- `frontend/src/hooks/` (new hook or extend existing)

### 2.6 Agent Log Upload (Dev-Only)
**Purpose**: Collect agent-side logs remotely so you never need to SSH into endpoint devices to debug. Dev-only feature, remove later.

**Add**:
- Agent: periodically upload local log file to backend (e.g., every heartbeat or on error)
- Backend: `POST /api/agent/logs` endpoint to receive and store log data
- Frontend: view agent logs in agent detail drawer

**Files**:
- `agent/internal/client/` or `agent/internal/backend/` (add log upload)
- `backend/src/modules/agents/agent-api.controller.ts`
- `backend/src/modules/agents/agent-api.routes.ts`
- `frontend/src/pages/discovery/Agents.tsx` (log viewer in detail drawer)

---

## Phase 3: Cross-Platform Installers & Polish

### 3.1 Audit & Fix Existing Installers
**What exists** (in `agent/installer/`):
- **Windows**: WiX `.wxs` files, `Product.wxs`, `patchiq-agent.wxs`, PowerShell installer (`Install-PatchIQAgent.ps1`), MSI build via Docker (`dactiv/wix`), config files, license, batch scripts
- **macOS**: `.pkg` builder (`build-pkg.sh`), `Distribution.xml`, pre/post install scripts, welcome/license/conclusion HTML, uninstall script
- **Linux**: `build.sh`, plus **deb** (`build-deb.sh`) and **rpm** (`build-rpm.sh`, spec file) builders
- **`build-all.sh`**: Orchestrates all platform builds

**Action**: Audit each installer to ensure:
- Server URL comes from config, not hardcoded
- Correct version number (0.1.0)
- Service installation works (systemd on Linux, launchd on macOS, Windows Service)
- Config file paths are correct and documented
- Test each installer on respective platform

**Files**: Everything under `agent/installer/`

### 3.2 SSE Auth Improvement (If Trivial)
**Problem**: `frontend/src/hooks/useNotificationSSE.ts` passes JWT as query parameter because `EventSource` doesn't support custom headers. Minor security concern.

**Fix**: Replace with `fetch` + `ReadableStream` approach that supports `Authorization` header. Only if implementation is straightforward — skip if it introduces complexity.

**Files**: `frontend/src/hooks/useNotificationSSE.ts`, possibly backend SSE endpoint

---

## Phase 4: Validate, Clean & Release

### 4.1 End-to-End Smoke Test
Full cycle on all 3 platforms:
1. Install agent via platform installer (MSI / pkg / deb)
2. Agent registers with backend
3. Trigger inventory collection → verify data appears in dashboard
4. Deploy a test package via Hub → verify agent executes it
5. Run `make agent-dev-push` → verify all agents self-update
6. Inject an error → verify it appears in error dashboard
7. Check agent logs in UI

### 4.2 Type Cleanup
- Consolidate `Agent` (UI type) vs `AgentResponse` (API type) in `frontend/src/types/agent.types.ts`
- Remove phantom fields from `User` type that backend doesn't provide in `frontend/src/types/user.types.ts`
- Audit other type files for similar mismatches

### 4.3 Version Tag & Release
- Verify all components at `0.1.0`
- Run `make check-all` (types + lint + build)
- Run all tests (backend + frontend)
- Tag `v0.1.0`
- Create GitHub release with multi-platform installers (MSI, pkg, deb, rpm, raw binaries)

### 4.4 Document v0.1.0 Baseline
- What works and what's known-limited
- How to set up a new dev environment from scratch
- How to use `make agent-dev-push` pipeline
- How to install agents on each platform

### 4.5 Repo Cleanup
- Archive to `docs/.archive/`: test scripts, old sprint docs not relevant to future, development artifacts, broken CI/CD configs (will redo post-v0.1.0), audit/test reports, temporary files
- Remove from main tree after backup
- Clean up any dead code, unused dependencies, orphaned files
- Goal: clean, minimal repo that only contains what's needed going forward

---

## Summary

| Phase | Focus | Outcome |
|-------|-------|---------|
| 1 | Fix broken integration | Everything connects via `.env`, agent builds work |
| 2 | Dev pipeline | `make agent-dev-push` → agents auto-update → errors visible in dashboard |
| 3 | Installers & polish | One-click install on Windows/macOS/Linux, minor improvements |
| 4 | Validate & release | Smoke tested, cleaned up, tagged v0.1.0 |
