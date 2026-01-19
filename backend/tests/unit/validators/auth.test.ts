import {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeOnboardingSchema,
  changePasswordSchema,
} from '@shared/validators/auth';

describe('Auth Validators', () => {
  describe('loginSchema', () => {
    it('should accept valid login credentials', () => {
      const result = loginSchema.safeParse({
        email: 'user@patchiq.io',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@patchiq.io',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@patchiq.io',
        password: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('should accept valid refresh token', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: 'some-refresh-token',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should accept valid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'user@patchiq.io',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'not-an-email',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should accept valid reset password data', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'reset-token-123',
        password: 'NewPassword1',
        confirmPassword: 'NewPassword1',
      });

      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'reset-token-123',
        password: 'NewPassword1',
        confirmPassword: 'DifferentPassword1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword');
        expect(result.error.issues[0].message).toBe('Passwords do not match');
      }
    });

    it('should reject weak password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'reset-token-123',
        password: 'weak',
        confirmPassword: 'weak',
      });

      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'reset-token-123',
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'reset-token-123',
        password: 'PASSWORD123',
        confirmPassword: 'PASSWORD123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'reset-token-123',
        password: 'PasswordOnly',
        confirmPassword: 'PasswordOnly',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('completeOnboardingSchema', () => {
    it('should accept valid onboarding data', () => {
      const result = completeOnboardingSchema.safeParse({
        token: 'onboarding-token',
        name: 'John Doe',
        contactNumber: '+1234567890',
        password: 'SecurePass1',
        confirmPassword: 'SecurePass1',
      });

      expect(result.success).toBe(true);
    });

    it('should reject name that is too short', () => {
      const result = completeOnboardingSchema.safeParse({
        token: 'onboarding-token',
        name: 'J',
        contactNumber: '+1234567890',
        password: 'SecurePass1',
        confirmPassword: 'SecurePass1',
      });

      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const result = completeOnboardingSchema.safeParse({
        token: 'onboarding-token',
        name: 'John Doe',
        contactNumber: '+1234567890',
        password: 'SecurePass1',
        confirmPassword: 'DifferentPass1',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword1',
        confirmPassword: 'NewPassword1',
      });

      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword1',
        confirmPassword: 'DifferentPassword1',
      });

      expect(result.success).toBe(false);
    });

    it('should reject when new password equals current password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'SamePassword1',
        newPassword: 'SamePassword1',
        confirmPassword: 'SamePassword1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'New password must be different from current password'
        );
      }
    });
  });
});
