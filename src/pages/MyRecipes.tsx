/**
 * Page Mes Recettes - Bibliothèque personnelle
 * Partie "My Library" du pattern "Spotify des recettes"
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search,
  Plus,
  Grid3X3,
  List,
  Star,
  Clock,
  ChefHat,
  Heart,
  BookOpen,
  Filter,
  Settings,
  Edit3,
  Trash2,
  Calendar,
  Users,
  Tags,
  Folders,
  Import
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

import { 
  useUserRecipes, 
  useUserCollections,
  getRecipeTitle,
  getRecipeImage,
  type UserRecipe 
} from '@/hooks/useUserRecipes';
import { formatCookingTime } from '@/hooks/useRecipeCatalog';

export default function MyRecipes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  
  const {
    recipes,
    isLoading,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    deleteRecipe,
    markAsCooked,
    isDeleting
  } = useUserRecipes();

  const { collections } = useUserCollections();

  // Statistiques
  const stats = {
    total: recipes.length,
    custom: recipes.filter(r => !r.is_from_catalog).length,
    cooked: recipes.filter(r => r.times_cooked > 0).length,
    favorites: recipes.filter(r => (r.personal_rating || 0) >= 4).length,
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  const handleCollectionFilter = (collectionName: string) => {
    setSelectedCollection(collectionName);
    if (collectionName === 'all') {
      const { collections, ...filtersWithoutCollections } = filters;
      setFilters(filtersWithoutCollections);
    } else {
      setFilters({ ...filters, collections: [collectionName] });
    }
  };

  const handleMarkAsCooked = (recipeId: string, recipeName: string) => {
    markAsCooked(recipeId);
    toast({
      title: "Recette marquée comme cuisinée !",
      description: `"${recipeName}" a été ajoutée à votre historique culinaire.`,
    });
  };

  const handleDeleteRecipe = (recipeId: string, recipeName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${recipeName}" ?`)) {
      deleteRecipe(recipeId);
      toast({
        title: "Recette supprimée",
        description: `"${recipeName}" a été supprimée de votre bibliothèque.`,
      });
    }
  };

  // Filtrer les recettes par collection sélectionnée
  const filteredRecipes = selectedCollection === 'all' 
    ? recipes 
    : recipes.filter(recipe => recipe.collections.includes(selectedCollection));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header avec statistiques */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Ma Bibliothèque
              </h1>
              <p className="text-gray-600">
                Vos recettes favorites, organisées comme vous le souhaitez
              </p>
            </div>
            
            <div className="flex gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-5 w-5 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <AddRecipeDialog />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={BookOpen}
              label="Total"
              value={stats.total}
              color="blue"
            />
            <StatCard
              icon={Edit3}
              label="Personnalisées"
              value={stats.custom}
              color="purple"
            />
            <StatCard
              icon={ChefHat}
              label="Cuisinées"
              value={stats.cooked}
              color="green"
            />
            <StatCard
              icon={Heart}
              label="Favorites"
              value={stats.favorites}
              color="red"
            />
          </div>
        </motion.div>

        {/* Collections & Filtres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Tabs value={selectedCollection} onValueChange={handleCollectionFilter}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <TabsList className="grid w-full md:w-auto grid-cols-2 md:flex gap-1">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Toutes ({stats.total})
                </TabsTrigger>
                
                {collections.slice(0, 3).map((collection) => (
                  <TabsTrigger key={collection.name} value={collection.name}>
                    {collection.name}
                  </TabsTrigger>
                ))}
                
                {collections.length > 3 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Folders className="h-4 w-4" />
                        Plus...
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {collections.slice(3).map((collection) => (
                        <DropdownMenuItem
                          key={collection.name}
                          onClick={() => handleCollectionFilter(collection.name)}
                        >
                          {collection.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TabsList>

              <div className="flex gap-3">
                <CollectionManager />
              </div>
            </div>
          </Tabs>
        </motion.div>

        {/* Barre de recherche et contrôles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Rechercher dans ma bibliothèque..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg">
                  <Filter className="h-4 w-4 mr-2" />
                  Trier
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSortBy('added_date'); setSortDirection('desc'); }}>
                  Plus récentes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('last_cooked_date'); setSortDirection('desc'); }}>
                  Récemment cuisinées
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('times_cooked'); setSortDirection('desc'); }}>
                  Plus cuisinées
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('personal_rating'); setSortDirection('desc'); }}>
                  Mieux notées
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Liste des recettes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isLoading ? (
            <RecipesGridSkeleton />
          ) : filteredRecipes.length === 0 ? (
            <EmptyState searchQuery={searchQuery} selectedCollection={selectedCollection} />
          ) : (
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }>
              {filteredRecipes.map((recipe) => (
                viewMode === 'grid' ? (
                  <MyRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onMarkAsCooked={handleMarkAsCooked}
                    onDelete={handleDeleteRecipe}
                    isDeleting={isDeleting}
                  />
                ) : (
                  <MyRecipeListItem
                    key={recipe.id}
                    recipe={recipe}
                    onMarkAsCooked={handleMarkAsCooked}
                    onDelete={handleDeleteRecipe}
                    isDeleting={isDeleting}
                  />
                )
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ====================================================================
// SOUS-COMPOSANTS
// ====================================================================

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  color: string; 
}) {
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

function MyRecipeCard({ 
  recipe, 
  onMarkAsCooked,
  onDelete,
  isDeleting 
}: { 
  recipe: UserRecipe; 
  onMarkAsCooked: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
}) {
  const title = getRecipeTitle(recipe);
  const image = getRecipeImage(recipe);
  const isCustom = !recipe.is_from_catalog;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full group hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="relative">
          {image ? (
            <img 
              src={image} 
              alt={title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <ChefHat className="h-12 w-12 text-blue-400" />
            </div>
          )}
          
          <div className="absolute top-3 left-3 flex gap-2">
            {isCustom && (
              <Badge className="bg-purple-500 text-white">
                <Edit3 className="h-3 w-3 mr-1" />
                Custom
              </Badge>
            )}
            
            {recipe.collections.slice(0, 1).map((collection) => (
              <Badge key={collection} variant="secondary">
                {collection}
              </Badge>
            ))}
          </div>
          
          <div className="absolute top-3 right-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onMarkAsCooked(recipe.id, title)}>
                  <ChefHat className="h-4 w-4 mr-2" />
                  Marquer comme cuite
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(recipe.id, title)}
                  className="text-red-600"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          
          {recipe.personal_notes && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {recipe.personal_notes}
            </p>
          )}
          
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
            {recipe.catalog_recipe && (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatCookingTime(
                    recipe.catalog_recipe.prep_time, 
                    recipe.catalog_recipe.cook_time
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {recipe.catalog_recipe.servings}
                </div>
              </>
            )}
            
            {recipe.times_cooked > 0 && (
              <div className="flex items-center gap-1">
                <ChefHat className="h-4 w-4" />
                {recipe.times_cooked}x
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {recipe.personal_rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{recipe.personal_rating}</span>
                </div>
              )}
              
              {recipe.last_cooked_date && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(recipe.last_cooked_date).toLocaleDateString()}
                </Badge>
              )}
            </div>
            
            {recipe.collections.length > 1 && (
              <Badge variant="secondary" className="text-xs">
                +{recipe.collections.length - 1}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MyRecipeListItem({ 
  recipe, 
  onMarkAsCooked,
  onDelete,
  isDeleting 
}: { 
  recipe: UserRecipe; 
  onMarkAsCooked: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
}) {
  const title = getRecipeTitle(recipe);
  const image = getRecipeImage(recipe);
  const isCustom = !recipe.is_from_catalog;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            {image ? (
              <img src={image} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <ChefHat className="h-6 w-6 text-blue-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate mb-1">{title}</h3>
                <p className="text-sm text-gray-600 line-clamp-1">
                  {recipe.personal_notes || 'Aucune note personnelle'}
                </p>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {isCustom && (
                  <Badge className="bg-purple-500 text-white">
                    Custom
                  </Badge>
                )}
                
                {recipe.personal_rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{recipe.personal_rating}</span>
                  </div>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onMarkAsCooked(recipe.id, title)}>
                      <ChefHat className="h-4 w-4 mr-2" />
                      Marquer comme cuite
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(recipe.id, title)}
                      className="text-red-600"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {recipe.collections.map((collection, index) => (
                <Badge key={collection} variant="outline" className="text-xs">
                  {collection}
                </Badge>
              ))}
              
              {recipe.times_cooked > 0 && (
                <span className="flex items-center gap-1">
                  <ChefHat className="h-3 w-3" />
                  Cuite {recipe.times_cooked}x
                </span>
              )}
              
              {recipe.last_cooked_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(recipe.last_cooked_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CollectionManager() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Folders className="h-4 w-4 mr-2" />
          Collections
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Gérer les collections</SheetTitle>
        </SheetHeader>
        
        <div className="py-6">
          <p className="text-gray-600 mb-4">
            Organisez vos recettes en collections thématiques
          </p>
          
          <Button className="w-full mb-4">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle collection
          </Button>
          
          {/* TODO: Liste des collections avec actions */}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AddRecipeDialog() {
  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Ajouter une recette</DialogTitle>
      </DialogHeader>
      
      <div className="grid gap-4">
        <Button className="h-16 justify-start text-left">
          <Import className="h-6 w-6 mr-4" />
          <div>
            <div className="font-semibold">Depuis une URL</div>
            <div className="text-sm text-gray-500">Importer depuis un site web</div>
          </div>
        </Button>
        
        <Button variant="outline" className="h-16 justify-start text-left">
          <Edit3 className="h-6 w-6 mr-4" />
          <div>
            <div className="font-semibold">Recette personnelle</div>
            <div className="text-sm text-gray-500">Créer de toutes pièces</div>
          </div>
        </Button>
        
        <Button variant="outline" className="h-16 justify-start text-left">
          <BookOpen className="h-6 w-6 mr-4" />
          <div>
            <div className="font-semibold">Depuis le catalogue</div>
            <div className="text-sm text-gray-500">Explorer les recettes populaires</div>
          </div>
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

function EmptyState({ searchQuery, selectedCollection }: { 
  searchQuery: string; 
  selectedCollection: string; 
}) {
  return (
    <div className="text-center py-16">
      <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {searchQuery || selectedCollection !== 'all' 
          ? 'Aucune recette trouvée' 
          : 'Votre bibliothèque est vide'
        }
      </h3>
      <p className="text-gray-600 mb-6">
        {searchQuery 
          ? `Aucune recette ne correspond à "${searchQuery}"`
          : selectedCollection !== 'all'
            ? `Aucune recette dans la collection "${selectedCollection}"`
            : 'Commencez par ajouter quelques recettes favorites !'
        }
      </p>
      <div className="flex gap-3 justify-center">
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une recette
        </Button>
        <Button variant="outline">
          <BookOpen className="h-4 w-4 mr-2" />
          Explorer le catalogue
        </Button>
      </div>
    </div>
  );
}