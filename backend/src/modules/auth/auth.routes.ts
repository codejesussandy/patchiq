import { Router } from 'express';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { authenticate } from '@middleware/auth';
import { authRateLimiter, passwordResetRateLimiter } from '@middleware/rateLimit';
import { validateBody } from '@middleware/validation';
import { AuthController } from './auth.controller';
import {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeOnboardingSchema,
  onboardSchema,
} from './auth.validators';

const router = Router();
const controller = new AuthController();

// ============================================
// Public routes (with rate limiting)
// ============================================

/**
 * @openapi
 * /v1/auth/login:
 *   post:
 *     summary: Authenticate user and return access and refresh tokens
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful, tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  audit({ action: AuditAction.LOGIN, resource: AuditResource.USER }),
  controller.login
);

/**
 * @openapi
 * /v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using a valid refresh token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/refresh',
  authRateLimiter,
  validateBody(refreshTokenSchema),
  controller.refresh
);

/**
 * @openapi
 * /v1/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent if account exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validateBody(forgotPasswordSchema),
  audit({ action: AuditAction.PASSWORD_RESET_REQUEST, resource: AuditResource.USER }),
  controller.forgotPassword
);

/**
 * @openapi
 * /v1/auth/reset-password:
 *   post:
 *     summary: Reset password using token received via email
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or invalid/expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/reset-password',
  authRateLimiter,
  validateBody(resetPasswordSchema),
  audit({ action: AuditAction.PASSWORD_RESET_COMPLETE, resource: AuditResource.USER }),
  controller.resetPassword
);

/**
 * @openapi
 * /v1/auth/onboard:
 *   post:
 *     summary: Complete onboarding for an invited user using an invitation token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Invitation token received via email
 *               password:
 *                 type: string
 *                 format: password
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Onboarding complete, tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation error or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/onboard',
  authRateLimiter,
  validateBody(onboardSchema),
  audit({ action: 'onboard_with_token', resource: AuditResource.USER }),
  controller.onboardWithToken
);

// ============================================
// Protected routes (require authentication)
// ============================================

/**
 * @openapi
 * /v1/auth/logout:
 *   post:
 *     summary: Logout the current user and revoke refresh tokens
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/logout',
  authenticate,
  audit({ action: AuditAction.LOGOUT, resource: AuditResource.USER }),
  controller.logout
);

/**
 * @openapi
 * /v1/auth/complete-onboarding:
 *   post:
 *     summary: Complete first-time user setup after initial login
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Onboarding completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
