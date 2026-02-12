import type { Agent, AgentDownload, Command, AgentVersion } from '../types/agent.types';
import { api } from './api.service';

export type { Agent, AgentDownload, Command, AgentVersion } from '../types/agent.types';

export const agentService = {
  async getAgents(): Promise<Agent[]> {
    const response = await api.get('/agents');
    // Backend returns paginated response { data, total, page, limit, totalPages }
    // Paginated response: interceptor returns { data: T[], ...meta }
    return response.data.data || [];
  },

  async getAgentDownloads(): Promise<AgentDownload[]> {
    const response = await api.get('/agents/downloads');
    // Paginated response: interceptor returns { data: T[], ...meta }
    return response.data.data || [];
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

  async getAgentVersions(): Promise<AgentVersion[]> {
    const response = await api.get('/agent-versions');
    // Paginated response: interceptor returns { data: T[], ...meta }
    return response.data.data || [];
  },
};
