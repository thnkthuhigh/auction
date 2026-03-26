import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error('Unhandled request error', {
    method: req.method,
    path: req.originalUrl,
    error: err,
  });

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};

    err.errors.forEach((e) => {
      const key = e.path.join('.');
      errors[key] = errors[key] || [];
      errors[key].push(e.message);
    });

    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
    return;
  }

  const status = (err as { statusCode?: number }).statusCode || 500;

  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : err.message,
  });
}

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
