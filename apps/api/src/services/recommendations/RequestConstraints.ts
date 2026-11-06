import { ingredientNameTokens, type NutritionProfileSettings } from '@smart/shared';

type Diet = NutritionProfileSettings['diets'][number];
/** Candidate phrases after « sans », « pas de », « évite »… and diets said for this meal. */
export interface RequestConstraints { phrases: string[]; diets: Diet[] }

const MAX_TERMS = 10, MAX_LENGTH = 80, MAX_WORDS = 4;
// Diets said for one meal ("sans gluten ce soir"). Pork and alcohol are already global policy;
// « sans viande » is left to the model's dietary_flag rather than guessed here.
const DIETS: Array<[RegExp, Diet]> = [
  [/\b(?:sans|pas de|evite[rz]? le)\s+gluten\b/g, 'gluten_free'], [/\b(?:sans|pas de|evite[rz]? le)\s+lactose\b/g, 'lactose_free'],
  [/\b(?:vegan\w*|vegetalien\w*)\b/g, 'vegan'], [/\bvegetarien\w*\b/g, 'vegetarian'],
];
// « je ne suis pas végétarien », « mon fils est végétarien, mais moi… »: not a diet for this meal.
const NEGATED = /\b(?:pas|non|jamais|plus)\s+(?:\S+\s+)?$/;
const SOMEONE_ELSE = /\b(?:mon|ma|mes|son|sa|ses|ton|ta|tes|notre|nos|votre|vos|leur|leurs)\s+\S+\s+(?:est|sont|etait)\s+(?:\S+\s+)?$/;
const DIET_WORDS = new Set(['gluten', 'lactose', 'viande', 'porc', 'alcool']);
// Nearly every recipe has them: « sans sel » is a seasoning wish, not a recipe filter.
const STAPLES = new Set(['sel', 'poivre', 'eau', 'huile']);
// "sans attendre", "sans four", "sans trop de sel", "pas de souci": nothing to leave out.
const NOT_FOOD = new Set(['trop', 'rien', 'attendre', 'cuisson', 'cuire', 'four', 'micro', 'robot', 'souci', 'soucis', 'probleme',
  'problemes', 'effort', 'efforts', 'stress', 'chichi', 'chichis', 'complication', 'complications', 'temps', 'faire', 'cuisiner',
  'preparation', 'vaisselle', 'doute', 'idee', 'idees', 'recette', 'recettes', 'plat', 'plats', 'facon', 'moins', 'plus', 'beaucoup',
  'mal', 'preference', 'envie', 'chance', 'budget', 'limite', 'contrainte', 'contraintes', 'allergie', 'allergies', 'regime']);
const ARTICLE = /^(?:un peu de |un peu d'|peu de |quelques |de la |de l'|du |des |de |d'|un |une |la |le |les |l'|mon |ma |mes )/;
// A clause or a time ends the phrase; "de", "à", "au" stay inside names ("lait de coco").
const END = /\s(?:et|mais|avec|pour|car|parce|si|qui|que|comme|sinon|plutot|stp|svp|s'il|merci|ce soir|ce midi|ce matin|cette semaine|aujourd'hui|demain|ou bien)\b.*$/;
const EXCLUSION = /\b(sans\s+|pas de\s+|plus de\s+|evite[rz]?\s+|pas d'\s*|plus d'\s*)(.+?)(?=[.!?;:()]|\bsans\s|\bpas d'|\bpas de\s|$)/g;
// "pas de" after having or finding is a stock fact, not a wish: "je n'ai malheureusement pas de crème".
const HAVE_BEFORE = /(?:\bai|\btu as|\bt'as|\by a|\bavons|\breste|\btrouve|\bmanque)(?:\s+\S+){0,2}\s*$/;
// "je veux plus de crème" asks for more; only "je ne mange plus de crème" leaves something out.
const NO_MORE_BEFORE = /\b(?:ne\s+|n')(?:veux|voudrais|souhaite|mets|mettez|ajoute|ajoutez|prends|prenez|mange|bois|supporte|digere|aime)\s*$/;

const ascii = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');
const key = (term: string) => ingredientNameTokens(term).join(' ');

function wanted(keyword: string, before: string): boolean {
  if (keyword === 'sans' || keyword.startsWith('evite')) return true;
  const clause = before.split(/[,;.!?]/).pop() ?? '';
  if (HAVE_BEFORE.test(clause.replace(/\s*(?:y|en)\s*$/, ''))) return false;
  return keyword.startsWith('pas') || NO_MORE_BEFORE.test(clause);
}
function saidFor(pattern: RegExp, folded: string): boolean {
  return [...folded.matchAll(pattern)].some(match => {
    const before = folded.slice(0, match.index);
    return !NEGATED.test(before) && !SOMEONE_ELSE.test(before);
  });
}

/** Reads the current message only. Phrases are not yet ingredients: see resolveExclusions. */
export function requestConstraints(text: string): RequestConstraints {
  const lower = text.slice(0, 2000).toLowerCase().normalize('NFC').replace(/[’`]/g, "'").replace(/\s+/g, ' ');
  const folded = ascii(lower);
  // Same offsets in the accented text keep "crème" as the user wrote it.
  const source = folded.length === lower.length ? lower : folded;
  const diets = DIETS.filter(([pattern]) => saidFor(pattern, folded)).map(([, diet]) => diet);
  const phrases: string[] = [];
  for (const match of folded.matchAll(EXCLUSION)) {
    const keyword = match[1]!.trim(), tail = match[2]!;
    if (!wanted(keyword, folded.slice(0, match.index))) continue;
    const start = match.index! + match[0].length - tail.length;
    const kept = source.slice(start, start + tail.replace(END, '').length);
    for (const part of kept.split(/\s*(?:,|\bni\b|\bou\b)\s*/)) {
      let phrase = part.trim();
      for (let previous = ''; previous !== phrase;) { previous = phrase; phrase = phrase.replace(ARTICLE, '').trim(); }
      if (phrase && phrase.length <= MAX_LENGTH) phrases.push(phrase);
    }
  }
  return { phrases, diets: [...new Set(diets)] };
}

/**
 * Keeps, for each phrase, its longest leading words that name a food (« crème ça serait
 * mieux » → « crème »). A phrase naming no food (« os », « rapide ») is dropped, so it
 * neither filters recipes nor is reported to the model as applied.
 */
export function resolveExclusions(phrases: string[], namesFood: (term: string) => boolean): string[] {
  const terms: string[] = [];
  for (const phrase of phrases) {
    const words = phrase.split(' ');
    const first = ascii(words[0] ?? '');
    if (NOT_FOOD.has(first) || STAPLES.has(first) || DIET_WORDS.has(ascii(phrase))) continue;
    for (let count = Math.min(MAX_WORDS, words.length); count > 0; count--) {
      const term = words.slice(0, count).join(' ');
      if (DIET_WORDS.has(ascii(term)) || !namesFood(term)) continue;
      if (!terms.some(known => key(known) === key(term))) terms.push(term);
      break;
    }
  }
  return terms.slice(0, MAX_TERMS);
}
