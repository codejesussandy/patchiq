import type { Agent, AgentDownload, Command, AgentVersion } from '../types/agent.types';
import { api } from './api.service';

export type { Agent, AgentDownload, Command, AgentVersion } from '../types/agent.types';

export type AgentLogs = {
  content: string;
  agentVersion?: string;
  hostname?: string;
  os?: string;
  uploadedAt?: string;
};

export type AgentError = {
  id: string;
  type: string;
  status: string;
  errorMessage: string;
  result?: string;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    hostname: string;
    os: string;
  };
};

export const agentService = {
  async getAgents(): Promise<Agent[]> {
    const response = await api.get('/agents');
    // Backend returns paginated response { data, total, page, limit, totalPages }
    // Paginated response: interceptor returns { data: T[], ...meta }
    return response.data.data || [];
  },

  async getAgentDownloads(): Promise<AgentDownload[]> {
    const response = await api.get('/agents/downloads');
    // Non-paginated response: interceptor unwraps to T directly
    return response.data || [];
  },

  async deleteAgent(id: string): Promise<void> {
    await api.delete(`/agents/${id}`);
  },

  async getAgentDetails(id: string): Promise<Agent> {
    const response = await api.get(`/agents/${id}`);
    return response.data;
  },

  async getAgentCommands(id: string): Promise<Command[]> {
    const response = await api.get(`/agents/${id}/commands`);
    return response.data;
  },

  async getAgentErrors(params?: {
    agentId?: string;
    commandType?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AgentError[]; total: number; page: number; limit: number }> {
    const response = await api.get('/agents/errors', { params });
    return {
      data: response.data.data || [],
      total: response.data.total || 0,
      page: response.data.page || 1,
      limit: response.data.limit || 20,
    };
  },

  async getAgentLogs(id: string): Promise<AgentLogs | null> {
    const response = await api.get(`/agents/${id}/logs`);
    return response.data ?? null;
  },

  async getAgentVersions(): Promise<AgentVersion[]> {
    const response = await api.get('/agent-versions');
    return response.data || [];
  },

  /**
   * Download agent binary file (ZIP)
   * @param versionId - Agent version ID
   * @returns Blob and optional filename from Content-Disposition header
   */
  async downloadAgentBinary(versionId: string): Promise<{ blob: Blob; filename?: string }> {
    const response = await api.get(`/agent-versions/${versionId}/download`, {
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'];
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/);

    return {
      blob: response.data,
      filename: filenameMatch?.[1],
    };
  },
};
