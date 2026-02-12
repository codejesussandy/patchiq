// Re-export shared API types
export type {
  AgentStatus,
  OSFamily,
  AgentGroup,
  AgentResponse,
  AgentDownloadResponse,
  AgentVersionResponse,
  CommandResponse,
  AgentConfig,
  HeartbeatResponse,
  PendingCommand,
  AgentListParams,
} from '@shared/types';

// Re-export with local name alias
export type { AgentRegistrationResponse as RegisterAgentResponse } from '@shared/types';

// Keep internal type (uses typed enum values from shared, not strings)
import type { AgentStatus, OSFamily } from '@shared/types';

export interface ListAgentsParams {
  status?: AgentStatus;
  os?: OSFamily;
  search?: string;
  page: number;
  limit: number;
}
