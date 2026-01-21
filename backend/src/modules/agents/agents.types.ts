export type AgentStatus = 'Connected' | 'Disconnected' | 'Pending' | 'Error';
export type OSFamily = 'Windows' | 'MacOS' | 'Linux';

export interface AgentGroup {
  id: string;
  name: string;
}

export interface AgentResponse {
  id: string;
  machineId: string;
  name: string | null;
  status: string;
  os: string | null;
  osVersion: string | null;
  agentVersion: string | null;
  lastHeartbeat: string | null;
  lastHeartbeatRelative?: string | null;
  registeredAt: string;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
  serialNumber: string | null;
  assetId: string | null;
  tags: string[];
  groups: AgentGroup[];
  capabilities: string[];
}

export interface AgentDownloadResponse {
  os: string;
  version: string;
  releaseDate: string;
  downloadUrl: string;
}

export interface AgentVersionResponse {
  id: string;
  platform: string;
  architecture: string;
  version: string;
  lastUpdatedAt: string;
}

export interface CommandResponse {
  id: string;
  agentId: string;
  type: string;
  status: string;
  createdAt: string;
  executedAt: string | null;
  result: unknown;
}

export interface ListAgentsParams {
  status?: AgentStatus;
  os?: OSFamily;
  search?: string;
  page: number;
  limit: number;
}

export interface RegisterAgentResponse {
  agentId: string;
  assetId: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresIn: number;
  config: AgentConfig;
  isReRegistration: boolean;
  message?: string;
}

export interface AgentConfig {
  heartbeatIntervalSeconds: number;
  inventoryScheduleCron: string;
  telemetryIntervalSeconds: number;
  telemetryEnabled: boolean;
  patchScanScheduleCron: string;
  logLevel: string;
}

export interface HeartbeatResponse {
  acknowledged: boolean;
  serverTime: string;
  commandsPending: boolean;
  configUpdated: boolean;
  inventoryRequested: boolean;
}

export interface PendingCommand {
  id: string;
  type: string;
  payload?: unknown;
  createdAt: string;
}
