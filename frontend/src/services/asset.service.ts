import type {
  Asset,
  AssetLifeCycle,
  Hardware,
  Software,
  AuditLog,
  SoftwareInventory,
  SoftwareLicense,
  OSLicense,
  AddAssetFormData,
  AssetRelatedPatch,
  AssetDeployment,
  ExpandedHardware,
  PatchSummary,
} from '../types/asset.types';
import type { NetworkConfiguration } from '../types/network.types';
import type { PeripheralInventory } from '../types/peripheral.types';
import type { SecurityCompliance } from '../types/security.types';
import type { TelemetryPayload, TelemetryHistory, SystemErrors } from '../types/telemetry.types';
import { api } from './api.service';

// Re-export types for convenience
export type {
  Asset,
  AssetLifeCycle,
  Hardware,
  Software,
  AuditLog,
  SoftwareInventory,
  SoftwareLicense,
  OSLicense,
  AddAssetFormData,
  AssetRelatedPatch,
  AssetDeployment,
  ExpandedHardware,
  PatchSummary,
} from '../types/asset.types';

// Re-export Phase 4 types
export type { SecurityCompliance } from '../types/security.types';
export type { NetworkConfiguration } from '../types/network.types';
export type { PeripheralInventory } from '../types/peripheral.types';
export type { TelemetryPayload, TelemetryHistory, SystemErrors } from '../types/telemetry.types';

export interface AssetCategory {
  id: string;
  name: string;
  color?: string;
  description?: string;
  subCategories: AssetSubCategory[];
}

export interface AssetSubCategory {
  id: string;
  name: string;
  criticality?: string;
  description?: string;
}

export const assetService = {
  // Categories
  async getCategories(): Promise<AssetCategory[]> {
    const response = await api.get(`/categories`);
    return response.data;
  },

  // Assets
  async getAssets(): Promise<Asset[]> {
    const response = await api.get(`/assets`);
    // Paginated response: interceptor returns { data: T[], ...meta }
    return response.data.data || [];
  },

  async getAssetsPaginated(params?: {
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
    search?: string;
    status?: string;
    operationalStatus?: string;
    categoryId?: string;
    subCategoryId?: string;
    os?: string;
  }): Promise<{ data: Asset[]; total: number; page: number; limit: number; totalPages: number }> {
    const response = await api.get(`/assets`, { params });
    // Interceptor unwraps envelope: { success, data: PaginatedResult } → PaginatedResult
    const result = response.data;
    return {
      data: result.data || [],
      total: result.total || 0,
      page: result.page || 1,
      limit: result.limit || 20,
      totalPages: result.totalPages || 1,
    };
  },

  async getAsset(id: string): Promise<Asset> {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },

  async createAsset(data: AddAssetFormData): Promise<Asset> {
    const response = await api.post(`/assets`, data);
    return response.data;
  },

  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    const response = await api.put(`/assets/${id}`, data);
    return response.data;
  },

  async deleteAsset(id: string): Promise<void> {
    await api.delete(`/assets/${id}`);
  },

  async bulkCreateAssets(data: AddAssetFormData[]): Promise<Asset[]> {
    const response = await api.post(`/assets/bulk`, data);
    return response.data;
  },

  // Asset Details
  async getAssetLifeCycle(id: string, method?: string): Promise<AssetLifeCycle> {
    const params = method ? { method } : {};
    const response = await api.get(`/assets/${id}/lifecycle`, { params });
    return response.data;
  },

  async getAssetHardware(id: string): Promise<Hardware> {
    const response = await api.get(`/assets/${id}/hardware`);
    return response.data;
  },

  async getAssetSoftware(id: string): Promise<Software> {
    const response = await api.get(`/assets/${id}/software`);
    return response.data;
  },

  async getAssetAuditLog(id: string): Promise<AuditLog[]> {
    const response = await api.get(`/assets/${id}/audit-log`);
    return response.data;
  },

  // Patch-related methods (NEW)
  async getAssetPatches(id: string): Promise<{ data: AssetRelatedPatch[]; summary: PatchSummary | null }> {
    const response = await api.get(`/assets/${id}/patches`);
    const body = response.data;
    if (Array.isArray(body)) {
      return { data: body, summary: null };
    }
    return { data: body.data ?? [], summary: body.summary ?? null };
  },

  async getAssetDeployments(id: string): Promise<AssetDeployment[]> {
    const response = await api.get(`/assets/${id}/deployments`);
    const body = response.data;
    return Array.isArray(body) ? body : body.data ?? [];
  },

  async getAssetVulnerabilities(id: string): Promise<{
    data: Array<{
      id: string;
      cveId: string;
      title: string;
      description: string;
      severity: string;
      cvssScore: number;
      epss: number;
      exploitable: boolean;
      riskScore: number;
      status: string;
      detectedAt: string;
      resolvedAt: string | null;
      publishedDate: string | null;
      affectedSoftwareCount: number;
    }>;
    summary: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      open: number;
      resolved: number;
    };
  }> {
    const response = await api.get(`/assets/${id}/vulnerabilities`);
    return response.data;
  },

  async getAssetAlerts(id: string): Promise<{
    data: Array<{
      id: string;
      alert: string;
      severity: string;
      module: string;
      attribute: string;
      value: string;
      message: string;
      status: string;
      createdOn: string;
      resolvedAt: string | null;
    }>;
    summary: {
      total: number;
      critical: number;
      warning: number;
      info: number;
      clear: number;
      open: number;
      resolved: number;
    };
  }> {
    const response = await api.get(`/assets/${id}/alerts`);
    return response.data;
  },

  async getAssetWithPatchDetails(id: string): Promise<Asset> {
    const response = await api.get(`/assets/${id}/full`);
    return response.data;
  },

  // Phase 4: Security endpoint
  async getAssetSecurity(id: string): Promise<SecurityCompliance> {
    const response = await api.get(`/assets/${id}/security`);
    return response.data;
  },

  // Phase 4: Network endpoint
  async getAssetNetwork(id: string): Promise<NetworkConfiguration> {
    const response = await api.get(`/assets/${id}/network`);
    return response.data;
  },

  // Phase 4: Peripherals endpoint
  async getAssetPeripherals(id: string): Promise<PeripheralInventory> {
    const response = await api.get(`/assets/${id}/peripherals`);
    return response.data;
  },

  // Phase 4: Telemetry endpoints
  async getAssetTelemetry(id: string): Promise<TelemetryPayload> {
    const response = await api.get(`/assets/${id}/telemetry`);
    return response.data;
  },

  async getAssetTelemetryHistory(id: string, hours: number = 24): Promise<TelemetryHistory> {
    const response = await api.get(`/assets/${id}/telemetry/history`, {
      params: { hours },
    });
    return response.data;
  },

  async getAssetErrors(id: string): Promise<SystemErrors> {
    const response = await api.get(`/assets/${id}/errors`);
    return response.data;
  },

  // Phase 4: Expanded Hardware endpoint
  async getAssetExpandedHardware(id: string): Promise<ExpandedHardware> {
    const response = await api.get(`/assets/${id}/hardware/expanded`);
    return response.data;
  },

  async uploadAssetAttachment(id: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/assets/${id}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Force refresh inventory from agent
  async refreshAssetInventory(id: string): Promise<{ message: string; commandId: string; status: string }> {
    const response = await api.post(`/assets/${id}/refresh`);
    return response.data;
  },

  // Software Inventory
  async getSoftwareInventory(): Promise<SoftwareInventory[]> {
    const response = await api.get(`/software-inventory`);
    return response.data;
  },

  async getSoftwareInventoryItem(id: string): Promise<SoftwareInventory> {
    const response = await api.get(`/software-inventory/${id}`);
    return response.data;
  },

  async importSoftwareInventory(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/software-inventory/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Software License
  async getSoftwareLicenses(): Promise<SoftwareLicense[]> {
    const response = await api.get(`/software-licenses`);
    return response.data;
  },

  async getSoftwareLicense(id: string): Promise<SoftwareLicense> {
    const response = await api.get(`/software-licenses/${id}`);
    return response.data;
  },

  async createSoftwareLicense(data: Partial<SoftwareLicense>): Promise<SoftwareLicense> {
    const response = await api.post(`/software-licenses`, data);
    return response.data;
  },

  async updateSoftwareLicense(id: string, data: Partial<SoftwareLicense>): Promise<SoftwareLicense> {
    const response = await api.put(`/software-licenses/${id}`, data);
    return response.data;
  },

  async deleteSoftwareLicense(id: string): Promise<void> {
    await api.delete(`/software-licenses/${id}`);
  },

  async importSoftwareLicenses(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/software-licenses/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // OS License
  async getOSLicenses(): Promise<OSLicense[]> {
    const response = await api.get(`/os-licenses`);
    return response.data;
  },

  async getOSLicense(id: string): Promise<OSLicense> {
    const response = await api.get(`/os-licenses/${id}`);
    return response.data;
  },

  async createOSLicense(data: Partial<OSLicense>): Promise<OSLicense> {
    const response = await api.post(`/os-licenses`, data);
    return response.data;
  },

  async updateOSLicense(id: string, data: Partial<OSLicense>): Promise<OSLicense> {
    const response = await api.put(`/os-licenses/${id}`, data);
    return response.data;
  },

  async deleteOSLicense(id: string): Promise<void> {
    await api.delete(`/os-licenses/${id}`);
  },

  async importOSLicenses(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/os-licenses/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
