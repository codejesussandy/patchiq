import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody, validateQuery } from '@middleware/validation';
import { DiscoveryController } from './discovery.controller';
import {
  listIPRangesQuerySchema,
  createIPRangeSchema,
  updateIPRangeSchema,
  listCredentialsQuerySchema,
  createCredentialSchema,
  updateCredentialSchema,
  testCredentialSchema,
  getCredentialQuerySchema,
  getScanResultsQuerySchema,
  listDiscoveredDevicesQuerySchema,
  enrollDeviceSchema,
} from './discovery.validators';

const router = Router();
const controller = new DiscoveryController();

// All routes require authentication
router.use(authenticate);

// ==================== IP Ranges ====================

/**
 * @openapi
 * /v1/discovery/ip-ranges:
 *   get:
 *     summary: List all IP ranges
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of IP ranges
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/ip-ranges',
  checkPermission('discovery', 'view'),
  validateQuery(listIPRangesQuerySchema),
  controller.listIPRanges
);

/**
 * @openapi
 * /v1/discovery/ip-ranges/{id}:
 *   get:
 *     summary: Get a single IP range by ID
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: IP range object
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: IP range not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/ip-ranges/:id', checkPermission('discovery', 'view'), controller.getIPRange);

/**
 * @openapi
 * /v1/discovery/ip-ranges:
 *   post:
 *     summary: Create a new IP range
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - cidr
 *             properties:
 *               name:
 *                 type: string
 *               cidr:
 *                 type: string
 *               description:
 *                 type: string
 *               credentialIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: IP range created
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/ip-ranges',
  checkPermission('discovery', 'add'),
  validateBody(createIPRangeSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DISCOVERY }),
  controller.createIPRange
);

/**
 * @openapi
 * /v1/discovery/ip-ranges/{id}:
 *   put:
 *     summary: Update an existing IP range
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               cidr:
 *                 type: string
 *               description:
 *                 type: string
 *               credentialIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: IP range updated
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: IP range not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/ip-ranges/:id',
  checkPermission('discovery', 'edit'),
  validateBody(updateIPRangeSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.DISCOVERY, getResourceId: (req) => req.params.id }),
  controller.updateIPRange
);

/**
 * @openapi
 * /v1/discovery/ip-ranges/{id}:
 *   delete:
 *     summary: Delete an IP range
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: IP range deleted
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
 *       404:
 *         description: IP range not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/ip-ranges/:id', checkPermission('discovery', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.DISCOVERY, getResourceId: (req) => req.params.id }), controller.deleteIPRange);

/**
 * @openapi
 * /v1/discovery/ip-ranges/{id}/scan:
 *   post:
 *     summary: Trigger a network scan for an IP range
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       202:
 *         description: Scan triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scanId:
 *                   type: string
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
 *       404:
 *         description: IP range not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/ip-ranges/:id/scan', checkPermission('discovery', 'add'), audit({ action: AuditAction.SCAN, resource: AuditResource.DISCOVERY, getResourceId: (req) => req.params.id }), controller.triggerScan);

// ==================== Scans ====================

/**
 * @openapi
 * /v1/discovery/scans/{id}:
 *   get:
 *     summary: Get the status of a scan
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scan status object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, running, completed, failed]
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Scan not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/scans/:id', checkPermission('discovery', 'view'), controller.getScanStatus);

/**
 * @openapi
 * /v1/discovery/scans/{id}/results:
 *   get:
 *     summary: Get the results of a completed scan
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated scan results
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
 *       404:
 *         description: Scan not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/scans/:id/results',
  checkPermission('discovery', 'view'),
  validateQuery(getScanResultsQuerySchema),
  controller.getScanResults
);

// ==================== Device Credentials ====================

/**
 * @openapi
 * /v1/discovery/credentials:
 *   get:
 *     summary: List all discovery credentials
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of credentials
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/credentials',
  checkPermission('discovery', 'view'),
  validateQuery(listCredentialsQuerySchema),
  controller.listCredentials
);

/**
 * @openapi
 * /v1/discovery/credentials/{id}:
 *   get:
 *     summary: Get a single credential by ID
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeSecret
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Credential object
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Credential not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/credentials/:id', checkPermission('discovery', 'view'), validateQuery(getCredentialQuerySchema), controller.getCredential);

/**
 * @openapi
 * /v1/discovery/credentials:
 *   post:
 *     summary: Create a new discovery credential
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ssh, winrm, snmp]
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               privateKey:
 *                 type: string
 *     responses:
 *       201:
 *         description: Credential created
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/credentials',
  checkPermission('discovery', 'add'),
  validateBody(createCredentialSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DISCOVERY_CREDENTIAL }),
  controller.createCredential
);

/**
 * @openapi
 * /v1/discovery/credentials/{id}:
 *   put:
 *     summary: Update an existing credential
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               privateKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Credential updated
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Credential not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/credentials/:id',
  checkPermission('discovery', 'edit'),
  validateBody(updateCredentialSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.DISCOVERY_CREDENTIAL, getResourceId: (req) => req.params.id }),
  controller.updateCredential
);

/**
 * @openapi
 * /v1/discovery/credentials/{id}:
 *   delete:
 *     summary: Delete a credential
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Credential deleted
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
 *       404:
 *         description: Credential not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/credentials/:id', checkPermission('discovery', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.DISCOVERY_CREDENTIAL, getResourceId: (req) => req.params.id }), controller.deleteCredential);

/**
 * @openapi
 * /v1/discovery/credentials/{id}/test:
 *   post:
 *     summary: Test a credential against a target host
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - host
 *             properties:
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Credential not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/credentials/:id/test',
  checkPermission('discovery', 'edit'),
  validateBody(testCredentialSchema),
  audit({ action: AuditAction.TEST, resource: AuditResource.DISCOVERY_CREDENTIAL, getResourceId: (req) => req.params.id }),
  controller.testCredential
);

// ==================== Discovered Devices ====================

/**
 * @openapi
 * /v1/discovery/devices:
 *   get:
 *     summary: List all discovered devices
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, enrolled, ignored]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of discovered devices
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/devices',
  checkPermission('discovery', 'view'),
  validateQuery(listDiscoveredDevicesQuerySchema),
  controller.listDiscoveredDevices
);

/**
 * @openapi
 * /v1/discovery/devices/{id}/enroll:
 *   post:
 *     summary: Enroll a discovered device as a managed asset
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               groupId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Device enrolled as asset
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/devices/:id/enroll',
  checkPermission('discovery', 'add'),
  validateBody(enrollDeviceSchema),
  audit({ action: AuditAction.ENROLL, resource: AuditResource.DISCOVERED_DEVICE, getResourceId: (req) => req.params.id }),
  controller.enrollDevice
);

export const discoveryRoutes = router;
export default discoveryRoutes;
