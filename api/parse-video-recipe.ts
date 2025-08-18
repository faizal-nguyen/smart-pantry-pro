import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FastVideoParser } from '../src/services/video/fastVideoParser';

// Configuration CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://smart-pantry-pro.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
].filter(Boolean);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🎬 [Vercel API] Video recipe parser started');
  
  // Handle CORS
  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl, platform } = req.body;
    const startTime = Date.now();
    
    console.log('🔗 [Vercel API] Video URL:', videoUrl);
    console.log('📱 [Vercel API] Platform:', platform || 'auto-detect');

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Detect platform
    const detectedPlatform = platform || detectPlatform(videoUrl);
    console.log('🔍 [Vercel API] Detected platform:', detectedPlatform);
    
    // Initialize parser
    const parser = new FastVideoParser();
    
    // Parse video
    const result = await parser.parseVideoRecipe(videoUrl, detectedPlatform, {
      onProgress: (progress) => {
        console.log(`📊 Parsing progress: ${progress}%`);
      }
    });
    
    const processingTime = Date.now() - startTime;
    console.log('✅ [Vercel API] Parsing completed in', processingTime, 'ms');

    return res.status(200).json({
      success: true,
      data: result,
      processingTime: `${processingTime}ms`,
      debug: {
        totalTime: `${processingTime}ms`,
        platform: detectedPlatform,
        recipeFound: !!result?.recipe?.name
      }
    });

  } catch (error: any) {
    console.error('❌ [Vercel API] Error:', error);
    
    return res.status(500).json({
      error: 'Failed to parse video recipe',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  } else if (url.includes('tiktok.com')) {
    return 'tiktok';
  } else if (url.includes('instagram.com')) {
    return 'instagram';
  }
  return 'generic';
}