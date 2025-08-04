import fetch from 'node-fetch';

// Fonction de retry avec backoff exponentiel
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`🔄 Retry ${i + 1}/${maxRetries} après ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

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
    const { url, source } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('API')));
      throw new Error('OpenAI API key not configured');
    }

    console.log('✅ OPENAI_API_KEY found:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
    console.log(`🤖 AI parsing recipe from: ${url} (source: ${source})`);

    // Continuer avec le reste de la logique...
    res.status(200).json({
      success: true,
      message: 'API key found, parsing would happen here',
      hasKey: true
    });

  } catch (error) {
    console.error('❌ Error in AI recipe parsing:', error);
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'AI parsing failed',
      details: error.message
    });
  }
}