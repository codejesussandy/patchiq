import { api } from './api.service';
import type { Agent, AgentDownload, Command, AgentVersion } from '../types/agent.types';

export type { Agent, AgentDownload, Command, AgentVersion } from '../types/agent.types';

export const agentService = {
  async getAgents(): Promise<Agent[]> {
    const response = await api.get('/agents');
    return response.data;
  },

  async getAgentDownloads(): Promise<AgentDownload[]> {
    const response = await api.get('/agents/downloads');
    return response.data;
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
    return response.data;
  },
};
