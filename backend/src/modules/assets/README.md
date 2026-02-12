# Module: assets

## Responsibility

Manages the asset inventory including endpoints (computers/servers), categories, subcategories, tags, software inventory, software licenses, and OS licenses. Provides detailed per-asset views (hardware, software, security, network, peripherals, telemetry, patches, vulnerabilities, deployments).

## Endpoints

### Categories

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/categories | List categories | Yes |
| GET | /v1/categories/:id | Get category by ID | Yes |
| POST | /v1/categories | Create category | Yes |
| PUT | /v1/categories/:id | Update category | Yes |
| DELETE | /v1/categories/:id | Delete category | Yes |

### SubCategories

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/subcategories | List subcategories | Yes |
| GET | /v1/subcategories/:id | Get subcategory by ID | Yes |
| POST | /v1/subcategories | Create subcategory | Yes |
| PUT | /v1/subcategories/:id | Update subcategory | Yes |
| DELETE | /v1/subcategories/:id | Delete subcategory | Yes |

### Tags

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/tags | List tags | Yes |
| GET | /v1/tags/popular | Get popular tags | Yes |
| GET | /v1/tags/:id | Get tag by ID | Yes |
| POST | /v1/tags | Create tag | Yes |
| PUT | /v1/tags/:id | Update tag | Yes |
| DELETE | /v1/tags/:id | Delete tag | Yes |
| POST | /v1/assets/bulk-tags | Bulk assign tags to multiple assets | Yes |

### Assets

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/assets | List assets (with filtering/pagination) | Yes |
| POST | /v1/assets | Create asset manually | Yes |
| POST | /v1/assets/bulk | Bulk delete assets | Yes |
| GET | /v1/assets/:id | Get asset summary | Yes |
| GET | /v1/assets/:id/full | Get asset with all relations | Yes |
| PUT | /v1/assets/:id | Update asset | Yes |
| DELETE | /v1/assets/:id | Delete asset | Yes |
| GET | /v1/assets/:id/lifecycle | Get asset lifecycle events | Yes |
| GET | /v1/assets/:id/hardware | Get asset hardware info | Yes |
| GET | /v1/assets/:id/hardware/expanded | Get expanded hardware details | Yes |
| GET | /v1/assets/:id/software | Get installed software | Yes |
| GET | /v1/assets/:id/security | Get security posture | Yes |
| GET | /v1/assets/:id/network | Get network interfaces | Yes |
| GET | /v1/assets/:id/peripherals | Get peripheral devices | Yes |
| GET | /v1/assets/:id/telemetry | Get current telemetry | Yes |
| GET | /v1/assets/:id/telemetry/history | Get telemetry history | Yes |
| GET | /v1/assets/:id/errors | Get asset errors | Yes |
| GET | /v1/assets/:id/audit-log | Get asset audit log | Yes |
| GET | /v1/assets/:id/alerts | Get asset alerts | Yes |
| GET | /v1/assets/:id/patches | Get asset patches | Yes |
| GET | /v1/assets/:id/patch-recommendations | Get patch recommendations | Yes |
| GET | /v1/assets/:id/vulnerabilities | Get asset vulnerabilities | Yes |
| GET | /v1/assets/:id/deployments | Get asset deployments | Yes |
| POST | /v1/assets/:id/attachments | Upload asset attachment | Yes |
| POST | /v1/assets/:id/refresh | Force inventory refresh | Yes |
| POST | /v1/assets/:id/tags | Add tags to asset | Yes |
| DELETE | /v1/assets/:id/tags/:tagId | Remove tag from asset | Yes |

### Software Inventory

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/software-inventory | List software inventory | Yes |
| GET | /v1/software-inventory/:id | Get software inventory item | Yes |
| POST | /v1/software-inventory/import | Import software inventory | Yes |

### Software Licenses

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/software-licenses | List software licenses | Yes |
| GET | /v1/software-licenses/:id | Get software license | Yes |
| POST | /v1/software-licenses | Create software license | Yes |
| PUT | /v1/software-licenses/:id | Update software license | Yes |
| DELETE | /v1/software-licenses/:id | Delete software license | Yes |
| POST | /v1/software-licenses/import | Import software licenses | Yes |

### OS Licenses

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/os-licenses | List OS licenses | Yes |
| GET | /v1/os-licenses/:id | Get OS license | Yes |
| POST | /v1/os-licenses | Create OS license | Yes |
| PUT | /v1/os-licenses/:id | Update OS license | Yes |
| DELETE | /v1/os-licenses/:id | Delete OS license | Yes |
| POST | /v1/os-licenses/import | Import OS licenses | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

Assets are created either manually via the API or automatically when an agent submits inventory data. The module delegates patch-recommendation queries to the patches module via dynamic import.

## Key Files

- `assets.controller.ts` — Route handlers for all asset endpoints
- `assets.service.ts` — Core asset business logic
- `assets.validators.ts` — Zod schemas for all endpoints
- `assets.routes.ts` — Route definitions (mounted at /v1/ root, not /v1/assets/)
- `assets.transformer.ts` — Data transformation utilities
- `assets.types.ts` — Type definitions
- `category-crud.service.ts` — BaseCrudService for categories
- `subcategory-crud.service.ts` — BaseCrudService for subcategories
- `tag-crud.service.ts` — BaseCrudService for tags
- `software-license-crud.service.ts` — BaseCrudService for software licenses
- `os-license-crud.service.ts` — BaseCrudService for OS licenses

## Dependencies

- **Depends on:** patches (patch-recommendation controller, dynamic import), agents (inventory populates assets)
- **Depended on by:** patches (asset-patch recommendations), vulnerabilities (asset vulnerability scanning), dashboard (asset statistics), deployments (target assets)

## Notes

- Routes are mounted at `/v1/` root (not `/v1/assets/`) because they include categories, subcategories, tags, software-inventory, software-licenses, and os-licenses as sibling resources
- `/v1/assets/:id/patch-recommendations` dynamically imports from the patches module to avoid circular dependencies
- Bulk delete uses POST `/v1/assets/bulk` (not DELETE) to allow request body with asset IDs
