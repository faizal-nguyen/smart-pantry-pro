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
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Inbox, Plus, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

import { useRecipeCatalog, useTrendingRecipes } from '@/hooks/useRecipeCatalog';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useRecipes } from '@/hooks/useRecipes';
import { useSocialRecipeImports } from '@/hooks/useSocialRecipeImports';

import AddRecipeDialog from '@/components/recipes/AddRecipeDialog';
import { ExtractedRecipeModal } from '@/components/recipes/ExtractedRecipeModal';
import RecipeOnboarding from '@/components/onboarding/RecipeOnboarding';
import RecipeFeedTab from '@/components/recipes/tabs/RecipeFeedTab';
import RecipeLibraryTab from '@/components/recipes/tabs/RecipeLibraryTab';
import RecipeInboxTab from '@/components/recipes/tabs/RecipeInboxTab';
import RecipeImportTab from '@/components/recipes/tabs/RecipeImportTab';
import { draftToLegacyPayload } from '@/services/recipe-import/draftAdapter';

// PRP-232 PR1 — URL state contract (PRP §5). Legacy `explore` coerce vers
// `feed`; valeur inconnue retombe sur `feed` (default).
const TAB_VALUES = ['feed', 'library', 'inbox', 'import'] as const;
type RecipeTab = (typeof TAB_VALUES)[number];

const normalizeTab = (raw: string | null): RecipeTab => {
  if (!raw) return 'feed';
  if (raw === 'explore') return 'feed';
  return (TAB_VALUES as readonly string[]).includes(raw) ? (raw as RecipeTab) : 'feed';
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

  return (
    <div className="min-h-screen bg-surface">
      <div className="container mx-auto px-4 pt-8 pb-6 md:pt-10">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
            Recettes
          </h1>
          <p className="mt-1 text-sm md:text-base text-muted-foreground">
            Explore, sauvegarde, importe — tout ton répertoire culinaire en un seul endroit.
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-14">
            <TabsTrigger value="feed" className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5" />
              Feed
              <Badge variant="secondary" className="ml-1">
                {catalogCount.toLocaleString()}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="library" className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5" />
              Bibliothèque
              <Badge variant="secondary" className="ml-1">
                {userRecipes.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="inbox" className="flex items-center gap-2 text-base">
              <Inbox className="h-5 w-5" />
              À vérifier
              {inboxPendingCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {inboxPendingCount}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="import" className="flex items-center gap-2 text-base">
              <Plus className="h-5 w-5" />
              Ajouter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            <RecipeFeedTab
              recipes={catalogRecipes}
              totalCount={catalogCount}
              isLoading={catalogLoading}
              trendingRecipes={trendingRecipes}
              filters={catalogFilters}
              setFilters={setCatalogFilters}
              hasNextPage={catalogHasNext}
              fetchNextPage={catalogFetchNext}
              onAddToLibrary={handleAddToLibrary}
              isAdding={isAddingFromCatalog}
              onSwitchToInbox={() => setActiveTab('inbox')}
            />
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <RecipeLibraryTab
              recipes={userRecipes}
              isLoading={libraryLoading}
              onShowOnboarding={() => setShowOnboarding(true)}
            />
          </TabsContent>

          <TabsContent value="inbox" className="space-y-6">
            <RecipeInboxTab
              onVerifyDraft={({ import: socialImport, draft }) => {
                if (!draft) return;
                setExtractedRecipe(draftToLegacyPayload(socialImport, draft));
                setShowExtractedModal(true);
              }}
            />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <RecipeImportTab
              onRecipeExtracted={(recipe, sourceUrl) => {
                setExtractedRecipe({ ...recipe, sourceUrl });
                setShowExtractedModal(true);
              }}
              onOpenAddDialog={() => setShowAddDialog(true)}
            />
          </TabsContent>
        </Tabs>

        {showOnboarding && (
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
        )}

        <AddRecipeDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onRecipeAdded={() => {
            setShowAddDialog(false);
            setActiveTab('library');
          }}
        />

        <ExtractedRecipeModal
          open={showExtractedModal}
          onOpenChange={setShowExtractedModal}
          recipe={extractedRecipe}
          sourceUrl={extractedRecipe?.sourceUrl}
          onConfirm={handleExtractedConfirm}
        />
      </div>
    </div>
  );
}
