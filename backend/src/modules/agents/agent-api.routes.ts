import { Router, Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '@shared/errors';
import { verifyToken } from '@shared/utils/jwt';
import { validateBody } from '@middleware/validation';
import { AgentApiController } from './agent-api.controller';
import {
  registerAgentSchema,
  heartbeatSchema,
  commandResultSchema,
  inventorySchema,
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

/**
 * @openapi
 * /api/agent/register:
 *   post:
 *     summary: Register a new agent with the server
 *     tags:
 *       - Agent API
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hostname
 *               - platform
 *               - arch
 *             properties:
 *               hostname:
 *                 type: string
 *               platform:
 *                 type: string
 *               arch:
 *                 type: string
 *               version:
 *                 type: string
 *               registrationKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agent registered, access and refresh tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agentId:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation error or invalid registration key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', validateBody(registerAgentSchema), controller.register);

/**
 * @openapi
 * /api/agent/token/refresh:
 *   post:
 *     summary: Refresh an agent's access token using its refresh token
 *     tags:
 *       - Agent API
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Missing or invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Refresh token expired or revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/token/refresh', controller.refreshToken);

/**
 * @openapi
 * /api/agent/update/binary/{versionId}:
 *   get:
 *     summary: Download agent binary for self-update using version UUID as token
 *     tags:
 *       - Agent API
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent version UUID used as a download token
 *     responses:
 *       200:
 *         description: Agent binary file stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Version not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/update/binary/:versionId', controller.downloadUpdateBinary);

// All routes below require a valid agent JWT
router.use(authenticateAgent);

/**
 * @openapi
 * /api/agent/heartbeat:
 *   post:
 *     summary: Send a heartbeat to indicate the agent is alive
 *     tags:
 *       - Agent API
 *     security:
 *       - agentAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               version:
 *                 type: string
 *               uptime:
 *                 type: number
 *     responses:
 *       200:
 *         description: Heartbeat acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 acknowledged:
 *                   type: boolean
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
router.post('/heartbeat', validateBody(heartbeatSchema), controller.heartbeat);

/**
 * @openapi
 * /api/agent/commands:
 *   get:
 *     summary: Get pending commands queued for this agent
 *     tags:
 *       - Agent API
 *     security:
 *       - agentAuth: []
 *     responses:
 *       200:
 *         description: List of pending commands
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   type:
 *                     type: string
 *                   payload:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/commands', controller.getCommands);

/**
 * @openapi
 * /api/agent/commands/{id}/result:
 *   post:
 *     summary: Report the result of an executed command
 *     tags:
 *       - Agent API
 *     security:
 *       - agentAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Command ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - success
 *                   - failure
 *               output:
 *                 type: string
 *               error:
 *                 type: string
 *     responses:
 *       200:
 *         description: Command result recorded
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
 *         description: Command not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/commands/:id/result', validateBody(commandResultSchema), controller.reportCommandResult);

/**
 * @openapi
 * /api/agent/config:
 *   get:
 *     summary: Get configuration settings for this agent
 *     tags:
 *       - Agent API
 *     security:
 *       - agentAuth: []
 *     responses:
 *       200:
 *         description: Agent configuration object
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
 */
router.get('/config', controller.getConfig);

/**
 * @openapi
 * /api/agent/inventory:
 *   post:
 *     summary: Submit collected inventory data from the agent
 *     tags:
 *       - Agent API
 *     security:
 *       - agentAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               software:
 *                 type: array
 *                 items:
 *                   type: object
 *               hardware:
 *                 type: object
 *               os:
 *                 type: object
 *     responses:
 *       200:
 *         description: Inventory data accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
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
 */
router.post('/inventory', validateBody(inventorySchema), controller.submitInventory);

/**
 * @openapi
 * /api/agent/telemetry:
 *   post:
 *     summary: Submit real-time telemetry data from the agent
 *     tags:
 *       - Agent API
 *     security:
 *       - agentAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cpu:
 *                 type: object
 *               memory:
 *                 type: object
 *               disk:
 *                 type: object
 *               network:
 *                 type: object
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Telemetry data accepted
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
 */
router.post('/telemetry', controller.submitTelemetry);

/**
 * @openapi
 * /api/agent/logs:
 *   post:
 *     summary: Send agent log entries to the server
 *     tags:
 *       - Agent API
 *     security:
 *       - agentAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     level:
 *                       type: string
 *                     message:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: Logs accepted
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
 */
router.post('/logs', controller.receiveAgentLogs);

export const agentApiRoutes = router;
export default agentApiRoutes;
