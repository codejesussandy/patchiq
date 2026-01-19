import { PrismaClient } from '@prisma/client';
import { config } from '@config/index';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (!config.isProduction) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
