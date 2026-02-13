import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@shared/services/logger';

const logger = createLogger('audit');

const EXCLUDED_PATHS = ['/health', '/ready', '/api/health'];

const SENSITIVE_FIELDS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
  'authorization',
  'apiKey',
  'apiSecret',
  'smtpPassword',
  'bindPassword',
  'privateKey',
  'clientSecret',
  'webhookSecret',
]);

const LICENSE_FIELDS = new Set(['licenseKey', 'licenseCode', 'activationKey']);

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key)) {
      redacted[key] = '[REDACTED]';
    } else if (LICENSE_FIELDS.has(key) && typeof value === 'string') {
      // Show last 4 chars only for license keys
      redacted[key] = value.length > 4 ? '****-****-' + value.slice(-4) : '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactObject(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function auditLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  if (EXCLUDED_PATHS.includes(req.path)) {
    return next();
  }

  const start = process.hrtime.bigint();
  const log = req.log || logger;

  // Log request entry
  const requestData: Record<string, unknown> = {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  if (req.query && Object.keys(req.query).length > 0) {
    requestData.query = req.query;
  }

  if (req.user?.id) {
    requestData.userId = req.user.id;
  }

  if (req.body && Object.keys(req.body).length > 0) {
    requestData.body = redactObject(req.body);
  }

  log.info(requestData, 'Incoming request');

  // Log response on finish
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;

    const responseData: Record<string, unknown> = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };

    if (req.user?.id) {
      responseData.userId = req.user.id;
    }

    if (res.statusCode >= 500) {
      log.error(responseData, 'Request failed');
    } else if (res.statusCode >= 400) {
      log.warn(responseData, 'Request completed with error');
    } else {
      log.info(responseData, 'Request completed');
    }
  });

  next();
}
