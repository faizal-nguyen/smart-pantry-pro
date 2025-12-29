import { Router, type Request, type Response } from 'express';

export const diagnosticsRouter = Router();

diagnosticsRouter.get('/', async (_req: Request, res: Response) => {
  const data = {
    status: 'ok',
    serverTime: new Date().toISOString(),
    env: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      videoProcessor: Boolean(process.env.VIDEO_PROCESSOR_URL),
      logLevel: process.env.LOG_LEVEL || 'info',
      allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
      rateLimit: {
        ytMax: Number(process.env.RATE_LIMIT_YT_MAX || 30),
        ytWindowMs: Number(process.env.RATE_LIMIT_YT_WINDOW_MS || 60000)
      },
      imageProxyHosts: (process.env.IMAGE_PROXY_HOSTS || 'instagram.com,cdninstagram.com,scontent.cdninstagram.com')
        .split(',').map(s => s.trim()).filter(Boolean)
    },
    versions: {
      node: process.version,
      env: process.env.NODE_ENV || 'development'
    }
  };

  res.json({ success: true, data });
});

