/**
 * Unit tests for the saveImportedDraftAsRecipe service (PRP-220.16).
 *
 * The service is a thin shim over the `save_imported_recipe` Postgres
 * RPC: real idempotence + atomicity is enforced by the function itself
 * (covered by integration tests once Supabase is reachable). Here we
 * verify the TS layer:
 *   - it calls the RPC with the right name + parameter shape
 *   - it serializes the structured draft into the SQL-friendly JSON
 *     the RPC expects (instructions_text, source_metadata, tags merge,
 *     ingredient is_essential default)
 *   - it returns the recipe id and surfaces RPC errors with context
 */
import type { ImportedRecipeDraft } from '@smart/shared';

import { saveImportedDraftAsRecipe } from '../services/imports/saveImportedDraftAsRecipe';

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

function makeMockClient(response: { data?: unknown; error?: { code?: string; message: string } | null }) {
  const calls: RpcCall[] = [];
  const client = {
    rpc: jest.fn((fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return Promise.resolve(response);
    }),
  } as any;
  return { client, calls };
}

function makeDraft(overrides: Partial<ImportedRecipeDraft> = {}): ImportedRecipeDraft {
  return {
    title: 'Pates carbonara',
    description: 'classique romain',
    ingredients: [
      { name: 'pates', quantity: 200, unit: 'g' },
      { name: 'oeuf', quantity: 2 },
      { name: 'pancetta', quantity: 50, unit: 'g', isEssential: false },
    ],
    instructions: [
      { step: 1, description: 'Faire bouillir l\'eau' },
      { step: 2, description: 'Cuire les pates al dente' },
      { step: 3, description: 'Melanger hors du feu' },
    ],
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    servings: 2,
    tags: ['italien', 'rapide'],
    cuisineCategory: 'italien',
    mealType: 'plat',
    confidence: 0.82,
    extractionWarnings: [],
    source: {
      platform: 'instagram',
      sourceUrl: 'https://www.instagram.com/reel/abc/',
      canonicalUrl: 'https://instagram.com/reel/abc',
      authorName: 'Chef Jean',
      authorHandle: 'chefjean',
      thumbnailUrl: 'https://cdn.example/thumb.jpg',
      originalTitle: 'Reel #carbo',
      importedAt: '2026-05-07T10:00:00.000Z',
      extractionMethod: 'transcript',
    },
    ...overrides,
  };
}

describe('saveImportedDraftAsRecipe (PRP-220.16)', () => {
  it('calls the save_imported_recipe RPC with the canonical payload', async () => {
    const { client, calls } = makeMockClient({ data: 'recipe-uuid-1' });

    const recipeId = await saveImportedDraftAsRecipe(
      client,
      'user-a',
      makeDraft(),
      { importId: 'imp-1', collections: ['favoris'], personalNotes: 'top' }
    );

    expect(recipeId).toBe('recipe-uuid-1');
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(calls[0].fn).toBe('save_imported_recipe');

    const args = calls[0].args as any;
    expect(args.p_import_id).toBe('imp-1');

    const recipe = args.p_recipe;
    expect(recipe.name).toBe('Pates carbonara');
    expect(recipe.source_platform).toBe('instagram');
    expect(recipe.source_url).toBe('https://www.instagram.com/reel/abc/');
    expect(recipe.image_url).toBe('https://cdn.example/thumb.jpg');
    expect(recipe.servings).toBe(2);
    expect(recipe.prep_time).toBe(5);
    expect(recipe.cook_time).toBe(10);

    // tags merge draft.tags + collections, deduped, original-cased.
    expect(recipe.tags).toEqual(['italien', 'rapide', 'favoris']);

    // instructions are flattened into a numbered text blob (NOT NULL
    // constraint on the legacy column).
    expect(recipe.instructions_text).toBe(
      "1. Faire bouillir l'eau\n2. Cuire les pates al dente\n3. Melanger hors du feu"
    );

    // source_metadata carries provenance + the structured instructions
    // for any reader that wants the array form.
    expect(recipe.source_metadata.confidence).toBeCloseTo(0.82);
    expect(recipe.source_metadata.extractionMethod).toBe('transcript');
    expect(recipe.source_metadata.authorName).toBe('Chef Jean');
    expect(recipe.source_metadata.personalNotes).toBe('top');
    expect(Array.isArray(recipe.source_metadata.instructions)).toBe(true);
  });

  it('forwards ingredients with quantities + is_essential defaulting to true', async () => {
    const { client, calls } = makeMockClient({ data: 'recipe-uuid-2' });
    await saveImportedDraftAsRecipe(client, 'user-a', makeDraft(), { importId: 'imp-2' });

    const ingredients = (calls[0].args as any).p_ingredients as any[];
    expect(ingredients).toHaveLength(3);
    expect(ingredients[0]).toMatchObject({
      name: 'pates',
      quantity: 200,
      unit: 'g',
      is_essential: true,
    });
    // Item 2 has no isEssential -> defaulted to true.
    expect(ingredients[1].is_essential).toBe(true);
    // Item 3 explicitly false.
    expect(ingredients[2].is_essential).toBe(false);
  });

  it('deduplicates tags case-insensitively when collections overlap with draft.tags', async () => {
    const { client, calls } = makeMockClient({ data: 'r' });
    await saveImportedDraftAsRecipe(
      client,
      'user-a',
      makeDraft({ tags: ['Italien', 'Rapide'] }),
      { importId: 'imp-3', collections: ['italien', 'pates'] }
    );
    const recipe = (calls[0].args as any).p_recipe;
    expect(recipe.tags).toEqual(['Italien', 'Rapide', 'pates']);
  });

  it('throws a contextful error when the RPC returns an error', async () => {
    const { client } = makeMockClient({
      error: { code: '23505', message: 'duplicate key value' },
    });
    await expect(
      saveImportedDraftAsRecipe(client, 'user-a', makeDraft(), { importId: 'imp-4' })
    ).rejects.toThrow(/save_imported_recipe RPC failed.*23505.*duplicate key/);
  });

  it('throws when the RPC returns no recipe id', async () => {
    const { client } = makeMockClient({ data: null });
    await expect(
      saveImportedDraftAsRecipe(client, 'user-a', makeDraft(), { importId: 'imp-5' })
    ).rejects.toThrow(/no recipe id/i);
  });

  it('falls back to source.thumbnailUrl when draft.imageUrl is absent', async () => {
    const { client, calls } = makeMockClient({ data: 'r' });
    await saveImportedDraftAsRecipe(
      client,
      'user-a',
      makeDraft({ imageUrl: undefined }),
      { importId: 'imp-6' }
    );
    const recipe = (calls[0].args as any).p_recipe;
    expect(recipe.image_url).toBe('https://cdn.example/thumb.jpg');
  });
});
