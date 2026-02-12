import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { validateQuery } from '@middleware/validation';
import { AgentsController } from './agents.controller';
import { listAgentsQuerySchema } from './agents.validators';

const router = Router();
const controller = new AgentsController();

// All routes require authentication
router.use(authenticate);

// GET /v1/agents/downloads - must be before /:id to avoid conflict
router.get('/downloads', controller.getAgentDownloads);

// GET /v1/agents - List all agents
router.get('/', validateQuery(listAgentsQuerySchema), controller.listAgents);

// GET /v1/agents/:id - Get agent details
router.get('/:id', controller.getAgent);

// PUT /v1/agents/:id - Update agent
router.put('/:id', controller.updateAgent);

// DELETE /v1/agents/:id - Delete agent
router.delete('/:id', controller.deleteAgent);

// GET /v1/agents/:id/commands - Get agent command history
router.get('/:id/commands', controller.getAgentCommands);

// POST /v1/agents/:id/collect - Trigger on-demand collection
router.post('/:id/collect', controller.triggerCollection);

// POST /v1/agents/:id/update - Trigger agent self-update
router.post('/:id/update', controller.triggerAgentUpdate);

// GET /v1/agents/:id/telemetry/latest - Get latest telemetry
router.get('/:id/telemetry/latest', controller.getLatestTelemetry);

// GET /v1/agents/:id/telemetry/stream - SSE stream for real-time telemetry
router.get('/:id/telemetry/stream', controller.streamTelemetry);

export const agentsRoutes = router;
export default agentsRoutes;
