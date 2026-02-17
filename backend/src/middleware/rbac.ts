import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ForbiddenError } from '@shared/errors';
import { prisma } from '@db/client';
import { createLogger } from '@shared/services/logger';

const logger = createLogger('rbac');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PermissionModule =
  | 'agents'
  | 'assets'
  | 'patches'
  | 'vulnerabilities'
  | 'jobs'
  | 'discovery'
  | 'reports'
  | 'dashboard'
  | 'settings'
  | 'deployments'
  | 'notifications'
  | 'hub'
  | 'patch-repository'
  | 'patch-templates'
  | 'ai';

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

// Shape of the permissions JSON stored in the Role table.
interface ModulePermissions {
  view?: boolean;
  add?: boolean;
  edit?: boolean;
  delete?: boolean;
}

type PermissionsMap = Record<string, ModulePermissions>;

// ---------------------------------------------------------------------------
// Role Cache (in-memory, 60-second TTL)
// ---------------------------------------------------------------------------

interface CachedRole {
  role: {
    id: string;
    name: string;
    isSystem: boolean;
    permissions: unknown; // Prisma Json type
  };
  cachedAt: number;
}

const CACHE_TTL_MS = 60_000;
const roleCache = new Map<string, CachedRole>();

export function clearRoleCache(): void {
  roleCache.clear();
}

export function invalidateRoleCache(roleId: string): void {
  roleCache.delete(roleId);
}

async function getRole(roleId: string): Promise<CachedRole['role'] | null> {
  const now = Date.now();
  const cached = roleCache.get(roleId);

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.role;
  }

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, name: true, isSystem: true, permissions: true },
  });

  if (role) {
    roleCache.set(roleId, { role, cachedAt: now });
  } else {
    // Remove stale entry if role was deleted
    roleCache.delete(roleId);
  }

  return role;
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

function isPermissionsMap(value: unknown): value is PermissionsMap {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function checkPermission(
  module: PermissionModule,
  action: PermissionAction,
): RequestHandler {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user || !user.roleId) {
        return next(new ForbiddenError('Role not found'));
      }

      const role = await getRole(user.roleId);

      if (!role) {
        return next(new ForbiddenError('Role not found'));
      }

      // Admin bypass: ONLY for system admin role
      if (role.name === 'admin' && role.isSystem === true) {
        return next();
      }

      // Validate permissions JSON
      if (!isPermissionsMap(role.permissions)) {
        logger.warn(
          { roleId: role.id, roleName: role.name },
          'Role has null or malformed permissions JSON',
        );
        return next(
          new ForbiddenError(`You do not have permission to ${action} ${module}`),
        );
      }

      const modulePerms = role.permissions[module];
      if (modulePerms && modulePerms[action] === true) {
        return next();
      }

      return next(
        new ForbiddenError(`You do not have permission to ${action} ${module}`),
      );
    } catch (error) {
      next(error);
    }
  };
}
