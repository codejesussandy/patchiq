import { prisma } from '@db/client';
import { NotFoundError, BadRequestError, ConflictError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { hashPassword, generateToken, hashString } from '@shared/utils/crypto';
import { addDuration } from '@shared/utils/date';
import type {
  UserListItem,
  UserDetailResponse,
  UserAuditLogEntry,
  RoleResponse,
  RolePermissions,
  PaginatedResponse,
  MessageResponse,
} from './settings.types';
import type {
  CreateUserInput,
  UpdateUserInput,
  InviteUserInput,
  CreateRoleInput,
  UpdateRoleInput,
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
  }): Promise<PaginatedResponse<UserListItem>> {
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (params.status) {
      switch (params.status) {
        case 'Active':
          where.isActive = true;
          where.isOnboarded = true;
          break;
        case 'Suspended':
          where.isActive = false;
          break;
        case 'Invite Sent':
          where.isOnboarded = false;
          where.isActive = true;
          break;
      }
    }

    if (params.role) {
      where.role = params.role;
    }

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          organization: { select: { name: true } },
          department: { select: { name: true } },
          location: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
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

    // Validate role exists
    if (input.role) {
      const role = await prisma.role.findUnique({
        where: { name: input.role },
      });
      if (!role) {
        throw new BadRequestError(`Role '${input.role}' not found`);
      }
    }

    // Generate password if provided
    const passwordHash = input.password
      ? await hashPassword(input.password)
      : await hashPassword(generateToken(12));

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        role: input.role || 'user',
        organizationId: input.organizationId,
        departmentId: input.departmentId,
        locationId: input.locationId,
        contactNumber: input.contactNumber,
        isActive: true,
        isOnboarded: !!input.password,
      },
      include: {
        organization: { select: { name: true } },
        department: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    // Create audit log
    await this.createAuditLog(createdById, 'CREATE', 'user', user.id, {
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return this.transformUserDetail(user);
  }

  async updateUser(id: string, input: UpdateUserInput, updatedById?: string): Promise<UserDetailResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
    }

    // Validate role exists if provided
    if (input.role) {
      const role = await prisma.role.findUnique({
        where: { name: input.role },
      });
      if (!role) {
        throw new BadRequestError(`Role '${input.role}' not found`);
      }
    }

    const oldData = {
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      locationId: user.locationId,
    };

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        role: input.role,
        organizationId: input.organizationId,
        departmentId: input.departmentId,
        locationId: input.locationId,
        contactNumber: input.contactNumber,
      },
      include: {
        organization: { select: { name: true } },
        department: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    // Create audit log
    await this.createAuditLog(updatedById, 'UPDATE', 'user', id, {
      before: oldData,
      after: {
        name: updated.name,
        role: updated.role,
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

    // Validate role exists
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
        role: input.role,
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
      role: user.role,
    });

    // TODO: Send invitation email
    console.log(`[DEV] Invitation for ${input.email}: token=${inviteToken}`);

    return { message: 'Invitation sent successfully' };
  }

  async suspendUser(id: string, suspendedById?: string): Promise<MessageResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
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

    // TODO: Send password reset email
    console.log(`[DEV] Password reset for ${user.email}: token=${resetToken}`);

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
    contactNumber: string | null;
    role: string;
    isActive: boolean;
    isOnboarded: boolean;
    deletedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
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

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      contactNumber: user.contactNumber,
      role: user.role,
      status,
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
    contactNumber: string | null;
    role: string;
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
    });

    // Get user counts for each role
    const userCounts = await prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: true,
    });

    const userCountMap = new Map(userCounts.map(uc => [uc.role, uc._count]));

    return roles.map(role => this.transformRole(role, userCountMap.get(role.name) ?? 0));
  }

  async getRole(id: string): Promise<RoleResponse> {
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const userCount = await prisma.user.count({
      where: { role: role.name, deletedAt: null },
    });

    return this.transformRole(role, userCount);
  }

  async createRole(input: CreateRoleInput): Promise<RoleResponse> {
    // Check for duplicate name
    const existing = await prisma.role.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new ConflictError('Role name already exists');
    }

    const role = await prisma.role.create({
      data: {
        name: input.name,
        description: input.description,
        isSystem: false,
        permissions: input.permissions ? JSON.parse(JSON.stringify(input.permissions)) : {},
      },
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

    // Cannot change system role name
    if (role.isSystem && input.name && input.name !== role.name) {
      throw new BadRequestError('Cannot modify system role name');
    }

    // Check for duplicate name
    if (input.name && input.name !== role.name) {
      const existing = await prisma.role.findUnique({
        where: { name: input.name },
      });
      if (existing) {
        throw new ConflictError('Role name already exists');
      }
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        permissions: input.permissions ? JSON.parse(JSON.stringify(input.permissions)) : undefined,
      },
    });

    const userCount = await prisma.user.count({
      where: { role: updated.name, deletedAt: null },
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

    // Check if role is in use
    const usersWithRole = await prisma.user.count({
      where: { role: role.name, deletedAt: null },
    });

    if (usersWithRole > 0) {
      throw new ConflictError('Role is assigned to users');
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
      isSystem: role.isSystem,
      permissions: role.permissions as RolePermissions,
      users: userCount,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}

export const usersService = new UsersService();
