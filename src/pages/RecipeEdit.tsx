import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Upload,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRecipes } from "@/hooks/useRecipes";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RecipeIngredient {
  id?: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  is_essential: boolean;
  notes?: string;
}

const RecipeEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, updateRecipe } = useRecipes();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recipe, setRecipe] = useState({
    name: '',
    description: '',
    image_url: '',
    cuisine_category: '',
    meal_type: '',
    prep_time: 0,
    cook_time: 0,
    servings: 4,
    difficulty: 3,
    is_public: false,
    tags: [] as string[]
  });
  
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const existingRecipe = recipes.find(r => r.id === id);

  useEffect(() => {
    if (id && existingRecipe) {
      fetchRecipeDetails();
    }
  }, [id, existingRecipe]);

  const fetchRecipeDetails = async () => {
    try {
      setLoading(true);
      
      // Set basic recipe data
      setRecipe({
        name: existingRecipe?.name || '',
        description: existingRecipe?.description || '',
        image_url: existingRecipe?.image_url || '',
        cuisine_category: existingRecipe?.cuisine_category || '',
        meal_type: existingRecipe?.meal_type || '',
        prep_time: existingRecipe?.prep_time || 0,
        cook_time: existingRecipe?.cook_time || 0,
        servings: existingRecipe?.servings || 4,
        difficulty: existingRecipe?.difficulty || 3,
        is_public: existingRecipe?.is_public || false,
        tags: existingRecipe?.tags || []
      });
      
      setImagePreview(existingRecipe?.image_url || '');
      
      // Fetch ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('created_at');

      if (ingredientsError) throw ingredientsError;
      setIngredients(ingredientsData || []);

      // Parse instructions
      if (existingRecipe?.instructions) {
        try {
          // Si c'est déjà un tableau, on l'utilise directement
          if (Array.isArray(existingRecipe.instructions)) {
            setInstructions(existingRecipe.instructions.length > 0 ? existingRecipe.instructions : ['']);
          } else if (typeof existingRecipe.instructions === 'string') {
            // Essayer de parser comme JSON
            try {
              const parsed = JSON.parse(existingRecipe.instructions);
              setInstructions(Array.isArray(parsed) ? parsed : ['']);
            } catch (e) {
              // Si ce n'est pas du JSON, traiter comme texte brut
              const plainTextInstructions = existingRecipe.instructions
                .split(/\n/)
                .map(instruction => instruction.trim())
                .filter(instruction => instruction.length > 0);
              setInstructions(plainTextInstructions.length > 0 ? plainTextInstructions : ['']);
            }
          } else {
            setInstructions(['']);
          }
        } catch (error) {
          console.error('Error parsing instructions:', error);
          setInstructions(['']);
        }
      } else {
        setInstructions(['']);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return recipe.image_url;
    
    try {
      setUploading(true);
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `recipe-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger l'image",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Upload image if changed
      let imageUrl = recipe.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) imageUrl = uploadedUrl;
      }
      
      // Update recipe
      // Formatter les instructions : soit comme texte simple avec retours à la ligne, soit comme JSON
      const formattedInstructions = instructions
        .filter(i => i.trim())
        .join('\n');
      
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          ...recipe,
          image_url: imageUrl,
          instructions: formattedInstructions,
          // Ingredients are about to be deleted + re-inserted below,
          // so any persisted nutrition snapshot is stale. Null it
          // out — the next RecipeDetail view will lazy-recompute.
          nutrition_info: null,
        })
        .eq('id', id);

      if (recipeError) throw recipeError;

      // Update ingredients — DELETE then INSERT, but preserve the
      // inventory_product_id FK when the ingredient name hasn't
      // changed. The previous implementation always wiped the FK,
      // which broke recipe→inventory matching after every save (each
      // save sent every ingredient back to "missing" until the
      // backfill script was re-run).
      //
      // Strategy: re-fetch the current FK + name per ingredient id
      // BEFORE deleting, then on INSERT carry the FK forward when the
      // name is identical (case-insensitive trim). A name change
      // means the FK is stale — clear it so it can be re-resolved.
      const existingIds = ingredients
        .map((ing) => (ing as { id?: string }).id)
        .filter((x): x is string => Boolean(x));
      const fkByIngredientId = new Map<string, { product_id: string | null; name: string }>();
      if (existingIds.length > 0) {
        const { data: existing } = await supabase
          .from('recipe_ingredients')
          .select('id, ingredient_name, inventory_product_id')
          .in('id', existingIds);
        for (const r of (existing ?? []) as Array<{
          id: string;
          ingredient_name: string;
          inventory_product_id: string | null;
        }>) {
          fkByIngredientId.set(r.id, {
            product_id: r.inventory_product_id,
            name: r.ingredient_name,
          });
        }
      }

      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id);

      if (deleteError) throw deleteError;

      if (ingredients.length > 0) {
        const normalize = (s: string) => s.trim().toLowerCase();
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            ingredients.map((ing) => {
              const ingId = (ing as { id?: string }).id;
              const prior = ingId ? fkByIngredientId.get(ingId) : undefined;
              const sameName =
                prior && normalize(prior.name) === normalize(ing.ingredient_name);
              return {
                recipe_id: id,
                ingredient_name: ing.ingredient_name,
                quantity: ing.quantity,
                unit: ing.unit,
                is_essential: ing.is_essential,
                notes: ing.notes,
                inventory_product_id: sameName ? prior!.product_id : null,
              };
            })
          );

        if (ingredientsError) throw ingredientsError;
      }

      toast({
        title: "Recette mise à jour",
        description: "Les modifications ont été enregistrées avec succès",
      });
      
      navigate(`/kitchen/recipes/${id}`);
    } catch (error) {
      console.error('Error updating recipe:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la recette",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, {
      ingredient_name: '',
      quantity: 1,
      unit: 'g',
      is_essential: true
    }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setRecipe({ ...recipe, image_url: '' });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!existingRecipe) {
    return (
      <div className="page-container">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">Recette non trouvée</h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux recettes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/kitchen/recipes/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à la recette
        </Button>

        <h1 className="text-3xl font-bold">Modifier la recette</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-28">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nom de la recette</Label>
              <Input
                id="name"
                value={recipe.name}
                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={recipe.description}
                onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cuisine">Cuisine</Label>
                <Select 
                  value={recipe.cuisine_category} 
                  onValueChange={(value) => setRecipe({ ...recipe, cuisine_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Française">Française</SelectItem>
                    <SelectItem value="Italienne">Italienne</SelectItem>
                    <SelectItem value="Asiatique">Asiatique</SelectItem>
                    <SelectItem value="Méditerranéenne">Méditerranéenne</SelectItem>
                    <SelectItem value="Mexicaine">Mexicaine</SelectItem>
                    <SelectItem value="Indienne">Indienne</SelectItem>
                    <SelectItem value="Végétarienne">Végétarienne</SelectItem>
                    <SelectItem value="Végan">Végan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="meal_type">Type de repas</Label>
                <Select 
                  value={recipe.meal_type} 
                  onValueChange={(value) => setRecipe({ ...recipe, meal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Petit-déjeuner">Petit-déjeuner</SelectItem>
                    <SelectItem value="Déjeuner">Déjeuner</SelectItem>
                    <SelectItem value="Dîner">Dîner</SelectItem>
                    <SelectItem value="Dessert">Dessert</SelectItem>
                    <SelectItem value="Collation">Collation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="prep_time">Temps de préparation (min)</Label>
                <Input
                  id="prep_time"
                  type="number"
                  value={recipe.prep_time}
                  onChange={(e) => setRecipe({ ...recipe, prep_time: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="cook_time">Temps de cuisson (min)</Label>
                <Input
                  id="cook_time"
                  type="number"
                  value={recipe.cook_time}
                  onChange={(e) => setRecipe({ ...recipe, cook_time: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="servings">Portions</Label>
                <Input
                  id="servings"
                  type="number"
                  value={recipe.servings}
                  onChange={(e) => setRecipe({ ...recipe, servings: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulté (1-5)</Label>
                <Input
                  id="difficulty"
                  type="number"
                  value={recipe.difficulty}
                  onChange={(e) => setRecipe({ ...recipe, difficulty: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image */}
        <Card>
          <CardHeader>
            <CardTitle>Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {imagePreview && (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div>
                <Label htmlFor="image">
                  {imagePreview ? 'Remplacer l\'image' : 'Ajouter une image'}
                </Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>Ingrédients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Ingrédient</Label>
                    <Input
                      value={ingredient.ingredient_name}
                      onChange={(e) => updateIngredient(index, 'ingredient_name', e.target.value)}
                      placeholder="Nom de l'ingrédient"
                      required
                    />
                  </div>
                  
                  <div className="w-24">
                    <Label>Quantité</Label>
                    <Input
                      type="number"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.1"
                      required
                    />
                  </div>
                  
                  <div className="w-32">
                    <Label>Unité</Label>
                    <Select 
                      value={ingredient.unit} 
                      onValueChange={(value) => updateIngredient(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="cl">cl</SelectItem>
                        <SelectItem value="dl">dl</SelectItem>
                        <SelectItem value="c. à soupe">c. à soupe</SelectItem>
                        <SelectItem value="c. à café">c. à café</SelectItem>
                        <SelectItem value="tasse">tasse</SelectItem>
                        <SelectItem value="verre">verre</SelectItem>
                        <SelectItem value="pincée">pincée</SelectItem>
                        <SelectItem value="unité">unité</SelectItem>
                        <SelectItem value="tranche">tranche</SelectItem>
                        <SelectItem value="feuille">feuille</SelectItem>
                        <SelectItem value="gousse">gousse</SelectItem>
                        <SelectItem value="branche">branche</SelectItem>
                        <SelectItem value="bouquet">bouquet</SelectItem>
                        <SelectItem value="sachet">sachet</SelectItem>
                        <SelectItem value="boîte">boîte</SelectItem>
                        <SelectItem value="pot">pot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`essential-${index}`}
                      checked={ingredient.is_essential}
                      onChange={(e) => updateIngredient(index, 'is_essential', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`essential-${index}`} className="text-sm">
                      Essentiel
                    </Label>
                  </div>
                  
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addIngredient}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un ingrédient
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <Textarea
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder="Décrivez cette étape..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeInstruction(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addInstruction}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une étape
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visibilité */}
        <Card>
          <CardHeader>
            <CardTitle>Visibilité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recipe.is_public}
                onChange={e => setRecipe({ ...recipe, is_public: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <div className="space-y-1">
                <span className="font-medium">Rendre cette recette publique</span>
                <p className="text-sm text-muted-foreground">
                  Une recette publique peut être ajoutée au catalogue partagé. Désactive
                  pour la garder dans ta bibliothèque privée.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Source (lecture seule, masquée pour les recettes manuelles) */}
        {existingRecipe?.source_url && (
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Cette recette a été importée. La source d'origine ne peut pas être modifiée
                ici.
              </p>
              <a
                href={existingRecipe.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline break-all"
              >
                {existingRecipe.source_url}
              </a>
            </CardContent>
          </Card>
        )}
      </form>

      {/* Sticky CTA footer (PRP-232 §10) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t shadow-lg z-30">
        <div className="container mx-auto max-w-4xl flex gap-3 justify-end p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/kitchen/recipes/${id}`)}
            disabled={loading || uploading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form=""
            disabled={loading || uploading}
            onClick={e => {
              // Le bouton est hors du <form> pour rester sticky.
              // On déclenche manuellement la soumission.
              e.preventDefault();
              (document.querySelector('form') as HTMLFormElement | null)?.requestSubmit();
            }}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecipeEdit;