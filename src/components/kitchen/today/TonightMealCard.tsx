import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import RecipePreview from '@/components/recipes/RecipePreview';
import { Button } from '@/components/ui/button';
import { useCulinaryDesign } from '@/contexts/CulinaryDesignContext';
import { useRecipeDetails } from '@/hooks/useRecipeDetails';
import type { MenuMealType } from '@/hooks/useWeeklyMenu';
import { recipeDetailPath } from '@/lib/recipeLinks';
import { MEAL_MOMENT, type TonightMeal } from '@/lib/tonightMeal';

const CTA: Record<MenuMealType, string> = {
  breakfast: 'Voir la recette de ce matin', lunch: 'Voir la recette de ce midi', dinner: 'Voir la recette de ce soir', snack: 'Voir la recette de la pause',
};
const CHANGE_MEAL = '/kitchen/meal-planning';

/**
 * Rank 3 of the home when a meal is planned (D5). Photo and links appear only once the recipe is read
 * by the same authorised reader as the recipe page; the link keeps source, servings and meal. A recipe
 * already read stays shown when a background read fails, unless it is now absent or inaccessible.
 */
export default function TonightMealCard({ planned, mealType, owner }: { planned: TonightMeal; mealType: MenuMealType; owner: string }) {
  const design = useCulinaryDesign();
  const { entry, reference, mealId, origin } = planned;
  const details = useRecipeDetails(owner, reference ?? undefined);
  const notFound = details.isError && (details.error as { code?: string } | null)?.code === 'RECIPE_NOT_FOUND';
  const recipe = reference && !notFound ? details.data?.recipe : undefined;
  const href = reference ? recipeDetailPath(reference, entry.servings, mealId) : null;
  // Not read yet and not failed: loading, or paused while offline.
  const checking = !!reference && !recipe && !details.isError;
  const offline = checking && details.fetchStatus === 'paused';
  const title = entry.recipe_name.trim() || 'Repas sans nom';
  const minutes = entry.prep_time + entry.cook_time;

  let state: ReactNode = null;
  if (!reference) {
    state = <p className="culinary-recipe-meta">{entry.leftover_of ? 'Reste d’un repas d’une autre semaine : ouvre-le depuis tes menus.' : 'Ce repas n’est relié à aucune recette.'}</p>;
  } else if (notFound) state = <p className="culinary-recipe-meta">Cette recette n’est plus accessible.</p>;
  else if (offline) state = <p className="culinary-recipe-meta" role="status">Hors ligne : la recette sera vérifiée au retour du réseau.</p>;
  else if (checking) state = <p className="culinary-recipe-meta" role="status">Vérification de la recette…</p>;
  else if (!recipe) {
    state = <><p className="culinary-recipe-meta">La recette ne peut pas être relue pour le moment.</p>
      <Button variant="outline" className="min-h-11" disabled={details.isFetching} onClick={() => { void details.refetch(); }}>{details.isFetching ? 'Nouvelle lecture…' : 'Réessayer'}</Button></>;
  }

  return <div className="culinary-featured" data-culinary-view={design}>
    <p className="kitchen-tonight-eyebrow">Prévu {MEAL_MOMENT[mealType]}</p>
    <div className="culinary-featured-list"><article className="culinary-recipe-card">
      {recipe && href && <Link to={href} className="culinary-recipe-image-link" aria-label={`Voir ${title}`}>
        <RecipePreview imageUrl={recipe.image_url} title={title} decorative priority className="culinary-recipe-photo" />
      </Link>}
      <div className="culinary-recipe-copy">
        <h3 className="culinary-recipe-name">{recipe && href ? <Link to={href}>{title}</Link> : title}</h3>
        {origin && <p className="culinary-recipe-meta">Reste de {origin.recipe_name}</p>}
        <p className="culinary-recipe-meta">{minutes > 0 ? `${minutes} min` : 'Durée à vérifier'} · {entry.servings} {entry.servings === 1 ? 'personne' : 'personnes'}</p>
        {entry.cooked_command_id && <p className="culinary-recipe-meta">Déjà cuisiné.</p>}
        {state}
        {recipe && href
          ? <Button className="culinary-recipe-cta min-h-11 w-full" asChild><Link to={href}>{CTA[mealType]}</Link></Button>
          : !checking || offline ? <Button className="min-h-11" variant="outline" asChild><Link to={CHANGE_MEAL}>Changer le repas</Link></Button> : null}
      </div>
    </article></div>
  </div>;
}
