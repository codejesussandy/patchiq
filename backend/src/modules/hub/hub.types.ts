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
  requiresRoot: boolean;
  fileName: string | null;
  fileSize: string | null;  // Formatted size
  fileSizeBytes: number | null;
  hasFile: boolean;
  hasBundle: boolean;       // True if this is a script-based bundle
  scriptsIncluded: boolean; // True if scripts are included (bundle or inline)
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
  'bundle', // New: Script-based bundle
] as const;
export type InstallSource = typeof INSTALL_SOURCES[number];

// ============================================
// Script Bundle Types (Hub-Centric Approach)
// ============================================

/**
 * Manifest file structure inside a package bundle
 * This is what the manifest.json inside the bundle looks like
 */
export interface PackageManifest {
  id: string;
  name: string;
  displayName: string;
  version: string;
  vendor?: string;
  category?: string;
  platform: 'windows' | 'macos' | 'linux' | 'cross-platform';
  architecture?: string;  // x64, arm64, universal, or any custom value
  description?: string;
  requiresRoot?: boolean;
  requiresReboot?: boolean;

  // Files included in the bundle
  files?: Array<{
    name: string;
    checksum: string;
    size: number;
  }>;

  // Scripts (relative paths within bundle)
  scripts: {
    install?: string;      // e.g., "scripts/install.sh"
    update?: string;       // e.g., "scripts/update.sh"
    rollback?: string;     // e.g., "scripts/rollback.sh"
    uninstall?: string;    // e.g., "scripts/uninstall.sh"
  };

  // Environment variables to set before script execution
  environment?: Record<string, string>;

  // Dependencies on other packages
  dependencies?: string[];

  // Packages this conflicts with
  conflicts?: string[];
}

/**
 * Input for creating a package with inline scripts (no bundle upload)
 */
export interface CreatePackageWithScriptsInput extends CreatePackageInput {
  // Inline scripts (stored directly in DB)
  scriptInstall?: string;
  scriptUpdate?: string;
  scriptRollback?: string;
  scriptUninstall?: string;
  requiresRoot?: boolean;
}

/**
 * Response for bundle download (includes manifest)
 */
export interface BundleDownloadResponse {
  packageId: string;
  bundleUrl: string;
  bundleChecksum: string;
  bundleSize: number;
  manifest: PackageManifest;
  expiresAt: Date;
}

/**
 * Upload bundle result
 */
export interface BundleUploadResult {
  packageId: string;
  bundleObjectKey: string;
  bundleChecksum: string;
  bundleSize: number;
  manifest: PackageManifest;
  scriptsFound: string[];
}

/**
 * Extended package response with bundle info
 */
export interface PackageResponseWithBundle extends PackageResponse {
  scriptsIncluded: boolean;
  bundleUrl?: string;
  bundleChecksum?: string;
  bundleSize?: number;
  manifest?: PackageManifest;
  scriptInstall?: string;
  scriptUpdate?: string;
  scriptRollback?: string;
  scriptUninstall?: string;
  requiresRoot: boolean;
}

/**
 * Command payload for agent execution (script-based)
 */
export interface ScriptExecutionPayload {
  operationType: 'install' | 'update' | 'rollback' | 'uninstall';
  packageId: string;
  packageName: string;
  version: string;

  // For bundle-based execution
  bundleUrl?: string;
  bundleChecksum?: string;
  manifest?: PackageManifest;

  // For inline script execution (fallback)
  script?: string;

  // Execution options
  requiresRoot: boolean;
  timeout?: number; // seconds
  environment?: Record<string, string>;
}
