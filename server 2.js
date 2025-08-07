const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Import API handlers
const extractRecipe = require('./api/extract-recipe');
const extractRecipeOptimized = require('./api/extract-recipe-optimized');
const extractRecipesBatch = require('./api/extract-recipes-batch');
const health = require('./api/health');
const searchRecipes = require('./api/recipes/search');

// API Routes
app.post('/api/extract-recipe', (req, res) => {
  console.log('📥 Received request to /api/extract-recipe');
  extractRecipe(req, res);
});

app.post('/api/extract-recipe-optimized', (req, res) => {
  extractRecipeOptimized(req, res);
});

app.post('/api/extract-recipes-batch', (req, res) => {
  extractRecipesBatch(req, res);
});

app.get('/api/health', (req, res) => {
  health(req, res);
});

app.get('/api/recipes/search', (req, res) => {
  searchRecipes.default(req, res);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📡 Handling API requests at http://localhost:${PORT}/api/*`);
});