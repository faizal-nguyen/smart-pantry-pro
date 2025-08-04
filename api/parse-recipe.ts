import { VercelRequest, VercelResponse } from '@vercel/node';

// API endpoint pour parsing recettes URL (pattern Cipher)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, parser } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🌐 Fetching recipe from: ${url} (parser: ${parser})`);

    // Headers pour éviter les blocages anti-bot
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
    };

    // Rate limiting basique (pattern Cipher précautions)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('Invalid content type - not HTML');
    }

    const html = await response.text();

    if (!html || html.length < 100) {
      throw new Error('Invalid or empty HTML response');
    }

    // Nettoyer le HTML des scripts potentiellement malveillants
    const cleanHtml = html.replace(/<script[^>]*>.*?<\/script>/gsi, '');

    res.status(200).send(cleanHtml);

  } catch (error) {
    console.error('Error fetching recipe:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return res.status(408).json({ error: 'Request timeout' });
      }
      if (error.message.includes('ENOTFOUND')) {
        return res.status(404).json({ error: 'Website not found' });
      }
    }

    res.status(500).json({ 
      error: 'Failed to fetch recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}