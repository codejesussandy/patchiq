# PatchIQ User Stories - Testing Document 4

**Version:** 1.0.0  
**Last Updated:** 2026-01-23  
**Purpose:** User stories for testing PatchIQ patch management solution functionality (Set 4)

---

## Document Overview

This document contains **10 user stories** covering critical functionality. Each user story follows the standard format:

- **As a** [user type]  
- **I want to** [action]  
- **So that** [benefit]

Each story includes acceptance criteria, test data, and relevant API/UI information for testing.

---

## User Stories

---

### User Story 1: All Patches Page Functions

**Story ID:** `US-031`  
**Title:** View and Manage All Patches in Table View  
**Priority:** P0 (Critical)  
**Module:** Patches - Patch Management

**User Story:**
```
As a system administrator
I want to view, search, filter, and manage all patches in a table view with tabs for All, Missing, Installed, and Decline
So that I can efficiently browse, find, and perform actions on patches based on their status
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Patches > All Patches page (Patches menu has 3 pages: All Patches, Patches Deployed, Patch Test & Approve)
- [ ] AC2: All Patches page displays four tabs: All, Missing, Installed, Decline
- [ ] AC3: "All" tab is selected by default when page loads
- [ ] AC4: Each tab displays a table listing patches filtered by status:
  - **All tab:** Shows all patches regardless of status
  - **Missing tab:** Shows only patches with status "Missing"
  - **Installed tab:** Shows only patches with status "Installed"
  - **Decline tab:** Shows only patches with status "Decline"
- [ ] AC5: Table displays the following columns (configurable visibility):
  - Patch ID (sortable, searchable, pinned option)
  - Title (sortable, searchable)
  - Severity (filterable, color-coded badges: Critical, High, Medium, Low, Unspecified)
  - Category (filterable, searchable)
  - Vendor (filterable, searchable)
  - Product (filterable, searchable)
  - OS (filterable, searchable)
  - KB Number (searchable)
  - Bulletin ID (searchable)
  - Release Date (sortable, formatted date)
  - Status (filterable, color-coded badges: Missing, Installed, Decline, Pending, Failed)
  - Reboot Required (filterable, boolean - Yes/No or icon indicator)
  - Rollback Support (filterable, boolean - Yes/No or icon indicator)
  - Endpoints (sortable, numeric - count of affected endpoints, clickable)
  - Actions (View, Deploy, Decline)
- [ ] AC6: User can search patches by Patch ID, Title, Category, Vendor, Product, OS, KB Number, or Bulletin ID using a search input field
- [ ] AC7: Search is case-insensitive and filters results in real-time as user types
- [ ] AC8: User can filter patches by:
  - Severity (via Severity column filter dropdown: Critical, High, Medium, Low, Unspecified)
  - Category (via Category column filter dropdown)
  - Vendor (via Vendor column filter dropdown)
  - Product (via Product column filter dropdown)
  - OS (via OS column filter dropdown: Windows, MacOS, Linux, Ubuntu)
  - Status (via Status column filter dropdown: Missing, Installed, Decline, Pending, Failed)
  - Reboot Required (via Reboot Required column filter dropdown: Yes, No)
  - Rollback Support (via Rollback Support column filter dropdown: Yes, No)
  - Organization (if multi-tenant, via Organization filter dropdown)
  - Branch Location (via Branch Location filter dropdown)
- [ ] AC9: User can sort patches by:
  - Patch ID (ascending/descending)
  - Title (ascending/descending, alphabetical)
  - Severity (ascending/descending)
  - Category (ascending/descending, alphabetical)
  - Vendor (ascending/descending, alphabetical)
  - Product (ascending/descending, alphabetical)
  - OS (ascending/descending, alphabetical)
  - Release Date (newest/oldest first, date)
  - Status (ascending/descending)
  - Reboot Required (ascending/descending, boolean)
  - Rollback Support (ascending/descending, boolean)
  - Endpoints (ascending/descending, numeric)
- [ ] AC10: User can paginate through patches using table pagination controls
- [ ] AC11: User can select multiple patches using checkboxes for bulk operations
- [ ] AC12: User can view patch details by clicking on patch row or "View" action button, which opens patch details modal/drawer
- [ ] AC13: Patch details modal/drawer displays comprehensive patch information including:
  - Basic Information: Patch ID, Title, Description, Severity, Category
  - Product Information: Vendor, Product, OS, OS Version, Platform, Architecture
  - Patch Information: KB Number, Bulletin ID, Release Date, Size, Download URL, Reference URL
  - Status Information: Status, Download Status, Reboot Required, Support Uninstallation
  - Affected Endpoints: List of endpoints affected by this patch
  - CVE Numbers: List of associated CVE numbers
  - Tags: List of tags
  - Languages Supported: List of supported languages
  - Supersedes/Superseded By: Related patches
- [ ] AC14: User can deploy a patch by clicking "Deploy" action button, which opens deploy patch modal (deployment functionality covered in separate user story)
- [ ] AC15: User can decline a patch by clicking "Decline" action button, which shows a confirmation dialog before declining
- [ ] AC16: Decline confirmation dialog asks user to provide reason for declining (optional text field)
- [ ] AC17: Upon declining, patch status changes to "Decline" and patch moves to Decline tab
- [ ] AC18: User can perform bulk operations on selected patches:
  - Bulk Deploy (opens deploy modal for multiple patches)
  - Bulk Decline (shows confirmation dialog with count of selected patches)
- [ ] AC19: Bulk Decline shows confirmation dialog with count of selected patches and optional reason field
- [ ] AC20: Severity column displays color-coded badges (Critical=red, High=orange, Medium=yellow, Low=blue, Unspecified=gray)
- [ ] AC21: Status column displays color-coded badges (Missing=red, Installed=green, Decline=gray, Pending=yellow, Failed=red)
- [ ] AC22: Release Date column displays formatted date and time
- [ ] AC23: Reboot Required column displays "Yes" or "No" text, or icon indicator (checkmark for Yes, X for No)
- [ ] AC24: Rollback Support column displays "Yes" or "No" text, or icon indicator (checkmark for Yes, X for No)
- [ ] AC25: Endpoints column displays numeric count of affected endpoints and is clickable (styled as link or button)
- [ ] AC26: Clicking on Endpoints count opens Affected Endpoints modal/drawer showing list of all affected endpoints
- [ ] AC27: Affected Endpoints modal/drawer displays table/list of endpoints with columns:
  - Endpoint ID/Name
  - Asset Name
  - Hostname
  - IP Address
  - OS
  - Status (Online/Offline)
  - Patch Status on Endpoint (Missing, Installed, Pending, Failed)
  - Organization
  - Branch Location
- [ ] AC28: Affected Endpoints modal/drawer supports search and filtering of endpoints
- [ ] AC29: Affected Endpoints modal/drawer supports pagination if there are many endpoints
- [ ] AC30: User can use column visibility toggle to show/hide columns
- [ ] AC25: Column visibility preferences are saved and persist across sessions
- [ ] AC26: User can pin/unpin columns (e.g., Patch ID can be pinned to left)
- [ ] AC27: Table displays empty state message when no patches are found
- [ ] AC28: Table shows loading state while fetching patch data
- [ ] AC29: Table shows "No results found" message when search/filter returns no matches
- [ ] AC30: Refresh/Reload button reloads patch list from server
- [ ] AC31: Table supports export functionality (Export button) to export patch list as CSV/Excel
- [ ] AC32: Exported CSV includes all visible columns and filtered/search results
- [ ] AC33: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC39: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC40: System handles pagination correctly when switching tabs (maintains or resets to page 1 based on preference)
- [ ] AC41: Page respects user permissions - users with view-only permission cannot deploy or decline patches
- [ ] AC42: Bulk operations respect user permissions
- [ ] AC43: Patch table updates in real-time or refreshes periodically to show status changes
- [ ] AC44: Each tab shows count badge indicating number of patches in that category (e.g., "All (150)", "Missing (45)", "Installed (90)", "Decline (15)")
- [ ] AC45: Tab counts update dynamically as patch statuses change
- [ ] AC46: When user switches tabs, table content updates to show patches for that tab's status filter
- [ ] AC47: Search and filter are maintained when switching between tabs (or reset based on preference)
- [ ] AC48: Sorting preferences are maintained when switching between tabs (or reset based on preference)

**Test Data:**
```json
{
  "patches": [
    {
      "id": "patch-001",
      "patchId": "KB5012345",
      "title": "Security Update for Windows Server 2022",
      "description": "This security update resolves vulnerabilities in Windows Server 2022",
      "severity": "Critical",
      "category": "Security",
      "vendor": "Microsoft",
      "product": "Windows Server 2022",
      "os": "Windows",
      "osVersion": "Windows Server 2022",
      "platform": "x64",
      "architecture": "x64",
      "kbNumber": "KB5012345",
      "bulletinId": "MS22-001",
      "releaseDate": "2024-01-15T00:00:00Z",
      "releasedOn": "2024-01-15T00:00:00Z",
      "size": 52428800,
      "sizeFormatted": "50 MB",
      "downloadUrl": "https://catalog.update.microsoft.com/v7/site/Details.aspx?name=KB5012345",
      "referenceUrl": "https://support.microsoft.com/kb/5012345",
      "rebootRequired": true,
      "supportUninstallation": true,
      "languagesSupported": ["en-US", "en-GB"],
      "tags": ["security", "critical", "windows"],
      "cveNumbers": ["CVE-2024-0001", "CVE-2024-0002"],
      "source": "Microsoft Update",
      "status": "Missing",
      "downloadStatus": "Not Downloaded",
      "endpoints": 25,
      "testStatus": "Not Tested",
      "approvalStatus": "Pending",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "patch-002",
      "patchId": "KB5012346",
      "title": "Cumulative Update for Windows 11",
      "description": "This cumulative update includes improvements and fixes",
      "severity": "High",
      "category": "Update",
      "vendor": "Microsoft",
      "product": "Windows 11",
      "os": "Windows",
      "osVersion": "Windows 11",
      "platform": "x64",
      "architecture": "x64",
      "kbNumber": "KB5012346",
      "bulletinId": "MS22-002",
      "releaseDate": "2024-01-14T00:00:00Z",
      "releasedOn": "2024-01-14T00:00:00Z",
      "size": 104857600,
      "sizeFormatted": "100 MB",
      "downloadUrl": "https://catalog.update.microsoft.com/v7/site/Details.aspx?name=KB5012346",
      "referenceUrl": "https://support.microsoft.com/kb/5012346",
      "rebootRequired": true,
      "supportUninstallation": false,
      "languagesSupported": ["en-US"],
      "tags": ["update", "cumulative"],
      "cveNumbers": [],
      "source": "Microsoft Update",
      "status": "Installed",
      "downloadStatus": "Downloaded",
      "endpoints": 150,
      "testStatus": "Tested",
      "approvalStatus": "Approved",
      "createdAt": "2024-01-14T08:00:00Z",
      "updatedAt": "2024-01-14T12:00:00Z"
    },
    {
      "id": "patch-003",
      "patchId": "APPLE-SA-2024-001",
      "title": "Security Update for macOS",
      "description": "This security update addresses vulnerabilities in macOS",
      "severity": "Critical",
      "category": "Security",
      "vendor": "Apple",
      "product": "macOS",
      "os": "MacOS",
      "osVersion": "macOS 14.0",
      "platform": "universal",
      "architecture": "arm64",
      "kbNumber": null,
      "bulletinId": "APPLE-SA-2024-001",
      "releaseDate": "2024-01-13T00:00:00Z",
      "releasedOn": "2024-01-13T00:00:00Z",
      "size": 209715200,
      "sizeFormatted": "200 MB",
      "downloadUrl": "https://support.apple.com/kb/DL1234",
      "referenceUrl": "https://support.apple.com/kb/HT123456",
      "rebootRequired": true,
      "supportUninstallation": false,
      "languagesSupported": ["en"],
      "tags": ["security", "macos"],
      "cveNumbers": ["CVE-2024-0003"],
      "source": "Apple Software Update",
      "status": "Decline",
      "downloadStatus": "Not Downloaded",
      "endpoints": 5,
      "testStatus": "Not Tested",
      "approvalStatus": "Rejected",
      "rejectedBy": "admin@example.com",
      "rejectedAt": "2024-01-13T15:00:00Z",
      "rejectionReason": "Not applicable to our environment",
      "createdAt": "2024-01-13T10:00:00Z",
      "updatedAt": "2024-01-13T15:00:00Z"
    },
    {
      "id": "patch-004",
      "patchId": "USN-6001-1",
      "title": "Ubuntu Security Update",
      "description": "Security update for Ubuntu packages",
      "severity": "Medium",
      "category": "Security",
      "vendor": "Canonical",
      "product": "Ubuntu",
      "os": "Ubuntu",
      "osVersion": "22.04 LTS",
      "platform": "x64",
      "architecture": "x64",
      "kbNumber": null,
      "bulletinId": "USN-6001-1",
      "releaseDate": "2024-01-12T00:00:00Z",
      "releasedOn": "2024-01-12T00:00:00Z",
      "size": 15728640,
      "sizeFormatted": "15 MB",
      "downloadUrl": "https://ubuntu.com/security/notices/USN-6001-1",
      "referenceUrl": "https://ubuntu.com/security/notices/USN-6001-1",
      "rebootRequired": false,
      "supportUninstallation": true,
      "languagesSupported": ["en"],
      "tags": ["ubuntu", "security"],
      "cveNumbers": ["CVE-2024-0004"],
      "source": "Ubuntu Security",
      "status": "Pending",
      "downloadStatus": "Downloading",
      "endpoints": 30,
      "testStatus": "Testing",
      "approvalStatus": "Pending",
      "createdAt": "2024-01-12T09:00:00Z",
      "updatedAt": "2024-01-12T11:00:00Z"
    }
  ],
  "filters": {
    "severity": ["Critical", "High", "Medium", "Low", "Unspecified"],
    "category": ["Security", "Update", "Feature", "Driver"],
    "vendor": ["Microsoft", "Apple", "Canonical", "Red Hat"],
    "product": ["Windows Server 2022", "Windows 11", "macOS", "Ubuntu"],
    "os": ["Windows", "MacOS", "Linux", "Ubuntu"],
    "status": ["Missing", "Installed", "Decline", "Pending", "Failed"],
    "rebootRequired": ["Yes", "No"],
    "rollbackSupport": ["Yes", "No"]
  },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  },
  "affectedEndpoints": [
    {
      "id": "endpoint-001",
      "endpointId": "EP-001",
      "assetId": "asset-001",
      "assetName": "Windows Server 01",
      "hostname": "win-server-01",
      "ipAddress": "192.168.1.100",
      "os": "Windows",
      "osVersion": "Windows Server 2022",
      "status": "Online",
      "patchStatus": "Missing",
      "organizationId": "org-001",
      "organizationName": "Organization 1",
      "branchId": "branch-001",
      "branchName": "Main Branch"
    },
    {
      "id": "endpoint-002",
      "endpointId": "EP-002",
      "assetId": "asset-002",
      "assetName": "Windows Server 02",
      "hostname": "win-server-02",
      "ipAddress": "192.168.1.101",
      "os": "Windows",
      "osVersion": "Windows Server 2022",
      "status": "Online",
      "patchStatus": "Missing",
      "organizationId": "org-001",
      "organizationName": "Organization 1",
      "branchId": "branch-001",
      "branchName": "Main Branch"
    },
    {
      "id": "endpoint-003",
      "endpointId": "EP-003",
      "assetId": "asset-003",
      "assetName": "Windows Workstation 01",
      "hostname": "win-ws-01",
      "ipAddress": "192.168.1.102",
      "os": "Windows",
      "osVersion": "Windows 11",
      "status": "Offline",
      "patchStatus": "Pending",
      "organizationId": "org-001",
      "organizationName": "Organization 1",
      "branchId": "branch-002",
      "branchName": "Branch Office"
    }
  ]
}
```

**API Endpoints:**
- `GET /v1/patches` - Get list of patches with filtering, sorting, and pagination
  - Query Parameters:
    - `status` (optional): Filter by status (Missing, Installed, Decline, Pending, Failed)
    - `severity` (optional): Filter by severity (Critical, High, Medium, Low, Unspecified)
    - `category` (optional): Filter by category
    - `vendor` (optional): Filter by vendor
    - `product` (optional): Filter by product
    - `os` (optional): Filter by OS (Windows, MacOS, Linux, Ubuntu)
    - `rebootRequired` (optional): Filter by reboot required (true, false)
    - `rollbackSupport` (optional): Filter by rollback support (true, false)
    - `search` (optional): Search by Patch ID, Title, Category, Vendor, Product, OS, KB Number, Bulletin ID
    - `organizationId` (optional): Filter by organization
    - `branchId` (optional): Filter by branch location
    - `sortBy` (optional): Sort field (patchId, title, severity, category, vendor, product, os, releaseDate, status, rebootRequired, rollbackSupport, endpoints)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 20)
  - Response: Paginated list of patches with metadata
- `GET /v1/patches/:id` - Get patch details by ID
  - Response: Detailed patch information including affected endpoints, CVE numbers, tags, etc.
- `GET /v1/patches/summary` - Get patch summary counts by status
  - Response: Counts for All, Missing, Installed, Decline, Pending, Failed
- `PUT /v1/patches/:id/decline` - Decline a patch
  - Request Body:
    - `reason` (optional): Reason for declining
  - Response: Updated patch with status "Decline"
- `PUT /v1/patches/bulk-decline` - Decline multiple patches
  - Request Body:
    - `patchIds` (array): List of patch IDs to decline
    - `reason` (optional): Reason for declining
  - Response: Count of declined patches
- `GET /v1/patches/export` - Export patches to CSV/Excel
  - Query Parameters: Same as GET /v1/patches
  - Response: CSV/Excel file download
- `GET /v1/patches/:id/endpoints` - Get list of affected endpoints for a patch
  - Query Parameters:
    - `search` (optional): Search by Endpoint ID, Asset Name, Hostname, IP Address
    - `status` (optional): Filter by endpoint status (Online, Offline)
    - `patchStatus` (optional): Filter by patch status on endpoint (Missing, Installed, Pending, Failed)
    - `organizationId` (optional): Filter by organization
    - `branchId` (optional): Filter by branch location
    - `sortBy` (optional): Sort field (endpointId, assetName, hostname, ipAddress, os, status, patchStatus)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 20)
  - Response: Paginated list of affected endpoints with metadata

**UI Components:**
- Page: `/patches/all-patches` (AllPatches.tsx)
- Components:
  - **Page Header:**
    - Page title "All Patches"
    - Breadcrumb navigation: Patches > All Patches
  - **Tabs Section:**
    - Tab: "All" (default, shows count badge)
    - Tab: "Missing" (shows count badge)
    - Tab: "Installed" (shows count badge)
    - Tab: "Decline" (shows count badge)
    - Active tab indicator
  - **Table Header:**
    - Search input field (with SearchOutlined icon)
    - Filter button (FilterOutlined icon) - opens advanced filter modal
    - Export button (DownloadOutlined icon) - exports to CSV/Excel
    - Refresh button (ReloadOutlined icon) - reloads data
    - Column visibility toggle button (EyeOutlined icon)
  - **Table:**
    - Columns: Patch ID, Title, Severity, Category, Vendor, Product, OS, KB Number, Bulletin ID, Release Date, Status, Reboot Required, Rollback Support, Endpoints, Actions
    - Sortable columns: Patch ID, Title, Severity, Category, Vendor, Product, OS, Release Date, Status, Reboot Required, Rollback Support, Endpoints
    - Filterable columns: Severity, Category, Vendor, Product, OS, Status, Reboot Required, Rollback Support
    - Searchable columns: Patch ID, Title, Category, Vendor, Product, OS, KB Number, Bulletin ID
    - Clickable patch row (opens details modal/drawer)
    - Checkboxes for row selection
    - Actions column: View button, Deploy button, Decline button
    - Color-coded severity badges
    - Color-coded status badges
    - Reboot Required column: Displays "Yes" or "No" text, or icon indicator (CheckCircleOutlined for Yes, CloseCircleOutlined for No)
    - Rollback Support column: Displays "Yes" or "No" text, or icon indicator (CheckCircleOutlined for Yes, CloseCircleOutlined for No)
    - Endpoints column: Displays numeric count, styled as clickable link/button (LinkOutlined icon or underlined text)
  - **Advanced Filter Modal:**
    - Filter dropdowns for: Severity, Category, Vendor, Product, OS, Status, Reboot Required, Rollback Support, Organization, Branch Location
    - Apply button
    - Reset button (clears all filters)
    - Cancel button
  - **Column Visibility Modal:**
    - Checkboxes for each column
    - Apply button
    - Reset button (restores all columns)
  - **Patch Details Modal/Drawer:**
    - Comprehensive patch information display
    - Tabs or sections: Basic Info, Product Info, Patch Info, Status Info, Affected Endpoints, CVE Numbers, Tags, Languages, Related Patches
    - Close button
  - **Affected Endpoints Modal/Drawer:**
    - Title: "Affected Endpoints for [Patch ID/Title]"
    - Search input field (with SearchOutlined icon)
    - Filter dropdowns for: Endpoint Status (Online/Offline), Patch Status (Missing/Installed/Pending/Failed), Organization, Branch Location
    - Table/List of affected endpoints with columns:
      - Endpoint ID/Name
      - Asset Name (clickable, links to asset details)
      - Hostname
      - IP Address
      - OS
      - Status (Online/Offline - color-coded badges)
      - Patch Status on Endpoint (Missing/Installed/Pending/Failed - color-coded badges)
      - Organization
      - Branch Location
    - Sortable columns: Endpoint ID, Asset Name, Hostname, IP Address, OS, Status, Patch Status
    - Pagination controls (if many endpoints)
    - Export button (optional - exports endpoint list to CSV)
    - Close button
    - Loading state while fetching endpoints
    - Empty state when no endpoints are affected
  - **Decline Confirmation Modal:**
    - Message: "Are you sure you want to decline this patch?"
    - Reason text field (optional, multiline)
    - Decline button (primary, destructive)
    - Cancel button
  - **Bulk Decline Confirmation Modal:**
    - Message: "Are you sure you want to decline X selected patches?"
    - Reason text field (optional, multiline)
    - Decline button (primary, destructive)
    - Cancel button
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no patches exist
  - **No Results State:** Message when search/filter returns no matches

**User Actions:**
1. Navigate to Patches > All Patches page
2. View default "All" tab with all patches
3. Switch to "Missing" tab to view only missing patches
4. Switch to "Installed" tab to view only installed patches
5. Switch to "Decline" tab to view only declined patches
6. Use search box to filter patches by Patch ID, Title, Category, Vendor, Product, OS, KB Number, or Bulletin ID
7. Click filter button to open advanced filter modal
8. Apply filters by Severity, Category, Vendor, Product, OS, Status, Reboot Required, Rollback Support, Organization, or Branch Location
9. Click column headers to sort patches (Patch ID, Title, Severity, Category, Vendor, Product, OS, Release Date, Status, Reboot Required, Rollback Support, Endpoints)
10. Adjust pagination (change page size, navigate pages)
11. View Reboot Required and Rollback Support columns (Yes/No indicators)
12. Click on Endpoints count to view list of affected endpoints (opens Affected Endpoints modal/drawer)
13. In Affected Endpoints modal, search and filter endpoints
14. In Affected Endpoints modal, click on Asset Name to navigate to asset details (if clickable)
15. Click patch row or "View" button to view patch details
16. Click "Deploy" button to deploy a patch (opens deploy modal)
17. Click "Decline" button to decline a patch (shows confirmation dialog)
18. Select multiple patches using checkboxes
19. Perform bulk operations (Bulk Deploy, Bulk Decline)
20. Click Export button to download CSV/Excel
21. Click Refresh button to reload data
22. Use column visibility toggle to show/hide columns
23. Verify tab counts update when patch statuses change
24. Verify table content updates when switching tabs

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have deploy/decline permission)
- Verify page loads with "All" tab selected by default
- Test tab switching:
  - Switch to "Missing" tab - verify only missing patches are shown
  - Switch to "Installed" tab - verify only installed patches are shown
  - Switch to "Decline" tab - verify only declined patches are shown
  - Switch back to "All" tab - verify all patches are shown
  - Verify tab counts are accurate
  - Verify tab counts update when patch statuses change
- Test search functionality:
  - Search by patch ID (partial and full match)
  - Search by title (partial and full match)
  - Search by category, vendor, product, OS
  - Search by KB Number, Bulletin ID
  - Case-insensitive search
  - Search with no results
  - Clear search to show all patches
  - Verify search works across all tabs
- Test filtering:
  - Filter by severity (Critical, High, Medium, Low, Unspecified)
  - Filter by category
  - Filter by vendor
  - Filter by product
  - Filter by OS (Windows, MacOS, Linux, Ubuntu)
  - Filter by status (Missing, Installed, Decline, Pending, Failed)
  - Filter by Reboot Required (Yes, No)
  - Filter by Rollback Support (Yes, No)
  - Filter by organization (if multi-tenant)
  - Filter by branch location
  - Apply multiple filters simultaneously
  - Reset filters
  - Verify filters work across all tabs
- Test sorting:
  - Sort by Patch ID (numeric sorting)
  - Sort by Title (alphabetical sorting)
  - Sort by Severity
  - Sort by Category, Vendor, Product, OS (alphabetical)
  - Sort by Release Date (newest/oldest first)
  - Sort by Status
  - Sort by Reboot Required (Yes/No - boolean sorting)
  - Sort by Rollback Support (Yes/No - boolean sorting)
  - Sort by Endpoints (numeric)
  - Verify sorting works across all tabs
- Test Reboot Required column:
  - Verify column displays "Yes" or "No" text, or icon indicator
  - Verify "Yes" is shown for patches with rebootRequired: true
  - Verify "No" is shown for patches with rebootRequired: false
  - Verify column is filterable (Yes/No options)
  - Verify column is sortable
  - Verify column can be hidden/shown via column visibility
- Test Rollback Support column:
  - Verify column displays "Yes" or "No" text, or icon indicator
  - Verify "Yes" is shown for patches with supportUninstallation: true
  - Verify "No" is shown for patches with supportUninstallation: false
  - Verify column is filterable (Yes/No options)
  - Verify column is sortable
  - Verify column can be hidden/shown via column visibility
- Test Endpoints column:
  - Verify column displays numeric count of affected endpoints
  - Verify count is accurate
  - Verify column is styled as clickable (link or button style)
  - Click on endpoints count to open Affected Endpoints modal/drawer
  - Verify modal/drawer opens with correct patch information in title
  - Verify list of affected endpoints is displayed
  - Verify endpoint table shows all required columns (Endpoint ID, Asset Name, Hostname, IP Address, OS, Status, Patch Status, Organization, Branch Location)
  - Test search functionality in Affected Endpoints modal
  - Test filtering in Affected Endpoints modal (by Status, Patch Status, Organization, Branch Location)
  - Test sorting in Affected Endpoints modal
  - Test pagination in Affected Endpoints modal (if many endpoints)
  - Click on Asset Name in Affected Endpoints modal to navigate to asset details (if clickable)
  - Verify modal closes correctly
  - Test with patches that have no affected endpoints (should show empty state)
  - Test with patches that have many affected endpoints (verify pagination works)
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify pagination resets or maintains when switching tabs
  - Verify total count is accurate
- Test patch details:
  - Click patch row to view details
  - Click "View" button to view details
  - Verify all patch information is displayed correctly
  - Verify affected endpoints list is shown
  - Verify CVE numbers are displayed
  - Verify tags and languages are shown
  - Verify related patches (supersedes/superseded by) are shown
- Test decline functionality:
  - Decline single patch with reason
  - Decline single patch without reason
  - Verify patch status changes to "Decline"
  - Verify patch moves to "Decline" tab
  - Decline multiple patches (bulk decline)
  - Verify all selected patches are declined
  - Verify decline confirmation dialog works correctly
  - Test canceling decline action
- Test deploy functionality:
  - Click "Deploy" button (should open deploy modal - functionality covered in separate user story)
  - Verify deploy button is available for patches with status "Missing" or "Pending"
- Test bulk operations:
  - Select multiple patches
  - Perform bulk deploy (if available)
  - Perform bulk decline
  - Verify bulk operations work correctly
  - Verify bulk operations respect user permissions
- Test export functionality:
  - Export all patches
  - Export filtered/search results
  - Export patches from specific tab
  - Verify CSV/Excel file is downloaded correctly
  - Verify CSV includes correct columns and data
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search/tab selection are maintained
- Test column visibility:
  - Hide/show individual columns including Reboot Required and Rollback Support
  - Apply column visibility changes
  - Reset column visibility to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify column visibility preferences persist across sessions
  - Verify Reboot Required and Rollback Support columns can be toggled independently
- Test column pinning:
  - Pin Patch ID column to left
  - Verify column is pinned correctly
  - Unpin column
  - Verify column returns to normal position
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no patches exist
  - "No results found" when search returns no matches
  - Empty state for specific tab when no patches match that status
- Test date formatting in Release Date column
- Test badge colors for Severity and Status columns
- Test Reboot Required and Rollback Support column display (Yes/No or icons)
- Test endpoints count display and clickability
- Verify Affected Endpoints modal performance with large number of endpoints
- Verify table performance with large number of patches
- Test responsive design (table on different screen sizes)
- Test real-time updates when patch statuses change
- Verify user permissions are enforced correctly

---

### User Story 2: Patch Actions

**Story ID:** `US-032`  
**Title:** View Patches and Perform Actions (Deploy, Decline, Test, Approve)  
**Priority:** P0 (Critical)  
**Module:** Patches - Patch Management

**User Story:**
```
As a system administrator
I want to view patch details and perform actions (Deploy, Decline, Test, Approve) on one or more selected patches
So that I can manage patch lifecycle, testing, approval, and deployment efficiently
```

**Acceptance Criteria:**
- [ ] AC1: User can view patch details by clicking on patch row or "View" action button
- [ ] AC2: Patch details modal/drawer displays comprehensive patch information (covered in US-031)
- [ ] AC3: User can select a single patch using checkbox in the patches table
- [ ] AC4: User can select multiple patches using checkboxes in the patches table
- [ ] AC5: When one or more patches are selected, action buttons/menu becomes available
- [ ] AC6: Action buttons/menu includes the following options:
  - Deploy Patch
  - Decline Patch
  - Test Patch
  - Approve Patch
- [ ] AC7: Action buttons are initially disabled (grayed out) when no patches are selected
- [ ] AC8: Action buttons become enabled when one or more patches are selected
- [ ] AC9: Patches with "Decline" status do not have any actions available (all action buttons are disabled for declined patches)
- [ ] AC10: User can deploy one or more selected patches by clicking "Deploy Patch" button
- [ ] AC11: Deploy Patch button opens Deploy Patch modal/drawer
- [ ] AC12: Deploy Patch modal displays title "Deploy Patch" or "Deploy Patches" with count of selected patches
- [ ] AC13: Deploy Patch form includes the following fields:
  - **Name** (mandatory, text input)
  - **Description** (optional, textarea)
  - **Deployment Type** (mandatory, dropdown: Install, Rollback)
  - **Target Selection** (mandatory):
    - Scope dropdown: All Endpoints, Specific Groups, Custom Selection
    - If "Specific Groups": Group selection (multi-select)
    - If "Custom Selection": Endpoint selection (multi-select with search)
  - **Schedule** (mandatory):
    - Toggle: Immediate or Scheduled
    - If Scheduled: Date and Time picker
  - **Deployment Options** (optional):
    - Reboot Policy (dropdown: If Required, Always, Never)
    - Notify Users (checkbox)
    - Force Restart (checkbox)
    - Force Restart Timeout (number input, minutes)
- [ ] AC14: Deploy Patch form validates all mandatory fields before submission
- [ ] AC15: System validates that selected patches are approved (approvalStatus = "Approved") before allowing deployment
- [ ] AC16: System shows error message if trying to deploy unapproved patches (patches must be approved first)
- [ ] AC17: Upon successful deployment creation, system shows success message
- [ ] AC18: Deploy Patch modal closes after successful deployment
- [ ] AC19: User is automatically redirected to Patches > Patches Deployed page after successful deployment creation
- [ ] AC20: On Patches Deployed page, user can see the newly created deployment job in the list
- [ ] AC21: User can decline one or more selected patches by clicking "Decline Patch" button
- [ ] AC22: Decline Patch button opens Decline Confirmation modal
- [ ] AC23: Decline Confirmation modal displays message: "Are you sure you want to decline X selected patch(es)?"
- [ ] AC24: Decline Confirmation modal includes optional "Reason" text field (multiline)
- [ ] AC25: Decline Confirmation modal has "Decline" button (primary, destructive) and "Cancel" button
- [ ] AC26: Upon confirming decline, system updates patch status to "Decline" for all selected patches
- [ ] AC27: System creates audit log entry for decline action
- [ ] AC28: Success message is displayed after declining patches
- [ ] AC29: Decline Confirmation modal closes after successful decline
- [ ] AC30: Selected patches are cleared after successful decline
- [ ] AC31: User can test a single selected patch by clicking "Test Patch" button
- [ ] AC32: Test Patch button is only available when exactly one patch is selected
- [ ] AC33: Test Patch button opens Test Patch modal/drawer
- [ ] AC34: Test Patch modal displays title "Test Patch" with patch ID/Title
- [ ] AC35: Test Patch form includes the following fields:
  - **Test Status** (mandatory, radio buttons or dropdown: Passed, Failed)
  - **Test Environment** (optional, text input)
  - **Test Notes** (optional, textarea)
- [ ] AC36: Test Patch form validates that Test Status is selected before submission
- [ ] AC37: Upon successful test submission, system updates patch test status:
  - If "Passed": testStatus = "Tested", testResult = "passed"
  - If "Failed": testStatus = "Test Failed", testResult = "failed", approvalStatus = "Rejected"
- [ ] AC38: System records tester information (user ID, timestamp) in patch record
- [ ] AC39: System creates audit log entry for test action
- [ ] AC40: Success message is displayed after testing patch
- [ ] AC41: Test Patch modal closes after successful test submission
- [ ] AC42: User is automatically redirected to Patches > Patch Test & Approve page after successful test submission
- [ ] AC43: On Patch Test & Approve page, user can see the test job/record for the tested patch
- [ ] AC44: User can approve a single selected patch by clicking "Approve Patch" button
- [ ] AC45: Approve Patch button is only available when exactly one patch is selected
- [ ] AC46: Approve Patch button is always enabled (can approve tested or untested patches)
- [ ] AC47: Approve Patch button opens Approve Patch modal/drawer
- [ ] AC48: Approve Patch modal displays title "Approve Patch" with patch ID/Title
- [ ] AC49: Approve Patch form includes the following fields:
  - **Reason** (mandatory, textarea) - User must provide reason for approval
- [ ] AC50: Approve Patch form validates that Reason is provided before submission
- [ ] AC51: If patch is not tested, system allows approval but requires mandatory reason
- [ ] AC52: If patch is tested with "passed" result, system allows approval with mandatory reason
- [ ] AC53: If patch is tested with "failed" result, system shows warning but still allows approval with mandatory reason
- [ ] AC54: Upon confirming approval, system updates patch approvalStatus to "Approved"
- [ ] AC55: System records approver information (user ID, timestamp) and approval reason in patch record
- [ ] AC56: System creates audit log entry for approval action
- [ ] AC57: Success message is displayed after approving patch
- [ ] AC58: Approve Patch modal closes after successful approval
- [ ] AC59: All action modals have Cancel button that closes modal without performing action
- [ ] AC60: All action modals have Reset button (where applicable) that resets form fields
- [ ] AC61: System handles errors gracefully and displays appropriate error messages
- [ ] AC62: System prevents performing actions on patches that are already in the target state (e.g., cannot approve already approved patch)
- [ ] AC63: Action buttons respect user permissions (users without permission cannot perform certain actions)
- [ ] AC64: Patch table refreshes after successful action to show updated statuses

**Test Data:**
```json
{
  "patches": [
    {
      "id": "patch-001",
      "patchId": "KB5012345",
      "title": "Security Update for Windows Server 2022",
      "status": "Missing",
      "testStatus": "Not Tested",
      "testResult": null,
      "approvalStatus": "Pending",
      "rebootRequired": true,
      "supportUninstallation": true
    },
    {
      "id": "patch-002",
      "patchId": "KB5012346",
      "title": "Cumulative Update for Windows 11",
      "status": "Missing",
      "testStatus": "Tested",
      "testResult": "passed",
      "approvalStatus": "Pending",
      "rebootRequired": true,
      "supportUninstallation": false
    },
    {
      "id": "patch-003",
      "patchId": "KB5012347",
      "title": "Feature Update for Windows 10",
      "status": "Missing",
      "testStatus": "Test Failed",
      "testResult": "failed",
      "approvalStatus": "Rejected",
      "rebootRequired": true,
      "supportUninstallation": false
    },
    {
      "id": "patch-004",
      "patchId": "KB5012348",
      "title": "Security Update for Windows Server 2019",
      "status": "Missing",
      "testStatus": "Tested",
      "testResult": "passed",
      "approvalStatus": "Approved",
      "rebootRequired": false,
      "supportUninstallation": true
    }
  ],
  "deployForm": {
    "name": "Security Patches Deployment - January 2024",
    "description": "Deploying critical security patches to all Windows endpoints",
    "type": "INSTALL",
    "scope": "all",
    "targetGroups": [],
    "endpointIds": [],
    "schedule": {
      "type": "scheduled",
      "date": "2024-01-20",
      "time": "02:00"
    },
    "options": {
      "rebootPolicy": "if_required",
      "notifyUsers": true,
      "forceRestart": false,
      "forceRestartTimeout": 30
    }
  },
  "testForm": {
    "status": "passed",
    "testEnvironment": "Test Lab - Windows Server 2022",
    "testNotes": "Patch tested successfully. No issues found. All applications working correctly."
  },
  "declineForm": {
    "reason": "Not applicable to our environment. We use a different version."
  },
  "groups": [
    {
      "id": "group-001",
      "name": "Windows Servers",
      "description": "All Windows Server endpoints"
    },
    {
      "id": "group-002",
      "name": "Windows Workstations",
      "description": "All Windows workstation endpoints"
    }
  ],
  "endpoints": [
    {
      "id": "endpoint-001",
      "endpointId": "EP-001",
      "assetName": "Windows Server 01",
      "hostname": "win-server-01",
      "ipAddress": "192.168.1.100"
    },
    {
      "id": "endpoint-002",
      "endpointId": "EP-002",
      "assetName": "Windows Server 02",
      "hostname": "win-server-02",
      "ipAddress": "192.168.1.101"
    }
  ]
}
```

**API Endpoints:**
- `GET /v1/patches/:id` - Get patch details by ID
  - Response: Detailed patch information
- `POST /v1/patches/deployments` - Create patch deployment
  - Request Body:
    - `name` (string, required): Deployment name
    - `description` (string, optional): Deployment description
    - `type` (string, required): Deployment type ("INSTALL" or "ROLLBACK")
    - `patchIds` (array, required): List of patch IDs to deploy
    - `scope` (string, required): Target scope ("all", "groups", "custom")
    - `targetGroups` (array, optional): List of group IDs (if scope is "groups")
    - `endpointIds` (array, optional): List of endpoint IDs (if scope is "custom")
    - `schedule` (object, required):
      - `type` (string): "immediate" or "scheduled"
      - `date` (string, optional): Scheduled date (YYYY-MM-DD)
      - `time` (string, optional): Scheduled time (HH:mm)
    - `options` (object, optional):
      - `rebootPolicy` (string): "if_required", "always", "never"
      - `notifyUsers` (boolean): Whether to notify users
      - `forceRestart` (boolean): Whether to force restart
      - `forceRestartTimeout` (number): Timeout in minutes
  - Response: Created deployment object
- `PUT /v1/patches/:id/decline` - Decline a patch
  - Request Body:
    - `reason` (string, optional): Reason for declining
  - Response: Updated patch with status "Decline"
- `PUT /v1/patches/bulk-decline` - Decline multiple patches
  - Request Body:
    - `patchIds` (array, required): List of patch IDs to decline
    - `reason` (string, optional): Reason for declining
  - Response: Count of declined patches
- `POST /v1/patches/:id/test` - Test a patch
  - Request Body:
    - `status` (string, required): "passed" or "failed"
    - `testEnvironment` (string, optional): Test environment description
    - `notes` (string, optional): Test notes
  - Response: Updated patch with test status
- `POST /v1/patches/:id/approve` - Approve a patch
  - Request Body:
    - `reason` (string, required): Reason for approval (mandatory)
  - Response: Updated patch with approvalStatus "Approved"
- `GET /v1/groups` - Get list of groups for target selection
  - Query Parameters:
    - `search` (optional): Search by group name
  - Response: List of groups
- `GET /v1/endpoints` - Get list of endpoints for target selection
  - Query Parameters:
    - `search` (optional): Search by endpoint ID, asset name, hostname, IP address
    - `organizationId` (optional): Filter by organization
    - `branchId` (optional): Filter by branch location
  - Response: List of endpoints

**UI Components:**
- Page: `/patches/all-patches` (AllPatches.tsx) or `/patches/patch-details` (PatchDetails.tsx)
- Components:
  - **Patches Table:**
    - Checkboxes for row selection
    - Actions column with View button
    - Bulk action buttons/menu in table header
  - **Action Buttons/Menu:**
    - **Deploy Patch button** (primary, enabled when approved patches selected, disabled for declined patches)
    - **Decline Patch button** (default, enabled when patches selected, disabled for declined patches)
    - **Test Patch button** (default, enabled when exactly one patch selected, disabled for declined patches)
    - **Approve Patch button** (default, enabled when exactly one patch selected, disabled for declined patches)
    - Buttons disabled when no patches selected
    - All action buttons disabled for patches with "Decline" status
  - **Deploy Patch Modal/Drawer:**
    - Title: "Deploy Patch" or "Deploy Patches (X)"
    - Form fields:
      - Name (Input, mandatory)
      - Description (TextArea, optional)
      - Deployment Type (Select: Install, Rollback)
      - Target Selection section:
        - Scope (Select: All Endpoints, Specific Groups, Custom Selection)
        - Group Selection (Multi-select, shown when scope is "Specific Groups")
        - Endpoint Selection (Multi-select with search, shown when scope is "Custom Selection")
      - Schedule section:
        - Toggle: Immediate / Scheduled
        - Date and Time picker (shown when Scheduled is selected)
      - Deployment Options section (collapsible):
        - Reboot Policy (Select: If Required, Always, Never)
        - Notify Users (Checkbox)
        - Force Restart (Checkbox)
        - Force Restart Timeout (InputNumber, minutes)
    - Action buttons: Deploy (primary), Cancel (default), Reset (default)
    - Loading state while creating deployment
    - Success/error messages
    - Redirect to Patches Deployed page after successful deployment
  - **Decline Confirmation Modal:**
    - Title: "Decline Patch" or "Decline Patches"
    - Message: "Are you sure you want to decline X selected patch(es)?"
    - Reason field (TextArea, optional, multiline)
    - Action buttons: Decline (primary, destructive), Cancel (default)
    - Loading state while declining
    - Success/error messages
  - **Test Patch Modal/Drawer:**
    - Title: "Test Patch - [Patch ID/Title]"
    - Form fields:
      - Test Status (Radio.Group or Select: Passed, Failed) - mandatory
      - Test Environment (Input, optional)
      - Test Notes (TextArea, optional, multiline)
    - Action buttons: Submit (primary), Cancel (default), Reset (default)
    - Loading state while submitting test
    - Success/error messages
    - Redirect to Patch Test & Approve page after successful test submission
  - **Approve Patch Modal/Drawer:**
    - Title: "Approve Patch - [Patch ID/Title]"
    - Form fields:
      - Reason (TextArea, mandatory, multiline) - User must provide reason for approval
    - Warning message (if patch is not tested or test failed): "This patch has not been tested or test failed. Please provide a reason for approval."
    - Action buttons: Approve (primary), Cancel (default), Reset (default)
    - Loading state while approving
    - Success/error messages
  - **Patch Details Modal/Drawer:**
    - Comprehensive patch information (covered in US-031)
    - Action buttons: Deploy, Decline, Test, Approve (if applicable)

**User Actions:**
1. Navigate to Patches > All Patches page
2. View patches table
3. Select a single patch using checkbox
4. Verify action buttons become enabled
5. Select multiple patches using checkboxes
6. Verify action buttons remain enabled
7. Click "View" button or patch row to view patch details
8. **Deploy Patch:**
   - Click "Deploy Patch" button
   - Verify Deploy Patch modal opens
   - Fill in deployment form:
     - Enter deployment name
     - Enter description (optional)
     - Select deployment type (Install or Rollback)
     - Select target scope (All Endpoints, Specific Groups, or Custom Selection)
     - If "Specific Groups": Select groups from dropdown
     - If "Custom Selection": Search and select endpoints
     - Select schedule (Immediate or Scheduled)
     - If Scheduled: Select date and time
     - Configure deployment options (optional)
   - Click "Deploy" button
   - Verify validation occurs
   - Verify deployment is created successfully
   - Verify success message appears
   - Verify modal closes
   - Verify user is redirected to Patches > Patches Deployed page
   - Verify newly created deployment job is visible on Patches Deployed page
9. **Decline Patch:**
   - Select one or more patches
   - Click "Decline Patch" button
   - Verify Decline Confirmation modal opens
   - Enter reason for declining (optional)
   - Click "Decline" button
   - Verify patches are declined successfully
   - Verify success message appears
   - Verify modal closes
   - Verify patch status changes to "Decline"
10. **Test Patch:**
    - Select exactly one patch
    - Click "Test Patch" button
    - Verify Test Patch modal opens
    - Fill in test form:
      - Select test status (Passed or Failed)
      - Enter test environment (optional)
      - Enter test notes (optional)
    - Click "Submit" button
    - Verify test is recorded successfully
    - Verify success message appears
    - Verify modal closes
    - Verify patch test status is updated
    - Verify user is redirected to Patches > Patch Test & Approve page
    - Verify test job/record is visible on Patch Test & Approve page
11. **Approve Patch:**
    - Select exactly one patch (can be tested or untested)
    - Click "Approve Patch" button
    - Verify Approve Patch modal opens
    - Review patch information
    - Enter reason for approval (mandatory field)
    - Verify form validation requires reason to be filled
    - Click "Approve" button
    - Verify patch is approved successfully
    - Verify success message appears
    - Verify modal closes
    - Verify patch approval status is updated
    - Verify approval reason is recorded
12. Test with patches in different states (not tested, tested failed, tested passed, already approved, declined)
13. Test error scenarios (trying to deploy unapproved patches, trying to perform actions on declined patches)
14. Test canceling actions (click Cancel button in modals)
15. Test resetting forms (click Reset button where available)

**Test Notes:**
- Test with admin role (should have full access to all actions)
- Test with regular user role (should have view access, may not have deploy/approve permission)
- Test patch selection:
  - Select single patch - verify action buttons become enabled
  - Select multiple patches - verify action buttons remain enabled
  - Deselect all patches - verify action buttons become disabled
  - Verify Test and Approve buttons are only enabled when exactly one patch is selected
  - Select patch with "Decline" status - verify all action buttons are disabled
  - Verify declined patches cannot have any actions performed on them
- Test Deploy Patch functionality:
  - Deploy single patch
  - Deploy multiple patches
  - Test with different deployment types (Install, Rollback)
  - Test with different target scopes (All Endpoints, Specific Groups, Custom Selection)
  - Test immediate deployment
  - Test scheduled deployment
  - Test deployment options (reboot policy, notify users, force restart)
  - Verify validation for mandatory fields
  - Verify error when trying to deploy unapproved patches (patches must be approved first)
  - Verify error when trying to rollback patches that are not installed
  - Verify user is redirected to Patches Deployed page after successful deployment
  - Verify deployment job is visible on Patches Deployed page
  - Test canceling deployment
  - Test resetting deployment form
- Test Decline Patch functionality:
  - Decline single patch
  - Decline multiple patches (bulk decline)
  - Decline with reason
  - Decline without reason
  - Verify patch status changes to "Decline"
  - Verify patches move to "Decline" tab
  - Verify audit log is created
  - Test canceling decline action
- Test Test Patch functionality:
  - Test patch with "Passed" status
  - Test patch with "Failed" status
  - Test with test environment and notes
  - Test without test environment and notes
  - Verify test status is updated correctly
  - Verify test result is recorded
  - Verify tester information is recorded
  - Verify timestamp is recorded
  - Verify audit log is created
  - Verify that failed test automatically sets approval status to "Rejected"
  - Verify user is redirected to Patch Test & Approve page after successful test submission
  - Verify test job/record is visible on Patch Test & Approve page
  - Test canceling test action
  - Test resetting test form
- Test Approve Patch functionality:
  - Approve patch that is tested with "passed" result
  - Enter mandatory reason for approval
  - Verify approval status is updated to "Approved"
  - Verify approver information is recorded
  - Verify approval reason is recorded
  - Verify timestamp is recorded
  - Verify audit log is created
  - Approve patch that is not tested - verify it allows approval with mandatory reason
  - Approve patch that failed test - verify it allows approval with mandatory reason (warning may be shown)
  - Verify form validation requires reason to be filled
  - Try to approve without providing reason - verify validation error
  - Try to approve patch that is already approved - verify error or disabled state
  - Test canceling approval action
  - Test resetting approval form
- Test action button states:
  - Verify buttons are disabled when no patches selected
  - Verify buttons are enabled when patches selected
  - Verify Test and Approve buttons are only enabled for single patch selection
  - Verify Approve button is always enabled (can approve tested or untested patches)
  - Verify all action buttons are disabled for patches with "Decline" status
  - Verify Deploy button is only enabled for approved patches
  - Verify action availability based on patch status
- Test error handling:
  - Network errors during actions
  - Validation errors
  - Permission errors
  - Verify appropriate error messages are displayed
- Test audit logging:
  - Verify all actions create audit log entries
  - Verify audit logs include user, timestamp, and action details
- Test real-time updates:
  - Verify patch table refreshes after actions
  - Verify patch statuses update correctly
  - Verify tab counts update when patches are declined
- Test user permissions:
  - Test with user who has deploy permission
  - Test with user who has approve permission
  - Test with user who has only view permission
  - Verify actions are restricted based on permissions
- Test with different patch states:
  - Patches with status: Missing, Installed, Decline, Pending, Failed
  - Patches with test status: Not Tested, Tested, Test Failed
  - Patches with approval status: Pending, Approved, Rejected
  - Verify appropriate actions are available for each state
  - Verify declined patches have no actions available
  - Verify only approved patches can be deployed
  - Verify patches can be approved even if not tested (with mandatory reason)

---

### User Story 3: Patch Deployed Page Functions

**Story ID:** `US-033`  
**Title:** View and Manage Patch Deployments in Table View  
**Priority:** P0 (Critical)  
**Module:** Patches - Patch Deployment Management

**User Story:**
```
As a system administrator
I want to view, search, filter, and manage patch deployments in a table view
So that I can monitor deployment status, view deployment details, and manage deployment jobs efficiently
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Patches > Patches Deployed page
- [ ] AC2: Patches Deployed page displays a table listing all patch deployments
- [ ] AC3: Table displays the following columns (configurable visibility):
  - Name (sortable, searchable)
  - ID (searchable, deployment ID)
  - Type (filterable, color-coded badges: INSTALL, ROLLBACK)
  - Stage (filterable, color-coded badges: PENDING, IN_PROGRESS, COMPLETED, INSTALLED, FAILED)
  - Pending (sortable, numeric - count of pending tasks)
  - Succeeded (sortable, numeric - count of succeeded tasks)
  - Failed (sortable, numeric - count of failed tasks)
  - Created By (searchable)
  - Created On (sortable, formatted date/time)
  - Actions (View, View Tasks, Cancel)
- [ ] AC4: User can search deployments by Name or Deployment ID using a search input field
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: User can filter deployments by:
  - Type (via Type column filter dropdown: INSTALL, ROLLBACK)
  - Stage (via Stage column filter dropdown: PENDING, IN_PROGRESS, COMPLETED, INSTALLED, FAILED)
  - Organization (if multi-tenant, via Organization filter dropdown)
  - Branch Location (via Branch Location filter dropdown)
- [ ] AC7: User can sort deployments by:
  - Name (ascending/descending, alphabetical)
  - Type (ascending/descending)
  - Stage (ascending/descending)
  - Pending (ascending/descending, numeric)
  - Succeeded (ascending/descending, numeric)
  - Failed (ascending/descending, numeric)
  - Created On (newest/oldest first, date)
- [ ] AC8: User can paginate through deployments using table pagination controls
- [ ] AC9: User can view deployment details by clicking on deployment row or "View" action button
- [ ] AC10: Deployment details modal/drawer displays comprehensive deployment information including:
  - Basic Information: Name, Deployment ID, Description, Type, Stage
  - Deployment Statistics: Total Tasks, Pending, Succeeded, Failed
  - Schedule Information: Scheduled At, Started At, Completed At
  - Target Information: Scope, Target Groups, Endpoints
  - Patches Information: List of patches included in deployment
  - Created Information: Created By, Created On
- [ ] AC11: User can view deployment tasks by clicking "View Tasks" action button
- [ ] AC12: View Tasks opens Deployment Tasks modal/drawer
- [ ] AC13: Deployment Tasks modal displays table/list of all deployment tasks with columns:
  - Endpoint Name (clickable, links to endpoint/asset details)
  - Asset Name
  - Hostname
  - IP Address
  - OS
  - Status (color-coded badges: PENDING, IN_PROGRESS, SUCCESS, FAILED)
  - Started At (formatted date/time)
  - Completed At (formatted date/time)
  - Error Message (if failed, displayed in tooltip or expandable section)
- [ ] AC14: Deployment Tasks modal supports search and filtering of tasks
- [ ] AC15: Deployment Tasks modal supports pagination if there are many tasks
- [ ] AC16: Deployment Tasks modal supports filtering by task status (All, PENDING, IN_PROGRESS, SUCCESS, FAILED)
- [ ] AC17: User can cancel a deployment by clicking "Cancel" action button
- [ ] AC18: Cancel button is only available for deployments with stage PENDING or IN_PROGRESS
- [ ] AC19: Cancel button is disabled for deployments with stage COMPLETED, INSTALLED, or FAILED
- [ ] AC20: Cancel Deployment button opens Cancel Confirmation modal
- [ ] AC21: Cancel Confirmation modal displays message: "Are you sure you want to cancel this deployment?"
- [ ] AC22: Cancel Confirmation modal shows deployment information (Name, Deployment ID)
- [ ] AC23: Cancel Confirmation modal includes optional "Reason" text field (multiline)
- [ ] AC24: Cancel Confirmation modal has "Cancel Deployment" button (primary, destructive) and "Cancel" button
- [ ] AC25: Upon confirming cancellation, system updates deployment stage to "CANCELLED" or "FAILED"
- [ ] AC26: System stops all pending and in-progress tasks for the deployment
- [ ] AC27: System creates audit log entry for cancellation action
- [ ] AC28: Success message is displayed after cancelling deployment
- [ ] AC29: Cancel Confirmation modal closes after successful cancellation
- [ ] AC30: Type column displays color-coded badges (INSTALL=blue, ROLLBACK=red)
- [ ] AC31: Stage column displays color-coded badges:
  - PENDING=yellow
  - IN_PROGRESS=orange
  - COMPLETED=green
  - INSTALLED=blue
  - FAILED=red
- [ ] AC32: Created On column displays formatted date and time
- [ ] AC33: Pending, Succeeded, and Failed columns display numeric counts
- [ ] AC34: User can use column visibility toggle to show/hide columns
- [ ] AC35: Column visibility preferences are saved and persist across sessions
- [ ] AC36: User can pin/unpin columns (e.g., Name can be pinned to left)
- [ ] AC37: Table displays empty state message when no deployments exist
- [ ] AC38: Table shows loading state while fetching deployment data
- [ ] AC39: Table shows "No results found" message when search/filter returns no matches
- [ ] AC40: Refresh/Reload button reloads deployment list from server
- [ ] AC41: Table supports export functionality (Export button) to export deployment list as CSV/Excel
- [ ] AC42: Exported CSV includes all visible columns and filtered/search results
- [ ] AC43: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC44: Page respects user permissions - users with view-only permission cannot cancel deployments
- [ ] AC45: Deployment table updates in real-time or refreshes periodically to show status changes
- [ ] AC46: Deployment statistics (Pending, Succeeded, Failed) update in real-time as tasks complete
- [ ] AC47: Stage badges update automatically when deployment stage changes
- [ ] AC48: User can click on deployment name to view deployment details (same as View button)

**Test Data:**
```json
{
  "deployments": [
    {
      "id": "deployment-001",
      "deploymentId": "DEP-2024-001",
      "name": "Security Patches Deployment - January 2024",
      "description": "Deploying critical security patches to all Windows endpoints",
      "type": "INSTALL",
      "stage": "IN_PROGRESS",
      "pending": 25,
      "succeeded": 120,
      "failed": 5,
      "totalTasks": 150,
      "scope": "all",
      "targetGroups": [],
      "endpointIds": [],
      "scheduledAt": "2024-01-20T02:00:00Z",
      "startedAt": "2024-01-20T02:00:00Z",
      "completedAt": null,
      "createdBy": "admin@example.com",
      "createdOn": "2024-01-19T10:00:00Z",
      "patches": [
        {
          "id": "patch-001",
          "patchId": "KB5012345",
          "title": "Security Update for Windows Server 2022"
        },
        {
          "id": "patch-002",
          "patchId": "KB5012346",
          "title": "Cumulative Update for Windows 11"
        }
      ]
    },
    {
      "id": "deployment-002",
      "deploymentId": "DEP-2024-002",
      "name": "Rollback Deployment - Failed Patches",
      "description": "Rolling back failed patches from previous deployment",
      "type": "ROLLBACK",
      "stage": "COMPLETED",
      "pending": 0,
      "succeeded": 50,
      "failed": 0,
      "totalTasks": 50,
      "scope": "groups",
      "targetGroups": ["group-001", "group-002"],
      "endpointIds": [],
      "scheduledAt": "2024-01-18T03:00:00Z",
      "startedAt": "2024-01-18T03:00:00Z",
      "completedAt": "2024-01-18T04:30:00Z",
      "createdBy": "admin@example.com",
      "createdOn": "2024-01-17T14:00:00Z",
      "patches": [
        {
          "id": "patch-003",
          "patchId": "KB5012347",
          "title": "Feature Update for Windows 10"
        }
      ]
    },
    {
      "id": "deployment-003",
      "deploymentId": "DEP-2024-003",
      "name": "Scheduled Security Patches",
      "description": "Scheduled deployment for security patches",
      "type": "INSTALL",
      "stage": "PENDING",
      "pending": 200,
      "succeeded": 0,
      "failed": 0,
      "totalTasks": 200,
      "scope": "custom",
      "targetGroups": [],
      "endpointIds": ["endpoint-001", "endpoint-002", "endpoint-003"],
      "scheduledAt": "2024-01-21T01:00:00Z",
      "startedAt": null,
      "completedAt": null,
      "createdBy": "admin@example.com",
      "createdOn": "2024-01-19T15:00:00Z",
      "patches": [
        {
          "id": "patch-004",
          "patchId": "KB5012348",
          "title": "Security Update for Windows Server 2019"
        }
      ]
    }
  ],
  "deploymentTasks": [
    {
      "id": "task-001",
      "deploymentId": "deployment-001",
      "assetId": "asset-001",
      "assetName": "Windows Server 01",
      "endpointId": "endpoint-001",
      "endpointName": "EP-001",
      "hostname": "win-server-01",
      "ipAddress": "192.168.1.100",
      "os": "Windows",
      "osVersion": "Windows Server 2022",
      "status": "SUCCESS",
      "startedAt": "2024-01-20T02:05:00Z",
      "completedAt": "2024-01-20T02:15:00Z",
      "errorMessage": null
    },
    {
      "id": "task-002",
      "deploymentId": "deployment-001",
      "assetId": "asset-002",
      "assetName": "Windows Server 02",
      "endpointId": "endpoint-002",
      "endpointName": "EP-002",
      "hostname": "win-server-02",
      "ipAddress": "192.168.1.101",
      "os": "Windows",
      "osVersion": "Windows Server 2022",
      "status": "IN_PROGRESS",
      "startedAt": "2024-01-20T02:10:00Z",
      "completedAt": null,
      "errorMessage": null
    },
    {
      "id": "task-003",
      "deploymentId": "deployment-001",
      "assetId": "asset-003",
      "assetName": "Windows Workstation 01",
      "endpointId": "endpoint-003",
      "endpointName": "EP-003",
      "hostname": "win-ws-01",
      "ipAddress": "192.168.1.102",
      "os": "Windows",
      "osVersion": "Windows 11",
      "status": "FAILED",
      "startedAt": "2024-01-20T02:08:00Z",
      "completedAt": "2024-01-20T02:12:00Z",
      "errorMessage": "Patch installation failed: Insufficient disk space"
    }
  ],
  "filters": {
    "type": ["INSTALL", "ROLLBACK"],
    "stage": ["PENDING", "IN_PROGRESS", "COMPLETED", "INSTALLED", "FAILED"]
  },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50
  }
}
```

**API Endpoints:**
- `GET /v1/patches/deployments` - Get list of deployments with filtering, sorting, and pagination
  - Query Parameters:
    - `type` (optional): Filter by type (INSTALL, ROLLBACK)
    - `stage` (optional): Filter by stage (PENDING, IN_PROGRESS, COMPLETED, INSTALLED, FAILED)
    - `search` (optional): Search by deployment name or deployment ID
    - `organizationId` (optional): Filter by organization
    - `branchId` (optional): Filter by branch location
    - `sortBy` (optional): Sort field (name, type, stage, pending, succeeded, failed, createdOn)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 20)
  - Response: Paginated list of deployments with metadata
- `GET /v1/patches/deployments/:id` - Get deployment details by ID
  - Response: Detailed deployment information including patches, target information, schedule
- `GET /v1/patches/deployments/:id/tasks` - Get list of deployment tasks
  - Query Parameters:
    - `search` (optional): Search by endpoint name, asset name, hostname, IP address
    - `status` (optional): Filter by task status (PENDING, IN_PROGRESS, SUCCESS, FAILED)
    - `sortBy` (optional): Sort field (endpointName, assetName, hostname, ipAddress, os, status, startedAt, completedAt)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 20)
  - Response: Paginated list of deployment tasks with metadata
- `DELETE /v1/patches/deployments/:id` - Cancel a deployment
  - Request Body:
    - `reason` (string, optional): Reason for cancellation
  - Response: Updated deployment with stage "CANCELLED" or "FAILED"
- `GET /v1/patches/deployments/export` - Export deployments to CSV/Excel
  - Query Parameters: Same as GET /v1/patches/deployments
  - Response: CSV/Excel file download

**UI Components:**
- Page: `/patches/deployed` (PatchDeployed.tsx)
- Components:
  - **Page Header:**
    - Page title "Patches Deployed"
    - Breadcrumb navigation: Patches > Patches Deployed
  - **Table Header:**
    - Search input field (with SearchOutlined icon)
    - Filter button (FilterOutlined icon) - opens advanced filter modal
    - Export button (DownloadOutlined icon) - exports to CSV/Excel
    - Refresh button (ReloadOutlined icon) - reloads data
    - Column visibility toggle button (EyeOutlined icon)
  - **Table:**
    - Columns: Name, ID, Type, Stage, Pending, Succeeded, Failed, Created By, Created On, Actions
    - Sortable columns: Name, Type, Stage, Pending, Succeeded, Failed, Created On
    - Filterable columns: Type, Stage
    - Searchable columns: Name, ID, Created By
    - Clickable deployment row (opens details modal/drawer)
    - Actions column: View button, View Tasks button, Cancel button (dropdown menu)
    - Color-coded type badges
    - Color-coded stage badges
  - **Advanced Filter Modal:**
    - Filter dropdowns for: Type, Stage, Organization, Branch Location
    - Apply button
    - Reset button (clears all filters)
    - Cancel button
  - **Column Visibility Modal:**
    - Checkboxes for each column
    - Apply button
    - Reset button (restores all columns)
  - **Deployment Details Modal/Drawer:**
    - Comprehensive deployment information display
    - Tabs or sections: Basic Info, Statistics, Schedule, Targets, Patches, Created Info
    - Close button
  - **Deployment Tasks Modal/Drawer:**
    - Title: "Deployment Tasks - [Deployment Name/ID]"
    - Search input field (with SearchOutlined icon)
    - Filter dropdown for task status (All, PENDING, IN_PROGRESS, SUCCESS, FAILED)
    - Table/List of deployment tasks with columns:
      - Endpoint Name (clickable, links to endpoint/asset details)
      - Asset Name
      - Hostname
      - IP Address
      - OS
      - Status (color-coded badges)
      - Started At
      - Completed At
      - Error Message (tooltip or expandable section for failed tasks)
    - Sortable columns
    - Pagination controls (if many tasks)
    - Export button (optional - exports task list to CSV)
    - Close button
    - Loading state while fetching tasks
    - Empty state when no tasks exist
  - **Cancel Confirmation Modal:**
    - Title: "Cancel Deployment"
    - Message: "Are you sure you want to cancel this deployment?"
    - Deployment information display (Name, Deployment ID)
    - Reason field (TextArea, optional, multiline)
    - Action buttons: Cancel Deployment (primary, destructive), Cancel (default)
    - Loading state while cancelling
    - Success/error messages
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no deployments exist
  - **No Results State:** Message when search/filter returns no matches

**User Actions:**
1. Navigate to Patches > Patches Deployed page
2. View deployments table with all columns
3. Use search box to filter deployments by Name or Deployment ID
4. Click filter button to open advanced filter modal
5. Apply filters by Type, Stage, Organization, or Branch Location
6. Click column headers to sort deployments (Name, Type, Stage, Pending, Succeeded, Failed, Created On)
7. Adjust pagination (change page size, navigate pages)
8. Click deployment row or "View" button to view deployment details
9. In deployment details, review all deployment information
10. Click "View Tasks" button to view deployment tasks
11. In Deployment Tasks modal, search and filter tasks
12. In Deployment Tasks modal, filter by task status
13. In Deployment Tasks modal, click on Endpoint Name to navigate to endpoint/asset details (if clickable)
14. Click "Cancel" button to cancel a deployment (only for PENDING or IN_PROGRESS deployments)
15. In Cancel Confirmation modal, enter reason for cancellation (optional)
16. Confirm cancellation
17. Verify deployment is cancelled and stage is updated
18. Click Export button to download CSV/Excel
19. Click Refresh button to reload data
20. Use column visibility toggle to show/hide columns
21. Verify deployment statistics update in real-time
22. Verify stage badges update when deployment stage changes

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have cancel permission)
- Verify page loads with all deployments displayed
- Test search functionality:
  - Search by deployment name (partial and full match)
  - Search by deployment ID (partial and full match)
  - Case-insensitive search
  - Search with no results
  - Clear search to show all deployments
- Test filtering:
  - Filter by Type (INSTALL, ROLLBACK)
  - Filter by Stage (PENDING, IN_PROGRESS, COMPLETED, INSTALLED, FAILED)
  - Filter by organization (if multi-tenant)
  - Filter by branch location
  - Apply multiple filters simultaneously
  - Reset filters
- Test sorting:
  - Sort by Name (alphabetical sorting)
  - Sort by Type
  - Sort by Stage
  - Sort by Pending, Succeeded, Failed (numeric sorting)
  - Sort by Created On (newest/oldest first)
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test deployment details:
  - Click deployment row to view details
  - Click "View" button to view details
  - Verify all deployment information is displayed correctly
  - Verify patches list is shown
  - Verify target information is displayed
  - Verify schedule information is shown
- Test deployment tasks:
  - Click "View Tasks" button
  - Verify tasks modal opens
  - Verify all tasks are displayed
  - Search tasks by endpoint name, asset name, hostname, IP address
  - Filter tasks by status (All, PENDING, IN_PROGRESS, SUCCESS, FAILED)
  - Sort tasks by various columns
  - Click on Endpoint Name to navigate to endpoint details (if clickable)
  - Verify error messages are shown for failed tasks
  - Test pagination in tasks modal (if many tasks)
  - Test with deployments that have no tasks
- Test cancel deployment functionality:
  - Cancel deployment with stage PENDING
  - Cancel deployment with stage IN_PROGRESS
  - Verify Cancel button is disabled for COMPLETED, INSTALLED, or FAILED deployments
  - Cancel with reason
  - Cancel without reason
  - Verify deployment stage is updated
  - Verify pending and in-progress tasks are stopped
  - Verify audit log is created
  - Test canceling cancellation action
- Test export functionality:
  - Export all deployments
  - Export filtered/search results
  - Verify CSV/Excel file is downloaded correctly
  - Verify CSV includes correct columns and data
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Test column visibility:
  - Hide/show individual columns
  - Apply column visibility changes
  - Reset column visibility to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify column visibility preferences persist across sessions
- Test column pinning:
  - Pin Name column to left
  - Verify column is pinned correctly
  - Unpin column
  - Verify column returns to normal position
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
  - Tasks modal shows loading state while fetching tasks
- Verify empty states:
  - Empty state when no deployments exist
  - "No results found" when search returns no matches
  - Empty state in tasks modal when no tasks exist
- Test date formatting in Created On, Started At, Completed At columns
- Test badge colors for Type and Stage columns
- Test numeric counts display in Pending, Succeeded, Failed columns
- Test real-time updates:
  - Verify deployment statistics update automatically
  - Verify stage badges update when deployment stage changes
  - Verify task statuses update in real-time
- Verify table performance with large number of deployments
- Test responsive design (table on different screen sizes)
- Verify user permissions are enforced correctly
- Test error handling:
  - Network errors during actions
  - Validation errors
  - Permission errors
  - Verify appropriate error messages are displayed

---

### User Story 4: Test and Approve Page Functions

**Story ID:** `US-034`  
**Title:** View and Manage Patches Pending Test and Approval  
**Priority:** P0 (Critical)  
**Module:** Patches - Patch Test & Approval Management

**User Story:**
```
As a system administrator
I want to view, search, filter, and manage patches that need testing or approval in a table view
So that I can efficiently review test results, approve patches for deployment, and track the test and approval workflow
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Patches > Patch Test & Approve page
- [ ] AC2: Patch Test & Approve page displays a table listing patches that need testing or approval
- [ ] AC3: Page displays two tabs or filter options:
  - **Pending Test** tab: Shows patches with testStatus = "Not Tested"
  - **Pending Approval** tab: Shows patches with testStatus = "Tested" and approvalStatus = "Pending"
- [ ] AC4: "Pending Test" tab is selected by default when page loads
- [ ] AC5: Table displays the following columns (configurable visibility):
  - Patch ID (sortable, searchable, pinned option)
  - Title (sortable, searchable)
  - Severity (filterable, color-coded badges: Critical, High, Medium, Low, Unspecified)
  - Category (filterable, searchable)
  - Vendor (filterable, searchable)
  - Product (filterable, searchable)
  - OS (filterable, searchable)
  - Test Status (filterable, color-coded badges: Not Tested, Tested, Test Failed)
  - Test Result (filterable: Passed, Failed, N/A)
  - Tested By (searchable)
  - Tested At (sortable, formatted date/time)
  - Approval Status (filterable, color-coded badges: Pending, Approved, Rejected)
  - Approved By (searchable)
  - Approved At (sortable, formatted date/time)
  - Actions (View, Test, Approve, Reject)
- [ ] AC6: User can search patches by Patch ID, Title, Category, Vendor, Product, OS, Tested By, or Approved By using a search input field
- [ ] AC7: Search is case-insensitive and filters results in real-time as user types
- [ ] AC8: User can filter patches by:
  - Severity (via Severity column filter dropdown: Critical, High, Medium, Low, Unspecified)
  - Category (via Category column filter dropdown)
  - Vendor (via Vendor column filter dropdown)
  - Product (via Product column filter dropdown)
  - OS (via OS column filter dropdown: Windows, MacOS, Linux, Ubuntu)
  - Test Status (via Test Status column filter dropdown: Not Tested, Tested, Test Failed)
  - Test Result (via Test Result column filter dropdown: Passed, Failed, N/A)
  - Approval Status (via Approval Status column filter dropdown: Pending, Approved, Rejected)
  - Organization (if multi-tenant, via Organization filter dropdown)
  - Branch Location (via Branch Location filter dropdown)
- [ ] AC9: User can sort patches by:
  - Patch ID (ascending/descending)
  - Title (ascending/descending, alphabetical)
  - Severity (ascending/descending)
  - Category (ascending/descending, alphabetical)
  - Vendor (ascending/descending, alphabetical)
  - Product (ascending/descending, alphabetical)
  - OS (ascending/descending, alphabetical)
  - Test Status (ascending/descending)
  - Test Result (ascending/descending)
  - Tested At (newest/oldest first, date)
  - Approval Status (ascending/descending)
  - Approved At (newest/oldest first, date)
- [ ] AC10: User can paginate through patches using table pagination controls
- [ ] AC11: User can view patch details by clicking on patch row or "View" action button
- [ ] AC12: Patch details modal/drawer displays comprehensive patch information including test and approval details:
  - Basic Information: Patch ID, Title, Description, Severity, Category
  - Product Information: Vendor, Product, OS, OS Version
  - Test Information: Test Status, Test Result, Test Environment, Test Notes, Tested By, Tested At
  - Approval Information: Approval Status, Approved By, Approved At, Approval Reason, Rejected By, Rejected At, Rejection Reason
  - Affected Endpoints: Count and list of affected endpoints
- [ ] AC13: User can test a patch by clicking "Test" action button (only available for patches with testStatus = "Not Tested")
- [ ] AC14: Test button opens Test Patch modal/drawer (functionality covered in US-032)
- [ ] AC15: After successful test submission, user is redirected back to Patch Test & Approve page and can see the test record
- [ ] AC16: User can approve a patch by clicking "Approve" action button
- [ ] AC17: Approve button is available for patches with approvalStatus = "Pending" (tested or untested)
- [ ] AC18: Approve button opens Approve Patch modal/drawer (functionality covered in US-032)
- [ ] AC19: After successful approval, patch approval status is updated and patch moves to "Approved" state
- [ ] AC20: User can reject a patch by clicking "Reject" action button
- [ ] AC21: Reject button is available for patches with approvalStatus = "Pending"
- [ ] AC22: Reject button opens Reject Patch modal/drawer
- [ ] AC23: Reject Patch modal displays title "Reject Patch" with patch ID/Title
- [ ] AC24: Reject Patch form includes the following fields:
  - **Reason** (mandatory, textarea) - User must provide reason for rejection
- [ ] AC25: Reject Patch form validates that Reason is provided before submission
- [ ] AC26: Upon confirming rejection, system updates patch approvalStatus to "Rejected"
- [ ] AC27: System records rejector information (user ID, timestamp) and rejection reason in patch record
- [ ] AC28: System creates audit log entry for rejection action
- [ ] AC29: Success message is displayed after rejecting patch
- [ ] AC30: Reject Patch modal closes after successful rejection
- [ ] AC31: Severity column displays color-coded badges (Critical=red, High=orange, Medium=yellow, Low=blue, Unspecified=gray)
- [ ] AC32: Test Status column displays color-coded badges (Not Tested=gray, Tested=green, Test Failed=red)
- [ ] AC33: Approval Status column displays color-coded badges (Pending=yellow, Approved=green, Rejected=red)
- [ ] AC34: Tested At and Approved At columns display formatted date and time
- [ ] AC35: Test Result column displays "Passed" (green), "Failed" (red), or "N/A" (gray) for untested patches
- [ ] AC36: User can use column visibility toggle to show/hide columns
- [ ] AC37: Column visibility preferences are saved and persist across sessions
- [ ] AC38: User can pin/unpin columns (e.g., Patch ID can be pinned to left)
- [ ] AC39: Table displays empty state message when no patches are found
- [ ] AC40: Table shows loading state while fetching patch data
- [ ] AC41: Table shows "No results found" message when search/filter returns no matches
- [ ] AC42: Refresh/Reload button reloads patch list from server
- [ ] AC43: Table supports export functionality (Export button) to export patch list as CSV/Excel
- [ ] AC44: Exported CSV includes all visible columns and filtered/search results
- [ ] AC45: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC46: System handles pagination correctly when switching tabs (maintains or resets to page 1 based on preference)
- [ ] AC47: Page respects user permissions - users with view-only permission cannot test, approve, or reject patches
- [ ] AC48: Patch table updates in real-time or refreshes periodically to show status changes
- [ ] AC49: Each tab shows count badge indicating number of patches in that category (e.g., "Pending Test (25)", "Pending Approval (15)")
- [ ] AC50: Tab counts update dynamically as patch statuses change
- [ ] AC51: When user switches tabs, table content updates to show patches for that tab's filter
- [ ] AC52: Search and filter are maintained when switching between tabs (or reset based on preference)
- [ ] AC53: Sorting preferences are maintained when switching between tabs (or reset based on preference)

**Test Data:**
```json
{
  "patches": [
    {
      "id": "patch-001",
      "patchId": "KB5012345",
      "title": "Security Update for Windows Server 2022",
      "severity": "Critical",
      "category": "Security",
      "vendor": "Microsoft",
      "product": "Windows Server 2022",
      "os": "Windows",
      "testStatus": "Not Tested",
      "testResult": null,
      "testedBy": null,
      "testedAt": null,
      "testEnvironment": null,
      "testNotes": null,
      "approvalStatus": "Pending",
      "approvedBy": null,
      "approvedAt": null,
      "rejectedBy": null,
      "rejectedAt": null,
      "rejectionReason": null
    },
    {
      "id": "patch-002",
      "patchId": "KB5012346",
      "title": "Cumulative Update for Windows 11",
      "severity": "High",
      "category": "Update",
      "vendor": "Microsoft",
      "product": "Windows 11",
      "os": "Windows",
      "testStatus": "Tested",
      "testResult": "passed",
      "testedBy": "tester@example.com",
      "testedAt": "2024-01-15T10:00:00Z",
      "testEnvironment": "Test Lab - Windows 11",
      "testNotes": "Patch tested successfully. No issues found.",
      "approvalStatus": "Pending",
      "approvedBy": null,
      "approvedAt": null,
      "rejectedBy": null,
      "rejectedAt": null,
      "rejectionReason": null
    },
    {
      "id": "patch-003",
      "patchId": "KB5012347",
      "title": "Feature Update for Windows 10",
      "severity": "Medium",
      "category": "Feature",
      "vendor": "Microsoft",
      "product": "Windows 10",
      "os": "Windows",
      "testStatus": "Test Failed",
      "testResult": "failed",
      "testedBy": "tester@example.com",
      "testedAt": "2024-01-14T15:00:00Z",
      "testEnvironment": "Test Lab - Windows 10",
      "testNotes": "Patch installation failed on test system. Compatibility issues detected.",
      "approvalStatus": "Rejected",
      "approvedBy": null,
      "approvedAt": null,
      "rejectedBy": "admin@example.com",
      "rejectedAt": "2024-01-14T16:00:00Z",
      "rejectionReason": "Test failed. Compatibility issues."
    },
    {
      "id": "patch-004",
      "patchId": "KB5012348",
      "title": "Security Update for Windows Server 2019",
      "severity": "Critical",
      "category": "Security",
      "vendor": "Microsoft",
      "product": "Windows Server 2019",
      "os": "Windows",
      "testStatus": "Tested",
      "testResult": "passed",
      "testedBy": "tester@example.com",
      "testedAt": "2024-01-13T09:00:00Z",
      "testEnvironment": "Test Lab - Windows Server 2019",
      "testNotes": "Patch tested successfully. All applications working correctly.",
      "approvalStatus": "Approved",
      "approvedBy": "admin@example.com",
      "approvedAt": "2024-01-13T11:00:00Z",
      "approvalReason": "Test passed. Ready for deployment.",
      "rejectedBy": null,
      "rejectedAt": null,
      "rejectionReason": null
    }
  ],
  "filters": {
    "severity": ["Critical", "High", "Medium", "Low", "Unspecified"],
    "category": ["Security", "Update", "Feature", "Driver"],
    "vendor": ["Microsoft", "Apple", "Canonical"],
    "product": ["Windows Server 2022", "Windows 11", "Windows 10"],
    "os": ["Windows", "MacOS", "Linux", "Ubuntu"],
    "testStatus": ["Not Tested", "Tested", "Test Failed"],
    "testResult": ["Passed", "Failed", "N/A"],
    "approvalStatus": ["Pending", "Approved", "Rejected"]
  },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 40
  }
}
```

**API Endpoints:**
- `GET /v1/patches/test-approve` - Get list of patches pending test or approval
  - Query Parameters:
    - `status` (optional): Filter by status ("pending-test" or "pending-approval")
    - `severity` (optional): Filter by severity (Critical, High, Medium, Low, Unspecified)
    - `category` (optional): Filter by category
    - `vendor` (optional): Filter by vendor
    - `product` (optional): Filter by product
    - `os` (optional): Filter by OS (Windows, MacOS, Linux, Ubuntu)
    - `testStatus` (optional): Filter by test status (Not Tested, Tested, Test Failed)
    - `testResult` (optional): Filter by test result (Passed, Failed)
    - `approvalStatus` (optional): Filter by approval status (Pending, Approved, Rejected)
    - `search` (optional): Search by Patch ID, Title, Category, Vendor, Product, OS, Tested By, Approved By
    - `organizationId` (optional): Filter by organization
    - `branchId` (optional): Filter by branch location
    - `sortBy` (optional): Sort field (patchId, title, severity, category, vendor, product, os, testStatus, testResult, testedAt, approvalStatus, approvedAt)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 20)
  - Response: Paginated list of patches with metadata
- `GET /v1/patches/:id` - Get patch details by ID (includes test and approval information)
  - Response: Detailed patch information including test and approval details
- `POST /v1/patches/:id/test` - Test a patch (covered in US-032)
  - Request Body:
    - `status` (string, required): "passed" or "failed"
    - `testEnvironment` (string, optional): Test environment description
    - `notes` (string, optional): Test notes
  - Response: Updated patch with test status
- `POST /v1/patches/:id/approve` - Approve a patch (covered in US-032)
  - Request Body:
    - `reason` (string, required): Reason for approval
  - Response: Updated patch with approvalStatus "Approved"
- `POST /v1/patches/:id/reject` - Reject a patch
  - Request Body:
    - `reason` (string, required): Reason for rejection
  - Response: Updated patch with approvalStatus "Rejected"
- `GET /v1/patches/test-approve/export` - Export patches to CSV/Excel
  - Query Parameters: Same as GET /v1/patches/test-approve
  - Response: CSV/Excel file download

**UI Components:**
- Page: `/patches/test-approve` (PatchTestApprove.tsx)
- Components:
  - **Page Header:**
    - Page title "Patch Test & Approve"
    - Breadcrumb navigation: Patches > Patch Test & Approve
  - **Tabs Section:**
    - Tab: "Pending Test" (default, shows count badge)
    - Tab: "Pending Approval" (shows count badge)
    - Active tab indicator
  - **Table Header:**
    - Search input field (with SearchOutlined icon)
    - Filter button (FilterOutlined icon) - opens advanced filter modal
    - Export button (DownloadOutlined icon) - exports to CSV/Excel
    - Refresh button (ReloadOutlined icon) - reloads data
    - Column visibility toggle button (EyeOutlined icon)
  - **Table:**
    - Columns: Patch ID, Title, Severity, Category, Vendor, Product, OS, Test Status, Test Result, Tested By, Tested At, Approval Status, Approved By, Approved At, Actions
    - Sortable columns: Patch ID, Title, Severity, Category, Vendor, Product, OS, Test Status, Test Result, Tested At, Approval Status, Approved At
    - Filterable columns: Severity, Category, Vendor, Product, OS, Test Status, Test Result, Approval Status
    - Searchable columns: Patch ID, Title, Category, Vendor, Product, OS, Tested By, Approved By
    - Clickable patch row (opens details modal/drawer)
    - Actions column: View button, Test button, Approve button, Reject button (dropdown menu)
    - Color-coded severity badges
    - Color-coded test status badges
    - Color-coded approval status badges
  - **Advanced Filter Modal:**
    - Filter dropdowns for: Severity, Category, Vendor, Product, OS, Test Status, Test Result, Approval Status, Organization, Branch Location
    - Apply button
    - Reset button (clears all filters)
    - Cancel button
  - **Column Visibility Modal:**
    - Checkboxes for each column
    - Apply button
    - Reset button (restores all columns)
  - **Patch Details Modal/Drawer:**
    - Comprehensive patch information display
    - Tabs or sections: Basic Info, Product Info, Test Info, Approval Info, Affected Endpoints
    - Close button
  - **Test Patch Modal/Drawer:**
    - Test patch form (covered in US-032)
    - Redirect to Patch Test & Approve page after submission
  - **Approve Patch Modal/Drawer:**
    - Approve patch form with mandatory reason (covered in US-032)
  - **Reject Patch Modal/Drawer:**
    - Title: "Reject Patch - [Patch ID/Title]"
    - Form fields:
      - Reason (TextArea, mandatory, multiline) - User must provide reason for rejection
    - Action buttons: Reject (primary, destructive), Cancel (default), Reset (default)
    - Loading state while rejecting
    - Success/error messages
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no patches exist
  - **No Results State:** Message when search/filter returns no matches

**User Actions:**
1. Navigate to Patches > Patch Test & Approve page
2. View default "Pending Test" tab with patches that need testing
3. Switch to "Pending Approval" tab to view patches that need approval
4. Use search box to filter patches by Patch ID, Title, Category, Vendor, Product, OS, Tested By, or Approved By
5. Click filter button to open advanced filter modal
6. Apply filters by Severity, Category, Vendor, Product, OS, Test Status, Test Result, Approval Status, Organization, or Branch Location
7. Click column headers to sort patches (Patch ID, Title, Severity, Category, Vendor, Product, OS, Test Status, Test Result, Tested At, Approval Status, Approved At)
8. Adjust pagination (change page size, navigate pages)
9. Click patch row or "View" button to view patch details
10. In patch details, review test and approval information
11. Click "Test" button to test a patch (only for patches with testStatus = "Not Tested")
12. After testing, verify user is redirected back to Patch Test & Approve page
13. Verify test record is visible on the page
14. Click "Approve" button to approve a patch (for patches with approvalStatus = "Pending")
15. Enter mandatory reason for approval
16. Confirm approval
17. Verify patch approval status is updated
18. Click "Reject" button to reject a patch (for patches with approvalStatus = "Pending")
19. Enter mandatory reason for rejection
20. Confirm rejection
21. Verify patch approval status is updated to "Rejected"
22. Click Export button to download CSV/Excel
23. Click Refresh button to reload data
24. Use column visibility toggle to show/hide columns
25. Verify tab counts update when patch statuses change
26. Verify table content updates when switching tabs

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have test/approve/reject permission)
- Verify page loads with "Pending Test" tab selected by default
- Test tab switching:
  - Switch to "Pending Approval" tab - verify only patches pending approval are shown
  - Switch back to "Pending Test" tab - verify only patches pending test are shown
  - Verify tab counts are accurate
  - Verify tab counts update when patch statuses change
- Test search functionality:
  - Search by patch ID (partial and full match)
  - Search by title (partial and full match)
  - Search by category, vendor, product, OS
  - Search by Tested By, Approved By
  - Case-insensitive search
  - Search with no results
  - Clear search to show all patches
  - Verify search works across all tabs
- Test filtering:
  - Filter by severity (Critical, High, Medium, Low, Unspecified)
  - Filter by category
  - Filter by vendor
  - Filter by product
  - Filter by OS (Windows, MacOS, Linux, Ubuntu)
  - Filter by Test Status (Not Tested, Tested, Test Failed)
  - Filter by Test Result (Passed, Failed, N/A)
  - Filter by Approval Status (Pending, Approved, Rejected)
  - Filter by organization (if multi-tenant)
  - Filter by branch location
  - Apply multiple filters simultaneously
  - Reset filters
  - Verify filters work across all tabs
- Test sorting:
  - Sort by Patch ID (numeric sorting)
  - Sort by Title (alphabetical sorting)
  - Sort by Severity
  - Sort by Category, Vendor, Product, OS (alphabetical)
  - Sort by Test Status, Test Result
  - Sort by Tested At, Approved At (newest/oldest first)
  - Sort by Approval Status
  - Verify sorting works across all tabs
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify pagination resets or maintains when switching tabs
  - Verify total count is accurate
- Test patch details:
  - Click patch row to view details
  - Click "View" button to view details
  - Verify all patch information is displayed correctly
  - Verify test information is shown (Test Status, Test Result, Test Environment, Test Notes, Tested By, Tested At)
  - Verify approval information is shown (Approval Status, Approved By, Approved At, Approval Reason, Rejection details)
- Test Test Patch functionality:
  - Click "Test" button for patch with testStatus = "Not Tested"
  - Verify Test Patch modal opens (functionality covered in US-032)
  - After successful test submission, verify user is redirected to Patch Test & Approve page
  - Verify test record is visible on the page
  - Verify patch test status is updated
  - Verify Test button is no longer available for tested patches
- Test Approve Patch functionality:
  - Click "Approve" button for patch with approvalStatus = "Pending"
  - Verify Approve Patch modal opens (functionality covered in US-032)
  - Enter mandatory reason for approval
  - Confirm approval
  - Verify patch approval status is updated to "Approved"
  - Verify approval reason is recorded
  - Verify Approve button is no longer available for approved patches
  - Test approving untested patches (should require mandatory reason)
  - Test approving tested patches with "passed" result
- Test Reject Patch functionality:
  - Click "Reject" button for patch with approvalStatus = "Pending"
  - Verify Reject Patch modal opens
  - Enter mandatory reason for rejection
  - Verify form validation requires reason to be filled
  - Confirm rejection
  - Verify patch approval status is updated to "Rejected"
  - Verify rejection reason is recorded
  - Verify rejector information is recorded
  - Verify timestamp is recorded
  - Verify audit log is created
  - Verify Reject button is no longer available for rejected patches
  - Test canceling rejection action
  - Test resetting rejection form
- Test action button states:
  - Verify Test button is only available for patches with testStatus = "Not Tested"
  - Verify Approve button is available for patches with approvalStatus = "Pending"
  - Verify Reject button is available for patches with approvalStatus = "Pending"
  - Verify buttons are disabled for patches that are already tested/approved/rejected
- Test column visibility:
  - Hide/show individual columns
  - Apply column visibility changes
  - Reset column visibility to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify column visibility preferences persist across sessions
- Test column pinning:
  - Pin Patch ID column to left
  - Verify column is pinned correctly
  - Unpin column
  - Verify column returns to normal position
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no patches exist
  - "No results found" when search returns no matches
  - Empty state for specific tab when no patches match that filter
- Test date formatting in Tested At and Approved At columns
- Test badge colors for Severity, Test Status, and Approval Status columns
- Test Test Result column display (Passed/Failed/N/A)
- Test real-time updates:
  - Verify patch table refreshes after actions
  - Verify patch statuses update correctly
  - Verify tab counts update when patch statuses change
- Verify table performance with large number of patches
- Test responsive design (table on different screen sizes)
- Verify user permissions are enforced correctly
- Test error handling:
  - Network errors during actions
  - Validation errors
  - Permission errors
  - Verify appropriate error messages are displayed
- Test audit logging:
  - Verify all actions (test, approve, reject) create audit log entries
  - Verify audit logs include user, timestamp, and action details

---

### User Story 5: Global Audit Page Functions

**Story ID:** `US-035`  
**Title:** View and Manage Global Audit Logs  
**Priority:** P0 (Critical)  
**Module:** Settings - Audit & Compliance

**User Story:**
```
As a system administrator
I want to view, search, filter, and manage global audit logs in a table view
So that I can track all system activities, monitor user actions, and maintain compliance and security auditing
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Settings > Audit page (or Global Audit page)
- [ ] AC2: Global Audit page displays a table listing all audit log entries
- [ ] AC3: Table displays the following columns (configurable visibility):
  - Timestamp (sortable, formatted date/time)
  - User (filterable, searchable, user email/name)
  - Action (filterable, searchable, e.g., CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT)
  - Resource/Module (filterable, searchable, e.g., patches, assets, agents, users, settings)
  - Resource ID (searchable, ID of the affected resource)
  - Status (filterable, color-coded badges: Success, Failed)
  - Details (expandable/collapsible, JSON or formatted details)
  - IP Address (searchable)
  - User Agent (searchable, optional display)
- [ ] AC4: User can search audit logs by Action, Resource/Module, Resource ID, User, IP Address, or User Agent using a search input field
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: User can filter audit logs by:
  - Action (via Action column filter dropdown: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, TEST, DEPLOY, etc.)
  - Resource/Module (via Resource/Module column filter dropdown: patches, assets, agents, users, settings, etc.)
  - User (via User column filter dropdown: list of all users)
  - Status (via Status column filter dropdown: Success, Failed)
  - Organization (if multi-tenant, via Organization filter dropdown)
  - Branch Location (via Branch Location filter dropdown)
- [ ] AC7: User can filter audit logs by time period using time period selector:
  - This Minute
  - This Hour
  - This Day
  - This Week
  - This Month
  - This Quarter
  - This Year
  - Previous 15 Hours
  - Previous Week
  - Previous Month
  - Previous Quarter
  - Previous Year
  - Custom Date Range (Date picker for start and end dates)
- [ ] AC8: Time period filter applies to Timestamp column
- [ ] AC9: User can sort audit logs by:
  - Timestamp (newest/oldest first, date/time)
  - User (ascending/descending, alphabetical)
  - Action (ascending/descending, alphabetical)
  - Resource/Module (ascending/descending, alphabetical)
  - Status (ascending/descending)
- [ ] AC10: By default, audit logs are sorted by Timestamp descending (newest first)
- [ ] AC11: User can paginate through audit logs using table pagination controls
- [ ] AC12: User can view audit log details by clicking on Details column or expanding row
- [ ] AC13: Details display shows comprehensive audit log information:
  - Full Details (JSON format or formatted view)
  - Old Value (if applicable, for UPDATE actions)
  - New Value (if applicable, for CREATE/UPDATE actions)
  - IP Address
  - User Agent
  - Additional metadata
- [ ] AC14: Details can be displayed in expandable row, modal/drawer, or tooltip
- [ ] AC15: Status column displays color-coded badges (Success=green, Failed=red)
- [ ] AC16: Timestamp column displays formatted date and time (e.g., "2024-01-20 14:30:25")
- [ ] AC17: User column displays user email or name
- [ ] AC18: Resource ID column displays the ID of the affected resource (clickable if resource exists)
- [ ] AC19: User can use column visibility toggle to show/hide columns
- [ ] AC20: Column visibility preferences are saved and persist across sessions
- [ ] AC21: User can pin/unpin columns (e.g., Timestamp can be pinned to left)
- [ ] AC22: Table displays empty state message when no audit logs exist
- [ ] AC23: Table shows loading state while fetching audit log data
- [ ] AC24: Table shows "No results found" message when search/filter returns no matches
- [ ] AC25: Refresh/Reload button reloads audit log list from server
- [ ] AC26: Table supports export functionality (Export button) to export audit logs as CSV/Excel
- [ ] AC27: Exported CSV includes all visible columns and filtered/search results
- [ ] AC28: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC29: Page respects user permissions - only users with audit log access can view this page
- [ ] AC30: Audit log table updates in real-time or refreshes periodically to show new entries
- [ ] AC31: New audit log entries appear at the top of the table (if sorted by Timestamp descending)
- [ ] AC32: User can click on Resource ID to navigate to the resource details page (if resource exists and user has access)
- [ ] AC33: User can click on User to view user details or navigate to user management page (if user has access)
- [ ] AC34: Time period filter modal/drawer allows selecting predefined periods or custom date range
- [ ] AC35: Custom date range picker includes start date and end date with time selection
- [ ] AC36: Time period filter can be cleared to show all audit logs
- [ ] AC37: Multiple filters can be applied simultaneously (Action, Resource, User, Status, Time Period)
- [ ] AC38: All filters can be reset to show all audit logs
- [ ] AC39: Filter state is maintained in URL parameters or session storage (optional, for bookmarking/sharing)
- [ ] AC40: Audit logs are displayed in chronological order by default (newest first)

**Test Data:**
```json
{
  "auditLogs": [
    {
      "id": "audit-001",
      "timestamp": "2024-01-20T14:30:25Z",
      "userId": "user-001",
      "user": "admin@example.com",
      "action": "CREATE",
      "resource": "patches",
      "resourceId": "patch-001",
      "status": "success",
      "details": {
        "patchId": "KB5012345",
        "title": "Security Update for Windows Server 2022",
        "severity": "Critical"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
      "id": "audit-002",
      "timestamp": "2024-01-20T14:25:10Z",
      "userId": "user-002",
      "user": "tester@example.com",
      "action": "TEST",
      "resource": "patches",
      "resourceId": "patch-002",
      "status": "success",
      "details": {
        "patchId": "KB5012346",
        "testStatus": "Tested",
        "testResult": "passed",
        "testEnvironment": "Test Lab"
      },
      "ipAddress": "192.168.1.101",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    },
    {
      "id": "audit-003",
      "timestamp": "2024-01-20T14:20:00Z",
      "userId": "user-001",
      "user": "admin@example.com",
      "action": "APPROVE",
      "resource": "patches",
      "resourceId": "patch-003",
      "status": "success",
      "details": {
        "patchId": "KB5012347",
        "approvalStatus": "Approved",
        "approvalReason": "Test passed. Ready for deployment."
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
      "id": "audit-004",
      "timestamp": "2024-01-20T14:15:30Z",
      "userId": "user-003",
      "user": "operator@example.com",
      "action": "UPDATE",
      "resource": "assets",
      "resourceId": "asset-001",
      "status": "success",
      "details": {
        "assetId": "AST-001",
        "changes": {
          "status": {
            "oldValue": "Available",
            "newValue": "In Use"
          }
        }
      },
      "ipAddress": "192.168.1.102",
      "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
    },
    {
      "id": "audit-005",
      "timestamp": "2024-01-20T14:10:15Z",
      "userId": "user-001",
      "user": "admin@example.com",
      "action": "LOGIN",
      "resource": "auth",
      "resourceId": null,
      "status": "success",
      "details": {
        "loginMethod": "password",
        "sessionId": "session-12345"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    {
      "id": "audit-006",
      "timestamp": "2024-01-20T14:05:00Z",
      "userId": "user-004",
      "user": "user@example.com",
      "action": "DELETE",
      "resource": "patches",
      "resourceId": "patch-004",
      "status": "failed",
      "details": {
        "patchId": "KB5012348",
        "error": "Permission denied. User does not have delete permission."
      },
      "ipAddress": "192.168.1.103",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  ],
  "filters": {
    "actions": ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "APPROVE", "REJECT", "TEST", "DEPLOY", "CANCEL"],
    "resources": ["patches", "assets", "agents", "users", "settings", "auth", "deployments"],
    "users": [
      { "id": "user-001", "email": "admin@example.com" },
      { "id": "user-002", "email": "tester@example.com" },
      { "id": "user-003", "email": "operator@example.com" }
    ],
    "status": ["success", "failed"]
  },
  "timePeriods": [
    "thisMinute",
    "thisHour",
    "thisDay",
    "thisWeek",
    "thisMonth",
    "thisQuarter",
    "thisYear",
    "previous15Hours",
    "previousWeek",
    "previousMonth",
    "previousQuarter",
    "previousYear",
    "custom"
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1000
  }
}
```

**API Endpoints:**
- `GET /v1/audit-logs` - Get list of audit logs with filtering, sorting, and pagination
  - Query Parameters:
    - `action` (optional): Filter by action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, TEST, DEPLOY, etc.)
    - `resource` (optional): Filter by resource/module (patches, assets, agents, users, settings, auth, deployments)
    - `userId` (optional): Filter by user ID
    - `status` (optional): Filter by status (success, failed)
    - `startDate` (optional): Filter by start date (ISO 8601 format)
    - `endDate` (optional): Filter by end date (ISO 8601 format)
    - `search` (optional): Search by Action, Resource, Resource ID, User, IP Address, User Agent
    - `organizationId` (optional): Filter by organization
    - `branchId` (optional): Filter by branch location
    - `sortBy` (optional): Sort field (timestamp, user, action, resource, status)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 20)
  - Response: Paginated list of audit logs with metadata
- `GET /v1/audit-logs/:id` - Get audit log details by ID
  - Response: Detailed audit log information including full details
- `GET /v1/audit-logs/filters` - Get filter options for audit logs
  - Response: Available actions, resources, and users for filtering
- `GET /v1/audit-logs/export` - Export audit logs to CSV/Excel
  - Query Parameters: Same as GET /v1/audit-logs
  - Response: CSV/Excel file download

**UI Components:**
- Page: `/settings/audit` or `/audit` (Audit.tsx)
- Components:
  - **Page Header:**
    - Page title "Audit" or "Global Audit Logs"
    - Breadcrumb navigation: Settings > Audit
  - **Table Header:**
    - Search input field (with SearchOutlined icon)
    - Filter dropdowns:
      - Action filter (Select dropdown)
      - Resource/Module filter (Select dropdown)
      - User filter (Select dropdown)
      - Status filter (Select dropdown)
    - Time Period button (FilterOutlined icon) - opens time period selector modal
    - Export button (DownloadOutlined icon) - exports to CSV/Excel
    - Refresh button (ReloadOutlined icon) - reloads data
    - Column visibility toggle button (EyeOutlined icon)
  - **Time Period Selector Modal:**
    - Predefined period buttons: This Minute, This Hour, This Day, This Week, This Month, This Quarter, This Year, Previous 15 Hours, Previous Week, Previous Month, Previous Quarter, Previous Year
    - Custom Date Range section:
      - Start Date picker (with time)
      - End Date picker (with time)
    - Apply button
    - Clear button (clears time filter)
    - Cancel button
  - **Table:**
    - Columns: Timestamp, User, Action, Resource/Module, Resource ID, Status, Details, IP Address, User Agent
    - Sortable columns: Timestamp, User, Action, Resource/Module, Status
    - Filterable columns: Action, Resource/Module, User, Status
    - Searchable columns: Action, Resource/Module, Resource ID, User, IP Address, User Agent
    - Expandable rows for Details column
    - Clickable Resource ID (navigates to resource if exists)
    - Clickable User (navigates to user details if accessible)
    - Color-coded status badges
  - **Column Visibility Modal:**
    - Checkboxes for each column
    - Apply button
    - Reset button (restores all columns)
  - **Audit Log Details Modal/Drawer (optional):**
    - Comprehensive audit log information display
    - Formatted details view or JSON view toggle
    - Old Value and New Value display (for UPDATE actions)
    - IP Address and User Agent display
    - Close button
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no audit logs exist
  - **No Results State:** Message when search/filter returns no matches

**User Actions:**
1. Navigate to Settings > Audit page
2. View audit logs table with all columns
3. Use search box to filter audit logs by Action, Resource, Resource ID, User, IP Address, or User Agent
4. Select Action filter to filter by specific actions
5. Select Resource/Module filter to filter by specific resources
6. Select User filter to filter by specific users
7. Select Status filter to filter by Success or Failed
8. Click Time Period button to open time period selector
9. Select predefined time period (This Day, This Week, This Month, etc.)
10. Or select Custom Date Range and choose start and end dates
11. Apply time period filter
12. Click column headers to sort audit logs (Timestamp, User, Action, Resource/Module, Status)
13. Adjust pagination (change page size, navigate pages)
14. Expand Details column to view full audit log details
15. Click on Resource ID to navigate to resource details (if resource exists)
16. Click on User to view user details or navigate to user management (if accessible)
17. Click Export button to download CSV/Excel
18. Click Refresh button to reload data
19. Use column visibility toggle to show/hide columns
20. Clear all filters to show all audit logs
21. Verify new audit log entries appear at the top (if sorted by Timestamp descending)

**Test Notes:**
- Test with admin role (should have full access to audit logs)
- Test with regular user role (may not have access to audit logs page)
- Verify page loads with all audit logs displayed, sorted by Timestamp descending
- Test search functionality:
  - Search by action (partial and full match)
  - Search by resource/module (partial and full match)
  - Search by resource ID
  - Search by user email/name
  - Search by IP address
  - Search by user agent
  - Case-insensitive search
  - Search with no results
  - Clear search to show all audit logs
- Test filtering:
  - Filter by Action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, TEST, DEPLOY, etc.)
  - Filter by Resource/Module (patches, assets, agents, users, settings, auth, deployments)
  - Filter by User (select specific user from dropdown)
  - Filter by Status (Success, Failed)
  - Filter by organization (if multi-tenant)
  - Filter by branch location
  - Apply multiple filters simultaneously
  - Reset filters
- Test time period filtering:
  - Select "This Day" - verify only today's logs are shown
  - Select "This Week" - verify only this week's logs are shown
  - Select "This Month" - verify only this month's logs are shown
  - Select "Previous Week" - verify only previous week's logs are shown
  - Select "Custom Date Range" - choose start and end dates
  - Verify time filter applies correctly
  - Clear time filter to show all logs
- Test sorting:
  - Sort by Timestamp (newest/oldest first)
  - Sort by User (alphabetical)
  - Sort by Action (alphabetical)
  - Sort by Resource/Module (alphabetical)
  - Sort by Status
  - Verify default sort is Timestamp descending
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test audit log details:
  - Expand Details column to view full details
  - Verify details are displayed correctly (JSON or formatted view)
  - Verify Old Value and New Value are shown for UPDATE actions
  - Verify IP Address and User Agent are displayed
  - Test with different action types (CREATE, UPDATE, DELETE, LOGIN, etc.)
- Test resource navigation:
  - Click on Resource ID for existing resource
  - Verify navigation to resource details page (if resource exists and user has access)
  - Test with non-existent resource ID (should not navigate or show error)
- Test user navigation:
  - Click on User email/name
  - Verify navigation to user details or user management page (if accessible)
- Test export functionality:
  - Export all audit logs
  - Export filtered/search results
  - Export with time period filter applied
  - Verify CSV/Excel file is downloaded correctly
  - Verify CSV includes correct columns and data
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Test column visibility:
  - Hide/show individual columns
  - Apply column visibility changes
  - Reset column visibility to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify column visibility preferences persist across sessions
- Test column pinning:
  - Pin Timestamp column to left
  - Verify column is pinned correctly
  - Unpin column
  - Verify column returns to normal position
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no audit logs exist
  - "No results found" when search returns no matches
- Test date formatting in Timestamp column
- Test badge colors for Status column
- Test real-time updates:
  - Verify new audit log entries appear at the top (if sorted by Timestamp descending)
  - Verify table refreshes periodically or in real-time
- Verify table performance with large number of audit logs
- Test responsive design (table on different screen sizes)
- Verify user permissions are enforced correctly
- Test error handling:
  - Network errors during actions
  - Validation errors
  - Permission errors
  - Verify appropriate error messages are displayed
- Test time period calculations:
  - Verify "This Minute" shows only logs from current minute
  - Verify "This Hour" shows only logs from current hour
  - Verify "This Day" shows only logs from current day
  - Verify "This Week" shows only logs from current week
  - Verify "This Month" shows only logs from current month
  - Verify custom date range works correctly with time selection
- Test filter persistence:
  - Apply filters and refresh page
  - Verify filters are maintained (if implemented via URL parameters or session storage)

---

### User Story 6: Asset Details - Audit Page Function

**Story ID:** `US-036`  
**Title:** View Asset-Specific Audit Logs in Asset Details Page  
**Priority:** P0 (Critical)  
**Module:** Assets - Asset Details

**User Story:**
```
As a system administrator
I want to view audit logs specific to an asset in the Asset Details page Audit Log tab
So that I can track all changes, actions, and activities performed on that specific asset, including changes made through the system and changes detected directly on the asset, for compliance and troubleshooting
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Assets > All Assets page
- [ ] AC2: User can click on an asset row or "View" action button to open Asset Details page
- [ ] AC3: Asset Details page displays multiple tabs including "Audit Log" tab
- [ ] AC4: User can click on "Audit Log" tab to view asset-specific audit logs
- [ ] AC5: Audit Log tab displays a table listing all audit log entries for the specific asset
- [ ] AC6: Table displays the following columns (configurable visibility):
  - Date/Timestamp (sortable, formatted date/time)
  - User (filterable, searchable, user email/name or "System" for system/agent-detected changes)
  - Action (filterable, searchable, e.g., CREATE, UPDATE, DELETE, TAG_ADDED, TAG_REMOVED, STATUS_CHANGED, PARAMETER_CHANGED)
  - Source (filterable, indicates whether change was made "Via System" or "Detected on Asset")
  - Parameter/Field (filterable, searchable, name of the parameter/field that changed)
  - Old Value (searchable, previous value of the parameter)
  - New Value (searchable, new value of the parameter)
  - Changes (searchable, description of what changed)
- [ ] AC7: User can search audit logs by User, Action, Parameter/Field, Old Value, New Value, or Changes using a search input field
- [ ] AC8: Search is case-insensitive and filters results in real-time as user types
- [ ] AC9: User can filter audit logs by:
  - Action (via Action column filter dropdown: CREATE, UPDATE, DELETE, TAG_ADDED, TAG_REMOVED, STATUS_CHANGED, PARAMETER_CHANGED, etc.)
  - Source (via Source column filter dropdown: "Via System", "Detected on Asset")
  - User (via User column filter dropdown: list of users who made changes, or "System" for agent-detected changes)
  - Parameter/Field (via Parameter/Field column filter dropdown: list of parameters/fields that have changed)
  - Date Range (via Date Range picker: start date and end date)
- [ ] AC10: User can sort audit logs by:
  - Date/Timestamp (newest/oldest first, date/time)
  - User (ascending/descending, alphabetical)
  - Action (ascending/descending, alphabetical)
  - Source (ascending/descending, alphabetical)
  - Parameter/Field (ascending/descending, alphabetical)
- [ ] AC11: By default, audit logs are sorted by Date/Timestamp descending (newest first)
- [ ] AC12: User can paginate through audit logs using table pagination controls
- [ ] AC13: User can view detailed audit log information by clicking on audit log row or expanding row
- [ ] AC14: Detailed audit log view displays comprehensive information:
  - Full Details (JSON format or formatted view)
  - Source (Via System or Detected on Asset)
  - Parameter/Field Name (which parameter/field was changed)
  - Old Value (previous value of the parameter)
  - New Value (new value of the parameter)
  - IP Address (if available, for system-initiated changes)
  - User Agent (if available, for system-initiated changes)
  - Agent ID (if available, for asset-detected changes)
- [ ] AC15: Changes column displays human-readable description of what changed (e.g., "Status changed from Available to In Use", "Tag 'Production' added", "Asset name updated from 'Server-01' to 'Server-02'", "OS Version changed from Windows Server 2019 to Windows Server 2022")
- [ ] AC16: Date/Timestamp column displays formatted date and time (e.g., "2024-01-20 14:30:25" or "May 05, 2025 3:45pm")
- [ ] AC17: User column displays user email or name (for system-initiated changes) or "System" (for agent-detected changes on the asset)
- [ ] AC18: Action column displays the action type (CREATE, UPDATE, DELETE, TAG_ADDED, TAG_REMOVED, STATUS_CHANGED, PARAMETER_CHANGED, etc.)
- [ ] AC19: Source column displays "Via System" for changes made through the system UI/API or "Detected on Asset" for changes detected by the agent directly on the asset
- [ ] AC20: Parameter/Field column displays the name of the parameter/field that changed (e.g., "status", "name", "osVersion", "ipAddress", "hostname", "memory", "diskSpace", etc.)
- [ ] AC21: Old Value column displays the previous value of the parameter before the change
- [ ] AC22: New Value column displays the new value of the parameter after the change
- [ ] AC23: System captures and logs all parameter changes whether made through the system or detected directly on the asset
- [ ] AC19: User can use column visibility toggle to show/hide columns
- [ ] AC20: Column visibility preferences are saved and persist across sessions
- [ ] AC26: Table displays empty state message when no audit logs exist for the asset
- [ ] AC27: Table shows loading state while fetching audit log data
- [ ] AC28: Table shows "No results found" message when search/filter returns no matches
- [ ] AC29: Refresh/Reload button reloads audit log list from server
- [ ] AC30: Table supports export functionality (Export button) to export audit logs as CSV/Excel
- [ ] AC31: Exported CSV includes all visible columns and filtered/search results
- [ ] AC32: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC33: Page respects user permissions - only users with asset view access can view audit logs
- [ ] AC34: Audit log table updates in real-time or refreshes periodically to show new entries
- [ ] AC35: New audit log entries appear at the top of the table (if sorted by Date/Timestamp descending)
- [ ] AC36: Audit logs are automatically filtered to show only entries related to the current asset
- [ ] AC37: User can click on User to view user details or navigate to user management page (if accessible)
- [ ] AC38: Audit logs show all relevant actions including:
  - Asset creation
  - Asset updates made through system (name, status, category, tags, cost properties, procurement properties, etc.)
  - Asset deletion
  - Tag additions/removals
  - Status changes
  - Cost/procurement property updates
  - Parameter changes detected on asset (OS version, IP address, hostname, hardware specs, software installations, etc.)
  - Any other asset modifications or detected changes
- [ ] AC39: Changes column provides clear, readable descriptions of what changed in each audit log entry
- [ ] AC40: For all parameter changes, Old Value and New Value columns show the previous and new values respectively
- [ ] AC41: Parameter changes are captured for all monitored parameters including but not limited to:
  - Asset properties (name, status, category, tags)
  - System properties (OS version, OS build, hostname, domain)
  - Network properties (IP address, MAC address, network interfaces)
  - Hardware properties (CPU, memory, disk space, disk usage)
  - Software properties (installed software, software versions)
  - Lifecycle properties (cost, procurement, warranty)
  - Any other parameters being monitored by the agent
- [ ] AC42: Changes detected directly on the asset are automatically logged when the agent detects parameter changes
- [ ] AC43: Changes made through the system are logged with user information and source "Via System"
- [ ] AC44: Changes detected on the asset are logged with source "Detected on Asset" and may include agent ID
- [ ] AC45: Date range filter allows selecting start date and end date with time selection
- [ ] AC46: Date range filter can be cleared to show all audit logs
- [ ] AC47: Multiple filters can be applied simultaneously (Action, Source, User, Parameter/Field, Date Range)
- [ ] AC48: All filters can be reset to show all audit logs for the asset
- [ ] AC49: Audit log table is scoped to the current asset only (does not show logs from other assets)

**Test Data:**
```json
{
  "assetId": "asset-001",
  "assetName": "Windows Server 01",
  "auditLogs": [
    {
      "id": "audit-001",
      "timestamp": "2024-01-20T14:30:25Z",
      "action": "UPDATE",
      "source": "Via System",
      "user": "admin@example.com",
      "parameter": "status",
      "oldValue": "Available",
      "newValue": "In Use",
      "details": {
        "field": "status",
        "oldValue": "Available",
        "newValue": "In Use",
        "changes": "Status changed from Available to In Use"
      }
    },
    {
      "id": "audit-002",
      "timestamp": "2024-01-20T13:15:00Z",
      "action": "PARAMETER_CHANGED",
      "source": "Detected on Asset",
      "user": "System",
      "agentId": "agent-001",
      "parameter": "osVersion",
      "oldValue": "Windows Server 2019",
      "newValue": "Windows Server 2022",
      "details": {
        "field": "osVersion",
        "oldValue": "Windows Server 2019",
        "newValue": "Windows Server 2022",
        "changes": "OS Version changed from Windows Server 2019 to Windows Server 2022"
      }
    },
    {
      "id": "audit-003",
      "timestamp": "2024-01-20T10:15:00Z",
      "action": "TAG_ADDED",
      "source": "Via System",
      "user": "operator@example.com",
      "parameter": "tags",
      "oldValue": null,
      "newValue": "Production",
      "details": {
        "tagName": "Production",
        "changes": "Tag 'Production' added"
      }
    },
    {
      "id": "audit-004",
      "timestamp": "2024-01-20T09:30:00Z",
      "action": "PARAMETER_CHANGED",
      "source": "Detected on Asset",
      "user": "System",
      "agentId": "agent-001",
      "parameter": "ipAddress",
      "oldValue": "192.168.1.100",
      "newValue": "192.168.1.105",
      "details": {
        "field": "ipAddress",
        "oldValue": "192.168.1.100",
        "newValue": "192.168.1.105",
        "changes": "IP Address changed from 192.168.1.100 to 192.168.1.105"
      }
    },
    {
      "id": "audit-005",
      "timestamp": "2024-01-19T16:45:30Z",
      "action": "UPDATE",
      "source": "Via System",
      "user": "admin@example.com",
      "parameter": "name",
      "oldValue": "Server-01",
      "newValue": "Windows Server 01",
      "details": {
        "field": "name",
        "oldValue": "Server-01",
        "newValue": "Windows Server 01",
        "changes": "Asset name updated from 'Server-01' to 'Windows Server 01'"
      }
    },
    {
      "id": "audit-006",
      "timestamp": "2024-01-19T14:20:00Z",
      "action": "PARAMETER_CHANGED",
      "source": "Detected on Asset",
      "user": "System",
      "agentId": "agent-001",
      "parameter": "memory",
      "oldValue": "16 GB",
      "newValue": "32 GB",
      "details": {
        "field": "memory",
        "oldValue": "16 GB",
        "newValue": "32 GB",
        "changes": "Memory changed from 16 GB to 32 GB"
      }
    },
    {
      "id": "audit-007",
      "timestamp": "2024-01-18T09:20:15Z",
      "action": "UPDATE",
      "source": "Via System",
      "user": "admin@example.com",
      "parameter": "cost",
      "oldValue": null,
      "newValue": "{\"purchasePrice\":5000,\"currency\":\"USD\"}",
      "details": {
        "field": "cost",
        "oldValue": null,
        "newValue": {
          "purchasePrice": 5000,
          "currency": "USD"
        },
        "changes": "Cost properties updated: Purchase Price set to $5,000 USD"
      }
    },
    {
      "id": "audit-008",
      "timestamp": "2024-01-18T08:10:00Z",
      "action": "PARAMETER_CHANGED",
      "source": "Detected on Asset",
      "user": "System",
      "agentId": "agent-001",
      "parameter": "hostname",
      "oldValue": "win-server-01",
      "newValue": "win-server-01-new",
      "details": {
        "field": "hostname",
        "oldValue": "win-server-01",
        "newValue": "win-server-01-new",
        "changes": "Hostname changed from win-server-01 to win-server-01-new"
      }
    },
    {
      "id": "audit-009",
      "timestamp": "2024-01-15T11:00:00Z",
      "action": "CREATE",
      "source": "Via System",
      "user": "admin@example.com",
      "parameter": null,
      "oldValue": null,
      "newValue": null,
      "details": {
        "changes": "Asset created"
      }
    },
    {
      "id": "audit-010",
      "timestamp": "2024-01-14T08:30:00Z",
      "action": "TAG_REMOVED",
      "source": "Via System",
      "user": "operator@example.com",
      "parameter": "tags",
      "oldValue": "Test",
      "newValue": null,
      "details": {
        "tagName": "Test",
        "changes": "Tag 'Test' removed"
      }
    }
  ],
  "filters": {
    "actions": ["CREATE", "UPDATE", "DELETE", "TAG_ADDED", "TAG_REMOVED", "STATUS_CHANGED", "PARAMETER_CHANGED"],
    "sources": ["Via System", "Detected on Asset"],
    "users": [
      "admin@example.com",
      "operator@example.com",
      "System"
    ],
    "parameters": ["status", "name", "osVersion", "ipAddress", "hostname", "memory", "cost", "tags", "category", "diskSpace", "cpu"]
  },
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 6
  }
}
```

**API Endpoints:**
- `GET /v1/assets/:id/audit-log` - Get list of audit logs for a specific asset
  - Path Parameters:
    - `id` (required): Asset ID
  - Query Parameters:
    - `action` (optional): Filter by action (CREATE, UPDATE, DELETE, TAG_ADDED, TAG_REMOVED, STATUS_CHANGED, PARAMETER_CHANGED, etc.)
    - `source` (optional): Filter by source ("Via System" or "Detected on Asset")
    - `userId` (optional): Filter by user ID
    - `parameter` (optional): Filter by parameter/field name (status, name, osVersion, ipAddress, hostname, memory, etc.)
    - `startDate` (optional): Filter by start date (ISO 8601 format)
    - `endDate` (optional): Filter by end date (ISO 8601 format)
    - `search` (optional): Search by User, Action, Parameter/Field, Old Value, New Value, or Changes
    - `sortBy` (optional): Sort field (timestamp, user, action, source, parameter)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 10)
  - Response: Paginated list of asset-specific audit logs with metadata
- `GET /v1/assets/:id/audit-log/export` - Export asset audit logs to CSV/Excel
  - Path Parameters:
    - `id` (required): Asset ID
  - Query Parameters: Same as GET /v1/assets/:id/audit-log
  - Response: CSV/Excel file download

**UI Components:**
- Page: `/assets/:id` (AssetDetails.tsx) - Asset Details page with Audit Log tab
- Components:
  - **Asset Details Page:**
    - Multiple tabs including "Audit Log" tab
    - Tab navigation
  - **Audit Log Tab:**
    - Card/Container with title "Audit Log"
    - Table Header:
      - Search input field (with SearchOutlined icon)
      - Filter dropdowns:
        - Action filter (Select dropdown)
        - Source filter (Select dropdown: "Via System", "Detected on Asset")
        - User filter (Select dropdown)
        - Parameter/Field filter (Select dropdown: list of parameters/fields)
      - Date Range picker (RangePicker component)
      - Export button (DownloadOutlined icon) - exports to CSV/Excel
      - Refresh button (ReloadOutlined icon) - reloads data
      - Column visibility toggle button (EyeOutlined icon, optional)
    - **Table:**
      - Columns: Date/Timestamp, User, Action, Source, Parameter/Field, Old Value, New Value, Changes
      - Sortable columns: Date/Timestamp, User, Action, Source, Parameter/Field
      - Filterable columns: Action, Source, User, Parameter/Field
      - Searchable columns: User, Action, Parameter/Field, Old Value, New Value, Changes
      - Expandable rows for detailed view (optional)
      - Clickable User (navigates to user details if accessible)
      - Source column displays "Via System" (for system-initiated changes) or "Detected on Asset" (for agent-detected changes)
      - Parameter/Field column displays the name of the parameter that changed
      - Old Value column displays the previous value
      - New Value column displays the new value
    - **Column Visibility Modal (optional):**
      - Checkboxes for each column
      - Apply button
      - Reset button (restores all columns)
    - **Audit Log Details Modal/Drawer (optional):**
      - Comprehensive audit log information display
      - Formatted details view or JSON view toggle
      - Source display (Via System or Detected on Asset)
      - Parameter/Field Name display
      - Old Value and New Value display (for all parameter changes)
      - Agent ID display (if available, for asset-detected changes)
      - IP Address and User Agent display (if available, for system-initiated changes)
      - Close button
    - **Pagination:**
      - Page size selector (10, 20, 50, 100)
      - Page navigation (Previous, Next, page numbers)
      - Total count display
    - **Loading State:** Table shows loading spinner while fetching
    - **Empty State:** Message when no audit logs exist for the asset
    - **No Results State:** Message when search/filter returns no matches

**User Actions:**
1. Navigate to Assets > All Assets page
2. Click on an asset row or "View" action button
3. Verify Asset Details page opens
4. Click on "Audit Log" tab
5. Verify Audit Log tab displays audit logs table
6. View audit logs table with all columns (Date, User, Action, Source, Parameter/Field, Old Value, New Value, Changes)
7. Use search box to filter audit logs by User, Action, Parameter/Field, Old Value, New Value, or Changes
8. Select Action filter to filter by specific actions
9. Select Source filter to filter by "Via System" or "Detected on Asset"
10. Select User filter to filter by specific users
11. Select Parameter/Field filter to filter by specific parameters/fields
12. Select Date Range to filter by date range
13. Click column headers to sort audit logs (Date/Timestamp, User, Action, Source, Parameter/Field)
14. View Source column to see if changes were made via system or detected on asset
15. View Parameter/Field column to see which parameter changed
16. View Old Value and New Value columns to see the value changes
17. Adjust pagination (change page size, navigate pages)
18. Expand audit log row to view detailed information (if expandable rows are implemented)
19. Click on User to view user details or navigate to user management (if accessible)
20. Click Export button to download CSV/Excel
21. Click Refresh button to reload data
22. Use column visibility toggle to show/hide columns (if available)
23. Clear all filters to show all audit logs for the asset
24. Verify audit logs are scoped to the current asset only
25. Verify new audit log entries appear at the top (if sorted by Date/Timestamp descending)
26. Verify changes made through system show "Via System" in Source column
27. Verify changes detected on asset show "Detected on Asset" in Source column
28. Verify all parameter changes are captured and displayed with Old Value and New Value

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access if they have asset view permission)
- Verify Audit Log tab is accessible from Asset Details page
- Verify audit logs are automatically filtered to show only entries for the current asset
- Test search functionality:
  - Search by user email/name (partial and full match)
  - Search by action (partial and full match)
  - Search by parameter/field name (partial and full match)
  - Search by old value (partial match)
  - Search by new value (partial match)
  - Search by changes description (partial match)
  - Case-insensitive search
  - Search with no results
  - Clear search to show all audit logs
- Test filtering:
  - Filter by Action (CREATE, UPDATE, DELETE, TAG_ADDED, TAG_REMOVED, STATUS_CHANGED, PARAMETER_CHANGED, etc.)
  - Filter by Source ("Via System" or "Detected on Asset")
  - Filter by User (select specific user from dropdown, or "System" for agent-detected changes)
  - Filter by Parameter/Field (select specific parameter from dropdown: status, name, osVersion, ipAddress, hostname, memory, etc.)
  - Filter by Date Range (select start and end dates)
  - Apply multiple filters simultaneously
  - Reset filters
- Test date range filtering:
  - Select date range covering some audit logs
  - Verify only logs within date range are shown
  - Select date range with no logs
  - Verify empty state is shown
  - Clear date range filter to show all logs
- Test sorting:
  - Sort by Date/Timestamp (newest/oldest first)
  - Sort by User (alphabetical)
  - Sort by Action (alphabetical)
  - Sort by Source (alphabetical)
  - Sort by Parameter/Field (alphabetical)
  - Verify default sort is Date/Timestamp descending
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test audit log details:
  - Expand audit log row to view full details (if expandable rows)
  - Verify details are displayed correctly
  - Verify Source is shown (Via System or Detected on Asset)
  - Verify Parameter/Field Name is shown
  - Verify Old Value and New Value are shown for all parameter changes
  - Verify Agent ID is shown for asset-detected changes
  - Verify IP Address and User Agent are shown for system-initiated changes
  - Test with different action types (CREATE, UPDATE, DELETE, TAG_ADDED, TAG_REMOVED, PARAMETER_CHANGED)
- Test Source column:
  - Verify "Via System" is shown for changes made through system UI/API
  - Verify "Detected on Asset" is shown for changes detected by agent on the asset
  - Filter by "Via System" - verify only system-initiated changes are shown
  - Filter by "Detected on Asset" - verify only agent-detected changes are shown
- Test Parameter/Field column:
  - Verify parameter/field names are displayed correctly
  - Verify all monitored parameters are captured (status, name, osVersion, ipAddress, hostname, memory, diskSpace, cpu, etc.)
  - Filter by specific parameter (e.g., "osVersion") - verify only logs for that parameter are shown
- Test Old Value and New Value columns:
  - Verify Old Value shows previous value before change
  - Verify New Value shows new value after change
  - Verify both columns are populated for parameter changes
  - Verify null/empty values are handled correctly
  - Test with different data types (strings, numbers, objects, arrays)
- Test Changes column:
  - Verify Changes column shows human-readable descriptions
  - Verify UPDATE actions show both old and new values
  - Verify CREATE actions show "Asset created"
  - Verify TAG_ADDED shows "Tag 'X' added"
  - Verify TAG_REMOVED shows "Tag 'X' removed"
  - Verify STATUS_CHANGED shows "Status changed from X to Y"
  - Verify PARAMETER_CHANGED shows parameter-specific descriptions (e.g., "OS Version changed from X to Y", "IP Address changed from X to Y", "Memory changed from X to Y")
- Test parameter change tracking:
  - Make a change through system UI (e.g., update asset status)
  - Verify audit log is created with Source "Via System" and user information
  - Make a change directly on the asset (e.g., change hostname on the server)
  - Verify agent detects the change and creates audit log with Source "Detected on Asset"
  - Verify both types of changes are visible in the audit log table
  - Verify all monitored parameters are tracked (OS version, IP address, hostname, hardware specs, software, etc.)
  - Test with various parameter types (system properties, network properties, hardware properties, software properties)
- Test user navigation:
  - Click on User email/name
  - Verify navigation to user details or user management page (if accessible)
- Test export functionality:
  - Export all audit logs for the asset
  - Export filtered/search results
  - Export with date range filter applied
  - Verify CSV/Excel file is downloaded correctly
  - Verify CSV includes correct columns and data
  - Verify exported data is scoped to the current asset only
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Test column visibility (if available):
  - Hide/show individual columns
  - Apply column visibility changes
  - Reset column visibility to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify column visibility preferences persist across sessions
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no audit logs exist for the asset
  - "No results found" when search returns no matches
- Test date formatting in Date/Timestamp column
- Test real-time updates:
  - Make a change to the asset through system (e.g., update status, add tag)
  - Verify new audit log entry appears in the table with Source "Via System"
  - Verify new entry appears at the top (if sorted by Date/Timestamp descending)
  - Make a change directly on the asset (e.g., change hostname, update OS)
  - Verify agent detects the change and new audit log entry appears with Source "Detected on Asset"
  - Verify parameter, Old Value, and New Value are populated correctly
  - Verify both system-initiated and asset-detected changes appear in real-time
- Verify audit log scope:
  - Verify only audit logs for the current asset are shown
  - Verify audit logs from other assets are not displayed
  - Switch to a different asset and verify audit logs are different
- Test with different asset types:
  - Test with server assets
  - Test with workstation assets
  - Test with laptop assets
  - Verify audit logs are displayed correctly for all asset types
- Verify table performance with large number of audit logs
- Test responsive design (table on different screen sizes)
- Verify user permissions are enforced correctly
- Test error handling:
  - Network errors during data fetch
  - Invalid asset ID
  - Permission errors
  - Verify appropriate error messages are displayed
- Test audit log completeness:
  - Verify all asset changes create audit log entries
  - Verify CREATE action is logged when asset is created (Source: "Via System")
  - Verify UPDATE actions are logged for all field changes made through system (Source: "Via System")
  - Verify TAG_ADDED and TAG_REMOVED actions are logged (Source: "Via System")
  - Verify STATUS_CHANGED actions are logged (Source: "Via System")
  - Verify DELETE action is logged when asset is deleted (Source: "Via System")
  - Verify PARAMETER_CHANGED actions are logged for changes detected on asset (Source: "Detected on Asset")
  - Verify all monitored parameters are tracked when they change on the asset
  - Verify parameter changes show correct Old Value and New Value
  - Verify both system-initiated and asset-detected changes are captured and displayed

---

### User Story 7: Alerts Page Functions

**Story ID:** `US-037`  
**Title:** View and Manage System Alerts in Table View  
**Priority:** P0 (Critical)  
**Module:** Alerts - Alert Management

**User Story:**
```
As a system administrator
I want to view, search, filter, and manage system alerts in a table view
So that I can monitor system events, track alert statuses, and respond to critical issues efficiently
```

**Acceptance Criteria:**
- [ ] AC1: There is a dedicated Alerts page that users can directly access when logged in (accessible from main navigation menu/sidebar)
- [ ] AC2: Alerts page displays a table listing all system alerts
- [ ] AC3: Table displays the following columns (configurable visibility):
  - Alert Name (sortable, searchable, clickable)
  - Severity (filterable, color-coded badges: Critical, Warning, Info, Clear)
  - Status (filterable, color-coded badges: Active, Acknowledged, Resolved, Cleared)
  - Module (filterable, searchable, e.g., Endpoint, Asset, Patch, Vulnerability, Agent)
  - Asset/Endpoint (searchable, asset name or endpoint name, clickable to navigate to asset details)
  - Attribute (searchable, the attribute that triggered the alert, e.g., "Memory Utilization (%)", "CPU Usage", "Disk Space")
  - Value (sortable, numeric or text value that triggered the alert)
  - Message (searchable, alert message/description)
  - Created On (sortable, formatted date/time)
  - Acknowledged By (searchable, user who acknowledged the alert)
  - Acknowledged At (sortable, formatted date/time)
  - Actions (Acknowledge, Resolve, View Details)
- [ ] AC4: User can search alerts by Alert Name, Module, Asset/Endpoint, Attribute, Message, or Acknowledged By using a search input field
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: User can filter alerts by:
  - Severity (via Severity column filter dropdown: Critical, Warning, Info, Clear)
  - Status (via Status column filter dropdown: Active, Acknowledged, Resolved, Cleared)
  - Module (via Module column filter dropdown: Endpoint, Asset, Patch, Vulnerability, Agent, etc.)
  - Organization (if multi-tenant, via Organization filter dropdown)
  - Branch Location (via Branch Location filter dropdown)
  - Date Range (via Date Range picker: start date and end date)
- [ ] AC7: User can sort alerts by:
  - Alert Name (ascending/descending, alphabetical)
  - Severity (ascending/descending)
  - Status (ascending/descending)
  - Module (ascending/descending, alphabetical)
  - Value (ascending/descending, numeric or alphabetical)
  - Created On (newest/oldest first, date/time)
  - Acknowledged At (newest/oldest first, date/time)
- [ ] AC8: By default, alerts are sorted by Created On descending (newest first)
- [ ] AC9: User can paginate through alerts using table pagination controls
- [ ] AC10: User can view alert details by clicking on alert name or "View Details" action button
- [ ] AC11: Alert details modal/drawer displays comprehensive alert information including:
  - Basic Information: Alert Name, Severity, Status, Module
  - Asset/Endpoint Information: Asset Name, Endpoint Name, Asset ID, Endpoint ID (clickable links)
  - Alert Details: Attribute, Value, Threshold (if applicable), Message
  - Timeline: Created On, Acknowledged At, Resolved At, Cleared At
  - User Information: Acknowledged By, Resolved By, Cleared By
  - Related Information: Related alerts, related assets, related patches/vulnerabilities
- [ ] AC12: User can acknowledge an alert by clicking "Acknowledge" action button
- [ ] AC13: Acknowledge button is only available for alerts with status "Active"
- [ ] AC14: Acknowledge button opens Acknowledge Confirmation modal or directly acknowledges the alert
- [ ] AC15: Acknowledge Confirmation modal (if shown) includes optional "Notes" text field
- [ ] AC16: Upon acknowledging, system updates alert status to "Acknowledged"
- [ ] AC17: System records acknowledger information (user ID, timestamp) in alert record
- [ ] AC18: System creates audit log entry for acknowledge action
- [ ] AC19: Success message is displayed after acknowledging alert
- [ ] AC20: User can resolve an alert by clicking "Resolve" action button
- [ ] AC21: Resolve button is available for alerts with status "Active" or "Acknowledged"
- [ ] AC22: Resolve button opens Resolve Confirmation modal
- [ ] AC23: Resolve Confirmation modal includes optional "Resolution Notes" text field
- [ ] AC24: Upon resolving, system updates alert status to "Resolved"
- [ ] AC25: System records resolver information (user ID, timestamp) in alert record
- [ ] AC26: System creates audit log entry for resolve action
- [ ] AC27: Success message is displayed after resolving alert
- [ ] AC28: Severity column displays color-coded badges (Critical=red, Warning=orange, Info=blue, Clear=green)
- [ ] AC29: Status column displays color-coded badges (Active=red, Acknowledged=yellow, Resolved=green, Cleared=gray)
- [ ] AC30: Created On and Acknowledged At columns display formatted date and time
- [ ] AC31: Value column displays numeric or text value (formatted appropriately)
- [ ] AC32: Message column displays alert message with ellipsis for long text (expandable on hover or click)
- [ ] AC33: User can use column visibility toggle to show/hide columns
- [ ] AC34: Column visibility preferences are saved and persist across sessions
- [ ] AC35: User can pin/unpin columns (e.g., Alert Name can be pinned to left)
- [ ] AC36: Table displays empty state message when no alerts exist
- [ ] AC37: Table shows loading state while fetching alert data
- [ ] AC38: Table shows "No results found" message when search/filter returns no matches
- [ ] AC39: Refresh/Reload button reloads alert list from server
- [ ] AC40: Table supports export functionality (Export button) to export alert list as CSV/Excel
- [ ] AC41: Exported CSV includes all visible columns and filtered/search results
- [ ] AC42: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC43: Page respects user permissions - only users with alert view access can view alerts
- [ ] AC44: Alert table updates in real-time or refreshes periodically to show new alerts
- [ ] AC45: New alerts appear at the top of the table (if sorted by Created On descending)
- [ ] AC46: User can click on Asset/Endpoint name to navigate to asset/endpoint details page
- [ ] AC47: User can view alerts in Timeline view by clicking "Timeline" button
- [ ] AC48: Timeline view displays alerts in chronological order with visual timeline
- [ ] AC49: User can switch between List view and Grid view using view mode toggle buttons
- [ ] AC50: Grid view displays alerts as cards with key information (Alert Name, Severity, Status, Module, Created On)
- [ ] AC51: User can select multiple alerts using checkboxes for bulk operations
- [ ] AC52: Bulk operations include: Bulk Acknowledge, Bulk Resolve
- [ ] AC53: Bulk Acknowledge acknowledges all selected alerts with status "Active"
- [ ] AC54: Bulk Resolve resolves all selected alerts with status "Active" or "Acknowledged"
- [ ] AC55: Bulk operations show confirmation dialog with count of selected alerts
- [ ] AC56: User can configure alert settings by clicking "Configure Alert" button (opens alert configuration page/modal)

**Test Data:**
```json
{
  "alerts": [
    {
      "id": "alert-001",
      "alertName": "Memory Policy",
      "severity": "CRITICAL",
      "status": "Active",
      "module": "Endpoint",
      "assetId": "asset-001",
      "assetName": "Windows Server 01",
      "endpointId": "endpoint-001",
      "endpointName": "EP-001",
      "attribute": "Memory Utilization (%)",
      "value": "85.5",
      "threshold": "80.0",
      "message": "KFILKHAROPS001 : Memory utilization exceeded threshold of 80%. Current value: 85.5%",
      "createdOn": "2024-01-20T14:30:25Z",
      "acknowledgedBy": null,
      "acknowledgedAt": null,
      "resolvedBy": null,
      "resolvedAt": null,
      "clearedBy": null,
      "clearedAt": null
    },
    {
      "id": "alert-002",
      "alertName": "Disk Space Policy",
      "severity": "WARNING",
      "status": "Acknowledged",
      "module": "Asset",
      "assetId": "asset-002",
      "assetName": "Linux Workstation 01",
      "endpointId": "endpoint-002",
      "endpointName": "EP-002",
      "attribute": "Disk Space Usage (%)",
      "value": "75.0",
      "threshold": "70.0",
      "message": "Linux Workstation 01 : Disk space usage exceeded threshold of 70%. Current value: 75.0%",
      "createdOn": "2024-01-20T10:15:00Z",
      "acknowledgedBy": "admin@example.com",
      "acknowledgedAt": "2024-01-20T10:20:00Z",
      "acknowledgedNotes": "Investigating disk space issue",
      "resolvedBy": null,
      "resolvedAt": null,
      "clearedBy": null,
      "clearedAt": null
    },
    {
      "id": "alert-003",
      "alertName": "CPU Policy",
      "severity": "INFO",
      "status": "Resolved",
      "module": "Endpoint",
      "assetId": "asset-003",
      "assetName": "MacBook Pro 01",
      "endpointId": "endpoint-003",
      "endpointName": "EP-003",
      "attribute": "CPU Usage (%)",
      "value": "65.0",
      "threshold": "90.0",
      "message": "MacBook Pro 01 : CPU usage is normal. Current value: 65.0%",
      "createdOn": "2024-01-19T16:45:30Z",
      "acknowledgedBy": "operator@example.com",
      "acknowledgedAt": "2024-01-19T17:00:00Z",
      "resolvedBy": "admin@example.com",
      "resolvedAt": "2024-01-19T18:00:00Z",
      "resolutionNotes": "CPU usage normalized. No action required.",
      "clearedBy": null,
      "clearedAt": null
    },
    {
      "id": "alert-004",
      "alertName": "Patch Missing Policy",
      "severity": "CRITICAL",
      "status": "Active",
      "module": "Patch",
      "assetId": "asset-001",
      "assetName": "Windows Server 01",
      "endpointId": "endpoint-001",
      "endpointName": "EP-001",
      "attribute": "Missing Patches",
      "value": "5",
      "threshold": "0",
      "message": "Windows Server 01 : 5 critical patches are missing",
      "createdOn": "2024-01-20T09:00:00Z",
      "acknowledgedBy": null,
      "acknowledgedAt": null,
      "resolvedBy": null,
      "resolvedAt": null,
      "clearedBy": null,
      "clearedAt": null
    },
    {
      "id": "alert-005",
      "alertName": "Vulnerability Detected",
      "severity": "CRITICAL",
      "status": "Acknowledged",
      "module": "Vulnerability",
      "assetId": "asset-002",
      "assetName": "Linux Workstation 01",
      "endpointId": "endpoint-002",
      "endpointName": "EP-002",
      "attribute": "Critical Vulnerabilities",
      "value": "3",
      "threshold": "0",
      "message": "Linux Workstation 01 : 3 critical vulnerabilities detected",
      "createdOn": "2024-01-20T08:30:00Z",
      "acknowledgedBy": "admin@example.com",
      "acknowledgedAt": "2024-01-20T08:35:00Z",
      "acknowledgedNotes": "Reviewing vulnerabilities",
      "resolvedBy": null,
      "resolvedAt": null,
      "clearedBy": null,
      "clearedAt": null
    },
    {
      "id": "alert-006",
      "alertName": "Agent Offline",
      "severity": "WARNING",
      "status": "Cleared",
      "module": "Agent",
      "assetId": "asset-004",
      "assetName": "Windows Server 02",
      "endpointId": "endpoint-004",
      "endpointName": "EP-004",
      "attribute": "Agent Status",
      "value": "Offline",
      "threshold": "Online",
      "message": "Windows Server 02 : Agent is offline",
      "createdOn": "2024-01-19T12:00:00Z",
      "acknowledgedBy": "operator@example.com",
      "acknowledgedAt": "2024-01-19T12:05:00Z",
      "resolvedBy": "admin@example.com",
      "resolvedAt": "2024-01-19T13:00:00Z",
      "clearedBy": "System",
      "clearedAt": "2024-01-19T14:00:00Z"
    }
  ],
  "filters": {
    "severity": ["CRITICAL", "WARNING", "INFO", "CLEAR"],
    "status": ["Active", "Acknowledged", "Resolved", "Cleared"],
    "module": ["Endpoint", "Asset", "Patch", "Vulnerability", "Agent", "Network", "Security"]
  },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}
```

**API Endpoints:**
- `GET /v1/alerts` - Get list of alerts with filtering, sorting, and pagination
  - Query Parameters:
    - `severity` (optional): Filter by severity (CRITICAL, WARNING, INFO, CLEAR)
    - `status` (optional): Filter by status (Active, Acknowledged, Resolved, Cleared)
    - `module` (optional): Filter by module (Endpoint, Asset, Patch, Vulnerability, Agent, etc.)
    - `assetId` (optional): Filter by asset ID
    - `endpointId` (optional): Filter by endpoint ID
    - `search` (optional): Search by Alert Name, Module, Asset/Endpoint, Attribute, Message, Acknowledged By
    - `organizationId` (optional): Filter by organization
    - `branchId` (optional): Filter by branch location
    - `startDate` (optional): Filter by start date (ISO 8601 format)
    - `endDate` (optional): Filter by end date (ISO 8601 format)
    - `sortBy` (optional): Sort field (alertName, severity, status, module, value, createdOn, acknowledgedAt)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 20)
  - Response: Paginated list of alerts with metadata
- `GET /v1/alerts/:id` - Get alert details by ID
  - Response: Detailed alert information
- `PUT /v1/alerts/:id/acknowledge` - Acknowledge an alert
  - Request Body:
    - `notes` (string, optional): Acknowledgment notes
  - Response: Updated alert with status "Acknowledged"
- `PUT /v1/alerts/bulk-acknowledge` - Acknowledge multiple alerts
  - Request Body:
    - `alertIds` (array, required): List of alert IDs to acknowledge
    - `notes` (string, optional): Acknowledgment notes
  - Response: Count of acknowledged alerts
- `PUT /v1/alerts/:id/resolve` - Resolve an alert
  - Request Body:
    - `notes` (string, optional): Resolution notes
  - Response: Updated alert with status "Resolved"
- `PUT /v1/alerts/bulk-resolve` - Resolve multiple alerts
  - Request Body:
    - `alertIds` (array, required): List of alert IDs to resolve
    - `notes` (string, optional): Resolution notes
  - Response: Count of resolved alerts
- `GET /v1/alerts/timeline` - Get alerts in timeline format
  - Query Parameters: Same as GET /v1/alerts
  - Response: Alerts grouped by time periods with timeline visualization data
- `GET /v1/alerts/export` - Export alerts to CSV/Excel
  - Query Parameters: Same as GET /v1/alerts
  - Response: CSV/Excel file download

**UI Components:**
- Page: `/alerts` (Alerts.tsx)
- Components:
  - **Page Header:**
    - Page title "Alerts"
    - Breadcrumb navigation: Alerts (accessible directly from main navigation)
  - **Table Header:**
    - Search input field (with SearchOutlined icon)
    - Filter dropdowns:
      - Severity filter (Select dropdown)
      - Status filter (Select dropdown)
      - Module filter (Select dropdown)
      - Organization filter (Select dropdown, if multi-tenant)
      - Branch Location filter (Select dropdown)
    - Date Range picker (RangePicker component)
    - Timeline button (CalendarOutlined icon) - switches to timeline view
    - Export button (DownloadOutlined icon) - exports to CSV/Excel
    - Refresh button (ReloadOutlined icon) - reloads data
    - Configure Alert button - opens alert configuration page/modal
    - View mode toggle buttons:
      - List view button (UnorderedListOutlined icon)
      - Grid view button (AppstoreOutlined icon)
    - Column visibility toggle button (EyeOutlined icon, optional)
  - **Table (List View):**
    - Columns: Alert Name, Severity, Status, Module, Asset/Endpoint, Attribute, Value, Message, Created On, Acknowledged By, Acknowledged At, Actions
    - Sortable columns: Alert Name, Severity, Status, Module, Value, Created On, Acknowledged At
    - Filterable columns: Severity, Status, Module
    - Searchable columns: Alert Name, Module, Asset/Endpoint, Attribute, Message, Acknowledged By
    - Clickable Alert Name (opens details modal/drawer)
    - Clickable Asset/Endpoint (navigates to asset/endpoint details)
    - Checkboxes for row selection
    - Actions column: Acknowledge button, Resolve button, View Details button (dropdown menu)
    - Color-coded severity badges
    - Color-coded status badges
  - **Grid View:**
    - Alert cards displaying key information
    - Each card shows: Alert Name, Severity, Status, Module, Created On
    - Clickable cards to view details
    - Acknowledge and Resolve buttons on each card
  - **Timeline View:**
    - Chronological timeline visualization
    - Alerts grouped by time periods (Today, Yesterday, This Week, This Month, etc.)
    - Visual timeline with alert markers
    - Clickable alerts to view details
  - **Column Visibility Modal (optional):**
    - Checkboxes for each column
    - Apply button
    - Reset button (restores all columns)
  - **Alert Details Modal/Drawer:**
    - Comprehensive alert information display
    - Tabs or sections: Basic Info, Asset/Endpoint Info, Alert Details, Timeline, Related Alerts
    - Acknowledge and Resolve buttons (if applicable)
    - Close button
  - **Acknowledge Confirmation Modal:**
    - Message: "Are you sure you want to acknowledge this alert?"
    - Notes field (TextArea, optional, multiline)
    - Action buttons: Acknowledge (primary), Cancel (default)
    - Loading state while acknowledging
    - Success/error messages
  - **Bulk Acknowledge Confirmation Modal:**
    - Message: "Are you sure you want to acknowledge X selected alerts?"
    - Notes field (TextArea, optional, multiline)
    - Action buttons: Acknowledge (primary), Cancel (default)
    - Loading state while acknowledging
    - Success/error messages
  - **Resolve Confirmation Modal:**
    - Message: "Are you sure you want to resolve this alert?"
    - Resolution Notes field (TextArea, optional, multiline)
    - Action buttons: Resolve (primary), Cancel (default)
    - Loading state while resolving
    - Success/error messages
  - **Bulk Resolve Confirmation Modal:**
    - Message: "Are you sure you want to resolve X selected alerts?"
    - Resolution Notes field (TextArea, optional, multiline)
    - Action buttons: Resolve (primary), Cancel (default)
    - Loading state while resolving
    - Success/error messages
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no alerts exist
  - **No Results State:** Message when search/filter returns no matches

**User Actions:**
1. Log in to the application
2. Navigate to Alerts page directly from main navigation menu/sidebar
3. Verify Alerts page is accessible and loads correctly
2. View alerts table with all columns
3. Use search box to filter alerts by Alert Name, Module, Asset/Endpoint, Attribute, Message, or Acknowledged By
4. Select Severity filter to filter by Critical, Warning, Info, or Clear
5. Select Status filter to filter by Active, Acknowledged, Resolved, or Cleared
6. Select Module filter to filter by Endpoint, Asset, Patch, Vulnerability, Agent, etc.
7. Select Date Range to filter by date range
8. Click column headers to sort alerts (Alert Name, Severity, Status, Module, Value, Created On, Acknowledged At)
9. Adjust pagination (change page size, navigate pages)
10. Click alert name or "View Details" button to view alert details
11. In alert details, review all alert information
12. Click "Acknowledge" button to acknowledge an alert (only for Active alerts)
13. Enter acknowledgment notes (optional)
14. Confirm acknowledgment
15. Verify alert status changes to "Acknowledged"
16. Click "Resolve" button to resolve an alert (for Active or Acknowledged alerts)
17. Enter resolution notes (optional)
18. Confirm resolution
19. Verify alert status changes to "Resolved"
20. Select multiple alerts using checkboxes
21. Perform bulk acknowledge on selected alerts
22. Perform bulk resolve on selected alerts
23. Click on Asset/Endpoint name to navigate to asset/endpoint details
24. Click Timeline button to switch to timeline view
25. Switch between List view and Grid view using view mode toggle
26. Click Export button to download CSV/Excel
27. Click Refresh button to reload data
28. Use column visibility toggle to show/hide columns
29. Click Configure Alert button to configure alert settings
30. Clear all filters to show all alerts
31. Verify new alerts appear at the top (if sorted by Created On descending)

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have acknowledge/resolve permission)
- Verify Alerts page is accessible from main navigation menu/sidebar after login
- Verify Alerts page is a dedicated page (not a sub-page or tab)
- Verify page loads with all alerts displayed, sorted by Created On descending
- Test search functionality:
  - Search by alert name (partial and full match)
  - Search by module (partial and full match)
  - Search by asset/endpoint name (partial and full match)
  - Search by attribute (partial match)
  - Search by message (partial match)
  - Search by acknowledged by (partial and full match)
  - Case-insensitive search
  - Search with no results
  - Clear search to show all alerts
- Test filtering:
  - Filter by Severity (CRITICAL, WARNING, INFO, CLEAR)
  - Filter by Status (Active, Acknowledged, Resolved, Cleared)
  - Filter by Module (Endpoint, Asset, Patch, Vulnerability, Agent, etc.)
  - Filter by organization (if multi-tenant)
  - Filter by branch location
  - Filter by Date Range (select start and end dates)
  - Apply multiple filters simultaneously
  - Reset filters
- Test sorting:
  - Sort by Alert Name (alphabetical sorting)
  - Sort by Severity
  - Sort by Status
  - Sort by Module (alphabetical)
  - Sort by Value (numeric or alphabetical)
  - Sort by Created On (newest/oldest first)
  - Sort by Acknowledged At (newest/oldest first)
  - Verify default sort is Created On descending
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test alert details:
  - Click alert name to view details
  - Click "View Details" button to view details
  - Verify all alert information is displayed correctly
  - Verify asset/endpoint information is shown
  - Verify timeline information is shown
  - Verify related alerts are shown (if applicable)
- Test Acknowledge functionality:
  - Acknowledge single alert with notes
  - Acknowledge single alert without notes
  - Verify alert status changes to "Acknowledged"
  - Verify acknowledger information is recorded
  - Verify timestamp is recorded
  - Verify audit log is created
  - Verify Acknowledge button is disabled for already acknowledged/resolved/cleared alerts
  - Test canceling acknowledgment action
- Test Resolve functionality:
  - Resolve single alert with resolution notes
  - Resolve single alert without resolution notes
  - Verify alert status changes to "Resolved"
  - Verify resolver information is recorded
  - Verify timestamp is recorded
  - Verify audit log is created
  - Verify Resolve button is disabled for already resolved/cleared alerts
  - Test canceling resolve action
- Test bulk operations:
  - Select multiple alerts
  - Perform bulk acknowledge
  - Verify all selected alerts are acknowledged
  - Select multiple alerts
  - Perform bulk resolve
  - Verify all selected alerts are resolved
  - Verify bulk operations show confirmation dialog
  - Test canceling bulk operations
- Test asset/endpoint navigation:
  - Click on Asset/Endpoint name
  - Verify navigation to asset/endpoint details page
  - Test with different asset/endpoint types
- Test Timeline view:
  - Click Timeline button
  - Verify timeline view is displayed
  - Verify alerts are grouped by time periods
  - Verify visual timeline is shown
  - Click on alerts in timeline to view details
  - Switch back to list view
- Test view modes:
  - Switch to Grid view
  - Verify alerts are displayed as cards
  - Verify key information is shown on cards
  - Click on cards to view details
  - Switch back to List view
- Test export functionality:
  - Export all alerts
  - Export filtered/search results
  - Export with date range filter applied
  - Verify CSV/Excel file is downloaded correctly
  - Verify CSV includes correct columns and data
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Test column visibility (if available):
  - Hide/show individual columns
  - Apply column visibility changes
  - Reset column visibility to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify column visibility preferences persist across sessions
- Test column pinning (if available):
  - Pin Alert Name column to left
  - Verify column is pinned correctly
  - Unpin column
  - Verify column returns to normal position
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no alerts exist
  - "No results found" when search returns no matches
- Test date formatting in Created On and Acknowledged At columns
- Test badge colors for Severity and Status columns
- Test Value column display (numeric and text values)
- Test Message column ellipsis and expansion
- Test real-time updates:
  - Verify new alerts appear at the top (if sorted by Created On descending)
  - Verify alert table refreshes periodically or in real-time
  - Verify alert statuses update when alerts are acknowledged/resolved
- Verify table performance with large number of alerts
- Test responsive design (table on different screen sizes)
- Verify user permissions are enforced correctly
- Test error handling:
  - Network errors during actions
  - Validation errors
  - Permission errors
  - Verify appropriate error messages are displayed
- Test alert status workflow:
  - Active → Acknowledged → Resolved
  - Active → Resolved
  - Verify status transitions are correct
  - Verify alerts cannot be acknowledged/resolved if already in that state
- Test Configure Alert button:
  - Click Configure Alert button
  - Verify alert configuration page/modal opens (functionality may be covered in separate user story)

---

### User Story 8: Reports Page Functions

**Story ID:** `US-038`  
**Title:** View and Manage System Reports  
**Priority:** P0 (Critical)  
**Module:** Reports - Report Management

**User Story:**
```
As a system administrator
I want to view, search, filter, create, and manage system reports in a table view
So that I can generate, schedule, and download reports for compliance, analysis, and documentation purposes
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Reports page (accessible from main navigation menu/sidebar)
- [ ] AC2: Reports page displays a table listing all system reports
- [ ] AC3: Table displays the following columns (configurable visibility):
  - Name (sortable, searchable, clickable to view report details)
  - Description (searchable, ellipsis for long text)
  - Type (filterable, searchable, e.g., Patch, Asset, Vulnerability, Compliance, Audit, Custom)
  - Format (filterable, e.g., PDF, CSV, Excel)
  - Status (filterable, color-coded badges: Draft, Generating, Completed, Failed)
  - Schedule (searchable, e.g., "Daily", "Weekly", "Monthly", "None")
  - File Size (sortable, formatted size, e.g., "2.5 MB")
  - Generated At (sortable, formatted date/time, shows when report was generated)
  - Created By (searchable, user email/name)
  - Created On (sortable, formatted date/time)
  - Actions (View, Edit, Download, Delete, Schedule, Send Now)
- [ ] AC4: User can search reports by Name, Description, Type, Schedule, or Created By using a search input field
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: User can filter reports by:
  - Type (via Type column filter dropdown: Patch, Asset, Vulnerability, Compliance, Audit, Custom)
  - Format (via Format column filter dropdown: PDF, CSV, Excel)
  - Status (via Status column filter dropdown: Draft, Generating, Completed, Failed)
  - Schedule (via Schedule column filter dropdown: Daily, Weekly, Monthly, None)
  - Organization (if multi-tenant, via Organization filter dropdown)
  - Branch Location (via Branch Location filter dropdown)
  - Date Range (via Date Range picker: start date and end date for Created On or Generated At)
- [ ] AC7: User can sort reports by:
  - Name (ascending/descending, alphabetical)
  - Type (ascending/descending, alphabetical)
  - Format (ascending/descending, alphabetical)
  - Status (ascending/descending)
  - File Size (ascending/descending, numeric)
  - Generated At (newest/oldest first, date/time)
  - Created On (newest/oldest first, date/time)
- [ ] AC8: By default, reports are sorted by Created On descending (newest first)
- [ ] AC9: User can paginate through reports using table pagination controls
- [ ] AC10: User can view report details by clicking on report name or "View" action button
- [ ] AC11: Report details modal/drawer displays comprehensive report information including:
  - Basic Information: Name, Description, Type, Format, Status
  - Configuration: Filters applied, Columns selected
  - Schedule Information: Frequency, Recipients, Next Run At, Last Run At
  - File Information: File Size, Generated At, Download URL
  - Created Information: Created By, Created On
  - Error Information: Error Message (if status is Failed)
- [ ] AC12: User can create a new report by clicking "Create" button
- [ ] AC13: Create button opens Create Report modal/wizard (functionality may be covered in separate user story)
- [ ] AC14: User can edit an existing report by clicking "Edit" action button
- [ ] AC15: Edit button opens Edit Report modal/wizard (functionality may be covered in separate user story)
- [ ] AC16: User can download a report by clicking "Download" action button or download format tags (PDF, CSV, Excel)
- [ ] AC17: Download button is only available for reports with status "Completed"
- [ ] AC18: Download button is disabled for reports with status "Draft", "Generating", or "Failed"
- [ ] AC19: Download format tags (PDF, CSV, Excel) are clickable and trigger download for that format
- [ ] AC20: Upon clicking download, system downloads the report file with appropriate filename
- [ ] AC21: Filename format: "[Report Name].[format extension]" (e.g., "Patch Status Report.pdf")
- [ ] AC22: User can delete a report by clicking "Delete" action button
- [ ] AC23: Delete button opens Delete Confirmation modal
- [ ] AC24: Delete Confirmation modal displays message: "Are you sure you want to delete this report?"
- [ ] AC25: Delete Confirmation modal shows report information (Name, Type)
- [ ] AC26: Delete Confirmation modal has "Delete" button (primary, destructive) and "Cancel" button
- [ ] AC27: Upon confirming deletion, system deletes the report and associated file (if exists)
- [ ] AC28: System creates audit log entry for deletion action
- [ ] AC29: Success message is displayed after deleting report
- [ ] AC30: Delete Confirmation modal closes after successful deletion
- [ ] AC31: User can schedule a report by clicking "Schedule" action button
- [ ] AC32: Schedule button opens Schedule Report modal (functionality may be covered in separate user story)
- [ ] AC33: Status column displays color-coded badges:
  - Draft=gray
  - Generating=yellow/orange (with loading indicator)
  - Completed=green
  - Failed=red
- [ ] AC34: Type column displays report type (Patch, Asset, Vulnerability, Compliance, Audit, Custom)
- [ ] AC35: Format column displays available download formats (PDF, CSV, Excel) as tags or text
- [ ] AC36: Generated At column displays formatted date and time when report was generated (or "Not generated" for Draft status)
- [ ] AC37: File Size column displays formatted file size (e.g., "2.5 MB", "150 KB") or "N/A" for Draft status
- [ ] AC38: Schedule column displays schedule frequency (Daily, Weekly, Monthly) or "None" if not scheduled
- [ ] AC39: User can use column visibility toggle to show/hide columns
- [ ] AC40: Column visibility preferences are saved and persist across sessions
- [ ] AC41: User can pin/unpin columns (e.g., Name can be pinned to left)
- [ ] AC42: Table displays empty state message when no reports exist
- [ ] AC43: Table shows loading state while fetching report data
- [ ] AC44: Table shows "No results found" message when search/filter returns no matches
- [ ] AC45: Refresh/Reload button reloads report list from server
- [ ] AC46: Table supports export functionality (Export button) to export report list as CSV/Excel
- [ ] AC47: Exported CSV includes all visible columns and filtered/search results
- [ ] AC48: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC49: Page respects user permissions - only users with report view access can view reports
- [ ] AC50: Report table updates in real-time or refreshes periodically to show status changes
- [ ] AC51: Reports with status "Generating" show progress indicator or refresh automatically until completed
- [ ] AC52: User can regenerate a report by clicking "Regenerate" action button (if available)
- [ ] AC53: Regenerate button is available for reports with status "Completed" or "Failed"
- [ ] AC54: Regenerate button triggers report generation process and updates status to "Generating"
- [ ] AC55: User can preview report data by clicking "Preview" action button (if available)
- [ ] AC56: Preview button opens Report Preview modal showing sample data or report preview
- [ ] AC57: User can send a report to target users via email by clicking "Send Now" action button
- [ ] AC58: Send Now button is only available for reports with status "Completed"
- [ ] AC59: Send Now button is disabled for reports with status "Draft", "Generating", or "Failed"
- [ ] AC60: Send Now button opens Send Report modal (functionality covered in separate user story - US-XXX)

**Test Data:**
```json
{
  "reports": [
    {
      "id": "report-001",
      "name": "Patch Status Report",
      "description": "Comprehensive report of patch status across all endpoints",
      "type": "patch",
      "format": "PDF",
      "status": "completed",
      "fileSize": 2457600,
      "fileSizeFormatted": "2.5 MB",
      "filePath": "/reports/report-001.pdf",
      "fileUrl": "/v1/reports/report-001/download",
      "generatedAt": "2024-01-20T14:30:25Z",
      "schedule": {
        "frequency": "weekly",
        "recipients": ["admin@example.com", "manager@example.com"],
        "nextRunAt": "2024-01-27T02:00:00Z",
        "lastRunAt": "2024-01-20T02:00:00Z"
      },
      "filters": {
        "severity": ["CRITICAL", "High"],
        "os": ["Windows"],
        "status": ["Missing", "Installed"]
      },
      "columns": ["patchId", "software", "severity", "status", "affectedEndpoints"],
      "createdBy": "admin@example.com",
      "createdOn": "2024-01-15T10:00:00Z"
    },
    {
      "id": "report-002",
      "name": "Asset Inventory Report",
      "description": "Complete inventory of all assets in the system",
      "type": "asset",
      "format": "Excel",
      "status": "completed",
      "fileSize": 1048576,
      "fileSizeFormatted": "1.0 MB",
      "filePath": "/reports/report-002.xlsx",
      "fileUrl": "/v1/reports/report-002/download",
      "generatedAt": "2024-01-19T16:45:30Z",
      "schedule": {
        "frequency": "monthly",
        "recipients": ["admin@example.com"],
        "nextRunAt": "2024-02-01T02:00:00Z",
        "lastRunAt": "2024-01-01T02:00:00Z"
      },
      "filters": {
        "category": ["Server", "Workstation"],
        "status": ["Active"]
      },
      "columns": ["assetId", "name", "category", "status", "osType", "ipAddress"],
      "createdBy": "admin@example.com",
      "createdOn": "2024-01-10T09:00:00Z"
    },
    {
      "id": "report-003",
      "name": "Vulnerability Summary Report",
      "description": "Summary of all vulnerabilities detected in the system",
      "type": "vulnerability",
      "format": "PDF",
      "status": "generating",
      "fileSize": null,
      "fileSizeFormatted": null,
      "filePath": null,
      "fileUrl": null,
      "generatedAt": null,
      "schedule": null,
      "filters": {
        "severity": ["CRITICAL", "High"],
        "exploitable": true
      },
      "columns": ["cveId", "title", "severity", "cvssScore", "affectedAssets"],
      "createdBy": "operator@example.com",
      "createdOn": "2024-01-20T15:00:00Z"
    },
    {
      "id": "report-004",
      "name": "Compliance Report",
      "description": "Compliance status report for all assets",
      "type": "compliance",
      "format": "CSV",
      "status": "draft",
      "fileSize": null,
      "fileSizeFormatted": null,
      "filePath": null,
      "fileUrl": null,
      "generatedAt": null,
      "schedule": null,
      "filters": {},
      "columns": [],
      "createdBy": "admin@example.com",
      "createdOn": "2024-01-20T12:00:00Z"
    },
    {
      "id": "report-005",
      "name": "Audit Log Report",
      "description": "Complete audit log report for the past month",
      "type": "audit",
      "format": "PDF",
      "status": "failed",
      "fileSize": null,
      "fileSizeFormatted": null,
      "filePath": null,
      "fileUrl": null,
      "generatedAt": null,
      "errorMessage": "Report generation failed: Insufficient data",
      "schedule": null,
      "filters": {
        "dateRange": {
          "start": "2024-01-01T00:00:00Z",
          "end": "2024-01-31T23:59:59Z"
        }
      },
      "columns": ["timestamp", "user", "action", "resource", "status"],
      "createdBy": "admin@example.com",
      "createdOn": "2024-01-18T10:00:00Z"
    }
  ],
  "filters": {
    "type": ["patch", "asset", "vulnerability", "compliance", "audit", "custom"],
    "format": ["PDF", "CSV", "Excel"],
    "status": ["draft", "generating", "completed", "failed"],
    "schedule": ["daily", "weekly", "monthly", "none"]
  },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50
  }
}
```

**API Endpoints:**
- `GET /v1/reports` - Get list of reports with filtering, sorting, and pagination
  - Query Parameters:
    - `type` (optional): Filter by type (patch, asset, vulnerability, compliance, audit, custom)
    - `format` (optional): Filter by format (PDF, CSV, Excel)
    - `status` (optional): Filter by status (draft, generating, completed, failed)
    - `search` (optional): Search by Name, Description, Type, Schedule, Created By
    - `organizationId` (optional): Filter by organization
    - `branchId` (optional): Filter by branch location
    - `startDate` (optional): Filter by start date (ISO 8601 format)
    - `endDate` (optional): Filter by end date (ISO 8601 format)
    - `sortBy` (optional): Sort field (name, type, format, status, fileSize, generatedAt, createdOn)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 20)
  - Response: Paginated list of reports with metadata
- `GET /v1/reports/:id` - Get report details by ID
  - Response: Detailed report information including configuration, schedule, file information
- `GET /v1/reports/:id/download` - Download report file
  - Query Parameters:
    - `format` (optional): Download format (PDF, CSV, Excel) - if report supports multiple formats
  - Response: Report file download
- `POST /v1/reports` - Create a new report (functionality may be covered in separate user story)
  - Request Body: Report creation data
  - Response: Created report object
- `PUT /v1/reports/:id` - Update a report (functionality may be covered in separate user story)
  - Request Body: Report update data
  - Response: Updated report object
- `DELETE /v1/reports/:id` - Delete a report
  - Response: Success message
- `POST /v1/reports/:id/regenerate` - Regenerate a report
  - Response: Report with status updated to "generating"
- `GET /v1/reports/:id/preview` - Preview report data (sample data)
  - Query Parameters:
    - `limit` (optional): Number of sample rows (default: 10)
  - Response: Sample report data
- `GET /v1/reports/export` - Export report list to CSV/Excel
  - Query Parameters: Same as GET /v1/reports
  - Response: CSV/Excel file download
- `POST /v1/reports/:id/send` - Send report to target users via email (functionality covered in separate user story - US-XXX)
  - Request Body: Send report data (recipients, email configuration, etc.)
  - Response: Success message

**UI Components:**
- Page: `/reports` (Reports.tsx)
- Components:
  - **Page Header:**
    - Page title "Reports"
    - Breadcrumb navigation: Reports (accessible directly from main navigation)
  - **Table Header:**
    - Search input field (with SearchOutlined icon)
    - Filter dropdowns:
      - Type filter (Select dropdown)
      - Format filter (Select dropdown)
      - Status filter (Select dropdown)
      - Schedule filter (Select dropdown)
      - Organization filter (Select dropdown, if multi-tenant)
      - Branch Location filter (Select dropdown)
    - Date Range picker (RangePicker component)
    - Export button (DownloadOutlined icon) - exports report list to CSV/Excel
    - Refresh button (ReloadOutlined icon) - reloads data
    - Create button (PlusOutlined icon, primary) - opens Create Report modal/wizard
    - Column visibility toggle button (EyeOutlined icon, optional)
  - **Table:**
    - Columns: Name, Description, Type, Format, Status, Schedule, File Size, Generated At, Created By, Created On, Actions
    - Sortable columns: Name, Type, Format, Status, File Size, Generated At, Created On
    - Filterable columns: Type, Format, Status, Schedule
    - Searchable columns: Name, Description, Type, Schedule, Created By
    - Clickable report name (opens details modal/drawer)
    - Actions column: View button, Edit button, Download button (or format tags), Delete button, Schedule button, Send Now button, Regenerate button (if applicable), Preview button (if applicable)
    - Color-coded status badges
    - Download format tags (PDF, CSV, Excel) - clickable
  - **Column Visibility Modal (optional):**
    - Checkboxes for each column
    - Apply button
    - Reset button (restores all columns)
  - **Report Details Modal/Drawer:**
    - Comprehensive report information display
    - Tabs or sections: Basic Info, Configuration, Schedule, File Info, Created Info, Error Info (if failed)
    - Download button (if status is Completed)
    - Send Now button (if status is Completed) - opens Send Report modal (functionality covered in separate user story)
    - Regenerate button (if status is Completed or Failed)
    - Close button
  - **Send Report Modal (functionality covered in separate user story - US-XXX):**
    - Opens when Send Now button is clicked
    - Allows user to select target recipients and send report via email
  - **Delete Confirmation Modal:**
    - Title: "Delete Report"
    - Message: "Are you sure you want to delete this report?"
    - Report information display (Name, Type)
    - Action buttons: Delete (primary, destructive), Cancel (default)
    - Loading state while deleting
    - Success/error messages
  - **Download Format Selection (if report supports multiple formats):**
    - Dropdown or menu showing available formats
    - User selects format and downloads
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no reports exist
  - **No Results State:** Message when search/filter returns no matches
  - **Generating Status Indicator:** Reports with status "Generating" show loading spinner or progress indicator

**User Actions:**
1. Navigate to Reports page from main navigation menu/sidebar
2. View reports table with all columns
3. Use search box to filter reports by Name, Description, Type, Schedule, or Created By
4. Select Type filter to filter by Patch, Asset, Vulnerability, Compliance, Audit, or Custom
5. Select Format filter to filter by PDF, CSV, or Excel
6. Select Status filter to filter by Draft, Generating, Completed, or Failed
7. Select Schedule filter to filter by Daily, Weekly, Monthly, or None
8. Select Date Range to filter by date range
9. Click column headers to sort reports (Name, Type, Format, Status, File Size, Generated At, Created On)
10. Adjust pagination (change page size, navigate pages)
11. Click report name or "View" button to view report details
12. In report details, review all report information including configuration and schedule
13. Click "Create" button to create a new report (opens Create Report modal/wizard)
14. Click "Edit" button to edit an existing report (opens Edit Report modal/wizard)
15. Click "Download" button or format tag (PDF, CSV, Excel) to download report
16. Verify report file is downloaded with correct filename
17. Click "Delete" button to delete a report
18. Confirm deletion in Delete Confirmation modal
19. Verify report is deleted successfully
20. Click "Schedule" button to schedule a report (opens Schedule Report modal)
21. Click "Send Now" button to send report to target users via email (opens Send Report modal - functionality covered in separate user story)
22. Verify Send Now button is only available for reports with status "Completed"
23. Verify Send Now button is disabled for Draft, Generating, or Failed reports
24. Click "Regenerate" button to regenerate a report (if available)
25. Click "Preview" button to preview report data (if available)
26. Click Export button to download report list as CSV/Excel
27. Click Refresh button to reload data
28. Use column visibility toggle to show/hide columns
29. Clear all filters to show all reports
30. Verify reports with status "Generating" show progress indicator
31. Verify reports with status "Generating" refresh automatically until completed

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have create/edit/delete permission)
- Verify Reports page is accessible from main navigation menu/sidebar
- Verify page loads with all reports displayed, sorted by Created On descending
- Test search functionality:
  - Search by report name (partial and full match)
  - Search by description (partial match)
  - Search by type (partial and full match)
  - Search by schedule (partial match)
  - Search by created by (partial and full match)
  - Case-insensitive search
  - Search with no results
  - Clear search to show all reports
- Test filtering:
  - Filter by Type (Patch, Asset, Vulnerability, Compliance, Audit, Custom)
  - Filter by Format (PDF, CSV, Excel)
  - Filter by Status (Draft, Generating, Completed, Failed)
  - Filter by Schedule (Daily, Weekly, Monthly, None)
  - Filter by organization (if multi-tenant)
  - Filter by branch location
  - Filter by Date Range (select start and end dates)
  - Apply multiple filters simultaneously
  - Reset filters
- Test sorting:
  - Sort by Name (alphabetical sorting)
  - Sort by Type (alphabetical)
  - Sort by Format (alphabetical)
  - Sort by Status
  - Sort by File Size (numeric sorting)
  - Sort by Generated At (newest/oldest first)
  - Sort by Created On (newest/oldest first)
  - Verify default sort is Created On descending
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test report details:
  - Click report name to view details
  - Click "View" button to view details
  - Verify all report information is displayed correctly
  - Verify configuration (filters, columns) is shown
  - Verify schedule information is shown
  - Verify file information is shown
  - Verify error message is shown for failed reports
- Test download functionality:
  - Download report with status "Completed"
  - Verify download button is enabled for completed reports
  - Verify download button is disabled for Draft, Generating, or Failed reports
  - Click PDF format tag to download as PDF
  - Click CSV format tag to download as CSV
  - Click Excel format tag to download as Excel
  - Verify file is downloaded with correct filename format
  - Verify file content is correct
  - Test with reports that support multiple formats
- Test delete functionality:
  - Delete single report
  - Verify Delete Confirmation modal opens
  - Confirm deletion
  - Verify report is deleted successfully
  - Verify associated file is deleted (if exists)
  - Verify audit log is created
  - Test canceling deletion action
- Test regenerate functionality:
  - Regenerate report with status "Completed"
  - Regenerate report with status "Failed"
  - Verify report status changes to "Generating"
  - Verify report generation process starts
  - Verify status updates automatically when generation completes
- Test preview functionality (if available):
  - Click Preview button
  - Verify report preview modal opens
  - Verify sample data is displayed
  - Verify preview shows correct columns and data
- Test create functionality:
  - Click Create button
  - Verify Create Report modal/wizard opens (functionality may be covered in separate user story)
- Test edit functionality:
  - Click Edit button
  - Verify Edit Report modal/wizard opens (functionality may be covered in separate user story)
- Test schedule functionality:
  - Click Schedule button
  - Verify Schedule Report modal opens (functionality may be covered in separate user story)
- Test Send Now functionality:
  - Click Send Now button for a completed report
  - Verify Send Now button is enabled for completed reports
  - Verify Send Now button is disabled for Draft, Generating, or Failed reports
  - Verify Send Report modal opens (functionality covered in separate user story - US-XXX)
  - Note: Detailed Send Report functionality (selecting recipients, email configuration, etc.) will be covered in a separate user story
- Test status indicators:
  - Verify Draft status shows gray badge
  - Verify Generating status shows yellow/orange badge with loading indicator
  - Verify Completed status shows green badge
  - Verify Failed status shows red badge
  - Verify Generating reports refresh automatically until completed
- Test file size display:
  - Verify file size is formatted correctly (MB, KB)
  - Verify "N/A" is shown for Draft status
  - Verify file size is shown for Completed reports
- Test schedule display:
  - Verify schedule frequency is displayed (Daily, Weekly, Monthly)
  - Verify "None" is shown for unscheduled reports
- Test export functionality:
  - Export all reports
  - Export filtered/search results
  - Verify CSV/Excel file is downloaded correctly
  - Verify CSV includes correct columns and data
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Test column visibility (if available):
  - Hide/show individual columns
  - Apply column visibility changes
  - Reset column visibility to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify column visibility preferences persist across sessions
- Test column pinning (if available):
  - Pin Name column to left
  - Verify column is pinned correctly
  - Unpin column
  - Verify column returns to normal position
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
  - Generating reports show progress indicator
- Verify empty states:
  - Empty state when no reports exist
  - "No results found" when search returns no matches
- Test date formatting in Generated At and Created On columns
- Test badge colors for Status column
- Test file size formatting
- Test real-time updates:
  - Verify report table refreshes periodically or in real-time
  - Verify Generating reports update status automatically when generation completes
  - Verify Failed reports show error message
- Verify table performance with large number of reports
- Test responsive design (table on different screen sizes)
- Verify user permissions are enforced correctly
- Test error handling:
  - Network errors during actions
  - Validation errors
  - Permission errors
  - Download errors (file not found, file corrupted)
  - Verify appropriate error messages are displayed
- Test report generation workflow:
  - Create a new report
  - Verify status changes from Draft to Generating
  - Verify status changes to Completed when generation finishes
  - Verify file is available for download
  - Test failed generation scenario
  - Verify error message is displayed for failed reports

---

### User Story 9: Report Page Actions

**Story ID:** `US-039`  
**Title:** Create, Edit, Schedule, and Send Reports  
**Priority:** P0 (Critical)  
**Module:** Reports - Report Actions

**User Story:**
```
As a system administrator
I want to create, edit, schedule, and send reports via email
So that I can generate customized reports, configure automatic report generation schedules, and distribute reports to stakeholders efficiently
```

**Acceptance Criteria:**

#### Create Report

- [ ] AC1: User can create a new report by clicking "Create" button on Reports page
- [ ] AC2: Create button opens Create Report modal/wizard
- [ ] AC3: Create Report wizard has 3 steps:
  - Step 1: Select Report Type and Name
  - Step 2: Configure Filters and Columns
  - Step 3: Select Format and Schedule (optional)
- [ ] AC4: Step 1 (Select Type and Name):
  - User must select Report Type from dropdown (Patch, Asset, Vulnerability, Compliance, Audit, Custom)
  - User must enter Report Name (required field, max 255 characters)
  - User can optionally enter Description
  - "Next" button is enabled when Type and Name are provided
  - "Cancel" button closes the wizard and returns to Reports page
- [ ] AC5: Upon completing Step 1, system creates a draft report and returns available columns and filters for the selected report type
- [ ] AC6: Step 2 (Configure Report Content):
  - User must select Report Format Type: Graphical Report or Tabular Report (required, radio buttons or toggle)
  - User must select Timeline (mandatory field, Date Range picker)
  - **If Graphical Report is selected:**
    - User sees "Add Widget" dropdown button with 2 options:
      - "Create New Widget"
      - "Add Existing Widget"
    - **If "Add Existing Widget" is selected:**
      - Popup/modal opens showing all pre-existing widgets
      - User can select one or more widgets (checkboxes or multi-select)
      - User clicks "Add Widget" button
      - Selected widgets appear in Report Preview section
      - User can align widgets (drag and drop)
      - User can resize widgets (drag corners/edges)
      - User can delete widgets from preview (delete button/icon on each widget)
    - **If "Create New Widget" is selected:**
      - User sees all available widget types (e.g., Chart Widget, Table Widget, Summary Widget, Metric Widget)
      - User selects a widget type
      - User sees filter settings for that widget based on which data will be populated
      - User configures filter settings for the widget
      - User clicks "Add Widget" button
      - Widget appears in Report Preview section with configured data
      - User can align, drag, and resize the widget
      - User can delete the widget from preview
    - Report Preview section is scaled for A4 size page (210mm x 297mm or equivalent pixels)
    - User can adjust widgets to fit A4 page layout
    - User can see visual grid/guides for A4 page boundaries
  - **If Tabular Report is selected:**
    - System displays all available columns based on selected report type
    - User can select columns to include in the report (checkboxes or multi-select)
    - Selected columns are shown in Report Preview section
    - User can reorder columns (drag and drop)
    - User can remove columns from preview
  - "Back" button returns to Step 1
  - "Next" button proceeds to Step 3
  - "Cancel" button closes the wizard
- [ ] AC7: Step 3 (Settings, Format, and Schedule):
  - **Report Logo:**
    - Report automatically includes organization logo (uploaded in system settings)
    - Logo is displayed in report preview
    - Logo appears at top of generated report
  - **Report Visibility (Public/Private):**
    - User can select whether report is Public or Private (radio buttons or toggle)
    - **If Public is selected:**
      - Anyone can access the report
      - No additional access configuration needed
    - **If Private is selected:**
      - User must configure access permissions
      - User can select which Organization(s) can access the report (multi-select)
      - User can select which Branch(es) can access the report (multi-select)
      - User can select which Department(s) can access the report (multi-select)
      - User can select which Role(s) can access the report (multi-select)
      - User can select which User(s) can access the report (multi-select)
      - At least one access option must be selected (Organization, Branch, Department, Role, or User)
  - **Export Format:**
    - **If Graphical Report is selected:**
      - User can select export format: PDF or Word (radio buttons or dropdown)
      - Both formats are available for graphical reports
    - **If Tabular Report is selected:**
      - User can select export format: Excel or CSV (radio buttons or dropdown)
      - Both formats are available for tabular reports
  - **Schedule Toggle:**
    - User can optionally enable Schedule toggle
    - If Schedule is enabled:
      - User must select Frequency (Daily, Weekly, Monthly) - required
      - User can select Time (HH:mm format, e.g., "09:00", "14:30") - optional
      - For Weekly frequency: User must select Day of Week (0-6, where 0=Sunday) - required
      - For Monthly frequency: User must select Day of Month (1-31) - required
      - User must enter at least one Target email address (required, valid email format)
      - User can add multiple target email addresses (email addresses separated by comma or multi-select)
  - "Back" button returns to Step 2
  - "Cancel" button closes the wizard
  - "Create" button creates the report and starts generation (if schedule is not enabled)
- [ ] AC8: Upon completing Step 3, system creates the report with status "Draft" or "Generating"
- [ ] AC9: If schedule is enabled, system creates a scheduled report linked to the report
- [ ] AC10: System calculates and sets Next Run At date/time based on schedule configuration
- [ ] AC11: Success message is displayed after report creation
- [ ] AC12: User is redirected to Reports page after successful creation
- [ ] AC13: Report appears in Reports table with appropriate status
- [ ] AC14: System validates all required fields at each step
- [ ] AC15: System displays validation errors for invalid inputs (e.g., invalid email format, invalid date range)
- [ ] AC16: User can navigate between wizard steps using "Back" and "Next" buttons
- [ ] AC17: Wizard maintains state when navigating between steps (user input is preserved)
- [ ] AC18: Wizard shows progress indicator (e.g., "Step 1 of 3", "Step 2 of 3", "Step 3 of 3")
- [ ] AC18a: Report Preview section in Step 2 displays widgets/columns in A4 page layout (scaled appropriately)
- [ ] AC18b: User can drag and drop widgets to reposition them in Report Preview
- [ ] AC18c: User can resize widgets by dragging corners or edges in Report Preview
- [ ] AC18d: User can delete widgets from Report Preview by clicking delete button/icon
- [ ] AC18e: Widget alignment is maintained when user saves or navigates between steps
- [ ] AC18f: System validates that at least one widget is added for Graphical Report before proceeding to Step 3
- [ ] AC18g: System validates that at least one column is selected for Tabular Report before proceeding to Step 3
- [ ] AC18h: Timeline field is mandatory and must be selected before proceeding to Step 3
- [ ] AC18i: Organization logo is automatically included in report (no user action required)
- [ ] AC18j: If Private report is selected, at least one access option (Organization, Branch, Department, Role, or User) must be selected
- [ ] AC18k: Export format options are dynamically shown based on report format type (Graphical: PDF/Word, Tabular: Excel/CSV)

#### Edit Report

- [ ] AC19: User can edit an existing report by clicking "Edit" action button on Reports page
- [ ] AC20: Edit button opens Edit Report modal/wizard
- [ ] AC21: Edit Report wizard has same 3 steps as Create Report wizard
- [ ] AC22: Edit Report wizard is pre-populated with existing report configuration:
  - Step 1: Report Type, Name, Description
  - Step 2: Report Format Type (Graphical/Tabular), Timeline, Widgets/Columns, Preview
  - Step 3: Logo, Visibility (Public/Private), Access Permissions, Export Format, Schedule
- [ ] AC23: User can modify any report configuration in any step
- [ ] AC24: User can change Report Type (if allowed, may require confirmation if it affects filters/columns)
- [ ] AC25: User can update Report Name and Description
- [ ] AC26: User can update Filters and Columns
- [ ] AC27: User can update Report Format
- [ ] AC28: User can enable/disable Schedule
- [ ] AC29: User can update Schedule configuration (Frequency, Time, Day of Week/Month, Recipients)
- [ ] AC30: "Save" button (instead of "Create") saves changes and updates the report
- [ ] AC31: If report status is "Completed" and user changes filters/columns/format, system may regenerate the report
- [ ] AC32: If report status is "Generating", Edit may be disabled or show appropriate message
- [ ] AC33: Success message is displayed after report update
- [ ] AC34: User is redirected to Reports page after successful update
- [ ] AC35: Updated report appears in Reports table with updated information
- [ ] AC36: System validates all required fields and displays validation errors
- [ ] AC37: System creates audit log entry for report update

#### Print Report

- [ ] AC37a: User can print a report by clicking "Print" action button on Reports page
- [ ] AC37b: Print button is available for all reports with status "Completed"
- [ ] AC37c: Print button is disabled for reports with status "Draft", "Generating", or "Failed"
- [ ] AC37d: Upon clicking Print button, system opens browser print dialog
- [ ] AC37e: Print dialog shows report in print-friendly format
- [ ] AC37f: Report includes organization logo in print output
- [ ] AC37g: User can configure print settings (margins, orientation, page size) via browser print dialog
- [ ] AC37h: Graphical reports are printed with widgets in their configured layout
- [ ] AC37i: Tabular reports are printed with selected columns in table format

#### Schedule Report

- [ ] AC38: User can schedule a report by clicking "Schedule" action button on Reports page
- [ ] AC38a: Schedule button is only available for reports that are NOT already scheduled
- [ ] AC38b: Schedule button is disabled/hidden for reports that already have a schedule configured
- [ ] AC39: Schedule button opens Schedule Report modal
- [ ] AC40: Schedule Report modal displays:
  - Report Name (read-only)
  - Report Type (read-only)
  - Enable Schedule toggle (checkbox or switch)
  - Frequency dropdown (Daily, Weekly, Monthly) - required if schedule enabled
  - Time picker/input (HH:mm format, e.g., "09:00", "14:30") - optional
  - Day of Week selector (for Weekly frequency) - required if Weekly selected
  - Day of Month selector (for Monthly frequency) - required if Monthly selected
  - Recipients input (multi-select or comma-separated email addresses) - required if schedule enabled
  - Next Run At display (calculated based on schedule, read-only)
- [ ] AC41: If report already has a schedule, modal is pre-populated with existing schedule configuration
- [ ] AC42: User can enable Schedule by toggling Enable Schedule switch
- [ ] AC43: When Schedule is enabled, Frequency field becomes required
- [ ] AC44: When Frequency is "Weekly", Day of Week field becomes required and visible
- [ ] AC45: When Frequency is "Monthly", Day of Month field becomes required and visible
- [ ] AC46: User must enter at least one Recipient email address (required, valid email format)
- [ ] AC47: User can add multiple recipients (email addresses)
- [ ] AC48: System validates email addresses (must be valid email format)
- [ ] AC49: System calculates Next Run At based on:
  - Current date/time
  - Selected Frequency
  - Selected Time (if provided, otherwise uses default time)
  - Selected Day of Week (for Weekly)
  - Selected Day of Month (for Monthly)
- [ ] AC50: Next Run At is displayed in the modal (formatted date/time)
- [ ] AC51: "Save" button saves schedule configuration
- [ ] AC52: "Cancel" button closes modal without saving
- [ ] AC53: If schedule is enabled and saved, system creates or updates ScheduledReport record
- [ ] AC54: If schedule is disabled, system deactivates or removes schedule
- [ ] AC55: Success message is displayed after saving schedule
- [ ] AC56: Schedule information is updated in Reports table (Schedule column shows frequency or "None")
- [ ] AC57: System creates audit log entry for schedule creation/update
- [ ] AC58: Scheduled reports are automatically generated and sent to recipients at scheduled times

#### Send Now

- [ ] AC59: User can send a report to target users via email by clicking "Send Now" action button
- [ ] AC60: Send Now button is only available for reports with status "Completed"
- [ ] AC61: Send Now button is disabled for reports with status "Draft", "Generating", or "Failed"
- [ ] AC62: Send Now button opens Send Report modal
- [ ] AC63: Send Report modal displays:
  - Report Name (read-only)
  - Report Type (read-only)
  - Report Format (read-only)
  - Recipients input (multi-select or comma-separated email addresses) - required
  - Subject input (optional, pre-filled with default subject like "Report: [Report Name]")
  - Message/Notes textarea (optional, for email body)
  - Attachment format selector (if report supports multiple formats: PDF, CSV, Excel)
- [ ] AC64: User must enter at least one Recipient email address (required, valid email format)
- [ ] AC65: User can add multiple recipients (email addresses)
- [ ] AC66: System validates email addresses (must be valid email format)
- [ ] AC67: If report supports multiple formats, user can select which format to send (PDF, CSV, Excel)
- [ ] AC68: Default format is the report's configured format
- [ ] AC69: "Send" button sends the report via email
- [ ] AC70: "Cancel" button closes modal without sending
- [ ] AC71: Upon clicking "Send", system:
  - Validates recipients
  - Generates email with report attachment
  - Sends email to all recipients
  - Creates audit log entry for send action
- [ ] AC72: Success message is displayed after successful send (e.g., "Report sent successfully to [N] recipients")
- [ ] AC73: Error message is displayed if send fails (e.g., "Failed to send report: [error message]")
- [ ] AC74: Send Report modal closes after successful send
- [ ] AC75: Email includes:
  - Subject (user-provided or default)
  - Body/Message (user-provided or default)
  - Report file as attachment (in selected format)
- [ ] AC76: System handles email sending errors gracefully and displays appropriate error messages
- [ ] AC77: System creates audit log entry for send action with recipient list

**Test Data:**
```json
{
  "createReportStep1": {
    "type": "patch",
    "name": "Monthly Patch Status Report",
    "description": "Comprehensive patch status report for January 2024"
  },
  "createReportStep2Graphical": {
    "reportFormatType": "graphical",
    "timeline": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "widgets": [
      {
        "id": "widget-001",
        "type": "chart",
        "name": "Patch Status Chart",
        "position": { "x": 0, "y": 0, "width": 400, "height": 300 },
        "filters": {
          "severity": ["CRITICAL", "High"],
          "os": ["Windows"]
        }
      },
      {
        "id": "widget-002",
        "type": "summary",
        "name": "Patch Summary",
        "position": { "x": 420, "y": 0, "width": 300, "height": 200 },
        "filters": {}
      }
    ]
  },
  "createReportStep2Tabular": {
    "reportFormatType": "tabular",
    "timeline": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "columns": ["patchId", "software", "severity", "status", "affectedEndpoints", "installedEndpoints"]
  },
  "createReportStep3Graphical": {
    "logo": "organization-logo.png",
    "visibility": "public",
    "exportFormat": "PDF",
    "schedule": {
      "enabled": true,
      "frequency": "monthly",
      "dayOfMonth": 1,
      "time": "08:00",
      "recipients": ["admin@example.com", "manager@example.com", "security@example.com"]
    }
  },
  "createReportStep3Tabular": {
    "logo": "organization-logo.png",
    "visibility": "private",
    "accessPermissions": {
      "organizations": ["org-001"],
      "branches": ["branch-001", "branch-002"],
      "departments": ["dept-001"],
      "roles": ["admin", "manager"],
      "users": ["user-001"]
    },
    "exportFormat": "Excel",
    "schedule": {
      "enabled": false
    }
  },
  "availableWidgets": [
    { "id": "chart", "name": "Chart Widget", "type": "chart" },
    { "id": "table", "name": "Table Widget", "type": "table" },
    { "id": "summary", "name": "Summary Widget", "type": "summary" },
    { "id": "metric", "name": "Metric Widget", "type": "metric" }
  ],
  "existingWidgets": [
    {
      "id": "existing-widget-001",
      "name": "Monthly Patch Chart",
      "type": "chart",
      "filters": { "severity": ["CRITICAL"] }
    },
    {
      "id": "existing-widget-002",
      "name": "Asset Summary",
      "type": "summary",
      "filters": {}
    }
  ],
  "editReport": {
    "name": "Updated Monthly Patch Status Report",
    "description": "Updated description",
    "filters": {
      "severity": ["CRITICAL", "High", "Medium"]
    },
    "columns": ["patchId", "software", "severity", "status", "affectedEndpoints"],
    "format": "Excel",
    "schedule": {
      "enabled": true,
      "frequency": "weekly",
      "dayOfWeek": 1,
      "time": "09:00",
      "recipients": ["admin@example.com"]
    }
  },
  "scheduleReport": {
    "enabled": true,
    "frequency": "daily",
    "time": "02:00",
    "recipients": ["admin@example.com", "operator@example.com"]
  },
  "scheduleReportWeekly": {
    "enabled": true,
    "frequency": "weekly",
    "dayOfWeek": 1,
    "time": "08:00",
    "recipients": ["admin@example.com"]
  },
  "scheduleReportMonthly": {
    "enabled": true,
    "frequency": "monthly",
    "dayOfMonth": 15,
    "time": "10:00",
    "recipients": ["admin@example.com", "manager@example.com"]
  },
  "sendReport": {
    "recipients": ["admin@example.com", "manager@example.com", "security@example.com"],
    "subject": "Monthly Patch Status Report - January 2024",
    "message": "Please find attached the monthly patch status report for January 2024.",
    "format": "PDF"
  },
  "availableColumns": {
    "patch": ["patchId", "software", "category", "severity", "os", "status", "releaseDate", "kbNumber", "affectedEndpoints", "installedEndpoints", "pendingEndpoints", "failedEndpoints"],
    "asset": ["assetId", "name", "category", "subCategory", "status", "operationalStatus", "osType", "osVersion", "ipAddress", "lastSeen"],
    "vulnerability": ["cve", "severity", "epss", "riskScore", "cvss3BaseScore", "exploitable", "endpoints", "affectedSoftwares", "published"],
    "compliance": ["assetName", "complianceScore", "patchesInstalled", "patchesPending", "patchesFailed", "criticalVulnerabilities", "highVulnerabilities", "lastAuditDate"],
    "audit": ["timestamp", "module", "operation", "user", "status", "message", "ipAddress"]
  },
  "availableFilters": {
    "patch": ["severity", "os", "status", "category", "dateRange"],
    "asset": ["category", "status", "operationalStatus", "osType"],
    "vulnerability": ["severity", "exploitable", "riskScoreRange", "cvssRange", "publishedDateRange"],
    "compliance": ["complianceScoreRange", "auditDateRange"],
    "audit": ["module", "operation", "user", "status", "dateRange"]
  }
}
```

**API Endpoints:**
- `POST /v1/reports` - Create report (wizard mode or simple mode)
  - Wizard Mode (Step 1):
    - Request Body: `{ "step": 1, "data": { "type": "patch", "name": "Report Name", "description": "Optional description" } }`
    - Response: `{ "reportId": "uuid", "availableColumns": [...], "availableFilters": [...] }`
  - Wizard Mode (Step 2):
    - **For Graphical Report:**
      - Request Body: `{ "step": 2, "reportId": "uuid", "data": { "reportFormatType": "graphical", "timeline": { "start": "2024-01-01", "end": "2024-01-31" }, "widgets": [{ "id": "widget-001", "type": "chart", "position": { "x": 0, "y": 0, "width": 400, "height": 300 }, "filters": {...} }] } }`
      - Response: `{ "reportId": "uuid", "preview": { "widgets": [...], "a4Layout": {...} } }`
    - **For Tabular Report:**
      - Request Body: `{ "step": 2, "reportId": "uuid", "data": { "reportFormatType": "tabular", "timeline": { "start": "2024-01-01", "end": "2024-01-31" }, "columns": ["column1", "column2", ...] } }`
      - Response: `{ "reportId": "uuid", "preview": { "rowCount": 150, "sampleData": [...] } }`
  - Wizard Mode (Step 3):
    - Request Body: `{ "step": 3, "reportId": "uuid", "data": { "logo": "organization-logo.png", "visibility": "public|private", "accessPermissions": { "organizations": [...], "branches": [...], "departments": [...], "roles": [...], "users": [...] }, "exportFormat": "PDF|Word|Excel|CSV", "schedule": {...} } }`
    - Response: `{ "id": "uuid", "name": "Report Name", "status": "generating", "message": "Report generation started" }`
  - Simple Mode:
    - Request Body: `{ "name": "Report Name", "type": "patch", "format": "PDF", "filters": {...}, "columns": [...], "schedule": {...} }`
    - Response: Created report object
- `PUT /v1/reports/:id` - Update report
  - Request Body: `{ "name": "Updated Name", "description": "Updated description", "filters": {...}, "columns": [...], "format": "Excel", "schedule": {...} }`
  - Response: Updated report object
- `GET /v1/reports/:id` - Get report details (used for editing)
  - Response: Detailed report object with all configuration
- `POST /v1/reports/:id/schedule` - Create or update report schedule
  - Request Body: `{ "enabled": true, "frequency": "daily", "time": "02:00", "recipients": ["email@example.com"] }`
  - Response: Schedule object with nextRunAt calculated
- `PUT /v1/reports/:id/schedule` - Update report schedule
  - Request Body: `{ "enabled": true, "frequency": "weekly", "dayOfWeek": 1, "time": "08:00", "recipients": ["email@example.com"] }`
  - Response: Updated schedule object
- `DELETE /v1/reports/:id/schedule` - Delete/disable report schedule
  - Response: Success message
- `POST /v1/reports/:id/send` - Send report via email
  - Request Body: `{ "recipients": ["email1@example.com", "email2@example.com"], "subject": "Report Subject", "message": "Email body", "format": "PDF" }`
  - Response: `{ "success": true, "message": "Report sent successfully to 2 recipients" }`
- `GET /v1/reports/templates` - Get report templates (optional, for quick creation)
  - Response: List of report templates
- `GET /v1/reports/:id/preview` - Preview report data
  - Query Parameters: `limit` (optional, default: 10)
  - Response: `{ "rowCount": 150, "sampleData": [...] }` (for Tabular) or `{ "widgets": [...], "a4Layout": {...} }` (for Graphical)
- `GET /v1/reports/widgets` - Get available widget types
  - Response: `{ "widgets": [{ "id": "chart", "name": "Chart Widget", "type": "chart", "availableFilters": [...] }, ...] }`
- `GET /v1/reports/widgets/existing` - Get pre-existing widgets
  - Response: `{ "widgets": [{ "id": "widget-001", "name": "Widget Name", "type": "chart", "filters": {...} }, ...] }`
- `POST /v1/reports/:id/print` - Generate print-friendly version of report
  - Response: Print-ready HTML or PDF

**UI Components:**
- Page: `/reports` (Reports.tsx) - parent page
- Components:
  - **Create Report Modal/Wizard:**
    - Modal/Drawer component with 3-step wizard
    - Step indicator/progress bar (Step 1 of 3, Step 2 of 3, Step 3 of 3)
    - **Step 1:**
      - Report Type dropdown (Select component, required)
      - Report Name input (Input component, required, max 255 chars)
      - Description textarea (TextArea component, optional)
      - Navigation buttons: Cancel, Next
    - **Step 2:**
      - Report Format Type selector (Radio.Group, required): Graphical Report or Tabular Report
      - Timeline picker (RangePicker component, mandatory)
      - **If Graphical Report is selected:**
        - Add Widget dropdown button (Dropdown component with menu):
          - "Create New Widget" option
          - "Add Existing Widget" option
        - **Add Existing Widget Modal:**
          - List of pre-existing widgets (Checkbox.Group or Table with checkboxes)
          - User can select one or more widgets
          - "Add Widget" button
          - "Cancel" button
        - **Create New Widget Modal:**
          - Available widget types list (Radio.Group or Select): Chart Widget, Table Widget, Summary Widget, Metric Widget
          - Filter settings section (shown after widget type selection):
            - Filters based on widget type (e.g., Severity, Status, Date Range)
            - User configures filters
          - "Add Widget" button
          - "Cancel" button
        - Report Preview section:
          - A4 page layout (scaled, 210mm x 297mm or equivalent pixels)
          - Visual grid/guides for A4 boundaries
          - Widgets displayed in preview
          - Drag and drop functionality for widgets
          - Resize handles on widgets (corners/edges)
          - Delete button/icon on each widget
          - Widget position and size are saved
      - **If Tabular Report is selected:**
        - Available columns list (Checkbox.Group or Transfer component)
        - Select All / Deselect All buttons
        - Default columns highlighted
        - Report Preview section:
          - Selected columns displayed in table format
          - Column reordering (drag and drop)
          - Remove column option
      - Navigation buttons: Back, Cancel, Next
    - **Step 3:**
      - **Report Logo:**
        - Logo display (Image component, read-only, shows organization logo from system)
        - Note: Logo is automatically included from system settings
      - **Report Visibility:**
        - Visibility selector (Radio.Group, required): Public or Private
        - **If Private is selected:**
          - Access Permissions section:
            - Organization multi-select (Select with mode="multiple")
            - Branch multi-select (Select with mode="multiple")
            - Department multi-select (Select with mode="multiple")
            - Role multi-select (Select with mode="multiple")
            - User multi-select (Select with mode="multiple")
            - At least one access option must be selected
      - **Export Format:**
        - **If Graphical Report:** Format selector (Radio.Group, required): PDF or Word
        - **If Tabular Report:** Format selector (Radio.Group, required): Excel or CSV
      - **Schedule Toggle:**
        - Schedule toggle (Switch component)
        - Schedule configuration (shown when enabled):
          - Frequency dropdown (Select, required): Daily, Weekly, Monthly
          - Time picker/input (TimePicker or Input with HH:mm format, optional)
          - Day of Week selector (Select, required for Weekly): Sunday (0) to Saturday (6)
          - Day of Month selector (Input number or Select, required for Monthly): 1-31
          - Target email addresses input (Select with mode="tags" or Input, required, email validation)
          - Next Run At display (Text, read-only, formatted date/time)
      - Navigation buttons: Back, Cancel, Create
    - Loading state while creating report
    - Success/error messages
  - **Edit Report Modal/Wizard:**
    - Same structure as Create Report wizard
    - Pre-populated with existing report data
    - "Save" button instead of "Create" button
    - May show warning if changing report type
  - **Schedule Report Modal:**
    - Modal component
    - Report Name display (read-only)
    - Report Type display (read-only)
    - Enable Schedule toggle (Switch)
    - Frequency dropdown (Select, required if enabled)
    - Time picker/input (TimePicker or Input, optional)
    - Day of Week selector (Select, shown for Weekly, required)
    - Day of Month selector (Input number or Select, shown for Monthly, required)
    - Recipients input (Select with mode="tags" or Input, required if enabled, email validation)
    - Next Run At display (Text, read-only, formatted)
    - Action buttons: Cancel, Save
    - Loading state while saving
    - Success/error messages
  - **Send Report Modal:**
    - Modal component
    - Report Name display (read-only)
    - Report Type display (read-only)
    - Report Format display (read-only)
    - Recipients input (Select with mode="tags" or Input, required, email validation)
    - Subject input (Input, optional, pre-filled with default)
    - Message/Notes textarea (TextArea, optional)
    - Format selector (Select, if report supports multiple formats)
    - Action buttons: Cancel, Send
    - Loading state while sending
    - Success/error messages
  - **Print Action:**
    - Print button in Actions column (PrinterOutlined icon)
    - Opens browser print dialog
    - Print-friendly format with organization logo
    - Available for completed reports only
  - **Report Preview Section (Step 2):**
    - A4 page layout container (scaled to fit screen)
    - Visual grid/guides
    - Widget container (for Graphical reports)
    - Table preview (for Tabular reports)
    - Drag and drop functionality
    - Resize handles
    - Delete buttons

**User Actions:**

#### Create Report
1. Navigate to Reports page
2. Click "Create" button
3. Verify Create Report wizard opens with Step 1
4. Select Report Type from dropdown (e.g., Patch)
5. Enter Report Name (e.g., "Monthly Patch Status Report")
6. Optionally enter Description
7. Click "Next" button
8. Verify Step 2 opens
9. Select Report Format Type: Graphical Report or Tabular Report (radio buttons)
10. Select Timeline (mandatory, Date Range picker)
11. **If Graphical Report is selected:**
    12. Click "Add Widget" dropdown button
    13. Select "Add Existing Widget" option
    14. Verify popup opens showing all pre-existing widgets
    15. Select one or more widgets (checkboxes)
    16. Click "Add Widget" button
    17. Verify selected widgets appear in Report Preview section
    18. Drag widgets to reposition them
    19. Resize widgets by dragging corners/edges
    20. Delete a widget by clicking delete button
    21. OR select "Create New Widget" option
    22. Verify widget types are displayed (Chart, Table, Summary, Metric)
    23. Select a widget type (e.g., Chart Widget)
    24. Configure filter settings for the widget
    25. Click "Add Widget" button
    26. Verify widget appears in Report Preview with configured data
    27. Adjust widgets to fit A4 page layout
    28. Verify Report Preview is scaled for A4 size (210mm x 297mm)
12. **If Tabular Report is selected:**
    13. Verify all available columns are displayed
    14. Select columns to include in report (checkboxes)
    15. Verify selected columns are shown in Report Preview
    16. Reorder columns by dragging and dropping
    17. Remove columns from preview if needed
13. Click "Next" button
14. Verify Step 3 opens
15. Verify organization logo is displayed (automatically included)
16. Select Report Visibility: Public or Private (radio buttons)
17. **If Private is selected:**
    18. Select Organization(s) that can access the report
    19. Select Branch(es) that can access the report
    20. Select Department(s) that can access the report
    21. Select Role(s) that can access the report
    22. Select User(s) that can access the report
    23. Verify at least one access option is selected
18. **If Graphical Report:** Select Export Format: PDF or Word (radio buttons)
19. **If Tabular Report:** Select Export Format: Excel or CSV (radio buttons)
20. Toggle Schedule switch to enable schedule (optional)
21. **If Schedule is enabled:**
    22. Select Frequency (e.g., Monthly)
    23. Select Day of Month (e.g., 1) - for Monthly
    24. OR Select Day of Week (e.g., Monday) - for Weekly
    25. Enter Time (e.g., "08:00") - optional
    26. Enter Target email addresses (e.g., "admin@example.com")
    27. Verify Next Run At is calculated and displayed
28. Click "Create" button
29. Verify success message is displayed
30. Verify redirect to Reports page
31. Verify new report appears in table with appropriate status

#### Edit Report
32. Navigate to Reports page
33. Click "Edit" action button for an existing report
34. Verify Edit Report wizard opens with existing data pre-populated
35. Modify Report Name
36. Modify Description
37. Navigate to Step 2
38. Modify Report Format Type (if needed, Graphical/Tabular)
39. Modify Timeline (Date Range)
40. **For Graphical Reports:** Add/remove widgets, reposition, resize widgets
41. **For Tabular Reports:** Add/remove columns, reorder columns
42. Navigate to Step 3
43. Modify Visibility (Public/Private)
44. Modify Access Permissions (if Private)
45. Change Export Format (e.g., from PDF to Word for Graphical, or Excel to CSV for Tabular)
46. Modify Schedule configuration (e.g., change frequency, recipients)
47. Click "Save" button
48. Verify success message is displayed
49. Verify redirect to Reports page
50. Verify updated report appears in table with updated information

#### Schedule Report
51. Navigate to Reports page
52. Verify Schedule button is available for reports that are NOT scheduled
53. Verify Schedule button is disabled/hidden for reports that already have a schedule
54. Click "Schedule" action button for a report without schedule
55. Verify Schedule Report modal opens
56. Toggle Enable Schedule switch to enable
57. Select Frequency (e.g., Daily)
58. Enter Time (e.g., "02:00")
59. Enter Recipient email addresses
60. Verify Next Run At is calculated and displayed
61. Click "Save" button
62. Verify success message is displayed
63. Verify modal closes
64. Verify Schedule column in Reports table shows frequency (e.g., "Daily")
65. Verify Schedule button is now disabled/hidden for this report
66. For Weekly frequency: Select Day of Week (e.g., Monday)
67. For Monthly frequency: Select Day of Month (e.g., 15)
68. Verify schedule is saved correctly

#### Send Now
55. Navigate to Reports page
56. Click "Send Now" action button for a completed report
57. Verify Send Report modal opens
58. Enter Recipient email addresses (e.g., "admin@example.com", "manager@example.com")
59. Optionally modify Subject
60. Optionally enter Message/Notes
61. If report supports multiple formats, select format (e.g., PDF)
62. Click "Send" button
63. Verify success message is displayed (e.g., "Report sent successfully to 2 recipients")
64. Verify modal closes
65. Verify audit log entry is created for send action

#### Print Report
66. Navigate to Reports page
67. Click "Print" action button for a completed report
68. Verify Print button is available for completed reports
69. Verify Print button is disabled for Draft, Generating, or Failed reports
70. Verify browser print dialog opens
71. Verify report is displayed in print-friendly format
72. Verify organization logo is included in print output
73. Configure print settings (margins, orientation, page size) if needed
74. Print or cancel print dialog

**Test Notes:**
- Test with admin role (should have full access to create, edit, schedule, and send reports)
- Test with regular user role (may have limited permissions)
- Verify Create Report wizard:
  - Test all 3 steps of wizard
  - Test navigation between steps (Back, Next)
  - Test canceling wizard at each step
  - Test validation at each step:
    - Step 1: Type and Name are required
    - Step 2: Report Format Type (Graphical/Tabular) is required, Timeline is mandatory, at least one widget for Graphical or at least one column for Tabular
    - Step 3: Visibility is required, Export Format is required, Schedule fields are required if schedule is enabled, Access Permissions are required if Private
  - Test with all report types (Patch, Asset, Vulnerability, Compliance, Audit, Custom)
  - Test Graphical Report creation:
    - Test selecting Graphical Report format type
    - Test Timeline selection (mandatory)
    - Test "Add Existing Widget" option:
      - Verify popup shows all pre-existing widgets
      - Test selecting single widget
      - Test selecting multiple widgets
      - Verify widgets appear in Report Preview
      - Test drag and drop to reposition widgets
      - Test resize widgets (drag corners/edges)
      - Test delete widgets from preview
    - Test "Create New Widget" option:
      - Verify all available widget types are shown
      - Test selecting each widget type (Chart, Table, Summary, Metric)
      - Test configuring filter settings for each widget type
      - Verify widget appears in preview with configured data
      - Test drag, resize, and delete new widgets
    - Verify Report Preview is scaled for A4 page (210mm x 297mm)
    - Verify visual grid/guides for A4 boundaries
    - Test adjusting widgets to fit A4 layout
    - Test export formats: PDF and Word
  - Test Tabular Report creation:
    - Test selecting Tabular Report format type
    - Test Timeline selection (mandatory)
    - Test selecting columns (single and multiple)
    - Verify selected columns appear in Report Preview
    - Test reordering columns (drag and drop)
    - Test removing columns
    - Test export formats: Excel and CSV
  - Test Report Visibility:
    - Test selecting Public (anyone can access)
    - Test selecting Private:
      - Test selecting Organizations
      - Test selecting Branches
      - Test selecting Departments
      - Test selecting Roles
      - Test selecting Users
      - Test selecting multiple options
      - Verify at least one access option is required
  - Test Organization Logo:
    - Verify logo is automatically included from system settings
    - Verify logo appears in report preview
    - Verify logo appears in generated report
  - Test creating report without schedule
  - Test creating report with schedule (Daily, Weekly, Monthly)
  - Test schedule configuration:
    - Daily: Only Time is optional
    - Weekly: Day of Week is required, Time is optional
    - Monthly: Day of Month is required, Time is optional
  - Test email validation for recipients
  - Test with invalid inputs (empty name, invalid email, invalid date range)
  - Verify report is created with correct status
  - Verify available columns and filters are correct for each report type
- Verify Edit Report wizard:
  - Test editing all report properties
  - Test changing report type (if allowed)
  - Test updating filters and columns
  - Test updating format
  - Test enabling/disabling schedule
  - Test updating schedule configuration
  - Test editing report with status "Completed" (may trigger regeneration)
  - Test editing report with status "Generating" (may be disabled)
  - Verify changes are saved correctly
  - Verify audit log is created
- Verify Schedule Report modal:
  - Test enabling schedule for report without schedule
  - Test updating existing schedule
  - Test disabling schedule
  - Test all frequency options (Daily, Weekly, Monthly)
  - Test Day of Week selection for Weekly
  - Test Day of Month selection for Monthly
  - Test Time input (HH:mm format)
  - Test email validation for recipients
  - Test Next Run At calculation:
    - Daily: Next occurrence at specified time
    - Weekly: Next occurrence on specified day at specified time
    - Monthly: Next occurrence on specified day of month at specified time
  - Test with invalid inputs (invalid email, invalid day of month > 31)
  - Verify schedule is saved correctly
  - Verify ScheduledReport record is created/updated
  - Verify audit log is created
- Verify Send Now functionality:
  - Test sending report with status "Completed" (should work)
  - Test Send Now button is disabled for Draft, Generating, Failed reports
  - Test entering single recipient
  - Test entering multiple recipients
  - Test email validation (invalid email format)
  - Test with custom Subject
  - Test with custom Message/Notes
  - Test selecting different format (if report supports multiple formats)
  - Test email sending:
    - Verify email is sent to all recipients
    - Verify email includes report attachment
    - Verify email subject and body are correct
  - Test error handling (email sending failure)
  - Verify success message shows correct recipient count
  - Verify audit log is created with recipient list
- Test wizard state management:
  - Verify user input is preserved when navigating between steps
  - Verify wizard resets when canceled
  - Verify wizard closes after successful creation/update
- Test validation:
  - Required fields validation
  - Email format validation
  - Date range validation (start date < end date)
  - Day of Month validation (1-31)
  - Day of Week validation (0-6)
  - Time format validation (HH:mm)
- Test error handling:
  - Network errors
  - Validation errors
  - Permission errors
  - Server errors
  - Verify appropriate error messages are displayed
- Test report generation:
  - Verify report generation starts after creation (if schedule not enabled)
  - Verify report status changes from "Draft" to "Generating" to "Completed"
  - Verify scheduled reports are generated at scheduled times
- Test schedule execution:
  - Verify scheduled reports are generated automatically
  - Verify reports are sent to recipients via email
  - Verify Next Run At is updated after execution
  - Verify Last Run At is updated after execution
- Test preview functionality:
  - Verify preview shows sample data based on filters and columns
  - Verify preview shows correct row count
  - Verify preview data is accurate
  - For Graphical Reports: Verify widgets are displayed in preview with correct data
  - For Tabular Reports: Verify columns are displayed in preview table
- Test Print functionality:
  - Test Print button is available for completed reports
  - Test Print button is disabled for Draft, Generating, Failed reports
  - Test opening print dialog
  - Verify report is displayed in print-friendly format
  - Verify organization logo is included in print
  - Test print settings (margins, orientation, page size)
  - Test printing Graphical reports (widgets should print correctly)
  - Test printing Tabular reports (table should print correctly)
- Test Schedule button availability:
  - Verify Schedule button is available for reports without schedule
  - Verify Schedule button is disabled/hidden for reports with existing schedule
  - Test that scheduled reports cannot be scheduled again
- Test widget management:
  - Test adding multiple widgets
  - Test widget positioning and alignment
  - Test widget resizing (maintain aspect ratio if needed)
  - Test widget deletion
  - Verify widget state is preserved when navigating between steps
  - Test widget filter configuration
  - Test widget data population based on filters
- Test A4 page layout:
  - Verify Report Preview is scaled correctly for A4 size
  - Test widgets fit within A4 boundaries
  - Test visual guides/grid for A4 page
  - Verify widgets can be positioned anywhere within A4 area
  - Test responsive behavior of preview section
- Test with different report types and their specific filters/columns
- Test with large number of recipients
- Test with special characters in report name/description
- Test with very long report names (max 255 characters)
- Test concurrent operations (creating multiple reports simultaneously)
- Verify all actions create appropriate audit log entries
- Test responsive design (modals on different screen sizes)
- Test accessibility (keyboard navigation, screen readers)
- Test export formats:
  - Graphical reports: PDF and Word export
  - Tabular reports: Excel and CSV export
  - Verify exported files contain correct data
  - Verify exported files include organization logo
  - Verify exported files maintain layout (for Graphical) or column structure (for Tabular)
- Test access control:
  - Test Public reports are accessible to all users
  - Test Private reports are only accessible to selected Organizations/Branches/Departments/Roles/Users
  - Test access permissions are enforced correctly
  - Test users without access cannot view Private reports
- Test widget types:
  - Test Chart Widget (various chart types)
  - Test Table Widget
  - Test Summary Widget
  - Test Metric Widget
  - Test widget-specific filter configurations
  - Test widget data accuracy
- Test timeline validation:
  - Verify timeline is mandatory
  - Test with valid date ranges
  - Test with invalid date ranges (start > end)
  - Test with future dates
  - Test with past dates
  - Test date range affects widget/column data

---

### User Story 10: Alert Configuration

**Story ID:** `US-040`  
**Title:** Configure and Manage Alert Settings  
**Priority:** P0 (Critical)  
**Module:** Settings - Alert Configuration

**User Story:**
```
As a system administrator
I want to create, view, edit, and manage alert configurations
So that I can configure how alerts are triggered, what conditions trigger them, and how they are delivered to stakeholders
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Alert Configuration page (accessible from Settings menu or navigation)
- [ ] AC2: Alert Configuration page displays a table listing all alert configurations
- [ ] AC3: Table displays the following columns (configurable visibility):
  - Name (sortable, searchable, clickable to view alert details)
  - Type (filterable, searchable, e.g., Email, Slack, SMS, Webhook)
  - Channel (filterable, searchable, e.g., SMTP, Webhook, AWS SNS, HTTP)
  - Recipients (searchable, displays recipient list)
  - Status (filterable, color-coded badges: Enabled, Disabled)
  - Created On (sortable, formatted date)
  - Actions (View, Edit, Delete, Enable/Disable)
- [ ] AC4: User can search alert configurations by Name, Type, Channel, or Recipients using a search input field
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: User can filter alert configurations by:
  - Type (via Type column filter dropdown: Email, Slack, SMS, Webhook)
  - Channel (via Channel column filter dropdown: SMTP, Webhook, AWS SNS, HTTP)
  - Status (via Status column filter dropdown: Enabled, Disabled)
  - Module (via Module filter dropdown, if applicable)
  - Severity (via Severity filter dropdown, if applicable)
- [ ] AC7: User can sort alert configurations by:
  - Name (ascending/descending, alphabetical)
  - Type (ascending/descending, alphabetical)
  - Channel (ascending/descending, alphabetical)
  - Created On (newest/oldest first, date)
- [ ] AC8: By default, alert configurations are sorted by Created On descending (newest first)
- [ ] AC9: User can paginate through alert configurations using table pagination controls
- [ ] AC10: User can view alert configuration details by clicking on alert name or "View" action button
- [ ] AC11: Alert configuration details modal/drawer displays comprehensive information including:
  - Basic Information: Name, Description, Type, Channel, Recipients, Status
  - Module Information: Module (if applicable)
  - Severity Information: Severity (if applicable)
  - Scope Information: Scope (if applicable)
  - Endpoints Information: Endpoints (if applicable)
  - Conditions: List of conditions that trigger the alert
  - Actions: List of actions to be performed when alert is triggered
  - Remediations: List of remediation steps (if applicable)
  - Created Information: Created On
- [ ] AC12: User can create a new alert configuration by clicking "Create" button
- [ ] AC13: Create button opens Create Alert Configuration modal
- [ ] AC14: Create Alert Configuration modal displays form fields:
  - Name (required, text input, max 255 characters)
  - Description (optional, textarea)
  - Type (required, dropdown: Email, Slack, SMS, Webhook)
  - Channel (required, dropdown, options depend on Type: SMTP, Webhook, AWS SNS, HTTP)
  - Recipients (required, multi-select or comma-separated input, email addresses or channel names)
  - Enabled (checkbox, default: checked)
  - Module (optional, dropdown, if applicable)
  - Severity (optional, dropdown, if applicable)
  - Scope (optional, dropdown or input, if applicable)
  - Endpoints (optional, multi-select or input, if applicable)
  - Conditions section (add/edit/delete conditions)
  - Actions section (add/edit/delete actions)
  - Remediations section (add/edit/delete remediations, if applicable)
- [ ] AC15: Type dropdown options change Channel dropdown options dynamically:
  - Email: SMTP
  - Slack: Webhook
  - SMS: AWS SNS (or other SMS providers)
  - Webhook: HTTP
- [ ] AC16: Recipients field accepts:
  - Email addresses (for Email type)
  - Channel names (for Slack type, e.g., "#patches-channel")
  - Phone numbers (for SMS type)
  - Webhook URLs (for Webhook type)
- [ ] AC17: User can add Conditions to alert configuration:
  - Condition has: Attribute, Condition Operator (e.g., equals, greater than, less than, contains), Value
  - User can add multiple conditions
  - User can delete conditions
  - Conditions are evaluated to determine when alert is triggered
- [ ] AC18: User can add Actions to alert configuration:
  - Action has: Name, Type
  - User can add multiple actions
  - User can delete actions
  - Actions are performed when alert is triggered
- [ ] AC19: User can add Remediations to alert configuration (if applicable):
  - Remediation has: Name, Type
  - User can add multiple remediations
  - User can delete remediations
  - Remediations are suggested when alert is triggered
- [ ] AC20: System validates all required fields before allowing submission
- [ ] AC21: System validates email addresses, phone numbers, and webhook URLs based on Type
- [ ] AC22: "Save" button creates the alert configuration
- [ ] AC23: Success message is displayed after creating alert configuration
- [ ] AC24: Modal closes and table refreshes to show new alert configuration
- [ ] AC25: User can edit an existing alert configuration by clicking "Edit" action button
- [ ] AC26: Edit button opens Edit Alert Configuration modal
- [ ] AC27: Edit Alert Configuration modal is pre-populated with existing alert configuration data
- [ ] AC28: User can modify any field in the alert configuration
- [ ] AC29: User can add, modify, or delete Conditions, Actions, and Remediations
- [ ] AC30: "Save" button updates the alert configuration
- [ ] AC31: Success message is displayed after updating alert configuration
- [ ] AC32: Modal closes and table refreshes to show updated alert configuration
- [ ] AC33: User can delete an alert configuration by clicking "Delete" action button
- [ ] AC34: Delete button opens Delete Confirmation modal
- [ ] AC35: Delete Confirmation modal displays message: "Are you sure you want to delete this alert configuration?"
- [ ] AC36: Delete Confirmation modal shows alert configuration information (Name, Type)
- [ ] AC37: Delete Confirmation modal has "Delete" button (primary, destructive) and "Cancel" button
- [ ] AC38: Upon confirming deletion, system deletes the alert configuration
- [ ] AC39: System creates audit log entry for deletion action
- [ ] AC40: Success message is displayed after deleting alert configuration
- [ ] AC41: Delete Confirmation modal closes after successful deletion
- [ ] AC42: User can enable/disable an alert configuration by clicking Enable/Disable toggle or action button
- [ ] AC43: Enable/Disable action updates the alert configuration status immediately
- [ ] AC44: Enabled alert configurations are active and will trigger alerts based on conditions
- [ ] AC45: Disabled alert configurations are inactive and will not trigger alerts
- [ ] AC46: Status column displays color-coded badges:
  - Enabled=green
  - Disabled=gray
- [ ] AC47: User can use column visibility toggle to show/hide columns
- [ ] AC48: Column visibility preferences are saved and persist across sessions
- [ ] AC49: Table displays empty state message when no alert configurations exist
- [ ] AC50: Table shows loading state while fetching alert configuration data
- [ ] AC51: Table shows "No results found" message when search/filter returns no matches
- [ ] AC52: Refresh/Reload button reloads alert configuration list from server
- [ ] AC53: Table supports export functionality (Export button) to export alert configuration list as CSV/Excel
- [ ] AC54: Exported CSV includes all visible columns and filtered/search results
- [ ] AC55: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC56: Page respects user permissions - only users with alert configuration management access can create/edit/delete
- [ ] AC57: System validates alert configuration data on both client and server side
- [ ] AC58: System displays validation errors for invalid inputs (e.g., invalid email format, invalid webhook URL)
- [ ] AC59: System creates audit log entries for all alert configuration actions (create, update, delete, enable/disable)
- [ ] AC60: Alert configurations are evaluated in real-time or on a scheduled basis to trigger alerts

**Test Data:**
```json
{
  "alertConfigurations": [
    {
      "id": "alert-config-001",
      "name": "Critical Patch Alert",
      "description": "Alert for critical patches that need immediate attention",
      "type": "Email",
      "channel": "SMTP",
      "recipients": ["admin@example.com", "security@example.com"],
      "enabled": true,
      "module": "Patches",
      "severity": "CRITICAL",
      "scope": "All",
      "endpoints": null,
      "conditions": [
        {
          "id": "cond-001",
          "attribute": "severity",
          "condition": "equals",
          "value": "CRITICAL"
        },
        {
          "id": "cond-002",
          "attribute": "status",
          "condition": "equals",
          "value": "Missing"
        }
      ],
      "actions": [
        {
          "id": "action-001",
          "name": "Send Email Notification",
          "type": "email"
        }
      ],
      "remediations": [
        {
          "id": "remed-001",
          "name": "Deploy Patch Immediately",
          "type": "deploy"
        }
      ],
      "createdAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "alert-config-002",
      "name": "Patch Deployment Failed",
      "description": "Alert when patch deployment fails",
      "type": "Email",
      "channel": "SMTP",
      "recipients": ["ops@example.com"],
      "enabled": true,
      "module": "Patches",
      "severity": "High",
      "scope": "All",
      "endpoints": null,
      "conditions": [
        {
          "id": "cond-003",
          "attribute": "deploymentStatus",
          "condition": "equals",
          "value": "Failed"
        }
      ],
      "actions": [
        {
          "id": "action-002",
          "name": "Send Email Notification",
          "type": "email"
        },
        {
          "id": "action-003",
          "name": "Create Incident Ticket",
          "type": "ticket"
        }
      ],
      "remediations": [],
      "createdAt": "2024-01-12T10:15:00Z"
    },
    {
      "id": "alert-config-003",
      "name": "Slack Notification",
      "description": "Send alerts to Slack channel",
      "type": "Slack",
      "channel": "Webhook",
      "recipients": ["#patches-channel"],
      "enabled": true,
      "module": "All",
      "severity": null,
      "scope": null,
      "endpoints": null,
      "conditions": [
        {
          "id": "cond-004",
          "attribute": "severity",
          "condition": "in",
          "value": "CRITICAL,HIGH"
        }
      ],
      "actions": [
        {
          "id": "action-004",
          "name": "Send Slack Message",
          "type": "slack"
        }
      ],
      "remediations": [],
      "createdAt": "2024-01-08T14:45:00Z"
    },
    {
      "id": "alert-config-004",
      "name": "SMS Alert",
      "description": "Send SMS alerts for critical issues",
      "type": "SMS",
      "channel": "AWS SNS",
      "recipients": ["+1-555-0123", "+1-555-0456"],
      "enabled": false,
      "module": "All",
      "severity": "CRITICAL",
      "scope": null,
      "endpoints": null,
      "conditions": [
        {
          "id": "cond-005",
          "attribute": "severity",
          "condition": "equals",
          "value": "CRITICAL"
        }
      ],
      "actions": [
        {
          "id": "action-005",
          "name": "Send SMS",
          "type": "sms"
        }
      ],
      "remediations": [],
      "createdAt": "2024-01-05T09:20:00Z"
    },
    {
      "id": "alert-config-005",
      "name": "Webhook Alert",
      "description": "Send alerts to external webhook",
      "type": "Webhook",
      "channel": "HTTP",
      "recipients": ["https://api.example.com/alerts"],
      "enabled": true,
      "module": "All",
      "severity": null,
      "scope": null,
      "endpoints": null,
      "conditions": [],
      "actions": [
        {
          "id": "action-006",
          "name": "Send Webhook",
          "type": "webhook"
        }
      ],
      "remediations": [],
      "createdAt": "2024-01-15T16:00:00Z"
    }
  ],
  "alertTypes": ["Email", "Slack", "SMS", "Webhook"],
  "channels": {
    "Email": ["SMTP"],
    "Slack": ["Webhook"],
    "SMS": ["AWS SNS"],
    "Webhook": ["HTTP"]
  },
  "conditionOperators": ["equals", "not equals", "greater than", "less than", "contains", "in", "not in"],
  "modules": ["Patches", "Assets", "Vulnerabilities", "Compliance", "All"],
  "severities": ["CRITICAL", "High", "Medium", "Low", "Info"]
}
```

**API Endpoints:**
- `GET /v1/settings/alerts` - Get list of alert configurations with filtering, sorting, and pagination
  - Query Parameters:
    - `type` (optional): Filter by type (Email, Slack, SMS, Webhook)
    - `channel` (optional): Filter by channel
    - `enabled` (optional): Filter by status (true/false)
    - `module` (optional): Filter by module
    - `severity` (optional): Filter by severity
    - `search` (optional): Search by Name, Type, Channel, Recipients
    - `sortBy` (optional): Sort field (name, type, channel, createdAt)
    - `sortOrder` (optional): Sort order (asc, desc)
    - `page` (optional): Page number (default: 1)
    - `pageSize` (optional): Items per page (default: 20)
  - Response: Paginated list of alert configurations with metadata
- `GET /v1/settings/alerts/:id` - Get alert configuration details by ID
  - Response: Detailed alert configuration information including conditions, actions, remediations
- `POST /v1/settings/alerts` - Create a new alert configuration
  - Request Body: Alert configuration data (name, type, channel, recipients, enabled, conditions, actions, remediations, etc.)
  - Response: Created alert configuration object
- `PUT /v1/settings/alerts/:id` - Update an alert configuration
  - Request Body: Alert configuration update data
  - Response: Updated alert configuration object
- `DELETE /v1/settings/alerts/:id` - Delete an alert configuration
  - Response: Success message
- `PUT /v1/settings/alerts/:id/enable` - Enable an alert configuration
  - Response: Updated alert configuration with enabled=true
- `PUT /v1/settings/alerts/:id/disable` - Disable an alert configuration
  - Response: Updated alert configuration with enabled=false
- `GET /v1/settings/alerts/export` - Export alert configuration list to CSV/Excel
  - Query Parameters: Same as GET /v1/settings/alerts
  - Response: CSV/Excel file download

**UI Components:**
- Page: `/settings/alerts` or `/settings/alert-configuration` (AlertConfiguration.tsx or PolicyManagement.tsx)
- Components:
  - **Page Header:**
    - Page title "Alert Configuration" or "Alert Settings"
    - Breadcrumb navigation: Settings > Alert Configuration
  - **Table Header:**
    - Search input field (with SearchOutlined icon)
    - Filter dropdowns:
      - Type filter (Select dropdown)
      - Channel filter (Select dropdown)
      - Status filter (Select dropdown)
      - Module filter (Select dropdown, if applicable)
      - Severity filter (Select dropdown, if applicable)
    - Export button (DownloadOutlined icon) - exports alert configuration list to CSV/Excel
    - Refresh button (ReloadOutlined icon) - reloads data
    - Create button (PlusOutlined icon, primary) - opens Create Alert Configuration modal
    - Column visibility toggle button (EyeOutlined icon, optional)
  - **Table:**
    - Columns: Name, Type, Channel, Recipients, Status, Created On, Actions
    - Sortable columns: Name, Type, Channel, Created On
    - Filterable columns: Type, Channel, Status
    - Searchable columns: Name, Type, Channel, Recipients
    - Clickable alert name (opens details modal/drawer)
    - Actions column: View button, Edit button, Delete button, Enable/Disable toggle or button
    - Color-coded status badges
  - **Create/Edit Alert Configuration Modal:**
    - Modal component with form
    - Form fields:
      - Name input (required)
      - Description textarea (optional)
      - Type dropdown (required, Email, Slack, SMS, Webhook)
      - Channel dropdown (required, options depend on Type)
      - Recipients input (required, multi-select or tags input)
      - Enabled checkbox (default: checked)
      - Module dropdown (optional)
      - Severity dropdown (optional)
      - Scope input (optional)
      - Endpoints input (optional, multi-select)
    - **Conditions Section:**
      - Add Condition button
      - List of conditions with:
        - Attribute dropdown/input
        - Condition Operator dropdown (equals, not equals, greater than, less than, contains, in, not in)
        - Value input
        - Delete button for each condition
    - **Actions Section:**
      - Add Action button
      - List of actions with:
        - Name input
        - Type dropdown/input
        - Delete button for each action
    - **Remediations Section (optional):**
      - Add Remediation button
      - List of remediations with:
        - Name input
        - Type dropdown/input
        - Delete button for each remediation
    - Action buttons: Cancel, Save
    - Loading state while saving
    - Success/error messages
  - **View Alert Configuration Modal/Drawer:**
    - Comprehensive alert configuration information display
    - Read-only fields showing all configuration details
    - Close button
  - **Delete Confirmation Modal:**
    - Title: "Delete Alert Configuration"
    - Message: "Are you sure you want to delete this alert configuration?"
    - Alert configuration information display (Name, Type)
    - Action buttons: Delete (primary, destructive), Cancel (default)
    - Loading state while deleting
    - Success/error messages
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no alert configurations exist
  - **No Results State:** Message when search/filter returns no matches

**User Actions:**
1. Navigate to Alert Configuration page from Settings menu
2. View alert configurations table with all columns
3. Use search box to filter alert configurations by Name, Type, Channel, or Recipients
4. Select Type filter to filter by Email, Slack, SMS, or Webhook
5. Select Channel filter to filter by SMTP, Webhook, AWS SNS, or HTTP
6. Select Status filter to filter by Enabled or Disabled
7. Click column headers to sort alert configurations (Name, Type, Channel, Created On)
8. Adjust pagination (change page size, navigate pages)
9. Click alert name or "View" button to view alert configuration details
10. In alert details, review all configuration information including conditions, actions, and remediations
11. Click "Create" button to create a new alert configuration
12. In Create Alert Configuration modal:
    - Enter Name (required)
    - Optionally enter Description
    - Select Type (Email, Slack, SMS, Webhook)
    - Select Channel (options change based on Type)
    - Enter Recipients (email addresses, channel names, phone numbers, or webhook URLs)
    - Toggle Enabled checkbox
    - Optionally select Module, Severity, Scope, Endpoints
    - Add Conditions:
      - Click "Add Condition" button
      - Select Attribute
      - Select Condition Operator
      - Enter Value
      - Optionally delete condition
    - Add Actions:
      - Click "Add Action" button
      - Enter Action Name
      - Select Action Type
      - Optionally delete action
    - Add Remediations (if applicable):
      - Click "Add Remediation" button
      - Enter Remediation Name
      - Select Remediation Type
      - Optionally delete remediation
    - Click "Save" button
13. Verify success message is displayed
14. Verify modal closes and new alert configuration appears in table
15. Click "Edit" button to edit an existing alert configuration
16. In Edit Alert Configuration modal, modify any fields
17. Add, modify, or delete Conditions, Actions, or Remediations
18. Click "Save" button
19. Verify success message is displayed
20. Verify modal closes and updated alert configuration appears in table
21. Click "Delete" button to delete an alert configuration
22. Confirm deletion in Delete Confirmation modal
23. Verify alert configuration is deleted successfully
24. Click Enable/Disable toggle or button to change alert status
25. Verify status updates immediately in table
26. Click Export button to download alert configuration list as CSV/Excel
27. Click Refresh button to reload data
28. Use column visibility toggle to show/hide columns
29. Clear all filters to show all alert configurations

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (may have limited permissions)
- Verify Alert Configuration page is accessible from Settings menu
- Verify page loads with all alert configurations displayed, sorted by Created On descending
- Test search functionality:
  - Search by alert name (partial and full match)
  - Search by type (partial and full match)
  - Search by channel (partial match)
  - Search by recipients (partial match)
  - Case-insensitive search
  - Search with no results
  - Clear search to show all alert configurations
- Test filtering:
  - Filter by Type (Email, Slack, SMS, Webhook)
  - Filter by Channel (SMTP, Webhook, AWS SNS, HTTP)
  - Filter by Status (Enabled, Disabled)
  - Filter by Module (if applicable)
  - Filter by Severity (if applicable)
  - Apply multiple filters simultaneously
  - Reset filters
- Test sorting:
  - Sort by Name (alphabetical sorting)
  - Sort by Type (alphabetical)
  - Sort by Channel (alphabetical)
  - Sort by Created On (newest/oldest first)
  - Verify default sort is Created On descending
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test alert configuration details:
  - Click alert name to view details
  - Click "View" button to view details
  - Verify all configuration information is displayed correctly
  - Verify conditions, actions, and remediations are shown
- Test create functionality:
  - Create alert configuration with all fields
  - Create alert configuration with minimal required fields
  - Test all alert types (Email, Slack, SMS, Webhook)
  - Test channel options for each type
  - Test adding multiple conditions
  - Test adding multiple actions
  - Test adding multiple remediations
  - Test validation:
    - Required fields (Name, Type, Channel, Recipients)
    - Email format validation for Email type
    - Phone number format validation for SMS type
    - Webhook URL validation for Webhook type
    - Channel name format validation for Slack type
  - Test with invalid inputs
  - Verify alert configuration is created successfully
- Test edit functionality:
  - Edit all alert configuration properties
  - Add new conditions
  - Modify existing conditions
  - Delete conditions
  - Add new actions
  - Modify existing actions
  - Delete actions
  - Add new remediations
  - Modify existing remediations
  - Delete remediations
  - Verify changes are saved correctly
  - Verify audit log is created
- Test delete functionality:
  - Delete single alert configuration
  - Verify Delete Confirmation modal opens
  - Confirm deletion
  - Verify alert configuration is deleted successfully
  - Verify audit log is created
  - Test canceling deletion action
- Test enable/disable functionality:
  - Enable disabled alert configuration
  - Disable enabled alert configuration
  - Verify status updates immediately
  - Verify status is reflected in table
  - Verify audit log is created
- Test export functionality:
  - Export all alert configurations
  - Export filtered/search results
  - Verify CSV/Excel file is downloaded correctly
  - Verify CSV includes correct columns and data
- Test validation:
  - Required fields validation
  - Email format validation
  - Phone number format validation
  - Webhook URL validation
  - Channel name format validation
  - Condition operator validation
  - Verify appropriate error messages are displayed
- Test error handling:
  - Network errors
  - Validation errors
  - Permission errors
  - Server errors
  - Verify appropriate error messages are displayed
- Test alert triggering:
  - Verify enabled alert configurations trigger alerts when conditions are met
  - Verify disabled alert configurations do not trigger alerts
  - Test alert delivery (email, Slack, SMS, webhook)
- Test conditions:
  - Test all condition operators (equals, not equals, greater than, less than, contains, in, not in)
  - Test multiple conditions (AND/OR logic)
  - Test condition evaluation
- Test actions:
  - Test all action types
  - Test action execution when alert is triggered
- Test remediations:
  - Test remediation suggestions
  - Test remediation execution (if applicable)
- Test with different alert types and their specific configurations
- Test with large number of recipients
- Test with special characters in alert name/description
- Test with very long alert names (max 255 characters)
- Test concurrent operations (creating multiple alert configurations simultaneously)
- Verify all actions create appropriate audit log entries
- Test responsive design (table on different screen sizes)
- Test accessibility (keyboard navigation, screen readers)

---

## Test Execution Summary

| Story ID | Title | Status | Tester | Date | Notes |
|----------|-------|--------|--------|------|-------|
| US-031 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-032 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-033 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-034 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-035 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-036 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-037 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-038 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-039 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-040 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |

**Legend:**
- ⏳ Pending: Story not yet tested
- ✅ Pass: All acceptance criteria met
- ❌ Fail: One or more acceptance criteria not met

---

**Document End**
