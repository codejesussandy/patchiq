import { PrismaClient } from '@prisma/client';
import { config } from '@config/index';

const g: unknown = globalThis;
const globalStore = g as Record<string, PrismaClient | undefined>;

export const prisma =
  globalStore['__prisma'] ??
  new PrismaClient({
    log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (!config.isProduction) {
  globalStore['__prisma'] = prisma;
}

export default prisma;
