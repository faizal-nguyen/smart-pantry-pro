import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { action, ...params } = req.body;

  try {
    switch (action) {
      case 'parse-video':
        // Déléguer au service approprié
        const { parseVideoRecipe } = await import('../src/services/video/videoRecipeParser.js');
        const videoResult = await parseVideoRecipe(params);
        return res.status(200).json(videoResult);

      case 'extract-audio':
        const { extractAudioFromVideo } = await import('../src/services/video/audioExtractor.js');
        const audioResult = await extractAudioFromVideo(params);
        return res.status(200).json(audioResult);

      case 'process-instagram':
        const { processInstagramUrl } = await import('../src/services/instagram/instagramProcessor.js');
        const instagramResult = await processInstagramUrl(params);
        return res.status(200).json(instagramResult);

      case 'transcribe-youtube':
        const { transcribeYouTube } = await import('../src/services/youtube/youtubeTranscriber.js');
        const transcribeResult = await transcribeYouTube(params);
        return res.status(200).json(transcribeResult);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Media processor error:', error);
    return res.status(500).json({ 
      error: 'Processing failed', 
      message: error.message 
    });
  }
}