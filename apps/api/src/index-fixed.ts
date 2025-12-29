/**
 * Smart Pantry API - Version Fixée
 * Utilise le lazy loading pour éviter le blocage au démarrage
 */
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Charger .env
dotenv.config({ path: '.env' });

console.log('✓ Variables d\'environnement chargées');

// Imports synchrones (middlewares et routes simples)
import { healthRouter } from './routes/health.js';
import { parseVideoRecipeRouter } from './routes/parseVideoRecipe.js';
import { youtubeExtractRouter } from './routes/youtubeExtract.js';
import { transcribeYoutubeRouter } from './routes/transcribeYoutube.js';
import { shoppingParseTextRouter } from './routes/shoppingParseText.js';
import { shoppingTranscribeRouter } from './routes/shoppingTranscribe.js';
import { shoppingItemsBatchRouter } from './routes/shoppingItemsBatch.js';
import { instagramRouter } from './routes/instagram.js';
import { corsMiddleware } from './middleware/cors.js';
import { securityMiddleware } from './middleware/security.js';
import { loggerMiddleware } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestIdHeader } from './middleware/requestId.js';
import { rateLimit } from './middleware/rateLimit.js';
import { env } from './config/env.js';
import { assistantRouter, assistantCompatRouter } from './routes/assistant.js';
import { proxyRouter } from './routes/proxy.js';
import { diagnosticsRouter } from './routes/diagnostics.js';

console.log('✓ Modules basiques chargés');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Middlewares
app.use(loggerMiddleware);
app.use(corsMiddleware);
app.use(securityMiddleware);
app.use(requestIdHeader);

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'Smart Pantry API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      v1: '/api/v1'
    }
  });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Routes stables
app.use('/api/health', healthRouter);
app.use('/api/parse-video-recipe', parseVideoRecipeRouter);
app.use('/api/youtube-extract', rateLimit({ windowMs: env.RATE_LIMIT_YT_WINDOW_MS || 60_000, max: env.RATE_LIMIT_YT_MAX || 30 }), youtubeExtractRouter);
app.use('/api/transcribe-youtube', rateLimit({ windowMs: env.RATE_LIMIT_YT_WINDOW_MS || 60_000, max: env.RATE_LIMIT_YT_MAX || 30 }), transcribeYoutubeRouter);
app.use('/api/shopping/parse-text', shoppingParseTextRouter);
app.use('/api/shopping/transcribe', shoppingTranscribeRouter);
app.use('/api/shopping/items/batch', shoppingItemsBatchRouter);
app.use('/api/social/instagram', instagramRouter);
app.use('/api/assistant', rateLimit({ windowMs: 60_000, max: 30 }), assistantRouter);
app.use('/api/ai-assistant-enhanced', rateLimit({ windowMs: 60_000, max: 30 }), assistantCompatRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/diagnostics', diagnosticsRouter);

// Aliases v1
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/parse-video-recipe', parseVideoRecipeRouter);
app.use('/api/v1/youtube-extract', rateLimit({ windowMs: env.RATE_LIMIT_YT_WINDOW_MS || 60_000, max: env.RATE_LIMIT_YT_MAX || 30 }), youtubeExtractRouter);
app.use('/api/v1/transcribe-youtube', rateLimit({ windowMs: env.RATE_LIMIT_YT_WINDOW_MS || 60_000, max: env.RATE_LIMIT_YT_MAX || 30 }), transcribeYoutubeRouter);
app.use('/api/v1/shopping/parse-text', shoppingParseTextRouter);
app.use('/api/v1/shopping/transcribe', shoppingTranscribeRouter);
app.use('/api/v1/shopping/items/batch', shoppingItemsBatchRouter);
app.use('/api/v1/social/instagram', instagramRouter);
app.use('/api/v1/assistant', rateLimit({ windowMs: 60_000, max: 30 }), assistantRouter);
app.use('/api/v1/ai-assistant-enhanced', rateLimit({ windowMs: 60_000, max: 30 }), assistantCompatRouter);
app.use('/api/v1/proxy', proxyRouter);
app.use('/api/v1/diagnostics', diagnosticsRouter);

// Routes v1 avec Repository Pattern (LAZY LOADED)
// Chargé de manière asynchrone pour éviter le blocage au démarrage
console.log('⏳ Chargement asynchrone de v1Router...');
import('./routes/v1.js')
  .then(({ v1Router }) => {
    app.use('/api/v1', v1Router);
    console.log('✓ v1Router chargé (repository-based routes disponibles)');
  })
  .catch((error) => {
    console.error('✗ Erreur lors du chargement de v1Router:', error);
    console.warn('⚠️  Les routes repository-based ne sont pas disponibles');
  });

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.path,
  });
});

// Error handler (doit être en dernier)
app.use(errorHandler);

// Démarrage
const isMain = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return process.argv[1] && thisFile === process.argv[1];
  } catch {
    return false;
  }
})();

if (isMain) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎉 Smart Pantry API démarré!`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  });
}

export default app;
