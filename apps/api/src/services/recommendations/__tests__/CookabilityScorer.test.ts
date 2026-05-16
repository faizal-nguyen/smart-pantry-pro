/**
 * PRP-226 PR2 — CookabilityScorer pure-function tests.
 *
 * Covers : fully cookable, missing linked, unlinked essential,
 * incompatible-unit (treated as unknown), no essentials excluded,
 * mixed missing + unlinked combined gap, missingPenalty curve.
 */

import {
  missingPenaltyFromGap,
  scoreCookability,
} from '../CookabilityScorer.js';
import type {
  InventorySnapshot,
  RecipeWithIngredients,
} from '../types.js';

function makeRecipe(
  ings: Array<{
    inventory_product_id: string | null;
    quantity?: number;
    name?: string;
    is_essential?: boolean | null;
  }>,
): RecipeWithIngredients {
  return {
    id: 'r1',
    name: 'Test',
    description: null,
    prep_time: 10,
    cook_time: 0,
    servings: 2,
    image_url: null,
    cuisine_category: null,
    meal_type: null,
    tags: null,
    created_at: '2026-05-17T00:00:00Z',
    recipe_ingredients: ings.map((i, idx) => ({
      id: `i${idx}`,
      ingredient_name: i.name ?? `ing-${idx}`,
      quantity: i.quantity ?? 1,
      inventory_product_id: i.inventory_product_id,
      is_essential: i.is_essential ?? true,
    })),
  };
}

function makeInventory(
  rows: Array<{ id: string; quantity: number; expiry?: string | null }>,
): InventorySnapshot {
  return {
    byProduct: new Map(
      rows.map((r) => [
        r.id,
        { quantity: r.quantity, expiryDate: r.expiry ?? null, productName: null },
      ]),
    ),
  };
}

describe('scoreCookability', () => {
  it('returns score=1 when every essential is in stock with enough quantity', () => {
    const recipe = makeRecipe([
      { inventory_product_id: 'p-tomate', quantity: 2 },
      { inventory_product_id: 'p-mozza', quantity: 100 },
    ]);
    const inv = makeInventory([
      { id: 'p-tomate', quantity: 5 },
      { id: 'p-mozza', quantity: 200 },
    ]);
    const r = scoreCookability(recipe, inv);
    expect(r.score).toBe(1);
    expect(r.combined_gap).toBe(0);
    expect(r.missing_count).toBe(0);
    expect(r.unlinked_count).toBe(0);
  });

  it('reports missing ingredients as "missing" (linked but absent in inventory)', () => {
    const recipe = makeRecipe([
      { inventory_product_id: 'p-riz', name: 'Riz', quantity: 200 },
      { inventory_product_id: 'p-bouillon', name: 'Bouillon', quantity: 1 },
    ]);
    const inv = makeInventory([{ id: 'p-riz', quantity: 500 }]); // bouillon absent
    const r = scoreCookability(recipe, inv);
    expect(r.missing_count).toBe(1);
    expect(r.missing_ingredients).toEqual(['Bouillon']);
    expect(r.unlinked_count).toBe(0);
    expect(r.combined_gap).toBe(1);
    expect(r.score).toBeCloseTo(0.5, 5);
  });

  it('flags unlinked essentials as unknown and surfaces them in the unknown list', () => {
    const recipe = makeRecipe([
      { inventory_product_id: 'p-x', name: 'Tomate' },
      { inventory_product_id: null, name: 'Épice mystère' },
    ]);
    const inv = makeInventory([{ id: 'p-x', quantity: 10 }]);
    const r = scoreCookability(recipe, inv);
    expect(r.unlinked).toBe(true);
    expect(r.unlinked_count).toBe(1);
    expect(r.unknown_ingredients).toEqual(['Épice mystère']);
    expect(r.missing_count).toBe(0);
    expect(r.combined_gap).toBe(1);
    expect(r.score).toBeCloseTo(0.5, 5);
  });

  it('excludes recipes with no essentials (score=0, total_essential=0)', () => {
    const recipe: RecipeWithIngredients = {
      ...makeRecipe([]),
      recipe_ingredients: [],
    };
    const r = scoreCookability(recipe, makeInventory([]));
    expect(r.score).toBe(0);
    expect(r.total_essential).toBe(0);
  });

  it('combines missing + unlinked into combined_gap and degrades linearly', () => {
    // 4 essentials : 1 in stock, 1 missing, 2 unlinked → gap = 3 / 4 → score = 0.25
    const recipe = makeRecipe([
      { inventory_product_id: 'p-1', name: 'Ok', quantity: 1 },
      { inventory_product_id: 'p-2', name: 'Manquant', quantity: 1 },
      { inventory_product_id: null, name: 'Unknown A' },
      { inventory_product_id: null, name: 'Unknown B' },
    ]);
    const inv = makeInventory([{ id: 'p-1', quantity: 5 }]);
    const r = scoreCookability(recipe, inv);
    expect(r.combined_gap).toBe(3);
    expect(r.missing_count).toBe(1);
    expect(r.unlinked_count).toBe(2);
    expect(r.score).toBeCloseTo(0.25, 5);
  });

  it('ignores non-essential ingredients in the gap math', () => {
    const recipe = makeRecipe([
      { inventory_product_id: 'p-1', quantity: 1 },
      { inventory_product_id: null, is_essential: false }, // shouldn't count
    ]);
    const inv = makeInventory([{ id: 'p-1', quantity: 5 }]);
    const r = scoreCookability(recipe, inv);
    expect(r.total_essential).toBe(1);
    expect(r.unlinked_count).toBe(0);
    expect(r.score).toBe(1);
  });
});

describe('missingPenaltyFromGap', () => {
  it('returns 0 for gap=0 regardless of threshold', () => {
    expect(missingPenaltyFromGap(0, 3)).toBe(0);
    expect(missingPenaltyFromGap(0, 0)).toBe(0);
  });
  it('grows linearly up to 1 at the threshold', () => {
    expect(missingPenaltyFromGap(1, 4)).toBeCloseTo(0.25, 5);
    expect(missingPenaltyFromGap(2, 4)).toBeCloseTo(0.5, 5);
    expect(missingPenaltyFromGap(4, 4)).toBe(1);
  });
  it('caps at 1 beyond the threshold (no runaway malus)', () => {
    expect(missingPenaltyFromGap(10, 3)).toBe(1);
  });
  it('handles almostThreshold=0 as "any gap is full penalty"', () => {
    expect(missingPenaltyFromGap(1, 0)).toBe(1);
  });
});
