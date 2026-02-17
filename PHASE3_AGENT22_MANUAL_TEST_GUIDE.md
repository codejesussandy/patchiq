# Phase 3 - Agent 22: System Settings - Manual Test Guide

**Quick Reference for QA Testers**
**Estimated Time:** 45-60 minutes
**Prerequisites:** Admin access to PatchIQ (admin@patchiq.io / admin123)

---

## Pre-Test Setup

1. **Start Services:**
   ```bash
   cd /path/to/patchiq
   make dev-services  # Start DB, Redis, MinIO
   make dev-backend   # Start backend API
   make dev-frontend  # Start frontend
   ```

2. **Verify Services Running:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000/health
   - Login with admin@patchiq.io / admin123

3. **Open Browser Dev Tools:**
   - Network tab (to monitor API calls)
   - Console (to check for errors)

---

## Test 1: SMTP Configuration (10 minutes)

**URL:** http://localhost:5173/settings/system-settings/mail-server

### Test Cases

#### TC-SMTP-001: Page Load
- [ ] Page loads without errors
- [ ] Title shows "Mail Server Configurations"
- [ ] Form displays with all fields
- [ ] **Screenshot:** `smtp-page-load.png`

#### TC-SMTP-002: Required Field Validation
- [ ] Clear all fields (if any pre-filled)
- [ ] Click "Save"
- [ ] Verify validation errors appear
- [ ] **Expected:** "Please enter SMTP host", "Please enter SMTP port", "Please enter email"
- [ ] **Screenshot:** `smtp-validation-errors.png`

#### TC-SMTP-003: Email Format Validation
- [ ] Enter "invalid-email" in Email field
- [ ] Click "Save"
- [ ] Verify email validation error
- [ ] **Expected:** "Please enter a valid email"

#### TC-SMTP-004: Save Configuration
- [ ] Fill in:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - Protocol: `TLS`
   - Email: `test@patchiq.io`
- [ ] Click "Save"
- [ ] **Expected:** Green success message "Mail server configuration updated successfully"
- [ ] **Screenshot:** `smtp-save-success.png`

#### TC-SMTP-005: Enable Authentication
- [ ] Check "Enable Authentication"
- [ ] Verify Username and Password fields appear
- [ ] Fill in:
   - Username: `testuser`
   - Password: `testpass123`
- [ ] Click "Save"
- [ ] **Expected:** Success message
- [ ] **Screenshot:** `smtp-auth-enabled.png`

#### TC-SMTP-006: Test Connection
- [ ] Fill "Test Email Address": `qa@test.com`
- [ ] Click "Test"
- [ ] **Expected:** Either success or error message (depends on SMTP server)
- [ ] **Screenshot:** `smtp-test-result.png`

#### TC-SMTP-007: Reset Form
- [ ] Change SMTP Host to `different.server.com`
- [ ] Click "Reset"
- [ ] **Expected:** Form reverts to last saved values
- [ ] **Screenshot:** `smtp-reset.png`

#### TC-SMTP-008: Data Persistence
- [ ] Reload page (F5)
- [ ] **Expected:** All saved values still present
- [ ] **Screenshot:** `smtp-persistence.png`

---

## Test 2: Proxy Server Configuration (10 minutes)

**URL:** http://localhost:5173/settings/system-settings/proxy-server

### Test Cases

#### TC-PROXY-001: Page Load
- [ ] Page loads without errors
- [ ] Title shows "Proxy Server Configurations"
- [ ] "Enable Proxy Server" toggle visible
- [ ] **Screenshot:** `proxy-page-load.png`

#### TC-PROXY-002: Enable Proxy
- [ ] Toggle "Enable Proxy Server" to ON
- [ ] **Expected:** Proxy configuration fields appear
- [ ] **Screenshot:** `proxy-enabled.png`

#### TC-PROXY-003: Required Fields When Enabled
- [ ] Ensure proxy is enabled
- [ ] Leave Host and Port empty
- [ ] Click "Save"
- [ ] **Expected:** Validation errors for Host and Port
- [ ] **Screenshot:** `proxy-validation.png`

#### TC-PROXY-004: Configure Proxy
- [ ] Enable proxy
- [ ] Fill in:
   - Host: `proxy.test.com`
   - Port: `8080`
   - Protocol: `HTTP`
- [ ] Click "Save"
- [ ] **Expected:** Success message
- [ ] **Screenshot:** `proxy-configured.png`

#### TC-PROXY-005: Enable Authentication
- [ ] Check "Enable Authentication"
- [ ] Fill in:
   - Username: `proxyuser`
   - Password: `proxypass123`
- [ ] Click "Save"
- [ ] **Expected:** Success message
- [ ] **Screenshot:** `proxy-auth.png`

#### TC-PROXY-006: Test Connection
- [ ] Click "Test"
- [ ] **Expected:** Test result message (likely failure in dev environment)
- [ ] **Screenshot:** `proxy-test.png`

#### TC-PROXY-007: Disable Proxy
- [ ] Toggle "Enable Proxy Server" to OFF
- [ ] **Expected:** Configuration fields hide
- [ ] Click "Save"
- [ ] **Expected:** Success message
- [ ] **Screenshot:** `proxy-disabled.png`

---

## Test 3: LDAP Server Configuration (15 minutes)

**URL:** http://localhost:5173/settings/system-settings/ldap-server

### Test Cases

#### TC-LDAP-001: Page Load
- [ ] Page loads without errors
- [ ] Title shows "LDAP Server Configurations"
- [ ] Table displays (may be empty)
- [ ] "Create" button visible
- [ ] **Screenshot:** `ldap-page-load.png`

#### TC-LDAP-002: Open Create Modal
- [ ] Click "Create" button
- [ ] **Expected:** Modal opens with title "Create LDAP Server"
- [ ] **Screenshot:** `ldap-create-modal.png`

#### TC-LDAP-003: Required Field Validation
- [ ] In create modal, click "Create" without filling fields
- [ ] **Expected:** Validation errors appear
- [ ] **Screenshot:** `ldap-validation.png`

#### TC-LDAP-004: Create LDAP Configuration
- [ ] Fill in:
   - Name: `Test LDAP Server`
   - Host: `ldap.test.com`
   - Port: `389`
   - FQDN: `dc=test,dc=com`
- [ ] Click "Create"
- [ ] **Expected:** Success message, modal closes, table updates
- [ ] **Screenshot:** `ldap-created.png`

#### TC-LDAP-005: View Configuration
- [ ] Click on LDAP server name in table
- [ ] **Expected:** View modal opens showing details
- [ ] **Screenshot:** `ldap-view-modal.png`

#### TC-LDAP-006: Edit Configuration
- [ ] In view modal, click "Edit"
- [ ] Modify Name to `Updated LDAP Server`
- [ ] Click "Save"
- [ ] **Expected:** Success message
- [ ] **Screenshot:** `ldap-edited.png`

#### TC-LDAP-007: Search Functionality
- [ ] In search box, type "Test"
- [ ] **Expected:** Table filters to show matching LDAP servers
- [ ] **Screenshot:** `ldap-search.png`

#### TC-LDAP-008: Column Filter
- [ ] Click filter icon (funnel icon)
- [ ] Uncheck "Show ID"
- [ ] Click "Apply"
- [ ] **Expected:** ID column hides from table
- [ ] **Screenshot:** `ldap-column-filter.png`

#### TC-LDAP-009: Export
- [ ] Click export button (download icon)
- [ ] **Expected:** CSV file downloads
- [ ] **Screenshot:** `ldap-export.png`

#### TC-LDAP-010: Delete Configuration
- [ ] Click delete icon on an LDAP server
- [ ] **Expected:** Confirmation modal appears
- [ ] Click "Delete"
- [ ] **Expected:** Success message, LDAP server removed from table
- [ ] **Screenshot:** `ldap-deleted.png`

---

## Test 4: Server Settings (10 minutes)

**URL:** http://localhost:5173/settings/system-settings/server-settings

### Test Cases

#### TC-SERVER-001: Page Load
- [ ] Page loads without errors
- [ ] Title shows "Server Settings"
- [ ] All setting cards display
- [ ] **Screenshot:** `server-page-load.png`

#### TC-SERVER-002: Toggle Session Timeout
- [ ] Toggle "Session Timeout" switch
- [ ] **Expected:** Switch changes state
- [ ] **Screenshot:** `server-session-toggle.png`

#### TC-SERVER-003: Configure Session Timeouts
- [ ] Set Session Timeout: `120` minutes
- [ ] Set Session Idle Timeout: `30` minutes
- [ ] **Expected:** Values accept numeric input
- [ ] **Screenshot:** `server-session-config.png`

#### TC-SERVER-004: Validation - Invalid Range
- [ ] Set Session Timeout: `2000` minutes (exceeds max 1440)
- [ ] Click "Save"
- [ ] **Expected:** Validation error or server error
- [ ] **Screenshot:** `server-validation.png`

#### TC-SERVER-005: Validation - Idle > Timeout
- [ ] Set Session Timeout: `60` minutes
- [ ] Set Session Idle Timeout: `90` minutes
- [ ] Click "Save"
- [ ] **Expected:** Error message (frontend OR backend validation)
- [ ] **Bug Note:** This might fail at server level (BUG-002)
- [ ] **Screenshot:** `server-cross-validation.png`

#### TC-SERVER-006: Configure Endpoint Timeouts
- [ ] Set Endpoint Online Status Timeout: `2` hours
- [ ] Set EDCA Scan Job Time: `4` hours
- [ ] **Screenshot:** `server-endpoint-timeouts.png`

#### TC-SERVER-007: Configure Log Level
- [ ] Select Log Level: `Info`
- [ ] **Screenshot:** `server-log-level.png`

#### TC-SERVER-008: Save Settings
- [ ] Set valid values for all fields
- [ ] Click "Save"
- [ ] **Expected:** Green success message "Server settings updated successfully"
- [ ] **Screenshot:** `server-save-success.png`

#### TC-SERVER-009: Reset Form
- [ ] Change Session Timeout to `999`
- [ ] Click "Reset"
- [ ] **Expected:** Form reverts to last saved values
- [ ] **Screenshot:** `server-reset.png`

#### TC-SERVER-010: Data Persistence
- [ ] Configure unique values (e.g., Session Timeout: `90`, Log Level: `Warning`)
- [ ] Click "Save"
- [ ] Reload page (F5)
- [ ] **Expected:** All saved values persist
- [ ] **Screenshot:** `server-persistence.png`

---

## Test 5: Cross-Module Integration (5 minutes)

#### TC-INT-001: Navigation Between Pages
- [ ] Navigate: Mail Server → Proxy Server → LDAP → Server Settings
- [ ] **Expected:** All pages load without errors
- [ ] **Screenshot:** `integration-navigation.png`

#### TC-INT-002: Unsaved Changes (Bug Check)
- [ ] On Mail Server page, change SMTP Host
- [ ] Navigate to Proxy Server page (don't save)
- [ ] Navigate back to Mail Server page
- [ ] **Expected:** Changes are lost (no warning currently - BUG-007)
- [ ] **Screenshot:** `integration-unsaved.png`

#### TC-INT-003: Concurrent Forms
- [ ] Open Mail Server in Tab 1
- [ ] Open Proxy Server in Tab 2
- [ ] Make changes in both tabs
- [ ] Save both
- [ ] **Expected:** Both save successfully, no conflicts

---

## Test 6: Error Handling (5 minutes)

#### TC-ERROR-001: Invalid Email Format
- [ ] In Mail Server, enter: `not-an-email`
- [ ] Click Save
- [ ] **Expected:** Validation error message
- [ ] **Screenshot:** `error-invalid-email.png`

#### TC-ERROR-002: Port Out of Range
- [ ] In Mail Server, enter Port: `99999` (exceeds 65535)
- [ ] Click Save
- [ ] **Expected:** Validation error or server error
- [ ] **Screenshot:** `error-invalid-port.png`

#### TC-ERROR-003: Network Error Simulation
- [ ] Stop backend server
- [ ] Try to save any configuration
- [ ] **Expected:** Error message (network error or connection failed)
- [ ] **Screenshot:** `error-network.png`
- [ ] **Restart backend before continuing**

---

## Test 7: Accessibility & UX (5 minutes)

#### TC-A11Y-001: Form Labels
- [ ] Check all forms have proper labels
- [ ] **Expected:** Every input has associated label

#### TC-A11Y-002: Keyboard Navigation
- [ ] On any form, use Tab key to navigate
- [ ] **Expected:** Can reach all fields via keyboard

#### TC-A11Y-003: Loading States
- [ ] Observe "Save" button when clicking
- [ ] **Expected:** Button shows loading spinner
- [ ] **Screenshot:** `ux-loading-state.png`

#### TC-A11Y-004: Error Messages
- [ ] Trigger validation error
- [ ] **Expected:** Error message is clear and helpful

---

## Post-Test Checklist

- [ ] All screenshots captured and saved
- [ ] Any bugs found documented in bug tracking system
- [ ] Compare actual behavior vs expected behavior
- [ ] Note any performance issues (slow loading, lag)
- [ ] Check browser console for JavaScript errors
- [ ] Verify no errors in backend logs

---

## Bug Reporting Template

When you find a bug, document:

```markdown
**Bug ID:** BUG-XXX
**Severity:** P0/P1/P2/P3
**Test Case:** TC-XXX-XXX
**Steps to Reproduce:**
1. Navigate to...
2. Click...
3. Observe...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshot:** [filename]
**Console Errors:** [paste any errors]
**Additional Notes:** [any other relevant info]
```

---

## Expected Results Summary

At the end of testing, you should have:

1. ✅ **35+ screenshots** documenting all test cases
2. ✅ **Bug list** with any issues found (compare to PHASE3_AGENT22_BUG_LIST.md)
3. ✅ **Test results** for all 50+ test cases above
4. ✅ **Performance notes** (any slow pages, timeouts, etc.)

---

##Known Issues to Verify

From code review, please specifically test:

1. **BUG-001:** Mail Server field names - Does configuration save/load correctly?
2. **BUG-002:** Server Settings validation - Can you set idle timeout > session timeout?
3. **BUG-003:** LDAP test button - Is the disabled state confusing?
4. **BUG-004:** Proxy no-proxy list - Is this field missing?

---

**Total Estimated Time:** 45-60 minutes
**Recommended:** Perform tests in order listed above
**Questions?** Contact development team

**Good luck with testing! 🚀**
