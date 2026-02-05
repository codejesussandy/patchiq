// Re-export matching enums from shared package
export type { AgentStatus, OSFamily } from '@patchiq/shared-types';

// TODO: Align with @patchiq/shared-types when shared models use enum types
// Mismatch: shared Agent uses string for status/os, lacks lastHeartbeatRelative/tags/groups
export type Agent = {
  // Core identifiers
  id: string;
  machineId: string;
  name: string;

  // Status
  status: import('@patchiq/shared-types').AgentStatus;

  // Operating system
  os: import('@patchiq/shared-types').OSFamily;
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
