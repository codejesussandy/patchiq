`z# PatchIQ Agent & Platform Implementation Tasks

## Overview
This document tracks the implementation of agent deployment and patch management features.

**Two UIs:**
- **Agent UI** (localhost:8080) - Local detailed view on each endpoint, frequent updates, in-depth monitoring
- **PatchIQ UI** (platform frontend) - Central management console for all agents

---

## Phase 1: Deployment Execution Engine (Backend)

### Task 1.1: Create Agent Command API for Deployments
**Status:** COMPLETED (2026-01-24)
**Priority:** Critical

Create backend service to generate AgentCommands when deployments are created.

**Files to create/modify:**
- `backend/src/modules/deployments/deployment-executor.service.ts` - Core execution logic
- `backend/src/modules/deployments/deployment-executor.types.ts` - Types
- `backend/src/modules/agents/agents.service.ts` - Add createCommand method

**Requirements:**
- [ ] Create `createAgentCommand(agentId, type, payload)` method in agents service
- [ ] Create deployment executor service that:
  - Takes deployment ID and target agents
  - Creates AgentCommand for each target agent
  - Updates deployment task status when command completes
- [ ] Handle batch command creation for multiple agents
- [ ] Support both software_install and patch_install command types

**Test Criteria:**
- Create a deployment via API
- Verify AgentCommand records are created for target agents
- Agent picks up command on next heartbeat
- Command result updates deployment task status

---

### Task 1.2: Software Deployment API
**Status:** COMPLETED (2026-01-24)
**Priority:** Critical

Create/enhance software deployment endpoints that trigger command creation.

**Files to modify:**
- `backend/src/modules/jobs/software-deployment.service.ts`
- `backend/src/modules/jobs/software-deployment.controller.ts`
- `backend/src/modules/jobs/software-deployment.routes.ts`

**Requirements:**
- [ ] POST `/v1/software-deployments` - Create deployment + tasks + commands
- [ ] GET `/v1/software-deployments` - List deployments with status
- [ ] GET `/v1/software-deployments/:id` - Get deployment details with task progress
- [ ] GET `/v1/software-deployments/:id/tasks` - Get individual task status
- [ ] PUT `/v1/software-deployments/:id/cancel` - Cancel pending tasks

**Payload for software deployment:**
```json
{
  "name": "Chrome Install",
  "type": "install",
  "targetAgentIds": ["agent-1", "agent-2"],
  "package": {
    "name": "google-chrome",
    "source": "apt",
    "version": "latest",
    "packageUrl": "https://...",
    "checksum": "sha256:..."
  },
  "retryCount": 3,
  "notifyOnComplete": true
}
```

**Test Criteria:**
- Create deployment via API
- Verify tasks created for each agent
- Verify AgentCommands created
- Test cancellation

---

### Task 1.3: Command Result Handler
**Status:** COMPLETED (2026-01-24)
**Priority:** Critical

Update command result processing to sync back to deployment tasks.

**Files to modify:**
- `backend/src/modules/agents/agents.service.ts` - updateCommandResult method

**Requirements:**
- [ ] When command result is received, find associated deployment task
- [ ] Update SoftwareDeploymentTask or PatchDeploymentTask status
- [ ] Update deployment aggregate counts (pending, succeeded, failed)
- [ ] Store execution output and error messages in task record

**Test Criteria:**
- Agent reports command success → task marked completed
- Agent reports command failure → task marked failed with error
- Deployment counts update correctly

---

## Phase 2: Hub/Package Management

### Task 2.1: Package Model and Storage
**Status:** COMPLETED (2026-01-24)
**Priority:** High

Create model and service for managing software packages in the hub.

**Files to create:**
- `backend/src/modules/hub/hub.service.ts`
- `backend/src/modules/hub/hub.controller.ts`
- `backend/src/modules/hub/hub.routes.ts`
- `backend/src/modules/hub/hub.types.ts`
- Add to Prisma schema: `SoftwarePackage` model

**Prisma Schema Addition:**
```prisma
model SoftwarePackage {
  id              String   @id @default(cuid())
  packageId       String   @unique // e.g., "SWP-001"
  name            String
  displayName     String
  version         String
  vendor          String?
  category        String?  // browser, utility, enterprise, runtime, etc.
  platform        String   // windows, macos, linux, cross-platform
  architecture    String?  // x64, arm64, universal

  // Installation details
  installSource   String   // apt, brew, pkg, dmg, deb, rpm, msi, exe, url
  installCommand  String?  // Custom install command if needed
  installArgs     String?  // Additional arguments
  silentInstall   Boolean  @default(true)
  requiresReboot  Boolean  @default(false)

  // MinIO storage
  minioObjectKey  String?
  minioBucket     String?
  fileName        String?
  fileSize        BigInt?
  checksum        String?
  checksumType    String?  @default("sha256")

  // External URL (if not stored in MinIO)
  downloadUrl     String?

  // Metadata
  description     String?
  releaseNotes    String?
  iconUrl         String?

  // Pre/Post scripts
  preInstallScript   String?
  postInstallScript  String?
  uninstallCommand   String?

  // Rollback support
  supportsRollback   Boolean @default(false)
  rollbackCommand    String?

  // Status
  isActive        Boolean  @default(true)
  isVerified      Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String?

  // Relations
  deployments     SoftwareDeploymentItem[]
  bundleItems     SoftwareBundleItem[]
}
```

**Requirements:**
- [ ] Add SoftwarePackage model to Prisma schema
- [ ] Run migration
- [ ] Create hub service with CRUD operations
- [ ] Upload package file to MinIO
- [ ] Generate presigned URLs for agent download

**Test Criteria:**
- Upload a .deb package via API
- Package stored in MinIO with correct metadata
- Can retrieve presigned download URL

---

### Task 2.2: Hub API Endpoints
**Status:** COMPLETED (2026-01-24)
**Priority:** High

**Endpoints:**
- [ ] POST `/v1/hub/packages` - Upload new package
- [ ] GET `/v1/hub/packages` - List packages (with filters)
- [ ] GET `/v1/hub/packages/:id` - Get package details
- [ ] PUT `/v1/hub/packages/:id` - Update package metadata
- [ ] DELETE `/v1/hub/packages/:id` - Delete package
- [ ] GET `/v1/hub/packages/:id/download-url` - Get presigned download URL

**Test Criteria:**
- Full CRUD operations work
- Upload multipart form data works
- Download URL is valid and accessible

---

### Task 2.3: Hub Management UI (PatchIQ Frontend)
**Status:** PENDING
**Priority:** High

Create hub management page in PatchIQ frontend.

**Files to create/modify:**
- `frontend/src/pages/hub/Hub.tsx` - Main hub page
- `frontend/src/pages/hub/PackageUpload.tsx` - Upload form
- `frontend/src/pages/hub/PackageList.tsx` - Package table
- `frontend/src/services/hubService.ts` - API client

**Requirements:**
- [ ] List all packages with search/filter
- [ ] Upload new package with metadata form
- [ ] Edit package details
- [ ] Delete package (with confirmation)
- [ ] View package details drawer/modal

---

## Phase 3: Frontend API Integration

### Task 3.1: Connect Software Jobs to Real API
**Status:** PENDING
**Priority:** High

Replace mock data in SoftwareJobsDeployed with real API calls.

**Files to modify:**
- `frontend/src/pages/jobs/SoftwareJobsDeployed.tsx`
- `frontend/src/pages/jobs/SoftwareJobsCatalog.tsx`
- `frontend/src/services/softwareJobsService.ts`

**Requirements:**
- [ ] Fetch deployments from `/v1/software-deployments`
- [ ] Fetch catalog from `/v1/hub/packages`
- [ ] Create deployment calls real API
- [ ] Real-time status updates (polling or SSE)
- [ ] Task details modal shows real data

---

### Task 3.2: Agent Selection Component
**Status:** PENDING
**Priority:** Medium

Create reusable agent selection component for deployments.

**Requirements:**
- [ ] Search/filter agents
- [ ] Select by group, OS, or individual
- [ ] Show agent status (online/offline)
- [ ] Bulk selection

---

## Phase 4: Agent UI Enhancements

### Task 4.1: Jobs/Tasks Page for Agent UI
**Status:** COMPLETED (2026-01-24)
**Priority:** High

Add a Jobs page to the Agent UI showing local deployment status.

**Files created/modified:**
- `agent/internal/server/templates/jobs.html` - New Jobs page template
- `agent/internal/server/server.go` - Added `/jobs` route and handler
- `agent/internal/backend/backend.go` - Added job history tracking
- `agent/cmd/agent/main.go` - Added BackendAdapter.GetJobsStatus method
- Updated all templates with Jobs link in navigation

**Requirements:**
- [x] Show pending commands (Active Jobs section)
- [x] Show command history (completed/failed)
- [x] Show current installation progress (with animated progress bars)
- [x] Real-time updates via polling (10s for active jobs, 30s otherwise)
- [x] Detailed job info (ID, type, status, result/error, duration)

**UI Elements:**
- Stats cards (Active, Completed, Failed, Total)
- Active Jobs section with animated progress indicators
- Job history table with type badges and status colors
- Job type legend for reference

---

### Task 4.2: Installation Progress Tracking
**Status:** COMPLETED (2026-01-24)
**Priority:** High

Track and display installation progress in Agent UI.

**Requirements:**
- [x] Track job execution status (in_progress, completed, failed)
- [x] Track installation stages (started, completed timestamps)
- [x] Show job results and error messages
- [x] Store job history locally (last 100 jobs)

---

### Task 4.3: Rollback UI in Agent
**Status:** COMPLETED (2026-01-24)
**Priority:** Medium

Show rollback options in Agent UI.

**Files modified:**
- `agent/internal/server/server.go` - Added rollback routes and handlers
- `agent/internal/server/templates/jobs.html` - Added Rollbacks section
- `agent/internal/backend/backend.go` - Added GetRollbacks, ExecuteRollback methods
- `agent/cmd/agent/main.go` - Added BackendAdapter.GetRollbacks, ExecuteRollback

**Requirements:**
- [x] List installations that support rollback
- [x] One-click rollback button (Downgrade or Uninstall)
- [x] Show rollback info (package, versions, source, date)

---

## Phase 5: Rollback Feature

### Task 5.1: Agent Rollback Executor
**Status:** COMPLETED (2026-01-24)
**Priority:** Medium

Implement rollback functionality in agent.

**Files created/modified:**
- `agent/internal/executors/rollback.go` - Base rollback executor implementation
- `agent/internal/executors/executor.go` - Added RollbackExecutor interface
- `agent/internal/executors/executor_linux.go` - Added rollback executor
- `agent/internal/executors/executor_darwin.go` - Added rollback executor
- `agent/internal/executors/executor_windows.go` - Added rollback executor
- `agent/internal/models/execution.go` - Added RollbackInfo, RollbackRequest types
- `agent/internal/backend/backend.go` - Added rollback_execute, rollback_list commands

**Requirements:**
- [x] Store pre-installation state (version check)
- [x] Store rollback metadata locally (JSON file)
- [x] Implement rollback command execution
- [x] Support package downgrade (reinstall previous version)
- [x] Support uninstall if package wasn't installed before

---

### Task 5.2: Rollback Backend API
**Status:** COMPLETED (2026-01-24)
**Priority:** Medium

**Files created/modified:**
- `backend/src/modules/deployments/deployment.routes.ts` - Added rollback route
- `backend/src/modules/deployments/deployment.controller.ts` - Added triggerRollback method
- `backend/src/modules/deployments/deployment-executor.service.ts` - Added triggerRollback service
- `backend/src/modules/deployments/deployment-executor.types.ts` - Added ROLLBACK_EXECUTE command type

**Requirements:**
- [x] Track rollback availability per deployment task (via commandId link)
- [x] POST `/v1/deployments/software/:id/tasks/:taskId/rollback` - Trigger rollback
- [x] Store rollback history (tracked in agent locally)

---

## Phase 6: Patch Catalog & Deployment

### Task 6.1: Patch Deployment API
**Status:** COMPLETED (Previously implemented)
**Priority:** Medium

Comprehensive Patch API already exists with all required functionality.

**Existing Implementation:**
- `backend/src/modules/patches/patches.routes.ts` - Full CRUD for patches
- `backend/src/modules/patches/patches.controller.ts` - Handlers
- `backend/src/modules/patches/patches.service.ts` - Business logic

**Existing Endpoints:**
- [x] GET/POST `/v1/patches` - List/create patches
- [x] GET/PUT/DELETE `/v1/patches/:id` - CRUD operations
- [x] GET `/v1/patches/:id/affected-softwares` - Related products
- [x] GET `/v1/patches/:id/vulnerabilities` - CVE information
- [x] GET `/v1/patches/:id/endpoints` - Affected endpoints
- [x] POST `/v1/patches/:id/test` - Test workflow
- [x] POST `/v1/patches/:id/approve` - Approval workflow
- [x] GET/POST `/v1/deployments` - Patch deployments
- [x] POST `/v1/deployments/:id/execute` - Execute deployment

---

### Task 6.2: Patch Catalog UI
**Status:** COMPLETED (Previously implemented)
**Priority:** Medium

Browse available patches from whitelist sources.

**Existing Implementation:**
- `frontend/src/pages/patches/AllPatches.tsx` - Main patch catalog
- `frontend/src/pages/patches/PatchDetails.tsx` - Patch details view
- `frontend/src/pages/patches/PatchDeployed.tsx` - Deployed patches
- `frontend/src/pages/patches/PatchTestApprove.tsx` - Test/approve workflow
- `frontend/src/pages/jobs/PatchJobs.tsx` - Patch jobs
- `frontend/src/services/patch.service.ts` - API client

---

## Testing Checklist

### End-to-End Test: Software Installation
- [ ] Upload package to Hub
- [ ] Create deployment targeting 2+ agents
- [ ] Verify agents receive commands
- [ ] Verify agents execute installation
- [ ] Verify results reported back
- [ ] Verify deployment status updates in UI
- [ ] Verify Agent UI shows job progress

### End-to-End Test: Patch Installation
- [ ] Create patch deployment
- [ ] Verify agents receive patch_install command
- [ ] Verify OS package manager updates
- [ ] Verify results reported back

---

## Current Progress

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 1 | 1.1 Agent Command API | **COMPLETED** | 2026-01-24 - Added createCommand, createBatchCommands |
| 1 | 1.2 Software Deployment API | **COMPLETED** | 2026-01-24 - Created deployments module with routes |
| 1 | 1.3 Command Result Handler | **COMPLETED** | 2026-01-24 - Updated updateCommandResult to sync with tasks |
| 2 | 2.1 Package Model | **COMPLETED** | 2026-01-24 - Added SoftwarePackage, HubBundle models |
| 2 | 2.2 Hub API | **COMPLETED** | 2026-01-24 - Created hub module with full CRUD + upload |
| 2 | 2.3 Hub UI | **COMPLETED** | 2026-01-24 - Created Hub.tsx, hub.service.ts |
| 3 | 3.1 Frontend Integration | **COMPLETED** | 2026-01-24 - Connected SoftwareJobsDeployed to APIs |
| 3 | 3.2 Agent Selection | **COMPLETED** | 2026-01-24 - Added agent selection to deployment form |
| 4 | 4.1 Agent Jobs Page | **COMPLETED** | 2026-01-24 - Created jobs.html template, routes, handlers |
| 4 | 4.2 Progress Tracking | **COMPLETED** | 2026-01-24 - Added job history tracking in backend.go |
| 4 | 4.3 Rollback UI | **COMPLETED** | 2026-01-24 - Added rollback section to Jobs page |
| 5 | 5.1 Rollback Executor | **COMPLETED** | 2026-01-24 - Created rollback.go, updated all platforms |
| 5 | 5.2 Rollback API | **COMPLETED** | 2026-01-24 - Added rollback endpoint and service |
| 6 | 6.1 Patch Deployment | **COMPLETED** | Previously implemented - Full patch API exists |
| 6 | 6.2 Patch Catalog UI | **COMPLETED** | Previously implemented - AllPatches.tsx, etc. |

---

## Notes

- Agent UI runs on localhost:8080 (embedded in Go binary)
- PatchIQ UI runs on localhost:5173 (Vite dev server)
- All packages stored in MinIO (hub bucket)
- Whitelist sources already defined in `whitelist-sources.seed.ts`

---

## Phase 7: Frontend Deployment Flow Enhancement

### Task 7.1: Fix Software Jobs Page Routing
**Status:** PENDING
**Priority:** Critical

The Software Jobs page at `/jobs/software-jobs/catalog` shows blank.

**Files to modify:**
- `frontend/src/pages/jobs/SoftwareJobs.tsx`

**Requirements:**
- [ ] Fix nested routing so child components render properly
- [ ] Ensure default redirect to `/catalog` works

---

### Task 7.2: Add Deploy Action to Hub Page
**Status:** PENDING
**Priority:** High

Add ability to deploy software directly from the Hub page with OS-matching.

**Files to modify:**
- `frontend/src/pages/hub/Hub.tsx`

**Requirements:**
- [ ] Add "Deploy" button in package actions column
- [ ] Create deployment modal with target agents selection
- [ ] OS-matching: Filter agents by package platform
  - Linux package → only Linux endpoints
  - Windows package → only Windows endpoints
  - macOS package → only macOS endpoints
  - cross-platform → all endpoints

---

### Task 7.3: Fix Agents API Response Format
**Status:** PENDING
**Priority:** High

**Files to modify:**
- `frontend/src/services/softwareJobs.service.ts`

**Requirements:**
- [ ] Handle API responses (wrapped and unwrapped)
- [ ] Normalize agent OS field for consistent display

---

### Task 7.4: Implement Rollback UI in Frontend
**Status:** PENDING
**Priority:** High

Add rollback functionality to deployment task view.

**Files to modify:**
- `frontend/src/pages/jobs/SoftwareJobsDeployed.tsx`
- `frontend/src/services/softwareJobs.service.ts`

**Requirements:**
- [ ] Add "Rollback" button to failed tasks
- [ ] Call rollback API endpoint
- [ ] Show rollback status

---

### Task 7.5: Deployment Status Auto-Refresh
**Status:** PENDING
**Priority:** Medium

**Files to modify:**
- `frontend/src/pages/jobs/SoftwareJobsDeployed.tsx`

**Requirements:**
- [ ] Poll deployment list every 10s when jobs are IN_PROGRESS
- [ ] Poll task list every 5s in modal
- [ ] Stop polling when complete

---

## Current Progress

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 1 | 1.1 Agent Command API | **COMPLETED** | 2026-01-24 - Added createCommand, createBatchCommands |
| 1 | 1.2 Software Deployment API | **COMPLETED** | 2026-01-24 - Created deployments module with routes |
| 1 | 1.3 Command Result Handler | **COMPLETED** | 2026-01-24 - Updated updateCommandResult to sync with tasks |
| 2 | 2.1 Package Model | **COMPLETED** | 2026-01-24 - Added SoftwarePackage, HubBundle models |
| 2 | 2.2 Hub API | **COMPLETED** | 2026-01-24 - Created hub module with full CRUD + upload |
| 2 | 2.3 Hub UI | **COMPLETED** | 2026-01-24 - Created Hub.tsx, hub.service.ts |
| 3 | 3.1 Frontend Integration | **COMPLETED** | 2026-01-24 - Connected SoftwareJobsDeployed to APIs |
| 3 | 3.2 Agent Selection | **COMPLETED** | 2026-01-24 - Added agent selection to deployment form |
| 4 | 4.1 Agent Jobs Page | **COMPLETED** | 2026-01-24 - Created jobs.html template, routes, handlers |
| 4 | 4.2 Progress Tracking | **COMPLETED** | 2026-01-24 - Added job history tracking in backend.go |
| 4 | 4.3 Rollback UI | **COMPLETED** | 2026-01-24 - Added rollback section to Jobs page |
| 5 | 5.1 Rollback Executor | **COMPLETED** | 2026-01-24 - Created rollback.go, updated all platforms |
| 5 | 5.2 Rollback API | **COMPLETED** | 2026-01-24 - Added rollback endpoint and service |
| 6 | 6.1 Patch Deployment | **COMPLETED** | Previously implemented - Full patch API exists |
| 6 | 6.2 Patch Catalog UI | **COMPLETED** | Previously implemented - AllPatches.tsx, etc. |
| 7 | 7.1 Software Jobs Routing | **COMPLETED** | Vite proxy added for local dev |
| 7 | 7.2 Hub Deploy Action | **COMPLETED** | Deploy from Hub with OS matching |
| 7 | 7.3 Agents API Fix | **COMPLETED** | Handle response format, normalize OS |
| 7 | 7.4 Rollback UI | **COMPLETED** | Frontend rollback functionality |
| 7 | 7.5 Auto-Refresh | **PENDING** | Status polling |

---

## Notes

- Agent UI runs on localhost:8083 (embedded in Go binary)
- PatchIQ UI runs on localhost:5173 (Vite dev server)
- All packages stored in MinIO (hub bucket)
- Whitelist sources already defined in `whitelist-sources.seed.ts`

---

*Last Updated: 2026-01-24*

## Summary

- **Phase 1**: Deployment Execution Engine (Backend) - COMPLETE
- **Phase 2**: Hub/Package Management - COMPLETE
- **Phase 3**: Frontend API Integration - COMPLETE
- **Phase 4**: Agent UI Enhancements (Jobs Page + Rollback UI) - COMPLETE
- **Phase 5**: Rollback Feature (Agent + Backend) - COMPLETE
- **Phase 6**: Patch Catalog & Deployment - COMPLETE (Pre-existing)
- **Phase 7**: Frontend Deployment Flow Enhancement - MOSTLY COMPLETE (7.5 pending)
- **Phase 6**: Patch Catalog & Deployment - COMPLETE (Pre-existing)
