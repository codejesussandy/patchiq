/**
 * Hub (Software Package Repository) Types
 */

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
  fileName: string | null;
  fileSize: string | null;
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

export interface CreatePackageInput {
  name: string;
  displayName: string;
  version: string;
  platform: string;
  installSource: string;
  vendor?: string;
  category?: string;
  architecture?: string;
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
}

export interface UpdatePackageInput extends Partial<CreatePackageInput> {
  isActive?: boolean;
  isVerified?: boolean;
}

export interface PackageListFilters {
  page?: number;
  limit?: number;
  search?: string;
  platform?: string;
  category?: string;
  vendor?: string;
  isActive?: boolean;
}

export interface PackageListResponse {
  data: SoftwarePackage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PackageDownloadUrl {
  packageId: string;
  fileName: string;
  presignedUrl: string;
  expiresAt: string;
  checksum: string | null;
  checksumType: string | null;
}

export interface HubBundle {
  id: string;
  bundleId: string;
  name: string;
  description: string | null;
  platform: string;
  packages: {
    id: string;
    packageId: string;
    name: string;
    displayName: string;
    version: string;
    order: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBundleInput {
  name: string;
  description?: string;
  platform: string;
  packageIds: string[];
}

export interface HubStats {
  totalPackages: number;
  activePackages: number;
  totalSize: string;
  byPlatform: Record<string, number>;
  byCategory: Record<string, number>;
  totalBundles: number;
}

// Platform options
export const PLATFORM_OPTIONS = [
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
  { value: 'cross-platform', label: 'Cross-Platform' },
];

// Install source options
export const INSTALL_SOURCE_OPTIONS = [
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

// Category options
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

// Architecture options
export const ARCHITECTURE_OPTIONS = [
  { value: 'x64', label: 'x64 (64-bit)' },
  { value: 'x86', label: 'x86 (32-bit)' },
  { value: 'arm64', label: 'ARM64' },
  { value: 'universal', label: 'Universal' },
];
