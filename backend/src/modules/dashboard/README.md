# Module: dashboard

## Responsibility

Provides aggregated statistics, charts, and activity feeds for the main dashboard view. Combines data from assets, patches, vulnerabilities, and agents into a single overview.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/dashboard | Get complete dashboard data | Yes |
| POST | /v1/dashboard/refresh | Refresh dashboard data | Yes |
| GET | /v1/dashboard/stats | Get statistics summary | Yes |
| GET | /v1/dashboard/compliance | Get patch compliance data | Yes |
| GET | /v1/dashboard/top-vulnerabilities | Get top vulnerabilities | Yes |
| GET | /v1/dashboard/charts/patches | Patch distribution chart | Yes |
| GET | /v1/dashboard/charts/assets | Asset status chart | Yes |
| GET | /v1/dashboard/charts/vulnerabilities | Vulnerability trends chart | Yes |
| GET | /v1/dashboard/agents | Agent connectivity data | Yes |
| GET | /v1/dashboard/recent-activity | Recent activity feed | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma (aggregation queries) → Response
```

Dashboard service runs aggregation queries across multiple tables (assets, patches, vulnerabilities, agents, deployments) and returns pre-computed statistics.

## Key Files

- `dashboard.controller.ts` — Route handlers
- `dashboard.service.ts` — Aggregation queries and statistics computation
- `dashboard.types.ts` — Type definitions for dashboard responses
- `dashboard.routes.ts` — Route definitions (uses dashboard.validators.ts for query validation)

## Dependencies

- **Depends on:** assets, patches, vulnerabilities, agents (reads data from all for aggregation)
- **Depended on by:** (none -- read-only consumer)

## Notes

- All routes require both `authenticate` and `requireUser` middleware
- Dashboard data is computed on-demand; `POST /refresh` forces recomputation
- Chart endpoints accept query params for date range filtering
