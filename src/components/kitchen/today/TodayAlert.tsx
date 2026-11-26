import { Button } from '@/components/ui/button';

const joinFr = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;

/**
 * Rank 2 of the home (PRP V11-06, section 8): every failed read in one alert, visible and announced at
 * every width. A read failure of the menus no longer hides inside the week, masked on a phone. « Réessayer »
 * appears only when a failed read can be read again (a cooking-sessions storage error cannot).
 */
export default function TodayAlert({ failures, onRetry }: { failures: string[]; onRetry?: () => void }) {
  if (failures.length === 0) return null;
  return <div role="alert" className="kitchen-notice">
    <p>Certaines données n’ont pas pu être lues : {joinFr(failures)}.</p>
    {onRetry && <Button variant="outline" className="min-h-11" onClick={onRetry}>Réessayer</Button>}
  </div>;
}
