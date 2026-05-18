/**
 * RecipeLibraryTab — onglet "Bibliothèque" (recettes utilisateur).
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx`.
 * PRP-237 PR4 §10 (2026-05-17) — ce tab absorbe désormais les sections
 * Tendances et Découvrir-catalogue (anciens onglets Feed/inbox quasi
 * vides en pratique). Cf. l'audit où le user avait 17 catalog rows
 * dont 11 déjà dans sa library : un onglet dédié au catalog n'avait
 * plus de sens.
 */
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  ChefHat,
  ChevronDown,
  Grid3X3,
  Heart,
  List,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
// PRP-237 PR4 (2026-05-17) — CollectionsManager removed from the
// toolbar at user request (placeholder content with no real collections
// pipeline behind it). The component file is kept on disk for a future
// re-introduction once user_collections has real data.
import LibraryRecipeCard from '@/components/recipes/LibraryRecipeCard';
import CatalogRecipeCard from '@/components/recipes/CatalogRecipeCard';
import type { UserRecipe } from '@/hooks/useUserRecipes';
import type { CatalogRecipe } from '@/hooks/useRecipeCatalog';

interface RecipeLibraryTabProps {
  recipes: UserRecipe[];
  isLoading: boolean;
  onShowOnboarding: () => void;
  trendingRecipes?: CatalogRecipe[];
  catalogRecipes?: CatalogRecipe[];
  onAddToLibrary?: (recipeId: string, recipeName: string) => void;
  isAdding?: boolean;
}

type StatTone = 'neutral' | 'tomato' | 'success';

function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: StatTone;
}) {
  // PRP-237 §5: only semantic green (`success`) for cuisinées/freshness,
  // tomato for favorites, everything else stays neutral.
  const toneClasses: Record<StatTone, string> = {
    neutral: 'bg-muted text-muted-foreground',
    tomato: 'bg-tomato/10 text-tomato',
    success: 'bg-success/10 text-success',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${toneClasses[tone]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground tabular-nums">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LibrarySkeleton() {
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

// PRP-232 PR3 — favoris V2. Schéma DB n'expose pas `is_favorite` : le proxy
// produit reste `personal_rating >= 4`, déjà utilisé par la StatCard.
const isFavorite = (r: UserRecipe) => (r.personal_rating || 0) >= 4;

export default function RecipeLibraryTab({
  recipes,
  isLoading,
  onShowOnboarding,
  trendingRecipes,
  catalogRecipes,
  onAddToLibrary,
  isAdding = false,
}: RecipeLibraryTabProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showDiscover, setShowDiscover] = useState(false);
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const showFavoritesOnly = filterParam === 'favorites';

  const visibleRecipes = useMemo(
    () => (showFavoritesOnly ? recipes.filter(isFavorite) : recipes),
    [recipes, showFavoritesOnly]
  );

  // Catalog recipes the user hasn't added yet. Drives the bottom
  // "Découvrir" section: skips the no-op of showing recipes already
  // in the library (cf. session audit — 17 catalog / 11 already saved
  // would otherwise produce a confusing duplicate row in the page).
  const newCatalogRecipes = useMemo(() => {
    if (!catalogRecipes || catalogRecipes.length === 0) return [];
    const knownCatalogIds = new Set(
      recipes
        .filter(u => u.is_from_catalog && u.recipe_id)
        .map(u => u.recipe_id as string)
    );
    return catalogRecipes.filter(c => !knownCatalogIds.has(c.id));
  }, [catalogRecipes, recipes]);

  const stats = {
    total: recipes.length,
    custom: recipes.filter(r => !r.is_from_catalog).length,
    cooked: recipes.filter(r => r.times_cooked > 0).length,
    favorites: recipes.filter(isFavorite).length,
  };

  return (
    <div className="space-y-6">
      {/* PRP-237 PR4 §10 — Tendances en tête de la library (absorbé
          depuis l'ancien onglet Feed). Affiché seulement si le hook
          renvoie quelque chose, sinon section omise. */}
      {trendingRecipes && trendingRecipes.length > 0 && onAddToLibrary && (
        <section
          aria-labelledby="library-trending-heading"
          className="relative rounded-lg border border-border bg-surface-muted/50 p-4 md:p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"
            >
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2
              id="library-trending-heading"
              className="text-base font-semibold text-foreground"
            >
              Tendances du moment
            </h2>
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
        </section>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Total" value={stats.total} tone="neutral" />
        <StatCard icon={Heart} label="Favorites" value={stats.favorites} tone="tomato" />
        <StatCard icon={ChefHat} label="Cuisinées" value={stats.cooked} tone="success" />
        <StatCard icon={Plus} label="Personnelles" value={stats.custom} tone="neutral" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-y border-border py-3">
        <div className="flex gap-2">
          <Button onClick={onShowOnboarding} variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Ajouter des favoris
          </Button>
        </div>

        <div className="flex gap-1" role="group" aria-label="Mode d'affichage">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            aria-label="Vue grille"
            aria-pressed={viewMode === 'grid'}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-label="Vue liste"
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
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
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            }
          >
            {visibleRecipes.map(recipe => (
              <LibraryRecipeCard key={recipe.id} recipe={recipe} viewMode={viewMode} />
            ))}
          </div>
        )}
      </motion.div>

      {/* PRP-237 PR4 §10 — Découvrir-catalogue en pied de page de la
          library. Repliable par défaut pour rester discret quand le
          delta catalog/library est petit (cas typique audit user :
          6 recettes nouvelles sur 17 catalog). */}
      {newCatalogRecipes.length > 0 && onAddToLibrary && (
        <section
          aria-labelledby="library-discover-heading"
          className="border-t border-border pt-4"
        >
          <button
            type="button"
            onClick={() => setShowDiscover(prev => !prev)}
            aria-expanded={showDiscover}
            aria-controls="library-discover-grid"
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h2
              id="library-discover-heading"
              className="text-base font-semibold text-foreground"
            >
              Découvrir {newCatalogRecipes.length} nouvelle{newCatalogRecipes.length > 1 ? 's' : ''} recette{newCatalogRecipes.length > 1 ? 's' : ''} du catalogue
            </h2>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                showDiscover ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showDiscover && (
            <div
              id="library-discover-grid"
              className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
            >
              {newCatalogRecipes.map(recipe => (
                <CatalogRecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onAddToLibrary={onAddToLibrary}
                  isAdding={isAdding}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
