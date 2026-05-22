/**
 * PRP-239 PR3 — RecipeFacetExtractor.
 *
 * Pure rule-based extractor that turns a recipe's ingredient list into
 * the facets shape stored in `recipes.recipe_facets`:
 *
 *   {
 *     "protein_families": ["poulet", "boeuf", ...],     // positive sources
 *     "protein_cuts":     ["haut_de_cuisse", "hache"],  // PRP §9.2 enum
 *     "dietary_flags":    ["vegetarien", "sans_porcin", "sans_alcool"],
 *     "quality_flags":    [...]                           // preserved as-is
 *   }
 *
 * Decisions encoded :
 *   - `vegetarien` is a DIETARY FLAG, not a protein family (V3.1).
 *   - `sans_porcin` and `sans_alcool` are ALWAYS set after PR1b (policy
 *     enforced on every recipe). The extractor opts them in by default.
 *   - `vegan` = no animal protein AND no oeuf AND no dairy keyword.
 *   - Cut detection is family-scoped: a "haché" appears in both poulet
 *     and boeuf cut lists, and we only emit the cut that matches the
 *     family present in the same recipe.
 *
 * No I/O. Pure data transform → trivial to unit-test (AC §9.4).
 */
import { normalizePolicyText } from '../recipeQuality/normalizePolicyText.js';

// ---------- Types -----------------------------------------------------------

export type ProteinFamily =
  | 'poulet'
  | 'boeuf'
  | 'agneau'
  | 'poisson'
  | 'fruits_de_mer'
  | 'tofu'
  | 'oeuf'
  | 'mixte';

export type DietaryFlag = 'vegetarien' | 'vegan' | 'sans_porcin' | 'sans_alcool';

export type ChickenCut =
  | 'cuisse'
  | 'haut_de_cuisse'
  | 'pilon'
  | 'aile'
  | 'blanc'
  | 'escalope'
  | 'entier'
  | 'hache';

export type BeefCut = 'hache' | 'steak' | 'tranche' | 'jarret' | 'chuck' | 'gras';

export type LambCut = 'gigot' | 'epaule' | 'cotelette' | 'selle' | 'jarret' | 'hache';

export type SeafoodCut = 'saumon' | 'thon' | 'crevette' | 'poisson_blanc';

export type ProteinCut = ChickenCut | BeefCut | LambCut | SeafoodCut;

export interface RecipeIngredientInput {
  /** Free-text ingredient name (already policy-sanitized). */
  name: string;
  /** Optional notes; scanned the same way as `name`. */
  notes?: string | null;
}

export interface RecipeFacetsOutput {
  protein_families: ProteinFamily[];
  protein_cuts: ProteinCut[];
  dietary_flags: DietaryFlag[];
  /** Carried through unchanged so callers that pre-load existing facets can merge. */
  quality_flags?: string[];
  generated_at: string;
  generated_by: string;
}

// ---------- Rule tables -----------------------------------------------------

type FamilyRule = { family: ProteinFamily; tokens: string[] };

/**
 * Order matters: more specific tokens first so `haut de cuisse de poulet`
 * registers `poulet` before the bare `poulet` rule does (idempotent —
 * the family Set dedupes — but it documents intent).
 */
const FAMILY_RULES: FamilyRule[] = [
  { family: 'poulet', tokens: [
    'poulet', 'volaille', 'dinde fumee', 'dinde', 'canard',
    'haut de cuisse de poulet', 'cuisse de poulet', 'pilon de poulet',
    'aile de poulet', 'blanc de poulet', 'escalope de poulet',
  ] },
  { family: 'boeuf', tokens: [
    'boeuf', 'steak', 'entrecote', 'bavette', 'rumsteak', 'jarret de boeuf',
    'chuck', 'boeuf hache', 'beef bacon', 'chorizo de boeuf',
    'saucisse de boeuf', 'graisse de boeuf', 'effiloche de boeuf',
    'saucisson de boeuf',
  ] },
  { family: 'agneau', tokens: ['agneau', 'mouton', 'gigot'] },
  // Saumon, thon, sardine, maquereau → poisson. Crevette, calmar, moules →
  // fruits_de_mer. Two separate families per §9.2.
  { family: 'poisson', tokens: [
    'saumon', 'thon', 'sardine', 'maquereau', 'cabillaud', 'merlu',
    'lieu noir', 'lieu jaune', 'bar', 'dorade', 'truite', 'colin',
    'tilapia', 'poisson blanc',
  ] },
  { family: 'fruits_de_mer', tokens: [
    'crevette', 'crevettes', 'gambas', 'calmar', 'calamar', 'encornet',
    'moules', 'moule', 'palourde', 'huitre', 'huitres', 'coquille saint jacques',
    'saint jacques', 'langoustine', 'homard', 'crabe',
  ] },
  { family: 'tofu', tokens: ['tofu', 'tempeh', 'seitan'] },
  { family: 'oeuf', tokens: ['oeuf', 'oeufs', 'œuf', 'œufs', 'jaune d\'oeuf', 'blanc d\'oeuf'] },
];

// Cuts are scoped to a family: { family: { cut: tokens[] } }
// Tokens within a family must NOT overlap — `escalope de poulet` used
// to be in both `blanc` and `escalope`, which double-counted the same
// ingredient. PRP §9.2 keeps them distinct: `blanc` = poitrine entière,
// `escalope` = blanc tranché fin.
const CUT_RULES: Partial<Record<ProteinFamily, Record<string, string[]>>> = {
  poulet: {
    haut_de_cuisse: ['haut de cuisse de poulet', 'hauts de cuisse de poulet', 'haut de cuisse'],
    pilon: ['pilon de poulet', 'pilons de poulet', 'pilon'],
    aile: ['aile de poulet', 'ailes de poulet'],
    blanc: ['blanc de poulet', 'poitrine de poulet'],
    escalope: ['escalope de poulet'],
    cuisse: ['cuisse de poulet', 'cuisses de poulet'],
    entier: ['poulet entier'],
    hache: ['poulet hache', 'volaille hachee'],
  },
  boeuf: {
    hache: ['boeuf hache', 'viande hachee', 'haché'],
    steak: ['steak', 'entrecote', 'rumsteak', 'bavette'],
    tranche: ['boeuf tranche', 'tranches de boeuf'],
    jarret: ['jarret de boeuf', 'jarret'],
    chuck: ['chuck'],
    gras: ['boeuf gras', 'graisse de boeuf'],
  },
  // PRP-239 PR3.2 — agneau cuts. Not in PRP §9.2 V1 but a sensible
  // extension (the recipes seeded with agneau cover gigot + épaule).
  agneau: {
    gigot: ['gigot', 'gigot d\'agneau'],
    epaule: ['epaule d\'agneau', 'épaule d\'agneau'],
    cotelette: ['cotelette d\'agneau', 'cotelettes d\'agneau', 'côtelette', 'côtelettes'],
    selle: ['selle d\'agneau'],
    jarret: ['jarret d\'agneau', 'souris d\'agneau'],
    hache: ['agneau hache', 'agneau haché'],
  },
  poisson: {
    saumon: ['saumon'],
    thon: ['thon'],
    poisson_blanc: ['cabillaud', 'merlu', 'lieu', 'colin', 'tilapia', 'poisson blanc'],
  },
  fruits_de_mer: {
    crevette: ['crevette', 'crevettes', 'gambas'],
  },
};

// Dairy + animal-byproduct tokens that disqualify `vegan` even when no
// flesh ingredient is present.
const ANIMAL_BYPRODUCT_TOKENS = [
  'lait', 'creme', 'crème', 'beurre', 'fromage', 'parmesan', 'mozzarella',
  'feta', 'gruyere', 'comte', 'cheddar', 'yaourt', 'miel',
  'ghee', 'mascarpone', 'ricotta',
];

// ---------- Extractor -------------------------------------------------------

export interface ExtractorOptions {
  /** Override the generator label written to the facets blob. */
  generatedBy?: string;
  /** Override timestamp for deterministic tests. */
  generatedAt?: string;
  /** Existing `quality_flags` to preserve in the output. */
  qualityFlags?: string[];
}

/**
 * Extract facets from a recipe's ingredients.
 */
export function extractRecipeFacets(
  ingredients: readonly RecipeIngredientInput[],
  opts: ExtractorOptions = {},
): RecipeFacetsOutput {
  const familySet = new Set<ProteinFamily>();
  const cutSet = new Set<ProteinCut>();

  // Concatenate name + notes per ingredient, normalize, and scan tokens.
  const haystacks: string[] = ingredients.map((ing) =>
    normalizePolicyText(`${ing.name ?? ''} ${ing.notes ?? ''}`),
  );

  // Detect families.
  for (const text of haystacks) {
    if (!text) continue;
    for (const rule of FAMILY_RULES) {
      for (const token of rule.tokens) {
        if (containsToken(text, token)) {
          familySet.add(rule.family);
          break;
        }
      }
    }
  }

  // Detect cuts (scoped per detected family).
  for (const family of familySet) {
    const cutsForFamily = CUT_RULES[family];
    if (!cutsForFamily) continue;
    for (const text of haystacks) {
      if (!text) continue;
      for (const [cut, tokens] of Object.entries(cutsForFamily)) {
        for (const token of tokens) {
          if (containsToken(text, token)) {
            cutSet.add(cut as ProteinCut);
            break;
          }
        }
      }
    }
  }

  // Mixte: when two or more "flesh" families coexist.
  const fleshFamilies: ProteinFamily[] = ['poulet', 'boeuf', 'agneau', 'poisson', 'fruits_de_mer'];
  const fleshCount = fleshFamilies.filter((f) => familySet.has(f)).length;
  if (fleshCount >= 2) familySet.add('mixte');

  // Dietary flags.
  const dietary = new Set<DietaryFlag>();
  // Policy always-on (PR1b enforced):
  dietary.add('sans_porcin');
  dietary.add('sans_alcool');

  // vegetarien: no flesh family present (oeuf + tofu OK).
  if (fleshCount === 0) {
    dietary.add('vegetarien');
    // vegan: vegetarian + no oeuf + no animal byproduct.
    const hasOeuf = familySet.has('oeuf');
    const hasByproduct = haystacks.some((h) =>
      ANIMAL_BYPRODUCT_TOKENS.some((t) => containsToken(h, t)),
    );
    if (!hasOeuf && !hasByproduct) dietary.add('vegan');
  }

  return {
    protein_families: [...familySet].sort(),
    protein_cuts: [...cutSet].sort(),
    dietary_flags: [...dietary].sort(),
    quality_flags: opts.qualityFlags,
    generated_at: opts.generatedAt ?? new Date().toISOString(),
    generated_by: opts.generatedBy ?? 'prp-239-pr3',
  };
}

/**
 * Check whether a normalized token appears in `normalizedText`, tolerant
 * of French plurals on EACH word of the token.
 *
 * Multi-word tokens like `jarret d'agneau` must match `jarrets d'agneau`
 * (verified live on recipe 21beee11 — "Massaman Lamb Shanks"). A
 * single trailing `s?` would only cover the last word, leaving the
 * first word strict and silently missing the plural. So we split on
 * whitespace and append `[sx]?` to every word — covers both -s plurals
 * and the French -x exception (agneau → agneaux, bateau → bateaux).
 *
 * Anchors `(^|[^a-z0-9])…([^a-z0-9]|$)` avoid false hits like `porc`
 * matching inside `support`.
 *
 * False-positive risk is bounded — extending `gras` to `grass` is
 * harmless in a French culinary corpus, and the cut taxonomy is small
 * enough to audit by hand if a token ever needs to opt out.
 */
function containsToken(normalizedText: string, normalizedToken: string): boolean {
  if (!normalizedText || !normalizedToken) return false;
  const t = normalizePolicyText(normalizedToken);
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const escapedWords = words.map((w) => {
    const e = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `${e}[sx]?`;
  });
  const pattern = escapedWords.join('\\s+');
  const rgx = new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`);
  return rgx.test(normalizedText);
}
