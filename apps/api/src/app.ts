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
import { createAuthMiddleware } from './middleware/auth.middleware.js';
import { userRateLimit } from './middleware/userRateLimit.js';

// Routes (synchronous; v1Router is loaded lazily below to avoid boot blocking)
import { healthRouter } from './routes/health.js';
import { createAssistantStreamRouter } from './routes/assistant.js';
import { parseVideoRecipeRouter } from './routes/parseVideoRecipe.js';
import { createInstagramRouter } from './routes/instagram.js';
import { proxyRouter } from './routes/proxy.js';
import { createImportsSocialRouter } from './routes/imports.social.js';
import { createMediaRouter } from './routes/media.js';
import { createAssistantAgentRouter } from './routes/assistant.agent.js';
import { createAssistantMemoryRouter } from './routes/assistant.memory.js';
import { createProductsIntelligenceRouter } from './routes/products.intelligence.js';
import { createMetricsRouter } from './routes/metrics.js';
import { supabaseAdmin } from './config/supabase.js';
import {
  defaultExtractionService,
  saveImportedDraftAsRecipe,
} from './services/imports/index.js';

const assistantRateLimit = () => rateLimit({ windowMs: 60_000, max: 30 });

export interface CreateAppOptions {
  /**
   * If true, skip the lazy load of /api/v1 (repository-pattern routes)
   * to keep tests deterministic. Defaults to false.
   */
  skipLazyV1?: boolean;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  // One proxy hop in front of the app (Render). req.ip is then the
  // address that proxy saw, not a client-supplied X-Forwarded-For entry.
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  const requireUser = createAuthMiddleware(supabaseAdmin as any);
  const parseVideoLimit = userRateLimit({ key: 'parse-video-recipe', freeMax: 30, premiumMax: 300, windowMs: 3_600_000 });
  const assistantStreamRouter = createAssistantStreamRouter(supabaseAdmin);
  const instagramRouter = createInstagramRouter(supabaseAdmin);

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
      },
      timestamp: new Date().toISOString(),
    });
  });
  app.get('/favicon.ico', (_req, res) => res.status(204).end());

  // === Stable routes (no version prefix) ===
  app.use('/api/health', healthRouter);
  app.use('/api/parse-video-recipe', requireUser, parseVideoLimit, parseVideoRecipeRouter);
  app.use('/api/social/instagram', instagramRouter);
  app.use('/api/assistant', assistantRateLimit(), assistantStreamRouter);
  app.use('/api/proxy', proxyRouter);
  app.use(
    '/api/imports/social',
    createImportsSocialRouter(supabaseAdmin, {
      extractionService: defaultExtractionService(),
      // PRP-220.16: persist saved drafts as real `recipes` rows via the
      // SECURITY INVOKER RPC.
      saveImportedDraftAsRecipe,
    })
  );
  app.use('/api/media', createMediaRouter(supabaseAdmin));
  // PRP-221: voice / text agent — sub-paths only, doesn't collide with
  // the chat-streaming `assistantRouter` mounted on '/' above.
  app.use('/api/assistant', createAssistantAgentRouter(supabaseAdmin));
  // PRP-223 PR2: memory CRUD (conversations, messages, memories).
  // Mounts disjoint sub-paths to keep the existing routers untouched.
  app.use('/api/assistant', createAssistantMemoryRouter(supabaseAdmin));
  // PRP-225 PR4: Product Intelligence proxy (OpenFoodFacts + cache).
  // Centralises every OFF call server-side ; the front-end speaks to
  // this router instead of contacting OpenFoodFacts directly.
  app.use('/api/products', createProductsIntelligenceRouter(supabaseAdmin));
  // PRP-220.15: Prometheus metrics. Auth via METRICS_AUTH_TOKEN bearer
  // (constant-time compare). Mounted last so it never collides with a
  // public catch-all.
  app.use('/api/metrics', createMetricsRouter());

  // === v1 aliases (same handlers, versioned path) ===
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/parse-video-recipe', requireUser, parseVideoLimit, parseVideoRecipeRouter);
  app.use('/api/v1/social/instagram', instagramRouter);
  app.use('/api/v1/assistant', assistantRateLimit(), assistantStreamRouter);
  app.use('/api/v1/proxy', proxyRouter);
  app.use(
    '/api/v1/imports/social',
    createImportsSocialRouter(supabaseAdmin, {
      extractionService: defaultExtractionService(),
    })
  );
  app.use('/api/v1/media', createMediaRouter(supabaseAdmin));
  app.use('/api/v1/assistant', createAssistantAgentRouter(supabaseAdmin));
  app.use('/api/v1/assistant', createAssistantMemoryRouter(supabaseAdmin));

  // === Diagnostics: list mounted routes (dev/non-production only) ===
  // Useful for debugging route mounting and for the no-404 contract test.
  // Hidden in production to avoid leaking routing details.
  app.get('/api/diagnostics/routes', (_req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: 'Route not found',
        code: 'ROUTE_NOT_FOUND',
      });
    }
    const routes = listMountedRoutes(app);
    return res.json({ success: true, data: { count: routes.length, routes } });
  });

  // === Repository-pattern v1 routes (lazy to avoid boot-time blocking) ===
  //
  // FIX: lazy `.then(app.use(...))` was racing with the 404 handler below.
  // Express middleware order = registration order; the 404 handler was
  // registered SYNC before the lazy import resolved, so the late
  // `app.use('/api/v1', v1Router)` landed AFTER the 404 catch-all and
  // never matched. We now register deferred-handler proxies up-front
  // (before the 404 handler) and swap in the real router when the
  // dynamic import resolves.
  type DeferredHandler = express.RequestHandler;
  let v1Handler: DeferredHandler | null = null;
  let adminHandler: DeferredHandler | null = null;

  if (!options.skipLazyV1) {
    app.use('/api/v1', (req, res, next) => {
      if (v1Handler) return v1Handler(req, res, next);
      return res.status(503).json({
        success: false,
        error: 'API initializing, retry shortly',
        code: 'V1_NOT_READY',
      });
    });

    app.use('/api/admin', (req, res, next) => {
      if (adminHandler) return adminHandler(req, res, next);
      return res.status(503).json({
        success: false,
        error: 'API initializing, retry shortly',
        code: 'ADMIN_NOT_READY',
      });
    });

    import('./routes/v1.js')
      .then(({ v1Router }) => {
        v1Handler = v1Router as unknown as DeferredHandler;
        console.log('✓ v1Router (repository-pattern) loaded');
      })
      .catch((error) => {
        console.error('✗ Failed to load v1Router:', error);
        console.warn('⚠️  Repository-pattern routes are not available');
      });

    // === Admin routes (token-protected, service-role ops) ===
    Promise.all([
      import('express'),
      import('./routes/admin.deletions.routes.js'),
      import('./middleware/adminAuth.middleware.js'),
      import('./config/supabase.js'),
    ])
      .then(([expressMod, deletionsMod, authMod, supabaseMod]) => {
        const adminRouter = expressMod.Router();
        adminRouter.use(authMod.createAdminAuthMiddleware());
        adminRouter.use(
          '/deletions',
          deletionsMod.createAdminDeletionsRouter(supabaseMod.supabaseAdmin),
        );
        adminHandler = adminRouter as unknown as DeferredHandler;
        console.log('✓ adminRouter loaded');
      })
      .catch((error) => {
        console.error('✗ Failed to load adminRouter:', error);
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

/**
 * Walk the Express router stack and return a flat list of mounted routes.
 * Used by `/api/diagnostics/routes` and by the no-404 contract test.
 *
 * Express 4 exposes the stack as `app._router.stack`.
 * Express 5 exposes it as `app.router.stack`.
 * We accept either to stay forward-compatible.
 */
function listMountedRoutes(app: Express): Array<{ method: string; path: string }> {
  const out: Array<{ method: string; path: string }> = [];
  const router = (app as any)._router ?? (app as any).router;
  const stack = router?.stack ?? [];

  function walk(layerStack: any[], prefix: string): void {
    for (const layer of layerStack) {
      if (layer.route) {
        const path = prefix + (layer.route.path ?? '');
        const methods = layer.route.methods ?? layer.route._methods ?? {};
        for (const method of Object.keys(methods)) {
          if (method === '_all') continue;
          out.push({ method: method.toUpperCase(), path });
        }
      } else if ((layer.name === 'router' || layer.handle?.stack) && layer.handle?.stack) {
        walk(layer.handle.stack, prefix + extractMountPath(layer));
      }
    }
  }

  walk(stack, '');
  return out.sort((a, b) => (a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path)));
}

function extractMountPath(layer: any): string {
  // Express stores the mount prefix in different shapes depending on version.
  // 1) layer.path (Express 5)
  if (typeof layer?.path === 'string' && layer.path.length > 0) {
    return layer.path === '/' ? '' : layer.path;
  }
  // 2) layer.regexp pattern (Express 4): '^\\/api\\/health\\/?(?=\\/|$)'
  const src: string = layer?.regexp?.source ?? '';
  const match = src.match(/^\^\\?\/?(.*?)\\\/\?\(\?=\\\/\|\$\)/);
  if (match) return '/' + match[1].replace(/\\\//g, '/');
  // 3) layer.regexp.fast_slash (root-level middleware) -> empty prefix
  return '';
}
