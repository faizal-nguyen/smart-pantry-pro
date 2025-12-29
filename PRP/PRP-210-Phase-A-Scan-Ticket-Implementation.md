# PRP-210 : Phase A - Implementation Scan Ticket de Caisse

> **Version** : 1.0.0
> **Date** : 2025-12-28
> **Duree estimee** : 3 semaines
> **Priorite** : P0 - CRITIQUE

---

## OBJECTIF

Permettre aux utilisateurs de scanner leur ticket de caisse pour ajouter automatiquement tous les produits a leur inventaire en **1 seul tap**.

```
AVANT : 9-11 taps par produit = 90-110 actions pour 10 produits
APRES : 2-3 taps TOTAL pour 20+ produits
```

---

## ARCHITECTURE TECHNIQUE

```
┌──────────────────────────────────────────────────────────────────┐
│                        MOBILE/WEB APP                             │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────────┐  │
│  │  Camera    │───▶│  Preview   │───▶│  Client Upload         │  │
│  │  Capture   │    │  & Crop    │    │  (max 2MB, JPEG 85%)   │  │
│  └────────────┘    └────────────┘    └───────────┬────────────┘  │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SUPABASE STORAGE                               │
│  Bucket: receipt-scans/{user_id}/{timestamp}.jpg                 │
│  Policy: Auto-delete after 24h                                   │
└──────────────────────────────────────────────────┬───────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                 API ENDPOINT                                      │
│  POST /api/v1/receipts/scan                                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 1. VALIDATION                                                ││
│  │    - Auth check (JWT)                                        ││
│  │    - File size < 5MB                                         ││
│  │    - Image format (JPEG, PNG, HEIC)                          ││
│  └──────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 2. GPT-4o-mini VISION                                        ││
│  │    - Prompt optimise FR                                      ││
│  │    - Extraction: store, date, products[], total              ││
│  │    - Normalisation abbreviations                             ││
│  │    - Confidence score par produit                            ││
│  └──────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 3. PRODUCT MATCHING                                          ││
│  │    ┌─────────────────┐  ┌─────────────────┐                  ││
│  │    │ Alias Database  │  │ OpenFoodFacts   │                  ││
│  │    │ (200+ entries)  │  │ Fuzzy Search    │                  ││
│  │    └────────┬────────┘  └────────┬────────┘                  ││
│  │             └───────────┬────────┘                           ││
│  │                         ▼                                     ││
│  │              ┌─────────────────────┐                          ││
│  │              │ Best Match Selection│                          ││
│  │              │ (confidence > 0.6)  │                          ││
│  │              └─────────────────────┘                          ││
│  └──────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 4. ENRICHMENT                                                ││
│  │    - Expiration date estimation                              ││
│  │    - Storage location (Frigo/Placard/Congelateur)            ││
│  │    - Category assignment                                      ││
│  │    - Nutriscore (from OFF)                                   ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                      RESPONSE                                     │
│  {                                                                │
│    success: true,                                                 │
│    data: {                                                        │
│      store: "Carrefour Market",                                   │
│      date: "2025-12-28",                                          │
│      products: [...],                                             │
│      total: 45.67                                                 │
│    },                                                             │
│    metadata: { processing_time_ms, gpt_cost_usd }                │
│  }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## STRUCTURE DES FICHIERS

### Backend (apps/api/src/)

```
apps/api/src/
├── routes/
│   └── receipts.routes.ts              # Routes scan ticket
│
├── services/
│   └── receipt/
│       ├── index.ts                    # Exports
│       ├── gptVisionService.ts         # OCR via GPT-4o-mini
│       ├── receiptParserService.ts     # Orchestration scan
│       ├── productMatcherService.ts    # Matching produits
│       ├── expirationEstimator.ts      # Estimation DLC
│       └── abbreviationDictionary.ts   # Dict abbreviations FR
│
├── types/
│   └── receipt.types.ts                # Types TypeScript
│
└── middleware/
    └── uploadMiddleware.ts             # Multer pour images
```

### Frontend (src/)

```
src/
├── services/
│   └── receipt/
│       ├── index.ts                    # Exports
│       ├── receiptScanService.ts       # Appels API
│       └── commercialAliases.ts        # Alias locaux
│
├── components/
│   └── receipt/
│       ├── index.ts                    # Exports
│       ├── ReceiptScanner.tsx          # Camera + capture
│       ├── ReceiptPreview.tsx          # Apercu image
│       ├── ProductValidationList.tsx   # Liste a valider
│       ├── ProductValidationItem.tsx   # Item individuel
│       ├── ReceiptScanFlow.tsx         # Flow complet
│       └── ScanResultSummary.tsx       # Resume final
│
├── hooks/
│   └── useReceiptScan.ts               # Hook principal
│
└── pages/
    └── ScanReceiptPage.tsx             # Page dediee
```

---

## SEMAINE 1 : INFRASTRUCTURE

### Jour 1-2 : Service GPT Vision

**Fichier : `apps/api/src/services/receipt/gptVisionService.ts`**

```typescript
import OpenAI from 'openai';
import { ReceiptScanResult, ScannedProduct } from '../../types/receipt.types';

const RECEIPT_SCAN_PROMPT = `Tu es un expert en analyse de tickets de caisse français.

TACHE: Extraire TOUS les produits alimentaires de ce ticket de caisse.

REGLES STRICTES:
1. IGNORER les lignes non-alimentaires:
   - Sacs plastiques, sacs cabas
   - Cartes fidelite, bons de reduction
   - TVA, sous-totaux

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
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async scanReceipt(imageUrl: string): Promise<ReceiptScanResult> {
    const startTime = Date.now();

    try {
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

      // Estimer le cout (approximatif)
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const cost = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000;

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
      console.error('GPT Vision scan error:', error);

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

  private validateProducts(products: any[]): ScannedProduct[] {
    return products
      .filter((p) => p && p.normalized_name)
      .map((p) => ({
        raw_name: String(p.raw_name || ''),
        normalized_name: String(p.normalized_name || ''),
        quantity: Number(p.quantity) || 1,
        unit_price: p.unit_price ? Number(p.unit_price) : undefined,
        total_price: Number(p.total_price) || 0,
        confidence: Math.min(1, Math.max(0, Number(p.confidence) || 0.5)),
      }));
  }
}

// Singleton
let instance: GPTVisionService | null = null;

export function getGPTVisionService(): GPTVisionService {
  if (!instance) {
    instance = new GPTVisionService();
  }
  return instance;
}
```

### Jour 2 : Types TypeScript

**Fichier : `apps/api/src/types/receipt.types.ts`**

```typescript
export interface ScannedProduct {
  raw_name: string;
  normalized_name: string;
  quantity: number;
  unit_price?: number;
  total_price: number;
  confidence: number;
}

export interface EnrichedProduct extends ScannedProduct {
  // Matching
  matched: boolean;
  matched_product?: {
    id?: string;
    name: string;
    barcode?: string;
    brand?: string;
    nutriscore?: string;
    image_url?: string;
  };
  match_confidence: number;
  match_method: 'alias' | 'fuzzy' | 'off_api' | 'llm' | 'none';

  // Enrichissement
  estimated_expiry_date?: string;
  suggested_location: 'frigo' | 'congelateur' | 'placard' | 'autre';
  category?: string;
}

export interface ReceiptScanResult {
  success: boolean;
  data?: {
    store: string | null;
    date: string | null;
    products: ScannedProduct[];
    subtotal: number | null;
    total: number | null;
  };
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    processing_time_ms: number;
    gpt_model: string;
    gpt_cost_usd: number;
    tokens_used?: {
      input: number;
      output: number;
    };
  };
}

export interface ReceiptProcessResult {
  success: boolean;
  data?: {
    store: string | null;
    date: string | null;
    products: EnrichedProduct[];
    total: number | null;
    stats: {
      total_products: number;
      matched_products: number;
      unmatched_products: number;
      low_confidence_products: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    processing_time_ms: number;
    gpt_cost_usd: number;
    scan_id: string;
  };
}

export interface AddToInventoryRequest {
  products: Array<{
    product_id?: string;
    name: string;
    quantity: number;
    unit?: string;
    expiry_date?: string;
    location?: 'frigo' | 'congelateur' | 'placard' | 'autre';
    category?: string;
    barcode?: string;
    nutriscore?: string;
  }>;
  receipt_scan_id?: string;
}
```

### Jour 3 : Routes API

**Fichier : `apps/api/src/routes/receipts.routes.ts`**

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { getReceiptProcessingService } from '../services/receipt';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Configuration Multer pour upload en memoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporte. Utilisez JPEG, PNG ou HEIC.'));
    }
  },
});

/**
 * POST /api/v1/receipts/scan
 * Scanner un ticket de caisse et extraire les produits
 */
router.post(
  '/scan',
  authMiddleware,
  upload.single('receipt'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'Aucun fichier fourni' },
        });
      }

      // Upload vers Supabase Storage
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );

      const fileName = `${userId}/${Date.now()}-receipt.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipt-scans')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return res.status(500).json({
          success: false,
          error: { code: 'UPLOAD_ERROR', message: 'Erreur upload image' },
        });
      }

      // Obtenir URL publique temporaire
      const { data: urlData } = supabase.storage
        .from('receipt-scans')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Traiter le ticket
      const service = getReceiptProcessingService();
      const result = await service.processReceipt(imageUrl, userId);

      // Nettoyer l'image apres traitement (optionnel, garder pour debug)
      // await supabase.storage.from('receipt-scans').remove([fileName]);

      return res.json(result);
    } catch (error) {
      console.error('Receipt scan error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne',
        },
      });
    }
  }
);

/**
 * POST /api/v1/receipts/add-to-inventory
 * Ajouter les produits scannes a l'inventaire
 */
router.post(
  '/add-to-inventory',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { products, receipt_scan_id } = req.body;

      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PRODUCTS', message: 'Liste de produits invalide' },
        });
      }

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );

      // Preparer les items pour insertion
      const inventoryItems = products.map((product: any) => ({
        user_id: userId,
        name: product.name,
        quantity: product.quantity || 1,
        unit: product.unit || 'unite',
        expiration_date: product.expiry_date || null,
        location: { zone: product.location || 'placard' },
        category: product.category || 'Autres',
        barcode: product.barcode || null,
        freshness: 1.0, // Frais (vient d'etre achete)
        created_at: new Date().toISOString(),
        metadata: {
          source: 'receipt_scan',
          receipt_scan_id: receipt_scan_id || null,
          nutriscore: product.nutriscore || null,
        },
      }));

      const { data, error } = await supabase
        .from('inventory')
        .insert(inventoryItems)
        .select();

      if (error) {
        console.error('Inventory insert error:', error);
        return res.status(500).json({
          success: false,
          error: { code: 'DB_ERROR', message: 'Erreur ajout inventaire' },
        });
      }

      return res.json({
        success: true,
        data: {
          added_count: data.length,
          items: data,
        },
      });
    } catch (error) {
      console.error('Add to inventory error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne',
        },
      });
    }
  }
);

export { router as receiptsRouter };
```

---

## SEMAINE 2 : MATCHING & ENRICHISSEMENT

### Jour 4 : Dictionnaire Abbreviations

**Fichier : `apps/api/src/services/receipt/abbreviationDictionary.ts`**

```typescript
/**
 * Dictionnaire des abbreviations courantes sur les tickets de caisse francais
 * Source: Analyse de 100+ tickets Carrefour, Leclerc, Aldi, Lidl, Intermarche
 */

export const FRENCH_RECEIPT_ABBREVIATIONS: Record<string, string[]> = {
  // ===== PRODUITS LAITIERS =====
  'LAI': ['Lait'],
  'LAI 1/2': ['Lait demi-ecreme'],
  'LAI 1/2 EC': ['Lait demi-ecreme'],
  'LAI ENT': ['Lait entier'],
  'LAI ECR': ['Lait ecreme'],
  'LAI BIO': ['Lait bio'],
  'BEUR': ['Beurre'],
  'BEUR DOUX': ['Beurre doux'],
  'BEUR 1/2 SEL': ['Beurre demi-sel'],
  'BEUR SALE': ['Beurre sale'],
  'YAOU': ['Yaourt'],
  'YAO': ['Yaourt'],
  'YAOU NAT': ['Yaourt nature'],
  'YAOU FRT': ['Yaourt aux fruits'],
  'YAOU VAN': ['Yaourt vanille'],
  'FROM': ['Fromage'],
  'FROM BL': ['Fromage blanc'],
  'FROM RAP': ['Fromage rape'],
  'CREM FR': ['Creme fraiche'],
  'CREM': ['Creme'],
  'CREM LIQ': ['Creme liquide'],
  'CREM EP': ['Creme epaisse'],
  'MOZZA': ['Mozzarella'],
  'EMMENT': ['Emmental'],
  'CAMEMB': ['Camembert'],
  'COMTE': ['Comte'],
  'GRUY': ['Gruyere'],

  // ===== OEUFS =====
  'OEUFS': ['Oeufs'],
  'OEU': ['Oeufs'],
  'OEUFS FR': ['Oeufs frais'],
  'OEUFS BIO': ['Oeufs bio'],
  'OEUFS PL': ['Oeufs plein air'],

  // ===== FRUITS & LEGUMES =====
  'TOM': ['Tomate', 'Tomates'],
  'TOM GRAPPE': ['Tomates grappe'],
  'TOM CERIS': ['Tomates cerises'],
  'TOM COEL': ['Tomates coeur de boeuf'],
  'POM': ['Pomme', 'Pommes'],
  'POM GOLD': ['Pommes Golden'],
  'POM GALA': ['Pommes Gala'],
  'POM GRANNY': ['Pommes Granny'],
  'POM PINK': ['Pommes Pink Lady'],
  'PDT': ['Pommes de terre'],
  'PDT GRE': ['Pommes de terre grenaille'],
  'BAN': ['Banane', 'Bananes'],
  'ORANG': ['Orange', 'Oranges'],
  'CITRON': ['Citron', 'Citrons'],
  'COURG': ['Courgette', 'Courgettes'],
  'AUBERG': ['Aubergine', 'Aubergines'],
  'POIV': ['Poivron', 'Poivrons'],
  'CONCOM': ['Concombre'],
  'SAL': ['Salade'],
  'SAL BATA': ['Salade batavia'],
  'SAL LAIT': ['Laitue'],
  'SAL ROM': ['Salade romaine'],
  'CARO': ['Carotte', 'Carottes'],
  'OIGN': ['Oignon', 'Oignons'],
  'AIL': ['Ail'],
  'ECHAL': ['Echalote', 'Echalotes'],
  'CHAMPIG': ['Champignon', 'Champignons'],
  'CHAMP': ['Champignon', 'Champignons'],
  'HAVER': ['Haricots verts'],
  'HAR VRT': ['Haricots verts'],
  'PETIT POI': ['Petits pois'],
  'BROCOL': ['Brocoli'],
  'CHOU FL': ['Chou-fleur'],
  'CHOU': ['Chou'],
  'EPINAR': ['Epinards'],
  'AVOC': ['Avocat'],
  'MANG': ['Mangue'],
  'ANANA': ['Ananas'],
  'FRAIS': ['Fraise', 'Fraises'],
  'FRAMB': ['Framboise', 'Framboises'],
  'MYRT': ['Myrtille', 'Myrtilles'],
  'RAISIN': ['Raisin'],
  'POIRE': ['Poire', 'Poires'],
  'PECHE': ['Peche', 'Peches'],
  'ABRIC': ['Abricot', 'Abricots'],
  'CLEM': ['Clementine', 'Clementines'],
  'MANDARI': ['Mandarine', 'Mandarines'],
  'KIWI': ['Kiwi'],
  'MELON': ['Melon'],
  'PASTEQ': ['Pasteque'],

  // ===== VIANDES =====
  'POUL': ['Poulet'],
  'POUL ENT': ['Poulet entier'],
  'FILET POUL': ['Filet de poulet'],
  'ESC POUL': ['Escalope de poulet'],
  'CUISSE POUL': ['Cuisse de poulet'],
  'AILE POUL': ['Aile de poulet'],
  'BOEUF': ['Boeuf'],
  'STEAK HACH': ['Steak hache'],
  'STEAK': ['Steak'],
  'BAVETTE': ['Bavette'],
  'ENTRECOTE': ['Entrecote'],
  'ROTI': ['Roti'],
  'ROTI PORC': ['Roti de porc'],
  'PORC': ['Porc'],
  'COTE PORC': ['Cote de porc'],
  'ECHINE': ['Echine de porc'],
  'LARD': ['Lardons'],
  'LARDON': ['Lardons'],
  'JAMB': ['Jambon'],
  'JAMB BLC': ['Jambon blanc'],
  'JAMB SEC': ['Jambon sec'],
  'JAMB CRU': ['Jambon cru'],
  'SAUCIS': ['Saucisse', 'Saucisses'],
  'SAUCIS STRAS': ['Saucisses de Strasbourg'],
  'SAUCIS TOUL': ['Saucisses de Toulouse'],
  'MERGUEZ': ['Merguez'],
  'CHIPOLATA': ['Chipolata'],
  'VEAU': ['Veau'],
  'ESC VEAU': ['Escalope de veau'],
  'AGNEAU': ['Agneau'],
  'COTE AGNEAU': ['Cote d\'agneau'],
  'DINDE': ['Dinde'],
  'ESC DINDE': ['Escalope de dinde'],
  'CANARD': ['Canard'],

  // ===== POISSONS =====
  'SAUMON': ['Saumon'],
  'SAUMON FUM': ['Saumon fume'],
  'SAUMON PAV': ['Pave de saumon'],
  'CABILLAUD': ['Cabillaud'],
  'COLIN': ['Colin'],
  'LIEU': ['Lieu'],
  'THON': ['Thon'],
  'CREVETTE': ['Crevettes'],
  'CREV': ['Crevettes'],
  'GAMBAS': ['Gambas'],
  'MOULE': ['Moules'],
  'SARDINE': ['Sardines'],
  'MAQUER': ['Maquereau'],
  'TRUITE': ['Truite'],

  // ===== EPICERIE =====
  'PAT': ['Pates'],
  'PATES': ['Pates'],
  'PAT SPAG': ['Spaghetti'],
  'PAT PENNE': ['Penne'],
  'PAT FUSIL': ['Fusilli'],
  'PAT TAGLIA': ['Tagliatelle'],
  'PAT LASAG': ['Lasagnes'],
  'RIZ': ['Riz'],
  'RIZ BASM': ['Riz basmati'],
  'RIZ LONG': ['Riz long grain'],
  'RIZ ARBOR': ['Riz arborio'],
  'RIZ COMP': ['Riz complet'],
  'SEMOUL': ['Semoule'],
  'COUSCOUS': ['Couscous'],
  'FAR': ['Farine'],
  'FARINE': ['Farine'],
  'FAR BLE': ['Farine de ble'],
  'SUC': ['Sucre'],
  'SUCRE': ['Sucre'],
  'SUC POUDR': ['Sucre en poudre'],
  'SUC GLACE': ['Sucre glace'],
  'SUC ROUX': ['Sucre roux'],
  'SEL': ['Sel'],
  'POIVRE': ['Poivre'],
  'HUIL': ['Huile'],
  'HUIL OLIV': ['Huile d\'olive'],
  'HUIL TOURN': ['Huile de tournesol'],
  'VINAIGR': ['Vinaigre'],
  'VIN BALS': ['Vinaigre balsamique'],
  'MOUTARD': ['Moutarde'],
  'MAYO': ['Mayonnaise'],
  'KETCH': ['Ketchup'],
  'SAUCE': ['Sauce'],
  'SAUCE TOM': ['Sauce tomate'],
  'CONC TOM': ['Concentre de tomate'],
  'CONSERV': ['Conserve'],
  'MAIS': ['Mais'],
  'HARIC': ['Haricots'],
  'PETIT POIS': ['Petits pois'],
  'LENTIL': ['Lentilles'],
  'POIS CHIC': ['Pois chiches'],
  'CAFE': ['Cafe'],
  'CAFE MOUL': ['Cafe moulu'],
  'CAFE CAPS': ['Capsules cafe'],
  'THE': ['The'],
  'CHOCOL': ['Chocolat'],
  'CHOCOL NOIR': ['Chocolat noir'],
  'CHOCOL LAIT': ['Chocolat au lait'],
  'NUTEL': ['Nutella'],
  'CONFITURE': ['Confiture'],
  'CONFIT': ['Confiture'],
  'MIEL': ['Miel'],
  'CEREA': ['Cereales'],
  'CEREAL': ['Cereales'],
  'BISCU': ['Biscuits'],
  'GATEAU': ['Gateau', 'Gateaux'],

  // ===== PAIN & BOULANGERIE =====
  'PAIN': ['Pain'],
  'BAGUET': ['Baguette'],
  'PAIN MIE': ['Pain de mie'],
  'PAIN COMP': ['Pain complet'],
  'PAIN CAMP': ['Pain de campagne'],
  'BRIOCH': ['Brioche'],
  'CROISS': ['Croissant'],
  'PAIN CHOC': ['Pain au chocolat'],

  // ===== BOISSONS =====
  'EAU': ['Eau'],
  'EAU MIN': ['Eau minerale'],
  'EAU GAZ': ['Eau gazeuse'],
  'EAU PLAT': ['Eau plate'],
  'JUS': ['Jus'],
  'JUS ORAN': ['Jus d\'orange'],
  'JUS POMM': ['Jus de pomme'],
  'JUS RAIS': ['Jus de raisin'],
  'JUS MULTI': ['Jus multifruits'],
  'SODA': ['Soda'],
  'COCA': ['Coca-Cola'],
  'COCA ZERO': ['Coca-Cola Zero'],
  'COCA LIGHT': ['Coca-Cola Light'],
  'PEPSI': ['Pepsi'],
  'FANTA': ['Fanta'],
  'SPRITE': ['Sprite'],
  'ORANGINA': ['Orangina'],
  'SCHWEP': ['Schweppes'],
  'PERRIER': ['Perrier'],
  'BADOIT': ['Badoit'],
  'EVIAN': ['Evian'],
  'VITTEL': ['Vittel'],
  'VOLVIC': ['Volvic'],
  'CRISTALINE': ['Cristaline'],
  'BIERE': ['Biere'],
  'VIN': ['Vin'],
  'VIN RGE': ['Vin rouge'],
  'VIN BLC': ['Vin blanc'],
  'VIN ROSE': ['Vin rose'],

  // ===== SURGELES =====
  'SURG': ['Surgele'],
  'PIZZA SURG': ['Pizza surgelee'],
  'LEGUM SURG': ['Legumes surgeles'],
  'POISSON SURG': ['Poisson surgele'],
  'GLACE': ['Glace'],
  'CREME GLAC': ['Creme glacee'],
  'SORBET': ['Sorbet'],

  // ===== MARQUES DISTRIBUTEUR =====
  'MDD': ['Marque distributeur'],
  'ECO+': ['Eco+ (Leclerc)'],
  'MARQ REP': ['Marque Repere'],
  'CARF': ['Carrefour'],
  'CARF BIO': ['Carrefour Bio'],
  'CASIN': ['Casino'],
  'AUCHAN': ['Auchan'],
  'U': ['U (Systeme U)'],
  'INTER': ['Intermarche'],
  'LIDL': ['Lidl'],
  'ALDI': ['Aldi'],
};

/**
 * Patterns pour detecter les quantites sur les tickets
 */
export const QUANTITY_PATTERNS = {
  // Format: "2 X" ou "X2" ou "2x"
  multiplier: /(\d+)\s*[xX×]\s*|\s*[xX×]\s*(\d+)/,
  // Format: "1.5 KG" ou "500G"
  weight: /(\d+[.,]?\d*)\s*(kg|g|gr|grammes?|kilos?)/i,
  // Format: "1.5L" ou "33CL"
  volume: /(\d+[.,]?\d*)\s*(l|L|cl|ml|litres?|centilitres?|millilitres?)/i,
  // Format: "6 PIECES" ou "PACK 12"
  units: /(\d+)\s*(pcs?|pieces?|unites?|pack|lot)/i,
};

/**
 * Fonction pour normaliser une ligne de ticket
 */
export function normalizeTicketLine(line: string): string {
  let normalized = line.toUpperCase().trim();

  // Parcourir le dictionnaire
  for (const [abbrev, fullNames] of Object.entries(FRENCH_RECEIPT_ABBREVIATIONS)) {
    // Creer une regex qui matche le mot entier
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    if (regex.test(normalized)) {
      // Remplacer par le premier nom complet
      normalized = normalized.replace(regex, fullNames[0]);
    }
  }

  // Normaliser la casse
  return normalized
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

### Jour 5-6 : Service Matching Produits

**Fichier : `apps/api/src/services/receipt/productMatcherService.ts`**

```typescript
import Fuse from 'fuse.js';
import { ScannedProduct, EnrichedProduct } from '../../types/receipt.types';
import { FRENCH_RECEIPT_ABBREVIATIONS, normalizeTicketLine } from './abbreviationDictionary';

interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands?: string;
  categories?: string;
  nutriscore_grade?: string;
  image_url?: string;
}

interface MatchResult {
  matched: boolean;
  confidence: number;
  method: 'alias' | 'fuzzy' | 'off_api' | 'none';
  product?: OpenFoodFactsProduct;
}

export class ProductMatcherService {
  private aliasCache: Map<string, string> = new Map();
  private offCache: Map<string, OpenFoodFactsProduct[]> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.buildAliasCache();
  }

  /**
   * Construire le cache des alias pour recherche rapide
   */
  private buildAliasCache(): void {
    for (const [abbrev, fullNames] of Object.entries(FRENCH_RECEIPT_ABBREVIATIONS)) {
      for (const name of fullNames) {
        this.aliasCache.set(abbrev.toLowerCase(), name);
      }
    }
  }

  /**
   * Matcher un produit scanne avec les bases de donnees
   */
  async matchProduct(product: ScannedProduct): Promise<MatchResult> {
    const normalizedName = product.normalized_name.toLowerCase();

    // ETAPE 1: Alias local (tres rapide)
    const aliasMatch = this.matchFromAlias(normalizedName);
    if (aliasMatch.matched && aliasMatch.confidence > 0.85) {
      return aliasMatch;
    }

    // ETAPE 2: OpenFoodFacts API (plus lent mais plus precis)
    const offMatch = await this.matchFromOpenFoodFacts(product.normalized_name);
    if (offMatch.matched && offMatch.confidence > 0.7) {
      return offMatch;
    }

    // ETAPE 3: Fuzzy matching sur les resultats OFF
    if (offMatch.product) {
      const fuzzyMatch = this.fuzzyMatch(normalizedName, [offMatch.product]);
      if (fuzzyMatch.matched) {
        return fuzzyMatch;
      }
    }

    // Pas de match fiable
    return {
      matched: false,
      confidence: 0,
      method: 'none',
    };
  }

  /**
   * Matching depuis le dictionnaire d'alias
   */
  private matchFromAlias(normalizedName: string): MatchResult {
    const words = normalizedName.split(' ');

    for (const word of words) {
      if (this.aliasCache.has(word)) {
        return {
          matched: true,
          confidence: 0.9,
          method: 'alias',
          product: {
            code: '',
            product_name: this.aliasCache.get(word)!,
          },
        };
      }
    }

    return { matched: false, confidence: 0, method: 'alias' };
  }

  /**
   * Recherche dans OpenFoodFacts
   */
  private async matchFromOpenFoodFacts(productName: string): Promise<MatchResult> {
    try {
      // Verifier le cache
      const cacheKey = productName.toLowerCase();
      if (this.offCache.has(cacheKey)) {
        const cached = this.offCache.get(cacheKey)!;
        if (cached.length > 0) {
          return {
            matched: true,
            confidence: 0.8,
            method: 'off_api',
            product: cached[0],
          };
        }
      }

      // Appel API OpenFoodFacts
      const searchTerms = encodeURIComponent(productName);
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${searchTerms}&search_simple=1&action=process&json=1&page_size=5&lc=fr`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SmartPantryPro/1.0 (contact@smartpantry.app)',
        },
      });

      if (!response.ok) {
        throw new Error(`OFF API error: ${response.status}`);
      }

      const data = await response.json();
      const products: OpenFoodFactsProduct[] = (data.products || []).map((p: any) => ({
        code: p.code || '',
        product_name: p.product_name || '',
        brands: p.brands || '',
        categories: p.categories || '',
        nutriscore_grade: p.nutriscore_grade || '',
        image_url: p.image_url || '',
      }));

      // Mettre en cache
      this.offCache.set(cacheKey, products);

      if (products.length > 0) {
        // Prendre le meilleur match
        const bestMatch = this.findBestMatch(productName, products);
        return {
          matched: true,
          confidence: bestMatch.score,
          method: 'off_api',
          product: bestMatch.product,
        };
      }

      return { matched: false, confidence: 0, method: 'off_api' };
    } catch (error) {
      console.error('OpenFoodFacts search error:', error);
      return { matched: false, confidence: 0, method: 'off_api' };
    }
  }

  /**
   * Trouver le meilleur match avec Fuse.js
   */
  private findBestMatch(
    query: string,
    products: OpenFoodFactsProduct[]
  ): { product: OpenFoodFactsProduct; score: number } {
    const fuse = new Fuse(products, {
      keys: ['product_name', 'brands'],
      threshold: 0.4,
      includeScore: true,
    });

    const results = fuse.search(query);

    if (results.length > 0) {
      return {
        product: results[0].item,
        score: 1 - (results[0].score || 0),
      };
    }

    return {
      product: products[0],
      score: 0.5,
    };
  }

  /**
   * Fuzzy matching sur une liste de produits
   */
  private fuzzyMatch(query: string, products: OpenFoodFactsProduct[]): MatchResult {
    const fuse = new Fuse(products, {
      keys: ['product_name', 'brands'],
      threshold: 0.3,
      includeScore: true,
    });

    const results = fuse.search(query);

    if (results.length > 0 && results[0].score && results[0].score < 0.3) {
      return {
        matched: true,
        confidence: 1 - results[0].score,
        method: 'fuzzy',
        product: results[0].item,
      };
    }

    return { matched: false, confidence: 0, method: 'fuzzy' };
  }

  /**
   * Enrichir un produit scanne avec toutes les infos
   */
  async enrichProduct(product: ScannedProduct): Promise<EnrichedProduct> {
    const matchResult = await this.matchProduct(product);

    return {
      ...product,
      matched: matchResult.matched,
      matched_product: matchResult.product
        ? {
            id: matchResult.product.code,
            name: matchResult.product.product_name,
            barcode: matchResult.product.code,
            brand: matchResult.product.brands,
            nutriscore: matchResult.product.nutriscore_grade,
            image_url: matchResult.product.image_url,
          }
        : undefined,
      match_confidence: matchResult.confidence,
      match_method: matchResult.method,
      estimated_expiry_date: this.estimateExpiryDate(product.normalized_name),
      suggested_location: this.suggestLocation(product.normalized_name),
      category: this.detectCategory(product.normalized_name),
    };
  }

  /**
   * Estimer la date d'expiration selon le type de produit
   */
  private estimateExpiryDate(productName: string): string {
    const name = productName.toLowerCase();
    const today = new Date();

    // Produits frais (3-7 jours)
    if (
      name.includes('lait') ||
      name.includes('yaourt') ||
      name.includes('creme') ||
      name.includes('fromage blanc')
    ) {
      today.setDate(today.getDate() + 7);
    }
    // Viandes (3-5 jours)
    else if (
      name.includes('poulet') ||
      name.includes('boeuf') ||
      name.includes('porc') ||
      name.includes('steak') ||
      name.includes('saucisse')
    ) {
      today.setDate(today.getDate() + 4);
    }
    // Fruits et legumes (5-10 jours)
    else if (
      name.includes('tomate') ||
      name.includes('salade') ||
      name.includes('pomme') ||
      name.includes('banane')
    ) {
      today.setDate(today.getDate() + 7);
    }
    // Oeufs (3-4 semaines)
    else if (name.includes('oeuf')) {
      today.setDate(today.getDate() + 21);
    }
    // Epicerie seche (6-12 mois)
    else if (
      name.includes('pates') ||
      name.includes('riz') ||
      name.includes('farine') ||
      name.includes('sucre')
    ) {
      today.setMonth(today.getMonth() + 6);
    }
    // Conserves (1-2 ans)
    else if (name.includes('conserve') || name.includes('boite')) {
      today.setFullYear(today.getFullYear() + 1);
    }
    // Default: 1 mois
    else {
      today.setMonth(today.getMonth() + 1);
    }

    return today.toISOString().split('T')[0];
  }

  /**
   * Suggerer la localisation de stockage
   */
  private suggestLocation(productName: string): 'frigo' | 'congelateur' | 'placard' | 'autre' {
    const name = productName.toLowerCase();

    // Frigo
    if (
      name.includes('lait') ||
      name.includes('yaourt') ||
      name.includes('beurre') ||
      name.includes('fromage') ||
      name.includes('creme') ||
      name.includes('oeuf') ||
      name.includes('jambon') ||
      name.includes('poulet') ||
      name.includes('boeuf') ||
      name.includes('porc') ||
      name.includes('saucisse') ||
      name.includes('lardon') ||
      name.includes('saumon') ||
      name.includes('poisson')
    ) {
      return 'frigo';
    }

    // Congelateur
    if (
      name.includes('surgele') ||
      name.includes('glace') ||
      name.includes('sorbet') ||
      name.includes('creme glacee')
    ) {
      return 'congelateur';
    }

    // Placard (default)
    return 'placard';
  }

  /**
   * Detecter la categorie du produit
   */
  private detectCategory(productName: string): string {
    const name = productName.toLowerCase();

    if (name.includes('lait') || name.includes('yaourt') || name.includes('fromage') || name.includes('beurre') || name.includes('creme')) {
      return 'Produits laitiers';
    }
    if (name.includes('poulet') || name.includes('boeuf') || name.includes('porc') || name.includes('agneau') || name.includes('veau')) {
      return 'Viandes';
    }
    if (name.includes('saumon') || name.includes('poisson') || name.includes('crevette') || name.includes('cabillaud')) {
      return 'Poissons';
    }
    if (name.includes('tomate') || name.includes('carotte') || name.includes('salade') || name.includes('courgette') || name.includes('pomme de terre')) {
      return 'Legumes';
    }
    if (name.includes('pomme') || name.includes('banane') || name.includes('orange') || name.includes('fraise') || name.includes('poire')) {
      return 'Fruits';
    }
    if (name.includes('pates') || name.includes('riz') || name.includes('farine') || name.includes('sucre')) {
      return 'Epicerie';
    }
    if (name.includes('pain') || name.includes('baguette') || name.includes('brioche') || name.includes('croissant')) {
      return 'Boulangerie';
    }
    if (name.includes('eau') || name.includes('jus') || name.includes('coca') || name.includes('soda') || name.includes('biere')) {
      return 'Boissons';
    }
    if (name.includes('surgele') || name.includes('glace')) {
      return 'Surgeles';
    }

    return 'Autres';
  }
}

// Singleton
let instance: ProductMatcherService | null = null;

export function getProductMatcherService(): ProductMatcherService {
  if (!instance) {
    instance = new ProductMatcherService();
  }
  return instance;
}
```

### Jour 7 : Service Orchestrateur

**Fichier : `apps/api/src/services/receipt/receiptProcessingService.ts`**

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getGPTVisionService } from './gptVisionService';
import { getProductMatcherService } from './productMatcherService';
import {
  ReceiptProcessResult,
  EnrichedProduct,
} from '../../types/receipt.types';

export class ReceiptProcessingService {
  private gptVision = getGPTVisionService();
  private productMatcher = getProductMatcherService();

  /**
   * Traiter un ticket de caisse complet
   */
  async processReceipt(imageUrl: string, userId: string): Promise<ReceiptProcessResult> {
    const startTime = Date.now();
    const scanId = uuidv4();

    try {
      // ETAPE 1: OCR via GPT Vision
      console.log(`[${scanId}] Starting receipt scan...`);
      const scanResult = await this.gptVision.scanReceipt(imageUrl);

      if (!scanResult.success || !scanResult.data) {
        return {
          success: false,
          error: scanResult.error || {
            code: 'SCAN_FAILED',
            message: 'Echec du scan OCR',
          },
          metadata: {
            processing_time_ms: Date.now() - startTime,
            gpt_cost_usd: scanResult.metadata.gpt_cost_usd,
            scan_id: scanId,
          },
        };
      }

      console.log(`[${scanId}] OCR completed: ${scanResult.data.products.length} products found`);

      // ETAPE 2: Enrichir chaque produit en parallele
      const enrichmentPromises = scanResult.data.products.map((product) =>
        this.productMatcher.enrichProduct(product)
      );

      const enrichedProducts = await Promise.all(enrichmentPromises);

      console.log(`[${scanId}] Enrichment completed`);

      // ETAPE 3: Calculer les statistiques
      const stats = {
        total_products: enrichedProducts.length,
        matched_products: enrichedProducts.filter((p) => p.matched).length,
        unmatched_products: enrichedProducts.filter((p) => !p.matched).length,
        low_confidence_products: enrichedProducts.filter((p) => p.confidence < 0.7).length,
      };

      // ETAPE 4: Filtrer les produits avec confiance trop basse
      const validProducts = enrichedProducts.filter((p) => p.confidence >= 0.5);

      return {
        success: true,
        data: {
          store: scanResult.data.store,
          date: scanResult.data.date,
          products: validProducts,
          total: scanResult.data.total,
          stats,
        },
        metadata: {
          processing_time_ms: Date.now() - startTime,
          gpt_cost_usd: scanResult.metadata.gpt_cost_usd,
          scan_id: scanId,
        },
      };
    } catch (error) {
      console.error(`[${scanId}] Receipt processing error:`, error);

      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Erreur de traitement',
        },
        metadata: {
          processing_time_ms: Date.now() - startTime,
          gpt_cost_usd: 0,
          scan_id: scanId,
        },
      };
    }
  }
}

// Singleton
let instance: ReceiptProcessingService | null = null;

export function getReceiptProcessingService(): ReceiptProcessingService {
  if (!instance) {
    instance = new ReceiptProcessingService();
  }
  return instance;
}
```

---

## SEMAINE 3 : FRONTEND

### Jour 8-9 : Composants React

**Fichier : `src/components/receipt/ReceiptScanner.tsx`**

```typescript
import React, { useRef, useState, useCallback } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ReceiptScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  onCapture,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demarrer la camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Camera arriere
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Impossible d\'acceder a la camera');
    }
  }, []);

  // Arreter la camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  // Capturer une photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `receipt-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          stopCamera();
          onCapture(file);
        }
      },
      'image/jpeg',
      0.85
    );
  }, [stopCamera, onCapture]);

  // Importer depuis la galerie
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onCapture(file);
      }
    },
    [onCapture]
  );

  // Demarrer la camera au montage
  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white font-medium">Scanner mon ticket</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="text-white"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Zone camera */}
      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="p-6 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={startCamera}>Reessayer</Button>
            </Card>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Overlay guide */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full flex items-center justify-center">
                <div className="w-[90%] h-[60%] border-2 border-white/50 rounded-lg">
                  <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
                    Placez le ticket dans le cadre
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Canvas cache pour capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Boutons */}
      <div className="p-4 bg-black/50 flex justify-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="text-white border-white"
        >
          <Upload className="h-5 w-5 mr-2" />
          Importer
        </Button>

        <Button
          onClick={capturePhoto}
          disabled={!isStreaming}
          size="lg"
          className="bg-white text-black hover:bg-gray-200 rounded-full w-16 h-16"
        >
          <Camera className="h-8 w-8" />
        </Button>
      </div>
    </div>
  );
};
```

**Fichier : `src/components/receipt/ProductValidationList.tsx`**

```typescript
import React from 'react';
import { Check, X, AlertTriangle, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EnrichedProduct {
  raw_name: string;
  normalized_name: string;
  quantity: number;
  total_price: number;
  confidence: number;
  matched: boolean;
  match_confidence: number;
  suggested_location: string;
  category?: string;
}

interface ProductValidationListProps {
  products: EnrichedProduct[];
  selectedProducts: Set<string>;
  onToggleProduct: (index: number) => void;
  onEditProduct: (index: number) => void;
}

export const ProductValidationList: React.FC<ProductValidationListProps> = ({
  products,
  selectedProducts,
  onToggleProduct,
  onEditProduct,
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLocationColor = (location: string) => {
    switch (location) {
      case 'frigo':
        return 'bg-blue-100 text-blue-800';
      case 'congelateur':
        return 'bg-cyan-100 text-cyan-800';
      case 'placard':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-2">
      {products.map((product, index) => {
        const isSelected = selectedProducts.has(String(index));
        const isLowConfidence = product.confidence < 0.7;

        return (
          <Card
            key={index}
            className={cn(
              'p-3 transition-all cursor-pointer',
              isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200',
              isLowConfidence && 'border-orange-300'
            )}
            onClick={() => onToggleProduct(index)}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox visuel */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                  isSelected ? 'bg-green-500' : 'bg-gray-200'
                )}
              >
                {isSelected ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <X className="h-4 w-4 text-gray-400" />
                )}
              </div>

              {/* Infos produit */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {product.normalized_name}
                  </span>
                  {isLowConfidence && (
                    <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>x{product.quantity}</span>
                  <span>•</span>
                  <span>{product.total_price.toFixed(2)}€</span>
                  <span>•</span>
                  <Badge
                    variant="secondary"
                    className={getLocationColor(product.suggested_location)}
                  >
                    {product.suggested_location}
                  </Badge>
                </div>

                {product.raw_name !== product.normalized_name && (
                  <div className="text-xs text-gray-400 mt-1 truncate">
                    Original: {product.raw_name}
                  </div>
                )}
              </div>

              {/* Bouton edit */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProduct(index);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
```

### Jour 10 : Hook Principal

**Fichier : `src/hooks/useReceiptScan.ts`**

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScannedProduct {
  raw_name: string;
  normalized_name: string;
  quantity: number;
  total_price: number;
  confidence: number;
  matched: boolean;
  match_confidence: number;
  suggested_location: 'frigo' | 'congelateur' | 'placard' | 'autre';
  category?: string;
  estimated_expiry_date?: string;
}

interface ScanResult {
  store: string | null;
  date: string | null;
  products: ScannedProduct[];
  total: number | null;
  stats: {
    total_products: number;
    matched_products: number;
    unmatched_products: number;
  };
}

interface UseReceiptScanReturn {
  isScanning: boolean;
  scanResult: ScanResult | null;
  error: string | null;
  selectedProducts: Set<string>;
  scanReceipt: (file: File) => Promise<void>;
  toggleProduct: (index: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  addToInventory: () => Promise<{ success: boolean; count: number }>;
  reset: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030';

export const useReceiptScan = (): UseReceiptScanReturn => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const scanReceipt = useCallback(async (file: File) => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      // Obtenir le token d'auth
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Non authentifie');
      }

      // Preparer le FormData
      const formData = new FormData();
      formData.append('receipt', file);

      // Appel API
      const response = await fetch(`${API_URL}/api/v1/receipts/scan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Echec du scan');
      }

      setScanResult(result.data);

      // Selectionner tous les produits par defaut
      const allIndices = new Set(
        result.data.products.map((_: any, i: number) => String(i))
      );
      setSelectedProducts(allIndices);
    } catch (err) {
      console.error('Scan error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du scan');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const toggleProduct = useCallback((index: number) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      const key = String(index);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!scanResult) return;
    const allIndices = new Set(
      scanResult.products.map((_, i) => String(i))
    );
    setSelectedProducts(allIndices);
  }, [scanResult]);

  const deselectAll = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  const addToInventory = useCallback(async () => {
    if (!scanResult) return { success: false, count: 0 };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Non authentifie');
      }

      // Filtrer les produits selectionnes
      const productsToAdd = scanResult.products
        .filter((_, i) => selectedProducts.has(String(i)))
        .map((p) => ({
          name: p.normalized_name,
          quantity: p.quantity,
          expiry_date: p.estimated_expiry_date,
          location: p.suggested_location,
          category: p.category,
        }));

      const response = await fetch(`${API_URL}/api/v1/receipts/add-to-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ products: productsToAdd }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Echec de l\'ajout');
      }

      return { success: true, count: result.data.added_count };
    } catch (err) {
      console.error('Add to inventory error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
      return { success: false, count: 0 };
    }
  }, [scanResult, selectedProducts]);

  const reset = useCallback(() => {
    setIsScanning(false);
    setScanResult(null);
    setError(null);
    setSelectedProducts(new Set());
  }, []);

  return {
    isScanning,
    scanResult,
    error,
    selectedProducts,
    scanReceipt,
    toggleProduct,
    selectAll,
    deselectAll,
    addToInventory,
    reset,
  };
};
```

---

## TESTS

### Tests E2E a prevoir

```typescript
// __tests__/receipt-scan.e2e.test.ts

describe('Receipt Scan E2E', () => {
  describe('GPT Vision OCR', () => {
    it('should extract products from Carrefour receipt', async () => {
      // Test avec image reelle Carrefour
    });

    it('should extract products from Leclerc receipt', async () => {
      // Test avec image reelle Leclerc
    });

    it('should handle blurry receipt gracefully', async () => {
      // Test avec image floue
    });

    it('should ignore non-food items', async () => {
      // Verifier que sacs plastiques sont ignores
    });
  });

  describe('Product Matching', () => {
    it('should match DANONE NAT 4X to correct product', async () => {
      // Test matching
    });

    it('should estimate expiry date correctly', async () => {
      // Test estimation DLC
    });

    it('should suggest correct storage location', async () => {
      // Test suggestion frigo/placard
    });
  });

  describe('Full Flow', () => {
    it('should add scanned products to inventory', async () => {
      // Test ajout inventaire
    });
  });
});
```

---

## DEPLOIEMENT

### Variables d'environnement requises

```bash
# .env (apps/api/)
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Optionnel
RECEIPT_SCAN_MAX_SIZE_MB=5
RECEIPT_SCAN_CACHE_TTL_MS=300000
```

### Supabase Storage Setup

```sql
-- Creer le bucket pour les tickets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('receipt-scans', 'receipt-scans', true, 5242880);

-- Policy: chaque user peut upload dans son dossier
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipt-scans' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: chaque user peut lire ses receipts
CREATE POLICY "Users can read own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipt-scans' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Auto-delete apres 24h (via cron job ou Supabase function)
```

---

## TIMELINE RECAPITULATIF

| Semaine | Jours | Livrables |
|---------|-------|-----------|
| **1** | 1-3 | GPT Vision Service, Types, Routes API |
| **2** | 4-7 | Dictionnaire, Matching, Enrichissement, Service Orchestrateur |
| **3** | 8-11 | Composants React, Hook, Page, Tests |

**TOTAL : 11 jours ouvrés (~3 semaines)**

---

## METRIQUES DE SUCCES

| KPI | Objectif | Comment Mesurer |
|-----|----------|-----------------|
| Precision OCR | > 90% | % produits corrects vs ticket |
| Matching OFF | > 75% | % produits enrichis |
| Temps scan total | < 10s | Latence moyenne |
| Taux adoption | 50% users | % users qui scannent 1+ ticket |
| Satisfaction | NPS > 40 | Survey post-scan |

---

*Ce document sera mis a jour au fur et a mesure de l'implementation.*
