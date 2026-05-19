/**
 * Types de cuisine canoniques + inférence depuis n'importe quelle
 * source de recette (catalogue, legacy, custom).
 *
 * Pourquoi : les recettes arrivent de 3 endroits (`recipes_catalog`,
 * legacy `recipes`, custom) avec des conventions différentes :
 *  - `recipes_catalog.tags: string[]` peut contenir "indian",
 *    "indien", "indienne", "curry", "spices", etc.
 *  - `recipes.cuisine_category: string` (legacy) — valeurs libres
 *    en français ("Asiatique", "Indienne", …).
 *  - custom recipes : pas de champ dédié, seulement `personal_tags`.
 *
 * Plutôt que d'imposer un champ unique en DB, on normalise au moment
 * de l'affichage via `inferCuisineKey()`. Le composant filtre dérive
 * la liste des cuisines réellement présentes à partir de la library
 * filtrée, donc on n'affiche que des chips actionnables.
 *
 * Order MATTERS : `inferCuisineKey()` retourne le premier matcher qui
 * matche. Les cuisines spécifiques ("japonaise", "coréenne") doivent
 * passer avant les regroupements ("asiatique") sinon une recette
 * japonaise tagguée "asian, japanese" serait classée Asiatique.
 */

export interface CuisineDef {
  key: string;
  label: string;
  icon: string;
  /**
   * Sous-chaînes lowercase à chercher dans les sources (tags, titre,
   * cuisine_category). Liste les variantes FR + EN + accent-less.
   */
  matchers: readonly string[];
}

export const CUISINE_DEFS: readonly CuisineDef[] = [
  { key: 'indien',       label: 'Indien',       icon: '🇮🇳', matchers: ['indien', 'indian', 'curry', 'masala', 'tandoori', 'biryani'] },
  { key: 'malaysien',    label: 'Malaysien',    icon: '🇲🇾', matchers: ['malaysi', 'malais', 'malay', 'nasi lemak', 'rendang'] },
  { key: 'indonesien',   label: 'Indonésien',   icon: '🇮🇩', matchers: ['indonésien', 'indonesien', 'indonesian', 'nasi goreng', 'satay'] },
  { key: 'japonais',     label: 'Japonais',     icon: '🇯🇵', matchers: ['japonais', 'japanese', 'sushi', 'ramen', 'udon', 'tempura', 'donburi', 'miso'] },
  { key: 'coreen',       label: 'Coréen',       icon: '🇰🇷', matchers: ['coréen', 'coreen', 'korean', 'bibimbap', 'bulgogi', 'kimchi'] },
  { key: 'vietnamien',   label: 'Vietnamien',   icon: '🇻🇳', matchers: ['vietnamien', 'vietnamese', 'pho', 'banh mi', 'banh xeo', 'bun cha'] },
  { key: 'thai',         label: 'Thaï',         icon: '🇹🇭', matchers: ['thaï', 'thai', 'pad thai', 'tom yum', 'tom kha', 'massaman'] },
  { key: 'chinois',      label: 'Chinois',      icon: '🇨🇳', matchers: ['chinois', 'chinese', 'dim sum', 'wok', 'mandarin', 'cantonais', 'cantonese', 'sichuan'] },
  { key: 'philippin',    label: 'Philippin',    icon: '🇵🇭', matchers: ['philippin', 'filipino', 'adobo', 'sinigang'] },
  // Regroupement "Asiatique" laissé en dernier des asiatiques : sert
  // de fallback si on ne sait pas distinguer le pays exact.
  { key: 'asiatique',    label: 'Asiatique',    icon: '🥢', matchers: ['asiatique', 'asian', 'asie'] },
  { key: 'francais',     label: 'Français',     icon: '🇫🇷', matchers: ['français', 'francais', 'french', 'française', 'francaise'] },
  { key: 'italien',      label: 'Italien',      icon: '🇮🇹', matchers: ['italien', 'italian', 'italienne', 'pasta', 'pizza', 'risotto'] },
  { key: 'espagnol',     label: 'Espagnol',     icon: '🇪🇸', matchers: ['espagnol', 'spanish', 'paella', 'tapas'] },
  { key: 'mexicain',     label: 'Mexicain',     icon: '🇲🇽', matchers: ['mexicain', 'mexican', 'taco', 'burrito', 'enchilada', 'quesadilla'] },
  { key: 'libanais',     label: 'Libanais',     icon: '🇱🇧', matchers: ['libanais', 'lebanese', 'mezzé', 'meze', 'tabbouleh', 'houmous', 'falafel'] },
  { key: 'marocain',     label: 'Marocain',     icon: '🇲🇦', matchers: ['marocain', 'moroccan', 'tajine', 'tagine', 'couscous'] },
  { key: 'mediterraneen', label: 'Méditerranéen', icon: '🫒', matchers: ['méditerranéen', 'mediterraneen', 'mediterranean', 'grec', 'greek'] },
  { key: 'americain',    label: 'Américain',    icon: '🇺🇸', matchers: ['américain', 'americain', 'american', 'burger', 'bbq', 'cajun', 'tex-mex'] },
  { key: 'autres',       label: 'Autres',       icon: '🍽️', matchers: [] },
] as const;

export const ALL_CUISINES_KEY = 'all';

function normalize(text: string): string {
  // Pas d'accent fold complet : nos matchers ont déjà les variantes
  // accentuées/non-accentuées. On reste sur un simple lowercase pour
  // garder le helper synchrone et léger.
  return text.toLowerCase();
}

/**
 * Tente d'inférer la cuisine d'une recette depuis plusieurs sources.
 * Retourne null si aucun matcher (autre que le fallback "autres") ne
 * match — utile pour distinguer "vraiment autres" de "pas d'info".
 *
 * @param source — objet partiel issu de UserRecipe ou similaire.
 *   Tous les champs sont optionnels ; on lit ce qu'on trouve.
 */
export function inferCuisineKey(source: {
  cuisine_category?: string | null;
  tags?: readonly string[] | null;
  personal_tags?: readonly string[] | null;
  catalog_recipe?: { tags?: readonly string[] | null; title?: string | null } | null;
  title?: string | null;
}): string | null {
  // 1. cuisine_category direct (legacy `recipes` table) — autoritaire.
  if (source.cuisine_category) {
    const k = matchAgainstDefs(source.cuisine_category);
    if (k) return k;
  }

  // 2. Tags / personal_tags / catalog tags — concat puis match.
  const tags = [
    ...(source.tags ?? []),
    ...(source.personal_tags ?? []),
    ...(source.catalog_recipe?.tags ?? []),
  ];
  for (const tag of tags) {
    const k = matchAgainstDefs(tag);
    if (k) return k;
  }

  // 3. Fallback titre — beaucoup de recettes ont la cuisine dans le
  //    nom ("Pad Thai", "Curry de poulet", "Bibimbap"). Surface utile
  //    pour les recettes legacy sans tag.
  const title = source.title ?? source.catalog_recipe?.title;
  if (title) {
    const k = matchAgainstDefs(title);
    if (k) return k;
  }

  return null;
}

function matchAgainstDefs(text: string): string | null {
  const lower = normalize(text);
  for (const def of CUISINE_DEFS) {
    if (def.matchers.some((m) => lower.includes(m))) return def.key;
  }
  return null;
}

/**
 * Récupère la définition (label + icon) d'une cuisine canonique.
 * Retourne undefined si la clé n'est pas connue (sécurité TS).
 */
export function getCuisineDef(key: string | null | undefined): CuisineDef | undefined {
  if (!key) return undefined;
  return CUISINE_DEFS.find((d) => d.key === key);
}
