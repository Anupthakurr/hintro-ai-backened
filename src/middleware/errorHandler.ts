import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { sendError } from '../utils/response';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global centralized error handler.
 * Handles: AppError, ZodError (validation), Prisma errors, and unexpected errors.
 * Application will NEVER crash due to unhandled client errors.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const traceId = res.locals['traceId'] as string;

  // Known application error
  if (err instanceof AppError) {
    logger.warn('Application error', {
      traceId,
      code: err.code,
      message: err.message,
      path: req.path,
    });
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const message = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    logger.warn('Validation error', { traceId, issues: err.issues, path: req.path });
    sendError(res, 400, 'VALIDATION_ERROR', message);
    return;
  }

  // Prisma errors
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  ) {
    const prismaErr = err as { code: string; meta?: unknown };
    if (prismaErr.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Resource not found');
      return;
    }
    if (prismaErr.code === 'P2002') {
      sendError(res, 409, 'CONFLICT', 'A resource with this value already exists');
      return;
    }
  }

  // Unexpected errors — log fully, return generic message
  logger.error('Unexpected error', {
    traceId,
    path: req.path,
    method: req.method,
    error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });

  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
