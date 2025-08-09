import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`[Instagram oEmbed] Processing request for URL: ${url}`);

    // 🎯 API Instagram oEmbed PUBLIQUE - Gratuite, sans auth
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}&omitscript=true&hidecaption=false`;
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Smart-Pantry-Pro/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`[Instagram oEmbed] Success: Retrieved data for ${data.author_name}`);
      
      // Extraire les infos utiles
      return res.status(200).json({
        success: true,
        html: data.html,
        thumbnail_url: data.thumbnail_url,
        author_name: data.author_name,
        author_id: data.author_id,
        media_id: data.media_id,
        title: data.title,
        provider_name: "instagram",
        width: data.width,
        height: data.height,
        version: data.version,
        type: data.type,
        fallback: false
      });
    }
    
    // Si échec, log et fallback
    console.log(`[Instagram oEmbed] Public API failed: ${response.status} ${response.statusText}`);
    const errorText = await response.text();
    console.log(`[Instagram oEmbed] Error details: ${errorText}`);
    
  } catch (error: any) {
    console.error('[Instagram oEmbed] Error:', error.message);
  }

  // Fallback si échec
  console.log('[Instagram oEmbed] Falling back to manual input');
  return res.status(200).json({ 
    success: false,
    fallback: true,
    reason: 'Instagram oEmbed API unavailable',
    requiresManualInput: true
  });
}

// Export config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};