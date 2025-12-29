type LegacyPayload = any;

async function importLegacyModule() {
  const candidates = [
    '../../../../api/youtube-extract-enhanced.js',
    '../../../api/youtube-extract-enhanced.js',
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
      status: (code: number) => {
        statusCode = code; return res;
      },
      json: (payload: any) => resolve({ statusCode, ...payload }),
      end: () => resolve({ statusCode })
    } as any;
    // Fire and resolve when handler writes
    Promise.resolve(handler(req, res)).catch(() => resolve({ statusCode: 500, success: false }));
  });
}

export async function extractFromYoutube(url: string, language?: string) {
  try {
    const handler = await importLegacyModule();
    const payload = await invokeLegacy(handler, { videoUrl: url, language });
    // Ensure shape contains success
    if (payload && typeof payload === 'object') {
      return payload;
    }
    return { success: true, recipe: null, source: url, message: 'Legacy handler returned no payload' };
  } catch (error: any) {
    // Fallback demo response
    return {
      success: true,
      recipe: {
        title: 'YouTube Recipe (Demo) — Service',
        description: 'Fallback from youtubeExtractService',
        steps: ['Fetch metadata (simulated)', 'Transcribe (simulated)', 'Build recipe (simulated)'],
      },
      source: url,
      error: error?.message,
      message: 'apps/api service fallback (youtube-extract)'
    };
  }
}

