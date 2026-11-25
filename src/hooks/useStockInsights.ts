import { useCallback, useEffect, useMemo, useState } from 'react';
import { calendarDate } from '@smart/shared';
import { useInventory } from './useInventory';
import { stockInsights, type StockInsights } from '@/lib/stockInsights';

export type StockInsightsStatus = 'loading' | 'error' | 'ready';

export interface StockInsightsState {
  status: StockInsightsStatus;
  /** Null until the stock is read: a loading or failed read never shows as zero. */
  insights: StockInsights | null;
  /** Reads the stock lots again; the page stays in its loading state meanwhile. */
  retry: () => Promise<void>;
}

const TODAY_CHECK_MS = 60_000;
const readToday = () => calendarDate(new Date()) ?? '';

/** The shared-zone calendar day, kept current when the page stays open past midnight or comes back. */
function useCalendarToday(): string {
  const [today, setToday] = useState(readToday);
  useEffect(() => {
    const sync = () => setToday(readToday());
    const timer = window.setInterval(sync, TODAY_CHECK_MS);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return today;
}

/** The analyses measures of V11-06 E1a, from the stock lots alone. */
export function useStockInsights(): StockInsightsState {
  const { inventory, loading, error, refetchInventory } = useInventory();
  const [retrying, setRetrying] = useState(false);
  const today = useCalendarToday();
  // Noon UTC falls on the same calendar day in the shared zone: the measures follow `today`.
  const insights = useMemo(() => stockInsights(inventory, new Date(`${today}T12:00:00Z`)), [inventory, today]);
  // `fetchInventory` clears the error without raising `loading`: without this flag a retry would
  // show the empty stock until the answer comes.
  const retry = useCallback(async () => {
    setRetrying(true);
    try {
      await refetchInventory();
    } finally {
      setRetrying(false);
    }
  }, [refetchInventory]);
  if (loading || retrying) return { status: 'loading', insights: null, retry };
  if (error) return { status: 'error', insights: null, retry };
  return { status: 'ready', insights, retry };
}
