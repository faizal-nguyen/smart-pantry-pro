/**
 * PRP-238 PR2 — AuthSessionProvider unique pour les routes
 * authentifiees.
 *
 * Avant : chaque page wrappait <AppNavigation user={...}> apres avoir
 * appele localement `supabase.auth.getSession()` ou `getUser()`. Cela
 * multipliait les round-trips reseau + les listeners onAuthStateChange.
 *
 * Maintenant : un unique Provider monte au-dessus du shell
 * authentifie, fait l'appel UNE FOIS au mount + ecoute
 * onAuthStateChange pour les transitions login/logout. Les pages
 * consomment via `useAuthenticatedUser()` (qui throw si user null,
 * garanti present par le layout AuthenticatedLayout).
 *
 * Decision V3.3 verrouillee : React Context (pas Zustand) + hook
 * public `useAuthenticatedUser()`. Voir PRP-238 section 7(a).
 */
import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthSessionContextValue {
  user: User | null;
  isLoading: boolean;
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Lecture initiale synchrone (depuis le storage Supabase).
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    // Listen aux transitions login/logout/token-refreshed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      // isLoading reste false apres la 1ere resolution ; un refresh de
      // token ne doit pas re-mount les pages.
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthSessionContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthSessionContext.Provider>
  );
}
