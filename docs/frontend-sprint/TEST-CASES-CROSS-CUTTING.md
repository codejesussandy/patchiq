# Test Cases: Cross-Cutting Features - PatchIQ

## Document Information

| Field | Value |
|-------|-------|
| **Category** | Cross-Cutting Features |
| **Version** | 1.0 |
| **Date** | 2026-02-16 |
| **Priority** | P0-P2 (Mixed) |

---

## ⚠️ TEAMMATE USAGE FOR THESE TEST CASES

**These test cases should be executed using Claude Code's teammate tool (Task tool with agents).**

Cross-cutting tests are highly repetitive across 40+ pages. Instead of manually testing pagination on every page, launch agents to test patterns in parallel:

```
Agent 1: Test pagination on 5 list pages (assets, patches, vulnerabilities, jobs, notifications)
Agent 2: Test search on 5 list pages
Agent 3: Test filtering on 5 list pages
Agent 4: Test bulk actions on 5 list pages
```

This approach:
- Tests 20 pages in parallel vs serially
- Ensures consistency (agents follow exact steps)
- Completes in 1 hour vs 4-6 hours manual

See [FRONTEND-QA-ROADMAP.md](./FRONTEND-QA-ROADMAP.md) Appendix C for teammate usage guidelines.

---

## Overview

Cross-cutting features are common patterns and behaviors that apply across all pages and feature areas. These include:

1. **Table & List Features** - Pagination, sorting, filtering, search, bulk operations
2. **Forms & Modals** - Validation, submission, error handling
3. **Error Handling** - Network errors, HTTP status codes, empty states
4. **Responsive Design** - Mobile, tablet, desktop layouts
5. **Performance** - Load times, rendering, network requests
6. **Accessibility** - Keyboard navigation, screen readers, WCAG compliance
7. **Browser Compatibility** - Chrome, Firefox, Safari, Edge

---

## 1. Table & List Features

### TC-TABLE-001: Pagination - Page navigation
**Priority:** P0
**Preconditions:** List page loaded with > 20 items
**Steps:**
1. Note current page number (should be 1)
2. Click "Next Page" button
3. Observe page changes to 2
4. Click "Previous Page" button
5. Observe page returns to 1

**Expected Result:**
- Page number updates in UI
- URL updates with `?page=N` (if syncUrl=true)
- Data loads for correct page
- Pagination controls update (disable Previous on page 1, Next on last page)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-002: Pagination - Page size selection
**Priority:** P0
**Preconditions:** List page loaded
**Steps:**
1. Note default page size (likely 20)
2. Click page size dropdown
3. Select "50"
4. Observe list reloads with 50 items

**Expected Result:**
- List reloads with 50 items per page
- Pagination controls update
- URL updates with `?pageSize=50` (if syncUrl=true)
- Page resets to 1
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-003: Pagination - Jump to page
**Priority:** P2
**Preconditions:** List page loaded with 100+ items
**Steps:**
1. Enter page number 5 in "Go to page" input
2. Press Enter

**Expected Result:**
- Navigates to page 5
- Data loads for page 5
- URL updates with `?page=5`
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-004: Sorting - Single column ascending
**Priority:** P0
**Preconditions:** List page loaded
**Steps:**
1. Click "Name" column header
2. Observe sort indicator (arrow up)

**Expected Result:**
- List sorts by Name ascending (A-Z)
- Arrow icon points up
- URL updates with `?sortBy=name&sortOrder=asc` (if syncUrl=true)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-005: Sorting - Single column descending
**Priority:** P0
**Preconditions:** List sorted ascending by Name
**Steps:**
1. Click "Name" column header again
2. Observe sort indicator (arrow down)

**Expected Result:**
- List sorts by Name descending (Z-A)
- Arrow icon points down
- URL updates with `?sortOrder=desc`
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-006: Sorting - Clear sort
**Priority:** P2
**Preconditions:** List sorted by Name
**Steps:**
1. Click "Clear Sort" button (if exists)

**Expected Result:**
- List returns to default sort order
- Sort indicators removed
- URL clears sort params
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-007: Search - Debounced input
**Priority:** P0
**Preconditions:** List page loaded
**Steps:**
1. Type "test" in search box (without pausing)
2. Wait 500ms
3. Observe results update

**Expected Result:**
- Results don't update on every keystroke (debounced)
- After 500ms, results filter to match "test"
- Loading indicator appears during search
- Pagination resets to page 1
- URL updates with `?search=test` (if syncUrl=true)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-008: Search - Clear search
**Priority:** P1
**Preconditions:** Search active with results
**Steps:**
1. Click "X" icon in search box

**Expected Result:**
- Search input clears
- Results reset to show all items
- URL clears search param
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-009: Search - No results
**Priority:** P1
**Preconditions:** List page loaded
**Steps:**
1. Enter search term that matches nothing (e.g., "zzzzzzzzzzz")
2. Wait for results

**Expected Result:**
- Empty state appears
- Message: "No results found for 'zzzzzzzzzzz'"
- Clear search prompt visible
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-010: Filtering - Open filter drawer
**Priority:** P1
**Preconditions:** List page loaded
**Steps:**
1. Click filter icon/button
2. Observe filter drawer opens

**Expected Result:**
- Drawer slides open from right
- Filter options visible (status, category, date range, etc.)
- Apply/Clear buttons present
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-011: Filtering - Apply single filter
**Priority:** P0
**Preconditions:** Filter drawer open
**Steps:**
1. Select "Active" status filter
2. Click "Apply Filters"

**Expected Result:**
- Drawer closes
- List filters to show only active items
- Filter badge appears: "Status: Active"
- URL updates with `?status=active` (if syncUrl=true)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-012: Filtering - Apply multiple filters
**Priority:** P0
**Preconditions:** Filter drawer open
**Steps:**
1. Select "Active" status filter
2. Select "High" severity filter
3. Click "Apply Filters"

**Expected Result:**
- List filters to show only active items with high severity
- Two filter badges appear
- URL updates with both params
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-013: Filtering - Clear single filter
**Priority:** P1
**Preconditions:** Multiple filters applied
**Steps:**
1. Click "X" on "Status: Active" badge

**Expected Result:**
- Status filter removed
- List updates to remove status filter (severity filter remains)
- Badge removed
- URL updates
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-014: Filtering - Clear all filters
**Priority:** P1
**Preconditions:** Multiple filters applied
**Steps:**
1. Click "Clear All Filters" button

**Expected Result:**
- All filters removed
- List resets to show all items
- All badges removed
- URL clears filter params
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-015: Filtering - Filter persistence on reload
**Priority:** P2
**Preconditions:** Filters applied, syncUrl=true
**Steps:**
1. Apply "Active" status filter
2. Refresh page (F5)

**Expected Result:**
- Filters persist after reload
- Badge still shows "Status: Active"
- List still filtered
- URL params preserved
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-016: Bulk selection - Select all checkbox
**Priority:** P1
**Preconditions:** List page loaded
**Steps:**
1. Click "Select All" checkbox in table header

**Expected Result:**
- All visible items selected (checkboxes checked)
- Selection count updates (e.g., "20 selected")
- Bulk actions toolbar appears
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-017: Bulk selection - Deselect all
**Priority:** P1
**Preconditions:** All items selected
**Steps:**
1. Click "Select All" checkbox again (unchecking)

**Expected Result:**
- All items deselected (checkboxes unchecked)
- Selection count resets to 0
- Bulk actions toolbar hides
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-018: Bulk selection - Select individual items
**Priority:** P1
**Preconditions:** List page loaded
**Steps:**
1. Click checkbox on first item
2. Click checkbox on third item
3. Observe selection count

**Expected Result:**
- Two items selected
- Selection count: "2 selected"
- Bulk actions toolbar appears
- Select All checkbox shows indeterminate state
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-019: Bulk actions - Delete multiple items
**Priority:** P1
**Preconditions:** 3 items selected
**Steps:**
1. Click "Delete" button in bulk actions toolbar
2. Confirm deletion in modal

**Expected Result:**
- Confirmation modal: "Are you sure you want to delete 3 items?"
- After confirm, items deleted
- Success message: "3 items deleted successfully"
- List updates (items removed)
- Selection cleared
- Bulk actions toolbar hides
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-TABLE-020: Export - Export filtered results
**Priority:** P2
**Preconditions:** List filtered (e.g., active items only)
**Steps:**
1. Click "Export" button
2. Select "CSV" format
3. Confirm export

**Expected Result:**
- CSV file downloads
- File contains only filtered items (not all items)
- File name includes timestamp (e.g., `assets_2026-02-16.csv`)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

## 2. Forms & Modals

### TC-FORM-001: Form validation - Required fields
**Priority:** P0
**Preconditions:** Form modal open
**Steps:**
1. Click "Submit" without filling any fields

**Expected Result:**
- Form does not submit
- Required field errors appear (e.g., "Name is required")
- Error messages display below each field
- Submit button remains enabled (or disabled if fields invalid)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-FORM-002: Form validation - Field-level validation
**Priority:** P0
**Preconditions:** Form modal open
**Steps:**
1. Enter invalid email in email field (e.g., "notanemail")
2. Tab to next field

**Expected Result:**
- Email field shows error message: "Invalid email format"
- Field highlighted red
- Submit button disabled (or error shown on submit)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-FORM-003: Form submission - Success
**Priority:** P0
**Preconditions:** Form modal open
**Steps:**
1. Fill all required fields with valid data
2. Click "Submit"

**Expected Result:**
- Submit button shows loading state (spinner)
- Form submits via API POST
- Success message appears: "Item created successfully"
- Modal closes automatically
- List updates to show new item
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-FORM-004: Form submission - API error
**Priority:** P0
**Preconditions:** Form modal open, backend returns 400 error
**Steps:**
1. Fill form with data that triggers validation error (e.g., duplicate name)
2. Click "Submit"

**Expected Result:**
- API returns 400 error
- Error message appears: "An item with this name already exists"
- Modal remains open
- Form fields retain values
- Submit button returns to normal state
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-FORM-005: Form submission - Network error
**Priority:** P1
**Preconditions:** Form modal open, network disconnected
**Steps:**
1. Disconnect network (airplane mode)
2. Fill form and click "Submit"

**Expected Result:**
- Network error detected
- Error message: "Network error. Please check your connection and try again."
- Retry button appears
- Modal remains open
- No console errors (or expected network error)

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-FORM-006: Modal - Close button
**Priority:** P1
**Preconditions:** Modal open
**Steps:**
1. Click "X" close button in modal header

**Expected Result:**
- Modal closes
- Form resets (fields clear)
- Background page still visible
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-FORM-007: Modal - Click outside to close
**Priority:** P2
**Preconditions:** Modal open
**Steps:**
1. Click on backdrop (outside modal)

**Expected Result:**
- Modal closes (if configured)
- OR Modal stays open (if click-outside disabled)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-FORM-008: Modal - Escape key to close
**Priority:** P2
**Preconditions:** Modal open
**Steps:**
1. Press Escape key

**Expected Result:**
- Modal closes
- Form resets
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-FORM-009: Form reset - Cancel button
**Priority:** P1
**Preconditions:** Modal open, form partially filled
**Steps:**
1. Fill first name field
2. Click "Cancel" button

**Expected Result:**
- Modal closes
- Form resets (field clears)
- No data saved
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-FORM-010: Form submission - Loading state
**Priority:** P1
**Preconditions:** Form modal open
**Steps:**
1. Fill form
2. Click "Submit"
3. Observe submit button during API call

**Expected Result:**
- Submit button shows loading spinner
- Submit button disabled during submission
- User cannot double-submit
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

## 3. Error Handling

### TC-ERROR-001: Network error - Fetch failure
**Priority:** P0
**Preconditions:** Network disconnected
**Steps:**
1. Disconnect network
2. Navigate to any page with data fetch

**Expected Result:**
- Loading indicator appears
- After timeout, error message: "Failed to load data. Please check your connection."
- Retry button visible
- No uncaught exceptions in console

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-ERROR-002: HTTP 401 - Unauthorized
**Priority:** P0
**Preconditions:** Expired token in localStorage
**Steps:**
1. Manually expire token
2. Navigate to protected route

**Expected Result:**
- API returns 401
- Axios interceptor catches error
- Redirects to `/login`
- Tokens cleared from localStorage
- Error message: "Session expired. Please log in again."

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-ERROR-003: HTTP 403 - Forbidden
**Priority:** P0
**Preconditions:** User without permission tries restricted action
**Steps:**
1. Log in as read-only user
2. Try to delete an asset

**Expected Result:**
- API returns 403
- Error message: "You do not have permission to perform this action."
- Action does not execute
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-ERROR-004: HTTP 404 - Not Found
**Priority:** P1
**Preconditions:** None
**Steps:**
1. Navigate to `/assets/99999` (non-existent asset)

**Expected Result:**
- API returns 404
- 404 page displays
- Message: "Asset not found"
- Back button or link to assets list
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-ERROR-005: HTTP 500 - Internal Server Error
**Priority:** P1
**Preconditions:** Backend returns 500 error
**Steps:**
1. Trigger action that causes 500 error

**Expected Result:**
- API returns 500
- Error message: "An unexpected error occurred. Please try again later."
- Error logged to console (for debugging)
- User not exposed to stack trace

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-ERROR-006: Empty state - No data
**Priority:** P1
**Preconditions:** List page with 0 items
**Steps:**
1. Navigate to list page with empty data

**Expected Result:**
- Empty state illustration/icon appears
- Message: "No items found"
- Call-to-action: "Create your first item" button
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-ERROR-007: Loading state - Spinner
**Priority:** P1
**Preconditions:** Slow network (throttled)
**Steps:**
1. Throttle network to Slow 3G
2. Navigate to list page

**Expected Result:**
- Loading spinner appears immediately
- Skeleton screens display (if implemented)
- Data loads after delay
- Loading state disappears when data loads
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-ERROR-008: Error boundary - Component crash
**Priority:** P1
**Preconditions:** Component throws error
**Steps:**
1. Navigate to page with buggy component
2. Trigger error (e.g., access undefined property)

**Expected Result:**
- Error boundary catches error
- Fallback UI displays: "Something went wrong"
- Reload button visible
- Error logged to console
- Other parts of app still functional

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

## 4. Responsive Design

### TC-RESPONSIVE-001: Mobile layout (320px)
**Priority:** P1
**Preconditions:** None
**Steps:**
1. Resize browser to 320px width (iPhone SE)
2. Navigate through app

**Expected Result:**
- Layout stacks vertically
- Tables scroll horizontally
- Buttons stack vertically
- Text remains readable (no overflow)
- Touch targets >= 44x44px
- No horizontal scrolling (except tables)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-RESPONSIVE-002: Tablet layout (768px)
**Priority:** P1
**Preconditions:** None
**Steps:**
1. Resize browser to 768px width (iPad)
2. Navigate through app

**Expected Result:**
- 2-column layout where appropriate
- Sidebar collapses to hamburger menu (if mobile-style)
- Tables display more columns
- Touch targets adequate
- No horizontal scrolling
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-RESPONSIVE-003: Desktop layout (1920px)
**Priority:** P0
**Preconditions:** None
**Steps:**
1. Resize browser to 1920px width (Full HD)
2. Navigate through app

**Expected Result:**
- Full multi-column layout
- Sidebar expanded
- All table columns visible
- No wasted whitespace
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-RESPONSIVE-004: Orientation change
**Priority:** P2
**Preconditions:** Mobile device or simulator
**Steps:**
1. Open app in portrait orientation
2. Rotate to landscape
3. Rotate back to portrait

**Expected Result:**
- Layout adapts to orientation
- No layout breaks
- Data persists across rotation
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

## 5. Performance

### TC-PERF-001: Page load time
**Priority:** P1
**Preconditions:** None
**Steps:**
1. Open Chrome DevTools > Network tab
2. Hard refresh (Cmd+Shift+R)
3. Note "DOMContentLoaded" and "Load" times

**Expected Result:**
- DOMContentLoaded < 1.5 seconds
- Load complete < 3 seconds
- Lighthouse Performance score >= 85
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-PERF-002: List rendering with 1000+ items
**Priority:** P1
**Preconditions:** Database seeded with 1000+ assets
**Steps:**
1. Navigate to assets list
2. Observe rendering performance

**Expected Result:**
- Pagination limits to 100 items max per page
- Virtual scrolling implemented (if long list)
- No UI freezing
- Scrolling remains smooth
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-PERF-003: Search latency
**Priority:** P1
**Preconditions:** List page loaded
**Steps:**
1. Open Chrome DevTools > Performance tab
2. Start recording
3. Type search query
4. Stop recording after results appear

**Expected Result:**
- Search results appear within 500ms
- No jank (frame drops)
- Debounce works (no API call per keystroke)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-PERF-004: Bundle size
**Priority:** P2
**Preconditions:** Production build
**Steps:**
1. Run `npm run build`
2. Check `dist/` folder size
3. Check bundle analyzer (if available)

**Expected Result:**
- Main bundle < 500KB gzipped
- Vendor bundle < 1MB gzipped
- Code splitting implemented (lazy loading)
- Tree shaking applied
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-PERF-005: Network requests
**Priority:** P2
**Preconditions:** List page loaded
**Steps:**
1. Open Chrome DevTools > Network tab
2. Hard refresh
3. Count HTTP requests

**Expected Result:**
- < 50 requests on initial load
- Assets cached (304 Not Modified on reload)
- API calls deduplicated (React Query)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

## 6. Accessibility

### TC-A11Y-001: Keyboard navigation - Tab order
**Priority:** P1
**Preconditions:** Login page loaded
**Steps:**
1. Press Tab repeatedly
2. Observe focus order: Email field → Password field → Submit button

**Expected Result:**
- Focus moves in logical order
- Focus indicator visible (outline or highlight)
- No focus traps
- No invisible focusable elements
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-A11Y-002: Keyboard navigation - Enter to submit
**Priority:** P1
**Preconditions:** Form filled
**Steps:**
1. Fill form
2. Press Enter key

**Expected Result:**
- Form submits (same as clicking Submit button)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-A11Y-003: Keyboard navigation - Escape to close modal
**Priority:** P1
**Preconditions:** Modal open
**Steps:**
1. Press Escape key

**Expected Result:**
- Modal closes
- Focus returns to trigger element
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-A11Y-004: Screen reader - Form labels
**Priority:** P1
**Preconditions:** Screen reader enabled (VoiceOver, NVDA)
**Steps:**
1. Navigate to form
2. Tab to each field
3. Observe screen reader announcement

**Expected Result:**
- Each field announces label (e.g., "Email, edit text")
- Required fields announce "required"
- Error messages announced
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-A11Y-005: Screen reader - Buttons
**Priority:** P1
**Preconditions:** Screen reader enabled
**Steps:**
1. Navigate to button
2. Observe screen reader announcement

**Expected Result:**
- Button announces label and role (e.g., "Submit, button")
- Icon-only buttons have aria-label
- Disabled state announced
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-A11Y-006: Color contrast
**Priority:** P1
**Preconditions:** None
**Steps:**
1. Run axe DevTools audit
2. Check color contrast report

**Expected Result:**
- Text contrast ratio >= 4.5:1 (WCAG AA)
- Large text >= 3:1
- Interactive elements >= 3:1
- No contrast failures

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-A11Y-007: Focus indicator visibility
**Priority:** P1
**Preconditions:** None
**Steps:**
1. Tab through page
2. Observe focus indicators

**Expected Result:**
- Focus indicator visible on all interactive elements
- Indicator has sufficient contrast (3:1)
- Indicator not obscured by other elements
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-A11Y-008: Alt text for images
**Priority:** P1
**Preconditions:** Page with images
**Steps:**
1. Inspect images
2. Check for alt attributes

**Expected Result:**
- All content images have descriptive alt text
- Decorative images have alt=""
- Icons have aria-label or title
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-A11Y-009: ARIA attributes
**Priority:** P2
**Preconditions:** None
**Steps:**
1. Run axe DevTools audit
2. Check ARIA report

**Expected Result:**
- No invalid ARIA attributes
- Required ARIA roles present (dialogs, alerts, etc.)
- Live regions used for dynamic content
- No ARIA violations

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

## 7. Browser Compatibility

### TC-BROWSER-001: Chrome (latest)
**Priority:** P0
**Preconditions:** Chrome 120+ installed
**Steps:**
1. Open app in Chrome
2. Navigate through all major pages
3. Test key features

**Expected Result:**
- All features work correctly
- Layout renders properly
- No console errors
- Performance acceptable

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-BROWSER-002: Firefox (latest)
**Priority:** P0
**Preconditions:** Firefox 120+ installed
**Steps:**
1. Open app in Firefox
2. Navigate through all major pages
3. Test key features

**Expected Result:**
- All features work correctly
- Layout renders properly
- No console errors
- Performance acceptable

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-BROWSER-003: Safari (latest)
**Priority:** P0
**Preconditions:** Safari 17+ installed (macOS)
**Steps:**
1. Open app in Safari
2. Navigate through all major pages
3. Test key features

**Expected Result:**
- All features work correctly
- Layout renders properly
- No console errors
- Performance acceptable

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-BROWSER-004: Edge (latest)
**Priority:** P0
**Preconditions:** Edge 120+ installed
**Steps:**
1. Open app in Edge
2. Navigate through all major pages
3. Test key features

**Expected Result:**
- All features work correctly
- Layout renders properly
- No console errors
- Performance acceptable

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-BROWSER-005: Mobile Safari (iOS)
**Priority:** P1
**Preconditions:** iOS 16+ device or simulator
**Steps:**
1. Open app in Mobile Safari
2. Navigate through key pages
3. Test touch interactions

**Expected Result:**
- Mobile layout renders
- Touch targets adequate (44x44px)
- Gestures work (swipe, pinch)
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

### TC-BROWSER-006: Chrome Mobile (Android)
**Priority:** P1
**Preconditions:** Android 12+ device or emulator
**Steps:**
1. Open app in Chrome Mobile
2. Navigate through key pages
3. Test touch interactions

**Expected Result:**
- Mobile layout renders
- Touch targets adequate
- Performance acceptable
- No console errors

**Actual Result:** [To be filled]
**Status:** [Pass/Fail]
**Notes:**

---

**End of Test Cases**
