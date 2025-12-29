# PRP-054: Scan de Ticket - Product Enrichment & Validation UI

**Product**: Smart Pantry Pro
**Feature**: Product Confirmation & Enrichment
**Version**: 1.0
**Date**: 21 Octobre 2025
**Status**: 🟢 Ready for Development
**Durée estimée**: 4 jours
**Prérequis**: PRP-053 (Frontend Components Core)
**Phase**: Enrichment & Validation (Phase 5/6)

---

## 📌 Objectif

Implémenter l'enrichissement des produits scannés avec OpenFoodFacts, l'estimation intelligente des dates de péremption, la catégorisation automatique, et l'interface de validation/édition avant ajout à l'inventaire.

---

## 🎯 Scope

### ✅ In Scope
- Extension service `openFoodFactsService.ts` avec matching avancé
- Service `expirationEstimator.ts` avec règles métier
- Service `productCategorizer.ts` pour auto-catégorisation
- Composant `ProductConfirmation.tsx` - Liste de validation
- Composant `ProductCard.tsx` - Card éditable individuelle
- Composant `ProductEditModal.tsx` - Édition détaillée
- Batch insert vers `pantry_items`
- Gestion produits non reconnus
- Tests unitaires et E2E

### ❌ Out of Scope
- Analytics events (PRP-055)
- Historique des scans (PRP-055)
- Onboarding tutorial (PRP-055)
- A/B testing (PRP-055)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Produits scannés GPT Vision (PRP-051)      │
│  [{ raw_name, normalized_name, ... }]       │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  OpenFoodFacts Enrichment                   │
│  ├─ Matching par nom (fuzzy search)        │
│  ├─ Récupération nutriscore, allergènes    │
│  ├─ Images produits                        │
│  └─ Catégories                             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  Expiration Estimator                       │
│  ├─ Règles métier par catégorie            │
│  ├─ Adjustement saisonnier                 │
│  └─ Estimation date péremption             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  Product Categorizer                        │
│  ├─ Auto-classification (frigo/placard)    │
│  ├─ Section suggestion                     │
│  └─ Tags automatiques                      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  ProductConfirmation UI                     │
│  ├─ Liste des produits enrichis            │
│  ├─ Édition inline                         │
│  ├─ Suppression produit                    │
│  └─ Validation globale                     │
└────────────────┬────────────────────────────┘
                 │ User clique "Tout valider"
                 ▼
┌─────────────────────────────────────────────┐
│  Batch Insert → pantry_items                │
│  ├─ Transaction SQL                        │
│  ├─ Update receipt_scan_history            │
│  └─ Redirect vers Inventaire               │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Implémentation

### 1. Service OpenFoodFacts Extension

Étendre `src/services/openFoodFactsService.ts`:

```typescript
import Fuse from 'fuse.js';

export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands?: string;
  nutriscore_grade?: 'a' | 'b' | 'c' | 'd' | 'e';
  image_url?: string;
  image_small_url?: string;
  allergens?: string;
  allergens_tags?: string[];
  categories?: string;
  categories_tags?: string[];
}

export interface ProductMatchResult {
  matched: boolean;
  confidence: number;
  product?: OpenFoodFactsProduct;
}

class OpenFoodFactsService {
  private baseUrl = 'https://world.openfoodfacts.org/api/v2';
  private cache = new Map<string, OpenFoodFactsProduct>();

  /**
   * Recherche d'un produit par nom avec fuzzy matching
   */
  async searchByName(productName: string): Promise<ProductMatchResult> {
    try {
      // Normaliser le nom pour la recherche
      const normalizedName = this.normalizeProductName(productName);

      // Vérifier le cache
      const cacheKey = `search:${normalizedName}`;
      if (this.cache.has(cacheKey)) {
        return {
          matched: true,
          confidence: 0.9,
          product: this.cache.get(cacheKey),
        };
      }

      // Requête OpenFoodFacts
      const searchUrl = `${this.baseUrl}/search?search_terms=${encodeURIComponent(normalizedName)}&page_size=5&fields=code,product_name,brands,nutriscore_grade,image_url,image_small_url,allergens,allergens_tags,categories,categories_tags`;

      const response = await fetch(searchUrl);
      const data = await response.json();

      if (!data.products || data.products.length === 0) {
        return { matched: false, confidence: 0 };
      }

      // Fuzzy matching pour trouver le meilleur match
      const bestMatch = this.findBestMatch(normalizedName, data.products);

      if (bestMatch.confidence >= 0.6) {
        this.cache.set(cacheKey, bestMatch.product);

        return {
          matched: true,
          confidence: bestMatch.confidence,
          product: bestMatch.product,
        };
      }

      return { matched: false, confidence: bestMatch.confidence };

    } catch (error) {
      console.error('OpenFoodFacts search error:', error);
      return { matched: false, confidence: 0 };
    }
  }

  /**
   * Normalise un nom de produit pour améliorer le matching
   */
  private normalizeProductName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      // Supprimer les marques courantes
      .replace(/\b(bio|auchan|carrefour|leclerc|lidl|intermarché)\b/g, '')
      // Supprimer les quantités
      .replace(/\b\d+\s?(kg|g|l|ml|cl|pièce|pcs)\b/gi, '')
      .trim();
  }

  /**
   * Fuzzy matching pour trouver le meilleur produit
   */
  private findBestMatch(
    searchName: string,
    products: any[]
  ): { product: OpenFoodFactsProduct; confidence: number } {
    const fuse = new Fuse(products, {
      keys: ['product_name', 'brands'],
      threshold: 0.4, // Plus permissif
      includeScore: true,
    });

    const results = fuse.search(searchName);

    if (results.length === 0) {
      return { product: products[0], confidence: 0.3 };
    }

    const bestResult = results[0];
    const confidence = 1 - (bestResult.score || 0); // Score inversé (0 = parfait)

    return {
      product: bestResult.item,
      confidence: Math.min(confidence, 0.95), // Cap à 0.95
    };
  }

  /**
   * Récupère un produit par code-barres
   */
  async getByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
    try {
      const response = await fetch(`${this.baseUrl}/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        return data.product;
      }

      return null;
    } catch (error) {
      console.error('OpenFoodFacts barcode error:', error);
      return null;
    }
  }
}

// Singleton
let offServiceInstance: OpenFoodFactsService | null = null;

export function getOpenFoodFactsService(): OpenFoodFactsService {
  if (!offServiceInstance) {
    offServiceInstance = new OpenFoodFactsService();
  }
  return offServiceInstance;
}

export { OpenFoodFactsService };
```

---

### 2. Service Estimation Péremption

Créer `src/services/receipt/expirationEstimator.ts`:

```typescript
interface ExpirationRule {
  category: string;
  keywords: string[];
  defaultDays: number;
  minDays: number;
  maxDays: number;
  seasonalAdjustment?: (date: Date) => number; // Ajustement saisonnier
}

const EXPIRATION_RULES: ExpirationRule[] = [
  // Produits frais - court
  {
    category: 'Viande fraîche',
    keywords: ['viande', 'boeuf', 'poulet', 'porc', 'veau', 'agneau', 'steak', 'escalope'],
    defaultDays: 3,
    minDays: 2,
    maxDays: 5,
  },
  {
    category: 'Poisson frais',
    keywords: ['poisson', 'saumon', 'cabillaud', 'truite', 'crevette', 'fruits de mer'],
    defaultDays: 2,
    minDays: 1,
    maxDays: 3,
  },
  {
    category: 'Produits laitiers',
    keywords: ['lait', 'yaourt', 'fromage blanc', 'crème fraîche'],
    defaultDays: 7,
    minDays: 5,
    maxDays: 14,
  },

  // Fruits & Légumes
  {
    category: 'Légumes frais',
    keywords: ['tomate', 'salade', 'courgette', 'poivron', 'concombre', 'épinard'],
    defaultDays: 5,
    minDays: 3,
    maxDays: 7,
  },
  {
    category: 'Fruits frais',
    keywords: ['pomme', 'banane', 'orange', 'fraise', 'raisin', 'pêche'],
    defaultDays: 7,
    minDays: 4,
    maxDays: 10,
    seasonalAdjustment: (date) => {
      // Été : -1 jour (chaleur)
      const month = date.getMonth();
      return month >= 5 && month <= 8 ? -1 : 0;
    },
  },

  // Produits secs - long
  {
    category: 'Pâtes/Riz',
    keywords: ['pâtes', 'riz', 'semoule', 'quinoa'],
    defaultDays: 365,
    minDays: 180,
    maxDays: 730,
  },
  {
    category: 'Conserves',
    keywords: ['conserve', 'boîte', 'thon', 'sardine', 'maïs', 'haricot'],
    defaultDays: 730,
    minDays: 365,
    maxDays: 1095,
  },

  // Fromages
  {
    category: 'Fromage à pâte dure',
    keywords: ['comté', 'emmental', 'parmesan', 'gruyère'],
    defaultDays: 30,
    minDays: 21,
    maxDays: 60,
  },

  // Pain
  {
    category: 'Pain',
    keywords: ['pain', 'baguette', 'pain de mie'],
    defaultDays: 3,
    minDays: 2,
    maxDays: 5,
  },
];

export class ExpirationEstimator {
  /**
   * Estime la date de péremption d'un produit
   */
  estimateExpirationDate(productName: string, purchaseDate?: Date): Date {
    const today = purchaseDate || new Date();
    const normalizedName = productName.toLowerCase();

    // Trouver la règle correspondante
    const rule = this.findMatchingRule(normalizedName);

    if (!rule) {
      // Défaut : 7 jours
      return this.addDays(today, 7);
    }

    // Calculer les jours
    let daysToAdd = rule.defaultDays;

    // Ajustement saisonnier si applicable
    if (rule.seasonalAdjustment) {
      daysToAdd += rule.seasonalAdjustment(today);
    }

    // Borner entre min et max
    daysToAdd = Math.max(rule.minDays, Math.min(rule.maxDays, daysToAdd));

    return this.addDays(today, daysToAdd);
  }

  /**
   * Trouve la règle qui correspond au produit
   */
  private findMatchingRule(productName: string): ExpirationRule | null {
    for (const rule of EXPIRATION_RULES) {
      for (const keyword of rule.keywords) {
        if (productName.includes(keyword)) {
          return rule;
        }
      }
    }
    return null;
  }

  /**
   * Ajoute des jours à une date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Formate une date en YYYY-MM-DD
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

// Singleton
let estimatorInstance: ExpirationEstimator | null = null;

export function getExpirationEstimator(): ExpirationEstimator {
  if (!estimatorInstance) {
    estimatorInstance = new ExpirationEstimator();
  }
  return estimatorInstance;
}
```

---

### 3. Service Catégorisation

Créer `src/services/receipt/productCategorizer.ts`:

```typescript
export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

interface CategorizationRule {
  location: StorageLocation;
  keywords: string[];
}

const CATEGORIZATION_RULES: CategorizationRule[] = [
  // Frigo
  {
    location: 'fridge',
    keywords: ['lait', 'yaourt', 'fromage', 'beurre', 'crème', 'viande', 'poisson', 'œuf', 'légume frais', 'fruit frais', 'tomate', 'salade'],
  },
  // Congélateur
  {
    location: 'freezer',
    keywords: ['surgelé', 'glace', 'frozen', 'congelé'],
  },
  // Placard (par défaut)
  {
    location: 'pantry',
    keywords: ['pâtes', 'riz', 'farine', 'sucre', 'conserve', 'huile', 'vinaigre', 'épice', 'sauce', 'gâteau', 'biscuit'],
  },
];

export class ProductCategorizer {
  /**
   * Détermine le lieu de stockage d'un produit
   */
  categorize(productName: string, categories?: string[]): StorageLocation {
    const normalizedName = productName.toLowerCase();

    // Vérifier les catégories OpenFoodFacts d'abord
    if (categories && categories.length > 0) {
      const categoriesStr = categories.join(' ').toLowerCase();

      if (categoriesStr.includes('dairy') || categoriesStr.includes('laitier')) {
        return 'fridge';
      }

      if (categoriesStr.includes('frozen') || categoriesStr.includes('surgelé')) {
        return 'freezer';
      }
    }

    // Utiliser les keywords
    for (const rule of CATEGORIZATION_RULES) {
      for (const keyword of rule.keywords) {
        if (normalizedName.includes(keyword)) {
          return rule.location;
        }
      }
    }

    // Défaut : placard
    return 'pantry';
  }

  /**
   * Génère des tags automatiques
   */
  generateTags(productName: string, categories?: string[]): string[] {
    const tags: string[] = [];
    const normalizedName = productName.toLowerCase();

    // Tags santé
    if (normalizedName.includes('bio')) tags.push('bio');
    if (normalizedName.includes('sans gluten')) tags.push('sans-gluten');
    if (normalizedName.includes('vegan') || normalizedName.includes('végétal')) tags.push('vegan');

    // Tags catégorie
    if (categories) {
      const categoryTags = categories
        .filter(cat => cat.startsWith('fr:'))
        .map(cat => cat.replace('fr:', '').replace(/-/g, ' '));

      tags.push(...categoryTags.slice(0, 3)); // Max 3 tags
    }

    return tags;
  }
}

// Singleton
let categorizerInstance: ProductCategorizer | null = null;

export function getProductCategorizer(): ProductCategorizer {
  if (!categorizerInstance) {
    categorizerInstance = new ProductCategorizer();
  }
  return categorizerInstance;
}
```

---

### 4. Hook Product Enrichment

Créer `src/hooks/useProductEnrichment.ts`:

```typescript
import { useState } from 'react';
import { getOpenFoodFactsService } from '@/services/openFoodFactsService';
import { getExpirationEstimator } from '@/services/receipt/expirationEstimator';
import { getProductCategorizer } from '@/services/receipt/productCategorizer';
import type { GPTReceiptProduct } from '@/services/vision/gptVisionService';

export interface EnrichedProduct extends GPTReceiptProduct {
  id: string; // Unique ID pour React keys
  openfoodfacts_match?: {
    code: string;
    product_name: string;
    nutriscore_grade?: string;
    image_url?: string;
    allergens?: string;
  };
  estimated_expiry_date: string;
  suggested_location: 'fridge' | 'freezer' | 'pantry';
  tags: string[];
  isEdited: boolean;
}

export function useProductEnrichment() {
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const offService = getOpenFoodFactsService();
  const expirationEstimator = getExpirationEstimator();
  const categorizer = getProductCategorizer();

  /**
   * Enrichit un produit individuel
   */
  const enrichProduct = async (product: GPTReceiptProduct): Promise<EnrichedProduct> => {
    // 1. OpenFoodFacts matching
    const offMatch = await offService.searchByName(product.normalized_name);

    // 2. Estimation péremption
    const expiryDate = expirationEstimator.estimateExpirationDate(product.normalized_name);

    // 3. Catégorisation
    const location = categorizer.categorize(
      product.normalized_name,
      offMatch.product?.categories_tags
    );

    // 4. Tags
    const tags = categorizer.generateTags(
      product.normalized_name,
      offMatch.product?.categories_tags
    );

    return {
      ...product,
      id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      openfoodfacts_match: offMatch.matched
        ? {
            code: offMatch.product!.code,
            product_name: offMatch.product!.product_name,
            nutriscore_grade: offMatch.product!.nutriscore_grade,
            image_url: offMatch.product!.image_small_url || offMatch.product!.image_url,
            allergens: offMatch.product!.allergens,
          }
        : undefined,
      estimated_expiry_date: expirationEstimator.formatDate(expiryDate),
      suggested_location: location,
      tags,
      isEdited: false,
    };
  };

  /**
   * Enrichit une liste de produits en batch
   */
  const enrichProducts = async (products: GPTReceiptProduct[]): Promise<EnrichedProduct[]> => {
    setEnriching(true);
    setProgress({ current: 0, total: products.length });

    const enrichedProducts: EnrichedProduct[] = [];

    for (let i = 0; i < products.length; i++) {
      const enriched = await enrichProduct(products[i]);
      enrichedProducts.push(enriched);

      setProgress({ current: i + 1, total: products.length });

      // Throttle pour éviter rate limiting OFF
      if (i < products.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    setEnriching(false);

    return enrichedProducts;
  };

  return {
    enrichProduct,
    enrichProducts,
    enriching,
    progress,
  };
}
```

---

### 5. Composant ProductCard Éditable

Créer `src/components/receipt/ProductCard.tsx`:

```typescript
import React from 'react';
import { Edit2, Trash2, Check } from 'lucide-react';
import type { EnrichedProduct } from '@/hooks/useProductEnrichment';

interface ProductCardProps {
  product: EnrichedProduct;
  onEdit: (product: EnrichedProduct) => void;
  onDelete: (productId: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const nutriscoreColors = {
    a: 'bg-green-500',
    b: 'bg-lime-500',
    c: 'bg-yellow-500',
    d: 'bg-orange-500',
    e: 'bg-red-500',
  };

  return (
    <div className="product-card bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex gap-3">
        {/* Image produit */}
        {product.openfoodfacts_match?.image_url ? (
          <img
            src={product.openfoodfacts_match.image_url}
            alt={product.normalized_name}
            className="w-16 h-16 object-cover rounded"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
            Pas d'image
          </div>
        )}

        {/* Détails */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">
                {product.normalized_name}
              </h3>
              <p className="text-sm text-gray-500">
                {product.quantity} {product.unit} • {product.price}€
              </p>
            </div>

            {/* Nutriscore */}
            {product.openfoodfacts_match?.nutriscore_grade && (
              <div
                className={`px-2 py-1 rounded text-white text-xs font-bold uppercase ${
                  nutriscoreColors[product.openfoodfacts_match.nutriscore_grade]
                }`}
              >
                {product.openfoodfacts_match.nutriscore_grade}
              </div>
            )}
          </div>

          {/* Infos supplémentaires */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
              📅 {new Date(product.estimated_expiry_date).toLocaleDateString('fr-FR')}
            </span>

            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
              {product.suggested_location === 'fridge' && '❄️ Frigo'}
              {product.suggested_location === 'freezer' && '🧊 Congélateur'}
              {product.suggested_location === 'pantry' && '🏺 Placard'}
            </span>

            {product.isEdited && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded flex items-center gap-1">
                <Check size={12} />
                Modifié
              </span>
            )}
          </div>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onEdit(product)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          <Edit2 size={14} />
          Éditer
        </button>

        <button
          onClick={() => onDelete(product.id)}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-sm font-medium"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
```

---

### 6. Page de Confirmation

Créer `src/pages/ReceiptConfirmPage.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ProductCard } from '@/components/receipt/ProductCard';
import { useProductEnrichment } from '@/hooks/useProductEnrichment';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import type { EnrichedProduct } from '@/hooks/useProductEnrichment';

export function ReceiptConfirmPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const supabase = useSupabaseClient();

  const { enrichProducts, enriching, progress } = useProductEnrichment();

  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Enrichir les produits au chargement
  useEffect(() => {
    const loadProducts = async () => {
      const rawProducts = location.state?.products || [];

      if (rawProducts.length === 0) {
        navigate('/inventory');
        return;
      }

      const enriched = await enrichProducts(rawProducts);
      setProducts(enriched);
      setLoading(false);
    };

    loadProducts();
  }, []);

  const handleDelete = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleEdit = (updated: EnrichedProduct) => {
    setProducts(prev =>
      prev.map(p => (p.id === updated.id ? { ...updated, isEdited: true } : p))
    );
  };

  const handleConfirmAll = async () => {
    if (!user || products.length === 0) return;

    setSaving(true);

    try {
      // Batch insert vers pantry_items
      const itemsToInsert = products.map(p => ({
        user_id: user.id,
        name: p.normalized_name,
        quantity: p.quantity,
        unit: p.unit,
        price: p.price,
        expiry_date: p.estimated_expiry_date,
        storage_location: p.suggested_location,
        source_type: 'receipt',
        receipt_scan_id: scanId,
        openfoodfacts_code: p.openfoodfacts_match?.code,
        raw_receipt_name: p.raw_name,
      }));

      const { error } = await supabase.from('pantry_items').insert(itemsToInsert);

      if (error) throw error;

      // Mettre à jour le scan history
      await supabase
        .from('receipt_scan_history')
        .update({
          confirmed_at: new Date().toISOString(),
          items_added_count: products.length,
        })
        .eq('id', scanId);

      // Redirect avec succès
      navigate('/inventory', {
        state: { toast: `✅ ${products.length} produits ajoutés !` },
      });
    } catch (error) {
      console.error('Save error:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading || enriching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            Enrichissement des produits... {progress.current}/{progress.total}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-xl font-bold">{products.length} produits détectés</h1>
        {location.state?.metadata?.store && (
          <p className="text-sm text-gray-500">
            Ticket {location.state.metadata.store}
          </p>
        )}
      </header>

      <main className="p-4 pb-24">
        <div className="space-y-3">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </main>

      {/* Footer fixe */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold"
          >
            Annuler
          </button>

          <button
            onClick={handleConfirmAll}
            disabled={saving || products.length === 0}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : `Tout valider (${products.length})`}
          </button>
        </div>
      </footer>
    </div>
  );
}
```

---

## ✅ Definition of Done

- [ ] Service OpenFoodFacts étendu avec fuzzy matching
- [ ] Service ExpirationEstimator avec règles métier
- [ ] Service ProductCategorizer implémenté
- [ ] Hook useProductEnrichment fonctionnel
- [ ] Composant ProductCard créé
- [ ] Page ReceiptConfirmPage complète
- [ ] Batch insert vers pantry_items opérationnel
- [ ] Gestion des produits non matchés
- [ ] Tests unitaires (coverage > 70%)
- [ ] Documentation

---

**Owner**: Faizal
**Reviewer**: Tech Lead
**Estimation**: 4 jours développeur senior
