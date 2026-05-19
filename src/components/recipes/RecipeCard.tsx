import React from "react";
import { MaterialCard, MaterialCardContent, MaterialCardActions } from "@/components/ui/material/Card";
import { MaterialButton } from "@/components/ui/material/Button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMaterialYouTheme } from "@/contexts/MaterialYouThemeContext";
import { Badge } from "@/components/ui/badge";
import { 
  MoreVertical, 
  Clock,
  Users,
  Star,
  Heart,
  Share,
  ShoppingCart,
  ChefHat,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Types adaptés du PRP Cipher
interface Recipe {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  cuisine_category?: string;
  meal_type?: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: number; // 1-5
  rating?: number;
  rating_count?: number;
  tags?: string[];
  is_public: boolean;
  user_id: string;
  created_at: string;
}

interface InventoryAnalysis {
  canMake: boolean;
  confidence: number;
  availableIngredients: number;
  missingIngredients: number;
}

interface RecipeCardProps {
  recipe: Recipe;
  inventoryAnalysis?: InventoryAnalysis;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (id: string) => void;
  onAddToShoppingList?: (recipe: Recipe) => void;
  onToggleFavorite?: (id: string) => void;
  onShare?: (recipe: Recipe) => void;
  isFavorite?: boolean;
}

const RecipeCard = ({ 
  recipe, 
  inventoryAnalysis,
  onEdit, 
  onDelete, 
  onAddToShoppingList,
  onToggleFavorite,
  onShare,
  isFavorite = false
}: RecipeCardProps) => {
  const navigate = useNavigate();
  const { extractColorFromImage } = useMaterialYouTheme();
  
  // Extract theme colors from recipe image when component mounts
  React.useEffect(() => {
    if (recipe.image_url) {
      extractColorFromImage(recipe.image_url).catch(console.error);
    }
  }, [recipe.image_url, extractColorFromImage]);
  
  // Pattern status inventaire (adaptation ProductCard Cipher)
  const getInventoryStatusColor = () => {
    if (!inventoryAnalysis) return 'bg-muted text-muted-foreground';

    if (inventoryAnalysis.canMake) {
      return 'bg-success/10 text-success border-success/20';
    }
    if (inventoryAnalysis.missingIngredients.length <= 2) {
      return 'bg-warning/10 text-warning border-warning/20';
    }
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  const getInventoryStatusIcon = () => {
    if (!inventoryAnalysis) return null;
    
    if (inventoryAnalysis.canMake) {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (inventoryAnalysis.missingIngredients.length <= 2) {
      return <AlertCircle className="w-4 h-4" />;
    }
    return <XCircle className="w-4 h-4" />;
  };

  const getInventoryStatusText = () => {
    if (!inventoryAnalysis) return 'Analyse en cours...';
    
    if (inventoryAnalysis.canMake) {
      return 'Tous ingrédients disponibles';
    }
    return `${inventoryAnalysis.missingIngredients.length} ingrédients manquants`;
  };

  // Pattern couleurs cuisine (adaptation ProductCard)
  const getCuisineColor = (category: string) => {
    const colors: Record<string, string> = {
      'Française': 'bg-info/10 text-info',
      'Italienne': 'bg-success/10 text-success',
      'Asiatique': 'bg-destructive/10 text-destructive',
      'Méditerranéenne': 'bg-secondary/10 text-secondary',
      'Mexicaine': 'bg-warning/10 text-warning',
      'Indienne': 'bg-accent/10 text-accent',
      'Japonaise': 'bg-primary/10 text-primary',
      'Américaine': 'bg-info/20 text-info',
      'Végétarienne': 'bg-success/20 text-success',
      'Végan': 'bg-success/15 text-success',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  const totalTime = recipe.prep_time + recipe.cook_time;

  return (
    <MaterialCard 
      variant="elevated"
      interactive
      onClick={() => {
        navigate(`/kitchen/recipes/${recipe.id}`);
      }}
    >
      <MaterialCardContent>
        {/* Image recette avec overlays */}
        <div className="relative mb-3">
          <img 
            src={recipe.image_url || '/placeholder-recipe.jpg'}
            alt={recipe.name}
            className="w-full h-48 object-cover rounded-lg"
          />
          
          {/* Badge cuisine */}
          {recipe.cuisine_category && (
            <Badge className={`absolute top-2 right-2 ${getCuisineColor(recipe.cuisine_category)}`}>
              {recipe.cuisine_category}
            </Badge>
          )}
          
          {/* Status inventaire overlay */}
          <div className="absolute bottom-2 left-2">
            {inventoryAnalysis && (
              <Badge className={`${getInventoryStatusColor()} flex items-center gap-1`}>
                {getInventoryStatusIcon()}
                <span className="text-xs font-medium">
                  {inventoryAnalysis.canMake ? '✅' : inventoryAnalysis.missingIngredients.length <= 2 ? '⚠️' : '❌'}
                </span>
              </Badge>
            )}
          </div>

          {/* Bouton favori */}
          <MaterialButton
            variant="elevated"
            size="sm"
            className="absolute top-2 left-2 h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(recipe.id);
            }}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
          </MaterialButton>
        </div>

        {/* Infos recette */}
        <div className="space-y-3">
          {/* Titre + description */}
          <div>
            <h3 className="font-semibold text-lg leading-tight line-clamp-2 mb-1">
              {recipe.name}
            </h3>
            {recipe.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {recipe.description}
              </p>
            )}
          </div>

          {/* Métadonnées */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{totalTime}min</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} pers.</span>
            </div>
            
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < recipe.difficulty
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {recipe.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span>{recipe.rating}</span>
                <span className="text-xs">({recipe.rating_count})</span>
              </div>
            )}
          </div>

          {/* Status inventaire détaillé */}
          {inventoryAnalysis && (
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ingrédients:</span>
                <span className="font-medium">
                  {inventoryAnalysis.availableIngredients.length} disponibles
                </span>
              </div>
              {inventoryAnalysis.missingIngredients.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Manquants:</span>
                  <span className="font-medium text-warning">
                    {inventoryAnalysis.missingIngredients.length}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {recipe.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{recipe.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <MaterialButton 
                variant="text" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.(recipe);
                }}
              >
                <Share className="w-4 h-4" />
              </MaterialButton>
              
              {onEdit && onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <MaterialButton variant="text" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </MaterialButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onEdit(recipe);
                    }}>
                      <ChefHat className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(recipe.id);
                      }}
                      className="text-destructive"
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <MaterialButton 
              variant="tonal" 
              size="sm" 
              className="ml-auto"
              icon={<ShoppingCart className="w-4 h-4" />}
              onClick={(e) => {
                e.stopPropagation();
                onAddToShoppingList?.(recipe);
              }}
            >
              Liste courses
            </MaterialButton>
          </div>
        </div>
      </MaterialCardContent>
    </MaterialCard>
  );
};

export default RecipeCard;