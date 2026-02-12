import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import type { Logger } from 'pino';
import { rootLogger } from '@shared/services/logger';

declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.log = rootLogger.child({ requestId: req.id });
  res.setHeader('x-request-id', req.id);
  next();
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = req.log || rootLogger;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    log[level](
      { method: req.method, path: req.originalUrl, statusCode: res.statusCode, duration },
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  next();
}
