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
import { createContext, Fragment, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { invalidateUnifiedRecipeCache } from '@/lib/recipeSource';
import { useAgentDbInvalidation } from '@/lib/agentEvents';
import { supabase } from '@/integrations/supabase/client';

export interface AuthSessionContextValue {
  user: User | null;
  isLoading: boolean;
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { dismiss } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useAgentDbInvalidation(['inventory','shopping_list','products','recipes','recipe_ingredients','user_recipes','cooking_journal','meal_plan_entries','weekly_meal_plans'], () => {
    invalidateUnifiedRecipeCache();
    return queryClient.invalidateQueries();
  });

  useEffect(() => {
    let mounted = true;
    let epoch = 0;
    let currentAccount: string | null | undefined;
    const apply = (nextUser: User | null) => {
      const next = nextUser?.id ?? null;
      if (currentAccount !== undefined && currentAccount !== next) {
        void queryClient.cancelQueries();
        queryClient.clear();
        invalidateUnifiedRecipeCache();
        dismiss(); sonnerToast.dismiss();
        navigator.serviceWorker?.controller?.postMessage({ type: 'PURGE_PRIVATE_DATA' });
      }
      // Expired sessions keep their drafts for reconnecting to the same account.
      // A different signed-in account never inherits private work, even after reload.
      try {
        sessionStorage.removeItem('assistant.lastConversationId');
        if (next) for (const storage of [localStorage,sessionStorage]) {
          for (const key of Object.keys(storage)) {
            const prefix = ['v10-draft:', 'v10-command:', 'assistant.lastConversationId:'].find(value => key.startsWith(value));
            if (prefix && !key.startsWith(`${prefix}${next}:`)) storage.removeItem(key);
          }
        }
      } catch { /* Restricted browser storage cannot prevent authentication. */ }
      currentAccount = next;
      setUser(nextUser); setIsLoading(false);
    };
    const initialEpoch = epoch;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && epoch === initialEpoch) apply(data.session?.user ?? null);
    }).catch(() => { if (mounted && epoch === initialEpoch) apply(null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event,session) => {
      epoch++;
      if (mounted) apply(session?.user ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [queryClient, dismiss]);

  return (
    <AuthSessionContext.Provider value={{ user, isLoading }}>
      <Fragment key={user?.id ?? 'signed-out'}>{children}</Fragment>
    </AuthSessionContext.Provider>
  );
}
