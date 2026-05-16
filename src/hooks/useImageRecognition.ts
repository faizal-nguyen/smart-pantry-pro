import { useState, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';

import { apiGet, ApiError } from '@/lib/api';

interface BackendResolveResponse {
  kind: 'matched' | 'created' | 'ambiguous' | 'not_found';
  product?: {
    name: string;
    brand?: string | null;
    image_url?: string | null;
    category?: string | null;
    nutrition_json?: {
      per100g?: {
        energyKcal?: number;
        proteinG?: number;
        carbsG?: number;
        fatG?: number;
      };
    } | null;
  };
  candidates?: Array<{
    name: string;
    brand?: string | null;
    image_url?: string | null;
    category?: string | null;
  }>;
}

export interface RecognitionResult {
  success: boolean;
  product?: {
    id: string;
    name: string;
    brand?: string;
    barcode?: string;
    image_url?: string;
    unit?: string;
    category?: string;
    nutrition?: {
      calories: number;
      proteins: number;
      carbs: number;
      fats: number;
    };
  };
  confidence?: number;
  error?: string;
}

export function useImageRecognition() {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const supabase = useSupabaseClient();
  const user = useUser();

  /**
   * Recognize product from image using AI
   */
  const recognizeImage = useCallback(async (
    imageBlob: Blob
  ): Promise<RecognitionResult> => {
    if (!user) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    setIsRecognizing(true);

    try {
      // Convert blob to base64
      const base64 = await blobToBase64(imageBlob);

      // Call vision API endpoint
      const response = await fetch('/api/vision-recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          image: base64,
          mode: 'product_recognition'
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Trop de requêtes. Réessayez dans quelques instants.');
        }
        throw new Error('Erreur lors de la reconnaissance');
      }

      const result = await response.json();

      if (result.success && result.product) {
        // Try to find product in database
        const { data: existingProduct } = await supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${result.product.name}%,barcode.eq.${result.product.barcode}`)
          .single();

        if (existingProduct) {
          result.product = {
            ...existingProduct,
            ...result.product,
            id: existingProduct.id
          };
        } else {
          // Create new product if not found
          const { data: newProduct, error } = await supabase
            .from('products')
            .insert({
              name: result.product.name,
              brand: result.product.brand,
              barcode: result.product.barcode,
              image_url: result.product.image_url,
              unit: result.product.unit || 'unité',
              category: result.product.category
            })
            .select()
            .single();

          if (!error && newProduct) {
            result.product.id = newProduct.id;
          }
        }
      }

      setLastResult(result);
      return result;

    } catch (error: any) {
      console.error('Recognition error:', error);
      const errorResult = {
        success: false,
        error: error.message || 'Erreur lors de la reconnaissance'
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsRecognizing(false);
    }
  }, [user, supabase]);

  /**
   * Recognize barcode from image
   */
  const recognizeBarcode = useCallback(async (
    imageBlob: Blob
  ): Promise<string | null> => {
    try {
      const base64 = await blobToBase64(imageBlob);

      const response = await fetch('/api/vision-recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          image: base64,
          mode: 'barcode_scan'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors du scan');
      }

      const result = await response.json();
      
      return result.barcode || null;

    } catch (error) {
      console.error('Barcode scan error:', error);
      return null;
    }
  }, [supabase]);

  /**
   * Extract text from image (OCR)
   */
  const extractText = useCallback(async (
    imageBlob: Blob
  ): Promise<string | null> => {
    try {
      const base64 = await blobToBase64(imageBlob);

      const response = await fetch('/api/vision-recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          image: base64,
          mode: 'text_extraction'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'extraction');
      }

      const result = await response.json();
      
      return result.text || null;

    } catch (error) {
      console.error('Text extraction error:', error);
      return null;
    }
  }, [supabase]);

  /**
   * Search product by barcode via the Product Intelligence proxy.
   *
   * PRP-225 PR4 — the direct OpenFoodFacts fetch is replaced by
   * `/api/products/resolve?barcode=…` which centralises every OFF call
   * behind a durable cache + rate-limited server client.
   */
  const searchByBarcode = useCallback(async (
    barcode: string
  ): Promise<RecognitionResult> => {
    try {
      const data = await apiGet<BackendResolveResponse>('/products/resolve', { barcode });

      if (data.kind === 'not_found') {
        return { success: false, error: 'Produit non trouvé' };
      }

      const source = data.product ?? data.candidates?.[0];
      if (!source) {
        return { success: false, error: 'Produit non trouvé' };
      }

      const per100g = data.product?.nutrition_json?.per100g;
      return {
        success: true,
        product: {
          id: barcode,
          name: source.name || 'Produit inconnu',
          brand: source.brand ?? undefined,
          barcode,
          image_url: source.image_url ?? undefined,
          category: source.category ?? undefined,
          nutrition: per100g
            ? {
                calories: Math.round(per100g.energyKcal ?? 0),
                proteins: Math.round(per100g.proteinG ?? 0),
                carbs: Math.round(per100g.carbsG ?? 0),
                fats: Math.round(per100g.fatG ?? 0),
              }
            : undefined,
        },
        confidence: 1.0,
      };
    } catch (error) {
      if (!(error instanceof ApiError)) {
        console.error('Barcode search error:', error);
      }
      return { success: false, error: 'Erreur lors de la recherche' };
    }
  }, []);

  return {
    isRecognizing,
    lastResult,
    recognizeImage,
    recognizeBarcode,
    extractText,
    searchByBarcode
  };
}

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data:image/jpeg;base64, prefix
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}