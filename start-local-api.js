#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 3003;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));

// Set longer timeout for all requests (60 seconds)
app.use((req, res, next) => {
  res.setTimeout(60000, () => {
    console.error('Request timeout for:', req.path);
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'dist')));

// Import the extract recipe handlers
const extractRecipeHandler = (await import('./api/extract-recipe.js')).default;
const extractRecipeOptimizedHandler = (await import('./api/extract-recipe-ultra-optimized.js')).default;
const healthHandler = (await import('./api/health.js')).default;
const instagramOEmbedHandler = (await import('./api/social-instagram-oembed.js')).default;
const parseVideoRecipeHandler = (await import('./api/parse-video-recipe.js')).default;
const aiAssistantHandler = (await import('./api/ai-assistant-enhanced.js')).default;

// API Routes
app.post('/api/extract-recipe', extractRecipeHandler);
app.post('/api/extract-recipe-ultra-optimized', extractRecipeOptimizedHandler);
app.get('/api/health', healthHandler);

// Social media endpoints
app.post('/api/social/instagram-oembed', instagramOEmbedHandler);

// Video parser endpoint
app.post('/api/parse-video-recipe', parseVideoRecipeHandler);

// AI Assistant endpoint
app.post('/api/ai-assistant-enhanced', aiAssistantHandler);

// Catch-all handler: send back React's index.html file for any non-API routes
app.get(/^(?!\/api\/).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Smart Pantry Pro is running!
📍 Application: http://localhost:${PORT}
🧪 Test Page: http://localhost:${PORT}/video-test
📌 API Endpoints:
   - POST http://localhost:${PORT}/api/extract-recipe
   - POST http://localhost:${PORT}/api/extract-recipe-ultra-optimized
   - GET  http://localhost:${PORT}/api/health
   - POST http://localhost:${PORT}/api/social/instagram-oembed
   - POST http://localhost:${PORT}/api/parse-video-recipe 🎥 NEW!

💡 Keep this terminal open while developing.
  `);
});