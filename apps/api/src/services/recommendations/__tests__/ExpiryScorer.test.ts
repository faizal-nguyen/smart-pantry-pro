/**
 * PRP-226 PR2 — ExpiryScorer pure-function tests.
 */

import { bonusForDays, daysUntilExpiry, scoreExpiry } from '../ExpiryScorer.js';
import type {
  InventorySnapshot,
  RecipeWithIngredients,
} from '../types.js';

const NOW = new Date('2026-05-17T10:00:00Z');

function isoPlusDays(days: number): string {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function makeRecipe(productIds: Array<string | null>): RecipeWithIngredients {
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
    created_at: NOW.toISOString(),
    recipe_ingredients: productIds.map((pid, idx) => ({
      id: `i${idx}`,
      ingredient_name: `ing-${idx}`,
      quantity: 1,
      inventory_product_id: pid,
      is_essential: true,
    })),
  };
}

function makeInv(
  rows: Array<{ id: string; expiry: string | null; name?: string }>,
): InventorySnapshot {
  return {
    byProduct: new Map(
      rows.map((r) => [
        r.id,
        { quantity: 5, expiryDate: r.expiry, productName: r.name ?? null },
      ]),
    ),
  };
}

describe('daysUntilExpiry', () => {
  it('returns null for null/undefined input', () => {
    expect(daysUntilExpiry(null, NOW)).toBeNull();
  });
  it('returns 0 for today and negative for past dates', () => {
    expect(daysUntilExpiry(NOW.toISOString(), NOW)).toBe(0);
    expect(daysUntilExpiry(isoPlusDays(-3), NOW)).toBe(-3);
  });
  it('returns positive integer for future dates', () => {
    expect(daysUntilExpiry(isoPlusDays(5), NOW)).toBe(5);
  });
});

describe('bonusForDays', () => {
  it('null → 0 (neutral)', () => {
    expect(bonusForDays(null, 7)).toBe(0);
  });
  it('expired or today → 1', () => {
    expect(bonusForDays(0, 7)).toBe(1);
    expect(bonusForDays(-2, 7)).toBe(1);
  });
  it('1..3 days → 0.8', () => {
    expect(bonusForDays(1, 7)).toBe(0.8);
    expect(bonusForDays(3, 7)).toBe(0.8);
  });
  it('4..7 days → 0.4', () => {
    expect(bonusForDays(4, 7)).toBe(0.4);
    expect(bonusForDays(7, 7)).toBe(0.4);
  });
  it('beyond nearExpiryDays → 0', () => {
    expect(bonusForDays(10, 7)).toBe(0);
  });
});

describe('scoreExpiry', () => {
  it('returns 0 when no essential has an expiry date', () => {
    const recipe = makeRecipe(['p-1', 'p-2']);
    const inv = makeInv([
      { id: 'p-1', expiry: null },
      { id: 'p-2', expiry: null },
    ]);
    const r = scoreExpiry(recipe, inv, { now: NOW });
    expect(r.score).toBe(0);
    expect(r.expiring_ingredients).toEqual([]);
  });

  it('drives score to 1 when one product expires today', () => {
    const recipe = makeRecipe(['p-1']);
    const inv = makeInv([{ id: 'p-1', expiry: NOW.toISOString(), name: 'Yaourt' }]);
    const r = scoreExpiry(recipe, inv, { now: NOW });
    expect(r.score).toBe(1);
    expect(r.expiring_ingredients).toHaveLength(1);
    expect(r.expiring_ingredients[0].product_name).toBe('Yaourt');
    expect(r.expiring_ingredients[0].days_to_expiry).toBe(0);
  });

  it('returns 0.8 main bonus + 0.05 extra hit for 2 ingredients in 1-3 days', () => {
    const recipe = makeRecipe(['p-1', 'p-2']);
    const inv = makeInv([
      { id: 'p-1', expiry: isoPlusDays(2), name: 'Tomate' },
      { id: 'p-2', expiry: isoPlusDays(1), name: 'Salade' },
    ]);
    const r = scoreExpiry(recipe, inv, { now: NOW });
    expect(r.score).toBeCloseTo(0.85, 5);
    // Most urgent first (1d before 2d).
    expect(r.expiring_ingredients.map((e) => e.product_name)).toEqual(['Salade', 'Tomate']);
  });

  it('ignores unlinked essentials (no inventory_product_id)', () => {
    const recipe = makeRecipe([null]);
    const inv = makeInv([]);
    const r = scoreExpiry(recipe, inv, { now: NOW });
    expect(r.score).toBe(0);
    expect(r.expiring_ingredients).toEqual([]);
  });

  it('caps total score at 1 even with many near-expiry products', () => {
    const recipe = makeRecipe(['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6']);
    const inv = makeInv([
      { id: 'p-1', expiry: NOW.toISOString() }, // today → topBonus = 1
      { id: 'p-2', expiry: isoPlusDays(1) },
      { id: 'p-3', expiry: isoPlusDays(1) },
      { id: 'p-4', expiry: isoPlusDays(2) },
      { id: 'p-5', expiry: isoPlusDays(2) },
      { id: 'p-6', expiry: isoPlusDays(3) },
    ]);
    const r = scoreExpiry(recipe, inv, { now: NOW });
    expect(r.score).toBe(1);
  });
});
