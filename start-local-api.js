#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import the extract recipe handlers
const extractRecipeHandler = (await import('./api/extract-recipe.js')).default;
const extractRecipeOptimizedHandler = (await import('./api/extract-recipe-ultra-optimized.js')).default;
const healthHandler = (await import('./api/health.js')).default;

// API Routes
app.post('/api/extract-recipe', extractRecipeHandler);
app.post('/api/extract-recipe-ultra-optimized', extractRecipeOptimizedHandler);
app.get('/api/health', healthHandler);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Local API server is running!
📍 URL: http://localhost:${PORT}
📌 Endpoints:
   - POST http://localhost:${PORT}/api/extract-recipe
   - POST http://localhost:${PORT}/api/extract-recipe-ultra-optimized
   - GET  http://localhost:${PORT}/api/health

💡 Keep this terminal open while developing.
  `);
});