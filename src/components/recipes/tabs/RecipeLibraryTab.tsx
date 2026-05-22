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
import { Badge } from '@/components/ui/badge';
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
import { ALL_CUISINES_KEY, CUISINE_DEFS, inferCuisineKey } from '@/lib/cuisineTypes';

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
  const [selectedCuisine, setSelectedCuisine] = useState<string>(ALL_CUISINES_KEY);
  // PRP-239 PR3 — protein family / cut filters. Single-select per axis
  // (matches the cuisine ribbon UX) so the visual remains a tap target,
  // not a dropdown. When a family is selected, the cut ribbon below
  // shows only the cuts that appear within that family.
  const [selectedProteinFamily, setSelectedProteinFamily] = useState<string>('');
  const [selectedProteinCut, setSelectedProteinCut] = useState<string>('');
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const showFavoritesOnly = filterParam === 'favorites';

  // Pré-calcule la cuisine inférée par recette une seule fois. Évite
  // de re-courir l'inférence dans le filtre + dans les chips counts.
  const recipesWithCuisine = useMemo(
    () =>
      recipes.map((recipe) => ({
        recipe,
        cuisineKey: inferCuisineKey({
          cuisine_category: recipe.cuisine_category,
          personal_tags: recipe.personal_tags,
          catalog_recipe: recipe.catalog_recipe,
          title: recipe.custom_title,
        }),
      })),
    [recipes]
  );

  // Chips dynamiques : seules les cuisines réellement présentes dans
  // la library s'affichent (évite "Marocain (0)" si le user n'en a
  // pas). On lit le count en gardant l'ordre canonique de CUISINE_DEFS
  // pour que le ruban soit prévisible.
  const cuisineChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { cuisineKey } of recipesWithCuisine) {
      if (!cuisineKey) continue;
      counts.set(cuisineKey, (counts.get(cuisineKey) ?? 0) + 1);
    }
    return CUISINE_DEFS
      .filter((def) => (counts.get(def.key) ?? 0) > 0)
      .map((def) => ({ ...def, count: counts.get(def.key) ?? 0 }));
  }, [recipesWithCuisine]);

  // PRP-239 PR3 — Family + cut chip data, derived from recipe_facets
  // populated by the PR3 backfill. Recipes without facets (custom,
  // pre-backfill) silently pass when no filter is selected.
  const PROTEIN_FAMILY_LABELS: Record<string, { label: string; icon: string }> = {
    poulet:        { label: 'Poulet',        icon: '🍗' },
    boeuf:         { label: 'Bœuf',          icon: '🥩' },
    agneau:        { label: 'Agneau',        icon: '🐑' },
    poisson:       { label: 'Poisson',       icon: '🐟' },
    fruits_de_mer: { label: 'Fruits de mer', icon: '🦐' },
    tofu:          { label: 'Tofu',          icon: '🍱' },
    oeuf:          { label: 'Œuf',           icon: '🥚' },
    mixte:         { label: 'Mixte',         icon: '🍽️' },
  };
  const PROTEIN_CUT_LABELS: Record<string, string> = {
    cuisse: 'Cuisses', haut_de_cuisse: 'Hauts de cuisse', pilon: 'Pilons',
    aile: 'Ailes', blanc: 'Blancs', escalope: 'Escalopes', entier: 'Entier',
    hache: 'Haché', steak: 'Steak', tranche: 'Tranches', jarret: 'Jarret',
    chuck: 'Chuck', gras: 'Gras', saumon: 'Saumon', thon: 'Thon',
    poisson_blanc: 'Poisson blanc', crevette: 'Crevettes',
    // PRP-239 PR3.2 — agneau cuts (not in PRP §9.2 V1, added by request)
    gigot: 'Gigot', epaule: 'Épaule', cotelette: 'Côtelettes', selle: 'Selle',
  };
  // PRP-239 PR3.1 — which cut belongs to which family. Mirror of
  // RecipeFacetExtractor.CUT_RULES so the UI never shows "crevette" as
  // a poulet cut on a mixte recipe (e.g. poulet+crevettes). Without this
  // a recipe in {poulet, fruits_de_mer} would expose ALL its cuts when
  // the user clicked "Poulet". oeuf/tofu/agneau/mixte have no cuts in
  // the V1 taxonomy → empty ribbon (we hide it when empty).
  const CUTS_BY_FAMILY: Record<string, string[]> = {
    poulet: ['cuisse', 'haut_de_cuisse', 'pilon', 'aile', 'blanc', 'escalope', 'entier', 'hache'],
    boeuf: ['hache', 'steak', 'tranche', 'jarret', 'chuck', 'gras'],
    agneau: ['gigot', 'epaule', 'cotelette', 'selle', 'jarret', 'hache'],
    poisson: ['saumon', 'thon', 'poisson_blanc'],
    fruits_de_mer: ['crevette'],
    tofu: [],
    oeuf: [],
    mixte: [],
  };

  const proteinFamilyChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) {
      const fams = r.recipe_facets?.protein_families ?? [];
      for (const f of fams) counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    return Object.keys(PROTEIN_FAMILY_LABELS)
      .filter((k) => (counts.get(k) ?? 0) > 0)
      .map((k) => ({ key: k, ...PROTEIN_FAMILY_LABELS[k], count: counts.get(k) ?? 0 }));
  }, [recipes]);

  const proteinCutChips = useMemo(() => {
    if (!selectedProteinFamily) return [];
    const allowedCuts = new Set(CUTS_BY_FAMILY[selectedProteinFamily] ?? []);
    if (allowedCuts.size === 0) return []; // family has no cut taxonomy (oeuf, tofu, agneau, mixte)
    const counts = new Map<string, number>();
    for (const r of recipes) {
      const fams = r.recipe_facets?.protein_families ?? [];
      if (!fams.includes(selectedProteinFamily)) continue;
      const cuts = r.recipe_facets?.protein_cuts ?? [];
      for (const c of cuts) {
        if (!allowedCuts.has(c)) continue; // skip cuts that belong to another family
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([_, n]) => n > 0)
      .map(([k, n]) => ({ key: k, label: PROTEIN_CUT_LABELS[k] ?? k, count: n }))
      .sort((a, b) => b.count - a.count);
  }, [recipes, selectedProteinFamily]);

  const visibleRecipes = useMemo(() => {
    let out = recipesWithCuisine;
    if (showFavoritesOnly) out = out.filter(({ recipe }) => isFavorite(recipe));
    if (selectedCuisine !== ALL_CUISINES_KEY) {
      out = out.filter(({ cuisineKey }) => cuisineKey === selectedCuisine);
    }
    if (selectedProteinFamily) {
      out = out.filter(({ recipe }) =>
        (recipe.recipe_facets?.protein_families ?? []).includes(selectedProteinFamily),
      );
    }
    if (selectedProteinCut) {
      out = out.filter(({ recipe }) =>
        (recipe.recipe_facets?.protein_cuts ?? []).includes(selectedProteinCut),
      );
    }
    return out.map(({ recipe }) => recipe);
  }, [
    recipesWithCuisine,
    showFavoritesOnly,
    selectedCuisine,
    selectedProteinFamily,
    selectedProteinCut,
  ]);

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

      {/* Filtre cuisine — affiché seulement si au moins une cuisine est
          détectée dans la library. Évite un ruban vide qui agrandit
          la page sans valeur. */}
      {cuisineChips.length > 0 && (
        <div
          className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:flex-wrap"
          role="tablist"
          aria-label="Filtre par type de cuisine"
        >
          <Badge
            variant={selectedCuisine === ALL_CUISINES_KEY ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setSelectedCuisine(ALL_CUISINES_KEY)}
          >
            Toutes ({recipes.length})
          </Badge>
          {cuisineChips.map((c) => (
            <Badge
              key={c.key}
              variant={selectedCuisine === c.key ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() =>
                setSelectedCuisine(selectedCuisine === c.key ? ALL_CUISINES_KEY : c.key)
              }
            >
              <span aria-hidden className="mr-1">{c.icon}</span>
              {c.label} ({c.count})
            </Badge>
          ))}
        </div>
      )}

      {/* PRP-239 PR3 — Protéine ribbon. Only shown when at least one
          recipe has been classified (post-backfill). Selecting a family
          reveals the matching cuts ribbon below. */}
      {proteinFamilyChips.length > 0 && (
        <div
          className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:flex-wrap"
          role="tablist"
          aria-label="Filtre par protéine"
        >
          {proteinFamilyChips.map((p) => (
            <Badge
              key={p.key}
              variant={selectedProteinFamily === p.key ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => {
                if (selectedProteinFamily === p.key) {
                  setSelectedProteinFamily('');
                  setSelectedProteinCut('');
                } else {
                  setSelectedProteinFamily(p.key);
                  // Reset cut when switching family (the previously
                  // selected cut may not exist within the new family).
                  setSelectedProteinCut('');
                }
              }}
            >
              <span aria-hidden className="mr-1">{p.icon}</span>
              {p.label} ({p.count})
            </Badge>
          ))}
        </div>
      )}

      {/* Cuts ribbon — only when a family is selected and has cuts to expose */}
      {selectedProteinFamily && proteinCutChips.length > 0 && (
        <div
          className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:flex-wrap"
          role="tablist"
          aria-label={`Coupes pour ${PROTEIN_FAMILY_LABELS[selectedProteinFamily]?.label ?? selectedProteinFamily}`}
        >
          {proteinCutChips.map((c) => (
            <Badge
              key={c.key}
              variant={selectedProteinCut === c.key ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap text-xs"
              onClick={() =>
                setSelectedProteinCut(selectedProteinCut === c.key ? '' : c.key)
              }
            >
              {c.label} ({c.count})
            </Badge>
          ))}
        </div>
      )}

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
          selectedCuisine !== ALL_CUISINES_KEY ? (
            <EmptyState
              icon={ChefHat}
              title="Aucune recette dans cette cuisine"
              description="Essaye une autre cuisine, ou retire le filtre pour voir toute ta bibliothèque."
              action={{
                label: 'Voir toutes les recettes',
                onClick: () => setSelectedCuisine(ALL_CUISINES_KEY),
              }}
            />
          ) : showFavoritesOnly ? (
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
