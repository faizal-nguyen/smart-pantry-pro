/**
 * OpenAI Whisper wrapper. Given an audio file path, returns the
 * transcript text. The orchestrator (`VideoRecipeExtractor`) then
 * feeds that text to GPT-4o for structured recipe extraction.
 *
 * Whisper API constraints (as of 2026-05):
 *   - 25 MB hard cap per request
 *   - Supported formats: m4a, mp3, mp4, mpeg, mpga, wav, webm
 * We deliver a ~64 kbps mono mp3 (cf. AudioExtractor) so even a 25 min
 * video stays comfortably under the cap.
 *
 * Cost: $0.006/min flat. We compute it from the duration we already
 * have on `media_assets.duration_seconds` (ffprobe at upload time)
 * rather than hitting Whisper's `verbose_json` response (which costs
 * the same and adds latency).
 */
import { createReadStream } from 'node:fs';

export interface WhisperTranscribeRequest {
  audioPath: string;
  /** ISO-639-1 lang hint (e.g. "fr", "en"). Whisper auto-detects when omitted. */
  language?: string;
  /** Optional priming prompt (e.g. brand names, jargon) — kept short. */
  prompt?: string;
}

export interface WhisperTranscribeResponse {
  text: string;
  language?: string;
  durationSeconds?: number;
}

export interface WhisperClient {
  transcribe(req: WhisperTranscribeRequest): Promise<WhisperTranscribeResponse>;
}

/**
 * Default OpenAI-backed Whisper client. Lazy-loads the SDK so module
 * import doesn't blow up when OPENAI_API_KEY is missing in non-AI
 * environments.
 */
export function createOpenAIWhisperClient(): WhisperClient {
  let cachedClient: any = null;
  return {
    async transcribe(req: WhisperTranscribeRequest): Promise<WhisperTranscribeResponse> {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set on the server.');
      }
      if (!cachedClient) {
        const mod = await import('openai');
        const OpenAI = (mod as any).default ?? (mod as any).OpenAI ?? mod;
        cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }

      const file = createReadStream(req.audioPath);
      const params: Record<string, unknown> = {
        file,
        model: 'whisper-1',
        response_format: 'verbose_json',
      };
      if (req.language) params.language = req.language;
      if (req.prompt) params.prompt = req.prompt.slice(0, 220); // SDK soft cap

      const response = await cachedClient.audio.transcriptions.create(params);
      // verbose_json returns { text, language, duration, segments... }
      return {
        text: typeof response?.text === 'string' ? response.text : '',
        language: typeof response?.language === 'string' ? response.language : undefined,
        durationSeconds:
          typeof response?.duration === 'number' ? response.duration : undefined,
      };
    },
  };
}

/** USD/min flat-rate price (OpenAI Whisper-1, 2026-05). */
export const WHISPER_USD_PER_MINUTE = 0.006;

export function computeWhisperCostUsd(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  return Number(((durationSeconds / 60) * WHISPER_USD_PER_MINUTE).toFixed(6));
}
