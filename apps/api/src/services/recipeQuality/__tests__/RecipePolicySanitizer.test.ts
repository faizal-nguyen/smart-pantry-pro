/**
 * PRP-239 PR1a — RecipePolicySanitizer tests (§6.7 mandatory list).
 *
 * Pure unit tests: no Supabase, no I/O, no env. Covers:
 *   - Whitelist no-op cases (beef bacon, former en saucisse, sans porc)
 *   - Pork substitutions including V3 additions (lardons, rillettes,
 *     petit sale, saucisson sec, chair a saucisse)
 *   - Compound preservation: `porc hache ou thon` → `boeuf hache ou
 *     thon` (surrounding `ou thon` survives)
 *   - Multi-rule recipe (porc + Shaoxing): both changes recorded
 *   - Context-aware alcohol (`mirin` in sauce vs dessert)
 *   - `vin de riz ou mirin` → no alcohol left in text
 *   - Violation detection in instructions (not auto-fixed)
 *   - `detectOnly` API used by PR4 chef agent post-check
 */
import { RecipePolicySanitizer } from '../RecipePolicySanitizer';
import type { RecipePolicyInput } from '../policyTypes';

function buildInput(overrides: Partial<RecipePolicyInput> = {}): RecipePolicyInput {
  return {
    name: 'Test recipe',
    description: null,
    instructions: [],
    ingredients: [],
    ...overrides,
  };
}

describe('RecipePolicySanitizer.run — whitelist (§6.7 no-ops)', () => {
  const s = new RecipePolicySanitizer();

  it('beef bacon → no change', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'beef bacon', quantity: 100, unit: 'g' }],
      }),
    );
    expect(result.changes).toHaveLength(0);
    expect(result.sanitized.ingredients[0].name).toBe('beef bacon');
    expect(result.qualityFlags).toHaveLength(0);
  });

  it('former en saucisse (verb phrase in instructions) → no violation', () => {
    const result = s.run(
      buildInput({
        instructions: ['Former en saucisse et faire cuire 10 min.'],
        ingredients: [],
      }),
    );
    expect(result.violationsRemaining).toHaveLength(0);
  });

  it('sans porc → no violation', () => {
    const result = s.run(
      buildInput({
        description: 'Recette sans porc.',
        ingredients: [],
      }),
    );
    expect(result.violationsRemaining).toHaveLength(0);
  });
});

describe('RecipePolicySanitizer.run — pork substitutions (§6.7)', () => {
  const s = new RecipePolicySanitizer();

  it('porc haché ou thon → boeuf haché ou thon (compound suffix preserved)', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'porc haché ou thon', quantity: 85, unit: 'g' }],
      }),
    );
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].ruleId).toBe('pork.porc_hache.to_beef_minced');
    expect(result.sanitized.ingredients[0].name).toMatch(/^boeuf hache\b.*ou thon$/i);
    expect(result.qualityFlags).toContain('porc_substituted');
  });

  it('porc belly → boeuf gras', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'porc belly', quantity: 120, unit: 'g' }],
      }),
    );
    expect(result.changes[0].ruleId).toBe('pork.porc_belly.to_beef_fatty');
    expect(result.sanitized.ingredients[0].name).toBe('boeuf gras');
  });

  it('pork belly → boeuf gras (English form)', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'pork belly', quantity: 120, unit: 'g' }],
      }),
    );
    expect(result.sanitized.ingredients[0].name).toBe('boeuf gras');
  });

  it('lardons → beef bacon en des', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'lardons', quantity: 80, unit: 'g' }],
      }),
    );
    expect(result.changes[0].ruleId).toBe('pork.lardons.to_beef_bacon_diced');
    expect(result.sanitized.ingredients[0].name).toBe('beef bacon en des');
  });

  it('petit salé → boeuf salé (V3 addition)', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'petit salé', quantity: 200, unit: 'g' }],
      }),
    );
    expect(result.changes[0].ruleId).toBe('pork.petit_sale.to_boeuf_sale');
    expect(result.sanitized.ingredients[0].name).toBe('boeuf sale');
  });

  it('saucisson sec → saucisson de boeuf (V3 addition)', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'saucisson sec', quantity: 100, unit: 'g' }],
      }),
    );
    expect(result.sanitized.ingredients[0].name).toBe('saucisson de boeuf');
  });

  it('rillettes → effiloché de boeuf (V3 addition)', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'rillettes', quantity: 150, unit: 'g' }],
      }),
    );
    expect(result.sanitized.ingredients[0].name).toBe('effiloche de boeuf');
  });

  it('chair à saucisse → boeuf haché assaisonné (V3 addition)', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'chair à saucisse', quantity: 250, unit: 'g' }],
      }),
    );
    expect(result.sanitized.ingredients[0].name).toBe('boeuf hache assaisonne');
  });

  it('bacon → beef bacon, but beef bacon stays beef bacon (whitelist guard)', () => {
    const beefBacon = new RecipePolicySanitizer().run(
      buildInput({ ingredients: [{ name: 'beef bacon' }] }),
    );
    expect(beefBacon.changes).toHaveLength(0);

    const plainBacon = new RecipePolicySanitizer().run(
      buildInput({ ingredients: [{ name: 'bacon' }] }),
    );
    expect(plainBacon.sanitized.ingredients[0].name).toBe('beef bacon');
  });
});

describe('RecipePolicySanitizer.run — alcohol substitutions (§6.7)', () => {
  const s = new RecipePolicySanitizer();

  it('mirin in a sauce note → vinaigre/sucre/eau mix (contextual)', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'mirin', quantity: 1, unit: 'c. à soupe', notes: 'sauce' }],
      }),
    );
    expect(result.changes[0].ruleId).toBe('alcohol.mirin');
    expect(result.sanitized.ingredients[0].name).toMatch(/vinaigre de riz/);
    expect(result.qualityFlags).toContain('alcohol_removed');
  });

  it('mirin in a dessert note → sirop de riz dilué (different branch)', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'mirin', quantity: 30, unit: 'ml', notes: 'dessert' }],
      }),
    );
    expect(result.sanitized.ingredients[0].name).toBe('sirop de riz dilue');
  });

  it('vin de riz ou mirin (name + notes) → no alcohol left anywhere', () => {
    const result = s.run(
      buildInput({
        ingredients: [
          { name: 'vin de riz', quantity: 1, unit: 'c. à soupe', notes: 'ou mirin' },
        ],
      }),
    );
    // At least two changes (name + notes).
    expect(result.changes.length).toBeGreaterThanOrEqual(2);
    const after = result.sanitized.ingredients[0];
    // Neither leftover alcohol token.
    expect(after.name?.toLowerCase()).not.toMatch(/\bvin\b/);
    expect(after.name?.toLowerCase()).not.toMatch(/mirin/);
    expect(after.notes?.toLowerCase()).not.toMatch(/mirin/);
    expect(result.qualityFlags).toContain('alcohol_removed');
  });

  it('vin de Shaoxing → bouillon de poulet + vinaigre de cidre', () => {
    const result = s.run(
      buildInput({
        ingredients: [{ name: 'vin de Shaoxing', quantity: 30, unit: 'ml' }],
      }),
    );
    expect(result.changes[0].ruleId).toBe('alcohol.vin_de_shaoxing.to_chicken_broth_cider');
    expect(result.sanitized.ingredients[0].name).toBe('bouillon de poulet et vinaigre de cidre');
  });

  it('sherry → bouillon + vinaigre de cidre', () => {
    const result = s.run(
      buildInput({ ingredients: [{ name: 'sherry' }] }),
    );
    expect(result.sanitized.ingredients[0].name).toBe('bouillon et vinaigre de cidre');
  });
});

describe('RecipePolicySanitizer.run — multi-rule recipe (§6.7)', () => {
  it('recette avec porc + Shaoxing → both changes, both quality flags', () => {
    const s = new RecipePolicySanitizer();
    const result = s.run(
      buildInput({
        ingredients: [
          { name: 'porc haché', quantity: 200, unit: 'g' },
          { name: 'vin de Shaoxing', quantity: 30, unit: 'ml' },
        ],
      }),
    );
    expect(result.changes).toHaveLength(2);
    const ruleIds = result.changes.map((c) => c.ruleId);
    expect(ruleIds).toContain('pork.porc_hache.to_beef_minced');
    expect(ruleIds).toContain('alcohol.vin_de_shaoxing.to_chicken_broth_cider');
    expect(result.qualityFlags).toEqual(
      expect.arrayContaining(['porc_substituted', 'alcohol_removed']),
    );
  });
});

describe('RecipePolicySanitizer.run — violations in instructions (detect only)', () => {
  const s = new RecipePolicySanitizer();

  it('porc dans une instruction → violation listée, pas auto-corrigée', () => {
    const result = s.run(
      buildInput({
        instructions: [
          'Faire revenir le porc haché à feu vif.',
          'Ajouter le mirin et laisser réduire.',
        ],
        ingredients: [],
      }),
    );
    expect(result.changes).toHaveLength(0);
    expect(result.violationsRemaining.length).toBeGreaterThanOrEqual(2);
    const locations = result.violationsRemaining.map((v) => v.location);
    expect(locations).toContain('instructions[0]');
    expect(locations).toContain('instructions[1]');
    // Original text untouched.
    const instructions = result.sanitized.instructions as string[];
    expect(instructions[0]).toMatch(/porc haché/);
  });

  it('description avec porc → violation listée sur le champ description', () => {
    const result = s.run(
      buildInput({
        description: 'Ragoût coréen réconfortant avec porc gras.',
      }),
    );
    expect(result.violationsRemaining.some((v) => v.field === 'description')).toBe(true);
  });
});

describe('RecipePolicySanitizer.detectOnly (PR4 post-check API)', () => {
  const s = new RecipePolicySanitizer();

  it('returns empty for a clean text', () => {
    expect(s.detectOnly('Sauté de poulet aux légumes.').violations).toHaveLength(0);
  });

  it('returns empty for whitelisted phrasing', () => {
    expect(s.detectOnly('Recette sans porc, sans alcool.').violations).toHaveLength(0);
  });

  it('flags a porc mention', () => {
    const r = s.detectOnly('Pour cette recette utilisez du porc haché.');
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.violations[0].reason).toBe('pork_substitution');
  });

  it('flags an alcohol mention', () => {
    const r = s.detectOnly('Ajouter une cuillère de mirin pour la sauce.');
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.violations.some((v) => v.reason === 'alcohol_substitution')).toBe(true);
  });

  it('does not flag bacon when surrounded by "beef bacon"', () => {
    const r = s.detectOnly('Ajoutez du beef bacon.');
    expect(r.violations).toHaveLength(0);
  });
});

describe('RecipePolicySanitizer.run — purity', () => {
  it('does not mutate the input ingredients array', () => {
    const s = new RecipePolicySanitizer();
    const input = buildInput({
      ingredients: [{ name: 'porc haché', quantity: 200, unit: 'g' }],
    });
    const originalName = input.ingredients[0].name;
    s.run(input);
    expect(input.ingredients[0].name).toBe(originalName);
  });
});
