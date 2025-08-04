export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Testing fetch for URL:', url);

    // Test 1: Simple fetch
    let fetchSuccess = false;
    let fetchError = null;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Recipe Parser)'
        }
      });
      fetchSuccess = response.ok;
      console.log('Fetch status:', response.status);
    } catch (e) {
      fetchError = e.message;
      console.error('Fetch error:', e);
    }

    // Test 2: OpenAI
    let openaiSuccess = false;
    let openaiError = null;
    
    if (process.env.OPENAI_API_KEY) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'user', content: 'Dis simplement "OK"' }
            ],
            max_tokens: 10
          })
        });
        
        openaiSuccess = openaiResponse.ok;
        if (!openaiResponse.ok) {
          openaiError = `Status ${openaiResponse.status}`;
        }
      } catch (e) {
        openaiError = e.message;
      }
    }

    res.status(200).json({
      success: true,
      tests: {
        urlFetch: {
          success: fetchSuccess,
          error: fetchError
        },
        openai: {
          hasKey: !!process.env.OPENAI_API_KEY,
          success: openaiSuccess,
          error: openaiError
        }
      },
      message: 'Diagnostic complete'
    });

  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Test failed',
      details: error.message
    });
  }
}