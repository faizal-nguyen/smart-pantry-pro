/**
 * HTTP request/response logging middleware using pino-http
 */

import * as pinoHttpModule from 'pino-http';
import { logger } from '../config/logger.js';
import type { Request, Response } from 'express';

// Handle both ESM and CJS exports
const pinoHttp = (pinoHttpModule as any).default || pinoHttpModule;

/**
 * Pino HTTP middleware for automatic request/response logging
 * Logs all HTTP requests with method, path, status code, and response time
 */
export const httpLogger = pinoHttp({
  logger,
  autoLogging: true,
  customLogLevel: (req: any, res: any, err?: Error) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    if (res.statusCode >= 300) {
      return 'info';
    }
    return 'info';
  },
  customSuccessMessage: (req: any, res: any) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req: any, res: any, err: Error) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      userId: (req as any).user?.id,
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
  },
});
