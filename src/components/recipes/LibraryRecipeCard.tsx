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

  if (viewMode === 'list') {
    return (
      <Card
        className="cursor-pointer border-border hover:border-foreground/20 hover:shadow-sm transition-shadow"
        onClick={handleClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-muted">
              {image ? (
                <img src={image} alt={title} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ChefHat className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-foreground truncate">{title}</h3>
              {recipe.personal_notes && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {recipe.personal_notes}
                </p>
              )}
            </div>

            <LibraryBadges recipe={recipe} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="cursor-pointer overflow-hidden border-border hover:border-foreground/20 hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <div className="w-full aspect-[16/10] bg-muted">
        {image ? (
          <img src={image} alt={title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            role="img"
            aria-label={`Aperçu indisponible pour ${title}`}
          >
            <ChefHat className="h-9 w-9 text-muted-foreground" />
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-base text-foreground line-clamp-2">{title}</h3>

        {recipe.personal_notes && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {recipe.personal_notes}
          </p>
        )}

        <LibraryBadges recipe={recipe} />
      </CardContent>
    </Card>
  );
}

function LibraryBadges({ recipe }: { recipe: UserRecipe }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Source tag (catalog vs personal) — keeps the merged-source UX
          transparent (cf. PRP-237 PR4 session merge). */}
      <Badge variant="outline" className="text-[10px] font-normal">
        {recipe.is_from_catalog ? 'Catalogue' : 'Personnel'}
      </Badge>

      {recipe.collections.slice(0, 2).map(collection => (
        <Badge key={collection} variant="secondary" className="text-[10px] font-normal">
          {collection}
        </Badge>
      ))}

      {recipe.times_cooked > 0 && (
        <Badge
          variant="secondary"
          className="text-[10px] font-normal bg-success/10 text-success border-success/20"
        >
          Cuite {recipe.times_cooked}×
        </Badge>
      )}
    </div>
  );
}
