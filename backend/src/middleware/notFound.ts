import { Request, Response, RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: 'NotFound',
    message: 'The requested resource was not found',
  });
};
