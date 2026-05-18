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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="h-full overflow-hidden">
          <div className="w-full aspect-[16/10] bg-muted animate-pulse" />
          <CardContent className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
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
    <div className="space-y-8">
      {/* PRP-237 PR4 — dense toolbar, no decorative panel. */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans le catalogue…"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <Select value="rating_avg-desc" onValueChange={() => {}}>
          <SelectTrigger className="w-full md:w-48 h-10">
            <SelectValue placeholder="Trier par…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating_avg-desc">Mieux notées</SelectItem>
            <SelectItem value="times_added-desc">Plus populaires</SelectItem>
            <SelectItem value="created_at-desc">Plus récentes</SelectItem>
            <SelectItem value="prep_time-asc">Plus rapides</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {trendingRecipes && trendingRecipes.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          aria-labelledby="trending-heading"
          className="relative rounded-lg border border-border bg-surface-muted/50 p-4 md:p-6"
        >
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"
              >
                <TrendingUp className="h-4 w-4" />
              </span>
              <h2
                id="trending-heading"
                className="text-lg font-semibold text-foreground"
              >
                Tendances du moment
              </h2>
            </div>
            <p className="text-xs text-muted-foreground md:text-right">
              Les {Math.min(trendingRecipes.length, 4)} recettes les plus ajoutées cette semaine.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
      >
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Catalogue</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {totalCount.toLocaleString()} recettes
          </span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              <div className="flex justify-center mt-6">
                <Button onClick={fetchNextPage} variant="outline">
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
