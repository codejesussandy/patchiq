# PatchIQ User Stories - Testing Document

**Version:** 1.0.0  
**Last Updated:** 2026-01-14  
**Purpose:** User stories for testing PatchIQ patch management solution functionality

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

### User Story 1: User Login

**Story ID:** `US-001`  
**Title:** User Login Authentication  
**Priority:** P0 (Critical)  
**Module:** Auth

**User Story:**
```
As a user
I want to log in with my email and password
So that I can access the PatchIQ platform and manage patches, assets, and vulnerabilities
```

**Acceptance Criteria:**
- [ ] AC1: User can enter email and password in the login form
- [ ] AC2: System validates email format before submission
- [ ] AC3: System validates password is provided before submission
- [ ] AC4: System authenticates user credentials against database
- [ ] AC5: System returns access token and refresh token upon successful login
- [ ] AC6: System updates user's lastLoginAt timestamp
- [ ] AC7: System stores refresh token in database for session management
- [ ] AC8: User is redirected to dashboard page after successful login
- [ ] AC9: System displays appropriate error message for invalid credentials
- [ ] AC10: System displays appropriate error message for disabled accounts
- [ ] AC11: System applies rate limiting to prevent brute force attacks
- [ ] AC12: Password field supports show/hide toggle functionality

**Test Data:**
```json
{
  "validUser": {
    "email": "admin@patchiq.test",
    "password": "Test@123456"
  },
  "invalidEmail": {
    "email": "invalid-email",
    "password": "Test@123456"
  },
  "invalidPassword": {
    "email": "admin@patchiq.test",
    "password": "WrongPassword123"
  },
  "nonExistentUser": {
    "email": "nonexistent@patchiq.test",
    "password": "Test@123456"
  },
  "disabledUser": {
    "email": "disabled@patchiq.test",
    "password": "Test@123456"
  }
}
```

**API Endpoints:**
- `POST /v1/auth/login` - Authenticate user and return tokens
  - **Request Body:**
    ```json
    {
      "email": "admin@patchiq.test",
      "password": "Test@123456"
    }
    ```
  - **Success Response (200):**
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "uuid",
        "email": "admin@patchiq.test",
        "firstName": "Admin",
        "lastName": "User",
        "role": "admin",
        "isOnboarded": true,
        "organizationId": "uuid",
        "departmentId": "uuid",
        "locationId": "uuid",
        "createdAt": "2026-01-14T00:00:00.000Z",
        "updatedAt": "2026-01-14T00:00:00.000Z"
      }
    }
    ```
  - **Error Responses:**
    - `401 Unauthorized` - Invalid email or password
    - `403 Forbidden` - Account is disabled
    - `429 Too Many Requests` - Rate limit exceeded

**UI Components:**
- Page: `/login` (Login.tsx)
- Components:
  - Email input field with validation
  - Password input field with show/hide toggle
  - Login button (disabled during loading)
  - "Forgot Password?" link
  - Error message display area
- User Actions:
  1. Enter email address
  2. Enter password
  3. Click "Sign In" button
  4. (Optional) Click "Forgot Password?" link

**Test Notes:**
- Test with both admin and regular user accounts
- Verify tokens are stored in localStorage/sessionStorage
- Verify user context is updated after login
- Test rate limiting by making multiple failed login attempts
- Verify audit log entry is created for login action
- Test with special characters in email (should be normalized to lowercase)
- Verify password field masks input by default
- Test redirect behavior for users who haven't completed onboarding

---

### User Story 2: Create Organization

**Story ID:** `US-002`  
**Title:** Create New Organization  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to create a new organization with a name and description
So that I can organize users, assets, and resources into different organizational units
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to User Management > Organization page and click "Create Organization" button
- [ ] AC2: Organization creation form/modal opens with required fields visible
- [ ] AC3: Organization name field is mandatory and accepts 1-100 characters
- [ ] AC4: System validates organization name is unique (prevents duplicate organization names)
- [ ] AC5: Description field is optional and accepts up to 500 characters
- [ ] AC6: "Set as Default" checkbox is optional and unchecked by default
- [ ] AC7: Admin can mark organization as default by checking "Set as Default" checkbox
- [ ] AC8: If new organization is set as default, system automatically unsets the previous default organization
- [ ] AC9: Only one organization can be marked as default at a time
- [ ] AC10: System validates that organization name is not empty before submission
- [ ] AC11: System prevents creating organization with existing name (returns 409 Conflict error)
- [ ] AC12: Upon successful creation, organization is created with isDefault=false (unless explicitly set)
- [ ] AC13: System creates an audit log entry for organization creation action
- [ ] AC14: Success message is displayed after organization creation
- [ ] AC15: Organization list is refreshed to show newly created organization
- [ ] AC16: Created organization details are returned in response
- [ ] AC17: Created organization can be immediately used when creating users
- [ ] AC18: System returns appropriate error messages for validation failures
- [ ] AC19: Cancel button closes the form/modal without saving changes
- [ ] AC20: Reset button resets the form to original/empty state
- [ ] AC21: Organization name validation works for special characters (if allowed) or restricts them appropriately

**Test Data:**
```json
{
  "validOrganizationComplete": {
    "name": "Acme Corporation",
    "description": "Main organization for Acme Corporation with all departments",
    "isDefault": true
  },
  "validOrganizationMinimal": {
    "name": "Tech Solutions Inc"
  },
  "validOrganizationWithDescription": {
    "name": "Global Enterprises",
    "description": "International organization with multiple branches worldwide"
  },
  "missingName": {
    "description": "Organization without name"
  },
  "duplicateName": {
    "name": "Acme Corporation",
    "description": "Duplicate organization name"
  },
  "nameTooLong": {
    "name": "This is a very long organization name that exceeds the maximum character limit of one hundred characters and should be rejected by the system validation",
    "description": "Organization with name too long"
  },
  "descriptionTooLong": {
    "name": "Test Organization",
    "description": "This is a description that exceeds the maximum character limit of five hundred characters and should be rejected. ".repeat(10)
  },
  "setAsDefaultWhenOtherExists": {
    "name": "New Default Org",
    "description": "Setting this as default should unset previous default",
    "isDefault": true
  },
  "organizationWithoutDefault": {
    "name": "Regular Organization",
    "description": "Organization not set as default",
    "isDefault": false
  }
}
```

**API Endpoints:**
- `POST /v1/settings/organizations` - Create a new organization
  - **Request Body (Required: name, Optional: description, isDefault):**
    ```json
    {
      "name": "Acme Corporation",
      "description": "Main organization for Acme Corporation",
      "isDefault": false
    }
    ```
  - **Success Response (201):**
    ```json
    {
      "id": "org-uuid",
      "name": "Acme Corporation",
      "description": "Main organization for Acme Corporation",
      "isDefault": false,
      "createdAt": "2026-01-14T00:00:00.000Z",
      "updatedAt": "2026-01-14T00:00:00.000Z"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Invalid input data, missing required fields, or validation failure
    - `401 Unauthorized` - Not authenticated
    - `403 Forbidden` - Insufficient permissions (non-admin)
    - `409 Conflict` - Organization name already exists
    - `422 Unprocessable Entity` - Invalid data format

**UI Components:**
- Page: `/settings/user-management/organization` (Organization.tsx)
- Components:
  - "Create Organization" button (PlusOutlined icon)
  - Organization creation modal/drawer
  - Form fields:
    - Organization Name (required, text input, max 100 characters)
    - Description (optional, textarea, max 500 characters)
    - Set as Default (optional, checkbox, unchecked by default)
  - Action buttons:
    - Submit/Save button (saves the organization)
    - Reset button (resets form to empty state)
    - Cancel button (closes form without saving)
  - Success/error message notifications
- User Actions:
  1. Navigate to Settings > User Management > Organization
  2. Click "Create Organization" button (or + icon)
  3. Enter organization name (required)
  4. Enter description (optional)
  5. Optionally check "Set as Default" checkbox
  6. (Optional) Click "Reset" button to clear all fields
  7. (Optional) Click "Cancel" button to close form without saving
  8. Click "Save" or "Create" button
  9. Verify success message appears
  10. Verify new organization appears in organization list
  11. Verify organization can be selected when creating users

**Test Notes:**
- Test with admin role (should have permission)
- Test with regular user role (should be forbidden)
- Verify organization name uniqueness validation
- Verify organization name length validation (1-100 characters)
- Verify description length validation (max 500 characters)
- Test setting organization as default when another default exists (should unset previous default)
- Verify only one organization can be default at a time
- Test creating organization without setting as default (isDefault should be false)
- Verify Cancel button closes form without saving changes
- Verify Reset button clears all form fields
- Test with various organization name formats (with spaces, special characters if allowed)
- Verify organization is immediately available in dropdown when creating users
- Verify audit log contains organization creation details
- Test form validation (empty name, name too long, description too long)
- Verify appropriate error messages for each validation failure
- Test creating organization with same name as existing one (should fail with 409 Conflict)
- Verify newly created organization can be edited immediately after creation

---

### User Story 3: Organization Table Functions

**Story ID:** `US-003`  
**Title:** View and Manage Organizations in Table View  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to view, search, filter, and manage organizations in a table view
So that I can efficiently browse, find, and perform actions on organizations
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to User Management > Organization page and see organizations table
- [ ] AC2: Table displays all organizations with columns: ID, Name, Description, Created On, Actions
- [ ] AC3: Organizations are sorted by default status first (default organizations appear first), then alphabetically by name
- [ ] AC4: Search functionality allows searching by organization ID, name, or description
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: Column filter allows showing/hiding columns (ID, Name, Description)
- [ ] AC7: Column filter modal displays checkboxes for each column
- [ ] AC8: "Reset Filters" button in filter modal restores all columns to visible state
- [ ] AC9: Table supports pagination with configurable page size (default 20 items per page)
- [ ] AC10: Pagination shows current page, total pages, and total count of organizations
- [ ] AC11: Table supports sorting by ID (numeric) and Name (alphabetical)
- [ ] AC12: Clicking on organization name opens view modal with organization details
- [ ] AC13: Actions column displays Edit and Delete buttons for each organization
- [ ] AC14: Delete button is disabled for default organizations (with tooltip explaining why)
- [ ] AC15: Edit button opens edit modal with pre-filled organization data
- [ ] AC16: Delete button shows confirmation modal before deleting organization
- [ ] AC17: Export button downloads organizations data as CSV file
- [ ] AC18: Exported CSV includes all visible columns and filtered/search results
- [ ] AC19: Refresh/Reload button reloads organization list from server
- [ ] AC20: Table shows loading state while fetching data
- [ ] AC21: Table displays empty state message when no organizations exist
- [ ] AC22: Table displays "No results found" message when search returns no matches
- [ ] AC23: Created On column displays formatted date and time
- [ ] AC24: Description column shows ellipsis (...) for long descriptions
- [ ] AC25: System handles pagination correctly when filtering/searching (resets to page 1)

**Test Data:**
```json
{
  "sampleOrganizations": [
    {
      "id": "org-001",
      "name": "Acme Corporation",
      "description": "Main organization for Acme Corporation",
      "isDefault": true,
      "createdAt": "2026-01-01T10:00:00.000Z"
    },
    {
      "id": "org-002",
      "name": "Tech Solutions Inc",
      "description": "Technology solutions provider",
      "isDefault": false,
      "createdAt": "2026-01-02T14:30:00.000Z"
    },
    {
      "id": "org-003",
      "name": "Global Enterprises",
      "description": "International organization with multiple branches",
      "isDefault": false,
      "createdAt": "2026-01-03T09:15:00.000Z"
    }
  ],
  "searchScenarios": {
    "searchByName": "Acme",
    "searchByDescription": "Technology",
    "searchByID": "org-002",
    "noResults": "NonExistentOrg",
    "caseInsensitive": "ACME"
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
- `GET /v1/settings/organizations` - List organizations with pagination and search
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
    - `search` (string, optional) - Search term for name or description
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "org-uuid",
          "name": "Acme Corporation",
          "description": "Main organization",
          "isDefault": true,
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
  - **Sorting:** Default organizations first, then alphabetical by name
  - **Search:** Searches in name and description fields (case-insensitive)

**UI Components:**
- Page: `/settings/user-management/organization` (Organization.tsx)
- Components:
  - **Table Header:**
    - Page title "Organizations"
    - Search input field (with SearchOutlined icon)
    - Filter button (FilterOutlined icon) - opens column filter modal
    - Export button (DownloadOutlined icon) - exports to CSV
    - Refresh button (ReloadOutlined icon) - reloads data
    - Create Organization button (PlusOutlined icon)
  - **Table:**
    - Columns: ID, Name, Description, Created On, Actions
    - Sortable columns: ID, Name
    - Clickable organization name (opens view modal)
    - Actions column: Edit button, Delete button
  - **Column Filter Modal:**
    - Checkboxes for: Show ID, Show Name, Show Description
    - Apply button
    - Reset button (restores all columns)
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **View Modal:** (opened by clicking organization name)
    - Organization details display
    - Edit button (if in view mode)
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no organizations exist
  - **No Results State:** Message when search returns no matches
- User Actions:
  1. Navigate to Settings > User Management > Organization
  2. View organizations table with all columns
  3. Use search box to filter organizations by ID, name, or description
  4. Click column headers to sort (ID, Name)
  5. Click filter button to show/hide columns
  6. Adjust pagination (change page size, navigate pages)
  7. Click organization name to view details
  8. Click Edit button to edit organization
  9. Click Delete button to delete organization (with confirmation)
  10. Click Export button to download CSV
  11. Click Refresh button to reload data

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have edit/delete)
- Verify table loads all organizations on page load
- Test search functionality:
  - Search by organization name (partial and full match)
  - Search by organization ID
  - Search by description (partial match)
  - Case-insensitive search
  - Search with no results
  - Clear search to show all organizations
- Test column filtering:
  - Hide/show individual columns
  - Apply filters
  - Reset filters to show all columns
  - Verify table updates correctly when columns are hidden/shown
- Test sorting:
  - Sort by ID (numeric sorting)
  - Sort by Name (alphabetical sorting)
  - Verify default organizations always appear first regardless of sort
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test actions:
  - Click organization name to view details
  - Click Edit button (should open edit modal)
  - Click Delete button on non-default organization (should show confirmation)
  - Click Delete button on default organization (should be disabled)
  - Verify delete confirmation modal works correctly
- Test export functionality:
  - Export all organizations
  - Export filtered/search results
  - Verify CSV file is downloaded correctly
  - Verify CSV includes correct columns and data
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no organizations exist
  - "No results found" when search returns no matches
- Test date formatting in Created On column
- Test description ellipsis for long text
- Verify table performance with large number of organizations
- Test responsive design (table on different screen sizes)

---

### User Story 4: Create New User

**Story ID:** `US-004`  
**Title:** Create New User Account  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to create a new user account with required information
So that I can add team members to the platform and assign them appropriate roles and permissions
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to User Management page and click "Create User" button
- [ ] AC2: User creation form/drawer opens with all required fields visible
- [ ] AC3: Required fields (email, name, password, organization, role) are marked as mandatory and validated
- [ ] AC4: Email field is used as username (no separate username field exists)
- [ ] AC5: System validates email format before submission
- [ ] AC6: System validates email uniqueness (prevents duplicate emails)
- [ ] AC7: Password field is mandatory and cannot be empty
- [ ] AC8: System validates password against password policy (min length, uppercase, lowercase, numbers, special characters if required)
- [ ] AC9: System displays password policy requirements to user (if configured)
- [ ] AC10: System rejects passwords that do not meet password policy requirements
- [ ] AC11: Organization field is mandatory and must be selected from dropdown
- [ ] AC12: Role field is mandatory and must be selected from dropdown
- [ ] AC13: Branch/Location field is optional and can be selected from dropdown
- [ ] AC14: Department field is optional and can be selected from dropdown
- [ ] AC15: Timezone field is optional and can be selected from dropdown or entered
- [ ] AC16: Avatar upload field is optional and supports image file upload
- [ ] AC17: System validates that selected organization exists in the system
- [ ] AC18: System validates that selected role exists in the system
- [ ] AC19: System validates that selected branch/location exists in the system (if provided)
- [ ] AC20: System validates that selected department exists in the system (if provided)
- [ ] AC21: System validates uploaded avatar file type (images only) and size limits
- [ ] AC22: System does NOT auto-generate passwords (password must be provided by admin)
- [ ] AC23: Upon successful creation, user account is created with isActive=true and isOnboarded=true
- [ ] AC24: Password is hashed using bcrypt before storage (never stored in plain text)
- [ ] AC25: Uploaded avatar is stored securely and associated with user account
- [ ] AC26: System creates an audit log entry for user creation action
- [ ] AC27: Success message is displayed after user creation
- [ ] AC28: User list is refreshed to show newly created user
- [ ] AC29: Created user details are returned in response (without password field) including optional fields if provided
- [ ] AC30: System prevents creating user with existing email (returns 409 Conflict error)
- [ ] AC31: System returns appropriate error messages for validation failures (missing required fields, invalid password, invalid file type, etc.)

**Test Data:**
```json
{
  "validUserComplete": {
    "email": "newuser@patchiq.test",
    "name": "John Doe",
    "password": "SecurePass123!",
    "role": "user",
    "organizationId": "org-uuid-here",
    "departmentId": "dept-uuid-here",
    "locationId": "loc-uuid-here",
    "contactNumber": "+1-555-123-4567",
    "timezone": "America/New_York",
    "avatar": "avatar-file-path-or-url"
  },
  "validUserMinimal": {
    "email": "minimal@patchiq.test",
    "name": "Jane Smith",
    "password": "SecurePass123!",
    "role": "admin",
    "organizationId": "org-uuid-here"
  },
  "missingPassword": {
    "email": "nopassword@patchiq.test",
    "name": "No Password User",
    "role": "user",
    "organizationId": "org-uuid-here"
  },
  "missingOrganization": {
    "email": "noorg@patchiq.test",
    "name": "No Org User",
    "password": "SecurePass123!",
    "role": "user"
  },
  "missingRole": {
    "email": "norole@patchiq.test",
    "name": "No Role User",
    "password": "SecurePass123!",
    "organizationId": "org-uuid-here"
  },
  "duplicateEmail": {
    "email": "admin@patchiq.test",
    "name": "Duplicate User",
    "password": "SecurePass123!",
    "role": "user",
    "organizationId": "org-uuid-here"
  },
  "invalidEmail": {
    "email": "invalid-email",
    "name": "Invalid Email User",
    "password": "SecurePass123!",
    "role": "user",
    "organizationId": "org-uuid-here"
  },
  "invalidRole": {
    "email": "invalidrole@patchiq.test",
    "name": "Invalid Role User",
    "password": "SecurePass123!",
    "role": "NonExistentRole",
    "organizationId": "org-uuid-here"
  },
  "invalidOrganization": {
    "email": "invalidorg@patchiq.test",
    "name": "Invalid Org User",
    "password": "SecurePass123!",
    "role": "user",
    "organizationId": "non-existent-uuid"
  },
  "weakPasswordNoUppercase": {
    "email": "weakpass1@patchiq.test",
    "name": "Weak Password User",
    "password": "password123!",
    "role": "user",
    "organizationId": "org-uuid-here"
  },
  "weakPasswordNoLowercase": {
    "email": "weakpass2@patchiq.test",
    "name": "Weak Password User",
    "password": "PASSWORD123!",
    "role": "user",
    "organizationId": "org-uuid-here"
  },
  "weakPasswordNoNumber": {
    "email": "weakpass3@patchiq.test",
    "name": "Weak Password User",
    "password": "Password!",
    "role": "user",
    "organizationId": "org-uuid-here"
  },
  "weakPasswordTooShort": {
    "email": "weakpass4@patchiq.test",
    "name": "Weak Password User",
    "password": "Pass1!",
    "role": "user",
    "organizationId": "org-uuid-here"
  },
  "passwordMeetsPolicy": {
    "email": "goodpass@patchiq.test",
    "name": "Good Password User",
    "password": "SecurePass123!",
    "role": "user",
    "organizationId": "org-uuid-here",
    "locationId": "loc-uuid-here"
  },
  "userWithOptionalFields": {
    "email": "optional@patchiq.test",
    "name": "Optional Fields User",
    "password": "SecurePass123!",
    "role": "user",
    "organizationId": "org-uuid-here",
    "departmentId": "dept-uuid-here",
    "locationId": "loc-uuid-here",
    "timezone": "Asia/Kolkata",
    "contactNumber": "+91-9876543210"
  },
  "invalidAvatarFile": {
    "email": "invalidavatar@patchiq.test",
    "name": "Invalid Avatar User",
    "password": "SecurePass123!",
    "role": "user",
    "organizationId": "org-uuid-here",
    "avatar": "document.pdf"
  }
}
```

**API Endpoints:**
- `POST /v1/settings/users` - Create a new user account
  - **Request Body (Required fields: email, name, password, role, organizationId):**
    ```json
    {
      "email": "newuser@patchiq.test",
      "name": "John Doe",
      "password": "SecurePass123!",
      "role": "user",
      "organizationId": "uuid",
      "departmentId": "uuid",
      "locationId": "uuid",
      "contactNumber": "+1-555-123-4567",
      "timezone": "America/New_York",
      "avatar": "avatar-file-path-or-url"
    }
    ```
    **Note:** `departmentId`, `locationId`, `contactNumber`, `timezone`, and `avatar` are optional fields.
  - **Password Policy Requirements (minimum):**
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - (Optional: Special characters if policy requires)
  - **Success Response (201):**
    ```json
    {
      "id": "user-uuid",
      "email": "newuser@patchiq.test",
      "name": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "isOnboarded": true,
      "organizationId": "uuid",
      "departmentId": "uuid",
      "locationId": "uuid",
      "contactNumber": "+1-555-123-4567",
      "timezone": "America/New_York",
      "avatar": "avatar-file-path-or-url",
      "organization": { "name": "Organization Name" },
      "department": { "name": "Department Name" },
      "location": { "name": "Location Name" },
      "createdAt": "2026-01-14T00:00:00.000Z",
      "updatedAt": "2026-01-14T00:00:00.000Z"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Invalid input data, missing required fields, or password policy validation failure
    - `401 Unauthorized` - Not authenticated
    - `403 Forbidden` - Insufficient permissions (non-admin)
    - `409 Conflict` - Email already exists
    - `422 Unprocessable Entity` - Role not found, organization not found, or invalid reference

**UI Components:**
- Page: `/settings/user-management/users` (Users.tsx)
- Components:
  - "Create User" button (PlusOutlined icon)
  - User creation drawer/modal
  - Form fields:
    - Email (required, used as username, validated)
    - Name (required)
    - Password (required, with show/hide toggle, password policy indicator)
    - Password policy requirements display (if configured)
    - Organization (dropdown, required)
    - Role (dropdown, required)
    - Branch/Location (dropdown, optional)
    - Department (dropdown, optional)
    - Timezone (dropdown or input, optional)
    - Phone/Contact Number (optional)
    - Avatar upload (file upload, optional, images only)
  - Submit/Cancel buttons
  - Success/error message notifications
- User Actions:
  1. Navigate to Settings > User Management > Users
  2. Click "Create User" button (or + icon)
  3. Fill in required fields:
     - Email (used as username)
     - Name
     - Password (must meet policy requirements)
     - Organization (select from dropdown)
     - Role (select from dropdown)
  4. Optionally fill in:
     - Branch/Location (select from dropdown)
     - Department (select from dropdown)
     - Timezone (select from dropdown or enter)
     - Phone/Contact Number
     - Avatar (upload image file)
  5. Verify password meets policy requirements (validation feedback shown)
  6. Click "Save" or "Create" button
  7. Verify success message appears
  8. Verify new user appears in user list

**Test Notes:**
- Test with admin role (should have permission)
- Test with regular user role (should be forbidden)
- Verify email is used as username (no separate username field exists)
- Verify password is mandatory and cannot be empty
- Verify password policy validation (minimum length, uppercase, lowercase, numbers, special characters if required)
- Verify password policy requirements are displayed to user (if configured in system settings)
- Test password validation with various invalid passwords:
  - Too short (< 8 characters)
  - No uppercase letters
  - No lowercase letters
  - No numbers
  - No special characters (if policy requires)
- Verify organization field is mandatory and must be selected
- Verify role field is mandatory and must be selected
- Verify branch/location field is optional
- Verify department field is optional and dropdown is populated
- Verify timezone field is optional and can be selected or entered
- Verify avatar upload field is optional and accepts image files only
- Verify password is never returned in API response
- Verify audit log contains user creation details
- Test email normalization (uppercase emails are converted to lowercase)
- Test email uniqueness validation
- Verify isOnboarded flag is set to true upon creation (password is always provided)
- Test with various role types (admin, user, custom roles)
- Verify organization, role, department, and location dropdowns are populated
- Test timezone field with various timezone formats (e.g., "America/New_York", "Asia/Kolkata", "UTC")
- Test avatar upload with valid image files (JPG, PNG, etc.)
- Test avatar upload with invalid file types (should be rejected)
- Test avatar upload with files exceeding size limits (should be rejected)
- Verify uploaded avatar is displayed after user creation
- Test form validation (required fields, email format, password policy, file type, etc.)
- Verify user can log in immediately with provided password
- Verify all optional fields (department, location, timezone, avatar, contact number) are saved correctly if provided
- Verify appropriate error messages for each validation failure (including invalid file type/size for avatar)

---

### User Story 5: User Table Functions

**Story ID:** `US-005`  
**Title:** View and Manage Users in Table View  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to view, search, filter, and manage users in a table view
So that I can efficiently browse, find, and perform actions on user accounts
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to User Management > Users page and see users table
- [ ] AC2: Table displays all users with columns: ID, Name, Email, Phone, Organization, Role, Branch/Location, Department, Created On, Actions
- [ ] AC3: Users are sorted by default alphabetically by name
- [ ] AC4: Name column displays user avatar/initials and full name
- [ ] AC5: Search functionality allows searching by user ID, name, email, phone number, organization name, role name, branch/location name, or department name
- [ ] AC6: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6a: Search matches partial text in organization, role, branch/location, and department fields
- [ ] AC7: Column filter allows showing/hiding columns (ID, Name, Email, Phone, Organization, Role, Branch/Location, Department)
- [ ] AC8: Column filter modal displays checkboxes for each column
- [ ] AC9: "Reset Filters" button in filter modal restores all columns to visible state
- [ ] AC10: Organization column displays organization name (shows "—" when not assigned)
- [ ] AC11: Role column displays role name (shows "—" when not assigned)
- [ ] AC12: Branch/Location column displays branch or location name (shows "—" when not assigned)
- [ ] AC13: Department column displays department name (shows "—" when not assigned)
- [ ] AC14: Table supports pagination with configurable page size (default 20 items per page)
- [ ] AC15: Pagination shows current page, total pages, and total count of users
- [ ] AC16: Table supports sorting by ID (numeric) and Name (alphabetical)
- [ ] AC17: Clicking on user name opens view drawer/modal with user details
- [ ] AC18: Actions column displays Edit and Delete buttons for each user
- [ ] AC19: Default super admin user exists in the system with Super Admin role (created by system)
- [ ] AC20: Delete button is disabled for super admin user (with tooltip explaining why)
- [ ] AC21: Edit button is disabled for super admin user for non-super admin users (only super admin can edit super admin)
- [ ] AC22: Super admin user can edit and change password for super admin user
- [ ] AC23: Non-super admin users cannot edit super admin user (Edit button is disabled)
- [ ] AC24: Non-super admin users cannot change password for super admin user (password change option is disabled/hidden)
- [ ] AC25: Edit button opens edit drawer/modal with pre-filled user data (enabled for super admin editing super admin, disabled for others)
- [ ] AC26: Delete button shows confirmation modal before deleting user (disabled for super admin user)
- [ ] AC27: Export button downloads users data as CSV file
- [ ] AC28: Exported CSV includes all visible columns and filtered/search results
- [ ] AC29: Import button opens import modal for bulk user import
- [ ] AC30: Refresh/Reload button reloads user list from server
- [ ] AC31: Table shows loading state while fetching data
- [ ] AC32: Table displays empty state message when no users exist
- [ ] AC33: Table displays "No results found" message when search returns no matches
- [ ] AC34: Created On column displays formatted date and time
- [ ] AC35: Phone column shows "—" when phone number is not available
- [ ] AC36: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC37: Create User button is visible in table header and opens user creation drawer

**Test Data:**
```json
{
  "sampleUsers": [
    {
      "id": "user-000",
      "firstName": "Super",
      "lastName": "Admin",
      "email": "superadmin@patchiq.test",
      "phone": "+1-555-000-0000",
      "organization": "Acme Corporation",
      "role": "Super Admin",
      "isSuperAdmin": true,
      "isSystemUser": true,
      "branch": "New York Office",
      "department": "IT",
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "user-001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@patchiq.test",
      "phone": "+1-555-123-4567",
      "organization": "Acme Corporation",
      "role": "Admin",
      "branch": "New York Office",
      "department": "IT",
      "createdAt": "2026-01-01T10:00:00.000Z"
    },
    {
      "id": "user-002",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@patchiq.test",
      "phone": "+1-555-987-6543",
      "organization": "Tech Solutions Inc",
      "role": "User",
      "branch": "San Francisco Office",
      "department": "Engineering",
      "createdAt": "2026-01-02T14:30:00.000Z"
    },
    {
      "id": "user-003",
      "firstName": "Bob",
      "lastName": "Johnson",
      "email": "bob.johnson@patchiq.test",
      "organization": "Global Enterprises",
      "role": "Manager",
      "department": "Sales",
      "createdAt": "2026-01-03T09:15:00.000Z"
    },
    {
      "id": "user-004",
      "firstName": "Alice",
      "lastName": "Williams",
      "email": "alice.williams@patchiq.test",
      "organization": "Acme Corporation",
      "role": "User",
      "createdAt": "2026-01-04T11:20:00.000Z"
    }
  ],
  "searchScenarios": {
    "searchByName": "John",
    "searchByEmail": "jane.smith",
    "searchByPhone": "555-123",
    "searchByID": "user-002",
    "searchByOrganization": "Acme",
    "searchByRole": "Admin",
    "searchByBranch": "New York",
    "searchByDepartment": "IT",
    "noResults": "NonExistentUser",
    "caseInsensitive": "JOHN",
    "caseInsensitiveOrg": "ACME",
    "partialMatchOrg": "Corporation",
    "partialMatchDept": "Engineer"
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
- `GET /v1/settings/users` - List users with pagination and search
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
    - `search` (string, optional) - Search term for name, email, phone, ID, organization, role, branch/location, or department (searches across all fields)
    - `status` (string, optional) - Filter by status (Active, Suspended, Invite Sent)
    - `role` (string, optional) - Filter by role
    - `organizationId` (string, optional) - Filter by organization
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "user-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@patchiq.test",
          "phone": "+1-555-123-4567",
          "role": "user",
          "organization": { "id": "org-uuid", "name": "Acme Corporation" },
          "roleDetail": { "id": "role-uuid", "name": "Admin" },
          "branch": { "id": "branch-uuid", "name": "New York Office" },
          "department": { "id": "dept-uuid", "name": "IT" },
          "location": { "id": "loc-uuid", "name": "New York" },
          "isActive": true,
          "isOnboarded": true,
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
  - **Sorting:** Default alphabetical by name
  - **Search:** Searches in name, email, phone, ID, organization name, role name, branch/location name, and department name fields (case-insensitive, partial match supported)

**UI Components:**
- Page: `/settings/user-management/users` (Users.tsx)
- Components:
  - **Table Header:**
    - Page title "Users"
    - Search input field (with SearchOutlined icon)
    - Filter button (FilterOutlined icon) - opens column filter modal
    - Export button (DownloadOutlined icon) - exports to CSV
    - Import button (ImportOutlined icon) - opens import modal
    - Refresh button (ReloadOutlined icon) - reloads data
    - Create User button (PlusOutlined icon)
  - **Table:**
    - Columns: ID, Name (with avatar/initials), Email, Phone, Organization, Role, Branch/Location, Department, Created On, Actions
    - Sortable columns: ID, Name
    - Clickable user name (opens view drawer)
    - Actions column: Edit button, Delete button
    - Edit button is disabled for super admin user (for non-super admin users)
    - Delete button is disabled for super admin user (for all users)
    - Tooltips explain why buttons are disabled
  - **Column Filter Modal:**
    - Checkboxes for: Show ID, Show Name, Show Email, Show Phone, Show Organization, Show Role, Show Branch/Location, Show Department
    - Apply button
    - Reset button (restores all columns)
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **View Drawer:** (opened by clicking user name)
    - User details display
    - Edit button (if in view mode, disabled for super admin user for non-super admin users)
    - Password change option (disabled/hidden for super admin user for non-super admin users)
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no users exist
  - **No Results State:** Message when search returns no matches
- User Actions:
  1. Navigate to Settings > User Management > Users
  2. View users table with all columns (ID, Name, Email, Phone, Organization, Role, Branch/Location, Department, Created On, Actions)
  3. Use search box to filter users by ID, name, email, phone, organization, role, branch/location, or department
  4. Click column headers to sort (ID, Name)
  5. Click filter button to show/hide columns (including Organization, Role, Branch/Location, Department)
  6. Adjust pagination (change page size, navigate pages)
  7. Click user name to view details in drawer
  8. View Organization, Role, Branch/Location, and Department information for each user
  9. Verify super admin user is displayed in the table with Super Admin role
  10. Click Edit button to edit user (disabled for super admin user if logged in as non-super admin)
  11. Click Delete button to delete user (with confirmation, disabled for super admin user)
  12. Verify only super admin can edit and change password for super admin user
  13. Click Export button to download CSV (includes all visible columns)
  14. Click Import button to import users from CSV
  15. Click Refresh button to reload data
  16. Click Create User button to add new user

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have edit/delete)
- Verify table loads all users on page load
- Test search functionality:
  - Search by user name (partial and full match)
  - Search by user ID
  - Search by email (partial match)
  - Search by phone number (partial match)
  - Search by organization name (partial and full match)
  - Search by role name (partial and full match)
  - Search by branch/location name (partial and full match)
  - Search by department name (partial and full match)
  - Case-insensitive search (test with uppercase/lowercase)
  - Search across multiple fields (e.g., search "IT" should match department "IT" and names containing "IT")
  - Search with no results
  - Clear search to show all users
  - Verify search works even when columns are hidden via column filter
- Test column filtering:
  - Hide/show individual columns (ID, Name, Email, Phone, Organization, Role, Branch/Location, Department)
  - Apply filters
  - Reset filters to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify filter button shows active state when filters are applied
  - Test filtering Organization column (hide/show)
  - Test filtering Role column (hide/show)
  - Test filtering Branch/Location column (hide/show)
  - Test filtering Department column (hide/show)
  - Verify all filtered columns are included in exported CSV
- Test sorting:
  - Sort by ID (numeric sorting)
  - Sort by Name (alphabetical sorting)
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test actions:
  - Click user name to view details in drawer
  - Click Edit button (should open edit drawer, disabled for super admin user if logged in as non-super admin)
  - Click Delete button (should show confirmation modal, disabled for super admin user)
  - Verify delete confirmation modal works correctly
- Test super admin user restrictions:
  - Verify super admin user exists in the system (default user with Super Admin role)
  - Verify super admin user cannot be deleted (Delete button is disabled with tooltip)
  - Verify non-super admin users cannot edit super admin user (Edit button is disabled with tooltip)
  - Verify non-super admin users cannot change password for super admin user (password change option is disabled/hidden)
  - Verify super admin user can edit super admin user (Edit button is enabled when logged in as super admin)
  - Verify super admin user can change password for super admin user (password change option is available when logged in as super admin)
  - Test editing super admin user as super admin:
    - Click Edit button (should open edit drawer)
    - Verify all fields are editable
    - Verify password change option is available
    - Test changing password for super admin user
    - Verify changes are saved successfully
  - Test attempting to edit super admin user as non-super admin:
    - Verify Edit button is disabled
    - Verify tooltip explains why editing is restricted
    - Verify password change option is not available or disabled
  - Test attempting to delete super admin user:
    - Verify Delete button is disabled for all users (including super admin)
    - Verify tooltip explains why deletion is restricted
    - Verify system prevents deletion even if attempted via API
- Test export functionality:
  - Export all users
  - Export filtered/search results
  - Verify CSV file is downloaded correctly
  - Verify CSV includes correct columns and data
- Test import functionality:
  - Click Import button (should open import modal)
  - Verify import modal accepts CSV file upload
  - Test import validation and error handling
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no users exist
  - "No results found" when search returns no matches
- Test date formatting in Created On column
- Test phone number display (shows "—" when not available)
- Test user avatar/initials display in Name column
- Test Organization column display:
  - Shows organization name when assigned
  - Shows "—" when not assigned
  - Handles long organization names (ellipsis or truncation)
- Test Role column display:
  - Shows role name when assigned
  - Shows "—" when not assigned
- Test Branch/Location column display:
  - Shows branch or location name when assigned
  - Shows "—" when not assigned
  - Handles both branch and location data
- Test Department column display:
  - Shows department name when assigned
  - Shows "—" when not assigned
  - Handles long department names (ellipsis or truncation)
- Verify table performance with large number of users and all columns visible
- Test responsive design (table on different screen sizes)
- Test column visibility persistence (user preferences saved if implemented)
- Verify Create User button is always visible and functional
- Test export includes all visible columns including Organization, Role, Branch/Location, Department

---

### User Story 6: Create User Role

**Story ID:** `US-006`  
**Title:** Create New User Role with Permissions  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to create a new user role with specific permissions for different modules
So that I can control access levels and assign appropriate permissions to users based on their responsibilities
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to Roles and Privileges page and click "Create Role" button
- [ ] AC2: Role creation form/modal opens with required fields visible
- [ ] AC3: Role name field is mandatory and accepts 1-100 characters
- [ ] AC4: System validates role name is unique (prevents duplicate role names)
- [ ] AC5: Organization field is mandatory and must be selected from dropdown
- [ ] AC6: System validates that selected organization exists in the system
- [ ] AC7: Branch field is optional and can be selected from dropdown
- [ ] AC8: If no branch is selected, the role is applicable across all branches
- [ ] AC9: System validates that selected branch exists in the system (if provided)
- [ ] AC10: Description field is optional and accepts up to 500 characters
- [ ] AC11: Permissions section displays all available modules (Agents, Assets, Patches, Vulnerabilities, Jobs, Discovery, Reports, Dashboard, Settings)
- [ ] AC12: Each module displays available actions (View, Add, Edit, Delete) with checkboxes
- [ ] AC13: All "View" permissions are checked by default for all modules when creating a new role
- [ ] AC14: Admin can select permissions for each module by checking/unchecking action checkboxes
- [ ] AC15: Permissions are optional - if not specified, defaults to all modules with view permissions enabled
- [ ] AC16: System validates that role name is not empty before submission
- [ ] AC17: System validates that organization is selected before submission
- [ ] AC18: System prevents creating role with existing name (returns 409 Conflict error)
- [ ] AC19: Cancel button closes the form/modal without saving changes
- [ ] AC20: Reset button resets the form to original settings (clears inputs, resets permissions to default view-only, clears organization and branch)
- [ ] AC21: Upon successful creation, role is created with isSystem=false (custom role)
- [ ] AC22: If branch is not selected, role is stored with branch=null and is applicable across all branches
- [ ] AC23: Permissions are stored as JSON object in database
- [ ] AC24: System creates an audit log entry for role creation action
- [ ] AC25: Success message is displayed after role creation
- [ ] AC26: Role list is refreshed to show newly created role
- [ ] AC27: Created role details are returned in response including organization, branch (if selected), and permissions structure
- [ ] AC28: Created role can be immediately assigned to users
- [ ] AC29: System returns appropriate error messages for validation failures (missing organization, invalid organization, invalid branch)
- [ ] AC30: Role name validation works for special characters (if allowed) or restricts them appropriately

**Test Data:**
```json
{
  "validRoleComplete": {
    "name": "Patch Manager",
    "description": "Role for managing patches and deployments",
    "organizationId": "org-uuid-here",
    "branchId": "branch-uuid-here",
    "permissions": {
      "patches": {
        "view": true,
        "add": true,
        "edit": true,
        "delete": false
      },
      "assets": {
        "view": true,
        "add": false,
        "edit": false,
        "delete": false
      },
      "reports": {
        "view": true,
        "add": true,
        "edit": false,
        "delete": false
      }
    }
  },
  "validRoleMinimal": {
    "name": "View Only",
    "description": "Read-only access",
    "organizationId": "org-uuid-here"
  },
  "validRoleWithoutBranch": {
    "name": "Global Manager",
    "description": "Role applicable across all branches",
    "organizationId": "org-uuid-here"
  },
  "missingOrganization": {
    "name": "Invalid Role",
    "description": "Role without organization"
  },
  "invalidOrganization": {
    "name": "Invalid Role",
    "description": "Role with non-existent organization",
    "organizationId": "non-existent-uuid"
  },
  "invalidBranch": {
    "name": "Invalid Role",
    "description": "Role with non-existent branch",
    "organizationId": "org-uuid-here",
    "branchId": "non-existent-uuid"
  },
  "roleWithDefaultViewPermissions": {
    "name": "Default View Role",
    "description": "Role with default view permissions only",
    "permissions": {
      "agents": { "view": true, "add": false, "edit": false, "delete": false },
      "assets": { "view": true, "add": false, "edit": false, "delete": false },
      "patches": { "view": true, "add": false, "edit": false, "delete": false },
      "vulnerabilities": { "view": true, "add": false, "edit": false, "delete": false },
      "jobs": { "view": true, "add": false, "edit": false, "delete": false },
      "discovery": { "view": true, "add": false, "edit": false, "delete": false },
      "reports": { "view": true, "add": false, "edit": false, "delete": false },
      "dashboard": { "view": true, "add": false, "edit": false, "delete": false },
      "settings": { "view": true, "add": false, "edit": false, "delete": false }
    }
  },
  "validRoleWithAllPermissions": {
    "name": "Super Admin",
    "description": "Full access to all modules",
    "permissions": {
      "agents": { "view": true, "add": true, "edit": true, "delete": true },
      "assets": { "view": true, "add": true, "edit": true, "delete": true },
      "patches": { "view": true, "add": true, "edit": true, "delete": true },
      "vulnerabilities": { "view": true, "add": true, "edit": true, "delete": true },
      "jobs": { "view": true, "add": true, "edit": true, "delete": true },
      "discovery": { "view": true, "add": true, "edit": true, "delete": true },
      "reports": { "view": true, "add": true, "edit": true, "delete": true },
      "dashboard": { "view": true, "add": true, "edit": true, "delete": true },
      "settings": { "view": true, "add": true, "edit": true, "delete": true }
    }
  },
  "missingName": {
    "description": "Role without name"
  },
  "duplicateName": {
    "name": "admin",
    "description": "Duplicate role name"
  },
  "nameTooLong": {
    "name": "This is a very long role name that exceeds the maximum character limit of one hundred characters and should be rejected by the system validation",
    "description": "Role with name too long"
  },
  "descriptionTooLong": {
    "name": "Test Role",
    "description": "This is a description that exceeds the maximum character limit of five hundred characters and should be rejected. ".repeat(10)
  },
  "invalidPermissionsStructure": {
    "name": "Invalid Perms",
    "permissions": {
      "invalidModule": {
        "invalidAction": true
      }
    }
  }
}
```

**API Endpoints:**
- `POST /v1/settings/roles` - Create a new user role
  - **Request Body (Required: name, organizationId, Optional: description, branchId, permissions):**
    ```json
    {
      "name": "Patch Manager",
      "description": "Role for managing patches and deployments",
      "organizationId": "org-uuid",
      "branchId": "branch-uuid",
      "permissions": {
        "patches": {
          "view": true,
          "add": true,
          "edit": true,
          "delete": false
        },
        "assets": {
          "view": true,
          "add": false,
          "edit": false,
          "delete": false
        }
      }
    }
    ```
    **Note:** 
    - `organizationId` is **required** - must select an organization
    - `branchId` is **optional** - if not provided, role is applicable across all branches
    - `description` and `permissions` are optional
  - **Available Modules:** agents, assets, patches, vulnerabilities, jobs, discovery, reports, dashboard, settings
  - **Available Actions:** view, add, edit, delete (all boolean)
  - **Success Response (201):**
    ```json
    {
      "id": "role-uuid",
      "name": "Patch Manager",
      "description": "Role for managing patches and deployments",
      "organizationId": "org-uuid",
      "organization": { "id": "org-uuid", "name": "Acme Corporation" },
      "branchId": "branch-uuid",
      "branch": { "id": "branch-uuid", "name": "New York Office" },
      "isSystem": false,
      "users": 0,
      "permissions": {
        "patches": {
          "view": true,
          "add": true,
          "edit": true,
          "delete": false
        },
        "assets": {
          "view": true,
          "add": false,
          "edit": false,
          "delete": false
        }
      },
      "createdAt": "2026-01-14T00:00:00.000Z",
      "updatedAt": "2026-01-14T00:00:00.000Z"
    }
    ```
    **Note:** If `branchId` is not provided in request, `branch` and `branchId` will be `null` in response, indicating the role is applicable across all branches.
  - **Error Responses:**
    - `400 Bad Request` - Invalid input data, missing required fields (name, organizationId), or validation failure
    - `401 Unauthorized` - Not authenticated
    - `403 Forbidden` - Insufficient permissions (non-admin)
    - `409 Conflict` - Role name already exists
    - `422 Unprocessable Entity` - Invalid permissions structure, organization not found, or branch not found

**UI Components:**
- Page: `/settings/user-management/roles` (RolesAndPrivileges.tsx)
- Components:
  - "Create Role" button
  - Role creation modal/drawer
  - Form fields:
    - Role Name (required, text input)
    - Organization (required, dropdown - must select from available organizations)
    - Branch (optional, dropdown - if not selected, role applies to all branches)
    - Description (optional, textarea)
    - Permissions section:
      - Module cards/lists (Agents, Assets, Patches, Vulnerabilities, Jobs, Discovery, Reports, Dashboard, Settings)
      - Checkboxes for each action (View, Add, Edit, Delete) per module
      - All "View" checkboxes are checked by default
      - (Optional) Select All / Deselect All buttons per module
  - Action buttons:
    - Submit/Save button (saves the role)
    - Reset button (resets form to original/default settings)
    - Cancel button (closes form without saving)
  - Success/error message notifications
- User Actions:
  1. Navigate to Settings > User Management > Roles and Privileges
  2. Click "Create Role" button
  3. Verify form opens with all "View" permissions checked by default
  4. Enter role name (required)
  5. Select organization from dropdown (required, mandatory)
  6. Optionally select branch from dropdown (if not selected, role applies to all branches)
  7. Enter description (optional)
  8. Configure permissions by checking/unchecking actions for each module
  9. (Optional) Click "Reset" button to restore default view-only permissions and clear organization/branch
  10. (Optional) Click "Cancel" button to close form without saving
  11. Click "Save" or "Create" button to save the role
  12. Verify success message appears
  13. Verify new role appears in roles list with organization and branch (if selected)
  14. Verify role can be assigned to users
  15. Verify role without branch is applicable across all branches

**Test Notes:**
- Test with admin role (should have permission)
- Test with regular user role (should be forbidden)
- Verify all "View" permissions are checked by default when form opens
- Verify Reset button resets form to default state (all view permissions checked, organization and branch cleared)
- Verify Cancel button closes form without saving changes or showing confirmation if form is unchanged
- Test Cancel button behavior when form has unsaved changes (should show confirmation or discard changes)
- Verify role name uniqueness validation
- Verify role name length validation (1-100 characters)
- Verify description length validation (max 500 characters)
- Test organization field:
  - Verify organization field is mandatory and must be selected
  - Verify organization dropdown is populated with available organizations
  - Verify system validates that selected organization exists
  - Test creating role without organization (should fail with validation error)
  - Test creating role with invalid/non-existent organization (should fail with 422 error)
  - Verify organization is saved correctly when role is created
- Test branch field:
  - Verify branch field is optional
  - Verify branch dropdown is populated with branches from selected organization
  - Verify system validates that selected branch exists (if provided)
  - Test creating role without branch (should succeed, role applies to all branches)
  - Test creating role with branch selected (should succeed, role applies to specific branch)
  - Test creating role with invalid/non-existent branch (should fail with 422 error)
  - Verify branch is saved correctly when role is created
  - Verify role without branch is applicable across all branches (can be assigned to users from any branch)
  - Verify role with branch is only applicable to that specific branch
- Test with all modules having all permissions selected
- Test with default view-only permissions (default state when form opens)
- Test with partial permissions (some modules, some actions)
- Verify permissions structure is correctly saved and retrieved
- Verify isSystem flag is set to false for newly created roles
- Verify system roles cannot be created with same name as existing system roles
- Test role name with special characters (if allowed) or verify restrictions
- Verify audit log contains role creation details
- Verify created role can be immediately assigned to users
- Verify created role can be edited after creation
- Test form validation (empty name, name too long, description too long)
- Verify appropriate error messages for each validation failure
- Test permission checkbox interactions (checking/unchecking individual actions)

---

### User Story 7: User Role Table Functions

**Story ID:** `US-007`  
**Title:** View and Manage User Roles in Table View  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to view, search, filter, and manage user roles in a table view
So that I can efficiently browse, find, and perform actions on user roles
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to User Management > Roles and Privileges page and see roles table
- [ ] AC2: Table displays all roles with columns: Role (Name), Users (count), Organization, Branch, Description, Actions
- [ ] AC3: Roles are sorted by default alphabetically by role name
- [ ] AC4: Role column displays role name and indicates system roles with "(System)" label
- [ ] AC5: Users column displays the count of users assigned to each role
- [ ] AC6: Users count is clickable and opens a popup/modal showing list of users assigned that role
- [ ] AC7: User popup/modal displays all users assigned to the role in a table/list format
- [ ] AC8: Each user in the popup shows user details (name, email, role, organization, etc.)
- [ ] AC9: Each user in the popup has a remove action icon/button
- [ ] AC10: Remove action icon/button removes the user from the role when clicked (after save)
- [ ] AC11: "Select All" checkbox/option in popup selects all users for removal
- [ ] AC12: Selected users are highlighted/checked in the popup
- [ ] AC13: "Save" button in popup saves the changes (removes selected users from role)
- [ ] AC14: "Reset" button in popup resets the selection to original state (before any changes)
- [ ] AC15: "Cancel" button in popup closes the popup without saving changes
- [ ] AC16: After removing users, user count in table updates automatically
- [ ] AC17: After removing all users from Super Admin role, another user can be assigned (within 1 user limit)
- [ ] AC18: Organization column displays organization name (shows "—" when not assigned)
- [ ] AC19: Branch column displays branch name (shows "—" when not assigned)
- [ ] AC20: Description column displays role description with ellipsis for long text
- [ ] AC21: Search functionality allows searching by role name, description, or organization name
- [ ] AC22: Search is case-insensitive and filters results in real-time as user types
- [ ] AC23: Column filter allows showing/hiding columns (Role, Users, Organization, Branch, Description)
- [ ] AC24: Column filter modal displays checkboxes for each column
- [ ] AC25: "Reset Filters" button in filter modal restores all columns to visible state
- [ ] AC26: Branch filter dropdown allows filtering roles by branch (with "All Branches" option)
- [ ] AC27: Branch filter is independent of search and works in combination with search
- [ ] AC28: Table supports sorting by Role name (alphabetical)
- [ ] AC29: Actions column displays a dropdown menu (MoreOutlined icon) with View, Edit, Delete options
- [ ] AC30: Super Admin role is created by system by default and cannot be edited or deleted
- [ ] AC31: Super Admin role has all permissions enabled by default (all modules, all actions)
- [ ] AC32: Super Admin role has a maximum of 1 user assigned (system enforces this limit)
- [ ] AC33: Delete option is disabled for system roles including Super Admin (with tooltip explaining why)
- [ ] AC34: Edit option is disabled for Super Admin role (with tooltip explaining why)
- [ ] AC35: View option opens view modal/drawer with role details and permissions
- [ ] AC36: Edit option opens edit modal with pre-filled role data (disabled for Super Admin)
- [ ] AC37: Delete option shows confirmation modal before deleting role (disabled for Super Admin)
- [ ] AC38: Export button downloads roles data as CSV file (if implemented)
- [ ] AC39: Exported CSV includes all visible columns and filtered/search results
- [ ] AC40: Refresh/Reload button reloads role list from server
- [ ] AC41: Create Role button is visible in table header and opens role creation modal
- [ ] AC42: Table shows loading state while fetching data
- [ ] AC43: Table displays empty state message when no roles exist
- [ ] AC44: Table displays "No results found" message when search/filter returns no matches
- [ ] AC45: Total count of roles is displayed below the table
- [ ] AC46: System handles pagination correctly when filtering/searching (if pagination is implemented)

**Test Data:**
```json
{
  "sampleRoles": [
    {
      "id": "role-001",
      "name": "Super Admin",
      "description": "System default role with all permissions enabled",
      "users": 1,
      "organization": "Acme Corporation",
      "branch": "New York Office",
      "isSystem": true,
      "isSuperAdmin": true,
      "permissions": {
        "allModules": { "allActions": true }
      },
      "createdAt": "2026-01-01T10:00:00.000Z"
    },
    {
      "id": "role-002",
      "name": "Admin",
      "description": "Administrator role with full system access",
      "users": 5,
      "organization": "Acme Corporation",
      "branch": "New York Office",
      "isSystem": true,
      "isSuperAdmin": false,
      "createdAt": "2026-01-01T10:00:00.000Z"
    },
    {
      "id": "role-003",
      "name": "Patch Manager",
      "description": "Role for managing patches and deployments",
      "users": 12,
      "organization": "Tech Solutions Inc",
      "branch": "San Francisco Office",
      "isSystem": false,
      "isSuperAdmin": false,
      "createdAt": "2026-01-02T14:30:00.000Z"
    },
    {
      "id": "role-004",
      "name": "View Only",
      "description": "Read-only access to all modules",
      "users": 8,
      "organization": "Acme Corporation",
      "branch": "New York Office",
      "isSystem": false,
      "isSuperAdmin": false,
      "createdAt": "2026-01-03T09:15:00.000Z"
    },
    {
      "id": "role-005",
      "name": "Asset Manager",
      "description": "Role for managing assets and endpoints",
      "users": 3,
      "organization": "Global Enterprises",
      "isSystem": false,
      "isSuperAdmin": false,
      "createdAt": "2026-01-04T11:20:00.000Z"
    }
  ],
  "sampleRoleUsers": [
    {
      "roleId": "role-003",
      "roleName": "Patch Manager",
      "users": [
        {
          "id": "user-001",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "role": "Patch Manager",
          "organization": "Tech Solutions Inc",
          "isActive": true
        },
        {
          "id": "user-002",
          "name": "Jane Smith",
          "email": "jane.smith@example.com",
          "role": "Patch Manager",
          "organization": "Tech Solutions Inc",
          "isActive": true
        },
        {
          "id": "user-003",
          "name": "Bob Johnson",
          "email": "bob.johnson@example.com",
          "role": "Patch Manager",
          "organization": "Tech Solutions Inc",
          "isActive": true
        }
      ]
    },
    {
      "roleId": "role-001",
      "roleName": "Super Admin",
      "users": [
        {
          "id": "user-super",
          "name": "Super Admin User",
          "email": "superadmin@example.com",
          "role": "Super Admin",
          "organization": "Acme Corporation",
          "isActive": true
        }
      ]
    }
  ],
  "searchScenarios": {
    "searchByName": "Admin",
    "searchByDescription": "patches",
    "searchByOrganization": "Acme",
    "searchPartial": "Manager",
    "noResults": "NonExistentRole",
    "caseInsensitive": "ADMIN",
    "caseInsensitiveOrg": "ACME"
  },
  "branchFilterScenarios": {
    "allBranches": "all",
    "newYorkBranch": "New York Office",
    "sanFranciscoBranch": "San Francisco Office",
    "noBranch": null
  }
}
```

**API Endpoints:**
- `GET /v1/settings/roles` - List roles with search and filtering
  - **Query Parameters:**
    - `search` (string, optional) - Search term for role name, description, or organization name
    - `branch` (string, optional) - Filter by branch name
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "role-uuid",
          "name": "Super Admin",
          "description": "System default role with all permissions enabled",
          "users": 1,
          "organization": "Acme Corporation",
          "branch": "New York Office",
          "isSystem": true,
          "isSuperAdmin": true,
          "permissions": {
            "agents": { "view": true, "add": true, "edit": true, "delete": true },
            "assets": { "view": true, "add": true, "edit": true, "delete": true },
            "patches": { "view": true, "add": true, "edit": true, "delete": true },
            "vulnerabilities": { "view": true, "add": true, "edit": true, "delete": true },
            "jobs": { "view": true, "add": true, "edit": true, "delete": true },
            "discovery": { "view": true, "add": true, "edit": true, "delete": true },
            "reports": { "view": true, "add": true, "edit": true, "delete": true },
            "dashboard": { "view": true, "add": true, "edit": true, "delete": true },
            "settings": { "view": true, "add": true, "edit": true, "delete": true }
          },
          "createdAt": "2026-01-14T00:00:00.000Z",
          "updatedAt": "2026-01-14T00:00:00.000Z"
        },
        {
          "id": "role-uuid-2",
          "name": "Patch Manager",
          "description": "Role for managing patches and deployments",
          "users": 12,
          "organization": "Tech Solutions Inc",
          "branch": "San Francisco Office",
          "isSystem": false,
          "isSuperAdmin": false,
          "permissions": {
            "patches": {
              "view": true,
              "add": true,
              "edit": true,
              "delete": false
            }
          },
          "createdAt": "2026-01-14T00:00:00.000Z",
          "updatedAt": "2026-01-14T00:00:00.000Z"
        }
      ]
    }
    ```
  - **Sorting:** Default alphabetical by role name
  - **Search:** Searches in role name, description, and organization name fields (case-insensitive, partial match supported)
- `GET /v1/settings/roles/:id/users` - Get users assigned to a role
  - **Path Parameters:**
    - `id` (string, required) - Role ID
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "user-uuid",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "role": "Patch Manager",
          "organization": "Tech Solutions Inc",
          "isActive": true
        }
      ],
      "total": 12
    }
    ```
- `PUT /v1/settings/roles/:id/users/remove` - Remove users from role
  - **Path Parameters:**
    - `id` (string, required) - Role ID
  - **Request Body:**
    ```json
    {
      "userIds": ["user-uuid-1", "user-uuid-2"]
    }
    ```
  - **Success Response (200):**
    ```json
    {
      "message": "Users removed from role successfully",
      "removedCount": 2
    }
    ```
  - **Validation:**
    - Cannot remove user from Super Admin role if it's the only user (must maintain at least 1 user)
    - Returns 400 Bad Request if attempting to remove last user from Super Admin role

**UI Components:**
- Page: `/settings/user-management/roles` (RolesAndPrivileges.tsx)
- Components:
  - **Table Header:**
    - Branch filter dropdown (All Branches, plus list of branches)
    - Search input field (with SearchOutlined icon)
    - Create Role button (SafetyOutlined icon)
    - Refresh button (if implemented)
    - Export button (if implemented)
  - **Table:**
    - Columns: Role (name with System indicator), Users (count, clickable), Organization, Branch, Description, Actions
    - Sortable column: Role (name)
    - Clickable users count (opens users popup/modal)
    - Actions column: Dropdown menu with View, Edit, Delete options
  - **Column Filter Modal:**
    - Checkboxes for: Show Role, Show Users, Show Organization, Show Branch, Show Description
    - Apply button
    - Reset button (restores all columns)
  - **Users Popup/Modal:**
    - Modal title: "Users in [Role Name]"
    - Table/list of users with columns: Name, Email, Role, Organization, Status
    - Each user row has a remove action icon/button
    - "Select All" checkbox at the top
    - Action buttons: Save, Reset, Cancel
  - **Action Dropdown Menu:**
    - View option (opens view modal/drawer)
    - Edit option (opens edit modal, disabled for Super Admin)
    - Delete option (disabled for system roles including Super Admin, shows confirmation modal)
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no roles exist
  - **No Results State:** Message when search/filter returns no matches
  - **Total Count Display:** Shows total number of roles found below table
- User Actions:
  1. Navigate to Settings > User Management > Roles and Privileges
  2. View roles table with all columns (Role, Users, Organization, Branch, Description, Actions)
  3. Use search box to filter roles by name, description, or organization
  4. Click filter button to show/hide columns (Organization can be enabled/disabled)
  5. Select branch from dropdown to filter roles by branch
  6. Click Role column header to sort (alphabetical)
  7. Click on Users count to open users popup/modal
  8. In users popup, view list of users assigned to the role
  9. In users popup, click remove icon to mark individual user for removal
  10. In users popup, click "Select All" to select all users for removal
  11. In users popup, click "Save" to remove selected users from role
  12. In users popup, click "Reset" to clear selection and restore original state
  13. In users popup, click "Cancel" to close without saving changes
  14. Verify user count updates after removing users
  15. Click actions dropdown (three dots) to view options
  16. Click View option to view role details and permissions
  17. Click Edit option to edit role (disabled for Super Admin)
  18. Click Delete option to delete role (with confirmation, disabled for Super Admin and system roles)
  19. Click Create Role button to add new role
  20. Verify total count of roles is displayed
  21. Verify Super Admin role is displayed and cannot be edited or deleted

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have edit/delete/create)
- Verify table loads all roles on page load
- Test search functionality:
  - Search by role name (partial and full match)
  - Search by role description (partial match)
  - Search by organization name (partial and full match)
  - Case-insensitive search (test with uppercase/lowercase)
  - Search across multiple fields (e.g., search "Acme" should match organization "Acme Corporation")
  - Search with no results
  - Clear search to show all roles
  - Verify search works even when Organization column is hidden via column filter
- Test branch filtering:
  - Select "All Branches" (should show all roles)
  - Select specific branch (should show only roles for that branch)
  - Combine branch filter with search (should filter by both)
  - Test with roles that have no branch assigned
- Test sorting:
  - Sort by Role name (alphabetical sorting)
  - Verify sorting works with filtered/search results
- Test column filtering:
  - Hide/show individual columns (Role, Users, Organization, Branch, Description)
  - Apply filters
  - Reset filters to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify filter button shows active state when filters are applied
  - Test filtering Organization column (hide/show)
- Test actions:
  - Click actions dropdown to view menu options
  - Click View option (should open view modal/drawer)
  - Click Edit option (should open edit modal, disabled for Super Admin)
  - Click Delete option on non-system role (should show confirmation)
  - Click Delete option on system role (should be disabled)
  - Verify delete confirmation modal works correctly
- Test Super Admin role:
  - Verify Super Admin role exists and is created by system by default
  - Verify Super Admin role displays "(System)" label
  - Verify Super Admin role has all permissions enabled by default (all modules, all actions)
  - Verify Super Admin role cannot be edited (Edit option is disabled with tooltip)
  - Verify Super Admin role cannot be deleted (Delete option is disabled with tooltip)
  - Verify Super Admin role has maximum of 1 user assigned
  - Verify system prevents assigning more than 1 user to Super Admin role
  - Verify Super Admin role can be viewed (View option works)
  - Verify Super Admin role permissions are displayed correctly in view modal
- Test system roles:
  - Verify system roles display "(System)" label
  - Verify system roles cannot be deleted
  - Verify system roles can be viewed and edited (if allowed, except Super Admin)
- Test users column:
  - Verify user count displays correctly for each role
  - Verify user count is clickable
  - Click on user count to open users popup/modal
  - Verify popup shows correct role name in title
  - Verify popup displays all users assigned to the role
  - Verify user details are shown correctly (name, email, role, organization, status)
  - Test removing individual user:
    - Click remove icon on a user
    - Verify user is marked for removal (highlighted or checked)
    - Click Save button
    - Verify user is removed from role
    - Verify user count in table updates
    - Verify popup closes after save
    - Verify user's role is updated (removed from this role)
  - Test removing multiple users:
    - Click remove icon on multiple users
    - Verify all selected users are marked for removal
    - Click Save button
    - Verify all selected users are removed from role
    - Verify user count in table updates correctly
  - Test "Select All" functionality:
    - Click "Select All" checkbox
    - Verify all users are selected/marked for removal
    - Click Save button
    - Verify all users are removed from role
    - Verify user count becomes 0
    - Verify role can be deleted after removing all users (if not system role)
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
    - Verify no users are removed from role
  - Test popup with no users:
    - Open popup for role with no users
    - Verify empty state message is shown
    - Verify "Select All" is disabled
    - Verify Save button is disabled or hidden
  - Test Super Admin role restrictions:
    - Verify Super Admin role has maximum of 1 user (system enforces this)
    - Test attempting to remove the only user from Super Admin role (should be prevented)
    - Verify error message is shown when attempting to remove last user from Super Admin
    - Verify Save button is disabled when only user is selected for removal from Super Admin
    - Test attempting to assign a second user to Super Admin role (should be prevented or error shown)
    - Verify user count for Super Admin cannot exceed 1
  - Verify user count updates automatically after removing users
  - Verify user count is accurate for each role
  - Verify user count updates when users are assigned/unassigned
  - Test attempting to remove users via API (should work correctly, with Super Admin restrictions)
- Test organization column:
  - Verify organization name displays correctly
  - Verify "—" displays when organization is not assigned
  - Verify organization can be enabled/disabled via column filter
  - Test organization column in search functionality
- Test branch column:
  - Verify branch name displays correctly
  - Verify "—" displays when branch is not assigned
- Test description column:
  - Verify description displays correctly
  - Verify long descriptions show ellipsis
  - Verify full description is visible in view modal
- Test export functionality (if implemented):
  - Export all roles
  - Export filtered/search results
  - Verify CSV file is downloaded correctly
  - Verify CSV includes correct columns and data (including Organization if visible)
  - Verify Organization column is included in CSV when column filter shows it
- Test refresh functionality:
  - Click refresh button (if implemented)
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no roles exist
  - "No results found" when search/filter returns no matches
- Verify total count display:
  - Shows accurate count of roles found
  - Updates correctly when filters/search are applied
- Test Create Role button:
  - Verify button is always visible and functional
  - Verify button opens role creation modal
- Verify table performance with large number of roles
- Test responsive design (table on different screen sizes)

---

### User Story 8: Forgot Password

**Story ID:** `US-008`  
**Title:** Request Password Reset via Email  
**Priority:** P0 (Critical)  
**Module:** Auth

**User Story:**
```
As a user
I want to request a password reset link via email
So that I can reset my password if I forget it and regain access to my account
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Forgot Password page from login page via "Forgot Password?" link
- [ ] AC2: Forgot Password page displays a form with email input field
- [ ] AC3: Email field is mandatory and cannot be empty
- [ ] AC4: System validates email format before submission
- [ ] AC5: System accepts valid email addresses (standard email format)
- [ ] AC6: System rejects invalid email formats (shows validation error)
- [ ] AC7: "Send Link" button is disabled during loading state
- [ ] AC8: System always returns success message regardless of whether email exists (security best practice)
- [ ] AC9: If email exists in system, system generates a unique password reset token
- [ ] AC10: Password reset token is hashed before storage (never stored in plain text)
- [ ] AC11: Password reset token expires after 1 hour
- [ ] AC12: System stores token hash with expiration time in database
- [ ] AC13: System sends password reset email to user (if email exists) with reset link containing token
- [ ] AC14: Password reset email contains instructions and reset link
- [ ] AC15: Success message is displayed after form submission
- [ ] AC16: Success message indicates that password reset instructions have been sent to email
- [ ] AC17: User is redirected to login page after successful submission (after 2 seconds delay)
- [ ] AC18: System applies rate limiting to prevent abuse (prevents multiple rapid requests)
- [ ] AC19: System creates an audit log entry for password reset request
- [ ] AC20: System handles non-existent email addresses gracefully (returns success without revealing email doesn't exist)
- [ ] AC21: System handles disabled/suspended accounts appropriately (may or may not send email based on policy)
- [ ] AC22: If email doesn't exist, system does not send email but still returns success message
- [ ] AC23: Only one active reset token exists per user at a time (new request invalidates previous token)
- [ ] AC24: Form validation errors are displayed inline below the email field

**Test Data:**
```json
{
  "validEmail": {
    "email": "user@patchiq.test"
  },
  "nonExistentEmail": {
    "email": "nonexistent@patchiq.test"
  },
  "invalidEmailFormat": {
    "email": "invalid-email"
  },
  "invalidEmailNoAt": {
    "email": "invalidemail.com"
  },
  "invalidEmailNoDomain": {
    "email": "user@"
  },
  "invalidEmailNoLocalPart": {
    "email": "@domain.com"
  },
  "emptyEmail": {
    "email": ""
  },
  "emailWithSpaces": {
    "email": "user name@patchiq.test"
  },
  "emailUppercase": {
    "email": "USER@PATCHIQ.TEST"
  },
  "disabledUserEmail": {
    "email": "disabled@patchiq.test"
  }
}
```

**API Endpoints:**
- `POST /v1/auth/forgot-password` - Request password reset email
  - **Request Body:**
    ```json
    {
      "email": "user@patchiq.test"
    }
    ```
  - **Success Response (200):**
    ```json
    {
      "message": "Password reset instructions sent to email"
    }
    ```
    **Note:** System always returns success message (200) regardless of whether email exists, for security reasons.
  - **Error Responses:**
    - `422 Unprocessable Entity` - Invalid email format or missing email field
    - `429 Too Many Requests` - Rate limit exceeded (too many requests from same IP)
  - **Rate Limiting:** Applied to prevent abuse and brute force attacks
  - **Token Expiration:** Reset token expires after 1 hour
  - **Security:** Always returns success to prevent email enumeration attacks

**UI Components:**
- Page: `/forgot-password` (ForgotPassword.tsx)
- Components:
  - Page title "Forgot Password?"
  - Subtitle text "Enter your email to receive password reset link"
  - Email input field (required, validated)
  - "Send Link" button (primary, with SendOutlined icon, disabled during loading)
  - Success message display area
  - Error/validation message display area
  - Link to return to login page (if available)
- User Actions:
  1. Navigate to login page
  2. Click "Forgot Password?" link
  3. Verify Forgot Password page loads
  4. Enter email address in email field
  5. Verify email format validation (real-time or on blur)
  6. Click "Send Link" button
  7. Verify loading state (button disabled, loading indicator)
  8. Verify success message appears
  9. Verify redirect to login page after 2 seconds
  10. Check email inbox for password reset link

**Test Notes:**
- Test with valid email address that exists in system:
  - Verify email is sent (check email service or console logs in dev)
  - Verify reset token is generated and stored in database
  - Verify token hash is stored (not plain token)
  - Verify token expiration is set to 1 hour from creation time
  - Verify success message is displayed
  - Verify redirect to login page
  - Verify audit log entry is created
- Test with non-existent email address:
  - Verify system returns success message (doesn't reveal email doesn't exist)
  - Verify no email is sent
  - Verify no token is generated
  - Verify no error message revealing email doesn't exist
- Test email format validation:
  - Test with invalid email formats (no @, no domain, no local part)
  - Verify validation errors are displayed
  - Verify form cannot be submitted with invalid email
  - Test with valid email formats (standard email format)
- Test edge cases:
  - Test with empty email field (should show required error)
  - Test with email containing spaces (should be validated)
  - Test with uppercase email (should be normalized to lowercase)
  - Test with disabled/suspended user account (verify behavior based on policy)
- Test rate limiting:
  - Make multiple rapid requests from same IP
  - Verify rate limiting kicks in after threshold
  - Verify 429 error is returned when rate limit exceeded
  - Verify rate limit resets after time window
- Test security features:
  - Verify system always returns success (doesn't reveal if email exists)
  - Verify token is hashed before storage
  - Verify only one active token per user (new request invalidates previous)
  - Verify token expiration is enforced
  - Verify audit log entry is created for security monitoring
- Test UI/UX:
  - Verify loading state shows during request
  - Verify success message is clear and helpful
  - Verify redirect to login page after success
  - Verify form validation errors are displayed inline
  - Verify email field has appropriate placeholder and autocomplete
  - Verify "Send Link" button is disabled during loading
- Test password reset token:
  - Verify token is unique for each request
  - Verify previous token is invalidated when new request is made
  - Verify token expiration time is correct (1 hour)
  - Verify token can be used in reset password flow (covered in reset password story)
- Test accessibility:
  - Verify form fields are properly labeled
  - Verify error messages are accessible
  - Verify keyboard navigation works correctly
  - Verify form can be submitted using Enter key

---

### User Story 9: Create Branch

**Story ID:** `US-009`  
**Title:** Create New Branch  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to create a new branch with a name and optional details
So that I can organize departments, users, and resources within an organization into different branch locations
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to User Management > Branch Location page and click "Create Branch" button
- [ ] AC2: Branch creation form/modal opens with required fields visible
- [ ] AC3: Branch name field is mandatory and accepts 1-100 characters
- [ ] AC4: System validates branch name is unique within the selected organization (prevents duplicate branch names in same organization)
- [ ] AC5: Organization field is mandatory and must be selected from dropdown
- [ ] AC6: System validates that selected organization exists in the system
- [ ] AC7: Description field is optional and accepts up to 500 characters
- [ ] AC8: "Set as Default" checkbox is optional and unchecked by default
- [ ] AC9: Admin can mark branch as default by checking "Set as Default" checkbox
- [ ] AC10: If new branch is set as default, system automatically unsets the previous default branch in the same organization
- [ ] AC11: Only one branch can be marked as default per organization at a time
- [ ] AC12: System validates that branch name is not empty before submission
- [ ] AC13: System validates that organization is selected before submission
- [ ] AC14: System prevents creating branch with existing name within the same organization (returns 409 Conflict error)
- [ ] AC15: Optional fields: Address, City, State, Country, Postal Code, Phone, Email, Manager can be provided
- [ ] AC16: System validates email format if email is provided
- [ ] AC17: System validates that manager exists in the system if manager is provided
- [ ] AC18: Upon successful creation, branch is created with isDefault=false (unless explicitly set)
- [ ] AC19: System creates an audit log entry for branch creation action
- [ ] AC20: Success message is displayed after branch creation
- [ ] AC21: Branch list is refreshed to show newly created branch
- [ ] AC22: Created branch details are returned in response
- [ ] AC23: Created branch can be immediately used when creating users, roles, or departments
- [ ] AC24: System returns appropriate error messages for validation failures
- [ ] AC25: Cancel button closes the form/modal without saving changes
- [ ] AC26: Reset button resets the form to original/empty state

**Test Data:**
```json
{
  "validBranchComplete": {
    "name": "New York Office",
    "description": "Main branch office in New York with all departments",
    "organizationId": "org-uuid-here",
    "isDefault": true,
    "address": "123 Main Street",
    "city": "New York",
    "state": "New York",
    "country": "United States",
    "postalCode": "10001",
    "phone": "+1-555-123-4567",
    "email": "ny-office@patchiq.test",
    "manager": "manager-uuid-here"
  },
  "validBranchMinimal": {
    "name": "San Francisco Office",
    "organizationId": "org-uuid-here"
  },
  "validBranchWithDescription": {
    "name": "Chicago Office",
    "description": "Branch office in Chicago for regional operations",
    "organizationId": "org-uuid-here"
  },
  "missingName": {
    "description": "Branch without name",
    "organizationId": "org-uuid-here"
  },
  "missingOrganization": {
    "name": "Seattle Office"
  },
  "duplicateName": {
    "name": "New York Office",
    "description": "Duplicate branch name in same organization",
    "organizationId": "org-uuid-here"
  },
  "duplicateNameDifferentOrg": {
    "name": "New York Office",
    "organizationId": "different-org-uuid-here"
  },
  "nameTooLong": {
    "name": "This is a very long branch name that exceeds the maximum character limit of one hundred characters and should be rejected by the system validation",
    "organizationId": "org-uuid-here"
  },
  "descriptionTooLong": {
    "name": "Test Branch",
    "description": "This is a description that exceeds the maximum character limit of five hundred characters and should be rejected. ".repeat(10),
    "organizationId": "org-uuid-here"
  },
  "setAsDefaultWhenOtherExists": {
    "name": "New Default Branch",
    "description": "Setting this as default should unset previous default",
    "organizationId": "org-uuid-here",
    "isDefault": true
  },
  "branchWithoutDefault": {
    "name": "Regular Branch",
    "description": "Branch not set as default",
    "organizationId": "org-uuid-here",
    "isDefault": false
  },
  "invalidOrganization": {
    "name": "Invalid Branch",
    "organizationId": "non-existent-uuid"
  },
  "invalidEmail": {
    "name": "Branch with Invalid Email",
    "organizationId": "org-uuid-here",
    "email": "invalid-email"
  },
  "invalidManager": {
    "name": "Branch with Invalid Manager",
    "organizationId": "org-uuid-here",
    "manager": "non-existent-uuid"
  }
}
```

**API Endpoints:**
- `POST /v1/settings/branches` - Create a new branch
  - **Request Body (Required: name, organizationId, Optional: description, isDefault, address, city, state, country, postalCode, phone, email, manager):**
    ```json
    {
      "name": "New York Office",
      "description": "Main branch office in New York",
      "organizationId": "org-uuid",
      "isDefault": false,
      "address": "123 Main Street",
      "city": "New York",
      "state": "New York",
      "country": "United States",
      "postalCode": "10001",
      "phone": "+1-555-123-4567",
      "email": "ny-office@patchiq.test",
      "manager": "manager-uuid"
    }
    ```
  - **Success Response (201):**
    ```json
    {
      "id": "branch-uuid",
      "name": "New York Office",
      "description": "Main branch office in New York",
      "organizationId": "org-uuid",
      "organization": { "id": "org-uuid", "name": "Acme Corporation" },
      "isDefault": false,
      "address": "123 Main Street",
      "city": "New York",
      "state": "New York",
      "country": "United States",
      "postalCode": "10001",
      "phone": "+1-555-123-4567",
      "email": "ny-office@patchiq.test",
      "manager": { "id": "manager-uuid", "name": "John Manager" },
      "departments": 0,
      "users": 0,
      "createdAt": "2026-01-14T00:00:00.000Z",
      "updatedAt": "2026-01-14T00:00:00.000Z"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` - Invalid input data, missing required fields, or validation failure
    - `401 Unauthorized` - Not authenticated
    - `403 Forbidden` - Insufficient permissions (non-admin)
    - `404 Not Found` - Organization not found
    - `409 Conflict` - Branch name already exists in this organization
    - `422 Unprocessable Entity` - Invalid email format, manager not found, or invalid data format

**UI Components:**
- Page: `/settings/user-management/branch-location` (BranchLocation.tsx)
- Components:
  - "Create Branch" button (PlusOutlined icon)
  - Branch creation modal/drawer
  - Form fields:
    - Branch Name (required, text input, max 100 characters)
    - Organization (required, dropdown, must select from available organizations)
    - Description (optional, textarea, max 500 characters)
    - Set as Default (optional, checkbox, unchecked by default)
    - Address (optional, text input, max 500 characters)
    - City (optional, text input, max 100 characters)
    - State (optional, text input, max 100 characters)
    - Country (optional, text input, max 100 characters)
    - Postal Code (optional, text input, max 20 characters)
    - Phone (optional, text input, max 50 characters)
    - Email (optional, email input, validated if provided)
    - Manager (optional, dropdown, select from users)
  - Action buttons:
    - Submit/Save button (saves the branch)
    - Reset button (resets form to empty state)
    - Cancel button (closes form without saving)
  - Success/error message notifications
- User Actions:
  1. Navigate to Settings > User Management > Branch Location
  2. Click "Create Branch" button (or + icon)
  3. Enter branch name (required)
  4. Select organization from dropdown (required)
  5. Enter description (optional)
  6. Optionally check "Set as Default" checkbox
  7. Optionally fill in address details (Address, City, State, Country, Postal Code)
  8. Optionally fill in contact details (Phone, Email)
  9. Optionally select manager from dropdown
  10. (Optional) Click "Reset" button to clear all fields
  11. (Optional) Click "Cancel" button to close form without saving
  12. Click "Save" or "Create" button
  13. Verify success message appears
  14. Verify new branch appears in branch list
  15. Verify branch can be selected when creating users, roles, or departments

**Test Notes:**
- Test with admin role (should have permission)
- Test with regular user role (should be forbidden)
- Verify branch name uniqueness validation (within same organization):
  - Test creating branch with same name in same organization (should fail with 409 Conflict)
  - Test creating branch with same name in different organization (should succeed)
- Verify branch name length validation (1-100 characters)
- Verify description length validation (max 500 characters)
- Verify organization field is mandatory and must be selected
- Verify organization dropdown is populated with available organizations
- Test setting branch as default when another default exists in same organization (should unset previous default)
- Verify only one branch can be default per organization at a time
- Test creating branch without setting as default (isDefault should be false)
- Verify Cancel button closes form without saving changes
- Verify Reset button clears all form fields
- Test optional fields:
  - Test creating branch with all optional fields filled
  - Test creating branch with minimal required fields only
  - Test email validation (valid format required if provided)
  - Test manager validation (must exist in system if provided)
  - Test address fields (Address, City, State, Country, Postal Code)
  - Test contact fields (Phone, Email)
- Test validation errors:
  - Missing name (should show validation error)
  - Missing organization (should show validation error)
  - Invalid email format (should show validation error)
  - Invalid manager ID (should show 422 error)
  - Name too long (should show validation error)
  - Description too long (should show validation error)
- Test default branch logic:
  - Create branch and set as default
  - Verify previous default branch in same organization is unset
  - Verify new branch is set as default
  - Verify only one default per organization
- Verify branch is immediately available in dropdown when creating users, roles, or departments
- Verify audit log contains branch creation details
- Test form validation (empty name, name too long, description too long, invalid email, invalid organization)
- Verify appropriate error messages for each validation failure
- Test creating branch with same name as existing one in same organization (should fail with 409 Conflict)
- Verify newly created branch can be edited immediately after creation
- Test branch name with special characters (if allowed) or verify restrictions
- Verify branch belongs to the selected organization

---

### User Story 10: Branch Location Table Functions

**Story ID:** `US-010`  
**Title:** View and Manage Branches in Table View  
**Priority:** P0 (Critical)  
**Module:** Settings - User Management

**User Story:**
```
As an administrator
I want to view, search, filter, and manage branches in a table view
So that I can efficiently browse, find, and perform actions on branch locations
```

**Acceptance Criteria:**
- [ ] AC1: Admin can navigate to User Management > Branch Location page and see branches table
- [ ] AC2: Table displays all branches with columns: ID, Name, Organization, Description, Default, Users, Departments, Created On, Actions
- [ ] AC3: Branches are sorted by default status first (default branches appear first), then alphabetically by name
- [ ] AC4: Search functionality allows searching by branch ID, name, description, or organization name
- [ ] AC5: Search is case-insensitive and filters results in real-time as user types
- [ ] AC6: Column filter allows showing/hiding columns (ID, Name, Organization, Description, Default, Users, Departments)
- [ ] AC7: Column filter modal displays checkboxes for each column
- [ ] AC8: "Reset Filters" button in filter modal restores all columns to visible state
- [ ] AC9: Organization filter dropdown allows filtering branches by organization (with "All Organizations" option)
- [ ] AC10: Organization filter is independent of search and works in combination with search
- [ ] AC11: Table supports pagination with configurable page size (default 20 items per page)
- [ ] AC12: Pagination shows current page, total pages, and total count of branches
- [ ] AC13: Table supports sorting by ID (numeric) and Name (alphabetical)
- [ ] AC14: Clicking on branch name opens view modal/drawer with branch details
- [ ] AC15: Actions column displays Edit and Delete buttons for each branch
- [ ] AC16: Delete button is disabled for default branches (with tooltip explaining why)
- [ ] AC17: Edit button opens edit modal with pre-filled branch data
- [ ] AC18: Delete button shows confirmation modal before deleting branch
- [ ] AC19: Export button downloads branches data as CSV file
- [ ] AC20: Exported CSV includes all visible columns and filtered/search results
- [ ] AC21: Refresh/Reload button reloads branch list from server
- [ ] AC22: Create Branch button is visible in table header and opens branch creation modal
- [ ] AC23: Table shows loading state while fetching data
- [ ] AC24: Table displays empty state message when no branches exist
- [ ] AC25: Table displays "No results found" message when search/filter returns no matches
- [ ] AC26: Created On column displays formatted date and time
- [ ] AC27: Description column shows ellipsis (...) for long descriptions
- [ ] AC28: Default column displays "Yes" or checkmark for default branches, "No" or empty for non-default
- [ ] AC29: Users column displays the count of users assigned to each branch (through departments)
- [ ] AC30: Departments column displays the count of departments in each branch
- [ ] AC31: Organization column displays organization name
- [ ] AC32: System handles pagination correctly when filtering/searching (resets to page 1)

**Test Data:**
```json
{
  "sampleBranches": [
    {
      "id": "branch-001",
      "name": "New York Office",
      "organization": "Acme Corporation",
      "description": "Main branch office in New York",
      "isDefault": true,
      "users": 45,
      "departments": 5,
      "createdAt": "2026-01-01T10:00:00.000Z"
    },
    {
      "id": "branch-002",
      "name": "San Francisco Office",
      "organization": "Tech Solutions Inc",
      "description": "West coast branch office",
      "isDefault": false,
      "users": 32,
      "departments": 4,
      "createdAt": "2026-01-02T14:30:00.000Z"
    },
    {
      "id": "branch-003",
      "name": "Chicago Office",
      "organization": "Acme Corporation",
      "description": "Midwest regional branch",
      "isDefault": false,
      "users": 18,
      "departments": 3,
      "createdAt": "2026-01-03T09:15:00.000Z"
    },
    {
      "id": "branch-004",
      "name": "London Office",
      "organization": "Global Enterprises",
      "description": "European headquarters",
      "isDefault": false,
      "users": 28,
      "departments": 4,
      "createdAt": "2026-01-04T11:20:00.000Z"
    }
  ],
  "searchScenarios": {
    "searchByName": "New York",
    "searchByDescription": "West coast",
    "searchByOrganization": "Acme",
    "searchByID": "branch-002",
    "noResults": "NonExistentBranch",
    "caseInsensitive": "NEW YORK"
  },
  "organizationFilterScenarios": {
    "allOrganizations": "all",
    "acmeCorporation": "Acme Corporation",
    "techSolutions": "Tech Solutions Inc",
    "globalEnterprises": "Global Enterprises"
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
- `GET /v1/settings/branches` - List branches with pagination, search, and organization filter
  - **Query Parameters:**
    - `page` (number, default: 1) - Page number
    - `limit` (number, default: 20) - Items per page
    - `search` (string, optional) - Search term for name or description
    - `organizationId` (string, optional) - Filter by organization ID
  - **Success Response (200):**
    ```json
    {
      "data": [
        {
          "id": "branch-uuid",
          "name": "New York Office",
          "description": "Main branch office in New York",
          "organizationId": "org-uuid",
          "organization": { "id": "org-uuid", "name": "Acme Corporation" },
          "isDefault": true,
          "users": 45,
          "departments": 5,
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
  - **Sorting:** Default branches first, then alphabetical by name
  - **Search:** Searches in name and description fields (case-insensitive)

**UI Components:**
- Page: `/settings/user-management/branch-location` (BranchLocation.tsx)
- Components:
  - **Table Header:**
    - Page title "Branches"
    - Organization filter dropdown (All Organizations, plus list of organizations)
    - Search input field (with SearchOutlined icon)
    - Filter button (FilterOutlined icon) - opens column filter modal
    - Export button (DownloadOutlined icon) - exports to CSV
    - Refresh button (ReloadOutlined icon) - reloads data
    - Create Branch button (PlusOutlined icon)
  - **Table:**
    - Columns: ID, Name, Organization, Description, Default, Users (count), Departments (count), Created On, Actions
    - Sortable columns: ID, Name
    - Clickable branch name (opens view modal/drawer)
    - Actions column: Edit button, Delete button
  - **Column Filter Modal:**
    - Checkboxes for: Show ID, Show Name, Show Organization, Show Description, Show Default, Show Users, Show Departments
    - Apply button
    - Reset button (restores all columns)
  - **Pagination:**
    - Page size selector (10, 20, 50, 100)
    - Page navigation (Previous, Next, page numbers)
    - Total count display
  - **View Modal/Drawer:** (opened by clicking branch name)
    - Branch details display
    - Edit button (if in view mode)
  - **Loading State:** Table shows loading spinner while fetching
  - **Empty State:** Message when no branches exist
  - **No Results State:** Message when search/filter returns no matches
- User Actions:
  1. Navigate to Settings > User Management > Branch Location
  2. View branches table with all columns
  3. Use search box to filter branches by ID, name, description, or organization
  4. Select organization from dropdown to filter branches by organization
  5. Click filter button to show/hide columns
  6. Click column headers to sort (ID, Name)
  7. Adjust pagination (change page size, navigate pages)
  8. Click branch name to view details in modal/drawer
  9. View Organization, Description, Default status, Users count, and Departments count for each branch
  10. Click Edit button to edit branch
  11. Click Delete button to delete branch (with confirmation, disabled for default branches)
  12. Click Export button to download CSV
  13. Click Refresh button to reload data
  14. Click Create Branch button to add new branch

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have edit/delete)
- Verify table loads all branches on page load
- Test search functionality:
  - Search by branch name (partial and full match)
  - Search by branch ID
  - Search by description (partial match)
  - Search by organization name (partial match)
  - Case-insensitive search
  - Search across multiple fields (e.g., search "Acme" should match organization "Acme Corporation")
  - Search with no results
  - Clear search to show all branches
  - Verify search works even when Organization column is hidden via column filter
- Test organization filtering:
  - Select "All Organizations" (should show all branches)
  - Select specific organization (should show only branches for that organization)
  - Combine organization filter with search (should filter by both)
  - Test with branches from different organizations
- Test column filtering:
  - Hide/show individual columns (ID, Name, Organization, Description, Default, Users, Departments)
  - Apply filters
  - Reset filters to show all columns
  - Verify table updates correctly when columns are hidden/shown
  - Verify filter button shows active state when filters are applied
  - Test filtering each column individually
- Test sorting:
  - Sort by ID (numeric sorting)
  - Sort by Name (alphabetical sorting)
  - Verify default branches always appear first regardless of sort
  - Verify sorting works with filtered/search results
- Test pagination:
  - Change page size (10, 20, 50, 100)
  - Navigate between pages
  - Verify pagination resets to page 1 when searching/filtering
  - Verify total count is accurate
- Test actions:
  - Click branch name to view details in modal/drawer
  - Click Edit button (should open edit modal)
  - Click Delete button on non-default branch (should show confirmation)
  - Click Delete button on default branch (should be disabled with tooltip)
  - Verify delete confirmation modal works correctly
- Test default branch column:
  - Verify default branches display "Yes" or checkmark
  - Verify non-default branches display "No" or empty
  - Verify default branches always appear first
  - Verify only one default branch per organization
- Test users count column:
  - Verify user count is accurate for each branch (users through departments)
  - Verify user count updates when users are assigned/unassigned
  - Verify user count displays "0" for branches with no users
- Test departments count column:
  - Verify department count is accurate for each branch
  - Verify department count updates when departments are created/deleted
  - Verify department count displays "0" for branches with no departments
- Test organization column:
  - Verify organization name displays correctly for each branch
  - Verify organization can be filtered
- Test description column:
  - Verify description displays correctly
  - Verify long descriptions show ellipsis
  - Verify full description is visible in view modal/drawer
- Test export functionality:
  - Export all branches
  - Export filtered/search results
  - Verify CSV file is downloaded correctly
  - Verify CSV includes correct columns and data (including Organization, Users, Departments)
  - Verify Organization column is included in CSV when column filter shows it
- Test refresh functionality:
  - Click refresh button
  - Verify data is reloaded from server
  - Verify current filters/search are maintained
- Verify loading states:
  - Table shows loading spinner while fetching
  - Loading state disappears when data loads
- Verify empty states:
  - Empty state when no branches exist
  - "No results found" when search/filter returns no matches
- Test date formatting in Created On column
- Verify table performance with large number of branches
- Test responsive design (table on different screen sizes)
- Test column visibility persistence (user preferences saved if implemented)
- Verify Create Branch button is always visible and functional

---

## Test Execution Summary

| Story ID | Title | Status | Tester | Date | Notes |
|----------|-------|--------|--------|------|-------|
| US-001 | User Login Authentication | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-002 | Create New Organization | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-003 | View and Manage Organizations in Table View | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-004 | Create New User Account | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-005 | View and Manage Users in Table View | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-006 | Create New User Role with Permissions | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-006 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-007 | View and Manage User Roles in Table View | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-008 | Request Password Reset via Email | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-009 | Create New Branch | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-010 | View and Manage Branches in Table View | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |

**Legend:**
- ⏳ Pending: Story not yet tested
- ✅ Pass: All acceptance criteria met
- ❌ Fail: One or more acceptance criteria not met

---

**Document End**
