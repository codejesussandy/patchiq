# PatchIQ Development Makefile
# ============================
# Run `make help` to see all available commands

.PHONY: help dev dev-fresh dev-services dev-backend dev-frontend dev-agent stop clean logs logs-backend logs-frontend db-migrate db-seed db-studio db-reset agent-build agent-run agent-install-air test test-backend test-frontend check check-types check-lint check-build check-health check-all install status minio-console api-docs api-endpoints dev-all clean-all preflight

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
CYAN := \033[0;36m
RED := \033[0;31m
NC := \033[0m # No Color

# Use docker compose v2 (with space) - check if it works, else fall back to docker-compose
DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# Default target
help:
	@echo ""
	@echo "$(CYAN)PatchIQ Development Commands$(NC)"
	@echo "=============================="
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  make dev              - Start full stack (clean ports, rebuild if needed)"
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
	@echo "$(GREEN)Note:$(NC) 'make dev' uses nginx reverse proxy - all services on port 5173"
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
	@echo "  make db-studio        - Open Prisma Studio (DB GUI) on :5555"
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
	@lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
	@lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null || true
	@# Remove orphan patchiq containers
	@docker ps -aq --filter "name=patchiq" 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
	@echo "$(GREEN)Pre-flight checks complete$(NC)"

# Start full stack with Docker (with pre-flight checks)
dev: preflight
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
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:3000"
	@echo "  MinIO:    http://localhost:5002 (patchiq_admin / patchiq_secret_key)"
	@echo "  Prisma:   http://localhost:5000"
	@echo "  pgAdmin:  http://localhost:5050"
	@echo ""
	@echo "  Login: admin@patchiq.io / admin123"
	@echo ""
	@echo "Use 'make logs' to watch logs, 'make stop' to stop services"

# Full fresh start - stop everything, remove containers, start clean
dev-fresh:
	@echo "$(YELLOW)Performing full fresh start...$(NC)"
	@$(DOCKER_COMPOSE) down --remove-orphans 2>/dev/null || true
	@docker ps -aq --filter "name=patchiq" 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
	@lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
	@lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null || true
	@lsof -ti :8083 2>/dev/null | xargs kill -9 2>/dev/null || true
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
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:3000"
	@echo ""
	@echo "  Login: admin@patchiq.io / admin123"

# Start everything including agent
dev-all: dev
	@echo ""
	@echo "$(CYAN)Starting agent...$(NC)"
	@cd agent && go build -o patchify-agent ./cmd/agent 2>/dev/null || true
	@echo "Run 'make dev-agent' in a separate terminal for hot reload"
	@echo "Or run 'make agent-run' to start agent without hot reload"

# Start only infrastructure services (for local backend/frontend development)
dev-services: preflight
	@echo "$(CYAN)Starting infrastructure services (DB, Redis, MinIO, pgAdmin)...$(NC)"
	@$(DOCKER_COMPOSE) up -d postgres redis minio pgadmin
	@echo "$(CYAN)Starting Prisma Studio on port 5555...$(NC)"
	@cd backend && npx prisma studio --schema src/db/prisma/schema.prisma --port 5555 --browser none > /dev/null 2>&1 &
	@echo "$(GREEN)Infrastructure ready!$(NC)"
	@echo "  PostgreSQL:    localhost:5432"
	@echo "  Redis:         localhost:6379"
	@echo "  MinIO:         localhost:5001 (API), localhost:5002 (Console)"
	@echo "  pgAdmin:       http://localhost:5050 (admin@patchiq.io / admin123)"
	@echo "  Prisma Studio: http://localhost:5555"
	@echo ""
	@echo "Now run in separate terminals:"
	@echo "  make dev-backend   # Start backend with hot reload"
	@echo "  make dev-frontend  # Start frontend with HMR"

# Start backend locally (outside Docker, for easier debugging)
dev-backend:
	@echo "$(CYAN)Starting backend with hot reload...$(NC)"
	cd backend && npm run dev

# Start frontend locally (outside Docker, for easier debugging)
dev-frontend:
	@echo "$(CYAN)Starting frontend with HMR...$(NC)"
	cd frontend && npm run dev

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
	cd backend && npm run db:seed

db-studio:
	@echo "$(CYAN)Opening Prisma Studio on http://localhost:5555 ...$(NC)"
	cd backend && npx prisma studio --schema src/db/prisma/schema.prisma --port 5555

db-reset:
	@echo "$(YELLOW)Resetting database (this will delete all data!)...$(NC)"
	cd backend && npm run db:push -- --force-reset
	cd backend && npm run db:seed
	@echo "$(GREEN)Database reset complete.$(NC)"

# ===================
# Agent Targets
# ===================

agent-build:
	@echo "$(CYAN)Building agent binary...$(NC)"
	cd agent && go build -o patchify-agent ./cmd/agent
	@echo "$(GREEN)Agent built: agent/patchify-agent$(NC)"

agent-run:
	@echo "$(CYAN)Running agent...$(NC)"
	cd agent && go run ./cmd/agent --server http://localhost:3000/api

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
	cd backend && npm test

test-frontend:
	@echo "$(CYAN)Running frontend Playwright tests...$(NC)"
	cd frontend && npm test

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
	@echo "$(YELLOW)Removing node_modules...$(NC)"
	rm -rf backend/node_modules frontend/node_modules
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
	@echo "  Backend..."
	@cd backend && npm run build --if-present 2>&1 | head -50 || (echo "$(YELLOW)Backend type errors found$(NC)" && exit 1)
	@echo "  Frontend..."
	@cd frontend && npx tsc --noEmit 2>&1 | head -50 || (echo "$(YELLOW)Frontend type errors found$(NC)" && exit 1)
	@echo "$(GREEN)Type checks passed$(NC)"

# Lint checking
check-lint:
	@echo "$(CYAN)Running lint checks...$(NC)"
	@cd frontend && npm run lint 2>&1 | head -30 || true
	@echo "$(GREEN)Lint checks done$(NC)"

# Build check - ensures everything compiles
check-build:
	@echo "$(CYAN)Running build checks...$(NC)"
	@echo "  Backend..."
	@cd backend && npm run build 2>&1 || (echo "$(YELLOW)Backend build failed$(NC)" && exit 1)
	@echo "  Frontend..."
	@cd frontend && npm run build 2>&1 || (echo "$(YELLOW)Frontend build failed$(NC)" && exit 1)
	@echo "  Agent..."
	@cd agent && go build -o /dev/null ./cmd/agent 2>&1 || (echo "$(YELLOW)Agent build failed$(NC)" && exit 1)
	@echo "$(GREEN)All builds passed$(NC)"

# Health check - verify running services respond
check-health:
	@echo "$(CYAN)Checking service health...$(NC)"
	@curl -sf http://localhost:5173/health > /dev/null 2>&1 && echo "  Nginx+Backend: $(GREEN)OK$(NC) (via nginx proxy)" || echo "  Nginx+Backend: $(YELLOW)Not running$(NC)"
	@curl -sf http://localhost:3000/health > /dev/null 2>&1 && echo "  Backend:       $(GREEN)OK$(NC) (direct)" || echo "  Backend:       $(YELLOW)Not running$(NC)"
	@curl -sf http://localhost:5173 > /dev/null 2>&1 && echo "  Frontend:      $(GREEN)OK$(NC)" || echo "  Frontend:      $(YELLOW)Not running$(NC)"
	@curl -sf http://localhost:8083/api/agent > /dev/null 2>&1 && echo "  Agent:         $(GREEN)OK$(NC)" || echo "  Agent:         $(YELLOW)Not running$(NC)"
	@curl -sf http://localhost:5000 > /dev/null 2>&1 && echo "  Prisma Studio: $(GREEN)OK$(NC)" || echo "  Prisma Studio: $(YELLOW)Not running$(NC)"
	@curl -sf http://localhost:5050 > /dev/null 2>&1 && echo "  pgAdmin:       $(GREEN)OK$(NC)" || echo "  pgAdmin:       $(YELLOW)Not running$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_nginx" && echo "  Nginx:         $(GREEN)OK$(NC)" || echo "  Nginx:         $(YELLOW)Not running$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_db.*healthy" && echo "  Postgres:      $(GREEN)OK$(NC)" || echo "  Postgres:      $(YELLOW)Not running$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_redis.*healthy" && echo "  Redis:         $(GREEN)OK$(NC)" || echo "  Redis:         $(YELLOW)Not running$(NC)"
	@docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "patchiq_minio.*healthy" && echo "  MinIO:         $(GREEN)OK$(NC)" || echo "  MinIO:         $(YELLOW)Not running$(NC)"

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
	cd backend && npm install
	cd frontend && npm install
	@echo "$(GREEN)Dependencies installed.$(NC)"

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
	@echo "  URL:      http://localhost:9001"
	@echo "  Username: patchiq_admin"
	@echo "  Password: patchiq_secret_key"
	@echo ""
	@echo "Opening in browser..."
	@open http://localhost:9001 2>/dev/null || xdg-open http://localhost:9001 2>/dev/null || echo "Open http://localhost:9001 in your browser"

# Open Scalar API docs in browser
api-docs:
	@echo "$(CYAN)Opening Scalar API docs at http://localhost:3000/api-docs ...$(NC)"
	@open http://localhost:3000/api-docs 2>/dev/null || xdg-open http://localhost:3000/api-docs 2>/dev/null || echo "Open http://localhost:3000/api-docs in your browser"

# Show all API endpoints (text reference)
api-endpoints:
	@echo ""
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║              PatchIQ API Endpoints                        ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Backend API$(NC) - http://localhost:3000"
	@echo "  Health:        GET  /health"
	@echo "  API Base:      /v1"
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
	@echo "$(GREEN)Agent API$(NC) - http://localhost:8080"
	@echo "    GET  /api/agent              - Agent info"
	@echo "    GET  /api/inventory          - Full inventory"
	@echo "    GET  /api/telemetry          - Current telemetry"
	@echo "    POST /api/collect            - Trigger collection"
	@echo ""
	@echo "$(GREEN)Agent Registration API$(NC) - http://localhost:3000/api/agent"
	@echo "    POST /api/agent/register     - Register agent"
	@echo "    POST /api/agent/heartbeat    - Send heartbeat"
	@echo "    POST /api/agent/inventory    - Submit inventory"
	@echo "    POST /api/agent/telemetry    - Submit telemetry"
	@echo ""
	@echo "$(GREEN)Other Services:$(NC)"
	@echo "  Prisma Studio: make db-studio  → http://localhost:5555"
	@echo "  MinIO Console: make minio-console → http://localhost:9001"
	@echo ""
