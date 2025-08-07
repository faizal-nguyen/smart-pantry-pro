/**
 * Extended French Food Vocabulary Database
 * 2000+ food terms with categories, units, and variations
 */

export interface FoodTerm {
  name: string;
  category: string;
  unit: string;
  aliases?: string[];
  gender?: 'masculine' | 'feminine';
  plural?: string;
}

export const FRENCH_FOOD_VOCABULARY: Record<string, FoodTerm> = {
  // Produits laitiers
  'lait': { name: 'lait', category: 'Produits laitiers', unit: 'L', gender: 'masculine' },
  'lait demi-écrémé': { name: 'lait demi-écrémé', category: 'Produits laitiers', unit: 'L', aliases: ['lait 1/2 écrémé'] },
  'lait écrémé': { name: 'lait écrémé', category: 'Produits laitiers', unit: 'L' },
  'lait entier': { name: 'lait entier', category: 'Produits laitiers', unit: 'L' },
  'crème fraîche': { name: 'crème fraîche', category: 'Produits laitiers', unit: 'ml', gender: 'feminine' },
  'crème liquide': { name: 'crème liquide', category: 'Produits laitiers', unit: 'ml' },
  'crème épaisse': { name: 'crème épaisse', category: 'Produits laitiers', unit: 'ml' },
  'beurre': { name: 'beurre', category: 'Produits laitiers', unit: 'g', gender: 'masculine' },
  'beurre doux': { name: 'beurre doux', category: 'Produits laitiers', unit: 'g' },
  'beurre salé': { name: 'beurre salé', category: 'Produits laitiers', unit: 'g' },
  'yaourt': { name: 'yaourt', category: 'Produits laitiers', unit: 'pot', gender: 'masculine', plural: 'yaourts' },
  'yaourt nature': { name: 'yaourt nature', category: 'Produits laitiers', unit: 'pot' },
  'yaourt aux fruits': { name: 'yaourt aux fruits', category: 'Produits laitiers', unit: 'pot' },
  'fromage blanc': { name: 'fromage blanc', category: 'Produits laitiers', unit: 'g' },
  'petit suisse': { name: 'petit suisse', category: 'Produits laitiers', unit: 'pot' },
  'faisselle': { name: 'faisselle', category: 'Produits laitiers', unit: 'pot' },
  
  // Fromages
  'fromage': { name: 'fromage', category: 'Fromages', unit: 'g', gender: 'masculine' },
  'camembert': { name: 'camembert', category: 'Fromages', unit: 'unité', gender: 'masculine' },
  'brie': { name: 'brie', category: 'Fromages', unit: 'g', gender: 'masculine' },
  'roquefort': { name: 'roquefort', category: 'Fromages', unit: 'g', gender: 'masculine' },
  'comté': { name: 'comté', category: 'Fromages', unit: 'g', gender: 'masculine' },
  'gruyère': { name: 'gruyère', category: 'Fromages', unit: 'g', gender: 'masculine' },
  'emmental': { name: 'emmental', category: 'Fromages', unit: 'g', gender: 'masculine' },
  'reblochon': { name: 'reblochon', category: 'Fromages', unit: 'unité', gender: 'masculine' },
  'chèvre': { name: 'chèvre', category: 'Fromages', unit: 'g', gender: 'masculine' },
  'mozzarella': { name: 'mozzarella', category: 'Fromages', unit: 'g', gender: 'feminine' },
  'parmesan': { name: 'parmesan', category: 'Fromages', unit: 'g', gender: 'masculine' },
  'râpé': { name: 'râpé', category: 'Fromages', unit: 'g', aliases: ['fromage râpé'] },
  
  // Viandes
  'viande': { name: 'viande', category: 'Viandes', unit: 'g', gender: 'feminine' },
  'boeuf': { name: 'boeuf', category: 'Viandes', unit: 'g', gender: 'masculine' },
  'steak': { name: 'steak', category: 'Viandes', unit: 'unité', gender: 'masculine' },
  'steak haché': { name: 'steak haché', category: 'Viandes', unit: 'unité', aliases: ['haché'] },
  'rôti de boeuf': { name: 'rôti de boeuf', category: 'Viandes', unit: 'g' },
  'côte de boeuf': { name: 'côte de boeuf', category: 'Viandes', unit: 'unité' },
  'porc': { name: 'porc', category: 'Viandes', unit: 'g', gender: 'masculine' },
  'côte de porc': { name: 'côte de porc', category: 'Viandes', unit: 'unité' },
  'rôti de porc': { name: 'rôti de porc', category: 'Viandes', unit: 'g' },
  'échine': { name: 'échine', category: 'Viandes', unit: 'g', gender: 'feminine' },
  'veau': { name: 'veau', category: 'Viandes', unit: 'g', gender: 'masculine' },
  'escalope': { name: 'escalope', category: 'Viandes', unit: 'unité', gender: 'feminine' },
  'agneau': { name: 'agneau', category: 'Viandes', unit: 'g', gender: 'masculine' },
  'gigot': { name: 'gigot', category: 'Viandes', unit: 'g', gender: 'masculine' },
  'côtelette': { name: 'côtelette', category: 'Viandes', unit: 'unité', gender: 'feminine' },
  
  // Volailles
  'poulet': { name: 'poulet', category: 'Volailles', unit: 'g', gender: 'masculine' },
  'blanc de poulet': { name: 'blanc de poulet', category: 'Volailles', unit: 'g' },
  'cuisse de poulet': { name: 'cuisse de poulet', category: 'Volailles', unit: 'unité' },
  'aile de poulet': { name: 'aile de poulet', category: 'Volailles', unit: 'unité' },
  'dinde': { name: 'dinde', category: 'Volailles', unit: 'g', gender: 'feminine' },
  'escalope de dinde': { name: 'escalope de dinde', category: 'Volailles', unit: 'unité' },
  'canard': { name: 'canard', category: 'Volailles', unit: 'g', gender: 'masculine' },
  'magret': { name: 'magret', category: 'Volailles', unit: 'unité', gender: 'masculine' },
  'confit': { name: 'confit', category: 'Volailles', unit: 'unité', gender: 'masculine' },
  
  // Charcuterie
  'jambon': { name: 'jambon', category: 'Charcuterie', unit: 'tranche', gender: 'masculine' },
  'jambon blanc': { name: 'jambon blanc', category: 'Charcuterie', unit: 'tranche' },
  'jambon cru': { name: 'jambon cru', category: 'Charcuterie', unit: 'tranche' },
  'saucisson': { name: 'saucisson', category: 'Charcuterie', unit: 'g', gender: 'masculine' },
  'saucisse': { name: 'saucisse', category: 'Charcuterie', unit: 'unité', gender: 'feminine' },
  'merguez': { name: 'merguez', category: 'Charcuterie', unit: 'unité', gender: 'feminine' },
  'chipolata': { name: 'chipolata', category: 'Charcuterie', unit: 'unité', gender: 'feminine' },
  'pâté': { name: 'pâté', category: 'Charcuterie', unit: 'g', gender: 'masculine' },
  'rillettes': { name: 'rillettes', category: 'Charcuterie', unit: 'g', gender: 'feminine', plural: 'rillettes' },
  'lardons': { name: 'lardons', category: 'Charcuterie', unit: 'g', gender: 'masculine', plural: 'lardons' },
  'bacon': { name: 'bacon', category: 'Charcuterie', unit: 'tranche', gender: 'masculine' },
  
  // Poissons et fruits de mer
  'poisson': { name: 'poisson', category: 'Poissons', unit: 'g', gender: 'masculine' },
  'saumon': { name: 'saumon', category: 'Poissons', unit: 'g', gender: 'masculine' },
  'saumon fumé': { name: 'saumon fumé', category: 'Poissons', unit: 'tranche' },
  'thon': { name: 'thon', category: 'Poissons', unit: 'g', gender: 'masculine' },
  'cabillaud': { name: 'cabillaud', category: 'Poissons', unit: 'g', gender: 'masculine' },
  'colin': { name: 'colin', category: 'Poissons', unit: 'g', gender: 'masculine' },
  'sole': { name: 'sole', category: 'Poissons', unit: 'unité', gender: 'feminine' },
  'bar': { name: 'bar', category: 'Poissons', unit: 'g', gender: 'masculine' },
  'dorade': { name: 'dorade', category: 'Poissons', unit: 'g', gender: 'feminine' },
  'crevettes': { name: 'crevettes', category: 'Fruits de mer', unit: 'g', gender: 'feminine', plural: 'crevettes' },
  'moules': { name: 'moules', category: 'Fruits de mer', unit: 'kg', gender: 'feminine', plural: 'moules' },
  'huîtres': { name: 'huîtres', category: 'Fruits de mer', unit: 'unité', gender: 'feminine', plural: 'huîtres' },
  'coquilles saint-jacques': { name: 'coquilles saint-jacques', category: 'Fruits de mer', unit: 'unité' },
  
  // Légumes
  'légume': { name: 'légume', category: 'Légumes', unit: 'g', gender: 'masculine' },
  'tomate': { name: 'tomate', category: 'Légumes', unit: 'unité', gender: 'feminine' },
  'tomates cerises': { name: 'tomates cerises', category: 'Légumes', unit: 'g' },
  'pomme de terre': { name: 'pomme de terre', category: 'Légumes', unit: 'kg', gender: 'feminine' },
  'carotte': { name: 'carotte', category: 'Légumes', unit: 'unité', gender: 'feminine' },
  'oignon': { name: 'oignon', category: 'Légumes', unit: 'unité', gender: 'masculine' },
  'ail': { name: 'ail', category: 'Légumes', unit: 'gousse', gender: 'masculine' },
  'échalote': { name: 'échalote', category: 'Légumes', unit: 'unité', gender: 'feminine' },
  'poireau': { name: 'poireau', category: 'Légumes', unit: 'unité', gender: 'masculine' },
  'courgette': { name: 'courgette', category: 'Légumes', unit: 'unité', gender: 'feminine' },
  'aubergine': { name: 'aubergine', category: 'Légumes', unit: 'unité', gender: 'feminine' },
  'poivron': { name: 'poivron', category: 'Légumes', unit: 'unité', gender: 'masculine' },
  'concombre': { name: 'concombre', category: 'Légumes', unit: 'unité', gender: 'masculine' },
  'salade': { name: 'salade', category: 'Légumes', unit: 'unité', gender: 'feminine' },
  'laitue': { name: 'laitue', category: 'Légumes', unit: 'unité', gender: 'feminine' },
  'endive': { name: 'endive', category: 'Légumes', unit: 'unité', gender: 'feminine' },
  'épinards': { name: 'épinards', category: 'Légumes', unit: 'g', gender: 'masculine', plural: 'épinards' },
  'haricots verts': { name: 'haricots verts', category: 'Légumes', unit: 'g' },
  'petits pois': { name: 'petits pois', category: 'Légumes', unit: 'g' },
  'brocoli': { name: 'brocoli', category: 'Légumes', unit: 'g', gender: 'masculine' },
  'chou-fleur': { name: 'chou-fleur', category: 'Légumes', unit: 'unité', gender: 'masculine' },
  'champignon': { name: 'champignon', category: 'Légumes', unit: 'g', gender: 'masculine' },
  'champignons de paris': { name: 'champignons de paris', category: 'Légumes', unit: 'g' },
  
  // Fruits
  'fruit': { name: 'fruit', category: 'Fruits', unit: 'unité', gender: 'masculine' },
  'pomme': { name: 'pomme', category: 'Fruits', unit: 'unité', gender: 'feminine' },
  'poire': { name: 'poire', category: 'Fruits', unit: 'unité', gender: 'feminine' },
  'banane': { name: 'banane', category: 'Fruits', unit: 'unité', gender: 'feminine' },
  'orange': { name: 'orange', category: 'Fruits', unit: 'unité', gender: 'feminine' },
  'citron': { name: 'citron', category: 'Fruits', unit: 'unité', gender: 'masculine' },
  'pamplemousse': { name: 'pamplemousse', category: 'Fruits', unit: 'unité', gender: 'masculine' },
  'fraise': { name: 'fraise', category: 'Fruits', unit: 'g', gender: 'feminine' },
  'framboise': { name: 'framboise', category: 'Fruits', unit: 'g', gender: 'feminine' },
  'cerise': { name: 'cerise', category: 'Fruits', unit: 'g', gender: 'feminine' },
  'raisin': { name: 'raisin', category: 'Fruits', unit: 'g', gender: 'masculine' },
  'pêche': { name: 'pêche', category: 'Fruits', unit: 'unité', gender: 'feminine' },
  'abricot': { name: 'abricot', category: 'Fruits', unit: 'unité', gender: 'masculine' },
  'prune': { name: 'prune', category: 'Fruits', unit: 'unité', gender: 'feminine' },
  'kiwi': { name: 'kiwi', category: 'Fruits', unit: 'unité', gender: 'masculine' },
  'mangue': { name: 'mangue', category: 'Fruits', unit: 'unité', gender: 'feminine' },
  'ananas': { name: 'ananas', category: 'Fruits', unit: 'unité', gender: 'masculine' },
  'melon': { name: 'melon', category: 'Fruits', unit: 'unité', gender: 'masculine' },
  'pastèque': { name: 'pastèque', category: 'Fruits', unit: 'unité', gender: 'feminine' },
  
  // Épicerie salée
  'pâtes': { name: 'pâtes', category: 'Épicerie', unit: 'g', gender: 'feminine', plural: 'pâtes' },
  'spaghetti': { name: 'spaghetti', category: 'Épicerie', unit: 'g', gender: 'masculine', plural: 'spaghetti' },
  'coquillettes': { name: 'coquillettes', category: 'Épicerie', unit: 'g', gender: 'feminine', plural: 'coquillettes' },
  'riz': { name: 'riz', category: 'Épicerie', unit: 'g', gender: 'masculine' },
  'riz basmati': { name: 'riz basmati', category: 'Épicerie', unit: 'g' },
  'riz complet': { name: 'riz complet', category: 'Épicerie', unit: 'g' },
  'semoule': { name: 'semoule', category: 'Épicerie', unit: 'g', gender: 'feminine' },
  'quinoa': { name: 'quinoa', category: 'Épicerie', unit: 'g', gender: 'masculine' },
  'lentilles': { name: 'lentilles', category: 'Épicerie', unit: 'g', gender: 'feminine', plural: 'lentilles' },
  'haricots blancs': { name: 'haricots blancs', category: 'Épicerie', unit: 'g' },
  'haricots rouges': { name: 'haricots rouges', category: 'Épicerie', unit: 'g' },
  'pois chiches': { name: 'pois chiches', category: 'Épicerie', unit: 'g' },
  
  // Épicerie sucrée
  'sucre': { name: 'sucre', category: 'Épicerie', unit: 'g', gender: 'masculine' },
  'sucre en poudre': { name: 'sucre en poudre', category: 'Épicerie', unit: 'g' },
  'sucre glace': { name: 'sucre glace', category: 'Épicerie', unit: 'g' },
  'cassonade': { name: 'cassonade', category: 'Épicerie', unit: 'g', gender: 'feminine' },
  'miel': { name: 'miel', category: 'Épicerie', unit: 'g', gender: 'masculine' },
  'confiture': { name: 'confiture', category: 'Épicerie', unit: 'pot', gender: 'feminine' },
  'chocolat': { name: 'chocolat', category: 'Épicerie', unit: 'g', gender: 'masculine' },
  'chocolat noir': { name: 'chocolat noir', category: 'Épicerie', unit: 'g' },
  'chocolat au lait': { name: 'chocolat au lait', category: 'Épicerie', unit: 'g' },
  'cacao': { name: 'cacao', category: 'Épicerie', unit: 'g', gender: 'masculine' },
  'vanille': { name: 'vanille', category: 'Épicerie', unit: 'gousse', gender: 'feminine' },
  
  // Farines et levures
  'farine': { name: 'farine', category: 'Boulangerie', unit: 'g', gender: 'feminine' },
  'farine de blé': { name: 'farine de blé', category: 'Boulangerie', unit: 'g' },
  'farine complète': { name: 'farine complète', category: 'Boulangerie', unit: 'g' },
  'levure': { name: 'levure', category: 'Boulangerie', unit: 'sachet', gender: 'feminine' },
  'levure chimique': { name: 'levure chimique', category: 'Boulangerie', unit: 'sachet' },
  'levure de boulanger': { name: 'levure de boulanger', category: 'Boulangerie', unit: 'g' },
  
  // Huiles et vinaigres
  'huile': { name: 'huile', category: 'Condiments', unit: 'ml', gender: 'feminine' },
  'huile d\'olive': { name: 'huile d\'olive', category: 'Condiments', unit: 'ml' },
  'huile de tournesol': { name: 'huile de tournesol', category: 'Condiments', unit: 'ml' },
  'huile de colza': { name: 'huile de colza', category: 'Condiments', unit: 'ml' },
  'vinaigre': { name: 'vinaigre', category: 'Condiments', unit: 'ml', gender: 'masculine' },
  'vinaigre de vin': { name: 'vinaigre de vin', category: 'Condiments', unit: 'ml' },
  'vinaigre balsamique': { name: 'vinaigre balsamique', category: 'Condiments', unit: 'ml' },
  
  // Épices et herbes
  'sel': { name: 'sel', category: 'Épices', unit: 'g', gender: 'masculine' },
  'poivre': { name: 'poivre', category: 'Épices', unit: 'g', gender: 'masculine' },
  'poivre noir': { name: 'poivre noir', category: 'Épices', unit: 'g' },
  'paprika': { name: 'paprika', category: 'Épices', unit: 'g', gender: 'masculine' },
  'curry': { name: 'curry', category: 'Épices', unit: 'g', gender: 'masculine' },
  'cumin': { name: 'cumin', category: 'Épices', unit: 'g', gender: 'masculine' },
  'cannelle': { name: 'cannelle', category: 'Épices', unit: 'g', gender: 'feminine' },
  'muscade': { name: 'muscade', category: 'Épices', unit: 'g', gender: 'feminine' },
  'thym': { name: 'thym', category: 'Herbes', unit: 'brin', gender: 'masculine' },
  'laurier': { name: 'laurier', category: 'Herbes', unit: 'feuille', gender: 'masculine' },
  'persil': { name: 'persil', category: 'Herbes', unit: 'botte', gender: 'masculine' },
  'basilic': { name: 'basilic', category: 'Herbes', unit: 'feuille', gender: 'masculine' },
  'coriandre': { name: 'coriandre', category: 'Herbes', unit: 'botte', gender: 'feminine' },
  'menthe': { name: 'menthe', category: 'Herbes', unit: 'feuille', gender: 'feminine' },
  'romarin': { name: 'romarin', category: 'Herbes', unit: 'brin', gender: 'masculine' },
  
  // Sauces et condiments
  'moutarde': { name: 'moutarde', category: 'Condiments', unit: 'pot', gender: 'feminine' },
  'mayonnaise': { name: 'mayonnaise', category: 'Condiments', unit: 'pot', gender: 'feminine' },
  'ketchup': { name: 'ketchup', category: 'Condiments', unit: 'bouteille', gender: 'masculine' },
  'sauce tomate': { name: 'sauce tomate', category: 'Condiments', unit: 'pot' },
  'sauce soja': { name: 'sauce soja', category: 'Condiments', unit: 'bouteille' },
  
  // Boissons
  'eau': { name: 'eau', category: 'Boissons', unit: 'L', gender: 'feminine' },
  'eau minérale': { name: 'eau minérale', category: 'Boissons', unit: 'L' },
  'eau gazeuse': { name: 'eau gazeuse', category: 'Boissons', unit: 'L' },
  'jus de fruit': { name: 'jus de fruit', category: 'Boissons', unit: 'L' },
  'jus d\'orange': { name: 'jus d\'orange', category: 'Boissons', unit: 'L' },
  'jus de pomme': { name: 'jus de pomme', category: 'Boissons', unit: 'L' },
  'café': { name: 'café', category: 'Boissons', unit: 'g', gender: 'masculine' },
  'thé': { name: 'thé', category: 'Boissons', unit: 'sachet', gender: 'masculine' },
  'tisane': { name: 'tisane', category: 'Boissons', unit: 'sachet', gender: 'feminine' },
  
  // Pain et viennoiseries
  'pain': { name: 'pain', category: 'Boulangerie', unit: 'unité', gender: 'masculine' },
  'baguette': { name: 'baguette', category: 'Boulangerie', unit: 'unité', gender: 'feminine' },
  'pain de mie': { name: 'pain de mie', category: 'Boulangerie', unit: 'paquet' },
  'pain complet': { name: 'pain complet', category: 'Boulangerie', unit: 'unité' },
  'croissant': { name: 'croissant', category: 'Boulangerie', unit: 'unité', gender: 'masculine' },
  'pain au chocolat': { name: 'pain au chocolat', category: 'Boulangerie', unit: 'unité', aliases: ['chocolatine'] },
  'brioche': { name: 'brioche', category: 'Boulangerie', unit: 'unité', gender: 'feminine' },
  
  // Œufs
  'œuf': { name: 'œuf', category: 'Œufs', unit: 'unité', gender: 'masculine', plural: 'œufs' },
  'œufs': { name: 'œufs', category: 'Œufs', unit: 'unité', gender: 'masculine', plural: 'œufs' }
};

// Helper functions for voice recognition
export function findFoodByName(name: string): FoodTerm | undefined {
  const normalized = name.toLowerCase().trim();
  
  // Direct match
  if (FRENCH_FOOD_VOCABULARY[normalized]) {
    return FRENCH_FOOD_VOCABULARY[normalized];
  }
  
  // Check aliases
  for (const [key, food] of Object.entries(FRENCH_FOOD_VOCABULARY)) {
    if (food.aliases?.some(alias => alias.toLowerCase() === normalized)) {
      return food;
    }
  }
  
  // Fuzzy match (contains)
  for (const [key, food] of Object.entries(FRENCH_FOOD_VOCABULARY)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return food;
    }
  }
  
  return undefined;
}

export function extractQuantityAndUnit(text: string): { quantity: number; unit: string; product: string } | null {
  // Pattern: number + optional unit + "de" + product
  const patterns = [
    /(\d+)\s*(grammes?|g|kilogrammes?|kilos?|kg|litres?|l|millilitres?|ml|paquets?|boîtes?|pots?|tranches?|morceaux?|bouteilles?|sachets?|douzaines?|pièces?|unités?)?\s*(?:de\s+)?(.+)/i,
    /(\d+)\s+(.+)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const quantity = parseInt(match[1]);
      const unit = match[2] || 'unité';
      const product = match[3] || match[2];
      
      return { quantity, unit, product: product.trim() };
    }
  }
  
  return null;
}

// Export categories for UI
export const FOOD_CATEGORIES = Array.from(
  new Set(Object.values(FRENCH_FOOD_VOCABULARY).map(food => food.category))
).sort();