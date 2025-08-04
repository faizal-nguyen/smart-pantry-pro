export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
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
  
  res.status(200).json({
    timestamp: new Date().toISOString(),
    environment: envCheck,
    message: 'Environment check completed'
  });
}