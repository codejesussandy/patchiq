import './types';
import { createApp } from './app';
import { config } from '@config/index';
import { prisma } from '@db/client';
import { startWorker, shutdownWorker, patchRepositoryService } from '@modules/patch-repository';
import { executeDeployment } from '@modules/patches/patches.service';
import { setSseManager, setEmailSender } from '@modules/notifications';
import { sseManager } from '@shared/services/sse.service';
import { maybeSendNotificationEmail } from '@shared/services/notification-email.service';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let syncSchedulerInterval: ReturnType<typeof setInterval> | null = null;
let vulnJobSchedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Check for scheduled deployments that are due and execute them.
 */
async function checkScheduledDeployments() {
  try {
    const due = await prisma.patchDeployment.findMany({
      where: {
        stage: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      select: { id: true, name: true },
    });

    for (const deployment of due) {
      try {
        await executeDeployment(deployment.id, 'system');
        console.log(`[scheduler] Executed scheduled deployment: ${deployment.name} (${deployment.id})`);
      } catch (err) {
        console.error(`[scheduler] Failed to execute deployment ${deployment.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[scheduler] Error checking scheduled deployments:', err);
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
          console.log(`[sync-scheduler] Source "${source.name}" (${source.vendor}) is due for sync`);
          try {
            const results = await patchRepositoryService.triggerSync({ sourceIds: [source.id] });
            const r = results[0];
            if (r) {
              console.log(
                `[sync-scheduler] Synced "${source.name}": ${r.patchesFound} found, ` +
                `${r.patchesDownloaded} downloaded, ${r.patchesFailed} failed (${r.duration}ms)`,
              );
            }
          } catch (err) {
            console.error(`[sync-scheduler] Failed to sync source "${source.name}":`, err);
          }
        }
      } catch (cronErr) {
        console.error(`[sync-scheduler] Invalid cron "${source.syncSchedule}" for "${source.name}":`, cronErr);
      }
    }
  } catch (err) {
    console.error('[sync-scheduler] Error checking scheduled syncs:', err);
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

        console.log(`[vuln-scheduler] Executing scheduled vulnerability job: ${job.name} (${job.jobId})`);
        executeAndTrackScan(job.id, job.scope, job.endpoints, job.createdBy || 'system').catch((err) => {
          console.error(`[vuln-scheduler] Failed to execute vulnerability job ${job.jobId}:`, err);
        });
      } catch (err) {
        console.error(`[vuln-scheduler] Error starting job ${job.jobId}:`, err);
      }
    }
  } catch (err) {
    console.error('[vuln-scheduler] Error checking scheduled vulnerability jobs:', err);
  }
}

async function main() {
  const app = createApp();

  // Verify database connection
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }

  // Wire notification hooks (SSE + email)
  setSseManager(sseManager);
  setEmailSender(maybeSendNotificationEmail);
  console.log('Notification hooks initialized (SSE + email)');

  // Start background workers
  try {
    startWorker();
    console.log('Download worker started');
  } catch (error) {
    console.error('Failed to start download worker:', error);
  }

  // Start scheduled deployment checker (every 60 seconds)
  schedulerInterval = setInterval(checkScheduledDeployments, 60_000);
  console.log('Deployment scheduler started (60s interval)');

  // Start vendor catalog sync scheduler (every 5 minutes)
  syncSchedulerInterval = setInterval(checkScheduledSyncs, 5 * 60_000);
  setTimeout(checkScheduledSyncs, 30_000); // Run once after 30s startup delay
  console.log('Vendor sync scheduler started (5min interval)');

  // Start vulnerability job scheduler (every 60 seconds)
  vulnJobSchedulerInterval = setInterval(checkScheduledVulnerabilityJobs, 60_000);
  console.log('Vulnerability job scheduler started (60s interval)');

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`
    =============================================
    PatchIQ Backend Server
    =============================================
    Environment: ${config.nodeEnv}
    Port:        ${config.port}
    API Version: ${config.apiVersion}
    Health:      http://localhost:${config.port}/health
    API:         http://localhost:${config.port}/${config.apiVersion}
    =============================================
    `);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      console.log('HTTP server closed');

      // Stop schedulers
      if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('Deployment scheduler stopped');
      }
      if (syncSchedulerInterval) {
        clearInterval(syncSchedulerInterval);
        syncSchedulerInterval = null;
        console.log('Vendor sync scheduler stopped');
      }
      if (vulnJobSchedulerInterval) {
        clearInterval(vulnJobSchedulerInterval);
        vulnJobSchedulerInterval = null;
        console.log('Vulnerability job scheduler stopped');
      }

      // Stop download worker
      try {
        await shutdownWorker();
        console.log('Download worker stopped');
      } catch (error) {
        console.error('Error shutting down download worker:', error);
      }

      try {
        await prisma.$disconnect();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error disconnecting from database:', error);
      }

      console.log('Shutdown complete');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
