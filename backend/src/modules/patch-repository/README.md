# Module: patch-repository

## Responsibility

Manages central patch file storage with MinIO. Handles patch sources (download URLs), download job queuing via BullMQ, patch file distribution to agents, and repository statistics.

## Endpoints

### Patch Sources

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patch-repository/sources | List patch sources | Yes |
| POST | /v1/patch-repository/sources | Create patch source | Yes |
| GET | /v1/patch-repository/sources/:id | Get patch source | Yes |
| PUT | /v1/patch-repository/sources/:id | Update patch source | Yes |
| DELETE | /v1/patch-repository/sources/:id | Delete patch source | Yes |
| PATCH | /v1/patch-repository/sources/:id/toggle | Toggle source enabled/disabled | Yes |

### Download Jobs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patch-repository/downloads | List download jobs | Yes |
| POST | /v1/patch-repository/downloads | Create download job | Yes |
| POST | /v1/patch-repository/downloads/bulk | Bulk create download jobs | Yes |
| GET | /v1/patch-repository/downloads/:jobId | Get download job | Yes |
| POST | /v1/patch-repository/downloads/:jobId/retry | Retry failed download | Yes |
| POST | /v1/patch-repository/downloads/:jobId/cancel | Cancel download job | Yes |

### Patch File Downloads

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patch-repository/patches/:patchId/download | Get presigned download URL | Yes |
| POST | /v1/patch-repository/patches/agent-downloads | Get download URLs for agents (batch) | Yes |

### Repository Stats & Sync

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patch-repository/stats | Get repository statistics | Yes |
| POST | /v1/patch-repository/sync | Trigger source sync | Yes |
| GET | /v1/patch-repository/sync/:sourceId | Get sync status for source | Yes |

### Utility

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /v1/patch-repository/validate-url | Validate URL against whitelist | Yes |

### Queue Management

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patch-repository/queue/stats | Get download queue statistics | Yes |
| POST | /v1/patch-repository/queue/pause | Pause download queue | Yes |
| POST | /v1/patch-repository/queue/resume | Resume download queue | Yes |
| POST | /v1/patch-repository/queue/clean | Clean old jobs from queue | Yes |
| POST | /v1/patch-repository/queue/start-pending | Start all pending downloads | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → BullMQ (queue) → Worker → MinIO → Prisma → Response
```

Download flow: create download job -> enqueue in BullMQ -> worker downloads file -> stores in MinIO -> updates DB with object key.

## Key Files

- `patch-repository.controller.ts` — Route handlers
- `patch-repository.service.ts` — Source management, download job creation, URL validation
- `download.worker.ts` — BullMQ worker that processes download jobs
- `patch-repository.validators.ts` — Zod schemas
- `patch-repository.routes.ts` — Route definitions
- `patch-repository.types.ts` — Type definitions
- `whitelist-sources.seed.ts` — Seed data for whitelisted download sources

## Dependencies

- **Depends on:** shared/services (MinIO for file storage, Redis/BullMQ for job queuing)
- **Depended on by:** patches (queueDownloadJob -- patches trigger downloads)

## Notes

- Download URLs are validated against a whitelist of approved sources
- BullMQ worker runs alongside the API server for processing downloads
- Queue management endpoints allow pausing/resuming downloads for maintenance
- Presigned URLs have time-limited access for security
