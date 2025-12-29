/**
 * Index progressif - charge les routes par étapes
 * Pour identifier quel import cause le blocage
 */
import express from 'express';
import dotenv from 'dotenv';

console.log('1. Chargement dotenv...');
dotenv.config({ path: '.env' });
console.log('✓ Dotenv chargé');

console.log('2. Import middlewares basiques...');
import { corsMiddleware } from './middleware/cors.js';
import { securityMiddleware } from './middleware/security.js';
import { requestIdHeader } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
console.log('✓ Middlewares basiques chargés');

console.log('3. Import routes simples...');
import { healthRouter } from './routes/health.js';
console.log('✓ Routes simples chargées');

console.log('4. Configuration Express...');
const app = express();
app.use(express.json({ limit: '1mb' }));

// Middlewares
app.use(corsMiddleware);
app.use(securityMiddleware);
app.use(requestIdHeader);

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'Smart Pantry API - Progressive',
    version: '1.0.0',
    status: 'running ✓',
    loadedModules: [
      'middlewares (cors, security, requestId)',
      'routes (health)'
    ],
    timestamp: new Date().toISOString()
  });
});

app.use('/api/health', healthRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use(errorHandler);

console.log('✓ Express configuré');

const PORT = process.env.PORT || 3030;

app.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎉 Smart Pantry API démarré!`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
