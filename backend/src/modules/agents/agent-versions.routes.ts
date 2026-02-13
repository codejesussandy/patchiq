import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody, validateParams } from '@middleware/validation';
import { idParamSchema } from '@shared/validators/common';
import { AgentsController } from './agents.controller';
import { createAgentVersionSchema, updateAgentVersionSchema } from './agents.validators';

const router = Router();
const controller = new AgentsController();

// All routes require authentication
router.use(authenticate);

// GET /v1/agent-versions - List all agent versions (with optional filters)
router.get('/', checkPermission('agents', 'view'), controller.getAgentVersions);

// GET /v1/agent-versions/latest - Get latest version for platform/arch (must be before /:id routes)
router.get('/latest', checkPermission('agents', 'view'), controller.getLatest);

// POST /v1/agent-versions - Create new version
router.post('/', checkPermission('agents', 'add'), validateBody(createAgentVersionSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.AGENT_VERSION }), controller.create);

// GET /v1/agent-versions/:id - Get version details
router.get('/:id', checkPermission('agents', 'view'), validateParams(idParamSchema), controller.getById);

// PUT /v1/agent-versions/:id - Update version
router.put('/:id', checkPermission('agents', 'edit'), validateParams(idParamSchema), validateBody(updateAgentVersionSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.AGENT_VERSION, getResourceId: (req) => req.params.id }), controller.update);

// DELETE /v1/agent-versions/:id - Delete version
router.delete('/:id', checkPermission('agents', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.AGENT_VERSION, getResourceId: (req) => req.params.id }), controller.deleteVersion);

// GET /v1/agent-versions/:id/download - Download agent binary
router.get('/:id/download', checkPermission('agents', 'view'), controller.downloadAgentVersion);

// POST /v1/agent-versions/:id/upload - Upload agent binary (admin only)
router.post('/:id/upload', checkPermission('agents', 'add'), audit({ action: AuditAction.UPLOAD, resource: AuditResource.AGENT_VERSION, getResourceId: (req) => req.params.id }), controller.uploadAgentBinary);

export const agentVersionsRoutes = router;
export default agentVersionsRoutes;
