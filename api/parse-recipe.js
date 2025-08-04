export default async function handler(req, res) {
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
    // Parse body correctly
    let body = req.body;
    
    // Handle cases where body might be a string or stream
    if (!body && req.readable) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString();
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON', details: e.message });
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON', details: e.message });
      }
    }
    
    const { url, parser } = body || {};

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🔍 Parsing recipe from: ${url} (parser: ${parser})`);

    // Fetch page content
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(url, { 
        headers, 
        signal: controller.signal 
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Timeout: La page met trop de temps à répondre');
      }
      throw new Error(`Impossible de récupérer la page: ${fetchError.message}`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    if (!html || html.length < 100) {
      throw new Error('Contenu HTML invalide ou vide');
    }

    // Return raw HTML for frontend processing
    res.status(200).send(html);

  } catch (error) {
    console.error('❌ Error fetching recipe page:', error);
    
    let errorMessage = 'Failed to fetch recipe page';
    let statusCode = 500;

    if (error.message) {
      if (error.message.includes('Timeout')) {
        errorMessage = 'Request timeout';
        statusCode = 408;
      } else if (error.message.includes('HTTP')) {
        errorMessage = 'Page not accessible';
        statusCode = 502;
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error';
        statusCode = 502;
      }
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: error.message || 'Unknown error'
    });
  }
}