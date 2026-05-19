/**
 * PRP-234 PR3 — useTodayAntiWaste.
 *
 * Liste les produits de l'inventaire dont l'expiry_date est dans les
 * 7 prochains jours (jour J inclus). Source directe Supabase plutôt
 * que `useInventory` complet pour éviter de tirer toute l'inventaire
 * sur la page Today juste pour lister 3-5 items expirants.
 *
 * S'abonne aux écrits assistant (`inventory`) pour rafraîchir auto
 * quand un item est consommé ou ajouté.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useAgentDbInvalidation } from '@/lib/agentEvents';

export interface TodayExpiringItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  expiry_date: string;
  days_to_expiry: number;
}

interface RawInventoryRow {
  id: string;
  product_id: string;
  quantity: number;
  expiry_date: string;
  products: { name: string | null } | null;
}

const QUERY_KEY = ['today-anti-waste'] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(dateIso: string, now = new Date()): number {
  const target = new Date(dateIso);
  const diff = target.getTime() - now.getTime();
  return Math.floor(diff / DAY_MS);
}

export function useTodayAntiWaste(withinDays = 7) {
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

  const query = useQuery<TodayExpiringItem[]>({
    queryKey: [...QUERY_KEY, userId, withinDays],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const now = new Date();
      const cutoff = new Date(now.getTime() + withinDays * DAY_MS).toISOString();
      const { data, error } = await supabase
        .from('inventory')
        .select('id, product_id, quantity, expiry_date, products(name)')
        .eq('user_id', userId!)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', cutoff)
        .order('expiry_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      const rows = (data ?? []) as unknown as RawInventoryRow[];
      return rows
        .map((r) => ({
          id: r.id,
          product_id: r.product_id,
          product_name: r.products?.name ?? 'Produit',
          quantity: r.quantity,
          expiry_date: r.expiry_date,
          days_to_expiry: daysUntil(r.expiry_date, now),
        }))
        // Exclut les déjà très en retard (> 7j passés) — on focus sur
        // « à finir maintenant », pas « à jeter ».
        .filter((it) => it.days_to_expiry >= -7);
    },
  });

  useAgentDbInvalidation(['inventory'], () => {
    void query.refetch();
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
