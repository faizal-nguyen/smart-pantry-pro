/**
 * Shopping / inventory free-text parser.
 *
 * Used by:
 *   - `POST /api/shopping/parse-text` (the shopping list voice/text flow)
 *   - `TextBulkAddDialog` on the inventory page (bulk "type a list and
 *     add it to the pantry" UX, 2026-05-17).
 *
 * Strategy: OpenAI `gpt-4o-mini` with structured output (JSON schema,
 * strict mode). Tuned for short French ingredient lists. Cost target
 * for a typical 4-10 item request: ~0.014¢ (300 in / 150 out tokens).
 *
 * Falls back to a deterministic demo payload when OPENAI_API_KEY is
 * not configured — keeps the dev UX honest (the caller can show a
 * "demo mode" banner) without crashing the route.
 */
import OpenAI from 'openai';
import { ShoppingTextBody } from '@smart/shared';
import type { ShoppingTextBodyT } from '@smart/shared';

export interface ParsedShoppingItem {
  productName: string;
  quantity: number;
  unit: string;
  category: string;
  storeSection?: string;
  confidence: number;
}

export interface ParseShoppingTextResult {
  items: ParsedShoppingItem[];
  originalText: string;
  demo: boolean;
  error?: string;
}

const SYSTEM_PROMPT = `Tu es un parseur d'ingrédients culinaires en français.
On te donne un texte libre (liste séparée par des virgules, sauts de ligne, ou
phrase courante). Tu extrais chaque produit distinct sous forme JSON structuré.

Règles strictes :
- productName : nom canonique en français, au singulier sauf si le pluriel est
  naturel (ex: "tomates", "œufs"). Pas d'article, pas de majuscule.
- quantity : nombre décimal. Si le texte ne précise rien, retourne 1.
  Convertis les fractions ("un demi-kilo" -> 0.5).
- unit : minuscules, parmi {"unité","g","kg","ml","cl","L","paquet","boîte",
  "bouteille","sachet","pot","gousse","branche","tranche","pincée"}.
  RÈGLE DE DÉFAUT : retourne TOUJOURS "unité" sauf si le texte spécifie
  explicitement un poids, un volume ou un contenant. N'INFÈRE JAMAIS une
  unité de poids ou de volume basée sur le type de produit.
    - "curcuma" -> unit="unité" (le texte ne dit pas de poids)
    - "tomates" -> unit="unité" (pas de poids spécifié)
    - "lait" -> unit="unité" (pas de volume spécifié)
    - "2kg tomates" -> unit="kg" (explicite)
    - "500g farine" -> unit="g" (explicite)
    - "1L lait" -> unit="L" (explicite)
    - "paquet de pâtes" -> unit="paquet" (contenant explicite)
- category : une des valeurs {"Fruits/Légumes","Viandes","Poissons",
  "Produits laitiers","Épicerie","Surgelés","Boissons","Hygiène","Autres"}.
  Utilise "Épicerie" pour les épices, condiments, huiles, vinaigres, farines,
  sucres, conserves.
- confidence : 0.0 à 1.0. Réduis si l'ingrédient est ambigu ou inhabituel.
- Ignore les mots de liaison ("et", "puis", "avec", "ainsi que").
- Ne dédoublonne pas : si l'utilisateur cite deux fois le même produit avec
  des quantités différentes, additionne (même nom + même unité).
- Ne rajoute jamais d'ingrédients absents du texte.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['productName', 'quantity', 'unit', 'category', 'confidence'],
        properties: {
          productName: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          category: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    },
  },
} as const;

const DEMO_FALLBACK: ParsedShoppingItem[] = [
  { productName: 'tomates', quantity: 2, unit: 'kg', category: 'Fruits/Légumes', confidence: 0.9 },
  { productName: 'lait', quantity: 1, unit: 'L', category: 'Produits laitiers', confidence: 0.8 },
];

export async function parseShoppingText(
  input: ShoppingTextBodyT,
): Promise<ParseShoppingTextResult> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    return {
      items: DEMO_FALLBACK,
      originalText: input.text,
      demo: true,
      error: 'OPENAI_API_KEY not configured',
    };
  }

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_PARSE_TEXT_MODEL ?? 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input.text },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'parsed_ingredients',
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return {
        items: [],
        originalText: input.text,
        demo: false,
        error: 'Empty response from OpenAI',
      };
    }

    const parsed = JSON.parse(raw) as { items?: ParsedShoppingItem[] };
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    // Final sanity pass: clamp out-of-range confidence, default empty
    // strings to safe values. The strict schema already enforces shape.
    const cleaned: ParsedShoppingItem[] = items
      .map(it => ({
        productName: (it.productName ?? '').trim(),
        quantity: Number.isFinite(it.quantity) ? Math.max(0, it.quantity) : 1,
        unit: (it.unit ?? 'unité').trim() || 'unité',
        category: (it.category ?? 'Autres').trim() || 'Autres',
        confidence: Number.isFinite(it.confidence)
          ? Math.min(1, Math.max(0, it.confidence))
          : 0.5,
      }))
      .filter(it => it.productName.length > 0);

    return {
      items: cleaned,
      originalText: input.text,
      demo: false,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[parseShoppingText] OpenAI error:', message);
    return {
      items: [],
      originalText: input.text,
      demo: false,
      error: message,
    };
  }
}

// Re-export to keep the import surface in the route untouched.
export { ShoppingTextBody };
