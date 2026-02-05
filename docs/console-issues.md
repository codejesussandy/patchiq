# Console Issues Log

This document tracks console errors and warnings found during UI testing.
**Last Updated:** 2026-02-04

---

## Critical Issues

### 1. API Routing: `/patches/jobs` Returns 400 Bad Request

**Location:** `/patches/jobs` page
**Error:** `ValidationError: Invalid patch ID`
**API Response:**
```json
{"error":"ValidationError","message":"Validation failed","details":{"errors":{"id":"Invalid patch ID"}}}
```

**Root Cause:** The backend route `/v1/patches/:id` is matching before `/v1/patches/jobs`, treating "jobs" as a patch ID.

**Fix Required:** Reorder routes in backend so `/v1/patches/jobs` is defined before `/v1/patches/:id`, or use a different route pattern.

**File:** `backend/src/modules/patches/` (routes configuration)

---

### 2. Missing Frontend Routes

**Location:** Multiple vulnerability pages
**Error:** `No routes matched location "/vulnerability/..."`

| Route | Status |
|-------|--------|
| `/vulnerability/exceptions` | Missing |
| `/vulnerability/jobs` | Missing |
| `/vulnerability/all` | Missing |

**Fix Required:** Add missing route definitions in `frontend/src/App.tsx` or the vulnerability routes configuration.

---

### 3. Failed to Load Assets in Vulnerability Pages

**Location:** `ZeroDayVulnerabilities.tsx:107`, `Vulnerabilities.tsx`
**Error:** `Failed to load assets: [object Object]`

**Stack Trace:**
```
at loadAssets (ZeroDayVulnerabilities.tsx:107:14)
```

**Root Cause:** The `loadAssets` function is failing silently - likely an API call issue or undefined data handling.

**Fix Required:** Add proper error handling and check API response in the `loadAssets` function.

---

## React/Ant Design Warnings

### 4. useForm Not Connected to Form Element

**Location:** Multiple pages (Patches, Add Asset Modal, Patches Deployed)
**Error:** `Warning: Instance created by useForm is not connected to any Form element. Forget to pass form prop?`

**Affected Pages:**
- `/patches` (All Patches)
- `/patches/deployed/bundle`
- `/patches/deployed/catalog`
- Add Asset Modal

**Fix Required:** Pass the `form` prop to the `<Form>` component:
```tsx
const [form] = Form.useForm();
// ...
<Form form={form}>
```

---

### 5. Modal `destroyOnClose` Deprecation

**Location:** Reports page
**Error:** `Warning: [antd: Modal] destroyOnClose is deprecated. Please use destroyOnHidden instead.`

**Fix Required:** Replace `destroyOnClose` with `destroyOnHidden` in Modal components.

---

### 6. Input `addonAfter` Deprecation

**Location:** Add Asset Modal
**Error:** `Warning: [antd: Input] addonAfter is deprecated. Please use Space.Compact instead.`

**Fix Required:** Refactor Input components using `addonAfter` to use `Space.Compact` pattern.

---

## Accessibility Issues

### 7. Form Fields Missing ID/Name Attributes

**Location:** All pages (global)
**Warning:** `A form field element should have an id or name attribute`

**Affected Elements:**
- Global search input (header)
- AI Assistant chat input
- Various filter inputs

**Fix Required:** Add `id` or `name` attributes to form inputs for proper autofill and accessibility.

---

### 8. Incorrect Label `for` Attribute

**Location:** Add Asset Modal
**Warning:** `Incorrect use of <label for=FORM_ELEMENT>`

**Fix Required:** Ensure `<label htmlFor>` matches the corresponding input's `id`.

---

## Summary Table

| Severity | Issue | Pages Affected | Priority |
|----------|-------|----------------|----------|
| Critical | API routing `/patches/jobs` | Patch Jobs | High |
| Critical | Missing vulnerability routes | Vulnerability section | High |
| High | Failed to load assets | Zero Day, Vulnerabilities | High |
| Medium | useForm not connected | Patches, Assets | Medium |
| Low | Modal deprecation | Reports | Low |
| Low | Input deprecation | Add Asset Modal | Low |
| Low | Missing id/name attributes | All pages | Low |
| Low | Incorrect label for | Add Asset Modal | Low |

---

## Testing Notes

**Test Environment:**
- URL: `http://dev.skenzeriq.com:4001`
- User: `admin@patchiq.io`
- Browser: Chrome 144

**Pages Tested:**
- [x] Dashboard
- [x] Assets (All Assets, Software Inventory, Software Licenses, Software Hub)
- [x] Patches (All Patches, Deployed, Test & Approve, Zero Touch, Jobs)
- [x] Vulnerability (Zero Day, Vulnerabilities, Exceptions, Jobs)
- [x] Reports
- [x] Settings (Organization, Jobs)
- [x] Add Asset Modal