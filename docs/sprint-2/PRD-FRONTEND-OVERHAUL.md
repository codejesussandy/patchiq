# PRD: PatchIQ Frontend Overhaul - Sprint 2 Frontend Track

**Status:** Draft
**Created:** 2026-02-13
**Owner:** Dev 2 (Frontend)
**Sprint:** Sprint 2 - Frontend Track
**Dependencies:** Sprint 2 Pipeline 1 (Patch-CVE Correlation Backend) - COMPLETED

---

## 1. Problem Statement

PatchIQ's frontend has grown to 187 React components (27,928 lines) with critical technical debt that impacts security, performance, and user experience:

**Security Risk:** The AI chat panel uses `dangerouslySetInnerHTML` without sanitization (AIChatPanel.tsx:157), creating an XSS vulnerability where malicious responses could execute arbitrary JavaScript.

**Performance Issues:** Zero code splitting means users download a 500KB+ bundle on first load, with all 50+ routes imported statically. The MainLayout component (1,084 lines) re-renders on every state change, causing UI lag. Asset lists load 1,000+ records without pagination.

**Poor User Experience:** Despite backend Pipeline 1 delivering complete patch-vulnerability correlation, the frontend lacks critical views:
- No vulnerability-first analysis ("Which assets are vulnerable to CVE-2024-1234?")
- No bulk operations (users must accept/deploy recommendations one-by-one)
- No patch supersedence visibility (users deploy outdated patches)
- Missing accessibility features (no ARIA labels, color-only information, broken keyboard navigation)

**Code Maintainability Crisis:** Component complexity has exploded—MainLayout handles navigation, categories, profile, and chat in one file. Search/filter logic is duplicated across 8 components. No reusable patterns for severity displays, status badges, or action buttons.

**Business Impact:** Security audits will flag XSS vulnerabilities as blocking. Slow load times increase bounce rates. Poor UX forces manual workflows that should be automated. Technical debt increases the cost of every future feature by 2-3x.

**User Pain:** IT administrators waste hours manually reviewing 100+ patch recommendations. Security teams cannot quickly assess blast radius of new CVEs. Accessibility gaps violate compliance requirements (WCAG 2.1 AA).

---

## 2. Goals

### User Goals
1. **Reduce patch assessment time by 60%**: Bulk operations and improved correlation views let admins process 100+ recommendations in 15 minutes vs 40 minutes
2. **Increase vulnerability visibility by 100%**: New CVE → Asset matrix shows all affected systems in one view vs navigating through 10+ asset detail pages
3. **Support 100% keyboard navigation**: All actions accessible via keyboard for accessibility compliance (WCAG 2.1 AA)
4. **Load application in <2 seconds**: Code splitting and lazy loading reduce initial bundle from 500KB to <150KB

### Business Goals
5. **Eliminate XSS security risk**: Remove `dangerouslySetInnerHTML` and implement proper sanitization—pass security audit within 2 weeks
6. **Reduce maintenance cost by 50%**: Refactor 1,084-line MainLayout and establish reusable component patterns—new features take days vs weeks
7. **Enable mobile usage**: Responsive design allows field technicians to manage patches from tablets/phones—expand user base by 30%

---

## 3. Non-Goals

**Out of scope for Sprint 2 Frontend Track:**

1. **Backend API changes**: This PRD assumes Pipeline 1 APIs are complete. Any backend modifications are separate work (rationale: frontend can ship with existing APIs)

2. **New features beyond correlation views**: No workflow automation, reporting enhancements, or new modules. Focus is fixing/improving existing UI (rationale: feature additions are Sprint 3+)

3. **Complete design system rebuild**: We'll standardize patterns and improve Ant Design integration, but not replace the entire component library (rationale: 6+ week effort, diminishing returns)

4. **Real-time collaboration features**: No multi-user presence, live cursors, or collaborative editing (rationale: 1-2 admin users typically work independently)

5. **Data visualization overhaul**: Dashboard charts stay as-is. Focus on tabular data and correlation views (rationale: chart library replacement is separate initiative)

6. **Comprehensive E2E test suite**: We'll add tests for critical flows (login, patch deployment), but not full coverage (rationale: Sprint 2 focus is architecture, Sprint 3 can add broader testing)

---

## 4. User Stories

### Epic 1: Security & Stability
**As an IT security administrator**, I want the application to sanitize all user-generated content so that malicious input cannot compromise my session or data.
- **Acceptance**: XSS vulnerability eliminated, markdown rendering replaces `dangerouslySetInnerHTML`, security scan passes

**As a system administrator**, I want the application to gracefully handle errors so that one failed API call doesn't crash the entire interface.
- **Acceptance**: Error boundaries catch component failures, fallback UI shows, user can retry or navigate away

**As a frontend developer**, I want clear error messages when API calls fail so that I can quickly diagnose and fix issues.
- **Acceptance**: API errors show endpoint, status code, and user-friendly message; errors logged to console with request details

### Epic 2: Performance & Scalability
**As an IT administrator with slow internet**, I want the application to load quickly so that I can start working within 2-3 seconds.
- **Acceptance**: Initial bundle <150KB gzipped, first contentful paint <1.5s, time to interactive <2.5s

**As a security analyst viewing 500+ assets**, I want asset lists to load incrementally so that I can start reviewing data without waiting for the full dataset.
- **Acceptance**: Server-side pagination loads 50 items at a time, infinite scroll or pagination controls, <500ms per page load

**As a patch manager switching between pages**, I want instant navigation so that the interface feels responsive.
- **Acceptance**: Route changes render in <200ms, lazy-loaded routes cached after first visit, no full-page reloads

### Epic 3: Patch-CVE Correlation Views
**As a security analyst**, I want to see which assets are affected by a specific CVE so that I can assess blast radius within 30 seconds of a new vulnerability announcement.
- **Acceptance**: Vulnerability detail page shows all affected assets, asset versions, patch availability, one-click filter to "show only unpatched"

**As an IT manager**, I want to see all vulnerabilities a patch addresses so that I can justify deployment to stakeholders.
- **Acceptance**: Patch detail page shows CVE list with severity, CVSS scores, exploit status; exportable to PDF/CSV

**As a patch administrator**, I want to understand why a patch is recommended so that I can prioritize deployments based on risk scoring rationale.
- **Acceptance**: Recommendation shows risk score breakdown (CVSS × EPSS × asset criticality × exploit availability), tooltip explains calculation

**As a compliance officer**, I want to see patch supersedence relationships so that I deploy the latest cumulative update instead of outdated individual patches.
- **Acceptance**: Patch detail shows "Supersedes: KB123, KB124" and "Superseded by: KB999", recommendations filter out superseded patches

**As an operations manager**, I want a matrix view of assets × patches × vulnerabilities so that I can identify coverage gaps at a glance.
- **Acceptance**: Matrix table with color-coded cells (patched=green, vulnerable=red, N/A=gray), exportable, filterable by severity/category

### Epic 4: Bulk Operations & Workflow
**As a patch manager with 200+ recommendations**, I want to accept all critical-severity recommendations at once so that I can process approvals in 2 minutes vs 30 minutes.
- **Acceptance**: Multi-select checkboxes, "Accept Selected" button, confirmation dialog shows count, bulk action completes in <5 seconds

**As a deployment engineer**, I want to deploy all accepted patches to a group of assets in one action so that I don't click "Deploy" 50 times.
- **Acceptance**: Bulk deploy modal, asset group selection, scheduling options, progress bar shows completion

**As a security analyst**, I want to reject false-positive recommendations in batch so that I focus only on actionable items.
- **Acceptance**: Bulk reject with required reason field, "Apply to similar recommendations" checkbox, confirmation summary

**As an IT administrator**, I want to filter recommendations by multiple criteria (severity + asset group + status) so that I quickly find the 5 critical items that need immediate attention.
- **Acceptance**: Multi-select filters with AND/OR logic, "Save filter preset" feature, filter count badge shows active filters

### Epic 5: Accessibility & Compliance
**As a keyboard-only user**, I want to navigate the entire application without a mouse so that I can use assistive technology.
- **Acceptance**: Tab navigation works for all interactive elements, skip-to-content link, focus indicators visible, no keyboard traps

**As a screen reader user**, I want clear labels on all buttons and inputs so that I understand what each control does.
- **Acceptance**: ARIA labels on icon buttons, form labels properly associated, landmark regions defined, table headers scoped

**As a colorblind user**, I want severity levels indicated by icons or patterns so that I don't rely solely on red/yellow/green colors.
- **Acceptance**: Critical=⚠️+red, High=▲+orange, Medium=●+yellow, Low=−+blue, text labels always visible

**As a compliance manager**, I want the application to meet WCAG 2.1 AA standards so that we pass accessibility audits.
- **Acceptance**: Automated scan (axe-core) shows 0 violations, color contrast ratios ≥4.5:1, all images have alt text

### Epic 6: Component Architecture & Maintainability
**As a frontend developer**, I want small, focused components so that I can understand and modify them without breaking unrelated features.
- **Acceptance**: No component >400 lines, MainLayout refactored into 5 sub-components, each with single responsibility

**As a frontend developer**, I want consistent patterns for search/filter/pagination so that I implement new pages in 30 minutes vs 3 hours.
- **Acceptance**: `useTableParams` hook used across all tables, `FilterDrawer` pattern consistent, search debounced via `useDebouncedSearch`

**As a frontend developer**, I want reusable components for common UI patterns so that I don't reimplement severity badges in 8 places.
- **Acceptance**: `StatusBadge`, `SeverityIndicator`, `ActionMenu`, `BulkActionBar` components in shared library, documented with examples

**As a code reviewer**, I want all components to follow performance best practices so that I don't spend time flagging missing `useMemo` in every PR.
- **Acceptance**: ESLint rules enforce `useMemo`/`useCallback`, React.memo on expensive components, performance budget in CI

### Epic 7: Mobile & Responsive Design
**As a field technician using a tablet**, I want to view asset details and approve patches on a 10" screen so that I can work from the data center floor.
- **Acceptance**: All pages responsive down to 768px, touch-friendly tap targets (44px min), drawer navigation on mobile

**As an IT manager using a phone**, I want to review high-priority alerts during my commute so that I can respond to incidents within 10 minutes.
- **Acceptance**: Dashboard cards stack on mobile, tables scroll horizontally with sticky columns, forms adjust layout for portrait orientation

---

## 5. Requirements

### Must-Have (P0) — Cannot Ship Without

#### 5.1 Security Fixes
- **[P0-SEC-1] Remove XSS vulnerability in AI chat**
  - Replace `dangerouslySetInnerHTML` with `react-markdown` or `DOMPurify`
  - Sanitize all user input and API responses before rendering
  - Add Content Security Policy headers
  - **Acceptance**: Security scan (OWASP ZAP, npm audit) shows 0 high/critical vulnerabilities
  - **Files**: `AIChatPanel.tsx` (line 157)

- **[P0-SEC-2] Add error boundaries to prevent full-page crashes**
  - Error boundary at route level (wraps each page)
  - Error boundary at layout level (wraps MainLayout)
  - Fallback UI shows error message + "Go to Dashboard" link
  - Errors logged to monitoring (Sentry, LogRocket, or console)
  - **Acceptance**: Deliberate component error (throw in render) shows fallback, rest of UI remains functional
  - **Files**: New `ErrorBoundary.tsx`, update `App.tsx`

#### 5.2 Performance — Code Splitting
- **[P0-PERF-1] Implement lazy loading for all routes**
  - Convert all route imports to `React.lazy()`
  - Add `<Suspense>` boundary with loading spinner
  - Preload critical routes (Dashboard, Assets, Patches) on auth
  - **Acceptance**: Lighthouse audit shows initial bundle <150KB, unused code removed, FCP <1.5s
  - **Files**: `App.tsx` (lines 89-710)
  - **Metrics**: Before: ~500KB initial, After: <150KB initial, 100-150KB per route chunk

- **[P0-PERF-2] Refactor MainLayout to prevent unnecessary re-renders**
  - Split MainLayout (1,084 lines) into:
    - `NavigationSidebar.tsx` (200 lines) — menu state, navigation
    - `ProfileMenu.tsx` (100 lines) — user profile, logout
    - `CategoryPanel.tsx` (150 lines) — category/subcategory management
    - `OrganizationSwitcher.tsx` (80 lines) — organization dropdown
    - `MainLayout.tsx` (400 lines) — composition, shared state via Context
  - Memoize sub-components with `React.memo`
  - Move data fetching to context providers (not inline useEffect)
  - **Acceptance**: Profile changes don't re-render sidebar, category changes don't re-render profile, React DevTools Profiler shows <50ms render time
  - **Files**: `MainLayout.tsx`, new components in `/components/layout/`

- **[P0-PERF-3] Add server-side pagination to asset list**
  - Backend endpoint already supports `page` + `limit` params
  - Update `useAssets()` hook to accept pagination params
  - Add pagination controls to DataTable (Ant Design Pagination)
  - Default page size: 50 items
  - **Acceptance**: Asset list loads in <500ms with 50 items, pagination controls work, total count displayed, URL params persist selection (e.g., `?page=2`)
  - **Files**: `useAssets.ts`, `AllAssets.tsx`, `DataTable.tsx`

#### 5.3 Patch-CVE Correlation — Core Views
- **[P0-UX-1] Vulnerability detail page with affected assets**
  - New route: `/vulnerabilities/:cveId`
  - Show CVE metadata (title, description, CVSS, EPSS, KEV status)
  - Table of affected assets: Name, Version, Patch Available, Status, Last Scanned
  - Filter: "Show only unpatched" (default ON)
  - Action: "View Patch" button links to patch detail
  - **Acceptance**: Clicking CVE-2024-1234 shows 15 affected assets, filter reduces to 12 unpatched, clicking "View Patch" navigates to patch detail
  - **Files**: New `VulnerabilityDetail.tsx`, `vulnerability.service.ts` (likely exists, verify endpoint), `App.tsx` (add route)
  - **API**: `GET /vulnerabilities/:cveId/affected-assets` (verify exists from Pipeline 1)

- **[P0-UX-2] Patch detail enhancement — show vulnerabilities addressed**
  - Existing route: `/patches/:id`
  - Add "Vulnerabilities" tab (if not exists) or section
  - Table of CVEs this patch fixes: CVE ID, Title, Severity, CVSS Score, Exploit Status
  - Link each CVE to vulnerability detail page ([P0-UX-1])
  - Show count badge: "Fixes 8 vulnerabilities"
  - **Acceptance**: Patch KB5034441 shows 8 CVEs, clicking CVE-2024-1234 navigates to vulnerability detail, severity badges color-coded
  - **Files**: `PatchDetails.tsx` (add/enhance vulnerabilities tab), `usePatchVulnerabilities.ts` (exists, verify)

- **[P0-UX-3] Patch supersedence display**
  - In PatchDetails.tsx, add "Supersedence" section or badge
  - Show: "Supersedes: KB123, KB124" (links to those patches)
  - Show: "Superseded by: KB999" (warning badge if newer exists)
  - In recommendations list, gray out superseded patches with "(Superseded)" badge
  - **Acceptance**: Viewing KB5034441 shows "Supersedes: KB5034440", recommendations list shows KB5034440 as gray with badge, clicking superseded patch shows warning
  - **Files**: `PatchDetails.tsx`, `PatchRecommendationsTab.tsx`, `recommendationColumns.tsx`
  - **API**: Verify `/patches/:id` response includes `supersedes[]` and `supersededBy[]`

- **[P0-UX-4] Risk score explanation tooltip**
  - In recommendations table, risk score column shows number + info icon
  - Hover/click info icon shows popover:
    ```
    Risk Score: 8.2/10
    ─────────────────
    CVSS Base Score:    8.5
    EPSS Probability:   45%
    Asset Criticality:  High (Production Server)
    Exploit Available:  Yes (CISA KEV)

    Formula: (CVSS × 0.4) + (EPSS × 0.3) + (Criticality × 0.2) + (Exploit × 0.1)
    ```
  - **Acceptance**: Hovering risk score shows breakdown, all 4 factors visible, formula documented
  - **Files**: `recommendationColumns.tsx`, new `RiskScoreTooltip.tsx` component
  - **API**: Verify recommendation response includes `cvssScore`, `epssScore`, `assetCriticality`, `exploitAvailable`

#### 5.4 Bulk Operations
- **[P0-BULK-1] Bulk accept/reject recommendations**
  - Add checkbox column to recommendations table (select all + individual)
  - "Accept Selected (5)" and "Reject Selected (5)" buttons above table
  - Accept: Confirmation modal shows count + list, single API call accepts all
  - Reject: Modal requires reason dropdown (False Positive, Not Applicable, etc.) + optional notes
  - **Acceptance**: Select 10 recommendations, click "Accept Selected", confirmation shows 10 items, submit succeeds in <3s, table updates all 10 rows to "Accepted" status
  - **Files**: `PatchRecommendations.tsx`, `PatchRecommendationsTab.tsx`, `patch-recommendation.service.ts` (add `bulkAccept()`, `bulkReject()`)
  - **API**: `POST /patch-recommendations/bulk-accept` with `{ids: string[], ...}`, `POST /patch-recommendations/bulk-reject` with `{ids: string[], reason: string, notes?: string}`

- **[P0-BULK-2] Bulk deploy accepted patches**
  - In recommendations table, filter to "Accepted" status
  - "Deploy Selected (5)" button (only enabled if all selected are "Accepted")
  - Deploy modal: Asset group selection (or "Deploy to all"), schedule options (now, scheduled, maintenance window)
  - Progress indicator during deployment (WebSocket or polling)
  - **Acceptance**: Select 5 accepted recommendations, click "Deploy Selected", modal shows asset list, schedule for "Now", deploy starts, progress bar shows 5/5 complete
  - **Files**: `PatchRecommendationsTab.tsx`, `deployments.service.ts` (add `bulkDeploy()`), new `BulkDeployModal.tsx`
  - **API**: `POST /deployments/bulk` with `{patchIds: string[], assetIds: string[], schedule: {...}}`

#### 5.5 Accessibility (WCAG 2.1 AA Compliance)
- **[P0-A11Y-1] Add ARIA labels to all icon-only buttons**
  - Audit all `<Button icon={...} />` without text
  - Add `aria-label` describing action (e.g., "Delete asset", "Export to CSV")
  - Add `title` attribute for tooltip (fallback for mouse users)
  - **Acceptance**: Screen reader (NVDA, JAWS) announces button purpose, axe-core scan shows 0 missing labels
  - **Files**: All components with icon buttons (30+ files estimated)

- **[P0-A11Y-2] Severity indicators use icon + color**
  - Replace color-only badges with icon + color + text
  - Critical: ⚠️ Red + "Critical"
  - High: ▲ Orange + "High"
  - Medium: ● Yellow + "Medium"
  - Low: − Blue + "Low"
  - **Acceptance**: Grayscale mode (colorblind simulation) still distinguishable, screen reader announces severity level
  - **Files**: New `SeverityIndicator.tsx` component, update `VulnerabilitiesTab.tsx`, `recommendationColumns.tsx`, etc.

- **[P0-A11Y-3] Keyboard navigation for all interactive elements**
  - Tab order follows visual order (top-to-bottom, left-to-right)
  - Focus indicators visible (2px outline, 4.5:1 contrast)
  - Escape key closes modals/drawers
  - Enter/Space activates buttons
  - Arrow keys navigate menus
  - **Acceptance**: Unplug mouse, complete full workflow (login → view patch → accept recommendation → deploy) using only keyboard
  - **Files**: All modals, drawers, menus, forms

- **[P0-A11Y-4] Skip-to-content link**
  - First focusable element is "Skip to main content" link
  - Hidden until focused (appears at top on Tab press)
  - Clicking jumps focus to main content area (after navigation)
  - **Acceptance**: Tab from URL bar, first focus shows "Skip to main content", Enter jumps to content, focus visible on content container
  - **Files**: `MainLayout.tsx` (add skip link), `App.tsx` (ensure proper landmark structure)

### Should-Have (P1) — High Priority Fast-Follow

#### 5.6 Advanced Correlation Views
- **[P1-UX-5] Asset-Patch-Vulnerability matrix view**
  - New route: `/correlation/matrix`
  - Pivot table: Rows=Assets, Columns=Patches, Cells=Vulnerability count or status
  - Color-coded cells: Green=patched, Red=vulnerable, Gray=N/A
  - Filterable by: Severity, Asset group, Patch category
  - Exportable to CSV/Excel
  - **Acceptance**: Matrix shows 50 assets × 20 patches, clicking cell shows vulnerability list, export generates valid CSV
  - **Files**: New `CorrelationMatrix.tsx`, `correlation.service.ts`, `App.tsx` (add route)
  - **API**: `GET /correlation/matrix?filters=...` (may need backend support)

- **[P1-UX-6] Patch applicability view**
  - In PatchDetails.tsx, add "Applicable Assets" tab
  - Table shows: Which assets this patch applies to, current version, deployment status
  - Filter: "Show only applicable unpatched" (assets where patch is needed but not deployed)
  - Action: "Deploy to selected assets" (bulk deploy from here)
  - **Acceptance**: Viewing KB5034441 shows 25 applicable assets, 18 unpatched, select 10 + click "Deploy to selected", deployment modal opens
  - **Files**: `PatchDetails.tsx` (new tab), `patch.service.ts` (add `getApplicableAssets()`)
  - **API**: `GET /patches/:id/applicable-assets`

- **[P1-UX-7] Recommendation multi-filter with presets**
  - Existing filter drawer has basic filters
  - Add: Combine filters with AND/OR logic
  - Add: "Save as preset" button (e.g., "Critical Unpatched Production Servers")
  - Add: Preset dropdown to quick-apply saved filters
  - **Acceptance**: Apply 3 filters (Severity=Critical, Status=Recommended, AssetGroup=Production), save as "Urgent", refresh page, preset dropdown shows "Urgent", clicking applies all 3 filters
  - **Files**: `FilterDrawer.tsx`, new `useFilterPresets.ts` hook (localStorage or backend)

#### 5.7 Component Refactoring & Patterns
- **[P1-ARCH-1] Create reusable action components**
  - Extract: `BulkActionBar.tsx` (checkbox select all, action buttons, count badge)
  - Extract: `StatusBadge.tsx` (standard badge with status color mapping)
  - Extract: `ActionMenu.tsx` (three-dot menu with common actions)
  - Add to component library with Storybook examples
  - **Acceptance**: Replace 8 instances of duplicate action button logic with `<BulkActionBar />`, code reduction of 200+ lines
  - **Files**: New components in `/components/shared/`, update 8 consuming components

- **[P1-ARCH-2] Standardize search/filter patterns**
  - All tables use `useTableParams()` hook for URL state
  - All tables use `FilterDrawer` component (not inline filters)
  - All tables use `useDebouncedSearch()` for search input
  - Document pattern in `/frontend/README.md`
  - **Acceptance**: 3 new pages follow pattern without custom logic, PR reviews confirm consistency
  - **Files**: Refactor `AllAssets.tsx`, `PatchRecommendations.tsx`, etc. to use pattern

- **[P1-ARCH-3] Memoization and performance auditing**
  - Add ESLint rule: `react/exhaustive-deps` error (not warning)
  - Add ESLint plugin: `eslint-plugin-react-memo` (suggests React.memo opportunities)
  - Audit top 10 slowest components with React DevTools Profiler
  - Add `useMemo` to expensive calculations (e.g., filtered/sorted arrays)
  - Add `useCallback` to callbacks passed to children
  - Wrap expensive components in `React.memo`
  - **Acceptance**: Re-render time for DataTable reduced from 120ms to <50ms, recommendation calculations memoized, ESLint passes with no warnings
  - **Files**: `DataTable.tsx`, `PatchRecommendationsTab.tsx`, `AllAssets.tsx`, etc.

#### 5.8 Mobile Responsiveness
- **[P1-MOBILE-1] Responsive layout for tablets (768px+)**
  - Sidebar collapses to hamburger menu on <1024px
  - Tables show 3-4 key columns on tablet, rest via horizontal scroll
  - Modals/drawers adapt to full-screen on mobile
  - Forms stack inputs vertically on narrow screens
  - **Acceptance**: Open app on iPad (768×1024), sidebar collapses, tables readable with 4 columns visible, forms usable
  - **Files**: `MainLayout.tsx`, `DataTable.tsx`, form components

- **[P1-MOBILE-2] Touch-friendly interactions**
  - Tap targets minimum 44×44px
  - Drawer handles enlarged to 60px for easy swipe
  - Horizontal scroll tables have scroll indicators/shadows
  - Long-press opens context menu (on mobile) vs right-click (desktop)
  - **Acceptance**: Use on iPhone (375px width), all buttons tappable, drawers swipeable, tables scrollable with visible indicator
  - **Files**: CSS overrides, `AIChatPanel.tsx` (resize handle)

### Could-Have (P2) — Nice to Have / Future

#### 5.9 Advanced Features
- **[P2-UX-8] Dark mode support**
  - Ant Design theme toggle (light/dark)
  - User preference persisted to localStorage
  - System preference detection (prefers-color-scheme)
  - **Files**: Theme provider in `App.tsx`, toggle in profile menu

- **[P2-UX-9] Recommendation workflow automation**
  - "Auto-accept recommendations if..." rules (e.g., CVSS <4.0, Status=Verified)
  - "Auto-deploy accepted patches to..." schedules (e.g., DEV servers on Fridays)
  - **Files**: New settings page, backend workflow engine

- **[P2-UX-10] AI chat context awareness**
  - Chat panel shows current page context (e.g., "Viewing Asset XYZ with 5 unpatched CVEs")
  - Chat can answer: "Which patches should I deploy?" based on current filters
  - **Files**: `AIChatPanel.tsx` (add context provider), `ai.service.ts` (pass page state)

- **[P2-ARCH-4] Comprehensive Storybook documentation**
  - All shared components in Storybook
  - Variants for each component (default, loading, error, empty states)
  - Accessibility tests in Storybook (axe addon)
  - **Files**: `.storybook/`, `*.stories.tsx` for each component

- **[P2-PERF-4] Service Worker for offline caching**
  - Cache API responses for read-only data (assets, patches, vulnerabilities)
  - Show "Offline" indicator when network unavailable
  - Queue mutations (accept/deploy) to sync when online
  - **Files**: `service-worker.ts`, Vite PWA plugin

#### 5.10 Testing & Quality
- **[P2-TEST-1] Unit tests for complex logic**
  - Test hooks: `useTableParams`, `useDebouncedSearch`, `useFilterPresets`
  - Test utilities: Risk score calculation, severity color mapping, date formatting
  - **Files**: `*.test.ts` files, Jest config

- **[P2-TEST-2] E2E tests for critical flows**
  - Playwright tests:
    - Login → Dashboard
    - View patch → Accept recommendation → Deploy
    - Bulk accept 10 recommendations
    - Filter assets by severity → Export CSV
  - **Files**: `frontend/tests/e2e/`, Playwright config

---

## 6. Success Metrics

### Leading Indicators (Track Weekly)
- **Bundle size**: Initial bundle reduced from ~500KB to <150KB (target: 70% reduction)
- **Load time**: Time to interactive <2.5s on 4G connection (target: 50% improvement from baseline)
- **Re-render time**: MainLayout re-render <50ms (target: 60% reduction from 120ms baseline)
- **Accessibility violations**: axe-core scan shows 0 critical/serious issues (target: 100% compliance)
- **Code complexity**: No component >400 lines (target: MainLayout reduced from 1,084 to <400 lines)

### Adoption Metrics (Track First 4 Weeks)
- **Bulk action usage**: 40% of admins use bulk accept/deploy within first 2 weeks (indicates workflow value)
- **CVE detail page views**: 50+ views per day (indicates new correlation views are discovered and used)
- **Filter preset creation**: 20% of active users save filter preset within 3 weeks (indicates power-user adoption)
- **Mobile usage**: 15% of sessions from tablets/phones (target: enable new user segment)

### Lagging Indicators (Track Quarterly)
- **Time to assess vulnerabilities**: Reduce from 40 minutes to 15 minutes for 100 recommendations (60% improvement)
- **User satisfaction (CSAT)**: Increase from 6.8 to 8.5+ on frontend usability survey (scale 1-10)
- **Support tickets**: Reduce frontend-related tickets by 40% (fewer UI bugs, clearer workflows)
- **Security audit pass**: Zero blockers in Q2 security audit (vs 2 XSS findings in Q1)

### Measurement Methods
- **Lighthouse CI**: Run on every PR, track bundle size + performance score
- **React DevTools Profiler**: Weekly audit of top 10 pages, track render times
- **axe-core**: Automated in CI, fails build on violations
- **PostHog/Mixpanel**: Track feature usage (bulk actions, filter presets, CVE detail views)
- **User interviews**: 5 admins quarterly, task completion time measurement
- **Support ticket labels**: Tag tickets as "frontend-bug", "frontend-ux", "frontend-performance"

---

## 7. Acceptance Criteria Summary

### Security (Must Pass Before Launch)
- [ ] XSS vulnerability fixed: `dangerouslySetInnerHTML` removed, markdown parser implemented
- [ ] Security scan (OWASP ZAP, npm audit) shows 0 high/critical vulnerabilities
- [ ] Error boundaries catch component failures, fallback UI prevents white screen
- [ ] Content Security Policy headers block inline scripts

### Performance (Must Pass Before Launch)
- [ ] Lighthouse Performance score ≥90 (desktop), ≥70 (mobile 4G)
- [ ] Initial bundle size <150KB gzipped
- [ ] Time to Interactive <2.5s on 4G connection
- [ ] MainLayout re-render <50ms (measured with React DevTools Profiler)
- [ ] Asset list with 500 items loads in <500ms per page (50 items/page)

### Functionality (Must Pass Before Launch)
- [ ] Vulnerability detail page shows affected assets, filter works, links to patches
- [ ] Patch detail page shows vulnerabilities addressed, supersedence visible
- [ ] Risk score tooltip shows breakdown (CVSS, EPSS, criticality, exploit)
- [ ] Bulk accept/reject works for 10+ recommendations, completes in <3s
- [ ] Bulk deploy works for 5+ patches, progress indicator updates
- [ ] All existing pages load without console errors

### Accessibility (Must Pass Before Launch)
- [ ] axe-core automated scan shows 0 critical/serious violations
- [ ] Keyboard-only navigation: Complete login → patch deployment workflow without mouse
- [ ] Screen reader: ARIA labels on all icon buttons, form labels associated
- [ ] Color contrast: All text meets 4.5:1 ratio, severity indicators use icon + color
- [ ] Skip-to-content link works, focus indicators visible

### Code Quality (Should Pass, Non-Blocking)
- [ ] ESLint passes with 0 errors (warnings acceptable)
- [ ] TypeScript compilation with 0 errors
- [ ] No component >400 lines
- [ ] `useMemo`/`useCallback` used for expensive operations
- [ ] Shared components (BulkActionBar, StatusBadge, ActionMenu) replace 8+ duplicate implementations

---

## 8. Open Questions

### Blocking (Must Answer Before Starting)
1. **[ENG] API Endpoints**: Does Pipeline 1 backend provide all required endpoints?
   - `GET /vulnerabilities/:cveId/affected-assets` — exists?
   - `POST /patch-recommendations/bulk-accept` — exists?
   - `POST /patch-recommendations/bulk-reject` — exists?
   - `POST /deployments/bulk` — exists?
   - `GET /patches/:id/applicable-assets` — exists?
   - **Answer by**: Sprint 2 Planning (Feb 14) — coordinate with Backend Dev
   - **If not**: Add backend work to Sprint 2 or descope P0 bulk features to P1

2. **[DESIGN] Risk Score Formula**: What is the exact formula for risk score calculation?
   - Is it `(CVSS × 0.4) + (EPSS × 0.3) + (Criticality × 0.2) + (Exploit × 0.1)`?
   - How is asset criticality scored (1-10 scale, High/Medium/Low enum)?
   - **Answer by**: Sprint 2 Week 1 — check backend implementation or define in docs
   - **If unclear**: Display raw CVSS score only in tooltip, defer full breakdown to P1

3. **[PRODUCT] Bulk Deploy Scope**: Should bulk deploy allow mixed asset groups or require same group?
   - Use case: Deploy KB5034441 to 20 Windows servers (mixed groups) vs deploy to "Production Servers" group
   - **Answer by**: Sprint 2 Week 1 — interview 2 admins about workflow
   - **Default**: Allow mixed assets, show warning if mixing groups

### Non-Blocking (Can Resolve During Implementation)
4. **[DESIGN] Matrix View Scalability**: What if matrix has 500 assets × 100 patches (50,000 cells)?
   - Options: Pagination, virtualization, aggregate view (group by asset category)
   - **Resolve by**: P1 implementation (matrix is P1, not P0) — start with 50×20, optimize if needed

5. **[LEGAL] Accessibility Compliance Level**: Is WCAG 2.1 AA sufficient or do we need AAA?
   - AA is standard for most compliance (ADA, Section 508)
   - AAA is rare and expensive (7:1 contrast, sign language videos)
   - **Resolve by**: Sprint 2 Week 2 — confirm with legal/compliance team
   - **Default**: Target AA, document AAA gaps for future

6. **[ENG] Service Worker Caching Strategy**: Which data should be cached for offline?
   - Safe: Asset list, patch list, vulnerability list (read-only reference data)
   - Risky: Recommendations (change frequently), dashboard stats (stale data misleading)
   - **Resolve by**: P2 implementation (service worker is P2) — start with asset/patch lists only

7. **[PRODUCT] Dark Mode Default**: Should dark mode be default for security operations center (SOC) users?
   - SOC environments typically use dark UIs (reduce eye strain in dark rooms)
   - Admins in bright offices may prefer light mode
   - **Resolve by**: P2 implementation — detect system preference, add toggle, track usage

8. **[ENG] Mobile Breakpoints**: What screen sizes to optimize for?
   - Desktop: 1920×1080 (primary)
   - Laptop: 1366×768 (common)
   - Tablet: 768×1024 (iPad, P1 target)
   - Phone: 375×667 (iPhone SE, P2 target)
   - **Resolve by**: P1 mobile work — focus on tablet first, defer phone to P2

---

## 9. Timeline Considerations

### Sprint 2 Duration: 4-6 Weeks (Feb 14 - Mar 28, 2026)

**Hard Deadline**: March 28, 2026 — Security audit scheduled for Q2 (April 1). Must eliminate XSS vulnerability and pass accessibility scan by then.

**Phasing Strategy**:

#### Phase 1: Security & Foundations (Weeks 1-2, Feb 14-28)
- **Week 1**:
  - P0-SEC-1: Fix XSS vulnerability (2 days)
  - P0-SEC-2: Add error boundaries (1 day)
  - P0-PERF-1: Implement lazy loading (2 days)
  - **Milestone**: Security scan passes, bundle size <150KB

- **Week 2**:
  - P0-PERF-2: Refactor MainLayout (3 days) — highest technical debt
  - P0-PERF-3: Add pagination (2 days)
  - **Milestone**: Performance tests pass, code complexity reduced

#### Phase 2: Core UX & Accessibility (Weeks 3-4, Mar 1-14)
- **Week 3**:
  - P0-UX-1: Vulnerability detail page (2 days)
  - P0-UX-2: Patch detail enhancement (1 day)
  - P0-UX-3: Patch supersedence (2 days)
  - **Milestone**: Correlation views functional

- **Week 4**:
  - P0-A11Y-1 through P0-A11Y-4: Accessibility fixes (3 days)
  - P0-UX-4: Risk score tooltip (1 day)
  - P0-BULK-1: Bulk accept/reject (1 day)
  - **Milestone**: WCAG 2.1 AA compliance, critical workflows accessible

#### Phase 3: Bulk Operations & Polish (Weeks 5-6, Mar 15-28)
- **Week 5**:
  - P0-BULK-2: Bulk deploy (2 days)
  - P1-ARCH-1: Reusable components (2 days)
  - P1-ARCH-3: Memoization audit (1 day)
  - **Milestone**: Bulk workflows complete, performance optimized

- **Week 6** (Buffer & P1 Features):
  - P1-UX-5: Matrix view (3 days) — if time permits
  - P1-UX-6: Patch applicability (2 days) — if time permits
  - Testing, bug fixes, documentation
  - **Milestone**: Sprint 2 complete, ready for security audit

**Dependencies**:
- **Backend API availability**: P0-BULK-1 and P0-BULK-2 need bulk endpoints. If not ready, defer to P1.
- **Design review**: Risk score formula (P0-UX-4) needs backend confirmation by Week 2.

**Risk Mitigation**:
- **Risk**: MainLayout refactor (P0-PERF-2) takes longer than 3 days
  - **Mitigation**: Time-box to 3 days, ship incremental improvements, defer final split to P1
- **Risk**: Bulk endpoints not ready from backend
  - **Mitigation**: Mock endpoints in frontend, swap in real API when ready, or defer P0-BULK-2 to P1
- **Risk**: Accessibility testing uncovers >50 violations
  - **Mitigation**: Prioritize critical violations (keyboard nav, ARIA labels), defer minor issues (color contrast tweaks) to P1

---

## 10. Dependencies

### Backend Dependencies (Sprint 2 Pipeline 1)
- **Status**: Pipeline 1 COMPLETED (Patch-CVE Correlation Backend)
- **Required Endpoints** (verify exist):
  - `GET /vulnerabilities/:cveId/affected-assets` — for P0-UX-1
  - `GET /patches/:id/applicable-assets` — for P1-UX-6
  - `POST /patch-recommendations/bulk-accept` — for P0-BULK-1
  - `POST /patch-recommendations/bulk-reject` — for P0-BULK-1
  - `POST /deployments/bulk` — for P0-BULK-2
  - Supersedence data in `GET /patches/:id` response — for P0-UX-3
  - Risk score breakdown in `GET /patch-recommendations` response — for P0-UX-4

### External Library Dependencies
- **New**: `react-markdown` or `DOMPurify` (for P0-SEC-1 XSS fix)
- **New**: `eslint-plugin-react-memo` (for P1-ARCH-3 performance)
- **Existing**: React Query, Ant Design, Axios, React Router (no changes needed)

### Design Dependencies
- **Icons**: Need icons for severity levels (⚠️▲●−) — use Ant Design icons or Unicode
- **Risk score formula**: Needs backend/product confirmation (see Open Questions #2)
- **No Figma designs needed**: Reuse existing Ant Design patterns, focus on functionality over aesthetics

---

## 11. Future Considerations (Sprint 3+)

**Out of scope for Sprint 2 but worth designing for**:

1. **Real-time updates**: WebSocket integration for live recommendation status changes
   - Design: Use SSE/WebSocket in service layer, React Query cache invalidation
   - Why defer: Not critical for workflow, Sprint 3 can add after core features stable

2. **Advanced reporting**: Export correlation matrix to PDF, email scheduled reports
   - Design: Use existing export pattern, extend to new views
   - Why defer: Bulk CSV export (P0) covers 80% of use cases, PDF is polish

3. **Recommendation approval workflow**: Multi-stage approval (analyst → manager → CISO)
   - Design: Add `approver` field to recommendation, track approval chain
   - Why defer: Current accept/reject covers basic workflow, enterprise workflows are Sprint 4+

4. **AI-powered recommendation prioritization**: ML model suggests which patches to deploy first
   - Design: Backend ML service, frontend displays suggested priority
   - Why defer: Risk score (P0-UX-4) provides manual prioritization, ML is future enhancement

---

## Appendix A: Component Refactoring Plan

**MainLayout.tsx (1,084 lines) → 5 Components (400 lines total)**

```
MainLayout.tsx (200 lines)
├── NavigationSidebar.tsx (250 lines)
│   ├── MenuItems (150 lines)
│   ├── Collapse/Expand logic (50 lines)
│   └── Active route highlighting (50 lines)
├── ProfileMenu.tsx (100 lines)
│   ├── User info display (30 lines)
│   ├── Organization switcher (40 lines)
│   └── Logout handler (30 lines)
├── CategoryPanel.tsx (150 lines)
│   ├── Category list (70 lines)
│   ├── Subcategory expansion (50 lines)
│   └── Category filtering (30 lines)
├── OrganizationSwitcher.tsx (80 lines)
│   ├── Dropdown (40 lines)
│   └── Switch handler (40 lines)
└── LayoutContext.tsx (120 lines)
    ├── Shared state (sidebar open, category selected, etc.)
    └── Data fetching (categories, organizations)
```

**Refactoring Steps**:
1. Extract OrganizationSwitcher (simplest, no state dependencies)
2. Extract CategoryPanel (depends on LayoutContext)
3. Extract ProfileMenu (uses LayoutContext)
4. Extract NavigationSidebar (largest, depends on LayoutContext)
5. Create LayoutContext (shared state, memoized providers)
6. Update MainLayout to compose sub-components

**Expected Outcome**:
- MainLayout: 1,084 → 200 lines (80% reduction)
- Each component: <250 lines (manageable)
- Render performance: 120ms → <50ms (60% improvement)
- Testability: Can unit test each component independently

---

## Appendix B: API Endpoint Verification Checklist

**For Backend Dev: Confirm these endpoints exist and match expected response format**

| Endpoint | Method | Response | Status | Notes |
|----------|--------|----------|--------|-------|
| `/vulnerabilities/:cveId` | GET | CVE detail + metadata | ✅ / ❌ / ⚠️ | For P0-UX-1 |
| `/vulnerabilities/:cveId/affected-assets` | GET | `Asset[]` with vulnerability status | ✅ / ❌ / ⚠️ | For P0-UX-1 |
| `/patches/:id` | GET | Includes `supersedes[]`, `supersededBy[]` | ✅ / ❌ / ⚠️ | For P0-UX-3 |
| `/patches/:id/vulnerabilities` | GET | `Vulnerability[]` this patch fixes | ✅ / ❌ / ⚠️ | For P0-UX-2 |
| `/patches/:id/applicable-assets` | GET | `Asset[]` where patch applies | ✅ / ❌ / ⚠️ | For P1-UX-6 |
| `/patch-recommendations` | GET | Includes `riskScore`, `cvssScore`, `epssScore`, `assetCriticality`, `exploitAvailable` | ✅ / ❌ / ⚠️ | For P0-UX-4 |
| `/patch-recommendations/bulk-accept` | POST | `{ids: string[]}` → bulk accept | ✅ / ❌ / ⚠️ | For P0-BULK-1 |
| `/patch-recommendations/bulk-reject` | POST | `{ids: string[], reason: string}` → bulk reject | ✅ / ❌ / ⚠️ | For P0-BULK-1 |
| `/deployments/bulk` | POST | `{patchIds: string[], assetIds: string[], schedule: {...}}` → bulk deploy | ✅ / ❌ / ⚠️ | For P0-BULK-2 |
| `/correlation/matrix` | GET | Pivot table data (Assets × Patches) | ✅ / ❌ / ⚠️ | For P1-UX-5 (optional) |

**Legend**:
- ✅ Exists and matches spec
- ⚠️ Exists but needs modification (document what's missing)
- ❌ Does not exist (add to backend backlog or descope frontend feature)

---

## Appendix C: Accessibility Testing Checklist

**Manual Testing (1 hour per tester)**

1. **Keyboard Navigation**:
   - [ ] Unplug mouse, use only keyboard (Tab, Enter, Space, Arrows, Esc)
   - [ ] Complete workflow: Login → View vulnerability → Accept recommendation → Deploy patch
   - [ ] All interactive elements reachable via Tab
   - [ ] Focus indicators visible (2px outline, contrasting color)
   - [ ] Tab order follows visual order (left-to-right, top-to-bottom)
   - [ ] Escape key closes modals/drawers
   - [ ] Enter/Space activates buttons/links

2. **Screen Reader** (NVDA on Windows, JAWS, or VoiceOver on Mac):
   - [ ] Turn on screen reader, navigate to login page
   - [ ] All form inputs announced with labels ("Email input, required")
   - [ ] All buttons announced with purpose ("Accept recommendation button")
   - [ ] All tables announced with headers and row count
   - [ ] All error messages announced when they appear
   - [ ] ARIA labels on icon-only buttons ("Delete", "Export", etc.)
   - [ ] Modal/drawer open/close announced
   - [ ] Loading states announced ("Loading recommendations...")

3. **Color Contrast** (use browser DevTools or Axe):
   - [ ] All text meets 4.5:1 contrast ratio (body text, labels, buttons)
   - [ ] Large text (18pt+) meets 3:1 contrast ratio (headings)
   - [ ] Interactive elements meet 3:1 contrast (button borders, focus outlines)
   - [ ] Severity badges distinguishable in grayscale mode (use icon + color)

4. **Colorblind Simulation** (use browser extensions like Colorblind, or Chrome DevTools):
   - [ ] Protanopia (red-blind): Severity levels distinguishable
   - [ ] Deuteranopia (green-blind): Status badges distinguishable
   - [ ] Tritanopia (blue-blind): Links distinguishable from body text

5. **Zoom & Magnification**:
   - [ ] Zoom to 200% in browser: No horizontal scroll, content reflows
   - [ ] Zoom to 400%: Content still readable (single-column layout acceptable)
   - [ ] No content hidden at high zoom levels

**Automated Testing** (run in CI):
- [ ] `axe-core` scan: 0 critical/serious violations
- [ ] `pa11y` scan: 0 errors
- [ ] Lighthouse accessibility score: ≥95

---

*This PRD is a living document. Update as requirements evolve, questions get answered, and scope adjusts.*
