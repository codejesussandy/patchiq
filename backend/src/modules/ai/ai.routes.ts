import { Router } from 'express';
import { authenticate, requireAdmin } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody } from '@middleware/validation';
import { aiChatRateLimiter } from '@middleware/rateLimit';
import { aiController } from './ai.controller';
import { chatRequestSchema } from './ai.validators';

const router = Router();

/**
 * @openapi
 * /v1/ai/chat:
 *   post:
 *     summary: Send a message to the AI assistant
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     x-rateLimit:
 *       description: Rate limited per user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: The user's message or prompt
 *               conversationId:
 *                 type: string
 *                 description: Optional ID to continue an existing conversation
 *               context:
 *                 type: object
 *                 description: Optional contextual metadata to assist the AI
 *     responses:
 *       200:
 *         description: AI response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *                 conversationId:
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests — rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/chat',
  authenticate,
  checkPermission('ai', 'view'),
  aiChatRateLimiter,
  validateBody(chatRequestSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.AI }),
  aiController.chat
);

/**
 * @openapi
 * /v1/ai/health:
 *   get:
 *     summary: Check AI service health (admin only)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unavailable]
 *                 provider:
 *                   type: string
 *                 latencyMs:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/health', authenticate, checkPermission('ai', 'view'), requireAdmin, aiController.healthCheck);

export const aiRoutes = router;
