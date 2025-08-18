import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Clock, Users, ChefHat, Link } from 'lucide-react';

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

interface Instruction {
  step: number;
  description: string;
}

interface ExtractedRecipe {
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  metadata: {
    duration?: string;
    servings?: number;
    confidence: number;
    processingTime?: number;
    platform: string;
    extractionMethod: string;
  };
  processingTime?: string;
}

interface ExtractedRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: ExtractedRecipe | null;
  sourceUrl?: string;
  onConfirm: (recipe: any) => void;
  onCancel: () => void;
  saving?: boolean;
}

const CUISINE_OPTIONS = [
  "Française", "Italienne", "Asiatique", "Méditerranéenne", 
  "Végétarienne", "Mexicaine", "Indienne", "Japonaise", "Autre"
];

const MEAL_TYPE_OPTIONS = [
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
  { value: "snack", label: "Collation" },
  { value: "dessert", label: "Dessert" },
  { value: "main", label: "Plat principal" },
  { value: "side", label: "Accompagnement" },
  { value: "appetizer", label: "Entrée" }
];

export const ExtractedRecipeModal: React.FC<ExtractedRecipeModalProps> = ({
  open,
  onOpenChange,
  recipe,
  sourceUrl,
  onConfirm,
  onCancel,
  saving = false
}) => {
  const [editedRecipe, setEditedRecipe] = useState<any>(null);

  React.useEffect(() => {
    if (recipe) {
      // Extraire le temps de cuisson de la durée si disponible
      const cookTime = recipe.metadata.duration ? 
        parseInt(recipe.metadata.duration.replace(/\D/g, '') || '30') : 30;
      
      setEditedRecipe({
        name: recipe.title,
        description: recipe.description || '',
        cuisine_category: 'Autre',
        meal_type: 'main',
        prep_time: 15,
        cook_time: cookTime,
        servings: recipe.metadata.servings || 4,
        difficulty: 3,
        tags: [],
        is_public: false,
        ingredients: recipe.ingredients.map((ing, index) => ({
          ingredient_name: ing.name,
          quantity: parseFloat(ing.amount) || 1,
          unit: ing.unit || '',
          order_index: index,
          is_essential: true
        })),
        instructions: recipe.instructions
          .map(inst => `${inst.step}. ${inst.description}`)
          .join('\n')
      });
    }
  }, [recipe]);

  if (!recipe || !editedRecipe) return null;

  const updateField = (field: string, value: any) => {
    setEditedRecipe({ ...editedRecipe, [field]: value });
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...editedRecipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    updateField('ingredients', newIngredients);
  };

  const addIngredient = () => {
    const newIngredients = [...editedRecipe.ingredients, {
      ingredient_name: '',
      quantity: 1,
      unit: '',
      order_index: editedRecipe.ingredients.length,
      is_essential: true
    }];
    updateField('ingredients', newIngredients);
  };

  const removeIngredient = (index: number) => {
    const newIngredients = editedRecipe.ingredients.filter((_: any, i: number) => i !== index);
    updateField('ingredients', newIngredients);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmer la recette extraite</DialogTitle>
          <DialogDescription>
            Vérifiez et modifiez si nécessaire les informations extraites de la vidéo Instagram.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Métadonnées d'extraction */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  Extraction: {recipe.processingTime || `${recipe.metadata.processingTime}ms`}
                </Badge>
                <Badge variant="secondary">
                  Confiance IA: {Math.round(recipe.metadata.confidence * 100)}%
                </Badge>
                <Badge variant="secondary">
                  Source: {recipe.metadata.platform}
                </Badge>
                {sourceUrl && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => window.open(sourceUrl, '_blank')}>
                    <Link className="w-3 h-3 mr-1" />
                    Voir la source
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informations de base */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom de la recette</Label>
              <Input
                id="name"
                value={editedRecipe.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedRecipe.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cuisine">Cuisine</Label>
                <Select
                  value={editedRecipe.cuisine_category}
                  onValueChange={(value) => updateField('cuisine_category', value)}
                >
                  <SelectTrigger id="cuisine">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUISINE_OPTIONS.map(cuisine => (
                      <SelectItem key={cuisine} value={cuisine}>
                        {cuisine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="meal_type">Type de repas</Label>
                <Select
                  value={editedRecipe.meal_type}
                  onValueChange={(value) => updateField('meal_type', value)}
                >
                  <SelectTrigger id="meal_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPE_OPTIONS.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prep_time">Préparation (min)</Label>
                <Input
                  id="prep_time"
                  type="number"
                  value={editedRecipe.prep_time}
                  onChange={(e) => updateField('prep_time', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cook_time">Cuisson (min)</Label>
                <Input
                  id="cook_time"
                  type="number"
                  value={editedRecipe.cook_time}
                  onChange={(e) => updateField('cook_time', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="servings">Portions</Label>
                <Input
                  id="servings"
                  type="number"
                  value={editedRecipe.servings}
                  onChange={(e) => updateField('servings', parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulté (1-5)</Label>
                <Input
                  id="difficulty"
                  type="number"
                  min="1"
                  max="5"
                  value={editedRecipe.difficulty}
                  onChange={(e) => updateField('difficulty', parseInt(e.target.value) || 3)}
                />
              </div>
            </div>
          </div>

          {/* Ingrédients */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Ingrédients</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredient}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {editedRecipe.ingredients.map((ingredient: any, index: number) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Ingrédient"
                    value={ingredient.ingredient_name}
                    onChange={(e) => updateIngredient(index, 'ingredient_name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Quantité"
                    type="number"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <Input
                    placeholder="Unité"
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="grid gap-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={editedRecipe.instructions}
              onChange={(e) => updateField('instructions', e.target.value)}
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            onClick={() => onConfirm(editedRecipe)}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer la recette'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};