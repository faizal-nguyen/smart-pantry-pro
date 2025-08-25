#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import VideoParserService from './api/videoParserService.js';
import parseTextHandler from './api/shopping/parse-text.js';
import transcribeHandler from './api/shopping/transcribe.js';
import batchHandler from './api/shopping/items/batch.js';
import extractRecipeUltraOptimized from './api/extract-recipe-ultra-optimized.js';
import youtubeExtractHandler from './api/youtube-extract.js';
import youtubeExtractEnhancedHandler from './api/youtube-extract-enhanced.js';
import transcribeYoutubeHandler from './api/transcribe-youtube.js';
import { spawn } from 'child_process';

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

// Set longer timeout for all requests (5 minutes for YouTube extraction)
app.use((req, res, next) => {
  // YouTube extraction needs more time
  const timeout = req.path.includes('youtube-extract') ? 600000 : 60000; // 10 min for YouTube, 1 min for others
  res.setTimeout(timeout, () => {
    console.error('Request timeout for:', req.path);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Simple health check that always works
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'alive',
    time: new Date().toISOString(),
    message: 'API is working!'
  });
});

// Real parse-video-recipe endpoint using VideoParserService
app.post('/api/parse-video-recipe', async (req, res) => {
  console.log('🎬 Parse video recipe requested');
  console.log('📹 Video URL:', req.body.videoUrl);
  
  const { videoUrl } = req.body;
  
  if (!videoUrl) {
    return res.status(400).json({ error: 'Video URL is required' });
  }
  
  try {
    // Use the real VideoParserService
    const parser = new VideoParserService();
    const recipe = await parser.parseInstagramReel(videoUrl);
    
    console.log('✅ Recipe extracted successfully:', recipe.title);
    
    // Format the response to match the frontend expectations
    const formattedRecipe = {
      title: recipe.title,
      description: recipe.description,
      cookingTime: parseInt(recipe.metadata?.duration) || 30,
      prepTime: 15,
      servings: recipe.metadata?.servings || 4,
      difficulty: "Moyen",
      category: "Plat principal",
      ingredients: recipe.ingredients.map(ing => ({
        name: ing.name,
        quantity: parseFloat(ing.amount) || 1,
        unit: ing.unit
      })),
      instructions: recipe.instructions.map(inst => ({
        step: inst.step,
        instruction: inst.description,
        description: inst.description
      })),
      tags: ["instagram", "vidéo", "extrait"],
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      },
      metadata: {
        ...recipe.metadata,
        logs: parser.getLogs() // Include detailed logs for debugging
      }
    };
    
    res.json({
      success: true,
      data: formattedRecipe,
      processingTime: recipe.metadata?.processingTime || "0ms"
    });
    
  } catch (error) {
    console.error('❌ Video parsing error:', error);
    
    // Check if it's a demo mode or missing API keys
    if (error.message.includes('API key not found') || error.message.includes('DEMO_MODE')) {
      console.log('🎯 API keys missing, using demo mode');
      
      // Return a demo recipe
      const demoRecipe = {
        title: "Poulet Teriyaki (Demo)",
        description: "Mode démonstration - Configurez DEEPGRAM_API_KEY et OPENAI_API_KEY pour activer l'extraction réelle",
        cookingTime: 25,
        prepTime: 15,
        servings: 4,
        difficulty: "Moyen",
        category: "Plat principal",
        ingredients: [
          { name: "Poulet", quantity: 600, unit: "g" },
          { name: "Sauce soja", quantity: 60, unit: "ml" },
          { name: "Miel", quantity: 3, unit: "cuillères à soupe" }
        ],
        instructions: [
          { step: 1, instruction: "Couper le poulet", description: "Couper le poulet" },
          { step: 2, instruction: "Préparer la sauce", description: "Préparer la sauce" },
          { step: 3, instruction: "Cuire et servir", description: "Cuire et servir" }
        ],
        metadata: {
          extractionMethod: "demo_mode",
          note: "Configurez les clés API dans .env.local pour activer l'extraction réelle"
        }
      };
      
      return res.json({
        success: true,
        data: demoRecipe,
        message: "Mode démonstration - API keys manquantes"
      });
    }
    
    res.status(500).json({ 
      error: error.message,
      details: "Erreur lors de l'extraction de la recette vidéo"
    });
  }
});

// Shopping endpoints for Smart Grocery Input

app.post('/api/shopping/parse-text', async (req, res) => {
  try {
    console.log('📝 Parse text requested');
    await parseTextHandler(req, res);
  } catch (error) {
    console.error('❌ Parse text error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/shopping/transcribe', async (req, res) => {
  try {
    console.log('🎤 Transcribe requested');
    await transcribeHandler(req, res);
  } catch (error) {
    console.error('❌ Transcribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/shopping/items/batch', async (req, res) => {
  try {
    console.log('📦 Batch add items requested');
    await batchHandler(req, res);
  } catch (error) {
    console.error('❌ Batch add error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Extract recipe ultra optimized endpoint
app.post('/api/extract-recipe-ultra-optimized', async (req, res) => {
  try {
    console.log('🍽️ Recipe extraction (ultra-optimized) requested');
    await extractRecipeUltraOptimized(req, res);
  } catch (error) {
    console.error('❌ Recipe extraction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// YouTube extraction endpoint - using enhanced version
app.post('/api/youtube-extract', async (req, res) => {
  try {
    console.log('🎬 YouTube extraction requested - using enhanced version');
    await youtubeExtractEnhancedHandler(req, res);
  } catch (error) {
    console.error('❌ YouTube extraction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// YouTube extraction enhanced endpoint
app.post('/api/youtube-extract-enhanced', async (req, res) => {
  try {
    console.log('🎬 YouTube extraction enhanced requested');
    await youtubeExtractEnhancedHandler(req, res);
  } catch (error) {
    console.error('❌ YouTube extraction enhanced error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// YouTube transcription endpoint
app.post('/api/transcribe-youtube', async (req, res) => {
  try {
    console.log('🎤 YouTube transcription requested');
    await transcribeYoutubeHandler(req, res);
  } catch (error) {
    console.error('❌ YouTube transcription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy endpoint pour les images Instagram (évite les problèmes CORS)
app.get('/api/proxy/image', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    console.log('🖼️ [Proxy] Image request for:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('[Proxy] Error fetching image:', error);
    res.status(500).send('Error fetching image');
  }
});

// Instagram thumbnail endpoint
app.post('/api/social/instagram-thumbnail', async (req, res) => {
  console.log('📸 Instagram thumbnail endpoint called');
  const { url } = req.body;

  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'Valid Instagram URL is required' });
  }

  try {
    const pythonScript = path.join(__dirname, 'api', 'instagram_metadata.py');
    
    const result = await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [pythonScript, url]);
      
      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error('[Instagram Thumbnail] Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        console.log(`[Instagram Thumbnail] Python process exited with code: ${code}`);
        
        if (code !== 0) {
          console.error('[Instagram Thumbnail] Python script failed:', error);
          reject(new Error(`Python script failed with code ${code}: ${error}`));
          return;
        }

        try {
          const parsedResult = JSON.parse(output);
          resolve(parsedResult);
        } catch (parseError) {
          console.error('[Instagram Thumbnail] Failed to parse Python output:', parseError);
          console.log('[Instagram Thumbnail] Raw output:', output);
          reject(parseError);
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('[Instagram Thumbnail] Failed to start Python process:', err.message);
        reject(err);
      });
    });
    
    console.log(`[Instagram Thumbnail] Result:`, { 
      success: result.success, 
      hasThumbnail: !!result.thumbnail_url,
      error: result.error 
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('[Instagram Thumbnail] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// AI Assistant Enhanced endpoint
app.post('/api/ai-assistant-enhanced', async (req, res) => {
  console.log('🤖 AI Assistant Enhanced endpoint called');
  
  try {
    // Pour l'instant, rediriger vers le serveur Next.js qui gère cette route
    // En production, vous pourriez vouloir implémenter la logique ici
    
    // Proxy vers le serveur Next.js sur le port 3002
    const proxyUrl = 'http://localhost:3002/api/ai-assistant-enhanced';
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      throw new Error(`Next.js API responded with ${response.status}`);
    }

    // Pour les réponses streaming, on forward directement
    if (response.headers.get('content-type')?.includes('text/stream') || 
        response.headers.get('content-type')?.includes('text/event-stream')) {
      
      // Copier les headers de streaming
      Object.entries(response.headers.raw()).forEach(([key, values]) => {
        res.setHeader(key, values);
      });
      
      // Streamer la réponse
      response.body.pipe(res);
    } else {
      // Pour les réponses JSON normales
      const data = await response.json();
      res.json(data);
    }

  } catch (error) {
    console.error('❌ AI Assistant Enhanced error:', error);
    res.status(500).json({
      error: 'AI Assistant service unavailable',
      message: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Smart Pantry Pro API Server is running!
📍 API Base URL: http://localhost:${PORT}
📌 Test endpoints:
   - GET  http://localhost:${PORT}/api/health
   - POST http://localhost:${PORT}/api/parse-video-recipe
   - POST http://localhost:${PORT}/api/youtube-extract
   - POST http://localhost:${PORT}/api/shopping/parse-text
   - POST http://localhost:${PORT}/api/shopping/transcribe
   - POST http://localhost:${PORT}/api/shopping/items/batch

💡 Keep this terminal open while developing.
  `);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port or stop the other process.`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});