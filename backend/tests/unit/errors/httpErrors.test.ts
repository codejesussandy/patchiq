import {
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  ValidationError,
} from '@shared/errors';

describe('HTTP Errors', () => {
  describe('HttpError base class', () => {
    it('should create error with all properties', () => {
      const error = new HttpError(400, 'TestError', 'Test message', { field: 'value' });

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(400);
      expect(error.error).toBe('TestError');
      expect(error.message).toBe('Test message');
      expect(error.details).toEqual({ field: 'value' });
    });

    it('should serialize to JSON correctly', () => {
      const error = new HttpError(400, 'TestError', 'Test message', { field: 'value' });
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'TestError',
        message: 'Test message',
        details: { field: 'value' },
      });
    });

    it('should serialize to JSON without details when not provided', () => {
      const error = new HttpError(400, 'TestError', 'Test message');
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'TestError',
        message: 'Test message',
      });
    });
  });

  describe('BadRequestError', () => {
    it('should have correct status code', () => {
      const error = new BadRequestError();

      expect(error.statusCode).toBe(400);
      expect(error.error).toBe('BadRequest');
    });

    it('should accept custom message', () => {
      const error = new BadRequestError('Custom bad request');

      expect(error.message).toBe('Custom bad request');
    });

    it('should accept details', () => {
      const error = new BadRequestError('Bad request', { field: 'email' });

      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('UnauthorizedError', () => {
    it('should have correct status code', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.error).toBe('Unauthorized');
    });

    it('should use default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    it('should have correct status code', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.error).toBe('Forbidden');
    });
  });

  describe('NotFoundError', () => {
    it('should have correct status code', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.error).toBe('NotFound');
    });

    it('should accept custom message', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
    });
  });

  describe('ConflictError', () => {
    it('should have correct status code', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
      expect(error.error).toBe('Conflict');
    });
  });

  describe('TooManyRequestsError', () => {
    it('should have correct status code', () => {
      const error = new TooManyRequestsError();

      expect(error.statusCode).toBe(429);
      expect(error.error).toBe('TooManyRequests');
    });
  });

  describe('InternalServerError', () => {
    it('should have correct status code', () => {
      const error = new InternalServerError();

      expect(error.statusCode).toBe(500);
      expect(error.error).toBe('InternalServerError');
    });
  });

  describe('ValidationError', () => {
    it('should have correct status code', () => {
      const error = new ValidationError({ email: 'Invalid email' });

      expect(error.statusCode).toBe(400);
      expect(error.error).toBe('ValidationError');
    });

    it('should include validation errors in details', () => {
      const errors = { email: 'Invalid email', password: 'Too short' };
      const error = new ValidationError(errors);

      expect(error.details).toEqual({ errors });
    });
  });
});
