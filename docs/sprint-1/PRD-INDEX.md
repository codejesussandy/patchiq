# Sprint 1 Track B — PRD Index

> **Generated:** 2026-02-12
> **Owner:** Dev 2
> **Purpose:** Feature specifications for all Track B (Frontend & Integration) work

---

## Overview

This directory contains Product Requirements Documents (PRDs) for Sprint 1 Track B features. Each PRD follows a structured template with:
- Problem Statement (what's broken, who's affected, cost of not solving)
- Goals & Non-Goals
- User Stories
- Requirements (Must Have P0, Nice to Have P1, Future P2)
- Success Metrics
- Test Plan
- Implementation Notes

---

## Must Have (Week 1-2) — Fix Crashes & Foundation

| PRD | Feature | Priority | Dependencies | Estimated Effort |
|-----|---------|----------|--------------|------------------|
| [PRD-B2-PATCH-TEMPLATE-AUTH.md](./PRD-B2-PATCH-TEMPLATE-AUTH.md) | Fix patch template sync auth token | P0 | None | 15-30 min |
| [PRD-B3-MODAL-IMPORT.md](./PRD-B3-MODAL-IMPORT.md) | Fix EnrollSecret Modal import | P0 | None | 10-15 min |
| [PRD-B4-FETCH-DATA-REFETCH.md](./PRD-B4-FETCH-DATA-REFETCH.md) | Fix DistributionServer delete handler | P0 | None | 15-20 min |
| [PRD-B5-DOUBLE-UNWRAP-AUDIT.md](./PRD-B5-DOUBLE-UNWRAP-AUDIT.md) | Audit and fix double-unwrapping | P0 | None | 4-6 hours |
| [PRD-B8-SEED-DATA.md](./PRD-B8-SEED-DATA.md) | Add sample seed data | P0 | None | 2-3 days |
| [PRD-B9-AGENT-VERSION-PATHS.md](./PRD-B9-AGENT-VERSION-PATHS.md) | Agent version seed file paths | P0 | None | 4-6 hours |
| **B.1** | Fix broken service URLs | P0 | **Blocked by A.1** | 1-2 hours |

**Total Effort (unblocked):** ~3.5-4 days
**Status:** B.2-B.9 can start Day 1. B.1 waits for A.1 to ship.

---

## Should Have (Week 3-4) — Feature Completion

| PRD | Feature | Priority | Dependencies | Estimated Effort |
|-----|---------|----------|--------------|------------------|
| **B.6** | AI Chat Panel integration | P1 | **Blocked by A.16** | 2-3 hours |
| [PRD-B7-PATCH-SUPERSEDENCE-UI.md](./PRD-B7-PATCH-SUPERSEDENCE-UI.md) | Patch supersedence management UI | P1 | None (backend exists) | 8-12 hours |
| **B.12** | Settings page audit & completion | P1 | None | 2-3 days |
| **B.10** | Asset import UI wizard | P1 | **Blocked by A.6** | 3-4 days |
| **B.11** | Network discovery results UI | P1 | **Blocked by A.5** | 2-3 days |

**Total Effort (unblocked):** ~3-4 days (B.7 + B.12)
**Blocked Effort:** ~5-8 days (B.6, B.10, B.11 wait for Track A dependencies)

---

## Could Have (Week 5+) — Polish

| PRD | Feature | Priority | Dependencies | Estimated Effort |
|-----|---------|----------|--------------|------------------|
| **B.13** | E2E test coverage | P2 | None | 1-2 weeks |
| **B.14** | Performance optimization | P2 | None | 1 week |

**Total Effort:** 2-3 weeks (stretch goals if ahead of schedule)

---

## Sprint 1 Track B Critical Path

```
Day 1-2:  B.2, B.3, B.4 (quick wins, <1 hour total)
          Start B.5 audit (parallel with Dev 1 building A.1)

Day 2-4:  B.8 seed data + B.9 agent paths (parallel, ~3 days)
          Continue B.5 audit

Week 2:   B.1 (after A.1 lands from Dev 1)
          B.7 patch supersedence UI
          Start B.12 settings audit

Week 3:   B.6 AI chat integration (after A.16 lands)
          Complete B.12 settings audit

Week 4:   B.10 asset import UI (after A.6 lands)
          B.11 discovery results UI (after A.5 lands)
```

**Zero idle time:** B.2-B.5, B.8, B.9 fill Week 1-2 while waiting for A.1 to unblock B.1.

---

## PRD Status

| PRD File | Feature | Status | Implementation Status |
|----------|---------|--------|----------------------|
| PRD-B2-PATCH-TEMPLATE-AUTH.md | Fix auth token | ✅ Written | Pending |
| PRD-B3-MODAL-IMPORT.md | Fix Modal import | ✅ Written | Pending |
| PRD-B4-FETCH-DATA-REFETCH.md | Fix delete handler | ✅ Written | Pending |
| PRD-B5-DOUBLE-UNWRAP-AUDIT.md | Audit double-unwrap | ✅ Written | Pending |
| PRD-B8-SEED-DATA.md | Seed data | ✅ Written | Pending |
| PRD-B9-AGENT-VERSION-PATHS.md | Agent version paths | ✅ Written | Pending |
| PRD-B7-PATCH-SUPERSEDENCE-UI.md | Supersedence UI | ✅ Written | Pending |
| PRD-B1-FIX-SERVICE-URLS.md | Fix frontend URLs | ⏳ Needs writing | Blocked by A.1 |
| PRD-B6-AI-CHAT-INTEGRATION.md | AI Chat Panel | ⏳ Needs writing | Blocked by A.16 |
| PRD-B12-SETTINGS-AUDIT.md | Settings audit | ⏳ Needs writing | Pending |
| PRD-B10-ASSET-IMPORT-UI.md | Asset import UI | ⏳ Needs writing | Blocked by A.6 |
| PRD-B11-DISCOVERY-RESULTS-UI.md | Discovery results | ⏳ Needs writing | Blocked by A.5 |

---

## Key Takeaways

### Quick Wins (< 1 hour each)
- **B.2:** Change `'token'` to `'accessToken'` (1 line)
- **B.3:** Add `Modal` to antd imports (1 line)
- **B.4:** Change `fetchData()` to `refetch()` (1 line)

### Foundation Work (2-3 days)
- **B.5:** Audit 18 service files for double-unwrapping patterns
- **B.8:** Create realistic seed data (patches, CVEs, assets, deployments)
- **B.9:** Upload agent binaries to MinIO during seed

### Feature Work (1-2 weeks)
- **B.7:** Build supersedence management UI with autocomplete search
- **B.12:** Audit and fix all 36 settings sub-pages
- **B.6, B.10, B.11:** Blocked by Track A, estimated 1 week total

### Sprint 2 Prerequisites
- **B.8 + A.3:** Patch-CVE correlation needs seed data + CVE sync
- **B.12 + A.2 + A.11/A.12:** Settings overhaul needs working baseline + email + LDAP/roles
- **B.6 + A.16:** AI/MCP agent access needs frontend + backend chat integration

---

## Using These PRDs

1. **Dev 2 Daily Workflow:**
   - Pick next unblocked PRD from Must Have list
   - Read full PRD (problem, requirements, acceptance criteria)
   - Implement according to spec
   - Run manual smoke tests from Test Plan section
   - Update ROADMAP.md status to `COMPLETED`
   - Merge to `sprint-1/track-b` branch

2. **Cross-Track Dependencies:**
   - When Dev 1 merges A.1, A.16, A.5, or A.6 to `main`, Dev 2 rebases `sprint-1/track-b`
   - Unblocked PRDs (B.1, B.6, B.10, B.11) can then start
   - Communication via Slack/DM: "A.1 merged — B.1 unblocked"

3. **Integration Checkpoints:**
   - End of Week 2: Both devs merge to main, run full `make check-all` + smoke test
   - End of Week 4: Final integration checkpoint before Sprint 1 completion

---

*Generated with the feature-spec skill following structured PRD best practices.*
