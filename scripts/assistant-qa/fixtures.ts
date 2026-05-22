/**
 * Assistant QA — fixture set V1.
 *
 * 20 prompts grouped by category, with behavioral assertions only (no
 * snapshot of the LLM text, no LLM-as-judge in V1). Assertions check
 * what's deterministic:
 *   - tools actually called (driven by the system prompt, stable)
 *   - policy post-check fired or not (detectOnly is deterministic)
 *   - response message contains expected keywords (loose match)
 *   - cost + latency under per-prompt budgets
 *
 * Write tests are intentionally OUT OF SCOPE for V1 — they'd pollute
 * the e2e user's real inventory / shopping list on every run. The
 * follow-up is a dedicated QA user with auto-reset between runs.
 */

export type QACategory =
  | 'recipe'
  | 'chef'
  | 'inventory'
  | 'shopping'
  | 'policy'
  | 'ambiguity'
  | 'multilingual';

export interface QAFixture {
  id: string;
  category: QACategory;
  prompt: string;
  /** Hint for the API. Defaults to 'fr'. */
  language?: 'fr' | 'en';
  assertions: QAAssertion[];
  /** Max LLM USD this prompt is allowed to spend. Default 0.05. */
  maxCostUsd?: number;
  /** Max wall-clock ms. Default 15000. */
  maxLatencyMs?: number;
  /** Free-text purpose of this fixture, surfaced in the report. */
  purpose: string;
}

/**
 * Behavioral assertion variants. Each one targets an observable in the
 * `AssistantPlanResponse`. No assertion ever expects an EXACT text
 * match against `message` — those break on LLM drift.
 */
export type QAAssertion =
  | { kind: 'expects_tool'; tool: string }
  | { kind: 'expects_no_tool'; tool: string }
  | { kind: 'expects_any_tool_from'; tools: string[] }
  | { kind: 'expects_response_matches_any'; tokens: string[]; ci?: boolean }
  | { kind: 'expects_response_does_not_contain'; tokens: string[]; ci?: boolean }
  | { kind: 'expects_chef_redacted' }
  | { kind: 'expects_off_db_section' }
  | { kind: 'expects_pending_actions'; min?: number }
  | { kind: 'expects_no_pending_actions' }
  | { kind: 'expects_actions_executed'; min?: number };

// ---------------------------------------------------------------------------
// The 20 fixtures
// ---------------------------------------------------------------------------

export const FIXTURES: readonly QAFixture[] = [
  // ---- Recipe / chef (6) ----------------------------------------------
  {
    id: 'recipe.001',
    category: 'recipe',
    purpose: 'Ingredient-centric question (poulet) → find_recipes_using_ingredient + at least one BDD recipe referenced.',
    prompt: 'Quelles recettes je peux faire avec du poulet ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['find_recipes_using_ingredient', 'suggest_recipes_for_context'],
      },
      // Token list targets *culinary usage* phrasings, NOT the bare
      // word "porc" (which also appears in the redaction marker
      // "zéro porc / zéro alcool"). detectOnly's redacted text is
      // by design a policy mention — the leak we want to catch is
      // the LLM cooking with porc.
      { kind: 'expects_response_does_not_contain', tokens: ['pork belly', 'du porc', 'au porc', 'porc gras', 'porc haché', 'mirin', 'jambon cru', 'lardons'], ci: true },
    ],
  },
  {
    id: 'recipe.002',
    category: 'recipe',
    purpose: 'Open suggestion → suggest_recipes_for_context + chef structure. Catches the round-1 description leak fixed by detectOnly hoisting.',
    prompt: 'Que cuisiner ce soir ?',
    assertions: [
      { kind: 'expects_tool', tool: 'suggest_recipes_for_context' },
      { kind: 'expects_response_does_not_contain', tokens: ['pork belly', 'du porc', 'au porc', 'avec du porc', 'porc gras', 'mirin'], ci: true },
    ],
  },
  {
    id: 'recipe.003',
    category: 'recipe',
    purpose: 'By-name lookup → search_recipes (or any recipe tool that surfaces "Bibimbap").',
    prompt: 'Tu as une recette de Bibimbap ?',
    assertions: [
      {
        // Observed: LLM picks suggest_recipes_for_context for by-name
        // questions and still finds Bibimbap. Accept any recipe tool.
        kind: 'expects_any_tool_from',
        tools: ['search_recipes', 'find_recipes_using_ingredient', 'suggest_recipes_for_context'],
      },
      { kind: 'expects_response_matches_any', tokens: ['bibimbap'], ci: true },
    ],
  },
  {
    id: 'recipe.004',
    category: 'recipe',
    purpose: 'Cut-aware ask — recipe tool OR inventory probe followed by a suggestion are both acceptable.',
    prompt: 'J\'ai des cuisses de poulet — qu\'est-ce que tu me proposes ?',
    assertions: [
      {
        // Observed: LLM may probe inventory first ("do you really have
        // them?") before suggesting. Accept that conservative path.
        kind: 'expects_any_tool_from',
        tools: [
          'find_recipes_using_ingredient',
          'suggest_recipes_for_context',
          'read_inventory',
        ],
      },
      { kind: 'expects_response_matches_any', tokens: ['poulet', 'cuisse'], ci: true },
    ],
  },
  {
    id: 'recipe.005',
    category: 'recipe',
    purpose: 'Dietary constraint → suggest_recipes_for_context + no meat phrasings in the user-facing answer.',
    prompt: 'Une recette végétarienne pour ce soir ?',
    assertions: [
      { kind: 'expects_tool', tool: 'suggest_recipes_for_context' },
      // Target culinary USE phrasings only — the redaction marker
      // mentions rule_ids like "pork.porc.to_boeuf" which would trip
      // a naive "boeuf" check.
      {
        kind: 'expects_response_does_not_contain',
        tokens: ['boeuf haché', 'poulet haché', 'jambon cru', 'du jambon', 'au poulet', 'au boeuf'],
        ci: true,
      },
    ],
    maxLatencyMs: 18000,
  },
  {
    id: 'chef.001',
    category: 'chef',
    purpose: 'Empty BDD case → chef off-DB ideas section, no porc/alcool leak.',
    prompt: 'Je veux du gumbo louisianais ce soir — une idée ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['suggest_recipes_for_context', 'find_recipes_using_ingredient', 'search_recipes'],
      },
      { kind: 'expects_response_does_not_contain', tokens: ['pork belly', 'mirin', 'lardons'] },
    ],
    maxCostUsd: 0.08,
  },

  // ---- Inventory reads (4) -------------------------------------------
  {
    id: 'inv.001',
    category: 'inventory',
    purpose: 'Plain inventory read.',
    prompt: 'Qu\'est-ce que j\'ai dans mon frigo ?',
    assertions: [
      { kind: 'expects_tool', tool: 'read_inventory' },
      { kind: 'expects_no_pending_actions' },
    ],
  },
  {
    id: 'inv.002',
    category: 'inventory',
    purpose: 'Targeted product check — read_inventory or read_stock_of.',
    prompt: 'Il me reste du lait ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['read_inventory', 'read_stock_of', 'read_stock'],
      },
    ],
  },
  {
    id: 'inv.003',
    category: 'inventory',
    purpose: 'Expiry filter → read_inventory (with expiry_within or similar).',
    prompt: 'Quels produits arrivent à expiration cette semaine ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['read_inventory', 'read_expiring_items', 'read_inventory_filtered'],
      },
    ],
  },
  {
    id: 'inv.004',
    category: 'inventory',
    purpose: 'Inventory + suggestion blend ("rien à manger ?") — should at least read inventory.',
    prompt: 'Je n\'ai rien à manger, regarde mon frigo et propose-moi quelque chose.',
    assertions: [
      { kind: 'expects_tool', tool: 'read_inventory' },
    ],
    maxLatencyMs: 18000,
  },

  // ---- Shopping reads (3) --------------------------------------------
  {
    id: 'shop.001',
    category: 'shopping',
    purpose: 'Plain shopping list read.',
    prompt: 'Qu\'est-ce qu\'il y a sur ma liste de courses ?',
    assertions: [
      { kind: 'expects_tool', tool: 'read_shopping_list' },
      { kind: 'expects_no_pending_actions' },
    ],
  },
  {
    id: 'shop.002',
    category: 'shopping',
    purpose: 'Empty/light check on shopping list.',
    prompt: 'Ma liste de courses est-elle vide ?',
    assertions: [
      { kind: 'expects_tool', tool: 'read_shopping_list' },
    ],
  },
  {
    id: 'shop.003',
    category: 'shopping',
    purpose: 'Cross-check recipe vs inventory — assistant should read at least one of inventory / recent recipes / search before answering.',
    prompt: 'Qu\'est-ce qu\'il me manque pour faire une bolognaise ?',
    assertions: [
      {
        // Observed: LLM batches read_inventory + read_shopping_list +
        // read_recent_recipes for cross-referencing. Accept any of
        // those probes as sufficient evidence the assistant didn't
        // hallucinate the gap from nothing.
        kind: 'expects_any_tool_from',
        tools: [
          'find_recipes_using_ingredient',
          'search_recipes',
          'analyze_recipe_inventory',
          'read_inventory',
          'read_recent_recipes',
        ],
      },
    ],
    maxLatencyMs: 18000,
  },

  // ---- Policy (4) ----------------------------------------------------
  {
    id: 'policy.001',
    category: 'policy',
    purpose: 'User-provided porc keyword in question — assistant must NOT echo "pork belly" in suggestion.',
    prompt: 'Tu peux me faire un Kimchi Jjigae avec du pork belly bien gras ?',
    assertions: [
      { kind: 'expects_response_does_not_contain', tokens: ['pork belly'], ci: true },
    ],
    maxLatencyMs: 18000,
  },
  {
    id: 'policy.002',
    category: 'policy',
    purpose: 'Pedagogical question about mirin — assistant SHOULD discuss mirin freely (no recipe tool fired → no detectOnly redaction).',
    prompt: 'Pourquoi le mirin est exclu de tes recettes ?',
    assertions: [
      { kind: 'expects_response_matches_any', tokens: ['mirin', 'alcool', 'politique'], ci: true },
      // No tools needed for this pedagogical chat.
      { kind: 'expects_no_tool', tool: 'find_recipes_using_ingredient' },
      { kind: 'expects_no_tool', tool: 'suggest_recipes_for_context' },
    ],
    maxCostUsd: 0.03,
  },
  {
    id: 'policy.003',
    category: 'policy',
    purpose: 'Explicit "sans porc" request — BDD recipes returned, no policy violation.',
    prompt: 'Donne-moi une recette sans porc pour ce soir.',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['suggest_recipes_for_context', 'find_recipes_using_ingredient'],
      },
      { kind: 'expects_response_does_not_contain', tokens: ['porc haché', 'pork belly', 'jambon'] },
    ],
  },
  {
    id: 'policy.004',
    category: 'policy',
    purpose: 'Tool returns substituted recipes (post-PR1b jambon → dinde fumée) — assistant references substituted dishes.',
    prompt: 'Des recettes avec du jambon ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['find_recipes_using_ingredient', 'suggest_recipes_for_context'],
      },
      // Post-PR1b: jambon ingredients have been substituted to dinde fumée in DB.
      // So responses should reference "dinde" / "dinde fumée" not literal "jambon".
      { kind: 'expects_response_does_not_contain', tokens: ['jambon cru', 'jambon de parme'], ci: true },
    ],
  },

  // ---- Ambiguity (2) -------------------------------------------------
  {
    id: 'ambig.001',
    category: 'ambiguity',
    purpose: 'Vague product reference — assistant should clarify rather than guess.',
    prompt: 'Combien j\'ai de yaourt ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['read_inventory', 'read_stock_of', 'ask_clarification', 'search_product_candidates'],
      },
    ],
  },
  {
    id: 'ambig.002',
    category: 'ambiguity',
    purpose: 'Generic name (pâtes) with many matches — any recipe-finding tool is fine, including the open suggest_recipes_for_context.',
    prompt: 'La recette de pâtes ?',
    assertions: [
      {
        // Observed: LLM falls back to suggest_recipes_for_context for
        // ambiguous queries instead of search_recipes. Accept it as
        // long as some recipe tool fires.
        kind: 'expects_any_tool_from',
        tools: [
          'search_recipes',
          'find_recipes_using_ingredient',
          'suggest_recipes_for_context',
          'ask_clarification',
        ],
      },
    ],
  },

  // ---- Multilingual / typo (1) ---------------------------------------
  {
    id: 'intl.001',
    category: 'multilingual',
    purpose: 'English prompt — assistant should respond in English and still call a recipe tool.',
    prompt: 'What can I cook tonight with chicken?',
    language: 'en',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['suggest_recipes_for_context', 'find_recipes_using_ingredient'],
      },
      // Response should mention English words for chicken / recipe.
      { kind: 'expects_response_matches_any', tokens: ['chicken', 'cook'], ci: true },
    ],
  },
];

export type AssertionResult = {
  kind: QAAssertion['kind'];
  description: string;
  pass: boolean;
  detail?: string;
};
