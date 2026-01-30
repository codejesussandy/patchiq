import { Router } from 'express';
import { AgentsController } from './agents.controller';
import { authenticate } from '@middleware/auth';

const router = Router();
const controller = new AgentsController();

// All routes require authentication
router.use(authenticate);

// GET /v1/agent-versions - List all agent versions
router.get('/', controller.getAgentVersions);

// GET /v1/agent-versions/:id/download - Download agent binary
router.get('/:id/download', controller.downloadAgentVersion);

// POST /v1/agent-versions/:id/upload - Upload agent binary (admin only)
router.post('/:id/upload', controller.uploadAgentBinary);

export const agentVersionsRoutes = router;
export default agentVersionsRoutes;
