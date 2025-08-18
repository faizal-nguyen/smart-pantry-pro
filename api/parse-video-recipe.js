import dotenv from 'dotenv';
import VideoParserService from './videoParserService.js';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const handler = async (req, res) => {
  console.log('🎬 [API] Video recipe parser started');
  console.log('📝 [API] Request method:', req.method);
  console.log('📦 [API] Request body:', JSON.stringify(req.body, null, 2));
  
  // Simple CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.error('❌ [API] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl, platform } = req.body;
    const startTime = Date.now();
    
    console.log('🔗 [API] Video URL:', videoUrl);
    console.log('📱 [API] Platform:', platform || 'auto-detect');
    console.log('⏱️ [API] Start time:', new Date(startTime).toISOString());

    if (!videoUrl) {
      console.error('❌ [API] Missing video URL');
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Utiliser le vrai parser vidéo avec Deepgram
    console.log('🚀 [API] Processing video with real parser...');
    
    const videoParser = new VideoParserService();
    const detectedPlatform = platform || detectPlatform(videoUrl);
    
    let recipe;
    
    if (detectedPlatform === 'instagram') {
      console.log('📱 [API] Processing Instagram reel...');
      recipe = await videoParser.parseInstagramReel(videoUrl);
    } else {
      console.log('🎥 [API] Platform not fully supported yet, using fallback...');
      // Pour autres plateformes, on peut implémenter plus tard
      throw new Error(`Platform ${detectedPlatform} not fully supported yet`);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️ [API] Total time: ${processingTime}ms`);
    console.log('✅ [API] Recipe successfully extracted:', recipe.title);

    return res.status(200).json({
      success: true,
      data: recipe,
      processingTime: `${processingTime}ms`,
      debug: {
        totalTime: `${processingTime}ms`,
        platform: detectedPlatform,
        recipeFound: true,
        message: "Real recipe extraction completed",
        logs: videoParser.getLogs() // Ajouter les logs pour le frontend
      }
    });

  } catch (error) {
    console.error('❌ [API] Video parsing error:', error);
    console.error('💥 [API] Error stack:', error.stack);
    
    return res.status(500).json({
      error: 'Failed to parse video recipe',
      message: error.message,
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message
      }
    });
  }
}

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  return 'generic';
}

export default handler;