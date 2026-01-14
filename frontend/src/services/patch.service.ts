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
  // New unified types from asset.types
  Asset,
  AssetPatchStatus,
  AssetRelatedPatch,
  AssetDeployment,
  AssetGroup,
  PatchSummary,
  AgentLink,
} from '../types/patch.types';

// Re-export types for backward compatibility
export type {
  Patch,
  AffectedSoftware,
  FileDetail,
  Vulnerability,
  Endpoint,
  EndpointDetails,
  Deployment,
  PatchTest,
  ZeroTouchConfig,
  // New unified types
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
    const response = await api.get(`/api/patches`);
    return response.data;
  },

  async getPatch(id: string): Promise<Patch> {
    const response = await api.get(`/api/patches/${id}`);
    return response.data;
  },

  async createPatch(patch: Partial<Patch>): Promise<Patch> {
    const response = await api.post(`/api/patches`, patch);
    return response.data;
  },

  async updatePatch(id: string, patch: Partial<Patch>): Promise<Patch> {
    const response = await api.put(`/api/patches/${id}`, patch);
    return response.data;
  },

  async deletePatch(id: string): Promise<void> {
    await api.delete(`/api/patches/${id}`);
  },

  async getAffectedSoftwares(patchId: string): Promise<AffectedSoftware[]> {
    const response = await api.get(`/api/patches/${patchId}/affected-softwares`);
    return response.data;
  },

  async scanEndpoints(patchId: string, data: { scope: string; endpointIds: string[] }): Promise<void> {
    await api.post(`/api/patches/${patchId}/scan-endpoints`, data);
  },

  async getFileDetails(patchId: string): Promise<FileDetail[]> {
    const response = await api.get(`/api/patches/${patchId}/file-details`);
    return response.data;
  },

  async getVulnerabilities(patchId: string): Promise<Vulnerability[]> {
    const response = await api.get(`/api/patches/${patchId}/vulnerabilities`);
    return response.data;
  },

  async getEndpoints(patchId: string): Promise<Endpoint[]> {
    const response = await api.get(`/api/patches/${patchId}/endpoints`);
    return response.data;
  },

  async getEndpointDetails(endpointId: string): Promise<EndpointDetails> {
    const response = await api.get(`/api/endpoints/${endpointId}`);
    return response.data;
  },

  /**
   * Get asset details with patch information
   * This is the preferred method for new code - use Asset type instead of EndpointDetails
   */
  async getAssetWithPatches(assetId: string): Promise<Asset> {
    const response = await api.get(`/api/assets/${assetId}/full`);
    return response.data;
  },

  // Deployments
  async getDeployments(): Promise<Deployment[]> {
    const response = await api.get(`/api/deployments`);
    return response.data;
  },

  async getDeployment(id: string): Promise<Deployment> {
    const response = await api.get(`/api/deployments/${id}`);
    return response.data;
  },

  async createDeployment(deployment: Partial<Deployment>): Promise<Deployment> {
    const response = await api.post(`/api/deployments`, deployment);
    return response.data;
  },

  async deleteDeployment(id: string): Promise<void> {
    await api.delete(`/api/deployments/${id}`);
  },

  async previewDeployment(id: string): Promise<any> {
    const response = await api.get(`/api/deployments/${id}/preview`);
    return response.data;
  },

  async executeDeployment(id: string): Promise<void> {
    await api.post(`/api/deployments/${id}/execute`);
  },

  // Patch Tests
  async getPatchTests(): Promise<PatchTest[]> {
    const response = await api.get(`/api/patch-tests`);
    return response.data;
  },

  async getPatchTest(id: string): Promise<PatchTest> {
    const response = await api.get(`/api/patch-tests/${id}`);
    return response.data;
  },

  async createPatchTest(test: Partial<PatchTest>): Promise<PatchTest> {
    const response = await api.post(`/api/patch-tests`, test);
    return response.data;
  },

  async approvePatchTest(id: string): Promise<void> {
    await api.put(`/api/patch-tests/${id}/approve`);
  },

  async deletePatchTest(id: string): Promise<void> {
    await api.delete(`/api/patch-tests/${id}`);
  },

  // Zero Touch
  async getZeroTouchConfigs(): Promise<ZeroTouchConfig[]> {
    const response = await api.get(`/api/zero-touch-configs`);
    return response.data;
  },

  async getZeroTouchConfig(id: string): Promise<ZeroTouchConfig> {
    const response = await api.get(`/api/zero-touch-configs/${id}`);
    return response.data;
  },

  async createZeroTouchConfig(config: Partial<ZeroTouchConfig>): Promise<ZeroTouchConfig> {
    const response = await api.post(`/api/zero-touch-configs`, config);
    return response.data;
  },

  async updateZeroTouchConfig(id: string, config: Partial<ZeroTouchConfig>): Promise<ZeroTouchConfig> {
    const response = await api.put(`/api/zero-touch-configs/${id}`, config);
    return response.data;
  },

  async deleteZeroTouchConfig(id: string): Promise<void> {
    await api.delete(`/api/zero-touch-configs/${id}`);
  },
};
