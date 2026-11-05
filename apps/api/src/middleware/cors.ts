import cors from 'cors';

const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Allowed: no Origin (server to server), the API's own host (the app and its
 * Vercel previews call it same-origin, and browsers still send Origin on
 * writes), ALLOWED_ORIGINS, and local dev hosts matched exactly, never as a
 * substring ("localhost.evil.com").
 */
export function isAllowedOrigin(origin: string | undefined, requestHost: string | undefined, allowedOrigins: readonly string[] = allowed): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  let url: URL;
  try { url = new URL(origin); } catch { return false; }
  return url.host === requestHost || LOCAL_HOSTNAMES.has(url.hostname);
}

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.split(',')[0]?.trim();

export const corsMiddleware = cors((req, cb) => {
  const host = header(req.headers['x-forwarded-host']) ?? header(req.headers.host);
  if (!isAllowedOrigin(header(req.headers.origin), host)) return cb(new Error('CORS not allowed'));
  cb(null, { origin: true, credentials: true });
});
