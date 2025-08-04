import { VercelRequest, VercelResponse } from '@vercel/node';

// Endpoint de test pour vérifier les variables d'environnement
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier les variables d'environnement
  const envCheck = {
    OPENAI_API_KEY: {
      exists: !!process.env.OPENAI_API_KEY,
      length: process.env.OPENAI_API_KEY?.length || 0,
      prefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'NOT_SET',
      isValidFormat: process.env.OPENAI_API_KEY?.startsWith('sk-') || false
    },
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    availableEnvVars: Object.keys(process.env).filter(k => 
      k.includes('OPENAI') || 
      k.includes('API') || 
      k.includes('SUPABASE') ||
      k.includes('VERCEL')
    ).sort()
  };

  // Test de l'API OpenAI si la clé existe
  let apiTest: { success: boolean; error: string | null } = { success: false, error: null };
  
  if (process.env.OPENAI_API_KEY) {
    try {
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });
      
      apiTest.success = testResponse.ok;
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        apiTest.error = `${testResponse.status}: ${errorText}`;
      }
    } catch (error) {
      apiTest.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  res.status(200).json({
    timestamp: new Date().toISOString(),
    environment: envCheck,
    openaiApiTest: apiTest,
    message: 'Environment check completed'
  });
}