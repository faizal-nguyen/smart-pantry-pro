/**
 * Advanced Vision Service
 * Enhanced product recognition with multi-object detection, nutrition analysis, and EXIF handling
 */

import { createClient } from '@supabase/supabase-js';
import { imageOptimizer } from '@/utils/mobile-performance';
import { sanitizeInput } from '@/lib/security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface VisionProduct {
  id?: string;
  name: string;
  brand?: string;
  barcode?: string;
  category?: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  quantity?: {
    amount: number;
    unit: string;
  };
  freshness?: 'fresh' | 'good' | 'use-soon' | 'expired';
  nutritionVisible?: boolean;
}

export interface VisionAnalysisResult {
  success: boolean;
  products: VisionProduct[];
  shelfLife?: {
    estimatedDaysRemaining: number;
    confidence: number;
  };
  storageRecommendation?: string;
  totalConfidence: number;
  metadata?: {
    imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
    lighting: 'good' | 'low' | 'overexposed';
    focus: 'sharp' | 'acceptable' | 'blurry';
  };
}

export interface NutritionInfo {
  calories?: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
}

export class AdvancedVisionService {
  private apiKey: string = '';
  private model: string = 'gpt-4-vision-preview';

  constructor(_apiKey?: string) {
    // PRP-220.02: vision analysis is migrated to server-side endpoints.
    // The /api/proxy + /api/assistant pipeline will be wired in PRP-220.13.
    // Until then, calls to this service throw a clear error so consumers
    // surface the migration state instead of silently leaking credentials.
    throw new Error(
      '[PRP-220.13] AdvancedVisionService is migrated to server-side. ' +
      'See PRP/PRP-220/220.13-Services-Extraction-IA.md and ' +
      'PRP/PRP-220/220.14-Platform-Adapters-Serveur.md.'
    );
  }

  /**
   * Analyze image with advanced multi-product detection
   */
  async analyzeImage(
    imageBlob: Blob,
    options: {
      detectMultiple?: boolean;
      analyzeNutrition?: boolean;
      estimateFreshness?: boolean;
      language?: string;
    } = {}
  ): Promise<VisionAnalysisResult> {
    const {
      detectMultiple = true,
      analyzeNutrition = false,
      estimateFreshness = true,
      language = 'fr'
    } = options;

    try {
      // Strip EXIF data for privacy
      const strippedBlob = await this.stripExifData(imageBlob);
      
      // Convert to base64
      const base64 = await this.blobToBase64(strippedBlob);

      // Build analysis prompt
      const prompt = this.buildAnalysisPrompt({
        detectMultiple,
        analyzeNutrition,
        estimateFreshness,
        language
      });

      // Call OpenAI Vision API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: prompt
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64}`,
                    detail: detectMultiple ? 'high' : 'low'
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parse and validate response
      const result = this.parseVisionResponse(content);

      // Enhance with database matching
      if (result.success) {
        result.products = await this.enhanceWithDatabaseInfo(result.products);
      }

      return result;

    } catch (error) {
      console.error('Vision analysis error:', error);
      return {
        success: false,
        products: [],
        totalConfidence: 0
      };
    }
  }

  /**
   * Extract nutrition information from product label
   */
  async extractNutrition(imageBlob: Blob): Promise<NutritionInfo | null> {
    try {
      const strippedBlob = await this.stripExifData(imageBlob);
      const base64 = await this.blobToBase64(strippedBlob);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `Extract nutritional information from the image. Return as JSON:
{
  "calories": number (per serving),
  "proteins": number (grams),
  "carbs": number (grams),
  "fats": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "sodium": number (mg),
  "servingSize": "string"
}
Return null if no nutrition label is visible.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0
        })
      });

      if (!response.ok) {
        throw new Error('Nutrition extraction failed');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      try {
        const nutrition = JSON.parse(content);
        return nutrition;
      } catch {
        return null;
      }

    } catch (error) {
      console.error('Nutrition extraction error:', error);
      return null;
    }
  }

  /**
   * Detect expiry date from product image
   */
  async detectExpiryDate(imageBlob: Blob): Promise<{ date: string; confidence: number } | null> {
    try {
      const strippedBlob = await this.stripExifData(imageBlob);
      const base64 = await this.blobToBase64(strippedBlob);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `Find and extract expiry/best before date from the image.
Look for patterns like:
- DD/MM/YYYY or DD-MM-YYYY
- "À consommer avant le" / "Best before"
- "DLC" / "DLUO"
Return JSON: {"date": "YYYY-MM-DD", "confidence": 0.0-1.0}
Return null if no date found.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 100,
          temperature: 0
        })
      });

      if (!response.ok) {
        throw new Error('Expiry detection failed');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      try {
        const result = JSON.parse(content);
        if (result && result.date) {
          return {
            date: result.date,
            confidence: result.confidence || 0.8
          };
        }
      } catch {
        // Try to extract date from plain text response
        const dateMatch = content.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
          return {
            date: dateMatch[0],
            confidence: 0.6
          };
        }
      }

      return null;

    } catch (error) {
      console.error('Expiry detection error:', error);
      return null;
    }
  }

  /**
   * Strip EXIF data from image for privacy
   */
  async stripExifData(blob: Blob): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          // Draw image without EXIF
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (strippedBlob) => {
              if (strippedBlob) {
                console.log('[Privacy] EXIF data stripped from image');
                resolve(strippedBlob);
              } else {
                resolve(blob);
              }
            },
            'image/jpeg',
            0.95
          );
        } else {
          resolve(blob);
        }
      };

      img.onerror = () => resolve(blob);
      
      // Create object URL to load image
      const url = URL.createObjectURL(blob);
      img.src = url;
      
      // Clean up
      img.onload = () => {
        URL.revokeObjectURL(url);
      };
    });
  }

  /**
   * Build analysis prompt based on options
   */
  private buildAnalysisPrompt(options: any): string {
    const { detectMultiple, analyzeNutrition, estimateFreshness, language } = options;

    let prompt = `Tu es un expert en reconnaissance de produits alimentaires.
Analyse l'image et retourne les informations au format JSON.`;

    if (detectMultiple) {
      prompt += `
Détecte TOUS les produits visibles dans l'image.
Pour chaque produit, fournis:
{
  "products": [
    {
      "name": "nom du produit",
      "brand": "marque si visible",
      "category": "catégorie",
      "confidence": 0.0-1.0,
      "boundingBox": {"x": 0, "y": 0, "width": 100, "height": 100},
      "quantity": {"amount": 1, "unit": "kg/L/unité"}`;
    }

    if (estimateFreshness) {
      prompt += `,
      "freshness": "fresh|good|use-soon|expired"`;
    }

    prompt += `
    }
  ],
  "metadata": {
    "imageQuality": "excellent|good|fair|poor",
    "lighting": "good|low|overexposed",
    "focus": "sharp|acceptable|blurry"
  }
}`;

    if (language === 'fr') {
      prompt += `
Réponds uniquement avec des noms de produits en français.`;
    }

    return prompt;
  }

  /**
   * Parse Vision API response
   */
  private parseVisionResponse(content: string): VisionAnalysisResult {
    try {
      const parsed = JSON.parse(content);
      
      // Validate and sanitize response
      const products = (parsed.products || []).map((p: any) => ({
        name: sanitizeInput(p.name || 'Produit inconnu'),
        brand: p.brand ? sanitizeInput(p.brand) : undefined,
        category: p.category ? sanitizeInput(p.category) : undefined,
        confidence: Math.min(1, Math.max(0, p.confidence || 0.5)),
        boundingBox: p.boundingBox,
        quantity: p.quantity,
        freshness: p.freshness
      }));

      const totalConfidence = products.length > 0
        ? products.reduce((sum: number, p: VisionProduct) => sum + p.confidence, 0) / products.length
        : 0;

      return {
        success: true,
        products,
        totalConfidence,
        metadata: parsed.metadata
      };

    } catch (error) {
      console.error('Failed to parse vision response:', error);
      return {
        success: false,
        products: [],
        totalConfidence: 0
      };
    }
  }

  /**
   * Enhance products with database information
   */
  private async enhanceWithDatabaseInfo(products: VisionProduct[]): Promise<VisionProduct[]> {
    const enhanced = await Promise.all(
      products.map(async (product) => {
        try {
          // Search for product in database
          const { data } = await supabase
            .from('products')
            .select('*')
            .ilike('name', `%${product.name}%`)
            .limit(1)
            .single();

          if (data) {
            return {
              ...product,
              id: data.id,
              barcode: data.barcode || product.barcode,
              category: data.category || product.category
            };
          }
        } catch {
          // Product not found in database
        }

        return product;
      })
    );

    return enhanced;
  }

  /**
   * Convert blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Export singleton instance
let visionServiceInstance: AdvancedVisionService | null = null;

export function getAdvancedVisionService(_apiKey?: string): AdvancedVisionService {
  if (!visionServiceInstance) {
    visionServiceInstance = new AdvancedVisionService(apiKey);
  }
  return visionServiceInstance;
}