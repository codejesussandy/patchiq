# Software Tab Fixes - Asset Details

This document tracks the fixes and enhancements needed for the Software tab in the Asset Details page.

**Created:** 2026-01-27
**Last Updated:** 2026-01-27
**Status:** In Progress (3 of 5 fixes completed)

**Related Files:**
- Frontend: `frontend/src/pages/assets/components/AssetDetails.tsx`
- Frontend Types: `frontend/src/types/asset.types.ts`
- Backend Service: `backend/src/modules/assets/assets.service.ts`
- Backend Types: `backend/src/modules/assets/assets.types.ts`

**Commits:**
- `607a78d` - feat(assets): add filter and CSV export to Software tab
- `61b12c7` - feat(assets): implement 3-tab data segregation for Software tab

---

## Overview

The Software tab displays software inventory data collected by the agent, organized into three tabs:

| Tab | Content | Data Source |
|-----|---------|-------------|
| **Applications** | User-installed software | `rawPayload.applications` |
| **Services** | System services (Running/Stopped) | `rawPayload.services` |
| **System Environment** | Startup/login programs | `rawPayload.startupPrograms` |

### Current State
- API endpoint `/assets/:id/software` - Working
- Three subtabs properly segregated - Working
- Data fetching from `rawPayload` - Working
- Column filters (Applications tab) - Working
- CSV export (all tabs) - Working
- Tables with pagination - Working
- OS info panel - Working

---

## Test Results (2026-01-27)

### API Response Verified

```json
{
  "os": { "name": "Ubuntu 24.04.3 LTS", "version": "24.04" },
  "applications": [...],      // 1488 items
  "services": [...],          // 182 items
  "startupPrograms": [...]    // 0 items (agent dependent)
}
```

### Data Structure Verified

| Field | Structure | Status |
|-------|-----------|--------|
| `os` | `{ name, version }` | ✅ Working |
| `applications` | `[{ id, name, version, vendor?, installSource? }]` | ✅ Working |
| `services` | `[{ id, name, displayName, state, startupType, status }]` | ✅ Working |
| `startupPrograms` | `[{ id, name, command, location, enabled, vendor }]` | ✅ Working (empty if not collected) |

### Services State Verified

```
accounts-daemon  → Running ✅
alsa-restore     → Stopped ✅
alsa-state       → Stopped ✅
```

---

## Fixes

### FIX-1: System Information Panel

**Priority:** High
**Effort:** Low
**Status:** [ ] Not Started

**Problem:**
The System Information collapse panel shows only placeholder text: "Detailed system information from agent inventory"

**Location:**
`frontend/src/pages/assets/components/AssetDetails.tsx` (System Information panel)

**Solution:**
Display actual hardware/system data already available on the asset object:
- `manufacturer`, `model`, `serialNumber`
- `cpuInfo`, `memoryTotal`, `diskTotal`
- `biosVersion`, `lastSeen`

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
Download buttons in each subtab rendered but had no functionality.

**Solution:**
Implemented CSV export for each table's data with proper escaping and user feedback.

**Implementation:**
1. Created `exportToCSV()` utility function with proper CSV escaping
2. Created export handlers: `exportApplications()`, `exportServices()`, `exportStartupPrograms()`
3. Added Tooltip showing "Export to CSV" on hover
4. Filename format: `{hostname}-{type}.csv`

**Exported Columns:**
- Applications: Name, Vendor, Version, Patch Status, Last Patched, Installed On
- Services: Service Name, Display Name, State, Startup Type
- Startup Programs: Name, Command, Location, Enabled, Vendor

---

### FIX-3: Filter Buttons

**Priority:** Medium
**Effort:** Low-Medium
**Status:** [x] Completed (2026-01-27)

**Problem:**
Filter buttons rendered but had no onClick handler or filter state.

**Solution:**
Implemented column-based filtering using Ant Design's built-in table filter functionality for the Applications tab. Removed filter buttons from Services and System Environment tabs.

**Implementation:**
1. Added state variables: `appVendorFilters`, `appPatchStatusFilters`
2. Added `filters`, `filteredValue`, and `onFilter` props to columns
3. Vendor filter dynamically populated from unique vendors
4. Patch Status filter: "Available" / "Not Available"
5. Added "Clear Filters" button when filters are active

---

### FIX-4: Application Icons

**Priority:** Low
**Effort:** Low
**Status:** [ ] Not Started

**Problem:**
Application icons show a generic red "A" placeholder instead of meaningful icons.

**Location:**
`frontend/src/pages/assets/components/AssetDetails.tsx` (applicationColumns render)

**Solution:**
Use colored circle with first letter of application name, with optional vendor mapping.

```typescript
const getAppColor = (name: string) => {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
};
```

---

### FIX-5: Three-Tab Data Segregation

**Priority:** Medium
**Effort:** Medium
**Status:** [x] Completed (2026-01-27)

**Problem:**
Data was not properly segregated into Applications, Services, and System Environment tabs. Backend was reading from wrong data source.

**Solution:**
Updated backend to read from `AssetSoftwareInventory.rawPayload` which contains the full agent inventory.

**Changes Made:**

**Backend (`assets.service.ts`):**
- Updated `getAssetSoftware()` to read from `rawPayload`
- Returns `applications`, `services`, and `startupPrograms` arrays
- Properly maps agent data to typed interfaces

**Backend Types (`assets.types.ts`):**
- Added `StartupProgramInfo` interface
- Updated `ServiceInfo` with `displayName` and `startupType`
- Updated `AssetSoftware` to include `startupPrograms`

**Frontend Types (`asset.types.ts`):**
- Added `StartupProgram` type
- Updated `Software` type to include `startupPrograms`
- Made optional fields properly optional

**Frontend UI (`AssetDetails.tsx`):**
- Updated Services columns: Name, Display Name, State, Startup Type
- System Environment tab now shows Startup Programs table
- Updated export functions for new data structures

---

### FIX-6: License Details Not Displayed

**Priority:** Low
**Effort:** Medium
**Status:** [ ] Deferred

**Problem:**
`licenseDetails` type exists but backend doesn't return it and UI doesn't render it.

**Solution:**
Deferred unless license compliance is a feature requirement. This is Windows-specific license info.

---

### FIX-7: Patch Status Accuracy

**Priority:** Low
**Effort:** High
**Status:** [ ] Deferred

**Problem:**
Patch status shows "Available" / "Not Available" but data may not be accurate.

**Solution:**
Requires integration with patches/vulnerabilities modules. Defer until Jobs integration is complete.

---

## Implementation Order

| Order | Fix | Effort | Impact | Status |
|-------|-----|--------|--------|--------|
| 1 | FIX-1: System Information Panel | Low | High | [ ] Not Started |
| 2 | FIX-2: Download/Export | Low | Medium | [x] Completed |
| 3 | FIX-3: Filter Buttons | Low-Medium | Medium | [x] Completed |
| 4 | FIX-4: Application Icons | Low | Low | [ ] Not Started |
| 5 | FIX-5: Three-Tab Segregation | Medium | High | [x] Completed |
| 6 | FIX-6: License Details | Medium | Low | [ ] Deferred |
| 7 | FIX-7: Patch Status | High | High | [ ] Deferred |

---

## Testing Checklist

| Test | Status | Notes |
|------|--------|-------|
| API returns correct structure | ✅ Pass | `os`, `applications`, `services`, `startupPrograms` |
| Applications data populated | ✅ Pass | 1488 apps returned |
| Services data populated | ✅ Pass | 182 services with Running/Stopped state |
| Startup Programs structure | ✅ Pass | Returns empty array if not collected |
| Download buttons export CSV | ✅ Pass | All three tabs |
| Filter dropdowns work | ✅ Pass | Vendor & Patch Status filters |
| Clear Filters button | ✅ Pass | Appears when filters active |
| TypeScript compiles | ✅ Pass | Frontend & Backend |
| System Information panel | ⬚ Not tested | Placeholder still shown |
| Application icons | ⬚ Not tested | Generic "A" placeholder |
| Empty states | ⬚ Not tested | Need asset with no software |

---

## Notes

- **Startup Programs:** Will show empty if agent doesn't collect `startupPrograms` data
- **Services State:** Now correctly shows Running/Stopped from agent data
- **Data Source:** Backend reads from `AssetSoftwareInventory.rawPayload` (full agent inventory)
- All fixes maintain existing functionality
- Use Ant Design components consistently
- Test with assets that have varying amounts of software data
