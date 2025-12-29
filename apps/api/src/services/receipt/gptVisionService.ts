/**
 * GPT Vision Service - Receipt OCR via GPT-4o-mini
 * Phase A Implementation: Scan French grocery receipts
 */
import OpenAI from 'openai';
import { ReceiptScanResult, ScannedProduct } from '../../types/receipt.types.js';

const RECEIPT_SCAN_PROMPT = `Tu es un expert en analyse de tickets de caisse français.

TACHE: Extraire TOUS les produits alimentaires de ce ticket de caisse.

REGLES STRICTES:
1. IGNORER les lignes non-alimentaires:
   - Sacs plastiques, sacs cabas
   - Cartes fidelite, bons de reduction
   - TVA, sous-totaux
   - Lignes "TOTAL", "SUBTOTAL", "PAYE", "RENDU"

2. NORMALISER les abbreviations courantes:
   - LAI = Lait
   - BEUR = Beurre
   - YAOU = Yaourt
   - TOM = Tomate
   - POM = Pomme
   - PDT = Pommes de terre
   - NAT = Nature
   - 1/2 EC = Demi-ecreme
   - ENT = Entier
   - FR = Frais
   - BIO = Biologique
   - SURG = Surgele

3. EXTRAIRE pour chaque produit:
   - raw_name: texte EXACT du ticket
   - normalized_name: nom complet normalise en francais
   - quantity: nombre d'unites (defaut: 1)
   - unit_price: prix unitaire si visible
   - total_price: prix total de la ligne
   - confidence: 0.0 a 1.0 (certitude de l'extraction)

4. IDENTIFIER le magasin et la date si visibles

FORMAT DE REPONSE (JSON strict):
{
  "store": "Nom du magasin ou null",
  "date": "YYYY-MM-DD ou null",
  "products": [
    {
      "raw_name": "LAI 1/2 EC 1L",
      "normalized_name": "Lait demi-ecreme 1L",
      "quantity": 2,
      "unit_price": 1.15,
      "total_price": 2.30,
      "confidence": 0.95
    }
  ],
  "subtotal": 45.67,
  "total": 45.67
}`;

export class GPTVisionService {
  private openai: OpenAI;
  private model = 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Scan a receipt image and extract products
   * @param imageUrl URL of the receipt image (public URL or base64 data URI)
   */
  async scanReceipt(imageUrl: string): Promise<ReceiptScanResult> {
    const startTime = Date.now();

    try {
      console.log('[GPTVision] Starting receipt scan...');

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: RECEIPT_SCAN_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from GPT Vision');
      }

      const parsed = JSON.parse(content);
      const processingTime = Date.now() - startTime;

      // Estimate cost (approximate pricing for gpt-4o-mini)
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      // gpt-4o-mini pricing: $0.00015/1K input, $0.0006/1K output
      const cost = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000;

      console.log(`[GPTVision] Scan completed: ${parsed.products?.length || 0} products found in ${processingTime}ms`);

      return {
        success: true,
        data: {
          store: parsed.store || null,
          date: parsed.date || null,
          products: this.validateProducts(parsed.products || []),
          subtotal: parsed.subtotal || null,
          total: parsed.total || null,
        },
        metadata: {
          processing_time_ms: processingTime,
          gpt_model: this.model,
          gpt_cost_usd: cost,
          tokens_used: {
            input: inputTokens,
            output: outputTokens,
          },
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('[GPTVision] Scan error:', error);

      return {
        success: false,
        error: {
          code: 'GPT_VISION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          processing_time_ms: processingTime,
          gpt_model: this.model,
          gpt_cost_usd: 0,
        },
      };
    }
  }

  /**
   * Scan receipt from base64 image data
   */
  async scanReceiptFromBase64(base64Data: string, mimeType: string = 'image/jpeg'): Promise<ReceiptScanResult> {
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    return this.scanReceipt(dataUri);
  }

  /**
   * Validate and normalize products from GPT response
   */
  private validateProducts(products: unknown[]): ScannedProduct[] {
    return products
      .filter((p): p is Record<string, unknown> => p !== null && typeof p === 'object')
      .filter((p) => p.normalized_name)
      .map((p) => ({
        raw_name: String(p.raw_name || ''),
        normalized_name: String(p.normalized_name || ''),
        quantity: Number(p.quantity) || 1,
        unit_price: p.unit_price !== undefined ? Number(p.unit_price) : undefined,
        total_price: Number(p.total_price) || 0,
        confidence: Math.min(1, Math.max(0, Number(p.confidence) || 0.5)),
      }));
  }
}

// Singleton instance
let instance: GPTVisionService | null = null;

export function getGPTVisionService(): GPTVisionService {
  if (!instance) {
    instance = new GPTVisionService();
  }
  return instance;
}

export default GPTVisionService;
