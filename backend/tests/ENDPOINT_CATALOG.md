# PatchIQ API Endpoint Catalog

Complete catalog of all HTTP endpoints registered in `app.ts`, organized by module.

## Response Envelope

All API responses follow this shape:

```
Success:     { success: true, data: T }
Paginated:   { success: true, data: T[], meta: { page, limit, total, totalPages } }
Error:       { success: false, error: { code, message, details? } }
```

Common error codes: `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `FORBIDDEN` (403).

---

## Non-Versioned / Public Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/v1` | None | API version info |
| GET | `/openapi.yaml` | None | OpenAPI spec |
| GET | `/api-docs` | None | Scalar API docs |
| GET | `/v1/bundles/:packageId/download` | None | Public bundle download |
| GET | `/v1/patches/:id/bundle/stream` | None | Public patch bundle stream |
| GET | `/v1/notifications/stream` | Query token | SSE notification stream |

---

## Auth Module (`/v1/auth`, `/v1/user`)

| Method | Path | Auth | Body/Query |
|--------|------|------|------------|
| POST | `/v1/auth/login` | None | `{ email, password }` |
| POST | `/v1/auth/logout` | Bearer | - |
| POST | `/v1/auth/refresh` | None | `{ refreshToken }` |
| POST | `/v1/auth/forgot-password` | None | `{ email }` |
| POST | `/v1/auth/reset-password` | None | `{ token, password }` |
| POST | `/v1/auth/onboard` | None | onboard schema |
| POST | `/v1/auth/complete-onboarding` | Bearer | `{ name, contactNumber }` |
| GET | `/v1/user/me` | Bearer | - |
| POST | `/v1/user/onboarding` | Bearer | `{ name, contactNumber }` |

---

## Agents Module (`/v1/agents`, `/api/agent`, `/v1/agent-versions`)

### Admin-Facing (`/v1/agents`) - All require Bearer auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/agents` | List agents (paginated) |
| GET | `/v1/agents/downloads` | Agent download links |
| GET | `/v1/agents/errors` | Agent errors |
| POST | `/v1/agents/bulk-update` | Bulk update agents |
| GET | `/v1/agents/:id` | Get agent |
| PUT | `/v1/agents/:id` | Update agent |
| DELETE | `/v1/agents/:id` | Delete agent |
| GET | `/v1/agents/:id/commands` | Command history |
| POST | `/v1/agents/:id/collect` | Trigger inventory |
| POST | `/v1/agents/:id/update` | Trigger agent update |
| GET | `/v1/agents/:id/telemetry/latest` | Latest telemetry |
| GET | `/v1/agents/:id/telemetry/stream` | Telemetry SSE |
| GET | `/v1/agents/:id/logs` | Agent logs |

### Agent API (`/api/agent`) - Agent JWT auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/agent/register` | None | Register agent |
| POST | `/api/agent/token/refresh` | None | Refresh agent token |
| GET | `/api/agent/update/binary/:versionId` | None | Download binary |
| POST | `/api/agent/heartbeat` | Agent JWT | Heartbeat |
| GET | `/api/agent/commands` | Agent JWT | Get pending commands |
| POST | `/api/agent/commands/:id/result` | Agent JWT | Submit result |
| GET | `/api/agent/config` | Agent JWT | Get config |
| POST | `/api/agent/inventory` | Agent JWT | Submit inventory |
| POST | `/api/agent/telemetry` | Agent JWT | Submit telemetry |
| POST | `/api/agent/logs` | Agent JWT | Submit logs |

### Agent Versions (`/v1/agent-versions`) - Bearer auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/agent-versions` | List versions |
| GET | `/v1/agent-versions/latest` | Latest version |
| POST | `/v1/agent-versions` | Create version |
| GET | `/v1/agent-versions/:id` | Get version |
| PUT | `/v1/agent-versions/:id` | Update version |
| DELETE | `/v1/agent-versions/:id` | Delete version |
| GET | `/v1/agent-versions/:id/download` | Download binary |
| POST | `/v1/agent-versions/:id/upload` | Upload binary |

---

## Assets Module (`/v1/`) - All require Bearer auth

### Assets CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/assets` | List assets (paginated) |
| POST | `/v1/assets` | Create asset |
| POST | `/v1/assets/bulk` | Bulk delete |
| GET | `/v1/assets/:id` | Get asset |
| GET | `/v1/assets/:id/full` | Full asset detail |
| PUT | `/v1/assets/:id` | Update asset |
| DELETE | `/v1/assets/:id` | Delete asset |

### Asset Details

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/assets/:id/hardware` | Hardware info |
| GET | `/v1/assets/:id/hardware/expanded` | Expanded hardware |
| GET | `/v1/assets/:id/software` | Software list |
| GET | `/v1/assets/:id/security` | Security info |
| GET | `/v1/assets/:id/network` | Network info |
| GET | `/v1/assets/:id/peripherals` | Peripherals |
| GET | `/v1/assets/:id/telemetry` | Telemetry |
| GET | `/v1/assets/:id/telemetry/history` | Telemetry history |
| GET | `/v1/assets/:id/lifecycle` | Lifecycle info |
| GET | `/v1/assets/:id/errors` | Errors |
| GET | `/v1/assets/:id/audit-log` | Audit log |
| GET | `/v1/assets/:id/alerts` | Alerts |
| GET | `/v1/assets/:id/patches` | Patches |
| GET | `/v1/assets/:id/vulnerabilities` | Vulnerabilities |
| GET | `/v1/assets/:id/deployments` | Deployments |
| GET | `/v1/assets/:id/patch-recommendations` | Recommendations |
| POST | `/v1/assets/:id/tags` | Add tags |
| DELETE | `/v1/assets/:id/tags/:tagId` | Remove tag |
| POST | `/v1/assets/:id/refresh` | Force refresh |
| POST | `/v1/assets/:id/attachments` | Upload attachment |
| GET | `/v1/endpoints/:id` | Endpoint detail |

### Categories & SubCategories

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/categories` | List/Create |
| GET/PUT/DELETE | `/v1/categories/:id` | CRUD |
| GET | `/v1/categories/:id/assets` | Assets in category |
| GET/POST | `/v1/subcategories` | List/Create |
| GET/PUT/DELETE | `/v1/subcategories/:id` | CRUD |
| GET | `/v1/subcategories/:id/assets` | Assets in subcategory |

### Tags

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/tags` | List/Create |
| GET/PUT/DELETE | `/v1/tags/:id` | CRUD |
| GET | `/v1/tags/popular` | Popular tags |
| GET | `/v1/tags/search` | Search tags |
| POST | `/v1/assets/bulk-tags` | Bulk assign |
| POST | `/v1/tags/bulk-assign` | Bulk assign |
| POST | `/v1/tags/bulk-remove` | Bulk remove |

### Licenses

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/software-licenses` | List/Create |
| GET/PUT/DELETE | `/v1/software-licenses/:id` | CRUD |
| POST | `/v1/software-licenses/import` | Import CSV |
| GET/POST | `/v1/os-licenses` | List/Create |
| GET/PUT/DELETE | `/v1/os-licenses/:id` | CRUD |
| POST | `/v1/os-licenses/import` | Import CSV |

### Software Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/software-inventory` | List |
| GET | `/v1/software-inventory/:id` | Get by ID |
| POST | `/v1/software-inventory/import` | Import |

---

## Patches Module (`/v1/patches`, `/v1/patch-tests`, `/v1/zero-touch-configs`, `/v1/patch-recommendations`)

### Patch CRUD - Bearer auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/patches` | List (paginated) |
| GET | `/v1/patches/test-approve` | Test/approve view |
| POST | `/v1/patches` | Create |
| POST | `/v1/patches/discover` | Discover patches |
| GET | `/v1/patches/:id` | Get patch |
| PUT | `/v1/patches/:id` | Update |
| DELETE | `/v1/patches/:id` | Delete |

### Patch Relations & Workflow

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/patches/:id/affected-softwares` | Affected software |
| POST | `/v1/patches/:id/affected-softwares` | Add affected software |
| DELETE | `/v1/patches/:id/affected-softwares/:productId` | Remove |
| GET | `/v1/patches/:id/vulnerabilities` | Related CVEs |
| GET | `/v1/patches/:id/endpoints` | Applicable endpoints |
| GET | `/v1/patches/:id/recommendations` | Recommendations |
| GET | `/v1/patches/:id/superseded` | Superseded patches |
| GET | `/v1/patches/:id/superseding` | Superseding patches |
| POST | `/v1/patches/:id/supersede/:targetId` | Create supersedence |
| DELETE | `/v1/patches/:id/supersede/:targetId` | Remove supersedence |
| POST | `/v1/patches/:id/test` | Submit test |
| POST | `/v1/patches/:id/approve` | Approve |
| POST | `/v1/patches/:id/reject` | Reject |
| POST | `/v1/patches/:id/scan-endpoints` | Scan endpoints |

### Patch Tests

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/patch-tests` | List/Create |
| GET | `/v1/patch-tests/:id` | Get |
| PUT | `/v1/patch-tests/:id/approve` | Approve |
| DELETE | `/v1/patch-tests/:id` | Delete |

### Zero Touch Configs

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/zero-touch-configs` | List/Create |
| GET/PUT/DELETE | `/v1/zero-touch-configs/:id` | CRUD |

### Patch Recommendations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/patch-recommendations/dashboard` | Dashboard |
| GET | `/v1/patch-recommendations` | List |
| GET | `/v1/patch-recommendations/:id` | Get |
| POST | `/v1/patch-recommendations/:id/accept` | Accept |
| POST | `/v1/patch-recommendations/:id/reject` | Reject |
| POST | `/v1/patch-recommendations/:id/deploy` | Deploy |
| POST | `/v1/patch-recommendations/bulk-accept` | Bulk accept |
| POST | `/v1/patch-recommendations/bulk-reject` | Bulk reject |
| POST | `/v1/patch-recommendations/bulk-deploy` | Bulk deploy |

---

## Vulnerabilities Module (`/v1/vulnerabilities`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/vulnerabilities` | List (paginated) |
| GET | `/v1/vulnerabilities/:id` | Get by ID |
| GET | `/v1/vulnerabilities/stats` | Statistics |
| GET | `/v1/vulnerabilities/types` | Vuln types |
| GET | `/v1/vulnerabilities/endpoints` | Affected endpoints |
| GET | `/v1/vulnerabilities/network` | Network vulns |
| GET | `/v1/vulnerabilities/cve-suggest` | CVE autocomplete |
| GET | `/v1/vulnerabilities/cpe-stats` | CPE stats |
| GET | `/v1/vulnerabilities/unmatched-software` | Unmatched software |
| PUT | `/v1/vulnerabilities/unmatched-software/:id/resolve` | Resolve |
| GET | `/v1/vulnerabilities/zero-day` | Zero-day list |
| GET | `/v1/vulnerabilities/:cve/endpoints` | CVE endpoints |
| GET | `/v1/vulnerabilities/:cve/software` | CVE software |
| GET/POST | `/v1/vulnerabilities/exceptions` | Exception CRUD |
| PUT/DELETE | `/v1/vulnerabilities/exceptions/:id` | Exception CRUD |
| POST | `/v1/vulnerabilities/scan` | Trigger scan |
| GET | `/v1/vulnerabilities/sync/status` | CVE sync status |
| POST | `/v1/vulnerabilities/sync` | Incremental sync |
| POST | `/v1/vulnerabilities/sync/full` | Full sync |
| GET | `/v1/vulnerabilities/sync/cve/:cveId` | Get CVE |
| POST | `/v1/vulnerabilities/sync/scan/asset/:assetId` | Scan asset |

---

## Jobs Module (`/v1/jobs`, `/v1/deployment-policies`)

### Patch Jobs

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/jobs/patch` | List/Create |
| GET/DELETE | `/v1/jobs/patch/:id` | Get/Delete |

### Vulnerability Jobs

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/jobs/vulnerability` | List/Create |
| GET/DELETE | `/v1/jobs/vulnerability/:id` | Get/Delete |
| GET/PUT | `/v1/jobs/vulnerability/db-sync` | DB sync config |
| POST | `/v1/jobs/vulnerability/db-sync/now` | Trigger sync |

### Software Deployments

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/jobs/software/deployed` | List/Create |
| GET | `/v1/jobs/software/deployed/:id` | Get |
| GET | `/v1/jobs/software/deployed/:id/tasks` | Tasks |
| DELETE | `/v1/jobs/software/deployed/:id` | Delete |

### Config Catalog/Bundles/Deployments

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/v1/jobs/config/catalog` | Config catalog |
| CRUD | `/v1/jobs/config/bundles` | Config bundles |
| GET/POST/DELETE | `/v1/jobs/config/deployed` | Config deployments |

### Deployment Policies

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/v1/deployment-policies` | Policy CRUD |

---

## Deployments Module (`/v1/deployments`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/deployments` | List/Create |
| GET/PUT/DELETE | `/v1/deployments/:id` | CRUD |
| GET | `/v1/deployments/:id/preview` | Preview |
| POST | `/v1/deployments/:id/execute` | Execute |
| POST | `/v1/deployments/:id/cancel` | Cancel |
| GET/POST | `/v1/deployments/software` | Software deployments |
| GET | `/v1/deployments/software/:id` | Status |
| POST | `/v1/deployments/software/:id/cancel` | Cancel |
| POST | `/v1/deployments/patch` | Create patch deployment |
| GET | `/v1/deployments/patch` | List |
| GET | `/v1/deployments/patch/:id` | Status |
| POST | `/v1/deployments/patch/:id/cancel` | Cancel |
| POST | `/v1/deployments/patch/:id/retry` | Retry |
| POST | `/v1/deployments/config` | Create config deployment |
| GET | `/v1/deployments/config/:id` | Status |

---

## Discovery Module (`/v1/discovery`)

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/v1/discovery/ip-ranges` | IP range management |
| POST | `/v1/discovery/ip-ranges/:id/scan` | Trigger scan |
| GET | `/v1/discovery/scans/:id` | Scan status |
| GET | `/v1/discovery/scans/:id/results` | Scan results |
| CRUD | `/v1/discovery/credentials` | Credential management |
| POST | `/v1/discovery/credentials/:id/test` | Test credential |
| GET | `/v1/discovery/devices` | Discovered devices |
| POST | `/v1/discovery/devices/:id/enroll` | Enroll device |

---

## Hub Module (`/v1/hub`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/hub/stats` | Hub stats |
| CRUD | `/v1/hub/packages` | Package management |
| GET | `/v1/hub/packages/grouped` | Grouped packages |
| POST | `/v1/hub/packages/with-scripts` | Create with scripts |
| POST | `/v1/hub/packages/upload-bundle` | Upload bundle |
| GET | `/v1/hub/packages/:id/bundle` | Bundle info |
| GET | `/v1/hub/packages/:id/execution-payload/:op` | Execution payload |
| CRUD | `/v1/hub/bundles` | Bundle management |

---

## Dashboard Module (`/v1/dashboard`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/dashboard` | Main dashboard |
| POST | `/v1/dashboard/refresh` | Refresh |
| GET | `/v1/dashboard/stats` | Stats |
| GET | `/v1/dashboard/compliance` | Compliance |
| GET | `/v1/dashboard/top-vulnerabilities` | Top vulns |
| GET | `/v1/dashboard/charts/patches` | Patch charts |
| GET | `/v1/dashboard/charts/assets` | Asset charts |
| GET | `/v1/dashboard/charts/vulnerabilities` | Vuln charts |
| GET | `/v1/dashboard/agents` | Agent stats |
| GET | `/v1/dashboard/recent-activity` | Activity |

---

## Reports Module (`/v1/reports`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/reports/templates` | Report templates |
| CRUD | `/v1/reports` | Report management |
| GET | `/v1/reports/:id/download` | Download |
| POST | `/v1/reports/:id/regenerate` | Regenerate |
| POST | `/v1/reports/:id/send` | Send report |
| CRUD | `/v1/reports/schedules` | Scheduled reports |

---

## Notifications Module (`/v1/notifications`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/notifications` | List |
| GET | `/v1/notifications/unread-count` | Unread count |
| PUT | `/v1/notifications/mark-all-read` | Mark all read |
| GET | `/v1/notifications/history` | History |
| PUT | `/v1/notifications/bulk-read` | Bulk mark read |
| DELETE | `/v1/notifications/bulk` | Bulk delete |
| GET/PUT | `/v1/notifications/preferences` | Preferences |
| PUT | `/v1/notifications/:id/read` | Mark read |
| DELETE | `/v1/notifications/:id` | Delete |
| DELETE | `/v1/notifications` | Clear all |

---

## Settings Module (`/v1/settings`)

### Organization Structure
- CRUD: `/v1/settings/organizations`, `/branches`, `/departments`, `/locations`
- GET: `/v1/settings/org-tree`

### Users & Roles
- CRUD: `/v1/settings/users`, `/roles`
- Actions: invite, suspend, activate, reset-password, bulk operations

### Infrastructure
- GET/PUT: `/server`, `/agent-configuration`, `/password-policy`, `/proxy-server`, `/mail-server`
- CRUD: `/enroll-secrets`, `/computer-groups`, `/deployment-policies`, `/distribution-servers`

### LDAP
- CRUD: `/ldap-configs`
- Group mappings, sync, discover groups

### Other Settings
- `/platform-license`, `/vulnerability-preference`, `/risk-score`, `/remote-desktop`
- `/patch-management`, `/patch-preferences`, `/branding`, `/integrations`, `/vendor-logos`
- `/agent-approvals`, `/agent-approval-settings`, `/redhat-nominations`
- `/audit` (logs), `/audit/filter-options`

---

## Alerts Module (`/v1/alerts`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/alerts` | List alerts |
| GET | `/v1/alerts/:id` | Get alert |
| PUT | `/v1/alerts/:id/acknowledge` | Acknowledge |
| PUT | `/v1/alerts/:id/resolve` | Resolve |
| PUT | `/v1/alerts/bulk-acknowledge` | Bulk acknowledge |
| DELETE | `/v1/alerts/bulk` | Bulk delete |

---

## Patch Repository Module (`/v1/patch-repository`)

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/v1/patch-repository/sources` | Patch sources |
| PATCH | `/v1/patch-repository/sources/:id/toggle` | Toggle source |
| GET/POST | `/v1/patch-repository/downloads` | Download jobs |
| POST | `/v1/patch-repository/downloads/bulk` | Bulk downloads |
| GET | `/v1/patch-repository/stats` | Stats |
| POST | `/v1/patch-repository/sync` | Sync |
| GET/POST | `/v1/patch-repository/queue/*` | Queue management |

---

## Patch Templates Module (`/v1/patch-templates`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/patch-templates` | List templates |
| GET | `/v1/patch-templates/:id/latest` | Latest version |
| POST | `/v1/patch-templates/sync` | Sync all |
| POST | `/v1/patch-templates/:id/sync` | Sync one |

---

## AI Module (`/v1/ai`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/ai/chat` | Bearer + rate limit | Chat |
| GET | `/v1/ai/health` | Bearer + admin only | Health check |

---

**Total Endpoints: ~280+**
