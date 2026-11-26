import { LoadingSkeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Leaf, Milk, Package } from 'lucide-react';
import { calendarDaysUntil, pantryDateLabel } from '@smart/shared';
import type { InventoryItem } from '@/hooks/useInventory';

/** Rank 5: the three lots to use first, shown even when empty (moved as is from the home page). */
export default function UseSoonStrip({ inventory, loading, failed, now }: { inventory: InventoryItem[]; loading: boolean; failed: boolean; now: Date }) {
  const soon = inventory.filter(item => { const days = calendarDaysUntil(item.expiry_date, now); return item.quantity > 0 && days != null && days <= 7; })
    .sort((a, b) => (a.expiry_date ?? '').localeCompare(b.expiry_date ?? '')).slice(0, 3);
  return <section className="kitchen-use-soon" aria-labelledby="use-soon">
    <h2 id="use-soon" className="kitchen-section-title">À utiliser bientôt</h2>
    {loading ? <LoadingSkeleton label="Chargement de ton stock…" /> : soon.length > 0 ? <ul className="kitchen-stock-strip">{soon.map(item => {
      const days = calendarDaysUntil(item.expiry_date, now)!;
      const label = days < 0 ? 'Date dépassée' : days === 0 ? 'Aujourd’hui' : `${days} ${days === 1 ? 'jour' : 'jours'}`;
      const photo = item.product?.image_url;
      const category = item.product?.category?.toLocaleLowerCase('fr-FR');
      const StockIcon = category === 'légumes' || category === 'fruits et légumes' ? Leaf : category === 'produits laitiers' ? Milk : Package;
      return <li key={item.id}><Link className="kitchen-stock-item" to={`/pantry/inventory?product=${item.id}`}>
        <span className="kitchen-stock-symbol"><StockIcon aria-hidden="true" strokeWidth={1.25} />{photo && /^(https?:\/\/|\/(?!\/))/.test(photo) && <img key={photo} src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.hidden = true; }} />}</span>
        <span><span className="font-medium">{item.product?.name ?? 'Produit à vérifier'}</span><span className="kitchen-stock-separator"> · </span><span className={days < 0 ? 'text-destructive' : ''}>{label}</span><span className="sr-only"> · {item.quantity} {item.unit ?? item.product?.unit_type} · {pantryDateLabel(item.expiry_date, now)}</span></span>
      </Link></li>;
    })}</ul> : <p className="text-sm text-muted-foreground">{failed ? 'Dates non disponibles pour le moment.' : 'Aucune date proche renseignée.'}</p>}
  </section>;
}
