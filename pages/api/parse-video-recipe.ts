import { NextApiRequest, NextApiResponse } from 'next';
import { FastVideoParser } from '../../src/services/video/fastVideoParser';
import { rateLimiter } from '../../src/lib/rateLimiter';
import { corsHandler } from '../../src/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🎬 [API] Video recipe parser started');
  console.log('📝 [API] Request method:', req.method);
  console.log('📦 [API] Request body:', JSON.stringify(req.body, null, 2));
  
  // Apply CORS
  await corsHandler(req, res);

  if (req.method !== 'POST') {
    console.error('❌ [API] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting
  const rateLimitResult = await rateLimiter(req, res);
  if (!rateLimitResult.success) {
    return res.status(429).json({ 
      error: 'Too many requests', 
      retryAfter: rateLimitResult.retryAfter 
    });
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

    // Validate platform
    const supportedPlatforms = ['youtube', 'tiktok', 'instagram', 'generic'];
    const detectedPlatform = platform || detectPlatform(videoUrl);
    
    console.log('🔍 [API] Detected platform:', detectedPlatform);
    console.log('✅ [API] Supported platforms:', supportedPlatforms);
    
    if (!supportedPlatforms.includes(detectedPlatform)) {
      console.error('❌ [API] Unsupported platform:', detectedPlatform);
      return res.status(400).json({ 
        error: `Platform ${detectedPlatform} is not supported` 
      });
    }

    console.log('🚀 [API] Initializing FastVideoParser...');
    const parser = new FastVideoParser();
    
    console.log('🎬 [API] Starting video parsing...');
    
    // Start parsing with progress tracking
    const result = await parser.parseVideoRecipe(videoUrl, detectedPlatform, {
      onProgress: (progress) => {
        // In a real implementation, you might use WebSocket or SSE for real-time progress
        console.log(`📊Parsingprogress:${progress}%`);
      }
    });
    
    const processingTime = Date.now() - startTime;
    console.log('✅ [API] Parsing completed!');
    console.log(`⏱️ [API] Total time: ${processingTime}ms (${Math.round(processingTime / 1000)}s)`);
    console.log('📋 [API] Recipe:', result?.recipe?.name || 'Unknown');

    return res.status(200).json({
      success: true,
      data: result,
      processingTime: result.metadata?.processingTime || `${processingTime}ms`,
      debug: {
        totalTime: `${processingTime}ms`,
        platform: detectedPlatform,
        recipeFound: !!result?.recipe?.name
      }
    });

  } catch (error: any) {
    console.error('❌ [API] Video parsing error:', error);
    console.error('💥 [API] Error stack:', error.stack);
    
    return res.status(500).json({
      error: 'Failed to parse video recipe',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message
      }
    });
  }
}

function detectPlatform(url: string): string {
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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '15mb',
  },
};