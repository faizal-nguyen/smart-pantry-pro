import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Star, 
  Heart, 
  Share, 
  ShoppingCart,
  ChefHat,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Trash2,
  IndianRupee,
} from "lucide-react";
import { RecipeNutrition } from "@/components/recipes/RecipeNutrition";
import { RecipeSourceCard, type RecipeSourceLike } from "@/components/recipes/RecipeSourceCard";
import { toast } from "@/hooks/use-toast";
import { useRecipes } from "@/hooks/useRecipes";
import { useRecipeInventoryAnalysis } from "@/hooks/useRecipeInventoryAnalysis";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useIndianPriceEstimator } from "@/hooks/useIndianPriceEstimator";
import { supabase } from "@/integrations/supabase/client";

interface RecipeIngredient {
  id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  is_essential: boolean;
  notes?: string;
}

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, deleteRecipe } = useRecipes();
  const { addToShoppingList } = useShoppingList();
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const recipe = recipes.find(r => r.id === id);
  const { analysis: inventoryAnalysis, error: analysisError } = useRecipeInventoryAnalysis(id || '');
  const { estimatePrices, isIndianRecipe } = useIndianPriceEstimator();
  
  // Détecter si la recette a été supprimée
  const recipeDeleted = !recipe && !loading && id;
  const [indianPriceEstimate, setIndianPriceEstimate] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchRecipeDetails();
    }
  }, [id]);
  
  useEffect(() => {
    // Estimate Indian prices if it's an Indian recipe
    if (recipe && ingredients.length > 0 && isIndianRecipe(recipe.cuisine_category, recipe.tags)) {
      estimatePrices(ingredients, recipe.id).then(result => {
        if (result) {
          setIndianPriceEstimate(result);
        }
      });
    }
  }, [recipe, ingredients]);

  const fetchRecipeDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch recipe data first
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
        
      if (recipeError) throw recipeError;
      
      // Fetch ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('created_at');

      if (ingredientsError) throw ingredientsError;
      setIngredients(ingredientsData || []);

      // Parse instructions from fetched recipe
      console.log('Recipe instructions:', recipeData?.instructions);
      if (recipeData?.instructions) {
        try {
          // Si c'est déjà un tableau, on l'utilise directement
          if (Array.isArray(recipeData.instructions)) {
            setInstructions(recipeData.instructions);
          } else if (typeof recipeData.instructions === 'string') {
            // Essayer de parser comme JSON d'abord
            try {
              const parsed = JSON.parse(recipeData.instructions);
              setInstructions(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              // Si ce n'est pas du JSON, traiter comme texte avec retours à la ligne
              const plainTextInstructions = recipeData.instructions
                .split(/\n+/)
                .map(instruction => instruction.trim())
                .filter(instruction => instruction.length > 0)
                .map(instruction => {
                  // Nettoyer les numéros au début si présents
                  return instruction.replace(/^\d+\.\s*/, '');
                });
              setInstructions(plainTextInstructions);
            }
          } else {
            setInstructions([]);
          }
        } catch (error) {
          console.error('Error parsing instructions:', error);
          setInstructions([]);
        }
      } else {
        console.log('No instructions found for recipe');
        setInstructions([]);
      }
    } catch (error) {
      console.error('Error fetching recipe details:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de la recette",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    if (!id) return;
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;

    try {
      await deleteRecipe(id);
      toast({
        title: "Recette supprimée",
        description: "La recette a été supprimée avec succès",
      });
      setShowDeleteDialog(false);
      navigate('/recipes');
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la recette",
        variant: "destructive"
      });
      setShowDeleteDialog(false);
    }
  };

  const handleAddToShoppingList = async () => {
    if (!inventoryAnalysis || inventoryAnalysis.missingIngredients.length === 0) {
      toast({
        title: "Aucun ingrédient manquant",
        description: "Tous les ingrédients sont déjà disponibles dans votre inventaire !",
      });
      return;
    }

    setAddingToCart(true);
    try {
      // Ajouter chaque ingrédient manquant à la liste de courses
      for (const missing of inventoryAnalysis.missingIngredients) {
        await addToShoppingList({
          productName: missing.ingredient.ingredient_name,
          quantity: missing.ingredient.quantity || 1,
          category: getStoreSectionForIngredient(missing.ingredient.ingredient_name),
          unit: missing.ingredient.unit || 'unité',
          estimatedPrice: missing.estimatedPrice,
          storeSection: getStoreSectionForIngredient(missing.ingredient.ingredient_name)
        });
      }

      toast({
        title: "Ajouté à la liste de courses",
        description: `${inventoryAnalysis.missingIngredients.length} ingrédients ajoutés à votre liste`,
      });

      // Optionnel : naviguer vers la liste de courses
      // navigate('/shopping');
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les ingrédients à la liste de courses",
        variant: "destructive"
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleCook = async () => {
    if (!inventoryAnalysis || inventoryAnalysis.availableIngredients.length === 0) {
      toast({
        title: "Rien à décrémenter",
        description: "Aucun ingrédient disponible dans l'inventaire.",
      });
    
      return;
    }

    setCooking(true);
    try {
      const updates: { id: string; prev: number; next: number }[] = [];
      for (const match of inventoryAnalysis.availableIngredients) {
        const inv: any = match.inventoryItem;
        const ing: any = match.ingredient;
        const prevQty = Number(inv.quantity) || 0;
        const reqQty = Number(ing.quantity) || 1;
        const nextQty = Math.max(0, prevQty - reqQty);
        if (nextQty !== prevQty) updates.push({ id: inv.id, prev: prevQty, next: nextQty });
      }

      if (updates.length === 0) {
        toast({ title: "Quantités inchangées", description: "Aucun changement à appliquer." });
        setCooking(false);
        return;
      }

      await Promise.all(updates.map(u => supabase.from('inventory').update({ quantity: u.next }).eq('id', u.id)));

      toast({
        title: "Cuisiné",
        description: "Les ingrédients ont été décrémentés de l'inventaire.",
        action: {
          label: 'Annuler',
          onClick: async () => {
            try {
              await Promise.all(updates.map(u => supabase.from('inventory').update({ quantity: u.prev }).eq('id', u.id)));
            } catch {}
          }
        }
      });
    } catch (error) {
      console.error('Cook error:', error);
      toast({ title: 'Erreur', description: "Impossible de mettre à jour l'inventaire", variant: 'destructive' });
    } finally {
      setCooking(false);
    }
  };

  // Helper function pour déterminer la section du magasin
  const getStoreSectionForIngredient = (ingredientName: string): string => {
    const name = ingredientName.toLowerCase().trim();
    
    // Catégories simplifiées pour la liste de courses
    if (name.includes('tomate') || name.includes('carotte') || name.includes('oignon') || 
        name.includes('pomme') || name.includes('salade') || name.includes('légume') || 
        name.includes('fruit')) {
      return 'Fruits et légumes';
    }
    if (name.includes('viande') || name.includes('poulet') || name.includes('boeuf') || 
        name.includes('porc')) {
      return 'Boucherie';
    }
    if (name.includes('poisson') || name.includes('saumon') || name.includes('thon')) {
      return 'Poissonnerie';
    }
    if (name.includes('lait') || name.includes('fromage') || name.includes('yaourt') || 
        name.includes('beurre')) {
      return 'Produits laitiers';
    }
    if (name.includes('pain') || name.includes('baguette')) {
      return 'Boulangerie';
    }
    
    return 'Épicerie';
  };

  const getCuisineColor = (category: string) => {
    const colors: Record<string, string> = {
      'Française': 'bg-info/10 text-info',
      'Italienne': 'bg-success/10 text-success',
      'Asiatique': 'bg-destructive/10 text-destructive',
      'Méditerranéenne': 'bg-warning/10 text-warning',
      'Mexicaine': 'bg-warning/20 text-warning',
      'Indienne': 'bg-accent/10 text-accent',
      'Japonaise': 'bg-primary/10 text-primary',
      'Américaine': 'bg-info/20 text-info',
      'Végétarienne': 'bg-success/20 text-success',
      'Végan': 'bg-success/15 text-success',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  const getInventoryStatusIcon = (isAvailable: boolean, isEssential: boolean) => {
    if (isAvailable) return <CheckCircle className="w-4 h-4 text-success" />;
    if (isEssential) return <XCircle className="w-4 h-4 text-destructive" />;
    return <AlertCircle className="w-4 h-4 text-warning" />;
  };

  if (!recipe && !loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="mb-4">
            {recipeDeleted ? (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Recette supprimée</h2>
                <p className="text-muted-foreground mb-4">
                  Cette recette a été supprimée et n'est plus disponible.
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Recette non trouvée</h2>
                <p className="text-muted-foreground mb-4">
                  Cette recette n'existe pas ou n'est plus accessible.
                </p>
              </>
            )}
          </div>
          <Button onClick={() => navigate('/recipes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux recettes
          </Button>
        </div>
      </div>
    );
  }
  
  // Afficher un skeleton pendant le chargement
  if (loading || !recipe) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalTime = recipe.prep_time + recipe.cook_time;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/recipes')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux recettes
        </Button>

        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>
            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Heart className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate(`/recipes/${id}/edit`)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDeleteClick}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4">
          {recipe.cuisine_category && (
            <Badge className={getCuisineColor(recipe.cuisine_category)}>
              {recipe.cuisine_category}
            </Badge>
          )}
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{totalTime} min</span>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{recipe.servings} personnes</span>
          </div>
          
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < recipe.difficulty
                    ? 'fill-warning text-warning'
                    : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Image */}
      {recipe.image_url && (
        <div className="mb-6">
          <img 
            src={recipe.image_url} 
            alt={recipe.name}
            className="w-full h-64 md:h-96 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Inventory Status */}
      {inventoryAnalysis && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Analyse de l'inventaire</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <p className="font-medium">
                  {inventoryAnalysis.canMake ? '✅ Réalisable' : '❌ Ingrédients manquants'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponibles</p>
                <p className="font-medium">{inventoryAnalysis.availableIngredients.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manquants</p>
                <p className="font-medium text-orange-600">
                  {inventoryAnalysis.missingIngredients.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coût total recette</p>
                <p className="font-medium">
                  {inventoryAnalysis.totalRecipeCost?.toFixed(2) || '0.00'}€
                  {indianPriceEstimate && isIndianRecipe(recipe.cuisine_category, recipe.tags) && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (Épicerie indienne: {indianPriceEstimate.totalCost}€)
                    </span>
                  )}
                </p>
              </div>
            </div>
            {inventoryAnalysis.missingIngredients.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Coût des ingrédients manquants:
                  </span>
                  <span className="font-medium text-orange-600">
                    {inventoryAnalysis.estimatedCost?.toFixed(2) || '0.00'}€
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Ingredients */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Ingrédients</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-6 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {ingredients.map((ingredient) => {
                  const isAvailable = inventoryAnalysis?.availableIngredients.some(
                    ai => ai.ingredient.ingredient_name === ingredient.ingredient_name
                  );
                  
                  return (
                    <div 
                      key={ingredient.id} 
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        !isAvailable && ingredient.is_essential 
                          ? 'bg-red-50' 
                          : !isAvailable 
                          ? 'bg-yellow-50' 
                          : 'bg-green-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getInventoryStatusIcon(isAvailable || false, ingredient.is_essential)}
                        <span className={!isAvailable ? 'text-muted-foreground' : ''}>
                          {ingredient.quantity} {ingredient.unit} {ingredient.ingredient_name}
                        </span>
                      </div>
                      {ingredient.notes && (
                        <span className="text-xs text-muted-foreground">{ingredient.notes}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <Button 
                onClick={handleAddToShoppingList}
                disabled={inventoryAnalysis?.canMake || addingToCart}
              >
                {addingToCart ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Ajout en cours...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Ajouter les manquants
                  </>
                )}
              </Button>
              <Button 
                variant="secondary"
                onClick={handleCook}
                disabled={cooking || !inventoryAnalysis?.availableIngredients?.length}
              >
                {cooking ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4 mr-2" />
                    Cuisiner (décrémenter)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Valeurs nutritionnelles */}
        {ingredients.length > 0 && (
          <RecipeNutrition 
            ingredients={ingredients}
            servings={recipe.servings || 4}
          />
        )}

        {/* Instructions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : instructions.length > 0 ? (
              <ol className="space-y-4">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <p className="pt-1">{instruction}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground">Aucune instruction disponible</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Indian Price Estimate Card */}
      {indianPriceEstimate && isIndianRecipe(recipe.cuisine_category, recipe.tags) && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5" />
              Estimation prix épicerie indienne
            </h2>
            <div className="space-y-2">
              {indianPriceEstimate.estimates.map((estimate: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {estimate.quantity} {estimate.unit} {estimate.name}
                    {estimate.englishName !== estimate.frenchName && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({estimate.englishName})
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{estimate.estimatedPrice.toFixed(2)}€</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total estimé</span>
                <span>{indianPriceEstimate.totalCost}€</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {indianPriceEstimate.disclaimer}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Info */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Informations supplémentaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Temps de préparation</p>
              <p className="font-medium">{recipe.prep_time} min</p>
            </div>
            <div>
              <p className="text-muted-foreground">Temps de cuisson</p>
              <p className="font-medium">{recipe.cook_time} min</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type de repas</p>
              <p className="font-medium">{recipe.meal_type || 'Non spécifié'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Créée le</p>
              <p className="font-medium">
                {new Date(recipe.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-4">
              <p className="text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
        </CardContent>
      </Card>

      {/* PRP-220.17: source provenance for imported recipes. The card
          self-hides for manual recipes so the existing UX is unchanged
          for hand-typed entries. */}
      <RecipeSourceCard recipe={recipe as unknown as RecipeSourceLike} className="mt-4" />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette recette ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La recette "{recipe?.name}" sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecipeDetail;
