# Module: software-catalog

## Responsibility

Populates the SoftwarePackage database table from external package repositories (Chocolatey, Homebrew, npm, PyPI). This catalog is used for matching agent-reported software, correlating patches, and vulnerability scanning. No HTTP endpoints -- this is a background service.

## Endpoints

This module has no HTTP endpoints. It is a background service for catalog population.

## Data Flow

```
External APIs (Chocolatey, Homebrew, npm, PyPI) → SoftwareCatalogPopulatorService → Prisma (SoftwarePackage upserts)
```

## Key Files

- `software-catalog-populator.service.ts` — Fetches packages from external repositories and upserts into SoftwarePackage table

## Dependencies

- **Depends on:** (none -- uses Prisma directly and external HTTP APIs)
- **Depended on by:** patches (software matching for patch recommendations), vulnerabilities (CPE correlation)

## Notes

- Fetches from Chocolatey OData API, Homebrew formula JSON, npm registry, and PyPI
- Uses `packageId` prefix pattern for source identification (e.g., `CHOCO-{id}`)
- Includes automatic categorization of packages based on name/title
- Descriptions are truncated to 500 characters
- Each source has configurable limits for number of packages to fetch
