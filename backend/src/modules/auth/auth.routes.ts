import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateBody } from '@middleware/validation';
import { authenticate } from '@middleware/auth';
import { authRateLimiter, passwordResetRateLimiter } from '@middleware/rateLimit';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeOnboardingSchema,
} from './auth.validators';

const router = Router();
const controller = new AuthController();

// ============================================
// Public routes (with rate limiting)
// ============================================

/**
 * POST /v1/auth/login
 * Authenticate user and return tokens
 */
router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  audit({ action: AuditAction.LOGIN, resource: AuditResource.USER }),
  controller.login
);

/**
 * POST /v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  authRateLimiter,
  validateBody(refreshTokenSchema),
  controller.refresh
);

/**
 * POST /v1/auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validateBody(forgotPasswordSchema),
  audit({ action: AuditAction.PASSWORD_RESET_REQUEST, resource: AuditResource.USER }),
  controller.forgotPassword
);

/**
 * POST /v1/auth/reset-password
 * Reset password using token from email
 */
router.post(
  '/reset-password',
  authRateLimiter,
  validateBody(resetPasswordSchema),
  audit({ action: AuditAction.PASSWORD_RESET_COMPLETE, resource: AuditResource.USER }),
  controller.resetPassword
);

// ============================================
// Protected routes (require authentication)
// ============================================

/**
 * POST /v1/auth/logout
 * Logout user and revoke refresh tokens
 */
router.post(
  '/logout',
  authenticate,
  audit({ action: AuditAction.LOGOUT, resource: AuditResource.USER }),
  controller.logout
);

/**
 * POST /v1/auth/complete-onboarding
 * Complete first-time user setup
 */
router.post(
  '/complete-onboarding',
  authenticate,
  validateBody(completeOnboardingSchema),
  audit({
    action: 'complete_onboarding',
    resource: AuditResource.USER,
    getDetails: (req) => ({
      name: req.body.name,
      contactNumber: req.body.contactNumber,
    }),
  }),
  controller.completeOnboarding
);

export const authRoutes = router;
