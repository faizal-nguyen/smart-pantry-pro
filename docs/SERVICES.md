# Documentation des Services - Smart Pantry Pro

## Vue d'ensemble

Cette documentation détaille tous les services métier, hooks personnalisés, et utilitaires de Smart Pantry Pro. Ces services encapsulent la logique métier et offrent des interfaces cohérentes pour les composants.

## 🏗️ Architecture des Services

```
src/
├── services/                 # Services métier
│   ├── ai/                   # Intelligence Artificielle
│   ├── recipe-seeding/       # Seeding de recettes
│   ├── socialMediaParser/    # Parser réseaux sociaux
│   ├── vision/               # Vision AI
│   └── voice/                # Reconnaissance vocale
├── hooks/                    # Hooks React personnalisés
├── lib/                      # Utilitaires et configuration
├── utils/                    # Fonctions utilitaires
└── integrations/             # Intégrations externes
```

## 🤖 Services d'Intelligence Artificielle

### `StreamingAIService`
Service de streaming pour l'assistant IA avec OpenAI.

**Localisation** : `src/services/ai/streamingAIService.ts`

**Fonctionnalités** :
- Chat streaming temps réel avec OpenAI
- Gestion des tokens et coûts
- Annulation des requêtes
- Cache intelligent des réponses
- Retry automatique avec backoff

**API** :
```typescript
class StreamingAIService {
  async streamChat(
    messages: ChatMessage[], 
    options: StreamOptions
  ): Promise<ReadableStream>;
  
  cancelStream(): void;
  getTokenUsage(): TokenUsage;
  estimateCost(messages: ChatMessage[]): number;
}

interface StreamOptions {
  model?: 'gpt-4' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
  userId?: string;
}
```

**Exemple d'utilisation** :
```typescript
const aiService = getStreamingAIService(apiKey);

const stream = await aiService.streamChat([
  { role: 'system', content: 'Tu es un assistant culinaire' },
  { role: 'user', content: 'Que faire avec des tomates ?' }
], {
  model: 'gpt-4',
  temperature: 0.7,
  userId: user.id
});

// Traitement du stream
const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Process chunk
}
```

## 👁️ Services de Vision AI

### `AdvancedVisionService`
Service de reconnaissance visuelle avancée avec multi-produits.

**Localisation** : `src/services/vision/advancedVisionService.ts`

**Fonctionnalités** :
- Détection multi-produits simultanée
- Extraction des dates de péremption
- Analyse de fraîcheur
- Suppression automatique des données EXIF
- Reconnaissance nutritionnelle

**API** :
```typescript
class AdvancedVisionService {
  async analyzeImage(
    imageBlob: Blob,
    options: VisionOptions
  ): Promise<VisionAnalysisResult>;
  
  async extractNutrition(imageBlob: Blob): Promise<NutritionInfo | null>;
  async detectExpiryDate(imageBlob: Blob): Promise<ExpiryInfo | null>;
  async stripExifData(blob: Blob): Promise<Blob>;
}

interface VisionOptions {
  detectMultiple?: boolean;
  analyzeNutrition?: boolean;
  estimateFreshness?: boolean;
  language?: string;
}

interface VisionAnalysisResult {
  success: boolean;
  products: VisionProduct[];
  shelfLife?: ShelfLifeInfo;
  storageRecommendation?: string;
  totalConfidence: number;
  metadata?: ImageMetadata;
}
```

**Exemple d'utilisation** :
```typescript
const visionService = getAdvancedVisionService(apiKey);

const result = await visionService.analyzeImage(imageBlob, {
  detectMultiple: true,
  analyzeNutrition: true,
  estimateFreshness: true,
  language: 'fr'
});

if (result.success) {
  result.products.forEach(product => {
    console.log(`Produit détecté: ${product.name}`);
    console.log(`Confiance: ${product.confidence}`);
    console.log(`Fraîcheur: ${product.freshness}`);
  });
}
```

### `ImageProcessingPipeline`
Pipeline de traitement d'images optimisé.

**Localisation** : `src/services/vision/imageProcessingPipeline.ts`

**Fonctionnalités** :
- Compression intelligente
- Redimensionnement adaptatif
- Correction d'orientation
- Amélioration de contraste
- Détection de qualité

**API** :
```typescript
class ImageProcessingPipeline {
  async processImage(
    imageBlob: Blob,
    options: ProcessingOptions
  ): Promise<ProcessedImage>;
  
  async enhanceForVision(imageBlob: Blob): Promise<Blob>;
  async createThumbnail(imageBlob: Blob, size: number): Promise<string>;
}

interface ProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  enhanceContrast?: boolean;
  correctOrientation?: boolean;
}
```

## 🗣️ Services de Reconnaissance Vocale

### `FrenchVoiceRecognitionService`
Service de reconnaissance vocale optimisé pour le français.

**Localisation** : `src/services/voice/frenchVoiceRecognition.ts`

**Fonctionnalités** :
- Reconnaissance optimisée pour le vocabulaire culinaire français
- Grammaire JSGF personnalisée
- Gestion des erreurs et retry
- Normalisation automatique des transcriptions
- Support des commandes vocales

**API** :
```typescript
class FrenchVoiceRecognitionService {
  async startListening(
    onResult: (result: RecognitionResult) => void,
    onError?: (error: Error) => void
  ): Promise<void>;
  
  stopListening(): void;
  static isSupported(): boolean;
  static async requestPermission(): Promise<boolean>;
}

interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
}
```

**Exemple d'utilisation** :
```typescript
const voiceService = new FrenchVoiceRecognitionService();

await voiceService.startListening(
  (result) => {
    if (result.isFinal && result.confidence > 0.7) {
      console.log('Commande vocale:', result.transcript);
      processVoiceCommand(result.transcript);
    }
  },
  (error) => {
    console.error('Erreur reconnaissance vocale:', error);
  }
);
```

## 📱 Services de Parsing Social Media

### `SocialMediaRecipeParser`
Parser de recettes depuis les réseaux sociaux.

**Localisation** : `src/services/socialMediaParser/socialMediaRecipeParser.ts`

**Fonctionnalités** :
- Support multi-plateformes (Instagram, TikTok, YouTube, Pinterest)
- Extraction IA des recettes
- Analyse des contenus multimédia
- Traduction automatique
- Validation des URLs

**API** :
```typescript
class SocialMediaRecipeParser {
  async parseFromUrl(url: string): Promise<ParsedRecipeResult>;
  async parseWithTranscription(
    url: string,
    options: TranscriptionOptions
  ): Promise<ParsedRecipeResult>;
}

interface ParsedRecipeResult {
  success: boolean;
  recipe?: {
    name: string;
    description?: string;
    ingredients: RecipeIngredient[];
    instructions: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    imageUrl?: string;
    videoUrl?: string;
    author?: AuthorInfo;
  };
  platform?: SupportedPlatform;
  error?: string;
  confidence?: number;
}
```

**Plateformes supportées** :
```typescript
type SupportedPlatform = 
  | 'instagram' 
  | 'tiktok' 
  | 'youtube' 
  | 'facebook' 
  | 'pinterest' 
  | 'twitter';

const platformPatterns = {
  instagram: [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/
  ],
  tiktok: [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /vm\.tiktok\.com\/([A-Za-z0-9]+)/
  ],
  youtube: [
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
    /youtu\.be\/([A-Za-z0-9_-]+)/
  ]
};
```

## 🔧 Hooks Personnalisés

### `useAIAssistant`
Hook principal pour l'assistant IA.

**Localisation** : `src/hooks/useAIAssistant.ts`

**Fonctionnalités** :
- Chat streaming avec contexte
- Reconnaissance vocale intégrée
- Gestion des modes (texte, voix, visuel)
- Rate limiting automatique
- Cache des conversations

**API** :
```typescript
function useAIAssistant(): {
  // État
  messages: Message[];
  isLoading: boolean;
  isListening: boolean;
  isStreaming: boolean;
  error: string | null;
  inputMode: 'text' | 'voice' | 'visual';
  
  // Actions
  sendMessage: (content: string, mode?: MessageMode, metadata?: any) => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  cancelStreaming: () => void;
  clearMessages: () => void;
  setInputMode: (mode: InputMode) => void;
  
  // Helpers
  hasVoiceSupport: boolean;
}
```

### `usePrivacySettings`
Hook de gestion des paramètres de confidentialité RGPD.

**Localisation** : `src/hooks/usePrivacySettings.ts`

**Fonctionnalités** :
- Consentement granulaire
- Sauvegarde locale et distante
- Export/suppression des données
- Nettoyage automatique
- Mode privé

**API** :
```typescript
function usePrivacySettings(): {
  settings: PrivacySettings;
  isLoading: boolean;
  hasConsent: boolean;
  showConsentDialog: boolean;
  
  updateSettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  requestConsent: () => void;
  isFeatureAllowed: (feature: keyof PrivacySettings) => boolean;
  deleteAllData: () => Promise<void>;
  exportUserData: () => Promise<void>;
  setShowConsentDialog: (show: boolean) => void;
}

interface PrivacySettings {
  hasConsent: boolean;
  consentDate?: string;
  allowAnalytics: boolean;
  saveHistory: boolean;
  allowImageProcessing: boolean;
  shareAnonymizedData: boolean;
  batterySaver: boolean;
  autoDeleteAfter?: number;
  dataRetention?: 'minimal' | 'standard' | 'full';
}
```

### `useImageRecognition`
Hook pour la reconnaissance d'images.

**Localisation** : `src/hooks/useImageRecognition.ts`

**API** :
```typescript
function useImageRecognition(): {
  analyzeImage: (blob: Blob, options?: VisionOptions) => Promise<VisionResult>;
  isProcessing: boolean;
  lastResult: VisionResult | null;
  error: string | null;
  
  extractNutrition: (blob: Blob) => Promise<NutritionInfo | null>;
  detectExpiry: (blob: Blob) => Promise<ExpiryInfo | null>;
  clearResults: () => void;
}
```

### `useSocialRecipeParser`
Hook pour le parsing de recettes sociales.

**Localisation** : `src/hooks/useSocialRecipeParser.ts`

**API** :
```typescript
function useSocialRecipeParser(): {
  parseRecipe: (url: string) => Promise<ParsedRecipeResult>;
  isLoading: boolean;
  error: string | null;
  lastParsedRecipe: ParsedRecipeResult | null;
  
  validateUrl: (url: string) => boolean;
  getSupportedPlatforms: () => SupportedPlatform[];
  clearResults: () => void;
}
```

### `useCamera`
Hook pour la gestion de la caméra.

**Localisation** : `src/hooks/useCamera.ts`

**Fonctionnalités** :
- Gestion des permissions
- Optimisations mobiles
- Contraintes adaptatives
- Gestion des erreurs

**API** :
```typescript
function useCamera(): {
  stream: MediaStream | null;
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
  
  startCamera: (constraints?: MediaStreamConstraints) => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<Blob>;
  switchCamera: () => Promise<void>;
}
```

### `useInventory`
Hook pour la gestion de l'inventaire.

**Localisation** : `src/hooks/useInventory.ts`

**API** :
```typescript
function useInventory(): {
  inventory: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  
  addProduct: (product: ProductInput) => Promise<void>;
  updateProduct: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  
  getExpiringItems: (days?: number) => InventoryItem[];
  getLowStockItems: () => InventoryItem[];
  searchProducts: (query: string) => InventoryItem[];
  
  refreshInventory: () => Promise<void>;
}
```

### `useRecipes`
Hook pour la gestion des recettes.

**Localisation** : `src/hooks/useRecipes.ts`

**API** :
```typescript
function useRecipes(): {
  recipes: Recipe[];
  collections: RecipeCollection[];
  isLoading: boolean;
  error: string | null;
  
  addRecipe: (recipe: RecipeInput) => Promise<Recipe>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  
  createCollection: (name: string) => Promise<RecipeCollection>;
  addToCollection: (recipeId: string, collectionId: string) => Promise<void>;
  
  searchRecipes: (query: string) => Promise<Recipe[]>;
  getRecipesByAvailableIngredients: () => Recipe[];
  
  refreshRecipes: () => Promise<void>;
}
```

### `useShoppingList`
Hook pour la gestion de la liste de courses.

**Localisation** : `src/hooks/useShoppingList.ts`

**API** :
```typescript
function useShoppingList(): {
  items: ShoppingItem[];
  isLoading: boolean;
  error: string | null;
  totalEstimatedCost: number;
  
  addItem: (item: ShoppingItemInput) => Promise<void>;
  updateItem: (id: string, updates: Partial<ShoppingItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  
  generateFromRecipes: (recipeIds: string[]) => Promise<void>;
  generateFromLowStock: () => Promise<void>;
  
  clearCompleted: () => Promise<void>;
  estimateTotal: () => number;
}
```

## 🛠️ Utilitaires et Helpers

### Sécurité
**Localisation** : `src/lib/security.ts`

```typescript
// Validation et sanitisation
export function sanitizeInput(input: string): string;
export function isValidUrl(url: string): boolean;
export function validateEmail(email: string): boolean;

// Rate limiting
export class RateLimiter {
  checkLimit(key: string, limit: number, window: number): Promise<boolean>;
  resetLimit(key: string): Promise<void>;
}

// CSRF Protection
export function generateCSRFToken(): string;
export function validateCSRFToken(token: string): boolean;
```

### Performance Mobile
**Localisation** : `src/utils/mobile-performance.ts`

```typescript
// Détection d'appareil
export const deviceCapabilities = {
  isMobile: () => boolean;
  isIOS: () => boolean;
  isAndroid: () => boolean;
  hasWebGL: () => boolean;
  getDeviceMemory: () => number;
  getConnectionType: () => string;
  isPowerSaveMode: () => Promise<boolean>;
};

// Optimisation d'images
export const imageOptimizer = {
  compressImage: (blob: Blob, maxWidth?: number, quality?: number) => Promise<Blob>;
  createThumbnail: (blob: Blob, size?: number) => Promise<string>;
  lazyLoadImage: (src: string, placeholder?: string) => Promise<string>;
};

// Optimisation caméra
export const cameraOptimizer = {
  getOptimalConstraints: () => Promise<MediaStreamConstraints>;
  applyIOSCameraFixes: (video: HTMLVideoElement) => void;
};
```

### Parser Vocal
**Localisation** : `src/utils/voiceParser.ts`

```typescript
// Parsing des commandes vocales
export function parseVoiceCommand(transcript: string): VoiceCommand | null;
export function extractQuantityAndUnit(text: string): QuantityUnit | null;
export function normalizeIngredientName(name: string): string;

interface VoiceCommand {
  action: 'add' | 'remove' | 'update' | 'search';
  product?: string;
  quantity?: number;
  unit?: string;
}

interface QuantityUnit {
  quantity: number;
  unit: string;
  product: string;
}
```

### Vocabulaire Alimentaire Français
**Localisation** : `src/data/frenchFoodVocabulary.ts`

```typescript
// Base de données alimentaire française
export function findFoodByName(name: string): FoodItem | null;
export function searchFoodByCategory(category: FoodCategory): FoodItem[];
export function getNutritionalInfo(foodId: string): NutritionInfo | null;

export const foodCategories: FoodCategory[] = [
  'fruits', 'legumes', 'viandes', 'poissons', 
  'produits-laitiers', 'cereales', 'condiments'
];

interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  aliases: string[];
  defaultUnit: string;
  storageLocation: string;
  shelfLife: number;
  nutritionPer100g: NutritionInfo;
}
```

## 🔌 Intégrations Externes

### Supabase Client
**Localisation** : `src/integrations/supabase/client.ts`

```typescript
// Client Supabase configuré
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Types générés automatiquement
export type Database = {
  public: {
    Tables: {
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      // ... autres tables
    };
  };
};
```

## 📊 Monitoring et Analytics

### Service de Métriques
**Localisation** : `src/services/metrics/metricsService.ts`

```typescript
class MetricsService {
  // Métriques de performance
  recordPerformanceMetric(metric: string, value: number, tags?: Tags): void;
  
  // Métriques d'usage
  recordUserAction(action: string, metadata?: any): void;
  recordFeatureUsage(feature: string, success: boolean): void;
  
  // Métriques d'erreur
  recordError(error: Error, context?: any): void;
  recordAPIError(endpoint: string, statusCode: number): void;
  
  // Export des métriques
  getMetrics(timeRange: TimeRange): Promise<MetricsData>;
  exportMetrics(format: 'json' | 'csv'): Promise<string>;
}
```

## 🧪 Testing des Services

### Mocking des Services
```typescript
// Mock pour tests
export const mockVisionService = {
  analyzeImage: jest.fn().mockResolvedValue({
    success: true,
    products: [{ name: 'Lait', confidence: 0.9 }],
    totalConfidence: 0.9
  }),
  
  stripExifData: jest.fn().mockResolvedValue(new Blob())
};

// Utilisation dans tests
jest.mock('@/services/vision/advancedVisionService', () => ({
  getAdvancedVisionService: () => mockVisionService
}));
```

### Tests d'Intégration
```typescript
describe('AIAssistant Integration', () => {
  it('should process voice command and update inventory', async () => {
    const { result } = renderHook(() => useAIAssistant());
    
    await act(async () => {
      await result.current.sendMessage(
        'Ajoute 2 litres de lait', 
        'voice'
      );
    });
    
    expect(result.current.messages).toHaveLength(2);
    expect(mockInventoryService.addProduct).toHaveBeenCalledWith({
      name: 'Lait',
      quantity: 2,
      unit: 'L'
    });
  });
});
```

## 🚀 Guidelines de Performance

### Optimisations Recommandées
1. **Lazy Loading** : Charger les services à la demande
2. **Memoization** : Cache des résultats coûteux
3. **Debouncing** : Limite les appels API fréquents
4. **Background Processing** : Tâches asynchrones
5. **Error Boundaries** : Isolation des erreurs

### Monitoring des Performances
```typescript
// Mesure automatique des performances
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  serviceName: string
): T {
  return ((...args: any[]) => {
    const start = performance.now();
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start;
          MetricsService.recordPerformanceMetric(
            `${serviceName}.duration`, 
            duration
          );
        });
      }
      
      const duration = performance.now() - start;
      MetricsService.recordPerformanceMetric(
        `${serviceName}.duration`, 
        duration
      );
      
      return result;
    } catch (error) {
      MetricsService.recordError(error, { service: serviceName });
      throw error;
    }
  }) as T;
}
```

---

Cette documentation des services est maintenue à jour avec l'évolution de l'architecture. Pour toute question ou contribution, consultez le [guide de contribution](../CONTRIBUTING.md).