export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly error: string;
  public readonly details?: Record<string, unknown>;

  constructor(statusCode: number, error: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.error,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad Request', details?: Record<string, unknown>) {
    super(400, 'BadRequest', message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'Unauthorized', message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(403, 'Forbidden', message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Not Found') {
    super(404, 'NotFound', message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = 'Conflict', details?: Record<string, unknown>) {
    super(409, 'Conflict', message, details);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message: string = 'Too Many Requests') {
    super(429, 'TooManyRequests', message);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string = 'Internal Server Error') {
    super(500, 'InternalServerError', message);
  }
}

export class ValidationError extends HttpError {
  constructor(errors: Record<string, string>) {
    super(400, 'ValidationError', 'Validation failed', { errors });
  }
}
