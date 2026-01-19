import { env } from './env';

export const databaseConfig = {
  url: env.DATABASE_URL,
  poolSize: env.NODE_ENV === 'production' ? 10 : 5,
  connectionTimeout: 30000,
  idleTimeout: 10000,
};

export function getDatabaseUrl(): string {
  return env.DATABASE_URL;
}
