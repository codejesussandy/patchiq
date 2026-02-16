/**
 * LDAP Sync Worker
 *
 * BullMQ worker that processes scheduled LDAP user sync jobs:
 * 1. Reads active LdapConfigs with syncEnabled=true
 * 2. Registers repeatable jobs at configured intervals
 * 3. On job execution, delegates to settingsService.triggerLdapSync()
 */

import { Worker, Job, Queue, QueueEvents, ConnectionOptions } from 'bullmq';
import { env } from '../../config/env';
import { prisma } from '../../db/client';
import { createLogger } from '../../shared/services/logger';

const logger = createLogger('ldap-sync-worker');

export const LDAP_SYNC_QUEUE_NAME = 'ldap-sync';

export interface LdapSyncJobData {
  ldapConfigId: string;
  triggerType: 'MANUAL' | 'SCHEDULED';
}

export interface LdapSyncJobResult {
  success: boolean;
  jobId: string;
  durationMs: number;
  error?: string;
}

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
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '3002', 10),
      maxRetriesPerRequest: null,
    };
  }
}

let _redisConnection: ConnectionOptions | null = null;
function getRedisConnection(): ConnectionOptions {
  if (!_redisConnection) {
    _redisConnection = parseRedisUrl(env.REDIS_URL);
  }
  return _redisConnection;
}

// Lazy-initialized instances
let _ldapSyncQueue: Queue<LdapSyncJobData, LdapSyncJobResult> | null = null;
let _ldapSyncQueueEvents: QueueEvents | null = null;
let _ldapSyncWorker: Worker<LdapSyncJobData, LdapSyncJobResult> | null = null;

function getLdapSyncQueue(): Queue<LdapSyncJobData, LdapSyncJobResult> {
  if (!_ldapSyncQueue) {
    _ldapSyncQueue = new Queue<LdapSyncJobData, LdapSyncJobResult>(
      LDAP_SYNC_QUEUE_NAME,
      {
        connection: getRedisConnection(),
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 60000, // 60s base
          },
          removeOnComplete: {
            age: 7 * 24 * 3600,
            count: 100,
          },
          removeOnFail: {
            age: 30 * 24 * 3600,
          },
        },
      }
    );
  }
  return _ldapSyncQueue;
}

function getLdapSyncQueueEvents(): QueueEvents {
  if (!_ldapSyncQueueEvents) {
    _ldapSyncQueueEvents = new QueueEvents(LDAP_SYNC_QUEUE_NAME, {
      connection: getRedisConnection(),
    });
  }
  return _ldapSyncQueueEvents;
}

/**
 * Process an LDAP sync job
 */
async function processLdapSyncJob(job: Job<LdapSyncJobData, LdapSyncJobResult>): Promise<LdapSyncJobResult> {
  const startTime = Date.now();
  const { ldapConfigId, triggerType } = job.data;
  logger.info({ jobId: job.id, ldapConfigId, triggerType }, 'Processing LDAP sync job');

  try {
    // Lazy import to avoid circular deps
    const { settingsService } = await import('./settings.service');

    const result = await settingsService.triggerLdapSync(ldapConfigId);

    const durationMs = Date.now() - startTime;
    logger.info({ jobId: job.id, syncJobId: result.id, durationMs }, 'LDAP sync job queued');

    return {
      success: true,
      jobId: result.id,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ jobId: job.id, ldapConfigId, error: errorMessage, durationMs }, 'LDAP sync job failed');

    // If a sync is already running, don't retry
    if (errorMessage.includes('already in progress')) {
      return {
        success: false,
        jobId: '',
        durationMs,
        error: errorMessage,
      };
    }

    throw error;
  }
}

function getLdapSyncWorker(): Worker<LdapSyncJobData, LdapSyncJobResult> {
  if (!_ldapSyncWorker) {
    _ldapSyncWorker = new Worker<LdapSyncJobData, LdapSyncJobResult>(
      LDAP_SYNC_QUEUE_NAME,
      processLdapSyncJob,
      {
        connection: getRedisConnection(),
        concurrency: 1, // Only one sync at a time
      }
    );

    _ldapSyncWorker.on('completed', (job, result) => {
      logger.info({ jobId: job.id, syncJobId: result.jobId, durationMs: result.durationMs }, 'LDAP sync worker job completed');
    });

    _ldapSyncWorker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, error: error.message }, 'LDAP sync worker job failed');
    });

    _ldapSyncWorker.on('error', (error) => {
      logger.error({ err: error }, 'LDAP sync worker error');
    });
  }
  return _ldapSyncWorker;
}

function initQueueEvents() {
  const events = getLdapSyncQueueEvents();
  if (events.listenerCount('completed') === 0) {
    events.on('completed', ({ jobId }) => {
      logger.info({ jobId }, 'LDAP sync queue job completed');
    });
    events.on('failed', ({ jobId, failedReason }) => {
      logger.error({ jobId, reason: failedReason }, 'LDAP sync queue job failed');
    });
  }
}

/**
 * Set up repeatable sync jobs for all active LdapConfigs with syncEnabled=true.
 * Called on server startup and when LdapConfig is updated.
 */
export async function setupLdapRepeatableSync(): Promise<void> {
  const queue = getLdapSyncQueue();

  // Remove all existing repeatable jobs to avoid duplicates on restart
  const existingRepeatables = await queue.getRepeatableJobs();
  for (const r of existingRepeatables) {
    await queue.removeRepeatableByKey(r.key);
  }

  // Find all active configs with sync enabled
  const configs = await prisma.ldapConfig.findMany({
    where: { isActive: true, syncEnabled: true },
    select: { id: true, name: true, syncInterval: true },
  });

  for (const config of configs) {
    const intervalMs = config.syncInterval * 60 * 1000; // syncInterval is in minutes

    await queue.add(
      `ldap-sync-${config.id}`,
      { ldapConfigId: config.id, triggerType: 'SCHEDULED' },
      {
        repeat: {
          every: intervalMs,
        },
        jobId: `ldap-sync-scheduled-${config.id}`,
      }
    );

    logger.info({ configId: config.id, configName: config.name, intervalMinutes: config.syncInterval }, 'LDAP sync repeatable job registered');
  }

  if (configs.length === 0) {
    logger.info('No active LDAP configs with sync enabled');
  }
}

/**
 * Update repeatable job for a specific LdapConfig.
 * Call this when a config is updated (syncEnabled toggled, syncInterval changed).
 */
export async function updateLdapSyncSchedule(ldapConfigId: string): Promise<void> {
  const queue = getLdapSyncQueue();

  // Remove existing repeatable job for this config
  const existingRepeatables = await queue.getRepeatableJobs();
  for (const r of existingRepeatables) {
    if (r.id === `ldap-sync-scheduled-${ldapConfigId}`) {
      await queue.removeRepeatableByKey(r.key);
    }
  }

  // Check if we need to re-add
  const config = await prisma.ldapConfig.findUnique({
    where: { id: ldapConfigId },
    select: { id: true, name: true, isActive: true, syncEnabled: true, syncInterval: true },
  });

  if (config && config.isActive && config.syncEnabled) {
    const intervalMs = config.syncInterval * 60 * 1000;

    await queue.add(
      `ldap-sync-${config.id}`,
      { ldapConfigId: config.id, triggerType: 'SCHEDULED' },
      {
        repeat: {
          every: intervalMs,
        },
        jobId: `ldap-sync-scheduled-${config.id}`,
      }
    );

    logger.info({ configId: config.id, intervalMinutes: config.syncInterval }, 'LDAP sync schedule updated');
  } else {
    logger.info({ configId: ldapConfigId }, 'LDAP sync schedule removed (config inactive or sync disabled)');
  }
}

/**
 * Remove repeatable job for a deleted LdapConfig.
 */
export async function removeLdapSyncSchedule(ldapConfigId: string): Promise<void> {
  const queue = getLdapSyncQueue();
  const existingRepeatables = await queue.getRepeatableJobs();
  for (const r of existingRepeatables) {
    if (r.id === `ldap-sync-scheduled-${ldapConfigId}`) {
      await queue.removeRepeatableByKey(r.key);
      logger.info({ configId: ldapConfigId }, 'LDAP sync schedule removed');
    }
  }
}

/**
 * Start the LDAP sync worker
 */
export function startLdapSyncWorker(): void {
  getLdapSyncWorker();
  initQueueEvents();
  logger.info('LDAP sync worker started');
}

/**
 * Graceful shutdown
 */
export async function shutdownLdapSyncWorker(): Promise<void> {
  logger.info('LDAP sync worker shutting down');
  if (_ldapSyncWorker) {
    await _ldapSyncWorker.close();
  }
  if (_ldapSyncQueue) {
    await _ldapSyncQueue.close();
  }
  if (_ldapSyncQueueEvents) {
    await _ldapSyncQueueEvents.close();
  }
  logger.info('LDAP sync worker shutdown complete');
}
