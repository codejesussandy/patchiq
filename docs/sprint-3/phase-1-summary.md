# Phase 1 Summary: Fix Critical Integration Bugs

**Status**: Complete
**Branch**: `dev-0.1.0`
**Date**: 2026-02-18

---

## What Was Done

### 1.1 Single Point Configuration

Eliminated all hardcoded URLs, ports, and hostnames. Every service now derives configuration from `.env`.

| File | Before | After |
|------|--------|-------|
| `agent/cmd/agent/main.go:78` | `http://dev.skenzeriq.com:5173/api` | No fallback — requires env/ldflags/flag |
| `agent/cmd/agent/setup.go:113` | `http://dev.skenzeriq.com:5173/api` | Prompts user, no default |
| `backend/src/app.ts:95` | `localhost:5002` | `localhost:${config.port}` (dynamic) |
| `frontend/vite.config.ts:29` | `['dev.skenzeriq.com', 'ssh.skenzer.com', 'localhost']` | `[process.env.PUBLIC_HOST, 'localhost']` |
| `frontend/vite.config.ts:31` | `host: 'localhost'` | `process.env.HMR_HOST \|\| 'localhost'` |
| `Makefile:496` | `http://localhost:5002` (MinIO console) | `http://localhost:9001` |

New env vars added:
- `HMR_HOST` — controls Vite HMR WebSocket host (`.env.example` + `docker-compose.yml`)
- `PUBLIC_HOST` / `PUBLIC_PORT` — now passed to frontend Docker service

### 1.2 Agent ldflags Bug Fix

`defaultServerURL` was a local variable inside `main()`. The Makefile's `-X main.defaultServerURL=...` ldflags silently did nothing.

**Fix**: Moved to package-level `var defaultServerURL = ""` so ldflags works.

**Server URL resolution order**:
1. `PATCHIQ_SERVER_URL` environment variable
2. Value set via `-X main.defaultServerURL=...` at build time
3. `--server` CLI flag
4. If none set → warns and runs in local-only mode (no silent wrong-server connections)

### 1.3 Version Normalization

All components unified to `0.1.0`:

| File | Before | After |
|------|--------|-------|
| `agent/cmd/agent/main.go` | `1.2.0` | `0.1.0` |
| `Makefile` (Windows builds) | `1.1.0` (hardcoded) | `$(VERSION)` variable |
| `Makefile` (all builds) | No version/buildDate in most targets | All targets include `-X main.version=$(VERSION) -X main.buildDate=...` |
| `frontend/package.json` | `0.0.0` | `0.1.0` |
| `backend/package.json` | `1.0.0` | `0.1.0` |
| `shared/package.json` | `1.0.0` | `0.1.0` |

Single source of truth: `VERSION ?= 0.1.0` in Makefile, propagated via ldflags to all agent builds.

### 1.4 Port Configuration (.env)

Created `.env` for `ssh.skenzer.com` deployment (ports 3001–3010):

| Port | Service |
|------|---------|
| 3001 | Nginx — main entry (frontend + API + proxied services) |
| 3002 | PostgreSQL |
| 3003 | Redis |
| 3004 | pgAdmin |
| 3005 | Prisma Studio |
| 3006 | Agent WebUI |
| 3007 | Backend (direct) |
| 3008 | MinIO S3 API |
| 3009 | MinIO Console |
| 3010 | (spare) |

---

## Files Changed (9 files)

- `agent/cmd/agent/main.go` — package-level `defaultServerURL`, version `0.1.0`, no hardcoded URLs
- `agent/cmd/agent/setup.go` — removed hardcoded setup wizard default
- `backend/src/app.ts` — dynamic OpenAPI fallback host
- `frontend/vite.config.ts` — env-driven `allowedHosts` and HMR host
- `Makefile` — `VERSION` variable, all builds use it, fixed MinIO console port
- `.env.example` — added `HMR_HOST`
- `.env` — created for ssh.skenzer.com (ports 3001–3010)
- `docker-compose.yml` — passes `PUBLIC_HOST`, `PUBLIC_PORT`, `HMR_HOST` to frontend
- `frontend/package.json`, `backend/package.json`, `shared/package.json` — version `0.1.0`

---

## How to Verify

```bash
# No hardcoded URLs/ports remain
grep -r "localhost:5002\|dev.skenzeriq.com:5173" --include="*.go" --include="*.ts" --include="*.json" \
  --exclude-dir=node_modules --exclude="*lock*"

# Agent compiles
cd agent && go build -o /dev/null ./cmd/agent

# Stack starts
make dev

# All type/lint checks pass
make check
```
