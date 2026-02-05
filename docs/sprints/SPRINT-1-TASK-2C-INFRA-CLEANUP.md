# Sprint 1 - Task 2C: Infrastructure Cleanup

## Overview
Fix environment variables, update Makefile to use pnpm/Turborepo commands, update Dockerfiles for pnpm, and add a `make setup` command for first-time setup.

**Runs in PARALLEL with Task 2A and Task 2B.**

## Prerequisites
- Stage 1 (Foundation) is complete
- Branch `sprint-1/foundation` exists with Turborepo + pnpm workspace set up
- You are working from the `sprint-1/foundation` branch

## Context: Current Problems

1. **Root `.env`** has `PUBLIC_PORT=5173` and `PUBLIC_HOST=dev.skenzeriq.com` - should default to `5001` and `localhost`
2. **Makefile** uses `npm` commands - should use `pnpm`
3. **Makefile** has redundant/confusing targets (~500 lines)
4. **backend/Dockerfile** uses `npm install` - should use `pnpm install`
5. **frontend/Dockerfile.dev** uses `npm install` - should use `pnpm install`
6. **docker-compose.yml** mounts `./backend:/app` and `./frontend:/app` - these paths stay the same (no directory restructure in this sprint)
7. **No `make setup`** command for first-time development setup
8. **No `.env.example`** at root with proper documentation

## Steps

### Step 1: Create working branch

```bash
git checkout sprint-1/foundation
git checkout -b sprint-1/infra-cleanup
```

### Step 2: Fix root .env

Replace `/home/patchiq/patchiq/.env`:

```bash
# PatchIQ Environment Configuration
# Copy to .env and customize for your environment

# Public-facing address (used by Docker nginx mode only)
PUBLIC_SCHEME=http
PUBLIC_HOST=localhost
PUBLIC_PORT=5001

# JWT secret (change in production!)
JWT_SECRET=dev-jwt-secret-change-in-production
```

### Step 3: Create root .env.example

Create `/home/patchiq/patchiq/.env.example`:

```bash
# PatchIQ Environment Configuration
# Copy this file to .env: cp .env.example .env

# ==========================================
# Public URL (used by Docker full-stack mode)
# ==========================================
# How external clients (agents, browsers) reach this server
PUBLIC_SCHEME=http
PUBLIC_HOST=localhost
PUBLIC_PORT=5001

# ==========================================
# Secrets (CHANGE THESE IN PRODUCTION)
# ==========================================
JWT_SECRET=dev-jwt-secret-change-in-production

# ==========================================
# Infrastructure Port Overrides (optional)
# ==========================================
# Only change these if you have port conflicts on your machine
# POSTGRES_PORT=5432
# REDIS_PORT=6379
# MINIO_PORT=9000
# MINIO_CONSOLE_PORT=9001
```

### Step 4: Create backend/.env.example

Read the current `backend/.env` or `backend/.env.example` to understand all variables. Then create/update `backend/.env.example` with correct defaults:

```bash
# PatchIQ Backend Configuration
# Copy to .env: cp .env.example .env

# Server
NODE_ENV=development
PORT=5002

# Database (matches docker-compose postgres service)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/patchiq_dev

# Redis (matches docker-compose redis service)
REDIS_URL=redis://localhost:6379

# MinIO S3 Storage (matches docker-compose minio service)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=patchiq_admin
MINIO_SECRET_KEY=patchiq_secret_key
MINIO_BUCKET=patches
MINIO_USE_SSL=false
MINIO_PUBLIC_ENDPOINT=localhost
MINIO_PUBLIC_PORT=5001

# Auth
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_ACCESS_TOKEN_EXPIRY=1h
JWT_REFRESH_TOKEN_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173

# Backend public URL (how agents reach this server)
BACKEND_PUBLIC_URL=http://localhost:5001

# Encryption key (32+ characters, CHANGE IN PRODUCTION)
ENCRYPTION_KEY=dev-32-byte-encryption-key-here!!

# Mock services (set to false to use real services)
MOCK_NVD=true
MOCK_EMAIL=true
MOCK_LDAP=true
MOCK_PATCHES=true
```

**Note**: The `CORS_ORIGIN` uses port 5173 (Vite dev server) because in local dev mode, the frontend is accessed directly at localhost:5173, not through nginx.

### Step 5: Update backend/Dockerfile for pnpm

Replace `/home/patchiq/patchiq/backend/Dockerfile`:

```dockerfile
# Base stage
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml ./

# Development stage
FROM base AS development
RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/v3.18/community openssl1.1-compat
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate --schema src/db/prisma/schema.prisma
EXPOSE 5002
CMD ["pnpm", "run", "dev"]

# Build stage
FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/src/db/prisma ./prisma

# Switch to non-root user
USER nodejs

EXPOSE 5002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5002/health || exit 1

CMD ["node", "dist/server.js"]
```

Changes from current:
- Added `corepack enable && corepack prepare pnpm` for pnpm support
- `npm install` -> `pnpm install --frozen-lockfile`
- `npm ci` -> `pnpm install --frozen-lockfile`
- `npm run build` -> `pnpm run build`
- `npm prune --production` -> `pnpm prune --prod`
- `EXPOSE 4002` -> `EXPOSE 5002` (matches actual PORT env var)
- Healthcheck port `4002` -> `5002`
- Copies `pnpm-lock.yaml` instead of `package-lock.json`

### Step 6: Update frontend/Dockerfile.dev for pnpm

Replace `/home/patchiq/patchiq/frontend/Dockerfile.dev`:

```dockerfile
# Frontend Development Dockerfile
# Runs Vite with Hot Module Replacement enabled for Docker

FROM node:20-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install dependencies first for better caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose Vite's port
EXPOSE 5001

# Run Vite dev server with host binding for Docker
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]
```

Changes: `npm install` -> `pnpm install --frozen-lockfile`, copies `pnpm-lock.yaml`.

### Step 7: Update docker-compose.yml

Make these targeted changes to `/home/patchiq/patchiq/docker-compose.yml`:

**a) Add healthcheck to backend** (after the `restart: unless-stopped` line in the backend service):
```yaml
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5002/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

**b) Add healthcheck to frontend** (after `restart: unless-stopped` in frontend service):
```yaml
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5001"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
```

**c) Update nginx to depend on healthy backend/frontend**:
```yaml
  nginx:
    ...
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
      minio:
        condition: service_healthy
```

**d) Add port exposure for dev-services mode** to postgres, redis, and minio. Add `ports` alongside `expose`:
```yaml
  postgres:
    ...
    expose:
      - "5432"
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
```
```yaml
  redis:
    ...
    expose:
      - "6379"
    ports:
      - "${REDIS_PORT:-6379}:6379"
```
```yaml
  minio:
    ...
    expose:
      - "9000"
      - "9001"
    ports:
      - "${MINIO_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
```

This allows both `make dev` (infra only, ports exposed) and `make dev-docker` (nginx mode) to use the same docker-compose.yml. When running full-docker mode with nginx, the exposed ports are still available but nginx is the primary entry point.

### Step 8: Update Makefile

Replace the Makefile with a cleaner version. Read the current Makefile first to understand all targets, then rewrite it.

Key changes:
- Replace `npm` with `pnpm` everywhere
- Replace `cd backend && npm run dev` with `pnpm turbo dev` (for the primary `make dev` target)
- Add `make setup` command
- Simplify dev targets:
  - `make dev` = start infra in Docker + run apps locally via Turborepo
  - `make dev-docker` = full Docker stack (old `make dev` behavior)
  - `make dev-agent` = unchanged
- Keep all database, agent, testing, and validation targets

**New `make dev` target** (primary workflow):
```makefile
dev:
	@echo "$(CYAN)Starting infrastructure services...$(NC)"
	@$(DOCKER_COMPOSE) up -d postgres redis minio
	@echo "$(CYAN)Waiting for services to be healthy...$(NC)"
	@sleep 3
	@echo "$(CYAN)Starting apps with Turborepo (backend + frontend)...$(NC)"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:5002"
	@echo ""
	pnpm turbo dev
```

**Renamed old `make dev`** to `make dev-docker`:
```makefile
dev-docker: preflight
	@echo "$(CYAN)Starting PatchIQ full Docker stack...$(NC)"
	@$(DOCKER_COMPOSE) up -d --remove-orphans
	@echo "$(CYAN)Waiting for services to be healthy...$(NC)"
	@sleep 5
	@docker exec patchiq_backend npx prisma generate --schema src/db/prisma/schema.prisma 2>/dev/null || true
	@docker restart patchiq_backend 2>/dev/null || true
	@sleep 5
	@echo "$(GREEN)Services started at $(PUBLIC_URL)$(NC)"
```

**New `make setup`**:
```makefile
setup:
	@echo "$(CYAN)Setting up PatchIQ development environment...$(NC)"
	@test -f .env || (cp .env.example .env && echo "  Created .env from .env.example")
	@test -f backend/.env || (cp backend/.env.example backend/.env && echo "  Created backend/.env from .env.example")
	@echo "$(CYAN)Installing dependencies...$(NC)"
	pnpm install
	@echo "$(CYAN)Building shared types...$(NC)"
	pnpm --filter @patchiq/shared-types build
	@echo "$(CYAN)Generating Prisma client...$(NC)"
	cd backend && npx prisma generate --schema src/db/prisma/schema.prisma
	@echo ""
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo "  Run 'make dev' to start developing"
```

**Update all npm references to pnpm**:
- `cd backend && npm run dev` -> `cd backend && pnpm run dev`
- `cd frontend && npm run dev` -> `cd frontend && pnpm run dev`
- `cd backend && npm test` -> `cd backend && pnpm test`
- `cd frontend && npm test` -> `cd frontend && pnpm test`
- `cd backend && npm install` -> `pnpm install` (from root)
- `cd frontend && npm install` -> `pnpm install` (from root)

**Update the `install` target**:
```makefile
install:
	@echo "$(CYAN)Installing all dependencies...$(NC)"
	pnpm install
	@echo "$(GREEN)Dependencies installed.$(NC)"
```

**Update the `clean-all` target**:
```makefile
clean-all: clean
	@echo "$(YELLOW)Removing node_modules...$(NC)"
	rm -rf node_modules backend/node_modules frontend/node_modules shared/node_modules
	rm -rf .turbo backend/.turbo frontend/.turbo shared/.turbo
	@echo "$(GREEN)Full cleanup complete.$(NC)"
```

**Update the `check-types` target to use Turborepo**:
```makefile
check-types:
	@echo "$(CYAN)Running type checks...$(NC)"
	pnpm turbo check
	@echo "$(GREEN)Type checks passed$(NC)"
```

**Keep these targets mostly unchanged** (just swap npm->pnpm):
- `db-migrate`, `db-seed`, `db-studio`, `db-reset`
- `agent-build`, `agent-run`, `agent-release`, `dev-agent`
- `logs`, `logs-backend`, `logs-frontend`
- `stop`, `clean`
- `check-health`, `status`
- `api-docs`, `api-endpoints`, `minio-console`

**Update the `dev-services` target** (still useful for running only infra):
```makefile
dev-services:
	@echo "$(CYAN)Starting infrastructure services...$(NC)"
	@$(DOCKER_COMPOSE) up -d postgres redis minio
	@echo "$(GREEN)Infrastructure ready!$(NC)"
	@echo "  PostgreSQL: localhost:$${POSTGRES_PORT:-5432}"
	@echo "  Redis:      localhost:$${REDIS_PORT:-6379}"
	@echo "  MinIO:      localhost:$${MINIO_PORT:-9000} (API), localhost:$${MINIO_CONSOLE_PORT:-9001} (Console)"
	@echo ""
	@echo "Now run: make dev-backend  OR  make dev-frontend  OR  pnpm turbo dev"
```

### Step 9: Update .gitignore

Add to root `.gitignore`:
```
# Turborepo
.turbo/

# pnpm
pnpm-lock.yaml is tracked, but these should be ignored:
# (pnpm-lock.yaml should NOT be in .gitignore - it needs to be committed)

# Shared package build output
shared/dist/
```

Verify that `node_modules/` is already in `.gitignore`.

### Step 10: Verify Docker build

```bash
cd /home/patchiq/patchiq
docker compose build backend
docker compose build frontend
```

Both should build successfully with pnpm.

### Step 11: Verify make dev workflow

```bash
# Start infra
docker compose up -d postgres redis minio

# Check health
docker compose ps  # postgres, redis, minio should be healthy

# Stop
docker compose down
```

### Step 12: Verify make setup

```bash
# Remove .env to test setup
mv backend/.env backend/.env.bak 2>/dev/null || true

# Run setup
make setup

# Verify
test -f backend/.env && echo "OK: backend/.env created"
test -d shared/dist && echo "OK: shared types built"
test -d backend/node_modules/.prisma && echo "OK: Prisma client generated"

# Restore
mv backend/.env.bak backend/.env 2>/dev/null || true
```

### Step 13: Commit

```bash
git add -A
git commit -m "feat(infra): update Makefile/Docker/env for pnpm workspace, add make setup"
```

## Files Modified
- `.env` - Fixed PUBLIC_PORT and PUBLIC_HOST defaults
- `.env.example` - New file with documentation
- `backend/.env.example` - Updated with correct port defaults
- `backend/Dockerfile` - pnpm, correct port (5002)
- `frontend/Dockerfile.dev` - pnpm
- `docker-compose.yml` - Added healthchecks, exposed ports for dev-services mode
- `Makefile` - pnpm commands, turbo integration, make setup, simplified targets
- `.gitignore` - Turborepo and shared/dist entries

## Verification Checklist
- [ ] `make setup` succeeds on a clean checkout (after pnpm install)
- [ ] `docker compose build backend` succeeds
- [ ] `docker compose build frontend` succeeds
- [ ] `docker compose up -d postgres redis minio` starts healthy services
- [ ] `.env` has `PUBLIC_PORT=5001` and `PUBLIC_HOST=localhost`
- [ ] `backend/.env.example` has `PORT=5002` and correct DATABASE_URL
- [ ] Makefile uses `pnpm` everywhere (no `npm` references except in comments)

## DO NOT
- Do NOT modify backend or frontend source code (only infrastructure files)
- Do NOT move directories to apps/ or packages/
- Do NOT modify shared package source files
- Do NOT modify nginx.conf (it stays the same)
- Do NOT change docker-compose service names or network name
- Do NOT remove any Makefile targets - only update and add new ones
