/**
 * PRP-239 PR4 — Chef agent helpers.
 *
 * Extracted from VoiceAgentService so the same logic can be reused by
 * the streaming route (`/api/assistant/text/stream`) without duplicating
 * the policy-aware prompt + post-check.
 *
 * All exports here are pure. Easy to unit-test (no LLM call, no DB).
 */
import { recipePolicySanitizer } from '../recipeQuality/RecipePolicySanitizer.js';
import type { PolicyViolation } from '../recipeQuality/policyTypes.js';

/**
 * Tool names that trigger chef-mode escalation on round-2 synthesis
 * AND the detectOnly post-check on the final message.
 *
 * - `find_recipes_using_ingredient` — ingredient-centric ("recettes au saumon")
 * - `suggest_recipes_for_context`   — open ("que cuisiner ce soir")
 * - `search_recipes`                — by-name ("la recette du Bibimbap")
 * - `find_cookable_recipes`         — inventory-driven cookability
 * - `read_recent_recipes`           — "tu m'as déjà proposé quoi ?"
 *                                     Returns recipe descriptions that
 *                                     the LLM tends to echo verbatim,
 *                                     so the post-check must cover this
 *                                     surface. QA suite caught a
 *                                     pork-belly leak that bypassed
 *                                     chefMode without this entry.
 *
 * Anything else (shopping list, inventory ack, conversational) keeps
 * the gpt-4o-mini single-pass behaviour from PRP-224.
 */
export const RECIPE_TOOL_NAMES = new Set<string>([
  'find_recipes_using_ingredient',
  'suggest_recipes_for_context',
  'search_recipes',
  'find_cookable_recipes',
  'read_recent_recipes',
]);

export function isRecipeTool(toolName: string): boolean {
  return RECIPE_TOOL_NAMES.has(toolName);
}

/**
 * System prompt addendum injected on round-2 synthesis whenever a
 * recipe tool fired. PRP §10.3 + §10.4: the chef pass must see the
 * policy (zero porc, zero alcool), the V1 stance on off-DB ideas
 * (≤ 2, labelled, not actionable), and the structured response shape.
 *
 * Kept as a function (not a const) so future hooks like per-user
 * allergies / preferences can be threaded through cleanly when the
 * chef_suggest_off_db user setting lands.
 */
export function chefSystemPrompt(): string {
  return [
    'RÔLE — Chef culinaire de la bibliothèque utilisateur.',
    '',
    'POLITIQUE STRICTE — non-négociable :',
    '- Zéro porc et dérivés (jambon, bacon, lardons, chorizo, pancetta, nduja, etc.).',
    '- Zéro alcool (mirin, saké, vin, sherry, bière, etc.).',
    '- Les recettes de la BDD respectent déjà cette politique. Tu peux les recommander telles quelles.',
    '',
    "PRIORITÉ — BDD d'abord :",
    '1. Propose 1-3 recettes issues du tool result (par leur `name` exact, pas d\'invention).',
    "2. Pour chaque recette : 2-3 lignes max indiquant POURQUOI elle matche la demande / l'inventaire.",
    '3. Mentionne brièvement les ingrédients manquants ou substitutions utiles (issus du tool).',
    '',
    "IDÉES HORS BIBLIOTHÈQUE — autorisées, jusqu'à 2 :",
    '- Activées seulement si la BDD est insuffisante (peu de matches pertinents).',
    "- Préfixées clairement par 'Idées chef hors bibliothèque'.",
    '- Doivent respecter la politique (zéro porc, zéro alcool).',
    '- 2-3 lignes max par idée.',
    "- V1 : ces idées ne sont PAS encore actionnables (pas de bouton 'Ajouter').",
    '',
    'STRUCTURE DE LA RÉPONSE :',
    '1. Une phrase résumé.',
    '2. Recettes BDD (max 3).',
    '3. Ingrédients manquants ou substitutions (si pertinent).',
    '4. Idées hors BDD (max 2, séparées par le préfixe ci-dessus).',
    '5. Question finale seulement si nécessaire.',
    '',
    "Réponds dans la langue de la question (FR par défaut). Sois concis, l'UI affiche déjà les cartes recettes en parallèle.",
  ].join('\n');
}

export const CHEF_ROUND2_INSTRUCTION =
  'Rédige maintenant la réponse finale dans le rôle de chef défini ci-dessus. ' +
  "Appuie-toi sur les résultats des tools (recettes BDD + ingrédients), respecte la structure imposée, " +
  "et n'invoque aucun outil supplémentaire.";

/**
 * Build a redacted version of a chef synthesis whose detectOnly check
 * surfaced one or more policy violations. We don't try to surgically
 * patch the text — at this point the LLM has produced something we
 * don't trust. Instead we drop the raw output and leave a safe
 * fallback that preserves the structural separation the UI relies on.
 */
export function buildRedactedChefMessage(
  _original: string,
  violations: PolicyViolation[],
): string {
  const rules = Array.from(new Set(violations.map((v) => v.ruleId))).slice(0, 5).join(', ');
  return [
    "Je n'ai pas pu produire une réponse conforme à la politique (zéro porc / zéro alcool) sur ce tour-ci.",
    '',
    `Détection automatique : ${rules}.`,
    'Reformule ta demande, ou consulte directement les recettes proposées par les cartes ci-dessous.',
  ].join('\n');
}

/**
 * PRP-239 PR4 §10.2 — discriminated union of SSE event payloads. The
 * `/api/assistant/text/stream` route writes one `data: <JSON>\n\n`
 * line per event; consumers can rely on the `type` tag to dispatch.
 *
 * Non-streaming callers can ignore this — the same execution path
 * runs handleRequest without injecting an onProgress callback.
 */
export type AssistantStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool_result'; tool: string; payload: unknown }
  | { type: 'policy_warning'; violations: PolicyViolation[]; action: 'redacted' }
  | { type: 'done'; response: unknown };

/**
 * Run detectOnly() on a chef synthesis output. Returns `null` when the
 * text is clean (or empty), otherwise a `{ redacted, violations }`
 * pair the caller can use to replace the message + emit the
 * `policy_warning` SSE event (PRP §10.2).
 */
export function postcheckChefOutput(text: string | null | undefined):
  | { redacted: string; violations: PolicyViolation[] }
  | null {
  if (!text || !text.trim()) return null;
  const detection = recipePolicySanitizer.detectOnly(text);
  if (detection.violations.length === 0) return null;
  return {
    redacted: buildRedactedChefMessage(text, detection.violations),
    violations: detection.violations,
  };
}
