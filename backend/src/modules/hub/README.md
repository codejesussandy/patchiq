# Module: hub

## Responsibility

Manages the software package repository (Hub) stored in MinIO. Handles package CRUD, bundle uploads, script-based packages (install/update/rollback/uninstall), and execution payload generation for agent deployments.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/hub/stats | Get Hub statistics | Yes |
| GET | /v1/hub/packages/grouped | List packages grouped by name + platform | Yes |
| GET | /v1/hub/packages | List packages | Yes |
| POST | /v1/hub/packages | Create package (legacy) | Yes |
| POST | /v1/hub/packages/with-scripts | Create package with inline scripts | Yes |
| POST | /v1/hub/packages/upload-bundle | Upload package bundle (.tar.gz) | Yes |
| GET | /v1/hub/packages/:packageId | Get package by ID | Yes |
| PUT | /v1/hub/packages/:packageId | Update package | Yes |
| DELETE | /v1/hub/packages/:packageId | Delete package | Yes |
| POST | /v1/hub/packages/:packageId/upload | Upload file for package (legacy) | Yes |
| GET | /v1/hub/packages/:packageId/download-url | Get download URL (legacy) | Yes |
| GET | /v1/hub/packages/:packageId/bundle | Get bundle download info | Yes |
| GET | /v1/hub/packages/:packageId/execution-payload/:operationType | Get execution payload for agent | Yes |
| GET | /v1/hub/bundles | List bundles | Yes |
| POST | /v1/hub/bundles | Create bundle | Yes |
| GET | /v1/hub/bundles/:bundleId | Get bundle by ID | Yes |
| DELETE | /v1/hub/bundles/:bundleId | Delete bundle | Yes |
| GET | /v1/bundles/:packageId/download | Download bundle stream (public) | No |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → MinIO (S3) + Prisma → Response
```

Package creation: upload installer + scripts -> store in MinIO as .tar.gz bundle -> create DB record.
Execution payload: agent requests payload for operation type -> Hub returns script content + bundle download URL.

## Key Files

- `hub.controller.ts` — Route handlers (singleton `hubController`)
- `hub.service.ts` — Package/bundle CRUD, MinIO operations, execution payload generation
- `hub.validators.ts` — Zod schemas
- `hub.routes.ts` — Route definitions
- `hub.types.ts` — Type definitions

## Dependencies

- **Depends on:** shared/services (MinIO for file storage)
- **Depended on by:** deployments (resolves packages and execution payloads), patches (discovers patches from Hub packages), patch-templates (syncs catalog entries to Hub)

## Notes

- Bundle upload uses multer with 500MB file size limit
- Public bundle download endpoint is mounted in `app.ts` before auth middleware for agent access
- Two package creation modes: legacy (single file) and Hub-centric (with inline scripts)
- Execution payload endpoint returns different data based on operationType (install, update, rollback, uninstall)
