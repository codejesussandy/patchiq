import { api } from './api.service';
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
} from '../types/asset.types';
import type { SecurityCompliance } from '../types/security.types';
import type { NetworkConfiguration } from '../types/network.types';
import type { PeripheralInventory } from '../types/peripheral.types';
import type { TelemetryPayload, TelemetryHistory, SystemErrors } from '../types/telemetry.types';

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
} from '../types/asset.types';

// Re-export Phase 4 types
export type { SecurityCompliance } from '../types/security.types';
export type { NetworkConfiguration } from '../types/network.types';
export type { PeripheralInventory } from '../types/peripheral.types';
export type { TelemetryPayload, TelemetryHistory, SystemErrors } from '../types/telemetry.types';

export const assetService = {
  // Assets
  async getAssets(): Promise<Asset[]> {
    const response = await api.get(`/api/assets`);
    return response.data;
  },

  async getAsset(id: string): Promise<Asset> {
    const response = await api.get(`/api/assets/${id}`);
    return response.data;
  },

  async createAsset(data: AddAssetFormData): Promise<Asset> {
    const response = await api.post(`/api/assets`, data);
    return response.data;
  },

  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    const response = await api.put(`/api/assets/${id}`, data);
    return response.data;
  },

  async deleteAsset(id: string): Promise<void> {
    await api.delete(`/api/assets/${id}`);
  },

  async bulkCreateAssets(data: AddAssetFormData[]): Promise<Asset[]> {
    const response = await api.post(`/api/assets/bulk`, data);
    return response.data;
  },

  // Asset Details
  async getAssetLifeCycle(id: string): Promise<AssetLifeCycle> {
    const response = await api.get(`/api/assets/${id}/lifecycle`);
    return response.data;
  },

  async getAssetHardware(id: string): Promise<Hardware> {
    const response = await api.get(`/api/assets/${id}/hardware`);
    return response.data;
  },

  async getAssetSoftware(id: string): Promise<Software> {
    const response = await api.get(`/api/assets/${id}/software`);
    return response.data;
  },

  async getAssetAuditLog(id: string): Promise<AuditLog[]> {
    const response = await api.get(`/api/assets/${id}/audit-log`);
    return response.data;
  },

  // Patch-related methods (NEW)
  async getAssetPatches(id: string): Promise<AssetRelatedPatch[]> {
    const response = await api.get(`/api/assets/${id}/patches`);
    return response.data;
  },

  async getAssetDeployments(id: string): Promise<AssetDeployment[]> {
    const response = await api.get(`/api/assets/${id}/deployments`);
    return response.data;
  },

  async getAssetWithPatchDetails(id: string): Promise<Asset> {
    const response = await api.get(`/api/assets/${id}/full`);
    return response.data;
  },

  // Phase 4: Security endpoint
  async getAssetSecurity(id: string): Promise<SecurityCompliance> {
    const response = await api.get(`/api/assets/${id}/security`);
    return response.data;
  },

  // Phase 4: Network endpoint
  async getAssetNetwork(id: string): Promise<NetworkConfiguration> {
    const response = await api.get(`/api/assets/${id}/network`);
    return response.data;
  },

  // Phase 4: Peripherals endpoint
  async getAssetPeripherals(id: string): Promise<PeripheralInventory> {
    const response = await api.get(`/api/assets/${id}/peripherals`);
    return response.data;
  },

  // Phase 4: Telemetry endpoints
  async getAssetTelemetry(id: string): Promise<TelemetryPayload> {
    const response = await api.get(`/api/assets/${id}/telemetry`);
    return response.data;
  },

  async getAssetTelemetryHistory(id: string, hours: number = 24): Promise<TelemetryHistory> {
    const response = await api.get(`/api/assets/${id}/telemetry/history`, {
      params: { hours },
    });
    return response.data;
  },

  async getAssetErrors(id: string): Promise<SystemErrors> {
    const response = await api.get(`/api/assets/${id}/errors`);
    return response.data;
  },

  // Phase 4: Expanded Hardware endpoint
  async getAssetExpandedHardware(id: string): Promise<ExpandedHardware> {
    const response = await api.get(`/api/assets/${id}/hardware/expanded`);
    return response.data;
  },

  async uploadAssetAttachment(id: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/api/assets/${id}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Software Inventory
  async getSoftwareInventory(): Promise<SoftwareInventory[]> {
    const response = await api.get(`/api/software-inventory`);
    return response.data;
  },

  async getSoftwareInventoryItem(id: string): Promise<SoftwareInventory> {
    const response = await api.get(`/api/software-inventory/${id}`);
    return response.data;
  },

  async importSoftwareInventory(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/api/software-inventory/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Software License
  async getSoftwareLicenses(): Promise<SoftwareLicense[]> {
    const response = await api.get(`/api/software-licenses`);
    return response.data;
  },

  async getSoftwareLicense(id: string): Promise<SoftwareLicense> {
    const response = await api.get(`/api/software-licenses/${id}`);
    return response.data;
  },

  async createSoftwareLicense(data: Partial<SoftwareLicense>): Promise<SoftwareLicense> {
    const response = await api.post(`/api/software-licenses`, data);
    return response.data;
  },

  async updateSoftwareLicense(id: string, data: Partial<SoftwareLicense>): Promise<SoftwareLicense> {
    const response = await api.put(`/api/software-licenses/${id}`, data);
    return response.data;
  },

  async deleteSoftwareLicense(id: string): Promise<void> {
    await api.delete(`/api/software-licenses/${id}`);
  },

  async importSoftwareLicenses(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/api/software-licenses/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // OS License
  async getOSLicenses(): Promise<OSLicense[]> {
    const response = await api.get(`/api/os-licenses`);
    return response.data;
  },

  async getOSLicense(id: string): Promise<OSLicense> {
    const response = await api.get(`/api/os-licenses/${id}`);
    return response.data;
  },

  async createOSLicense(data: Partial<OSLicense>): Promise<OSLicense> {
    const response = await api.post(`/api/os-licenses`, data);
    return response.data;
  },

  async updateOSLicense(id: string, data: Partial<OSLicense>): Promise<OSLicense> {
    const response = await api.put(`/api/os-licenses/${id}`, data);
    return response.data;
  },

  async deleteOSLicense(id: string): Promise<void> {
    await api.delete(`/api/os-licenses/${id}`);
  },

  async importOSLicenses(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/api/os-licenses/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
