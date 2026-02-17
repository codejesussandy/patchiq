# Phase 3 - Agent 22: System Settings - Bug List

**Module:** Settings - System Settings
**Date:** 2026-02-17
**Status:** Code Review Complete, Manual Testing Required

---

## P0 Issues (Critical - Blocks Release)

**None identified.**

---

## P1 Issues (High Priority - Fix Before Release)

### BUG-001: Field Name Mismatch in Mail Server Configuration
- **Severity:** P1
- **Component:** `/frontend/src/pages/settings/MailServerConfiguration.tsx`
- **Type:** Data Mapping Issue
- **Description:** Frontend form uses different field names than backend API expects
  - Frontend: `smtpHost`, `smtpPort`, `email`
  - Backend: `host`, `port`, `fromAddress`
- **Impact:** SMTP configuration may fail to save or load correctly
- **Steps to Reproduce:**
  1. Navigate to Mail Server Configuration page
  2. Fill in SMTP details
  3. Click Save
  4. Reload page
  5. Verify if configuration persisted correctly
- **Expected Behavior:** Configuration should save and reload with all values intact
- **Actual Behavior:** Field name mismatch may cause data loss or incorrect mapping
- **Code Location:**
  ```typescript
  // MailServerConfiguration.tsx, lines 65-107
  <Form.Item name="smtpHost" ...>  // Should be "host"
  <Form.Item name="smtpPort" ...>  // Should be "port"
  <Form.Item name="email" ...>     // Should be "fromAddress"
  ```
- **Fix Recommendation:**
  ```typescript
  // Option 1: Update form field names
  <Form.Item name="host" label="SMTP Host" ...>
  <Form.Item name="port" label="SMTP Port" ...>
  <Form.Item name="fromAddress" label="Email" ...>

  // Option 2: Transform data in onFinish
  const onFinish = async (values: MailServerConfig) => {
    const transformed = {
      host: values.smtpHost,
      port: values.smtpPort,
      fromAddress: values.email,
      // ... other fields
    };
    await updateConfigMutation.mutateAsync(transformed);
  };
  ```
- **Test Case:** Validate save/load cycle after fix

---

## P2 Issues (Medium Priority - Should Fix)

### BUG-002: Missing Frontend Validation for Session Timeouts
- **Severity:** P2
- **Component:** `/frontend/src/pages/settings/ServerSettings.tsx`
- **Type:** Validation Gap
- **Description:** Backend validates `sessionIdleTimeoutMinutes <= sessionTimeoutMinutes` but frontend doesn't
- **Impact:** Users can submit invalid values and receive server error instead of immediate feedback
- **Steps to Reproduce:**
  1. Navigate to Server Settings
  2. Set Session Timeout to 60 minutes
  3. Set Session Idle Timeout to 90 minutes
  4. Click Save
  5. Observe server validation error
- **Expected Behavior:** Frontend should prevent submission and show validation error immediately
- **Actual Behavior:** Form submits, server returns error
- **Code Location:** `ServerSettings.tsx` form validation
- **Fix Recommendation:**
  ```typescript
  <Form
    form={form}
    rules={[
      ({ getFieldValue }) => ({
        validator(_, value) {
          const sessionTimeout = getFieldValue('sessionTimeoutMinutes');
          if (value && sessionTimeout && value > sessionTimeout) {
            return Promise.reject('Idle timeout must be less than or equal to session timeout');
          }
          return Promise.resolve();
        },
      }),
    ]}
  >
  ```

### BUG-003: Test Connection Button UX Confusion (LDAP)
- **Severity:** P2
- **Component:** `/frontend/src/pages/settings/LDAPServerConfiguration.tsx`
- **Type:** UX Issue
- **Description:** Test button disabled in create mode with message "Save the configuration first to test"
- **Impact:** Users confused about workflow - must save first, then re-open to test
- **Steps to Reproduce:**
  1. Click "Create" to open LDAP modal
  2. Fill in valid LDAP details
  3. Observe "Test" button is disabled with tooltip
- **Expected Behavior:** Either allow testing with form values OR hide button with clear message
- **Actual Behavior:** Button shown but disabled - unclear UX
- **Code Location:** Line 285 in `LDAPServerConfiguration.tsx`
- **Fix Recommendation:**
  ```typescript
  // Option 1: Hide button in create mode
  {editingConfig && (
    <Button key="test" onClick={handleTestConnection} ...>
      Test
    </Button>
  )}

  // Option 2: Allow test with form values
  const handleTestConnection = async () => {
    const values = await form.validateFields();
    // Create temporary config for testing
    await testConfigMutation.mutateAsync({ testData: values });
  };
  ```

### BUG-004: Missing noProxyList Field in Proxy Configuration
- **Severity:** P2
- **Component:** `/frontend/src/pages/settings/ProxyServerConfiguration.tsx`
- **Type:** Missing Feature
- **Description:** TypeScript type defines `noProxyList?: string[]` but UI doesn't expose this field
- **Impact:** Users cannot configure proxy bypass list (e.g., localhost, internal IPs)
- **Steps to Reproduce:**
  1. Navigate to Proxy Server Configuration
  2. Enable proxy
  3. Look for "No Proxy List" or bypass configuration
  4. Field not present
- **Expected Behavior:** Should have field to add/remove domains/IPs that bypass proxy
- **Actual Behavior:** Field missing
- **Code Location:** `ProxyServerConfiguration.tsx`
- **Fix Recommendation:**
  ```typescript
  <Form.List name="noProxyList">
    {(fields, { add, remove }) => (
      <>
        {fields.map((field) => (
          <Form.Item key={field.key} label={`Bypass ${field.key + 1}`}>
            <Input placeholder="e.g., localhost, 192.168.*" />
            <Button onClick={() => remove(field.name)}>Remove</Button>
          </Form.Item>
        ))}
        <Button onClick={() => add()}>Add Bypass Rule</Button>
      </>
    )}
  </Form.List>
  ```

---

## P3 Issues (Low Priority - Nice to Have)

### BUG-005: No Loading Skeleton During Initial Data Fetch
- **Severity:** P3
- **Components:** All settings pages
- **Type:** UX Enhancement
- **Description:** Pages show empty/blank while loading initial configuration data
- **Impact:** Poor UX on slow networks - user unsure if page is loading
- **Fix Recommendation:** Add Ant Design Skeleton components
  ```typescript
  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }
  ```

### BUG-006: Client-Side CSV Export Limitation (LDAP)
- **Severity:** P3
- **Component:** `LDAPServerConfiguration.tsx`
- **Type:** Enhancement Opportunity
- **Description:** Export generates CSV client-side - inefficient for large datasets
- **Impact:** May freeze browser with thousands of LDAP configs
- **Fix Recommendation:** Implement server-side export endpoint
  ```typescript
  // Backend: GET /settings/ldap-configs/export?format=csv
  // Returns streaming CSV response
  ```

### BUG-007: Missing Unsaved Changes Warning
- **Severity:** P3
- **Components:** All settings pages
- **Type:** UX Enhancement
- **Description:** No warning when navigating away from page with unsaved form changes
- **Impact:** Users may lose unsaved work
- **Fix Recommendation:** Implement route blocking with React Router
  ```typescript
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      form.isFieldsTouched() &&
      currentLocation.pathname !== nextLocation.pathname
  );
  ```

---

## Test Environment Issues

### TEST-001: Automated Test Navigation Timeouts
- **Severity:** Test Infrastructure
- **Description:** All Playwright tests timeout when navigating to `/settings/system-settings/*` routes
- **Root Cause:** Unknown - possible authentication middleware delays or lazy loading issues
- **Impact:** Cannot run automated E2E tests
- **Workaround:** Manual testing checklist provided in main report
- **Investigation Needed:**
  - Check network tab during navigation
  - Add logging to route middleware
  - Verify lazy component loading
  - Test in isolation (without full app context)

---

## Summary Statistics

| Severity | Count | Status |
|----------|-------|--------|
| P0 | 0 | - |
| P1 | 1 | Open |
| P2 | 3 | Open |
| P3 | 3 | Open |
| **Total** | **7** | **All Open** |

---

## Recommended Fix Order

1. **BUG-001** (P1) - Field Name Mismatch in Mail Server - **CRITICAL**
2. **BUG-002** (P2) - Session Timeout Validation - **HIGH**
3. **BUG-003** (P2) - LDAP Test Button UX - **MEDIUM**
4. **BUG-004** (P2) - Proxy Bypass List Field - **MEDIUM**
5. **BUG-005-007** (P3) - UX Enhancements - **LOW**

---

## Next Steps

1. ✅ **Code Review Complete** - This document
2. ⏳ **Manual Testing Required** - Use checklist in PHASE3_AGENT22_SYSTEM_SETTINGS_REPORT.md
3. ⏳ **Fix P1 Issues** - BUG-001 must be fixed before release
4. ⏳ **Fix P2 Issues** - Should be addressed in current sprint
5. ⏳ **Consider P3 Enhancements** - For future sprints

---

**Document Status:** Final
**Last Updated:** 2026-02-17
**Next Review:** After manual testing completion
