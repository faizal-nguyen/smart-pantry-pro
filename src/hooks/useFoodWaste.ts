/**
 * useFoodWaste — PRP-222 PR5
 *
 * Records and reads from `food_waste_events`. Used by the "Jeter"
 * action on inventory items and by /insights/waste.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type WasteReason = 'expired' | 'spoiled' | 'leftover' | 'other';

export interface FoodWasteEvent {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  category: string | null;
  quantity: number;
  unit_type: string | null;
  reason: WasteReason;
  notes: string | null;
  estimated_cost_eur: number | null;
  occurred_at: string;
  created_at: string;
}

export interface RecordWasteInput {
  product_id?: string | null;
  product_name: string;
  category?: string | null;
  quantity: number;
  unit_type?: string | null;
  reason: WasteReason;
  notes?: string | null;
  estimated_cost_eur?: number | null;
  occurred_at?: string;
}

export interface WasteStats {
  totalEvents: number;
  totalQuantity: number;
  totalCostEur: number;
  byReason: Record<WasteReason, number>;
  byCategory: Record<string, number>;
  last30DaysEvents: number;
  last30DaysCostEur: number;
}

const EMPTY_STATS: WasteStats = {
  totalEvents: 0,
  totalQuantity: 0,
  totalCostEur: 0,
  byReason: { expired: 0, spoiled: 0, leftover: 0, other: 0 },
  byCategory: {},
  last30DaysEvents: 0,
  last30DaysCostEur: 0,
};

function computeStats(events: FoodWasteEvent[]): WasteStats {
  if (events.length === 0) return EMPTY_STATS;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const byReason: Record<WasteReason, number> = { expired: 0, spoiled: 0, leftover: 0, other: 0 };
  const byCategory: Record<string, number> = {};

  let totalQuantity = 0;
  let totalCostEur = 0;
  let last30DaysEvents = 0;
  let last30DaysCostEur = 0;

  for (const event of events) {
    byReason[event.reason] = (byReason[event.reason] ?? 0) + 1;

    const category = event.category ?? 'Autres';
    byCategory[category] = (byCategory[category] ?? 0) + 1;

    totalQuantity += Number(event.quantity) || 0;
    totalCostEur += Number(event.estimated_cost_eur) || 0;

    if (new Date(event.occurred_at).getTime() >= thirtyDaysAgo) {
      last30DaysEvents += 1;
      last30DaysCostEur += Number(event.estimated_cost_eur) || 0;
    }
  }

  return {
    totalEvents: events.length,
    totalQuantity,
    totalCostEur,
    byReason,
    byCategory,
    last30DaysEvents,
    last30DaysCostEur,
  };
}

export function useFoodWaste() {
  const [events, setEvents] = useState<FoodWasteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('food_waste_events')
      .select('*')
      .order('occurred_at', { ascending: false });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setEvents((data ?? []) as FoodWasteEvent[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const recordWaste = useCallback(async (input: RecordWasteInput): Promise<FoodWasteEvent | null> => {
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData?.user) {
      setError('Connexion requise pour enregistrer un gaspillage.');
      return null;
    }

    const payload = {
      user_id: userData.user.id,
      product_id: input.product_id ?? null,
      product_name: input.product_name,
      category: input.category ?? null,
      quantity: input.quantity,
      unit_type: input.unit_type ?? null,
      reason: input.reason,
      notes: input.notes ?? null,
      estimated_cost_eur: input.estimated_cost_eur ?? null,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
    };

    const { data, error: err } = await supabase
      .from('food_waste_events')
      .insert(payload)
      .select()
      .single();

    if (err || !data) {
      setError(err?.message ?? "Échec de l'enregistrement");
      return null;
    }

    const event = data as FoodWasteEvent;
    setEvents(prev => [event, ...prev]);
    return event;
  }, []);

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('food_waste_events')
      .delete()
      .eq('id', eventId);

    if (err) {
      setError(err.message);
      return false;
    }
    setEvents(prev => prev.filter(e => e.id !== eventId));
    return true;
  }, []);

  const stats = computeStats(events);

  return { events, stats, loading, error, refetch, recordWaste, deleteEvent };
}
