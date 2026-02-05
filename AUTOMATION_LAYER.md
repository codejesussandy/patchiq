# Automation Layer Implementation Plan

> **Goal:** Transform PatchIQ from a manual catalog tool into an automated patch management platform where admins only intervene on exceptions.

---

## Current Reality vs Target

```
CURRENT (Manual)                          TARGET (Automated)
─────────────────                         ──────────────────
Admin creates patch record by hand    →   System auto-syncs vendor catalogs
Admin uploads/downloads patch binary  →   System auto-downloads from sources
Admin types in CVE numbers            →   System auto-correlates CVEs from advisory data
Admin clicks "scan endpoints"(stub)   →   System auto-detects which assets need the patch
Admin creates deployment manually     →   Zero-touch policy auto-creates deployment
Admin clicks "Execute"                →   Scheduler fires at configured time
Admin refreshes page to check status  →   System sends email/notification on completion
Admin manually retries failures       →   Auto-retry with configurable policy
Admin has no rollback option          →   Auto-rollback on failure if configured
```

---

## Infrastructure That Already Exists

| Component | Location | Status |
|-----------|----------|--------|
| BullMQ queue + worker | `patch-repository/download.worker.ts` | Built but **never started** (`startWorker()` not called in server.ts) |
| 80+ pre-configured vendor sources | `patch-repository/whitelist-sources.seed.ts` | Seeded, has URLs/patterns for Microsoft, Apple, Red Hat, Ubuntu, etc. |
| Manual sync trigger | `POST /v1/patch-repository/sync` | Works - discovers patches, queues downloads |
| MinIO storage | `shared/services/minio.service.ts` | Working - stores patch bundles |
| Deployment executor | `deployments/deployment-executor.service.ts` | Working - creates tasks + agent commands |
| Agent command execution | `agent/internal/backend/backend.go` | Working - both legacy (package manager) and hub (script bundles) |
| In-app notifications | `notifications/notifications.service.ts` | Working - DB persistence, frontend reads them |
| Email service (SMTP) | `shared/services/email.service.ts` | Built but **never called** for real notifications |
| SMTP settings storage | `settings/settings.service.ts` | Working - stores encrypted SMTP config |
| Zero-touch config CRUD | `patches/patches.service.ts` | Working - stores rules but **never evaluates them** |
| Cron parser library | `cron-parser@4.9.0` in package.json | Installed, unused |
| CVE database sync | `cve-database.service.ts` | Working - syncs NVD, CISA KEV, EPSS, GitHub |
| Asset-vulnerability matching | `cve-database.service.ts` | Working - CPE-based version range matching |
| Vulnerability-patch linking | `patches.service.ts` | Working - sets `patchAvailable` flag on CVEs |
| Background task pattern | `jobs.service.ts` (vuln jobs) | Working example of non-blocking execution |

---

## The Automated Pipeline (10 Steps)

### Step 1: Vendor Catalog Sync (Auto-Discover Patches)

**What it does:** Periodically pulls new patches from vendor feeds (Microsoft Update Catalog, Ubuntu repos, Red Hat errata, etc.) and creates Patch records automatically.

**Current state:** Manual only. Admin calls `POST /v1/patch-repository/sync` or creates patches by hand.

**What to build:**

```
New: backend/src/modules/automation/scheduler.service.ts
```

- On backend startup, call `startWorker()` from download.worker.ts (currently never called)
- Create a BullMQ repeatable job for each active `PatchSource` based on its `syncSchedule` field
- Default schedule: every 6 hours for high-priority sources, every 24 hours for others
- Each tick calls `patchRepositoryService.triggerSync({ sourceIds: [sourceId] })`
- New patches auto-created from vendor advisory data with CVE numbers pre-populated

**Pages affected:**
| Page | Change |
|------|--------|
| `/settings/patch-management` | Add "Sync Schedule" per source (already has `syncSchedule` field in schema) |
| `/settings/patch-management/distribution-server` | Show sync status, last sync time, next sync time |
| `/patches` (All Patches) | New patches appear automatically with "Auto-synced" badge |

**Database changes:** None - `PatchSource.syncSchedule`, `lastSyncAt`, `lastSyncStatus` fields already exist.

---

### Step 2: Auto-Download Patch Binaries

**What it does:** When a new patch is created (auto or manual), the system automatically downloads the binary from the source URL and stores it in MinIO.

**Current state:** Download worker exists but is never started. Downloads only happen when manually triggered via sync.

**What to build:**

```
Modified: backend/src/server.ts (add startWorker() call)
Modified: backend/src/modules/patches/patches.service.ts (hook into createPatch)
```

- Start the BullMQ download worker on server boot
- When `createPatch()` runs and the patch has a `sourceUrl`:
  - Auto-queue a download job via `queueDownloadJob()`
  - Create `PatchBundle` record with `downloadStatus: "pending"`
- Worker downloads, validates checksum, uploads to MinIO, updates status
- If download fails after 3 retries, mark as `failed` and create notification

**Pages affected:**
| Page | Change |
|------|--------|
| `/patches` (All Patches) | Show download status badge (downloading/completed/failed) per patch |
| `/patches/:id` (Patch Details) | Show bundle download progress, retry button for failures |

**Database changes:** None - `PatchBundle` and `PatchDownloadJob` models already exist with all needed fields.

---

### Step 3: Auto-Correlate CVEs

**What it does:** When a patch is synced from a vendor feed, the system automatically maps it to known CVEs and sets `patchAvailable = true` on matching vulnerabilities.

**Current state:** Partially working. If you manually enter `cveNumbers` when creating a patch, the system calls `updateVulnerabilityPatchStatus()` which links them. But vendor syncs don't always populate CVE numbers.

**What to build:**

```
New: backend/src/modules/automation/cve-correlator.service.ts
Modified: backend/src/modules/patches/patches.service.ts
```

- After patch creation (auto or manual), if `cveNumbers` is empty:
  - Look up the KB number / package name in the NVD database
  - Search `VulnerabilitySoftware` for matching vendor+product
  - Search CVE descriptions for KB number references
  - Auto-populate `cveNumbers` with high-confidence matches
- Trigger existing `updateVulnerabilityPatchStatus()` to set flags and create join records
- Log low-confidence matches for admin review

**Pages affected:**
| Page | Change |
|------|--------|
| `/patches/:id` (Patch Details) | Show "Auto-correlated CVEs" vs "Manually linked CVEs" distinction |
| `/vulnerability/vulnerabilities` | "Patch Available" column updates automatically |
| `/vulnerability/zero-day-vulnerabilities` | Zero-days with new patches get flagged |

**Database changes:** Add `correlationSource` field to `PatchVulnerability` (values: "manual", "auto-vendor", "auto-nvd").

---

### Step 4: Auto-Detect Affected Assets

**What it does:** After a patch is created and correlated with CVEs, the system identifies which assets/endpoints need this patch based on installed software.

**Current state:** `scanEndpoints()` is a stub that returns a fake success message. No actual scanning.

**What to build:**

```
Modified: backend/src/modules/patches/patches.service.ts (replace scanEndpoints stub)
New: backend/src/modules/automation/applicability.service.ts
```

- Replace the `scanEndpoints()` stub with real logic:
  - Query `AssetSoftware` for assets running affected software (by CPE vendor+product)
  - Cross-reference with `AssetVulnerability` for CVE-based matching
  - Check OS compatibility (patch.os vs asset.operatingSystem)
  - Check version ranges (is the installed version within the vulnerable range?)
  - Return list of assets that need this patch, grouped by: missing / installed / not applicable
- Auto-run this after patch creation and after each agent inventory report
- Store results for the deployment preview to use

**Pages affected:**
| Page | Change |
|------|--------|
| `/patches/:id` → Endpoints tab | Shows real data instead of nothing (stub returned fake success) |
| `/patches/:id` → Affected Softwares tab | Cross-references with actual installed counts |
| `/assets/:id` (Asset Details) | "Missing Patches" section shows auto-detected patches |
| `/dashboard` | Widget: "Assets missing critical patches" |

**Database changes:** Repurpose or replace deprecated `PatchEndpoint` model with a new `PatchApplicability` model tracking per-asset patch status (missing/installed/not_applicable/pending).

---

### Step 5: Zero-Touch Rule Evaluation

**What it does:** When a patch is approved (or auto-approved by policy), the system evaluates active zero-touch configs and auto-creates deployments.

**Current state:** `ZeroTouchConfig` CRUD exists. `autoDeploymentRules` JSON field is stored but never evaluated. No execution logic.

**What to build:**

```
New: backend/src/modules/automation/zero-touch.engine.ts
Modified: backend/src/modules/patches/patches.service.ts (hook into approvePatch)
```

- New `ZeroTouchEngine` that runs when:
  1. A patch is approved (`approvePatch()` triggers evaluation)
  2. A new zero-touch config is activated (catches up on existing approved patches)
  3. Scheduler tick (for schedule-based rules: daily/weekly/monthly)
- Evaluation logic:
  - Load all active `ZeroTouchConfig` records
  - For each config, check if the approved patch matches:
    - Severity filter (e.g., CRITICAL + High only)
    - Application type filter (ALL or specific apps)
    - OS/platform filter
  - If matched, resolve target scope (all computers / groups / specific endpoints)
  - Auto-create a `PatchDeployment` with `triggerType: "zero-touch"`
  - If `approvalRequired` in rules → set deployment `stage: "PENDING_APPROVAL"` and notify admin
  - If not → auto-execute immediately

**Pages affected:**
| Page | Change |
|------|--------|
| `/patches/zero-touch` | Add "Last Triggered", "Deployments Created" columns. Show execution history. |
| `/patches/deployed` | Auto-created deployments tagged "Zero-Touch" with link to config |
| Notification dropdown | "Zero-touch deployment created for KB5034441" alerts |

**Database changes:** Add `triggerType` field to `PatchDeployment` (values: "manual", "zero-touch", "scheduled", "policy"). Add `lastTriggeredAt`, `deploymentsCreated` to `ZeroTouchConfig`.

---

### Step 6: Approval Enforcement

**What it does:** Deployments respect the test/approval workflow. Unapproved patches cannot be deployed unless explicitly overridden.

**Current state:** `createDeployment()` doesn't check `approvalStatus`. Any patch can be deployed regardless of test/approval status.

**What to build:**

```
Modified: backend/src/modules/patches/patches.service.ts (createDeployment, executeDeployment)
Modified: backend/src/modules/deployments/deployment-executor.service.ts
```

- In `createDeployment()`: check each patch's `approvalStatus`
  - If any patch is not approved → reject with error listing unapproved patches
  - Add `skipApprovalCheck: boolean` option for admin override (audit logged)
- In zero-touch engine: only process patches with `approvalStatus: "Approved"`
- Auto-approval policy option: patches matching certain criteria (e.g., Critical severity from Microsoft) can be auto-approved after passing test
- Add setting: "Require approval for all deployments" (global toggle)

**Pages affected:**
| Page | Change |
|------|--------|
| `/patches/deployed` → Create Deployment modal | Warning if selecting unapproved patches, override checkbox |
| `/patches` (All Patches) → Deploy button | Disabled/warning for unapproved patches |
| `/settings/patch-management/patch-preferences` | "Require patch approval before deployment" toggle |
| `/settings/patch-management/patch-preferences` | "Auto-approve criteria" configuration |

**Database changes:** Add `autoApprovalRules` JSON to settings. Add `skipApprovalCheck` + `approvalOverrideBy` to `PatchDeployment`.

---

### Step 7: Scheduled Deployment Execution

**What it does:** Deployments with a `scheduledAt` time automatically execute when the time arrives.

**Current state:** `scheduledAt` field exists on `PatchDeployment`. Stage is set to "PENDING" if scheduled. But no scheduler picks it up - admin must manually click Execute.

**What to build:**

```
Modified: backend/src/modules/automation/scheduler.service.ts (add deployment schedule check)
```

- Add a BullMQ repeatable job (every 60 seconds) that:
  - Queries `PatchDeployment` where `stage = "PENDING"` and `scheduledAt <= now()`
  - For each, calls `executeDeployment(deploymentId)`
  - Updates stage to IN_PROGRESS
  - Creates notification: "Scheduled deployment {name} has started"
- Same pattern for `PatchJob` records with `type: "SCHEDULE"` and `scheduledAt <= now()`

**Pages affected:**
| Page | Change |
|------|--------|
| `/patches/deployed` | "Scheduled" badge with countdown timer. "Starts in 2h 15m" |
| `/patches/patch-jobs` | Show next execution time for scheduled jobs |
| Notification dropdown | "Scheduled deployment started" alerts |

**Database changes:** None - fields already exist.

---

### Step 8: Auto-Retry and Rollback

**What it does:** Failed deployment tasks auto-retry up to the configured count. If all retries fail, auto-rollback if configured.

**Current state:** `retryCount` field exists on deployments. `rollbackAvailable` field exists on tasks. Agent creates rollback snapshots. But no retry or rollback logic runs.

**What to build:**

```
Modified: backend/src/modules/deployments/deployment-executor.service.ts (processCommandResult)
```

- When `processCommandResult()` receives a failure:
  - Check `deployment.retryCount` vs `task.retryAttempt`
  - If retries remaining → create new `AgentCommand` with same payload, increment attempt count
  - If all retries exhausted and `deployment.autoRollback === true`:
    - Create rollback `AgentCommand` (type: `HUB_PATCH_ROLLBACK` or `PATCH_ROLLBACK`)
    - Update task status to `rolling_back`
    - Agent receives rollback command → executes rollback script → reports result
  - If all retries exhausted and no auto-rollback → mark as failed, notify admin

**Pages affected:**
| Page | Change |
|------|--------|
| `/patches/deployed` → Tasks modal | Show retry attempt count, rollback status |
| `/patches/deployed` → Create Deployment | "Auto-rollback on failure" toggle, retry count config |
| `/patches/:id` (Patch Details) | Manual "Rollback" button for deployed patches |

**Database changes:** Add `retryAttempt` to `PatchDeploymentTask`. Add `autoRollback` to `PatchDeployment`.

---

### Step 9: Email Notifications

**What it does:** Sends email alerts for critical events instead of only in-app notifications.

**Current state:** `emailService` exists with SMTP support. `notificationsService` creates DB records. They're never connected.

**What to build:**

```
Modified: backend/src/modules/notifications/notifications.service.ts
New: backend/src/modules/notifications/notification-templates/
```

- Extend `notificationsService.create()` to optionally send email:
  - Check user's notification preferences (new settings)
  - If email enabled for this event type → call `emailService.send()`
- Email triggers:
  - New critical vulnerability detected (with patch recommendation)
  - Patch download completed/failed
  - Deployment started (scheduled/zero-touch)
  - Deployment completed (success/partial/failed summary)
  - Deployment requires approval (zero-touch with approval gate)
  - Rollback triggered
- HTML email templates for each event type
- Digest option: batch non-critical notifications into daily summary

**Pages affected:**
| Page | Change |
|------|--------|
| `/settings/system-settings/mail-server` | Already exists - test email works |
| `/settings/policy-management` | Configure which events trigger email notifications |
| User profile (new) | Per-user email notification preferences |

**Database changes:** Add `emailNotifications` JSON to user preferences. Add `NotificationPreference` model or settings keys.

---

### Step 10: Dashboard Automation Visibility

**What it does:** Dashboard shows the health of the automated pipeline so the admin knows when to intervene.

**Current state:** Dashboard exists with charts but doesn't reflect automation status.

**What to build:**

```
Modified: backend/src/modules/dashboard/dashboard.service.ts
Modified: frontend/src/pages/dashboard/Dashboard.tsx
```

- New dashboard widgets:
  - **Sync Status:** Last sync per vendor, next scheduled sync, failed syncs
  - **Download Queue:** Active downloads, failed downloads needing attention
  - **Patch Coverage:** % of critical CVEs with patches available, % of assets patched
  - **Zero-Touch Activity:** Auto-deployments created today/week, success rate
  - **Pending Approvals:** Patches awaiting test/approval, deployments awaiting approval
  - **Failed Deployments:** Tasks that failed all retries, needing manual intervention
  - **Automation Health:** Is scheduler running? Is download worker running? Last heartbeat

**Pages affected:**
| Page | Change |
|------|--------|
| `/dashboard` | New widgets showing automation pipeline health |
| `/reports` | New report type: "Automation Summary" |

---

## Implementation Order

```
Phase 1: Foundation (Enable existing infrastructure)
├── Step 1: Start download worker on boot
├── Step 2: Auto-download on patch creation
└── Step 7: Scheduled deployment execution
    (These are nearly zero-code - just wire up what exists)

Phase 2: Core Automation
├── Step 1: Vendor catalog auto-sync (scheduler)
├── Step 4: Asset applicability detection (replace stub)
└── Step 6: Approval enforcement
    (Moderate effort - new services, modify existing flows)

Phase 3: Intelligence
├── Step 3: CVE auto-correlation
├── Step 5: Zero-touch rule evaluation engine
└── Step 8: Auto-retry and rollback
    (Significant effort - new engine, complex logic)

Phase 4: Communication
├── Step 9: Email notifications
└── Step 10: Dashboard automation visibility
    (UI + notification infrastructure)
```

---

## New Files to Create

```
backend/src/modules/automation/
├── automation.module.ts              # Module registration
├── scheduler.service.ts              # BullMQ repeatable jobs manager
├── zero-touch.engine.ts              # Rule evaluation + auto-deployment
├── applicability.service.ts          # Which assets need which patches
├── cve-correlator.service.ts         # Auto-map patches to CVEs
└── automation.types.ts               # Shared types for automation

backend/src/modules/notifications/
└── templates/
    ├── deployment-started.html       # Email template
    ├── deployment-completed.html
    ├── deployment-failed.html
    ├── patch-available.html
    ├── approval-required.html
    └── daily-digest.html
```

## Existing Files to Modify

```
backend/src/server.ts                               # Start worker + scheduler on boot
backend/src/modules/patches/patches.service.ts       # Hook auto-download, approval enforcement, zero-touch triggers
backend/src/modules/deployments/deployment-executor.service.ts  # Auto-retry, rollback, scheduled execution
backend/src/modules/notifications/notifications.service.ts      # Email integration
backend/src/modules/dashboard/dashboard.service.ts              # Automation health widgets
frontend/src/pages/dashboard/Dashboard.tsx                      # New widgets
frontend/src/pages/patches/AllPatches.tsx                       # Download status, approval warnings
frontend/src/pages/patches/PatchDetails.tsx                     # Rollback button, auto-correlation display
frontend/src/pages/patches/PatchDeployed.tsx                    # Scheduled countdown, zero-touch tags, retry display
frontend/src/pages/patches/ZeroTouchDeployment.tsx              # Execution history, trigger status
frontend/src/pages/patches/PatchTestApprove.tsx                 # Auto-approval rules
```

## Schema Changes Summary

```prisma
// New fields on existing models:

model PatchVulnerability {
  correlationSource  String?   // "manual" | "auto-vendor" | "auto-nvd"
}

model PatchDeployment {
  triggerType         String?   // "manual" | "zero-touch" | "scheduled" | "policy"
  autoRollback        Boolean   @default(false)
  skipApprovalCheck   Boolean   @default(false)
  approvalOverrideBy  String?
}

model PatchDeploymentTask {
  retryAttempt  Int  @default(0)
}

model ZeroTouchConfig {
  lastTriggeredAt    DateTime?
  deploymentsCreated Int        @default(0)
}

// New model (replaces deprecated PatchEndpoint):
model PatchApplicability {
  id        String   @id @default(uuid())
  patchId   String
  assetId   String
  status    String   // "missing" | "installed" | "not_applicable" | "pending" | "failed"
  detectedAt DateTime @default(now())
  installedAt DateTime?
  patch     Patch    @relation(fields: [patchId], references: [id])
  asset     Asset    @relation(fields: [assetId], references: [id])
  @@unique([patchId, assetId])
}
```

---

## End-State User Flow

```
Admin's morning:

1. Opens Dashboard
   → Sees: "12 new patches synced overnight from Microsoft, Ubuntu, Chrome"
   → Sees: "8 auto-deployed via zero-touch (all succeeded)"
   → Sees: "2 critical patches awaiting approval"
   → Sees: "1 deployment failed, auto-rollback completed"

2. Clicks "2 patches awaiting approval"
   → Reviews test results (auto-deployed to test group by zero-touch)
   → Approves both → zero-touch auto-creates production deployment

3. Clicks "1 failed deployment"
   → Sees it was a script error on 3 endpoints
   → Checks rollback completed successfully
   → Fixes the script, re-deploys manually to those 3 endpoints

4. Done. Gets email summary at EOD.

Total admin time: 10 minutes instead of 2 hours.
```
