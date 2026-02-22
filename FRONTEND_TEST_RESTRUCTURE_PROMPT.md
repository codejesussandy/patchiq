# Task: Restructure Frontend Test Suite — Full Test Coverage (Unit / Integration / E2E)

## Overview

Restructure the existing frontend test files into a clean 3-layer testing architecture (`unit` / `integration` / `e2e`), then scan the entire frontend source and write comprehensive tests for every page, component, hook, service, and utility.

---

## Current State

Tests are split across two locations with no separation between unit and integration:

- **`frontend/src/__tests__/`** — Vitest + React Testing Library + MSW. Mostly smoke/render tests. MSW handlers in `src/__tests__/msw/handlers/`.
- **`frontend/e2e/`** — Playwright E2E specs against `http://localhost:3001`. Auth in `frontend/auth.json`. Config in `frontend/playwright.config.ts`.
- **Shared test utils** at `frontend/src/__tests__/test-utils.tsx`.

---

## Target Structure

```
frontend/
├── tests/
│   ├── unit/                          ← Vitest + RTL, all deps mocked
│   │   ├── setup.ts                   ← Vitest setup (jsdom, cleanup)
│   │   ├── test-utils.tsx             ← Shared render helper with providers (NO MSW)
│   │   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── pages/
│   │       ├── assets/
│   │       ├── patches/
│   │       ├── jobs/
│   │       ├── settings/
│   │       ├── vulnerability/
│   │       ├── discovery/
│   │       ├── reports/
│   │       ├── hub/
│   │       └── notifications/
│   │
│   ├── integration/                   ← Vitest + RTL + MSW, tests data flow
│   │   ├── test-utils.tsx             ← Render helper WITH MSW server start/stop
│   │   ├── msw/
│   │   │   ├── server.ts
│   │   │   └── handlers/             ← All MSW handlers
│   │   └── pages/
│   │       ├── assets/
│   │       ├── patches/
│   │       ├── jobs/
│   │       ├── settings/
│   │       ├── vulnerability/
│   │       ├── discovery/
│   │       ├── reports/
│   │       ├── hub/
│   │       └── notifications/
│   │
│   └── e2e/                           ← Playwright, real browser, real backend
│       ├── auth.setup.ts
│       ├── auth.json
│       ├── fixtures.ts
│       └── *.spec.ts
│
├── vitest.config.ts                   ← Updated include paths
├── playwright.config.ts               ← Updated testDir
```

---

## What Each Layer Tests

### Unit Tests (`tests/unit/`) — Vitest + RTL, NO MSW

Test components in complete isolation. Mock all hooks/services with `vi.mock()`.

- Component renders correctly with given props/state
- User interactions update local state (typing in search, clicking tabs, toggling modals, selecting dropdown)
- Conditional rendering (correct modal title per tab, filter count badge, empty states, loading states)
- Pure functions (formatters, validators, helpers, sort comparators)
- Hook return values and state transitions (mock the API layer entirely)

### Integration Tests (`tests/integration/`) — Vitest + RTL + MSW

Test the full data flow from component → hook → service → HTTP (intercepted by MSW) → rendered UI.

- Page fetches correct API endpoint on mount
- Applying a filter calls the API with correct query params (e.g., `?os=Windows&status=IN_USE`)
- Tab switch triggers the correct API fetch and renders the right dataset
- Search debounce sends correct `?search=` param
- Create/update/delete mutations call correct endpoints, method, and payload
- After mutation, the list re-fetches (cache invalidation)
- Error handling: API returns 400/500 → error state/toast appears
- Pagination: changing page calls API with correct `?page=` and `?limit=`

### E2E Tests (`tests/e2e/`) — Playwright, real backend

Test critical user journeys against the running app. No mocks.

- Full CRUD lifecycles (create → verify in list → edit → delete)
- Cross-page navigation (sidebar → list → detail → back)
- Auth flows (login, logout, session handling)
- Filter/search with real data
- 3-5 tests per feature area — no overlap with unit/integration

---

## Migration Steps

### Phase 1: Restructure

1. Create the `frontend/tests/` directory structure (all subdirectories)
2. Move `src/__tests__/msw/` → `tests/integration/msw/`
3. Move `src/__tests__/test-utils.tsx` → `tests/unit/test-utils.tsx`
4. Create `tests/integration/test-utils.tsx` (copy of unit but with MSW server setup/teardown)
5. Move all `src/__tests__/**/*.test.tsx` → `tests/unit/` (keep same subfolder structure)
6. Move `e2e/` → `tests/e2e/`
7. Move `auth.json` → `tests/e2e/auth.json`
8. Update all import paths in moved test files (prefer `@/` alias for source imports)
9. Update configs:
   - `vitest.config.ts` — include `tests/unit/**/*.test.{ts,tsx}` and `tests/integration/**/*.test.{ts,tsx}`
   - `playwright.config.ts` — `testDir: './tests/e2e'`
   - `tsconfig.json` — ensure `tests/` is included
10. Update `package.json` scripts:
    ```json
    "test": "vitest run",
    "test:unit": "vitest run --include 'tests/unit/**'",
    "test:integration": "vitest run --include 'tests/integration/**'",
    "test:e2e": "npx playwright test",
    "test:all": "vitest run && npx playwright test"
    ```
11. Delete old `src/__tests__/` and `e2e/` directories
12. Run `npm run test:unit` — verify all existing tests pass
13. Run `npm run test:e2e` — verify all existing E2E tests pass

### Phase 2: Full Test Coverage

Scan the entire `frontend/src/` directory. For every file, write the appropriate tests. Use the catalog below.

---

## Complete Frontend Catalog & Test Requirements

### PAGES — Assets

| Source File | Unit Test | Integration Test | E2E Test |
|---|---|---|---|
| `pages/assets/AllAssets.tsx` | Renders title, table columns, search input, filter button, OS sidebar selection, filter count badge, clear filters link, Add Asset button opens modal | Fetches `/assets` on mount, `?os=Windows` on OS filter, `?status=IN_USE` on modal filter, `?search=` on search, pagination params, bulk delete calls `DELETE /assets/bulk` | Full CRUD: create asset → search → edit → delete |
| `pages/assets/SoftwareInventory.tsx` | Renders title, table columns, search filters by name/manufacturer/version, category filter dropdown, Import CSV button, no OS filter present | Fetches `/software-inventory` on mount, category filter filters client-side data | Page loads, search filters, category filter works |
| `pages/assets/SoftwareLicense.tsx` | Tab rendering (Application/OS), tab switching, search per tab, search resets on tab switch, New License modal title per tab, status filter | Application tab fetches `/software-licenses`, OS tab fetches `/os-licenses`, create/update/delete mutations per tab | Tab switch, create license, delete license |
| `pages/assets/OSLicenses.tsx` | Renders title, table columns, search, CRUD modal interactions | Fetches `/os-licenses`, create/update/delete mutations | Page loads with data |
| `pages/assets/components/AssetDetails.tsx` | Renders heading, all tabs visible (Details, Hardware, Software, etc.), tab navigation | Fetches `/assets/:id/full`, each tab fetches its endpoint (hardware, software, security, etc.) | Click asset → detail page → navigate tabs |
| `pages/assets/components/AddAssetModal.tsx` | Modal opens/closes, step navigation, form validation, required fields | Submit calls `POST /assets` with correct payload | Covered in AllAssets CRUD |
| `pages/assets/components/allassets/AssetFilterModal.tsx` | Renders filter fields, Apply/Clear/Cancel buttons, form state | N/A (parent page tests cover API calls) | Covered in AllAssets filter tests |
| `pages/assets/components/CategoryManager.tsx` | Renders categories list, add/edit/delete modals | CRUD for `/categories` and `/subcategories` | N/A |
| `pages/assets/components/LicenseFormModal.tsx` | Renders correct fields per license type, validation | N/A | N/A |
| `pages/assets/components/tabs/*.tsx` (all tabs) | Each tab renders correct content, loading states, empty states | Each tab fetches its API endpoint | N/A |

### PAGES — Patches

| Source File | Unit Test | Integration Test | E2E Test |
|---|---|---|---|
| `pages/patches/AllPatches.tsx` | Renders title, table columns, OS sidebar filter, filter modal, search, severity filter, deploy button | Fetches `/patches` on mount, `?os=` filter, severity/status filters in modal, search | Page loads, OS filter, filter modal, search |
| `pages/patches/PatchDetails.tsx` | Renders patch info, affected products, test results, deployment history | Fetches `/patches/:id`, related endpoints | Click patch → detail page loads |
| `pages/patches/PatchTestApprove.tsx` | Renders test/approve workflow, status transitions | Fetches test queue, approve/reject mutations | Test → approve workflow |
| `pages/patches/PatchDeployed.tsx` | Renders deployed patches table, status badges | Fetches `/deployments` with patch filter | Page loads with data |
| `pages/patches/PatchRecommendations.tsx` | Renders recommendations table, stat cards, filters | Fetches `/patch-recommendations` | Page loads, filter works |
| `pages/patches/ZeroTouchDeployment.tsx` | Renders config form, policy list | Fetches zero-touch configs, create/update mutations | Create policy, verify in list |
| `pages/patches/components/PatchFilterModal.tsx` | Filter fields render, apply/clear, multi-select severity | N/A | N/A |
| `pages/patches/components/CreateDeploymentModal.tsx` | Step wizard, target selection, schedule config | Submit calls `POST /deployments` | Covered in deploy E2E |
| `pages/patches/components/PatchCreateEditModal.tsx` | Form fields, validation, edit pre-fills | Create/update mutations | N/A |

### PAGES — Jobs

| Source File | Unit Test | Integration Test | E2E Test |
|---|---|---|---|
| `pages/jobs/PatchJobs.tsx` | Renders title, table, status badges, search | Fetches `/jobs?type=patch`, filters | Page loads, search works |
| `pages/jobs/ConfigurationJobs.tsx` | Tab navigation (Catalog/Bundle/Deployed), renders correct sub-page per tab | Tabs trigger correct fetches | Tab navigation works |
| `pages/jobs/ConfigurationJobsCatalog.tsx` | Renders catalog cards, search, filter | Fetches configuration catalog | N/A |
| `pages/jobs/ConfigurationJobsBundle.tsx` | Renders bundle list, create modal | Fetches bundles, create mutation | N/A |
| `pages/jobs/ConfigurationJobsDeployed.tsx` | Renders deployed configs, status | Fetches deployed configurations | N/A |
| `pages/jobs/SoftwareJobs.tsx` | Tab navigation (Catalog/Bundle/Deployed) | Tab fetches | Tab navigation |
| `pages/jobs/SoftwareJobsCatalog.tsx` | Renders software catalog, deploy modal | Fetches software catalog | N/A |
| `pages/jobs/SoftwareJobsBundle.tsx` | Renders bundles | Fetches bundles | N/A |
| `pages/jobs/SoftwareJobsDeployed.tsx` | Renders deployed software, status | Fetches deployed list | N/A |
| `pages/jobs/PatchJobsDeployed.tsx` | Renders deployed patch jobs | Fetches patch deployments | N/A |
| `pages/jobs/VulnerabilityJobs.tsx` | Tab navigation (List/DB Sync) | Tab fetches | N/A |
| `pages/jobs/VulnerabilityJobsList.tsx` | Renders vuln scan jobs | Fetches vulnerability jobs | N/A |
| `pages/jobs/VulnerabilityJobsDBSync.tsx` | Renders DB sync status/history | Fetches sync status | N/A |
| `pages/jobs/components/TransferListPicker.tsx` | Left/right list, transfer items, search within lists | N/A | N/A |
| `pages/jobs/components/DeploymentTasksModal.tsx` | Renders task list, status per task | Fetches `/deployments/:id/tasks` | N/A |

### PAGES — Settings

| Source File | Unit Test | Integration Test | E2E Test |
|---|---|---|---|
| `pages/settings/AgentManagement.tsx` | Renders agent table, status badges, search, version filter | Fetches `/agents`, filter/search params | Page loads, search works |
| `pages/settings/Users.tsx` | Renders user table, add/edit/delete modals, role assignment | CRUD `/users`, role assignment | Create user → edit → delete |
| `pages/settings/RolesAndPrivileges.tsx` | Renders roles list, permissions grid | Fetches `/roles`, create/update mutations | N/A |
| `pages/settings/Organization.tsx` | Renders org form, save/cancel | Fetches `/settings/organization`, update mutation | N/A |
| `pages/settings/Branding.tsx` | Logo upload, color picker, preview | Update branding mutation | N/A |
| `pages/settings/PatchManagement.tsx` | Renders patch settings form | Fetches/updates patch preferences | N/A |
| `pages/settings/ComputerGroups.tsx` | Renders groups table, add/edit/delete | CRUD `/computer-groups` | N/A |
| `pages/settings/DeploymentPolicies.tsx` | Renders policies table, form modal | CRUD `/deployment-policies` | N/A |
| `pages/settings/LDAPServerConfiguration.tsx` | Renders LDAP form, test connection | Save/test LDAP config | N/A |
| `pages/settings/Audit.tsx` | Renders audit log table, filters, timeline modal | Fetches `/audit-logs` with date/action filters | Page loads, filter by action |
| `pages/settings/EnrollSecret.tsx` | Renders secret list, generate/revoke | Generate/revoke `/enroll-secrets` | N/A |
| `pages/settings/DistributionServer.tsx` | Renders server list, add/edit | CRUD `/distribution-servers` | N/A |
| `pages/settings/PasswordPolicies.tsx` | Renders policy form, validation rules | Save password policy | N/A |
| `pages/settings/NotificationPreferences.tsx` | Renders notification channels, toggles | Fetches/updates notification prefs | N/A |
| `pages/settings/PlatformLicense.tsx` | Renders license info, activation | Fetches license status | N/A |
| `pages/settings/MarketPlace.tsx` | Renders integrations list | Fetches integrations | N/A |
| `pages/settings/VendorLogo.tsx` | Renders vendor logos, upload | Upload/delete vendor logos | N/A |
| `pages/settings/PolicyManagement.tsx` | Renders policies, create/edit | CRUD policies | N/A |
| `pages/settings/RedHatAgentNomination.tsx` | Renders nomination form | Submit nomination | N/A |
| `pages/settings/BranchLocation.tsx` | Renders locations table, add/edit | CRUD `/locations` | N/A |
| All other settings pages | Renders correctly, form interactions | Fetches/updates correct endpoint | N/A |

### PAGES — Vulnerability

| Source File | Unit Test | Integration Test | E2E Test |
|---|---|---|---|
| `pages/vulnerability/Vulnerabilities.tsx` | Renders table, stat cards, severity filter, search | Fetches `/vulnerabilities`, filter params | Page loads, filter by severity |
| `pages/vulnerability/VulnerabilityDetail.tsx` | Renders CVE details, MITRE section, affected assets | Fetches `/vulnerabilities/:id` | Click vuln → detail loads |
| `pages/vulnerability/ZeroDayVulnerabilities.tsx` | Renders zero-day list | Fetches zero-day filtered list | N/A |
| `pages/vulnerability/ManageException.tsx` | Renders exception form, approval workflow | Create/update exception | N/A |
| `pages/vulnerability/components/VulnerabilityFilterModal.tsx` | Filter fields, apply/clear | N/A | N/A |
| `pages/vulnerability/components/VulnerabilityTable.tsx` | Renders rows, severity badges, sort | N/A | N/A |
| `pages/vulnerability/components/ScanModal.tsx` | Renders scan form, target selection | Submit scan | N/A |

### PAGES — Discovery, Hub, Reports, Notifications, Dashboard, Auth

| Source File | Unit Test | Integration Test | E2E Test |
|---|---|---|---|
| `pages/Dashboard.tsx` | Renders stat cards, charts, recent activity | Fetches `/dashboard` stats | Dashboard loads with data |
| `pages/Login.tsx` | Renders form, validation, submit | Login calls `/auth/login`, stores tokens | Login → redirects to dashboard |
| `pages/ForgotPassword.tsx` | Renders form, validation | Calls `/auth/forgot-password` | N/A |
| `pages/discovery/IPDiscovery.tsx` | Renders discovery form, results table | Fetches `/discovery`, start scan | N/A |
| `pages/discovery/DeviceCredentials.tsx` | Renders credentials table, add/edit | CRUD `/device-credentials` | N/A |
| `pages/discovery/Agents.tsx` | Renders agents table, status | Fetches `/agents` | N/A |
| `pages/hub/Hub.tsx` | Renders hub packages, deploy modal, upload | Fetches `/hub/packages` | Page loads, deploy package |
| `pages/Reports.tsx` / `pages/reports/Reports.tsx` | Renders reports list, generate/download | Fetches `/reports`, generate mutation | Generate report |
| `pages/reports/CreateReport.tsx` | Report wizard, schedule modal | Create report mutation | N/A |
| `pages/Notifications.tsx` | Renders notification list, mark read/unread | Fetches `/notifications`, mark-read mutation | Page loads, mark as read |

### COMPONENTS

| Source File | Unit Test | Integration Test |
|---|---|---|
| `components/shared/DataTable.tsx` | Renders columns, rows, pagination, empty state, loading state, row selection, sort indicators | N/A |
| `components/shared/ConfirmModal.tsx` | Renders title, description, confirm/cancel buttons, loading state, danger variant | N/A |
| `components/shared/ActionMenu.tsx` | Renders menu items, click handlers, danger items | N/A |
| `components/shared/BulkActionBar.tsx` | Renders selected count, action buttons, clear selection | N/A |
| `components/shared/EmptyState.tsx` | Renders icon, title, description, action button | N/A |
| `components/shared/ErrorState.tsx` | Renders error message, retry button | N/A |
| `components/shared/FilterDrawer.tsx` | Opens/closes, renders fields, apply/clear | N/A |
| `components/shared/FormModal.tsx` | Opens/closes, form validation, submit/cancel | N/A |
| `components/shared/StatusBadge.tsx` | Renders correct color/text per status | N/A |
| `components/shared/RiskScoreDisplay.tsx` | Renders correct color/label per score range | N/A |
| `components/shared/SkeletonLoader.tsx` | Renders skeleton placeholders | N/A |
| `components/MainLayout.tsx` | Renders sidebar, header, content area, sidebar collapse, OS filter selection in sidebar | N/A |
| `components/layout/CategoryPanel.tsx` | Renders OS items, click selects, hover states, selected state styling | N/A |
| `components/layout/HeaderBar.tsx` | Renders logo, nav items, search, profile menu | N/A |
| `components/layout/NavigationSidebar.tsx` | Renders menu items, active state, collapse | N/A |
| `components/layout/ProfileMenu.tsx` | Renders user info, dropdown items, logout | N/A |
| `components/ProtectedRoute.tsx` | Redirects to login when unauthenticated, renders children when authenticated | N/A |
| `components/ErrorBoundary.tsx` | Catches errors, renders fallback UI | N/A |
| `components/NotificationDropdown.tsx` | Renders notification list, unread count badge, mark as read | Fetches `/notifications` |
| `components/chat/AIChatPanel.tsx` | Opens/closes, renders messages, sends message | Sends to `/ai/chat`, renders response |
| `components/patches/SeverityBadge.tsx` | Renders correct color per severity (Critical/High/Medium/Low) | N/A |
| `components/patches/OSIcon.tsx` | Renders correct icon per OS | N/A |
| `components/patches/EndpointDetailsDrawer.tsx` | Opens/closes, renders endpoint info | N/A |
| `components/agents/AgentDetailsDrawer.tsx` | Opens/closes, renders agent info, tabs | N/A |

### HOOKS

| Source File | Unit Test | Integration Test |
|---|---|---|
| `hooks/useAssets.ts` | Returns correct initial state, loading/error/success states | Calls correct endpoints with params |
| `hooks/usePatches.ts` | Returns correct initial state | Calls `/patches` with correct filters |
| `hooks/useJobs.ts` | Returns correct initial state | Calls job endpoints |
| `hooks/useSettings.ts` | Returns correct initial state | Calls settings endpoints |
| `hooks/useVulnerabilities.ts` | Returns correct initial state | Calls vuln endpoints |
| `hooks/useAgents.ts` | Returns correct initial state | Calls `/agents` |
| `hooks/useDashboard.ts` | Returns correct initial state | Calls `/dashboard` |
| `hooks/useDiscovery.ts` | Returns correct initial state | Calls `/discovery` |
| `hooks/useHub.ts` | Returns correct initial state | Calls `/hub` |
| `hooks/useNotifications.ts` | Returns correct initial state | Calls `/notifications` |
| `hooks/useReports.ts` | Returns correct initial state | Calls `/reports` |
| `hooks/usePatchRecommendations.ts` | Returns correct initial state | Calls `/patch-recommendations` |
| `hooks/usePatchTemplates.ts` | Returns correct initial state | Calls `/patch-templates` |
| `hooks/useTableParams.ts` | Pagination state, sort state, filter state, search state, setters work correctly | N/A |
| `hooks/useModal.ts` | Open/close state, selectedItem tracking | N/A |
| `hooks/useDebouncedSearch.ts` | Debounces input, returns debounced value | N/A |
| `hooks/usePolling.ts` | Calls callback at interval, cleans up on unmount | N/A |
| `hooks/useExport.ts` | Triggers download | N/A |
| `hooks/useExportWithFeedback.ts` | Triggers download with loading/success/error feedback | N/A |
| `hooks/useNotificationSSE.ts` | Connects to SSE endpoint, receives events | Connects to `/notifications/sse` |

### SERVICES

| Source File | Unit Test | Integration Test |
|---|---|---|
| `services/api.service.ts` | N/A (base HTTP client) | Base URL, auth header injection, error handling |
| `services/auth.service.ts` | N/A | Login/logout/refresh endpoints |
| `services/asset.service.ts` | N/A | All asset CRUD endpoints with correct params |
| `services/patch.service.ts` | N/A | All patch endpoints |
| `services/jobs.service.ts` | N/A | All job endpoints |
| `services/settings.service.ts` | N/A | All settings endpoints |
| `services/vulnerability.service.ts` | N/A | All vuln endpoints |
| `services/agent.service.ts` | N/A | All agent endpoints |
| `services/dashboard.service.ts` | N/A | Dashboard stats endpoint |
| `services/discovery.service.ts` | N/A | Discovery endpoints |
| `services/hub.service.ts` | N/A | Hub package endpoints |
| `services/notification.service.ts` | N/A | Notification endpoints |
| `services/reports.service.ts` | N/A | Report endpoints |
| `services/category.service.ts` | N/A | Category CRUD endpoints |
| `services/tag.service.ts` | N/A | Tag CRUD endpoints |
| `services/patch-recommendation.service.ts` | N/A | Recommendation endpoints |
| `services/patch-template.service.ts` | N/A | Template endpoints |
| `services/softwareJobs.service.ts` | N/A | Software job endpoints |
| `services/ai.service.ts` | N/A | AI chat endpoint |

### UTILITIES

| Source File | Unit Test |
|---|---|
| `utils/dateFormat.ts` | All format functions with various date inputs, null/undefined, invalid dates |
| `utils/error.ts` | Error parsing, error message extraction from various API error shapes |
| `utils/fetchWithAuth.ts` | Adds auth header, handles 401 refresh, retries |
| `utils/sanitize.ts` | Sanitizes HTML/XSS inputs, preserves safe content |
| `utils/toastHelpers.ts` | Returns correct toast config per type |
| `utils/validation.ts` | All validation rules (email, password, IP, etc.) with valid/invalid inputs |

### E2E TESTS — Keep Existing + Add Missing

**Keep all existing E2E spec files** and add these missing ones:

| Spec File | Tests |
|---|---|
| `assets.spec.ts` | ✅ Exists — keep as-is |
| `software-licenses.spec.ts` | ✅ Exists — keep as-is |
| `filter-test.spec.ts` | ✅ Exists — keep as-is |
| `patches.spec.ts` | ✅ Exists — keep as-is |
| `dashboard.spec.ts` | ✅ Exists — keep as-is |
| `settings.spec.ts` | ✅ Exists — keep as-is |
| `vulnerabilities.spec.ts` | ✅ Exists — keep as-is |
| `auth.spec.ts` | ✅ Exists — keep as-is |
| `discovery.spec.ts` | ❌ Add — agent list loads, IP discovery scan works |
| `hub.spec.ts` | ❌ Add — hub packages load, deploy package, upload |
| `users.spec.ts` | ❌ Add — create user → edit → delete, role assignment |
| `audit.spec.ts` | ❌ Add — audit log loads, filter by action/date |

---

## Rules

- Do NOT change any source code — only test files and config files
- Do NOT delete any existing tests — move them to the new structure
- Do NOT break existing test assertions — only fix import paths
- Every test file that existed before MUST still pass after migration
- **Unit tests must NOT use MSW** — mock hooks/services with `vi.mock()`
- **Integration tests use MSW** — handlers in `tests/integration/msw/handlers/`
- **E2E tests use NO mocks** — real browser, real backend
- Naming: `*.test.tsx` for unit/integration, `*.spec.ts` for E2E
- No test should duplicate what another layer already covers
- Keep tests focused: one `describe` block per component/feature, each `it` tests one thing

## Coverage Targets

- Every file in `src/pages/` has a unit test AND integration test
- Every file in `src/components/` has a unit test
- Every file in `src/hooks/` has a unit test (+ integration test if it makes API calls)
- Every file in `src/utils/` has a unit test
- Every user-facing feature has at least one E2E test
- Run all three layers and confirm zero failures before considering the task complete
