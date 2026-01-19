import './types';
import { createApp } from './app';
import { config } from '@config/index';
import { prisma } from '@db/client';

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

  const server = app.listen(config.port, () => {
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
