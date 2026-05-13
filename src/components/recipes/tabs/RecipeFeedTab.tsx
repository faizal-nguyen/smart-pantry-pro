/**
 * RecipeFeedTab — onglet "Feed" (catalogue partagé + tendances).
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx` (anciennement
 * `ExploreTab` inline). Affiche barre de recherche, tendances et grille
 * principale du catalogue. URL `tab=feed`.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CatalogRecipeCard from '@/components/recipes/CatalogRecipeCard';
import type { CatalogRecipe, CatalogFilters } from '@/hooks/useRecipeCatalog';

interface RecipeFeedTabProps {
  recipes: CatalogRecipe[];
  totalCount: number;
  isLoading: boolean;
  trendingRecipes: CatalogRecipe[] | undefined;
  filters: CatalogFilters;
  setFilters: (filters: CatalogFilters) => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  onAddToLibrary: (recipeId: string, recipeName: string) => void;
  isAdding: boolean;
  onSwitchToInbox: () => void;
}

function FeedSkeleton() {
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

export default function RecipeFeedTab({
  recipes,
  totalCount,
  isLoading,
  trendingRecipes,
  filters,
  setFilters,
  hasNextPage,
  fetchNextPage,
  onAddToLibrary,
  isAdding,
  onSwitchToInbox,
}: RecipeFeedTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Rechercher dans le catalogue..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="pl-10 h-12 border-gray-200 focus:border-orange-500"
            />
          </div>

          <Select value="rating_avg-desc" onValueChange={() => {}}>
            <SelectTrigger className="w-full md:w-48 h-12">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating_avg-desc">Mieux notées</SelectItem>
              <SelectItem value="times_added-desc">Plus populaires</SelectItem>
              <SelectItem value="created_at-desc">Plus récentes</SelectItem>
              <SelectItem value="prep_time-asc">Plus rapides</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {trendingRecipes && trendingRecipes.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900">Tendances du moment</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendingRecipes.slice(0, 4).map(recipe => (
              <CatalogRecipeCard
                key={recipe.id}
                recipe={recipe}
                onAddToLibrary={onAddToLibrary}
                isAdding={isAdding}
                compact={true}
              />
            ))}
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Catalogue ({totalCount})</h2>
        </div>

        {isLoading ? (
          <FeedSkeleton />
        ) : recipes.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Aucune recette à explorer pour l'instant"
            description="Capture une URL Instagram, TikTok, YouTube ou un lien web et elle apparaîtra ici une fois extraite."
            action={{ label: "Aller à l'inbox", onClick: onSwitchToInbox }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recipes.map(recipe => (
                <CatalogRecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onAddToLibrary={onAddToLibrary}
                  isAdding={isAdding}
                />
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button onClick={fetchNextPage} size="lg" variant="outline">
                  Voir plus
                </Button>
              </div>
            )}
          </>
        )}
      </motion.section>
    </div>
  );
}
