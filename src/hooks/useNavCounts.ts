/**
 * PRP-238 PR1 etape (c) — Hook lightweight pour les badges de la
 * navigation (a consommer / items courses).
 *
 * Avant : AppNavigation montait `useInventory()` et `useShoppingList()`
 * juste pour compter 2 nombres, ce qui forcait un fetch complet de
 * `inventory join products` + `shopping_list` a chaque mount d'une
 * page authentifiee.
 *
 * Maintenant : 2 `count(*)` HEAD-only queries via TanStack Query,
 * staleTime 60s, refetchOnWindowFocus desactive. Auth-passif :
 * `userId` est passe en parametre (AppNavigation a deja `user` en
 * prop). Pas de `getSession()` cache dedans, pas de dependance sur
 * `useAuthenticatedUser` (qui n'arrive qu'en PR2).
 *
 * Couts du hook : 2 requetes legeres une fois par minute par session,
 * vs 2 SELECT complets par navigation. Sur mobile 4G c'est
 * substantiellement moins de bytes et de CPU client.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UseNavCountsResult {
  /** Nombre d'items inventaire qui expirent dans les 3 prochains jours. */
  expiringSoonCount: number;
  /** Nombre d'items shopping_list non encore achetes. */
  shoppingOpenCount: number;
  isLoading: boolean;
}

/**
 * @param userId  Id Supabase de l'utilisateur. Quand null/undefined, le
 *   hook reste idle (queries disabled) et retourne 0/0/false — ainsi le
 *   hook peut etre monte en haut de l'arbre sans casser le rendu pre-auth.
 */
export function useNavCounts(userId: string | null | undefined): UseNavCountsResult {
  const enabled = Boolean(userId);

  const expiring = useQuery({
    queryKey: ['nav-counts', 'expiring', userId],
    enabled,
    queryFn: async () => {
      if (!userId) return 0;
      // Meme fenetre que l'ancien calcul AppNavigation : 3 jours
      // (J-3 / J-1 / expires deja).
      const threeDaysFromNow = new Date(Date.now() + 3 * 86_400_000).toISOString();
      const { count, error } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .lte('expiry_date', threeDaysFromNow)
        .not('expiry_date', 'is', null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const shopping = useQuery({
    queryKey: ['nav-counts', 'shopping', userId],
    enabled,
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('shopping_list')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_purchased', false);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    expiringSoonCount: expiring.data ?? 0,
    shoppingOpenCount: shopping.data ?? 0,
    isLoading: enabled && (expiring.isLoading || shopping.isLoading),
  };
}
