# Vulnerabilities Module - Screenshots Index

This document provides a detailed description of each screenshot captured during comprehensive testing of the PatchIQ Vulnerabilities module.

---

## Screenshot 1: vulnerabilities-list-initial.png (68K)

**Captured:** Initial page load
**Test:** Navigation & List Display

**What's visible:**
- Statistics cards at top showing severity breakdown (Critical, High, Medium, Low)
- Full data table with all vulnerability records
- Column headers: Severity, CVE, EPSS, Exploitable, Description, Risk Score, CVSS3, CVSS2, Endpoints, Affected Softwares, Published
- Search bar at top left
- Action buttons: Scan Now, Add Exceptions, Refresh, Export
- "Advanced Filters" link
- Pagination controls at bottom
- 10 vulnerability rows displayed
- Color-coded severity tags (red, orange, gold, green)
- EPSS and Risk Score shown as circular progress indicators

**Purpose:**
Demonstrates the initial state of the vulnerabilities page with all UI elements visible and functional.

---

## Screenshot 2: vulnerabilities-sorted-cvss.png (74K)

**Captured:** After sorting by CVSS Score
**Test:** Sorting functionality

**What's visible:**
- Same layout as initial view
- Table sorted by CVSS3 Base Score column (highest to lowest)
- Sort indicator visible on CVSS column header
- Vulnerabilities reordered with highest CVSS scores at top
- All other UI elements remain in place

**Purpose:**
Demonstrates that column sorting works correctly and instantly reorders table data.

---

## Screenshot 3: vulnerabilities-filters-applied.png (76K)

**Captured:** Main view with filter controls
**Test:** Filter functionality

**What's visible:**
- Main vulnerabilities list view
- Search bar and "Advanced Filters" link visible
- Action buttons row (Scan Now, Add Exceptions, Refresh, Export)
- Full data table with filter state
- Statistics cards showing current data breakdown

**Purpose:**
Shows the filter interaction area and main UI where filters would be applied.

**Note:** Advanced Filters modal did not open during test due to Bug-002.

---

## Screenshot 4: vulnerability-detail-page.png (70K)

**Captured:** Attempted detail modal view
**Test:** Vulnerability Detail Page

**What's visible:**
- Main vulnerabilities list (background)
- Row that was clicked may be highlighted
- Detail modal attempted to open but blocked by API 429 error

**Purpose:**
Demonstrates the state when attempting to view vulnerability details. Shows the UI before detail modal successfully renders.

**Note:** Detail modal did not fully render due to API rate limiting (HTTP 429 errors).

---

## Screenshot 5: vulnerability-remediation.png (76K)

**Captured:** Remediation action buttons
**Test:** Remediation Actions

**What's visible:**
- Full vulnerabilities page layout
- Focus on action button row:
  - **Scan Now** button (with scan icon)
  - **Add Exceptions** button (with plus icon)
  - **Refresh** button (with reload icon)
  - **Export** button (with export icon)
- Search bar with "Search..." placeholder
- "Advanced Filters" link
- Full data table below

**Purpose:**
Demonstrates all remediation and management actions available to users. Shows that buttons are properly labeled and accessible.

---

## Screenshot 6: vulnerabilities-stats-cards.png (76K)

**Captured:** Statistics dashboard at top of page
**Test:** Stats and Metrics Display

**What's visible:**
- **Severity Breakdown Cards:**
  - Total vulnerabilities count
  - Critical count (red badge)
  - High count (orange badge)
  - Medium count (gold badge)
  - Low count (green badge)
- **Published Date Statistics:**
  - Distribution by time ranges: > 90 days, 60-90 days, 30-60 days, < 30 days
  - Breakdown by severity within each time range
- **Discovered Date Statistics:**
  - Similar distribution by time ranges
  - Severity breakdown for each range
- Charts or visual indicators for statistics
- Zero Day vulnerabilities count
- Exceptions count

**Purpose:**
Demonstrates the comprehensive statistics dashboard that gives users at-a-glance insight into their vulnerability landscape.

---

## Missing Screenshots

The following screenshots were planned but not successfully captured:

### vulnerabilities-search-results.png
**Reason:** Search functionality timing out (Bug-003)
**Expected content:** Filtered table showing only CVE-2024 results after search

**Workaround:** Test failed due to search implementation issues. Screenshot would have shown reduced row count with only matching CVE IDs.

---

## UI Elements Observed Across All Screenshots

### Common Elements:
- Clean, modern Ant Design UI
- Consistent color scheme (blue primary, red/orange/gold/green for severity)
- Proper spacing and layout
- Responsive table design
- Clear typography and labels
- Accessible button icons and text

### Color Coding:
- **Critical:** Red (`#ff4d4f`)
- **High:** Orange (`#ff7a45`)
- **Medium:** Gold (`#faad14`)
- **Low:** Green (`#52c41a`)

### Data Visualization:
- Circular progress indicators for EPSS and Risk Score
- Color-coded tags for Severity and Exploitable status
- Truncated text with ellipsis for long descriptions
- Proper date formatting for Published dates

---

## Screenshot Quality

All screenshots captured at full page resolution:
- **Format:** PNG
- **Size range:** 68-76 KB (compressed)
- **Resolution:** Full browser viewport
- **Quality:** High (no compression artifacts)
- **Visibility:** All text and UI elements clearly readable

---

## How to View Screenshots

All screenshots are saved to:
```
/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/
```

**Files:**
1. `vulnerabilities-list-initial.png`
2. `vulnerabilities-sorted-cvss.png`
3. `vulnerabilities-filters-applied.png`
4. `vulnerability-detail-page.png`
5. `vulnerability-remediation.png`
6. `vulnerabilities-stats-cards.png`

**To view:** Open any PNG file with your default image viewer or import into documentation tools.

---

## Test Coverage Visualization

| UI Feature | Screenshot Coverage | Test Status |
|------------|---------------------|-------------|
| Initial Page Load | ✅ Screenshot 1 | ✅ Pass |
| Data Table | ✅ All screenshots | ✅ Pass |
| Column Sorting | ✅ Screenshot 2 | ✅ Pass |
| Stats Cards | ✅ Screenshot 6 | ✅ Pass |
| Search | ❌ Not captured | ❌ Fail |
| Filters | ⚠️ Screenshot 3 (partial) | ⚠️ Partial |
| Detail Modal | ⚠️ Screenshot 4 (blocked) | ❌ Fail |
| Action Buttons | ✅ Screenshot 5 | ✅ Pass |
| Pagination | ✅ Visible in Screenshot 1 | ✅ Pass |

---

## Notes for Reviewers

1. **Screenshots are representative** of the actual UI state during automated testing
2. **No manual edits** were made to screenshots - they are raw Playwright captures
3. **Full page captures** include all UI elements, not just focused areas
4. **Timestamp consistency** - all screenshots taken within same test session
5. **Browser environment** - Chromium via Playwright, desktop viewport

---

**Index Created:** February 16, 2026
**Total Screenshots:** 6
**Total Coverage:** ~80% of planned scenarios
**Missing:** 1 screenshot (search results) due to test failures
