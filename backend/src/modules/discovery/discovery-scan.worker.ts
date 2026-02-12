/**
 * Discovery Scan Worker
 *
 * BullMQ worker that processes network discovery scan jobs:
 * 1. Expands CIDR to IP list
 * 2. Ping sweep to find live hosts
 * 3. Port scan live hosts
 * 4. Reverse DNS + ARP lookup
 * 5. OS/device type inference
 * 6. Upsert DiscoveredDevice records
 */

import { Worker, Job, Queue, QueueEvents, ConnectionOptions } from 'bullmq';
import { env } from '../../config/env';
import { prisma } from '../../db/client';
import { createLogger } from '../../shared/services/logger';
import {
  expandCIDR,
  pingSweep,
  portScan,
  inferOS,
  inferDeviceType,
  reverseDNS,
  getARPEntry,
  COMMON_PORTS,
} from '../../shared/utils/network-scanner';

const logger = createLogger('discovery-scan-worker');

export const DISCOVERY_SCAN_QUEUE_NAME = 'discovery-scan';

export interface DiscoveryScanJobData {
  scanId: string;
  ipRangeId: string;
}

export interface DiscoveryScanJobResult {
  success: boolean;
  devicesFound: number;
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
let _queue: Queue<DiscoveryScanJobData, DiscoveryScanJobResult> | null = null;
let _queueEvents: QueueEvents | null = null;
let _worker: Worker<DiscoveryScanJobData, DiscoveryScanJobResult> | null = null;

function getQueue(): Queue<DiscoveryScanJobData, DiscoveryScanJobResult> {
  if (!_queue) {
    _queue = new Queue<DiscoveryScanJobData, DiscoveryScanJobResult>(
      DISCOVERY_SCAN_QUEUE_NAME,
      {
        connection: getRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 30000,
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
  return _queue;
}

function getQueueEvents(): QueueEvents {
  if (!_queueEvents) {
    _queueEvents = new QueueEvents(DISCOVERY_SCAN_QUEUE_NAME, {
      connection: getRedisConnection(),
    });
  }
  return _queueEvents;
}

/**
 * Process a discovery scan job
 */
async function processDiscoveryScanJob(
  job: Job<DiscoveryScanJobData, DiscoveryScanJobResult>
): Promise<DiscoveryScanJobResult> {
  const startTime = Date.now();
  const { scanId, ipRangeId } = job.data;

  logger.info({ jobId: job.id, scanId, ipRangeId }, 'Processing discovery scan job');

  try {
    // Load IP range
    const ipRange = await prisma.iPRange.findUnique({ where: { id: ipRangeId } });
    if (!ipRange) {
      throw new Error(`IP range not found: ${ipRangeId}`);
    }

    // Update scan to IN_PROGRESS
    await prisma.discoveryScan.update({
      where: { id: scanId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    // Expand CIDR
    let ips: string[];
    try {
      ips = expandCIDR(ipRange.range);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid CIDR';
      await prisma.discoveryScan.update({
        where: { id: scanId },
        data: { status: 'FAILED', errorMessage: message, completedAt: new Date() },
      });
      return { success: false, devicesFound: 0, durationMs: Date.now() - startTime, error: message };
    }

    logger.info({ scanId, totalIPs: ips.length, cidr: ipRange.range }, 'Expanded CIDR, starting ping sweep');

    // Ping sweep with progress logging
    const pingResults = await pingSweep(ips, { concurrency: 50 });
    const liveHosts = pingResults.filter((r) => r.alive);

    logger.info({ scanId, liveHosts: liveHosts.length, totalIPs: ips.length }, 'Ping sweep complete');

    // Port scan + enrichment for live hosts
    let devicesFound = 0;

    for (let i = 0; i < liveHosts.length; i++) {
      const host = liveHosts[i];

      // Log progress every 10%
      if (liveHosts.length >= 10 && i % Math.ceil(liveHosts.length / 10) === 0) {
        logger.info({ scanId, progress: `${Math.round((i / liveHosts.length) * 100)}%` }, 'Scan progress');
      }

      const portResults = await portScan(host.ip, COMMON_PORTS);
      const openPorts = portResults.filter((p) => p.open).map((p) => p.port);

      const [hostname, macAddress] = await Promise.all([
        reverseDNS(host.ip),
        getARPEntry(host.ip),
      ]);

      const os = inferOS(openPorts);
      const deviceType = inferDeviceType(openPorts);

      // Upsert device by ipRangeId + ipAddress (unique constraint)
      await prisma.discoveredDevice.upsert({
        where: {
          ipRangeId_ipAddress: {
            ipRangeId,
            ipAddress: host.ip,
          },
        },
        create: {
          ipRangeId,
          ipAddress: host.ip,
          hostname,
          macAddress,
          deviceType,
          os,
          openPorts,
          status: 'DISCOVERED',
        },
        update: {
          hostname,
          macAddress,
          deviceType,
          os,
          openPorts,
          lastSeenAt: new Date(),
        },
      });

      devicesFound++;
    }

    // Update scan record
    await prisma.discoveryScan.update({
      where: { id: scanId },
      data: {
        status: 'COMPLETED',
        devicesFound,
        completedAt: new Date(),
      },
    });

    // Update IP range device count
    const totalDevices = await prisma.discoveredDevice.count({ where: { ipRangeId } });
    await prisma.iPRange.update({
      where: { id: ipRangeId },
      data: { deviceCount: totalDevices },
    });

    const durationMs = Date.now() - startTime;
    logger.info({ jobId: job.id, scanId, devicesFound, durationMs }, 'Discovery scan completed');

    return { success: true, devicesFound, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({ jobId: job.id, scanId, error: errorMessage, durationMs }, 'Discovery scan job failed');

    // Mark scan as failed
    try {
      await prisma.discoveryScan.update({
        where: { id: scanId },
        data: { status: 'FAILED', errorMessage, completedAt: new Date() },
      });
    } catch (updateErr) {
      logger.error({ scanId, err: updateErr }, 'Failed to update scan status to FAILED');
    }

    throw error;
  }
}

function getDiscoveryScanWorker(): Worker<DiscoveryScanJobData, DiscoveryScanJobResult> {
  if (!_worker) {
    _worker = new Worker<DiscoveryScanJobData, DiscoveryScanJobResult>(
      DISCOVERY_SCAN_QUEUE_NAME,
      processDiscoveryScanJob,
      {
        connection: getRedisConnection(),
        concurrency: 1,
      }
    );

    _worker.on('completed', (job, result) => {
      logger.info({ jobId: job.id, devicesFound: result.devicesFound, durationMs: result.durationMs }, 'Discovery scan worker job completed');
    });

    _worker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, error: error.message }, 'Discovery scan worker job failed');
    });

    _worker.on('error', (error) => {
      logger.error({ err: error }, 'Discovery scan worker error');
    });
  }
  return _worker;
}

function initQueueEvents() {
  const events = getQueueEvents();
  if (events.listenerCount('completed') === 0) {
    events.on('completed', ({ jobId }) => {
      logger.info({ jobId }, 'Discovery scan queue job completed');
    });
    events.on('failed', ({ jobId, failedReason }) => {
      logger.error({ jobId, reason: failedReason }, 'Discovery scan queue job failed');
    });
  }
}

/**
 * Queue a discovery scan job. Returns existing job ID if one is already active/waiting for the same scan.
 */
export async function queueDiscoveryScanJob(
  scanId: string,
  ipRangeId: string
): Promise<{ jobId: string; alreadyRunning: boolean }> {
  const queue = getQueue();
  initQueueEvents();

  // Check for active or waiting jobs to prevent duplicates
  const [activeJobs, waitingJobs] = await Promise.all([
    queue.getActive(),
    queue.getWaiting(),
  ]);

  const existingJob = [...activeJobs, ...waitingJobs].find(
    (j) => j.data.ipRangeId === ipRangeId
  );
  if (existingJob) {
    logger.info({ existingJobId: existingJob.id, ipRangeId }, 'Discovery scan job already active/waiting, skipping');
    return { jobId: existingJob.id!, alreadyRunning: true };
  }

  const job = await queue.add('discovery-scan', { scanId, ipRangeId }, {
    jobId: `discovery-scan-${scanId}`,
  });

  logger.info({ jobId: job.id, scanId, ipRangeId }, 'Queued discovery scan job');
  return { jobId: job.id!, alreadyRunning: false };
}

/**
 * Start the discovery scan worker
 */
export function startDiscoveryScanWorker(): void {
  getDiscoveryScanWorker();
  initQueueEvents();
  logger.info('Discovery scan worker started');
}

/**
 * Graceful shutdown
 */
export async function shutdownDiscoveryScanWorker(): Promise<void> {
  logger.info('Discovery scan worker shutting down');
  if (_worker) {
    await _worker.close();
  }
  if (_queue) {
    await _queue.close();
  }
  if (_queueEvents) {
    await _queueEvents.close();
  }
  logger.info('Discovery scan worker shutdown complete');
}
