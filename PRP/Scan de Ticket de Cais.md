# PRD - Feature : Scan de Ticket de Caisse avec GPT Vision

**Product**: Smart Pantry Pro  
**Feature**: Scan & Auto-import de Tickets de Caisse  
**Version**: 1.0  
**Date**: 03 Octobre 2025  
**Owner**: Faizal (CEO/Product)  
**Status**: 🟢 Ready for Development

---

## 📌 Executive Summary

**Problème** : La saisie manuelle des courses après chaque shopping est fastidieuse et provoque un abandon utilisateur élevé (friction majeur identifié).

**Solution** : Permettre aux utilisateurs de scanner leur ticket de caisse en une photo pour ajouter automatiquement tous les produits à leur inventaire, avec enrichissement intelligent via GPT Vision + OpenFoodFacts.

**Impact attendu** :
- 🎯 **Réduction du temps de saisie** : de 5-10 min → 30 secondes
- 🎯 **Augmentation de la rétention J7** : +25% (estimation)
- 🎯 **Différenciation marché** : Aucune app française ne le fait bien
- 🎯 **Viral loop** : Feature "wow effect" → partage social

---

## 🎯 Objectifs Stratégiques

### Business Goals
1. **Réduire le friction d'onboarding** : 80% des nouveaux users scannent au moins 1 ticket dans les 24h
2. **Augmenter l'engagement** : +40% de sessions par semaine
3. **Préparer la monétisation** : Feature premium potentielle (scans illimités)

### Success Metrics (KPIs)

| Métrique | Baseline | Objectif V1 | Objectif V2 |
|----------|----------|-------------|-------------|
| % users utilisant le scan | 0% | 60% | 85% |
| Taux de réussite scan | - | 85% | 92% |
| Temps moyen d'ajout courses | 8 min | 45s | 30s |
| Produits ajoutés/semaine/user | 12 | 35 | 50 |
| NPS sur la feature | - | 50+ | 70+ |

---

## 👥 User Stories & Use Cases

### Primary User Story
**En tant qu'** utilisateur de Smart Pantry Pro  
**Je veux** scanner mon ticket de caisse après mes courses  
**Afin de** remplir automatiquement mon inventaire sans saisie manuelle  

**Critères d'acceptation** :
- ✅ Je peux lancer la caméra depuis l'écran "Inventaire"
- ✅ Je peux prendre une photo du ticket ou uploader depuis ma galerie
- ✅ L'app extrait automatiquement tous les produits, quantités et prix
- ✅ Je peux valider/corriger la liste avant ajout
- ✅ Les produits sont enrichis avec infos nutritionnelles (OpenFoodFacts)
- ✅ Les produits sont auto-catégorisés (frigo/placard/congélo)
- ✅ Les dates de péremption sont estimées intelligemment

### Secondary User Stories

**US-02** : Scanner plusieurs tickets d'affilée  
**US-03** : Re-scanner si le ticket est illisible  
**US-04** : Éditer manuellement un produit mal reconnu  
**US-05** : Voir l'historique de mes tickets scannés  
**US-06** : Partager un ticket avec un membre de mon foyer (V2)

---

## 🎨 User Flow Détaillé

### Flow Principal (Happy Path)

```
1. TRIGGER
   User : Rentre de courses avec son ticket
   ↓
   Ouvre Smart Pantry Pro → Onglet "Inventaire"
   ↓
   Bouton "➕ Ajouter des produits" 
   ↓
   Option : "📸 Scanner mon ticket"

2. CAPTURE
   ↓
   Camera native s'ouvre
   ├─ Guide visuel : cadre du ticket en overlay
   ├─ Conseils : "Placez le ticket à plat, bien éclairé"
   └─ Bouton : "📸 Capturer" ou "🖼️ Galerie"
   ↓
   Photo prise
   ↓
   Preview : "C'est bon ?" → Oui / Reprendre

3. PROCESSING (Backend)
   ↓
   Upload vers Supabase Storage
   ↓
   Loader animé : "🔍 Analyse de votre ticket..."
   ├─ Progress bar (ou skeleton)
   └─ Message : "Extraction en cours... ~5 secondes"
   ↓
   Call GPT-4 Vision API
   ├─ Extraction : produits, quantités, prix, magasin, date
   └─ Timeout : 10s max
   ↓
   Call OpenFoodFacts API (parallèle)
   ├─ Matching produits par nom
   └─ Enrichissement : nutriscore, allergènes, catégorie
   ↓
   Estimation intelligente
   ├─ Date de péremption (règles métier)
   └─ Catégorisation (frigo/placard/congélo)

4. CONFIRMATION USER
   ↓
   Affichage liste extraite
   ├─ Titre : "12 produits détectés chez Carrefour"
   ├─ Liste scrollable avec cards produits
   │   ├─ Photo produit (si dispo)
   │   ├─ Nom + quantité + prix
   │   ├─ Nutriscore badge
   │   ├─ Date péremption estimée
   │   └─ Catégorie (icône frigo/placard)
   ├─ Actions par produit :
   │   ├─ ✏️ Éditer
   │   ├─ 🗑️ Supprimer
   │   └─ ✅ Validé (check vert)
   └─ Boutons en bas :
       ├─ "Tout valider" (primary)
       └─ "Annuler" (secondary)

5. VALIDATION
   ↓
   User clique "Tout valider"
   ↓
   Sauvegarde en DB (batch insert)
   ├─ Table : pantry_items
   ├─ Champs : product_id, quantity, expiry_date, location, price, etc.
   └─ Notification : "✅ 12 produits ajoutés à votre inventaire"
   ↓
   Redirect vers Inventaire
   ├─ Highlight des nouveaux produits (animation)
   └─ Toast : "Vos courses ont été ajoutées !"

6. CLEANUP
   ↓
   Suppression photo ticket (Supabase Storage)
   ↓
   Analytics event : "ticket_scanned_success"
```

### Alternate Flows

#### Flow 2 : Ticket illisible
```
Processing → GPT Vision retourne < 50% confiance
↓
Modal : "⚠️ Ticket difficile à lire"
├─ Message : "L'éclairage ou la qualité de l'image rend le scan difficile"
└─ Actions :
    ├─ "Reprendre la photo" (primary)
    ├─ "Ajuster et réessayer" (crop/rotate)
    └─ "Saisir manuellement" (fallback)
```

#### Flow 3 : Produit non reconnu (OpenFoodFacts)
```
Matching OpenFoodFacts → Aucun résultat
↓
Card produit affiche :
├─ ⚠️ Badge "Non enrichi"
├─ Nom extrait du ticket
├─ Prix
└─ Possibilité d'éditer manuellement
```

#### Flow 4 : Timeout API
```
GPT Vision call > 10s
↓
Fallback automatique :
├─ Retry 1 fois
├─ Si échec : "😕 Le traitement prend trop de temps"
└─ Proposition : "Voulez-vous réessayer ou saisir manuellement ?"
```

---

## 🛠️ Spécifications Techniques

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
├─────────────────────────────────────────────────────────┤
│  ReceiptScanPage.tsx                                    │
│    ├─ CameraCapture.tsx  (react-camera-pro ou native)  │
│    ├─ ReceiptPreview.tsx                               │
│    ├─ ProductListConfirmation.tsx                      │
│    └─ LoadingState.tsx                                 │
└─────────────────────────────────────────────────────────┘
                           │
                           │ 1. Upload image
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 SUPABASE STORAGE                         │
├─────────────────────────────────────────────────────────┤
│  Bucket: receipts-temp                                  │
│  Retention: 24h (auto-delete)                           │
│  Max size: 10MB                                         │
└─────────────────────────────────────────────────────────┘
                           │
                           │ 2. Get public URL
                           ▼
┌─────────────────────────────────────────────────────────┐
│            BACKEND (Vercel Edge Function)                │
├─────────────────────────────────────────────────────────┤
│  /api/receipts/scan                                     │
│    ├─ Step 1: Call GPT-4 Vision                        │
│    ├─ Step 2: Parse JSON response                      │
│    ├─ Step 3: Parallel OpenFoodFacts lookups           │
│    ├─ Step 4: Apply expiration rules                   │
│    ├─ Step 5: Categorize products                      │
│    └─ Return enriched products list                    │
└─────────────────────────────────────────────────────────┘
                           │
                           │ 3. Return JSON
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
├─────────────────────────────────────────────────────────┤
│  Display products for confirmation                      │
│    ├─ User edits if needed                             │
│    └─ User validates                                   │
└─────────────────────────────────────────────────────────┘
                           │
                           │ 4. Batch insert
                           ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE DATABASE (PostgreSQL)              │
├─────────────────────────────────────────────────────────┤
│  Table: pantry_items                                    │
│  Table: receipt_scan_history (analytics)                │
└─────────────────────────────────────────────────────────┘
```

### Stack Technique (Smart Pantry Pro)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18.3 + TypeScript 5.5 | UI Components |
| **State** | Zustand + TanStack Query | State management + async |
| **UI** | Tailwind CSS + shadcn/ui | Styling + components |
| **Backend** | Vercel Edge Functions | Serverless API |
| **Database** | Supabase (PostgreSQL 15) | Data persistence |
| **Storage** | Supabase Storage | Image upload |
| **AI** | OpenAI GPT-4 Vision API | Receipt OCR |
| **Product DB** | OpenFoodFacts API | Product enrichment |
| **Camera** | react-camera-pro (ou native) | Photo capture |

### API Contracts

#### 1. POST /api/receipts/scan

**Request**:
```typescript
{
  imageUrl: string;          // Public URL from Supabase Storage
  userId: string;            // From Supabase Auth
  storeLayoutId?: string;    // Optional: user's preferred store layout
}
```

**Response** (Success):
```typescript
{
  success: true,
  data: {
    store: string;                    // "Carrefour"
    date: string;                     // "2025-10-03"
    total: number;                    // 45.67
    currency: string;                 // "EUR"
    products: Array<{
      raw_name: string;               // "TOM GRAPPE"
      normalized_name: string;        // "Tomates en grappe"
      quantity: number;               // 1.5
      unit: string;                   // "kg"
      price: number;                  // 4.50
      confidence: number;             // 0-1 (GPT confidence)
      
      // Enrichment from OpenFoodFacts
      openfoodfacts_match?: {
        product_name: string;
        nutriscore_grade: string;     // "a", "b", "c", "d", "e"
        image_url?: string;
        allergens?: string[];
        categories: string[];
      },
      
      // Smart estimation
      estimated_expiry_date: string;  // "2025-10-08"
      suggested_location: "fridge" | "pantry" | "freezer",
      suggested_section_id?: string;  // From user's store_layout
    }>
  },
  meta: {
    processing_time_ms: number,
    gpt_cost_usd: number,
    products_matched: number,
    products_not_matched: number
  }
}
```

**Response** (Error):
```typescript
{
  success: false,
  error: {
    code: "SCAN_FAILED" | "IMAGE_INVALID" | "GPT_TIMEOUT" | "RATE_LIMIT",
    message: string,
    retry_allowed: boolean
  }
}
```

#### 2. POST /api/receipts/confirm

**Request**:
```typescript
{
  userId: string,
  products: Array<{
    normalized_name: string,
    quantity: number,
    unit: string,
    price: number,
    expiry_date: string,
    location: string,
    section_id?: string,
    openfoodfacts_data?: object
  }>
}
```

**Response**:
```typescript
{
  success: true,
  inserted_count: number,
  inserted_ids: string[]
}
```

### GPT-4 Vision Prompt (Optimisé France)

```typescript
const RECEIPT_SCAN_PROMPT = `Tu es un assistant qui analyse des tickets de caisse français.
Extrais TOUS les produits, quantités et prix de ce ticket avec une précision maximale.

FORMAT DE SORTIE (JSON strict) :
{
  "store": "Nom du magasin (Carrefour, Leclerc, Auchan, Lidl, Intermarché, etc.)",
  "date": "YYYY-MM-DD",
  "total": 45.67,
  "currency": "EUR",
  "products": [
    {
      "raw_name": "Texte exact du ticket",
      "normalized_name": "Nom complet et clair du produit",
      "quantity": 1.5,
      "unit": "kg" | "L" | "pièce" | "g" | "unité",
      "price": 4.50,
      "line_number": 1
    }
  ]
}

RÈGLES STRICTES :
1. Déduis les noms complets même si abrégés sur le ticket
   Exemples :
   - "TOM GRAPPE" → "Tomates en grappe"
   - "PAIN COMPL" → "Pain complet"
   - "LAI 1/2 EC" → "Lait demi-écrémé"

2. Identifie la quantité ET l'unité
   - Si "2x Pain" → quantity: 2, unit: "pièce"
   - Si "1.5kg" → quantity: 1.5, unit: "kg"
   - Si pas de quantité visible → quantity: 1, unit: "unité"

3. Ignore les lignes non-produits :
   - Lignes "TOTAL", "TVA", "CB", "Merci", etc.
   - Numéros de caisse, date/heure de paiement
   - Publicités ou promotions vides

4. Gère les formats de prix français :
   - "3,50" → 3.50
   - "1.234,56" → 1234.56

5. Sois conservateur sur la confiance :
   - Si une ligne est illisible, skip plutôt que deviner

CONTEXTE : Magasins français typiques, produits alimentaires courants.

Retourne UNIQUEMENT le JSON, sans commentaire ni texte additionnel.`;
```

### Database Schema Extensions

#### Table: `receipt_scan_history`

```sql
CREATE TABLE receipt_scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Image & scan data
  image_url TEXT,
  image_deleted_at TIMESTAMP,
  
  -- Scan results
  store_name TEXT,
  scan_date DATE,
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  products_count INTEGER,
  products_matched_count INTEGER,
  
  -- Processing meta
  gpt_cost_usd DECIMAL(6,4),
  processing_time_ms INTEGER,
  scan_status TEXT CHECK (scan_status IN ('success', 'partial', 'failed')),
  error_code TEXT,
  
  -- User actions
  confirmed_at TIMESTAMP,
  items_added_count INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_receipt_history_user ON receipt_scan_history(user_id);
CREATE INDEX idx_receipt_history_date ON receipt_scan_history(scan_date DESC);
```

#### Table: `pantry_items` (Extension)

Ajouter colonnes :
```sql
ALTER TABLE pantry_items ADD COLUMN source_type TEXT DEFAULT 'manual' 
  CHECK (source_type IN ('manual', 'barcode', 'receipt', 'assistant'));
ALTER TABLE pantry_items ADD COLUMN receipt_scan_id UUID 
  REFERENCES receipt_scan_history(id) ON DELETE SET NULL;
ALTER TABLE pantry_items ADD COLUMN openfoodfacts_code TEXT;
```

### Frontend Components

#### Nouveaux composants à créer :

```
src/components/receipt/
├── ReceiptScanner.tsx           # Container principal
├── CameraCapture.tsx            # Gestion caméra
├── ReceiptPreview.tsx           # Preview avant envoi
├── ScanProgress.tsx             # Loader animé
├── ProductConfirmation.tsx      # Liste de validation
├── ProductCard.tsx              # Card individuelle éditable
├── ScanErrorFallback.tsx        # Gestion erreurs
└── ScanHistory.tsx              # Historique (V2)
```

#### Hooks à créer :

```
src/hooks/
├── useReceiptScanner.ts         # Logique scan
├── useImageUpload.ts            # Upload Supabase
├── useProductEnrichment.ts      # OpenFoodFacts
└── useExpirationEstimator.ts    # Estimation dates
```

#### Services à créer :

```
src/services/
├── gptVisionService.ts          # Call GPT-4 Vision
├── openFoodFactsService.ts      # Extend existing
└── receiptParserService.ts      # Post-processing
```

---

## 🧪 Testing Strategy

### Test Plan

| Type | Coverage | Tools |
|------|----------|-------|
| **Unit Tests** | 80%+ | Vitest + Testing Library |
| **Integration Tests** | Key flows | Playwright |
| **E2E Tests** | Happy path + errors | Playwright |
| **Performance Tests** | API response times | Custom scripts |
| **Accessibility** | WCAG AA | axe-core |

### Critical Test Cases

#### Unit Tests
- ✅ GPT Vision response parsing
- ✅ OpenFoodFacts matching logic
- ✅ Expiration date estimation rules
- ✅ Product categorization algorithm
- ✅ Price parsing (French format)

#### Integration Tests
- ✅ Full scan flow (mock GPT response)
- ✅ Product confirmation & edit
- ✅ Batch insert to DB
- ✅ Image upload & cleanup

#### E2E Tests (Real tickets)
- ✅ Scan Carrefour ticket
- ✅ Scan Leclerc ticket
- ✅ Scan Lidl ticket (discount)
- ✅ Scan Bio/organic store ticket
- ✅ Handle illegible ticket
- ✅ Handle timeout

---

## ⚠️ Risks & Mitigation

| Risk | Probabilité | Impact | Mitigation |
|------|-------------|--------|-----------|
| **GPT Vision précision < 85%** | Moyenne | Élevé | • Tests sur 100+ vrais tickets<br>• Amélioration prompt itérative<br>• Fallback saisie manuelle |
| **Coût API élevé** | Faible | Moyen | • Utiliser GPT-4o mini ($0.005/scan)<br>• Cache intelligent<br>• Limiter scans gratuits |
| **Tickets illisibles** | Élevée | Moyen | • Guide utilisateur (tips photo)<br>• Retry automatique<br>• Crop/rotate tools |
| **OpenFoodFacts incomplete** | Moyenne | Faible | • Fallback sur nom GPT<br>• Permettre ajout manuel<br>• Contribuer à OFF |
| **Latence réseau** | Faible | Moyen | • Feedback temps réel<br>• Timeout 10s<br>• Async avec retry |
| **Doublons tickets** | Moyenne | Faible | • Hash image pour détecter<br>• Confirmation user |

---

## 📅 Implementation Roadmap

### 🎯 Phase 1 : MVP Core (Sprint 1-2) — 2 semaines

**Objectif** : Feature fonctionnelle end-to-end avec happy path

**Scope** :
- ✅ UI : Page scan + camera + preview
- ✅ Backend : GPT-4 Vision integration
- ✅ OpenFoodFacts basic matching
- ✅ Product confirmation screen
- ✅ Batch insert to pantry_items
- ✅ Basic error handling

**Livrables** :
- [ ] Component `ReceiptScanner.tsx`
- [ ] Hook `useReceiptScanner.ts`
- [ ] API endpoint `/api/receipts/scan`
- [ ] GPT Vision service
- [ ] DB migration (receipt_scan_history)
- [ ] Tests unitaires clés

**Definition of Done** :
- User peut scanner un ticket Carrefour standard
- Produits extraits avec 80%+ précision
- Confirmation user fonctionnelle
- Produits ajoutés à l'inventaire

---

### 🔧 Phase 2 : Robustness & Edge Cases (Sprint 3) — 1 semaine

**Objectif** : Gérer les cas limites et améliorer UX

**Scope** :
- ✅ Error handling complet (illisible, timeout, rate limit)
- ✅ Retry logic intelligent
- ✅ Loading states & skeleton UI
- ✅ Estimation dates de péremption
- ✅ Auto-catégorisation (frigo/placard)
- ✅ Image compression côté client

**Livrables** :
- [ ] Service `expirationEstimator.ts`
- [ ] Error fallback components
- [ ] Retry avec exponential backoff
- [ ] Toast notifications
- [ ] Analytics events

---

### 🚀 Phase 3 : Enrichment & Optimization (Sprint 4) — 1 semaine

**Objectif** : Maximiser la valeur et l'engagement

**Scope** :
- ✅ OpenFoodFacts full enrichment (nutriscore, allergènes)
- ✅ Product photos display
- ✅ Multi-tickets support (scan plusieurs d'affilée)
- ✅ Scan history page
- ✅ Performance optimization (cache, lazy load)
- ✅ A/B test prompt GPT

**Livrables** :
- [ ] Enhanced OpenFoodFacts service
- [ ] Scan history UI
- [ ] Analytics dashboard (admin)
- [ ] Performance benchmarks

---

### 🎨 Phase 4 : Polish & Launch (Sprint 5) — 3 jours

**Objectif** : Prêt pour release publique

**Scope** :
- ✅ Onboarding tutorial (first scan)
- ✅ Tooltips & help center
- ✅ Animations & micro-interactions
- ✅ Accessibility audit (WCAG AA)
- ✅ E2E tests complets
- ✅ Release notes & changelog

**Livrables** :
- [ ] Tutorial component
- [ ] Help center article
- [ ] Accessibility report
- [ ] Release notes

---

## 💰 Budget & Resources

### Development Time Estimate

| Phase | Dev Days | Designer Days | QA Days | Total |
|-------|----------|---------------|---------|-------|
| Phase 1 (MVP) | 8 | 2 | 2 | 12 |
| Phase 2 (Robust) | 4 | 1 | 1 | 6 |
| Phase 3 (Enrich) | 4 | 1 | 1 | 6 |
| Phase 4 (Polish) | 2 | 1 | 1 | 4 |
| **TOTAL** | **18 jours** | **5 jours** | **5 jours** | **28 jours** |

**Équipe recommandée** :
- 1 Fullstack Dev (lead)
- 1 Frontend Dev (support)
- 1 Designer UI/UX (part-time)
- 1 QA Engineer (part-time)

---

### API Costs Projection

**Hypothèses** :
- 1000 utilisateurs actifs
- 5 tickets scannés/mois/user
- **Total scans/mois** : 5,000

| Service | Coût unitaire | Volume mensuel | Coût mensuel |
|---------|--------------|----------------|--------------|
| **GPT-4o mini Vision** | $0.005 | 5,000 scans | $25 |
| **OpenFoodFacts API** | Gratuit | 50,000 calls | $0 |
| **Supabase Storage** | $0.021/GB | ~5 GB (temp) | $0.10 |
| **Supabase DB** | Inclus | - | $0 |
| **TOTAL** | | | **~$25/mois** |

**Avec croissance à 10K users** :
- 50K scans/mois → **~$250/mois**

**Optimisations possibles** :
- Cache intelligent → -20% coûts
- GPT-4o mini au lieu de GPT-4o → -80% coûts
- Compression images → -50% storage

---

## 📊 Success Metrics & Analytics

### Events à tracker

```typescript
// Analytics events
analytics.track('receipt_scan_started', {
  user_id: string,
  timestamp: Date,
  source: 'camera' | 'gallery'
});

analytics.track('receipt_scan_completed', {
  user_id: string,
  scan_id: string,
  products_detected: number,
  processing_time_ms: number,
  confidence_avg: number,
  store: string
});

analytics.track('receipt_scan_confirmed', {
  user_id: string,
  scan_id: string,
  products_validated: number,
  products_edited: number,
  products_removed: number,
  time_to_confirm_s: number
});

analytics.track('receipt_scan_failed', {
  user_id: string,
  error_code: string,
  retry_count: number
});
```

### Dashboard Metrics

**Product Manager View** :
- Scans/jour, scans/semaine, scans/mois (trend)
- Taux de réussite scan (%)
- Temps moyen de traitement (ms)
- Taux de confirmation user (%)
- Produits moyens par ticket
- Magasins les plus scannés (top 5)

**Technical View** :
- GPT-4 Vision latency (p50, p95, p99)
- OpenFoodFacts match rate (%)
- Error rate par type
- Retry rate
- Storage usage (GB)
- API costs/jour ($)

---

## 🎓 Documentation & Training

### User Documentation
- 📖 Article Help Center : "Comment scanner un ticket de caisse"
- 🎥 Video tutorial (30s) : First scan walkthrough
- 💡 Tooltips in-app : Tips pour une photo réussie

### Developer Documentation
- 📘 Technical spec : GPT Vision integration
- 📘 API Reference : `/api/receipts/*` endpoints
- 📘 Troubleshooting guide : Common errors & fixes
- 📘 Performance optimization guide

---

## 🚦 Launch Criteria (Go/No-Go)

### Must-Have (Blockers)
- [ ] Taux de réussite scan ≥ 80% sur 50 tickets réels
- [ ] Temps de traitement ≤ 10s (p95)
- [ ] Zero critical bugs
- [ ] Accessibility score ≥ 90 (Lighthouse)
- [ ] User testing validé (5+ users, NPS > 40)

### Should-Have
- [ ] OpenFoodFacts match rate ≥ 70%
- [ ] Error handling complet
- [ ] Analytics events en place
- [ ] Help center article publié

### Nice-to-Have
- [ ] Multi-tickets support
- [ ] Scan history
- [ ] A/B test prompt GPT

---

## 📞 Stakeholders & Communication

| Stakeholder | Role | Updates | Feedback Loop |
|-------------|------|---------|---------------|
| **Faizal** | CEO/Product Owner | Daily Slack, Weekly sync | Product decisions |
| **Dev Team** | Implementation | Daily standup, PR reviews | Technical feasibility |
| **Design** | UX/UI | Bi-weekly design review | User flows & mockups |
| **QA** | Testing | End of each phase | Bug reports & test results |
| **Users** | Beta testers | Post-launch survey | NPS & feature requests |

---

## 🔄 Post-Launch Iteration Plan

### Week 1-2 : Observation & Hotfixes
- Monitor metrics dashboard 2x/jour
- Fix critical bugs sous 24h
- Collect user feedback (in-app + support)

### Week 3-4 : Quick Wins
- Améliorer prompt GPT basé sur échecs
- Optimiser matching OpenFoodFacts
- Ajuster règles d'estimation péremption

### Month 2 : Feature Enhancements (V1.1)
- Multi-tickets support
- Scan history avancé
- Partage familial (V2 scope)

---

## 🎉 Conclusion

Cette feature de **scan de tickets de caisse** est un **game-changer** pour Smart Pantry Pro :

✅ **Faisabilité technique** : Stack déjà en place (OpenAI API, Supabase, OpenFoodFacts)  
✅ **Impact UX** : Réduction drastique du friction d'onboarding  
✅ **Différenciation** : Aucune app française ne le fait aussi bien  
✅ **Coût maîtrisé** : ~$25-250/mois selon volume  
✅ **Timeline réaliste** : 4 semaines pour MVP + iterations

**Next Step** : Review ce PRD, puis lancer le Sprint 1 (Phase MVP) 🚀

---

**Signatures** :

- [ ] **Product Owner (Faizal)** : Validated ✅  
- [ ] **Tech Lead** : Reviewed & Approved ✅  
- [ ] **Designer** : UX Flows Validated ✅  
- [ ] **QA Lead** : Test Plan Reviewed ✅

**Date de validation** : _____________

**Date de lancement estimée** : _____________

---

*Ce PRD est un document vivant. Toute modification majeure nécessite validation du Product Owner.*