import { api } from './api.service';

// Types for Configuration Catalog
export interface ConfigCatalogItem {
  id: string;
  configurationId: string;
  name: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description?: string;
  tags?: string[];
  configurationType: 'command' | 'policy' | 'script';
  architecture: 'x64' | 'x86' | 'ARM64';
  isRemediation: boolean;
  commandType: 'powershell' | 'cmd' | 'bash' | 'sh';
  command: string;
  createdBy: string;
  createdOn?: string;
}

export interface CreateConfigCatalogInput {
  name: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description?: string;
  tags?: string[];
  configurationType?: 'command' | 'policy' | 'script';
  architecture?: 'x64' | 'x86' | 'ARM64';
  isRemediation?: boolean;
  commandType?: 'powershell' | 'cmd' | 'bash' | 'sh';
  command: string;
}

// Types for Configuration Bundle
export interface ConfigBundle {
  id: string;
  bundleId: string;
  bundleName: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description?: string;
  configurations: string[];
  configurationCount: number;
  createdBy: string;
  createdOn?: string;
}

export interface CreateConfigBundleInput {
  bundleName: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description?: string;
  configurations?: string[];
}

// Types for Configuration Deployment
export interface ConfigDeployment {
  id: string;
  deploymentId: string;
  name: string;
  description?: string;
  status: string;
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn?: string;
}

export interface CreateConfigDeploymentInput {
  name: string;
  description?: string;
  configurationIds?: string[];
  bundleIds?: string[];
  targetAgentIds: string[];
}

// Types for Patch Jobs
export interface PatchJob {
  id: string;
  policyId: string;
  name: string;
  description?: string;
  type: 'SCHEDULE' | 'INSTANT';
  status: string;
  createdBy: string;
  createdOn?: string;
}

// Types for Deployment Policy
export interface DeploymentPolicy {
  id: string;
  policyId: string;
  name: string;
  description?: string;
  type: 'SCHEDULE' | 'INSTANT';
  schedule?: string;
  createdBy: string;
  createdOn?: string;
}

export interface CreateDeploymentPolicyInput {
  name: string;
  description?: string;
  type: 'SCHEDULE' | 'INSTANT';
  schedule?: string;
}

// Types for Vulnerability Jobs
export interface VulnerabilityJob {
  id: string;
  jobId: string;
  name: string;
  description?: string;
  scope?: string;
  endpoints?: string[];
  scanType?: string;
  scheduleDate?: string;
  scheduleTime?: string;
  recurrence?: string;
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  scheduledTime?: string;
  lastRun?: string;
  nextRun?: string;
  result?: { assetsScanned?: number; vulnerabilitiesFound?: number } | null;
  createdBy: string;
  createdOn?: string;
}

export interface CreateVulnerabilityJobInput {
  name: string;
  description?: string;
  scope?: 'Global' | 'Group' | 'Endpoint';
  endpoints?: string[];
  scanType?: 'instant' | 'scheduled';
  scheduleDate?: string;
  scheduleTime?: string;
  recurrence?: 'once' | 'daily' | 'weekly' | 'monthly';
}

// Types for Software Catalog
export interface SoftwareCatalogItem {
  id: string;
  deploymentId: string;
  name: string;
  description?: string;
  version?: string;
  type: 'MSI' | 'EXE' | 'APPLICATION';
  os: 'Windows' | 'Mac' | 'Linux';
  tags?: string[];
  createdBy: string;
  createdOn?: string;
}

// Types for Software Bundle
export interface SoftwareBundle {
  id: string;
  bundleId: string;
  name: string;
  description?: string;
  os: 'Windows' | 'Mac' | 'Linux';
  softwareCount: number;
  softwaresList?: string[];
  createdBy: string;
  createdOn?: string;
}

// Paginated response type
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const jobsService = {
  // ==========================================
  // Configuration Catalog
  // ==========================================
  async getConfigCatalog(): Promise<ConfigCatalogItem[]> {
    const response = await api.get<PaginatedResponse<ConfigCatalogItem>>('/jobs/config/catalog');
    return response.data.data || [];
  },

  async getConfigCatalogItem(id: string): Promise<ConfigCatalogItem> {
    const response = await api.get<ConfigCatalogItem>(`/jobs/config/catalog/${id}`);
    return response.data;
  },

  async createConfigCatalog(data: CreateConfigCatalogInput): Promise<ConfigCatalogItem> {
    const response = await api.post<ConfigCatalogItem>('/jobs/config/catalog', data);
    return response.data;
  },

  async updateConfigCatalog(id: string, data: Partial<CreateConfigCatalogInput>): Promise<ConfigCatalogItem> {
    const response = await api.put<ConfigCatalogItem>(`/jobs/config/catalog/${id}`, data);
    return response.data;
  },

  async deleteConfigCatalog(id: string): Promise<void> {
    await api.delete(`/jobs/config/catalog/${id}`);
  },

  // ==========================================
  // Configuration Bundles
  // ==========================================
  async getConfigBundles(): Promise<ConfigBundle[]> {
    const response = await api.get<PaginatedResponse<ConfigBundle>>('/jobs/config/bundles');
    return response.data.data || [];
  },

  async getConfigBundle(id: string): Promise<ConfigBundle> {
    const response = await api.get<ConfigBundle>(`/jobs/config/bundles/${id}`);
    return response.data;
  },

  async createConfigBundle(data: CreateConfigBundleInput): Promise<ConfigBundle> {
    const response = await api.post<ConfigBundle>('/jobs/config/bundles', data);
    return response.data;
  },

  async updateConfigBundle(id: string, data: Partial<CreateConfigBundleInput>): Promise<ConfigBundle> {
    const response = await api.put<ConfigBundle>(`/jobs/config/bundles/${id}`, data);
    return response.data;
  },

  async deleteConfigBundle(id: string): Promise<void> {
    await api.delete(`/jobs/config/bundles/${id}`);
  },

  // ==========================================
  // Configuration Deployments
  // ==========================================
  async getConfigDeployments(): Promise<ConfigDeployment[]> {
    const response = await api.get<PaginatedResponse<ConfigDeployment>>('/jobs/config/deployed');
    return response.data.data || [];
  },

  async createConfigDeployment(data: CreateConfigDeploymentInput): Promise<ConfigDeployment> {
    const response = await api.post<ConfigDeployment>('/jobs/config/deployed', data);
    return response.data;
  },

  async getConfigDeploymentTasks(id: string): Promise<any[]> {
    const response = await api.get(`/jobs/config/deployed/${id}/tasks`);
    return response.data.tasks || response.data || [];
  },

  async deleteConfigDeployment(id: string): Promise<void> {
    await api.delete(`/jobs/config/deployed/${id}`);
  },

  // ==========================================
  // Patch Jobs
  // ==========================================
  async getPatchJobs(): Promise<PatchJob[]> {
    const response = await api.get<PaginatedResponse<PatchJob>>('/jobs/patch');
    return response.data.data || [];
  },

  async getPatchJob(id: string): Promise<PatchJob> {
    const response = await api.get<PatchJob>(`/jobs/patch/${id}`);
    return response.data;
  },

  async deletePatchJob(id: string): Promise<void> {
    await api.delete(`/jobs/patch/${id}`);
  },

  // ==========================================
  // Deployment Policies
  // ==========================================
  async getDeploymentPolicies(): Promise<DeploymentPolicy[]> {
    const response = await api.get<PaginatedResponse<DeploymentPolicy>>('/deployment-policies');
    return response.data.data || [];
  },

  async getDeploymentPolicy(id: string): Promise<DeploymentPolicy> {
    const response = await api.get<DeploymentPolicy>(`/deployment-policies/${id}`);
    return response.data;
  },

  async createDeploymentPolicy(data: CreateDeploymentPolicyInput): Promise<DeploymentPolicy> {
    const response = await api.post<DeploymentPolicy>('/deployment-policies', data);
    return response.data;
  },

  async updateDeploymentPolicy(id: string, data: Partial<CreateDeploymentPolicyInput>): Promise<DeploymentPolicy> {
    const response = await api.put<DeploymentPolicy>(`/deployment-policies/${id}`, data);
    return response.data;
  },

  async deleteDeploymentPolicy(id: string): Promise<void> {
    await api.delete(`/deployment-policies/${id}`);
  },

  // ==========================================
  // Vulnerability Jobs
  // ==========================================
  async getVulnerabilityJobs(): Promise<VulnerabilityJob[]> {
    const response = await api.get<PaginatedResponse<VulnerabilityJob>>('/jobs/vulnerability');
    return response.data.data || [];
  },

  async getVulnerabilityJob(id: string): Promise<VulnerabilityJob> {
    const response = await api.get<VulnerabilityJob>(`/jobs/vulnerability/${id}`);
    return response.data;
  },

  async createVulnerabilityJob(data: CreateVulnerabilityJobInput): Promise<VulnerabilityJob> {
    const response = await api.post<VulnerabilityJob>('/jobs/vulnerability', data);
    return response.data;
  },

  async deleteVulnerabilityJob(id: string): Promise<void> {
    await api.delete(`/jobs/vulnerability/${id}`);
  },

  // ==========================================
  // Software Catalog
  // ==========================================
  async getSoftwareCatalog(): Promise<SoftwareCatalogItem[]> {
    const response = await api.get<PaginatedResponse<SoftwareCatalogItem>>('/jobs/software/catalog');
    return response.data.data || [];
  },

  async getSoftwareCatalogItem(id: string): Promise<SoftwareCatalogItem> {
    const response = await api.get<SoftwareCatalogItem>(`/jobs/software/catalog/${id}`);
    return response.data;
  },

  async createSoftwareCatalog(data: Partial<SoftwareCatalogItem>): Promise<SoftwareCatalogItem> {
    const response = await api.post<SoftwareCatalogItem>('/jobs/software/catalog', data);
    return response.data;
  },

  async updateSoftwareCatalog(id: string, data: Partial<SoftwareCatalogItem>): Promise<SoftwareCatalogItem> {
    const response = await api.put<SoftwareCatalogItem>(`/jobs/software/catalog/${id}`, data);
    return response.data;
  },

  async deleteSoftwareCatalog(id: string): Promise<void> {
    await api.delete(`/jobs/software/catalog/${id}`);
  },

  // ==========================================
  // Software Bundles
  // ==========================================
  async getSoftwareBundles(): Promise<SoftwareBundle[]> {
    const response = await api.get<PaginatedResponse<SoftwareBundle>>('/jobs/software/bundles');
    return response.data.data || [];
  },

  async getSoftwareBundle(id: string): Promise<SoftwareBundle> {
    const response = await api.get<SoftwareBundle>(`/jobs/software/bundles/${id}`);
    return response.data;
  },

  async createSoftwareBundle(data: Partial<SoftwareBundle>): Promise<SoftwareBundle> {
    const response = await api.post<SoftwareBundle>('/jobs/software/bundles', data);
    return response.data;
  },

  async updateSoftwareBundle(id: string, data: Partial<SoftwareBundle>): Promise<SoftwareBundle> {
    const response = await api.put<SoftwareBundle>(`/jobs/software/bundles/${id}`, data);
    return response.data;
  },

  async deleteSoftwareBundle(id: string): Promise<void> {
    await api.delete(`/jobs/software/bundles/${id}`);
  },

  // ==========================================
  // Software Deployments
  // ==========================================
  async getSoftwareDeployments(): Promise<any[]> {
    const response = await api.get('/jobs/software/deployed');
    return response.data.data || [];
  },

  async getSoftwareDeploymentTasks(id: string): Promise<any[]> {
    const response = await api.get(`/jobs/software/deployed/${id}/tasks`);
    return response.data.tasks || response.data || [];
  },
};
