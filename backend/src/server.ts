import './types';
import { setSseManager, setEmailSender } from '@modules/notifications';
import { startWorker, shutdownWorker, patchRepositoryService } from '@modules/patch-repository';
import { executeDeployment } from '@modules/patches/patches.service';
import { createLogger } from '@shared/services/logger';
import { maybeSendNotificationEmail } from '@shared/services/notification-email.service';
import { sseManager } from '@shared/services/sse.service';
import { config } from '@config/index';
import { prisma } from '@db/client';
import { createApp } from './app';

const logger = createLogger('server');

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let syncSchedulerInterval: ReturnType<typeof setInterval> | null = null;
let vulnJobSchedulerInterval: ReturnType<typeof setInterval> | null = null;
let cveSyncSchedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Check for scheduled deployments that are due and execute them.
 */
async function checkScheduledDeployments() {
  try {
    const due = await prisma.patchDeployment.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      select: { id: true, name: true },
    });

    for (const deployment of due) {
      try {
        await executeDeployment(deployment.id, 'system');
        logger.info({ deploymentId: deployment.id, name: deployment.name }, 'Executed scheduled deployment');
      } catch (err) {
        logger.error({ err, deploymentId: deployment.id }, 'Failed to execute scheduled deployment');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error checking scheduled deployments');
  }
}

/**
 * Check for PatchSources with cron-based syncSchedule that are due for sync.
 */
async function checkScheduledSyncs() {
  try {
    const { parseExpression } = await import('cron-parser');

    const sources = await prisma.patchSource.findMany({
      where: {
        isEnabled: true,
        syncSchedule: { not: null },
      },
      select: { id: true, name: true, vendor: true, syncSchedule: true, lastSyncAt: true },
    });

    if (sources.length === 0) return;

    const now = new Date();

    for (const source of sources) {
      if (!source.syncSchedule) continue;

      try {
        const interval = parseExpression(source.syncSchedule, { currentDate: now });
        const prevTick = interval.prev().toDate();
        const isDue = !source.lastSyncAt || source.lastSyncAt < prevTick;

        if (isDue) {
          logger.info({ sourceName: source.name, vendor: source.vendor }, 'Source is due for sync');
          try {
            const results = await patchRepositoryService.triggerSync({ sourceIds: [source.id] });
            const r = results[0];
            if (r) {
              logger.info({ sourceName: source.name, patchesFound: r.patchesFound, patchesDownloaded: r.patchesDownloaded, patchesFailed: r.patchesFailed, durationMs: r.duration }, 'Sync completed');
            }
          } catch (err) {
            logger.error({ err, sourceName: source.name }, 'Failed to sync source');
          }
        }
      } catch (cronErr) {
        logger.error({ err: cronErr, syncSchedule: source.syncSchedule, sourceName: source.name }, 'Invalid cron expression');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error checking scheduled syncs');
  }
}

/**
 * Check for scheduled VulnerabilityJobs that are due and execute them.
 */
async function checkScheduledVulnerabilityJobs() {
  try {
    const { executeAndTrackScan } = await import('@modules/jobs/jobs.service');

    const due = await prisma.vulnerabilityJob.findMany({
      where: {
        status: 'SCHEDULED',
        nextRun: { lte: new Date() },
      },
      select: { id: true, jobId: true, name: true, scope: true, endpoints: true, createdBy: true },
    });

    for (const job of due) {
      try {
        // Mark as running immediately to prevent double-execution
        await prisma.vulnerabilityJob.update({
          where: { id: job.id },
          data: { status: 'RUNNING' },
        });

        logger.info({ jobName: job.name, jobId: job.jobId }, 'Executing scheduled vulnerability job');
        executeAndTrackScan(job.id, job.scope, job.endpoints, job.createdBy || 'system').catch((err) => {
          logger.error({ err, jobId: job.jobId }, 'Failed to execute vulnerability job');
        });
      } catch (err) {
        logger.error({ err, jobId: job.jobId }, 'Error starting vulnerability job');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error checking scheduled vulnerability jobs');
  }
}

/**
 * Periodically sync the CVE database (NVD, CISA KEV, EPSS, GitHub Advisories).
 * Reads the sync interval from the VulnerabilityDBSync record or falls back to
 * the CVE_SYNC_INTERVAL_HOURS env variable.
 */
async function checkCveDatabaseSync() {
  try {
    const { cveDatabase } = await import('@shared/services/cve-database.service');

    // Check if sync is already running
    const status = await cveDatabase.getSyncStatus() as { syncInProgress: boolean; lastSync: Date | null };
    if (status.syncInProgress) return;

    // Determine sync interval from DB config or env
    const syncRecord = await prisma.vulnerabilityDBSync.findFirst();
    const intervalHours = syncRecord?.scanJobInterval || Number(process.env.CVE_SYNC_INTERVAL_HOURS) || 24;

    // Check if it's time to sync
    const lastSync = status.lastSync ? new Date(status.lastSync) : null;
    const hoursSinceSync = lastSync
      ? (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursSinceSync < intervalHours) return;

    logger.info({ lastSync: lastSync?.toISOString() ?? 'never', intervalHours }, 'Starting CVE database sync');
    const result = await cveDatabase.syncAll();
    logger.info({ success: result.success, stats: result.stats }, 'CVE sync completed');
  } catch (err) {
    logger.error({ err }, 'Error during CVE database sync');
  }
}

async function main() {
  const app = createApp();

  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    process.exit(1);
  }

  // Wire notification hooks (SSE + email)
  setSseManager(sseManager);
  setEmailSender(maybeSendNotificationEmail);
  logger.info('Notification hooks initialized (SSE + email)');

  // Start background workers
  try {
    startWorker();
    logger.info('Download worker started');
  } catch (error) {
    logger.error({ err: error }, 'Failed to start download worker');
  }

  // Start scheduled deployment checker (every 60 seconds)
  schedulerInterval = setInterval(checkScheduledDeployments, 60_000);
  logger.info('Deployment scheduler started (60s interval)');

  // Start vendor catalog sync scheduler (every 5 minutes)
  syncSchedulerInterval = setInterval(checkScheduledSyncs, 5 * 60_000);
  setTimeout(checkScheduledSyncs, 30_000); // Run once after 30s startup delay
  logger.info('Vendor sync scheduler started (5min interval)');

  // Start vulnerability job scheduler (every 60 seconds)
  vulnJobSchedulerInterval = setInterval(checkScheduledVulnerabilityJobs, 60_000);
  logger.info('Vulnerability job scheduler started (60s interval)');

  // Start CVE database sync scheduler (check every 15 minutes, sync based on configured interval)
  cveSyncSchedulerInterval = setInterval(checkCveDatabaseSync, 15 * 60_000);
  setTimeout(checkCveDatabaseSync, 60_000); // First check 60s after startup
  logger.info('CVE database sync scheduler started (checks every 15min)');

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info({ environment: config.nodeEnv, port: config.port, apiVersion: config.apiVersion }, 'PatchIQ Backend Server started');
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Starting graceful shutdown');

    server.close(async () => {
      logger.info('HTTP server closed');

      // Stop schedulers
      if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        logger.info('Deployment scheduler stopped');
      }
      if (syncSchedulerInterval) {
        clearInterval(syncSchedulerInterval);
        syncSchedulerInterval = null;
        logger.info('Vendor sync scheduler stopped');
      }
      if (vulnJobSchedulerInterval) {
        clearInterval(vulnJobSchedulerInterval);
        vulnJobSchedulerInterval = null;
        logger.info('Vulnerability job scheduler stopped');
      }
      if (cveSyncSchedulerInterval) {
        clearInterval(cveSyncSchedulerInterval);
        cveSyncSchedulerInterval = null;
        logger.info('CVE sync scheduler stopped');
      }

      // Stop download worker
      try {
        await shutdownWorker();
        logger.info('Download worker stopped');
      } catch (error) {
        logger.error({ err: error }, 'Error shutting down download worker');
      }

      try {
        await prisma.$disconnect();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error({ err: error }, 'Error disconnecting from database');
      }

      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught Exception');
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ err: reason, promise }, 'Unhandled Rejection');
  });
}

main().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
