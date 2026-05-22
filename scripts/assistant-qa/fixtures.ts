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
      { kind: 'expects_response_does_not_contain', tokens: ['porc', 'mirin', 'jambon'] },
    ],
  },
  {
    id: 'recipe.002',
    category: 'recipe',
    purpose: 'Open suggestion → suggest_recipes_for_context + chef structure.',
    prompt: 'Que cuisiner ce soir ?',
    assertions: [
      { kind: 'expects_tool', tool: 'suggest_recipes_for_context' },
      { kind: 'expects_response_does_not_contain', tokens: ['porc', 'mirin'] },
    ],
  },
  {
    id: 'recipe.003',
    category: 'recipe',
    purpose: 'By-name lookup → search_recipes.',
    prompt: 'Tu as une recette de Bibimbap ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['search_recipes', 'find_recipes_using_ingredient'],
      },
      { kind: 'expects_response_matches_any', tokens: ['bibimbap'], ci: true },
    ],
  },
  {
    id: 'recipe.004',
    category: 'recipe',
    purpose: 'Cut-aware ask → tool with protein_cut=haut_de_cuisse OR ingredient=cuisses.',
    prompt: 'J\'ai des cuisses de poulet — qu\'est-ce que tu me proposes ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['find_recipes_using_ingredient', 'suggest_recipes_for_context'],
      },
      { kind: 'expects_response_matches_any', tokens: ['poulet', 'cuisse'], ci: true },
    ],
  },
  {
    id: 'recipe.005',
    category: 'recipe',
    purpose: 'Dietary constraint → suggest_recipes_for_context + at least one vegetarian recipe.',
    prompt: 'Une recette végétarienne pour ce soir ?',
    assertions: [
      { kind: 'expects_tool', tool: 'suggest_recipes_for_context' },
      { kind: 'expects_response_does_not_contain', tokens: ['poulet haché', 'boeuf', 'jambon'] },
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
    purpose: 'Cross-check recipe vs inventory → at least search_recipes OR read_inventory.',
    prompt: 'Qu\'est-ce qu\'il me manque pour faire une bolognaise ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['find_recipes_using_ingredient', 'search_recipes', 'analyze_recipe_inventory'],
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
    purpose: 'Generic name (pâtes) with many matches — assistant should call search_recipes or ask clarification.',
    prompt: 'La recette de pâtes ?',
    assertions: [
      {
        kind: 'expects_any_tool_from',
        tools: ['search_recipes', 'find_recipes_using_ingredient', 'ask_clarification'],
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
