# Module: patch-templates

## Responsibility

Manages the software catalog of known vendor patches. Fetches latest versions from vendor APIs (e.g., GitHub releases, vendor download pages) and syncs them as packages to the Hub.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/patch-templates | List all templates | Yes |
| GET | /v1/patch-templates/:id/latest | Get latest version for a template | Yes |
| POST | /v1/patch-templates/sync | Sync all templates to Hub | Yes |
| POST | /v1/patch-templates/:id/sync | Sync one template to Hub | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Vendor APIs → Hub → Prisma → Response
```

Sync flow: fetch latest version from vendor API -> compare with Hub package -> create/update Hub package if newer version available.

## Key Files

- `patch-templates.controller.ts` — Route handlers
- `catalog-sync.service.ts` — Vendor API fetching and Hub sync logic
- `vendor-fetchers.ts` — Per-vendor API integration (GitHub, etc.)
- `patch-templates.validators.ts` — Zod schemas
- `patch-templates.routes.ts` — Route definitions

## Dependencies

- **Depends on:** hub (hubService -- creates/updates packages in Hub)
- **Depended on by:** (none -- initiates sync to Hub)

## Notes

- Vendor fetchers are pluggable -- each vendor has its own fetch implementation
- Sync is idempotent -- re-running sync only creates packages for newer versions
- Latest version query supports optional platform filter
