/**
 * Page Recettes — bibliothèque, découverte et import.
 *
 * PRP-232 PR2 — split du composant monolithique 854L. Recipes.tsx ne porte
 * plus que :
 *  - le contrat d'URL state (`tab`, `filter`, etc. via `useSearchParams`) ;
 *  - les hooks de données partagés entre onglets ;
 *  - les dialogues d’écriture et de vérification canonique ;
 *  - le layout Tabs.
 * Le contenu de chaque onglet vit dans `src/components/recipes/tabs/`.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Compass, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useRecipes } from '@/hooks/useRecipes';
import { useSocialRecipeImports } from '@/hooks/useSocialRecipeImports';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';

// PRP-238 PR3 — Lazy-split des surfaces lourdes :
//   - RecipeImportTab (177L) : seulement quand l'user ouvre l'onglet Ajouter
//   - AddRecipeDialog (1043L) : seulement a la 1ere ouverture du dialog
//   - DiscoveryDraftEditor : vérification des imports, depuis les deux onglets
//   - RecipeOnboarding (494L) : flow first-time-user seulement
// RecipeLibraryTab reste eager — c'est le default tab.
import RoutineRecipeLibrary from '@/components/recipes/RoutineRecipeLibrary';
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';
import RecipesMenusSwitch from '@/components/recipes/RecipesMenusSwitch';
const RecipeImportTab = lazy(() => import('@/components/recipes/tabs/RecipeImportTab'));
const RecipeDiscovery = lazy(() => import('@/components/recipes/discovery/RecipeDiscovery'));
const CanonicalDraftEditor = lazy(() => import('@/components/recipes/discovery/DiscoveryDraftEditor'));
const AddRecipeDialog = lazy(() => import('@/components/recipes/AddRecipeDialog'));
const RecipeOnboarding = lazy(() => import('@/components/onboarding/RecipeOnboarding'));

import type { PreparedCanonicalImport } from '@/components/recipes/discovery/DiscoveryDraftEditor';

// PRP-232 PR1 — URL state contract.
// PRP-237 PR4 §10 (2026-05-17) — reduced to 2 active tabs after audit
// showed `feed` and `inbox` were quasi-empty in practice. Legacy values
// (`feed`, `explore`, `inbox`) redirect to `library`, which now hosts
// the Tendances and Découvrir-catalogue sections inline.
const TAB_VALUES = ['library', 'discover', 'import'] as const;
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
  const user = useAuthenticatedUser();
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [canonicalReview, setCanonicalReview] = useState<{ owner: string; prepared: PreparedCanonicalImport } | null>(null);

  const {
    recipes: userRecipes,
    isLoading: libraryLoading,
    addFromCatalog,
    isAddingFromCatalog,
  } = useUserRecipes();

  const { fetchRecipes } = useRecipes();
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

  return (
    <div className="culinary-page kitchen-page kitchen-recipes-page">
      <div className="kitchen-recipes-content">
        <RecipesMenusSwitch />
        <KitchenPageHeader title="Recettes" description={activeTab==='library' ? 'Les plats que tu aimes, et ceux qu’il te reste à découvrir.' : activeTab==='discover' ? 'De nouvelles inspirations, à choisir et à cuisiner.' : 'Garde une recette pour plus tard.'} actions={<Button className="min-h-11" onClick={()=>setShowAddDialog(true)}><Plus className="h-4 w-4" aria-hidden="true"/>Écrire une recette</Button>} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="kitchen-recipe-tabs">
            <TabsTrigger value="library" className="gap-2 min-h-11 text-sm">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Bibliothèque
            </TabsTrigger>

            <TabsTrigger value="discover" className="gap-2 min-h-11 text-sm">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Découvrir
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

          <TabsContent value="discover" className="space-y-6">
            <Suspense fallback={<p role="status" className="text-sm py-6">Chargement de la découverte…</p>}>
              <RecipeDiscovery />
            </Suspense>
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
                onOpenAddDialog={() => setShowAddDialog(true)}
                pendingCount={inboxPendingCount}
                onVerifyDraft={({ import: socialImport, draft }) => {
                  if (!draft || socialImport.user_id !== user.id || draft.user_id !== user.id || draft.import_id !== socialImport.id) {
                    toast({ title: 'Brouillon indisponible', description: 'Relis cet import depuis le compte qui l’a gardé.', variant: 'destructive' });
                    return;
                  }
                  setCanonicalReview({ owner: user.id, prepared: { import: socialImport, draft } });
                }}
              />
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Dialogs/modals lazy — fetch du chunk a la 1ere ouverture
            seulement. Suspense fallback=null parce que les dialogs
            apparaissent en overlay, le spinner inline serait visible
            sous l'overlay et n'apporterait rien. */}
        {canonicalReview?.owner === user.id && (
          <Suspense fallback={null}>
            <CanonicalDraftEditor key={`${user.id}:${canonicalReview.prepared.import.id}`} owner={user.id} prepared={canonicalReview.prepared}
              onClose={() => setCanonicalReview(null)} onAdded={() => { void fetchRecipes(); }} />
          </Suspense>
        )}
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
              allowLinkImport={false}
              onOpenChange={setShowAddDialog}
              onRecipeAdded={() => {
                setShowAddDialog(false);
                setActiveTab('library');
              }}
            />
          </Suspense>
        )}

      </div>
    </div>
  );
}
