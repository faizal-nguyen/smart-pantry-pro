/**
 * CatalogRecipeCard — carte catalogue (Feed/Trending).
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx` lors du split en tabs.
 * Affiche une recette du catalogue partagé avec CTA "ajouter à ma bibliothèque".
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChefHat, Clock, Heart, Plus, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCookingTime, type CatalogRecipe } from '@/hooks/useRecipeCatalog';
import { useIsRecipeInLibrary } from '@/hooks/useUserRecipes';

interface CatalogRecipeCardProps {
  recipe: CatalogRecipe;
  onAddToLibrary: (recipeId: string, recipeName: string) => void;
  isAdding: boolean;
  compact?: boolean;
}

export default function CatalogRecipeCard({
  recipe,
  onAddToLibrary,
  isAdding,
  compact = false,
}: CatalogRecipeCardProps) {
  const navigate = useNavigate();
  const { data: isInLibrary } = useIsRecipeInLibrary(recipe.id);

  const handleCardClick = (e: React.MouseEvent) => {
    if (!(e.target as Element).closest('button')) {
      navigate(`/kitchen/recipes/${recipe.id}`);
    }
  };

  // PRP-237 PR4: card éditoriale, ratio media stable, pas de hover zoom
  // agressif, fallback tokenisé. The whole card is the navigation target;
  // the add-to-library button is the only interactive nested control.
  // On mobile (<sm = 430px), use a squarer aspect ratio so the image
  // doesn't dominate the card height on tall phones (Pro Max).
  const mediaHeightClass = compact
    ? 'aspect-[4/3] sm:aspect-[16/10]'
    : 'aspect-[4/3] sm:aspect-[16/10]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <Card
        className="h-full group overflow-hidden cursor-pointer border-border hover:border-foreground/20 hover:shadow-md transition-shadow"
        onClick={handleCardClick}
      >
        <div className="relative">
          {recipe.photo_url ? (
            <img
              src={recipe.photo_url}
              alt={recipe.title}
              loading="lazy"
              className={`w-full object-cover ${mediaHeightClass}`}
            />
          ) : (
            <div
              className={`w-full bg-muted flex items-center justify-center ${mediaHeightClass}`}
              role="img"
              aria-label={`Aperçu indisponible pour ${recipe.title}`}
            >
              <ChefHat className={`${compact ? 'h-7 w-7' : 'h-10 w-10'} text-muted-foreground`} />
            </div>
          )}

          <div className="absolute top-2 right-2">
            <Button
              size="sm"
              variant={isInLibrary ? 'secondary' : 'default'}
              className="h-11 w-11 p-0 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (!isInLibrary) onAddToLibrary(recipe.id, recipe.title);
              }}
              disabled={!!isInLibrary || isAdding}
              aria-label={isInLibrary ? 'Déjà dans la bibliothèque' : 'Ajouter à ma bibliothèque'}
            >
              {isInLibrary ? (
                <Heart className="h-5 w-5 fill-current" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        <CardContent className={compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}>
          <h3
            className={`font-semibold line-clamp-2 text-foreground group-hover:text-primary transition-colors ${
              compact ? 'text-sm' : 'text-base'
            }`}
          >
            {recipe.title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {formatCookingTime(recipe.prep_time, recipe.cook_time)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* allow: semantic saffron for rating star, not brand */}
              <Star className="h-3.5 w-3.5 fill-saffron text-saffron" />
              <span className="tabular-nums">{recipe.rating_avg.toFixed(1)}</span>
            </div>
          </div>

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
