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

// GET /v1/discovery/ip-ranges - List all IP ranges
router.get(
  '/ip-ranges',
  checkPermission('discovery', 'view'),
  validateQuery(listIPRangesQuerySchema),
  controller.listIPRanges
);

// GET /v1/discovery/ip-ranges/:id - Get a single IP range
router.get('/ip-ranges/:id', checkPermission('discovery', 'view'), controller.getIPRange);

// POST /v1/discovery/ip-ranges - Create a new IP range
router.post(
  '/ip-ranges',
  checkPermission('discovery', 'add'),
  validateBody(createIPRangeSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DISCOVERY }),
  controller.createIPRange
);

// PUT /v1/discovery/ip-ranges/:id - Update an IP range
router.put(
  '/ip-ranges/:id',
  checkPermission('discovery', 'edit'),
  validateBody(updateIPRangeSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.DISCOVERY, getResourceId: (req) => req.params.id }),
  controller.updateIPRange
);

// DELETE /v1/discovery/ip-ranges/:id - Delete an IP range
router.delete('/ip-ranges/:id', checkPermission('discovery', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.DISCOVERY, getResourceId: (req) => req.params.id }), controller.deleteIPRange);

// POST /v1/discovery/ip-ranges/:id/scan - Trigger a scan
router.post('/ip-ranges/:id/scan', checkPermission('discovery', 'add'), audit({ action: AuditAction.SCAN, resource: AuditResource.DISCOVERY, getResourceId: (req) => req.params.id }), controller.triggerScan);

// ==================== Scans ====================

// GET /v1/discovery/scans/:id - Get scan status
router.get('/scans/:id', checkPermission('discovery', 'view'), controller.getScanStatus);

// GET /v1/discovery/scans/:id/results - Get scan results
router.get(
  '/scans/:id/results',
  checkPermission('discovery', 'view'),
  validateQuery(getScanResultsQuerySchema),
  controller.getScanResults
);

// ==================== Device Credentials ====================

// GET /v1/discovery/credentials - List all credentials
router.get(
  '/credentials',
  checkPermission('discovery', 'view'),
  validateQuery(listCredentialsQuerySchema),
  controller.listCredentials
);

// GET /v1/discovery/credentials/:id - Get a single credential
router.get('/credentials/:id', checkPermission('discovery', 'view'), validateQuery(getCredentialQuerySchema), controller.getCredential);

// POST /v1/discovery/credentials - Create a new credential
router.post(
  '/credentials',
  checkPermission('discovery', 'add'),
  validateBody(createCredentialSchema),
  audit({ action: AuditAction.CREATE, resource: AuditResource.DISCOVERY_CREDENTIAL }),
  controller.createCredential
);

// PUT /v1/discovery/credentials/:id - Update a credential
router.put(
  '/credentials/:id',
  checkPermission('discovery', 'edit'),
  validateBody(updateCredentialSchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.DISCOVERY_CREDENTIAL, getResourceId: (req) => req.params.id }),
  controller.updateCredential
);

// DELETE /v1/discovery/credentials/:id - Delete a credential
router.delete('/credentials/:id', checkPermission('discovery', 'delete'), audit({ action: AuditAction.DELETE, resource: AuditResource.DISCOVERY_CREDENTIAL, getResourceId: (req) => req.params.id }), controller.deleteCredential);

// POST /v1/discovery/credentials/:id/test - Test a credential
router.post(
  '/credentials/:id/test',
  checkPermission('discovery', 'edit'),
  validateBody(testCredentialSchema),
  audit({ action: AuditAction.TEST, resource: AuditResource.DISCOVERY_CREDENTIAL, getResourceId: (req) => req.params.id }),
  controller.testCredential
);

// ==================== Discovered Devices ====================

// GET /v1/discovery/devices - List discovered devices
router.get(
  '/devices',
  checkPermission('discovery', 'view'),
  validateQuery(listDiscoveredDevicesQuerySchema),
  controller.listDiscoveredDevices
);

// POST /v1/discovery/devices/:id/enroll - Enroll a discovered device as an asset
router.post(
  '/devices/:id/enroll',
  checkPermission('discovery', 'add'),
  validateBody(enrollDeviceSchema),
  audit({ action: AuditAction.ENROLL, resource: AuditResource.DISCOVERED_DEVICE, getResourceId: (req) => req.params.id }),
  controller.enrollDevice
);

export const discoveryRoutes = router;
export default discoveryRoutes;
