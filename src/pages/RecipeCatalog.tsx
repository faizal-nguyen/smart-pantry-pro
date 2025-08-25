/**
 * Page Explorer - Catalogue global de recettes
 * Implémente la partie "découverte" du pattern "Spotify des recettes"
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter,
  Star,
  Clock,
  Users,
  Heart,
  Plus,
  TrendingUp,
  ChefHat,
  Sparkles
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger 
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

import { 
  useRecipeCatalog, 
  useTrendingRecipes,
  useRateCatalogRecipe,
  RECIPE_TAGS,
  DIFFICULTY_LABELS,
  formatCookingTime,
  type CatalogFilters 
} from '@/hooks/useRecipeCatalog';
import { useUserRecipes, useIsRecipeInLibrary } from '@/hooks/useUserRecipes';

export default function RecipeCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const {
    recipes,
    totalCount,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    filters,
    setFilters,
    sortBy,
    setSortBy
  } = useRecipeCatalog();

  const { data: trendingRecipes } = useTrendingRecipes();
  const { addFromCatalog, isAddingFromCatalog } = useUserRecipes();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    if (category === 'all') {
      const { tags, ...filtersWithoutTags } = filters;
      setFilters(filtersWithoutTags);
    } else {
      setFilters({ ...filters, tags: [category] });
    }
  };

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
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-orange-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Explorer les recettes
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez des milliers de recettes vérifiées et ajoutez vos coups de cœur à votre bibliothèque personnelle
          </p>
        </motion.div>

        {/* Search & Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Rechercher des recettes..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-12 border-gray-200 focus:border-orange-500"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-full md:w-48 h-12">
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="rapide">Rapide</SelectItem>
                <SelectItem value="végétarien">Végétarien</SelectItem>
                <SelectItem value="dessert">Desserts</SelectItem>
                <SelectItem value="comfort food">Comfort Food</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
              </SelectContent>
            </Select>

            {/* Advanced Filters */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg" className="h-12">
                  <Filter className="h-5 w-5 mr-2" />
                  Filtres
                </Button>
              </SheetTrigger>
              <SheetContent>
                <AdvancedFilters filters={filters} setFilters={setFilters} />
              </SheetContent>
            </Sheet>

            {/* Sort */}
            <Select value={`${sortBy.field}-${sortBy.direction}`} onValueChange={(value) => {
              const [field, direction] = value.split('-') as [string, 'asc' | 'desc'];
              setSortBy({ field: field as any, direction });
            }}>
              <SelectTrigger className="w-full md:w-48 h-12">
                <SelectValue />
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

        {/* Trending Section */}
        {trendingRecipes && trendingRecipes.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-6 w-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900">Tendances du moment</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingRecipes.slice(0, 4).map((recipe) => (
                <TrendingRecipeCard 
                  key={recipe.id} 
                  recipe={recipe}
                  onAddToLibrary={handleAddToLibrary}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Results Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Recettes ({totalCount})
            </h2>
            <div className="text-sm text-gray-500">
              {filters.search && `Résultats pour "${filters.search}"`}
            </div>
          </div>

          {isLoading ? (
            <RecipesGridSkeleton />
          ) : recipes.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recipes.map((recipe) => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe}
                    onAddToLibrary={handleAddToLibrary}
                    isAdding={isAddingFromCatalog}
                  />
                ))}
              </div>

              {hasNextPage && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={fetchNextPage}
                    disabled={isFetchingNextPage}
                    size="lg"
                    variant="outline"
                  >
                    {isFetchingNextPage ? 'Chargement...' : 'Voir plus'}
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.section>
      </div>
    </div>
  );
}

// ====================================================================
// SOUS-COMPOSANTS
// ====================================================================

function TrendingRecipeCard({ 
  recipe, 
  onAddToLibrary 
}: { 
  recipe: any; 
  onAddToLibrary: (id: string, name: string) => void;
}) {
  const { data: isInLibrary } = useIsRecipeInLibrary(recipe.id);
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-orange-200">
      <div className="relative overflow-hidden rounded-t-lg">
        {recipe.photo_url && (
          <img 
            src={recipe.photo_url} 
            alt={recipe.title}
            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
          />
        )}
        <div className="absolute top-2 left-2">
          <Badge className="bg-orange-500 text-white">
            <TrendingUp className="h-3 w-3 mr-1" />
            Tendance
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Button
            size="sm"
            variant={isInLibrary ? "secondary" : "default"}
            className="h-8 w-8 p-0"
            onClick={() => !isInLibrary && onAddToLibrary(recipe.id, recipe.title)}
            disabled={isInLibrary}
          >
            {isInLibrary ? (
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm mb-1 line-clamp-1">{recipe.title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {formatCookingTime(recipe.prep_time, recipe.cook_time)}
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          {recipe.rating_avg.toFixed(1)}
        </div>
      </CardContent>
    </Card>
  );
}

function RecipeCard({ 
  recipe, 
  onAddToLibrary,
  isAdding 
}: { 
  recipe: any; 
  onAddToLibrary: (id: string, name: string) => void;
  isAdding: boolean;
}) {
  const { data: isInLibrary } = useIsRecipeInLibrary(recipe.id);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full group hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="relative">
          {recipe.photo_url ? (
            <img 
              src={recipe.photo_url} 
              alt={recipe.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
              <ChefHat className="h-12 w-12 text-orange-400" />
            </div>
          )}
          
          <div className="absolute top-3 left-3">
            {recipe.is_premium && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                Premium
              </Badge>
            )}
          </div>
          
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
        
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
            {recipe.title}
          </h3>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {recipe.description}
          </p>
          
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatCookingTime(recipe.prep_time, recipe.cook_time)}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {recipe.servings}
            </div>
            <div className="flex items-center gap-1">
              <ChefHat className="h-4 w-4" />
              {DIFFICULTY_LABELS[recipe.difficulty]}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{recipe.rating_avg.toFixed(1)}</span>
              <span className="text-xs text-gray-500">({recipe.rating_count})</span>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 2).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AdvancedFilters({ 
  filters, 
  setFilters 
}: { 
  filters: CatalogFilters; 
  setFilters: (filters: CatalogFilters) => void; 
}) {
  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>Filtres avancés</SheetTitle>
      </SheetHeader>
      
      {/* Difficulty */}
      <div>
        <label className="text-sm font-medium mb-2 block">Difficulté</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(DIFFICULTY_LABELS).map(([level, label]) => (
            <Badge
              key={level}
              variant={filters.difficulty?.includes(Number(level)) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                const currentDifficulty = filters.difficulty || [];
                const levelNum = Number(level);
                const newDifficulty = currentDifficulty.includes(levelNum)
                  ? currentDifficulty.filter(d => d !== levelNum)
                  : [...currentDifficulty, levelNum];
                setFilters({ ...filters, difficulty: newDifficulty });
              }}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />
      
      {/* Dietary Tags */}
      <div>
        <label className="text-sm font-medium mb-2 block">Régime alimentaire</label>
        <div className="flex gap-2 flex-wrap">
          {RECIPE_TAGS.DIETARY.map((tag) => (
            <Badge
              key={tag}
              variant={filters.tags?.includes(tag) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                const currentTags = filters.tags || [];
                const newTags = currentTags.includes(tag)
                  ? currentTags.filter(t => t !== tag)
                  : [...currentTags, tag];
                setFilters({ ...filters, tags: newTags });
              }}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />
      
      {/* Cuisine */}
      <div>
        <label className="text-sm font-medium mb-2 block">Cuisine</label>
        <div className="flex gap-2 flex-wrap">
          {RECIPE_TAGS.CUISINE.map((tag) => (
            <Badge
              key={tag}
              variant={filters.tags?.includes(tag) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                const currentTags = filters.tags || [];
                const newTags = currentTags.includes(tag)
                  ? currentTags.filter(t => t !== tag)
                  : [...currentTags, tag];
                setFilters({ ...filters, tags: newTags });
              }}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />
      
      {/* Time filters */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Temps de préparation max: {filters.maxPrepTime || 120} min
          </label>
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={filters.maxPrepTime || 120}
            onChange={(e) => setFilters({ ...filters, maxPrepTime: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">
            Temps de cuisson max: {filters.maxCookTime || 180} min
          </label>
          <input
            type="range"
            min="0"
            max="180"
            step="10"
            value={filters.maxCookTime || 180}
            onChange={(e) => setFilters({ ...filters, maxCookTime: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
      
      <Separator />
      
      {/* Rating */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Note minimum: {filters.rating || 0}/5
        </label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={filters.rating || 0}
          onChange={(e) => setFilters({ ...filters, rating: Number(e.target.value) })}
          className="w-full"
        />
      </div>
      
      <div className="pt-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setFilters({})}
        >
          Réinitialiser les filtres
        </Button>
      </div>
    </div>
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
            <div className="flex gap-4">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="text-center py-16">
      <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {searchQuery ? 'Aucune recette trouvée' : 'Aucune recette disponible'}
      </h3>
      <p className="text-gray-600 mb-6">
        {searchQuery 
          ? `Essayez avec d'autres mots-clés ou modifiez vos filtres.`
          : 'Le catalogue est en cours de construction.'
        }
      </p>
      {searchQuery && (
        <Button variant="outline" onClick={() => window.location.reload()}>
          Effacer la recherche
        </Button>
      )}
    </div>
  );
}