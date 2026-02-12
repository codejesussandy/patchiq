# Module: reports

## Responsibility

Manages report generation, scheduling, downloading, and email distribution. Supports report templates, scheduled recurring reports, and on-demand generation.

## Endpoints

### Reports CRUD

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/reports | List reports | Yes |
| POST | /v1/reports | Create report (wizard or simple) | Yes |
| GET | /v1/reports/:id | Get report by ID | Yes |
| PUT | /v1/reports/:id | Update report | Yes |
| DELETE | /v1/reports/:id | Delete report | Yes |
| GET | /v1/reports/:id/download | Download report file | Yes |
| POST | /v1/reports/:id/regenerate | Regenerate report | Yes |
| POST | /v1/reports/:id/send | Send report via email | Yes |

### Templates

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/reports/templates | Get available report templates | Yes |

### Schedules

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/reports/schedules | List report schedules | Yes |
| POST | /v1/reports/schedules | Create schedule | Yes |
| PUT | /v1/reports/schedules/:id | Update schedule | Yes |
| DELETE | /v1/reports/schedules/:id | Delete schedule | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

Report generation: select template -> configure parameters -> generate report -> store in MinIO -> download or email.

## Key Files

- `reports.controller.ts` — Route handlers
- `reports.service.ts` — Report generation, scheduling, email distribution
- `reports.validators.ts` — Zod schemas
- `reports.routes.ts` — Route definitions
- `reports.types.ts` — Type definitions

## Dependencies

- **Depends on:** shared/services (MinIO for report file storage, email service for distribution), assets/patches/vulnerabilities (data sources for report content)
- **Depended on by:** (none)

## Notes

- All routes require both `authenticate` and `requireUser` middleware
- Templates endpoint must be defined before `:id` routes to avoid parameter conflict
- Schedules endpoint must also be defined before `:id` routes
- Reports can be created via wizard (multi-step) or simple (single-step) flows
