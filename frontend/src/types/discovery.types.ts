// Re-export the canonical Agent type from agent.types.ts
export type { Agent, AgentStatus } from './agent.types';

// Re-export shared API types
export type {
  IPRangeResponse,
  DeviceCredentialResponse,
  ScanResponse,
  DiscoveredDeviceResponse,
  ListIPRangesParams,
  ListCredentialsParams,
  ListDiscoveredDevicesParams,
  TriggerScanResponse,
  EnrollDeviceResponse,
  TestCredentialResponse,
  ScanSchedule,
  CredentialBasicInfo,
} from '@shared/types';

// Legacy/simplified agent type for discovery listing (backwards compatibility)
export type DiscoveryAgent = {
  id: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'Offline';
  lastConnectedTime: string;
  os: string;
  version: string;
  createdAt?: string;
};

// UI-specific form data
export type AgentFormData = {
  name: string;
  os: string;
  version: string;
};

// UI-specific IP Range type (simpler than shared IPRangeResponse)
export type IPRange = {
  id: string;
  name: string;
  range: string;
  description?: string;
  lastScanned?: string;
  deviceCount: number;
  createdAt?: string;
};

export type IPRangeFormData = Omit<IPRange, 'id' | 'lastScanned' | 'deviceCount' | 'createdAt'>;

// UI-specific Device Credential type (simpler than shared)
export type DeviceCredential = {
  id: string;
  name: string;
  type: 'SSH' | 'WINDOWS' | 'WINRM' | 'SNMP';
  username?: string;
  password?: string;
  description?: string;
  lastUsed?: string;
  createdAt?: string;
};

export type DeviceCredentialFormData = Omit<DeviceCredential, 'id' | 'lastUsed' | 'createdAt'>;

// UI-specific Discovered Device type
export type DiscoveredDevice = {
  id: string;
  ipRangeId: string;
  ipAddress: string;
  hostname: string | null;
  macAddress: string | null;
  deviceType: string | null;
  os: string | null;
  vendor: string | null;
  openPorts: number[];
  status: 'DISCOVERED' | 'ENROLLED' | 'IGNORED';
  assetId: string | null;
  discoveredAt: string;
  lastSeenAt: string;
};

export type ScanStatus = {
  id: string;
  ipRangeId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  devicesFound: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type DiscoveredDeviceFilterState = {
  showIpAddress: boolean;
  showHostname: boolean;
  showMacAddress: boolean;
  showDeviceType: boolean;
  showOs: boolean;
  showOpenPorts: boolean;
  showStatus: boolean;
  showDiscoveredAt: boolean;
};

// UI Filter States
export type AgentFilterState = {
  showId: boolean;
  showName: boolean;
  showStatus: boolean;
  showLastConnectedTime: boolean;
  showOS: boolean;
  showVersion: boolean;
};

export type IPRangeFilterState = {
  showId: boolean;
  showName: boolean;
  showRange: boolean;
  showDescription: boolean;
  showLastScanned: boolean;
  showDeviceCount: boolean;
};

export type CredentialFilterState = {
  showId: boolean;
  showName: boolean;
  showType: boolean;
  showUsername: boolean;
  showLastUsed: boolean;
};
