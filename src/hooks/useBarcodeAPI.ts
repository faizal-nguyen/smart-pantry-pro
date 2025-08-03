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
}

export interface BarcodeAPIResponse {
  status: number;
  product?: ProductInfo;
  error?: string;
}

export const useBarcodeAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const product: ProductInfo = {
          name: data.product.product_name || data.product.product_name_en || data.product.product_name_fr || 'Produit inconnu',
          brand: data.product.brands || data.product.brand_owner,
          category: data.product.categories_tags?.[0]?.replace('en:', '').replace('fr:', '') || data.product.categories,
          image_url: data.product.image_front_url || data.product.image_url,
          ingredients: data.product.ingredients_text || data.product.ingredients_text_en || data.product.ingredients_text_fr,
          nutrition: {
            energy_100g: data.product.nutriments?.energy_100g,
            proteins_100g: data.product.nutriments?.proteins_100g,
            carbohydrates_100g: data.product.nutriments?.carbohydrates_100g,
            fat_100g: data.product.nutriments?.fat_100g,
          },
          allergens: data.product.allergens_tags?.map((tag: string) => tag.replace('en:', '').replace('fr:', '')),
          barcode: barcode
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