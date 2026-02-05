import './types';
import { createApp } from './app';
import { config } from '@config/index';
import { prisma } from '@db/client';
import { startWorker, shutdownWorker } from '@modules/patch-repository';
import { executeDeployment } from '@modules/patches/patches.service';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

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

      // Stop scheduler
      if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('Deployment scheduler stopped');
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
