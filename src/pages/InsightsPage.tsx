import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { InsightsDashboard, WasteSection } from '@/components/insights';
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';

/** V11-06 E1b: « Mes analyses », the stock measures and the declared losses on one page (D1). */
export default function InsightsPage() {
  const { hash } = useLocation();
  const [stockSettled, setStockSettled] = useState(false);
  const [lossesSettled, setLossesSettled] = useState(false);
  const settleStock = useCallback(() => setStockSettled(true), []);
  const settleLosses = useCallback(() => setLossesSettled(true), []);
  // `/insights/waste` and « Voir mes pertes » lead to #pertes. The stock above it changes height
  // when it loads: scroll only once both sections have answered, or the section lands off screen.
  useEffect(() => {
    if (hash === '#pertes' && stockSettled && lossesSettled) document.getElementById('pertes')?.scrollIntoView({ block: 'start' });
  }, [hash, stockSettled, lossesSettled]);

  return <div className="culinary-page kitchen-page kitchen-insights-page">
    <KitchenPageHeader title="Mes analyses" description="Ce que ton stock et tes pertes déclarées permettent de mesurer." />
    <section aria-labelledby="stock-title" className="space-y-4">
      <h2 id="stock-title" className="kitchen-section-title">Stock</h2>
      <InsightsDashboard onSettled={settleStock} />
    </section>
    <WasteSection onSettled={settleLosses} />
  </div>;
}
