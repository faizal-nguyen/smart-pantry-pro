/** The photo kept on a stock product, or a parcel icon; opens its sheet. */
import { useState } from 'react';
import { Package } from 'lucide-react';

export default function StockAvatar({ name, photoUrl, onOpen }: { name: string; photoUrl?: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <button type="button" className="kitchen-stock-avatar" aria-label={`Voir la fiche de ${name}`} onClick={onOpen}>
      {photoUrl && !failed
        ? <img src={photoUrl} alt="" loading="lazy" width={44} height={44} onError={() => setFailed(true)} />
        : <Package className="h-6 w-6" strokeWidth={1.3} aria-hidden="true" />}
    </button>
  );
}
