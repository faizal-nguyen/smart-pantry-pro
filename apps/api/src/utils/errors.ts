/**
 * Standardized error classes and error handling utilities
 * CRITIQUE #9: Provides consistent error responses across the API
 */

/**
 * Base API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request', code?: string, details?: any) {
    super(400, message, code || 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(401, message, code || 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', code?: string) {
    super(403, message, code || 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(404, message, code || 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', code?: string, details?: any) {
    super(409, message, code || 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

/**
 * 422 Unprocessable Entity (Validation Error)
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(422, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * 429 Too Many Requests
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(429, message, 'RATE_LIMIT_EXCEEDED', retryAfter ? { retryAfter } : undefined);
    this.name = 'RateLimitError';
  }
}

/**
 * 500 Internal Server Error
 */
/** What the browser reads for an unexpected error; the detail stays in the server logs. */
export const UNEXPECTED_ERROR_MESSAGE = 'Une erreur est survenue. Réessaie dans un instant.';

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', code?: string) {
    super(500, message, code || 'INTERNAL_ERROR');
    this.name = 'InternalServerError';
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable', code?: string) {
    super(503, message, code || 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Check if an error is an API error
 */
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Convert any error to a standardized API error
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  // The status is inferred from the message, never the message itself: it can name a table, a
  // column, a constraint or a path (audit 2026-11-07, security P2 8). errorHandler logs it.
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return new NotFoundError('Élément introuvable.');
    }
    if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      return new UnauthorizedError('Reconnecte-toi pour continuer.');
    }
    if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      return new ConflictError('Cet élément existe déjà.');
    }
  }
  return new InternalServerError(UNEXPECTED_ERROR_MESSAGE);
}
