import type { Request, Response, NextFunction } from 'express';
import { isApiError, toApiError } from '../utils/errors.js';
import { logError } from '../config/logger.js';

/**
 * Global error handling middleware
 * Catches all errors and returns standardized API error responses
 *
 * CRITIQUE #9: Standardized error handling
 */
export function errorHandler(
  error: Error | unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Convert to standardized ApiError if not already
  const apiError = isApiError(error) ? error : toApiError(error);

  // Log error with context
  logError(error instanceof Error ? error : new Error(String(error)), {
    statusCode: apiError.statusCode,
    code: apiError.code,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
  });

  // Send standardized error response
  res.status(apiError.statusCode).json(apiError.toJSON());
}

