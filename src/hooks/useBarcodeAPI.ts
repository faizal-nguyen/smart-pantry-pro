import { useState } from 'react';

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

export const useBarcodeAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour mapper les catégories Open Food Facts vers nos catégories
  const mapApiCategoryToAppCategory = (apiCategory: string): string | undefined => {
    if (!apiCategory) return undefined;
    
    const categoryMapping: { [key: string]: string } = {
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
      
      // Épicerie sucrée
      'sweets': 'Épicerie sucrée',
      'chocolate': 'Épicerie sucrée',
      'chocolates': 'Épicerie sucrée',
      'cookies': 'Épicerie sucrée',
      'biscuits': 'Épicerie sucrée',
      'candies': 'Épicerie sucrée',
      'desserts': 'Épicerie sucrée',
      'confectionery': 'Épicerie sucrée',
      'chocolate-spreads': 'Épicerie sucrée',
      'spreads': 'Épicerie sucrée',
      
      // Boissons
      'beverages': 'Boissons',
      'drinks': 'Boissons',
      'waters': 'Boissons',
      'sodas': 'Boissons',
      'juices': 'Boissons',
      'alcoholic-beverages': 'Boissons',
      
      // Surgelés
      'frozen': 'Surgelés',
      'frozen-foods': 'Surgelés',
      'ice-creams': 'Surgelés',
      
      // Épicerie salée (par défaut pour les produits alimentaires non classés)
      'snacks': 'Épicerie salée',
      'prepared-foods': 'Épicerie salée',
      'canned-foods': 'Épicerie salée',
      'pasta': 'Épicerie salée',
      'rice': 'Épicerie salée',
      'cereals': 'Épicerie salée',
      'bread': 'Épicerie salée',
      'condiments': 'Épicerie salée'
    };

    // Nettoyer la catégorie API
    const cleanCategory = apiCategory.toLowerCase()
      .replace('en:', '')
      .replace('fr:', '')
      .replace(/^fr:/, '')
      .replace(/^en:/, '');
    
    // Chercher une correspondance exacte
    if (categoryMapping[cleanCategory]) {
      return categoryMapping[cleanCategory];
    }
    
    // Chercher une correspondance partielle
    for (const [key, value] of Object.entries(categoryMapping)) {
      if (cleanCategory.includes(key) || key.includes(cleanCategory)) {
        return value;
      }
    }
    
    return undefined;
  };

  // Fonction pour suggérer une unité en fonction de la catégorie
  const suggestUnitForCategory = (category: string | undefined): string | undefined => {
    if (!category) return undefined;
    
    const unitMapping: { [key: string]: string } = {
      'Fruits et légumes': 'kg',
      'Viandes et poissons': 'kg',
      'Produits laitiers': 'L',
      'Épicerie salée': 'paquet(s)',
      'Épicerie sucrée': 'paquet(s)',
      'Surgelés': 'paquet(s)',
      'Boissons': 'L',
      'Hygiène et beauté': 'unité(s)',
      'Entretien': 'unité(s)',
      'Autres': 'unité(s)'
    };
    
    return unitMapping[category];
  };

  const fetchProductInfo = async (barcode: string): Promise<BarcodeAPIResponse> => {
    console.log('🔍 Fetching product info for barcode:', barcode);
    setLoading(true);
    setError(null);

    try {
      // API Open Food Facts
      const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
      console.log('📡 Fetching from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📦 API Response:', data);

      if (data.status === 1 && data.product) {
        // Extraire et mapper la catégorie
        const rawCategory = data.product.categories_tags?.[0] || data.product.categories;
        const mappedCategory = mapApiCategoryToAppCategory(rawCategory);
        
        console.log('🏷️ Category mapping:', { rawCategory, mappedCategory });

        const product: ProductInfo = {
          name: data.product.product_name || data.product.product_name_en || data.product.product_name_fr || 'Produit inconnu',
          brand: data.product.brands || data.product.brand_owner,
          category: mappedCategory,
          image_url: data.product.image_front_url || data.product.image_url,
          ingredients: data.product.ingredients_text || data.product.ingredients_text_en || data.product.ingredients_text_fr,
          nutrition: {
            energy_100g: data.product.nutriments?.energy_100g,
            proteins_100g: data.product.nutriments?.proteins_100g,
            carbohydrates_100g: data.product.nutriments?.carbohydrates_100g,
            fat_100g: data.product.nutriments?.fat_100g,
          },
          allergens: data.product.allergens_tags?.map((tag: string) => tag.replace('en:', '').replace('fr:', '')),
          barcode: barcode,
          suggested_unit: suggestUnitForCategory(mappedCategory)
        };

        console.log('✅ Product info processed:', product);
        return { status: 1, product };
      } else {
        console.log('❌ Product not found in Open Food Facts, trying UPC Database...');
        // Essayer l'API de secours UPC Database
        return await fetchFromUPCDatabase(barcode);
      }
    } catch (err) {
      console.error('❌ Error fetching product info:', err);
      setError('Erreur lors de la récupération des informations du produit');
      return { status: 0, error: 'Erreur réseau' };
    } finally {
      setLoading(false);
    }
  };

  const fetchFromUPCDatabase = async (barcode: string): Promise<BarcodeAPIResponse> => {
    try {
      // API de secours (UPC Database)
      const response = await fetch(`https://api.upcdatabase.org/product/${barcode}`, {
        headers: {
          'Authorization': 'Bearer YOUR_UPC_API_KEY' // Optionnel
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const product: ProductInfo = {
          name: data.title || 'Produit inconnu',
          brand: data.brand,
          category: data.category,
          barcode: barcode
        };
        return { status: 1, product };
      }
    } catch (err) {
      console.error('Error fetching from UPC Database:', err);
    }

    return { status: 0, error: 'Produit non trouvé' };
  };

  return {
    fetchProductInfo,
    loading,
    error
  };
}; 