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
import { BookOpen, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useRecipes } from '@/hooks/useRecipes';
import { useSocialRecipeImports } from '@/hooks/useSocialRecipeImports';

// PRP-238 PR3 — Lazy-split des surfaces lourdes :
//   - RecipeImportTab (177L) : seulement quand l'user ouvre l'onglet Ajouter
//   - AddRecipeDialog (1043L) : seulement a la 1ere ouverture du dialog
//   - ExtractedRecipeModal (392L) : seulement apres extraction
//   - RecipeOnboarding (494L) : flow first-time-user seulement
// RecipeLibraryTab reste eager — c'est le default tab.
import RoutineRecipeLibrary from '@/components/recipes/RoutineRecipeLibrary';
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
  inbox: 'import',
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
    recipes: userRecipes,
    isLoading: libraryLoading,
    addFromCatalog,
    isAddingFromCatalog,
  } = useUserRecipes();

  const { addRecipeWithIngredients, fetchRecipes } = useRecipes();
  const { pendingCount: inboxPendingCount } = useSocialRecipeImports();

  // Onboarding auto-trigger volontairement désactivé (legacy).
  useEffect(() => {}, [userRecipes, libraryLoading]);

  const handleAddToLibrary = (recipeId: string, recipeName: string) => {
    addFromCatalog({ catalogRecipeId: recipeId }, {
      onSuccess: () => toast({
        title: 'Recette ajoutée !',
        description: `« ${recipeName} » est dans tes recettes.`,
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
        description: `« ${editedRecipe.name} » est dans tes recettes.`,
      });
      try { await fetchRecipes?.(); } catch { /* fetchRecipes optionnel */ }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la recette.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background culinary-page">
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="culinary-title">
              Cuisiner
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{activeTab==='library' ? 'Trouve le plat qui te fait envie.' : 'Garde une recette pour plus tard.'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Écrire
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-3 min-h-11 h-auto flex flex-wrap w-full justify-start gap-1">
            <TabsTrigger value="library" className="gap-2 min-h-11 text-sm">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Bibliothèque
            </TabsTrigger>

            <TabsTrigger value="import" className="gap-2 min-h-11 text-sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Importer
              {inboxPendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 font-normal">
                  {inboxPendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            <RoutineRecipeLibrary library={userRecipes} onAdd={handleAddToLibrary} isAdding={isAddingFromCatalog} />
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
                  title: 'Recettes enregistrées',
                  description: 'Ta bibliothèque est prête à être parcourue.',
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
