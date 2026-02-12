import type {
  CreatePackageInput,
  PackageResponse as SharedPackageResponse,
} from '@shared/types';

// Re-export shared API types
export type {
  CreatePackageInput,
  UpdatePackageInput,
  PackageListFilters,
  PackageResponse,
  CreateBundleInput,
  BundleResponse,
  GroupedPackageResponse,
  PackageVersionSummary,
  ScriptManifest,
} from '@shared/types';

// PackageDownloadUrl: shared uses string for expiresAt, local uses Date
// Keep local version for internal use
export interface PackageDownloadUrl {
  packageId: string;
  fileName: string;
  presignedUrl: string;
  expiresAt: Date;
  checksum: string | null;
  checksumType: string | null;
}

// BundleDownloadResponse: shared uses string for expiresAt, local uses Date
export interface BundleDownloadResponse {
  packageId: string;
  bundleUrl: string;
  bundleChecksum: string;
  bundleSize: number;
  manifest: PackageManifest;
  expiresAt: Date;
}

// Keep const arrays (runtime values, not types)
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

export const PACKAGE_PLATFORMS = ['windows', 'macos', 'linux', 'cross-platform'] as const;
export type PackagePlatform = typeof PACKAGE_PLATFORMS[number];

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
  'bundle',
] as const;
export type InstallSource = typeof INSTALL_SOURCES[number];

// ============================================
// Internal types (Prisma-specific or hub-only)
// ============================================

/**
 * Manifest file structure inside a package bundle (extends shared ScriptManifest)
 */
export interface PackageManifest {
  id: string;
  name: string;
  displayName: string;
  version: string;
  vendor?: string;
  category?: string;
  platform: 'windows' | 'macos' | 'linux' | 'cross-platform';
  architecture?: string;
  description?: string;
  requiresRoot?: boolean;
  requiresReboot?: boolean;
  files?: Array<{
    name: string;
    checksum: string;
    size: number;
  }>;
  scripts: {
    install?: string;
    update?: string;
    rollback?: string;
    uninstall?: string;
  };
  environment?: Record<string, string>;
  dependencies?: string[];
  conflicts?: string[];
}

export interface CreatePackageWithScriptsInput extends CreatePackageInput {
  scriptInstall?: string;
  scriptUpdate?: string;
  scriptRollback?: string;
  scriptUninstall?: string;
  requiresRoot?: boolean;
}

export interface BundleUploadResult {
  packageId: string;
  bundleObjectKey: string;
  bundleChecksum: string;
  bundleSize: number;
  manifest: PackageManifest;
  scriptsFound: string[];
}

export interface PackageResponseWithBundle extends SharedPackageResponse {
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

export interface ScriptExecutionPayload {
  operationType: 'install' | 'update' | 'rollback' | 'uninstall';
  packageId: string;
  packageName: string;
  version: string;
  bundleUrl?: string;
  bundleChecksum?: string;
  manifest?: PackageManifest;
  script?: string;
  requiresRoot: boolean;
  timeout?: number;
  environment?: Record<string, string>;
}
