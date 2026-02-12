import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError, typedQuery } from '@shared/utils';
import {
  queueDownloadJob,
  queueBulkDownloadJobs,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  DownloadJobData,
} from './download.worker';
import { patchRepositoryService } from './patch-repository.service';
import {
  CreatePatchSourceDto,
  UpdatePatchSourceDto,
  CreateDownloadJobDto,
  BulkDownloadRequest,
  AgentPatchDownloadRequest,
  DownloadJobStatus,
} from './patch-repository.types';
import type {
  ListPatchSourcesQuery,
  ListDownloadJobsQuery,
  CleanQueueQuery,
  StartPendingQuery,
} from './patch-repository.validators';

// ============================================
// Patch Source Controllers
// ============================================

export async function createPatchSource(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data: CreatePatchSourceDto = req.body;
    const source = await patchRepositoryService.createPatchSource(data);

    sendSuccess(res, source, 201);
  } catch (error) {
    next(error);
  }
}

export async function updatePatchSource(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const data: UpdatePatchSourceDto = req.body;
    const source = await patchRepositoryService.updatePatchSource(id, data);

    sendSuccess(res, source);
  } catch (error) {
    next(error);
  }
}

export async function deletePatchSource(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    await patchRepositoryService.deletePatchSource(id);

    sendSuccess(res, { message: 'Patch source deleted' });
  } catch (error) {
    next(error);
  }
}

export async function getPatchSource(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const source = await patchRepositoryService.getPatchSource(id);

    sendSuccess(res, source);
  } catch (error) {
    next(error);
  }
}

export async function listPatchSources(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { vendor, category, platform, isEnabled } = typedQuery<ListPatchSourcesQuery>(req);

    const sources = await patchRepositoryService.listPatchSources({
      vendor,
      category,
      platform,
      isEnabled,
    });

    sendSuccess(res, { sources, total: sources.length });
  } catch (error) {
    next(error);
  }
}

export async function togglePatchSource(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { isEnabled } = req.body;
    const source = await patchRepositoryService.togglePatchSource(id, isEnabled);

    sendSuccess(res, source);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Download Job Controllers
// ============================================

export async function createDownloadJob(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data: CreateDownloadJobDto = req.body;
    const startImmediately = req.query.startImmediately === 'true';

    // Create the job in database
    const job = await patchRepositoryService.createDownloadJob(data);

    // Optionally start download immediately
    if (startImmediately) {
      const jobData: DownloadJobData = {
        jobId: job.jobId,
        sourceUrl: job.sourceUrl,
        targetPath: job.targetPath,
        fileName: job.fileName,
        patchId: job.patchId || undefined,
        expectedChecksum: job.expectedChecksum || undefined,
        checksumType: job.checksumType || undefined,
        expectedSize: job.expectedSize ? Number(job.expectedSize) : undefined,
        priority: job.priority,
      };
      await queueDownloadJob(jobData);
    }

    sendSuccess(res, { ...job, queued: startImmediately }, 201);
  } catch (error) {
    next(error);
  }
}

export async function createBulkDownloadJobs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { downloads }: BulkDownloadRequest = req.body;
    const jobs = await patchRepositoryService.createBulkDownloadJobs(downloads);

    sendSuccess(res, { jobs, total: jobs.length }, 201);
  } catch (error) {
    next(error);
  }
}

export async function getDownloadJob(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { jobId } = req.params;
    const job = await patchRepositoryService.getDownloadJob(jobId);

    sendSuccess(res, job);
  } catch (error) {
    next(error);
  }
}

export async function listDownloadJobs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = typedQuery<ListDownloadJobsQuery>(req);

    const result = await patchRepositoryService.listDownloadJobs({
      status: query.status as DownloadJobStatus | undefined,
      sourceId: query.sourceId,
      patchId: query.patchId,
      limit: query.limit,
      offset: query.offset,
    });

    sendSuccess(res, { jobs: result.jobs, total: result.total });
  } catch (error) {
    next(error);
  }
}

export async function retryDownloadJob(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { jobId } = req.params;
    const job = await patchRepositoryService.retryDownloadJob(jobId);

    sendSuccess(res, job);
  } catch (error) {
    next(error);
  }
}

export async function cancelDownloadJob(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { jobId } = req.params;
    const job = await patchRepositoryService.cancelDownloadJob(jobId);

    sendSuccess(res, job);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Patch Download URL Controllers
// ============================================

export async function getPatchDownloadUrl(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { patchId } = req.params;

    const downloadUrl = await patchRepositoryService.getPatchDownloadUrl(
      patchId
    );

    if (!downloadUrl) {
      sendError(res, 404, 'NOT_FOUND', 'Patch file not available for download');
      return;
    }

    sendSuccess(res, downloadUrl);
  } catch (error) {
    next(error);
  }
}

export async function getAgentPatchDownloads(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { agentId, patchIds }: AgentPatchDownloadRequest = req.body;

    const downloads = await patchRepositoryService.getAgentPatchDownloads(
      agentId,
      patchIds
    );

    sendSuccess(res, downloads);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Repository Stats & Sync Controllers
// ============================================

export async function getRepositoryStats(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await patchRepositoryService.getRepositoryStats();

    // Convert BigInt to string for JSON serialization
    sendSuccess(res, {
      ...stats,
      totalSize: stats.totalSize.toString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function triggerSync(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { sourceIds, vendors, platforms, force, dryRun } = req.body;

    const results = await patchRepositoryService.triggerSync({
      sourceIds,
      vendors,
      platforms,
      force,
      dryRun,
    });

    sendSuccess(res, results);
  } catch (error) {
    next(error);
  }
}

export async function getSyncStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { sourceId } = req.params;
    const status = await patchRepositoryService.getSyncStatus(sourceId);

    sendSuccess(res, status);
  } catch (error) {
    next(error);
  }
}

// ============================================
// URL Validation Controller
// ============================================

export async function validateUrl(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { url } = req.body;
    const isWhitelisted = await patchRepositoryService.isUrlWhitelisted(url);

    sendSuccess(res, { url, isWhitelisted });
  } catch (error) {
    next(error);
  }
}

// ============================================
// Queue Management Controllers
// ============================================

export async function getDownloadQueueStats(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await getQueueStats();

    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}

export async function pauseDownloadQueue(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await pauseQueue();

    sendSuccess(res, { message: 'Download queue paused' });
  } catch (error) {
    next(error);
  }
}

export async function resumeDownloadQueue(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await resumeQueue();

    sendSuccess(res, { message: 'Download queue resumed' });
  } catch (error) {
    next(error);
  }
}

export async function cleanDownloadQueue(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { olderThanDays } = typedQuery<CleanQueueQuery>(req);
    const days = olderThanDays ?? 7;
    const olderThanMs = days * 24 * 3600 * 1000;

    await cleanQueue(olderThanMs);

    sendSuccess(res, { message: `Download queue cleaned (jobs older than ${days} days removed)` });
  } catch (error) {
    next(error);
  }
}

export async function startPendingDownloads(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { limit: queryLimit } = typedQuery<StartPendingQuery>(req);
    const maxJobs = queryLimit ?? 50;

    // Get pending jobs from database
    const { jobs } = await patchRepositoryService.listDownloadJobs({
      status: 'PENDING',
      limit: maxJobs,
    });

    if (jobs.length === 0) {
      sendSuccess(res, { message: 'No pending jobs to queue', queued: 0 });
      return;
    }

    // Queue them all
    const jobDataArray: DownloadJobData[] = jobs.map((job) => ({
      jobId: job.jobId,
      sourceUrl: job.sourceUrl,
      targetPath: job.targetPath,
      fileName: job.fileName,
      patchId: job.patchId || undefined,
      expectedChecksum: job.expectedChecksum || undefined,
      checksumType: job.checksumType || undefined,
      expectedSize: job.expectedSize ? Number(job.expectedSize) : undefined,
      priority: job.priority,
    }));

    await queueBulkDownloadJobs(jobDataArray);

    sendSuccess(res, { message: `Queued ${jobs.length} pending download jobs`, queued: jobs.length });
  } catch (error) {
    next(error);
  }
}
