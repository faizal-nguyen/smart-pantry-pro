/**
 * YouTube platform adapter (PRP-220.14).
 *
 *  - Metadata via the public YouTube Data API v3 (`videos.list`),
 *    requires `YOUTUBE_API_KEY`. Falls back to oEmbed when the key
 *    is absent.
 *  - Transcript via the `youtube-transcript` package. When captions
 *    are available the adapter sets extractionMethod = 'transcript';
 *    otherwise it sticks to 'metadata' and the AI runs on the
 *    description alone.
 *
 * The adapter never downloads the video.
 */
import { YoutubeTranscript } from 'youtube-transcript';

import { canonicalizeUrl } from '../canonicalUrl.js';
import { safeFetchJson } from './ssrfGuard.js';
import type { PlatformAdapter, PlatformContext } from './types.js';

interface YouTubeApiSnippet {
  title?: string;
  description?: string;
  channelTitle?: string;
  thumbnails?: {
    maxres?: { url?: string };
    high?: { url?: string };
    medium?: { url?: string };
    default?: { url?: string };
  };
}

interface YouTubeApiResponse {
  items?: Array<{ snippet?: YouTubeApiSnippet }>;
}

interface YouTubeOEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

const TRANSCRIPT_MAX_CHARS = 8000;

export class YouTubeAdapter implements PlatformAdapter {
  canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      return host.endsWith('youtube.com') || host === 'youtu.be';
    } catch {
      return false;
    }
  }

  async fetchContext(url: string): Promise<PlatformContext> {
    const videoId = extractVideoId(url);

    let metadata: PlatformContext['metadata'] = {};
    let extractionMethod: PlatformContext['extractionMethod'] = 'metadata';
    let transcript: string | undefined;

    if (videoId) {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (apiKey) {
        const snippet = await fetchApiMetadata(videoId, apiKey).catch((err) => {
          console.warn('[YouTubeAdapter] Data API failed:', (err as Error)?.message);
          return null;
        });
        if (snippet) {
          metadata = {
            title: snippet.title,
            description: snippet.description,
            authorName: snippet.channelTitle,
            thumbnailUrl:
              snippet.thumbnails?.maxres?.url ??
              snippet.thumbnails?.high?.url ??
              snippet.thumbnails?.medium?.url ??
              snippet.thumbnails?.default?.url,
          };
        }
      }

      // Fallback to oEmbed if the API call missed.
      if (!metadata.title) {
        const oembed = await fetchOEmbed(url).catch(() => null);
        if (oembed) {
          metadata = {
            title: oembed.title,
            authorName: oembed.author_name,
            thumbnailUrl: oembed.thumbnail_url,
          };
        }
      }

      transcript = await fetchTranscript(videoId).catch((err) => {
        console.warn('[YouTubeAdapter] transcript failed:', (err as Error)?.message);
        return undefined;
      });
      if (transcript) extractionMethod = 'transcript';
    }

    return {
      platform: 'youtube',
      sourceUrl: url,
      canonicalUrl: videoId
        ? `https://youtube.com/watch?v=${videoId}`
        : canonicalizeUrl(url),
      metadata,
      transcript,
      extractionMethod,
    };
  }
}

export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.replace(/^\//, '').split('/')[0] || null;
    if (u.searchParams.has('v')) return u.searchParams.get('v');
    // /shorts/<id> or /embed/<id>
    const m = /^\/(?:shorts|embed)\/([^/?]+)/.exec(u.pathname);
    if (m) return m[1];
    return null;
  } catch {
    return null;
  }
}

async function fetchApiMetadata(videoId: string, apiKey: string): Promise<YouTubeApiSnippet | null> {
  const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(
    videoId
  )}&key=${encodeURIComponent(apiKey)}`;
  const json = await safeFetchJson<YouTubeApiResponse>(endpoint, { timeoutMs: 8000 });
  return json.items?.[0]?.snippet ?? null;
}

async function fetchOEmbed(url: string): Promise<YouTubeOEmbedResponse | null> {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    url
  )}&format=json`;
  return safeFetchJson<YouTubeOEmbedResponse>(endpoint, { timeoutMs: 8000 });
}

async function fetchTranscript(videoId: string): Promise<string | undefined> {
  const items = await YoutubeTranscript.fetchTranscript(videoId);
  if (!items || items.length === 0) return undefined;
  const text = items.map((i) => i.text).join(' ');
  return text.slice(0, TRANSCRIPT_MAX_CHARS);
}
