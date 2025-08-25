import { NextApiRequest, NextApiResponse } from 'next';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Read the raw body as buffer
    const chunks: Buffer[] = [];
    await new Promise((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Create FormData for Whisper API
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');
    formData.append('response_format', 'json');

    // Call Whisper API
    const response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', response.status, errorText);
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const transcription = await response.json();

    res.status(200).json({
      success: true,
      text: transcription.text || '',
      language: transcription.language || 'fr',
      duration: transcription.duration || 0
    });

  } catch (error) {
    console.error('Erreur transcription:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la transcription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}