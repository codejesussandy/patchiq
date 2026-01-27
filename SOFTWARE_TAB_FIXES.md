# Software Tab Fixes - Asset Details

This document tracks the fixes and enhancements needed for the Software tab in the Asset Details page.

**Created:** 2026-01-27
**Status:** Planning
**Related Files:**
- Frontend: `frontend/src/pages/assets/components/AssetDetails.tsx` (lines 1012-1265)
- Frontend Types: `frontend/src/types/asset.types.ts` (lines 546-618)
- Backend Service: `backend/src/modules/assets/assets.service.ts` (lines 1337-1378)
- Backend Types: `backend/src/modules/assets/assets.types.ts` (lines 313-339)

---

## Overview

The Software tab is partially implemented with working backend/frontend integration. Several features are incomplete or non-functional.

### Current State
- API endpoint `/assets/:id/software` - Working
- Three subtabs (Applications, System Environment, Services) - Renders
- Data fetching & loading states - Working
- Tables with pagination - Working
- OS info panel - Displays

---

## Fixes

### FIX-1: System Information Panel

**Priority:** High
**Effort:** Low
**Status:** [ ] Not Started

**Problem:**
The System Information collapse panel shows only placeholder text: "Detailed system information from agent inventory"

**Location:**
`frontend/src/pages/assets/components/AssetDetails.tsx` lines 1255-1259

**Solution:**
Display actual hardware/system data already available on the asset object. The asset already has fields like:
- `manufacturer`
- `model`
- `serialNumber`
- `cpuInfo`
- `memoryTotal`
- `diskTotal`
- `biosVersion`
- `lastSeen`

**Implementation:**
1. Create a grid layout similar to the OS panel
2. Map asset fields to display labels
3. Handle null/undefined values gracefully

---

### FIX-2: Download/Export Buttons

**Priority:** High
**Effort:** Low
**Status:** [x] Completed (2026-01-27)

**Problem:**
Download buttons in each subtab (Applications, System Environment, Services) render but have no functionality.

**Location:**
`frontend/src/pages/assets/components/AssetDetails.tsx` lines 1135-1215

**Solution:**
Implemented CSV export for each table's data with proper escaping and user feedback.

**Implementation:**
1. Created `exportToCSV()` utility function with:
   - Proper CSV escaping (quotes, commas, newlines)
   - Empty data handling with warning message
   - Success message showing row count
2. Created export handlers for each tab: `exportApplications()`, `exportServices()`, `exportEnvironment()`
3. Added onClick handlers to download buttons
4. Added Tooltip showing "Export to CSV" on hover
5. Filename format: `{hostname}-{type}.csv` (e.g., `server01-applications.csv`)

**Exported Columns:**
- Applications: Name, Vendor, Version, Patch Status, Last Patched, Installed On
- Services: Service Name, State, Type, Status
- Environment: Key, Value

---

### FIX-3: Filter Buttons

**Priority:** Medium
**Effort:** Low-Medium
**Status:** [x] Completed (2026-01-27)

**Problem:**
Filter buttons render but have no onClick handler or filter state.

**Location:**
`frontend/src/pages/assets/components/AssetDetails.tsx` lines 1056-1084, 1118-1133

**Solution:**
Implemented column-based filtering using Ant Design's built-in table filter functionality for the Applications tab. Removed filter buttons from Services and System Environment tabs (per user request).

**Implementation:**
1. Added state variables for filter values: `appVendorFilters`, `appPatchStatusFilters`
2. Added `filters`, `filteredValue`, and `onFilter` props to Vendor and Patch Status columns
3. Vendor filter dynamically populated from unique vendors in the data
4. Patch Status filter has static options: "Available" / "Not Available"
5. Added `onChange` handler to Table to sync filter state
6. Added "Clear Filters" button that appears when filters are active
7. Removed standalone filter buttons from Services and System Environment tabs

**Changes Made:**
- Added filter state at line ~103
- Added `uniqueVendors` extraction at line 1022
- Updated `applicationColumns` with filter config (lines 1056-1084)
- Added `handleAppTableChange` and `clearAppFilters` functions (lines 1118-1131)
- Updated Applications tab with `onChange` handler and conditional Clear Filters button
- Removed Filter buttons from Services and System Environment tabs

---

### FIX-4: Application Icons

**Priority:** Low
**Effort:** Low
**Status:** [ ] Not Started

**Problem:**
Application icons show a generic "A" placeholder instead of meaningful icons.

**Location:**
`frontend/src/pages/assets/components/AssetDetails.tsx` lines 1025-1038

**Solution:**
Use colored circle with first letter of application name (quick fix), with optional vendor mapping for common vendors.

**Implementation:**
1. Generate consistent color based on app name hash
2. Display first letter of application name
3. (Optional) Map known vendors to icons: Microsoft, Adobe, Google, etc.

```typescript
const getAppColor = (name: string) => {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
};
```

---

### FIX-5: System Environment Tab (Three-Tab Segregation)

**Priority:** Medium
**Effort:** Medium
**Status:** [x] Completed (2026-01-27)

**Problem:**
Data not properly segregated into Applications, Services, and System Environment tabs.

**Solution:**
Implemented proper data segregation using agent's `rawPayload`:

| Tab | Data Source | Content |
|-----|-------------|---------|
| Applications | `rawPayload.applications` | User-installed software |
| Services | `rawPayload.services` | System services with state |
| System Environment | `rawPayload.startupPrograms` | Startup/login programs |

**Changes Made:**

**Backend (`assets.service.ts`):**
- Updated `getAssetSoftware()` to read from `AssetSoftwareInventory.rawPayload`
- Returns `applications`, `services`, and `startupPrograms` arrays
- Properly maps agent data to typed interfaces

**Backend Types (`assets.types.ts`):**
- Added `StartupProgramInfo` interface
- Updated `AssetSoftware` to include `startupPrograms`
- Updated `ServiceInfo` with `displayName` and `startupType`

**Frontend Types (`asset.types.ts`):**
- Added `StartupProgram` type
- Updated `Software` type to include `startupPrograms`
- Made optional fields properly optional

**Frontend UI (`AssetDetails.tsx`):**
- Updated Services columns: Name, Display Name, State, Startup Type
- Replaced System Environment key-value display with Startup Programs table
- Updated export functions for new data structures

---

### FIX-6: License Details Not Displayed

**Priority:** Low
**Effort:** Medium
**Status:** [ ] Not Started (Deferred)

**Problem:**
`licenseDetails` type exists in frontend but backend doesn't return it and UI doesn't render it.

**Location:**
- Frontend Types: `frontend/src/types/asset.types.ts` lines 595-617
- Backend Types: `backend/src/modules/assets/assets.types.ts` line 316

**Solution:**
Defer unless license compliance is a feature requirement. If needed:
1. Add license collection to agent
2. Store in database (new table or JSON field)
3. Return from API
4. Display in OS panel or dedicated section

**Note:** This is Windows-specific license info (product key, license status, etc.). Skip unless explicitly required.

---

### FIX-7: Patch Status Accuracy

**Priority:** Low (Deferred)
**Effort:** High
**Status:** [ ] Not Started (Deferred)

**Problem:**
Patch status shows "Available" / "Not Available" but data may not be accurate or connected to actual patch data.

**Location:**
`frontend/src/pages/assets/components/AssetDetails.tsx` lines 1025-1038

**Solution:**
Requires integration with patches/vulnerabilities modules. The patch status should come from matching installed software versions against known patches in the Hub.

**Dependencies:**
- Jobs/Deployments integration (see `JOBS_IMPLEMENTATION.md`)
- Hub software package matching
- Version comparison logic

**Defer until:** Jobs integration is complete per CLAUDE.md roadmap.

---

## Implementation Order

| Order | Fix | Effort | Impact | Status |
|-------|-----|--------|--------|--------|
| 1 | FIX-1: System Information Panel | Low | High | [ ] |
| 2 | FIX-2: Download/Export | Low | Medium | [x] Completed |
| 3 | FIX-3: Filter Buttons | Low-Medium | Medium | [x] Completed |
| 4 | FIX-4: Application Icons | Low | Low | [ ] |
| 5 | FIX-5: System Environment | Medium | Medium | [x] Completed |
| 6 | FIX-6: License Details | Medium | Low | [ ] Deferred |
| 7 | FIX-7: Patch Status | High | High | [ ] Deferred |

---

## Testing Checklist

After implementing fixes, verify:

- [ ] System Information panel displays hardware data correctly
- [x] Download buttons export valid CSV files (Applications, Services, Environment)
- [x] Filter dropdowns appear and filter data correctly (Applications tab - Vendor & Patch Status)
- [x] Clear Filters button appears when filters are active
- [x] Filter buttons removed from Services and System Environment tabs
- [ ] Application icons render with consistent colors
- [x] System Environment tab shows startup programs (3-tab segregation implemented)
- [ ] No console errors in browser
- [ ] Loading states work correctly
- [ ] Empty states handled gracefully (no data scenarios)

---

## Notes

- All fixes should maintain existing functionality
- Use Ant Design components consistently
- Follow existing code patterns in AssetDetails.tsx
- Test with assets that have varying amounts of software data
