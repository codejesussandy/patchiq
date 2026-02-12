import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth, requireRole } from '@middleware/auth';
import { signAccessToken, signRefreshToken } from '@shared/utils/jwt';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;

  const testPayload = {
    userId: 'test-user-id',
    email: 'test@patchiq.io',
    role: 'ADMIN',
    organizationId: 'org-123',
  };

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should pass with valid access token', () => {
      const token = signAccessToken(testPayload);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.email).toBe(testPayload.email);
    });

    it('should call next with error when no token provided', () => {
      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should call next with error for invalid token format', () => {
      mockRequest.headers = { authorization: 'InvalidFormat token' };

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should reject refresh tokens', () => {
      const token = signRefreshToken(testPayload);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should call next with error for invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('optionalAuth', () => {
    it('should set user when valid token provided', () => {
      const token = signAccessToken(testPayload);
      mockRequest.headers = { authorization: `Bearer ${token}` };

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeDefined();
    });

    it('should pass without error when no token provided', () => {
      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should pass without error for invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });
  });

  describe('requireRole', () => {
    it('should pass when user has required role', () => {
      mockRequest.user = {
        id: testPayload.userId,
        email: testPayload.email,
        role: 'ADMIN',
        organizationId: testPayload.organizationId,
      };

      const middleware = requireRole('admin', 'user');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when user missing', () => {
      const middleware = requireRole('ADMIN');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should call next with error when user lacks role', () => {
      mockRequest.user = {
        id: testPayload.userId,
        email: testPayload.email,
        role: 'VIEWER',
        organizationId: testPayload.organizationId,
      };

      const middleware = requireRole('ADMIN');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});
