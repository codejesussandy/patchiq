/**
 * Software Jobs Service
 * API client for software deployments
 */

import { api } from './api.service';
import type { SoftwarePackage, HubBundle } from '../types/hub.types';

// Deployment types
export interface SoftwareDeployment {
  id: string;
  deploymentId: string;
  name: string;
  description: string | null;
  type: 'install' | 'uninstall' | 'upgrade';
  stage: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  pending: number;
  succeeded: number;
  failed: number;
  total: number;
  progress: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SoftwareDeploymentTask {
  id: string;
  agentId: string;
  agentName?: string;
  agentOs?: string;
  packageName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  executionOutput?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SoftwareDeploymentWithTasks extends SoftwareDeployment {
  tasks: SoftwareDeploymentTask[];
}

export interface CreateSoftwareDeploymentInput {
  name: string;
  description?: string;
  type: 'install' | 'uninstall' | 'upgrade';
  targetAgentIds: string[];
  package: {
    name: string;
    source: string;
    version?: string;
    packageUrl?: string;
    checksum?: string;
  };
  retryCount?: number;
  notifyOnComplete?: boolean;
}

export interface DeploymentCreationResult {
  deploymentId: string;
  tasksCreated: number;
  commandsCreated: number;
  status: string;
}

export const softwareJobsService = {
  // ============================================
  // Software Deployments
  // ============================================

  async listDeployments(): Promise<SoftwareDeployment[]> {
    const response = await api.get('/deployments/software');
    return response.data.data || [];
  },

  async getDeployment(deploymentId: string): Promise<SoftwareDeploymentWithTasks> {
    const response = await api.get(`/deployments/software/${deploymentId}`);
    return response.data.data || response.data;
  },

  async createDeployment(input: CreateSoftwareDeploymentInput): Promise<DeploymentCreationResult> {
    const response = await api.post('/deployments/software', input);
    return response.data.data || response.data;
  },

  async cancelDeployment(deploymentId: string): Promise<void> {
    await api.post(`/deployments/software/${deploymentId}/cancel`);
  },

  // ============================================
  // Hub Integration (for package selection)
  // ============================================

  async listPackages(): Promise<SoftwarePackage[]> {
    const response = await api.get('/hub/packages', { params: { limit: 100 } });
    return response.data.data || [];
  },

  async listBundles(): Promise<HubBundle[]> {
    const response = await api.get('/hub/bundles');
    return response.data.data || response.data || [];
  },

  // ============================================
  // Agents (for target selection)
  // ============================================

  async listAgents(): Promise<Array<{
    id: string;
    agentId: string;
    hostname: string;
    osType: string;
    status: string;
  }>> {
    const response = await api.get('/agents');
    // Handle both wrapped (data.data) and unwrapped (data) response formats
    const agents = response.data.data || response.data || [];
    // Normalize agent data to consistent format
    return agents.map((agent: any) => ({
      id: agent.id,
      agentId: agent.machineId || agent.agentId || agent.id,
      hostname: agent.hostname || agent.name || 'Unknown',
      // Normalize OS: Linux, darwin/MacOS -> darwin, windows/Windows -> windows
      osType: agent.os?.toLowerCase() === 'macos' || agent.os?.toLowerCase() === 'darwin'
        ? 'darwin'
        : agent.os?.toLowerCase() || 'linux',
      status: agent.status?.toLowerCase() === 'connected' ? 'online' : agent.status?.toLowerCase() || 'offline',
    }));
  },

  // ============================================
  // Rollback
  // ============================================

  async triggerRollback(deploymentId: string, taskId: string, options?: { force?: boolean }): Promise<{ commandId: string; status: string }> {
    const response = await api.post(`/deployments/software/${deploymentId}/tasks/${taskId}/rollback`, options || {});
    return response.data.data || response.data;
  },
};
