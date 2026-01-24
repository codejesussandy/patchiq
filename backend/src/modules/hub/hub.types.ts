/**
 * Hub Module Types
 * Types for the software package repository (Hub)
 */

export interface CreatePackageInput {
  name: string;
  displayName: string;
  version: string;
  vendor?: string;
  category?: string;
  platform: 'windows' | 'macos' | 'linux' | 'cross-platform';
  architecture?: 'x64' | 'arm64' | 'universal';

  // Installation
  installSource: 'apt' | 'brew' | 'pkg' | 'dmg' | 'deb' | 'rpm' | 'msi' | 'exe' | 'url' | 'snap' | 'flatpak';
  installCommand?: string;
  installArgs?: string;
  silentInstall?: boolean;
  requiresReboot?: boolean;

  // External URL (if not uploading file)
  downloadUrl?: string;

  // Metadata
  description?: string;
  releaseNotes?: string;
  iconUrl?: string;
  tags?: string[];

  // Scripts
  preInstallScript?: string;
  postInstallScript?: string;
  uninstallCommand?: string;

  // Rollback
  supportsRollback?: boolean;
  rollbackCommand?: string;
}

export interface UpdatePackageInput {
  name?: string;
  displayName?: string;
  version?: string;
  vendor?: string;
  category?: string;
  platform?: 'windows' | 'macos' | 'linux' | 'cross-platform';
  architecture?: 'x64' | 'arm64' | 'universal';
  installSource?: string;
  installCommand?: string;
  installArgs?: string;
  silentInstall?: boolean;
  requiresReboot?: boolean;
  downloadUrl?: string;
  description?: string;
  releaseNotes?: string;
  iconUrl?: string;
  tags?: string[];
  preInstallScript?: string;
  postInstallScript?: string;
  uninstallCommand?: string;
  supportsRollback?: boolean;
  rollbackCommand?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface PackageListFilters {
  platform?: string;
  category?: string;
  vendor?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PackageResponse {
  id: string;
  packageId: string;
  name: string;
  displayName: string;
  version: string;
  vendor: string | null;
  category: string | null;
  platform: string;
  architecture: string | null;
  installSource: string;
  silentInstall: boolean;
  requiresReboot: boolean;
  fileName: string | null;
  fileSize: string | null;  // Formatted size
  fileSizeBytes: bigint | null;
  hasFile: boolean;
  downloadUrl: string | null;
  description: string | null;
  tags: string[];
  supportsRollback: boolean;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PackageDownloadUrl {
  packageId: string;
  fileName: string;
  presignedUrl: string;
  expiresAt: Date;
  checksum: string | null;
  checksumType: string | null;
}

export interface CreateBundleInput {
  name: string;
  description?: string;
  platform: string;
  packageIds: string[];
}

export interface BundleResponse {
  id: string;
  bundleId: string;
  name: string;
  description: string | null;
  platform: string;
  packages: Array<{
    id: string;
    packageId: string;
    name: string;
    displayName: string;
    version: string;
    order: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Categories for packages
export const PACKAGE_CATEGORIES = [
  'browser',
  'utility',
  'enterprise',
  'runtime',
  'security',
  'communication',
  'development',
  'media',
  'productivity',
  'system',
  'other',
] as const;

export type PackageCategory = typeof PACKAGE_CATEGORIES[number];

// Platforms
export const PACKAGE_PLATFORMS = ['windows', 'macos', 'linux', 'cross-platform'] as const;
export type PackagePlatform = typeof PACKAGE_PLATFORMS[number];

// Install sources
export const INSTALL_SOURCES = [
  'apt',
  'brew',
  'pkg',
  'dmg',
  'deb',
  'rpm',
  'msi',
  'exe',
  'url',
  'snap',
  'flatpak',
] as const;
export type InstallSource = typeof INSTALL_SOURCES[number];
