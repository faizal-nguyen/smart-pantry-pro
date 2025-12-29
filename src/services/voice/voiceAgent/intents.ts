/**
 * Intent Recognition System - Smart Pantry Pro
 * Pattern-based intent classification optimized for French spoken language
 */

import { VoiceIntent, EntityType, VoiceEntity, ParsedItem } from './types';

// ============================================
// INTENT PATTERNS
// ============================================

interface IntentPattern {
  intent: VoiceIntent;
  patterns: RegExp[];
  priority: number;  // Higher = checked first
  extractEntities?: (match: RegExpMatchArray, transcript: string) => VoiceEntity[];
}

export const INTENT_PATTERNS: IntentPattern[] = [
  // === CONSUME ITEM ===
  {
    intent: VoiceIntent.CONSUME_ITEM,
    priority: 100,
    patterns: [
      // "J'ai utilise 3 oeufs"
      /j'ai\s+(?:utilis[eé]|pris|consomm[eé])\s+(.+)/i,
      // "On a mange/bu..."
      /(?:on\s+a|j'ai)\s+(?:mang[eé]|bu|utilis[eé])\s+(.+)/i,
      // "Il n'y a plus de lait" / "Plus de beurre"
      /(?:il\s+(?:n')?y\s+a\s+plus|plus)\s+(?:de\s+)?(.+)/i,
      // "J'ai fini le lait"
      /j'ai\s+fini\s+(?:le|la|les|l')?\s*(.+)/i,
      // "Il reste plus de..."
      /(?:il\s+)?(?:reste|manque)\s+plus\s+(?:de\s+)?(.+)/i,
      // "3 oeufs utilises"
      /(\d+)\s*(.+)\s+(?:utilis[eé]s?|pris|consomm[eé]s?)/i,
      // "Retire 2 pommes" (consommation explicite)
      /(?:retire|enl[eè]ve)\s+(.+)/i,
    ],
  },

  // === ADD ITEM ===
  {
    intent: VoiceIntent.ADD_ITEM,
    priority: 95,
    patterns: [
      // "Ajoute 2 yaourts"
      /(?:ajoute|rajoute|met|mets|range)\s+(.+)/i,
      // "J'ai achete du lait"
      /j'ai\s+(?:achet[eé]|ramen[eé]|rapport[eé]|pris)\s+(.+)/i,
      // "Nouveau produit: 3 pommes"
      /(?:nouveau|nouvelle)\s+(.+)/i,
      // "Rentre 5 oranges" (entree stock)
      /(?:rentre|entre|enregistre)\s+(.+)/i,
    ],
  },

  // === CHECK STOCK ===
  {
    intent: VoiceIntent.CHECK_STOCK,
    priority: 90,
    patterns: [
      // "Il me reste combien de riz?"
      /(?:il\s+(?:me\s+)?reste|j'ai)\s+combien\s+(?:de\s+)?(.+)/i,
      // "Combien de lait il reste?"
      /combien\s+(?:de|d')\s*(.+)\s+(?:il\s+)?(?:me\s+)?reste/i,
      // "Quelle quantite de farine?"
      /(?:quelle|quel)\s+(?:quantit[eé]|stock)\s+(?:de\s+)?(.+)/i,
      // "Est-ce que j'ai du parmesan?"
      /(?:est-ce\s+que\s+)?j'ai\s+(?:encore\s+)?(?:du|de la|des|de l')\s+(.+)/i,
      // "J'ai du lait?"
      /j'ai\s+(?:du|de la|des|de l')\s+(.+)\s*\?/i,
    ],
  },

  // === CHECK EXPIRY ===
  {
    intent: VoiceIntent.CHECK_EXPIRY,
    priority: 85,
    patterns: [
      // "Qu'est-ce qui expire bientot?"
      /qu(?:'est-ce\s+qui|i)\s+(?:expire|p[eé]rime)\s*(?:bient[oô]t)?/i,
      // "Produits qui periment"
      /(?:produits?|aliments?)\s+(?:qui\s+)?(?:expire|p[eé]rime)/i,
      // "Dates de peremption"
      /(?:dates?\s+(?:de\s+)?)?p[eé]remption/i,
      // "Qu'est-ce qu'il faut utiliser en premier?"
      /(?:qu'est-ce\s+qu'il\s+faut|que\s+dois-je)\s+(?:utiliser|manger|consommer)\s+(?:en\s+premier|vite|rapidement)/i,
      // "Quoi manger en priorite?"
      /quoi\s+(?:manger|utiliser|consommer)\s+(?:en\s+)?priorit[eé]/i,
    ],
  },

  // === LIST LOW STOCK ===
  {
    intent: VoiceIntent.LIST_LOW_STOCK,
    priority: 80,
    patterns: [
      // "Qu'est-ce qui manque?"
      /qu(?:'est-ce\s+qui|i)\s+manque/i,
      // "Stock bas" / "Stock faible"
      /stock\s+(?:bas|faible)/i,
      // "Qu'est-ce qu'il faut racheter?"
      /(?:qu'est-ce\s+qu'il\s+faut|que\s+dois-je)\s+(?:racheter|r[eé]approvisionner)/i,
      // "Produits a racheter"
      /produits?\s+[aà]\s+(?:racheter|r[eé]approvisionner)/i,
    ],
  },

  // === LIST CATEGORY ===
  {
    intent: VoiceIntent.LIST_CATEGORY,
    priority: 75,
    patterns: [
      // "Qu'est-ce que j'ai en legumes?"
      /qu(?:'est-ce\s+que\s+)?j'ai\s+(?:en|comme)\s+(.+)/i,
      // "Liste des fruits"
      /(?:liste|montre|affiche)\s+(?:les|des|mes)\s+(.+)/i,
      // "Mes produits laitiers"
      /mes\s+(.+)/i,
    ],
  },

  // === SEARCH ITEM ===
  {
    intent: VoiceIntent.SEARCH_ITEM,
    priority: 70,
    patterns: [
      // "Cherche du parmesan"
      /(?:cherche|trouve|recherche)\s+(.+)/i,
      // "Ou est le beurre?"
      /o[uù]\s+(?:est|sont)\s+(?:le|la|les|l')\s*(.+)/i,
    ],
  },

  // === ADD TO SHOPPING ===
  {
    intent: VoiceIntent.ADD_TO_SHOPPING,
    priority: 65,
    patterns: [
      // "Ajoute du lait a la liste de courses"
      /(?:ajoute|met|mets)\s+(.+)\s+(?:[aà]\s+la\s+)?(?:liste|courses)/i,
      // "Liste de courses: lait"
      /(?:liste\s+(?:de\s+)?courses|courses)\s*:\s*(.+)/i,
      // "Acheter du pain" (intention future)
      /(?:acheter|prendre|il\s+faut)\s+(.+)/i,
    ],
  },

  // === CHECK SHOPPING ===
  {
    intent: VoiceIntent.CHECK_SHOPPING,
    priority: 60,
    patterns: [
      // "Qu'est-ce qu'il faut acheter?"
      /qu(?:'est-ce\s+qu'il\s+faut|i\s+faut)\s+acheter/i,
      // "Liste de courses"
      /(?:ma\s+)?liste\s+(?:de\s+)?courses/i,
      // "Quoi acheter"
      /quoi\s+acheter/i,
    ],
  },

  // === UPDATE QUANTITY ===
  {
    intent: VoiceIntent.UPDATE_QUANTITY,
    priority: 55,
    patterns: [
      // "Il reste 5 pommes"
      /il\s+(?:me\s+)?reste\s+(\d+)\s+(.+)/i,
      // "Corrige: 3 oeufs"
      /(?:corrige|correction|modifier)\s*:?\s*(\d+)\s+(.+)/i,
      // "En fait j'ai 2 kilos de riz"
      /(?:en\s+fait|finalement)\s+j'ai\s+(.+)/i,
    ],
  },

  // === CONFIRM ===
  {
    intent: VoiceIntent.CONFIRM,
    priority: 200,  // High priority for conversation control
    patterns: [
      /^(?:oui|ouais|ok|okay|d'accord|c'est\s+(?:bon|[cç]a|correct)|parfait|exact|valide|confirme|vas-y|go)$/i,
      /^(?:1|un|le\s+premier|premier)$/i,  // Selection "1" in disambiguation
    ],
  },

  // === DENY ===
  {
    intent: VoiceIntent.DENY,
    priority: 200,
    patterns: [
      /^(?:non|nan|pas\s+(?:[cç]a|du\s+tout)|annule|stop|arr[eê]te)$/i,
      /^(?:aucun|rien|ni\s+l'un\s+ni\s+l'autre)$/i,
    ],
  },

  // === CORRECT ===
  {
    intent: VoiceIntent.CORRECT,
    priority: 150,
    patterns: [
      // "Non pas 3, j'ai dit 2"
      /(?:non\s+)?(?:pas|c'est\s+pas)\s+(\d+).+(?:j'ai\s+dit|c'(?:est|[eé]tait))\s+(\d+)/i,
      // "Correction: 2 pas 3"
      /(?:correction|corrige).+(\d+)\s+(?:pas|au\s+lieu\s+de)\s+(\d+)/i,
      // "En fait 2" (contextual correction)
      /(?:en\s+fait|pardon|excuse|d[eé]sol[eé]).+(\d+)/i,
      // "Pas X mais Y"
      /pas\s+(.+)\s+mais\s+(.+)/i,
    ],
  },

  // === CANCEL ===
  {
    intent: VoiceIntent.CANCEL,
    priority: 190,
    patterns: [
      /^(?:annule|annuler|stop|arr[eê]te|laisse\s+tomber|oublie)$/i,
      /(?:annule|arr[eê]te)\s+(?:tout|[cç]a|l'action)/i,
    ],
  },

  // === HELP ===
  {
    intent: VoiceIntent.HELP,
    priority: 50,
    patterns: [
      /^(?:aide|help|au\s+secours)$/i,
      /(?:qu'est-ce\s+que\s+tu|que)\s+(?:peux|sais)\s+(?:tu\s+)?faire/i,
      /comment\s+(?:[cç]a\s+)?(?:marche|fonctionne)/i,
      /(?:quelles?\s+)?commandes?/i,
    ],
  },

  // === REPEAT ===
  {
    intent: VoiceIntent.REPEAT,
    priority: 180,
    patterns: [
      /^(?:r[eé]p[eè]te|quoi|hein|pardon|comment)$/i,
      /(?:tu\s+)?(?:peux|peut)\s+r[eé]p[eé]ter/i,
      /j'ai\s+pas\s+(?:compris|entendu)/i,
    ],
  },
];

// ============================================
// FRENCH NORMALIZATION
// ============================================

export const FRENCH_NORMALIZATION = {
  // Contractions
  contractions: new Map<string, string>([
    ["j'ai", "j'ai"],
    ["j ai", "j'ai"],
    ["jai", "j'ai"],
    ["c'est", "c'est"],
    ["c est", "c'est"],
    ["qu'est", "qu'est"],
    ["qu est", "qu'est"],
    ["d'", "de "],
    ["l'", "le "],
    ["n'", "ne "],
  ]),

  // Oral elisions
  elisions: new Map<string, string>([
    ["ya", "il y a"],
    ["y'a", "il y a"],
    ["y a", "il y a"],
    ["chais", "je sais"],
    ["chui", "je suis"],
    ["j'suis", "je suis"],
    ["t'as", "tu as"],
    ["c'que", "ce que"],
  ]),

  // Numbers
  numbers: new Map<string, number>([
    ["zero", 0], ["un", 1], ["une", 1], ["deux", 2],
    ["trois", 3], ["quatre", 4], ["cinq", 5],
    ["six", 6], ["sept", 7], ["huit", 8],
    ["neuf", 9], ["dix", 10], ["onze", 11],
    ["douze", 12], ["treize", 13], ["quatorze", 14],
    ["quinze", 15], ["seize", 16], ["dix-sept", 17],
    ["dix-huit", 18], ["dix-neuf", 19], ["vingt", 20],
    ["trente", 30], ["quarante", 40], ["cinquante", 50],
    ["soixante", 60], ["cent", 100],
    ["demi", 0.5], ["quart", 0.25], ["tiers", 0.33],
  ]),

  // Units normalization
  units: new Map<string, string>([
    ["kilo", "kg"], ["kilos", "kg"], ["kilogramme", "kg"], ["kilogrammes", "kg"],
    ["gramme", "g"], ["grammes", "g"], ["gr", "g"],
    ["litre", "L"], ["litres", "L"],
    ["millilitre", "mL"], ["millilitres", "mL"],
    ["centilitre", "cL"], ["centilitres", "cL"],
    ["demi-litre", "500mL"], ["quart de litre", "250mL"],
    ["pack", "pack"], ["packs", "pack"],
    ["paquet", "paquet"], ["paquets", "paquet"],
    ["boite", "boite"], ["boites", "boite"], ["boite", "boite"], ["boites", "boite"],
    ["bouteille", "bouteille"], ["bouteilles", "bouteille"],
    ["pot", "pot"], ["pots", "pot"],
    ["sachet", "sachet"], ["sachets", "sachet"],
    ["tranche", "tranche"], ["tranches", "tranche"],
    ["morceau", "morceau"], ["morceaux", "morceau"],
    ["douzaine", "12"], ["douzaines", "12"],
    ["piece", "piece"], ["pieces", "piece"],
    ["unite", "unite"], ["unites", "unite"],
  ]),

  // Common food homophones (ASR errors)
  homophones: new Map<string, string>([
    ["du rit", "du riz"],
    ["durit", "du riz"],
    ["des oeu", "des oeufs"],
    ["dezeu", "des oeufs"],
    ["du pin", "du pain"],
    ["du vin", "du vin"],  // Correct
    ["de l'eau", "de l'eau"],  // Correct
    ["du bear", "du beurre"],
    ["du beur", "du beurre"],
  ]),
};

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

export function normalizeTranscript(transcript: string): string {
  let normalized = transcript.toLowerCase().trim();

  // Apply contractions
  for (const [from, to] of FRENCH_NORMALIZATION.contractions) {
    normalized = normalized.replace(new RegExp(from, 'gi'), to);
  }

  // Apply elisions
  for (const [from, to] of FRENCH_NORMALIZATION.elisions) {
    normalized = normalized.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
  }

  // Apply homophones
  for (const [from, to] of FRENCH_NORMALIZATION.homophones) {
    normalized = normalized.replace(new RegExp(from, 'gi'), to);
  }

  // Clean up multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

export function textToNumber(text: string): number | null {
  const normalized = text.toLowerCase().trim();

  // Try direct parse
  const directParse = parseFloat(normalized.replace(',', '.'));
  if (!isNaN(directParse)) {
    return directParse;
  }

  // Try number map
  const mapped = FRENCH_NORMALIZATION.numbers.get(normalized);
  if (mapped !== undefined) {
    return mapped;
  }

  // Try compound numbers (e.g., "vingt-cinq")
  const parts = normalized.split(/[-\s]+/);
  if (parts.length > 1) {
    let total = 0;
    for (const part of parts) {
      const partNum = FRENCH_NORMALIZATION.numbers.get(part);
      if (partNum !== undefined) {
        total += partNum;
      }
    }
    if (total > 0) return total;
  }

  return null;
}

export function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  return FRENCH_NORMALIZATION.units.get(normalized) || normalized;
}

// ============================================
// INTENT CLASSIFICATION
// ============================================

export interface ClassificationResult {
  intent: VoiceIntent;
  confidence: number;
  matchedPattern?: RegExp;
  capturedGroups?: string[];
}

export function classifyIntent(transcript: string): ClassificationResult {
  const normalized = normalizeTranscript(transcript);

  // Sort patterns by priority (descending)
  const sortedPatterns = [...INTENT_PATTERNS].sort((a, b) => b.priority - a.priority);

  for (const patternDef of sortedPatterns) {
    for (const pattern of patternDef.patterns) {
      // Reset regex state
      pattern.lastIndex = 0;
      const match = pattern.exec(normalized);

      if (match) {
        // Calculate confidence based on match quality
        const matchLength = match[0].length;
        const transcriptLength = normalized.length;
        const coverageRatio = matchLength / transcriptLength;

        // Base confidence from pattern priority
        const priorityConfidence = Math.min(patternDef.priority / 200, 1);

        // Combined confidence
        const confidence = Math.min(
          0.5 + (coverageRatio * 0.3) + (priorityConfidence * 0.2),
          0.99
        );

        return {
          intent: patternDef.intent,
          confidence,
          matchedPattern: pattern,
          capturedGroups: match.slice(1),
        };
      }
    }
  }

  // No match found
  return {
    intent: VoiceIntent.UNKNOWN,
    confidence: 0.1,
  };
}

// ============================================
// ENTITY EXTRACTION
// ============================================

const QUANTITY_PATTERN = /(\d+(?:[.,]\d+)?)\s*(kg|g|grammes?|kilos?|litres?|l|ml|millilitres?|cl|centilitres?|paquets?|bo[îi]tes?|bouteilles?|pots?|sachets?|tranches?|morceaux?|pi[eè]ces?|unit[eé]s?|douzaines?)?\s*(?:de\s+|d')?/gi;

const PRODUCT_STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', "d'", "l'",
  'et', 'ou', 'avec', 'sans', 'pour', 'dans', 'sur', 'par',
  'je', "j'ai", 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
  'ai', 'as', 'a', 'avons', 'avez', 'ont',
  'suis', 'es', 'est', 'sommes', 'etes', 'sont',
]);

export function extractEntities(transcript: string, intent: VoiceIntent): VoiceEntity[] {
  const normalized = normalizeTranscript(transcript);
  const entities: VoiceEntity[] = [];

  // Extract quantities with units
  QUANTITY_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = QUANTITY_PATTERN.exec(normalized)) !== null) {
    const quantityValue = parseFloat(match[1].replace(',', '.'));
    const unitRaw = match[2] || '';

    if (!isNaN(quantityValue)) {
      entities.push({
        type: EntityType.QUANTITY,
        value: quantityValue,
        rawValue: match[1],
        confidence: 0.95,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });

      if (unitRaw) {
        entities.push({
          type: EntityType.UNIT,
          value: normalizeUnit(unitRaw),
          rawValue: unitRaw,
          confidence: 0.9,
          startIndex: match.index + match[1].length,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Extract product name (everything after quantity/unit, cleaned)
  const productName = extractProductName(normalized, entities);
  if (productName) {
    entities.push({
      type: EntityType.PRODUCT,
      value: productName,
      rawValue: productName,
      confidence: 0.8,
    });
  }

  return entities;
}

function extractProductName(transcript: string, existingEntities: VoiceEntity[]): string {
  // Remove action words and quantifiers
  const actionWords = [
    'ajoute', 'ajouter', 'rajoute', 'rajouter',
    'retire', 'retirer', 'enleve', 'enlever',
    'utilise', 'utiliser', 'consomme', 'consommer',
    'achete', 'acheter', 'prends', 'prendre',
    'met', 'mets', 'mettre', 'range', 'ranger',
    'fini', 'finir', 'termine', 'terminer',
  ];

  let cleaned = transcript;

  // Remove action words
  for (const word of actionWords) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  }

  // Remove already extracted entities
  for (const entity of existingEntities) {
    if (entity.rawValue) {
      cleaned = cleaned.replace(entity.rawValue, '');
    }
  }

  // Remove stop words
  const words = cleaned.split(/\s+/);
  const productWords = words.filter(word =>
    word.length > 0 && !PRODUCT_STOP_WORDS.has(word.toLowerCase())
  );

  return productWords.join(' ').trim();
}

// ============================================
// PARSED ITEMS EXTRACTION
// ============================================

export function extractParsedItems(transcript: string): ParsedItem[] {
  const normalized = normalizeTranscript(transcript);
  const items: ParsedItem[] = [];

  // Split by separators for multiple items
  const separators = /\s+(?:et|puis|aussi|[eé]galement|plus|,)\s+/i;
  const segments = normalized.split(separators);

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // Extract quantity, unit, and product from each segment
    const entities = extractEntities(trimmed, VoiceIntent.ADD_ITEM);

    const quantityEntity = entities.find(e => e.type === EntityType.QUANTITY);
    const unitEntity = entities.find(e => e.type === EntityType.UNIT);
    const productEntity = entities.find(e => e.type === EntityType.PRODUCT);

    if (productEntity && productEntity.value) {
      items.push({
        product: String(productEntity.value),
        quantity: quantityEntity ? Number(quantityEntity.value) : 1,
        unit: unitEntity ? String(unitEntity.value) : 'unite',
        confidence: Math.min(
          productEntity.confidence,
          quantityEntity?.confidence || 1,
          unitEntity?.confidence || 1
        ),
      });
    }
  }

  return items;
}

// ============================================
// EXPORTS
// ============================================

export {
  INTENT_PATTERNS,
  FRENCH_NORMALIZATION,
};
