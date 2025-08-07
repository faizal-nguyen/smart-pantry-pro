# Documentation des Composants - Smart Pantry Pro

## Vue d'ensemble

Cette documentation détaille tous les composants React de Smart Pantry Pro, leurs props, leur utilisation et leurs fonctionnalités.

## 🏗️ Structure des Composants

```
src/components/
├── Layout.tsx                 # Layout principal de l'application
├── MessageDisplay.tsx         # Affichage des messages système
├── PWAStatus.tsx             # Statut de l'app PWA
├── ai/                       # Composants Assistant IA
├── icons/                    # Icônes personnalisées
├── inventory/                # Gestion de l'inventaire
├── recipes/                  # Gestion des recettes
├── scanner/                  # Smart Scanner
├── shopping/                 # Liste de courses
├── ui/                       # Composants UI de base
└── vision/                   # Vision AI
```

## 📱 Smart Scanner Components

### `SmartScanner`
Composant principal du système de scanning intelligent avec vision AI.

**Localisation** : `src/components/scanner/SmartScanner.tsx`

**Props** :
```typescript
interface SmartScannerProps {
  onProductAdded?: (product: any) => void;
  defaultMode?: 'single' | 'multi' | 'social';
}
```

**Fonctionnalités** :
- Scanner de produit unique avec caméra
- Scanner multi-produits avec détection IA
- Parser de recettes depuis réseaux sociaux
- Gestion des paramètres de confidentialité
- Interface avec onglets animés

**Exemple d'utilisation** :
```jsx
<SmartScanner 
  defaultMode="multi"
  onProductAdded={(product) => {
    console.log('Produit ajouté:', product);
  }}
/>
```

### `PrivacyConsent`
Composant de gestion du consentement RGPD.

**Localisation** : `src/components/scanner/PrivacyConsent.tsx`

**Props** :
```typescript
interface PrivacyConsentProps {
  isOpen: boolean;
  onAccept: (accepted: boolean) => void;
}
```

**Fonctionnalités** :
- Modal de consentement RGPD
- Paramètres de confidentialité granulaires
- Sauvegarde locale et distante des préférences

### `ScannerSettings`
Configuration avancée du scanner.

**Localisation** : `src/components/scanner/ScannerSettings.tsx`

**Props** :
```typescript
interface ScannerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PrivacySettings;
  onUpdate: (settings: Partial<PrivacySettings>) => void;
}
```

**Fonctionnalités** :
- Mode économie de batterie
- Qualité d'image ajustable
- Paramètres de rétention des données
- Mode privé/historique

### `SocialMediaInput`
Parser de recettes depuis les réseaux sociaux.

**Localisation** : `src/components/scanner/SocialMediaInput.tsx`

**Props** :
```typescript
interface SocialMediaInputProps {
  onRecipeExtracted: (recipe: any) => void;
  settings: PrivacySettings;
}
```

**Fonctionnalités** :
- Support Instagram, TikTok, YouTube, Pinterest
- Validation d'URL automatique
- Extraction IA des recettes
- Aperçu temps réel

## 🤖 AI Assistant Components

### `AIAssistantChat`
Interface principale de chat avec l'assistant IA.

**Localisation** : `src/components/ai/AIAssistantChat.tsx`

**Props** :
```typescript
interface AIAssistantChatProps {
  className?: string;
  initialMode?: 'text' | 'voice' | 'visual';
}
```

**Fonctionnalités** :
- Chat en streaming temps réel
- Support multi-modal (texte, voix, image)
- Suggestions contextuelles
- Historique de conversation

### `MessageList`
Affichage des messages de conversation.

**Localisation** : `src/components/ai/MessageList.tsx`

**Props** :
```typescript
interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onRegenerateMessage?: (messageId: string) => void;
}
```

**Fonctionnalités** :
- Rendu optimisé des messages
- Support markdown
- Actions contextuelles
- Scroll automatique

### `InputArea`
Zone de saisie avec support vocal.

**Localisation** : `src/components/ai/InputArea.tsx`

**Props** :
```typescript
interface InputAreaProps {
  onSendMessage: (message: string, mode: 'text' | 'voice') => void;
  isLoading: boolean;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
}
```

**Fonctionnalités** :
- Saisie de texte avec auto-resize
- Bouton de reconnaissance vocale
- Indicateurs d'état
- Raccourcis clavier

### `StreamingIndicator`
Indicateur visuel pour le streaming IA.

**Localisation** : `src/components/ai/StreamingIndicator.tsx`

**Fonctionnalités** :
- Animation de dots pulsants
- Indicateur de typing
- Statut de connexion

## 📦 Inventory Components

### `CameraCapture`
Capture photo optimisée pour mobile.

**Localisation** : `src/components/inventory/CameraCapture.tsx`

**Props** :
```typescript
interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  batteryMode?: boolean;
}
```

**Fonctionnalités** :
- Optimisations iOS Safari
- Mode économie de batterie
- Compression d'image automatique
- Fixes d'orientation mobile

### `MobileCameraOptimized`
Caméra spécialement optimisée pour mobile.

**Localisation** : `src/components/inventory/MobileCameraOptimized.tsx`

**Fonctionnalités** :
- Détection de capabilities du device
- Ajustement automatique de la qualité
- Support des contraints de caméra
- Gestion des permissions

### `BarcodeScanner`
Scanner de codes-barres intégré.

**Localisation** : `src/components/inventory/BarcodeScanner.tsx`

**Props** :
```typescript
interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: Error) => void;
}
```

**Fonctionnalités** :
- Détection multi-formats (EAN, UPC, QR)
- Overlay de guidage visuel
- Performance optimisée
- Support mobile

### `ProductCard`
Carte d'affichage de produit.

**Localisation** : `src/components/inventory/ProductCard.tsx`

**Props** :
```typescript
interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  showActions?: boolean;
}
```

**Fonctionnalités** :
- Affichage de péremption avec codes couleur
- Actions contextuelles
- Image placeholder intelligente
- Badges de statut

### `VoiceInputButton`
Bouton d'entrée vocale.

**Localisation** : `src/components/inventory/VoiceInputButton.tsx`

**Props** :
```typescript
interface VoiceInputButtonProps {
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}
```

**Fonctionnalités** :
- Animation de pulsation
- États visuels
- Feedback haptic
- Support accessibilité

## 🍳 Recipe Components

### `RecipeCard`
Carte de recette avec fonctionnalités avancées.

**Localisation** : `src/components/recipes/RecipeCard.tsx`

**Props** :
```typescript
interface RecipeCardProps {
  recipe: Recipe;
  availableIngredients?: string[];
  onView?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipeId: string) => void;
  showAvailability?: boolean;
}
```

**Fonctionnalités** :
- Indicateurs d'ingrédients disponibles
- Score de faisabilité
- Actions contextuelles
- Image lazy loading

### `AddRecipeDialog`
Modal d'ajout/édition de recette.

**Localisation** : `src/components/recipes/AddRecipeDialog.tsx`

**Props** :
```typescript
interface AddRecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: RecipeInput) => void;
  initialRecipe?: Recipe;
}
```

**Fonctionnalités** :
- Éditeur WYSIWYG
- Calcul nutritionnel automatique
- Validation temps réel
- Upload d'images

### `RecipeCollections`
Gestion des collections de recettes.

**Localisation** : `src/components/recipes/RecipeCollections.tsx`

**Props** :
```typescript
interface RecipeCollectionsProps {
  collections: RecipeCollection[];
  onCreateCollection: (name: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onAddToCollection: (recipeId: string, collectionId: string) => void;
}
```

**Fonctionnalités** :
- Drag & drop pour organisation
- Collections personnalisées
- Partage de collections
- Import/export

### `RecipeVoiceInput`
Saisie vocale de recettes.

**Localisation** : `src/components/recipes/RecipeVoiceInput.tsx`

**Fonctionnalités** :
- Reconnaissance vocale française
- Parsing intelligent des ingrédients
- Correction automatique
- Confirmation utilisateur

## 🛒 Shopping Components

### `ShoppingItemCard`
Carte d'article de liste de courses.

**Localisation** : `src/components/shopping/ShoppingItemCard.tsx`

**Props** :
```typescript
interface ShoppingItemCardProps {
  item: ShoppingItem;
  onToggle: (itemId: string) => void;
  onEdit?: (item: ShoppingItem) => void;
  onDelete?: (itemId: string) => void;
}
```

**Fonctionnalités** :
- Checkbox avec animation
- Estimation de prix
- Catégorisation par rayon
- Actions swipe

### `AddShoppingItemDialog`
Ajout d'article à la liste de courses.

**Localisation** : `src/components/shopping/AddShoppingItemDialog.tsx`

**Props** :
```typescript
interface AddShoppingItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: ShoppingItemInput) => void;
  categories?: string[];
}
```

**Fonctionnalités** :
- Auto-completion intelligente
- Suggestions de quantité
- Catégories prédéfinies
- Estimation de prix

## 👁️ Vision AI Components

### `MultiProductScanner`
Scanner multi-produits avec Vision AI.

**Localisation** : `src/components/vision/MultiProductScanner.tsx`

**Props** :
```typescript
interface MultiProductScannerProps {
  onProductsDetected: (products: VisionProduct[]) => void;
  maxProducts?: number;
}
```

**Fonctionnalités** :
- Détection simultanée de plusieurs produits
- Bounding boxes interactives
- Analyse de fraîcheur
- Extraction des dates de péremption

## 🎨 UI Components (shadcn/ui)

### Composants de Base

#### `Button`
**Localisation** : `src/components/ui/button.tsx`

**Variantes** :
```typescript
type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
type ButtonSize = "default" | "sm" | "lg" | "icon"
```

#### `Card`
**Localisation** : `src/components/ui/card.tsx`

**Composants** :
- `Card` - Container principal
- `CardHeader` - En-tête avec titre
- `CardContent` - Contenu principal
- `CardFooter` - Pied avec actions

#### `Dialog`
**Localisation** : `src/components/ui/dialog.tsx`

**Composants** :
- `Dialog` - Container modal
- `DialogTrigger` - Déclencheur
- `DialogContent` - Contenu modal
- `DialogHeader` / `DialogFooter` - En-tête/Pied

#### `Input`
**Localisation** : `src/components/ui/input.tsx`

**Props** :
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}
```

#### `Tabs`
**Localisation** : `src/components/ui/tabs.tsx`

**Composants** :
- `Tabs` - Container principal
- `TabsList` - Liste des onglets
- `TabsTrigger` - Bouton d'onglet
- `TabsContent` - Contenu d'onglet

### Composants Spécialisés

#### `LoadingSkeleton`
**Localisation** : `src/components/ui/loading-skeleton.tsx`

**Fonctionnalités** :
- Animation de chargement
- Formes personnalisables
- États multiples

#### `EmptyState`
**Localisation** : `src/components/ui/empty-state.tsx`

**Props** :
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

#### `SwipeAction`
**Localisation** : `src/components/ui/swipe-action.tsx`

**Fonctionnalités** :
- Actions par swipe mobile
- Animations fluides
- Actions configurables

## 🔧 Hooks Personnalisés Liés aux Composants

### `useCamera`
**Localisation** : `src/hooks/useCamera.ts`

**Fonctionnalités** :
- Gestion des permissions caméra
- Optimisations mobile
- Gestion des erreurs

### `useImageRecognition`
**Localisation** : `src/hooks/useImageRecognition.ts`

**Fonctionnalités** :
- Interface avec Vision AI
- Cache des résultats
- Optimisations de performance

### `useSpeechRecognition`
**Localisation** : `src/hooks/useSpeechRecognition.ts`

**Fonctionnalités** :
- Reconnaissance vocale française
- Gestion des erreurs
- États de reconnaissance

## 🎯 Patterns d'Utilisation

### Composant Composite Typique

```jsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function ProductCard({ product, onEdit }) {
  const isExpiringSoon = useMemo(() => {
    return isProductExpiring(product.expiryDate, 3);
  }, [product.expiryDate]);

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{product.name}</h3>
          {isExpiringSoon && (
            <Badge variant="destructive">
              Expire bientôt
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Quantité: {product.quantity} {product.unit}
        </p>
        
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => onEdit(product)}>
            Modifier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Gestion d'État Commune

```jsx
function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  
  const { startListening, stopListening, isListening } = useSpeechRecognition({
    language: 'fr-FR',
    onResult: handleVoiceResult
  });
  
  const handleProductAdded = useCallback((newProduct) => {
    setProducts(prev => [...prev, newProduct]);
    toast.success(`${newProduct.name} ajouté à l'inventaire`);
  }, []);
  
  return (
    <div className="space-y-6">
      <SmartScanner 
        onProductAdded={handleProductAdded}
        defaultMode="multi"
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map(product => (
          <ProductCard 
            key={product.id}
            product={product}
            onEdit={handleEditProduct}
          />
        ))}
      </div>
    </div>
  );
}
```

## 📱 Optimisations Mobile

### Gestes et Interactions
- **Swipe actions** sur les cartes d'éléments
- **Pull-to-refresh** sur les listes
- **Touch optimizations** pour les boutons
- **Haptic feedback** quand disponible

### Performance
- **Lazy loading** des images
- **Virtual scrolling** pour les longues listes
- **Debounced inputs** pour la recherche
- **Optimized re-renders** avec React.memo

### Responsive Design
- **Mobile-first** approach
- **Touch-friendly** sizing (44px minimum)
- **Safe areas** pour iPhone X+
- **Orientation handling**

## 🧪 Tests des Composants

### Structure des Tests
```
src/components/
├── __tests__/
│   ├── SmartScanner.test.tsx
│   ├── AIAssistantChat.test.tsx
│   └── ProductCard.test.tsx
└── ai/
    └── __tests__/
        └── AIAssistantChat.test.tsx
```

### Exemple de Test
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Lait',
    quantity: 2,
    unit: 'L',
    expiryDate: '2024-01-20'
  };

  it('affiche les informations du produit', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Lait')).toBeInTheDocument();
    expect(screen.getByText('Quantité: 2 L')).toBeInTheDocument();
  });

  it('appelle onEdit quand le bouton est cliqué', () => {
    const mockOnEdit = jest.fn();
    render(<ProductCard product={mockProduct} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByText('Modifier'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockProduct);
  });
});
```

## 📋 Guidelines de Développement

### Naming Conventions
- **Composants** : PascalCase (ex: `ProductCard`)
- **Props** : camelCase (ex: `onProductAdded`)
- **Files** : PascalCase pour composants (ex: `ProductCard.tsx`)

### Structure de Fichier
```tsx
// 1. Imports externes
import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';

// 2. Imports internes
import { Button } from '@/components/ui/button';
import { useInventory } from '@/hooks/useInventory';

// 3. Types/Interfaces
interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
}

// 4. Composant principal
export function ProductCard({ product, onEdit }: ProductCardProps) {
  // Hooks et état local
  const [isLoading, setIsLoading] = useState(false);
  
  // Callbacks
  const handleEdit = useCallback(() => {
    onEdit?.(product);
  }, [product, onEdit]);
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// 5. Composants auxiliaires (si nécessaires)
function ProductBadge({ status }: { status: string }) {
  return <span>{status}</span>;
}
```

### Performance Best Practices
- Utiliser `React.memo` pour les composants pure
- `useCallback` pour les fonctions passées en props
- `useMemo` pour les calculs coûteux
- Éviter les inline objects/arrays dans les props

---

Cette documentation est maintenue à jour avec chaque évolution des composants. Pour contribuer ou signaler des erreurs, consultez le [guide de contribution](../CONTRIBUTING.md).