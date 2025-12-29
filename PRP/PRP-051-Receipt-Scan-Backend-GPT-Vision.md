# PRP-051: Scan de Ticket - Backend GPT Vision Service & API

**Product**: Smart Pantry Pro
**Feature**: Receipt Scanning Backend & AI Processing
**Version**: 1.0
**Date**: 21 Octobre 2025
**Status**: 🟢 Ready for Development
**Durée estimée**: 3 jours
**Prérequis**: PRP-050 (Infrastructure & Database)
**Phase**: Backend Core (Phase 2/6)

---

## 📌 Objectif

Développer le service backend de traitement des tickets de caisse utilisant GPT-4 Vision pour l'extraction des produits, avec gestion robuste des erreurs, retry logic, et optimisation des coûts.

---

## 🎯 Scope

### ✅ In Scope
- Service `gptVisionService.ts` avec OpenAI GPT-4 Vision API
- Prompt engineering optimisé pour tickets français
- API `/api/receipts/scan` (Vercel Edge Function)
- Parsing et validation des réponses JSON
- Gestion erreurs, timeout, retry avec exponential backoff
- Calcul des coûts API
- Tests unitaires complets
- Rate limiting par utilisateur

### ❌ Out of Scope
- Upload d'images (PRP-052)
- Enrichissement OpenFoodFacts (PRP-054)
- Composants frontend (PRP-053)
- Analytics events (PRP-055)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Frontend (PRP-053)                  │
└────────────────┬────────────────────────────┘
                 │ POST /api/receipts/scan
                 │ { imageUrl, userId }
                 ▼
┌─────────────────────────────────────────────┐
│   Vercel Edge Function                      │
│   /api/receipts/scan                        │
│   ├─ Rate limiting check                    │
│   ├─ Input validation                       │
│   └─ Call gptVisionService                  │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   gptVisionService.ts                       │
│   ├─ Prepare prompt (French optimized)     │
│   ├─ Call OpenAI GPT-4 Vision              │
│   ├─ Parse & validate JSON response        │
│   ├─ Retry logic (exponential backoff)     │
│   └─ Calculate API cost                    │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   OpenAI GPT-4 Vision API                   │
│   Model: gpt-4o-mini (cost-effective)      │
└─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   Response Processor                        │
│   ├─ Normalize product names               │
│   ├─ Parse French numbers (3,50 → 3.50)    │
│   ├─ Validate quantities & units           │
│   └─ Store in receipt_scan_history         │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Implémentation

### 1. Service GPT Vision

Créer `src/services/vision/gptVisionService.ts`:

```typescript
import OpenAI from 'openai';
import { receiptScanConfig } from '@/config/receiptScan';

// Types pour la réponse GPT
export interface GPTReceiptProduct {
  raw_name: string;
  normalized_name: string;
  quantity: number;
  unit: string;
  price: number;
  line_number: number;
  confidence?: number;
}

export interface GPTReceiptResponse {
  store: string;
  date: string; // YYYY-MM-DD
  total: number;
  currency: string;
  products: GPTReceiptProduct[];
}

export interface ReceiptScanResult {
  success: boolean;
  data?: GPTReceiptResponse;
  error?: {
    code: string;
    message: string;
    retry_allowed: boolean;
  };
  metadata: {
    processing_time_ms: number;
    gpt_cost_usd: number;
    gpt_model: string;
    confidence_avg?: number;
  };
}

// Prompt optimisé pour tickets français
const RECEIPT_SCAN_PROMPT = `Tu es un assistant expert en analyse de tickets de caisse français.
Extrais TOUS les produits alimentaires, quantités et prix de ce ticket avec une précision maximale.

FORMAT DE SORTIE (JSON strict) :
{
  "store": "Nom du magasin (Carrefour, Leclerc, Auchan, Lidl, Intermarché, Monoprix, Casino, etc.)",
  "date": "YYYY-MM-DD",
  "total": 45.67,
  "currency": "EUR",
  "products": [
    {
      "raw_name": "Texte exact tel qu'écrit sur le ticket",
      "normalized_name": "Nom complet et clair du produit en français correct",
      "quantity": 1.5,
      "unit": "kg" | "L" | "pièce" | "g" | "unité" | "cl",
      "price": 4.50,
      "line_number": 1
    }
  ]
}

RÈGLES STRICTES :

1. NORMALISATION DES NOMS
   Déduis les noms complets même si abrégés sur le ticket.
   Exemples :
   - "TOM GRAPPE" → "Tomates en grappe"
   - "PAIN COMPL" → "Pain complet"
   - "LAI 1/2 EC" → "Lait demi-écrémé"
   - "BIO BANANE" → "Bananes bio"
   - "POMM GOLDE" → "Pommes Golden"

2. QUANTITÉS ET UNITÉS
   - Si "2x Pain" → quantity: 2, unit: "pièce"
   - Si "1.5kg" ou "1,5 KG" → quantity: 1.5, unit: "kg"
   - Si "500g" → quantity: 500, unit: "g" (ou convertir en kg si pertinent)
   - Si pas de quantité visible → quantity: 1, unit: "unité"
   - Si "x2" ou "X 2" → quantity: 2

3. FORMAT DES PRIX (FRANÇAIS)
   - "3,50" → 3.50
   - "1.234,56" → 1234.56
   - "12€50" → 12.50
   - Toujours retourner en format décimal avec point

4. LIGNES À IGNORER
   - Lignes "TOTAL", "TOTAL TTC", "TVA", "CB", "CARTE", "Merci"
   - Numéros de caisse, date/heure de paiement
   - Publicités, promotions vides, codes-barres
   - "Rendu monnaie", "Espèces", "Vous avez économisé"
   - Lignes de réduction globales (sauf si lié à un produit)

5. DATE DU TICKET
   - Extraire au format YYYY-MM-DD
   - Formats courants: "03/10/2025", "03.10.25", "2025-10-03"

6. MAGASIN
   - Identifier le nom de l'enseigne en haut du ticket
   - Normaliser: "CARREFOUR MARKET" → "Carrefour Market"

7. CONFIANCE
   - Si une ligne est illisible ou ambiguë, SKIP plutôt que deviner
   - Minimum 60% de confiance pour inclure un produit

CONTEXTE :
- Tickets de supermarchés français
- Produits alimentaires courants
- Formats de prix européens (virgule = décimales)

Retourne UNIQUEMENT le JSON, sans commentaire ni texte additionnel.`;

class GPTVisionService {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = receiptScanConfig.gpt.model;
  }

  /**
   * Analyse une image de ticket de caisse avec GPT-4 Vision
   */
  async scanReceipt(imageUrl: string): Promise<ReceiptScanResult> {
    const startTime = Date.now();

    try {
      const response = await this.callGPTVision(imageUrl);
      const processingTime = Date.now() - startTime;

      // Parser la réponse JSON
      const parsedData = this.parseGPTResponse(response.content);

      // Calculer le coût
      const cost = this.calculateCost(
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );

      // Calculer confiance moyenne
      const confidenceAvg = parsedData.products.length > 0
        ? parsedData.products.reduce((acc, p) => acc + (p.confidence || 0.8), 0) / parsedData.products.length
        : 0;

      return {
        success: true,
        data: parsedData,
        metadata: {
          processing_time_ms: processingTime,
          gpt_cost_usd: cost,
          gpt_model: this.model,
          confidence_avg: confidenceAvg,
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: this.handleError(error),
        metadata: {
          processing_time_ms: processingTime,
          gpt_cost_usd: 0,
          gpt_model: this.model,
        },
      };
    }
  }

  /**
   * Appel à l'API GPT-4 Vision avec retry
   */
  private async callGPTVision(
    imageUrl: string,
    retryCount = 0
  ): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: RECEIPT_SCAN_PROMPT,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high', // Haute résolution pour meilleure précision
                },
              },
            ],
          },
        ],
        max_tokens: receiptScanConfig.gpt.maxTokens,
        temperature: receiptScanConfig.gpt.temperature,
        response_format: { type: 'json_object' }, // Forcer JSON
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from GPT');
      }

      return {
        content,
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
        },
      };

    } catch (error: any) {
      // Retry logic avec exponential backoff
      if (retryCount < receiptScanConfig.processing.maxRetries) {
        const delay = receiptScanConfig.processing.retryDelayMs * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callGPTVision(imageUrl, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Parse et valide la réponse JSON de GPT
   */
  private parseGPTResponse(jsonString: string): GPTReceiptResponse {
    try {
      const data = JSON.parse(jsonString);

      // Validation basique
      if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Invalid response format: missing products array');
      }

      // Normaliser les prix français (virgule → point)
      data.products = data.products.map((p: any) => ({
        ...p,
        price: this.parseFrenchNumber(p.price),
        quantity: this.parseFrenchNumber(p.quantity),
      }));

      data.total = this.parseFrenchNumber(data.total);

      // Filtrer produits avec confiance faible
      data.products = data.products.filter((p: GPTReceiptProduct) =>
        (p.confidence || 0.8) >= receiptScanConfig.processing.minConfidenceScore
      );

      return data;

    } catch (error) {
      throw new Error(`Failed to parse GPT response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convertit format français (virgule) en nombre
   */
  private parseFrenchNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;

    // Gérer formats: "3,50", "1.234,56", "12€50"
    const cleaned = value
      .replace(/€/g, '')
      .replace(/\s/g, '')
      .trim();

    // Si contient virgule ET point: "1.234,56" → "1234.56"
    if (cleaned.includes(',') && cleaned.includes('.')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }

    // Si contient seulement virgule: "3,50" → "3.50"
    if (cleaned.includes(',')) {
      return parseFloat(cleaned.replace(',', '.'));
    }

    return parseFloat(cleaned) || 0;
  }

  /**
   * Calcule le coût de l'appel API
   */
  private calculateCost(promptTokens: number, completionTokens: number): number {
    // Prix GPT-4o-mini (Octobre 2024)
    const INPUT_COST_PER_1M = 0.15;  // $0.15 / 1M tokens
    const OUTPUT_COST_PER_1M = 0.60; // $0.60 / 1M tokens

    const inputCost = (promptTokens / 1_000_000) * INPUT_COST_PER_1M;
    const outputCost = (completionTokens / 1_000_000) * OUTPUT_COST_PER_1M;

    return parseFloat((inputCost + outputCost).toFixed(6));
  }

  /**
   * Gestion des erreurs avec classification
   */
  private handleError(error: any): {
    code: string;
    message: string;
    retry_allowed: boolean;
  } {
    // Erreur OpenAI API
    if (error.code === 'rate_limit_exceeded') {
      return {
        code: 'RATE_LIMIT',
        message: 'Trop de requêtes. Veuillez réessayer dans quelques instants.',
        retry_allowed: true,
      };
    }

    if (error.code === 'invalid_api_key') {
      return {
        code: 'INVALID_API_KEY',
        message: 'Configuration API invalide.',
        retry_allowed: false,
      };
    }

    // Timeout
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        code: 'GPT_TIMEOUT',
        message: 'Le traitement a pris trop de temps. Réessayez avec une image plus claire.',
        retry_allowed: true,
      };
    }

    // Erreur parsing
    if (error.message?.includes('parse')) {
      return {
        code: 'SCAN_FAILED',
        message: 'Impossible de lire le ticket. Assurez-vous qu\'il est bien visible et éclairé.',
        retry_allowed: true,
      };
    }

    // Erreur générique
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Une erreur est survenue. Veuillez réessayer.',
      retry_allowed: true,
    };
  }
}

// Export singleton
let gptVisionServiceInstance: GPTVisionService | null = null;

export function getGPTVisionService(): GPTVisionService {
  if (!gptVisionServiceInstance) {
    gptVisionServiceInstance = new GPTVisionService();
  }
  return gptVisionServiceInstance;
}

export { GPTVisionService };
```

---

### 2. API Route - Vercel Edge Function

Créer `pages/api/receipts/scan.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getGPTVisionService } from '@/services/vision/gptVisionService';
import { receiptScanConfig } from '@/config/receiptScan';

// Rate limiting simple (en production: utiliser Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `receipt_scan:${userId}`;
  const limit = rateLimitStore.get(key);

  // Reset si expiré
  if (limit && now > limit.resetAt) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key) || { count: 0, resetAt: now + 3600000 }; // 1h

  if (current.count >= receiptScanConfig.rateLimit.perHour) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  // Incrémenter
  current.count++;
  rateLimitStore.set(key, current);

  return { allowed: true };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Seul POST autorisé
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Authentification
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 2. Validation input
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid imageUrl' });
    }

    // 3. Rate limiting
    const rateLimitCheck = checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        retry_after: rateLimitCheck.retryAfter,
      });
    }

    // 4. Créer entrée dans receipt_scan_history (status: processing)
    const { data: scanRecord, error: insertError } = await supabase
      .from('receipt_scan_history')
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        scan_status: 'processing',
      })
      .select()
      .single();

    if (insertError || !scanRecord) {
      throw new Error('Failed to create scan record');
    }

    // 5. Appeler GPT Vision
    const gptService = getGPTVisionService();
    const result = await gptService.scanReceipt(imageUrl);

    // 6. Mettre à jour le record selon le résultat
    if (result.success && result.data) {
      await supabase
        .from('receipt_scan_history')
        .update({
          scan_status: 'success',
          store_name: result.data.store,
          scan_date: result.data.date,
          total_amount: result.data.total,
          currency: result.data.currency,
          products_count: result.data.products.length,
          gpt_model_used: result.metadata.gpt_model,
          gpt_cost_usd: result.metadata.gpt_cost_usd,
          processing_time_ms: result.metadata.processing_time_ms,
        })
        .eq('id', scanRecord.id);

      // 7. Retourner les produits au frontend
      return res.status(200).json({
        success: true,
        scan_id: scanRecord.id,
        data: result.data,
        meta: result.metadata,
      });
    } else {
      // Échec du scan
      await supabase
        .from('receipt_scan_history')
        .update({
          scan_status: 'failed',
          error_code: result.error?.code,
          error_message: result.error?.message,
          processing_time_ms: result.metadata.processing_time_ms,
        })
        .eq('id', scanRecord.id);

      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

  } catch (error: any) {
    console.error('Receipt scan error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur interne est survenue.',
        retry_allowed: true,
      },
    });
  }
}

// Configuration Edge Runtime (optionnel, pour performance)
export const config = {
  runtime: 'nodejs', // ou 'edge' si compatible
  maxDuration: 30, // 30s timeout
};
```

---

## 🧪 Tests Unitaires

Créer `src/services/vision/__tests__/gptVisionService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GPTVisionService } from '../gptVisionService';

describe('GPTVisionService', () => {
  let service: GPTVisionService;

  beforeEach(() => {
    service = new GPTVisionService('test-api-key');
  });

  describe('parseFrenchNumber', () => {
    it('should parse French decimal format', () => {
      // @ts-ignore - accessing private method for testing
      expect(service.parseFrenchNumber('3,50')).toBe(3.50);
      expect(service.parseFrenchNumber('1.234,56')).toBe(1234.56);
      expect(service.parseFrenchNumber('12€50')).toBe(12.50);
    });

    it('should handle already parsed numbers', () => {
      // @ts-ignore
      expect(service.parseFrenchNumber(3.50)).toBe(3.50);
    });
  });

  describe('parseGPTResponse', () => {
    it('should parse valid GPT response', () => {
      const validResponse = JSON.stringify({
        store: 'Carrefour',
        date: '2025-10-21',
        total: 45.67,
        currency: 'EUR',
        products: [
          {
            raw_name: 'TOM GRAPPE',
            normalized_name: 'Tomates en grappe',
            quantity: 1.5,
            unit: 'kg',
            price: 4.50,
            line_number: 1,
            confidence: 0.95,
          },
        ],
      });

      // @ts-ignore
      const result = service.parseGPTResponse(validResponse);

      expect(result.store).toBe('Carrefour');
      expect(result.products).toHaveLength(1);
      expect(result.products[0].normalized_name).toBe('Tomates en grappe');
    });

    it('should filter low-confidence products', () => {
      const responseWithLowConfidence = JSON.stringify({
        store: 'Leclerc',
        date: '2025-10-21',
        total: 10,
        currency: 'EUR',
        products: [
          {
            raw_name: 'PROD1',
            normalized_name: 'Produit 1',
            quantity: 1,
            unit: 'pièce',
            price: 5,
            line_number: 1,
            confidence: 0.9, // Au-dessus du seuil
          },
          {
            raw_name: 'PROD2',
            normalized_name: 'Produit 2',
            quantity: 1,
            unit: 'pièce',
            price: 5,
            line_number: 2,
            confidence: 0.4, // En dessous du seuil (0.6)
          },
        ],
      });

      // @ts-ignore
      const result = service.parseGPTResponse(responseWithLowConfidence);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].normalized_name).toBe('Produit 1');
    });
  });

  describe('calculateCost', () => {
    it('should calculate API cost correctly', () => {
      // Exemple: 1000 tokens prompt, 500 tokens completion
      // GPT-4o-mini: $0.15/1M input, $0.60/1M output
      // Expected: (1000/1M * 0.15) + (500/1M * 0.60) = 0.00015 + 0.0003 = 0.00045

      // @ts-ignore
      const cost = service.calculateCost(1000, 500);

      expect(cost).toBeCloseTo(0.00045, 5);
    });
  });

  describe('handleError', () => {
    it('should classify rate limit errors', () => {
      const error = { code: 'rate_limit_exceeded' };

      // @ts-ignore
      const result = service.handleError(error);

      expect(result.code).toBe('RATE_LIMIT');
      expect(result.retry_allowed).toBe(true);
    });

    it('should classify timeout errors', () => {
      const error = { code: 'ETIMEDOUT' };

      // @ts-ignore
      const result = service.handleError(error);

      expect(result.code).toBe('GPT_TIMEOUT');
      expect(result.retry_allowed).toBe(true);
    });
  });
});
```

---

## ✅ Definition of Done

- [ ] Service `gptVisionService.ts` créé et testé
- [ ] API `/api/receipts/scan` implémentée
- [ ] Prompt GPT optimisé pour tickets français
- [ ] Retry logic avec exponential backoff fonctionnel
- [ ] Parsing des nombres français (virgule) correct
- [ ] Calcul des coûts API précis
- [ ] Rate limiting basique implémenté
- [ ] Tests unitaires passent (coverage > 80%)
- [ ] Gestion erreurs robuste
- [ ] Documentation API complétée

---

## 🧪 Tests de Validation Manuelle

### Test 1: Scan basique avec image test

```bash
# Upload image test vers Supabase Storage
# Ensuite appeler l'API

curl -X POST http://localhost:3000/api/receipts/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "imageUrl": "https://your-supabase.storage/receipts-temp/test.jpg"
  }'
```

### Test 2: Vérifier parsing français

```typescript
const testCases = [
  { input: '3,50', expected: 3.50 },
  { input: '1.234,56', expected: 1234.56 },
  { input: '12€50', expected: 12.50 },
];

testCases.forEach(({ input, expected }) => {
  const result = service.parseFrenchNumber(input);
  console.assert(result === expected, `Failed: ${input} → ${result} (expected ${expected})`);
});
```

### Test 3: Rate limiting

```bash
# Faire 11 requêtes rapides (limite: 10/h)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/receipts/scan \
    -H "Authorization: Bearer TOKEN" \
    -d '{"imageUrl": "test.jpg"}' \
    && echo "Request $i: OK" || echo "Request $i: FAILED"
done

# La 11e devrait retourner 429 Too Many Requests
```

---

## 📚 Documentation

### Exemple de Réponse API

**Success (200)**:
```json
{
  "success": true,
  "scan_id": "uuid-123",
  "data": {
    "store": "Carrefour Market",
    "date": "2025-10-21",
    "total": 45.67,
    "currency": "EUR",
    "products": [
      {
        "raw_name": "TOM GRAPPE",
        "normalized_name": "Tomates en grappe",
        "quantity": 1.5,
        "unit": "kg",
        "price": 4.50,
        "line_number": 1,
        "confidence": 0.95
      }
    ]
  },
  "meta": {
    "processing_time_ms": 3240,
    "gpt_cost_usd": 0.0042,
    "gpt_model": "gpt-4o-mini",
    "confidence_avg": 0.89
  }
}
```

**Error (500)**:
```json
{
  "success": false,
  "error": {
    "code": "SCAN_FAILED",
    "message": "Impossible de lire le ticket. Assurez-vous qu'il est bien visible.",
    "retry_allowed": true
  }
}
```

---

## 🔗 Dépendances

### Packages NPM
```json
{
  "dependencies": {
    "openai": "^4.20.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## 📝 Notes d'Implémentation

1. **Coûts GPT-4 Vision**:
   - gpt-4o-mini: ~$0.005-0.01/scan (recommandé)
   - gpt-4o: ~$0.02-0.04/scan (meilleure précision)

2. **Performance**:
   - Temps moyen: 2-5s par scan
   - Timeout recommandé: 15s
   - Rate limit: 10 scans/heure/utilisateur

3. **Optimisations futures** (hors scope):
   - Cache des résultats pour images identiques
   - Batch processing de plusieurs tickets
   - Fallback vers Tesseract OCR si GPT échoue

---

**Owner**: Faizal
**Reviewer**: Tech Lead
**Estimation**: 3 jours développeur senior
