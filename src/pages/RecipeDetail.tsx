import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Clock,
  Users,
  Star,
  Heart,
  Share,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { RecipeNutrition } from "@/components/recipes/RecipeNutrition";
import RecipeMediaFrame from "@/components/recipes/RecipeMediaFrame";
import RecipePrimaryActions from "@/components/recipes/RecipePrimaryActions";
import RecipeMobileActionBar from "@/components/recipes/RecipeMobileActionBar";
import RecipeSourcePreview from "@/components/recipes/RecipeSourcePreview";
import type { RecipeSourceLike } from "@/components/recipes/RecipeSourceCard";
import { toast } from "@/hooks/use-toast";
import { useRecipes } from "@/hooks/useRecipes";
import { useInventory, type ProductNutritionEnvelope } from "@/hooks/useInventory";
import { useRecipeInventoryAnalysis } from "@/hooks/useRecipeInventoryAnalysis";

import { Input } from "@/components/ui/input";

import { startCookingSession } from "@/services/cookingSessions";

import { fireRecipeAssistantAction } from "@/lib/recipeActions";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnifiedRecipe, invalidateUnifiedRecipeCache, type UnifiedRecipe } from "@/lib/recipeSource";
import { useImageManagement } from "@/hooks/useImageManagement";
import { useRecipeFavorites } from "@/hooks/useRecipeFavorites";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";

interface RecipeIngredient {
  id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string;
  is_essential: boolean;
  notes?: string;
}

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // PRP-238 PR2 — AuthenticatedLayout garantit l'auth ; on remplace
  // l'ancien supabase.auth.getSession() du tracker `viewed` (l.149)
  // par cette lecture synchrone depuis le contexte.
  const sessionUser = useAuthenticatedUser();
  const favorites = useRecipeFavorites();
  const [favoriting,setFavoriting] = useState(false);
  const [sharing,setSharing] = useState(false);
  const { recipes, loading: recipesLoading, deleteRecipe, fetchRecipes } = useRecipes();
  const { uploadImage } = useImageManagement();
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [chosenServings, setChosenServings] = useState<number | undefined>();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // 2026-05-18 — let RecipeMediaFrame display the new photo instantly
  // after upload, without waiting for the next `fetchRecipes` round
  // (which can take 1-2s on cold cache).
  const [overrideImageUrl, setOverrideImageUrl] = useState<string | null>(null);
  // Bug fix 2026-05-20 — useRecipes() ne fetche que `recipes` + `user_recipes`
  // (pas `recipes_catalog` direct), donc recipes.find(id) reste undefined
  // pour les ids catalog → on flashait "Recette non trouvée" même quand
  // fetchUnifiedRecipe résolvait. On capture maintenant le résultat unifié
  // dans un state local et on l'utilise en fallback.
  const [unifiedRecipe, setUnifiedRecipe] = useState<UnifiedRecipe | null>(null);
  // Bug fix 2026-05-20 (round 2) — track explicitement la confirmation
  // d'absence. Auparavant la gate erreur déduisait l'absence depuis
  // `!recipe && !loading && !recipesLoading`, mais ça déclenchait l'écran
  // d'erreur quand fetchUnifiedRecipe lisait un null cached (race RLS).
  // Maintenant on ne déclare 404 que quand une VRAIE résolution a retourné
  // null. Reset au changement d'id (navigation entre recettes).
  const [notFoundConfirmed, setNotFoundConfirmed] = useState(false);

  useEffect(() => {
    setNotFoundConfirmed(false);
    setUnifiedRecipe(null);
  }, [id]);

  const recipeFromList = recipes.find(r => r.id === id);
  // recipe : union des shapes Recipe (useRecipes) et UnifiedRecipe (recipeSource).
  // Les champs lus par cette page (name, image_url, prep_time, etc.) existent
  // dans les deux shapes — la tolerance null|undefined est déjà gérée.
  const recipe = recipeFromList ?? unifiedRecipe;
  const { analysis: inventoryAnalysis, error: analysisError } = useRecipeInventoryAnalysis(id || '',chosenServings);
  // Perf audit 2026-05-19 — l'inventaire fournit products.nutrition_json
  // déjà enrichis. Passés à RecipeNutrition, ils court-circuitent les
  // fetch OpenFoodFacts pour les ingrédients qu'on a en stock.
  // Le hook useInventory est appelé pour son effet : primer le cache
  // module via primeInventoryCache (Phase 3.1) si on arrive directement
  // sur la recette sans passer par /pantry.
  const { inventory } = useInventory();
  // Bug fix 2026-05-19 — auparavant on passait l'inventaire brut à
  // RecipeNutrition (clé par product.name lowercased). Les noms recette
  // ("huile d'olive") matchaient rarement l'inventaire ("Huile d'olive
  // vierge"), donc l'accélération tombait à l'eau et RecipeNutrition
  // restait en loading sur les fetches OFF. On utilise le résultat
  // déjà résolu par useRecipeInventoryAnalysis (fuzzy + RPC semantic).
  const inventoryProducts = useMemo(() => {
    const out: Array<{ name: string; nutrition_json?: ProductNutritionEnvelope | null }> = [];
    if (!inventoryAnalysis) return out;
    for (const match of inventoryAnalysis.availableIngredients) {
      const product = inventory.find(row => row.product_id === match.inventoryItem.product_id)?.product;
      if (!product?.nutrition_json) continue;
      out.push({
        name: match.ingredient.ingredient_name,
        nutrition_json: product.nutrition_json,
      });
    }
    return out;
  }, [inventoryAnalysis, inventory]);

  // Bug fix 2026-05-20 (round 2) — la gate erreur se base désormais sur
  // notFoundConfirmed (confirmation explicite via fetchUnifiedRecipe)
  // ET sur recipesLoading (useRecipes a fini son merge) ET sur l'absence
  // dans les deux sources. Le distinguo supprimée/non-trouvée garde la
  // même sémantique : un id valide qui n'existe nulle part = supprimée.
  const recipeDeleted = notFoundConfirmed && !recipesLoading && !recipe && id;

  // PRP-234 PR3 — writer `recipe_interactions.viewed` au mount.
  // Alimente le bloc « Continuer » du dashboard Today (PR3
  // useTodayContinue). Dedup via sessionStorage pour éviter de
  // spammer la table sur hot reload / navigation back-and-forth.
  // Best-effort : un échec ne casse pas la page.
  //
  // `recipe_interactions.recipe_id` references the legacy `recipes`
  // table (FK pending via 20260517161734 migration). Wrapper ids from
  // `user_recipes` would trigger a 409 either now (cross-table check)
  // or once the FK lands. We resolve via the unified lookup and skip
  // the insert when the recipe lives in another storage layer.
  useEffect(() => {
    if (!id) return;
    let active = true;
    void (async () => {
      const sessionKey = `v10-draft:${sessionUser.id}:viewed:${id}`;
      if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
        return;
      }
      // PRP-238 PR2 — user vient de useAuthenticatedUser() (synchrone,
      // garanti non-null par AuthenticatedLayout). Plus de round-trip
      // auth.getSession() necessaire.
      if (!active) return;
      const unified = await fetchUnifiedRecipe(id);
      if (!unified || unified.source !== 'recipes') {
        // Catalog-backed or absent — don't write a 'viewed' interaction
        // pointing at a row the FK won't accept.
        return;
      }
      const { error } = await supabase
        .from('recipe_interactions')
        .insert({
          user_id: sessionUser.id,
          recipe_id: unified.canonicalId,
          interaction_type: 'viewed',
        });
      if (!error && typeof window !== 'undefined') {
        sessionStorage.setItem(sessionKey, '1');
      }
      // Swallow l'erreur : ne casse pas l'ouverture de la recette.
    })();
    return () => {
      active = false;
    };
  }, [id, sessionUser.id]);

  useEffect(() => {
    if (id) {
      fetchRecipeDetails();
    }
  }, [id]);

  const fetchRecipeDetails = async () => {
    try {
      setLoading(true);

      // Resolve the recipe across the three storage layers (legacy
      // `recipes`, `user_recipes` wrapper, or direct `recipes_catalog`).
      // See lib/recipeSource.ts for the rationale.
      const recipeData = await fetchUnifiedRecipe(id!);
      if (!recipeData) {
        setUnifiedRecipe(null);
        // Marque l'absence comme CONFIRMÉE — la gate erreur ne se base
        // que sur ce flag, jamais sur "loading=false && recipe=null".
        setNotFoundConfirmed(true);
        throw new Error('Recipe not found in any source');
      }
      // Bug fix 2026-05-20 — capture le recipe résolu pour le render.
      // useRecipes() ne couvre pas recipes_catalog, donc sans ça les
      // catalog-only recipes restent affichées comme "non trouvée".
      setUnifiedRecipe(recipeData);
      setNotFoundConfirmed(false); // au cas où on a retry après un null précédent

      // Ingredients: catalog-backed rows carry them inline as JSONB.
      // Legacy `recipes` rows still use the dedicated `recipe_ingredients`
      // table.
      if (recipeData.inlineIngredients && recipeData.inlineIngredients.length > 0) {
        // Synthesise the RecipeIngredient[] shape expected by the rest
        // of the component. Catalog rows don't have stable per-ingredient
        // ids; we generate deterministic ones so React keys stay stable.
        setIngredients(
          recipeData.inlineIngredients.map((it, idx) => ({
            id: `${recipeData.id}-${idx}`,
            ingredient_name: it.ingredient_name,
            quantity: it.quantity ?? null,
            unit: it.unit ?? '',
            is_essential: it.is_essential,
            notes: it.notes,
          }))
        );
      } else {
        const { data: ingredientsData, error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', recipeData.canonicalId)
          .order('created_at');

        if (ingredientsError) throw ingredientsError;
        setIngredients(ingredientsData || []);
      }

      // Parse instructions from fetched recipe
      console.log('Recipe instructions:', recipeData?.instructions);
      if (recipeData?.instructions) {
        try {
          // Si c'est déjà un tableau, on l'utilise directement
          if (Array.isArray(recipeData.instructions)) {
            setInstructions(recipeData.instructions);
          } else if (typeof recipeData.instructions === 'string') {
            // Essayer de parser comme JSON d'abord
            try {
              const parsed = JSON.parse(recipeData.instructions);
              setInstructions(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              // Si ce n'est pas du JSON, traiter comme texte avec retours à la ligne
              const plainTextInstructions = recipeData.instructions
                .split(/\n+/)
                .map(instruction => instruction.trim())
                .filter(instruction => instruction.length > 0)
                .map(instruction => {
                  // Nettoyer les numéros au début si présents
                  return instruction.replace(/^\d+\.\s*/, '');
                });
              setInstructions(plainTextInstructions);
            }
          } else {
            setInstructions([]);
          }
        } catch (error) {
          console.error('Error parsing instructions:', error);
          setInstructions([]);
        }
      } else {
        console.log('No instructions found for recipe');
        setInstructions([]);
      }
    } catch (error) {
      console.error('Error fetching recipe details:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de la recette",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 2026-05-18 — RecipeMediaFrame upload handler. Compresses + uploads
  // to Supabase Storage (bucket `product-images`, shared with the
  // inventory pipeline), then persists the public URL on `recipes.image_url`.
  // Rolls back the optimistic display if either the upload or the DB
  // update fails. RLS on `recipes` enforces that only the owner can
  // update — catalog rows (is_public=true) get a friendly error
  // instead of a crash.
  const handlePhotoUpload = async (file: File) => {
    if (!id || !recipe) return;
    try {
      const publicUrl = await uploadImage(file, { maxWidth: 1600, quality: 0.85 });
      setOverrideImageUrl(publicUrl);

      const { error } = await supabase
        .from('recipes')
        .update({ image_url: publicUrl })
        .eq('id', id);

      if (error) {
        setOverrideImageUrl(null);
        toast({
          title: 'Photo non enregistrée',
          description: error.message ?? 'Vérifie que cette recette t\'appartient.',
          variant: 'destructive',
        });
        return;
      }

      // Refresh the merged `useRecipes` cache so other surfaces (cards,
      // library grid) pick up the new image too. Best-effort.
      // Bug fix 2026-05-20 — invalide aussi le cache module fetchUnifiedRecipe
      // pour que la prochaine ouverture de la recette voie la nouvelle photo.
      if (id) invalidateUnifiedRecipeCache(id);
      try { await fetchRecipes?.(); } catch { /* swallow */ }

      toast({
        title: 'Photo mise à jour',
        description: 'La nouvelle image est enregistrée.',
      });
    } catch (err) {
      setOverrideImageUrl(null);
      const message = err instanceof Error ? err.message : 'Upload impossible.';
      toast({ title: 'Échec de l\'upload', description: message, variant: 'destructive' });
    }
  };

  const handleDeleteClick = () => {
    if (!id) return;
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;

    try {
      await deleteRecipe(id);
      // Bug fix 2026-05-20 — invalide le cache module pour qu'une
      // navigation back-and-forward sur la même URL ne resserve pas
      // la recette supprimée depuis le cache 30s.
      invalidateUnifiedRecipeCache(id);
      toast({
        title: "Recette supprimée",
        description: "La recette a été supprimée avec succès",
      });
      setShowDeleteDialog(false);
      navigate('/kitchen/recipes');
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la recette",
        variant: "destructive"
      });
      setShowDeleteDialog(false);
    }
  };

  const showActionError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Action non confirmée. Réessayez.';
    setActionError(message);
    toast({ title: 'Action non confirmée', description: message, variant: 'destructive' });
  };

  const handleAddToShoppingList = async () => {
    if (!recipe || addingToCart) return;
    setAddingToCart(true); setActionError(null);
    try {
      const title = await fireRecipeAssistantAction({ id: recipe.id, name: recipe.name, servings: chosenServings },'add_missing');
      toast({ title });
    } catch (error) { showActionError(error); }
    finally { setAddingToCart(false); }
  };

  const handleCook = async () => {
    if (!id || cooking) return;
    setCooking(true); setActionError(null);
    try {
      const session = await startCookingSession(sessionUser.id,{ id,source:unifiedRecipe?.source ?? 'auto' },instructions,chosenServings);
      navigate(`/kitchen/cooking/${session.id}`);
    } catch (error) { showActionError(error); }
    finally { setCooking(false); }
  };

  const handleShare = async () => {
    if (!id || sharing) return;setSharing(true);setActionError(null);
    const url=new URL(`/kitchen/recipes/${encodeURIComponent(id)}`,window.location.origin);
    url.searchParams.set('source',unifiedRecipe?.source ?? 'auto');
    try {
      if (navigator.share) await navigator.share({ title:recipe?.name ?? 'Recette',url:url.href });
      else { await navigator.clipboard.writeText(url.href);toast({ title:'Lien de recette copié' }); }
    } catch (failure) { if (!(failure instanceof DOMException && failure.name==='AbortError')) showActionError(failure); }
    finally { setSharing(false); }
  };

  const getCuisineColor = (category: string) => {
    const colors: Record<string, string> = {
      'Française': 'bg-info/10 text-info',
      'Italienne': 'bg-success/10 text-success',
      'Asiatique': 'bg-destructive/10 text-destructive',
      'Méditerranéenne': 'bg-warning/10 text-warning',
      'Mexicaine': 'bg-warning/20 text-warning',
      'Indienne': 'bg-accent/10 text-accent',
      'Japonaise': 'bg-primary/10 text-primary',
      'Américaine': 'bg-info/20 text-info',
      'Végétarienne': 'bg-success/20 text-success',
      'Végan': 'bg-success/15 text-success',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  const getInventoryStatusIcon = (isAvailable: boolean, isEssential: boolean) => {
    if (isAvailable) return <CheckCircle className="w-4 h-4 text-success" />;
    if (isEssential) return <XCircle className="w-4 h-4 text-destructive" />;
    return <AlertCircle className="w-4 h-4 text-warning" />;
  };

  // Bug fix 2026-05-20 (round 2) — Gate erreur déterministe. On ne
  // déclare une recette comme introuvable QUE quand :
  //   1. fetchUnifiedRecipe a vraiment résolu sur null (notFoundConfirmed)
  //   2. ET useRecipes a fini son merge (recipesLoading = false)
  //   3. ET la recette n'est dans aucune des deux sources (!recipe)
  // Auparavant la déduction implicite `!recipe && !loading` flashait
  // l'erreur sur un null cached (race RLS) avant que le vrai recipe
  // arrive via useRecipes refetch.
  if (notFoundConfirmed && !recipesLoading && !recipe) {
    return (
      <div className="page-container">
        <div className="text-center py-12">
          <div className="mb-4">
            {recipeDeleted ? (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Recette supprimée</h2>
                <p className="text-muted-foreground mb-4">
                  Cette recette a été supprimée et n'est plus disponible.
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Recette non trouvée</h2>
                <p className="text-muted-foreground mb-4">
                  Cette recette n'existe pas ou n'est plus accessible.
                </p>
              </>
            )}
          </div>
          <Button onClick={() => navigate('/kitchen/recipes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux recettes
          </Button>
        </div>
      </div>
    );
  }
  
  // Afficher un skeleton pendant le chargement
  if (loading || !recipe) {
    return (
      <div className="page-container">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalTime = recipe.prep_time + recipe.cook_time;

  // PRP-232 PR4 — hiérarchie §9 : media → titre/source/temps → actions
  // primaires → ingrédients → instructions → notes → source.
  return (
    <div className="page-container max-w-4xl pb-[calc(var(--content-bottom-pad)+5rem)] md:pb-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/kitchen/recipes')}>
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          Retour aux recettes
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-11 w-11" aria-label={favorites.isFavorite(id ?? '') ? 'Retirer des favoris' : 'Mettre en favori'} aria-pressed={favorites.isFavorite(id ?? '')} disabled={favoriting || favorites.isLoading || favorites.isError} onClick={() => { if (!id || favoriting) return; setFavoriting(true); void favorites.toggle({ id,source:unifiedRecipe?.source ?? 'auto' }).catch(showActionError).finally(() => setFavoriting(false)); }}>
            <Heart className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon" disabled={sharing} aria-label={navigator.share ? 'Partager' : 'Copier le lien de recette'} onClick={() => void handleShare()}>
            <Share className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDeleteClick}
            aria-label="Supprimer cette recette"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* 1. Media frame */}
      <RecipeMediaFrame
        imageUrl={overrideImageUrl ?? recipe.image_url}
        alt={recipe.name}
        editable={!recipe.is_public}
        onUpload={handlePhotoUpload}
      />

      {/* 2. Titre + source + temps */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>
        {recipe.description && (
          <p className="text-muted-foreground mb-4">{recipe.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          {recipe.cuisine_category && (
            <Badge className={getCuisineColor(recipe.cuisine_category)}>
              {recipe.cuisine_category}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{totalTime} min</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" aria-hidden="true" />
            <span>{recipe.servings} personnes</span>
          </div>
          <div className="flex items-center gap-1" aria-label={`Difficulté ${recipe.difficulty}/5`}>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < recipe.difficulty ? 'fill-warning text-warning' : 'text-muted-foreground/30'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </header>

      {/* 3. Actions primaires
          PRP-238 PR1 etape (d) — sur mobile (< sm) on n'affiche pas le
          bloc inline ; une RecipeMobileActionBar sticky est rendue en
          bas de page (voir plus bas dans ce return). */}
      <div className="hidden md:block">
        <RecipePrimaryActions
          onCook={handleCook}
          onAddMissingToShoppingList={handleAddToShoppingList}
          onEdit={() => navigate(`/kitchen/recipes/${id}/edit`)}
          cooking={cooking}
          addingToCart={addingToCart}
          canCook={!!recipe && !loading}
          canAddMissing={!inventoryAnalysis?.canMake}
        />
      </div>

      {actionError && <p role="alert" className="mb-4 rounded-md border border-destructive p-3 text-destructive">{actionError} Relisez le stock si les quantités ont changé, puis réessayez.</p>}
      <label className="mb-4 flex items-center gap-3 text-sm">Portions à préparer
        <Input aria-label="Portions à préparer" className="w-24" type="number" min="1" max="100" step="1" value={chosenServings ?? recipe.servings}
          disabled={cooking} onChange={event => setChosenServings(Number(event.target.value) || undefined)} />
      </label>
      {/* Inventory status compact (sans Indian Price PRP-232 PR4) */}
      {inventoryAnalysis && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Analyse de l'inventaire</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <p className="font-medium">
                  {inventoryAnalysis.canMake ? '✅ Réalisable' : '❌ Ingrédients manquants'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponibles</p>
                <p className="font-medium">{inventoryAnalysis.availableIngredients.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manquants</p>
                <p className="font-medium text-orange-600">
                  {inventoryAnalysis.missingIngredients.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* 4. Ingrédients */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Ingrédients</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-6 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {ingredients.map(ingredient => {
                  const isAvailable = inventoryAnalysis?.availableIngredients.some(
                    ai => ai.ingredient.ingredient_name === ingredient.ingredient_name
                  );

                  return (
                    <div
                      key={ingredient.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        !isAvailable && ingredient.is_essential
                          ? 'bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-100'
                          : !isAvailable
                          ? 'bg-yellow-100 text-yellow-950 dark:bg-yellow-950 dark:text-yellow-100'
                          : 'bg-green-100 text-green-950 dark:bg-green-950 dark:text-green-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getInventoryStatusIcon(isAvailable || false, ingredient.is_essential)}
                        <span>
                          {ingredient.quantity == null ? "Quantité à vérifier :" : Number((ingredient.quantity * (chosenServings ?? recipe.servings) / recipe.servings).toFixed(6))} {ingredient.unit} {ingredient.ingredient_name}
                        </span>
                      </div>
                      {ingredient.notes && (
                        <span className="text-xs text-muted-foreground">{ingredient.notes}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Nutrition */}
        {ingredients.length > 0 && (
          <RecipeNutrition
            ingredients={ingredients}
            servings={recipe.servings || 4}
            recipeId={recipe.id}
            cachedNutrition={recipe.nutrition_info}
            inventoryProducts={inventoryProducts}
          />
        )}

        {/* 6. Instructions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : instructions.length > 0 ? (
              <ol className="space-y-4">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <p className="pt-1">{instruction}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground">Aucune instruction disponible</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Informations supplémentaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Temps de préparation</p>
              <p className="font-medium">{recipe.prep_time} min</p>
            </div>
            <div>
              <p className="text-muted-foreground">Temps de cuisson</p>
              <p className="font-medium">{recipe.cook_time} min</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type de repas</p>
              <p className="font-medium">{recipe.meal_type || 'Non spécifié'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Créée le</p>
              <p className="font-medium">
                {new Date(recipe.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mt-4">
              <p className="text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
        </CardContent>
      </Card>

      {/* 7. Crédits / source — self-hides pour les recettes manuelles. */}
      <RecipeSourcePreview recipe={recipe as unknown as RecipeSourceLike} className="mt-4" />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette recette ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La recette "{recipe?.name}" sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PRP-238 PR1 etape (d) — Mobile action bar sticky. Doublon des
          actions de RecipePrimaryActions cache sur mobile (cf. plus haut
          dans ce render). Empilee sur la bottom nav via
          `--mobile-nav-height` (CSS variable etape (a)). */}
      <RecipeMobileActionBar
        onCook={handleCook}
        onAddMissingToShoppingList={handleAddToShoppingList}
        onEdit={() => navigate(`/kitchen/recipes/${id}/edit`)}
        cooking={cooking}
        addingToCart={addingToCart}
        canCook={!!recipe && !loading}
        canAddMissing={!inventoryAnalysis?.canMake}
        missingCount={inventoryAnalysis?.missingIngredients?.length ?? 0}
      />
    </div>
  );
};

export default RecipeDetail;
