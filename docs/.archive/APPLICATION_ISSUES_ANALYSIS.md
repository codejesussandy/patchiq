# PatchIQ Application Issues Analysis

**Generated:** 2026-02-04
**Status:** Pending Resolution

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [Backend Stub Services](#2-backend-stub-services)
3. [Frontend Issues](#3-frontend-issues)
4. [Database Schema Issues](#4-database-schema-issues)
5. [Console/Runtime Issues](#5-consoleruntime-issues)
6. [Go Agent Issues](#6-go-agent-issues)
7. [API Routing Issues](#7-api-routing-issues)
8. [TODO/FIXME Inventory](#8-todofixme-inventory)

---

## 1. Critical Issues

### 1.1 API Routing: Orphaned Deployment Routes

**Files:**
- `backend/src/app.ts` (lines 15, 158)
- `backend/src/modules/deployments/deployment.routes.ts` (ORPHANED)
- `backend/src/modules/patches/patches.routes.ts` (lines 178-277)

**Problem:** The `deployment.routes.ts` file exists but is never registered in `app.ts`. Deployment routes are actually served from `patches.routes.ts`, creating architectural confusion and duplicated code.

**Impact:** Confusing codebase, potential for bugs when developers modify the wrong file.

---

### 1.2 Route Conflict: `/patches/jobs` Returns 400

**File:** `backend/src/modules/patches/patches.routes.ts`

**Problem:** Express route `/v1/patches/:id` is defined before `/v1/patches/jobs`, causing "jobs" to be interpreted as a patch ID.

**Error:** `ValidationError: Invalid patch ID`

**Impact:** Patch Jobs page is completely broken.

---

### 1.3 Go Agent: Linux Uses Darwin Collectors

**File:** `agent/internal/collectors/collector_linux.go:6-16`

**Problem:**
```go
// TODO: Implement Linux-specific collectors
func NewCollectorManager() *CollectorManager {
    return &CollectorManager{
        hardware:        NewDarwinHardwareCollector(),      // WRONG
        software:        NewDarwinSoftwareCollector(),      // WRONG
        network:         NewDarwinNetworkCollector(),       // WRONG
        security:        NewDarwinSecurityCollector(),      // WRONG
        peripherals:     NewDarwinPeripheralCollector(),    // WRONG
        telemetry:       NewDarwinTelemetryCollector(),     // WRONG
        powerManagement: NewDarwinPowerCollector(),         // WRONG
    }
}
```

**Impact:** Agent will fail on all Linux systems - tries to use macOS-specific tools like `system_profiler`.

---

### 1.4 Missing File: executor_darwin.go

**Location:** `agent/internal/executors/`

**Problem:** Only `executor_linux.go` and `executor_windows.go` exist. No macOS executor.

**Impact:** macOS agent builds will fail at compile time.

---

## 2. Backend Stub Services

### Summary Table

| Module | File | Line | Stub Description | Functional % |
|--------|------|------|------------------|--------------|
| Discovery | discovery.service.ts | 223 | Network scan job not queued | 60% |
| Discovery | discovery.service.ts | 483 | Credential testing returns mock | 60% |
| Settings | settings.service.ts | 250 | LDAP connection test | 75% |
| Settings | settings.service.ts | 415 | Proxy server test | 75% |
| Settings | settings.service.ts | 467 | Mail server test | 75% |
| Settings | settings.service.ts | 631 | CVE database sync | 75% |
| Settings | settings.service.ts | 694 | License validation | 75% |
| Users | users.service.ts | 303 | Invitation email | 85% |
| Users | users.service.ts | 394 | Password reset email | 85% |
| Reports | reports.controller.ts | 159 | Email sending | 70% |
| Auth | auth.service.ts | 217 | Password reset email | 95% |
| Deployments | deployment-executor.service.ts | 264 | Retry logic | 95% |
| Jobs | jobs.service.ts | 391 | NVD sync job | 98% |

### Detailed Stub Descriptions

#### 2.1 Discovery Module (60% Functional)

**Network Scan Job** (`discovery.service.ts:223`)
```typescript
// TODO: Queue the actual network scan job
// Currently: Creates scan record but doesn't execute ICMP ping sweep,
// port scanning, or device discovery
```

**Credential Testing** (`discovery.service.ts:483`)
```typescript
// TODO: Actually test the credential against targetHost
// Currently: Returns hardcoded { success: true, message: 'Connection successful' }
// Should: Decrypt password and test SSH/WMI/SNMP based on credential type
```

#### 2.2 Settings Module (75% Functional)

**LDAP Test** (`settings.service.ts:250`)
```typescript
// TODO: Implement actual LDAP connection test
// Currently: Decrypts credentials but doesn't attempt connection
// Should: Use ldapjs to bind and search
```

**Proxy Test** (`settings.service.ts:415`)
```typescript
// TODO: Implement actual proxy test
// Currently: Logs parameters, returns hardcoded success
// Should: Make HTTP request through proxy to verify connectivity
```

**Mail Server Test** (`settings.service.ts:467`)
```typescript
// TODO: Implement actual mail server test
// Currently: Logs host:port, returns success
// Should: Use nodemailer to verify SMTP connection
```

**CVE Database Sync** (`settings.service.ts:631`)
```typescript
// TODO: Trigger actual CVE database sync job
// Currently: Only updates lastSync timestamp
// Should: Queue BullMQ job to fetch from NVD API
```

**License Validation** (`settings.service.ts:694`)
```typescript
// TODO: Validate license code with license server
// Currently: Returns hardcoded Enterprise license with 365-day expiration
// Should: Call license server API to validate
```

#### 2.3 Users Module (85% Functional)

**Invitation Email** (`users.service.ts:303`)
```typescript
// TODO: Send invitation email
// Currently: Creates user/token, logs to console
// Should: Send email via nodemailer with invitation link
```

**Password Reset Email** (`users.service.ts:394`)
```typescript
// TODO: Send password reset email
// Currently: Creates reset token, logs to console
// Should: Send email via nodemailer with reset link
```

#### 2.4 Reports Module (70% Functional)

**Email Sending** (`reports.controller.ts:159`)
```typescript
// TODO: Implement actual email sending with nodemailer
// Currently: console.log('[MOCK] Sending report...'), returns mock success
// Should: Use nodemailer to send report as attachment
```

---

## 3. Frontend Issues

### 3.1 Pages with Simulated API Calls

| File | Line | Issue |
|------|------|-------|
| `pages/jobs/VulnerabilityJobsDBSync.tsx` | 34 | `handleSyncNow()` uses `setTimeout(resolve, 2000)` |
| `pages/jobs/VulnerabilityJobsDBSync.tsx` | 59 | `handleSave()` uses `setTimeout(resolve, 1000)` |
| `pages/jobs/ConfigurationJobsBundle.tsx` | 344 | `handleRefresh()` simulates API call |

### 3.2 Pages with Hardcoded Mock Data

| File | Line | Data |
|------|------|------|
| `pages/jobs/ConfigurationJobsBundle.tsx` | 57-88 | `mockBundleItems` array |
| `pages/jobs/ConfigurationJobsBundle.tsx` | 91 | `mockConfigurations` array |
| `components/chat/AIChatPanel.tsx` | 9, 98 | Imports and uses `getMockResponse()` |

### 3.3 Incomplete Implementations

| File | Line | Issue |
|------|------|-------|
| `pages/jobs/PatchJobs.tsx` | 136 | `handleEdit()` shows message instead of opening modal |
| `pages/jobs/PatchJobs.tsx` | 284-287 | Filter menu has placeholder options |
| `pages/jobs/PatchJobs.tsx` | 459 | "Save As Draft" button non-functional |
| `pages/discovery/Agents.tsx` | 104 | Download agent just opens URL |
| `pages/jobs/SoftwareJobs.tsx` | 24,27,30 | Routes point to wrong paths |

### 3.4 Service Conflicts

**Problem:** Two services handle software jobs:
- `jobsService` calls `/jobs/software/*` endpoints
- `softwareJobsService` calls `/deployments/software/*` endpoints

**Files:**
- `frontend/src/services/jobs.service.ts` (lines 308-370)
- `frontend/src/services/softwareJobs.service.ts` (lines 76, 81, 86)

### 3.5 Missing Error Handling

| File | Line | Issue |
|------|------|-------|
| `pages/jobs/ConfigurationJobsDeployed.tsx` | 96 | Error logged but user not notified |
| `pages/jobs/SoftwareJobsDeployed.tsx` | 274, 284, 301 | Same pattern |

---

## 4. Database Schema Issues

### 4.1 Unused/Poorly-Structured Models

| Model | Lines | Issues |
|-------|-------|--------|
| `PatchTest` | 1061-1076 | Not used anywhere, no relations, string arrays |
| `ZeroTouchConfig` | 1078-1094 | Not used anywhere, no relations, string arrays |
| `PatchJob` | 1383-1408 | String arrays instead of relations |
| `VulnerabilityJob` | 1410-1432 | String dates instead of DateTime |
| `SoftwareCatalog` | 1560-1585 | Duplicates SoftwarePackage model |
| `ComputerGroup` | 1767-1778 | String array for endpoints |

### 4.2 Anti-Patterns Found

**String Arrays Instead of Relations:**
- `PatchJob.endpoints: String[]` - Should be relation to Agent/Asset
- `PatchJob.patches: String[]` - Should be relation to Patch
- `VulnerabilityJob.endpoints: String[]` - Should be relation to Agent/Asset
- `ComputerGroup.endpoints: String[]` - Should be relation to Agent/Asset
- `PatchTest.computers: String[]`, `groups: String[]`
- `ZeroTouchConfig.computers: String[]`, `groups: String[]`

**Missing Enums (Using Strings):**
- `Agent.status` (line 168) - Should be enum
- `AgentCommand.type` (line 200) - Should be enum
- `Asset.type` (line 302) - Should be enum
- `AssetVulnerability.status` (line 623) - Should be enum
- `PatchDeployment.type` (line 848) - Should be enum
- `PatchDownloadJob.status` (line 1014) - Should be enum

**Missing User Relations:**
- 8+ models have `createdBy String?` without relation to User model

**Missing Cascade Deletes:**
- `IPRange.credential` (line 1106) - No onDelete specified
- `PatchDeploymentTask.asset` (line 892) - No onDelete specified

### 4.3 Data Type Issues

| Model | Field | Current | Should Be |
|-------|-------|---------|-----------|
| `OSLicense` | `cost` | `String?` | `Decimal` |
| `VulnerabilityJob` | `scheduleDate` | `String?` | `DateTime` |
| `VulnerabilityJob` | `scheduleTime` | `String?` | `DateTime` |
| `VulnerabilityJob` | `scheduledTime` | `String?` | `DateTime` |

---

## 5. Console/Runtime Issues

### 5.1 Critical Console Errors

| Issue | Location | Error |
|-------|----------|-------|
| Route conflict | `/patches/jobs` | `ValidationError: Invalid patch ID` |
| Missing routes | `/vulnerability/exceptions` | `No routes matched location` |
| Missing routes | `/vulnerability/jobs` | `No routes matched location` |
| Missing routes | `/vulnerability/all` | `No routes matched location` |
| Asset loading | `ZeroDayVulnerabilities.tsx:107` | `Failed to load assets: [object Object]` |

### 5.2 React/Ant Design Warnings

| Warning | Location | Fix |
|---------|----------|-----|
| `useForm not connected` | Patches, Add Asset Modal | Pass `form` prop to `<Form>` |
| `destroyOnClose deprecated` | Reports page | Use `destroyOnHidden` |
| `addonAfter deprecated` | Add Asset Modal | Use `Space.Compact` |
| `Missing id/name attributes` | Global | Add `id` or `name` to inputs |
| `Incorrect label for` | Add Asset Modal | Match `htmlFor` to input `id` |

---

## 6. Go Agent Issues

### 6.1 Platform Collector Mismatch

**File:** `agent/internal/collectors/collector_linux.go:6-16`

**Problem:** Linux build references Darwin collectors.

**Impact:** Complete failure on Linux systems.

**Required Fix:** Create Linux-specific collector implementations.

### 6.2 Missing Darwin Executor

**Location:** `agent/internal/executors/`

**Problem:** No `executor_darwin.go` file.

**Impact:** macOS builds fail at compile time.

### 6.3 Script Timeout Not Implemented

**File:** `agent/internal/executors/script_executor.go:490-494`

```go
if timeoutSec > 0 {
    // Note: In a real implementation, you'd use context.WithTimeout
    // For simplicity, we'll trust the script to complete in reasonable time
}
```

**Impact:** Scripts can run indefinitely, potentially hanging the agent.

### 6.4 Hardcoded PendingReboot

**File:** `agent/internal/backend/backend.go:269`

```go
req := &client.HeartbeatRequest{
    // ...
    PendingReboot: false,  // Always false - not detected!
}
```

**Impact:** Backend never knows when reboot is needed after patch installation.

### 6.5 License Key Masking

**Files:**
- `agent/internal/collectors/software.go:423`
- `agent/internal/collectors/software_windows.go:534, 599`

**Problem:** License keys always returned as `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`

**Impact:** License compliance reporting is limited.

---

## 7. API Routing Issues

### 7.1 Orphaned Routes File

**File:** `backend/src/modules/deployments/deployment.routes.ts`

**Status:** Never imported or registered in `app.ts`

**Current State:** Deployment routes are served from `patches.routes.ts` lines 178-277

### 7.2 Missing Endpoints

| Frontend Expects | Backend Status |
|-----------------|----------------|
| `GET /jobs/config/deployed/:id` | Missing |
| `PUT /jobs/software/deployed/:id` | Missing |
| `PATCH /jobs/software/deployed/:id` | Missing |

### 7.3 Orphaned Backend Endpoints

These endpoints exist but frontend doesn't use them:

| Endpoint | Module |
|----------|--------|
| `GET /vulnerabilities/cpe-stats` | Vulnerabilities |
| `GET /vulnerabilities/unmatched-software` | Vulnerabilities |
| `PUT /vulnerabilities/unmatched-software/:id/resolve` | Vulnerabilities |
| `POST /vulnerabilities/scan` | Vulnerabilities |
| `GET /jobs/vulnerability/db-sync` | Jobs |
| `PUT /jobs/vulnerability/db-sync` | Jobs |
| `POST /jobs/vulnerability/db-sync/now` | Jobs |

---

## 8. TODO/FIXME Inventory

### 8.1 Backend TODOs (15 total)

| File | Line | TODO |
|------|------|------|
| `auth.service.ts` | 217 | Send email with reset link |
| `discovery.service.ts` | 223 | Queue the actual network scan job |
| `discovery.service.ts` | 483 | Actually test the credential against targetHost |
| `settings.service.ts` | 250 | Implement actual LDAP connection test |
| `settings.service.ts` | 415 | Implement actual proxy test |
| `settings.service.ts` | 467 | Implement actual mail server test |
| `settings.service.ts` | 631 | Trigger actual CVE database sync job |
| `settings.service.ts` | 694 | Validate license code with license server |
| `organizations.service.ts` | 422 | Compute from assets |
| `deployment-executor.service.ts` | 264 | Implement retry logic |
| `jobs.service.ts` | 391 | Queue actual NIST NVD sync job |
| `users.service.ts` | 303 | Send invitation email |
| `users.service.ts` | 394 | Send password reset email |
| `reports.controller.ts` | 159 | Implement actual email sending with nodemailer |

### 8.2 Agent TODOs (1 critical)

| File | Line | TODO |
|------|------|------|
| `collector_linux.go` | 6 | Implement Linux-specific collectors |

### 8.3 "Not Implemented" Responses

| File | Line | Feature |
|------|------|---------|
| `assets.controller.ts` | 451-452 | Asset attachment upload |
| `assets.controller.ts` | 491-492 | Software inventory import |
| `assets.controller.ts` | 552-553 | Software license import |
| `assets.controller.ts` | 613-614 | OS license import |
| `vulnerabilities.service.ts` | 509 | Network assets |

---

## Priority Matrix

### P0 - Blocks Core Functionality
1. Fix route ordering `/patches/jobs` vs `/patches/:id`
2. Add missing vulnerability routes in frontend
3. Fix Linux collector platform mismatch
4. Create `executor_darwin.go`

### P1 - User-Facing Features Broken
5. Implement email sending service
6. Replace mock data in ConfigurationJobsBundle
7. Wire up VulnerabilityJobsDBSync to real API
8. Fix loadAssets error in vulnerability pages

### P2 - Quality/Architecture
9. Consolidate deployment routes
10. Fix useForm warnings
11. Resolve service conflicts
12. Add missing API endpoints

### P3 - Polish
13. Replace deprecated Ant Design props
14. Add form field accessibility attributes
15. Clean up console.error statements
16. Fix database schema anti-patterns

---

## Appendix: Files Reference

### Backend Files with Issues
```
backend/src/app.ts
backend/src/modules/auth/auth.service.ts
backend/src/modules/deployments/deployment.routes.ts (ORPHANED)
backend/src/modules/deployments/deployment-executor.service.ts
backend/src/modules/discovery/discovery.service.ts
backend/src/modules/jobs/jobs.service.ts
backend/src/modules/patches/patches.routes.ts
backend/src/modules/reports/reports.controller.ts
backend/src/modules/settings/settings.service.ts
backend/src/modules/settings/users.service.ts
backend/src/modules/settings/organizations.service.ts
backend/src/modules/vulnerabilities/vulnerabilities.service.ts
backend/src/modules/assets/assets.controller.ts
backend/src/db/prisma/schema.prisma
```

### Frontend Files with Issues
```
frontend/src/pages/jobs/VulnerabilityJobsDBSync.tsx
frontend/src/pages/jobs/ConfigurationJobsBundle.tsx
frontend/src/pages/jobs/PatchJobs.tsx
frontend/src/pages/jobs/SoftwareJobs.tsx
frontend/src/pages/jobs/ConfigurationJobsDeployed.tsx
frontend/src/pages/jobs/SoftwareJobsDeployed.tsx
frontend/src/pages/discovery/Agents.tsx
frontend/src/pages/vulnerability/ZeroDayVulnerabilities.tsx
frontend/src/components/chat/AIChatPanel.tsx
frontend/src/services/jobs.service.ts
frontend/src/services/softwareJobs.service.ts
```

### Agent Files with Issues
```
agent/internal/collectors/collector_linux.go
agent/internal/executors/script_executor.go
agent/internal/executors/executor_darwin.go (MISSING)
agent/internal/backend/backend.go
agent/internal/collectors/software.go
agent/internal/collectors/software_windows.go
```
