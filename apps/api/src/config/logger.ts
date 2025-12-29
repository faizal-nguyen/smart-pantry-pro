/**
 * Structured logging with Pino
 * Provides consistent, queryable logs for production monitoring
 */

import pino from 'pino';

// Configure log level from environment (default: info)
const logLevel = process.env.LOG_LEVEL || 'info';

// Pretty print in development, JSON in production
const prettyPrint = process.env.LOG_PRETTY_PRINT === 'true' || process.env.NODE_ENV === 'development';

/**
 * Main application logger
 * Use this instead of console.log for all logging
 */
export const logger = pino({
  level: logLevel,
  transport: prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  redact: {
    paths: [
      // Redact sensitive fields from logs
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'apiKey',
      'secret',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    remove: true,
  },
});

/**
 * Create a child logger with additional context
 * Example: const log = createLogger({ service: 'InventoryService' })
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log an error with stack trace and context
 */
export function logError(error: Error | unknown, context?: Record<string, any>) {
  if (error instanceof Error) {
    logger.error(
      {
        err: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        ...context,
      },
      'Error occurred'
    );
  } else {
    logger.error({ error, ...context }, 'Unknown error occurred');
  }
}

/**
 * Log a security event (authentication, authorization, etc.)
 */
export function logSecurityEvent(
  event: string,
  userId?: string,
  details?: Record<string, any>
) {
  logger.warn(
    {
      event,
      userId,
      security: true,
      ...details,
    },
    `Security event: ${event}`
  );
}

/**
 * Log a database operation
 */
export function logDatabaseOperation(
  operation: string,
  table: string,
  duration?: number,
  error?: Error
) {
  const log = {
    operation,
    table,
    duration,
    database: true,
  };

  if (error) {
    logger.error({ ...log, err: error }, `Database operation failed: ${operation} on ${table}`);
  } else {
    logger.debug(log, `Database operation: ${operation} on ${table}`);
  }
}

/**
 * Log an HTTP request
 * Note: Use pino-http middleware instead for automatic request logging
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  logger.info(
    {
      method,
      path,
      statusCode,
      duration,
      userId,
      http: true,
    },
    `${method} ${path} ${statusCode} - ${duration}ms`
  );
}

export default logger;
