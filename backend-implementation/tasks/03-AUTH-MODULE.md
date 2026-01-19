# Task 03: Authentication Module

## Overview
Implement complete authentication system including login, logout, token refresh, password reset, and user onboarding.

**Priority:** P0 - Core Feature
**Dependencies:** Tasks 01 (Database), 02 (Core Utilities)
**Estimated Complexity:** Medium
**Parallel:** Yes (after infrastructure)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| API Spec | `backend-debt/auth-api.yaml` | OpenAPI specification |
| Implementation Guide | `backend-debt/AUTH-IMPLEMENTATION.md` | TDD scenarios, data models |
| Frontend Service | `frontend/src/services/auth.service.ts` | API calls frontend makes |
| MSW Handlers | `frontend/src/mocks/handlers/auth.handlers.ts` | Expected responses |
| Types | `frontend/src/types/auth.types.ts` | TypeScript interfaces |

---

## Endpoints to Implement

```
POST   /v1/auth/login              - User login
POST   /v1/auth/logout             - User logout
POST   /v1/auth/refresh            - Refresh tokens
POST   /v1/auth/forgot-password    - Request password reset
POST   /v1/auth/reset-password     - Reset password with token
POST   /v1/auth/complete-onboarding - Complete first-time setup
GET    /v1/user/me                 - Get current user
```

---

## Module Structure

```
src/modules/auth/
├── auth.controller.ts      # HTTP handlers
├── auth.service.ts         # Business logic
├── auth.routes.ts          # Route definitions
├── auth.validators.ts      # Zod schemas
├── auth.types.ts           # TypeScript types
└── __tests__/
    ├── auth.controller.test.ts
    ├── auth.service.test.ts
    └── auth.integration.test.ts
```

---

## Implementation

### Route Definitions

**src/modules/auth/auth.routes.ts:**
```typescript
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '@middleware/validation';
import { authenticate } from '@middleware/auth';
import { authRateLimit } from '@middleware/rateLimit';
import { audit } from '@middleware/audit';
import {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeOnboardingSchema,
} from './auth.validators';

const router = Router();
const controller = new AuthController();

// Public routes (with rate limiting)
router.post(
  '/login',
  authRateLimit,
  validate({ body: loginSchema }),
  audit({ action: 'LOGIN', module: 'auth' }),
  controller.login
);

router.post(
  '/forgot-password',
  authRateLimit,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPassword
);

router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  controller.resetPassword
);

router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  controller.refresh
);

// Protected routes
router.post(
  '/logout',
  authenticate,
  audit({ action: 'LOGOUT', module: 'auth' }),
  controller.logout
);

router.post(
  '/complete-onboarding',
  authenticate,
  validate({ body: completeOnboardingSchema }),
  audit({ action: 'COMPLETE_ONBOARDING', module: 'auth' }),
  controller.completeOnboarding
);

// User routes
router.get('/user/me', authenticate, controller.getCurrentUser);

export const authRoutes = router;
```

### Controller

**src/modules/auth/auth.controller.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import type {
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  CompleteOnboardingInput,
} from './auth.validators';

export class AuthController {
  private authService = new AuthService();

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: LoginInput = req.body;
      const result = await this.authService.login(input.email, input.password);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.authService.logout(req.user!.userId);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: RefreshTokenInput = req.body;
      const result = await this.authService.refreshToken(input.refreshToken);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: ForgotPasswordInput = req.body;
      await this.authService.forgotPassword(input.email);

      // Always return success for security (don't reveal if email exists)
      res.json({ message: 'Password reset instructions sent to email' });
    } catch (error) {
      // Still return success even if email not found
      res.json({ message: 'Password reset instructions sent to email' });
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: ResetPasswordInput = req.body;
      await this.authService.resetPassword(input.token, input.password);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  };

  completeOnboarding = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: CompleteOnboardingInput = req.body;
      const result = await this.authService.completeOnboarding(
        req.user!.userId,
        input
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.authService.getUserById(req.user!.userId);

      res.json(user);
    } catch (error) {
      next(error);
    }
  };
}
```

### Service

**src/modules/auth/auth.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { hashPassword, comparePassword, generateToken, hashString } from '@shared/utils/crypto';
import { generateTokenPair, verifyToken, generateAccessToken, generateRefreshToken } from '@shared/utils/jwt';
import { addDuration } from '@shared/utils/date';
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@shared/errors/httpErrors';
import type { CompleteOnboardingInput } from './auth.validators';

export class AuthService {
  /**
   * Authenticate user and return tokens
   */
  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
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

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isOnboarded: user.isOnboarded,
        organizationId: user.organizationId,
        departmentId: user.departmentId,
        locationId: user.locationId,
      },
    };
  }

  /**
   * Logout user - revoke refresh token
   */
  async logout(userId: string) {
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
  async refreshToken(refreshToken: string) {
    // Verify token signature
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
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
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

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
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
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

    // TODO: Send email with reset link
    // EmailService.sendPasswordResetEmail(user.email, resetToken);

    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
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
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /**
   * Complete user onboarding
   */
  async completeOnboarding(userId: string, input: CompleteOnboardingInput) {
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
        name: updatedUser.name,
        contactNumber: updatedUser.contactNumber,
        isOnboarded: updatedUser.isOnboarded,
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
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

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      contactNumber: user.contactNumber,
      role: user.role,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      locationId: user.locationId,
      isOnboarded: user.isOnboarded,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
```

---

## TDD Test Scenarios

### Unit Tests: Auth Service

**src/modules/auth/__tests__/auth.service.test.ts:**
```typescript
import { AuthService } from '../auth.service';
import { prisma } from '@/db/client';
import { hashPassword } from '@shared/utils/crypto';

// Mock Prisma
jest.mock('@/db/client', () => ({
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

describe('AuthService', () => {
  const authService = new AuthService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: await hashPassword('password123'),
        name: 'Test User',
        role: 'user',
        isActive: true,
        isOnboarded: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login('user@example.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('user@example.com');
    });

    it('should throw UnauthorizedError for invalid email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('invalid@example.com', 'password123')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: await hashPassword('password123'),
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login('user@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw ForbiddenError for disabled account', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: await hashPassword('password123'),
        isActive: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login('user@example.com', 'password123')
      ).rejects.toThrow('Account is disabled');
    });
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedError for revoked token', async () => {
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.refreshToken('some-refresh-token')
      ).rejects.toThrow();
    });
  });

  describe('completeOnboarding', () => {
    it('should throw BadRequestError if already onboarded', async () => {
      const mockUser = {
        id: 'user-1',
        isOnboarded: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.completeOnboarding('user-1', {
          name: 'Test',
          contactNumber: '+1234567890',
          password: 'Password123',
          confirmPassword: 'Password123',
        })
      ).rejects.toThrow('User already onboarded');
    });
  });
});
```

### Integration Tests

**src/modules/auth/__tests__/auth.integration.test.ts:**
```typescript
import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = createApp();

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Create test user
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: await hashPassword('Password123'),
        name: 'Test User',
        role: 'user',
        isActive: true,
        isOnboarded: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
    await prisma.$disconnect();
  });

  describe('POST /v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UnauthorizedError');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          password: 'Password123',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      const { refreshToken } = loginResponse.body;

      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v1/user/me', () => {
    it('should return current user for valid token', async () => {
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .get('/v1/user/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/v1/user/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('UnauthorizedError');
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      const { accessToken } = loginResponse.body;

      const response = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /v1/auth/forgot-password', () => {
    it('should always return success (security)', async () => {
      const response = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset instructions sent to email');
    });
  });
});
```

---

## Frontend Expectations

Based on `frontend/src/services/auth.service.ts`:

```typescript
// Frontend expects these exact response shapes:

// Login response
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isOnboarded: boolean;
  }
}

// Refresh response
{
  accessToken: string;
  refreshToken: string;
}

// User me response
{
  id: string;
  email: string;
  name: string;
  contactNumber?: string;
  role: string;
  organizationId?: string;
  departmentId?: string;
  locationId?: string;
  isOnboarded: boolean;
  createdAt: string;
}
```

---

## Verification Checklist

- [ ] Login returns tokens and user data
- [ ] Login validates email format
- [ ] Login returns 401 for wrong credentials
- [ ] Login returns 403 for disabled account
- [ ] Rate limiting works (5 attempts/15 min)
- [ ] Refresh token rotation works
- [ ] Refresh token revocation works
- [ ] Password reset creates token
- [ ] Password reset always returns success
- [ ] Reset password validates token
- [ ] Onboarding updates user profile
- [ ] Onboarding requires non-onboarded user
- [ ] GET /user/me returns current user
- [ ] Logout revokes refresh tokens
- [ ] All error responses match expected format

---

## Next Task
After completing this task, proceed to:
- **Task 04: Agents Module** - Agent registration and management
- **Task 05: Assets Module** - Asset CRUD operations
