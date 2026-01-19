# Settings Module - Backend Implementation Guide

## Overview

This document provides comprehensive Test-Driven Development (TDD) scenarios and implementation guidance for the Patchify Settings Module backend. The module consists of four main domains:

1. **Branch Location Management** - Physical branch/office location CRUD
2. **User Management** - User accounts, authentication, and profile management
3. **Roles & Privileges** - Role-based access control (RBAC) system
4. **Policy Management** - System policies with type-specific configurations

## Prerequisites

- API specification: `backend-debt/settings-api.yaml`
- Frontend implementation: `frontend/src/pages/settings/*`
- Mock data reference: `frontend/src/mocks/handlers/settings.handlers.ts`

## Architecture Guidelines

### Tech Stack Requirements
- RESTful API design
- PostgreSQL/MySQL for data persistence
- JWT for authentication
- bcrypt for password hashing
- Node.js/Express or similar framework
- Request validation middleware
- Audit logging for all mutations

### Database Design Principles
- Use UUIDs for primary keys
- Soft deletes (deletedAt timestamp) for auditing
- Created/updated timestamps on all tables
- Foreign key constraints with proper cascades
- Indexes on frequently queried fields

---

## 1. Branch Location Management

### Database Schema

```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('Default', 'Active', 'Inactive')),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  manager_id UUID REFERENCES users(id),
  is_default BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE (name)
);

-- Ensure only one default branch
CREATE UNIQUE INDEX idx_unique_default_branch
ON branches (is_default)
WHERE is_default = true AND deleted_at IS NULL;

-- Index for faster lookups
CREATE INDEX idx_branches_status ON branches(status);
CREATE INDEX idx_branches_manager ON branches(manager_id);
```

### TDD Scenarios

#### Scenario 1.1: Create Branch (Happy Path)
```gherkin
Feature: Create Branch
  As an admin user
  I want to create a new branch location
  So that I can organize users and assets by location

Scenario: Successfully create a branch
  Given I am authenticated as an admin
  When I POST to /v1/settings/branches with:
    ```json
    {
      "name": "Mumbai Office",
      "address": "456 Tech Park, Andheri",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "postalCode": "400053",
      "phone": "+91-22-12345678",
      "email": "mumbai@patchify.com",
      "manager": "user-uuid-123",
      "isDefault": false,
      "description": "Western region headquarters"
    }
    ```
  Then the response status should be 201
  And the response should contain:
    - id (UUID)
    - name: "Mumbai Office"
    - status: "Active"
    - users: 0
    - assets: 0
    - isDefault: false
  And the branch should be persisted in database
  And an audit log entry should be created
```

#### Scenario 1.2: Create Default Branch (Business Logic)
```gherkin
Scenario: Create new default branch when one already exists
  Given a default branch "Gurugram" exists with isDefault=true
  When I POST to /v1/settings/branches with:
    ```json
    {
      "name": "Delhi Office",
      "isDefault": true,
      "manager": "user-uuid-456"
    }
    ```
  Then the response status should be 201
  And the new branch "Delhi Office" should have isDefault=true and status="Default"
  And the old branch "Gurugram" should have isDefault=false and status="Active"
  And both updates should occur in a database transaction
```

#### Scenario 1.3: Prevent Deleting Default Branch
```gherkin
Scenario: Attempt to delete default branch
  Given a branch "Gurugram" exists with isDefault=true
  When I DELETE to /v1/settings/branches/{gurugram-id}
  Then the response status should be 400
  And the response should contain:
    ```json
    {
      "error": "Bad Request",
      "message": "Cannot delete the default branch"
    }
    ```
  And the branch should still exist in database
```

#### Scenario 1.4: Delete Non-Default Branch
```gherkin
Scenario: Successfully delete a non-default branch
  Given a branch "Delhi" exists with isDefault=false
  And the branch has 0 users assigned
  When I DELETE to /v1/settings/branches/{delhi-id}
  Then the response status should be 204
  And the branch should be soft-deleted (deleted_at set)
  And an audit log entry should be created
```

#### Scenario 1.5: Branch with Users Count
```gherkin
Scenario: Get branches with accurate user counts
  Given branch "Gurugram" exists
  And 5 users are assigned to "Gurugram"
  And 3 users are assigned to "Delhi"
  When I GET /v1/settings/branches
  Then the response should include:
    ```json
    [
      {
        "id": "gurugram-uuid",
        "name": "Gurugram",
        "users": 5,
        "assets": 0
      },
      {
        "id": "delhi-uuid",
        "name": "Delhi",
        "users": 3,
        "assets": 0
      }
    ]
    ```
```

### Business Logic Rules
1. Only ONE branch can have `isDefault=true` at any time
2. When setting a new default, automatically unset the old default
3. Default branch status is automatically set to "Default"
4. Non-default branches default to "Active" status
5. Cannot delete default branch (return 400 error)
6. Branch name must be unique
7. Manager must be an existing user with admin/manager role
8. Users and assets counts are computed from related tables

---

## 2. User Management

### Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  password_hash VARCHAR(255),
  branch_id UUID REFERENCES branches(id),
  role_id UUID REFERENCES roles(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Invite Sent', 'New Account', 'In Active')),
  last_login TIMESTAMP,
  avatar_url TEXT,
  gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Others')),
  timezone VARCHAR(100),
  org_unit VARCHAR(100),
  default_dashboard VARCHAR(100),
  invitation_token VARCHAR(255),
  invitation_expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_status ON users(status);
```

### TDD Scenarios

#### Scenario 2.1: Create User with Password
```gherkin
Scenario: Create a new user account
  Given I am authenticated as an admin
  When I POST to /v1/settings/users with:
    ```json
    {
      "firstName": "Priya",
      "lastName": "Sharma",
      "email": "priya.sharma@patchify.com",
      "phone": "+91-9876543211",
      "password": "SecurePass123!",
      "branch": "Gurugram",
      "role": "Employee",
      "gender": "Female",
      "timezone": "IST",
      "orgUnit": "Engineering",
      "dashboard": "overview"
    }
    ```
  Then the response status should be 201
  And the password should be hashed with bcrypt (not stored plain)
  And the user status should be "New Account"
  And the response should NOT include the password field
  And an audit log entry should be created
```

#### Scenario 2.2: Prevent Duplicate Email
```gherkin
Scenario: Attempt to create user with existing email
  Given a user exists with email "existing@patchify.com"
  When I POST to /v1/settings/users with email "existing@patchify.com"
  Then the response status should be 400
  And the response should contain:
    ```json
    {
      "error": "Bad Request",
      "message": "Email already exists"
    }
    ```
```

#### Scenario 2.3: Invite User Flow
```gherkin
Scenario: Send user invitation
  Given I am authenticated as an admin
  When I POST to /v1/settings/users/invite with:
    ```json
    {
      "email": "new.user@patchify.com",
      "role": "Team Manager",
      "orgUnit": "Gurugram",
      "dashboard": "patches",
      "message": "Welcome to the team!"
    }
    ```
  Then the response status should be 201
  And a user should be created with status "Invite Sent"
  And an invitation_token should be generated (JWT or random string)
  And invitation_expires_at should be 7 days from now
  And an email should be sent to "new.user@patchify.com" with:
    - Invitation link with token
    - Personal message: "Welcome to the team!"
    - Expiry notice: "This invitation expires in 7 days"
```

#### Scenario 2.4: Reset Password
```gherkin
Scenario: Admin resets user password
  Given a user "john@patchify.com" exists with status "Active"
  When I POST to /v1/settings/users/{john-id}/reset-password
  Then the response status should be 200
  And a password reset token should be generated
  And an email should be sent to "john@patchify.com" with reset link
  And the reset link should expire in 24 hours
  And an audit log entry should be created
```

#### Scenario 2.5: Suspend User Account
```gherkin
Scenario: Suspend an active user
  Given a user "john@patchify.com" exists with status "Active"
  When I POST to /v1/settings/users/{john-id}/suspend
  Then the response status should be 200
  And the user status should be changed to "In Active"
  And the user should not be able to login
  And an audit log entry should be created with reason
```

#### Scenario 2.6: Delete User with Audit Trail
```gherkin
Scenario: Delete a user account
  Given a user "old.employee@patchify.com" exists
  When I DELETE /v1/settings/users/{user-id}
  Then the response status should be 204
  And the user should be soft-deleted (deleted_at set)
  And an audit log entry should be created
  And the user's data should still exist for audit purposes
  And the user should not appear in GET /v1/settings/users
```

#### Scenario 2.7: Get User Audit Log
```gherkin
Scenario: View user audit history
  Given a user "john@patchify.com" exists
  And the following audit events occurred:
    - User created by admin@patchify.com at 2025-01-01 10:00
    - Password reset by admin@patchify.com at 2025-01-05 14:30
    - User suspended by admin@patchify.com at 2025-01-10 09:15
  When I GET /v1/settings/users/{john-id}/audit-log
  Then the response status should be 200
  And the response should contain all 3 audit entries in reverse chronological order
  And each entry should include: action, performedBy, timestamp, details
```

### Business Logic Rules
1. Email must be unique across all users (including soft-deleted)
2. Password must meet complexity requirements (8+ chars, uppercase, lowercase, number, special char)
3. Passwords must be hashed with bcrypt (salt rounds >= 10)
4. Never return password hashes in API responses
5. Invitation tokens expire after 7 days
6. Password reset tokens expire after 24 hours
7. Suspended users cannot login or access the system
8. All user mutations must create audit log entries
9. Soft delete users (don't hard delete for audit trail)
10. Last login timestamp updated on every successful login

---

## 3. Roles & Privileges (RBAC)

### Database Schema

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id),
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL CHECK (module IN ('patches', 'assets', 'discovery', 'reports', 'settings')),
  actions TEXT[] NOT NULL, -- Array of: 'view', 'add', 'edit', 'delete'
  UNIQUE (role_id, module)
);

-- System roles
INSERT INTO roles (id, name, description, branch_id, is_system) VALUES
('admin-uuid', 'Admin', 'Full system access with all permissions', 'gurugram-uuid', true),
('manager-uuid', 'Team Manager', 'Team management and reporting permissions', 'gurugram-uuid', true),
('employee-uuid', 'Employee', 'Basic employee access permissions', 'gurugram-uuid', true);
```

### TDD Scenarios

#### Scenario 3.1: Create Custom Role
```gherkin
Scenario: Create a new custom role
  Given I am authenticated as an admin
  When I POST to /v1/settings/roles with:
    ```json
    {
      "name": "Patch Reviewer",
      "description": "Can review and approve patches",
      "branch": "Gurugram",
      "permissions": [
        { "module": "patches", "actions": ["view", "edit"] },
        { "module": "assets", "actions": ["view"] },
        { "module": "reports", "actions": ["view"] }
      ]
    }
    ```
  Then the response status should be 201
  And the role should have isSystem=false
  And all 3 permission entries should be created in database
  And an audit log entry should be created
```

#### Scenario 3.2: Prevent Deleting System Roles
```gherkin
Scenario: Attempt to delete a system role
  Given a role "Admin" exists with isSystem=true
  When I DELETE /v1/settings/roles/{admin-id}
  Then the response status should be 400
  And the response should contain:
    ```json
    {
      "error": "Bad Request",
      "message": "Cannot delete system roles"
    }
    ```
  And the role should still exist in database
```

#### Scenario 3.3: Update Role Permissions
```gherkin
Scenario: Update permissions for a custom role
  Given a custom role "Patch Reviewer" exists with permissions:
    - patches: [view, edit]
    - assets: [view]
  When I PUT to /v1/settings/roles/{reviewer-id} with:
    ```json
    {
      "name": "Patch Reviewer",
      "description": "Can review, approve, and delete patches",
      "branch": "Gurugram",
      "permissions": [
        { "module": "patches", "actions": ["view", "edit", "delete"] },
        { "module": "assets", "actions": ["view", "edit"] },
        { "module": "reports", "actions": ["view"] }
      ]
    }
    ```
  Then the response status should be 200
  And the permissions should be updated (delete old, insert new)
  And the operation should occur in a transaction
  And an audit log entry should be created
```

#### Scenario 3.4: Get Roles with User Counts
```gherkin
Scenario: Get all roles with accurate user counts
  Given the following roles and users exist:
    - Admin (3 users)
    - Team Manager (5 users)
    - Employee (20 users)
    - Patch Reviewer (2 users)
  When I GET /v1/settings/roles
  Then the response status should be 200
  And each role should include the correct users count
  And system roles should be marked with isSystem=true
```

#### Scenario 3.5: Prevent System Role Name Change
```gherkin
Scenario: Attempt to change system role name
  Given a role "Admin" exists with isSystem=true
  When I PUT to /v1/settings/roles/{admin-id} with name "Super Admin"
  Then the response status should be 400
  And the response should contain:
    ```json
    {
      "error": "Bad Request",
      "message": "Cannot modify system role name"
    }
    ```
```

### Business Logic Rules
1. System roles (Admin, Team Manager, Employee) cannot be deleted
2. System roles cannot have their names changed
3. System roles can have permissions updated (for flexibility)
4. Custom roles can be created, updated, and deleted
5. Role names must be unique within a branch
6. Permissions are module-level (patches, assets, discovery, reports, settings)
7. Actions are CRUD-based (view, add, edit, delete)
8. When deleting a role, reassign users to default role (or prevent deletion if users exist)
9. Permission updates should be atomic (delete all old, insert all new in transaction)
10. Validate that permission modules and actions are from allowed enums

---

## 4. Policy Management

### Database Schema

```sql
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('password', 'security', 'backup', 'update', 'access', 'compliance')),
  org_unit VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  configuration JSONB NOT NULL, -- Type-specific configuration
  affected_roles TEXT[], -- Array of role names
  effective_date TIMESTAMP,
  status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive', 'Draft')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_policies_type ON policies(type);
CREATE INDEX idx_policies_org_unit ON policies(org_unit);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_configuration ON policies USING GIN (configuration);
```

### TDD Scenarios

#### Scenario 4.1: Create Password Policy
```gherkin
Scenario: Create a password policy
  Given I am authenticated as an admin
  When I POST to /v1/settings/policies with:
    ```json
    {
      "name": "Strong Password Policy",
      "type": "password",
      "orgUnit": "Gurugram",
      "description": "Enforces strong passwords for all users",
      "configuration": {
        "minLength": 12,
        "requireUppercase": true,
        "requireLowercase": true,
        "requireNumbers": true,
        "requireSpecialChars": true,
        "expiryDays": 90,
        "preventReuse": 5
      },
      "affectedRoles": ["Admin", "Team Manager", "Employee"],
      "effectiveDate": "2025-02-01T00:00:00Z",
      "status": "Active"
    }
    ```
  Then the response status should be 201
  And the policy should be persisted with configuration as JSONB
  And users count should be computed based on affectedRoles
  And an audit log entry should be created
```

#### Scenario 4.2: Create Security Policy with 2FA
```gherkin
Scenario: Create a security policy requiring 2FA
  Given I am authenticated as an admin
  When I POST to /v1/settings/policies with:
    ```json
    {
      "name": "Admin 2FA Requirement",
      "type": "security",
      "orgUnit": "Gurugram",
      "description": "Requires 2FA for all admin users",
      "configuration": {
        "require2FA": true,
        "sessionTimeout": 30,
        "maxLoginAttempts": 3,
        "lockoutDuration": 60,
        "ipWhitelist": "192.168.1.0/24,10.0.0.0/8"
      },
      "affectedRoles": ["Admin"],
      "status": "Active"
    }
    ```
  Then the response status should be 201
  And the configuration should support varying fields per policy type
```

#### Scenario 4.3: Clone Policy
```gherkin
Scenario: Clone an existing policy
  Given a policy "Strong Password Policy" exists
  When I POST to /v1/settings/policies/{policy-id}/clone
  Then the response status should be 201
  And a new policy should be created with:
    - name: "Strong Password Policy (Copy)"
    - Same type, configuration, orgUnit, description
    - status: "Draft"
    - New UUID
    - affectedRoles: empty array
  And the original policy should remain unchanged
```

#### Scenario 4.4: Get Affected Users
```gherkin
Scenario: View users affected by a policy
  Given a policy exists with affectedRoles: ["Admin", "Team Manager"]
  And 3 users have role "Admin"
  And 5 users have role "Team Manager"
  And 20 users have role "Employee"
  When I GET /v1/settings/policies/{policy-id}/affected-users
  Then the response status should be 200
  And the response should contain 8 users (3 + 5)
  And users with role "Employee" should NOT be included
```

#### Scenario 4.5: Disable Policy
```gherkin
Scenario: Disable an active policy
  Given a policy "Strong Password Policy" exists with status "Active"
  When I POST to /v1/settings/policies/{policy-id}/disable
  Then the response status should be 200
  And the policy status should be changed to "Inactive"
  And the policy should no longer be enforced
  And an audit log entry should be created
```

#### Scenario 4.6: Validate Configuration Schema
```gherkin
Scenario: Reject invalid configuration for policy type
  Given I am authenticated as an admin
  When I POST to /v1/settings/policies with:
    ```json
    {
      "name": "Invalid Password Policy",
      "type": "password",
      "configuration": {
        "invalidField": "should fail"
      }
    }
    ```
  Then the response status should be 400
  And the response should contain validation errors
  And the policy should NOT be created
```

#### Scenario 4.7: Policy Audit History
```gherkin
Scenario: View policy audit history
  Given a policy "Strong Password Policy" exists
  And the following changes occurred:
    - Created by admin@patchify.com at 2025-01-01
    - Updated minLength from 8 to 12 at 2025-01-15
    - Disabled by admin@patchify.com at 2025-01-20
    - Re-enabled by admin@patchify.com at 2025-01-22
  When I GET /v1/settings/policies/{policy-id}/audit
  Then the response status should be 200
  And all 4 audit entries should be returned in reverse chronological order
  And each entry should show the delta (what changed)
```

### Business Logic Rules
1. Policy names must be unique
2. Configuration schema varies by policy type (validate against type-specific schema)
3. Affected users are computed from affectedRoles array
4. Effective date determines when policy becomes active
5. Only "Active" policies are enforced
6. Cloning creates a new policy with status "Draft" and empty affectedRoles
7. Disabling a policy sets status to "Inactive"
8. Policy audit log tracks: create, update, delete, disable, enable events
9. Configuration stored as JSONB for flexible schema per type
10. Validate configuration fields match policy type requirements

---

## 5. Audit Logging

### Database Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('branch', 'user', 'role', 'policy')),
  entity_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL, -- e.g., "created", "updated", "deleted", "suspended"
  performed_by UUID REFERENCES users(id),
  performed_by_email VARCHAR(255),
  changes JSONB, -- Before/after snapshot
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
```

### TDD Scenarios

#### Scenario 5.1: Audit Log on User Creation
```gherkin
Scenario: Audit log created when user is created
  Given I am authenticated as "admin@patchify.com"
  When I create a new user "john.doe@patchify.com"
  Then an audit log entry should be created with:
    - entity_type: "user"
    - entity_id: {john-user-id}
    - action: "created"
    - performed_by: {admin-user-id}
    - performed_by_email: "admin@patchify.com"
    - changes: { "after": {john's user object} }
    - timestamp: current time
    - ip_address: request IP
    - user_agent: request user agent
```

#### Scenario 5.2: Audit Log on User Update
```gherkin
Scenario: Audit log shows delta on user update
  Given a user exists with email "john@patchify.com" and role "Employee"
  When I update the user's role to "Team Manager"
  Then an audit log entry should be created with:
    - action: "updated"
    - changes: {
        "before": { "role": "Employee" },
        "after": { "role": "Team Manager" }
      }
```

### Business Logic Rules
1. Every CREATE, UPDATE, DELETE operation must create an audit log
2. Audit logs are immutable (never update or delete)
3. Capture IP address and user agent from request
4. Store before/after snapshots in changes JSONB field
5. Audit logs queryable by entity type, entity ID, performer, date range
6. Retain audit logs for minimum 1 year (compliance requirement)

---

## 6. Authentication & Authorization

### Middleware Requirements

```javascript
// Example middleware structure (pseudo-code)

// 1. Authentication Middleware
function authenticate(req, res, next) {
  // Extract JWT from Authorization header
  // Verify JWT signature and expiration
  // Load user from database
  // Attach user to req.user
  // If invalid, return 401
}

// 2. Authorization Middleware
function authorize(requiredPermissions) {
  return (req, res, next) => {
    // Check req.user.role.permissions
    // Verify user has required module + actions
    // If insufficient, return 403
  }
}

// 3. Usage example
app.post(
  '/v1/settings/users',
  authenticate,
  authorize({ module: 'settings', action: 'add' }),
  createUser
);
```

### TDD Scenarios

#### Scenario 6.1: Unauthorized Access
```gherkin
Scenario: Access endpoint without authentication
  When I POST to /v1/settings/branches without Authorization header
  Then the response status should be 401
  And the response should contain:
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
```

#### Scenario 6.2: Insufficient Permissions
```gherkin
Scenario: User without settings permissions tries to create branch
  Given I am authenticated as a user with role "Employee"
  And "Employee" role has no "settings" module permissions
  When I POST to /v1/settings/branches
  Then the response status should be 403
  And the response should contain:
    ```json
    {
      "error": "Forbidden",
      "message": "Insufficient permissions"
    }
    ```
```

---

## 7. Integration Requirements

### Email Service Integration
- Send invitation emails with links and expiry
- Send password reset emails with tokens
- Send welcome emails for new accounts
- Email templates with company branding
- Queue emails asynchronously (don't block API response)

### Notification Service Integration
- Notify admins when users are suspended
- Notify users when their passwords expire soon
- Notify users when policies affecting them are changed
- Websocket/SSE for real-time notifications

---

## 8. Performance Considerations

### Database Optimization
1. Use connection pooling (min 10, max 100 connections)
2. Index all foreign keys
3. Use EXPLAIN ANALYZE for slow queries
4. Consider pagination for GET endpoints (limit 50 per page)
5. Cache role permissions (Redis, 5-minute TTL)
6. Use database transactions for multi-table operations

### API Response Times (SLAs)
- GET requests: < 100ms (p95)
- POST/PUT/DELETE: < 300ms (p95)
- Bulk operations: < 1s (p95)

---

## 9. Error Handling

### Standard Error Response Format
```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": {
    "field": "email",
    "issue": "Email already exists"
  }
}
```

### HTTP Status Codes
- 200: Success (GET, PUT that returns data)
- 201: Created (POST)
- 204: No Content (DELETE, PUT without response body)
- 400: Bad Request (validation errors, business logic violations)
- 401: Unauthorized (missing or invalid authentication)
- 403: Forbidden (authenticated but insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 409: Conflict (e.g., duplicate email)
- 500: Internal Server Error (unhandled exceptions)

---

## 10. Testing Strategy

### Unit Tests
- Test business logic functions in isolation
- Mock database calls
- Test validation rules
- Test permission checking logic
- Target: 80%+ code coverage

### Integration Tests
- Test full request-response cycle
- Use test database (auto-reset between tests)
- Test happy paths and error cases
- Test transaction rollbacks
- Test concurrent operations

### End-to-End Tests
- Test frontend integration with real API
- Test authentication flows
- Test complex multi-step operations
- Test across different user roles

---

## 11. Security Considerations

### Input Validation
- Validate all input against schemas (use Joi, Yup, or similar)
- Sanitize HTML in text fields (prevent XSS)
- Validate email formats
- Validate UUID formats
- Validate enum values
- Validate array lengths (max 100 items)
- Validate string lengths (max 10000 chars for text fields)

### Password Security
- Hash with bcrypt (salt rounds >= 12)
- Never log passwords (redact in logs)
- Implement rate limiting on login endpoint (max 5 attempts per minute per IP)
- Implement account lockout after 5 failed attempts
- Require password reset after 90 days (if password policy enabled)

### SQL Injection Prevention
- Use parameterized queries (never string concatenation)
- Use ORM (Sequelize, TypeORM, Prisma) with proper escaping
- Validate UUIDs before using in queries

### CORS Configuration
- Only allow origins from whitelist
- Allow credentials for cookie-based auth
- Restrict allowed headers and methods

---

## 12. Deployment Checklist

### Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@host:5432/patchify
JWT_SECRET=<random-256-bit-secret>
JWT_EXPIRY=24h
BCRYPT_ROUNDS=12
EMAIL_SERVICE_URL=https://email.service.com
EMAIL_API_KEY=<secret>
REDIS_URL=redis://localhost:6379
CORS_ALLOWED_ORIGINS=https://app.patchify.com,https://admin.patchify.com
```

### Database Migrations
1. Run migrations in order (use Flyway, Liquibase, or ORM migrations)
2. Test migrations on staging before production
3. Have rollback scripts ready
4. Backup database before migrations

### Monitoring & Observability
- Log all API requests (request ID, user ID, endpoint, duration, status code)
- Set up error tracking (Sentry, Rollbar)
- Set up APM (New Relic, Datadog)
- Alert on error rate spikes
- Alert on slow query performance
- Dashboard for key metrics (requests/sec, error rate, p95 latency)

---

## 13. API Documentation

Generate interactive API documentation from OpenAPI spec:
- Use Swagger UI for interactive docs
- Host at `/api-docs` endpoint
- Include example requests and responses
- Auto-generate from `settings-api.yaml`

---

## Summary

This implementation guide provides comprehensive TDD scenarios and business logic for the Settings Module backend. The key priorities are:

1. **Data Integrity**: Enforce constraints at database level (unique indexes, foreign keys, check constraints)
2. **Audit Trail**: Log every mutation for compliance and debugging
3. **Security**: Validate input, hash passwords, enforce RBAC, prevent injection attacks
4. **Performance**: Index frequently queried fields, cache where appropriate, optimize queries
5. **Testability**: Write tests first, use test database, mock external services

Follow this guide to implement a robust, secure, and maintainable Settings Module backend that integrates seamlessly with the frontend implementation.
