import { AuthService } from '../auth.service';
import { prisma } from '@db/client';
import { hashPassword, hashString } from '@shared/utils/crypto';
import { signRefreshToken } from '@shared/utils/jwt';
import { addDuration } from '@shared/utils/date';
import { UnauthorizedError, ForbiddenError, BadRequestError, NotFoundError } from '@shared/errors';

// Mock Prisma
jest.mock('@db/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const passwordHash = await hashPassword('Password123');
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
        name: 'Test User',
        role: 'user',
        isActive: true,
        isOnboarded: true,
        organizationId: null,
        departmentId: null,
        locationId: null,
        organization: null,
        department: null,
        location: null,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.login('user@example.com', 'Password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.isOnboarded).toBe(true);
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('invalid@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      const passwordHash = await hashPassword('Password123');
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
        isActive: true,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login('user@example.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ForbiddenError for disabled account', async () => {
      const passwordHash = await hashPassword('Password123');
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
        isActive: false,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login('user@example.com', 'Password123')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should normalize email to lowercase', async () => {
      const passwordHash = await hashPassword('Password123');
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
        name: 'Test User',
        role: 'user',
        isActive: true,
        isOnboarded: true,
        organizationId: null,
        departmentId: null,
        locationId: null,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await authService.login('USER@EXAMPLE.COM', 'Password123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        include: {
          organization: true,
          department: true,
          location: true,
        },
      });
    });
  });

  describe('logout', () => {
    it('should revoke all refresh tokens for user', async () => {
      (mockPrisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await authService.logout('user-1');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedError for invalid token signature', async () => {
      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for revoked token', async () => {
      const refreshToken = signRefreshToken({
        userId: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      (mockPrisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.refreshToken(refreshToken)
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should return new token pair for valid refresh token', async () => {
      const refreshToken = signRefreshToken({
        userId: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      const mockStoredToken = {
        id: 'token-1',
        tokenHash: hashString(refreshToken),
        userId: 'user-1',
        expiresAt: addDuration(new Date(), '7d'),
        revokedAt: null,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          role: 'user',
          isActive: true,
          organizationId: null,
        },
      };

      (mockPrisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(mockStoredToken);
      (mockPrisma.refreshToken.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).not.toBe(refreshToken); // Should be a new token
    });

    it('should throw ForbiddenError if user is disabled', async () => {
      const refreshToken = signRefreshToken({
        userId: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      const mockStoredToken = {
        id: 'token-1',
        tokenHash: hashString(refreshToken),
        userId: 'user-1',
        expiresAt: addDuration(new Date(), '7d'),
        revokedAt: null,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          role: 'user',
          isActive: false, // User disabled
          organizationId: null,
        },
      };

      (mockPrisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(mockStoredToken);

      await expect(
        authService.refreshToken(refreshToken)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('forgotPassword', () => {
    it('should create reset token for existing user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({});

      await authService.forgotPassword('user@example.com');

      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should not throw for non-existent email (security)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.forgotPassword('nonexistent@example.com')
      ).resolves.toBeUndefined();

      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestError for invalid token', async () => {
      (mockPrisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.resetPassword('invalid-token', 'NewPassword123')
      ).rejects.toThrow(BadRequestError);
    });

    it('should reset password and revoke tokens for valid token', async () => {
      const mockResetToken = {
        id: 'reset-1',
        tokenHash: hashString('valid-token'),
        userId: 'user-1',
        usedAt: null,
        expiresAt: addDuration(new Date(), '1h'),
        user: {
          id: 'user-1',
          email: 'user@example.com',
        },
      };

      (mockPrisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(mockResetToken);
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([{}, {}, {}]);

      await authService.resetPassword('valid-token', 'NewPassword123');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('completeOnboarding', () => {
    it('should throw NotFoundError for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.completeOnboarding('non-existent', {
          name: 'Test User',
          contactNumber: '+1234567890',
          password: 'Password123',
          confirmPassword: 'Password123',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if already onboarded', async () => {
      const mockUser = {
        id: 'user-1',
        isOnboarded: true,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.completeOnboarding('user-1', {
          name: 'Test',
          contactNumber: '+1234567890',
          password: 'Password123',
          confirmPassword: 'Password123',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should complete onboarding for non-onboarded user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        isOnboarded: false,
      };

      const updatedUser = {
        ...mockUser,
        name: 'Test User',
        contactNumber: '+1234567890',
        isOnboarded: true,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await authService.completeOnboarding('user-1', {
        name: 'Test User',
        contactNumber: '+1234567890',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(result.message).toBe('Onboarding completed successfully');
      expect(result.user.isOnboarded).toBe(true);
      expect(result.user.name).toBe('Test User');
    });
  });

  describe('getUserById', () => {
    it('should throw NotFoundError for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.getUserById('non-existent')
      ).rejects.toThrow(NotFoundError);
    });

    it('should return user data for existing user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        contactNumber: '+1234567890',
        role: 'user',
        organizationId: 'org-1',
        departmentId: null,
        locationId: null,
        isOnboarded: true,
        createdAt: new Date('2024-01-01'),
        organization: { id: 'org-1', name: 'Test Org' },
        department: null,
        location: null,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getUserById('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('user@example.com');
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.role).toBe('user');
      expect(result.isOnboarded).toBe(true);
      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});
