import { useState } from "react";
import { useRecipeParser } from "@/hooks/useRecipeParser";
import { useSocialRecipeParser } from "@/hooks/useSocialRecipeParser";
import RecipeBookScanner, { OCRRecipeResult } from "./RecipeBookScanner";
import RecipeVoiceInput, { ValidatedRecipe } from "./RecipeVoiceInput";
import { Button } from "@/components/ui/button";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ChefHat, 
  Camera, 
  Link, 
  Instagram, 
  Loader2,
  Plus,
  X,
  Star,
  Clock,
  Users,
  BookOpen,
  Mic,
  Facebook,
  Youtube,
  Share2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TikTokIcon from "@/components/icons/TikTokIcon";
import PinterestIcon from "@/components/icons/PinterestIcon";

// Pattern cuisine categories (adaptation ProductCard Cipher)
const CUISINE_CATEGORIES = [
  "Française",
  "Italienne", 
  "Asiatique",
  "Méditerranéenne",
  "Mexicaine",
  "Indienne",
  "Japonaise",
  "Américaine",
  "Végétarienne",
  "Végan",
  "Sans gluten",
  "Desserts",
  "Autres"
];

const MEAL_TYPES = [
  "breakfast",
  "lunch", 
  "dinner",
  "snack",
  "dessert",
  "drink",
  "appetizer"
];

const UNITS = [
  "g", "kg", "ml", "l", "c.à.s", "c.à.c", 
  "tasse", "verre", "pincée", "gousse", 
  "tranche", "unité", "boîte", "paquet"
];

interface Recipe {
  name: string;
  description?: string;
  image_url?: string;
  cuisine_category?: string;
  meal_type?: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: number;
  instructions: string;
  tags: string[];
  ingredients: RecipeIngredient[];
}

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  is_essential: boolean;
  notes?: string;
}

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipeAdded?: (recipe: Recipe) => void;
}

const AddRecipeDialog = ({ open, onOpenChange, onRecipeAdded }: AddRecipeDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("manual");
  
  // URL parsing hook (pattern Cipher)
  const { parseRecipeFromURL: parseURL, loading: parsing, error: parseError } = useRecipeParser();
  
  // Social media parsing hook (pattern Cipher)
  const { parseRecipeFromSocial, loading: socialParsing, error: socialParseError } = useSocialRecipeParser();
  
  // Form state (pattern AddProductDialog Cipher)
  const [recipeName, setRecipeName] = useState("");
  const [description, setDescription] = useState("");
  const [cuisineCategory, setCuisineCategory] = useState("");
  const [mealType, setMealType] = useState("");
  const [prepTime, setPrepTime] = useState("15");
  const [cookTime, setCookTime] = useState("30");
  const [servings, setServings] = useState("4");
  const [difficulty, setDifficulty] = useState(2);
  const [instructions, setInstructions] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  // Ingredients state
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { name: "", quantity: 0, unit: "g", is_essential: true, notes: "" }
  ]);
  
  // URL parsing state
  const [recipeUrl, setRecipeUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Social media parsing state
  const [socialUrl, setSocialUrl] = useState("");
  const [socialError, setSocialError] = useState<string | null>(null);
  
  // OCR scanner state (pattern Cipher)
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  
  // Voice input state (pattern Cipher)
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  const resetForm = () => {
    setRecipeName("");
    setDescription("");
    setCuisineCategory("");
    setMealType("");
    setPrepTime("15");
    setCookTime("30");
    setServings("4");
    setDifficulty(2);
    setInstructions("");
    setImageUrl("");
    setTags([]);
    setNewTag("");
    setIngredients([
      { name: "", quantity: 0, unit: "g", is_essential: true, notes: "" }
    ]);
    setRecipeUrl("");
    setSocialUrl("");
    setUrlError(null);
    setSocialError(null);
    setCurrentTab("manual");
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { name: "", quantity: 0, unit: "g", is_essential: true, notes: "" }
    ]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = ingredients.map((ingredient, i) => 
      i === index ? { ...ingredient, [field]: value } : ingredient
    );
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  // Pattern parsing URL (implementation Cipher avec useRecipeParser)
  const parseRecipeFromURL = async () => {
    setUrlError(null);
    
    if (!recipeUrl.trim()) {
      setUrlError("Veuillez entrer une URL de recette");
      return;
    }

    try {
      const result = await parseURL(recipeUrl);
      
      if (result.success && result.data) {
        const recipe = result.data;
        
        // Remplir le formulaire avec les données parsées (pattern Cipher)
        setRecipeName(recipe.name);
        setDescription(recipe.description || "");
        setCuisineCategory(recipe.cuisine_category || "");
        setMealType(recipe.meal_type || "");
        setPrepTime(recipe.prep_time.toString());
        setCookTime(recipe.cook_time.toString());
        setServings(recipe.servings.toString());
        setDifficulty(recipe.difficulty);
        setInstructions(recipe.instructions);
        setImageUrl(recipe.image_url || "");
        
        // Mapper les ingrédients
        const mappedIngredients = recipe.ingredients.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          is_essential: ing.is_essential,
          notes: ing.notes || ""
        }));
        setIngredients(mappedIngredients);
        
        // Tags
        setTags(recipe.tags || []);
        
        toast({
          title: "Recette parsée !",
          description: `${recipe.name} - ${recipe.ingredients.length} ingrédients (${result.parsingMethod})`,
        });
        
        // Passer au mode manuel pour finaliser
        setCurrentTab("manual");
        
      } else {
        throw new Error(result.error || 'Parsing failed');
      }
      
    } catch (error) {
      console.error('URL parsing error:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossible d'extraire la recette de cette URL";
      setUrlError(errorMessage);
      
      // Afficher des suggestions pour résoudre le problème
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        setUrlError("URL introuvable. Vérifiez que le lien est correct.");
      } else if (errorMessage.includes('timeout')) {
        setUrlError("Délai d'attente dépassé. Le site est peut-être lent ou indisponible.");
      } else if (errorMessage.includes('HTTP')) {
        setUrlError("Erreur de connexion au site. Réessayez dans quelques instants.");
      } else {
        setUrlError(`Erreur: ${errorMessage}. Essayez de copier-coller le texte manuellement.`);
      }
    }
  };

  // Social media parsing handler (pattern Cipher)
  const parseSocialRecipe = async () => {
    setSocialError(null);
    
    if (!socialUrl.trim()) {
      setSocialError("Veuillez entrer une URL de réseau social");
      return;
    }

    try {
      const result = await parseRecipeFromSocial(socialUrl);
      
      if (result.success && result.data) {
        const recipe = result.data;
        
        // Remplir le formulaire avec les données parsées
        setRecipeName(recipe.name);
        setDescription(recipe.description || "");
        setCuisineCategory(recipe.cuisine_category || "");
        setMealType(recipe.meal_type || "");
        setPrepTime(recipe.prep_time.toString());
        setCookTime(recipe.cook_time.toString());
        setServings(recipe.servings.toString());
        setDifficulty(recipe.difficulty || 2);
        setInstructions(recipe.instructions);
        setImageUrl(recipe.image_url || "");
        
        // Mapper les ingrédients
        const mappedIngredients = recipe.ingredients.map(ing => ({
          name: ing.name || ing,
          quantity: ing.quantity || 1,
          unit: ing.unit || "unité",
          is_essential: ing.is_essential !== undefined ? ing.is_essential : true,
          notes: ing.notes || ""
        }));
        setIngredients(mappedIngredients);
        
        // Tags
        setTags(recipe.tags || []);
        
        toast({
          title: "Recette extraite !",
          description: `${recipe.name} - ${result.platform} (${result.author || 'Auteur inconnu'})`,
        });
        
        // Passer au mode manuel pour finaliser
        setCurrentTab("manual");
        
      } else {
        throw new Error(result.error || 'Social parsing failed');
      }
      
    } catch (error) {
      console.error('Social parsing error:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossible d'extraire la recette de ce réseau social";
      setSocialError(errorMessage);
    }
  };

  // OCR handler (pattern Cipher adaptation)
  const handleOCRResult = (ocrResult: OCRRecipeResult) => {
    try {
      // Remplir le formulaire avec les données OCR (pattern Cipher)
      if (ocrResult.parsedRecipe) {
        const recipe = ocrResult.parsedRecipe;
        
        setRecipeName(recipe.name);
        setInstructions(recipe.instructions);
        
        // Mapper les ingrédients OCR
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          const mappedIngredients = recipe.ingredients.map((ing: string, index: number) => ({
            name: ing,
            quantity: 1,
            unit: "unité",
            is_essential: true,
            notes: ""
          }));
          setIngredients(mappedIngredients);
        }
        
        // Temps de cuisson/prep si disponibles
        if (recipe.cookTime) {
          const cookTimeMatch = recipe.cookTime.match(/(\d+)/);
          if (cookTimeMatch) {
            setCookTime(cookTimeMatch[1]);
          }
        }
        
        if (recipe.prepTime) {
          const prepTimeMatch = recipe.prepTime.match(/(\d+)/);
          if (prepTimeMatch) {
            setPrepTime(prepTimeMatch[1]);
          }
        }
        
        if (recipe.servings) {
          setServings(recipe.servings.toString());
        }
        
        toast({
          title: "Recette scannée !",
          description: `${recipe.name} - ${recipe.ingredients.length} ingrédients détectés`,
        });
        
      } else {
        // Si pas de recette parsée, mettre juste le texte dans les instructions
        setInstructions(ocrResult.text);
        
        toast({
          title: "Texte scanné",
          description: "Texte ajouté aux instructions. Veuillez compléter les autres champs.",
        });
      }
      
      // Passer au mode manuel pour compléter/corriger
      setCurrentTab("manual");
      
    } catch (error) {
      console.error('OCR result processing error:', error);
      toast({
        title: "Erreur OCR",
        description: "Impossible de traiter le résultat du scan",
        variant: "destructive"
      });
    }
  };

  // Voice input handler (pattern Cipher adaptation)
  const handleVoiceRecipe = (voiceRecipe: ValidatedRecipe) => {
    try {
      // Remplir le formulaire avec les données vocales (pattern Cipher)
      setRecipeName(voiceRecipe.name);
      setInstructions(voiceRecipe.instructions || "");
      
      // Mapper les ingrédients vocaux
      const mappedIngredients = voiceRecipe.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        is_essential: ing.is_essential,
        notes: ing.notes || ""
      }));
      setIngredients(mappedIngredients);
      
      // Temps et portions
      if (voiceRecipe.prepTime) {
        setPrepTime(voiceRecipe.prepTime.toString());
      }
      
      if (voiceRecipe.cookingTime) {
        setCookTime(voiceRecipe.cookingTime.toString());
      }
      
      if (voiceRecipe.servings) {
        setServings(voiceRecipe.servings.toString());
      }
      
      toast({
        title: "Recette vocale traitée !",
        description: `${voiceRecipe.name} - ${voiceRecipe.ingredients.length} ingrédients (confiance: ${Math.round(voiceRecipe.confidence * 100)}%)`,
      });
      
      // Passer au mode manuel pour finaliser
      setCurrentTab("manual");
      
    } catch (error) {
      console.error('Voice recipe processing error:', error);
      toast({
        title: "Erreur vocale",
        description: "Impossible de traiter la recette vocale",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    if (!recipeName.trim()) {
      toast({
        title: "Nom manquant",
        description: "Veuillez entrer un nom pour la recette",
        variant: "destructive"
      });
      return;
    }

    if (ingredients.filter(ing => ing.name.trim()).length === 0) {
      toast({
        title: "Ingrédients manquants", 
        description: "Veuillez ajouter au moins un ingrédient",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const recipe: Recipe = {
        name: recipeName,
        description: description || undefined,
        image_url: imageUrl || undefined,
        cuisine_category: cuisineCategory || undefined,
        meal_type: mealType || undefined,
        prep_time: parseInt(prepTime),
        cook_time: parseInt(cookTime),
        servings: parseInt(servings),
        difficulty,
        instructions,
        tags,
        ingredients: ingredients.filter(ing => ing.name.trim())
      };

      // TODO: Implémenter avec useRecipes hook
      console.log('🍳 Adding recipe:', recipe);
      
      onRecipeAdded?.(recipe);
      onOpenChange(false);
      resetForm();
      
      toast({
        title: "Recette ajoutée !",
        description: `${recipeName} a été ajoutée à votre collection`,
      });
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la recette",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Ajouter une recette
          </DialogTitle>
        </DialogHeader>
        
        {/* Tabs pour différents modes d'ajout (pattern Cipher) */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="manual" className="text-xs">
              Manuel
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs">
              URL
            </TabsTrigger>
            <TabsTrigger value="voice" className="text-xs">
              Vocal
            </TabsTrigger>
            <TabsTrigger value="scan" className="text-xs">
              Scanner
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs">
              Social
            </TabsTrigger>
          </TabsList>
          
          {/* Mode manuel */}
          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nom de la recette *</Label>
                <Input
                  id="name"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="Ex: Pâtes à la carbonara"
                />
              </div>
              
              <div>
                <Label htmlFor="cuisine">Cuisine</Label>
                <Select value={cuisineCategory} onValueChange={setCuisineCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une cuisine" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUISINE_CATEGORIES.map((cuisine) => (
                      <SelectItem key={cuisine} value={cuisine}>
                        {cuisine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description courte de la recette..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="prep-time">Préparation (min)</Label>
                <Input
                  id="prep-time"
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="cook-time">Cuisson (min)</Label>
                <Input
                  id="cook-time"
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="servings">Portions</Label>
                <Input
                  id="servings"
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Difficulté</Label>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <Button
                      key={level}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setDifficulty(level)}
                    >
                      <Star 
                        className={`h-4 w-4 ${
                          level <= difficulty 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-300'
                        }`} 
                      />
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ingrédients */}
            <div>
              <Label>Ingrédients *</Label>
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Nom ingrédient"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qté"
                      value={ingredient.quantity || ''}
                      onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Select 
                      value={ingredient.unit} 
                      onValueChange={(value) => updateIngredient(index, 'unit', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      disabled={ingredients.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addIngredient}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un ingrédient
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <Label htmlFor="instructions">Instructions *</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="1. Étape 1...&#10;2. Étape 2...&#10;3. Étape 3..."
                rows={6}
              />
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="Ajouter un tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer">
                    {tag}
                    <X 
                      className="h-3 w-3 ml-1" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
          
          {/* Mode Voice Input */}
          <TabsContent value="voice" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Mic className="h-10 w-10 text-primary" />
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">Dictée de Recette</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Dictez votre recette avec ingrédients, quantités et instructions
                </p>
              </div>
              
              <Button 
                onClick={() => setShowVoiceInput(true)}
                size="lg"
                className="w-full"
              >
                <Mic className="w-5 h-5 mr-2" />
                Commencer la Dictée
              </Button>
              
              <div className="text-xs text-muted-foreground">
                <p>• Parlez clairement et distinctement</p>
                <p>• Mentionnez les quantités et unités</p>
                <p>• Le système reconnaît le vocabulaire culinaire français</p>
              </div>
            </div>
          </TabsContent>
          
          {/* Mode URL */}
          <TabsContent value="url" className="space-y-4">
            <div>
              <Label htmlFor="url">URL de la recette</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  value={recipeUrl}
                  onChange={(e) => setRecipeUrl(e.target.value)}
                  placeholder="https://www.marmiton.org/recettes/..."
                />
                <Button 
                  onClick={parseRecipeFromURL}
                  disabled={parsing}
                >
                  {parsing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Supporte: Marmiton, 750g, Cuisine AZ, blogs culinaires
              </p>
              {urlError && (
                <div className="text-sm text-red-500 mt-2 p-2 bg-red-50 rounded">
                  {urlError}
                </div>
              )}
            </div>
            
            {/* Si parsing réussi, afficher preview */}
            {recipeName && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Recette extraite :</h4>
                <p><strong>{recipeName}</strong></p>
                <p className="text-sm text-muted-foreground">{description}</p>
                <div className="flex items-center gap-4 text-sm mt-2">
                  <span>⏱️ {parseInt(prepTime) + parseInt(cookTime)}min</span>
                  <span>👥 {servings} pers.</span>
                  <span>📊 {difficulty}/5</span>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Mode Social Media */}
          <TabsContent value="social" className="space-y-4">
            <div>
              <Label htmlFor="social-url">URL du réseau social</Label>
              <div className="flex gap-2">
                <Input
                  id="social-url"
                  value={socialUrl}
                  onChange={(e) => setSocialUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/... ou TikTok, Facebook, Pinterest, YouTube"
                />
                <Button 
                  onClick={parseSocialRecipe}
                  disabled={socialParsing}
                >
                  {socialParsing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-sm text-muted-foreground">Supporté:</p>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Instagram className="h-3 w-3" />
                    Instagram
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Facebook className="h-3 w-3" />
                    Facebook
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <TikTokIcon className="h-3 w-3" />
                    TikTok
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <PinterestIcon className="h-3 w-3" />
                    Pinterest
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Youtube className="h-3 w-3" />
                    YouTube
                  </Badge>
                </div>
              </div>
              {socialError && (
                <div className="text-sm text-red-500 mt-2 p-2 bg-red-50 rounded">
                  {socialError}
                </div>
              )}
            </div>
            
            {/* Exemples de liens */}
            <div className="space-y-2">
              <Label className="text-sm">Exemples rapides</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => setSocialUrl("https://www.instagram.com/p/example/")}
                >
                  <Instagram className="h-3 w-3 mr-2" />
                  Post Instagram avec recette
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => setSocialUrl("https://www.tiktok.com/@user/video/123")}
                >
                  <TikTokIcon className="h-3 w-3 mr-2" />
                  Vidéo TikTok de cuisine
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => setSocialUrl("https://www.youtube.com/watch?v=example")}
                >
                  <Youtube className="h-3 w-3 mr-2" />
                  Tutoriel YouTube
                </Button>
              </div>
            </div>
            
            {/* Si parsing réussi, afficher preview */}
            {recipeName && currentTab === "social" && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Recette extraite :</h4>
                <p><strong>{recipeName}</strong></p>
                <p className="text-sm text-muted-foreground">{description}</p>
                <div className="flex items-center gap-4 text-sm mt-2">
                  <span>⏱️ {parseInt(prepTime) + parseInt(cookTime)}min</span>
                  <span>👥 {servings} pers.</span>
                  <span>📊 {difficulty}/5</span>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="scan" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-primary" />
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">Scanner Livre de Recettes</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Scannez une page de livre de cuisine pour extraire automatiquement la recette
                </p>
              </div>
              
              <Button 
                onClick={() => setShowOCRScanner(true)}
                size="lg"
                className="w-full"
              >
                <Camera className="w-5 h-5 mr-2" />
                Ouvrir le Scanner OCR
              </Button>
              
              <div className="text-xs text-muted-foreground">
                <p>• Positionnez bien la recette dans le cadre</p>
                <p>• Assurez-vous que l'éclairage est suffisant</p>
                <p>• Le texte sera automatiquement extrait et analysé</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Ajout en cours...
              </>
            ) : (
              <>
                <ChefHat className="h-4 w-4 mr-2" />
                Ajouter la recette
              </>
            )}
          </Button>
        </div>
      </DialogContent>
      
      {/* OCR Scanner Modal */}
      <RecipeBookScanner
        isOpen={showOCRScanner}
        onClose={() => setShowOCRScanner(false)}
        onScan={handleOCRResult}
      />
      
      {/* Voice Input Modal */}
      <RecipeVoiceInput
        open={showVoiceInput}
        onOpenChange={setShowVoiceInput}
        onRecipeValidated={handleVoiceRecipe}
      />
    </Dialog>
  );
};

export default AddRecipeDialog;