/**
 * LibraryRecipeCard — carte de la bibliothèque utilisateur.
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx` (anciennement
 * `UserRecipeCard` inline) et renommé pour clarifier son rôle.
 * Affiche une recette de `useUserRecipes()` avec deux modes (grid/list).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat } from 'lucide-react';
import { getRecipeImage, getRecipeTitle, type UserRecipe } from '@/hooks/useUserRecipes';

interface LibraryRecipeCardProps {
  recipe: UserRecipe;
  viewMode: 'grid' | 'list';
}

export default function LibraryRecipeCard({ recipe, viewMode }: LibraryRecipeCardProps) {
  const navigate = useNavigate();
  const title = getRecipeTitle(recipe);
  const image = getRecipeImage(recipe);

  const handleClick = () => {
    navigate(`/kitchen/recipes/${recipe.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <CardContent className="p-4">
        <div className={viewMode === 'list' ? 'flex items-center gap-4' : ''}>
          <div
            className={`rounded-lg overflow-hidden ${
              viewMode === 'list' ? 'w-16 h-16 flex-shrink-0' : 'w-full h-44 md:h-52 lg:h-56 mb-4'
            }`}
          >
            {image ? (
              <img src={image} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surface-muted flex items-center justify-center">
                <ChefHat
                  className={`${viewMode === 'list' ? 'h-6 w-6' : 'h-12 w-12'} text-muted-foreground`}
                />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className={`font-semibold mb-2 ${viewMode === 'list' ? 'text-base' : 'text-lg'}`}>
              {title}
            </h3>

            {recipe.personal_notes && (
              <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{recipe.personal_notes}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {!recipe.is_from_catalog && <Badge variant="secondary">Custom</Badge>}

              {recipe.collections.map(collection => (
                <Badge key={collection} variant="outline" className="text-xs">
                  {collection}
                </Badge>
              ))}

              {recipe.times_cooked > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Cuite {recipe.times_cooked}x
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
