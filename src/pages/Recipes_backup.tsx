import { useState, useEffect } from "react";
import { MaterialButton } from "@/components/ui/material/Button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter,
  ChefHat,
  Clock,
  TrendingUp,
  Heart,
  Grid3X3,
  List,
  SlidersHorizontal,
  Video,
  Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRecipes, Recipe } from "@/hooks/useRecipes";
import { useRecipeInventoryAnalysis, useMultipleRecipeAnalysis, cleanupAllOrphanedCacheEntries } from "@/hooks/useRecipeInventoryAnalysis";
import { supabase } from "@/integrations/supabase/client";
import RecipeCard from "@/components/recipes/RecipeCard";
import AddRecipeDialog from "@/components/recipes/AddRecipeDialog";
import { SocialImportCard } from "@/components/social/SocialImportCard";
import { InstagramVideoExtractor } from "@/components/recipes/InstagramVideoExtractor";
import { ExtractedRecipeModal } from "@/components/recipes/ExtractedRecipeModal";
import { MaterialCard, MaterialCardContent } from "@/components/ui/material/Card";
import { useNavigate } from "react-router-dom";

// Filters interface (pattern Cipher)
interface RecipeFilters {
  search: string;
  cuisine: string;
  mealType: string;
  difficulty: string;
  inventoryStatus: string;
  maxTime: string;
}

const CUISINE_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "Française", label: "Française" },
  { value: "Italienne", label: "Italienne" },
  { value: "Asiatique", label: "Asiatique" },
  { value: "Méditerranéenne", label: "Méditerranéenne" },
  { value: "Végétarienne", label: "Végétarienne" },
  { value: "Végan", label: "Végan" },
];

const Recipes = () => {
  const navigate = useNavigate();
  
  // State management (pattern useInventory Cipher)
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showSocialImport, setShowSocialImport] = useState(false);
  const [showVideoImport, setShowVideoImport] = useState(false);
  const [showVideoExtractor, setShowVideoExtractor] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<any>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [filters, setFilters] = useState<RecipeFilters>({
    search: "",
    cuisine: "all",
    mealType: "all",
    difficulty: "all",
    inventoryStatus: "all",
    maxTime: "all"
  });

  // Hooks (pattern Cipher)
  const {
    recipes,
    loading,
    addRecipeWithIngredients,
    deleteRecipe,
    totalRecipes,
    publicRecipes,
    privateRecipes
  } = useRecipes();

  // Analyse inventaire pour toutes les recettes (pattern Cipher intelligence)
  const recipeIds = recipes.map(r => r.id);
  const { analyses: inventoryAnalyses, loading: analysesLoading } = useMultipleRecipeAnalysis(recipeIds);

  // Filtered recipes (pattern Cipher)
  const filteredRecipes = recipes.filter(recipe => {
    // Search filter
    if (filters.search && !recipe.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !recipe.description?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Cuisine filter
    if (filters.cuisine !== "all" && recipe.cuisine_category !== filters.cuisine) {
      return false;
    }

    // Meal type filter
    if (filters.mealType !== "all" && recipe.meal_type !== filters.mealType) {
      return false;
    }

    // Difficulty filter
    if (filters.difficulty !== "all") {
      const difficultyNum = parseInt(filters.difficulty);
      if (recipe.difficulty !== difficultyNum) {
        return false;
      }
    }

    // Time filter
    if (filters.maxTime !== "all") {
      const maxTime = parseInt(filters.maxTime);
      const totalTime = recipe.prep_time + recipe.cook_time;
      if (totalTime > maxTime) {
        return false;
      }
    }

    // Inventory status filter (pattern Cipher intelligence)
    if (filters.inventoryStatus !== "all") {
      const analysis = inventoryAnalyses[recipe.id];
      if (!analysis) return filters.inventoryStatus === "unknown";
      
      switch (filters.inventoryStatus) {
        case "available":
          return analysis.canMake;
        case "partial":
          return !analysis.canMake && analysis.missingIngredients.length <= 2;
        case "missing":
          return !analysis.canMake && analysis.missingIngredients.length > 2;
        default:
          return true;
      }
    }

    return true;
  });

  // Handlers (pattern Cipher)
  const handleRecipeAdded = async (recipeData: any) => {
    try {
      const { ingredients, ...recipe } = recipeData;
      
      // Mapper les ingrédients de 'name' vers 'ingredient_name'
      const mappedIngredients = ingredients.map((ing: any) => ({
        ingredient_name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        is_essential: ing.is_essential,
        notes: ing.notes
      }));
      
      await addRecipeWithIngredients(recipe, mappedIngredients);
      
      toast({
        title: "Recette ajoutée !",
        description: `${recipe.name} a été ajoutée à votre collection`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la recette",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await deleteRecipe(id);
      toast({
        title: "Recette supprimée",
        description: "La recette a été supprimée de votre collection",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la recette",
        variant: "destructive"
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      cuisine: "all",
      mealType: "all", 
      difficulty: "all",
      inventoryStatus: "all",
      maxTime: "all"
    });
  };

  // Nettoyage automatique des entrées orphelines au démarrage
  useEffect(() => {
    const cleanupOnMount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await cleanupAllOrphanedCacheEntries(user.id);
        }
      } catch (error) {
        console.warn('Initial cleanup failed:', error);
      }
    };

    cleanupOnMount();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header avec stats (pattern Cipher) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mes Recettes</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span>{totalRecipes} recettes</span>
            <span>•</span>
            <span>{privateRecipes} privées</span>
            <span>•</span>
            <span>{publicRecipes} publiques</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border p-1">
            <MaterialButton
              variant={viewMode === 'grid' ? 'filled' : 'text'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8"
              icon={<Grid3X3 className="h-4 w-4" />}
            />
            <MaterialButton
              variant={viewMode === 'list' ? 'filled' : 'text'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8"
              icon={<List className="h-4 w-4" />}
            />
          </div>

          <MaterialButton
            variant={showVideoExtractor ? "filled" : "outlined"}
            onClick={() => {
              setShowVideoExtractor(!showVideoExtractor);
              setShowSocialImport(false);
            }}
            className={showVideoExtractor ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600" : ""}
          >
            <Video className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Import Vidéo IA</span>
            {showVideoExtractor && <Sparkles className="w-3 h-3 ml-1 text-yellow-300" />}
          </MaterialButton>

          <MaterialButton
            variant={showSocialImport ? "filled" : "outlined"}
            onClick={() => {
              setShowSocialImport(!showSocialImport);
              setShowVideoExtractor(false);
            }}
          >
            <ChefHat className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Import URL</span>
          </MaterialButton>
          
          <MaterialButton onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </MaterialButton>
        </div>
      </div>

      {/* Search & Filters (pattern Cipher) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des recettes..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>
          
          <MaterialButton
            variant="outlined"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filtres
            {(filters.cuisine !== "all" || filters.inventoryStatus !== "all" || filters.maxTime !== "all") && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {[filters.cuisine, filters.inventoryStatus, filters.maxTime].filter(f => f !== "all").length}
              </Badge>
            )}
          </MaterialButton>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
            <div>
              <label className="text-sm font-medium mb-2 block">Cuisine</label>
              <Select value={filters.cuisine} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, cuisine: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUISINE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Inventaire</label>
              <Select value={filters.inventoryStatus} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, inventoryStatus: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="available">🟢 Faisables</SelectItem>
                  <SelectItem value="partial">🟡 Partielles</SelectItem>
                  <SelectItem value="missing">🔴 Impossibles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Temps max</label>
              <Select value={filters.maxTime} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, maxTime: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Peu importe</SelectItem>
                  <SelectItem value="15">&lt; 15 min</SelectItem>
                  <SelectItem value="30">&lt; 30 min</SelectItem>
                  <SelectItem value="60">&lt; 1h</SelectItem>
                  <SelectItem value="120">&lt; 2h</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <MaterialButton variant="outlined" onClick={resetFilters} className="w-full">
                Réinitialiser
              </MaterialButton>
            </div>
          </div>
        )}
      </div>

      {/* Quick stats chips (pattern Cipher) */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="cursor-pointer" onClick={() => 
          setFilters(prev => ({ ...prev, inventoryStatus: "available" }))
        }>
          🟢 {recipes.filter(r => inventoryAnalyses[r.id]?.canMake).length} faisables
        </Badge>
        <Badge variant="outline" className="cursor-pointer" onClick={() => 
          setFilters(prev => ({ ...prev, maxTime: "30" }))
        }>
          ⚡ {recipes.filter(r => r.prep_time + r.cook_time <= 30).length} rapides
        </Badge>
        <Badge variant="outline" className="cursor-pointer" onClick={() => 
          setFilters(prev => ({ ...prev, cuisine: "Végétarienne" }))
        }>
          🌱 {recipes.filter(r => r.cuisine_category === "Végétarienne").length} végé
        </Badge>
      </div>

      {/* Video Extractor Section */}
      {showVideoExtractor && (
        <MaterialCard variant="elevated" className="mb-4">
          <MaterialCardContent className="p-4">
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Import Vidéo avec IA (Deepgram + GPT-4)
              </h3>
              <MaterialButton
                variant="text"
                size="sm"
                onClick={() => setShowVideoExtractor(false)}
              >
                ✕
              </MaterialButton>
            </div>
            
            <InstagramVideoExtractor 
              onRecipeExtracted={(recipe, sourceUrl) => {
                console.log("🎥 Recette extraite de vidéo Instagram:", recipe);
                console.log("🔗 URL source:", sourceUrl);
                
                // Stocker la recette extraite avec l'URL source et ouvrir la modal
                setExtractedRecipe({ ...recipe, sourceUrl });
                setShowRecipeModal(true);
                
                toast({
                  title: "🎥 Recette extraite avec succès !",
                  description: `"${recipe.title}" a été analysée. Vérifiez les détails avant de l'enregistrer.`
                });
              }}
              onError={(error) => {
                toast({
                  title: "Erreur d'extraction",
                  description: error.message,
                  variant: "destructive"
                });
              }}
            />
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>✨ Extraction intelligente avec transcription audio Deepgram</p>
              <p>🤖 Analyse et structuration des recettes avec GPT-4</p>
              <p>📱 Supporte Instagram, TikTok et YouTube</p>
            </div>
            </div>
          </MaterialCardContent>
        </MaterialCard>
      )}

      {/* Social Import Section */}
      {showSocialImport && (
        <MaterialCard variant="elevated" className="mb-4">
          <MaterialCardContent className="p-4">
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Import depuis une URL
              </h3>
              <MaterialButton
                variant="text"
                size="sm"
                onClick={() => setShowSocialImport(false)}
              >
                ✕
              </MaterialButton>
            </div>
            
            <SocialImportCard 
              variant="default"
              onImport={async (recipe) => {
                console.log("🎯 Import de recette:", recipe);
                
                try {
                  // Convertir le format ImportedRecipe vers le format attendu par addRecipeWithIngredients
                  const recipeData = {
                    name: recipe.title,
                    description: recipe.author ? `Recette de ${recipe.author}` : '',
                    cuisine_category: 'Autre',
                    meal_type: 'main',
                    prep_time: parseInt(recipe.prepTime || '15'),
                    cook_time: parseInt(recipe.prepTime || '30'), 
                    servings: recipe.servings || 4,
                    difficulty: 3,
                    tags: recipe.tags || [],
                    is_public: false,
                    image_url: recipe.imageUrl,
                    ingredients: recipe.ingredients.map((ing, index) => ({
                      ingredient_name: ing,
                      quantity: 1,
                      unit: '',
                      order_index: index,
                      is_essential: true
                    })),
                    instructions: recipe.instructions.join('\n')
                  };
                  
                  console.log("📝 Données formatées:", recipeData);
                  
                  await addRecipeWithIngredients(recipeData);
                  
                  toast({
                    title: "✅ Recette importée !",
                    description: `"${recipe.title}" a été ajoutée à votre collection.`
                  });
                  
                  setShowSocialImport(false);
                  
                  // Rafraîchir la liste des recettes
                  window.location.reload();
                  
                } catch (error) {
                  console.error("❌ Erreur lors de l'import:", error);
                  toast({
                    title: "Erreur d'import",
                    description: "Impossible d'ajouter la recette. Veuillez réessayer.",
                    variant: "destructive"
                  });
                }
              }}
            />
            
            <div className="text-sm text-muted-foreground">
              <p>💡 Pour importer depuis une vidéo Instagram/TikTok avec l'IA (Deepgram + GPT), utilisez le bouton "Import Vidéo IA" ci-dessus.</p>
            </div>
            </div>
          </MaterialCardContent>
        </MaterialCard>
      )}

      {/* Results count */}
      {filteredRecipes.length !== recipes.length && (
        <div className="text-sm text-muted-foreground">
          {filteredRecipes.length} résultat{filteredRecipes.length > 1 ? 's' : ''} sur {recipes.length} recettes
        </div>
      )}

      {/* Recipes grid/list (pattern Cipher) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {recipes.length === 0 ? "Aucune recette" : "Aucun résultat"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {recipes.length === 0 
              ? "Commencez par ajouter votre première recette !" 
              : "Essayez de modifier vos filtres de recherche."}
          </p>
          {recipes.length === 0 && (
            <MaterialButton onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter ma première recette
            </MaterialButton>
          )}
        </div>
      ) : (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              inventoryAnalysis={inventoryAnalyses[recipe.id] ? {
                canMake: inventoryAnalyses[recipe.id].canMake,
                confidence: inventoryAnalyses[recipe.id].confidence,
                availableIngredients: inventoryAnalyses[recipe.id].availableIngredients.length,
                missingIngredients: inventoryAnalyses[recipe.id].missingIngredients.length,
                estimatedCost: inventoryAnalyses[recipe.id].estimatedCost,
                totalRecipeCost: inventoryAnalyses[recipe.id].totalRecipeCost
              } : undefined}
              onEdit={(recipe) => {
                // TODO: Implement edit functionality
                console.log('Edit recipe:', recipe);
              }}
              onDelete={handleDeleteRecipe}
              onAddToShoppingList={(recipe) => {
                // TODO: Implement shopping list generation
                console.log('Add to shopping list:', recipe);
                toast({
                  title: "Liste de courses",
                  description: "Fonctionnalité bientôt disponible !",
                });
              }}
              onToggleFavorite={(id) => {
                // TODO: Implement favorites
                console.log('Toggle favorite:', id);
                toast({
                  title: "Favoris",
                  description: "Fonctionnalité bientôt disponible !",
                });
              }}
              onShare={(recipe) => {
                // TODO: Implement sharing
                console.log('Share recipe:', recipe);
                toast({
                  title: "Partage",
                  description: "Fonctionnalité bientôt disponible !",
                });
              }}
            />
          ))}
        </div>
      )}

      {/* Add Recipe Dialog */}
      <AddRecipeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onRecipeAdded={handleRecipeAdded}
      />

      {/* Extracted Recipe Modal */}
      <ExtractedRecipeModal
        open={showRecipeModal}
        onOpenChange={setShowRecipeModal}
        recipe={extractedRecipe}
        sourceUrl={extractedRecipe?.sourceUrl}
        saving={savingRecipe}
        onConfirm={async (editedRecipe) => {
          try {
            setSavingRecipe(true);
            console.log("💾 Sauvegarde de la recette éditée:", editedRecipe);
            
            // Séparer les ingrédients du reste de la recette
            const { ingredients, ...recipeData } = editedRecipe;
            
            // Ajouter l'URL source si elle existe
            if (extractedRecipe?.sourceUrl) {
              recipeData.source_url = extractedRecipe.sourceUrl;
              recipeData.source_type = 'instagram';
            }
            
            console.log("📝 Données de la recette:", recipeData);
            console.log("🥗 Ingrédients:", ingredients);
            
            // Appeler addRecipeWithIngredients avec les paramètres séparés
            await addRecipeWithIngredients(recipeData, ingredients);
            
            toast({
              title: "✅ Recette enregistrée !",
              description: `"${editedRecipe.name}" a été ajoutée à votre collection.`
            });
            
            // Fermer les modals et réinitialiser
            setShowRecipeModal(false);
            setShowVideoExtractor(false);
            setExtractedRecipe(null);
            
            // Rafraîchir la liste
            window.location.reload();
            
          } catch (error) {
            console.error("❌ Erreur lors de la sauvegarde:", error);
            toast({
              title: "Erreur de sauvegarde",
              description: "Impossible d'enregistrer la recette. Veuillez réessayer.",
              variant: "destructive"
            });
          } finally {
            setSavingRecipe(false);
          }
        }}
        onCancel={() => {
          setShowRecipeModal(false);
          setExtractedRecipe(null);
        }}
      />
    </div>
  );
};

export default Recipes;