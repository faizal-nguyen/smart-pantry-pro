/**
 * RecipeLibraryTab — onglet "Bibliothèque" (recettes utilisateur).
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx`. Affiche stats + grille
 * de recettes utilisateur. Le filter `?filter=favorites` sera branché en
 * PR3 (PRP-232 §7 favoris V2).
 */
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ChefHat, Grid3X3, Heart, List, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import CollectionsManager from '@/components/recipes/CollectionsManager';
import LibraryRecipeCard from '@/components/recipes/LibraryRecipeCard';
import type { UserRecipe } from '@/hooks/useUserRecipes';

interface RecipeLibraryTabProps {
  recipes: UserRecipe[];
  isLoading: boolean;
  onShowOnboarding: () => void;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'blue' | 'purple' | 'green' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  } as const;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="h-full">
          <div className="w-full h-44 md:h-52 lg:h-56 bg-gray-200 animate-pulse" />
          <CardContent className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// PRP-232 PR3 — favoris V2. Schéma DB n'expose pas `is_favorite` : le proxy
// produit reste `personal_rating >= 4`, déjà utilisé par la StatCard.
const isFavorite = (r: UserRecipe) => (r.personal_rating || 0) >= 4;

export default function RecipeLibraryTab({
  recipes,
  isLoading,
  onShowOnboarding,
}: RecipeLibraryTabProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const showFavoritesOnly = filterParam === 'favorites';

  const visibleRecipes = useMemo(
    () => (showFavoritesOnly ? recipes.filter(isFavorite) : recipes),
    [recipes, showFavoritesOnly]
  );

  const stats = {
    total: recipes.length,
    custom: recipes.filter(r => !r.is_from_catalog).length,
    cooked: recipes.filter(r => r.times_cooked > 0).length,
    favorites: recipes.filter(isFavorite).length,
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard icon={BookOpen} label="Total" value={stats.total} color="blue" />
        <StatCard icon={Heart} label="Favorites" value={stats.favorites} color="red" />
        <StatCard icon={ChefHat} label="Cuisinées" value={stats.cooked} color="green" />
        <StatCard icon={Plus} label="Personnelles" value={stats.custom} color="purple" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-3">
            <Button onClick={onShowOnboarding} variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Ajouter des favoris
            </Button>
            <CollectionsManager />
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label="Vue grille"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="Vue liste"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <LibrarySkeleton />
        ) : visibleRecipes.length === 0 ? (
          showFavoritesOnly ? (
            <EmptyState
              icon={Heart}
              title="Aucune recette favorite pour le moment"
              description="Touche le cœur sur une recette pour la marquer comme favorite (ou note-la 4 étoiles ou plus)."
            />
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Ta bibliothèque est vide"
              description="Commence par ajouter quelques recettes favorites depuis le feed ou via un import."
              action={{ label: 'Découvrir des recettes', onClick: onShowOnboarding }}
            />
          )
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {visibleRecipes.map(recipe => (
              <LibraryRecipeCard key={recipe.id} recipe={recipe} viewMode={viewMode} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
