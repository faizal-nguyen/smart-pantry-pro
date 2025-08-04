import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Edit3, 
  Check, 
  X, 
  Loader2, 
  ChefHat,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { 
  parseRecipeVoiceInput, 
  ParsedRecipeVoice, 
  ParsedIngredientVoice,
  recipeExamplePhrases 
} from "@/utils/recipeVoiceParser";
import { useToast } from "@/hooks/use-toast";

interface RecipeVoiceInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipeValidated?: (recipe: ValidatedRecipe) => void;
}

export interface ValidatedRecipe {
  name: string;
  ingredients: ValidatedIngredient[];
  instructions?: string;
  cookingTime?: number;
  prepTime?: number;
  servings?: number;
  confidence: number;
}

interface ValidatedIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  is_essential: boolean;
}

const COOKING_UNITS = [
  "unité", "g", "kg", "ml", "L", "cl", "dl",
  "c.à.s", "c.à.c", "tasse", "verre", "bol",
  "pincée", "poignée", "gousse", "branche", "feuille",
  "œuf", "jaune d'œuf", "blanc d'œuf", "tranche", "morceau"
];

const RecipeVoiceInput = ({ open, onOpenChange, onRecipeValidated }: RecipeVoiceInputProps) => {
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipeVoice | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<ValidatedRecipe | null>(null);
  const [currentStep, setCurrentStep] = useState<'listening' | 'validating' | 'editing'>('listening');
  const [selectedExample, setSelectedExample] = useState<string>("");
  
  const { toast } = useToast();
  
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError
  } = useSpeechRecognition();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setParsedRecipe(null);
      setEditingRecipe(null);
      setCurrentStep('listening');
      resetTranscript();
    }
  }, [open, resetTranscript]);

  // Parse transcript when it changes
  useEffect(() => {
    if (transcript && transcript.length > 10) {
      const result = parseRecipeVoiceInput(transcript);
      setParsedRecipe(result);
      
      if (result.success && result.confidence > 0.5) {
        setCurrentStep('validating');
        
        // Auto-convert to editable format
        const validated: ValidatedRecipe = {
          name: result.recipeName || 'Recette vocale',
          ingredients: result.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            is_essential: ing.isEssential
          })),
          instructions: result.instructions,
          cookingTime: result.cookingTime,
          prepTime: result.prepTime,
          servings: result.servings,
          confidence: result.confidence
        };
        
        setEditingRecipe(validated);
      }
    }
  }, [transcript]);

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      if (!isSupported) {
        toast({
          title: "Non supporté",
          description: "La reconnaissance vocale n'est pas supportée par votre navigateur",
          variant: "destructive"
        });
        return;
      }
      
      resetTranscript();
      startListening();
    }
  };

  const handleExamplePlay = (example: string) => {
    setSelectedExample(example);
    
    // Simulate voice input with example
    const result = parseRecipeVoiceInput(example);
    setParsedRecipe(result);
    
    if (result.success) {
      setCurrentStep('validating');
      
      const validated: ValidatedRecipe = {
        name: result.recipeName || 'Recette d\'exemple',
        ingredients: result.ingredients.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
          is_essential: ing.isEssential
        })),
        instructions: result.instructions,
        cookingTime: result.cookingTime,
        prepTime: result.prepTime,
        servings: result.servings,
        confidence: result.confidence
      };
      
      setEditingRecipe(validated);
    }
  };

  const handleEditRecipe = () => {
    setCurrentStep('editing');
  };

  const handleConfirmRecipe = () => {
    if (editingRecipe && onRecipeValidated) {
      onRecipeValidated(editingRecipe);
      onOpenChange(false);
      
      toast({
        title: "Recette ajoutée !",
        description: `${editingRecipe.name} avec ${editingRecipe.ingredients.length} ingrédients`,
      });
    }
  };

  const handleRestart = () => {
    setParsedRecipe(null);
    setEditingRecipe(null);
    setCurrentStep('listening');
    resetTranscript();
    setSelectedExample("");
  };

  const updateIngredient = (index: number, field: keyof ValidatedIngredient, value: any) => {
    if (!editingRecipe) return;
    
    const updatedIngredients = editingRecipe.ingredients.map((ing, i) => 
      i === index ? { ...ing, [field]: value } : ing
    );
    
    setEditingRecipe({
      ...editingRecipe,
      ingredients: updatedIngredients
    });
  };

  const removeIngredient = (index: number) => {
    if (!editingRecipe) return;
    
    const updatedIngredients = editingRecipe.ingredients.filter((_, i) => i !== index);
    setEditingRecipe({
      ...editingRecipe,
      ingredients: updatedIngredients
    });
  };

  const addIngredient = () => {
    if (!editingRecipe) return;
    
    const newIngredient: ValidatedIngredient = {
      name: "",
      quantity: 1,
      unit: "unité",
      is_essential: true
    };
    
    setEditingRecipe({
      ...editingRecipe,
      ingredients: [...editingRecipe.ingredients, newIngredient]
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            Dictée de Recette
            {parsedRecipe && (
              <Badge variant={parsedRecipe.success ? "default" : "destructive"}>
                Confiance: {Math.round(parsedRecipe.confidence * 100)}%
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Voice Listening */}
          {currentStep === 'listening' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🎤 Dictez votre recette</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {speechError && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Erreur microphone: {speechError}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-center">
                    <Button
                      onClick={handleVoiceToggle}
                      size="lg"
                      className={`h-20 w-20 rounded-full ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                          : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      {isListening ? (
                        <MicOff className="h-8 w-8" />
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-center text-sm text-muted-foreground">
                    {isListening 
                      ? "🔴 Parlez maintenant... Cliquez pour arrêter"
                      : "Cliquez pour commencer la dictée"
                    }
                  </p>
                  
                  {transcript && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <Label className="text-sm font-medium">Transcription :</Label>
                      <p className="text-sm mt-1">{transcript}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Examples */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">💡 Exemples à tester</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recipeExamplePhrases.map((example, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExamplePlay(example)}
                          className="flex items-center gap-2"
                        >
                          <Volume2 className="w-3 h-3" />
                          Tester
                        </Button>
                        <span className="text-xs text-muted-foreground flex-1">
                          {example}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Validation */}
          {currentStep === 'validating' && parsedRecipe && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    ✅ Recette détectée
                    <Badge variant={parsedRecipe.success ? "default" : "secondary"}>
                      {parsedRecipe.success ? "Valide" : "À corriger"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingRecipe && (
                    <div className="space-y-3">
                      <div>
                        <Label className="font-medium">Nom de la recette :</Label>
                        <p className="text-sm mt-1">{editingRecipe.name}</p>
                      </div>
                      
                      <div>
                        <Label className="font-medium">
                          Ingrédients ({editingRecipe.ingredients.length}) :
                        </Label>
                        <div className="mt-2 space-y-1">
                          {editingRecipe.ingredients.map((ingredient, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="text-xs">
                                {ingredient.quantity} {ingredient.unit}
                              </Badge>
                              <span>{ingredient.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {editingRecipe.instructions && (
                        <div>
                          <Label className="font-medium">Instructions :</Label>
                          <p className="text-sm mt-1 text-muted-foreground">
                            {editingRecipe.instructions.substring(0, 100)}...
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {editingRecipe.prepTime && (
                          <div>
                            <Label className="font-medium">Préparation :</Label>
                            <p>{editingRecipe.prepTime} min</p>
                          </div>
                        )}
                        {editingRecipe.cookingTime && (
                          <div>
                            <Label className="font-medium">Cuisson :</Label>
                            <p>{editingRecipe.cookingTime} min</p>
                          </div>
                        )}
                        {editingRecipe.servings && (
                          <div>
                            <Label className="font-medium">Portions :</Label>
                            <p>{editingRecipe.servings} pers.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={handleRestart}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Recommencer
                    </Button>
                    <Button variant="outline" onClick={handleEditRecipe}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <Button onClick={handleConfirmRecipe}>
                      <Check className="w-4 h-4 mr-2" />
                      Confirmer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Editing */}
          {currentStep === 'editing' && editingRecipe && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">✏️ Édition de la recette</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recipe Name */}
                  <div>
                    <Label htmlFor="recipe-name">Nom de la recette</Label>
                    <Input
                      id="recipe-name"
                      value={editingRecipe.name}
                      onChange={(e) => setEditingRecipe({
                        ...editingRecipe,
                        name: e.target.value
                      })}
                    />
                  </div>

                  {/* Ingredients */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-medium">Ingrédients</Label>
                      <Button size="sm" onClick={addIngredient}>
                        <Check className="w-3 h-3 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {editingRecipe.ingredients.map((ingredient, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <Input
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                            type="number"
                            step="0.1"
                            className="col-span-2"
                          />
                          <Select
                            value={ingredient.unit}
                            onValueChange={(value) => updateIngredient(index, 'unit', value)}
                          >
                            <SelectTrigger className="col-span-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COOKING_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={ingredient.name}
                            onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                            placeholder="Nom de l'ingrédient"
                            className="col-span-6"
                          />
                          <div className="col-span-1 flex items-center justify-center">
                            <Switch
                              checked={ingredient.is_essential}
                              onCheckedChange={(checked) => updateIngredient(index, 'is_essential', checked)}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeIngredient(index)}
                            className="col-span-1"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={editingRecipe.instructions || ''}
                      onChange={(e) => setEditingRecipe({
                        ...editingRecipe,
                        instructions: e.target.value
                      })}
                      rows={4}
                    />
                  </div>

                  {/* Times and Servings */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="prep-time">Préparation (min)</Label>
                      <Input
                        id="prep-time"
                        type="number"
                        value={editingRecipe.prepTime || ''}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe,
                          prepTime: parseInt(e.target.value) || undefined
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cook-time">Cuisson (min)</Label>
                      <Input
                        id="cook-time"
                        type="number"
                        value={editingRecipe.cookingTime || ''}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe,
                          cookingTime: parseInt(e.target.value) || undefined
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="servings">Portions</Label>
                      <Input
                        id="servings"
                        type="number"
                        value={editingRecipe.servings || ''}
                        onChange={(e) => setEditingRecipe({
                          ...editingRecipe,
                          servings: parseInt(e.target.value) || undefined
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setCurrentStep('validating')}>
                      Retour
                    </Button>
                    <Button onClick={handleConfirmRecipe}>
                      <Check className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeVoiceInput;