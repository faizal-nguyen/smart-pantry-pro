/**
 * V11-01 E4b — the shopping of the week with a proposal, read on demand (shopping-preview with its
 * meals, saved nowhere) and only shown: the list is written from « Courses de la semaine », once the
 * meals are added.
 */
import { useEffect, useState } from 'react';
import type { MenuLineState, MenuShoppingPreview, ProposedMeal } from '@smart/shared';
import { reviewSections } from '@/lib/menuShoppingReview';
import { formatShoppingQuantity } from '@/lib/shoppingChanges';
import { fetchMenuShoppingPreview } from '@/services/menuShopping';

const TITLES: Record<MenuLineState, string> = {
  to_add: 'À acheter', excess: 'En trop sur ta liste', manual: 'À prévoir à la main', verify: 'À vérifier dans ton stock',
  listed: 'Déjà sur ta liste', purchased_pending: 'Achetés, à ranger',
};

interface ProposalShoppingProps { owner: string; week: string; meals: ProposedMeal[] }

export default function ProposalShopping({ owner, week, meals }: ProposalShoppingProps) {
  const [preview, setPreview] = useState<MenuShoppingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(meals);
  useEffect(() => {
    const controller = new AbortController();
    setPreview(null); setError(null);
    fetchMenuShoppingPreview(owner, week, controller.signal, JSON.parse(key) as ProposedMeal[])
      .then(result => { if (!controller.signal.aborted) setPreview(result); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Les courses ne peuvent pas être calculées.'); });
    return () => controller.abort();
  }, [owner, week, key]);

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!preview) return <p role="status" className="text-sm text-muted-foreground">Calcul des courses…</p>;
  const sections = reviewSections(preview.lines);
  return <div className="kitchen-proposal-shopping">
    {sections.length ? sections.map(section => <section key={section.state} aria-label={TITLES[section.state]}>
      <h3>{TITLES[section.state]} ({section.lines.length})</h3>
      <ul>{section.lines.map(line => <li key={line.key}>
        {line.name}{line.quantity != null ? ` — ${formatShoppingQuantity(line.quantity)}${line.unit ? ` ${line.unit}` : ''}` : ''}
      </li>)}</ul>
    </section>) : <p className="text-sm">Rien à acheter pour cette semaine avec cette proposition.</p>}
    <p className="text-sm text-muted-foreground">Une fois les repas ajoutés, mets ces achats sur ta liste depuis « Courses de la semaine ».</p>
  </div>;
}
