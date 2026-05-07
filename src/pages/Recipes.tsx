/**
 * Page Recettes - Architecture "Spotify des recettes"
 * Système à onglets : Explorer (catalogue) + Mes Recettes (bibliothèque)
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  BookOpen, 
  Plus,
  Sparkles,
  Heart,
  Grid3X3,
  List,
  Filter,
  Star,
  TrendingUp,
  Clock,
  Users,
  ChefHat
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// Import des nouveaux hooks Spotify
import { 
  useRecipeCatalog, 
  useTrendingRecipes,
  formatCookingTime,
  DIFFICULTY_LABELS,
  type CatalogRecipe 
} from "@/hooks/useRecipeCatalog";
import { 
  useUserRecipes, 
  useIsRecipeInLibrary,
  getRecipeTitle,
  getRecipeImage,
  type UserRecipe 
} from "@/hooks/useUserRecipes";

// Import des anciens composants (compatibilité)
import AddRecipeDialog from "@/components/recipes/AddRecipeDialog";
import { InstagramVideoExtractor } from "@/components/recipes/InstagramVideoExtractor";
import { ExtractedRecipeModal } from "@/components/recipes/ExtractedRecipeModal";
import { SocialImportCard } from "@/components/social/SocialImportCard";
import { RecipeInbox } from "@/components/recipes/RecipeInbox";
import { useSocialRecipeImports } from "@/hooks/useSocialRecipeImports";
import { Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRecipes } from "@/hooks/useRecipes";

// Import des nouveaux composants
import RecipeOnboarding from "@/components/onboarding/RecipeOnboarding";
import CollectionsManager from "@/components/recipes/CollectionsManager";

export default function Recipes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'explore' | 'library' | 'inbox' | 'import'>('explore');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExtractedModal, setShowExtractedModal] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Hooks pour le catalogue et la bibliothèque
  const {
    recipes: catalogRecipes,
    totalCount: catalogCount,
    isLoading: catalogLoading,
    filters: catalogFilters,
    setFilters: setCatalogFilters,
    hasNextPage: catalogHasNext,
    fetchNextPage: catalogFetchNext
  } = useRecipeCatalog();

  const {
    recipes: userRecipes,
    isLoading: libraryLoading,
    addFromCatalog,
    isAddingFromCatalog
  } = useUserRecipes();
  
  // Hook pour ajouter des recettes depuis l'ancien système
  const { addRecipeWithIngredients, fetchRecipes } = useRecipes();

  // PRP-220.12: drive the Inbox tab badge from the imports list. We
  // already query for the count via the shared hook so React Query
  // dedupes against any other Inbox view that's mounted.
  const { pendingCount: inboxPendingCount } = useSocialRecipeImports();

  const { data: trendingRecipes } = useTrendingRecipes();

  // Vérifier si c'est un nouvel utilisateur pour l'onboarding
  useEffect(() => {
    // Désactiver l'onboarding automatique temporairement
    // if (userRecipes.length === 0 && !libraryLoading) {
    //   setShowOnboarding(true);
    // }
  }, [userRecipes, libraryLoading]);

  const handleAddToLibrary = (recipeId: string, recipeName: string) => {
    addFromCatalog(
      { catalogRecipeId: recipeId },
      {
        onSuccess: () => {
          toast({
            title: "Recette ajoutée !",
            description: `"${recipeName}" a été ajoutée à votre bibliothèque.`,
          });
        },
        onError: (error) => {
          toast({
            title: "Erreur",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-6">
        
        {/* Header principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <ChefHat className="h-8 w-8 text-orange-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Recettes
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Votre univers culinaire : explorez le catalogue ou gérez votre bibliothèque personnelle
          </p>
        </motion.div>

        {/* Navigation à onglets */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-14">
            <TabsTrigger value="explore" className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5" />
              Explorer
              <Badge variant="secondary" className="ml-1">
                {catalogCount.toLocaleString()}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="library" className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5" />
              Mes Recettes
              <Badge variant="secondary" className="ml-1">
                {userRecipes.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="inbox" className="flex items-center gap-2 text-base">
              <Inbox className="h-5 w-5" />
              Inbox
              {inboxPendingCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {inboxPendingCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="import" className="flex items-center gap-2 text-base">
              <Plus className="h-5 w-5" />
              Ajouter
            </TabsTrigger>
          </TabsList>

          {/* Onglet Explorer - Catalogue global */}
          <TabsContent value="explore" className="space-y-6">
            <ExploreTab
              recipes={catalogRecipes}
              totalCount={catalogCount}
              isLoading={catalogLoading}
              trendingRecipes={trendingRecipes}
              filters={catalogFilters}
              setFilters={setCatalogFilters}
              hasNextPage={catalogHasNext}
              fetchNextPage={catalogFetchNext}
              onAddToLibrary={handleAddToLibrary}
              isAdding={isAddingFromCatalog}
            />
          </TabsContent>

          {/* Onglet Mes Recettes - Bibliothèque personnelle */}
          <TabsContent value="library" className="space-y-6">
            <LibraryTab
              recipes={userRecipes}
              isLoading={libraryLoading}
              onShowOnboarding={() => setShowOnboarding(true)}
            />
          </TabsContent>

          {/* Onglet Inbox - Imports sociaux (PRP-220.12) */}
          <TabsContent value="inbox" className="space-y-6">
            <RecipeInbox
              onVerifyDraft={({ import: socialImport, draft }) => {
                // The "Vérifier" flow now resolves the actual current
                // draft via /api/imports/social/:id/current-draft. We
                // shape the legacy `extractedRecipe` payload from the
                // canonical ImportedRecipeDraft so the existing modal
                // (PRP-220.08 bridge) keeps working until the modal is
                // rewritten in PRP-220.16/220.17.
                if (!draft) return;
                const d = draft.draft_json;
                setExtractedRecipe({
                  title: d.title,
                  description: d.description ?? '',
                  ingredients: d.ingredients.map((i) => ({
                    name: i.name,
                    amount: i.quantity != null ? String(i.quantity) : '',
                    unit: i.unit ?? '',
                  })),
                  instructions: d.instructions.map((s) => ({
                    step: s.step,
                    description: s.description,
                  })),
                  metadata: {
                    confidence: d.confidence,
                    platform: d.source.platform,
                    extractionMethod: d.source.extractionMethod,
                    thumbnail: d.imageUrl ?? d.source.thumbnailUrl,
                    servings: d.servings,
                  },
                  sourceUrl: socialImport.source_url,
                  importId: socialImport.id,
                });
                setShowExtractedModal(true);
              }}
            />
          </TabsContent>

          {/* Onglet Import - Méthodes d'ajout */}
          <TabsContent value="import" className="space-y-6">
            <ImportTab
              onRecipeExtracted={(recipe, sourceUrl) => {
                setExtractedRecipe({ ...recipe, sourceUrl });
                setShowExtractedModal(true);
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Modales */}
        {showOnboarding && (
          <RecipeOnboarding
            isOpen={showOnboarding}
            onComplete={() => {
              setShowOnboarding(false);
              setActiveTab('library');
              toast({
                title: "🎉 Bienvenue !",
                description: "Votre bibliothèque de recettes est prête !",
              });
            }}
            onSkip={() => {
              setShowOnboarding(false);
              setActiveTab('explore');
            }}
          />
        )}

        <AddRecipeDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onRecipeAdded={(recipe) => {
            setShowAddDialog(false);
            setActiveTab('library');
          }}
        />
        
        <ExtractedRecipeModal
          open={showExtractedModal}
          onOpenChange={setShowExtractedModal}
          recipe={extractedRecipe}
          sourceUrl={extractedRecipe?.sourceUrl}
          onConfirm={async (editedRecipe) => {
            try {
              console.log("💾 Sauvegarde de la recette:", editedRecipe);
              
              // Préparer les données pour l'ancien système
              const { ingredients, ...recipeData } = editedRecipe;
              await addRecipeWithIngredients(recipeData, ingredients);
              
              setShowExtractedModal(false);
              setActiveTab('library');
              toast({
                title: "Recette sauvegardée !",
                description: "La recette a été ajoutée à votre bibliothèque.",
              });

              // PRP-220.17: refresh in place via the hook instead of a
              // full page reload — preserves SPA state + auth.
              await fetchRecipes();
            } catch (error) {
              console.error("❌ Erreur lors de la sauvegarde:", error);
              toast({
                title: "Erreur",
                description: "Impossible de sauvegarder la recette.",
                variant: "destructive",
              });
            }
          }}
        />
      </div>
    </div>
  );
}

// ====================================================================
// ONGLETS CONTENT
// ====================================================================

function ExploreTab({ 
  recipes, 
  totalCount, 
  isLoading, 
  trendingRecipes,
  filters,
  setFilters,
  hasNextPage,
  fetchNextPage,
  onAddToLibrary,
  isAdding
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Rechercher dans le catalogue..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-12 border-gray-200 focus:border-orange-500"
            />
          </div>
          
          <Select value="rating_avg-desc" onValueChange={() => {}}>
            <SelectTrigger className="w-full md:w-48 h-12">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating_avg-desc">Mieux notées</SelectItem>
              <SelectItem value="times_added-desc">Plus populaires</SelectItem>
              <SelectItem value="created_at-desc">Plus récentes</SelectItem>
              <SelectItem value="prep_time-asc">Plus rapides</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Section Tendances */}
      {trendingRecipes && trendingRecipes.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900">Tendances du moment</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendingRecipes.slice(0, 4).map((recipe) => (
              <CatalogRecipeCard 
                key={recipe.id} 
                recipe={recipe}
                onAddToLibrary={onAddToLibrary}
                isAdding={isAdding}
                compact={true}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Grille principale des recettes */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Catalogue ({totalCount})
          </h2>
        </div>

        {isLoading ? (
          <RecipesGridSkeleton />
        ) : recipes.length === 0 ? (
          <EmptyExploreState onSwitchToInbox={() => setActiveTab('inbox')} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recipes.map((recipe) => (
                <CatalogRecipeCard 
                  key={recipe.id} 
                  recipe={recipe}
                  onAddToLibrary={onAddToLibrary}
                  isAdding={isAdding}
                />
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={fetchNextPage}
                  size="lg"
                  variant="outline"
                >
                  Voir plus
                </Button>
              </div>
            )}
          </>
        )}
      </motion.section>
    </div>
  );
}

function LibraryTab({ recipes, isLoading, onShowOnboarding }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const stats = {
    total: recipes.length,
    custom: recipes.filter(r => !r.is_from_catalog).length,
    cooked: recipes.filter(r => r.times_cooked > 0).length,
    favorites: recipes.filter(r => (r.personal_rating || 0) >= 4).length,
  };

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard icon={BookOpen} label="Total" value={stats.total} color="blue" />
        <StatCard icon={Heart} label="Favorites" value={stats.favorites} color="red" />
        <StatCard icon={ChefHat} label="Cuisinées" value={stats.cooked} color="green" />
        <StatCard icon={Plus} label="Personnelles" value={stats.custom} color="purple" />
      </motion.div>

      {/* Contrôles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-3">
            <Button onClick={onShowOnboarding} variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Ajouter des favoris
            </Button>
            <CollectionsManager />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Liste des recettes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <RecipesGridSkeleton />
        ) : recipes.length === 0 ? (
          <EmptyLibraryState onShowOnboarding={onShowOnboarding} />
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }>
            {recipes.map((recipe) => (
              <UserRecipeCard
                key={recipe.id}
                recipe={recipe}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ImportTab({ onRecipeExtracted }) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ajouter des recettes
        </h2>
        <p className="text-gray-600">
          Importez depuis le web ou créez vos propres recettes
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Import depuis Instagram */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Instagram</h3>
                <p className="text-gray-600 text-sm">
                  Importez des recettes depuis les vidéos Instagram
                </p>
              </div>
              <InstagramVideoExtractor 
                onRecipeExtracted={onRecipeExtracted}
                onError={(error) => {
                  toast({
                    title: "Erreur d'extraction",
                    description: error.message,
                    variant: "destructive",
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Import depuis URL */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto">
                <Search className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Site web</h3>
                <p className="text-gray-600 text-sm">
                  Importez depuis n'importe quel site de recettes
                </p>
              </div>
              <Button onClick={() => setShowAddDialog(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Importer depuis URL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Réseaux sociaux */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Réseaux sociaux</h3>
                <p className="text-gray-600 text-sm">
                  TikTok, YouTube et autres plateformes
                </p>
              </div>
              <SocialImportCard 
                onImport={async (recipe) => {
                  setExtractedRecipe(recipe);
                  setShowExtractedModal(true);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ====================================================================
// COMPOSANTS RÉUTILISABLES
// ====================================================================

function CatalogRecipeCard({ recipe, onAddToLibrary, isAdding, compact = false }) {
  const navigate = useNavigate();
  const { data: isInLibrary } = useIsRecipeInLibrary(recipe.id);
  
  const handleCardClick = (e: React.MouseEvent) => {
    if (!(e.target as Element).closest('button')) {
      navigate(`/kitchen/recipes/${recipe.id}`);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full group hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer" onClick={handleCardClick}>
        <div className="relative">
          {recipe.photo_url ? (
            <img 
              src={recipe.photo_url} 
              alt={recipe.title}
              className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                compact ? 'h-32' : 'h-48'
              }`}
            />
          ) : (
            <div className={`w-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center ${
              compact ? 'h-32' : 'h-48'
            }`}>
              <ChefHat className={`${compact ? 'h-8 w-8' : 'h-12 w-12'} text-orange-400`} />
            </div>
          )}
          
          <div className="absolute top-3 right-3">
            <Button
              size="sm"
              variant={isInLibrary ? "secondary" : "default"}
              className={`h-10 w-10 p-0 rounded-full ${
                isInLibrary 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-white text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => !isInLibrary && onAddToLibrary(recipe.id, recipe.title)}
              disabled={isInLibrary || isAdding}
            >
              {isInLibrary ? (
                <Heart className="h-5 w-5 fill-current" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        
        <CardContent className={compact ? "p-3" : "p-4"}>
          <h3 className={`font-bold mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors ${
            compact ? 'text-sm' : 'text-lg'
          }`}>
            {recipe.title}
          </h3>
          
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatCookingTime(recipe.prep_time, recipe.cook_time)}
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {recipe.rating_avg.toFixed(1)}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function UserRecipeCard({ recipe, viewMode }) {
  const navigate = useNavigate();
  const title = getRecipeTitle(recipe);
  const image = getRecipeImage(recipe);
  
  const handleClick = () => {
    navigate(`/kitchen/recipes/${recipe.id}`);
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <CardContent className="p-4">
        <div className={viewMode === 'list' ? 'flex items-center gap-4' : ''}>
          <div className={`rounded-lg overflow-hidden ${
            viewMode === 'list' ? 'w-16 h-16 flex-shrink-0' : 'w-full h-48 mb-4'
          }`}>
            {image ? (
              <img src={image} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <ChefHat className={`${viewMode === 'list' ? 'h-6 w-6' : 'h-12 w-12'} text-blue-400`} />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className={`font-semibold mb-2 ${viewMode === 'list' ? 'text-base' : 'text-lg'}`}>
              {title}
            </h3>
            
            {recipe.personal_notes && (
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                {recipe.personal_notes}
              </p>
            )}
            
            <div className="flex items-center gap-2 flex-wrap">
              {!recipe.is_from_catalog && (
                <Badge className="bg-purple-500 text-white">Custom</Badge>
              )}
              
              {recipe.collections.map((collection) => (
                <Badge key={collection} variant="outline" className="text-xs">
                  {collection}
                </Badge>
              ))}
              
              {recipe.times_cooked > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Cuite {recipe.times_cooked}x
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecipesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="h-full">
          <div className="w-full h-48 bg-gray-200 animate-pulse" />
          <CardContent className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyExploreState({ onSwitchToInbox }: { onSwitchToInbox?: () => void }) {
  // Audit P1: was "Catalogue en construction / sera bientôt disponible".
  // Misleading — the page IS loaded, the catalog is just empty for
  // this user. Pivot to actionable copy that lets the user fill the
  // catalog themselves via the inbox (PRP-220 capture flow) instead
  // of waiting for a "bientôt".
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">Aucune recette à explorer pour l&apos;instant</h3>
      <p className="text-muted-foreground mb-6">
        Capture une URL Instagram, TikTok, YouTube ou un lien web et
        elle apparaîtra ici une fois extraite.
      </p>
      {onSwitchToInbox && (
        <Button onClick={onSwitchToInbox}>Aller à l&apos;inbox</Button>
      )}
    </div>
  );
}

function EmptyLibraryState({ onShowOnboarding }) {
  return (
    <div className="text-center py-16">
      <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Votre bibliothèque est vide
      </h3>
      <p className="text-gray-600 mb-6">
        Commencez par ajouter quelques recettes favorites !
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={onShowOnboarding}>
          <Sparkles className="h-4 w-4 mr-2" />
          Découvrir des recettes
        </Button>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Créer une recette
        </Button>
      </div>
    </div>
  );
}