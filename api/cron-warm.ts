/**
 * Vercel Cron — keepalive ping for the Render-hosted Express API.
 *
 * The free Render plan sleeps the service after 15 min of inactivity.
 * Waking it back up costs ~30 s, which surfaces as a brutally slow
 * first hit for the user. This serverless function pings the API
 * health endpoint every 14 min (scheduled in vercel.json), keeping
 * the Render dyno warm without paying for Render's $7/mo Starter
 * plan or for Vercel's paid cron tier.
 *
 * Security:
 *   - Vercel Cron sends an Authorization: Bearer <CRON_SECRET> header
 *     when the env var CRON_SECRET is set on the Vercel project.
 *     We accept calls only when CRON_SECRET is set AND the header
 *     matches. Without CRON_SECRET configured, the function still
 *     answers (so manual curl debugging works in dev), but a warning
 *     is logged.
 *   - GET-only (idempotent, safe to retry).
 *
 * Cost: well within the Vercel Hobby free tier (1 cron, ~3 invocations
 * per hour × 720 hours/month ≈ 2 200 invocations/month; the free
 * limit is 100 000).
 *
 * IMPORTANT: this file lives under /api/, which Vercel treats as
 * serverless functions and matches BEFORE the /api/* rewrite. So the
 * cron-warm endpoint hits this code, not Render.
 */

const TARGET_URL =
  process.env.RENDER_API_URL ?? 'https://smart-pantry-api-ifn4.onrender.com/api/health';

const REQUEST_TIMEOUT_MS = 25_000; // Vercel hobby function max is 10s, but
                                   // keep this loose so a slow cold-start
                                   // doesn't 504 us. Render cold-start can
                                   // be ~30s on free tier — we accept that
                                   // the first ping may report 504 here
                                   // while still successfully waking Render.

export default async function handler(req: Request): Promise<Response> {
  // Vercel Cron requests carry the Authorization header. We only enforce
  // the check when a CRON_SECRET is actually configured, so local curl
  // tests don't get locked out before the secret is set.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(TARGET_URL, {
      signal: controller.signal,
      headers: { 'user-agent': 'vercel-cron-keepalive/1.0' },
    });
    clearTimeout(timeout);
    const elapsedMs = Date.now() - startedAt;

    return new Response(
      JSON.stringify({
        ok: upstream.ok,
        upstreamStatus: upstream.status,
        elapsedMs,
        target: TARGET_URL,
        at: new Date().toISOString(),
      }),
      {
        status: upstream.ok ? 200 : 502,
        headers: { 'content-type': 'application/json' },
      },
    );
  } catch (err: unknown) {
    clearTimeout(timeout);
    const aborted = (err as { name?: string } | null)?.name === 'AbortError';
    const message = err instanceof Error ? err.message : 'unknown error';
    const elapsedMs = Date.now() - startedAt;
    return new Response(
      JSON.stringify({
        ok: false,
        error: aborted ? 'timeout' : message,
        elapsedMs,
        target: TARGET_URL,
        at: new Date().toISOString(),
      }),
      {
        status: aborted ? 504 : 502,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
}

export const config = {
  runtime: 'edge', // tiny, fast cold-start; Edge is enough for an outbound fetch.
};
