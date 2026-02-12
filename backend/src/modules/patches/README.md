# Module: patches

## Responsibility

Manages the complete patch lifecycle: CRUD, test/approve workflow, supersedence management, affected software tracking, bundle streaming, zero-touch deployment configs, patch tests, and asset-patch recommendations.

## Endpoints

### Patches CRUD

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patches | List patches (with filtering/pagination) | Yes |
| POST | /v1/patches | Create a new patch | Yes |
| GET | /v1/patches/test-approve | List patches pending test/approval | Yes |
| POST | /v1/patches/discover | Run Hub-scoped patch discovery | Yes |
| GET | /v1/patches/:id | Get patch by ID | Yes |
| PUT | /v1/patches/:id | Update patch | Yes |
| DELETE | /v1/patches/:id | Delete patch | Yes |

### Patch Related Data

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patches/:id/affected-softwares | Get affected products | Yes |
| POST | /v1/patches/:id/affected-softwares | Add affected product | Yes |
| DELETE | /v1/patches/:id/affected-softwares/:productId | Remove affected product | Yes |
| GET | /v1/patches/:id/bundle/stream | Stream patch bundle (installer) from MinIO | Yes |
| GET | /v1/patches/:id/vulnerabilities | Get related vulnerabilities | Yes |
| GET | /v1/patches/:id/recommendations | Get asset recommendations for this patch | Yes |

### Supersedence

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patches/:id/superseded | Get patches superseded by this patch | Yes |
| GET | /v1/patches/:id/superseding | Get patches that supersede this patch | Yes |
| POST | /v1/patches/:id/supersede/:targetId | Mark target as superseded | Yes |
| DELETE | /v1/patches/:id/supersede/:targetId | Remove supersedence relationship | Yes |

### Test & Approve Workflow

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /v1/patches/:id/test | Mark patch as tested | Yes |
| POST | /v1/patches/:id/approve | Approve patch for deployment | Yes |
| POST | /v1/patches/:id/reject | Reject patch | Yes |

### Patch Tests

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patch-tests | List patch tests | Yes |
| POST | /v1/patch-tests | Create patch test | Yes |
| GET | /v1/patch-tests/:id | Get patch test by ID | Yes |
| PUT | /v1/patch-tests/:id/approve | Approve patch test | Yes |
| DELETE | /v1/patch-tests/:id | Delete patch test | Yes |

### Zero Touch Configs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/zero-touch-configs | List zero touch configs | Yes |
| POST | /v1/zero-touch-configs | Create zero touch config | Yes |
| GET | /v1/zero-touch-configs/:id | Get zero touch config | Yes |
| PUT | /v1/zero-touch-configs/:id | Update zero touch config | Yes |
| DELETE | /v1/zero-touch-configs/:id | Delete zero touch config | Yes |

### Patch Recommendations

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patch-recommendations/dashboard | Recommendation dashboard stats | Yes |
| GET | /v1/patch-recommendations | List all recommendations | Yes |
| GET | /v1/patch-recommendations/:id | Get a single recommendation | Yes |
| POST | /v1/patch-recommendations/:id/accept | Accept a recommendation | Yes |
| POST | /v1/patch-recommendations/:id/reject | Reject a recommendation | Yes |
| POST | /v1/patch-recommendations/:id/deploy | Deploy a recommendation | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

Patch discovery: scan Hub packages -> match against installed software -> create patch records.
Test/Approve: patch created -> tested -> approved -> available for deployment.
Deployment: patch -> create deployment -> send command to agent -> agent downloads bundle from MinIO.

## Key Files

- `patches.controller.ts` — Patch CRUD, test/approve, supersedence, deployments, zero-touch, patch-tests
- `patches.service.ts` — Core patch business logic, discovery, bundle streaming
- `patches.validator.ts` — Zod schemas for all endpoints
- `patches.routes.ts` — Route definitions (exports patchRoutes, patchTestRoutes, zeroTouchConfigRoutes)
- `asset-patch-recommendation.controller.ts` — Recommendation endpoints
- `asset-patch-recommendation.service.ts` — Recommendation matching logic
- `asset-patch-recommendation.routes.ts` — Recommendation route definitions
- `patches.types.ts` — Type definitions

## Dependencies

- **Depends on:** patch-repository (queueDownloadJob), hub (bundle streaming via MinIO)
- **Depended on by:** assets (patch-recommendations tab), dashboard (patch statistics)

## Notes

- This module exports 4 routers: patchRoutes, patchTestRoutes, zeroTouchConfigRoutes, assetPatchRecommendationRoutes
- Deployment routes are defined in the `deployments` module (see `deployments/deployment.routes.ts`)
- Bundle streaming endpoint is also mounted publicly in app.ts (without auth) for agent access
- Patch discovery (`POST /v1/patches/discover`) scans Hub packages to auto-create patches
