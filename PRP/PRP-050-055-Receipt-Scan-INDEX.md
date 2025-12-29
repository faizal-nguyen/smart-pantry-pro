# INDEX - Scan de Ticket de Caisse : Découpage en PRPs

**Projet**: Smart Pantry Pro
**Feature Globale**: Scan & Auto-import de Tickets de Caisse avec GPT Vision
**Version**: 1.0
**Date**: 21 Octobre 2025
**Basé sur**: PRD "Scan de Ticket de Caisse" (voir `Scan de Ticket de Cais.md`)

---

## 📋 Vue d'Ensemble

Ce document index présente le découpage optimisé du PRD "Scan de Ticket de Caisse" en **6 PRPs modulaires et séquencées** pour une implémentation progressive, testable et maintenable.

### 🎯 Objectif Global

Permettre aux utilisateurs de scanner leur ticket de caisse en une photo pour ajouter automatiquement tous les produits à leur inventaire, avec enrichissement intelligent via GPT Vision + OpenFoodFacts.

### 📊 Impact Attendu

- **Réduction du temps de saisie** : de 5-10 min → 30 secondes
- **Augmentation de la rétention J7** : +25% (estimation)
- **Taux de réussite scan** : 85%+ (objectif V1)
- **Produits ajoutés/semaine/user** : de 12 → 35+

---

## 🏗️ Architecture Technique Globale

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│   ├─ CameraCapture → ReceiptPreview → ScanProgress         │
│   └─ ProductConfirmation → Batch Insert                     │
│                            │                                 │
│                            ▼                                 │
│                   SUPABASE STORAGE                           │
│                   (receipts-temp bucket)                     │
│                            │                                 │
│                            ▼                                 │
│              VERCEL EDGE FUNCTION                            │
│              /api/receipts/scan                              │
│                            │                                 │
│                            ▼                                 │
│           GPT-4 VISION API (OpenAI)                          │
│           ├─ Extraction produits                            │
│           └─ Parsing JSON                                   │
│                            │                                 │
│                            ▼                                 │
│          ENRICHMENT LAYER                                    │
│          ├─ OpenFoodFacts matching                          │
│          ├─ Expiration estimation                           │
│          └─ Auto-categorization                             │
│                            │                                 │
│                            ▼                                 │
│            SUPABASE DATABASE                                 │
│            ├─ pantry_items                                  │
│            ├─ receipt_scan_history                          │
│            └─ analytics_events                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Découpage en 6 PRPs

### **PRP-050: Infrastructure & Database Foundation**
📄 Fichier: `PRP-050-Receipt-Scan-Infrastructure-Database.md`

**Durée**: 2 jours
**Prérequis**: Aucun
**Phase**: 1/6 - Foundation

**Objectif**: Mettre en place l'infrastructure de base (database, storage, configuration)

**Livrables**:
- ✅ Migration table `receipt_scan_history`
- ✅ Extension table `pantry_items` (colonnes traçabilité)
- ✅ Bucket Supabase Storage `receipts-temp` avec RLS
- ✅ Variables d'environnement OpenAI
- ✅ Types TypeScript
- ✅ Edge Function cleanup automatique (24h)

**Technologies**: PostgreSQL, Supabase Storage, Deno Edge Functions

---

### **PRP-051: Backend GPT Vision Service & API**
📄 Fichier: `PRP-051-Receipt-Scan-Backend-GPT-Vision.md`

**Durée**: 3 jours
**Prérequis**: PRP-050
**Phase**: 2/6 - Backend Core

**Objectif**: Développer le service backend de traitement des tickets avec GPT-4 Vision

**Livrables**:
- ✅ Service `gptVisionService.ts` avec prompt optimisé FR
- ✅ API `/api/receipts/scan` (Vercel Edge Function)
- ✅ Parsing des nombres français (virgule → point)
- ✅ Retry logic avec exponential backoff
- ✅ Calcul coûts API
- ✅ Rate limiting (10 scans/h/user)
- ✅ Tests unitaires (coverage > 80%)

**Technologies**: OpenAI GPT-4 Vision, TypeScript, Vitest

---

### **PRP-052: Storage & Image Processing**
📄 Fichier: `PRP-052-Receipt-Scan-Storage-Image-Processing.md`

**Durée**: 2 jours
**Prérequis**: PRP-050
**Phase**: 3/6 - Image Processing

**Objectif**: Gestion complète des images : upload, compression, suppression EXIF

**Livrables**:
- ✅ Hook `useReceiptImageUpload.ts`
- ✅ Hook `useImageCapture.ts` (camera/galerie)
- ✅ Compression images (< 1MB cible)
- ✅ Suppression EXIF metadata (privacy)
- ✅ Validation format/taille
- ✅ Progress tracking
- ✅ Tests unitaires

**Technologies**: browser-image-compression, Supabase Storage

---

### **PRP-053: Frontend Components Core**
📄 Fichier: `PRP-053-Receipt-Scan-Frontend-Components.md`

**Durée**: 4 jours
**Prérequis**: PRP-051, PRP-052
**Phase**: 4/6 - Frontend Core

**Objectif**: Interface utilisateur complète pour le scan de tickets

**Livrables**:
- ✅ Container `ReceiptScanner.tsx`
- ✅ Composant `CameraCapture.tsx`
- ✅ Composant `ReceiptPreview.tsx`
- ✅ Composant `ScanProgress.tsx` (loading animé)
- ✅ Composant `ScanErrorFallback.tsx`
- ✅ Hook `useReceiptScanner.ts`
- ✅ Navigation depuis inventaire
- ✅ Tests React Testing Library

**Technologies**: React 18, TypeScript, Tailwind CSS, shadcn/ui

---

### **PRP-054: Product Enrichment & Validation UI**
📄 Fichier: `PRP-054-Receipt-Scan-Product-Enrichment-Validation.md`

**Durée**: 4 jours
**Prérequis**: PRP-053
**Phase**: 5/6 - Enrichment & Validation

**Objectif**: Enrichissement produits et interface de validation/édition

**Livrables**:
- ✅ Extension `openFoodFactsService.ts` (fuzzy matching)
- ✅ Service `expirationEstimator.ts` (règles métier)
- ✅ Service `productCategorizer.ts` (auto-catégorisation)
- ✅ Hook `useProductEnrichment.ts`
- ✅ Composant `ProductCard.tsx` (éditable)
- ✅ Page `ReceiptConfirmPage.tsx`
- ✅ Batch insert vers `pantry_items`
- ✅ Tests unitaires

**Technologies**: OpenFoodFacts API, Fuse.js (fuzzy search), React

---

### **PRP-055: Polish, Analytics & Launch Readiness**
📄 Fichier: `PRP-055-Receipt-Scan-Polish-Analytics-Launch.md`

**Durée**: 3 jours
**Prérequis**: PRP-050, PRP-051, PRP-052, PRP-053, PRP-054
**Phase**: 6/6 - Launch Readiness

**Objectif**: Finalisation pour le lancement : analytics, optimisations, tests E2E

**Livrables**:
- ✅ Service `receiptAnalytics.ts` (tracking complet)
- ✅ Migration table `analytics_events`
- ✅ Composant `OnboardingTooltip.tsx` (premier scan)
- ✅ Page `ReceiptHistoryPage.tsx` (historique)
- ✅ Tests E2E Playwright (50+ vrais tickets)
- ✅ Performance optimizations (lazy loading, code splitting)
- ✅ Accessibility audit (score > 90)
- ✅ Documentation utilisateur

**Technologies**: Playwright, Supabase Analytics, Lighthouse

---

## 📅 Planning Global

### Timeline Séquentielle (18 jours développeur)

```
Semaine 1 (5j):
├─ Jour 1-2    : PRP-050 (Infrastructure)
├─ Jour 3-5    : PRP-051 (Backend GPT) ── en parallèle ──┐
└─ Jour 3-4    : PRP-052 (Storage)      ── en parallèle ──┘

Semaine 2 (5j):
└─ Jour 6-9    : PRP-053 (Frontend Components)
└─ Jour 10     : Buffer / Tests intégration

Semaine 3 (5j):
├─ Jour 11-14  : PRP-054 (Enrichment & Validation)
└─ Jour 15     : Buffer / Revue code

Semaine 4 (3j):
└─ Jour 16-18  : PRP-055 (Polish & Launch)
```

### Timeline Parallélisée (12 jours équipe)

Avec 2 développeurs en parallèle :

```
Semaine 1-2:
Dev 1: PRP-050 → PRP-051 → PRP-053
Dev 2: PRP-050 → PRP-052 → PRP-054

Semaine 3:
Dev 1 + Dev 2: PRP-055 (ensemble)
```

---

## 💰 Budget Estimatif

### Développement

| Phase | Jours | Coût (€/j = 600€) | Total |
|-------|-------|-------------------|-------|
| PRP-050 | 2j | 600€ | 1 200€ |
| PRP-051 | 3j | 600€ | 1 800€ |
| PRP-052 | 2j | 600€ | 1 200€ |
| PRP-053 | 4j | 600€ | 2 400€ |
| PRP-054 | 4j | 600€ | 2 400€ |
| PRP-055 | 3j | 600€ | 1 800€ |
| **TOTAL** | **18j** | | **10 800€** |

### Coûts API (mensuel)

| Volume | Scans/mois | Coût GPT-4o-mini | Coût Storage | Total |
|--------|------------|------------------|--------------|-------|
| **Beta (100 users)** | 500 | $25 | $0.10 | **~$25** |
| **Launch (1K users)** | 5,000 | $250 | $1 | **~$251** |
| **Growth (10K users)** | 50,000 | $2,500 | $10 | **~$2,510** |

---

## 🎯 Success Metrics (KPIs)

### Métriques Produit

| Métrique | Baseline | Objectif V1 | Mesure |
|----------|----------|-------------|--------|
| % users utilisant le scan | 0% | 60% | Analytics |
| Taux de réussite scan | - | 85% | API logs |
| Temps moyen ajout courses | 8 min | 45s | Analytics |
| Produits ajoutés/semaine/user | 12 | 35 | Database |
| NPS sur la feature | - | 50+ | Survey |

### Métriques Techniques

| Métrique | Target | Mesure |
|----------|--------|--------|
| API response time (p95) | < 10s | Monitoring |
| OpenFoodFacts match rate | > 70% | Logs |
| Error rate | < 5% | Sentry |
| Bundle size (receipt chunk) | < 150KB | Build |

---

## 🧪 Strategy de Tests

### Par PRP

| PRP | Tests Unitaires | Tests Intégration | Tests E2E |
|-----|----------------|-------------------|-----------|
| PRP-050 | SQL, RLS policies | Database ops | - |
| PRP-051 | Service, parsing | API endpoint | - |
| PRP-052 | Image utils | Upload flow | - |
| PRP-053 | Components | User flows | - |
| PRP-054 | Enrichment logic | Full flow | - |
| PRP-055 | Analytics | - | **50+ tickets** |

### Tests E2E Critiques (PRP-055)

- ✅ Happy path complet (capture → confirmation → inventaire)
- ✅ Error handling (timeout, rate limit, illisible)
- ✅ 50 tickets réels (Carrefour, Leclerc, Lidl, Auchan, Bio)
- ✅ Mobile Safari + Chrome Android
- ✅ Accessibility (screen readers)

---

## 🔒 Sécurité & Privacy (RGPD)

### Mesures Implémentées

1. **Suppression EXIF** (PRP-052):
   - Toutes métadonnées (GPS, device, date) supprimées avant upload

2. **Cleanup automatique** (PRP-050):
   - Images supprimées après 24h (Edge Function cron)

3. **Row Level Security** (PRP-050):
   - Users voient uniquement leurs propres scans

4. **Rate Limiting** (PRP-051):
   - 10 scans/heure/user (protection abus)

5. **API Key Protection**:
   - `OPENAI_API_KEY` jamais exposée côté client

---

## 🚀 Plan de Lancement

### Phase 1: Beta (J-14 à J-7)
- [ ] Déploiement staging
- [ ] Tests avec 10 beta testers internes
- [ ] Collect feedback & ajustements

### Phase 2: Soft Launch (J-7 à J-0)
- [ ] Rollout 10% utilisateurs
- [ ] Monitoring 24/7
- [ ] Ajustements prompt GPT si nécessaire

### Phase 3: Full Launch (J-0)
- [ ] Rollout progressif : 25% → 50% → 100%
- [ ] Communication email
- [ ] Post blog / social media

### Phase 4: Post-Launch (J+7)
- [ ] Review analytics
- [ ] Identify quick wins
- [ ] Plan V2 features

---

## 📚 Documentation

### Technique
- [PRP-050] Infrastructure & Database
- [PRP-051] Backend GPT Vision Service
- [PRP-052] Storage & Image Processing
- [PRP-053] Frontend Components
- [PRP-054] Product Enrichment
- [PRP-055] Launch Readiness

### Utilisateur
- Guide "Comment scanner un ticket"
- FAQ Scan de tickets
- Troubleshooting (ticket illisible, etc.)

### Admin
- Dashboard analytics
- Cost monitoring
- Error tracking

---

## 🔄 Roadmap V2 (Post-Launch)

### Features Potentielles

1. **Multi-tickets en parallèle** (3j)
   - Scanner plusieurs tickets d'affilée
   - Queue de traitement

2. **Historique avancé** (2j)
   - Statistiques par magasin
   - Graphiques dépenses

3. **Partage familial** (5j)
   - Partager un scan avec le foyer
   - Multi-user validation

4. **Export PDF** (2j)
   - Générer PDF récapitulatif
   - Archive tickets scannés

5. **Amélioration IA** (ongoing)
   - Fine-tuning prompt GPT
   - Fallback Tesseract OCR
   - Support tickets manuscrits

---

## 👥 Équipe Recommandée

| Rôle | Responsabilités | PRPs |
|------|----------------|------|
| **Fullstack Lead** | Backend + Database | PRP-050, PRP-051 |
| **Frontend Dev** | UI Components | PRP-052, PRP-053 |
| **Fullstack Dev** | Enrichment + Polish | PRP-054, PRP-055 |
| **Designer UI/UX** | Maquettes + User flows | Toutes (review) |
| **QA Engineer** | Tests E2E + Validation | PRP-055 |

---

## ✅ Checklist Finale (Before Launch)

### Technique
- [ ] Tous les tests passent (unit + integration + E2E)
- [ ] Coverage code > 75%
- [ ] Performance benchmarks atteints
- [ ] Accessibility score > 90
- [ ] Error monitoring configuré (Sentry)
- [ ] Analytics events testés
- [ ] Cleanup 24h fonctionnel

### Produit
- [ ] 50 tickets réels testés (taux succès > 85%)
- [ ] User testing (5+ utilisateurs, NPS > 40)
- [ ] Documentation utilisateur publiée
- [ ] Onboarding tooltip validé
- [ ] Historique des scans fonctionnel

### Business
- [ ] Coûts API validés (< budget)
- [ ] Rate limiting testé
- [ ] Communication préparée (email, blog)
- [ ] Support prêt (FAQ, help center)

---

## 📞 Contacts & Support

**Product Owner**: Faizal
**Tech Lead**: [À définir]
**QA Lead**: [À définir]

**Slack Channels**:
- `#receipt-scan-dev` - Développement
- `#receipt-scan-qa` - Tests & bugs
- `#receipt-scan-analytics` - Métriques

---

## 🎉 Conclusion

Ce découpage en 6 PRPs modulaires permet une **implémentation progressive, testable et maintenable** de la fonctionnalité "Scan de Ticket de Caisse".

**Avantages du découpage** :
✅ Phases indépendantes et testables
✅ Parallélisation possible (2 devs)
✅ Risques isolés par phase
✅ Feedback continu (demo après chaque PRP)
✅ Possibilité d'arrêt/pivot à tout moment

**Timeline optimiste** : 12 jours (2 devs en parallèle)
**Timeline réaliste** : 18 jours (1 dev fullstack)
**Timeline conservative** : 22 jours (avec buffer 20%)

---

**Date de création** : 21 Octobre 2025
**Version** : 1.0
**Status** : ✅ Ready for Implementation
