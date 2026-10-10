import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { recipeDurationMinutes, RecipeReferenceSchema, type RecipeEvaluationInput } from '@smart/shared';
import { ArrowLeft, Clock, Users, Star, Heart, Share, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import RecipeMediaFrame from '@/components/recipes/RecipeMediaFrame';
import RecipePrimaryActions from '@/components/recipes/RecipePrimaryActions';
import RecipeMobileActionBar from '@/components/recipes/RecipeMobileActionBar';
import RecipeSourcePreview from '@/components/recipes/RecipeSourcePreview';
import type { RecipeSourceLike } from '@/components/recipes/RecipeSourceCard';
import RecipeEvaluationPanel from '@/components/recipes/RecipeEvaluationPanel';
import { useRecipeDetails } from '@/hooks/useRecipeDetails';
import { useRecipeEvaluation } from '@/hooks/useRecipeEvaluation';
import { useRecipes } from '@/hooks/useRecipes';
import { useImageManagement } from '@/hooks/useImageManagement';
import { useRecipeFavorites } from '@/hooks/useRecipeFavorites';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { toast } from '@/hooks/use-toast';
import { startCookingSession } from '@/services/cookingSessions';
import { saveRecipePhoto } from '@/services/recipeDetails';
import { fireRecipeAssistantAction } from '@/lib/recipeActions';
import { recipeDetailPath } from '@/lib/recipeLinks';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { supabase } from '@/integrations/supabase/client';
import { ApiError } from '@/lib/api';

// Reset all drafts and optimistic state when the account or exact recipe changes.
export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const user = useAuthenticatedUser();
  return <RecipeDetailContent key={user.id + ':' + id + ':' + (params.get('source') ?? 'auto')} id={id} />;
}

function RecipeDetailContent({ id }: { id?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAuthenticatedUser();
  const parsed = RecipeReferenceSchema.safeParse({ id, source: params.get('source') ?? 'auto' });
  const details = useRecipeDetails(user.id, parsed.success ? parsed.data : undefined);
  const recipe = details.data?.recipe;
  const ingredients = details.data?.ingredients ?? [];
  const instructions = details.data?.instructions ?? [];
  const reference: RecipeEvaluationInput['recipe'] | undefined = recipe ? { id: recipe.id, source: recipe.source } : undefined;
  const [chosenServings, setChosenServings] = useState<number | undefined>(() => {
    const value = Number(params.get('servings'));
    return Number.isFinite(value) && value > 0 && value <= 100 ? value : undefined;
  });
  const servings = chosenServings ?? recipe?.servings ?? undefined;
  const revision = JSON.stringify([recipe?.updated_at, recipe?.inlineIngredients, ingredients, recipe?.servings]);
  const evaluation = useRecipeEvaluation(reference, servings, revision, recipe?.canonicalId);
  const freshEvaluation = !evaluation.isFetching && !details.isFetching && !evaluation.error && !details.error ? evaluation.data : undefined;
  const { deleteRecipe, fetchRecipes } = useRecipes();
  const { uploadImage } = useImageManagement();
  const favorites = useRecipeFavorites();
  const [favoriting, setFavoriting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [overrideImageUrl, setOverrideImageUrl] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Viewed is best-effort; only legacy IDs satisfy its foreign key.
  useEffect(() => {
    if (!id || recipe?.source !== 'recipes') return;
    let active = true;
    void (async () => {
      try {
        const key = 'v10-draft:' + user.id + ':viewed:' + id;
        if (sessionStorage.getItem(key)) return;
        const session = await supabase.auth.getSession();
        if (!active || session.data.session?.user.id !== user.id) return;
        const { error } = await supabase.from('recipe_interactions').insert({ user_id: user.id, recipe_id: id, interaction_type: 'viewed' });
        if (!error && active) sessionStorage.setItem(key, '1');
      } catch { /* Tracking never blocks a recipe or exposes database diagnostics. */ }
    })();
    return () => { active = false; };
  }, [id, recipe?.source, user.id]);

  const showActionError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Action non confirmée. Réessaie.';
    setActionError(message);
    toast({ title: 'Action non confirmée', description: message, variant: 'destructive' });
  };
  const ownsRecipe = !!recipe && recipe.source !== 'recipes_catalog' && recipe.user_id === user.id;
  // The existing editor only writes legacy recipes. Do not send a library ID to it.
  const canEdit = ownsRecipe && recipe?.source === 'recipes';
  const hasBaseServings = recipe?.servings != null && Number.isFinite(recipe.servings) && recipe.servings > 0;
  const canUseStock = hasBaseServings && evaluation.validServings;
  const handlePhotoUpload = async (file: File) => {
    if (!reference || !ownsRecipe) return;
    try {
      const url = await uploadImage(file, { maxWidth: 1600, quality: 0.85 });
      await saveRecipePhoto(user.id, reference, url);
      setOverrideImageUrl(url);
      dispatchAgentDbChanged([reference.source === 'user_recipes' ? 'user_recipes' : 'recipes']);
      await fetchRecipes();
      toast({ title: 'Photo mise à jour', description: 'La nouvelle image est enregistrée.' });
    } catch (error) { showActionError(error); }
  };
  const handleCook = async () => {
    if (!reference || !canUseStock || cooking) return;
    setCooking(true); setActionError(null);
    try {
      const session = await startCookingSession(user.id, reference, instructions, servings);
      navigate('/kitchen/cooking/' + session.id);
    } catch (error) { showActionError(error); }
    finally { setCooking(false); }
  };
  const handleAddMissing = async () => {
    if (!recipe || !reference || !canUseStock || addingToCart) return;
    setAddingToCart(true); setActionError(null);
    try {
      const title = await fireRecipeAssistantAction({ ...reference, name: recipe.name, servings }, 'add_missing');
      toast({ title });
    } catch (error) { showActionError(error); }
    finally { setAddingToCart(false); }
  };
  const handleShare = async () => {
    if (!recipe || !reference || sharing) return;
    setSharing(true); setActionError(null);
    const url = new URL(recipeDetailPath(reference, servings), window.location.origin).href;
    try {
      if (typeof navigator.share === 'function') await navigator.share({ title: recipe.name, url });
      else { await navigator.clipboard.writeText(url); toast({ title: 'Lien de recette copié' }); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) showActionError(error);
    } finally { setSharing(false); }
  };
  const handleDelete = async () => {
    if (!recipe || !ownsRecipe || deleting) return;
    setDeleting(true);
    try {
      await deleteRecipe(recipe.id, recipe.source);
      setShowDeleteDialog(false);
      toast({ title: 'Recette supprimée' });
      navigate('/kitchen/recipes');
    } catch (error) { showActionError(error); }
    finally { setDeleting(false); }
  };

  const inaccessible=details.error instanceof ApiError && [401,403,404].includes(details.error.status);
  if (!parsed.success || (details.error && (!recipe || inaccessible))) return <div className="page-container max-w-4xl space-y-4">
    <h1 className="text-xl font-semibold">Recette indisponible</h1>
    <p role="alert">{details.error?.message ?? 'La référence de cette recette est invalide.'}</p>
    {parsed.success && <Button className="min-h-11" variant="outline" onClick={() => void details.refetch()}>Réessayer la recette</Button>}
    <Button onClick={() => navigate('/kitchen/recipes')}>Retour aux recettes</Button>
  </div>;
  if (!recipe) return <div className="page-container max-w-4xl space-y-4" role="status">
    <p>Chargement de la recette…</p><div className="h-64 rounded-lg bg-muted animate-pulse" />
  </div>;

  const minutes = recipeDurationMinutes(recipe);
  const quantityScale = recipe.servings && servings ? servings / recipe.servings : null;
  const onEdit = () => navigate('/kitchen/recipes/' + recipe.id + '/edit?source=' + recipe.source);
  const actions = {
    onCook: handleCook, onAddMissingToShoppingList: handleAddMissing, onEdit, cooking, addingToCart,
    canCook: canUseStock, canEdit,
    canAddMissing: canUseStock && !!freshEvaluation?.availability.missing.length,
  };
  return <div className="culinary-page mx-auto max-w-4xl p-4 md:p-6 pb-[calc(var(--content-bottom-pad)+5rem)] md:pb-6">
    <div className="mb-4 flex items-center justify-between gap-2">
      <Button variant="ghost" aria-label="Retour aux recettes" onClick={() => navigate('/kitchen/recipes')}><ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />Recettes</Button>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label={favorites.isFavorite(recipe.id) ? 'Retirer des favoris' : 'Mettre en favori'} aria-pressed={favorites.isFavorite(recipe.id)} disabled={favoriting || favorites.isLoading || favorites.isError}
          onClick={() => { if (favoriting || !reference) return; setFavoriting(true); void favorites.toggle(reference).catch(showActionError).finally(() => setFavoriting(false)); }}><Heart className="w-4 h-4" aria-hidden="true" /></Button>
        <Button variant="outline" size="icon" className="h-11 w-11" disabled={sharing} aria-label={typeof navigator.share === 'function' ? 'Partager' : 'Copier le lien de recette'} onClick={() => void handleShare()}><Share className="w-4 h-4" aria-hidden="true" /></Button>
        {ownsRecipe && <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Supprimer cette recette" onClick={() => setShowDeleteDialog(true)}><Trash2 className="w-4 h-4" aria-hidden="true" /></Button>}
      </div>
    </div>
    <RecipeMediaFrame imageUrl={overrideImageUrl ?? recipe.image_url} alt={recipe.name} editable={ownsRecipe} onUpload={handlePhotoUpload} imageCaption={!overrideImageUrl && recipe.source==='user_recipes' && recipe.image_origin==='catalog' ? 'Photo du catalogue' : undefined} />
    <header className="mb-3">
      <h1 className="culinary-title mb-2">{recipe.name}</h1>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {recipe.cuisine_category && <Badge variant="secondary">{recipe.cuisine_category}</Badge>}
        <span className="flex items-center gap-1"><Clock className="w-4 h-4" aria-hidden="true" />{minutes == null ? 'Durée à vérifier' : minutes + ' min'}</span>
        {!recipe.servings && <span className="flex items-center gap-1"><Users className="w-4 h-4" aria-hidden="true" />Portions de base à vérifier</span>}
        {recipe.difficulty != null && <span className="flex gap-1" aria-label={'Difficulté ' + recipe.difficulty + '/5'}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={'w-4 h-4 ' + (index < recipe.difficulty! ? 'fill-warning text-warning' : '')} aria-hidden="true" />)}</span>}
      </div>
    </header>
    <div className="hidden md:block"><RecipePrimaryActions {...actions} /></div>
    {details.error && <div role="alert" className="mb-4 space-y-2 rounded-md border p-3 text-sm">
      <p>La recette déjà chargée reste consultable. Son actualisation a échoué : {details.error.message}</p>
      <Button variant="outline" onClick={()=>void details.refetch()}>Relire la recette</Button>
    </div>}
    {actionError && <p role="alert" className="mb-4 rounded-md border border-destructive p-3 text-destructive">{actionError}</p>}
    <label className="mb-3 flex items-center gap-3 text-sm">Portions à préparer
      <Input aria-label="Portions à préparer" className="w-24" type="number" min="1" max="100" step="1" value={servings === 0 ? '' : servings ?? ''} disabled={cooking}
        onChange={event => setChosenServings(event.target.value === '' ? 0 : Number(event.target.value))} />
    </label>
    {!hasBaseServings && <p className="mb-4 rounded-md border p-3 text-sm" role="note">Les portions de base ne sont pas renseignées. Les quantités et les commandes de stock restent à vérifier avant de lancer la cuisine.</p>}
    <RecipeEvaluationPanel evaluation={evaluation.data} loading={evaluation.isLoading} refreshing={evaluation.isFetching || details.isFetching}
      error={details.error ?? evaluation.error ?? null} onRetry={details.error ? details.refetch : evaluation.refetch} validServings={evaluation.validServings} />
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-0 shadow-none bg-transparent"><CardContent className="p-0">
        <h2 className="text-xl font-semibold mb-4">Ingrédients</h2>
        {!ingredients.length ? <p className="text-muted-foreground">Liste d'ingrédients à renseigner.</p> : <ul className="space-y-3">
          {ingredients.map(ingredient => <li key={ingredient.id} className="border-b pb-3">
            <p>{ingredient.quantity == null ? 'Quantité à vérifier :' : quantityScale == null ? ingredient.quantity : Number((ingredient.quantity * quantityScale).toFixed(6))} {ingredient.unit} {ingredient.ingredient_name}</p>
            {ingredient.quantity != null && quantityScale == null && <p className="text-xs text-muted-foreground">Quantité enregistrée ; adaptation aux portions à vérifier.</p>}
            {ingredient.notes && <p className="text-xs text-muted-foreground">{ingredient.notes}</p>}
          </li>)}
        </ul>}
      </CardContent></Card>
      <Card className="border-0 shadow-none bg-transparent"><CardContent className="p-0">
        <h2 className="text-xl font-semibold mb-4">Instructions</h2>
        {!instructions.length ? <p className="text-muted-foreground">Aucune instruction disponible.</p> : <ol className="space-y-4">
          {instructions.map((instruction, index) => <li key={index} className="flex gap-3">
            <span className="shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">{index + 1}</span><p className="pt-1">{instruction}</p>
          </li>)}
        </ol>}
      </CardContent></Card>
    </div>
    <details className="mt-6 border-t pt-2"><summary className="min-h-11 cursor-pointer font-medium">À propos de cette recette</summary><div className="space-y-4 py-3">
      {recipe.description && <p className="text-sm text-muted-foreground">{recipe.description}</p>}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {([['Préparation', recipe.prep_time], ['Cuisson', recipe.cook_time], ['Repos', recipe.rest_time]] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{value == null ? 'Non renseigné' : value + ' min'}</dd></div>)}
        <div><dt className="text-muted-foreground">Type de repas</dt><dd>{recipe.meal_type || 'Non renseigné'}</dd></div>
      </dl>
      {!!recipe.tags?.length && <div className="flex flex-wrap gap-2">{recipe.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>}
    </div></details>
    <RecipeSourcePreview recipe={recipe as RecipeSourceLike} />
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer cette recette ?</AlertDialogTitle><AlertDialogDescription>La recette « {recipe.name} » sera supprimée de ta bibliothèque.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <RecipeMobileActionBar {...actions} missingCount={freshEvaluation?.availability.missing.length} />
  </div>;
}
