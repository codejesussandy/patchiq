# Sprint 1: Known Issues

## Pre-existing Issues (not introduced by sprint)

### Lint errors
- **Backend**: 46 eslint errors, 223 warnings (mostly `no-console`, `no-explicit-any`, `no-unused-vars`)
- **Frontend**: 313 eslint errors, 66 warnings (mostly `no-explicit-any`, `no-unused-vars`, react-hooks rules)
- Lint was never passing before sprint 1. These should be addressed in a dedicated cleanup sprint.

### Unit test failures
- `cpe-mapping.service.test.ts`: 3 tests fail because they require a database connection (should be mocked or moved to integration tests)
- Integration tests require a running database at `localhost:5432`

### Turbo daemon scope caching
- Turbo daemon can cache stale package scope, causing only a subset of packages to build
- Workaround: Use `--no-daemon` flag or run `turbo daemon stop` before builds
- Root cause appears to be a turbo 2.8.x bug with workspace detection

## Issues Fixed During Sprint

### Frontend `.dockerignore` missing
- Host `node_modules/` was being copied into Docker container via `COPY . .`, overwriting container's pnpm-installed dependencies
- Fixed by adding `frontend/.dockerignore` with `node_modules`, `dist`, `.turbo`

### Frontend missing `dayjs` direct dependency
- `dayjs` was imported in several components but only available as a transitive dependency through `antd`
- In standalone Docker builds (without workspace), `dayjs` was missing
- Fixed by adding `dayjs` as a direct dependency in `frontend/package.json`

### Docker healthcheck IPv6 resolution
- `wget` in Alpine resolves `localhost` to `[::1]` (IPv6) but Node.js servers bind to `127.0.0.1` (IPv4)
- Changed healthcheck URLs from `http://localhost:PORT` to `http://127.0.0.1:PORT`

### Backend healthcheck start period too short
- ts-node compilation in dev mode takes 20-30 seconds
- Increased backend healthcheck `start_period` from 15s to 40s and `retries` from 5 to 10

### Makefile Prisma check for pnpm
- `make setup` verification checked `backend/node_modules/.prisma` which doesn't exist with pnpm hoisting
- Fixed to also check `node_modules/.pnpm/@prisma+client*/node_modules/.prisma`

### pnpm version mismatch in Docker
- Corepack in Docker containers was downloading pnpm 10.x instead of project's 9.15.0
- pnpm 10 ignores build scripts by default (breaking esbuild)
- Fixed by pinning `corepack prepare pnpm@9.15.0 --activate` in Dockerfiles
