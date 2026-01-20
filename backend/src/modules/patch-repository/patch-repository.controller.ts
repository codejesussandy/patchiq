import { Request, Response, NextFunction } from 'express';
import { patchRepositoryService } from './patch-repository.service';
import {
  CreatePatchSourceDto,
  UpdatePatchSourceDto,
  CreateDownloadJobDto,
  BulkDownloadRequest,
  AgentPatchDownloadRequest,
} from './patch-repository.types';
import {
  queueDownloadJob,
  queueBulkDownloadJobs,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  DownloadJobData,
} from './download.worker';

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

    res.status(201).json({
      success: true,
      data: source,
    });
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

    res.json({
      success: true,
      data: source,
    });
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

    res.json({
      success: true,
      message: 'Patch source deleted',
    });
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

    res.json({
      success: true,
      data: source,
    });
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
    const { vendor, category, platform, isEnabled } = req.query;

    const sources = await patchRepositoryService.listPatchSources({
      vendor: vendor as string,
      category: category as string,
      platform: platform as string,
      isEnabled: isEnabled === 'true' ? true : isEnabled === 'false' ? false : undefined,
    });

    res.json({
      success: true,
      data: sources,
      total: sources.length,
    });
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

    res.json({
      success: true,
      data: source,
    });
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
    const { startImmediately } = req.query;

    // Create the job in database
    const job = await patchRepositoryService.createDownloadJob(data);

    // Optionally start download immediately
    if (startImmediately === 'true') {
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

    res.status(201).json({
      success: true,
      data: job,
      queued: startImmediately === 'true',
    });
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

    res.status(201).json({
      success: true,
      data: jobs,
      total: jobs.length,
    });
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

    res.json({
      success: true,
      data: job,
    });
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
    const { status, sourceId, patchId, limit, offset } = req.query;

    const result = await patchRepositoryService.listDownloadJobs({
      status: status as string as any,
      sourceId: sourceId as string,
      patchId: patchId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.jobs,
      total: result.total,
    });
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

    res.json({
      success: true,
      data: job,
    });
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

    res.json({
      success: true,
      data: job,
    });
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
    const { fileDetailId } = req.query;

    const downloadUrl = await patchRepositoryService.getPatchDownloadUrl(
      patchId,
      fileDetailId as string
    );

    if (!downloadUrl) {
      return res.status(404).json({
        success: false,
        error: 'Patch file not available for download',
      });
    }

    res.json({
      success: true,
      data: downloadUrl,
    });
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

    res.json({
      success: true,
      data: downloads,
    });
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
    res.json({
      success: true,
      data: {
        ...stats,
        totalSize: stats.totalSize.toString(),
      },
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

    res.json({
      success: true,
      data: results,
    });
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

    res.json({
      success: true,
      data: status,
    });
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

    res.json({
      success: true,
      data: {
        url,
        isWhitelisted,
      },
    });
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

    res.json({
      success: true,
      data: stats,
    });
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

    res.json({
      success: true,
      message: 'Download queue paused',
    });
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

    res.json({
      success: true,
      message: 'Download queue resumed',
    });
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
    const { olderThanDays } = req.query;
    const olderThanMs = olderThanDays
      ? parseInt(olderThanDays as string, 10) * 24 * 3600 * 1000
      : 7 * 24 * 3600 * 1000;

    await cleanQueue(olderThanMs);

    res.json({
      success: true,
      message: `Download queue cleaned (jobs older than ${olderThanDays || 7} days removed)`,
    });
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
    const { limit } = req.query;
    const maxJobs = limit ? parseInt(limit as string, 10) : 50;

    // Get pending jobs from database
    const { jobs } = await patchRepositoryService.listDownloadJobs({
      status: 'pending',
      limit: maxJobs,
    });

    if (jobs.length === 0) {
      return res.json({
        success: true,
        message: 'No pending jobs to queue',
        queued: 0,
      });
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

    res.json({
      success: true,
      message: `Queued ${jobs.length} pending download jobs`,
      queued: jobs.length,
    });
  } catch (error) {
    next(error);
  }
}
