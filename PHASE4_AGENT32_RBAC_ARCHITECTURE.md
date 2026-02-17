# RBAC Architecture & Implementation Guide

**Phase**: Phase 4
**Component**: Role-Based Access Control (RBAC)
**Status**: Production Ready
**Last Updated**: February 17, 2026

---

## Overview

PatchIQ implements a comprehensive RBAC system protecting 15 modules with 4 permission levels (view, add, edit, delete). The system consists of:

1. **Backend**: Express.js middleware + Prisma database
2. **Frontend**: React Query hooks + error handling
3. **Database**: PostgreSQL with role and permission storage

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Components (Assets, Patches, Settings, etc.)         │  │
│  │  - Show/Hide buttons based on actions                 │  │
│  │  - Call API methods via services                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Service (axios interceptor)                       │  │
│  │  - Add auth token to requests                          │  │
│  │  - Handle 403 errors gracefully                        │  │
│  │  - Unwrap API envelope                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
         HTTP Request with Authorization Header
                  {"Authorization": "Bearer TOKEN"}
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend (Express.js / Node.js)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Auth Middleware                                       │  │
│  │  - Verify JWT token                                    │  │
│  │  - Extract user.roleId from token                      │  │
│  │  - Attach user to req.user                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  RBAC Middleware (checkPermission)                     │  │
│  │  - Fetch role from database (with 60s cache)           │  │
│  │  - Check if user.roleId has permission                 │  │
│  │  - Admin bypass for system admin                       │  │
│  │  - Return 403 if denied                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Route Handler (Controller)                            │  │
│  │  - Execute business logic (only if permission passed)  │  │
│  │  - Return 200 OK with data                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Database (PostgreSQL via Prisma)                      │  │
│  │  - Store/retrieve data                                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
         HTTP Response (200 OK or 403 Forbidden)
         {"success": true, "data": {...}}
         or
         {"success": false, "error": {"message": "..."}}
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  - Display data (200 OK)                                     │
│  - Show error toast/modal (403)                              │
│  - Redirect to login (401)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. RBAC Middleware

**File**: `/backend/src/middleware/rbac.ts`

#### Function: `checkPermission(module, action)`

```typescript
export function checkPermission(
  module: PermissionModule,
  action: PermissionAction,
): RequestHandler {
  return async (req, res, next) => {
    // 1. Get user from token (attached by auth middleware)
    const user = req.user;

    // 2. Fetch role (with caching)
    const role = await getRole(user.roleId);

    // 3. Admin bypass (only system admin role)
    if (role.name === 'admin' && role.isSystem === true) {
      return next();  // Skip permission check
    }

    // 4. Check permissions JSON
    const modulePerms = role.permissions[module];
    if (modulePerms && modulePerms[action] === true) {
      return next();  // Permission granted
    }

    // 5. Permission denied
    return next(
      new ForbiddenError(`You do not have permission to ${action} ${module}`)
    );
  };
}
```

#### Role Caching

```typescript
const CACHE_TTL_MS = 60_000;  // 60 seconds
const roleCache = new Map<string, CachedRole>();

// Automatic expiration on TTL
// Manual invalidation available
invalidateRoleCache(roleId);
```

**Performance**: Role lookup adds ~5-10ms to first request, <1ms for cached.

### 2. Permission Schema

**File**: `/backend/src/db/prisma/schema.prisma`

```prisma
model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  isSystem    Boolean  @default(false)
  permissions Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users         User[]
  groupMappings LdapGroupMapping[]

  @@map("roles")
}
```

**Permissions JSON Structure**:
```json
{
  "MODULE_NAME": {
    "view": boolean,
    "add": boolean,
    "edit": boolean,
    "delete": boolean
  },
  ...
}
```

### 3. System Roles

**File**: `/backend/src/db/prisma/seed.ts` (lines 96-152)

#### Admin Role
```typescript
{
  name: 'admin',
  description: 'Full system access',
  isSystem: true,
  permissions: {
    // All modules: all actions enabled
    agents: { view: true, add: true, edit: true, delete: true },
    assets: { view: true, add: true, edit: true, delete: true },
    patches: { view: true, add: true, edit: true, delete: true },
    vulnerabilities: { view: true, add: true, edit: true, delete: true },
    jobs: { view: true, add: true, edit: true, delete: true },
    discovery: { view: true, add: true, edit: true, delete: true },
    reports: { view: true, add: true, edit: true, delete: true },
    dashboard: { view: true, add: true, edit: true, delete: true },
    settings: { view: true, add: true, edit: true, delete: true },
    deployments: { view: true, add: true, edit: true, delete: true },
    notifications: { view: true, add: true, edit: true, delete: true },
    hub: { view: true, add: true, edit: true, delete: true },
    'patch-repository': { view: true, add: true, edit: true, delete: true },
    'patch-templates': { view: true, add: true, edit: true, delete: true },
    ai: { view: true, add: true, edit: true, delete: true }
  }
}
```

#### User Role (Read-Only)
```typescript
{
  name: 'user',
  description: 'Basic user access',
  isSystem: true,
  permissions: {
    // Read-only for most modules
    agents: { view: true, add: false, edit: false, delete: false },
    assets: { view: true, add: false, edit: false, delete: false },
    patches: { view: true, add: false, edit: false, delete: false },
    vulnerabilities: { view: true, add: false, edit: false, delete: false },
    jobs: { view: true, add: false, edit: false, delete: false },
    discovery: { view: true, add: false, edit: false, delete: false },
    reports: { view: true, add: false, edit: false, delete: false },
    dashboard: { view: true, add: false, edit: false, delete: false },
    // No settings access
    settings: { view: false, add: false, edit: false, delete: false },
    deployments: { view: true, add: false, edit: false, delete: false },
    notifications: { view: true, add: false, edit: false, delete: false },
    // No hub access
    hub: { view: false, add: false, edit: false, delete: false },
    'patch-repository': { view: true, add: false, edit: false, delete: false },
    'patch-templates': { view: true, add: false, edit: false, delete: false },
    ai: { view: true, add: false, edit: false, delete: false }
  }
}
```

### 4. Route Protection Examples

**File**: `/backend/src/modules/settings/settings.routes.ts`

```typescript
import { checkPermission } from '@middleware/rbac';

// View endpoint (read access)
router.get(
  '/organizations',
  checkPermission('settings', 'view'),  // ← Permission check
  validateQuery(listOrganizationsQuerySchema),
  settingsController.listOrganizations.bind(settingsController)
);

// Create endpoint (write access)
router.post(
  '/organizations',
  checkPermission('settings', 'add'),   // ← Permission check
  validateBody(createOrganizationSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.ORGANIZATION }),
  settingsController.createOrganization.bind(settingsController)
);

// Update endpoint (write access)
router.put(
  '/organizations/:id',
  checkPermission('settings', 'edit'),  // ← Permission check
  validateParams(idParamSchema),
  validateBody(updateOrganizationSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.ORGANIZATION, getResourceId: (req) => req.params.id }),
  settingsController.updateOrganization.bind(settingsController)
);

// Delete endpoint (write access)
router.delete(
  '/organizations/:id',
  checkPermission('settings', 'delete'), // ← Permission check
  validateParams(idParamSchema),
  audit({ action: AuditAction.DELETE, resource: AuditResource.ORGANIZATION, getResourceId: (req) => req.params.id }),
  settingsController.deleteOrganization.bind(settingsController)
);
```

### 5. Error Handling

**File**: `/backend/src/shared/errors/httpErrors.ts`

```typescript
export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(403, 'Forbidden', message);
  }
}

// Response format when caught by error middleware:
{
  "success": false,
  "error": {
    "code": "Forbidden",
    "message": "You do not have permission to add assets"
  }
}
```

### 6. Frontend API Interception

**File**: `/frontend/src/services/api.service.ts`

```typescript
// Response interceptor handles errors
this.api.interceptors.response.use(
  (response) => { /* success handling */ },
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear tokens and redirect
      localStorage.removeItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN);
      window.location.href = '/login';
    }

    // Extract error message from API response
    const body = error.response?.data;
    if (body && body.success === false && body.error) {
      const errObj = body.error as Record<string, unknown>;
      error.message = (errObj.message as string) || error.message;
    }

    return Promise.reject(error);  // Throw to component
  }
);
```

---

## Permission Matrix

### All Modules

| Module | Type | View | Add | Edit | Delete | Notes |
|--------|------|------|-----|------|--------|-------|
| agents | Infrastructure | ✅ | ❌ | ❌ | ❌ | System-level, read-only for users |
| assets | Core | ✅ | ❌ | ❌ | ❌ | Admin: full CRUD |
| patches | Core | ✅ | ❌ | ❌ | ❌ | Admin: create/deploy |
| vulnerabilities | Core | ✅ | ❌ | ❌ | ❌ | Admin: manage |
| jobs | Core | ✅ | ❌ | ❌ | ❌ | Admin: create/edit jobs |
| discovery | Core | ✅ | ❌ | ❌ | ❌ | Admin: trigger discovery |
| reports | Reporting | ✅ | ❌ | ❌ | ❌ | Read access only |
| dashboard | Core | ✅ | ❌ | ❌ | ❌ | Widgets/stats |
| **settings** | Admin | ❌ | ❌ | ❌ | ❌ | Admin only - organizations, users, branches |
| deployments | Core | ✅ | ❌ | ❌ | ❌ | Admin: deploy patches |
| notifications | Core | ✅ | ❌ | ❌ | ❌ | User: view own notifications |
| **hub** | Admin | ❌ | ❌ | ❌ | ❌ | Admin only - package management |
| patch-repository | Core | ✅ | ❌ | ❌ | ❌ | Read-only for users |
| patch-templates | Core | ✅ | ❌ | ❌ | ❌ | Admin: manage templates |
| ai | Experimental | ✅ | ❌ | ❌ | ❌ | Beta features |

**Legend for User Role**:
- ✅ = Permission granted
- ❌ = Permission denied

---

## Implementation Checklist

### Adding Permission to New Endpoint

1. **Identify module and action**:
   ```
   Module: 'assets'
   Action: 'add'  // one of: 'view', 'add', 'edit', 'delete'
   ```

2. **Add middleware to route**:
   ```typescript
   router.post(
     '/assets',
     checkPermission('assets', 'add'),  // ← ADD THIS LINE
     validateBody(schema),
     controller.createAsset.bind(controller)
   );
   ```

3. **Ensure error handling**:
   - Middleware throws `ForbiddenError` on permission denial
   - Error handler catches and returns 403 JSON response
   - ✅ Already implemented in error middleware

4. **Test**:
   - Call endpoint as read-only user
   - Verify 403 response
   - Verify error message is user-friendly

---

### Creating New Role

1. **Update database schema** (if adding new permissions):
   - No schema change needed (permissions stored as JSON)

2. **Create role in migration or seed**:
   ```typescript
   await prisma.role.create({
     data: {
       name: 'editor',
       description: 'Can edit content but not delete',
       isSystem: false,
       permissions: {
         assets: { view: true, add: true, edit: true, delete: false },
         patches: { view: true, add: true, edit: true, delete: false },
         // ... other modules
       }
     }
   });
   ```

3. **Assign users to role**:
   ```typescript
   await prisma.user.update({
     where: { id: userId },
     data: { roleId: roleId }
   });
   ```

4. **Invalidate role cache** (if role changed):
   ```typescript
   import { invalidateRoleCache } from '@middleware/rbac';
   invalidateRoleCache(roleId);
   ```

---

### Creating Custom Permissions

1. **For organization-specific permissions**:
   - Store in Role.permissions JSON with org prefix
   - Example: `"org-123-settings": { view: true, ... }`

2. **For fine-grained permissions**:
   - Add resource IDs to permission check
   - Example: `{ "asset-456": { edit: true, delete: false } }`

3. **For time-based permissions**:
   - Add expiration timestamp to permission
   - Example: `{ assets: { add: true, expiresAt: "2026-03-01" } }`

---

## Audit & Monitoring

### Logging Permission Denials

Add to RBAC middleware:
```typescript
if (permission not granted) {
  logger.info(
    {
      userId: user.id,
      roleId: role.id,
      module,
      action,
      endpoint: req.path,
    },
    'Permission denied'
  );
  return next(new ForbiddenError(...));
}
```

### Metrics to Track

1. **Permission denial rate** by module
2. **Permission denial rate** by user role
3. **Role cache hit rate**
4. **Role update frequency**
5. **Unauthorized access attempts**

---

## Security Considerations

### ✅ Strengths

1. **Principle of Least Privilege**: Default deny, explicit allow
2. **Role Caching**: Performance without sacrificing consistency
3. **Admin Bypass**: Only for system admin (configurable)
4. **Error Handling**: 403 doesn't leak sensitive info
5. **Token Verification**: JWT signature checked server-side

### ⚠️ Areas to Monitor

1. **Role Modification**: When admin changes role, ensure cache invalidation
2. **Token Expiry**: Tokens should have short expiry (15-60 min)
3. **Rate Limiting**: Consider rate limit on permission denied
4. **Audit Logging**: Log all permission denials for security review

### 🔐 Best Practices

1. **Never trust client-side role display**
   - Always verify permissions server-side
   - Even if UI shows button hidden, API should block

2. **Use HTTPS in production**
   - Tokens transmitted in Authorization header
   - Must be encrypted in transit

3. **Rotate encryption keys regularly**
   - JWT secret should be rotated
   - Database encryption key should be rotated

4. **Review permissions quarterly**
   - Audit role assignments
   - Remove unnecessary permissions
   - Update role descriptions

---

## Troubleshooting

### Issue: User Can't Perform Allowed Action

**Diagnosis**:
1. Check user.roleId in token: `jwt.io`
2. Query database: `SELECT permissions FROM roles WHERE id = ?`
3. Check RBAC middleware is applied to route
4. Check role cache: Clear and retry

**Fix**:
```bash
# Clear role cache (if using Redis)
redis-cli DEL "role:*"

# Or restart backend (in-memory cache)
# Restart backend service
```

### Issue: User Has Unwanted Access

**Diagnosis**:
1. Check user's role assignment
2. Check role's permission JSON
3. Verify admin bypass logic (should only work for isSystem=true AND name='admin')

**Fix**:
```typescript
// Update role
await prisma.role.update({
  where: { id: roleId },
  data: {
    permissions: {
      ...role.permissions,
      assets: { view: false, add: false, edit: false, delete: false }
    }
  }
});

// Invalidate cache
invalidateRoleCache(roleId);
```

### Issue: 403 Response Not Handling Correctly in Frontend

**Diagnosis**:
1. Check API interceptor is configured
2. Check error is of correct type (AxiosError with 403 status)
3. Check component error handling

**Fix**:
```typescript
// In component
try {
  await apiService.createAsset(data);
} catch (error) {
  if (error.response?.status === 403) {
    // Handle 403 specifically
    message.error(error.message);
  } else {
    throw error;  // Re-throw other errors
  }
}
```

---

## Performance Tuning

### Cache Configuration

**Current**: 60-second TTL, in-memory

**For High-Traffic**:
1. Increase TTL to 5 minutes
   ```typescript
   const CACHE_TTL_MS = 5 * 60 * 1000;
   ```

2. Use Redis for distributed cache
   ```typescript
   const cachedRole = await redis.get(`role:${roleId}`);
   ```

3. Implement lazy invalidation
   - Keep cache longer
   - Invalidate on explicit change

### Monitoring

**Metrics to collect**:
- Cache hit rate (target: >95%)
- Permission check latency (target: <10ms)
- 403 error rate (should be <1% for normal users)

---

## Upgrade Path

### Phase 5: Fine-Grained RBAC

1. Per-organization permissions
2. Per-asset type permissions
3. Attribute-based access control (ABAC)
4. Time-based access revocation

### Phase 6: Advanced Features

1. Role inheritance
2. Permission delegation
3. Temporary access grants
4. Access request workflow

---

## References

### Files

- Backend RBAC: `/backend/src/middleware/rbac.ts`
- Error Handling: `/backend/src/shared/errors/httpErrors.ts`
- Database Schema: `/backend/src/db/prisma/schema.prisma`
- Seed Data: `/backend/src/db/prisma/seed.ts`
- Frontend API: `/frontend/src/services/api.service.ts`

### Documentation

- RBAC Report: `/PHASE4_AGENT32_RBAC_PERMISSION_ERRORS.md`
- Manual Test Guide: `/PHASE4_AGENT32_MANUAL_TEST_GUIDE.md`

### Standards

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Role-Based Access Control](https://en.wikipedia.org/wiki/Role-based_access_control)

---

**Document Version**: 1.0
**Last Updated**: February 17, 2026
**Status**: ✅ Production Ready
**Next Review**: Phase 5
