# PatchIQ Development Makefile
# ============================
# Run `make help` to see all available commands
#
# Configuration: Set PUBLIC_HOST, PUBLIC_PORT, PUBLIC_SCHEME in .env
# See .env.example for details.

.PHONY: help setup dev dev-docker dev-fresh dev-services dev-backend dev-frontend dev-agent stop clean logs logs-backend logs-frontend db-migrate db-seed db-studio db-reset agent-build agent-run agent-install-air test test-backend test-frontend check check-types check-lint check-build check-health check-all install status minio-console api-docs api-endpoints dev-all clean-all preflight

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
CYAN := \033[0;36m
RED := \033[0;31m
NC := \033[0m # No Color

# Load .env if it exists (for PUBLIC_HOST, PUBLIC_PORT, PUBLIC_SCHEME)
-include .env
export

# Derived public URL
PUBLIC_SCHEME ?= http
PUBLIC_HOST ?= localhost
PUBLIC_PORT ?= 5001
PUBLIC_URL := $(PUBLIC_SCHEME)://$(PUBLIC_HOST):$(PUBLIC_PORT)

# Use docker compose v2 (with space) - check if it works, else fall back to docker-compose
DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# Default target
help:
	@echo ""
	@echo "$(CYAN)PatchIQ Development Commands$(NC)"
	@echo "=============================="
	@echo "  Public URL: $(GREEN)$(PUBLIC_URL)$(NC)"
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  make setup            - First-time onboarding (env files, deps, prisma)"
	@echo "  make dev              - Start infra in Docker, backend + frontend via Turbo"
	@echo "  make dev-docker       - Start full stack in Docker (nginx reverse proxy)"
	@echo "  make dev-fresh        - Full reset: stop all, remove containers, start fresh"
	@echo "  make dev-all          - Start everything including agent with hot reload"
	@echo "  make stop             - Stop all Docker services"
	@echo ""
	@echo "$(GREEN)Individual Services:$(NC)"
	@echo "  make dev-services     - Start infrastructure only (DB, Redis, MinIO) for local dev"
	@echo "  make dev-backend      - Start backend locally (with hot reload)"
	@echo "  make dev-frontend     - Start frontend locally (with HMR)"
	@echo "  make dev-agent        - Start agent with hot reload (requires Air)"
	@echo ""
	@echo "$(GREEN)Note:$(NC) 'make dev' uses nginx reverse proxy on port $(PUBLIC_PORT)"
	@echo "      'make dev-services' is for running backend/frontend outside Docker"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make db-migrate       - Run database migrations"
	@echo "  make db-seed          - Seed database with sample data"
	@echo "  make db-studio        - Open Prisma Studio GUI"
	@echo "  make db-reset         - Reset database (drop + migrate + seed)"
	@echo ""
	@echo "$(GREEN)Agent:$(NC)"
	@echo "  make agent-build      - Build agent binary"
	@echo "  make agent-run        - Run agent (no hot reload)"
	@echo "  make agent-install-air - Install Air for Go hot reload"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test             - Run all tests"
	@echo "  make test-backend     - Run backend tests"
	@echo "  make test-frontend    - Run frontend Playwright tests"
	@echo ""
	@echo "$(GREEN)Logs & Monitoring:$(NC)"
	@echo "  make logs             - Tail all Docker logs"
	@echo "  make logs-backend     - Tail backend logs"
	@echo "  make logs-frontend    - Tail frontend logs"
	@echo ""
	@echo "$(GREEN)API & Debug Tools:$(NC)"
	@echo "  make db-studio        - Open Prisma Studio (DB GUI)"
	@echo "  make minio-console    - Open MinIO Console info"
	@echo "  make api-docs         - Open Scalar API docs (interactive)"
	@echo "  make api-endpoints    - Show all API endpoints (text)"
	@echo ""
	@echo "$(GREEN)Validation:$(NC)"
	@echo "  make check            - Quick validation (types + lint)"
	@echo "  make check-types      - TypeScript type checking only"
	@echo "  make check-build      - Full build check (backend + frontend + agent)"
	@echo "  make check-health     - Check if services are responding"
	@echo "  make check-all        - Full validation (types + lint + build)"
	@echo ""
	@echo "$(GREEN)Cleanup:$(NC)"
	@echo "  make clean            - Stop services and remove volumes"
	@echo "  make clean-all        - Full cleanup including node_modules"
	@echo ""

# ===================
# Development Targets
# ===================

# Pre-flight checks - kill conflicting processes and clean orphan containers
preflight:
	@echo "$(CYAN)Running pre-flight checks...$(NC)"
	@# Kill processes on ports that Docker needs
	@lsof -ti :5002 2>/dev/null | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(PUBLIC_PORT) 2>/dev/null | xargs kill -9 2>/dev/null || true
	@# Remove orphan patchiq containers
	@docker ps -aq --filter "name=patchiq" 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
	@echo "$(GREEN)Pre-flight checks complete$(NC)"

# Start infra in Docker, then run backend + frontend via Turborepo
dev: preflight
	@echo "$(CYAN)Starting infrastructure services...$(NC)"
	@$(DOCKER_COMPOSE) up -d postgres redis minio
	@echo "$(CYAN)Waiting for services to be healthy...$(NC)"
	@sleep 3
	@echo ""
	@echo "$(GREEN)Infrastructure ready! Starting backend + frontend via Turbo...$(NC)"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:5002"
	@echo ""
	pnpm turbo dev

# Start full stack with Docker and nginx reverse proxy
dev-docker: preflight
	@echo "$(CYAN)Starting PatchIQ development stack...$(NC)"
	@$(DOCKER_COMPOSE) up -d --remove-orphans
	@echo ""
	@echo "$(CYAN)Waiting for services to be healthy...$(NC)"
	@sleep 5
	@# Ensure Prisma client is up to date in backend container
	@docker exec patchiq_backend npx prisma generate --schema src/db/prisma/schema.prisma 2>/dev/null || true
	@# Restart backend to pick up regenerated client
	@docker restart patchiq_backend 2>/dev/null || true
	@sleep 5
	@echo ""
	@echo "$(GREEN)Services started!$(NC)"
	@echo ""
	@echo "  $(CYAN)All services accessible via single port $(PUBLIC_PORT):$(NC)"
	@echo "    Frontend:      $(PUBLIC_URL)"
	@echo "    API:           $(PUBLIC_URL)/v1"
	@echo "    API Docs:      $(PUBLIC_URL)/api-docs"
	@echo "    Prisma Studio: $(PUBLIC_URL)/prisma/"
	@echo "    pgAdmin:       $(PUBLIC_URL)/pgadmin/"
	@echo "    MinIO Console: $(PUBLIC_URL)/minio/"
	@echo ""
	@echo "  Login: admin@patchiq.io / admin123"
	@echo ""
	@echo "  Agent: make agent-run  (connects to $(PUBLIC_URL)/api)"
	@echo ""
	@echo "  $(YELLOW)Note: Only port $(PUBLIC_PORT) is exposed. All services go through nginx.$(NC)"
	@echo ""
	@echo "Use 'make logs' to watch logs, 'make stop' to stop services"

# Full fresh start - stop everything, remove containers, start clean
dev-fresh:
	@echo "$(YELLOW)Performing full fresh start...$(NC)"
	@$(DOCKER_COMPOSE) down --remove-orphans 2>/dev/null || true
	@docker ps -aq --filter "name=patchiq" 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
	@lsof -ti :5002 2>/dev/null | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(PUBLIC_PORT) 2>/dev/null | xargs kill -9 2>/dev/null || true
	@echo "$(CYAN)Starting fresh...$(NC)"
	@$(DOCKER_COMPOSE) up -d --build --remove-orphans
	@echo ""
	@echo "$(CYAN)Waiting for services to be healthy...$(NC)"
	@sleep 10
	@# Regenerate Prisma client and restart backend
	@docker exec patchiq_backend npx prisma generate --schema src/db/prisma/schema.prisma 2>/dev/null || true
	@docker restart patchiq_backend 2>/dev/null || true
	@sleep 5
	@echo ""
	@echo "$(GREEN)Fresh start complete!$(NC)"
	@echo "  Frontend: $(PUBLIC_URL)"
	@echo "  API:      $(PUBLIC_URL)/v1"
	@echo ""
	@echo "  Login: admin@patchiq.io / admin123"

# Start everything including agent (Docker mode)
dev-all: dev-docker
	@echo ""
	@echo "$(CYAN)Starting agent...$(NC)"
	@cd agent && go build -o patchify-agent ./cmd/agent 2>/dev/null || true
	@echo "Run 'make dev-agent' in a separate terminal for hot reload"
	@echo "Or run 'make agent-run' to start agent without hot reload"

# Start only infrastructure services (for local backend/frontend development)
dev-services:
	@echo "$(CYAN)Starting infrastructure services (DB, Redis, MinIO, pgAdmin)...$(NC)"
	@$(DOCKER_COMPOSE) up -d postgres redis minio pgadmin
	@echo "$(GREEN)Infrastructure ready!$(NC)"
	@echo "  PostgreSQL:    localhost:$${POSTGRES_PORT:-5432}"
	@echo "  Redis:         localhost:$${REDIS_PORT:-6379}"
	@echo "  MinIO:         localhost:$${MINIO_PORT:-9000} (API), localhost:$${MINIO_CONSOLE_PORT:-9001} (Console)"
	@echo "  pgAdmin:       (via nginx or docker exec)"
	@echo ""
	@echo "  $(YELLOW)Note: These direct ports are only for local dev. In Docker mode, use nginx.$(NC)"
	@echo ""
	@echo "Now run in separate terminals:"
	@echo "  make dev-backend   # Start backend with hot reload"
	@echo "  make dev-frontend  # Start frontend with HMR"

# Start backend locally (outside Docker, for easier debugging)
dev-backend:
	@echo "$(CYAN)Starting backend with hot reload...$(NC)"
	cd backend && pnpm run dev

# Start frontend locally (outside Docker, for easier debugging)
dev-frontend:
	@echo "$(CYAN)Starting frontend with HMR...$(NC)"
	cd frontend && pnpm run dev

# Start agent with hot reload using Air
dev-agent:
	@echo "$(CYAN)Starting agent with Air hot reload...$(NC)"
	@AIR_BIN=$$(command -v air 2>/dev/null || echo "$$HOME/go/bin/air"); \
	if [ ! -x "$$AIR_BIN" ]; then \
		echo "$(YELLOW)Air not found. Installing...$(NC)"; \
		go install github.com/air-verse/air@latest; \
		AIR_BIN="$$HOME/go/bin/air"; \
	fi; \
	cd agent && "$$AIR_BIN"

# Stop all services
stop:
	@echo "$(CYAN)Stopping all services...$(NC)"
	@$(DOCKER_COMPOSE) down --remove-orphans 2>/dev/null || true
	@pkill -f "prisma studio" 2>/dev/null || true
	@pkill -f "patchify-agent" 2>/dev/null || true
	@echo "$(GREEN)Services stopped.$(NC)"

# ===================
# Database Targets
# ===================

db-migrate:
	@echo "$(CYAN)Running database migrations...$(NC)"
	cd backend && npx prisma db push --schema src/db/prisma/schema.prisma

db-seed:
	@echo "$(CYAN)Seeding database...$(NC)"
	cd backend && pnpm run db:seed

db-studio:
	@echo "$(CYAN)Opening Prisma Studio on http://localhost:5008 ...$(NC)"
	cd backend && npx prisma studio --schema src/db/prisma/schema.prisma --port 5008

db-reset:
	@echo "$(YELLOW)Resetting database (this will delete all data!)...$(NC)"
	cd backend && pnpm run db:push -- --force-reset
	cd backend && pnpm run db:seed
	@echo "$(GREEN)Database reset complete.$(NC)"

# ===================
# Agent Targets
# ===================

agent-build:
	@echo "$(CYAN)Building agent binary...$(NC)"
	cd agent && go build -o patchify-agent ./cmd/agent
	@echo "$(GREEN)Agent built: agent/patchify-agent$(NC)"

agent-run:
	@echo "$(CYAN)Running agent (connecting to $(PUBLIC_URL)/api)...$(NC)"
	cd agent && go run ./cmd/agent --server $(PUBLIC_URL)/api

agent-release:
	@echo "$(CYAN)Building agent binaries for all platforms...$(NC)"
	@mkdir -p agent/dist
	@cd agent && GOOS=linux GOARCH=amd64 go build -o dist/patchiq-agent-linux-amd64 ./cmd/agent
	@cd agent && GOOS=linux GOARCH=arm64 go build -o dist/patchiq-agent-linux-arm64 ./cmd/agent
	@cd agent && GOOS=darwin GOARCH=amd64 go build -o dist/patchiq-agent-darwin-amd64 ./cmd/agent
	@cd agent && GOOS=darwin GOARCH=arm64 go build -o dist/patchiq-agent-darwin-arm64 ./cmd/agent
	@cd agent && GOOS=windows GOARCH=amd64 go build -o dist/patchiq-agent-windows-amd64.exe ./cmd/agent
	@echo "$(GREEN)Binaries built:$(NC)"
	@ls -lh agent/dist/
	@echo ""
	@echo "$(CYAN)Uploading to MinIO...$(NC)"
	@MC=$$(command -v mc 2>/dev/null || echo "/tmp/mc"); \
	if [ ! -x "$$MC" ]; then \
		echo "$(YELLOW)Downloading MinIO client...$(NC)"; \
		curl -sL https://dl.min.io/client/mc/release/linux-amd64/mc -o /tmp/mc && chmod +x /tmp/mc; \
		MC=/tmp/mc; \
	fi; \
	$$MC alias set patchiq http://localhost:5006 patchiq_admin patchiq_secret_key 2>/dev/null; \
	$$MC mb --ignore-existing patchiq/agents 2>/dev/null; \
	$$MC cp agent/dist/patchiq-agent-linux-amd64 patchiq/agents/linux/amd64/1.0.0/patchiq-agent; \
	$$MC cp agent/dist/patchiq-agent-linux-arm64 patchiq/agents/linux/arm64/1.0.0/patchiq-agent; \
	$$MC cp agent/dist/patchiq-agent-darwin-amd64 patchiq/agents/mac/amd64/1.0.0/patchiq-agent; \
	$$MC cp agent/dist/patchiq-agent-darwin-arm64 patchiq/agents/mac/arm64/1.0.0/patchiq-agent; \
	$$MC cp agent/dist/patchiq-agent-windows-amd64.exe patchiq/agents/windows/amd64/1.0.0/patchiq-agent.exe
	@echo ""
	@echo "$(CYAN)Updating database records...$(NC)"
	@cd backend && npx ts-node -r tsconfig-paths/register -e " \
	const { PrismaClient } = require('@prisma/client'); \
	const prisma = new PrismaClient(); \
	const fs = require('fs'); \
	async function main() { \
	  const entries = [ \
	    { platform: 'Windows', architecture: 'amd64', filePath: 'windows/amd64/1.0.0/patchiq-agent.exe', bin: '../agent/dist/patchiq-agent-windows-amd64.exe' }, \
	    { platform: 'Linux', architecture: 'amd64', filePath: 'linux/amd64/1.0.0/patchiq-agent', bin: '../agent/dist/patchiq-agent-linux-amd64' }, \
	    { platform: 'Linux', architecture: 'arm64', filePath: 'linux/arm64/1.0.0/patchiq-agent', bin: '../agent/dist/patchiq-agent-linux-arm64' }, \
	    { platform: 'Mac', architecture: 'amd64', filePath: 'mac/amd64/1.0.0/patchiq-agent', bin: '../agent/dist/patchiq-agent-darwin-amd64' }, \
	    { platform: 'Mac', architecture: 'arm64', filePath: 'mac/arm64/1.0.0/patchiq-agent', bin: '../agent/dist/patchiq-agent-darwin-arm64' }, \
	  ]; \
	  for (const e of entries) { \
	    const stat = fs.statSync(e.bin); \
	    await prisma.agentVersion.updateMany({ where: { platform: e.platform, architecture: e.architecture, version: '1.0.0' }, data: { filePath: e.filePath, fileSize: BigInt(stat.size), lastUpdatedAt: new Date() } }); \
	    console.log('  Updated ' + e.platform + '/' + e.architecture); \
	  } \
	} \
	main().catch(console.error).finally(() => process.exit());"
	@echo ""
	@echo "$(GREEN)Agent release complete! All binaries uploaded and DB updated.$(NC)"

agent-install-air:
	@echo "$(CYAN)Installing Air for Go hot reload...$(NC)"
	go install github.com/air-verse/air@latest
	@echo "$(GREEN)Air installed! Run 'make dev-agent' to start agent with hot reload.$(NC)"

# ===================
# Testing Targets
# ===================

test: test-backend test-frontend
	@echo "$(GREEN)All tests complete!$(NC)"

test-backend:
	@echo "$(CYAN)Running backend tests...$(NC)"
	cd backend && pnpm test

test-frontend:
	@echo "$(CYAN)Running frontend Playwright tests...$(NC)"
	cd frontend && pnpm test

# ===================
# Logs Targets
# ===================

logs:
	@$(DOCKER_COMPOSE) logs -f

logs-backend:
	@$(DOCKER_COMPOSE) logs -f backend

logs-frontend:
	@$(DOCKER_COMPOSE) logs -f frontend

logs-nginx:
	@$(DOCKER_COMPOSE) logs -f nginx

# ===================
# Cleanup Targets
# ===================

clean:
	@echo "$(YELLOW)Stopping services and removing volumes...$(NC)"
	@$(DOCKER_COMPOSE) down -v --remove-orphans 2>/dev/null || true
	@docker ps -aq --filter "name=patchiq" 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
	@pkill -f "patchify-agent" 2>/dev/null || true
	@echo "$(GREEN)Cleanup complete.$(NC)"

clean-all: clean
	@echo "$(YELLOW)Removing node_modules and build caches...$(NC)"
	rm -rf backend/node_modules frontend/node_modules shared/node_modules node_modules .turbo
	@echo "$(GREEN)Full cleanup complete.$(NC)"

# ===================
# Validation Targets
# ===================

# Quick validation - run after changes to catch obvious issues
check: check-types check-lint
	@echo ""
	@echo "$(GREEN)All checks passed!$(NC)"

# Type checking only (fast)
check-types:
	@echo "$(CYAN)Running type checks...$(NC)"
	pnpm turbo check
	@echo "$(GREEN)Type checks passed$(NC)"

# Lint checking
check-lint:
	@echo "$(CYAN)Running lint checks...$(NC)"
	@cd frontend && pnpm run lint 2>&1 | head -30 || true
	@echo "$(GREEN)Lint checks done$(NC)"

# Build check - ensures everything compiles
check-build:
	@echo "$(CYAN)Running build checks...$(NC)"
	@echo "  Backend..."
	@cd backend && pnpm run build 2>&1 || (echo "$(YELLOW)Backend build failed$(NC)" && exit 1)
	@echo "  Frontend..."
	@cd frontend && pnpm run build 2>&1 || (echo "$(YELLOW)Frontend build failed$(NC)" && exit 1)
	@echo "  Agent..."
	@cd agent && go build -o /dev/null ./cmd/agent 2>&1 || (echo "$(YELLOW)Agent build failed$(NC)" && exit 1)
	@echo "$(GREEN)All builds passed$(NC)"

# Health check - verify running services respond
check-health:
	@echo "$(CYAN)Checking service health...$(NC)"
	@echo "  Public URL: $(PUBLIC_URL)"
	@echo ""
	@echo "  $(CYAN)External Access (via nginx on port $(PUBLIC_PORT)):$(NC)"
	@curl -sf $(PUBLIC_URL)/health > /dev/null 2>&1 && echo "    Backend API:   $(GREEN)OK$(NC) ($(PUBLIC_URL)/health)" || echo "    Backend API:   $(YELLOW)Not running$(NC)"
	@curl -sf $(PUBLIC_URL) > /dev/null 2>&1 && echo "    Frontend:      $(GREEN)OK$(NC) ($(PUBLIC_URL))" || echo "    Frontend:      $(YELLOW)Not running$(NC)"
	@curl -sf $(PUBLIC_URL)/api-docs > /dev/null 2>&1 && echo "    API Docs:      $(GREEN)OK$(NC) ($(PUBLIC_URL)/api-docs)" || echo "    API Docs:      $(YELLOW)Not running$(NC)"
	@curl -sf $(PUBLIC_URL)/prisma/ > /dev/null 2>&1 && echo "    Prisma Studio: $(GREEN)OK$(NC) ($(PUBLIC_URL)/prisma/)" || echo "    Prisma Studio: $(YELLOW)Not running$(NC)"
	@curl -sf $(PUBLIC_URL)/pgadmin/ > /dev/null 2>&1 && echo "    pgAdmin:       $(GREEN)OK$(NC) ($(PUBLIC_URL)/pgadmin/)" || echo "    pgAdmin:       $(YELLOW)Not running$(NC)"
	@curl -sf http://localhost:5003/api/agent > /dev/null 2>&1 && echo "    Agent WebUI:   $(GREEN)OK$(NC) (localhost:5003)" || echo "    Agent WebUI:   $(YELLOW)Not running$(NC)"
	@echo ""
	@echo "  $(CYAN)Docker Containers:$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_nginx" && echo "    Nginx:         $(GREEN)OK$(NC)" || echo "    Nginx:         $(YELLOW)Not running$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_backend" && echo "    Backend:       $(GREEN)OK$(NC)" || echo "    Backend:       $(YELLOW)Not running$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_frontend" && echo "    Frontend:      $(GREEN)OK$(NC)" || echo "    Frontend:       $(YELLOW)Not running$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_db.*healthy" && echo "    Postgres:      $(GREEN)OK$(NC)" || echo "    Postgres:      $(YELLOW)Not running$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_redis.*healthy" && echo "    Redis:         $(GREEN)OK$(NC)" || echo "    Redis:         $(YELLOW)Not running$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_minio.*healthy" && echo "    MinIO:         $(GREEN)OK$(NC)" || echo "    MinIO:         $(YELLOW)Not running$(NC)"

# Full validation - types, lint, and build
check-all: check-types check-lint check-build
	@echo ""
	@echo "$(GREEN)Full validation passed!$(NC)"

# ===================
# Utility Targets
# ===================

# Install all dependencies
install:
	@echo "$(CYAN)Installing dependencies...$(NC)"
	pnpm install
	@echo "$(GREEN)Dependencies installed.$(NC)"

# First-time project setup
setup:
	@echo "$(CYAN)PatchIQ first-time setup$(NC)"
	@echo "========================"
	@echo ""
	@echo "$(CYAN)1/5 Creating env files...$(NC)"
	@test -f .env || cp .env.example .env && echo "  Created .env"
	@test -f backend/.env || cp backend/.env.example backend/.env && echo "  Created backend/.env"
	@echo ""
	@echo "$(CYAN)2/5 Installing dependencies...$(NC)"
	pnpm install
	@echo ""
	@echo "$(CYAN)3/5 Building shared types...$(NC)"
	pnpm --filter @patchiq/shared-types build
	@echo ""
	@echo "$(CYAN)4/5 Generating Prisma client...$(NC)"
	cd backend && npx prisma generate --schema src/db/prisma/schema.prisma
	@echo ""
	@echo "$(CYAN)5/5 Verifying setup...$(NC)"
	@test -f .env && echo "  .env exists" || echo "  $(RED).env missing$(NC)"
	@test -f backend/.env && echo "  backend/.env exists" || echo "  $(RED)backend/.env missing$(NC)"
	@test -d node_modules && echo "  node_modules installed" || echo "  $(RED)node_modules missing$(NC)"
	@test -d backend/node_modules/.prisma && echo "  Prisma client generated" || echo "  $(RED)Prisma client missing$(NC)"
	@echo ""
	@echo "$(GREEN)Setup complete!$(NC) Run 'make dev' to start developing."

# Check if services are healthy
status: check-health
	@echo ""
	@echo "$(CYAN)Docker Status:$(NC)"
	@$(DOCKER_COMPOSE) ps

# ===================
# API & Debug Tools
# ===================

# Open MinIO console info
minio-console:
	@echo "$(CYAN)MinIO Console:$(NC)"
	@echo "  URL:      $(PUBLIC_URL)/minio/"
	@echo "  Direct:   http://localhost:5007"
	@echo "  Username: patchiq_admin"
	@echo "  Password: patchiq_secret_key"
	@echo ""
	@echo "Opening in browser..."
	@open $(PUBLIC_URL)/minio/ 2>/dev/null || xdg-open $(PUBLIC_URL)/minio/ 2>/dev/null || echo "Open $(PUBLIC_URL)/minio/ in your browser"

# Open Scalar API docs in browser
api-docs:
	@echo "$(CYAN)Opening Scalar API docs at $(PUBLIC_URL)/api-docs ...$(NC)"
	@open $(PUBLIC_URL)/api-docs 2>/dev/null || xdg-open $(PUBLIC_URL)/api-docs 2>/dev/null || echo "Open $(PUBLIC_URL)/api-docs in your browser"

# Show all API endpoints (text reference)
api-endpoints:
	@echo ""
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║              PatchIQ API Endpoints                        ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Public URL:$(NC) $(PUBLIC_URL)"
	@echo ""
	@echo "$(GREEN)Backend API$(NC) (via nginx)"
	@echo "  Health:        GET  $(PUBLIC_URL)/health"
	@echo "  API Base:      $(PUBLIC_URL)/v1"
	@echo ""
	@echo "  $(YELLOW)Auth:$(NC)"
	@echo "    POST /v1/auth/login          - Login"
	@echo "    POST /v1/auth/register       - Register"
	@echo "    POST /v1/auth/refresh        - Refresh token"
	@echo ""
	@echo "  $(YELLOW)Assets:$(NC)"
	@echo "    GET  /v1/assets              - List assets"
	@echo "    GET  /v1/assets/:id          - Get asset"
	@echo "    POST /v1/assets              - Create asset"
	@echo "    PUT  /v1/assets/:id          - Update asset"
	@echo "    GET  /v1/assets/:id/hardware - Get hardware info"
	@echo "    GET  /v1/assets/:id/software - Get software info"
	@echo "    GET  /v1/assets/:id/telemetry - Get telemetry"
	@echo ""
	@echo "  $(YELLOW)Agents:$(NC)"
	@echo "    GET  /v1/agents              - List agents"
	@echo "    GET  /v1/agents/:id          - Get agent"
	@echo "    POST /v1/agents/:id/approve  - Approve agent"
	@echo ""
	@echo "  $(YELLOW)Patches:$(NC)"
	@echo "    GET  /v1/patches             - List patches"
	@echo "    GET  /v1/patches/:id         - Get patch"
	@echo ""
	@echo "$(GREEN)Agent Local API$(NC) - http://localhost:5003"
	@echo "    GET  /api/agent              - Agent info"
	@echo "    GET  /api/inventory          - Full inventory"
	@echo "    GET  /api/telemetry          - Current telemetry"
	@echo "    POST /api/collect            - Trigger collection"
	@echo ""
	@echo "$(GREEN)Agent Registration API$(NC) - $(PUBLIC_URL)/api/agent"
	@echo "    POST /api/agent/register     - Register agent"
	@echo "    POST /api/agent/heartbeat    - Send heartbeat"
	@echo "    POST /api/agent/inventory    - Submit inventory"
	@echo "    POST /api/agent/telemetry    - Submit telemetry"
	@echo ""
	@echo "$(GREEN)Dev Tools:$(NC)"
	@echo "  API Docs:      $(PUBLIC_URL)/api-docs"
	@echo "  Prisma Studio: http://localhost:5008"
	@echo "  pgAdmin:       http://localhost:5009"
	@echo "  MinIO Console: $(PUBLIC_URL)/minio/"
	@echo ""
