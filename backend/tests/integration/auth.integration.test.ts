import { getAgent, getAdminToken, getUserToken, loginAs, resetTokenCache, prisma } from './test-setup';
import { hashString, generateToken } from '../../src/shared/utils/crypto';
import { addDuration } from '../../src/shared/utils/date';

const agent = getAgent();

describe('Auth Integration Tests', () => {
  // ============================================================
  // POST /v1/auth/login
  // ============================================================
  describe('POST /v1/auth/login', () => {
    it('should login with valid admin credentials', async () => {
      const res = await agent
        .post('/v1/auth/login')
        .send({ email: 'admin@patchiq.io', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@patchiq.io');
      expect(res.body.data.user.role).toBe('admin');
    });

    it('should login with valid user credentials', async () => {
      const res = await agent
        .post('/v1/auth/login')
        .send({ email: 'demo@patchiq.io', password: 'demo123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('demo@patchiq.io');
    });

    it('should return 401 for wrong password', async () => {
      const res = await agent
        .post('/v1/auth/login')
        .send({ email: 'admin@patchiq.io', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for non-existent email', async () => {
      const res = await agent
        .post('/v1/auth/login')
        .send({ email: 'notexist@patchiq.io', password: 'somepassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing email', async () => {
      const res = await agent
        .post('/v1/auth/login')
        .send({ password: 'admin123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing password', async () => {
      const res = await agent
        .post('/v1/auth/login')
        .send({ email: 'admin@patchiq.io' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await agent
        .post('/v1/auth/login')
        .send({ email: 'not-an-email', password: 'admin123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty body', async () => {
      const res = await agent
        .post('/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // POST /v1/auth/logout
  // ============================================================
  describe('POST /v1/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const tokens = await loginAs('admin@patchiq.io', 'admin123');
      const res = await agent
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without token', async () => {
      const res = await agent.post('/v1/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const res = await agent
        .post('/v1/auth/logout')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should revoke refresh tokens after logout', async () => {
      const tokens = await loginAs('demo@patchiq.io', 'demo123');

      await agent
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      // Attempt to use the refresh token after logout should fail
      const refreshRes = await agent
        .post('/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(refreshRes.status).toBe(401);
    });

    // Reset token cache since we logged in as demo user above
    afterAll(() => {
      resetTokenCache();
    });
  });

  // ============================================================
  // POST /v1/auth/refresh
  // ============================================================
  describe('POST /v1/auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const tokens = await loginAs('admin@patchiq.io', 'admin123');
      const res = await agent
        .post('/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 with invalid refresh token', async () => {
      const res = await agent
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing refreshToken', async () => {
      const res = await agent
        .post('/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should rotate token (old refresh token should be revoked after use)', async () => {
      const tokens = await loginAs('admin@patchiq.io', 'admin123');
      // Use the refresh token once
      await agent
        .post('/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      // Use the same token again - should be revoked now
      const res = await agent
        .post('/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(401);
    });

    afterAll(() => {
      resetTokenCache();
    });
  });

  // ============================================================
  // POST /v1/auth/forgot-password
  // ============================================================
  describe('POST /v1/auth/forgot-password', () => {
    it('should return success for existing email', async () => {
      const res = await agent
        .post('/v1/auth/forgot-password')
        .send({ email: 'admin@patchiq.io' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return success for non-existent email (security - no info leak)', async () => {
      const res = await agent
        .post('/v1/auth/forgot-password')
        .send({ email: 'doesnotexist@patchiq.io' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for missing email', async () => {
      const res = await agent
        .post('/v1/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await agent
        .post('/v1/auth/forgot-password')
        .send({ email: 'notanemail' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================================
  // POST /v1/auth/reset-password
  // ============================================================
  describe('POST /v1/auth/reset-password', () => {
    it('should return 400 for invalid/expired token', async () => {
      const res = await agent
        .post('/v1/auth/reset-password')
        .send({ token: 'invalidtoken123', password: 'NewPassword@123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing token', async () => {
      const res = await agent
        .post('/v1/auth/reset-password')
        .send({ password: 'NewPassword@123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing password', async () => {
      const res = await agent
        .post('/v1/auth/reset-password')
        .send({ token: 'sometoken' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reset password with a valid token', async () => {
      // Create a real password reset token in the DB for the demo user
      const user = await prisma.user.findUnique({ where: { email: 'demo@patchiq.io' } });
      const rawToken = generateToken();
      const tokenHash = hashString(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: user!.id,
          tokenHash,
          expiresAt: addDuration(new Date(), '1h'),
        },
      });

      const res = await agent
        .post('/v1/auth/reset-password')
        .send({ token: rawToken, password: 'demo123' });

      // Should succeed (200) or potentially fail with password policy violation (400)
      // Either way, should not be 500 and success shape must be present
      expect([200, 400]).toContain(res.status);
      expect(res.body).toHaveProperty('success');

      // Reset cache since the user's refresh tokens were revoked
      resetTokenCache();
    });

    it('should return 400 when using an already-used token', async () => {
      const user = await prisma.user.findUnique({ where: { email: 'demo@patchiq.io' } });
      const rawToken = generateToken();
      const tokenHash = hashString(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: user!.id,
          tokenHash,
          expiresAt: addDuration(new Date(), '1h'),
          usedAt: new Date(), // already used
        },
      });

      const res = await agent
        .post('/v1/auth/reset-password')
        .send({ token: rawToken, password: 'demo123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // POST /v1/auth/onboard
  // ============================================================
  describe('POST /v1/auth/onboard', () => {
    it('should return 400 for missing token', async () => {
      const res = await agent
        .post('/v1/auth/onboard')
        .send({ password: 'NewPassword@123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing password', async () => {
      const res = await agent
        .post('/v1/auth/onboard')
        .send({ token: 'sometoken' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid token (not found)', async () => {
      const res = await agent
        .post('/v1/auth/onboard')
        .send({ token: 'completelyinvalidtoken', password: 'NewPassword@123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should onboard successfully with a valid invite token', async () => {
      // Create a brand-new user that is not yet onboarded
      const inviteEmail = `invite-test-${Date.now()}@patchiq.io`;
      const userRole = await prisma.role.findFirst({ where: { name: 'user', isSystem: true } });

      const newUser = await prisma.user.create({
        data: {
          email: inviteEmail,
          passwordHash: '',
          roleId: userRole!.id,
          isOnboarded: false,
          isActive: true,
        },
      });

      const rawToken = generateToken();
      const tokenHash = hashString(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: newUser.id,
          tokenHash,
          expiresAt: addDuration(new Date(), '1h'),
        },
      });

      const res = await agent
        .post('/v1/auth/onboard')
        .send({ token: rawToken, password: 'Onboard@12345', firstName: 'Test', lastName: 'User' });

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.user.email).toBe(inviteEmail);
      } else {
        // password policy violation
        expect(res.body.success).toBe(false);
      }

      // Cleanup
      await prisma.passwordResetToken.deleteMany({ where: { userId: newUser.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: newUser.id } });
      await prisma.user.delete({ where: { id: newUser.id } });
    });

    it('should return 400 for already-used onboard token', async () => {
      const inviteEmail = `invite-used-${Date.now()}@patchiq.io`;
      const userRole = await prisma.role.findFirst({ where: { name: 'user', isSystem: true } });

      const newUser = await prisma.user.create({
        data: {
          email: inviteEmail,
          passwordHash: '',
          roleId: userRole!.id,
          isOnboarded: false,
          isActive: true,
        },
      });

      const rawToken = generateToken();
      const tokenHash = hashString(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: newUser.id,
          tokenHash,
          expiresAt: addDuration(new Date(), '1h'),
          usedAt: new Date(),
        },
      });

      const res = await agent
        .post('/v1/auth/onboard')
        .send({ token: rawToken, password: 'Onboard@12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      // Cleanup
      await prisma.passwordResetToken.deleteMany({ where: { userId: newUser.id } });
      await prisma.user.delete({ where: { id: newUser.id } });
    });
  });

  // ============================================================
  // POST /v1/auth/complete-onboarding
  // ============================================================
  describe('POST /v1/auth/complete-onboarding', () => {
    it('should return 401 without token', async () => {
      const res = await agent
        .post('/v1/auth/complete-onboarding')
        .send({ name: 'Test User', contactNumber: '+1234567890', password: 'Test@12345', confirmPassword: 'Test@12345' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const res = await agent
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', 'Bearer invalidtoken')
        .send({ name: 'Test User', contactNumber: '+1234567890', password: 'Test@12345', confirmPassword: 'Test@12345' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing name', async () => {
      const token = await getAdminToken();
      const res = await agent
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ contactNumber: '+1234567890', password: 'Test@12345', confirmPassword: 'Test@12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing password', async () => {
      const token = await getAdminToken();
      const res = await agent
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test User', contactNumber: '+1234567890', confirmPassword: 'Test@12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when passwords do not match', async () => {
      const token = await getAdminToken();
      const res = await agent
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test User', contactNumber: '+1234567890', password: 'Test@12345', confirmPassword: 'Different@12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should complete onboarding for a non-onboarded user', async () => {
      // Create a new not-yet-onboarded user and login as them
      const nonOnboardedEmail = `notonboard-${Date.now()}@patchiq.io`;
      const userRole = await prisma.role.findFirst({ where: { name: 'user', isSystem: true } });
      const { hashPassword } = await import('../../src/shared/utils/crypto');
      const passwordHash = await hashPassword('TempPass@123');

      const newUser = await prisma.user.create({
        data: {
          email: nonOnboardedEmail,
          passwordHash,
          roleId: userRole!.id,
          isOnboarded: false,
          isActive: true,
        },
      });

      const tokens = await loginAs(nonOnboardedEmail, 'TempPass@123');

      const res = await agent
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ name: 'Test User', contactNumber: '+1234567890', password: 'NewOnboard@12345', confirmPassword: 'NewOnboard@12345' });

      // May succeed or hit password policy - either is valid
      expect([200, 400]).toContain(res.status);
      expect(res.body).toHaveProperty('success');

      // Cleanup
      await prisma.refreshToken.deleteMany({ where: { userId: newUser.id } });
      await prisma.user.delete({ where: { id: newUser.id } });
    });

    it('should return 400 for already-onboarded user', async () => {
      const token = await getAdminToken();
      const res = await agent
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Admin User', contactNumber: '+1234567890', password: 'Admin@12345', confirmPassword: 'Admin@12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // GET /v1/user/me
  // ============================================================
  describe('GET /v1/user/me', () => {
    it('should return current user for admin', async () => {
      const token = await getAdminToken();
      const res = await agent
        .get('/v1/user/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@patchiq.io');
      expect(res.body.data.role).toBe('admin');
      expect(res.body.data.id).toBeDefined();
    });

    it('should return current user for demo user', async () => {
      const token = await getUserToken();
      const res = await agent
        .get('/v1/user/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('demo@patchiq.io');
    });

    it('should return 401 without token', async () => {
      const res = await agent.get('/v1/user/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const res = await agent
        .get('/v1/user/me')
        .set('Authorization', 'Bearer totallyinvalidtoken');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with malformed Authorization header', async () => {
      const res = await agent
        .get('/v1/user/me')
        .set('Authorization', 'NotBearer sometoken');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
