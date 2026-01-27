import { api } from './api.service';
import type {
  Patch,
  AffectedSoftware,
  FileDetail,
  Vulnerability,
  Endpoint,
  EndpointDetails,
  Deployment,
  PatchTest,
  ZeroTouchConfig,
  Asset,
  AssetPatchStatus,
  AssetRelatedPatch,
  AssetDeployment,
} from '../types/patch.types';

// Re-export types for backward compatibility
export type {
  Patch,
  AffectedProduct,
  AffectedSoftware,
  FileDetail,
  Vulnerability,
  Endpoint,
  EndpointDetails,
  Deployment,
  PatchTest,
  ZeroTouchConfig,
  Asset,
  AssetPatchStatus,
  AssetRelatedPatch,
  AssetDeployment,
  AssetGroup,
  PatchSummary,
  AgentLink,
} from '../types/patch.types';

// Backward compatibility aliases
export type EndpointPatchStatus = AssetPatchStatus;
export type EndpointRelatedPatch = AssetRelatedPatch;
export type EndpointDeployment = AssetDeployment;

export const patchService = {
  // Patches
  async getPatches(): Promise<Patch[]> {
    const response = await api.get(`/patches`);
    // Backend returns paginated response { data, total, page, limit, totalPages }
    return response.data.data || [];
  },

  async getPatch(id: string): Promise<Patch> {
    const response = await api.get(`/patches/${id}`);
    return response.data;
  },

  async createPatch(patch: Partial<Patch>): Promise<Patch> {
    const response = await api.post(`/patches`, patch);
    return response.data;
  },

  async updatePatch(id: string, patch: Partial<Patch>): Promise<Patch> {
    const response = await api.put(`/patches/${id}`, patch);
    return response.data;
  },

  async deletePatch(id: string): Promise<void> {
    await api.delete(`/patches/${id}`);
  },

  async getAffectedSoftwares(patchId: string): Promise<AffectedSoftware[]> {
    const response = await api.get(`/patches/${patchId}/affected-softwares`);
    return response.data;
  },

  async scanEndpoints(patchId: string, data: { scope: string; endpointIds: string[] }): Promise<void> {
    await api.post(`/patches/${patchId}/scan-endpoints`, data);
  },

  async getFileDetails(patchId: string): Promise<FileDetail[]> {
    const response = await api.get(`/patches/${patchId}/file-details`);
    return response.data;
  },

  async getVulnerabilities(patchId: string): Promise<Vulnerability[]> {
    const response = await api.get(`/patches/${patchId}/vulnerabilities`);
    return response.data;
  },

  async getEndpoints(patchId: string): Promise<Endpoint[]> {
    const response = await api.get(`/patches/${patchId}/endpoints`);
    return response.data;
  },

  async getEndpointDetails(endpointId: string): Promise<EndpointDetails> {
    const response = await api.get(`/endpoints/${endpointId}`);
    return response.data;
  },

  /**
   * Get asset details with patch information
   * This is the preferred method for new code - use Asset type instead of EndpointDetails
   */
  async getAssetWithPatches(assetId: string): Promise<Asset> {
    const response = await api.get(`/assets/${assetId}/full`);
    return response.data;
  },

  // Deployments
  async getDeployments(): Promise<Deployment[]> {
    const response = await api.get(`/deployments`);
    // Backend returns paginated response { data, total, page, limit, totalPages }
    return response.data.data || [];
  },

  async getDeployment(id: string): Promise<Deployment> {
    const response = await api.get(`/deployments/${id}`);
    return response.data;
  },

  async createDeployment(deployment: Partial<Deployment>): Promise<Deployment> {
    // Use the patch deployment endpoint
    const response = await api.post(`/deployments/patch`, deployment);
    return response.data.data || response.data;
  },

  async deleteDeployment(id: string): Promise<void> {
    await api.delete(`/deployments/${id}`);
  },

  async getDeploymentTasks(id: string): Promise<any[]> {
    const response = await api.get(`/deployments/${id}`);
    return response.data.tasks || [];
  },

  async previewDeployment(id: string): Promise<any> {
    const response = await api.get(`/deployments/${id}/preview`);
    return response.data;
  },

  async executeDeployment(id: string): Promise<void> {
    await api.post(`/deployments/${id}/execute`);
  },

  // Patch Tests
  async getPatchTests(): Promise<PatchTest[]> {
    const response = await api.get(`/patch-tests`);
    // Backend returns paginated response { data, total, page, limit, totalPages }
    return response.data.data || [];
  },

  async getPatchTest(id: string): Promise<PatchTest> {
    const response = await api.get(`/patch-tests/${id}`);
    return response.data;
  },

  async createPatchTest(test: Partial<PatchTest>): Promise<PatchTest> {
    const response = await api.post(`/patch-tests`, test);
    return response.data;
  },

  async approvePatchTest(id: string): Promise<void> {
    await api.put(`/patch-tests/${id}/approve`);
  },

  async deletePatchTest(id: string): Promise<void> {
    await api.delete(`/patch-tests/${id}`);
  },

  // Zero Touch
  async getZeroTouchConfigs(): Promise<ZeroTouchConfig[]> {
    const response = await api.get(`/zero-touch-configs`);
    // Backend returns paginated response { data, total, page, limit, totalPages }
    return response.data.data || [];
  },

  async getZeroTouchConfig(id: string): Promise<ZeroTouchConfig> {
    const response = await api.get(`/zero-touch-configs/${id}`);
    return response.data;
  },

  async createZeroTouchConfig(config: Partial<ZeroTouchConfig>): Promise<ZeroTouchConfig> {
    const response = await api.post(`/zero-touch-configs`, config);
    return response.data;
  },

  async updateZeroTouchConfig(id: string, config: Partial<ZeroTouchConfig>): Promise<ZeroTouchConfig> {
    const response = await api.put(`/zero-touch-configs/${id}`, config);
    return response.data;
  },

  async deleteZeroTouchConfig(id: string): Promise<void> {
    await api.delete(`/zero-touch-configs/${id}`);
  },
};
