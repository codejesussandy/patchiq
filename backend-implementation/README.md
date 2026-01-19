# PatchIQ Backend Implementation Plan

## Overview

This directory contains comprehensive implementation tasks for the PatchIQ backend. Each task file is designed to be self-contained with all necessary context, enabling parallel execution by multiple agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PatchIQ System                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────────────┐     ┌─────────────────────┐   │
│  │   Frontend  │────►│    Backend Server   │◄────│   Agent (Go)        │   │
│  │   (React)   │     │    (Node.js/Go)     │     │   (Endpoint Client) │   │
│  └─────────────┘     └─────────────────────┘     └─────────────────────┘   │
│        │                       │                          │                 │
│        │              ┌────────┴────────┐                 │                 │
│        │              │                 │                 │                 │
│        ▼              ▼                 ▼                 ▼                 │
│  ┌───────────┐  ┌───────────┐   ┌───────────────┐  ┌───────────────┐       │
│  │ MSW Mocks │  │ PostgreSQL │   │ Redis/Cache   │  │ Data Collection│       │
│  │(Dev/Test) │  │ Database   │   │ (Optional)    │  │ & Heartbeat   │       │
│  └───────────┘  └───────────┘   └───────────────┘  └───────────────┘       │
│                                                                             │
│                      External Integrations                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ NIST NVD API  │  │ Email Service │  │ LDAP/AD       │                   │
│  │ (CVE Data)    │  │ (SMTP)        │  │ (Auth)        │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack Decision

### Recommended: Node.js + TypeScript

**Rationale:**
- Matches frontend TypeScript types (shared schemas)
- Express/Fastify for REST APIs
- Prisma or TypeORM for database
- Faster development for API-heavy application
- Jest for testing (consistent with frontend)

### Alternative: Go

**Rationale:**
- Agent is already in Go (code sharing)
- Better performance for background jobs
- Smaller memory footprint

**Recommendation:** Start with Node.js/TypeScript for API server, use Go for background workers if needed.

## Implementation Strategy

### Phase 1: Foundation (Parallel Tasks: 00-02)
- Database setup and migrations
- Core utilities (JWT, encryption, validation)
- Base API structure with middleware

### Phase 2: Core Features (Parallel Tasks: 03-07)
- Authentication module
- Agent management + communication
- Asset management
- Patch management
- Vulnerability management

### Phase 3: Supporting Features (Parallel Tasks: 08-11)
- Jobs & Deployments
- Discovery & Network scanning
- Dashboard & Reports
- Settings & Configuration

### Phase 4: Polish (Parallel Tasks: 12-14)
- Tags & Onboarding
- External integrations
- End-to-end testing

## Task Files

### Infrastructure (Execute First - Serial)
| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| 00 | `tasks/00-PROJECT-SETUP.md` | Project scaffolding, dependencies | None |
| 01 | `tasks/01-DATABASE-SETUP.md` | PostgreSQL, migrations, seed data | Task 00 |
| 02 | `tasks/02-CORE-UTILITIES.md` | JWT, encryption, validation, error handling | Task 00 |

### P0 Features (Parallel After Infrastructure)
| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| 03 | `tasks/03-AUTH-MODULE.md` | Login, logout, refresh, password reset | Tasks 01, 02 |
| 04 | `tasks/04-AGENTS-MODULE.md` | Agent registration, heartbeat, commands | Tasks 01, 02, 03 |
| 05 | `tasks/05-ASSETS-MODULE.md` | Asset CRUD, hardware, software, security | Tasks 01, 02, 03 |
| 06 | `tasks/06-PATCHES-MODULE.md` | Patch CRUD, test/approve, deployments | Tasks 01, 02, 03 |
| 07 | `tasks/07-VULNERABILITIES-MODULE.md` | CVE tracking, exceptions, stats | Tasks 01, 02, 03 |

### P1 Features (Parallel After P0)
| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| 08 | `tasks/08-JOBS-MODULE.md` | Patch jobs, software jobs, config jobs | Tasks 03-07 |
| 09 | `tasks/09-DISCOVERY-MODULE.md` | IP discovery, credentials, network scan | Tasks 03-05 |
| 10 | `tasks/10-DASHBOARD-REPORTS-MODULE.md` | Widgets, reports, PDF/CSV export | Tasks 03-07 |

### P2 Features (Parallel After P1)
| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| 11 | `tasks/11-SETTINGS-MODULE.md` | Organization, users, roles, policies | Tasks 03 |
| 12 | `tasks/12-TAGS-ONBOARDING-MODULE.md` | Tags, user onboarding | Tasks 03, 05 |
| 13 | `tasks/13-EXTERNAL-INTEGRATIONS.md` | NIST NVD, SMTP, LDAP | Tasks 03, 07, 11 |

### Testing & Validation (After All Features)
| Task | File | Description | Dependencies |
|------|------|-------------|--------------|
| 14 | `tasks/14-E2E-TESTING.md` | End-to-end tests with frontend | All above |

## Shared Resources

| File | Purpose |
|------|---------|
| `shared/database-schema.sql` | Complete PostgreSQL schema |
| `shared/api-conventions.md` | REST API patterns and standards |
| `shared/testing-patterns.md` | TDD patterns and test utilities |
| `external-deps/README.md` | External dependency handling |
| `external-deps/nist-nvd.md` | NIST NVD integration guide |
| `external-deps/mock-services.md` | Mock service implementations |

## Execution Guide

### For Single Agent
```bash
# Execute tasks in order
1. Complete tasks 00-02 (serial)
2. Complete tasks 03-07 (can be parallel with proper DB isolation)
3. Complete tasks 08-10
4. Complete tasks 11-13
5. Complete task 14
```

### For Multiple Parallel Agents

**Agent 1 (Infrastructure Lead):**
- Task 00: Project Setup
- Task 01: Database Setup
- Task 02: Core Utilities
- Task 11: Settings Module

**Agent 2 (Auth & Agents):**
- Task 03: Auth Module
- Task 04: Agents Module
- Task 09: Discovery Module

**Agent 3 (Assets & Patches):**
- Task 05: Assets Module
- Task 06: Patches Module
- Task 12: Tags & Onboarding

**Agent 4 (Vulnerabilities & Jobs):**
- Task 07: Vulnerabilities Module
- Task 08: Jobs Module
- Task 13: External Integrations

**Agent 5 (Dashboard & Testing):**
- Task 10: Dashboard & Reports
- Task 14: E2E Testing

### Coordination Rules

1. **Database Migrations**: Only one agent runs migrations at a time
2. **Shared Types**: Define types in a shared package, import don't copy
3. **Test Isolation**: Each module has its own test database namespace
4. **Branch Strategy**: Each task gets its own feature branch, merge to `backend-dev`

## Reference Documents

All task files reference these source documents:

| Document | Location |
|----------|----------|
| API Specs | `backend-debt/*.yaml` |
| Implementation Guides | `backend-debt/*-IMPLEMENTATION.md` |
| Gaps Analysis | `backend-debt/GAPS-ANALYSIS.md` |
| Agent Contracts | `../agent-dev/contracts/` |
| Frontend Types | `frontend/src/types/*.ts` |
| MSW Handlers | `frontend/src/mocks/handlers/*.ts` |

## TDD Workflow

Each task follows this pattern:

```
1. Read API spec (YAML)
2. Read implementation guide (MD)
3. Write test file based on TDD scenarios
4. Run tests (should fail)
5. Implement feature
6. Run tests (should pass)
7. Add integration tests
8. Document any gaps found
```

## Success Criteria

- [ ] All API endpoints return responses matching MSW handlers
- [ ] All TDD scenarios pass
- [ ] Database migrations are reversible
- [ ] 80%+ code coverage
- [ ] Frontend can switch from MSW to real API without changes
- [ ] External dependencies have mock fallbacks
