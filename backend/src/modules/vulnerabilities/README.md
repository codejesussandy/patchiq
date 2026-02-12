# Module: vulnerabilities

## Responsibility

Manages vulnerability tracking, CVE database synchronization, vulnerability scanning, exception management, zero-day detection, and CPE-based software correlation. Provides both vulnerability listing and CVE sync capabilities.

## Endpoints

### Core Vulnerabilities

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/vulnerabilities | List vulnerabilities (non-zero-day) | Yes |
| GET | /v1/vulnerabilities/:id | Get vulnerability by ID | Yes |
| GET | /v1/vulnerabilities/stats | Get vulnerability statistics | Yes |
| GET | /v1/vulnerabilities/types | Get vulnerability type counts | Yes |
| GET | /v1/vulnerabilities/endpoints | Get endpoint vulnerabilities | Yes |
| GET | /v1/vulnerabilities/network | Get network vulnerabilities | Yes |
| GET | /v1/vulnerabilities/zero-day | List zero-day vulnerabilities | Yes |

### CVE Suggestions & CPE Correlation

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/vulnerabilities/cve-suggest | Suggest CVEs for a software name | Yes |
| GET | /v1/vulnerabilities/cpe-stats | Get CPE mapping statistics | Yes |
| GET | /v1/vulnerabilities/unmatched-software | List software not mapped to CPE | Yes |
| PUT | /v1/vulnerabilities/unmatched-software/:id/resolve | Mark unmatched software as resolved | Yes |

### CVE-specific Routes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/vulnerabilities/:cve/endpoints | Get affected endpoints for a CVE | Yes |
| GET | /v1/vulnerabilities/:cve/software | Get affected software for a CVE | Yes |

### Exceptions

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/vulnerabilities/exceptions | List all exceptions | Yes |
| POST | /v1/vulnerabilities/exceptions | Create exception(s) | Yes |
| PUT | /v1/vulnerabilities/exceptions/:id | Update exception | Yes |
| DELETE | /v1/vulnerabilities/exceptions/:id | Delete exception | Yes |

### Scanning

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /v1/vulnerabilities/scan | Trigger vulnerability scan | Yes |

### CVE Sync

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/vulnerabilities/sync/status | Get CVE database sync status | Yes |
| POST | /v1/vulnerabilities/sync | Trigger background CVE database sync | Yes |
| POST | /v1/vulnerabilities/sync/full | Trigger full CVE sync (blocking) | Yes |
| GET | /v1/vulnerabilities/cve/:cveId | Get specific CVE by ID (fetches from NVD if missing) | Yes |
| POST | /v1/vulnerabilities/scan/asset/:assetId | Scan specific asset for vulnerabilities | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

CVE Sync: fetch from NVD API -> parse CPE data -> store in local DB -> correlate with installed software.
Vulnerability Scan: get asset software -> match CPEs -> find CVEs -> create AssetVulnerability records.

## Key Files

- `vulnerabilities.controller.ts` — Main vulnerability endpoints
- `vulnerabilities.service.ts` — Vulnerability queries, exception management, scanning
- `vulnerabilities.validators.ts` — Zod schemas
- `vulnerabilities.routes.ts` — Main vulnerability routes
- `cve-sync.routes.ts` — CVE sync routes (inline controller logic)

## Dependencies

- **Depends on:** shared/services/cve-database.service (NVD API integration, CPE matching)
- **Depended on by:** assets (asset vulnerability tab), dashboard (vulnerability charts), patches (CVE suggestions for patch creation)

## Notes

- All routes require both `authenticate` and `requireUser` middleware
- CVE sync routes (`cve-sync.routes.ts`) use inline controller logic rather than a separate controller file
- `POST /v1/vulnerabilities/sync` is non-blocking (fires sync in background), while `/sync/full` waits for completion
- CVE ID format is validated with regex: `^CVE-\d{4}-\d{4,}$`
