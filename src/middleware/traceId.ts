import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Locals {
      traceId: string;
    }
  }
}

/**
 * Middleware: generates or forwards a traceId for every request.
 * Checks X-Trace-Id header first, falls back to generating a new UUID v4.
 * Attaches to res.locals.traceId and sets X-Trace-Id response header.
 */
export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-trace-id'];
  const traceId = (Array.isArray(incoming) ? incoming[0] : incoming) || uuidv4();

  res.locals['traceId'] = traceId;
  res.setHeader('X-Trace-Id', traceId);

  next();
}
