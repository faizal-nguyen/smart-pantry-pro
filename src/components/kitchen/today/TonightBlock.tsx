import { LoadingSkeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import PersonalizedRecipeSuggestions from '@/components/recipes/PersonalizedRecipeSuggestions';
import type { MenuMealType, WeeklyMenuView } from '@/hooks/useWeeklyMenu';
import { MEAL_TITLE, todayIndex, tonightMeal } from '@/lib/tonightMeal';
import type { SuggestRecommendationsInput } from '@/services/recommendationsApi';
import LazyFold from './LazyFold';
import TonightMealCard from './TonightMealCard';
import { APP_LOCALE } from '@smart/shared';

export interface MenuRead { data?: WeeklyMenuView; isLoading: boolean; isError: boolean }

/** How long the menus may take before the suggestion shows anyway; a planned meal still replaces it. */
export const MENU_WAIT_MS = 2_500;

function Suggestion({ input, onAddStock }: { input: SuggestRecommendationsInput; onAddStock: () => void }) {
  return <section className="min-w-0" aria-labelledby="tonight-title">
    <h2 id="tonight-title" className="sr-only">Idée pour ton repas</h2>
    <PersonalizedRecipeSuggestions featured input={input} onAddStock={onAddStock} />
  </section>;
}

/**
 * Rank 3 of the home (D5): the meal planned today for the set meal, otherwise the suggestion. While the
 * menus are read the suggestion waits briefly (the planned meal would replace it), then shows anyway;
 * when they fail, the suggestion stays and the alert above says so.
 */
export default function TonightBlock({ menu, now, mealType, input, owner, onAddStock }: {
  menu: MenuRead; now: Date; mealType: MenuMealType; input: SuggestRecommendationsInput; owner: string; onAddStock: () => void;
}) {
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    if (!menu.isLoading) return undefined;
    const timer = window.setTimeout(() => setWaited(true), MENU_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [menu.isLoading]);
  const title = MEAL_TITLE[mealType];
  const planned = menu.data ? tonightMeal(menu.data.entries, todayIndex(now), mealType) : null;
  if (menu.isLoading && !waited) {
    return <section className="min-w-0" aria-labelledby="tonight-title">
      <h2 id="tonight-title" className="sr-only">{title}</h2>
      <LoadingSkeleton label={`Chargement de ${title.charAt(0).toLocaleLowerCase(APP_LOCALE)}${title.slice(1)}…`} count={1} itemClassName="h-60 rounded-xl" />
    </section>;
  }
  if (!planned) return <Suggestion input={input} onAddStock={onAddStock} />;
  return <section className="min-w-0 space-y-3" aria-labelledby="tonight-title">
    <h2 id="tonight-title" className="sr-only">{title}</h2>
    <TonightMealCard planned={planned} mealType={mealType} owner={owner} />
    <LazyFold summary="Autres idées"><PersonalizedRecipeSuggestions input={input} onAddStock={onAddStock} /></LazyFold>
  </section>;
}
