/**
 * PRP-226 PR6 — PreferenceScorer V1 unit tests.
 *
 * Each case is a pure function call : we build a recipe + memory +
 * interaction snapshot and assert the score + reasons. No Supabase.
 */

import {
  scorePreference,
  type PreferenceMemory,
  type RecipeInteractionSummary,
} from '../PreferenceScorer.js';
import type { RecipeWithIngredients } from '../types.js';

const NOW = new Date('2026-05-17T10:00:00Z');
const USER = '11111111-1111-1111-1111-111111111111';

function recipe(overrides: Partial<RecipeWithIngredients> = {}): RecipeWithIngredients {
  return {
    id: 'r-test',
    name: 'Tagliatelles aux tomates cerises',
    description: null,
    prep_time: 15,
    cook_time: 10,
    servings: 2,
    image_url: null,
    cuisine_category: 'italien',
    meal_type: 'dinner',
    tags: ['pasta', 'rapide'],
    created_at: '2026-05-15T00:00:00Z',
    recipe_ingredients: [],
    ...overrides,
  };
}

function mem(
  kind: PreferenceMemory['kind'],
  content: string,
  overrides: Partial<PreferenceMemory> = {},
): PreferenceMemory {
  return {
    id: `mem-${kind}-${content.slice(0, 6)}`,
    kind,
    content,
    normalized_content: null,
    sensitivity: 'normal',
    subject_type: null,
    subject_id: null,
    ...overrides,
  };
}

function interactionDaysAgo(
  recipeId: string | null,
  type: RecipeInteractionSummary['interaction_type'],
  daysAgo: number,
): RecipeInteractionSummary {
  return {
    recipe_id: recipeId,
    interaction_type: type,
    created_at: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  };
}

describe('PreferenceScorer V1', () => {
  it('returns neutral score and no reasons with empty memories + interactions', () => {
    const result = scorePreference(recipe(), { userId: USER, now: NOW });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it('positive preference matched on tag pushes score up + surfaces reason', () => {
    const result = scorePreference(recipe(), {
      userId: USER,
      now: NOW,
      memories: [mem('preference', 'pasta')],
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.reasons.join(' ')).toMatch(/goût.*pasta/i);
  });

  it('negative_preference drops the score below zero and dominates positive', () => {
    const result = scorePreference(recipe(), {
      userId: USER,
      now: NOW,
      memories: [
        mem('preference', 'pasta'),
        mem('negative_preference', 'tomate'),
      ],
    });
    expect(result.score).toBeLessThan(0);
    expect(result.reasons.some((r) => r.toLowerCase().includes('évite'))).toBe(true);
  });

  it('word-boundary matching avoids false positives ("ail" must not match "ailleurs")', () => {
    const r = recipe({ name: 'Ailleurs en cuisine', tags: null, cuisine_category: null });
    const result = scorePreference(r, {
      userId: USER,
      now: NOW,
      memories: [mem('preference', 'ail')],
    });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it('recipe_feedback targeted at this recipe applies a strong signal even without a haystack match', () => {
    const r = recipe({ id: 'r-feedback-target', name: 'Risotto safran' });
    const positive = scorePreference(r, {
      userId: USER,
      now: NOW,
      memories: [
        mem('recipe_feedback', 'super bien aimé, à refaire', {
          subject_type: 'recipe',
          subject_id: 'r-feedback-target',
        }),
      ],
    });
    expect(positive.score).toBeGreaterThan(0.5);
    expect(positive.reasons.some((r) => r.toLowerCase().includes('aimé'))).toBe(true);

    const negative = scorePreference(r, {
      userId: USER,
      now: NOW,
      memories: [
        mem('recipe_feedback', 'pas aimé du tout', {
          subject_type: 'recipe',
          subject_id: 'r-feedback-target',
        }),
      ],
    });
    expect(negative.score).toBeLessThan(-0.5);
  });

  it('behavioural decay: cooked < 30d boosts, dismissed < 7d penalises, stale rows ignored', () => {
    const r = recipe();
    const recentCook = scorePreference(r, {
      userId: USER,
      now: NOW,
      interactions: [interactionDaysAgo(r.id, 'cooked', 5)],
    });
    expect(recentCook.score).toBeGreaterThan(0);

    const recentDismiss = scorePreference(r, {
      userId: USER,
      now: NOW,
      interactions: [interactionDaysAgo(r.id, 'dismissed', 3)],
    });
    expect(recentDismiss.score).toBeLessThan(0);

    const oldDismiss = scorePreference(r, {
      userId: USER,
      now: NOW,
      interactions: [interactionDaysAgo(r.id, 'dismissed', 30)],
    });
    expect(oldDismiss.score).toBe(0);

    const otherRecipe = scorePreference(r, {
      userId: USER,
      now: NOW,
      interactions: [interactionDaysAgo('r-other', 'cooked', 1)],
    });
    expect(otherRecipe.score).toBe(0);
  });

  it('health_sensitive memory surfaces a reason but does not penalise the score', () => {
    const r = recipe({ name: 'Crème brûlée', cuisine_category: null, tags: null });
    const result = scorePreference(r, {
      userId: USER,
      now: NOW,
      memories: [
        mem('cooking_style', 'crème', { sensitivity: 'health_sensitive' }),
      ],
    });
    // cooking_style still bumps the score (+0.2) — health_sensitive only
    // controls the reason surface, not the polarity.
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.toLowerCase().startsWith('note santé'))).toBe(true);
  });

  it('clamps the final score to [-1, 1] under heavy stacking', () => {
    const r = recipe();
    const stacked = scorePreference(r, {
      userId: USER,
      now: NOW,
      memories: [
        mem('preference', 'pasta'),
        mem('preference', 'tomate'),
        mem('preference', 'italien'),
        mem('cooking_style', 'rapide'),
        mem('diet_goal', 'pasta'),
      ],
      interactions: [
        interactionDaysAgo(r.id, 'cooked', 1),
        interactionDaysAgo(r.id, 'accepted', 2),
      ],
    });
    expect(stacked.score).toBeLessThanOrEqual(1);
    expect(stacked.score).toBeGreaterThan(0.7);
    expect(stacked.reasons.length).toBeLessThanOrEqual(3);
  });
});
