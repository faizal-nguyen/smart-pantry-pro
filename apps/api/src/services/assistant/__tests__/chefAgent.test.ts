/**
 * PRP-239 PR4 — Chef agent helper tests.
 *
 * Covers §10.6 acceptance criteria that are reachable without a live
 * LLM call:
 *   - Recipe-tool detection (drives the gpt-4o escalation in
 *     VoiceAgentService).
 *   - System prompt contains the policy clauses + the structured
 *     response shape.
 *   - detectOnly post-check redacts a chef synthesis that leaks porc
 *     or alcool tokens.
 *
 * §11.4 also asks for streaming-specific tests; those land alongside
 * the SSE route in a follow-up.
 */
import {
  RECIPE_TOOL_NAMES,
  buildRedactedChefMessage,
  CHEF_ROUND2_INSTRUCTION,
  chefSystemPrompt,
  isRecipeTool,
  postcheckChefOutput,
  type AssistantStreamEvent,
} from '../chefAgent';

describe('chefAgent — isRecipeTool', () => {
  it('matches every recipe-centric tool name', () => {
    expect(isRecipeTool('find_recipes_using_ingredient')).toBe(true);
    expect(isRecipeTool('suggest_recipes_for_context')).toBe(true);
    expect(isRecipeTool('search_recipes')).toBe(true);
    expect(isRecipeTool('find_cookable_recipes')).toBe(true);
    // QA-discovered: read_recent_recipes returns descriptions the LLM
    // tends to echo, so it must drive chefMode + post-check.
    expect(isRecipeTool('read_recent_recipes')).toBe(true);
  });

  it('rejects non-recipe tools (inventory / shopping / etc.)', () => {
    expect(isRecipeTool('add_inventory_items')).toBe(false);
    expect(isRecipeTool('add_shopping_items')).toBe(false);
    expect(isRecipeTool('read_inventory')).toBe(false);
    expect(isRecipeTool('ask_clarification')).toBe(false);
    expect(isRecipeTool('')).toBe(false);
  });

  it('exposes the canonical name set for downstream consumers', () => {
    expect(RECIPE_TOOL_NAMES.size).toBe(5);
    expect(RECIPE_TOOL_NAMES.has('find_recipes_using_ingredient')).toBe(true);
    expect(RECIPE_TOOL_NAMES.has('read_recent_recipes')).toBe(true);
  });
});

describe('chefAgent — chefSystemPrompt', () => {
  const prompt = chefSystemPrompt();

  it('declares the zero-porc / zero-alcool policy explicitly', () => {
    expect(prompt).toMatch(/[Zz]éro porc/);
    expect(prompt).toMatch(/[Zz]éro alcool/);
  });

  it("prioritises BDD recipes over invented ones", () => {
    expect(prompt).toMatch(/BDD d'abord/);
    expect(prompt).toMatch(/`name` exact/);
  });

  it('caps off-DB ideas at 2 and labels them', () => {
    expect(prompt).toMatch(/(jusqu'à|max) 2/i);
    expect(prompt).toMatch(/[Ii]dées chef hors bibliothèque/);
    expect(prompt).toMatch(/V1.*pas.*actionnables/i);
  });

  it('emits the structured response shape (résumé → BDD → manquants → hors BDD)', () => {
    expect(prompt).toMatch(/STRUCTURE DE LA RÉPONSE/);
    expect(prompt).toMatch(/phrase résumé/);
  });

  it('CHEF_ROUND2_INSTRUCTION asks for no further tool calls', () => {
    expect(CHEF_ROUND2_INSTRUCTION).toMatch(/n'invoque aucun outil/);
  });
});

describe('chefAgent — postcheckChefOutput', () => {
  it('returns null for a clean message', () => {
    const result = postcheckChefOutput(
      'Pour ce soir : Bibimbap (boeuf haché, légumes), prête en 25 min.',
    );
    expect(result).toBeNull();
  });

  it('returns null for whitelisted negative mentions', () => {
    const result = postcheckChefOutput(
      'Recette sans porc, sans alcool — parfait pour ce soir.',
    );
    expect(result).toBeNull();
  });

  it('returns null for empty / whitespace-only input', () => {
    expect(postcheckChefOutput('')).toBeNull();
    expect(postcheckChefOutput('   ')).toBeNull();
    expect(postcheckChefOutput(undefined)).toBeNull();
    expect(postcheckChefOutput(null)).toBeNull();
  });

  it('redacts a chef output mentioning pork belly', () => {
    const text = 'Essaie ce Kimchi Jjigae avec du pork belly mijoté.';
    const result = postcheckChefOutput(text);
    expect(result).not.toBeNull();
    expect(result!.violations.length).toBeGreaterThan(0);
    expect(result!.violations[0].reason).toBe('pork_substitution');
    expect(result!.redacted).toMatch(/zéro porc/);
    expect(result!.redacted).not.toContain('pork belly');
  });

  it('redacts a chef output mentioning mirin', () => {
    const text = 'Ajoute une cuillère de mirin pour caraméliser la sauce.';
    const result = postcheckChefOutput(text);
    expect(result).not.toBeNull();
    expect(result!.violations.some((v) => v.reason === 'alcohol_substitution')).toBe(true);
    expect(result!.redacted).toMatch(/zéro alcool/);
  });

  it('redacts multi-violation outputs with rule_ids listed', () => {
    const text = 'Le pork belly mariné au mirin réduit lentement.';
    const result = postcheckChefOutput(text);
    expect(result).not.toBeNull();
    const ruleIds = result!.violations.map((v) => v.ruleId);
    expect(ruleIds.length).toBeGreaterThanOrEqual(2);
    // The redaction includes the rule ids so the dev can trace what fired.
    expect(result!.redacted).toMatch(/Détection automatique/);
  });
});

describe('chefAgent — AssistantStreamEvent union (PR-C)', () => {
  it('accepts a delta event', () => {
    const evt: AssistantStreamEvent = { type: 'delta', text: 'Pour ce ' };
    expect(evt.type).toBe('delta');
    expect(evt.text).toContain('Pour');
  });

  it('a stream of deltas accumulates to a coherent message', () => {
    // Simulates what /api/assistant/text/stream emits during chef
    // round-2: a sequence of delta events whose `text` fields,
    // concatenated, reproduce the final assistant message.
    const events: AssistantStreamEvent[] = [
      { type: 'delta', text: 'Pour ' },
      { type: 'delta', text: 'ce soir : ' },
      { type: 'delta', text: 'Bibimbap ' },
      { type: 'delta', text: '(boeuf, 25 min).' },
      { type: 'done', response: { message: 'final', recipes: [] } },
    ];
    const accumulated = events
      .filter((e): e is Extract<AssistantStreamEvent, { type: 'delta' }> => e.type === 'delta')
      .map((e) => e.text)
      .join('');
    expect(accumulated).toBe('Pour ce soir : Bibimbap (boeuf, 25 min).');
    expect(events[events.length - 1]?.type).toBe('done');
  });
});

describe('chefAgent — buildRedactedChefMessage (direct)', () => {
  it('limits the rule list to 5 entries even with more violations', () => {
    const fake = Array.from({ length: 8 }).map((_, i) => ({
      ruleId: `rule.${i}`,
      field: 'instructions' as const,
      location: 'text',
      value: '…',
      reason: 'pork_substitution' as const,
    }));
    const out = buildRedactedChefMessage('original', fake);
    const listLine = out.split('\n').find((l) => l.startsWith('Détection automatique')) ?? '';
    const matches = listLine.match(/rule\.\d/g) ?? [];
    expect(matches.length).toBe(5);
  });

  it('deduplicates rule ids', () => {
    const out = buildRedactedChefMessage('x', [
      { ruleId: 'pork.porc.to_boeuf', field: 'instructions', location: 'text', value: '…', reason: 'pork_substitution' },
      { ruleId: 'pork.porc.to_boeuf', field: 'instructions', location: 'text', value: '…', reason: 'pork_substitution' },
    ]);
    expect((out.match(/pork\.porc\.to_boeuf/g) ?? []).length).toBe(1);
  });
});
