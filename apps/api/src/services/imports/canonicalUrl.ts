/**
 * Server-side mirror of the canonicalUrl helper used by the client
 * (src/services/recipe-import/helpers/url.ts). Kept independent so the
 * API doesn't pull a Vite-flavoured module via @smart/shared just for
 * a 20-line URL normaliser.
 */

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'web'
  | 'manual'
  | 'unknown';

export function detectPlatform(url: string): SocialPlatform {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const belongsTo = (domain: string) => host === domain || host.endsWith(`.${domain}`);
    if (belongsTo('instagram.com')) return 'instagram';
    if (belongsTo('tiktok.com')) return 'tiktok';
    if (belongsTo('youtube.com') || host === 'youtu.be') return 'youtube';
    if (['pinterest.com', 'pinterest.fr', 'pinterest.co.uk'].some(belongsTo)) return 'pinterest';
    return 'web';
  } catch {
    return 'unknown';
  }
}

/**
 * Normalise an URL so that `https://www.X.com/p/Y/?utm=foo` and
 * `https://m.x.com/p/Y/#frag` collapse to the same string. Used as the
 * input for `computeSourceHash`.
 */
export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Keep parameters that identify a recipe/video. Dropping every query
    // collapsed all YouTube /watch?v=… videos and parameterized web recipes.
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm(?:_.+)?|fbclid|gclid|dclid|msclkid|igsh|igshid|si|share_id|share_app_id|_r|_t)$/i.test(key)) {
        u.searchParams.delete(key);
      }
    }
    u.searchParams.sort();
    u.hash = '';
    u.hostname = u.hostname.toLowerCase().replace(/^m\.|^www\./, '');
    let s = u.toString();
    if (u.port === '80' || u.port === '443') {
      s = s.replace(`:${u.port}`, '');
    }
    return s.replace(/\/$/, '');
  } catch {
    return url;
  }
}
