export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = (AbortController && !('timeout' in AbortSignal)) ? new AbortController() : undefined;
  const signal = (AbortSignal as any).timeout ? (AbortSignal as any).timeout(timeoutMs) : controller!.signal;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const res = await fetch(url, { ...init, signal });
    return res;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchJsonWithRetry<T = any>(
  url: string,
  init: RequestInit = {},
  attempts = 2,
  timeoutMs = 5000,
  backoffMs = 200
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return JSON.parse(text) as T;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
    }
  }
  throw lastErr;
}

