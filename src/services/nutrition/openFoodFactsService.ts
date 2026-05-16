/**
 * Service pour interagir avec OpenFoodFacts.
 *
 * PRP-225 PR4 — l'appel direct à OpenFoodFacts a été retiré au
 * profit du proxy `/api/products/external/search` +
 * `/api/products/resolve` côté serveur (User-Agent enforced, cache
 * durable, rate-limited). Le mapping nutriments + le calcul
 * `calculateNutritionForQuantity` restent côté front pour ne pas
 * casser `RecipeNutrition.tsx` (PRP-227 consolidera tout le calcul
 * nutrition).
 */

import { apiGet, ApiError } from '@/lib/api';

interface NutritionalInfo {
  energy_kcal?: number;
  energy?: number;
  proteins?: number;
  carbohydrates?: number;
  sugars?: number;
  fat?: number;
  saturated_fat?: number;
  fiber?: number;
  salt?: number;
  sodium?: number;
}

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  nutriments?: NutritionalInfo;
  nutriscore_grade?: string;
  image_url?: string;
  serving_size?: string;
  serving_quantity?: number;
}

// Backend (Product Intelligence proxy) response shapes.
interface BackendExternalCandidate {
  name?: string;
  brand?: string | null;
  category?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  score?: number;
  source?: string;
}

interface BackendExternalSearchResponse {
  results: BackendExternalCandidate[];
  cached?: boolean;
}

interface BackendResolveResponse {
  kind: 'matched' | 'created' | 'ambiguous' | 'not_found';
  product?: {
    name: string;
    brand?: string | null;
    image_url?: string | null;
    quantity_label?: string | null;
    nutrition_json?: {
      per100g?: {
        energyKcal?: number;
        proteinG?: number;
        carbsG?: number;
        sugarG?: number;
        fatG?: number;
        saturatedFatG?: number;
        fiberG?: number;
        saltG?: number;
      };
      serving?: { label?: string; quantity?: number; unit?: string };
      scores?: { nutriScore?: string };
    } | null;
  };
  candidates?: BackendExternalCandidate[];
}

function backendCandidateToProduct(c: BackendExternalCandidate): OpenFoodFactsProduct {
  return {
    product_name: c.name ?? '',
    brands: c.brand ?? undefined,
    image_url: c.image_url ?? undefined,
  };
}

function backendResolveToProduct(payload: BackendResolveResponse): OpenFoodFactsProduct | null {
  if (payload.kind === 'not_found') return null;
  const p = payload.product;
  if (!p) {
    const candidate = payload.candidates?.[0];
    return candidate ? backendCandidateToProduct(candidate) : null;
  }
  const per100g = p.nutrition_json?.per100g;
  const nutriments: NutritionalInfo | undefined = per100g
    ? {
        energy_kcal: per100g.energyKcal,
        proteins: per100g.proteinG,
        carbohydrates: per100g.carbsG,
        sugars: per100g.sugarG,
        fat: per100g.fatG,
        saturated_fat: per100g.saturatedFatG,
        fiber: per100g.fiberG,
        salt: per100g.saltG,
      }
    : undefined;
  return {
    product_name: p.name,
    brands: p.brand ?? undefined,
    image_url: p.image_url ?? undefined,
    serving_size: p.nutrition_json?.serving?.label ?? undefined,
    serving_quantity: p.nutrition_json?.serving?.quantity ?? undefined,
    nutriscore_grade: p.nutrition_json?.scores?.nutriScore ?? undefined,
    nutriments,
  };
}

export class OpenFoodFactsService {
  private static instance: OpenFoodFactsService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes pour les tests

  private constructor() {}

  static getInstance(): OpenFoodFactsService {
    if (!OpenFoodFactsService.instance) {
      OpenFoodFactsService.instance = new OpenFoodFactsService();
    }
    return OpenFoodFactsService.instance;
  }

  /**
   * Vide le cache pour forcer de nouvelles recherches
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache OpenFoodFacts vidé');
  }

  /**
   * Recherche un produit par son nom via le proxy serveur.
   * Le mapping nutriments riche n'est plus nécessaire ici : le proxy
   * renvoie `ProductCandidate` léger (juste nom/brand/image). Pour
   * obtenir les nutriments, on appelle `/api/products/resolve` sur
   * un candidat précis via `getProductByBarcode`.
   */
  async searchProduct(query: string): Promise<OpenFoodFactsProduct[]> {
    const cacheKey = `search_${query}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await apiGet<BackendExternalSearchResponse>('/products/external/search', {
        q: query,
        limit: 10,
      });
      const products = (data.results ?? []).map(backendCandidateToProduct);
      this.setCache(cacheKey, products);
      return products;
    } catch (error) {
      if (!(error instanceof ApiError)) {
        console.error('Error searching product:', error);
      }
      return [];
    }
  }

  /**
   * Récupère un produit par son code-barres via le proxy serveur.
   * Le pipeline serveur fait : barcode local → cache OFF → OFF API,
   * donc on récupère soit un produit local enrichi, soit un candidat
   * OFF brut. Dans tous les cas la projection nutriments est
   * re-construite côté backend.
   */
  async getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
    const cacheKey = `barcode_${barcode}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = await apiGet<BackendResolveResponse>('/products/resolve', { barcode });
      const product = backendResolveToProduct(data);
      if (product) {
        this.setCache(cacheKey, product);
      }
      return product;
    } catch (error) {
      if (!(error instanceof ApiError)) {
        console.error('Error fetching product by barcode:', error);
      }
      return null;
    }
  }

  /**
   * Calcule les valeurs nutritionnelles pour une quantité donnée
   */
  calculateNutritionForQuantity(
    product: OpenFoodFactsProduct,
    quantity: number,
    unit: string,
    ingredientName?: string
  ): NutritionalInfo | null {
    if (!product.nutriments) return null;

    console.log(`\n   🧮 Calcul pour ${quantity} ${unit}...`);
    
    // Convertir la quantité en grammes
    let quantityInGrams = quantity;
    
    // Conversions simples
    const unitLower = unit.toLowerCase().trim();
    
    switch (unitLower) {
      case 'kg':
        quantityInGrams = quantity * 1000;
        break;
      case 'g':
      case 'gr':
      case 'gramme':
      case 'grammes':
        quantityInGrams = quantity;
        break;
      case 'l':
      case 'litre':
      case 'litres':
        quantityInGrams = quantity * 1000; // Approximation 1L = 1kg
        break;
      case 'ml':
        quantityInGrams = quantity; // Approximation 1ml = 1g
        break;
      case 'cl':
        quantityInGrams = quantity * 10;
        break;
      case 'dl':
        quantityInGrams = quantity * 100;
        break;
      case 'cuillère à soupe':
      case 'cuillères à soupe':
      case 'c. à soupe':
      case 'cs':
      case 'cas':
      case 'c.a.s':
      case 'c.à.s':
        quantityInGrams = quantity * 15;
        break;
      case 'cuillère à café':
      case 'cuillères à café':
      case 'c. à café':
      case 'cc':
      case 'cac':
      case 'c.a.c':
      case 'c.à.c':
        quantityInGrams = quantity * 5;
        break;
      case 'pincée':
      case 'pincées':
        quantityInGrams = quantity * 0.5;
        break;
      case 'verre':
      case 'verres':
        quantityInGrams = quantity * 200;
        break;
      case 'tasse':
      case 'tasses':
        quantityInGrams = quantity * 250;
        break;
      case '':
      case 'unité':
      case 'unités':
      case 'pièce':
      case 'pièces':
        // Pour les unités non spécifiées, estimer selon l'ingrédient
        // Par défaut, considérer comme une portion moyenne
        // Pour les unités non spécifiées, estimer selon l'ingrédient
        // Une gousse d'ail = ~5g, un anchois = ~10g, etc.
        if (ingredientName) {
          const lowerName = ingredientName.toLowerCase();
          if (lowerName.includes('ail')) {
            quantityInGrams = quantity * 5; // Une gousse d'ail ~5g
          } else if (lowerName.includes('anchois')) {
            quantityInGrams = quantity * 10; // Un filet d'anchois ~10g
          } else if (lowerName.includes('citron')) {
            quantityInGrams = quantity * 60; // Un citron moyen ~60g
          } else if (lowerName.includes('oignon')) {
            quantityInGrams = quantity * 150; // Un oignon moyen ~150g
          } else {
            quantityInGrams = quantity * 50; // Estimation par défaut
          }
        } else {
          quantityInGrams = quantity * 50; // Estimation par défaut
        }
        break;
      default:
        // Si l'unité n'est pas reconnue, garder la quantité telle quelle
        console.log(`   ⚠️ Unité non reconnue: "${unit}"`);
        quantityInGrams = quantity * 10; // Estimation conservative
    }

    // Afficher la conversion si elle a eu lieu
    if (quantityInGrams !== quantity) {
      console.log(`   📏 Conversion: ${quantity} ${unit} → ${quantityInGrams}g`);
    }
    
    // Les valeurs nutritionnelles sont généralement pour 100g
    const factor = quantityInGrams / 100;
    console.log(`   📐 Facteur de calcul: ${factor.toFixed(2)} (${quantityInGrams}g / 100g)`);
    
    const nutriments = product.nutriments;

    // Calculer les valeurs en tenant compte des différents formats possibles
    const result: NutritionalInfo = {
      energy_kcal: (nutriments.energy_kcal || nutriments['energy-kcal_100g']) ? 
        (nutriments.energy_kcal || nutriments['energy-kcal_100g']) * factor : undefined,
      energy: (nutriments.energy || nutriments['energy_100g']) ? 
        (nutriments.energy || nutriments['energy_100g']) * factor : undefined,
      proteins: (nutriments.proteins || nutriments['proteins_100g']) ? 
        (nutriments.proteins || nutriments['proteins_100g']) * factor : undefined,
      carbohydrates: (nutriments.carbohydrates || nutriments['carbohydrates_100g']) ? 
        (nutriments.carbohydrates || nutriments['carbohydrates_100g']) * factor : undefined,
      sugars: (nutriments.sugars || nutriments['sugars_100g']) ? 
        (nutriments.sugars || nutriments['sugars_100g']) * factor : undefined,
      fat: (nutriments.fat || nutriments['fat_100g']) ? 
        (nutriments.fat || nutriments['fat_100g']) * factor : undefined,
      saturated_fat: (nutriments.saturated_fat || nutriments['saturated-fat_100g']) ? 
        (nutriments.saturated_fat || nutriments['saturated-fat_100g']) * factor : undefined,
      fiber: (nutriments.fiber || nutriments['fiber_100g']) ? 
        (nutriments.fiber || nutriments['fiber_100g']) * factor : undefined,
      salt: (nutriments.salt || nutriments['salt_100g']) ? 
        (nutriments.salt || nutriments['salt_100g']) * factor : undefined,
      sodium: (nutriments.sodium || nutriments['sodium_100g']) ? 
        (nutriments.sodium || nutriments['sodium_100g']) * factor : undefined,
    };
    
    // Debug: afficher les valeurs avant de retourner
    console.log(`   💊 Valeurs calculées:`, {
      calories: result.energy_kcal?.toFixed(1),
      proteins: result.proteins?.toFixed(1),
      carbs: result.carbohydrates?.toFixed(1),
      fat: result.fat?.toFixed(1)
    });
    
    return result;
  }

  /**
   * Recherche générique d'aliments frais et basiques
   */
  private async searchGenericFood(foodType: string): Promise<OpenFoodFactsProduct | null> {
    console.log(`   🥗 Recherche générique pour: "${foodType}"`);
    
    // Base de données locale pour les aliments de base
    const genericFoods: Record<string, any> = {
      'ail': {
        product_name: 'Ail frais',
        nutriments: {
          'energy-kcal_100g': 149,
          'proteins_100g': 6.4,
          'carbohydrates_100g': 33,
          'fat_100g': 0.5,
          'fiber_100g': 2.1
        }
      },
      'anchois': {
        product_name: 'Filets d\'anchois',
        nutriments: {
          'energy-kcal_100g': 210,
          'proteins_100g': 29,
          'carbohydrates_100g': 0,
          'fat_100g': 10,
          'salt_100g': 14
        }
      },
      'citron': {
        product_name: 'Citron frais',
        nutriments: {
          'energy-kcal_100g': 29,
          'proteins_100g': 1.1,
          'carbohydrates_100g': 9,
          'fat_100g': 0.3,
          'fiber_100g': 2.8
        }
      },
      'moutarde': {
        product_name: 'Moutarde de Dijon',
        nutriments: {
          'energy-kcal_100g': 66,
          'proteins_100g': 5,
          'carbohydrates_100g': 8,
          'fat_100g': 4,
          'salt_100g': 6
        }
      },
      'sel': {
        product_name: 'Sel de table',
        nutriments: {
          'energy-kcal_100g': 0,
          'proteins_100g': 0,
          'carbohydrates_100g': 0,
          'fat_100g': 0,
          'salt_100g': 100
        }
      },
      'poivre': {
        product_name: 'Poivre noir moulu',
        nutriments: {
          'energy-kcal_100g': 251,
          'proteins_100g': 10,
          'carbohydrates_100g': 64,
          'fat_100g': 3.3,
          'fiber_100g': 25
        }
      },
      'piment': {
        product_name: 'Piment d\'Espelette',
        nutriments: {
          'energy-kcal_100g': 318,
          'proteins_100g': 12,
          'carbohydrates_100g': 56,
          'fat_100g': 17,
          'fiber_100g': 27
        }
      },
      'fromage blanc': {
        product_name: 'Fromage blanc 3%',
        nutriments: {
          'energy-kcal_100g': 75,
          'proteins_100g': 8,
          'carbohydrates_100g': 4,
          'fat_100g': 3,
          'calcium_100g': 120
        }
      },
      'poulet': {
        product_name: 'Poulet entier cru',
        nutriments: {
          'energy-kcal_100g': 215,
          'proteins_100g': 18.6,
          'carbohydrates_100g': 0,
          'fat_100g': 15.1,
          'saturated-fat_100g': 4.3
        }
      },
      'poulet entier': {
        product_name: 'Poulet entier cru',
        nutriments: {
          'energy-kcal_100g': 215,
          'proteins_100g': 18.6,
          'carbohydrates_100g': 0,
          'fat_100g': 15.1,
          'saturated-fat_100g': 4.3
        }
      },
      'blanc de poulet': {
        product_name: 'Blanc de poulet',
        nutriments: {
          'energy-kcal_100g': 165,
          'proteins_100g': 31,
          'carbohydrates_100g': 0,
          'fat_100g': 3.6,
          'saturated-fat_100g': 1
        }
      },
      'boeuf': {
        product_name: 'Boeuf haché 15% MG',
        nutriments: {
          'energy-kcal_100g': 250,
          'proteins_100g': 26,
          'carbohydrates_100g': 0,
          'fat_100g': 15,
          'saturated-fat_100g': 6
        }
      },
      'porc': {
        product_name: 'Porc (côte)',
        nutriments: {
          'energy-kcal_100g': 242,
          'proteins_100g': 27,
          'carbohydrates_100g': 0,
          'fat_100g': 14,
          'saturated-fat_100g': 5
        }
      },
      'poisson': {
        product_name: 'Poisson blanc (cabillaud)',
        nutriments: {
          'energy-kcal_100g': 82,
          'proteins_100g': 18,
          'carbohydrates_100g': 0,
          'fat_100g': 0.7,
          'saturated-fat_100g': 0.1
        }
      },
      'saumon': {
        product_name: 'Saumon frais',
        nutriments: {
          'energy-kcal_100g': 208,
          'proteins_100g': 20,
          'carbohydrates_100g': 0,
          'fat_100g': 13,
          'saturated-fat_100g': 3
        }
      },
      'oeuf': {
        product_name: 'Oeuf de poule',
        nutriments: {
          'energy-kcal_100g': 155,
          'proteins_100g': 13,
          'carbohydrates_100g': 1.1,
          'fat_100g': 11,
          'saturated-fat_100g': 3.3
        }
      },
      'oeufs': {
        product_name: 'Oeufs de poule',
        nutriments: {
          'energy-kcal_100g': 155,
          'proteins_100g': 13,
          'carbohydrates_100g': 1.1,
          'fat_100g': 11,
          'saturated-fat_100g': 3.3
        }
      },
      'lait': {
        product_name: 'Lait demi-écrémé',
        nutriments: {
          'energy-kcal_100g': 46,
          'proteins_100g': 3.3,
          'carbohydrates_100g': 4.8,
          'fat_100g': 1.5,
          'calcium_100g': 120
        }
      },
      'beurre': {
        product_name: 'Beurre',
        nutriments: {
          'energy-kcal_100g': 717,
          'proteins_100g': 0.9,
          'carbohydrates_100g': 0.1,
          'fat_100g': 81,
          'saturated-fat_100g': 51
        }
      },
      'huile': {
        product_name: 'Huile végétale',
        nutriments: {
          'energy-kcal_100g': 900,
          'proteins_100g': 0,
          'carbohydrates_100g': 0,
          'fat_100g': 100,
          'saturated-fat_100g': 14
        }
      },
      'huile végétale': {
        product_name: 'Huile végétale',
        nutriments: {
          'energy-kcal_100g': 900,
          'proteins_100g': 0,
          'carbohydrates_100g': 0,
          'fat_100g': 100,
          'saturated-fat_100g': 14
        }
      },
      "huile d'olive": {
        product_name: 'Huile d\'olive vierge extra',
        nutriments: {
          'energy-kcal_100g': 900,
          'proteins_100g': 0,
          'carbohydrates_100g': 0,
          'fat_100g': 100,
          'saturated-fat_100g': 14
        }
      }
    };
    
    // Ajouter plus d'aliments de base
    const moreGenericFoods: Record<string, any> = {
      'tomate': {
        product_name: 'Tomates fraîches',
        nutriments: {
          'energy-kcal_100g': 18,
          'proteins_100g': 0.9,
          'carbohydrates_100g': 3.9,
          'fat_100g': 0.2,
          'fiber_100g': 1.2
        }
      },
      'oignon': {
        product_name: 'Oignon',
        nutriments: {
          'energy-kcal_100g': 40,
          'proteins_100g': 1.1,
          'carbohydrates_100g': 9.3,
          'fat_100g': 0.1,
          'fiber_100g': 1.7
        }
      },
      'carotte': {
        product_name: 'Carotte',
        nutriments: {
          'energy-kcal_100g': 41,
          'proteins_100g': 0.9,
          'carbohydrates_100g': 9.6,
          'fat_100g': 0.2,
          'fiber_100g': 2.8
        }
      },
      'pomme de terre': {
        product_name: 'Pomme de terre',
        nutriments: {
          'energy-kcal_100g': 77,
          'proteins_100g': 2,
          'carbohydrates_100g': 17,
          'fat_100g': 0.1,
          'fiber_100g': 2.2
        }
      },
      'courgette': {
        product_name: 'Courgette',
        nutriments: {
          'energy-kcal_100g': 17,
          'proteins_100g': 1.2,
          'carbohydrates_100g': 3.1,
          'fat_100g': 0.3,
          'fiber_100g': 1
        }
      },
      'poivron': {
        product_name: 'Poivron',
        nutriments: {
          'energy-kcal_100g': 31,
          'proteins_100g': 1,
          'carbohydrates_100g': 6,
          'fat_100g': 0.3,
          'fiber_100g': 2.1
        }
      },
      'riz': {
        product_name: 'Riz blanc cuit',
        nutriments: {
          'energy-kcal_100g': 130,
          'proteins_100g': 2.7,
          'carbohydrates_100g': 28,
          'fat_100g': 0.3,
          'fiber_100g': 0.4
        }
      },
      'pâtes': {
        product_name: 'Pâtes cuites',
        nutriments: {
          'energy-kcal_100g': 131,
          'proteins_100g': 5,
          'carbohydrates_100g': 25,
          'fat_100g': 1.1,
          'fiber_100g': 1.8
        }
      },
      'pain': {
        product_name: 'Pain blanc',
        nutriments: {
          'energy-kcal_100g': 265,
          'proteins_100g': 9,
          'carbohydrates_100g': 49,
          'fat_100g': 3.2,
          'fiber_100g': 2.7
        }
      },
      'farine': {
        product_name: 'Farine de blé',
        nutriments: {
          'energy-kcal_100g': 364,
          'proteins_100g': 10,
          'carbohydrates_100g': 76,
          'fat_100g': 1,
          'fiber_100g': 2.7
        }
      },
      'sucre': {
        product_name: 'Sucre blanc',
        nutriments: {
          'energy-kcal_100g': 400,
          'proteins_100g': 0,
          'carbohydrates_100g': 100,
          'fat_100g': 0,
          'fiber_100g': 0
        }
      }
    };
    
    // Fusionner les deux bases
    const allGenericFoods = { ...genericFoods, ...moreGenericFoods };
    
    // Chercher dans notre base locale étendue
    for (const [key, data] of Object.entries(allGenericFoods)) {
      if (foodType.includes(key) || key.includes(foodType)) {
        console.log(`   ✅ Trouvé dans la base locale: ${data.product_name}`);
        return data;
      }
    }
    
    return null;
  }

  /**
   * Trouve la meilleure correspondance pour un ingrédient
   */
  async findBestMatch(ingredientName: string): Promise<OpenFoodFactsProduct | null> {
    console.log(`\n🔍 Recherche OpenFoodFacts pour: "${ingredientName}"`);
    
    // Nettoyer et préparer le nom de l'ingrédient
    let searchTerm = ingredientName.toLowerCase().trim();
    console.log(`📝 Terme de recherche nettoyé: "${searchTerm}"`);
    
    // Supprimer les quantités entre parenthèses et les chiffres au début
    searchTerm = searchTerm
      .replace(/\([^)]*\)/g, '') // Enlever tout ce qui est entre parenthèses
      .replace(/^\d+\s*/, '') // Enlever les chiffres au début
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
      .trim();
    
    if (searchTerm !== ingredientName.toLowerCase().trim()) {
      console.log(`🔄 Après nettoyage: "${searchTerm}"`);
    }
    
    // Gérer les préfixes courants
    const prefixesToRemove = [
      'gousse de', 'gousses de', 'gousse d\'', 'gousses d\'',
      'filet de', 'filets de', 'filet d\'', 'filets d\'',
      'tranche de', 'tranches de',
      'morceau de', 'morceaux de',
      'branche de', 'branches de',
      'feuille de', 'feuilles de',
      'brin de', 'brins de',
      'pincée de', 'pincées de',
      'poignée de', 'poignées de',
      'boîte de', 'boîtes de',
      'pot de', 'pots de',
      'sachet de', 'sachets de',
      'paquet de', 'paquets de'
    ];
    
    for (const prefix of prefixesToRemove) {
      if (searchTerm.startsWith(prefix)) {
        searchTerm = searchTerm.substring(prefix.length).trim();
        console.log(`🔪 Préfixe retiré: "${prefix}" → "${searchTerm}"`);
        break;
      }
    }
    
    // Mappings spécifiques pour certains ingrédients
    const ingredientMappings: Record<string, string> = {
      'anchois': 'anchois',
      'filets d\'anchois': 'filets anchois',
      'huile d\'olive': 'huile olive vierge extra',
      'huile olive': 'huile olive',
      'parmesan': 'parmesan',
      'parmesan râpé': 'parmesan râpé',
      'crème fraîche': 'crème fraîche',
      'crème fraiche': 'crème fraîche',
      'beurre': 'beurre',
      'lait': 'lait entier',
      'oeuf': 'oeuf',
      'oeufs': 'oeufs',
      'farine': 'farine de blé',
      'farine de blé': 'farine de blé',
      'sucre': 'sucre blanc',
      'sel': 'sel',
      'poivre': 'poivre noir',
      'ail': 'ail',
      'gousses d\'ail': 'ail',
      'oignon': 'oignon',
      'oignons': 'oignons',
      'échalote': 'échalote',
      'échalotes': 'échalotes',
      'persil': 'persil frais',
      'thym': 'thym',
      'basilic': 'basilic frais',
      'citron': 'citron',
      'vinaigre': 'vinaigre',
      'moutarde': 'moutarde de dijon',
      'tomate': 'tomate',
      'tomates': 'tomates',
      'pomme de terre': 'pomme de terre',
      'pommes de terre': 'pommes de terre',
      'carotte': 'carotte',
      'carottes': 'carottes',
      'courgette': 'courgette',
      'courgettes': 'courgettes',
      'poivron': 'poivron',
      'poivrons': 'poivrons',
      'champignon': 'champignon',
      'champignons': 'champignons',
      'pâtes': 'pâtes',
      'riz': 'riz',
      'quinoa': 'quinoa',
      'pain': 'pain',
      'fromage': 'fromage',
      'poulet': 'poulet',
      'boeuf': 'boeuf',
      'porc': 'porc',
      'poisson': 'poisson',
      'saumon': 'saumon',
      'thon': 'thon',
      'crevettes': 'crevettes',
      'légumes': 'légumes',
      'fruits': 'fruits'
    };
    
    // Essayer d'abord la base locale pour les ingrédients de base
    const localProduct = await this.searchGenericFood(searchTerm);
    if (localProduct) {
      console.log(`   📚 Utilisation de la base locale pour: "${searchTerm}"`);
      return localProduct;
    }
    
    // Sinon essayer avec le mapping s'il existe
    if (ingredientMappings[searchTerm]) {
      console.log(`🗺️ Mapping trouvé: "${searchTerm}" → "${ingredientMappings[searchTerm]}"`);
      const mappedProducts = await this.searchProduct(ingredientMappings[searchTerm]);
      console.log(`📊 Résultats avec mapping: ${mappedProducts.length} produits trouvés`);
      if (mappedProducts.length > 0 && 
          !mappedProducts[0].product_name?.toLowerCase().includes('sidi ali') &&
          !mappedProducts[0].product_name?.toLowerCase().includes('eau')) {
        console.log(`✅ Produit sélectionné avec mapping: "${mappedProducts[0].product_name}" (${mappedProducts[0].brands || 'sans marque'})`);
        return mappedProducts[0];
      }
    }
    
    // Recherche normale
    console.log(`🔎 Recherche normale avec: "${searchTerm}"`);
    let products = await this.searchProduct(searchTerm);
    console.log(`📊 Résultats de recherche normale: ${products.length} produits trouvés`);
    
    // Si pas de résultat, essayer avec juste le premier mot
    if (products.length === 0 && searchTerm.includes(' ')) {
      const firstWord = searchTerm.split(' ')[0];
      console.log(`🔄 Nouvelle tentative avec premier mot seulement: "${firstWord}"`);
      products = await this.searchProduct(firstWord);
      console.log(`📊 Résultats avec premier mot: ${products.length} produits trouvés`);
    }
    
    // Si toujours pas de résultat, essayer en anglais
    if (products.length === 0) {
      // Traductions basiques français -> anglais
      const translations: Record<string, string> = {
        'tomate': 'tomato',
        'tomates': 'tomatoes',
        'pomme': 'apple',
        'pommes': 'apples',
        'carotte': 'carrot',
        'carottes': 'carrots',
        'poulet': 'chicken',
        'boeuf': 'beef',
        'porc': 'pork',
        'poisson': 'fish',
        'fromage': 'cheese',
        'pain': 'bread',
        'pâtes': 'pasta',
        'riz': 'rice',
      };
      
      const englishTerm = translations[searchTerm];
      if (englishTerm) {
        console.log(`🌐 Traduction trouvée: "${searchTerm}" → "${englishTerm}"`);
        products = await this.searchProduct(englishTerm);
        console.log(`📊 Résultats avec traduction anglaise: ${products.length} produits trouvés`);
      }
    }
    
    if (products.length === 0) {
      console.log(`❌ AUCUN produit trouvé pour: "${ingredientName}" (après toutes les tentatives)`);
      return null;
    }

    // Retourner le produit avec le plus d'informations nutritionnelles
    console.log(`🔍 Analyse des ${products.length} produits trouvés...`);
    
    // Afficher les 3 premiers produits pour debug
    products.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. "${p.product_name}" (${p.brands || 'sans marque'})`);
      if (p.nutriments) {
        console.log(`     → Calories: ${p.nutriments.energy_kcal || p.nutriments['energy-kcal_100g'] || 'N/A'} kcal/100g`);
        console.log(`     → Protéines: ${p.nutriments.proteins || p.nutriments['proteins_100g'] || 'N/A'} g/100g`);
        // Debug: afficher toutes les clés nutriments disponibles
        console.log(`     → Clés disponibles: ${Object.keys(p.nutriments).slice(0, 5).join(', ')}...`);
      }
    });
    
    // Filtrer les produits qui semblent correspondre à l'ingrédient recherché
    const relevantProducts = products.filter(p => {
      const productName = (p.product_name || '').toLowerCase();
      const genericName = (p.generic_name || '').toLowerCase();
      const categories = (p.categories || '').toLowerCase();
      const searchWords = searchTerm.toLowerCase().split(' ');
      
      // Exclure les produits manifestement incorrects
      const excludePatterns = ['eau minérale', 'sidi ali', 'eau de source', 'boisson', 'soda'];
      const isExcluded = excludePatterns.some(pattern => 
        productName.includes(pattern) || genericName.includes(pattern)
      );
      
      if (isExcluded) return false;
      
      // Vérifier si au moins un mot de recherche est dans le nom du produit ou les catégories
      return searchWords.some(word => 
        productName.includes(word) || 
        genericName.includes(word) ||
        categories.includes(word)
      );
    });
    
    console.log(`   🎯 Produits pertinents: ${relevantProducts.length} sur ${products.length}`);
    
    // Si aucun produit pertinent, essayer de filtrer au moins les eaux
    let productsToCheck = relevantProducts;
    if (productsToCheck.length === 0) {
      productsToCheck = products.filter(p => {
        const name = (p.product_name || '').toLowerCase();
        return !name.includes('eau') && !name.includes('sidi') && !name.includes('water');
      });
      console.log(`   🔄 Après exclusion des eaux: ${productsToCheck.length} produits`);
    }
    
    // Prioriser les produits avec des valeurs nutritionnelles complètes
    let bestProduct = productsToCheck.find(p => 
      p.nutriments && 
      (p.nutriments['energy-kcal_100g'] > 0 || p.nutriments.energy_kcal > 0) &&
      (p.nutriments['proteins_100g'] !== undefined || p.nutriments.proteins !== undefined)
    ) || productsToCheck.find(p => 
      p.nutriments && p.nutriments['energy-kcal_100g'] > 0
    ) || productsToCheck[0] || products[0];
    
    // Si on trouve "Sidi Ali" ou un produit avec moins de 5 kcal/100g pour un ingrédient qui n'est pas de l'eau
    // C'est probablement une erreur, essayons notre base locale
    if (bestProduct && bestProduct.product_name && 
        (bestProduct.product_name.toLowerCase().includes('sidi ali') || 
         bestProduct.product_name.toLowerCase().includes('eau') ||
         (bestProduct.nutriments && 
          (bestProduct.nutriments['energy-kcal_100g'] || bestProduct.nutriments.energy_kcal || 0) < 5))) {
      
      console.log(`   ⚠️ Résultat suspect détecté, tentative avec base locale...`);
      const localProduct = await this.searchGenericFood(searchTerm);
      if (localProduct) {
        bestProduct = localProduct;
      }
    }
    
    console.log(`\n✅ PRODUIT FINAL SÉLECTIONNÉ: "${bestProduct.product_name}" (${bestProduct.brands || 'sans marque'})`);
    if (bestProduct.nutriments) {
      const nutriments = bestProduct.nutriments;
      
      // Afficher les vraies valeurs stockées
      console.log(`   📊 Valeurs nutritionnelles brutes:`);
      console.log(`   → energy-kcal_100g: ${nutriments['energy-kcal_100g']}`);
      console.log(`   → energy_kcal: ${nutriments.energy_kcal}`);
      console.log(`   → proteins_100g: ${nutriments['proteins_100g']}`);
      console.log(`   → proteins: ${nutriments.proteins}`);
      console.log(`   → carbohydrates_100g: ${nutriments['carbohydrates_100g']}`);
      console.log(`   → fat_100g: ${nutriments['fat_100g']}`);
      
      console.log(`   📊 Valeurs nutritionnelles pour 100g:`);
      console.log(`   → Calories: ${nutriments.energy_kcal || nutriments['energy-kcal_100g'] || 0} kcal`);
      console.log(`   → Protéines: ${nutriments.proteins || nutriments['proteins_100g'] || 0} g`);
      console.log(`   → Glucides: ${nutriments.carbohydrates || nutriments['carbohydrates_100g'] || 0} g`);
      console.log(`   → Lipides: ${nutriments.fat || nutriments['fat_100g'] || 0} g`);
    }
    
    return bestProduct;
  }

  /**
   * Calcule les valeurs nutritionnelles totales pour une liste d'ingrédients
   */
  async calculateRecipeNutrition(
    ingredients: Array<{
      ingredient_name: string;
      quantity: number;
      unit: string;
    }>
  ): Promise<{
    totalNutrition: NutritionalInfo;
    missingIngredients: string[];
    foundIngredients: Array<{
      name: string;
      product: OpenFoodFactsProduct;
      nutrition: NutritionalInfo;
    }>;
  }> {
    const totalNutrition: NutritionalInfo = {
      energy_kcal: 0,
      proteins: 0,
      carbohydrates: 0,
      sugars: 0,
      fat: 0,
      saturated_fat: 0,
      fiber: 0,
      salt: 0,
    };

    const missingIngredients: string[] = [];
    const foundIngredients: Array<{
      name: string;
      product: OpenFoodFactsProduct;
      nutrition: NutritionalInfo;
    }> = [];

    // Traiter chaque ingrédient
    console.log(`\n🍳 DÉBUT DU CALCUL NUTRITIONNEL POUR ${ingredients.length} INGRÉDIENTS\n${'='.repeat(60)}`);
    
    for (const ingredient of ingredients) {
      console.log(`\n📦 TRAITEMENT INGRÉDIENT: "${ingredient.ingredient_name}" (${ingredient.quantity} ${ingredient.unit})`);
      console.log(`${'─'.repeat(50)}`);
      
      const product = await this.findBestMatch(ingredient.ingredient_name);
      
      if (!product || !product.nutriments) {
        console.log(`⚠️ INGRÉDIENT MANQUANT: Aucune donnée nutritionnelle pour "${ingredient.ingredient_name}"`);
        missingIngredients.push(ingredient.ingredient_name);
        continue;
      }

      const nutrition = this.calculateNutritionForQuantity(
        product,
        ingredient.quantity,
        ingredient.unit,
        ingredient.ingredient_name
      );

      if (nutrition) {
        console.log(`\n📊 CALCUL NUTRITIONNEL:`);
        console.log(`   Quantité: ${ingredient.quantity} ${ingredient.unit}`);
        console.log(`   → Calories: ${nutrition.energy_kcal?.toFixed(0) || 0} kcal`);
        console.log(`   → Protéines: ${nutrition.proteins?.toFixed(1) || 0} g`);
        console.log(`   → Glucides: ${nutrition.carbohydrates?.toFixed(1) || 0} g`);
        console.log(`   → Lipides: ${nutrition.fat?.toFixed(1) || 0} g`);
        
        foundIngredients.push({
          name: ingredient.ingredient_name,
          product,
          nutrition
        });

        // Additionner les valeurs nutritionnelles
        Object.keys(nutrition).forEach(key => {
          const value = nutrition[key as keyof NutritionalInfo];
          if (value !== undefined && !isNaN(value)) {
            totalNutrition[key as keyof NutritionalInfo] = 
              (totalNutrition[key as keyof NutritionalInfo] || 0) + value;
          }
        });
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📈 RÉSUMÉ FINAL:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Ingrédients trouvés: ${foundIngredients.length}`);
    console.log(`❌ Ingrédients manquants: ${missingIngredients.length}`);
    
    console.log(`\n📊 TOTAL NUTRITIONNEL DE LA RECETTE:`);
    console.log(`   → Calories totales: ${totalNutrition.energy_kcal?.toFixed(0) || 0} kcal`);
    console.log(`   → Protéines totales: ${totalNutrition.proteins?.toFixed(1) || 0} g`);
    console.log(`   → Glucides totaux: ${totalNutrition.carbohydrates?.toFixed(1) || 0} g`);
    console.log(`   → Lipides totaux: ${totalNutrition.fat?.toFixed(1) || 0} g`);
    
    if (missingIngredients.length > 0) {
      console.log(`\n⚠️ INGRÉDIENTS NON TROUVÉS DANS LA BASE:`);
      missingIngredients.forEach((ing, i) => {
        console.log(`   ${i + 1}. ${ing}`);
      });
    }
    
    console.log(`\n${'='.repeat(60)}\n`);

    return {
      totalNutrition,
      missingIngredients,
      foundIngredients
    };
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

export const openFoodFactsService = OpenFoodFactsService.getInstance();