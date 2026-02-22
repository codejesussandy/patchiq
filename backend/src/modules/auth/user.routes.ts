import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { validate } from '@middleware/validation';
import { AuthController } from './auth.controller';
import { completeOnboardingSchema } from './auth.validators';

const router = Router();
const controller = new AuthController();

/**
 * @openapi
 * /v1/user/me:
 *   get:
 *     summary: Get the currently authenticated user's profile
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 name:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticate, controller.getCurrentUser);

/**
 * @openapi
 * /v1/user/onboarding:
 *   post:
 *     summary: Complete user onboarding (alias for /v1/auth/complete-onboarding)
 *     tags:
 *       - User
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
  '/onboarding',
  authenticate,
  validate(completeOnboardingSchema),
  controller.completeOnboarding
);

export const userRoutes = router;
