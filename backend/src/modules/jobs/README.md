# Module: jobs

## Responsibility

Manages job catalog and policy definitions for patch, vulnerability, software, and configuration deployments. This is the "what to deploy" module -- actual execution is handled by the deployments module.

## Endpoints

### Patch Jobs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/jobs/patch | List patch jobs | Yes |
| POST | /v1/jobs/patch | Create patch job | Yes |
| GET | /v1/jobs/patch/:id | Get patch job | Yes |
| DELETE | /v1/jobs/patch/:id | Delete patch job | Yes |

### Vulnerability Jobs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/jobs/vulnerability | List vulnerability jobs | Yes |
| POST | /v1/jobs/vulnerability | Create vulnerability job | Yes |
| GET | /v1/jobs/vulnerability/db-sync | Get vulnerability DB sync config | Yes |
| PUT | /v1/jobs/vulnerability/db-sync | Update vulnerability DB sync config | Yes |
| POST | /v1/jobs/vulnerability/db-sync/now | Trigger vulnerability DB sync | Yes |
| GET | /v1/jobs/vulnerability/:id | Get vulnerability job | Yes |
| DELETE | /v1/jobs/vulnerability/:id | Delete vulnerability job | Yes |

### Software Deployments

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/jobs/software/deployed | List software deployments | Yes |
| POST | /v1/jobs/software/deployed | Create software deployment | Yes |
| GET | /v1/jobs/software/deployed/:id | Get software deployment | Yes |
| GET | /v1/jobs/software/deployed/:id/tasks | Get deployment tasks | Yes |
| DELETE | /v1/jobs/software/deployed/:id | Delete software deployment | Yes |

### Configuration Catalog

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/jobs/config/catalog | List config catalog | Yes |
| POST | /v1/jobs/config/catalog | Create config catalog entry | Yes |
| GET | /v1/jobs/config/catalog/:id | Get config catalog entry | Yes |
| PUT | /v1/jobs/config/catalog/:id | Update config catalog entry | Yes |
| DELETE | /v1/jobs/config/catalog/:id | Delete config catalog entry | Yes |

### Configuration Bundles

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/jobs/config/bundles | List config bundles | Yes |
| POST | /v1/jobs/config/bundles | Create config bundle | Yes |
| GET | /v1/jobs/config/bundles/:id | Get config bundle | Yes |
| PUT | /v1/jobs/config/bundles/:id | Update config bundle | Yes |
| DELETE | /v1/jobs/config/bundles/:id | Delete config bundle | Yes |

### Configuration Deployments

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/jobs/config/deployed | List config deployments | Yes |
| POST | /v1/jobs/config/deployed | Create config deployment | Yes |
| GET | /v1/jobs/config/deployed/:id/tasks | Get config deployment tasks | Yes |
| DELETE | /v1/jobs/config/deployed/:id | Delete config deployment | Yes |

### Deployment Policies

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/deployment-policies | List deployment policies | Yes |
| POST | /v1/deployment-policies | Create deployment policy | Yes |
| GET | /v1/deployment-policies/:id | Get deployment policy | Yes |
| PUT | /v1/deployment-policies/:id | Update deployment policy | Yes |
| DELETE | /v1/deployment-policies/:id | Delete deployment policy | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

Job creation: define what to deploy (patches, configs, software) -> set targets and schedule -> deployments module executes.

## Key Files

- `jobs.controller.ts` — Route handlers for all job types
- `jobs.service.ts` — Business logic for job CRUD and deployment policies
- `jobs.validators.ts` — Zod schemas for all job types
- `jobs.routes.ts` — Route definitions (exports jobsRoutes + deploymentPoliciesRoutes)
- `jobs.types.ts` — Type definitions
- `deployment-policy-crud.service.ts` — BaseCrudService for deployment policies

## Dependencies

- **Depends on:** (none -- standalone catalog/policy module)
- **Depended on by:** deployments (uses job definitions to execute), settings (deployment policies also managed in settings)

## Notes

- Exports two routers: `jobsRoutes` (/v1/jobs/*) and `deploymentPoliciesRoutes` (/v1/deployment-policies/*)
- Deployment policies are managed both here and in the settings module (dual routes)
- This module defines "what" to deploy; the deployments module handles "how"
