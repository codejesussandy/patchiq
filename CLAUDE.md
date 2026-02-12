# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PatchIQ is a patch and vulnerability management platform with a TypeScript monorepo structure:
- **Backend**: Express.js API (Node.js 18+, TypeScript)
- **Frontend**: React 19 + Vite + Ant Design 6
- **Agent**: Go 1.22 binary for collecting hardware/software inventory
- **Shared**: TypeScript types shared between frontend and backend (single source of truth)

## Active Documentation

- **`docs/ROADMAP.md`** — Codebase overhaul roadmap (Now/Next/Later phases)
- **`docs/PRD-PHASE1-TYPE-SAFETY.md`** — Current phase: Type Safety & Shared Contracts
- **`docs/.archive/`** — Old docs preserved for reference (not actively used)

**Before starting any implementation work**, read the ROADMAP to understand current priorities, then read the relevant PRD for the active phase.

## Common Commands

### Development
```bash
make dev              # Start full stack (Docker)
make dev-services     # Start infrastructure only (DB, Redis, MinIO)
make dev-backend      # Backend with hot reload (run from separate terminal)
make dev-frontend     # Frontend with HMR (run from separate terminal)
make dev-agent        # Agent with Air hot reload
```

### Testing
```bash
# Backend
cd backend && npm test                    # All tests (unit + integration)
cd backend && npm run test:unit           # Unit tests only
cd backend && npm run test:e2e            # E2E tests
cd backend && npm test -- path/to/test    # Single test file

# Frontend
cd frontend && npm test                   # Playwright tests
cd frontend && npm run test:ui            # Playwright UI mode
cd frontend && npm run test:debug         # Debug mode
```

### Database
```bash
make db-migrate       # Run Prisma migrations
make db-seed          # Seed with sample data
make db-studio        # Open Prisma Studio on :5555
make db-reset         # Drop + migrate + seed
```

### Validation
```bash
make check            # Quick validation (types + lint)
make check-all        # Full validation (types + lint + build)
cd backend && npm run lint:fix   # Auto-fix backend lint
cd frontend && npm run lint      # Frontend lint
```

### Type Generation
```bash
cd shared && npm run generate          # Generate shared types from Prisma schema
cd backend && npm run generate:types   # Same, from backend directory
```

### Agent
```bash
cd agent && go build -o patchify-agent ./cmd/agent   # Build binary
make agent-run                                        # Run without hot reload
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│ PostgreSQL  │
│  (React)    │     │  (Express)  │     │   (Prisma)  │
│   :5173     │     │    :3000    │     │    :4500    │
└─────────────┘     └──────┬──────┘     └─────────────┘
      (via nginx)          │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌─────▼─────┐
              │   Redis   │ │   MinIO   │
              │   :4501   │ │   :9000   │
              └───────────┘ └───────────┘
                    ▲
              ┌─────┴─────┐
              │   Agent   │
              │   (Go)    │
              │   :4504   │
              └───────────┘
```

### Key Architecture Patterns

**Hub-Centric Deployment:**
- Software packages stored in MinIO with bundled scripts (install.sh, update.sh, rollback.sh, uninstall.sh)
- Agent downloads package + scripts from Hub, executes appropriate script
- No hardcoded package manager commands in agent

**Two Module Pattern:**
- `jobs` module = Catalog/Policy management (create what to deploy)
- `deployments` module = Execution (actually deploy it via Hub)

**Two UI Systems:**
- **Agent UI** (localhost:4504): Local web UI embedded in Go agent binary
- **PatchIQ UI** (localhost:5173): Central management platform via nginx

## Code Structure

### Backend (`/backend/src/`)
- `modules/` — Feature modules (18 total: auth, agents, assets, patches, vulnerabilities, jobs, deployments, discovery, dashboard, reports, settings, hub, patch-templates, patch-repository, notifications, alerts, software-catalog)
  - Each module has: `*.controller.ts`, `*.service.ts`, `*.validator.ts`
- `db/prisma/` — Schema (schema.prisma), migrations, seed.ts
- `middleware/` — Auth, error handling, validation, audit, rate limiting
- `shared/` — Utilities, validators, types, errors, services (MinIO, email, SSE, etc.)

### Frontend (`/frontend/src/`)
- `pages/` — Route pages (91 components)
- `components/` — Reusable components (14 components)
- `services/` — API client layer (18 service files via axios)
- `contexts/` — React contexts (AuthContext)
- `hooks/` — Custom hooks (useNotificationSSE)
- `types/` — TypeScript interfaces (17 type files)

### Agent (`/agent/`)
- `cmd/agent/` — Entry point
- `internal/collectors/` — Hardware/software/network/security/peripheral/telemetry collectors
- `internal/executors/` — Script executors for deployments (cross-platform)
- `internal/backend/` — Server communication (registration, heartbeat, commands)
- `internal/server/` — Embedded WebUI server

### Shared (`/shared/types/`)
- `index.ts` — Main exports
- `enums.ts` — Shared enum definitions
- `models.ts` — Prisma-derived model types
- `api.ts` — API request/response contract types

## Key Files

- `/backend/src/db/prisma/schema.prisma` — Database schema (source of truth for data models)
- `/backend/src/app.ts` — Express routes setup
- `/frontend/src/App.tsx` — React router
- `/shared/types/` — Shared TypeScript definitions (single source of truth for types)
- `/docker-compose.yml` — Full infrastructure

## Path Aliases (Backend)

```typescript
import { something } from '@modules/auth';      // src/modules/
import { util } from '@shared/utils';           // src/shared/
import { config } from '@config/index';         // src/config/
```

## Coding Standards

### Type Safety
- **No `as any`, `as unknown as`, or `@ts-ignore`** — fix the underlying type issue instead
- **Shared types are the single source of truth** — frontend and backend import from `/shared/types/`
- **Enums use UPPERCASE** — matching Prisma convention. Frontend formats for display as a UI concern
- **API responses use standard envelope** — `{ success, data, meta?, error? }`

### API Conventions
- All endpoints return the standard response envelope (see PRD-PHASE1 R3)
- Backend field names are authoritative — frontend adapts
- Zod validation on every endpoint before hitting service layer
- Prisma transactions for all multi-step operations

### Code Organization
- Keep page components under 400 lines — extract sub-components
- Services handle API calls, components handle UI — no API calls in components directly
- One module = one domain concern with controller/service/validator pattern

## Test Credentials

- Admin: `admin@patchiq.io` / `admin123`
- Demo: `demo@patchiq.io` / `demo123`

## Service Ports

| Service           | Port  | Notes                       |
|-------------------|-------|-----------------------------|
| Nginx/Frontend    | 5173  | Main entry point (PUBLIC_PORT) |
| Backend API       | 3000  | Internal via nginx           |
| PostgreSQL        | 4500  | External mapping             |
| Redis             | 4501  | External mapping             |
| pgAdmin           | 4502  | Admin tool                   |
| Prisma Studio     | 4503  | DB GUI                       |
| Agent WebUI       | 4504  | Native Go binary             |
| MinIO API         | 9000  | Internal via nginx /s3/      |
| MinIO Console     | 9001  | Internal via nginx /minio/   |

Port configuration is centralized in `.env` file. Copy `.env.example` to `.env` and adjust as needed.

## API Documentation

- Scalar API docs: http://localhost:3000/api-docs (when backend running)
- `make api-endpoints` — Quick endpoint reference

# Very important note
 always use team mate tool when the task is complex.