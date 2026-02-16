# Frontend QA Testing Documentation

## Overview

This folder contains comprehensive QA testing documentation for the PatchIQ frontend application after the merge of `full-dev-heramb` into `full-dev-sandy-v2`.

**Testing Scope:**
- 11 major feature areas
- 40+ page routes
- 65+ API endpoints
- 12+ asset detail tabs
- Real-time notifications (SSE)
- RBAC & permissions

**Timeline:** 3-4 weeks across 5 phases

---

## 📄 Documents in This Folder

### 1. [FRONTEND-QA-ROADMAP.md](./FRONTEND-QA-ROADMAP.md)
**Purpose:** High-level testing roadmap with phase breakdown and timeline

**Contents:**
- 5 testing phases (Week 1-4)
- Teammate workflow for each phase (51 agents total)
- Success criteria and exit criteria per phase
- Bug tracking and triage workflow
- Team roles and responsibilities
- Risk mitigation strategies
- Comprehensive teammate usage guide (Appendix C)

**Start Here:** If you're planning the testing effort

---

### 2. [PRD-FRONTEND-QA-TESTING.md](./PRD-FRONTEND-QA-TESTING.md)
**Purpose:** Product Requirements Document with detailed test cases

**Contents:**
- Executive summary (problem, goals, non-goals)
- Application architecture and context
- 11 feature areas with priorities
- 30+ detailed test cases for Auth & Patches
- Expectations and success criteria
- Teammate workflow execution guide
- Dependencies and blockers
- Sign-off criteria

**Start Here:** If you're writing test cases or understanding requirements

---

### 3. [TEST-CASES-CROSS-CUTTING.md](./TEST-CASES-CROSS-CUTTING.md)
**Purpose:** Reusable test cases for common patterns across all pages

**Contents:**
- 100+ test cases for cross-cutting features:
  - Table & List Features (20 tests): Pagination, sorting, search, filters, bulk ops
  - Forms & Modals (10 tests): Validation, submission, error handling
  - Error Handling (8 tests): Network errors, HTTP codes, empty states
  - Responsive Design (4 tests): Mobile, tablet, desktop
  - Performance (5 tests): Load times, bundle size, rendering
  - Accessibility (9 tests): Keyboard nav, screen readers, WCAG
  - Browser Compatibility (6 tests): Chrome, Firefox, Safari, Edge

**Start Here:** If you're testing common UI patterns (tables, forms, etc.)

---

## ⚠️ CRITICAL: Teammate Tool + Playwright MCP Usage

**ALL testing in this folder REQUIRES using TWO tools in combination:**

### 1. 🤖 Claude Code Teammate Tool (Orchestration)
- Orchestrates test strategy
- Launches parallel agents
- Synthesizes results across tests

### 2. 🎭 Playwright MCP / TestScript (Browser Automation)
- Executes actual browser tests
- Interacts with UI (clicks, typing, navigation)
- Captures screenshots and console errors
- Validates page state

### Why This Combined Approach Is Mandatory

**Teammates alone:**
- ❌ Can't interact with actual browser UI
- ❌ Can't validate visual rendering
- ❌ Can't capture screenshots for bug reports

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

**Scale:** 40+ pages, 65+ APIs tested with browser automation
**Parallel:** Run 5-10 Playwright tests simultaneously via agents
**Consistency:** Playwright follows exact UI steps, no human variance
**Thoroughness:** Combined approach catches both logic and UI bugs

### Teammate Budget

**Total: 51 agents across 5 phases**

| Phase | Agents | Focus |
|-------|--------|-------|
| Phase 1 | 8 | Critical path foundation (auth, dashboard, assets, patches, vulnerabilities) |
| Phase 2 | 7 | Advanced operations (deployments, recommendations, 12 asset tabs, scanning) |
| Phase 3 | 7 | High priority features (discovery, hub, jobs, notifications, settings) |
| Phase 4 | 11 | Medium priority + edge cases (reports, tests, exceptions, error handling) |
| Phase 5 | 18 | Cross-cutting (performance, responsive, accessibility, browsers, E2E) |

### Example Integrated Workflow

**Phase 1 Day 1: Test Authentication with Playwright**

Launch 3 agents in parallel, each using Playwright MCP:

```bash
Agent 1: "Test login scenarios using Playwright MCP
- Navigate to /login
- Fill email: admin@patchiq.io, password: admin123
- Click submit, verify redirect to /dashboard
- Take screenshot
- Test invalid credentials, capture error screenshot
- Report: pass/fail, screenshots, console errors"

Agent 2: "Test password reset using Playwright MCP
- Navigate to /forgot-password
- Fill email, click send
- Verify success message appears
- Take screenshot
- Report results"

Agent 3: "Test onboarding using Playwright MCP
- Login as new user, verify redirect to /onboarding
- Fill onboarding form, submit
- Verify redirect to /dashboard
- Refresh page, verify session persists
- Take screenshots at each step"
```

**Results collected in 30-60 minutes with browser automation vs 4-6 hours manual testing.**

See [FRONTEND-QA-ROADMAP.md - Appendix C](./FRONTEND-QA-ROADMAP.md#appendix-c-teammate-usage-best-practices) for teammate guidelines.
See [FRONTEND-QA-ROADMAP.md - Appendix D](./FRONTEND-QA-ROADMAP.md#appendix-d-playwright-mcp-integration-with-teammates) for Playwright integration examples.

---

## 🚀 Getting Started

### Prerequisites

1. **Environment Setup:**
   ```bash
   # Start backend services
   make dev-services
   make dev-backend

   # Start frontend
   make dev-frontend

   # Seed test data
   make db-reset
   ```

2. **Verify Services Running:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Prisma Studio: http://localhost:4503

3. **Test Credentials:**
   - Admin: `admin@patchiq.io` / `admin123`
   - Demo: `demo@patchiq.io` / `demo123`

4. **🎭 Playwright MCP Setup:**
   ```bash
   # Verify Playwright MCP is available
   # In Claude Code, check available MCP tools
   # Should see "playwright" or "testscript" tool

   # Test Playwright connection
   # Ask Claude: "Use Playwright MCP to navigate to http://localhost:5173"
   # Should open browser and load login page

   # Optional: Install additional browsers
   npx playwright install firefox
   npx playwright install webkit
   ```

### Quick Start Guide

**Week 1 - Phase 1 (Critical Path):**
1. Read [FRONTEND-QA-ROADMAP.md](./FRONTEND-QA-ROADMAP.md) Section "Phase 1"
2. Launch 8 agents as specified in the roadmap
3. Collect agent reports
4. File bugs in GitHub Issues (labels: `bug`, `P0`, `P1`, etc.)
5. Update daily test metrics

**Week 2 - Phase 2 & 3:**
1. Continue with Phase 2 (7 agents) and Phase 3 (7 agents)
2. Focus on real-time features (SSE) - critical for notifications
3. Test asset detail tabs thoroughly (12 tabs × data loading)

**Week 3-4 - Phase 4 & 5:**
1. Phase 4: Edge cases and error handling (11 agents)
2. Phase 5: Performance, accessibility, browsers (18 agents)
3. Final QA sign-off

---

## 📊 Success Metrics

### Test Coverage
- Feature areas tested: **11/11 (100%)**
- Pages tested: **40/40 (100%)**
- Test cases executed: **>= 95%**
- Test cases passed: **>= 95%**

### Quality Metrics
- Console errors: **0**
- Lighthouse Performance: **>= 85**
- Lighthouse Accessibility: **>= 90**
- Page load time: **< 3 seconds**

### Bug Metrics
- P0 bugs open: **0**
- P1 bugs open: **<= 2**
- P2 bugs open: **<= 10**

---

## 🐛 Bug Tracking

### Severity Levels

| Severity | Description | SLA | Example |
|----------|-------------|-----|---------|
| **P0** | Blocker - App unusable | Fix within 24h | Can't log in, deployment crashes app |
| **P1** | Critical - Major feature broken | Fix within 3 days | Search doesn't work, export fails |
| **P2** | High - Non-critical feature broken | Fix within 1 week | Sorting broken, UI glitch |
| **P3** | Medium - Nice-to-have | Next sprint | Alignment off, typo |
| **P4** | Low - Enhancement | Backlog | Feature request |

### Bug Report Location
- **GitHub Issues:** [https://github.com/your-org/patchiq/issues](https://github.com/your-org/patchiq/issues)
- **Labels:** `bug`, `P0`, `P1`, `P2`, `P3`, `P4`, `frontend`, `qa`

---

## 👥 Team Roles

| Role | Responsibilities |
|------|------------------|
| **QA Lead** | Roadmap planning, teammate orchestration, bug triage, metrics tracking |
| **QA Engineer 1** | Phase 1-2 testing (auth, dashboard, assets, patches) |
| **QA Engineer 2** | Phase 1-2 testing (vulnerabilities, deployments) |
| **QA Engineer 3** | Phase 3 testing (discovery, hub, jobs, notifications) |
| **QA Engineer 4** | Phase 4 testing (settings, reports, error handling) |
| **Performance Tester** | Phase 5 testing (Lighthouse audits, profiling) |
| **Accessibility Specialist** | Phase 5 testing (WCAG audit, keyboard nav) |

---

## 📈 Daily Workflow

### Morning (9 AM - 12 PM)
1. Review previous day's agent reports
2. File bugs from agent findings
3. Plan today's test scope
4. Write 3-5 test prompts for agents
5. Launch agents in parallel

### Afternoon (1 PM - 5 PM)
6. Monitor agent progress
7. Collect completed agent reports
8. Synthesize findings into daily summary
9. Update test metrics
10. Communicate blockers to dev team

---

## 🔗 Related Documentation

- [Main Project README](../../README.md)
- [CLAUDE.md](../../CLAUDE.md) - Project overview
- [Sprint 2 Roadmap](../sprint-2/ROADMAP.md) - Overall sprint goals
- [Backend README](../../backend/README.md)
- [Frontend README](../../frontend/README.md)

---

## 📞 Contact

- **QA Lead:** [TBD]
- **Product Manager:** [TBD]
- **Dev Lead:** [TBD]
- **Slack Channel:** `#patchiq-qa`

---

**Last Updated:** 2026-02-16
**Version:** 1.0
**Status:** Ready for Execution
