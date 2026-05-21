/**
 * Page Recettes — orchestrateur des 4 onglets.
 *
 * PRP-232 PR2 — split du composant monolithique 854L. Recipes.tsx ne porte
 * plus que :
 *  - le contrat d'URL state (`tab`, `filter`, etc. via `useSearchParams`) ;
 *  - les hooks de données partagés entre onglets ;
 *  - les modales globales (Onboarding, AddRecipeDialog, ExtractedRecipeModal) ;
 *  - le layout Tabs.
 * Le contenu de chaque onglet vit dans `src/components/recipes/tabs/`.
 */
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Plus, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

import { useRecipeCatalog, useTrendingRecipes } from '@/hooks/useRecipeCatalog';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useRecipes } from '@/hooks/useRecipes';
import { useSocialRecipeImports } from '@/hooks/useSocialRecipeImports';

// PRP-238 PR3 — Lazy-split des surfaces lourdes :
//   - RecipeImportTab (177L) : seulement quand l'user ouvre l'onglet Ajouter
//   - AddRecipeDialog (1043L) : seulement a la 1ere ouverture du dialog
//   - ExtractedRecipeModal (392L) : seulement apres extraction
//   - RecipeOnboarding (494L) : flow first-time-user seulement
// RecipeLibraryTab reste eager — c'est le default tab.
import RecipeLibraryTab from '@/components/recipes/tabs/RecipeLibraryTab';
const RecipeImportTab = lazy(() => import('@/components/recipes/tabs/RecipeImportTab'));
const AddRecipeDialog = lazy(() => import('@/components/recipes/AddRecipeDialog'));
const ExtractedRecipeModal = lazy(() =>
  import('@/components/recipes/ExtractedRecipeModal').then((m) => ({ default: m.ExtractedRecipeModal })),
);
const RecipeOnboarding = lazy(() => import('@/components/onboarding/RecipeOnboarding'));

import { draftToLegacyPayload } from '@/services/recipe-import/draftAdapter';

// PRP-232 PR1 — URL state contract.
// PRP-237 PR4 §10 (2026-05-17) — reduced to 2 active tabs after audit
// showed `feed` and `inbox` were quasi-empty in practice. Legacy values
// (`feed`, `explore`, `inbox`) redirect to `library`, which now hosts
// the Tendances and Découvrir-catalogue sections inline.
const TAB_VALUES = ['library', 'import'] as const;
type RecipeTab = (typeof TAB_VALUES)[number];

const LEGACY_TAB_REDIRECTS: Record<string, RecipeTab> = {
  feed: 'library',
  explore: 'library',
  inbox: 'library',
};

const normalizeTab = (raw: string | null): RecipeTab => {
  if (!raw) return 'library';
  if (raw in LEGACY_TAB_REDIRECTS) return LEGACY_TAB_REDIRECTS[raw];
  return (TAB_VALUES as readonly string[]).includes(raw) ? (raw as RecipeTab) : 'library';
};

export default function Recipes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo(() => normalizeTab(searchParams.get('tab')), [searchParams]);
  const setActiveTab = (value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', value);
      return next;
    }, { replace: true });
  };

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExtractedModal, setShowExtractedModal] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const {
    recipes: catalogRecipes,
    totalCount: catalogCount,
    isLoading: catalogLoading,
    filters: catalogFilters,
    setFilters: setCatalogFilters,
    hasNextPage: catalogHasNext,
    fetchNextPage: catalogFetchNext,
  } = useRecipeCatalog();

  const {
    recipes: userRecipes,
    isLoading: libraryLoading,
    addFromCatalog,
    isAddingFromCatalog,
  } = useUserRecipes();

  const { addRecipeWithIngredients, fetchRecipes } = useRecipes();
  const { pendingCount: inboxPendingCount } = useSocialRecipeImports();
  const { data: trendingRecipes } = useTrendingRecipes();

  // Onboarding auto-trigger volontairement désactivé (legacy).
  useEffect(() => {}, [userRecipes, libraryLoading]);

  const handleAddToLibrary = (recipeId: string, recipeName: string) => {
    addFromCatalog({ catalogRecipeId: recipeId }, {
      onSuccess: () => toast({
        title: 'Recette ajoutée !',
        description: `"${recipeName}" a été ajoutée à votre bibliothèque.`,
      }),
      onError: error => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
    });
  };

  const handleExtractedConfirm = async (editedRecipe: any) => {
    try {
      const { ingredients, ...recipeData } = editedRecipe;
      await addRecipeWithIngredients(recipeData, ingredients);
      setShowExtractedModal(false);
      setActiveTab('library');
      toast({
        title: 'Recette ajoutée !',
        description: `"${editedRecipe.name}" a été ajoutée à votre bibliothèque.`,
      });
      try { await fetchRecipes?.(); } catch { /* fetchRecipes optionnel */ }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la recette.', variant: 'destructive' });
    }
  };

  // PRP-237 PR4 — dynamic header subtitle reflects the active tab.
  // Surfaces real counts up-front so the user gets a "where am I" cue
  // without scanning the tabs.
  const headerMeta = useMemo<{ subtitle: string; chips: Array<{ label: string; value: string }> }>(() => {
    const fmt = (n: number) => n.toLocaleString('fr-FR');
    switch (activeTab) {
      case 'library':
        return {
          subtitle: 'Ta sélection personnelle, prête à cuisiner.',
          chips: [
            { label: 'recettes', value: fmt(userRecipes.length) },
            { label: 'dans le catalogue', value: fmt(catalogCount) },
            ...(inboxPendingCount > 0
              ? [{ label: 'à vérifier', value: fmt(inboxPendingCount) }]
              : []),
          ],
        };
      case 'import':
      default:
        return {
          subtitle: 'Capture une URL, importe une vidéo, ou crée une recette à la main.',
          chips: [
            ...(inboxPendingCount > 0
              ? [{ label: 'à vérifier', value: fmt(inboxPendingCount) }]
              : []),
            { label: 'bibliothèque', value: fmt(userRecipes.length) },
          ],
        };
    }
  }, [activeTab, catalogCount, userRecipes.length, inboxPendingCount]);

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        {/* PRP-237 PR4 — premium utility header, no hero gradient. */}
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Recettes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{headerMeta.subtitle}</p>
            <div
              className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
              aria-label="Compteurs de recettes"
            >
              {headerMeta.chips.map((chip, idx) => (
                <React.Fragment key={chip.label}>
                  {idx > 0 && <span aria-hidden="true" className="text-border">·</span>}
                  <span>
                    <span className="font-medium text-foreground tabular-nums">{chip.value}</span>{' '}
                    <span>{chip.label.toLowerCase()}</span>
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('import')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Importer
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle recette
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 h-12 w-full justify-start overflow-x-auto">
            <TabsTrigger value="library" className="gap-2 min-h-11 text-sm">
              <BookOpen className="h-4 w-4" />
              Bibliothèque
              <Badge variant="secondary" className="ml-1 font-normal">
                {userRecipes.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="import" className="gap-2 min-h-11 text-sm">
              <Plus className="h-4 w-4" />
              Ajouter
              {inboxPendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 font-normal">
                  {inboxPendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            <RecipeLibraryTab
              recipes={userRecipes}
              isLoading={libraryLoading}
              onShowOnboarding={() => setShowOnboarding(true)}
              trendingRecipes={trendingRecipes}
              catalogRecipes={catalogRecipes}
              onAddToLibrary={handleAddToLibrary}
              isAdding={isAddingFromCatalog}
            />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            {/* Radix Tabs ne mount TabsContent que quand activeTab match.
                Wrap dans Suspense pour gerer le chunk fetch au premier
                switch sur l'onglet. Fallback minimal pour eviter le flash. */}
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              }
            >
              <RecipeImportTab
                onRecipeExtracted={(recipe, sourceUrl) => {
                  setExtractedRecipe({ ...recipe, sourceUrl });
                  setShowExtractedModal(true);
                }}
                onOpenAddDialog={() => setShowAddDialog(true)}
                pendingCount={inboxPendingCount}
                onVerifyDraft={({ import: socialImport, draft }) => {
                  if (!draft) return;
                  setExtractedRecipe(draftToLegacyPayload(socialImport, draft));
                  setShowExtractedModal(true);
                }}
              />
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Dialogs/modals lazy — fetch du chunk a la 1ere ouverture
            seulement. Suspense fallback=null parce que les dialogs
            apparaissent en overlay, le spinner inline serait visible
            sous l'overlay et n'apporterait rien. */}
        {showOnboarding && (
          <Suspense fallback={null}>
            <RecipeOnboarding
              isOpen={showOnboarding}
              onComplete={() => {
                setShowOnboarding(false);
                setActiveTab('library');
                toast({
                  title: '🎉 Bienvenue !',
                  description: 'Votre bibliothèque de recettes est prête !',
                });
              }}
              onSkip={() => {
                setShowOnboarding(false);
                setActiveTab('feed');
              }}
            />
          </Suspense>
        )}

        {showAddDialog && (
          <Suspense fallback={null}>
            <AddRecipeDialog
              open={showAddDialog}
              onOpenChange={setShowAddDialog}
              onRecipeAdded={() => {
                setShowAddDialog(false);
                setActiveTab('library');
              }}
            />
          </Suspense>
        )}

        {showExtractedModal && (
          <Suspense fallback={null}>
            <ExtractedRecipeModal
              open={showExtractedModal}
              onOpenChange={setShowExtractedModal}
              recipe={extractedRecipe}
              sourceUrl={extractedRecipe?.sourceUrl}
              onConfirm={handleExtractedConfirm}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
