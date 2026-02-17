# Frontend Manual Testing Checklist
## PatchIQ - Complete Manual QA Checklist

**Test Date:** _______________
**Tester:** _______________
**Version:** _______________
**Environment:** ⬜ Dev  ⬜ Staging  ⬜ Production

---

## 🎯 Pre-Flight Checks

- [ ] Application loads without errors
- [ ] No console errors in browser DevTools (F12)
- [ ] No 404s in Network tab
- [ ] CSS styles loading correctly
- [ ] Favicon displays

**Notes:**
```


```

---

## 🔐 Authentication & Authorization

### Login Flow
- [ ] Login with valid credentials → Success
  - Email: `admin@patchiq.io`
  - Password: `admin123`
- [ ] Login with invalid email → Error shown
- [ ] Login with invalid password → Error shown
- [ ] Login with empty fields → Validation errors
- [ ] Remember me checkbox works
- [ ] Logout → Redirects to login page
- [ ] Access protected route while logged out → Redirects to login

**Issues Found:**
```


```

---

## 🛡️ Security Testing (P0 - CRITICAL)

### XSS Prevention Testing

**Instructions:** Paste each payload into the specified form field and verify it's blocked/sanitized.

#### Add Asset Modal
- [ ] Asset Name: `<script>alert('XSS')</script>` → Sanitized
- [ ] Hostname: `<img src=x onerror=alert(1)>` → Sanitized
- [ ] Description: `<svg/onload=alert(1)>` → Sanitized
- [ ] IP Address: `<iframe src='evil.com'>` → Sanitized

#### Create/Edit Patch
- [ ] Patch Name: `<script>alert('XSS')</script>` → Sanitized
- [ ] Description: `<img src=x onerror=alert(1)>` → Sanitized
- [ ] Vendor: `<svg/onload=alert(1)>` → Sanitized

#### User Management
- [ ] Name: `<script>alert('XSS')</script>` → Sanitized
- [ ] Email: `test@<script>alert(1)</script>` → Invalid email error
- [ ] Email: Normal invalid email `test@` → Validation error shown

#### Schedule Report
- [ ] Recipients: `<script>@example.com` → Invalid email error
- [ ] Recipients: `invalid@` → Validation error shown

### Input Validation
- [ ] Email fields reject invalid emails
- [ ] Character counters show (X/255 characters)
- [ ] Fields enforce max length (255 chars)
- [ ] Required fields marked and enforced
- [ ] Numeric fields only accept numbers

**XSS Issues Found:**
```


```

---

## 📦 Asset Management

### Assets List
- [ ] Assets list loads and displays data
- [ ] Search by asset name works
- [ ] Filter by OS Type works
- [ ] Filter by Status works
- [ ] Sort by columns works
- [ ] Pagination works
- [ ] Export (CSV/Excel/PDF) shows loading indicator
- [ ] Export completes successfully

### Add Asset
- [ ] Modal opens
- [ ] All form fields render
- [ ] Required fields marked with *
- [ ] Character counter visible
- [ ] Form validation works
- [ ] Submit with valid data → Success
- [ ] Submit with invalid data → Error shown
- [ ] Cancel button closes modal

### Edit Asset
- [ ] Click asset opens detail view
- [ ] Edit button opens modal
- [ ] Form pre-populated with data
- [ ] Update asset → Success
- [ ] Changes reflected in list

### Delete Asset
- [ ] Delete button shows confirmation modal
- [ ] Confirm deletion → Asset deleted
- [ ] Cancel → Asset not deleted

### Empty State
- [ ] With no assets → Shows "No Data" with CTA
- [ ] With search/filter no results → Shows "No Results" with clear button

**Asset Issues:**
```


```

---

## 🩹 Patch Management

### Patches List
- [ ] Patches list loads
- [ ] Filter by severity (Critical/High/Medium/Low)
- [ ] Filter by status
- [ ] Search by CVE or name
- [ ] Sort columns work
- [ ] Pagination works
- [ ] Export functionality works

### Create Patch
- [ ] Modal opens
- [ ] All fields render
- [ ] Severity dropdown works
- [ ] Date picker works
- [ ] Submit valid patch → Success
- [ ] XSS sanitization works (tested above)

### Edit Patch
- [ ] Edit modal pre-populated
- [ ] Update patch → Success
- [ ] Changes reflected in list

### Deploy Patch
- [ ] Deploy button visible
- [ ] Click deploy → Navigate to deployments
- [ ] Can select target assets
- [ ] Can schedule deployment

**Patch Issues:**
```


```

---

## 🔍 Vulnerability Management

### Vulnerabilities List
- [ ] List loads with data
- [ ] Filter by severity works
- [ ] Search by CVE ID works
- [ ] Filter by status works
- [ ] Sort columns work

### Vulnerability Details
- [ ] Click vulnerability → Opens detail view
- [ ] CVE information displayed
- [ ] Affected assets shown
- [ ] Available patches shown
- [ ] Can link to patch

### Scan for Vulnerabilities
- [ ] Scan button visible
- [ ] Click scan → Shows progress
- [ ] Scan completes → Results shown
- [ ] Error handling works

**Vulnerability Issues:**
```


```

---

## 👥 User Management

### Users List
- [ ] Users list loads
- [ ] Search users works
- [ ] Filter by role works
- [ ] Sort columns work

### Add User
- [ ] Modal opens
- [ ] Email validation works
- [ ] Character counter shown
- [ ] Role dropdown works
- [ ] Submit → User created
- [ ] XSS prevention works (tested above)

### Edit User
- [ ] Edit modal pre-populated
- [ ] Update role → Success
- [ ] Update email with validation → Success

### Delete User
- [ ] Delete shows confirmation
- [ ] Confirm → User deleted

**User Management Issues:**
```


```

---

## 🚀 Deployments

### Deployments List
- [ ] List loads
- [ ] Filter by status works
- [ ] Search works
- [ ] View deployment details

### Create Deployment
- [ ] Can select patch
- [ ] Can select target assets
- [ ] Can schedule deployment
- [ ] Submit → Deployment created

### Monitor Deployment
- [ ] Status updates show
- [ ] Progress indicator works
- [ ] Can view logs
- [ ] Can cancel deployment

**Deployment Issues:**
```


```

---

## 🔎 Discovery & Agents

### Agents List
- [ ] List loads
- [ ] Empty state shows "Download Agent" button
- [ ] Search agents works
- [ ] Filter by status works

### Add Credential
- [ ] Modal opens
- [ ] Form validation works
- [ ] Submit → Credential saved

### Create Discovery Job
- [ ] Can configure discovery
- [ ] Can select credential
- [ ] Can set schedule
- [ ] Submit → Job created

### Run Discovery
- [ ] Can trigger discovery
- [ ] Progress shown
- [ ] Results displayed
- [ ] Discovered assets shown

**Discovery Issues:**
```


```

---

## 📅 Jobs & Policies

### Jobs List
- [ ] List loads
- [ ] Empty state shown if no jobs
- [ ] Filter by type works
- [ ] View job details

### Create Job
- [ ] Modal opens
- [ ] Job type selection works
- [ ] Schedule configuration works
- [ ] Submit → Job created

### Policies List
- [ ] List loads
- [ ] View policy details
- [ ] Enable/disable policy toggle works

### Create Policy
- [ ] Modal opens
- [ ] Rule configuration works
- [ ] Submit → Policy created

**Jobs/Policies Issues:**
```


```

---

## 🔔 Notifications

### Notifications Panel
- [ ] Panel opens
- [ ] Notifications load
- [ ] Mark as read works
- [ ] Empty state (all read) shows friendly message
- [ ] Click notification navigates correctly

### SSE (Server-Sent Events) Testing
- [ ] Open DevTools Network tab
- [ ] Verify SSE connection established
- [ ] **Disconnect network (airplane mode or DevTools offline)**
- [ ] Toast shows: "Connection lost. Reconnecting..."
- [ ] **Reconnect network**
- [ ] Toast shows: "Notifications reconnected"
- [ ] Notifications continue to work

**Notification Issues:**
```


```

---

## 📊 Reports

### Reports List
- [ ] List loads
- [ ] Filter by type works
- [ ] View report details

### Generate Report
- [ ] Select report type
- [ ] Configure parameters
- [ ] Generate → Report created
- [ ] Download works (PDF/CSV)

### Schedule Report
- [ ] Modal opens
- [ ] Email recipients validated
- [ ] Schedule configuration works
- [ ] Submit → Scheduled successfully

**Reports Issues:**
```


```

---

## ⚙️ Settings

### Organization Settings
- [ ] Form loads with current values
- [ ] Update organization name → Success
- [ ] Changes saved

### Mail Server Configuration
- [ ] Form loads
- [ ] Test connection button works
- [ ] Save configuration → Success

### Integration Settings
- [ ] Jira integration form works
- [ ] Slack integration form works
- [ ] Test connection works
- [ ] Save → Success

### RBAC Settings
- [ ] Roles list loads
- [ ] Modify permissions → Success
- [ ] Create custom role → Success

**Settings Issues:**
```


```

---

## 📱 Responsive Testing

**Test at these viewport widths:**

### Mobile (375px)
- [ ] Navigation collapses to hamburger
- [ ] Tables scroll horizontally or stack
- [ ] Forms stack vertically
- [ ] Buttons touch-friendly (44x44px min)
- [ ] No horizontal scroll

### Tablet (768px)
- [ ] Layout adjusts appropriately
- [ ] Navigation works
- [ ] Tables readable

### Desktop (1440px+)
- [ ] Full layout displays
- [ ] No wasted space
- [ ] All features accessible

**Responsive Issues:**
```


```

---

## 🌐 Cross-Browser Testing

### Chrome (Latest)
- [ ] All features work
- [ ] No console errors
- [ ] Performance good

### Firefox (Latest)
- [ ] All features work
- [ ] SSE notifications work
- [ ] Layout matches Chrome

### Safari (Latest)
- [ ] All features work
- [ ] Date pickers work
- [ ] File downloads work

### Mobile Safari (iOS)
- [ ] Touch interactions work
- [ ] No viewport issues

**Browser Issues:**
```


```

---

## ♿ Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus order logical
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] No keyboard traps

### Screen Reader
- [ ] Test with VoiceOver or NVDA
- [ ] Form labels announced
- [ ] Error messages announced
- [ ] Loading states announced

### Visual
- [ ] Color contrast sufficient
- [ ] Text resizable to 200%
- [ ] Focus indicators visible
- [ ] No color-only information

**Accessibility Issues:**
```


```

---

## ⚡ Performance Testing

### Page Load Times
- [ ] Dashboard < 3s
- [ ] Assets list < 3s
- [ ] Patches list < 3s
- [ ] Asset detail < 2s

### Interactions
- [ ] Search/filter < 500ms
- [ ] Modal open/close < 200ms
- [ ] Table sorting < 500ms

### Large Data Sets
- [ ] 1000+ assets load
- [ ] 1000+ vulnerabilities load
- [ ] Table virtualization works
- [ ] No performance degradation

### Network
- [ ] Test on slow 3G (DevTools throttling)
- [ ] Loading states show
- [ ] Error handling for timeouts
- [ ] Retry mechanisms work

**Performance Issues:**
```


```

---

## 🎨 UI/UX Polish

### Loading States
- [ ] Skeleton loaders show while loading
- [ ] Export shows loading indicator
- [ ] Button loading states work
- [ ] Spinners appear for async actions

### Empty States
- [ ] All empty states have helpful messages
- [ ] Call-to-action buttons present
- [ ] Icons/illustrations appropriate

### Error States
- [ ] Error messages clear and helpful
- [ ] Retry buttons work
- [ ] Error boundaries prevent crashes

### Toasts/Notifications
- [ ] Success messages show appropriate duration
- [ ] Error messages show longer duration
- [ ] Loading messages dismissible
- [ ] No toast spam

**UI/UX Issues:**
```


```

---

## 🎯 Critical User Flows

### Happy Path 1: Deploy a Patch
- [ ] Login → Dashboard
- [ ] Navigate to Patches
- [ ] Create new patch
- [ ] Navigate to Deployments
- [ ] Create deployment selecting patch
- [ ] Select target assets
- [ ] Deploy
- [ ] Monitor status

### Happy Path 2: Scan for Vulnerabilities
- [ ] Login → Dashboard
- [ ] Navigate to Vulnerabilities
- [ ] Click "Scan for Vulnerabilities"
- [ ] Select assets to scan
- [ ] Run scan
- [ ] View results
- [ ] Link vulnerability to patch

### Happy Path 3: Add Agent & Discover Assets
- [ ] Login → Discovery
- [ ] Download agent
- [ ] Install agent (separate process)
- [ ] Add credential
- [ ] Create discovery job
- [ ] Run discovery
- [ ] View discovered assets

**Critical Flow Issues:**
```


```

---

## ✅ Sign-Off

### Automated Tests
- [ ] All Playwright tests passing
- [ ] ESLint: 0 errors
- [ ] TypeScript: 0 errors
- [ ] Build successful

### Manual Tests
- [ ] All security tests passed
- [ ] All functional tests passed
- [ ] Cross-browser tests passed
- [ ] Accessibility tests passed
- [ ] Performance tests passed

### Release Readiness
- [ ] No P0 bugs found
- [ ] No P1 bugs found
- [ ] P2/P3 bugs documented
- [ ] Known issues documented
- [ ] Stakeholder approval received

---

## 📊 Test Summary

**Total Tests:** _____ / _____
**Passed:** _____
**Failed:** _____
**Blocked:** _____
**Not Tested:** _____

**Overall Status:** ⬜ PASS  ⬜ FAIL  ⬜ PASS WITH ISSUES

---

## 🐛 Issues Summary

| ID | Severity | Component | Description | Status |
|----|----------|-----------|-------------|--------|
| 1  |          |           |             |        |
| 2  |          |           |             |        |
| 3  |          |           |             |        |
| 4  |          |           |             |        |
| 5  |          |           |             |        |

---

## ✍️ Tester Sign-Off

**Tested By:** _______________
**Date:** _______________
**Signature:** _______________

**Approved By:** _______________
**Date:** _______________
**Signature:** _______________

---

## 📝 Additional Notes

```












```

---

**Next Steps:**
1. File all P0/P1 bugs immediately
2. Document workarounds for known issues
3. Update release notes with findings
4. Schedule follow-up testing if needed

---

**Reference Documents:**
- `FRONTEND-QUALITY-ASSURANCE-PLAN.md` - Complete QA plan
- `FRONTEND-QA-QUICK-REFERENCE.md` - Quick reference card
- `CLAUDE.md` - Project conventions
