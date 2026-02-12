/**
 * Software Jobs Service
 * API client for software deployments
 */

import type { SoftwarePackage, HubBundle } from '../types/hub.types';
import { api } from './api.service';

// Deployment types
export interface SoftwareDeployment {
  id: string;
  deploymentId: string;
  name: string;
  description: string | null;
  type: 'INSTALL' | 'UNINSTALL' | 'UPGRADE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
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
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
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
  type: 'INSTALL' | 'UNINSTALL' | 'UPGRADE';
  targetAgentIds: string[];
  package: {
    packageId?: string;  // For Hub package detection (script bundles)
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
    return agents.map((agent: Record<string, unknown>) => {
      const os = typeof agent.os === 'string' ? agent.os.toLowerCase() : 'linux';
      return {
        id: agent.id as string,
        agentId: (agent.machineId || agent.agentId || agent.id) as string,
        hostname: (agent.hostname || agent.name || 'Unknown') as string,
        osType: os === 'macos' || os === 'darwin' ? 'darwin' : os,
        status: agent.status === 'CONNECTED' ? 'ONLINE' : 'OFFLINE',
      };
    });
  },

  // ============================================
  // Rollback
  // ============================================

  async triggerRollback(deploymentId: string, taskId: string, options?: { force?: boolean }): Promise<{ commandId: string; status: string }> {
    const response = await api.post(`/deployments/software/${deploymentId}/tasks/${taskId}/rollback`, options || {});
    return response.data.data || response.data;
  },
};
