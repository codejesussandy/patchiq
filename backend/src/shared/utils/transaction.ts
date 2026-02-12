import { Prisma } from '@prisma/client';
import { createLogger } from '@shared/services/logger';
import { prisma } from '@/db/client';

const logger = createLogger('transaction');

type TransactionClient = Prisma.TransactionClient;

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: TransactionOptions = {
  maxWait: 5000,
  timeout: 10000,
};

export async function withTransaction<T>(
  operationName: string,
  fn: (tx: TransactionClient) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  try {
    const result = await prisma.$transaction(fn, opts);
    logger.debug({ operation: operationName }, 'Transaction committed');
    return result;
  } catch (error) {
    logger.error({ err: error, operation: operationName }, 'Transaction failed, rolled back');
    throw error;
  }
}

export type { TransactionClient };
