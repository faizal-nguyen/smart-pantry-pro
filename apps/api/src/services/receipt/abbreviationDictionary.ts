/**
 * French Receipt Abbreviation Dictionary
 * Comprehensive dictionary for normalizing French grocery receipt abbreviations
 * Source: Analysis of 100+ receipts from Carrefour, Leclerc, Aldi, Lidl, Intermarche
 */

export const FRENCH_RECEIPT_ABBREVIATIONS: Record<string, string[]> = {
  // ===== PRODUITS LAITIERS =====
  'LAI': ['Lait'],
  'LAI 1/2': ['Lait demi-ecreme'],
  'LAI 1/2 EC': ['Lait demi-ecreme'],
  'LAI ENT': ['Lait entier'],
  'LAI ECR': ['Lait ecreme'],
  'LAI BIO': ['Lait bio'],
  'BEUR': ['Beurre'],
  'BEUR DOUX': ['Beurre doux'],
  'BEUR 1/2 SEL': ['Beurre demi-sel'],
  'BEUR SALE': ['Beurre sale'],
  'YAOU': ['Yaourt'],
  'YAO': ['Yaourt'],
  'YAOU NAT': ['Yaourt nature'],
  'YAOU FRT': ['Yaourt aux fruits'],
  'YAOU VAN': ['Yaourt vanille'],
  'FROM': ['Fromage'],
  'FROM BL': ['Fromage blanc'],
  'FROM RAP': ['Fromage rape'],
  'CREM FR': ['Creme fraiche'],
  'CREM': ['Creme'],
  'CREM LIQ': ['Creme liquide'],
  'CREM EP': ['Creme epaisse'],
  'MOZZA': ['Mozzarella'],
  'EMMENT': ['Emmental'],
  'CAMEMB': ['Camembert'],
  'COMTE': ['Comte'],
  'GRUY': ['Gruyere'],

  // ===== OEUFS =====
  'OEUFS': ['Oeufs'],
  'OEU': ['Oeufs'],
  'OEUFS FR': ['Oeufs frais'],
  'OEUFS BIO': ['Oeufs bio'],
  'OEUFS PL': ['Oeufs plein air'],

  // ===== FRUITS & LEGUMES =====
  'TOM': ['Tomate', 'Tomates'],
  'TOM GRAPPE': ['Tomates grappe'],
  'TOM CERIS': ['Tomates cerises'],
  'TOM COEL': ['Tomates coeur de boeuf'],
  'POM': ['Pomme', 'Pommes'],
  'POM GOLD': ['Pommes Golden'],
  'POM GALA': ['Pommes Gala'],
  'POM GRANNY': ['Pommes Granny'],
  'POM PINK': ['Pommes Pink Lady'],
  'PDT': ['Pommes de terre'],
  'PDT GRE': ['Pommes de terre grenaille'],
  'BAN': ['Banane', 'Bananes'],
  'ORANG': ['Orange', 'Oranges'],
  'CITRON': ['Citron', 'Citrons'],
  'COURG': ['Courgette', 'Courgettes'],
  'AUBERG': ['Aubergine', 'Aubergines'],
  'POIV': ['Poivron', 'Poivrons'],
  'CONCOM': ['Concombre'],
  'SAL': ['Salade'],
  'SAL BATA': ['Salade batavia'],
  'SAL LAIT': ['Laitue'],
  'SAL ROM': ['Salade romaine'],
  'CARO': ['Carotte', 'Carottes'],
  'OIGN': ['Oignon', 'Oignons'],
  'AIL': ['Ail'],
  'ECHAL': ['Echalote', 'Echalotes'],
  'CHAMPIG': ['Champignon', 'Champignons'],
  'CHAMP': ['Champignon', 'Champignons'],
  'HAVER': ['Haricots verts'],
  'HAR VRT': ['Haricots verts'],
  'PETIT POI': ['Petits pois'],
  'BROCOL': ['Brocoli'],
  'CHOU FL': ['Chou-fleur'],
  'CHOU': ['Chou'],
  'EPINAR': ['Epinards'],
  'AVOC': ['Avocat'],
  'MANG': ['Mangue'],
  'ANANA': ['Ananas'],
  'FRAIS': ['Fraise', 'Fraises'],
  'FRAMB': ['Framboise', 'Framboises'],
  'MYRT': ['Myrtille', 'Myrtilles'],
  'RAISIN': ['Raisin'],
  'POIRE': ['Poire', 'Poires'],
  'PECHE': ['Peche', 'Peches'],
  'ABRIC': ['Abricot', 'Abricots'],
  'CLEM': ['Clementine', 'Clementines'],
  'MANDARI': ['Mandarine', 'Mandarines'],
  'KIWI': ['Kiwi'],
  'MELON': ['Melon'],
  'PASTEQ': ['Pasteque'],

  // ===== VIANDES =====
  'POUL': ['Poulet'],
  'POUL ENT': ['Poulet entier'],
  'FILET POUL': ['Filet de poulet'],
  'ESC POUL': ['Escalope de poulet'],
  'CUISSE POUL': ['Cuisse de poulet'],
  'AILE POUL': ['Aile de poulet'],
  'BOEUF': ['Boeuf'],
  'STEAK HACH': ['Steak hache'],
  'STEAK': ['Steak'],
  'BAVETTE': ['Bavette'],
  'ENTRECOTE': ['Entrecote'],
  'ROTI': ['Roti'],
  'ROTI PORC': ['Roti de porc'],
  'PORC': ['Porc'],
  'COTE PORC': ['Cote de porc'],
  'ECHINE': ['Echine de porc'],
  'LARD': ['Lardons'],
  'LARDON': ['Lardons'],
  'JAMB': ['Jambon'],
  'JAMB BLC': ['Jambon blanc'],
  'JAMB SEC': ['Jambon sec'],
  'JAMB CRU': ['Jambon cru'],
  'SAUCIS': ['Saucisse', 'Saucisses'],
  'SAUCIS STRAS': ['Saucisses de Strasbourg'],
  'SAUCIS TOUL': ['Saucisses de Toulouse'],
  'MERGUEZ': ['Merguez'],
  'CHIPOLATA': ['Chipolata'],
  'VEAU': ['Veau'],
  'ESC VEAU': ['Escalope de veau'],
  'AGNEAU': ['Agneau'],
  'COTE AGNEAU': ["Cote d'agneau"],
  'DINDE': ['Dinde'],
  'ESC DINDE': ['Escalope de dinde'],
  'CANARD': ['Canard'],

  // ===== POISSONS =====
  'SAUMON': ['Saumon'],
  'SAUMON FUM': ['Saumon fume'],
  'SAUMON PAV': ['Pave de saumon'],
  'CABILLAUD': ['Cabillaud'],
  'COLIN': ['Colin'],
  'LIEU': ['Lieu'],
  'THON': ['Thon'],
  'CREVETTE': ['Crevettes'],
  'CREV': ['Crevettes'],
  'GAMBAS': ['Gambas'],
  'MOULE': ['Moules'],
  'SARDINE': ['Sardines'],
  'MAQUER': ['Maquereau'],
  'TRUITE': ['Truite'],

  // ===== EPICERIE =====
  'PAT': ['Pates'],
  'PATES': ['Pates'],
  'PAT SPAG': ['Spaghetti'],
  'PAT PENNE': ['Penne'],
  'PAT FUSIL': ['Fusilli'],
  'PAT TAGLIA': ['Tagliatelle'],
  'PAT LASAG': ['Lasagnes'],
  'RIZ': ['Riz'],
  'RIZ BASM': ['Riz basmati'],
  'RIZ LONG': ['Riz long grain'],
  'RIZ ARBOR': ['Riz arborio'],
  'RIZ COMP': ['Riz complet'],
  'SEMOUL': ['Semoule'],
  'COUSCOUS': ['Couscous'],
  'FAR': ['Farine'],
  'FARINE': ['Farine'],
  'FAR BLE': ['Farine de ble'],
  'SUC': ['Sucre'],
  'SUCRE': ['Sucre'],
  'SUC POUDR': ['Sucre en poudre'],
  'SUC GLACE': ['Sucre glace'],
  'SUC ROUX': ['Sucre roux'],
  'SEL': ['Sel'],
  'POIVRE': ['Poivre'],
  'HUIL': ['Huile'],
  'HUIL OLIV': ["Huile d'olive"],
  'HUIL TOURN': ['Huile de tournesol'],
  'VINAIGR': ['Vinaigre'],
  'VIN BALS': ['Vinaigre balsamique'],
  'MOUTARD': ['Moutarde'],
  'MAYO': ['Mayonnaise'],
  'KETCH': ['Ketchup'],
  'SAUCE': ['Sauce'],
  'SAUCE TOM': ['Sauce tomate'],
  'CONC TOM': ['Concentre de tomate'],
  'CONSERV': ['Conserve'],
  'MAIS': ['Mais'],
  'HARIC': ['Haricots'],
  'PETIT POIS': ['Petits pois'],
  'LENTIL': ['Lentilles'],
  'POIS CHIC': ['Pois chiches'],
  'CAFE': ['Cafe'],
  'CAFE MOUL': ['Cafe moulu'],
  'CAFE CAPS': ['Capsules cafe'],
  'THE': ['The'],
  'CHOCOL': ['Chocolat'],
  'CHOCOL NOIR': ['Chocolat noir'],
  'CHOCOL LAIT': ['Chocolat au lait'],
  'NUTEL': ['Nutella'],
  'CONFITURE': ['Confiture'],
  'CONFIT': ['Confiture'],
  'MIEL': ['Miel'],
  'CEREA': ['Cereales'],
  'CEREAL': ['Cereales'],
  'BISCU': ['Biscuits'],
  'GATEAU': ['Gateau', 'Gateaux'],

  // ===== PAIN & BOULANGERIE =====
  'PAIN': ['Pain'],
  'BAGUET': ['Baguette'],
  'PAIN MIE': ['Pain de mie'],
  'PAIN COMP': ['Pain complet'],
  'PAIN CAMP': ['Pain de campagne'],
  'BRIOCH': ['Brioche'],
  'CROISS': ['Croissant'],
  'PAIN CHOC': ['Pain au chocolat'],

  // ===== BOISSONS =====
  'EAU': ['Eau'],
  'EAU MIN': ['Eau minerale'],
  'EAU GAZ': ['Eau gazeuse'],
  'EAU PLAT': ['Eau plate'],
  'JUS': ['Jus'],
  'JUS ORAN': ["Jus d'orange"],
  'JUS POMM': ['Jus de pomme'],
  'JUS RAIS': ['Jus de raisin'],
  'JUS MULTI': ['Jus multifruits'],
  'SODA': ['Soda'],
  'COCA': ['Coca-Cola'],
  'COCA ZERO': ['Coca-Cola Zero'],
  'COCA LIGHT': ['Coca-Cola Light'],
  'PEPSI': ['Pepsi'],
  'FANTA': ['Fanta'],
  'SPRITE': ['Sprite'],
  'ORANGINA': ['Orangina'],
  'SCHWEP': ['Schweppes'],
  'PERRIER': ['Perrier'],
  'BADOIT': ['Badoit'],
  'EVIAN': ['Evian'],
  'VITTEL': ['Vittel'],
  'VOLVIC': ['Volvic'],
  'CRISTALINE': ['Cristaline'],
  'BIERE': ['Biere'],
  'VIN': ['Vin'],
  'VIN RGE': ['Vin rouge'],
  'VIN BLC': ['Vin blanc'],
  'VIN ROSE': ['Vin rose'],

  // ===== SURGELES =====
  'SURG': ['Surgele'],
  'PIZZA SURG': ['Pizza surgelee'],
  'LEGUM SURG': ['Legumes surgeles'],
  'POISSON SURG': ['Poisson surgele'],
  'GLACE': ['Glace'],
  'CREME GLAC': ['Creme glacee'],
  'SORBET': ['Sorbet'],

  // ===== MARQUES DISTRIBUTEUR =====
  'MDD': ['Marque distributeur'],
  'ECO+': ['Eco+ (Leclerc)'],
  'MARQ REP': ['Marque Repere'],
  'CARF': ['Carrefour'],
  'CARF BIO': ['Carrefour Bio'],
  'CASIN': ['Casino'],
  'AUCHAN': ['Auchan'],
  'U': ['U (Systeme U)'],
  'INTER': ['Intermarche'],
  'LIDL': ['Lidl'],
  'ALDI': ['Aldi'],
};

/**
 * Patterns to detect quantities on receipts
 */
export const QUANTITY_PATTERNS = {
  // Format: "2 X" or "X2" or "2x"
  multiplier: /(\d+)\s*[xX×]\s*|\s*[xX×]\s*(\d+)/,
  // Format: "1.5 KG" or "500G"
  weight: /(\d+[.,]?\d*)\s*(kg|g|gr|grammes?|kilos?)/i,
  // Format: "1.5L" or "33CL"
  volume: /(\d+[.,]?\d*)\s*(l|L|cl|ml|litres?|centilitres?|millilitres?)/i,
  // Format: "6 PIECES" or "PACK 12"
  units: /(\d+)\s*(pcs?|pieces?|unites?|pack|lot)/i,
};

/**
 * Normalize a ticket line using the abbreviation dictionary
 */
export function normalizeTicketLine(line: string): string {
  let normalized = line.toUpperCase().trim();

  // Sort abbreviations by length (longest first) to avoid partial replacements
  const sortedAbbrevs = Object.entries(FRENCH_RECEIPT_ABBREVIATIONS)
    .sort(([a], [b]) => b.length - a.length);

  for (const [abbrev, fullNames] of sortedAbbrevs) {
    // Create regex that matches word boundaries
    const regex = new RegExp(`\\b${escapeRegExp(abbrev)}\\b`, 'gi');
    if (regex.test(normalized)) {
      // Replace with the first (most common) full name
      normalized = normalized.replace(regex, fullNames[0]);
    }
  }

  // Normalize casing: capitalize first letter of each word
  return normalized
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract quantity from a product name
 */
export function extractQuantity(productName: string): { quantity: number; cleanName: string } {
  let quantity = 1;
  let cleanName = productName;

  // Check for multiplier pattern (e.g., "2 X Yaourt")
  const multiplierMatch = productName.match(QUANTITY_PATTERNS.multiplier);
  if (multiplierMatch) {
    quantity = parseInt(multiplierMatch[1] || multiplierMatch[2], 10);
    cleanName = productName.replace(QUANTITY_PATTERNS.multiplier, '').trim();
  }

  // Check for unit pattern (e.g., "Pack 6")
  const unitsMatch = productName.match(QUANTITY_PATTERNS.units);
  if (unitsMatch && !multiplierMatch) {
    quantity = parseInt(unitsMatch[1], 10);
  }

  return { quantity, cleanName };
}

export default {
  FRENCH_RECEIPT_ABBREVIATIONS,
  QUANTITY_PATTERNS,
  normalizeTicketLine,
  extractQuantity,
};
