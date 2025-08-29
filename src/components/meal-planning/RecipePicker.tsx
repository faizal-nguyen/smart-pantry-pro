"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Clock, DollarSign, Flame, Star, Filter } from 'lucide-react';
import { useMealPlanningRecipes } from '@/hooks/useMealPlanningRecipes';
import { MealType, UserPreferences } from '@/services/planning/types';

interface RecipePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipeId: string | null) => void;
  mealType: MealType;
  dayOfWeek: number;
  userPreferences: UserPreferences | null;
}

interface RecipeCard {
  id: string;
  title: string;
  description?: string;
  prep_time: number;
  cook_time: number;
  difficulty: number;
  servings: number;
  photo_url?: string;
  tags?: string[];
  rating_avg?: number;
  estimated_cost?: number;
}

export function RecipePicker({ 
  isOpen, 
  onClose, 
  onSelectRecipe, 
  mealType, 
  dayOfWeek,
  userPreferences 
}: RecipePickerProps) {
  const { searchRecipes, getPopularRecipes, getFavoriteRecipes } = useMealPlanningRecipes();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecipeCard[]>([]);
  const [popularRecipes, setPopularRecipes] = useState<RecipeCard[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<RecipeCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Load recipes on open
  useEffect(() => {
    if (isOpen) {
      loadPopularRecipes();
      loadFavoriteRecipes();
    }
  }, [isOpen]);

  const loadFavoriteRecipes = async () => {
    try {
      const recipes = await getFavoriteRecipes();
      setFavoriteRecipes(recipes.map(transformRecipeWithDetails));
    } catch (error) {
      console.error('Error loading favorite recipes:', error);
    }
  };

  // Search when query changes
  useEffect(() => {
    if (searchQuery.length > 2) {
      handleSearch();
    } else if (searchQuery.length === 0) {
      loadPopularRecipes();
    }
  }, [searchQuery]);

  const loadPopularRecipes = async () => {
    setLoading(true);
    try {
      const recipes = await getPopularRecipes(20);
      setPopularRecipes(recipes.map(transformRecipeWithDetails));
    } catch (error) {
      console.error('Error loading popular recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const filters = {
        meal_type: mealType === 'lunch' ? 'déjeuner' : 'dîner',
        ...(userPreferences?.timeConstraints?.maxPrepTime && {
          max_time: userPreferences.timeConstraints.maxPrepTime
        })
      };

      const recipes = await searchRecipes(searchQuery, filters);
      setSearchResults(recipes.map(transformRecipeWithDetails));
    } catch (error) {
      console.error('Error searching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform recipe data to match our interface
  const transformRecipeWithDetails = (recipe: any): RecipeCard => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    prep_time: recipe.prep_time || 0,
    cook_time: recipe.cook_time || 0,
    difficulty: recipe.difficulty || 3,
    servings: recipe.servings || 4,
    photo_url: recipe.photo_url,
    tags: recipe.tags || [],
    rating_avg: recipe.rating_avg,
    estimated_cost: recipe.estimatedCost || estimateRecipeCost(recipe)
  });

  const estimateRecipeCost = (recipe: any): number => {
    // Basic cost estimation based on servings and complexity
    const baseCost = 3.5; // Base cost per serving
    const complexityMultiplier = (recipe.difficulty || 3) * 0.2;
    const servingMultiplier = (recipe.servings || 4) * 0.1;
    
    return Math.round((baseCost + complexityMultiplier + servingMultiplier) * 100) / 100;
  };

  const filteredRecipes = searchQuery ? searchResults : popularRecipes;

  const getTimeDisplay = (prepTime: number, cookTime: number) => {
    const total = prepTime + cookTime;
    return total > 0 ? `${total}min` : 'Non spécifié';
  };

  const renderRecipeCard = (recipe: RecipeCard) => (
    <Card 
      key={recipe.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelectRecipe(recipe.id)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Recipe Image */}
          {recipe.photo_url ? (
            <div 
              className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
              style={{ backgroundImage: `url(${recipe.photo_url})` }}
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {recipe.title.charAt(0)}
            </div>
          )}

          {/* Recipe Info */}
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="font-medium text-sm line-clamp-1">
                {recipe.title}
              </h3>
              {recipe.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {recipe.description}
                </p>
              )}
            </div>

            {/* Recipe Metrics */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {getTimeDisplay(recipe.prep_time, recipe.cook_time)}
              </Badge>
              
              <Badge variant="secondary" className="text-xs">
                <DollarSign className="h-3 w-3 mr-1" />
                ~{recipe.estimated_cost?.toFixed(2)}€
              </Badge>
              
              <Badge variant="secondary" className="text-xs">
                {'★'.repeat(recipe.difficulty)}
              </Badge>

              {recipe.rating_avg && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  {recipe.rating_avg.toFixed(1)}
                </Badge>
              )}
            </div>

            {/* Recipe Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {recipe.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{mealType === 'lunch' ? '🌞' : '🌙'}</span>
            Choisir un repas pour {mealType === 'lunch' ? 'le midi' : 'le soir'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une recette..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters based on user preferences */}
          {userPreferences && (
            <div className="flex flex-wrap gap-2">
              {userPreferences.dietaryRestrictions.map(restriction => (
                <Badge key={restriction} variant="secondary">
                  {restriction}
                </Badge>
              ))}
              {userPreferences.cuisinePreferences.slice(0, 3).map(cuisine => (
                <Badge key={cuisine} variant="outline">
                  {cuisine}
                </Badge>
              ))}
            </div>
          )}

          {/* Recipe Tabs */}
          <Tabs defaultValue="popular" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="popular">Populaires</TabsTrigger>
              <TabsTrigger value="search">Recherche</TabsTrigger>
              <TabsTrigger value="favorites">Favoris</TabsTrigger>
            </TabsList>

            <TabsContent value="popular" className="flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      {filteredRecipes.map(renderRecipeCard)}
                      {filteredRecipes.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                          Aucune recette trouvée
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="search" className="flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      {searchResults.map(renderRecipeCard)}
                      {searchResults.length === 0 && searchQuery.length > 2 && (
                        <div className="text-center p-8 text-muted-foreground">
                          Aucune recette trouvée pour "{searchQuery}"
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="favorites" className="flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      {favoriteRecipes.map(renderRecipeCard)}
                      {favoriteRecipes.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                          <div className="text-4xl mb-2">⭐</div>
                          <h3 className="font-medium mb-1">Aucun favori</h3>
                          <p className="text-sm">
                            Ajoutez des recettes à vos favoris pour les retrouver ici
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onSelectRecipe(null)}
            >
              Retirer le repas
            </Button>
            
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}