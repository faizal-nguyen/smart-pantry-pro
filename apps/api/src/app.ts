/**
 * Smart Pantry API - Express app factory.
 *
 * PRP-220.04: extracted from index.ts so tests (PRP-220.05) and the
 * production boot can both use the same wiring without competing for
 * a TCP port.
 *
 * Side-effect-free: this module never calls listen(), never reads PORT.
 * The companion `index.ts` is the only place that binds a port.
 */
import express, { type Express } from 'express';

// Middlewares
// Note (PRP-220.04): pino-http loggerMiddleware is intentionally not
// imported here. It currently throws "caller is not a function" on
// Node 24 due to a transitive peer-dep mismatch. The original index.ts
// also never used it. Re-introduce once pino-http is upgraded.
import { corsMiddleware } from './middleware/cors.js';
import { securityMiddleware } from './middleware/security.js';
import { requestIdHeader } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimit } from './middleware/rateLimit.js';
import { env } from './config/env.js';

// Routes (synchronous; v1Router is loaded lazily below to avoid boot blocking)
import { healthRouter } from './routes/health.js';
import { assistantRouter, assistantCompatRouter } from './routes/assistant.js';
import { parseVideoRecipeRouter } from './routes/parseVideoRecipe.js';
import { youtubeExtractRouter } from './routes/youtubeExtract.js';
import { transcribeYoutubeRouter } from './routes/transcribeYoutube.js';
import { shoppingParseTextRouter } from './routes/shoppingParseText.js';
import { shoppingTranscribeRouter } from './routes/shoppingTranscribe.js';
import { shoppingItemsBatchRouter } from './routes/shoppingItemsBatch.js';
import { instagramRouter } from './routes/instagram.js';
import { proxyRouter } from './routes/proxy.js';
import { diagnosticsRouter } from './routes/diagnostics.js';

const ytRateLimit = () =>
  rateLimit({
    windowMs: env.RATE_LIMIT_YT_WINDOW_MS || 60_000,
    max: env.RATE_LIMIT_YT_MAX || 30,
  });

const assistantRateLimit = () => rateLimit({ windowMs: 60_000, max: 30 });

export interface RealtimeStatus {
  enabled: boolean;
  connectedClients: number;
}

export interface CreateAppOptions {
  /**
   * If true, skip the lazy load of /api/v1 (repository-pattern routes)
   * to keep tests deterministic. Defaults to false.
   */
  skipLazyV1?: boolean;
  /**
   * Optional getter for the WebSocket realtime status. When provided,
   * `GET /api/realtime/status` returns its result. Wired by `index.ts`
   * after the realtime service has lazily initialised.
   */
  realtimeStatus?: () => RealtimeStatus;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Middlewares
  app.use(corsMiddleware);
  app.use(securityMiddleware);
  app.use(requestIdHeader);

  // Root metadata
  app.get('/', (_req, res) => {
    res.json({
      name: 'Smart Pantry API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/api/health',
        v1: '/api/v1',
        assistant: '/api/assistant/stream',
        diagnostics: '/api/diagnostics',
      },
      timestamp: new Date().toISOString(),
    });
  });
  app.get('/favicon.ico', (_req, res) => res.status(204).end());

  // === Stable routes (no version prefix) ===
  app.use('/api/health', healthRouter);
  app.use('/api/parse-video-recipe', parseVideoRecipeRouter);
  app.use('/api/youtube-extract', ytRateLimit(), youtubeExtractRouter);
  app.use('/api/transcribe-youtube', ytRateLimit(), transcribeYoutubeRouter);
  app.use('/api/shopping/parse-text', shoppingParseTextRouter);
  app.use('/api/shopping/transcribe', shoppingTranscribeRouter);
  app.use('/api/shopping/items/batch', shoppingItemsBatchRouter);
  app.use('/api/social/instagram', instagramRouter);
  app.use('/api/assistant', assistantRateLimit(), assistantRouter);
  app.use('/api/ai-assistant-enhanced', assistantRateLimit(), assistantCompatRouter);
  app.use('/api/proxy', proxyRouter);
  app.use('/api/diagnostics', diagnosticsRouter);

  // === v1 aliases (same handlers, versioned path) ===
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/parse-video-recipe', parseVideoRecipeRouter);
  app.use('/api/v1/youtube-extract', ytRateLimit(), youtubeExtractRouter);
  app.use('/api/v1/transcribe-youtube', ytRateLimit(), transcribeYoutubeRouter);
  app.use('/api/v1/shopping/parse-text', shoppingParseTextRouter);
  app.use('/api/v1/shopping/transcribe', shoppingTranscribeRouter);
  app.use('/api/v1/shopping/items/batch', shoppingItemsBatchRouter);
  app.use('/api/v1/social/instagram', instagramRouter);
  app.use('/api/v1/assistant', assistantRateLimit(), assistantRouter);
  app.use('/api/v1/ai-assistant-enhanced', assistantRateLimit(), assistantCompatRouter);
  app.use('/api/v1/proxy', proxyRouter);
  app.use('/api/v1/diagnostics', diagnosticsRouter);

  // === Realtime status (optional, only when index.ts wires it) ===
  if (options.realtimeStatus) {
    app.get('/api/realtime/status', (_req, res) => {
      const status = options.realtimeStatus!();
      res.json({
        success: true,
        websocket: {
          enabled: status.enabled,
          connectedClients: status.connectedClients,
          transports: ['websocket', 'polling'],
        },
        timestamp: new Date().toISOString(),
      });
    });
  }

  // === Repository-pattern v1 routes (lazy to avoid boot-time blocking) ===
  if (!options.skipLazyV1) {
    import('./routes/v1.js')
      .then(({ v1Router }) => {
        app.use('/api/v1', v1Router);
        console.log('✓ v1Router (repository-pattern) loaded');
      })
      .catch((error) => {
        console.error('✗ Failed to load v1Router:', error);
        console.warn('⚠️  Repository-pattern routes are not available');
      });
  }

  // 404 handler (registered last, before error handler)
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      code: 'ROUTE_NOT_FOUND',
      path: req.path,
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
