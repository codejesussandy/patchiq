import { Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '@db/client';
import { Prisma } from '@prisma/client';

export interface AuditOptions {
  action: string;
  resource: string;
  getResourceId?: (req: Request) => string | undefined;
  getDetails?: (req: Request, res: Response) => Record<string, unknown> | undefined;
}

/**
 * Middleware to create audit log entries after successful requests
 * Logs are created asynchronously to not block the response
 */
export function audit(options: AuditOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Store the original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response and create audit log
    res.json = function (body: unknown) {
      // Only log successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const details = options.getDetails?.(req, res);
        const logEntry: Prisma.AuditLogCreateInput = {
          action: options.action,
          resource: options.resource,
          resourceId: options.getResourceId?.(req) ?? null,
          details: details ? (details as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] ?? null,
          ...(req.user?.id && { user: { connect: { id: req.user.id } } }),
        };

        // Fire and forget - don't wait for audit log creation
        prisma.auditLog
          .create({ data: logEntry })
          .catch((error) => {
            console.error('Failed to create audit log:', error);
          });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Create audit log entry manually (for operations that don't fit middleware pattern)
 */
export async function createAuditLog(params: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const logEntry: Prisma.AuditLogCreateInput = {
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? null,
      details: params.details ? (params.details as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      ...(params.userId && { user: { connect: { id: params.userId } } }),
    };

    await prisma.auditLog.create({ data: logEntry });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get client IP address from request
 * Handles proxied requests (X-Forwarded-For header)
 */
function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.ip || req.socket.remoteAddress || null;
}

// Common audit action constants
export const AuditAction = {
  // Auth actions
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_COMPLETE: 'password_reset_complete',
  PASSWORD_CHANGE: 'password_change',

  // CRUD actions
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',

  // Specific actions
  APPROVE: 'approve',
  REJECT: 'reject',
  DEPLOY: 'deploy',
  SCAN: 'scan',
  EXPORT: 'export',
  IMPORT: 'import',
} as const;

// Common resource constants
export const AuditResource = {
  USER: 'user',
  AGENT: 'agent',
  ASSET: 'asset',
  PATCH: 'patch',
  VULNERABILITY: 'vulnerability',
  JOB: 'job',
  REPORT: 'report',
  SETTINGS: 'settings',
  DISCOVERY: 'discovery',
  TAG: 'tag',
} as const;
