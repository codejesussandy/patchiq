/**
 * Patch Download Worker
 *
 * BullMQ worker that processes patch download jobs:
 * 1. Downloads patches from whitelisted vendor URLs
 * 2. Verifies checksums
 * 3. Uploads to MinIO central repository
 * 4. Updates database records
 */

import { Worker, Job, Queue, QueueEvents, ConnectionOptions } from 'bullmq';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
import { prisma } from '../../db/client';
import { minioStorage } from '../../shared/services/minio.service';
import { env } from '../../config/env';

// Queue name for patch downloads
export const DOWNLOAD_QUEUE_NAME = 'patch-downloads';

// Parse Redis URL for BullMQ connection
function parseRedisUrl(url: string): ConnectionOptions {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || process.env.REDIS_HOST || 'localhost',
      port: parseInt(parsed.port, 10) || parseInt(process.env.REDIS_PORT || '3002', 10),
      password: parsed.password || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    // Fallback: use env vars or defaults
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '3002', 10),
      maxRetriesPerRequest: null,
    };
  }
}

// Lazy-load Redis connection to avoid connecting during tests
let _redisConnection: ConnectionOptions | null = null;
function getRedisConnection(): ConnectionOptions {
  if (!_redisConnection) {
    _redisConnection = parseRedisUrl(env.REDIS_URL);
  }
  return _redisConnection;
}

// Job data structure
export interface DownloadJobData {
  jobId: string;           // Database job ID
  sourceUrl: string;       // URL to download from
  targetPath: string;      // MinIO object key
  fileName: string;
  patchId?: string;
  fileDetailId?: string;
  expectedChecksum?: string;
  checksumType?: string;
  expectedSize?: number;
  priority?: number;
}

// Job result structure
export interface DownloadJobResult {
  success: boolean;
  objectKey?: string;
  checksum?: string;
  size?: number;
  error?: string;
}

// Lazy-initialized queue instances (avoid Redis connection during test imports)
let _downloadQueue: Queue<DownloadJobData, DownloadJobResult> | null = null;
let _downloadQueueEvents: QueueEvents | null = null;
let _downloadWorker: Worker<DownloadJobData, DownloadJobResult> | null = null;

function getDownloadQueue(): Queue<DownloadJobData, DownloadJobResult> {
  if (!_downloadQueue) {
    _downloadQueue = new Queue<DownloadJobData, DownloadJobResult>(
      DOWNLOAD_QUEUE_NAME,
      {
        connection: getRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000,    // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
      }
    );
  }
  return _downloadQueue;
}

function getDownloadQueueEvents(): QueueEvents {
  if (!_downloadQueueEvents) {
    _downloadQueueEvents = new QueueEvents(DOWNLOAD_QUEUE_NAME, {
      connection: getRedisConnection(),
    });
  }
  return _downloadQueueEvents;
}

// Export getters for lazy access
export const downloadQueue = { get: getDownloadQueue };
export const downloadQueueEvents = { get: getDownloadQueueEvents };

/**
 * Download a file from URL and return as buffer with checksum
 */
async function downloadFile(
  url: string,
  onProgress?: (downloaded: number, total: number | null) => void
): Promise<{ buffer: Buffer; checksum: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const hash = crypto.createHash('sha256');
    const chunks: Buffer[] = [];
    let downloaded = 0;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'PatchIQ-Agent/1.0',
        'Accept': '*/*',
      },
      timeout: 300000, // 5 minute timeout
    }, (response) => {
      // Handle redirects
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          // Follow redirect
          downloadFile(redirectUrl, onProgress).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const contentLength = response.headers['content-length']
        ? parseInt(response.headers['content-length'], 10)
        : null;
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        hash.update(chunk);
        downloaded += chunk.length;

        if (onProgress) {
          onProgress(downloaded, contentLength);
        }
      });

      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const checksum = hash.digest('hex');
        resolve({ buffer, checksum, contentType });
      });

      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Update job progress in database
 */
async function updateJobProgress(
  jobId: string,
  status: string,
  progress: number,
  downloadedBytes?: bigint,
  error?: string
) {
  try {
    const updateData: Record<string, unknown> = {
      status,
      progress,
      updatedAt: new Date(),
    };

    if (downloadedBytes !== undefined) {
      updateData.downloadedBytes = downloadedBytes;
    }
    if (error) {
      updateData.error = error;
    }
    if (status === 'downloading' && progress === 0) {
      updateData.startedAt = new Date();
    }
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await prisma.patchDownloadJob.update({
      where: { jobId },
      data: updateData,
    });
  } catch (err) {
    console.error(`Failed to update job ${jobId} progress:`, err);
  }
}

/**
 * Process a download job
 */
async function processDownloadJob(job: Job<DownloadJobData, DownloadJobResult>): Promise<DownloadJobResult> {
  const { jobId, sourceUrl, targetPath, fileName, expectedChecksum, checksumType, patchId, fileDetailId } = job.data;

  console.log(`[Download Worker] Processing job ${jobId}: ${fileName}`);
  console.log(`[Download Worker] Source: ${sourceUrl}`);
  console.log(`[Download Worker] Target: ${targetPath}`);

  try {
    // Update status to downloading
    await updateJobProgress(jobId, 'downloading', 0);

    // Download the file
    const { buffer, checksum, contentType } = await downloadFile(
      sourceUrl,
      async (downloaded, total) => {
        const progress = total ? Math.round((downloaded / total) * 100) : 0;
        await updateJobProgress(jobId, 'downloading', progress, BigInt(downloaded));
        await job.updateProgress(progress);
      }
    );

    // Update status to verifying
    await updateJobProgress(jobId, 'verifying', 100, BigInt(buffer.length));

    // Verify checksum if expected
    if (expectedChecksum) {
      const expectedType = checksumType?.toLowerCase() || 'sha256';
      if (expectedType === 'sha256' && checksum !== expectedChecksum.toLowerCase()) {
        throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${checksum}`);
      }
      // For MD5 or other types, we'd need to recalculate
      if (expectedType === 'md5') {
        const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
        if (md5Hash !== expectedChecksum.toLowerCase()) {
          throw new Error(`MD5 checksum mismatch: expected ${expectedChecksum}, got ${md5Hash}`);
        }
      }
    }

    console.log(`[Download Worker] File downloaded: ${buffer.length} bytes, checksum: ${checksum}`);

    // Upload to MinIO
    const uploadResult = await minioStorage.uploadBuffer(targetPath, buffer, {
      contentType,
      metadata: {
        'x-original-url': sourceUrl,
        'x-original-filename': fileName,
        'x-checksum-sha256': checksum,
      },
    });

    console.log(`[Download Worker] Uploaded to MinIO: ${uploadResult.objectKey}`);

    // Update PatchFileDetail if provided
    if (fileDetailId) {
      await prisma.patchFileDetail.update({
        where: { id: fileDetailId },
        data: {
          minioObjectKey: uploadResult.objectKey,
          minioBucket: uploadResult.bucket,
          checksum: uploadResult.checksum,
          checksumType: 'sha256',
          sizeBytes: BigInt(uploadResult.size),
          downloadStatus: 'completed',
          downloadedAt: new Date(),
          downloadError: null,
        },
      });
    }

    // Update job as completed
    await prisma.patchDownloadJob.update({
      where: { jobId },
      data: {
        status: 'completed',
        progress: 100,
        downloadedBytes: BigInt(buffer.length),
        actualChecksum: checksum,
        completedAt: new Date(),
        error: null,
      },
    });

    console.log(`[Download Worker] Job ${jobId} completed successfully`);

    return {
      success: true,
      objectKey: uploadResult.objectKey,
      checksum: uploadResult.checksum,
      size: uploadResult.size,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Download Worker] Job ${jobId} failed:`, errorMessage);

    // Update job as failed
    await prisma.patchDownloadJob.update({
      where: { jobId },
      data: {
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
        retryCount: { increment: 1 },
      },
    });

    // Update PatchFileDetail if provided
    if (fileDetailId) {
      await prisma.patchFileDetail.update({
        where: { id: fileDetailId },
        data: {
          downloadStatus: 'failed',
          downloadError: errorMessage,
          retryCount: { increment: 1 },
        },
      });
    }

    throw error;
  }
}

// Create the worker (lazy-initialized)
function getDownloadWorker(): Worker<DownloadJobData, DownloadJobResult> {
  if (!_downloadWorker) {
    _downloadWorker = new Worker<DownloadJobData, DownloadJobResult>(
      DOWNLOAD_QUEUE_NAME,
      processDownloadJob,
      {
        connection: getRedisConnection(),
        concurrency: 3, // Process up to 3 downloads concurrently
        limiter: {
          max: 10,      // Max 10 jobs
          duration: 60000, // Per minute
        },
      }
    );

    // Worker event handlers
    _downloadWorker.on('completed', (job, result) => {
      console.log(`[Download Worker] Job ${job.id} completed:`, result.objectKey);
    });

    _downloadWorker.on('failed', (job, error) => {
      console.error(`[Download Worker] Job ${job?.id} failed:`, error.message);
    });

    _downloadWorker.on('error', (error) => {
      console.error('[Download Worker] Worker error:', error);
    });
  }
  return _downloadWorker;
}

export const downloadWorker = { get: getDownloadWorker };

// Initialize queue events on first access
function initQueueEvents() {
  const events = getDownloadQueueEvents();
  // Only attach handlers if not already attached
  if (events.listenerCount('completed') === 0) {
    events.on('completed', ({ jobId }) => {
      console.log(`[Download Queue] Job ${jobId} completed`);
    });
    events.on('failed', ({ jobId, failedReason }) => {
      console.log(`[Download Queue] Job ${jobId} failed: ${failedReason}`);
    });
  }
}

/**
 * Add a download job to the queue
 */
export async function queueDownloadJob(data: DownloadJobData): Promise<Job<DownloadJobData, DownloadJobResult, string>> {
  // Update database job status to queued
  await prisma.patchDownloadJob.update({
    where: { jobId: data.jobId },
    data: { status: 'queued' },
  });

  // Initialize queue and events
  const queue = getDownloadQueue();
  initQueueEvents();

  // Add to BullMQ queue
  const job = await queue.add('download', data, {
    priority: data.priority || 50,
    jobId: data.jobId,
  });

  console.log(`[Download Queue] Added job ${data.jobId} to queue`);

  return job;
}

/**
 * Add multiple download jobs to the queue
 */
export async function queueBulkDownloadJobs(jobs: DownloadJobData[]): Promise<void> {
  const bulkJobs = jobs.map((data) => ({
    name: 'download' as const,
    data,
    opts: {
      priority: data.priority || 50,
      jobId: data.jobId,
    },
  }));

  // Update all database jobs to queued
  await prisma.patchDownloadJob.updateMany({
    where: { jobId: { in: jobs.map((j) => j.jobId) } },
    data: { status: 'queued' },
  });

  // Initialize queue and events
  const queue = getDownloadQueue();
  initQueueEvents();

  // Add all to queue
  await queue.addBulk(bulkJobs);

  console.log(`[Download Queue] Added ${jobs.length} jobs to queue`);
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const queue = getDownloadQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Pause the download queue
 */
export async function pauseQueue(): Promise<void> {
  const queue = getDownloadQueue();
  await queue.pause();
  console.log('[Download Queue] Queue paused');
}

/**
 * Resume the download queue
 */
export async function resumeQueue(): Promise<void> {
  const queue = getDownloadQueue();
  await queue.resume();
  console.log('[Download Queue] Queue resumed');
}

/**
 * Clean old jobs from the queue
 */
export async function cleanQueue(olderThanMs: number = 7 * 24 * 3600 * 1000): Promise<void> {
  const queue = getDownloadQueue();
  await Promise.all([
    queue.clean(olderThanMs, 1000, 'completed'),
    queue.clean(olderThanMs, 1000, 'failed'),
  ]);
  console.log('[Download Queue] Queue cleaned');
}

/**
 * Graceful shutdown
 */
export async function shutdownWorker(): Promise<void> {
  console.log('[Download Worker] Shutting down...');
  if (_downloadWorker) {
    await _downloadWorker.close();
  }
  if (_downloadQueue) {
    await _downloadQueue.close();
  }
  if (_downloadQueueEvents) {
    await _downloadQueueEvents.close();
  }
  console.log('[Download Worker] Shutdown complete');
}

/**
 * Start the worker (call this when app starts)
 */
export function startWorker(): void {
  getDownloadWorker();
  initQueueEvents();
  console.log('[Download Worker] Worker started');
}

export default {
  downloadQueue,
  downloadWorker,
  downloadQueueEvents,
  queueDownloadJob,
  queueBulkDownloadJobs,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  shutdownWorker,
  startWorker,
};
