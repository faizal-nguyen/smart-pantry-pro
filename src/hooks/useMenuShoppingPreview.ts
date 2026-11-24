import { useQuery } from '@tanstack/react-query';
import { useAuthSessionOptional } from '@/hooks/useAuthenticatedUser';
import { useAgentDbInvalidation } from '@/lib/agentEvents';
import { fetchMenuShoppingPreview } from '@/services/menuShopping';

/** Everything the week's shopping is computed from: a write to any of them recomputes it. */
const SOURCES = ['shopping_list', 'inventory', 'products', 'meal_plan_entries', 'weekly_meal_plans', 'recipes', 'recipe_ingredients', 'user_recipes', 'cooking_journal'] as const;

/** V11-01 E2 — the week's shopping, read again after any write it depends on. */
export function useMenuShoppingPreview(week: string) {
  const { user } = useAuthSessionOptional();
  const owner = user?.id;
  const query = useQuery({
    queryKey: ['menu-shopping-preview', owner, week],
    enabled: !!owner,
    retry: false, staleTime: 0, refetchOnWindowFocus: true,
    queryFn: ({ signal }) => fetchMenuShoppingPreview(owner!, week, signal),
  });
  useAgentDbInvalidation(SOURCES, () => void query.refetch());
  return query;
}
