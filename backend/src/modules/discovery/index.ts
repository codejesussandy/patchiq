// Routes
export { discoveryRoutes } from './discovery.routes';

// Controller
export { DiscoveryController, discoveryController } from './discovery.controller';

// Service
export { DiscoveryService, discoveryService } from './discovery.service';

// Worker
export { startDiscoveryScanWorker, shutdownDiscoveryScanWorker, queueDiscoveryScanJob, setupDiscoverySchedules } from './discovery-scan.worker';

// Types - export from types file (response types)
export type {
  IPRangeResponse,
  DeviceCredentialResponse,
  DeviceCredentialDetailResponse,
  ScanResponse,
  DiscoveredDeviceResponse,
  TriggerScanResponse,
  TestCredentialResponse,
  EnrollDeviceResponse,
  CredentialBasicInfo,
  ScanSchedule,
  IPRangeStatus,
  ScanScheduleType,
  CredentialType,
  SNMPVersion,
  ScanStatus,
  DiscoveredDeviceStatus,
  ListIPRangesParams,
  ListCredentialsParams,
  ListDiscoveredDevicesParams,
} from './discovery.types';

// Validators - export schemas and inferred input types
export {
  createIPRangeSchema,
  updateIPRangeSchema,
  listIPRangesQuerySchema,
  createCredentialSchema,
  updateCredentialSchema,
  listCredentialsQuerySchema,
  testCredentialSchema,
  getScanResultsQuerySchema,
  listDiscoveredDevicesQuerySchema,
  enrollDeviceSchema,
} from './discovery.validators';

export type {
  CreateIPRangeInput,
  UpdateIPRangeInput,
  ListIPRangesQuery,
  CreateCredentialInput,
  UpdateCredentialInput,
  ListCredentialsQuery,
  TestCredentialInput,
  GetScanResultsQuery,
  ListDiscoveredDevicesQuery,
  EnrollDeviceInput,
} from './discovery.validators';
