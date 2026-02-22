import { NotFoundError, BadRequestError, ConflictError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { sendEmail } from '@shared/services/email.service';
import { buildInvitationEmailHtml, buildAdminPasswordResetEmailHtml } from '@shared/services/email-templates';
import { hashPassword, generateToken, hashString } from '@shared/utils/crypto';
import { addDuration } from '@shared/utils/date';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { withTransaction } from '@shared/utils/transaction';
import { validatePassword } from '@shared/utils/password-policy';
import { prisma } from '@db/client';
import { config } from '@config/index';

const logger = createLogger('users');
import type {
  UserListItem,
  UserDetailResponse,
  UserAuditLogEntry,
  RoleResponse,
  RolePermissions,
  PaginatedResponse,
  MessageResponse,
  BulkImportResponse,
  BulkActionResponse,
} from './settings.types';
import type {
  CreateUserInput,
  UpdateUserInput,
  InviteUserInput,
  CreateRoleInput,
  UpdateRoleInput,
  BulkImportInput,
  BulkUserActionInput,
} from './settings.validators';

export class UsersService {
  // ============================================
  // Users
  // ============================================

  async listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    role?: string;
    organizationId?: string;
    departmentId?: string;
    locationId?: string;
    authSource?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<UserListItem>> {
    const where: Record<string, unknown> = {};

    // Status filtering
    if (params.status) {
      switch (params.status) {
        case 'Active':
          where.isActive = true;
          where.isOnboarded = true;
          where.deletedAt = null;
          break;
        case 'Suspended':
          where.isActive = false;
          where.deletedAt = null;
          break;
        case 'Invite Sent':
          where.isOnboarded = false;
          where.isActive = true;
          where.deletedAt = null;
          break;
        case 'Deleted':
          where.deletedAt = { not: null };
          break;
      }
    } else {
      // Default: exclude deleted users unless status=Deleted
      where.deletedAt = null;
    }

    if (params.role) {
      where.role = { name: params.role };
    }

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params.locationId) {
      where.locationId = params.locationId;
    }

    if (params.authSource) {
      where.authSource = params.authSource;
    }

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Sorting
    let orderBy: Record<string, unknown> = { createdAt: 'desc' };
    if (params.sortBy) {
      const sortOrder = params.sortOrder || 'desc';
      switch (params.sortBy) {
        case 'name':
          orderBy = { name: sortOrder };
          break;
        case 'email':
          orderBy = { email: sortOrder };
          break;
        case 'role':
          orderBy = { role: { name: sortOrder } };
          break;
        case 'lastLoginAt':
          orderBy = { lastLoginAt: sortOrder };
          break;
        case 'createdAt':
          orderBy = { createdAt: sortOrder };
          break;
        case 'status':
          // Status is a computed field, sort by isActive then isOnboarded
          orderBy = [{ isActive: sortOrder }, { isOnboarded: sortOrder }] as unknown as Record<string, unknown>;
          break;
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: { select: { name: true } },
          organization: { select: { name: true } },
          department: { select: { name: true } },
          location: { select: { name: true } },
        },
        orderBy,
        ...getPaginationParams(params),
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((u) => this.transformUserListItem(u));
    return paginate(data, total, params);
  }

  async getUser(id: string): Promise<UserDetailResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: { select: { name: true } },
        organization: { select: { name: true } },
        department: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
    }

    return this.transformUserDetail(user);
  }

  async createUser(input: CreateUserInput, createdById?: string): Promise<UserDetailResponse> {
    // Check for existing email
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email already exists');
    }

    // Resolve role: accept roleId (UUID) from frontend or role name from API clients
    let resolvedRoleId: string;
    if (input.roleId) {
      const role = await prisma.role.findUnique({ where: { id: input.roleId } });
      if (!role) throw new BadRequestError(`Role not found`);
      resolvedRoleId = role.id;
    } else {
      const roleName = input.role || 'user';
      const role = await prisma.role.findFirst({ where: { name: { equals: roleName, mode: 'insensitive' } } });
      if (!role) throw new BadRequestError(`Role '${roleName}' not found`);
      resolvedRoleId = role.id;
    }

    // Validate password against policy if provided
    let passwordHash: string;
    if (input.password) {
      const violations = await validatePassword(input.password, prisma);
      if (violations.length > 0) {
        throw new BadRequestError('Password does not meet security requirements', {
          code: 'PASSWORD_POLICY_VIOLATION',
          details: violations,
        });
      }
      passwordHash = await hashPassword(input.password);
    } else {
      // Generate random password if not provided
      passwordHash = await hashPassword(generateToken(12));
    }

    // Resolve field aliases: firstName+lastName→name, branchId→locationId, phone→contactNumber
    const firstName = input.firstName;
    const lastName = input.lastName;
    const displayName = input.name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || input.email);
    const locationId = input.locationId || input.branchId;
    const contactNumber = input.contactNumber || input.phone;

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: displayName,
        firstName: firstName,
        lastName: lastName,
        timezone: input.timezone,
        roleId: resolvedRoleId,
        organizationId: input.organizationId,
        departmentId: input.departmentId,
        locationId: locationId,
        contactNumber: contactNumber,
        isActive: true,
        isOnboarded: !!input.password,
      },
      include: {
        role: { select: { name: true } },
        organization: { select: { name: true } },
        department: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    // Create audit log
    await this.createAuditLog(createdById, 'CREATE', 'user', user.id, {
      email: user.email,
      name: user.name,
      role: user.role.name,
    });

    return this.transformUserDetail(user);
  }

  async updateUser(id: string, input: UpdateUserInput, _updatedById?: string): Promise<UserDetailResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: { select: { name: true } } },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
    }

    // Resolve new role: accept roleId (UUID) or role name
    let newRoleId: string | undefined;
    if (input.roleId) {
      const role = await prisma.role.findUnique({ where: { id: input.roleId } });
      if (!role) throw new BadRequestError(`Role not found`);
      newRoleId = role.id;
    } else if (input.role) {
      const role = await prisma.role.findFirst({ where: { name: { equals: input.role, mode: 'insensitive' } } });
      if (!role) throw new BadRequestError(`Role '${input.role}' not found`);
      newRoleId = role.id;
    }

    // Resolve field aliases
    const firstName = input.firstName;
    const lastName = input.lastName;
    const displayName = input.name || (firstName !== undefined || lastName !== undefined
      ? `${firstName ?? user.firstName ?? ''} ${lastName ?? user.lastName ?? ''}`.trim()
      : undefined);
    const locationId = input.locationId !== undefined ? input.locationId : input.branchId;
    const contactNumber = input.contactNumber !== undefined ? input.contactNumber : input.phone;

    const oldData = {
      name: user.name,
      role: user.role.name,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      locationId: user.locationId,
    };

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: displayName,
        firstName: firstName,
        lastName: lastName,
        timezone: input.timezone,
        roleId: newRoleId,
        organizationId: input.organizationId,
        departmentId: input.departmentId,
        locationId: locationId,
        contactNumber: contactNumber,
      },
      include: {
        role: { select: { name: true } },
        organization: { select: { name: true } },
        department: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    // Create audit log
    await this.createAuditLog(_updatedById, 'UPDATE', 'user', id, {
      before: oldData,
      after: {
        name: updated.name,
        role: updated.role.name,
        organizationId: updated.organizationId,
        departmentId: updated.departmentId,
        locationId: updated.locationId,
      },
    });

    return this.transformUserDetail(updated);
  }

  async deleteUser(id: string, deletedById?: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
    }

    // Self-protection: prevent deleting your own account
    if (deletedById && id === deletedById) {
      throw new BadRequestError('Cannot delete your own account');
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Revoke all tokens
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Create audit log
    await this.createAuditLog(deletedById, 'DELETE', 'user', id, {
      email: user.email,
      name: user.name,
    });
  }

  async inviteUser(input: InviteUserInput, invitedById?: string): Promise<MessageResponse> {
    // Check for existing email
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email already exists');
    }

    // Validate role exists and get its ID
    const role = await prisma.role.findUnique({
      where: { name: input.role },
    });
    if (!role) {
      throw new BadRequestError(`Role '${input.role}' not found`);
    }

    // Generate invite token and temp password
    const inviteToken = generateToken();
    const tempPassword = generateToken(12);
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        roleId: role.id,
        organizationId: input.organizationId,
        departmentId: input.departmentId,
        locationId: input.locationId,
        isActive: true,
        isOnboarded: false,
      },
    });

    // Store invite token (reuse password reset table)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashString(inviteToken),
        expiresAt: addDuration(new Date(), '7d'),
      },
    });

    // Create audit log
    await this.createAuditLog(invitedById, 'INVITE', 'user', user.id, {
      email: user.email,
      role: input.role,
    });

    // Send invitation email (fire-and-forget)
    let inviterName = 'An administrator';
    if (invitedById) {
      const inviter = await prisma.user.findUnique({
        where: { id: invitedById },
        select: { name: true, email: true },
      });
      if (inviter) {
        inviterName = inviter.name || inviter.email;
      }
    }

    const onboardingLink = `${config.corsOrigin}/onboarding?token=${inviteToken}`;
    const emailResult = await sendEmail({
      to: input.email,
      subject: "You've been invited to PatchIQ",
      html: buildInvitationEmailHtml(input.name || input.email, inviterName, input.role, onboardingLink, '7 days'),
    });

    logger.info({ email: input.email, success: emailResult.success }, 'Invitation email status');

    const emailStatus = emailResult.message.includes('mock') ? ' (mock mode)' : emailResult.success ? '' : ' (email delivery failed)';
    return { message: `Invitation sent successfully${emailStatus}` };
  }

  async suspendUser(id: string, suspendedById?: string): Promise<MessageResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
    }

    // Self-protection: prevent suspending your own account
    if (suspendedById && id === suspendedById) {
      throw new BadRequestError('Cannot suspend your own account');
    }

    if (!user.isActive) {
      throw new BadRequestError('User is already suspended');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Revoke all tokens
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Create audit log
    await this.createAuditLog(suspendedById, 'SUSPEND', 'user', id, {
      email: user.email,
    });

    return { message: 'User suspended successfully' };
  }

  async activateUser(id: string, activatedById?: string): Promise<MessageResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
    }

    if (user.isActive) {
      throw new BadRequestError('User is already active');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    // Create audit log
    await this.createAuditLog(activatedById, 'ACTIVATE', 'user', id, {
      email: user.email,
    });

    return { message: 'User activated successfully' };
  }

  async resetPassword(id: string, resetById?: string): Promise<MessageResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
    }

    if (user.authSource === 'LDAP') {
      throw new BadRequestError(
        'Password reset is not available for LDAP-authenticated users. Contact your directory administrator.'
      );
    }

    // Generate reset token
    const resetToken = generateToken();
    const tokenHash = hashString(resetToken);

    // Store token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: addDuration(new Date(), '24h'),
      },
    });

    // Create audit log
    await this.createAuditLog(resetById, 'RESET_PASSWORD', 'user', id, {
      email: user.email,
    });

    // Send admin-initiated password reset email (fire-and-forget)
    const resetLink = `${config.corsOrigin}/reset-password?token=${resetToken}`;
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'PatchIQ — Password Reset Requested',
      html: buildAdminPasswordResetEmailHtml(user.name || user.email, resetLink, '24 hours'),
    });

    logger.info({ email: user.email, success: emailResult.success }, 'Admin password reset email status');

    return { message: 'Password reset email sent successfully' };
  }

  async getUserAuditLog(id: string, params: { page: number; limit: number }): Promise<PaginatedResponse<UserAuditLogEntry>> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const where = {
      resource: 'user',
      resourceId: id,
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { email: true } },
        },
        orderBy: { timestamp: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data = logs.map(log => ({
      id: log.id,
      action: log.action,
      performedBy: log.user?.email ?? null,
      timestamp: log.timestamp.toISOString(),
      details: log.details as Record<string, unknown> | null,
      ipAddress: log.ipAddress,
    }));

    return paginate(data, total, params);
  }

  private transformUserListItem(user: {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    contactNumber: string | null;
    roleId?: string;
    role: { name: string };
    isActive: boolean;
    isOnboarded: boolean;
    deletedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    organizationId?: string | null;
    departmentId?: string | null;
    locationId?: string | null;
    organization: { name: string } | null;
    department: { name: string } | null;
    location: { name: string } | null;
  }): UserListItem {
    let status: UserListItem['status'] = 'Active';
    if (user.deletedAt) {
      status = 'Deleted';
    } else if (!user.isActive) {
      status = 'Suspended';
    } else if (!user.isOnboarded) {
      status = 'Invite Sent';
    }

    // Compute full name from firstName + lastName, fallback to name field
    const fullName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.name || null;

    return {
      id: user.id,
      email: user.email,
      name: fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      contactNumber: user.contactNumber,
      roleId: user.roleId,
      role: user.role.name,
      status,
      organizationId: user.organizationId ?? null,
      departmentId: user.departmentId ?? null,
      locationId: user.locationId ?? null,
      organization: user.organization?.name ?? null,
      department: user.department?.name ?? null,
      location: user.location?.name ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private transformUserDetail(user: {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    contactNumber: string | null;
    roleId: string;
    role: { name: string };
    isActive: boolean;
    isOnboarded: boolean;
    deletedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    organizationId: string | null;
    departmentId: string | null;
    locationId: string | null;
    organization: { name: string } | null;
    department: { name: string } | null;
    location: { name: string } | null;
  }): UserDetailResponse {
    const listItem = this.transformUserListItem(user);

    return {
      ...listItem,
      isOnboarded: user.isOnboarded,
      roleId: user.roleId,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      locationId: user.locationId,
      loginAllowed: user.isActive,
      endpointAssignmentAllowed: true,
    };
  }

  private async createAuditLog(
    userId: string | undefined,
    action: string,
    resource: string,
    resourceId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        timestamp: new Date(),
      },
    });
  }

  // ============================================
  // Roles
  // ============================================

  async listRoles(): Promise<RoleResponse[]> {
    const roles = await prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: { organization: true, _count: { select: { users: { where: { deletedAt: null } } } } },
    });

    return roles.map(role => this.transformRole(role, role._count.users));
  }

  async getRole(id: string): Promise<RoleResponse> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { organization: true, _count: { select: { users: { where: { deletedAt: null } } } } },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return this.transformRole(role, role._count.users);
  }

  async createRole(input: CreateRoleInput): Promise<RoleResponse> {
    // Check for duplicate name
    const existing = await prisma.role.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new ConflictError(`Role with name '${input.name}' already exists`);
    }

    const role = await prisma.role.create({
      data: {
        name: input.name,
        description: input.description,
        organizationId: input.organizationId,
        isSystem: false,
        permissions: input.permissions ? JSON.parse(JSON.stringify(input.permissions)) : {},
      },
      include: { organization: true },
    });

    return this.transformRole(role, 0);
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<RoleResponse> {
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // System role protection
    if (role.isSystem) {
      if (input.name && input.name !== role.name) {
        throw new BadRequestError('Cannot rename system role');
      }
      // Silently strip permissions for system roles — frontend forms send the full object back.
      // This prevents accidental modification while not breaking the edit-description flow.
      input = { ...input, permissions: undefined };
    }

    const { updated, userCount } = await withTransaction('updateRole', async (tx) => {
      // Check for duplicate name
      if (input.name && input.name !== role.name) {
        const existing = await tx.role.findUnique({
          where: { name: input.name },
        });
        if (existing) {
          throw new ConflictError(`Role with name '${input.name}' already exists`);
        }
      }

      const updated = await tx.role.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          organizationId: input.organizationId,
          permissions: input.permissions ? JSON.parse(JSON.stringify(input.permissions)) : undefined,
        },
        include: { organization: true },
      });

      const userCount = await tx.user.count({
        where: { roleId: updated.id, deletedAt: null },
      });

      return { updated, userCount };
    });

    return this.transformRole(updated, userCount);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestError('Cannot delete system role');
    }

    // Check if role is in use by active users (orphan prevention)
    const activeUsersWithRole = await prisma.user.count({
      where: { roleId: role.id, deletedAt: null },
    });

    if (activeUsersWithRole > 0) {
      throw new BadRequestError(
        `Cannot delete role with ${activeUsersWithRole} assigned user(s). Reassign them first.`
      );
    }

    // Reassign soft-deleted users to default 'user' role so FK constraint doesn't block deletion
    const defaultRole = await prisma.role.findUnique({ where: { name: 'user' } });
    if (defaultRole) {
      await prisma.user.updateMany({
        where: { roleId: role.id, deletedAt: { not: null } },
        data: { roleId: defaultRole.id },
      });
    }

    await prisma.role.delete({
      where: { id },
    });
  }

  private transformRole(
    role: {
      id: string;
      name: string;
      description: string | null;
      organizationId?: string | null;
      organization?: { id: string; name: string } | null;
      isSystem: boolean;
      permissions: unknown;
      createdAt: Date;
      updatedAt: Date;
    },
    userCount: number
  ): RoleResponse {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      organizationId: role.organizationId ?? null,
      organizationName: role.organization?.name ?? null,
      isSystem: role.isSystem,
      permissions: role.permissions as RolePermissions,
      users: userCount,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  // ============================================
  // R5: Bulk User Import
  // ============================================

  async bulkImportUsers(input: BulkImportInput, _importedById?: string): Promise<BulkImportResponse> {
    const results: BulkImportResponse['results'] = [];
    const seenEmails = new Set<string>();

    // Pre-fetch existing emails for dedup
    const inputEmails = input.users.map(u => u.email.toLowerCase());
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: inputEmails } },
      select: { email: true },
    });
    const existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));

    // Pre-fetch valid roles
    const roles = await prisma.role.findMany({ select: { id: true, name: true } });
    const roleMap = new Map(roles.map(r => [r.name.toLowerCase(), r.id]));

    // Validate and create each user
    for (let i = 0; i < input.users.length; i++) {
      const row = input.users[i];
      const email = row.email.toLowerCase();

      // Check duplicate within CSV
      if (seenEmails.has(email)) {
        results.push({ row: i + 1, email, status: 'failed', error: 'Duplicate email in import' });
        continue;
      }
      seenEmails.add(email);

      // Check existing
      if (existingEmailSet.has(email)) {
        results.push({ row: i + 1, email, status: 'failed', error: 'Email already exists' });
        continue;
      }

      // Validate role
      const roleId = roleMap.get(row.role.toLowerCase());
      if (!roleId) {
        results.push({ row: i + 1, email, status: 'failed', error: `Role '${row.role}' not found` });
        continue;
      }

      // Validate orgId if provided
      if (row.organizationId) {
        const org = await prisma.organization.findUnique({ where: { id: row.organizationId }, select: { id: true } });
        if (!org) {
          results.push({ row: i + 1, email, status: 'failed', error: 'Organization not found' });
          continue;
        }
      }

      // Validate deptId if provided
      if (row.departmentId) {
        const dept = await prisma.department.findUnique({ where: { id: row.departmentId }, select: { id: true } });
        if (!dept) {
          results.push({ row: i + 1, email, status: 'failed', error: 'Department not found' });
          continue;
        }
      }

      // Validate locationId if provided
      if (row.locationId) {
        const loc = await prisma.location.findUnique({ where: { id: row.locationId }, select: { id: true } });
        if (!loc) {
          results.push({ row: i + 1, email, status: 'failed', error: 'Location not found' });
          continue;
        }
      }

      try {
        // Create user with a random temporary password hash
        const tempPasswordHash = await hashPassword(generateToken(32));

        const user = await prisma.user.create({
          data: {
            email: row.email,
            name: row.name,
            passwordHash: tempPasswordHash,
            roleId,
            organizationId: row.organizationId,
            departmentId: row.departmentId,
            locationId: row.locationId,
            contactNumber: row.contactNumber,
            isOnboarded: false,
            isActive: true,
          },
        });

        existingEmailSet.add(email); // Prevent duplicates in remaining rows

        results.push({
          row: i + 1,
          email,
          status: row.sendInvite ? 'invited' : 'created',
          userId: user.id,
        });
      } catch (error) {
        results.push({ row: i + 1, email, status: 'failed', error: 'Failed to create user' });
      }
    }

    return {
      totalRows: input.users.length,
      successful: results.filter(r => r.status !== 'failed').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    };
  }

  getImportTemplate(): string {
    return 'email,name,role,organizationId,departmentId,locationId,contactNumber,sendInvite\njohn@example.com,John Doe,user,,,,+1234567890,false';
  }

  // ============================================
  // R6: Bulk User Status Change
  // ============================================

  async bulkSuspendUsers(input: BulkUserActionInput, callerUserId?: string): Promise<BulkActionResponse> {
    const users = await prisma.user.findMany({
      where: { id: { in: input.userIds }, deletedAt: null },
      select: { id: true, email: true, isActive: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const results: BulkActionResponse['results'] = [];

    for (const userId of input.userIds) {
      const user = userMap.get(userId);
      if (!user) {
        results.push({ userId, email: 'unknown', status: 'skipped', error: 'User not found' });
        continue;
      }
      if (userId === callerUserId) {
        results.push({ userId, email: user.email, status: 'skipped', error: 'Cannot suspend your own account' });
        continue;
      }
      if (!user.isActive) {
        results.push({ userId, email: user.email, status: 'skipped', error: 'User already suspended' });
        continue;
      }

      await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
      await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      results.push({ userId, email: user.email, status: 'success' });
    }

    return {
      total: input.userIds.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      results,
    };
  }

  async bulkActivateUsers(input: BulkUserActionInput): Promise<BulkActionResponse> {
    const users = await prisma.user.findMany({
      where: { id: { in: input.userIds }, deletedAt: null },
      select: { id: true, email: true, isActive: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const results: BulkActionResponse['results'] = [];

    for (const userId of input.userIds) {
      const user = userMap.get(userId);
      if (!user) {
        results.push({ userId, email: 'unknown', status: 'skipped', error: 'User not found' });
        continue;
      }
      if (user.isActive) {
        results.push({ userId, email: user.email, status: 'skipped', error: 'User already active' });
        continue;
      }

      await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
      results.push({ userId, email: user.email, status: 'success' });
    }

    return {
      total: input.userIds.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      results,
    };
  }

  async bulkDeleteUsers(input: BulkUserActionInput, callerUserId?: string): Promise<BulkActionResponse> {
    const users = await prisma.user.findMany({
      where: { id: { in: input.userIds }, deletedAt: null },
      select: { id: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const results: BulkActionResponse['results'] = [];

    for (const userId of input.userIds) {
      const user = userMap.get(userId);
      if (!user) {
        results.push({ userId, email: 'unknown', status: 'skipped', error: 'User not found' });
        continue;
      }
      if (userId === callerUserId) {
        results.push({ userId, email: user.email, status: 'skipped', error: 'Cannot delete your own account' });
        continue;
      }

      await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date(), isActive: false } });
      await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      results.push({ userId, email: user.email, status: 'success' });
    }

    return {
      total: input.userIds.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      results,
    };
  }
}

export const usersService = new UsersService();
