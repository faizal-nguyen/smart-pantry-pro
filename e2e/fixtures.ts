/**
 * Shared Playwright fixtures (PRP-220.21).
 *
 * `mockedApiPage` exposes a Page with every `/api/imports/social/**`
 * request stubbed via `page.route()`. Tests that exercise the inbox
 * flow no longer need a live API or Supabase auth — the routes own
 * the contract and the tests own the assertions.
 *
 * State lives in the closure: `state.imports` is the in-memory list
 * the mocks read/write so capture -> list -> extract -> save threads
 * through coherently across mocked calls.
 */
import { test as base, expect, type Page, type Route } from '@playwright/test';

export interface MockImport {
  id: string;
  user_id: string;
  platform: string;
  source_url: string;
  canonical_url: string;
  status: string;
  title: string | null;
  author_name: string | null;
  thumbnail_url: string | null;
  confidence: number | null;
  recipe_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockState {
  imports: MockImport[];
  recipeIdCounter: number;
}

export function createMockState(): MockState {
  return { imports: [], recipeIdCounter: 0 };
}

function envelope<T>(data: T, code = 'OK', status = 200) {
  return { status, body: JSON.stringify({ success: true, data, code }) };
}

function fail(message: string, code: string, status: number) {
  return { status, body: JSON.stringify({ success: false, message, code }) };
}

function makeImport(url: string): MockImport {
  const now = new Date().toISOString();
  return {
    id: `imp-${Math.random().toString(36).slice(2, 10)}`,
    user_id: 'e2e-user',
    platform: detectPlatform(url),
    source_url: url,
    canonical_url: url.replace(/\?.*$/, '').replace(/\/$/, ''),
    status: 'captured',
    title: null,
    author_name: null,
    thumbnail_url: null,
    confidence: null,
    recipe_id: null,
    created_at: now,
    updated_at: now,
  };
}

function detectPlatform(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('instagram')) return 'instagram';
    if (u.hostname.includes('tiktok')) return 'tiktok';
    if (u.hostname.includes('youtube') || u.hostname === 'youtu.be') return 'youtube';
    return 'web';
  } catch {
    return 'unknown';
  }
}

/**
 * Wires up `page.route()` handlers for the entire imports.social
 * surface. Returns the shared `MockState` so individual tests can seed
 * pre-existing imports or assert post-conditions.
 */
export async function installImportsApiMocks(page: Page, state: MockState) {
  // Counts (gauge + onboarding gate)
  await page.route(/\/api\/imports\/social\/counts(?:\?.*)?$/, async (route: Route) => {
    const active = state.imports.filter((i) => i.status !== 'archived' && i.status !== 'saved').length;
    await route.fulfill(
      envelope({
        total: state.imports.length,
        active,
        byPlatform: {},
        byStatus: {},
        quota: { tier: 'free', limit: 25, remaining: Math.max(0, 25 - active) },
      })
    );
  });

  // List (cursor-paginated)
  await page.route(/\/api\/imports\/social(?:\?.*)?$/, async (route: Route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      await route.fulfill(envelope({ items: state.imports, nextCursor: null }, 'LIST_OK'));
      return;
    }
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() ?? '{}');
      const url = body.url as string;
      const existing = state.imports.find((i) => i.source_url === url);
      if (existing) {
        await route.fulfill(
          envelope({ import: existing, duplicate: true }, 'CAPTURE_DUPLICATE', 200)
        );
        return;
      }
      const fresh = makeImport(url);
      state.imports.unshift(fresh);
      await route.fulfill(envelope({ import: fresh, duplicate: false }, 'CAPTURE_OK', 201));
      return;
    }
    await route.fulfill(fail('Method not allowed', 'METHOD_NOT_ALLOWED', 405));
  });

  // Extract — stub a successful AI run on the matching import.
  await page.route(/\/api\/imports\/social\/[^/]+\/extract$/, async (route: Route) => {
    const m = /\/api\/imports\/social\/([^/]+)\/extract/.exec(route.request().url());
    const id = m?.[1];
    const target = state.imports.find((i) => i.id === id);
    if (!target) {
      await route.fulfill(fail('Not found', 'NOT_FOUND', 404));
      return;
    }
    target.status = 'draft_ready';
    target.title = 'Pâtes carbonara';
    target.confidence = 0.82;
    target.thumbnail_url = 'https://placehold.co/200x200';
    await route.fulfill(
      envelope(
        {
          import: target,
          draft: {
            id: 'draft-1',
            version: 1,
            draft_json: { title: 'Pâtes carbonara' },
          },
          modelUsed: 'gpt-4o-mini',
          durationMs: 420,
          cost: { inputTokens: 300, outputTokens: 100, usd: 0.001 },
        },
        'EXTRACT_OK'
      )
    );
  });

  // Save — flips status, returns a fake recipe id.
  await page.route(/\/api\/imports\/social\/[^/]+\/save$/, async (route: Route) => {
    const m = /\/api\/imports\/social\/([^/]+)\/save/.exec(route.request().url());
    const id = m?.[1];
    const target = state.imports.find((i) => i.id === id);
    if (!target) {
      await route.fulfill(fail('Not found', 'NOT_FOUND', 404));
      return;
    }
    target.status = 'saved';
    state.recipeIdCounter += 1;
    target.recipe_id = `recipe-${state.recipeIdCounter}`;
    await route.fulfill(
      envelope({ import: target, recipe_id: target.recipe_id }, 'SAVE_OK')
    );
  });
}

interface MockedApiFixtures {
  mockedApiPage: Page;
  mockState: MockState;
}

export const test = base.extend<MockedApiFixtures>({
  mockState: async ({}, use) => {
    await use(createMockState());
  },
  mockedApiPage: async ({ page, mockState }, use) => {
    await installImportsApiMocks(page, mockState);
    await use(page);
  },
});

export { expect };
