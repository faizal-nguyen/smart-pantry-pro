import pino from 'pino';
import pinoHttp from 'pino-http';
import crypto from 'crypto';

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
export const loggerMiddleware = (pinoHttp as unknown as (opts: any) => any)({
  logger,
  autoLogging: true,
  genReqId: () => crypto.randomUUID(),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-api-key'],
    censor: '***'
  }
});
