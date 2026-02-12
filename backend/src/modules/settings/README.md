# Module: settings

## Responsibility

Manages all platform configuration: organizations, branches, departments, locations, users, roles, alert configs, LDAP, server settings, agent configuration, agent approvals, proxy/mail servers, audit logs, vulnerability preferences, platform license, computer groups, deployment policies, branding, vendor logos, risk scores, remote desktop, and patch management settings.

## Endpoints

### Organizations

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/organizations | List organizations | Yes |
| GET | /v1/settings/organizations/:id | Get organization | Yes |
| POST | /v1/settings/organizations | Create organization | Yes |
| PUT | /v1/settings/organizations/:id | Update organization | Yes |
| DELETE | /v1/settings/organizations/:id | Delete organization | Yes |

### Branches

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/branches | List branches | Yes |
| GET | /v1/settings/branches/:id | Get branch | Yes |
| POST | /v1/settings/branches | Create branch | Yes |
| PUT | /v1/settings/branches/:id | Update branch | Yes |
| DELETE | /v1/settings/branches/:id | Delete branch | Yes |

### Departments

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/departments | List departments | Yes |
| GET | /v1/settings/departments/:id | Get department | Yes |
| POST | /v1/settings/departments | Create department | Yes |
| PUT | /v1/settings/departments/:id | Update department | Yes |
| DELETE | /v1/settings/departments/:id | Delete department | Yes |

### Locations

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/locations | List locations | Yes |
| GET | /v1/settings/locations/:id | Get location | Yes |
| POST | /v1/settings/locations | Create location | Yes |
| PUT | /v1/settings/locations/:id | Update location | Yes |
| DELETE | /v1/settings/locations/:id | Delete location | Yes |

### Users

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/users | List users | Yes |
| GET | /v1/settings/users/:id | Get user | Yes |
| POST | /v1/settings/users | Create user | Yes |
| PUT | /v1/settings/users/:id | Update user | Yes |
| DELETE | /v1/settings/users/:id | Delete user | Yes |
| POST | /v1/settings/users/invite | Invite user via email | Yes |
| POST | /v1/settings/users/:id/suspend | Suspend user | Yes |
| POST | /v1/settings/users/:id/activate | Activate user | Yes |
| POST | /v1/settings/users/:id/reset-password | Reset user password | Yes |
| GET | /v1/settings/users/:id/audit-log | Get user audit log | Yes |

### Roles

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/roles | List roles | Yes |
| GET | /v1/settings/roles/:id | Get role | Yes |
| POST | /v1/settings/roles | Create role | Yes |
| PUT | /v1/settings/roles/:id | Update role | Yes |
| DELETE | /v1/settings/roles/:id | Delete role | Yes |

### Alert Configurations

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/alerts | List alert configs | Yes |
| POST | /v1/settings/alerts | Create alert config | Yes |
| GET | /v1/settings/alerts/:id | Get alert config | Yes |
| PUT | /v1/settings/alerts/:id | Update alert config | Yes |
| DELETE | /v1/settings/alerts/:id | Delete alert config | Yes |

### LDAP Configurations

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/ldap-configs | List LDAP configs | Yes |
| GET | /v1/settings/ldap-configs/:id | Get LDAP config | Yes |
| POST | /v1/settings/ldap-configs | Create LDAP config | Yes |
| PUT | /v1/settings/ldap-configs/:id | Update LDAP config | Yes |
| DELETE | /v1/settings/ldap-configs/:id | Delete LDAP config | Yes |
| POST | /v1/settings/ldap-configs/:id/test | Test LDAP connectivity | Yes |

### Singleton Settings

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/server | Get server settings | Yes |
| PUT | /v1/settings/server | Update server settings | Yes |
| GET | /v1/settings/agent-configuration | Get agent configuration | Yes |
| PUT | /v1/settings/agent-configuration | Update agent configuration | Yes |
| GET | /v1/settings/proxy-server | Get proxy server config | Yes |
| PUT | /v1/settings/proxy-server | Update proxy server config | Yes |
| POST | /v1/settings/proxy-server/test | Test proxy server | Yes |
| GET | /v1/settings/mail-server | Get mail server config | Yes |
| PUT | /v1/settings/mail-server | Update mail server config | Yes |
| POST | /v1/settings/mail-server/test | Test mail server | Yes |
| GET | /v1/settings/vulnerability-preference | Get vulnerability preferences | Yes |
| PUT | /v1/settings/vulnerability-preference | Update vulnerability preferences | Yes |
| POST | /v1/settings/vulnerability-preference/sync | Sync vulnerability database | Yes |
| GET | /v1/settings/platform-license | Get platform license | Yes |
| PUT | /v1/settings/platform-license | Update platform license | Yes |
| GET | /v1/settings/risk-score | Get risk score settings | Yes |
| PUT | /v1/settings/risk-score | Update risk score settings | Yes |
| GET | /v1/settings/remote-desktop | Get remote desktop settings | Yes |
| PUT | /v1/settings/remote-desktop | Update remote desktop settings | Yes |
| POST | /v1/settings/remote-desktop/reset | Reset remote desktop settings | Yes |
| GET | /v1/settings/patch-management | Get patch management settings | Yes |
| PUT | /v1/settings/patch-management | Update patch management settings | Yes |

### Agent Approvals

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/agent-approvals | List pending agent approvals | Yes |
| POST | /v1/settings/agent-approvals/:id/approve | Approve agent | Yes |
| POST | /v1/settings/agent-approvals/:id/reject | Reject agent | Yes |

### Audit Logs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/audit | List audit logs | Yes |
| GET | /v1/settings/audit/filter-options | Get audit log filter options | Yes |

### Computer Groups

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/computer-groups | List computer groups | Yes |
| GET | /v1/settings/computer-groups/available-endpoints | Get available endpoints | Yes |
| GET | /v1/settings/computer-groups/:id | Get computer group | Yes |
| POST | /v1/settings/computer-groups | Create computer group | Yes |
| PUT | /v1/settings/computer-groups/:id | Update computer group | Yes |
| DELETE | /v1/settings/computer-groups/:id | Delete computer group | Yes |

### Deployment Policies

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/deployment-policies | List deployment policies | Yes |
| GET | /v1/settings/deployment-policies/:id | Get deployment policy | Yes |
| POST | /v1/settings/deployment-policies | Create deployment policy | Yes |
| PUT | /v1/settings/deployment-policies/:id | Update deployment policy | Yes |
| DELETE | /v1/settings/deployment-policies/:id | Delete deployment policy | Yes |

### Branding

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/branding | Get branding config | Yes |
| POST | /v1/settings/branding | Update branding (with logo upload) | Yes |

### Vendor Logos

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/settings/vendor-logos | List vendor logos | Yes |
| GET | /v1/settings/vendor-logos/:id | Get vendor logo | Yes |
| POST | /v1/settings/vendor-logos | Create vendor logo (with upload) | Yes |
| PUT | /v1/settings/vendor-logos/:id | Update vendor logo (with upload) | Yes |
| DELETE | /v1/settings/vendor-logos/:id | Delete vendor logo | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

Settings are mostly simple CRUD with singleton patterns for server-wide configuration (server settings, mail server, proxy, etc.).

## Key Files

- `settings.controller.ts` — Singleton controller handling all settings endpoints
- `settings.service.ts` — Business logic for organizations, branches, departments, locations, roles, singletons
- `users.service.ts` — User management logic (separate from main settings service)
- `settings.validators.ts` — Zod schemas for all settings
- `settings.routes.ts` — Route definitions
- `settings.types.ts` — Type definitions
- `alert-config-crud.service.ts` — BaseCrudService for alert configurations

## Dependencies

- **Depends on:** shared/services (MinIO for logo uploads, email service for user invites)
- **Depended on by:** agents (agent configuration, agent approvals), alerts (alert configs), deployments (deployment policies, computer groups)

## Notes

- This is the largest module by endpoint count
- Branding and vendor logo endpoints use multer for file uploads (10MB limit, PNG/JPG/GIF/SVG only)
- Deployment policies are also accessible via the jobs module at `/v1/deployment-policies/`
- Many settings are singletons (GET/PUT only, no list/create/delete)
