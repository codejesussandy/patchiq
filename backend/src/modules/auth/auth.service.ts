import { createLogger } from '@shared/services/logger';
import { withTransaction } from '@shared/utils/transaction';
import { prisma } from '@db/client';
import { sendEmail } from '@shared/services/email.service';
import { buildPasswordResetEmailHtml } from '@shared/services/email-templates';
import { config } from '@config/index';

const logger = createLogger('auth');
import {
  hashPassword,
  comparePassword,
  generateToken,
  hashString,
} from '@shared/utils/crypto';
import { generateTokenPair, verifyToken, signAccessToken, signRefreshToken } from '@shared/utils/jwt';
import { addDuration } from '@shared/utils/date';
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@shared/errors';
import type {
  LoginResponse,
  RefreshResponse,
    OnboardingResponse,
  UserPublic,
} from './auth.types';
import type { CompleteOnboardingInput } from './auth.validators';
import type { User } from '@prisma/client';

// Helper to transform DB user to frontend-compatible format
function toUserPublic(user: User): UserPublic {
  const nameParts = (user.name || '').split(' ');
  const firstName = nameParts[0] || user.email.split('@')[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    role: user.role,
    isOnboarded: user.isOnboarded,
    organizationId: user.organizationId,
    departmentId: user.departmentId,
    locationId: user.locationId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class AuthService {
  /**
   * Authenticate user and return tokens
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organization: true,
        department: true,
        location: true,
      },
    });

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

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ?? undefined,
    };

    const { accessToken, refreshToken } = generateTokenPair(payload);

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
      include: { user: true },
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

    // Generate new tokens
    const payload = {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      organizationId: storedToken.user.organizationId ?? undefined,
    };

    const newAccessToken = signAccessToken(payload);
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
