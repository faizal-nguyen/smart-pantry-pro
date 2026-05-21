/**
 * PRP-239 PR1a — Pork substitution rules (§6.3, extended in V3).
 *
 * Each rule's `match` regex is built via `buildAccentTolerantRegex()` so
 * it tolerates French diacritic variants and casing on the raw text.
 * Order matters: longer/more specific patterns must come first to win
 * over shorter ones (e.g. `saucisse de porc` before `porc`, `pork
 * belly` before `pork`). Today no rule overlaps another, but if a
 * future rule does, this ordering is the lever to pull.
 *
 * `replacement` is the human-friendly substitution text; the sanitizer
 * splices it back in between the captured boundary chars, so
 * `'porc haché ou thon'` cleanly becomes `'boeuf haché ou thon'`.
 *
 * The PRP V3.1 list (17 rules — V2 had 11, V3 added lardons, petit salé,
 * saucisson sec, rillettes, chair à saucisse, saucisse de porc).
 */
import { buildAccentTolerantRegex } from './normalizePolicyText.js';
import type { PorkRule } from './policyTypes.js';

function rule(ruleId: string, token: string, replacement: string): PorkRule {
  return {
    ruleId,
    match: buildAccentTolerantRegex(token),
    replacement,
    reason: 'pork_substitution',
  };
}

export const PORK_RULES: readonly PorkRule[] = [
  // Compound / specific first (longer wins by ordering).
  rule('pork.saucisse_de_porc.to_saucisse_de_boeuf', 'saucisse de porc', 'saucisse de boeuf'),
  rule('pork.chair_a_saucisse.to_boeuf_hache_assaisonne', 'chair a saucisse', 'boeuf hache assaisonne'),
  rule('pork.saucisson_sec.to_saucisson_de_boeuf', 'saucisson sec', 'saucisson de boeuf'),
  rule('pork.petit_sale.to_boeuf_sale', 'petit sale', 'boeuf sale'),
  rule('pork.pork_belly.to_beef_fatty', 'pork belly', 'boeuf gras'),
  rule('pork.porc_belly.to_beef_fatty', 'porc belly', 'boeuf gras'),
  rule('pork.porc_gras.to_beef_fatty', 'porc gras', 'boeuf gras'),
  rule('pork.porc_hache.to_beef_minced', 'porc hache', 'boeuf hache'),

  // Standalone tokens.
  rule('pork.lardons.to_beef_bacon_diced', 'lardons', 'beef bacon en des'),
  rule('pork.rillettes.to_beef_pulled', 'rillettes', 'effiloche de boeuf'),
  rule('pork.pancetta.to_beef_bacon', 'pancetta', 'beef bacon'),
  rule('pork.nduja.to_beef_spicy_sausage', 'nduja', 'saucisse de boeuf epicee'),
  rule('pork.chorizo.to_beef_chorizo', 'chorizo', 'chorizo de boeuf'),
  rule('pork.jambon.to_dinde_fumee', 'jambon', 'dinde fumee'),
  rule('pork.spam.to_beef_smoked', 'spam', 'boeuf fume'),
  rule('pork.lard.to_beef_fat', 'lard', 'graisse de boeuf'),
  rule('pork.bacon.to_beef_bacon', 'bacon', 'beef bacon'),

  // Generic `porc` token, last so the more specific rules above win.
  rule('pork.porc.to_boeuf', 'porc', 'boeuf'),
] as const;
