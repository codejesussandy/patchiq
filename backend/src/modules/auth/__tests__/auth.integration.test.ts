import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@db/client';
import { hashPassword } from '@shared/utils/crypto';

const app = createApp();

describe('Auth Integration Tests', () => {
  const testEmail = 'test-auth@example.com';
  const testPassword = 'Password123';

  beforeAll(async () => {
    // Clean up any existing test user
    await prisma.refreshToken.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.passwordResetToken.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // Create test user
    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: await hashPassword(testPassword),
        name: 'Test User',
        role: 'user',
        isActive: true,
        isOnboarded: true,
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.refreshToken.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.passwordResetToken.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  describe('POST /v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user.isOnboarded).toBe(true);
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          password: testPassword,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: testPassword,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testEmail,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });
      validRefreshToken = loginResponse.body.refreshToken;
    });

    it('should return new tokens for valid refresh token', async () => {
      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(validRefreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should invalidate old refresh token after rotation', async () => {
      // First refresh
      await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      // Try to use old token again
      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /v1/user/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });
      accessToken = loginResponse.body.accessToken;
    });

    it('should return current user for valid token', async () => {
      const response = await request(app)
        .get('/v1/user/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(testEmail);
      expect(response.body.name).toBe('Test User');
      expect(response.body.role).toBe('user');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/v1/user/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/v1/user/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed authorization header', async () => {
      const response = await request(app)
        .get('/v1/user/me')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /v1/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });
      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should invalidate refresh token after logout', async () => {
      // Logout
      await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      // Try to use refresh token
      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).post('/v1/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /v1/auth/forgot-password', () => {
    it('should always return success for security (existing email)', async () => {
      const response = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email: testEmail });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset instructions sent to email');
    });

    it('should always return success for security (non-existent email)', async () => {
      const response = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset instructions sent to email');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/v1/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v1/auth/reset-password', () => {
    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/v1/auth/reset-password')
        .send({
          password: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for password mismatch', async () => {
      const response = await request(app)
        .post('/v1/auth/reset-password')
        .send({
          token: 'some-token',
          password: 'NewPassword123',
          confirmPassword: 'DifferentPassword123',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/v1/auth/reset-password')
        .send({
          token: 'some-token',
          password: 'weak',
          confirmPassword: 'weak',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v1/auth/complete-onboarding', () => {
    const onboardingEmail = 'onboarding-test@example.com';
    let accessToken: string;

    beforeAll(async () => {
      // Create a non-onboarded user
      await prisma.user.create({
        data: {
          email: onboardingEmail,
          passwordHash: await hashPassword('TempPassword123'),
          name: null,
          role: 'user',
          isActive: true,
          isOnboarded: false,
        },
      });
    });

    afterAll(async () => {
      await prisma.refreshToken.deleteMany({ where: { user: { email: onboardingEmail } } });
      await prisma.user.deleteMany({ where: { email: onboardingEmail } });
    });

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: onboardingEmail,
          password: 'TempPassword123',
        });
      accessToken = loginResponse.body.accessToken;
    });

    it('should complete onboarding for non-onboarded user', async () => {
      const response = await request(app)
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Onboarded User',
          contactNumber: '+1234567890',
          password: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Onboarding completed successfully');
      expect(response.body.user.name).toBe('Onboarded User');
      expect(response.body.user.isOnboarded).toBe(true);
    });

    it('should return 400 for already onboarded user', async () => {
      // First, login again to get a new token after onboarding
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: onboardingEmail,
          password: 'NewPassword123',
        });
      const newAccessToken = loginResponse.body.accessToken;

      const response = await request(app)
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({
          name: 'Another Name',
          contactNumber: '+0987654321',
          password: 'AnotherPassword123',
          confirmPassword: 'AnotherPassword123',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User already onboarded');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/v1/auth/complete-onboarding')
        .send({
          name: 'Test User',
          contactNumber: '+1234567890',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contactNumber: '+1234567890',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for password mismatch', async () => {
      const response = await request(app)
        .post('/v1/auth/complete-onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test User',
          contactNumber: '+1234567890',
          password: 'Password123',
          confirmPassword: 'DifferentPassword123',
        });

      expect(response.status).toBe(400);
    });
  });
});
