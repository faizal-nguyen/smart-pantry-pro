import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'Valid Instagram URL is required' });
  }

  try {
    console.log(`[Instagram Metadata] Processing URL: ${url}`);
    
    // Fetch the Instagram page to extract metadata
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram page: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract metadata from HTML
    const metadata: any = {};
    
    // Extract Open Graph image (thumbnail)
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImageMatch) {
      metadata.thumbnail_url = ogImageMatch[1].replace(/&amp;/g, '&');
    }
    
    // Extract title
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitleMatch) {
      metadata.title = ogTitleMatch[1];
    }
    
    // Extract description
    const ogDescriptionMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (ogDescriptionMatch) {
      metadata.description = ogDescriptionMatch[1];
      
      // Try to extract author from description
      const authorMatch = metadata.description.match(/(?:by\s)?@(\w+)/);
      if (authorMatch) {
        metadata.author_name = authorMatch[1];
        metadata.author_url = `https://www.instagram.com/${authorMatch[1]}/`;
      }
    }
    
    // Extract video URL if it's a video/reel
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
    if (ogVideoMatch) {
      metadata.video_url = ogVideoMatch[1].replace(/&amp;/g, '&');
      metadata.media_type = 'video';
    } else {
      metadata.media_type = 'image';
    }
    
    // Extract dimensions
    const widthMatch = html.match(/<meta property="og:image:width" content="(\d+)"/);
    const heightMatch = html.match(/<meta property="og:image:height" content="(\d+)"/);
    if (widthMatch && heightMatch) {
      metadata.width = parseInt(widthMatch[1]);
      metadata.height = parseInt(heightMatch[1]);
    }
    
    console.log(`[Instagram Metadata] Extracted:`, metadata);
    
    return res.status(200).json({
      success: true,
      ...metadata
    });
    
  } catch (error: any) {
    console.error('[Instagram Metadata] Error:', error.message);
    
    // Return fallback data
    return res.status(200).json({
      success: false,
      title: 'Instagram Recipe',
      description: 'Recipe from Instagram',
      thumbnail_url: null,
      error: error.message
    });
  }
}