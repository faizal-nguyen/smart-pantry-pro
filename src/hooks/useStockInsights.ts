import { useCallback, useMemo, useState } from 'react';
import { useInventory } from './useInventory';
import { noonOf, useCalendarToday } from './useCalendarToday';
import { stockInsights, type StockInsights } from '@/lib/stockInsights';

export type StockInsightsStatus = 'loading' | 'error' | 'ready';

export interface StockInsightsState {
  status: StockInsightsStatus;
  /** Null until the stock is read: a loading or failed read never shows as zero. */
  insights: StockInsights | null;
  /** Reads the stock lots again; the page stays in its loading state meanwhile. */
  retry: () => Promise<void>;
}

/** The stock measures of « Mes analyses » (V11-06 E1a), from the stock lots alone. */
export function useStockInsights(): StockInsightsState {
  const { inventory, loading, error, refetchInventory } = useInventory();
  const [retrying, setRetrying] = useState(false);
  const today = useCalendarToday();
  const insights = useMemo(() => stockInsights(inventory, noonOf(today)), [inventory, today]);
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
