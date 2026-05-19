/**
 * useBarcodeAPI — barcode → ProductInfo via the server-side
 * Product Intelligence proxy.
 *
 * PRP-225 PR4 — the hook no longer calls OpenFoodFacts directly. It
 * goes through `/api/products/resolve?barcode=…` which wraps OFF
 * behind a rate-limited, cached, User-Agent enforced server client.
 * The UPC Database fallback is dropped (PRP-225 §12.2).
 *
 * The category mapping + unit suggestion helpers stay here because
 * they map the canonical product category to the FR UI taxonomy ;
 * downstream consumers (AddProductDialog) rely on the existing
 * `ProductInfo` shape.
 */
import { useState } from 'react';

import { apiGet, ApiError } from '@/lib/api';

export interface ProductInfo {
  name: string;
  brand?: string;
  category?: string;
  image_url?: string;
  ingredients?: string;
  nutrition?: {
    energy_100g?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
  allergens?: string[];
  barcode: string;
  suggested_unit?: string;
}

export interface BarcodeAPIResponse {
  status: number;
  product?: ProductInfo;
  error?: string;
}

interface ResolveProductResponse {
  kind: 'matched' | 'created' | 'ambiguous' | 'not_found';
  product?: {
    id?: string;
    name: string;
    category?: string | null;
    barcode?: string | null;
    brand?: string | null;
    image_url?: string | null;
    ingredients_text?: string | null;
    nutrition_json?: {
      per100g?: {
        energyKcal?: number;
        proteinG?: number;
        carbsG?: number;
        fatG?: number;
      };
    } | null;
    allergens_json?: { allergensTags?: string[] } | null;
  };
  candidates?: Array<{
    name: string;
    brand?: string | null;
    barcode?: string | null;
    image_url?: string | null;
    category?: string | null;
  }>;
  via?: string;
  confidence?: number;
}

const PRODUCT_CATEGORY_MAPPING: Readonly<Record<string, string>> = {
  // Fruits et légumes
  'fruits': 'Fruits et légumes',
  'vegetables': 'Fruits et légumes',
  'legumes': 'Fruits et légumes',
  'fresh-vegetables': 'Fruits et légumes',
  'fresh-fruits': 'Fruits et légumes',
  // Viandes et poissons
  'meats': 'Viandes et poissons',
  'meat': 'Viandes et poissons',
  'fish': 'Viandes et poissons',
  'seafood': 'Viandes et poissons',
  'poultry': 'Viandes et poissons',
  'viandes': 'Viandes et poissons',
  'poissons': 'Viandes et poissons',
  // Produits laitiers
  'dairy': 'Produits laitiers',
  'milk': 'Produits laitiers',
  'cheese': 'Produits laitiers',
  'yogurt': 'Produits laitiers',
  'yoghurt': 'Produits laitiers',
  'dairy-products': 'Produits laitiers',
  'produits-laitiers': 'Produits laitiers',
  // Pain et viennoiseries
  'bread': 'Pain et viennoiseries',
  'breads': 'Pain et viennoiseries',
  'pain': 'Pain et viennoiseries',
  'pains': 'Pain et viennoiseries',
  'viennoiseries': 'Pain et viennoiseries',
  'pastries': 'Pain et viennoiseries',
  'bakery': 'Pain et viennoiseries',
  'sliced-bread': 'Pain et viennoiseries',
  'pain-de-mie': 'Pain et viennoiseries',
  // Pâtes, riz et féculents
  'pasta': 'Pâtes, riz et féculents',
  'rice': 'Pâtes, riz et féculents',
  'noodles': 'Pâtes, riz et féculents',
  'cereals': 'Pâtes, riz et féculents',
  'grains': 'Pâtes, riz et féculents',
  'quinoa': 'Pâtes, riz et féculents',
  'riz': 'Pâtes, riz et féculents',
  'pates': 'Pâtes, riz et féculents',
  'legumineuses': 'Pâtes, riz et féculents',
  'legumes-secs': 'Pâtes, riz et féculents',
  // Épices et condiments
  'spices': 'Épices et condiments',
  'herbs': 'Épices et condiments',
  'seasonings': 'Épices et condiments',
  'condiments': 'Épices et condiments',
  'epices': 'Épices et condiments',
  'herbes': 'Épices et condiments',
  'aromates': 'Épices et condiments',
  'sel': 'Épices et condiments',
  'sucre': 'Épices et condiments',
  'salt': 'Épices et condiments',
  'sugar': 'Épices et condiments',
  // Sauces et huiles
  'sauces': 'Sauces et huiles',
  'oils': 'Sauces et huiles',
  'vinegars': 'Sauces et huiles',
  'dressings': 'Sauces et huiles',
  'huiles': 'Sauces et huiles',
  'vinaigres': 'Sauces et huiles',
  'mayonnaise': 'Sauces et huiles',
  'ketchup': 'Sauces et huiles',
  'mustard': 'Sauces et huiles',
  'moutarde': 'Sauces et huiles',
  // Conserves
  'canned-foods': 'Conserves',
  'preserves': 'Conserves',
  'canned': 'Conserves',
  'conserves': 'Conserves',
  'pickles': 'Conserves',
  'canned-vegetables': 'Conserves',
  'canned-fruits': 'Conserves',
  // Café, thé et infusions
  'coffee': 'Café, thé et infusions',
  'tea': 'Café, thé et infusions',
  'herbal-teas': 'Café, thé et infusions',
  'cafe': 'Café, thé et infusions',
  'the': 'Café, thé et infusions',
  'infusions': 'Café, thé et infusions',
  'tisanes': 'Café, thé et infusions',
  // Gâteaux et biscuits
  'cookies': 'Gâteaux et biscuits',
  'biscuits': 'Gâteaux et biscuits',
  'cakes': 'Gâteaux et biscuits',
  'crackers': 'Gâteaux et biscuits',
  'gateau': 'Gâteaux et biscuits',
  'gateaux': 'Gâteaux et biscuits',
  'patisseries': 'Gâteaux et biscuits',
  // Épicerie sucrée
  'sweets': 'Épicerie sucrée',
  'chocolate': 'Épicerie sucrée',
  'chocolates': 'Épicerie sucrée',
  'candies': 'Épicerie sucrée',
  'desserts': 'Épicerie sucrée',
  'confectionery': 'Épicerie sucrée',
  'chocolate-spreads': 'Épicerie sucrée',
  'spreads': 'Épicerie sucrée',
  'honey': 'Épicerie sucrée',
  'jam': 'Épicerie sucrée',
  'confiture': 'Épicerie sucrée',
  'miel': 'Épicerie sucrée',
  // Boissons
  'beverages': 'Boissons',
  'drinks': 'Boissons',
  'waters': 'Boissons',
  'sodas': 'Boissons',
  'juices': 'Boissons',
  'alcoholic-beverages': 'Boissons',
  'jus': 'Boissons',
  'eaux': 'Boissons',
  'boissons': 'Boissons',
  // Surgelés
  'frozen': 'Surgelés',
  'frozen-foods': 'Surgelés',
  'ice-creams': 'Surgelés',
  'surgeles': 'Surgelés',
  'glaces': 'Surgelés',
};

function mapSingleCategory(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const clean = raw.toLowerCase().replace(/^(en|fr):/, '');
  if (PRODUCT_CATEGORY_MAPPING[clean]) return PRODUCT_CATEGORY_MAPPING[clean];
  for (const [key, value] of Object.entries(PRODUCT_CATEGORY_MAPPING)) {
    if (clean.includes(key) || key.includes(clean)) return value;
  }
  return undefined;
}

const UNIT_SUGGESTIONS: Readonly<Record<string, string>> = {
  'Fruits et légumes': 'kg',
  'Viandes et poissons': 'kg',
  'Produits laitiers': 'L',
  'Pain et viennoiseries': 'unité(s)',
  'Pâtes, riz et féculents': 'paquet(s)',
  'Épices et condiments': 'g',
  'Sauces et huiles': 'mL',
  'Conserves': 'boîte(s)',
  'Épicerie sucrée': 'paquet(s)',
  'Café, thé et infusions': 'paquet(s)',
  'Gâteaux et biscuits': 'paquet(s)',
  'Surgelés': 'paquet(s)',
  'Boissons': 'L',
  'Hygiène et beauté': 'unité(s)',
  'Entretien': 'unité(s)',
  'Autres': 'unité(s)',
};

function suggestUnitForCategory(category: string | undefined): string | undefined {
  if (!category) return undefined;
  return UNIT_SUGGESTIONS[category];
}

function adaptBackendProduct(barcode: string, body: ResolveProductResponse): ProductInfo | undefined {
  const source = body.product ?? body.candidates?.[0];
  if (!source) return undefined;
  const rawCategory = (source as { category?: string | null }).category ?? null;
  const mappedCategory = mapSingleCategory(rawCategory);
  const allergensTags = body.product?.allergens_json?.allergensTags;
  const per100g = body.product?.nutrition_json?.per100g;
  return {
    name: source.name || 'Produit inconnu',
    brand: source.brand ?? undefined,
    category: mappedCategory,
    image_url: source.image_url ?? undefined,
    ingredients: body.product?.ingredients_text ?? undefined,
    nutrition: per100g
      ? {
          // Backend stores kcal directly ; map back to OFF's `energy_100g`
          // shape so existing consumers don't change.
          energy_100g: per100g.energyKcal,
          proteins_100g: per100g.proteinG,
          carbohydrates_100g: per100g.carbsG,
          fat_100g: per100g.fatG,
        }
      : undefined,
    allergens: allergensTags?.map((tag) => tag.replace(/^(en|fr):/, '')),
    barcode,
    suggested_unit: suggestUnitForCategory(mappedCategory),
  };
}

export const useBarcodeAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductInfo = async (barcode: string): Promise<BarcodeAPIResponse> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<ResolveProductResponse>('/products/resolve', { barcode });
      if (data.kind === 'not_found') {
        return { status: 0, error: 'Produit non trouvé' };
      }
      const product = adaptBackendProduct(barcode, data);
      return product ? { status: 1, product } : { status: 0, error: 'Réponse vide' };
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erreur réseau';
      setError(message);
      return { status: 0, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchProductInfo,
    loading,
    error,
  };
};
