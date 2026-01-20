import request from 'supertest';
import { getTestApp } from '../utils/testHelpers';
import { prisma } from '@db/client';
import { hashPassword, hashString } from '@shared/utils/crypto';

const app = getTestApp();

describe('E2E: Authentication', () => {
  const testUserEmail = 'e2e-auth-test@patchiq.io';
  const testUserPassword = 'TestPass123!';
  let testUserId: string;

  beforeAll(async () => {
    // Create test user for auth tests
    const passwordHash = await hashPassword(testUserPassword);
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'E2E Auth Test User',
        passwordHash,
        role: 'user',
        isActive: true,
        isOnboarded: true,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup test user and related data
    await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('Complete Auth Lifecycle', () => {
    it('should complete full auth lifecycle: login -> access -> refresh -> logout', async () => {
      // 1. Login
      const loginRes = await request(app)
        .post('/v1/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('accessToken');
      expect(loginRes.body).toHaveProperty('refreshToken');
      expect(loginRes.body).toHaveProperty('user');
      expect(loginRes.body.user.email).toBe(testUserEmail);

      const { accessToken, refreshToken } = loginRes.body;

      // 2. Access protected resource with token
      const meRes = await request(app)
        .get('/v1/user/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.email).toBe(testUserEmail);

      // 3. Refresh token
      const refreshRes = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');

      const newAccessToken = refreshRes.body.accessToken;
      const newRefreshToken = refreshRes.body.refreshToken;

      // 4. New access token should work
      const meRes2 = await request(app)
        .get('/v1/user/me')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(meRes2.status).toBe(200);

      // 5. Old refresh token should be revoked (token rotation)
      const failedRefresh = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(failedRefresh.status).toBe(401);

      // 6. Logout
      const logoutRes = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(logoutRes.status).toBe(200);

      // 7. New refresh token should be revoked after logout
      const afterLogoutRefresh = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: newRefreshToken });

      expect(afterLogoutRefresh.status).toBe(401);
    });
  });

  describe('Login Validation', () => {
    it('should reject login with invalid email format', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'invalid-email', password: 'password' });

      // Backend returns 400 for validation errors
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ email: testUserEmail, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'nonexistent@patchiq.io', password: 'password' });

      expect(res.status).toBe(401);
    });

    it('should reject login with missing fields', async () => {
      const res = await request(app).post('/v1/auth/login').send({});

      // Backend returns 400 for validation errors
      expect(res.status).toBe(400);
    });
  });

  describe('Protected Routes', () => {
    it('should reject access without authorization header', async () => {
      const res = await request(app).get('/v1/user/me');

      expect(res.status).toBe(401);
    });

    it('should reject access with invalid token', async () => {
      const res = await request(app)
        .get('/v1/user/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });

    it('should reject access with expired token format', async () => {
      const res = await request(app)
        .get('/v1/user/me')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });
  });

  describe('Password Reset Flow', () => {
    let resetToken: string;

    it('should request password reset successfully', async () => {
      const res = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(res.status).toBe(200);

      // Get the reset token from database (in real scenario, sent via email)
      const token = await prisma.passwordResetToken.findFirst({
        where: {
          userId: testUserId,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(token).toBeDefined();
      // Store for next test - we need to find the actual token value
      // In tests, we can verify the token exists in DB
    });

    it('should silently succeed for non-existent email (security)', async () => {
      const res = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      // Should return success even for non-existent email (security best practice)
      expect(res.status).toBe(200);
    });

    it('should reject reset with invalid token', async () => {
      const res = await request(app)
        .post('/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

      expect(res.status).toBe(400);
    });

    it('should reject reset with mismatched passwords', async () => {
      const res = await request(app)
        .post('/v1/auth/reset-password')
        .send({
          token: 'some-token',
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!',
        });

      // Backend returns 400 for validation errors
      expect(res.status).toBe(400);
    });
  });

  describe('Disabled Account', () => {
    let disabledUserId: string;

    beforeAll(async () => {
      const passwordHash = await hashPassword('test123');
      const user = await prisma.user.create({
        data: {
          email: 'e2e-disabled@patchiq.io',
          name: 'Disabled User',
          passwordHash,
          role: 'user',
          isActive: false,
          isOnboarded: true,
        },
      });
      disabledUserId = user.id;
    });

    afterAll(async () => {
      await prisma.user.delete({ where: { id: disabledUserId } }).catch(() => {});
    });

    it('should reject login for disabled account', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'e2e-disabled@patchiq.io', password: 'test123' });

      expect(res.status).toBe(403);
      // ForbiddenError: { error: "Forbidden", message: "Account is disabled" }
      expect(res.body.message).toContain('disabled');
    });
  });
});

describe('E2E: User Onboarding', () => {
  let onboardingUserId: string;
  let onboardingToken: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword('temp123');
    const user = await prisma.user.create({
      data: {
        email: 'e2e-onboarding@patchiq.io',
        passwordHash,
        role: 'user',
        isActive: true,
        isOnboarded: false,
      },
    });
    onboardingUserId = user.id;

    // Login to get token
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'e2e-onboarding@patchiq.io', password: 'temp123' });

    onboardingToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: onboardingUserId } });
    await prisma.user.delete({ where: { id: onboardingUserId } }).catch(() => {});
  });

  it('should complete onboarding with valid data', async () => {
    const res = await request(app)
      .post('/v1/auth/complete-onboarding')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .send({
        name: 'John Doe',
        password: 'NewSecurePass123!',
        confirmPassword: 'NewSecurePass123!',
        contactNumber: '+1234567890',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('John Doe');
    expect(res.body.user.isOnboarded).toBe(true);
  });

  it('should reject duplicate onboarding', async () => {
    const res = await request(app)
      .post('/v1/auth/complete-onboarding')
      .set('Authorization', `Bearer ${onboardingToken}`)
      .send({
        name: 'John Doe Again',
        password: 'AnotherPass123!',
        confirmPassword: 'AnotherPass123!',
      });

    expect(res.status).toBe(400);
  });
});
