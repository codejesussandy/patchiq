import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateQuery } from '@middleware/validation';
import { AgentsController } from './agents.controller';
import { listAgentsQuerySchema } from './agents.validators';

const router = Router();
const controller = new AgentsController();

// All routes require authentication
router.use(authenticate);

// GET /v1/agents/downloads - must be before /:id to avoid conflict
router.get('/downloads', checkPermission('agents', 'view'), controller.getAgentDownloads);

// GET /v1/agents - List all agents
router.get('/', checkPermission('agents', 'view'), validateQuery(listAgentsQuerySchema), controller.listAgents);

// GET /v1/agents/:id - Get agent details
router.get('/:id', checkPermission('agents', 'view'), controller.getAgent);

// PUT /v1/agents/:id - Update agent
router.put('/:id', checkPermission('agents', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.AGENT, getResourceId: (req) => req.params.id }), controller.updateAgent);

// DELETE /v1/agents/:id - Delete agent
router.delete('/:id', checkPermission('agents', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.AGENT, getResourceId: (req) => req.params.id }), controller.deleteAgent);

// GET /v1/agents/:id/commands - Get agent command history
router.get('/:id/commands', checkPermission('agents', 'view'), controller.getAgentCommands);

// POST /v1/agents/:id/collect - Trigger on-demand collection
router.post('/:id/collect', checkPermission('agents', 'edit'), audit({ action: AuditAction.SCAN, resource: AuditResource.AGENT, getResourceId: (req) => req.params.id }), controller.triggerCollection);

// POST /v1/agents/:id/update - Trigger agent self-update
router.post('/:id/update', checkPermission('agents', 'edit'), audit({ action: AuditAction.UPDATE, resource: AuditResource.AGENT, getResourceId: (req) => req.params.id }), controller.triggerAgentUpdate);

// GET /v1/agents/:id/telemetry/latest - Get latest telemetry
router.get('/:id/telemetry/latest', checkPermission('agents', 'view'), controller.getLatestTelemetry);

// GET /v1/agents/:id/telemetry/stream - SSE stream for real-time telemetry
router.get('/:id/telemetry/stream', checkPermission('agents', 'view'), controller.streamTelemetry);

export const agentsRoutes = router;
export default agentsRoutes;
