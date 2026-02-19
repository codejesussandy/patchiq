# Task: Playwright E2E Tests — Full Coverage for PatchIQ

## Context

PatchIQ is an enterprise patch management platform. The frontend is React + Ant Design + React Router + TanStack Query. Playwright is already installed.

- **Frontend:** `http://localhost:5173` (Vite dev server)
- **Backend:** `http://localhost:3000` (proxied via Vite — `/v1` → `http://localhost:3000`)
- **Auth:** JWT tokens stored in `localStorage` keys `accessToken` and `refreshToken`
- **Test credentials:** `admin@patchiq.io` / `admin123`
- **Config:** `frontend/playwright.config.ts` — testDir `./e2e`, sequential (workers: 1), storageState `./auth.json`, projects: `setup` → `chromium` + `webkit`

These are **real browser tests against the real running app**. No MSW, no mocks.

## Before Writing Anything — READ THESE FILES

1. `frontend/playwright.config.ts` — verify baseURL, projects, auth file path, timeouts
2. `frontend/src/routes/` — all route definitions for exact URL paths
3. `frontend/src/pages/Login.tsx` — form fields, button text, error handling
4. `frontend/src/contexts/AuthContext.tsx` — login flow, token storage, logout flow
5. `frontend/src/components/layout/HeaderBar.tsx` — top nav menu items, profile menu, notification dropdown
6. `frontend/src/components/layout/NavigationSidebar.tsx` — sidebar nav structure per section
7. `frontend/src/pages/Dashboard.tsx` — stat cards, charts, refresh button
8. `frontend/src/pages/assets/AllAssets.tsx` — table columns, toolbar buttons, modals
9. `frontend/src/pages/assets/AssetDetails.tsx` — tabs, header actions
10. `frontend/src/pages/patches/AllPatches.tsx` — table, create/deploy modals, filters
11. `frontend/src/pages/patches/PatchDetails.tsx` — tabs, actions, supersedence
12. `frontend/src/pages/notifications/Notifications.tsx` — filters, bulk actions, table
13. `frontend/src/pages/settings/` — all settings pages for form fields and save behavior
14. `frontend/src/pages/vulnerability/` — vulnerability pages, scan, exceptions

---

## Step 1: Auth Setup

### `frontend/e2e/auth.setup.ts`
```
- Navigate to /login
- Page title contains "InventIQ" or "PatchIQ"
- Fill field with label "Email" → admin@patchiq.io
- Fill field with label "Password" → admin123
- Click button with name "Log in"
- Wait for URL to become /dashboard
- Verify localStorage has key "accessToken" (non-empty)
- Save storageState to ./auth.json
```

### `frontend/e2e/fixtures.ts`
```
- Export a custom `test` fixture that loads ./auth.json as storageState
- All subsequent test files import { test, expect } from this fixture
```

---

## Step 2: Test Files

### `frontend/e2e/auth.spec.ts` — Authentication Flows

**Test: "successful login redirects to dashboard"**
- Use a fresh browser context (no saved auth)
- Navigate to /login
- Verify heading "Welcome to InventIQ" is visible
- Verify subtitle "Enter your details to sign in your account" is visible
- Fill label "Email" with admin@patchiq.io
- Fill label "Password" with admin123
- Click button "Log in"
- Expect URL to be /dashboard
- Expect localStorage key "accessToken" to be non-empty

**Test: "login with invalid credentials shows error"**
- Fresh context, navigate to /login
- Fill label "Email" with wrong@example.com
- Fill label "Password" with wrongpassword
- Click button "Log in"
- Expect to remain on /login
- Expect an Ant Design message.error toast to appear (`.ant-message-error` or role="alert")

**Test: "empty form shows validation errors"**
- Fresh context, navigate to /login
- Click button "Log in" without filling fields
- Expect text "Please enter your email" to be visible
- Expect text "Please enter your password" to be visible

**Test: "forgot password link navigates correctly"**
- Fresh context, navigate to /login
- Click "Forgot password" link
- Expect URL to be /forgot-password
- Verify heading "Forgot Password?" is visible
- Verify field with label "Email" exists
- Verify button "Send Link" exists

**Test: "logout clears session and redirects to login"**
- Use authenticated state
- Navigate to /dashboard
- Click element with aria-label "User profile menu"
- Click logout option in the popover
- Expect URL to become /login
- Expect localStorage key "accessToken" to be removed
- Navigate to /dashboard — should redirect back to /login

**Test: "protected routes redirect unauthenticated users to login"**
- Fresh context (no auth)
- Navigate to /dashboard → expect redirect to /login
- Navigate to /assets → expect redirect to /login
- Navigate to /patches → expect redirect to /login

---

### `frontend/e2e/dashboard.spec.ts` — Dashboard

**Test: "dashboard loads with stat cards showing real data"**
- Navigate to /dashboard
- Expect heading "Executive Dashboard" to be visible
- Verify these stat cards exist and have numeric values (not empty, not "—"):
  - Card with aria-label matching /Total Endpoints:/
  - Card with aria-label matching /Total Linux Endpoints:/
  - Card with aria-label matching /Total Windows Endpoints:/
  - Card with aria-label matching /Total Apple Mac Endpoint:/
  - Card with aria-label matching /Total Vulnerability:/
  - Card with aria-label matching /Total Software:/

**Test: "dashboard platform filter works"**
- Navigate to /dashboard
- Open select with aria-label "Filter dashboard by endpoint platform"
- Select "Windows Only"
- Wait for dashboard data to reload (stat cards update)
- Select "All Endpoints" to reset

**Test: "dashboard refresh button reloads data"**
- Navigate to /dashboard
- Click button matching /Refresh/
- Verify the button shows a loading state briefly
- Verify stat cards still have data after refresh

**Test: "top navigation menu works"**
- Navigate to /dashboard
- Click menuitem "Assets" → expect URL /assets
- Click menuitem "Patches" → expect URL /patches
- Click menuitem "Vulnerability" → expect URL contains /vulnerability
- Click menuitem "Reports" → expect URL /reports
- Click menuitem "Dashboard" → expect URL /dashboard

**Test: "dashboard shows error state and retry on API failure"**
- (Only if backend is deliberately stopped — optional/skip in normal runs)

---

### `frontend/e2e/assets.spec.ts` — Asset Management

**Test: "assets list page loads with table data"**
- Navigate to /assets
- Expect heading "Assets" to be visible
- Expect a table to be visible with rows
- Verify table has columns: "Asset ID", "Network Identity", "Category", "Operational Status", "Status"
- Verify at least one row exists (if seeded data)

**Test: "assets search filters the table"**
- Navigate to /assets
- Type a known hostname or IP into placeholder "Search assets..."
- Wait for table to filter (debounce)
- Verify filtered results appear (fewer rows or matching text)
- Clear the search field (click the clear X on the allowClear input)
- Verify full results return

**Test: "assets filter modal works"**
- Navigate to /assets
- Click button "Filter"
- Expect modal with title "Filter Assets" to appear
- Select a status from "Filter by Status" dropdown (e.g., "In Use")
- Click "Apply Filters"
- Expect modal to close
- Expect table to update
- Re-open filter, click "Clear All Filters" (dashed button)
- Expect `message.info('Filters cleared')` toast

**Test: "clicking an asset row opens asset details"**
- Navigate to /assets
- Click on the first data row in the table
- Expect URL to match /assets/<some-id>
- Expect heading "Asset Details" to be visible

**Test: "asset details page shows all tabs"**
- Navigate to an asset detail page (from previous navigation or direct URL)
- Verify these tabs exist: "Details", "Asset Life cycle", "Hardware", "Software", "Audit Log", "Vulnerabilities", "Patches", "Alerts"
- Click "Hardware" tab → expect tab content to load (no error)
- Click "Software" tab → expect tab content to load
- Click "Patches" tab → expect tab content to load
- Click "Vulnerabilities" tab → expect tab content to load

**Test: "create asset and then delete it"** (CRUD lifecycle)
- Navigate to /assets
- Click button "Add Assets"
- Fill in the create asset form (whatever fields the modal requires)
- Submit the form
- Verify success toast appears
- Verify the new asset appears in the table (search for it)
- Click the row to open details
- Click ActionMenu (MoreOutlined dropdown) → click "Delete Asset"
- Confirm deletion in the modal (click "Delete" or "Yes")
- Verify `message.success('Asset deleted successfully')` toast
- Verify redirect back to /assets

**Test: "bulk delete assets"** (if multiple assets exist)
- Navigate to /assets
- Select 2+ rows via checkboxes
- Verify "{n} Selected" text appears
- Click "More actions" dropdown → click "Delete Selected"
- Confirm in modal: "Are you sure you want to delete {n} assets?"
- Click "Yes"
- Verify `message.success('Assets deleted successfully')` toast

---

### `frontend/e2e/patches.spec.ts` — Patch Management

**Test: "patches list loads with data"**
- Navigate to /patches
- Expect heading matching "All Patches" or "{OS} Patches"
- Expect table with columns: "Software", "ID", "Endpoints", "OS", "Severity"
- Verify at least one row if seeded data exists

**Test: "patch search works"**
- Navigate to /patches
- Type a known KB number or software name into placeholder "Search"
- Wait for results to filter
- Clear search → full results return

**Test: "create patch via form"**
- Navigate to /patches
- Click button "Create Patch"
- In the modal, fill:
  - Label "Software Name" → "Test Patch E2E"
  - Label "Platform" → select "Windows"
  - Label "Severity" → select "Medium"
  - Label "Category" → select "Security Updates"
  - Label "KB Number" → "KB9999999"
- Submit the form
- Verify success toast
- Search for "Test Patch E2E" in the patches table
- Verify it appears

**Test: "patch detail page loads with correct tabs"**
- Navigate to /patches, click on a patch row
- Expect URL to match /patches/<id>
- Verify breadcrumb shows "All Patches" → patch name
- Verify tabs: "Details", "Endpoints ({n})", "Recommendations ({n})", "Affected Software ({n})", "Vulnerabilities ({n})"
- Click "Endpoints" tab → verify content loads
- Click "Vulnerabilities" tab → verify content loads

**Test: "deploy patches from list page"**
- Navigate to /patches
- Select 1+ patches via row checkboxes
- Click "Deploy" button (RocketOutlined)
- In the Deploy modal:
  - Verify "Deployment Name" field is pre-filled with "Patch Deployment - {date}"
  - Select at least one agent from "Target Agents" (required, mode="multiple")
  - Click "Deploy Now"
- Verify `message.success` toast mentioning deployment creation
- Verify a follow-up `Modal.confirm` appears with "View Deployments" option

**Test: "OS sidebar filter changes patch list"**
- Navigate to /patches
- In the sidebar, click "All Patches" (should be default)
- Verify the URL does not have `?os=` param
- (If OS filter links exist in sidebar for Windows/Linux/Mac, click one)
- Verify URL updates with `?os=WINDOWS` or similar
- Verify page title updates to "Windows Patches"

**Test: "delete a patch"**
- Navigate to a patch detail page
- Click ActionMenu (MoreOutlined) → click "Delete" or equivalent
- Confirm deletion
- Verify redirect to /patches

---

### `frontend/e2e/patch-recommendations.spec.ts` — AI Patch Recommendations

**Test: "recommendations page loads with stats and table"**
- Navigate to /patch-recommendations
- Expect heading "Patch Recommendations"
- Verify stats cards exist: Critical, High, Medium, Low (severity counts)
- Verify stats cards exist: Recommended, Accepted, Deployed (status counts)
- Verify recommendations table loads

**Test: "search and filter recommendations"**
- Type in placeholder "Search CVE, Asset, Patch..."
- Verify table filters
- Use "Filter by Status" dropdown → select "RECOMMENDED"
- Verify table updates
- Use "Filter by Severity" multi-select → select "CRITICAL"
- Verify table updates
- Clear all filters

**Test: "accept a recommendation"**
- Select a recommendation row
- Click "Accept {n}" button
- Confirm in Modal: "Are you sure you want to accept this patch recommendation?"
- Verify success toast

**Test: "reject a recommendation with reason"**
- Select a recommendation row
- Click "Reject {n}" button
- In the reject modal, fill placeholder "Reason for rejection..." with a reason
- Click OK
- Verify success toast

**Test: "deploy a recommendation"**
- Select an accepted recommendation
- Click "Deploy {n}" button
- Confirm in modal: content mentions "create a deployment to install"
- Verify success Modal appears with "Deployment Created"
- Click "View Deployments" → verify navigation to /patches/deployed

**Test: "refresh button reloads data"**
- Click "Refresh" button
- Verify loading state appears and data reloads

---

### `frontend/e2e/deployments.spec.ts` — Patch Deployments

**Test: "deployments page loads"**
- Navigate to /patches/deployed
- Verify page loads (table or empty state)
- If empty: verify `<Empty>` message pointing to All Patches

**Test: "deployment table shows correct columns"** (if data exists)
- Verify columns: "ID", "Name", "Patches", "Stage", "Progress", "Trigger", "Created"
- Verify stage column shows colored tags (COMPLETED/IN_PROGRESS/PENDING/FAILED)
- Verify progress column shows progress bar with "X/Y done" text

**Test: "clicking a deployment row opens task details"**
- Click on a deployment row
- Verify DeploymentTasksModal opens with task details

**Test: "cancel an in-progress deployment"** (if one exists)
- Find a deployment with IN_PROGRESS or PENDING status
- Click the stop icon (StopOutlined)
- Confirm: "Are you sure you want to cancel this deployment?"
- Click "Cancel Deployment"
- Verify `message.success('Deployment cancelled')` toast

**Test: "retry a failed deployment"** (if one exists)
- Find a deployment with FAILED status
- Click the retry icon (RedoOutlined)
- Confirm: 'Re-deploy "{name}" with the same patches and targets?'
- Click "Retry"
- Verify success toast mentioning retry deployment

---

### `frontend/e2e/vulnerabilities.spec.ts` — Vulnerability Management

**Test: "vulnerabilities page loads with stats and table"**
- Navigate to /vulnerability/vulnerabilities
- Verify stats cards show Critical/High/Medium/Low counts
- Verify table has data with severity tags

**Test: "search vulnerabilities"**
- Type a CVE ID into placeholder "Search CVE, title, or description..."
- Verify table filters to matching results

**Test: "advanced filters work"**
- Click button with data-testid "advanced-filters-button" or text "Advanced Filters"
- Apply a filter (e.g., severity)
- Verify `message.success('Filters applied')` toast
- Verify table updates

**Test: "clicking a CVE opens detail modal"**
- Click on a CVE row in the table
- Verify `<CveDetailModal>` opens with CVE details
- Verify URL updates with `?cve=` param
- Close modal

**Test: "add exception for selected vulnerabilities"**
- Select 1+ vulnerability rows
- Click "Add Exceptions" button
- In exception modal:
  - Select "Scope" → "Global"
  - Select "Exception Type" → "Acceptable Risk" radio
  - Fill "Reason For Exclusion" with a test reason
  - Click "Save"
- Verify `message.success('Exception(s) created successfully')` toast

**Test: "trigger vulnerability scan"**
- Click "Scan Now" button
- Verify scan modal appears
- Wait for scan completion
- Verify `message.success` toast mentioning "Vulnerability scan completed"

---

### `frontend/e2e/notifications.spec.ts` — Notifications

**Test: "notification bell shows unread count"**
- Navigate to /dashboard
- Verify the notification bell icon in the header has a Badge with a number (or no badge if 0)
- Click the bell icon
- Verify dropdown shows recent notifications or "no notifications" state
- If notifications exist: verify each has a title and type icon

**Test: "notification history page loads"**
- Navigate to /notifications
- Expect heading "Notification History"
- Verify filter inputs exist: search (placeholder "Search title or message..."), Type select, Category select, Read status select, date range picker
- Verify table loads with columns: Type (icon), Category (tag), Title, Message, Status, Time, Actions

**Test: "filter notifications by type and category"**
- Select "Warning" from Type filter
- Verify table filters to warning notifications
- Select "Agent" from Category filter
- Verify table further filters
- Clear both filters

**Test: "mark notification as read"**
- If an unread notification exists (bold title, blue "Unread" tag):
  - Click the CheckOutlined icon (title "Mark as read") on that row
  - Verify the row updates to "Read" status
- OR use bulk action:
  - Select rows with checkboxes
  - Click "Mark Read" button
  - Verify `message.success("Marked {n} notifications as read")` toast

**Test: "delete a notification"**
- Click DeleteOutlined (title "Delete") on a notification row
- Verify the row is removed from the table
- OR use bulk action:
  - Select rows → click "Delete" button
  - Verify `message.success("Deleted {n} notifications")` toast

**Test: "view all link from dropdown navigates to notifications page"**
- Click bell icon in header
- Click "View all" link in dropdown
- Expect URL to be /notifications

---

### `frontend/e2e/settings.spec.ts` — Settings Pages

**Test: "settings sidebar navigation works"**
- Navigate to /settings
- Expect redirect to /settings/user-management/organization
- In the settings sidebar, verify these groups exist:
  - "User Management" (collapsible) with sub-items: Organization, Location, User Roles, Users, Password Policies
  - "Company Configuration" (collapsible) with sub-items: Branding, Vendor Logo, Mail Server, Proxy Server, LDAP Server, Risk Score, Remote Desktop, Server Settings
  - "Agent Management" (collapsible) with sub-items: Agent Approval Settings, Agent Versions, Agent Configuration, Agent Approvals, Enroll Secret
  - "Patch Management" (collapsible)
  - "Audit"
  - "Platform License"
- Click "Users" → expect URL /settings/user-management/users
- Click "Mail Server Configurations" → expect URL /settings/system-settings/mail-server
- Click "Agent Approval Settings" → expect URL /settings/agent-management/approval-settings
- Click "Patch Preferences" → expect URL /settings/patch-management/patch-preferences
- Click "Audit" → expect URL /settings/audit

**Test: "organization CRUD"**
- Navigate to /settings/user-management/organization
- Click "Create" button (PlusOutlined)
- Fill "Name" → "E2E Test Org"
- Fill "Description" → "Created by E2E test"
- Submit form
- Verify success toast
- Search for "E2E Test Org" in the table
- Click edit (EditOutlined) on that row
- Change name to "E2E Test Org Updated"
- Save → verify success
- Delete the row → confirm → verify success

**Test: "agent approval settings save and persist"**
- Navigate to /settings/agent-management/approval-settings
- Select "Manual" for Approval Type radio
- Click Save
- Verify `message.success('Agent approval settings updated successfully')` toast
- Reload the page
- Verify "Manual" is still selected (persisted)
- Change back to "Auto" and save (cleanup)

**Test: "patch preferences save and persist"**
- Navigate to /settings/patch-management/patch-preferences
- Toggle a setting (e.g., "Enable Third Party Patching" switch)
- Click Save
- Verify `message.success('Patch preferences updated successfully')` toast
- Reload page → verify the toggle persisted
- Reset to original value (cleanup)

**Test: "user management — invite and manage users"**
- Navigate to /settings/user-management/users
- Click "Create User" button
- Fill: First Name, Last Name, Email (unique), select a Role
- Submit → verify success
- Search for the created user in the table
- Click edit → change a field → save → verify success
- Delete the user → confirm → verify success

---

### `frontend/e2e/patch-test-approve.spec.ts` — Patch Test & Approve

**Test: "page loads with table or empty state"**
- Navigate to /patches/test-approve
- Expect heading "Patch Test and Approve"
- Verify either: table with data, OR empty state "No patch tests configured yet" with "Create Test" button

**Test: "create a patch test"**
- Click "Create" button (PlusOutlined)
- Fill the test form in the modal (title: "Create Patch Test")
- Submit → verify `message.success('Test created successfully')` toast
- Verify test appears in table with status tag (PENDING/APPROVED/IN_PROGRESS)

**Test: "approve a patch test"**
- Find a test with PENDING status
- Click action menu (MoreOutlined) → "Approve"
- Verify `message.success('Test approved successfully')` toast
- Verify status changes to APPROVED (green tag)

**Test: "delete a patch test"**
- Click action menu → "Delete"
- Confirm: "Are you sure you want to delete {test.name}?"
- Click "Delete"
- Verify `message.success('Test deleted successfully')` toast

---

### `frontend/e2e/zero-touch.spec.ts` — Zero Touch Deployment

**Test: "page loads"**
- Navigate to /patches/zero-touch
- Expect heading "Zero Touch Deployment"

**Test: "create configuration"**
- Click "Create" button
- Fill form in modal (title: "Create Zero Touch Configuration")
- Submit → verify success

**Test: "edit and delete configuration"**
- Click action menu on a config → "Edit"
- Modify a field → save → verify success
- Click action menu → "Delete"
- Confirm: "Are you sure you want to delete {config.name}?"
- Verify success

---

### `frontend/e2e/sidebar-navigation.spec.ts` — Sidebar Context Switching

**Test: "assets sidebar shows correct sub-navigation"**
- Navigate to /assets
- In sidebar (role="navigation", name="Primary navigation"), verify items:
  - "All Assets" → /assets
  - "Software Inventory" → /assets/software-inventory
  - "Software Licenses" → /assets/software-license
  - "Software Hub" → /assets/hub
- Click each item → verify URL updates and page loads

**Test: "patches sidebar shows correct sub-navigation"**
- Navigate to /patches
- Verify sidebar items:
  - "All Patches" → /patches
  - "Patch Deployments" → /patches/deployed
  - "Patch Test and Approve" → /patches/test-approve
  - "Zero Touch Deployment" → /patches/zero-touch
  - "Patch Jobs" → /patches/patch-jobs

**Test: "vulnerability sidebar shows correct sub-navigation"**
- Navigate to /vulnerability
- Verify sidebar items:
  - "Zero Day Vulnerabilities"
  - "Vulnerabilities"
  - "Manage Exception"
  - "Vulnerability Jobs"

**Test: "sidebar pin/unpin works"**
- Navigate to /assets
- Click aria-label "Pin sidebar"
- Verify sidebar stays expanded
- Click aria-label "Unpin sidebar"
- Verify sidebar collapses

---

### `frontend/e2e/patch-jobs.spec.ts` — Patch Jobs

**Test: "patch jobs page loads"**
- Navigate to /patches/patch-jobs
- Verify table loads with columns: ID, Name, Description, Type, Created By, Created On

**Test: "create a patch deployment job"**
- Click "Create New" button (PlusOutlined)
- In the large modal (title: "Create Patch Deployment", width 900):
  - Fill "Name" (required)
  - Fill "Description"
  - Select "Configuration Type" → "Install" radio
  - Select "Scope" → "Global"
  - Select target endpoints from "Target Endpoints" multi-select
  - Click "+ Add Patches" → in the Select Patches modal (width 1200):
    - Search for a patch
    - Select rows via checkboxes
    - Click "Select"
  - Select "Deployment Policy"
  - Set "Retry Count"
  - Click "Publish"
- Verify success

**Test: "delete a patch job"**
- Click DeleteOutlined on a job row
- Confirm in Popconfirm: "Are you sure you want to delete this policy?" → "Yes"
- Verify row removed

---

### `frontend/e2e/reports.spec.ts` — Reports

**Test: "reports page loads"**
- Navigate to /reports
- Verify table loads with report data (or empty state)

**Test: "create a report"**
- Click create button ("+")
- Fill report wizard steps
- Submit → verify success
- Verify report appears in table

---

## Step 3: Run & Verify

```bash
cd frontend && npx playwright test --project=setup --project=chromium
```

- All tests should pass
- Report total test count
- If any test is flaky (passes on retry), flag it
- If backend is not running, tests should fail with clear error (not hang forever — respect the 60s timeout)

---

## Rules

1. **DO NOT modify any source code** — only create files in `frontend/e2e/`
2. **Use Playwright best practices:**
   - `page.getByRole()`, `page.getByLabel()`, `page.getByText()`, `page.getByPlaceholder()` — NOT CSS selectors
   - Use `page.getByTestId()` only when data-testid exists (e.g., `data-testid="advanced-filters-button"`)
   - Use `.getByRole('button', { name: '...' })` for buttons
   - Use `.getByRole('menuitem', { name: '...' })` for nav items
   - Use `.getByLabel('...')` for form fields
   - Use `.getByPlaceholder('...')` for search inputs
3. **Ant Design specifics:**
   - Select dropdowns: click the select, then click the option in `.ant-select-dropdown` (use `page.locator('.ant-select-dropdown').getByText('...')`)
   - Toast messages: wait for `.ant-message-success`, `.ant-message-error`, or `.ant-message-info`
   - Modals: use `page.getByRole('dialog')` or `.ant-modal` locators
   - Tabs: use `page.getByRole('tab', { name: '...' })`
   - Confirm modals (Modal.confirm): these render in `.ant-modal-confirm` — use `.ant-modal-confirm-btns` for OK/Cancel
   - Popconfirm: renders as `.ant-popconfirm` — find the Yes/No buttons within
   - Tags: `.ant-tag` elements with text content
   - Badge counts: `.ant-badge-count` for notification counts
4. **Each test must be independent** — no shared state between tests except auth
5. **If a test needs data that doesn't exist:**
   - Create it at the START of the test via the UI
   - Clean it up at the END of the test (delete what you created)
   - Use `test.describe` with `test.beforeEach`/`test.afterEach` for shared setup/teardown within a file
6. **Keep tests under 100 lines each**
7. **Add reasonable timeouts** for slow operations (patch discovery, vulnerability scan, deployments)
8. **Use test.describe for grouping** and test.beforeEach for common navigation
9. **For tables with dynamic data:** don't assert exact values — assert structure (columns exist, rows present, correct types of content)
10. **Handle both seeded and empty states:** If a page might be empty, check for empty state first and create test data if needed

---

## Selector Quick Reference

```typescript
// LOGIN
page.getByLabel('Email')
page.getByLabel('Password')
page.getByRole('button', { name: 'Log in' })

// HEADER NAV
page.getByRole('menuitem', { name: 'Dashboard' })
page.getByRole('menuitem', { name: 'Assets' })
page.getByRole('menuitem', { name: 'Patches' })
page.getByRole('menuitem', { name: 'Vulnerability' })
page.getByRole('menuitem', { name: 'Reports' })
page.getByLabel('User profile menu')
page.getByLabel('Toggle AI Assistant')

// SIDEBAR
page.getByRole('navigation', { name: 'Primary navigation' })
page.getByLabel('Pin sidebar')
page.getByLabel('Unpin sidebar')

// DASHBOARD
page.getByLabel('Filter dashboard by endpoint platform')
page.getByLabel(/Total Endpoints:/)

// ASSETS
page.getByPlaceholder('Search assets...')
page.getByRole('button', { name: 'Add Assets' })
page.getByRole('button', { name: 'Filter' })
page.getByRole('button', { name: 'Download Agent' })

// PATCHES
page.getByPlaceholder('Search')
page.getByRole('button', { name: 'Create Patch' })
page.getByRole('button', { name: 'Discover Patches' })
page.getByRole('button', { name: 'Bulk Add' })
page.getByRole('button', { name: 'From Template' })
page.getByLabel('Software Name')
page.getByLabel('Platform')
page.getByLabel('Severity')
page.getByLabel('Category')

// DEPLOY MODAL
page.getByLabel('Deployment Name')
page.getByLabel('Target Agents')
page.getByRole('button', { name: 'Deploy Now' })

// PATCH RECOMMENDATIONS
page.getByPlaceholder('Search CVE, Asset, Patch...')
page.getByRole('button', { name: /Accept/ })
page.getByRole('button', { name: /Reject/ })
page.getByRole('button', { name: /Deploy/ })

// NOTIFICATIONS
page.getByPlaceholder('Search title or message...')
page.getByTitle('Mark as read')
page.getByTitle('Delete')

// VULNERABILITIES
page.getByPlaceholder('Search CVE, title, or description...')
page.getByTestId('advanced-filters-button')
page.getByRole('button', { name: 'Scan Now' })
page.getByRole('button', { name: 'Add Exceptions' })

// ANT DESIGN PATTERNS
page.locator('.ant-message-success')           // success toast
page.locator('.ant-message-error')             // error toast
page.locator('.ant-message-info')              // info toast
page.locator('.ant-select-dropdown')           // select dropdown panel
page.locator('.ant-modal-confirm-btns')        // Modal.confirm buttons
page.locator('.ant-popconfirm')                // Popconfirm
page.getByRole('dialog')                       // Modal
page.getByRole('tab', { name: '...' })         // Tabs
page.locator('.ant-badge-count')               // Badge count
```

---

## File Structure

```
frontend/e2e/
├── auth.setup.ts
├── fixtures.ts
├── auth.spec.ts
├── dashboard.spec.ts
├── assets.spec.ts
├── patches.spec.ts
├── patch-recommendations.spec.ts
├── patch-test-approve.spec.ts
├── patch-jobs.spec.ts
├── zero-touch.spec.ts
├── deployments.spec.ts
├── vulnerabilities.spec.ts
├── notifications.spec.ts
├── settings.spec.ts
├── sidebar-navigation.spec.ts
└── reports.spec.ts
```

Total: ~15 test files, ~60-70 individual tests covering all critical user paths.
