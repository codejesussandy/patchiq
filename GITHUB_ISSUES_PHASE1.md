# GitHub Issues - Phase 1 Frontend QA Testing

**Generated:** 2026-02-16
**Source:** Phase 1 Frontend QA Roadmap Testing
**Total Issues:** 15 (8 P1, 4 P2, 3 P3)

---

## P1 - Critical Issues (8)

### Issue #1: [Assets] Severe Performance Degradation - 17.2s Page Load Time

**Labels:** `bug`, `P1-critical`, `performance`, `assets`, `frontend`

**Description:**
The Assets list page takes 17.2 seconds to load, which is 5.7x over the acceptable threshold of 3 seconds. This severely impacts user experience and may cause users to abandon the page.

**Steps to Reproduce:**
1. Log in as admin (admin@patchiq.io / admin123)
2. Navigate to `/assets`
3. Observe page load time

**Expected Behavior:**
- Page should load in < 3 seconds
- Data should appear progressively if needed

**Actual Behavior:**
- Page takes 17.2 seconds to fully load
- User sees blank screen during load
- No loading indicators or progressive rendering

**Root Cause:**
- Large dataset loaded without pagination
- Inefficient database queries
- No React Query caching enabled
- Possible N+1 query issues

**Suggested Fix:**
1. Implement server-side pagination (default 50 items)
2. Add database indexes on frequently queried columns
3. Enable React Query caching with 30s stale time
4. Add loading skeleton/spinner
5. Consider virtual scrolling for large lists

**Impact:**
- **Severity:** HIGH - Affects all users viewing assets
- **User Experience:** CRITICAL - Users may think app is broken
- **Business Impact:** May prevent adoption

**Screenshots:**
- See: `screenshots/assets-list-initial.png`

**Test Evidence:**
- Documented in: `PHASE1_AGENT5_ASSETS_REPORT.md`
- Playwright test: `frontend/e2e/phase1-agent5-assets.spec.ts` (line 70-110)

**Estimated Fix Time:** 4-6 hours

**Priority:** P1 - Must fix before production

---

### Issue #2: [Assets] Table Rows Not Clickable - aria-hidden Attribute Blocking Interaction

**Labels:** `bug`, `P1-critical`, `accessibility`, `assets`, `frontend`

**Description:**
All table rows in the Assets list have the `aria-hidden="true"` attribute, which prevents users from clicking on rows to view asset details. This completely blocks the asset detail view and edit workflows.

**Steps to Reproduce:**
1. Navigate to `/assets`
2. Try to click on any asset row in the table
3. Observe: Nothing happens, no navigation occurs

**Expected Behavior:**
- Clicking a row should navigate to `/assets/:id`
- User should see asset detail page

**Actual Behavior:**
- Rows are not clickable
- No cursor change on hover
- No navigation occurs
- Console shows: Elements have `aria-hidden="true"`

**Root Cause:**
- Ant Design Table component misconfiguration
- Incorrect accessibility props applied to data rows
- Likely related to `onRow` handler not being set

**Suggested Fix:**
```tsx
// In AllAssets.tsx or similar
<Table
  columns={columns}
  dataSource={assets}
  onRow={(record) => ({
    onClick: () => navigate(`/assets/${record.id}`),
    style: { cursor: 'pointer' }
  })}
  // Remove or fix aria-hidden configuration
/>
```

**Impact:**
- **Severity:** CRITICAL - Blocks 2 major workflows
- **Affected Features:**
  - Asset detail view (completely inaccessible)
  - Asset editing (depends on detail view)
- **Workaround:** None

**Screenshots:**
- See: `screenshots/assets-list-initial.png`
- Browser DevTools: Shows `aria-hidden="true"` on all `<tr>` elements

**Test Evidence:**
- Test failure: `frontend/e2e/phase1-agent5-assets.spec.ts` (Test 8: View Detail)
- Error: Cannot click rows, navigation blocked

**Estimated Fix Time:** 1-2 hours

**Priority:** P1 - Critical blocker for detail views

---

### Issue #3: [Assets] Search Input Hidden/Inaccessible

**Labels:** `bug`, `P1-critical`, `ui`, `assets`, `frontend`

**Description:**
The search input box exists in the DOM but is not visible or interactable. Users cannot search for assets by hostname, IP, or other fields.

**Steps to Reproduce:**
1. Navigate to `/assets`
2. Look for search input box
3. Observe: Input exists in DOM but is hidden

**Expected Behavior:**
- Search input should be visible at top of page
- User should be able to type and filter results in real-time

**Actual Behavior:**
- Search input has CSS that hides it
- Element exists: `<input placeholder="Search..." class="ant-input" />`
- CSS properties: `visibility: hidden` or `display: none` or `z-index` issue

**Root Cause:**
- CSS visibility issue
- Possible parent container `display: none`
- Z-index stacking context problem
- Conflicting styles

**Suggested Fix:**
1. Inspect element styles with DevTools
2. Check parent containers for `display: none`
3. Verify z-index and positioning
4. Remove conflicting CSS rules
5. Ensure search component is properly rendered

**Impact:**
- **Severity:** HIGH - Core search functionality unusable
- **User Experience:** Cannot find specific assets in large lists
- **Workaround:** Manual scrolling/pagination only

**Screenshots:**
- See: `screenshots/assets-list-initial.png`
- Browser DevTools: Element present but not visible

**Test Evidence:**
- Test failure: `frontend/e2e/phase1-agent5-assets.spec.ts` (Test 3: Search)
- Playwright error: "Element is not visible"

**Estimated Fix Time:** 30 minutes

**Priority:** P1 - Core feature broken

---

### Issue #4: [Patches] Missing Clickable Links to Patch Detail Pages

**Labels:** `bug`, `P1-critical`, `navigation`, `patches`, `frontend`

**Description:**
Patch table rows have no clickable links to navigate to individual patch detail pages. Users cannot view KB numbers, descriptions, CVEs, affected assets, or deploy patches.

**Steps to Reproduce:**
1. Navigate to `/patches`
2. Try to click on any patch in the table
3. Observe: No navigation occurs, cannot access detail page

**Expected Behavior:**
- Clicking patch name or row should navigate to `/patches/:id`
- Detail page should show KB number, CVEs, affected assets, deployment options

**Actual Behavior:**
- Table rows are not clickable
- No links visible in table
- Cannot access patch details
- Deploy workflow blocked

**Root Cause:**
- Missing `Link` component in table column render functions
- Table columns render plain text instead of clickable links

**Suggested Fix:**
```tsx
// In AllPatches.tsx columns definition
{
  title: 'Patch Name',
  dataIndex: 'name',
  key: 'name',
  render: (text, record) => (
    <Link to={`/patches/${record.id}`}>{text}</Link>
  ),
}

// OR add onRow handler
<Table
  onRow={(record) => ({
    onClick: () => navigate(`/patches/${record.id}`),
    style: { cursor: 'pointer' }
  })}
/>
```

**Impact:**
- **Severity:** CRITICAL - Blocks multiple workflows
- **Affected Features:**
  - Patch detail view
  - Deployment creation
  - CVE information access
  - Affected assets view
- **Workaround:** None

**Screenshots:**
- See: `screenshots/patches-list-initial.png`

**Test Evidence:**
- Test skipped: `frontend/e2e/patches-agent6.spec.ts` (Test 4: Detail Page)
- Documented: `PHASE1_AGENT6_PATCHES_REPORT.md`

**Estimated Fix Time:** 1-2 hours

**Priority:** P1 - Critical navigation blocker

---

### Issue #5: [Patches] Multiple API 400 Bad Request Errors

**Labels:** `bug`, `P1-critical`, `api`, `patches`, `backend`, `frontend`

**Description:**
Multiple API calls in the Patches module are returning 400 Bad Request errors, causing features to fail or data to not load properly.

**Steps to Reproduce:**
1. Navigate to `/patches`
2. Open browser DevTools → Network tab
3. Observe multiple API calls with 400 status

**Expected Behavior:**
- All API calls should return 200/201 status
- Data should load successfully
- No error messages in console

**Actual Behavior:**
- Multiple 400 errors logged in console
- Some features may fail silently
- Data may be incomplete

**API Endpoints Affected:**
- Exact endpoints need investigation
- Likely related to patch list, filters, or search

**Root Cause (Suspected):**
- Invalid request payload format
- Missing required fields in API requests
- Data validation failures on backend
- Schema mismatch between frontend and backend

**Suggested Fix:**
1. Enable verbose API logging
2. Capture failing request payloads
3. Compare with API schema/validators
4. Fix request format on frontend OR
5. Fix validation rules on backend
6. Add error handling and user feedback

**Impact:**
- **Severity:** HIGH - Features may fail
- **User Experience:** Data may not load, features broken
- **Scope:** Multiple features affected

**Console Output:**
```
POST /api/patches 400 Bad Request
Error: Validation failed: [field] is required
```

**Test Evidence:**
- Console errors documented: `PHASE1_AGENT6_PATCHES_REPORT.md`
- 12 console errors detected during testing

**Estimated Fix Time:** 2-4 hours

**Priority:** P1 - Data integrity and feature functionality

---

### Issue #6: [Patches] Sorting Crashes with Null Pointer Error

**Labels:** `bug`, `P1-critical`, `sorting`, `patches`, `frontend`

**Description:**
When sorting patch table columns, the application throws `TypeError: Cannot read properties of null (reading 'localeCompare')` and crashes the sort operation.

**Steps to Reproduce:**
1. Navigate to `/patches`
2. Click any sortable column header (e.g., "Date", "Severity")
3. Observe error in console and sorting fails

**Expected Behavior:**
- Columns should sort correctly in ascending/descending order
- Null values should be handled gracefully

**Actual Behavior:**
- Error thrown: `TypeError: Cannot read properties of null (reading 'localeCompare')`
- Sorting operation fails
- Table may enter error state

**Root Cause:**
- Missing null checks in sort comparator functions
- Some patch records have null values in sortable fields
- `.localeCompare()` called on null values

**Code Location:**
- Likely in: `frontend/src/pages/patches/AllPatches.tsx`
- Column definitions with `sorter` functions

**Suggested Fix:**
```tsx
// Before (BROKEN):
sorter: (a, b) => a.field.localeCompare(b.field)

// After (FIXED):
sorter: (a, b) => (a?.field || '').localeCompare(b?.field || '')

// OR with explicit null handling:
sorter: (a, b) => {
  const aVal = a?.field ?? '';
  const bVal = b?.field ?? '';
  return aVal.localeCompare(bVal);
}
```

**Impact:**
- **Severity:** HIGH - Core feature broken
- **User Experience:** Cannot sort data, frustrating
- **Workaround:** None

**Console Output:**
```
TypeError: Cannot read properties of null (reading 'localeCompare')
    at sorter (AllPatches.tsx:123)
```

**Test Evidence:**
- 2 sorting errors in console logs
- Documented: `PHASE1_AGENT6_PATCHES_REPORT.md`

**Estimated Fix Time:** 30 minutes

**Priority:** P1 - Data display feature

---

### Issue #7: [User Management] User Names Display as "undefined undefined"

**Labels:** `bug`, `P1-critical`, `data-layer`, `user-management`, `frontend`, `backend`

**Description:**
All user names in the User Management list display as "undefined undefined" instead of showing actual user names (firstName + lastName).

**Steps to Reproduce:**
1. Navigate to `/settings/user-management/users`
2. Observe "Name" column in user table
3. All entries show: "undefined undefined"

**Expected Behavior:**
- User names should display as: "John Doe", "Jane Smith", etc.
- Format: `${firstName} ${lastName}`

**Actual Behavior:**
- All names show: "undefined undefined"
- Indicates firstName and lastName are undefined
- Cannot identify users

**Root Cause (Suspected):**
- User model missing `firstName` and `lastName` fields
- API response doesn't include name fields
- Frontend expecting different field names than backend provides
- Data mapping issue in React Query hook or service

**Possible Causes:**
1. **Backend:** User model doesn't have firstName/lastName fields
2. **Frontend:** Mapping to wrong field names
3. **Database:** Columns don't exist or aren't populated

**Suggested Fix:**
1. Verify user schema in `backend/src/db/prisma/schema.prisma`
2. Check API response: `GET /api/settings/users`
3. Fix field mapping in `frontend/src/hooks/useUsers.ts` or service
4. Update seed data to include names

**Impact:**
- **Severity:** CRITICAL - Cannot identify users
- **User Experience:** Unusable, unprofessional
- **RBAC:** Cannot see who has what permissions

**Screenshots:**
- See: `screenshots/user-management/user-list.png`

**Test Evidence:**
- Documented: `PHASE1_AGENT8_USER_MANAGEMENT_REPORT.md`
- Issue #1 in report

**Estimated Fix Time:** 1-2 hours

**Priority:** P1 - Core data display

---

### Issue #8: [User Management] Newly Created Users Don't Appear in List

**Labels:** `bug`, `P1-critical`, `react-query`, `user-management`, `frontend`

**Description:**
After successfully creating a new user, the user list doesn't refresh to show the newly created user. Users must manually refresh the page to see the new entry.

**Steps to Reproduce:**
1. Navigate to `/settings/user-management/users`
2. Click "Create User" button
3. Fill form with valid data
4. Click "Submit"
5. Observe: Success message appears
6. Observe: New user NOT in list

**Expected Behavior:**
- After successful user creation, list should automatically refresh
- New user should appear at top of list
- No manual page refresh required

**Actual Behavior:**
- Success message shows
- List remains unchanged
- User must press F5 to see new user
- Gives impression that creation failed

**Root Cause:**
- Missing React Query cache invalidation after mutation
- `useMutation` not invalidating `useUsers` query
- Cache not being updated with new user data

**Code Location:**
- Likely: `frontend/src/hooks/useUsers.ts`
- `useCreateUser` mutation hook

**Suggested Fix:**
```tsx
// In useCreateUser mutation hook
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => userService.createUser(data),
    onSuccess: () => {
      // Add this line:
      queryClient.invalidateQueries(['users']);
      // OR optimistically update:
      queryClient.setQueryData(['users'], (old) => [...old, newUser]);
    }
  });
};
```

**Impact:**
- **Severity:** HIGH - Confusing UX
- **User Experience:** Users think creation failed
- **Workaround:** Manual page refresh

**Test Evidence:**
- Documented: `PHASE1_AGENT8_USER_MANAGEMENT_REPORT.md`
- Tests 6 & 7 skipped due to this issue

**Estimated Fix Time:** 30 minutes

**Priority:** P1 - Core CRUD functionality

---

## P2 - High Priority Issues (4)

### Issue #9: [Dashboard/Login] Branding Inconsistency - Shows "InventIQ" Instead of "PatchIQ"

**Labels:** `bug`, `P2-high`, `branding`, `ui`, `dashboard`, `login`

**Description:**
The login page displays "Welcome to InventIQ" instead of "Welcome to PatchIQ", creating brand confusion.

**Steps to Reproduce:**
1. Navigate to `/login`
2. Observe welcome message

**Expected Behavior:**
- Message should say: "Welcome to PatchIQ"

**Actual Behavior:**
- Message says: "Welcome to InventIQ"

**Root Cause:**
- Hardcoded string not updated after rebrand
- Config file still has old brand name

**Suggested Fix:**
1. Update login page component
2. Search codebase for "InventIQ" and replace with "PatchIQ"
3. Update any config files

**Impact:**
- **Severity:** MEDIUM - Cosmetic but unprofessional
- **Brand:** Creates confusion

**Screenshots:**
- See: `frontend/test-results/*/test-failed-1.png`

**Estimated Fix Time:** 15 minutes

**Priority:** P2 - Should fix before production

---

### Issue #10: [Assets] Console Errors During Page Load

**Labels:** `bug`, `P2-high`, `console`, `assets`, `frontend`

**Description:**
Three console errors detected during Assets page testing. These may indicate underlying issues.

**Steps to Reproduce:**
1. Open browser DevTools console
2. Navigate to `/assets`
3. Observe console errors

**Expected Behavior:**
- Zero console errors
- Clean console output

**Actual Behavior:**
- 3 errors appear in console

**Errors:**
1. Test infrastructure error (ReferenceError in afterAll)
2. Search input visibility issue
3. Table rows aria-hidden issue

**Suggested Fix:**
- Investigate each error
- Fix underlying causes
- Verify no errors remain

**Impact:**
- **Severity:** MEDIUM - May indicate bugs
- **User Experience:** Possible hidden issues

**Estimated Fix Time:** 1-2 hours

**Priority:** P2 - Code quality

---

### Issue #11: [Patches] Patch Repository/Catalog Route Missing

**Labels:** `bug`, `P2-high`, `routing`, `patches`, `frontend`

**Description:**
No route exists for `/patches/repository` or `/patches/catalog`. Feature may be incomplete or documentation outdated.

**Steps to Reproduce:**
1. Navigate to `/patches/repository`
2. Observe: 404 or route not found

**Expected Behavior:**
- Route should exist and display patch repository/catalog
- OR documentation should be updated if feature not implemented

**Actual Behavior:**
- Route doesn't exist
- 404 or redirect

**Root Cause:**
- Feature not yet implemented
- Route not added to router config
- Documentation mentions feature that doesn't exist

**Suggested Fix:**
1. Clarify if this feature should exist
2. If yes: Implement route and page component
3. If no: Update documentation to remove references

**Impact:**
- **Severity:** MEDIUM - Feature gap or doc issue
- **User Experience:** Broken link or missing feature

**Estimated Fix Time:** 2-4 hours (if implementing new feature)

**Priority:** P2 - Feature completeness

---

### Issue #12: [User Management] Role and Organization Fields Show Dashes (Missing Data)

**Labels:** `bug`, `P2-high`, `data-layer`, `user-management`, `backend`

**Description:**
The "Role" and "Organization" columns in the user list display "—" (dashes) instead of actual role and organization names.

**Steps to Reproduce:**
1. Navigate to `/settings/user-management/users`
2. Observe "Role" and "Organization" columns
3. All entries show: "—"

**Expected Behavior:**
- Role should show: "Admin", "Operator", "Read Only", etc.
- Organization should show organization name

**Actual Behavior:**
- Both columns show: "—"
- Indicates missing or null data

**Root Cause:**
- User model doesn't include role/organization data
- API response missing these fields
- Data not being populated in database
- Frontend-backend schema mismatch

**Suggested Fix:**
1. Verify user schema includes role and organization
2. Check API response structure
3. Update seed data to include roles/orgs
4. Fix data mapping

**Impact:**
- **Severity:** HIGH - Cannot see user permissions
- **RBAC:** Unclear who has what access
- **Workaround:** Click edit to see role

**Screenshots:**
- See: `screenshots/user-management/user-list.png`

**Estimated Fix Time:** 1-2 hours

**Priority:** P2 - RBAC visibility

---

## P3 - Low Priority Issues (3)

### Issue #13: [Vulnerabilities] Search Input Not Interactable in Playwright Tests

**Labels:** `bug`, `P3-low`, `test-automation`, `vulnerabilities`

**Description:**
Playwright automated tests cannot interact with the search input in the Vulnerabilities module, though manual testing confirms the UI works correctly.

**Steps to Reproduce:**
1. Run Playwright test: `npx playwright test e2e/vulnerabilities.spec.ts`
2. Observe: Search test fails with selector not found

**Expected Behavior:**
- Test should be able to find and interact with search input

**Actual Behavior:**
- Playwright cannot locate search input
- Manual testing shows search works fine

**Root Cause:**
- Playwright selector too specific or incorrect
- Need better selector (e.g., data-testid attribute)

**Suggested Fix:**
1. Add `data-testid="vulnerability-search"` to search input
2. Update Playwright selector to use test ID
3. Re-run tests to verify

**Impact:**
- **Severity:** LOW - Test automation only
- **User Impact:** None (UI works manually)

**Estimated Fix Time:** 15 minutes

**Priority:** P3 - Test quality improvement

---

### Issue #14: [User Management] Ant Design Deprecation Warning for Alert Component

**Labels:** `bug`, `P3-low`, `deprecation`, `user-management`, `frontend`

**Description:**
Console shows deprecation warning: Alert component using 'message' prop instead of 'title' prop.

**Expected Behavior:**
- No deprecation warnings
- Using latest Ant Design API

**Actual Behavior:**
- Warning appears in console
- May break in future Ant Design versions

**Suggested Fix:**
```tsx
// Before:
<Alert message="Success" />

// After:
<Alert title="Success" />
```

**Impact:**
- **Severity:** LOW - Future compatibility
- **User Impact:** None currently

**Estimated Fix Time:** 5 minutes

**Priority:** P3 - Future-proofing

---

### Issue #15: [Multiple Modules] Various Console Warnings

**Labels:** `bug`, `P3-low`, `console`, `frontend`

**Description:**
Various non-critical console warnings appear across multiple modules during testing.

**Examples:**
- React key warnings
- Deprecated prop usage
- Minor linting warnings

**Expected Behavior:**
- Clean console with no warnings

**Actual Behavior:**
- Minor warnings present

**Suggested Fix:**
- Review and address each warning
- Update code to use recommended patterns

**Impact:**
- **Severity:** LOW - Code quality
- **User Impact:** None

**Estimated Fix Time:** 1-2 hours

**Priority:** P3 - Code polish

---

## Summary

**Total Issues:** 15

**By Priority:**
- P1 (Critical): 8 bugs - **Must fix before production**
- P2 (High): 4 bugs - **Should fix before production**
- P3 (Low): 3 bugs - **Nice to have**

**By Module:**
- Assets: 4 bugs (3 P1, 1 P2)
- Patches: 4 bugs (3 P1, 1 P2)
- User Management: 4 bugs (2 P1, 1 P2, 1 P3)
- Dashboard: 1 bug (P2)
- Vulnerabilities: 1 bug (P3)
- Multiple: 1 bug (P3)

**Estimated Total Fix Time:**
- P1 bugs: 12-20 hours
- P2 bugs: 5-9 hours
- P3 bugs: 2-3 hours
- **Grand Total:** 19-32 hours

**Recommended Approach:**
1. Fix all 8 P1 bugs first (critical blockers)
2. Fix 4 P2 bugs before production (high priority)
3. Fix 3 P3 bugs in next sprint (polish)

**Target Timeline:**
- P1 fixes: 2 days (with 2-3 developers)
- P2 fixes: 1 day
- P3 fixes: 0.5 days
- **Total:** 3.5 days to production-ready

---

**Created by:** Claude Code QA Team
**Date:** 2026-02-16
**Source:** Phase 1 Frontend QA Testing
**Reports:** See PHASE1-COMPLETION-REPORT.md for full details
