import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createLogger } from '@shared/services/logger';
import { prisma } from '@db/client';

const logger = createLogger('audit');

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
            logger.error({ err: error }, 'Failed to create audit log');
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
    logger.error({ err: error }, 'Failed to create audit log');
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
  SYNC: 'sync',
  ACTIVATE: 'activate',
  TOGGLE: 'toggle',
  ACKNOWLEDGE: 'acknowledge',
  RESOLVE: 'resolve',
  TEST: 'test',
  CANCEL: 'cancel',
  EXECUTE: 'execute',
  RETRY: 'retry',
  SUSPEND: 'suspend',
  INVITE: 'invite',
  REFRESH: 'refresh',
  UPLOAD: 'upload',
  ENROLL: 'enroll',
  ROLLBACK: 'rollback',
  SEND: 'send',
  PAUSE: 'pause',
  RESUME: 'resume',
  CLEAN: 'clean',
} as const;

// Common resource constants
export const AuditResource = {
  USER: 'user',
  AGENT: 'agent',
  AGENT_VERSION: 'agent_version',
  ASSET: 'asset',
  PATCH: 'patch',
  PATCH_TEST: 'patch_test',
  PATCH_SOURCE: 'patch_source',
  PATCH_TEMPLATE: 'patch_template',
  PATCH_REPOSITORY: 'patch_repository',
  ZERO_TOUCH_CONFIG: 'zero_touch_config',
  VULNERABILITY: 'vulnerability',
  VULNERABILITY_EXCEPTION: 'vulnerability_exception',
  JOB: 'job',
  REPORT: 'report',
  REPORT_SCHEDULE: 'report_schedule',
  SETTINGS: 'settings',
  DISCOVERY: 'discovery',
  DISCOVERY_CREDENTIAL: 'discovery_credential',
  DISCOVERED_DEVICE: 'discovered_device',
  TAG: 'tag',
  ROLE: 'role',
  ALERT: 'alert',
  ALERT_CONFIG: 'alert_config',
  INTEGRATION: 'integration',
  LICENSE: 'license',
  DEPLOYMENT: 'deployment',
  DEPLOYMENT_POLICY: 'deployment_policy',
  HUB: 'hub',
  HUB_PACKAGE: 'hub_package',
  HUB_BUNDLE: 'hub_bundle',
  NOTIFICATION: 'notification',
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  ORGANIZATION: 'organization',
  BRANCH: 'branch',
  DEPARTMENT: 'department',
  LOCATION: 'location',
  CATEGORY: 'category',
  SUBCATEGORY: 'subcategory',
  SOFTWARE_LICENSE: 'software_license',
  OS_LICENSE: 'os_license',
  SOFTWARE_INVENTORY: 'software_inventory',
  LDAP_CONFIG: 'ldap_config',
  GROUP_MAPPING: 'group_mapping',
  SERVER_SETTINGS: 'server_settings',
  AGENT_CONFIG: 'agent_config',
  PROXY_SERVER: 'proxy_server',
  MAIL_SERVER: 'mail_server',
  VULNERABILITY_PREFERENCE: 'vulnerability_preference',
  COMPUTER_GROUP: 'computer_group',
  DISTRIBUTION_SERVER: 'distribution_server',
  BRANDING: 'branding',
  VENDOR_LOGO: 'vendor_logo',
  RISK_SCORE: 'risk_score',
  REMOTE_DESKTOP: 'remote_desktop',
  PATCH_MANAGEMENT: 'patch_management',
  PASSWORD_POLICY: 'password_policy',
  RECOMMENDATION: 'recommendation',
  DASHBOARD: 'dashboard',
  DOWNLOAD_JOB: 'download_job',
  DOWNLOAD_QUEUE: 'download_queue',
  AI: 'ai',
  CVE_SYNC: 'cve_sync',
  ENROLL_SECRET: 'enroll_secret',
  AGENT_APPROVAL_SETTINGS: 'agent_approval_settings',
  REDHAT_NOMINATION: 'redhat_nomination',
  LDAP_SYNC: 'ldap_sync',
  AGENT_APPROVAL: 'agent_approval',
  PLATFORM_LICENSE: 'platform_license',
} as const;

// ============================================
// Audit Helper Utilities
// ============================================

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

/**
 * Compare two objects and return a list of changed fields
 * Useful for tracking what changed during an update operation
 */
export function diffObjects(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  fieldsToTrack?: string[]
): FieldChange[] {
  if (!before || !after) return [];

  const changes: FieldChange[] = [];
  const keysToCompare = fieldsToTrack || Object.keys(after);

  for (const key of keysToCompare) {
    const beforeVal = before[key];
    const afterVal = after[key];

    // Skip if both are undefined/null
    if (beforeVal == null && afterVal == null) continue;

    // Skip internal fields
    if (key.startsWith('_') || key === 'updatedAt' || key === 'createdAt') continue;

    // Compare values (handle objects by JSON stringify)
    const beforeStr = typeof beforeVal === 'object' ? JSON.stringify(beforeVal) : beforeVal;
    const afterStr = typeof afterVal === 'object' ? JSON.stringify(afterVal) : afterVal;

    if (beforeStr !== afterStr) {
      changes.push({
        field: key,
        from: beforeVal,
        to: afterVal,
      });
    }
  }

  return changes;
}

/**
 * Format field changes into a human-readable summary
 */
export function formatChangeSummary(changes: FieldChange[]): string {
  if (changes.length === 0) return 'No changes';

  return changes
    .map((c) => {
      const fromStr = c.from === null || c.from === undefined ? '(empty)' : String(c.from);
      const toStr = c.to === null || c.to === undefined ? '(empty)' : String(c.to);
      return `${c.field}: "${fromStr}" → "${toStr}"`;
    })
    .join('; ');
}

/**
 * Pick specific fields from an object for audit logging
 */
export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const field of fields) {
    if (obj[field] !== undefined) {
      result[field] = obj[field];
    }
  }
  return result;
}
