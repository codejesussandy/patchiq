# Phase 5B - Agent 54: E2E Patch Deployment - Manual Test Guide

**Test Date:** February 17, 2026
**Tester:** _______________
**Duration:** ~15-20 minutes

## Objective

Test the complete patch deployment workflow from selecting a patch to monitoring deployment completion.

## Prerequisites

- Services running (`make dev` or individual services)
- At least one agent connected to the system
- Sample patch data seeded in database

## Test Journey

### Step 1: Login ✅

**Actions:**
1. Navigate to `http://localhost:5173/login`
2. Enter credentials:
   - Email: `admin@patchiq.io`
   - Password: `admin123`
3. Click "Login" or "Sign In"

**Expected:**
- ✅ Login successful
- ✅ Redirected to `/dashboard`

**Actual Result:**
- [ ] PASS
- [ ] FAIL - Reason: _______________

**Screenshot:** `01-dashboard.png`

---

### Step 2: Browse Patches ✅

**Actions:**
1. Click "Patches" in left sidebar navigation
2. Wait for patch list to load
3. Observe patches table
4. Note first patch details:
   - Patch Name: _______________
   - Patch ID: _______________
   - CVE: _______________

**Expected:**
- ✅ Patch list displays
- ✅ Table shows Software, ID, Endpoints, OS, Severity columns
- ✅ At least one patch visible

**Actual Result:**
- [ ] PASS
- [ ] FAIL - Reason: _______________

**Screenshot:** `02-patches-list.png`

---

### Step 3: View Patch Details ✅

**Actions:**
1. Click on first patch in list (click on name or row)
2. Wait for patch detail page to load
3. Observe patch information
4. Note:
   - Patch ID: _______________
   - Severity: _______________
   - CVE Numbers: _______________
   - Endpoints affected: _______________

**Expected:**
- ✅ Patch detail page loads
- ✅ Shows "Details" tab with patch information
- ✅ Shows "Endpoints", "Recommendations", "Vulnerabilities" tabs
- ✅ Deploy button visible in top-right

**Actual Result:**
- [ ] PASS
- [ ] FAIL - Reason: _______________

**Screenshot:** `03-patch-detail.png`

---

### Step 4: Create Deployment ✅

**Actions:**
1. Click "Deploy" button on patch detail page
2. Wait for deployment modal to open
3. Fill deployment form:
   - **Deployment Name:** Leave default or enter: `Manual Test Deployment`
   - **Description:** `Testing E2E patch deployment flow`
   - **Target Agents:** Select 2-3 online agents from dropdown
   - **Retry Count:** Leave as 1
4. Note how many agents selected: _______________
5. Click "Deploy Now" button

**Expected:**
- ✅ Deploy modal opens
- ✅ Shows selected patch details
- ✅ Target agent selector shows available agents
- ✅ Online agents are selectable (green dot indicator)
- ✅ Offline agents are disabled
- ✅ Success message appears after clicking Deploy

**Actual Result:**
- [ ] PASS
- [ ] FAIL - Reason: _______________

**Screenshots:**
- `04-deploy-modal.png` (before submitting)
- `05-deploy-success.png` (after success message)

**Confirmation Dialog:**
- Did a modal appear asking "View Deployment Status"?
  - [ ] YES - Clicked "View Deployments"
  - [ ] NO - Manually navigated to `/patches/deployed`

---

### Step 5: Navigate to Deployment Status ✅

**Actions:**
1. Navigate to `/patches/deployed` (if not already there)
2. Find the newly created deployment (should be at top of list)
3. Note deployment details:
   - Deployment ID: _______________
   - Name: _______________
   - Type: _______________
   - Status: _______________
4. Click on deployment row or "View Details" button

**Expected:**
- ✅ Deployments list page loads
- ✅ New deployment appears in table
- ✅ Deployment has ID, Name, Type, Status columns
- ✅ Status shows IN_PROGRESS, PENDING, or COMPLETED

**Actual Result:**
- [ ] PASS
- [ ] FAIL - Reason: _______________

**Screenshot:** `06-deployments-list.png`

---

### Step 6: Monitor Deployment Progress ✅

**Actions:**
1. View deployment details (modal or page)
2. Observe task list for each target agent
3. Watch for status changes:
   - Initial status: _______________
   - After 5 seconds: _______________
   - After 10 seconds: _______________
4. Note update mechanism:
   - [ ] Status updates automatically (SSE or polling)
   - [ ] Must click "Refresh" button
   - [ ] Must reload page

5. Monitor browser console (F12 → Console tab):
   - Look for messages containing "SSE", "EventSource", "poll", "deployment"
   - Note any relevant activity: _______________

**Real-Time Update Assessment:**

**Update Mechanism:**
- [ ] Server-Sent Events (SSE) - saw EventSource in console
- [ ] Polling - saw periodic requests every X seconds
- [ ] Manual refresh required

**Update Frequency:** _______________

**Updates Reliable:**
- [ ] YES - status changed automatically
- [ ] NO - had to refresh manually

**Expected:**
- ✅ Task list shows one row per target agent
- ✅ Each task has: Endpoint, Name, Status, Created By, Last Updated
- ✅ Status changes from PENDING → IN_PROGRESS → SUCCESS/FAILED
- ✅ Real-time updates occur (ideally automatic via SSE or polling)

**Actual Result:**
- [ ] PASS
- [ ] FAIL - Reason: _______________

**Screenshots:**
- `07-deployment-pending.png` (initial status)
- `08-deployment-in-progress.png` (during execution)
- `09-deployment-completed.png` (final status)

**Time to Complete:** _______________

---

### Step 7: Verify Completion ✅

**Actions:**
1. Wait for all tasks to reach terminal state (SUCCESS or FAILED)
2. Count final results:
   - Total tasks: _______________
   - Succeeded: _______________
   - Failed: _______________
   - Cancelled: _______________

3. Check for logs:
   - Is there a "View Log" or "Log" button for tasks?
     - [ ] YES
     - [ ] NO
   - If YES, click and observe log content: _______________

4. Verify patch installation on asset (optional):
   - Navigate to asset detail page
   - Click "Patches" tab
   - Check if deployed patch appears: _______________

**Expected:**
- ✅ All tasks reach terminal state
- ✅ Overall deployment status is COMPLETED or FAILED
- ✅ Task success/failure counts are accurate
- ✅ Logs are available (if captured)

**Actual Result:**
- [ ] PASS
- [ ] FAIL - Reason: _______________

**Screenshot:** `10-deployment-final.png`

---

### Step 8: Test Cancellation (Optional) ⚠️

**Actions:**
1. Create another deployment (repeat Step 4)
2. Navigate to deployment status
3. Look for "Cancel" button
4. Click "Cancel" button while deployment is IN_PROGRESS
5. Observe result

**Expected:**
- ✅ Cancel button available during execution
- ✅ Deployment status changes to CANCELLED
- ✅ In-progress tasks abort

**Actual Result:**
- [ ] PASS
- [ ] FAIL - Reason: _______________
- [ ] SKIPPED

**Screenshot:** `11-deployment-cancelled.png` (if tested)

---

## Test Summary

### Journey Steps

| Step | Pass/Fail |
|------|-----------|
| 1. Login | [ ] PASS [ ] FAIL |
| 2. Browse Patches | [ ] PASS [ ] FAIL |
| 3. View Patch Details | [ ] PASS [ ] FAIL |
| 4. Create Deployment | [ ] PASS [ ] FAIL |
| 5. Navigate to Status | [ ] PASS [ ] FAIL |
| 6. Monitor Progress | [ ] PASS [ ] FAIL |
| 7. Verify Completion | [ ] PASS [ ] FAIL |
| 8. Test Cancellation | [ ] PASS [ ] FAIL [ ] SKIP |

### Deployment Details

| Item | Value |
|------|-------|
| Patch Deployed | _______________ |
| Patch ID | _______________ |
| CVE | _______________ |
| Target Assets | _______________ |
| Schedule | Immediate |
| Deployment ID | _______________ |
| Duration | _______________ minutes |

### Real-Time Updates

| Item | Value |
|------|-------|
| Update Mechanism | [ ] SSE [ ] Polling [ ] Manual |
| Update Frequency | _______________ |
| Updates Reliable | [ ] YES [ ] NO |
| Console Activity | _______________ |

### Task Results

| Item | Value |
|------|-------|
| Total Tasks | _______________ |
| Succeeded | _______________ |
| Failed | _______________ |
| Cancelled | _______________ |
| Logs Captured | [ ] YES [ ] NO |

### Issues Encountered

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
4. _______________________________________________
5. _______________________________________________

### Screenshots Captured

- [ ] `01-dashboard.png`
- [ ] `02-patches-list.png`
- [ ] `03-patch-detail.png`
- [ ] `04-deploy-modal.png`
- [ ] `05-deploy-success.png`
- [ ] `06-deployments-list.png`
- [ ] `07-deployment-pending.png`
- [ ] `08-deployment-in-progress.png`
- [ ] `09-deployment-completed.png`
- [ ] `10-deployment-final.png`
- [ ] `11-deployment-cancelled.png` (optional)

### Pass/Fail Assessment

**Overall:** [ ] PASS [ ] FAIL

**Critical Items:**
- [ ] Complete patch deployment workflow
- [ ] Deployment creates successfully
- [ ] Status monitoring works (SSE or polling)
- [ ] Deployment completes (success or fail)
- [ ] Results verifiable

---

## Success Criteria

- [ ] Complete patch deployment workflow
- [ ] Deployment creates successfully
- [ ] Status monitoring works (SSE or polling)
- [ ] Deployment completes (success or fail)
- [ ] Results verifiable

---

**Test Completed:** _______________
**Tester Signature:** _______________
**Notes:** _______________________________________________

_______________________________________________

_______________________________________________
