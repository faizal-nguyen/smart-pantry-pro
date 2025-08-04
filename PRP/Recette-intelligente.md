Recette-intelligente


J'ai créé un PRP complet pour votre module recettes intelligent ! Voici les points clés :
🎯 Fonctionnalités Différenciatrices
5 méthodes d'ajout innovantes :

Saisie manuelle guidée avec autocomplétion
Parsing URL intelligent (Marmiton, 750g, blogs culinaires)
Import réseaux sociaux (Instagram, TikTok, Pinterest)
Scanner OCR livres avec traduction automatique (🔥 feature unique)
Import communauté via QR codes/liens partagés

Intelligence inventaire avancée :

Matching fuzzy : "pomme" vs "pommes"
Substitutions intelligentes : beurre → huile d'olive (ratio 1:0.75)
Ajustement portions avec logique spécialisée (épices ≠ linéaire)
Analyse temps réel : 🟢 faisable / 🟡 2 manquants / 🔴 impossible

OCR + IA révolutionnaire :

Scanner n'importe quel livre de recettes
Traduction automatique anglais → français
Structuration intelligente du texte avec OpenAI/Claude
Reconnaissance contextuelle culinaire

🏗️ Architecture Technique Solide
Stack optimisée :

Frontend : React + TypeScript + Tailwind (mobile-first)
Backend : Supabase (PostgreSQL + Storage + Auth)
IA : OpenAI/Claude + Google Vision API + DeepL
Services : APIs spécialisées (OpenFoodFacts, sites recettes)

Base de données complète :

Tables recipes, recipe_ingredients, collections, reviews
JSONB pour flexibilité (instructions, nutrition)
Relations optimisées avec inventaire existant

🎨 UX Exceptionnelle
Interface intuitive :

Cards visuelles avec status inventaire coloré
Wizard ajout guidé par étapes
Micro-interactions (animations parsing, feedback scan)
Suggestions personnalisées basées sur inventaire

Features sociales :

Collections partagées famille/amis
Évaluations + photos résultats
Export PDF professionnel
QR codes pour partage rapide

# PRP - MODULE RECETTES INTELLIGENT SMART PANTRY 🍳📱

## 📋 CONTEXTE & VISION

### Problème Résolu
Les utilisateurs ont des difficultés à :
- Gérer leurs recettes favorites dispersées (livres, sites, réseaux sociaux)
- Savoir rapidement s'ils ont tous les ingrédients pour une recette
- Organiser leurs courses en fonction des recettes prévues
- Découvrir de nouvelles recettes adaptées à leur inventaire

### Vision Produit
Créer le **hub central de recettes intelligent** qui :
- ✅ Centralise toutes les sources de recettes (manuelle, URL, réseaux sociaux, livres scannés)
- ✅ Analyse automatiquement l'inventaire disponible vs ingrédients nécessaires
- ✅ Génère des listes de courses optimisées
- ✅ Suggère des recettes selon l'inventaire et les préférences
- ✅ Traduit et adapte les recettes internationales

---

## 🎯 SPÉCIFICATIONS FONCTIONNELLES

### 1. AJOUT DE RECETTES MULTI-SOURCES

#### 1.1 Saisie Manuelle Guidée
**Interface utilisateur :**
```yaml
Formulaire Recette:
  - Nom de la recette (requis)
  - Photo de la recette (optionnel, encouragé)
  - Catégorie cuisine (dropdown + recherche)
  - Temps préparation (minutes)
  - Temps cuisson (minutes)
  - Nombre de portions (1-12 personnes)
  - Niveau difficulté (1-5 étoiles)
  - Instructions étape par étape
  - Liste ingrédients avec quantités/unités

Ingrédients Input:
  - Nom ingrédient (autocomplétion depuis inventaire)
  - Quantité (nombre)
  - Unité (dropdown adaptatif)
  - Optionnel/Essentiel (toggle)
  - Notes spéciales (ex: "bio de préférence")
```

#### 1.2 Import par URL (Sites de Recettes)
**Sites supportés :**
- Marmiton, 750g, Cuisine AZ (France)
- AllRecipes, Food Network (International)
- Blog culinaires avec Schema.org structured data

**Processus technique :**
```typescript
interface RecipeParser {
  parseRecipeFromURL(url: string): Promise<ParsedRecipe>
  extractStructuredData(html: string): RecipeStructuredData
  fallbackContentParsing(html: string): Partial<ParsedRecipe>
  translateIngredients(ingredients: string[], fromLang: string): Promise<string[]>
}

// Exemple d'implémentation
async function parseRecipeURL(url: string): Promise<ParsedRecipe> {
  // 1. Fetch page content
  const response = await fetch(url);
  const html = await response.text();
  
  // 2. Try structured data first (JSON-LD, microdata)
  const structuredData = extractJSONLD(html, 'Recipe');
  if (structuredData) return normalizeStructuredRecipe(structuredData);
  
  // 3. Fallback: intelligent content parsing
  const recipe = await intelligentHTMLParsing(html);
  
  // 4. Validate and clean data
  return validateAndCleanRecipe(recipe);
}
```

#### 1.3 Import Réseaux Sociaux
**Plateformes supportées :**
- Instagram (posts + stories avec recettes)
- TikTok (descriptions de recettes)
- Pinterest (épingles de recettes)

**Défis techniques :**
```yaml
Instagram Parsing:
  - URL format: instagram.com/p/[post-id]
  - Extract: image, description, hashtags
  - Parse description pour ingrédients et instructions
  - Gestion des emojis et formatage

TikTok Parsing:
  - URL format: tiktok.com/@user/video/[video-id]
  - Extract: thumbnail, description
  - Parse instructions depuis la description
  - Support langues multiples

Pinterest Parsing:
  - URL format: pinterest.com/pin/[pin-id]
  - Extract: image, titre, description
  - Souvent redirect vers site original (parser URL finale)
```

#### 1.4 Scanner de Livres de Recettes (OCR + Vision AI)
**Fonctionnalité premium unique :**
```typescript
interface BookRecipeScanner {
  scanBookPage(imageFile: File): Promise<ScannedRecipe>
  translateRecipe(recipe: ScannedRecipe, targetLang: 'fr'): Promise<TranslatedRecipe>
  structureRecipeFromText(rawText: string): Promise<StructuredRecipe>
}

// Processus technique
async function scanBookRecipe(photo: File): Promise<Recipe> {
  // 1. OCR avec Google Vision ou Azure Cognitive Services
  const extractedText = await performOCR(photo);
  
  // 2. Intelligent parsing with OpenAI/Claude
  const structuredRecipe = await parseRecipeWithAI(extractedText);
  
  // 3. Translation si nécessaire
  if (structuredRecipe.detectedLanguage !== 'fr') {
    structuredRecipe = await translateRecipe(structuredRecipe, 'fr');
  }
  
  // 4. Validation et nettoyage
  return validateScannedRecipe(structuredRecipe);
}
```

### 2. CATÉGORISATION ET MÉTADONNÉES

#### 2.1 Taxonomie Cuisine
```yaml
Catégories Principales:
  Européenne:
    - Française (Classique, Régionale, Moderne)
    - Italienne (Nord, Sud, Sicilienne)
    - Espagnole (Tapas, Paella, Basque)
    - Grecque, Allemande, Britannique
  
  Asiatique:
    - Chinoise (Cantonaise, Sichuanaise, Pékinoise)
    - Japonaise (Traditionnelle, Fusion)
    - Thaïlandaise, Vietnamienne, Coréenne
    - Indienne (Nord, Sud, Végétarienne)
  
  Africaine & Moyen-Orient:
    - Marocaine, Tunisienne, Libanaise
    - Éthiopienne, Sud-Africaine
  
  Amériques:
    - Mexicaine, Péruvienne, Brésilienne
    - États-Unis (BBQ, Tex-Mex, Soul Food)
    - Canadienne

Catégories Transversales:
  - Végétarienne, Végan, Sans Gluten
  - Keto, Paleo, Méditerranéenne
  - Rapide (<30min), Batch Cooking
  - Desserts, Apéritifs, Brunchs
```

#### 2.2 Métadonnées Enrichies
```typescript
interface RecipeMetadata {
  // Temporel
  prepTime: number;        // minutes
  cookTime: number;        // minutes
  totalTime: number;       // calculé automatiquement
  restTime?: number;       // temps de repos/refroidissement
  
  // Difficulté et portions
  difficulty: 1 | 2 | 3 | 4 | 5;
  servings: number;
  scalable: boolean;       // peut être ajusté facilement
  
  // Classifications
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'drink';
  season?: 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
  occasion?: 'everyday' | 'party' | 'holiday' | 'romantic' | 'kids';
  
  // Nutritionnel (calculé automatiquement)
  estimatedCalories?: number;
  isHealthy?: boolean;
  
  // Technique
  cookingMethods: string[]; // 'oven', 'stovetop', 'grill', 'microwave'
  equipmentNeeded: string[]; // 'blender', 'stand-mixer', 'pressure-cooker'
}
```

### 3. GESTION INTELLIGENTE DES INGRÉDIENTS

#### 3.1 Matching Inventaire ↔ Recette
```typescript
interface IngredientMatcher {
  analyzeRecipeRequirements(recipe: Recipe): Promise<IngredientAnalysis>
  findInventoryMatches(requiredIngredients: Ingredient[]): Promise<InventoryMatch[]>
  suggestSubstitutions(missingIngredients: Ingredient[]): Promise<Substitution[]>
}

interface IngredientAnalysis {
  totalIngredients: number;
  availableInInventory: InventoryMatch[];
  missingFromInventory: MissingIngredient[];
  substitutionsPossible: Substitution[];
  estimatedCost: number;
  canMakeRecipe: boolean;
  confidenceScore: number; // 0-100%
}

// Logique de matching intelligent
async function analyzeRecipeInventory(recipe: Recipe, inventory: Inventory[]): Promise<IngredientAnalysis> {
  const analysis: IngredientAnalysis = {
    totalIngredients: recipe.ingredients.length,
    availableInInventory: [],
    missingFromInventory: [],
    substitutionsPossible: [],
    estimatedCost: 0,
    canMakeRecipe: false,
    confidenceScore: 0
  };
  
  for (const ingredient of recipe.ingredients) {
    // 1. Exact match
    const exactMatch = findExactMatch(ingredient, inventory);
    if (exactMatch && hasEnoughQuantity(exactMatch, ingredient)) {
      analysis.availableInInventory.push({
        ingredient,
        inventoryItem: exactMatch,
        matchType: 'exact'
      });
      continue;
    }
    
    // 2. Fuzzy match (pomme vs pommes, lait vs lait entier)
    const fuzzyMatch = findFuzzyMatch(ingredient, inventory);
    if (fuzzyMatch) {
      analysis.availableInInventory.push({
        ingredient,
        inventoryItem: fuzzyMatch,
        matchType: 'fuzzy',
        confidence: calculateMatchConfidence(ingredient, fuzzyMatch)
      });
      continue;
    }
    
    // 3. Substitution possible
    const substitution = await findSubstitution(ingredient, inventory);
    if (substitution) {
      analysis.substitutionsPossible.push(substitution);
      continue;
    }
    
    // 4. Missing ingredient
    analysis.missingFromInventory.push({
      ingredient,
      estimatedPrice: await getEstimatedPrice(ingredient),
      urgency: ingredient.essential ? 'high' : 'medium'
    });
  }
  
  analysis.canMakeRecipe = analysis.missingFromInventory.length === 0 || 
                          analysis.substitutionsPossible.length >= analysis.missingFromInventory.length;
  
  analysis.confidenceScore = calculateOverallConfidence(analysis);
  
  return analysis;
}
```

#### 3.2 Substitutions Intelligentes
```yaml
Base de Données Substitutions:
  Produits Laitiers:
    - lait entier → lait demi-écrémé (ratio 1:1)
    - beurre → huile d'olive (ratio 1:0.75)
    - crème fraîche → yaourt grec (ratio 1:1)
  
  Œufs (pour 1 œuf):
    - 1 banane écrasée (pour gâteaux)
    - 1 cuillère soupe graines de lin + 3 cuillères eau
    - 1/4 tasse compote de pommes
  
  Épices et Herbes:
    - herbes fraîches → herbes séchées (ratio 3:1)
    - ail frais → poudre d'ail (1 gousse = 1/8 cuillère à café)
  
  Alcools:
    - vin blanc → bouillon de légumes + vinaigre blanc
    - cognac → jus de pomme + extrait de vanille
```

#### 3.3 Ajustement des Portions
```typescript
interface RecipeScaler {
  scaleRecipe(recipe: Recipe, newServings: number): Promise<ScaledRecipe>
  adjustCookingTimes(originalTime: number, scaleFactor: number): number
  handleSpecialIngredients(ingredient: Ingredient, scaleFactor: number): ScaledIngredient
}

// Logique d'ajustement intelligent
function scaleIngredient(ingredient: Ingredient, scaleFactor: number): ScaledIngredient {
  const baseQuantity = ingredient.quantity * scaleFactor;
  
  // Cas spéciaux
  switch (ingredient.type) {
    case 'spice':
      // Les épices ne s'ajustent pas linéairement
      return {
        ...ingredient,
        quantity: Math.max(baseQuantity * 0.8, ingredient.quantity * 0.5)
      };
    
    case 'salt':
      // Le sel doit être ajusté prudemment
      return {
        ...ingredient,
        quantity: baseQuantity * 0.9
      };
    
    case 'leavening': // levure, bicarbonate
      // Agents levants : ajustement délicat
      if (scaleFactor <= 2) return { ...ingredient, quantity: baseQuantity };
      return { ...ingredient, quantity: baseQuantity * 0.85 };
    
    default:
      return { ...ingredient, quantity: baseQuantity };
  }
}
```

### 4. LISTE DE COURSES INTELLIGENTE

#### 4.1 Génération Automatique
```typescript
interface ShoppingListGenerator {
  generateFromRecipes(recipes: Recipe[]): Promise<ShoppingList>
  optimizeByStore(list: ShoppingList, storeLayout?: StoreLayout): Promise<OptimizedShoppingList>
  groupByCategory(items: ShoppingItem[]): CategorizedShoppingList
  estimateTotalCost(list: ShoppingList): Promise<CostEstimate>
}

// Exemple de génération intelligente
async function generateSmartShoppingList(selectedRecipes: Recipe[]): Promise<ShoppingList> {
  const list: ShoppingList = {
    id: generateId(),
    createdAt: new Date(),
    recipes: selectedRecipes,
    items: [],
    estimatedCost: 0,
    categories: []
  };
  
  // 1. Consolidation des ingrédients
  const consolidatedIngredients = await consolidateIngredients(selectedRecipes);
  
  // 2. Soustraction de l'inventaire disponible
  const missingIngredients = await subtractInventory(consolidatedIngredients);
  
  // 3. Groupement par catégories de magasin
  const categorizedItems = groupByStoreCategories(missingIngredients);
  
  // 4. Optimisation parcours magasin
  const optimizedItems = await optimizeForStoreLayout(categorizedItems);
  
  // 5. Estimation prix
  list.estimatedCost = await estimateShoppingCost(optimizedItems);
  
  list.items = optimizedItems;
  return list;
}
```

#### 4.2 Catégories Magasin Optimisées
```yaml
Parcours Magasin Logique:
  1. Fruits & Légumes:
     - Frais, surgelés, conserves
  
  2. Boucherie/Poissonnerie:
     - Viandes fraîches, charcuterie
     - Poissons, fruits de mer
  
  3. Produits Laitiers:
     - Lait, yaourts, fromages
     - Beurre, crème, œufs
  
  4. Épicerie Salée:
     - Pâtes, riz, légumineuses
     - Conserves, sauces, épices
  
  5. Épicerie Sucrée:
     - Sucre, farine, levure
     - Chocolat, confitures
  
  6. Boissons:
     - Alcools, sodas, jus
  
  7. Produits d'Entretien:
     - Si nécessaire pour recettes spéciales
```

### 5. DÉCOUVERTE ET RECOMMANDATIONS

#### 5.1 Moteur de Recommandations
```typescript
interface RecipeRecommendationEngine {
  recommendBasedOnInventory(inventory: Inventory[]): Promise<Recipe[]>
  recommendBasedOnHistory(userHistory: UserCookingHistory): Promise<Recipe[]>
  recommendSeasonal(currentSeason: Season): Promise<Recipe[]>
  recommendByMissingIngredients(maxMissing: number): Promise<Recipe[]>
}

// Algorithme de recommandation intelligent
async function getPersonalizedRecommendations(user: User): Promise<RecommendationSet> {
  const recommendations: RecommendationSet = {
    quickToMake: [], // avec inventaire actuel
    seasonal: [],   // de saison
    trending: [],   // populaires communauté
    healthy: [],    // équilibrées
    budget: []      // économiques
  };
  
  // 1. Analyse inventaire pour recettes faisables
  const inventoryRecipes = await findRecipesWithInventory(user.inventory, { maxMissing: 2 });
  recommendations.quickToMake = inventoryRecipes.slice(0, 5);
  
  // 2. Recettes de saison
  const currentSeason = getCurrentSeason();
  recommendations.seasonal = await getSeasonalRecipes(currentSeason, user.preferences);
  
  // 3. Recettes tendances (basé sur usage communauté)
  recommendations.trending = await getTrendingRecipes(user.cuisinePreferences);
  
  // 4. Recettes saines (basé sur profil nutritionnel)
  recommendations.healthy = await getHealthyRecipes(user.dietaryRestrictions);
  
  // 5. Recettes économiques
  recommendations.budget = await getBudgetFriendlyRecipes(user.averageBudget);
  
  return recommendations;
}
```

#### 5.2 Filtres et Recherche Avancée
```yaml
Filtres Disponibles:
  Temps:
    - Préparation: < 15min, 15-30min, 30-60min, > 1h
    - Cuisson: Aucune, < 30min, 30-60min, > 1h
  
  Difficulté:
    - Très facile (1⭐)
    - Facile (2⭐)
    - Intermédiaire (3⭐)
    - Difficile (4⭐)
    - Expert (5⭐)
  
  Inventaire:
    - Avec mes ingrédients seulement
    - Max 1-2-3 ingrédients manquants
    - Peu importe
  
  Régime:
    - Végétarien, Végan, Sans gluten
    - Keto, Paleo, Méditerranéen
    - Sans lactose, Sans noix
  
  Type de Repas:
    - Petit-déjeuner, Déjeuner, Dîner
    - Apéritif, Dessert, Boisson
    - Batch cooking, Meal prep
  
  Équipement:
    - Four uniquement
    - Plaques de cuisson
    - Micro-ondes
    - Équipement spécialisé (blender, robot...)
```

### 6. INTÉGRATIONS EXTERNES

#### 6.1 APIs Alimentaires
```typescript
interface ExternalFoodAPIs {
  // Base de données nutritionnelles
  openFoodFacts: OpenFoodFactsAPI;
  usda: USDANutritionAPI;
  
  // Prix et disponibilité
  coursesU: CoursesUAPI;        // France
  instacart: InstacartAPI;      // US/Canada
  
  // Recettes externes
  spoonacular: SpoonacularAPI;
  edamam: EdamamRecipeAPI;
}

// Integration OpenFoodFacts pour données nutritionnelles
async function enrichIngredientData(ingredient: Ingredient): Promise<EnrichedIngredient> {
  try {
    const nutritionData = await openFoodFacts.getProductByName(ingredient.name);
    
    return {
      ...ingredient,
      nutrition: {
        calories: nutritionData.nutriments['energy-kcal_100g'],
        protein: nutritionData.nutriments.proteins_100g,
        carbs: nutritionData.nutriments.carbohydrates_100g,
        fat: nutritionData.nutriments.fat_100g,
        fiber: nutritionData.nutriments.fiber_100g
      },
      allergens: nutritionData.allergens_tags,
      labels: nutritionData.labels_tags // bio, vegan, etc.
    };
  } catch (error) {
    console.warn(`Could not enrich ingredient ${ingredient.name}:`, error);
    return ingredient;
  }
}
```

#### 6.2 Partage et Communauté
```yaml
Fonctionnalités Sociales:
  Partage:
    - Export PDF élégant de la recette
    - Lien de partage avec preview
    - Partage direct réseaux sociaux
    - Email/SMS de la recette + liste courses
  
  Import Communauté:
    - QR Code pour partage rapide entre utilisateurs
    - Collection partagée famille/amis
    - Import depuis URL partagée
  
  Évaluations:
    - Note 1-5 étoiles
    - Commentaires et modifications suggérées
    - Photos du résultat
    - Étiquettes: "facile", "délicieux", "économique"
```

---

## 🏗️ ARCHITECTURE TECHNIQUE

### 1. STACK TECHNOLOGIQUE

#### Frontend (Mobile-First PWA)
```yaml
Framework: React + TypeScript + Tailwind CSS
State Management: Zustand + React Query
UI Components: 
  - Headless UI + Radix UI
  - React Hook Form pour formulaires
  - React Dropzone pour uploads
Camera/Scanner: 
  - @zxing/library (codes-barres)
  - react-webcam (photos)
  - html5-qrcode (QR codes)
```

#### Backend & APIs
```yaml
Database: Supabase PostgreSQL
Storage: Supabase Storage (photos recettes + scans livres)
Authentication: Supabase Auth
Real-time: Supabase Realtime (sync liste courses famille)

External APIs:
  - OpenAI/Claude (parsing recettes, substitutions)
  - Google Vision API (OCR livres de recettes)
  - OpenFoodFacts (données nutritionnelles)
  - Web scraping APIs (recettes sites tiers)
```

#### Services Spécialisés
```yaml
Recipe Parser Service:
  - URL parsing (structured data + fallback)
  - Social media parsing (Instagram, TikTok)
  - OCR + AI text structuring

Translation Service:
  - Google Translate API
  - DeepL API (meilleure qualité)
  - Correction contexte culinaire

Matching Engine:
  - Fuzzy string matching (ingrédients)
  - Substitution algorithms
  - Inventory analysis
```

### 2. SCHÉMA BASE DE DONNÉES

```sql
-- Table des recettes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  source_type recipe_source_type NOT NULL, -- 'manual', 'url', 'social', 'scan'
  source_url TEXT,
  cuisine_category VARCHAR(100),
  meal_type meal_type_enum,
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  rest_time INTEGER,
  servings INTEGER DEFAULT 4,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  instructions JSONB NOT NULL, -- array of steps
  tags TEXT[], -- ['quick', 'healthy', 'vegetarian']
  nutrition_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  rating DECIMAL(2,1),
  rating_count INTEGER DEFAULT 0
);

-- Table des ingrédients de recettes
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  is_essential BOOLEAN DEFAULT TRUE,
  notes TEXT,
  order_index INTEGER,
  
  -- Mapping avec inventaire
  inventory_product_id UUID REFERENCES products(id),
  
  -- Données nutritionnelles enrichies
  calories_per_unit DECIMAL(10,2),
  nutrition_data JSONB
);

-- Table des collections de recettes
CREATE TABLE recipe_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table de liaison collections-recettes
CREATE TABLE collection_recipes (
  collection_id UUID REFERENCES recipe_collections(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (collection_id, recipe_id)
);

-- Table des évaluations et commentaires
CREATE TABLE recipe_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos TEXT[], -- URLs des photos du résultat
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);

-- Table des substitutions d'ingrédients
CREATE TABLE ingredient_substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_ingredient VARCHAR(255),
  substitute_ingredient VARCHAR(255),
  ratio DECIMAL(4,2) DEFAULT 1.0, -- ratio de substitution
  recipe_type VARCHAR(100), -- 'baking', 'cooking', 'all'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Types énumérés
CREATE TYPE recipe_source_type AS ENUM ('manual', 'url', 'social', 'book_scan');
CREATE TYPE meal_type_enum AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink', 'appetizer');
```

### 3. SERVICES ARCHITECTURE

```typescript
// Service de parsing multi-sources
class RecipeParsingService {
  async parseFromURL(url: string): Promise<ParsedRecipe> {
    const domain = new URL(url).hostname;
    
    switch (domain) {
      case 'marmiton.org':
        return this.parseMarmiton(url);
      case '750g.com':
        return this.parse750g(url);
      case 'instagram.com':
        return this.parseInstagram(url);
      default:
        return this.parseGenericWebsite(url);
    }
  }
  
  async parseFromBookScan(imageFile: File): Promise<ParsedRecipe> {
    // 1. OCR extraction
    const extractedText = await this.ocrService.extractText(imageFile);
    
    // 2. AI-powered structuring
    const structuredData = await this.aiService.structureRecipeText(extractedText);
    
    // 3. Translation si nécessaire
    if (structuredData.detectedLanguage !== 'fr') {
      structuredData.ingredients = await this.translationService.translateIngredients(
        structuredData.ingredients,
        structuredData.detectedLanguage,
        'fr'
      );
      structuredData.instructions = await this.translationService.translateInstructions(
        structuredData.instructions,
        structuredData.detectedLanguage,
        'fr'
      );
    }
    
    return structuredData;
  }
}

// Service de matching inventaire
class InventoryMatchingService {
  async analyzeRecipeRequirements(recipeId: string, userId: string): Promise<RecipeAnalysis> {
    const recipe = await this.getRecipe(recipeId);
    const inventory = await this.getInventory(userId);
    
    const analysis: RecipeAnalysis = {
      canMake: false,
      confidence: 0,
      availableIngredients: [],
      missingIngredients: [],
      possibleSubstitutions: [],
      estimatedCost: 0
    };
    
    for (const ingredient of recipe.ingredients) {
      const match = await this.findInventoryMatch(ingredient, inventory);
      
      if (match.type === 'exact' || match.type === 'fuzzy') {
        analysis.availableIngredients.push(match);
      } else {
        const substitution = await this.findSubstitution(ingredient, inventory);
        if (substitution) {
          analysis.possibleSubstitutions.push(substitution);
        } else {
          analysis.missingIngredients.push({
            ingredient,
            estimatedPrice: await this.getPriceEstimate(ingredient)
          });
        }
      }
    }
    
    analysis.canMake = analysis.missingIngredients.length === 0 || 
                     (analysis.missingIngredients.length <= 2 && analysis.possibleSubstitutions.length > 0);
    
    analysis.confidence = this.calculateConfidenceScore(analysis);
    analysis.estimatedCost = analysis.missingIngredients.reduce((sum, item) => sum + item.estimatedPrice, 0);
    
    return analysis;
  }
}

// Service de génération listes de courses
class ShoppingListService {
  async generateFromRecipes(recipeIds: string[], userId: string): Promise<ShoppingList> {
    const recipes = await this.getRecipes(recipeIds);
    const inventory = await this.getInventory(userId);
    
    // 1. Consolidation des ingrédients
    const consolidatedIngredients = this.consolidateIngredients(recipes);
    
    // 2. Soustraction inventaire disponible
    const missingIngredients = await this.subtractAvailableInventory(consolidatedIngredients, inventory);
    
    // 3. Regroupement par catégories magasin
    const categorizedList = this.categorizeByStoreSection(missingIngredients);
    
    // 4. Estimation prix total
    const estimatedCost = await this.estimateTotalCost(categorizedList);
    
    return {
      id: uuidv4(),
      userId,
      recipes,
      items: categorizedList,
      estimatedCost,
      createdAt: new Date(),
      status: 'active'
    };
  }
}
```

---

## 🎨 DESIGN & UX

### 1. INTERFACE UTILISATEUR

#### Page Principale Recettes
```yaml
Layout Mobile-First:
  Header:
    - Titre "Mes Recettes"
    - Bouton recherche (loupe)
    - Bouton filtres
    - Bouton ajout (+) floating
  
  Content:
    - Suggestions personnalisées (carrousel horizontal)
    - Sections:
      * "Rapides à faire" (avec inventaire actuel)
      * "De saison" 
      * "Favorites"
      * "Récemment ajoutées"
    - Grille de recettes (2 colonnes mobile, 3+ desktop)
  
  Navigation:
    - Tab bar: Inventaire | Recettes | Courses | Profil
```

#### Card Recette
```yaml
Design Card:
  Image:
    - Photo recette (ratio 16:9)
    - Badge cuisine (coin supérieur droit)
    - Overlay gradient bottom pour texte
  
  Content:
    - Titre recette (2 lignes max)
    - Temps total + difficulté (icônes)
    - Nombre portions
    - Status inventaire:
      * 🟢 "Tous ingrédients disponibles"
      * 🟡 "2 ingrédients manquants"
      * 🔴 "5+ ingrédients manquants"
  
  Actions:
    - Heart (favoris)
    - Share
    - Quick action: "Ajouter à liste courses"
```

#### Formulaire Ajout Recette
```yaml
Steps Wizard:
  Step 1 - Source:
    - Tabs: Manuel | URL | Réseaux sociaux | Scanner livre
    - Input adapté au type choisi
  
  Step 2 - Infos générales:
    - Nom + photo
    - Cuisine + temps + difficulté
    - Portions
  
  Step 3 - Ingrédients:
    - Liste dynamique avec autocomplete
    - Quantité + unité + essentiel/optionnel
    - Suggestions basées sur inventaire
  
  Step 4 - Instructions:
    - Steps numérotés
    - Rich text editor simple
    - Possibilité d'ajouter photos par étape
  
  Step 5 - Validation:
    - Preview complet
    - Analyse inventaire automatique
    - Bouton "Sauvegarder"
```

### 2. EXPÉRIENCE UTILISATEUR

#### Onboarding Recettes
```yaml
Première Utilisation:
  1. "Bienvenue dans votre carnet de recettes intelligent"
  2. "Ajoutons votre première recette"
  3. Choix guidé: "URL d'une recette favorite"
  4. Démonstration parsing automatique
  5. "Voyez quels ingrédients vous avez déjà !"
  6. Analyse inventaire en temps réel
```

#### Micro-interactions
```yaml
Feedback Visuel:
  - Parsing URL: Animation loading + progress
  - Match inventaire: Fade-in des ingrédients disponibles
  - Ajout favori: Animation cœur
  - Scanner livre: Overlay guide cadrage + feedback scan réussi
  - Génération liste courses: Animation création avec compteur
```

#### Notifications Intelligentes
```yaml
Push Notifications:
  - "3 nouvelles recettes avec vos ingrédients disponibles"
  - "Vos tomates expirent demain, voici 2 recettes rapides"
  - "Recette de saison: Tarte aux pommes d'automne"
  - "Votre liste de courses pour le dîner de ce soir est prête"

In-App Notifications:
  - Badge nombre nouvelles recettes suggérées
  - Alert ingrédients bientôt périmés + recettes
  - Rappel courses planifiées
```

---

## 🧪 TESTS & VALIDATION

### 1. TESTS FONCTIONNELS

#### Parsing Multi-Sources
```yaml
Test Cases URL Parsing:
  - Marmiton.org (structure standard)
  - 750g.com (JSON-LD structured data)
  - Blog culinaire (fallback parsing)
  - Instagram post (description parsing)
  - URL invalide (error handling)

Test Cases Book Scanning:
  - Page livre français standard
  - Page livre anglais (avec traduction)
  - Page avec photos + texte
  - Page manuscrite (OCR difficile)
  - Mauvaise qualité image
```

#### Matching Inventaire
```yaml
Test Scenarios:
  - Recette 100% disponible
  - Recette avec 1-2 ingrédients manquants
  - Recette impossible (trop d'ingrédients manquants)
  - Fuzzy matching ("pomme" vs "pommes")
  - Substitutions possibles
  - Quantités insuffisantes
```

### 2. TESTS PERFORMANCE

```yaml
Performance Targets:
  - Parsing URL: < 3 secondes
  - OCR Book scan: < 5 secondes
  - Analyse inventaire: < 1 seconde
  - Génération liste courses: < 2 secondes
  - Search recettes: < 500ms
  - Load page recettes: < 2 secondes

Load Testing:
  - 1000 recettes utilisateur
  - 500 ingrédients inventaire
  - Parsing simultané 10 URLs
  - Génération 5 listes courses simultanées
```

### 3. TESTS USABILITÉ

```yaml
User Testing Scenarios:
  1. Ajout première recette (URL Marmiton)
  2. Scan page livre de recettes
  3. Recherche recette avec inventaire
  4. Génération liste courses pour 3 recettes
  5. Modification recette existante
  6. Partage recette avec ami

Success Metrics:
  - Time to add recipe: < 2 minutes
  - Success rate URL parsing: > 90%
  - OCR accuracy: > 85%
  - User satisfaction: > 4.5/5
```

---

## 📈 ROADMAP & ÉVOLUTIONS

### Phase 1: MVP (4-6 semaines)
```yaml
Features Core:
  ✅ Ajout manuel recettes
  ✅ Import URL sites populaires (Marmiton, 750g)
  ✅ Analyse basique inventaire vs recettes
  ✅ Génération liste courses simple
  ✅ Recherche et filtres basiques
  ✅ Interface mobile responsive
```

### Phase 2: Intelligence (2-3 semaines)
```yaml
Features Avancées:
  ✅ OCR scanner livres de recettes
  ✅ Traduction automatique (anglais → français)
  ✅ Parsing réseaux sociaux (Instagram, TikTok)
  ✅ Substitutions intelligentes
  ✅ Recommandations personnalisées
  ✅ Collections de recettes
```

### Phase 3: Social & Premium (3-4 semaines)
```yaml
Features Communauté:
  ✅ Évaluations et commentaires
  ✅ Partage recettes
  ✅ Import communauté
  ✅ Profils nutrition avancés
  ✅ Planning repas intelligent
  ✅ Intégrations APIs externes (prix, nutrition)
```

### Phase 4: IA Avancée (Future)
```yaml
Features IA:
  - Génération recettes par IA (basé inventaire)
  - Reconnaissance photo plats → recette
  - Chatbot culinaire intelligent
  - Prédiction goûts utilisateur
  - Optimisation nutrition automatique
  - Assistant vocal complet
```

---

## 💰 MODÈLE ÉCONOMIQUE

### Version Gratuite
```yaml
Limitations:
  - 50 recettes max
  - Parsing URL: 10/mois
  - OCR livres: 5 scans/mois
  - Pas d'export PDF
  - Pas d'intégrations avancées
```

### Version Premium (9.99€/mois)
```yaml
Features Illimitées:
  - Recettes illimitées
  - Parsing URL illimité
  - OCR livres illimité
  - Export PDF professionnel
  - Collections partagées
  - Intégrations APIs premium
  - Support prioritaire
  - Analytics avancées
```

---

## 🚀 IMPLÉMENTATION PRIORITAIRE

### Ordre de Développement Recommandé
1. **Base données + CRUD recettes** (1 semaine)
2. **Interface ajout manuel** (1 semaine)  
3. **Parsing URL basique** (1 semaine)
4. **Analyse inventaire simple** (1 semaine)
5. **Génération liste courses** (1 semaine)
6. **OCR scanner livres** (2 semaines)
7. **Parsing réseaux sociaux** (1 semaine)
8. **Recommandations + filtres** (1 semaine)

### Quick Wins Immédiats
- Interface ajout manuel (impact UX fort)
- Parsing Marmiton (source populaire France)
- Analyse inventaire basique (valeur unique)
- Export liste courses (utilité immédiate)

Ce PRP couvre tous les aspects du module recettes intelligent pour votre Smart Pantry, avec une approche progressive et des fonctionnalités différenciatrices comme l'OCR de livres et l'analyse intelligente d'inventaire ! 🍳✨