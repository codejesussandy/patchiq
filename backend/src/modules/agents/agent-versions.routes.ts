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

/**
 * @openapi
 * /v1/agent-versions:
 *   get:
 *     summary: List all agent versions with optional filters
 *     tags:
 *       - Agent Versions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter by platform (e.g. linux, windows, darwin)
 *       - in: query
 *         name: arch
 *         schema:
 *           type: string
 *         description: Filter by architecture (e.g. amd64, arm64)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Paginated list of agent versions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', checkPermission('agents', 'view'), controller.getAgentVersions);

/**
 * @openapi
 * /v1/agent-versions/latest:
 *   get:
 *     summary: Get the latest agent version for a given platform and architecture
 *     tags:
 *       - Agent Versions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *         description: Target platform (e.g. linux, windows, darwin)
 *       - in: query
 *         name: arch
 *         required: true
 *         schema:
 *           type: string
 *         description: Target architecture (e.g. amd64, arm64)
 *     responses:
 *       200:
 *         description: Latest agent version details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 version:
 *                   type: string
 *                 platform:
 *                   type: string
 *                 arch:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No version found for the given platform/arch
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/latest', checkPermission('agents', 'view'), controller.getLatest);

/**
 * @openapi
 * /v1/agent-versions:
 *   post:
 *     summary: Create a new agent version record
 *     tags:
 *       - Agent Versions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version
 *               - platform
 *               - arch
 *             properties:
 *               version:
 *                 type: string
 *                 description: Semantic version string (e.g. 1.2.3)
 *               platform:
 *                 type: string
 *               arch:
 *                 type: string
 *               changelog:
 *                 type: string
 *               isLatest:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Agent version created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
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
 */
router.post('/', checkPermission('agents', 'add'), validateBody(createAgentVersionSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.AGENT_VERSION }), controller.create);

/**
 * @openapi
 * /v1/agent-versions/{id}:
 *   get:
 *     summary: Get details of a specific agent version
 *     tags:
 *       - Agent Versions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent version ID
 *     responses:
 *       200:
 *         description: Agent version details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Agent version not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', checkPermission('agents', 'view'), validateParams(idParamSchema), controller.getById);

/**
 * @openapi
 * /v1/agent-versions/{id}:
 *   put:
 *     summary: Update an existing agent version record
 *     tags:
 *       - Agent Versions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent version ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               changelog:
 *                 type: string
 *               isLatest:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Agent version updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
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
 *       404:
 *         description: Agent version not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', checkPermission('agents', 'edit'), validateParams(idParamSchema), validateBody(updateAgentVersionSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.AGENT_VERSION, getResourceId: (req) => req.params.id }), controller.update);

/**
 * @openapi
 * /v1/agent-versions/{id}:
 *   delete:
 *     summary: Delete an agent version record
 *     tags:
 *       - Agent Versions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent version ID
 *     responses:
 *       200:
 *         description: Agent version deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Agent version not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', checkPermission('agents', 'delete'), validateParams(idParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.AGENT_VERSION, getResourceId: (req) => req.params.id }), controller.deleteVersion);

/**
 * @openapi
 * /v1/agent-versions/{id}/download:
 *   get:
 *     summary: Download the binary for a specific agent version
 *     tags:
 *       - Agent Versions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent version ID
 *     responses:
 *       200:
 *         description: Agent binary file stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Agent version or binary not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/download', checkPermission('agents', 'view'), controller.downloadAgentVersion);

/**
 * @openapi
 * /v1/agent-versions/{id}/upload:
 *   post:
 *     summary: Upload a binary file for a specific agent version (admin only)
 *     tags:
 *       - Agent Versions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent version ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The agent binary file to upload
 *     responses:
 *       200:
 *         description: Binary uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: No file provided or invalid file
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
 *       404:
 *         description: Agent version not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/upload', checkPermission('agents', 'add'), audit({ action: AuditAction.UPLOAD, resource: AuditResource.AGENT_VERSION, getResourceId: (req) => req.params.id }), controller.uploadAgentBinary);

export const agentVersionsRoutes = router;
export default agentVersionsRoutes;
