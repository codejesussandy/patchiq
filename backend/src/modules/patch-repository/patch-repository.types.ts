import { PatchSource, PatchDownloadJob, PatchFileDetail, Prisma } from '@prisma/client';

// ============================================
// Patch Source Types
// ============================================

export type PatchSourceCategory =
  | 'os'
  | 'firmware'
  | 'enterprise'
  | 'runtime'
  | 'security'
  | 'browser'
  | 'utility';

export type PatchSourcePlatform = 'windows' | 'macos' | 'linux' | 'cross-platform';

export type AuthType = 'basic' | 'bearer' | 'api_key';

export interface CreatePatchSourceDto {
  name: string;
  vendor: string;
  category: PatchSourceCategory;
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
  category?: PatchSourceCategory;
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

// ============================================
// Patch Download Job Types
// ============================================

export type DownloadJobStatus =
  | 'pending'
  | 'queued'
  | 'downloading'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

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
  status: DownloadJobStatus;
  progress: number;
  downloadedBytes: bigint | null;
  totalBytes: bigint | null;
  error?: string;
}

export interface BulkDownloadRequest {
  downloads: CreateDownloadJobDto[];
  priority?: number;
}

// ============================================
// Patch File Detail Types (with MinIO)
// ============================================

export interface PatchFileWithMinioInfo extends PatchFileDetail {
  presignedUrl?: string;
  isAvailable: boolean;
}

export interface DownloadPatchRequest {
  patchId: string;
  fileDetailId?: string;
}

export interface PatchDownloadUrl {
  patchId: string;
  fileDetailId: string;
  fileName: string;
  presignedUrl: string;
  expiresAt: Date;
  size: bigint | null;
  checksum: string | null;
}

// ============================================
// Whitelist Configuration
// ============================================

export interface WhitelistDomain {
  domain: string;
  patterns: string[];
  notes?: string;
}

export interface WhitelistVendor {
  vendor: string;
  category: PatchSourceCategory;
  platform?: PatchSourcePlatform;
  domains: WhitelistDomain[];
}

// ============================================
// Repository Statistics
// ============================================

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

// ============================================
// Sync Configuration
// ============================================

export interface SyncOptions {
  sourceIds?: string[];
  vendors?: string[];
  platforms?: PatchSourcePlatform[];
  force?: boolean;
  dryRun?: boolean;
}

export interface SyncResult {
  sourceId: string;
  vendor: string;
  status: 'success' | 'partial' | 'failed';
  patchesFound: number;
  patchesDownloaded: number;
  patchesFailed: number;
  errors: string[];
  duration: number;
}

// ============================================
// Agent Download Types
// ============================================

export interface AgentPatchDownloadRequest {
  agentId: string;
  patchIds: string[];
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
