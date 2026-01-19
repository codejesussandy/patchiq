import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError, InternalServerError } from '@shared/errors';
import { config } from '@config/index';

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in non-test environments
  if (!config.isTest) {
    console.error('Error:', {
      name: error.name,
      message: error.message,
      stack: config.isDevelopment ? error.stack : undefined,
    });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string> = {};
    error.errors.forEach((e) => {
      const path = e.path.join('.');
      errors[path] = e.message;
    });

    res.status(400).json({
      error: 'ValidationError',
      message: 'Validation failed',
      details: { errors },
    });
    return;
  }

  // Handle custom HTTP errors
  if (error instanceof HttpError) {
    res.status(error.statusCode).json(error.toJSON());
    return;
  }

  // Handle unknown errors
  const internalError = new InternalServerError(
    config.isProduction ? 'An unexpected error occurred' : error.message
  );

  res.status(internalError.statusCode).json(internalError.toJSON());
};
