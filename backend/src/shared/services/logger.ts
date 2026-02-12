import pino from 'pino';

const rootLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export function createLogger(module: string) {
  return rootLogger.child({ module });
}

export { rootLogger };
export type Logger = pino.Logger;
