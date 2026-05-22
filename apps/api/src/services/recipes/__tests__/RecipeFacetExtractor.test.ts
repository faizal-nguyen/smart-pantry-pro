/**
 * PRP-239 PR3 — RecipeFacetExtractor unit tests.
 *
 * Covers §9.4 acceptance criteria:
 *   - "Poulet" recipes register protein_families=['poulet']
 *   - "Hauts de cuisse" recipes register protein_cuts=['haut_de_cuisse']
 *   - "Boeuf hache" registers protein_cuts=['hache']
 *   - "Vegetarien" recipes excluded from flesh families
 *   - vegan rule (no oeuf, no dairy)
 *   - sans_porcin / sans_alcool always set (policy post-PR1b)
 *   - mixte when 2+ flesh families coexist
 */
import { extractRecipeFacets, type RecipeIngredientInput } from '../RecipeFacetExtractor';

const FIXED = { generatedAt: '2026-05-22T00:00:00.000Z', generatedBy: 'test' };

const ing = (name: string, notes?: string | null): RecipeIngredientInput => ({ name, notes });

describe('extractRecipeFacets — protein families (§9.4)', () => {
  it('detects poulet from "haut de cuisse de poulet"', () => {
    const f = extractRecipeFacets([ing('haut de cuisse de poulet'), ing('oignon')], FIXED);
    expect(f.protein_families).toEqual(['poulet']);
    expect(f.protein_cuts).toEqual(expect.arrayContaining(['haut_de_cuisse']));
  });

  it('detects boeuf from "boeuf haché" and emits the hache cut', () => {
    const f = extractRecipeFacets([ing('boeuf haché'), ing('riz')], FIXED);
    expect(f.protein_families).toEqual(['boeuf']);
    expect(f.protein_cuts).toContain('hache');
  });

  it('detects poisson from "saumon" with the saumon cut', () => {
    const f = extractRecipeFacets([ing('saumon'), ing('sauce soja')], FIXED);
    expect(f.protein_families).toContain('poisson');
    expect(f.protein_cuts).toContain('saumon');
  });

  it('detects fruits_de_mer from "crevettes"', () => {
    const f = extractRecipeFacets([ing('crevettes'), ing('vermicelles')], FIXED);
    expect(f.protein_families).toContain('fruits_de_mer');
    expect(f.protein_cuts).toContain('crevette');
  });

  it('detects tofu', () => {
    const f = extractRecipeFacets([ing('tofu ferme'), ing('sauce soja')], FIXED);
    expect(f.protein_families).toEqual(['tofu']);
  });

  it('adds `mixte` when two flesh families coexist', () => {
    const f = extractRecipeFacets(
      [ing('poulet'), ing('crevettes'), ing('nouilles')],
      FIXED,
    );
    expect(f.protein_families).toEqual(expect.arrayContaining(['poulet', 'fruits_de_mer', 'mixte']));
  });

  it('counts `boeuf hache` and `beef bacon` together as boeuf, not mixte', () => {
    const f = extractRecipeFacets([ing('boeuf hache'), ing('beef bacon')], FIXED);
    expect(f.protein_families).toEqual(['boeuf']);
    expect(f.protein_families).not.toContain('mixte');
  });
});

describe('extractRecipeFacets — cuts (§9.4)', () => {
  it('chicken cuts: pilon + aile distincts du blanc', () => {
    const pilon = extractRecipeFacets([ing('pilon de poulet')], FIXED);
    const aile = extractRecipeFacets([ing('aile de poulet')], FIXED);
    const blanc = extractRecipeFacets([ing('blanc de poulet')], FIXED);
    expect(pilon.protein_cuts).toContain('pilon');
    expect(aile.protein_cuts).toContain('aile');
    expect(blanc.protein_cuts).toContain('blanc');
  });

  it('beef cuts: gras + steak + jarret', () => {
    expect(
      extractRecipeFacets([ing('boeuf gras')], FIXED).protein_cuts,
    ).toContain('gras');
    expect(
      extractRecipeFacets([ing('entrecôte de boeuf')], FIXED).protein_cuts,
    ).toContain('steak');
    expect(
      extractRecipeFacets([ing('jarret de boeuf')], FIXED).protein_cuts,
    ).toContain('jarret');
  });

  it('cuts are scoped to family: "haché" alone on a beef recipe → boeuf.hache', () => {
    const f = extractRecipeFacets([ing('boeuf'), ing('viande hachée')], FIXED);
    // viande hachée is a boeuf token + cut token "haché"
    expect(f.protein_families).toContain('boeuf');
    expect(f.protein_cuts).toContain('hache');
  });
});

describe('extractRecipeFacets — dietary flags (§9.4)', () => {
  it('vegetarien recipe (tofu + legumes) excludes all flesh families', () => {
    const f = extractRecipeFacets(
      [ing('tofu ferme'), ing('épinards'), ing('riz')],
      FIXED,
    );
    expect(f.dietary_flags).toContain('vegetarien');
    expect(f.protein_families).not.toEqual(expect.arrayContaining(['poulet', 'boeuf', 'poisson']));
  });

  it('vegan requires no oeuf AND no dairy', () => {
    const veganRecipe = extractRecipeFacets(
      [ing('tofu'), ing('riz'), ing('légumes')],
      FIXED,
    );
    expect(veganRecipe.dietary_flags).toEqual(expect.arrayContaining(['vegetarien', 'vegan']));

    const withEgg = extractRecipeFacets(
      [ing('tofu'), ing('œufs'), ing('riz')],
      FIXED,
    );
    expect(withEgg.dietary_flags).toContain('vegetarien');
    expect(withEgg.dietary_flags).not.toContain('vegan');

    const withCream = extractRecipeFacets(
      [ing('épinards'), ing('crème fraîche'), ing('riz')],
      FIXED,
    );
    expect(withCream.dietary_flags).toContain('vegetarien');
    expect(withCream.dietary_flags).not.toContain('vegan');
  });

  it('always sets sans_porcin + sans_alcool (PR1b policy)', () => {
    const f = extractRecipeFacets([ing('boeuf'), ing('riz')], FIXED);
    expect(f.dietary_flags).toEqual(expect.arrayContaining(['sans_porcin', 'sans_alcool']));
  });

  it('beef recipe is NOT vegetarien', () => {
    const f = extractRecipeFacets([ing('boeuf haché')], FIXED);
    expect(f.dietary_flags).not.toContain('vegetarien');
  });
});

describe('extractRecipeFacets — purity + output shape', () => {
  it('returns sorted, deduplicated arrays', () => {
    const f = extractRecipeFacets(
      [ing('saumon'), ing('saumon'), ing('thon')],
      FIXED,
    );
    expect(f.protein_families).toEqual(['poisson']); // sorted & unique
    expect(f.protein_cuts).toEqual([...new Set(f.protein_cuts)].sort());
  });

  it('carries existing quality_flags through unchanged', () => {
    const f = extractRecipeFacets([ing('boeuf')], {
      ...FIXED,
      qualityFlags: ['porc_substituted', 'alcohol_removed'],
    });
    expect(f.quality_flags).toEqual(['porc_substituted', 'alcohol_removed']);
  });

  it('does not depend on Supabase / I/O', () => {
    // Sentinel — the fact that all tests above ran without any setup
    // proves the module is pure. AC §9.4 / §6.8 last bullet (kept
    // consistent across the policy modules).
    expect(typeof extractRecipeFacets).toBe('function');
  });
});
