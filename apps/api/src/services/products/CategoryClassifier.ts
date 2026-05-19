/**
 * Phase 3 follow-up — name-based product categorisation.
 *
 * Used by ProductResolver.create() to assign a proper `category` to
 * auto-created voice products instead of defaulting every unknown
 * name to 'autres'. Mirrors the heuristics in src/pages/Inventory.tsx
 * so both sides agree on what's a légume vs an épice vs a féculent.
 *
 * Pure module. No I/O. Deterministic. Safe to share across requests.
 *
 * The frontend already has its own NAME_HINTS table for legacy rows
 * whose stored `products.category` is wrong or 'autres'. Once a
 * product is correctly tagged at creation here the frontend's
 * fallback never has to run for it.
 */

export type CategoryKey =
  | 'viandes'
  | 'poissons'
  | 'epices'
  | 'epicerie'
  | 'surgeles'
  | 'boulangerie'
  | 'feculents'
  | 'laitiers'
  | 'legumes'
  | 'fruits'
  | 'boissons'
  | 'snacks'
  | 'autres';

const NAME_HINTS: Readonly<Record<Exclude<CategoryKey, 'autres'>, readonly string[]>> = {
  legumes: [
    'pommes de terre', 'pomme de terre', 'patate douce', 'patate',
    'oignon', 'échalote', 'echalote', 'ail', 'tomate', 'concombre',
    'poivron', 'courgette', 'aubergine', 'carotte', 'salade', 'laitue',
    'épinard', 'epinard', 'chou', 'brocoli', 'haricot vert',
    'pois chiche', 'lentille', 'champignon', 'radis', 'betterave',
    'navet', 'poireau', 'fenouil', 'asperge', 'artichaut', 'cornichon',
    'olive', 'avocat', 'céleri', 'celeri',
  ],
  fruits: [
    'pomme', 'banane', 'orange', 'fraise', 'framboise', 'mangue', 'kiwi',
    'pêche', 'peche', 'abricot', 'poire', 'cerise', 'myrtille', 'raisin',
    'pastèque', 'pasteque', 'melon', 'ananas', 'citron', 'pamplemousse',
    'mandarine', 'clémentine', 'clementine', 'datte', 'figue', 'grenade',
    'litchi', 'noix de coco',
  ],
  viandes: [
    'aile de poulet', 'cuisse de poulet', 'escalope de poulet',
    'pilon de poulet', 'pilon', 'escalope', 'poulet', 'bœuf', 'boeuf',
    'steak', 'agneau', 'gigot', 'veau', 'porc', 'jambon', 'saucisse',
    'lard', 'bacon', 'dinde', 'canard', 'viande', 'mince', 'haché',
    'hache', 'bavette', 'entrecôte', 'entrecote', 'faux-filet', 'côte',
    'merguez', 'chorizo',
  ],
  poissons: [
    'poisson', 'saumon', 'thon', 'cabillaud', 'maquereau', 'sardine',
    'hareng', 'truite', 'sole', 'lieu', 'colin', 'crevette', 'gambas',
    'moule', 'huître', 'huitre', 'crabe', 'surimi', 'anchois',
  ],
  laitiers: [
    'lait', 'fromage', 'fromage blanc', 'yaourt', 'yoghourt', 'crème',
    'creme', 'beurre', 'mozzarella', 'parmesan', 'cheddar', 'feta',
    'mascarpone', 'ricotta', 'brie', 'camembert', 'comté', 'comte',
    'gruyère', 'gruyere', 'skyr', 'œuf', 'oeuf', 'egg',
  ],
  boulangerie: [
    'pain', 'baguette', 'ciabatta', 'naan', 'pita', 'focaccia',
    'croissant', 'brioche', 'viennoiserie', 'tortilla', 'wrap',
    'biscotte', 'toast',
  ],
  feculents: [
    'fleurs de mais', 'fleurs de maïs', 'cornflake', 'corn flake',
    'céréale', 'cereale', 'cereal', "flocon d'avoine", 'flocon davoine',
    'riz', 'pâte', 'pate', 'pasta', 'nouille', 'noodle', 'spaghetti',
    'penne', 'fusilli', 'lasagne', 'tagliatelle', 'macaroni', 'udon',
    'ramen', 'soba', 'quinoa', 'boulgour', 'bulgur', 'polenta',
    'couscous', 'semoule', 'orzo', 'maïs', 'mais',
  ],
  epices: [
    'ail semoule', 'ail en poudre', 'ail granulé', 'ail granule',
    'oignon en poudre', 'gingembre en poudre', 'gingembre moulu',
    'curcuma', 'cumin', 'paprika', 'poivre', 'sel', 'cannelle', 'muscade',
    'cardamome', 'coriandre', 'basilic', 'persil', 'ciboulette', 'thym',
    'romarin', 'laurier', 'menthe', 'origan', 'gochujang', 'gochugaru',
    'sumac', 'allspice', 'piment', 'épice', 'epice', 'masala',
    'pâte de curry', 'pate de curry', 'en poudre', 'moulu', 'moulue',
  ],
  epicerie: [
    'concentré de tomate', 'concentre de tomate', 'pâte de tomate',
    'pate de tomate', 'huile', 'vinaigre', 'sauce', 'ketchup',
    'mayonnaise', 'mayo', 'moutarde', 'miel', 'sucre', 'confiture',
    'bouillon', 'sauce soja', 'soja', 'sirop', 'tahini', 'nduja',
    'pesto', 'cassonade',
  ],
  boissons: [
    'thé', 'tea', 'café', 'cafe', 'jus', 'soda', 'cola', 'limonade',
    'vin', 'bière', 'biere', 'eau', 'kombucha', 'smoothie', 'cocktail',
    'detox', 'kahwa', 'matcha', 'infusion', 'tisane',
  ],
  snacks: [
    'chip', 'biscuit', 'gâteau', 'gateau', 'chocolat', 'bonbon',
    'confiserie', 'praline', 'macaron', 'madeleine', 'cookie', 'brownie',
    'crêpe', 'crepe', 'pancake', 'tarte',
  ],
  surgeles: [
    'surgelé', 'surgele', 'congelé', 'congele', 'frite',
  ],
};

// Tie-break order when two hints of identical length match.
const CATEGORY_PRIORITY: readonly CategoryKey[] = [
  'viandes', 'poissons', 'epices', 'epicerie', 'surgeles', 'boulangerie',
  'feculents', 'laitiers', 'legumes', 'fruits', 'boissons', 'snacks',
];

interface FlatHint {
  hint: string;
  key: CategoryKey;
  priority: number;
}

/**
 * All hints flattened across categories and sorted by length DESC so a
 * longer/more specific hint wins over a shorter generic one (e.g.
 *   "ail semoule"     → epices    (NOT legumes via "ail")
 *   "fleurs de mais"  → feculents (NOT legumes via "mais")
 *   "pomme de terre"  → legumes   (NOT fruits via "pomme"))
 *
 * Computed once at module load.
 */
const FLAT_HINTS: readonly FlatHint[] = (() => {
  const out: FlatHint[] = [];
  for (const [key, hints] of Object.entries(NAME_HINTS) as Array<
    [Exclude<CategoryKey, 'autres'>, readonly string[]]
  >) {
    const priority = CATEGORY_PRIORITY.indexOf(key);
    for (const hint of hints) {
      out.push({
        hint,
        key,
        priority: priority === -1 ? Number.MAX_SAFE_INTEGER : priority,
      });
    }
  }
  out.sort((a, b) => {
    if (a.hint.length !== b.hint.length) return b.hint.length - a.hint.length;
    return a.priority - b.priority;
  });
  return out;
})();

const BOUNDARY_RE = /[\s,.\-_()/'"\d]/;

function matchesHint(lowerName: string, hint: string): boolean {
  const idx = lowerName.indexOf(hint);
  if (idx === -1) return false;
  const before = lowerName[idx - 1] ?? ' ';
  const after = lowerName[idx + hint.length] ?? ' ';
  const boundaryBefore = BOUNDARY_RE.test(before) || idx === 0;
  let boundaryAfter =
    BOUNDARY_RE.test(after) || idx + hint.length === lowerName.length;
  // Accept French plural 's'/'x' as a valid word-end boundary so
  // "tomates", "poivrons", "frites" etc. match singular hints.
  if (!boundaryAfter && (after === 's' || after === 'x')) {
    const afterAfter = lowerName[idx + hint.length + 1] ?? ' ';
    boundaryAfter =
      BOUNDARY_RE.test(afterAfter) || idx + hint.length + 1 === lowerName.length;
  }
  return boundaryBefore && boundaryAfter;
}

/**
 * Classify a product purely from its display name. Returns the
 * matching CategoryKey or null when nothing matches — callers can
 * default to 'autres' or apply their own fallback.
 *
 * Empty/whitespace input always returns null.
 */
export function classifyByName(productName: string | null | undefined): CategoryKey | null {
  if (!productName) return null;
  const lower = productName.toLowerCase();
  for (const entry of FLAT_HINTS) {
    if (matchesHint(lower, entry.hint)) return entry.key;
  }
  return null;
}
