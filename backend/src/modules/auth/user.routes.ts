import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { validate } from '@middleware/validation';
import { AuthController } from './auth.controller';
import { completeOnboardingSchema } from './auth.validators';

const router = Router();
const controller = new AuthController();

/**
 * GET /v1/user/me
 * Get current authenticated user
 */
router.get('/me', authenticate, controller.getCurrentUser);

/**
 * POST /v1/user/onboarding
 * Complete user onboarding (alias for /auth/complete-onboarding)
 * Frontend expects this path
 */
router.post(
  '/onboarding',
  authenticate,
  validate(completeOnboardingSchema),
  controller.completeOnboarding
);

export const userRoutes = router;
