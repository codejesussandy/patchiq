# Settings Extended Implementation Guide

## Overview
This document extends `SETTINGS-IMPLEMENTATION.md` with additional settings endpoints discovered in the frontend implementation.

---

## Complete Endpoint Overview

```
# Branches
GET    /v1/settings/branches             - List branches
GET    /v1/settings/branches/:id         - Get branch details
POST   /v1/settings/branches             - Create branch
PUT    /v1/settings/branches/:id         - Update branch
DELETE /v1/settings/branches/:id         - Delete branch

# Users
GET    /v1/settings/users                - List users
GET    /v1/settings/users/:id            - Get user details
POST   /v1/settings/users                - Create user
PUT    /v1/settings/users/:id            - Update user
DELETE /v1/settings/users/:id            - Delete user
POST   /v1/settings/users/invite         - Invite user by email
POST   /v1/settings/users/:id/reset-password - Reset user password
POST   /v1/settings/users/:id/suspend    - Suspend user
GET    /v1/settings/users/:id/audit-log  - Get user audit log

# Roles
GET    /v1/settings/roles                - List roles
GET    /v1/settings/roles/:id            - Get role details
POST   /v1/settings/roles                - Create role
PUT    /v1/settings/roles/:id            - Update role
DELETE /v1/settings/roles/:id            - Delete role

# Alert Configurations (Policies)
GET    /v1/settings/policies             - List alert configurations
GET    /v1/settings/policies/:id         - Get alert configuration
POST   /v1/settings/policies             - Create alert configuration
PUT    /v1/settings/policies/:id         - Update alert configuration
DELETE /v1/settings/policies/:id         - Delete alert configuration
POST   /v1/settings/policies/:id/clone   - Clone alert configuration
POST   /v1/settings/policies/:id/disable - Disable alert configuration
GET    /v1/settings/policies/:id/affected-users - Get affected users
GET    /v1/settings/policies/:id/audit   - Get policy audit log

# Organizations
GET    /v1/settings/organizations        - List organizations
GET    /v1/settings/organizations/:id    - Get organization details
POST   /v1/settings/organizations        - Create organization
PUT    /v1/settings/organizations/:id    - Update organization
DELETE /v1/settings/organizations/:id    - Delete organization

# Departments
GET    /v1/settings/departments          - List departments
GET    /v1/settings/departments/:id      - Get department details
POST   /v1/settings/departments          - Create department
PUT    /v1/settings/departments/:id      - Update department
DELETE /v1/settings/departments/:id      - Delete department

# Locations
GET    /v1/settings/locations            - List locations
GET    /v1/settings/locations/:id        - Get location details
POST   /v1/settings/locations            - Create location
PUT    /v1/settings/locations/:id        - Update location
DELETE /v1/settings/locations/:id        - Delete location

# Server Settings (singleton)
GET    /v1/settings/server               - Get server settings
PUT    /v1/settings/server               - Update server settings

# Agent Configuration (singleton)
GET    /v1/settings/agent-configuration  - Get agent config
PUT    /v1/settings/agent-configuration  - Update agent config

# Proxy Server (singleton)
GET    /v1/settings/proxy-server         - Get proxy config
PUT    /v1/settings/proxy-server         - Update proxy config
POST   /v1/settings/proxy-server/test    - Test proxy connection

# Risk Score Settings (singleton)
GET    /v1/settings/risk-score           - Get risk score config
PUT    /v1/settings/risk-score           - Update risk score config

# Branding (singleton)
GET    /v1/settings/branding             - Get branding settings
POST   /v1/settings/branding             - Update branding (multipart/form-data)

# Vendor Logos
GET    /v1/settings/vendor-logos         - List vendor logos
GET    /v1/settings/vendor-logos/:id     - Get vendor logo
POST   /v1/settings/vendor-logos         - Create vendor logo (multipart/form-data)
PUT    /v1/settings/vendor-logos/:id     - Update vendor logo
DELETE /v1/settings/vendor-logos/:id     - Delete vendor logo

# LDAP Server Configurations
GET    /v1/settings/ldap-configs         - List LDAP configs
GET    /v1/settings/ldap-configs/:id     - Get LDAP config
POST   /v1/settings/ldap-configs         - Create LDAP config
PUT    /v1/settings/ldap-configs/:id     - Update LDAP config
DELETE /v1/settings/ldap-configs/:id     - Delete LDAP config

# Mail Server (singleton)
GET    /v1/settings/mail-server          - Get mail server config
PUT    /v1/settings/mail-server          - Update mail server config
POST   /v1/settings/mail-server/test     - Test mail connection

# Remote Desktop Settings (singleton)
GET    /v1/settings/remote-desktop       - Get remote desktop config
PUT    /v1/settings/remote-desktop       - Update remote desktop config
POST   /v1/settings/remote-desktop/reset - Reset remote desktop settings

# Agent Approval Settings (singleton)
GET    /v1/settings/agent-approval       - Get approval settings
PUT    /v1/settings/agent-approval       - Update approval settings

# Agent Approvals (records)
GET    /v1/settings/agent-approvals      - List approval records
POST   /v1/settings/agent-approvals/:id/approve - Approve agent
POST   /v1/settings/agent-approvals/:id/reject  - Reject agent
GET    /v1/settings/agent-approvals/export      - Export approvals (CSV)

# Enroll Secrets
GET    /v1/settings/enroll-secrets       - List enroll secrets
GET    /v1/settings/enroll-secrets/:id   - Get enroll secret
POST   /v1/settings/enroll-secrets       - Create enroll secret
PUT    /v1/settings/enroll-secrets/:id   - Update enroll secret
DELETE /v1/settings/enroll-secrets/:id   - Delete enroll secret
GET    /v1/settings/enroll-secrets/export - Export secrets (CSV)

# Vulnerability Preference Settings (singleton)
GET    /v1/settings/vulnerability-preference      - Get vulnerability preference
PUT    /v1/settings/vulnerability-preference      - Update vulnerability preference
POST   /v1/settings/vulnerability-preference/sync - Trigger CVE database sync

# Integrations
GET    /v1/settings/integrations         - List integrations
GET    /v1/settings/integrations/:id     - Get integration
POST   /v1/settings/integrations         - Create integration
PUT    /v1/settings/integrations/:id     - Update integration
PATCH  /v1/settings/integrations/:id/status - Toggle integration status
DELETE /v1/settings/integrations/:id     - Delete integration

# Deployment Policies
GET    /v1/settings/deployment-policies      - List deployment policies
GET    /v1/settings/deployment-policies/:id  - Get deployment policy
POST   /v1/settings/deployment-policies      - Create deployment policy
PUT    /v1/settings/deployment-policies/:id  - Update deployment policy
DELETE /v1/settings/deployment-policies/:id  - Delete deployment policy

# Red Hat Agent Nominations
GET    /v1/settings/red-hat-nominations      - List Red Hat nominations
GET    /v1/settings/red-hat-nominations/:id  - Get nomination
PUT    /v1/settings/red-hat-nominations/:id  - Update nomination
GET    /v1/settings/red-hat-nominations/export - Export nominations (CSV)

# Computer Groups
GET    /v1/settings/computer-groups              - List computer groups
GET    /v1/settings/computer-groups/:id          - Get computer group
POST   /v1/settings/computer-groups              - Create computer group
PUT    /v1/settings/computer-groups/:id          - Update computer group
DELETE /v1/settings/computer-groups/:id          - Delete computer group
GET    /v1/settings/computer-groups/available-endpoints - Get available endpoints for selection

# Patch Preferences (singleton)
GET    /v1/settings/patch-preferences    - Get patch preferences
PUT    /v1/settings/patch-preferences    - Update patch preferences
POST   /v1/settings/patch-preferences/sync - Trigger patch sync

# Distribution Servers
GET    /v1/settings/distribution-servers      - List distribution servers
GET    /v1/settings/distribution-servers/:id  - Get distribution server
POST   /v1/settings/distribution-servers      - Create distribution server
PUT    /v1/settings/distribution-servers/:id  - Update distribution server
DELETE /v1/settings/distribution-servers/:id  - Delete distribution server
GET    /v1/settings/distribution-servers/export   - Export servers (CSV)
GET    /v1/settings/distribution-servers/download - Download agent installer

# Platform License (singleton)
GET    /v1/settings/platform-license     - Get license info
PUT    /v1/settings/platform-license     - Update license code

# Audit Logs
GET    /v1/settings/audit-logs           - List audit logs (with pagination/filters)
GET    /v1/settings/audit-logs/filter-options - Get filter options
```

---

## Data Models

### Branch
```typescript
{
  id: string;
  name: string;
  status: 'Default' | 'Active' | 'Inactive';
  users: number;                    // Count of users in branch
  assets: number;                   // Count of assets in branch
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  manager: string;                  // User ID of branch manager
  isDefault: boolean;
  description?: string;
}
```

### User
```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  branch: string;                   // Branch name
  role: string;                     // Role name
  status: 'Active' | 'Inactive' | 'Invite Sent' | 'Suspended';
  lastLogin: string;                // e.g., "March 5 2024, 09:45 am"
  createdAt: string;                // ISO 8601
  timezone: string;                 // e.g., "IST"
  organization: string;             // Organization name
  department: string;               // Department name
  loginAllowed: boolean;
  endpointAssignmentAllowed: boolean;
}
```

### Role
```typescript
{
  id: string;
  name: string;
  description: string;
  users: number;                    // Count of users with this role
  branch: string;
  permissions: Permission[];
  isSystem: boolean;                // System roles cannot be deleted
  createdAt?: string;
  capabilities?: string[];          // Array of capability strings
}

// Permission structure
{
  module: string;                   // e.g., "Patches", "Assets"
  actions: string[];                // e.g., ['view', 'create', 'edit', 'delete']
}
```

### AlertConfiguration (Policy)
```typescript
{
  id: string;
  name: string;
  type: 'Email' | 'Slack' | 'SMS' | 'Webhook';
  channel: string;                  // e.g., "SMTP", "Webhook", "AWS SNS"
  recipients: string;               // Comma-separated recipients
  enabled: boolean;
  createdAt: string;                // ISO 8601
}
```

### VulnerabilityPreference
```typescript
{
  id: string;
  lastSyncAt: string;               // ISO 8601 - last CVE DB sync
  scanJobInterval: number;          // e.g., 2
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;         // Time in HH:mm:ss format
  totalCveCount: number;            // Read-only - total CVEs in database
  createdAt: string;
}
```

### Integration
```typescript
{
  id: string;
  name: string;
  description: string;
  type: string;                     // Integration type
  status: boolean;                  // Active/Inactive
  createdBy: string;
  createdAt: string;
  icon?: string;                    // Icon URL
  enabled?: boolean;
  recipients?: string[];            // For notification integrations
}
```

### EnrollSecret
```typescript
{
  id: string;
  name: string;
  secret: string;                   // UUID secret key
  organization: string;             // Organization name
  department: string;               // Department name
  createdOn: string;                // ISO 8601
}
```

### RedHatAgentNomination
```typescript
{
  id: string;
  name: string;                     // e.g., "Red Hat Workstation"
  status: 'pending' | 'approved' | 'rejected';
  endpoint: number;                 // Count of endpoints
  scheduledTime?: string;           // Time in HH:mm format
  lastSyncTime: string;             // ISO 8601
  updatedBy: string;
  updatedAt: string;                // ISO 8601
}
```

### DeploymentPolicy
```typescript
{
  id: string;
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  supportedModule: string;          // e.g., "All", "Patch", "Software"
  relatedType: string;              // e.g., "No Relation"
  createdBy: string;
  createdAt: string;                // ISO 8601
  updatedAt?: string;
}
```

### DistributionServer
```typescript
{
  id: string;
  name: string;
  description: string;
  location: string;
  url: string;
  version: string;
  createdOn: string;                // ISO 8601
}
```

### PatchPreference
```typescript
{
  id: string;
  enablePatching: boolean;
  corridorOnlyApprovedPatch: boolean;
  patchSyncForOS: string[];         // e.g., ["Windows", "Ubuntu"]
  patchApprovalPolicy: 'PreApproved' | 'ManuallyApproves' | 'TestAndApprove';
  enableThirdPartyPatching: boolean;
  patchApprovalScheduleTime: string;  // HH:mm:ss
  scheduleTime: string;               // HH:mm:ss
  zeroTouchDeploymentScheduleTime: string;  // HH:mm:ss
  lastSyncedAt: string;               // ISO 8601
  createdAt: string;
}
```

### Organization
```typescript
{
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

### Department
```typescript
{
  id: string;
  organization: string;             // Organization name
  name: string;
  description?: string;
  createdAt: string;
}
```

### Location
```typescript
{
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}
```

### ServerSettings
```typescript
{
  sessionTimeout: boolean;
  sessionTimeoutMinutes: number;
  sessionIdleTimeoutMinutes: number;
  endpointOnlineStatusTimeoutHours: number;
  endpointScanJobTimeoutHours: number;
  logLevel: 'Debug' | 'Info' | 'Warning' | 'Error';
}
```

### AgentConfiguration
```typescript
{
  allowedBandwidth: number;       // Mbps
  agentRefreshCycle: number;      // seconds
  systemActionRefreshCycle: number;
  endpointVlanRefreshCycle: number;
  patchScanningRefreshCycle: number;
  ssdmRefreshCycle: number;
  processRefreshCycle: number;
  networkRefreshCycle: number;
  certificateRefreshCycle: number;
  startupItemsRefreshCycle: number;
  usersRefreshCycle: number;
  systemResourcesRefreshCycle: number;
  systemServicesRefreshCycle: number;
  fimEventsRefreshCycle: number;
  softwareMeterRefreshCycle: number;
}
```

### ProxyServerConfig
```typescript
{
  enabled: boolean;
  host?: string;
  port?: number;
  protocol?: 'HTTP' | 'HTTPS' | 'SOCKS5';
  enableAuthentication?: boolean;
  username?: string;
  password?: string;              // Encrypted
}
```

### PasswordPolicy
```typescript
{
  minCharacterCount: number;      // 1-128
  minNumbers: boolean;
  minLowerCaseCharacters: boolean;
  minUpperCaseCharacters: boolean;
  minSpecialCharacters: boolean;
}
```

### RiskScoreSettings
```typescript
{
  applyDefaultSettings: boolean;
  vulnerabilityScoreWeight: number;   // 0-1
  vulnerabilitySeverityWeight: number;
  threatsWeight: number;
  endpointVisitsWeight: number;
}
```

### BrandingSettings
```typescript
{
  logoUrl?: string;
  companyName?: string;
}
```

### VendorLogo
```typescript
{
  id: string;
  name: string;
  type: 'integration' | 'vendor' | 'os';
  logoUrl: string;
  createdAt: string;
}
```

### AgentApprovalSettings
```typescript
{
  approvalType: 'auto' | 'manual';
  autoApprovalBasedOn: 'all' | 'criteria';
}
```

### AgentApproval (record)
```typescript
{
  uuid: string;
  hostName: string;
  ipAddresses: string;
  createdOn: string;
  performedBy: string;
  status: 'Approved' | 'Pending' | 'Rejected';
}
```

### PlatformLicense
```typescript
{
  licenseTo: string;
  licenseType: string;
  poNumber?: string;
  invoiceNumber?: string;
  email: string;
  partner?: string;
  productCode: string;
  productVersion: string;
  issueDate: string;
  expiresOn: string;
  numberOfEndpoints: number;
  usedEndpoints: number;
  activationCode: string;
  remainingDays: number;          // Computed
  remainingEndpoints: number;     // Computed
}
```

### AuditLog
```typescript
{
  id: string;
  module: string;
  operation: string;
  user: string;
  status: 'success' | 'error';
  message: string;
  createdAt: string;
}
```

### ComputerGroup
```typescript
{
  id: string;
  name: string;
  description?: string;
  criteria?: object;              // Dynamic query criteria
  memberCount: number;
  createdAt: string;
}
```

---

## TDD Scenarios (Additions)

### Branches

**Business Rules**
- Default branch cannot be deleted
- Branch name must be unique
- Must have valid email format

**GET /v1/settings/branches**
```json
Response (200):
[
  {
    "id": "1",
    "name": "Gurugram (Default)",
    "status": "Default",
    "users": 10,
    "assets": 10,
    "address": "123 Main Street, Sector 44",
    "city": "Gurugram",
    "state": "Haryana",
    "country": "India",
    "postalCode": "122003",
    "phone": "+91 9876543210",
    "email": "gurugram@example.com",
    "manager": "user1",
    "isDefault": true,
    "description": "Main branch location"
  }
]
```

**POST /v1/settings/branches**
```json
Request:
{
  "name": "Mumbai Office",
  "address": "456 Business Park",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "postalCode": "400001",
  "phone": "+91 9876543211",
  "email": "mumbai@example.com",
  "manager": "user2"
}

Response (201):
{
  "id": "2",
  "name": "Mumbai Office",
  ...
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Duplicate name | 409 | `{ "error": "Branch name already exists" }` |
| Invalid email | 400 | `{ "error": "Invalid email format" }` |
| Delete default | 400 | `{ "error": "Cannot delete default branch" }` |

---

### Users

**Business Rules**
- Email must be unique
- Username must be unique
- System users cannot be deleted
- Password reset sends email notification

**GET /v1/settings/users**
```json
Response (200):
[
  {
    "id": "1",
    "firstName": "Gajendra",
    "lastName": "Kumar",
    "email": "gajendra.kumar@kogta.in",
    "phone": "+91-9812345678",
    "username": "gajendra.kumar",
    "branch": "Gurugram",
    "role": "L2",
    "status": "Active",
    "lastLogin": "March 5 2024, 09:45 am",
    "createdAt": "2025-11-28T10:21:34Z",
    "timezone": "IST",
    "organization": "Kogta Financial (I) Limited",
    "department": "Accounts",
    "loginAllowed": true,
    "endpointAssignmentAllowed": true
  }
]
```

**POST /v1/settings/users/invite**
```json
Request:
{
  "email": "newuser@company.com",
  "firstName": "New",
  "lastName": "User",
  "role": "L1",
  "branch": "Gurugram"
}

Response (200):
{
  "success": true,
  "message": "Invitation sent successfully"
}
```

**POST /v1/settings/users/:id/suspend**
```json
Response (200):
{
  "id": "1",
  "status": "Suspended"
}
```

---

### Roles

**Business Rules**
- System roles (Super Admin) cannot be deleted
- Role name must be unique
- Cannot delete role if users are assigned

**GET /v1/settings/roles**
```json
Response (200):
[
  {
    "id": "0",
    "name": "Super Admin",
    "description": "Full system access",
    "users": 1,
    "branch": "Gurugram",
    "isSystem": true,
    "permissions": [
      { "module": "Patches", "actions": ["view", "create", "edit", "delete"] },
      { "module": "Assets", "actions": ["view", "create", "edit", "delete"] }
    ],
    "capabilities": ["view_inventory", "create_inventory", "view_dashboard"]
  }
]
```

**POST /v1/settings/roles**
```json
Request:
{
  "name": "Custom Role",
  "description": "Custom access level",
  "permissions": [
    { "module": "Patches", "actions": ["view"] }
  ],
  "capabilities": ["view_patch", "view_dashboard"]
}

Response (201):
{
  "id": "5",
  "name": "Custom Role",
  ...
}
```

---

### Alert Configurations (Policies)

**GET /v1/settings/policies**
```json
Response (200):
[
  {
    "id": "1",
    "name": "Critical Patch Alert",
    "type": "Email",
    "channel": "SMTP",
    "recipients": "admin@company.com, security@company.com",
    "enabled": true,
    "createdAt": "2025-01-10T08:30:00Z"
  },
  {
    "id": "2",
    "name": "Slack Notification",
    "type": "Slack",
    "channel": "Webhook",
    "recipients": "#patches-channel",
    "enabled": true,
    "createdAt": "2025-01-08T14:45:00Z"
  }
]
```

**POST /v1/settings/policies**
```json
Request:
{
  "name": "New SMS Alert",
  "type": "SMS",
  "channel": "AWS SNS",
  "recipients": "+1-555-0123",
  "enabled": true
}

Response (201):
{
  "id": "6",
  "name": "New SMS Alert",
  ...
}
```

**POST /v1/settings/policies/:id/clone**
```json
Response (200):
{
  "id": "7",
  "name": "Critical Patch Alert (Copy)",
  ...
}
```

---

### Vulnerability Preference

**GET /v1/settings/vulnerability-preference**
```json
Response (200):
{
  "id": "1",
  "lastSyncAt": "2025-01-15T06:38:30Z",
  "scanJobInterval": 2,
  "scanJobUnit": "Hour",
  "databaseSyncTime": "01:00:00",
  "totalCveCount": 311639,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**PUT /v1/settings/vulnerability-preference**
```json
Request:
{
  "scanJobInterval": 4,
  "scanJobUnit": "Hour",
  "databaseSyncTime": "02:00:00"
}

Response (200):
{
  "id": "1",
  "scanJobInterval": 4,
  "scanJobUnit": "Hour",
  "databaseSyncTime": "02:00:00",
  "lastSyncAt": "2025-01-15T06:38:30Z",
  "totalCveCount": 311639
}
```

**POST /v1/settings/vulnerability-preference/sync**
```json
Response (200):
{
  "success": true,
  "message": "CVE database sync initiated",
  "lastSyncAt": "2025-01-17T10:00:00Z"
}
```

---

### Integrations

**GET /v1/settings/integrations**
```json
Response (200):
[
  {
    "id": "1",
    "name": "VirusTotal",
    "description": "Threat intelligence integration",
    "type": "threat_intel",
    "status": true,
    "createdBy": "admin",
    "createdAt": "2024-01-15T10:00:00Z",
    "enabled": true
  }
]
```

**PATCH /v1/settings/integrations/:id/status**
```json
Request:
{
  "enabled": false
}

Response (200):
{
  "id": "1",
  "enabled": false
}
```

---

### Enroll Secrets

**GET /v1/settings/enroll-secrets**
```json
Response (200):
[
  {
    "id": "1",
    "name": "Default Secret Key",
    "secret": "e0e6d9e6-30d4-488c-8dd2-91d6ca84d9c8",
    "organization": "Global Organization",
    "department": "Global Department",
    "createdOn": "2025-11-28T03:55:19Z"
  }
]
```

**POST /v1/settings/enroll-secrets**
```json
Request:
{
  "name": "New Secret Key",
  "organization": "Kogta Financial",
  "department": "IT"
}

Response (201):
{
  "id": "3",
  "name": "New Secret Key",
  "secret": "generated-uuid-secret",
  "organization": "Kogta Financial",
  "department": "IT",
  "createdOn": "2025-01-17T10:00:00Z"
}
```

**GET /v1/settings/enroll-secrets/export**
- Returns CSV file
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="enroll-secrets.csv"`

---

### Agent Approvals

**GET /v1/settings/agent-approvals**
```json
Response (200):
[
  {
    "id": "1",
    "uuid": "aef1b8e4-c173-a943-b30",
    "hostName": "XFS1TDHCPQA81",
    "ipAddresses": ["172.17.2.100"],
    "createdOn": "2025-10-01 01:55:19 PM",
    "performedBy": "Admin",
    "status": "Approved"
  }
]
```

**POST /v1/settings/agent-approvals/:id/approve**
```json
Response (200):
{
  "id": "1",
  "status": "Approved",
  "performedBy": "admin@company.com"
}
```

**POST /v1/settings/agent-approvals/:id/reject**
```json
Response (200):
{
  "id": "1",
  "status": "Rejected",
  "performedBy": "admin@company.com"
}
```

---

### Deployment Policies

**GET /v1/settings/deployment-policies**
```json
Response (200):
[
  {
    "id": "POLICY-1",
    "name": "Scheduled Patch Deployment",
    "description": "Scheduled Patch Deployment",
    "type": "SCHEDULE",
    "supportedModule": "All",
    "relatedType": "No Relation",
    "createdBy": "Admin",
    "createdAt": "2025-01-12T12:14:27Z"
  }
]
```

**POST /v1/settings/deployment-policies**
```json
Request:
{
  "name": "Instant Critical Patches",
  "description": "Deploy critical patches immediately",
  "type": "INSTANT",
  "supportedModule": "Patch",
  "relatedType": "No Relation"
}

Response (201):
{
  "id": "POLICY-3",
  "name": "Instant Critical Patches",
  ...
}
```

---

### Red Hat Nominations

**GET /v1/settings/red-hat-nominations**
```json
Response (200):
[
  {
    "id": "1",
    "name": "Red Hat Workstation",
    "status": "pending",
    "endpoint": 0,
    "scheduledTime": "14:30",
    "lastSyncTime": "2025-01-07 10:15:32 PM",
    "updatedBy": "Admin",
    "updatedAt": "2025-01-07 10:15:32 PM"
  }
]
```

**PUT /v1/settings/red-hat-nominations/:id**
```json
Request:
{
  "scheduledTime": "18:00",
  "status": "approved"
}

Response (200):
{
  "id": "1",
  "scheduledTime": "18:00",
  "status": "approved",
  ...
}
```

---

### Patch Preferences

**GET /v1/settings/patch-preferences**
```json
Response (200):
{
  "id": "1",
  "enablePatching": true,
  "corridorOnlyApprovedPatch": false,
  "patchSyncForOS": ["Windows", "Ubuntu"],
  "patchApprovalPolicy": "PreApproved",
  "enableThirdPartyPatching": true,
  "patchApprovalScheduleTime": "03:00:00",
  "scheduleTime": "00:00:00",
  "zeroTouchDeploymentScheduleTime": "14:00:00",
  "lastSyncedAt": "2025/01/16 06:00:07 AM",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**PUT /v1/settings/patch-preferences**
```json
Request:
{
  "enablePatching": true,
  "patchApprovalPolicy": "ManuallyApproves",
  "enableThirdPartyPatching": false
}

Response (200):
{
  "message": "Patch preferences updated"
}
```

**POST /v1/settings/patch-preferences/sync**
```json
Response (200):
{
  "success": true,
  "message": "Patch sync initiated",
  "lastSyncedAt": "2025-01-17T10:00:00Z"
}
```

---

### Distribution Servers

**GET /v1/settings/distribution-servers**
```json
Response (200):
[
  {
    "id": "1",
    "name": "Primary Server",
    "description": "Main distribution server",
    "location": "Gurugram",
    "url": "https://dist1.company.com",
    "version": "2.1.0",
    "createdOn": "2025-01-10T10:00:00Z"
  }
]
```

**POST /v1/settings/distribution-servers**
```json
Request:
{
  "name": "Secondary Server",
  "description": "Backup distribution server",
  "location": "Mumbai",
  "url": "https://dist2.company.com",
  "version": "2.1.0"
}

Response (201):
{
  "id": "2",
  "name": "Secondary Server",
  ...
}
```

**GET /v1/settings/distribution-servers/download**
- Returns agent installer binary
- Content-Type: `application/octet-stream`
- Content-Disposition: `attachment; filename="agent-installer.exe"`

---

### Organizations

**Business Rules**
- "Global Organization" is default and cannot be deleted/edited
- Name must be unique
- Deleting organization requires no departments reference it

```json
// GET /v1/settings/organizations
Response (200):
[
  {
    "id": "uuid",
    "name": "Global Organization",
    "description": "Default organization",
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

---

### Server Settings

**GET /v1/settings/server**
```json
Response (200):
{
  "sessionTimeout": true,
  "sessionTimeoutMinutes": 60,
  "sessionIdleTimeoutMinutes": 15,
  "endpointOnlineStatusTimeoutHours": 1,
  "endpointScanJobTimeoutHours": 1,
  "logLevel": "Info"
}
```

**PUT /v1/settings/server**
```json
Request:
{
  "sessionTimeout": true,
  "sessionTimeoutMinutes": 30,
  "logLevel": "Debug"
}

Response (200):
{
  "message": "Server settings updated"
}
```

---

### Proxy Server

**POST /v1/settings/proxy-server/test**
```json
Request:
{
  "host": "proxy.example.com",
  "port": 8080,
  "protocol": "HTTP"
}

Response (200):
{
  "success": true,
  "message": "Proxy connection successful"
}

Response (400):
{
  "success": false,
  "message": "Connection failed: Timeout"
}
```

---

### Branding (Logo Upload)

**PUT /v1/settings/branding**
- Content-Type: `multipart/form-data`
- Max file size: 5MB
- Allowed formats: PNG, JPG, GIF, SVG

```json
Response (200):
{
  "logoUrl": "/uploads/branding/logo-uuid.png",
  "message": "Branding updated successfully"
}
```

---

### Audit Logs

**GET /v1/settings/audit**

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Search in message |
| module | string | Filter by module |
| user | string | Filter by user |
| operation | string | Filter by operation |
| startDate | string | From date |
| endDate | string | To date |
| page | number | Page number |
| limit | number | Items per page (default: 10) |

**Response (200)**
```json
{
  "data": [
    {
      "id": "uuid",
      "module": "Settings",
      "operation": "Update",
      "user": "admin@example.com",
      "status": "success",
      "message": "Server settings updated",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 10
}
```

**GET /v1/settings/audit/filters**
```json
Response (200):
{
  "modules": ["Settings", "Users", "Patches", "Assets"],
  "users": ["admin@example.com", "user@example.com"],
  "operations": ["Create", "Update", "Delete", "Login"]
}
```

---

### Platform License

**PUT /v1/settings/platform-license**
```json
Request:
{
  "licenseCode": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
}

Response (200):
{
  "valid": true,
  "licenseTo": "Company Name",
  "expiresOn": "2025-12-31",
  "numberOfEndpoints": 1000
}

Response (400):
{
  "valid": false,
  "message": "Invalid license code"
}
```

---

## Database Schema (Extensions)

```sql
-- Branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'Active',
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  manager_id UUID REFERENCES users(id),
  is_default BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_branches_status ON branches(status);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id),
  role_id UUID REFERENCES roles(id),
  status VARCHAR(20) DEFAULT 'Invite Sent',
  last_login TIMESTAMP,
  timezone VARCHAR(50) DEFAULT 'UTC',
  organization_id UUID REFERENCES organizations(id),
  department_id UUID REFERENCES departments(id),
  login_allowed BOOLEAN DEFAULT true,
  endpoint_assignment_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  branch_id UUID REFERENCES branches(id),
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Role Permissions
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  module VARCHAR(100) NOT NULL,
  actions TEXT[] NOT NULL,
  UNIQUE(role_id, module)
);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- Role Capabilities
CREATE TABLE role_capabilities (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  capability VARCHAR(100) NOT NULL,
  PRIMARY KEY (role_id, capability)
);

-- Alert Configurations
CREATE TABLE alert_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(100),
  recipients TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_alerts_type ON alert_configurations(type);
CREATE INDEX idx_alerts_enabled ON alert_configurations(enabled);

-- Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) NOT NULL,
  status BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT false,
  icon_url TEXT,
  recipients TEXT[],
  config JSONB,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_integrations_type ON integrations(type);

-- Enroll Secrets
CREATE TABLE enroll_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  secret UUID DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_enroll_secrets_org ON enroll_secrets(organization_id);

-- Vulnerability Preference (singleton)
CREATE TABLE vulnerability_preference (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_sync_at TIMESTAMP,
  scan_job_interval INTEGER DEFAULT 2,
  scan_job_unit VARCHAR(20) DEFAULT 'Hour',
  database_sync_time TIME DEFAULT '01:00:00',
  total_cve_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Deployment Policies
CREATE TABLE deployment_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  supported_module VARCHAR(100) DEFAULT 'All',
  related_type VARCHAR(100) DEFAULT 'No Relation',
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_deployment_policies_type ON deployment_policies(type);

-- Red Hat Agent Nominations
CREATE TABLE red_hat_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  endpoint_count INTEGER DEFAULT 0,
  scheduled_time TIME,
  last_sync_time TIMESTAMP,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Patch Preferences (singleton)
CREATE TABLE patch_preferences (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enable_patching BOOLEAN DEFAULT true,
  corridor_only_approved_patch BOOLEAN DEFAULT false,
  patch_sync_for_os TEXT[] DEFAULT ARRAY['Windows'],
  patch_approval_policy VARCHAR(50) DEFAULT 'PreApproved',
  enable_third_party_patching BOOLEAN DEFAULT true,
  patch_approval_schedule_time TIME DEFAULT '03:00:00',
  schedule_time TIME DEFAULT '00:00:00',
  zero_touch_deployment_schedule_time TIME DEFAULT '14:00:00',
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Distribution Servers
CREATE TABLE distribution_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  url TEXT NOT NULL,
  version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Locations
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Server Settings (singleton)
CREATE TABLE server_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  session_timeout BOOLEAN DEFAULT true,
  session_timeout_minutes INTEGER DEFAULT 60,
  session_idle_timeout_minutes INTEGER DEFAULT 15,
  endpoint_online_status_timeout_hours INTEGER DEFAULT 1,
  endpoint_scan_job_timeout_hours INTEGER DEFAULT 1,
  log_level VARCHAR(20) DEFAULT 'Info',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Configuration (singleton)
CREATE TABLE agent_configuration (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  allowed_bandwidth INTEGER DEFAULT 100,
  agent_refresh_cycle INTEGER DEFAULT 300,
  system_action_refresh_cycle INTEGER DEFAULT 300,
  -- ... other fields
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Proxy Server Config (singleton)
CREATE TABLE proxy_server_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN DEFAULT false,
  host VARCHAR(255),
  port INTEGER,
  protocol VARCHAR(20),
  enable_authentication BOOLEAN DEFAULT false,
  username VARCHAR(100),
  password_encrypted TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Password Policy (singleton)
CREATE TABLE password_policy (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_character_count INTEGER DEFAULT 8,
  min_numbers BOOLEAN DEFAULT true,
  min_lowercase_characters BOOLEAN DEFAULT true,
  min_uppercase_characters BOOLEAN DEFAULT true,
  min_special_characters BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Risk Score Settings (singleton)
CREATE TABLE risk_score_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  apply_default_settings BOOLEAN DEFAULT true,
  vulnerability_score_weight DECIMAL(2,1) DEFAULT 0.4,
  vulnerability_severity_weight DECIMAL(2,1) DEFAULT 0.3,
  threats_weight DECIMAL(2,1) DEFAULT 0.2,
  endpoint_visits_weight DECIMAL(2,1) DEFAULT 0.1,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Branding Settings (singleton)
CREATE TABLE branding_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  logo_url TEXT,
  company_name VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vendor Logos
CREATE TABLE vendor_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  logo_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Approval Settings (singleton)
CREATE TABLE agent_approval_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  approval_type VARCHAR(20) DEFAULT 'auto',
  auto_approval_based_on VARCHAR(20) DEFAULT 'all',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Approvals (records)
CREATE TABLE agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_uuid VARCHAR(255) NOT NULL,
  host_name VARCHAR(255),
  ip_addresses TEXT,
  status VARCHAR(20) DEFAULT 'Pending',
  performed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Platform License (singleton)
CREATE TABLE platform_license (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  license_to VARCHAR(255),
  license_type VARCHAR(50),
  po_number VARCHAR(100),
  invoice_number VARCHAR(100),
  email VARCHAR(255),
  partner VARCHAR(255),
  product_code VARCHAR(100),
  product_version VARCHAR(50),
  issue_date DATE,
  expires_on DATE,
  number_of_endpoints INTEGER,
  used_endpoints INTEGER DEFAULT 0,
  activation_code VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Computer Groups
CREATE TABLE computer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  criteria JSONB,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(100) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  user_email VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  message TEXT,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

---

## Implementation Order

### Phase 1: Core Settings
1. Branches CRUD
2. Organizations CRUD
3. Departments CRUD
4. Locations CRUD

### Phase 2: User Management
5. Roles CRUD (with permissions and capabilities)
6. Users CRUD (with invite, suspend, reset-password)
7. User Audit Log endpoint

### Phase 3: Singleton Settings
8. Server Settings (singleton)
9. Agent Configuration (singleton)
10. Proxy Server Config + test
11. Password Policy (singleton)
12. Risk Score Settings (singleton)
13. Remote Desktop Settings (singleton)
14. Mail Server Config + test

### Phase 4: Security Settings
15. Agent Approval Settings + approval records
16. Enroll Secrets CRUD + export
17. LDAP Configurations CRUD
18. Platform License

### Phase 5: Alert & Integration
19. Alert Configurations CRUD (clone, disable)
20. Integrations CRUD (status toggle)

### Phase 6: Patch Management Settings
21. Patch Preferences (singleton) + sync
22. Vulnerability Preference (singleton) + sync
23. Deployment Policies CRUD
24. Red Hat Nominations CRUD + export

### Phase 7: Infrastructure
25. Computer Groups CRUD
26. Distribution Servers CRUD + export
27. Branding + logo upload
28. Vendor Logos CRUD

### Phase 8: Audit & Reporting
29. Audit Logs query with filters + filter-options

---

## Notes

- All singleton tables use `id = 1` constraint for single row
- Export endpoints return CSV with appropriate headers
- File uploads use `multipart/form-data`
- All timestamps use ISO 8601 format
- System roles/users cannot be deleted
- Default entities (Global Organization, Default Branch) cannot be deleted
