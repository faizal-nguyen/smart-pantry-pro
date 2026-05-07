import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecipeCollections } from "@/hooks/useRecipeCollections";
import { useRecipes } from "@/hooks/useRecipes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft,
  Plus, 
  MoreVertical, 
  Trash2, 
  Share2, 
  Copy, 
  Eye, 
  Heart,
  Search,
  Clock,
  ChefHat,
  Users,
  Lock,
  Globe,
  Edit,
  GripVertical,
  Star,
  BookOpen
} from "lucide-react";
import { CollectionRecipe, RecipeCollection } from "@/types/recipe-collections";
import { Recipe } from "@/hooks/useRecipes";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CollectionDetail = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [collection, setCollection] = useState<RecipeCollection | null>(null);
  const [collectionRecipes, setCollectionRecipes] = useState<CollectionRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRecipesDialog, setShowAddRecipesDialog] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const {
    loadCollectionByShareCode,
    loadCollectionRecipes,
    addRecipeToCollection,
    removeRecipeFromCollection,
    checkPermissions
  } = useRecipeCollections();
  
  const { recipes } = useRecipes();
  
  // Charger la collection et ses recettes
  useEffect(() => {
    const loadData = async () => {
      if (!shareCode) return;
      
      setLoading(true);
      try {
        const collectionData = await loadCollectionByShareCode(shareCode);
        if (!collectionData) {
          toast({
            title: "Collection introuvable",
            description: "Cette collection n'existe pas ou a été supprimée",
            variant: "destructive"
          });
          navigate('/recipes/collections');
          return;
        }
        
        setCollection(collectionData);
        
        const recipesData = await loadCollectionRecipes(collectionData.id);
        setCollectionRecipes(recipesData);
      } catch (error) {
        console.error('Error loading collection:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [shareCode]);
  
  // Filtrer les recettes disponibles à ajouter
  const availableRecipes = recipes.filter(recipe => {
    // Exclure les recettes déjà dans la collection
    const isInCollection = collectionRecipes.some(cr => cr.recipe_id === recipe.id);
    if (isInCollection) return false;
    
    // Appliquer la recherche
    if (searchQuery) {
      return recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    return true;
  });
  
  const handleAddRecipes = async () => {
    if (!collection || selectedRecipes.length === 0) return;
    
    try {
      for (const recipeId of selectedRecipes) {
        await addRecipeToCollection(collection.id, recipeId);
      }
      
      // Recharger les recettes
      const recipesData = await loadCollectionRecipes(collection.id);
      setCollectionRecipes(recipesData);
      
      toast({
        title: "Recettes ajoutées",
        description: `${selectedRecipes.length} recette(s) ajoutées à la collection`,
      });
      
      setShowAddRecipesDialog(false);
      setSelectedRecipes([]);
    } catch (error) {
      console.error('Error adding recipes:', error);
    }
  };
  
  const handleRemoveRecipe = async (recipeId: string) => {
    if (!collection) return;
    
    if (confirm("Êtes-vous sûr de vouloir retirer cette recette de la collection ?")) {
      await removeRecipeFromCollection(collection.id, recipeId);
      
      // Recharger les recettes
      const recipesData = await loadCollectionRecipes(collection.id);
      setCollectionRecipes(recipesData);
    }
  };
  
  const handleShare = () => {
    const shareUrl = `${window.location.origin}/collections/${collection?.share_code}`;
    navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: "Lien copié !",
      description: "Le lien de partage a été copié dans le presse-papier",
    });
  };
  
  const RecipeCard = ({ collectionRecipe }: { collectionRecipe: CollectionRecipe }) => {
    const recipe = collectionRecipe.recipe;
    if (!recipe) return null;
    
    return (
      <Card className="group hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{recipe.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/kitchen/recipes/${recipe.id}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir la recette
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRemoveRecipe(recipe.id)}>
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                  Retirer de la collection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {recipe.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            {/* Infos */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{recipe.prep_time + recipe.cook_time} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{recipe.servings} pers.</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < recipe.difficulty
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {recipe.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {recipe.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{recipe.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            {/* Notes */}
            {collectionRecipe.notes && (
              <p className="text-xs text-muted-foreground italic">
                Note: {collectionRecipe.notes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!collection) {
    return (
      <div className="text-center py-12">
        <p>Collection introuvable</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/recipes/collections')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
      
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {collection.name}
              {collection.is_public ? (
                <Globe className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Lock className="h-6 w-6 text-muted-foreground" />
              )}
            </h1>
            {collection.description && (
              <p className="text-muted-foreground mt-1">
                {collection.description}
              </p>
            )}
            
            {/* Metadata */}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{collectionRecipes.length} recettes</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{collection.view_count} vues</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{collection.favorite_count} favoris</span>
              </div>
              {collection.created_by && (
                <div className="flex items-center gap-1">
                  <span>Par {collection.created_by.full_name || collection.created_by.email}</span>
                </div>
              )}
            </div>
            
            {/* Tags */}
            {collection.tags && collection.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {collection.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Partager
            </Button>
            <Button onClick={() => setShowAddRecipesDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter des recettes
            </Button>
          </div>
        </div>
      </div>
      
      {/* Recettes */}
      {collectionRecipes.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            Cette collection ne contient pas encore de recettes
          </p>
          <Button onClick={() => setShowAddRecipesDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter des recettes
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collectionRecipes.map((collectionRecipe) => (
            <RecipeCard 
              key={collectionRecipe.id} 
              collectionRecipe={collectionRecipe} 
            />
          ))}
        </div>
      )}
      
      {/* Dialog d'ajout de recettes */}
      <Dialog open={showAddRecipesDialog} onOpenChange={setShowAddRecipesDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ajouter des recettes</DialogTitle>
            <DialogDescription>
              Sélectionnez les recettes à ajouter à la collection
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher des recettes..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Liste des recettes */}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {availableRecipes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucune recette disponible
                </p>
              ) : (
                availableRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => {
                      setSelectedRecipes(prev =>
                        prev.includes(recipe.id)
                          ? prev.filter(id => id !== recipe.id)
                          : [...prev, recipe.id]
                      );
                    }}
                  >
                    <Checkbox
                      checked={selectedRecipes.includes(recipe.id)}
                      onCheckedChange={(checked) => {
                        setSelectedRecipes(prev =>
                          checked
                            ? [...prev, recipe.id]
                            : prev.filter(id => id !== recipe.id)
                        );
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{recipe.name}</p>
                      {recipe.description && (
                        <p className="text-sm text-muted-foreground">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{recipe.prep_time + recipe.cook_time} min</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {selectedRecipes.length} recette(s) sélectionnée(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddRecipesDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleAddRecipes}
                disabled={selectedRecipes.length === 0}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionDetail;