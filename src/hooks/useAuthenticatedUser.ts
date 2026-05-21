/**
 * PRP-238 PR2 — Hook public utilise par les pages PROTEGEES pour
 * lire l'utilisateur courant.
 *
 * Throw si l'user est null car AuthenticatedLayout redirige sur
 * /auth dans ce cas. Le hook garantit donc a l'appelant que `user`
 * existe (pas de `user?.id`).
 *
 * Usage typique dans une page protegee :
 *
 *   const user = useAuthenticatedUser();
 *   const { data } = useQuery({
 *     queryKey: ['something', user.id],
 *     queryFn: () => fetchSomething(user.id),
 *   });
 */
import { useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthSessionContext } from '@/contexts/AuthSessionContext';

export function useAuthenticatedUser(): User {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error(
      'useAuthenticatedUser must be used inside <AuthSessionProvider>. ' +
        'Si cette page n\'est pas dans le tree AuthenticatedLayout, c\'est un bug.',
    );
  }
  if (!ctx.user) {
    throw new Error(
      'useAuthenticatedUser called outside an authenticated route. ' +
        'AuthenticatedLayout devrait avoir redirige vers /auth.',
    );
  }
  return ctx.user;
}

/**
 * Variante optionnelle : pour les rares composants qui peuvent etre
 * rendus aussi en zone publique (ex: AssistantProvider mounte au
 * root). Retourne null si pas authentifie au lieu de throw.
 */
export function useAuthSessionOptional(): { user: User | null; isLoading: boolean } {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    // Pas de provider monte (ex: utilise hors auth tree). Retourne un
    // state stable pour eviter les conditional hooks.
    return { user: null, isLoading: false };
  }
  return ctx;
}
