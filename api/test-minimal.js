export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Log tout pour debug
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Body type:', typeof req.body);
    console.log('Body:', req.body);
    
    // Essayer de lire le body manuellement
    if (req.method === 'POST') {
      let bodyContent = '';
      
      if (req.body) {
        bodyContent = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else if (req.readable) {
        // Lire le stream
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        bodyContent = Buffer.concat(chunks).toString();
      }
      
      console.log('Body content:', bodyContent);
      
      // Essayer de parser
      let parsed = null;
      try {
        parsed = JSON.parse(bodyContent);
      } catch (e) {
        parsed = { parseError: e.message, raw: bodyContent };
      }
      
      return res.status(200).json({
        success: true,
        received: {
          method: req.method,
          bodyType: typeof req.body,
          bodyContent: bodyContent,
          parsed: parsed
        }
      });
    }
    
    res.status(200).json({ 
      success: true, 
      method: req.method,
      message: 'Use POST to test body parsing'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
}