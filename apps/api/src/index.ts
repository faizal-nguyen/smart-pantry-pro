/**
 * Smart Pantry API - Version Stable
 * With WebSocket real-time support
 */
import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { realtimeService } from './services/websocket/realtimeService.js';

// Charger .env
dotenv.config({ path: '.env' });

console.log('✓ Configuration chargée');

// Imports middlewares
import { corsMiddleware } from './middleware/cors.js';
import { securityMiddleware } from './middleware/security.js';
import { requestIdHeader } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';

// Imports routes
import { healthRouter } from './routes/health.js';
import { v1Router } from './routes/v1.js';
import { assistantRouter, assistantCompatRouter } from './routes/assistant.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Middlewares
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
      inventory: '/api/v1/inventory',
      recipes: '/api/v1/recipes',
      shopping: '/api/v1/shopping',
      users: '/api/v1/users',
      assistant: '/api/assistant/stream'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health check
app.use('/api/health', healthRouter);
app.use('/api/v1/health', healthRouter);

// API v1 Routes (avec auth middleware intégré)
app.use('/api/v1', v1Router);

// Assistant AI Routes
app.use('/api/assistant', assistantRouter);
app.use('/api/ai-assistant-enhanced', assistantCompatRouter); // Legacy compatibility

console.log('✓ Routes API activées');

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.path,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/v1/health',
      'GET/POST /api/v1/inventory',
      'GET/POST /api/v1/recipes',
      'GET/POST /api/v1/shopping',
      'GET /api/v1/users/me',
      'POST /api/assistant/stream'
    ]
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3030;

// Create HTTP server for Express + Socket.io
const httpServer = createServer(app);

// Initialize WebSocket real-time service
const io = realtimeService.initialize(httpServer);

// WebSocket status endpoint
app.get('/api/realtime/status', (req, res) => {
  res.json({
    success: true,
    websocket: {
      enabled: true,
      connectedClients: realtimeService.getConnectedUsersCount(),
      transports: ['websocket', 'polling']
    },
    timestamp: new Date().toISOString()
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎉 Smart Pantry API opérationnelle!`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`✅ Serveur HTTP + WebSocket prêt`);
  console.log(`⚙️  Routes additionnelles à activer progressivement\n`);
});

export { io, realtimeService };
export default app;
