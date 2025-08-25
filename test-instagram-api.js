#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'alive', time: new Date().toISOString() });
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

// Proxy endpoint pour les images Instagram
app.get('/api/proxy/image', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    console.log('🖼️ Proxy image request for:', url);
    
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
    console.error('Error proxying image:', error);
    res.status(500).send('Error fetching image');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Test Instagram API Server
📍 Port: ${PORT}
✅ Endpoints:
   - GET  http://localhost:${PORT}/api/health
   - POST http://localhost:${PORT}/api/social/instagram-thumbnail

🧪 Testez maintenant sur:
   http://localhost:3002/test-instagram-direct.html
  `);
});