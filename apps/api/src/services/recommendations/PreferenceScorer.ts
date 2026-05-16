/**
 * PRP-226 PR6 — PreferenceScorer V1.
 *
 * Walks the user's memories (preference / negative_preference /
 * cooking_style / diet_goal / recipe_feedback) and the recent
 * `recipe_interactions` journal to bias each recipe by what the user
 * has told us or shown through behaviour.
 *
 * Design rules :
 *   * Substring + word-boundary matching on a normalized haystack
 *     built from `name + cuisine_category + tags + meal_type`. Keeps
 *     the scorer SQL-free and trivially testable.
 *   * Negative preferences dominate — a single match drops the score
 *     by 0.8 which alone moves a recipe out of the top results.
 *   * Recipe-specific feedback (`recipe_feedback` with
 *     `subject_id = recipe.id`) carries the strongest positive signal.
 *   * Behavioural decay : `cooked` and `accepted` boost (+0.4 / +0.2)
 *     for 30 days, `dismissed` penalises (-0.3) for 7 days. Older
 *     interactions are dropped at load time by the engine.
 *   * `health_sensitive` memories never repel a recipe ; they're
 *     constraints, not tastes. We surface a neutral reason ("Note
 *     santé : …") but don't tilt the score so the scorer doesn't
 *     accidentally moralise food choices (PRP-227 territory).
 *   * Final score clamped to `[-1, 1]`. Reasons capped at 3 to keep
 *     the assistant UI tidy.
 */

import type { RecipeWithIngredients } from './types.js';

// ---- Inputs ---------------------------------------------------------

/**
 * Subset of `assistant_memory_items` the scorer cares about. The
 * engine loads + filters then hands an immutable snapshot per request.
 */
export interface PreferenceMemory {
  id: string;
  kind:
    | 'preference'
    | 'negative_preference'
    | 'cooking_style'
    | 'diet_goal'
    | 'recipe_feedback';
  content: string;
  /** Lowercase ASCII-folded content when the writer provided it. Falls back to `content`. */
  normalized_content: string | null;
  sensitivity: 'normal' | 'personal' | 'health_sensitive';
  /** `recipe`, `ingredient`, `product`, `global`, … */
  subject_type: string | null;
  /** Tied to a specific recipe / ingredient / product id when scope is narrow. */
  subject_id: string | null;
}

/**
 * Subset of `recipe_interactions` rows kept in the rolling window
 * (last 30 days). The engine drops stale rows before passing them in.
 */
export interface RecipeInteractionSummary {
  recipe_id: string | null;
  interaction_type:
    | 'dismissed'
    | 'cooked'
    | 'accepted'
    | 'recommended'
    | 'viewed'
    | 'added_missing_to_shopping'
    | 'planned';
  created_at: string;
}

export interface PreferenceContext {
  userId: string;
  /** Active memories relevant to scoring. Defaults to `[]` (no signal). */
  memories?: ReadonlyArray<PreferenceMemory>;
  /** Recent `recipe_interactions` rows, already filtered to the 30-day window. */
  interactions?: ReadonlyArray<RecipeInteractionSummary>;
  /** Injectable clock for deterministic tests. Defaults to `new Date()`. */
  now?: Date;
}

export interface PreferenceResult {
  /** Clamped to [-1, 1]. Negative when a negative_preference repels. */
  score: number;
  reasons: string[];
}

// ---- Tuning constants ----------------------------------------------

const POSITIVE_PREF = 0.4;
const POSITIVE_PREF_CAP = 0.8;
const COOKING_STYLE_HIT = 0.2;
const DIET_GOAL_HIT = 0.2;
const NEGATIVE_PREF = -0.8;
const RECIPE_FEEDBACK_POS = 0.6;
const RECIPE_FEEDBACK_NEG = -0.6;

const BEHAVIOUR_COOKED = 0.4;
const BEHAVIOUR_ACCEPTED = 0.2;
const BEHAVIOUR_DISMISSED = -0.3;

const DAY_MS = 24 * 60 * 60 * 1000;
export const BEHAVIOUR_WINDOW_DAYS = {
  cooked: 30,
  accepted: 30,
  dismissed: 7,
} as const;

const MAX_REASONS = 3;

// ---- Public API ----------------------------------------------------

export function scorePreference(
  recipe: RecipeWithIngredients,
  context: PreferenceContext,
): PreferenceResult {
  const haystack = buildHaystack(recipe);
  const reasons: string[] = [];

  // Memories — positive then negative so the reason order makes
  // sense ("aime tomate, évite poisson") rather than the reverse.
  let memoryScore = 0;
  let positivePrefAccum = 0;

  const memories = context.memories ?? [];
  for (const memory of memories) {
    const phrase = pickPhrase(memory);
    if (!phrase) continue;

    // recipe_feedback short-circuits all other rules — it's explicit
    // user signal about THIS recipe.
    if (memory.kind === 'recipe_feedback' && memory.subject_id === recipe.id) {
      const positive = looksPositiveFeedback(memory.content);
      memoryScore += positive ? RECIPE_FEEDBACK_POS : RECIPE_FEEDBACK_NEG;
      reasons.push(
        positive ? `Tu avais aimé ${recipe.name}` : `Tu n'avais pas aimé ${recipe.name}`,
      );
      continue;
    }

    if (!matchesPhrase(haystack, phrase)) continue;

    switch (memory.kind) {
      case 'preference': {
        if (positivePrefAccum < POSITIVE_PREF_CAP) {
          const inc = Math.min(POSITIVE_PREF, POSITIVE_PREF_CAP - positivePrefAccum);
          positivePrefAccum += inc;
          memoryScore += inc;
        }
        reasons.push(`Correspond à ton goût (${phrase})`);
        break;
      }
      case 'negative_preference': {
        memoryScore += NEGATIVE_PREF;
        reasons.push(`Tu évites ${phrase}`);
        break;
      }
      case 'cooking_style': {
        memoryScore += COOKING_STYLE_HIT;
        reasons.push(`Style "${phrase}"`);
        break;
      }
      case 'diet_goal': {
        memoryScore += DIET_GOAL_HIT;
        reasons.push(`Aligné avec ton objectif (${phrase})`);
        break;
      }
      case 'recipe_feedback':
        // Untargeted recipe_feedback (no subject_id) — ignore : the
        // content is too fuzzy to apply broadly.
        break;
    }

    // health_sensitive constraint surfaced as a soft reason even when
    // the score doesn't change (constraints handled by the diet_goal
    // bonus above when applicable).
    if (memory.sensitivity === 'health_sensitive' && memory.kind !== 'diet_goal') {
      reasons.push(`Note santé : ${phrase}`);
    }
  }

  // Interactions — behavioural overlay.
  const now = context.now ?? new Date();
  let behaviourScore = 0;
  const interactions = (context.interactions ?? []).filter(
    (i) => i.recipe_id === recipe.id,
  );

  for (const interaction of interactions) {
    const ageDays = (now.getTime() - new Date(interaction.created_at).getTime()) / DAY_MS;
    if (ageDays < 0) continue;
    switch (interaction.interaction_type) {
      case 'cooked':
        if (ageDays <= BEHAVIOUR_WINDOW_DAYS.cooked) {
          behaviourScore += BEHAVIOUR_COOKED;
          reasons.push('Tu l\'as déjà cuisinée récemment');
        }
        break;
      case 'accepted':
        if (ageDays <= BEHAVIOUR_WINDOW_DAYS.accepted) {
          behaviourScore += BEHAVIOUR_ACCEPTED;
        }
        break;
      case 'dismissed':
        if (ageDays <= BEHAVIOUR_WINDOW_DAYS.dismissed) {
          behaviourScore += BEHAVIOUR_DISMISSED;
          reasons.push('Tu l\'avais écartée cette semaine');
        }
        break;
      default:
        // viewed / recommended / added_missing_to_shopping / planned
        // are tracked for analytics but don't move the score in V1.
        break;
    }
  }

  const raw = memoryScore + behaviourScore;
  const score = clamp(raw, -1, 1);
  return { score, reasons: dedupe(reasons).slice(0, MAX_REASONS) };
}

// ---- Helpers --------------------------------------------------------

function buildHaystack(recipe: RecipeWithIngredients): string {
  const parts: string[] = [recipe.name ?? ''];
  if (recipe.cuisine_category) parts.push(recipe.cuisine_category);
  if (recipe.meal_type) parts.push(recipe.meal_type);
  if (recipe.tags?.length) parts.push(...recipe.tags);
  if (recipe.description) parts.push(recipe.description);
  return normalise(parts.join(' '));
}

/**
 * Pull a short phrase out of the memory content. Prefer
 * `normalized_content` (already lower-cased + ASCII-folded by the
 * writer) ; fall back to the raw content.
 */
function pickPhrase(memory: PreferenceMemory): string | null {
  const raw = memory.normalized_content ?? memory.content;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Keep the phrase compact — long sentences blow out the reasons UI.
  return trimmed.length > 60 ? trimmed.slice(0, 57) + '…' : trimmed;
}

/**
 * Word-aware match : tokenise the haystack on non-letter boundaries
 * and accept a token that equals the needle or extends it by at most
 * 2 extra chars (covers French plural "s/es" and feminine "e/ne").
 * This catches "tomate" ↔ "tomates" / "italien" ↔ "italienne" without
 * matching "ail" inside "ailleurs".
 */
function matchesPhrase(haystack: string, phrase: string): boolean {
  const needle = normalise(phrase);
  if (!needle) return false;
  const tokens = haystack.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const token of tokens) {
    if (token === needle) return true;
    if (token.startsWith(needle) && token.length - needle.length <= 2) return true;
  }
  return false;
}

function looksPositiveFeedback(content: string): boolean {
  const normalised = normalise(content);
  const negatives = [
    'pas aime',
    'pas aimé',
    'pas bon',
    'mauvais',
    'evite',
    'évite',
    'deteste',
    'déteste',
    'jamais',
    'moins bien',
  ];
  if (negatives.some((token) => normalised.includes(normalise(token)))) return false;
  return true;
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function dedupe(strings: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of strings) {
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}
