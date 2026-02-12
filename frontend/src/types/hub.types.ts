/**
 * Hub (Software Package Repository) Types
 */

// Re-export shared API types
export type {
  CreatePackageInput,
  UpdatePackageInput,
  PackageListFilters,
  PackageResponse,
  PackageDownloadUrl,
  CreateBundleInput,
  BundleResponse,
  GroupedPackageResponse,
  PackageVersionSummary,
  ScriptManifest,
  BundleDownloadResponse,
} from '@shared/types';

// UI-specific SoftwarePackage type (uses bigint for fileSizeBytes, differs from shared PackageResponse)
export interface SoftwarePackage {
  id: string;
  packageId: string;
  name: string;
  displayName: string;
  version: string;
  vendor: string | null;
  category: string | null;
  platform: 'windows' | 'macos' | 'linux' | 'cross-platform';
  architecture: string | null;
  installSource: string;
  silentInstall: boolean;
  requiresReboot: boolean;
  requiresRoot: boolean;
  fileName: string | null;
  fileSize: string | null;
  fileSizeBytes: bigint | null;
  hasFile: boolean;
  hasBundle: boolean;
  scriptsIncluded: boolean;
  downloadUrl: string | null;
  description: string | null;
  tags: string[];
  supportsRollback: boolean;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// UI-specific bundle type (alias for shared BundleResponse)
export type HubBundle = import('@shared/types').BundleResponse;

// UI-specific list responses
export interface PackageListResponse {
  data: SoftwarePackage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GroupedPackageListResponse {
  data: import('@shared/types').GroupedPackageResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// UI-specific stats type
export interface HubStats {
  totalPackages: number;
  totalApplications: number;
  activePackages: number;
  totalSize: string;
  byPlatform: Record<string, number>;
  byCategory: Record<string, number>;
  totalBundles: number;
}

// UI-specific bundle upload result
export interface BundleUploadResult {
  packageId: string;
  bundleObjectKey: string;
  bundleChecksum: string;
  bundleSize: number;
  manifest: import('@shared/types').ScriptManifest;
  scriptsFound: string[];
}

// Platform options (UI display)
export const PLATFORM_OPTIONS = [
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
  { value: 'cross-platform', label: 'Cross-Platform' },
];

// Install source options (UI display)
export const INSTALL_SOURCE_OPTIONS = [
  { value: 'bundle', label: 'Script Bundle (Recommended)' },
  { value: 'apt', label: 'APT (Debian/Ubuntu)' },
  { value: 'brew', label: 'Homebrew (macOS)' },
  { value: 'pkg', label: 'PKG (macOS)' },
  { value: 'dmg', label: 'DMG (macOS)' },
  { value: 'deb', label: 'DEB Package' },
  { value: 'rpm', label: 'RPM Package' },
  { value: 'msi', label: 'MSI (Windows)' },
  { value: 'exe', label: 'EXE (Windows)' },
  { value: 'url', label: 'Direct URL' },
  { value: 'snap', label: 'Snap' },
  { value: 'flatpak', label: 'Flatpak' },
];

// Category options (UI display)
export const CATEGORY_OPTIONS = [
  { value: 'browser', label: 'Browser' },
  { value: 'utility', label: 'Utility' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'runtime', label: 'Runtime' },
  { value: 'security', label: 'Security' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'development', label: 'Development' },
  { value: 'communication', label: 'Communication' },
  { value: 'media', label: 'Media' },
  { value: 'other', label: 'Other' },
];

// Architecture options (UI display)
export const ARCHITECTURE_OPTIONS = [
  { value: 'x64', label: 'x64 (64-bit)' },
  { value: 'x86', label: 'x86 (32-bit)' },
  { value: 'arm64', label: 'ARM64' },
  { value: 'universal', label: 'Universal' },
];
