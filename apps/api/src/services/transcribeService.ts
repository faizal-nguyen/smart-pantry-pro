type LegacyPayload = any;
import { fetchWithTimeout } from '../utils/http.js';

async function importLegacyModule() {
  const candidates = [
    '../../../../api/transcribe-youtube.js',
    '../../../api/transcribe-youtube.js',
  ];
  let lastErr: any;
  for (const p of candidates) {
    try {
      const mod = await import(p as string);
      return (mod as any).default || mod;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function invokeLegacy(handler: Function, body: any): Promise<LegacyPayload> {
  return new Promise((resolve) => {
    const req = { method: 'POST', body } as any;
    let statusCode = 200;
    const res = {
      setHeader: (_k: string, _v: string) => {},
      status: (code: number) => { statusCode = code; return res; },
      json: (payload: any) => resolve({ statusCode, ...payload }),
      end: () => resolve({ statusCode })
    } as any;
    Promise.resolve(handler(req, res)).catch(() => resolve({ statusCode: 500, success: false }));
  });
}

export interface TranscriptionDTO {
  transcription: {
    text: string;
    language: string;
    confidence?: number;
    duration?: number;
    segments?: Array<{ start: number; end: number; text: string; confidence?: number }>;
    method?: string;
  };
  source: string;
  message?: string;
  code?: string;
}

export async function transcribeYoutube(url: string, language?: string): Promise<TranscriptionDTO> {
  try {
    // Delegate to external video processor if configured
    const vp = process.env.VIDEO_PROCESSOR_URL;
    if (vp) {
      try {
        const resp = await fetchWithTimeout(new URL('/transcribe-youtube', vp).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: url, language })
        }, 15000);
        const text = await resp.text();
        const json = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();
        const tx = json?.transcription || json?.data?.transcription;
        if (tx && tx.text) {
          return {
            transcription: {
              text: tx.text,
              language: tx.language || language || 'auto',
              confidence: tx.confidence ?? 0.8,
              duration: tx.duration ?? 0,
              segments: tx.segments ?? [],
              method: tx.method || json?.method || 'delegate'
            },
            source: url,
            message: json?.message,
            code: 'DELEGATE_OK'
          };
        }
        // fallthrough to legacy if malformed
      } catch { /* fallthrough */ }
    }

    const handler = await importLegacyModule();
    const payload = await invokeLegacy(handler, { videoUrl: url, language });
    if (payload && typeof payload === 'object') {
      const tx = payload.transcription || payload.data?.transcription;
      if (tx && tx.text) {
        return {
          transcription: {
            text: tx.text,
            language: tx.language || language || 'auto',
            confidence: tx.confidence ?? 0.8,
            duration: tx.duration ?? 0,
            segments: tx.segments ?? [],
            method: tx.method || payload.method || 'legacy'
          },
          source: url,
          message: payload.message,
          code: 'LEGACY_OK'
        };
      }
    }
    return { transcription: { text: '', language: language || 'auto', method: 'unknown' }, source: url, code: 'UNKNOWN' };
  } catch (error: any) {
    return {
      transcription: {
        text: 'Demo transcription (apps/api service fallback).',
        language: language || 'auto',
        confidence: 0.5,
        duration: 0,
        method: 'apps/api-fallback'
      },
      source: url,
      message: error?.message,
      code: 'FALLBACK_SIMULATION'
    };
  }
}
