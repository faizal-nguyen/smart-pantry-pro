# Voice Agent Architecture - Smart Pantry Pro

## Executive Summary

Ce document presente l'architecture complete du Voice Agent pour Smart Pantry Pro, concu pour permettre une interaction naturelle en francais avec l'inventaire via la voix.

---

## 1. ANALYSE DE L'EXISTANT

### 1.1 Composants Actuels

```
src/
├── components/inventory/
│   ├── VoiceInputButton.tsx      # Bouton flottant d'activation
│   └── VoiceInputDialog.tsx      # Dialog de saisie vocale
├── hooks/
│   ├── useSpeechRecognition.ts   # Hook Web Speech API
│   └── useInventory.ts           # CRUD inventaire avec optimistic updates
├── services/voice/
│   ├── frenchVoiceRecognition.ts # Service STT optimise francais
│   ├── enhancedVoiceService.ts   # Parser + recognition combines
│   └── voiceOutputService.ts     # Service TTS avec templates contextuels
└── utils/
    └── voiceParser.ts            # Parser regex basique
```

### 1.2 Limitations Identifiees

| Limitation | Impact | Priorite |
|------------|--------|----------|
| Pas de gestion de consommation vocale | Scenario cuisine impossible | CRITIQUE |
| Pas de requetes (expiration, stock) | Fonctionnalite manquante | HAUTE |
| Disambiguation manuelle uniquement | UX degradee | MOYENNE |
| Pas de correction vocale | Friction utilisateur | MOYENNE |
| Web Speech API uniquement | Precision limitee bruit | BASSE |

---

## 2. ARCHITECTURE CIBLE

### 2.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VOICE AGENT LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────────┐  │
│  │   HOTWORD   │   │     STT      │   │      NLU ENGINE         │  │
│  │  DETECTOR   │──▶│   SERVICE    │──▶│  (Intent + Entities)    │  │
│  │ "Hey Pantry"│   │ Web/Whisper  │   │                         │  │
│  └─────────────┘   └──────────────┘   └───────────┬─────────────┘  │
│                                                   │                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  DIALOG MANAGER                              │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │   │
│  │  │   CONTEXT   │  │  SLOT FILLER │  │   CONFIRMATION    │   │   │
│  │  │   TRACKER   │  │  (Entities)  │  │     HANDLER       │   │   │
│  │  └─────────────┘  └──────────────┘  └───────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                   │                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  ACTION EXECUTOR                             │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │   │
│  │  │  INVENTORY  │  │   QUERIES    │  │    SHOPPING       │   │   │
│  │  │  MUTATIONS  │  │  (Search)    │  │    LIST           │   │   │
│  │  └─────────────┘  └──────────────┘  └───────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                   │                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  RESPONSE GENERATOR                          │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │   │
│  │  │  TEMPLATE   │  │     TTS      │  │     VISUAL        │   │   │
│  │  │   ENGINE    │  │   OUTPUT     │  │    FEEDBACK       │   │   │
│  │  └─────────────┘  └──────────────┘  └───────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Flow Conversationnel Principal

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│    USER: "J'ai utilise 3 oeufs et 200g de farine"                     │
│                           │                                            │
│                           ▼                                            │
│    ┌──────────────────────────────────────────┐                       │
│    │           STT PROCESSING                  │                       │
│    │  transcript: "j'ai utilise 3 oeufs..."   │                       │
│    │  confidence: 0.92                         │                       │
│    └──────────────────────────────────────────┘                       │
│                           │                                            │
│                           ▼                                            │
│    ┌──────────────────────────────────────────┐                       │
│    │           INTENT RECOGNITION              │                       │
│    │  intent: CONSUME_ITEMS                    │                       │
│    │  confidence: 0.95                         │                       │
│    └──────────────────────────────────────────┘                       │
│                           │                                            │
│                           ▼                                            │
│    ┌──────────────────────────────────────────┐                       │
│    │           ENTITY EXTRACTION               │                       │
│    │  entities: [                              │                       │
│    │    { product: "oeufs", qty: 3, unit: "" }│                       │
│    │    { product: "farine", qty: 200, unit: "g" }                    │
│    │  ]                                        │                       │
│    └──────────────────────────────────────────┘                       │
│                           │                                            │
│                           ▼                                            │
│    ┌──────────────────────────────────────────┐                       │
│    │           INVENTORY LOOKUP                │                       │
│    │  Match "oeufs" -> Oeufs (12 en stock)    │                       │
│    │  Match "farine" -> Farine T55 (1kg)      │                       │
│    │  Ambiguity: None                          │                       │
│    └──────────────────────────────────────────┘                       │
│                           │                                            │
│                           ▼                                            │
│    ┌──────────────────────────────────────────┐                       │
│    │           ACTION EXECUTION                │                       │
│    │  consumeItem("oeufs", 3)                 │                       │
│    │  consumeItem("farine", 200, "g")         │                       │
│    └──────────────────────────────────────────┘                       │
│                           │                                            │
│                           ▼                                            │
│    ┌──────────────────────────────────────────┐                       │
│    │           CONFIRMATION                    │                       │
│    │  TTS: "C'est note. Il vous reste 9 oeufs │                       │
│    │        et 800g de farine."               │                       │
│    │  Visual: Toast + inventory update        │                       │
│    └──────────────────────────────────────────┘                       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. INTENT RECOGNITION SYSTEM

### 3.1 Catalogue des Intents

```typescript
export enum VoiceIntent {
  // === MUTATIONS ===
  ADD_ITEM = 'add_item',           // "Ajoute 2 packs de yaourts"
  CONSUME_ITEM = 'consume_item',   // "J'ai utilise 3 oeufs"
  REMOVE_ITEM = 'remove_item',     // "J'ai fini le lait"
  UPDATE_QUANTITY = 'update_qty',  // "Il reste 5 pommes"

  // === QUERIES ===
  CHECK_STOCK = 'check_stock',     // "Il me reste combien de riz?"
  CHECK_EXPIRY = 'check_expiry',   // "Qu'est-ce qui expire bientot?"
  SEARCH_ITEM = 'search_item',     // "Est-ce que j'ai du parmesan?"
  LIST_CATEGORY = 'list_category', // "Qu'est-ce que j'ai en legumes?"

  // === SHOPPING LIST ===
  ADD_TO_SHOPPING = 'add_shopping',    // "Ajoute du lait a la liste"
  CHECK_SHOPPING = 'check_shopping',   // "Qu'est-ce qu'il faut acheter?"

  // === CONVERSATION ===
  CONFIRM = 'confirm',             // "Oui" / "C'est bon"
  DENY = 'deny',                   // "Non" / "Annule"
  CORRECT = 'correct',             // "Non pas 3, j'ai dit 2"
  HELP = 'help',                   // "Aide" / "Que peux-tu faire?"
  CANCEL = 'cancel',               // "Annuler" / "Stop"

  // === FALLBACK ===
  UNKNOWN = 'unknown'
}
```

### 3.2 Patterns de Detection (Francais Parle)

```typescript
export const INTENT_PATTERNS: Record<VoiceIntent, RegExp[]> = {
  [VoiceIntent.CONSUME_ITEM]: [
    // Formes standards
    /j'ai\s+(?:utilis[eé]|pris|consomm[eé])\s+(.+)/i,
    /(?:on\s+a|j'ai)\s+(?:mang[eé]|bu|utilis[eé])\s+(.+)/i,

    // Formes negatives (= consommation complete)
    /(?:il\s+(?:n')?y\s+a\s+plus|plus)\s+(?:de\s+)?(.+)/i,
    /j'ai\s+fini\s+(?:le|la|les|l')?\s*(.+)/i,
    /(?:il\s+)?(?:reste|manque)\s+plus\s+(?:de\s+)?(.+)/i,

    // Formes courtes cuisine
    /(\d+)\s*(.+)\s+(?:utilis[eé]s?|pris|consomm[eé]s?)/i,
  ],

  [VoiceIntent.ADD_ITEM]: [
    /(?:ajoute|rajoute|met|mets|range|ai\s+achet[eé])\s+(.+)/i,
    /j'ai\s+(?:achet[eé]|ramen[eé]|rapport[eé])\s+(.+)/i,
    /(?:nouveau|nouvelle)\s+(.+)\s+(?:dans|au)\s+(?:frigo|placard)/i,
  ],

  [VoiceIntent.CHECK_STOCK]: [
    /(?:il\s+(?:me\s+)?reste|j'ai)\s+combien\s+(?:de\s+)?(.+)/i,
    /combien\s+(?:de|d')\s*(.+)\s+(?:il\s+)?(?:me\s+)?reste/i,
    /(?:quelle|quel)\s+(?:quantit[eé]|stock)\s+(?:de\s+)?(.+)/i,
    /(?:est-ce\s+que\s+)?j'ai\s+(?:encore\s+)?(?:du|de la|des)\s+(.+)/i,
  ],

  [VoiceIntent.CHECK_EXPIRY]: [
    /qu(?:'est-ce\s+qui|i)\s+(?:expire|p[eé]rime)\s+(?:bient[oô]t)?/i,
    /(?:produits?|aliments?)\s+(?:qui\s+)?(?:expire|p[eé]rime)/i,
    /(?:dates?\s+(?:de\s+)?)?p[eé]remption/i,
    /(?:qu'est-ce\s+qu'il\s+faut|que\s+dois-je)\s+(?:utiliser|manger)\s+(?:en\s+premier|vite)/i,
  ],

  [VoiceIntent.CONFIRM]: [
    /^(?:oui|ouais|ok|okay|d'accord|c'est\s+(?:bon|ca|correct)|parfait|exact|valide|confirme)$/i,
  ],

  [VoiceIntent.DENY]: [
    /^(?:non|nan|pas\s+(?:ca|du\s+tout)|annule|stop)$/i,
  ],

  [VoiceIntent.CORRECT]: [
    /(?:non\s+)?(?:pas|c'est\s+pas)\s+(\d+).+(?:j'ai\s+dit|c'(?:est|etait))\s+(\d+)/i,
    /(?:correction|corrige).+(\d+)\s+(?:pas|au\s+lieu\s+de)\s+(\d+)/i,
    /(?:en\s+fait|pardon|excuse).+(\d+)/i,
  ],
};
```

### 3.3 Gestion du Francais Parle

```typescript
export const FRENCH_NORMALIZATION_RULES = {
  // Contractions courantes
  contractions: {
    "j'ai": "j'ai",
    "j ai": "j'ai",
    "jai": "j'ai",
    "c'est": "c'est",
    "c est": "c'est",
    "qu'est": "qu'est",
    "qu est": "qu'est",
    "d'": "de ",
    "l'": "le ",
  },

  // Elisitions orales
  elisions: {
    "ya": "il y a",
    "y'a": "il y a",
    "chais": "je sais",
    "chui": "je suis",
    "j'suis": "je suis",
    "t'as": "tu as",
  },

  // Nombres oraux vers chiffres
  numbers: {
    "zero": "0", "un": "1", "une": "1", "deux": "2",
    "trois": "3", "quatre": "4", "cinq": "5",
    "six": "6", "sept": "7", "huit": "8",
    "neuf": "9", "dix": "10", "onze": "11",
    "douze": "12", "quinze": "15", "vingt": "20",
    "trente": "30", "cinquante": "50", "cent": "100",
    "demi": "0.5", "quart": "0.25",
  },

  // Unites orales
  units: {
    "kilo": "kg", "kilos": "kg",
    "gramme": "g", "grammes": "g",
    "litre": "L", "litres": "L",
    "demi-litre": "500ml",
    "pack": "pack", "packs": "packs",
    "douzaine": "12", "douzaines": "12",
  },

  // Homophones alimentaires courants
  homophones: {
    "du riz": "du riz",
    "durit": "du riz",
    "des oeufs": "des oeufs",
    "des oeu": "des oeufs",
    "dezeu": "des oeufs",
  },
};
```

---

## 4. ENTITY EXTRACTION

### 4.1 Types d'Entites

```typescript
export interface VoiceEntity {
  type: EntityType;
  value: string | number;
  rawValue: string;      // Valeur originale dans le transcript
  confidence: number;
  startIndex: number;    // Position dans le transcript
  endIndex: number;
}

export enum EntityType {
  PRODUCT = 'product',       // Nom du produit
  QUANTITY = 'quantity',     // Nombre
  UNIT = 'unit',            // kg, L, pieces, etc.
  BRAND = 'brand',          // Marque (optionnel)
  VARIANT = 'variant',      // demi-ecreme, bio, etc.
  LOCATION = 'location',    // frigo, placard, congelateur
  EXPIRY_DATE = 'expiry',   // Date de peremption
  TIME_REFERENCE = 'time',  // "bientot", "cette semaine"
}
```

### 4.2 Pipeline d'Extraction

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTITY EXTRACTION PIPELINE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT: "J'ai achete 2 packs de yaourts grecs bio"              │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────┐                  │
│  │  1. TOKENIZATION + NORMALIZATION          │                  │
│  │  ["j'ai", "achete", "2", "packs", "de",   │                  │
│  │   "yaourts", "grecs", "bio"]              │                  │
│  └───────────────────────────────────────────┘                  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────┐                  │
│  │  2. QUANTITY DETECTION                    │                  │
│  │  "2" -> { type: QUANTITY, value: 2 }      │                  │
│  └───────────────────────────────────────────┘                  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────┐                  │
│  │  3. UNIT DETECTION                        │                  │
│  │  "packs" -> { type: UNIT, value: "pack" } │                  │
│  └───────────────────────────────────────────┘                  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────┐                  │
│  │  4. PRODUCT DETECTION                     │                  │
│  │  "yaourts grecs" -> { type: PRODUCT }     │                  │
│  └───────────────────────────────────────────┘                  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────┐                  │
│  │  5. ATTRIBUTE DETECTION                   │                  │
│  │  "bio" -> { type: VARIANT }               │                  │
│  └───────────────────────────────────────────┘                  │
│                           │                                      │
│                           ▼                                      │
│  OUTPUT: {                                                       │
│    quantity: 2,                                                  │
│    unit: "pack",                                                 │
│    product: "yaourts grecs",                                    │
│    variant: "bio"                                                │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. DISAMBIGUATION ENGINE

### 5.1 Strategies de Disambiguation

```typescript
export interface DisambiguationStrategy {
  type: 'exact_match' | 'fuzzy_match' | 'ask_user' | 'use_default' | 'smart_infer';
  threshold: number;  // Seuil de confiance minimum
}

export const DISAMBIGUATION_CONFIG = {
  // Si un seul match avec confiance > 0.9 -> utiliser directement
  exactMatch: {
    strategy: 'exact_match',
    threshold: 0.9,
  },

  // Si plusieurs matchs proches -> demander
  multipleMatches: {
    strategy: 'ask_user',
    maxOptions: 3,
  },

  // Si pas de match mais produit connu -> creer
  noMatch: {
    strategy: 'smart_infer',
    defaultCategory: 'Autres',
    defaultUnit: 'unite',
  },
};
```

### 5.2 Flow de Disambiguation

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  USER: "Ajoute du lait"                                           │
│                           │                                        │
│                           ▼                                        │
│  ┌────────────────────────────────────────┐                       │
│  │     INVENTORY LOOKUP                    │                       │
│  │     Query: "lait"                       │                       │
│  └────────────────────────────────────────┘                       │
│                           │                                        │
│           ┌───────────────┼───────────────┐                        │
│           ▼               ▼               ▼                        │
│    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│    │ Lait entier │ │Lait 1/2 ec. │ │ Lait d'amande│               │
│    │ Score: 0.95 │ │ Score: 0.95 │ │ Score: 0.80  │               │
│    └─────────────┘ └─────────────┘ └─────────────┘                │
│                           │                                        │
│                           ▼                                        │
│  ┌────────────────────────────────────────┐                       │
│  │     DISAMBIGUATION DECISION             │                       │
│  │     Multiple matches > 0.9 threshold   │                       │
│  │     -> ASK_USER strategy               │                       │
│  └────────────────────────────────────────┘                       │
│                           │                                        │
│                           ▼                                        │
│  ┌────────────────────────────────────────┐                       │
│  │     VOICE PROMPT                        │                       │
│  │     "Quel type de lait? J'ai trouve:"  │                       │
│  │     "1 - Lait entier"                  │                       │
│  │     "2 - Lait demi-ecreme"             │                       │
│  │     "Dites le numero ou le nom."       │                       │
│  └────────────────────────────────────────┘                       │
│                           │                                        │
│                           ▼                                        │
│  USER: "Le demi"                                                   │
│                           │                                        │
│                           ▼                                        │
│  ┌────────────────────────────────────────┐                       │
│  │     CONTEXT MATCH                       │                       │
│  │     "demi" + context -> Lait 1/2 ec.   │                       │
│  │     Confidence: 0.98                    │                       │
│  └────────────────────────────────────────┘                       │
│                           │                                        │
│                           ▼                                        │
│  ┌────────────────────────────────────────┐                       │
│  │     ACTION EXECUTED                     │                       │
│  │     addToInventory("Lait demi-ecreme") │                       │
│  └────────────────────────────────────────┘                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 5.3 Smart Inference pour Nouveaux Produits

```typescript
export const PRODUCT_INFERENCE_RULES = {
  // Categories par mots-cles
  categoryInference: {
    fruits: ['pomme', 'banane', 'orange', 'citron', 'fraise', 'raisin', 'poire'],
    legumes: ['carotte', 'tomate', 'oignon', 'ail', 'poireau', 'courgette'],
    laitiers: ['lait', 'yaourt', 'fromage', 'beurre', 'creme'],
    viandes: ['poulet', 'boeuf', 'porc', 'agneau', 'dinde', 'jambon'],
    poissons: ['saumon', 'thon', 'cabillaud', 'crevette', 'moule'],
    epicerie: ['pates', 'riz', 'farine', 'sucre', 'sel', 'huile'],
    surgeles: ['glace', 'pizza surgelee', 'legumes surgeles'],
    boissons: ['eau', 'jus', 'soda', 'vin', 'biere'],
  },

  // Unites par defaut par categorie
  defaultUnits: {
    fruits: 'unite',
    legumes: 'unite',
    laitiers: 'L',
    viandes: 'kg',
    poissons: 'g',
    epicerie: 'unite',
    surgeles: 'unite',
    boissons: 'L',
  },

  // Duree de conservation typique (jours)
  typicalShelfLife: {
    fruits: 7,
    legumes: 10,
    laitiers: 14,
    viandes: 3,
    poissons: 2,
    epicerie: 365,
    surgeles: 180,
    boissons: 365,
  },
};
```

---

## 6. DIALOG MANAGER

### 6.1 Etats du Dialog

```typescript
export enum DialogState {
  IDLE = 'idle',                    // En attente
  LISTENING = 'listening',          // Ecoute active
  PROCESSING = 'processing',        // Traitement NLU
  AWAITING_CONFIRMATION = 'awaiting_confirmation',  // Attente confirmation
  AWAITING_DISAMBIGUATION = 'awaiting_disambiguation',  // Attente choix
  AWAITING_SLOT = 'awaiting_slot',  // Attente info manquante
  EXECUTING = 'executing',          // Execution action
  RESPONDING = 'responding',        // Generation reponse
  ERROR = 'error',                  // Erreur
}

export interface DialogContext {
  state: DialogState;
  currentIntent: VoiceIntent | null;
  entities: VoiceEntity[];
  pendingAction: PendingAction | null;
  conversationHistory: ConversationTurn[];
  disambiguationOptions: Product[] | null;
  missingSlots: string[];
  lastUpdateTime: number;
  errorCount: number;
}
```

### 6.2 State Machine

```
                              ┌──────────────────┐
                              │       IDLE       │
                              └────────┬─────────┘
                                       │ Hotword detected / Button pressed
                                       ▼
                              ┌──────────────────┐
                    ┌─────────│    LISTENING     │─────────┐
                    │         └────────┬─────────┘         │
                    │                  │ Speech end        │ Timeout / No speech
                    │                  ▼                   │
                    │         ┌──────────────────┐         │
                    │         │   PROCESSING     │         │
                    │         └────────┬─────────┘         │
                    │                  │                   │
          ┌─────────┴──────────┬───────┴───────┬──────────┴─────────┐
          │                    │               │                    │
          ▼                    ▼               ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌─────────┐
│    AWAITING_     │ │    AWAITING_     │ │    EXECUTING     │ │  ERROR  │
│ DISAMBIGUATION   │ │      SLOT        │ │                  │ │         │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘ └────┬────┘
         │                    │                    │                │
         │ User choice        │ Slot filled        │ Success        │
         ▼                    ▼                    ▼                ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │
│    AWAITING_     │ │    AWAITING_     │ │   RESPONDING     │     │
│  CONFIRMATION    │ │  CONFIRMATION    │ │                  │     │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘     │
         │                    │                    │                │
         │ Confirm/Deny       │ Confirm/Deny       │ Response done  │
         └────────────────────┴────────────────────┴────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │       IDLE       │
                              └──────────────────┘
```

### 6.3 Gestion des Corrections

```typescript
export interface CorrectionHandler {
  // Detecte une correction dans le transcript
  detectCorrection(transcript: string): CorrectionInfo | null;

  // Applique la correction au contexte
  applyCorrection(context: DialogContext, correction: CorrectionInfo): DialogContext;
}

export interface CorrectionInfo {
  type: 'quantity' | 'product' | 'action';
  originalValue: any;
  correctedValue: any;
  confidence: number;
}

// Exemple de detection
const CORRECTION_PATTERNS = [
  // "Non pas 3, j'ai dit 2"
  {
    pattern: /non\s+pas\s+(\d+).+j'ai\s+dit\s+(\d+)/i,
    extract: (match: RegExpMatchArray) => ({
      type: 'quantity' as const,
      originalValue: parseInt(match[1]),
      correctedValue: parseInt(match[2]),
      confidence: 0.95,
    }),
  },
  // "Pas des oeufs, du lait"
  {
    pattern: /pas\s+(?:du|de la|des|le|la|les)\s+(.+),\s*(?:du|de la|des|le|la|les)\s+(.+)/i,
    extract: (match: RegExpMatchArray) => ({
      type: 'product' as const,
      originalValue: match[1].trim(),
      correctedValue: match[2].trim(),
      confidence: 0.9,
    }),
  },
];
```

---

## 7. CONFIRMATION UX

### 7.1 Strategies de Confirmation

```typescript
export enum ConfirmationStrategy {
  // Toujours confirmer vocalement
  ALWAYS_VOICE = 'always_voice',

  // Confirmer seulement les actions critiques
  CRITICAL_ONLY = 'critical_only',

  // Confirmation visuelle avec undo
  VISUAL_WITH_UNDO = 'visual_with_undo',

  // Pas de confirmation (mode expert)
  NONE = 'none',

  // Adaptatif selon le contexte
  ADAPTIVE = 'adaptive',
}

export const CONFIRMATION_RULES = {
  // Actions necessitant confirmation vocale
  requireVoiceConfirmation: [
    'delete_all',
    'clear_list',
    'consume_expensive',  // Produits > 10EUR
  ],

  // Actions avec confirmation visuelle + undo
  visualWithUndo: [
    'consume_item',
    'add_item',
    'update_quantity',
  ],

  // Actions sans confirmation
  noConfirmation: [
    'search_item',
    'check_stock',
    'check_expiry',
    'list_category',
  ],

  // Seuils adaptatifs
  adaptiveThresholds: {
    lowConfidence: 0.7,   // Confirmer si confiance < 0.7
    highQuantity: 10,     // Confirmer si quantite > 10
    expensiveThreshold: 10, // EUR
  },
};
```

### 7.2 Templates de Confirmation

```typescript
export const CONFIRMATION_TEMPLATES = {
  // Confirmation avec repetition
  repeat: {
    add: "J'ai compris : ajouter {quantity} {unit} de {product}. C'est bien ca ?",
    consume: "Vous avez utilise {quantity} {unit} de {product}. Je confirme ?",
    remove: "Je retire {product} de l'inventaire. Vous confirmez ?",
  },

  // Confirmation avec contexte enrichi
  enriched: {
    add: "J'ajoute {quantity} {unit} de {product}. Vous en aviez deja {currentStock}.",
    consume: "Apres avoir utilise {quantity} {product}, il vous en restera {remaining}.",
    lowStock: "Attention, apres ca il ne vous restera que {remaining} {product}. Voulez-vous l'ajouter a la liste de courses ?",
  },

  // Confirmation rapide (mode expert)
  quick: {
    add: "Ajoute.",
    consume: "Note.",
    remove: "Retire.",
  },
};
```

### 7.3 Feedback Multimodal

```typescript
export interface MultimodalFeedback {
  // Feedback vocal
  voice: {
    text: string;
    priority: 'high' | 'normal' | 'low';
    interruptible: boolean;
  };

  // Feedback visuel
  visual: {
    type: 'toast' | 'inline' | 'modal';
    variant: 'success' | 'warning' | 'error' | 'info';
    duration: number;  // ms
    action?: {
      label: string;
      callback: () => void;
    };
  };

  // Feedback haptique (mobile)
  haptic?: {
    type: 'success' | 'warning' | 'error';
    intensity: 'light' | 'medium' | 'heavy';
  };
}
```

---

## 8. STACK TECHNIQUE

### 8.1 Comparatif STT

| Solution | Latence | Precision FR | Bruit | Offline | Cout |
|----------|---------|--------------|-------|---------|------|
| Web Speech API | ~500ms | 85% | Faible | Non | Gratuit |
| Whisper (API) | ~2s | 95% | Excellent | Non | $0.006/min |
| Whisper (local) | ~1.5s | 95% | Excellent | Oui | GPU requis |
| Deepgram | ~200ms | 92% | Bon | Non | $0.0125/min |
| AssemblyAI | ~300ms | 90% | Bon | Non | $0.015/min |

### 8.2 Recommandation: Architecture Hybride

```typescript
export interface STTConfig {
  // Mode principal
  primaryProvider: 'web-speech' | 'whisper-api' | 'deepgram';

  // Fallback si echec
  fallbackProvider?: 'web-speech' | 'whisper-api';

  // Seuils de basculement
  thresholds: {
    confidenceMinimum: number;     // En dessous -> retry avec autre provider
    ambientNoiseLevel: number;     // dB seuil pour activer Whisper
    retryCount: number;
  };

  // Optimisations
  optimizations: {
    useVAD: boolean;              // Voice Activity Detection
    streamingMode: boolean;        // Transcription en temps reel
    noiseReduction: boolean;
  };
}

export const RECOMMENDED_CONFIG: STTConfig = {
  // Web Speech API pour latence et cout zero
  primaryProvider: 'web-speech',

  // Whisper API pour precision en cas de bruit
  fallbackProvider: 'whisper-api',

  thresholds: {
    confidenceMinimum: 0.75,
    ambientNoiseLevel: 60,  // dB
    retryCount: 2,
  },

  optimizations: {
    useVAD: true,
    streamingMode: true,
    noiseReduction: true,
  },
};
```

### 8.3 Architecture NLU

```typescript
export interface NLUConfig {
  // Classification d'intent
  intentClassification: {
    // Methode principale: regex patterns + heuristiques
    primary: 'rule-based',

    // Fallback LLM pour cas complexes
    fallback: 'gpt-4o-mini',

    // Seuil pour basculer vers LLM
    confidenceThreshold: 0.6,
  };

  // Extraction d'entites
  entityExtraction: {
    // Extracteurs par type
    extractors: {
      quantity: 'regex',
      unit: 'lookup-table',
      product: 'fuzzy-match',  // Contre inventaire existant
      variant: 'llm',          // Trop de variations
    };
  };

  // Cache pour optimiser latence
  cache: {
    enabled: true,
    ttl: 3600,  // 1 heure
    maxSize: 1000,
  };
}
```

### 8.4 Latence Cible

```
┌────────────────────────────────────────────────────────────────┐
│                    LATENCY BUDGET (Target: 2s)                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  STT Processing      ████████░░░░░░░░░░░░░░░░░░░░  500-800ms  │
│  NLU Processing      ████░░░░░░░░░░░░░░░░░░░░░░░░  100-200ms  │
│  Inventory Lookup    ██░░░░░░░░░░░░░░░░░░░░░░░░░░  50-100ms   │
│  Disambiguation      ██████░░░░░░░░░░░░░░░░░░░░░░  0-300ms    │
│  Action Execution    ████░░░░░░░░░░░░░░░░░░░░░░░░  100-200ms  │
│  TTS Response Start  ████░░░░░░░░░░░░░░░░░░░░░░░░  100-200ms  │
│                                                                │
│  TOTAL TARGET        ████████████████████░░░░░░░░  ~1.5-2s    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 9. EDGE CASES

### 9.1 Gestion du Bruit Ambiant

```typescript
export interface NoiseHandling {
  // Detection du niveau de bruit
  detectNoiseLevel(): Promise<number>;  // dB

  // Strategies selon niveau
  strategies: {
    low: {      // < 40dB (calme)
      provider: 'web-speech',
      sensitivity: 'normal',
    },
    medium: {   // 40-60dB (conversation)
      provider: 'web-speech',
      sensitivity: 'high',
      useNoiseReduction: true,
    },
    high: {     // > 60dB (cuisine active)
      provider: 'whisper',  // Plus robuste au bruit
      sensitivity: 'high',
      useNoiseReduction: true,
      requireConfirmation: true,
    },
  };
}

// Indicateur visuel de niveau de bruit
export const NOISE_INDICATORS = {
  low: { icon: 'volume-1', color: 'green', label: 'Environnement calme' },
  medium: { icon: 'volume-2', color: 'yellow', label: 'Un peu de bruit' },
  high: { icon: 'volume-x', color: 'red', label: 'Beaucoup de bruit' },
};
```

### 9.2 Multi-Locuteurs

```typescript
export interface MultiSpeakerHandling {
  // Pour V1: Ignorer cette problematique
  // Pour V2: Detection basique

  config: {
    // Desactiver temporairement si detection de voix multiples
    pauseOnMultipleSpeakers: true,

    // Reprendre apres silence de X secondes
    resumeAfterSilence: 2000,  // ms

    // Message utilisateur
    multiSpeakerMessage: "J'ai detecte plusieurs voix. Parlez un a la fois.",
  };
}
```

### 9.3 Timeout et Silences

```typescript
export const TIMEOUT_CONFIG = {
  // Timeout initial d'ecoute
  initialListening: 10000,  // 10s

  // Timeout apres debut de parole
  afterSpeechStart: 5000,   // 5s de silence = fin

  // Timeout pour disambiguation
  disambiguationChoice: 15000,  // 15s

  // Timeout pour confirmation
  confirmationWait: 8000,   // 8s

  // Messages de timeout
  messages: {
    noSpeech: "Je n'ai rien entendu. Voulez-vous reessayer ?",
    partialSpeech: "Je n'ai pas bien compris la fin. Pouvez-vous repeter ?",
    noChoice: "Vous n'avez pas fait de choix. L'operation est annulee.",
    noConfirmation: "Pas de reponse. J'annule par securite.",
  },
};
```

### 9.4 Mode Offline

```typescript
export interface OfflineCapabilities {
  // Fonctionnalites disponibles offline
  available: [
    'basic-stt',          // Web Speech API (si support navigateur)
    'rule-based-nlu',     // Patterns locaux
    'local-inventory',    // Cache IndexedDB
    'local-tts',          // Synthese vocale native
  ];

  // Fonctionnalites degradees
  degraded: [
    'whisper-fallback',   // Pas d'API
    'fuzzy-search',       // Qualite reduite
    'smart-inference',    // Pas de LLM
  ];

  // Synchronisation au retour online
  syncOnReconnect: {
    queueActions: true,
    maxQueueSize: 100,
    conflictResolution: 'server-wins',
  };
}
```

---

## 10. IMPLEMENTATION PLAN

### 10.1 Phase 1: Foundation (2 semaines)

```typescript
// Objectif: Intent recognition + Entity extraction basiques
const PHASE_1_DELIVERABLES = {
  // Core NLU
  intentClassifier: 'Rule-based avec patterns etendus',
  entityExtractor: 'Regex + lookup tables',

  // Integration inventaire
  inventoryActions: ['consume_item', 'add_item', 'check_stock'],

  // UI
  voiceDialog: 'Amelioration du dialog existant',
  feedback: 'Toast notifications + TTS basique',

  // Metrics
  successRate: '> 80%',
  latency: '< 3s',
};
```

### 10.2 Phase 2: Enhancement (2 semaines)

```typescript
const PHASE_2_DELIVERABLES = {
  // Disambiguation
  disambiguation: 'Full flow avec choix vocal',

  // Dialog management
  dialogState: 'State machine complete',
  corrections: 'Gestion des corrections vocales',

  // Queries
  newIntents: ['check_expiry', 'list_category', 'search_item'],

  // Feedback
  multimodal: 'Voice + Visual + Undo',

  // Metrics
  successRate: '> 90%',
  latency: '< 2.5s',
};
```

### 10.3 Phase 3: Production (2 semaines)

```typescript
const PHASE_3_DELIVERABLES = {
  // Robustesse
  whisperFallback: 'Integration API Whisper',
  noiseHandling: 'Detection et adaptation',

  // UX
  confirmationAdaptive: 'Selon contexte et confiance',
  continuousMode: 'Mode mains libres cuisine',

  // Performance
  caching: 'Cache intent + entities',
  optimisticUI: 'Feedback instantane',

  // Metrics
  successRate: '> 95%',
  latency: '< 2s',
};
```

---

## 11. FICHIERS A CREER/MODIFIER

### 11.1 Nouveaux Fichiers

```
src/
├── services/voice/
│   ├── voiceAgent/
│   │   ├── index.ts                 # Export principal
│   │   ├── types.ts                 # Types et interfaces
│   │   ├── intents.ts               # Catalogue intents
│   │   ├── intentClassifier.ts      # Classification
│   │   ├── entityExtractor.ts       # Extraction entites
│   │   ├── dialogManager.ts         # State machine
│   │   ├── disambiguationEngine.ts  # Gestion ambiguites
│   │   ├── actionExecutor.ts        # Execution actions
│   │   ├── responseGenerator.ts     # Generation reponses
│   │   └── corrections.ts           # Gestion corrections
│   ├── stt/
│   │   ├── sttProvider.ts           # Interface provider
│   │   ├── webSpeechProvider.ts     # Web Speech API
│   │   └── whisperProvider.ts       # Whisper API fallback
│   └── utils/
│       ├── frenchNormalizer.ts      # Normalisation francais
│       ├── noiseDetector.ts         # Detection bruit
│       └── audioProcessor.ts        # Processing audio
├── hooks/
│   └── useVoiceAgent.ts             # Hook principal
└── components/
    └── voice/
        ├── VoiceAgentProvider.tsx   # Context provider
        ├── VoiceCommandPanel.tsx    # Panel de commandes
        ├── VoiceDisambiguation.tsx  # UI disambiguation
        └── VoiceFeedback.tsx        # Feedback multimodal
```

### 11.2 Fichiers a Modifier

```
src/
├── components/inventory/
│   ├── VoiceInputDialog.tsx         # Integrer nouveau voiceAgent
│   └── VoiceInputButton.tsx         # Ajouter hotword support
├── hooks/
│   ├── useInventory.ts              # Ajouter actions voice-friendly
│   └── useSpeechRecognition.ts      # Deprecate en faveur du provider
└── services/voice/
    ├── enhancedVoiceService.ts      # Migrer vers nouveau systeme
    └── voiceOutputService.ts        # Etendre templates
```

---

## 12. METRIQUES DE SUCCES

```typescript
export const SUCCESS_METRICS = {
  // Precision
  intentAccuracy: {
    target: 0.95,
    measurement: 'Correct intent / Total attempts',
  },
  entityAccuracy: {
    target: 0.90,
    measurement: 'Correct entities / Total entities',
  },

  // Performance
  latencyP50: {
    target: 1500,  // ms
    measurement: 'Median time from speech end to action complete',
  },
  latencyP95: {
    target: 3000,  // ms
    measurement: '95th percentile latency',
  },

  // UX
  taskCompletionRate: {
    target: 0.90,
    measurement: 'Successful completions / Total attempts',
  },
  disambiguationRate: {
    target: 0.15,  // Plus bas = mieux
    measurement: 'Disambiguations required / Total attempts',
  },
  correctionRate: {
    target: 0.10,  // Plus bas = mieux
    measurement: 'Corrections needed / Total attempts',
  },

  // Adoption
  voiceUsageRate: {
    target: 0.30,
    measurement: 'Voice actions / Total inventory actions',
  },
};
```

---

## ANNEXE: Exemples de Conversations

### A.1 Scenario Cuisine Reussi

```
USER:     "J'ai utilise 3 oeufs et 200g de farine"
SYSTEM:   [STT] transcript="j'ai utilise 3 oeufs et 200 grammes de farine" (conf=0.94)
          [NLU] intent=CONSUME_ITEM (conf=0.96)
          [NLU] entities=[{product:"oeufs", qty:3}, {product:"farine", qty:200, unit:"g"}]
          [LOOKUP] oeufs -> match "Oeufs" (12 en stock)
          [LOOKUP] farine -> match "Farine T55" (1kg en stock)
          [ACTION] consumeItem("Oeufs", 3) -> success (reste 9)
          [ACTION] consumeItem("Farine T55", 200, "g") -> success (reste 800g)
VOICE:    "C'est note. Il vous reste 9 oeufs et 800 grammes de farine."
VISUAL:   [Toast: "Inventaire mis a jour"]
```

### A.2 Scenario avec Disambiguation

```
USER:     "Ajoute du lait"
SYSTEM:   [STT] transcript="ajoute du lait" (conf=0.98)
          [NLU] intent=ADD_ITEM (conf=0.95)
          [NLU] entities=[{product:"lait", qty:1, unit:"L"}]
          [LOOKUP] lait -> multiple matches:
            - "Lait entier" (score=0.95)
            - "Lait demi-ecreme" (score=0.95)
            - "Lait d'amande" (score=0.80)
          [DISAMBIG] ASK_USER (top 2 too close)
VOICE:    "Quel type de lait ? J'ai : 1, Lait entier. 2, Lait demi-ecreme."
USER:     "Le 2"
SYSTEM:   [STT] transcript="le 2" (conf=0.99)
          [CONTEXT] in disambiguation, "2" -> Lait demi-ecreme
          [ACTION] addToInventory("Lait demi-ecreme", 1, "L") -> success
VOICE:    "Parfait, 1 litre de lait demi-ecreme ajoute."
```

### A.3 Scenario avec Correction

```
USER:     "J'ai utilise 5 oeufs"
SYSTEM:   [STT] transcript="j'ai utilise 5 oeufs" (conf=0.91)
          [NLU] intent=CONSUME_ITEM
          [ACTION] consumeItem("Oeufs", 5) -> success
VOICE:    "Note, 5 oeufs utilises. Il vous en reste 4."
USER:     "Non pas 5, j'ai dit 3"
SYSTEM:   [STT] transcript="non pas 5 j'ai dit 3" (conf=0.95)
          [NLU] intent=CORRECT
          [CORRECTION] type=quantity, 5 -> 3
          [ACTION] undoLastAction() + consumeItem("Oeufs", 3)
VOICE:    "Pardon, j'ai corrige. 3 oeufs utilises, il vous en reste 6."
```

### A.4 Scenario Query

```
USER:     "Qu'est-ce qui expire bientot ?"
SYSTEM:   [STT] transcript="qu'est ce qui expire bientot" (conf=0.93)
          [NLU] intent=CHECK_EXPIRY
          [QUERY] getExpiringItems(7) -> [
            {name:"Yaourts", expiry:"2024-01-10", daysLeft:3},
            {name:"Jambon", expiry:"2024-01-08", daysLeft:1},
          ]
VOICE:    "Attention, 2 produits expirent bientot. Le jambon dans 1 jour,
           et les yaourts dans 3 jours."
VISUAL:   [Highlight items in list]
```

---

*Document genere pour Smart Pantry Pro - Voice AI Architecture*
*Version 1.0 - Decembre 2024*
