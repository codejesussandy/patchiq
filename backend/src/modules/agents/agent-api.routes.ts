import { Router } from 'express';
import { AgentApiController } from './agent-api.controller';
import { validateBody } from '@middleware/validation';
import {
  registerAgentSchema,
  heartbeatSchema,
  commandResultSchema,
  inventorySchema,
  telemetrySchema,
} from './agents.validators';

const router = Router();
const controller = new AgentApiController();

// POST /api/agent/register - Agent registration (no auth required, uses enrollment secret)
router.post('/register', validateBody(registerAgentSchema), controller.register);

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
// Note: No validation middleware - telemetry has many fields and we want to preserve all of them in rawPayload
router.post('/telemetry', controller.submitTelemetry);

// POST /api/agent/token/refresh - Refresh agent token
router.post('/token/refresh', controller.refreshToken);

export const agentApiRoutes = router;
export default agentApiRoutes;
