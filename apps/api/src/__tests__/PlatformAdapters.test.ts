/**
 * Unit tests for the PRP-220.14 platform adapters. Mocks `global.fetch`
 * so no real network is involved.
 */
import { InstagramAdapter } from '../services/imports/platforms/InstagramAdapter';
import { TikTokAdapter } from '../services/imports/platforms/TikTokAdapter';
import { YouTubeAdapter, extractVideoId } from '../services/imports/platforms/YouTubeAdapter';
import { WebAdapter } from '../services/imports/platforms/WebAdapter';
import { isAllowedFetchUrl, SSRFBlockedError } from '../services/imports/platforms/ssrfGuard';

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function mockFetch(handler: FetchHandler) {
  const spy = jest.spyOn(globalThis, 'fetch').mockImplementation(((input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.url;
    return Promise.resolve(handler(url, init));
  }) as any);
  return spy;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.INSTAGRAM_OEMBED_TOKEN;
  delete process.env.YOUTUBE_API_KEY;
});

describe('SSRF guard', () => {
  it('blocks RFC1918, link-local, localhost, and AWS metadata', () => {
    expect(isAllowedFetchUrl('http://localhost/')).toBe(false);
    expect(isAllowedFetchUrl('http://127.0.0.1/')).toBe(false);
    expect(isAllowedFetchUrl('http://10.0.0.1/')).toBe(false);
    expect(isAllowedFetchUrl('http://192.168.1.1/')).toBe(false);
    expect(isAllowedFetchUrl('http://172.16.0.1/')).toBe(false);
    expect(isAllowedFetchUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isAllowedFetchUrl('http://printer.local/')).toBe(false);
    expect(isAllowedFetchUrl('ftp://example.com/')).toBe(false);
  });

  it('allows public hosts', () => {
    expect(isAllowedFetchUrl('https://example.com/')).toBe(true);
    expect(isAllowedFetchUrl('https://www.youtube.com/watch?v=xyz')).toBe(true);
  });

  it('safeFetch via an adapter throws SSRFBlockedError on blocked hosts', async () => {
    const adapter = new WebAdapter();
    // No fetch mock — should never reach fetch.
    const ctx = await adapter.fetchContext('http://169.254.169.254/secret');
    // WebAdapter swallows fetch errors and returns a context anyway.
    expect(ctx.metadata.title).toBeUndefined();
    expect(ctx.extractionMethod).toBe('metadata');

    // Direct check: safeFetch (used internally) raises SSRFBlockedError
    // before fetch is even called.
    const { safeFetch } = await import('../services/imports/platforms/ssrfGuard');
    await expect(safeFetch('http://localhost/')).rejects.toBeInstanceOf(SSRFBlockedError);
  });
});

describe('InstagramAdapter', () => {
  const url = 'https://www.instagram.com/p/CuBzp9J1aXx/';

  it('canHandle accepts instagram.com URLs', () => {
    const a = new InstagramAdapter();
    expect(a.canHandle(url)).toBe(true);
    expect(a.canHandle('https://www.tiktok.com/@x/video/1')).toBe(false);
  });

  it('uses oEmbed when INSTAGRAM_OEMBED_TOKEN is set', async () => {
    process.env.INSTAGRAM_OEMBED_TOKEN = 'tok-123';
    const fetchSpy = mockFetch((u) =>
      jsonResponse({
        title: 'Test reel',
        author_name: '@chef',
        thumbnail_url: 'https://cdn.example/thumb.jpg',
      })
    );
    const ctx = await new InstagramAdapter().fetchContext(url);
    expect(fetchSpy).toHaveBeenCalled();
    expect(ctx.metadata.title).toBe('Test reel');
    expect(ctx.metadata.authorName).toBe('@chef');
    expect(ctx.metadata.thumbnailUrl).toBe('https://cdn.example/thumb.jpg');
    expect(ctx.extractionMethod).toBe('oembed');
    expect(ctx.platform).toBe('instagram');
  });

  it('falls back to OG metadata when no token is set', async () => {
    mockFetch(() =>
      htmlResponse(`<!doctype html>
        <html><head>
          <meta property="og:title" content="OG title" />
          <meta property="og:description" content="OG description" />
          <meta property="og:image" content="https://cdn.example/og.jpg" />
        </head></html>`)
    );
    const ctx = await new InstagramAdapter().fetchContext(url);
    expect(ctx.metadata.title).toBe('OG title');
    expect(ctx.metadata.description).toBe('OG description');
    expect(ctx.metadata.thumbnailUrl).toBe('https://cdn.example/og.jpg');
    expect(ctx.extractionMethod).toBe('metadata');
  });

  it('returns metadata-only context when both oEmbed and OG fail', async () => {
    process.env.INSTAGRAM_OEMBED_TOKEN = 'tok';
    mockFetch(() => new Response('error', { status: 500 }));
    const ctx = await new InstagramAdapter().fetchContext(url);
    expect(ctx.metadata.title).toBeUndefined();
    expect(ctx.extractionMethod).toBe('metadata');
  });
});

describe('TikTokAdapter', () => {
  const url = 'https://www.tiktok.com/@chef/video/123';

  it('canHandle accepts tiktok.com URLs', () => {
    expect(new TikTokAdapter().canHandle(url)).toBe(true);
    expect(new TikTokAdapter().canHandle('https://example.com/')).toBe(false);
  });

  it('extracts metadata from public oEmbed', async () => {
    mockFetch(() =>
      jsonResponse({
        title: 'TikTok recipe',
        author_name: 'Chef Jean',
        author_unique_id: 'chefjean',
        author_url: 'https://www.tiktok.com/@chefjean',
        thumbnail_url: 'https://cdn.example/tt.jpg',
      })
    );
    const ctx = await new TikTokAdapter().fetchContext(url);
    expect(ctx.metadata.title).toBe('TikTok recipe');
    expect(ctx.metadata.authorName).toBe('Chef Jean');
    expect(ctx.metadata.authorHandle).toBe('chefjean');
    expect(ctx.metadata.authorUrl).toBe('https://www.tiktok.com/@chefjean');
    expect(ctx.metadata.thumbnailUrl).toBe('https://cdn.example/tt.jpg');
    expect(ctx.extractionMethod).toBe('oembed');
    expect(ctx.platform).toBe('tiktok');
  });

  it('still returns a context when oEmbed fails', async () => {
    mockFetch(() => new Response('boom', { status: 500 }));
    const ctx = await new TikTokAdapter().fetchContext(url);
    expect(ctx.extractionMethod).toBe('metadata');
    expect(ctx.metadata.title).toBeUndefined();
  });
});

describe('YouTubeAdapter', () => {
  const watchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  it('extractVideoId handles all the URL forms', () => {
    expect(extractVideoId(watchUrl)).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://youtu.be/abc123XYZ_-')).toBe('abc123XYZ_-');
    expect(extractVideoId('https://www.youtube.com/shorts/short-id')).toBe('short-id');
    expect(extractVideoId('https://www.youtube.com/embed/embed-id')).toBe('embed-id');
    expect(extractVideoId('https://youtube.com/')).toBeNull();
  });

  it('canHandle accepts youtube.com and youtu.be', () => {
    const a = new YouTubeAdapter();
    expect(a.canHandle(watchUrl)).toBe(true);
    expect(a.canHandle('https://youtu.be/x')).toBe(true);
    expect(a.canHandle('https://example.com/')).toBe(false);
  });

  it('uses Data API v3 when YOUTUBE_API_KEY is set', async () => {
    process.env.YOUTUBE_API_KEY = 'gkey';
    const fetchSpy = mockFetch((u) => {
      if (u.includes('googleapis.com')) {
        return jsonResponse({
          items: [
            {
              snippet: {
                title: 'API title',
                description: 'desc',
                channelTitle: 'Channel',
                thumbnails: { high: { url: 'https://cdn.example/hi.jpg' } },
              },
            },
          ],
        });
      }
      return new Response('fail', { status: 500 });
    });
    const ctx = await new YouTubeAdapter().fetchContext(watchUrl);
    expect(fetchSpy).toHaveBeenCalled();
    expect(ctx.metadata.title).toBe('API title');
    expect(ctx.metadata.description).toBe('desc');
    expect(ctx.metadata.authorName).toBe('Channel');
    expect(ctx.metadata.thumbnailUrl).toBe('https://cdn.example/hi.jpg');
    // No transcript mock — extractionMethod stays 'metadata'.
    expect(ctx.extractionMethod).toBe('metadata');
    expect(ctx.canonicalUrl).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('falls back to oEmbed when Data API misses', async () => {
    mockFetch((u) => {
      if (u.includes('youtube.com/oembed')) {
        return jsonResponse({
          title: 'oEmbed title',
          author_name: 'Author',
          thumbnail_url: 'https://cdn.example/oem.jpg',
        });
      }
      return new Response('fail', { status: 500 });
    });
    const ctx = await new YouTubeAdapter().fetchContext(watchUrl);
    expect(ctx.metadata.title).toBe('oEmbed title');
    expect(ctx.metadata.authorName).toBe('Author');
    expect(ctx.metadata.thumbnailUrl).toBe('https://cdn.example/oem.jpg');
  });
});

describe('WebAdapter', () => {
  it('canHandle accepts public http(s) URLs but not platform-specific hosts', () => {
    const a = new WebAdapter();
    expect(a.canHandle('https://www.marmiton.org/recettes/recette_pates-carbonara_15500.aspx')).toBe(true);
    expect(a.canHandle('https://www.instagram.com/p/x/')).toBe(false);
    expect(a.canHandle('https://www.tiktok.com/@x/video/1')).toBe(false);
    expect(a.canHandle('https://www.youtube.com/watch?v=x')).toBe(false);
    expect(a.canHandle('https://youtu.be/x')).toBe(false);
    expect(a.canHandle('javascript:alert(1)')).toBe(false);
  });

  it('extracts a JSON-LD Recipe and emits ai_inference rawText', async () => {
    const html = `<!doctype html><html><head>
      <meta property="og:title" content="OG title" />
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: 'Carbonara',
        description: 'Classique romain',
        author: { name: 'Chef Jean' },
        image: 'https://cdn.example/c.jpg',
        recipeIngredient: ['200g pates', '2 oeufs', '50g pancetta'],
        recipeInstructions: [
          { '@type': 'HowToStep', text: 'Faire bouillir' },
          { '@type': 'HowToStep', text: 'Cuire al dente' },
        ],
        recipeYield: 2,
        prepTime: 'PT5M',
        cookTime: 'PT10M',
      })}</script>
      </head><body></body></html>`;
    mockFetch(() => htmlResponse(html));
    const ctx = await new WebAdapter().fetchContext('https://www.example.com/recipe');
    expect(ctx.metadata.title).toBe('Carbonara');
    expect(ctx.metadata.description).toBe('Classique romain');
    expect(ctx.metadata.authorName).toBe('Chef Jean');
    expect(ctx.metadata.thumbnailUrl).toBe('https://cdn.example/c.jpg');
    expect(ctx.extractionMethod).toBe('ai_inference');
    expect(ctx.rawText).toContain('200g pates');
    expect(ctx.rawText).toContain('Faire bouillir');
    expect(ctx.platform).toBe('web');
  });

  it('falls back to OG metadata when no JSON-LD recipe is present', async () => {
    const html = `<!doctype html><html><head>
      <title>Page title</title>
      <meta property="og:title" content="OG only" />
      <meta property="og:image" content="https://cdn.example/og.jpg" />
    </head></html>`;
    mockFetch(() => htmlResponse(html));
    const ctx = await new WebAdapter().fetchContext('https://www.example.com/page');
    expect(ctx.metadata.title).toBe('OG only');
    expect(ctx.metadata.thumbnailUrl).toBe('https://cdn.example/og.jpg');
    expect(ctx.rawText).toBeUndefined();
    expect(ctx.extractionMethod).toBe('metadata');
  });

  it('returns a context with empty metadata when fetch fails', async () => {
    mockFetch(() => new Response('boom', { status: 500 }));
    const ctx = await new WebAdapter().fetchContext('https://www.example.com/dead');
    expect(ctx.metadata.title).toBeUndefined();
    expect(ctx.extractionMethod).toBe('metadata');
  });
});
