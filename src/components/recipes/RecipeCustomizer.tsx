/**
 * Composant de personnalisation de recettes
 * Permet aux utilisateurs de modifier les recettes du catalogue selon leurs goûts
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Edit3,
  Save,
  RotateCcw,
  Users,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  Clock,
  FileText,
  Star,
  Info,
  AlertCircle
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

import type { CatalogRecipe } from '@/hooks/useRecipeCatalog';
import type { UserRecipe } from '@/hooks/useUserRecipes';
import { useUserRecipes, getRecipeTitle, getRecipeIngredients, getRecipeInstructions } from '@/hooks/useUserRecipes';

interface RecipeCustomizerProps {
  recipe: UserRecipe;
  catalogRecipe?: CatalogRecipe;
  isOpen: boolean;
  onClose: () => void;
}

interface CustomizationState {
  title?: string;
  ingredients_override?: Array<{
    name: string;
    amount: string;
    unit: string;
    notes?: string;
  }>;
  instructions_append?: string;
  servings_multiplier?: number;
  personal_notes_inline?: string;
}

export default function RecipeCustomizer({ 
  recipe, 
  catalogRecipe, 
  isOpen, 
  onClose 
}: RecipeCustomizerProps) {
  const { updateRecipe, isUpdating } = useUserRecipes();
  
  // État des personnalisations
  const [customizations, setCustomizations] = useState<CustomizationState>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('ingredients');

  // Initialiser les données
  useEffect(() => {
    if (recipe && isOpen) {
      setCustomizations(recipe.custom_modifications || {});
      setHasChanges(false);
    }
  }, [recipe, isOpen]);

  // Détecter les changements
  useEffect(() => {
    const originalCustomizations = recipe?.custom_modifications || {};
    const hasChangesNow = JSON.stringify(customizations) !== JSON.stringify(originalCustomizations);
    setHasChanges(hasChangesNow);
  }, [customizations, recipe]);

  const baseIngredients = getRecipeIngredients(recipe);
  const baseInstructions = getRecipeInstructions(recipe);
  const currentTitle = customizations.title || getRecipeTitle(recipe);

  const handleUpdateCustomization = (key: keyof CustomizationState, value: any) => {
    setCustomizations(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleIngredientChange = (index: number, field: string, value: string) => {
    const currentIngredients = customizations.ingredients_override || baseIngredients;
    const newIngredients = [...currentIngredients];
    
    if (newIngredients[index]) {
      newIngredients[index] = {
        ...newIngredients[index],
        [field]: value
      };
      
      handleUpdateCustomization('ingredients_override', newIngredients);
    }
  };

  const handleAddIngredient = () => {
    const currentIngredients = customizations.ingredients_override || baseIngredients;
    const newIngredients = [
      ...currentIngredients,
      { name: '', amount: '', unit: '' }
    ];
    handleUpdateCustomization('ingredients_override', newIngredients);
  };

  const handleRemoveIngredient = (index: number) => {
    const currentIngredients = customizations.ingredients_override || baseIngredients;
    const newIngredients = currentIngredients.filter((_, i) => i !== index);
    handleUpdateCustomization('ingredients_override', newIngredients);
  };

  const handleMultiplyServings = (multiplier: number) => {
    if (!catalogRecipe) return;
    
    const newIngredients = baseIngredients.map(ingredient => {
      const numericAmount = parseFloat(ingredient.amount);
      if (!isNaN(numericAmount)) {
        return {
          ...ingredient,
          amount: (numericAmount * multiplier).toString()
        };
      }
      return ingredient;
    });
    
    handleUpdateCustomization('ingredients_override', newIngredients);
    handleUpdateCustomization('servings_multiplier', multiplier);
  };

  const handleSave = async () => {
    try {
      await updateRecipe({
        recipeId: recipe.id,
        updates: {
          custom_modifications: customizations,
          updated_at: new Date().toISOString()
        }
      });
      
      toast({
        title: "Personnalisation sauvegardée !",
        description: "Vos modifications ont été appliquées à la recette.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    if (confirm("Êtes-vous sûr de vouloir annuler toutes vos personnalisations ?")) {
      setCustomizations({});
      setHasChanges(true);
    }
  };

  const currentIngredients = customizations.ingredients_override || baseIngredients;
  const servingsMultiplier = customizations.servings_multiplier || 1;
  const originalServings = catalogRecipe?.servings || 4;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Personnaliser la recette
          </DialogTitle>
          <DialogDescription>
            Adaptez cette recette selon vos goûts et contraintes
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="ingredients">Ingrédients</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="portions">Portions</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {/* Onglet Ingrédients */}
              <TabsContent value="ingredients" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Liste des ingrédients</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMultiplyServings(0.5)}
                      disabled={servingsMultiplier <= 0.5}
                    >
                      ÷2
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMultiplyServings(2)}
                    >
                      ×2
                    </Button>
                  </div>
                </div>

                {servingsMultiplier !== 1 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Quantités ajustées pour {Math.round(originalServings * servingsMultiplier)} portions 
                      (×{servingsMultiplier})
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  {currentIngredients.map((ingredient, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="col-span-5">
                        <Input
                          placeholder="Nom de l'ingrédient"
                          value={ingredient.name}
                          onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          placeholder="Quantité"
                          value={ingredient.amount}
                          onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          placeholder="Unité"
                          value={ingredient.unit}
                          onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          placeholder="Notes"
                          value={ingredient.notes || ''}
                          onChange={(e) => handleIngredientChange(index, 'notes', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveIngredient(index)}
                          className="h-8 w-8 p-0 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={handleAddIngredient}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un ingrédient
                </Button>
              </TabsContent>

              {/* Onglet Instructions */}
              <TabsContent value="instructions" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Instructions de base</h3>
                  <div className="p-4 bg-gray-50 rounded-lg mb-6">
                    <p className="whitespace-pre-wrap text-sm">
                      {baseInstructions.split('\n\nNotes personnelles:')[0]}
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="instructions-append">Notes et modifications personnelles</Label>
                  <Textarea
                    id="instructions-append"
                    placeholder="Ajoutez vos propres étapes, astuces ou modifications..."
                    value={customizations.instructions_append || ''}
                    onChange={(e) => handleUpdateCustomization('instructions_append', e.target.value)}
                    rows={6}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Ces notes seront ajoutées à la fin des instructions originales.
                  </p>
                </div>
              </TabsContent>

              {/* Onglet Portions */}
              <TabsContent value="portions" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Ajustement des portions</h3>
                  
                  {catalogRecipe && (
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle className="text-base">Recette originale</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span>{catalogRecipe.servings} portions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>{catalogRecipe.prep_time + catalogRecipe.cook_time} min</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-4">
                    <Label>Multiplicateur de portions</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMultiplyServings(Math.max(0.25, servingsMultiplier - 0.25))}
                        disabled={servingsMultiplier <= 0.25}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex-1 text-center">
                        <div className="text-2xl font-bold">×{servingsMultiplier}</div>
                        <div className="text-sm text-gray-500">
                          {Math.round(originalServings * servingsMultiplier)} portions
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMultiplyServings(servingsMultiplier + 0.25)}
                        disabled={servingsMultiplier >= 4}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-2 justify-center">
                      {[0.5, 1, 1.5, 2, 3, 4].map((mult) => (
                        <Button
                          key={mult}
                          variant={servingsMultiplier === mult ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleMultiplyServings(mult)}
                        >
                          ×{mult}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Onglet Notes */}
              <TabsContent value="notes" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notes personnelles</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="personal-notes">Notes générales</Label>
                      <Textarea
                        id="personal-notes"
                        placeholder="Vos notes, conseils, variantes, souvenirs liés à cette recette..."
                        value={customizations.personal_notes_inline || ''}
                        onChange={(e) => handleUpdateCustomization('personal_notes_inline', e.target.value)}
                        rows={6}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="custom-title">Titre personnalisé</Label>
                      <Input
                        id="custom-title"
                        placeholder="Donnez un nom personnel à cette recette"
                        value={customizations.title || ''}
                        onChange={(e) => handleUpdateCustomization('title', e.target.value)}
                        className="mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Laissez vide pour garder le titre original
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {hasChanges && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="text-red-600 hover:text-red-700"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!hasChanges || isUpdating}
              >
                {isUpdating ? (
                  <>Sauvegarde...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {hasChanges && (
            <div className="w-full">
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Vous avez des modifications non sauvegardées
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Composant pour prévisualiser les changements
export function CustomizationPreview({ 
  recipe, 
  catalogRecipe 
}: { 
  recipe: UserRecipe;
  catalogRecipe?: CatalogRecipe;
}) {
  const customizations = recipe.custom_modifications || {};
  const hasCustomizations = Object.keys(customizations).length > 0;

  if (!hasCustomizations) return null;

  const changes = [];

  if (customizations.title) {
    changes.push({
      type: 'title',
      icon: FileText,
      label: 'Titre personnalisé',
      value: customizations.title
    });
  }

  if (customizations.ingredients_override) {
    changes.push({
      type: 'ingredients',
      icon: ChefHat,
      label: 'Ingrédients modifiés',
      value: `${customizations.ingredients_override.length} ingrédients`
    });
  }

  if (customizations.servings_multiplier && customizations.servings_multiplier !== 1) {
    changes.push({
      type: 'servings',
      icon: Users,
      label: 'Portions ajustées',
      value: `×${customizations.servings_multiplier}`
    });
  }

  if (customizations.instructions_append) {
    changes.push({
      type: 'instructions',
      icon: FileText,
      label: 'Instructions personnalisées',
      value: 'Notes ajoutées'
    });
  }

  if (customizations.personal_notes_inline) {
    changes.push({
      type: 'notes',
      icon: Star,
      label: 'Notes personnelles',
      value: 'Ajoutées'
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
        <Edit3 className="h-4 w-4" />
        <span>Recette personnalisée</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {changes.map((change, index) => {
          const IconComponent = change.icon;
          return (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              <IconComponent className="h-3 w-3" />
              <span className="text-xs">{change.label}</span>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}