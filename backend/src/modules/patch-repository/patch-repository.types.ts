import { PatchSource, PatchDownloadJob, Prisma } from '@prisma/client';

// Re-export shared enum types
export type { PatchSourceCategory, PatchSourceAuthType, DownloadJobStatus } from '@shared/types';

// Re-export shared API types
export type {
  AgentPatchDownloadRequest,
  SyncOptions as SharedSyncOptions,
  SyncResult,
} from '@shared/types';

// Keep internal type aliases used across this module
export type PatchSourcePlatform = 'WINDOWS' | 'MACOS' | 'LINUX' | 'CROSS_PLATFORM';
export type AuthType = 'BASIC' | 'BEARER' | 'API_KEY';

// ============================================
// Internal Prisma-specific types (use bigint, Date, Prisma.InputJsonValue)
// ============================================

export interface CreatePatchSourceDto {
  name: string;
  vendor: string;
  category: import('@shared/types').PatchSourceCategory;
  platform?: PatchSourcePlatform;
  baseUrl: string;
  urlPatterns?: string[];
  priority?: number;
  isEnabled?: boolean;
  requiresAuth?: boolean;
  authType?: AuthType;
  authConfig?: Prisma.InputJsonValue;
  syncSchedule?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdatePatchSourceDto {
  name?: string;
  category?: import('@shared/types').PatchSourceCategory;
  platform?: PatchSourcePlatform;
  baseUrl?: string;
  urlPatterns?: string[];
  priority?: number;
  isEnabled?: boolean;
  requiresAuth?: boolean;
  authType?: AuthType;
  authConfig?: Prisma.InputJsonValue;
  syncSchedule?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface PatchSourceWithStats extends PatchSource {
  downloadCount?: number;
  lastDownloadAt?: Date | null;
  totalSize?: bigint;
}

export interface CreateDownloadJobDto {
  sourceId?: string;
  patchId?: string;
  sourceUrl: string;
  targetPath: string;
  fileName: string;
  expectedSize?: bigint;
  expectedChecksum?: string;
  checksumType?: string;
  priority?: number;
  maxRetries?: number;
}

export interface DownloadJobProgress {
  jobId: string;
  status: import('@shared/types').DownloadJobStatus;
  progress: number;
  downloadedBytes: bigint | null;
  totalBytes: bigint | null;
  error?: string;
}

export interface BulkDownloadRequest {
  downloads: CreateDownloadJobDto[];
  priority?: number;
}

export interface DownloadPatchRequest {
  patchId: string;
}

export interface PatchDownloadUrl {
  patchId: string;
  fileName: string;
  presignedUrl: string;
  expiresAt: Date;
  size: bigint | null;
  checksum: string | null;
}

export interface WhitelistDomain {
  domain: string;
  patterns: string[];
  notes?: string;
}

export interface WhitelistVendor {
  vendor: string;
  category: import('@shared/types').PatchSourceCategory;
  platform?: PatchSourcePlatform;
  domains: WhitelistDomain[];
}

export interface RepositoryStats {
  totalPatches: number;
  totalSize: bigint;
  patchesByPlatform: Record<string, number>;
  patchesByVendor: Record<string, number>;
  downloadsPending: number;
  downloadsInProgress: number;
  downloadsFailed: number;
  lastSyncAt: Date | null;
}

export interface SyncOptions {
  sourceIds?: string[];
  vendors?: string[];
  platforms?: PatchSourcePlatform[];
  force?: boolean;
  dryRun?: boolean;
}

export interface AgentPatchDownloadResponse {
  patchId: string;
  fileName: string;
  downloadUrl: string;
  checksum: string;
  checksumType: string;
  size: bigint;
  expiresAt: Date;
}
