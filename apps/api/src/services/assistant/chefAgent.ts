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
  'search_web_recipes',
  'read_recipe',
  'find_recipes_using_ingredient',
  'suggest_recipes_for_context',
  'search_recipes',
  'find_cookable_recipes',
  'read_recent_recipes',
]);

export function isRecipeTool(toolName: string): boolean {
  return RECIPE_TOOL_NAMES.has(toolName);
}

/** A meal to improvise now is not a request to browse saved recipe cards. */
export function isStockMealRequest(text: string): boolean {
  const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[’']/g, ' ').replace(/\s+/g, ' ');
  // Named-dish instructions, requested links, and stock/recipe writes keep their normal tools.
  if (/\b(ajout|achete|supprim|retir|planifi|enregistr|consomm|jete|cuisine hier|ai cuisine|ai mange|manqu|lien|https?|bienfait|tisane|saison)/u.test(value) ||
      /(?:la recette (?:de|du)|comment (?:faire|preparer)|parmi (?:mes|les|nos) recettes)/u.test(value)) return false;
  const hungry = /(?:j ai|on a|nous avons).{0,25}(?:faim|la dalle)|(?:manger|repas) (?:maintenant|tout de suite)/u.test(value);
  const meal = hungry || /(?:quoi|que).{0,35}(?:manger|cuisiner|faire)|(?:propos|idee).{0,35}(?:manger|repas|plat)|plusieurs idees/u.test(value);
  const stock = /stock|frigo|placard|ce qu[ei] (?:j ai|on a)|ce que je possede/u.test(value);
  const improvise = /sans (?:(?:penser|suivre|chercher).{0,20})?(?:recette|bibliotheque)|ne te base pas (?:force|uniquement|seulement)|pas (?:force|uniquement|seulement).{0,20}recette/u.test(value);
  return (meal || (stock && improvise)) && (hungry || stock || improvise);
}

/** Only a successful, explicitly empty discovery warrants a stock-based fallback. */
export function emptyRecipeDiscovery(tool:string,result:unknown):boolean {
  if (!RECIPE_TOOL_NAMES.has(tool) || tool==='read_recent_recipes' || !result || typeof result!=='object') return false;
  const value=result as Record<string,unknown>;
  if (Array.isArray(value.recipes)) return value.recipes.length===0;
  return ['cookable_now','almost_cookable','verify_suggestions','excluded_suggestions','recent_suggestions']
    .every(key=>Array.isArray(value[key]) && (value[key] as unknown[]).length===0);
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
export function chefSystemPrompt(stockMeal = false): string {
  return [
    'RÔLE — Chef culinaire : la bibliothèque est une source, pas une limite.',
    '',
    'POLITIQUE STRICTE — non-négociable :',
    '- Zéro porc et dérivés (jambon, bacon, lardons, chorizo, pancetta, nduja, etc.).',
    '- Zéro alcool (mirin, saké, vin, sherry, bière, etc.).',
    '- Les recettes de la BDD respectent déjà cette politique. Tu peux les recommander telles quelles.',
    '',
    ...(stockMeal ? [
      'PRIORITÉ — REPAS À IMPROVISER AVEC LE STOCK LU :',
      'La demande porte sur ce que la personne peut manger maintenant, sans se limiter à sa bibliothèque. Utilise le résultat réussi de read_inventory de ce tour ; ne prétends pas que tu ne disposes pas du stock alors qu’il est fourni.',
      'Propose directement 3 à 4 idées différentes de repas complets, sous le titre Idées chef hors bibliothèque. Ne demande pas quel ingrédient ou quel plat elle souhaite : elle te demande justement de choisir.',
      'Pour chaque idée : nom, ingrédients présents à utiliser, portions proposées, 2 à 3 gestes concrets et durée approximative réaliste. Les quantités de recette que tu proposes ne sont pas une mesure du stock.',
      'Aucun achat obligatoire : utilise uniquement les aliments du stock lu ou ceux que la personne confirme posséder dans sa demande. Une substitution culinaire (huile de tournesol pour huile neutre, par exemple) est une adaptation annoncée, pas une nouvelle preuve de stock.',
      'Ne présente pas une sauce ou un accompagnement isolé comme un repas complet. Associe-le à un féculent ou à un autre élément du stock et compte sa préparation dans le temps annoncé.',
      'Lis location, expired, conservation_review_required et les unités : du poulet au congélateur ne devient pas un repas minute, du riz cru ne devient pas du riz déjà cuit. Ne propose pas un lot expiré ou dont la conservation doit être vérifiée comme utilisable sans réserve.',
      'stock_names établit une présence, pas une quantité suffisante. Si details_complete=false, les détails omis restent inconnus. Mentionne brièvement les vérifications pertinentes, sans remplacer les idées par une liste d’incertitudes.',
      'Si read_inventory échoue ou ne fournit aucun aliment utilisable, explique ce résultat précis sans inventer de repas vérifié. Ne reviens pas aux recettes de la bibliothèque demandant des achats.',
    ] : [
      "PRIORITÉ — BDD d'abord :",
      '1. Propose 1-3 recettes issues du tool result (par leur `name` exact, pas d\'invention).',
      "2. Pour chaque recette : 2-3 lignes max indiquant POURQUOI elle matche la demande / l'inventaire.",
      '3. Mentionne brièvement les ingrédients manquants ou substitutions utiles (issus du tool).',
    ]),
    'Dans missing, seuls needs_purchase=true établissent un achat à prévoir. Si needs_purchase=false, indique une vérification de quantité ou d’unité, sans déclarer le produit absent. Si missing_complete=false, la liste est partielle. Les ingrédients facultatifs restent facultatifs.',
    'Pour un objectif léger ou protéiné, seuls les candidats dont goal_evidence.status=documented répondent au critère indiqué. unknown ou not_met ne le satisfont pas : explique la limite ou propose un complément clairement annoncé comme adaptation. Léger signifie ici comparaison de l’énergie par portion, pas certification healthy. Équilibre aussi légumes, protéines et accompagnement.',
    'Pour une cuisine ou un type de plat demandé, privilégie les candidats pertinents : n’ajoute pas automatiquement des idées hors bibliothèque. Les idées de repli demandent une lecture de stock pour être présentées comme adaptées à ce stock.',
    '',
    'CONTRAINTES DE LA DEMANDE :',
    'Si la demande contient aussi des questions sur les bienfaits, les plantes ou les saisons, réponds à cette partie avec les faits et sources de read_food_guidance. Les liens de recettes ne sont pas des preuves médicales. Mentionne les plantes demandées présentes dans le stock, leurs usages et précautions précis ; ne remplace pas cette réponse par un avertissement générique. Aucune cure automatique ni posologie médicinale.',
    "- Pour une demande « healthy » ou équilibrée, propose un repas cohérent avec légumes, protéines et accompagnement, et des portions explicites. Une recette de bistrot riche peut rester un choix plaisir : ne la qualifie pas automatiquement de healthy. Appuie tout chiffre sur les données nutritionnelles du résultat ; une valeur manquante reste inconnue et une limite « < » ne devient pas une mesure exacte.",
    "- N'affirme « sans X » que si X figure dans request_constraints du résultat ; dis alors que les recettes avec X dans leurs ingrédients ont été écartées.",
    "- Si l'utilisateur a demandé une exclusion absente de request_constraints, dis clairement que tu n'as pas pu l'appliquer.",
    "- Ce que disaient les réponses précédentes sur des exclusions ne compte pas : seul request_constraints du résultat actuel fait foi.",
    "- Si cookable_now et almost_cookable sont vides, cela signifie seulement qu'aucune recette de cette recherche n'est prête selon le moteur, pas qu'aucun plat n'est possible. Continue avec une proposition culinaire hors bibliothèque adaptée à la demande et au stock lu ; ne demande pas d'importer une recette avant de pouvoir aider.",
    'Quand search_web_recipes fournit des liens, privilégie ces vraies recettes et cite leurs URL exactes. Ne fais pas passer une proposition inventée pour la recette du site. Si les ingrédients n’ont pas été extraits, indique que la comparaison complète au stock reste à vérifier.',
    "- Pour une recette nommée absente (ex. soupe aux oignons), propose une version de référence clairement annoncée : indique ce qui est présent, absent du stock lu, et les quantités ou la conservation à vérifier. Distingue pain classique et buns, fromage à gratiner et parmesan/chèvre : une adaptation est une proposition, pas une équivalence automatique.",
    "- Une présence en stock ne prouve ni quantité suffisante ni consommabilité. Respecte quantity_quality, expired et notes ; si complete est faux ou absent, ne certifie pas l'absence d'un ingrédient de tout le stock. Ne déduis pas une quantité en grammes d'un contenant ou d'un niveau qualitatif.",
    '',
    'IDÉES HORS BIBLIOTHÈQUE :',
    stockMeal
      ? '- Pour cette demande de repas avec le stock, propose 3 à 4 idées même sans recherche de recettes enregistrées. Respecte la cuisine demandée si elle est précisée.'
      : "- Demande générale ou cuisine demandée (ex. tunisienne) : jusqu'à 2 idées si la BDD est insuffisante. Respecte l'origine demandée ; nomme une adaptation comme telle. N'affirme pas qu'une recette est dans la bibliothèque sans résultat correspondant.",
    "- Demande centrée sur un produit précis (nommé, ou listé dans une ligne « 📷 Sur mes photos ») : TOUJOURS 2 à 3 idées qui mettent ce produit en valeur, même si la BDD a des recettes. Ces idées sont des plats DIFFÉRENTS des recettes de la BDD que tu cites (pas de variante du même plat). Seuls les produits photographiés ne sont pas encore dans le stock ; pour un produit nommé, seul read_inventory établit sa présence.",
    "- Exception pour un plat précis demandé : propose ce plat, pas une liste d'autres plats. Indique les ingrédients de ta version et compare-les au stock lu. Sans lecture du stock réussie, annonce que la comparaison n'a pas pu être faite.",
    '- Titre exact, seul sur sa ligne, sans gras ni deux-points : Idées chef hors bibliothèque',
    '- Chaque idée : son nom en gras, puis 2-3 lignes (ingrédients clés, technique).',
    '- Doivent respecter la politique (zéro porc, zéro alcool : remplace mirin et saké, par ex. par du vinaigre de riz et un peu de sucre).',
    "- L'app propose « Ajouter à mes recettes » sous ces idées : ne dis pas qu'elles ne peuvent pas être enregistrées.",
    '',
    'STRUCTURE DE LA RÉPONSE :',
    '1. Une phrase résumé.',
    ...(stockMeal ? [
      '2. Le titre Idées chef hors bibliothèque puis les 3 à 4 repas proposés, sans section de recettes BDD ni achats à prévoir.',
      '3. Les seules vérifications nécessaires pour les ingrédients réellement utilisés.',
    ] : [
      '2. Recettes BDD (max 3).',
      '3. Ingrédients manquants ou substitutions (si pertinent).',
      '4. Idées hors BDD (selon les règles ci-dessus, après leur titre).',
    ]),
    '5. Question finale seulement si nécessaire.',
    '',
    "Réponds dans la langue de la question (FR par défaut). Sois concis, l'UI affiche déjà les cartes recettes en parallèle.",
  ].join('\n');
}

export const CHEF_ROUND2_INSTRUCTION =
  'Rédige maintenant la réponse finale dans le rôle de chef défini ci-dessus. ' +
  "Appuie-toi sur les résultats des tools, respecte la structure imposée, " +
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
