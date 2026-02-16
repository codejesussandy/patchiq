# Frontend QA Testing Roadmap - PatchIQ

## Document Overview

**Version:** 1.0
**Date:** 2026-02-16
**Owner:** QA Team
**Status:** Planning

This roadmap defines the comprehensive testing strategy for validating the PatchIQ frontend application after the merge of `full-dev-heramb` into `full-dev-sandy-v2`.

## ⚠️ CRITICAL WORKFLOW REQUIREMENT

**USE TEAMMATE TOOL + PLAYWRIGHT MCP FOR ALL TESTING**

This testing workflow combines two powerful tools for comprehensive frontend validation:

### 1. 🤖 Claude Code Teammate Tool (Orchestration)
Use teammates to orchestrate test strategy, parallel execution, and results synthesis.

### 2. 🎭 Playwright MCP / TestScript (Browser Automation)
Use Playwright to execute actual browser tests, interact with UI, and validate page state.

---

### Integrated Testing Workflow

```
Step 1: Teammate launches → Defines test strategy
Step 2: Playwright MCP executes → Runs browser tests, captures screenshots
Step 3: Teammate synthesizes → Collects results, files bugs, reports findings
```

**Example: Testing Login Flow**
```
Teammate Agent 1: "Test login flow using Playwright MCP"

Tasks:
1. Use Playwright MCP to navigate to http://localhost:5173/login
2. Use Playwright MCP to fill email: admin@patchiq.io
3. Use Playwright MCP to fill password: admin123
4. Use Playwright MCP to click submit button
5. Use Playwright MCP to verify redirect to /dashboard
6. Use Playwright MCP to take screenshot of dashboard
7. Use Playwright MCP to check console for errors
8. Report: Pass/Fail, screenshot path, console errors

→ Teammate collects Playwright results and documents findings
```

---

### Teammate Types & Usage

- **Explore agents** - Deep feature exploration, codebase searches, understanding data flows
- **Bash agents** - Running test commands, checking logs, validating backend responses
- **General-purpose agents** - Complex multi-step tasks, orchestrating Playwright tests

### Playwright MCP / TestScript Capabilities

**What It Does:**
- ✅ Opens real browser (Chromium, Firefox, Safari)
- ✅ Navigates to URLs and interacts with pages
- ✅ Clicks buttons, fills forms, validates text
- ✅ Takes screenshots for visual verification
- ✅ Reports console errors and network failures
- ✅ Validates page state after actions
- ✅ Measures page load performance
- ✅ Tests responsive layouts (mobile, tablet, desktop)

**When To Use Playwright:**
- **ALWAYS** for UI testing (login, forms, navigation)
- **ALWAYS** to validate page loads correctly
- **ALWAYS** to capture screenshots for bug reports
- **ALWAYS** to verify console errors
- **ALWAYS** to test interactions (clicks, typing, form submission)
- **ALWAYS** before declaring a feature "working"

**Playwright MCP Commands:**
```javascript
// Navigate to page
await page.goto('http://localhost:5173/login');

// Fill form
await page.fill('input[name="email"]', 'admin@patchiq.io');
await page.fill('input[name="password"]', 'admin123');

// Click button
await page.click('button[type="submit"]');

// Verify redirect
await page.waitForURL('**/dashboard');

// Take screenshot
await page.screenshot({ path: 'dashboard.png' });

// Check console errors
const errors = await page.evaluate(() => window.consoleErrors);
```

---

### Why This Combined Approach Matters

**Teammates alone:**
- ❌ Can't interact with actual browser UI
- ❌ Can't validate visual rendering
- ❌ Can't capture screenshots
- ❌ Can't test responsive layouts

**Playwright alone:**
- ❌ Requires manual test script writing
- ❌ No parallel orchestration
- ❌ No intelligent bug synthesis

**Teammates + Playwright together:**
- ✅ Teammates orchestrate parallel execution
- ✅ Playwright validates actual browser behavior
- ✅ Teammates synthesize findings across tests
- ✅ Complete coverage: logic + UI + performance
- ✅ Automated screenshots for bug reports

**Throughout this document, look for 🤖 icons (teammates) and 🎭 icons (Playwright) indicating tool usage.**

---

## Executive Summary

The PatchIQ frontend consists of 11 major feature areas spanning 40+ pages, 18+ service integrations, and 19 React Query hooks. This roadmap organizes testing into 5 phases over an estimated 3-4 week timeline, prioritizing critical path features first.

**Testing Scope:**
- 11 major feature areas
- 40+ page routes
- 65+ API endpoints
- 12+ asset detail tabs
- Real-time notifications (SSE)
- RBAC & permissions
- Cross-browser compatibility
- Performance & accessibility

---

## Roadmap Phases

### Phase 1: Critical Path - Foundation (Week 1)
**Duration:** 5 days
**Goal:** Ensure core user flows work end-to-end

| Priority | Feature Area | Routes | Estimated Time |
|----------|--------------|--------|----------------|
| P0 | Authentication & Session | `/login`, `/forgot-password`, `/onboarding` | 1 day |
| P0 | Dashboard | `/dashboard` | 0.5 days |
| P0 | Assets - List & Basic Details | `/assets`, `/assets/:id` (overview tab) | 1 day |
| P0 | Patches - List & Details | `/patches`, `/patches/:id` | 1 day |
| P0 | Vulnerabilities - List & Details | `/vulnerability/vulnerabilities`, `/vulnerability/:id` | 1 day |
| P0 | Settings - User Management | `/settings/user-management/*` | 0.5 days |

**🤖🎭 Teammate + Playwright Workflow for Phase 1:**

**Day 1 Morning - Parallel Testing Launch:**
```bash
# Launch 3 concurrent agents using Playwright MCP

Agent 1: "Test all login scenarios using Playwright MCP
- Navigate to /login
- Test valid credentials (admin@patchiq.io / admin123)
  → Use Playwright: fill form, click submit, verify redirect to /dashboard
  → Capture screenshot of dashboard
  → Check console errors
- Test invalid credentials
  → Use Playwright: fill form with wrong password, click submit
  → Verify error message displays
  → Capture screenshot of error
- Test expired token scenario
  → Use Playwright: manually expire token in localStorage, navigate to /assets
  → Verify redirect to /login
  → Capture screenshot
- Document: All results, screenshots, console errors"

Agent 2: "Test password reset flow using Playwright MCP
- Navigate to /forgot-password
- Enter email: admin@patchiq.io
- Click 'Send Reset Link'
- Verify success message
- (Manually check email or backend logs for reset email)
- Navigate to reset link (if available)
- Fill new password form
- Submit and verify redirect to /login
- Test login with new password
- Capture screenshots at each step"

Agent 3: "Test onboarding + session persistence using Playwright MCP
- Create new user via API or UI
- Login as new user
- Verify redirect to /onboarding
- Fill onboarding form (name, role, preferences)
- Submit and verify redirect to /dashboard
- Refresh page (F5)
- Verify session persists (still on /dashboard, not redirected to /login)
- Capture screenshots"
```

**Day 1 Afternoon - Dashboard & Assets:**
```bash
Agent 4: "Test dashboard using Playwright MCP
- Navigate to /dashboard
- Measure page load time (should be < 3s)
- Verify stats cards display (Assets, Patches, Vulnerabilities, Deployments)
- Verify top vulnerabilities section loads
- Click on a vulnerability → Verify navigation to detail page
- Click back → Return to dashboard
- Capture screenshot
- Check console for errors (should be 0)"

Agent 5: "Test assets list using Playwright MCP
- Navigate to /assets
- Test search: Type 'WIN-SERVER' in search box → Verify results filter
- Test pagination: Click 'Next Page' → Verify page 2 loads
- Test sorting: Click 'Hostname' column → Verify sort order changes
- Test filter: Open filter drawer → Select 'Active' status → Verify filtered results
- Test CRUD:
  → Click 'Create Asset' → Fill form → Submit → Verify success
  → Click on first asset → Verify detail page loads
  → Click 'Edit' → Update field → Save → Verify change
  → Click 'Delete' → Confirm → Verify removed from list
- Capture screenshots at each step
- Document console errors"
```

**Day 2 - Patches & Vulnerabilities:**
```bash
Agent 6: "Test patches using Playwright MCP
- Navigate to /patches
- Test list operations (search, filter, sort, pagination)
- Click on first patch → Verify detail page
- Test deployment creation:
  → Click 'Deploy' button
  → Select 3 target assets from dropdown
  → Choose schedule: 'Immediate'
  → Click 'Deploy'
  → Verify deployment created
  → Navigate to deployment status page
  → Monitor progress for 2 minutes or until complete
  → Verify status updates (polling or SSE)
- Capture screenshots, document console errors"

Agent 7: "Test vulnerabilities using Playwright MCP
- Navigate to /vulnerability/vulnerabilities
- Test list operations
- Click on first CVE → Verify detail page
- Verify CVSS score, EPSS, affected assets display
- Test vulnerability scan:
  → Navigate to scan trigger page
  → Click 'Start Scan'
  → Select scope: 'All Assets'
  → Monitor scan progress
  → Verify results appear after completion
- Capture screenshots"
```

**Day 2 Afternoon - Settings:**
```bash
Agent 8: "Test user management using Playwright MCP
- Navigate to /settings/user-management/users
- Test create user:
  → Click 'Create User'
  → Fill form (email, name, role)
  → Submit → Verify user appears in list
- Test edit user:
  → Click 'Edit' on user
  → Change role
  → Save → Verify change
- Test delete user:
  → Click 'Delete'
  → Confirm → Verify removed
- Test roles page:
  → Navigate to /settings/user-management/roles
  → Create role with permissions
  → Verify role created
- Capture screenshots"
```

**Day 3 - Results Synthesis:**
- Collect all agent reports (8 agents)
- Review Playwright screenshots from each test
- Compile console errors across all tests
- Identify common patterns (API failures, UI bugs)
- File bugs in GitHub Issues with screenshots attached
- Create Phase 1 completion report with:
  - Pass/fail summary per feature
  - Screenshot gallery of bugs found
  - Console error frequency chart
  - Performance metrics (page load times)

**Success Criteria:**
- Users can log in and access the dashboard
- Core CRUD operations work for assets, patches, and vulnerabilities
- No blocking errors in console
- Basic navigation functions correctly

**Exit Criteria:**
- All P0 smoke tests pass
- Zero critical bugs blocking core flows
- Auth session persists across page reloads
- All 8 agents completed successfully with pass/fail results documented

---

### Phase 2: Critical Path - Advanced Operations (Week 1-2)
**Duration:** 5 days
**Goal:** Validate complex operations and deployments

| Priority | Feature Area | Routes | Estimated Time |
|----------|--------------|--------|----------------|
| P0 | Patch Deployments | `/patches/deployed/*` | 1.5 days |
| P0 | Patch Recommendations | `/patch-recommendations` | 1 day |
| P0 | Asset Details - All Tabs | `/assets/:id` (12 tabs) | 1.5 days |
| P0 | Vulnerability Scanning | `/vulnerability/*` (scan workflows) | 1 day |

**🤖🎭 Teammate + Playwright Workflow for Phase 2:**

**Day 1 - Patch Deployments (Complex Multi-Step with Playwright):**
```bash
Agent 9: "Test entire patch deployment workflow using Playwright MCP:

1. Navigate to /patches
2. Click first patch
3. Click 'Deploy' button
4. Use Playwright to:
   - Fill deployment form (select 3 assets from dropdown)
   - Choose schedule: 'Immediate'
   - Click 'Deploy' button
   - Capture screenshot of deployment modal
5. Navigate to deployment status page
6. Use Playwright to monitor status:
   - Wait for status updates (polling or SSE)
   - Take screenshot every 30 seconds for 2 minutes
   - Verify progress bar updates
   - Verify task statuses change (pending → in-progress → success/failed)
7. Test Cancel:
   - Create new deployment
   - Click 'Cancel' button mid-execution
   - Verify status changes to 'Cancelled'
   - Capture screenshot
8. Test Retry:
   - Create deployment with invalid configuration (to force failure)
   - Wait for failure
   - Click 'Retry' button
   - Verify retry starts
   - Capture screenshot
9. Document: All screenshots, console errors, real-time update latency"
```

**Day 2 - Patch Recommendations (with Playwright):**
```bash
Agent 10: "Test patch recommendations using Playwright MCP:

1. Navigate to /patch-recommendations
2. Use Playwright to test list operations:
   - Search for recommendations
   - Filter by status (Pending/Accepted/Rejected)
   - Sort by severity
   - Capture screenshot
3. Test Accept:
   - Click first recommendation
   - Click 'Accept' button
   - Fill reason (optional)
   - Submit
   - Verify status changes to 'Accepted'
   - Capture screenshot
4. Test Reject:
   - Click second recommendation
   - Click 'Reject' button
   - Fill reason (required)
   - Submit
   - Verify status changes to 'Rejected'
   - Capture screenshot
5. Test Deploy:
   - Click third recommendation
   - Click 'Deploy' button
   - Verify deployment created
   - Navigate to deployment page
   - Capture screenshot
6. Test Bulk Operations:
   - Select 3 recommendations (checkboxes)
   - Click 'Bulk Accept'
   - Verify all 3 change status
   - Capture screenshot
7. Verify Dashboard:
   - Navigate to /dashboard
   - Verify recommendation counts updated
   - Capture screenshot
8. Document: All actions, screenshots, console errors"
```

**Day 3-4 - Asset Details 12 Tabs (with Playwright):**
```bash
# Launch 4 concurrent agents (3 tabs each)

Agent 11: "Test asset tabs 1-3 using Playwright MCP:
Navigate to /assets/:id

Tab 1 - Hardware:
- Click 'Hardware' tab
- Use Playwright to verify elements display:
  → CPU model, cores, RAM, storage
- Measure load time (should be < 2s)
- Capture screenshot
- Check console errors

Tab 2 - Software:
- Click 'Software' tab
- Use Playwright to:
  → Verify software list loads
  → Test search box
  → Test sorting
- Capture screenshot

Tab 3 - Patches:
- Click 'Patches' tab
- Verify applied patches list
- Verify missing patches list
- Click on a patch → Verify navigation
- Capture screenshot"

Agent 12: "Test asset tabs 4-6 using Playwright MCP:

Tab 4 - Vulnerabilities:
- Click 'Vulnerabilities' tab
- Verify CVE list loads
- Verify severity grouping
- Click on CVE → Verify navigation to detail
- Capture screenshot

Tab 5 - Alerts:
- Click 'Alerts' tab
- Verify active alerts display
- Verify severity badges color-coded
- Capture screenshot

Tab 6 - Security:
- Click 'Security' tab
- Verify antivirus status
- Verify firewall status
- Verify compliance score
- Capture screenshot"

Agent 13: "Test asset tabs 7-9 using Playwright MCP:

Tab 7 - Network:
- Click 'Network' tab
- Verify IP, MAC, DNS, Gateway display
- Capture screenshot

Tab 8 - Peripherals:
- Click 'Peripherals' tab
- Verify USB devices, monitors, printers list
- Capture screenshot

Tab 9 - Telemetry (REAL-TIME):
- Click 'Telemetry' tab
- Use Playwright to monitor updates:
  → Capture screenshot at T=0s
  → Wait 10 seconds
  → Capture screenshot at T=10s
  → Verify CPU/RAM/Disk gauges updated
  → Verify polling happens every 5-10s
- Document update frequency"

Agent 14: "Test asset tabs 10-12 using Playwright MCP:

Tab 10 - Audit Log:
- Click 'Audit Log' tab
- Verify change history displays
- Test filtering by operation type
- Test sorting by date
- Capture screenshot

Tab 11 - Deployments:
- Click 'Deployments' tab
- Verify deployment history
- Click on deployment → Verify navigation
- Capture screenshot

Tab 12 - System Errors:
- Click 'System Errors' tab
- Verify error logs display
- Test filtering by severity
- Capture screenshot"
```

**Day 5 - Vulnerability Scanning (with Playwright):**
```bash
Agent 15: "Test vulnerability scanning using Playwright MCP:

1. Navigate to /vulnerability page
2. Click 'Trigger Scan' button
3. Use Playwright to:
   - Select scope: 'All Assets'
   - Click 'Start Scan' button
   - Capture screenshot of scan modal
4. Monitor scan progress:
   - Navigate to scan progress page
   - Use Playwright to capture screenshot every 30s
   - Verify progress bar updates
   - Wait for completion (or 5 minutes max)
5. Verify results:
   - Navigate to /vulnerability/vulnerabilities
   - Verify new CVEs appear (compare before/after counts)
   - Capture screenshot
6. Test NVD DB Sync:
   - Navigate to /settings/vulnerability-preference
   - Click 'Manual Sync' button
   - Monitor sync progress
   - Verify sync completes
   - Capture screenshot
7. Test Exception:
   - Navigate to /vulnerability/manage-exception
   - Create exception for a CVE
   - Navigate to /dashboard
   - Verify vulnerability count updated (decreased)
   - Capture screenshot
8. Document: All screenshots, sync duration, console errors"
```

**Results Synthesis:**
- Collect agent reports from all 7 agents
- Merge findings into Phase 2 report
- Prioritize bugs (deployments blocking = P0)
- Track real-time feature performance (SSE/polling)

**Success Criteria:**
- Patch deployments create, execute, track status correctly
- Recommendations accept/reject/deploy work
- All 12 asset detail tabs load and display data
- Vulnerability scans execute and update results

**Exit Criteria:**
- Deployment workflows complete successfully
- Real-time status updates work (polling/SSE)
- Asset detail tabs load within 2 seconds
- All 7 agents report pass (or documented failures with bugs filed)

---

### Phase 3: High Priority Features (Week 2)
**Duration:** 5 days
**Goal:** Validate high-value features for daily operations

| Priority | Feature Area | Routes | Estimated Time |
|----------|--------------|--------|----------------|
| P1 | Discovery | `/discovery/*` | 1.5 days |
| P1 | Hub (Packages) | `/assets/hub` | 1 day |
| P1 | Jobs & Policies | `/patches/patch-jobs` | 1 day |
| P1 | Notifications | `/notifications` + SSE | 1 day |
| P1 | Settings - System Settings | `/settings/system-settings/*` | 0.5 days |

**🤖 Teammate Workflow for Phase 3:**

**Day 1-2 - Discovery (IP Ranges, Credentials, Agents):**
```bash
# Launch 3 concurrent agents for discovery workflows
Agent 16: "Test IP range discovery:
          Create range → Scan → Verify discovered assets appear in list.
          Test multiple ranges, overlapping ranges, invalid ranges."

Agent 17: "Test device credentials:
          Create SSH key → Test connection → Create WMI credentials → Test.
          Validate credential storage (no plaintext in API responses)."

Agent 18: "Test agent management:
          List agents → Create enrollment → View agent details → Delete agent.
          Check agent health status, last seen timestamp, command delivery."
```

**Day 3 - Hub (Package Management):**
```bash
Agent 19: "Test Hub package operations:
          List packages → Upload new package → Download package.
          Test bundle upload (.tar.gz with scripts) → Verify extraction.
          Filter by OS/architecture → Test package deployment integration."
```

**Day 4 - Jobs & Notifications:**
```bash
Agent 20: "Test job policies:
          Create patch policy → Set schedule → Verify execution on time.
          Test vulnerability scan job → Monitor progress → Validate results."

Agent 21: "Test notifications (CRITICAL - SSE):
          Verify SSE connection establishes (check EventSource in DevTools).
          Trigger notification (deploy patch) → Verify real-time arrival.
          Test notification history (filter, search, mark read, delete).
          Test auto-reconnect (disconnect network, reconnect)."
```

**Day 5 - System Settings:**
```bash
Agent 22: "Test system settings:
          SMTP: Configure mail server → Send test email → Verify receipt.
          LDAP: Configure AD connection → Test bind → Sync users/groups.
          Proxy: Configure HTTP proxy → Test connectivity through proxy.
          Validate settings persist after page reload."
```

**Results Synthesis:**
- Collect 7 agent reports
- SSE testing is critical - if broken, file P0 bug
- Verify job scheduling (may need to wait for scheduled execution)

**Success Criteria:**
- IP range discovery scans work
- Package uploads and downloads function
- Job policies execute on schedule
- Real-time notifications arrive via SSE
- System settings (SMTP, LDAP, proxy) save and test correctly

**Exit Criteria:**
- Discovery workflows find and import assets
- Package deployments pull from Hub
- Notifications appear in real-time
- All 7 agents report completion (SSE must pass)

---

### Phase 4: Medium Priority & Edge Cases (Week 3)
**Duration:** 5 days
**Goal:** Validate secondary features and error handling

| Priority | Feature Area | Routes | Estimated Time |
|----------|--------------|--------|----------------|
| P2 | Reports | `/reports/*` | 1 day |
| P2 | Patch Tests & Zero-Touch | `/patches/test-approve`, `/patches/zero-touch` | 1 day |
| P2 | Vulnerability Exceptions | `/vulnerability/manage-exception` | 0.5 days |
| P2 | Settings - Agent Management | `/settings/agent-management/*` | 1 day |
| P2 | Settings - Patch Management | `/settings/patch-management/*` | 1 day |
| P2 | Error Handling & Edge Cases | All routes | 0.5 days |

**🤖 Teammate Workflow for Phase 4:**

**Day 1 - Reports:**
```bash
Agent 23: "Test report generation:
          Create report → Select data sources → Configure filters → Generate.
          Test export formats (PDF, Excel) → Download → Validate content.
          Test scheduled reports → Email delivery → Verify receipt."
```

**Day 2 - Patch Tests & Zero-Touch:**
```bash
Agent 24: "Test patch testing workflow:
          Create test → Deploy to test VMs → Review results → Approve/Reject.
          Document approval flow and test environment requirements."

Agent 25: "Test zero-touch deployment configs:
          Create config (criteria: Severity >= High, Age <= 30 days).
          Set schedule → Enable → Verify auto-deployment triggers.
          Test disable/edit/delete operations."
```

**Day 3 - Vulnerability Exceptions & Settings:**
```bash
Agent 26: "Test vulnerability exceptions:
          Create exception for CVE → Verify dashboard count updates.
          Test exception scopes (all assets, selected, group).
          Test exception expiry and removal."

Agent 27: "Test agent management settings:
          Agent approvals → Auto-approval rules → Versions → Configuration.
          Enroll secret generation → Red Hat agent nomination."
```

**Day 4 - Patch Management Settings:**
```bash
Agent 28: "Test patch management settings:
          Computer groups → Create group → Assign assets.
          Patch preferences → Sync schedule → Distribution server config.
          Validate settings persist and apply to deployments."
```

**Day 5 - Error Handling & Edge Cases (CRITICAL FOR QUALITY):**
```bash
# Launch 5 concurrent agents for edge case testing
Agent 29: "Test network errors:
          Disconnect network → Trigger actions → Verify error messages.
          Test retry mechanisms → Verify graceful degradation."

Agent 30: "Test empty states:
          Navigate to pages with zero data → Verify empty state messages.
          Check for helpful CTAs (Create your first item)."

Agent 31: "Test form validation edge cases:
          Submit forms with invalid data → SQL injection attempts → XSS attempts.
          Verify server-side validation catches malicious input."

Agent 32: "Test permission errors (RBAC):
          Log in as read-only user → Attempt CRUD operations.
          Verify 403 errors with helpful messages (not crashes)."

Agent 33: "Test console errors:
          Navigate through entire app → Document ALL console errors/warnings.
          Group by severity (errors vs warnings) and frequency."
```

**Results Synthesis:**
- Collect 11 agent reports
- Edge case testing is critical for quality - don't skip
- Console error report informs final polish

**Success Criteria:**
- Reports generate and export correctly
- Zero-touch configs auto-deploy patches
- Vulnerability exceptions affect dashboard counts
- Agent enrollment and approvals work
- Error states display helpful messages

**Exit Criteria:**
- All medium-priority features functional
- Empty states and error states render correctly
- No unhandled promise rejections
- Console error audit completed (all 11 agents report)

---

### Phase 5: Cross-Cutting & Polish (Week 3-4)
**Duration:** 5 days
**Goal:** Validate UX, performance, and compatibility

| Priority | Area | Scope | Estimated Time |
|----------|------|-------|----------------|
| P2 | Performance | All pages | 1 day |
| P2 | Responsive Design | Mobile, tablet, desktop breakpoints | 1 day |
| P2 | Accessibility | WCAG 2.1 AA compliance | 1 day |
| P2 | Cross-Browser | Chrome, Firefox, Safari, Edge | 1 day |
| P2 | Integration Flows | End-to-end user journeys | 1 day |

**🤖 Teammate Workflow for Phase 5 (Final Polish):**

**Day 1 - Performance Audit:**
```bash
# Launch 3 concurrent agents for performance testing
Agent 34: "Run Lighthouse audits on all major pages:
          Dashboard, Assets List, Patch Details, Settings.
          Document Performance scores, identify bottlenecks.
          Check bundle sizes, network waterfall, render times."

Agent 35: "Test large dataset performance:
          Load assets page with 1000+ items → Measure render time.
          Test search latency → Type query → Measure response time.
          Test table sorting/filtering with large datasets."

Agent 36: "Profile real-time features:
          Monitor SSE connection stability over 30 minutes.
          Check polling intervals (should be 5-10s, not 1s).
          Measure telemetry refresh performance."
```

**Day 2 - Responsive Design:**
```bash
Agent 37: "Test mobile layout (320px - iPhone SE):
          Navigate through all major pages → Screenshot each.
          Verify: Tables scroll horizontally, buttons stack, text readable.
          Test touch targets (>= 44x44px)."

Agent 38: "Test tablet layout (768px - iPad):
          Navigate through all major pages → Screenshot each.
          Verify: 2-column layouts, sidebar behavior, form layouts."

Agent 39: "Test desktop layouts (1920px, 2560px):
          Verify: No wasted whitespace, responsive grids, breakpoints work."
```

**Day 3 - Accessibility Audit:**
```bash
Agent 40: "Run axe DevTools audit on all pages:
          Document all WCAG violations by severity.
          Check: Color contrast, ARIA labels, form labels, focus indicators."

Agent 41: "Test keyboard navigation:
          Navigate through entire app using only keyboard (Tab, Enter, Esc).
          Verify: Focus order logical, no focus traps, modals closable.
          Document any keyboard-inaccessible features."

Agent 42: "Test with screen reader (VoiceOver or NVDA):
          Navigate login → dashboard → assets detail.
          Verify: All content announced, form labels read, buttons described."
```

**Day 4 - Cross-Browser Testing:**
```bash
# Launch 4 concurrent agents (one per browser)
Agent 43: "Test in Chrome 120+:
          Full smoke test → All critical paths → Document any issues."

Agent 44: "Test in Firefox 120+:
          Full smoke test → Document rendering differences, console errors."

Agent 45: "Test in Safari 17+:
          Full smoke test → Document Safari-specific issues (EventSource, fetch)."

Agent 46: "Test in Edge 120+:
          Full smoke test → Document Edge-specific issues."
```

**Day 5 - End-to-End Integration Flows:**
```bash
# Launch 5 concurrent agents for complete user journeys
Agent 47: "Login → Create Asset → View Details → Delete Asset → Logout"

Agent 48: "Login → Create Patch → Deploy to Assets → Monitor Status → Verify Completion"

Agent 49: "Login → Trigger Vuln Scan → Create Exception → Verify Dashboard Updates"

Agent 50: "Login → Upload Package to Hub → Deploy to Assets → Verify Installation"

Agent 51: "Login → Configure LDAP → Sync Users → Assign Roles → Test LDAP Login"
```

**Final Results Synthesis:**
- Collect reports from all 18 agents (Agents 34-51)
- Create Phase 5 completion report with:
  - Performance scores (Lighthouse)
  - Accessibility violations (axe)
  - Browser compatibility matrix
  - Mobile/responsive screenshots
  - End-to-end flow pass/fail status
- File remaining P2/P3 bugs
- Create final QA sign-off document

**Success Criteria:**
- Pages load in < 3 seconds
- Mobile layout doesn't break
- Keyboard navigation works
- All browsers render correctly
- End-to-end flows complete successfully

**Exit Criteria:**
- Performance metrics meet targets (>= 85 Lighthouse score)
- Mobile experience validated (320px, 768px, 1920px)
- Accessibility audit passes (>= 90 axe score, 0 critical violations)
- Browser compatibility confirmed (Chrome, Firefox, Safari, Edge)
- All 18 agents report completion with documented findings

---

## Testing Environment Setup

### Prerequisites
1. Backend services running (via Docker)
   ```bash
   make dev-services
   make dev-backend
   ```

2. Frontend dev server running
   ```bash
   make dev-frontend
   ```

3. Test data seeded
   ```bash
   make db-reset  # drops, migrates, seeds
   ```

4. Test user accounts available:
   - Admin: `admin@patchiq.io` / `admin123`
   - Demo: `demo@patchiq.io` / `demo123`

### Environment URLs
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Scalar API Docs:** http://localhost:3000/api-docs
- **Prisma Studio:** http://localhost:4503
- **MinIO Console:** http://localhost:9001

### 🎭 Playwright MCP / TestScript Setup

**CRITICAL:** Playwright MCP is REQUIRED for all browser testing in this roadmap.

#### Installation & Verification

1. **Check if Playwright MCP is available:**
   ```bash
   # In Claude Code, check available MCP tools
   # Look for "playwright" or "testscript" in tool list
   ```

2. **Test Playwright MCP connection:**
   ```javascript
   // Test basic Playwright functionality
   // Ask Claude Code: "Use Playwright MCP to navigate to http://localhost:5173"
   // Should open browser and navigate to login page
   ```

3. **Verify browser installation:**
   ```bash
   # Playwright should have Chromium installed by default
   # For testing multiple browsers:
   npx playwright install firefox
   npx playwright install webkit
   ```

#### Playwright MCP Commands Reference

**Navigation:**
```javascript
await page.goto('http://localhost:5173/login');
await page.waitForURL('**/dashboard'); // Wait for redirect
```

**Interactions:**
```javascript
// Click
await page.click('button[type="submit"]');
await page.click('text=Login'); // By text content

// Fill forms
await page.fill('input[name="email"]', 'admin@patchiq.io');
await page.fill('input[type="password"]', 'admin123');

// Select dropdown
await page.selectOption('select[name="role"]', 'admin');

// Check checkbox
await page.check('input[type="checkbox"]');
```

**Assertions:**
```javascript
// Wait for element
await page.waitForSelector('.dashboard-stats');

// Verify text exists
await page.waitForSelector('text=Welcome');

// Verify URL
await page.waitForURL('**/dashboard');

// Get text content
const text = await page.textContent('h1');
```

**Screenshots:**
```javascript
// Full page
await page.screenshot({ path: 'dashboard.png' });

// Element only
await page.locator('.stats-card').screenshot({ path: 'stats.png' });

// With timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-');
await page.screenshot({ path: `test-${timestamp}.png` });
```

**Console errors:**
```javascript
// Listen for console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log('Console Error:', msg.text());
  }
});

// Or collect errors
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
```

**Performance:**
```javascript
// Measure load time
const start = Date.now();
await page.goto('http://localhost:5173/dashboard');
await page.waitForLoadState('networkidle');
const loadTime = Date.now() - start;
console.log(`Page loaded in ${loadTime}ms`);
```

#### Playwright MCP Best Practices

**DO:**
- ✅ Use Playwright for ALL UI interactions
- ✅ Take screenshots at every major step
- ✅ Wait for elements before interacting (`waitForSelector`)
- ✅ Use descriptive screenshot filenames with timestamps
- ✅ Capture console errors throughout test
- ✅ Use `waitForLoadState('networkidle')` before assertions

**DON'T:**
- ❌ Use `page.goto()` without `waitForLoadState()`
- ❌ Click elements without `waitForSelector()` first
- ❌ Skip screenshot capture (needed for bug reports)
- ❌ Ignore console errors
- ❌ Use fixed sleeps (`await page.waitForTimeout(5000)`) - use proper waits instead

#### Playwright MCP Troubleshooting

**Browser won't open:**
```bash
# Reinstall browsers
npx playwright install --force
```

**Elements not found:**
```javascript
// Use better selectors
await page.click('[data-testid="login-button"]'); // Best
await page.click('button:has-text("Login")'); // Good
await page.click('.btn-primary'); // OK (can break if CSS changes)
```

**Tests timing out:**
```javascript
// Increase timeout for slow operations
await page.click('button', { timeout: 60000 }); // 60 seconds
```

**Screenshots not saving:**
```bash
# Ensure screenshots directory exists
mkdir -p screenshots
await page.screenshot({ path: 'screenshots/test.png' });
```

---

## Test Data Requirements

### Minimum Required Data
- **Users:** 5 users (1 admin, 2 operators, 2 read-only)
- **Assets:** 20 assets (10 Windows, 5 Linux, 5 macOS)
- **Patches:** 50 patches (mix of OS and software patches)
- **Vulnerabilities:** 100 CVEs (mix of severities)
- **Deployments:** 10 completed, 5 in-progress, 3 failed
- **Discovery:** 2 IP ranges, 3 credential sets, 5 agents
- **Packages:** 10 software packages in Hub
- **Jobs:** 5 patch policies, 3 vulnerability scan jobs
- **Notifications:** 20 historical notifications

### Data Generation
Use seed script with expanded data:
```bash
cd backend && npm run seed -- --expanded
```

Or manually create via API/UI during Phase 1.

---

## Testing Strategy

### 1. Manual Exploratory Testing
- **When:** All phases
- **Who:** QA engineers, product managers
- **Focus:** User experience, edge cases, visual bugs

### 2. Functional Testing
- **When:** Phases 1-4
- **Who:** QA engineers
- **Focus:** Feature correctness, API integration, CRUD operations

### 3. Integration Testing
- **When:** Phase 5
- **Who:** QA + Dev
- **Focus:** End-to-end workflows, data consistency

### 4. Performance Testing
- **When:** Phase 5
- **Who:** QA engineers
- **Tools:** Lighthouse, Chrome DevTools
- **Focus:** Load times, bundle size, network requests

### 5. Accessibility Testing
- **When:** Phase 5
- **Who:** QA engineers
- **Tools:** axe DevTools, WAVE, keyboard testing
- **Focus:** WCAG 2.1 AA compliance

### 6. Cross-Browser Testing
- **When:** Phase 5
- **Who:** QA engineers
- **Tools:** BrowserStack or manual testing
- **Focus:** Chrome, Firefox, Safari, Edge (latest 2 versions)

---

## Bug Tracking & Triage

### Severity Levels
- **P0 (Blocker):** App unusable, critical path broken
  - *Examples:* Can't log in, deployment crashes app, data loss
  - *SLA:* Fix within 24 hours

- **P1 (Critical):** Major feature broken, workaround exists
  - *Examples:* Search doesn't work, export fails, tab doesn't load
  - *SLA:* Fix within 3 days

- **P2 (High):** Non-critical feature broken, minor impact
  - *Examples:* Sorting broken, filter doesn't persist, UI glitch
  - *SLA:* Fix within 1 week

- **P3 (Medium):** Nice-to-have, cosmetic issue
  - *Examples:* Alignment off, typo, missing tooltip
  - *SLA:* Fix in next sprint

- **P4 (Low):** Enhancement, future consideration
  - *Examples:* Feature request, UX improvement
  - *SLA:* Backlog

### Bug Report Template
```markdown
**Title:** [Component] Brief description

**Severity:** P0 / P1 / P2 / P3 / P4

**Environment:**
- Browser: Chrome 120
- OS: macOS Sonoma
- Screen: 1920x1080

**Steps to Reproduce:**
1. Navigate to /patches
2. Click "Create Patch"
3. Fill form with X, Y, Z
4. Click "Submit"

**Expected Result:**
Patch created successfully, redirects to patch details

**Actual Result:**
Form submission hangs, no error message, console shows 500 error

**Screenshots:**
[Attach screenshots]

**Console Errors:**
```
POST /v1/patches 500 Internal Server Error
Error: Validation failed: vendor is required
```

**Impact:**
Cannot create patches, blocks deployment workflows

**Workaround:**
None

**Notes:**
Only happens with patches targeting Windows
```

### Bug Triage Workflow
1. QA discovers bug → creates ticket
2. QA lead assigns severity
3. Dev team triages (accepts/rejects)
4. Assigned dev investigates
5. Fix implemented → PR created
6. QA verifies fix → closes ticket

---

## Metrics & Success Criteria

### Phase Exit Metrics
| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|--------|---------|---------|---------|---------|---------|
| Test Cases Passed | 80% | 85% | 90% | 95% | 98% |
| P0 Bugs Open | 0 | 0 | 0 | 0 | 0 |
| P1 Bugs Open | ≤ 2 | ≤ 3 | ≤ 5 | ≤ 3 | ≤ 2 |
| Console Errors | 0 critical | 0 critical | 0 critical | 0 | 0 |
| Performance Score | N/A | N/A | N/A | N/A | ≥ 85 |
| Accessibility Score | N/A | N/A | N/A | N/A | ≥ 90 |

### Final Acceptance Criteria
- [ ] All P0 and P1 bugs resolved
- [ ] All critical user flows tested end-to-end
- [ ] Performance score ≥ 85 (Lighthouse)
- [ ] Accessibility score ≥ 90 (axe)
- [ ] Cross-browser compatibility confirmed
- [ ] Mobile responsive design validated
- [ ] Real-time features (SSE) working
- [ ] No console errors or warnings
- [ ] Test coverage report reviewed

---

## Risk Mitigation

### Identified Risks
1. **Risk:** Backend API changes break frontend
   - **Mitigation:** Test with latest backend, coordinate with backend team

2. **Risk:** SSE connection issues in production
   - **Mitigation:** Test with network throttling, implement reconnect logic

3. **Risk:** Performance degrades with large datasets
   - **Mitigation:** Load test with 1000+ assets/patches, profile with DevTools

4. **Risk:** RBAC permissions not enforced
   - **Mitigation:** Test each role thoroughly, verify API denies unauthorized access

5. **Risk:** Browser-specific bugs discovered late
   - **Mitigation:** Run smoke tests on all browsers early (Phase 2)

---

## Team & Responsibilities

| Role | Responsibilities | Phases |
|------|------------------|--------|
| **QA Lead** | Roadmap planning, prioritization, bug triage, metrics tracking | All |
| **QA Engineer 1** | Authentication, Dashboard, Assets testing | 1, 2 |
| **QA Engineer 2** | Patches, Deployments, Vulnerabilities testing | 1, 2 |
| **QA Engineer 3** | Discovery, Hub, Jobs, Notifications testing | 3 |
| **QA Engineer 4** | Settings, Reports, Error handling testing | 3, 4 |
| **Performance Tester** | Load testing, profiling, optimization validation | 5 |
| **Accessibility Specialist** | WCAG audit, keyboard nav, screen reader testing | 5 |
| **Dev Team** | Bug fixes, integration support, code reviews | All |
| **Product Manager** | UAT, acceptance criteria validation | All |

---

## Communication & Reporting

### Daily Standups (15 min)
- What tested yesterday
- What testing today
- Blockers

### Weekly Status Report (Fridays)
- Test cases executed vs planned
- Bugs found (by severity)
- Risks & blockers
- Next week's plan

### Phase Completion Report
- Summary of test coverage
- Bug metrics (found, fixed, open)
- Performance & accessibility scores
- Recommendations for next phase

### Tools
- **Bug Tracking:** GitHub Issues (labels: `bug`, `P0`, `P1`, etc.)
- **Test Case Management:** Google Sheets or TestRail
- **Communication:** Slack channel `#patchiq-qa`
- **Documentation:** This repo under `/docs/sprint-2/`

---

## Appendix A: Test Case Summary

See detailed test cases in:
- [PRD: Frontend QA Testing](./PRD-FRONTEND-QA-TESTING.md)
- [Test Cases: Authentication](./TEST-CASES-AUTH.md)
- [Test Cases: Assets](./TEST-CASES-ASSETS.md)
- [Test Cases: Patches](./TEST-CASES-PATCHES.md)
- [Test Cases: Vulnerabilities](./TEST-CASES-VULNERABILITIES.md)
- [Test Cases: Cross-Cutting](./TEST-CASES-CROSS-CUTTING.md)

---

## Appendix B: Environment Troubleshooting

### Frontend Won't Start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend API Errors
```bash
cd backend
make db-reset  # drops DB, re-seeds
make dev-backend
```

### Docker Services Down
```bash
make dev-services  # starts Postgres, Redis, MinIO
docker ps  # verify all running
```

### SSE Connection Fails
- Check backend logs for `/notifications/stream` errors
- Verify JWT token valid (check localStorage)
- Test with `curl -N -H "Authorization: Bearer <token>" http://localhost:3000/v1/notifications/stream`

---

## Appendix C: Teammate Usage Best Practices

### Why Teammates Are Mandatory

Testing 40+ pages with 65+ API endpoints manually is infeasible within the 3-4 week timeline. Teammates (Claude Code's Task tool with specialized agents) enable:

1. **Parallel execution** - Run 5-10 tests simultaneously vs serially
2. **Consistency** - Agents follow test cases exactly, no human variance
3. **Thoroughness** - Agents don't skip steps due to fatigue
4. **Scalability** - 51 agents across 5 phases vs 1-2 QA engineers

### Agent Types & When to Use

| Agent Type | Use Case | Example |
|------------|----------|---------|
| **Explore** | Deep feature exploration, codebase searches | "Explore the asset details page and document all 12 tabs" |
| **Bash** | Run commands, check logs, validate backend | "Run Lighthouse audit on dashboard page" |
| **General-purpose** | Complex multi-step workflows | "Test complete patch deployment from creation to completion" |

### Teammate Invocation Example

When starting Phase 1 Day 1, launch 3 agents in parallel:

```markdown
Agent 1: Test login flows
- Valid credentials → Success
- Invalid credentials → Error message
- Expired token → Redirect to login
- Session persistence → Survives reload

Agent 2: Test password reset
- Request reset → Email sent
- Click link → Form appears
- Submit new password → Success
- Login with new password → Works

Agent 3: Test onboarding
- New user login → Redirects to onboarding
- Complete form → Success
- Onboarding flag set → No redirect on next login
```

Launch all 3 simultaneously using the Task tool, then collect results.

### Agent Prompting Best Practices

**DO:**
- Be specific about what to test
- Include success criteria
- Request screenshots or logs
- Ask for console error documentation
- Specify timeouts or performance targets

**DON'T:**
- Give vague instructions ("test the app")
- Assume agent knows business logic
- Skip edge cases in prompt
- Forget to request documentation of failures

**Good Prompt Example:**
```
Test the patch deployment workflow end-to-end:
1. Navigate to /patches and select first patch
2. Click "Deploy" button
3. Select 3 target assets from dropdown
4. Choose schedule: "Immediate"
5. Click "Deploy" and note deployment ID
6. Navigate to deployment status page
7. Monitor progress for 2 minutes (or until complete)
8. Document:
   - Real-time updates working? (polling/SSE)
   - All 3 tasks complete successfully?
   - Any console errors?
   - Performance acceptable? (< 2s status refresh)

Expected: All 3 tasks succeed, no errors, status updates in real-time.
```

### Results Collection & Synthesis

After agents complete:
1. Read agent output files or use TaskOutput tool
2. Create summary table:

| Agent ID | Feature | Status | Bugs Found | Notes |
|----------|---------|--------|------------|-------|
| Agent 1 | Login | Pass | 0 | All flows work |
| Agent 2 | Password Reset | Fail | 1 P1 | Email not sent |
| Agent 3 | Onboarding | Pass | 0 | Works as expected |

3. File bugs in GitHub Issues
4. Update phase completion report

### Tracking Agent Progress

Use TaskOutput to check on long-running agents:

```bash
# Check if agent still running
TaskOutput(task_id="a1b2c3d", block=false)

# Wait for agent to complete
TaskOutput(task_id="a1b2c3d", block=true, timeout=300000)
```

### Teammate Budget

Total agents planned: **51 agents** across 5 phases

- Phase 1: 8 agents
- Phase 2: 7 agents
- Phase 3: 7 agents
- Phase 4: 11 agents
- Phase 5: 18 agents

**Cost estimation:**
- Average agent uses ~10,000-20,000 tokens
- Total: ~500,000-1,000,000 tokens
- At $15/million input tokens (Opus): ~$7.50-$15 total
- **ROI:** Saves 2-3 weeks of manual testing labor

---

## Appendix D: Playwright MCP Integration with Teammates

### Complete Example: Login Flow Testing

**Step 1: Launch Teammate with Playwright Instructions**
```
Task Tool:
  subagent_type: general-purpose
  description: Test login flow with Playwright
  prompt: |
    Test the login flow using Playwright MCP for browser automation.

    Instructions:
    1. Use Playwright MCP to navigate to http://localhost:5173/login
    2. Wait for page to load completely
    3. Use Playwright MCP to fill email field: admin@patchiq.io
    4. Use Playwright MCP to fill password field: admin123
    5. Use Playwright MCP to click submit button
    6. Wait for redirect to /dashboard
    7. Use Playwright MCP to take screenshot of dashboard
    8. Use Playwright MCP to check console for errors
    9. Report results:
       - Login successful? (yes/no)
       - Dashboard loaded? (yes/no)
       - Console errors? (list all)
       - Screenshot path
```

**Step 2: Teammate Executes Playwright Commands**
The agent will:
- Call Playwright MCP tool multiple times
- Navigate, interact, capture screenshots
- Collect results

**Step 3: Teammate Reports Findings**
```
Agent Report:
✅ Login successful
✅ Dashboard loaded in 1.2s
✅ No console errors
📸 Screenshot: /screenshots/dashboard-2026-02-16-10-30-45.png

Pass/Fail: PASS
```

### Playwright MCP Tool Usage Patterns

**Pattern 1: Simple Navigation Test**
```
Use Playwright MCP:
1. Navigate to [URL]
2. Wait for element [selector]
3. Take screenshot
4. Report if page loaded
```

**Pattern 2: Form Submission Test**
```
Use Playwright MCP:
1. Navigate to [URL]
2. Fill field [selector] with [value]
3. Fill field [selector] with [value]
4. Click button [selector]
5. Wait for [expected result]
6. Take screenshot
7. Report success/failure
```

**Pattern 3: Multi-Step Workflow Test**
```
Use Playwright MCP:
1. Navigate to [URL 1]
2. Perform action A
3. Verify result A
4. Navigate to [URL 2]
5. Perform action B
6. Verify result B
7. Take screenshots at each step
8. Report complete workflow status
```

**Pattern 4: Real-Time Monitoring Test**
```
Use Playwright MCP:
1. Navigate to [URL]
2. Take screenshot at T=0s
3. Wait 10 seconds
4. Take screenshot at T=10s
5. Compare screenshots (or verify data changed)
6. Report update frequency
```

### Common Playwright Selectors

| Selector Type | Example | When To Use |
|---------------|---------|-------------|
| **data-testid** | `[data-testid="login-button"]` | Best - stable, semantic |
| **name** | `input[name="email"]` | Good - form fields |
| **type** | `input[type="password"]` | Good - input types |
| **text content** | `text=Login` or `button:has-text("Login")` | Good - buttons, links |
| **role** | `button[role="button"]` | Good - accessibility |
| **class** | `.btn-primary` | OK - can break with CSS changes |
| **id** | `#submit-button` | OK - if IDs are stable |

### Screenshot Naming Convention

Use descriptive filenames with timestamps:
```javascript
const timestamp = new Date().toISOString().replace(/:/g, '-');
const filename = `{feature}-{action}-{timestamp}.png`;

Examples:
- login-success-2026-02-16T10-30-45.png
- dashboard-loaded-2026-02-16T10-31-12.png
- assets-list-filtered-2026-02-16T10-32-30.png
- deployment-status-in-progress-2026-02-16T10-35-00.png
```

### Handling Common Scenarios

**Scenario 1: Waiting for API Response**
```javascript
// Don't use fixed sleep!
await page.waitForTimeout(5000); // ❌ BAD

// Use proper waits
await page.waitForLoadState('networkidle'); // ✅ GOOD
await page.waitForSelector('.data-loaded'); // ✅ GOOD
await page.waitForResponse(res => res.url().includes('/api/assets')); // ✅ BEST
```

**Scenario 2: Handling Modals**
```javascript
// Click button that opens modal
await page.click('button[data-testid="create-asset"]');

// Wait for modal to appear
await page.waitForSelector('.modal[role="dialog"]');

// Fill modal form
await page.fill('.modal input[name="hostname"]', 'test-server');

// Submit modal
await page.click('.modal button[type="submit"]');

// Wait for modal to close
await page.waitForSelector('.modal', { state: 'detached' });
```

**Scenario 3: Testing Real-Time Updates (SSE/Polling)**
```javascript
// Navigate to page with real-time data
await page.goto('http://localhost:5173/deployments/123');

// Capture initial state
const initialStatus = await page.textContent('.deployment-status');
await page.screenshot({ path: 'deploy-status-t0.png' });

// Wait for update (30 seconds)
await page.waitForFunction(
  (initialText) => {
    const currentText = document.querySelector('.deployment-status').textContent;
    return currentText !== initialText;
  },
  initialStatus,
  { timeout: 30000 }
);

// Capture updated state
const updatedStatus = await page.textContent('.deployment-status');
await page.screenshot({ path: 'deploy-status-t30.png' });

// Report
console.log(`Status changed from "${initialStatus}" to "${updatedStatus}" in <30s`);
```

**Scenario 4: Testing Responsive Layouts**
```javascript
// Test mobile layout (320px)
await page.setViewportSize({ width: 320, height: 568 });
await page.goto('http://localhost:5173/dashboard');
await page.screenshot({ path: 'dashboard-mobile-320px.png' });

// Test tablet layout (768px)
await page.setViewportSize({ width: 768, height: 1024 });
await page.goto('http://localhost:5173/dashboard');
await page.screenshot({ path: 'dashboard-tablet-768px.png' });

// Test desktop layout (1920px)
await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto('http://localhost:5173/dashboard');
await page.screenshot({ path: 'dashboard-desktop-1920px.png' });
```

### Debugging Playwright Tests

**Enable verbose logging:**
```javascript
// In Playwright scripts
DEBUG=pw:api npx playwright test
```

**Slow down execution to watch:**
```javascript
await page.goto(url, { slowMo: 500 }); // 500ms delay between actions
```

**Pause execution for debugging:**
```javascript
await page.pause(); // Opens Playwright Inspector
```

**Get element information:**
```javascript
// Check if element exists
const exists = await page.locator('button').count() > 0;

// Get element attributes
const href = await page.getAttribute('a.link', 'href');

// Get all matching elements
const count = await page.locator('.list-item').count();
console.log(`Found ${count} items`);
```

---

## Appendix E: Quick Reference Links

- [CLAUDE.md](../../CLAUDE.md) - Project overview
- [Backend README](../../backend/README.md) - Backend setup
- [Frontend README](../../frontend/README.md) - Frontend setup
- [Sprint 2 Roadmap](../sprint-2/ROADMAP.md) - Overall sprint goals
- [Playwright Documentation](https://playwright.dev/) - Official Playwright docs

---

**End of Roadmap**
