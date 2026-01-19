import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateBody, validateQuery, validateParams } from '@middleware/validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  const testSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().optional(),
  });

  describe('validate', () => {
    it('should validate body by default', () => {
      mockRequest.body = {
        name: 'John',
        email: 'john@example.com',
      };

      const middleware = validate(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should call next with ZodError for invalid body', () => {
      mockRequest.body = {
        name: '',
        email: 'invalid-email',
      };

      const middleware = validate(testSchema, 'body');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(z.ZodError));
    });

    it('should validate query parameters', () => {
      const querySchema = z.object({
        page: z.coerce.number().positive(),
        search: z.string().optional(),
      });

      mockRequest.query = { page: '1', search: 'test' };

      const middleware = validate(querySchema, 'query');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate URL params', () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      });

      mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      const middleware = validate(paramsSchema, 'params');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateBody', () => {
    it('should validate request body', () => {
      mockRequest.body = {
        name: 'John',
        email: 'john@example.com',
      };

      const middleware = validateBody(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', () => {
      mockRequest.query = {
        name: 'John',
        email: 'john@example.com',
      };

      const middleware = validateQuery(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateParams', () => {
    it('should validate URL params', () => {
      mockRequest.params = {
        name: 'John',
        email: 'john@example.com',
      };

      const middleware = validateParams(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Type transformation', () => {
    it('should transform coerced types', () => {
      const coerceSchema = z.object({
        count: z.coerce.number(),
        active: z.coerce.boolean(),
      });

      mockRequest.query = { count: '42', active: 'true' };

      const middleware = validate(coerceSchema, 'query');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction
      );

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
