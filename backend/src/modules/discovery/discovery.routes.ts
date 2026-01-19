import { Router } from 'express';
import { DiscoveryController } from './discovery.controller';
import { authenticate } from '@middleware/auth';
import { validateBody, validateQuery } from '@middleware/validation';
import {
  listIPRangesQuerySchema,
  createIPRangeSchema,
  updateIPRangeSchema,
  listCredentialsQuerySchema,
  createCredentialSchema,
  updateCredentialSchema,
  testCredentialSchema,
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
  validateQuery(listIPRangesQuerySchema),
  controller.listIPRanges
);

// GET /v1/discovery/ip-ranges/:id - Get a single IP range
router.get('/ip-ranges/:id', controller.getIPRange);

// POST /v1/discovery/ip-ranges - Create a new IP range
router.post(
  '/ip-ranges',
  validateBody(createIPRangeSchema),
  controller.createIPRange
);

// PUT /v1/discovery/ip-ranges/:id - Update an IP range
router.put(
  '/ip-ranges/:id',
  validateBody(updateIPRangeSchema),
  controller.updateIPRange
);

// DELETE /v1/discovery/ip-ranges/:id - Delete an IP range
router.delete('/ip-ranges/:id', controller.deleteIPRange);

// POST /v1/discovery/ip-ranges/:id/scan - Trigger a scan
router.post('/ip-ranges/:id/scan', controller.triggerScan);

// ==================== Scans ====================

// GET /v1/discovery/scans/:id - Get scan status
router.get('/scans/:id', controller.getScanStatus);

// GET /v1/discovery/scans/:id/results - Get scan results
router.get(
  '/scans/:id/results',
  validateQuery(getScanResultsQuerySchema),
  controller.getScanResults
);

// ==================== Device Credentials ====================

// GET /v1/discovery/credentials - List all credentials
router.get(
  '/credentials',
  validateQuery(listCredentialsQuerySchema),
  controller.listCredentials
);

// GET /v1/discovery/credentials/:id - Get a single credential
router.get('/credentials/:id', controller.getCredential);

// POST /v1/discovery/credentials - Create a new credential
router.post(
  '/credentials',
  validateBody(createCredentialSchema),
  controller.createCredential
);

// PUT /v1/discovery/credentials/:id - Update a credential
router.put(
  '/credentials/:id',
  validateBody(updateCredentialSchema),
  controller.updateCredential
);

// DELETE /v1/discovery/credentials/:id - Delete a credential
router.delete('/credentials/:id', controller.deleteCredential);

// POST /v1/discovery/credentials/:id/test - Test a credential
router.post(
  '/credentials/:id/test',
  validateBody(testCredentialSchema),
  controller.testCredential
);

// ==================== Discovered Devices ====================

// GET /v1/discovery/devices - List discovered devices
router.get(
  '/devices',
  validateQuery(listDiscoveredDevicesQuerySchema),
  controller.listDiscoveredDevices
);

// POST /v1/discovery/devices/:id/enroll - Enroll a discovered device as an asset
router.post(
  '/devices/:id/enroll',
  validateBody(enrollDeviceSchema),
  controller.enrollDevice
);

export const discoveryRoutes = router;
export default discoveryRoutes;
