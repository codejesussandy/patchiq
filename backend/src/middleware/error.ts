import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { HttpError, InternalServerError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { config } from '@config/index';

const logger = createLogger('error-handler');

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in non-test environments (use req.log for requestId context)
  if (!config.isTest) {
    const log = _req.log || logger;
    log.error(
      { err: error, method: _req.method, path: _req.originalUrl, statusCode: res.statusCode },
      'Request error'
    );
  }

  // Handle Multer file-size errors as 413
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'File exceeds the maximum allowed size of 10 MB',
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string> = {};
    error.errors.forEach((e) => {
      const path = e.path.join('.');
      errors[path] = e.message;
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { errors },
      },
    });
    return;
  }

  // Handle custom HTTP errors
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.error,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    });
    return;
  }

  // Handle unknown errors
  const internalError = new InternalServerError(
    config.isProduction ? 'An unexpected error occurred' : error.message
  );

  res.status(internalError.statusCode).json({
    success: false,
    error: {
      code: internalError.error,
      message: internalError.message,
    },
  });
};
