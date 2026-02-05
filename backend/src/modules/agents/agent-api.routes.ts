import { Router, Request, Response, NextFunction } from 'express';
import { AgentApiController } from './agent-api.controller';
import { validateBody } from '@middleware/validation';
import { verifyToken } from '@shared/utils/jwt';
import { UnauthorizedError } from '@shared/errors';
import {
  registerAgentSchema,
  heartbeatSchema,
  commandResultSchema,
  inventorySchema,
  telemetrySchema,
} from './agents.validators';

/**
 * Middleware to authenticate agent requests using JWT.
 * Verifies the Bearer token and checks that the token's agentId matches
 * the X-Agent-Id header.
 */
function authenticateAgent(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    // For agent tokens, userId is the agentId — verify it matches the header
    const headerAgentId = req.headers['x-agent-id'] as string;
    if (headerAgentId && payload.userId !== headerAgentId) {
      throw new UnauthorizedError('Agent ID mismatch');
    }

    next();
  } catch (error) {
    next(error);
  }
}

const router = Router();
const controller = new AgentApiController();

// POST /api/agent/register - Agent registration (no auth required)
router.post('/register', validateBody(registerAgentSchema), controller.register);

// POST /api/agent/token/refresh - Refresh agent token (uses refresh token, not access token)
router.post('/token/refresh', controller.refreshToken);

// All routes below require a valid agent JWT
router.use(authenticateAgent);

// POST /api/agent/heartbeat - Agent heartbeat
router.post('/heartbeat', validateBody(heartbeatSchema), controller.heartbeat);

// GET /api/agent/commands - Get pending commands
router.get('/commands', controller.getCommands);

// POST /api/agent/commands/:id/result - Report command result
router.post('/commands/:id/result', validateBody(commandResultSchema), controller.reportCommandResult);

// GET /api/agent/config - Get agent configuration
router.get('/config', controller.getConfig);

// POST /api/agent/inventory - Submit inventory data
router.post('/inventory', validateBody(inventorySchema), controller.submitInventory);

// POST /api/agent/telemetry - Submit telemetry data
router.post('/telemetry', controller.submitTelemetry);

export const agentApiRoutes = router;
export default agentApiRoutes;
