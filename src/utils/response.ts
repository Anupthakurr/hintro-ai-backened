import { Response } from 'express';

export interface ApiSuccess<T> {
  traceId: string;
  success: true;
  data: T;
}

export interface ApiError {
  traceId: string;
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Send a successful JSON response with the unified response envelope.
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const traceId = res.locals['traceId'] as string;
  const body: ApiSuccess<T> = { traceId, success: true, data };
  res.status(statusCode).json(body);
}

/**
 * Send an error JSON response with the unified response envelope.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void {
  const traceId = res.locals['traceId'] as string;
  const body: ApiError = { traceId, success: false, error: { code, message } };
  res.status(statusCode).json(body);
}

/**
 * Build a paginated data wrapper.
 */
export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedData<T> {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
