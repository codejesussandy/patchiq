# PRD: B.12 — Settings Page Audit & Completion

> **Sprint 1 Track B** | **Priority:** Should Have (Week 3) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** Settings overhaul requires all pages to be functional baseline
> **Dependencies:** None (can start immediately)

---

## 1. Problem Statement

The Settings section has **36 sub-pages** organized across 6 categories (General, Enrollment, Security, Integrations, Notifications, Advanced). After backend fixes (A.2, A.3, A.8) and frontend quick fixes (B.2, B.3, B.4), we need to systematically verify that:
- All pages render without crashes
- All forms submit and persist data
- No broken API calls (404s, validation errors)
- UI/UX issues are identified and fixed

**What's broken (potentially):**
- Unknown number of settings pages may still crash on render (like B.3 EnrollSecret Modal)
- Forms may have broken submission handlers (like B.4 DistributionServer delete)
- Stub pages marked "Coming Soon" need to be identified and documented
- Inconsistent form patterns across pages (some use React Query, some don't)

**Who is affected:** All users (admins primarily) attempting to configure platform settings.

**Cost of not solving:** Settings pages remain a minefield of broken forms and crashes. Sprint 2's Settings Overhaul theme cannot begin without a complete baseline audit.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | All 36 settings pages render without crashing | Zero console errors on page load |
| G2 | All functional pages save/update/delete data successfully | Forms submit, API calls succeed, data persists |
| G3 | Stub pages are documented | List of "Coming Soon" pages tracked for Sprint 2 |
| G4 | Audit report guides Sprint 2 prioritization | Comprehensive findings doc identifies P0 crashes, P1 UX issues, P2 nice-to-haves |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Redesign settings UI/UX | This is an audit + bugfix pass, not a redesign (Sprint 2 scope) |
| N2 | Implement stub pages | "Coming Soon" pages are Sprint 2 work, just document them here |
| N3 | Refactor all settings forms to uniform pattern | Standardization is Sprint 2 scope, just fix crashes/blockers |
| N4 | Add comprehensive validation | Fix critical validation bugs, but don't add new validation rules |

---

## 4. User Stories

- As a **platform admin**, I want all settings pages to load without crashing so that I can configure the platform.
- As a **platform admin**, I want forms to save my changes so that my configuration persists.
- As a **Sprint 2 developer**, I want a complete audit report so that I know which pages need work during the settings overhaul.
- As a **QA engineer**, I want to know which settings pages are stubs vs functional so that I can test appropriately.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Audit all 36 settings pages

**Audit checklist for each page:**

```
Page: [Page Name]
Route: /settings/[route]
Status: [ ] Functional | [ ] Stub | [ ] Broken

Render:
  [ ] Page loads without console errors
  [ ] No missing imports (Modal, Button, etc.)
  [ ] No undefined component errors

Data Fetching:
  [ ] API calls succeed (no 404s)
  [ ] Loading states work
  [ ] Error states handled
  [ ] Empty states handled

Form Submission (if applicable):
  [ ] Create/update operations work
  [ ] Delete operations work (with confirmation)
  [ ] Success messages display
  [ ] Data refetches after mutations
  [ ] Validation errors display correctly

UI/UX:
  [ ] Forms are usable (not broken layouts)
  [ ] Buttons are wired up (not dead code)
  [ ] Help text / tooltips are accurate
  [ ] Responsive layout works

Notes:
[Any issues found, proposed fixes, or "Coming Soon" status]
```

**Settings Pages to Audit:**

**General:**
1. `/settings/general/organization` — Organization details
2. `/settings/general/branches` — Branches/departments
3. `/settings/general/users` — User management
4. `/settings/general/roles` — Role management
5. `/settings/general/license` — Platform license

**Enrollment:**
6. `/settings/enrollment/enroll-secret` — Agent enrollment secret (B.3 fixed Modal)
7. `/settings/enrollment/agent-versions` — Agent version management
8. `/settings/enrollment/agent-approval` — Agent approval workflow

**Security:**
9. `/settings/security/authentication` — Auth methods (local, LDAP, SSO)
10. `/settings/security/password-policy` — Password requirements
11. `/settings/security/session-timeout` — Session management
12. `/settings/security/2fa` — Two-factor authentication
13. `/settings/security/api-keys` — API key management

**Integrations:**
14. `/settings/integrations/email` — Email (SMTP) configuration
15. `/settings/integrations/slack` — Slack notifications
16. `/settings/integrations/teams` — Microsoft Teams
17. `/settings/integrations/webhooks` — Webhook endpoints
18. `/settings/integrations/syslog` — Syslog forwarding
19. `/settings/integrations/ldap` — LDAP/AD configuration
20. `/settings/integrations/sso` — SSO (SAML) configuration
21. `/settings/integrations/mcp-servers` — MCP server connections

**Notifications:**
22. `/settings/notifications/alert-rules` — Alert rule configuration
23. `/settings/notifications/email-templates` — Email template customization
24. `/settings/notifications/notification-channels` — Channel management

**Advanced:**
25. `/settings/advanced/database` — Database maintenance
26. `/settings/advanced/backup` — Backup/restore settings
27. `/settings/advanced/logs` — Log level configuration
28. `/settings/advanced/jobs` — Background job configuration
29. `/settings/advanced/rate-limiting` — Rate limit configuration
30. `/settings/advanced/discovery` — Network discovery settings
31. `/settings/advanced/distribution-servers` — Distribution server config (B.4 fixed delete)
32. `/settings/advanced/deployment-policies` — Deployment policy templates
33. `/settings/advanced/patch-preferences` — Patch selection preferences
34. `/settings/advanced/cve-sources` — CVE data source configuration
35. `/settings/advanced/marketplace` — Plugin marketplace (likely stub)
36. `/settings/advanced/system-info` — System information (read-only)

**Acceptance Criteria:**
- [x] All 36 pages visited manually
- [x] Checklist completed for each page
- [x] Issues categorized: P0 (crashes), P1 (broken forms), P2 (UX issues), P3 (polish)

#### R2: Fix all P0 crashes

**Definition:** A page that crashes on render (React error boundary, console errors, white screen).

**Examples:**
- Missing imports (like B.3 EnrollSecret Modal)
- Undefined variable references
- Null pointer exceptions on data access

**Acceptance Criteria:**
- [x] All P0 crashes fixed in this PR
- [x] Zero "Cannot read property of undefined" errors
- [x] All 36 pages render to completion

#### R3: Fix all P1 broken functionality

**Definition:** A page renders but critical functionality doesn't work.

**Examples:**
- Forms that don't submit (like B.4 DistributionServer delete)
- API calls returning 404 (like B.1 service URL issues)
- Save buttons that do nothing

**Acceptance Criteria:**
- [x] All P1 broken forms fixed
- [x] All "Save" / "Update" / "Delete" buttons work
- [x] Forms persist data correctly

#### R4: Document P2 UX issues and P3 stubs

**P2 UX issues:** Non-critical usability problems (confusing labels, missing help text, poor layouts).

**P3 Stubs:** Pages marked "Coming Soon" or placeholder pages with no backend yet.

**Acceptance Criteria:**
- [x] Create `docs/sprint-1/SETTINGS-AUDIT-REPORT.md` with comprehensive findings
- [x] List all P2 issues with proposed fixes (defer to Sprint 2)
- [x] List all stub pages (defer to Sprint 2)
- [x] Provide Sprint 2 backlog recommendations

---

### Nice-to-Have (P1)

#### R5: Standardize form submission patterns

- [ ] All settings forms use React Query mutations (not manual API calls)
- [ ] All forms have consistent success/error messaging
- [ ] All forms refetch data after mutations

**Note:** This is a large refactor. Document the pattern in the audit report, but actual standardization is Sprint 2.

#### R6: Add form validation feedback

- [ ] Required fields show asterisks
- [ ] Validation errors display inline (not just toast messages)
- [ ] Disable submit buttons when validation fails

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Page crash rate | 0% | All 36 pages render without errors |
| Functional pages | >75% | At least 27/36 pages fully functional (forms save data) |
| Stub pages identified | 100% | All non-functional pages documented |
| Audit completeness | 100% | All 36 pages reviewed, checklist completed |

---

## 7. Test Plan

### Manual Audit Process

**For each of 36 pages:**

1. **Navigate to page**
   - URL: `/settings/[category]/[page]`
   - Check: Does page render without console errors?

2. **Test data loading**
   - Check: Does the page fetch data from backend?
   - Check: Does loading state display?
   - Check: Does data populate forms/tables?

3. **Test form submission (if applicable)**
   - Fill out form fields
   - Click "Save" / "Update"
   - Check: Does API call succeed?
   - Check: Does success message appear?
   - Check: Does data persist after refresh?

4. **Test delete operations (if applicable)**
   - Click "Delete" on a record
   - Check: Does confirmation modal appear?
   - Click "Confirm"
   - Check: Does delete API call succeed?
   - Check: Does record disappear from list?

5. **Document findings**
   - Note any crashes, errors, broken functionality
   - Categorize as P0 / P1 / P2 / P3
   - Propose fixes or mark as Sprint 2 work

### Smoke Test Checklist (Sample Pages)

```
✅ Settings → General → Organization
  [x] Page renders
  [x] Form loads current org data
  [x] Update org name → saves successfully
  [x] Success message displays

✅ Settings → Enrollment → Enroll Secret
  [x] Page renders (B.3 fixed Modal import)
  [x] Current secret displays
  [x] "Regenerate Secret" opens modal
  [x] Confirmation works, new secret displays

✅ Settings → Advanced → Distribution Servers
  [x] Page renders
  [x] Server list loads
  [x] Delete button works (B.4 fixed fetchData → refetch)
  [x] Confirmation modal appears

❌ Settings → Integrations → MCP Servers (Stub)
  [x] Page renders
  [x] Shows "Coming Soon" message
  [ ] No functional forms (defer to Sprint 2)

[Repeat for all 36 pages...]
```

---

## 8. Implementation Notes

### Audit Workflow (3-Day Process)

**Day 1: Pages 1-12 (General + Enrollment + partial Security)**
- 6 hours: Manual testing (30 min per page × 12)
- 2 hours: Document findings, fix any quick wins (missing imports, etc.)

**Day 2: Pages 13-24 (Remaining Security + Integrations + Notifications)**
- 6 hours: Manual testing
- 2 hours: Fix P0 crashes, document P1/P2 issues

**Day 3: Pages 25-36 (Advanced settings)**
- 4 hours: Manual testing
- 2 hours: Fix remaining P0/P1 issues
- 2 hours: Write final audit report, create Sprint 2 backlog items

### Audit Report Structure

**`docs/sprint-1/SETTINGS-AUDIT-REPORT.md`:**

```markdown
# Settings Page Audit Report (B.12)

## Executive Summary
- Total pages audited: 36
- Functional pages: X (Y%)
- Stub pages: Z
- P0 crashes fixed: N
- P1 broken forms fixed: M
- P2 UX issues documented: K

## Findings by Category

### General Settings (5 pages)
- ✅ Organization (functional)
- ✅ Branches (functional)
- ✅ Users (functional)
- ⚠️ Roles (functional but missing RBAC validation — Sprint 2)
- ✅ License (functional)

### Enrollment Settings (3 pages)
- ✅ Enroll Secret (fixed in B.3)
- ✅ Agent Versions (functional)
- ⚠️ Agent Approval (form saves but approval workflow not wired — Sprint 2)

[... continue for all 6 categories]

## Issues Fixed (P0/P1)

### P0 — Crashes on Render
1. EnrollSecret: Missing Modal import (B.3) — FIXED
2. [Any other crashes found]

### P1 — Broken Functionality
1. DistributionServer: fetchData → refetch (B.4) — FIXED
2. [Any other broken forms]

## Issues Documented (P2/P3)

### P2 — UX Issues (Sprint 2)
1. Password Policy: No visual feedback when validation fails
2. API Keys: No confirmation modal on delete
3. [... more]

### P3 — Stub Pages (Sprint 2)
1. MCP Servers (stub — "Coming Soon")
2. Marketplace (stub — shows placeholder)
3. [... more]

## Sprint 2 Recommendations

1. **Priority 1:** Implement stub pages (MCP Servers, Marketplace)
2. **Priority 2:** Standardize form patterns (React Query mutations everywhere)
3. **Priority 3:** Add inline validation feedback
4. **Priority 4:** RBAC integration for role-based settings access
```

### Files to Audit (Source Locations)

All settings pages are in:
```
frontend/src/pages/settings/
├── general/
│   ├── Organization.tsx
│   ├── Branches.tsx
│   ├── Users.tsx
│   ├── Roles.tsx
│   └── License.tsx
├── enrollment/
│   ├── EnrollSecret.tsx
│   ├── AgentVersions.tsx
│   └── AgentApproval.tsx
├── security/
│   ├── Authentication.tsx
│   ├── PasswordPolicy.tsx
│   ├── SessionTimeout.tsx
│   ├── TwoFactor.tsx
│   └── ApiKeys.tsx
├── integrations/
│   ├── Email.tsx
│   ├── Slack.tsx
│   ├── Teams.tsx
│   ├── Webhooks.tsx
│   ├── Syslog.tsx
│   ├── Ldap.tsx
│   ├── Sso.tsx
│   └── McpServers.tsx
├── notifications/
│   ├── AlertRules.tsx
│   ├── EmailTemplates.tsx
│   └── NotificationChannels.tsx
└── advanced/
    ├── Database.tsx
    ├── Backup.tsx
    ├── Logs.tsx
    ├── Jobs.tsx
    ├── RateLimiting.tsx
    ├── Discovery.tsx
    ├── DistributionServers.tsx
    ├── DeploymentPolicies.tsx
    ├── PatchPreferences.tsx
    ├── CveSources.tsx
    ├── Marketplace.tsx
    └── SystemInfo.tsx
```

**Note:** Actual file structure may differ. Use `frontend/src/pages/settings/` as starting point.

### Estimated Effort

2-3 days (16-24 hours)
- 12-18 hours: Manual audit of all 36 pages
- 2-4 hours: Fix P0 crashes and P1 broken forms
- 2 hours: Write comprehensive audit report

---

## 9. Open Questions

**Q1:** What if we find more P0 crashes than expected?
- **Answer:** Fix all P0s in this PR. If there are many, extend the timeline to Week 4.

**Q2:** Should we fix P2 UX issues now or defer to Sprint 2?
- **Answer:** Document all P2 issues, but only fix if time permits. Sprint 1 priority is "make it work", not "make it perfect".

**Q3:** What about settings pages that depend on backend features not yet built (LDAP, SSO)?
- **Answer:** Document as stubs. Sprint 2 will implement backend + frontend together.

**Q4:** Should we add automated tests for settings pages?
- **Answer:** Not in Sprint 1. Manual audit is sufficient. E2E tests are B.13 (Could Have).

---

## 10. Dependencies

**Blocks:**
- Sprint 2 Settings Overhaul theme (requires complete baseline audit)

**Blocked by:**
- None (can start immediately)
- **Benefits from:** B.2 (auth fix), B.3 (Modal fix), B.4 (refetch fix) should be done first

---

## 11. Definition of Done

- [x] All 36 settings pages audited with checklist completed
- [x] All P0 crashes fixed (zero console errors on page load)
- [x] All P1 broken forms fixed (save/update/delete operations work)
- [x] P2 UX issues and P3 stubs documented in `SETTINGS-AUDIT-REPORT.md`
- [x] Manual smoke tests pass for all functional pages
- [x] `npm run check-types` passes
- [x] `npm run lint` passes
- [x] Git commit: "feat(settings): comprehensive audit of 36 settings pages, fix P0/P1 issues (B.12)"
- [x] PR merged to `sprint-1/track-b` branch
