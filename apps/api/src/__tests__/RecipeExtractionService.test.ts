import {
  OpenAIRecipeExtractionService,
  type AICompletionClient,
  type AICompletionRequest,
  type AICompletionResponse,
} from '../services/imports/RecipeExtractionService';
import { FallbackWebAdapter } from '../services/imports/platforms/FallbackWebAdapter';
import type { SocialImportRow } from '../services/imports/SocialImportRepository';

const baseImport = (overrides: Record<string, unknown> = {}): SocialImportRow => ({
  id: 'imp-1',
  user_id: 'user-a',
  platform: 'instagram',
  source_url: 'https://www.instagram.com/reel/abc/',
  canonical_url: 'https://instagram.com/reel/abc',
  source_hash: 'h',
  status: 'captured',
  title: null,
  author_name: null,
  author_handle: null,
  thumbnail_url: null,
  metadata: {},
  error_code: null,
  error_message: null,
  confidence: null,
  recipe_id: null,
  created_at: '2026-05-07T00:00:00.000Z',
  updated_at: '2026-05-07T00:00:00.000Z',
  ...overrides,
});

const goodAiResponse = (): AICompletionResponse => ({
  model: 'gpt-4o-mini',
  content: JSON.stringify({
    title: 'Pates carbonara',
    description: 'classique romain',
    ingredients: [
      { name: 'pates', quantity: 200, unit: 'g' },
      { name: 'oeuf', quantity: 2 },
      { name: 'pancetta', quantity: 50, unit: 'g' },
      { name: 'parmesan', quantity: 30, unit: 'g' },
    ],
    instructions: [
      { step: 1, description: 'Faire bouillir l\'eau salee' },
      { step: 2, description: 'Cuire les pates al dente' },
      { step: 3, description: 'Battre les oeufs avec le parmesan' },
      { step: 4, description: 'Melanger hors du feu' },
    ],
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    servings: 2,
    tags: ['italien', 'rapide'],
  }),
  usage: { prompt_tokens: 800, completion_tokens: 200 },
});

function makeAi(response: AICompletionResponse | (() => AICompletionResponse)): AICompletionClient & { calls: AICompletionRequest[] } {
  const calls: AICompletionRequest[] = [];
  return {
    calls,
    async complete(req) {
      calls.push(req);
      return typeof response === 'function' ? response() : response;
    },
  };
}

describe('OpenAIRecipeExtractionService (PRP-220.13)', () => {
  it('returns a Zod-valid draft + cost + duration on a typical AI response', async () => {
    const ai = makeAi(goodAiResponse());
    const svc = new OpenAIRecipeExtractionService([new FallbackWebAdapter()], ai);

    const result = await svc.extract(baseImport());

    expect(result.draft.title).toBe('Pates carbonara');
    expect(result.draft.ingredients).toHaveLength(4);
    expect(result.draft.instructions).toHaveLength(4);
    expect(result.draft.source.platform).toBe('instagram');
    expect(result.draft.source.canonicalUrl).toBe('https://instagram.com/reel/abc');
    expect(result.draft.source.extractionMethod).toBe('metadata');
    expect(result.modelUsed).toBe('gpt-4o-mini');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.cost?.inputTokens).toBe(800);
    expect(result.cost?.outputTokens).toBe(200);
    expect(result.cost?.usd).toBeGreaterThan(0);
    // confidence is capped at 0.6 because the FallbackWebAdapter
    // emits extractionMethod = "metadata".
    expect(result.draft.confidence).toBeLessThanOrEqual(0.6);
  });

  it('forwards the user hint to the AI prompt', async () => {
    const ai = makeAi(goodAiResponse());
    const svc = new OpenAIRecipeExtractionService([new FallbackWebAdapter()], ai);
    await svc.extract(baseImport(), { hint: 'use the description, not the title' });
    const userMsg = ai.calls[0].messages[1].content;
    expect(userMsg).toContain('User hint: use the description, not the title');
  });

  it('seeds the AI prompt from the import row metadata', async () => {
    const ai = makeAi(goodAiResponse());
    const svc = new OpenAIRecipeExtractionService([new FallbackWebAdapter()], ai);
    await svc.extract(
      baseImport({ title: 'Reel #cookies', author_name: 'Chef Jean' })
    );
    const userMsg = ai.calls[0].messages[1].content;
    expect(userMsg).toContain('Title: Reel #cookies');
    expect(userMsg).toContain('Author: Chef Jean');
  });

  it('throws when the AI returns non-JSON content', async () => {
    const ai = makeAi({
      model: 'gpt-4o-mini',
      content: 'oops not json',
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });
    const svc = new OpenAIRecipeExtractionService([new FallbackWebAdapter()], ai);
    await expect(svc.extract(baseImport())).rejects.toThrow(/non-JSON content/i);
  });

  it('falls back to a placeholder title when the AI returns empty + import has no title', async () => {
    // Defensive normalisation: an empty AI title is rewritten to the
    // import's seed title or to "Recette importee" so a permissive
    // model output never trips the Zod min(1) on title.
    const ai = makeAi({
      model: 'gpt-4o-mini',
      content: JSON.stringify({
        title: '',
        ingredients: [],
        instructions: [],
        tags: [],
      }),
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });
    const svc = new OpenAIRecipeExtractionService([new FallbackWebAdapter()], ai);
    const result = await svc.extract(baseImport());
    expect(result.draft.title).toBe('Recette importee');
    expect(result.draft.extractionWarnings).toEqual(
      expect.arrayContaining(['Aucun ingredient detecte'])
    );
  });

  it('falls back to the source title when the AI omits title', async () => {
    const ai = makeAi({
      model: 'gpt-4o-mini',
      content: JSON.stringify({
        // no title field at all
        ingredients: [{ name: 'oeuf' }],
        instructions: [{ step: 1, description: 'cuire' }],
        tags: [],
      }),
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });
    const svc = new OpenAIRecipeExtractionService([new FallbackWebAdapter()], ai);
    const result = await svc.extract(baseImport({ title: 'Reel #carbo' }));
    expect(result.draft.title).toBe('Reel #carbo');
  });

  it('coerces malformed instructions into the canonical shape', async () => {
    const ai = makeAi({
      model: 'gpt-4o-mini',
      content: JSON.stringify({
        title: 'Crepe',
        ingredients: [{ name: 'farine', quantity: 250, unit: 'g' }],
        instructions: [
          'Mélanger', // string instead of object
          { description: 'Cuire' }, // no step number
          { step: 9, description: 'Servir' },
        ],
        tags: [],
      }),
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });
    const svc = new OpenAIRecipeExtractionService([new FallbackWebAdapter()], ai);
    const result = await svc.extract(baseImport());
    expect(result.draft.instructions).toEqual([
      { step: 1, description: 'Mélanger' },
      { step: 2, description: 'Cuire' },
      { step: 9, description: 'Servir' },
    ]);
  });

  it('throws when no platform adapter matches the URL', async () => {
    const ai = makeAi(goodAiResponse());
    // Adapter that never claims any URL.
    const noAdapter = { canHandle: () => false, fetchContext: jest.fn() } as any;
    const svc = new OpenAIRecipeExtractionService([noAdapter], ai);
    await expect(svc.extract(baseImport())).rejects.toThrow(/No platform adapter/);
  });

  it('uses the configured model', async () => {
    const ai = makeAi({ ...goodAiResponse(), model: 'gpt-4o' });
    const svc = new OpenAIRecipeExtractionService([new FallbackWebAdapter()], ai, {
      model: 'gpt-4o',
    });
    await svc.extract(baseImport());
    expect(ai.calls[0].model).toBe('gpt-4o');
  });

  it('produces a low-confidence draft + warnings on a poor AI response', async () => {
    const ai = makeAi({
      model: 'gpt-4o-mini',
      content: JSON.stringify({
        title: 'X',
        ingredients: [],
        instructions: [],
        tags: [],
      }),
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });
    const svc = new OpenAIRecipeExtractionService([new FallbackWebAdapter()], ai);
    const result = await svc.extract(baseImport());
    expect(result.draft.confidence).toBeLessThan(0.3);
    expect(result.draft.extractionWarnings).toEqual(
      expect.arrayContaining(['Aucun ingredient detecte']),
    );
  });
});
