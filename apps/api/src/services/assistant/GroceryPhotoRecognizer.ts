/**
 * Reads photos of groceries and lists the products seen, for the owner to
 * review before anything enters the stock. Writes nothing: the photos are
 * sent to the vision role (store:false at the provider) and dropped with
 * the request.
 */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AssistantModelReceipt } from '@smart/shared';

import type { AssistantModelConfig } from '../ai/ModelConfig.js';
import { ModelInvocation } from '../ai/ModelInvocation.js';
import { providerErrorSummary } from '../ai/OpenAITransport.js';
import { sniffImageMime } from '../media/ThumbnailSnapshotService.js';
import type { AICompletionClient } from '../imports/RecipeExtractionService.js';

export const MAX_PHOTOS = 4;
const MAX_ITEMS = 60;
const PROVIDER_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const PROMPT = `Tu lis des photos de courses alimentaires posees chez quelqu'un, pour remplir son stock.

Reponds UNIQUEMENT en JSON : { "items": [{ "name": string, "quantity"?: number, "unit"?: string, "brand"?: string, "expiry_date"?: "AAAA-MM-JJ", "confidence": "high" | "medium" | "low" }] }

REGLES :
- Un element par produit distinct ; regroupe les exemplaires identiques et compte-les dans "quantity".
- "name" en francais, generique et court (ex. "Lait demi-ecreme", "Pommes", "Riz basmati").
- Lis l'emballage : un poids ou un volume net imprime donne quantity + unit (g, kg, ml, cl, l). Sinon compte les exemplaires avec unit "piece", ou un contenant visible (paquet, boite, sachet, bouteille, pot, brique).
- "brand" et "expiry_date" seulement s'ils sont lisibles sur la photo.
- "confidence" : high si le produit et sa quantite sont nets, medium si l'un des deux est deduit, low si tu devines.
- Ignore ce qui n'est pas alimentaire (sacs, ticket, ustensiles). N'invente aucun produit cache ou hors champ.
- Si aucune course n'est visible, retourne { "items": [] }.`;

export type PhotoRecognitionErrorCode = 'NO_PHOTO' | 'TOO_MANY_PHOTOS' | 'UNSUPPORTED_IMAGE' | 'RECOGNITION_FAILED';
export class PhotoRecognitionError extends Error {
  constructor(readonly code: PhotoRecognitionErrorCode, message: string) { super(message); }
}

export interface RecognizedGrocery {
  name: string;
  quantity: number | null;
  unit: string | null;
  brand: string | null;
  expiry_date: string | null;
  confidence: 'high' | 'medium' | 'low';
}
export interface GroceryPhotoRecognition {
  items: RecognizedGrocery[];
  model_receipt: AssistantModelReceipt;
  duration_ms: number;
}

const text = (max: number) => z.unknown().transform(value => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);
const ItemSchema = z.object({
  name: text(120),
  quantity: z.unknown().transform(value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1e6 ? value : null),
  unit: text(40),
  brand: text(80),
  expiry_date: z.unknown().transform(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null),
  confidence: z.unknown().transform(value => value === 'high' || value === 'medium' ? value : 'low' as const),
});
const AnswerSchema = z.object({ items: z.array(z.unknown()) });

export class GroceryPhotoRecognizer {
  constructor(private readonly ai: AICompletionClient, private readonly modelConfig: AssistantModelConfig) {}

  async recognize(photos: ReadonlyArray<{ buffer: Buffer }>): Promise<GroceryPhotoRecognition> {
    if (photos.length === 0) throw new PhotoRecognitionError('NO_PHOTO', 'Ajoute au moins une photo.');
    if (photos.length > MAX_PHOTOS) throw new PhotoRecognitionError('TOO_MANY_PHOTOS', `${MAX_PHOTOS} photos au plus.`);
    const images = photos.map(({ buffer }) => {
      const mime = sniffImageMime(buffer);
      if (!mime || !PROVIDER_IMAGE_TYPES.has(mime)) throw new PhotoRecognitionError('UNSUPPORTED_IMAGE', 'Photo en JPEG, PNG ou WebP seulement.');
      return { url: `data:${mime};base64,${buffer.toString('base64')}`, detail: 'high' as const };
    });

    const started = Date.now();
    const invocation = new ModelInvocation(randomUUID(), this.modelConfig, this.ai);
    let content: string;
    try {
      const response = await invocation.complete('vision', {
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: 'Liste les courses visibles sur ces photos.', images },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }, 'grocery_photo');
      content = response.content ?? '';
    } catch (error) {
      console.warn('[assistant.photos] recognition failed:', providerErrorSummary(error));
      throw new PhotoRecognitionError('RECOGNITION_FAILED', 'La lecture des photos a échoué. Réessaie.');
    }

    let answer: z.infer<typeof AnswerSchema>;
    try { answer = AnswerSchema.parse(JSON.parse(content)); }
    catch { throw new PhotoRecognitionError('RECOGNITION_FAILED', 'La lecture des photos a échoué. Réessaie.'); }
    const items = answer.items
      .map(item => ItemSchema.safeParse(item && typeof item === 'object' ? item : {}))
      .flatMap((parsed): RecognizedGrocery[] => parsed.success && parsed.data.name ? [{
        name: parsed.data.name, quantity: parsed.data.quantity ?? null, unit: parsed.data.unit ?? null,
        brand: parsed.data.brand ?? null, expiry_date: parsed.data.expiry_date ?? null, confidence: parsed.data.confidence ?? 'low',
      }] : [])
      .slice(0, MAX_ITEMS);
    return { items, model_receipt: invocation.receipt(), duration_ms: Date.now() - started };
  }
}
