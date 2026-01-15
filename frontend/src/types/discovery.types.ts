// Agent Types
export type Agent = {
  id: string;
  name: string;
  status: 'Connected' | 'Disconnected' | 'Offline';
  lastConnectedTime: string;
  os: string;
  version: string;
  createdAt?: string;
};

export type AgentFormData = Omit<Agent, 'id' | 'lastConnectedTime' | 'status' | 'createdAt'>;

// IP Range Types
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

// Device Credential Types
export type DeviceCredential = {
  id: string;
  name: string;
  type: 'SSH' | 'Windows' | 'SNMP';
  username: string;
  password?: string;
  description?: string;
  lastUsed?: string;
  createdAt?: string;
};

export type DeviceCredentialFormData = Omit<DeviceCredential, 'id' | 'lastUsed' | 'createdAt'>;

// Filter States
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
