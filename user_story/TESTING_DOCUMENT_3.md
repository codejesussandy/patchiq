# PatchIQ User Stories - Testing Document 3

**Version:** 1.0.0  
**Last Updated:** 2026-01-14  
**Purpose:** User stories for testing PatchIQ patch management solution functionality (Set 3)

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

### User Story 1: Agent Configuration

**Story ID:** `US-021`  
**Title:** Configure Agent Settings for Selected Agents  
**Priority:** P0 (Critical)  
**Module:** Agents - Agent Configuration

**User Story:**
```
As a system administrator
I want to configure agent settings for one or more selected agents
So that I can manage refresh cycles, bandwidth limits, and other agent behaviors across multiple agents efficiently
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Settings > Agent Management > Agent Details page
- [ ] AC2: Agent Details page displays table of all registered agents
- [ ] AC3: User can select one or more agents from the table using checkboxes
- [ ] AC4: "Agent Configuration" tab/button is available on the Agent Details page
- [ ] AC5: Agent Configuration tab/button is initially disabled (grayed out)
- [ ] AC6: Agent Configuration tab/button becomes enabled when one or more agents are selected
- [ ] AC7: Clicking Agent Configuration tab/button opens Agent Configuration modal/drawer
- [ ] AC8: Agent Configuration modal displays title "Agent Configuration" or "Configure Agents"
- [ ] AC9: Agent Configuration modal shows count of selected agents (e.g., "Configuring 3 agents")
- [ ] AC10: All configuration fields are marked as mandatory with asterisk (*)
- [ ] AC11: Configuration form displays the following settings:
  - **Allowed Bandwidth to download Files:**
    - Input field (numeric, accepts 0 or positive integers)
    - Unit label: "KB/sec"
    - Description: "Use 0 to disable Bandwidth limit"
    - Default value: 0
  - **Refresh Cycles (all in Seconds):**
    - Agent Refresh Cycle (default: 10 seconds)
    - Endpoint Vitals Refresh Cycle (default: 10 seconds)
    - SBOM Refresh Cycle (default: 300 seconds)
    - Network Refresh Cycle (default: 300 seconds)
    - Start-up Items Refresh Cycle (default: 300 seconds)
    - System Resources Refresh Cycle (default: 300 seconds)
    - FIM Events Refresh Cycle (default: 300 seconds)
    - System Action Refresh Cycle (default: 10 seconds)
    - Patch Scanning Refresh Cycle (default: 21600 seconds)
    - Process Refresh Cycle (default: 300 seconds)
    - Certificate Refresh Cycle (default: 300 seconds)
    - Users Refresh Cycle (default: 300 seconds)
    - System Services Refresh Cycle (default: 300 seconds)
    - Software Meter Refresh Cycle (default: 300 seconds)
- [ ] AC12: All refresh cycle fields display unit label "Seconds" next to input field
- [ ] AC13: All input fields accept numeric values only
- [ ] AC14: System validates that all fields are filled (all fields are mandatory)
- [ ] AC15: System validates that bandwidth value is non-negative (0 or positive integer)
- [ ] AC16: System validates that all refresh cycle values are positive integers (minimum 1 second)
- [ ] AC17: If multiple agents are selected, configuration is applied to all selected agents
- [ ] AC18: If single agent is selected, configuration is applied to that agent only
- [ ] AC19: Apply button is available in the configuration modal
- [ ] AC20: Apply button is enabled only when all required fields are filled and valid
- [ ] AC21: Clicking Apply button validates all fields
- [ ] AC22: Upon successful validation, system applies configuration to all selected agents
- [ ] AC23: System sends configuration update command to all selected agents
- [ ] AC24: System creates audit log entry for configuration change action
- [ ] AC25: Success message is displayed after configuration is applied successfully
- [ ] AC26: Success message shows count of agents configured (e.g., "Configuration applied to 3 agents")
- [ ] AC27: Configuration modal closes automatically after successful application
- [ ] AC28: Agent table refreshes to show updated status
- [ ] AC29: Cancel button is available in the configuration modal
- [ ] AC30: Clicking Cancel button closes the modal without applying any changes
- [ ] AC31: Reset button is available in the configuration modal
- [ ] AC32: Clicking Reset button resets all fields to default values
- [ ] AC33: System returns appropriate error messages for validation failures
- [ ] AC34: System handles errors gracefully if configuration fails for some agents
- [ ] AC35: If configuration fails for some agents, system shows partial success message with details
- [ ] AC36: Configuration form displays current/default values when opened
- [ ] AC37: If agents have different existing configurations, form shows default values or most common values
- [ ] AC38: User can modify any configuration value before applying
- [ ] AC39: System prevents applying invalid configurations (negative values, zero refresh cycles, etc.)
- [ ] AC40: Configuration changes take effect on agents after they receive the update command
- [ ] AC41: Agents acknowledge configuration updates and apply them immediately
- [ ] AC42: System tracks configuration history for each agent (if applicable)
- [ ] AC43: Configuration modal is responsive and works on different screen sizes
- [ ] AC44: User can select/deselect agents while configuration modal is open (modal updates agent count)
- [ ] AC45: If all agents are deselected while modal is open, Apply button becomes disabled

**Test Data:**
```json
{
  "validConfiguration": {
    "allowedBandwidth": 1024,
    "refreshCycles": {
      "agent": 10,
      "endpointVitals": 10,
      "sbom": 300,
      "network": 300,
      "startupItems": 300,
      "systemResources": 300,
      "fimEvents": 300,
      "systemAction": 10,
      "patchScanning": 21600,
      "process": 300,
      "certificate": 300,
      "users": 300,
      "systemServices": 300,
      "softwareMeter": 300
    }
  },
  "bandwidthDisabled": {
    "allowedBandwidth": 0,
    "refreshCycles": {
      "agent": 10,
      "endpointVitals": 10,
      "sbom": 300,
      "network": 300,
      "startupItems": 300,
      "systemResources": 300,
      "fimEvents": 300,
      "systemAction": 10,
      "patchScanning": 21600,
      "process": 300,
      "certificate": 300,
      "users": 300,
      "systemServices": 300,
      "softwareMeter": 300
    }
  },
  "customRefreshCycles": {
    "allowedBandwidth": 2048,
    "refreshCycles": {
      "agent": 5,
      "endpointVitals": 5,
      "sbom": 600,
      "network": 600,
      "startupItems": 600,
      "systemResources": 600,
      "fimEvents": 600,
      "systemAction": 5,
      "patchScanning": 43200,
      "process": 600,
      "certificate": 600,
      "users": 600,
      "systemServices": 600,
      "softwareMeter": 600
    }
  },
  "invalidConfiguration": {
    "allowedBandwidth": -100,
    "refreshCycles": {
      "agent": 0,
      "endpointVitals": -5,
      "sbom": 300,
      "network": 300,
      "startupItems": 300,
      "systemResources": 300,
      "fimEvents": 300,
      "systemAction": 10,
      "patchScanning": 21600,
      "process": 300,
      "certificate": 300,
      "users": 300,
      "systemServices": 300,
      "softwareMeter": 300
    }
  },
  "selectedAgents": [
    "agent-001",
    "agent-002",
    "agent-003"
  ]
}
```

**API Endpoints:**
- `GET /v1/agents` - List all agents (for selection)
- `GET /v1/agents/:id/configuration` - Get current configuration for an agent
  - Response: `{ allowedBandwidth: number, refreshCycles: { agent: number, endpointVitals: number, sbom: number, network: number, startupItems: number, systemResources: number, fimEvents: number, systemAction: number, patchScanning: number, process: number, certificate: number, users: number, systemServices: number, softwareMeter: number } }`
- `PUT /v1/agents/configuration` - Apply configuration to one or more agents
  - Request body: `{ agentIds: string[], allowedBandwidth: number, refreshCycles: { agent: number, endpointVitals: number, sbom: number, network: number, startupItems: number, systemResources: number, fimEvents: number, systemAction: number, patchScanning: number, process: number, certificate: number, users: number, systemServices: number, softwareMeter: number } }`
  - Response: `{ success: boolean, configured: number, failed: number, errors?: string[] }`
- `POST /v1/agents/:id/commands` - Send configuration command to agent (internal)

**UI Components:**
- Page: `/settings/agent-management/agent-details` (AgentDetails.tsx)
- Components:
  - **Agent Details Page:**
    - Agents table with checkboxes for selection
    - "Agent Configuration" tab/button in page header or action bar
    - Agent Configuration button initially disabled
    - Agent Configuration button enabled when agents are selected
    - Selected agents count indicator (optional)
  - **Agent Configuration Modal/Drawer:**
    - Modal/Drawer title: "Agent Configuration" or "Configure Agents"
    - Selected agents count display: "Configuring X agent(s)"
    - Configuration form with sections:
      - **Bandwidth Settings Section:**
        - Label: "Allowed Bandwidth to download Files" (with asterisk *)
        - Input field: Number input (numeric only)
        - Unit label: "KB/sec" (static text)
        - Description text: "Use 0 to disable Bandwidth limit"
        - Default value: 0
      - **Refresh Cycles Section:**
        - Two-column layout (left and right columns)
        - **Left Column:**
          - Agent Refresh Cycle (InputNumber, unit: "Seconds", default: 10)
          - Endpoint Vitals Refresh Cycle (InputNumber, unit: "Seconds", default: 10)
          - SBOM Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
          - Network Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
          - Start-up Items Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
          - System Resources Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
          - FIM Events Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
        - **Right Column:**
          - System Action Refresh Cycle (InputNumber, unit: "Seconds", default: 10)
          - Patch Scanning Refresh Cycle (InputNumber, unit: "Seconds", default: 21600)
          - Process Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
          - Certificate Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
          - Users Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
          - System Services Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
          - Software Meter Refresh Cycle (InputNumber, unit: "Seconds", default: 300)
        - Each field has:
          - Label with asterisk (*) indicating mandatory
          - InputNumber component (numeric input only)
          - Unit label "Seconds" displayed next to input
    - **Action Buttons:**
      - **Apply button (primary):** Applies configuration to selected agents
      - **Reset button (default):** Resets all fields to default values
      - **Cancel button (default):** Closes modal without applying changes
    - **Form States:**
      - Loading state while fetching current configuration
      - Loading state while applying configuration
      - Success message after successful application
      - Error messages for validation failures
      - Partial success message if some agents fail

- User Actions:
  1. Navigate to Settings > Agent Management > Agent Details page
  2. View agents table
  3. Select one or more agents using checkboxes
  4. Verify "Agent Configuration" button becomes enabled after selection
  5. Click "Agent Configuration" button
  6. Verify Agent Configuration modal/drawer opens
  7. Verify modal shows count of selected agents
  8. View all configuration fields:
    - Verify Allowed Bandwidth field is displayed with unit "KB/sec" and description
    - Verify all 14 refresh cycle fields are displayed in two columns
    - Verify all fields show default values
    - Verify all fields are marked as mandatory (asterisk)
  9. Modify Allowed Bandwidth value (e.g., set to 1024)
  10. Modify refresh cycle values (e.g., change Agent Refresh Cycle to 5 seconds)
  11. (Optional) Click Reset button to restore default values
  12. (Optional) Click Cancel button to close without applying
  13. Click Apply button
  14. Verify validation occurs (all fields must be filled and valid)
  15. Verify configuration is applied to all selected agents
  16. Verify success message appears showing count of configured agents
  17. Verify modal closes automatically after success
  18. Verify agents receive and apply configuration updates
  19. Test with single agent selection
  20. Test with multiple agent selection
  21. Test with invalid values (negative numbers, zero for refresh cycles)
  22. Verify appropriate error messages are shown

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have configuration permission)
- Test agent selection:
  - Select single agent
  - Verify Agent Configuration button becomes enabled
  - Select multiple agents
  - Verify Agent Configuration button remains enabled
  - Deselect all agents
  - Verify Agent Configuration button becomes disabled
  - Select/deselect agents while configuration modal is open
- Test Agent Configuration modal:
  - Verify modal opens when button is clicked
  - Verify modal shows correct title
  - Verify modal shows count of selected agents
  - Verify all configuration fields are displayed
  - Verify all fields show default values
  - Verify all fields are marked as mandatory
  - Verify unit labels are displayed correctly
  - Verify description text is shown for bandwidth field
- Test configuration fields:
  - Test Allowed Bandwidth field:
    - Enter valid positive number (e.g., 1024)
    - Enter 0 (should disable bandwidth limit)
    - Enter negative number (should show validation error)
    - Enter non-numeric value (should prevent or show error)
  - Test Refresh Cycle fields:
    - Enter valid positive integers
    - Enter 0 (should show validation error - minimum 1 second)
    - Enter negative numbers (should show validation error)
    - Enter non-numeric values (should prevent or show error)
    - Test all 14 refresh cycle fields individually
- Test form validation:
  - Submit form with all fields filled correctly (should succeed)
  - Submit form with empty bandwidth field (should show error)
  - Submit form with empty refresh cycle field (should show error)
  - Submit form with invalid bandwidth value (should show error)
  - Submit form with invalid refresh cycle value (should show error)
  - Verify validation errors are clear and specific
- Test Apply functionality:
  - Apply configuration to single agent
  - Verify configuration is sent to agent
  - Verify agent acknowledges and applies configuration
  - Apply configuration to multiple agents
  - Verify configuration is sent to all selected agents
  - Verify all agents acknowledge and apply configuration
  - Verify success message shows correct count
  - Test with agents that are disconnected (should handle gracefully)
  - Test with agents that fail to apply configuration (should show partial success)
- Test Reset button:
  - Modify some configuration values
  - Click Reset button
  - Verify all fields are reset to default values
  - Verify modified values are cleared
- Test Cancel button:
  - Modify some configuration values
  - Click Cancel button
  - Verify modal closes without applying changes
  - Verify no configuration changes are sent to agents
- Test configuration application:
  - Verify configuration commands are sent to agents
  - Verify agents receive configuration updates
  - Verify agents apply configuration immediately
  - Verify configuration persists after agent restart
  - Test with different configuration values
  - Verify bandwidth limit is enforced when set
  - Verify bandwidth limit is disabled when set to 0
  - Verify refresh cycles are applied correctly
  - Verify agents refresh at configured intervals
- Test error handling:
  - Test with network errors during configuration application
  - Test with server errors
  - Test with invalid agent IDs
  - Test with disconnected agents
  - Test with agents that reject configuration
  - Verify appropriate error messages are shown
  - Verify partial success is handled correctly
- Test edge cases:
  - Test with maximum number of agents selected
  - Test with agents from different organizations (if multi-tenant)
  - Test with agents with different existing configurations
  - Test with very large refresh cycle values
  - Test with very small refresh cycle values (minimum 1 second)
  - Test with very large bandwidth values
  - Test with bandwidth set to 0 (disabled)
- Test UI responsiveness:
  - Test modal on different screen sizes
  - Verify two-column layout works on desktop
  - Verify layout adapts on smaller screens
  - Test on different browsers
- Test permissions:
  - Test with view-only permission (verify configuration is disabled or hidden)
  - Test with configuration permission (verify configuration is available)
  - Test with full permission (verify all actions are available)
- Test audit logging:
  - Verify audit log entry is created for configuration changes
  - Verify audit log includes agent IDs, configuration values, and user information
- Test real-time updates:
  - Verify agents apply configuration immediately after receiving command
  - Verify configuration changes are reflected in agent behavior
  - Verify refresh cycles are updated and working correctly
  - Verify bandwidth limits are enforced correctly

---

### User Story 2: Host Key

**Story ID:** `US-022`  
**Title:** Create Host Key for Agent Deployment  
**Priority:** P0 (Critical)  
**Module:** Agents - Host Key Management

**User Story:**
```
As a system administrator
I want to create a host key with a name, organization, and optional branch
So that I can generate unique host keys for agent deployment and associate them with specific organizational units
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Settings > Agent Management > Host Key page
- [ ] AC2: Host Key page displays list of existing host keys (if any) in a table
- [ ] AC3: "Create Key" button is visible on the Host Key page
- [ ] AC4: Clicking "Create Key" button opens a form modal/drawer
- [ ] AC5: Form modal displays title "Create Host Key" or "New Host Key"
- [ ] AC6: Form displays the following fields:
  - **Name:** Text input field (mandatory, marked with asterisk *)
  - **Organization:** Dropdown/Select field (mandatory, marked with asterisk *)
  - **Branch:** Dropdown/Select field (optional, not marked with asterisk)
- [ ] AC7: Name field accepts alphanumeric characters and common special characters (1-100 characters)
- [ ] AC8: Name field is mandatory and cannot be empty
- [ ] AC9: System validates that name is not empty before submission
- [ ] AC10: Organization dropdown shows all available organizations
- [ ] AC11: Organization dropdown has placeholder text "Select Organization" or similar
- [ ] AC12: Organization field is mandatory and must be selected before submission
- [ ] AC13: System validates that selected organization exists in the system
- [ ] AC14: Branch dropdown is initially disabled or empty until an organization is selected
- [ ] AC15: Branch dropdown becomes enabled when organization is selected
- [ ] AC16: Branch dropdown populates with branches belonging to the selected organization
- [ ] AC17: Branch dropdown shows only branches from the selected organization
- [ ] AC18: Branch dropdown has placeholder text "Select Branch (Optional)" or "All Branches" or similar
- [ ] AC19: Branch field is optional and can be left unselected
- [ ] AC20: If organization selection changes, branch dropdown is cleared and repopulated with branches from the new organization
- [ ] AC21: System validates that selected branch exists and belongs to the selected organization (if branch is selected)
- [ ] AC22: Create button is available in the form
- [ ] AC23: Create button is enabled only when Name and Organization fields are filled
- [ ] AC24: Create button is disabled if Name is empty
- [ ] AC25: Create button is disabled if Organization is not selected
- [ ] AC26: Reset button is available in the form
- [ ] AC27: Clicking Reset button clears all fields (Name, Organization, Branch)
- [ ] AC28: Reset button resets Organization selection, which also clears Branch dropdown
- [ ] AC29: Cancel button is available in the form
- [ ] AC30: Clicking Cancel button closes the form without creating host key
- [ ] AC31: System validates all required fields before submission
- [ ] AC32: Upon successful validation, system generates a unique host key
- [ ] AC33: Host key is a unique identifier/key string (e.g., UUID, alphanumeric string)
- [ ] AC34: Host key is associated with the selected organization
- [ ] AC35: Host key is associated with the selected branch (if branch is selected)
- [ ] AC36: If no branch is selected, host key applies to all branches within the organization
- [ ] AC37: System creates host key record with name, organization, branch (if selected), and generated key
- [ ] AC38: System creates an audit log entry for host key creation action
- [ ] AC39: Success message is displayed after host key is created successfully
- [ ] AC40: Success message shows the created host key name and generated key value
- [ ] AC41: Form closes automatically after successful creation (or remains open for creating another key)
- [ ] AC42: Host key list is refreshed to show newly created host key
- [ ] AC43: Created host key can be immediately used for agent deployment
- [ ] AC44: Created host key is displayed in the host keys table/list
- [ ] AC45: System returns appropriate error messages for validation failures (missing name, missing organization, invalid organization, etc.)
- [ ] AC46: System prevents creating host key with duplicate name (if name uniqueness is required)
- [ ] AC47: Host key value is displayed in a secure/copyable format (may be masked with copy button)
- [ ] AC48: User can copy host key value to clipboard after creation
- [ ] AC49: Host key is stored securely in the database
- [ ] AC50: Host key can be used during agent installation to associate agent with organization and branch

**Test Data:**
```json
{
  "validHostKeyComplete": {
    "name": "Production Host Key",
    "organizationId": "org-uuid-here",
    "branchId": "branch-uuid-here"
  },
  "validHostKeyMinimal": {
    "name": "Development Key",
    "organizationId": "org-uuid-here"
  },
  "validHostKeyNoBranch": {
    "name": "Organization-Wide Key",
    "organizationId": "org-uuid-here",
    "branchId": null
  },
  "missingName": {
    "organizationId": "org-uuid-here"
  },
  "missingOrganization": {
    "name": "Test Key"
  },
  "invalidOrganization": {
    "name": "Test Key",
    "organizationId": "invalid-uuid"
  },
  "invalidBranch": {
    "name": "Test Key",
    "organizationId": "org-uuid-here",
    "branchId": "branch-from-different-org-uuid"
  },
  "duplicateName": {
    "name": "Existing Key Name",
    "organizationId": "org-uuid-here"
  }
}
```

**API Endpoints:**
- `GET /v1/agents/host-keys` - List all host keys
  - Response: `{ hostKeys: HostKey[], total: number }`
- `POST /v1/agents/host-keys` - Create a new host key
  - Request body: `{ name: string, organizationId: string, branchId?: string }`
  - Response: `{ id: string, name: string, organizationId: string, branchId?: string, key: string, createdAt: string }`
- `GET /v1/organizations` - List organizations (for dropdown)
  - Response: `{ organizations: Organization[] }`
- `GET /v1/settings/branches?organizationId=:id` - List branches for organization (for dropdown)
  - Response: `{ branches: Branch[] }`
- `GET /v1/agents/host-keys/:id` - Get host key details by ID
  - Response: `HostKey` object with full details including key value

**UI Components:**
- Page: `/settings/agent-management/host-keys` (HostKeys.tsx)
- Components:
  - **Host Keys Page:**
    - Page title: "Host Keys" or "Host Key Management"
    - "Create Key" button (PlusOutlined icon) in page header
    - Host keys table/list (if keys exist):
      - Columns: Name, Organization, Branch, Key (masked), Created At, Actions
      - Search functionality (optional)
      - Pagination (if many keys)
    - Empty state message when no host keys exist
  - **Create Host Key Form Modal/Drawer:**
    - Modal/Drawer title: "Create Host Key" or "New Host Key"
    - Form fields:
      - **Name:** Text input (required, marked with asterisk *)
        - Placeholder: "Enter host key name"
        - Max length: 100 characters
        - Validation: Required, 1-100 characters
      - **Organization:** Dropdown/Select (required, marked with asterisk *)
        - Placeholder: "Select Organization"
        - Options: All available organizations
        - Initially empty/disabled
        - When selected, enables Branch dropdown
      - **Branch:** Dropdown/Select (optional, not marked with asterisk)
        - Placeholder: "Select Branch (Optional)" or "All Branches"
        - Initially disabled/empty
        - Enabled when organization is selected
        - Options: Branches from selected organization
        - Cleared when organization changes
    - **Action Buttons:**
      - **Create button (primary):** Creates host key (enabled when Name and Organization are filled)
      - **Reset button (default):** Clears all form fields
      - **Cancel button (default):** Closes form without creating
    - **Form States:**
      - Loading state while fetching organizations/branches
      - Loading state while creating host key
      - Success message after creation
      - Error messages for validation failures
  - **Host Key Display (after creation):**
    - Success message with host key name
    - Host key value displayed (may be masked with copy button)
    - Copy button (CopyOutlined icon) to copy key to clipboard
    - "Close" or "Create Another" button

- User Actions:
  1. Navigate to Settings > Agent Management > Host Key page
  2. View Host Keys page (may show existing keys or empty state)
  3. Click "Create Key" button
  4. Verify Create Host Key form modal/drawer opens
  5. Verify form displays Name, Organization, and Branch fields
  6. Enter Name in Name field (required)
  7. Select Organization from Organization dropdown (required)
  8. Verify Branch dropdown becomes enabled after organization selection
  9. Verify Branch dropdown populates with branches from selected organization
  10. (Optional) Select Branch from Branch dropdown
  11. Verify Create button is enabled when Name and Organization are filled
  12. (Optional) Click Reset button to clear all fields
  13. (Optional) Click Cancel button to close without creating
  14. Click Create button
  15. Verify validation occurs (Name and Organization are required)
  16. Verify host key is created successfully
  17. Verify success message appears
  18. Verify host key value is displayed (may be masked)
  19. Copy host key value to clipboard (if copy button available)
  20. Verify host key appears in host keys list/table
  21. Test with branch selected
  22. Test without branch selected (applies to all branches)
  23. Test validation errors (missing name, missing organization)

**Test Notes:**
- Test with admin role (should have full access)
- Test with regular user role (should have view access, may not have create permission)
- Test navigation:
  - Navigate to Settings > Agent Management > Host Key page
  - Verify page title is correct
  - Verify "Create Key" button is visible
- Test Create Key button:
  - Click "Create Key" button
  - Verify form modal/drawer opens
  - Verify form title is correct
  - Verify all form fields are displayed
- Test Name field:
  - Enter valid name (1-100 characters)
  - Enter empty name (should show validation error)
  - Enter name longer than 100 characters (should be prevented or show error)
  - Enter name with special characters (if allowed)
  - Verify name is required (marked with asterisk)
- Test Organization field:
  - Verify organization dropdown shows all available organizations
  - Select organization from dropdown
  - Verify organization is required (marked with asterisk)
  - Verify branch dropdown becomes enabled after selection
  - Change organization selection
  - Verify branch dropdown is cleared and repopulated
  - Test with no organizations available (should show message)
- Test Branch field:
  - Verify branch dropdown is initially disabled
  - Select organization
  - Verify branch dropdown becomes enabled
  - Verify branch dropdown shows branches from selected organization
  - Select branch from dropdown
  - Change organization
  - Verify branch dropdown is cleared and repopulated
  - Leave branch unselected (should be allowed - optional field)
  - Test with organization that has no branches (should show empty dropdown or message)
- Test form validation:
  - Submit form with all fields filled correctly (should succeed)
  - Submit form without name (should show validation error)
  - Submit form without organization (should show validation error)
  - Submit form with name and organization only (should succeed - branch is optional)
  - Submit form with name, organization, and branch (should succeed)
  - Verify validation errors are clear and specific
- Test Create button:
  - Verify Create button is disabled when name is empty
  - Verify Create button is disabled when organization is not selected
  - Verify Create button is enabled when name and organization are filled
  - Verify Create button works with branch selected
  - Verify Create button works without branch selected
- Test Reset button:
  - Fill in all fields
  - Click Reset button
  - Verify all fields are cleared
  - Verify organization selection is cleared
  - Verify branch dropdown is disabled/cleared
- Test Cancel button:
  - Fill in some fields
  - Click Cancel button
  - Verify form closes without creating host key
  - Verify no host key is created
- Test host key creation:
  - Create host key with name and organization only
  - Verify host key is created successfully
  - Verify host key value is generated
  - Verify host key is associated with organization
  - Verify host key applies to all branches (when branch not selected)
  - Create host key with name, organization, and branch
  - Verify host key is created successfully
  - Verify host key is associated with organization and branch
  - Verify host key applies only to selected branch
- Test host key value:
  - Verify host key value is unique
  - Verify host key value is displayed after creation
  - Verify host key value can be copied to clipboard
  - Verify host key value is stored securely
  - Test with multiple host keys (verify all are unique)
- Test host key list/table:
  - Verify created host key appears in list/table
  - Verify host key information is displayed correctly (name, organization, branch)
  - Verify host key value is masked or displayed securely
  - Test with multiple host keys
- Test error handling:
  - Test with network errors during creation
  - Test with server errors
  - Test with invalid organization ID
  - Test with invalid branch ID (branch from different organization)
  - Test with duplicate name (if uniqueness is required)
  - Verify appropriate error messages are shown
  - Verify error states are handled gracefully
- Test edge cases:
  - Test with organization that has many branches
  - Test with organization that has no branches
  - Test with very long name (100 characters)
  - Test with very short name (1 character)
  - Test with special characters in name (if allowed)
  - Test creating multiple host keys for same organization
  - Test creating host keys for different organizations
- Test permissions:
  - Test with view-only permission (verify create is disabled or hidden)
  - Test with create permission (verify create is available)
  - Test with full permission (verify all actions are available)
- Test audit logging:
  - Verify audit log entry is created for host key creation
  - Verify audit log includes host key name, organization, branch, and user information
- Test host key usage:
  - Verify created host key can be used for agent deployment
  - Verify host key associates agent with correct organization
  - Verify host key associates agent with correct branch (if branch was selected)
  - Verify host key applies to all branches when no branch was selected
- Test UI responsiveness:
  - Test form on different screen sizes
  - Verify modal/drawer is responsive
  - Test on different browsers

---

### User Story 3: Host Key Page Functions

**Story ID:** `US-023`  
**Title:** View and Manage Host Keys in Table View  
**Priority:** P0 (Critical)  
**Module:** Agents - Host Key Management

**User Story:**
```
As a system administrator
I want to view, search, filter, and manage host keys in a table view
So that I can efficiently browse, find, and perform actions on host keys
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Settings > Agent Management > Host Key page
- [ ] AC2: User can see a table listing all host keys with the following columns:
  - ID (sortable, searchable)
  - Name (sortable, searchable)
  - Organization (filterable, searchable)
  - Branch (filterable, searchable, shows "All Branches" if no branch selected)
  - Host Key (masked/partially displayed, copyable)
  - Created At (sortable, formatted date/time)
  - Actions (View, Edit, Delete)
- [ ] AC3: User can search host keys by ID, name, organization name, branch name, or host key value using a search input field
- [ ] AC4: User can filter host keys by:
  - Organization (via Organization column filter dropdown)
  - Branch (via Branch column filter dropdown, with "All Branches" option)
- [ ] AC5: User can sort host keys by:
  - ID (ascending/descending, numeric)
  - Name (ascending/descending, alphabetical)
  - Organization (ascending/descending, alphabetical)
  - Created At (newest/oldest first, date)
- [ ] AC6: User can paginate through host keys using table pagination controls
- [ ] AC7: User can view host key details by clicking "View" action button, which opens a Host Key Details modal/drawer showing:
  - Host Key Name
  - Organization name
  - Branch name (or "All Branches" if no branch)
  - Full Host Key value (masked with copy button)
  - Created At timestamp
  - Last Used timestamp (if applicable)
  - Usage count (number of agents using this host key)
  - Associated agents list (if applicable)
- [ ] AC8: User can edit host key details by clicking "Edit" action button, which opens an Edit Host Key modal with pre-filled data:
  - Name field (editable)
  - Organization dropdown (editable, may be restricted)
  - Branch dropdown (editable, filtered by organization)
  - Update and Cancel buttons
- [ ] AC9: User can delete a host key by clicking "Delete" action button, which shows a confirmation dialog before deletion
- [ ] AC10: Delete button is disabled for host keys that are in use by agents (with tooltip explaining why)
- [ ] AC11: System prevents deleting host keys that are assigned to agents (returns 400 Bad Request error)
- [ ] AC12: Host Key column displays masked/partially displayed key value (e.g., "****-****-****-ABCD" or first/last few characters)
- [ ] AC13: Host Key column has copy icon/button to copy full key value to clipboard
- [ ] AC14: Branch column shows branch name if host key is associated with a branch, or "All Branches" if no branch is selected
- [ ] AC15: User can use column visibility toggle to show/hide columns (if column filter feature is enabled)
- [ ] AC16: Table displays empty state message when no host keys are found or created
- [ ] AC17: Table shows loading state while fetching host key data
- [ ] AC18: "Create Key" button is visible in page header and opens create host key form
- [ ] AC19: Refresh/Reload button reloads host key list from server
- [ ] AC20: Table supports export functionality (Export button) to export host key list as CSV/Excel (if applicable)
- [ ] AC21: Exported CSV includes all visible columns (host key value may be masked or excluded for security)
- [ ] AC22: Table shows "No results found" message when search/filter returns no matches
- [ ] AC23: Created At column displays formatted date and time
- [ ] AC24: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC25: Host key values are never displayed in full in table or exported data (for security)
- [ ] AC26: Full host key value is only shown in View modal/drawer with appropriate security measures
- [ ] AC27: Page respects user permissions - users with view-only permission cannot edit or delete host keys

**Test Data:**
```json
{
  "hostKeys": [
    {
      "id": "hostkey-001",
      "name": "Production Host Key",
      "organizationId": "org-001",
      "organizationName": "Production Organization",
      "branchId": "branch-001",
      "branchName": "Main Branch",
      "key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "keyMasked": "a1b2****-****-****-****-ef1234567890",
      "createdAt": "2024-01-10T08:00:00Z",
      "lastUsed": "2024-01-15T10:30:00Z",
      "usageCount": 5,
      "inUse": true
    },
    {
      "id": "hostkey-002",
      "name": "Development Key",
      "organizationId": "org-002",
      "organizationName": "Development Organization",
      "branchId": null,
      "branchName": null,
      "key": "x9y8z7w6-v5u4-3210-t987-s65432109876",
      "keyMasked": "x9y8****-****-****-****-s65432109876",
      "createdAt": "2024-01-08T12:00:00Z",
      "lastUsed": null,
      "usageCount": 0,
      "inUse": false
    },
    {
      "id": "hostkey-003",
      "name": "Test Environment Key",
      "organizationId": "org-001",
      "organizationName": "Production Organization",
      "branchId": "branch-002",
      "branchName": "Test Branch",
      "key": "m5n6o7p8-q9r0-1234-stuv-wxyz98765432",
      "keyMasked": "m5n6****-****-****-****-wxyz98765432",
      "createdAt": "2024-01-12T14:00:00Z",
      "lastUsed": "2024-01-14T09:15:00Z",
      "usageCount": 2,
      "inUse": true
    }
  ],
  "filters": {
    "organizations": ["org-001", "org-002"],
    "branches": ["branch-001", "branch-002", "All Branches"]
  }
}
```

**API Endpoints:**
- `GET /v1/agents/host-keys` - List all host keys (supports query parameters: `page`, `limit`, `search`, `organizationId`, `branchId`, `sortBy`, `sortOrder`)
  - Response: `{ hostKeys: HostKey[], total: number, page: number, limit: number }`
- `GET /v1/agents/host-keys/:id` - Get host key details by ID
  - Response: `HostKey` object with full details including unmasked key value
- `PUT /v1/agents/host-keys/:id` - Update host key details
  - Request body: `{ name?: string, organizationId?: string, branchId?: string | null }`
  - Response: `{ success: boolean, hostKey: HostKey }`
- `DELETE /v1/agents/host-keys/:id` - Delete a host key
  - Response: `{ success: boolean, message: string }`
- `GET /v1/agents/host-keys/:id/usage` - Get host key usage information (agents using this key)
  - Response: `{ usageCount: number, agents: Agent[] }`
- `POST /v1/agents/host-keys/export` - Export host keys list (if applicable)
  - Request body: `{ filters?: object, format: 'csv' | 'excel' }`
- `GET /v1/organizations` - List organizations (for filters)
- `GET /v1/settings/branches` - List branches (for filters)

**UI Components:**
- Page: `/settings/agent-management/host-keys` (HostKeys.tsx)
- Components:
  - **Host Keys Page:**
    - Page title: "Host Keys" or "Host Key Management"
    - Search input field (SearchOutlined icon) in page header
    - "Create Key" button (PlusOutlined icon) in page header
    - Refresh button (ReloadOutlined icon) in page header
    - Export button (DownloadOutlined icon) in page header (if applicable)
    - Column filter/visibility toggle button (FilterOutlined icon) in page header (if applicable)
    - Host keys table with columns:
      - **ID:** Text (sortable, searchable)
      - **Name:** Text (sortable, searchable)
      - **Organization:** Text (filterable, searchable)
      - **Branch:** Text (filterable, searchable, shows "All Branches" if null)
      - **Host Key:** Text with copy icon (masked/partially displayed, copyable)
      - **Created At:** Text (formatted date/time, sortable)
      - **Actions:** Dropdown menu (MoreOutlined icon) with options:
        - View (opens details modal)
        - Edit (opens edit modal)
        - Delete (shows confirmation dialog)
    - Table pagination controls at bottom
    - Empty state component when no host keys found
    - Loading spinner while fetching data
  - **Host Key Details Modal/Drawer:** (HostKeyDetailsDrawer.tsx)
    - Modal/Drawer title: Host Key Name
    - Details sections:
      - **Basic Information:**
        - Name: Text
        - Organization: Text
        - Branch: Text (or "All Branches" if null)
        - Created At: Text (formatted date/time)
        - Last Used: Text (formatted date/time or "Never")
      - **Host Key Value:**
        - Full key value displayed (may be masked with reveal button)
        - Copy button (CopyOutlined icon) to copy key to clipboard
        - Warning message about key security
      - **Usage Information:**
        - Usage Count: Number (number of agents using this key)
        - Associated Agents: List/table of agents using this key (if applicable)
    - Close button (X icon) in modal header
  - **Edit Host Key Modal:** (EditHostKeyModal.tsx)
    - Modal title: "Edit Host Key"
    - Form fields:
      - Name: Text input (editable)
      - Organization: Dropdown/Select (editable, may be restricted)
      - Branch: Dropdown/Select (editable, filtered by organization, with "All Branches" option)
    - Action buttons:
      - Update button (primary)
      - Cancel button (default)
    - Form validation
  - **Delete Confirmation Dialog:**
    - Message: "Are you sure you want to delete this host key?"
    - Warning about consequences (agents using this key will be affected)
    - Warning if host key is in use (delete disabled)
    - Confirm and Cancel buttons

- User Actions:
  1. Navigate to Settings > Agent Management > Host Key page
  2. View table of all host keys
  3. Use search input to search host keys by ID, name, organization, branch, or key value
  4. Filter host keys by Organization using Organization column filter dropdown
  5. Filter host keys by Branch using Branch column filter dropdown
  6. Sort host keys by ID (click column header)
  7. Sort host keys by Name (click column header)
  8. Sort host keys by Organization (click column header)
  9. Sort host keys by Created At (click column header)
  10. Use pagination controls to navigate through pages
  11. Toggle column visibility using column filter button (if available)
  12. Click Refresh button to reload host key list
  13. Click Export button to export host key list (if available)
  14. Click "View" action button for a host key:
    - Verify Host Key Details modal/drawer opens
    - View all host key information
    - View full host key value (may need to reveal)
    - Copy host key value to clipboard
    - View usage information and associated agents
    - Close modal by clicking X button or outside modal
  15. Click "Edit" action button for a host key:
    - Verify Edit modal opens
    - Modify host key details (name, organization, branch)
    - Click Update to save changes
    - Click Cancel to close without saving
    - Verify host key is updated in table
  16. Click "Delete" action button for a host key:
    - Verify confirmation dialog appears
    - Verify delete is disabled if host key is in use
    - Click Confirm to delete (if not in use)
    - Click Cancel to close dialog without deleting
    - Verify host key is removed from table after deletion
  17. Copy host key value using copy icon in Host Key column
  18. Verify host key values are masked in table
  19. Verify empty state is shown when no host keys found
  20. Verify loading state is shown while fetching data

**Test Notes:**
- Test with admin role (should have full access: view, edit, delete)
- Test with regular user role (should have view access, may not have edit/delete permissions)
- Test host key table display:
  - Verify all columns are displayed correctly
  - Verify host key information is accurate
  - Verify host key values are masked/partially displayed
  - Verify Branch column shows "All Branches" when branch is null
  - Verify Created At shows formatted date/time
- Test search functionality:
  - Search by host key ID
  - Search by host key name
  - Search by organization name
  - Search by branch name
  - Search by host key value (partial match)
  - Verify search is case-insensitive
  - Verify search filters results correctly
  - Verify empty results show "No results found" message
- Test filter functionality:
  - Filter by Organization
  - Filter by Branch (including "All Branches" option)
  - Apply multiple filters simultaneously
  - Clear filters individually
  - Clear all filters
  - Verify filtered results are correct
- Test sort functionality:
  - Sort by ID (ascending/descending)
  - Sort by Name (ascending/descending)
  - Sort by Organization (ascending/descending)
  - Sort by Created At (newest/oldest first)
  - Verify sort order is correct
  - Verify sort indicators show current sort direction
- Test pagination:
  - Navigate to next page
  - Navigate to previous page
  - Jump to specific page
  - Change page size (if applicable)
  - Verify pagination controls are correct
  - Verify total count is accurate
- Test Host Key Details modal:
  - Open modal by clicking "View" action
  - Verify modal opens and shows host key details
  - Verify all information is displayed correctly
  - Verify full host key value is shown (may be masked with reveal)
  - Copy host key value to clipboard
  - Verify usage information is displayed
  - Verify associated agents are listed (if applicable)
  - Close modal by clicking X button or outside modal
- Test Edit Host Key functionality:
  - Click "Edit" action button
  - Verify Edit modal opens with pre-filled data
  - Modify host key name
  - Modify organization (if allowed)
  - Modify branch selection
  - Click Update to save changes
  - Verify host key is updated in table
  - Click Cancel to close without saving
  - Verify host key remains unchanged
- Test Delete Host Key functionality:
  - Click "Delete" action button
  - Verify confirmation dialog appears
  - Verify delete is disabled if host key is in use
  - Verify tooltip explains why delete is disabled
  - Click Confirm to delete (if not in use)
  - Verify host key is removed from table
  - Verify success message appears
  - Click Cancel to close dialog without deleting
  - Verify host key remains in table
- Test host key security:
  - Verify host key values are masked in table
  - Verify full key value is only shown in View modal
  - Verify exported CSV does not include full key values (or masks them)
  - Verify copy functionality works correctly
  - Test with different masking formats
- Test host key usage:
  - Verify usage count is displayed correctly
  - Verify associated agents are listed (if applicable)
  - Verify delete is disabled for host keys in use
  - Test with host keys that have no usage
  - Test with host keys that have multiple agents
- Test error handling:
  - Test with network errors
  - Test with server errors
  - Test with invalid host key ID
  - Verify appropriate error messages are shown
  - Verify error states are handled gracefully
- Test edge cases:
  - Test with no host keys created (empty state)
  - Test with host keys from different organizations
  - Test with host keys with and without branches
  - Test with host keys that are in use
  - Test with host keys that are not in use
  - Test with many host keys (verify pagination)
- Test permissions:
  - Test with view-only permission (verify edit/delete are disabled or hidden)
  - Test with edit permission (verify edit is available, delete may be restricted)
  - Test with full permission (verify all actions are available)
- Test UI responsiveness:
  - Test table on different screen sizes
  - Test modal/drawer on different screen sizes
  - Verify table is scrollable on small screens
  - Verify modal/drawer is responsive
  - Test on different browsers
- Test export functionality (if applicable):
  - Click Export button
  - Select export format (CSV/Excel)
  - Verify exported file contains correct data
  - Verify exported file includes all columns
  - Verify exported file respects current filters
  - Verify host key values are masked or excluded in export
- Test real-time updates:
  - Create new host key (verify appears in table)
  - Edit host key (verify updates in table)
  - Delete host key (verify removed from table)
  - Verify table refreshes automatically or manually

---

### User Story 4: Asset Page Functions

**Story ID:** `US-024`  
**Title:** View and Manage Assets in Table View  
**Priority:** P0 (Critical)  
**Module:** Assets - Asset Management

**User Story:**
```
As a system administrator
I want to view, search, filter, and manage assets in a table view
So that I can efficiently browse, find, and perform actions on assets
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Assets > All Assets page (Assets menu has 3 pages: All Assets, Software Inventory, License Inventory)
- [ ] AC2: User can see a table listing all assets with the following columns (configurable visibility):
  - Asset ID (sortable, searchable, pinned option)
  - Asset Name (sortable, searchable)
  - Category (filterable, searchable)
  - Operational Status (filterable, color-coded badges)
  - Status (filterable, color-coded badges)
  - Op. Status Since (sortable, formatted date/time)
  - Op. Status Duration (sortable, relative time)
  - Actions (View, Edit, Delete)
- [ ] AC3: User can search assets by Asset ID, Asset Name, Category, Hostname, IP Address, Serial Number, or other asset properties using a search input field
- [ ] AC4: User can filter assets by:
  - Category (via Category column filter dropdown)
  - Operational Status (via Operational Status column filter dropdown)
  - Status (via Status column filter dropdown)
  - Organization (if multi-tenant, via Organization filter dropdown)
  - Branch Location (via Branch Location filter dropdown)
- [ ] AC5: User can sort assets by:
  - Asset ID (ascending/descending)
  - Asset Name (ascending/descending, alphabetical)
  - Category (ascending/descending, alphabetical)
  - Operational Status (ascending/descending)
  - Status (ascending/descending)
  - Op. Status Since (newest/oldest first, date)
  - Op. Status Duration (ascending/descending)
- [ ] AC6: User can paginate through assets using table pagination controls
- [ ] AC7: User can select multiple assets using checkboxes for bulk operations
- [ ] AC8: User can view asset details by clicking on asset row or "View" action button, which navigates to asset details page
- [ ] AC9: Asset details page displays comprehensive asset information with multiple tabs:
  - Details tab: Basic asset information, status, performance
  - Lifecycle tab: Asset lifecycle history
  - Hardware tab: Hardware details and specifications
  - Software tab: Installed software list
  - Patches tab: Patches for asset
  - Vulnerabilities tab: Vulnerabilities detected on the asset
  - Security tab: Security compliance data
  - Network tab: Network configuration
  - Telemetry tab: Current and historical telemetry data
  - Audit Log tab: Audit log entries
- [ ] AC10: User can edit asset details by clicking "Edit" action button, which navigates to asset edit page or opens edit modal
- [ ] AC11: User can delete an asset by clicking "Delete" action button, which shows a confirmation dialog before deletion
- [ ] AC12: User can perform bulk delete on selected assets using bulk action menu
- [ ] AC13: Bulk delete shows confirmation dialog with count of selected assets
- [ ] AC14: Operational Status column displays color-coded badges (e.g., Online=green, Offline=red, Maintenance=yellow, Unknown=gray)
- [ ] AC15: Status column displays color-coded badges (e.g., Active=green, Inactive=gray, Retired=red)
- [ ] AC16: Op. Status Since column displays formatted date and time when operational status last changed
- [ ] AC17: Op. Status Duration column displays relative time (e.g., "2 days", "1 hour", "30 minutes")
- [ ] AC18: User can use column visibility toggle to show/hide columns
- [ ] AC19: Column visibility preferences are saved and persist across sessions
- [ ] AC20: User can pin/unpin columns (e.g., Asset ID can be pinned to left)
- [ ] AC21: Table displays empty state message when no assets are found or registered
- [ ] AC22: Table shows loading state while fetching asset data
- [ ] AC23: Table shows "No results found" message when search/filter returns no matches
- [ ] AC24: Refresh/Reload button reloads asset list from server
- [ ] AC25: Table supports export functionality (Export button) to export asset list as CSV/Excel
- [ ] AC26: Exported CSV includes all visible columns and filtered/search results
- [ ] AC27: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC28: Page respects user permissions - users with view-only permission cannot edit or delete assets
- [ ] AC29: Bulk operations respect user permissions
- [ ] AC30: Asset table updates in real-time or refreshes periodically to show status changes
- [ ] AC31: Action dropdown button is visible in page header with three options: Add Asset, Bulk Add, Deploy Agent
- [ ] AC32: "Add Asset" option in action dropdown opens a popup/modal form to add a new asset
- [ ] AC33: "Bulk Add" option in action dropdown opens a popup/modal for CSV file upload to add multiple assets
- [ ] AC34: Bulk Add popup displays file upload field, "Download Sample CSV" button, and instructions on how to fill the CSV data
- [ ] AC35: User can download sample CSV file from Bulk Add popup
- [ ] AC36: User can view instructions on how to fill CSV data in Bulk Add popup
- [ ] AC37: "Deploy Agent" option in action dropdown is initially disabled
- [ ] AC38: "Deploy Agent" option becomes enabled when one or more assets are selected
- [ ] AC39: Clicking "Deploy Agent" opens a popup/modal form for agent deployment
- [ ] AC40: Deploy Agent popup displays count of selected assets (e.g., "Deploying agent to 3 assets")
- [ ] AC41: Deploy Agent form includes the following fields:
  - Organization dropdown (mandatory, marked with asterisk *)
  - Branch dropdown (optional, filtered by organization)
  - Department dropdown (optional, filtered by branch)
  - OS Type dropdown (mandatory, marked with asterisk *, options: Windows, MacOS, Linux)
  - Processor Type dropdown (mandatory, marked with asterisk *, options: x64, x86, arm64, universal)
- [ ] AC42: Deploy Agent form has three buttons: Deploy (primary), Cancel (default), Reset (default)
- [ ] AC43: Deploy button is enabled only when Organization, OS Type, and Processor Type are filled
- [ ] AC44: System validates all mandatory fields before deploying agent
- [ ] AC45: Upon successful deployment, agent deployment process is initiated for all selected assets

**Test Data:**
```json
{
  "assets": [
    {
      "id": "asset-001",
      "assetId": "AST-001",
      "name": "Windows Server 01",
      "category": "Server",
      "operationalStatus": "Online",
      "status": "Active",
      "operationalStatusSince": "2024-01-15T10:30:00Z",
      "operationalStatusDuration": "2 days",
      "assetType": "Server",
      "hostname": "win-server-01",
      "osType": "Windows",
      "osVersion": "Windows Server 2022",
      "ipAddress": "192.168.1.100",
      "serialNumber": "SN123456789",
      "manufacturer": "Dell",
      "model": "PowerEdge R740",
      "branchLocation": "Main Branch",
      "organizationId": "org-001"
    },
    {
      "id": "asset-002",
      "assetId": "AST-002",
      "name": "Linux Workstation 01",
      "category": "Workstation",
      "operationalStatus": "Offline",
      "status": "Active",
      "operationalStatusSince": "2024-01-14T08:00:00Z",
      "operationalStatusDuration": "1 day",
      "assetType": "Workstation",
      "hostname": "linux-ws-01",
      "osType": "Linux",
      "osVersion": "Ubuntu 22.04",
      "ipAddress": "192.168.1.101",
      "serialNumber": "SN987654321",
      "manufacturer": "HP",
      "model": "EliteDesk 800",
      "branchLocation": "Branch Office",
      "organizationId": "org-001"
    },
    {
      "id": "asset-003",
      "assetId": "AST-003",
      "name": "MacBook Pro 01",
      "category": "Laptop",
      "operationalStatus": "Online",
      "status": "Active",
      "operationalStatusSince": "2024-01-15T09:15:00Z",
      "operationalStatusDuration": "3 hours",
      "assetType": "Laptop",
      "hostname": "macbook-pro-01",
      "osType": "MacOS",
      "osVersion": "macOS 14.0",
      "ipAddress": "192.168.1.102",
      "serialNumber": "C02XK0ABCDEF",
      "manufacturer": "Apple",
      "model": "MacBook Pro 16-inch",
      "branchLocation": "Main Branch",
      "organizationId": "org-001"
    }
  ],
  "filters": {
    "categories": ["Server", "Workstation", "Laptop", "Network Device"],
    "operationalStatus": ["Online", "Offline", "Maintenance", "Unknown"],
    "status": ["Active", "Inactive", "Retired"],
    "organizations": ["org-001", "org-002"],
    "branchLocations": ["Main Branch", "Branch Office"]
  }
}
```

**API Endpoints:**
- `GET /v1/assets` - List all assets (supports query parameters: `page`, `limit`, `search`, `category`, `operationalStatus`, `status`, `organizationId`, `branchLocation`, `sortBy`, `sortOrder`)
  - Response: `{ assets: Asset[], total: number, page: number, limit: number }`
- `GET /v1/assets/:id` - Get asset details by ID
  - Response: `Asset` object with full details
- `GET /v1/assets/:id/full` - Get complete asset with all tab data
  - Response: `Asset` object with all related data (lifecycle, hardware, software, patches, vulnerabilities, etc.)
- `GET /v1/assets/:id/vulnerabilities` - Get vulnerabilities for asset
  - Response: `{ vulnerabilities: Vulnerability[], total: number }`
- `PUT /v1/assets/:id` - Update asset details
  - Request body: `{ name?: string, category?: string, status?: string, ... }`
  - Response: `{ success: boolean, asset: Asset }`
- `DELETE /v1/assets/:id` - Delete an asset
  - Response: `{ success: boolean, message: string }`
- `POST /v1/assets` - Create a new asset
  - Request body: `{ name: string, assetId?: string, category?: string, ... }` (asset creation fields)
  - Response: `{ success: boolean, asset: Asset }`
- `POST /v1/assets/bulk` - Bulk operations (delete, upload)
  - Request body (delete): `{ action: 'delete', assetIds: string[] }`
  - Request body (upload): `{ action: 'upload', file: File }` (multipart/form-data)
  - Response: `{ success: boolean, created?: number, deleted?: number, failed: number, errors?: string[] }`
- `POST /v1/assets/upload` - Upload assets from CSV file
  - Request body: `FormData` with CSV file
  - Response: `{ success: boolean, created: number, failed: number, errors?: string[] }`
- `GET /v1/assets/upload/sample` - Download sample CSV file for bulk upload
  - Response: CSV file download
- `POST /v1/agents/deploy` - Deploy agent to selected assets
  - Request body: `{ assetIds: string[], organizationId: string, branchId?: string, departmentId?: string, osType: string, processorType: string }`
  - Response: `{ success: boolean, deployed: number, failed: number, errors?: string[] }`
- `POST /v1/assets/export` - Export assets list (if applicable)
  - Request body: `{ filters?: object, format: 'csv' | 'excel' }`
- `GET /v1/categories` - List categories (for filters)

**UI Components:**
- Page: `/assets` (AllAssets.tsx)
- Components:
  - **Assets Page:**
    - Page title: "Assets" or "All Assets"
    - Navigation: Assets menu > All Assets (also has Software Inventory and License Inventory pages)
    - Search input field (SearchOutlined icon) in page header
    - **Action dropdown button** (Dropdown button with DownOutlined icon) in page header with options:
      - Add Asset (opens Add Asset popup)
      - Bulk Add (opens Bulk Add popup)
      - Deploy Agent (opens Deploy Agent popup, disabled until assets are selected)
    - Refresh button (ReloadOutlined icon) in page header
    - Export button (DownloadOutlined icon) in page header
    - Column visibility toggle button (FilterOutlined icon) in page header
    - Bulk action menu (appears when assets are selected)
    - Assets table with columns:
      - **Asset ID:** Text (sortable, searchable, can be pinned)
      - **Asset Name:** Text (sortable, searchable)
      - **Category:** Text (filterable, searchable)
      - **Operational Status:** Badge/Tag (color-coded, filterable)
        - Online: Green (success)
        - Offline: Red (error)
        - Maintenance: Yellow (warning)
        - Unknown: Gray (default)
      - **Status:** Badge/Tag (color-coded, filterable)
        - Active: Green (success)
        - Inactive: Gray (default)
        - Retired: Red (error)
      - **Op. Status Since:** Text (formatted date/time, sortable)
      - **Op. Status Duration:** Text (relative time, sortable)
      - **Actions:** Dropdown menu (MoreOutlined icon) with options:
        - View (navigates to asset details)
        - Edit (navigates to edit page or opens modal)
        - Delete (shows confirmation dialog)
    - Checkboxes for row selection (for bulk operations)
    - Table pagination controls at bottom
    - Empty state component when no assets found
    - Loading spinner while fetching data
  - **Column Visibility Modal:** (ColumnConfigModal.tsx)
    - Modal with checkboxes for each column
    - Group columns by category (Basic, Organization, Status, Actions)
    - Pin/unpin options for columns
    - Reset to default button
    - Save button to persist preferences
  - **Asset Details Page:** (AssetDetails.tsx)
    - Page with multiple tabs:
      - Details: Basic information, status, performance
      - Lifecycle: Lifecycle history
      - Hardware: Hardware details
      - Software: Installed software
      - Patches: Patches for asset
      - Vulnerabilities: Vulnerabilities detected on the asset
      - Security: Security compliance
      - Network: Network configuration
      - Telemetry: Current and historical telemetry
      - Audit Log: Audit log entries
  - **Delete Confirmation Dialog:**
    - Message: "Are you sure you want to delete this asset?"
    - Warning about consequences
    - Confirm and Cancel buttons
  - **Bulk Delete Confirmation Dialog:**
    - Message: "Are you sure you want to delete X selected assets?"
    - Warning about consequences
    - Confirm and Cancel buttons
  - **Add Asset Modal/Popup:** (AddAssetModal.tsx)
    - Modal title: "Add Asset" or "Create New Asset"
    - Form fields for creating a new asset (to be defined based on asset creation requirements)
    - Save, Reset, Cancel buttons
  - **Bulk Add Modal/Popup:** (BulkAddAssetModal.tsx)
    - Modal title: "Bulk Add Assets" or "Upload Assets from CSV"
    - File upload field (Upload component) for CSV file
    - "Download Sample CSV" button (DownloadOutlined icon)
    - Instructions section showing how to fill CSV data:
      - Format requirements
      - Required columns
      - Data validation rules
      - Example data
    - Upload, Cancel buttons
    - Progress indicator during upload
    - Success/error messages after upload
  - **Deploy Agent Modal/Popup:** (DeployAgentModal.tsx)
    - Modal title: "Deploy Agent" or "Deploy Agent to Selected Assets"
    - Selected assets count display: "Deploying agent to X asset(s)"
    - Form fields:
      - **Organization:** Dropdown/Select (required, marked with asterisk *)
        - Placeholder: "Select Organization"
        - Options: All available organizations
      - **Branch:** Dropdown/Select (optional, not marked with asterisk)
        - Placeholder: "Select Branch (Optional)"
        - Initially disabled/empty
        - Enabled when organization is selected
        - Options: Branches from selected organization
      - **Department:** Dropdown/Select (optional, not marked with asterisk)
        - Placeholder: "Select Department (Optional)"
        - Initially disabled/empty
        - Enabled when branch is selected
        - Options: Departments from selected branch
      - **OS Type:** Dropdown/Select (required, marked with asterisk *)
        - Placeholder: "Select OS Type"
        - Options: Windows, MacOS, Linux
      - **Processor Type:** Dropdown/Select (required, marked with asterisk *)
        - Placeholder: "Select Processor Type"
        - Options: x64, x86, arm64, universal
    - **Action Buttons:**
      - **Deploy button (primary):** Deploys agent to selected assets (enabled when Organization, OS Type, and Processor Type are filled)
      - **Reset button (default):** Resets all form fields
      - **Cancel button (default):** Closes modal without deploying
    - **Form States:**
      - Loading state while deploying
      - Success message after successful deployment
      - Error messages for validation failures or deployment errors

- User Actions:
  1. Navigate to Assets page
  2. View table of all assets
  3. Use search input to search assets by ID, name, category, hostname, IP, serial number, etc.
  4. Filter assets by Category using Category column filter dropdown
  5. Filter assets by Operational Status using Operational Status column filter dropdown
  6. Filter assets by Status using Status column filter dropdown
  7. Filter assets by Organization using Organization filter dropdown (if multi-tenant)
  8. Filter assets by Branch Location using Branch Location filter dropdown
  9. Sort assets by Asset ID (click column header)
  10. Sort assets by Asset Name (click column header)
  11. Sort assets by Category (click column header)
  12. Sort assets by Operational Status (click column header)
  13. Sort assets by Op. Status Since (click column header)
  14. Use pagination controls to navigate through pages
  15. Toggle column visibility using column filter button
  16. Pin/unpin columns (e.g., pin Asset ID to left)
  17. Select multiple assets using checkboxes
  18. Perform bulk delete on selected assets
  19. Click Refresh button to reload asset list
  20. Click Export button to export asset list
  21. Click Action dropdown button in page header
  22. Select "Add Asset" from dropdown:
    - Verify Add Asset popup/modal opens
    - Fill in asset creation form
    - Click Save to create asset
    - Click Cancel to close without creating
    - Click Reset to clear form
  23. Select "Bulk Add" from dropdown:
    - Verify Bulk Add popup/modal opens
    - View instructions on how to fill CSV data
    - Click "Download Sample CSV" button to download sample file
    - Upload CSV file using file upload field
    - Verify upload progress and success/error messages
    - Click Cancel to close without uploading
  24. Select one or more assets using checkboxes
  25. Verify "Deploy Agent" option becomes enabled in Action dropdown
  26. Select "Deploy Agent" from dropdown:
    - Verify Deploy Agent popup/modal opens
    - Verify selected assets count is displayed
    - Select Organization (required)
    - (Optional) Select Branch (filtered by organization)
    - (Optional) Select Department (filtered by branch)
    - Select OS Type (required)
    - Select Processor Type (required)
    - Verify Deploy button is enabled when all required fields are filled
    - Click Deploy to initiate agent deployment
    - Click Cancel to close without deploying
    - Click Reset to clear form fields
  27. Click on asset row or "View" action to navigate to asset details page
  28. View asset details in various tabs
  29. Click "Edit" action to edit asset
  30. Click "Delete" action to delete asset
  31. Verify status badges are color-coded correctly
  32. Verify empty state is shown when no assets found
  33. Verify loading state is shown while fetching data

**Test Notes:**
- Test with admin role (should have full access: view, edit, delete)
- Test with regular user role (should have view access, may not have edit/delete permissions)
- Test asset table display:
  - Verify all columns are displayed correctly
  - Verify asset information is accurate
  - Verify status badges are color-coded
  - Verify Op. Status Since shows formatted date/time
  - Verify Op. Status Duration shows relative time
- Test search functionality:
  - Search by Asset ID
  - Search by Asset Name
  - Search by Category
  - Search by Hostname
  - Search by IP Address
  - Search by Serial Number
  - Verify search is case-insensitive
  - Verify search filters results correctly
  - Verify empty results show "No results found" message
- Test filter functionality:
  - Filter by Category
  - Filter by Operational Status
  - Filter by Status
  - Filter by Organization (if multi-tenant)
  - Filter by Branch Location
  - Apply multiple filters simultaneously
  - Clear filters individually
  - Clear all filters
  - Verify filtered results are correct
- Test sort functionality:
  - Sort by Asset ID (ascending/descending)
  - Sort by Asset Name (ascending/descending)
  - Sort by Category (ascending/descending)
  - Sort by Operational Status (ascending/descending)
  - Sort by Op. Status Since (newest/oldest first)
  - Sort by Op. Status Duration (ascending/descending)
  - Verify sort order is correct
  - Verify sort indicators show current sort direction
- Test pagination:
  - Navigate to next page
  - Navigate to previous page
  - Jump to specific page
  - Change page size (if applicable)
  - Verify pagination controls are correct
  - Verify total count is accurate
- Test column visibility:
  - Toggle column visibility
  - Pin/unpin columns
  - Reset to default columns
  - Verify column preferences are saved
  - Verify column preferences persist across sessions
- Test Action dropdown button:
  - Verify Action dropdown button is visible in page header
  - Click Action dropdown to view options
  - Verify three options are available: Add Asset, Bulk Add, Deploy Agent
  - Verify Deploy Agent option is initially disabled
- Test Add Asset functionality:
  - Click Action dropdown and select "Add Asset"
  - Verify Add Asset popup/modal opens
  - Fill in asset creation form fields
  - Click Save to create asset
  - Verify asset is created and appears in table
  - Click Cancel to close without creating
  - Click Reset to clear form fields
  - Verify form validation works correctly
- Test Bulk Add functionality:
  - Click Action dropdown and select "Bulk Add"
  - Verify Bulk Add popup/modal opens
  - Verify instructions section is displayed
  - Verify instructions show how to fill CSV data
  - Click "Download Sample CSV" button
  - Verify sample CSV file is downloaded
  - Verify sample CSV contains correct column headers and example data
  - Upload valid CSV file
  - Verify upload progress is shown
  - Verify success message appears after upload
  - Verify assets are created and appear in table
  - Upload invalid CSV file
  - Verify error messages are shown
  - Click Cancel to close without uploading
- Test Deploy Agent functionality:
  - Verify Deploy Agent option is disabled when no assets are selected
  - Select one or more assets using checkboxes
  - Verify Deploy Agent option becomes enabled
  - Click Action dropdown and select "Deploy Agent"
  - Verify Deploy Agent popup/modal opens
  - Verify selected assets count is displayed correctly
  - Select Organization from dropdown (required)
  - Verify Branch dropdown becomes enabled after organization selection
  - (Optional) Select Branch from dropdown
  - Verify Department dropdown becomes enabled after branch selection
  - (Optional) Select Department from dropdown
  - Select OS Type from dropdown (required)
  - Select Processor Type from dropdown (required)
  - Verify Deploy button is enabled when all required fields are filled
  - Click Deploy button
  - Verify agent deployment process is initiated
  - Verify success message appears
  - Verify agents are deployed to selected assets
  - Test with single asset selection
  - Test with multiple asset selection
  - Test with different OS types and processor types
  - Click Cancel to close without deploying
  - Click Reset to clear form fields
  - Test form validation (missing organization, OS type, or processor type)
- Test bulk operations:
  - Select multiple assets using checkboxes
  - Verify bulk action menu appears
  - Perform bulk delete
  - Verify confirmation dialog shows correct count
  - Verify selected assets are deleted
  - Verify success message appears
- Test asset details navigation:
  - Click on asset row
  - Verify navigation to asset details page
  - Verify asset details page loads correctly
  - View different tabs (Details, Lifecycle, Hardware, Software, Patches, Vulnerabilities, Security, Network, Telemetry, Audit Log)
  - Verify all tab data loads correctly
  - Verify Vulnerabilities tab displays vulnerabilities detected on the asset
- Test Edit Asset functionality:
  - Click "Edit" action button
  - Verify navigation to edit page or edit modal opens
  - Modify asset details
  - Save changes
  - Verify asset is updated in table
- Test Delete Asset functionality:
  - Click "Delete" action button
  - Verify confirmation dialog appears
  - Verify dialog message is clear
  - Click Confirm to delete
  - Verify asset is removed from table
  - Verify success message appears
  - Click Cancel to close dialog without deleting
  - Verify asset remains in table
- Test real-time updates:
  - Verify asset status updates in real-time (if WebSocket enabled)
  - Verify Op. Status Duration updates dynamically
  - Verify new assets appear in table automatically
  - Verify status changes are reflected immediately
- Test error handling:
  - Test with network errors
  - Test with server errors
  - Test with invalid asset ID
  - Verify appropriate error messages are shown
  - Verify error states are handled gracefully
- Test edge cases:
  - Test with no assets registered (empty state)
  - Test with assets from different organizations (if multi-tenant)
  - Test with assets with different statuses
  - Test with assets with different operational statuses
  - Test with many assets (verify pagination)
- Test permissions:
  - Test with view-only permission (verify edit/delete are disabled or hidden)
  - Test with edit permission (verify edit is available, delete may be restricted)
  - Test with full permission (verify all actions are available)
- Test UI responsiveness:
  - Test table on different screen sizes
  - Test column visibility modal on different screen sizes
  - Verify table is scrollable on small screens
  - Verify pinned columns work correctly
  - Test on different browsers
- Test export functionality:
  - Click Export button
  - Select export format (CSV/Excel)
  - Verify exported file contains correct data
  - Verify exported file includes all visible columns
  - Verify exported file respects current filters
- Test performance:
  - Test with large number of assets (100+)
  - Verify pagination works correctly
  - Verify search/filter performance
  - Verify table rendering performance
  - Verify column visibility preferences load quickly

---

### User Story 5: Software Inventory Page Functions

**Story ID:** `US-025`  
**Title:** View and Manage Software Inventory in Table View  
**Priority:** P0 (Critical)  
**Module:** Assets - Software Inventory

**User Story:**
```
As a system administrator
I want to view, search, filter, and manage software inventory in a table view
So that I can efficiently browse, find, and track software installed across assets
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Assets > Software Inventory page
- [ ] AC2: User can see a table listing all software with the following columns:
  - Software Name (sortable, searchable, clickable)
  - Version (searchable)
  - Software Type (filterable)
  - Manufacturer (sortable, searchable)
  - Total Instances (sortable, numeric)
  - Actions (Blacklist, Uninstall)
- [ ] AC3: User can search software by Software Name, Version, Manufacturer, or Software Type using a search input field
- [ ] AC4: User can filter software by:
  - OS Type (via OS filter dropdown: All OS, Windows, MacOS, Linux)
  - Category (via Category filter dropdown: All Categories, Application, System)
- [ ] AC5: User can sort software by:
  - Software Name (ascending/descending, alphabetical)
  - Manufacturer (ascending/descending, alphabetical)
  - Total Instances (ascending/descending, numeric)
- [ ] AC6: User can paginate through software using table pagination controls
- [ ] AC7: User can select multiple software items using checkboxes for bulk operations
- [ ] AC8: User can view software details by clicking on Software Name, which opens a Software Details modal
- [ ] AC9: Software Details modal displays:
  - Software Name
  - Version
  - Software Type
  - Manufacturer
  - Total Instances
  - List of assets where software is installed (table/list with asset details: Asset ID, Asset Name, Hostname, IP Address, etc.)
- [ ] AC10: Actions column displays two action buttons: Blacklist and Uninstall
- [ ] AC11: Clicking "Blacklist" action button opens Blacklist Software popup/modal
- [ ] AC12: Blacklist popup displays form with the following fields:
  - Organization dropdown (mandatory, marked with asterisk *)
  - Branch dropdown (optional, filtered by organization)
  - Department dropdown (optional, filtered by branch)
  - Alert Type dropdown (mandatory, marked with asterisk *, options: Critical, Major, Minor)
  - Notification Type dropdown (mandatory, options to be defined)
  - Notify To field (mandatory, options to be defined - may be email, user selection, etc.)
- [ ] AC13: Blacklist form has three buttons: Save (primary), Cancel (default), Reset (default)
- [ ] AC14: Save button is enabled only when Organization, Alert Type, Notification Type, and Notify To are filled
- [ ] AC15: System validates all mandatory fields before saving blacklist entry
- [ ] AC16: Upon successful save, software is added to blacklist for selected organization/branch/department
- [ ] AC17: System creates alert/notification based on selected alert type and notification type
- [ ] AC18: Clicking "Uninstall" action button opens Uninstall Software popup/modal
- [ ] AC19: Uninstall popup displays form with the following fields:
  - Name field (text input, mandatory)
  - Target Asset selection (multi-select dropdown or radio buttons: "Select Assets", "All Assets")
  - When "Select Assets" is chosen: Asset list with checkboxes (one or more assets can be selected)
  - When "All Assets" is chosen: All assets with this software are selected
  - Reboot Required toggle/checkbox (Yes/No)
  - Schedule toggle (enabled/disabled, default: disabled)
  - When Schedule is enabled: Schedule options appear (Daily, Weekly, Once, with date/time pickers)
  - When Schedule is disabled: Action is taken immediately
- [ ] AC20: Uninstall form has three buttons: Run/Save (primary), Cancel (default), Reset (default)
- [ ] AC21: Run/Save button shows "Run" when schedule is disabled (immediate action)
- [ ] AC22: Run/Save button shows "Save" when schedule is enabled (scheduled action)
- [ ] AC23: Run/Save button is enabled only when Name and Target Asset selection are filled
- [ ] AC24: System validates all required fields before executing or scheduling uninstall
- [ ] AC25: Upon clicking "Run", uninstall action is executed immediately on selected assets
- [ ] AC26: Upon clicking "Save" (when scheduled), uninstall action is scheduled for selected date/time
- [ ] AC27: System displays success message after uninstall is executed or scheduled
- [ ] AC28: Table displays empty state message when no software is found
- [ ] AC29: Table shows loading state while fetching software data
- [ ] AC30: Table shows "No results found" message when search/filter returns no matches
- [ ] AC31: Refresh/Reload button reloads software inventory from server
- [ ] AC32: Table supports export functionality (Export button) to export software inventory as CSV/Excel (if applicable)
- [ ] AC33: Exported CSV includes all visible columns and filtered/search results
- [ ] AC34: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC35: Page respects user permissions - users with view-only permission cannot blacklist or uninstall software
- [ ] AC36: Software inventory updates automatically when new software is detected on assets

**Test Data:**
```json
{
  "softwareInventory": [
    {
      "id": "sw-001",
      "softwareName": "Microsoft Office 365",
      "version": "2021",
      "softwareType": "Application",
      "manufacturer": "Microsoft",
      "totalInstances": 45
    },
    {
      "id": "sw-002",
      "softwareName": "Adobe Acrobat Reader",
      "version": "2023.003.20284",
      "softwareType": "Application",
      "manufacturer": "Adobe",
      "totalInstances": 120
    },
    {
      "id": "sw-003",
      "softwareName": "Windows Defender",
      "version": "4.18.23050.0",
      "softwareType": "System",
      "manufacturer": "Microsoft",
      "totalInstances": 200
    },
    {
      "id": "sw-004",
      "softwareName": "Google Chrome",
      "version": "120.0.6099.109",
      "softwareType": "Application",
      "manufacturer": "Google",
      "totalInstances": 180
    },
    {
      "id": "sw-005",
      "softwareName": "Visual Studio Code",
      "version": "1.85.1",
      "softwareType": "Application",
      "manufacturer": "Microsoft",
      "totalInstances": 25
    }
  ],
  "filters": {
    "osTypes": ["All OS", "Windows", "MacOS", "Linux"],
    "categories": ["All Categories", "Application", "System"]
  },
  "softwareAssets": [
    {
      "softwareId": "sw-001",
      "assets": [
        {
          "assetId": "AST-001",
          "assetName": "Windows Server 01",
          "hostname": "win-server-01",
          "ipAddress": "192.168.1.100"
        },
        {
          "assetId": "AST-002",
          "assetName": "Windows Workstation 01",
          "hostname": "win-ws-01",
          "ipAddress": "192.168.1.101"
        }
      ]
    }
  ],
  "blacklistData": {
    "organizationId": "org-001",
    "branchId": "branch-001",
    "departmentId": "dept-001",
    "alertType": "Critical",
    "notificationType": "Email",
    "notifyTo": "admin@example.com"
  },
  "uninstallData": {
    "name": "Uninstall Microsoft Office 365",
    "targetAssets": "selected",
    "selectedAssetIds": ["AST-001", "AST-002"],
    "rebootRequired": true,
    "schedule": false
  },
  "uninstallScheduled": {
    "name": "Uninstall Adobe Acrobat Reader",
    "targetAssets": "all",
    "rebootRequired": false,
    "schedule": true,
    "scheduleType": "Once",
    "scheduleDate": "2024-01-20",
    "scheduleTime": "02:00"
  }
}
```

**API Endpoints:**
- `GET /v1/assets/software-inventory` - List all software inventory (supports query parameters: `page`, `limit`, `search`, `osType`, `category`, `sortBy`, `sortOrder`)
  - Response: `{ software: SoftwareInventory[], total: number, page: number, limit: number }`
- `GET /v1/assets/software-inventory/:id` - Get software details by ID
  - Response: `SoftwareInventory` object with full details
- `GET /v1/assets/software-inventory/:id/assets` - Get list of assets where software is installed
  - Response: `{ assets: Asset[], total: number }`
- `POST /v1/assets/software-inventory/:id/blacklist` - Add software to blacklist
  - Request body: `{ organizationId: string, branchId?: string, departmentId?: string, alertType: 'Critical' | 'Major' | 'Minor', notificationType: string, notifyTo: string }`
  - Response: `{ success: boolean, message: string }`
- `POST /v1/assets/software-inventory/:id/uninstall` - Uninstall software from assets
  - Request body: `{ name: string, targetAssets: 'selected' | 'all', selectedAssetIds?: string[], rebootRequired: boolean, schedule?: { enabled: boolean, type?: 'Once' | 'Daily' | 'Weekly', date?: string, time?: string } }`
  - Response: `{ success: boolean, executed?: boolean, scheduled?: boolean, message: string }`
- `GET /v1/assets/software-inventory/export` - Export software inventory (if applicable)
  - Request body: `{ filters?: object, format: 'csv' | 'excel' }`
- `DELETE /v1/assets/software-inventory/:id` - Delete software from inventory (if applicable)
  - Response: `{ success: boolean, message: string }`
- `POST /v1/assets/software-inventory/bulk` - Bulk operations (delete, if applicable)
  - Request body: `{ action: 'delete', softwareIds: string[] }`
  - Response: `{ success: boolean, deleted: number, failed: number }`

**UI Components:**
- Page: `/assets/software-inventory` (SoftwareInventory.tsx)
- Components:
  - **Software Inventory Page:**
    - Page title: "Software Inventory"
    - Navigation: Assets menu > Software Inventory
    - Search input field (SearchOutlined icon) in page header
    - Refresh button (ReloadOutlined icon) in page header (if applicable)
    - Export button (DownloadOutlined icon) in page header (if applicable)
    - Filter dropdowns:
      - **OS Filter:** Select dropdown (options: All OS, Windows, MacOS, Linux)
      - **Category Filter:** Select dropdown (options: All Categories, Application, System)
    - Software inventory table with columns:
      - **Software Name:** Text (sortable, searchable, clickable - opens details modal)
      - **Version:** Text (searchable)
      - **Software Type:** Text (filterable)
      - **Manufacturer:** Text (sortable, searchable)
      - **Total Instances:** Number (sortable, numeric)
      - **Actions:** Dropdown menu (MoreOutlined icon) or action buttons with options:
        - Blacklist (opens blacklist popup)
        - Uninstall (opens uninstall popup)
    - Table pagination controls at bottom
    - Empty state component when no software found
    - Loading spinner while fetching data
  - **Software Details Modal:** (SoftwareDetailsModal.tsx)
    - Modal title: "Software Details - [Software Name]"
    - **Software Information Section:**
      - Software Name: Text (read-only)
      - Version: Text (read-only)
      - Software Type: Text (read-only)
      - Manufacturer: Text (read-only)
      - Total Instances: Number (read-only)
    - **Installed Assets Section:**
      - Table/list of assets where software is installed
      - Columns: Asset ID, Asset Name, Hostname, IP Address, OS, Status
      - Pagination if many assets
    - Close button (X icon) in modal header
  - **Blacklist Software Modal:** (BlacklistSoftwareModal.tsx)
    - Modal title: "Blacklist Software - [Software Name]"
    - Form fields:
      - **Organization:** Dropdown/Select (required, marked with asterisk *)
        - Placeholder: "Select Organization"
        - Options: All available organizations
      - **Branch:** Dropdown/Select (optional, not marked with asterisk)
        - Placeholder: "Select Branch (Optional)"
        - Initially disabled/empty
        - Enabled when organization is selected
        - Options: Branches from selected organization
      - **Department:** Dropdown/Select (optional, not marked with asterisk)
        - Placeholder: "Select Department (Optional)"
        - Initially disabled/empty
        - Enabled when branch is selected
        - Options: Departments from selected branch
      - **Alert Type:** Dropdown/Select (required, marked with asterisk *)
        - Placeholder: "Select Alert Type"
        - Options: Critical, Major, Minor
      - **Notification Type:** Dropdown/Select (required, marked with asterisk *)
        - Placeholder: "Select Notification Type"
        - Options: Email, SMS, In-App, etc. (to be defined)
      - **Notify To:** Input/Select (required, marked with asterisk *)
        - Placeholder: "Enter notification recipient"
        - May be email input, user selection, or other format
    - **Action Buttons:**
      - **Save button (primary):** Saves blacklist entry (enabled when all required fields are filled)
      - **Reset button (default):** Resets all form fields
      - **Cancel button (default):** Closes modal without saving
  - **Uninstall Software Modal:** (UninstallSoftwareModal.tsx)
    - Modal title: "Uninstall Software - [Software Name]"
    - Form fields:
      - **Name:** Text input (required, marked with asterisk *)
        - Placeholder: "Enter uninstall job name"
      - **Target Asset Selection:**
        - Radio buttons or toggle: "Select Assets" or "All Assets"
        - When "Select Assets" is selected:
          - Asset list with checkboxes (multi-select)
          - Shows all assets where software is installed
          - User can select one or more assets
        - When "All Assets" is selected:
          - All assets with this software are automatically selected
          - Shows count of assets
      - **Reboot Required:** Toggle/Switch or Checkbox
        - Options: Yes/No or checked/unchecked
        - Default: No/Unchecked
      - **Schedule:** Toggle/Switch (enabled/disabled, default: disabled)
        - When enabled:
          - Schedule Type dropdown: Once, Daily, Weekly
          - Date Picker (for Once or Daily)
          - Time Picker
          - Day selector (for Weekly)
        - When disabled:
          - Action is taken immediately
    - **Action Buttons:**
      - **Run/Save button (primary):**
        - Shows "Run" when schedule is disabled (immediate action)
        - Shows "Save" when schedule is enabled (scheduled action)
        - Enabled when Name and Target Asset selection are filled
      - **Reset button (default):** Resets all form fields
      - **Cancel button (default):** Closes modal without executing

- User Actions:
  1. Navigate to Assets > Software Inventory page
  2. View table of all software inventory
  3. Use search input to search software by name, version, manufacturer, or type
  4. Filter software by OS Type using OS filter dropdown
  5. Filter software by Category using Category filter dropdown
  6. Sort software by Software Name (click column header)
  7. Sort software by Manufacturer (click column header)
  8. Sort software by Total Instances (click column header)
  9. Use pagination controls to navigate through pages
  10. Select multiple software items using checkboxes (if bulk operations available)
  11. Click on Software Name to view details
  12. View software details in modal:
    - Verify software information is displayed
    - Verify list of assets where software is installed is shown
    - View asset details (Asset ID, Name, Hostname, IP, OS, Status)
  13. Close software details modal
  14. Click "Blacklist" action button for a software:
    - Verify Blacklist popup opens
    - Select Organization (required)
    - (Optional) Select Branch (filtered by organization)
    - (Optional) Select Department (filtered by branch)
    - Select Alert Type (Critical, Major, Minor)
    - Select Notification Type
    - Enter Notify To information
    - Click Save to add to blacklist
    - Click Cancel to close without saving
    - Click Reset to clear form
  15. Click "Uninstall" action button for a software:
    - Verify Uninstall popup opens
    - Enter Name for uninstall job
    - Select Target Assets (Select Assets or All Assets)
    - If "Select Assets" is chosen, select one or more assets from list
    - If "All Assets" is chosen, verify all assets are selected
    - Toggle Reboot Required (Yes/No)
    - Toggle Schedule (enabled/disabled)
    - If Schedule is enabled:
      - Select Schedule Type (Once, Daily, Weekly)
      - Select Date and Time
      - Verify button shows "Save"
    - If Schedule is disabled:
      - Verify button shows "Run"
    - Click Run/Save to execute or schedule uninstall
    - Click Cancel to close without executing
    - Click Reset to clear form
  16. Click Refresh button to reload software inventory
  17. Click Export button to export software inventory (if available)
  18. Verify empty state is shown when no software found
  19. Verify loading state is shown while fetching data

**Test Notes:**
- Test with admin role (should have full access: view, import)
- Test with regular user role (should have view access, may not have import permission)
- Test navigation:
  - Navigate to Assets > Software Inventory page
  - Verify page title is "Software Inventory"
  - Verify correct page is displayed
- Test software inventory table display:
  - Verify all columns are displayed correctly
  - Verify software information is accurate
  - Verify Total Instances shows correct count
- Test search functionality:
  - Search by Software Name
  - Search by Version
  - Search by Manufacturer
  - Search by Software Type
  - Verify search is case-insensitive
  - Verify search filters results correctly
  - Verify empty results show "No results found" message
- Test filter functionality:
  - Filter by OS Type (All OS, Windows, MacOS, Linux)
  - Filter by Category (All Categories, Application, System)
  - Apply multiple filters simultaneously
  - Clear filters individually
  - Clear all filters
  - Verify filtered results are correct
- Test sort functionality:
  - Sort by Software Name (ascending/descending)
  - Sort by Manufacturer (ascending/descending)
  - Sort by Total Instances (ascending/descending)
  - Verify sort order is correct
  - Verify sort indicators show current sort direction
- Test pagination:
  - Navigate to next page
  - Navigate to previous page
  - Jump to specific page
  - Change page size (if applicable)
  - Verify pagination controls are correct
  - Verify total count is accurate
- Test software details modal:
  - Click on software row
  - Verify modal opens with software details
  - Verify all information is displayed correctly
  - Verify form fields are read-only/disabled
  - Close modal by clicking X button or outside modal
- Test Software Details modal:
  - Click on Software Name
  - Verify modal opens with software details
  - Verify software information is displayed correctly
  - Verify list of assets where software is installed is shown
  - Verify asset table/list displays: Asset ID, Asset Name, Hostname, IP Address, OS, Status
  - Verify pagination works if many assets
  - Close modal by clicking X button or outside modal
- Test Blacklist functionality:
  - Click "Blacklist" action button for a software
  - Verify Blacklist popup opens
  - Verify form fields are displayed
  - Select Organization (required)
  - Verify Branch dropdown becomes enabled after organization selection
  - (Optional) Select Branch from dropdown
  - Verify Department dropdown becomes enabled after branch selection
  - (Optional) Select Department from dropdown
  - Select Alert Type (Critical, Major, Minor)
  - Select Notification Type from dropdown
  - Enter Notify To information
  - Verify Save button is enabled when all required fields are filled
  - Click Save to add software to blacklist
  - Verify success message appears
  - Verify software is added to blacklist
  - Click Cancel to close without saving
  - Click Reset to clear form fields
  - Test form validation (missing organization, alert type, notification type, notify to)
- Test Uninstall functionality:
  - Click "Uninstall" action button for a software
  - Verify Uninstall popup opens
  - Enter Name for uninstall job (required)
  - Select Target Asset option:
    - Select "Select Assets" option
    - Verify asset list appears with checkboxes
    - Select one or more assets
    - Verify selected assets are highlighted
    - Select "All Assets" option
    - Verify all assets are automatically selected
    - Verify asset count is displayed
  - Toggle Reboot Required (Yes/No)
  - Toggle Schedule (enabled/disabled):
    - When Schedule is disabled:
      - Verify button shows "Run"
      - Verify no schedule options are shown
      - Click Run to execute immediately
      - Verify uninstall is executed immediately
    - When Schedule is enabled:
      - Verify button shows "Save"
      - Verify schedule options appear
      - Select Schedule Type (Once, Daily, Weekly)
      - Select Date and Time
      - Click Save to schedule uninstall
      - Verify uninstall is scheduled
  - Verify Run/Save button is enabled when Name and Target Asset selection are filled
  - Click Cancel to close without executing
  - Click Reset to clear form fields
  - Test form validation (missing name, no asset selection)
  - Test with different schedule types
  - Test immediate execution vs scheduled execution
- Test bulk operations (if applicable):
  - Select multiple software items using checkboxes
  - Verify bulk action menu appears
  - Perform bulk delete (if available)
  - Verify confirmation dialog shows correct count
  - Verify selected items are deleted
  - Verify success message appears
- Test real-time updates:
  - Verify software inventory updates when new software is detected on assets
  - Verify Total Instances updates when software is installed/uninstalled on assets
- Test error handling:
  - Test with network errors
  - Test with server errors
  - Test with invalid software ID
  - Verify appropriate error messages are shown
  - Verify error states are handled gracefully
- Test edge cases:
  - Test with no software in inventory (empty state)
  - Test with software from different OS types
  - Test with software from different categories
  - Test with software with many instances
  - Test with software with zero instances
  - Test with many software items (verify pagination)
- Test permissions:
  - Test with view-only permission (verify import is disabled or hidden)
  - Test with import permission (verify import is available)
  - Test with full permission (verify all actions are available)
- Test UI responsiveness:
  - Test table on different screen sizes
  - Test modal on different screen sizes
  - Verify table is scrollable on small screens
  - Verify modal is responsive
  - Test on different browsers
- Test export functionality (if applicable):
  - Click Export button
  - Select export format (CSV/Excel)
  - Verify exported file contains correct data
  - Verify exported file includes all columns
  - Verify exported file respects current filters
- Test performance:
  - Test with large number of software items (100+)
  - Verify pagination works correctly
  - Verify search/filter performance
  - Verify table rendering performance

---

### User Story 6: License Inventory Page Functions

**Story ID:** `US-026`  
**Title:** View and Manage License Inventory in Table View  
**Priority:** P0 (Critical)  
**Module:** Assets - License Inventory

**User Story:**
```
As a system administrator
I want to view, search, filter, and manage software licenses in a table view
So that I can efficiently track, allocate, and manage software licenses across the organization
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Assets > License Inventory page
- [ ] AC2: User can see a table listing all software licenses with the following columns:
  - License Name (sortable, searchable)
  - Category (filterable: Software License, OS License)
  - Software Name (searchable, filterable, shown for Software License category)
  - OS Name (searchable, filterable, shown for OS License category)
  - License Type (filterable: Perpetual, Subscription, Trial, Open Source)
  - Status (filterable, color-coded badges: Allocated=green, Available=blue, Expired=red)
  - License Count (sortable, numeric)
  - Vendor Name (sortable, searchable)
  - Expiry Date / Days Remaining (sortable, shows expiry date or number of days remaining)
  - Actions (Edit, Delete)
- [ ] AC3: User can search licenses by License Name, Software Name, OS Name, Vendor Name, or License Key using a search input field
- [ ] AC4: User can filter licenses by:
  - Category (via Category filter dropdown: All Categories, Software License, OS License)
  - Software Name (via Software filter dropdown: All Software, or specific software names, shown when Category is Software License)
  - OS Name (via OS filter dropdown: All OS, or specific OS names, shown when Category is OS License)
  - License Type (via License Type filter dropdown: All Types, Perpetual, Subscription, Trial, Open Source)
  - Status (via Status filter dropdown: All Status, Allocated, Available, Expired)
- [ ] AC5: User can sort licenses by:
  - License Name (ascending/descending, alphabetical)
  - Category (ascending/descending, alphabetical)
  - License Type (ascending/descending, alphabetical)
  - License Count (ascending/descending, numeric)
  - Vendor Name (ascending/descending, alphabetical)
  - Expiry Date / Days Remaining (ascending/descending, date/numeric)
- [ ] AC6: User can paginate through licenses using table pagination controls
- [ ] AC7: User can select multiple licenses using checkboxes for bulk operations
- [ ] AC8: "New License" button is visible in page header
- [ ] AC9: Clicking "New License" button opens a form modal/popup to create a new license
- [ ] AC10: User can edit license details by clicking "Edit" action button, which opens an Edit License modal with pre-filled data
- [ ] AC11: User can delete a license by clicking "Delete" action button, which shows a confirmation dialog before deletion
- [ ] AC12: Status column displays color-coded badges:
  - Allocated: Green (success)
  - Available: Blue (info)
  - Expired: Red (error)
- [ ] AC13: License Count column displays the number of licenses available/allocated
- [ ] AC14: Table displays empty state message when no licenses are found
- [ ] AC15: Table shows loading state while fetching license data
- [ ] AC16: Table shows "No results found" message when search/filter returns no matches
- [ ] AC17: Refresh/Reload button reloads license inventory from server
- [ ] AC18: Table supports export functionality (Export button) to export license inventory as CSV/Excel (if applicable)
- [ ] AC19: Exported CSV includes all visible columns and filtered/search results
- [ ] AC20: System handles pagination correctly when filtering/searching (resets to page 1)
- [ ] AC21: Page respects user permissions - users with view-only permission cannot create, edit, or delete licenses
- [ ] AC22: License inventory updates automatically when licenses are allocated, expired, or renewed
- [ ] AC23: User can view license details by clicking on license row or License Name, which opens a License Details modal (if applicable)
- [ ] AC24: License Details modal displays comprehensive license information including License Key, Purchase Date, Expiry Date, Publisher, Cost, Notes, and allocation details
- [ ] AC25: When a license is selected (clicked or viewed), allocation details are displayed based on license category:
  - **For Software License:** Shows table/list with Asset Name and Software Name on that asset for which license is allocated
  - **For OS License:** Shows table/list with Asset Name and OS Name on that asset for which license is allocated
- [ ] AC26: Expiry Date / Days Remaining column displays:
  - Expiry Date (formatted date) if license has expiry date
  - Days Remaining (e.g., "30 days remaining", "Expired 5 days ago") calculated from expiry date
  - "N/A" or "Never" for perpetual licenses or licenses without expiry date
- [ ] AC27: Days Remaining is color-coded:
  - Green: More than 30 days remaining
  - Yellow: 1-30 days remaining (warning)
  - Red: Expired (negative days)

**Test Data:**
```json
{
  "licenses": [
    {
      "id": "lic-001",
      "licenseName": "Microsoft Office 365 Enterprise",
      "category": "Software License",
      "softwareName": "Microsoft Office 365",
      "licenseType": "Subscription",
      "status": "Allocated",
      "licenseCount": 50,
      "vendorName": "Microsoft",
      "licenseKey": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
      "purchaseDate": "2024-01-01",
      "expiryDate": "2025-01-01",
      "daysRemaining": 350,
      "publisher": "Microsoft Corporation",
      "cost": "5000.00",
      "notes": "Enterprise license for production use",
      "allocations": [
        {
          "assetId": "AST-001",
          "assetName": "Windows Server 01",
          "softwareName": "Microsoft Office 365"
        },
        {
          "assetId": "AST-002",
          "assetName": "Windows Workstation 01",
          "softwareName": "Microsoft Office 365"
        }
      ]
    },
    {
      "id": "lic-002",
      "licenseName": "Adobe Creative Cloud",
      "category": "Software License",
      "softwareName": "Adobe Creative Suite",
      "licenseType": "Subscription",
      "status": "Available",
      "licenseCount": 25,
      "vendorName": "Adobe",
      "licenseKey": "YYYYY-YYYYY-YYYYY-YYYYY-YYYYY",
      "purchaseDate": "2024-02-01",
      "expiryDate": "2025-02-01",
      "daysRemaining": 380,
      "publisher": "Adobe Inc.",
      "cost": "3000.00",
      "notes": "Creative Cloud subscription",
      "allocations": []
    },
    {
      "id": "lic-003",
      "licenseName": "Windows Server 2022",
      "category": "OS License",
      "osName": "Windows Server 2022",
      "licenseType": "Perpetual",
      "status": "Allocated",
      "licenseCount": 10,
      "vendorName": "Microsoft",
      "licenseKey": "ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ",
      "purchaseDate": "2023-01-01",
      "expiryDate": null,
      "daysRemaining": null,
      "publisher": "Microsoft Corporation",
      "cost": "2000.00",
      "notes": "Perpetual license",
      "allocations": [
        {
          "assetId": "AST-003",
          "assetName": "Windows Server 02",
          "osName": "Windows Server 2022"
        }
      ]
    },
    {
      "id": "lic-004",
      "licenseName": "Ubuntu Pro",
      "category": "OS License",
      "osName": "Ubuntu 22.04",
      "licenseType": "Subscription",
      "status": "Expired",
      "licenseCount": 5,
      "vendorName": "Canonical",
      "licenseKey": "AAAAA-AAAAA-AAAAA-AAAAA-AAAAA",
      "purchaseDate": "2023-06-01",
      "expiryDate": "2024-01-15",
      "daysRemaining": -5,
      "publisher": "Canonical Ltd.",
      "cost": "500.00",
      "notes": "Expired license - needs renewal",
      "allocations": []
    },
    {
      "id": "lic-005",
      "licenseName": "Visual Studio Code",
      "category": "Software License",
      "softwareName": "Visual Studio Code",
      "licenseType": "Open Source",
      "status": "Available",
      "licenseCount": 999,
      "vendorName": "Microsoft",
      "licenseKey": null,
      "purchaseDate": null,
      "expiryDate": null,
      "daysRemaining": null,
      "publisher": "Microsoft Corporation",
      "cost": "0.00",
      "notes": "Open source license",
      "allocations": []
    }
  ],
  "filters": {
    "categories": ["All Categories", "Software License", "OS License"],
    "softwareNames": ["All Software", "Microsoft Office 365", "Adobe Creative Suite", "Visual Studio Code"],
    "osNames": ["All OS", "Windows Server 2022", "Ubuntu 22.04"],
    "licenseTypes": ["All Types", "Perpetual", "Subscription", "Trial", "Open Source"],
    "statuses": ["All Status", "Allocated", "Available", "Expired"]
  }
}
```

**API Endpoints:**
- `GET /v1/assets/software-licenses` - List all software licenses (supports query parameters: `page`, `limit`, `search`, `category`, `softwareName`, `osName`, `licenseType`, `status`, `sortBy`, `sortOrder`)
  - Response: `{ licenses: SoftwareLicense[], total: number, page: number, limit: number }`
- `GET /v1/assets/software-licenses/:id` - Get license details by ID
  - Response: `SoftwareLicense` object with full details including allocations
- `GET /v1/assets/software-licenses/:id/allocations` - Get license allocation details
  - Response: `{ allocations: Allocation[] }` where Allocation contains assetId, assetName, and softwareName (for Software License) or osName (for OS License)
- `POST /v1/assets/software-licenses` - Create a new license
  - Request body: `{ licenseName: string, category: 'Software License' | 'OS License', softwareName?: string, osName?: string, licenseType: 'Perpetual' | 'Subscription' | 'Trial' | 'Open Source', vendorName: string, licenseCount: number, licenseKey?: string, purchaseDate?: string, expiryDate?: string, publisher?: string, cost?: number, notes?: string }`
  - Response: `{ success: boolean, license: SoftwareLicense }`
- `PUT /v1/assets/software-licenses/:id` - Update license details
  - Request body: `{ licenseName?: string, category?: string, softwareName?: string, osName?: string, licenseType?: string, status?: string, licenseCount?: number, vendorName?: string, licenseKey?: string, purchaseDate?: string, expiryDate?: string, publisher?: string, cost?: number, notes?: string }`
  - Response: `{ success: boolean, license: SoftwareLicense }`
- `DELETE /v1/assets/software-licenses/:id` - Delete a license
  - Response: `{ success: boolean, message: string }`
- `POST /v1/assets/software-licenses/bulk` - Bulk operations (delete, if applicable)
  - Request body: `{ action: 'delete', licenseIds: string[] }`
  - Response: `{ success: boolean, deleted: number, failed: number }`
- `GET /v1/assets/software-licenses/export` - Export license inventory (if applicable)
  - Request body: `{ filters?: object, format: 'csv' | 'excel' }`

**UI Components:**
- Page: `/assets/license-inventory` (SoftwareLicense.tsx)
- Components:
  - **License Inventory Page:**
    - Page title: "Software License" or "License Inventory"
    - Navigation: Assets menu > License Inventory
    - Search input field (SearchOutlined icon) in page header
    - "New License" button (PlusOutlined icon) in page header
    - Refresh button (ReloadOutlined icon) in page header (if applicable)
    - Export button (DownloadOutlined icon) in page header (if applicable)
    - Filter dropdowns:
      - **Category Filter:** Select dropdown (options: All Categories, Software License, OS License)
      - **Software Filter:** Select dropdown (options: All Software, or specific software names, shown when Category is Software License)
      - **OS Filter:** Select dropdown (options: All OS, or specific OS names, shown when Category is OS License)
      - **License Type Filter:** Select dropdown (options: All Types, Perpetual, Subscription, Trial, Open Source)
      - **Status Filter:** Select dropdown (options: All Status, Allocated, Available, Expired)
    - License inventory table with columns:
      - **License Name:** Text (sortable, searchable, clickable - opens details modal if applicable)
      - **Category:** Badge/Tag (filterable: Software License, OS License)
      - **Software Name:** Text (searchable, filterable, shown for Software License category)
      - **OS Name:** Text (searchable, filterable, shown for OS License category)
      - **License Type:** Badge/Tag (filterable: Perpetual, Subscription, Trial, Open Source)
      - **Status:** Badge/Tag (color-coded, filterable)
        - Allocated: Green (success)
        - Available: Blue (info)
        - Expired: Red (error)
      - **License Count:** Number (sortable, numeric)
      - **Vendor Name:** Text (sortable, searchable)
      - **Expiry Date / Days Remaining:** Text (sortable, color-coded)
        - Shows expiry date (formatted) or days remaining
        - Green: More than 30 days remaining
        - Yellow: 1-30 days remaining (warning)
        - Red: Expired (negative days)
        - "N/A" or "Never" for perpetual licenses
      - **Actions:** Dropdown menu (MoreOutlined icon) with options:
        - Edit (opens edit modal)
        - Delete (shows confirmation dialog)
    - Checkboxes for row selection (for bulk operations, if applicable)
    - Table pagination controls at bottom
    - Empty state component when no licenses found
    - Loading spinner while fetching data
  - **New License Modal:** (NewLicenseModal.tsx)
    - Modal title: "New License" or "Create License"
    - Form fields for creating a new license:
      - License Name (required)
      - Category (required dropdown: Software License, OS License)
      - Software Name (required if Category is Software License, filtered by category)
      - OS Name (required if Category is OS License, filtered by category)
      - License Type (required dropdown: Perpetual, Subscription, Trial, Open Source)
      - Vendor Name (required)
      - License Count (required, numeric)
      - License Key (optional)
      - Purchase Date (optional, date picker)
      - Expiry Date (optional, date picker, shown when License Type is Subscription or Trial)
      - Publisher (optional)
      - Cost (optional, numeric)
      - Notes (optional, text area)
    - Save, Reset, Cancel buttons
  - **Edit License Modal:** (EditLicenseModal.tsx)
    - Modal title: "Edit License" or "Update License"
    - Form fields with pre-filled license data:
      - License Name, Category, Vendor Name, License Count
      - Software Name (if Software License) or OS Name (if OS License)
      - License Type, Status (if editable)
      - License Key, Purchase Date, Expiry Date
      - Days Remaining (read-only, calculated from expiry date)
      - Publisher, Cost, Notes
    - Update, Reset, Cancel buttons
  - **License Details Modal:** (LicenseDetailsModal.tsx, if applicable)
    - Modal title: "License Details - [License Name]"
    - **License Information Section:**
      - License Name, Category, Vendor Name, License Count
      - Software Name (if Software License) or OS Name (if OS License)
      - License Type, Status
      - License Key (may be masked), Purchase Date, Expiry Date
      - Days Remaining (color-coded: green/yellow/red)
      - Publisher, Cost, Notes
    - **Allocation Details Section:**
      - **For Software License:**
        - Table/list showing allocations
        - Columns: Asset Name, Software Name
        - Shows which assets have this software license allocated
      - **For OS License:**
        - Table/list showing allocations
        - Columns: Asset Name, OS Name
        - Shows which assets have this OS license allocated
      - Empty state if no allocations
      - Pagination if many allocations
    - Close button (X icon) in modal header
  - **Delete Confirmation Dialog:**
    - Message: "Are you sure you want to delete this license?"
    - Warning about consequences
    - Confirm and Cancel buttons

- User Actions:
  1. Navigate to Assets > License Inventory page
  2. View table of all software licenses
  3. Use search input to search licenses by name, software name, vendor name, or license key
  4. Filter licenses by Category using Category filter dropdown
  5. Filter licenses by Software Name using Software filter dropdown (when Category is Software License)
  6. Filter licenses by OS Name using OS filter dropdown (when Category is OS License)
  7. Filter licenses by License Type using License Type filter dropdown
  8. Filter licenses by Status using Status filter dropdown
  9. Sort licenses by License Name (click column header)
  10. Sort licenses by Category (click column header)
  11. Sort licenses by License Type (click column header)
  12. Sort licenses by License Count (click column header)
  13. Sort licenses by Vendor Name (click column header)
  14. Sort licenses by Expiry Date / Days Remaining (click column header)
  15. Use pagination controls to navigate through pages
  16. Select multiple licenses using checkboxes (if bulk operations available)
  17. Click "New License" button to create a new license
  18. Click on License Name or license row to view details (if applicable)
  19. View license details in modal:
    - Verify license information is displayed
    - Verify allocation details are shown based on category
    - For Software License: Verify Asset Name and Software Name are shown
    - For OS License: Verify Asset Name and OS Name are shown
  20. Close license details modal
  15. Click "Edit" action button to edit license
  16. Modify license details in edit modal
  17. Click Update to save changes
  18. Click "Delete" action button to delete license
  19. Confirm deletion in confirmation dialog
  20. Click Refresh button to reload license inventory
  21. Click Export button to export license inventory (if available)
  22. Verify status badges are color-coded correctly
  23. Verify empty state is shown when no licenses found
  24. Verify loading state is shown while fetching data

**Test Notes:**
- Test with admin role (should have full access: view, create, edit, delete)
- Test with regular user role (should have view access, may not have create/edit/delete permissions)
- Test navigation:
  - Navigate to Assets > License Inventory page
  - Verify page title is correct
  - Verify correct page is displayed
- Test license inventory table display:
  - Verify all columns are displayed correctly
  - Verify license information is accurate
  - Verify Category column shows "Software License" or "OS License"
  - Verify Software Name column is shown for Software License category
  - Verify OS Name column is shown for OS License category
  - Verify License Type column shows: Perpetual, Subscription, Trial, or Open Source
  - Verify status badges are color-coded correctly
  - Verify License Count shows correct numbers
  - Verify Expiry Date / Days Remaining column displays correctly:
    - Shows expiry date for licenses with expiry
    - Shows days remaining (e.g., "30 days remaining")
    - Shows "Expired X days ago" for expired licenses
    - Shows "N/A" or "Never" for perpetual licenses
  - Verify Days Remaining is color-coded (green/yellow/red)
- Test search functionality:
  - Search by License Name
  - Search by Software Name
  - Search by Vendor Name
  - Search by License Key
  - Verify search is case-insensitive
  - Verify search filters results correctly
  - Verify empty results show "No results found" message
- Test filter functionality:
  - Filter by Category (Software License, OS License)
  - Filter by Software Name (when Category is Software License)
  - Filter by OS Name (when Category is OS License)
  - Filter by License Type (Perpetual, Subscription, Trial, Open Source)
  - Filter by Status (Allocated, Available, Expired)
  - Apply multiple filters simultaneously
  - Clear filters individually
  - Clear all filters
  - Verify filtered results are correct
  - Verify Software Name filter is shown/hidden based on Category selection
  - Verify OS Name filter is shown/hidden based on Category selection
- Test sort functionality:
  - Sort by License Name (ascending/descending)
  - Sort by License Count (ascending/descending)
  - Sort by Vendor Name (ascending/descending)
  - Verify sort order is correct
  - Verify sort indicators show current sort direction
- Test pagination:
  - Navigate to next page
  - Navigate to previous page
  - Jump to specific page
  - Change page size (if applicable)
  - Verify pagination controls are correct
  - Verify total count is accurate
- Test Create License functionality:
  - Click "New License" button
  - Verify New License modal opens
  - Fill in license creation form fields
  - Click Save to create license
  - Verify license is created and appears in table
  - Click Cancel to close without creating
  - Click Reset to clear form fields
  - Verify form validation works correctly
- Test Edit License functionality:
  - Click "Edit" action button
  - Verify Edit modal opens with pre-filled data
  - Modify license details
  - Click Update to save changes
  - Verify license is updated in table
  - Click Cancel to close without saving
  - Click Reset to reset form to original values
- Test Delete License functionality:
  - Click "Delete" action button
  - Verify confirmation dialog appears
  - Verify dialog message is clear
  - Click Confirm to delete
  - Verify license is removed from table
  - Verify success message appears
  - Click Cancel to close dialog without deleting
  - Verify license remains in table
- Test License Details modal (if applicable):
  - Click on License Name or license row
  - Verify modal opens with license details
  - Verify all information is displayed correctly:
    - License Name, Category, Vendor Name, License Count
    - Software Name (if Software License) or OS Name (if OS License)
    - License Type, Status
    - License Key (may be masked), Purchase Date, Expiry Date
    - Days Remaining (color-coded)
    - Publisher, Cost, Notes
  - Verify License Key is masked or displayed securely
  - Verify allocation details section is displayed
  - **For Software License:**
    - Verify allocation table shows Asset Name and Software Name columns
    - Verify all allocated assets are listed
    - Verify software name on each asset is shown correctly
  - **For OS License:**
    - Verify allocation table shows Asset Name and OS Name columns
    - Verify all allocated assets are listed
    - Verify OS name on each asset is shown correctly
  - Verify empty state if no allocations
  - Verify pagination works if many allocations
  - Close modal by clicking X button or outside modal
- Test status badges:
  - Verify Allocated status shows green badge
  - Verify Available status shows blue badge
  - Verify Expired status shows red badge
- Test bulk operations (if applicable):
  - Select multiple licenses using checkboxes
  - Verify bulk action menu appears
  - Perform bulk delete (if available)
  - Verify confirmation dialog shows correct count
  - Verify selected licenses are deleted
  - Verify success message appears
- Test real-time updates:
  - Verify license inventory updates when licenses are allocated
  - Verify license inventory updates when licenses expire
  - Verify license inventory updates when licenses are renewed
  - Verify status changes are reflected immediately
- Test error handling:
  - Test with network errors
  - Test with server errors
  - Test with invalid license ID
  - Verify appropriate error messages are shown
  - Verify error states are handled gracefully
- Test edge cases:
  - Test with no licenses in inventory (empty state)
  - Test with licenses in different statuses
  - Test with licenses with zero count
  - Test with expired licenses
  - Test with perpetual licenses (no expiry date)
  - Test with subscription licenses (with expiry date)
  - Test with trial licenses
  - Test with open source licenses
  - Test with Software License category
  - Test with OS License category
  - Test with licenses that have allocations
  - Test with licenses that have no allocations
  - Test with many licenses (verify pagination)
  - Test with licenses expiring soon (1-30 days)
  - Test with licenses expired recently
- Test permissions:
  - Test with view-only permission (verify create/edit/delete are disabled or hidden)
  - Test with create permission (verify create is available)
  - Test with edit permission (verify edit is available, delete may be restricted)
  - Test with full permission (verify all actions are available)
- Test UI responsiveness:
  - Test table on different screen sizes
  - Test modal on different screen sizes
  - Verify table is scrollable on small screens
  - Verify modal is responsive
  - Test on different browsers
- Test export functionality (if applicable):
  - Click Export button
  - Select export format (CSV/Excel)
  - Verify exported file contains correct data
  - Verify exported file includes all columns
  - Verify exported file respects current filters
  - Verify License Keys are masked or excluded in export (for security)
- Test performance:
  - Test with large number of licenses (100+)
  - Verify pagination works correctly
  - Verify search/filter performance
  - Verify table rendering performance

---

### User Story 7: Asset Details Page Functions

**Story ID:** `US-027`  
**Title:** View and Manage Asset Details with Multiple Tabs  
**Priority:** P0 (Critical)  
**Module:** Assets - Asset Details

**User Story:**
```
As a system administrator
I want to view comprehensive asset details and perform actions on assets through a detailed page
So that I can monitor asset status, view asset information across different aspects, and manage asset configurations
```

**Acceptance Criteria:**
- [ ] AC1: User can navigate to Asset Details page by clicking on asset row or "View" action from Assets table
- [ ] AC2: Asset Details page displays asset ID in the URL (e.g., `/assets/:id`)
- [ ] AC3: Asset Details page displays page header with:
  - Back button (ArrowLeftOutlined icon) to navigate back to Assets page
  - Asset name as page title
  - Operational Status indicator (color-coded dot and text)
  - Action dropdown menu (MoreOutlined icon) with options: Edit, Delete, Export, etc.
- [ ] AC4: Asset Details page displays multiple tabs:
  - **Details Tab:** Basic asset information, status, performance metrics, tags
  - **Lifecycle Tab:** Asset lifecycle history and events
  - **Hardware Tab:** Hardware details and specifications
  - **Software Tab:** Installed software list
  - **Patches Tab:** Patches for asset (installed, available, pending)
  - **Vulnerabilities Tab:** Vulnerabilities detected on the asset
  - **Security Tab:** Security compliance data and security status
  - **Network Tab:** Network configuration and network interfaces
  - **Telemetry Tab:** Current and historical telemetry data (CPU, Memory, Disk, etc.)
  - **Audit Log Tab:** Audit log entries for the asset
- [ ] AC5: Details Tab displays:
  - Asset header with asset icon, name, and operational status
  - Asset Information Grid: Asset ID, Asset Type, Hostname, OS, IP Address
  - Status section with status badge and "Manage" button
  - Performance section with metrics: System Uptime, Memory Utilization (with progress bar), CPU Utilization (with progress bar), Disk Utilization (with progress bar)
  - **Cost Properties section** (editable card/section):
    - Cost (currency amount)
    - Currency
    - Current Cost
    - Purchase Date
    - Depreciation Type (dropdown: Straight Line, Declining Balance, Sum of Years, None)
    - Salvage Value
    - Age (calculated or entered)
    - Invoice Number
    - Part Number
    - Edit button to enable editing
    - Save and Cancel buttons when editing
  - **Procurement Properties section** (editable card/section):
    - Purchase Date
    - Purchase Price
    - Currency
    - Vendor / Purchase Vendor
    - Invoice Number
    - Warranty Start Date
    - Warranty End Date / Warranty Expiry Date
    - Warranty Type
    - Warranty Years
    - Warranty Months
    - AMC Start Date
    - AMC End Date / AMC Expiry Date
    - AMC Vendor
    - AMC Cost
    - End of Life
    - End of Support
    - End of Sale
    - End of Extended Support
    - Lease End Date
    - Disposal Date
    - Last Renewal Cost
    - Next Support Renewal Cost
    - Edit button to enable editing
    - Save and Cancel buttons when editing
  - Tags section with tag display and Edit functionality
- [ ] AC6: Tags section in Details Tab allows:
  - Viewing assigned tags
  - Clicking "Edit" button to edit tags
  - Selecting or creating tags using TagSelector component
  - Saving tags with Save button
  - Canceling tag editing with Cancel button
  - Displaying "No tags assigned" when no tags are present
- [ ] AC7: Lifecycle Tab displays asset lifecycle history including:
  - Lifecycle events timeline
  - Status changes
  - Important dates (purchase, deployment, retirement, etc.)
  - **Cost Properties data** (if available):
    - Purchase Date, Cost, Currency, Current Cost
    - Depreciation information (Depreciation Type, Salvage Value, Age)
    - Invoice Number, Part Number
  - **Procurement Properties data** (if available):
    - Purchase Date, Purchase Price, Vendor, Invoice Number
    - Warranty information (Start Date, End Date, Type, Years, Months)
    - AMC information (Start Date, End Date, Vendor, Cost)
    - End of Life, End of Support, End of Sale, End of Extended Support dates
    - Lease End Date, Disposal Date
    - Renewal costs (Last Renewal Cost, Next Support Renewal Cost)
- [ ] AC8: Hardware Tab displays hardware details including:
  - Processor information
  - Memory (RAM) details
  - Storage details
  - Network adapters
  - Other hardware components
- [ ] AC9: Software Tab displays:
  - Table/list of installed software
  - Columns: Software Name, Version, Publisher, Install Date
  - Search and filter functionality (if applicable)
  - Pagination (if many software items)
- [ ] AC10: Patches Tab displays:
  - Table/list of patches for the asset
  - Patch status (Installed, Available, Pending)
  - Patch details and installation history
  - Search and filter functionality (if applicable)
- [ ] AC11: Vulnerabilities Tab displays:
  - Table/list of vulnerabilities detected on the asset
  - Vulnerability severity, CVE ID, description
  - Remediation status
  - Search and filter functionality (if applicable)
- [ ] AC12: Security Tab displays:
  - Security compliance status
  - Security policies and compliance checks
  - Security recommendations
  - Security scan results
- [ ] AC13: Network Tab displays:
  - Network interfaces and configurations
  - IP addresses, MAC addresses
  - Network adapters details
  - Network connectivity information
- [ ] AC14: Telemetry Tab displays:
  - Current telemetry data (CPU, Memory, Disk usage)
  - Historical telemetry charts/graphs
  - Time range selector for historical data
  - Real-time or periodic updates
- [ ] AC15: Audit Log Tab displays:
  - Table/list of audit log entries
  - Columns: Timestamp, Action, User, Details
  - Search and filter functionality
  - Pagination
- [ ] AC16: User can switch between tabs by clicking on tab labels
- [ ] AC17: Each tab loads its data when selected (lazy loading or pre-loaded)
- [ ] AC18: User can edit asset details by clicking "Edit" in action dropdown menu
- [ ] AC19: Edit action opens Edit Asset modal/page with pre-filled asset data
- [ ] AC20: User can delete asset by clicking "Delete" in action dropdown menu
- [ ] AC21: Delete action shows confirmation dialog before deletion
- [ ] AC22: User can export asset details by clicking "Export" in action dropdown menu
- [ ] AC23: Export generates a report/document with asset information
- [ ] AC24: Back button navigates user back to Assets page
- [ ] AC25: Page shows loading state while fetching asset data
- [ ] AC26: Page shows error state if asset is not found or cannot be loaded
- [ ] AC27: All tabs respect user permissions (view-only users cannot edit)
- [ ] AC28: Asset details update in real-time or refresh periodically
- [ ] AC29: Performance metrics (CPU, Memory, Disk) update dynamically
- [ ] AC30: Operational status updates in real-time
- [ ] AC31: Cost Properties section is editable:
  - Clicking "Edit" button enables editing mode
  - All cost property fields become editable
  - Save button saves changes to asset
  - Cancel button discards changes and reverts to original values
  - System validates cost-related fields (numeric values, date formats)
- [ ] AC32: Procurement Properties section is editable:
  - Clicking "Edit" button enables editing mode
  - All procurement property fields become editable
  - Save button saves changes to asset
  - Cancel button discards changes and reverts to original values
  - System validates procurement-related fields (numeric values, date formats)
- [ ] AC33: When Cost Properties or Procurement Properties are saved, data automatically populates in Asset Lifecycle tab
- [ ] AC34: Lifecycle Tab displays cost and procurement data in appropriate lifecycle events or sections
- [ ] AC35: Cost Properties and Procurement Properties can be edited independently (separate Edit buttons)
- [ ] AC36: Both sections can be edited simultaneously or separately

**Test Data:**
```json
{
  "asset": {
    "id": "asset-001",
    "assetId": "AST-001",
    "name": "Windows Server 01",
    "assetType": "Server",
    "hostname": "win-server-01",
    "osType": "Windows",
    "osVersion": "Windows Server 2022",
    "ipAddress": "192.168.1.100",
    "operationalStatus": "Online",
    "status": "Active",
    "performance": {
      "systemUptime": "15 days 8 hours",
      "memoryUtilization": 62.5,
      "cpuUtilization": 45.3,
      "diskUtilization": 34.8
    },
    "cost": {
      "cost": "5000.00",
      "currency": "USD",
      "currentCost": "3500.00",
      "purchaseDate": "2023-01-15",
      "depreciationType": "Straight Line",
      "salvageValue": "500.00",
      "age": "1 year",
      "invoiceNumber": "INV-2023-001",
      "partNumber": "PN-12345"
    },
    "procurement": {
      "purchaseDate": "2023-01-15",
      "purchasePrice": "5000.00",
      "currency": "USD",
      "vendor": "Dell Technologies",
      "invoiceNumber": "INV-2023-001",
      "warrantyStartDate": "2023-01-15",
      "warrantyEndDate": "2026-01-15",
      "warrantyType": "Standard",
      "warrantyYears": 3,
      "warrantyMonths": 0,
      "amcStartDate": "2026-01-16",
      "amcEndDate": "2027-01-15",
      "amcVendor": "Dell Technologies",
      "amcCost": "1000.00",
      "endOfLife": "2030-01-15",
      "endOfSupport": "2028-01-15",
      "endOfSale": "2025-01-15",
      "endOfExtendedSupport": "2029-01-15",
      "leaseEndDate": null,
      "disposalDate": null,
      "lastRenewalCost": "1000.00",
      "nextSupportRenewalCost": "1200.00"
    },
    "tagIds": ["tag-001", "tag-002"],
    "organizationId": "org-001",
    "branchLocation": "Main Branch"
  },
  "lifecycle": [
    {
      "date": "2023-01-15",
      "event": "Purchased",
      "description": "Asset purchased and added to inventory"
    },
    {
      "date": "2023-02-01",
      "event": "Deployed",
      "description": "Asset deployed to production"
    }
  ],
  "hardware": {
    "processor": {
      "name": "Intel Xeon E5-2680",
      "cores": 8,
      "threads": 16,
      "speed": "2.7 GHz"
    },
    "memory": {
      "total": "32 GB",
      "type": "DDR4"
    },
    "storage": {
      "total": "1 TB",
      "type": "SSD"
    }
  },
  "software": [
    {
      "name": "Microsoft Office 365",
      "version": "2021",
      "publisher": "Microsoft",
      "installDate": "2023-02-05"
    }
  ],
  "patches": [
    {
      "id": "patch-001",
      "name": "KB123456",
      "status": "Installed",
      "installDate": "2024-01-10"
    }
  ],
  "vulnerabilities": [
    {
      "id": "vuln-001",
      "cveId": "CVE-2024-1234",
      "severity": "High",
      "description": "Security vulnerability description",
      "status": "Open"
    }
  ],
  "telemetry": {
    "current": {
      "cpu": 45.3,
      "memory": 62.5,
      "disk": 34.8,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "history": [
      {
        "timestamp": "2024-01-15T10:00:00Z",
        "cpu": 42.1,
        "memory": 60.2,
        "disk": 34.5
      }
    ]
  }
}
```

**API Endpoints:**
- `GET /v1/assets/:id` - Get asset details by ID
  - Response: `Asset` object with basic details
- `GET /v1/assets/:id/full` - Get complete asset with all tab data
  - Response: `Asset` object with all related data (lifecycle, hardware, software, patches, vulnerabilities, etc.)
- `GET /v1/assets/:id/lifecycle` - Get asset lifecycle history
  - Response: `{ lifecycle: LifecycleEvent[] }`
- `GET /v1/assets/:id/hardware` - Get hardware details
  - Response: `{ hardware: Hardware }`
- `GET /v1/assets/:id/software` - Get installed software
  - Response: `{ software: Software[], total: number }`
- `GET /v1/assets/:id/patches` - Get patches for asset
  - Response: `{ patches: Patch[], total: number }`
- `GET /v1/assets/:id/vulnerabilities` - Get vulnerabilities for asset
  - Response: `{ vulnerabilities: Vulnerability[], total: number }`
- `GET /v1/assets/:id/security` - Get security compliance data
  - Response: `{ security: SecurityData }`
- `GET /v1/assets/:id/network` - Get network configuration
  - Response: `{ network: NetworkConfig }`
- `GET /v1/assets/:id/telemetry` - Get current telemetry data
  - Response: `{ telemetry: TelemetryData }`
- `GET /v1/assets/:id/telemetry/history` - Get telemetry history
  - Response: `{ history: TelemetryData[], total: number }`
- `GET /v1/assets/:id/audit-log` - Get audit log entries
  - Response: `{ auditLogs: AuditLog[], total: number }`
- `PUT /v1/assets/:id` - Update asset details
  - Request body: `{ name?: string, status?: string, ... }`
  - Response: `{ success: boolean, asset: Asset }`
- `PUT /v1/assets/:id/cost` - Update asset cost properties
  - Request body: `{ cost?: number, currency?: string, currentCost?: number, purchaseDate?: string, depreciationType?: string, salvageValue?: number, age?: string, invoiceNumber?: string, partNumber?: string }`
  - Response: `{ success: boolean, asset: Asset }`
- `PUT /v1/assets/:id/procurement` - Update asset procurement properties
  - Request body: `{ purchaseDate?: string, purchasePrice?: number, currency?: string, vendor?: string, invoiceNumber?: string, warrantyStartDate?: string, warrantyEndDate?: string, warrantyType?: string, warrantyYears?: number, warrantyMonths?: number, amcStartDate?: string, amcEndDate?: string, amcVendor?: string, amcCost?: number, endOfLife?: string, endOfSupport?: string, endOfSale?: string, endOfExtendedSupport?: string, leaseEndDate?: string, disposalDate?: string, lastRenewalCost?: number, nextSupportRenewalCost?: number }`
  - Response: `{ success: boolean, asset: Asset }`
- `PUT /v1/assets/:id/tags` - Update asset tags
  - Request body: `{ tagIds: string[] }`
  - Response: `{ success: boolean, asset: Asset }`
- `DELETE /v1/assets/:id` - Delete an asset
  - Response: `{ success: boolean, message: string }`
- `POST /v1/assets/:id/export` - Export asset details
  - Response: File download (PDF/Excel/CSV)

**UI Components:**
- Page: `/assets/:id` (AssetDetails.tsx)
- Components:
  - **Asset Details Page:**
    - **Page Header:**
      - Back button (ArrowLeftOutlined icon) - navigates to Assets page
      - Asset name as title
      - Operational Status indicator (color-coded dot: green=Online, red=Offline)
      - Action dropdown menu (MoreOutlined icon) with options:
        - Edit (opens edit modal/page)
        - Delete (shows confirmation dialog)
        - Export (exports asset details)
        - Refresh (reloads asset data)
    - **Tabs Component:**
      - Tab labels: Details, Asset Life cycle, Hardware, Software, Patches, Vulnerabilities, Security, Network, Telemetry, Audit Log
      - Tab content area (loads content when tab is selected)
    - **Details Tab:**
      - Asset header with icon, name, operational status
      - Asset Information Grid (Row/Col layout):
        - Asset ID, Asset Type, Hostname, OS, IP Address
      - Status section:
        - Status badge (color-coded)
        - "Manage" button (opens status management)
      - Performance Card:
        - System Uptime
        - Memory Utilization (percentage with Progress bar)
        - CPU Utilization (percentage with Progress bar)
        - Disk Utilization (percentage with Progress bar)
      - **Cost Properties Card:**
        - Card title: "Cost Properties"
        - Edit button in card header (switches to edit mode)
        - When not editing:
          - Display fields (read-only): Cost, Currency, Current Cost, Purchase Date, Depreciation Type, Salvage Value, Age, Invoice Number, Part Number
        - When editing:
          - Form fields (editable):
            - Cost: Number input (currency amount)
            - Currency: Dropdown/Select (USD, EUR, GBP, etc.)
            - Current Cost: Number input (currency amount)
            - Purchase Date: DatePicker
            - Depreciation Type: Dropdown/Select (Straight Line, Declining Balance, Sum of Years, None)
            - Salvage Value: Number input
            - Age: Number input or calculated field
            - Invoice Number: Text input
            - Part Number: Text input
          - Save button (primary) - saves changes
          - Cancel button (default) - discards changes
      - **Procurement Properties Card:**
        - Card title: "Procurement Properties"
        - Edit button in card header (switches to edit mode)
        - When not editing:
          - Display fields (read-only): Purchase Date, Purchase Price, Currency, Vendor, Invoice Number, Warranty Start Date, Warranty End Date, Warranty Type, Warranty Years, Warranty Months, AMC Start Date, AMC End Date, AMC Vendor, AMC Cost, End of Life, End of Support, End of Sale, End of Extended Support, Lease End Date, Disposal Date, Last Renewal Cost, Next Support Renewal Cost
        - When editing:
          - Form fields (editable):
            - Purchase Date: DatePicker
            - Purchase Price: Number input (currency amount)
            - Currency: Dropdown/Select (USD, EUR, GBP, etc.)
            - Vendor / Purchase Vendor: Text input
            - Invoice Number: Text input
            - Warranty Start Date: DatePicker
            - Warranty End Date / Warranty Expiry Date: DatePicker
            - Warranty Type: Text input or Dropdown
            - Warranty Years: Number input
            - Warranty Months: Number input
            - AMC Start Date: DatePicker
            - AMC End Date / AMC Expiry Date: DatePicker
            - AMC Vendor: Text input
            - AMC Cost: Number input (currency amount)
            - End of Life: DatePicker
            - End of Support: DatePicker
            - End of Sale: DatePicker
            - End of Extended Support: DatePicker
            - Lease End Date: DatePicker
            - Disposal Date: DatePicker
            - Last Renewal Cost: Number input (currency amount)
            - Next Support Renewal Cost: Number input (currency amount)
          - Save button (primary) - saves changes
          - Cancel button (default) - discards changes
      - Tags Card:
        - Tag display (TagDisplay component) when not editing
        - Tag selector (TagSelector component) when editing
        - Edit button (switches to edit mode)
        - Save and Cancel buttons (when editing)
    - **Lifecycle Tab:**
      - Timeline or table of lifecycle events
      - Event details: Date, Event Type, Description
      - **Cost Properties Section** (if data exists):
        - Purchase Date, Cost, Currency, Current Cost
        - Depreciation information (Depreciation Type, Salvage Value, Age)
        - Invoice Number, Part Number
      - **Procurement Properties Section** (if data exists):
        - Purchase Date, Purchase Price, Vendor, Invoice Number
        - Warranty information (Start Date, End Date, Type, Years, Months)
        - AMC information (Start Date, End Date, Vendor, Cost)
        - End of Life, End of Support, End of Sale, End of Extended Support dates
        - Lease End Date, Disposal Date
        - Renewal costs (Last Renewal Cost, Next Support Renewal Cost)
    - **Hardware Tab:**
      - Hardware details sections:
        - Processor information
        - Memory details
        - Storage details
        - Network adapters
        - Other components
    - **Software Tab:**
      - Software table with columns: Software Name, Version, Publisher, Install Date
      - Search input (if applicable)
      - Pagination (if applicable)
    - **Patches Tab:**
      - Patches table with columns: Patch Name, Status, Install Date, etc.
      - Search and filter (if applicable)
      - Pagination (if applicable)
    - **Vulnerabilities Tab:**
      - Vulnerabilities table with columns: CVE ID, Severity, Description, Status
      - Search and filter (if applicable)
      - Pagination (if applicable)
    - **Security Tab:**
      - Security compliance status
      - Security policies and checks
      - Security recommendations
    - **Network Tab:**
      - Network interfaces table/list
      - IP addresses, MAC addresses
      - Network adapter details
    - **Telemetry Tab:**
      - Current telemetry display (CPU, Memory, Disk)
      - Historical telemetry charts (line charts, area charts)
      - Time range selector
      - Real-time updates indicator
    - **Audit Log Tab:**
      - Audit log table with columns: Timestamp, Action, User, Details
      - Search input
      - Pagination
    - Loading spinner while fetching data
    - Error state component if asset not found
  - **Edit Asset Modal/Page:** (EditAssetModal.tsx or EditAssetPage.tsx)
    - Form with asset fields
    - Save, Cancel buttons
  - **Delete Confirmation Dialog:**
    - Message: "Are you sure you want to delete this asset?"
    - Warning about consequences
    - Confirm and Cancel buttons

- User Actions:
  1. Navigate to Asset Details page by clicking on asset row or "View" action
  2. Verify page URL contains asset ID
  3. View page header with asset name and operational status
  4. Click Back button to return to Assets page
  5. Click action dropdown menu to view options
  6. Switch between tabs:
    - Click Details tab
    - Click Asset Life cycle tab
    - Click Hardware tab
    - Click Software tab
    - Click Patches tab
    - Click Vulnerabilities tab
    - Click Security tab
    - Click Network tab
    - Click Telemetry tab
    - Click Audit Log tab
  7. View Details tab content:
    - Verify asset header displays correctly
    - Verify asset information grid shows all fields
    - Verify status section with badge and Manage button
    - Verify performance metrics with progress bars
    - View Cost Properties section
    - View Procurement Properties section
    - View tags section
  8. Edit Cost Properties in Details tab:
    - Click "Edit" button in Cost Properties card
    - Verify all cost property fields become editable
    - Modify cost properties (Cost, Currency, Current Cost, Purchase Date, Depreciation Type, Salvage Value, Age, Invoice Number, Part Number)
    - Click Save to save changes
    - Verify cost properties are updated
    - Click Cancel to discard changes
    - Verify cost properties revert to original values
    - Verify data populates in Lifecycle tab after saving
  9. Edit Procurement Properties in Details tab:
    - Click "Edit" button in Procurement Properties card
    - Verify all procurement property fields become editable
    - Modify procurement properties (Purchase Date, Purchase Price, Vendor, Warranty dates, AMC information, End of Life dates, etc.)
    - Click Save to save changes
    - Verify procurement properties are updated
    - Click Cancel to discard changes
    - Verify procurement properties revert to original values
    - Verify data populates in Lifecycle tab after saving
  10. Edit tags in Details tab:
    - Click "Edit" button in Tags section
    - Verify TagSelector component appears
    - Select or create tags
    - Click Save to save tags
    - Click Cancel to cancel editing
    - Verify tags are updated after saving
  11. View Lifecycle tab:
    - Verify lifecycle events are displayed
    - Verify event details are shown
    - Verify Cost Properties section is displayed (if cost data exists)
    - Verify Procurement Properties section is displayed (if procurement data exists)
    - Verify cost and procurement data matches data from Details tab
  10. View Hardware tab:
    - Verify hardware details are displayed
    - Verify all hardware components are shown
  11. View Software tab:
    - Verify software list is displayed
    - Use search if available
    - Use pagination if many software items
  12. View Patches tab:
    - Verify patches list is displayed
    - Verify patch statuses are shown
  13. View Vulnerabilities tab:
    - Verify vulnerabilities list is displayed
    - Verify severity levels are shown
  14. View Security tab:
    - Verify security compliance status
    - Verify security recommendations
  15. View Network tab:
    - Verify network interfaces are displayed
    - Verify IP and MAC addresses are shown
  16. View Telemetry tab:
    - Verify current telemetry data
    - View historical telemetry charts
    - Select different time ranges
  17. View Audit Log tab:
    - Verify audit log entries are displayed
    - Search audit logs
    - Use pagination
  18. Click "Edit" in action dropdown:
    - Verify Edit modal/page opens
    - Modify asset details
    - Save changes
  19. Click "Delete" in action dropdown:
    - Verify confirmation dialog appears
    - Confirm deletion
    - Verify asset is deleted and redirected to Assets page
  20. Click "Export" in action dropdown:
    - Verify asset details are exported
    - Verify exported file contains asset information

**Test Notes:**
- Test with admin role (should have full access: view, edit, delete)
- Test with regular user role (should have view access, may not have edit/delete permissions)
- Test navigation:
  - Navigate to Asset Details page from Assets table
  - Verify URL contains correct asset ID
  - Verify page title shows asset name
  - Click Back button to return to Assets page
- Test page header:
  - Verify asset name is displayed
  - Verify operational status indicator is shown and color-coded
  - Verify action dropdown menu is available
  - Click action dropdown to view options
- Test tab navigation:
  - Switch between all tabs
  - Verify each tab loads its content
  - Verify tab content is displayed correctly
  - Verify active tab is highlighted
- Test Details tab:
  - Verify asset header displays correctly
  - Verify asset information grid shows: Asset ID, Asset Type, Hostname, OS, IP Address
  - Verify status section shows status badge
  - Click "Manage" button in status section (if functional)
  - Verify performance section shows:
    - System Uptime
    - Memory Utilization with progress bar
    - CPU Utilization with progress bar
    - Disk Utilization with progress bar
  - Verify performance metrics update dynamically
  - Test Cost Properties section:
    - Verify Cost Properties card is displayed
    - Verify all cost property fields are shown (Cost, Currency, Current Cost, Purchase Date, Depreciation Type, Salvage Value, Age, Invoice Number, Part Number)
    - Click "Edit" button in Cost Properties card
    - Verify all fields become editable
    - Modify cost properties:
      - Change Cost value
      - Change Currency
      - Change Current Cost
      - Change Purchase Date
      - Change Depreciation Type
      - Change Salvage Value
      - Change Age
      - Change Invoice Number
      - Change Part Number
    - Click Save to save changes
    - Verify cost properties are updated
    - Verify success message appears
    - Verify data is saved to asset
    - Click Cancel to discard changes
    - Verify cost properties revert to original values
    - Test form validation (invalid numeric values, invalid dates)
  - Test Procurement Properties section:
    - Verify Procurement Properties card is displayed
    - Verify all procurement property fields are shown
    - Click "Edit" button in Procurement Properties card
    - Verify all fields become editable
    - Modify procurement properties:
      - Change Purchase Date, Purchase Price, Currency, Vendor
      - Change Warranty dates and information
      - Change AMC dates and information
      - Change End of Life, End of Support dates
      - Change other procurement fields
    - Click Save to save changes
    - Verify procurement properties are updated
    - Verify success message appears
    - Verify data is saved to asset
    - Click Cancel to discard changes
    - Verify procurement properties revert to original values
    - Test form validation (invalid numeric values, invalid dates)
  - Test tags section:
    - View assigned tags
    - Click "Edit" button
    - Verify TagSelector component appears
    - Select existing tags
    - Create new tags (if allowed)
    - Click Save to save tags
    - Verify tags are updated
    - Click Cancel to cancel editing
    - Verify tags revert to original state
- Test Lifecycle tab:
  - Verify lifecycle events are displayed
  - Verify event timeline or table is shown
  - Verify event details include date, event type, description
  - Verify Cost Properties section is displayed (if cost data exists)
  - Verify Procurement Properties section is displayed (if procurement data exists)
  - Verify cost data matches data from Details tab:
    - Purchase Date, Cost, Currency, Current Cost
    - Depreciation Type, Salvage Value, Age
    - Invoice Number, Part Number
  - Verify procurement data matches data from Details tab:
    - Purchase Date, Purchase Price, Vendor, Invoice Number
    - Warranty information (dates, type, years, months)
    - AMC information (dates, vendor, cost)
    - End of Life, End of Support, End of Sale dates
    - Lease End Date, Disposal Date
    - Renewal costs
  - Edit Cost Properties in Details tab and verify data appears in Lifecycle tab
  - Edit Procurement Properties in Details tab and verify data appears in Lifecycle tab
- Test Hardware tab:
  - Verify hardware details are displayed
  - Verify processor information is shown
  - Verify memory details are shown
  - Verify storage details are shown
  - Verify network adapters are shown
- Test Software tab:
  - Verify software list is displayed
  - Verify columns: Software Name, Version, Publisher, Install Date
  - Test search functionality (if available)
  - Test pagination (if many software items)
- Test Patches tab:
  - Verify patches list is displayed
  - Verify patch statuses are shown (Installed, Available, Pending)
  - Test search and filter (if available)
  - Test pagination (if many patches)
- Test Vulnerabilities tab:
  - Verify vulnerabilities list is displayed
  - Verify columns: CVE ID, Severity, Description, Status
  - Verify severity levels are color-coded
  - Test search and filter (if available)
  - Test pagination (if many vulnerabilities)
- Test Security tab:
  - Verify security compliance status is displayed
  - Verify security policies are shown
  - Verify security recommendations are displayed
  - Verify security scan results are shown
- Test Network tab:
  - Verify network interfaces are displayed
  - Verify IP addresses are shown
  - Verify MAC addresses are shown
  - Verify network adapter details are shown
- Test Telemetry tab:
  - Verify current telemetry data is displayed (CPU, Memory, Disk)
  - Verify historical telemetry charts are shown
  - Select different time ranges
  - Verify charts update based on time range
  - Verify real-time updates (if enabled)
- Test Audit Log tab:
  - Verify audit log entries are displayed
  - Verify columns: Timestamp, Action, User, Details
  - Test search functionality
  - Test pagination
- Test Edit Asset functionality:
  - Click "Edit" in action dropdown
  - Verify Edit modal/page opens
  - Verify form is pre-filled with asset data
  - Modify asset details
  - Click Save to update
  - Verify asset is updated
  - Click Cancel to close without saving
- Test Delete Asset functionality:
  - Click "Delete" in action dropdown
  - Verify confirmation dialog appears
  - Verify dialog message is clear
  - Click Confirm to delete
  - Verify asset is deleted
  - Verify redirect to Assets page
  - Click Cancel to close dialog without deleting
  - Verify asset remains
- Test Export functionality:
  - Click "Export" in action dropdown
  - Verify export process starts
  - Verify exported file is downloaded
  - Verify exported file contains asset information
- Test real-time updates:
  - Verify operational status updates in real-time
  - Verify performance metrics update dynamically
  - Verify telemetry data updates (if real-time enabled)
- Test error handling:
  - Test with invalid asset ID
  - Verify error state is shown
  - Verify appropriate error message
  - Test with network errors
  - Verify error handling is graceful
- Test loading states:
  - Verify loading spinner is shown while fetching data
  - Verify loading state for each tab
  - Verify smooth transitions between loading and loaded states
- Test permissions:
  - Test with view-only permission (verify edit/delete are disabled or hidden)
  - Test with edit permission (verify edit is available)
  - Test with full permission (verify all actions are available)
- Test UI responsiveness:
  - Test page on different screen sizes
  - Verify tabs are accessible on mobile
  - Verify content is scrollable
  - Test on different browsers
- Test performance:
  - Test with asset that has many software items
  - Test with asset that has many patches
  - Test with asset that has many vulnerabilities
  - Verify pagination works correctly
  - Verify tab switching is smooth
  - Verify data loading is efficient

---

### User Story 8: User Logout

**Story ID:** `US-028`  
**Title:** User Logout from Application  
**Priority:** P0 (Critical)  
**Module:** Auth - User Session Management

**User Story:**
```
As a logged-in user
I want to log out from the application through my avatar menu
So that I can securely end my session and protect my account from unauthorized access
```

**Acceptance Criteria:**
- [ ] AC1: User can see avatar icon in the top right corner of the application
- [ ] AC2: Clicking on avatar icon opens a dropdown/list menu with options
- [ ] AC3: "Logout" or "Sign Out" option is available in the avatar dropdown menu
- [ ] AC4: Clicking "Logout" option initiates logout process
- [ ] AC5: System sends logout request to server to revoke refresh tokens
- [ ] AC6: System revokes all refresh tokens associated with the user account
- [ ] AC7: System removes access token from browser storage (localStorage/sessionStorage)
- [ ] AC8: System removes refresh token from browser storage (localStorage/sessionStorage)
- [ ] AC9: System clears user session data
- [ ] AC10: Success message is displayed: "Logged out successfully" or similar
- [ ] AC11: User is redirected to login page after successful logout
- [ ] AC12: User cannot access protected routes after logout
- [ ] AC13: System creates an audit log entry for logout action
- [ ] AC14: If logout request fails, system still clears local tokens and redirects to login (graceful degradation)
- [ ] AC15: User session is completely terminated after logout
- [ ] AC16: All API requests after logout return 401 Unauthorized (if attempted)
- [ ] AC17: User must log in again to access the application after logout
- [ ] AC18: Logout works from any page in the application
- [ ] AC19: Logout process is quick and responsive (no significant delay)
- [ ] AC20: Multiple logout attempts are handled gracefully (idempotent)

**Test Data:**
```json
{
  "loggedInUser": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Administrator"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "logoutResponse": {
    "message": "Logged out successfully"
  }
}
```

**API Endpoints:**
- `POST /v1/auth/logout` - Logout user and revoke refresh tokens
  - Headers: `Authorization: Bearer <accessToken>` (required)
  - Response: `{ message: "Logged out successfully" }`
  - Status Codes:
    - 200: Logout successful
    - 401: Unauthorized (invalid or expired token)
    - 500: Server error

**UI Components:**
- **Avatar Dropdown Menu:** (in application header/navbar)
  - Avatar icon (UserOutlined or user avatar image) in top right corner
  - Dropdown menu (Menu component) with options:
    - User name/email (display only)
    - Divider
    - "Change Password" option (if applicable)
    - "Profile" or "Settings" option (if applicable)
    - Divider
    - "Logout" or "Sign Out" option (LogoutOutlined icon)
  - Clicking avatar icon opens/closes dropdown
  - Clicking outside dropdown closes it
- **Login Page:** (redirected to after logout)
  - Login form
  - URL: `/login` or `/auth/login`

- User Actions:
  1. User is logged in and viewing any page in the application
  2. Locate avatar icon in top right corner
  3. Click on avatar icon
  4. Verify dropdown menu opens
  5. Verify "Logout" option is visible in dropdown
  6. Click "Logout" option
  7. Verify logout process is initiated
  8. Verify success message appears: "Logged out successfully"
  9. Verify user is redirected to login page
  10. Verify tokens are removed from browser storage
  11. Verify user cannot access protected routes
  12. Attempt to access protected route (should redirect to login)
  13. Log in again to verify logout was successful

**Test Notes:**
- Test with different user roles (admin, regular user)
- Test logout from different pages:
  - Dashboard
  - Assets page
  - Settings page
  - Any other protected page
- Test avatar dropdown:
  - Click avatar icon to open dropdown
  - Verify "Logout" option is visible
  - Click "Logout" option
  - Verify dropdown closes
- Test logout process:
  - Click "Logout" option
  - Verify logout request is sent to server
  - Verify success message appears
  - Verify redirect to login page
  - Verify tokens are removed from localStorage
  - Verify user session is cleared
- Test token removal:
  - Before logout: Verify accessToken and refreshToken exist in localStorage
  - After logout: Verify both tokens are removed from localStorage
  - Verify no tokens remain in browser storage
- Test session termination:
  - After logout, attempt to make API request
  - Verify request returns 401 Unauthorized
  - Verify user cannot access protected routes
- Test redirect:
  - Logout from different pages
  - Verify redirect to login page works from all pages
  - Verify login page URL is correct
- Test audit logging:
  - Verify audit log entry is created for logout
  - Verify audit log includes user ID, timestamp, action type
- Test error handling:
  - Test logout with network error (should still clear tokens and redirect)
  - Test logout with server error (should still clear tokens and redirect)
  - Test graceful degradation (logout works even if server request fails)
- Test multiple logout attempts:
  - Click "Logout" multiple times quickly
  - Verify system handles gracefully (idempotent)
  - Verify no errors occur
- Test concurrent sessions:
  - Logout from one device/browser
  - Verify other devices/sessions are not affected (or verify they are invalidated if that's the design)
- Test after logout:
  - Attempt to navigate to protected route
  - Verify redirect to login page
  - Attempt to make API call
  - Verify 401 Unauthorized response
  - Log in again
  - Verify new session is created
- Test UI responsiveness:
  - Test avatar dropdown on different screen sizes
  - Verify dropdown is accessible
  - Test on different browsers
- Test security:
  - Verify tokens are completely removed
  - Verify no sensitive data remains in browser storage
  - Verify session cannot be resumed after logout
  - Verify refresh tokens are revoked on server

---

### User Story 9: Notification Function

**Story ID:** `US-029`  
**Title:** View and Manage Notifications  
**Priority:** P0 (Critical)  
**Module:** Notifications - User Notifications

**User Story:**
```
As a logged-in user
I want to view, manage, and interact with notifications through a notification bell icon
So that I can stay informed about important events, alerts, and system updates
```

**Acceptance Criteria:**
- [ ] AC1: User can see notification bell icon (BellOutlined) in the top right corner of the application header/navbar
- [ ] AC2: Notification bell icon displays a badge with unread notification count (if there are unread notifications)
- [ ] AC3: Badge shows number of unread notifications (e.g., "5" if 5 unread notifications)
- [ ] AC4: Badge is hidden when there are no unread notifications
- [ ] AC5: Clicking on notification bell icon opens a notification dropdown panel
- [ ] AC6: Notification dropdown panel displays:
  - Header section with "Notifications" title
  - "Mark all as read" button (visible when there are unread notifications)
  - Notification list/content area
  - Empty state message when no notifications exist
- [ ] AC7: Each notification in the list displays:
  - Notification icon (color-coded by type: success=green, warning=yellow, error=red, info=blue)
  - Notification title (bold text)
  - Notification message/description
  - Timestamp (relative time, e.g., "2h ago", "1d ago")
  - Mark as read button (CheckOutlined icon, visible only for unread notifications)
  - Delete button (DeleteOutlined icon, visible for all notifications)
- [ ] AC8: Unread notifications are visually distinct (e.g., different background color, highlighted)
- [ ] AC9: Read notifications have normal background color
- [ ] AC10: User can mark a single notification as read by clicking the "Mark as read" button (CheckOutlined icon)
- [ ] AC11: When a notification is marked as read, it updates to read state immediately
- [ ] AC12: Unread count badge updates automatically when notification is marked as read
- [ ] AC13: User can mark all notifications as read by clicking "Mark all as read" button in dropdown header
- [ ] AC14: When "Mark all as read" is clicked, all unread notifications become read
- [ ] AC15: Unread count badge becomes zero or hidden after marking all as read
- [ ] AC16: User can delete a notification by clicking the "Delete" button (DeleteOutlined icon)
- [ ] AC17: When a notification is deleted, it is removed from the list immediately
- [ ] AC18: Unread count badge updates automatically when notification is deleted
- [ ] AC19: User can click on a notification (if it has a link) to navigate to the related page
- [ ] AC20: When a notification with a link is clicked, it is automatically marked as read (if unread)
- [ ] AC21: When a notification with a link is clicked, user is navigated to the linked page and dropdown closes
- [ ] AC22: Notification dropdown shows loading state (spinner) while fetching notifications
- [ ] AC23: Notification dropdown shows empty state message "No notifications" when there are no notifications
- [ ] AC24: Notification dropdown is scrollable when there are many notifications
- [ ] AC25: Notification dropdown closes when clicking outside of it
- [ ] AC26: Notification dropdown closes when pressing Escape key
- [ ] AC27: Notifications are sorted by creation date (newest first)
- [ ] AC28: Notification types are color-coded with appropriate icons:
  - Success: Green icon (CheckCircleFilled)
  - Warning: Yellow icon (WarningFilled)
  - Error: Red icon (CloseCircleFilled)
  - Info: Blue icon (InfoCircleFilled)
- [ ] AC29: Timestamp displays relative time (e.g., "Just now", "5m ago", "2h ago", "1d ago")
- [ ] AC30: Notifications update in real-time or refresh periodically
- [ ] AC31: Unread count badge updates automatically when new notifications arrive
- [ ] AC32: System creates notifications for various events (password expiration warnings, system alerts, etc.)

**Test Data:**
```json
{
  "notifications": [
    {
      "id": "notif-001",
      "title": "Password Expiring Soon",
      "message": "Your password will expire in 5 days. Please change your password.",
      "type": "warning",
      "read": false,
      "createdAt": "2024-01-15T10:00:00Z",
      "link": "/settings/change-password"
    },
    {
      "id": "notif-002",
      "title": "Asset Discovery Completed",
      "message": "Discovery job 'Network Scan 01' has completed. 15 devices found.",
      "type": "success",
      "read": false,
      "createdAt": "2024-01-15T09:30:00Z",
      "link": "/discovery/scans"
    },
    {
      "id": "notif-003",
      "title": "System Alert",
      "message": "High CPU usage detected on asset AST-001",
      "type": "error",
      "read": true,
      "createdAt": "2024-01-15T08:00:00Z",
      "link": "/assets/asset-001"
    },
    {
      "id": "notif-004",
      "title": "License Expiring",
      "message": "Windows Server 2022 license will expire in 30 days",
      "type": "info",
      "read": false,
      "createdAt": "2024-01-14T15:00:00Z",
      "link": "/assets/license-inventory"
    }
  ],
  "unreadCount": 3
}
```

**API Endpoints:**
- `GET /v1/notifications` - Get all notifications for current user
  - Response: `Notification[]` array of notifications
- `GET /v1/notifications/unread-count` - Get count of unread notifications
  - Response: `{ count: number }`
- `PUT /v1/notifications/:id/read` - Mark a notification as read
  - Response: `{ success: boolean }`
- `PUT /v1/notifications/mark-all-read` - Mark all notifications as read
  - Response: `{ success: boolean }`
- `DELETE /v1/notifications/:id` - Delete a notification
  - Response: `{ success: boolean }`
- `DELETE /v1/notifications` - Clear all notifications
  - Response: `{ success: boolean }`

**UI Components:**
- **Notification Bell Icon:** (in application header/navbar)
  - Bell icon (BellOutlined) in top right corner
  - Badge component showing unread count
  - Badge is hidden when count is 0
  - Clickable to open dropdown
- **Notification Dropdown:** (NotificationDropdown.tsx)
  - Dropdown panel (width: 360px, maxHeight: 480px)
  - **Header Section:**
    - "Notifications" title (Text strong)
    - "Mark all as read" button (visible when unreadCount > 0)
  - **Content Section:**
    - Loading spinner (Spin component) while fetching
    - Empty state (Empty component) when no notifications
    - Notification list (List component) when notifications exist
  - **Notification Item:**
    - Container with hover effects
    - Background color: #f6ffed for unread, #fff for read
    - **Left Section:**
      - Notification icon (color-coded by type)
    - **Middle Section:**
      - Title (Text strong, fontSize: 13)
      - Message (Text type="secondary", fontSize: 12)
      - Timestamp (Text type="secondary", fontSize: 11, relative time)
    - **Right Section:**
      - Mark as read button (CheckOutlined icon, visible only for unread)
      - Delete button (DeleteOutlined icon, visible for all)
    - Clickable if notification has link (cursor: pointer)
    - Navigates to linked page when clicked

- User Actions:
  1. View notification bell icon in top right corner
  2. Verify unread count badge is displayed (if unread notifications exist)
  3. Click on notification bell icon
  4. Verify notification dropdown opens
  5. View notification list:
    - Verify all notifications are displayed
    - Verify unread notifications are highlighted
    - Verify read notifications have normal background
    - Verify notification icons are color-coded
    - Verify timestamps are displayed
  6. Mark single notification as read:
    - Click "Mark as read" button (CheckOutlined icon) for an unread notification
    - Verify notification becomes read (background changes)
    - Verify unread count badge decreases
    - Verify "Mark as read" button disappears for that notification
  7. Mark all notifications as read:
    - Click "Mark all as read" button in dropdown header
    - Verify all notifications become read
    - Verify unread count badge becomes zero or hidden
    - Verify "Mark all as read" button disappears
  8. Delete notification:
    - Click "Delete" button (DeleteOutlined icon) for a notification
    - Verify notification is removed from list
    - Verify unread count badge updates (if deleted notification was unread)
  9. Click on notification with link:
    - Click on a notification that has a link
    - Verify notification is marked as read (if unread)
    - Verify navigation to linked page
    - Verify dropdown closes
  10. Close dropdown:
    - Click outside dropdown
    - Verify dropdown closes
    - Press Escape key
    - Verify dropdown closes
  11. Verify empty state:
    - When no notifications exist
    - Verify "No notifications" message is displayed
    - Verify unread count badge is hidden

**Test Notes:**
- Test with different user roles (admin, regular user)
- Test notification bell icon:
  - Verify bell icon is visible in top right corner
  - Verify unread count badge is displayed when there are unread notifications
  - Verify badge shows correct count
  - Verify badge is hidden when there are no unread notifications
  - Click bell icon to open dropdown
- Test notification dropdown:
  - Click bell icon
  - Verify dropdown opens
  - Verify "Notifications" title is displayed
  - Verify "Mark all as read" button is shown when there are unread notifications
  - Verify "Mark all as read" button is hidden when all notifications are read
  - Click outside dropdown to close
  - Press Escape key to close
- Test notification list display:
  - Verify all notifications are displayed
  - Verify notifications are sorted by date (newest first)
  - Verify unread notifications have highlighted background (#f6ffed)
  - Verify read notifications have normal background (#fff)
  - Verify notification icons are displayed and color-coded:
    - Success: Green (CheckCircleFilled)
    - Warning: Yellow (WarningFilled)
    - Error: Red (CloseCircleFilled)
    - Info: Blue (InfoCircleFilled)
  - Verify notification title is displayed (bold)
  - Verify notification message is displayed
  - Verify timestamp is displayed (relative time)
- Test mark as read functionality:
  - Click "Mark as read" button for an unread notification
  - Verify notification background changes to read state
  - Verify "Mark as read" button disappears
  - Verify unread count badge decreases by 1
  - Verify notification is marked as read on server
  - Test with multiple unread notifications
- Test mark all as read functionality:
  - Verify "Mark all as read" button is visible when there are unread notifications
  - Click "Mark all as read" button
  - Verify all notifications become read
  - Verify all "Mark as read" buttons disappear
  - Verify unread count badge becomes zero or hidden
  - Verify "Mark all as read" button disappears
  - Verify all notifications are marked as read on server
- Test delete notification functionality:
  - Click "Delete" button for a notification
  - Verify notification is removed from list immediately
  - Verify unread count badge updates (if deleted notification was unread)
  - Verify notification is deleted on server
  - Test deleting multiple notifications
  - Test deleting all notifications (should show empty state)
- Test notification click/navigation:
  - Click on notification with link
  - Verify notification is marked as read (if unread)
  - Verify navigation to linked page
  - Verify dropdown closes after navigation
  - Click on notification without link
  - Verify no navigation occurs
  - Verify notification can still be marked as read or deleted
- Test loading state:
  - Verify loading spinner is shown while fetching notifications
  - Verify spinner disappears when data is loaded
- Test empty state:
  - When no notifications exist
  - Verify "No notifications" message is displayed
  - Verify unread count badge is hidden
  - Verify "Mark all as read" button is not shown
- Test real-time updates:
  - Verify new notifications appear automatically (if real-time enabled)
  - Verify unread count badge updates when new notifications arrive
  - Verify notifications refresh periodically (if polling enabled)
- Test timestamp display:
  - Verify timestamps show relative time:
    - "Just now" for very recent
    - "5m ago" for minutes
    - "2h ago" for hours
    - "1d ago" for days
  - Verify timestamps update dynamically
- Test notification types:
  - Test with success notifications (green icon)
  - Test with warning notifications (yellow icon)
  - Test with error notifications (red icon)
  - Test with info notifications (blue icon)
- Test with many notifications:
  - Test with 50+ notifications
  - Verify dropdown is scrollable
  - Verify performance is acceptable
  - Verify pagination or virtual scrolling works (if implemented)
- Test error handling:
  - Test with network errors when fetching notifications
  - Test with server errors
  - Verify error messages are shown appropriately
  - Verify graceful degradation
- Test UI responsiveness:
  - Test notification dropdown on different screen sizes
  - Verify dropdown positioning is correct
  - Verify dropdown doesn't overflow screen
  - Test on different browsers
- Test accessibility:
  - Verify keyboard navigation works
  - Verify screen reader compatibility
  - Verify focus management
- Test edge cases:
  - Test with no notifications
  - Test with all read notifications
  - Test with all unread notifications
  - Test with mixed read/unread notifications
  - Test rapid clicking (mark as read, delete)
  - Test concurrent operations

---

### User Story 10: Global Search Function

**Story ID:** `US-030`  
**Title:** Global Search Across All Entities  
**Priority:** P1 (High)  
**Module:** Search - Global Search

**User Story:**
```
As a logged-in user
I want to search across all entities (assets, patches, vulnerabilities, agents, users) using a global search bar
So that I can quickly find any item in the system without navigating to specific pages
```

**Acceptance Criteria:**
- [ ] AC1: User can see a global search input field in the application header/navbar (typically in top center or top right)
- [ ] AC2: Global search input field has a search icon (SearchOutlined) and placeholder text (e.g., "Search assets, patches, vulnerabilities...")
- [ ] AC3: User can type search query in the global search input field
- [ ] AC4: Global search searches across multiple entity types:
  - Assets (by name, assetId, serialNumber, assetTag, IP address, hostname)
  - Patches (by patchId, title, software, KB number, CVE numbers)
  - Vulnerabilities (by CVE ID, title, description)
  - Agents (by name, hostname, IP address, machineId)
  - Users (by name, email, username)
- [ ] AC5: Search results appear in a dropdown panel below the search input as user types (minimum 2 characters)
- [ ] AC6: Search results are grouped by entity type with section headers:
  - "Assets" (with count, e.g., "Assets (5)")
  - "Patches" (with count, e.g., "Patches (3)")
  - "Vulnerabilities" (with count, e.g., "Vulnerabilities (2)")
  - "Agents" (with count, e.g., "Agents (4)")
  - "Users" (with count, e.g., "Users (1)")
- [ ] AC7: Each search result item displays:
  - Entity icon (appropriate icon for each type)
  - Entity name/title (highlighted matching text)
  - Additional context (e.g., asset ID, patch ID, CVE ID, email)
  - Entity type indicator (optional)
- [ ] AC8: Search results show maximum 5-10 items per entity type (with "View all X results" link if more exist)
- [ ] AC9: User can click on a search result item to navigate to the entity's detail page
- [ ] AC10: Clicking on a search result closes the search dropdown
- [ ] AC11: User can click "View all X results" link to navigate to the entity's list page with search query applied
- [ ] AC12: Search dropdown shows "No results found" message when search query matches nothing
- [ ] AC13: Search dropdown shows loading state (spinner) while fetching results
- [ ] AC14: Search is case-insensitive
- [ ] AC15: Search supports partial matching (e.g., "win" matches "Windows", "win10")
- [ ] AC16: Search dropdown closes when clicking outside of it
- [ ] AC17: Search dropdown closes when pressing Escape key
- [ ] AC18: User can use keyboard navigation (Arrow keys, Enter) to navigate and select results
- [ ] AC19: Search results are sorted by relevance (exact matches first, then partial matches)
- [ ] AC20: Search query is debounced (waits for user to stop typing before searching, e.g., 300ms delay)
- [ ] AC21: Global search is accessible from any page in the application
- [ ] AC22: Search input maintains focus after selecting a result (for quick subsequent searches)
- [ ] AC23: Search input can be cleared using a clear button (X icon) when text is entered
- [ ] AC24: Search results are limited to entities the user has permission to view (respects RBAC)
- [ ] AC25: Search dropdown shows entity count badges for each type (e.g., "Assets (5)")
- [ ] AC26: Search highlights matching text in results (optional, but recommended)
- [ ] AC27: Search supports special characters and numbers
- [ ] AC28: Search works with empty query (shows recent searches or popular items, if implemented)
- [ ] AC29: Search dropdown has a maximum height and is scrollable when there are many results
- [ ] AC30: Search results update in real-time as user types (with debouncing)

**Test Data:**
```json
{
  "searchQuery": "Windows",
  "searchResults": {
    "assets": [
      {
        "id": "asset-001",
        "name": "Windows Server 2022",
        "assetId": "AST-001",
        "serialNumber": "SN123456",
        "ipAddress": "192.168.1.10",
        "type": "Server"
      },
      {
        "id": "asset-002",
        "name": "Windows 10 Desktop",
        "assetId": "AST-002",
        "serialNumber": "SN789012",
        "ipAddress": "192.168.1.20",
        "type": "Desktop"
      }
    ],
    "patches": [
      {
        "id": "patch-001",
        "patchId": "KB5012345",
        "title": "Windows 10 Security Update",
        "software": "Windows 10",
        "severity": "Critical"
      }
    ],
    "vulnerabilities": [
      {
        "id": "vuln-001",
        "cveId": "CVE-2024-0001",
        "title": "Windows Remote Code Execution",
        "severity": "Critical"
      }
    ],
    "agents": [
      {
        "id": "agent-001",
        "name": "Windows Agent 01",
        "hostname": "win-server-01",
        "ipAddress": "192.168.1.10",
        "status": "Connected"
      }
    ],
    "users": [
      {
        "id": "user-001",
        "name": "John Windows",
        "email": "john.windows@example.com",
        "role": "Administrator"
      }
    ]
  },
  "totalCounts": {
    "assets": 5,
    "patches": 3,
    "vulnerabilities": 2,
    "agents": 4,
    "users": 1
  }
}
```

**API Endpoints:**
- `GET /v1/search?q={query}&limit={limit}` - Global search across all entities
  - Query Parameters:
    - `q` (required): Search query string (minimum 2 characters)
    - `limit` (optional): Maximum results per entity type (default: 5)
  - Response:
    ```json
    {
      "assets": [
        {
          "id": "string",
          "name": "string",
          "assetId": "string",
          "serialNumber": "string",
          "ipAddress": "string",
          "type": "string"
        }
      ],
      "patches": [
        {
          "id": "string",
          "patchId": "string",
          "title": "string",
          "software": "string",
          "severity": "string"
        }
      ],
      "vulnerabilities": [
        {
          "id": "string",
          "cveId": "string",
          "title": "string",
          "severity": "string"
        }
      ],
      "agents": [
        {
          "id": "string",
          "name": "string",
          "hostname": "string",
          "ipAddress": "string",
          "status": "string"
        }
      ],
      "users": [
        {
          "id": "string",
          "name": "string",
          "email": "string",
          "role": "string"
        }
      ],
      "totalCounts": {
        "assets": 0,
        "patches": 0,
        "vulnerabilities": 0,
        "agents": 0,
        "users": 0
      }
    }
    ```
  - Status Codes:
    - 200: Search successful
    - 400: Invalid query (too short, empty)
    - 401: Unauthorized
    - 500: Server error

**UI Components:**
- **Global Search Input:** (in application header/navbar)
  - Input field (Input component with SearchOutlined icon)
  - Placeholder: "Search assets, patches, vulnerabilities..."
  - Clear button (X icon) when text is entered
  - Positioned in top center or top right of header
  - Auto-focus on mount (optional)
- **Search Dropdown:** (AutoComplete or custom Dropdown component)
  - Dropdown panel (width: 500-600px, maxHeight: 500px)
  - **Loading State:**
    - Spinner (Spin component) while fetching results
  - **Empty State:**
    - "No results found" message when no matches
  - **Results Sections:**
    - Grouped by entity type with section headers
    - Section header format: "Entity Type (Count)" (e.g., "Assets (5)")
    - Each section shows up to 5-10 items
    - "View all X results" link at end of each section (if more results exist)
  - **Result Item:**
    - Container with hover effects
    - **Left Section:**
      - Entity icon (DesktopOutlined for assets, SafetyOutlined for patches, etc.)
    - **Middle Section:**
      - Entity name/title (highlighted matching text)
      - Additional context (assetId, patchId, CVE ID, email, etc.)
    - **Right Section:**
      - Entity type badge/tag (optional)
    - Clickable to navigate to entity detail page
  - Closes on outside click or Escape key
  - Scrollable when many results

- User Actions:
  1. Locate global search input in application header
  2. Click on search input to focus
  3. Type search query (e.g., "Windows")
  4. Verify search dropdown appears after typing (minimum 2 characters)
  5. Verify loading spinner is shown while fetching
  6. View search results:
    - Verify results are grouped by entity type
    - Verify section headers show entity type and count
    - Verify each result shows icon, name, and context
    - Verify results are limited per section (5-10 items)
  7. Navigate to entity:
    - Click on a search result item
    - Verify navigation to entity detail page
    - Verify search dropdown closes
  8. View all results:
    - Click "View all X results" link for an entity type
    - Verify navigation to entity list page
    - Verify search query is applied to list page
  9. Clear search:
    - Click clear button (X icon)
    - Verify search input is cleared
    - Verify search dropdown closes
  10. Close dropdown:
    - Click outside dropdown
    - Verify dropdown closes
    - Press Escape key
    - Verify dropdown closes

**Test Notes:**
- Test with different user roles (admin, regular user)
- Test global search input:
  - Verify search input is visible in header
  - Verify placeholder text is displayed
  - Verify search icon is visible
  - Click on input to focus
  - Type search query
- Test search functionality:
  - Test with minimum 2 characters (should trigger search)
  - Test with less than 2 characters (should not trigger search)
  - Test with various search queries:
    - Asset names (e.g., "Windows Server")
    - Asset IDs (e.g., "AST-001")
    - Patch IDs (e.g., "KB5012345")
    - CVE IDs (e.g., "CVE-2024-0001")
    - User names/emails (e.g., "john@example.com")
  - Test case-insensitive search (e.g., "WINDOWS" matches "Windows")
  - Test partial matching (e.g., "win" matches "Windows")
  - Test with special characters and numbers
- Test search results display:
  - Verify results are grouped by entity type
  - Verify section headers show entity type and count
  - Verify each result shows appropriate icon
  - Verify each result shows name/title
  - Verify each result shows additional context
  - Verify results are limited per section (5-10 items)
  - Verify "View all X results" link appears when more results exist
- Test search results navigation:
  - Click on a search result item
  - Verify navigation to entity detail page
  - Verify correct entity is displayed
  - Verify search dropdown closes
  - Click "View all X results" link
  - Verify navigation to entity list page
  - Verify search query is applied to list page
- Test loading state:
  - Verify loading spinner is shown while fetching
  - Verify spinner disappears when results are loaded
- Test empty state:
  - Search for non-existent item
  - Verify "No results found" message is displayed
- Test debouncing:
  - Type quickly (e.g., "Win")
  - Verify search is not triggered for each keystroke
  - Verify search is triggered after user stops typing (300ms delay)
- Test keyboard navigation:
  - Use Arrow keys to navigate results
  - Press Enter to select a result
  - Press Escape to close dropdown
  - Verify keyboard navigation works correctly
- Test dropdown behavior:
  - Click outside dropdown to close
  - Press Escape key to close
  - Verify dropdown closes appropriately
- Test clear functionality:
  - Enter search query
  - Verify clear button (X icon) appears
  - Click clear button
  - Verify search input is cleared
  - Verify search dropdown closes
- Test permissions:
  - Test with user who has limited permissions
  - Verify search only returns entities user can view
  - Verify RBAC is respected
- Test with many results:
  - Search for common term (e.g., "Windows")
  - Verify results are limited per section
  - Verify "View all X results" links work
  - Verify dropdown is scrollable
- Test real-time updates:
  - Type search query
  - Verify results update as user types (with debouncing)
  - Verify results are accurate
- Test from different pages:
  - Test global search from dashboard
  - Test global search from assets page
  - Test global search from patches page
  - Verify search works from all pages
- Test search highlighting (if implemented):
  - Verify matching text is highlighted in results
  - Verify highlighting is accurate
- Test edge cases:
  - Test with very long search query
  - Test with empty search query
  - Test with special characters only
  - Test with numbers only
  - Test rapid typing and clearing
- Test UI responsiveness:
  - Test search dropdown on different screen sizes
  - Verify dropdown positioning is correct
  - Verify dropdown doesn't overflow screen
  - Test on different browsers
- Test accessibility:
  - Verify keyboard navigation works
  - Verify screen reader compatibility
  - Verify focus management
  - Verify ARIA labels are present
- Test performance:
  - Test with large result sets
  - Verify search is fast and responsive
  - Verify debouncing prevents excessive API calls

---

## Test Execution Summary

| Story ID | Title | Status | Tester | Date | Notes |
|----------|-------|--------|--------|------|-------|
| US-021 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-022 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-023 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-024 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-025 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-026 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-027 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-028 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-029 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |
| US-030 | [Title] | ⏳ Pending / ✅ Pass / ❌ Fail | [Name] | YYYY-MM-DD | [Notes] |

**Legend:**
- ⏳ Pending: Story not yet tested
- ✅ Pass: All acceptance criteria met
- ❌ Fail: One or more acceptance criteria not met

---

**Document End**
