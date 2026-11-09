# 🎵 Architecture "Spotify des recettes" - Smart Pantry Pro

## 🎯 Vue d'ensemble

L'architecture "Spotify des recettes" implémente un système à double couche inspiré du modèle Spotify : un **catalogue global** partagé par tous les utilisateurs + une **bibliothèque personnelle** pour chaque utilisateur.

## 🏗️ Architecture Data

### Double-layer System

```
📚 CATALOGUE GLOBAL (recipes_catalog)
├── 10k+ recettes vérifiées
├── Métadonnées enrichies (photos pro, nutrition, tags)
├── Système de notation communautaire
└── Accessible à tous les utilisateurs

👤 BIBLIOTHÈQUE PERSONNELLE (user_recipes)
├── Recettes ajoutées depuis le catalogue
├── Créations personnelles (custom)
├── Modifications/personnalisations
└── Collections thématiques
```

## 🗄️ Structure Database

### Tables principales

#### `recipes_catalog` - Le catalogue global
```sql
-- Base commune à tous les utilisateurs
CREATE TABLE recipes_catalog (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  ingredients_json JSONB, -- Ingrédients structurés
  instructions TEXT,
  photo_url TEXT,
  nutrition_json JSONB, -- Informations nutritionnelles
  tags TEXT[], -- Tags de catégorisation
  difficulty INTEGER (1-5),
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  servings INTEGER,
  rating_avg DECIMAL(2,1), -- Note moyenne
  rating_count INTEGER, -- Nombre d'évaluations
  times_added INTEGER, -- Popularité
  is_premium BOOLEAN, -- Contenu premium
  verified_status BOOLEAN -- Qualité vérifiée
);
```

#### `user_recipes` - Bibliothèques personnelles
```sql
-- Espace personnel de chaque utilisateur
CREATE TABLE user_recipes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  recipe_id UUID REFERENCES recipes_catalog(id), -- NULL si custom
  is_from_catalog BOOLEAN,
  
  -- Contenu custom (si pas du catalogue)
  custom_title VARCHAR(255),
  custom_ingredients_json JSONB,
  custom_instructions TEXT,
  
  -- Personnalisations (même pour recettes catalogue)
  custom_modifications JSONB, -- Flexibilité maximale
  
  -- Métadonnées personnelles
  personal_notes TEXT,
  personal_rating INTEGER (1-5),
  collections TEXT[], -- ["Batch Cooking", "Été 2024"]
  
  -- Historique d'usage
  times_cooked INTEGER DEFAULT 0,
  last_cooked_date TIMESTAMP
);
```

#### `user_collections` - Collections thématiques
```sql
-- Dossiers personnalisés pour organiser les recettes
CREATE TABLE user_collections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color
  icon VARCHAR(50), -- Icon name
  recipe_count INTEGER DEFAULT 0
);
```

## 📱 Flow UX Principal

### 1. Onboarding magique (30 secondes)
```
Nouvel utilisateur
    ↓
"Commençons par vos goûts !" 
    ↓
Sélection rapide 10 recettes populaires
    ↓
"Votre bibliothèque est prête !"
```

### 2. Navigation principale
```
[🔍 Explorer] [📚 Mes recettes] [➕ Ajouter] [📁 Collections]
     │              │               │            │
     │              │               │            └─ Organiser
     │              │               └─ Import/Create
     │              └─ Ma bibliothèque personnelle  
     └─ Catalogue global avec découverte
```

### 3. Interaction Catalogue → Bibliothèque
```
Recette dans Explorer
    ↓
[♥️ Ajouter à mes recettes] (1 tap)
    ↓
Options automatiques :
├─ Ajouter telle quelle
├─ Ajouter et personnaliser  
└─ Ajouter à une collection
```

## 🛠️ Architecture Code

### Hooks principaux

#### `useRecipeCatalog.ts`
```typescript
// Gestion du catalogue global
const {
  recipes, // Liste des recettes du catalogue
  filters, setFilters, // Filtrage avancé
  sortBy, setSortBy, // Tri par popularité, note, etc.
  fetchNextPage, // Pagination
  isLoading
} = useRecipeCatalog();

// Rating communautaire
const { mutate: rateRecipe } = useRateCatalogRecipe();
```

#### `useUserRecipes.ts`
```typescript
// Gestion de la bibliothèque personnelle
const {
  recipes, // Recettes de l'utilisateur
  addFromCatalog, // Ajouter depuis le catalogue
  addCustomRecipe, // Créer une recette custom
  updateRecipe, // Modifier/personnaliser
  markAsCooked, // Historique culinaire
  deleteRecipe
} = useUserRecipes();

// Collections personnelles
const {
  collections,
  createCollection,
  updateCollection,
  deleteCollection
} = useUserCollections();
```

### Composants UI

#### Pages principales
- `RecipeCatalog.tsx` - Page Explorer (découverte)
- `MyRecipes.tsx` - Page Ma Bibliothèque
- `RecipeOnboarding.tsx` - Onboarding magique

#### Composants de gestion
- `CollectionsManager.tsx` - Gestion des collections
- `RecipeCustomizer.tsx` - Personnalisation de recettes

### Personnalisation avancée

Le système permet de personnaliser n'importe quelle recette du catalogue :

```typescript
// Structure flexible des modifications
custom_modifications: {
  title?: string, // Titre personnalisé
  ingredients_override?: Ingredient[], // Ingrédients modifiés
  instructions_append?: string, // Instructions ajoutées
  servings_multiplier?: number, // Ajustement portions
  personal_notes_inline?: string // Notes intégrées
}
```

## 🚀 Fonctionnalités implémentées

### ✅ Core MVP
- [x] Catalogue global avec 3 recettes d'exemple
- [x] Système d'ajout simple catalogue → bibliothèque  
- [x] Recherche et filtrage avancé
- [x] Gestion des collections personnelles
- [x] Personnalisation de recettes (ingrédients, portions, notes)
- [x] Onboarding magique avec sélection guidée

### ✅ Engagement Features
- [x] Collections thématiques avec couleurs/icônes
- [x] Système de modifications personnalisées
- [x] Historique culinaire (times_cooked, last_cooked_date)
- [x] Notes personnelles et rating

### 🔄 À développer (Phase suivante)
- [ ] Import en masse du catalogue (500+ recettes)
- [ ] Système de notation communautaire complet
- [ ] Partage de recettes entre utilisateurs
- [ ] Suggestions IA basées sur l'historique
- [ ] Mode hors ligne / synchronisation
- [ ] Intégration liste de courses

## 🎨 Patterns UI/UX

### Design System
- **Catalogue** : Gradient orange → rouge (exploration, énergie)
- **Bibliothèque** : Gradient bleu → violet (personnel, organisation)  
- **Collections** : Couleurs personnalisables par utilisateur
- **Personnalisation** : Accent purple (créativité)

### Micro-interactions
- Animations framer-motion pour les transitions
- Feedback visuel immédiat (♥️ → ajouté)
- States loading/error robustes
- Skeleton loaders pendant chargement

## 📊 Métriques de succès

### Engagement
```javascript
{
  "catalog_metrics": {
    "browse_to_add_rate": "% qui ajoutent après exploration",
    "popular_recipes": "Top recettes les plus ajoutées",
    "search_success_rate": "% recherches → ajout"
  },
  
  "library_metrics": {
    "avg_recipes_per_user": "Cible: 15-20",
    "active_recipes": "Cuisinées dans les 30j",
    "customization_rate": "% de recettes personnalisées"
  }
}
```

## 🔧 Utilisation technique

### 1. Appliquer la migration
```bash
# La migration crée toutes les tables nécessaires
supabase migration up
```

### 2. Utiliser les hooks
```typescript
import { useRecipeCatalog, useUserRecipes } from '@/hooks';

function ExplorerPage() {
  const { recipes, filters, setFilters } = useRecipeCatalog();
  const { addFromCatalog } = useUserRecipes();
  
  const handleAdd = (recipeId: string) => {
    addFromCatalog({ catalogRecipeId: recipeId });
  };
  
  return (
    <div>
      {recipes.map(recipe => (
        <RecipeCard 
          key={recipe.id}
          recipe={recipe} 
          onAdd={() => handleAdd(recipe.id)}
        />
      ))}
    </div>
  );
}
```

### 3. Personnaliser une recette
```typescript
import { RecipeCustomizer } from '@/components/recipes';

function MyRecipePage({ userRecipe }) {
  const [showCustomizer, setShowCustomizer] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowCustomizer(true)}>
        Personnaliser cette recette
      </Button>
      
      <RecipeCustomizer
        recipe={userRecipe}
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />
    </>
  );
}
```

## 🎯 Points clés de l'implémentation

1. **Séparation claire** : Catalogue global vs bibliothèques personnelles
2. **Flexibilité maximale** : Personnalisation sans limites via JSON
3. **Performance** : Indexation, mise en cache, pagination
4. **UX fluide** : Time-to-value de 30 secondes via onboarding
5. **Évolutivité** : Structure prête pour la monétisation Premium

Cette architecture respecte parfaitement le pattern "Spotify" tout en étant spécifiquement adaptée aux recettes de cuisine ! 🎵👨‍🍳