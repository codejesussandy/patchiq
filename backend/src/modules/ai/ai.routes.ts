import { Router } from 'express';
import { authenticate, requireAdmin } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody } from '@middleware/validation';
import { aiChatRateLimiter } from '@middleware/rateLimit';
import { aiController } from './ai.controller';
import { chatRequestSchema } from './ai.validators';

const router = Router();

// POST /v1/ai/chat — AI chat endpoint (authenticated, rate limited)
router.post(
  '/chat',
  authenticate,
  checkPermission('ai', 'view'),
  aiChatRateLimiter,
  validateBody(chatRequestSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.AI }),
  aiController.chat
);

// GET /v1/ai/health — AI service health check (admin only)
router.get('/health', authenticate, checkPermission('ai', 'view'), requireAdmin, aiController.healthCheck);

export const aiRoutes = router;
