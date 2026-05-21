/**
 * PRP-239 PR1a — Alcohol substitution rules (§6.4).
 *
 * Context-aware: `resolve(ctx)` returns the substitute text based on
 * the inferred context. Today `mirin` and `biere` are the only rules
 * that vary by context — every other rule resolves to the same text
 * regardless. The shape stays uniform so future tweaks (vin rouge in
 * marinade vs braise, etc.) drop in without an API change.
 *
 * V1 always SUBSTITUTES, never removes. The result quality flag is
 * always `alcohol_removed` (the recipe no longer contains alcohol) but
 * the change reason is `alcohol_substitution` so we can distinguish
 * "swapped for something else" from a future "deleted from the list".
 *
 * Order matters — longer / more specific tokens first so `vin de
 * Shaoxing`, `vin de riz`, `vin de cuisine` win over the bare `vin
 * blanc`/`vin rouge`. We never define a generic `vin` rule because the
 * word legitimately appears in `vinaigre`, `vin de cuisine` (already
 * covered), etc.
 */
import { buildAccentTolerantRegex } from './normalizePolicyText.js';
import type { AlcoholContext, AlcoholRule } from './policyTypes.js';

function rule(
  ruleId: string,
  token: string,
  resolve: (ctx: AlcoholContext) => string,
): AlcoholRule {
  return {
    ruleId,
    match: buildAccentTolerantRegex(token),
    resolve,
    reason: 'alcohol_substitution',
  };
}

// ----- Mirin: context-aware ------------------------------------------------
const mirinResolver = (ctx: AlcoholContext): string => {
  if (ctx === 'dessert') return 'sirop de riz dilue';
  // sauce / marinade / cooking / stir_fry / deglaze / braise / pate
  return 'vinaigre de riz, sucre et eau (3:1:3)';
};

// ----- Biere: context-aware ------------------------------------------------
const biereResolver = (ctx: AlcoholContext): string => {
  if (ctx === 'pate') return 'eau gazeuse';
  return 'bouillon';
};

export const ALCOHOL_RULES: readonly AlcoholRule[] = [
  // Compound / specific first.
  rule('alcohol.vin_de_shaoxing.to_chicken_broth_cider', 'vin de shaoxing', () =>
    'bouillon de poulet et vinaigre de cidre',
  ),
  rule('alcohol.vin_de_riz.to_light_broth_rice_vinegar', 'vin de riz', () =>
    'bouillon leger et vinaigre de riz',
  ),
  rule('alcohol.vin_de_cuisine.to_light_broth', 'vin de cuisine', () =>
    'bouillon leger',
  ),
  rule('alcohol.vin_blanc.to_broth_lemon', 'vin blanc', () =>
    'bouillon et jus de citron',
  ),
  rule('alcohol.vin_rouge.to_strong_broth_balsamic', 'vin rouge', () =>
    'bouillon corse et vinaigre balsamique',
  ),

  // Standalone tokens.
  rule('alcohol.mirin', 'mirin', mirinResolver),
  rule('alcohol.sake.to_dashi', 'sake', () => 'bouillon dashi'),
  rule('alcohol.sherry.to_broth_cider', 'sherry', () =>
    'bouillon et vinaigre de cidre',
  ),
  rule('alcohol.xeres.to_broth_cider', 'xeres', () =>
    'bouillon et vinaigre de cidre',
  ),
  rule('alcohol.biere', 'biere', biereResolver),
] as const;

/**
 * Infer the alcohol context from an ingredient's `notes` field. The
 * inference is deterministic and tolerant of accent/case (we normalize
 * before matching the keywords). Default is `'cooking'` so unannotated
 * ingredients still get a sensible substitute.
 */
export function inferAlcoholContext(notes: string | null | undefined): AlcoholContext {
  if (!notes) return 'cooking';
  const n = notes
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  if (n.includes('dessert')) return 'dessert';
  if (n.includes('marinade')) return 'marinade';
  if (n.includes('sauce')) return 'sauce';
  if (n.includes('pate') || n.includes('beignet')) return 'pate';
  if (n.includes('stir') || n.includes('sauter') || n.includes('wok')) return 'stir_fry';
  if (n.includes('deglac')) return 'deglaze';
  if (n.includes('braise') || n.includes('mijot')) return 'braise';
  return 'cooking';
}
