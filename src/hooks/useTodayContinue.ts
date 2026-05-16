/**
 * PRP-234 PR3 — useTodayContinue.
 *
 * Charge les recettes vues récemment par l'utilisateur via
 * `recipe_interactions.viewed` (PRP-226 PR3, writer ajouté en PR3
 * sur `RecipeDetail.tsx`). Compte aussi les imports en attente
 * (`imported_recipe_drafts`) pour exposer un lien compact dans
 * le TodayContinuePanel.
 *
 * Pattern React Query : 1 hook = 2 queries parallèles, agrégées dans
 * un return unique. `useAgentDbInvalidation` rafraîchit auto quand
 * l'assistant ajoute / supprime un import via les tools PRP-220.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useAgentDbInvalidation } from '@/lib/agentEvents';

export interface TodayContinueItem {
  recipe_id: string;
  recipe_name: string;
  image_url: string | null;
  prep_time: number | null;
  cook_time: number | null;
  last_viewed_at: string;
}

interface RawInteraction {
  recipe_id: string;
  created_at: string;
  recipes: {
    id: string;
    name: string;
    image_url: string | null;
    prep_time: number | null;
    cook_time: number | null;
  } | null;
}

const QUERY_KEY = ['today-continue'] as const;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function useTodayContinue() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const viewedQuery = useQuery<TodayContinueItem[]>({
    queryKey: [...QUERY_KEY, 'viewed', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
      const { data, error } = await supabase
        .from('recipe_interactions')
        .select(
          'recipe_id, created_at, recipes!inner(id, name, image_url, prep_time, cook_time)',
        )
        .eq('user_id', userId!)
        .eq('interaction_type', 'viewed')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      // Dedupe par recipe_id : on garde la plus récente.
      const seen = new Set<string>();
      const out: TodayContinueItem[] = [];
      for (const row of (data ?? []) as unknown as RawInteraction[]) {
        if (!row.recipes || !row.recipe_id) continue;
        if (seen.has(row.recipe_id)) continue;
        seen.add(row.recipe_id);
        out.push({
          recipe_id: row.recipe_id,
          recipe_name: row.recipes.name,
          image_url: row.recipes.image_url,
          prep_time: row.recipes.prep_time,
          cook_time: row.recipes.cook_time,
          last_viewed_at: row.created_at,
        });
        if (out.length === 4) break;
      }
      return out;
    },
  });

  const pendingQuery = useQuery<number>({
    queryKey: [...QUERY_KEY, 'pending-imports', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('imported_recipe_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .in('status', ['captured', 'metadata_ready', 'draft_ready', 'needs_review']);
      if (error) {
        // Cette table peut ne pas exister sur tous les envs (PRP-220
        // partiel) — on best-effort à 0 plutôt qu'erreur fatale.
        console.warn('[useTodayContinue] pending imports count failed:', error.message);
        return 0;
      }
      return count ?? 0;
    },
  });

  useAgentDbInvalidation(['recipes'], () => {
    void viewedQuery.refetch();
  });

  return {
    items: viewedQuery.data ?? [],
    pendingImports: pendingQuery.data ?? 0,
    isLoading: viewedQuery.isLoading,
    isError: viewedQuery.isError,
    refetch: () => Promise.all([viewedQuery.refetch(), pendingQuery.refetch()]),
  };
}
