import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '@shared/errors';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body'
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = target === 'body' ? req.body : target === 'query' ? req.query : req.params;
      const result = schema.parse(data);

      // Replace the request data with the parsed (and potentially transformed) result
      if (target === 'body') {
        req.body = result;
      } else if (target === 'query') {
        (req as unknown as { query: z.infer<T> }).query = result;
      } else {
        req.params = result;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(new BadRequestError('Invalid request data'));
      }
    }
  };
}

export const validateBody = <T extends ZodSchema>(schema: T) => validate(schema, 'body');
export const validateQuery = <T extends ZodSchema>(schema: T) => validate(schema, 'query');
export const validateParams = <T extends ZodSchema>(schema: T) => validate(schema, 'params');
