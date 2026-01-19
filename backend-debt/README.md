# PatchIQ Backend Debt Documentation

## Overview
This directory contains comprehensive backend implementation guides for the PatchIQ platform. Each document outlines API contracts, data models, and TDD scenarios based on the frontend implementation.

## Document Structure

### Implementation Guides (MD files)
| File | Domain | Priority |
|------|--------|----------|
| `AUTH-IMPLEMENTATION.md` | Authentication & User Management | P0 |
| `ASSETS-IMPLEMENTATION.md` | Asset Management | P0 |
| `PATCHES-IMPLEMENTATION.md` | Patch Management | P0 |
| `AGENTS-IMPLEMENTATION.md` | Agent Discovery & Management | P0 |
| `VULNERABILITY-IMPLEMENTATION.md` | Vulnerability Management | P1 |
| `DISCOVERY-IMPLEMENTATION.md` | IP Discovery & Credentials | P1 |
| `JOBS-IMPLEMENTATION.md` | Jobs & Deployments | P1 |
| `SETTINGS-IMPLEMENTATION.md` | Settings & Configuration | P2 |
| `DASHBOARD-REPORTS-IMPLEMENTATION.md` | Dashboard & Reports | P2 |

### OpenAPI Specifications (YAML files)
| File | Domain |
|------|--------|
| `auth-api.yaml` | Authentication endpoints |
| `assets-api.yaml` | Asset CRUD operations |
| `patches-api.yaml` | Patch management |
| `agents-api.yaml` | Agent management |
| `vulnerability-api.yaml` | Vulnerability operations |
| `discovery-api.yaml` | Discovery operations |
| `jobs-api.yaml` | Job management |
| `settings-api.yaml` | All settings endpoints |

## Quick Reference

### API Base URL
- All endpoints: `/v1/*`
- Auth: `/v1/auth/*`
- Settings: `/v1/settings/*`
- Other: `/v1/{resource}/*`

### Common Patterns
- All responses: JSON
- Auth: Bearer token in Authorization header
- Pagination: `?page=1&limit=20`
- Errors: `{ "error": "message", "code": "ERROR_CODE" }`
- Timestamps: ISO 8601 format
- IDs: UUIDs

### Priority Legend
- **P0**: Core functionality, implement first
- **P1**: Important features, implement after P0
- **P2**: Nice to have, implement last

## Frontend References
- Pages: `frontend/src/pages/`
- Services: `frontend/src/services/`
- Types: `frontend/src/types/`
- Mock Handlers: `frontend/src/mocks/handlers/`

## Implementation Order
1. Auth (login, user management)
2. Agents (registration, heartbeat)
3. Assets (CRUD, categories, tags)
4. Patches (CRUD, deployments)
5. Discovery (IP ranges, credentials)
6. Vulnerability (scanning, exceptions)
7. Jobs (all job types)
8. Settings (all settings pages)
9. Dashboard & Reports
