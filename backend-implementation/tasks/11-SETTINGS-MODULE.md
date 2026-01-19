# Task 11: Settings Module

## Overview
Implement comprehensive settings management including organization structure, users, roles, alerts, and system configuration.

**Priority:** P2 - Supporting Feature
**Dependencies:** Task 03
**Estimated Complexity:** High
**Parallel:** Yes (with Tasks 12, 13)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Implementation Guide | `backend-debt/SETTINGS-IMPLEMENTATION.md` | Core settings |
| Extended Guide | `backend-debt/SETTINGS-EXTENDED-IMPLEMENTATION.md` | Additional settings |

---

## Endpoints to Implement (60+ endpoints)

```
# Organization Structure
GET/POST/PUT/DELETE /v1/settings/organizations
GET/POST/PUT/DELETE /v1/settings/branches
GET/POST/PUT/DELETE /v1/settings/departments
GET/POST/PUT/DELETE /v1/settings/locations

# User Management
GET    /v1/settings/users             - List users
POST   /v1/settings/users             - Create/invite user
GET    /v1/settings/users/:id         - Get user details
PUT    /v1/settings/users/:id         - Update user
DELETE /v1/settings/users/:id         - Soft delete user
POST   /v1/settings/users/:id/suspend - Suspend user
POST   /v1/settings/users/:id/activate - Activate user
POST   /v1/settings/users/:id/reset-password - Force password reset

# Roles & Permissions
GET    /v1/settings/roles             - List roles
POST   /v1/settings/roles             - Create role
PUT    /v1/settings/roles/:id         - Update role
DELETE /v1/settings/roles/:id         - Delete role (not system roles)

# Alert Configuration
GET/PUT /v1/settings/alerts/email
GET/PUT /v1/settings/alerts/slack
GET/PUT /v1/settings/alerts/sms
GET/PUT /v1/settings/alerts/webhook

# Server Settings
GET/PUT /v1/settings/server           - Session timeout, log level, etc.

# Mail Server
GET/PUT /v1/settings/mail-server
POST   /v1/settings/mail-server/test  - Test mail config

# LDAP Configuration
GET    /v1/settings/ldap-configs
POST   /v1/settings/ldap-configs
PUT    /v1/settings/ldap-configs/:id
DELETE /v1/settings/ldap-configs/:id
POST   /v1/settings/ldap-configs/:id/test - Test LDAP connection

# License
GET/PUT /v1/settings/platform-license
POST   /v1/settings/platform-license/validate

# Agent Settings
GET/PUT /v1/settings/agent-config

# Computer Groups
GET/POST/PUT/DELETE /v1/settings/computer-groups

# Audit Logs
GET    /v1/settings/audit             - List audit logs
GET    /v1/settings/audit/export      - Export to CSV
```

---

## Key Business Rules

1. **Default Entities Cannot Be Deleted**
   - Default organization, branch cannot be deleted
   - System roles (admin, user) cannot be deleted

2. **User Management**
   - Soft deletes for audit trail
   - Email invitation tokens expire in 7 days
   - Password reset tokens expire in 1 hour

3. **Role-Based Access Control**
   - Module-based permissions: view, add, edit, delete
   - Permissions stored as JSON in role record

4. **Session Management**
   - Absolute timeout (configurable)
   - Idle timeout (configurable)
   - Both enforced by auth middleware

---

## Service Implementation Highlights

**src/modules/settings/users.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { NotFoundError, ConflictError, BadRequestError } from '@shared/errors/httpErrors';
import { hashPassword, generateToken, hashString } from '@shared/utils/crypto';
import { addDuration } from '@shared/utils/date';

export class UsersService {
  async listUsers(params: { status?: string; role?: string; search?: string; page: number; limit: number }) {
    const where: any = { deletedAt: null };
    if (params.status) where.isActive = params.status === 'Active';
    if (params.role) where.role = params.role;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          contactNumber: true,
          role: true,
          isActive: true,
          isOnboarded: true,
          organization: { select: { name: true } },
          department: { select: { name: true } },
          location: { select: { name: true } },
          createdAt: true,
        },
        ...getPaginationParams(params),
      }),
      prisma.user.count({ where }),
    ]);

    return paginate(users.map(this.transformUser), total, params);
  }

  async createUser(data: any, createdBy: string) {
    // Check for existing email
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictError('Email already exists');
    }

    // Generate invitation token
    const inviteToken = generateToken();
    const tempPassword = generateToken(8);
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role || 'user',
        organizationId: data.organizationId,
        departmentId: data.departmentId,
        locationId: data.locationId,
        isActive: true,
        isOnboarded: false,
      },
    });

    // Store invite token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashString(inviteToken),
        expiresAt: addDuration(new Date(), '7d'),
      },
    });

    // TODO: Send invitation email
    console.log(`Invitation for ${data.email}: token=${inviteToken}`);

    return this.transformUser(user);
  }

  async updateUser(id: string, data: any) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    return prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        organizationId: data.organizationId,
        departmentId: data.departmentId,
        locationId: data.locationId,
      },
    });
  }

  async suspendUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Revoke all tokens
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async activateUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Revoke all tokens
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private transformUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      contactNumber: user.contactNumber,
      role: user.role,
      status: user.deletedAt ? 'Deleted'
        : !user.isActive ? 'Suspended'
        : !user.isOnboarded ? 'Invite Sent'
        : 'Active',
      organization: user.organization?.name,
      department: user.department?.name,
      location: user.location?.name,
      createdAt: user.createdAt?.toISOString(),
    };
  }
}
```

**src/modules/settings/roles.service.ts:**
```typescript
export class RolesService {
  async listRoles() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createRole(data: any) {
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictError('Role name already exists');
    }

    return prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: false,
        permissions: data.permissions || {},
      },
    });
  }

  async updateRole(id: string, data: any) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');

    return prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
      },
    });
  }

  async deleteRole(id: string) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Role not found');

    if (role.isSystem) {
      throw new BadRequestError('Cannot delete system role');
    }

    // Check if role is in use
    const usersWithRole = await prisma.user.count({
      where: { role: role.name, deletedAt: null },
    });
    if (usersWithRole > 0) {
      throw new ConflictError('Role is assigned to users');
    }

    await prisma.role.delete({ where: { id } });
  }
}
```

---

## TDD Test Scenarios

```typescript
describe('Settings - Users', () => {
  it('should invite new user', async () => {
    const response = await request(app)
      .post('/v1/settings/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('Invite Sent');
  });

  it('should reject duplicate email', async () => {
    const response = await request(app)
      .post('/v1/settings/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'existing@example.com' });

    expect(response.status).toBe(409);
  });

  it('should suspend user and revoke tokens', async () => {
    const response = await request(app)
      .post(`/v1/settings/users/${userId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    // Verify user cannot login
    const loginResponse = await request(app)
      .post('/v1/auth/login')
      .send({ email: userEmail, password: userPassword });

    expect(loginResponse.status).toBe(403);
  });
});

describe('Settings - Roles', () => {
  it('should not delete system role', async () => {
    const response = await request(app)
      .delete('/v1/settings/roles/admin-role-id')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('system role');
  });
});

describe('Settings - Organizations', () => {
  it('should not delete default organization', async () => {
    const response = await request(app)
      .delete('/v1/settings/organizations/default-org')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
  });
});
```

---

## Verification Checklist

- [ ] Organization hierarchy CRUD works
- [ ] User invitation flow works
- [ ] User suspension revokes tokens
- [ ] Soft delete preserves audit trail
- [ ] System roles cannot be deleted
- [ ] Default entities cannot be deleted
- [ ] Role permissions enforce correctly
- [ ] LDAP config encryption works
- [ ] Mail server test works
- [ ] License validation works
- [ ] Audit log export works
