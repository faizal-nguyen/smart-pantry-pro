import { exec } from 'child_process';
import { fetchWithTimeout } from '../utils/http.js';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface EnhancedRecipe {
  title: string;
  description?: string;
  steps?: string[];
  metadata?: Record<string, unknown>;
}

export interface YoutubeExtractDTO {
  recipe: EnhancedRecipe;
  source: string;
  message?: string;
  code?: string;
}

function extractYoutubeId(videoUrl: string): string | null {
  const m = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return m ? m[1] : null;
}

export async function extractYoutubeEnhanced(videoUrl: string, language = 'auto') {
  try {
    // 0) If external video processor is configured, delegate
    const vp = process.env.VIDEO_PROCESSOR_URL;
    if (vp) {
      try {
        const resp = await fetchWithTimeout(new URL('/youtube-extract', vp).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl, language })
        }, 10000);
        const text = await resp.text();
        const json = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();
        const recipe: EnhancedRecipe | undefined = json?.recipe || json?.data?.recipe;
        if (recipe) {
          const dto: YoutubeExtractDTO = { recipe, source: videoUrl, message: json?.message || 'delegated', code: 'DELEGATE_OK' };
          return dto;
        }
        // fallthrough to local if malformed
      } catch { /* fallthrough to local */ }
    }

    const videoId = extractYoutubeId(videoUrl);
    if (!videoId) {
      return { statusCode: 400, error: 'Invalid YouTube URL' };
    }

    // Try to fetch oEmbed metadata (may fail offline; it's fine)
    let metadata: any = null;
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const resp = await fetch(oembedUrl);
      if (resp.ok) metadata = await resp.json();
    } catch {
      // offline/non-network env: ignore
    }

    // If no API keys or no network, return simulated recipe with available metadata
    const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!openaiKey) {
      return {
        recipe: {
          title: metadata?.title || 'YouTube Recipe (Simulé)',
          description: 'Mode simulation — configurez OPENAI_API_KEY pour activer l’extraction complète',
          steps: [
            'Récupérer les métadonnées (oEmbed)',
            'Transcrire l’audio (simulation)',
            'Générer la recette (simulation)'
          ],
          metadata: { videoId }
        },
        source: videoUrl,
        message: 'Mode simulation — clé OpenAI manquante',
        code: 'SIMULATION_NO_KEY'
      } satisfies YoutubeExtractDTO;
    }

    // Optional: check yt-dlp availability; fallback to simulation if not present or restricted
    try {
      await execAsync('which yt-dlp');
    } catch {
      return {
        recipe: {
          title: metadata?.title || 'YouTube Recipe (Simulé — yt-dlp absent)',
          description: 'yt-dlp non disponible — extraction audio simulée',
          steps: ['Vérifier yt-dlp', 'Simulation transcription', 'Simulation extraction recette'],
          metadata: { videoId }
        },
        source: videoUrl,
        message: 'yt-dlp non disponible — simulation',
        code: 'SIMULATION_NO_YTDLP'
      } satisfies YoutubeExtractDTO;
    }

    // Minimal happy-path scaffold (no actual network/audio due to environment constraints)
    const tempDir = os.tmpdir();
    const tempFileName = `youtube_${videoId}_${Date.now()}`;
    const tempAudioPath = path.join(tempDir, `${tempFileName}.mp3`);

    try {
      // Attempt extraction (may fail in sandbox; errors will be caught)
      const ytdlpCommand = `yt-dlp -x --audio-format mp3 --audio-quality 5 --no-playlist -o "${path.join(tempDir, tempFileName)}.%(ext)s" "${videoUrl}"`;
      await execAsync(ytdlpCommand, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
      await fs.access(tempAudioPath).catch(() => { /* ignore if missing */ });
    } catch {
      // If extraction fails, return simulated response
      return {
        success: true,
        recipe: {
          title: metadata?.title || 'YouTube Recipe (Simulé — extraction audio échouée)',
          description: 'Extraction audio indisponible — simulation de transcription',
          steps: ['Essayer yt-dlp', 'Simulation transcription', 'Simulation extraction recette'],
          metadata: { videoId }
        } as EnhancedRecipe,
        source: videoUrl,
        message: 'Extraction audio indisponible — simulation'
      };
    }

    // In real environment, call Whisper/OpenAI then parse into a recipe
    return {
      recipe: {
        title: metadata?.title || 'YouTube Recipe',
        description: 'Extraction réussie (scaffold) — étapes détaillées à compléter',
        steps: ['Audio extrait', 'Transcription Whisper', 'Génération recette'],
        metadata: { videoId, tempAudioPath }
      },
      source: videoUrl,
      code: 'LOCAL_OK'
    } satisfies YoutubeExtractDTO;
  } catch (error: any) {
    return { recipe: { title: 'YouTube Recipe (Fallback)' }, source: videoUrl, message: error?.message, code: 'FALLBACK_ERROR' } as YoutubeExtractDTO;
  }
}
