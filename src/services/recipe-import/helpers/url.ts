/**
 * URL helpers for the recipe-import pipeline (PRP-220.07).
 *
 * - `detectPlatform` classifies an arbitrary URL into a SocialPlatform.
 * - `canonicalizeUrl` produces a stable form used for dedup hashing.
 * - `extractFirstUrl` / `extractAllUrls` pull URLs out of free text
 *   (used by the bulk-paste UI in PRP-220.18).
 */
import type { SocialPlatform } from '@smart/shared';

export function detectPlatform(url: string): SocialPlatform {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host === 'youtu.be') return 'youtube';
    if (host.includes('pinterest.')) return 'pinterest';
    return 'web';
  } catch {
    return 'unknown';
  }
}

/**
 * Normalise an URL so that `https://www.X.com/p/Y/?utm=foo` and
 * `https://m.x.com/p/Y/#frag` collapse to the same string. Used as the
 * input for the dedup hash on `social_recipe_imports`.
 */
export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    u.hostname = u.hostname.toLowerCase().replace(/^m\.|^www\./, '');
    // Drop default ports, normalise trailing slash.
    let s = u.toString();
    if (u.port === '80' || u.port === '443') {
      s = s.replace(`:${u.port}`, '');
    }
    return s.replace(/\/$/, '');
  } catch {
    return url;
  }
}

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/i;
const URL_REGEX_GLOBAL = /(https?:\/\/[^\s<>"']+)/gi;

export function extractFirstUrl(text: string): string | undefined {
  const m = URL_REGEX.exec(text);
  return m ? trimTrailingPunctuation(m[1]) : undefined;
}

export function extractAllUrls(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = URL_REGEX_GLOBAL.exec(text)) !== null) {
    out.push(trimTrailingPunctuation(m[1]));
  }
  return Array.from(new Set(out));
}

function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?)\]}>'"]+$/, '');
}

/**
 * Heuristic for the clipboard suggestion (PRP-220.18). True when the
 * URL looks like a social-media or recipe-blog link the import
 * pipeline can likely handle — used to gate the "Importer ?" banner so
 * we don't pester the user with random URLs they had in their
 * clipboard.
 *
 * Intentionally conservative: false-negatives are fine (the user can
 * still paste manually), but false-positives are spammy.
 */
export function isRecipeLikely(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return (
      host.endsWith('instagram.com') ||
      host.endsWith('tiktok.com') ||
      host.endsWith('youtube.com') ||
      host === 'youtu.be' ||
      host.includes('pinterest.')
    );
  } catch {
    return false;
  }
}
