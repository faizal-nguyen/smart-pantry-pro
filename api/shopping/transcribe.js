const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Pour cette version simplifiée, on simule la transcription
    // En production, vous implémenterez la logique Whisper ici
    
    // Simulation d'une transcription
    const simulatedTranscription = "2 kilos de tomates, 1 litre de lait, du pain complet";
    
    res.status(200).json({
      success: true,
      text: simulatedTranscription,
      language: 'fr',
      duration: 0
    });

  } catch (error) {
    console.error('Erreur transcription:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la transcription',
      details: error.message || 'Unknown error'
    });
  }
}

export default handler;