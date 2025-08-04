import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test ultra simple pour vérifier que les fonctions marchent
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        openAILength: process.env.OPENAI_API_KEY?.length || 0,
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL
      }
    };
    
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Internal error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}