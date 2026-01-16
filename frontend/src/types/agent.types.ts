export type AgentStatus = 'Connected' | 'Disconnected' | 'Pending' | 'Error';
export type OSFamily = 'Windows' | 'MacOS' | 'Linux';

export type Agent = {
  // Core identifiers
  id: string;
  machineId: string;
  name: string;

  // Status
  status: AgentStatus;

  // Operating system
  os: OSFamily;
  osVersion: string;
  agentVersion: string;

  // Heartbeat tracking
  lastHeartbeat: string; // ISO 8601 format
  lastHeartbeatRelative: string; // "2 minutes ago"
  registeredAt: string;

  // Network information
  ipAddress?: string;
  hostname?: string;

  // Hardware identifiers
  serialNumber?: string;

  // Relationships
  assetId?: string; // Link to Asset

  // Organization
  tags?: string[];
  groups?: Array<{ id: string; name: string }>;

  // Capabilities
  capabilities?: string[];
};

export type AgentDownload = {
  os: 'Windows 11' | 'MacOS' | 'Linux';
  version: string;
  releaseDate: string;
  downloadUrl: string;
};

export type Command = {
  id: string;
  agentId: string;
  type: 'scan' | 'update' | 'deploy' | 'reboot';
  status: 'pending' | 'sent' | 'completed' | 'failed';
  createdAt: string;
  executedAt?: string;
  result?: string;
};

export type AgentVersion = {
  id: string;
  platform: 'Linux' | 'Windows' | 'Mac';
  architecture: string;
  version: string;
  lastUpdatedAt: string;
};
