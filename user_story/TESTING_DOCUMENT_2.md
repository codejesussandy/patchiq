# PatchIQ User Stories - Testing Document 2

**Version:** 1.0.0  
**Last Updated:** 2026-01-14  
**Purpose:** User stories for testing PatchIQ patch management solution functionality (Set 2)

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

### User Story 1: Create Department

**Story ID:** `US-011`  
**Title:** Create New Department  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to create a new department with a name and optional description
So that I can organize users and resources within a branch into different departments
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to User Management > Department page and click "Create Department" button
- [ ] AC2: Department creation form/modal opens with required fields visible
- [ ] AC3: Department name field is mandatory and accepts 1-100 characters
- [ ] AC4: System validates department name is unique within the selected branch (prevents duplicate department names in same branch)
- [ ] AC5: Organization field is mandatory and must be selected from dropdown
- [ ] AC6: System validates that selected organization exists in the system
- [ ] AC7: Branch field is mandatory and must be selected from dropdown
- [ ] AC8: Branch dropdown is initially disabled or empty until an organization is selected
- [ ] AC9: Branch dropdown populates with branches belonging to the selected organization when organization is selected
- [ ] AC10: Branch dropdown shows only branches from the selected organization (filters branches by organization)
- [ ] AC11: If organization selection changes, branch dropdown is cleared and repopulated with branches from the new organization
- [ ] AC12: System validates that selected branch exists in the system and belongs to the selected organization
- [ ] AC13: Description field is optional and accepts up to 500 characters
- [ ] AC14: System validates that department name is not empty before submission
- [ ] AC15: System validates that organization is selected before submission
- [ ] AC16: System validates that branch is selected before submission
- [ ] AC17: System prevents creating department with existing name within the same branch (returns 409 Conflict error)
- [ ] AC18: Upon successful creation, department is created successfully
- [ ] AC19: System creates an audit log entry for department creation action
- [ ] AC20: Success message is displayed after department creation
- [ ] AC21: Department list is refreshed to show newly created department
- [ ] AC22: Created department details are returned in response including branch and organization information
- [ ] AC23: Created department can be immediately used when creating users
- [ ] AC24: System returns appropriate error messages for validation failures (missing organization, missing branch, invalid branch, etc.)
- [ ] AC25: Cancel button closes the form/modal without saving changes
- [ ] AC26: Reset button resets the form to original/empty state (clears organization and branch)
- [ ] AC27: Department name validation works for special characters (if allowed) or restricts them appropriately

**Test Data:**
```json
{
  "validDepartmentComplete": {
    "name": "IT Department",
    "description": "Information Technology department handling all IT operations and support",
    "organizationId": "org-uuid-here",
    "branchId": "branch-uuid-here"
  },
  "validDepartmentMinimal": {
    "name": "Sales",
    "organizationId": "org-uuid-here",
    "branchId": "branch-uuid-here"
  },
  "validDepartmentWithDescription": {
    "name": "Engineering",
    "description": "Software development and engineering team",
    "organizationId": "org-uuid-here",
    "branchId": "branch-uuid-here"
  },
  "missingName": {
    "description": "Department without name",
    "organizationId": "org-uuid-here",
    "branchId": "branch-uuid-here"
  },
  "missingOrganization": {
    "name": "Marketing Department",
    "branchId": "branch-uuid-here"
  },
  "missingBranch": {
    "name": "Marketing Department",
    "organizationId": "org-uuid-here"
  },
  "duplicateName": {
    "name": "IT Department",
    "description": "Duplicate department name in same branch",
    "organizationId": "org-uuid-here",
    "branchId": "branch-uuid-here"
  },
  "duplicateNameDifferentBranch": {
    "name": "IT Department",
    "organizationId": "org-uuid-here",
    "branchId": "different-branch-uuid-here"
  },
  "nameTooLong": {
    "name": "This is a very long department name that exceeds the maximum character limit of one hundred characters and should be rejected by the system validation",
    "organizationId": "org-uuid-here",
    "branchId": "branch-uuid-here"
  },
  "descriptionTooLong": {
    "name": "Test Department",
    "description": "This is a description that exceeds the maximum character limit of five hundred characters and should be rejected. ".repeat(10),
    "organizationId": "org-uuid-here",
    "branchId": "branch-uuid-here"
  },
  "invalidOrganization": {
    "name": "Invalid Department",
    "organizationId": "non-existent-uuid",
    "branchId": "branch-uuid-here"
  },
  "invalidBranch": {
    "name": "Invalid Department",
    "organizationId": "org-uuid-here",
    "branchId": "non-existent-uuid"
  },
  "branchFromDifferentOrganization": {
    "name": "Invalid Department",
    "organizationId": "org-uuid-here",
    "branchId": "branch-from-different-org-uuid"
  }
}
```

**API Endpoints:**
- `POST /v1/settings/departments` - Create a new department
  - **Request Body (Required: name, organizationId, branchId, Optional: description):**
    ```json
    {
      "name": "IT Department",
      "description": "Information Technology department",
      "organizationId": "org-uuid",
      "branchId": "branch-uuid"
    }
    ```
    **Note:** 
    - `organizationId` is **required** - must select an organization
    - `branchId` is **required** - must select a branch that belongs to the selected organization
    - `description` is optional
  - **Success Response (201):**
    ```json
    {
      "id": "dept-uuid",
      "name": "IT Department",
      "description": "Information Technology department",
      "organizationId": "org-uuid",
      "organization": {
        "id": "org-uuid",
        "name": "Acme Corporation"
      },
      "branchId": "branch-uuid",
      "branch": {
        "id": "branch-uuid",
        "name": "New York Office",
        "organization": {
          "name": "Acme Corporation"
        }
      },
      "users": 0,
      "createdAt": "2026-01-14T00:00:00.000Z",
      "updatedAt": "2026-01-14T00:00:00.000Z"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Invalid input data, missing required fields, or validation failure
    - `401 Unauthorized` - Not authenticated
    - `403 Forbidden` - Insufficient permissions (non-admin)
    - `404 Not Found` - Organization not found or Branch not found
    - `409 Conflict` - Department name already exists in this branch
    - `422 Unprocessable Entity` - Invalid data format, branch does not belong to selected organization

**UI Components:**
- Page: `/settings/user-management/department` (Department.tsx)
- Components:
  - "Create Department" button (PlusOutlined icon)
  - Department creation modal/drawer
  - Form fields:
    - Department Name (required, text input, max 100 characters)
    - Organization (required, dropdown, must select from available organizations)
    - Branch (required, dropdown, initially disabled, populates based on selected organization)
    - Description (optional, textarea, max 500 characters)
  - Action buttons:
    - Submit/Save button (saves the department)
    - Reset button (resets form to empty state)
    - Cancel button (closes form without saving)
  - Success/error message notifications
- User Actions:
  1. Navigate to Settings > User Management > Department
  2. Click "Create Department" button (or + icon)
  3. Enter department name (required)
  4. Select organization from dropdown (required, mandatory)
  5. Verify branch dropdown is enabled and populated with branches from selected organization
  6. Select branch from dropdown (required, must belong to selected organization)
  7. Optionally change organization - verify branch dropdown is cleared and repopulated with branches from new organization
  8. Enter description (optional)
  9. (Optional) Click "Reset" button to clear all fields (organization and branch)
  10. (Optional) Click "Cancel" button to close form without saving
  11. Click "Save" or "Create" button
  12. Verify success message appears
  13. Verify new department appears in department list
  14. Verify department can be selected when creating users

**Test Notes:**
- Test with admin role (should have permission)
- Test with regular user role (should be forbidden)
- Verify department name uniqueness validation (within branch):
  - Test creating department with same name in same branch (should fail with 409 Conflict)
  - Test creating department with same name in different branch (should succeed)
- Verify department name length validation (1-100 characters)
- Verify description length validation (max 500 characters)
- Verify organization field is mandatory and must be selected
- Verify organization dropdown is populated with available organizations
- Test organization selection:
  - Verify branch dropdown is disabled or empty initially
  - Select organization and verify branch dropdown becomes enabled
  - Verify branch dropdown populates with branches from selected organization
  - Verify branch dropdown shows only branches from the selected organization
  - Change organization and verify branch dropdown is cleared and repopulated
  - Verify branch dropdown filters branches correctly based on organization
- Verify branch field is mandatory and must be selected
- Verify branch dropdown shows only branches from the selected organization
- Test creating department without name (should show validation error)
- Test creating department without organization (should show validation error)
- Test creating department without branch (should show validation error)
- Test branch selection validation:
  - Verify selected branch must belong to selected organization
  - Test selecting branch from different organization (should be prevented or show error)
- Verify Cancel button closes form without saving changes
- Verify Reset button clears all form fields (including organization and branch)
- Test with various department name formats (with spaces, special characters if allowed)
- Verify department is immediately available in dropdown when creating users
- Verify audit log contains department creation details
- Test form validation:
  - Empty name (should show validation error)
  - Name too long (should show validation error)
  - Description too long (should show validation error)
  - Missing organization (should show validation error)
  - Missing branch (should show validation error)
  - Invalid organization (should show 404 error)
  - Invalid branch (should show 404 error)
  - Branch from different organization (should show 422 error)
- Verify appropriate error messages for each validation failure
- Test creating department with same name as existing one in same branch (should fail with 409 Conflict)
- Verify newly created department can be edited immediately after creation
- Verify department belongs to the selected branch
- Verify department shows organization and branch information in response
- Test organization-branch relationship:
  - Select organization A, verify only branches from organization A appear
  - Select organization B, verify only branches from organization B appear
  - Verify branch dropdown correctly filters based on organization selection
  - Test with organizations that have multiple branches
  - Test with organizations that have no branches (branch dropdown should be empty or show appropriate message)

---

### User Story 2: Department Table Functions

**Story ID:** `US-012`  
**Title:** View and Manage Departments in Table View  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to view, search, filter, and manage departments in a table view
So that I can efficiently browse, find, and perform actions on departments
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to User Management > Department page and see departments table
- [ ] AC2: Table displays all departments with columns: ID, Name, Organization, Branch, Description, Users (count), Created On, Actions
- [ ] AC3: Departments are sorted by default alphabetically by name
- [ ] AC4: Search functionality allows searching by department ID, name, description, organization name, or branch name
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: Column filter allows showing/hiding columns (ID, Name, Organization, Branch, Description, Users)
- [ ] AC7: Column filter modal displays checkboxes for each column
- [ ] AC8: "Reset Filters" button in filter modal restores all columns to visible state
- [ ] AC9: Organization filter dropdown allows filtering departments by organization (with "All Organizations" option)
- [ ] AC10: Organization filter is independent of search and works in combination with search
- [ ] AC11: Table supports pagination with configurable page size (default 20 items per page)
- [ ] AC12: Pagination shows current page, total pages, and total count of departments
- [ ] AC13: Table supports sorting by ID (numeric) and Name (alphabetical)
- [ ] AC14: Clicking on department name opens view modal/drawer with department details
- [ ] AC15: Actions column displays Edit and Delete buttons for each department
- [ ] AC16: Edit button opens edit modal with pre-filled department data
- [ ] AC17: Delete button shows confirmation modal before deleting department
- [ ] AC18: Delete button is disabled for departments with users assigned (with tooltip explaining why)
- [ ] AC19: System prevents deleting departments that have users assigned (returns 400 Bad Request error)
- [ ] AC20: Branch column displays branch name for each department
- [ ] AC21: Users column displays the count of users assigned to each department
- [ ] AC22: Users count is clickable and opens a popup/modal showing list of users in that department
- [ ] AC23: User popup/modal displays all users assigned to the department in a table/list format
- [ ] AC24: Each user in the popup shows user details (name, email, role, etc.)
- [ ] AC25: Each user in the popup has a remove action icon/button
- [ ] AC26: Remove action icon/button removes the user from the department when clicked
- [ ] AC27: "Select All" checkbox/option in popup selects all users for removal
- [ ] AC28: Selected users are highlighted/checked in the popup
- [ ] AC29: "Save" button in popup saves the changes (removes selected users from department)
- [ ] AC30: "Reset" button in popup resets the selection to original state (before any changes)
- [ ] AC31: "Cancel" button in popup closes the popup without saving changes
- [ ] AC32: After removing users, user count in table updates automatically
- [ ] AC33: After removing all users, delete button becomes enabled for the department
- [ ] AC34: Export button downloads departments data as CSV file
- [ ] AC35: Exported CSV includes all visible columns and filtered/search results
- [ ] AC36: Refresh/Reload button reloads department list from server
- [ ] AC37: Create Department button is visible in table header and opens department creation modal
- [ ] AC38: Table shows loading state while fetching data
- [ ] AC39: Table displays empty state message when no departments exist
- [ ] AC40: Table displays "No results found" message when search/filter returns no matches
- [ ] AC41: Created On column displays formatted date and time
- [ ] AC42: Description column shows ellipsis (...) for long descriptions
- [ ] AC43: Organization column displays organization name
- [ ] AC44: System handles pagination correctly when filtering/searching (resets to page 1)

**Test Data:**
```json
{
  "sampleDepartments": [
    {
      "id": "dept-001",
      "id": "dept-001",
      "name": "IT Department",
      "organization": "Acme Corporation",
      "branch": "New York Office",
      "description": "Information Technology department",
      "branchName": "New York Office",
      "organizationName": "Acme Corporation",
      "users": 25,
      "createdAt": "2026-01-01T10:00:00.000Z"
    },
    {
      "id": "dept-002",
      "name": "Sales",
      "organization": "Acme Corporation",
      "branch": "New York Office",
      "description": "Sales and marketing department",
      "branchName": "New York Office",
      "organizationName": "Acme Corporation",
      "users": 15,
      "createdAt": "2026-01-02T14:30:00.000Z"
    },
    {
      "id": "dept-003",
      "name": "Engineering",
      "organization": "Tech Solutions Inc",
      "branch": "San Francisco Office",
      "description": "Software development team",
      "branchName": "San Francisco Office",
      "organizationName": "Tech Solutions Inc",
      "users": 30,
      "createdAt": "2026-01-03T09:15:00.000Z"
    },
    {
      "id": "dept-004",
      "name": "HR Department",
      "organization": "Acme Corporation",
      "branch": "Chicago Office",
      "description": "Human resources department",
      "branchName": "Chicago Office",
      "organizationName": "Acme Corporation",
      "users": 8,
      "createdAt": "2026-01-04T11:20:00.000Z"
    }
  ],
  "sampleDepartmentUsers": [
    {
      "departmentId": "dept-001",
      "users": [
        {
          "id": "user-001",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "role": "Developer"
        },
        {
          "id": "user-002",
          "name": "Jane Smith",
          "email": "jane.smith@example.com",
          "role": "Manager"
        }
      ]
    }
  ],
  "searchScenarios": {
    "searchByName": "IT",
    "searchByDescription": "Technology",
    "searchByOrganization": "Acme",
    "searchByBranch": "New York",
    "searchByID": "dept-002",
    "noResults": "NonExistentDept",
    "caseInsensitive": "IT"
  },
  "organizationFilterScenarios": {
    "allOrganizations": "all",
    "acmeCorporation": "Acme Corporation",
    "techSolutions": "Tech Solutions Inc"
  },
  "branchFilterScenarios": {
    "allBranches": "all",
    "newYorkBranch": "New York Office",
    "sanFranciscoBranch": "San Francisco Office"
  },
  "paginationScenarios": {
    "pageSize10": 10,
    "pageSize20": 20,
    "pageSize50": 50,
    "pageSize100": 100
  }
}
```

**API Endpoints:**
- `GET /v1/settings/departments` - List departments with pagination, search, and filtering
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
    - `search` (string, optional) - Search term for name or description
    - `branchId` (string, optional) - Filter by branch ID
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "dept-uuid",
          "name": "IT Department",
          "description": "Information Technology department",
      "branchId": "branch-uuid",
      "branchName": "New York Office",
      "organizationName": "Acme Corporation",
      "users": 25,
      "createdAt": "2026-01-14T00:00:00.000Z",
      "updatedAt": "2026-01-14T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```
- `GET /v1/settings/departments/:id/users` - Get users assigned to a department
  - **Path Parameters:**
    - `id` (string, required) - Department ID
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "user-uuid",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "role": "Developer",
          "isActive": true,
          "organization": {
            "name": "Acme Corporation"
          }
        }
      ],
      "total": 25
    }
    ```
- `PUT /v1/settings/departments/:id/users/remove` - Remove users from department
  - **Path Parameters:**
    - `id` (string, required) - Department ID
  - **Request Body:**
    ```json
    {
      "userIds": ["user-uuid-1", "user-uuid-2"]
    }
    ```
  - **Success Response (200):**
    ```json
    {
      "message": "Users removed from department successfully",
      "removedCount": 2
    }
    ```
  - **Sorting:** Default alphabetical by name
  - **Search:** Searches in name and description fields (case-insensitive), also searches by branch name

**UI Components:**
- Page: `/settings/user-management/department` (Department.tsx)
- Components:
  - **Table Header:**
    - Page title "Departments"
    - Organization filter dropdown (All Organizations, plus list of organizations)
    - Search input field (with SearchOutlined icon)
    - Filter button (FilterOutlined icon) - opens column filter modal
    - Export button (DownloadOutlined icon) - exports to CSV
    - Refresh button (ReloadOutlined icon) - reloads data
    - Create Department button (PlusOutlined icon)
  - **Table:**
    - Columns: ID, Name, Organization, Branch, Description, Users (count), Created On, Actions
    - Sortable columns: ID, Name
    - Clickable department name (opens view modal/drawer)
    - Clickable users count (opens users popup/modal)
    - Actions column: Edit button, Delete button
  - **Column Filter Modal:**
    - Checkboxes for: Show ID, Show Name, Show Organization, Show Branch, Show Description, Show Users
  - **Users Popup/Modal:**
    - Modal title: "Users in [Department Name]"
    - Table/list of users with columns: Name, Email, Role, Organization
    - Each user row has a remove action icon/button
    - "Select All" checkbox at the top
    - Action buttons: Save, Reset, Cancel
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **View Modal/Drawer:** (opened by clicking department name)
    - Department details display
    - Edit button (if in view mode)
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no departments exist
  - **No Results State:** Message when search/filter returns no matches
- User Actions:
  1. Navigate to Settings > User Management > Department
  2. View departments table with all columns (ID, Name, Organization, Branch, Description, Users, Created On, Actions)
  3. Use search box to filter departments by ID, name, description, organization, or branch
  4. Select organization from dropdown to filter departments by organization
  5. Click filter button to show/hide columns (including Organization, Branch, Description, Users)
  6. Click column headers to sort (ID, Name)
  7. Adjust pagination (change page size, navigate pages)
  8. Click department name to view details in modal/drawer
  9. View Organization, Branch, Description, and Users count for each department
  10. Click on Users count to open users popup/modal
  11. In users popup, view list of users assigned to the department
  12. In users popup, click remove icon to mark individual user for removal
  13. In users popup, click "Select All" to select all users for removal
  14. In users popup, click "Save" to remove selected users from department
  15. In users popup, click "Reset" to clear selection and restore original state
  16. In users popup, click "Cancel" to close without saving changes
  17. Verify user count updates after removing users
  18. Click Edit button to edit department
  19. Click Delete button to delete department (with confirmation, disabled if users assigned)
  20. Click Export button to download CSV (includes all visible columns)
  21. Click Refresh button to reload data
  22. Click Create Department button to add new department

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have edit/delete)
- Verify table loads all departments on page load
- Test search functionality:
  - Search by department name (partial and full match)
  - Search by department ID
  - Search by description (partial match)
  - Search by organization name (partial match)
  - Search by branch name (partial match)
  - Case-insensitive search (test with uppercase/lowercase)
  - Search across multiple fields (e.g., search "Acme" should match organization "Acme Corporation", search "New York" should match branch "New York Office")
  - Search with no results
  - Clear search to show all departments
  - Verify search works even when Organization or Branch columns are hidden via column filter
- Test organization filtering:
  - Select "All Organizations" (should show all departments)
  - Select specific organization (should show only departments from branches in that organization)
  - Combine organization filter with search (should filter by both)
- Test column filtering:
  - Hide/show individual columns (ID, Name, Organization, Branch, Description, Users)
  - Apply filters
  - Reset filters to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify filter button shows active state when filters are applied
  - Test filtering each column individually (Organization, Branch, Users, etc.)
- Test sorting:
  - Sort by ID (numeric sorting)
  - Sort by Name (alphabetical sorting)
  - Verify sorting works with filtered/search results
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test actions:
  - Click department name to view details in modal/drawer
  - Click Edit button (should open edit modal)
  - Click Delete button on department with no users (should show confirmation)
  - Click Delete button on department with users (should be disabled with tooltip)
  - Verify delete confirmation modal works correctly
- Test branch column:
  - Verify branch name displays correctly for each department
  - Verify branch name is shown (from branch relationship)
  - Verify branch can be filtered via column filter
  - Verify branch is searchable
- Test users column:
  - Verify user count displays correctly for each department
  - Verify user count is clickable
  - Click on user count to open users popup/modal
  - Verify popup shows correct department name in title
  - Verify popup displays all users assigned to the department
  - Verify user details are shown correctly (name, email, role, organization)
  - Test removing individual user:
    - Click remove icon on a user
    - Verify user is marked for removal (highlighted or checked)
    - Click Save button
    - Verify user is removed from department
    - Verify user count in table updates
    - Verify popup closes after save
  - Test removing multiple users:
    - Click remove icon on multiple users
    - Verify all selected users are marked for removal
    - Click Save button
    - Verify all selected users are removed from department
    - Verify user count in table updates correctly
  - Test "Select All" functionality:
    - Click "Select All" checkbox
    - Verify all users are selected/marked for removal
    - Click Save button
    - Verify all users are removed from department
    - Verify user count becomes 0
    - Verify delete button becomes enabled
  - Test "Reset" button:
    - Select some users for removal
    - Click Reset button
    - Verify selection is cleared
    - Verify users are restored to original state
    - Verify popup remains open
  - Test "Cancel" button:
    - Select some users for removal
    - Click Cancel button
    - Verify popup closes without saving changes
    - Verify user count remains unchanged
    - Verify no users are removed
  - Test popup with no users:
    - Open popup for department with no users
    - Verify empty state message is shown
    - Verify "Select All" is disabled
    - Verify Save button is disabled or hidden
  - Verify user removal is reflected immediately in table
  - Verify departments with no users can be deleted
  - Test attempting to remove users via API (should work correctly)
- Test department deletion restrictions:
  - Verify departments with users cannot be deleted
  - Verify delete button is disabled with appropriate tooltip
  - Verify departments without users can be deleted (after removing all users)
  - Test attempting to delete department with users via API (should return 400 Bad Request error)
- Test organization column:
  - Verify organization name displays correctly for each department
  - Verify organization can be filtered
  - Verify organization name is shown (derived from branch's organization)
- Test description column:
  - Verify description displays correctly
  - Verify long descriptions show ellipsis
  - Verify full description is visible in view modal/drawer
- Test export functionality:
  - Export all departments
  - Export filtered/search results
  - Verify CSV file is downloaded correctly
  - Verify CSV includes correct columns and data (including Organization, Branch, Users)
  - Verify Organization, Branch, and Users columns are included in CSV when column filter shows them
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no departments exist
  - "No results found" when search/filter returns no matches
- Test date formatting in Created On column
- Verify table performance with large number of departments
- Test responsive design (table on different screen sizes)
- Test column visibility persistence (user preferences saved if implemented)
- Verify Create Department button is always visible and functional
- Test department deletion restrictions:
  - Verify departments with users cannot be deleted
  - Verify delete button is disabled with appropriate tooltip
  - Verify departments without users can be deleted

---

### User Story 3: Create/Manage Password Policy

**Story ID:** `US-013'
**Title:** Create and Manage Password Policy at Organization Level  
**Priority:** P0 (Critical)  
**Module:** Settings - Security Policies

**User Story:**
```
As an administrator
I want to create and manage a password policy at the organization level
So that I can enforce consistent password security requirements for all users within the organization
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to Settings > Password Policy page
- [ ] AC2: Password policy form/modal opens with required fields visible
- [ ] AC3: Organization field is mandatory and must be selected from dropdown
- [ ] AC4: System validates that selected organization exists in the system
- [ ] AC5: One organization can have only one password policy (system enforces this constraint)
- [ ] AC6: If password policy already exists for selected organization, form loads existing policy for editing
- [ ] AC7: If password policy does not exist for selected organization, form allows creating new policy
- [ ] AC8: Minimum Password Length field is mandatory and accepts numeric value (1-128 characters)
- [ ] AC9: Minimum Password Length field has default value of 8 characters
- [ ] AC10: System validates minimum length is within valid range (1-128)
- [ ] AC11: Numeric Character Required toggle is available (enabled/disabled, default: disabled)
- [ ] AC12: Lower Case Character Required toggle is available (enabled/disabled, default: enabled)
- [ ] AC13: Upper Case Character Required toggle is available (enabled/disabled, default: disabled)
- [ ] AC14: Special Character Required toggle is available (enabled/disabled, default: disabled)
- [ ] AC15: All character requirement toggles work independently
- [ ] AC16: System validates password policy configuration before submission
- [ ] AC17: Save button saves the password policy configuration for the selected organization
- [ ] AC18: Cancel button closes the form without saving changes
- [ ] AC19: Reset button resets the form to original/organization's existing policy values
- [ ] AC20: Upon successful creation, password policy is created and associated with organization
- [ ] AC21: Upon successful update, password policy is updated and changes are saved
- [ ] AC22: System prevents creating a second password policy for an organization that already has one
- [ ] AC23: If attempting to create duplicate policy, system returns error (409 Conflict) or loads existing policy for editing
- [ ] AC24: System creates an audit log entry for password policy creation/update action
- [ ] AC25: Success message is displayed after password policy is saved
- [ ] AC26: Password policy is immediately effective for all users in the organization
- [ ] AC27: System validates password policy settings when users create/change passwords
- [ ] AC28: Password policy configuration is returned in response including all settings
- [ ] AC29: System returns appropriate error messages for validation failures (missing organization, invalid values)
- [ ] AC30: Password policy can be viewed and edited after creation
- [ ] AC31: Mandatory Password Change After Days field is mandatory and accepts numeric value (minimum 1 day)
- [ ] AC32: Mandatory Password Change After Days field forces users to change their password after the specified number of days
- [ ] AC33: System tracks password creation/change date for each user and enforces mandatory password change based on the policy
- [ ] AC34: When password expiration date is reached, user is forced to change password before accessing the system
- [ ] AC35: Cannot Use Last X Passwords field is mandatory and accepts numeric value (minimum 1 password)
- [ ] AC36: Cannot Use Last X Passwords field prevents users from reusing their previously used passwords
- [ ] AC37: System stores password history for each user (last X passwords as specified in policy)
- [ ] AC38: When user attempts to change password, system validates that new password is not in the stored password history
- [ ] AC39: If user attempts to use a previously used password (within last X passwords), system rejects it with appropriate error message
- [ ] AC40: Notify User Before Password Expiration Days field is mandatory and accepts numeric value (minimum 1 day)
- [ ] AC41: Notify User Before Password Expiration Days field triggers password expiration notifications X days before password expires
- [ ] AC42: System calculates password expiration date based on password creation/change date and mandatory change days
- [ ] AC43: System sends notification to user's bell icon when password expiration is X days away (based on policy setting)
- [ ] AC44: Notification appears in bell icon showing password expiration warning with number of days remaining
- [ ] AC45: Notification continues to appear until user changes password or password expires
- [ ] AC46: All three new settings (Mandatory Change After Days, Cannot Use Last X Passwords, Notify Before Expiration Days) are mandatory fields in the form
- [ ] AC47: System validates all three new settings are provided and are valid numeric values before submission
- [ ] AC48: System returns appropriate error messages if any of the three mandatory settings are missing or invalid

**Test Data:**
```json
{
  "validPasswordPolicy": {
    "organizationId": "org-001",
    "organizationName": "Acme Corporation",
    "minCharacterCount": 12,
    "minNumbers": true,
    "minLowerCaseCharacters": true,
    "minUpperCaseCharacters": true,
    "minSpecialCharacters": true,
    "mandatoryChangeAfterDays": 90,
    "cannotUseLastPasswords": 5,
    "notifyBeforeExpirationDays": 7
  },
  "minimalPasswordPolicy": {
    "organizationId": "org-002",
    "organizationName": "Tech Solutions Inc",
    "minCharacterCount": 8,
    "minNumbers": false,
    "minLowerCaseCharacters": true,
    "minUpperCaseCharacters": false,
    "minSpecialCharacters": false,
    "mandatoryChangeAfterDays": 30,
    "cannotUseLastPasswords": 3,
    "notifyBeforeExpirationDays": 5
  },
  "testScenarios": {
    "minLength": {
      "valid": [8, 12, 16, 20, 128],
      "invalid": [0, -1, 129, 256, "abc"]
    },
    "characterRequirements": {
      "allEnabled": {
        "minNumbers": true,
        "minLowerCaseCharacters": true,
        "minUpperCaseCharacters": true,
        "minSpecialCharacters": true
      },
      "noneEnabled": {
        "minNumbers": false,
        "minLowerCaseCharacters": false,
        "minUpperCaseCharacters": false,
        "minSpecialCharacters": false
      },
      "mixed": {
        "minNumbers": true,
        "minLowerCaseCharacters": true,
        "minUpperCaseCharacters": false,
        "minSpecialCharacters": true
      }
    },
    "mandatoryChangeAfterDays": {
      "valid": [1, 30, 60, 90, 180, 365],
      "invalid": [0, -1, "abc", null]
    },
    "cannotUseLastPasswords": {
      "valid": [1, 3, 5, 10, 20],
      "invalid": [0, -1, "abc", null]
    },
    "notifyBeforeExpirationDays": {
      "valid": [1, 3, 5, 7, 14, 30],
      "invalid": [0, -1, "abc", null]
    }
  },
  "duplicatePolicyScenario": {
    "organizationId": "org-001",
    "message": "Password policy already exists for this organization"
  },
  "testPasswords": {
    "validPassword": {
      "policy": {
        "minCharacterCount": 12,
        "minNumbers": true,
        "minLowerCaseCharacters": true,
        "minUpperCaseCharacters": true,
        "minSpecialCharacters": true
      },
      "passwords": [
        "ValidPass123!",
        "StrongP@ssw0rd",
        "MySecure#2024"
      ]
    },
    "invalidPassword": {
      "policy": {
        "minCharacterCount": 12,
        "minNumbers": true,
        "minLowerCaseCharacters": true,
        "minUpperCaseCharacters": true,
        "minSpecialCharacters": true
      },
      "passwords": [
        "short",
        "noNumbersHere!",
        "NOLOWERCASE123!",
        "NoSpecialChars123",
        "MissingNumber!"
      ]
    }
  }
}
```

**API Endpoints:**
- `GET /v1/settings/password-policies?organizationId={orgId}` - Get password policy for organization
  - **Query Parameters:**
    - `organizationId` (string, required) - Organization ID
  - **Success Response (200):**
    ```json
    {
      "id": "policy-uuid",
      "organizationId": "org-uuid",
      "organizationName": "Acme Corporation",
      "type": "password",
      "configuration": {
        "minCharacterCount": 12,
        "maxCharacterCount": 128,
        "minNumbers": 1,
        "minLowerCaseCharacters": 1,
        "minUpperCaseCharacters": 1,
        "minSpecialCharacters": 1,
        "mandatoryChangeAfterDays": 90,
        "cannotUseLastPasswords": 5,
        "notifyBeforeExpirationDays": 7
      },
      "createdAt": "2026-01-14T00:00:00.000Z",
      "updatedAt": "2026-01-14T00:00:00.000Z"
    }
    ```
  - **Not Found Response (404):**
    ```json
    {
      "error": "Password policy not found for this organization"
    }
    ```
- `POST /v1/settings/password-policies` - Create password policy for organization
  - **Request Body (All fields are mandatory):**
    ```json
    {
      "organizationId": "org-uuid",
      "minCharacterCount": 12,
      "minNumbers": true,
      "minLowerCaseCharacters": true,
      "minUpperCaseCharacters": true,
      "minSpecialCharacters": true,
      "mandatoryChangeAfterDays": 90,
      "cannotUseLastPasswords": 5,
      "notifyBeforeExpirationDays": 7
    }
    ```
  - **Success Response (201):**
    ```json
    {
      "id": "policy-uuid",
      "organizationId": "org-uuid",
      "organizationName": "Acme Corporation",
      "type": "password",
      "configuration": {
        "minCharacterCount": 12,
        "maxCharacterCount": 128,
        "minNumbers": 1,
        "minLowerCaseCharacters": 1,
        "minUpperCaseCharacters": 1,
        "minSpecialCharacters": 1,
        "mandatoryChangeAfterDays": 90,
        "cannotUseLastPasswords": 5,
        "notifyBeforeExpirationDays": 7
      },
      "createdAt": "2026-01-14T00:00:00.000Z",
      "updatedAt": "2026-01-14T00:00:00.000Z"
    }
    ```
  - **Conflict Response (409):**
    ```json
    {
      "error": "Password policy already exists for this organization"
    }
    ```
- `PUT /v1/settings/password-policies/:id` - Update password policy
  - **Path Parameters:**
    - `id` (string, required) - Policy ID
  - **Request Body (All fields are mandatory):**
    ```json
    {
      "minCharacterCount": 14,
      "minNumbers": true,
      "minLowerCaseCharacters": true,
      "minUpperCaseCharacters": true,
      "minSpecialCharacters": true,
      "mandatoryChangeAfterDays": 90,
      "cannotUseLastPasswords": 5,
      "notifyBeforeExpirationDays": 7
    }
    ```
  - **Success Response (200):** Same structure as GET response with updated values

**UI Components:**
- Page: `/settings/password-policy` (PasswordPolicies.tsx)
- Components:
  - **Organization Selector:**
    - Dropdown to select organization (required)
    - Shows all available organizations
    - When organization is selected, loads existing policy if available
  - **Password Policy Form:**
    - **Minimum Password Length:**
      - InputNumber field (1-128)
      - Default value: 8
      - Required field
    - **Character Requirements (Toggle Switches):**
      - Numeric Character Required (default: off)
      - Lower Case Character Required (default: on)
      - Upper Case Character Required (default: off)
      - Special Character Required (default: off)
    - Layout: Two-column grid for character requirements
    - **Mandatory Password Change After Days:**
      - InputNumber field (minimum 1 day)
      - Required field
      - Forces users to change password after specified number of days
    - **Cannot Use Last X Passwords:**
      - InputNumber field (minimum 1 password)
      - Required field
      - Prevents users from reusing previously used passwords
    - **Notify User Before Password Expiration: X Days:**
      - InputNumber field (minimum 1 day)
      - Required field
      - Triggers notification in bell icon X days before password expires
  - **Action Buttons:**
    - Save button (primary) - Saves password policy
    - Reset button (default) - Resets form to original values
    - Cancel button (default) - Closes form without saving
  - **Form States:**
    - Loading state while fetching/updating policy
    - Success message after save
    - Error messages for validation failures
- User Actions:
  1. Navigate to Settings > Password Policy
  2. Select organization from dropdown
  3. If policy exists, form loads with existing policy settings
  4. If policy doesn't exist, form shows default values
  5. Configure minimum password length (1-128 characters)
  6. Toggle character requirements (Numeric, Lower Case, Upper Case, Special Characters)
  7. Configure Mandatory Password Change After Days (required, minimum 1 day)
  8. Configure Cannot Use Last X Passwords (required, minimum 1 password)
  9. Configure Notify User Before Password Expiration Days (required, minimum 1 day)
  10. Click Save button to create/update password policy
  11. Click Reset button to restore original values
  12. Click Cancel button to discard changes
  13. Verify success message appears after save
  14. Verify password policy is enforced for organization users
  15. Verify users are forced to change password after specified days
  16. Verify users cannot reuse last X passwords
  17. Verify password expiration notifications appear in bell icon X days before expiration

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should be forbidden or view-only)
- Verify organization selection is mandatory:
  - Test submitting form without selecting organization (should show validation error)
  - Test selecting invalid organization (should show error)
- Test one policy per organization constraint:
  - Create password policy for organization A
  - Attempt to create second password policy for organization A (should fail with 409 Conflict or load existing)
  - Verify only one policy can exist per organization
  - Create password policy for organization B (should succeed)
  - Verify organization A and B have separate policies
- Test creating new password policy:
  - Select organization without existing policy
  - Configure password policy settings
  - Click Save
  - Verify policy is created successfully
  - Verify success message is displayed
  - Verify policy is returned in response
- Test editing existing password policy:
  - Select organization with existing policy
  - Verify form loads with existing policy values
  - Modify settings
  - Click Save
  - Verify policy is updated successfully
  - Verify changes are persisted
- Test minimum password length validation:
  - Test valid values: 8, 12, 16, 20, 128
  - Test invalid values: 0, negative, 129, 256, non-numeric
  - Verify appropriate error messages are shown
- Test character requirement toggles:
  - Test enabling/disabling each toggle independently
  - Test all combinations of requirements
  - Test with all requirements enabled
  - Test with all requirements disabled
  - Test with mixed requirements
  - Verify toggles work correctly
- Test form actions:
  - Test Save button saves changes successfully
  - Test Reset button restores original values
  - Test Cancel button closes form without saving
  - Verify form state is maintained correctly
- Test password policy enforcement:
  - Create/update password policy with specific requirements
  - Test user password creation/change with policy
  - Verify passwords that meet requirements are accepted
  - Verify passwords that don't meet requirements are rejected
  - Test with various password combinations
- Test edge cases:
  - Test with minimum values (minLength: 1, all requirements disabled)
  - Test with maximum values (minLength: 128, all requirements enabled)
  - Test with organization that has many users
  - Test updating policy while users are changing passwords
- Verify audit logging:
  - Verify audit log contains password policy creation entry
  - Verify audit log contains password policy update entry
  - Verify user information is logged correctly
- Test error handling:
  - Test with network errors
  - Test with invalid organization ID
  - Test with server errors
  - Verify appropriate error messages are shown
- Test UI responsiveness:
  - Test form on different screen sizes
  - Verify layout is correct
  - Verify toggles and inputs are accessible
- Test data persistence:
  - Create password policy and reload page (should load saved policy)
  - Update password policy and verify changes persist
  - Verify policy is available across sessions
- Test Mandatory Password Change After Days setting:
  - Test valid values: 1, 30, 60, 90, 180, 365 days
  - Test invalid values: 0, negative, non-numeric
  - Verify field is mandatory (cannot submit without value)
  - Create policy with 90 days mandatory change
  - Set user password and verify password expiration date is set (90 days from now)
  - Simulate 90 days passing and verify user is forced to change password
  - Test that user cannot access system until password is changed after expiration
  - Test that user can change password before expiration (voluntary change)
  - Verify password expiration date updates when user changes password
  - Test with different values (30, 60, 180 days) and verify enforcement
- Test Cannot Use Last X Passwords setting:
  - Test valid values: 1, 3, 5, 10, 20 passwords
  - Test invalid values: 0, negative, non-numeric
  - Verify field is mandatory (cannot submit without value)
  - Create policy with "Cannot Use Last 5 Passwords"
  - Test user password change workflow:
    - User changes password from "OldPass123!" to "NewPass123!"
    - Verify system stores old password in history
    - Attempt to change password back to "OldPass123!" (should fail with error)
    - Verify error message indicates password was recently used
    - Change password to "SecondPass123!" and verify success
    - Attempt to change to "OldPass123!" (should still fail, within last 5)
    - Continue changing passwords 4 more times with different passwords
    - After 5th new password, attempt to change back to original "OldPass123!"
    - If policy allows (beyond history), should succeed; if still in last 5, should fail
  - Test with different history sizes (3, 10 passwords) and verify enforcement
  - Verify password history is maintained per user
  - Test that password history is cleared when policy is updated (if applicable)
- Test Notify User Before Password Expiration Days setting:
  - Test valid values: 1, 3, 5, 7, 14, 30 days
  - Test invalid values: 0, negative, non-numeric
  - Verify field is mandatory (cannot submit without value)
  - Create policy with "Notify Before Expiration: 7 days" and "Mandatory Change: 90 days"
  - Set user password (expires in 90 days)
  - Calculate notification date (90 - 7 = 83 days from password set)
  - Simulate 83 days passing and verify notification appears in bell icon
  - Verify notification message indicates password will expire in 7 days
  - Verify notification continues to appear daily until password is changed or expires
  - Test with different notification periods (3, 5, 14 days) and verify timing
  - Verify notification disappears after user changes password (new expiration date calculated)
  - Test that notification countdown updates daily (e.g., "Password expires in 6 days", "5 days", etc.)
  - Test multiple users with different password expiration dates receive notifications correctly
  - Verify notification is clickable and provides option to change password
- Test all three new mandatory settings together:
  - Create policy with all settings configured (e.g., Change After 90 days, Last 5 passwords, Notify 7 days before)
  - Verify all three fields are required and validated
  - Test user workflow:
    - User creates/changes password
    - User receives notification 7 days before expiration (on day 83)
    - User attempts to change password but uses one of last 5 passwords (should fail)
    - User changes to new password (success)
    - After 90 days, user is forced to change password
    - Verify all three policies are enforced correctly together
- Test edge cases for new settings:
  - Test with minimum values (1 day, 1 password, 1 day notification)
  - Test with maximum reasonable values (365 days, 20 passwords, 30 days notification)
  - Test that notify days cannot exceed mandatory change days (if validation required)
  - Test policy update scenarios:
    - Update "Mandatory Change After Days" and verify existing user expiration dates are recalculated
    - Update "Cannot Use Last X Passwords" and verify password history is adjusted accordingly
    - Update "Notify Before Expiration Days" and verify notification timing is updated
- Test error handling for new settings:
  - Test submitting form without "Mandatory Change After Days" (should show validation error)
  - Test submitting form without "Cannot Use Last X Passwords" (should show validation error)
  - Test submitting form without "Notify Before Expiration Days" (should show validation error)
  - Test with invalid values (negative, zero, non-numeric) and verify appropriate error messages
  - Test API returns 400 Bad Request if any mandatory field is missing or invalid

---

### User Story 4: Change Password

**Story ID:** `US-014`  
**Title:** Change User Password  
**Priority:** P0 (Critical)  
**Module:** Auth - User Profile

**User Story:**
```
As a user
I want to change my password through my avatar menu
So that I can maintain account security and update my password when needed
```

**Acceptance Criteria:**
- [ ] AC1: User can see avatar icon in the top right corner of the application
- [ ] AC2: Clicking on avatar icon opens a dropdown/list menu with options
- [ ] AC3: "Change Password" option is available in the avatar dropdown menu
- [ ] AC4: Clicking "Change Password" option opens a popup/modal for password change
- [ ] AC5: Password change popup displays form with required fields:
  - Current Password field (password input, required)
  - New Password field (password input, required)
  - Confirm New Password field (password input, required)
- [ ] AC6: Password policy is displayed in the popup showing:
  - Minimum password length requirement
  - Character requirements (numeric, lowercase, uppercase, special characters)
  - Any other policy requirements from organization's password policy
- [ ] AC7: Current Password field is mandatory and must match user's current password
- [ ] AC8: System validates current password before allowing password change
- [ ] AC9: If current password is incorrect, system shows validation error and prevents submission
- [ ] AC10: New Password field is mandatory and must meet organization's password policy requirements
- [ ] AC11: System validates new password against password policy (minimum length, character requirements)
- [ ] AC12: New password must not match any of the last X passwords (based on "Cannot Use Last X Passwords" policy)
- [ ] AC13: If new password doesn't meet policy requirements, system shows validation error with specific requirements
- [ ] AC14: If new password is in password history, system shows error indicating password was recently used
- [ ] AC15: Confirm New Password field is mandatory and must exactly match New Password field
- [ ] AC16: System validates that Confirm New Password matches New Password field
- [ ] AC17: If Confirm New Password doesn't match New Password, system shows validation error
- [ ] AC18: Password policy display updates dynamically when organization's password policy changes
- [ ] AC19: Save button is available in the popup form
- [ ] AC20: Save button is enabled only when all required fields are filled and valid
- [ ] AC21: Clicking Save button validates all fields and current password
- [ ] AC22: Upon successful validation, system changes user's password
- [ ] AC23: System updates password change date for calculating password expiration (based on "Mandatory Change After Days" policy)
- [ ] AC24: System adds old password to password history (based on "Cannot Use Last X Passwords" policy)
- [ ] AC25: System clears password expiration notification (if password changed before expiration)
- [ ] AC26: Success message is displayed after password is changed successfully
- [ ] AC27: Popup closes automatically after successful password change
- [ ] AC28: User is logged out and must log in again with new password (if security policy requires)
- [ ] AC29: Reset button is available in the popup form
- [ ] AC30: Clicking Reset button clears all password fields (Current Password, New Password, Confirm New Password)
- [ ] AC31: Reset button restores form to empty state
- [ ] AC32: Cancel button is available in the popup form
- [ ] AC33: Clicking Cancel button closes the popup without saving changes
- [ ] AC34: Clicking Cancel button discards any entered password information
- [ ] AC35: System creates an audit log entry for password change action
- [ ] AC36: System returns appropriate error messages for validation failures:
  - Current password incorrect
  - New password doesn't meet policy requirements
  - New password is in password history
  - Confirm password doesn't match new password
- [ ] AC37: Password fields show/hide toggle (eye icon) for password visibility
- [ ] AC38: Password change functionality is available to all authenticated users
- [ ] AC39: User cannot change password while forced password change dialog is active (separate flow)
- [ ] AC40: Password change popup is accessible and responsive on different screen sizes

**Test Data:**
```json
{
  "validPasswordChange": {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePass456!",
    "confirmPassword": "NewSecurePass456!"
  },
  "incorrectCurrentPassword": {
    "currentPassword": "WrongPassword123!",
    "newPassword": "NewSecurePass456!",
    "confirmPassword": "NewSecurePass456!"
  },
  "passwordMismatch": {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePass456!",
    "confirmPassword": "DifferentPassword789!"
  },
  "passwordPolicyViolation": {
    "currentPassword": "OldPassword123!",
    "newPassword": "short",
    "confirmPassword": "short"
  },
  "passwordHistoryViolation": {
    "currentPassword": "CurrentPass123!",
    "newPassword": "OldPassword123!",
    "confirmPassword": "OldPassword123!"
  },
  "testScenarios": {
    "emptyFields": {
      "currentPassword": "",
      "newPassword": "",
      "confirmPassword": ""
    },
    "missingCurrentPassword": {
      "currentPassword": "",
      "newPassword": "NewPass123!",
      "confirmPassword": "NewPass123!"
    },
    "missingNewPassword": {
      "currentPassword": "OldPass123!",
      "newPassword": "",
      "confirmPassword": ""
    },
    "missingConfirmPassword": {
      "currentPassword": "OldPass123!",
      "newPassword": "NewPass123!",
      "confirmPassword": ""
    },
    "passwordTooShort": {
      "currentPassword": "OldPass123!",
      "newPassword": "Short1!",
      "confirmPassword": "Short1!"
    },
    "passwordMissingNumbers": {
      "currentPassword": "OldPass123!",
      "newPassword": "NoNumbersHere!",
      "confirmPassword": "NoNumbersHere!"
    },
    "passwordMissingLowercase": {
      "currentPassword": "OldPass123!",
      "newPassword": "NOLOWERCASE123!",
      "confirmPassword": "NOLOWERCASE123!"
    },
    "passwordMissingUppercase": {
      "currentPassword": "OldPass123!",
      "newPassword": "nouppercase123!",
      "confirmPassword": "nouppercase123!"
    },
    "passwordMissingSpecialChars": {
      "currentPassword": "OldPass123!",
      "newPassword": "NoSpecialChars123",
      "confirmPassword": "NoSpecialChars123"
    }
  },
  "passwordPolicyExample": {
    "minCharacterCount": 12,
    "minNumbers": true,
    "minLowerCaseCharacters": true,
    "minUpperCaseCharacters": true,
    "minSpecialCharacters": true,
    "cannotUseLastPasswords": 5,
    "mandatoryChangeAfterDays": 90,
    "notifyBeforeExpirationDays": 7
  }
}
```

**API Endpoints:**
- `GET /v1/auth/me/password-policy` - Get password policy for current user's organization
  - **Success Response (200):**
    ```json
    {
      "organizationId": "org-uuid",
      "passwordPolicy": {
        "minCharacterCount": 12,
        "minNumbers": true,
        "minLowerCaseCharacters": true,
        "minUpperCaseCharacters": true,
        "minSpecialCharacters": true,
        "mandatoryChangeAfterDays": 90,
        "cannotUseLastPasswords": 5,
        "notifyBeforeExpirationDays": 7
      }
    }
    ```
- `PUT /v1/auth/me/password` - Change password for current user
  - **Request Body:**
    ```json
    {
      "currentPassword": "OldPassword123!",
      "newPassword": "NewSecurePass456!",
      "confirmPassword": "NewSecurePass456!"
    }
    ```
  - **Success Response (200):**
    ```json
    {
      "message": "Password changed successfully",
      "passwordExpiresAt": "2026-04-14T00:00:00.000Z",
      "requiresReauthentication": true
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Invalid input data, password doesn't meet policy, password mismatch
    - `401 Unauthorized` - Current password is incorrect
    - `403 Forbidden` - Password is in history (cannot use last X passwords)
    - `422 Unprocessable Entity` - Validation errors (fields don't match, policy violations)

**UI Components:**
- Avatar Icon: Top right corner of application header/navbar
- Avatar Dropdown Menu: Appears when clicking avatar icon
  - Menu items:
    - User profile information
    - Change Password option
    - Logout option
    - Other user menu options
- Change Password Popup/Modal:
  - Modal title: "Change Password"
  - Form fields:
    - **Current Password:** Password input field (required, with show/hide toggle)
    - **New Password:** Password input field (required, with show/hide toggle)
    - **Confirm New Password:** Password input field (required, with show/hide toggle)
  - **Password Policy Display:**
    - Section showing password requirements
    - Minimum password length
    - Character requirements checklist/indicators:
      - ✓/✗ Minimum X characters
      - ✓/✗ Numeric character required
      - ✓/✗ Lowercase character required
      - ✓/✗ Uppercase character required
      - ✓/✗ Special character required
    - Policy updates dynamically as user types new password
  - **Action Buttons:**
    - Save button (primary) - Validates and saves new password
    - Reset button (default) - Clears all password fields
    - Cancel button (default) - Closes popup without saving
  - **Validation Messages:**
    - Error messages for current password incorrect
    - Error messages for password policy violations
    - Error messages for password history violations
    - Error messages for password mismatch
    - Success message after password change
  - **Form States:**
    - Loading state while validating and saving
    - Disabled state for Save button until all fields are valid
- User Actions:
  1. Click avatar icon in top right corner
  2. Select "Change Password" option from dropdown menu
  3. Change Password popup appears
  4. View password policy requirements displayed in popup
  5. Enter current password (required)
  6. Enter new password (required) - verify password policy indicators update
  7. Enter confirm new password (required) - verify it matches new password
  8. Verify password policy requirements are met (all checkmarks/indicators show satisfied)
  9. (Optional) Click Reset button to clear all fields
  10. (Optional) Click Cancel button to close popup without saving
  11. Click Save button to change password
  12. Verify success message appears
  13. Verify popup closes automatically
  14. Verify user is logged out (if required by security policy)
  15. Log in again with new password

**Test Notes:**
- Test with authenticated user (all users should be able to change their own password)
- Test avatar icon visibility and functionality:
  - Verify avatar icon is visible in top right corner
  - Verify clicking avatar opens dropdown menu
  - Verify "Change Password" option is available in menu
- Test password change popup:
  - Verify popup opens when "Change Password" is clicked
  - Verify all form fields are visible and empty initially
  - Verify password policy is displayed correctly
  - Verify Save, Reset, and Cancel buttons are present
- Test current password validation:
  - Enter correct current password (should accept)
  - Enter incorrect current password (should show error: "Current password is incorrect")
  - Leave current password empty (should show validation error)
  - Test with various incorrect passwords (wrong case, typos, etc.)
- Test new password validation:
  - Test password policy enforcement:
    - Password too short (should show error with minimum length requirement)
    - Password missing numbers (if required by policy)
    - Password missing lowercase (if required by policy)
    - Password missing uppercase (if required by policy)
    - Password missing special characters (if required by policy)
  - Test password history enforcement:
    - Attempt to use password from history (should show error: "This password was recently used. Please choose a different password")
    - Verify error message indicates how many passwords are in history
    - Test with different history sizes (3, 5, 10 passwords)
  - Verify password policy indicators update in real-time as user types
  - Verify all policy requirements show as satisfied when valid password is entered
- Test confirm password validation:
  - Enter matching confirm password (should accept)
  - Enter non-matching confirm password (should show error: "Passwords do not match")
  - Leave confirm password empty (should show validation error)
  - Test with various mismatches (case differences, extra characters, etc.)
- Test form actions:
  - Test Save button:
    - Save with valid passwords (should succeed)
    - Save with invalid current password (should fail)
    - Save with password policy violations (should fail)
    - Save with password in history (should fail)
    - Save with mismatched passwords (should fail)
    - Verify Save button is disabled until all fields are valid
    - Verify loading state during password change
    - Verify success message after password change
    - Verify popup closes after successful save
  - Test Reset button:
    - Enter passwords in all fields
    - Click Reset button
    - Verify all fields are cleared
    - Verify form returns to initial empty state
  - Test Cancel button:
    - Enter passwords in all fields
    - Click Cancel button
    - Verify popup closes without saving
    - Verify password is not changed
    - Reopen popup and verify fields are empty
- Test password policy display:
  - Verify policy requirements are shown correctly
  - Verify policy matches user's organization policy
  - Verify policy updates when organization policy changes
  - Verify policy indicators (checkmarks/X marks) update as user types
  - Test with different password policies (strict vs. lenient)
- Test password visibility toggle:
  - Test show/hide toggle for Current Password field
  - Test show/hide toggle for New Password field
  - Test show/hide toggle for Confirm New Password field
  - Verify passwords are hidden by default
  - Verify toggles work independently for each field
- Test password change workflow:
  - Change password successfully
  - Verify password expiration date is updated (based on "Mandatory Change After Days" policy)
  - Verify old password is added to password history
  - Verify password expiration notification is cleared (if password changed before expiration)
  - Log out and verify can log in with new password
  - Verify cannot log in with old password
  - Attempt to change password again using old password as new password (should fail if in history)
- Test security scenarios:
  - Verify user cannot change another user's password
  - Verify audit log contains password change entry with user ID and timestamp
  - Test forced password change scenario (separate from voluntary change)
  - Verify user must log in again after password change (if policy requires)
- Test error handling:
  - Test with network errors during password change
  - Test with server errors
  - Verify appropriate error messages are shown
  - Verify form remains usable after errors
- Test UI responsiveness:
  - Test popup on different screen sizes
  - Verify layout is correct on mobile and desktop
  - Verify all fields and buttons are accessible
  - Test keyboard navigation through form fields
- Test edge cases:
  - Test with maximum password length
  - Test with all password policy requirements enabled
  - Test with minimal password policy requirements
  - Test changing password multiple times rapidly
  - Test password change when password expiration notification is active
- Test integration with password policy (US-013):
  - Verify all password policy settings are enforced
  - Test with different organization password policies
  - Verify "Mandatory Change After Days" calculation updates correctly
  - Verify "Cannot Use Last X Passwords" is enforced correctly
  - Verify "Notify Before Expiration Days" notifications are cleared after password change

---

### User Story 5: Add Device Credential

**Story ID:** `US-015`  
**Title:** Add Device Credential for Discovery and Access  
**Priority:** P0 (Critical)  
**Module:** Discovery - Device Credentials

**User Story:**
```
As an administrator
I want to add device credentials for different connection types
So that I can authenticate and access devices during discovery and patching operations
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to Discovery > Device Credentials page
- [ ] AC2: "Add Device Credential" or "Create Credential" button is available on the Device Credentials page
- [ ] AC3: Clicking the button opens a modal/drawer form for adding a new device credential
- [ ] AC4: Credential Name field is mandatory and accepts 1-100 characters
- [ ] AC5: Credential Type field is mandatory and allows selection from dropdown: SSH, Windows, SNMP, WinRM
- [ ] AC6: System displays credential-specific fields based on selected type:
  - **SSH:**
    - Username (optional)
    - Password (optional, encrypted)
    - Port (optional, default: 22)
    - Description (optional)
  - **Windows:**
    - Username (optional)
    - Password (optional, encrypted)
    - Domain (optional)
    - Port (optional, default: 5985/5986 for WinRM)
    - Description (optional)
  - **WinRM:**
    - Username (optional)
    - Password (optional, encrypted)
    - Domain (optional)
    - Port (optional, default: 5985/5986)
    - Description (optional)
  - **SNMP:**
    - SNMP Community (optional, for v2c)
    - SNMP Version (optional, dropdown: v2c, v3)
    - **When SNMP v3 is selected, additional fields appear:**
      - Username (optional, for v3)
      - Context Name (optional, for v3)
      - Security Level (dropdown, required for v3, options: "No Authentication/No Privacy", "Authentication/No Privacy", "Authentication/Privacy")
      - **When "Authentication/No Privacy" is selected:**
        - Authentication Protocol (dropdown, required, options: MD5, SHA, SHA-224, SHA-256, SHA-384, SHA-512)
        - Authentication Password (required, password input, encrypted)
      - **When "Authentication/Privacy" is selected:**
        - Authentication Protocol (dropdown, required, options: MD5, SHA, SHA-224, SHA-256, SHA-384, SHA-512)
        - Authentication Password (required, password input, encrypted)
        - Privacy Protocol (dropdown, required, options: DES, AES/AES-128, AES-192, AES-192C, AES-256, AES-256C)
        - Privacy Password (required, password input, encrypted)
    - Port (optional, default: 161)
    - Description (optional)
- [ ] AC7: Username field accepts up to 100 characters (optional for SSH, Windows, WinRM, and SNMP v3)
- [ ] AC8: Password field is a password input type with show/hide toggle (optional for SSH, Windows, WinRM)
- [ ] AC9: Password is encrypted using AES-256 before storage (never stored in plain text)
- [ ] AC10: Domain field accepts up to 100 characters (optional, for Windows/WinRM only)
- [ ] AC11: Port field accepts numeric values (optional, with type-specific defaults)
- [ ] AC12: SNMP Community field accepts up to 100 characters (optional, for SNMP only)
- [ ] AC13: SNMP Version dropdown allows selection of v2c or v3 (optional, for SNMP only)
- [ ] AC14: When SNMP v3 is selected, Username and Context Name fields appear (both optional)
- [ ] AC15: When SNMP v3 is selected, Security Level dropdown appears (required, with 3 options)
- [ ] AC16: Security Level "No Authentication/No Privacy" requires no additional fields
- [ ] AC17: Security Level "Authentication/No Privacy" shows Authentication Protocol dropdown and Authentication Password field (both required)
- [ ] AC18: Security Level "Authentication/Privacy" shows Authentication Protocol, Authentication Password, Privacy Protocol dropdown, and Privacy Password field (all required)
- [ ] AC19: Authentication Protocol dropdown includes options: MD5, SHA, SHA-224, SHA-256, SHA-384, SHA-512
- [ ] AC20: Privacy Protocol dropdown includes options: DES, AES/AES-128, AES-192, AES-192C, AES-256, AES-256C
- [ ] AC21: Authentication Password and Privacy Password fields are password input types with show/hide toggle
- [ ] AC22: Authentication Password and Privacy Password are encrypted using AES-256 before storage
- [ ] AC23: Form dynamically shows/hides SNMP v3 fields based on Security Level selection
- [ ] AC24: When Security Level changes, appropriate fields are shown/hidden dynamically
- [ ] AC25: When SNMP Version changes from v3 to v2c, all v3-specific fields are hidden
- [ ] AC26: When SNMP Version changes from v2c to v3, v3-specific fields appear
- [ ] AC27: Description field accepts up to 500 characters (optional)
- [ ] AC28: System validates credential name is unique (prevents duplicate names)
- [ ] AC29: System validates port number is within valid range (1-65535) if provided
- [ ] AC30: Form dynamically shows/hides fields based on selected credential type and SNMP v3 security level
- [ ] AC31: Save button is available in the form
- [ ] AC32: Save button is enabled when required fields are filled (Name, Type, and SNMP v3 Security Level fields if applicable)
- [ ] AC33: Reset button is available in the form
- [ ] AC34: Reset button clears all form fields and resets to default state (including SNMP v3 fields)
- [ ] AC35: Cancel button is available in the form
- [ ] AC36: Cancel button closes the form without saving changes
- [ ] AC37: Upon successful creation, device credential is saved with encrypted passwords (all password fields)
- [ ] AC38: System creates an audit log entry for credential creation action
- [ ] AC39: Success message is displayed after credential is created
- [ ] AC40: Form closes automatically after successful creation
- [ ] AC41: Device Credentials list is refreshed to show newly created credential
- [ ] AC42: Created credential is immediately available for selection in IP Range discovery configuration
- [ ] AC43: System returns appropriate error messages for validation failures:
  - Duplicate credential name (409 Conflict)
  - Invalid port number (400 Bad Request)
  - Missing required fields (400 Bad Request)
  - Missing SNMP v3 Security Level fields when required
- [ ] AC44: Password fields (including Authentication Password and Privacy Password) are never returned in API responses (for security)
- [ ] AC45: System tracks credential creator (createdBy field stores user ID)
- [ ] AC46: Created credential shows in credential list with name, type, username (if applicable), last used date, and created date

**Test Data:**
```json
{
  "validSSHCredential": {
    "name": "Linux Server SSH",
    "type": "SSH",
    "username": "admin",
    "password": "SecurePass123!",
    "port": 22,
    "description": "SSH credentials for Linux servers"
  },
  "validWindowsCredential": {
    "name": "Windows Server Credentials",
    "type": "Windows",
    "username": "administrator",
    "password": "WindowsPass123!",
    "domain": "CORP",
    "port": 5985,
    "description": "Windows server access credentials"
  },
  "validWinRMCredential": {
    "name": "WinRM Server Access",
    "type": "WinRM",
    "username": "admin",
    "password": "WinRMPass123!",
    "domain": "DOMAIN",
    "port": 5986,
    "description": "WinRM credentials for remote management"
  },
  "validSNMPCredential": {
    "name": "SNMP Read Community",
    "type": "SNMP",
    "snmpCommunity": "public",
    "snmpVersion": "v2c",
    "port": 161,
    "description": "SNMP community for device monitoring"
  },
  "minimalCredential": {
    "name": "Basic SSH",
    "type": "SSH"
  },
  "duplicateName": {
    "name": "Linux Server SSH",
    "type": "SSH",
    "username": "admin",
    "password": "DifferentPass123!"
  },
  "invalidPort": {
    "name": "Invalid Port SSH",
    "type": "SSH",
    "username": "admin",
    "password": "Pass123!",
    "port": 70000
  },
  "missingName": {
    "type": "SSH",
    "username": "admin",
    "password": "Pass123!"
  },
  "missingType": {
    "name": "No Type Credential",
    "username": "admin",
    "password": "Pass123!"
  },
  "testScenarios": {
    "sshCredentials": {
      "withUsernamePassword": {
        "name": "SSH with Creds",
        "type": "SSH",
        "username": "user",
        "password": "pass123",
        "port": 22
      },
      "withoutCredentials": {
        "name": "SSH without Creds",
        "type": "SSH",
        "port": 2222
      },
      "customPort": {
        "name": "SSH Custom Port",
        "type": "SSH",
        "username": "admin",
        "password": "pass123",
        "port": 2222
      }
    },
    "windowsCredentials": {
      "withDomain": {
        "name": "Windows Domain",
        "type": "Windows",
        "username": "admin",
        "password": "pass123",
        "domain": "CORP"
      },
      "withoutDomain": {
        "name": "Windows Local",
        "type": "Windows",
        "username": "administrator",
        "password": "pass123"
      }
    },
    "snmpCredentials": {
      "v2c": {
        "name": "SNMP v2c",
        "type": "SNMP",
        "snmpCommunity": "public",
        "snmpVersion": "v2c",
        "port": 161
      },
      "v3NoAuthNoPriv": {
        "name": "SNMP v3 No Auth No Priv",
        "type": "SNMP",
        "snmpVersion": "v3",
        "username": "snmpuser",
        "contextName": "context1",
        "securityLevel": "No Authentication/No Privacy",
        "port": 161
      },
      "v3AuthNoPriv": {
        "name": "SNMP v3 Auth No Priv",
        "type": "SNMP",
        "snmpVersion": "v3",
        "username": "snmpuser",
        "contextName": "context1",
        "securityLevel": "Authentication/No Privacy",
        "authenticationProtocol": "SHA-256",
        "authenticationPassword": "AuthPass123!",
        "port": 161
      },
      "v3AuthPriv": {
        "name": "SNMP v3 Auth Priv",
        "type": "SNMP",
        "snmpVersion": "v3",
        "username": "snmpuser",
        "contextName": "context1",
        "securityLevel": "Authentication/Privacy",
        "authenticationProtocol": "SHA-256",
        "authenticationPassword": "AuthPass123!",
        "privacyProtocol": "AES-256",
        "privacyPassword": "PrivPass123!",
        "port": 161
      },
      "v3Minimal": {
        "name": "SNMP v3 Minimal",
        "type": "SNMP",
        "snmpVersion": "v3",
        "securityLevel": "No Authentication/No Privacy"
      },
      "withoutVersion": {
        "name": "SNMP Default",
        "type": "SNMP",
        "snmpCommunity": "public"
      }
    },
    "snmpV3TestScenarios": {
      "allAuthProtocols": {
        "md5": {
          "name": "SNMP v3 MD5",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/No Privacy",
          "authenticationProtocol": "MD5",
          "authenticationPassword": "MD5Pass123!"
        },
        "sha": {
          "name": "SNMP v3 SHA",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/No Privacy",
          "authenticationProtocol": "SHA",
          "authenticationPassword": "SHAPass123!"
        },
        "sha224": {
          "name": "SNMP v3 SHA-224",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/No Privacy",
          "authenticationProtocol": "SHA-224",
          "authenticationPassword": "SHA224Pass123!"
        },
        "sha256": {
          "name": "SNMP v3 SHA-256",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/No Privacy",
          "authenticationProtocol": "SHA-256",
          "authenticationPassword": "SHA256Pass123!"
        },
        "sha384": {
          "name": "SNMP v3 SHA-384",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/No Privacy",
          "authenticationProtocol": "SHA-384",
          "authenticationPassword": "SHA384Pass123!"
        },
        "sha512": {
          "name": "SNMP v3 SHA-512",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/No Privacy",
          "authenticationProtocol": "SHA-512",
          "authenticationPassword": "SHA512Pass123!"
        }
      },
      "allPrivacyProtocols": {
        "des": {
          "name": "SNMP v3 DES",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/Privacy",
          "authenticationProtocol": "SHA-256",
          "authenticationPassword": "AuthPass123!",
          "privacyProtocol": "DES",
          "privacyPassword": "DESPass123!"
        },
        "aes128": {
          "name": "SNMP v3 AES-128",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/Privacy",
          "authenticationProtocol": "SHA-256",
          "authenticationPassword": "AuthPass123!",
          "privacyProtocol": "AES/AES-128",
          "privacyPassword": "AES128Pass123!"
        },
        "aes192": {
          "name": "SNMP v3 AES-192",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/Privacy",
          "authenticationProtocol": "SHA-256",
          "authenticationPassword": "AuthPass123!",
          "privacyProtocol": "AES-192",
          "privacyPassword": "AES192Pass123!"
        },
        "aes192c": {
          "name": "SNMP v3 AES-192C",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/Privacy",
          "authenticationProtocol": "SHA-256",
          "authenticationPassword": "AuthPass123!",
          "privacyProtocol": "AES-192C",
          "privacyPassword": "AES192CPass123!"
        },
        "aes256": {
          "name": "SNMP v3 AES-256",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/Privacy",
          "authenticationProtocol": "SHA-256",
          "authenticationPassword": "AuthPass123!",
          "privacyProtocol": "AES-256",
          "privacyPassword": "AES256Pass123!"
        },
        "aes256c": {
          "name": "SNMP v3 AES-256C",
          "type": "SNMP",
          "snmpVersion": "v3",
          "securityLevel": "Authentication/Privacy",
          "authenticationProtocol": "SHA-256",
          "authenticationPassword": "AuthPass123!",
          "privacyProtocol": "AES-256C",
          "privacyPassword": "AES256CPass123!"
        }
      }
    }
  }
}
```

**API Endpoints:**
- `POST /v1/discovery/credentials` - Create a new device credential
  - **Request Body:**
    ```json
    {
      "name": "Linux Server SSH",
      "type": "SSH",
      "username": "admin",
      "password": "SecurePass123!",
      "port": 22,
      "description": "SSH credentials for Linux servers"
    }
    ```
    **Note:** Fields vary by type:
    - SSH/Windows/WinRM: name, type, username?, password?, domain? (Windows/WinRM), port?, description?
    - SNMP v2c: name, type, snmpCommunity?, snmpVersion: "v2c", port?, description?
    - SNMP v3: name, type, snmpVersion: "v3", username?, contextName?, securityLevel, authenticationProtocol? (if securityLevel requires auth), authenticationPassword? (if securityLevel requires auth), privacyProtocol? (if securityLevel requires privacy), privacyPassword? (if securityLevel requires privacy), port?, description?
      - securityLevel: "No Authentication/No Privacy" | "Authentication/No Privacy" | "Authentication/Privacy"
      - authenticationProtocol: "MD5" | "SHA" | "SHA-224" | "SHA-256" | "SHA-384" | "SHA-512" (required if securityLevel includes Authentication)
      - privacyProtocol: "DES" | "AES/AES-128" | "AES-192" | "AES-192C" | "AES-256" | "AES-256C" (required if securityLevel includes Privacy)
  - **Success Response (201):**
    ```json
    {
      "id": "credential-uuid",
      "name": "Linux Server SSH",
      "type": "SSH",
      "username": "admin",
      "domain": null,
      "snmpCommunity": null,
      "snmpVersion": null,
      "snmpUsername": null,
      "snmpContextName": null,
      "snmpSecurityLevel": null,
      "snmpAuthenticationProtocol": null,
      "snmpPrivacyProtocol": null,
      "port": 22,
      "description": "SSH credentials for Linux servers",
      "lastUsed": null,
      "createdBy": "user-uuid",
      "createdAt": "2026-01-14T00:00:00.000Z",
      "updatedAt": "2026-01-14T00:00:00.000Z"
    }
    ```
    **Note:** 
    - Password fields (password, authenticationPassword, privacyPassword) are never returned in response for security
    - SNMP v3 fields are only populated when snmpVersion is "v3"
  - **Error Responses:**
    - `400 Bad Request` - Invalid input data, missing required fields, invalid port number
    - `401 Unauthorized` - Not authenticated
    - `403 Forbidden` - Insufficient permissions (non-admin)
    - `409 Conflict` - Credential name already exists

**UI Components:**
- Page: `/discovery/device-credentials` (DeviceCredentials.tsx)
- Components:
  - **Device Credentials List Page:**
    - Page title "Device Credentials"
    - "Add Device Credential" or "Create Credential" button (PlusOutlined icon)
    - Table/list view of existing credentials
  - **Add Device Credential Modal/Drawer:**
    - Modal title: "Add Device Credential" or "Create New Credential"
    - Form fields:
      - **Credential Name:** Text input (required, max 100 characters)
      - **Credential Type:** Dropdown/Select (required)
        - Options: SSH, Windows, SNMP, WinRM
        - Changing type dynamically shows/hides relevant fields
      - **Type-Specific Fields (conditionally shown):**
        - **Username:** Text input (optional, max 100 characters) - for SSH, Windows, WinRM
        - **Password:** Password input (optional, with show/hide toggle) - for SSH, Windows, WinRM
        - **Domain:** Text input (optional, max 100 characters) - for Windows, WinRM
        - **Port:** InputNumber (optional, 1-65535) - for all types
        - **SNMP Community:** Text input (optional, max 100 characters) - for SNMP v2c only
        - **SNMP Version:** Dropdown/Select (optional, options: v2c, v3) - for SNMP only
        - **SNMP v3 Fields (shown when SNMP v3 is selected):**
          - **Username:** Text input (optional, max 100 characters) - for SNMP v3
          - **Context Name:** Text input (optional, max 100 characters) - for SNMP v3
          - **Security Level:** Dropdown/Select (required for v3, options: "No Authentication/No Privacy", "Authentication/No Privacy", "Authentication/Privacy")
          - **Authentication Protocol:** Dropdown/Select (required if Security Level includes Authentication, options: MD5, SHA, SHA-224, SHA-256, SHA-384, SHA-512) - shown when Security Level is "Authentication/No Privacy" or "Authentication/Privacy"
          - **Authentication Password:** Password input (required if Security Level includes Authentication, with show/hide toggle) - shown when Security Level is "Authentication/No Privacy" or "Authentication/Privacy"
          - **Privacy Protocol:** Dropdown/Select (required if Security Level includes Privacy, options: DES, AES/AES-128, AES-192, AES-192C, AES-256, AES-256C) - shown when Security Level is "Authentication/Privacy"
          - **Privacy Password:** Password input (required if Security Level includes Privacy, with show/hide toggle) - shown when Security Level is "Authentication/Privacy"
      - **Description:** Textarea (optional, max 500 characters)
    - **Action Buttons:**
      - Save button (primary) - Creates the credential
      - Reset button (default) - Clears all form fields
      - Cancel button (default) - Closes modal without saving
    - **Form States:**
      - Loading state while creating credential
      - Success message after creation
      - Error messages for validation failures
      - Disabled Save button until required fields are filled
- User Actions:
  1. Navigate to Discovery > Device Credentials page
  2. Click "Add Device Credential" or "Create Credential" button
  3. Add Device Credential modal/drawer opens
  4. Enter credential name (required)
  5. Select credential type from dropdown (SSH, Windows, SNMP, WinRM)
  6. Verify form fields update dynamically based on selected type:
     - For SSH: Username, Password, Port fields appear
     - For Windows: Username, Password, Domain, Port fields appear
     - For WinRM: Username, Password, Domain, Port fields appear
     - For SNMP v2c: SNMP Community, SNMP Version, Port fields appear
     - For SNMP v3: Username, Context Name, Security Level, Port fields appear (and additional fields based on Security Level)
  7. If SNMP v3 is selected:
     - Enter Username (optional)
     - Enter Context Name (optional)
     - Select Security Level from dropdown (required):
       - "No Authentication/No Privacy": No additional fields appear
       - "Authentication/No Privacy": Authentication Protocol dropdown and Authentication Password field appear (both required)
       - "Authentication/Privacy": Authentication Protocol, Authentication Password, Privacy Protocol dropdown, and Privacy Password field appear (all required)
     - If "Authentication/No Privacy" or "Authentication/Privacy" is selected:
       - Select Authentication Protocol from dropdown (MD5, SHA, SHA-224, SHA-256, SHA-384, SHA-512)
       - Enter Authentication Password (password input with show/hide toggle)
     - If "Authentication/Privacy" is selected:
       - Select Privacy Protocol from dropdown (DES, AES/AES-128, AES-192, AES-192C, AES-256, AES-256C)
       - Enter Privacy Password (password input with show/hide toggle)
  8. Fill in relevant fields for selected type (all optional except Name, Type, and SNMP v3 Security Level fields if applicable)
  8. Enter description (optional)
  9. (Optional) Click Reset button to clear all fields
  10. (Optional) Click Cancel button to close without saving
  11. Click Save button to create credential
  12. Verify success message appears
  13. Verify modal closes automatically
  14. Verify new credential appears in credentials list
  15. Verify credential can be selected when configuring IP Range discovery

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should be forbidden or have limited access)
- Test credential name validation:
  - Enter valid name (should accept)
  - Leave name empty (should show validation error)
  - Enter duplicate name (should show 409 Conflict error)
  - Test name length (1-100 characters)
- Test credential type selection:
  - Select SSH and verify SSH-specific fields appear
  - Select Windows and verify Windows-specific fields appear
  - Select WinRM and verify WinRM-specific fields appear
  - Select SNMP and verify SNMP-specific fields appear
  - Change type and verify fields update dynamically
- Test SSH credential creation:
  - Create with username and password
  - Create with username only (no password)
  - Create with custom port
  - Create minimal credential (name and type only)
  - Verify password is encrypted in database
  - Verify password is not returned in API response
- Test Windows credential creation:
  - Create with username, password, and domain
  - Create with username and password (no domain)
  - Create with custom port
  - Verify domain field is optional
- Test WinRM credential creation:
  - Create with username, password, and domain
  - Create with username and password (no domain)
  - Create with custom port (5985 or 5986)
  - Verify WinRM-specific fields work correctly
- Test SNMP credential creation:
  - Create with community and version v2c
  - Create with community only (no version)
  - Create minimal SNMP credential (name and type only)
  - Verify SNMP Community field works correctly
  - Verify SNMP Version dropdown works correctly
- Test SNMP v3 credential creation:
  - **SNMP v3 Basic Fields:**
    - Select SNMP v3 and verify Username, Context Name, and Security Level fields appear
    - Verify SNMP Community field is hidden when v3 is selected
    - Enter Username (optional)
    - Enter Context Name (optional)
    - Verify Username and Context Name are optional fields
  - **SNMP v3 Security Level: "No Authentication/No Privacy":**
    - Select "No Authentication/No Privacy" from Security Level dropdown
    - Verify no additional fields appear (only Username and Context Name)
    - Create credential with only name, type, and security level (should succeed)
    - Create credential with username and context name (should succeed)
  - **SNMP v3 Security Level: "Authentication/No Privacy":**
    - Select "Authentication/No Privacy" from Security Level dropdown
    - Verify Authentication Protocol dropdown appears (required)
    - Verify Authentication Password field appears (required, password input)
    - Test all Authentication Protocol options:
      - MD5
      - SHA
      - SHA-224
      - SHA-256
      - SHA-384
      - SHA-512
    - Enter Authentication Password (required)
    - Verify Privacy Protocol and Privacy Password fields do NOT appear
    - Test creating credential without Authentication Protocol (should fail)
    - Test creating credential without Authentication Password (should fail)
    - Test creating credential with all fields (should succeed)
  - **SNMP v3 Security Level: "Authentication/Privacy":**
    - Select "Authentication/Privacy" from Security Level dropdown
    - Verify Authentication Protocol dropdown appears (required)
    - Verify Authentication Password field appears (required, password input)
    - Verify Privacy Protocol dropdown appears (required)
    - Verify Privacy Password field appears (required, password input)
    - Test all Authentication Protocol options (MD5, SHA, SHA-224, SHA-256, SHA-384, SHA-512)
    - Test all Privacy Protocol options:
      - DES
      - AES/AES-128
      - AES-192
      - AES-192C
      - AES-256
      - AES-256C
    - Enter Authentication Password (required)
    - Enter Privacy Password (required)
    - Test creating credential without Authentication Protocol (should fail)
    - Test creating credential without Authentication Password (should fail)
    - Test creating credential without Privacy Protocol (should fail)
    - Test creating credential without Privacy Password (should fail)
    - Test creating credential with all fields (should succeed)
  - **SNMP v3 Dynamic Field Behavior:**
    - Select SNMP v3, then select "No Authentication/No Privacy" - verify only basic fields
    - Change Security Level to "Authentication/No Privacy" - verify Authentication fields appear
    - Change Security Level to "Authentication/Privacy" - verify both Authentication and Privacy fields appear
    - Change Security Level back to "No Authentication/No Privacy" - verify Authentication and Privacy fields disappear
    - Change SNMP Version from v3 to v2c - verify all v3 fields disappear, SNMP Community appears
    - Change SNMP Version from v2c to v3 - verify SNMP Community disappears, v3 fields appear
  - **SNMP v3 Password Fields:**
    - Verify Authentication Password has show/hide toggle
    - Verify Privacy Password has show/hide toggle
    - Verify both passwords are encrypted (AES-256) before storage
    - Verify both passwords are never returned in API responses
    - Test with various password formats and special characters
  - **SNMP v3 Validation:**
    - Test creating v3 credential with missing Security Level (should fail)
    - Test creating v3 credential with "Authentication/No Privacy" but missing Authentication Protocol (should fail)
    - Test creating v3 credential with "Authentication/No Privacy" but missing Authentication Password (should fail)
    - Test creating v3 credential with "Authentication/Privacy" but missing Privacy Protocol (should fail)
    - Test creating v3 credential with "Authentication/Privacy" but missing Privacy Password (should fail)
    - Test creating v3 credential with all required fields (should succeed)
- Test port validation:
  - Enter valid port (1-65535, should accept)
  - Enter invalid port (0, negative, >65535, should show error)
  - Leave port empty (should use default for type)
  - Test type-specific default ports (SSH: 22, SNMP: 161, WinRM: 5985/5986)
- Test password field:
  - Enter password for SSH/Windows/WinRM (should accept)
  - Use show/hide toggle to view password
  - Leave password empty (should accept, optional field)
  - Verify password is encrypted before storage
  - Verify password is never returned in API responses
- Test form actions:
  - Test Save button:
    - Save with valid data (should succeed)
    - Save with missing name (should fail with validation error)
    - Save with missing type (should fail with validation error)
    - Save with duplicate name (should fail with 409 Conflict)
    - Save with invalid port (should fail with validation error)
    - Verify Save button is disabled until required fields are filled
    - Verify loading state during creation
    - Verify success message after creation
    - Verify modal closes after successful creation
  - Test Reset button:
    - Fill in all form fields
    - Click Reset button
    - Verify all fields are cleared
    - Verify form returns to initial state
    - Verify credential type selection resets
  - Test Cancel button:
    - Fill in form fields
    - Click Cancel button
    - Verify modal closes without saving
    - Verify credential is not created
    - Reopen form and verify fields are empty
- Test dynamic form fields:
  - Verify fields show/hide based on credential type
  - Change type and verify fields update correctly
  - Verify no field conflicts between types
  - Test with all credential types
  - For SNMP v3: Verify fields show/hide based on Security Level selection
  - For SNMP v3: Change Security Level and verify fields update dynamically
  - For SNMP v3: Verify switching between v2c and v3 updates fields correctly
- Test credential creation workflow:
  - Create credential successfully
  - Verify credential appears in credentials list
  - Verify credential can be selected in IP Range configuration
  - Verify credential details are displayed correctly
  - Verify lastUsed field is initially null
- Test security:
  - Verify passwords are encrypted (AES-256) in database (including Authentication Password and Privacy Password for SNMP v3)
  - Verify passwords are never returned in API responses (including Authentication Password and Privacy Password for SNMP v3)
  - Verify createdBy field stores current user ID
  - Verify audit log contains credential creation entry
  - Test with various password formats and special characters
  - For SNMP v3: Verify Authentication Password and Privacy Password are encrypted separately
  - For SNMP v3: Verify both password fields have show/hide toggles
- Test error handling:
  - Test with network errors during creation
  - Test with server errors
  - Test with invalid data formats
  - Verify appropriate error messages are shown
  - Verify form remains usable after errors
- Test UI responsiveness:
  - Test modal/drawer on different screen sizes
  - Verify layout is correct on mobile and desktop
  - Verify all fields and buttons are accessible
  - Test keyboard navigation through form fields
  - Test form works correctly with screen readers
- Test edge cases:
  - Test with maximum field lengths (name: 100, username: 100, description: 500)
  - Test with special characters in fields
  - Test with Unicode characters
  - Test creating multiple credentials rapidly
  - Test with very long passwords
- Test integration:
  - Verify created credential is available for IP Range discovery
  - Verify credential can be used in discovery scans
  - Verify credential appears in credential selection dropdowns
  - Test credential usage tracking (lastUsed field updates when used)

---

### User Story 6: Device Credential Table Functions

**Story ID:** `US-016`  
**Title:** View and Manage Device Credentials in Table View  
**Priority:** P0 (Critical)  
**Module:** Discovery - Device Credentials

**User Story:**
```
As an administrator
I want to view, search, filter, and manage device credentials in a table view
So that I can efficiently browse, find, and perform actions on device credentials
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to Discovery > Device Credentials page and see credentials table
- [ ] AC2: Table displays all device credentials with columns: ID, Name, Type, Username (if applicable), Last Used, Created On, Actions
- [ ] AC3: Credentials are sorted by default by Created On (newest first) or alphabetically by name
- [ ] AC4: Search functionality allows searching by credential ID, name, username, description, or type
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: Column filter allows showing/hiding columns (ID, Name, Type, Username, Last Used, Created On)
- [ ] AC7: Column filter modal displays checkboxes for each column
- [ ] AC8: "Reset Filters" button in filter modal restores all columns to visible state
- [ ] AC9: Type filter dropdown allows filtering credentials by type (SSH, Windows, SNMP, WinRM, with "All Types" option)
- [ ] AC10: Type filter is independent of search and works in combination with search
- [ ] AC11: Table supports pagination with configurable page size (default 20 items per page, options: 10, 20, 50, 100)
- [ ] AC12: Pagination shows current page, total pages, and total count of credentials
- [ ] AC13: Table supports sorting by ID (numeric), Name (alphabetical), Type (alphabetical), Last Used (date), Created On (date)
- [ ] AC14: Clicking on credential name opens view modal/drawer with credential details (password fields are masked/not shown)
- [ ] AC15: Actions column displays Edit and Delete buttons for each credential
- [ ] AC16: Edit button opens edit modal with pre-filled credential data (passwords are not pre-filled for security)
- [ ] AC17: Delete button shows confirmation modal before deleting credential
- [ ] AC18: Delete button is disabled for credentials that are in use by IP Ranges (with tooltip explaining why)
- [ ] AC19: System prevents deleting credentials that are assigned to IP Ranges (returns 400 Bad Request error)
- [ ] AC20: Type column displays credential type (SSH, Windows, SNMP, WinRM) with appropriate icon or badge
- [ ] AC21: Username column displays username for SSH, Windows, and WinRM credentials (shows "N/A" or empty for SNMP v2c)
- [ ] AC22: Username column shows SNMP v3 username if applicable
- [ ] AC23: Last Used column displays the last time the credential was used (formatted date/time, or "Never" if null)
- [ ] AC24: Last Used column is clickable and shows tooltip with full timestamp
- [ ] AC25: Export button downloads credentials data as CSV file
- [ ] AC26: Exported CSV includes all visible columns and filtered/search results (passwords are never included)
- [ ] AC27: Refresh/Reload button reloads credential list from server
- [ ] AC28: Create Device Credential button is visible in table header and opens credential creation modal
- [ ] AC29: Table shows loading state while fetching data
- [ ] AC30: Table displays empty state message when no credentials exist
- [ ] AC31: Table displays "No results found" message when search/filter returns no matches
- [ ] AC32: Created On column displays formatted date and time
- [ ] AC33: Description column is not shown in table by default but can be enabled via column filter
- [ ] AC34: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC35: Password fields are never displayed in table or exported data (for security)
- [ ] AC36: SNMP v3 credentials show security level indicator in Type column or separate column
- [ ] AC37: Table shows credential usage count (number of IP Ranges using the credential) if applicable
- [ ] AC38: Credential usage count is clickable and opens popup showing list of IP Ranges using the credential

**Test Data:**
```json
{
  "sampleCredentials": [
    {
      "id": "cred-001",
      "name": "Linux Server SSH",
      "type": "SSH",
      "username": "admin",
      "lastUsed": "2026-01-14T10:30:00.000Z",
      "createdAt": "2026-01-01T10:00:00.000Z",
      "description": "SSH credentials for Linux servers",
      "usageCount": 3
    },
    {
      "id": "cred-002",
      "name": "Windows Server Credentials",
      "type": "Windows",
      "username": "administrator",
      "lastUsed": "2026-01-13T15:20:00.000Z",
      "createdAt": "2026-01-02T14:30:00.000Z",
      "description": "Windows server access credentials",
      "usageCount": 5
    },
    {
      "id": "cred-003",
      "name": "SNMP Read Community",
      "type": "SNMP",
      "username": null,
      "lastUsed": null,
      "createdAt": "2026-01-03T09:15:00.000Z",
      "description": "SNMP community for device monitoring",
      "usageCount": 2
    },
    {
      "id": "cred-004",
      "name": "SNMP v3 Auth Priv",
      "type": "SNMP",
      "username": "snmpuser",
      "lastUsed": "2026-01-12T11:45:00.000Z",
      "createdAt": "2026-01-04T16:00:00.000Z",
      "description": "SNMP v3 with authentication and privacy",
      "securityLevel": "Authentication/Privacy",
      "usageCount": 1
    },
    {
      "id": "cred-005",
      "name": "WinRM Server Access",
      "type": "WinRM",
      "username": "admin",
      "lastUsed": "2026-01-11T08:30:00.000Z",
      "createdAt": "2026-01-05T12:00:00.000Z",
      "description": "WinRM credentials for remote management",
      "usageCount": 0
    }
  ],
  "searchScenarios": {
    "searchByName": "Linux",
    "searchByType": "SSH",
    "searchByUsername": "admin",
    "searchByID": "cred-001",
    "searchByDescription": "Linux",
    "noResults": "NonExistentCredential",
    "caseInsensitive": "linux"
  },
  "typeFilterScenarios": {
    "allTypes": "all",
    "sshOnly": "SSH",
    "windowsOnly": "Windows",
    "snmpOnly": "SNMP",
    "winrmOnly": "WinRM"
  },
  "paginationScenarios": {
    "pageSize10": 10,
    "pageSize20": 20,
    "pageSize50": 50,
    "pageSize100": 100
  },
  "sortScenarios": {
    "sortById": "id",
    "sortByName": "name",
    "sortByType": "type",
    "sortByLastUsed": "lastUsed",
    "sortByCreatedOn": "createdAt"
  }
}
```

**API Endpoints:**
- `GET /v1/discovery/credentials` - List device credentials with pagination, search, and filtering
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
    - `search` (string, optional) - Search term for name, username, description, or ID
    - `type` (string, optional) - Filter by credential type (SSH, Windows, SNMP, WinRM)
    - `sortBy` (string, optional) - Sort field (id, name, type, lastUsed, createdAt)
    - `sortOrder` (string, optional) - Sort order (asc, desc)
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "cred-uuid",
          "name": "Linux Server SSH",
          "type": "SSH",
          "username": "admin",
          "domain": null,
          "snmpCommunity": null,
          "snmpVersion": null,
          "snmpUsername": null,
          "snmpContextName": null,
          "snmpSecurityLevel": null,
          "snmpAuthenticationProtocol": null,
          "snmpPrivacyProtocol": null,
          "port": 22,
          "description": "SSH credentials for Linux servers",
          "lastUsed": "2026-01-14T10:30:00.000Z",
          "usageCount": 3,
          "createdBy": "user-uuid",
          "createdAt": "2026-01-01T10:00:00.000Z",
          "updatedAt": "2026-01-01T10:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 10,
        "totalPages": 1
      }
    }
    ```
    **Note:** Password fields (password, authenticationPassword, privacyPassword) are never returned in response
- `GET /v1/discovery/credentials/:id` - Get credential details by ID
  - **Path Parameters:**
    - `id` (string, required) - Credential ID
  - **Success Response (200):** Same structure as list response but single credential object
  - **Note:** Password fields are never returned, even in detail view
- `GET /v1/discovery/credentials/:id/usage` - Get IP Ranges using this credential
  - **Path Parameters:**
    - `id` (string, required) - Credential ID
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "iprange-uuid",
          "name": "Corporate Network",
          "range": "192.168.1.0/24",
          "status": "active"
        }
      ],
      "total": 3
    }
    ```
- `DELETE /v1/discovery/credentials/:id` - Delete a credential
  - **Path Parameters:**
    - `id` (string, required) - Credential ID
  - **Success Response (200):**
    ```json
    {
      "message": "Credential deleted successfully"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Credential is in use by IP Ranges
    - `404 Not Found` - Credential not found
    - `403 Forbidden` - Insufficient permissions

**UI Components:**
- Page: `/discovery/device-credentials` (DeviceCredentials.tsx)
- Components:
  - **Table Header:**
    - Page title "Device Credentials"
    - Type filter dropdown (All Types, SSH, Windows, SNMP, WinRM)
    - Search input field (with SearchOutlined icon)
    - Filter button (FilterOutlined icon) - opens column filter modal
    - Export button (DownloadOutlined icon) - exports to CSV
    - Refresh button (ReloadOutlined icon) - reloads data
    - Create Device Credential button (PlusOutlined icon)
  - **Table:**
    - Columns: ID, Name, Type, Username, Last Used, Created On, Actions
    - Sortable columns: ID, Name, Type, Last Used, Created On
    - Clickable credential name (opens view modal/drawer)
    - Clickable last used date (shows tooltip with full timestamp)
    - Type column shows type badge/icon (SSH, Windows, SNMP, WinRM)
    - Username column shows username or "N/A" for SNMP v2c
    - Actions column: Edit button, Delete button
    - Usage count column (optional, shows number of IP Ranges using credential)
    - Clickable usage count (opens popup showing IP Ranges)
  - **Column Filter Modal:**
    - Checkboxes for: Show ID, Show Name, Show Type, Show Username, Show Last Used, Show Created On, Show Usage Count
  - **View Modal/Drawer:** (opened by clicking credential name)
    - Credential details display
    - All fields shown except passwords (which are masked or not shown)
    - Edit button (if in view mode)
  - **Usage Popup/Modal:** (opened by clicking usage count)
    - Modal title: "IP Ranges Using [Credential Name]"
    - Table/list of IP Ranges with columns: Name, Range, Status
    - Close button
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **Delete Confirmation Modal:**
    - Confirmation message
    - Warning if credential is in use
    - Confirm and Cancel buttons
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no credentials exist
  - **No Results State:** Message when search/filter returns no matches
- User Actions:
  1. Navigate to Discovery > Device Credentials
  2. View credentials table with all columns (ID, Name, Type, Username, Last Used, Created On, Actions)
  3. Use search box to filter credentials by ID, name, username, description, or type
  4. Select type from dropdown to filter credentials by type (SSH, Windows, SNMP, WinRM)
  5. Click filter button to show/hide columns (ID, Name, Type, Username, Last Used, Created On)
  6. Click column headers to sort (ID, Name, Type, Last Used, Created On)
  7. Adjust pagination (change page size, navigate pages)
  8. Click credential name to view details in modal/drawer
  9. View Type, Username, Last Used, and Created On for each credential
  10. Click on Last Used date to see full timestamp in tooltip
  11. Click on usage count (if shown) to view IP Ranges using the credential
  12. Click Edit button to edit credential
  13. Click Delete button to delete credential (with confirmation, disabled if in use)
  14. Click Export button to download CSV (includes all visible columns, excludes passwords)
  15. Click Refresh button to reload data
  16. Click Create Device Credential button to add new credential

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have edit/delete)
- Verify table loads all credentials on page load
- Test search functionality:
  - Search by credential name (partial and full match)
  - Search by credential ID
  - Search by username (for SSH, Windows, WinRM, SNMP v3)
  - Search by description (partial match)
  - Search by type (SSH, Windows, SNMP, WinRM)
  - Case-insensitive search (test with uppercase/lowercase)
  - Search across multiple fields
  - Search with no results
  - Clear search to show all credentials
- Test type filtering:
  - Select "All Types" (should show all credentials)
  - Select "SSH" (should show only SSH credentials)
  - Select "Windows" (should show only Windows credentials)
  - Select "SNMP" (should show only SNMP credentials, both v2c and v3)
  - Select "WinRM" (should show only WinRM credentials)
  - Combine type filter with search (should filter by both)
- Test column filtering:
  - Hide/show individual columns (ID, Name, Type, Username, Last Used, Created On)
  - Apply filters
  - Reset filters to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify filter button shows active state when filters are applied
- Test sorting:
  - Sort by ID (numeric sorting)
  - Sort by Name (alphabetical sorting)
  - Sort by Type (alphabetical sorting)
  - Sort by Last Used (date sorting, nulls last)
  - Sort by Created On (date sorting)
  - Verify sorting works with filtered/search results
  - Test ascending and descending order
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test actions:
  - Click credential name to view details in modal/drawer
  - Click Edit button (should open edit modal)
  - Click Delete button on credential with no usage (should show confirmation)
  - Click Delete button on credential in use (should be disabled with tooltip)
  - Verify delete confirmation modal works correctly
  - Verify credential is deleted after confirmation
  - Verify credential list updates after deletion
- Test type column:
  - Verify type displays correctly for each credential (SSH, Windows, SNMP, WinRM)
  - Verify type badge/icon is appropriate
  - Verify SNMP v3 credentials show security level indicator if applicable
- Test username column:
  - Verify username displays for SSH, Windows, WinRM credentials
  - Verify username displays for SNMP v3 credentials
  - Verify "N/A" or empty for SNMP v2c credentials
- Test last used column:
  - Verify last used date displays correctly (formatted)
  - Verify "Never" displays for credentials that have never been used
  - Click on last used date to see tooltip with full timestamp
  - Verify date formatting is consistent
- Test usage count (if implemented):
  - Verify usage count displays correctly for each credential
  - Click on usage count to open IP Ranges popup
  - Verify popup shows all IP Ranges using the credential
  - Verify popup displays IP Range details correctly
  - Verify delete button is disabled when usage count > 0
- Test export functionality:
  - Export all credentials
  - Export filtered/search results
  - Verify CSV file is downloaded correctly
  - Verify CSV includes correct columns and data
  - Verify passwords are NOT included in CSV (security)
  - Verify CSV includes only visible columns
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no credentials exist
  - "No results found" when search/filter returns no matches
- Test date formatting in Created On and Last Used columns
- Verify table performance with large number of credentials
- Test responsive design (table on different screen sizes)
- Test column visibility persistence (user preferences saved if implemented)
- Verify Create Device Credential button is always visible and functional
- Test credential deletion restrictions:
  - Verify credentials in use cannot be deleted
  - Verify delete button is disabled with appropriate tooltip
  - Verify credentials without usage can be deleted
  - Test attempting to delete credential in use via API (should return 400 Bad Request error)
- Test security:
  - Verify passwords are never displayed in table
  - Verify passwords are never included in exported CSV
  - Verify passwords are never returned in API responses
  - Test view modal/drawer does not show passwords
- Test integration:
  - Verify created credential appears in table immediately
  - Verify edited credential updates in table
  - Verify deleted credential is removed from table
  - Verify credential can be selected when configuring IP Range discovery

---

### User Story 7: Device Discovery

**Story ID:** `US-017`  
**Title:** Discover Devices on Network Using IP Range Scans  
**Priority:** P0 (Critical)  
**Module:** Discovery - Network Scanning

**User Story:**
```
As an administrator
I want to create and configure new device discovery jobs with IP ranges, credentials, and scheduling options
So that I can discover and manage network devices for patching and asset management
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to Discovery page
- [ ] AC2: "New Discovery" button is visible on the Discovery page
- [ ] AC3: Clicking "New Discovery" button opens a form popup/modal
- [ ] AC4: Form popup displays "New Discovery" or "Create Discovery Job" title
- [ ] AC5: Name field is mandatory and accepts 1-100 characters
- [ ] AC6: Description field is optional and accepts up to 500 characters
- [ ] AC7: Organization field is mandatory dropdown showing all available organizations
- [ ] AC8: Branch Location field is mandatory dropdown that is initially disabled or empty
- [ ] AC9: Branch Location dropdown becomes enabled when organization is selected
- [ ] AC10: Branch Location dropdown populates with branches belonging to the selected organization
- [ ] AC11: Branch Location dropdown shows only branches from the selected organization
- [ ] AC12: If organization selection changes, Branch Location dropdown is cleared and repopulated
- [ ] AC13: Hub Details field is auto-populated based on selected branch location
- [ ] AC14: If single hub is available at branch location, it is auto-selected and displayed
- [ ] AC15: If multiple hubs are available at branch location, dropdown appears allowing user to select a hub
- [ ] AC16: If local hub is available at branch location, it is automatically used for discovery operation
- [ ] AC17: Hub selection is required if multiple hubs are available
- [ ] AC18: IP Address Details field is mandatory and accepts:
  - Single IP address (e.g., 192.168.1.10)
  - IP range (e.g., 192.168.1.10-192.168.1.50)
  - Entire subnet in CIDR notation (e.g., 192.168.1.0/24)
  - Hostname (e.g., server-01.corp.local)
  - Multiple entries separated by comma or newline
- [ ] AC19: System validates IP address format (single IP, range, CIDR, or hostname)
- [ ] AC20: Exclusion field is optional and accepts IP addresses or ranges to exclude from discovery
- [ ] AC21: Exclusion field accepts multiple entries separated by comma or newline
- [ ] AC22: System validates exclusion entries are valid IP addresses or ranges
- [ ] AC23: Device Credentials field is optional multi-select dropdown showing available credentials
- [ ] AC24: User can select multiple device credentials from the dropdown
- [ ] AC25: Selected credentials are displayed as tags/chips with remove option
- [ ] AC26: Timeout field is optional and accepts numeric value (in seconds, default or minimum value)
- [ ] AC27: Retries field is optional and accepts numeric value (default or minimum value)
- [ ] AC28: Schedule Discovery toggle is available (enabled/disabled, default: disabled)
- [ ] AC29: When Schedule Discovery toggle is disabled:
  - Schedule options are hidden
  - "Run" button is visible
  - "Save" button is hidden
- [ ] AC30: When Schedule Discovery toggle is enabled:
  - Schedule options appear
  - "Run" button is hidden
  - "Save" button is visible
- [ ] AC31: Schedule options include:
  - Frequency dropdown: Daily, Weekly, Monthly
  - Time picker/input (for daily or specific time)
  - Day of week selector (for weekly)
  - Day of month selector (for monthly)
- [ ] AC32: Cancel button is always visible and closes the form without saving
- [ ] AC33: Reset button is always visible and clears all form fields to initial state
- [ ] AC34: Clicking "Run" button (when schedule is disabled):
  - Validates all mandatory fields
  - Creates discovery job immediately
  - Triggers discovery scan
  - Closes form popup
  - Returns user to Discovery page
  - Shows job brief in discovery jobs table
- [ ] AC35: Clicking "Save" button (when schedule is enabled):
  - Validates all mandatory fields
  - Validates schedule configuration
  - Creates scheduled discovery job
  - Closes form popup
  - Returns user to Discovery page
  - Shows job brief in discovery jobs table
- [ ] AC36: Discovery jobs table displays job brief with:
  - Job ID/Name
  - Organization
  - Branch Location
  - IP Address Details (summary)
  - Status (pending, in_progress, completed, failed, scheduled)
  - Schedule information (if scheduled)
  - Created At timestamp
  - Actions (View, Edit, Delete, Run Now for scheduled jobs)
- [ ] AC37: System validates that selected branch belongs to selected organization
- [ ] AC38: System validates that hub exists and is associated with selected branch
- [ ] AC39: System creates discovery job record with all configured parameters
- [ ] AC40: System uses selected hub (or local hub) to carry out discovery operation
- [ ] AC41: System applies selected device credentials during discovery scan
- [ ] AC42: System applies timeout and retry settings during discovery scan
- [ ] AC43: System applies exclusion list to exclude specified IPs from discovery
- [ ] AC44: Scheduled jobs are stored and executed according to schedule
- [ ] AC45: System creates audit log entry for discovery job creation
- [ ] AC46: Success message is displayed after job is created (Run or Save)
- [ ] AC47: Error messages are displayed for validation failures
- [ ] AC48: Form handles all field dependencies correctly (organization → branch → hub)
- [ ] AC49: Admin can view discovery jobs table/list on Discovery page
- [ ] AC50: Discovery jobs table shows job brief with: Name, Organization, Branch, IP Details (summary), Status, Schedule info, Created At, Actions
- [ ] AC51: Admin can view discovered devices from completed discovery jobs
- [ ] AC52: Admin can view scan status and progress for running discovery jobs
- [ ] AC53: Discovered devices are automatically enrolled as assets when discovered
- [ ] AC54: System creates asset records for discovered devices using organization, branch, and hub information from discovery job
- [ ] AC55: Auto-enrolled devices are linked to the discovery job's organization and branch
- [ ] AC56: Auto-enrolled devices show status as "enrolled" immediately after discovery
- [ ] AC57: Auto-enrolled devices are accessible in the Assets module
- [ ] AC58: Admin can export discovered devices to CSV

**Test Data:**
```json
{
  "newDiscoveryFormData": {
    "name": "Corporate Network Discovery",
    "description": "Main corporate network device discovery",
    "organizationId": "org-001",
    "branchId": "branch-001",
    "hubId": "hub-001",
    "ipAddressDetails": "192.168.1.0/24",
    "exclusions": "192.168.1.1, 192.168.1.254",
    "credentialIds": ["cred-001", "cred-002"],
    "timeout": 30,
    "retries": 3,
    "scheduleEnabled": false
  },
  "newDiscoveryWithSingleIP": {
    "name": "Single Server Discovery",
    "description": "Discover single server",
    "organizationId": "org-001",
    "branchId": "branch-001",
    "hubId": "hub-001",
    "ipAddressDetails": "192.168.1.10",
    "exclusions": null,
    "credentialIds": ["cred-001"],
    "timeout": 30,
    "retries": 3,
    "scheduleEnabled": false
  },
  "newDiscoveryWithIPRange": {
    "name": "IP Range Discovery",
    "description": "Discover devices in IP range",
    "organizationId": "org-001",
    "branchId": "branch-001",
    "hubId": "hub-001",
    "ipAddressDetails": "192.168.1.10-192.168.1.50",
    "exclusions": "192.168.1.20",
    "credentialIds": ["cred-001", "cred-002"],
    "timeout": 60,
    "retries": 5,
    "scheduleEnabled": false
  },
  "newDiscoveryWithHostname": {
    "name": "Hostname Discovery",
    "description": "Discover device by hostname",
    "organizationId": "org-001",
    "branchId": "branch-001",
    "hubId": "hub-001",
    "ipAddressDetails": "server-01.corp.local",
    "exclusions": null,
    "credentialIds": ["cred-001"],
    "timeout": 30,
    "retries": 3,
    "scheduleEnabled": false
  },
  "newDiscoveryWithMultipleIPs": {
    "name": "Multiple IPs Discovery",
    "description": "Discover multiple specific IPs",
    "organizationId": "org-001",
    "branchId": "branch-001",
    "hubId": "hub-001",
    "ipAddressDetails": "192.168.1.10, 192.168.1.20, 192.168.1.30",
    "exclusions": null,
    "credentialIds": ["cred-001"],
    "timeout": 30,
    "retries": 3,
    "scheduleEnabled": false
  },
  "scheduledDiscoveryDaily": {
    "name": "Daily Network Scan",
    "description": "Daily scheduled discovery",
    "organizationId": "org-001",
    "branchId": "branch-001",
    "hubId": "hub-001",
    "ipAddressDetails": "192.168.1.0/24",
    "exclusions": null,
    "credentialIds": ["cred-001"],
    "timeout": 30,
    "retries": 3,
    "scheduleEnabled": true,
    "scheduleFrequency": "Daily",
    "scheduleTime": "02:00"
  },
  "scheduledDiscoveryWeekly": {
    "name": "Weekly Network Scan",
    "description": "Weekly scheduled discovery",
    "organizationId": "org-001",
    "branchId": "branch-001",
    "hubId": "hub-001",
    "ipAddressDetails": "192.168.1.0/24",
    "exclusions": null,
    "credentialIds": ["cred-001"],
    "timeout": 30,
    "retries": 3,
    "scheduleEnabled": true,
    "scheduleFrequency": "Weekly",
    "scheduleDayOfWeek": 1,
    "scheduleTime": "03:00"
  },
  "scheduledDiscoveryMonthly": {
    "name": "Monthly Network Scan",
    "description": "Monthly scheduled discovery",
    "organizationId": "org-001",
    "branchId": "branch-001",
    "hubId": "hub-001",
    "ipAddressDetails": "192.168.1.0/24",
    "exclusions": null,
    "credentialIds": ["cred-001"],
    "timeout": 30,
    "retries": 3,
    "scheduleEnabled": true,
    "scheduleFrequency": "Monthly",
    "scheduleDayOfMonth": 1,
    "scheduleTime": "04:00"
  },
  "discoveryJobBrief": {
    "id": "job-001",
    "name": "Corporate Network Discovery",
    "organization": "Acme Corporation",
    "branch": "New York Office",
    "ipAddressDetails": "192.168.1.0/24",
    "status": "in_progress",
    "schedule": null,
    "createdAt": "2026-01-14T10:00:00.000Z"
  },
  "scheduledDiscoveryJobBrief": {
    "id": "job-002",
    "name": "Daily Network Scan",
    "organization": "Acme Corporation",
    "branch": "New York Office",
    "ipAddressDetails": "192.168.1.0/24",
    "status": "scheduled",
    "schedule": {
      "frequency": "Daily",
      "time": "02:00",
      "nextRun": "2026-01-15T02:00:00.000Z"
    },
    "createdAt": "2026-01-14T10:00:00.000Z"
  },
  "hubScenarios": {
    "singleHub": {
      "branchId": "branch-001",
      "hubs": [
        {
          "id": "hub-001",
          "name": "Local Hub",
          "type": "local"
        }
      ],
      "expectedBehavior": "Auto-selected and displayed"
    },
    "multipleHubs": {
      "branchId": "branch-002",
      "hubs": [
        {
          "id": "hub-002",
          "name": "Hub A",
          "type": "remote"
        },
        {
          "id": "hub-003",
          "name": "Hub B",
          "type": "remote"
        },
        {
          "id": "hub-004",
          "name": "Local Hub",
          "type": "local"
        }
      ],
      "expectedBehavior": "Dropdown appears, local hub auto-selected if available"
    },
    "noHub": {
      "branchId": "branch-003",
      "hubs": [],
      "expectedBehavior": "No hub field or message displayed"
    }
  },
  "ipAddressValidationScenarios": {
    "validSingleIP": "192.168.1.10",
    "validIPRange": "192.168.1.10-192.168.1.50",
    "validCIDR": "192.168.1.0/24",
    "validHostname": "server-01.corp.local",
    "validMultipleIPs": "192.168.1.10, 192.168.1.20, 192.168.1.30",
    "invalidIP": "999.999.999.999",
    "invalidFormat": "192.168.1",
    "emptyIP": ""
  },
  "exclusionValidationScenarios": {
    "validSingleExclusion": "192.168.1.1",
    "validMultipleExclusions": "192.168.1.1, 192.168.1.254",
    "validExclusionRange": "192.168.1.1-192.168.1.10",
    "emptyExclusions": null
  },
  "scanStatusResponse": {
    "id": "scan-001",
    "ipRangeId": "iprange-001",
    "ipRange": {
      "name": "Corporate Network",
      "range": "192.168.1.0/24"
    },
    "status": "in_progress",
    "devicesFound": 5,
    "startedAt": "2026-01-14T10:00:00.000Z",
    "completedAt": null,
    "errorMessage": null,
    "progress": {
      "ipsScanned": 50,
      "totalIPs": 254,
      "devicesFound": 5,
      "estimatedTimeRemaining": 120
    }
  },
  "completedScanStatus": {
    "id": "scan-001",
    "ipRangeId": "iprange-001",
    "status": "completed",
    "devicesFound": 12,
    "startedAt": "2026-01-14T10:00:00.000Z",
    "completedAt": "2026-01-14T10:05:30.000Z",
    "errorMessage": null
  },
  "failedScanStatus": {
    "id": "scan-002",
    "ipRangeId": "iprange-002",
    "status": "failed",
    "devicesFound": 0,
    "startedAt": "2026-01-14T11:00:00.000Z",
    "completedAt": "2026-01-14T11:00:15.000Z",
    "errorMessage": "Network timeout: Unable to reach IP range"
  },
  "discoveredDevices": [
    {
      "id": "device-001",
      "ipRangeId": "iprange-001",
      "ipAddress": "192.168.1.10",
      "hostname": "server-01.corp.local",
      "macAddress": "00:1B:44:11:3A:B7",
      "deviceType": "Server",
      "os": "Linux Ubuntu 22.04",
      "vendor": "Dell",
      "openPorts": [22, 80, 443, 3306],
      "status": "enrolled",
      "assetId": "asset-001",
      "asset": {
        "id": "asset-001",
        "name": "192.168.1.10",
        "organizationId": "org-001",
        "branchId": "branch-001"
      },
      "discoveredAt": "2026-01-14T10:02:00.000Z",
      "lastSeenAt": "2026-01-14T10:02:00.000Z"
    },
    {
      "id": "device-002",
      "ipRangeId": "iprange-001",
      "ipAddress": "192.168.1.20",
      "hostname": "workstation-05.corp.local",
      "macAddress": "00:1B:44:11:3A:B8",
      "deviceType": "Workstation",
      "os": "Windows 11 Pro",
      "vendor": "HP",
      "openPorts": [135, 445, 3389],
      "status": "enrolled",
      "assetId": "asset-002",
      "asset": {
        "id": "asset-002",
        "name": "workstation-05.corp.local",
        "organizationId": "org-001",
        "branchId": "branch-001"
      },
      "discoveredAt": "2026-01-14T10:02:15.000Z",
      "lastSeenAt": "2026-01-14T10:02:15.000Z"
    },
    {
      "id": "device-003",
      "ipRangeId": "iprange-001",
      "ipAddress": "192.168.1.30",
      "hostname": null,
      "macAddress": "00:1B:44:11:3A:B9",
      "deviceType": "Network Device",
      "os": null,
      "vendor": "Cisco",
      "openPorts": [23, 80, 161],
      "status": "enrolled",
      "assetId": "asset-003",
      "asset": {
        "id": "asset-003",
        "name": "192.168.1.30",
        "organizationId": "org-001",
        "branchId": "branch-001"
      },
      "discoveredAt": "2026-01-14T10:02:30.000Z",
      "lastSeenAt": "2026-01-14T10:02:30.000Z"
    }
  ],
  "scanHistory": [
    {
      "id": "scan-001",
      "status": "completed",
      "devicesFound": 12,
      "startedAt": "2026-01-14T10:00:00.000Z",
      "completedAt": "2026-01-14T10:05:30.000Z"
    },
    {
      "id": "scan-002",
      "status": "completed",
      "devicesFound": 15,
      "startedAt": "2026-01-13T10:00:00.000Z",
      "completedAt": "2026-01-13T10:06:00.000Z"
    },
    {
      "id": "scan-003",
      "status": "failed",
      "devicesFound": 0,
      "startedAt": "2026-01-12T10:00:00.000Z",
      "completedAt": "2026-01-12T10:00:10.000Z",
      "errorMessage": "Network timeout"
    }
  ]
}
```

**API Endpoints:**
- `POST /v1/discovery/jobs` - Create a new discovery job (Run immediately or Save as scheduled)
  - **Request Body:**
    ```json
    {
      "name": "Corporate Network Discovery",
      "description": "Main corporate network device discovery",
      "organizationId": "org-uuid",
      "branchId": "branch-uuid",
      "hubId": "hub-uuid",
      "ipAddressDetails": "192.168.1.0/24",
      "exclusions": "192.168.1.1, 192.168.1.254",
      "credentialIds": ["cred-uuid-1", "cred-uuid-2"],
      "timeout": 30,
      "retries": 3,
      "scheduleEnabled": false
    }
    ```
    **Note:** For scheduled jobs, include schedule fields:
    ```json
    {
      "scheduleEnabled": true,
      "scheduleFrequency": "Daily",
      "scheduleTime": "02:00",
      "scheduleDayOfWeek": 1,
      "scheduleDayOfMonth": 1
    }
    ```
  - **Success Response (201 for Save, 202 for Run):**
    ```json
    {
      "id": "job-uuid",
      "name": "Corporate Network Discovery",
      "organizationId": "org-uuid",
      "branchId": "branch-uuid",
      "hubId": "hub-uuid",
      "ipAddressDetails": "192.168.1.0/24",
      "status": "pending",
      "schedule": null,
      "createdAt": "2026-01-14T10:00:00.000Z"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Invalid input data, missing required fields, validation failure
    - `404 Not Found` - Organization, Branch, or Hub not found
    - `403 Forbidden` - Insufficient permissions
- `GET /v1/discovery/jobs` - List discovery jobs with pagination and filtering
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
    - `status` (string, optional) - Filter by status (pending, in_progress, completed, failed, scheduled)
    - `search` (string, optional) - Search by name, organization, or branch
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "job-uuid",
          "name": "Corporate Network Discovery",
          "organization": "Acme Corporation",
          "branch": "New York Office",
          "ipAddressDetails": "192.168.1.0/24",
          "status": "in_progress",
          "schedule": null,
          "createdAt": "2026-01-14T10:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 10,
        "totalPages": 1
      }
    }
    ```
- `GET /v1/discovery/branches/:id/hubs` - Get hubs available for a branch
  - **Path Parameters:**
    - `id` (string, required) - Branch ID
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "hub-uuid",
          "name": "Local Hub",
          "type": "local",
          "status": "active"
        }
      ]
    }
    ```
- `POST /v1/discovery/ip-ranges/:id/scan` - Trigger a discovery scan for an IP range (legacy endpoint)
  - **Path Parameters:**
    - `id` (string, required) - IP Range ID
  - **Success Response (202 Accepted):**
    ```json
    {
      "jobId": "scan-uuid",
      "status": "initiated",
      "message": "IP range scan started"
    }
    ```
  - **Error Responses:**
    - `404 Not Found` - IP Range not found
    - `400 Bad Request` - Scan already in progress for this IP range
    - `403 Forbidden` - Insufficient permissions
- `GET /v1/discovery/scans/:id` - Get scan status
  - **Path Parameters:**
    - `id` (string, required) - Scan ID
  - **Success Response (200):**
    ```json
    {
      "id": "scan-uuid",
      "ipRangeId": "iprange-uuid",
      "ipRange": {
        "name": "Corporate Network",
        "range": "192.168.1.0/24"
      },
      "status": "in_progress",
      "devicesFound": 5,
      "startedAt": "2026-01-14T10:00:00.000Z",
      "completedAt": null,
      "errorMessage": null,
      "progress": {
        "ipsScanned": 50,
        "totalIPs": 254,
        "devicesFound": 5,
        "estimatedTimeRemaining": 120
      }
    }
    ```
- `GET /v1/discovery/scans/:id/results` - Get discovered devices from a scan
  - **Path Parameters:**
    - `id` (string, required) - Scan ID
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
    - `status` (string, optional) - Filter by device status (enrolled, ignored) - Note: All discovered devices are auto-enrolled
    - `search` (string, optional) - Search by IP, hostname, MAC, or device type
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "device-uuid",
          "ipAddress": "192.168.1.10",
          "hostname": "server-01.corp.local",
          "macAddress": "00:1B:44:11:3A:B7",
          "deviceType": "Server",
          "os": "Linux Ubuntu 22.04",
          "vendor": "Dell",
          "openPorts": [22, 80, 443, 3306],
          "status": "enrolled",
          "assetId": "asset-uuid",
          "asset": {
            "id": "asset-uuid",
            "name": "192.168.1.10",
            "organizationId": "org-uuid",
            "branchId": "branch-uuid"
          },
          "discoveredAt": "2026-01-14T10:02:00.000Z",
          "lastSeenAt": "2026-01-14T10:02:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 12,
        "totalPages": 1
      }
    }
    ```
- `GET /v1/discovery/ip-ranges/:id/scans` - Get scan history for an IP range
  - **Path Parameters:**
    - `id` (string, required) - IP Range ID
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
  - **Success Response (200):** List of scans with pagination
- **Note:** Discovered devices are automatically enrolled as assets during discovery. No manual enrollment endpoint is required.
- `PUT /v1/discovery/devices/:id/ignore` - Mark a discovered device as ignored
  - **Path Parameters:**
    - `id` (string, required) - Discovered Device ID
  - **Success Response (200):**
    ```json
    {
      "message": "Device marked as ignored",
      "deviceId": "device-uuid"
    }
    ```

**UI Components:**
- Page: `/discovery` (Discovery.tsx)
- Components:
  - **Discovery Page:**
    - "New Discovery" button (PlusOutlined icon) in page header
    - Discovery jobs table/list showing job briefs
  - **New Discovery Form Modal/Drawer:**
    - Modal title: "New Discovery" or "Create Discovery Job"
    - Form fields:
      - **Name:** Text input (required, max 100 characters)
      - **Description:** Textarea (optional, max 500 characters)
      - **Organization:** Dropdown/Select (required)
        - Shows all available organizations
        - When selected, enables Branch Location dropdown
      - **Branch Location:** Dropdown/Select (required, initially disabled)
        - Enabled when organization is selected
        - Populated with branches from selected organization
        - Cleared and repopulated when organization changes
      - **Hub Details:** Display field or Dropdown (auto-populated)
        - Auto-populated based on selected branch location
        - If single hub available: Auto-selected and displayed as read-only
        - If multiple hubs available: Dropdown appears for selection
        - If local hub available: Automatically selected and used
        - Shows hub name and type
      - **IP Address Details:** Textarea or Input (required)
        - Accepts: Single IP, IP range, CIDR subnet, hostname, or multiple entries
        - Placeholder text showing accepted formats
        - Validation for IP format, CIDR notation, hostname format
      - **Exclusions:** Textarea or Input (optional)
        - Accepts: IP addresses or ranges to exclude
        - Multiple entries separated by comma or newline
        - Validation for IP format
      - **Device Credentials:** Multi-select Dropdown (optional)
        - Shows all available device credentials
        - Allows selecting multiple credentials
        - Selected credentials displayed as tags/chips with remove option
      - **Timeout:** InputNumber (optional)
        - Numeric input (in seconds)
        - Default value or minimum value
      - **Retries:** InputNumber (optional)
        - Numeric input
        - Default value or minimum value
      - **Schedule Discovery:** Toggle/Switch
        - Default: Disabled (off)
        - When enabled: Shows schedule options
        - When disabled: Hides schedule options
      - **Schedule Options (shown when toggle is enabled):**
        - **Frequency:** Dropdown (Daily, Weekly, Monthly)
        - **Time:** Time picker/input (HH:MM format)
        - **Day of Week:** Dropdown (1-7, for Weekly) - shown when Weekly selected
        - **Day of Month:** InputNumber (1-31, for Monthly) - shown when Monthly selected
    - **Action Buttons:**
      - **Save button (primary):** Visible when Schedule Discovery is enabled
        - Saves discovery job as scheduled
        - Validates all fields including schedule
      - **Run button (primary):** Visible when Schedule Discovery is disabled
        - Runs discovery job immediately
        - Validates all mandatory fields
      - **Reset button (default):** Always visible
        - Clears all form fields
        - Resets form to initial state
      - **Cancel button (default):** Always visible
        - Closes form without saving
    - **Form States:**
      - Loading state while creating job
      - Success message after job creation
      - Error messages for validation failures
      - Disabled Save/Run button until required fields are filled
  - **Discovery Jobs Table:**
    - Columns: Name, Organization, Branch Location, IP Details (summary), Status, Schedule Info, Created At, Actions
    - Status badges (pending, in_progress, completed, failed, scheduled)
    - Schedule information display (frequency, next run time for scheduled jobs)
    - Actions: View, Edit, Delete, Run Now (for scheduled jobs)
    - Search and filter functionality
    - Pagination
  - **Scan Status Page/Modal:**
    - Scan ID and IP Range information
    - Status badge/indicator (pending, in_progress, completed, failed)
    - Progress bar/indicator (for in_progress scans)
    - Devices found count
    - Started at and completed at timestamps
    - Error message (if failed)
    - "View Results" button (when completed)
    - "Refresh" button to update status
    - "Cancel Scan" button (if in progress and supported)
  - **Discovered Devices Table:**
    - Columns: IP Address, Hostname, MAC Address, Device Type, OS, Vendor, Open Ports, Status, Asset Link, Discovered At, Actions
    - Search input for filtering devices
    - Status filter dropdown (All, Enrolled, Ignored) - Note: All devices are auto-enrolled, status is "enrolled"
    - Pagination controls
    - Sortable columns
    - "View Details" button/clickable row
    - "View Asset" link (links to enrolled asset)
    - "Ignore" button/action (optional, to exclude from future scans)
  - **Device Details Modal/Drawer:**
    - All device information displayed
    - Open ports list
    - Status indicator (shows "enrolled")
    - Link to enrolled asset (always present, as devices are auto-enrolled)
    - Asset information (organization, branch from discovery job)
    - "Ignore" button (optional, to exclude from future scans)
  - **Scan History Page:**
    - List of all scans for an IP range
    - Columns: Scan ID, Status, Devices Found, Started At, Completed At, Actions
    - Clickable scan to view results
    - Pagination
  - **Export Button:**
    - Exports discovered devices to CSV
  - **Loading States:**
    - Loading spinner while fetching scan status
    - Loading spinner while fetching devices
  - **Empty States:**
    - No scans message
    - No devices found message
- User Actions:
  1. Navigate to Discovery page
  2. Click "New Discovery" button
  3. New Discovery form popup/modal opens
  4. Enter Name (required)
  5. Enter Description (optional)
  6. Select Organization from dropdown (required)
  7. Verify Branch Location dropdown becomes enabled
  8. Select Branch Location from dropdown (required, filtered by organization)
  9. Verify Hub Details are auto-populated based on branch location
  10. If multiple hubs available, select hub from dropdown
  11. If single hub or local hub available, verify it's auto-selected
  12. Enter IP Address Details (required):
    - Single IP: 192.168.1.10
    - IP Range: 192.168.1.10-192.168.1.50
    - CIDR Subnet: 192.168.1.0/24
    - Hostname: server-01.corp.local
    - Multiple entries: 192.168.1.10, 192.168.1.20, 192.168.1.30
  13. Enter Exclusions (optional): IP addresses or ranges to exclude
  14. Select Device Credentials (optional, multi-select)
  15. Enter Timeout (optional, in seconds)
  16. Enter Retries (optional)
  17. Toggle Schedule Discovery:
    - If disabled: Verify "Run" button is visible, "Save" button is hidden
    - If enabled: Verify "Save" button is visible, "Run" button is hidden, schedule options appear
  18. If Schedule Discovery is enabled:
    - Select Frequency (Daily, Weekly, Monthly)
    - Select Time (HH:MM format)
    - If Weekly: Select Day of Week
    - If Monthly: Enter Day of Month
  19. (Optional) Click Reset button to clear all fields
  20. (Optional) Click Cancel button to close without saving
  21. Click "Run" button (if schedule disabled) or "Save" button (if schedule enabled)
  22. Verify form validates all mandatory fields
  23. Verify success message appears
  24. Verify form closes automatically
  25. Return to Discovery page
  26. Verify job brief appears in discovery jobs table
  27. View discovery jobs table with job briefs
  28. Click on job to view details, status, and discovered devices
  29. View discovered devices from completed jobs
  30. Verify discovered devices are automatically enrolled as assets
  31. Click "View Asset" link to navigate to enrolled asset
  32. Verify assets are linked to discovery job's organization and branch
  33. Export discovered devices to CSV

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have discovery creation permission)
- Test New Discovery form:
  - Click "New Discovery" button (should open form popup)
  - Verify all form fields are present
  - Test Name field:
    - Enter valid name (should accept)
    - Leave empty (should show validation error)
    - Enter name exceeding 100 characters (should show validation error)
  - Test Description field:
    - Leave empty (should accept, optional)
    - Enter description (should accept)
    - Enter description exceeding 500 characters (should show validation error)
  - Test Organization selection:
    - Verify organization dropdown is populated
    - Select organization (should enable Branch Location dropdown)
    - Change organization (should clear and repopulate Branch Location)
  - Test Branch Location selection:
    - Verify Branch Location is disabled until organization is selected
    - Select organization and verify Branch Location becomes enabled
    - Verify Branch Location shows only branches from selected organization
    - Change organization and verify Branch Location is cleared and repopulated
    - Select branch location
  - Test Hub Details auto-population:
    - Select branch with single hub (should auto-select and display)
    - Select branch with multiple hubs (should show dropdown for selection)
    - Select branch with local hub (should auto-select local hub)
    - Select branch with no hubs (should show message or hide field)
    - Verify hub is used for discovery operation
  - Test IP Address Details field:
    - Enter single IP address (192.168.1.10, should accept)
    - Enter IP range (192.168.1.10-192.168.1.50, should accept)
    - Enter CIDR subnet (192.168.1.0/24, should accept)
    - Enter hostname (server-01.corp.local, should accept)
    - Enter multiple IPs (192.168.1.10, 192.168.1.20, should accept)
    - Enter invalid IP (999.999.999.999, should show validation error)
    - Leave empty (should show validation error)
    - Test various IP formats and validate correctly
  - Test Exclusions field:
    - Leave empty (should accept, optional)
    - Enter single exclusion IP (should accept)
    - Enter multiple exclusion IPs (should accept)
    - Enter exclusion range (should accept)
    - Enter invalid exclusion format (should show validation error)
  - Test Device Credentials selection:
    - Verify credentials dropdown shows available credentials
    - Select single credential (should accept)
    - Select multiple credentials (should accept)
    - Verify selected credentials appear as tags/chips
    - Remove credential from selection (should work)
  - Test Timeout field:
    - Leave empty (should accept, optional)
    - Enter valid timeout value (should accept)
    - Enter invalid timeout (negative, non-numeric, should show validation error)
  - Test Retries field:
    - Leave empty (should accept, optional)
    - Enter valid retries value (should accept)
    - Enter invalid retries (negative, non-numeric, should show validation error)
  - Test Schedule Discovery toggle:
    - Toggle off (should hide schedule options, show "Run" button, hide "Save" button)
    - Toggle on (should show schedule options, hide "Run" button, show "Save" button)
    - Toggle multiple times and verify UI updates correctly
  - Test Schedule options (when toggle is enabled):
    - Select Daily frequency (should show time picker)
    - Select Weekly frequency (should show time picker and day of week selector)
    - Select Monthly frequency (should show time picker and day of month input)
    - Enter time (should accept HH:MM format)
    - Select day of week for weekly (should accept 1-7)
    - Enter day of month for monthly (should accept 1-31)
    - Test invalid schedule values (should show validation errors)
  - Test form actions:
    - Test Run button (when schedule disabled):
      - Fill all mandatory fields
      - Click Run button
      - Verify job is created and triggered immediately
      - Verify form closes
      - Verify job appears in discovery jobs table
      - Verify job status is "pending" or "in_progress"
    - Test Save button (when schedule enabled):
      - Fill all mandatory fields including schedule
      - Click Save button
      - Verify job is created as scheduled
      - Verify form closes
      - Verify job appears in discovery jobs table
      - Verify job status is "scheduled"
      - Verify schedule information is displayed
    - Test Reset button:
      - Fill in all form fields
      - Click Reset button
      - Verify all fields are cleared
      - Verify form returns to initial state
      - Verify organization/branch/hub dependencies are reset
    - Test Cancel button:
      - Fill in form fields
      - Click Cancel button
      - Verify form closes without saving
      - Verify no job is created
      - Reopen form and verify fields are empty
  - Test form validation:
    - Submit form without Name (should show validation error)
    - Submit form without Organization (should show validation error)
    - Submit form without Branch Location (should show validation error)
    - Submit form without IP Address Details (should show validation error)
    - Submit form with invalid IP format (should show validation error)
    - Submit form with schedule enabled but incomplete schedule (should show validation error)
    - Submit form with all required fields (should succeed)
- Test discovery jobs table:
  - Verify job brief displays correctly (Name, Organization, Branch, IP Details, Status, Schedule, Created At)
  - Verify status badges are correct
  - Verify schedule information displays for scheduled jobs
  - Test search and filter functionality
  - Test pagination
  - Test actions (View, Edit, Delete, Run Now for scheduled jobs)
- Test scan triggering and status:
  - View job status for running discovery
  - Trigger scan on inactive IP range (should fail or show warning)
  - Trigger scan on non-existent IP range (should return 404)
  - Trigger multiple scans on different IP ranges (should all work)
  - Attempt to trigger duplicate scan on same IP range (should fail with 400 Bad Request)
  - Verify scan job ID is returned
  - Verify IP range's lastScanned timestamp is updated
- Test scan status:
  - View scan status immediately after triggering (should show pending or in_progress)
  - View scan status while in progress (should show progress information)
  - View completed scan status (should show devices found count and completion time)
  - View failed scan status (should show error message)
  - Refresh scan status to get latest updates
  - Test with non-existent scan ID (should return 404)
- Test discovered devices:
  - View devices from completed scan
  - Verify all device information is displayed correctly
  - Search devices by IP address
  - Search devices by hostname
  - Search devices by MAC address
  - Search devices by device type
  - Filter devices by status (enrolled, ignored) - Note: All devices are auto-enrolled
  - Test pagination with large number of devices
  - Sort devices by different columns
  - Click on device to view details
  - Verify device details show all information including open ports
  - Verify device status shows "enrolled" (auto-enrolled)
  - Verify asset link is present for all devices
- Test auto-enrollment:
  - Verify discovered devices are automatically enrolled as assets during discovery
  - Verify assets are created with organization and branch from discovery job
  - Verify device status is "enrolled" immediately after discovery
  - Verify assetId is assigned to each discovered device
  - Verify asset link is displayed in discovered devices table
  - Click "View Asset" link and verify it navigates to correct asset
  - Verify enrolled assets appear in Assets module
  - Verify asset information matches discovery job (organization, branch)
  - Verify asset name is derived from device information (IP, hostname, etc.)
  - Test with multiple discovered devices (all should be auto-enrolled)
  - Test with devices that have different device types (all should be auto-enrolled)
  - Verify auto-enrollment happens for all discovered devices regardless of type
- Test device ignoring:
  - Mark device as ignored
  - Verify device status changes to "ignored"
  - Verify ignored devices can still be viewed
  - Verify ignored devices are excluded from future scan results (if applicable)
- Test scan history:
  - View scan history for an IP range
  - Verify all scans are listed
  - Click on historical scan to view results
  - Verify scan results are persisted correctly
  - Test pagination for scan history
- Test export functionality:
  - Export discovered devices to CSV
  - Verify CSV includes all device information
  - Verify CSV includes only visible/filtered devices
  - Verify CSV format is correct
- Test error handling:
  - Test scan failure scenarios
  - Verify error messages are displayed correctly
  - Test network timeout scenarios
  - Test invalid IP range scenarios
  - Verify system handles errors gracefully
- Test concurrent scans:
  - Trigger multiple scans simultaneously
  - Verify all scans can run concurrently
  - Verify scan status updates correctly for each scan
- Test real-time updates:
  - Verify scan progress updates (if polling is implemented)
  - Verify device count updates as scan progresses
  - Test refresh functionality
- Test integration:
  - Verify auto-enrolled devices appear in Assets module immediately after discovery
  - Verify auto-enrolled devices can be managed as assets
  - Verify device information is synced correctly to assets
  - Verify assets are linked to discovery job's organization and branch
  - Test with different device types (servers, workstations, network devices) - all should be auto-enrolled
  - Test with devices that have different OS types - all should be auto-enrolled
  - Verify asset names are derived from device information (IP address, hostname, etc.)
  - Verify assets maintain link to discovered device
- Test performance:
  - Test with large IP ranges (e.g., /16 subnet)
  - Test with many discovered devices
  - Verify pagination works correctly
  - Verify table performance with large datasets
- Test security:
  - Verify audit logs are created for scan triggers
  - Verify audit logs are created for auto-enrollment of discovered devices
  - Verify audit logs include organization and branch information from discovery job
  - Test with different user permissions
  - Verify credentials are used correctly for authentication
- Test edge cases:
  - Test with devices that have no hostname
  - Test with devices that have no MAC address
  - Test with devices that have no OS information
  - Test with devices that have no open ports
  - Test with devices that have many open ports
  - Test with duplicate IP addresses (should be handled correctly)
  - Test with devices discovered in multiple scans

---

### User Story 8: Device Discovery Page Functions

**Story ID:** `US-018`  
**Title:** View and Manage Discovery Jobs in Table View  
**Priority:** P0 (Critical)  
**Module:** Discovery - Discovery Jobs Management

**User Story:**
```
As an administrator
I want to view, search, filter, and manage discovery jobs in a table view
So that I can efficiently browse, monitor, and perform actions on discovery jobs
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to Discovery page and see discovery jobs table
- [ ] AC2: Table displays all discovery jobs with columns: Name, Organization, Branch Location, IP Details (summary), Status, Schedule Info, Devices Found, Created At, Actions
- [ ] AC3: Discovery jobs are sorted by default by Created At (newest first) or by status priority
- [ ] AC4: Search functionality allows searching by job name, organization name, branch name, or IP details
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: Column filter allows showing/hiding columns (Name, Organization, Branch, IP Details, Status, Schedule Info, Devices Found, Created At)
- [ ] AC7: Column filter modal displays checkboxes for each column
- [ ] AC8: "Reset Filters" button in filter modal restores all columns to visible state
- [ ] AC9: Status filter dropdown allows filtering jobs by status (All, Pending, In Progress, Completed, Failed, Scheduled)
- [ ] AC10: Status filter is independent of search and works in combination with search
- [ ] AC11: Organization filter dropdown allows filtering jobs by organization (with "All Organizations" option)
- [ ] AC12: Organization filter is independent of search and works in combination with search and status filter
- [ ] AC13: Table supports pagination with configurable page size (default 20 items per page, options: 10, 20, 50, 100)
- [ ] AC14: Pagination shows current page, total pages, and total count of discovery jobs
- [ ] AC15: Table supports sorting by Name (alphabetical), Organization (alphabetical), Status (priority order), Devices Found (numeric), Created At (date)
- [ ] AC16: Clicking on job name opens view modal/drawer with job details
- [ ] AC17: Actions column displays View, Edit, Delete buttons for each job
- [ ] AC18: Actions column displays "Run Now" button for scheduled jobs
- [ ] AC19: Actions column displays "Rescan" button for non-scheduled jobs (completed, failed, or pending jobs)
- [ ] AC20: "Rescan" button triggers a new discovery scan using the same job configuration
- [ ] AC21: "Rescan" button is not shown for scheduled jobs (only "Run Now" is shown)
- [ ] AC22: "Rescan" button is not shown for jobs that are currently in progress
- [ ] AC23: Clicking "Rescan" creates a new scan execution while keeping the original job record
- [ ] AC24: View button opens job details modal/drawer showing:
  - Job name and description
  - Organization and branch information
  - Hub information
  - IP address details
  - Exclusions
  - Device credentials used
  - Timeout and retries settings
  - Schedule information (if scheduled)
  - Status and progress
  - Devices found count
  - Created At and last updated timestamps
  - Link to view discovered devices
- [ ] AC25: Edit button opens edit modal with pre-filled job data (allows modifying job configuration)
- [ ] AC26: Delete button shows confirmation modal before deleting job
- [ ] AC27: System prevents deleting jobs that are currently running (returns 400 Bad Request error)
- [ ] AC28: "Run Now" button (for scheduled jobs) triggers immediate execution of scheduled job
- [ ] AC29: Status column displays status badge/indicator with appropriate color:
  - Pending (gray/yellow)
  - In Progress (blue)
  - Completed (green)
  - Failed (red)
  - Scheduled (purple/blue)
- [ ] AC30: Schedule Info column displays schedule details for scheduled jobs (frequency, next run time)
- [ ] AC31: Schedule Info column shows "N/A" or empty for non-scheduled jobs
- [ ] AC32: Devices Found column displays count of discovered devices for completed jobs
- [ ] AC33: Devices Found column shows "N/A" or "-" for pending/in-progress jobs
- [ ] AC34: Devices Found count is clickable and opens discovered devices view for that job
- [ ] AC35: IP Details column shows summary/truncated version of IP address details
- [ ] AC36: IP Details column shows full details in tooltip or view modal
- [ ] AC37: Export button downloads discovery jobs data as CSV file
- [ ] AC38: Exported CSV includes all visible columns and filtered/search results
- [ ] AC39: Refresh/Reload button reloads discovery jobs list from server
- [ ] AC40: "New Discovery" button is visible in table header and opens discovery creation modal
- [ ] AC41: Table shows loading state while fetching data
- [ ] AC42: Table displays empty state message when no discovery jobs exist
- [ ] AC43: Table displays "No results found" message when search/filter returns no matches
- [ ] AC44: Created At column displays formatted date and time
- [ ] AC45: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC46: Job details modal/drawer shows real-time status updates for in-progress jobs
- [ ] AC47: Job details modal/drawer shows progress information (IPs scanned, devices found, estimated time remaining)
- [ ] AC48: Job details modal/drawer has "View Discovered Devices" button/link
- [ ] AC49: Clicking "View Discovered Devices" navigates to discovered devices view filtered by that job
- [ ] AC50: Job details modal/drawer has "Rescan" button for non-scheduled jobs (completed, failed, pending)
- [ ] AC51: System creates audit log entries for job actions (view, edit, delete, run now, rescan)

**Test Data:**
```json
{
  "sampleDiscoveryJobs": [
    {
      "id": "job-001",
      "name": "Corporate Network Discovery",
      "organization": "Acme Corporation",
      "branch": "New York Office",
      "ipAddressDetails": "192.168.1.0/24",
      "status": "completed",
      "schedule": null,
      "devicesFound": 12,
      "createdAt": "2026-01-14T10:00:00.000Z"
    },
    {
      "id": "job-002",
      "name": "Daily Network Scan",
      "organization": "Acme Corporation",
      "branch": "San Francisco Office",
      "ipAddressDetails": "10.0.0.0/24",
      "status": "scheduled",
      "schedule": {
        "frequency": "Daily",
        "time": "02:00",
        "nextRun": "2026-01-15T02:00:00.000Z"
      },
      "devicesFound": null,
      "createdAt": "2026-01-14T09:00:00.000Z"
    },
    {
      "id": "job-003",
      "name": "Weekly Server Scan",
      "organization": "Tech Solutions Inc",
      "branch": "Austin Office",
      "ipAddressDetails": "172.16.1.10-172.16.1.50",
      "status": "in_progress",
      "schedule": null,
      "devicesFound": null,
      "createdAt": "2026-01-14T11:00:00.000Z"
    },
    {
      "id": "job-004",
      "name": "Failed Discovery",
      "organization": "Acme Corporation",
      "branch": "New York Office",
      "ipAddressDetails": "192.168.2.0/24",
      "status": "failed",
      "schedule": null,
      "devicesFound": 0,
      "createdAt": "2026-01-14T08:00:00.000Z"
    },
    {
      "id": "job-005",
      "name": "Pending Discovery",
      "organization": "Tech Solutions Inc",
      "branch": "Austin Office",
      "ipAddressDetails": "172.16.2.0/24",
      "status": "pending",
      "schedule": null,
      "devicesFound": null,
      "createdAt": "2026-01-14T12:00:00.000Z"
    }
  ],
  "searchScenarios": {
    "searchByName": "Corporate",
    "searchByOrganization": "Acme",
    "searchByBranch": "New York",
    "searchByIP": "192.168.1",
    "searchByID": "job-001",
    "noResults": "NonExistentJob",
    "caseInsensitive": "corporate"
  },
  "statusFilterScenarios": {
    "allStatuses": "all",
    "completedOnly": "completed",
    "inProgressOnly": "in_progress",
    "scheduledOnly": "scheduled",
    "failedOnly": "failed",
    "pendingOnly": "pending"
  },
  "organizationFilterScenarios": {
    "allOrganizations": "all",
    "acmeCorporation": "Acme Corporation",
    "techSolutions": "Tech Solutions Inc"
  },
  "paginationScenarios": {
    "pageSize10": 10,
    "pageSize20": 20,
    "pageSize50": 50,
    "pageSize100": 100
  },
  "sortScenarios": {
    "sortByName": "name",
    "sortByOrganization": "organization",
    "sortByStatus": "status",
    "sortByDevicesFound": "devicesFound",
    "sortByCreatedAt": "createdAt"
  }
}
```

**API Endpoints:**
- `GET /v1/discovery/jobs` - List discovery jobs with pagination, search, and filtering
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
    - `search` (string, optional) - Search term for name, organization, branch, or IP details
    - `status` (string, optional) - Filter by status (pending, in_progress, completed, failed, scheduled)
    - `organizationId` (string, optional) - Filter by organization ID
    - `sortBy` (string, optional) - Sort field (name, organization, status, devicesFound, createdAt)
    - `sortOrder` (string, optional) - Sort order (asc, desc)
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "job-uuid",
          "name": "Corporate Network Discovery",
          "organization": "Acme Corporation",
          "organizationId": "org-uuid",
          "branch": "New York Office",
          "branchId": "branch-uuid",
          "ipAddressDetails": "192.168.1.0/24",
          "status": "completed",
          "schedule": null,
          "devicesFound": 12,
          "createdAt": "2026-01-14T10:00:00.000Z",
          "updatedAt": "2026-01-14T10:05:30.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 10,
        "totalPages": 1
      }
    }
    ```
- `GET /v1/discovery/jobs/:id` - Get discovery job details by ID
  - **Path Parameters:**
    - `id` (string, required) - Job ID
  - **Success Response (200):**
    ```json
    {
      "id": "job-uuid",
      "name": "Corporate Network Discovery",
      "description": "Main corporate network device discovery",
      "organizationId": "org-uuid",
      "organization": "Acme Corporation",
      "branchId": "branch-uuid",
      "branch": "New York Office",
      "hubId": "hub-uuid",
      "hub": "Local Hub",
      "ipAddressDetails": "192.168.1.0/24",
      "exclusions": "192.168.1.1, 192.168.1.254",
      "credentialIds": ["cred-uuid-1", "cred-uuid-2"],
      "timeout": 30,
      "retries": 3,
      "status": "completed",
      "schedule": null,
      "devicesFound": 12,
      "progress": {
        "ipsScanned": 254,
        "totalIPs": 254,
        "devicesFound": 12
      },
      "createdAt": "2026-01-14T10:00:00.000Z",
      "updatedAt": "2026-01-14T10:05:30.000Z"
    }
    ```
- `PUT /v1/discovery/jobs/:id` - Update discovery job
  - **Path Parameters:**
    - `id` (string, required) - Job ID
  - **Request Body:** Same as POST /v1/discovery/jobs (all fields optional for update)
  - **Success Response (200):** Updated job object
- `DELETE /v1/discovery/jobs/:id` - Delete discovery job
  - **Path Parameters:**
    - `id` (string, required) - Job ID
  - **Success Response (200):**
    ```json
    {
      "message": "Discovery job deleted successfully"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Job is currently running
    - `404 Not Found` - Job not found
- `POST /v1/discovery/jobs/:id/run-now` - Run scheduled job immediately
  - **Path Parameters:**
    - `id` (string, required) - Job ID (must be scheduled)
  - **Success Response (202):**
    ```json
    {
      "message": "Scheduled job triggered successfully",
      "jobId": "job-uuid",
      "status": "pending"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Job is not scheduled or already running
    - `404 Not Found` - Job not found
- `POST /v1/discovery/jobs/:id/rescan` - Rescan a non-scheduled job
  - **Path Parameters:**
    - `id` (string, required) - Job ID (must be non-scheduled: completed, failed, or pending)
  - **Success Response (202):**
    ```json
    {
      "message": "Rescan initiated successfully",
      "jobId": "job-uuid",
      "scanId": "scan-uuid",
      "status": "pending"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Job is scheduled, currently running, or invalid status for rescan
    - `404 Not Found` - Job not found

**UI Components:**
- Page: `/discovery` (Discovery.tsx)
- Components:
  - **Table Header:**
    - Page title "Discovery Jobs" or "Discovery"
    - "New Discovery" button (PlusOutlined icon)
    - Status filter dropdown (All, Pending, In Progress, Completed, Failed, Scheduled)
    - Organization filter dropdown (All Organizations, plus list of organizations)
    - Search input field (with SearchOutlined icon)
    - Filter button (FilterOutlined icon) - opens column filter modal
    - Export button (DownloadOutlined icon) - exports to CSV
    - Refresh button (ReloadOutlined icon) - reloads data
  - **Table:**
    - Columns: Name, Organization, Branch Location, IP Details (summary), Status, Schedule Info, Devices Found, Created At, Actions
    - Sortable columns: Name, Organization, Status, Devices Found, Created At
    - Clickable job name (opens view modal/drawer)
    - Clickable devices found count (opens discovered devices view)
    - Status badges with colors (Pending, In Progress, Completed, Failed, Scheduled)
    - Actions column: View button, Edit button, Delete button, Run Now button (for scheduled jobs), Rescan button (for non-scheduled jobs)
  - **Column Filter Modal:**
    - Checkboxes for: Show Name, Show Organization, Show Branch, Show IP Details, Show Status, Show Schedule Info, Show Devices Found, Show Created At
  - **View Job Modal/Drawer:** (opened by clicking job name or View button)
    - Job details display:
      - Name and description
      - Organization and branch information
      - Hub information
      - IP address details (full)
      - Exclusions
      - Device credentials (list)
      - Timeout and retries
      - Schedule information (if scheduled)
      - Status and progress (real-time updates for in-progress)
      - Devices found count
      - Created At and updated timestamps
    - "View Discovered Devices" button/link
    - "Edit" button (if not running)
    - "Delete" button (if not running)
    - "Run Now" button (if scheduled)
    - "Rescan" button (if non-scheduled and not running)
    - Close button
  - **Edit Job Modal:** (opened by clicking Edit button)
    - Same form as New Discovery with pre-filled values
    - Save and Cancel buttons
    - Validation same as New Discovery form
  - **Delete Confirmation Modal:**
    - Confirmation message
    - Warning if job is running (delete disabled)
    - Confirm and Cancel buttons
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no discovery jobs exist
  - **No Results State:** Message when search/filter returns no matches
- User Actions:
  1. Navigate to Discovery page
  2. View discovery jobs table with all columns
  3. Use search box to filter jobs by name, organization, branch, or IP details
  4. Select status from dropdown to filter jobs by status
  5. Select organization from dropdown to filter jobs by organization
  6. Click filter button to show/hide columns
  7. Click column headers to sort (Name, Organization, Status, Devices Found, Created At)
  8. Adjust pagination (change page size, navigate pages)
  9. Click job name to view details in modal/drawer
  10. View job details including all configuration and status
  11. Click "View Discovered Devices" to see devices from that job
  12. Click devices found count to view discovered devices
  13. Click View button to open job details
  14. Click Edit button to edit job configuration
  15. Click Delete button to delete job (with confirmation, disabled if running)
  16. Click "Run Now" button on scheduled job to trigger immediate execution
  17. Click "Rescan" button on non-scheduled job (completed, failed, or pending) to trigger new scan
  18. Verify rescan creates new scan execution with same job configuration
  19. Verify job status updates to "pending" or "in_progress" after rescan
  20. Click Export button to download CSV
  21. Click Refresh button to reload data
  22. Click "New Discovery" button to create new discovery job

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have edit/delete permission)
- Verify table loads all discovery jobs on page load
- Test search functionality:
  - Search by job name (partial and full match)
  - Search by organization name
  - Search by branch name
  - Search by IP details (partial match)
  - Case-insensitive search
  - Search across multiple fields
  - Search with no results
  - Clear search to show all jobs
- Test status filtering:
  - Select "All" (should show all jobs)
  - Select "Completed" (should show only completed jobs)
  - Select "In Progress" (should show only in-progress jobs)
  - Select "Scheduled" (should show only scheduled jobs)
  - Select "Failed" (should show only failed jobs)
  - Select "Pending" (should show only pending jobs)
  - Combine status filter with search (should filter by both)
- Test organization filtering:
  - Select "All Organizations" (should show all jobs)
  - Select specific organization (should show only jobs from that organization)
  - Combine organization filter with search and status filter
- Test column filtering:
  - Hide/show individual columns
  - Apply filters
  - Reset filters to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify filter button shows active state when filters are applied
- Test sorting:
  - Sort by Name (alphabetical)
  - Sort by Organization (alphabetical)
  - Sort by Status (priority order)
  - Sort by Devices Found (numeric)
  - Sort by Created At (date)
  - Verify sorting works with filtered/search results
  - Test ascending and descending order
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test actions:
  - Click job name to view details
  - Click View button (should open job details modal)
  - Click Edit button (should open edit modal with pre-filled data)
  - Click Delete button on non-running job (should show confirmation)
  - Click Delete button on running job (should be disabled with tooltip)
  - Click "Run Now" on scheduled job (should trigger immediate execution)
  - Click "Rescan" on non-scheduled job (completed, failed, pending) - should trigger new scan
  - Verify "Rescan" button is not shown for scheduled jobs
  - Verify "Rescan" button is not shown for in-progress jobs
  - Verify delete confirmation modal works correctly
  - Verify job is deleted after confirmation
  - Verify job list updates after deletion
- Test status column:
  - Verify status badges display correctly for each status
  - Verify status colors are appropriate
  - Verify status updates in real-time for in-progress jobs
- Test schedule info column:
  - Verify schedule information displays for scheduled jobs
  - Verify "N/A" or empty for non-scheduled jobs
  - Verify next run time is displayed correctly
- Test devices found column:
  - Verify count displays for completed jobs
  - Verify "N/A" or "-" for pending/in-progress jobs
  - Click on count to view discovered devices
  - Verify discovered devices view is filtered by job
- Test IP details column:
  - Verify summary/truncated version displays in table
  - Verify full details are shown in view modal
  - Verify tooltip shows full details on hover
- Test job details modal:
  - Verify all job information is displayed correctly
  - Verify real-time updates for in-progress jobs
  - Verify progress information is shown
  - Click "View Discovered Devices" (should navigate to devices view)
  - Click Edit button (should open edit modal)
  - Click Delete button (should show confirmation)
  - Click "Run Now" for scheduled jobs (should trigger execution)
  - Click "Rescan" for non-scheduled jobs (should trigger new scan)
  - Verify "Rescan" button is shown for completed, failed, and pending jobs
  - Verify "Rescan" button is not shown for scheduled or in-progress jobs
- Test edit functionality:
  - Edit job name
  - Edit description
  - Edit IP address details
  - Edit schedule (enable/disable, change frequency)
  - Edit credentials
  - Edit timeout and retries
  - Save changes and verify job is updated
  - Verify updated job appears in table with new values
- Test "Run Now" functionality:
  - Click "Run Now" on scheduled job
  - Verify job status changes to "pending" or "in_progress"
  - Verify job executes immediately
  - Verify scheduled job remains scheduled (can run again later)
- Test "Rescan" functionality:
  - Verify "Rescan" button appears for completed jobs
  - Verify "Rescan" button appears for failed jobs
  - Verify "Rescan" button appears for pending jobs
  - Verify "Rescan" button does NOT appear for scheduled jobs (only "Run Now" appears)
  - Verify "Rescan" button does NOT appear for in-progress jobs
  - Click "Rescan" on completed job (should trigger new scan)
  - Click "Rescan" on failed job (should trigger new scan)
  - Click "Rescan" on pending job (should trigger new scan)
  - Verify rescan creates new scan execution with same job configuration
  - Verify job status updates to "pending" or "in_progress" after rescan
  - Verify rescan uses same IP address details, credentials, timeout, and retries
  - Verify rescan maintains same organization and branch
  - Test rescan from job details modal (should also have Rescan button)
  - Verify multiple rescans can be triggered for the same job
  - Test rescan via API endpoint (should work correctly)
- Test export functionality:
  - Export all discovery jobs
  - Export filtered/search results
  - Verify CSV file is downloaded correctly
  - Verify CSV includes correct columns and data
  - Verify CSV includes only visible columns
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no discovery jobs exist
  - "No results found" when search/filter returns no matches
- Test date formatting in Created At column
- Verify table performance with large number of jobs
- Test responsive design (table on different screen sizes)
- Test column visibility persistence (user preferences saved if implemented)
- Verify "New Discovery" button is always visible and functional
- Test job deletion restrictions:
  - Verify running jobs cannot be deleted
  - Verify delete button is disabled with appropriate tooltip
  - Verify non-running jobs can be deleted
  - Test attempting to delete running job via API (should return 400 Bad Request error)
- Test real-time updates:
  - Verify in-progress jobs show real-time status updates
  - Verify progress information updates
  - Verify devices found count updates when job completes
- Test integration:
  - Verify discovered devices link works correctly
  - Verify discovered devices view is filtered by selected job
  - Verify assets created from discovered devices are linked correctly
- Test audit logging:
  - Verify audit logs are created for job views
  - Verify audit logs are created for job edits
  - Verify audit logs are created for job deletions
  - Verify audit logs are created for "Run Now" actions
  - Verify audit logs are created for "Rescan" actions

---

### User Story 9: Deploy Agent Manually

**Story ID:** `US-019`  
**Title:** Manually Deploy Agent to Asset or Device  
**Priority:** P0 (Critical)  
**Module:** Agents - Agent Deployment

**User Story:**
```
As an administrator
I want to download agent installers from the Agent Versions page and manually install them on endpoints
So that I can deploy agents to assets and enable patch management capabilities
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to Settings > Agent Management > Agent Versions page
- [ ] AC2: Agent Versions page displays list of agent versions organized by OS and processor type (architecture)
- [ ] AC3: Agent versions are grouped by Operating System (Windows, MacOS, Linux)
- [ ] AC4: Within each OS group, agent versions are further organized by processor type/architecture (x64, x86, arm64, universal)
- [ ] AC5: Each agent version in the list displays:
  - Operating System
  - Processor Type/Architecture
  - Version number
  - Release date
  - File size
  - Download button icon (initially disabled)
- [ ] AC6: Organization dropdown is available at the top of the Agent Versions page
- [ ] AC7: Organization dropdown shows all available organizations
- [ ] AC8: Organization selection is required before download button is enabled
- [ ] AC9: When organization is selected, system generates/populates Host Key for that organization
- [ ] AC10: Host Key is displayed on the page (may be displayed globally or per agent version)
- [ ] AC11: Host Key is a unique identifier/key for the selected organization
- [ ] AC12: Host Key enables the download button icon for all agent versions
- [ ] AC13: Download button icon is disabled until organization is selected and Host Key is populated
- [ ] AC14: Download button icon becomes enabled after organization is selected
- [ ] AC15: Download button icon is visible for each agent version row/item
- [ ] AC16: Clicking download button icon downloads the agent installer file for that specific OS, architecture, and version
- [ ] AC17: Downloaded installer file has appropriate extension (.exe for Windows, .dmg for MacOS, .deb/.rpm for Linux)
- [ ] AC18: Downloaded installer file includes Host Key in the filename or installer (if applicable)
- [ ] AC19: Host Key is used during agent installation to associate agent with the selected organization
- [ ] AC20: User manually installs the downloaded agent on the endpoint/device
- [ ] AC21: During installation, agent uses Host Key to connect to the server
- [ ] AC22: Agent establishes connection with server after successful installation
- [ ] AC23: Once agent connects to server, agent automatically appears on Settings > Agent Management > Agent Details page
- [ ] AC24: Agent Details page shows all registered/connected agents
- [ ] AC25: Newly connected agent appears in Agent Details page with:
  - Agent ID/Machine ID
  - Name/Hostname
  - OS and OS Version
  - Agent Version
  - Status (Connected)
  - Organization (linked to organization from Host Key)
  - IP Address
  - Last Heartbeat timestamp
- [ ] AC26: System automatically enrolls asset for the newly connected agent
- [ ] AC27: Asset enrollment uses agent information (hostname, OS, OS version, IP address, manufacturer, model, serial number)
- [ ] AC28: Asset enrollment associates asset with the organization from Host Key
- [ ] AC29: Asset enrollment links agent to the created asset
- [ ] AC30: Auto-enrolled asset automatically appears in Assets page
- [ ] AC31: Asset in Assets page shows:
  - Asset name (derived from agent hostname or machine ID)
  - Organization (from Host Key)
  - OS and OS Version
  - Agent information (linked agent)
  - IP Address
  - Status
- [ ] AC32: Asset can be viewed, edited, and managed from Assets page
- [ ] AC33: Agent can be viewed, edited, and managed from Agent Details page
- [ ] AC34: System creates audit log entries for:
  - Agent version downloads
  - Agent connections/registrations
  - Asset auto-enrollment
- [ ] AC35: Host Key is unique per organization
- [ ] AC36: Changing organization selection updates Host Key and enables downloads for new organization
- [ ] AC37: Agent versions list can be filtered or searched (if applicable)
- [ ] AC38: Agent versions list shows latest version highlighted or marked (if applicable)
- [ ] AC39: System validates that selected organization exists and is active
- [ ] AC40: System handles multiple concurrent downloads from different users
- [ ] AC41: System tracks download statistics (optional, if implemented)
- [ ] AC42: Success message is displayed after agent installer is downloaded

**Test Data:**
```json
{
  "agentVersionsList": [
    {
      "id": "version-001",
      "os": "Windows",
      "processorType": "x64",
      "architecture": "x64",
      "version": "2.1.0",
      "releaseDate": "2026-01-10",
      "fileSize": 15728640,
      "fileName": "agent-windows-x64-2.1.0.exe",
      "downloadUrl": "/downloads/agent-windows-x64-2.1.0.exe",
      "checksum": "sha256:abc123..."
    },
    {
      "id": "version-002",
      "os": "Windows",
      "processorType": "x86",
      "architecture": "x86",
      "version": "2.1.0",
      "releaseDate": "2026-01-10",
      "fileSize": 12582912,
      "fileName": "agent-windows-x86-2.1.0.exe",
      "downloadUrl": "/downloads/agent-windows-x86-2.1.0.exe",
      "checksum": "sha256:def456..."
    },
    {
      "id": "version-003",
      "os": "MacOS",
      "processorType": "arm64",
      "architecture": "arm64",
      "version": "2.1.0",
      "releaseDate": "2026-01-10",
      "fileSize": 20971520,
      "fileName": "agent-macos-arm64-2.1.0.dmg",
      "downloadUrl": "/downloads/agent-macos-arm64-2.1.0.dmg",
      "checksum": "sha256:ghi789..."
    },
    {
      "id": "version-004",
      "os": "MacOS",
      "processorType": "x64",
      "architecture": "x64",
      "version": "2.1.0",
      "releaseDate": "2026-01-10",
      "fileSize": 20480000,
      "fileName": "agent-macos-x64-2.1.0.dmg",
      "downloadUrl": "/downloads/agent-macos-x64-2.1.0.dmg",
      "checksum": "sha256:jkl012..."
    },
    {
      "id": "version-005",
      "os": "Linux",
      "processorType": "x64",
      "architecture": "x64",
      "version": "2.0.5",
      "releaseDate": "2025-12-20",
      "fileSize": 12582912,
      "fileName": "agent-linux-x64-2.0.5.deb",
      "downloadUrl": "/downloads/agent-linux-x64-2.0.5.deb",
      "checksum": "sha256:mno345..."
    },
    {
      "id": "version-006",
      "os": "Linux",
      "processorType": "arm64",
      "architecture": "arm64",
      "version": "2.0.5",
      "releaseDate": "2025-12-20",
      "fileSize": 12320768,
      "fileName": "agent-linux-arm64-2.0.5.deb",
      "downloadUrl": "/downloads/agent-linux-arm64-2.0.5.deb",
      "checksum": "sha256:pqr678..."
    }
  ],
  "organizationHostKeys": {
    "org-001": {
      "organizationId": "org-001",
      "organizationName": "Acme Corporation",
      "hostKey": "abc123xyz789def456",
      "serverUrl": "https://patchiq.example.com"
    },
    "org-002": {
      "organizationId": "org-002",
      "organizationName": "Tech Solutions Inc",
      "hostKey": "xyz789abc123ghi456",
      "serverUrl": "https://patchiq.example.com"
    }
  },
  "newlyConnectedAgent": {
    "id": "agent-001",
    "machineId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "DESKTOP-ABC123",
    "hostname": "DESKTOP-ABC123",
    "status": "Connected",
    "os": "Windows",
    "osVersion": "Windows 11 Pro 23H2",
    "architecture": "x64",
    "agentVersion": "2.1.0",
    "ipAddress": "192.168.1.100",
    "lastHeartbeat": "2026-01-14T10:30:00.000Z",
    "organizationId": "org-001",
    "assetId": "asset-001"
  },
  "autoEnrolledAsset": {
    "id": "asset-001",
    "name": "DESKTOP-ABC123",
    "hostname": "DESKTOP-ABC123",
    "os": "Windows",
    "osVersion": "Windows 11 Pro 23H2",
    "manufacturer": "Dell Inc.",
    "model": "XPS 15 9520",
    "serialNumber": "XPS039542192893",
    "ipAddress": "192.168.1.100",
    "organizationId": "org-001",
    "branchId": null,
    "departmentId": null,
    "status": "In Use",
    "agentId": "agent-001",
    "createdAt": "2026-01-14T10:30:00.000Z"
  }
}
```

**API Endpoints:**
- `GET /v1/agent-versions` - List available agent versions organized by OS and processor type
  - **Query Parameters:**
    - `os` (string, optional) - Filter by OS (Windows, MacOS, Linux)
    - `processorType` (string, optional) - Filter by processor type/architecture (x64, x86, arm64)
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "version-001",
          "os": "Windows",
          "processorType": "x64",
          "architecture": "x64",
          "version": "2.1.0",
          "releaseDate": "2026-01-10",
          "fileSize": 15728640,
          "fileName": "agent-windows-x64-2.1.0.exe",
          "downloadUrl": "/downloads/agent-windows-x64-2.1.0.exe",
          "checksum": "sha256:abc123...",
          "isLatest": true
        }
      ]
    }
    ```
- `GET /v1/organizations/:id/host-key` - Get Host Key for an organization
  - **Path Parameters:**
    - `id` (string, required) - Organization ID
  - **Success Response (200):**
    ```json
    {
      "organizationId": "org-uuid",
      "organizationName": "Acme Corporation",
      "hostKey": "abc123xyz789def456",
      "serverUrl": "https://patchiq.example.com"
    }
    ```
  - **Error Responses:**
    - `404 Not Found` - Organization not found
- `GET /v1/agent-versions/:id/download` - Download agent installer with Host Key
  - **Path Parameters:**
    - `id` (string, required) - Agent Version ID
  - **Query Parameters:**
    - `organizationId` (string, required) - Organization ID (for Host Key)
  - **Success Response (200):**
    - Binary file download with appropriate Content-Type and Content-Disposition headers
    - File may include Host Key in installer or filename
  - **Error Responses:**
    - `400 Bad Request` - Organization ID not provided or invalid
    - `404 Not Found` - Agent version not found
- `GET /v1/agents` - List all registered/connected agents (Agent Details page)
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
    - `status` (string, optional) - Filter by status (Connected, Disconnected, Pending)
    - `organizationId` (string, optional) - Filter by organization ID
    - `search` (string, optional) - Search by name, hostname, IP address
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "agent-uuid",
          "machineId": "550e8400-e29b-41d4-a716-446655440000",
          "name": "DESKTOP-ABC123",
          "hostname": "DESKTOP-ABC123",
          "status": "Connected",
          "os": "Windows",
          "osVersion": "Windows 11 Pro 23H2",
          "architecture": "x64",
          "agentVersion": "2.1.0",
          "ipAddress": "192.168.1.100",
          "lastHeartbeat": "2026-01-14T10:30:00.000Z",
          "organizationId": "org-uuid",
          "assetId": "asset-uuid",
          "registeredAt": "2026-01-14T10:30:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 10,
        "totalPages": 1
      }
    }
    ```

**UI Components:**
- Page: `/settings/agent-management/agent-versions` (AgentVersions.tsx)
- Components:
  - **Agent Versions Page:**
    - Page title: "Agent Versions"
    - **Organization Dropdown:**
      - Located at top of page (required)
      - Shows all available organizations
      - "Select Organization" placeholder initially
      - When organization is selected:
        - Host Key is populated/displayed
        - Download button icons are enabled for all agent versions
    - **Host Key Display:**
      - Displays Host Key value after organization is selected
      - Shows organization name associated with Host Key
      - May have "Copy" button to copy Host Key to clipboard
      - May display server URL alongside Host Key
    - **Agent Versions List/Table:**
      - Organized by Operating System (Windows, MacOS, Linux)
      - Within each OS, organized by Processor Type (x64, x86, arm64, universal)
      - Each row displays:
        - Operating System (Windows, MacOS, Linux)
        - Processor Type/Architecture (x64, x86, arm64, universal)
        - Version number (e.g., 2.1.0)
        - Release date (formatted date)
        - File size (formatted, e.g., "15 MB")
        - Download button icon (DownloadOutlined icon)
          - Initially disabled (grayed out)
          - Enabled after organization is selected and Host Key is populated
          - Shows enabled state (primary color)
      - Columns: OS, Processor Type, Version, Release Date, File Size, Actions (Download)
      - Sortable columns (optional)
      - Search/filter functionality (optional)
  - **Agent Details Page:**
    - Page: `/settings/agent-management/agent-details` (AgentDetails.tsx)
    - Page title: "Agent Details"
    - Table/list of all registered/connected agents
    - Columns: Agent ID/Machine ID, Name, Hostname, OS, OS Version, Agent Version, Status, IP Address, Organization, Last Heartbeat, Actions
    - Shows agents that have successfully connected to the server
    - Auto-updates when new agents connect
- User Actions:
  1. Navigate to Settings > Agent Management > Agent Versions page
  2. View list of agent versions organized by OS and processor type
  3. Select Organization from dropdown at top of page
  4. Verify Host Key is populated/displayed after organization selection
  5. Verify Download button icons are enabled for all agent versions
  6. Identify the appropriate agent version for target device (match OS and processor type)
  7. Click Download button icon for the selected agent version
  8. Verify agent installer file is downloaded (.exe, .dmg, .deb, .rpm)
  9. Verify downloaded file includes Host Key (if applicable) or installer is pre-configured with Host Key
  10. Manually install the downloaded agent on the endpoint/device
  11. During installation, agent uses Host Key to connect to server
  12. Verify agent establishes connection with server after installation
  13. Navigate to Settings > Agent Management > Agent Details page
  14. Verify newly connected agent appears in Agent Details table
  15. Verify agent information is displayed correctly (name, hostname, OS, version, status, IP, organization)
  16. Verify agent status shows "Connected"
  17. Navigate to Assets page
  18. Verify asset is auto-enrolled and appears in Assets table
  19. Verify asset information matches agent information (hostname, OS, IP, organization)
  20. Verify asset is linked to the connected agent
  21. Verify asset can be managed from Assets page
  22. Verify agent can be managed from Agent Details page

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have download permission)
- Test navigation:
  - Navigate to Settings > Agent Management > Agent Versions page
  - Verify page title is "Agent Versions"
  - Verify agent versions list is displayed
- Test agent versions list:
  - Verify list is organized by OS (Windows, MacOS, Linux)
  - Verify within each OS, versions are organized by processor type (x64, x86, arm64, universal)
  - Verify each agent version shows: OS, Processor Type, Version, Release Date, File Size
  - Verify download button icon is present for each version
  - Verify download button icon is initially disabled (grayed out)
  - Test with different OS types and processor types
- Test organization selection:
  - Verify organization dropdown is present at top of page
  - Verify organization dropdown shows all available organizations
  - Select organization from dropdown
  - Verify Host Key is populated/displayed after organization selection
  - Verify Host Key is unique for the selected organization
  - Verify Host Key is displayed clearly (may be in read-only input field or text display)
  - Change organization selection
  - Verify Host Key updates to new organization's Host Key
  - Verify download buttons remain enabled for new organization
- Test Host Key:
  - Verify Host Key is generated/retrieved for selected organization
  - Verify Host Key is unique per organization
  - Verify Host Key format is valid (if applicable)
  - Test copying Host Key to clipboard (if copy button available)
  - Verify Host Key is used during agent installation to associate with organization
  - Test with multiple organizations (verify different Host Keys)
- Test download button enablement:
  - Verify download button is disabled when no organization is selected
  - Select organization
  - Verify download button becomes enabled for all agent versions
  - Verify download button icon changes from disabled to enabled state
  - Change organization
  - Verify download buttons remain enabled
  - Deselect organization (if possible)
  - Verify download buttons become disabled again
- Test agent installer download:
  - Select organization (enables download buttons)
  - Click download button for Windows agent (x64)
  - Verify Windows installer file is downloaded (.exe)
  - Verify file name matches agent version (e.g., agent-windows-x64-2.1.0.exe)
  - Verify file size matches expected size
  - Download MacOS agent (arm64)
  - Verify MacOS installer file is downloaded (.dmg)
  - Download Linux agent (x64)
  - Verify Linux installer file is downloaded (.deb or .rpm)
  - Test download for different processor types (x64, x86, arm64)
  - Test download for different OS types (Windows, MacOS, Linux)
  - Test download for different versions
  - Verify downloaded file can be opened/executed
  - Verify Host Key is included in installer or installer is pre-configured (if applicable)
- Test manual installation:
  - Download agent installer
  - Manually install agent on test endpoint/device
  - Verify installation process works correctly
  - Verify agent uses Host Key during installation
  - Verify agent connects to server after installation
  - Test with different OS platforms (Windows, MacOS, Linux)
  - Test with different processor types
- Test agent connection and appearance:
  - After agent is installed and connects to server
  - Navigate to Settings > Agent Management > Agent Details page
  - Verify newly connected agent appears in Agent Details table
  - Verify agent information is correct:
    - Machine ID/Agent ID
    - Name/Hostname (from agent)
    - OS and OS Version
    - Agent Version
    - Status (shows "Connected")
    - IP Address
    - Organization (matches selected organization from Host Key)
    - Last Heartbeat timestamp
  - Verify agent can be viewed, edited, and managed
  - Test multiple agents connecting (verify all appear correctly)
- Test asset auto-enrollment:
  - After agent connects to server
  - Navigate to Assets page
  - Verify asset is automatically enrolled and appears in Assets table
  - Verify asset information matches agent information:
    - Asset name (derived from agent hostname or machine ID)
    - Organization (matches organization from Host Key)
    - OS and OS Version
    - IP Address
    - Manufacturer, Model, Serial Number (from agent if available)
    - Status (shows "In Use")
  - Verify asset is linked to the connected agent
  - Verify asset link shows agent ID or name
  - Verify asset can be viewed, edited, and managed
  - Test with multiple agents (verify all assets are auto-enrolled)
- Test agent details page:
  - Verify Agent Details page displays all connected agents
  - Verify table columns are correct (ID, Name, Hostname, OS, Version, Status, IP, Organization, Last Heartbeat)
  - Verify agents are sorted/filtered correctly
  - Test search functionality (if available)
  - Test filter by organization (if available)
  - Test filter by status (if available)
  - Verify pagination works correctly
  - Verify agent details modal/drawer works when clicking on agent
- Test integration:
  - Verify agent registration flow works correctly
  - Verify agent uses Host Key to associate with organization
  - Verify agent appears in Agent Details page after connection
  - Verify asset is auto-enrolled after agent connection
  - Verify asset appears in Assets page
  - Verify agent and asset are linked correctly
  - Test with multiple agents from same organization
  - Test with multiple agents from different organizations
- Test error handling:
  - Test download without selecting organization (should be disabled)
  - Test with network errors during download
  - Test with server errors
  - Test with invalid agent version
  - Verify appropriate error messages are shown
  - Test agent installation failures
  - Test agent connection failures
- Test edge cases:
  - Test with different agent versions
  - Test with latest and older versions
  - Test with all processor types (x64, x86, arm64, universal)
  - Test with all OS types (Windows, MacOS, Linux)
  - Test multiple concurrent downloads
  - Test downloading same agent multiple times
- Test security:
  - Verify Host Key is unique per organization
  - Verify Host Key is securely transmitted
  - Verify download URLs are secure
  - Verify audit logs are created for:
    - Organization selection
    - Agent version downloads
    - Agent connections/registrations
    - Asset auto-enrollments
- Test UI responsiveness:
  - Test Agent Versions page on different screen sizes
  - Test Agent Details page on different screen sizes
  - Verify table/list is responsive
  - Verify download buttons are accessible
  - Test on different browsers
- Test real-time updates:
  - Verify Agent Details page updates when new agents connect
  - Verify Assets page updates when new assets are auto-enrolled
  - Test with multiple users viewing pages simultaneously

---

### User Story 10: Agent Details Page Functions

**Story ID:** `US-020`  
**Title:** Agent Details Page Functions  
**Priority:** P0  
**Module:** Agents

**User Story:**
```
As a system administrator
I want to view and manage all registered agents in a table
So that I can monitor agent status, view agent details, and perform actions on agents
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Settings > Agent Management > Agent Details page
- [ ] AC2: User can see a table listing all registered agents with the following columns:
  - Agent Name (sortable, searchable)
  - Status (Connected, Disconnected, Pending, Error) with color-coded badges (green, gray, blue, red)
  - Last Heartbeat (sortable, shows relative time)
  - IP Address (copyable)
  - Hostname
  - OS (Windows, MacOS, Linux) with filter dropdown
  - Version (Agent Version)
  - Asset (shows "View" button with link icon if agent is linked to asset)
  - Actions (View, Edit, Delete)
- [ ] AC3: User can search agents by name, IP address, hostname, machine ID, or OS using a search input field
- [ ] AC4: User can filter agents by:
  - Status (Connected, Disconnected, Pending, Error) via Status column filter
  - OS (Windows, MacOS, Linux) via OS column filter
  - Organization (if multi-tenant) via Organization column filter
- [ ] AC5: User can sort agents by:
  - Agent Name (ascending/descending)
  - Last Heartbeat (newest/oldest first)
  - Status (ascending/descending)
- [ ] AC6: User can paginate through agents using table pagination controls
- [ ] AC7: User can view agent details by clicking "View" action button, which opens an Agent Details Drawer with the following tabs:
  - **Overview Tab:**
    - Heartbeat Status section: Last Heartbeat (relative time and absolute timestamp), Status badge
    - System Information: Machine ID (copyable), Operating System and Version, Agent Version, Registered date
    - Network Information: IP Address (copyable), Hostname, Serial Number
    - Resource Utilization section: Shows CPU usage (percentage), Memory usage (percentage and used/total), Disk usage (percentage and used/total) with visual indicators (progress bars or charts)
    - Capabilities section: Shows agent capabilities as tags
  - **Linked Tab:**
    - Linked Asset card: Shows asset ID with "View Asset" button (navigates to asset details page)
    - Tags section: Shows all agent tags as tags
  - **Commands Tab:**
    - Table of command history with columns: Type, Status (color-coded badges: Completed=green, Pending=blue, Sent=light blue, Failed=red), Created date, Result
    - Sortable and paginated command history
- [ ] AC8: User can edit agent details by clicking "Edit" action button (opens edit modal/form)
- [ ] AC9: User can delete an agent by clicking "Delete" action button, which shows a confirmation dialog before deletion
- [ ] AC10: User can click on "View" button in Asset column to navigate to the linked asset's details page
- [ ] AC11: User can use column visibility toggle to show/hide columns (if column filter feature is enabled)
- [ ] AC12: Table displays empty state message when no agents are found or registered
- [ ] AC13: Table shows loading state while fetching agent data
- [ ] AC14: Agent status is automatically updated in real-time or refreshed periodically
- [ ] AC15: Last Heartbeat column shows relative time (e.g., "2 minutes ago", "1 hour ago") and updates dynamically
- [ ] AC16: Status badges are color-coded:
  - Connected: Green (success)
  - Disconnected: Gray (default)
  - Pending: Blue (processing)
  - Error: Red (error)
- [ ] AC17: Asset column shows "—" if agent is not linked to any asset
- [ ] AC18: Resource Utilization section in Overview tab displays CPU, Memory, and Disk usage with visual indicators (progress bars, percentages, and used/total values)
- [ ] AC19: Resource Utilization metrics update in real-time or refresh periodically when agent is connected
- [ ] AC20: Agent Details Drawer can be closed by clicking outside, clicking X button, or pressing Escape key
- [ ] AC21: All copyable fields (Machine ID, IP Address) have copy icon and can be copied to clipboard
- [ ] AC22: Command history in Commands tab loads when drawer is opened
- [ ] AC23: User can refresh agent list using a refresh button (ReloadOutlined icon) in page header
- [ ] AC24: Table supports export functionality (Export button) to export agent list as CSV/Excel (if applicable)
- [ ] AC25: User can select multiple agents using checkboxes and perform bulk actions (if applicable)
- [ ] AC26: Page respects user permissions - users with view-only permission cannot edit or delete agents

**Test Data:**
```json
{
  "agents": [
    {
      "id": "agent-001",
      "machineId": "MACHINE-ABC123",
      "name": "Windows Agent 01",
      "hostname": "WINDOWS-PC-01",
      "status": "Connected",
      "os": "Windows",
      "osVersion": "Windows 11 Pro",
      "agentVersion": "2.1.0",
      "ipAddress": "192.168.1.100",
      "lastHeartbeat": "2024-01-15T10:30:00Z",
      "lastHeartbeatRelative": "2 minutes ago",
      "registeredAt": "2024-01-10T08:00:00Z",
      "assetId": "asset-001",
      "organizationId": "org-001",
      "resourceUtilization": {
        "cpu": {
          "percentage": 45.5,
          "cores": 8,
          "lastUpdated": "2024-01-15T10:30:00Z"
        },
        "memory": {
          "percentage": 62.3,
          "used": "8.2 GB",
          "total": "16.0 GB",
          "lastUpdated": "2024-01-15T10:30:00Z"
        },
        "disk": {
          "percentage": 34.8,
          "used": "348.5 GB",
          "total": "1.0 TB",
          "lastUpdated": "2024-01-15T10:30:00Z"
        }
      }
    },
    {
      "id": "agent-002",
      "machineId": "MACHINE-XYZ789",
      "name": "Linux Agent 01",
      "hostname": "linux-server-01",
      "status": "Disconnected",
      "os": "Linux",
      "osVersion": "Ubuntu 22.04",
      "agentVersion": "2.0.5",
      "ipAddress": "192.168.1.101",
      "lastHeartbeat": "2024-01-15T09:00:00Z",
      "lastHeartbeatRelative": "1 hour ago",
      "registeredAt": "2024-01-08T12:00:00Z",
      "assetId": null,
      "organizationId": "org-001",
      "resourceUtilization": {
        "cpu": {
          "percentage": 22.1,
          "cores": 4,
          "lastUpdated": "2024-01-15T09:00:00Z"
        },
        "memory": {
          "percentage": 48.5,
          "used": "3.9 GB",
          "total": "8.0 GB",
          "lastUpdated": "2024-01-15T09:00:00Z"
        },
        "disk": {
          "percentage": 67.2,
          "used": "672.0 GB",
          "total": "1.0 TB",
          "lastUpdated": "2024-01-15T09:00:00Z"
        }
      }
    },
    {
      "id": "agent-003",
      "machineId": "MACHINE-DEF456",
      "name": "MacOS Agent 01",
      "hostname": "macbook-pro-01",
      "status": "Pending",
      "os": "MacOS",
      "osVersion": "macOS 14.0",
      "agentVersion": "2.1.0",
      "ipAddress": "192.168.1.102",
      "lastHeartbeat": null,
      "lastHeartbeatRelative": "Never",
      "registeredAt": "2024-01-15T10:25:00Z",
      "assetId": "asset-003",
      "organizationId": "org-001",
      "resourceUtilization": null
    }
  ],
  "filters": {
    "status": ["Connected", "Disconnected", "Pending", "Error"],
    "os": ["Windows", "MacOS", "Linux"],
    "organizations": ["org-001", "org-002"]
  },
  "commands": [
    {
      "id": "cmd-001",
      "agentId": "agent-001",
      "type": "patch_scan",
      "status": "Completed",
      "createdAt": "2024-01-15T10:00:00Z",
      "result": "Scan completed successfully. 15 patches available."
    },
    {
      "id": "cmd-002",
      "agentId": "agent-001",
      "type": "install_patch",
      "status": "Pending",
      "createdAt": "2024-01-15T10:25:00Z",
      "result": null
    }
  ]
}
```

**API Endpoints:**
- `GET /v1/agents` - List all agents (supports query parameters: `page`, `limit`, `search`, `status`, `os`, `organizationId`, `sortBy`, `sortOrder`)
  - Response: `{ agents: Agent[], total: number, page: number, limit: number }`
- `GET /v1/agents/:id` - Get agent details by ID
  - Response: `Agent` object with full details
- `GET /v1/agents/:id/commands` - Get agent command history
  - Response: `{ commands: Command[], total: number }`
- `GET /v1/agents/:id/resources` - Get agent resource utilization
  - Response: `{ cpu: { percentage: number, cores: number, lastUpdated: string }, memory: { percentage: number, used: string, total: string, lastUpdated: string }, disk: { percentage: number, used: string, total: string, lastUpdated: string } }`
- `PUT /v1/agents/:id` - Update agent details
  - Request body: `{ name?: string, tags?: string[] }`
- `DELETE /v1/agents/:id` - Delete an agent
  - Response: `{ success: boolean, message: string }`
- `POST /v1/agents/export` - Export agents list (if applicable)
  - Request body: `{ filters?: object, format: 'csv' | 'excel' }`
- `GET /v1/assets/:id` - Get asset details (for linked asset navigation)

**UI Components:**
- Page: `/settings/agent-management/agent-details` (AgentDetails.tsx)
- Components:
  - **Agent Details Page:**
    - Page title: "Agent Details"
    - Search input field (SearchOutlined icon) in page header
    - Refresh button (ReloadOutlined icon) in page header
    - Export button (DownloadOutlined icon) in page header (if applicable)
    - Column filter/visibility toggle button (FilterOutlined icon) in page header (if applicable)
    - Agents table with columns:
      - **Agent Name:** Text (sortable, searchable)
      - **Status:** Tag/Badge (color-coded, filterable)
        - Connected: Green (success)
        - Disconnected: Gray (default)
        - Pending: Blue (processing)
        - Error: Red (error)
      - **Last Heartbeat:** Text (shows relative time, sortable by timestamp)
      - **IP Address:** Text with copy icon (copyable)
      - **Hostname:** Text
      - **OS:** Text (filterable: Windows, MacOS, Linux)
      - **Version:** Text (Agent Version)
      - **Asset:** Button with link icon (shows "View" if linked, "—" if not)
      - **Actions:** Dropdown menu (MoreOutlined icon) with options:
        - View (opens drawer)
        - Edit (opens edit modal)
        - Delete (shows confirmation dialog)
    - Table pagination controls at bottom
    - Empty state component when no agents found
    - Loading spinner while fetching data
  - **Agent Details Drawer:** (AgentDetailsDrawer.tsx)
    - Drawer title: Agent Name
    - Tabs: Overview, Linked, Commands
    - **Overview Tab:**
      - Heartbeat Status section:
        - Last Heartbeat: Statistic component (relative time and absolute timestamp)
        - Status: Badge (color-coded)
      - System Information section:
        - Machine ID: Text with copy icon (copyable)
        - Operating System: Text (OS + Version)
        - Agent Version: Text
        - Registered: Text (formatted date)
      - Network Information section:
        - IP Address: Text with copy icon (copyable)
        - Hostname: Text
        - Serial Number: Text (if available)
      - Resource Utilization section:
        - CPU Usage: Progress bar/Statistic component (percentage, cores, last updated timestamp)
        - Memory Usage: Progress bar/Statistic component (percentage, used/total GB, last updated timestamp)
        - Disk Usage: Progress bar/Statistic component (percentage, used/total GB/TB, last updated timestamp)
        - Visual indicators: Color-coded progress bars (green: low, yellow: medium, red: high usage)
        - Updates automatically when agent is connected
      - Capabilities section:
        - Tags showing agent capabilities
    - **Linked Tab:**
      - Linked Asset card:
        - Asset ID: Text
        - View Asset button (LinkOutlined icon) - navigates to asset details
      - Tags section:
        - Tags showing all agent tags
    - **Commands Tab:**
      - Commands table with columns:
        - Type: Tag (uppercase)
        - Status: Tag/Badge (color-coded: Completed=green, Pending=blue, Sent=light blue, Failed=red)
        - Created: Text (formatted date/time)
        - Result: Text (shows result or "—" if none)
      - Table pagination
      - Loading spinner while fetching commands
    - Close button (X icon) in drawer header
  - **Edit Agent Modal:** (if applicable)
    - Form with fields: Name, Tags (multi-select)
    - Save, Reset, Cancel buttons
  - **Delete Confirmation Dialog:**
    - Message: "Are you sure you want to delete this agent?"
    - Warning about consequences
    - Confirm and Cancel buttons

- User Actions:
  1. Navigate to Settings > Agent Management > Agent Details page
  2. View table of all registered agents
  3. Use search input to search agents by name, IP, hostname, machine ID, or OS
  4. Filter agents by Status using Status column filter dropdown
  5. Filter agents by OS using OS column filter dropdown
  6. Filter agents by Organization using Organization column filter (if multi-tenant)
  7. Sort agents by Agent Name (click column header)
  8. Sort agents by Last Heartbeat (click column header)
  9. Sort agents by Status (click column header)
  10. Use pagination controls to navigate through pages
  11. Toggle column visibility using column filter button (if available)
  12. Click Refresh button to reload agent list
  13. Click Export button to export agent list (if available)
  14. Click "View" action button for an agent:
    - Verify Agent Details Drawer opens
    - Verify Overview tab is selected by default
    - View Heartbeat Status, System Information, Network Information, Resource Utilization, Capabilities
    - Verify Resource Utilization shows CPU, Memory, and Disk usage with visual indicators
    - Switch to Linked tab and view linked asset and tags
    - Switch to Commands tab and view command history
    - Close drawer by clicking X button or outside drawer
  15. Click "Edit" action button for an agent:
    - Verify Edit modal opens
    - Modify agent details (name, tags)
    - Click Save to update
    - Click Cancel to close without saving
    - Click Reset to reset form to original values
  16. Click "Delete" action button for an agent:
    - Verify confirmation dialog appears
    - Click Confirm to delete agent
    - Click Cancel to close dialog without deleting
    - Verify agent is removed from table after deletion
  17. Click "View" button in Asset column:
    - Verify navigation to asset details page
    - Verify correct asset ID is used in URL
  18. Copy IP Address or Machine ID using copy icon
  19. View Resource Utilization in Overview tab:
    - Verify CPU usage is displayed (percentage and cores)
    - Verify Memory usage is displayed (percentage, used/total)
    - Verify Disk usage is displayed (percentage, used/total)
    - Verify visual indicators (progress bars) are color-coded
    - Verify resource metrics update automatically (if real-time)
  20. Verify status badges are color-coded correctly
  21. Verify Last Heartbeat shows relative time and updates dynamically
  22. Verify empty state is shown when no agents found
  23. Verify loading state is shown while fetching data

**Test Notes:**
- Test with admin role (should have full access: view, edit, delete)
- Test with regular user role (should have view access, may not have edit/delete permissions)
- Test agent table display:
  - Verify all columns are displayed correctly
  - Verify agent information is accurate
  - Verify status badges are color-coded
  - Verify Last Heartbeat shows relative time
  - Verify Asset column shows "View" button if linked, "—" if not
- Test search functionality:
  - Search by agent name
  - Search by IP address
  - Search by hostname
  - Search by machine ID
  - Search by OS
  - Verify search is case-insensitive
  - Verify search filters results correctly
  - Verify empty results show empty state message
- Test filter functionality:
  - Filter by Status (Connected, Disconnected, Pending, Error)
  - Filter by OS (Windows, MacOS, Linux)
  - Filter by Organization (if multi-tenant)
  - Apply multiple filters simultaneously
  - Clear filters individually
  - Clear all filters
  - Verify filtered results are correct
- Test sort functionality:
  - Sort by Agent Name (ascending/descending)
  - Sort by Last Heartbeat (newest/oldest first)
  - Sort by Status (ascending/descending)
  - Verify sort order is correct
  - Verify sort indicators show current sort direction
- Test pagination:
  - Navigate to next page
  - Navigate to previous page
  - Jump to specific page
  - Change page size (if applicable)
  - Verify pagination controls are correct
  - Verify total count is accurate
- Test Agent Details Drawer:
  - Open drawer by clicking "View" action
  - Verify drawer opens from right side
  - Verify drawer title shows agent name
  - Verify Overview tab is selected by default
  - View all sections in Overview tab:
    - Verify Heartbeat Status shows correct information
    - Verify System Information shows correct details
    - Verify Network Information shows correct details
    - Verify Resource Utilization section shows CPU, Memory, and Disk usage:
      - CPU: Percentage, cores, last updated timestamp
      - Memory: Percentage, used/total GB, last updated timestamp
      - Disk: Percentage, used/total GB/TB, last updated timestamp
      - Verify progress bars are displayed and color-coded
      - Verify values are accurate and formatted correctly
    - Verify Capabilities section shows agent capabilities
  - Switch to Linked tab:
    - Verify linked asset is shown (if agent is linked)
    - Verify "View Asset" button navigates correctly
    - Verify tags are displayed correctly
  - Switch to Commands tab:
    - Verify commands table is displayed
    - Verify command history loads correctly
    - Verify command status badges are color-coded
    - Verify commands are sortable and paginated
  - Test copy functionality:
    - Copy Machine ID
    - Copy IP Address
    - Verify copied values are correct
  - Close drawer by clicking X button
  - Close drawer by clicking outside drawer
  - Close drawer by pressing Escape key
- Test Edit Agent functionality:
  - Click "Edit" action button
  - Verify Edit modal opens
  - Modify agent name
  - Modify agent tags (multi-select)
  - Click Save to update agent
  - Verify agent is updated in table
  - Click Cancel to close without saving
  - Click Reset to reset form
- Test Resource Utilization:
  - Open agent details drawer for connected agent
  - Verify Resource Utilization section is displayed in Overview tab
  - Verify CPU usage shows:
    - Percentage (e.g., 45.5%)
    - Number of cores (e.g., 8 cores)
    - Last updated timestamp
    - Visual progress bar or indicator
  - Verify Memory usage shows:
    - Percentage (e.g., 62.3%)
    - Used amount (e.g., "8.2 GB")
    - Total amount (e.g., "16.0 GB")
    - Last updated timestamp
    - Visual progress bar or indicator
  - Verify Disk usage shows:
    - Percentage (e.g., 34.8%)
    - Used amount (e.g., "348.5 GB" or "1.2 TB")
    - Total amount (e.g., "1.0 TB")
    - Last updated timestamp
    - Visual progress bar or indicator
  - Verify progress bars are color-coded:
    - Green for low usage (e.g., < 50%)
    - Yellow for medium usage (e.g., 50-80%)
    - Red for high usage (e.g., > 80%)
  - Verify resource metrics update automatically (if real-time enabled)
  - Test with disconnected agent (should show no resource data or "N/A")
  - Test with agent that has no resource data (should show "Not available" or similar)
  - Verify last updated timestamp is accurate and updates when metrics refresh
- Test Delete Agent functionality:
  - Click "Delete" action button
  - Verify confirmation dialog appears
  - Verify dialog message is clear
  - Click Confirm to delete
  - Verify agent is removed from table
  - Verify success message appears
  - Click Cancel to close dialog without deleting
  - Verify agent remains in table
- Test Asset navigation:
  - Click "View" button in Asset column for linked agent
  - Verify navigation to asset details page
  - Verify correct asset ID is in URL
  - Verify asset details page loads correctly
  - Click "View Asset" button in Linked tab of drawer
  - Verify navigation works correctly
- Test real-time updates:
  - Verify agent status updates in real-time (if WebSocket enabled)
  - Verify Last Heartbeat relative time updates dynamically
  - Verify new agents appear in table automatically
  - Verify disconnected agents update status
- Test error handling:
  - Test with network errors
  - Test with server errors
  - Test with invalid agent ID
  - Verify appropriate error messages are shown
  - Verify error states are handled gracefully
- Test edge cases:
  - Test with no agents registered (empty state)
  - Test with agents that are not linked to assets
  - Test with agents that have no commands
  - Test with agents that have many commands (verify pagination)
  - Test with agents from different organizations (if multi-tenant)
  - Test with different agent statuses
  - Test with agents that have no resource utilization data (disconnected or pending agents)
  - Test with agents that have high resource usage (verify red indicators)
  - Test with agents that have low resource usage (verify green indicators)
  - Test with agents that have medium resource usage (verify yellow indicators)
- Test permissions:
  - Test with view-only permission (verify edit/delete are disabled or hidden)
  - Test with edit permission (verify edit is available, delete may be restricted)
  - Test with full permission (verify all actions are available)
- Test UI responsiveness:
  - Test table on different screen sizes
  - Test drawer on different screen sizes
  - Verify table is scrollable on small screens
  - Verify drawer is responsive
  - Test on different browsers
- Test performance:
  - Test with large number of agents (100+)
  - Verify pagination works correctly
  - Verify search/filter performance
  - Verify table rendering performance
- Test export functionality (if applicable):
  - Click Export button
  - Select export format (CSV/Excel)
  - Verify exported file contains correct data
  - Verify exported file includes all columns
  - Verify exported file respects current filters
- Test bulk actions (if applicable):
  - Select multiple agents using checkboxes
  - Verify bulk action menu appears
  - Perform bulk actions (delete, etc.)
  - Verify bulk actions work correctly

---

## Test Execution Summary

| Story ID | Title | Status | Tester | Date | Notes |
|----------|-------|--------|--------|------|-------|
| US-011 | Create New Department | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-012 | View and Manage Departments in Table View | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-013 | Create and Manage Password Policy at Organization Level | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-014 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-015 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-016 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-017 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-018 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-019 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-020 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |

**Legend:**
- ⏳ Pending: Story not yet tested
- ✅ Pass: All acceptance criteria met
- ❌ Fail: One or more acceptance criteria not met

---

**Document End**
