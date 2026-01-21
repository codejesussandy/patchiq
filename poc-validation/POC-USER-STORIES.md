# PatchIQ POC User Stories

> **Purpose**: Verify end-to-end integration of backend, Go agent, and frontend across macOS, Windows 11, and Ubuntu.
>
> **Goal**: Quick wins to demonstrate functional backend, working agent communication, and frontend that reflects real data.
>
> **Test Environment**:
> - 1x macOS machine
> - 1x Windows 11 machine
> - 1x Ubuntu machine
> - Proxmox server for additional VMs if needed

---

## Progress Tracker

| Epic | Status | Blockers |
|------|--------|----------|
| Epic 0: Stack Verification | ⬜ Not Started | |
| Epic 1: Authentication | ⬜ Not Started | |
| Epic 2: Agent Lifecycle | ⬜ Not Started | |
| Epic 3: Asset Visibility | ⬜ Not Started | |
| Epic 4: Dashboard Insights | ⬜ Not Started | |
| Epic 5: Command Execution | ⬜ Not Started | |
| Epic 6: Patch Deployment | ⬜ Not Started | |
| Epic 7: Vulnerability Visibility | ⬜ Not Started | |

**Legend**: ⬜ Not Started | 🟡 In Progress | ✅ Complete | ❌ Blocked

---

## EPIC 0: Stack Verification
*Can we even run the system?*

**Priority**: 🔴 Critical - Must complete first

---

### US-0.1: Backend Server Starts

**As a** developer
**I want** to start the backend server
**So that** API endpoints are available

**Acceptance Criteria**:
- [ ] Run backend (npm run dev or docker-compose up)
- [ ] Server starts without errors on port 3000 (or configured port)
- [ ] GET /health or GET /v1/health returns 200 OK
- [ ] Database connection established (check logs)
- [ ] No unhandled promise rejections in console

**Test Commands**:
```bash
# Start backend
cd backend && npm run dev

# Or with Docker
docker-compose up

# Verify health
curl http://localhost:3000/v1/health
# Expected: { "status": "ok" } or 200 response
```

**Status**: ⬜ Not Tested

---

### US-0.2: Database is Seeded

**As a** developer
**I want** the database to have seed data
**So that** I can test without manual data entry

**Acceptance Criteria**:
- [ ] At least 1 admin user exists (can login)
- [ ] Patch catalog has entries (even if empty, schema works)
- [ ] Categories/tags exist for assets
- [ ] Organization structure exists

**Test Commands**:
```bash
# Run seed (if not already run)
cd backend && npm run db:seed

# Inspect database
cd backend && npm run db:studio
# Opens Prisma Studio in browser
```

**Status**: ⬜ Not Tested

---

### US-0.3: Frontend Builds and Runs

**As a** developer
**I want** to start the frontend
**So that** I can access the UI

**Acceptance Criteria**:
- [ ] Run frontend (npm run dev)
- [ ] Vite dev server starts on port 5173 (or configured)
- [ ] No build errors in console
- [ ] Browser opens to login page without crash
- [ ] No white screen of death

**Test Commands**:
```bash
cd frontend && npm run dev
# Open http://localhost:5173 in browser
# Expected: Login page renders
```

**Status**: ⬜ Not Tested

---

### US-0.4: Frontend Connects to Real Backend (Not MSW)

**As a** developer
**I want** frontend API calls to hit the real backend
**So that** I'm testing actual integration

**Acceptance Criteria**:
- [ ] MSW is disabled or bypassed for real API calls
- [ ] VITE_API_URL or similar env var points to backend
- [ ] Network tab shows requests going to localhost:3000/v1/*
- [ ] No "mocked" responses in console

**Verification**:
```bash
# Check frontend environment
cat frontend/.env
cat frontend/.env.local

# Look for:
# VITE_API_URL=http://localhost:3000
# or similar

# Check MSW is not intercepting
# In browser DevTools > Network tab
# Requests should go to localhost:3000, not be intercepted
```

**Status**: ⬜ Not Tested

---

## EPIC 1: Authentication Flow
*Can users login?*

**Priority**: 🔴 Critical

**Dependencies**: Epic 0 complete

---

### US-1.1: Admin Can Login

**As an** IT Admin
**I want** to login with my credentials
**So that** I can access the platform

**Acceptance Criteria**:
- [ ] Login page renders with email/password fields
- [ ] Submit with valid credentials
- [ ] Receive JWT token (check localStorage or response)
- [ ] Redirect to dashboard
- [ ] User name appears in header/sidebar

**Test Credentials** (from seed):
```
Email: admin@example.com (or whatever seed creates)
Password: <seeded password>
```

**Failure Modes**:
| Error | Likely Cause |
|-------|-------------|
| 401 Unauthorized | Bad credentials or auth endpoint broken |
| CORS error | Backend CORS not configured for frontend origin |
| Network error | Backend not running |
| 500 error | Database connection issue |

**Status**: ⬜ Not Tested

---

### US-1.2: Protected Routes Require Auth

**As a** security requirement
**I want** unauthenticated users blocked from protected pages
**So that** data is secure

**Acceptance Criteria**:
- [ ] Navigate to /dashboard without login → Redirected to /login
- [ ] Navigate to /assets without login → Redirected to /login
- [ ] Navigate to /agents without login → Redirected to /login
- [ ] After login, can access protected routes

**Status**: ⬜ Not Tested

---

## EPIC 2: Agent Lifecycle
*Can agents register and communicate?*

**Priority**: 🔴 Critical - Core value proposition

**Dependencies**: Epic 0, Epic 1 complete

---

### US-2.1: Agent Binary Downloads Available

**As an** IT Admin
**I want** to download agent installers for each OS
**So that** I can deploy agents to endpoints

**Acceptance Criteria**:
- [ ] Agent binaries exist and are accessible:
    - [ ] Windows (.exe or .msi)
    - [ ] macOS (.dmg or binary)
    - [ ] Linux (.deb, .rpm, or binary)
- [ ] Download completes successfully
- [ ] File is not corrupted (can execute)

**Agent Locations**:
```
/agent/patchify-agent        # Linux binary
/agent/patchify-agent.exe    # Windows binary (if exists)
/agent/patchify-agent-macos  # macOS binary
```

**UI Download Page** (if implemented):
- Settings > Agent Management > Downloads
- Or Discovery > Agents > Download Agent

**Status**: ⬜ Not Tested

---

### US-2.2: Agent Registers with Backend (macOS)

**As an** IT Admin
**I want** to run the agent on macOS
**So that** the endpoint appears in PatchIQ

**Acceptance Criteria**:
- [ ] Run: `./patchify-agent-macos` (may need `chmod +x`)
- [ ] Agent starts without errors
- [ ] Agent logs show "Registered successfully" or similar
- [ ] Agent logs show server URL it's connecting to
- [ ] In PatchIQ UI: Navigate to Discovery > Agents
- [ ] New agent appears in list with:
    - [ ] Status: Connected (green)
    - [ ] Hostname: matches Mac hostname
    - [ ] OS: macOS
    - [ ] IP Address: correct local IP
    - [ ] Last Heartbeat: recent timestamp

**Test Commands**:
```bash
# On macOS machine
chmod +x ./patchify-agent-macos
./patchify-agent-macos

# Check agent config for server URL
cat agent-config.json  # or wherever config is

# Backend verification
curl http://localhost:3000/v1/agents
# Expected: Array containing the new agent
```

**Failure Modes**:
| Symptom | Likely Cause |
|---------|-------------|
| Agent can't connect | Check agent config for server URL |
| Agent connects but not in UI | Frontend not fetching /v1/agents |
| Agent shows "Pending" | May need approval workflow |
| Connection refused | Backend not running or wrong port |

**Status**: ⬜ Not Tested

---

### US-2.3: Agent Registers with Backend (Windows 11)

**As an** IT Admin
**I want** to run the agent on Windows 11
**So that** the endpoint appears in PatchIQ

**Acceptance Criteria**:
- [ ] Run: `patchify-agent.exe` (may need Run as Administrator)
- [ ] Agent starts without errors
- [ ] Agent appears in PatchIQ Agents list
- [ ] Status: Connected
- [ ] OS: Windows 11
- [ ] Hostname and IP correct

**Windows-Specific Notes**:
- May require firewall exception for outbound HTTPS
- Run as Administrator for full data collection (WMI access)
- Check Windows Defender doesn't block the binary

**Status**: ⬜ Not Tested

---

### US-2.4: Agent Registers with Backend (Ubuntu)

**As an** IT Admin
**I want** to run the agent on Ubuntu Linux
**So that** the endpoint appears in PatchIQ

**Acceptance Criteria**:
- [ ] Run: `./patchify-agent` (may need `chmod +x` and `sudo`)
- [ ] Agent starts without errors
- [ ] Agent appears in PatchIQ Agents list
- [ ] Status: Connected
- [ ] OS: Ubuntu/Linux
- [ ] Hostname and IP correct

**Test Commands**:
```bash
chmod +x ./patchify-agent
sudo ./patchify-agent  # sudo may be needed for full data collection
```

**Status**: ⬜ Not Tested

---

### US-2.5: Agent Sends Heartbeat

**As a** system requirement
**I want** agents to send periodic heartbeats
**So that** we know they're online

**Acceptance Criteria**:
- [ ] Agent running for 2+ minutes
- [ ] "Last Heartbeat" timestamp updates in UI
- [ ] Status remains "Connected"
- [ ] Stop the agent process (Ctrl+C or kill)
- [ ] After heartbeat timeout (60-120s), status changes to "Disconnected"
- [ ] Restart agent
- [ ] Status returns to "Connected"

**Backend Verification**:
```bash
# Check agent record
curl http://localhost:3000/v1/agents/{agentId}
# Look for lastHeartbeat field - should update every 30-60 seconds
```

**Status**: ⬜ Not Tested

---

### US-2.6: Agent Collects and Sends Inventory

**As an** IT Admin
**I want** to see hardware/software details collected by the agent
**So that** I have visibility into the endpoint

**Acceptance Criteria**:
- [ ] Agent has been running for initial collection (may take 1-5 min)
- [ ] Navigate to Assets page (not Inventory)
- [ ] Asset exists for the agent's machine
- [ ] Click on asset to see details
- [ ] Hardware tab shows:
    - [ ] CPU model and cores
    - [ ] RAM total
    - [ ] Storage drives
    - [ ] OS version
- [ ] Software tab shows:
    - [ ] List of installed applications
    - [ ] Version numbers
- [ ] Data matches actual machine specs

**Backend Verification**:
```bash
curl http://localhost:3000/v1/assets
# Find asset ID for this machine

curl http://localhost:3000/v1/assets/{id}/hardware
curl http://localhost:3000/v1/assets/{id}/software
```

**Status**: ⬜ Not Tested

---

### US-2.7: Agent Sends Telemetry

**As an** IT Admin
**I want** to see real-time CPU/memory/disk usage
**So that** I can monitor endpoint health

**Acceptance Criteria**:
- [ ] Navigate to Asset > Telemetry tab
- [ ] See current metrics:
    - [ ] CPU usage percentage
    - [ ] Memory usage percentage
    - [ ] Disk usage percentage
- [ ] Values update periodically (every 1-5 min)
- [ ] Historical chart shows data points (if implemented)

**Backend Verification**:
```bash
curl http://localhost:3000/v1/assets/{id}/telemetry
```

**Status**: ⬜ Not Tested

---

## EPIC 3: Asset Visibility
*Can we see and manage assets?*

**Priority**: 🔴 Critical - Core value proposition

**Dependencies**: Epic 2 complete (agents registered)

---

### US-3.1: Assets List Page

**As an** IT Admin
**I want** to see all discovered assets in a list
**So that** I have visibility into my fleet

**Acceptance Criteria**:
- [ ] Navigate to Assets > All Assets
- [ ] Page loads without crash
- [ ] Table displays with columns:
    - [ ] Name/Hostname
    - [ ] OS
    - [ ] IP Address
    - [ ] Status (Online/Offline)
    - [ ] Last Seen
- [ ] All 3 test machines (Mac, Windows, Ubuntu) appear
- [ ] Pagination works if many assets
- [ ] Search/filter works

**Status**: ⬜ Not Tested

---

### US-3.2: Asset Details - Hardware

**As an** IT Admin
**I want** to view detailed hardware specs for an asset
**So that** I understand the endpoint configuration

**Acceptance Criteria**:
- [ ] Click on an asset from the list
- [ ] Asset details page/drawer opens
- [ ] Hardware tab shows:
    - [ ] Processor (model, cores, speed)
    - [ ] Memory (total RAM, slots if available)
    - [ ] Storage (drives, capacity, type SSD/HDD)
    - [ ] BIOS/UEFI info
    - [ ] GPU if present

**Status**: ⬜ Not Tested

---

### US-3.3: Asset Details - Software Inventory

**As an** IT Admin
**I want** to see all software installed on an asset
**So that** I can track what's deployed

**Acceptance Criteria**:
- [ ] Software tab shows list of installed applications
- [ ] Each entry has:
    - [ ] Application name
    - [ ] Version
    - [ ] Publisher/Vendor
    - [ ] Install date (if available)
- [ ] Can search/filter software list
- [ ] Count matches roughly what's on the machine

**Status**: ⬜ Not Tested

---

### US-3.4: Asset Details - Security Posture

**As an** IT Admin
**I want** to see security status of an asset
**So that** I can identify compliance gaps

**Acceptance Criteria**:
- [ ] Security tab shows:
    - [ ] Firewall status (enabled/disabled)
    - [ ] Antivirus status (if detected)
    - [ ] Encryption status (BitLocker/FileVault/LUKS)
    - [ ] OS patch status (up to date / missing patches)

**Status**: ⬜ Not Tested

---

## EPIC 4: Dashboard Insights
*Does the dashboard show useful data?*

**Priority**: 🟡 High - First impression for stakeholders

**Dependencies**: Epic 2, Epic 3 complete

---

### US-4.1: Dashboard Loads with Metrics

**As an** IT Admin
**I want** to see a summary dashboard when I login
**So that** I get immediate visibility into my environment

**Acceptance Criteria**:
- [ ] Dashboard page loads without crash
- [ ] Shows total asset count (should be 3 for our test)
- [ ] Shows agent status summary:
    - [ ] X Connected
    - [ ] X Disconnected
- [ ] Shows patch compliance metric (even if 0% or N/A)
- [ ] Shows vulnerability count (if CVE data loaded)

**Backend Verification**:
```bash
curl http://localhost:3000/v1/dashboard/metrics
```

**Status**: ⬜ Not Tested

---

### US-4.2: Dashboard - Agent Status Widget

**As an** IT Admin
**I want** to see agent connectivity at a glance
**So that** I know if endpoints are reachable

**Acceptance Criteria**:
- [ ] Widget shows:
    - [ ] Total agents: 3
    - [ ] Online: 3 (or actual count)
    - [ ] Offline: 0
- [ ] Visual indicator (pie chart, progress bar, or numbers)
- [ ] Clicking widget navigates to Agents page

**Status**: ⬜ Not Tested

---

### US-4.3: Dashboard - Patch Compliance Widget

**As an** IT Admin
**I want** to see patch compliance percentage
**So that** I know my security posture

**Acceptance Criteria**:
- [ ] Shows percentage of assets that are fully patched
- [ ] Or shows "No patch data" if not yet scanned
- [ ] Clicking navigates to Patches page

**Status**: ⬜ Not Tested

---

### US-4.4: Dashboard - Vulnerability Summary Widget

**As an** IT Admin
**I want** to see vulnerability counts by severity
**So that** I can prioritize remediation

**Acceptance Criteria**:
- [ ] Shows count by severity:
    - [ ] Critical: X
    - [ ] High: X
    - [ ] Medium: X
    - [ ] Low: X
- [ ] Or shows "No vulnerabilities detected" if clean
- [ ] Clicking navigates to Vulnerabilities page

**Status**: ⬜ Not Tested

---

## EPIC 5: Command Execution
*Can we send commands to agents?*

**Priority**: 🟢 Medium - Nice to have for POC

**Dependencies**: Epic 2 complete

---

### US-5.1: Send Scan Command to Agent

**As an** IT Admin
**I want** to trigger a scan on an agent
**So that** I can refresh inventory data

**Acceptance Criteria**:
- [ ] Navigate to Agents page
- [ ] Select an agent
- [ ] Find "Scan" or "Refresh" action button
- [ ] Click to send scan command
- [ ] Agent receives command (check agent logs)
- [ ] Agent executes scan
- [ ] Command status shows "Completed"
- [ ] Inventory data refreshes

**Backend Verification**:
```bash
# Send command via API
curl -X POST http://localhost:3000/v1/agents/{id}/commands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"type": "scan"}'

# Agent should poll and receive command via:
# GET /api/agent/commands
```

**Status**: ⬜ Not Tested

---

### US-5.2: Send Reboot Command to Agent

**As an** IT Admin
**I want** to remotely reboot an endpoint
**So that** I can apply pending updates

**Acceptance Criteria**:
- [ ] Select an agent
- [ ] Find "Reboot" action
- [ ] Confirm reboot (should have confirmation dialog)
- [ ] Agent receives reboot command
- [ ] Machine reboots
- [ ] Agent reconnects after reboot
- [ ] Status returns to Connected

⚠️ **WARNING**: Test on VM or non-critical machine first!

**Status**: ⬜ Not Tested

---

## EPIC 6: Patch Deployment
*Can we deploy patches?*

**Priority**: 🟢 Medium - Stretch goal for POC

**Dependencies**: Epic 2 complete, patch catalog seeded

---

### US-6.1: View Patch Catalog

**As an** IT Admin
**I want** to see available patches
**So that** I can select what to deploy

**Acceptance Criteria**:
- [ ] Navigate to Patches > All Patches
- [ ] Page loads without crash
- [ ] If seeded: Shows list of patches with:
    - [ ] Patch name/title
    - [ ] KB number (for Windows)
    - [ ] Severity
    - [ ] OS/Platform
    - [ ] Status
- [ ] If empty: Shows "No patches available"
- [ ] Can filter by severity, OS, status

**Status**: ⬜ Not Tested

---

### US-6.2: Create Patch Deployment

**As an** IT Admin
**I want** to deploy a patch to selected endpoints
**So that** I can remediate vulnerabilities

**Acceptance Criteria**:
- [ ] Select a patch from catalog
- [ ] Click "Deploy" action
- [ ] Select target assets (our 3 test machines)
- [ ] Choose schedule: Immediate
- [ ] Confirm deployment
- [ ] Deployment created successfully
- [ ] Navigate to deployment status page
- [ ] See deployment progress per asset

**Backend Verification**:
```bash
curl -X POST http://localhost:3000/v1/deployments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "patchIds": ["..."],
    "targetAssets": ["..."],
    "schedule": "INSTANT"
  }'
```

**Status**: ⬜ Not Tested

---

### US-6.3: Agent Executes Patch

**As a** system requirement
**I want** agents to receive and execute patch deployments
**So that** endpoints are remediated

**Acceptance Criteria**:
- [ ] Agent polls for commands
- [ ] Receives patch-install command
- [ ] Downloads patch (from MinIO or configured source)
- [ ] Executes installation
- [ ] Reports result (success/failure)
- [ ] UI shows deployment task status: Completed

**Note**: For POC, may need a simple test patch that just runs a script or installs a known-good package.

**Status**: ⬜ Not Tested

---

## EPIC 7: Vulnerability Visibility
*Can we see vulnerabilities?*

**Priority**: 🟢 Medium - Stretch goal for POC

**Dependencies**: CVE database seeded or sync working

---

### US-7.1: Vulnerabilities List Page

**As an** IT Admin
**I want** to see known vulnerabilities
**So that** I can understand my risk exposure

**Acceptance Criteria**:
- [ ] Navigate to Vulnerabilities page
- [ ] Page loads without crash
- [ ] If CVE data loaded: Shows vulnerability list with:
    - [ ] CVE ID
    - [ ] Title/Description
    - [ ] Severity (Critical/High/Medium/Low)
    - [ ] CVSS Score
    - [ ] Affected assets count
- [ ] Can filter by severity
- [ ] Can search by CVE ID

**Status**: ⬜ Not Tested

---

### US-7.2: CVE Database Sync

**As an** IT Admin
**I want** to sync the latest CVE data
**So that** I have current vulnerability information

**Acceptance Criteria**:
- [ ] Find "Sync" or "Update Database" action
- [ ] Trigger sync (may use mock NVD in POC)
- [ ] Sync job starts
- [ ] Progress indicator shown
- [ ] New CVEs appear in list after sync completes

**Backend Verification**:
```bash
curl -X POST http://localhost:3000/v1/vulnerabilities/sync \
  -H "Authorization: Bearer {token}"
```

**Status**: ⬜ Not Tested

---

## Summary & Priority Matrix

### Critical Path (Must Complete)

| # | Story | Why Critical |
|---|-------|-------------|
| 1 | US-0.1 | Can't test anything without backend |
| 2 | US-0.2 | Need seed data to login |
| 3 | US-0.3 | Need UI to demonstrate |
| 4 | US-0.4 | Must use real backend, not mocks |
| 5 | US-1.1 | Can't access anything without login |
| 6 | US-2.2-2.4 | Agent registration is core value |
| 7 | US-2.6 | Inventory collection proves agent works |
| 8 | US-3.1 | Assets page shows collected data |
| 9 | US-4.1 | Dashboard is first thing stakeholders see |

### Nice to Have (Stretch Goals)

| # | Story | Value Add |
|---|-------|----------|
| 1 | US-5.1-5.2 | Shows bidirectional communication |
| 2 | US-6.1-6.3 | Shows patch deployment flow |
| 3 | US-7.1-7.2 | Shows vulnerability management |

---

## Known Issues & Blockers

*Document any issues discovered during testing here*

| Issue | Story Affected | Status | Resolution |
|-------|---------------|--------|------------|
| | | | |

---

## Test Environment Setup

### Backend
```bash
cd /Users/heramb/skenzeriq/PatchIQ/full-dev/backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Frontend
```bash
cd /Users/heramb/skenzeriq/PatchIQ/full-dev/frontend
npm install
# Ensure .env points to real backend
npm run dev
```

### Agent
```bash
# macOS
cd /Users/heramb/skenzeriq/PatchIQ/full-dev/agent
chmod +x patchify-agent-macos
./patchify-agent-macos

# Linux
chmod +x patchify-agent
./patchify-agent

# Windows
# Run patchify-agent.exe as Administrator
```

---

*Document created: $(date)*
*Last updated: $(date)*
