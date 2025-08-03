export interface ParsedProduct {
  quantity: number;
  unit: string;
  name: string;
  confidence: number;
}

interface ParsingResult {
  success: boolean;
  products: ParsedProduct[];
  originalText: string;
}

// Dictionnaire de conversion texte vers nombre
const textToNumber: Record<string, number> = {
  'zéro': 0, 'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4,
  'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
  'onze': 11, 'douze': 12, 'treize': 13, 'quatorze': 14, 'quinze': 15,
  'seize': 16, 'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19, 'vingt': 20
};

// Unités reconnues avec leurs variations
const units: Record<string, string> = {
  // Poids
  'kg': 'kg', 'kilo': 'kg', 'kilos': 'kg', 'kilogramme': 'kg', 'kilogrammes': 'kg',
  'g': 'g', 'gramme': 'g', 'grammes': 'g',
  
  // Volume
  'l': 'L', 'litre': 'L', 'litres': 'L',
  'ml': 'ml', 'millilitre': 'ml', 'millilitres': 'ml',
  'cl': 'cl', 'centilitre': 'cl', 'centilitres': 'cl',
  
  // Unités
  'unité': 'unité(s)', 'unités': 'unité(s)', 'pièce': 'unité(s)', 'pièces': 'unité(s)',
  'paquet': 'paquet(s)', 'paquets': 'paquet(s)',
  'boîte': 'boîte(s)', 'boîtes': 'boîte(s)', 'boite': 'boîte(s)', 'boites': 'boîte(s)',
  'bouteille': 'bouteille(s)', 'bouteilles': 'bouteille(s)',
  'pot': 'pot(s)', 'pots': 'pot(s)',
  'sachet': 'sachet(s)', 'sachets': 'sachet(s)'
};

// Mots d'action pour identifier l'intention
const actionWords = [
  'ajouter', 'ajouté', 'acheté', 'acheter', 'pris', 'prendre', 
  'mettre', 'mis', 'ranger', 'rangé', 'stocker', 'stocké'
];

// Mots de liaison à ignorer
const stopWords = [
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd\'', 'je', 'j\'',
  'ai', 'a', 'à', 'avec', 'pour', 'dans', 'sur', 'par', 'et', 'ou'
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/'/g, "'")
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function convertTextToNumber(text: string): number | null {
  // D'abord essayer de parser comme nombre
  const num = parseFloat(text.replace(',', '.'));
  if (!isNaN(num)) return num;
  
  // Ensuite chercher dans le dictionnaire
  return textToNumber[text] || null;
}

function extractQuantityAndUnit(tokens: string[], startIndex: number): {
  quantity: number;
  unit: string;
  consumedTokens: number;
} | null {
  let quantity = 1;
  let unit = 'unité(s)';
  let consumedTokens = 0;

  // Chercher la quantité
  if (startIndex < tokens.length) {
    const quantityNum = convertTextToNumber(tokens[startIndex]);
    if (quantityNum !== null) {
      quantity = quantityNum;
      consumedTokens++;
    }
  }

  // Chercher l'unité
  if (startIndex + consumedTokens < tokens.length) {
    const potentialUnit = tokens[startIndex + consumedTokens];
    const normalizedUnit = units[potentialUnit];
    if (normalizedUnit) {
      unit = normalizedUnit;
      consumedTokens++;
    }
  }

  return { quantity, unit, consumedTokens };
}

function extractProductName(tokens: string[], startIndex: number): string {
  // Prendre tous les tokens restants qui ne sont pas des mots vides
  const nameTokens = tokens
    .slice(startIndex)
    .filter(token => !stopWords.includes(token) && !actionWords.includes(token))
    .slice(0, 4); // Limiter à 4 mots max pour le nom

  return nameTokens.join(' ').trim();
}

function parseProductFromTokens(tokens: string[]): ParsedProduct | null {
  // Chercher un mot d'action
  let actionIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (actionWords.includes(tokens[i])) {
      actionIndex = i;
      break;
    }
  }

  // Commencer après le mot d'action, ou au début si pas trouvé
  let startIndex = actionIndex >= 0 ? actionIndex + 1 : 0;
  
  // Ignorer les mots vides au début
  while (startIndex < tokens.length && stopWords.includes(tokens[startIndex])) {
    startIndex++;
  }

  if (startIndex >= tokens.length) return null;

  // Extraire quantité et unité
  const quantityUnit = extractQuantityAndUnit(tokens, startIndex);
  if (!quantityUnit) return null;

  // Extraire le nom du produit
  const nameStartIndex = startIndex + quantityUnit.consumedTokens;
  const productName = extractProductName(tokens, nameStartIndex);

  if (!productName) return null;

  return {
    quantity: quantityUnit.quantity,
    unit: quantityUnit.unit,
    name: productName,
    confidence: 0.8 // Score de confiance basique
  };
}

export function parseVoiceInput(text: string): ParsingResult {
  const normalizedText = normalizeText(text);
  const tokens = normalizedText.split(' ').filter(token => token.length > 0);

  // Patterns pour diviser le texte en plusieurs produits
  const separators = ['et', 'puis', 'aussi', 'également', 'plus', 'virgule'];
  const products: ParsedProduct[] = [];

  // Diviser le texte par les séparateurs
  let currentTokens: string[] = [];
  
  for (const token of tokens) {
    if (separators.includes(token)) {
      if (currentTokens.length > 0) {
        const product = parseProductFromTokens(currentTokens);
        if (product) products.push(product);
        currentTokens = [];
      }
    } else {
      currentTokens.push(token);
    }
  }

  // Traiter les derniers tokens
  if (currentTokens.length > 0) {
    const product = parseProductFromTokens(currentTokens);
    if (product) products.push(product);
  }

  return {
    success: products.length > 0,
    products,
    originalText: text
  };
}

// Exemples de phrases supportées :
export const examplePhrases = [
  "Ajouter 2 pommes",
  "J'ai acheté 1 litre de lait",
  "Mettre 500 grammes de farine",
  "3 paquets de pâtes et 2 boîtes de tomates",
  "Une bouteille d'huile",
  "Deux kilos de pommes de terre",
  "Ranger 6 yaourts nature"
];