import { api } from './api.service';
import type {
  Agent,
  AgentFormData,
  IPRange,
  IPRangeFormData,
  DeviceCredential,
  DeviceCredentialFormData,
} from '../types/discovery.types';

export const discoveryService = {
  // Agent APIs
  async getAgents(): Promise<Agent[]> {
    const response = await api.get(`/discovery/agents`);
    return response.data;
  },

  async getAgent(id: string): Promise<Agent> {
    const response = await api.get(`/discovery/agents/${id}`);
    return response.data;
  },

  async createAgent(data: AgentFormData): Promise<Agent> {
    const response = await api.post(`/discovery/agents`, data);
    return response.data;
  },

  async updateAgent(id: string, data: Partial<AgentFormData>): Promise<Agent> {
    const response = await api.put(`/discovery/agents/${id}`, data);
    return response.data;
  },

  async deleteAgent(id: string): Promise<void> {
    await api.delete(`/discovery/agents/${id}`);
  },

  // IP Range APIs
  async getIPRanges(): Promise<IPRange[]> {
    const response = await api.get(`/discovery/ip-ranges`);
    return response.data;
  },

  async getIPRange(id: string): Promise<IPRange> {
    const response = await api.get(`/discovery/ip-ranges/${id}`);
    return response.data;
  },

  async createIPRange(data: IPRangeFormData): Promise<IPRange> {
    const response = await api.post(`/discovery/ip-ranges`, data);
    return response.data;
  },

  async updateIPRange(id: string, data: Partial<IPRangeFormData>): Promise<IPRange> {
    const response = await api.put(`/discovery/ip-ranges/${id}`, data);
    return response.data;
  },

  async deleteIPRange(id: string): Promise<void> {
    await api.delete(`/discovery/ip-ranges/${id}`);
  },

  async scanIPRange(id: string): Promise<any> {
    const response = await api.post(`/discovery/ip-ranges/${id}/scan`);
    return response.data;
  },

  // Device Credential APIs
  async getCredentials(): Promise<DeviceCredential[]> {
    const response = await api.get(`/discovery/credentials`);
    return response.data;
  },

  async getCredential(id: string): Promise<DeviceCredential> {
    const response = await api.get(`/discovery/credentials/${id}`);
    return response.data;
  },

  async createCredential(data: DeviceCredentialFormData): Promise<DeviceCredential> {
    const response = await api.post(`/discovery/credentials`, data);
    return response.data;
  },

  async updateCredential(id: string, data: Partial<DeviceCredentialFormData>): Promise<DeviceCredential> {
    const response = await api.put(`/discovery/credentials/${id}`, data);
    return response.data;
  },

  async deleteCredential(id: string): Promise<void> {
    await api.delete(`/discovery/credentials/${id}`);
  },

  async testCredential(id: string): Promise<any> {
    const response = await api.post(`/discovery/credentials/${id}/test`);
    return response.data;
  },
};
