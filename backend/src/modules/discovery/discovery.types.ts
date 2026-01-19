// ============================================
// IP Range Types
// ============================================

export type IPRangeStatus = 'active' | 'inactive';
export type ScanScheduleType = 'once' | 'daily' | 'weekly';

export interface ScanSchedule {
  type: ScanScheduleType;
  time?: string;
  dayOfWeek?: number;
}

export interface CredentialBasicInfo {
  id: string;
  name: string;
  type: string;
}

export interface IPRangeResponse {
  id: string;
  name: string;
  range: string;
  description: string | null;
  lastScanned: string | null;
  deviceCount: number;
  credentialId: string | null;
  credential: CredentialBasicInfo | null;
  scanSchedule: ScanSchedule | null;
  status: IPRangeStatus;
  createdAt: string;
}

export interface ListIPRangesParams {
  page: number;
  limit: number;
  search?: string;
  status?: IPRangeStatus;
}

// ============================================
// Device Credential Types
// ============================================

export type CredentialType = 'SSH' | 'Windows' | 'SNMP' | 'WinRM';
export type SNMPVersion = 'v2c' | 'v3';

export interface DeviceCredentialResponse {
  id: string;
  name: string;
  type: CredentialType;
  username: string | null;
  domain: string | null;
  snmpCommunity: string | null;
  snmpVersion: SNMPVersion | null;
  port: number | null;
  description: string | null;
  lastUsed: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface DeviceCredentialDetailResponse extends DeviceCredentialResponse {
  password?: string; // Only returned when explicitly requested with elevated permissions
}

export interface ListCredentialsParams {
  page: number;
  limit: number;
  search?: string;
  type?: CredentialType;
}

export interface TestCredentialResponse {
  success: boolean;
  message: string;
}

// ============================================
// Discovery Scan Types
// ============================================

export type ScanStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ScanResponse {
  id: string;
  ipRangeId: string;
  status: ScanStatus;
  devicesFound: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface TriggerScanResponse {
  jobId: string;
  status: string;
  message: string;
}

// ============================================
// Discovered Device Types
// ============================================

export type DiscoveredDeviceStatus = 'discovered' | 'enrolled' | 'ignored';

export interface DiscoveredDeviceResponse {
  id: string;
  ipRangeId: string;
  ipAddress: string;
  hostname: string | null;
  macAddress: string | null;
  deviceType: string | null;
  os: string | null;
  vendor: string | null;
  openPorts: number[];
  status: DiscoveredDeviceStatus;
  assetId: string | null;
  discoveredAt: string;
  lastSeenAt: string;
}

export interface ListDiscoveredDevicesParams {
  page: number;
  limit: number;
  ipRangeId?: string;
  status?: DiscoveredDeviceStatus;
  search?: string;
}

export interface EnrollDeviceResponse {
  assetId: string;
  message: string;
}
