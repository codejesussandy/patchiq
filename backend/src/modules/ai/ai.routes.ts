import { Router } from 'express';
import { authenticate, requireAdmin } from '@middleware/auth';
import { validateBody } from '@middleware/validation';
import { aiChatRateLimiter } from '@middleware/rateLimit';
import { aiController } from './ai.controller';
import { chatRequestSchema } from './ai.validators';

const router = Router();

// POST /v1/ai/chat — AI chat endpoint (authenticated, rate limited)
router.post(
  '/chat',
  authenticate,
  aiChatRateLimiter,
  validateBody(chatRequestSchema),
  aiController.chat
);

// GET /v1/ai/health — AI service health check (admin only)
router.get('/health', authenticate, requireAdmin, aiController.healthCheck);

export const aiRoutes = router;
