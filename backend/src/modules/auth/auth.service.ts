import { createLogger } from '@shared/services/logger';
import { withTransaction } from '@shared/utils/transaction';
import { prisma } from '@db/client';
import { sendEmail } from '@shared/services/email.service';
import { buildPasswordResetEmailHtml } from '@shared/services/email-templates';
import { config } from '@config/index';
import { authenticateUser } from '@shared/services/ldap.service';
import { decrypt } from '@shared/utils/crypto';

const logger = createLogger('auth');
import {
  hashPassword,
  comparePassword,
  generateToken,
  hashString,
} from '@shared/utils/crypto';
import { generateTokenPair, verifyToken, signAccessToken, signRefreshToken } from '@shared/utils/jwt';
import { addDuration } from '@shared/utils/date';
import { validatePassword } from '@shared/utils/password-policy';
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ServiceUnavailableError,
} from '@shared/errors';
import type { RolePermissions } from '@shared/types';
import type {
  LoginResponse,
  RefreshResponse,
    OnboardingResponse,
  UserPublic,
  UserWithRelations,
} from './auth.types';
import type { CompleteOnboardingInput } from './auth.validators';
import { getTypedServerSettings } from '@modules/settings/server-settings';

/**
 * Read server settings and compute the JWT access token expiresIn override.
 * Returns undefined if no override (fall back to env var default).
 */
async function getSessionTimeoutOverride(): Promise<string | undefined> {
  try {
    const serverSettings = await getTypedServerSettings();
    if (serverSettings.sessionTimeout) {
      return `${serverSettings.sessionTimeoutMinutes}m`;
    }
    // Session timeout disabled — use generous 24-hour default
    return '1440m';
  } catch {
    // If settings can't be read, fall back to env var default
    return undefined;
  }
}

// Helper to transform DB user (with role relation) to frontend-compatible format
function toUserPublic(user: UserWithRelations): UserPublic {
  const nameParts = (user.name || '').split(' ');
  const firstName = nameParts[0] || user.email.split('@')[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    role: user.role.name,
    roleInfo: {
      id: user.role.id,
      name: user.role.name,
      permissions: (user.role.permissions ?? {}) as RolePermissions,
    },
    isOnboarded: user.isOnboarded,
    authSource: user.authSource || 'LOCAL',
    organizationId: user.organizationId,
    departmentId: user.departmentId,
    locationId: user.locationId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class AuthService {
  /**
   * Authenticate user and return tokens.
   * Supports both local and LDAP authentication.
   */
  async login(email: string, password: string, authType?: 'ldap' | 'local'): Promise<LoginResponse> {
    const normalizedEmail = email.toLowerCase();

    // Find existing user with role relation
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        role: true,
        organization: true,
        department: true,
        location: true,
      },
    });

    // Determine auth path
    const useLdapAuth =
      (authType === 'ldap') ||
      (!authType && user?.authSource === 'LDAP');

    if (useLdapAuth) {
      return this.ldapLogin(normalizedEmail, password, user);
    }

    // Local auth path
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account is disabled');
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens with roleId and roleName
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      roleId: user.roleId,
      organizationId: user.organizationId ?? undefined,
    };

    // R1A: Use session timeout from server settings if configured
    const accessExpiresIn = await getSessionTimeoutOverride();
    const { accessToken, refreshToken } = generateTokenPair(payload, accessExpiresIn);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashString(refreshToken),
        expiresAt: addDuration(new Date(), '7d'),
      },
    });

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: toUserPublic(user),
    };
  }

  /**
   * Authenticate via LDAP: try each active config, auto-provision or update local user.
   */
  private async ldapLogin(
    email: string,
    password: string,
    existingUser: UserWithRelations | null
  ): Promise<LoginResponse> {
    // Find active LDAP configs
    const ldapConfigs = await prisma.ldapConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (ldapConfigs.length === 0) {
      throw new BadRequestError('No active LDAP configuration found');
    }

    // Try each LDAP config until one succeeds
    let ldapResult: Awaited<ReturnType<typeof authenticateUser>> = null;
    let usedConfig: (typeof ldapConfigs)[number] | null = null;
    let allConnectionErrors = true;

    for (const cfg of ldapConfigs) {
      const decryptedConfig = {
        host: cfg.host,
        port: cfg.port,
        baseDn: cfg.baseDn,
        bindDn: decrypt(cfg.bindDnEnc),
        bindPassword: decrypt(cfg.bindPasswordEnc),
        userSearchBase: cfg.userSearchBase || undefined,
        emailAttribute: cfg.emailAttribute,
        nameAttribute: cfg.nameAttribute,
        userFilter: cfg.userFilter || undefined,
        groupSearchBase: cfg.groupSearchBase || undefined,
        groupMemberAttribute: cfg.groupMemberAttribute || undefined,
      };

      try {
        ldapResult = await authenticateUser(email, password, decryptedConfig);
        allConnectionErrors = false; // We reached the server (even if auth failed)
        if (ldapResult) {
          usedConfig = cfg;
          break;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        const isConnectionError =
          msg.includes('ECONNREFUSED') ||
          msg.includes('ETIMEDOUT') ||
          msg.includes('ENOTFOUND') ||
          msg.includes('timeout') ||
          msg.includes('getaddrinfo');

        if (isConnectionError) {
          logger.warn({ error: msg, configId: cfg.id }, 'LDAP server unreachable');
          continue;
        }
        // Non-connection error — stop trying
        allConnectionErrors = false;
        throw error;
      }
    }

    if (!ldapResult && allConnectionErrors) {
      throw new ServiceUnavailableError(
        'LDAP server is unreachable. Please try again later.'
      );
    }

    if (!ldapResult) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Resolve role from group mapping
    const roleId = await this.resolveRoleFromLdapGroups(
      ldapResult.memberOf,
      usedConfig!.id
    );

    // Find or create local user
    let localUser: UserWithRelations;
    if (existingUser) {
      localUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: ldapResult.name,
          roleId,
          ldapDn: ldapResult.dn,
          ldapConfigId: usedConfig!.id,
          authSource: 'LDAP',
          isActive: true,
          isOnboarded: true,
        },
        include: { role: true, organization: true, department: true, location: true },
      });
    } else {
      localUser = await prisma.user.create({
        data: {
          email,
          name: ldapResult.name,
          passwordHash: '', // Never used for LDAP users
          roleId,
          ldapDn: ldapResult.dn,
          ldapConfigId: usedConfig!.id,
          authSource: 'LDAP',
          isActive: true,
          isOnboarded: true,
        },
        include: { role: true, organization: true, department: true, location: true },
      });
    }

    if (!localUser.isActive) {
      throw new ForbiddenError('Account is disabled');
    }

    // Generate JWT (same as local auth)
    const payload = {
      userId: localUser.id,
      email: localUser.email,
      role: localUser.role.name,
      roleId: localUser.roleId,
      organizationId: localUser.organizationId ?? undefined,
    };

    // R1A: Use session timeout from server settings if configured
    const ldapAccessExpiresIn = await getSessionTimeoutOverride();
    const { accessToken, refreshToken } = generateTokenPair(payload, ldapAccessExpiresIn);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: localUser.id,
        tokenHash: hashString(refreshToken),
        expiresAt: addDuration(new Date(), '7d'),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: localUser.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(
      { email, ldapConfigId: usedConfig!.id, userId: localUser.id, isNew: !existingUser },
      'LDAP login successful'
    );

    return {
      accessToken,
      refreshToken,
      user: toUserPublic(localUser),
    };
  }

  /**
   * Resolve the best-matching role from LDAP group mappings.
   * Uses highest priority match; defaults to 'user' role.
   */
  private async resolveRoleFromLdapGroups(
    memberOf: string[],
    ldapConfigId: string
  ): Promise<string> {
    const mappings = await prisma.ldapGroupMapping.findMany({
      where: { ldapConfigId },
      include: { role: true },
      orderBy: { priority: 'desc' },
    });

    // Find highest priority matching mapping (case-insensitive DN comparison)
    for (const mapping of mappings) {
      if (memberOf.some((group) => group.toLowerCase() === mapping.ldapGroupDn.toLowerCase())) {
        return mapping.roleId;
      }
    }

    // Default to "user" system role
    const defaultRole = await prisma.role.findFirst({
      where: { name: 'user', isSystem: true },
    });

    return defaultRole!.id;
  }

  /**
   * Logout user - revoke all refresh tokens
   */
  async logout(userId: string): Promise<void> {
    // Revoke all refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    // Verify token signature
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Check if token exists in database
    const tokenHash = hashString(refreshToken);
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: { role: true },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token expired or revoked');
    }

    if (!storedToken.user.isActive) {
      throw new ForbiddenError('Account is disabled');
    }

    // Revoke old refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens with roleId and roleName
    const payload = {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role.name,
      roleId: storedToken.user.roleId,
      organizationId: storedToken.user.organizationId ?? undefined,
    };

    // R1A: Use session timeout from server settings if configured
    const refreshAccessExpiresIn = await getSessionTimeoutOverride();
    const newAccessToken = signAccessToken(payload, refreshAccessExpiresIn);
    const newRefreshToken = signRefreshToken(payload);

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: hashString(newRefreshToken),
        expiresAt: addDuration(new Date(), '7d'),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't throw - return silently for security
      return;
    }

    if (user.authSource === 'LDAP') {
      throw new BadRequestError(
        'Password reset is not available for LDAP-authenticated users. Contact your directory administrator.'
      );
    }

    // Generate reset token
    const resetToken = generateToken();
    const tokenHash = hashString(resetToken);

    // Store token (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: addDuration(new Date(), '1h'),
      },
    });

    // Send password reset email (fire-and-forget)
    const resetLink = `${config.corsOrigin}/reset-password?token=${resetToken}`;
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'PatchIQ — Password Reset',
      html: buildPasswordResetEmailHtml(user.name || user.email, resetLink, '1 hour'),
    });

    logger.info({ email, success: emailResult.success, message: emailResult.message }, 'Password reset email status');
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashString(token);

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestError('Invalid or expired token');
    }

    if (resetToken.user.authSource === 'LDAP') {
      throw new BadRequestError(
        'Password reset is not available for LDAP-authenticated users. Contact your directory administrator.'
      );
    }

    // Validate password against policy
    const violations = await validatePassword(newPassword, prisma);
    if (violations.length > 0) {
      throw new BadRequestError('Password does not meet security requirements', {
        code: 'PASSWORD_POLICY_VIOLATION',
        details: violations,
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and mark token as used
    await withTransaction('resetPassword', async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
      // Revoke all refresh tokens
      await tx.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  /**
   * Complete user onboarding with token (for invited users - no auth required)
   */
  async onboardWithToken(input: {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<LoginResponse> {
    // Find the token in PasswordResetToken table (reused for invites)
    const tokenHash = hashString(input.token);
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { tokenHash },
      include: { user: { include: { role: true, organization: true, department: true, location: true } } },
    });

    if (!tokenRecord || tokenRecord.usedAt) {
      throw new BadRequestError('Token already used or invalid');
    }

    // Check expiry
    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestError('Invite token expired');
    }

    // Check user not already onboarded
    if (tokenRecord.user.isOnboarded) {
      throw new BadRequestError('User already onboarded');
    }

    // Validate password against policy
    const violations = await validatePassword(input.password, prisma);
    if (violations.length > 0) {
      throw new BadRequestError('Password does not meet security requirements', {
        code: 'PASSWORD_POLICY_VIOLATION',
        details: violations,
      });
    }

    // Hash password and update user
    const passwordHash = await hashPassword(input.password);
    const updatedUser = await prisma.user.update({
      where: { id: tokenRecord.user.id },
      data: {
        passwordHash,
        isOnboarded: true,
        firstName: input.firstName,
        lastName: input.lastName,
        name: input.firstName && input.lastName ? `${input.firstName} ${input.lastName}` : tokenRecord.user.name,
      },
      include: { role: true, organization: true, department: true, location: true },
    });

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Generate and return JWT
    const payload = {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role.name,
      roleId: updatedUser.roleId,
      organizationId: updatedUser.organizationId ?? undefined,
    };

    // Use session timeout from server settings if configured
    const accessExpiresIn = await getSessionTimeoutOverride();
    const { accessToken, refreshToken } = generateTokenPair(payload, accessExpiresIn);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: updatedUser.id,
        tokenHash: hashString(refreshToken),
        expiresAt: addDuration(new Date(), '7d'),
      },
    });

    // Update last login time
    await prisma.user.update({
      where: { id: updatedUser.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: toUserPublic(updatedUser),
    };
  }

  /**
   * Complete user onboarding
   */
  async completeOnboarding(
    userId: string,
    input: CompleteOnboardingInput
  ): Promise<OnboardingResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isOnboarded) {
      throw new BadRequestError('User already onboarded');
    }

    // Validate password against policy
    const violations = await validatePassword(input.password, prisma);
    if (violations.length > 0) {
      throw new BadRequestError('Password does not meet security requirements', {
        code: 'PASSWORD_POLICY_VIOLATION',
        details: violations,
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(input.password);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        contactNumber: input.contactNumber,
        passwordHash,
        isOnboarded: true,
      },
    });

    return {
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name!,
        contactNumber: updatedUser.contactNumber,
        isOnboarded: updatedUser.isOnboarded,
      },
    };
  }

  /**
   * Get user by ID
   * Returns UserPublic format matching frontend expectations
   */
  async getUserById(userId: string): Promise<UserPublic> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        organization: true,
        department: true,
        location: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return toUserPublic(user);
  }
}

// Export singleton instance for convenience
export const authService = new AuthService();
