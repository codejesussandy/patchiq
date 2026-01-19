import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '@middleware/auth';

const router = Router();
const controller = new AuthController();

/**
 * GET /v1/user/me
 * Get current authenticated user
 */
router.get('/me', authenticate, controller.getCurrentUser);

export const userRoutes = router;
