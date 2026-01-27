# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PatchIQ is a patch and vulnerability management platform with a TypeScript monorepo structure:
- **Backend**: Express.js API (Node.js 18+, TypeScript)
- **Frontend**: React 19 + Vite + Ant Design 6
- **Agent**: Go 1.22 binary for collecting hardware/software inventory
- **Shared**: TypeScript types shared between frontend and backend

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
│   :5173     │     │    :3000    │     │    :5432    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌─────▼─────┐
              │   Redis   │ │   MinIO   │
              │   :6379   │ │   :9000   │
              └───────────┘ └───────────┘
                    ▲
              ┌─────┴─────┐
              │   Agent   │
              │   (Go)    │
              │   :8080   │
              └───────────┘
```

## Code Structure

### Backend (`/backend/src/`)
- `modules/` - Feature modules (auth, agents, assets, patches, vulnerabilities, jobs, discovery, dashboard, reports, settings)
  - Each module has: `*.controller.ts`, `*.service.ts`, `*.validator.ts`
- `db/prisma/` - Schema (schema.prisma), migrations, seed.ts
- `middleware/` - Auth, error handling, validation
- `shared/` - Utilities, validators, types, errors

### Frontend (`/frontend/src/`)
- `pages/` - Route pages
- `components/` - Reusable components
- `services/` - API client (axios)
- `contexts/` - React contexts (AuthContext, ThemeContext)
- `types/` - TypeScript interfaces

### Agent (`/agent/`)
- `cmd/agent/` - Entry point
- `internal/collectors/` - Hardware/software collectors
- `internal/backend/` - Server communication

## Key Files

- `/backend/src/db/prisma/schema.prisma` - Database schema
- `/backend/src/app.ts` - Express routes setup
- `/frontend/src/App.tsx` - React router
- `/shared/types/` - Shared TypeScript definitions
- `/docker-compose.yml` - Full infrastructure

## Path Aliases (Backend)

```typescript
import { something } from '@modules/auth';      // src/modules/
import { util } from '@shared/utils';           // src/shared/
import { config } from '@config/index';         // src/config/
```

## Test Credentials

- Admin: `admin@patchiq.io` / `admin123`
- Demo: `demo@patchiq.io` / `demo123`

## Service Ports

| Service        | Port  |
|----------------|-------|
| Frontend       | 5173  |
| Backend API    | 3000  |
| Agent          | 8080  |
| PostgreSQL     | 5432  |
| Redis          | 6379  |
| MinIO API      | 9000  |
| MinIO Console  | 9001  |
| Prisma Studio  | 5555  |
| pgAdmin        | 5050  |

## API Documentation

- Scalar API docs: http://localhost:3000/api-docs (when backend running)
- `make api-endpoints` - Quick endpoint reference

---

## Current Implementation Task: Jobs Functional Integration

**IMPORTANT:** Before starting implementation work, you MUST:

1. **Read the task document:** `/JOBS_IMPLEMENTATION.md`
2. **Follow the task order:** Complete tasks in phase order (Phase 1 → Phase 2 → etc.)
3. **Update task status:** Mark tasks as IN_PROGRESS when starting, COMPLETED when done
4. **Test before proceeding:** Each task must be tested and verified working before moving to the next

### Related Documentation
- `/DEPLOYMENT_PIPELINE_ISSUES.md` - Known issues with field mismatches
- `/HUB_IMPLEMENTATION.md` - Hub architecture (COMPLETED phases 1-5)

### Two UI Systems

- **Agent UI** (localhost:8080): Local web UI embedded in Go agent binary. Shows job status, installation progress, and local endpoint details.
- **PatchIQ UI** (localhost:5173): Central management platform. Hub management, deployment creation, and aggregate status.

### Architecture Notes

**Hub-Centric Deployment:**
- Software packages stored in MinIO with bundled scripts (install.sh, update.sh, rollback.sh, uninstall.sh)
- Agent downloads package + scripts from Hub, executes appropriate script
- No hardcoded package manager commands in agent

**Two Module Pattern:**
- `jobs` module = Catalog/Policy management (create what to deploy)
- `deployments` module = Execution (actually deploy it via Hub)

**Current Focus:** Making Jobs pages functional by connecting them to the deployment executor.
