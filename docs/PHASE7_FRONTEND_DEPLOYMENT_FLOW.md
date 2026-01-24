# Phase 7: Frontend Deployment Flow

## Overview
This phase implements a complete, user-friendly deployment flow in the PatchIQ frontend, enabling users to:
1. Browse software packages in the Hub
2. Deploy software to compatible endpoints (OS-matching)
3. Monitor deployment progress
4. Trigger rollbacks for failed deployments
5. Deploy patches to endpoints

## Current Issues
- `/jobs/software-jobs/` page is blank (routing issue)
- No "Deploy" button in Hub page
- No OS-matching logic for deployments
- No rollback UI in frontend
- Agents list returns wrong data format

---

## Task 7.1: Fix Software Jobs Page Routing
**Status:** PENDING
**Priority:** Critical

The Software Jobs page at `/jobs/software-jobs/catalog` shows blank because the child routes aren't rendering.

**Files to modify:**
- `frontend/src/pages/jobs/SoftwareJobs.tsx`

**Requirements:**
- [ ] Fix nested routing so child components render properly
- [ ] Ensure default redirect to `/catalog` works

---

## Task 7.2: Add Deploy Action to Hub Page
**Status:** PENDING
**Priority:** High

Add ability to deploy software directly from the Hub page.

**Files to modify:**
- `frontend/src/pages/hub/Hub.tsx`

**Requirements:**
- [ ] Add "Deploy" button in package actions column
- [ ] Create deployment modal with:
  - Package info display
  - Target agents selection (filtered by OS)
  - Deployment type (install/upgrade)
- [ ] OS-matching: Only show compatible endpoints
  - Linux package → only Linux endpoints
  - Windows package → only Windows endpoints
  - macOS package → only macOS endpoints
  - cross-platform → all endpoints

---

## Task 7.3: Fix Agents API Response Format
**Status:** PENDING
**Priority:** High

The agents API returns data without the `data` wrapper, causing frontend issues.

**Files to modify:**
- `frontend/src/services/softwareJobs.service.ts`
- `frontend/src/services/agent.service.ts`

**Requirements:**
- [ ] Handle both wrapped and unwrapped API responses
- [ ] Normalize agent OS field (Linux, darwin, windows → consistent format)

---

## Task 7.4: Implement Rollback UI
**Status:** PENDING
**Priority:** High

Add rollback functionality to deployment task view.

**Files to modify:**
- `frontend/src/pages/jobs/SoftwareJobsDeployed.tsx`
- `frontend/src/services/softwareJobs.service.ts`

**Requirements:**
- [ ] Add "Rollback" button to failed tasks in tasks modal
- [ ] Create rollback confirmation dialog
- [ ] Call rollback API endpoint
- [ ] Show rollback status in task list
- [ ] Refresh task list after rollback

---

## Task 7.5: Enhance Deployment Creation with OS Matching
**Status:** PENDING
**Priority:** High

Ensure deployments only target compatible endpoints.

**Files to modify:**
- `frontend/src/pages/jobs/SoftwareJobsDeployed.tsx`
- `frontend/src/pages/hub/Hub.tsx`

**Requirements:**
- [ ] When selecting a package, filter available agents by OS
- [ ] Show warning if user selects incompatible agent
- [ ] Add OS badge to agent selection dropdown
- [ ] Validate on submit that all targets are compatible

---

## Task 7.6: Add Deployment Status Polling
**Status:** PENDING
**Priority:** Medium

Auto-refresh deployment status while jobs are in progress.

**Files to modify:**
- `frontend/src/pages/jobs/SoftwareJobsDeployed.tsx`

**Requirements:**
- [ ] Poll deployment list every 10 seconds when any deployment is IN_PROGRESS
- [ ] Poll task list in modal every 5 seconds
- [ ] Show "Last updated" timestamp
- [ ] Stop polling when all deployments complete

---

## Expected User Flow

### Flow 1: Deploy from Hub
```
1. User navigates to /hub
2. User browses/searches for a package
3. User clicks "Deploy" button on package row
4. Modal opens with:
   - Package details (name, version, platform, source)
   - Target agents dropdown (filtered by OS)
   - Deployment name field
5. User selects target agents
6. User clicks "Deploy"
7. Success message with link to deployment status
8. User can view status in /jobs/software-jobs/deployed
```

### Flow 2: Deploy from Software Jobs
```
1. User navigates to /jobs/software-jobs/deployed
2. User clicks "Create" button
3. Modal opens with full deployment form
4. User selects package from Hub
5. User selects target agents (OS-filtered based on package)
6. User configures options
7. User clicks "Publish"
8. Deployment created and shown in table
```

### Flow 3: Rollback Failed Deployment
```
1. User views deployment in /jobs/software-jobs/deployed
2. User clicks eye icon to view tasks
3. User sees failed task with error message
4. User clicks "Rollback" button on failed task
5. Confirmation dialog appears
6. User confirms rollback
7. Rollback command sent to agent
8. Task status updates to show rollback in progress
```

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/hub/packages` | GET | List packages for selection |
| `/v1/agents` | GET | List agents for target selection |
| `/v1/deployments/software` | GET | List deployments |
| `/v1/deployments/software` | POST | Create deployment |
| `/v1/deployments/software/:id` | GET | Get deployment with tasks |
| `/v1/deployments/software/:id/tasks/:taskId/rollback` | POST | Trigger rollback |

---

## Testing Checklist

### Deployment Creation
- [ ] Can create deployment from Hub page
- [ ] Can create deployment from Software Jobs page
- [ ] OS filtering works (Linux package shows only Linux agents)
- [ ] Deployment appears in list after creation

### Deployment Monitoring
- [ ] Deployment list shows correct status
- [ ] Task list shows individual agent status
- [ ] Error messages display properly
- [ ] Auto-refresh updates status

### Rollback
- [ ] Rollback button appears on failed tasks
- [ ] Confirmation dialog works
- [ ] Rollback command is sent
- [ ] Task status updates after rollback

---

*Created: 2026-01-24*
