# KPIs et Métriques - Smart Pantry Pro

## Vue d'ensemble

Ce document définit les indicateurs clés de performance (KPIs) pour mesurer le succès de Smart Pantry Pro à travers les dimensions produit, business, technique et impact sociétal.

## Framework de Mesure

### North Star Metric

**Réduction du gaspillage alimentaire par utilisateur actif**

```
Formule: (Produits sauvés / Produits achetés) × 100
Target: 50% de réduction vs baseline
Actuel: 32%
```

### Pyramide des Métriques

```
                 North Star
                     ↑
            ┌────────┴────────┐
         Leading          Lagging
            ↑                ↑
    ┌───────┴───────┐  ┌────┴────┐
   Input         Output  Business  Impact
```

## 1. Métriques Produit

### 1.1 Acquisition

| Métrique | Définition | Target | Actuel | Trend |
|----------|-----------|--------|---------|-------|
| Visiteurs uniques | Sessions web mensuelles | 50K | 35K | ↑ 15% |
| Taux de conversion | Visiteur → Inscription | 15% | 12% | ↑ 2% |
| CAC | Coût d'acquisition client | <10€ | 8.5€ | ↓ 1€ |
| Sources d'acquisition | Top 3 canaux | Organic 40% | Organic 35% | → |

**Funnel d'acquisition**:
```
Landing Page: 100% (35,000)
         ↓
  Sign Up Page: 28% (9,800)
         ↓
  Email Confirmed: 20% (7,000)
         ↓
  Profile Complete: 15% (5,250)
         ↓
  First Product Added: 12% (4,200)
```

### 1.2 Activation

| Métrique | Définition | Target | Actuel |
|----------|-----------|--------|---------|
| Time to Value | Temps jusqu'au 1er "aha" | <5 min | 7 min |
| Activation Rate | Users avec 5+ produits (J7) | 60% | 52% |
| Setup Completion | Profil 100% rempli | 80% | 73% |
| Feature Adoption | Utilisent 3+ features (J30) | 50% | 41% |

**Activation Milestones**:
1. Premier produit ajouté (85%)
2. Première alerte utile reçue (62%)
3. Première recette consultée (48%)
4. Première liste courses créée (41%)
5. Premier planning repas (28%)

### 1.3 Engagement

| Métrique | Définition | Target | Actuel |
|----------|-----------|--------|---------|
| DAU | Daily Active Users | 10K | 7.5K |
| MAU | Monthly Active Users | 25K | 21K |
| DAU/MAU | Stickiness | 40% | 36% |
| Session Length | Durée moyenne session | 5 min | 4.2 min |
| Sessions/User/Week | Fréquence usage | 5 | 3.8 |

**Engagement par Feature**:
```javascript
const featureEngagement = {
  pantryManagement: { users: 21000, avgUsage: "daily" },
  recipeSearch: { users: 15000, avgUsage: "weekly" },
  shoppingList: { users: 12000, avgUsage: "weekly" },
  mealPlanning: { users: 8000, avgUsage: "weekly" },
  aiAssistant: { users: 5000, avgUsage: "monthly" }
};
```

### 1.4 Rétention

| Période | Target | Actuel | Benchmark |
|---------|--------|---------|-----------|
| J1 | 80% | 77% | 75% |
| J7 | 70% | 68% | 60% |
| J30 | 50% | 45% | 35% |
| J90 | 40% | 32% | 25% |
| J180 | 35% | 26% | 20% |

**Cohorte Analysis**:
```
Cohorte   M0    M1    M2    M3    M4    M5    M6
Jan-24   100%   45%   38%   32%   28%   26%   24%
Dec-23   100%   48%   40%   35%   31%   29%   27%
Nov-23   100%   43%   36%   30%   27%   25%   23%
```

### 1.5 Monetization

| Métrique | Définition | Target | Actuel |
|----------|-----------|--------|---------|
| Conversion Rate | Free → Pro | 10% | 8.2% |
| ARPU | Revenue par user | 3€ | 2.4€ |
| MRR | Monthly Recurring Revenue | 75K€ | 52K€ |
| Churn Rate | Désabonnements mensuels | <5% | 6.2% |
| LTV | Lifetime Value | 120€ | 95€ |

**Revenue Breakdown**:
```
Pro Subscriptions: 85% (44.2K€)
Family Plans: 12% (6.2K€)
API Access: 3% (1.6K€)
```

## 2. Métriques Business

### 2.1 Croissance

| Métrique | Q4 2023 | Q1 2024 | Target Q2 | YoY |
|----------|---------|---------|-----------|-----|
| Utilisateurs totaux | 15K | 25K | 40K | +167% |
| Revenue | 35K€ | 52K€ | 75K€ | +114% |
| Pays couverts | 1 | 1 | 3 | - |
| Team size | 4 | 6 | 8 | +50% |

### 2.2 Unit Economics

```
LTV (Lifetime Value): 95€
├── ARPU: 2.4€/mois
├── Durée de vie moyenne: 39.6 mois
└── Marge brute: 82%

CAC (Customer Acquisition Cost): 8.5€
├── Marketing: 5€
├── Sales: 1€
└── Onboarding: 2.5€

LTV/CAC Ratio: 11.2 (Target: >3)
Payback Period: 3.5 mois (Target: <12)
```

### 2.3 Financial Health

| Métrique | Valeur | Target | Status |
|----------|--------|--------|--------|
| Burn Rate | 25K€/mois | <30K€ | ✅ |
| Runway | 18 mois | >12 mois | ✅ |
| Gross Margin | 82% | >80% | ✅ |
| EBITDA | -15K€ | Break-even Q4 | 🔄 |

## 3. Métriques Techniques

### 3.1 Performance

| Métrique | Target | Actuel | P95 |
|----------|--------|---------|-----|
| Page Load Time | <2s | 1.8s | 2.3s |
| API Response Time | <200ms | 150ms | 280ms |
| First Contentful Paint | <1s | 0.9s | 1.2s |
| Lighthouse Score | >90 | 92 | - |

### 3.2 Fiabilité

| Métrique | Target | Actuel | Incidents |
|----------|--------|---------|-----------|
| Uptime | 99.9% | 99.92% | 2/mois |
| Error Rate | <0.1% | 0.08% | - |
| Success Rate API | >99% | 99.3% | - |
| Database Response | <50ms | 35ms | - |

### 3.3 Scalabilité

```
Capacité actuelle:
- Requêtes/seconde: 1,000 (pic: 750)
- Utilisateurs simultanés: 5,000 (pic: 3,200)
- Stockage utilisé: 2TB / 10TB
- Bande passante: 500GB / 2TB mois
```

## 4. Métriques d'Impact

### 4.1 Impact Environnemental

| Métrique | Total | Par User | Équivalent |
|----------|-------|----------|------------|
| Nourriture sauvée | 125 tonnes | 5kg/mois | 250K repas |
| CO2 évité | 375 tonnes | 15kg/mois | 75 voitures/an |
| Eau économisée | 50M litres | 2000L/mois | 20 piscines |
| Argent économisé | 750K€ | 30€/mois | - |

### 4.2 Impact Social

```
Utilisateurs actifs: 25,000
├── Familles: 15,000 (60%)
├── Étudiants: 5,000 (20%)
├── Seniors: 2,500 (10%)
└── Autres: 2,500 (10%)

Satisfaction (NPS): 52
├── Promoteurs: 58%
├── Passifs: 32%
└── Détracteurs: 10%
```

## 5. Métriques par Feature

### 5.1 Garde-Manger

| Action | Volume/Jour | Temps Moyen | Success Rate |
|--------|------------|-------------|--------------|
| Ajout produit | 45K | 15s | 98% |
| Scan barcode | 8K | 8s | 92% |
| Update quantité | 25K | 5s | 99% |
| Check expiry | 120K | 2s | 100% |

### 5.2 Recettes

| Métrique | Valeur | Trend |
|----------|--------|-------|
| Recettes consultées/jour | 35K | ↑ 12% |
| Extraction URL/jour | 2.5K | ↑ 25% |
| Taux de succès extraction | 85% | ↑ 5% |
| Recettes sauvegardées | 125K | - |
| Note moyenne | 4.3/5 | → |

### 5.3 Assistant IA

| Métrique | Usage | Coût | ROI |
|----------|-------|------|-----|
| Requêtes/jour | 5K | 50€ | - |
| Suggestions acceptées | 68% | - | - |
| Temps de réponse | 2.1s | - | - |
| Satisfaction | 4.5/5 | - | 3.2x |

## 6. Dashboards et Reporting

### 6.1 Real-time Dashboard

```typescript
interface RealtimeDashboard {
  activeUsers: number;          // Mise à jour: 1 min
  apiHealth: HealthStatus;      // Mise à jour: 30s
  revenueToday: number;        // Mise à jour: 5 min
  newSignups: number;          // Mise à jour: 1 min
  topFeatures: Feature[];      // Mise à jour: 5 min
}
```

### 6.2 Weekly Business Review

**Format Email CEO/Investisseurs**:
1. **Highlights** (3 points max)
2. **Métriques clés** (tableau)
3. **Tendances** (graphiques)
4. **Actions** (3 priorités)
5. **Risques** (si applicable)

### 6.3 Monthly Deep Dive

**Sections**:
- Analyse cohortes détaillée
- Feature adoption funnel
- Churn analysis & reasons
- Customer feedback synthesis
- Competitive benchmarking

## 7. Alertes et Seuils

### Alertes Critiques (Immediate)

| Condition | Seuil | Action |
|-----------|-------|--------|
| API Error Rate | >5% | Page oncall |
| Churn spike | >10%/jour | Alert CEO |
| Security breach | Any | All hands |
| Uptime | <99% | Incident report |

### Alertes Business (Daily)

| Métrique | Seuil Yellow | Seuil Red |
|----------|--------------|-----------|
| DAU drop | -10% | -20% |
| Conversion | <7% | <5% |
| CAC | >12€ | >15€ |
| NPS | <45 | <40 |

## 8. Outils et Stack Analytics

### Collection
- **Frontend**: Mixpanel, Hotjar
- **Backend**: Custom events → PostgreSQL
- **Infra**: Datadog, Vercel Analytics

### Processing
- **ETL**: Airbyte → BigQuery
- **Transformation**: dbt
- **Orchestration**: Airflow

### Visualization
- **Dashboards**: Metabase
- **Alerts**: Datadog + Slack
- **Reports**: Google Sheets API

## 9. Privacy et Compliance

### Données Collectées
✅ Anonymisées par défaut
✅ Opt-in pour tracking avancé
✅ Retention 24 mois max
✅ GDPR compliant

### Données NON Collectées
❌ Données de santé précises
❌ Localisation précise
❌ Données financières
❌ Contenu des recettes privées

## 10. Roadmap Analytics

### Q1 2024
- [ ] Predictive churn model
- [ ] A/B testing framework
- [ ] Attribution modeling
- [ ] Real-time personalization

### Q2 2024
- [ ] ML pour recommendations
- [ ] Cohort predictions
- [ ] Price elasticity testing
- [ ] Cross-platform tracking

---

*Les métriques sont mises à jour quotidiennement dans le dashboard interne. Pour accès: analytics.smartpantrypro.com*