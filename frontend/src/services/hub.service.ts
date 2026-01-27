/**
 * Hub Service
 * API client for software package repository (Hub)
 */

import { api } from './api.service';
import type {
  SoftwarePackage,
  CreatePackageInput,
  UpdatePackageInput,
  PackageListFilters,
  PackageListResponse,
  PackageDownloadUrl,
  HubBundle,
  CreateBundleInput,
  HubStats,
  BundleUploadResult,
} from '../types/hub.types';

export const hubService = {
  // ============================================
  // Hub Statistics
  // ============================================

  async getStats(): Promise<HubStats> {
    const response = await api.get('/hub/stats');
    return response.data.data;
  },

  // ============================================
  // Package Operations
  // ============================================

  async listPackages(filters?: PackageListFilters): Promise<PackageListResponse> {
    const response = await api.get('/hub/packages', { params: filters });
    return response.data;
  },

  async getPackage(packageId: string): Promise<SoftwarePackage> {
    const response = await api.get(`/hub/packages/${packageId}`);
    return response.data;
  },

  async createPackage(data: CreatePackageInput): Promise<SoftwarePackage> {
    const response = await api.post('/hub/packages', data);
    return response.data;
  },

  async updatePackage(packageId: string, data: UpdatePackageInput): Promise<SoftwarePackage> {
    const response = await api.put(`/hub/packages/${packageId}`, data);
    return response.data;
  },

  async deletePackage(packageId: string): Promise<void> {
    await api.delete(`/hub/packages/${packageId}`);
  },

  async uploadPackageFile(packageId: string, file: File): Promise<{ objectKey: string; checksum: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/hub/packages/${packageId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getDownloadUrl(packageId: string): Promise<PackageDownloadUrl> {
    const response = await api.get(`/hub/packages/${packageId}/download-url`);
    return response.data;
  },

  // ============================================
  // Script Bundle Operations (Hub-Centric)
  // ============================================

  /**
   * Upload a package bundle (.tar.gz containing scripts and manifest)
   * This creates a new package automatically based on the manifest
   */
  async uploadPackageBundle(file: File): Promise<BundleUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/hub/packages/upload-bundle', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Get bundle download info for a package (includes manifest and presigned URL)
   */
  async getBundleDownloadInfo(packageId: string): Promise<{
    packageId: string;
    bundleUrl: string;
    bundleChecksum: string;
    bundleSize: number;
    expiresAt: string;
  }> {
    const response = await api.get(`/hub/packages/${packageId}/bundle`);
    return response.data.data;
  },

  // ============================================
  // Package Group (Bundle) Operations
  // ============================================

  async listBundles(platform?: string): Promise<HubBundle[]> {
    const response = await api.get('/hub/bundles', { params: platform ? { platform } : undefined });
    return response.data.data || response.data;
  },

  async getBundle(bundleId: string): Promise<HubBundle> {
    const response = await api.get(`/hub/bundles/${bundleId}`);
    return response.data;
  },

  async createBundle(data: CreateBundleInput): Promise<HubBundle> {
    const response = await api.post('/hub/bundles', data);
    return response.data;
  },

  async deleteBundle(bundleId: string): Promise<void> {
    await api.delete(`/hub/bundles/${bundleId}`);
  },
};
