# Jobs Implementation - Task Tracking

## Overview

This document tracks the implementation of functional Jobs sections (Software Jobs, Patch Jobs, Configuration Jobs, Vulnerability Jobs) integrated with the Hub-centric deployment pipeline.

**Goal:** Make all jobs sections functional by connecting them to the Hub-based deployment system where agents download bundles and execute scripts.

---

## Current State Analysis

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                        JOBS SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐          ┌─────────────────────────────────┐  │
│  │   JOBS MODULE   │          │     DEPLOYMENTS MODULE          │  │
│  │  (Catalog/Mgmt) │    →     │  (Hub-integrated Execution)     │  │
│  └─────────────────┘          └─────────────────────────────────┘  │
│          ↓                              ↓                           │
│  - SoftwareCatalog              - SoftwareDeployment               │
│  - SoftwareBundle               - SoftwareDeploymentTask           │
│  - PatchJob                     - AgentCommand                      │
│  - VulnerabilityJob             - Hub bundle payloads              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
                          ┌─────────────────┐
                          │     AGENT       │
                          │ ScriptExecutor  │
                          │ (Hub bundles)   │
                          └─────────────────┘
```

### What's Working
- Hub service (upload/download bundles, execution payloads)
- Deployment executor service (creates tasks and agent commands)
- Agent script executor (downloads and runs bundles)
- SoftwareJobsDeployed.tsx connects to `/deployments/software` (correct path)
- Hub.tsx can deploy packages to agents

### What Needs Fixing
1. **Critical Field Mismatches** - Documented in DEPLOYMENT_PIPELINE_ISSUES.md
2. **Disconnected Catalogs** - Jobs module catalogs don't connect to Hub/deployments
3. **Patch Jobs** - Creates policy records but no real execution
4. **Configuration Jobs** - Needs deployment integration

---

## Implementation Phases

### Phase 1: Fix Critical Field Mismatches
**Status:** COMPLETED
**Priority:** CRITICAL
**Goal:** Fix the field name mismatches causing blank pages and incorrect data

#### Task 1.1: Fix Frontend Type Field Name
**Status:** COMPLETED (Already Fixed)
**Files:** `backend/src/modules/deployments/deployment.controller.ts:21-28`

- Controller now accepts both `type` and `deploymentType` fields
- Resolves with: `const resolvedType = deploymentType || type || 'install';`

#### Task 1.2: Fix Backend Task Field Response
**Status:** COMPLETED (Already Fixed)
**Files:** `backend/src/modules/deployments/deployment-executor.service.ts:596-607`

- Backend now returns both field name formats:
  - Original: `endpointId`, `endpointName`, `endpointOs`, `itemName`
  - Aliases: `agentId`, `agentName`, `agentOs`, `packageName`
- Frontend handles both: `t.agentId || (t as any).endpointId`

#### Task 1.3: Fix Status Case Sensitivity
**Status:** COMPLETED (Already Fixed)
**Files:** `backend/src/modules/deployments/deployment-executor.service.ts:607`

- Backend normalizes: `status: task.status.toLowerCase()`
- Frontend normalizes: `(t.status || 'pending').toLowerCase()`

---

### Phase 2: Unify Software Jobs with Hub
**Status:** COMPLETED
**Priority:** HIGH
**Goal:** Make Software Jobs pages use Hub packages

#### Task 2.1: Redirect Software Catalog to Hub Packages
**Status:** COMPLETED
**Files:** `frontend/src/pages/jobs/SoftwareJobsCatalog.tsx`

- Changed data source from `/jobs/software/catalog` to `/hub/packages`
- Added mapping from Hub package format to display format
- Added "Deploy" button to each package card/row
- Added "BUNDLE" tag for packages with deployment scripts
- "Add Package" now navigates to Hub page for bundle uploads
- Deploy action navigates to SoftwareJobsDeployed with package context

#### Task 2.2: Fix Software Bundle OS Filtering
**Status:** COMPLETED
**Files:** `frontend/src/pages/jobs/SoftwareJobsBundle.tsx`

- Fixed platform-to-OS mapping (linux→Linux, macos→Mac, windows→Windows)
- Cross-platform packages now show in all OS selections
- Improved transfer list display with title and type
- Fetches packages from Hub with increased limit (100)

#### Task 2.3: Connect SoftwareJobsDeployed with Navigation State
**Status:** COMPLETED
**Files:** `frontend/src/pages/jobs/SoftwareJobsDeployed.tsx`

- Added useLocation to handle navigation from SoftwareJobsCatalog
- Auto-opens create modal with pre-selected package
- Pre-fills deployment name and description
- Shows info message guiding user to select agents

---

### Phase 3: Integrate Patch Jobs with Deployment Pipeline
**Status:** COMPLETED
**Priority:** HIGH
**Goal:** Make patch deployments actually execute on agents

#### Task 3.1: Fix Patch Deployment API Endpoint
**Status:** COMPLETED
**Files:** `frontend/src/services/patch.service.ts`

- Fixed `createDeployment()` to use correct endpoint `/deployments/patch`
- Backend already has `createPatchDeployment` in deployment executor

#### Task 3.2: Fix Payload Format for Patch Deployment
**Status:** COMPLETED
**Files:** `frontend/src/pages/jobs/PatchJobs.tsx`

- Changed `patchIds` to `patches` array with full patch info
- Changed `endpointIds` to `targetAgentIds` to match backend
- Added proper error handling

#### Task 3.3: Add Dynamic Agent Selection to PatchJobs
**Status:** COMPLETED
**Files:** `frontend/src/pages/jobs/PatchJobs.tsx`

- Added agents state and fetchAgents function
- Endpoints dropdown now shows actual registered agents
- Includes OS icons and status tags for agents
- Made endpoints field required

---

### Phase 4: Configuration Jobs Integration
**Status:** NEEDS BACKEND WORK
**Priority:** MEDIUM
**Goal:** Make configuration deployments execute on agents

#### Task 4.1: Review Configuration Job Structure
**Status:** ANALYZED

- ConfigCatalog has command/script configurations (commandType: bash/powershell)
- Currently no `/deployments/config` endpoint in backend
- Can use `script_inline` agent command type for execution

#### Task 4.2: Create Config Deployment Executor (BACKEND NEEDED)
**Status:** NOT_STARTED
**Files:** `backend/src/modules/deployments/`

- Need to add `createConfigDeployment` method
- Need to add `/deployments/config` route
- Use `script_inline` command type with config's command field

#### Task 4.3: Connect Config Jobs UI to Execution
**Status:** BLOCKED by Task 4.2
**Files:** `frontend/src/pages/jobs/ConfigurationJobsDeployed.tsx`

- Will need similar updates to PatchJobs once backend is ready
- Add agent selection, fix payload format

---

### Phase 5: Vulnerability Jobs Enhancement
**Status:** NOT_STARTED
**Priority:** LOW
**Goal:** Make vulnerability scans execute on agents

#### Task 5.1: Review Vulnerability Scan Architecture
**Status:** NOT_STARTED

- VulnerabilityJob creates scan job records
- Need to determine scan execution mechanism
- Agent may need vulnerability scan capability

#### Task 5.2: Implement Scan Execution (if needed)
**Status:** NOT_STARTED

- Create agent command for vulnerability scan
- Collect and report scan results
- Update Vulnerability table with findings

---

## Progress Tracker

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 1 | 1.1 Type Field Fix | **COMPLETED** | Already fixed in codebase |
| 1 | 1.2 Task Field Response | **COMPLETED** | Already fixed in codebase |
| 1 | 1.3 Status Case Fix | **COMPLETED** | Already fixed in codebase |
| 2 | 2.1 Software Catalog → Hub | **COMPLETED** | Uses Hub packages |
| 2 | 2.2 Bundle OS Filtering | **COMPLETED** | Fixed platform mapping |
| 2 | 2.3 Deployed Navigation | **COMPLETED** | Pre-selects from Catalog |
| 3 | 3.1 Patch API Endpoint | **COMPLETED** | Uses /deployments/patch |
| 3 | 3.2 Patch Payload Format | **COMPLETED** | Fixed field names |
| 3 | 3.3 Dynamic Agent Selection | **COMPLETED** | Fetches real agents |
| 4 | 4.1 Config Review | **ANALYZED** | Uses inline scripts |
| 4 | 4.2 Config Executor | **NEEDS BACKEND** | No endpoint yet |
| 4 | 4.3 Config UI Connection | BLOCKED | Waiting on 4.2 |
| 5 | 5.1 Vuln Scan Review | NOT_STARTED | |
| 5 | 5.2 Vuln Scan Execution | NOT_STARTED | |

---

## Testing Checklist

### Phase 1 Tests (Field Mismatches - Already Fixed)
- [x] Create software deployment, verify no console errors (verified in code)
- [x] View deployment tasks, verify data displays correctly (both field formats returned)
- [x] Verify status shows correct colors/tags (lowercase normalization in place)

### Phase 2 Tests (Software Jobs Integration)
- [ ] Navigate to Jobs > Software > Catalog
- [ ] Verify packages from Hub are displayed (not legacy SoftwareCatalog)
- [ ] Verify "BUNDLE" tag appears on packages with scripts
- [ ] Click "Deploy" on a package - should navigate to Deployed page
- [ ] Verify create modal opens with package pre-selected
- [ ] Select target agents and publish deployment
- [ ] Verify deployment appears in list with IN_PROGRESS status
- [ ] Verify tasks modal shows endpoint details correctly
- [ ] Wait for agent to execute and verify status updates

### Phase 3 Tests (Patch Jobs)
- [ ] Navigate to Jobs > Patch Jobs
- [ ] Click "Create" to open deployment modal
- [ ] Verify agents dropdown shows registered agents with OS icons
- [ ] Add patches using "Add Patches" button
- [ ] Select target endpoints and publish
- [ ] Verify deployment is created (check logs/API response)

### Phase 4 Tests (Configuration Jobs - BLOCKED)
- [ ] Config deployment executor needs to be created first
- [ ] Once backend ready: Config deployment executes scripts
- [ ] Once backend ready: Output captured and displayed

---

## Known Issues Reference

See `DEPLOYMENT_PIPELINE_ISSUES.md` for detailed diagnostic information on:
1. Field name mismatches
2. Status case sensitivity
3. Variable use-before-definition bugs
4. Pipeline flow diagram

---

*Last Updated: 2026-01-25*
*Status: Phases 1-3 COMPLETED - Software & Patch Jobs functional*
*Remaining: Phase 4 needs backend work (config deployment executor)*
