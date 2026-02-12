import type { Agent, AgentDownload, Command, AgentVersion } from '../types/agent.types';
import { api } from './api.service';

export type { Agent, AgentDownload, Command, AgentVersion } from '../types/agent.types';

export const agentService = {
  async getAgents(): Promise<Agent[]> {
    const response = await api.get('/agents');
    // Backend returns paginated response { data, total, page, limit, totalPages }
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
  },

  async getAgentDownloads(): Promise<AgentDownload[]> {
    const response = await api.get('/agents/downloads');
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
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
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
  },
};
