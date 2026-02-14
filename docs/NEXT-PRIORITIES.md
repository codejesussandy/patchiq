# Next Priorities

> After Sprint 2 Pipeline 2 (Settings & Configuration) — all 6 sub-pipelines at 100%.
> Last updated: 2026-02-14

## Priority Order

### 1. Frontend Integration (HIGHEST)

**Why:** Backend has 353/353 tests passing across 6 pipelines. None of it is visible without a working frontend. This is the single biggest unlock for demo-ability and user testing.

**Scope:**
- Wire up login flow (RBAC permissions in UI)
- Dashboard with real data (assets, vulnerabilities, patches)
- Settings pages consuming all Pipeline 2 endpoints
- LDAP configuration UI
- Agent management UI

**Owner:** Dev 2 (separate repo), but may need pairing on API contracts.

---

### 2. Pipeline 2C: Organization & User Management (MEDIUM)

**Why:** Only remaining backend gap in Pipeline 2. Mostly CRUD polish — not blocking other work but needed for completeness.

**Scope:**
- R1: Fix branch asset count (replace hardcoded 0)
- R2: Org hierarchy tree endpoint
- R3: Safe deletion with impact preview
- R4: User lifecycle state machine
- R5: Bulk user import via CSV
- R6: Bulk user status change
- R7: Validation script (78 scenarios)

**Effort:** 2-3 days

---

### 3. Pipeline 3: Deployment Execution (MEDIUM)

**Why:** Core product value — actually deploying patches to endpoints. Depends on frontend being ready to show deployment status.

**Scope:**
- Hub-to-Agent patch deployment
- Rollback mechanism
- Deployment verification
- Agent command execution

**Effort:** 1-2 weeks

---

### 4. Pipeline 5: Reporting & Analytics (LOW)

**Why:** Useful for enterprise customers but not blocking core functionality.

**Scope:**
- Scheduled reports
- Export (PDF, CSV)
- Email delivery
- Compliance dashboards

**Effort:** 1 week

---

### 5. Pipeline 4: AI/MCP Integration (LOWEST)

**Why:** Nice-to-have differentiator. Zero customers are blocked on this. Build it last when everything else works end-to-end.

**Scope:**
- AI chat interface
- Natural language queries
- Auto-prioritization of patches
- MCP tool integration

**Effort:** 1-2 weeks

---

## Current Backend Status

| Pipeline | Tests | Status |
|----------|-------|--------|
| 2A RBAC & Permissions | 35/35 | PASS |
| 2B LDAP & Directory | 43/43 | PASS |
| 2D Platform Infrastructure | 67/67 | PASS |
| 2E Agent Configuration | 45/45 | PASS |
| 2F Patch & Deployment Settings | 91/91 | PASS |
| 2G Alerts, Compliance & Integrations | 72/72 | PASS |
| **Total** | **353/353** | **100%** |
