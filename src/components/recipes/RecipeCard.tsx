import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  estimatedCost: number;
  totalRecipeCost?: number;
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
  
  // Pattern status inventaire (adaptation ProductCard Cipher)
  const getInventoryStatusColor = () => {
    if (!inventoryAnalysis) return 'bg-muted text-muted-foreground';
    
    if (inventoryAnalysis.canMake) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (inventoryAnalysis.missingIngredients <= 2) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getInventoryStatusIcon = () => {
    if (!inventoryAnalysis) return null;
    
    if (inventoryAnalysis.canMake) {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (inventoryAnalysis.missingIngredients <= 2) {
      return <AlertCircle className="w-4 h-4" />;
    }
    return <XCircle className="w-4 h-4" />;
  };

  const getInventoryStatusText = () => {
    if (!inventoryAnalysis) return 'Analyse en cours...';
    
    if (inventoryAnalysis.canMake) {
      return 'Tous ingrédients disponibles';
    }
    return `${inventoryAnalysis.missingIngredients} ingrédients manquants`;
  };

  // Pattern couleurs cuisine (adaptation ProductCard)
  const getCuisineColor = (category: string) => {
    const colors: Record<string, string> = {
      'Française': 'bg-blue-100 text-blue-800',
      'Italienne': 'bg-green-100 text-green-800',
      'Asiatique': 'bg-red-100 text-red-800',
      'Méditerranéenne': 'bg-orange-100 text-orange-800',
      'Mexicaine': 'bg-yellow-100 text-yellow-800',
      'Indienne': 'bg-purple-100 text-purple-800',
      'Japonaise': 'bg-pink-100 text-pink-800',
      'Américaine': 'bg-indigo-100 text-indigo-800',
      'Végétarienne': 'bg-emerald-100 text-emerald-800',
      'Végan': 'bg-lime-100 text-lime-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const totalTime = recipe.prep_time + recipe.cook_time;

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
      onClick={() => {
        navigate(`/recipes/${recipe.id}`);
      }}
    >
      <CardContent className="p-4">
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
                  {inventoryAnalysis.canMake ? '✅' : inventoryAnalysis.missingIngredients <= 2 ? '⚠️' : '❌'}
                </span>
              </Badge>
            )}
          </div>

          {/* Bouton favori */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 left-2 h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(recipe.id);
            }}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
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
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
            </div>

            {recipe.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
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
                  {inventoryAnalysis.availableIngredients} disponibles
                </span>
              </div>
              {inventoryAnalysis.missingIngredients > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Manquants:</span>
                  <span className="font-medium text-orange-600">
                    {inventoryAnalysis.missingIngredients}
                  </span>
                </div>
              )}
              {(inventoryAnalysis.totalRecipeCost ?? inventoryAnalysis.estimatedCost) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Coût estimé:</span>
                  <span className="font-medium">
                    {(inventoryAnalysis.totalRecipeCost ?? inventoryAnalysis.estimatedCost).toFixed(2)}€
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
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.(recipe);
                }}
              >
                <Share className="w-4 h-4" />
              </Button>
              
              {onEdit && onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(recipe)}>
                      <ChefHat className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(recipe.id)}
                      className="text-destructive"
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                onAddToShoppingList?.(recipe);
              }}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              Liste courses
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipeCard;