# PRP-200 : Plan d'Execution - Core Pain Point

> **Version** : 1.0.0
> **Date** : 2025-12-28
> **Focus** : Garder l'inventaire a jour SANS EFFORT
> **Genere par** : 5 Agents IA Specialises

---

## CONSTAT CLAIR

### Le Vrai Probleme
**Toutes les apps d'inventaire alimentaire echouent pour la meme raison : TROP DE FRICTION.**

```
SITUATION ACTUELLE (apps concurrentes):
- 9-11 taps par produit ajoute
- 10 produits = 90-110 actions
- Resultat : abandon apres 2-3 utilisations

CE QUE LES GENS VEULENT :
1. Scanner mon ticket de caisse → tout est ajoute
2. Dire "j'ai utilise 2 oeufs" → inventaire mis a jour
3. C'est TOUT.
```

### Concurrents Analyses

| App | Statut | Pourquoi ca n'a pas marche |
|-----|--------|---------------------------|
| **Yummly** | FERME (dec 2024) | 20M users mais pas de vrai inventaire |
| **CozZo** | FERME (dec 2025) | Infrastructure non viable |
| **Fridgely** | ABANDONNE | Bugs, pas de scan ticket |
| **NoWaste** | Vivant mais faible | Trop manuel, 7 ans sans percee |
| **Grocy** | Open source | Setup technique, UI datee |

### L'Opportunite Blue Ocean

```
PERSONNE NE FAIT CA BIEN :

1. Scan ticket → inventaire auto     [ZERO solution grand public]
2. Voice-first pour consommation     [ZERO solution dediee]
3. Zero friction (1-2 taps max)      [TOUT le monde echoue]
```

---

## STRATEGIE : 2 FEATURES KILLER

### Feature #1 : SCAN TICKET EXPRESS

```
PARCOURS UTILISATEUR :

[Utilisateur fait ses courses]
         |
         v
[Prend en photo son ticket]
         |
         v
[OCR + IA reconnaissent les produits]
         |
         v
[Liste de produits a confirmer]
         |
         v
[1 TAP : Tout ajouter a l'inventaire]
         |
         v
[Inventaire a jour]

TOTAL : 2-3 TAPS pour 20+ produits
```

### Feature #2 : VOICE AGENT CONSOMMATION

```
PARCOURS UTILISATEUR :

[Utilisateur cuisine]
         |
         v
[Dit : "J'ai utilise 2 oeufs"]
         |
         v
[Voice Agent comprend et confirme]
         |
         v
[Inventaire mis a jour]
         |
         v
[Feedback vocal : "C'est note, il reste 10 oeufs"]

TOTAL : 0 TAP, mains libres
```

---

## ANALYSE TECHNIQUE

### Scan Ticket : Faisabilite CONFIRMEE

| Aspect | Solution | Cout |
|--------|----------|------|
| **OCR** | GPT-4o-mini Vision | $0.005/scan |
| **Precision** | 90-95% (tickets FR) | - |
| **Matching produits** | OFF + Alias DB + Fuzzy | $0 |
| **Latence** | 3-5 secondes | - |

**Pipeline valide :**
```
Photo ticket → GPT-4o-mini Vision → Extraction line items
      → Matching OpenFoodFacts → Enrichissement (expiration, localisation)
           → Presentation utilisateur → Ajout batch inventaire
```

### Voice Agent : Faisabilite CONFIRMEE

| Aspect | Solution | Cout |
|--------|----------|------|
| **STT** | Web Speech API | $0 |
| **NLU** | Patterns FR + GPT fallback | ~$0.001/requete |
| **TTS** | Web Speech API | $0 |
| **Latence** | < 2 secondes | - |

**Intents a supporter :**
```
CONSOMMATION:
- "J'ai utilise X de Y"      → consume(product, quantity)
- "J'ai fini le Y"           → finish(product)
- "Plus de Y"                → finish(product)
- "Dernier Y"                → setQuantity(product, 1)

VERIFICATION:
- "Il reste combien de Y ?"  → checkStock(product)
- "Qu'est-ce qui expire ?"   → listExpiring()
```

---

## PLAN D'EXECUTION

### Phase A : Scan Ticket (3 semaines)

```
SEMAINE 1 : Infrastructure
├── PRP-050 : Schema DB scans (1 jour)
├── PRP-051 : Service GPT Vision (2 jours)
├── PRP-052 : Storage images Supabase (1 jour)
└── Tests unitaires

SEMAINE 2 : Matching & Enrichissement
├── PRP-053 : Dictionnaire abbreviations FR (1 jour)
├── PRP-054 : Service matching intelligent (2 jours)
│   ├── Fuzzy string matching
│   ├── Alias database (200+ entries)
│   └── OpenFoodFacts integration
├── PRP-055 : Enrichissement auto (1 jour)
│   ├── Estimation date expiration
│   └── Suggestion localisation
└── Tests integration

SEMAINE 3 : UI/UX
├── PRP-056 : Composant ReceiptScanner (2 jours)
│   ├── Camera capture
│   ├── Preview & confirm
│   └── Liste produits detectes
├── PRP-057 : Ecran validation (1 jour)
│   ├── Correction OCR
│   └── Ajout batch
├── Integration dans flow existant
└── Tests E2E (50+ tickets reels)
```

### Phase B : Voice Agent (2 semaines)

```
SEMAINE 4 : Core Voice
├── PRP-060 : Patterns consommation FR (1 jour)
│   ├── consume, finish, lastOne
│   └── Quantites relatives ("un peu", "beaucoup")
├── PRP-061 : Intent classifier (1 jour)
├── PRP-062 : Dialog manager (2 jours)
│   ├── Confirmation adaptative
│   ├── Disambiguation
│   └── Corrections ("non pas 3, j'ai dit 2")
└── Integration useInventory

SEMAINE 5 : UI & Polish
├── PRP-063 : Mode Cuisine UI (2 jours)
│   ├── Bouton vocal permanent
│   ├── Feedback visuel large
│   └── Auto-confirmation 3s
├── PRP-064 : Micro-interactions (1 jour)
│   ├── Vibrations haptic
│   ├── Sons feedback
│   └── Animations
└── Tests utilisateurs
```

### Phase C : Quick Wins (1 semaine)

```
SEMAINE 6 : Polish & Launch
├── Notifications intelligentes
│   ├── Post-courses (GPS)
│   └── Expiration alerts
├── Widget iOS/Android (basique)
├── Onboarding simplifie
└── Metriques & analytics
```

---

## FICHIERS A CREER/MODIFIER

### Nouveaux Fichiers (Scan Ticket)

```
apps/api/src/
├── services/
│   └── receipt/
│       ├── gptVisionService.ts          # OCR via GPT-4o-mini
│       ├── receiptParserService.ts      # Extraction line items
│       ├── productMatcherService.ts     # Matching OFF
│       └── expirationEstimator.ts       # Estimation DLC
├── routes/
│   └── receipts.routes.ts               # POST /api/v1/receipts/scan

src/
├── services/
│   └── receipt/
│       ├── abbreviationDictionary.ts    # BEUR = Beurre, etc.
│       └── commercialAliases.ts         # Patterns enseignes FR
├── components/
│   └── receipt/
│       ├── ReceiptScanner.tsx           # Composant camera
│       ├── ReceiptPreview.tsx           # Apercu avant scan
│       ├── ProductValidationList.tsx    # Liste a valider
│       └── ReceiptScanFlow.tsx          # Flow complet
├── hooks/
│   └── useReceiptScan.ts                # Hook principal
└── pages/
    └── receipt/
        └── ScanReceiptPage.tsx          # Page dediee
```

### Nouveaux Fichiers (Voice Agent)

```
src/
├── services/
│   └── voice/
│       └── voiceAgent/
│           ├── types.ts                 # Intents, Entities, States
│           ├── intents.ts               # Patterns FR consommation
│           ├── dialogManager.ts         # Machine a etats
│           ├── consumptionExecutor.ts   # Actions inventaire
│           └── index.ts                 # Export
├── components/
│   └── voice/
│       ├── VoiceAgentButton.tsx         # Bouton mode cuisine
│       ├── VoiceAgentOverlay.tsx        # Overlay feedback
│       └── VoiceAgentFeedback.tsx       # Confirmation visuelle
└── hooks/
    └── useVoiceAgent.ts                 # Hook complet
```

### Fichiers a Modifier

```
src/
├── hooks/
│   └── useInventory.ts                  # Ajouter consume(), finish()
├── services/
│   └── nutrition/
│       └── openFoodFactsService.ts      # Ameliorer fuzzy matching
├── components/
│   └── inventory/
│       ├── FloatingActionButton.tsx     # Ajouter option "Scan Ticket"
│       └── VoiceInputDialog.tsx         # Supporter nouveaux patterns
└── pages/
    └── Inventory.tsx                    # Integrer Mode Cuisine
```

---

## SPECIFICATIONS DETAILLEES

### Spec 1 : GPT Vision Service

```typescript
// apps/api/src/services/receipt/gptVisionService.ts

interface ReceiptScanResult {
  success: boolean;
  data?: {
    store: string;
    date: string;
    products: Array<{
      raw_name: string;           // "DANONE NAT 4X"
      normalized_name: string;    // "Danone Nature Yaourt 4x125g"
      quantity: number;
      unit_price?: number;
      total_price: number;
      confidence: number;
    }>;
    total: number;
  };
  error?: { code: string; message: string };
  metadata: {
    processing_time_ms: number;
    gpt_model: string;
    gpt_cost_usd: number;
  };
}

const RECEIPT_SCAN_PROMPT = `Tu es un expert en analyse de tickets de caisse francais.

TACHE: Extraire tous les produits alimentaires de ce ticket.

REGLES:
1. Ignorer les lignes non-alimentaires (sacs, cartes fidelite)
2. Normaliser les abbreviations (NAT = Nature, BEUR = Beurre)
3. Extraire quantite et prix unitaire si visibles
4. Retourner un JSON structure

FORMAT REPONSE:
{
  "store": "Nom magasin",
  "date": "YYYY-MM-DD",
  "products": [
    {
      "raw_name": "Texte original du ticket",
      "normalized_name": "Nom complet normalise",
      "quantity": 1,
      "unit_price": 2.50,
      "total_price": 2.50,
      "confidence": 0.95
    }
  ],
  "total": 45.67
}`;
```

### Spec 2 : Dictionnaire Abbreviations FR

```typescript
// src/services/receipt/abbreviationDictionary.ts

export const FRENCH_RECEIPT_ABBREVIATIONS: Record<string, string[]> = {
  // PRODUITS LAITIERS
  'BEUR': ['Beurre'],
  'BEUR DOUX': ['Beurre doux'],
  'BEUR 1/2 SEL': ['Beurre demi-sel'],
  'LAI': ['Lait'],
  'LAI 1/2 EC': ['Lait demi-ecreme'],
  'LAI ENT': ['Lait entier'],
  'YAOU': ['Yaourt'],
  'YAOU NAT': ['Yaourt nature'],
  'FROM BL': ['Fromage blanc'],
  'CREM FR': ['Creme fraiche'],

  // FRUITS & LEGUMES
  'TOM': ['Tomate', 'Tomates'],
  'TOM GRAPPE': ['Tomates grappe'],
  'POM': ['Pomme', 'Pommes'],
  'PDT': ['Pommes de terre'],
  'BAN': ['Banane', 'Bananes'],
  'ORANG': ['Orange', 'Oranges'],
  'SAL': ['Salade'],

  // VIANDES
  'POUL': ['Poulet'],
  'ESC POUL': ['Escalope de poulet'],
  'STEAK HACH': ['Steak hache'],
  'JAMB': ['Jambon'],
  'SAUCIS': ['Saucisse', 'Saucisses'],
  'LARD': ['Lardons'],

  // EPICERIE
  'PAT': ['Pates'],
  'PAT SPAG': ['Spaghetti'],
  'RIZ': ['Riz'],
  'RIZ BASM': ['Riz basmati'],
  'FAR': ['Farine'],
  'SUC': ['Sucre'],
  'HUIL': ['Huile'],
  'HUIL OLIV': ['Huile d\'olive'],

  // BOISSONS
  'EAU': ['Eau'],
  'EAU MIN': ['Eau minerale'],
  'EAU GAZ': ['Eau gazeuse'],
  'JUS ORAN': ['Jus d\'orange'],
  'COCA': ['Coca-Cola'],
  'COCA ZERO': ['Coca-Cola Zero'],

  // MARQUES DISTRIBUTEUR
  'MDD': ['Marque distributeur'],
  'ECO+': ['Marque Repere (Leclerc)'],
  'CARF': ['Carrefour'],
  'CASIN': ['Casino'],
  'AUCHAN': ['Auchan'],
};
```

### Spec 3 : Voice Agent Intents Consommation

```typescript
// src/services/voice/voiceAgent/intents.ts

export const CONSUMPTION_PATTERNS = {
  // Consommation partielle
  consume: [
    /(?:j'ai utilisé|j'ai pris|j'ai consommé|utilise|consomme)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|unités?)?\s*(?:de\s+)?(.+)/gi,
    /(?:prends?|utilise)\s+(\d+)\s+(.+)/gi,
  ],

  // Consommation totale
  finish: [
    /(?:fini|terminé|plus de|y'a plus de|il n'y a plus de)\s+(?:le|la|les|du|de la|des)?\s*(.+)/gi,
    /(?:j'ai fini|on a fini)\s+(?:le|la|les)?\s*(.+)/gi,
  ],

  // Dernier element
  lastOne: [
    /(?:c'est le dernier|c'est la dernière|dernier|dernière)\s+(.+)/gi,
  ],

  // Verification stock
  checkStock: [
    /(?:il (?:me )?reste combien de|combien (?:il )?reste de)\s+(.+)/gi,
    /(?:on a encore du|on a du)\s+(.+)\s*\?/gi,
  ],

  // Expiration
  checkExpiry: [
    /(?:qu'est-ce qui expire|quoi expire|c'est quoi qui périme)/gi,
    /(?:expire bientôt|va périmer)/gi,
  ],
};

export const QUANTITY_NORMALIZERS = {
  'un peu': 50,      // grammes par defaut
  'beaucoup': 200,
  'une cuillere': 15,
  'une louche': 100,
  'un verre': 200,
  'la moitie': 0.5,  // multiplicateur
  'un quart': 0.25,
};
```

### Spec 4 : UI Scan Ticket

```
WIREFRAME : SCAN TICKET FLOW
============================

ECRAN 1 : CAPTURE
+------------------------------------------+
|  [X]        SCANNER MON TICKET           |
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |      [ZONE CAMERA]                 |  |
|  |                                    |  |
|  |   Photographiez votre ticket       |  |
|  |   de caisse                        |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  CONSEILS :                              |
|  - Bonne lumiere                         |
|  - Ticket a plat                         |
|  - Texte lisible                         |
|                                          |
|  [PRENDRE PHOTO]     [IMPORTER]          |
|                                          |
+------------------------------------------+

ECRAN 2 : ANALYSE (loading)
+------------------------------------------+
|  [<]        ANALYSE EN COURS...          |
+------------------------------------------+
|                                          |
|  +------------------------------------+  |
|  |                                    |  |
|  |      [APERCU TICKET]               |  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|           [SPINNER ANIME]                |
|                                          |
|  Reconnaissance des produits...          |
|                                          |
|  [==========----------] 65%              |
|                                          |
+------------------------------------------+

ECRAN 3 : VALIDATION
+------------------------------------------+
|  [<]        VERIFICATION                 |
+------------------------------------------+
|                                          |
|  Carrefour Market - 28/12/2025           |
|                                          |
|  PRODUITS DETECTES (12) :                |
|  +------------------------------------+  |
|  | [v] Lait 1/2 ecreme 1L      x2     |  |
|  | [v] Oeufs x12               x1     |  |
|  | [?] CRME FRCH 30CL   [Corriger]    |  | <- Tap pour corriger
|  | [v] Pommes Pink Lady        1kg    |  |
|  | [-] Sac plastique    (ignore)      |  | <- Barre = ignore
|  +------------------------------------+  |
|                                          |
|  [CORRIGER TOUS]                         |
|                                          |
|  +------------------------------------+  |
|  |   AJOUTER 11 PRODUITS              |  |
|  |   a l'inventaire                   |  |
|  +------------------------------------+  |
+------------------------------------------+

ECRAN 4 : CONFIRMATION
+------------------------------------------+
|                                          |
|           [CHECKMARK ANIME]              |
|                                          |
|     11 produits ajoutes !                |
|                                          |
|  +------------------------------------+  |
|  | Frigo (7)                          |  |
|  | Placard (3)                        |  |
|  | Congelateur (1)                    |  |
|  +------------------------------------+  |
|                                          |
|  [VOIR INVENTAIRE]    [NOUVEAU SCAN]     |
|                                          |
+------------------------------------------+
```

### Spec 5 : UI Mode Cuisine (Voice)

```
WIREFRAME : MODE CUISINE
========================

ACTIVATION (depuis Inventory)
+------------------------------------------+
|  INVENTAIRE           [MIC] [MODE CUISINE]|
+------------------------------------------+
                            ^ Tap pour activer

MODE CUISINE ACTIF
+------------------------------------------+
|  [X]        MODE CUISINE                 |
+------------------------------------------+
|                                          |
|  Parlez naturellement !                  |
|                                          |
|  Exemples :                              |
|  - "J'ai pris 2 oeufs"                   |
|  - "Plus de lait"                        |
|  - "Il reste combien de farine ?"        |
|                                          |
|  HISTORIQUE SESSION :                    |
|  +------------------------------------+  |
|  | 14:32 - Oeufs: 12 → 10 (-2)        |  |
|  | 14:35 - Lait: 1L → 0L (fini)       |  |
|  | 14:40 - Tomates: 4 → 3 (-1)        |  |
|  +------------------------------------+  |
|                                          |
|                                          |
|  +------------------------------------+  |
|  |     ((( [GRAND BOUTON MIC] )))     |  |
|  |          Appuyez pour parler        |  |
|  +------------------------------------+  |
+------------------------------------------+

PENDANT ECOUTE
+------------------------------------------+
|                                          |
|           ((( [MIC PULSE] )))            |
|                                          |
|        "J'ai utilise deux oeufs"         |
|         ^ Transcript temps reel          |
|                                          |
+------------------------------------------+

CONFIRMATION (3 secondes puis auto-valide)
+------------------------------------------+
|                                          |
|           [CHECKMARK VERT]               |
|                                          |
|   COMPRIS !                              |
|                                          |
|   Oeufs : -2                             |
|   Reste : 10                             |
|                                          |
|   [ANNULER]     [====] 2s [OK]           |
|                 ^ Barre de progression   |
+------------------------------------------+
```

---

## METRIQUES DE SUCCES

### KPIs Phase A (Scan Ticket)

| Metrique | Objectif | Mesure |
|----------|----------|--------|
| Precision OCR | > 90% | % produits corrects |
| Matching OFF | > 80% | % produits enrichis |
| Temps scan | < 8 sec | Latence moyenne |
| Adoption | 50% users | % users qui scannent |
| Retention | +30% | vs ajout manuel |

### KPIs Phase B (Voice Agent)

| Metrique | Objectif | Mesure |
|----------|----------|--------|
| Comprehension | > 85% | % intents corrects |
| Latence | < 2 sec | Temps reponse |
| Adoption | 30% users | % users mode cuisine |
| Actions/session | > 5 | Moyenne par session |

### KPIs Globaux

| Metrique | Objectif | Impact Business |
|----------|----------|-----------------|
| Taps/produit | < 2 | vs 9-11 actuellement |
| Inventaire a jour | > 80% | vs ~30% apps concurrentes |
| NPS | > 50 | Satisfaction utilisateur |
| Gaspillage | -40% | Impact reel mesurable |

---

## BUDGET ESTIMATIF

### Couts API (1000 users, 5 scans/mois)

| Service | Cout/Mois | Details |
|---------|-----------|---------|
| GPT-4o-mini Vision | ~$25 | 5000 scans x $0.005 |
| OpenFoodFacts | $0 | Open source |
| Supabase Storage | ~$5 | Images temporaires |
| **TOTAL** | **~$30/mois** | Scalable lineairement |

### Effort Developpement

| Phase | Duree | Priorite |
|-------|-------|----------|
| Phase A (Scan Ticket) | 3 semaines | P0 |
| Phase B (Voice Agent) | 2 semaines | P0 |
| Phase C (Quick Wins) | 1 semaine | P1 |
| **TOTAL** | **6 semaines** | - |

---

## CONCLUSION

### Ce qu'on construit

**Smart Pantry Pro devient la PREMIERE app ou :**
1. Tu scannes ton ticket → inventaire a jour en 1 tap
2. Tu parles → inventaire mis a jour sans les mains
3. Zero friction, zero effort

### Pourquoi ca va marcher

1. **Technologie mature** : GPT Vision + Web Speech API = cout negligeable
2. **Lecons des echecs** : Yummly, CozZo, Fridgely ont tous echoue sur la friction
3. **Blue ocean** : Personne ne fait ca bien actuellement
4. **Marche francophone** : Opportunite de dominer

### Prochaine etape

**Commencer par Phase A : Scan Ticket**
- Impact maximal sur l'adoption
- Differenciateur clair vs concurrence
- Fondation pour voice agent

---

*Plan genere par l'armee d'agents IA : Market Analyst, OCR Expert, UX Designer, Voice AI Architect, OFF Integration Specialist*
