import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../db/client';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import {
  minioStorage,
  BUCKET_PREFIXES,
  BucketPrefix,
} from '../../shared/services/minio.service';
import {
  CreatePatchSourceDto,
  UpdatePatchSourceDto,
  CreateDownloadJobDto,
  DownloadJobStatus,
  RepositoryStats,
  PatchDownloadUrl,
  AgentPatchDownloadResponse,
  SyncOptions,
  SyncResult,
  PatchSourceWithStats,
} from './patch-repository.types';

class PatchRepositoryService {
  // ============================================
  // Patch Source Management
  // ============================================

  async createPatchSource(data: CreatePatchSourceDto) {
    return prisma.patchSource.create({
      data: {
        ...data,
        urlPatterns: data.urlPatterns || [],
        priority: data.priority || 50,
        isEnabled: data.isEnabled ?? true,
        requiresAuth: data.requiresAuth || false,
      },
    });
  }

  async updatePatchSource(id: string, data: UpdatePatchSourceDto) {
    const existing = await prisma.patchSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Patch source not found');
    }

    return prisma.patchSource.update({
      where: { id },
      data,
    });
  }

  async deletePatchSource(id: string) {
    const existing = await prisma.patchSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Patch source not found');
    }

    return prisma.patchSource.delete({ where: { id } });
  }

  async getPatchSource(id: string) {
    const source = await prisma.patchSource.findUnique({
      where: { id },
      include: {
        downloadJobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!source) {
      throw new NotFoundError('Patch source not found');
    }

    return source;
  }

  async listPatchSources(filters?: {
    vendor?: string;
    category?: string;
    platform?: string;
    isEnabled?: boolean;
  }): Promise<PatchSourceWithStats[]> {
    const where: Record<string, unknown> = {};

    if (filters?.vendor) where.vendor = filters.vendor;
    if (filters?.category) where.category = filters.category;
    if (filters?.platform) where.platform = filters.platform;
    if (filters?.isEnabled !== undefined) where.isEnabled = filters.isEnabled;

    const sources = await prisma.patchSource.findMany({
      where,
      orderBy: [{ vendor: 'asc' }, { name: 'asc' }],
    });

    // Add stats for each source
    const sourcesWithStats = await Promise.all(
      sources.map(async (source) => {
        const stats = await prisma.patchDownloadJob.aggregate({
          where: { sourceId: source.id, status: 'COMPLETED' },
          _count: true,
          _max: { completedAt: true },
          _sum: { downloadedBytes: true },
        });

        return {
          ...source,
          downloadCount: stats._count,
          lastDownloadAt: stats._max.completedAt,
          totalSize: stats._sum.downloadedBytes,
        } as PatchSourceWithStats;
      })
    );

    return sourcesWithStats;
  }

  async togglePatchSource(id: string, isEnabled: boolean) {
    return prisma.patchSource.update({
      where: { id },
      data: { isEnabled },
    });
  }

  // ============================================
  // Download Job Management
  // ============================================

  async createDownloadJob(data: CreateDownloadJobDto) {
    const jobId = `dl-${uuidv4()}`;

    return prisma.patchDownloadJob.create({
      data: {
        jobId,
        sourceId: data.sourceId,
        patchId: data.patchId,
        sourceUrl: data.sourceUrl,
        targetPath: data.targetPath,
        fileName: data.fileName,
        expectedSize: data.expectedSize,
        expectedChecksum: data.expectedChecksum,
        checksumType: data.checksumType || 'sha256',
        priority: data.priority || 50,
        maxRetries: data.maxRetries || 3,
        status: 'PENDING',
      },
    });
  }

  async createBulkDownloadJobs(jobs: CreateDownloadJobDto[]) {
    const createdJobs = await Promise.all(
      jobs.map((job) => this.createDownloadJob(job))
    );
    return createdJobs;
  }

  async getDownloadJob(jobId: string) {
    const job = await prisma.patchDownloadJob.findUnique({
      where: { jobId },
      include: {
        source: true,
      },
    });

    if (!job) {
      throw new NotFoundError('Download job not found');
    }

    return job;
  }

  async updateDownloadJobStatus(
    jobId: string,
    status: DownloadJobStatus,
    progress?: number,
    downloadedBytes?: bigint,
    error?: string
  ) {
    const updateData: Record<string, unknown> = { status };

    if (progress !== undefined) updateData.progress = progress;
    if (downloadedBytes !== undefined) updateData.downloadedBytes = downloadedBytes;
    if (error) updateData.error = error;

    if (status === 'DOWNLOADING' && !updateData.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === 'COMPLETED' || status === 'FAILED') {
      updateData.completedAt = new Date();
    }

    return prisma.patchDownloadJob.update({
      where: { jobId },
      data: updateData,
    });
  }

  async listDownloadJobs(filters?: {
    status?: DownloadJobStatus;
    sourceId?: string;
    patchId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.sourceId) where.sourceId = filters.sourceId;
    if (filters?.patchId) where.patchId = filters.patchId;

    const [jobs, total] = await Promise.all([
      prisma.patchDownloadJob.findMany({
        where,
        include: { source: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.patchDownloadJob.count({ where }),
    ]);

    return { jobs, total };
  }

  async retryDownloadJob(jobId: string) {
    const job = await this.getDownloadJob(jobId);

    if (job.status !== 'FAILED') {
      throw new BadRequestError('Only failed jobs can be retried');
    }

    if (job.retryCount >= job.maxRetries) {
      throw new BadRequestError('Maximum retry count exceeded');
    }

    return prisma.patchDownloadJob.update({
      where: { jobId },
      data: {
        status: 'PENDING',
        error: null,
        retryCount: { increment: 1 },
        progress: 0,
        downloadedBytes: null,
        startedAt: null,
        completedAt: null,
      },
    });
  }

  async cancelDownloadJob(jobId: string) {
    const job = await this.getDownloadJob(jobId);

    if (job.status === 'COMPLETED') {
      throw new BadRequestError('Cannot cancel completed jobs');
    }

    return prisma.patchDownloadJob.update({
      where: { jobId },
      data: { status: 'CANCELLED' },
    });
  }

  // ============================================
  // Patch File Management (MinIO Integration)
  // ============================================

  async getPatchDownloadUrl(
    patchId: string
  ): Promise<PatchDownloadUrl | null> {
    const bundle = await prisma.patchBundle.findFirst({
      where: {
        patch: { id: patchId },
        downloadStatus: 'COMPLETED',
        bundleObjectKey: { not: null },
      },
    });

    if (!bundle || !bundle.bundleObjectKey) {
      return null;
    }

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await minioStorage.getPresignedUrl(
      bundle.bundleObjectKey,
      {
        expirySeconds: 3600,
        responseContentDisposition: `attachment; filename="${bundle.fileName || 'patch.bin'}"`,
      },
      bundle.minioBucket || undefined
    );

    return {
      patchId,
      fileName: bundle.fileName || 'patch.bin',
      presignedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      size: bundle.bundleSize,
      checksum: bundle.bundleChecksum,
    };
  }

  async getAgentPatchDownloads(
    agentId: string,
    patchIds: string[]
  ): Promise<AgentPatchDownloadResponse[]> {
    const results: AgentPatchDownloadResponse[] = [];

    for (const patchId of patchIds) {
      const downloadUrl = await this.getPatchDownloadUrl(patchId);
      if (downloadUrl && downloadUrl.checksum) {
        results.push({
          patchId,
          fileName: downloadUrl.fileName,
          downloadUrl: downloadUrl.presignedUrl,
          checksum: downloadUrl.checksum,
          checksumType: 'sha256',
          size: downloadUrl.size || BigInt(0),
          expiresAt: downloadUrl.expiresAt,
        });
      }
    }

    return results;
  }

  async updatePatchBundleMinioInfo(
    bundleId: string,
    minioInfo: {
      bundleObjectKey: string;
      minioBucket: string;
      bundleChecksum: string;
      bundleSize: bigint;
    }
  ) {
    return prisma.patchBundle.update({
      where: { id: bundleId },
      data: {
        ...minioInfo,
        downloadStatus: 'COMPLETED',
        downloadedAt: new Date(),
        downloadError: null,
      },
    });
  }

  async markPatchBundleDownloadFailed(bundleId: string, error: string) {
    return prisma.patchBundle.update({
      where: { id: bundleId },
      data: {
        downloadStatus: 'FAILED',
        downloadError: error,
        retryCount: { increment: 1 },
      },
    });
  }

  // ============================================
  // Repository Statistics
  // ============================================

  async getRepositoryStats(): Promise<RepositoryStats> {
    const [
      totalPatches,
      downloadsPending,
      downloadsInProgress,
      downloadsFailed,
      lastSync,
      platformStats,
      vendorStats,
    ] = await Promise.all([
      prisma.patchBundle.count({
        where: { downloadStatus: 'COMPLETED' },
      }),
      prisma.patchDownloadJob.count({ where: { status: 'PENDING' } }),
      prisma.patchDownloadJob.count({ where: { status: 'DOWNLOADING' } }),
      prisma.patchDownloadJob.count({ where: { status: 'FAILED' } }),
      prisma.patchSource.findFirst({
        where: { lastSyncAt: { not: null } },
        orderBy: { lastSyncAt: 'desc' },
        select: { lastSyncAt: true },
      }),
      prisma.patch.groupBy({
        by: ['platform'],
        _count: true,
      }),
      prisma.patch.groupBy({
        by: ['vendor'],
        _count: true,
      }),
    ]);

    // Get total size from MinIO
    let totalSize = BigInt(0);
    try {
      const stats = await minioStorage.getBucketStats();
      totalSize = BigInt(stats.totalSize);
    } catch {
      // MinIO not available, use DB stats
      const sizeStats = await prisma.patchBundle.aggregate({
        where: { downloadStatus: 'COMPLETED' },
        _sum: { bundleSize: true },
      });
      totalSize = sizeStats._sum.bundleSize || BigInt(0);
    }

    const patchesByPlatform: Record<string, number> = {};
    platformStats.forEach((stat) => {
      if (stat.platform) {
        patchesByPlatform[stat.platform] = stat._count;
      }
    });

    const patchesByVendor: Record<string, number> = {};
    vendorStats.forEach((stat) => {
      if (stat.vendor) {
        patchesByVendor[stat.vendor] = stat._count;
      }
    });

    return {
      totalPatches,
      totalSize,
      patchesByPlatform,
      patchesByVendor,
      downloadsPending,
      downloadsInProgress,
      downloadsFailed,
      lastSyncAt: lastSync?.lastSyncAt || null,
    };
  }

  // ============================================
  // Sync Operations
  // ============================================

  async triggerSync(options: SyncOptions = {}): Promise<SyncResult[]> {
    // 1. Find enabled patch sources matching filters
    const where: Record<string, unknown> = { isEnabled: true };

    if (options.sourceIds?.length) {
      where.id = { in: options.sourceIds };
    }
    if (options.vendors?.length) {
      where.vendor = { in: options.vendors };
    }
    if (options.platforms?.length) {
      where.platform = { in: options.platforms };
    }

    const sources = await prisma.patchSource.findMany({ where });

    if (sources.length === 0) {
      return [];
    }

    const results: SyncResult[] = [];

    for (const source of sources) {
      const startTime = Date.now();
      const errors: string[] = [];
      let patchesFound = 0;
      let patchesDownloaded = 0;
      let patchesFailed = 0;

      try {
        // Find patches that belong to this source's vendor/platform and need downloading
        const patchFilter: Record<string, unknown> = {
          vendor: source.vendor,
          downloadStatus: { in: [null, 'PENDING', 'FAILED'] },
        };
        if (source.platform) {
          patchFilter.platform = source.platform;
        }
        // If force, re-download even completed ones
        if (options.force) {
          delete patchFilter.downloadStatus;
        }

        const patches = await prisma.patch.findMany({
          where: patchFilter,
          include: {
            bundle: true,
          },
        });

        patchesFound = patches.length;

        if (options.dryRun) {
          results.push({
            sourceId: source.id,
            vendor: source.vendor,
            status: 'SUCCESS',
            patchesFound,
            patchesDownloaded: 0,
            patchesFailed: 0,
            errors: [],
            duration: Date.now() - startTime,
          });
          continue;
        }

        // 2. Create download jobs and queue them for each patch with a download URL
        for (const patch of patches) {
          if (!patch.downloadUrl) {
            continue;
          }

          try {
            // Create or reuse bundle record for this patch
            let bundle = patch.bundle;

            if (!bundle || bundle.downloadStatus === 'COMPLETED' && !options.force) {
              if (bundle) continue; // Already completed and not forcing re-download
            }

            if (!bundle) {
              bundle = await prisma.patchBundle.create({
                data: {
                  patchId: patch.id,
                  fileName: patch.downloadUrl.split('/').pop() || `${patch.patchId}.bin`,
                  sourceUrl: patch.downloadUrl,
                  downloadStatus: 'PENDING',
                },
              });
            }

            const fileName = bundle.fileName || patch.downloadUrl.split('/').pop() || `${patch.patchId}.bin`;

            // Create a download job record
            const jobId = `dl-${uuidv4()}`;
            const targetPath = this.generateObjectKey(
              patch.platform || 'windows',
              patch.vendor || source.vendor,
              (patch.product || patch.software || 'unknown') as string,
              patch.patchId,
              fileName
            );

            await prisma.patchDownloadJob.create({
              data: {
                jobId,
                sourceId: source.id,
                patchId: patch.id,
                sourceUrl: patch.downloadUrl,
                targetPath,
                fileName,
                expectedSize: patch.size ? BigInt(patch.size) : null,
                checksumType: 'sha256',
                priority: source.priority,
                maxRetries: 3,
                status: 'PENDING',
              },
            });

            // Queue the job via BullMQ
            const { queueDownloadJob } = await import('./download.worker');
            await queueDownloadJob({
              jobId,
              sourceUrl: patch.downloadUrl,
              targetPath,
              fileName,
              patchId: patch.id,
              expectedChecksum: bundle.fileChecksum || undefined,
              checksumType: 'sha256',
              priority: source.priority,
            });

            patchesDownloaded++;
          } catch (err) {
            patchesFailed++;
            errors.push(`Patch ${patch.patchId}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        // 3. Update source sync status
        await prisma.patchSource.update({
          where: { id: source.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: patchesFailed === 0 ? 'SUCCESS' : patchesFailed < patchesFound ? 'PARTIAL' : 'FAILED',
            lastSyncError: errors.length > 0 ? errors.join('; ') : null,
          },
        });

        results.push({
          sourceId: source.id,
          vendor: source.vendor,
          status: patchesFailed === 0 ? 'SUCCESS' : patchesFailed < patchesFound ? 'PARTIAL' : 'FAILED',
          patchesFound,
          patchesDownloaded,
          patchesFailed,
          errors,
          duration: Date.now() - startTime,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(errorMsg);

        await prisma.patchSource.update({
          where: { id: source.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'FAILED',
            lastSyncError: errorMsg,
          },
        });

        results.push({
          sourceId: source.id,
          vendor: source.vendor,
          status: 'FAILED',
          patchesFound,
          patchesDownloaded,
          patchesFailed,
          errors,
          duration: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  async getSyncStatus(sourceId: string) {
    return prisma.patchSource.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        name: true,
        vendor: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
      },
    });
  }

  // ============================================
  // URL Validation (Whitelist Check)
  // ============================================

  async isUrlWhitelisted(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Get all enabled sources
      const sources = await prisma.patchSource.findMany({
        where: { isEnabled: true },
        select: { baseUrl: true, urlPatterns: true },
      });

      for (const source of sources) {
        // Check base URL
        const baseUrlObj = new URL(source.baseUrl);
        if (hostname === baseUrlObj.hostname.toLowerCase()) {
          return true;
        }

        // Check patterns (simple glob matching)
        for (const pattern of source.urlPatterns) {
          if (this.matchesPattern(hostname, pattern)) {
            return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  private matchesPattern(hostname: string, pattern: string): boolean {
    // Convert glob pattern to regex
    // *.domain.com -> matches any subdomain of domain.com
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(hostname);
  }

  // ============================================
  // Helper: Generate MinIO Object Key
  // ============================================

  generateObjectKey(
    platform: string,
    vendor: string,
    product: string,
    version: string,
    fileName: string
  ): string {
    const platformPrefix = (BUCKET_PREFIXES[
      platform.toUpperCase() as keyof typeof BUCKET_PREFIXES
    ] || 'utility') as BucketPrefix;

    return minioStorage.generateObjectKey(
      platformPrefix,
      vendor,
      product,
      version,
      fileName
    );
  }
}

export const patchRepositoryService = new PatchRepositoryService();
