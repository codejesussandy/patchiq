import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';
import { verifyToken } from '@shared/utils/jwt';

export const authenticate: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (payload.type === 'access') {
        req.user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          organizationId: payload.organizationId,
        };
      }
    }

    next();
  } catch {
    // Ignore authentication errors for optional auth
    next();
  }
};

export function requireRole(...roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireUser = requireRole('ADMIN', 'USER');
