# PRD: Frontend QA Testing - PatchIQ

## Document Information

| Field | Value |
|-------|-------|
| **Title** | Frontend Comprehensive QA Testing |
| **Version** | 1.0 |
| **Date** | 2026-02-16 |
| **Author** | QA Team |
| **Status** | Planning |
| **Priority** | P0 - Critical |

---

## 1. Executive Summary

## ⚠️ MANDATORY: Use Teammate Tool Throughout Testing

This PRD assumes **heavy use of Claude Code's teammate tool** (Task tool with specialized agents) for all testing activities. Manual testing of 40+ pages is infeasible within timeline constraints.

**Teammate Usage Requirements:**
- Launch agents in parallel for independent test cases
- Use explore agents for deep feature investigation
- Use bash agents for performance audits and log analysis
- Document all agent findings in test reports
- Minimum 3-5 agents per day during active testing phases

See [FRONTEND-QA-ROADMAP.md](./FRONTEND-QA-ROADMAP.md) Appendix C for detailed teammate usage guidelines.

---

### 1.1 Problem Statement

After merging `full-dev-heramb` (backend settings + LDAP + RBAC) into `full-dev-sandy-v2` (frontend overhaul), we need to validate that the entire PatchIQ frontend application is fully functional. This includes:

- 11 major feature areas
- 40+ page routes
- 65+ API endpoints
- 12+ asset detail tabs
- Real-time notifications (SSE)
- RBAC permissions
- Cross-browser compatibility

**Current State:**
- Merge completed with minor issues (ESLint errors, Go build errors, shared types conflict)
- Backend TypeScript compiles cleanly
- Frontend TypeScript compiles cleanly
- No merge conflicts
- App has not been tested end-to-end post-merge

**Desired State:**
- All features validated and working
- Zero blocking bugs (P0)
- Minimal critical bugs (P1 ≤ 2)
- Performance, accessibility, and browser compatibility confirmed
- Confidence to deploy to staging/production

### 1.2 Goals

1. **Validate functionality:** Ensure all 11 feature areas work correctly
2. **Identify regressions:** Find bugs introduced by merge or recent changes
3. **Verify integrations:** Confirm frontend ↔ backend communication works
4. **Assess quality:** Measure performance, accessibility, and UX
5. **Document coverage:** Create comprehensive test case library

### 1.3 Non-Goals

- **Not** writing automated E2E tests (Playwright/Cypress) in this phase
- **Not** refactoring code or fixing technical debt
- **Not** adding new features
- **Not** testing backend logic directly (covered by backend tests)

---

## 2. Background & Context

### 2.1 Application Architecture

**Frontend Stack:**
- React 19 + Vite
- TypeScript (strict mode)
- Ant Design 6 (UI components)
- React Query (TanStack) for server state
- Axios for HTTP requests
- Server-Sent Events (SSE) for real-time notifications

**Backend Stack:**
- Node.js 18+ with Express
- PostgreSQL + Prisma ORM
- Redis (caching, job queues)
- MinIO (S3-compatible object storage)

**Communication:**
- RESTful API at `/v1/*` (proxied via nginx)
- JWT authentication (Bearer token)
- Standard response envelope: `{ success: boolean, data: T, meta?: {...} }`
- SSE endpoint: `/v1/notifications/stream?token=<JWT>`

### 2.2 Recent Changes (Merge Context)

**From `full-dev-heramb`:**
- LDAP/Active Directory integration
- RBAC (Role-Based Access Control) middleware
- Settings expansion (15+ new settings pages)
- Agent enrollment & configuration
- Audit logging enhancements
- Password policy enforcement
- Branding customization

**From `full-dev-sandy-v2`:**
- Frontend Phase 3 completion (React Query migration)
- 19 custom hooks for data fetching
- Shared components (DataTable, FormModal, etc.)
- Decomposed page components (< 400 lines each)

**Known Issues Post-Merge:**
- 22 ESLint errors (unused vars, `no-explicit-any`, etc.)
- 2 Go agent build errors (`CPUPercent`/`MemoryPercent` missing fields)
- 1 shared types error (`AgentGroup` duplicate export)

### 2.3 User Personas

1. **Admin** - Full access, manages organization, users, settings
2. **Security Analyst** - Manages vulnerabilities, patches, compliance
3. **IT Operator** - Deploys patches, manages assets, runs scans
4. **Read-Only User** - Views dashboards, reports, assets (no modifications)
5. **LDAP/AD User** - Authenticates via directory service, inherits group roles

---

## 3. Feature Areas & Test Scope

### 3.1 Feature Area Breakdown

| # | Feature Area | Pages | Priority | Complexity |
|---|---|---|---|---|
| 1 | **Authentication** | 3 | P0 | Low |
| 2 | **Dashboard** | 1 | P0 | Low |
| 3 | **Patches** | 7 | P0 | High |
| 4 | **Assets** | 4 | P0 | Very High |
| 5 | **Vulnerabilities** | 5 | P0 | High |
| 6 | **Discovery** | 3 | P1 | Medium |
| 7 | **Hub (Packages)** | 1 | P1 | Medium |
| 8 | **Jobs & Deployments** | 3 | P1 | High |
| 9 | **Notifications** | 1 + SSE | P1 | Medium |
| 10 | **Reports** | 2 | P2 | Low |
| 11 | **Settings** | 15+ | P1 | Very High |

### 3.2 API Integration Points

**18 Service Files:**
1. `authService` - Login, logout, password reset
2. `assetService` - Assets CRUD + 12 detail tabs
3. `patchService` - Patches CRUD, deployments, supersedence
4. `patchRecommendationService` - Recommendations, accept/reject/deploy
5. `vulnerabilityService` - CVEs, exceptions, scanning, NVD sync
6. `discoveryService` - IP ranges, credentials, agents
7. `hubService` - Software packages, bundles
8. `jobsService` - Deployment policies, config catalog
9. `notificationService` - Notifications CRUD, SSE stream, preferences
10. `reportsService` - Report generation, scheduling
11. `settingsService` - 65+ settings endpoints
12. `dashboardService` - Dashboard stats, top vulnerabilities
13. `deploymentService` - Patch/software deployments, task tracking
14. `patchTemplateService` - Patch templates CRUD
15. `agentService` - Agent management, commands
16. `licenseService` - Software/OS licenses
17. `alertService` - Security alerts (if separate from notifications)
18. `aiService` - AI chat integration (if implemented)

### 3.3 Real-Time Features

**Server-Sent Events (SSE):**
- Endpoint: `/v1/notifications/stream?token=<JWT>`
- Hook: `useNotificationSSE()`
- Events: Deployment status, agent updates, vulnerability discoveries, alerts
- Auto-reconnect: 5-second delay on disconnect

**Polling:**
- `usePolling()` hook wraps React Query's `refetchInterval`
- Use cases: Job status, deployment progress, scan results
- Configurable interval (default 5 seconds)

---

## 4. Test Cases by Feature Area

### 4.1 Authentication & Session (P0)

**Routes:** `/login`, `/forgot-password`, `/onboarding`

#### Test Cases

**TC-AUTH-001: Login with valid credentials**
- **Preconditions:** User `admin@patchiq.io` exists with password `admin123`
- **Steps:**
  1. Navigate to `/login`
  2. Enter email: `admin@patchiq.io`
  3. Enter password: `admin123`
  4. Click "Login"
- **Expected Result:**
  - Redirects to `/dashboard`
  - JWT token saved in localStorage (`AUTH_ACCESS_TOKEN`)
  - User menu shows "admin@patchiq.io"
  - No console errors
- **Actual Result:** [To be filled during testing]
- **Status:** [Pass/Fail]
- **Notes:** [Any observations]

**TC-AUTH-002: Login with invalid credentials**
- **Preconditions:** None
- **Steps:**
  1. Navigate to `/login`
  2. Enter email: `admin@patchiq.io`
  3. Enter password: `wrongpassword`
  4. Click "Login"
- **Expected Result:**
  - Error message: "Invalid email or password"
  - Stays on `/login`
  - No token in localStorage
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-AUTH-003: Logout**
- **Preconditions:** User logged in
- **Steps:**
  1. Click user menu in header
  2. Click "Logout"
- **Expected Result:**
  - Redirects to `/login`
  - Tokens cleared from localStorage
  - API request to `/v1/auth/logout` succeeds
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-AUTH-004: Session persistence**
- **Preconditions:** User logged in
- **Steps:**
  1. Log in as admin
  2. Refresh page (F5)
- **Expected Result:**
  - Stays logged in
  - Dashboard remains visible
  - User menu still shows email
  - No re-authentication required
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-AUTH-005: Expired token handling**
- **Preconditions:** User logged in with expired token
- **Steps:**
  1. Manually expire token (set expiry to past in localStorage)
  2. Navigate to any protected route (e.g., `/assets`)
- **Expected Result:**
  - Redirects to `/login`
  - Error message: "Session expired. Please log in again."
  - Tokens cleared from localStorage
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-AUTH-006: Forgot password flow**
- **Preconditions:** User email exists in system
- **Steps:**
  1. Navigate to `/forgot-password`
  2. Enter email: `admin@patchiq.io`
  3. Click "Send Reset Link"
- **Expected Result:**
  - Success message: "Password reset link sent to your email"
  - Backend sends email (check mail server logs)
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-AUTH-007: Password reset**
- **Preconditions:** Password reset token received
- **Steps:**
  1. Click reset link from email (opens `/reset-password?token=<token>`)
  2. Enter new password: `newpassword123`
  3. Confirm password: `newpassword123`
  4. Click "Reset Password"
- **Expected Result:**
  - Success message: "Password reset successfully"
  - Redirects to `/login`
  - Can log in with new password
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-AUTH-008: Onboarding flow**
- **Preconditions:** New user created, onboarding incomplete
- **Steps:**
  1. Log in as new user (redirects to `/onboarding`)
  2. Complete onboarding form (name, role, preferences)
  3. Click "Complete Setup"
- **Expected Result:**
  - Redirects to `/dashboard`
  - User profile updated
  - Onboarding flag set to `true`
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-AUTH-009: Protected route access (unauthenticated)**
- **Preconditions:** User not logged in
- **Steps:**
  1. Navigate directly to `/assets` (protected route)
- **Expected Result:**
  - Redirects to `/login`
  - URL includes `redirect=/assets` (if implemented)
  - After login, redirects back to `/assets`
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-AUTH-010: Public route access (authenticated)**
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to `/login`
- **Expected Result:**
  - Redirects to `/dashboard`
  - Cannot access login page while authenticated
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

---

### 4.2 Dashboard (P0)

**Route:** `/dashboard`

#### Test Cases

**TC-DASH-001: Dashboard loads**
- **Preconditions:** User logged in, seed data exists
- **Steps:**
  1. Navigate to `/dashboard`
- **Expected Result:**
  - Page loads within 3 seconds
  - Stats cards display (Assets, Patches, Vulnerabilities, Deployments)
  - Top vulnerabilities section loads
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-DASH-002: Stats cards display correct values**
- **Preconditions:** Dashboard loaded
- **Steps:**
  1. Note values in stats cards
  2. Navigate to corresponding pages (e.g., `/assets`, `/patches`)
  3. Compare counts
- **Expected Result:**
  - Stats card values match actual counts
  - Percentages/trends calculate correctly
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-DASH-003: Top vulnerabilities section**
- **Preconditions:** Dashboard loaded, vulnerabilities exist
- **Steps:**
  1. Observe top vulnerabilities list
  2. Click on a vulnerability
- **Expected Result:**
  - Shows top 5-10 CVEs by severity/CVSS
  - Clicking navigates to vulnerability detail page
  - Severity badges color-coded (critical=red, high=orange, etc.)
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-DASH-004: Refresh dashboard**
- **Preconditions:** Dashboard loaded
- **Steps:**
  1. Click refresh button (if exists)
  2. Wait for data to reload
- **Expected Result:**
  - Loading indicators appear
  - Stats update
  - No errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-DASH-005: Dashboard empty state**
- **Preconditions:** New install, no data
- **Steps:**
  1. Navigate to `/dashboard` with empty database
- **Expected Result:**
  - Stats show 0
  - Empty state messages appear
  - No console errors
  - Helpful prompts to add data
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

---

### 4.3 Patches (P0)

**Routes:** `/patches`, `/patches/:id`, `/patch-recommendations`, `/patches/test-approve`, `/patches/zero-touch`, `/patches/patch-jobs`, `/patches/deployed/*`

#### Test Cases

**TC-PATCH-001: Patch list loads**
- **Preconditions:** User logged in, patches exist
- **Steps:**
  1. Navigate to `/patches`
- **Expected Result:**
  - Patch list loads within 2 seconds
  - Shows columns: Name, Vendor, Severity, Status, Release Date
  - Pagination controls visible
  - Search box present
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-002: Search patches**
- **Preconditions:** Patch list loaded
- **Steps:**
  1. Enter search term in search box (e.g., "Windows")
  2. Wait for results
- **Expected Result:**
  - Results filter within 500ms (debounced)
  - Only patches matching "Windows" display
  - Pagination resets to page 1
  - Search term persists on page reload (if syncUrl=true)
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-003: Filter patches by severity**
- **Preconditions:** Patch list loaded
- **Steps:**
  1. Click filter icon
  2. Select "Critical" severity
  3. Apply filter
- **Expected Result:**
  - Only critical patches display
  - Filter badge shows "Severity: Critical"
  - Clear filter button visible
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-004: Sort patches by date**
- **Preconditions:** Patch list loaded
- **Steps:**
  1. Click "Release Date" column header
- **Expected Result:**
  - Patches sort by date descending
  - Arrow icon indicates sort direction
  - Click again to toggle ascending
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-005: Pagination**
- **Preconditions:** Patch list loaded with > 20 patches
- **Steps:**
  1. Click "Next Page" button
- **Expected Result:**
  - Loads page 2
  - URL updates to `?page=2` (if syncUrl=true)
  - Page size dropdown allows changing (10, 20, 50, 100)
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-006: View patch details**
- **Preconditions:** Patch list loaded
- **Steps:**
  1. Click on first patch in list
- **Expected Result:**
  - Navigates to `/patches/:id`
  - Details page loads within 2 seconds
  - Shows: Name, Vendor, Description, Severity, Release Date, Affected Products
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-007: Create patch**
- **Preconditions:** User has create permission
- **Steps:**
  1. Click "Create Patch" button
  2. Fill form: Name, Vendor, Severity, Description
  3. Click "Create"
- **Expected Result:**
  - Modal/form validates required fields
  - Success message: "Patch created successfully"
  - Redirects to patch details page
  - Patch appears in list
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-008: Edit patch**
- **Preconditions:** Patch details page loaded
- **Steps:**
  1. Click "Edit" button
  2. Update description field
  3. Click "Save"
- **Expected Result:**
  - Changes saved
  - Success message appears
  - Details page shows updated description
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-009: Delete patch**
- **Preconditions:** Patch details page loaded
- **Steps:**
  1. Click "Delete" button
  2. Confirm deletion in modal
- **Expected Result:**
  - Confirmation modal: "Are you sure you want to delete this patch?"
  - After confirm, patch deleted
  - Redirects to patch list
  - Patch no longer in list
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-010: View affected products**
- **Preconditions:** Patch details page loaded
- **Steps:**
  1. Scroll to "Affected Products" section
- **Expected Result:**
  - Lists all affected software (name, version)
  - Each product clickable (navigates to software details)
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-011: Add affected product**
- **Preconditions:** Patch details page loaded
- **Steps:**
  1. Click "Add Affected Product"
  2. Select software from dropdown
  3. Click "Add"
- **Expected Result:**
  - Product added to list
  - Success message appears
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-012: View supersedence**
- **Preconditions:** Patch with supersedence relationships
- **Steps:**
  1. Navigate to patch details
  2. View "Supersedes" and "Superseded By" sections
- **Expected Result:**
  - Shows patches this one replaces ("Supersedes")
  - Shows patches that replace this one ("Superseded By")
  - Each patch clickable
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-013: Add supersedence relationship**
- **Preconditions:** Patch details page loaded
- **Steps:**
  1. Click "Add Supersedence"
  2. Select target patch from dropdown
  3. Click "Add"
- **Expected Result:**
  - Relationship created
  - Target patch appears in "Supersedes" section
  - Success message appears
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-014: Create deployment**
- **Preconditions:** Patch details page loaded
- **Steps:**
  1. Click "Deploy" button
  2. Select target assets (3 assets)
  3. Choose schedule: "Immediate"
  4. Click "Deploy"
- **Expected Result:**
  - Deployment modal validates selections
  - Success message: "Deployment created successfully"
  - Redirects to deployment status page
  - Deployment appears in deployments list
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-015: Preview deployment**
- **Preconditions:** Deployment created
- **Steps:**
  1. Navigate to deployment details
  2. Click "Preview"
- **Expected Result:**
  - Shows list of tasks (1 per asset)
  - Each task shows: Asset name, Status (pending)
  - Total count: 3 tasks
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-016: Execute deployment**
- **Preconditions:** Deployment created
- **Steps:**
  1. Click "Execute" button
  2. Confirm execution
- **Expected Result:**
  - Deployment status changes to "In Progress"
  - Tasks start executing (status updates via polling or SSE)
  - Progress bar shows completion percentage
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-017: Monitor deployment progress**
- **Preconditions:** Deployment executing
- **Steps:**
  1. Observe deployment status page
  2. Wait for tasks to complete
- **Expected Result:**
  - Task statuses update in real-time (or every 5 seconds)
  - Completed tasks show green checkmark
  - Failed tasks show red X
  - Overall status updates to "Completed" or "Failed"
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-018: Cancel deployment**
- **Preconditions:** Deployment in progress
- **Steps:**
  1. Click "Cancel" button
  2. Confirm cancellation
- **Expected Result:**
  - Deployment status changes to "Cancelled"
  - In-progress tasks stop
  - Pending tasks never start
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-019: Retry failed deployment**
- **Preconditions:** Deployment failed
- **Steps:**
  1. Click "Retry" button
  2. Confirm retry
- **Expected Result:**
  - Only failed tasks retry
  - Successful tasks don't re-run
  - Deployment status changes to "In Progress"
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-020: Patch recommendations list**
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to `/patch-recommendations`
- **Expected Result:**
  - Recommendations list loads
  - Shows columns: Asset, Patch, Severity, Status, Reason
  - Filter by status: Pending, Accepted, Rejected
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-021: Accept recommendation**
- **Preconditions:** Recommendations list loaded
- **Steps:**
  1. Select a recommendation
  2. Click "Accept"
  3. Enter reason (optional)
  4. Confirm
- **Expected Result:**
  - Recommendation status changes to "Accepted"
  - Success message appears
  - Recommendation count in dashboard updates
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-022: Reject recommendation**
- **Preconditions:** Recommendations list loaded
- **Steps:**
  1. Select a recommendation
  2. Click "Reject"
  3. Enter reason (required)
  4. Confirm
- **Expected Result:**
  - Recommendation status changes to "Rejected"
  - Reason saved
  - Success message appears
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-023: Deploy recommendation**
- **Preconditions:** Recommendations list loaded
- **Steps:**
  1. Select a recommendation
  2. Click "Deploy"
  3. Choose schedule
  4. Confirm
- **Expected Result:**
  - Deployment created
  - Recommendation status changes to "Deployed"
  - Redirects to deployment status page
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-024: Bulk accept recommendations**
- **Preconditions:** Recommendations list loaded
- **Steps:**
  1. Select 3 recommendations (checkbox)
  2. Click "Bulk Accept"
  3. Confirm
- **Expected Result:**
  - All 3 recommendations status change to "Accepted"
  - Success message: "3 recommendations accepted"
  - Dashboard count updates
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-025: Patch test creation**
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to `/patches/test-approve`
  2. Click "Create Test"
  3. Select patch
  4. Select test assets (VMs)
  5. Click "Create"
- **Expected Result:**
  - Test environment created
  - Patch deployed to test assets
  - Test status: "In Progress"
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-026: Approve patch test**
- **Preconditions:** Patch test completed successfully
- **Steps:**
  1. View test results
  2. Click "Approve"
  3. Confirm approval
- **Expected Result:**
  - Patch marked as "Approved for Production"
  - Test status: "Approved"
  - Patch can now be deployed to production
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-027: Zero-touch config creation**
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to `/patches/zero-touch`
  2. Click "Create Config"
  3. Set criteria: Severity >= High, Age <= 30 days
  4. Select target group: "All Production Servers"
  5. Set schedule: Daily at 2 AM
  6. Enable config
  7. Click "Create"
- **Expected Result:**
  - Config created
  - Success message appears
  - Config appears in list
  - Patches matching criteria auto-deploy on schedule
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-028: Edit zero-touch config**
- **Preconditions:** Zero-touch config exists
- **Steps:**
  1. Click "Edit" on a config
  2. Update schedule to Weekly
  3. Click "Save"
- **Expected Result:**
  - Config updated
  - Success message appears
  - Schedule changes reflected
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-029: Disable zero-touch config**
- **Preconditions:** Zero-touch config enabled
- **Steps:**
  1. Toggle "Enabled" switch to off
- **Expected Result:**
  - Config disabled
  - No automatic deployments occur
  - Config remains in list but marked "Disabled"
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-PATCH-030: Delete zero-touch config**
- **Preconditions:** Zero-touch config exists
- **Steps:**
  1. Click "Delete"
  2. Confirm deletion
- **Expected Result:**
  - Config deleted
  - Removed from list
  - No automatic deployments occur
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

---

### 4.4 Assets (P0)

**Routes:** `/assets`, `/assets/:id`, `/assets/software-inventory`, `/assets/software-license`

**NOTE:** Assets has 12+ detail tabs, making it the most complex feature area.

#### Test Cases

**TC-ASSET-001: Asset list loads**
- **Preconditions:** User logged in, assets exist
- **Steps:**
  1. Navigate to `/assets`
- **Expected Result:**
  - Asset list loads within 2 seconds
  - Shows columns: Hostname, IP, OS, Status, Last Seen
  - Pagination, search, filters present
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-002: Search assets**
- **Preconditions:** Asset list loaded
- **Steps:**
  1. Enter search term (e.g., "WIN-SERVER")
- **Expected Result:**
  - Results filter within 500ms
  - Only matching assets display
  - Pagination resets
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-003: Filter by status**
- **Preconditions:** Asset list loaded
- **Steps:**
  1. Open filter drawer
  2. Select "Active" status
  3. Apply filter
- **Expected Result:**
  - Only active assets display
  - Filter badge shows "Status: Active"
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-004: View asset details**
- **Preconditions:** Asset list loaded
- **Steps:**
  1. Click on first asset
- **Expected Result:**
  - Navigates to `/assets/:id`
  - Details page loads within 2 seconds
  - Overview tab active by default
  - 12+ tabs visible: Hardware, Software, Patches, Vulnerabilities, Alerts, Security, Network, Peripherals, Telemetry, Audit Log, Deployments, System Errors
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-005: Hardware tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Hardware" tab
- **Expected Result:**
  - Shows: CPU model, cores, RAM, storage, BIOS info
  - No console errors
  - Data loads within 2 seconds
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-006: Software tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Software" tab
- **Expected Result:**
  - Shows list of installed software (name, version, vendor)
  - Searchable
  - Sortable by name/version
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-007: Patches tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Patches" tab
- **Expected Result:**
  - Shows applied patches
  - Shows missing patches (if any)
  - Each patch clickable (navigates to patch details)
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-008: Vulnerabilities tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Vulnerabilities" tab
- **Expected Result:**
  - Shows CVEs affecting this asset
  - Grouped by severity
  - Each CVE clickable
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-009: Alerts tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Alerts" tab
- **Expected Result:**
  - Shows active alerts (security, compliance, etc.)
  - Each alert has severity badge
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-010: Security tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Security" tab
- **Expected Result:**
  - Shows: Antivirus status, Firewall status, Compliance score
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-011: Network tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Network" tab
- **Expected Result:**
  - Shows: IP address, MAC, DNS, Gateway, WiFi SSID (if applicable)
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-012: Peripherals tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Peripherals" tab
- **Expected Result:**
  - Shows: USB devices, monitors, printers
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-013: Telemetry tab (real-time)**
- **Preconditions:** Asset details page loaded, agent online
- **Steps:**
  1. Click "Telemetry" tab
  2. Wait 10 seconds
- **Expected Result:**
  - Shows: CPU usage (%), RAM usage (%), Disk usage (%)
  - Gauges or progress bars visualize usage
  - Updates every 5-10 seconds (polling or SSE)
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-014: Audit log tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Audit Log" tab
- **Expected Result:**
  - Shows change history (who, what, when)
  - Sortable by date
  - Filterable by operation type
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-015: Deployments tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Deployments" tab
- **Expected Result:**
  - Shows deployment history (patches, software)
  - Each deployment clickable
  - Status badges (success, failed, in progress)
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-016: System errors tab**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "System Errors" tab
- **Expected Result:**
  - Shows system error logs from agent
  - Filterable by severity
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-017: Create asset**
- **Preconditions:** User has create permission
- **Steps:**
  1. Click "Create Asset" button
  2. Fill form: Hostname, IP, OS, Category
  3. Click "Create"
- **Expected Result:**
  - Asset created
  - Success message appears
  - Redirects to asset details
  - Asset appears in list
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-018: Edit asset**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Edit" button
  2. Update category
  3. Click "Save"
- **Expected Result:**
  - Changes saved
  - Success message appears
  - Details page shows updated category
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-019: Delete asset**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Delete" button
  2. Confirm deletion
- **Expected Result:**
  - Confirmation modal appears
  - After confirm, asset deleted
  - Redirects to asset list
  - Asset no longer in list
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-020: Force refresh inventory**
- **Preconditions:** Asset details page loaded, agent online
- **Steps:**
  1. Click "Refresh Inventory" button
- **Expected Result:**
  - Command sent to agent
  - Loading indicator appears
  - After 30-60 seconds, inventory updates
  - Success message: "Inventory refreshed"
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-021: Upload attachment**
- **Preconditions:** Asset details page loaded
- **Steps:**
  1. Click "Upload Attachment"
  2. Select file (PDF, image)
  3. Click "Upload"
- **Expected Result:**
  - File uploads to MinIO
  - Success message appears
  - Attachment appears in "Attachments" section
  - Click to download/view
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-022: Software inventory list**
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to `/assets/software-inventory`
- **Expected Result:**
  - Shows all installed software across all assets
  - Columns: Software Name, Version, Vendor, Asset Count
  - Searchable
  - Sortable
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-023: Import software inventory**
- **Preconditions:** Software inventory page loaded
- **Steps:**
  1. Click "Import"
  2. Select CSV file
  3. Click "Upload"
- **Expected Result:**
  - File uploads
  - Software imported
  - Success message: "X software items imported"
  - List updates
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-024: Software licenses list**
- **Preconditions:** User logged in
- **Steps:**
  1. Navigate to `/assets/software-license`
- **Expected Result:**
  - Shows all software licenses
  - Columns: Software, Vendor, License Count, Expiry Date
  - Expired licenses highlighted
  - No console errors
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

**TC-ASSET-025: Create software license**
- **Preconditions:** Software licenses page loaded
- **Steps:**
  1. Click "Create License"
  2. Fill form: Software, Vendor, Count, Expiry Date
  3. Click "Create"
- **Expected Result:**
  - License created
  - Success message appears
  - License appears in list
- **Actual Result:** [To be filled]
- **Status:** [Pass/Fail]

---

*[Additional test cases for Vulnerabilities, Discovery, Hub, Jobs, Notifications, Reports, and Settings would follow the same format. Due to length constraints, I'll create separate test case files for each feature area.]*

---

## 5. Expectations & Results

### 5.1 What We Expect

**Functional:**
- All CRUD operations work correctly
- API responses match expected formats
- Data persists across sessions
- Real-time features update without page refresh
- Navigation works without console errors

**Performance:**
- Page load < 3 seconds
- Search results < 500ms (debounced)
- List pagination < 1 second
- Modal open < 300ms
- No UI freezing with large datasets (1000+ rows)

**Quality:**
- Zero console errors or warnings
- Forms validate correctly
- Error messages are helpful
- Empty states display when appropriate
- Loading states show during async operations

**UX:**
- Responsive design works on mobile/tablet/desktop
- Keyboard navigation functions
- Color contrast meets WCAG 2.1 AA
- Touch targets >= 44x44px
- Icons have alt text or aria-labels

### 5.2 What Results Indicate Success

**Green Flags:**
- Test pass rate >= 95%
- Zero P0 bugs open
- P1 bugs <= 2
- Performance score >= 85 (Lighthouse)
- Accessibility score >= 90 (axe)
- All browsers render correctly
- Real-time features work reliably

**Yellow Flags (Acceptable):**
- Test pass rate 90-95%
- P1 bugs <= 5
- P2 bugs <= 10
- Minor visual glitches in secondary features

**Red Flags (Unacceptable):**
- Test pass rate < 90%
- Any P0 bugs open
- P1 bugs > 5
- Critical features broken
- Data loss or corruption
- Security vulnerabilities
- Performance < 70

---

## 6. What We Should NOT Do

### 6.1 Out of Scope

**Do NOT:**
- Write automated E2E tests in this phase (defer to Phase 6)
- Refactor code or fix technical debt (unless blocking testing)
- Add new features or enhancements
- Test backend logic directly (covered by backend tests)
- Load test with production-scale data (defer to performance testing phase)
- Penetration testing (defer to security audit)

### 6.2 Acceptable Trade-offs

**We can accept:**
- Minor visual inconsistencies (P3/P4 bugs)
- Performance slightly below target on large datasets (if rare)
- Edge cases with workarounds (documented)
- Browser bugs on unsupported browsers (IE11, old Safari)

**We cannot accept:**
- Data loss or corruption
- Security vulnerabilities (XSS, CSRF, SQL injection)
- Critical features broken
- Unusable on primary browsers (Chrome, Firefox, Safari, Edge)
- Console errors that impact functionality

---

## 7. Success Metrics

### 7.1 Test Coverage

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature areas tested | 11/11 (100%) | Manual count |
| Pages tested | 40/40 (100%) | Manual count |
| API integrations tested | 18/18 (100%) | Manual count |
| Test cases executed | >= 95% | (Passed + Failed) / Total |
| Test cases passed | >= 95% | Passed / Total |

### 7.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Console errors | 0 | Chrome DevTools Console |
| Console warnings | < 5 | Chrome DevTools Console |
| Lighthouse Performance | >= 85 | Lighthouse audit |
| Lighthouse Accessibility | >= 90 | axe DevTools audit |
| WCAG 2.1 AA compliance | 100% | axe audit + manual |
| Page load time | < 3s | Chrome DevTools Network |
| Search latency | < 500ms | Chrome DevTools Performance |

### 7.3 Bug Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| P0 bugs open | 0 | GitHub Issues |
| P1 bugs open | <= 2 | GitHub Issues |
| P2 bugs open | <= 10 | GitHub Issues |
| Bugs found per phase | Tracked | GitHub Issues |
| Bug fix rate | >= 90% | Fixed / Total |

---

## 7.5 Teammate Workflow Execution

**🤖 CRITICAL:** This testing effort REQUIRES using Claude Code's teammate tool (Task tool with agents). Manual execution alone cannot complete 300+ test cases across 40+ pages within 3-4 weeks.

### Teammate Distribution by Phase

| Phase | Agent Count | Primary Agent Types | Example Tasks |
|-------|-------------|---------------------|---------------|
| Phase 1 | 8 agents | General-purpose | Test login, dashboard, assets CRUD, patches CRUD, vulnerabilities |
| Phase 2 | 7 agents | Explore + General-purpose | Deep dive into deployments, 12 asset tabs, recommendations, scanning |
| Phase 3 | 7 agents | General-purpose | Discovery workflows, Hub packages, jobs, notifications (SSE), settings |
| Phase 4 | 11 agents | General-purpose + Bash | Reports, tests, exceptions, settings, edge case testing (5 agents) |
| Phase 5 | 18 agents | Bash + General-purpose | Performance (3), responsive (3), accessibility (3), browsers (4), E2E (5) |
| **Total** | **51 agents** | - | Complete coverage in 3-4 weeks |

### Daily Teammate Workflow

**Morning (9 AM - 12 PM):**
1. Review previous day's agent reports
2. File bugs from agent findings (P0/P1/P2)
3. Plan today's test scope (which features to test)
4. Write 3-5 detailed test prompts for agents
5. Launch agents in parallel (run_in_background=true)

**Afternoon (1 PM - 5 PM):**
6. Monitor agent progress (TaskOutput for long-running agents)
7. Collect completed agent reports
8. Synthesize findings into daily summary
9. Update test metrics spreadsheet
10. Communicate blockers to dev team

**Example Daily Execution (Phase 1 Day 1):**
```bash
# 9:30 AM - Launch 3 agents in parallel
Agent 1: "Test authentication flows (valid, invalid, expired token, session persistence)"
Agent 2: "Test password reset end-to-end (request → email → reset → login)"
Agent 3: "Test onboarding flow (new user → complete form → redirect to dashboard)"

# 10:00 AM - Work on bug triage from yesterday
# 11:00 AM - Check agent progress (TaskOutput)
# 12:00 PM - Agents complete, collect reports
# 2:00 PM - File 2 bugs found by agents
# 3:00 PM - Launch 2 more agents for afternoon testing
Agent 4: "Test dashboard (stats, charts, refresh, no console errors)"
Agent 5: "Test assets list (search, filter, pagination, bulk actions)"

# 4:30 PM - Collect afternoon agent reports
# 5:00 PM - Write daily summary, update metrics
```

### Teammate Best Practices

**DO:**
- Launch 3-10 agents per day during active testing
- Write detailed prompts with success criteria
- Request agents document console errors
- Ask agents for screenshots or reproduction steps
- Use explore agents for complex features (Assets, Settings)

**DON'T:**
- Test everything manually (defeats the purpose)
- Launch agents without clear success criteria
- Ignore agent findings (they're thorough)
- Skip edge case testing (agents excel at this)

**Teammate ROI:**
- Time saved: 2-3 weeks of manual testing
- Consistency: Agents follow steps exactly
- Coverage: 300+ test cases vs ~100 manual
- Cost: ~$15 in API costs (51 agents × $0.30 avg)

---

## 8. Dependencies

### 8.1 Technical Dependencies

- Backend services running (Postgres, Redis, MinIO)
- Backend API functional and seeded with test data
- Frontend compiles without errors
- Docker environment operational
- Network connectivity for SSE testing
- **Claude Code CLI installed with Task tool access (CRITICAL)**

### 8.2 Resource Dependencies

- QA engineers (4-5 people)
- Dev team availability for bug fixes
- Test environment (staging)
- Test data (seeded database)
- Browsers installed (Chrome, Firefox, Safari, Edge)

### 8.3 Blocking Issues

**Must be resolved before testing starts:**
- [ ] Merge issues fixed (ESLint, Go build, shared types)
- [ ] Backend services running
- [ ] Seed data loaded
- [ ] Frontend dev server starts without errors

**Can be resolved during testing:**
- [ ] Minor ESLint warnings
- [ ] P3/P4 visual bugs
- [ ] Documentation updates

---

## 9. Timeline & Milestones

### 9.1 Phase Schedule

| Phase | Duration | Start | End | Deliverable |
|-------|----------|-------|-----|-------------|
| Phase 1 | 5 days | Week 1 Mon | Week 1 Fri | Critical path foundation validated |
| Phase 2 | 5 days | Week 2 Mon | Week 2 Fri | Advanced operations validated |
| Phase 3 | 5 days | Week 2 Mon | Week 2 Fri | High priority features validated |
| Phase 4 | 5 days | Week 3 Mon | Week 3 Fri | Medium priority & edge cases validated |
| Phase 5 | 5 days | Week 3-4 Mon | Week 4 Fri | Cross-cutting & polish validated |

### 9.2 Milestones

- **Week 1 End:** Critical path validated, zero P0 bugs
- **Week 2 End:** All high-priority features validated, P1 bugs <= 3
- **Week 3 End:** All features validated, performance tested
- **Week 4 End:** Final sign-off, ready for staging deployment

---

## 10. Roles & Responsibilities

| Role | Name | Responsibilities |
|------|------|------------------|
| **QA Lead** | [TBD] | Roadmap planning, prioritization, bug triage, metrics tracking, final sign-off |
| **QA Engineer 1** | [TBD] | Authentication, Dashboard, Assets testing (Phases 1-2) |
| **QA Engineer 2** | [TBD] | Patches, Deployments, Vulnerabilities testing (Phases 1-2) |
| **QA Engineer 3** | [TBD] | Discovery, Hub, Jobs, Notifications testing (Phase 3) |
| **QA Engineer 4** | [TBD] | Settings, Reports, Error handling testing (Phases 3-4) |
| **Performance Tester** | [TBD] | Load testing, profiling, optimization validation (Phase 5) |
| **Accessibility Specialist** | [TBD] | WCAG audit, keyboard nav, screen reader testing (Phase 5) |
| **Dev Team** | [TBD] | Bug fixes, integration support, code reviews (All phases) |
| **Product Manager** | [TBD] | UAT, acceptance criteria validation, stakeholder communication |

---

## 11. Risk Management

### 11.1 Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Backend API changes break frontend | Medium | High | Test with latest backend, coordinate with backend team, freeze API during QA |
| SSE connection issues | Medium | High | Test with network throttling, implement reconnect logic, fallback to polling |
| Performance degrades with large datasets | Low | Medium | Load test with 1000+ assets/patches, profile with DevTools, optimize queries |
| RBAC permissions not enforced | Medium | High | Test each role thoroughly, verify API denies unauthorized access |
| Browser-specific bugs discovered late | Low | Medium | Run smoke tests on all browsers early (Phase 2), prioritize Chrome |
| QA team blocked by P0 bugs | Medium | High | Daily bug triage, dev team prioritizes P0 fixes within 24 hours |
| Test data insufficient or corrupt | Low | Medium | Validate seed data before testing, document required data, backup DB |

### 11.2 Contingency Plans

**If P0 bug blocks testing:**
- Dev team drops other work to fix
- QA pivots to unblocked feature areas
- QA Lead escalates to Product Manager

**If timeline slips:**
- Reduce Phase 4 scope (defer P2 features)
- Increase team size (add QA engineers)
- Extend timeline by 1 week

**If critical performance issues found:**
- Engage dev team for profiling
- Identify bottlenecks (API, database, rendering)
- Implement quick wins (caching, pagination, lazy loading)
- Defer complex optimizations to post-QA phase

---

## 12. Sign-off Criteria

### 12.1 QA Lead Sign-off

**Prerequisites:**
- [ ] All test cases executed
- [ ] Test pass rate >= 95%
- [ ] Zero P0 bugs open
- [ ] P1 bugs <= 2
- [ ] Performance score >= 85
- [ ] Accessibility score >= 90
- [ ] Cross-browser compatibility confirmed
- [ ] Bug metrics tracked and reported

**QA Lead Signature:** _______________________
**Date:** _______________________

### 12.2 Product Manager Sign-off

**Prerequisites:**
- [ ] UAT completed
- [ ] Acceptance criteria met
- [ ] Known issues documented
- [ ] Stakeholders informed

**Product Manager Signature:** _______________________
**Date:** _______________________

### 12.3 Dev Team Sign-off

**Prerequisites:**
- [ ] All P0 and P1 bugs fixed
- [ ] Code reviews completed
- [ ] Hotfix plan in place for P2 bugs
- [ ] Deployment plan reviewed

**Dev Lead Signature:** _______________________
**Date:** _______________________

---

**End of PRD**
