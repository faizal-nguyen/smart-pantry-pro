import { Link } from 'react-router-dom';
import { InsightsDashboard } from '@/components/insights';
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';
import { Button } from '@/components/ui/button';

/** V11-06 E1a: the measured part of the analyses, until the merged « Mes analyses » page of E1b. */
export default function InsightsPage() {
  return <div className="culinary-page kitchen-page kitchen-insights-page">
    <KitchenPageHeader
      title="Analyses"
      description="Ce que ton stock permet de mesurer aujourd’hui. Les pertes que tu déclares ont leur page."
      actions={<Button variant="outline" className="min-h-11" asChild><Link to="/insights/waste">Voir mes pertes</Link></Button>}
    />
    <InsightsDashboard />
  </div>;
}
