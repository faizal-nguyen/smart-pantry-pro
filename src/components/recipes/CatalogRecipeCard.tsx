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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="h-full group hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="relative">
          {recipe.photo_url ? (
            <img
              src={recipe.photo_url}
              alt={recipe.title}
              className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                compact ? 'h-32' : 'h-44 md:h-52 lg:h-56'
              }`}
            />
          ) : (
            <div
              className={`w-full bg-surface-muted flex items-center justify-center ${
                compact ? 'h-32' : 'h-44 md:h-52 lg:h-56'
              }`}
            >
              <ChefHat className={`${compact ? 'h-8 w-8' : 'h-12 w-12'} text-muted-foreground`} />
            </div>
          )}

          <div className="absolute top-3 right-3">
            <Button
              size="sm"
              variant={isInLibrary ? 'secondary' : 'default'}
              className={`h-10 w-10 p-0 rounded-full ${
                isInLibrary
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                  : 'bg-surface text-foreground hover:bg-surface-muted'
              }`}
              onClick={() => !isInLibrary && onAddToLibrary(recipe.id, recipe.title)}
              disabled={!!isInLibrary || isAdding}
              aria-label={isInLibrary ? 'Déjà dans la bibliothèque' : 'Ajouter à ma bibliothèque'}
            >
              {isInLibrary ? <Heart className="h-5 w-5 fill-current" /> : <Plus className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <CardContent className={compact ? 'p-3' : 'p-4'}>
          <h3
            className={`font-semibold mb-2 line-clamp-2 text-foreground group-hover:text-saffron transition-colors ${
              compact ? 'text-sm' : 'text-lg'
            }`}
          >
            {recipe.title}
          </h3>

          <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatCookingTime(recipe.prep_time, recipe.cook_time)}
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {recipe.rating_avg.toFixed(1)}
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
