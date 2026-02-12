// Re-export shared enum types
export type {
  ScanScheduleType,
  CredentialType,
  SNMPVersion,
  ScanStatus,
  DiscoveredDeviceStatus,
} from '@shared/types';

// Re-export shared API types
export type {
  ScanSchedule,
  CredentialBasicInfo,
  IPRangeResponse,
  ListIPRangesParams,
  DeviceCredentialResponse,
  DeviceCredentialDetailResponse,
  ListCredentialsParams,
  TestCredentialResponse,
  ScanResponse,
  TriggerScanResponse,
  DiscoveredDeviceResponse,
  ListDiscoveredDevicesParams,
  EnrollDeviceResponse,
} from '@shared/types';

// Keep internal type alias (used in index.ts exports and validators)
export type IPRangeStatus = 'ACTIVE' | 'INACTIVE';
